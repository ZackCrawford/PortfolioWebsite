// Scroll choreography for the front page: project ring, filters, glitches,
// background shifts, and the hand-off to the WebGL scene (scene.js).

const root = document.documentElement;
const reduced = root.classList.contains("rm");

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (v, a, b) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const intro = document.getElementById("intro");
const work = document.getElementById("work");
const workSticky = work.querySelector(".sticky");
const record = document.getElementById("record");
const ring = document.getElementById("ring");
const ringBack = document.getElementById("ring-back");
const ringBackInner = document.getElementById("ring-back-inner");
let scene = null;   // the WebGL scene, once it has loaded
const cards = Array.from(ring.querySelectorAll(".card"));
const N = cards.length;
const countCur = document.getElementById("count-cur");
const heroMeta = document.querySelector(".hero-meta");
const introParts = Array.from(intro.querySelectorAll(".intro-inner > *"));

document.getElementById("count-total").textContent = String(N).padStart(2, "0");

// Track lengths scale with the number of projects so each card gets a beat.
if (!reduced) {
  work.style.height = `${(N - 1) * 55 + 100}vh`;
}

/* ---------- ghosts: copies of each card drawn behind the helix ---------- */
const ghosts = cards.map((card, i) => {
  const g = card.cloneNode(true);
  g.removeAttribute("href");
  g.removeAttribute("tabindex");
  g.classList.add("ghost");
  g.style.visibility = "hidden";
  g.addEventListener("click", () => scrollToCard(i));
  ringBackInner.appendChild(g);
  return g;
});

/* ---------- glitch helper ---------- */
function glitch(el, delay = 0) {
  if (reduced || !el) return;
  setTimeout(() => {
    el.classList.remove("is-glitching");
    void el.offsetWidth; // restart the animation
    el.classList.add("is-glitching");
  }, delay);
}

/* ---------- scroll measurements ---------- */
function trackProgress(el) {
  const r = el.getBoundingClientRect();
  const span = r.height - innerHeight;
  return span > 0 ? clamp(-r.top / span) : 0;
}

function cardScrollTop(i) {
  const span = work.offsetHeight - innerHeight;
  return work.offsetTop + (i / (N - 1)) * span;
}

function scrollToCard(i) {
  i = clamp(i, 0, N - 1);
  window.scrollTo({ top: cardScrollTop(i), behavior: reduced ? "auto" : "smooth" });
}

/* ---------- filters ---------- */
let filter = "all";
const matches = (card) => filter === "all" || card.dataset.cat === filter;

document.querySelectorAll(".filters button").forEach((btn) => {
  btn.addEventListener("click", () => {
    filter = btn.dataset.filter;
    document.querySelectorAll(".filters button").forEach((b) =>
      b.setAttribute("aria-pressed", String(b === btn))
    );
    cards.forEach((c, i) => {
      c.classList.toggle("is-dim", !matches(c));
      ghosts[i].classList.toggle("is-dim", !matches(c));
    });
    const first = cards.findIndex(matches);
    if (first >= 0 && !reduced) scrollToCard(first);
  });
});

/* ---------- pager ---------- */
let active = 0;
function step(dir) {
  for (let i = active + dir; i >= 0 && i < N; i += dir) {
    if (matches(cards[i])) return scrollToCard(i);
  }
}
document.getElementById("prev").addEventListener("click", () => step(-1));
document.getElementById("next").addEventListener("click", () => step(1));

/* ---------- card interaction ---------- */
cards.forEach((card, i) => {
  // A side card brings itself to the front instead of navigating away.
  card.addEventListener("click", (e) => {
    if (!reduced && i !== active) {
      e.preventDefault();
      scrollToCard(i);
    }
  });
  // Keyboard users tabbing through the ring rotate it as they go.
  card.addEventListener("focus", () => {
    if (!reduced && i !== active) scrollToCard(i);
  });
});

/* ---------- copy email ---------- */
const copyBtn = document.getElementById("copy-email");
copyBtn.addEventListener("click", async () => {
  const email = copyBtn.dataset.email;
  const label = copyBtn.querySelector("span");
  try {
    await navigator.clipboard.writeText(email);
    label.textContent = "Copied";
    document.getElementById("copy-status").textContent = "Email address copied";
  } catch (e) {
    // Clipboard blocked (e.g. insecure context): select-and-copy fallback.
    const t = document.createElement("textarea");
    t.value = email; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select();
    const ok = document.execCommand("copy");
    t.remove();
    label.textContent = ok ? "Copied" : "Press Ctrl+C";
  }
  copyBtn.classList.add("is-done");
  setTimeout(() => { label.textContent = "Copy"; copyBtn.classList.remove("is-done"); }, 2000);
});

