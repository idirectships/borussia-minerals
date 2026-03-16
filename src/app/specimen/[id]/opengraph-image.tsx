import { ImageResponse } from "next/og";
import { fetchSpecimenById } from "@/lib/google-sheets";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export async function generateImageMetadata({ params }: { params: { id: string } }) {
  const specimen = await fetchSpecimenById(params.id);
  return [
    {
      id: "og",
      size,
      alt: specimen ? `${specimen.name} — Borussia Minerals` : "Borussia Minerals Specimen",
      contentType,
    },
  ];
}

function formatPriceText(specimen: {
  availability: string;
  priceDisplay?: string;
  price?: number;
}): string {
  if (specimen.availability === "sold") return "Sold";
  if (specimen.priceDisplay) return specimen.priceDisplay;
  if (specimen.price === undefined || specimen.price >= 10000) return "Price on Request";
  return `$${specimen.price.toLocaleString("en-US")}`;
}

export default async function OGImage({ params }: { params: { id: string } }) {
  const specimen = await fetchSpecimenById(params.id);

  if (!specimen) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0f1114",
            color: "#e8eaed",
            fontSize: 48,
            fontFamily: "Georgia, serif",
          }}
        >
          Specimen Not Found
        </div>
      ),
      { ...size }
    );
  }

  const priceText = formatPriceText(specimen);
  const isSold = specimen.availability === "sold";

  // Colors derived from CSS variables:
  // --background: 220 10% 6%  → #0e1013
  // --foreground: 220 10% 95% → #f0f1f3
  // --accent: 32 90% 55%      → #f0a020 (amber crystal)
  // --primary: 220 15% 75%    → #b3bcc9 (silver)
  // --muted-foreground: 220 8% 55% → #858b93
  // --border: 220 10% 20%     → #2e3238

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0e1013",
          padding: "60px 70px",
          position: "relative",
        }}
      >
        {/* Subtle gradient overlay for depth */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(ellipse at 20% 50%, rgba(179,188,201,0.04) 0%, transparent 60%)",
            display: "flex",
          }}
        />

        {/* Top border accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "linear-gradient(90deg, transparent, #f0a020 30%, #f0a020 70%, transparent)",
            display: "flex",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            flex: 1,
            justifyContent: "center",
          }}
        >
          {/* Mineral group label */}
          {specimen.mineralGroup && (
            <div
              style={{
                fontSize: 16,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "#f0a020",
                fontFamily: "sans-serif",
              }}
            >
              {specimen.mineralGroup}
            </div>
          )}

          {/* Specimen name */}
          <div
            style={{
              fontSize: specimen.name.length > 30 ? 52 : 64,
              fontFamily: "Georgia, serif",
              color: "#f0f1f3",
              lineHeight: 1.1,
              maxWidth: "90%",
            }}
          >
            {specimen.name}
          </div>

          {/* Locality */}
          {specimen.locality && (
            <div
              style={{
                fontSize: 24,
                color: "#858b93",
                fontFamily: "sans-serif",
                marginTop: 4,
              }}
            >
              {specimen.locality}
            </div>
          )}

          {/* Dimensions + Crystal System */}
          <div
            style={{
              display: "flex",
              gap: 32,
              marginTop: 8,
            }}
          >
            {specimen.dimensions && (
              <div
                style={{
                  fontSize: 18,
                  color: "#6b7280",
                  fontFamily: "sans-serif",
                }}
              >
                {specimen.dimensions}
              </div>
            )}
            {specimen.crystalSystem && (
              <div
                style={{
                  fontSize: 18,
                  color: "#6b7280",
                  fontFamily: "sans-serif",
                }}
              >
                {specimen.crystalSystem}
              </div>
            )}
          </div>
        </div>

        {/* Bottom row: price + branding */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          {/* Price */}
          <div
            style={{
              fontSize: 36,
              fontFamily: "Georgia, serif",
              color: isSold ? "#858b93" : "#f0a020",
              textDecoration: isSold ? "line-through" : "none",
            }}
          >
            {priceText}
          </div>

          {/* Branding */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontFamily: "Georgia, serif",
                color: "#b3bcc9",
                letterSpacing: "0.05em",
              }}
            >
              Borussia Minerals
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#4b5058",
                fontFamily: "sans-serif",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              Fine Mineral Specimens
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
