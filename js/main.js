/* ============================================================
   Single-viewport page-snap engine + interactions
   Works the same on desktop and touch: one scroll = one page.
   ============================================================ */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    enableStaticFallback();
    return;
  }

  const panels = Array.from(document.querySelectorAll(".panel"));
  const navLinks = document.querySelectorAll(".nav-links a[data-goto]");
  const railDots = Array.from(document.querySelectorAll(".rail-dot"));
  const N = panels.length;
  const DENOM = N - 1;

  const prevBtn = document.getElementById("navPrev");
  const nextBtn = document.getElementById("navNext");
  const pageLabel = document.getElementById("navPage");

  let max = 0;
  let ticking = false;
  let activeIdx = 0;
  let snapTimer = null;
  let dir = 0;        /* +1 down, -1 up, 0 idle */
  let snapped = false; /* consumes the next scroll event after a jump */
  let boundary = 0;   /* y position of the page we are anchored to */
  let startIdx = 0;   /* page index at the start of the gesture */

  function measure() {
    max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  function render() {
    const p = max ? window.scrollY / max : 0;

    let nearest = 0;
    let minDist = Infinity;
    panels.forEach((panel, i) => {
      const center = i / DENOM;
      const dist = Math.abs(p - center);
      if (dist < minDist) { minDist = dist; nearest = i; }
    });
    activeIdx = nearest;

    panels.forEach((panel, i) => {
      const vis = i === activeIdx;
      panel.style.opacity = vis ? "1" : "0";
      panel.style.pointerEvents = vis ? "" : "none";
      panel.style.transform = vis ? "none" : "scale(0.9)";
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

    /* scroll indicator */
    if (pageLabel) pageLabel.textContent = (activeIdx + 1) + " / " + N;
    if (prevBtn) prevBtn.disabled = activeIdx === 0;
    if (nextBtn) nextBtn.disabled = activeIdx === DENOM;
  }

  function snapTo(index) {
    const target = Math.round(max * (clamp01(index / DENOM)));
    if (Math.abs(window.scrollY - target) > 1) {
      snapped = true;
      window.scrollTo({ top: target, behavior: "instant" });
    }
    boundary = target;
    dir = 0;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      measure();
      render();
      ticking = false;
    });

    if (snapped) {
      snapped = false;
      dir = 0;
      return;
    }

    const y = window.scrollY;
    if (dir === 0) {
      if (Math.abs(y - boundary) < 1) return;
      dir = y > boundary ? 1 : -1;
      startIdx = activeIdx;
    }

    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      if (Math.abs(window.scrollY - boundary) < 12) {
        /* a tiny nudge: settle back where we were */
        dir = 0;
        return;
      }
      snapTo(startIdx + dir);
    }, 200);
  }

  /* click / arrow navigation */
  function goTo(index) {
    navLinks.forEach((a) => (a.classList.toggle("active", Number(a.dataset.goto) === index)));
    railDots.forEach((dot, i) => dot.setAttribute("aria-current", String(i === index)));
    snapTo(index);
    render();
  }

  document.querySelectorAll("[data-goto]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const idx = Number(el.dataset.goto);
      if (idx >= 0 && idx < N) goTo(idx);
      closeMobileNav();
    });
  });

  if (prevBtn) prevBtn.addEventListener("click", () => goTo(Math.max(0, activeIdx - 1)));
  if (nextBtn) nextBtn.addEventListener("click", () => goTo(Math.min(DENOM, activeIdx + 1)));

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
  boundary = window.scrollY;
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
