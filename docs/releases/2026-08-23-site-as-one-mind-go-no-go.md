# Site as One Mind — Vercel Preview release decision

**Decision: NO-GO**

Finalized 2026-08-24 at 06:42:58 UTC. Production was not promoted and remains unchanged.

The rebuilt site itself is coherent, tested, and ready for Amitoj's review. It expresses one inquiry across research, writing, judgment, yoga, coaching, and photography without turning those practices into a services catalogue. The release is nevertheless not eligible for production under the agreed contract: the real contact transport is unproved, the literal Lighthouse gate is unresolved, and the exact CI-bearing branch cannot be pushed with the current GitHub credential.

## Candidate identity

- Immutable Preview: [amitoj-website-ptz6gpsdd-amitoj-9406s-projects.vercel.app](https://amitoj-website-ptz6gpsdd-amitoj-9406s-projects.vercel.app)
- Vercel deployment: `dpl_2EPYGVhQLPeGBTBf6LQVoBuY8Fa8`, `READY`
- Preview source: `d4da9f6ebfb22e710c88fd940913e340e6e1aa1f`
- Local audited source: `a407d32de7c8d6864f3ae99cca97a15dc9723d79`
- The Preview and local audit trees have identical deployable runtime, lockfile, and Vercel configuration. Their only file difference is the local `.github/workflows/ci.yml`.
- Runtime: Node 24.5.0, npm 11.5.1, Astro 7.2.4, Tailwind CSS 4.3.3, TypeScript 5.9.3, Playwright 1.62.1.

## Blocking gates

| Gate | Status | Observed result |
| --- | --- | --- |
| Formspree provider transport | **BLOCKED** | No synthetic canary was authorized or sent. Ownership, intended-recipient delivery, domain policy, server validation, spam protection, quota, CORS, and the real success redirect remain unproved. |
| Lighthouse thresholds | **FAIL** | All route medians pass Performance ≥90 and Accessibility ≥95. Best Practices is 92 and SEO is 61–69, below the required 95, with no accepted exception. |
| Lighthouse performance non-regression | **FAIL** | Seven of eight comparable route medians are below the U1 production medians, although every candidate median still meets the 90 Performance target. |
| GitHub CI and pull request | **BLOCKED** | The active GitHub credential has `repo` but not `workflow` scope. The pushed runtime branch therefore omits only the new workflow; opening a mergeable PR would misrepresent the verified candidate. |

Any one of these unresolved hard gates requires `NO-GO`. No exception has been inferred on Amitoj's behalf.

## Passing gates

| Gate | Status | Evidence |
| --- | --- | --- |
| Fresh install, audit, check, build | **PASS** | 430 packages installed, 431 audited, 0 vulnerabilities; 62 Astro files with 0 errors/warnings/hints; 61 pages built. |
| Canonical content and migration | **PASS** | Frozen baselines remain intact; 47 reviewed editorial details publish; drafts remain excluded; content tests 11/11. |
| Metadata, navigation, discovery | **PASS** | Metadata/navigation tests 7/7; 58 indexable production URLs, nine RSS items, and four intentional redirects. |
| Photography contract | **PASS** | Exact 49-image public set; two consent-withheld images absent; removed duplicate redirected; tests 5/5. |
| Generated output | **PASS** | 61 HTML routes, 2,131 internal references, 364 local asset references, and 64 fragments resolve; no duplicate IDs or Preview-host leakage. |
| Release harness | **PASS** | 12/12 adversarial contract tests, including host confinement, credential redaction, and negative route/fragment/host cases. |
| Immutable Preview browser suite | **PASS** | 124/124 desktop, 320px mobile, and WebKit checks; all routes and redirects confined to the candidate host; zero external POSTs. |
| Accessibility | **PASS** | 36/36 Preview axe checks; keyboard, visible focus, mobile disclosure, 400% reflow proxy, reduced motion, headings, and native no-JavaScript form behavior pass. VoiceOver was unavailable and remains a named promotion follow-up. |
| Security and Preview hygiene | **PASS** | Required headers and `noindex` present; production canonicals retained; no auth trace, screenshot, video, token, cookie, or host leak persisted. |
| Voice, facts, altitude, publication | **PASS** | Fresh Mind Gate verdict: `MATCHES`, with no remaining P0–P2 voice, factual, overclaim, Sikh-mapping, publication, or hedge-cadence findings. |
| Independent visual dogfood | **PASS** | Eight representative pages inspected at 1280px and 320px; no P0–P2 visual, overflow, focus, hierarchy, broken-image, placeholder, or obvious accessibility findings. |
| First-time orientation | **PASS** | A fresh reader identified Amitoj, the connective inquiry, and a next path as obvious within 30 seconds. |

## First-time reader result

The reader's answers, verbatim:

1. **Who is Amitoj? — Obvious:** “A researcher of organizational judgment and embodied attention, with fifteen years’ experience as an advisor, investor, entrepreneur, and institutional investor.”
2. **What connects the things he does? — Obvious:** “One inquiry—how people and organizations notice what matters, find direction, and preserve human judgment as cognition becomes delegable—examined at personal, bodily, and organizational scales.”
3. **What would you click/read next? — Obvious:** “Research, to see concrete work and evidence behind the central questions.”

The largest orientation friction was also useful: “The proposition is coherent but highly abstract; one concrete example would make the work immediately tangible.” That is a content opportunity, not a release defect: the site now establishes the argument, and a future verified case or project artifact can make it felt sooner.

## Lighthouse evidence

Each candidate route was measured three times against the protected immutable Preview. All 27 accepted reports were bound to the exact candidate origin and path; login or cross-deployment results were rejected. Scores are median Performance / Accessibility / Best Practices / SEO.

| Route | U1 production | Candidate Preview |
| --- | ---: | ---: |
| Home | 97 / 100 / 100 / 100 | **97 / 100 / 92 / 69** |
| Writing | 98 / 95 / 100 / 100 | **91 / 100 / 92 / 69** |
| Library | 99 / 95 / 100 / 100 | **93 / 100 / 92 / 69** |
| Strategic Time essay | 100 / 95 / 100 / 100 | **99 / 100 / 92 / 66** |
| Dot Collector note | 100 / 95 / 100 / 100 | **99 / 100 / 92 / 66** |
| Seeing Like a State annotation | 100 / 95 / 100 / 100 | **99 / 100 / 92 / 66** |
| Yoga | 100 / 95 / 100 / 100 | **99 / 100 / 92 / 69** |
| Practices | Not present | **99 / 100 / 92 / 66** |
| Photography | 100 / 100 / 100 / 100 | **93 / 100 / 92 / 61** |

Two repeated failures are owned by the protected Preview environment, but they still count under the literal gate:

- Vercel injects its Preview feedback script; the site's restrictive Content Security Policy blocks it. Lighthouse counts the single incident in both `errors-in-console` and `inspector-issues`, lowering Best Practices.
- Vercel sets `X-Robots-Tag: noindex` on Preview responses, correctly preventing accidental indexing and lowering SEO.

Photography also timed out fetching `robots.txt` in all three Lighthouse runs. The independent Preview artifact check received `robots.txt` with the expected status, body, headers, and same-host confinement, so this is isolated to Lighthouse's fetch path; it remains named rather than dismissed.

## Contact boundary

The form implementation is locally complete: native and enhanced validation, length bounds, honeypot, submitting, success, allowlisted provider errors, malformed responses, duplicate prevention, retained edits, timeout, retry, accessible focus, and Chromium/WebKit no-JavaScript serialization all pass. Every automated external POST is denied unless an exact test mock owns it.

No live Formspree POST was made. GET, HEAD, or OPTIONS behavior cannot establish endpoint ownership, intended recipient, delivery, quota, restriction, or anti-abuse state. The provider gate therefore remains `BLOCKED`, as the plan requires.

## Production boundary and rollback

Current production remains the last known-good deployment:

- Deployment: `dpl_69WbDLH16XwWcBq5KZet169qcUzg`
- Public origin: [www.amitoj.co](https://www.amitoj.co)
- State: `READY`
- Production semantic evidence SHA-256: `d347bfe1dcfbcf2bb61c630a91ef3f4eb6eaa9df24ffcd53854d42135ed35398`

No production alias, domain, DNS, TLS, environment variable, CDN/cache state, analytics setting, or contact delivery path was changed. Rejecting the candidate therefore requires no rollback operation.

## What changes this decision

The next release pass is deliberately narrow:

1. Amitoj explicitly authorizes a clearly labeled Formspree synthetic canary and provider-account review; verify delivery and the real Chromium/WebKit redirect path without exposing recipient or canary data.
2. Grant the GitHub credential `workflow` scope; push the exact CI-bearing branch and require the clean workflow on a draft PR.
3. Resolve the Lighthouse non-regression and Photography robots timeout, then either meet the literal Best Practices/SEO thresholds on an appropriate immutable environment or ask Amitoj to accept the two named protected-Preview exceptions explicitly.

After those actions, rerun only the invalidated gates against a new immutable Preview. A `GO` would still require a separate, explicit production-promotion instruction.

## Evidence record

The redacted machine-readable record is `2026-08-23-site-as-one-mind-evidence.json`.

- Evidence-record SHA-256: `eb9f72fb5ea6cc9bd2ff48b9f2b90d44a6945eb190f799eaded0fe1954043092`
- Generated-output tree SHA-256: `4d26508411b3014b4fe804cc76fafca30cdfe569de4650f92556ec76252d2f5a`
- Generated-output evidence SHA-256: `b6ad674233769f7229a43bf59f6332300844781b576bd821122761c5a2e68d3d`
- U7 reviewed-transition fixture SHA-256: `a94650b0ed65f0d752f8c703db1874738582f855e3b1effdb9653d90da0da1ce`

The report-bearing commit is documentation-only and must not be relabeled as the already verified Preview source. The immutable Preview identity above remains the candidate evidence boundary.
