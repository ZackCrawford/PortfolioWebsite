# Album review website

A static site for personal album reviews. No build step, no framework, no
package manager. Open `reviews.html` in a browser and it runs. Hosted from
this folder (GitHub Pages compatible).

The source of truth for review content is a folder of Word documents. A Python
script parses them into a JS data file that the pages read.

---

## Run it

```bash
python scripts/parse_reviews.py reviews      # .docx files -> data/reviews-data.js
python scripts/fetch_covers.py               # download missing album art -> covers/
```

Run both from the repo root — the scripts write to `data/` and `covers/` relative
to the current directory, not to the script's own location.

Adding or editing one review doesn't need a full rescan. `--only` reparses just
the named file(s) and merges the result into the existing data file; every
other review already in it is carried over exactly as-is, untouched:

```bash
python scripts/parse_reviews.py reviews --only "Madvillainy Album Review.docx"
```

Both use only the Python standard library. No pip installs, no API keys.
After running either, hard-refresh the browser (Ctrl+F5) — browsers cache `.js`
aggressively.

To draft (never auto-send) an announcement email for a review, once it's in
`data/reviews-data.js`:

```bash
python scripts/draft_email.py <slug>
```

Needs `BUTTONDOWN_API_KEY` set in the environment - never commit the key
itself. See "Email notifications" below for the full picture.

To regenerate `feed.xml` after adding or editing a review:

```bash
python scripts/build_feed.py
```

---

## Files

### Generated — never edit by hand

| File | Notes |
|---|---|
| `data/reviews-data.js` | Rewritten from scratch on every parser run. Any manual edit is destroyed. ~4,400 lines for 28 reviews. |
| `covers/<slug>.jpg` | Downloaded art. `fetch_covers.py` skips any file that already exists, so manually-placed images always win. |
| `feed.xml` | RSS, rewritten from scratch by `build_feed.py`. Any manual edit is destroyed. |

### Hand-written data — the parser never touches these

| File | Notes |
|---|---|
| `data/about-data.js` | Encyclopedic background per album, keyed by slug. All 29 filled in. |
| `data/genre-overrides.json` | Per-album genre tab corrections, keyed by slug. Overrides pattern matching entirely. |
| `data/queue.js` | 107 albums planned for review. Shows as the "On deck" strip. |

### Code

| File | Notes |
|---|---|
| `scripts/parse_reviews.py` | Reads `.docx` as a zip + XML directly. **No pandoc** — that dependency was removed deliberately. |
| `scripts/fetch_covers.py` | iTunes Search API. Artist-constrained search first, then general, then title-only. |
| `scripts/draft_email.py` | Creates a Buttondown draft for one review by slug. Never sends — see "Email notifications" below. |
| `scripts/build_feed.py` | Generates `feed.xml` from `reviews-data.js`, newest `reviewed` date first. |
| `reviews.html` | Front page: genre tabs, featured + latest grids, On deck strip. |
| `review.html` | One template for every review. Reads `?album=<slug>`. |
| `all.html` | Browse page: 9 sorts, genre/score/decade/text filters. |
| `subscribe.html` | Email sign-up (all reviews or specific On Deck albums) and album requests. Reached via the mail icon in the header on the other pages. |
| `stats.html` | Score distribution, genre breakdown, and albums-by-decade, computed live from `reviews-data.js`. Reused `sc-bar`/`sc-*` classes from `score.js` for the score chart instead of a new palette. |
| `js/score.js` | **Shared** score colour tiers + `window.scoreClass()`. Load before anything that colours a score. |
| `js/search.js` | Fuzzy search. Self-injects its own styles. Needs a button with `data-search-toggle`. |
| `js/theme.js` | Light/dark toggle. Only wires up the button - see the Style section for how the theme itself is defined. Needs a button with `data-theme-toggle`. |

---

## Email notifications

Visitors sign up on `subscribe.html`, either for every new review or for
specific On Deck albums. There's no backend of ours involved — the sign-up
form posts straight to Buttondown, and the request-an-album box posts
straight to Formspree. Two placeholders in `subscribe.html` need real values
before either works: `YOUR_BUTTONDOWN_USERNAME` and `YOUR_FORMSPREE_ID`.

