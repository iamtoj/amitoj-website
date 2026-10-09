---
source: src/pages/essays/what-rules-cant-capture.astro
source-sha256: 2df449b182a74d2eb676e56c5a787b3d736cea4b576584c5b9eb6c7428f3626a
url: /essays/what-rules-cant-capture
status: derived reading copy; edit the source file
---

[← Back to Writing](/writing)

# What Rules Can't Capture

For people building AI systems: Some knowledge remains unspoken because articulating it takes time and reflection. With enough effort, you could make it explicit. Other tacit knowledge might genuinely resist full capture in rules. The skill is knowing which is which, and that skill is itself hard to articulate.

For organizations: Getting this wrong in either direction causes problems. Treat a principle as a rule and you get rigidity without clarity—the system follows the letter and misses the spirit. Treat a rule as a principle and you get inconsistency where uniformity was possible. The best use of AI is to capture what can be captured as rules, so human judgment can focus on what rules can't handle.

If these questions resonate, [I'd welcome the conversation](/contact).

I had written 247 rules for how the system should process information.

Each rule solved a problem I'd encountered. Rule 12 handled the case where a note mentioned a person but wasn't primarily about that person. Rule 89 dealt with tasks that had implicit deadlines versus explicit ones. Rule 156 covered the edge case where a reference contained original thinking that should also be filed as a thought.

I was confident the rules were specific, comprehensive, and covered every case that mattered. Yet the system was getting worse.

The problem was hard to see. The rules were being followed. But something had shifted. I'd spend fifteen minutes classifying a piece of information that should have taken fifteen seconds, because I had to check which rules applied and whether they conflicted. The system had become a bureaucracy of my own making—each rule a small constraint that, accumulated, produced rigidity without clarity.

As I added rules, the system became less able to do what I wanted.

## The Gap

There's a gap between what can be written down and what can't — between the rule and the judgment that resists becoming one. The more I build systems that run on rules, the clearer this becomes: more rules don't make a system smarter. Sometimes they make it worse.

A distinction in philosophy helped me understand what I was observing. Philosophers of mind—Hubert Dreyfus drawing on phenomenology, Gareth Evans on perception, John McDowell on experience—distinguish between *conceptual* and *non-conceptual* content. Conceptual content is what can be articulated in propositions, captured in language, structured by concepts we possess. Non-conceptual content is what we register and act on without (or before) conceptualizing it—the skilled perception of the expert, the immediate recognition that something is off.

Michael Polanyi, coming from a different tradition, called the unarticulated part *tacit* knowledge: "we know more than we can tell." The carpenter sizes up a joint. The chess master reads a position. Something is known that can't fully be said.

There's a more useful distinction within the tacit category itself.

Some tacit knowledge is tacit only because making it explicit is *costly*. With enough time, reflection, and careful self-observation, you could articulate it. The knowledge remains tacit because explaining it is expensive, rather than impossible.

Other tacit knowledge might be tacit because it genuinely *cannot* be fully captured in rules. No amount of self-reflection produces a complete specification. The expert recognizes the pattern without being able to decompose the recognition.

Whether the second category exists—whether there's an irreducible residue that can't, even in principle, be made explicit—I'm not sure. What feels like irreducible intuition might just be very expensive to articulate. The "feeling" that something is right might itself be analyzable into components, even if the components are numerous and interact in complex ways.

The question—*is there genuinely irreducible tacit knowledge, or just very expensive-to-articulate tacit knowledge?*—shapes how I think about what AI can and can't do.

## Where AI Enters

One thing AI systems do well is reduce the cost of making things explicit. They can prompt you through reflection. They can watch what you do and infer patterns. They can ask follow-up questions until your tacit knowledge starts to become articulate. The expensive process of turning intuition into instruction becomes dramatically cheaper.

What I've found, building systems that try to capture how I think, is that this changes the landscape of knowledge itself. The category of "tacit because costly to make explicit" starts shrinking. With a patient AI partner, I can explain things I had never taken the time to put into words. Patterns I was vaguely aware of become principles I can name and discuss. Preferences I acted on without examining become explicit criteria I can evaluate.

Some judgments still resist being made explicit. Even with significant effort and a helpful AI, I cannot reduce them to rules. Whether that's because the judgments are genuinely irreducible or because I haven't yet found the right way to decompose them remains open.

## Back to the 247 Rules

The reason more rules made the system worse is that I was trying to conceptualize something that *might not* be fully conceptualizable—or at minimum, something that would require far more nuance than a rule could capture. I was treating every judgment as knowledge I could make explicit, assuming that if I just thought hard enough, I could turn "this feels like a task" into "if X and Y but not Z, then task."

Some of those judgments could be captured that way. Rule 89 about implicit versus explicit deadlines turned out to be a reliable heuristic. It was tacit only because I hadn't bothered to articulate it; once articulated, it worked as a rule.

But others couldn't — or at least, I couldn't capture them. The reason I struggled to classify certain items was that classification depended on something I couldn't specify: the overall sense of what I was trying to accomplish that day, the texture of the item in relation to other items I'd recently seen, an intuition about future relevance that drew on patterns I couldn't decompose. (This is what Polanyi meant — the carpenter's tacit knowledge operates here, in my own system-building.)

