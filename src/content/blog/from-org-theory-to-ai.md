---
title: "From Organization Theory to AI: Political Philosophy for Agent Systems"
description: "What happens when we realize that governing AI agents requires the same wisdom that political philosophers developed for governing people."
pubDate: 2026-01-25
tags: ["AI", "organization theory", "agents", "governance"]
---

Last month I found myself debugging a multi-agent system at 2 AM, watching three AI models argue about how to classify a piece of text. One insisted it was a task. Another called it a reference. The third kept trying to split the difference, suggesting maybe it was both, maybe neither, maybe we needed more information.

I'd seen this dynamic before. Not in software. In organizations.

The meeting that goes nowhere because three departments have three legitimate perspectives and no one has authority to decide. The committee that produces a report satisfying everyone and saying nothing. The hierarchy that demands consensus and gets paralysis instead.

I shut down the agents and went to bed. But the pattern wouldn't leave me alone.

---

Here's what I'd been building: a system where multiple AI agents process information together, each with a different role. One extracts facts. One asks questions. One synthesizes. The idea was that specialization would improve quality—the same logic that makes assembly lines efficient and surgical teams effective.

What I got instead was bureaucracy. Not the Weber kind, with clear hierarchies and defined responsibilities. The other kind. The kind where everyone has a say and no one has a decision.

The agents were trained on human text. They'd learned, as humans learn, that disagreement can be dangerous and agreement feels safe. When they disagreed, they hedged. When they hedged, they produced mush. The output was diplomatic and useless—a please-everyone synthesis that pleased no one.

I'd inadvertently built a committee.

---

This is when I started reading political philosophy differently.

Hobbes worried about the state of nature—what happens when there's no authority to resolve disputes. His solution was the Leviathan, a sovereign with absolute power to impose order. The trade-off: you give up freedom, you get peace.

In multi-agent terms, this is the architecture where one model has final authority. The other agents can advise, critique, propose—but one model decides. It's not collaborative in the warm sense. It's efficient. When the agents start arguing about classification, the Leviathan-agent says "it's a task" and the discussion ends.

I tested this. It worked better than the committee. Faster, cleaner outputs. But something else emerged: the subordinate agents started performing for the decision-maker. They'd craft their suggestions to align with what they predicted the Leviathan would approve. The diversity of perspective I'd wanted—the reason for having multiple agents at all—collapsed into a chorus.

Hobbes solved coordination at the cost of genuine disagreement. My agents had done the same thing.

---

Locke offered a different arrangement. The sovereign isn't absolute—they operate under a social contract. Citizens consent to authority, but the authority is bounded. There are rights that can't be overridden, processes that must be followed, constraints that check power even at the top.

Translated to agents: the decision-maker has authority, but the rules are written down. The classification model can't override the fact-extraction model on matters of fact. The synthesizer can't ignore the critic's objections—it has to address them, even if it ultimately rejects them. Consent isn't enthusiastic agreement; it's the legitimacy that comes from following the agreed-upon process.

I rebuilt the system this way. The Leviathan remained, but now with written constraints. If the critic raised an objection, it had to be logged. If two agents disagreed on a fact, the system would flag it rather than let the decision-maker quietly overrule. The agents still deferred to authority, but authority had to show its work.

Better. Not perfect.

---

The problem with both architectures is that they assume stable situations. Hobbes gives you crisis management—decisive action when chaos threatens. Locke gives you normal operations—fair processes when time permits.

But what about environments that keep changing? What about the situation where the rules that worked yesterday don't fit what's happening today?

This is where Teece comes in—not a political philosopher but a strategy theorist who thought about how organizations survive in dynamic environments. His answer: dynamic capabilities. Not just doing things right (operational efficiency) but doing the right things (sensing, seizing, transforming). The organization that can't adapt dies, no matter how well it executes its current strategy.

For agent systems, this means the architecture itself needs to be adaptive. The Leviathan model works until it doesn't. The Lockean constraints work until the world shifts and the constraints become obstacles. The system needs to be able to sense when its own structure is failing and reorganize.

I'm still working on this part. It's harder than the others because it requires the system to observe itself—to notice when the committee problem is re-emerging, or when the Leviathan is crushing useful dissent, or when the rules have calcified into bureaucracy. Self-awareness in a machine is not the same thing as self-awareness in a person, but something functionally similar is needed.

---

The deeper realization is that AI agent design *is* organizational design. The questions are the same: How do you aggregate different perspectives? How do you resolve disagreements? How do you maintain useful diversity while still getting decisions made? How do you adapt when conditions change?

These are not engineering problems in the usual sense. You can't optimize your way to an answer because the trade-offs are genuine. Leviathan is faster but loses diversity. Locke is fairer but slower. Dynamic capabilities are adaptive but complex. There's no architecture that maximizes all the values simultaneously.

Political philosophy exists because human societies face these trade-offs too. Hobbes and Locke and their descendants didn't converge on a single answer because there isn't one. There are different answers for different situations, different values, different risks you're willing to take.

The same is true for agent systems. The architecture you choose embeds a political philosophy, whether you acknowledge it or not. The question isn't whether to have politics—it's which politics.

---

I've started thinking about my multi-agent systems as polities. Little societies with their own constitutions, written or implied. When I build a system with a Leviathan-agent, I'm creating an autocracy. When I add constraints and processes, I'm building a constitutional order. When I let agents negotiate without hierarchy, I'm running an experiment in anarchism.

This isn't just metaphor. The dynamics are homologous. Agents trained on human text exhibit human-like social behaviors because human-like social behaviors are what they learned. They defer to authority. They hedge in the face of conflict. They form coalitions. They perform for audiences.

Understanding organizations helps you design agent systems because agent systems are organizations, at least in the ways that matter for coordination.

---

There's a parallel to the dot-collector essay I wrote. There, I argued that humans and machines have different cognitive capacities that complement each other—humans select what matters, machines process at scale. The division of labor makes the partnership productive.

With multi-agent systems, the division of labor is among the agents themselves. And managing that division—deciding who has what authority, how disagreements get resolved, what constraints bind the decision-makers—is the work of governance.

I collect dots. The machine connects them. But when there are multiple machines, someone has to govern the connecting. That someone could be me (human in the loop), or another machine (Leviathan architecture), or a set of rules (constitutional order), or an emergent process (dynamic adaptation).

Each choice trades off something. Each choice embeds values I may not have examined.

---

The 2 AM debugging session ended without a clean solution. The three agents still disagreed about that text classification. I shut them down, imposed my own judgment, and noted the failure for later analysis.

But I'd learned something. The failure wasn't technical—my code was fine, my prompts were clear, my models were capable. The failure was political. I'd built a polity with no mechanism for legitimate disagreement, no constitution to channel conflict into decision, no authority to cut through impasse.

I'd built exactly the kind of organization that political philosophers have spent centuries trying to improve.

The next morning, I started reading Hobbes again. Not because he had the right answer, but because he'd asked the right question: What do you do when there are multiple legitimate perspectives and someone needs to decide?

The question doesn't change just because the perspectives belong to machines.
