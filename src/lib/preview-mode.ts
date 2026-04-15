import { draftMode } from "next/headers";

/**
 * Check whether the current request is in preview mode.
 * Backed by Next.js's draftMode() cookie, set via /api/preview/enable.
 * Use in Server Components to gate unreleased UI behind a feature flag.
 */
export async function isPreviewEnabled(): Promise<boolean> {
  const { isEnabled } = await draftMode();
  return isEnabled;
}