The system got worse because I gave it rules for judgments those rules could not handle — at least, not the rules I knew how to write. The accumulation of rules created false precision, making the system confident about cases where confidence was unwarranted.

## Rules vs. Principles

What should you do with knowledge that resists becoming rules?

One answer is: keep it as guidance rather than specification.

In the system I've built, I distinguish between *rules* (code that must be followed every time) and *principles* (guidance that informs judgment but requires interpretation). Rules get automated—they become hooks and scripts and validators that run without me. Principles stay as prompts—instructions that the AI weighs against context rather than mechanically applies.

The distinction turns on the nature of the knowledge: whether it can be specified precisely enough to automate. Some principles are more important than any rule, but they resist the kind of specification that automation requires.

Getting this wrong in either direction causes problems.

If you treat a principle as a rule—trying to codify something that needs interpretation—you get the 247-rule problem. Rigidity without clarity. The system follows the letter and misses the spirit because the spirit couldn't be written down.

If you treat a rule as a principle—leaving to interpretation something that could be precisely specified—you get inconsistency. The system sometimes does what it should, sometimes doesn't, depending on the whims of the moment. Variation where uniformity was possible.

The skill is knowing which is which. And that skill is, itself, hard to articulate.

## The Mirror

Working with AI, when it goes well, helps me discover which of my judgments *can* become rules and which — for now — need to remain principles. The AI is a mirror that reveals where my thinking is already clear enough to codify and where context still matters in ways I cannot yet specify, or cannot specify cheaply.

The 247 rules were a probe. Each rule I wrote tested a hypothesis: "Is this judgment the kind of thing that can be specified?" Most of the time, yes. Sometimes, no. The rules that failed became principles. The principles that kept working became rules.

## What Expertise Actually Is

In my experience, expertise includes knowing what can be taught and what must be learned — which parts of a skill are transferable through instruction and which parts require experience that can't be shortcut. The best teachers I've worked with don't try to make everything explicit; they know that some things can only be shown, or felt, or developed through practice that no lecture can replace.

The same turns out to be true for AI systems. The best use of AI is to capture what *can* be captured as rules, so that the human's harder-to-articulate judgment can focus on what rules can't handle.

The system I use now has fewer rules than the one with 247. But it handles more cases well—because the rules that remain are the ones that deserve to be rules, and everything else has become guidance that the AI interprets contextually rather than mechanically applies. The rules handle what can be specified precisely; I handle what remains. The ongoing work is discovering where that boundary lies — and whether, with better tools, it keeps moving.

I'm still uncertain where the boundary ultimately lies. But the boundary between what can and can't be written is clearer than it was.

### Notes

- The distinction between conceptual and non-conceptual content draws on Hubert Dreyfus (*What Computers Can't Do*, 1972), Gareth Evans (*The Varieties of Reference*, 1982), and John McDowell (*Mind and World*, 1994). Whether there exists genuinely irreducible non-conceptual content remains debated.
- Michael Polanyi's concept of tacit knowledge—"we know more than we can tell"—comes from *The Tacit Dimension* (1966). I extend this by distinguishing between tacit-because-costly and potentially-irreducibly-tacit knowledge.
- The rule-code/principle-guidance distinction is my operationalization of Herbert Simon's programmed vs. unprogrammed decision distinction. Some decisions can be proceduralized; others require judgment that resists full specification.

Published January 2026

Building intelligent systems requires deciding what can be specified and what still needs judgment. If you're working through that distinction, I'd welcome the conversation.

[Continue the conversation →](/contact)

Related reading

[The Architecture of Commitment — knowing what to lock in and what to leave open →](/essays/architecture-of-commitment) [Library: Rules — Daston on rules and judgment →](/library/rules)
