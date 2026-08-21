#!/usr/bin/env python3
"""Prepare client logo exports for the marquee in scytales/index.html.

Drop raw exports into scytales/assets/clients/ and run this. For each file it:

  1. Flattens everything at or near the background to pure white. The Figma
     exports carry a faint grid, and multiply would otherwise paint that grid
     into the page as a visible box behind each logo.
  2. Crops to the logo's ink bounds. The belt sizes logos by height, so any
     empty margin baked into the export would shrink the mark itself.

Originals are moved to scytales/assets/clients/_raw/ rather than overwritten.

    python3 tools/prep-client-logos.py            # process every image
    python3 tools/prep-client-logos.py --dry-run  # report only

NOISE_BAND is how far below the background a pixel must sit before it counts as
ink. Raise it if grid lines survive; lower it if pale logo edges get eaten.
"""

import argparse
import shutil
import sys
from collections import Counter
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required:  pip3 install Pillow")

CLIENTS = Path(__file__).resolve().parent.parent / "scytales" / "assets" / "clients"
RAW = CLIENTS / "_raw"
NOISE_BAND = 14
PAD = 2


def luminance(px):
    r, g, b = px[:3]
    return 0.299 * r + 0.587 * g + 0.114 * b


def process(path, dry_run=False):
    im = Image.open(path)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        flat = Image.new("RGB", im.size, (255, 255, 255))
        flat.paste(im, mask=im.split()[-1])
        im = flat
    else:
        im = im.convert("RGB")

    w, h = im.size
    px = im.load()

    background = Counter(im.getdata()).most_common(1)[0][0]
    cutoff = luminance(background) - NOISE_BAND

    min_x, min_y, max_x, max_y = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if luminance(px[x, y]) >= cutoff:
                px[x, y] = (255, 255, 255)
            else:
                if x < min_x:
                    min_x = x
                if x > max_x:
                    max_x = x
                if y < min_y:
                    min_y = y
                if y > max_y:
                    max_y = y

    if max_x < 0:
        print(f"  {path.name}: no ink found above the noise band — skipped")
        return

    box = (
        max(0, min_x - PAD),
        max(0, min_y - PAD),
        min(w, max_x + 1 + PAD),
        min(h, max_y + 1 + PAD),
    )
    out = im.crop(box)
    pct = 100 * (out.width * out.height) / (w * h)
    print(f"  {path.name}: {w}×{h} -> {out.width}×{out.height}  ({pct:.0f}% of original)")

    if dry_run:
        return
    RAW.mkdir(exist_ok=True)
    shutil.move(str(path), str(RAW / path.name))
    out.save(CLIENTS / f"{path.stem}.png")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not CLIENTS.is_dir():
        sys.exit(f"missing folder: {CLIENTS}")

    files = sorted(
        p for p in CLIENTS.iterdir()
        if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
    )
    if not files:
        sys.exit(f"no images in {CLIENTS} — drop the logo exports in first")

    print(f"{len(files)} image(s) in {CLIENTS}:")
    for f in files:
        process(f, args.dry_run)


if __name__ == "__main__":
    main()
