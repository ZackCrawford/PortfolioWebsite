#!/usr/bin/env python3
"""
parse_reviews.py - turn album review .docx files into reviews-data.js

Usage:
    python scripts/parse_reviews.py reviews
    python scripts/parse_reviews.py reviews -o data/reviews-data.js

    # parse just one (or a few) .docx and merge into the existing data file,
    # instead of rescanning and re-deriving every review in the folder:
    python scripts/parse_reviews.py reviews --only "Madvillainy Album Review.docx"

Reads every .docx in the folder and writes a single JS data file the website
loads. Re-run it any time you add or edit a review. Pass --only to touch just
the named file(s) - every other review already in the data file is carried
over exactly as it was, unparsed, so a bad edit to one review's .docx can't
affect anything but that review's own entry.

No installs needed - uses only the Python standard library.
"""

import argparse
import datetime
import difflib
import json
import re
import sys
import unicodedata
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


# ---------- reading .docx without external tools ----------

def para_text(p) -> str:
    """Plain text of one <w:p>, including tabs and line breaks."""
    out = []
    for node in p.iter():
        if node.tag == W + "t":
            out.append(node.text or "")
        elif node.tag == W + "tab":
            out.append(" ")
        elif node.tag in (W + "br", W + "cr"):
            out.append(" ")
    return "".join(out)


def read_docx(path: Path) -> list:
    """
    Return the document body as a flat list of blocks:
        ("p", "paragraph text")
        ("table", [[cell, cell], [cell, cell], ...])
    """
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml")
    root = ET.fromstring(xml)
    body = root.find(W + "body")
    if body is None:
        return []

    blocks = []
    for child in body:
        if child.tag == W + "p":
            blocks.append(("p", para_text(child)))
        elif child.tag == W + "tbl":
            rows = []
            for tr in child.findall(W + "tr"):
                cells = []
                for tc in tr.findall(W + "tc"):
                    cells.append(" ".join(
                        para_text(p) for p in tc.findall(W + "p")
                    ).strip())
                if cells:
                    rows.append(cells)
            blocks.append(("table", rows))
    return blocks


def docx_modified(path: Path) -> str:
    """
    Best guess at when a review was last worked on, as an ISO date.

    Prefers Word's own metadata; falls back to the newest timestamp inside the
    zip, then the file's mtime. Copying files between folders can reset mtime,
    so treat "recently reviewed" as approximate rather than authoritative.
    """
    try:
        with zipfile.ZipFile(path) as z:
            try:
                root = ET.fromstring(z.read("docProps/core.xml"))
                for tag in ("modified", "created"):
                    el = root.find("{http://purl.org/dc/terms/}" + tag)
                    if el is not None and el.text:
                        return el.text[:10]
            except KeyError:
                pass
            stamps = [i.date_time for i in z.infolist() if i.date_time[0] > 1980]
            if stamps:
                y, m, d = max(stamps)[:3]
                return f"{y:04d}-{m:02d}-{d:02d}"
    except Exception:
        pass
    return datetime.date.fromtimestamp(path.stat().st_mtime).isoformat()


# ---------- text helpers ----------

def clean(text: str) -> str:
    """Normalize smart quotes and dashes, collapse whitespace."""
    text = unicodedata.normalize("NFKC", text or "")
    text = (text.replace("\u2019", "'").replace("\u2018", "'")
                .replace("\u201c", '"').replace("\u201d", '"')
                .replace("\u2013", "-").replace("\u2014", "-")
                .replace("\u2026", "..."))
    return re.sub(r"\s+", " ", text).strip()


def slugify(title: str) -> str:
    s = clean(title).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "untitled"


def to_num(raw: str):
    """'9.5' -> 9.5, '10' -> 10, 'N/A' -> None."""
    raw = (raw or "").strip()
    if re.match(r"^n\s*/?\s*a$", raw, re.I):
        return None
    try:
        v = float(raw)
        return int(v) if v == int(v) else v
    except ValueError:
        return None


# ---------- section splitting ----------

SECTION_PATTERNS = [
    (r"^track.?s?(by)?track", "tracks"),
    (r"^track.?list", "tracks"),
    (r"^the?tally", "tally"),
    (r"^tally", "tally"),
    (r"^best(and|&)?worst", "bestworst"),
    (r"^final.?words?", "final"),
    (r"^(closing|overall).?thoughts?", "final"),
    (r"^verdict", "final"),
]


