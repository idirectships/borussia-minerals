#!/usr/bin/env python3
"""
pipeline.py — 3-line parallel specimen photo pipeline.
Each line processes 4 photos through stages with quality gates.

Line 1: Photos 1-4 (quartz specimens)
Line 2: Photos 5-8 (fluorite + copper)
Line 3: Photos 9-12 (copper + wulfenite)

Stages:
  1. CROP    — Square center crop, 1200x1200
  2. CLARITY — Sharpen crystal detail via unsharp mask
  3. COLOR   — White balance to neutral
  4. BG      — Smooth fabric wrinkles (blur background only)
  5. QA      — Compare to original, reject if specimen altered

Usage:
  python3 pipeline.py stage <stage_name> <input_dir> <output_dir>
  python3 pipeline.py qa <original_dir> <final_dir>
"""

import sys, argparse
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance, ImageOps

PROJECT_ROOT = Path(__file__).resolve().parent.parent


# ── STAGE 1: CROP ──────────────────────────────────────────────

def stage_crop(input_dir, output_dir):
    """Square crop centered on the specimen, not the image center.
    Finds the bounding box of non-black pixels, centers square on that."""
    import cv2

    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    images = sorted(Path(input_dir).glob("*.jpg"))
    for img_path in images:
        img = ImageOps.exif_transpose(Image.open(img_path)).convert("RGB")
        w, h = img.size
        arr = np.array(img)

        # Find specimen bounding box (everything brighter than dark fabric)
        gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
        _, mask = cv2.threshold(gray, 30, 255, cv2.THRESH_BINARY)
        # Clean noise
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

        rows = np.any(mask, axis=1)
        cols = np.any(mask, axis=0)
        if not rows.any() or not cols.any():
            # Fallback to center crop if detection fails
            spec_cx, spec_cy = w // 2, h // 2
            spec_w, spec_h = w // 2, h // 2
        else:
            rmin, rmax = np.where(rows)[0][[0, -1]]
            cmin, cmax = np.where(cols)[0][[0, -1]]
            spec_cx = (cmin + cmax) // 2
            spec_cy = (rmin + rmax) // 2
            spec_w = cmax - cmin
            spec_h = rmax - rmin

        # Square side: fit the whole specimen + 20% breathing room
        side = int(max(spec_w, spec_h) * 1.25)
        side = max(side, min(w, h))  # At least as big as short edge
        side = min(side, min(w, h))  # But can't exceed image

        # Center on specimen
        left = max(0, spec_cx - side // 2)
        top = max(0, spec_cy - side // 2)
        # Adjust if we'd go off-edge
        if left + side > w:
            left = w - side
        if top + side > h:
            top = h - side
        left = max(0, left)
        top = max(0, top)

        cropped = img.crop((left, top, left + side, top + side))
        cropped = cropped.resize((1200, 1200), Image.LANCZOS)
        cropped.save(str(out / img_path.name), "JPEG", quality=95)
        print(f"  CROP: {img_path.name} -> 1200x1200 (specimen center: {spec_cx},{spec_cy})")
    return len(images)


# ── STAGE 2: CLARITY ───────────────────────────────────────────

def stage_clarity(input_dir, output_dir):
    """Sharpen crystal detail. Unsharp mask — enhances existing detail only."""
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    images = sorted(Path(input_dir).glob("*.jpg"))
    for img_path in images:
        img = Image.open(img_path).convert("RGB")
        # Unsharp mask: radius=2, percent=120, threshold=3
        # Enhances edges/texture without inventing detail
        sharpened = img.filter(ImageFilter.UnsharpMask(radius=2, percent=120, threshold=3))
        sharpened.save(str(out / img_path.name), "JPEG", quality=95)
        print(f"  CLARITY: {img_path.name}")
    return len(images)


# ── STAGE 3: COLOR ─────────────────────────────────────────────

def stage_color(input_dir, output_dir):
    """White balance correction. Assumes background should be neutral gray/black."""
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    images = sorted(Path(input_dir).glob("*.jpg"))
    for img_path in images:
        img = Image.open(img_path).convert("RGB")
        arr = np.array(img, dtype=np.float32)

        # Sample background corners (should be neutral black fabric)
        h, w = arr.shape[:2]
        corners = np.concatenate([
            arr[:50, :50].reshape(-1, 3),       # top-left
            arr[:50, -50:].reshape(-1, 3),      # top-right
            arr[-50:, :50].reshape(-1, 3),      # bottom-left
            arr[-50:, -50:].reshape(-1, 3),     # bottom-right
        ])

        # If corners have a color cast, correct it
        mean_rgb = corners.mean(axis=0)
        if mean_rgb.max() > 5:  # Only correct if background isn't already pure black
            # Gray world: scale channels so background is neutral
            target_gray = mean_rgb.mean()
            if target_gray > 0:
                scale = target_gray / (mean_rgb + 1e-6)
                # Limit correction to avoid extreme shifts
                scale = np.clip(scale, 0.85, 1.15)
                arr[:, :, 0] *= scale[0]
                arr[:, :, 1] *= scale[1]
                arr[:, :, 2] *= scale[2]

        result = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
        result.save(str(out / img_path.name), "JPEG", quality=95)
        print(f"  COLOR: {img_path.name} (cast correction: {mean_rgb.astype(int)})")
    return len(images)


# ── STAGE 4: BACKGROUND ───────────────────────────────────────

def stage_bg(input_dir, output_dir):
    """Smooth fabric wrinkles. Blur dark background pixels only — specimen untouched."""
    import cv2

    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    images = sorted(Path(input_dir).glob("*.jpg"))
    for img_path in images:
        img = np.array(Image.open(img_path).convert("RGB"))
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)

        # Background = dark pixels (below threshold)
        # Specimen = bright pixels (above threshold)
        _, fg_mask = cv2.threshold(gray, 45, 255, cv2.THRESH_BINARY)

        # Dilate foreground mask to protect specimen edges
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
        fg_protected = cv2.dilate(fg_mask, kernel, iterations=2)

        # Blur the entire image
        blurred = cv2.GaussianBlur(img, (31, 31), 10)

        # Composite: specimen pixels from original, background from blurred
        fg_float = fg_protected.astype(np.float32) / 255.0
        fg_3ch = np.stack([fg_float] * 3, axis=-1)
        composited = (img * fg_3ch + blurred * (1 - fg_3ch)).astype(np.uint8)

        Image.fromarray(composited).save(str(out / img_path.name), "JPEG", quality=95)
        print(f"  BG: {img_path.name}")
    return len(images)


# ── STAGE 5: QA GATE ──────────────────────────────────────────

def stage_qa(original_dir, final_dir):
    """Compare original to final. Reject if specimen pixels changed too much."""
    import cv2

    originals = sorted(Path(original_dir).glob("*.jpg"))
    finals = sorted(Path(final_dir).glob("*.jpg"))

    passed = 0
    failed = 0

    for orig_path in originals:
        final_path = Path(final_dir) / orig_path.name
        if not final_path.exists():
            print(f"  QA MISSING: {orig_path.name}")
            failed += 1
            continue

        orig = np.array(Image.open(orig_path).convert("RGB"))
        final = np.array(Image.open(final_path).convert("RGB"))

        # Crop original to match final dimensions for comparison
        w, h = orig.shape[1], orig.shape[0]
        side = min(w, h)
        left = (w - side) // 2
        top = (h - side) // 2
        orig_cropped = orig[top:top+side, left:left+side]

        # Resize to match final
        orig_resized = np.array(Image.fromarray(orig_cropped).resize(
            (final.shape[1], final.shape[0]), Image.LANCZOS))

        # Compare bright pixels only (specimen area)
        gray = cv2.cvtColor(orig_resized, cv2.COLOR_RGB2GRAY)
        specimen_mask = gray > 45

        if specimen_mask.sum() == 0:
            print(f"  QA WARN: {orig_path.name} — no specimen pixels detected")
            passed += 1
            continue

        # Mean absolute difference on specimen pixels
        diff = np.abs(orig_resized.astype(float) - final.astype(float))
        specimen_diff = diff[specimen_mask].mean()

        # Threshold: average pixel change on specimen should be < 15 (out of 255)
        status = "PASS" if specimen_diff < 15 else "FAIL"
        if status == "FAIL":
            failed += 1
        else:
            passed += 1
        print(f"  QA {status}: {orig_path.name} (specimen delta: {specimen_diff:.1f}/255)")

    print(f"\n  QA Results: {passed} passed, {failed} failed out of {passed + failed}")
    return failed == 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["crop", "clarity", "color", "bg", "qa", "full"])
    parser.add_argument("input_dir")
    parser.add_argument("output_dir", nargs="?", default=None)
    args = parser.parse_args()

    stages = {
        "crop": stage_crop,
        "clarity": stage_clarity,
        "color": stage_color,
        "bg": stage_bg,
    }

    if args.command == "qa":
        stage_qa(args.input_dir, args.output_dir or args.input_dir)
    elif args.command == "full":
        # Run all stages sequentially for a set of images
        base = Path(args.input_dir)
        out_base = Path(args.output_dir) if args.output_dir else PROJECT_ROOT / "tmp" / "processed"

        print("=== STAGE 1: CROP ===")
        stage_crop(base, out_base / "s1-crop")
        print("\n=== STAGE 2: CLARITY ===")
        stage_clarity(out_base / "s1-crop", out_base / "s2-clarity")
        print("\n=== STAGE 3: COLOR ===")
        stage_color(out_base / "s2-clarity", out_base / "s3-color")
        print("\n=== STAGE 4: BACKGROUND ===")
        stage_bg(out_base / "s3-color", out_base / "s4-bg")
        print("\n=== STAGE 5: QA GATE ===")
        stage_qa(str(base), str(out_base / "s4-bg"))
    else:
        if not args.output_dir:
            print("ERROR: output_dir required", file=sys.stderr)
            sys.exit(1)
        count = stages[args.command](args.input_dir, args.output_dir)
        print(f"\n  Processed {count} images")


if __name__ == "__main__":
    main()
