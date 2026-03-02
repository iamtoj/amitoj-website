# Voice Revision Design — amitoj.co

**Date:** 2026-03-02
**Scope:** Full revision (Approach B: surgical fixes + essay rewrites)
**Kernel vocabulary:** General-audience language only (no settlement/detection/colonization on site)
**Reframe syntax:** Direct positive claims with bimodal sentence-length variation

---

## Tier 1: Mechanical Fixes

Sentence-level edits. No structural changes. Fix and move on.

### 1a. Blog Posts — Fix violations + archive duplicates

**Archive these 3 earlier versions** (move to `_archive/blog/`):
- `src/content/blog/multiple-minds.md`
- `src/content/blog/agent-polities.md`
- `src/content/blog/the-tacit-knowledge-problem.md`

**Fix violations in revised versions:**

| File | Fix |
|------|-----|
| `why-you-need-multiple-minds.md` | Rewrite 1 "Not X but Y"; remove "precisely" |
| `from-org-theory-to-ai.md` | Rewrite 4 "Not X but Y" instances |
| `teaching-ai-to-think-like-you.md` | Rewrite 3 "Not X but Y"; remove "precisely" |
| `the-third-enlightenment.md` | Remove "precisely"; fix "I've started calling this" |
| `the-dot-collector.md` | Fix "a question I'm still answering" (mild) |
| `where-you-want-variance.md` | Clean — no fixes needed |

**Cross-post redundancy:**
- Write the Digital Twin description once in `the-dot-collector.md`; replace re-explanations in other posts with one-clause reference
- Pick one home for "vertigo" (Dot Collector); use different language in other posts

### 1b. Pages — Fix violations + resolve inconsistencies

| File | Fixes |
|------|-------|
| `content-source/pages/about.md` | Rewrite "Not digital transformation..." to direct positive claim; rewrite "The question isn't 'how do we win?'..."; fix triple parallel rhetorical questions (break third syntax); remove verbatim phrase shared with Third Enlightenment |
| `content-source/pages/third-enlightenment.md` | Rewrite "The answer isn't to reject..."; rewrite "AI doesn't teach us anything new..."; replace "obvious" and "maybe"; rewrite greeting-card-adjacent closing; metabolize or remove Hegel/Murdoch/Spinoza quotes |
| `content-source/pages/home.md` | Minor: tighten opening paragraph sentence length |
| `content-source/work-projects.md` | Rewrite "not tools, but workflows" |
| `content-source/yoga-offerings.md` | Fix enlightenment mapping to match site framework (First = Eastern awareness, Second = Western agency, Third = participation) |

### 1c. Library — Fix violations in 5 content-source entries

| File | Fixes |
|------|-------|
| `sovereignty-of-good-content.md` | Remove "This reframed everything"; remove "I kept returning to"; fix "Read This If" product framing; add attribution to "Freedom as daily attention" annotation |
| `rules-content.md` | Rewrite "Why I Recommend" (remove transformation arc: "I keep returning to," "Daston gave me the vocabulary," "This book changed how I think"); open with scene of framework failing at edges |
| `parallels-and-paradoxes-content.md` | Remove "What draws me back" and "I keep returning to"; fix "this book is proof" product framing |
| `what-tech-calls-thinking-content.md` | Remove "Daub names what I'd felt but couldn't articulate"; sync content-source with cleaner .astro version |
| `breath-content.md` | Fix "You want one intervention" Read This If bullet |

**Also fix in .astro files:**
| File | Fix |
|------|-----|
| `the-matter-with-things.astro` | Remove "I keep coming back to this" |

### 1d. Cross-page duplication

| Duplication | Home | Action in other locations |
|-------------|------|--------------------------|
| "Each transition changed not just what we could do, but who we could become" | Third Enlightenment page | Rephrase on About page |
| Hayek/tin opening | The Right Direction (essay) | Remove from Strategic Time, find new opening |
| "What gets measured gets managed..." (verbatim) | Architecture of Commitment | Rephrase in Strategic Time |
| "How do we win?" / "what game?" | The Right Direction | Remove from Architecture of Commitment |
| "Better measurement exposes evaluative questions" | The Right Direction | Rephrase in Architecture of Commitment and Strategic Time |

---

## Tier 2: Essay Rewrites

Rewrite 3 essays using paper moves at website altitude. Same arguments, same cases, same closings. Different voice.

**Rewrite spec** (from voice-diagnosis.md + voice profile):
- First-person "I" throughout (3-5 per page, epistemic hedges and scope qualifications)
- Colon specification as primary claim delivery
- Concessive long sentences that hold tension ("while," "though," paired em-dashes)
- Genuine questions as analytical tools (not ornamental)
- Generous-then-gap pivots (build strongest version of position, then identify gap)
- "Not X but Y" replaced with direct positive claims + bimodal sentence variation
- Cases developed at 100-200 words each, 2-3 per essay
- Closings preserved (Right Direction and Architecture of Commitment closings are strong)

### Architecture of Commitment
- **Current problem:** Reads as consulting white paper. 1 first-person instance. Register drifts toward prescription.
- **Rewrite target:** Same three-level architecture argument, but the thinker is present throughout. Add scope qualifications ("I'm not confident the three levels are always distinct"), epistemic hedges, genuine questions. The hospital case and climate metrics case stay; develop them to 100-200 words each. Soften the "Three Levels" section from taxonomy to thinking-through-cases.
- **Closing:** Keep as-is (strong open question).

### The Right Direction
- **Current problem:** 3 "Not X but Y" violations. Only 2 first-person instances. Strongest closing on the site.
- **Rewrite target:** Same Hayek engagement, same carbon pricing case, same constitutive property argument. Add first-person presence: "I'm not confident this distinction is always clean" is already there — more of that throughout. The Hayek engagement should use the generous-then-gap pivot explicitly.
- **Closing:** Keep "There is no algorithm for determining what the algorithm should maximize."

### Strategic Time
- **Current problem:** Most paper-like register. Weakest closing (voice violation + packaged lesson). Significant duplication with The Right Direction.
- **Rewrite target:** New opening (not the Hayek/tin anecdote — that belongs to Right Direction). The temporal theory is the genuine contribution; foreground it. Develop the market degeneration / survival degeneration cases to 100-200 words each. Add first-person presence throughout.
- **Closing:** Rewrite. Current closing is a voice violation. Find a crystallized structural insight or open question about temporal architecture.

---

## Deployment

1. Edit all content-source `.md` files and blog `.md` files
2. Port content-source changes into corresponding `.astro` files
3. `npm run build` — verify 0 errors
4. `git add` specific changed files
5. `git commit` with descriptive message
6. `git push origin main` — Vercel auto-deploys
7. Verify amitoj.co serves updated content

---

## Acceptance Criteria

- [ ] Zero "Not X but Y" constructions site-wide (including semantic equivalents)
- [ ] Zero forbidden words site-wide
- [ ] Zero performed introspection ("I keep returning to," "I've been thinking about")
- [ ] Zero announced transformations ("This changed how I think")
- [ ] Zero cross-page verbatim phrase duplication
- [ ] 3 duplicate blog files archived
- [ ] Yoga page enlightenment mapping matches site framework
- [ ] Digital Twin described once (Dot Collector), referenced elsewhere
- [ ] 3 essays rewritten with first-person presence (3-5 "I" per page)
- [ ] All closings crystallize or question (none package)
- [ ] Build passes, site deploys, content verified