def section_key(text: str):
    """Match a heading regardless of punctuation, case, or spacing."""
    flat = re.sub(r"[^a-z0-9&]", "", clean(text).lower())
    if not flat or len(flat) > 40:
        return None
    for pattern, key in SECTION_PATTERNS:
        if re.match(pattern, flat):
            return key
    return None


def split_sections(blocks: list) -> dict:
    """Group blocks under the section heading that precedes them."""
    out = {"header": [], "tracks": [], "tally": [], "bestworst": [], "final": []}
    current = "header"
    for kind, content in blocks:
        if kind == "p":
            key = section_key(content)
            if key:
                current = key
                continue
        out[current].append((kind, content))
    return out


def paras(blocks: list) -> list:
    return [clean(c) for k, c in blocks if k == "p" and clean(c)]


def tables(blocks: list) -> list:
    return [c for k, c in blocks if k == "table"]


# ---------- field parsers ----------

BULLET_CHARS = "\u2022\u00b7\u25cf\u25aa-*"


def parse_header(blocks: list) -> dict:
    lines = [ln for ln in paras(blocks) if ln.upper() != "ALBUM REVIEW"]

    title = lines[0] if lines else ""

    artist = year = genre = ""
    listed = None
    for ln in lines[1:]:
        if "\u2022" in ln or re.search(r"\s[\u00b7|]\s", ln):
            parts = [p.strip() for p in re.split(r"[\u2022\u00b7|]", ln) if p.strip()]
            if len(parts) >= 4:
                artist, year, genre = parts[0], parts[1], parts[2]
                m = re.search(r"(\d+)", parts[3])
                listed = int(m.group(1)) if m else None
                break

    final_score = None
    for ln in lines:
        m = re.search(r"Album Score\s*:?\s*([\d.]+)", ln, re.I)
        if m:
            final_score = float(m.group(1))
            break

    return {"title": title, "artist": artist, "year": year,
            "genre": genre, "listedTracks": listed, "finalScore": final_score}


# "1. Title: 8 / 10"   "1) Title - 8/10"   "1. Title\t9 / 10"   "1. Title: N/A / N/A"
# Trailing "+ N" adds bonus points to the raw total without raising the potential total,
# which is how unscored interludes can still earn credit.
TRACK_RE = re.compile(
    r"^\s*(\d+)\s*[.):\-]\s*(.+?)\s*[:\-\u2013\u2014]?\s*"
    r"([\d.]+|N\s*/?\s*A)\s*/\s*(?:10|N\s*/?\s*A)"
    r"(?:\s*\+\s*([\d.]+))?\s*$",
    re.I,
)

# "9. Grace of God Go I  -"  - a dash in place of a score means unscored
TRACK_DASH_RE = re.compile(
    r"^\s*(\d+)\s*[.):]\s*(.+?)\s*[:\s]\s*[\u2014\u2013\-]\s*(?:\+\s*([\d.]+))?\s*$"
)


def parse_tracks(blocks: list) -> list:
    """Numbered lines ending in a score start a track; following lines are its note."""
    tracks = []
    for ln in paras(blocks):
        m = TRACK_RE.match(ln)
        if m:
            tracks.append({"n": int(m.group(1)), "title": clean(m.group(2)),
                           "score": to_num(m.group(3)),
                           "bonus": to_num(m.group(4)) or 0, "note": ""})
            continue
        d = TRACK_DASH_RE.match(ln)
        if d:
            tracks.append({"n": int(d.group(1)), "title": clean(d.group(2)),
                           "score": None,
                           "bonus": to_num(d.group(3)) or 0, "note": ""})
            continue
        if tracks:
            note = ln.lstrip(BULLET_CHARS + " ").strip()
            if note:
                tracks[-1]["note"] = (tracks[-1]["note"] + " " + note).strip()
    return tracks


def parse_tally(blocks: list) -> str:
    """Reasoning text from the Adjustment / Bonus row."""
    for rows in tables(blocks):
        for row in rows:
            if row and re.search(r"adjust", clean(row[0]), re.I):
                note = clean(row[-1]) if len(row) > 1 else ""
                return re.sub(r"^[+-]?\s*[\d.]+\s*%\s*", "", note).strip()
    for ln in paras(blocks):
        if re.search(r"adjust", ln, re.I):
            return re.sub(r".*?adjustment\s*/?\s*bonus\s*:?\s*", "", ln, flags=re.I).strip()
    return ""


