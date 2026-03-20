# Contributing to Borussia Minerals

Thanks for your interest. This is a small commercial project — contributions are welcome for bug fixes, accessibility improvements, and performance work.

## What We Accept

- Bug fixes (especially checkout flow, 3D viewer compatibility)
- Accessibility improvements (WCAG 2.1 AA target)
- Performance improvements (Core Web Vitals)
- Documentation corrections

## What We Don't Accept

- New features without prior discussion
- Design changes without prior discussion
- Changes to specimen data or pricing

## Process

1. Open an issue first for anything beyond a trivial fix
2. Fork the repo and create a branch: `fix/your-description` or `chore/your-description`
3. Make your changes — keep the scope tight
4. Ensure `bun run lint` passes with no errors
5. Open a pull request against `main` with a clear description of what changed and why

## Local Setup

See [README.md](README.md#local-development) for setup instructions.

## Code Style

- TypeScript strict mode — no `any` without a comment explaining why
- Error responses always return `{ error: string }` JSON with appropriate HTTP status codes
- No hardcoded secrets — env vars only
- Prefer explicit over clever

## Questions

Open a GitHub issue or reach out via the contact form at [borussiaminerals.com](https://borussiaminerals.com).
