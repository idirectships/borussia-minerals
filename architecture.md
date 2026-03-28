# Architecture -- Borussia Minerals
> Notion: https://www.notion.so/331b18c770b281f990b8c767e204990e

## Stack

| Layer | Choice | Version |
|-------|--------|---------|
| Runtime | Node.js (via bun) | - |
| Framework | Next.js (App Router) | 16.1.1 |
| UI | React | 19.x |
| Language | TypeScript | 5.7 |
| Styling | Tailwind CSS | 3.4 |
| 3D Rendering | @mkkellogg/gaussian-splats-3d | 0.4.7 |
| Payments | Stripe (@stripe/stripe-js + stripe) | 8.10 / 20.4 |
| Data API | googleapis (Google Sheets v4) | 171.4 |
| Blob Storage | @vercel/blob | 2.3 |
| Icons | lucide-react | 0.468 |
| CSS Utilities | clsx, tailwind-merge, class-variance-authority | - |
| Testing | Playwright | 1.58 |
| Hosting | Vercel | - |

## System Map

```
                    +------------------+
                    |   Google Sheets  |
                    | (Inventory/Copy) |
                    +--------+---------+
                             |
              Google Apps Script (on edit)
                             |
                    +--------v---------+
                    |  /api/revalidate |  <-- ISR trigger
                    +--------+---------+
                             |
+----------+    +------------v-----------+    +----------------+
|  Vercel  |    |      Next.js App       |    | Google Drive   |
|   Blob   +--->|  (Server Components)   |<---+ (Specimen      |
| (PLY     |    |                        |    |  Photos)       |
|  files)  |    +---+----+----+-----+----+    +----------------+
+----------+        |    |    |     |
                    |    |    |     |
         +----------+   |    |     +-----------+
         |               |    |                 |
  +------v------+ +------v------+  +------------v-----------+
  |  Shop Page  | | Specimen    |  |  /api/checkout         |
  | (filters,   | | Detail Page |  |  (Stripe session)      |
  |  grid)      | | (splat 3D,  |  +------------+-----------+
  +-------------+ |  gallery,   |               |
                  |  narrative) |       +-------v--------+
                  +-------------+       |    Stripe      |
                                        | (payment +     |
                                        |  webhook)      |
                                        +-------+--------+
                                                |
                                       +--------v---------+
                                       | /api/webhooks/   |
                                       | stripe           |
                                       | (mark sold in    |
                                       |  Google Sheet)   |
                                       +------------------+
```

### Data Flow

1. **Specimen data** flows from Google Sheets -> `google-sheets.ts` -> Server Components -> rendered HTML
2. **Photos** are hosted on Google Drive, referenced by file IDs in the Sheet's `photoIds` column, served via `lh3.googleusercontent.com`
3. **3D splats** (PLY files) are stored in Vercel Blob, URLs stored in specimen config
4. **Copy/CMS text** lives in a "Copy" tab in the same Sheet, fetched by `google-copy.ts`
5. **Purchases** go through Stripe Checkout -> webhook confirms -> `markSpecimensAsSold()` updates Sheet column I

### Revalidation Flow

1. Someone edits the Google Sheet
2. Google Apps Script (`scripts/google-apps-script.js`) fires an HTTP POST to `/api/revalidate`
3. The endpoint validates the shared secret and calls `revalidatePath('/', 'layout')`
4. Next.js ISR regenerates affected pages (also runs on a 60s timer via `export const revalidate = 60`)

## Patterns

- **Server Components first.** All data fetching happens in Server Components. Client Components (`"use client"`) used only for: cart (useReducer + localStorage), splat viewer (WebGL), shop filters (interactive state), hero carousel.
- **In-memory fetch caching.** `google-sheets.ts` and `google-copy.ts` use module-level caches (`allSpecimensCache`, `copyCache`) to avoid redundant API calls during a single build/request cycle.
- **HSL CSS variable theming.** All colors defined as CSS variables in `globals.css`, consumed via `hsl(var(--color))` in Tailwind config. Dark luxury aesthetic with silver/platinum/amber palette.
- **CVA for component variants.** `class-variance-authority` used in `ui/button.tsx` for type-safe style variants (hero, heroOutline, outline, ghost, etc.).
- **Structured data.** JSON-LD injected via `JsonLd` component for Organization and Product schemas (SEO).
- **Smart robots.txt.** Allows search engines and AI search bots. Blocks training-only crawlers (GPTBot, CCBot, Google-Extended).
- **Legacy data coexistence.** Static TypeScript specimen files in `src/data/specimens/` exist for backward compatibility but are NOT the source of truth. The Google Sheets fetch path is authoritative.

## Dependencies

### Production
| Package | Purpose |
|---------|---------|
| next | Framework |
| react / react-dom | UI runtime |
| @mkkellogg/gaussian-splats-3d | 3D Gaussian splat PLY rendering |
| @stripe/stripe-js | Stripe client SDK |
| stripe | Stripe server SDK |
| @vercel/blob | PLY file storage |
| googleapis | Google Sheets + Drive API |
| lucide-react | Icons |
| clsx + tailwind-merge | Conditional class merging |
| class-variance-authority | Component variant definitions |

### Dev
| Package | Purpose |
|---------|---------|
| typescript | Type checking |
| tailwindcss + postcss | CSS compilation |
| eslint + eslint-config-next | Linting |
| @playwright/test | E2E testing |
| dotenv | Env var loading for scripts |

## Infrastructure

- **Hosting:** Vercel (production auto-deploy from `main`)
- **DNS:** borussiaminerals.com (Vercel-managed)
- **Blob Storage:** Vercel Blob (PLY files for 3D splat viewers)
- **Data:** Google Sheets (inventory + copy) + Google Drive (photos)
- **Payments:** Stripe (live keys in Vercel env vars, test keys in `.env.local`)
- **CI:** GitHub Actions (`.github/workflows/`)
- **Splat Training:** Separate pipeline (`~/DEV/splat-pipeline/`), outputs to `~/splat-data/`

## Constraints

- **No database.** All structured data lives in Google Sheets. This is intentional -- the Sheet is the merchant's editing interface.
- **PLY file size.** Gaussian splats are large (10-50MB per specimen). Served from Vercel Blob, not bundled.
- **Google API rate limits.** Sheets API has 100 requests/100 seconds quota. The in-memory cache and ISR revalidation pattern keeps this well within limits.
- **Price threshold.** Specimens over $5,000 show "Price on Request" and cannot be purchased through the cart -- requires direct contact.
- **Single currency.** USD only. No multi-currency support.
- **No user accounts.** Guest checkout only via Stripe.