document.getElementById("to-top").addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  document.querySelector(".brand").focus({ preventScroll: true });
});

/* ---------- record: reveal on scroll ---------- */
if (!reduced && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("is-visible");
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: "0px 0px -12% 0px" });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
} else {
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
}

/* ---------- ring layout ---------- */
// Cards sit on a tilted orbit around the helix. The near half is drawn above
// the canvas; the far half is shown through the ghost copies underneath it.
// With the 3D scene running, every card is placed from the helix itself, so it
// travels with its attachment dot with no slack.
const pose = {};
function layoutLimbs(f, stickyTop) {
  ringBackInner.style.transform = "none";
  cards.forEach((card, i) => {
    scene.cardPose(i, pose);
    const d = i - f;
    const vis = 1 - smooth(Math.abs(d), 2.2, 3.2);
    const cos = pose.cos;
    const transform = `perspective(${pose.persp.toFixed(0)}px) translate3d(${pose.x.toFixed(1)}px, ${pose.y.toFixed(1)}px, ${pose.z.toFixed(1)}px) rotateY(${pose.rot.toFixed(4)}rad)`;
    const ghost = ghosts[i];
    if (vis <= 0.001) {
      ghost.style.visibility = "hidden";
      card.style.visibility = "hidden";
    } else if (cos < -0.05 && document.activeElement !== card) {
      ghost.style.transform = transform;
      ghost.style.visibility = "";
      ghost.style.filter = card.classList.contains("is-dim") ? "" : `blur(${(1.2 - cos * 0.4).toFixed(2)}px) brightness(${(0.5 + 0.2 * (1 + cos)).toFixed(3)})`;
      ghost.style.zIndex = String(Math.round(cos * 100) + 100);
      ghost.style.opacity = vis.toFixed(3);
      card.style.visibility = "hidden";
    } else {
      ghost.style.visibility = "hidden";
      card.style.visibility = "";
      // the stage scrolls with the page until it pins; cancel that so cards stay on the helix
      card.style.transform = `translateY(${(-stickyTop).toFixed(1)}px) ` + transform;
      card.style.filter = card.classList.contains("is-dim") || cos > 0.95 ? ""
        : `blur(${((1 - cos) * 1.2).toFixed(2)}px) brightness(${(0.62 + 0.38 * smooth(cos, 0, 0.95)).toFixed(3)})`;
      card.style.zIndex = String(Math.round(cos * 100) + 100);
      card.style.opacity = vis.toFixed(3);
    }
  });
}

function layoutRing(f, stickyTop) {
  const step = (Math.PI * 2) / N;
  const W = cards[0].offsetWidth;
  // On phones the ring is tighter and flatter so neighbours peek in from the
  // screen edges instead of filling the screen.
  const narrow = innerWidth < 720;
  const R = narrow ? W * 1.12 : Math.max(innerWidth * 0.42, W * 1.15);
  const tilt = narrow ? innerHeight * 0.09 : Math.min(innerHeight * 0.24, 220);   // left/right height offset
  const lift = narrow ? innerHeight * 0.1 : Math.min(innerHeight * 0.2, 180);     // far cards rise above the near ones

  ringBackInner.style.transform = `translateY(${stickyTop.toFixed(1)}px)`;

  cards.forEach((card, i) => {
    // Projects run in order: nothing sits before the first one, and cards more
    // than half a turn away fade out instead of wrapping round to the far side.
    const d = i - f;
    const vis = 1 - smooth(Math.abs(d), N / 2 - 0.9, N / 2 - 0.15);
    const theta = d * step;
    const cos = Math.cos(theta), sin = Math.sin(theta);
    const x = sin * R;
    const z = (cos - 1) * R;
    const y = sin * tilt - (1 - cos) * lift;
    // faces straight out from the helix, like a limb: front-on at the front, edge-on at the sides
    const rot = theta;
    const transform =
      `perspective(1600px) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${rot.toFixed(4)}rad)`;
    const behind = cos < -0.05;
    const ghost = ghosts[i];

    if (vis <= 0.001) {
      ghost.style.visibility = "hidden";
      card.style.visibility = "hidden";
    } else if (behind && document.activeElement !== card) {
      ghost.style.transform = transform;
      ghost.style.visibility = "";
      ghost.style.filter = card.classList.contains("is-dim") ? "" : `blur(${(1.2 - cos * 0.4).toFixed(2)}px) brightness(${(0.5 + 0.2 * (1 + cos)).toFixed(3)})`;
      ghost.style.zIndex = String(Math.round(cos * 100) + 100);
      ghost.style.opacity = vis.toFixed(3);
      card.style.visibility = "hidden";
    } else {
      ghost.style.visibility = "hidden";
      card.style.visibility = "";
      card.style.transform = transform;
      card.style.filter = card.classList.contains("is-dim") || cos > 0.95 ? ""
        : `blur(${((1 - cos) * 1.2).toFixed(2)}px) brightness(${(0.62 + 0.38 * smooth(cos, 0, 0.95)).toFixed(3)})`;
      card.style.zIndex = String(Math.round(cos * 100) + 100);
      card.style.opacity = vis.toFixed(3);
    }
  });
}