ENTRY_RE = re.compile(r"^\s*\d+\s*[.)]?\s*(.+?)\s*\(\s*([\d.]+)\s*/\s*10\s*\)\s*$")


def parse_best_worst(blocks: list) -> tuple:
    best, worst = [], []
    for rows in tables(blocks):
        for row in rows:
            if not row or re.search(r"best tracks", clean(row[0]), re.I):
                continue
            for idx, bucket in ((0, best), (1, worst)):
                if idx < len(row):
                    m = ENTRY_RE.match(clean(row[idx]))
                    if m:
                        bucket.append({"title": clean(m.group(1)),
                                       "score": to_num(m.group(2))})
    return best, worst


def parse_final_words(blocks: list) -> str:
    return " ".join(paras(blocks)).strip()


# ---------- genre mapping ----------

TAB_RULES = [
    ("Hip-hop",      r"hip.?hop|\brap\b|trap|drill"),
    ("R&B",          r"\br&b\b|soul|funk|motown"),
    ("Metal",        r"metal|hardcore"),
    # Alternative must be tested before Rock ("alternative rock" contains "rock"),
    # and after Hip-hop so "alternative hip hop" still lands on Hip-hop.
    ("Alternative",  r"alternative|psychedel|shoegaze|dream.?pop|art.?rock|"
                     r"post.?punk|noise.?pop|slacker"),
    ("Rock",         r"rock|grunge|punk|indie|britpop|new.?wave|emo|celtic|ska"),
    ("Electronic",   r"electronic|techno|house|edm|ambient|synth|hyperpop|"
                     r"industrial|darkwave|electro"),
    ("Jazz",         r"jazz|bebop|swing|fusion"),
    ("Country",      r"country|bluegrass|americana"),
    ("Folk",         r"folk|singer.?songwriter|acoustic|celtic|bluegrass"),
    ("Experimental", r"experimental|avant|noise|abstract"),
    ("Pop",          r"\bpop\b|dream.?pop"),
]




KNOWN_TABS = ["Rock", "Alternative", "Hip-hop", "Electronic", "Pop", "R&B",
              "Jazz", "Metal", "Folk", "Country", "Experimental"]

OVERRIDE_FILE = "data/genre-overrides.json"


def load_overrides(folder: Path) -> dict:
    """Per-album genre corrections. Looked for next to the script and in cwd."""
    for path in (Path(OVERRIDE_FILE), folder.parent / OVERRIDE_FILE,
                 Path(__file__).parent.parent / OVERRIDE_FILE):
        if path.exists():
            try:
                raw = json.loads(path.read_text(encoding="utf-8"))
            except Exception as e:
                print(f"  ! couldn't read {path}: {e}")
                return {}
            out = {}
            for slug, tabs in raw.items():
                if slug.startswith("_"):
                    continue
                tabs = [tabs] if isinstance(tabs, str) else list(tabs)
                unknown = [t for t in tabs if t not in KNOWN_TABS]
                if unknown:
                    print(f"  ! {OVERRIDE_FILE}: unknown tab(s) {unknown} for '{slug}'")
                out[slug] = tabs
            if out:
                print(f"  (using {len(out)} genre override(s) from {path.name})")
            return out
    return {}


def genre_tabs(genre: str) -> list:
    """
    Every tab a genre belongs to, not just the first.

    Albums span genres, so "Alternative Rock" files under both Alternative and
    Rock, and "Abstract/Experimental Hip-Hop" under both Hip-hop and
    Experimental. TAB_RULES order decides which one is primary - that's the one
    shown on the card and used by the genre link on a review page.
    """
    g = (genre or "").lower()
    found = [tab for tab, pattern in TAB_RULES if re.search(pattern, g)]
    return found or ["Other"]


# ---------- assembly ----------

