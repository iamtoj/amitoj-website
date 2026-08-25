---
slug: "from-org-theory-to-ai"
publicationStatus: "published"
title: "Agent Polities"
description: "What a 2 AM conflict among three model calls taught me about authority, dissent, and override rules."
pubDate: "2026-01-05"
tags: ["AI","organization theory","agents","governance"]
sortOrder: 3
continuations: [{"target":{"kind":"annotation","slug":"governing-the-commons"}}]
---

Last month, while debugging a multi-agent system at 2 AM, I watched three model calls return different classifications for the same piece of text. One called it a task. Another called it a reference. The third tried to preserve both labels.

I'd seen the same structure in organizations: departments with legitimate perspectives and no authority to decide, committees that satisfied everyone by deciding nothing, hierarchies that demanded consensus and produced paralysis. I shut down the system and went to bed.

---

I had assigned different roles to several model calls because I expected specialization to improve the result. One extracted facts, another asked questions, and a third synthesized their outputs. When their classifications conflicted, the final answer preserved every position and made no decision. I had built a committee.

---

Thomas Hobbes began from conflict without an authority able to resolve it. The Leviathan supplies a sovereign with final power: order is gained by giving one authority the decision. In the system, one call played that role while the others could advise or object. The resulting classification was cleaner, but the disagreement became harder to inspect because the final answer no longer showed which variation had been discarded.

---

John Locke began from a different limit: sovereign authority is bounded by consent, rights, and process. Authority can decide without being entitled to overwrite every claim before it.

Using that vocabulary, I wrote limits into the architecture. A classification call could not overwrite a recorded fact without flagging the conflict, and the synthesizer had to carry an objection forward before rejecting it. One model still made the final classification, but an override now left a trace: the critic’s objection remained in the record, and a factual conflict was flagged instead of silently overwritten.

---

Both arrangements leave a third problem open. They specify how the current structure resolves conflict without saying how it should change when its own rules stop fitting the task. My experiment preserved dissent within a decision structure but could not tell when the structure itself had become the obstacle.

---

I began treating multi-agent systems as polities because the analogy made three design choices visible: who could decide, how dissent survived, and what could override authority. It earned its keep at coordination and stopped before model calls became citizens.

---

There is a parallel to The Dot Collector. In that system, I choose what enters the record and which connection survives while the software stores, retrieves, and proposes. With several model calls, selection moves inside the architecture: conflicting connections still need a selector—me, another call, or an explicit rule.

---

The 2 AM debugging session ended without a clean solution. The three calls still returned different classifications. I imposed my own judgment and noted the failure for later analysis.

The prompts had told each model what role to play. They had not told the system how conflict became decision.

The next morning I returned to Hobbes’s question, translated into design rather than politics: when outputs conflict and a decision is still required, what has authority?
