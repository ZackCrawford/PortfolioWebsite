#!/usr/bin/env python3
"""
fetch_covers.py - download album cover art into covers/

Usage:
    python scripts/fetch_covers.py                      # fetch anything missing
    python scripts/fetch_covers.py --force              # re-fetch everything
    python scripts/fetch_covers.py --size 1000          # bigger images (default 600)
    python scripts/fetch_covers.py --only madvillainy   # just one album, by slug

Reads reviews-data.js, looks each album up on the iTunes Search API, and saves
the cover as covers/<slug>.jpg. Files that already exist are left alone, so
anything you drop in by hand always wins over an automatic download.

No installs needed - uses only the Python standard library.
No API key or account required.
"""

import argparse
import difflib
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://itunes.apple.com/search"
UA = "Mozilla/5.0 (album-review-site cover fetcher)"
IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".webp")


def norm(s: str) -> str:
    """Loose comparison key: lowercase, no punctuation, no edition suffixes."""
    s = (s or "").lower()
    s = re.sub(r"\b(deluxe|expanded|remaster(ed)?|explicit|edition|version|"
               r"anniversary|reissue|bonus track[s]?)\b", " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def load_reviews(path: Path) -> list:
    """Pull the JSON array out of the generated JS file."""
    text = path.read_text(encoding="utf-8")
    start = text.index("[")
    end = text.rindex("]") + 1
    return json.loads(text[start:end])


DEBUG = False


def search_itunes(term: str, limit: int = 25, artist_attr: bool = False) -> list:
    """One API call. Retries on throttling; never fails silently."""
    params = {"term": term, "entity": "album", "media": "music", "limit": limit}
    if artist_attr:
        params["attribute"] = "artistTerm"
    url = f"{API}?{urllib.parse.urlencode(params)}"

    last = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=20) as resp:
                out = json.loads(resp.read().decode("utf-8")).get("results", [])
            if DEBUG:
                print(f"            . {len(out):3} results for {term!r}"
                      f"{' [artist]' if artist_attr else ''}")
            return out
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (403, 429, 503):      # throttled - wait and retry
                wait = 5 * (attempt + 1)
                if DEBUG:
                    print(f"            . HTTP {e.code}, waiting {wait}s")
                time.sleep(wait)
                continue
            break
        except Exception as e:
            last = e
            time.sleep(2)
    raise RuntimeError(f"search failed for {term!r}: {last}")


JUNK = re.compile(
    r"\b(instrumental[s]?|karaoke|tribute|cover(s| version)?|lofi|lo-fi|"
    r"in the style of|made famous by|originally performed|remix(es|ed)?|"
    r"backing track|as made popular|but lofi|sped up|slowed)\b", re.I)
SMALL = re.compile(r"\s[-\u2013]\s(ep|single)\s*$", re.I)


def sim(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, norm(a), norm(b)).ratio()


def score_result(r: dict, artist: str, album: str, want_tracks=None,
                 artist_locked=False) -> float:
    """How well one iTunes result matches the album we're after."""
    got_artist = r.get("artistName", "")
    got_album = r.get("collectionName", "")

    a_sim = sim(artist, got_artist)
    b_sim = sim(album, got_album)

    # An artist-constrained search already guarantees the artist, so judge on title.
    s = b_sim if artist_locked else (0.45 * a_sim + 0.40 * b_sim)

    if norm(album) == norm(got_album):
        s += 0.15
    elif norm(album) in norm(got_album):
        s += 0.05

    # A wrong-artist result is the failure mode that matters most
    if not artist_locked and a_sim < 0.40:
        s -= 0.30

    # Instrumentals / karaoke / lofi remakes reuse the exact album title
    if JUNK.search(got_album):
        s -= 0.45
    if SMALL.search(got_album) and (want_tracks or 0) > 6:
        s -= 0.20

    # Track count is a strong tiebreaker between editions of the same title
    n = r.get("trackCount") or r.get("collectionTrackCount")
    if want_tracks and n:
        if n == want_tracks:
            s += 0.12
        elif abs(n - want_tracks) > 6:
            s -= 0.08
    return s


def best_of(results, artist, album, want_tracks, artist_locked, floor):
    best, best_s = None, -9
    for r in results:
        if not r.get("collectionName"):
            continue
        s = score_result(r, artist, album, want_tracks, artist_locked)
        if s > best_s:
            best, best_s = r, s
    return (best, best_s) if best_s >= floor else (None, best_s)


def artist_variants(artist: str):
    """'MF DOOM - Madlib' -> the whole string plus each side."""
    out = [artist]
    for part in re.split(r"\s*[-\u2013&,]\s*|\s+(?:x|vs\.?|feat\.?|with)\s+",
                         artist, flags=re.I):
        part = part.strip()
        if len(part) > 2 and part not in out:
            out.append(part)
    return out[:3]