def parse_review(path: Path, overrides: dict = None) -> dict:
    sec = split_sections(read_docx(path))

    head = parse_header(sec["header"])
    slug = slugify(head["title"])
    # a hand-set override wins outright over whatever the genre string matches
    tabs = (overrides or {}).get(slug) or genre_tabs(head["genre"])
    tracks = parse_tracks(sec["tracks"])
    fallback = False
    if not tracks:
        # heading missing or worded differently - scan every block instead
        tracks = parse_tracks([b for b in read_docx(path)])
        fallback = bool(tracks)
    best, worst = parse_best_worst(sec["bestworst"])

    scored = [t["score"] for t in tracks if t["score"] is not None]
    bonus = round(sum(t.get("bonus") or 0 for t in tracks), 2)
    raw = round(sum(scored) + bonus, 2)
    potential = len(scored) * 10
    pct = round(raw / potential * 100, 2) if potential else 0.0
    final = head["finalScore"]
    adjustment = round(final * 10 - pct, 2) if final is not None else 0.0

    return {
        "slug": slug,
        "title": head["title"],
        "artist": head["artist"],
        "year": head["year"],
        "genre": head["genre"],
        "tab": tabs[0],
        "tabs": tabs,
        "listedTracks": head["listedTracks"] or len(tracks),
        "scoredTracks": len(scored),
        "rawPoints": raw,
        "bonusPoints": bonus,
        "potentialPoints": potential,
        "percent": pct,
        "finalScore": final,
        "adjustment": adjustment,
        "adjustmentNote": parse_tally(sec["tally"]),
        "tracks": tracks,
        "best": best,
        "worst": worst,
        "finalWords": parse_final_words(sec["final"]),
        "about": [],
        "facts": {},
        "sourceFile": path.name,
        "reviewed": docx_modified(path),
        "_fallback": fallback,
    }


def norm_title(s: str) -> str:
    """Compare titles ignoring punctuation, spacing, and case."""
    s = (s or "").lower().replace("'", "").replace("\u2019", "")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", s)).strip()


PLACEHOLDERS = re.compile(r"^(genre|artist|year|and why|tbd|xx+|n/?a)$", re.I)


def audit(r: dict) -> list:
    warns = []

    if r.get("_fallback"):
        warns.append("no 'Track by Track' heading found - tracks read from the whole "
                     "document instead (check the count below is right)")
    if r["finalScore"] is None:
        warns.append("no album score found - check the 'Album Score:' line")
    if not r["tracks"]:
        warns.append("NO TRACKS PARSED - this review is empty on the site")
    if r["listedTracks"] and r["listedTracks"] != len(r["tracks"]):
        warns.append(f"header says {r['listedTracks']} tracks, parsed {len(r['tracks'])} "
                     f"- {abs(r['listedTracks'] - len(r['tracks']))} may be formatted differently")
    # A large adjustment is only suspicious when the track count doesn't reconcile;
    # if every track parsed, it's a deliberate judgement call.
    counts_agree = (not r["listedTracks"]) or r["listedTracks"] == len(r["tracks"])
    if r["tracks"] and abs(r["adjustment"]) > 8 and not counts_agree:
        warns.append(f"large adjustment ({r['adjustment']:+.2f}%) alongside a track "
                     f"count mismatch - likely missing tracks")
    elif r["tracks"] and abs(r["adjustment"]) > 15:
        warns.append(f"very large adjustment ({r['adjustment']:+.2f}%) - "
                     f"confirm this is intentional")
    if not r["adjustmentNote"] or PLACEHOLDERS.match(r["adjustmentNote"].strip()) \
            or re.search(r"\band why\b", r["adjustmentNote"], re.I):
        warns.append("adjustment reasoning missing or still a placeholder")
    if not r["finalWords"]:
        warns.append("no final words")

    if PLACEHOLDERS.match((r["genre"] or "").strip()):
        warns.append(f"genre is still the placeholder '{r['genre']}'")
    elif r["tab"] == "Other":
        warns.append(f"genre '{r['genre']}' didn't map to a tab - add a rule in TAB_RULES")

    missing = [t["n"] for t in r["tracks"] if not t["note"]]
    if missing:
        warns.append(f"no note on track(s) {missing}")

    # best/worst titles: ignore punctuation, suggest near-misses
    lookup = {norm_title(t["title"]): t["title"] for t in r["tracks"]}
    for bucket, label in ((r["best"], "best"), (r["worst"], "worst")):
        if bucket and len(bucket) != 3:
            warns.append(f"{label} list has {len(bucket)} entries, expected 3")
        for e in bucket:
            n = norm_title(e["title"])
            if n in lookup:
                continue
            near = difflib.get_close_matches(n, lookup.keys(), n=1, cutoff=0.75)
            if near:
                warns.append(f"{label} entry '{e['title']}' -> did you mean "
                             f"'{lookup[near[0]]}'?")
            elif r["tracks"]:
                warns.append(f"{label} entry '{e['title']}' matches no track title")

    # scores in best/worst should agree with the track list
    for bucket, label in ((r["best"], "best"), (r["worst"], "worst")):
        for e in bucket:
            n = norm_title(e["title"])
            for t in r["tracks"]:
                if norm_title(t["title"]) == n and t["score"] is not None \
                        and e["score"] is not None and t["score"] != e["score"]:
                    warns.append(f"{label} '{e['title']}' scored {e['score']} here "
                                 f"but {t['score']} in the track list")
    return warns


