import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

// Must match the token used on /preview (src/app/preview/page.tsx).
// Prefer PREVIEW_SECRET env var in production.
const DEFAULT_TOKEN = "boris2026";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const redirectTo = searchParams.get("redirect") ?? "/";

  const expected = process.env.PREVIEW_SECRET || DEFAULT_TOKEN;
  if (token !== expected) {
    return new Response("Invalid token", { status: 401 });
  }

  // Only allow same-origin, path-only redirects
  const safeRedirect =
    redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/";

  (await draftMode()).enable();
  redirect(safeRedirect);
}
