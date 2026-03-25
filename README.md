# Borussia Minerals — Rare Arizona Mineral Specimens

![CI](https://github.com/idirectships/borussia-minerals/actions/workflows/ci.yml/badge.svg)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/idirectships/borussia-minerals)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green)

E-commerce site for curated mineral specimens sourced from Arizona mines. Each specimen features a **real-time 3D Gaussian splat viewer**, high-resolution photography, and provenance documentation. Inventory is managed through Google Sheets and payments are processed via Stripe.

**Live site:** [borussiaminerals.com](https://borussiaminerals.com)

---

## Features

- **3D Gaussian Splat Viewer** — interactive WebGL viewer powered by `@mkkellogg/gaussian-splats-3d`, rendered from photogrammetry captures of each specimen
- **Google Sheets inventory** — non-technical inventory management; sheet edits trigger ISR revalidation automatically via Apps Script webhook
- **Stripe Checkout** — server-validated checkout with real-time availability checks and inventory guard against overselling
- **Mine locality pages** — history, geology, and provenance for each source mine
- **Arizona mine map** — pure SVG interactive map of source localities
- **ISR caching** — Next.js Incremental Static Regeneration; pages rebuild on sheet edits, not on every request
- **SEO + structured data** — JSON-LD schema, Open Graph, sitemap, robots.txt, Google Search Console verified

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.7 |
| Styling | Tailwind CSS 3 |
| Fonts | Cormorant Garamond + Montserrat (Google Fonts) |
| 3D Viewer | @mkkellogg/gaussian-splats-3d |
| Payments | Stripe (Checkout + Webhooks) |
| Inventory | Google Sheets API v4 |
| File Storage | Vercel Blob (splat `.ksplat` files) |
| Deployment | Vercel |
| Testing | Playwright |

---

## Local Development

**Prerequisites:** Node 20+, [Bun](https://bun.sh)

```bash
# Clone
git clone https://github.com/idirectships/borussia-minerals.git
cd borussia-minerals

# Install
bun install

# Configure env
cp .env.example .env.local
# Fill in values — see Environment Variables section below

# Run dev server
bun dev
# → http://localhost:3000
```

**Build for production:**
```bash
bun run build
bun start
```

**Lint:**
```bash
bun run lint
```

**E2E tests (Playwright):**
```bash
bunx playwright test
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in all values. Never commit `.env.local`.

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Yes | Full JSON service account key (stringified). Must have Sheets API + Drive API enabled. |
| `GOOGLE_SHEET_ID` | Yes | ID of the Google Sheet that holds specimen inventory. Found in the sheet URL. |
| `REVALIDATE_SECRET` | Yes | Shared secret between the site and the Google Apps Script that triggers ISR revalidation on sheet edits. Generate with `openssl rand -hex 32`. |
| `STRIPE_SECRET_KEY` | For checkout | Stripe secret key (`sk_live_...` or `sk_test_...`). |
| `STRIPE_PUBLISHABLE_KEY` | For checkout | Stripe publishable key (`pk_live_...` or `pk_test_...`). |
| `STRIPE_WEBHOOK_SECRET` | For webhooks | Webhook signing secret from Stripe dashboard (`whsec_...`). |

> Specimens priced above $5,000 USD require direct inquiry and are excluded from online checkout.

---

## API Reference

### `POST /api/checkout`

Creates a Stripe Checkout session for the provided cart items.

**Request body:**
```json
{
  "items": [
    { "specimenId": "azur-001" }
  ]
}
```

**Response (200):**
```json
{ "url": "https://checkout.stripe.com/pay/cs_live_..." }
```

**Error responses:**

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{ "error": "No items provided" }` | Empty or missing `items` array |
| 400 | `{ "error": "Specimen {id} not found" }` | Specimen ID does not exist in inventory |
| 400 | `{ "error": "{name} is no longer available" }` | Specimen sold or unavailable |
| 400 | `{ "error": "{name} requires a direct inquiry" }` | Price ≥ $5,000 |
| 503 | `{ "error": "Checkout is not configured..." }` | `STRIPE_SECRET_KEY` missing |
| 500 | `{ "error": "Failed to create checkout session" }` | Stripe API error |

**Shipping options included automatically:**
- Domestic Standard (3–5 business days) — $45
- Domestic Priority (1–2 business days) — $75
- International Insured (5–10 business days) — $125
- Local Pickup — Arizona — Free

---

### `POST /api/webhooks/stripe`

Receives and processes Stripe webhook events. Signature is verified against `STRIPE_WEBHOOK_SECRET`.

**Headers required:**
```
stripe-signature: <computed by Stripe>
```

**Handled events:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Marks purchased specimens as sold in Google Sheets; logs order details |
| `checkout.session.expired` | Logged, no action |
| `payment_intent.payment_failed` | Logged with failure reason |

**Response (200):**
```json
{ "received": true }
```

**Error responses:**

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{ "error": "Missing signature or webhook secret" }` | `stripe-signature` header absent or `STRIPE_WEBHOOK_SECRET` not set |
| 400 | `{ "error": "Invalid signature" }` | Signature verification failed |
| 503 | `{ "error": "Not configured" }` | `STRIPE_SECRET_KEY` missing |

---

### `POST /api/revalidate`

Triggers ISR revalidation for all pages. Called by the Google Apps Script when the inventory sheet is edited.

**Headers required:**
```
x-revalidate-secret: <value of REVALIDATE_SECRET>
```

**Response (200):**
```json
{ "revalidated": true, "timestamp": 1742500000000 }
```

**Error responses:**

| Status | Body | Cause |
|--------|------|-------|
| 401 | `{ "error": "Invalid secret" }` | Missing or incorrect `x-revalidate-secret` header |

---

## Project Structure

```
borussia-minerals/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/
│   │   │   ├── checkout/       # POST /api/checkout — Stripe session creation
│   │   │   ├── webhooks/stripe/# POST /api/webhooks/stripe — Stripe event handler
│   │   │   └── revalidate/     # POST /api/revalidate — ISR trigger
│   │   ├── shop/               # Shop listing page
│   │   ├── specimen/[id]/      # Individual specimen pages with 3D viewer
│   │   ├── localities/         # Mine locality index
│   │   ├── fat-jack/           # Fat Jack Mine dedicated page
│   │   ├── checkout/           # Checkout success/cancel pages
│   │   ├── card/               # Specimen card view
│   │   ├── preview/            # Preview mode
│   │   ├── events/             # Events page
│   │   ├── layout.tsx          # Root layout (fonts, providers, metadata)
│   │   ├── page.tsx            # Homepage
│   │   ├── sitemap.ts          # Dynamic sitemap
│   │   └── robots.ts           # Robots.txt
│   ├── components/             # React components
│   │   ├── ui/                 # Primitive UI components
│   │   ├── navigation.tsx
│   │   ├── footer.tsx
│   │   ├── specimen-card.tsx
│   │   ├── specimen-gallery.tsx
│   │   ├── specimen-splat-viewer.tsx  # Gaussian splat 3D viewer
│   │   ├── az-mine-map.tsx     # SVG mine locality map
│   │   ├── cart-drawer.tsx
│   │   ├── add-to-cart-button.tsx
│   │   └── JsonLd.tsx          # Structured data (JSON-LD)
│   ├── data/
│   │   ├── specimens/          # Static specimen data
│   │   ├── mines/              # Mine metadata
│   │   ├── localities.ts       # Locality definitions
│   │   └── index.ts            # Barrel export
│   ├── hooks/
│   │   └── cart-context.tsx    # Cart state (React context)
│   ├── lib/
│   │   ├── google-sheets.ts    # Inventory read/write via Sheets API
│   │   ├── google-drive.ts     # Image URL resolution
│   │   ├── google-copy.ts
│   │   ├── data.ts             # Data helpers
│   │   └── utils.ts            # Shared utilities
│   ├── config/                 # Site configuration constants
│   └── types/                  # TypeScript type definitions
├── public/
│   ├── images/                 # Static specimen images
│   │   └── specimens/          # Per-specimen photography
│   ├── llms.txt                # LLM-readable site summary
│   └── llms-full.txt           # Extended LLM context
├── scripts/                    # Utility scripts (splat upload, content setup)
├── tests/                      # Playwright e2e tests
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── .env.example
```

---

## Gaussian Splat Pipeline

Specimens are photographed using a turntable + iPhone setup, processed through COLMAP (SfM) and [OpenSplat](https://github.com/pierotofy/OpenSplat), producing `.ply` files that are converted to `.ksplat` format and hosted on Vercel Blob.

The `scripts/upload-splats.mjs` script handles conversion and upload. Viewer component: `src/components/specimen-splat-viewer.tsx`.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — see [LICENSE](LICENSE).
