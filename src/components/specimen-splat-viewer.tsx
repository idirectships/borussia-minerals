"use client";

import { useEffect, useRef, useState } from "react";

interface SpecimenSplatViewerProps {
  splatUrl: string;
  className?: string;
}

export function SpecimenSplatViewer({ splatUrl, className = "" }: SpecimenSplatViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [splatUrl]);

  return (
    <div className={`relative w-full aspect-square bg-stone-900 rounded-lg overflow-hidden ${className}`}>
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
        <div className="absolute bottom-2 left-2 text-xs text-stone-500 pointer-events-none">
          Drag to rotate · Scroll to zoom
        </div>
      )}
    </div>
  );
}
