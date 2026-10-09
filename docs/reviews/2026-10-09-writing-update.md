# Amitoj website writing update — 9 October 2026

This revision improves the published writing on amitoj.co using the updated
`writeastoj` skill. Every public piece was edited individually and compared
with its existing published source. The original pages supply the arguments,
experiences, and commitments; the revision does not add personal history or
service promises.

The clean copy covers nine main pages, four essays, eight notes, the library
introduction, and 38 book reviews: 60 pages of writing. The `/essays` redirect
was reviewed and retained, making 61 public routes in the build.

The main changes explain necessary terms, connect fragments when the
connection carries an argument, and replace stock phrasing with the work
the sentence actually describes. Personal scenes, deliberate imagery,
first-person judgments, uncertainty, and meaningful longer sentences remain.
Essay descriptions agree across the home page, Writing, and essay metadata.

Independent review caught and corrected changes to the meaning of bounded
articulation, the roles in the multi-agent debate, the liquidity condition in
Strategic Time, and a distinction between an economic model and self-interest
itself. Breath now attributes its diagnosis and recommendations to Nestor.
A mistaken Wittgenstein link label now identifies the Daston book it opens.
The Beginning of Infinity review’s broken `/research` link now opens Work.
Claims that AI processes every possible connection were narrowed to the
comparison the personal case supports. The dot-pair count is described as
growing rapidly, rather than exponentially.

A live comparison exposed a date-formatting bug: a local build could display
a note one day before its publication date. The note page, update date, and
Writing index now format dates in UTC. Builds in New York and Honolulu produce
identical pages, preserving the dates on the published site.

Checks preserve routes apart from that repaired link, image sources, form fields and destination, page
structure and styles, biography, teaching schedule, coaching terms, dates,
figures, book identities, and credited quotations. The eight published note
sources were recovered from the production deployment, including two absent
from Git and three whose Git copies were older than the live versions.

The separate June research agenda is password protected. Its full text was
not available for a faithful edit, so it and its access controls are retained
unchanged. Private production files are reused through the authenticated
deployment service; they are not copied into the public Git repository.
The deployment also reuses the exact production dependency lock. The local
build uses the existing Git lock; the hosted build verifies the production
lock and retained private files together with the revised public source.

Existing active Markdown reading copies are refreshed from the built pages
and identify their owning source files. Historical and unpublished material
remains separate. The public source is versioned in the existing repository;
Draft notes are excluded both from Writing and from generated routes. Hosted
builds refuse a checkout missing the protected agenda or its middleware.
Baseline sources and review receipts are retained in the private project
record. A review supports source fidelity and consistency with the supplied
public samples; the owner's recognition of the voice remains the deciding
evidence.

Build, route, publication, and live-verification results are recorded in the
release receipt after completion. No contact form or email was sent.

The expanded M&T name follows the [program's official description](https://fisher.wharton.upenn.edu/about-us/).
