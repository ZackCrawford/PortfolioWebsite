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

const CATEGORY_ORDER = Object.keys(CATEGORY_DESCRIPTIONS);

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
  mdReady = true;
}

function renderMarkdown(md) {
  setupMarkdown();
  return marked.parse(md || "");
}
