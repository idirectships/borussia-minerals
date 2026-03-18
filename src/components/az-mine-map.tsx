"use client";

import { useState } from "react";
import Link from "next/link";
import { localities, type MineLocality } from "@/data/localities";

// Arizona bounding box
const LON_MIN = -114.82;
const LON_MAX = -109.05;
const LAT_MIN = 31.33;
const LAT_MAX = 37.0;

const W = 600;
const H = 570;

function toSvg(lat: number, lon: number): [number, number] {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * W;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H;
  return [x, y];
}

// Simplified Arizona state outline (clockwise)
const azPoints: [number, number][] = [
  [-109.05, 37.0], // NE — Four Corners
  [-114.03, 37.0], // NW — Utah/Nevada triple point
  [-114.05, 36.85], // NV border starts (Colorado River)
  [-114.57, 35.19], // NW notch
  [-114.38, 34.45], // Parker area
  [-114.73, 32.72], // South of Parker
  [-114.44, 32.44], // Approaching Yuma/Mexico
  [-111.07, 31.33], // Mexico border heading east
  [-109.05, 31.33], // SE corner
];

const statePathD =
  azPoints
    .map(([lon, lat], i) => {
      const [x, y] = toSvg(lat, lon);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ") + " Z";

export function AzMineMap() {
  const [active, setActive] = useState<MineLocality | null>(null);

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* Map */}
      <div className="w-full lg:w-2/3 relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          aria-label="Arizona mine localities map"
        >
          {/* State fill */}
          <path
            d={statePathD}
            fill="hsl(220 10% 10%)"
            stroke="hsl(220 15% 30%)"
            strokeWidth="2"
          />

          {/* County grid lines (decorative) */}
          {[32, 33, 34, 35, 36].map((lat) => {
            const [, y] = toSvg(lat, -114);
            return (
              <line
                key={lat}
                x1={toSvg(lat, LON_MIN)[0]}
                y1={y}
                x2={toSvg(lat, LON_MAX)[0]}
                y2={y}
                stroke="hsl(220 10% 18%)"
                strokeWidth="0.5"
              />
            );
          })}
          {[-114, -113, -112, -111, -110].map((lon) => {
            const [x] = toSvg(37, lon);
            return (
              <line
                key={lon}
                x1={x}
                y1={toSvg(LAT_MAX, lon)[1]}
                x2={x}
                y2={toSvg(LAT_MIN, lon)[1]}
                stroke="hsl(220 10% 18%)"
                strokeWidth="0.5"
              />
            );
          })}

          {/* Mine markers */}
          {localities.map((mine) => {
            const [x, y] = toSvg(mine.lat, mine.lon);
            const isActive = active?.id === mine.id;
            return (
              <g
                key={mine.id}
                onClick={() => setActive(isActive ? null : mine)}
                className="cursor-pointer"
                role="button"
                aria-label={mine.name}
              >
                {/* Pulse ring */}
                {isActive && (
                  <circle
                    cx={x}
                    cy={y}
                    r={22}
                    fill="none"
                    stroke="hsl(32 90% 55%)"
                    strokeWidth="1.5"
                    opacity="0.4"
                  />
                )}
                {/* Outer ring */}
                <circle
                  cx={x}
                  cy={y}
                  r={isActive ? 12 : 9}
                  fill={isActive ? "hsl(32 90% 55%)" : "hsl(220 15% 20%)"}
                  stroke={isActive ? "hsl(32 90% 65%)" : "hsl(220 15% 55%)"}
                  strokeWidth="1.5"
                  className="transition-all duration-200"
                />
                {/* Inner dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={isActive ? 4 : 3}
                  fill={isActive ? "hsl(220 10% 8%)" : "hsl(32 90% 55%)"}
                  className="transition-all duration-200"
                />
                {/* Label */}
                <text
                  x={x}
                  y={y - 16}
                  textAnchor="middle"
                  fill={isActive ? "hsl(32 90% 65%)" : "hsl(220 8% 65%)"}
                  fontSize="11"
                  fontFamily="sans-serif"
                  letterSpacing="0.05em"
                  className="pointer-events-none select-none"
                >
                  {mine.shortName.toUpperCase()}
                </text>
              </g>
            );
          })}

          {/* AZ label */}
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="hsl(220 10% 14%)"
            fontSize="72"
            fontWeight="bold"
            fontFamily="sans-serif"
            className="pointer-events-none select-none"
          >
            AZ
          </text>
        </svg>
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-1/3 space-y-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-6">
          Select a mine to explore
        </p>

        {localities.map((mine) => {
          const isActive = active?.id === mine.id;
          return (
            <button
              key={mine.id}
              onClick={() => setActive(isActive ? null : mine)}
              className={`w-full text-left p-4 rounded border transition-colors ${
                isActive
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-muted-foreground/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div
                    className={`text-sm font-medium ${isActive ? "text-accent" : "text-foreground"}`}
                  >
                    {mine.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {mine.county}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground mt-0.5 shrink-0">
                  {mine.specimenIds.length}{" "}
                  {mine.specimenIds.length === 1 ? "specimen" : "specimens"}
                </span>
              </div>

              {isActive && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {mine.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {mine.minerals.map((m) => (
                      <span
                        key={m}
                        className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {mine.specimenIds.map((id) => (
                      <Link
                        key={id}
                        href={`/specimen/${id}`}
                        className="text-xs uppercase tracking-wider text-accent hover:text-accent/80 transition-colors"
                      >
                        {id} →
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
