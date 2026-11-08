// Shared rendering helpers for the picoCTF Solves site.
// Consumed by index.html and solve.html after data/picoctf-data.js loads.

const DIFFICULTY_ORDER = ["Easy", "Medium", "Hard"];

const DIFFICULTY_META = {
  Easy: { color: "var(--easy)" },
  Medium: { color: "var(--medium)" },
  Hard: { color: "var(--hard)" },
};

const CATEGORY_DESCRIPTIONS = {
  "Artificial Intelligence": "Prompt injection, model manipulation, and AI system exploitation",
  "Web Exploitation": "Client/server vulnerabilities, SQL, XSS, etc",
  "Cryptography": "Ciphers, encoding schemes, and cryptographic flaws",
  "Reverse Engineering": "Disassembly, decompilation, and binary analysis",
  "Forensics": "File analysis, steganography, and data recovery",
  "General Skills": "Terminal, scripting, and foundational concepts",
  "Binary Exploitation": "Buffer overflows, ROP chains, and memory exploits",
  "Blockchain": "Smart contract vulnerabilities and on-chain analysis",
};

// Categories run from most solved to least: most write-ups first, then the
// higher share solved, then alphabetical. Every page follows this order.
const CATEGORY_ORDER = (() => {
  const stats = {};
  for (const c of Object.keys(CATEGORY_DESCRIPTIONS)) stats[c] = { solved: 0, total: 0 };
  if (typeof SOLVES !== "undefined") {
    for (const s of SOLVES) {
      const st = stats[s.category] || (stats[s.category] = { solved: 0, total: 0 });
      st.total++;
      if (s.solutionMd && s.solutionMd.trim()) st.solved++;
    }
  }
  return Object.keys(stats).sort((a, b) =>
    stats[b].solved - stats[a].solved ||
    stats[b].solved / (stats[b].total || 1) - stats[a].solved / (stats[a].total || 1) ||
    a.localeCompare(b));
})();

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function difficultyDot(difficulty) {
  const meta = DIFFICULTY_META[difficulty] || { color: "var(--muted)" };
  return `<span class="dot" style="background:${meta.color}"></span>`;
}

// category -> difficulty -> [solves], difficulties/categories always
// present (even empty) so "no challenges yet" tiers render consistently.
function groupSolves(solves) {
  const byCategory = new Map();
  for (const cat of CATEGORY_ORDER) {
    const byDiff = new Map();
    for (const d of DIFFICULTY_ORDER) byDiff.set(d, []);
    byCategory.set(cat, byDiff);
  }
  for (const s of solves) {
    if (!byCategory.has(s.category)) {
      const byDiff = new Map();
      for (const d of DIFFICULTY_ORDER) byDiff.set(d, []);
      byCategory.set(s.category, byDiff);
    }
    byCategory.get(s.category).get(s.difficulty).push(s);
  }
  return byCategory;
}

let mdReady = false;
function setupMarkdown() {
  if (mdReady) return;
  marked.setOptions({
    highlight(code, lang) {
      const language = window.hljs && hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
    langPrefix: "hljs language-",
    gfm: true,
  });
  // Write-ups are rendered as HTML, so never let the source inject markup or
  // script: raw HTML shows as text, and links/images must be http(s), mailto,
  // or on-site. Returning false falls back to marked's default rendering.
  const safeUrl = (u) => /^(https?:|mailto:|#|\/(?!\/))/i.test(String(u || "").trim());
  marked.use({
    renderer: {
      html(raw) { return escapeHtml(raw); },
      link(href, title, text) { return safeUrl(href) ? false : text; },
      image(href, title, text) { return safeUrl(href) ? false : escapeHtml(text || ""); },
    },
  });
  mdReady = true;
}

function renderMarkdown(md) {
  setupMarkdown();
  return marked.parse(md || "");
}

// ---------- shared by the landing, category, and solve pages ----------

// Particle shape each category morphs into (see js/particles.js).
const CATEGORY_SHAPE = {
  "Artificial Intelligence": "network",
  "Web Exploitation": "globe",
  "Cryptography": "padlock",
  "Reverse Engineering": "gear",
  "Forensics": "magnifier",
  "General Skills": "terminal",
  "Binary Exploitation": "stack",
  "Blockchain": "chain",
};

// Accent colour per category, reused for borders and glows. Assigned by position
// in CATEGORY_ORDER, cycling four colours, so neighbouring categories always differ.
const CATEGORY_COLOR = Object.fromEntries(
  CATEGORY_ORDER.map((c, i) => [c, ["#4fe0c8", "#9a7bff", "#ffc46b", "#ff6b7d"][i % 4]]));

function categorySlug(category) {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function categoryFromSlug(slug) {
  return CATEGORY_ORDER.find((c) => categorySlug(c) === slug) || null;
}

function categoryUrl(category, difficulty) {
  const d = difficulty ? `&d=${difficulty.toLowerCase()}` : "";
  return `/picoctf/category?c=${categorySlug(category)}${d}`;
}

// A challenge counts as solved once its write-up has been published.
function isSolved(solve) {
  return Boolean(solve.solutionMd && solve.solutionMd.trim());
}

// Restart the CSS glitch animation on an element.
function glitch(el, delay = 0) {
  if (!el || document.documentElement.classList.contains("rm")) return;
  setTimeout(() => {
    el.classList.remove("is-glitching");
    void el.offsetWidth;
    el.classList.add("is-glitching");
  }, delay);
}
