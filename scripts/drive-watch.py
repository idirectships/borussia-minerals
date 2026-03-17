#!/usr/bin/env python3
"""
drive-watch.py — Borussia Minerals Drive sync + splat auto-trainer
Runs on GUS (gus_berr). Polls Google Drive for new specimen images,
assesses angular coverage, queues OpenSplat training jobs.

Usage:
  python3 drive-watch.py             # Run once, report
  python3 drive-watch.py --watch     # Poll every 30 min
  python3 drive-watch.py --train     # Also trigger OpenSplat for new data

Config via env (or ~/.borussia.env):
  GOOGLE_SERVICE_ACCOUNT_KEY   JSON key for Drive/Sheets access
  GOOGLE_SHEET_ID              Inventory sheet ID
  GOOGLE_DRIVE_FOLDER_ID       Root "Borussia Minerals" folder ID
  DISCORD_WEBHOOK              Alerts webhook URL
  OPENSPLAT_BIN                Path to opensplat binary (default: ~/bin/opensplat)
  SPLAT_OUTPUT_DIR             Where to write PLY files (default: ~/splat-projects/)
"""

import os, sys, json, time, subprocess, argparse
from pathlib import Path
from datetime import datetime

# --- Config ---
OPENSPLAT = os.environ.get("OPENSPLAT_BIN", str(Path.home() / "bin/opensplat"))
SPLAT_DIR = os.environ.get("SPLAT_OUTPUT_DIR", str(Path.home() / "splat-projects"))
DISCORD_WEBHOOK = os.environ.get("DISCORD_WEBHOOK", "")

# Minimum images per specimen before splat training is worthwhile
MIN_IMAGES_FOR_SPLAT = 20
# Target for high-quality splat
GOOD_COVERAGE_COUNT = 50

def load_env():
    env_file = Path.home() / ".borussia.env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

def get_drive_service():
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    key = os.environ.get("GOOGLE_SERVICE_ACCOUNT_KEY")
    if not key:
        print("ERROR: GOOGLE_SERVICE_ACCOUNT_KEY not set", file=sys.stderr)
        sys.exit(1)

    creds = service_account.Credentials.from_service_account_info(
        json.loads(key),
        scopes=["https://www.googleapis.com/auth/drive.readonly",
                "https://www.googleapis.com/auth/spreadsheets"]
    )
    return build("drive", "v3", credentials=creds)

def list_drive_folders(service, parent_id):
    """List subfolders under parent_id (one per mineral specimen)."""
    result = service.files().list(
        q=f"'{parent_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields="files(id, name, modifiedTime)"
    ).execute()
    return result.get("files", [])

def list_folder_images(service, folder_id):
    """List all image files under a folder (includes subfolders site-official/raw/splats)."""
    images = []
    def recurse(fid):
        res = service.files().list(
            q=f"'{fid}' in parents and trashed=false",
            fields="files(id, name, mimeType, size, modifiedTime, parents)"
        ).execute()
        for f in res.get("files", []):
            if "image" in f.get("mimeType", ""):
                images.append(f)
            elif "folder" in f.get("mimeType", ""):
                recurse(f["id"])
    recurse(folder_id)
    return images

def assess_coverage(image_count):
    """Assess how good the angular coverage is for splat training."""
    if image_count < MIN_IMAGES_FOR_SPLAT:
        return "INSUFFICIENT", f"{image_count} images — need {MIN_IMAGES_FOR_SPLAT}+ for usable splat"
    elif image_count < GOOD_COVERAGE_COUNT:
        return "MARGINAL", f"{image_count} images — {GOOD_COVERAGE_COUNT - image_count} more recommended"
    else:
        return "GOOD", f"{image_count} images — ready for high-quality splat"

def download_images_for_splat(service, folder_id, specimen_id, subfolder="site-official"):
    """Download images from Drive to local splat-projects directory."""
    # Find site-official subfolder
    res = service.files().list(
        q=f"'{folder_id}' in parents and name='{subfolder}' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields="files(id, name)"
    ).execute()
    folders = res.get("files", [])
    if not folders:
        print(f"  No '{subfolder}' subfolder found for {specimen_id}")
        return None

    target_folder = folders[0]["id"]
    images = list_folder_images(service, target_folder)
    if not images:
        return None

    out_dir = Path(SPLAT_DIR) / f"{specimen_id}-drive" / "images"
    out_dir.mkdir(parents=True, exist_ok=True)

    from googleapiclient.http import MediaIoBaseDownload
    import io

    print(f"  Downloading {len(images)} images for {specimen_id}...")
    for img in images:
        out_path = out_dir / img["name"]
        if out_path.exists():
            continue
        request = service.files().get_media(fileId=img["id"])
        with open(out_path, "wb") as f:
            downloader = MediaIoBaseDownload(f, request)
            done = False
            while not done:
                _, done = downloader.next_chunk()

    return str(out_dir.parent)

