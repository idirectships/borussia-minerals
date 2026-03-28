"use client";

import { useState, useCallback, useEffect } from "react";
import { SpecimenSplatViewer } from "@/components/specimen-splat-viewer";
import { SPLAT_CATALOG, type SplatEntry } from "@/config/splats";

/**
 * Shared staging password. Not security-critical -- just prevents casual
 * discovery. Same pattern as the existing /preview page.
 */
const STAGING_PASSWORD = "boris2026";
const STORAGE_KEY = "borussia-splats-auth";

function PasswordGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (password === STAGING_PASSWORD) {
        sessionStorage.setItem(STORAGE_KEY, "1");
        onAuthenticated();
      } else {
        setError(true);
        setPassword("");
      }
    },
    [password, onAuthenticated]
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "hsl(220 10% 6%)" }}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-6 text-center"
      >
        <div className="space-y-2">
          <h1
            className="text-3xl tracking-tight"
            style={{
              fontFamily: "var(--font-display), Georgia, serif",
              color: "hsl(220 10% 95%)",
            }}
          >
            Borussia Minerals
          </h1>
          <p
            className="text-sm uppercase tracking-[0.2em]"
            style={{ color: "hsl(220 8% 55%)" }}
          >
            3D Specimen Staging
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder="Enter password"
            autoFocus
            className="w-full px-4 py-3 rounded text-sm outline-none transition-colors"
            style={{
              background: "hsl(220 10% 12%)",
              border: `1px solid hsl(220 10% ${error ? "40%" : "20%"})`,
              color: "hsl(220 10% 95%)",
              borderColor: error ? "hsl(0 84% 60%)" : undefined,
            }}
            aria-label="Staging password"
            aria-invalid={error}
          />
          {error && (
            <p className="text-xs" style={{ color: "hsl(0 84% 60%)" }}>
              Wrong password
            </p>
          )}
          <button
            type="submit"
            className="w-full px-4 py-3 rounded text-sm uppercase tracking-[0.15em] transition-colors"
            style={{
              background: "hsl(220 15% 75%)",
              color: "hsl(220 10% 8%)",
            }}
          >
            View Splats
          </button>
        </div>
      </form>
    </div>
  );
}

function SpecimenSelector({
  specimens,
  selected,
  onSelect,
}: {
  specimens: SplatEntry[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {specimens.map((s) => {
        const active = s.id === selected;
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="px-4 py-2 rounded text-xs uppercase tracking-wider transition-colors"
            style={{
              border: `1px solid ${active ? "hsl(32 90% 55%)" : "hsl(220 10% 25%)"}`,
              background: active ? "hsla(32, 90%, 55%, 0.1)" : "transparent",
              color: active ? "hsl(32 90% 55%)" : "hsl(220 8% 55%)",
            }}
            aria-pressed={active}
          >
            <span className="block">{s.label}</span>
            <span
              className="block mt-0.5 normal-case tracking-normal"
              style={{
                color: active ? "hsla(32, 90%, 55%, 0.6)" : "hsl(220 8% 40%)",
                fontSize: "10px",
              }}
            >
              {s.mineral} &middot; {s.id}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SplatStaging() {
  const [selectedId, setSelectedId] = useState(SPLAT_CATALOG[0]?.id ?? "");
  const specimen = SPLAT_CATALOG.find((s) => s.id === selectedId);

  if (SPLAT_CATALOG.length === 0) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: "hsl(220 10% 6%)" }}
      >
        <p style={{ color: "hsl(220 8% 55%)" }}>
          No splats uploaded yet. Run{" "}
          <code
            className="px-2 py-0.5 rounded text-xs"
            style={{ background: "hsl(220 10% 12%)" }}
          >
            bun scripts/upload-splats.mjs
          </code>{" "}
          to upload PLY files to Vercel Blob.
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "hsl(220 10% 6%)" }}
    >
      {/* Header */}
      <header
        className="border-b px-6 py-4"
        style={{ borderColor: "hsl(220 10% 15%)" }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1
              className="text-xl tracking-tight"
              style={{
                fontFamily: "var(--font-display), Georgia, serif",
                color: "hsl(220 10% 95%)",
              }}
            >
              3D Specimen Viewer
            </h1>
            <p
              className="text-xs uppercase tracking-[0.2em] mt-0.5"
              style={{ color: "hsl(220 8% 45%)" }}
            >
              Staging &middot; {SPLAT_CATALOG.length} specimen
              {SPLAT_CATALOG.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div
            className="text-xs uppercase tracking-[0.15em] px-3 py-1.5 rounded"
            style={{
              background: "hsla(32, 90%, 55%, 0.15)",
              color: "hsl(32 90% 55%)",
            }}
          >
            Private Preview
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Specimen selector */}
        <SpecimenSelector
          specimens={SPLAT_CATALOG}
          selected={selectedId}
          onSelect={setSelectedId}
        />

        {/* Viewer */}
        {specimen && (
          <div className="space-y-4">
            <div
              className="rounded-lg overflow-hidden"
              style={{
                border: "1px solid hsl(220 10% 15%)",
                background: "hsl(220 10% 4%)",
              }}
            >
              <SpecimenSplatViewer
                key={specimen.id}
                splatUrl={specimen.url}
                initialCamera={specimen.camera}
                className="w-full"
              />
            </div>

            {/* Specimen info */}
            <div
              className="flex items-center justify-between rounded-lg px-5 py-4"
              style={{
                background: "hsl(220 10% 8%)",
                border: "1px solid hsl(220 10% 15%)",
              }}
            >
              <div>
                <h2
                  className="text-lg"
                  style={{
                    fontFamily: "var(--font-display), Georgia, serif",
                    color: "hsl(220 10% 95%)",
                  }}
                >
                  {specimen.label}
                </h2>
                <p
                  className="text-xs mt-1"
                  style={{ color: "hsl(220 8% 45%)" }}
                >
                  {specimen.mineral} &middot; {specimen.id}
                </p>
              </div>
              <div className="text-right">
                <p
                  className="text-xs uppercase tracking-[0.15em]"
                  style={{ color: "hsl(220 8% 40%)" }}
                >
                  Controls
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "hsl(220 8% 55%)" }}
                >
                  Drag to rotate &middot; Scroll to zoom &middot; Right-drag to
                  pan
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className="border-t px-6 py-4 mt-8"
        style={{ borderColor: "hsl(220 10% 12%)" }}
      >
        <p
          className="text-center text-xs"
          style={{ color: "hsl(220 8% 35%)" }}
        >
          Borussia Minerals &middot; Staging only &middot; Do not share this
          link
        </p>
      </footer>
    </div>
  );
}

export default function SplatsPage() {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === "1") {
      setAuthenticated(true);
    }
  }, []);

  if (!authenticated) {
    return <PasswordGate onAuthenticated={() => setAuthenticated(true)} />;
  }

  return <SplatStaging />;
}
