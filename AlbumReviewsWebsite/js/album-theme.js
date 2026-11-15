// Per-album colour themes for review.html.
//
// A theme is three things, all plain hex colours so they are easy to hand-edit
// in data/album-themes.js:
//
//   surface  the cover's main colour. Grey/black/white = neutral page; any real
//            colour = page tinted with it. Its lightness picks the page depth:
//            dark cover -> black, mid/light grey ("silver") -> graphite. White is
//            never used: a white cover takes its next colour.
//   accent   highlight colour (score, meters, links, cover outline). Kept bright.
//   glow     up to three colours for the soft background light / animated cells.
//   mode     always "dark" from the cover; "light" only if set by hand.
//
// themeFromPixels() derives a theme from cover pixels. The same function seeds
// data/album-themes.js and themes new albums in the browser, so both agree.
(function (global) {
  "use strict";

  /* ---------- colour helpers ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hexToRgb = (h) => { h = h.replace("#", ""); if (h.length === 3) h = h.replace(/./g, "$&$&"); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const rgbToHex = (c) => "#" + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
  function rgbToHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h / 6, s, l];
  }
  function hsl(h, s, l) {
    s = clamp(s, 0, 1); l = clamp(l, 0, 1);
    const f = (n) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return rgbToHex([f(0) * 255, f(8) * 255, f(4) * 255]);
  }
  const hslOf = (hex) => rgbToHsl(hexToRgb(hex));
  function lum(hex) {
    return hexToRgb(hex).map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; })
      .reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
  }
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  // step lightness from l in direction dir until the colour reaches min contrast on bg
  function readable(h, s, l, bg, min, dir) {
    let c = hsl(h, s, l);
    for (let i = 0; i < 70 && contrast(c, bg) < min; i++) { l += dir * .012; c = hsl(h, s, l); }
    return c;
  }
  // "colourfulness" that ignores near-black/near-white pixels whose hue is noise
  const chroma = (s, l) => s * (1 - Math.abs(2 * l - 1));
  const hueDist = (a, b) => { const d = Math.abs(a - b) % 1; return Math.min(d, 1 - d) * 2; }; // 0..1

  /* ---------- cover pixels -> theme ---------- */
  // px: flat RGBA array (canvas ImageData.data or the same layout).
  function themeFromPixels(px) {
    const pts = [];
    for (let i = 0; i < px.length; i += 4) pts.push([px[i], px[i + 1], px[i + 2]]);
    const n = pts.length;
    if (!n || pts.every((p) => p[0] === pts[0][0] && p[1] === pts[0][1] && p[2] === pts[0][2])) return null; // blank or blocked read

    // 1. main colour: k-means over every pixel, seeded deterministically by brightness
    const K = 6, byLuma = pts.slice().sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
    let cent = Array.from({ length: K }, (_, k) => byLuma[Math.floor((k + .5) / K * n)].slice());
    let assign = new Array(n).fill(0);
    for (let it = 0; it < 14; it++) {
      const sum = cent.map(() => [0, 0, 0, 0]);
      for (let i = 0; i < n; i++) {
        let best = 0, bd = Infinity;
        for (let k = 0; k < K; k++) {
          const d = (pts[i][0] - cent[k][0]) ** 2 + (pts[i][1] - cent[k][1]) ** 2 + (pts[i][2] - cent[k][2]) ** 2;
          if (d < bd) { bd = d; best = k; }
        }
        assign[i] = best; const s = sum[best]; s[0] += pts[i][0]; s[1] += pts[i][1]; s[2] += pts[i][2]; s[3]++;
      }
      cent = cent.map((c, k) => sum[k][3] ? [sum[k][0] / sum[k][3], sum[k][1] / sum[k][3], sum[k][2] / sum[k][3]] : c);
    }
    const counts = cent.map(() => 0); assign.forEach((k) => counts[k]++);
    const clusters = cent.map((c, k) => {
      const [h, s, l] = rgbToHsl(c);
      return { rgb: c, share: counts[k] / n, h, s, l, c: chroma(s, l) };
    }).filter((c) => c.share > 0).sort((a, b) => b.share - a.share);

    // White never becomes the page colour (too bright, in every mode): near-white
    // areas are skipped and the next colour on the cover is used instead.
    const isWhite = (c) => c.l > .93 && c.c < .1;
    const candidates = clusters.filter((c) => !isWhite(c));
    if (!candidates.length) candidates.push({ rgb: [42, 42, 42], share: 1, h: 0, s: 0, l: .165, c: 0 });

    // The surface is the biggest remaining area, unless one colour family covers
    // enough of the cover once its shades are added up (camo greens, sepia
    // tones): then that family wins, so a mostly-green cover gets a green page.
    let surface = candidates[0];
    if (surface.c <= .09) {
      let best = null;
      for (const seed of candidates.filter((c) => c.c > .045)) {
        const fam = candidates.filter((c) => c.c > .045 && hueDist(c.h, seed.h) < .16);
        const share = fam.reduce((a, c) => a + c.share, 0);
        if (share >= .3 && (!best || share > best.share)) best = { share, top: fam.sort((a, b) => b.c - a.c)[0] };
      }
      if (best) surface = best.top;
    }
    const mode = "dark";

    // 2. accent: small bright patches count too (Madvillainy's orange corner), so
    //    vivid pixels are bucketed by hue on their own, not through k-means.
    const buckets = {};
    for (const p of pts) {
      const [h, s, l] = rgbToHsl(p);
      if (s > .42 && l > .22 && l < .8) {
        const k = Math.floor(h * 24) % 24, b = buckets[k] || (buckets[k] = { n: 0, c: 0, rgb: [0, 0, 0] });
        b.n++; b.c += chroma(s, l); p.forEach((v, j) => { b.rgb[j] += v; });
      }
    }
    const surfNeutral = surface.c <= .045;
    let accent = null, bestScore = 0;
    for (const b of Object.values(buckets)) {
      if (b.n < Math.max(4, n * .003)) continue;
      const rgb = b.rgb.map((v) => v / b.n), [h] = rgbToHsl(rgb);
      // a different hue from a coloured surface reads as an accent; the same hue doesn't
      const apart = surfNeutral ? 1 : .25 + .75 * clamp(hueDist(h, surface.h) / .35, 0, 1);
      const score = Math.sqrt(b.n / n) * (b.c / b.n) * apart;
      if (score > bestScore) { bestScore = score; accent = rgb; }
    }

    // on a coloured page, a weak accent (skin tones, browns) would just muddy it:
    // use a brighter version of the page colour instead
    if (accent && !surfNeutral) {
      const [, as, al] = rgbToHsl(accent);
      if (chroma(as, al) < .35) accent = surface.rgb;
    }
    const surfaceHex = rgbToHex(surface.rgb);
    const accentHex = accent ? rgbToHex(accent) : (surfNeutral ? "#d6d9dd" : surfaceHex);
    const glow = [surfaceHex, accentHex]
      .concat(clusters.filter((c) => c !== surface && c.c > .12).map((c) => rgbToHex(c.rgb)))
      .concat([surfaceHex]).slice(0, 3);
    return { surface: surfaceHex, accent: accentHex, glow, mode };
  }

  /* ---------- theme -> page colours ---------- */
  function applyTheme(t, root) {
    if (!t || !t.surface || !t.accent) return;
    root = root || document.documentElement;
    const light = (t.mode || "dark") === "light";
    const [sh, ss, sl] = hslOf(t.surface);
    const neutral = chroma(ss, sl) < .07 || ss < .08;
    const hue = neutral ? .6 : sh;                        // neutral pages lean very slightly cool ("silver")
    const tint = neutral ? .03 : clamp(ss * 1.1, .4, .75); // colourful pages stay vivid, never muddy
    const v = {};

    let [ah, as, al] = hslOf(t.accent);
    const greyAccent = chroma(as, al) < .05;              // true greys/silvers only; muted colours still count
    if (!greyAccent) as = Math.max(as, .72);               // accents stay bright

    if (!light) {
      const lift = neutral && sl > .3 ? .045 : 0;          // mid-grey covers -> graphite, not black
      v.paper = hsl(hue, tint * .55, .05 + lift);
      v.haze = hsl(hue, tint * .6, .095 + lift);
      v.line = hsl(hue, tint * .5, .21 + lift);
      v.ink = hsl(hue, tint * .18, .95);
      v.muted = readable(hue, tint * .25, .64, v.haze, 6.2, 1);
      v.a = greyAccent ? hsl(ah, 0, clamp(al, .62, .82)) : hsl(ah, as, clamp(al, .52, .64));
      v.aText = readable(ah, greyAccent ? 0 : as, Math.max(.6, clamp(al, .52, .66)), v.haze, 6, 1);
      v.aSoft = readable(ah, greyAccent ? 0 : as * .9, .76, v.paper, 9, 1);
      v.pill = readable(ah, greyAccent ? 0 : as * .9, .78, "#140c09", 7, 1);
    } else {
      // never pure white: a white cover gets a soft paper tone so the page
      // doesn't flash bright, tinted warm when neutral, or by the cover's colour
      const lh = neutral ? .11 : hue, ls = neutral ? .14 : tint * .3;
      v.paper = hsl(lh, ls, .895);
      v.haze = hsl(lh, ls * 1.1, .855);
      v.line = hsl(lh, ls * .9, .72);
      v.ink = hsl(lh, ls * .5, .1);
      v.muted = readable(lh, ls * .4, .4, v.paper, 6, -1);
      v.a = greyAccent ? hsl(ah, 0, .3) : hsl(ah, as, clamp(al, .42, .55));
      v.aText = readable(ah, greyAccent ? 0 : as, clamp(al, .4, .5), v.haze, 5, -1);
      v.aSoft = v.aText;
      v.pill = readable(ah, greyAccent ? 0 : as * .9, .82, "#140c09", 7, 1);
    }
    const glow = (t.glow && t.glow.length ? t.glow : [t.surface]).concat(t.accent, t.accent).slice(0, 3);

    const set = (k, val) => root.style.setProperty(k, val);
    set("--a-paper", v.paper); set("--a-haze", v.haze); set("--a-line", v.line);
    set("--a-ink", v.ink); set("--a-muted", v.muted);
    set("--a", v.a); set("--a-text", v.aText); set("--a-soft", v.aSoft); set("--a-pill", v.pill);
    glow.forEach((g, i) => set(`--g${i + 1}`, g));
    root.classList.add("themed");
    if (light) root.setAttribute("data-theme", "light"); else root.removeAttribute("data-theme");

    // animated cells behind the page (vanta, created later in review.html): they
    // follow the page itself - grey on neutral pages, the surface colour
    // otherwise. Never the raw cover colour: near-black pixels carry hue noise
    // that would read as a strong tint.
    const vh = neutral ? .6 : sh, vs = neutral ? 0 : clamp(tint, .4, .8);
    const hex = (x) => parseInt(x.slice(1), 16);
    global.ALBUM_VANTA = light
      ? { color1: hex(hsl(neutral ? .11 : vh, neutral ? .12 : vs * .45, .78)), color2: hex(hsl(neutral ? .11 : vh, neutral ? .12 : vs * .3, .88)) }
      : { color1: hex(hsl(vh, vs, neutral ? (sl > .3 ? .3 : .22) : .3)), color2: hex(hsl(vh, vs, .1)) };
    if (global.vantaEffect) global.vantaEffect.setOptions(global.ALBUM_VANTA);
  }

  // Read a loaded <img> and theme from it. Same-origin covers only; browsers that
  // block canvas reads (LibreWolf, Tor) return null and the page keeps its default.
  function themeFromImage(img) {
    try {
      const c = document.createElement("canvas"), n = 48;
      c.width = c.height = n;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0, n, n);
      return themeFromPixels(g.getImageData(0, 0, n, n).data);
    } catch (e) { return null; }
  }

  global.AlbumTheme = { themeFromPixels, themeFromImage, applyTheme };
})(typeof window !== "undefined" ? window : globalThis);