def load_existing(out_path: Path) -> list:
    """The data file this script wrote last time, as plain dicts again."""
    if not out_path.exists():
        return []
    text = out_path.read_text(encoding="utf-8")
    match = re.search(r"const REVIEWS\s*=\s*(\[.*\])\s*;?\s*$", text, re.S)
    if not match:
        sys.exit(f"Couldn't find a REVIEWS array in {out_path} - "
                  f"is it really a file this script generated?")
    return json.loads(match.group(1))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder", help="folder containing review .docx files")
    ap.add_argument("-o", "--out", default="data/reviews-data.js")
    ap.add_argument("--only", nargs="+", metavar="FILE",
                     help="only (re)parse these .docx filenames, relative to "
                          "folder, and merge the result into --out. Every "
                          "other review already in --out is kept exactly as "
                          "it was, untouched, instead of being rescanned.")
    args = ap.parse_args()

    folder = Path(args.folder)
    if not folder.is_dir():
        sys.exit(f"Not a folder: {folder}")

    if args.only:
        files = []
        for name in args.only:
            f = folder / name
            if not f.is_file():
                sys.exit(f"Not a file: {f}")
            files.append(f)
    else:
        files = sorted(f for f in folder.glob("*.docx") if not f.name.startswith("~$"))
    if not files:
        sys.exit(f"No .docx files found in {folder}")

    overrides = load_overrides(folder)

    existing_by_slug = {}
    if args.only:
        existing_by_slug = {r["slug"]: r for r in load_existing(Path(args.out))}

    reviews, flagged, failed = [], 0, 0
    for f in files:
        try:
            r = parse_review(f, overrides)
        except Exception as e:
            print(f"  FAILED  {f.name}: {type(e).__name__}: {e}")
            failed += 1
            continue

        warns = audit(r)
        reviews.append(r)
        status = "ok" if not warns else "check"
        print(f"  [{status:5}] {r['artist'] or '?'} - {r['title'] or f.name}  "
              f"({r['scoredTracks']} scored, {r['percent']}% -> {r['finalScore']})")
        for w in warns:
            print(f"            ! {w}")
            flagged += 1

    if args.only:
        carried = len(existing_by_slug) - len(set(existing_by_slug) & {r["slug"] for r in reviews})
        existing_by_slug.update({r["slug"]: r for r in reviews})
        reviews = list(existing_by_slug.values())
        print(f"  ({carried} existing review(s) carried over untouched)")

    known = {r["slug"] for r in reviews}
    for slug in overrides:
        if slug not in known:
            print(f"  ! {OVERRIDE_FILE} has '{slug}', which matches no review "
                  f"- check the spelling against the slugs above")
            flagged += 1

    seen = {}
    for r in reviews:
        seen.setdefault(r["slug"], []).append(r["sourceFile"])
    for slug, srcs in seen.items():
        if len(srcs) > 1:
            print(f"  ! duplicate slug '{slug}' from: {', '.join(srcs)}")
            flagged += 1

    reviews.sort(key=lambda r: (r["artist"] or "").lower())

    for r in reviews:
        r.pop("_fallback", None)

    body = json.dumps(reviews, indent=2, ensure_ascii=False)
    Path(args.out).write_text(
        "// Generated by parse_reviews.py - do not edit by hand.\n"
        "// Re-run the script after adding or changing a review .docx.\n"
        f"const REVIEWS = {body};\n",
        encoding="utf-8",
    )

    print(f"\nWrote {len(reviews)} review(s) to {args.out}")
    if flagged:
        print(f"{flagged} item(s) flagged above - worth a look, but the site still works.")
    if failed:
        print(f"{failed} file(s) could not be read at all.")


if __name__ == "__main__":
    main()
