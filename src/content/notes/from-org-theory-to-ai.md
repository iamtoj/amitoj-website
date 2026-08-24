---
slug: "from-org-theory-to-ai"
publicationStatus: "published"
title: "Agent Polities"
description: "A limited political analogy for making authority, disagreement, and override rules visible in multi-agent systems."
pubDate: "2026-01-05"
tags: ["AI","organization theory","agents","governance"]
sortOrder: 3
continuations: [{"target":{"kind":"annotation","slug":"governing-the-commons"}}]
---

Last month I found myself debugging a multi-agent system at 2 AM, watching three AI models argue about how to classify a piece of text. One insisted it was a task. Another called it a reference. The third kept trying to split the difference, suggesting maybe it was both, maybe neither, maybe we needed more information.

I'd seen this dynamic before. Not in software. In organizations.

The meeting that goes nowhere because three departments have three legitimate perspectives and no one has authority to decide. The committee that produces a report satisfying everyone and saying nothing. The hierarchy that demands consensus and gets paralysis instead.

I shut down the agents and went to bed.

---

The system I'd been building: multiple AI agents processing information together, each with a different role. One extracts facts. One asks questions. One synthesizes. The idea was that specialization would improve quality—the same logic that makes assembly lines efficient and surgical teams effective.

What I got instead was the bad kind of bureaucracy—everyone has a say and no one has a decision.

The outputs hedged when the model calls conflicted, producing a synthesis I could not use. I could observe convergence in the text; I could not infer a human motive for it.

I'd inadvertently built a committee.

---

Hobbes worried about the state of nature—what happens when there's no authority to resolve disputes. His solution was the Leviathan, a sovereign with absolute power to impose order. The trade-off: you give up freedom, you get peace.

In multi-agent terms, this is the architecture where one model has final authority. The other agents can advise, critique, propose—but one model decides. The collaboration is efficient, not warm. When the agents start arguing about classification, the Leviathan-agent says "it's a task" and the discussion ends.

In this experiment, one decision model produced a cleaner result. The subordinate suggestions also converged on phrasing the decision model had accepted before. I did not measure why; the result was enough to ask whether centralized selection was erasing the variation I had staged.

---

Locke offered a different arrangement. The sovereign isn't absolute—they operate under a social contract. Citizens consent to authority, but the authority is bounded. There are rights that can't be overridden, processes that must be followed, constraints that check power even at the top.

Using Locke as design vocabulary, the decision model has bounded authority and the override rules are written down. The classification call cannot override a recorded fact without flagging the conflict, and the synthesizer has to record an objection before rejecting it. This is a procedural constraint, not consent or political legitimacy.

I rebuilt the system this way. The Leviathan remained, but now with written constraints. If the critic raised an objection, it had to be logged. If two agents disagreed on a fact, the system would flag it rather than let the decision-maker quietly overrule. The agents still deferred to authority, but authority had to show its work.

Better. Not perfect.

---

The problem with both architectures is that they assume stable situations. Hobbes gives you crisis management—decisive action when chaos threatens. Locke gives you normal operations—fair processes when time permits.

But what about environments that keep changing? What about the situation where the rules that worked yesterday don't fit what's happening today?

Teece’s language of sensing, seizing, and transforming offered a further design question: could the decision structure detect when its own rules no longer fit the task? The organizational theory does not establish that a model system can do this.

The adaptive case remained unresolved in the experiment described here: the system needed a way to detect when its own decision structure had stopped fitting the task.

---

I began treating multi-agent systems as polities—not because models are citizens, but because the analogy makes authority, dissent, and decision rules visible. The resemblance is limited: model outputs do not establish human motives, coalitions, or legitimacy. What transfers is a coordination question—who may decide, how disagreement is recorded, and what can override authority.

---

There's a parallel to the dot-collector essay I wrote. There, the system stores records and proposes connections while I remain responsible for selection and judgment. That division is a practical design choice, not a claim about absolute human and machine capacities.

With multi-agent systems, the division of labor is among model calls. I use governance as a vocabulary for deciding which output can override another, how disagreement is recorded, and when a person intervenes.

I collect dots. The system proposes connections. With multiple model calls, the design still has to specify who or what selects among conflicting outputs: me, another model call, or an explicit rule.

Each choice trades off something. Each choice embeds values I may not have examined.

---

The 2 AM debugging session ended without a clean solution. The three agents still disagreed about that text classification. I shut them down, imposed my own judgment, and noted the failure for later analysis.

I interpreted the failure through a political analogy. The code and prompts had not specified how conflicting outputs should become a decision.

The next morning, I returned to Hobbes’s question as a design prompt: when outputs conflict and a decision is still required, what has authority? That does not make the outputs legitimate perspectives in the human or political sense.
