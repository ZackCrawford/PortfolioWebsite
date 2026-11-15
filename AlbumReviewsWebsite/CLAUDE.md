# Album review website

A static site for personal album reviews, served at `zackcrawford.com/albums`
as part of the portfolio's single Vercel project. No build step, no framework,
no package manager.

The source of truth for review content is a folder of Word documents. A Python
script parses them into a JS data file that the pages read.

---

## Run it

Run every script from inside `AlbumReviewsWebsite/` - they read and write
`data/`, `covers/`, `review/` and `feed.xml` relative to the current directory.
All are Python standard library only: no pip installs, no API keys (except
`draft_email.py`, below).

```bash
python scripts/parse_reviews.py reviews      # .docx files -> data/reviews-data.js
python scripts/fetch_covers.py               # download missing album art -> covers/
python scripts/build_pages.py                # per-review pages + sitemap review URLs
python scripts/build_feed.py                 # feed.xml
```

**After adding a review:** run all four, in that order. **After editing
`review.html`:** run `build_pages.py` (the per-review pages are copies of it).

Adding or editing one review doesn't need a full rescan. `--only` reparses just
the named file(s) and merges the result into the existing data file:

```bash
python scripts/parse_reviews.py reviews --only "Madvillainy Album Review.docx"
```

To draft (never auto-send) an announcement email for a review:

```bash
python scripts/draft_email.py <slug>
```

Needs `BUTTONDOWN_API_KEY` set in the environment - never commit the key.

