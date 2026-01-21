# Website Project: amitoj.co

Working directory for the custom website build.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The dev server runs at `http://localhost:4321`

## Project Structure

```
Work/Website/
├── src/
│   ├── pages/          # Route pages (.astro files)
│   ├── layouts/        # Page layouts (Layout.astro)
│   ├── components/     # Reusable components
│   ├── content/        # Markdown content collections
│   │   └── blog/       # Blog posts go here
│   └── styles/         # Global CSS (Tailwind)
├── public/             # Static assets (favicon, images)
├── astro.config.mjs    # Astro configuration
├── tailwind.config.mjs # Tailwind + color palette
└── package.json
```

## Tech Stack

- **Framework:** Astro 4.x (static site generator)
- **Styling:** Tailwind CSS 3.4
- **TypeScript:** Enabled
- **Hosting:** Vercel (free tier)
- **Blog:** Markdown content collection

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

## Adding Blog Posts

Create markdown files in `src/content/blog/`:

```markdown
---
title: "Post Title"
description: "Brief description for meta tags"
pubDate: 2026-01-21
tags: ["tag1", "tag2"]
---

Your content here...
```

## Sections

1. **About** - Who Toj is, Third Enlightenment consulting
2. **Work** - Projects and portfolio
3. **Writing** - Blog posts (markdown)
4. **Contact** - How to reach
5. **Yoga** - Yoga offerings/content
6. **Photography** - Photo gallery

## Development Phases

- [x] Phase 1: Project setup + design system
- [x] Phase 2: Homepage + About
- [x] Phase 3: Work + Writing (blog) + Contact
- [x] Phase 4: Yoga + Photography
- [ ] Phase 5: Deploy to Vercel (needs Vercel account)

## Deployment (When Ready)

1. Create Vercel account at vercel.com
2. Push this folder to a git repo
3. Connect repo to Vercel (auto-detects Astro)
4. Point amitoj.co DNS to Vercel

## Reference

Full entity: `Entities/WebsiteProject.md`

---
*Joth builds + deploys*
