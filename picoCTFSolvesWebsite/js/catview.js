// Category view: one category, centred. A back-out button, the difficulty
// selector and the challenge cards (no category switching: the visitor already chose).
// Used by category.html (as the whole page) and by the landing page, which
// opens it in place after the dive so the scene never reloads.
//
//   const view = createCategoryView(el, { onChange(cat, difficulty), onExit() });
//   view.show("Forensics", "easy");

(function () {
  const grouped = groupSolves(SOLVES);
  const cats = CATEGORY_ORDER.filter((c) => grouped.has(c));
  const pad2 = (n) => String(n).padStart(2, "0");

  function firstFilled(cat) {
    return DIFFICULTY_ORDER.find((d) => grouped.get(cat).get(d).length) || "Easy";
  }
  function pickDifficulty(cat, wanted) {
    return DIFFICULTY_ORDER.find((d) => d.toLowerCase() === String(wanted || "").toLowerCase()) || firstFilled(cat);
  }

  const placeholderSlots = (n) => Array.from({ length: n }, (_, i) =>
    `<li><span>${pad2(i + 1)}</span><i style="width:${[62, 48, 70][i % 3]}%"></i><span>Awaiting challenge</span></li>`).join("");

  function listHtml(cat, d) {
    const items = grouped.get(cat).get(d);
    const color = DIFFICULTY_META[d].color;
    if (!items.length) {
      const alts = DIFFICULTY_ORDER.filter((x) => x !== d && grouped.get(cat).get(x).length);
      return `
        <div class="empty" style="--tc:${color}" role="status">
          <p class="code">Slot empty &middot; 0 challenges</p>
          <h2>Nothing here yet</h2>
          <p>No ${d.toLowerCase()} ${escapeHtml(cat)} challenges have been added. This tier fills in as new picoCTF problems are attempted.</p>
          <ul class="slots" aria-hidden="true">${placeholderSlots(3)}</ul>
          ${alts.length ? `<div class="alts">${alts.map((x) =>
            `<button class="btn-line" type="button" data-d="${x}">View ${x} (${grouped.get(cat).get(x).length}) <span class="arr" aria-hidden="true">&rarr;</span></button>`).join("")}</div>` : ""}
        </div>`;
    }
    return `<ul class="grid">${items.map((s, i) => {
      const solved = isSolved(s);
      return `<li style="--i:${i}"><a class="card ${solved ? "" : "is-locked"}" href="/picoctf/solve?slug=${encodeURIComponent(s.slug)}" style="--tc:${color};view-transition-name:vt-card-${s.slug}">
        <span class="cv-top"><span>${pad2(i + 1)}</span>${solved ? `<span class="badge done">&#10003; Write-up</span>` : `<span class="badge locked">&#9632; Locked</span>`}</span>
        <span class="t" style="view-transition-name:vt-${s.slug}">${escapeHtml(s.title)}</span>
        <span class="e">${escapeHtml(s.event && s.event !== "N/A" ? s.event : "picoGym")}</span>
        <span class="cv-foot"><span class="go">${solved ? "Read write-up" : "View challenge"} &rarr;</span></span>
      </a></li>`;
    }).join("")}</ul>`;
  }

  window.createCategoryView = function (app, { onChange = () => {}, onExit = () => {} } = {}) {
    let category = null, difficulty = null;
    app.classList.add("catview");

    function render(focusTabs) {
      if (!category) {
        app.innerHTML = `<div class="notfound"><p class="eyebrow">Unknown category</p>
          <h1>No such category</h1><p><a class="btn-line" href="/picoctf">All categories <span class="arr">&rarr;</span></a></p></div>`;
        return;
      }
      const byDiff = grouped.get(category);
      const all = DIFFICULTY_ORDER.flatMap((d) => byDiff.get(d));
      const k = cats.indexOf(category);
      const c = CATEGORY_COLOR[category];

      app.style.setProperty("--c", c);
      app.innerHTML = `
        <button type="button" class="back-out" data-exit aria-label="Back to all categories">
          <span class="ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></span>
          Back to the helix <kbd class="k" aria-hidden="true">Esc</kbd>
        </button>
        <div class="head">
          <p class="eyebrow" style="color:${c}"><i aria-hidden="true"></i>Category ${pad2(k + 1)} of ${pad2(cats.length)}<i aria-hidden="true"></i></p>
          <h1><span class="glitch" data-text="${escapeHtml(category)}">${escapeHtml(category)}</span></h1>
          <p class="desc">${escapeHtml(CATEGORY_DESCRIPTIONS[category] || "")}.</p>
          <ul class="cv-stats"><li><b>${all.length}</b>Challenges</li><li><b>${all.filter(isSolved).length}</b>Write-ups</li></ul>
        </div>
        <div class="tabs" role="tablist" aria-label="Difficulty">${DIFFICULTY_ORDER.map((d) => {
          const items = byDiff.get(d), done = items.filter(isSolved).length, color = DIFFICULTY_META[d].color;
          return `<button class="tab ${items.length ? "" : "is-empty"}" role="tab" id="tab-${d}" aria-controls="panel"
            aria-selected="${d === difficulty}" tabindex="${d === difficulty ? 0 : -1}" data-d="${d}" style="--tc:${color}">
            <span class="lab"><span class="dot" style="${items.length ? `background:${color}` : `border:1px solid ${color}`}"></span>${d}</span>
            <span class="num">${items.length}</span>
            <span class="bar" aria-hidden="true">${items.length ? `<i style="width:${(done / items.length) * 100}%"></i>` : ""}</span>
            <span class="sub">${items.length ? `${done} solved` : "Not added yet"}</span>
          </button>`;
        }).join("")}</div>
        <div id="panel" role="tabpanel" aria-labelledby="tab-${difficulty}">${listHtml(category, difficulty)}</div>`;

      glitch(app.querySelector(".glitch"), 80);
      if (focusTabs) app.querySelector(`#tab-${difficulty}`).focus();
    }

    function show(cat, wantedDifficulty, opts = {}) {
      category = typeof cat === "string" && grouped.has(cat) ? cat : categoryFromSlug(cat || "");
      difficulty = category ? pickDifficulty(category, wantedDifficulty) : null;
      render(opts.focusTabs);
      if (category) onChange(category, difficulty, cats.indexOf(category));
    }

    // everything switches in place
    app.addEventListener("click", (e) => {
      if (e.target.closest("[data-exit]")) { e.preventDefault(); onExit(category); return; }
      const dBtn = e.target.closest("[data-d]");
      if (dBtn) show(category, dBtn.dataset.d, { focusTabs: dBtn.classList.contains("tab") });
    });
    // arrow keys move between difficulty tabs
    app.addEventListener("keydown", (e) => {
      if (!e.target.classList.contains("tab") || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      let i = DIFFICULTY_ORDER.indexOf(difficulty);
      if (e.key === "ArrowRight") i = (i + 1) % 3;
      if (e.key === "ArrowLeft") i = (i + 2) % 3;
      if (e.key === "Home") i = 0;
      if (e.key === "End") i = 2;
      show(category, DIFFICULTY_ORDER[i], { focusTabs: true });
    });

    return { show, get category() { return category; }, get difficulty() { return difficulty; } };
  };
  window.CATVIEW_CATS = cats;
})();
