# Security posture

**Site:** amitoj.co

**Last reviewed:** August 24, 2026

**Runtime:** Node 24, Astro 7.2.4 static output, Tailwind CSS 4.3.3

**Hosting:** Vercel

This document describes controls that are present in the repository and the external
boundaries that still require release evidence. It is not a claim that a local build proves
Vercel, Formspree, DNS, or recipient-side behavior.

## Architecture and trust boundaries

The site is generated into static files. It has no application server, database, accounts,
sessions, or same-origin write API. Editorial Markdown and the typed facts registry are read
at build time; visitor input is not rendered back into a page or stored by this repository.

The browser still crosses four external boundaries:

- Vercel serves the static files and applies `vercel.json` redirects and response headers.
- Google Fonts supplies EB Garamond styles and font files.
- Vercel Analytics loads its script and receives web-vitals traffic.
- Formspree is the candidate processor for contact-form submissions.

Compromise or misconfiguration at one of those providers is outside the protection supplied
by static generation. Actual Preview response headers and the contact transport therefore
remain release gates rather than inferred passes.

## Repository-owned response policy

`vercel.json` applies the following policy to every route:

- `Content-Security-Policy`: `default-src 'self'`; scripts are limited to this origin,
  inline site code, and `https://va.vercel-scripts.com`; styles are limited to this origin,
  inline styles, and `https://fonts.googleapis.com`; fonts are limited to this origin and
  `https://fonts.gstatic.com`; images are limited to this origin and data URLs; form actions
  are limited to `https://formspree.io`; connections are limited to this origin,
  `https://vitals.vercel-insights.com`, and `https://formspree.io`; frames and objects are
  denied; the base URL is restricted to this origin.
- `Strict-Transport-Security: max-age=63072000`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

The CSP deliberately retains `'unsafe-inline'` for the current Astro page scripts and styles.
Removing that allowance would require a nonce/hash or external-file migration and is not
represented here as already complete. Google Fonts and Vercel Analytics are also intentional
allowlisted dependencies, not self-hosted assets.

`npm run verify:metadata` checks the exact repository configuration. The immutable Vercel
Preview must independently return the configured directives and Vercel's Preview `noindex`
header before a release recommendation can pass. Local configuration is not response proof.

## Contact transport: blocked pending external evidence

The contact form is a static HTML form whose candidate action is Formspree. With JavaScript
enabled, a small enhancement submits the same fields with `fetch`; without JavaScript, the
browser retains native form behavior. The repository provides:

- required `category`, `name`, `email`, and `message` fields;
- fixed maximum lengths and local, associated validation messages;
- an offscreen honeypot outside the tab order and accessibility tree;
- one-request-at-a-time behavior and retained input on failure;
- fixed local error copy rather than rendering provider-supplied messages or HTML;
- a 15-second local timeout whose copy says that delivery is unknown;
- a disclosure that Formspree processes the message and that sensitive information should
  not be submitted.

These controls improve usability and reduce simple abuse. They do **not** prove endpoint
ownership, intended recipient, provider-side validation, domain restriction, spam controls,
quota health, active state, CORS/CSP compatibility, or delivery.

Accordingly, production contact transport is **BLOCKED** until an explicitly authorized,
clearly labeled synthetic canary proves those external properties. Automated tests intercept
every Formspree request, exercise success/failure/timeout/retry behavior, and default-deny
unmocked external browser `POST`s. They never constitute delivery evidence and must never send
a real visitor message.

## Content and browser safety

- Astro escapes template interpolation by default. The current source has no `set:html`,
  `is:raw`, `innerHTML`, `eval`, or `document.write` path for visitor-controlled input.
- Client-side form errors are selected from local allowlists and written with `textContent`.
- The mobile-navigation script changes attributes, classes, focus, and visibility; it does
  not construct HTML from input.
- External links are not a code-execution boundary in this site. New `target="_blank"` links
  must use an appropriate `rel` value.
- `npm run verify:dist` fails on unexpected public routes, broken internal links or fragments,
  missing local assets, metadata/canonical/social drift, discovery-feed drift, redirect chains,
  or a leaked Vercel Preview hostname.

## Secrets and local Vercel state

No secret is required to build or test the static site. Environment files and `.vercel/` are
ignored. `.vercel/project.json` is local project-linking state and must not be added to future
commits. A public client-side form endpoint is not an authorization secret; provider-side
controls still require account evidence that is kept out of the repository.

Release artifacts and committed reports must not include recipient addresses, submission
bodies, visitor data, provider identifiers, access tokens, cookies, deployment-protection
credentials, or sensitive raw headers.

## Dependency and release checks

The lockfile is authoritative. CI uses Node 24 and `npm ci`, then runs type/build, historical
content preservation, editorial integrity, metadata, photography, generated-site, browser,
and axe gates. `npm audit --audit-level=high` is recorded as advisory supply-chain evidence;
an audit result does not replace code or provider review.

Before any production promotion, the exact immutable Preview candidate must additionally prove:

- source/deployment identity and ready state;
- Preview `noindex`, production canonicals, reviewed response headers, and host confinement;
- one-hop legacy redirects on the Preview host;
- the complete route/browser/accessibility suite;
- authorized contact transport evidence; and
- the remaining manual accessibility and production-only checks named in the release plan.

A failed, blocked, or missing hard gate yields `NO-GO`. Even a `GO` recommendation leaves
production unchanged until Amitoj explicitly authorizes promotion.
