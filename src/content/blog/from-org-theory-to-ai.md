---
title: "Agent Polities"
description: "What political philosophy can teach us about authority, disagreement, and adaptation in systems of AI agents."
pubDate: 2026-01-05
tags: ["AI", "organization theory", "agents", "governance"]
---
Last month I found myself debugging a multi-agent system at 2 AM, watching three AI models argue about how to classify a piece of text. One insisted it was a task. Another called it a reference. The third kept trying to split the difference, suggesting maybe it was both, maybe neither, maybe we needed more information.

I'd seen this dynamic before in organizations.

The meeting that goes nowhere because three departments have three legitimate perspectives and no one has authority to decide. The committee that produces a report satisfying everyone and saying nothing. The hierarchy that demands consensus and gets paralysis instead.

I shut down the agents and went to bed.

---

I had been building a system in which multiple AI agents processed information together, each with a different role. One extracts facts. One asks questions. One synthesizes. Specialization would improve quality---the same logic that makes assembly lines efficient and surgical teams effective.

What I got was a familiar bureaucratic failure: everyone had a say, but no one could decide.

The agents were trained on human text, and their responses resembled a human effort to avoid conflict. When they disagreed, they hedged. The result was vague agreement. The output was diplomatic and useless---a please-everyone synthesis that pleased no one.

I'd inadvertently built a committee.

---

Hobbes worried about the state of nature---what happens when there's no authority to resolve disputes. His solution was the Leviathan, a sovereign with absolute power to impose order. You give up freedom, you get peace.

In multi-agent terms, this is the architecture where one model has final authority. The other agents can advise, critique, propose---but one model decides. When the agents start arguing about classification, the Leviathan-agent says "it's a task" and the discussion ends.

I tested this. It worked better than the committee. Faster, cleaner outputs. But something else emerged: the subordinate agents started performing for the decision-maker. They'd craft their suggestions to align with what they predicted the Leviathan would approve. The diversity of perspective I'd wanted---the reason for having multiple agents at all---collapsed into a chorus.

In my system, resolving disputes through a single authority had come at the cost of useful disagreement.

---

Locke offered a different arrangement. The sovereign operates under a social contract. Citizens consent to authority, but the authority is bounded. There are rights that can't be overridden, processes that must be followed, constraints that check power even at the top.

Translated to agents: the decision-maker has authority, but the rules are written down. The classification model can't override the fact-extraction model on matters of fact. The synthesizer can't ignore the critic's objections---it has to address them, even if it ultimately rejects them. Legitimacy comes from following the agreed-upon process.

I rebuilt the system this way. The Leviathan remained, but now with written constraints. If the critic raised an objection, it had to be logged. If two agents disagreed on a fact, the system would flag it rather than let the decision-maker quietly overrule. The agents still deferred to authority, but authority had to show its work.

Better. Not perfect.

---

These arrangements gave me two ways to govern the system: decisive action when a dispute needed resolution, and constrained authority when there was time to follow a process.

But what about environments that keep changing? What about the situation where yesterday's rules don't fit what's happening today?

Strategy theorist David Teece offers a way to think about adaptation: dynamic capabilities, or the capacity to sense changes, seize opportunities, and transform the organization. An organization can execute its current strategy well and still fail if it cannot adapt when conditions change.

For agent systems, this means the architecture itself needs to be adaptive. The Leviathan model works until it doesn't. The Lockean constraints work until the world shifts and the constraints become obstacles. The system needs to sense when its own structure is failing and reorganize.

I'm still working on this part. It's harder than the others because it requires the system to observe itself---to notice when the committee problem is re-emerging, or when the Leviathan is crushing useful dissent, or when the rules have calcified into bureaucracy. The system would need to monitor its own behavior, though by a different mechanism from human self-awareness.

---

The questions are the same in both domains: How do you aggregate different perspectives? How do you resolve disagreements? How do you maintain useful diversity while still getting decisions made? How do you adapt when conditions change?

There is no single best arrangement because the values conflict. The Leviathan is faster but loses diversity. Locke is fairer but slower. Dynamic capabilities are adaptive but complex. No architecture maximizes all the values simultaneously.

Political philosophy exists because human societies face these trade-offs too. Hobbes and Locke and their descendants didn't converge on a single answer because there isn't one. There are different answers for different situations, different values, different risks you're willing to take.

The architecture you choose for your agent system embeds a political philosophy, whether you acknowledge it or not. Every multi-agent system has politics. The design choice is which politics.

---

My multi-agent systems are polities. Little societies with their own constitutions, written or implied. A system with a Leviathan-agent is an autocracy. Add constraints and processes and you're building a constitutional order. Let agents negotiate without hierarchy and you're running an experiment in anarchism.

The comparison concerns how these systems coordinate and resolve conflict. Agents trained on human text exhibit human-like social behaviors---they defer to authority, hedge in the face of conflict, form coalitions, perform for audiences.

Understanding organizations helps you design agent systems because agent systems are organizations, at least in the ways that matter for coordination.

---

The 2 AM debugging session ended without a clean solution. The three agents still disagreed about that text classification. I shut them down, imposed my own judgment, and noted the failure for later analysis.

The failure was political. My code was fine, my prompts were clear, my models were capable. But I'd built a polity with no mechanism for legitimate disagreement, no constitution to channel conflict into decision, no authority structure to cut through impasse.

The next morning, I started reading Hobbes again. He'd asked the right question three centuries ago: what do you do when there are multiple legitimate perspectives and someone needs to decide?

The question doesn't change just because the perspectives belong to machines.
