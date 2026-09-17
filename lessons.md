# Lessons

Patterns worth carrying forward, recorded as they come up.

## Label a metric with what it measures, not what you wish it measured

**17 September 2026 — the check counter.**

The nav pill first read `323 people checked!`. It counts `INCR` on a single
shared Redis key, once per page mount, with no session or IP dedup — so a
refresh is another "person". The honest label is `323 checks`.

The tell: if you cannot state the unit without adding a caveat, the label is
wrong. "People" needs "well, roughly, ignoring refreshes"; "checks" needs
nothing.

This also removed a bug rather than just a wording problem. `1 people checked`
was reachable on the very first visit, and nobody had noticed because the
counter had never been live.

**Applies to:** any social-proof or usage number on this site. Vercel Analytics
holds the deduplicated version if a real "people" figure is ever needed.