/* ---------- background tint per section ---------- */
const tints = [
  [5, 6, 10],   // hero
  [7, 9, 20],   // intro
  [13, 8, 26],  // work
  [6, 6, 10],   // record + footer
];
function mix(a, b, t) {
  return a.map((v, k) => Math.round(v + (b[k] - v) * t));
}

/* ---------- section navigator ---------- */
const SECTIONS = [
  { name: "Main", y: () => 0 },
  { name: "Info", y: () => intro.offsetTop + 0.18 * (intro.offsetHeight - innerHeight) },
  { name: "Projects", y: () => work.offsetTop },
  { name: "Record", y: () => record.offsetTop - 20 },
  { name: "Contact", y: () => document.documentElement.scrollHeight - innerHeight },
];
const rail = document.getElementById("rail");
const railMenu = document.getElementById("rail-menu");
const railAll = document.getElementById("rail-all");
const pad2 = (n) => String(n).padStart(2, "0");
railMenu.innerHTML = SECTIONS.map((sec, k) =>
  `<li><a href="#" data-k="${k}" style="--c:${["#4fe0c8", "#9a7bff", "#ffc46b", "#ff6b7d", "#4fe0c8"][k]}">
    <span class="n">${pad2(k + 1)}</span><span class="d" aria-hidden="true"></span><span>${sec.name}</span><span class="s"></span></a></li>`).join("");
const railLinks = Array.from(railMenu.querySelectorAll("a"));
let secK = -1;
function currentSection() {
  const y = window.scrollY + 40;
  let k = 0;
  SECTIONS.forEach((sec, i) => { if (y >= sec.y()) k = i; });
  return k;
}
function goSection(k) {
  if (k < 0 || k >= SECTIONS.length) return;
  window.scrollTo({ top: SECTIONS[k].y(), behavior: reduced ? "auto" : "smooth" });
}
function setMenu(open) {
  railMenu.hidden = !open;
  railAll.setAttribute("aria-expanded", String(open));
  if (open) (railMenu.querySelector('[aria-current="true"]') || railLinks[0]).focus();
}
function updateRail() {
  const k = currentSection();
  if (k === secK) return;
  secK = k;
  railLinks.forEach((a, j) => a.setAttribute("aria-current", String(j === k)));
  document.getElementById("rail-count").textContent = `Section ${pad2(k + 1)} of ${pad2(SECTIONS.length)}`;
  document.getElementById("rail-name").innerHTML = `<i style="--c:${railLinks[k].style.getPropertyValue("--c")}"></i>${SECTIONS[k].name}`;
  document.getElementById("rail-prev").disabled = k <= 0;
  document.getElementById("rail-next").disabled = k >= SECTIONS.length - 1;
}
document.getElementById("rail-prev").addEventListener("click", () => goSection(secK - 1));
document.getElementById("rail-next").addEventListener("click", () => goSection(secK + 1));
document.getElementById("rail-top").addEventListener("click", () => goSection(0));
railAll.addEventListener("click", () => setMenu(railMenu.hidden));
railLinks.forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); setMenu(false); goSection(Number(a.dataset.k)); }));
document.addEventListener("click", (e) => { if (!rail.contains(e.target)) setMenu(false); });
rail.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !railMenu.hidden) { setMenu(false); railAll.focus(); }
  if (!railMenu.hidden && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
    e.preventDefault();
    const i = railLinks.indexOf(document.activeElement);
    railLinks[(i + (e.key === "ArrowDown" ? 1 : railLinks.length - 1)) % railLinks.length].focus();
  }
});

