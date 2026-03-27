#!/usr/bin/env python3
"""
photo-process.py — Specimen photo processor. Layer by layer.
Layer 1: Square crop, centered on specimen.
Layer 2: (future) Sharpness/clarity
Layer 3: (future) White balance
Layer 4: (future) Background cleanup

Usage:
  python3 photo-process.py crop <image_path>        # Single image
  python3 photo-process.py crop-all <input_dir>     # Batch
"""

import sys, argparse
from pathlib import Path
import numpy as np
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = PROJECT_ROOT / "tmp" / "processed"


def crop_square(image_path: str, output_dir: str = None):
    """Layer 1: Square crop centered on the specimen. Nothing else."""
    img = Image.open(image_path).convert("RGB")
    w, h = img.size
    print(f"  {Path(image_path).name}: {w}x{h}")

    # Square crop from center — use the short edge as the side length
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    cropped = img.crop((left, top, left + side, top + side))

    # Output
    out_dir = Path(output_dir) if output_dir else OUTPUT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / Path(image_path).name
    cropped.save(str(out_path), "JPEG", quality=95)
    print(f"  -> {out_path} ({side}x{side})")
    return str(out_path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["crop", "crop-all"])
    parser.add_argument("path")
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    if args.command == "crop":
        crop_square(args.path, args.output)
    elif args.command == "crop-all":
        p = Path(args.path)
        images = sorted(p.glob("*.jpg"))
        print(f"Cropping {len(images)} images...\n")
        for img in images:
            crop_square(str(img), args.output)
        print(f"\nDone. {len(images)} images in {args.output or OUTPUT_DIR}")


if __name__ == "__main__":
    main()
