"use client";

import { useEffect, useRef, useState } from "react";

interface SplatCamera {
  position: [number, number, number];
  lookAt: [number, number, number];
}

interface SpecimenSplatViewerProps {
  splatUrl: string;
  initialCamera?: SplatCamera;
  className?: string;
}

export function SpecimenSplatViewer({
  splatUrl,
  initialCamera,
  className = "",
}: SpecimenSplatViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const isMobile =
    typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: document.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let viewer: any = null;

    const init = async () => {
      try {
        const { Viewer } = await import("@mkkellogg/gaussian-splats-3d");

        viewer = new Viewer({
          rootElement: containerRef.current,
          selfDrivenMode: true,
          useBuiltInControls: true,
          sharedMemoryForWorkers: false,
          ignoreDevicePixelRatio: false,
        });

        await viewer.loadFile(splatUrl, {
          splatAlphaRemovalThreshold: 5,
          showLoadingUI: false,
        });

        if (initialCamera) {
          const cam = viewer.perspectiveCamera;
          cam.position.set(...initialCamera.position);
          cam.lookAt(...initialCamera.lookAt);
        }

        setLoading(false);
        viewer.start();
      } catch (err) {
        setError("Failed to load 3D model");
        console.error("SplatViewer error:", err);
      }
    };

    init();

    return () => {
      viewer?.dispose?.();
    };
  }, [splatUrl, initialCamera]);

  return (
    <div
      className={`relative w-full aspect-square bg-stone-900 rounded-lg overflow-hidden ${className}`}
    >
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-stone-400">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading 3D model…</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-stone-500">{error}</p>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full" />

      {!loading && !error && (
        <>
          <div className="absolute bottom-2 left-2 text-xs text-stone-500 pointer-events-none">
            {isMobile
              ? "Drag to rotate · Pinch to zoom"
              : "Drag to rotate · Scroll to zoom"}
          </div>

          <button
            onClick={handleShare}
            className="absolute top-2 right-2 p-1.5 bg-stone-800/80 hover:bg-stone-700 rounded text-xs text-stone-400 hover:text-stone-200 transition-colors"
            title="Share"
          >
            {shared ? "Copied!" : isMobile ? "Share" : "Copy link"}
          </button>
        </>
      )}
    </div>
  );
}