// Keyboard: PageDown/Space next section, PageUp/Shift+Space previous, Home/End.
// (Arrow keys keep their normal job of scrolling a little.)
document.addEventListener("keydown", (e) => {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  const tag = e.target.tagName;
  // leave keys alone while typing, and let Space/Enter press buttons and links
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || e.target.isContentEditable) return;
  if (e.key === " " && /^(BUTTON|A|SUMMARY)$/.test(tag)) return;
  if (!railMenu.hidden) return;
  const next = e.key === "PageDown" || (e.key === " " && !e.shiftKey);
  const prev = e.key === "PageUp" || (e.key === " " && e.shiftKey);
  if (next || prev) { e.preventDefault(); goSection(currentSection() + (next ? 1 : -1)); }
  else if (e.key === "Home") { e.preventDefault(); goSection(0); }
  else if (e.key === "End") { e.preventDefault(); goSection(SECTIONS.length - 1); }
});

/* ---------- the coin locks in, then the hero copy and navigator appear ---------- */
const markLocked = () => document.body.classList.add("locked");
window.addEventListener("coinlocked", markLocked, { once: true });
setTimeout(markLocked, 4500);   // never leave the page without its controls

/* ---------- per-frame state ---------- */
const state = {
  time: 0, scrollY: 0, heroP: 0, introP: 0, workP: 0, workIn: 0, recordP: 0, mouseX: 0, mouseY: 0,
};

let introIn = false;
function readScroll() {
  state.scrollY = window.scrollY;
  // the intro overlaps the hero's last 20vh, so the coin finishes turning sooner
  state.heroP = clamp(window.scrollY / (innerHeight * 0.8));
  state.introP = trackProgress(intro);
  state.workP = trackProgress(work);
  const rr = record.getBoundingClientRect();
  state.recordP = clamp((innerHeight - rr.top) / innerHeight);

  updateRail();

  if (reduced) return;

  heroMeta.style.opacity = (1 - smooth(state.heroP, 0, 0.35)).toFixed(3);

  // Intro copy arrives once the coin has turned edge-on and leaves as the helix unzips.
  const isIn = state.heroP > 0.96;
  intro.classList.toggle("is-in", isIn);
  // Leaving is tied to scroll and staggered: heading, then copy, then button.
  introParts.forEach((el, k) => {
    const out = smooth(state.introP, 0.36 + k * 0.04, 0.48 + k * 0.04);
    el.style.opacity = (1 - out).toFixed(3);
    el.style.transform = `translateY(${(-56 * out).toFixed(1)}px)`;
    el.style.filter = out > 0.001 ? `blur(${(out * 6).toFixed(2)}px)` : "";
    el.style.pointerEvents = out > 0.5 ? "none" : "";
  });
  if (isIn && !introIn) {
    intro.querySelectorAll("h1 .glitch").forEach((el, k) => glitch(el, 120 + k * 140));
  }
  introIn = isIn;

  // Projects rise in over the end of the intro.
  const stickyTop = workSticky.getBoundingClientRect().top;
  state.workIn = smooth(stickyTop, innerHeight * 0.95, innerHeight * 0.35);
  const leave = 1 - smooth(state.recordP, 0.35, 0.95);
  const enter = state.workIn * leave;
  work.style.setProperty("--enter", enter.toFixed(3));
  ringBack.style.setProperty("--enter", enter.toFixed(3));
  ringBack.style.visibility = enter > 0.001 ? "visible" : "hidden";

  // Ring
  // The swing-in runs right up to the moment the section pins, at about the
  // same pace as scrolling through the ring, so the cards never stall.
  const arrive = clamp((innerHeight * 0.95 - stickyTop) / (innerHeight * 0.95));
  // ...and keeps turning as the section scrolls away into the record.
  const depart = clamp(-stickyTop / (innerHeight * 0.95));
  const f = state.workP * (N - 1) - (1 - arrive) * 2.2 + depart * 2.2;
  state.cardF = f;
  state.cardN = N;
  state.stickyTop = stickyTop;
  if (!scene) layoutRing(f, stickyTop);
  const next = clamp(Math.round(f), 0, N - 1);
  if (next !== active) {
    cards[active].classList.remove("is-active");
    active = next;
    glitch(cards[active].querySelector(".glitch"));
  }
  cards[active].classList.add("is-active");
  countCur.textContent = String(active + 1).padStart(2, "0");

  // Background
  let c = mix(tints[0], tints[1], state.heroP);
  c = mix(c, tints[2], state.workIn);
  c = mix(c, tints[3], state.recordP);
  document.body.style.backgroundColor = `rgb(${c.join(",")})`;
}

