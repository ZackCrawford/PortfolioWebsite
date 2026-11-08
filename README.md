<div align="center">

# Zack Crawford - Portfolio

*A static, no-framework portfolio site with a 3D front page, a resume, and two
projects, deployed as a single Vercel site with path-based routing.*

</div>

---

Everything here is plain HTML/CSS/JS - no build step, no bundler, no
framework. The 3D scenes use [Three.js](https://threejs.org/) loaded from a
CDN, pinned to an exact version and integrity-checked. Each project lives in
its own top-level folder; `vercel.json` at the repo root stitches them
together into one deployed site.

## What's here

| Path | What it is |
|---|---|
| `/` | **Portfolio** - 3D intro, projects, experience and education, contact |
| `/resume` | Resume viewer with PDF download |
| `/picoctf` | **picoCTF Solves** - write-ups for picoCTF challenges, browsable by category and difficulty |
| `/albums` | **Album Reviews** - scoring, genre browsing, fuzzy search, RSS, email sign-up |
| `/privacy`, `/accessibility` | Privacy policy and accessibility statement |

## Front page

- **Coin intro** - a greyscale ZC coin falls in spinning and latches into a wireframe lock; scrolling unlocks it
- **Coin to helix** - the coin turns edge-on into a line of light, which unzips into a DNA double helix
- **Projects on the helix** - each project card is fixed to its own point on the strand; the camera descends and circles the helix as you scroll, and each card's attachment point glows
- **Record** - experience, education and certification as a centred timeline
- **Section navigator** - bottom-left control to jump between Main, Info, Projects, Record and Contact
- **Reduced motion** - with the system setting on, all 3D is skipped for a plain layout with the same content

## picoCTF Solves

- **Category ride** - a particle cloud forms a shape for each category (globe, padlock, magnifying glass, terminal...) as the camera turns and descends; the cursor scatters particles, which drift back
- **Dive in** - "Open category" flies into the shape and opens the category in place, with difficulty tabs and challenge cards
- **Write-ups** - a terminal-style page that opens downward from its title bar; unsolved challenges show clearly labelled placeholder text
- **Search** - `Ctrl + K` (or `/`) from any picoCTF page
- **Ordering** - categories are sorted from most to least solved, computed from the data

## Keyboard

| Key | Action |
|---|---|
| `Page Down` / `Space` | Next section |
| `Page Up` / `Shift + Space` | Previous section |
| `Home` / `End` | Top / bottom |
| `Left` / `Right` | Previous / next picoCTF category or write-up |
| `Ctrl + K`, `/` | Search (picoCTF) |
| `Esc` | Close menus, back out of a category or write-up |

## Folders

```
vercel.json                  rewrites, security headers, cache rules
404.html                     custom not-found page
robots.txt, sitemap.xml      crawler files
llms.txt                     plain-text summary of the site for AI tools

MainPortfolioPage/           front page, resume viewer, privacy + accessibility pages
  js/main.js                 scroll choreography, project ring, navigator, keyboard
  js/scene.js                Three.js scene: coin, lock, helix
  img/og.png                 link-preview image
picoCTFSolvesWebsite/        picoCTF site
  js/particles.js            particle shapes, cursor wind, orbiting camera
  js/catview.js              category view (shared by the landing page and category.html)
  js/palette.js              Ctrl+K search
  js/render.js               shared helpers, safe Markdown rendering, category order
  data/picoctf-data.js       generated from the write-up repo
AlbumReviewsWebsite/         album review site (details below and in its own CLAUDE.md)
```

## Deployment

The whole repo is one Vercel project; pushing to `main` redeploys
automatically, and other branches get preview deployments. `vercel.json`
rewrites map clean URLs to each folder's real files - for example
`/albums/reviews.html` is served from `AlbumReviewsWebsite/reviews.html`.

**Cache versioning:** scripts and stylesheets are loaded with a `?v=` tag
(for example `particles.js?v=20261109n`). When you change a JS or CSS file,
bump the tag in every page that loads it, or returning visitors will keep
running their cached copy.

## Security

- Content Security Policy and other security headers are set in `vercel.json`
- CDN libraries are version-pinned with Subresource Integrity hashes
- Write-up Markdown is rendered with raw HTML shown as text and links limited to safe protocols
- Search input and URL parameters are escaped before display
- The album request form has a spam honeypot and a per-browser submission limit
- Rate limiting is configured in Vercel's Firewall (one rule on the Hobby plan)

## Regenerating data

Both projects that pull from external sources have a small Python script
(standard library only, no installs). Run each from inside its own project
folder - they write to `data/` relative to the current directory:

```bash
# from AlbumReviewsWebsite/ - parses reviews/*.docx into data/reviews-data.js
python scripts/parse_reviews.py reviews

# from picoCTFSolvesWebsite/ - pulls every write-up from github.com/ZackCrawford/picoCTF-Solves
python scripts/parse_picoctf.py
```

A picoCTF challenge counts as solved once its write-up text is published;
category order and colours update automatically.

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
