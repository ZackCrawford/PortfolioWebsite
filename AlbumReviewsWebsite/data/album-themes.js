// Per-album colour themes for review.html. HAND-WRITTEN data: nothing
// regenerates this file, so edit any line freely.
//
//   surface  the cover's main colour. Grey/black/white = neutral page; a real
//            colour = page tinted with it. Dark grey -> black page, light grey
//            ("silver") -> graphite page.
//   accent   highlights: scores, meters, links, cover outline. Kept bright and
//            readable automatically (js/album-theme.js derives every shade).
//   glow     up to three colours for the background light and animated cells.
//   mode     "dark". White is never a page colour (too bright): a white cover
//            takes its next colour. "light" still works if set by hand.
//
// Seeded from the cover art by the same code that themes new albums: an album
// missing here gets its colours read from its cover in the browser instead.
const ALBUM_THEMES = {
  "sing-me-a-lullaby-my-sweet-temptation": { surface: "#668872", accent: "#668872", glow: ["#668872", "#668872", "#a58674"], mode: "dark" },  // Sing Me a Lullaby, My Sweet Temptation
  "i-am-i-was": { surface: "#0d0b0a", accent: "#d6d9dd", glow: ["#0d0b0a", "#d6d9dd", "#0d0b0a"], mode: "dark" },  // i am > i was
  "2pacalypse-now": { surface: "#553b2a", accent: "#b78f46", glow: ["#553b2a", "#b78f46", "#7c5330"], mode: "dark" },  // 2Pacalypse Now
  "don-t-be-dumb": { surface: "#dc2e30", accent: "#78a3d4", glow: ["#dc2e30", "#78a3d4", "#dc2e30"], mode: "dark" },  // Don't Be Dumb
  "3-years-5-months-and-2-days-in-the-life-of": { surface: "#6795dd", accent: "#bc7149", glow: ["#6795dd", "#bc7149", "#7e4c3d"], mode: "dark" },  // 3 Years, 5 Months And 2 Days In The Life Of...
  "the-stranger": { surface: "#1f1d1e", accent: "#d6d9dd", glow: ["#1f1d1e", "#d6d9dd", "#1f1d1e"], mode: "dark" },  // The Stranger
  "ta13oo": { surface: "#050505", accent: "#d6d9dd", glow: ["#050505", "#d6d9dd", "#050505"], mode: "dark" },  // Ta13oo
  "violator": { surface: "#010006", accent: "#7e1d1f", glow: ["#010006", "#7e1d1f", "#8b2c2c"], mode: "dark" },  // Violator
  "rebel": { surface: "#060606", accent: "#d6d9dd", glow: ["#060606", "#d6d9dd", "#060606"], mode: "dark" },  // Rebel
  "swagger": { surface: "#e8cda0", accent: "#e8cda0", glow: ["#e8cda0", "#a23627", "#ead5a6"], mode: "dark" },  // Swagger  (pinned by hand)
  "goodbye-good-riddance": { surface: "#eede7b", accent: "#eede7b", glow: ["#eede7b", "#4d8fbd", "#d08a8f"], mode: "dark" },  // Goodbye & Good Riddance  (pinned by hand)
  "section-80": { surface: "#c2b498", accent: "#c2b498", glow: ["#c2b498", "#c2b498", "#968f74"], mode: "dark" },  // Section.80
  "crybaby": { surface: "#b7b7b7", accent: "#d6d9dd", glow: ["#b7b7b7", "#d6d9dd", "#b7b7b7"], mode: "dark" },  // crybaby
  "eternal-atake": { surface: "#2b3f4f", accent: "#e87a8a", glow: ["#2b3f4f", "#e87a8a", "#506170"], mode: "dark" },  // Eternal Atake
  "samurai": { surface: "#4c5a7b", accent: "#4c5a7b", glow: ["#4c5a7b", "#4c5a7b", "#4c5a7b"], mode: "dark" },  // Samurai
  "like-a-prayer": { surface: "#7e605e", accent: "#7e605e", glow: ["#7e605e", "#7e605e", "#d3a38c"], mode: "dark" },  // Like A Prayer
  "madvillainy": { surface: "#e9e9e9", accent: "#ea834d", glow: ["#e9e9e9", "#ea834d", "#907a6f"], mode: "dark" },  // Madvillainy
  "bad": { surface: "#161617", accent: "#d47275", glow: ["#161617", "#d47275", "#b98c86"], mode: "dark" },  // Bad
  "culture": { surface: "#886649", accent: "#812b1f", glow: ["#886649", "#812b1f", "#653627"], mode: "dark" },  // Culture
  "music": { surface: "#808080", accent: "#d6d9dd", glow: ["#808080", "#d6d9dd", "#808080"], mode: "dark" },  // MUSIC
  "scrapyard": { surface: "#525251", accent: "#d6d9dd", glow: ["#525251", "#d6d9dd", "#525251"], mode: "dark" },  // Scrapyard
  "santana": { surface: "#595756", accent: "#d6d9dd", glow: ["#595756", "#d6d9dd", "#595756"], mode: "dark" },  // Santana
  "sin-city-the-mixtape": { surface: "#151517", accent: "#6e2628", glow: ["#151517", "#6e2628", "#151517"], mode: "dark" },  // Sin City: The Mixtape
  "beauty-behind-the-madness": { surface: "#141615", accent: "#d6d9dd", glow: ["#141615", "#d6d9dd", "#141615"], mode: "dark" },  // Beauty Behind The Madness
  "one-x": { surface: "#090d0e", accent: "#761d22", glow: ["#090d0e", "#761d22", "#090d0e"], mode: "dark" },  // One-X
  "rodeo": { surface: "#2b3030", accent: "#d69d82", glow: ["#2b3030", "#d69d82", "#a47866"], mode: "dark" },  // Rodeo
  "who-really-cares": { surface: "#080102", accent: "#c81776", glow: ["#080102", "#c81776", "#183f93"], mode: "dark" },  // Who Really Cares
  "chromakopia": { surface: "#bdbaa2", accent: "#bdbaa2", glow: ["#bdbaa2", "#bdbaa2", "#bdbaa2"], mode: "dark" },  // CHROMAKOPIA
  "the-joshua-tree": { surface: "#070706", accent: "#d6d9dd", glow: ["#070706", "#d6d9dd", "#070706"], mode: "dark" },  // The Joshua Tree
};
