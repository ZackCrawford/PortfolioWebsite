<div align="center">

# Zack Crawford - Portfolio

*A static, no-framework portfolio site hosting a resume and two projects,
deployed as a single Vercel site with path-based routing.*

</div>

---

Everything here is plain HTML/CSS/JS - no build step, no bundler, no
framework. Each project lives in its own top-level folder and can be opened
and run independently; `vercel.json` at the repo root stitches them
together into one deployed site.

## What's here

| Path | What it is |
|---|---|
| `/` | **Portfolio** - resume, contact links, and project cards |
| `/albums` | **Album Reviews** - a personal album-review site: scoring, genre browsing, fuzzy search, RSS, email sign-up |
| `/picoctf` | **picoCTF Solves** - browsable write-ups for picoCTF challenges, pulled live from a separate GitHub repo of Markdown solves |

## Folders

```
vercel.json                  routes "/", "/albums", "/picoctf" to the folders below

MainPortfolioPage/           the site root - resume.pdf + resume.html viewer, project cards
AlbumReviewsWebsite/         the album review site (technical details below, and in its own CLAUDE.md)
picoCTFSolvesWebsite/        the picoCTF write-up site
```

Each project folder is self-contained: its own pages, its own `data/`,
its own `scripts/` for anything that needs regenerating. Nothing is shared
between them except the routing in `vercel.json`.

## Deployment

The whole repo is one Vercel project. `vercel.json` rewrites map clean
URLs to each folder's real files - for example `/albums/reviews.html` is
served at the on-disk path `AlbumReviewsWebsite/reviews.html`, so every
internal link inside that folder just works without any extra rewrites.
Pushing to `main` redeploys automatically.

## Regenerating data

Both projects that pull from external sources have a small Python script
(standard library only, no installs) to regenerate their data file. Run
each from inside its own project folder - they write to `data/` relative
to the current directory:

```bash
# from AlbumReviewsWebsite/ - parses reviews/*.docx into data/reviews-data.js
python scripts/parse_reviews.py reviews

# from picoCTFSolvesWebsite/ - pulls every write-up from github.com/ZackCrawford/picoCTF-Solves
python scripts/parse_picoctf.py
```

See `AlbumReviewsWebsite/CLAUDE.md` for that project's full internal
conventions - slug rules, the document format its parser expects, styling
variables, and known gotchas.

---

<div align="center">

## Album Reviews

*Track-by-track scores, genre browsing, and fuzzy search for a personal album review collection.*

</div>

Static - no framework, no build step, no server. Open
[`AlbumReviewsWebsite/reviews.html`](AlbumReviewsWebsite/reviews.html) in a
browser and it runs. The source of truth is a folder of Word documents; a
Python script parses them into the JS data the pages read.

### Features

- **Track-by-track scoring** - every song scored out of 10, rolled up into a final album percentage and rating
- **Genre tabs** - each review can appear under multiple genres
- **Fuzzy search** - typo- and spacing-tolerant album lookup
- **Sort & filter** - by genre, score, decade, or free text
- **On Deck** - a queue of albums planned for review
- **Card badges** - Top-rated, Best new, and Most recent review, computed live from the data
- **Email sign-up** - get notified for every new review, or just specific albums; request an album to be reviewed
- **Stats page** - score distribution, genre breakdown, and albums by decade, all computed live
- **Random review** - one click to a random album from the browse page
- **Light/dark theme toggle** - dark by default; the choice persists for the browsing session
- **RSS feed** - a no-email way to follow along, one entry per review
- **"Liquid Glass" motion** - frosted glass panels, a drifting ambient glow, a morphing genre-tab indicator with sliding content, cursor-tilted cover art, and scroll-reveal on the grids

### Pages

| Page | What it does |
|---|---|
| [`reviews.html`](AlbumReviewsWebsite/reviews.html) | Front page - genre tabs, featured + latest grids, On Deck strip |
| [`review.html`](AlbumReviewsWebsite/review.html) | One template for every review, track-by-track scores and notes |
| [`all.html`](AlbumReviewsWebsite/all.html) | Browse all reviews - sort and filter by genre, score, decade, text |
| [`subscribe.html`](AlbumReviewsWebsite/subscribe.html) | Email sign-up (all reviews or specific albums) and album requests |
| [`stats.html`](AlbumReviewsWebsite/stats.html) | Score distribution, genre breakdown, and albums by decade |

### The scoring method

> Each track is scored out of 10. The album percentage is:
>
> **(sum of scored tracks + bonus points) &divide; (number of scored tracks &times; 10)**

Interludes and skits are usually left unscored and excluded from the total,
so a 15-track album with 2 interludes is scored out of 130, not 150.

### Running it locally

The site itself needs nothing - just open an HTML file. Regenerating data
needs Python 3 (standard library only, no installs). Run these from inside
`AlbumReviewsWebsite/`:

```bash
python scripts/parse_reviews.py reviews      # .docx reviews -> data/reviews-data.js
python scripts/fetch_covers.py               # download missing album art -> covers/
```

Adding or editing just one review doesn't need a full rescan - `--only` reparses
a single file and merges it into the existing data, leaving every other review
untouched:

```bash
python scripts/parse_reviews.py reviews --only "Madvillainy Album Review.docx"
```

To draft (never auto-send) an email announcing a new review:

```bash
python scripts/draft_email.py <slug>
```

To regenerate the RSS feed after adding or editing a review:

```bash
python scripts/build_feed.py
```

### Structure

```
reviews.html, review.html, all.html,
subscribe.html, stats.html             site pages
feed.xml                               generated RSS feed
data/                                  generated + hand-written data (reviews, about text, genre overrides, queue)
js/                                    shared scripts (score colouring, fuzzy search, theme toggle)
scripts/                               Python tooling (parser, cover art fetcher, email drafts, RSS feed)
reviews/                               source .docx files, one per album
covers/                                downloaded album art
```

See <a href="AlbumReviewsWebsite/CLAUDE.md"><code>AlbumReviewsWebsite/CLAUDE.md</code></a>
for the full internal conventions - slug rules, the document format the
parser expects, styling variables, and known gotchas.
