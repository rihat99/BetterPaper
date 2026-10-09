#!/usr/bin/env python3
"""Crop a high-resolution figure from one page of a PDF.

Usage:
  python3 extract_figure.py <pdf> --page N --list
      Prints the page size, every embedded image (bbox, native pixels) and every text line that starts
      like a caption ("Figure 3", "Fig. 3", "Fig.3", "FIGURE 4", "Table 2", "TABLE I"). All boxes are
      x0,y0,x1,y1 in PDF points, origin at the top-left, y pointing down.
  python3 extract_figure.py <pdf> --page N --bbox x0,y0,x1,y1 --out fig_1.jpg [--min-width 2600]
      Renders the box at the DPI that makes it at least --min-width px wide (DPI capped at 1000) and saves
      it (.jpg/.jpeg: quality 93, 4:4:4 chroma; .png: lossless). If one embedded raster image covers the
      box, nothing is painted over it there, and its own pixels are wider than the render, those native
      pixels (cropped to the box) are saved instead. Prints the output path, pixel size and which way.
      An existing --out file moves to .old/ next to it first (a taken name there gets a timestamp).

N is 1-based, as a PDF viewer numbers pages. Needs pymupdf (1.24.3 or newer) and Pillow.
"""
from __future__ import annotations

import argparse
import re
import sys
import time
from pathlib import Path

try:
    import pymupdf
    from PIL import Image
except ImportError as error:
    sys.exit(f"extract_figure.py: needs pymupdf (1.24.3 or newer) and Pillow; run it with a Python that has both ({error})")

MAX_DPI = 1000
CAPTION = re.compile(r"(figure|fig\.?|table)\s*([0-9]+|[ivxl]+)\b", re.IGNORECASE)
# Paint operations that hide or add to an image when they come after it (clips and invisible text do not).
OVERLAY_KINDS = ("fill-text", "stroke-text", "fill-path", "stroke-path", "fill-image", "fill-imgmask", "fill-shade")


def box(rect: pymupdf.Rect | tuple[float, ...]) -> str:
    """Format a box as x0,y0,x1,y1 with one decimal."""
    return ",".join(f"{v:.1f}" for v in rect)


def list_page(page: pymupdf.Page) -> None:
    """Print the page size, the embedded images and the caption-like text lines of one page."""
    print(f"page {page.number + 1}: {page.rect.width:.1f} x {page.rect.height:.1f} pt")
    for info in page.get_image_info(xrefs=True):
        width_pt = info["bbox"][2] - info["bbox"][0]
        dpi = f", ~{info['width'] * 72 / width_pt:.0f} dpi" if width_pt > 0 else ""
        print(f"image   bbox={box(info['bbox'])}  native {info['width']}x{info['height']} px{dpi}  xref={info['xref']}")
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            text = "".join(span["text"] for span in line["spans"]).strip()
            if CAPTION.match(text):
                print(f"caption bbox={box(line['bbox'])}  {text[:100]}")


def covering_image(doc: pymupdf.Document, page: pymupdf.Page, rect: pymupdf.Rect) -> tuple[dict | None, str]:
    """The embedded image whose own pixels show everything inside rect, or None and the reason why not."""
    covering = [info for info in page.get_image_info(xrefs=True)
                if (pymupdf.Rect(info["bbox"]) + (-1, -1, 1, 1)).contains(rect)]
    if not covering:
        return None, "no single embedded image covers the box"
    info = covering[-1]  # the topmost one: images come in paint order
    b, c = info["transform"][1:3]
    if not info["xref"] or abs(b) > 1e-3 or abs(c) > 1e-3:
        return None, "the covering image is inline or rotated"
    if doc.xref_get_key(info["xref"], "SMask")[0] != "null" or doc.xref_get_key(info["xref"], "Mask")[0] != "null":
        return None, "the covering image has a transparency mask"
    log = page.get_bboxlog()
    order = [i for i, (kind, bb) in enumerate(log)
             if kind == "fill-image" and max(abs(p - q) for p, q in zip(bb, info["bbox"])) < 0.5]
    if not order:
        return None, "the covering image was not found in the paint order"
    painted_over = [kind for kind, bb in log[order[-1] + 1:]
                    if kind in OVERLAY_KINDS and (pymupdf.Rect(bb) & rect).get_area() > 1]
    if painted_over:
        return None, f"text or drawings are painted over the image there ({len(painted_over)} items)"
    return info, ""


