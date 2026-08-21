/* Fuzzy album search.
 *
 * Drop this in with <script src="js/search.js"></script> after data/reviews-data.js,
 * and give the search button a data-search-toggle attribute. Styles are
 * injected below, so nothing needs adding to either page's stylesheet.
 *
 * Matching is typo- and spacing-tolerant: "mad villainy" finds Madvillainy,
 * "who really kares" finds Who Really Cares. It compares normalised strings
 * (lowercase, punctuation and spaces stripped) using edit distance, so it is
 * fuzzy rather than semantic - it won't find an album by describing it.
 */
(function () {
  "use strict";

  var MAX_RESULTS = 8;
  var THRESHOLD = 0.5;

  // Query length is measured after normalising, so it counts letters and
  // digits only - "one x" is four.
  var MIN_QUERY  = 2;   // below this, show nothing at all
  var FUZZY_FROM = 5;   // below this, only match the START of a title or artist

  var ALL = (typeof REVIEWS !== "undefined") ? REVIEWS : [];
  if (!ALL.length) return;

  // ---------- matching ----------

  function norm(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  // Levenshtein distance, two-row variant so long titles stay cheap.
  function editDistance(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var prev = new Array(b.length + 1);
    var curr = new Array(b.length + 1);
    for (var j = 0; j <= b.length; j++) prev[j] = j;
    for (var i = 1; i <= a.length; i++) {
      curr[0] = i;
      for (var k = 1; k <= b.length; k++) {
        var cost = a.charCodeAt(i - 1) === b.charCodeAt(k - 1) ? 0 : 1;
        curr[k] = Math.min(curr[k - 1] + 1, prev[k] + 1, prev[k - 1] + cost);
      }
      var tmp = prev; prev = curr; curr = tmp;
    }
    return prev[b.length];
  }

  function similarity(a, b) {
    var longest = Math.max(a.length, b.length);
    return longest ? 1 - editDistance(a, b) / longest : 0;
  }

  // Best fuzzy match of `q` against any same-length slice of `text`, so a
  // partial query still scores well against a long title.
  function windowed(q, text) {
    if (q.length >= text.length) return similarity(q, text);
    var best = 0;
    for (var i = 0; i <= text.length - q.length; i++) {
      var s = similarity(q, text.substr(i, q.length));
      if (s > best) best = s;
      if (best === 1) break;
    }
    return best;
  }

  function score(query, review) {
    var q = norm(query);
    if (q.length < MIN_QUERY) return 0;

    var title = norm(review.title);
    var artist = norm(review.artist);
    var best = 0;

    // Prefix matches always count.
    if (title.indexOf(q) === 0) best = 1.0;
    if (artist.indexOf(q) === 0) best = Math.max(best, 0.82);

    // Short queries stop here. Matching "t" anywhere in a title would return
    // nearly the whole library, so 2-4 letters only match from the start.
    if (q.length < FUZZY_FROM) return best;

    // From five letters on, match anywhere and tolerate typos.
    if (title.indexOf(q) !== -1) best = Math.max(best, 0.92);
    else if (artist.indexOf(q) !== -1) best = Math.max(best, 0.74);

    best = Math.max(best, windowed(q, title) * 0.88);
    best = Math.max(best, windowed(q, artist) * 0.70);
    return best;
  }

  function search(query) {
    return ALL
      .map(function (r) { return { r: r, s: score(query, r) }; })
      .filter(function (x) { return x.s >= THRESHOLD; })
      .sort(function (a, b) {
        return b.s - a.s || a.r.title.localeCompare(b.r.title);
      })
      .slice(0, MAX_RESULTS);
  }

  // ---------- markup ----------

  var css = document.createElement("style");
  css.textContent = [
    ".search-wrap{position:relative}",
    ".search-panel{position:absolute;top:calc(100% + 10px);right:0;width:min(420px,calc(100vw - 32px));",
    "background:var(--haze);border:1px solid var(--line);border-radius:12px;padding:10px;z-index:60;",
    "box-shadow:0 18px 40px rgba(0,0,0,.45);display:none}",
    ".search-panel.open{display:block}",
    ".search-input{width:100%;padding:11px 14px;border-radius:8px;background:var(--paper);",
    "border:1px solid var(--line);color:var(--ink);font:inherit;font-size:15px}",
    ".search-input:focus{outline:none;border-color:var(--violet)}",
    ".search-input::placeholder{color:var(--muted)}",
    ".search-results{list-style:none;margin:10px 0 0;padding:0;max-height:60vh;overflow-y:auto}",
    ".search-results li{margin:0}",
    ".search-results a{display:flex;gap:11px;align-items:center;padding:9px;border-radius:8px;text-decoration:none}",
    ".search-results a:hover,.search-results a.active{background:rgba(124,58,237,.22)}",
    ".search-thumb{width:42px;height:42px;flex:0 0 auto;border:1px solid var(--outline,#9d4edd);",
    "border-radius:5px;overflow:hidden;background:transparent}",
    ".search-thumb img{width:100%;height:100%;object-fit:cover;display:block}",
    // flex:1 1 auto + min-width:0 lets this shrink so long titles ellipsis
    // instead of pushing into the score.
    ".search-meta{flex:1 1 auto;min-width:0;overflow:hidden}",
    // display:block is what separates the two lines and makes ellipsis work.
    ".search-artist{display:block;font-size:12px;color:var(--muted);line-height:1.35;",
    "white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".search-title{display:block;font-size:14.5px;font-weight:600;color:var(--ink);line-height:1.35;",
    "white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".search-score{flex:0 0 auto;font-size:15px}",
    ".search-empty{padding:16px 9px;color:var(--muted);font-size:14px;text-align:center}",
    ".search-hint{padding:6px 9px 2px;color:var(--muted);font-size:11.5px;letter-spacing:.04em;text-transform:uppercase}"
  ].join("");
  document.head.appendChild(css);

  var toggle = document.querySelector("[data-search-toggle]");
  if (!toggle) return;

  var wrap = document.createElement("span");
  wrap.className = "search-wrap";
  toggle.parentNode.insertBefore(wrap, toggle);
  wrap.appendChild(toggle);

  var panel = document.createElement("div");
  panel.className = "search-panel";
  panel.innerHTML =
    '<input type="text" class="search-input" placeholder="Search albums or artists\u2026"' +
    ' aria-label="Search reviews" autocomplete="off" spellcheck="false">' +
    '<ul class="search-results" role="listbox"></ul>';
  wrap.appendChild(panel);

  var input = panel.querySelector(".search-input");
  var list = panel.querySelector(".search-results");
  var active = -1;
  var current = [];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function render(q) {
    current = norm(q).length >= MIN_QUERY ? search(q) : [];
    active = -1;

    var n = norm(q).length;
    if (n < MIN_QUERY) {
      list.innerHTML = '<li class="search-hint">' +
        (n === 0 ? "Type an album or artist name" : "Keep typing\u2026") + '</li>';
      return;
    }
    if (!current.length) {
      list.innerHTML = '<li class="search-empty">' +
        (n < FUZZY_FROM
          ? "Nothing starts with \u201c" + esc(q.trim()) + "\u201d \u2014 type " +
            (FUZZY_FROM - n) + " more letter" + (FUZZY_FROM - n === 1 ? "" : "s") +
            " to search inside titles"
          : "Nothing matches \u201c" + esc(q.trim()) + "\u201d") +
        '</li>';
      return;
    }
    list.innerHTML = current.map(function (x, i) {
      var r = x.r;
      return '<li role="option"><a href="review.html?album=' + encodeURIComponent(r.slug) + '"' +
        ' data-i="' + i + '">' +
        '<span class="search-thumb"><img src="covers/' + encodeURIComponent(r.slug) + '.jpg"' +
        ' alt="" loading="lazy" onerror="this.remove()"></span>' +
        '<span class="search-meta">' +
        '<span class="search-artist">' + esc(r.artist) + '</span>' +
        '<span class="search-title">' + esc(r.title) + '</span>' +
        '</span>' +
        '<span class="search-score ' + "sc-pill " + (window.scoreClass ? window.scoreClass(r.finalScore) : "") + '">' +
        (r.finalScore != null ? r.finalScore.toFixed(1) : "\u2014") + '</span>' +
        '</a></li>';
    }).join("");
  }

  function highlight(n) {
    var links = list.querySelectorAll("a");
    if (!links.length) return;
    active = (n + links.length) % links.length;
    for (var i = 0; i < links.length; i++) {
      links[i].classList.toggle("active", i === active);
    }
    links[active].scrollIntoView({ block: "nearest" });
  }

  function open() {
    panel.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");
    render(input.value);
    input.focus();
    input.select();
  }

  function close() {
    panel.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }

  toggle.setAttribute("aria-expanded", "false");
  toggle.addEventListener("click", function (e) {
    e.preventDefault();
    panel.classList.contains("open") ? close() : open();
  });

  input.addEventListener("input", function () { render(input.value); });

  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); highlight(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); highlight(active - 1); }
    else if (e.key === "Enter") {
      var links = list.querySelectorAll("a");
      var pick = active >= 0 ? links[active] : links[0];
      if (pick) { e.preventDefault(); window.location.href = pick.getAttribute("href"); }
    } else if (e.key === "Escape") { close(); toggle.focus(); }
  });

  list.addEventListener("mousemove", function (e) {
    var a = e.target.closest("a");
    if (a) highlight(parseInt(a.dataset.i, 10));
  });

  document.addEventListener("click", function (e) {
    if (!wrap.contains(e.target)) close();
  });

  // "/" opens search from anywhere on the page
  document.addEventListener("keydown", function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (e.key === "/" && !typing) { e.preventDefault(); open(); }
  });
})();
