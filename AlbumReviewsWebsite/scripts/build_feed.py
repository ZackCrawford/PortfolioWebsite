#!/usr/bin/env python3
"""
build_feed.py - generate feed.xml, an RSS feed of every review

Usage:
    python scripts/build_feed.py

Reads data/reviews-data.js and writes feed.xml at the repo root, newest
review first (by the same `reviewed` date used for the "recently reviewed"
sort elsewhere on the site). Re-run it any time reviews-data.js changes.

This is an experiment - if you don't end up wanting it, delete this file and
feed.xml, and remove the one <link rel="alternate"> tag in reviews.html's
<head>. Nothing else on the site depends on it.

No installs needed - uses only the Python standard library.
"""

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

# Fill this in once the site has a live URL (e.g. GitHub Pages).
SITE_URL = "https://album-reviews-website.vercel.app/albums"

FEED_TITLE = "Ridez — Album Reviews"
FEED_DESC = "Track-by-track album reviews, newest first."


def load_reviews(path: Path) -> list:
    if not path.exists():
        sys.exit(f"Can't find {path}. Run parse_reviews.py first.")
    text = path.read_text(encoding="utf-8")
    match = re.search(r"const REVIEWS\s*=\s*(\[.*\])\s*;?\s*$", text, re.S)
    if not match:
        sys.exit(f"Couldn't find a REVIEWS array in {path} - "
                  f"is it really a file parse_reviews.py generated?")
    return json.loads(match.group(1))


def rfc822(date_str: str) -> str:
    """'2026-07-23' -> 'Thu, 23 Jul 2026 00:00:00 GMT', as RSS pubDate wants."""
    dt = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    return dt.strftime("%a, %d %b %Y %H:%M:%S GMT")


def item_xml(r: dict) -> str:
    link = f"{SITE_URL}/review.html?album={r['slug']}"
    title = f"{r['artist']} – {r['title']} ({r['finalScore']}/10)"
    desc = f"Score: {r['finalScore']}/10 ({r['percent']}%, {r['scoredTracks']} tracks scored)."
    if r.get("finalWords"):
        snippet = r["finalWords"][:280].rsplit(" ", 1)[0]
        desc += f" {snippet}…"
    return (
        "  <item>\n"
        f"    <title>{escape(title)}</title>\n"
        f"    <link>{escape(link)}</link>\n"
        f"    <guid isPermaLink=\"true\">{escape(link)}</guid>\n"
        f"    <pubDate>{rfc822(r['reviewed'])}</pubDate>\n"
        f"    <description>{escape(desc)}</description>\n"
        "  </item>"
    )


def main():
    if SITE_URL == "YOUR_SITE_URL":
        print("! SITE_URL isn't set yet - links in the feed will be broken until "
              "you edit the constant at the top of this script.")

    reviews = load_reviews(Path("data/reviews-data.js"))
    reviews.sort(key=lambda r: r["reviewed"], reverse=True)

    items = "\n".join(item_xml(r) for r in reviews)
    now = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")

    feed = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0">\n'
        "<channel>\n"
        f"  <title>{escape(FEED_TITLE)}</title>\n"
        f"  <link>{escape(SITE_URL)}/reviews.html</link>\n"
        f"  <description>{escape(FEED_DESC)}</description>\n"
        "  <language>en-us</language>\n"
        f"  <lastBuildDate>{now}</lastBuildDate>\n"
        f"{items}\n"
        "</channel>\n"
        "</rss>\n"
    )

    Path("feed.xml").write_text(feed, encoding="utf-8")
    print(f"Wrote {len(reviews)} item(s) to feed.xml")


if __name__ == "__main__":
    main()
