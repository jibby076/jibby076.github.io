/* ============================================================
   Single-viewport zoom-scroll engine + interactions
   ============================================================ */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    enableStaticFallback();
    return;
  }

  const panels = Array.from(document.querySelectorAll(".panel"));
  const viewport = document.getElementById("viewport");
  const navLinks = document.querySelectorAll(".nav-links a[data-goto]");
  const railDots = Array.from(document.querySelectorAll(".rail-dot"));
  const N = panels.length;
  const DENOM = N - 1;

  let max = 0;
  let ticking = false;

  function measure() {
    max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const smooth = (x) => x * x * (3 - 2 * x);

  function render() {
    const p = window.scrollY / max;
    let activeIdx = 0;

    panels.forEach((panel, i) => {
      const center = i / DENOM;
      const dist = Math.abs(p - center) * DENOM;
      const t = clamp01(1 - dist);
      const s = smooth(t);

      panel.style.opacity = s.toFixed(3);
      panel.style.transform =
        "scale(" + (0.86 + 0.14 * s).toFixed(4) + ") translateY(" + ((1 - s) * 26).toFixed(1) + "px)";
      panel.style.pointerEvents = t > 0.5 ? "" : "none";

      if (t > 0.55) activeIdx = i;
    });

    /* skill bars fill in when the skills panel arrives */
    if (activeIdx === 2) {
      document.querySelectorAll(".bar-fill:not(.animate)").forEach((bar) => {
        bar.style.setProperty("--pct", bar.dataset.pct + "%");
        bar.classList.add("animate");
      });
    }

    /* nav + rail highlight */
    navLinks.forEach((a) => {
      a.classList.toggle("active", Number(a.dataset.goto) === activeIdx);
    });
    railDots.forEach((dot, i) => {
      dot.setAttribute("aria-current", String(i === activeIdx));
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      measure();
      render();
      ticking = false;
    });
  }

  /* click-to-panel nav */
  function goTo(index) {
    const target = Math.round(max * (clamp01(index / DENOM)));
    navLinks.forEach((a) => (a.classList.toggle("active", Number(a.dataset.goto) === index)));
    railDots.forEach((dot, i) => dot.setAttribute("aria-current", String(i === index)));
    window.scrollTo({ top: target, behavior: "smooth" });
  }

  document.querySelectorAll("[data-goto]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const idx = Number(el.dataset.goto);
      if (idx >= 0 && idx < N) goTo(idx);
      closeMobileNav();
    });
  });

  /* mobile nav toggle */
  const navToggle = document.getElementById("navToggle");
  const mobileLinks = document.querySelector(".nav-links");
  function closeMobileNav() {
    mobileLinks && mobileLinks.classList.remove("open");
    navToggle && navToggle.setAttribute("aria-expanded", "false");
  }
  if (navToggle && mobileLinks) {
    navToggle.addEventListener("click", () => {
      const open = mobileLinks.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
  }

  /* copy buttons */
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = btn.dataset.copy;
      const done = () => {
        btn.textContent = "Copied";
        btn.classList.add("copied");
        setTimeout(() => {
          btn.textContent = "Copy";
          btn.classList.remove("copied");
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
      } else {
        fallbackCopy(text, done);
      }
    });
  });

  function fallbackCopy(text, onDone) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); onDone(); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  /* footer year */
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => {
    measure();
    render();
  });

  measure();
  render();
  requestAnimationFrame(() => measure());

  function enableStaticFallback() {
    const year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
    document.querySelectorAll(".copy-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const text = btn.dataset.copy;
        const done = () => {
          btn.textContent = "Copied";
          setTimeout(() => (btn.textContent = "Copy"), 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done);
        else fallbackCopy(text, done);
      });
    });
  }
})();