def find_cover(artist: str, album: str, want_tracks=None):
    """
    Find the album, cheapest search first so we don't get rate-limited.

    1. Plain "<artist> <album>" search. Usually enough - the scoring above is
       what keeps a same-titled record by someone else from winning.
    2. If that fails, search the artist's catalogue and match the title in it.
    3. Last resort, the album title on its own.

    Errors are raised, not swallowed - a silent failure here looks identical to
    "this album doesn't exist", which makes it impossible to diagnose.
    """
    attempts = []

    res = search_itunes(f"{artist} {album}", limit=25)
    m, s = best_of(res, artist, album, want_tracks, False, 0.60)
    if m:
        return m, s, "search"
    attempts.append(("search", s, len(res)))

    for who in artist_variants(artist):
        time.sleep(0.3)
        res = search_itunes(who, limit=200, artist_attr=True)
        if not res:
            continue
        m, s = best_of(res, artist, album, want_tracks, True, 0.70)
        if m:
            return m, s, "artist"
        attempts.append((f"artist:{who}", s, len(res)))

    time.sleep(0.3)
    res = search_itunes(album, limit=25)
    m, s = best_of(res, artist, album, want_tracks, False, 0.62)
    if m:
        return m, s, "title"
    attempts.append(("title", s, len(res)))

    if DEBUG:
        for how, s, n in attempts:
            print(f"            . {how}: best {s:.2f} of {n} results")
    return None, 0.0, "none"


def artwork_url(result: dict, size: int) -> str:
    url = result.get("artworkUrl100") or result.get("artworkUrl60") or ""
    return re.sub(r"/\d+x\d+bb\.(jpg|png)$", f"/{size}x{size}bb.jpg", url)


def download(url: str, dest: Path):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read()
    if len(data) < 1000:
        raise ValueError(f"suspiciously small file ({len(data)} bytes)")
    dest.write_bytes(data)
    return len(data)


def existing_cover(folder: Path, slug: str):
    for ext in IMAGE_EXTS:
        p = folder / f"{slug}{ext}"
        if p.exists():
            return p
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-d", "--data", default="data/reviews-data.js")
    ap.add_argument("-o", "--out", default="covers")
    ap.add_argument("--size", type=int, default=600, help="image size in px (default 600)")
    ap.add_argument("--force", action="store_true", help="re-download even if present")
    ap.add_argument("--only", help="fetch a single album by slug")
    ap.add_argument("--delay", type=float, default=1.0, help="seconds between requests")
    ap.add_argument("--url", help="with --only: download this image URL directly")
    ap.add_argument("--debug", action="store_true", help="show every API call and score")
    args = ap.parse_args()

    global DEBUG
    DEBUG = args.debug

    data_path = Path(args.data)
    if not data_path.exists():
        sys.exit(f"Can't find {data_path}. Run parse_reviews.py first.")

    reviews = load_reviews(data_path)
    if args.only:
        reviews = [r for r in reviews if r["slug"] == args.only]
        if not reviews:
            sys.exit(f"No review with slug '{args.only}'")

    out = Path(args.out)
    out.mkdir(exist_ok=True)

    if args.url:
        if not args.only:
            sys.exit("--url needs --only <slug> so it knows which album it is for")
        n = download(args.url, out / f"{args.only}.jpg")
        sys.exit(f"Saved covers/{args.only}.jpg ({n // 1024} KB)")

    got, skipped, missed, unsure = 0, 0, [], []

    for r in reviews:
        slug, artist, album = r["slug"], r.get("artist", ""), r.get("title", "")

        have = existing_cover(out, slug)
        if have and not args.force:
            skipped += 1
            continue

        want = r.get("listedTracks") or len(r.get("tracks", [])) or None
        try:
            match, score, how = find_cover(artist, album, want)

            if not match:
                print(f"  [miss ] {artist} - {album}")
                missed.append((slug, artist, album))
                continue

            url = artwork_url(match, args.size)
            if not url:
                print(f"  [noart] {artist} - {album}")
                missed.append((slug, artist, album))
                continue

            size = download(url, out / f"{slug}.jpg")
            got += 1
            got_artist = match.get("artistName", "")
            got_album = match.get("collectionName", "")
            exact = norm(got_artist) == norm(artist) and norm(got_album) == norm(album)
            flag = "" if exact or score >= 0.90 else "   <- CHECK"
            print(f"  [ok   ] {artist} - {album}  ({size // 1024} KB, "
                  f"{how} {score:.2f}){flag}")
            if not exact:
                print(f"            got: {got_artist} - {got_album}")
                unsure.append((slug, artist, album, got_artist, got_album))

        except Exception as e:
            print(f"  [error] {artist} - {album}: {type(e).__name__}: {e}")
            missed.append((slug, artist, album))

        time.sleep(args.delay)

    print(f"\nDownloaded {got}, already had {skipped}, missing {len(missed)}.")
    if unsure:
        print(f"\n{len(unsure)} to eyeball - the name it found differs from yours:")
        for slug, a, b, ga, gb in unsure:
            print(f"  {slug}")
            print(f"      yours: {a} - {b}")
            print(f"      found: {ga} - {gb}")
        print("\n  Wrong? Delete the file and retry just that one:")
        print("      python fetch_covers.py --only <slug> --force")
        print("  Or point it straight at an image you found yourself:")
        print("      python fetch_covers.py --only <slug> --url \"https://...jpg\"")
    if missed:
        print("\nNo cover found for these - save one by hand as covers/<slug>.jpg:")
        for slug, artist, album in missed:
            print(f"  covers/{slug}.jpg   ({artist} - {album})")


if __name__ == "__main__":
    main()
