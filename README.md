# amitoj.co

The canonical source for Amitoj Singh’s static personal website.

## Quick Start

```bash
# Use Node 24 and install the exact lockfile
nvm use
npm ci

# Start development server
npm run dev

# Run the same verification sequence as CI
npm run check
npm run build
npm run verify:baseline
npm run verify:migration
npm run verify:content
npm run verify:metadata
npm run verify:photography
npm run verify:dist
npm run verify:release-harness
npx playwright install --with-deps chromium webkit
npm run test:browser

# Record advisory dependency posture (CI does not treat this as a hard gate)
npm audit --audit-level=high

# Preview production build
npm run preview
```

The dev server runs at `http://localhost:4321`

## Project Structure

```
website/
├── src/
│   ├── pages/          # Route pages (.astro files)
│   ├── layouts/        # Page layouts (Layout.astro)
│   ├── components/     # Reusable components
│   ├── content/        # Markdown content collections
│   │   ├── essays/     # Long-form Essays (including drafts)
│   │   ├── notes/      # Short-form Notes published under /blog
│   │   └── reading-annotations/ # Library annotations
│   └── styles/         # Global CSS (Tailwind)
├── public/             # Static assets (favicon, images)
├── astro.config.mjs    # Astro configuration
├── tailwind.config.mjs # Tailwind + color palette
└── package.json
```

## Tech Stack

- **Runtime:** Node 24
- **Framework:** Astro 7.2.4 (static site generator)
- **Styling:** Tailwind CSS 4.3.3 through its Vite plugin
- **TypeScript:** 5.9.3
- **Hosting:** Vercel
- **Writing and Library:** Astro Content Layer Markdown collections

Tailwind 4 sets the browser floor at Safari 16.4+, Chrome 111+, and Firefox 128+.

## Design System

### Color Palette (in `tailwind.config.mjs`)

| Token | Hex | Usage |
|-------|-----|-------|
| `oat-200` | #F5F0E6 | Primary background |
| `sky-300` | #B8D4E3 | Accent blue (sky, clarity) |
| `sage-300` | #B2BDA0 | Accent green (natural, grounded) |
| `ink` | #2D2A26 | Body text |
| `ink-light` | #5A5651 | Secondary text |
| `ink-muted` | #8A857E | Captions, tertiary |

### Typography

- **Font:** EB Garamond (Google Fonts, Garamond alternative)
- **Body:** 18px, line-height 1.75
- **Max prose width:** 65ch for optimal readability

### Utility Classes (in `global.css`)

- `.container-zen` - Centered content container with generous padding
- `.section-zen` - Section with breathing-room vertical padding
- `.accent-line` - Subtle 16px sage green horizontal rule
- `.card-zen` - Card with subtle border

## Adding Content

The only canonical editorial authoring sources are the root-level Markdown files in:

- `src/content/essays/`
- `src/content/notes/`
- `src/content/reading-annotations/`

Every filename must match its explicit `slug`. New entries default to draft, and must set
`publicationStatus: "published"` plus every form-specific field before they can appear publicly.
The collection schemas in `src/content.config.ts` are the authoritative field contract.
Markdown under `content-source/_archive/` is historical evidence only. No other
`content-source/**` Markdown is permitted, and nothing there is an authoring source.

For example, a new Note starts in `src/content/notes/`:

```markdown
---
slug: "post-title"
publicationStatus: "draft"
title: "Post Title"
description: "Brief description for meta tags"
pubDate: 2026-01-21
tags: ["tag1", "tag2"]
sortOrder: 7
continuations: []
---

Your content here...
```

Run `npm run verify:content` after editing any collection. Run
`npm run test:editorial-network` after changing inquiry trails, continuations, or the
Library filter. The public Writing index is
`/writing`; Essays render under `/essays/:slug`, Notes under `/blog/:slug`, and Reading
Annotations under `/library/:slug`. `/essays` permanently redirects to `/writing`.
The obsolete `/blog/the-third-enlightenment` Note is a draft and permanently redirects in
one hop to the canonical working theory at `/third-enlightenment`.

## Sections

The principal public routes are `/about`, `/research`, `/practices`, `/writing`, `/library`,
`/coaching`, `/yoga`, `/photography`, `/third-enlightenment`, `/principles`, and `/contact`.
`/work` permanently redirects to `/research`.

## Verification

Pull requests run a clean Node 24 install followed, in order, by `npm run check`,
`npm run build`, `npm run verify:baseline`, `npm run verify:migration`,
`npm run verify:content`, `npm run verify:metadata`, `npm run verify:photography`,
`npm run verify:dist`, and `npm run verify:release-harness`. CI then installs Chromium
and WebKit, runs `npm run test:browser` (which orchestrates `npm run test:e2e` followed by
`npm run test:a11y`), and records `npm audit --audit-level=high` as advisory evidence. The
full generated-site verification prints deterministic JSON with hashes that bind the checked
`dist/` tree and the release contract.

After `npm run build`, local browser tests serve `dist/` at `http://127.0.0.1:4327`. After
separately verifying the release candidate's deployment identity, repeat the same suite against
its deployment-specific, root-level HTTPS Vercel URL:

```bash
PLAYWRIGHT_BASE_URL=https://deployment-specific-host.vercel.app npm run test:e2e
PLAYWRIGHT_BASE_URL=https://deployment-specific-host.vercel.app npm run test:a11y
```

Setting `PLAYWRIGHT_BASE_URL` disables the local server. The harness accepts only root-level
`*.vercel.app` HTTPS URLs and denies any external browser `POST` that is not handled by an
explicit page-level mock. The contact tests never send a live inquiry; the no-JavaScript
serialization contract runs in both Chromium and WebKit against an intercepted response.
If Vercel protects the Preview, obtain a temporary Vercel share link and pass it only through
`PLAYWRIGHT_VERCEL_SHARE_URL` alongside the root-level `PLAYWRIGHT_BASE_URL`. The harness
requires an exact same-origin `?_vercel_share=...` URL, establishes its cookie once per browser
worker, disables Playwright traces, screenshots, and video for that run, and never stores the
link in source or test output.
The URL shape check does not prove immutability: release evidence must separately bind the URL
to the deployment ID, candidate commit, lockfile, configuration, and runtime revision.

Production promotion is a separate, explicit release decision. CI does not deploy or
promote production.

Vercel reads the static build and the permanent redirects in `vercel.json`. A human go/no-go
decision is required before production deployment.
