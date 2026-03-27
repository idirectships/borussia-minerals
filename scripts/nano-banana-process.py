#!/usr/bin/env python3
"""
nano-banana-process.py — Process mineral specimen photos through Nano Banana (Gemini API).

Usage:
  python3 nano-banana-process.py test <image_path>       # Process one image, save for review
  python3 nano-banana-process.py batch <input_dir>       # Process all images in directory
  python3 nano-banana-process.py batch <input_dir> --prompt "custom prompt"

Requires: pip install google-genai Pillow
API Key: GEMINI_API_KEY env var or pass via --key
"""

import os, sys, argparse, time, base64, io
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROCESSED_DIR = PROJECT_ROOT / "tmp" / "processed"

DEFAULT_PROMPT = (
    "You are a photo retoucher working for a high-end mineral dealer. "
    "A photographer shot this specimen on black fabric. Your job is to clean up "
    "ONLY the background and stand — the specimen itself is NOT to be touched AT ALL. "
    "Do not rotate, flip, resize, reposition, sharpen, color-shift, or alter the specimen in ANY way. "
    "The specimen must remain in the EXACT same orientation, position, and appearance as the input photo.\n\n"
    "Background: Replace the wrinkled black fabric with what looks like professional seamless "
    "black photography paper — not a perfect gradient, but realistic matte black with very subtle "
    "natural tonal variation like real Savage seamless paper would have under studio lighting. "
    "It should look like a real photographer's backdrop, not an AI-generated gradient.\n\n"
    "Stand: Clean any visible dust or smudges off the clear acrylic display stand. Keep the stand.\n\n"
    "Framing: Place into a square 1:1 crop with the specimen centered and adequate breathing room. "
    "Do NOT change the orientation or angle of the specimen — if it was horizontal, keep it horizontal.\n\n"
    "White balance: Correct to neutral only if the original has a color cast. Preserve true specimen colors.\n\n"
    "DO NOT: rotate the specimen, enhance crystal detail, add lighting effects, make colors more vivid, "
    "or do anything that would make this look different from what a collector would see in person."
)


def process_image(image_path: str, api_key: str, prompt: str = DEFAULT_PROMPT, output_dir: str = None):
    """Process a single image through Gemini image editing (new google.genai SDK)."""
    from google import genai
    from PIL import Image

    client = genai.Client(api_key=api_key)

    img_path = Path(image_path)
    if not img_path.exists():
        print(f"ERROR: {img_path} not found", file=sys.stderr)
        return None

    print(f"Processing: {img_path.name}...")

    # Load and prep image
    img = Image.open(img_path)
    orig_w, orig_h = img.size
    print(f"  Original: {orig_w}x{orig_h} ({img_path.stat().st_size // 1024}KB)")

    # Resize if too large
    max_dim = 1536
    if max(orig_w, orig_h) > max_dim:
        ratio = max_dim / max(orig_w, orig_h)
        new_w, new_h = int(orig_w * ratio), int(orig_h * ratio)
        img = img.resize((new_w, new_h), Image.LANCZOS)
        print(f"  Resized to: {new_w}x{new_h}")

    if img.mode != "RGB":
        img = img.convert("RGB")

    # Save to bytes for upload
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    image_bytes = buf.getvalue()

    # Use Gemini with image generation config
    response = client.models.generate_content(
        model="nano-banana-pro-preview",
        contents=[
            genai.types.Content(
                parts=[
                    genai.types.Part.from_text(text=prompt),
                    genai.types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                ]
            )
        ],
        config=genai.types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        ),
    )

    # Extract image from response
    out_dir = Path(output_dir) if output_dir else PROCESSED_DIR
    out_dir.mkdir(parents=True, exist_ok=True)
    out_name = f"{img_path.stem}-processed.jpg"
    out_path = out_dir / out_name

    if not response.candidates:
        print(f"  ERROR: No response candidates", file=sys.stderr)
        return None

    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.data:
            with open(out_path, "wb") as f:
                f.write(part.inline_data.data)
            size_kb = out_path.stat().st_size // 1024
            print(f"  Saved: {out_path} ({size_kb}KB)")
            return str(out_path)
        elif part.text:
            print(f"  Text response: {part.text[:200]}")

    print(f"  ERROR: No image data in response", file=sys.stderr)
    return None


def batch_process(input_dir: str, api_key: str, prompt: str = DEFAULT_PROMPT):
    """Process all images in a directory."""
    input_path = Path(input_dir)
    if not input_path.exists():
        print(f"ERROR: {input_path} not found", file=sys.stderr)
        return

    extensions = {".jpg", ".jpeg", ".png", ".heic", ".webp"}
    images = sorted([f for f in input_path.iterdir() if f.suffix.lower() in extensions])

    if not images:
        print(f"No images found in {input_path}")
        return

    print(f"\nBatch processing {len(images)} images...")
    print(f"Prompt: {prompt[:80]}...")
    print(f"Output: {PROCESSED_DIR}\n")

    results = []
    for i, img in enumerate(images, 1):
        print(f"[{i}/{len(images)}] ", end="")
        result = process_image(str(img), api_key, prompt)
        results.append((img.name, result))

        if i < len(images):
            print("  Waiting 3s (rate limit)...")
            time.sleep(3)

    print(f"\n{'='*60}")
    print(f"Results: {sum(1 for _, r in results if r)}/{len(results)} processed")
    for name, result in results:
        status = "OK" if result else "FAILED"
        print(f"  {name}: {status}")


def main():
    parser = argparse.ArgumentParser(description="Nano Banana image processor for Borussia Minerals")
    parser.add_argument("command", choices=["test", "batch"], help="test = one image, batch = all")
    parser.add_argument("path", help="Image path (test) or directory (batch)")
    parser.add_argument("--key", default=os.environ.get("GEMINI_API_KEY"),
                        help="Gemini API key")
    parser.add_argument("--prompt", default=DEFAULT_PROMPT, help="Custom processing prompt")
    parser.add_argument("--output", default=None, help="Output directory (default: tmp/processed/)")
    args = parser.parse_args()

    if not args.key:
        print("ERROR: Set GEMINI_API_KEY env var or pass --key", file=sys.stderr)
        sys.exit(1)

    if args.command == "test":
        result = process_image(args.path, args.key, args.prompt, args.output)
        if result:
            print(f"\nTest complete. Review: {result}")
        else:
            print("\nTest failed. Check error above.")
    elif args.command == "batch":
        batch_process(args.path, args.key, args.prompt)


if __name__ == "__main__":
    main()
