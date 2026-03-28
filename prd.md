# PRD -- Borussia Minerals
> Notion: https://www.notion.so/331b18c770b28132bf6cf16521a2f4f5

## Vision

Sell museum-quality mineral specimens online with an experience that matches the caliber of the product. Collectors should be able to inspect specimens in 3D (Gaussian splats), read provenance narratives, and purchase securely -- all from a site that feels like a high-end gallery, not a commodity marketplace.

## Users

| Segment | Description | Needs |
|---------|-------------|-------|
| Serious collectors | Individuals building curated mineral collections ($1K-$10K+ budgets) | Provenance, quality photos, 3D inspection, secure checkout |
| Museum buyers | Institutional purchasers for exhibits and research collections | Detailed mineralogical data, high-value contact flow |
| Mineral dealers | Wholesale/trade buyers sourcing for their own inventory | Bulk availability, pricing tiers, direct contact |
| Casual enthusiasts | Gem show visitors, hobbyists browsing online | Discovery, education (mine story, localities), entry-level pieces |

## Success Criteria

- All published specimens have complete data (photos, description, dimensions, price, locality)
- 3D splat viewers load within 5 seconds on modern broadband
- Stripe checkout completes with zero manual intervention (auto-marks sold in Sheet)
- Site ranks for "Arizona wulfenite" and "Fat Jack Mine minerals" queries
- Zero customer data leaks (PII isolated to this project only)

## Features

### Live
- **Specimen catalog** -- filterable shop grid (by mineral, crystal system, availability, price range)
- **Specimen detail pages** -- photos, narrative, mineralogical data, pricing, add-to-cart
- **3D Gaussian splat viewer** -- interactive 3D specimen inspection with auto-rotate and camera presets (Front, Side, Top, 3/4)
- **Shopping cart** -- client-side cart with drawer UI, localStorage persistence
- **Stripe checkout** -- secure payment with shipping options (Domestic Standard $45, Priority $75)
- **Webhook-driven inventory** -- Stripe webhook marks specimens as sold in Google Sheets automatically
- **Fat Jack Mine page** -- mine history, geology, provenance story
- **Events page** -- gem show listings
- **Localities page** -- mining locality information
- **Arizona mine map** -- SVG interactive map of mine locations
- **Hero carousel** -- rotating featured specimen showcase on homepage
- **SEO** -- JSON-LD structured data, dynamic sitemap, robots.txt, OpenGraph/Twitter cards
- **ISR revalidation** -- Google Apps Script triggers site rebuild when Sheet is edited
- **LLM-friendly** -- `llms.txt` and `llms-full.txt` for AI search bot consumption
- **Tier badges** -- museum / collector / select / classic quality tiers on specimens
- **Photo strip** -- multi-photo galleries from Google Drive
- **CMS copy** -- all marketing text editable via Google Sheets "Copy" tab

### Not Yet Live
- 3D splats for all specimens (currently subset -- training pipeline ongoing)
- Specimen card/preview share pages (`/card/`, `/preview/`)

## Out of Scope

- User accounts / authentication (guest checkout only)
- Multi-currency / international shipping calculator
- Auction or bidding system
- Inventory management UI (Google Sheets IS the admin interface)
- Blog or content marketing platform
- Email marketing / newsletters
- Customer reviews or ratings

## Timeline

| Milestone | Status |
|-----------|--------|
| Core site + Stripe checkout | DONE |
| Google Sheets as sole data source | DONE |
| 3D Gaussian splat viewer | DONE |
| Fat Jack Mine page | DONE |
| Shop filters + tier system | DONE |
| ISR revalidation pipeline | DONE |
| SEO (sitemap, JSON-LD, robots) | DONE |
| Hero carousel + trust signals | DONE |
| 11 specimens published | DONE |
| Remaining 5 draft specimens | IN PROGRESS |
| Splat training for all specimens | IN PROGRESS |
| Gem show integration | [TBD - Director input needed] |