window.addEventListener("pointermove", (e) => {
  state.mouseX = (e.clientX / innerWidth) * 2 - 1;
  state.mouseY = (e.clientY / innerHeight) * 2 - 1;
}, { passive: true });

/* ---------- boot ---------- */
if (reduced) {
  markLocked();
  // Static page: keep the section navigator in step with the scroll.
  cards.forEach((c) => c.classList.add("is-active"));
  readScroll();
  window.addEventListener("scroll", readScroll, { passive: true });
} else {
  const canvas = document.getElementById("scene");

  // version tag: bump with scene.js so browsers never run a stale copy
  import("./scene.js?v=20261109n")
    .then((m) => m.createScene(canvas))
    .then((s) => { scene = s; })
    .catch((err) => {
      console.warn("3D scene unavailable, using static portrait.", err);
      root.classList.add("no-gl");
      markLocked();
    });

  // Mobile browsers fire resize as the address bar slides in and out while
  // scrolling. Only rebuild for real changes (width, rotation, big height jumps).
  const touch = window.matchMedia("(pointer: coarse)").matches;
  let lastW = innerWidth, lastH = innerHeight;
  window.addEventListener("resize", () => {
    if (touch && innerWidth === lastW && Math.abs(innerHeight - lastH) < 160) return;
    lastW = innerWidth; lastH = innerHeight;
    if (scene) scene.resize();
  });

  // tethers: from the top edge of each visible card to its anchor on the strand
  const svg = document.getElementById("tethers");
  const NS = "http://www.w3.org/2000/svg";
  const teth = cards.map((card) => {
    const g = document.createElementNS(NS, "g");
    const glow = document.createElementNS(NS, "path"), line = document.createElementNS(NS, "path");
    const dot = document.createElementNS(NS, "circle"), halo = document.createElementNS(NS, "circle");
    const c = getComputedStyle(card).getPropertyValue("--c2").trim() || "#4fe0c8";
    glow.setAttribute("stroke", c); glow.setAttribute("stroke-width", "6"); glow.setAttribute("stroke-opacity", "0.22");
    line.setAttribute("stroke", c); line.setAttribute("stroke-width", "1.6");
    halo.setAttribute("r", "12"); halo.setAttribute("fill", c); halo.setAttribute("fill-opacity", "0.3");
    dot.setAttribute("r", "4"); dot.setAttribute("fill", "#fff");
    g.append(glow, line, halo, dot);
    svg.appendChild(g);
    return { g, glow, line, dot, halo };
  });
  const pt = { x: 0, y: 0, ok: false };
  function drawTethers() {
    const enter = parseFloat(work.style.getPropertyValue("--enter") || "0");
    cards.forEach((card, k) => {
      const T = teth[k];
      const el = card.style.visibility === "hidden" ? ghosts[k] : card;
      const op = (parseFloat(el.style.opacity || "1") || 0) * enter;
      if (enter < 0.35 || op < 0.05 || el.style.visibility === "hidden" || !scene.anchor(k, pt).ok) { T.g.style.display = "none"; return; }
      const r = el.getBoundingClientRect();
      // straight line from the card's edge facing the helix; the front card's
      // attachment sits right behind it, so its tether stays hidden under the card
      const cx = r.left + r.width / 2;
      const x0 = pt.x < cx ? r.left + 2 : r.right - 2, y0 = r.top + r.height * 0.5;
      const d = `M${x0.toFixed(1)},${y0.toFixed(1)} L${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      const front = k === active;
      T.g.style.display = "";
      T.line.setAttribute("d", d); T.glow.setAttribute("d", d);
      T.dot.setAttribute("cx", pt.x.toFixed(1)); T.dot.setAttribute("cy", pt.y.toFixed(1));
      T.halo.setAttribute("cx", pt.x.toFixed(1)); T.halo.setAttribute("cy", pt.y.toFixed(1));
      T.g.style.opacity = Math.min(1, op * (0.35 + 0.65 * Math.min(1, (1 - pt.facing) * 3)));
      T.line.setAttribute("stroke-opacity", front ? "0.95" : "0.6");
      T.halo.setAttribute("r", front ? (12 + 4 * Math.sin(state.time * 4)).toFixed(1) : "7");
    });
  }

  const frame = (ms) => {
    state.time = ms / 1000;
    readScroll();
    if (scene) { scene.update(state); layoutLimbs(state.cardF, state.stickyTop || 0); drawTethers(); }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
