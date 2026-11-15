"""Build one static page per review, so shared links show the right preview.

Link previews (Discord, iMessage, X, Slack...) and search engines read a page's
<head> without running JavaScript, so review.html?album=<slug> always looked
like the same generic page to them. This writes review/<slug>.html for every
review: a copy of review.html whose <head> carries that album's title,
description, cover image and schema.org Review data. The page body still
renders from reviews-data.js exactly like review.html does.

It also refreshes the album-review URLs in the site's sitemap.xml.

Run from AlbumReviewsWebsite/ after adding a review, or after editing
review.html (the pages are copies of it):

    python scripts/build_pages.py

Standard library only.
"""
import html
import json
import re
from pathlib import Path

SITE = "https://zackcrawford.com"
ALBUMS = f"{SITE}/albums"
OUT = Path("review")
SITEMAP = Path("../sitemap.xml")


def load_js_array(path, name):
    text = Path(path).read_text(encoding="utf-8")
    start = text.index("[", text.index(name))
    end = text.rindex("]") + 1
    return json.loads(text[start:end])


def load_about(path):
    """about-data.js is a JS object (not strict JSON); pull the first about paragraph per slug."""
    p = Path(path)
    if not p.exists():
        return {}
    text = p.read_text(encoding="utf-8")
    out = {}
    for m in re.finditer(r'"([a-z0-9-]+)"\s*:\s*\{\s*about\s*:\s*\[\s*"((?:[^"\\]|\\.)*)"', text):
        out[m.group(1)] = json.loads(f'"{m.group(2)}"')
    return out


def clip(text, n=200):
    text = re.sub(r"\s+", " ", text or "").strip()
    return text if len(text) <= n else text[: n - 1].rsplit(" ", 1)[0] + "…"


def page_for(r, template, about):
    slug, title, artist = r["slug"], r["title"], r["artist"]
    url = f"{ALBUMS}/review/{slug}"
    cover = f"{ALBUMS}/covers/{slug}.jpg"
    headline = f"{title} by {artist} - album review"
    desc = clip(f"{r['finalScore']}/10. {r.get('finalWords') or about.get(slug) or ''}")
    a = lambda s: html.escape(s, quote=True)

    ld = {
        "@context": "https://schema.org",
        "@type": "Review",
        "name": headline,
        "url": url,
        "author": {"@type": "Person", "name": "Zack Crawford", "url": SITE + "/"},
        "itemReviewed": {
            "@type": "MusicAlbum",
            "name": title,
            "byArtist": {"@type": "MusicGroup", "name": artist},
            "datePublished": str(r.get("year", "")),
            "genre": r.get("genre", ""),
            "numTracks": r.get("listedTracks"),
            "image": cover,
        },
        "reviewRating": {"@type": "Rating", "ratingValue": r["finalScore"], "bestRating": 10, "worstRating": 0},
    }
    if r.get("finalWords"):
        ld["reviewBody"] = r["finalWords"]
    ld_json = json.dumps(ld, ensure_ascii=False).replace("</", "<\\/")

    s = template
    subs = [
        (r"<title>.*?</title>", f"<title>{a(title)} by {a(artist)} - Album Review</title>"),
        (r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{a(desc)}">'),
        (r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{a(url)}">'),
        (r'<meta property="og:type" content="[^"]*">', '<meta property="og:type" content="article">'),
        (r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{a(headline)}">'),
        (r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{a(desc)}">'),
        (r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{a(url)}">'),
        (r'<meta property="og:image" content="[^"]*">', f'<meta property="og:image" content="{a(cover)}">'),
        (r'<meta property="og:image:width" content="[^"]*">\n', ""),
        (r'<meta property="og:image:height" content="[^"]*">\n', ""),
        (r'<meta property="og:image:alt" content="[^"]*">', f'<meta property="og:image:alt" content="{a(title)} cover art">'),
        (r'<meta name="twitter:card" content="[^"]*">', '<meta name="twitter:card" content="summary">'),
    ]
    for pat, rep in subs:
        s, n = re.subn(pat, lambda _m, rep=rep: rep, s, count=1)
        if n == 0 and "width" not in pat and "height" not in pat:
            raise SystemExit(f"review.html no longer has {pat!r} - update build_pages.py")
    inject = (
        f'<script type="application/ld+json">{ld_json}</script>\n'
        f"<script>window.REVIEW_SLUG = {json.dumps(slug)};</script>\n"
    )
    s = s.replace("</head>", inject + "</head>", 1)
    return s


def refresh_sitemap(slugs):
    if not SITEMAP.exists():
        return
    text = SITEMAP.read_text(encoding="utf-8")
    keep = [ln for ln in text.splitlines() if "/albums/review" not in ln]
    lastmod = re.search(r"<lastmod>([^<]+)</lastmod>", text)
    lm = f"<lastmod>{lastmod.group(1)}</lastmod>" if lastmod else ""
    new = [f"  <url><loc>{ALBUMS}/review/{s}</loc>{lm}</url>" for s in slugs]
    i = keep.index("</urlset>")
    SITEMAP.write_text("\n".join(keep[:i] + new + keep[i:]) + "\n", encoding="utf-8")


def main():
    reviews = load_js_array("data/reviews-data.js", "REVIEWS")
    about = load_about("data/about-data.js")
    template = Path("review.html").read_text(encoding="utf-8")
    OUT.mkdir(exist_ok=True)
    wanted = set()
    for r in reviews:
        name = f"{r['slug']}.html"
        (OUT / name).write_text(page_for(r, template, about), encoding="utf-8")
        wanted.add(name)
    for old in OUT.glob("*.html"):          # reviews that were removed
        if old.name not in wanted:
            old.unlink()
    refresh_sitemap([r["slug"] for r in reviews])
    print(f"wrote {len(reviews)} review pages to {OUT}/ and refreshed the sitemap")


if __name__ == "__main__":
    main()
