# Borussia Minerals

<!-- LIFECYCLE -->
- **Phase:** PRODUCTION
- **Owner:** dru
- **Deploy:** Vercel
- **Sensitivity:** PUBLIC
- **Last Session:** 2026-03-26
- **Status:** Live e-commerce site with 3D gaussian splat specimen viewers
<!-- /LIFECYCLE -->

## What This Is
E-commerce website for Borussia Minerals LLC. Next.js + Tailwind CSS on Vercel. Features 3D gaussian splat viewers for mineral specimens, Stripe checkout, and specimen catalog. The splat pipeline is a separate shared tool at `~/DEV/splat-pipeline/`.

## Non-Negotiable Rules
- **Stripe credentials are SEALED** to this project. Never reference Borussia Stripe keys from any other project.
- Client/customer PII stays inside this project only. Never write customer data to shared DBs, Discord, or Notion.
- PLY files are served via Vercel Blob, not from local filesystem.
- `~/splat-data/` contains specimen images and training outputs — never commit binary assets.

## Architecture
- **Framework:** Next.js 14+ with App Router
- **Styling:** Tailwind CSS
- **Payments:** Stripe (restricted API keys in `.env.local`)
- **3D Viewers:** Gaussian splat viewers loading PLY from Vercel Blob
- **Deploy:** Vercel (auto-deploy from main)
- **Splat Pipeline:** `~/DEV/splat-pipeline/tools/` for capture-to-PLY workflow
- **Data:** `~/splat-data/specimens/` for raw images, `~/splat-data/completed-plys/` for outputs

## Current Sprint / Open Work
- PR #20 OPEN: Classic store view with splat hero, auto-rotate, camera presets
- Gem show deadline: 2026-03-27 (Boris shoot session this week)
- cupr-001 v3 training in progress on Mama
