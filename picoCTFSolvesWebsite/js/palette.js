// Command menu for the picoCTF pages: Ctrl+K (or Cmd+K, or "/") opens a search
// over every category and challenge. Loaded after data/picoctf-data.js and render.js.

(function () {
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const KEY_LABEL = isMac ? "⌘K" : "Ctrl K";

  // ---------- index ----------
  const items = [
    ...CATEGORY_ORDER.filter((c) => SOLVES.some((s) => s.category === c)).map((c) => {
      const all = SOLVES.filter((s) => s.category === c);
      return {
        kind: "Category", title: c, url: categoryUrl(c), color: CATEGORY_COLOR[c],
        meta: `${all.filter(isSolved).length}/${all.length} solved`,
        hay: `${c} ${CATEGORY_DESCRIPTIONS[c] || ""}`.toLowerCase(),
      };
    }),
    ...SOLVES.map((s) => ({
      kind: "Challenge", title: s.title, url: `/picoctf/solve?slug=${encodeURIComponent(s.slug)}`,
      color: (DIFFICULTY_META[s.difficulty] || {}).color, solved: isSolved(s),
      meta: `${s.category} · ${s.difficulty}`,
      hay: `${s.title} ${s.category} ${s.difficulty} ${s.event}`.toLowerCase(),
    })),
  ];

  function search(q) {
    q = q.trim().toLowerCase();
    if (!q) return items.filter((i) => i.kind === "Category").concat(items.filter((i) => i.solved).slice(0, 6));
    const words = q.split(/\s+/);
    return items
      .map((i) => {
        if (!words.every((w) => i.hay.includes(w))) return null;
        const t = i.title.toLowerCase();
        const score = (t.startsWith(q) ? 0 : t.includes(q) ? 1 : 2) + (i.kind === "Category" ? -0.5 : 0);
        return { i, score };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score)
      .slice(0, 30)
      .map((x) => x.i);
  }

  // ---------- markup ----------
  const style = document.createElement("style");
  style.textContent = `
.cmdk-btn{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;
  font-family:var(--mono);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;transition:background .2s}
.cmdk-btn:hover{background:rgba(79,224,200,.14);color:#fff}
.cmdk-btn:focus-visible{outline:2px solid var(--teal);outline-offset:2px}
.cmdk-btn svg{width:13px;height:13px}
kbd.k{font-family:var(--mono);font-size:9.5px;letter-spacing:.04em;padding:2px 6px;border-radius:4px;
  border:1px solid var(--line-strong);color:var(--muted);background:rgba(255,255,255,.04);text-transform:none}
@media (max-width:560px){.cmdk-btn .lbl,.cmdk-btn kbd{display:none}}
.cmdk{position:fixed;inset:0;z-index:300;display:flex;justify-content:center;align-items:flex-start;padding:14vh 16px 16px;
  background:rgba(3,4,8,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.cmdk[hidden]{display:none}
.cmdk-panel{width:min(620px,100%);max-height:70vh;display:flex;flex-direction:column;overflow:hidden;border-radius:14px;
  border:1px solid var(--line-strong);background:rgba(10,10,20,.97);box-shadow:0 40px 90px -30px rgba(0,0,0,.9)}
.js:not(.rm) .cmdk:not([hidden]) .cmdk-panel{animation:cmdk-in .22s var(--ease) both}
@keyframes cmdk-in{from{opacity:0;transform:translateY(-8px) scale(.98)}}
.cmdk-field{display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid var(--line)}
.cmdk-field svg{width:16px;height:16px;color:var(--muted);flex:none}
.cmdk-field input{flex:1;min-width:0;border:0;background:none;color:var(--ink);font:inherit;font-family:var(--mono);font-size:13px;outline:none}
.cmdk-field input::placeholder{color:var(--muted)}
.cmdk-list{list-style:none;margin:0;padding:6px;overflow:auto}
.cmdk-group{padding:10px 12px 4px;font-family:var(--mono);font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.cmdk-item a{display:grid;grid-template-columns:10px 1fr auto;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;text-decoration:none;color:var(--text)}
.cmdk-item a .d{width:8px;height:8px;border-radius:50%}
.cmdk-item a .t{font-size:.95rem;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cmdk-item a .m{font-family:var(--mono);font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);white-space:nowrap;font-variant-numeric:tabular-nums}
.cmdk-item[aria-selected="true"] a{background:rgba(79,224,200,.12)}
.cmdk-empty{padding:22px 14px;color:var(--muted);font-size:.92rem}
.cmdk-foot{display:flex;flex-wrap:wrap;gap:6px 16px;padding:10px 16px;border-top:1px solid var(--line);
  font-family:var(--mono);font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
`;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.className = "cmdk";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="cmdk-panel" role="dialog" aria-modal="true" aria-label="Search challenges and categories">
      <label class="cmdk-field">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <span class="visually-hidden">Search</span>
        <input type="text" id="cmdk-input" placeholder="Search challenges and categories" autocomplete="off" spellcheck="false"
          role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-autocomplete="list">
        <kbd class="k">Esc</kbd>
      </label>
      <ul class="cmdk-list" id="cmdk-list" role="listbox"></ul>
      <div class="cmdk-foot" aria-hidden="true">
        <span><kbd class="k">&uarr;</kbd> <kbd class="k">&darr;</kbd> move</span>
        <span><kbd class="k">Enter</kbd> open</span>
        <span><kbd class="k">Esc</kbd> close</span>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const input = overlay.querySelector("input");
  const list = overlay.querySelector("ul");
  let results = [], sel = 0, lastFocus = null;

  function render() {
    results = search(input.value);
    sel = Math.min(sel, Math.max(0, results.length - 1));
    if (!results.length) {
      list.innerHTML = `<li class="cmdk-empty">No matches for &ldquo;${escapeHtml(input.value)}&rdquo;.</li>`;
      input.removeAttribute("aria-activedescendant");
      return;
    }
    let html = "", group = "";
    results.forEach((r, i) => {
      const g = !input.value.trim() && r.kind === "Challenge" ? "Recent write-ups" : r.kind === "Category" ? "Categories" : "Challenges";
      if (g !== group) { group = g; html += `<li class="cmdk-group" role="presentation">${g}</li>`; }
      html += `<li class="cmdk-item" role="option" id="cmdk-${i}" aria-selected="${i === sel}">
        <a href="${r.url}" tabindex="-1"><span class="d" style="background:${r.color || "var(--muted)"}"></span>
        <span class="t">${escapeHtml(r.title)}</span>
        <span class="m">${escapeHtml(r.meta)}${r.kind === "Challenge" ? (r.solved ? " · ✓" : " · locked") : ""}</span></a></li>`;
    });
    list.innerHTML = html;
    input.setAttribute("aria-activedescendant", `cmdk-${sel}`);
  }
  function move(d) {
    if (!results.length) return;
    sel = (sel + d + results.length) % results.length;
    list.querySelectorAll(".cmdk-item").forEach((li, i) => li.setAttribute("aria-selected", String(i === sel)));
    input.setAttribute("aria-activedescendant", `cmdk-${sel}`);
    const li = document.getElementById(`cmdk-${sel}`);
    if (li) li.scrollIntoView({ block: "nearest" });
  }

  function open(seed) {
    if (!overlay.hidden) return;
    lastFocus = document.activeElement;
    overlay.hidden = false;
    input.value = typeof seed === "string" ? seed : "";
    sel = 0;
    render();
    input.focus();
    document.documentElement.style.overflow = "hidden";
  }
  function close() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    document.documentElement.style.overflow = "";
    // let go of the (now hidden) field first; body can't take focus, so blur is what returns it to the page
    input.blur();
    if (lastFocus && lastFocus !== document.body && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  window.openCommandMenu = open;

  input.addEventListener("input", () => { sel = 0; render(); });
  overlay.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter" && results[sel]) { e.preventDefault(); location.href = results[sel].url; }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") { e.preventDefault(); input.focus(); }   // keep focus inside the dialog
  });
  overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) close(); });
  list.addEventListener("mousemove", (e) => {
    const li = e.target.closest(".cmdk-item");
    if (!li) return;
    const i = Number(li.id.slice(5));
    if (i !== sel) { sel = i; move(0); }
  });

  // global shortcuts
  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) { e.preventDefault(); overlay.hidden ? open() : close(); }
    else if (e.key === "/" && !typing && overlay.hidden) { e.preventDefault(); open(); }
  });

  // a search button with its shortcut, at the front of the top nav
  const nav = document.querySelector(".nav");
  if (nav) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cmdk-btn";
    btn.setAttribute("aria-keyshortcuts", isMac ? "Meta+K" : "Control+K");
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
      <span class="lbl">Search</span><kbd class="k">${KEY_LABEL}</kbd><span class="visually-hidden">Search challenges</span>`;
    btn.addEventListener("click", () => open());
    const rule = document.createElement("span");
    rule.className = "rule";
    rule.setAttribute("aria-hidden", "true");
    nav.prepend(btn, rule);
  }
  window.CMDK_LABEL = KEY_LABEL;
})();
