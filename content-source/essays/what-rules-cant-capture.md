---
title: "What Rules Can't Capture"
description: "The more rules I wrote, the less the system understood what I actually wanted. Some knowledge resists becoming rules—and that's where the interesting work begins."
pubDate: 2026-01
tags: ["AI", "systems", "tacit knowledge", "design"]
---

I had written 247 rules for how the system should process information.

Each rule solved a problem I'd encountered. Rule 12 handled the case where a note mentioned a person but wasn't primarily about that person. Rule 89 dealt with tasks that had implicit deadlines versus explicit ones. Rule 156 covered the edge case where a reference contained original thinking that should also be filed as a thought.

The rules were specific. They were comprehensive. They were, I was confident, covering every case that mattered.

And the system was getting worse.

It wasn't obvious. The rules were being followed. But something had shifted. I'd spend fifteen minutes classifying a piece of information that should have taken fifteen seconds, because I had to check which rules applied and whether they conflicted. The system had become a bureaucracy of my own making—each rule a small constraint that, accumulated, produced rigidity without clarity.

The more rules I wrote, the less the system understood what I actually wanted.

## The Gap

There's a gap between what can be written down and what can't — between the rule and the judgment that resists becoming one. The more I build systems that run on rules, the clearer this becomes: more rules don't make a system smarter. Sometimes they make it worse.

There's a distinction in philosophy that helps frame what I was observing. Philosophers of mind—Hubert Dreyfus drawing on phenomenology, Gareth Evans on perception, John McDowell on experience—distinguish between _conceptual_ and _non-conceptual_ content. Conceptual content is what can be articulated in propositions, captured in language, structured by concepts we possess. Non-conceptual content is what we register and act on without (or before) conceptualizing it—the skilled perception of the expert, the immediate recognition that something is off.

Michael Polanyi, coming from a different tradition, called the unarticulated part _tacit_ knowledge: "we know more than we can tell." The carpenter sizes up a joint. The chess master reads a position. Something is known that can't fully be said.

The standard framing treats this as a binary: knowledge is either explicit (articulable) or tacit (not). But I've started thinking there's a more useful distinction within the tacit category itself.

Some tacit knowledge is tacit only because making it explicit is _costly_. With enough time, reflection, and careful self-observation, you could articulate it. The knowledge is tacit because explication is expensive, rather than impossible.

Other tacit knowledge might be tacit because it genuinely _cannot_ be fully captured in rules. No amount of self-reflection produces a complete specification. The expert recognizes the pattern without being able to decompose the recognition.

Whether the second category exists—whether there's an irreducible residue that can't, even in principle, be made explicit—I'm not sure. What feels like irreducible intuition might just be very expensive to articulate. The "feeling" that something is right might itself be analyzable into components, even if the components are numerous and interact in complex ways.

The question—_is there genuinely irreducible tacit knowledge, or just very expensive-to-articulate tacit knowledge?_—shapes how I think about what AI can and can't do.

## Where AI Enters

One thing AI systems do well is reduce the cost of making things explicit. They can prompt you through reflection. They can watch what you do and infer patterns. They can ask follow-up questions until your tacit knowledge starts to become articulate. The expensive process of turning intuition into instruction becomes dramatically cheaper.

What I've found, building systems that try to capture how I think, is that this changes the landscape of knowledge itself. The category of "tacit because costly to make explicit" starts shrinking. With a patient AI partner, I can articulate things I never bothered to articulate before. Patterns I was vaguely aware of become principles I can name and discuss. Preferences I acted on without examining become explicit criteria I can evaluate.

But something still resists. Some judgments I make that I cannot, even with significant effort and a helpful AI, reduce to rules. Whether that's because the judgments are genuinely irreducible or because I haven't yet found the right way to decompose them remains open.

## Back to the 247 Rules

The reason more rules made the system worse is that I was trying to conceptualize something that _might not_ be fully conceptualizable—or at minimum, something that would require far more nuance than a rule could capture. I was treating every judgment as explicitable tacit knowledge, assuming that if I just thought hard enough, I could turn "this feels like a task" into "if X and Y but not Z, then task."

