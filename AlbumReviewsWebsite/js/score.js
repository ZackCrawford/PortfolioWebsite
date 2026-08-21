/* Shared score colouring.
 *
 * Load this before search.js and before any page script that colours a score.
 * It injects the tier styles and exposes window.scoreClass(value).
 *
 * Tiers run cold-to-bright: grey at the bottom, through indigo and violet,
 * to an icy diamond blue for a perfect score.
 */
(function () {
  "use strict";

  var css = document.createElement("style");
  css.textContent = [
    /* pill form - used in search results and the browse grid. Backdrop-filter
       turns each tier's translucent background into actual frosted glass -
       whatever sits behind the pill blurs through it, not just a flat tint. */
    ".sc-pill{display:inline-block;font-family:\"Newsreader\",serif;font-weight:700;",
    "border-radius:999px;padding:3px 11px;min-width:50px;text-align:center;",
    "font-variant-numeric:tabular-nums;line-height:1.25;border:1px solid transparent;",
    "backdrop-filter:blur(6px) saturate(160%);-webkit-backdrop-filter:blur(6px) saturate(160%);",
    "box-shadow:inset 0 1px 0 rgba(255,255,255,.16)}",

    /* backgrounds + text, lowest to highest */
    ".sc-low  {color:#cfcbd9;background:rgba(122,118,140,.30);border-color:#7a768c}",
    ".sc-mid  {color:#c3c6ff;background:rgba(99,102,241,.26);border-color:#6366f1}",
    ".sc-ok   {color:#e2d0ff;background:rgba(124,58,237,.38);border-color:#8b5cf6}",
    ".sc-good {color:#f3e6ff;background:rgba(157,78,221,.55);border-color:#b56bff;",
    "box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 0 10px rgba(181,107,255,.35)}",
    ".sc-great{color:#fff0fd;background:rgba(217,70,239,.60);border-color:#e879f9;",
    "box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 0 14px rgba(232,121,249,.50)}",
    ".sc-top  {color:#04222b;background:linear-gradient(135deg,#d8fbff,#5ee7f5 55%,#22d3ee);",
    "border-color:#b6f4ff;font-weight:800;",
    "box-shadow:0 0 20px rgba(94,231,245,.70)}",

    /* Text-only form - the bare number on a card. No glow here: a blurred
       shadow behind a small number reads as a smudged box rather than a halo,
       so the tier is carried by colour alone. */
    ".sc-text{background:none;border:0;padding:0;min-width:0;box-shadow:none;text-shadow:none}",
    ".sc-text.sc-low  {color:#a9a4bb}",
    ".sc-text.sc-mid  {color:#9ea3ff}",
    ".sc-text.sc-ok   {color:#c79bff}",
    ".sc-text.sc-good {color:#dcb3ff}",
    ".sc-text.sc-great{color:#f4a6ff}",
    ".sc-text.sc-top  {color:#7ff0ff}",

    /* meter bar fill, matched to the same tiers */
    ".sc-bar.sc-low   b{background:#7a768c}",
    ".sc-bar.sc-mid   b{background:#6366f1}",
    ".sc-bar.sc-ok    b{background:#8b5cf6}",
    ".sc-bar.sc-good  b{background:#b56bff;box-shadow:0 0 8px rgba(181,107,255,.5)}",
    ".sc-bar.sc-great b{background:#e879f9;box-shadow:0 0 10px rgba(232,121,249,.6)}",
    ".sc-bar.sc-top   b{background:linear-gradient(90deg,#5ee7f5,#22d3ee);",
    "box-shadow:0 0 12px rgba(94,231,245,.8)}",

    /* Light theme - every tier above was tuned against a near-black page
       background, so the same hex values read as washed-out and low-contrast
       on white. These are darker, more saturated restatements of the same six
       hues rather than a different palette. .sc-bar and the sc-top pill are
       untouched: bars are solid fills (no text-on-background contrast issue)
       and sc-top's pill already sits on its own bright gradient, independent
       of the page background. */
    "[data-theme='light'] .sc-low  {color:#4b4658;background:rgba(107,100,120,.14);border-color:#a9a4bb}",
    "[data-theme='light'] .sc-mid  {color:#3730a3;background:rgba(99,102,241,.16);border-color:#818cf8}",
    "[data-theme='light'] .sc-ok   {color:#6d28d9;background:rgba(124,58,237,.16);border-color:#a78bfa}",
    "[data-theme='light'] .sc-good {color:#86198f;background:rgba(157,78,221,.18);border-color:#c084fc;",
    "box-shadow:0 0 8px rgba(181,107,255,.25)}",
    "[data-theme='light'] .sc-great{color:#a21caf;background:rgba(217,70,239,.20);border-color:#f0abfc;",
    "box-shadow:0 0 10px rgba(232,121,249,.3)}",

    /* The rules above give .sc-low etc. a background/border for the pill
       form - but at equal specificity to the plain .sc-text reset, a more
       specific [data-theme='light'] selector wins regardless of source
       order, so the text form needs its own explicit reset here too, or the
       pill's background bleeds back in as a highlighter box behind the bare
       number on cards. */
    "[data-theme='light'] .sc-text.sc-low  {color:#7a748c;background:none;border:0;box-shadow:none}",
    "[data-theme='light'] .sc-text.sc-mid  {color:#4f46e5;background:none;border:0;box-shadow:none}",
    "[data-theme='light'] .sc-text.sc-ok   {color:#7c3aed;background:none;border:0;box-shadow:none}",
    "[data-theme='light'] .sc-text.sc-good {color:#a21caf;background:none;border:0;box-shadow:none}",
    "[data-theme='light'] .sc-text.sc-great{color:#c026d3;background:none;border:0;box-shadow:none}",
    "[data-theme='light'] .sc-text.sc-top  {color:#0891b2;background:none;border:0;box-shadow:none}"
  ].join("");
  document.head.appendChild(css);

  window.scoreClass = function (v) {
    if (v == null) return "sc-low";
    if (v >= 9.7) return "sc-top";      // effectively perfect - diamond blue
    if (v >= 8.8) return "sc-great";
    if (v >= 7.8) return "sc-good";
    if (v >= 6.8) return "sc-ok";
    if (v >= 5.5) return "sc-mid";
    return "sc-low";
  };
})();
