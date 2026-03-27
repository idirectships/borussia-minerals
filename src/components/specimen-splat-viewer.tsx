"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";

interface SplatCamera {
  position: [number, number, number];
  lookAt: [number, number, number];
}

interface CameraPreset {
  label: string;
  position: [number, number, number];
  lookAt: [number, number, number];
}

interface SpecimenSplatViewerProps {
  splatUrl: string;
  initialCamera?: SplatCamera;
  presets?: CameraPreset[];
  fallbackImage?: string;
  className?: string;
}

const DEFAULT_PRESETS: CameraPreset[] = [
  { label: "Front", position: [0, 0, 3], lookAt: [0, 0, 0] },
  { label: "Side", position: [3, 0, 0], lookAt: [0, 0, 0] },
  { label: "Top", position: [0, 3, 0.1], lookAt: [0, 0, 0] },
  { label: "3/4", position: [2, 1.5, 2], lookAt: [0, 0, 0] },
];

const AUTO_ROTATE_RPM = 0.5;
const INTERACTION_HINT_TIMEOUT = 3000;

export function SpecimenSplatViewer({
  splatUrl,
  initialCamera,
  presets,
  fallbackImage,
  className = "",
}: SpecimenSplatViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null);
  const rotationFrameRef = useRef<number>(0);
  const hasInteractedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [activePreset, setActivePreset] = useState<number | null>(null);

  const isMobile =
    typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;

  const cameraPresets = presets ?? DEFAULT_PRESETS;

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

  const stopAutoRotate = useCallback(() => {
    if (rotationFrameRef.current) {
      cancelAnimationFrame(rotationFrameRef.current);
      rotationFrameRef.current = 0;
    }
    hasInteractedRef.current = true;
    setShowHint(false);
  }, []);

  const startAutoRotate = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || hasInteractedRef.current) return;

    const cam = viewer.perspectiveCamera;
    if (!cam) return;

    const orbitCenter = initialCamera?.lookAt ?? [0, 0, 0];
    const startPos = {
      x: cam.position.x - orbitCenter[0],
      y: cam.position.y,
      z: cam.position.z - orbitCenter[2],
    };
    const radius = Math.sqrt(startPos.x ** 2 + startPos.z ** 2);
    const startAngle = Math.atan2(startPos.z, startPos.x);
    const startTime = performance.now();
    const radiansPerMs = (AUTO_ROTATE_RPM * 2 * Math.PI) / 60000;

    const animate = (now: number) => {
      if (hasInteractedRef.current) return;

      const elapsed = now - startTime;
      const angle = startAngle + elapsed * radiansPerMs;

      const x = orbitCenter[0] + radius * Math.cos(angle);
      const z = orbitCenter[2] + radius * Math.sin(angle);

      cam.position.set(x, startPos.y, z);
      cam.lookAt(orbitCenter[0], orbitCenter[1], orbitCenter[2]);

      rotationFrameRef.current = requestAnimationFrame(animate);
    };

    rotationFrameRef.current = requestAnimationFrame(animate);
  }, [initialCamera]);

  const handlePresetClick = useCallback(
    (index: number) => {
      const viewer = viewerRef.current;
      if (!viewer) return;

      stopAutoRotate();

      const preset = cameraPresets[index];
      const cam = viewer.perspectiveCamera;
      if (!cam) return;

      // Scale presets relative to initial camera distance if available
      const scale = initialCamera
        ? Math.sqrt(
            initialCamera.position[0] ** 2 +
              initialCamera.position[1] ** 2 +
              initialCamera.position[2] ** 2
          )
        : 3;

      const presetDist = Math.sqrt(
        preset.position[0] ** 2 +
          preset.position[1] ** 2 +
          preset.position[2] ** 2
      );

      const factor = presetDist > 0 ? scale / presetDist : 1;

      cam.position.set(
        preset.position[0] * factor,
        preset.position[1] * factor,
        preset.position[2] * factor
      );
      cam.lookAt(preset.lookAt[0], preset.lookAt[1], preset.lookAt[2]);

      setActivePreset(index);
    },
    [cameraPresets, initialCamera, stopAutoRotate]
  );

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

        viewerRef.current = viewer;

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
        setShowHint(true);
        viewer.start();

        // Start auto-rotate after a brief pause for the viewer to settle
        setTimeout(() => startAutoRotate(), 300);

        // Auto-dismiss hint
        setTimeout(() => setShowHint(false), INTERACTION_HINT_TIMEOUT);
      } catch (err) {
        setError("Failed to load 3D model");
        console.error("SplatViewer error:", err);
      }
    };

    init();

    return () => {
      if (rotationFrameRef.current) {
        cancelAnimationFrame(rotationFrameRef.current);
      }
      viewer?.dispose?.();
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splatUrl]);

  // Attach interaction listeners to stop auto-rotate
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const stop = () => stopAutoRotate();

    el.addEventListener("pointerdown", stop, { passive: true });
    el.addEventListener("touchstart", stop, { passive: true });
    el.addEventListener("wheel", stop, { passive: true });

    return () => {
      el.removeEventListener("pointerdown", stop);
      el.removeEventListener("touchstart", stop);
      el.removeEventListener("wheel", stop);
    };
  }, [stopAutoRotate]);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative w-full aspect-[4/3] bg-stone-900 rounded-lg overflow-hidden">
        {/* Fallback image behind loading state */}
        {loading && fallbackImage && (
          <div className="absolute inset-0 z-0">
            <Image
              src={fallbackImage}
              alt="Loading preview"
              fill
              className="object-contain p-8 opacity-30"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        )}

        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center text-stone-400">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">Loading 3D model...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-stone-500">{error}</p>
          </div>
        )}

        <div ref={containerRef} className="w-full h-full" />

        {/* Interaction hint overlay */}
        {!loading && !error && showHint && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-5 py-3 text-center animate-fade-out">
              <svg
                className="w-8 h-8 mx-auto mb-1.5 text-stone-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M7 11.5V14m0 0v2.5M7 14h2.5M7 14H4.5" />
                <path d="M13.5 4a2 2 0 0 1 2 2v1.5" />
                <path d="M17 9.5a2 2 0 0 1 2 2V14a6 6 0 0 1-6 6H9.5A6 6 0 0 1 3.5 14v-1" />
                <path d="M15.5 7.5a2 2 0 0 1 2 2v0" />
                <path d="M11.5 4.5a2 2 0 0 1 2 2v3" />
                <path d="M9.5 5a2 2 0 0 1 2 2v5" />
              </svg>
              <p className="text-sm text-stone-300 font-medium">
                {isMobile ? "Touch to explore in 3D" : "Drag to explore in 3D"}
              </p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <button
            onClick={handleShare}
            className="absolute top-2 right-2 p-1.5 bg-stone-800/80 hover:bg-stone-700 rounded text-xs text-stone-400 hover:text-stone-200 transition-colors z-10"
            title="Share"
          >
            {shared ? "Copied!" : isMobile ? "Share" : "Copy link"}
          </button>
        )}
      </div>

      {/* Camera preset buttons */}
      {!loading && !error && (
        <div className="flex gap-2">
          {cameraPresets.map((preset, i) => (
            <button
              key={preset.label}
              onClick={() => handlePresetClick(i)}
              className={`flex-1 text-xs uppercase tracking-wider py-1.5 px-2 rounded border transition-colors ${
                activePreset === i
                  ? "border-amber-500/60 text-amber-500 bg-amber-500/10"
                  : "border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-300"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
