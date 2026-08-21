/* Light/dark theme toggle.
 *
 * Dark is the default and needs no stored preference. Persisting the choice
 * across pages uses sessionStorage - a deliberate, scoped exception to this
 * site's usual no-storage rule (see the CLAUDE.md gotcha) - wrapped in
 * try/catch so a blocked storage API just falls back to dark instead of
 * throwing.
 *
 * Each page also has a tiny inline script at the very top of <head>, before
 * its <style> block, that re-applies a stored "light" choice to
 * document.documentElement before first paint. This file only wires up the
 * toggle button's click handling and icon - it doesn't need to run early.
 */
(function () {
  "use strict";

  function setStored(v) {
    try { sessionStorage.setItem("theme", v); } catch (e) { /* ignore */ }
  }

  function isLight() {
    return document.documentElement.getAttribute("data-theme") === "light";
  }

  var SUN  = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

  function setIconNow(btn) {
    // Icon shows the theme you'd switch TO, matching the search/mail icons'
    // convention of depicting the destination, not the current state.
    btn.innerHTML = isLight() ? MOON : SUN;
    btn.setAttribute("aria-label", isLight() ? "Switch to dark theme" : "Switch to light theme");
  }

  // On click, morph rather than swap instantly: spin/shrink the old icon out,
  // then spin/grow the new one in. Skipped on load (nothing to morph from)
  // and under reduced-motion (respected explicitly here since this animates
  // via inline styles, not a CSS transition the site-wide reduced-motion
  // rule would already catch).
  function morphIcon(btn) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIconNow(btn);
      return;
    }
    var svg = btn.querySelector("svg");
    if (svg) {
      svg.style.transition = "transform .32s cubic-bezier(.4,0,.2,1), opacity .32s ease";
      svg.style.transform = "scale(.2) rotate(-180deg)";
      svg.style.opacity = "0";
    }
    setTimeout(function () {
      setIconNow(btn);
      var next = btn.querySelector("svg");
      next.style.transition = "none";
      next.style.transform = "scale(.2) rotate(180deg)";
      next.style.opacity = "0";
      next.offsetHeight; // force reflow so the starting state commits
      next.style.transition = "transform .32s cubic-bezier(.34,1.56,.64,1), opacity .32s ease";
      next.style.transform = "scale(1) rotate(0deg)";
      next.style.opacity = "1";
    }, 320);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.querySelector("[data-theme-toggle]");
    if (!btn) return;
    setIconNow(btn);
    btn.addEventListener("click", function () {
      var goingLight = !isLight();
      if (goingLight) document.documentElement.setAttribute("data-theme", "light");
      else document.documentElement.removeAttribute("data-theme");
      setStored(goingLight ? "light" : "dark");
      morphIcon(btn);
    });
  });
})();
