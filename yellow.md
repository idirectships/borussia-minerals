# Yellow Paper -- Borussia Minerals
> Notion: https://www.notion.so/331b18c770b28109a81bf5dbfdb63d99

## Protocols

### Data Fetch Protocol
All specimen data is fetched server-side via Google Sheets API v4. The fetch chain:
1. `getAuth()` -- parses `GOOGLE_SERVICE_ACCOUNT_KEY` env var into GoogleAuth credentials (scopes: `spreadsheets`)
2. `fetchAllSpecimens()` -- reads `Inventory!A2:O`, maps rows to `Specimen` objects, caches in-memory
3. `fetchSpecimens()` -- filters to `publishStatus === "published"` only
4. `fetchSpecimenById(id)` -- single specimen lookup from the filtered set

Copy follows the same pattern via `google-copy.ts` reading `Copy!A2:D`.

### Revalidation Protocol
1. Google Apps Script watches for Sheet edits
2. On edit: POST to `https://borussiaminerals.com/api/revalidate` with `x-revalidate-secret` header
3. Endpoint validates secret, calls `revalidatePath('/', 'layout')` for full ISR rebuild
4. Fallback: pages also self-revalidate every 60 seconds (`export const revalidate = 60`)

### Checkout Protocol
1. Client adds specimens to cart (React Context + localStorage)
2. Client POSTs to `/api/checkout` with specimen IDs
3. Server fetches current specimen data from Sheet (validates price, availability)
4. Server creates Stripe Checkout Session with line items + shipping options
5. Client redirects to Stripe-hosted checkout
6. On payment success: Stripe fires `checkout.session.completed` webhook
7. Webhook handler calls `markSpecimensAsSold(specimenIds)` -- updates Sheet column I to "sold"
8. In-memory cache busted so subsequent reads reflect sold status

### Splat Viewer Protocol
1. PLY file URL passed to `SpecimenSplatViewer` component
2. Component dynamically imports `@mkkellogg/gaussian-splats-3d` (client-side only)
3. Initializes WebGL viewer with camera position, auto-rotate (0.5 RPM)
4. Camera presets (Front, Side, Top, 3/4) for quick navigation
5. Falls back to static image if splat fails to load or WebGL unavailable

## Data Structures

### Specimen (TypeScript interface)
```typescript
interface Specimen {
  id: string;                    // Slug: "wulf-001", "azur-002"
  name: string;                  // "Wulfenite on Matrix"
  image: string;                 // Primary photo URL (Drive or local fallback)
  images?: string[];             // Additional photo URLs from Drive
  locality: string;              // "Fat Jack Mine, Yavapai County, AZ"
  crystalSystem: string;         // "Tetragonal", "Monoclinic"
  dimensions: string;            // "4.2 x 3.1 x 2.8 cm"
  description: string;           // Full text description
  price?: number;                // USD cents... no, USD dollars (float)
  availability: "available" | "sold" | "reserved" | "private-collection";
  mineralGroup?: string;         // "Wulfenite", "Azurite"
  weight?: string;               // "124g"
  publishStatus?: "draft" | "review" | "published";
  tier?: "museum" | "collector" | "select" | "classic";
  narrative?: string;            // Extended specimen story
  splatUrl?: string;             // Vercel Blob URL to PLY file
  splatCamera?: {
    position: [number, number, number];
    lookAt: [number, number, number];
  };
  // Additional optional fields: featured, priceDisplay, mineSlug,
  // luster, transparency, provenance, hardness, sizeClass
}
```

### Google Sheets Schema (Inventory tab)
```
Col A: id              (string)  -- specimen slug
Col B: name            (string)  -- display name
Col C: mineral         (string)  -- mineral group
Col D: locality        (string)  -- location string
Col E: crystalSystem   (string)  -- crystal system
Col F: dimensions      (string)  -- physical dimensions
Col G: weight          (string)  -- weight
Col H: price           (string)  -- dollar amount (parsed to float)
Col I: availability    (string)  -- available/sold/reserved/private-collection
Col J: description     (string)  -- specimen description
Col K: photoIds        (string)  -- comma-separated Google Drive file IDs
Col L: notes           (string)  -- internal notes (not displayed)
Col M: publishStatus   (string)  -- draft/review/published
Col N: tier            (string)  -- museum/collector/select/classic
Col O: narrative       (string)  -- extended narrative text
```

