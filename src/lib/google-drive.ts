/**
 * Google Drive photo URL helpers.
 *
 * Photos are stored in a shared Google Drive folder. Each specimen's
 * "Photo IDs" column in the Sheet contains comma-separated Drive file IDs.
 *
 * For display, we use Drive's direct export URL. For production with
 * next/image optimization, the Drive domain is added to next.config.ts
 * remotePatterns.
 */

/**
 * Get a direct viewable URL for a Drive file.
 * Works for images shared with "Anyone with the link" or the service account.
 */
export function getDriveImageUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

/**
 * Get a thumbnail URL (smaller, faster loading) for a Drive file.
 * sz parameter controls size (e.g., s400 = 400px).
 */
export function getDriveThumbnailUrl(
  fileId: string,
  size: number = 400
): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=s${size}`;
}

/**
 * Parse a comma-separated string of Drive file IDs into an array of image URLs.
 */
export function parsePhotoIds(photoIdsString: string): string[] {
  if (!photoIdsString) return [];
  return photoIdsString
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map(getDriveImageUrl);
}
