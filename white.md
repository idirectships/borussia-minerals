# White Paper -- Borussia Minerals
> Notion: https://www.notion.so/331b18c770b281cea49ffb5b2661eed9

## Problem

The online mineral specimen market is split between two extremes: low-end commodity sites (eBay, Etsy) with poor photography and no provenance, and a handful of elite dealers with static catalog sites that haven't been updated since 2005. Serious collectors want to inspect specimens before buying -- crystal habit, matrix attachment, luster -- but flat photos don't communicate three-dimensional form. Most online mineral sales require either attending gem shows in person or trusting two-dimensional photos for pieces worth thousands of dollars.

## Solution

A purpose-built e-commerce site for museum-quality mineral specimens that uses 3D Gaussian splatting to let collectors interactively inspect each piece from any angle. Every specimen comes with provenance documentation, mineralogical data, and narrative context. The site bridges the gap between in-person gem show inspection and online convenience.

## How It Works

1. **Specimen acquisition** -- Borussia Minerals sources specimens primarily from its own Fat Jack Mine (Yavapai County, AZ) and select private collections
2. **Photography + 3D capture** -- Multi-angle photo sessions feed into a Gaussian splat training pipeline that produces interactive 3D models
3. **Catalog management** -- A Google Sheet serves as the inventory database and admin interface, lowering the operational overhead to near zero
4. **Online storefront** -- Next.js site with ISR renders specimen pages from the Sheet, serves 3D splats from Vercel Blob, and processes payments through Stripe
5. **Fulfillment** -- Specimens are double-boxed with custom foam cradles and fully insured for shipping

## Market

[TBD - Director input needed: market size data, competitive landscape specifics]

**Differentiation:**
- Own-mine provenance (Fat Jack Mine) -- not a reseller
- 3D Gaussian splat viewers -- no competitor offers interactive 3D specimen inspection
- Modern tech stack with instant updates (ISR from Sheet edits)
- Tiered quality classification (museum, collector, select, classic)

## Business Model

- **Direct sales** of mineral specimens ($850-$5,500 per piece currently listed)
- **Shipping revenue** (Domestic Standard $45, Priority $75 -- covers double-boxing, foam cradle, full insurance)
- **Price-on-request tier** for specimens above $5,000 threshold (institutional/museum buyers)
- **Gem show presence** for in-person sales and relationship building

[TBD - Director input needed: margin targets, annual revenue goals, gem show revenue split]

## Roadmap

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Core site + checkout | COMPLETE |
| 2 | Google Sheets data pipeline | COMPLETE |
| 3 | 3D Gaussian splat integration | COMPLETE |
| 4 | SEO + structured data | COMPLETE |
| 5 | Full catalog (16 specimens) | IN PROGRESS |
| 6 | Splat coverage for all specimens | IN PROGRESS |
| 7 | [TBD - Director input needed: expansion plans, new localities, marketing] | - |