Some of those judgments could be captured that way. Rule 89 about implicit versus explicit deadlines turned out to be a reliable heuristic. It was tacit only because I hadn't bothered to articulate it; once articulated, it worked as a rule.

But others couldn't—or at least, I couldn't capture them. The reason I struggled to classify certain items was that classification depended on something I couldn't specify: the overall sense of what I was trying to accomplish that day, the texture of the item in relation to other items I'd recently seen, an intuition about future relevance that drew on patterns I couldn't decompose.

The system got worse because I was feeding it rules to handle judgments that couldn't be rule-handled—at least by the rules I knew how to write. The accumulation of rules created false precision, making the system confident about cases where confidence was unwarranted.

## Rules vs. Principles

What should you do with knowledge that resists becoming rules?

One answer is: keep it as guidance rather than specification.

In the system I've built, I distinguish between _rules_ (code that must be followed every time) and _principles_ (guidance that informs judgment but requires interpretation). Rules get automated—they become hooks and scripts and validators that run without me. Principles stay as prompts—instructions that the AI weighs against context rather than mechanically applies.

The distinction isn't about importance. Some principles are more important than any rule. The distinction is about the nature of the knowledge: Can this be specified precisely enough to automate? Or does it require the kind of judgment that—for now, at least—resists full specification?

Getting this wrong in either direction causes problems.

If you treat a principle as a rule—trying to codify something that needs interpretation—you get the 247-rule problem. Rigidity without clarity. The system follows the letter and misses the spirit because the spirit couldn't be written down.

If you treat a rule as a principle—leaving to interpretation something that could be precisely specified—you get inconsistency. The system sometimes does what it should, sometimes doesn't, depending on the whims of the moment. Variation where uniformity was possible.

The skill is knowing which is which. And that skill is, itself, hard to articulate.

## The Mirror

The value of working with AI, when it works well, is that working with the AI helps me discover which of my judgments _can_ become rules and which—for now—need to remain principles. The AI is a mirror that reveals where my thinking is already clear enough to codify and where it remains irreducibly (or expensively) contextual.

The 247 rules weren't a waste. They were a probe. Each rule I wrote tested a hypothesis: "Is this judgment the kind of thing that can be specified?" Most of the time, yes. Sometimes, no. The rules that failed became principles. The principles that kept working became rules.

## What Expertise Actually Is

Experts know what can be taught and what must be learned. They know which parts of their skill are transferable through instruction and which parts require experience that can't be shortcut. Good teachers don't try to make everything explicit—they know that some things can only be shown, or felt, or developed through practice that no lecture can replace.

The same turns out to be true for AI systems. The best use of AI is to capture what _can_ be captured as rules, so that the human's harder-to-articulate judgment can focus on what rules can't handle.

This is a partnership. The rules handle the rule-handleable; the human handles what remains. And part of the ongoing work is discovering, again and again, where that boundary lies—and whether the boundary is fixed or whether, with better tools, it keeps moving.

The system I use now has fewer rules than the one with 247. But it handles more cases well—because the rules that remain are the ones that deserve to be rules, and everything else has become guidance that the AI interprets contextually rather than mechanically applies.

The boundary between what can and can't be written is clearer than it was.

That clarity is its own kind of progress—even if I'm still uncertain where the boundary ultimately lies.

---

## Notes

1. The distinction between conceptual and non-conceptual content draws on Hubert Dreyfus (_What Computers Can't Do_, 1972), Gareth Evans (_The Varieties of Reference_, 1982), and John McDowell (_Mind and World_, 1994). Whether there exists genuinely irreducible non-conceptual content remains debated.

2. Michael Polanyi's concept of tacit knowledge—"we know more than we can tell"—comes from _The Tacit Dimension_ (1966). I extend this by distinguishing between tacit-because-costly and potentially-irreducibly-tacit knowledge.

3. The rule-code/principle-guidance distinction is my operationalization of Herbert Simon's programmed vs. unprogrammed decision distinction. Some decisions can be proceduralized; others require judgment that resists full specification.
