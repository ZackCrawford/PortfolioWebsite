/* Shared score colouring.
 *
 * Load this before search.js and before any page script that colours a score.
 * It injects the tier styles and exposes window.scoreClass(value).
 *
 * Tiers follow the familiar review-site progression: red for weak scores,
 * through orange and yellow, to green for great ones, and a solid green label
 * for an effectively perfect score. Flat colour.
 */
(function () {
  "use strict";

  var css = document.createElement("style");
  css.textContent = [
    /* pill form - used in search results and the browse grid */
    ".sc-pill{display:inline-block;font-family:\"Newsreader\",serif;font-weight:700;",
    "border-radius:3px;padding:3px 10px;min-width:50px;text-align:center;",
    "font-variant-numeric:tabular-nums;line-height:1.25;border:1px solid transparent}",

    /* backgrounds + text, lowest to highest */
    ".sc-low  {color:#ff7a7a;background:rgba(255,107,107,.12);border-color:#8f3b3b}",
    ".sc-mid  {color:#ffa866;background:rgba(255,162,92,.12);border-color:#8f5a2e}",
    ".sc-ok   {color:#f5d76e;background:rgba(245,215,110,.11);border-color:#8a7a3c}",
    ".sc-good {color:#b9e36f;background:rgba(181,224,107,.11);border-color:#5e7a34}",
    ".sc-great{color:#62d98e;background:rgba(95,214,138,.12);border-color:#2f7a4c}",
    ".sc-top  {color:#06170d;background:#34c776;border-color:#34c776;font-weight:800}",

    /* text-only form - the bare number on a card, carried by colour alone */
    ".sc-text{background:none;border:0;padding:0;min-width:0;box-shadow:none;text-shadow:none}",
    ".sc-text.sc-low  {color:#ff7a7a}",
    ".sc-text.sc-mid  {color:#ffa866}",
    ".sc-text.sc-ok   {color:#f5d76e}",
    ".sc-text.sc-good {color:#b9e36f}",
    ".sc-text.sc-great{color:#62d98e}",
    ".sc-text.sc-top  {color:#3ee688}",

    /* meter bar fill, matched to the same tiers */
    ".sc-bar.sc-low   b{background:#e5484d}",
    ".sc-bar.sc-mid   b{background:#f08c3a}",
    ".sc-bar.sc-ok    b{background:#e3c04c}",
    ".sc-bar.sc-good  b{background:#9ccc4f}",
    ".sc-bar.sc-great b{background:#3fbf74}",
    ".sc-bar.sc-top   b{background:#34c776}",

    /* Light pages (white-cover reviews, where search results can appear): the
       same tiers, darkened to stay readable on a light page. The text form needs
       its own reset because these selectors outrank the plain .sc-text one. */
    "[data-theme='light'] .sc-low  {color:#b42323;background:rgba(180,35,35,.08);border-color:#e3a3a3}",
    "[data-theme='light'] .sc-mid  {color:#a3500c;background:rgba(163,80,12,.08);border-color:#e3b48a}",
    "[data-theme='light'] .sc-ok   {color:#7a6100;background:rgba(122,97,0,.09);border-color:#d6c27a}",
    "[data-theme='light'] .sc-good {color:#466e10;background:rgba(70,110,16,.09);border-color:#a9c97a}",
    "[data-theme='light'] .sc-great{color:#157238;background:rgba(21,114,56,.09);border-color:#86c99e}",
    "[data-theme='light'] .sc-text.sc-low  {color:#b42323;background:none;border:0}",
    "[data-theme='light'] .sc-text.sc-mid  {color:#a3500c;background:none;border:0}",
    "[data-theme='light'] .sc-text.sc-ok   {color:#7a6100;background:none;border:0}",
    "[data-theme='light'] .sc-text.sc-good {color:#466e10;background:none;border:0}",
    "[data-theme='light'] .sc-text.sc-great{color:#157238;background:none;border:0}",
    "[data-theme='light'] .sc-text.sc-top  {color:#12753a;background:none;border:0}"
  ].join("");
  document.head.appendChild(css);

  window.scoreClass = function (v) {
    if (v == null) return "sc-low";
    if (v >= 9.7) return "sc-top";      // effectively perfect - solid label
    if (v >= 8.8) return "sc-great";
    if (v >= 7.8) return "sc-good";
    if (v >= 6.8) return "sc-ok";
    if (v >= 5.5) return "sc-mid";
    return "sc-low";
  };
})();
