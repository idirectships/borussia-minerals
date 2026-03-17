#!/bin/bash
# quest3-frames.sh — Extract frames from Quest 3 video for COLMAP/OpenSplat
# Usage: ./quest3-frames.sh <video_file> <specimen_id> [fps]
# Example: ./quest3-frames.sh ~/Downloads/azurite-orbit.mp4 azur-001 2
#
# Captures 1-2fps from the video, outputs to ~/splat-projects/<specimen_id>/images/
# Then runs COLMAP + OpenSplat automatically if --train flag set.
#
# Quest 3 capture tips:
#   - Record in MRC (mixed reality capture) mode for best quality
#   - Orbit specimen slowly (~30 seconds per 360°)
#   - Multiple elevation angles: low, mid, top-down
#   - Keep specimen centered, steady ambient lighting
#   - Aim for 60+ frames (30s at 2fps) for good coverage

set -e

VIDEO="$1"
SPECIMEN_ID="$2"
FPS="${3:-2}"
TRAIN="${4:-}"

if [[ -z "$VIDEO" || -z "$SPECIMEN_ID" ]]; then
  echo "Usage: $0 <video> <specimen_id> [fps=2] [--train]"
  exit 1
fi

SPLAT_DIR="${SPLAT_OUTPUT_DIR:-$HOME/splat-projects}"
OUT_DIR="$SPLAT_DIR/$SPECIMEN_ID/images"
mkdir -p "$OUT_DIR"

echo "=== Quest 3 Frame Extraction ==="
echo "Video:      $VIDEO"
echo "Specimen:   $SPECIMEN_ID"
echo "FPS:        $FPS"
echo "Output:     $OUT_DIR"
echo ""

# Get video duration + estimate frame count
DURATION=$(ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$VIDEO" 2>/dev/null || echo "?")
if [[ "$DURATION" != "?" ]]; then
  FRAMES=$(echo "$DURATION * $FPS" | bc | cut -d. -f1)
  echo "Duration:   ${DURATION}s → ~${FRAMES} frames at ${FPS}fps"
fi
echo ""

# Extract frames
echo "Extracting frames..."
ffmpeg -i "$VIDEO" \
  -vf "fps=$FPS,scale=iw:ih" \
  -q:v 2 \
  "$OUT_DIR/frame_%04d.jpg" \
  -hide_banner -loglevel warning

FRAME_COUNT=$(ls "$OUT_DIR"/frame_*.jpg 2>/dev/null | wc -l | tr -d ' ')
echo "Extracted: $FRAME_COUNT frames → $OUT_DIR"

# Coverage assessment
if [[ $FRAME_COUNT -lt 20 ]]; then
  echo "WARNING: Only $FRAME_COUNT frames — increase fps or record longer. Need 20+ for usable splat."
elif [[ $FRAME_COUNT -lt 50 ]]; then
  echo "MARGINAL: $FRAME_COUNT frames — $((50-FRAME_COUNT)) more recommended for quality splat."
else
  echo "GOOD: $FRAME_COUNT frames — ready for training."
fi

# Optionally run COLMAP + OpenSplat
if [[ "$TRAIN" == "--train" ]] || [[ "$4" == "--train" ]]; then
  OPENSPLAT="${OPENSPLAT_BIN:-$HOME/bin/opensplat}"
  LOG="$SPLAT_DIR/drive-train-logs/${SPECIMEN_ID}-quest3-$(date +%Y%m%d-%H%M).log"
  mkdir -p "$(dirname "$LOG")"

  echo ""
  echo "=== Running COLMAP ==="
  colmap automatic_reconstructor \
    --workspace_path "$SPLAT_DIR/$SPECIMEN_ID" \
    --image_path "$OUT_DIR" \
    --single_camera 1 \
    --quality medium 2>&1 | tee "$LOG"

  echo ""
  echo "=== Running OpenSplat ==="
  PLY_OUT="$SPLAT_DIR/$SPECIMEN_ID/${SPECIMEN_ID}-quest3-15k.ply"
  "$OPENSPLAT" "$SPLAT_DIR/$SPECIMEN_ID" \
    --output "$PLY_OUT" \
    -n 15000 \
    --downscale-factor 2 \
    2>&1 | tee -a "$LOG"

  if [[ -f "$PLY_OUT" ]]; then
    SIZE=$(du -sh "$PLY_OUT" | cut -f1)
    echo "PLY output: $PLY_OUT ($SIZE)"
  fi
fi

echo ""
echo "Done. To train manually:"
echo "  colmap automatic_reconstructor --workspace_path $SPLAT_DIR/$SPECIMEN_ID --image_path $OUT_DIR --single_camera 1 --quality medium"
echo "  $HOME/bin/opensplat $SPLAT_DIR/$SPECIMEN_ID --output $SPLAT_DIR/$SPECIMEN_ID/${SPECIMEN_ID}-quest3-15k.ply -n 15000 --downscale-factor 2"
