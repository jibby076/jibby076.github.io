/* ============================================================
   Floating leaf particle field (hero + whole page background)
   ============================================================ */
(function () {
  "use strict";

  const field = document.querySelector(".leaf-field");
  if (!field) return;

  const LEAF_GLYPHS = ["\u2740", "\u2741", "\u2618"];
  const COUNT = window.innerWidth < 640 ? 10 : 16;

  for (let i = 0; i < COUNT; i++) {
    const leaf = document.createElement("span");
    leaf.className = "leaf";
    leaf.style.left = Math.random() * 100 + "vw";
    leaf.style.fontSize = 10 + Math.random() * 14 + "px";
    leaf.style.animationDuration = 9 + Math.random() * 14 + "s";
    leaf.style.animationDelay = -Math.random() * 20 + "s";
    leaf.textContent = LEAF_GLYPHS[Math.floor(Math.random() * LEAF_GLYPHS.length)];
    leaf.style.setProperty("--drift", (Math.random() * 120 - 60).toFixed(0) + "px");
    leaf.style.setProperty("--spin", (Math.random() * 540 - 270).toFixed(0) + "deg");
    leaf.style.setProperty("--leaf-o", (0.05 + Math.random() * 0.09).toFixed(2));
    field.appendChild(leaf);
  }
})();
