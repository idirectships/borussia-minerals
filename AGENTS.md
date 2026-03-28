# Borussia Minerals

<!-- LIFECYCLE -->
- **Phase:** PRODUCTION
- **Owner:** dru
- **Deploy:** Vercel (auto-deploy from main)
- **Sensitivity:** PUBLIC
- **Domain:** https://borussiaminerals.com
- **Status:** 11 live specimens, 5 drafts remaining
<!-- /LIFECYCLE -->

## What This Is

E-commerce site for Borussia Minerals LLC selling museum-quality mineral specimens ($850-$5,500). Features 3D Gaussian splat viewers for interactive specimen inspection, Stripe checkout, and a Google Sheets-driven inventory catalog. Primary focus: Arizona wulfenite from the Fat Jack Mine (Yavapai County, Bradshaw Mountains). The splat pipeline is a separate tool at `~/DEV/splat-pipeline/`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript 5.7 |
| Styling | Tailwind CSS 3.4, CSS variables (HSL color system) |
| Fonts | Cormorant Garamond (display), Montserrat (body) |
| 3D | @mkkellogg/gaussian-splats-3d (PLY viewer) |
| Payments | Stripe (checkout sessions + webhooks) |
| Data | Google Sheets API v4 (inventory + copy) |
| Images | Google Drive (photo hosting via lh3.googleusercontent.com) |
| Blob Storage | Vercel Blob (PLY splat files) |
| Icons | lucide-react |
| Testing | Playwright |
| Deploy | Vercel |
| Package Manager | bun |

## Key Directories

```
src/
  app/                    # Next.js App Router pages
    api/
      checkout/           # Stripe checkout session creation
      revalidate/         # On-demand ISR (triggered by Google Apps Script)
      webhooks/stripe/    # Stripe webhook handler (marks sold in Sheet)
    card/                 # Specimen card/preview page
    checkout/             # Checkout flow (cancel/, success/)
    events/               # Events/gem show page
    fat-jack/             # Fat Jack Mine story page
    localities/           # Mining localities page
    preview/              # Specimen preview page
    shop/                 # Shop grid with filters
    specimen/[id]/        # Individual specimen detail page
  components/             # React components
    ui/                   # Primitives (button.tsx)
    specimen-splat-viewer # 3D Gaussian splat viewer (auto-rotate, camera presets)
    shop-filters          # Mineral/price/availability filters
    shop-grid             # Product grid layout
    cart-drawer           # Shopping cart slide-out
    navigation            # Site nav
    hero-carousel         # Homepage hero image carousel
    az-mine-map           # SVG map of Arizona mine locations
  config/                 # App constants (PRICE_THRESHOLD, CONTACT, SITE)
  data/                   # Static specimen/mine data (legacy, Sheet is authoritative)
    specimens/            # Wulfenite, azurite, fluorite, benitoite, etc.
    mines/                # Fat Jack mine data
  hooks/                  # React hooks (use-cart with CartProvider context)
  lib/                    # Core utilities
    google-sheets.ts      # Inventory CRUD (fetch specimens, mark sold)
    google-copy.ts        # CMS copy from "Copy" sheet tab
    google-drive.ts       # Drive photo URL helpers
    data.ts               # Legacy re-exports (backward compat)
    utils/                # formatPrice, isPurchasable helpers
  types/                  # TypeScript interfaces (Specimen, Mine, CartItem, FilterOptions)
scripts/                  # Operational scripts
  google-apps-script.js   # Sheet-to-site revalidation trigger
  pipeline.py             # Photo processing pipeline
  drive-photo-manager.py  # Drive photo management
  upload-splats.mjs       # PLY upload to Vercel Blob
  publish-check.ts        # Pre-publish validation
public/
  images/                 # Static images (hero, mine photos)
  llms.txt                # LLM-friendly site summary
tests/                    # Playwright e2e tests
```

## Data Source: Google Sheets (SOLE source of truth)

The Google Sheet has two tabs:

**Inventory tab** (columns A-O):
| Col | Field | Notes |
|-----|-------|-------|
| A | id | Specimen slug (e.g., `wulf-001`) |
| B | name | Display name |
| C | mineral | Mineral group |
| D | locality | Mine/location string |
| E | crystalSystem | Crystal system |
| F | dimensions | Physical dimensions |
| G | weight | Weight string |
| H | price | Dollar amount |
| I | availability | available / sold / reserved / private-collection |
| J | description | Specimen description |
| K | photoIds | Comma-separated Google Drive file IDs |
| L | notes | Internal notes |
| M | publishStatus | draft / review / published |
| N | tier | museum / collector / select / classic |
| O | narrative | Extended specimen narrative |

**Copy tab** (columns A-D): key, value, section, page -- drives all CMS copy on the site.

Static `src/data/specimens/` files exist as legacy fallback but the Sheet is authoritative. `fetchSpecimens()` from `google-sheets.ts` is the live data path.

## Non-Negotiable Rules

1. **Stripe credentials are SEALED** to this project. Never reference Borussia Stripe keys from any other project.
2. **Client/customer PII stays inside this project only.** Never write customer data to shared DBs, Discord, or Notion.
3. **PLY files are served via Vercel Blob**, not from local filesystem.
4. **`~/splat-data/`** contains specimen images and training outputs -- never commit binary assets.
5. **Google Sheet is the sole data source.** Do not add specimens via code. Edit the Sheet.
6. **ISR revalidation** is triggered by a Google Apps Script when the Sheet is edited. Do not rely on manual revalidation.

## Development Workflow

```bash
# Install
bun install

# Local dev
bun dev          # http://localhost:3000

# Build
bun run build

# Lint
bun run lint
```

**Environment:** Copy `.env.example` to `.env.local` and fill in:
- `GOOGLE_SERVICE_ACCOUNT_KEY` -- JSON service account key (Sheets + Drive API)
- `GOOGLE_SHEET_ID` -- Spreadsheet ID
- `REVALIDATE_SECRET` -- Shared secret for ISR trigger
- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` -- Stripe API keys
- `STRIPE_WEBHOOK_SECRET` -- Webhook signing secret

**Deploy:** Push to `main` triggers Vercel auto-deploy. All work goes through feature branches + PRs.

**Local Stripe testing:** `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

## Patterns and Conventions

- **ISR with 60s revalidate** on data-driven pages (`export const revalidate = 60`)
- **Server Components by default**, `"use client"` only for interactivity (cart, splat viewer)
- **In-memory caching** in Google Sheets/Copy fetchers to avoid redundant API calls during SSG
- **HSL CSS variables** for theming (dark luxury aesthetic: silver, platinum, amber accents)
- **JSON-LD structured data** on pages for SEO
- **robots.ts** allows search engines + AI search bots, blocks training crawlers (GPTBot, CCBot)
- **Dynamic sitemap** generated from live specimen data
- **Cart state** managed via React Context + useReducer, persisted to localStorage
- **Price threshold** ($5,000) -- specimens above this show "Price on Request" instead of checkout

## Current State

- **11 published specimens** on the shop ($850-$5,500 range)
- **5 draft specimens** awaiting photos/descriptions
- **Splat pipeline** is a separate tool at `~/DEV/splat-pipeline/`
- **Splat data** lives at `~/splat-data/specimens/` (raw images) and `~/splat-data/completed-plys/` (outputs)

## Related Resources

- Splat pipeline: `~/DEV/splat-pipeline/`
- Splat data: `~/splat-data/`
- Content calendar: `content-calendar.md` (in project root)
