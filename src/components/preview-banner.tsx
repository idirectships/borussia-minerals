import { isPreviewEnabled } from "@/lib/preview-mode";

/**
 * Sticky top banner shown whenever preview mode is active.
 * Renders nothing in normal (published) mode.
 */
export async function PreviewBanner() {
  const enabled = await isPreviewEnabled();
  if (!enabled) return null;

  return (
    <div className="sticky top-0 z-50 bg-accent/20 text-accent border-b border-accent/40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em]">
          <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
          Preview mode active
        </div>
        <a
          href="/api/preview/disable"
          className="text-xs uppercase tracking-[0.2em] border border-accent/40 px-3 py-1 rounded hover:bg-accent/30 transition-colors"
        >
          Exit preview
        </a>
      </div>
    </div>
  );
}