### Google Sheets Schema (Copy tab)
```
Col A: key      (string)  -- lookup key (e.g., "hero_heading")
Col B: value    (string)  -- the copy text
Col C: section  (string)  -- section grouping
Col D: page     (string)  -- page name (e.g., "homepage")
```

### Cart State
```typescript
interface CartState {
  items: CartItem[];  // { specimenId, specimen, quantity }
  isOpen: boolean;
}
// Managed via useReducer, persisted to localStorage
// Actions: ADD_ITEM, REMOVE_ITEM, CLEAR_CART, TOGGLE_CART
```

### Mine
```typescript
interface Mine {
  slug: string;              // "fat-jack"
  name: string;              // "Fat Jack Mine"
  location: string;          // "Crown King, Yavapai County, Arizona"
  shortDescription: string;
  history: string;
  geology: string;
  heroImage?: string;
  established?: string;
  minerals?: string[];       // ["Wulfenite", "Vanadinite", ...]
}
```

## API Surface

### `POST /api/checkout`
Creates a Stripe Checkout Session.
- **Input:** `{ items: [{ specimenId: string }] }` (JSON body)
- **Output:** `{ url: string }` (Stripe-hosted checkout URL)
- **Behavior:** Fetches current specimen data from Sheet, validates availability, creates line items with real-time pricing. Shipping options: Domestic Standard ($45) and Priority ($75). Specimens above $5,000 threshold are rejected (price-on-request only).

### `POST /api/revalidate`
Triggers ISR cache purge.
- **Auth:** `x-revalidate-secret` header must match `REVALIDATE_SECRET` env var
- **Output:** `{ revalidated: true, timestamp: number }`
- **Called by:** Google Apps Script on Sheet edit

### `POST /api/webhooks/stripe`
Handles Stripe webhook events.
- **Auth:** Stripe signature verification (`stripe.webhooks.constructEvent`)
- **Events handled:** `checkout.session.completed`
- **Behavior:** Extracts specimen IDs from session metadata, calls `markSpecimensAsSold()` to update Sheet

## Performance Requirements

- **Page load:** Sub-3s for shop and specimen pages (ISR pre-rendered)
- **Splat load:** Under 5s for 3D viewer initialization on broadband
- **Image optimization:** next/image with remote patterns for Google Drive URLs
- **Package optimization:** `optimizePackageImports: ['lucide-react']` to tree-shake icon library
- **Data freshness:** 60-second ISR window + on-demand revalidation from Sheet edits

## Security Model

| Concern | Mitigation |
|---------|-----------|
| Stripe keys | Restricted API keys, server-side only, `.env.local` (never committed) |
| Webhook authenticity | Stripe signature verification on every webhook call |
| Revalidation endpoint | Shared secret in `x-revalidate-secret` header |
| Google API auth | Service account key (no user OAuth), scoped to Sheets API only |
| Customer PII | Handled entirely by Stripe -- site never stores payment data |
| Training crawlers | `robots.ts` blocks GPTBot, CCBot, Google-Extended, anthropic-ai, Bytespider |
| Credential isolation | Stripe keys sealed to this project (GOV-052) -- never referenced elsewhere |
| Environment files | `.env.local` in `.gitignore`, `.env.example` has placeholder values only |

## Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|-----------|
| Google Sheets API down | Empty specimen list, site shows no products | `fetchAllSpecimens()` returns `[]` with console warning, site still renders |
| Google Sheets auth missing | Same as above | `getAuth()` returns null, fetch functions degrade gracefully |
| Stripe webhook fails | Specimen not marked as sold, could oversell | Manual Sheet check; webhook retries (Stripe built-in) |
| PLY file fails to load | No 3D viewer | `SpecimenSplatViewer` falls back to static `fallbackImage` |
| WebGL unavailable | No 3D viewer | Same fallback image path |
| Revalidation secret mismatch | Stale data until 60s ISR timer | 60-second self-revalidation catches up |
| Drive photo unavailable | Broken specimen image | Falls back to local `/images/specimens/{id}.jpg` |
| Price parse failure | `NaN` price | `formatPrice()` returns "Price on Request" for undefined/NaN prices |