Buttondown tags subscribers as they sign up:
- `all-reviews` — wants every new review
- `album-<slug>` — wants just that one (slug matches the real review slug
  once it's written, since both use the same rule - see Conventions)

Requesting an album (the free-text box, separate from sign-up) records the
request via Formspree, then offers a popup asking for an email to be notified
when it's posted. If given, that also tags the person `album-<slug>`, but the
slug is generated from whatever they typed, not a queued title - if the
review's eventual title doesn't slugify to the same thing, that tag won't
match. Worth a manual check in Buttondown before sending, for a request that
didn't already exist in `queue.js` when they signed up.

Sending is **manual, by design**. `scripts/draft_email.py <slug>` creates a
draft in Buttondown via their API - it can't accidentally send anything,
since Buttondown defaults new emails to draft status. Open the draft
yourself, edit if you like, then pick the audience before sending: "Everyone"
or "Custom -> Tag" for `all-reviews` and/or `album-<slug>`. This step is
manual because Buttondown's API dropped tag-scoped sending in 2024 - the
dashboard's audience picker is the only reliable way to target just the
people who asked for a specific album.

Before using `draft_email.py`, set `SITE_URL` at the top of the file to the
site's real address, and set `BUTTONDOWN_API_KEY` in your environment (get
one from Buttondown's settings - never commit it).

---

## RSS feed

`feed.xml` is generated by `scripts/build_feed.py` from `data/reviews-data.js`,
one `<item>` per review, sorted by `reviewed` date (newest first, same field
the front-page "recently reviewed" sort uses). Re-run the script whenever
reviews change - nothing regenerates it automatically.

There's deliberately no visible RSS icon in the header - clicking one just
dumps raw XML on a visitor who has no idea what it means, and most sites don't
expose a feed that way for exactly that reason. Discovery is a `<link
rel="alternate" type="application/rss+xml">` in `<head>` instead: invisible on
the page, but every feed reader auto-detects it the moment someone pastes the
site's URL in. It's duplicated across all five pages - add a sixth and it
needs the tag too.

Like `draft_email.py`, it has a `SITE_URL` placeholder at the top that has to
be set to the site's real address before the `<link>`/`<guid>` URLs inside the
feed actually resolve to anything. The two constants aren't shared - update
both files if the URL changes.

---

## The scoring method

Each track scored out of 10. The album percentage is:

```
(sum of scored tracks + bonus points) / (number of SCORED tracks × 10)
```

Three things that are easy to get wrong:

1. **Unscored tracks are excluded from the denominator.** Interludes marked
   `N/A / N/A` or with a dash don't count. A 15-track album with 2 interludes
   is scored out of 130, not 150.
2. **Bonus points exist.** A track line ending `+ 1` (e.g. `N/A / N/A + 1`)
   adds to the raw total *without* raising the potential total.
3. **The adjustment is computed, never stored.** It is exactly
   `finalScore × 10 − percent`. The author picks the final score; the
   adjustment is derived from it. Don't read it from the document.

Track scores can exceed 10 (11, 12 seen). The review page flags these with a
star and an "over 10" pill.

---

## Conventions

**Slugs** are generated from the album title: lowercase, non-alphanumerics to
hyphens. `Madvillainy` → `madvillainy`. Everything keys off this — cover
filenames, `about-data.js`, `genre-overrides.json`, `review.html?album=`.

**Genres are multi-valued.** Each review has a `tabs` array; an album appears
under every genre it matches. `tab` is the first entry, used for the card label
and the review page's genre link. Rule order in `TAB_RULES` matters — Hip-hop
before Alternative before Rock, because "alternative hip hop" and "alternative
rock" both contain overlapping words.

**Score colour tiers** live only in `score.js`. Six bands from grey through
indigo, violet, magenta, to diamond blue at 9.7+. Two forms:
- `.sc-pill` — filled badge with glow. Used in search results and `all.html`.
- `.sc-text` — bare coloured number, **no glow**. Used on front-page cards.
  The glow was removed here because a blurred shadow behind small text reads
  as a smudged box.

**Card badges** (`reviews.html` only, in `flagsFor()`) stack independently -
a card can carry more than one at once:
- `Top-rated` — `finalScore >= 9.0`. No year requirement.
- `Best new` — released in the current year (`yearOf(r) === THIS_YEAR`) *and*
  `finalScore >= 8.5`. Both conditions required - a great album from a past
  year doesn't count, and a mediocre one from this year doesn't either.
- `Most recent review` — exactly one album, whichever has the latest
  `reviewed` date. Ties (common - see the `reviewed` gotcha above) go to
  whichever comes first in `REVIEWS` array order, which is sorted by artist.

`all.html`'s "Best new album" filter chip uses the same rule as `Best new`
above (`state.best`) - keep the two in sync if either changes.

---

## Gotchas

- **Re-run the parser after changing genre rules or overrides.** Tabs are baked
  into `reviews-data.js`; nothing changes until you regenerate.
- **`.json` won't load over `file://`** due to CORS. That's why the data files
  are `.js` with a `const` — the site works by double-clicking the HTML.
- **No localStorage/sessionStorage**, with one deliberate exception: the light/
  dark theme toggle uses `sessionStorage` (see `js/theme.js`), wrapped in
  try/catch so it degrades to the dark default rather than throwing in
  contexts where storage is blocked. Don't add storage anywhere else - this
  was a conscious tradeoff for that one feature, not a lifted restriction.
- **`reviewed` dates are approximate.** The `.docx` files have no Word
  metadata (Google Docs exports), so the parser falls back to file mtime.
  Bulk-copying the folder resets them and breaks "recently reviewed" sort.
- **The parser audits, it doesn't block.** `[check]` lines are advisory —
  the data file is written regardless. Flags cover typos in best/worst lists,
  track count mismatches, unfilled template placeholders, and score
  contradictions between the track list and the best/worst tables.

---

## Document format the parser expects

```
ALBUM REVIEW
<Album Title>
<Artist>  •  <Year>  •  <Genre>  •  <N> Tracks
Album Score: 8.4 / 10     Track Average: 81.54 % (106 / 130 pts)

Track by Track
    1. Track Name:  8 / 10
    - note text
    4. Interlude:  N/A / N/A
    - note text
    10. Bonus Interlude:  N/A / N/A + 1
    - note text

The Tally            (table: raw / adjustment / official rating)
Best & Worst         (table: two columns, 3 entries each)
Final Words          (prose)
```

Section headings are matched loosely (case and punctuation insensitive). Track
lines accept `:`, `-`, or a tab before the score. If the "Track by Track"
heading is missing entirely, the parser scans the whole document as a fallback
and warns.

---

## Style

Dark theme, royal purple accent. Fonts: Bricolage Grotesque (headings, artist
names), Newsreader (album titles, scores, prose), Instrument Sans (UI).
CSS variables at the top of each HTML file — `--paper`, `--haze`, `--line`,
`--violet`, `--violet-deep`, `--ink`, `--muted`.

Album covers are square, `object-fit: cover`, inside a 2px purple outlined box.
Missing covers remove the `<img>` via `onerror` and leave the outline showing —
that's intentional, not a bug.

**Light theme** is dark's opposite number, not a separate design. Same six
variables, overridden under a `:root[data-theme="light"]` block placed right
after `:root{}` in the `<style>` of every page - `--violet` stays identical in
both themes; only `--paper`, `--haze`, `--line`, `--violet-deep`, `--ink` and
`--muted` change. `js/theme.js` only toggles the `data-theme` attribute (and
remembers it in `sessionStorage` - see the storage gotcha below); the actual
colors live in that CSS block, duplicated across `reviews.html`, `review.html`,
`all.html`, `subscribe.html` and `stats.html`. Change the palette in one, change
it in all five.

A handful of colors are hardcoded hex rather than variables - mostly
decorative borders (`.cover`'s purple outline, `--outline`) that read fine on
either background and were left alone - but a few are foreground *text* tuned
only for the dark background (e.g. review.html's over-10 star/pill colors,
`.hint.error`) and need their own `:root[data-theme="light"] ...{color:...}`
override next to the dark rule. If you add a new hardcoded text color, check
it against white too, not just black.

Every page sets its `data-theme` attribute via a tiny inline `<script>` at the
very top of `<head>`, before the `<style>` block - this runs before first
paint, so there's no flash of the wrong theme. Don't move it after the
stylesheet or defer it.

---

## Motion & glass

A "Liquid Glass"-style pass sits on top of the base design - frosted panels,
a drifting ambient glow, and a handful of interactive touches. All of it is
duplicated across every page's own `<style>`/`<script>`, same as the theme
palette - change one, change all five (`all.html` has no footer/track list,
so a couple of pieces don't apply there).

**Ambient background** (`.bg-glow`) is a fixed, oversized (160%) layer behind
everything, `z-index:-1`, holding a fine SVG noise texture plus three radial
gradients, with `filter:blur(50px)` for softness. It orbits slowly via
`@keyframes bg-drift` - twelve evenly-spaced points tracing an ellipse, not a
handful of far-apart stops, because interpolating between only 2-3 points
made it visibly jerk at each direction change. `body` itself stays a flat
`var(--paper)` - the glow is a separate element specifically so it can be
transform-animated without fighting body's own background.

**Glass panels** (stat tiles, chart cards, the request modal, the tab
indicator, score pills) all use the same recipe: a translucent background
+ `backdrop-filter: blur() saturate()` + `box-shadow: inset 0 1px 0 rgba(255,255,255,…)`
for a top-edge highlight. This *only* reads as glass because `.bg-glow` gives
it something with texture to blur - backdrop-filter on a flat color is a
no-op, which is why the noise layer exists at all, not just the gradients.

**Sticky footer**: `body{min-height:100vh;display:flex;flex-direction:column}`
plus `footer{margin-top:auto}`, on every page that has a footer. Without it,
a page shorter than the viewport (e.g. `subscribe.html`) leaves the footer
floating above the bottom edge instead of flush with it.

**Genre tab switching** (`reviews.html` only) is two effects layered
together, both plain CSS/JS - no View Transitions API. It was tried first and
silently failed to animate for unknown reasons even on a fully-current
Chromium build (both cross-document `@view-transition{navigation:auto}` and
same-document `document.startViewTransition()` produced zero visible effect,
with no thrown error to debug from) - if revisiting that API, budget time to
figure out *why* it didn't fire before relying on it again.
- `.tab-indicator` is a real element positioned via JS (`moveTabIndicator()`,
  using `offsetLeft/offsetTop/offsetWidth/offsetHeight`) behind whichever tab
  is active, animated with a plain CSS `transition` on `transform`/`width`/
  `height`. The active tab's own background goes transparent so the
  indicator shows through it.
- `#tab-content` (wraps the featured/latest grids and the load-more button,
  but *not* the On Deck strip) slides via toggled classes
  (`tc-out-fwd`/`tc-out-back` then `tc-in-fwd`/`tc-in-back`) with a manual
  `setTimeout` swap in between, not a single CSS transition - `render()` has
  to actually run mid-animation to swap the content. Direction is decided by
  comparing the clicked genre's index in `GENRES` against the previous one.

**Cover tilt**: a cursor-driven 3D tilt on album art (`reviews.html` and
`all.html`), delegated via a single `mousemove` listener on `document` rather
than per-card listeners, specifically so it keeps working after `render()`/
`apply()` replace the grid's DOM on every genre switch, sort, or filter
change without needing to re-attach anything.

**Scroll-reveal**: cards start at `opacity:0`, and an `IntersectionObserver`
toggles a `.in-view` class every time a card crosses the viewport edge in
either direction (not a one-shot reveal - scrolling back up hides them again
so scrolling back down re-plays it). The score number's count-up
(`animateScore()`, `reviews.html` only) is driven by the same observer
callback, but starts on its own ~550ms delay - counting during the card's own
fade-in made the number essentially done by the time the card was legible
enough to read it.

All of the above respects `prefers-reduced-motion: reduce`: CSS transitions/
animations are already caught by the site-wide `*{transition:none!important;
animation:none!important}` rule, but anything driven by inline JS styles
(cover tilt, the theme-toggle icon morph) checks `matchMedia(...)` itself
before running, since that global CSS rule can't reach into JS-set inline
styles.