def queue_splat_job(specimen_dir, specimen_id, iterations=15000):
    """Run COLMAP + OpenSplat on a downloaded specimen directory."""
    log_dir = Path(SPLAT_DIR) / "drive-train-logs"
    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / f"{specimen_id}-{datetime.now().strftime('%Y%m%d-%H%M')}.log"

    print(f"  Queuing splat training for {specimen_id} ({iterations} iterations)...")

    # Run COLMAP SfM first
    cmd_colmap = [
        "bash", "-c",
        f"cd {specimen_dir} && "
        f"colmap automatic_reconstructor --workspace_path . --image_path images "
        f"--single_camera 1 --quality medium 2>&1 | tee {log_file}"
    ]

    # Then OpenSplat
    ply_out = f"{specimen_dir}/{specimen_id}-drive-{iterations//1000}k.ply"
    cmd_splat = [
        OPENSPLAT, specimen_dir,
        "--output", ply_out,
        "-n", str(iterations),
        "--downscale-factor", "2"
    ]

    with open(log_file, "a") as log:
        log.write(f"\n=== COLMAP START: {datetime.now()} ===\n")
        result = subprocess.run(cmd_colmap, capture_output=False, text=True)
        if result.returncode != 0:
            log.write(f"COLMAP FAILED (exit {result.returncode})\n")
            return False
        log.write(f"\n=== OPENSPLAT START: {datetime.now()} ===\n")
        result = subprocess.run(cmd_splat, stdout=log, stderr=log)
        if result.returncode == 0:
            size = Path(ply_out).stat().st_size // (1024*1024) if Path(ply_out).exists() else 0
            log.write(f"\n=== DONE: {ply_out} ({size}MB) ===\n")
            return ply_out
        else:
            log.write(f"\nOPENSPLAT FAILED (exit {result.returncode})\n")
            return False

def send_discord(message):
    if not DISCORD_WEBHOOK:
        return
    import urllib.request
    payload = json.dumps({"content": message}).encode()
    req = urllib.request.Request(DISCORD_WEBHOOK, data=payload,
                                  headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=10)
    except Exception as e:
        print(f"Discord notify failed: {e}", file=sys.stderr)

def run_analysis(service, drive_folder_id, do_train=False):
    """Main analysis loop — scan Drive, assess coverage, optionally train."""
    print(f"\n=== Borussia Drive Analysis: {datetime.now().strftime('%Y-%m-%d %H:%M')} ===")

    folders = list_drive_folders(service, drive_folder_id)
    if not folders:
        print("No specimen folders found in Drive root.")
        return

    report_lines = ["**Borussia Minerals — Drive Analysis**"]
    trained = []

    for folder in sorted(folders, key=lambda f: f["name"]):
        specimen_id = folder["name"].lower().replace(" ", "-")
        images = list_folder_images(service, folder["id"])
        status, msg = assess_coverage(len(images))

        print(f"  {folder['name']}: {msg} [{status}]")
        report_lines.append(f"  • {folder['name']}: {msg}")

        if do_train and status == "GOOD":
            local_dir = download_images_for_splat(service, folder["id"], specimen_id)
            if local_dir:
                ply = queue_splat_job(local_dir, specimen_id)
                if ply:
                    trained.append(f"{folder['name']} → {Path(ply).name}")
                    report_lines.append(f"    ✓ Splat trained: {Path(ply).name}")

    if trained:
        report_lines.append(f"\n**New splats:** {', '.join(trained)}")

    report = "\n".join(report_lines)
    print(f"\n{report}")
    send_discord(report)
    return report

def main():
    load_env()

    parser = argparse.ArgumentParser()
    parser.add_argument("--watch", action="store_true", help="Poll every 30 min")
    parser.add_argument("--train", action="store_true", help="Auto-train splats for ready specimens")
    parser.add_argument("--interval", type=int, default=1800, help="Watch interval seconds (default 1800)")
    args = parser.parse_args()

    drive_folder_id = os.environ.get("GOOGLE_DRIVE_FOLDER_ID")
    if not drive_folder_id:
        print("ERROR: GOOGLE_DRIVE_FOLDER_ID not set", file=sys.stderr)
        sys.exit(1)

    service = get_drive_service()

    if args.watch:
        print(f"Watching Drive every {args.interval}s. Ctrl+C to stop.")
        while True:
            run_analysis(service, drive_folder_id, do_train=args.train)
            time.sleep(args.interval)
    else:
        run_analysis(service, drive_folder_id, do_train=args.train)

if __name__ == "__main__":
    main()
