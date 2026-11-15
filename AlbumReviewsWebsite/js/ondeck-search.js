/* Search over the On deck queue (data/queue.js), shared by the front page and
 * the subscribe page's "Specific albums" checklist.
 *
 *   OnDeck.search("astroworl", QUEUE)  ->  [{ item, score, loose }, ...] best first
 *   OnDeck.sorted(QUEUE)               ->  queue sorted by title, ignoring "The"/"A"
 *
 * Forgiving rather than literal: case, accents and punctuation don't matter,
 * "$" reads as "s" and "&" as "and", partial words match ("astro"), small typos
 * are tolerated ("astroworl", "madvilany"), artist or title words can be mixed
 * in any order ("yeat 2093"), and years or decades work ("1994", "90s").
 * If nothing matches every word, the closest partial matches come back marked
 * loose: true so the page can label them as near misses.
 */
(function (global) {
  "use strict";

  var STOP = { the: 1, a: 1, an: 1, by: 1, album: 1, albums: 1 };

  function norm(s) {
    return String(s == null ? "" : s).toLowerCase()
      .normalize("NFKD").replace(/[̀-ͯ]/g, "")
      .replace(/æ/g, "ae").replace(/ø/g, "o").replace(/ß/g, "ss")
      .replace(/\$/g, "s").replace(/&/g, " and ").replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, " ").trim();
  }
  function tokens(s) { return norm(s).split(" ").filter(Boolean); }

  // edit distance, bailing out early once it can't be within max
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i]; var best = i;
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }

  // index each queue entry once
  var cache = typeof WeakMap !== "undefined" ? new WeakMap() : null;
  function indexOf(item) {
    var hit = cache && cache.get(item);
    if (hit) return hit;
    var words = tokens(item.title).concat(tokens(item.artist));
    var idx = {
      words: words,
      title: norm(item.title),
      squashed: norm(item.title + " " + item.artist).replace(/ /g, ""),
      year: parseInt(item.year, 10) || null,
    };
    if (cache) cache.set(item, idx);
    return idx;
  }

  function tokenScore(t, idx) {
    var dec = t.match(/^(?:19|20)?(\d)0s$/);          // "90s", "1990s"
    if (dec && idx.year) {
      var d = +dec[1], y = idx.year % 100;
      if (Math.floor(y / 10) === d) return 0.8;
    }
    if (/^\d{4}$/.test(t) && idx.year === +t) return 1;
    var best = 0;
    for (var i = 0; i < idx.words.length; i++) {
      var w = idx.words[i];
      if (w === t) return 1;
      if (t.length >= 2 && w.indexOf(t) === 0) best = Math.max(best, 0.85);
      else if (t.length >= 4 && w.length >= 4) {
        var max = t.length >= 7 ? 2 : 1;
        if (lev(t, w, max) <= max) best = Math.max(best, 0.65);
        else if (t.length >= 5 && w.length > t.length && lev(t, w.slice(0, t.length), 1) <= 1) best = Math.max(best, 0.55);
      }
    }
    if (!best && t.length >= 3 && idx.squashed.indexOf(t) !== -1) best = 0.5; // inside a run-together word
    return best;
  }

  function search(query, list) {
    var q = tokens(query).filter(function (t) { return !STOP[t]; });
    if (!q.length) q = tokens(query);
    if (!q.length) return [];
    var whole = q.join("");
    var strict = [], loose = [];
    (list || []).forEach(function (item) {
      var idx = indexOf(item);
      var scores = q.map(function (t) { return tokenScore(t, idx); });
      var hits = scores.filter(function (s) { return s > 0; }).length;
      var avg = scores.reduce(function (a, b) { return a + b; }, 0) / q.length;
      if (whole.length >= 4 && idx.squashed.indexOf(whole) !== -1) avg = Math.max(avg, 0.9); // "atlonglast"
      if (idx.title === q.join(" ")) avg += 0.5;                                              // exact title
      if (hits === q.length || avg >= 0.9) strict.push({ item: item, score: avg, loose: false });
      else if (hits && scores.some(function (s, i) { return s >= 0.65 && q[i].length >= 3; })) {
        loose.push({ item: item, score: avg * hits / q.length, loose: true });
      }
    });
    var byScore = function (a, b) { return b.score - a.score || sortKey(a.item).localeCompare(sortKey(b.item)); };
    if (strict.length) {
      // when some albums match outright, drop typo-level near misses well below
      // them ("yeat" should list Yeat, not The Beatles)
      var top = Math.max.apply(null, strict.map(function (r) { return r.score; }));
      return strict.filter(function (r) { return r.score >= top - 0.25; }).sort(byScore);
    }
    return loose.sort(byScore).slice(0, 6);
  }

  function sortKey(a) { return norm(a.title).replace(/^(the|a|an) /, ""); }
  function sorted(list) {
    return (list || []).slice().sort(function (a, b) { return sortKey(a).localeCompare(sortKey(b)); });
  }

  global.OnDeck = { search: search, sorted: sorted };
})(window);
