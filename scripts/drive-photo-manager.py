#!/usr/bin/env python3
"""
drive-photo-manager.py — List, download, create folder, upload for Borussia store photos.

Usage:
  python3 drive-photo-manager.py list                    # List Store Photos folder
  python3 drive-photo-manager.py download [filename]     # Download one or all photos
  python3 drive-photo-manager.py create-final-folder     # Create "Final Images for Store" in Drive
  python3 drive-photo-manager.py upload <local_dir>      # Upload processed images to final folder

Config via env or ~/DEV/borussia-minerals/.env.local:
  GOOGLE_SERVICE_ACCOUNT_KEY   JSON key for Drive access
"""

import os, sys, json, io, argparse
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
STORE_PHOTOS_FOLDER_ID = "1CLzP3I1X3wBiFaOuHTxLi2-uUWY96CLq"
BORUSSIA_ROOT_FOLDER_ID = "1V-y4KOhhG8K3Z5Ppz-maPPmAEZYMCae1"
RAW_DIR = PROJECT_ROOT / "tmp" / "raw-photos"
PROCESSED_DIR = PROJECT_ROOT / "tmp" / "processed"


def load_env():
    """Load env vars from .env.local"""
    env_file = PROJECT_ROOT / ".env.local"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip("'\"")
                os.environ.setdefault(k, v)


def get_drive_service():
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    key = os.environ.get("GOOGLE_SERVICE_ACCOUNT_KEY")
    if not key:
        print("ERROR: GOOGLE_SERVICE_ACCOUNT_KEY not set", file=sys.stderr)
        sys.exit(1)

    creds = service_account.Credentials.from_service_account_info(
        json.loads(key),
        scopes=["https://www.googleapis.com/auth/drive"]
    )
    return build("drive", "v3", credentials=creds)


def list_photos(service, folder_id=STORE_PHOTOS_FOLDER_ID):
    """List all image files in folder (non-recursive)."""
    result = service.files().list(
        q=f"'{folder_id}' in parents and trashed=false",
        fields="files(id, name, mimeType, size, modifiedTime, imageMediaMetadata)",
        orderBy="name"
    ).execute()
    files = result.get("files", [])
    print(f"\n{'Name':<45} {'Type':<15} {'Size':>10}  {'Modified':<20}")
    print("-" * 95)
    for f in files:
        size = int(f.get("size", 0))
        size_str = f"{size // 1024}KB" if size > 0 else "—"
        meta = f.get("imageMediaMetadata", {})
        dims = f"{meta.get('width', '?')}x{meta.get('height', '?')}" if meta else "—"
        print(f"  {f['name']:<43} {dims:<15} {size_str:>10}  {f.get('modifiedTime', '?')[:16]}")
    print(f"\nTotal: {len(files)} files")
    return files


def download_file(service, file_info, dest_dir):
    """Download a single file from Drive."""
    from googleapiclient.http import MediaIoBaseDownload

    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    out_path = dest_dir / file_info["name"]

    if out_path.exists():
        print(f"  SKIP (exists): {out_path}")
        return out_path

    request = service.files().get_media(fileId=file_info["id"])
    with open(out_path, "wb") as f:
        downloader = MediaIoBaseDownload(f, request)
        done = False
        while not done:
            status, done = downloader.next_chunk()
    size = out_path.stat().st_size // 1024
    print(f"  Downloaded: {file_info['name']} ({size}KB)")
    return out_path


def download_photos(service, filename=None):
    """Download one or all photos from Store Photos folder."""
    files = list_photos(service)
    if not files:
        print("No files found.")
        return []

    RAW_DIR.mkdir(parents=True, exist_ok=True)

    if filename:
        match = [f for f in files if f["name"] == filename]
        if not match:
            # Try partial match
            match = [f for f in files if filename.lower() in f["name"].lower()]
        if not match:
            print(f"No file matching '{filename}' found.")
            return []
        files = match[:1]
        print(f"\nDownloading 1 file...")
    else:
        print(f"\nDownloading {len(files)} files...")

    downloaded = []
    for f in files:
        if "image" in f.get("mimeType", "") or f["name"].lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            path = download_file(service, f, RAW_DIR)
            downloaded.append(path)
        else:
            print(f"  SKIP (not image): {f['name']} ({f.get('mimeType', '?')})")

    print(f"\nDownloaded {len(downloaded)} images to {RAW_DIR}")
    return downloaded


def create_final_folder(service):
    """Create 'Final Images for Store' folder in Drive."""
    # Check if it already exists
    result = service.files().list(
        q=f"'{BORUSSIA_ROOT_FOLDER_ID}' in parents and name='Final Images for Store' "
          f"and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields="files(id, name)"
    ).execute()
    existing = result.get("files", [])
    if existing:
        print(f"Folder already exists: {existing[0]['name']} (ID: {existing[0]['id']})")
        return existing[0]["id"]

    metadata = {
        "name": "Final Images for Store",
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [BORUSSIA_ROOT_FOLDER_ID]
    }
    folder = service.files().create(body=metadata, fields="id, name").execute()
    print(f"Created folder: {folder['name']} (ID: {folder['id']})")
    return folder["id"]


def upload_processed(service, local_dir):
    """Upload all images from local_dir to Final Images for Store."""
    from googleapiclient.http import MediaFileUpload

    folder_id = create_final_folder(service)
    local_dir = Path(local_dir)

    if not local_dir.exists():
        print(f"ERROR: {local_dir} does not exist", file=sys.stderr)
        return []

    images = sorted(local_dir.glob("*.jpg")) + sorted(local_dir.glob("*.png"))
    print(f"\nUploading {len(images)} images to Drive...")

    uploaded = []
    for img_path in images:
        metadata = {
            "name": img_path.name,
            "parents": [folder_id]
        }
        media = MediaFileUpload(str(img_path), mimetype="image/jpeg")
        f = service.files().create(body=metadata, media_body=media, fields="id, name").execute()
        # Make publicly readable for lh3 URL access
        service.permissions().create(
            fileId=f["id"],
            body={"type": "anyone", "role": "reader"}
        ).execute()
        print(f"  Uploaded: {f['name']} → ID: {f['id']}")
        uploaded.append({"name": f["name"], "id": f["id"]})

    print(f"\nUploaded {len(uploaded)} images. Drive folder ID: {folder_id}")
    return uploaded


def main():
    load_env()

    parser = argparse.ArgumentParser(description="Borussia Minerals Drive photo manager")
    parser.add_argument("command", choices=["list", "download", "create-final-folder", "upload"],
                        help="Command to run")
    parser.add_argument("arg", nargs="?", help="Filename for download, or directory for upload")
    args = parser.parse_args()

    service = get_drive_service()

    if args.command == "list":
        list_photos(service)
    elif args.command == "download":
        download_photos(service, args.arg)
    elif args.command == "create-final-folder":
        create_final_folder(service)
    elif args.command == "upload":
        if not args.arg:
            print("ERROR: upload requires a directory path", file=sys.stderr)
            sys.exit(1)
        upload_processed(service, args.arg)


if __name__ == "__main__":
    main()