To preview locally with the real URLs, run `python3 serve.py` from the repo
root (it applies the `vercel.json` rewrites; plain `http.server` can't).

---

## Files

### Generated - never edit by hand

| File | Notes |
|---|---|
| `data/reviews-data.js` | Rewritten from scratch on every parser run. |
| `covers/<slug>.jpg` | Downloaded art. `fetch_covers.py` skips files that exist, so manually placed images win. |
| `review/<slug>.html` | One static page per review, written by `build_pages.py` from `review.html`, served at `/albums/review/<slug>` (rewrite in `vercel.json`). Its `<head>` carries the album's title, description, cover as `og:image`, and schema.org `Review` JSON-LD, so link previews and search engines see the real review without running JS. |
| `feed.xml` | RSS, rewritten by `build_feed.py`. |

### Hand-written data - no script touches these

| File | Notes |
|---|---|
| `data/about-data.js` | Encyclopedic background per album, keyed by slug. |
| `data/genre-overrides.json` | Per-album genre tab corrections, keyed by slug. Overrides pattern matching entirely. |
| `data/queue.js` | Albums planned for review ("On deck"), each with artist, title and release year. Delete a line once its review is up. |
| `data/album-themes.js` | Per-album colours for the review page (see "Review page colours"). Goodbye & Good Riddance and Swagger are pinned by hand. |

### Code

| File | Notes |
|---|---|
| `reviews.html` | Front page: genre tabs, two featured cards, latest grid (always whole rows, "More" adds rows), slim On deck bar. Content is 1180px wide so the latest reviews show without scrolling. |
| `review.html` | Template for every review; the static pages are copies. Reads `window.REVIEW_SLUG` or `?album=<slug>`. |
| `all.html` | Browse: 9 sorts, genre/score/decade/text filters, Random. |
| `stats.html` | One scrolling page computed from `reviews-data.js`: headline numbers; cover chart (each album's cover stacked in its whole-score column, tier-coloured baseline, hover/focus tooltip); genre and decade bar lists with album count and average (genre rows open Browse filtered); highest/lowest five. |
| `subscribe.html` | Email sign-up (every review, or specific On deck albums via a searchable checklist) and album requests (`#request`). |
| `css/liner.css` | Shared palette + accent-heading rule for the four list pages, loaded after each page's own `<style>`. |
| `js/score.js` | **Shared** score colour tiers + `window.scoreClass()`. Load before anything that colours a score. |
| `js/search.js` | Header fuzzy search over reviews. Self-injects its styles. Needs a button with `data-search-toggle`. |
| `js/ondeck-search.js` | Forgiving search over the queue: case, accents and punctuation ignored, `$` = s, `&` = and, partial words, small typos, year or decade. Strong matches crowd out typo-level near misses; if nothing matches every word, the closest come back marked `loose`. |
| `js/album-theme.js` | Per-album colour engine: `themeFromPixels()`, `applyTheme()`, `themeFromImage()`. |
| `scripts/parse_reviews.py` | Reads `.docx` as zip + XML directly (no pandoc). |
| `scripts/fetch_covers.py` | iTunes Search API: artist-constrained search, then general, then title-only. |
| `scripts/build_pages.py` | Writes `review/<slug>.html` and refreshes the review URLs in `../sitemap.xml`. |
| `scripts/build_feed.py` | Generates `feed.xml`, newest `reviewed` date first. |
| `scripts/draft_email.py` | Creates a Buttondown draft for one review. Never sends. |

---

## Look and feel

**List pages** (front, browse, stats, subscribe) share a "liner notes" look:
warm black, off-white type, one vermilion accent, solid panels, 3px corners,
square covers; the album art supplies the colour. `css/liner.css` owns the
palette. The variable names `--violet` / `--violet-deep` are historical; read
them as "accent". Section headings and small labels are in the accent colour.
Deliberately different from the portfolio front page.

**Score tiers** (`js/score.js`) use the standard review-site progression:
red (< 5.5) -> orange -> yellow -> light green -> green (8.8+), with a solid
green label for 9.7+. `.sc-pill` is the badge (search, browse, stats lists),
`.sc-text` the bare number (front-page cards), `.sc-bar` the meter fill.

**Fonts:** Bricolage Grotesque (headings, artist names), Newsreader (album
titles, scores, prose), Instrument Sans (UI).

**Copy is minimal.** Titles, labels and buttons only; no taglines or
explanatory sentences under headings.

**Light mode is parked.** The toggle and its CSS were removed until the site is
finished; the old `js/theme.js` is in git history. The review page still
supports a hand-set light album theme (see below).

---

## Review page colours

Every review page is coloured from its album. `data/album-themes.js` holds one
line per album:

- `surface` - the cover's main colour. Grey/black = neutral page; a real
  colour = page tinted with it (kept vivid, never muddy). Dark grey -> black
  page; light grey ("silver", e.g. Madvillainy) -> graphite page.
- `accent` - scores, meters, links, cover outline. Always kept bright.
- `glow` - background light colours.
- `mode` - `"dark"`. **White is never a page colour** (too bright): near-white
  areas are skipped and a white cover takes its next colour (Rebel -> black,
  Crybaby -> graphite, Don't Be Dumb -> red). A hand-set `"light"` still works
  and uses a soft paper tone, never pure white.

`js/album-theme.js` is the single implementation. `themeFromPixels()` picks
the surface by area (k-means), letting a colour family win when its shades add
up (camo greens, sepia), and finds the accent from small vivid patches on their
own (Madvillainy's orange corner). `applyTheme()` derives every shade with
contrast checks, sets `--a-*` / `--g*` and the `themed` class on `<html>`; the
`:root.themed` CSS block maps those onto the page palette. The animated Vanta
cells follow the page colour (grey on neutral pages).

The theme is applied by a script in `<head>`, before the first paint, and the
page's built-in defaults are neutral, so nothing flashes. An album missing from
`album-themes.js` is themed from its cover in the browser once the image loads
(browsers that block canvas reads keep the neutral default). To seed a new
line, run `themeFromPixels()` over the cover the same way; keep pinned lines.

**Reading:** one centred 820px column; the review body sits on a near-solid
panel; Vanta at 40% opacity; prose uses `text-wrap: pretty`. A neutral
placeholder outline shows until the review renders. Reading-progress bar under
the masthead, back-to-top button after a screen of scrolling.

**Back button** returns to the exact album page you came from via
`history.back()` (keeps genre tab, filters, scroll) and falls back to `/albums`.

---

## Behaviour worth knowing

- **Back keeps your place.** The front page's "More" count and every Browse
  filter are saved in the page's own history entry (`history.replaceState`,
  not browser storage), so Back from a review redraws the same list and the
  browser restores the scroll position. Writes are wrapped in try/catch
  because Safari throttles rapid history writes.
- **Cards reveal once.** Cards rise in (and front-page scores count up) the
  first time they scroll into view, then stay. Albums already seen (a genre
  switch, "More" or a filter redraws the grid) and cards above the screen get
  `.no-anim` and appear instantly. The count-up waits ~550ms so it plays after
  the card is legible.
- **On deck** (front page) is one slim bar: count, search, "See all". A
  spinner shows while typing; results appear ~1.2s after the last keystroke
  (Enter = now, Esc clears) in a small scrolling panel. No match links to
  `/albums/subscribe#request`. The subscribe checklist filters as you type
  with the same matcher; ticked albums stay ticked while hidden.
- **Genre tabs** (`reviews.html`): `.tab-indicator` is a real element moved
  behind the active tab by `moveTabIndicator()`; `#tab-content` slides via
  toggled classes with a `setTimeout` swap so `render()` can run mid-animation.
  (`document.startViewTransition()` was tried for this and silently did
  nothing in Chromium; budget time to find out why before relying on it.)
- **Cover tilt** on `reviews.html` and `all.html` uses one delegated
  `mousemove` listener so it survives grid re-renders.
- **Sticky footer:** `body` is a flex column with `footer{margin-top:auto}`.
  Side effect: a direct child centred with `margin:0 auto` shrinks to its
  content, so full-width wrappers need `width:100%` (see `subscribe.html`).
- **Reduced motion** is respected everywhere; JS-driven inline effects check
  `matchMedia` themselves since the global CSS rule can't reach them.
- **Review URLs** are `/albums/review/<slug>` everywhere (cards, search,
  random, feed, emails, sitemap). `review.html?album=<slug>` still works.

---

## Email notifications

Sign-up posts straight to Buttondown and album requests to Formspree; no
backend of ours. Two placeholders in `subscribe.html` need real values before
either works: `YOUR_BUTTONDOWN_USERNAME` and `YOUR_FORMSPREE_ID` (both services
must also be allowed in the CSP in `../vercel.json`).

Buttondown tags subscribers: `all-reviews` (every review) or `album-<slug>`
(one album; the slug matches the eventual review's slug, same rule). A request
made through the free-text box tags `album-<slug>` from whatever was typed, so
check that tag in Buttondown before sending for an album that wasn't queued.

Sending is **manual, by design**. `draft_email.py <slug>` only creates a draft;
pick the audience in Buttondown's dashboard ("Everyone" or "Custom -> Tag"),
because their API dropped tag-scoped sending in 2024. `SITE_URL` in
`draft_email.py` and `build_feed.py` is `https://zackcrawford.com/albums`;
the two constants aren't shared, so update both if the URL changes.

---

## RSS feed

`feed.xml` has one `<item>` per review, newest `reviewed` date first. Nothing
regenerates it automatically. There's deliberately no visible RSS icon; a
`<link rel="alternate" type="application/rss+xml">` in each page's `<head>`
lets feed readers auto-detect it. A new page needs that tag too.

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
hyphens. `Madvillainy` -> `madvillainy`. Everything keys off this: cover
filenames, `about-data.js`, `genre-overrides.json`, `album-themes.js`, the
review URL.

**Genres are multi-valued.** Each review has a `tabs` array; an album appears
under every genre it matches. `tab` is the first entry, used for the card label
and the review page's genre link. Rule order in `TAB_RULES` matters: Hip-hop
before Alternative before Rock, because "alternative hip hop" and "alternative
rock" share words.

**Card badges** (`reviews.html`, `flagsFor()`) stack independently:
- `Top-rated` - `finalScore >= 9.0`.
- `Best new` - released this year *and* `finalScore >= 8.5`.
- `Most recent review` - the single latest `reviewed` date (ties go to the
  first in `REVIEWS` order, which is sorted by artist).

`all.html`'s "Best new album" chip uses the same rule as `Best new` - keep them
in sync.

---

## Gotchas

- **Re-run the parser after changing genre rules or overrides.** Tabs are baked
  into `reviews-data.js`.
- **`.json` won't load over `file://`** (CORS), which is why data files are
  `.js` with a `const`.
- **No localStorage/sessionStorage.** Page state that must survive Back lives
  in `history.state`.
- **`reviewed` dates are approximate.** The `.docx` files (Google Docs exports)
  have no Word metadata, so the parser falls back to file mtime. Bulk-copying
  the folder resets them and breaks "recently reviewed".
- **The parser audits, it doesn't block.** `[check]` lines are advisory.
- **Per-review pages are copies.** Editing `review.html` without re-running
  `build_pages.py` leaves the live `/albums/review/<slug>` pages on the old
  version.

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