def native_pixels(doc: pymupdf.Document, info: dict, rect: pymupdf.Rect) -> Image.Image:
    """Crop rect out of the image's own pixels, mirrored the way the page shows it."""
    pix = pymupdf.Pixmap(doc, info["xref"])
    if pix.colorspace is None or pix.colorspace.n not in (1, 3):
        pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
    if pix.alpha:
        pix = pymupdf.Pixmap(pix, 0)
    img = Image.frombytes("L" if pix.n == 1 else "RGB", (pix.width, pix.height), pix.samples).convert("RGB")
    a, _, _, d, e, f = info["transform"]
    u0, u1 = sorted(((rect.x0 - e) / a, (rect.x1 - e) / a))  # unit-square coordinates of the image
    v0, v1 = sorted(((rect.y0 - f) / d, (rect.y1 - f) / d))
    w, h = img.size
    img = img.crop((max(0, round(u0 * w)), max(0, round(v0 * h)), min(w, round(u1 * w)), min(h, round(v1 * h))))
    if a < 0:
        img = img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    if d < 0:
        img = img.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    return img


def move_to_old(path: Path) -> None:
    """Move an existing file into .old/ next to it; a taken name there gets a timestamp, then a counter."""
    old = path.parent / ".old"
    old.mkdir(exist_ok=True)
    dest = old / path.name
    if dest.exists():
        stamp = time.strftime("%Y%m%d-%H%M%S")
        dest, n = old / f"{path.stem}.{stamp}{path.suffix}", 1
        while dest.exists():
            dest, n = old / f"{path.stem}.{stamp}-{n}{path.suffix}", n + 1
    path.rename(dest)


def crop(doc: pymupdf.Document, page: pymupdf.Page, rect: pymupdf.Rect, out: Path, min_width: int) -> None:
    """Save rect at high resolution (render or native image pixels) and print what was done."""
    zoom = min(min_width / rect.width, MAX_DPI / 72)
    render_width = round(rect.width * zoom)
    info, reason = covering_image(doc, page, rect)
    native_width = round(info["width"] * rect.width / abs(info["transform"][0])) if info else 0
    if native_width > render_width:
        img = native_pixels(doc, info, rect)
        how = f"native pixels of embedded image xref {info['xref']} (a render would be {render_width} px wide)"
    else:
        pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), clip=rect, alpha=False)
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        how = f"rendered at {zoom * 72:.0f} dpi"
        if info:
            how += f" (the embedded image has only {native_width} px here)"
        elif reason != "no single embedded image covers the box":
            how += f" (native pixels not used: {reason})"
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists():
        move_to_old(out)
    if out.suffix.lower() == ".png":
        img.save(out)
    else:
        img.save(out, quality=93, subsampling=0)
    print(f"{out.resolve()}  {img.width}x{img.height} px  {how}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Crop a high-resolution figure from one page of a PDF.")
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--page", type=int, required=True, help="1-based page number")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--list", action="store_true", help="list images and caption lines with their bboxes")
    mode.add_argument("--bbox", help="x0,y0,x1,y1 in PDF points (from --list)")
    parser.add_argument("--out", type=Path, help="output .jpg, .jpeg or .png (required with --bbox)")
    parser.add_argument("--min-width", type=int, default=2600, help="minimum output width in px (default 2600)")
    args = parser.parse_args()

    if not args.pdf.is_file():
        parser.error(f"no such PDF: {args.pdf}")
    doc = pymupdf.open(args.pdf)
    if not 1 <= args.page <= doc.page_count:
        parser.error(f"--page must be between 1 and {doc.page_count}")
    page = doc[args.page - 1]
    if args.list:
        list_page(page)
        return

    if args.out is None or args.out.suffix.lower() not in (".jpg", ".jpeg", ".png"):
        parser.error("--bbox needs --out ending in .jpg, .jpeg or .png")
    if args.min_width < 1:
        parser.error("--min-width must be positive")
    try:
        x0, y0, x1, y1 = (float(v) for v in args.bbox.split(","))
    except ValueError:
        parser.error(f"--bbox must be four numbers x0,y0,x1,y1, got {args.bbox!r}")
    rect = pymupdf.Rect(x0, y0, x1, y1)
    if rect.is_empty:
        parser.error("--bbox needs x0 < x1 and y0 < y1")
    if not (page.rect + (-1, -1, 1, 1)).contains(rect):
        parser.error(f"--bbox {args.bbox} is outside the page ({box(page.rect)})")
    crop(doc, page, rect & page.rect, args.out, args.min_width)


if __name__ == "__main__":
    main()
