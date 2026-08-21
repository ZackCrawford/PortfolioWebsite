#!/usr/bin/env python3
"""
parse_picoctf.py - turn the picoCTF-Solves GitHub repo into picoctf-data.js

Usage:
    python scripts/parse_picoctf.py

Run from the picoCTFSolvesWebsite/ folder. Pulls every write-up .md file
from github.com/ZackCrawford/picoCTF-Solves (public repo, no auth needed)
and writes a single JS data file the site reads. Re-run any time new
solves are pushed to that repo.

No installs needed - uses only the Python standard library.
"""

import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPO = "ZackCrawford/picoCTF-Solves"
BRANCH = "main"
ROOT = "picoCTF Solves"
API_TREE = f"https://api.github.com/repos/{REPO}/git/trees/{BRANCH}?recursive=true"
RAW_BASE = f"https://raw.githubusercontent.com/{REPO}/{BRANCH}/"
DIFFICULTIES = {"easy", "medium", "hard"}

LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")


def http_get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "picoctf-site-builder"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def fetch_tree() -> list:
    return json.loads(http_get(API_TREE))["tree"]


def fetch_raw(path: str) -> str:
    url = RAW_BASE + urllib.parse.quote(path, safe="/")
    return http_get(url).decode("utf-8")


def slugify(*parts: str) -> str:
    s = "-".join(parts).lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def parse_info_table(md: str) -> dict:
    m = re.search(r"<table>(.*?)</table>", md, re.S)
    info = {}
    if not m:
        return info
    for row in re.findall(r"<tr>(.*?)</tr>", m.group(1), re.S):
        cells = re.findall(r"<td>(.*?)</td>", row, re.S)
        if len(cells) != 2:
            continue
        key = re.sub(r"</?strong>", "", cells[0]).strip()
        val = re.sub(r"<.*?>", "", cells[1]).strip()
        info[key] = val
    return info


def extract_links(text: str) -> list:
    return [{"text": t.strip(), "url": u.strip()} for t, u in LINK_RE.findall(text)]


def parse_solve(md: str, fallback_title: str) -> dict:
    md = md.replace("\r\n", "\n").replace("\r", "\n")
    md = md.replace("—", " - ")

    title_m = re.search(r"\*\*\*(.+?)\*\*\*", md)
    title = title_m.group(1).strip() if title_m else fallback_title

    info = parse_info_table(md)
    event = info.get("Event", "").strip()
    author = info.get("Author", "").strip()

    desc = ""
    dm = re.search(r"\*\*Description:\*\*\s*\n(.*?)\n---", md, re.S)
    if dm:
        desc = dm.group(1).strip()

    hints = [h.strip() for h in re.findall(r"^>\s*\*\*Hint:\*\*\s*(.+)$", md, re.M)]

    # Leftover prose between the description and "## Solution" - e.g. an
    # "Extra Note" aside - minus hint lines and the unfilled
    # "**Connect via xxx:**" boilerplate stub some files still carry.
    notes = ""
    tail_m = re.search(
        r"\*\*Description:\*\*.*?\n---\n(.*?)##\s*\*\*Solution\*\*", md, re.S
    )
    if tail_m:
        kept = []
        for seg in tail_m.group(1).split("---"):
            seg = seg.strip()
            if not seg or re.match(r"^>\s*\*\*Hint:\*\*", seg):
                continue
            if "**connect via" in seg.lower() and "xxx" in seg.lower():
                continue
            kept.append(seg)
        notes = "\n\n".join(kept).strip()

    sol = ""
    sm = re.search(
        r"##\s*\*\*Solution\*\*\s*\n(.*?)\n##\s*\*\*References\*\*", md, re.S
    )
    if sm:
        sol = sm.group(1).strip()

    refs = []
    rm = re.search(r"##\s*\*\*References\*\*\s*\n(.*)$", md, re.S)
    if rm:
        refs = extract_links(rm.group(1))

    flags = re.findall(r"picoCTF\{[^}]*\}", sol)
    flag = flags[-1] if flags else None

    return {
        "title": title,
        "event": event,
        "author": author,
        "description": desc,
        "hints": hints,
        "notes": notes,
        "solutionMd": sol,
        "references": refs,
        "flag": flag,
    }


def main():
    print("Fetching repo tree...")
    tree = fetch_tree()

    entries = []
    seen_slugs = set()

    for node in tree:
        if node["type"] != "blob":
            continue
        path = node["path"]
        if not path.startswith(ROOT + "/"):
            continue
        parts = path[len(ROOT) + 1 :].split("/")
        if len(parts) != 3:
            continue
        category, difficulty, filename = parts
        if difficulty.lower() not in DIFFICULTIES:
            continue
        if not filename.lower().endswith(".md") or filename.lower() == "info.md":
            continue

        print(f"  {path}")
        try:
            md = fetch_raw(path)
        except urllib.error.URLError as e:
            print(f"  ! failed to fetch {path}: {e} - skipping", file=sys.stderr)
            continue

        rec = parse_solve(md, fallback_title=Path(filename).stem)
        rec["category"] = category
        rec["difficulty"] = difficulty

        base_slug = slugify(category, difficulty, rec["title"])
        slug = base_slug
        n = 2
        while slug in seen_slugs:
            slug = f"{base_slug}-{n}"
            n += 1
        seen_slugs.add(slug)
        rec["slug"] = slug

        entries.append(rec)

    entries.sort(key=lambda r: (r["category"], r["difficulty"], r["title"]))

    out = Path("data/picoctf-data.js")
    out.parent.mkdir(exist_ok=True)
    with out.open("w", encoding="utf-8") as f:
        f.write("// Generated by parse_picoctf.py - do not edit by hand.\n")
        f.write("// Re-run the script after pushing new solves to the GitHub repo.\n")
        f.write("const SOLVES = ")
        f.write(json.dumps(entries, indent=2, ensure_ascii=False))
        f.write(";\n")

    print(f"Wrote {len(entries)} solve(s) to {out}")


if __name__ == "__main__":
    main()
