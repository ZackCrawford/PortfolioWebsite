#!/usr/bin/env python3
"""
draft_email.py - create a ready-to-send draft in Buttondown for a review

Usage:
    python scripts/draft_email.py madvillainy

Looks up the review by slug in data/reviews-data.js and creates a DRAFT email
in your Buttondown account via their API. It never sends anything - Buttondown
defaults new emails to draft status, and sending is a separate, deliberate
step you take yourself in their dashboard.

Once the draft exists, open Buttondown, tweak the wording if you like, then
pick the audience before sending:
  - "all-reviews" tag   -> everyone who wants every new review
  - "album-<slug>" tag  -> people who asked for this specific album

(Tag-scoped sending isn't something Buttondown's API supports reliably right
now, which is why that last step is manual rather than scripted here.)

Needs a Buttondown API key in the BUTTONDOWN_API_KEY environment variable.
Get one from your Buttondown settings, under API. Never put the key itself in
a file that gets committed.

No installs needed - uses only the Python standard library.
"""

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

API_BASE = "https://api.buttondown.com/v1"

# Fill this in once the site has a live URL (e.g. GitHub Pages), so drafted
# emails link somewhere real.
SITE_URL = "https://album-reviews-website.vercel.app/albums"

# How every drafted email signs off - change to whatever you go by publicly.
SIGNOFF = "— Ridez"


def load_reviews(path: Path) -> list:
    if not path.exists():
        sys.exit(f"Can't find {path}. Run parse_reviews.py first.")
    text = path.read_text(encoding="utf-8")
    match = re.search(r"const REVIEWS\s*=\s*(\[.*\])\s*;?\s*$", text, re.S)
    if not match:
        sys.exit(f"Couldn't find a REVIEWS array in {path} - "
                  f"is it really a file parse_reviews.py generated?")
    return json.loads(match.group(1))


def build_email(r: dict) -> dict:
    year = f" ({r['year']})" if r.get("year") else ""
    subject = f"New review: {r['artist']} – {r['title']} ({r['finalScore']}/10)"

    lines = [
        f"Just posted a new one: **{r['artist']} – {r['title']}**{year}.",
        "",
        f"Score: **{r['finalScore']}/10** "
        f"({r['percent']}%, {r['scoredTracks']} tracks scored)",
    ]
    if r.get("finalWords"):
        lines += ["", r["finalWords"]]
    lines += [
        "",
        f"Full track-by-track breakdown: {SITE_URL}/review.html?album={r['slug']}",
        "",
        SIGNOFF,
    ]
    return {"subject": subject, "body": "\n".join(lines), "status": "draft"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug", help="the album's slug, e.g. madvillainy")
    ap.add_argument("-d", "--data", default="data/reviews-data.js")
    args = ap.parse_args()

    api_key = os.environ.get("BUTTONDOWN_API_KEY")
    if not api_key:
        sys.exit("Set BUTTONDOWN_API_KEY first (Buttondown settings -> API).")

    reviews = load_reviews(Path(args.data))
    match = next((r for r in reviews if r["slug"] == args.slug), None)
    if not match:
        close = [r["slug"] for r in reviews if args.slug in r["slug"] or r["slug"] in args.slug]
        hint = f" Did you mean: {', '.join(close)}?" if close else ""
        sys.exit(f"No review with slug '{args.slug}' in {args.data}.{hint}")

    email = build_email(match)

    req = urllib.request.Request(
        f"{API_BASE}/emails",
        data=json.dumps(email).encode("utf-8"),
        headers={
            "Authorization": f"Token {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req):
            pass
    except urllib.error.HTTPError as e:
        sys.exit(f"Buttondown rejected the request ({e.code}): {e.read().decode('utf-8')}")

    print(f"Draft created: {email['subject']}")
    print()
    print("Nothing has been sent. Open your Buttondown dashboard's Drafts list,")
    print("tweak the wording if you like, then pick the audience before sending:")
    print("  - everyone who wants every review  -> tag 'all-reviews'")
    print(f"  - people who asked for this one    -> tag 'album-{match['slug']}'")


if __name__ == "__main__":
    main()
