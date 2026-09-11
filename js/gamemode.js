/* ============================================================
   GAME MODE — Valorant-style agent-select screen
   Adds body.gamemode (swaps the whole page) · persists in localStorage
   Pills (lampshade accordion) · persona chips with live loadouts ·
   pointer-following reveal spot · boot entrance · system log ribbon ·
   WebAudio blips · live ticker · READY/ESC to exit · keyboard nav
   ============================================================ */
(function () {
  "use strict";

  var btn = document.getElementById("gmToggle");
  var exit = document.getElementById("gmExit");
  if (!btn && !exit) return;

  var KEY = "jib-gamemode";
  var CARD_KEY = "jib-gamemode-card";
  var staysReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isCoarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

  /* ---------------- tiny synthesised audio (no assets) ---------------- */
  var sfx = (function () {
    var ctx = null;
    var muted = false;
    try { muted = localStorage.getItem("jib-gamemode-mute") === "1"; } catch (e) {}
    function ensure() {
      if (ctx) return ctx;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      return ctx;
    }
    function tone(f0, f1, dur, type, vol) {
      if (muted) return;
      var c = ensure();
      if (!c) return;
      if (c.state === "suspended") c.resume();
      var t = c.currentTime;
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + dur + 0.03);
    }
    return {
      isMuted: function () { return muted; },
      open: function () { tone(190, 115, 0.14, "sine", 0.05); tone(380, 240, 0.1, "sine", 0.02); },
      close: function () { tone(155, 240, 0.1, "sine", 0.04); },
      select: function () { tone(520, 360, 0.07, "square", 0.028); },
      copy: function () { tone(700, 880, 0.06, "sine", 0.04); setTimeout(function () { tone(880, 1280, 0.06, "sine", 0.03); }, 70); },
      ready: function () { tone(240, 760, 0.3, "sawtooth", 0.045); tone(1200, 1600, 0.24, "sine", 0.018); },
      setMuted: function (m) { muted = !!m; try { localStorage.setItem("jib-gamemode-mute", muted ? "1" : "0"); } catch (e) {} }
    };
  })();

  /* ---------------- copy buttons need a blip too (main.js left alone) ---------------- */
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest && e.target.closest(".copy-btn");
    if (t) sfx.copy();
  });

  function persist(on) {
    try {
      localStorage.setItem(KEY, on ? "1" : "0");
    } catch (e) {
      /* storage unavailable */
    }
  }

  var play = document.getElementById("gmPlay");

  function resetPlay() {
    if (!play) return;
    play.classList.remove("deploy");
    play.textContent = "Ready";
    var s = document.createElement("span");
    s.appendChild(document.createTextNode("\u2192"));
    play.appendChild(s);
  }

  function bootScreen() {
    var screen = document.querySelector(".gm-screen");
    if (!screen) return;
    if (screen._bootTimer) {
      clearTimeout(screen._bootTimer);
      screen._bootTimer = null;
    }
    screen.classList.add("gm-boot");
    screen._bootTimer = setTimeout(function () {
      screen.classList.remove("gm-boot");
      screen._bootTimer = null;
    }, 1600);
  }

  function apply(on) {
    document.body.classList.toggle("gamemode", on);
    if (btn) btn.setAttribute("aria-pressed", String(on));
    if (on) {
      startTicker();
      startLogs();
      bootScreen();
    } else {
      stopLogs();
      resetPlay();
    }
  }

  function set(on) {
    apply(on);
    persist(on);
  }

  try {
    apply(localStorage.getItem(KEY) === "1");
  } catch (e) {
    /* default off */
  }

  if (btn) {
    btn.addEventListener("click", function () {
      set(!document.body.classList.contains("gamemode"));
    });
  }
  if (exit) {
    exit.addEventListener("click", function () {
      exitGame();
    });
  }

  /* ---------------- READY → deploy flash → exit with a flare ---------------- */
  var gmScreen = document.querySelector(".gm-screen");

  function exitGame() {
    if (!gmScreen) {
      set(false);
      return;
    }
    if (gmScreen.classList.contains("leaving")) return;
    gmScreen.classList.add("leaving");
    gmScreen.style.pointerEvents = "none";
    setTimeout(function () {
      set(false);
      gmScreen.classList.remove("leaving");
      gmScreen.style.pointerEvents = "";
    }, 260);
  }

  if (gmScreen && play) {
    play.addEventListener("click", function () {
      if (gmScreen.classList.contains("leaving") || play.classList.contains("deploy")) return;
      sfx.ready();
      play.classList.add("deploy");
      play.textContent = "Deploying ";
      var s = document.createElement("span");
      s.appendChild(document.createTextNode("\u2192"));
      play.appendChild(s);
      setTimeout(function () {
        exitGame();
      }, 170);
    });
  }

  /* ---------------- pill accordion (lampshade) ----------------
     Only one pill open at a time. Clicking an open pill's head
     collapses it back into a pill. */
  var pills = document.querySelectorAll(".gm-pill[data-pill]");
  var pillHeads = document.querySelectorAll(".gm-pill-head");
  var activePill = null;

  function openPill(pill) {
    activePill = pill;
    pills.forEach(function (p) {
      var open = pill && p === pill;
      p.classList.toggle("open", open);
      var head = p.querySelector(".gm-pill-head");
      if (head) head.setAttribute("aria-expanded", String(open));
    });
  }

  if (pillHeads.length) {
    pillHeads.forEach(function (head) {
      head.addEventListener("click", function () {
        var pill = head.closest(".gm-pill");
        if (!pill) return;
        var willOpen = !pill.classList.contains("open");
        openPill(willOpen ? pill : null);
        if (willOpen) sfx.open(); else sfx.close();
      });
    });
    var initiallyOpen = pills[0] && pills[0].classList.contains("open") ? pills[0] : null;
    openPill(initiallyOpen);
  }

  /* ---------------- persona chips — role, tagline, readout, art tint,
     live loadout stats + ult name, persisted calling card ---------------- */
  var cards = document.querySelectorAll(".gm-cards-persona .gm-chip");
  var roleEl = document.getElementById("gmRole");
  var tagEl = document.getElementById("gmTagline");
  var artEl = document.querySelector(".gm-art");
  var pRoleEl = document.getElementById("gmPersonaRole");
  var pAboutEl = document.getElementById("gmPersonaAbout");
  var statCells = gmScreen ? gmScreen.querySelectorAll(".gm-pill[data-pill='agent'] .gm-stat") : [];
  var ultNameEl = document.getElementById("gmUltName");
  var activeCard = cards[0] || null;

  function renderReadout(card) {
    if (!card) return;
    if (pRoleEl) pRoleEl.textContent = card.getAttribute("data-role") || "";
    if (pAboutEl) pAboutEl.textContent = card.getAttribute("data-about") || card.getAttribute("data-tag") || "";
  }

  function applyStats(card) {
    var statsStr = card.getAttribute("data-stats");
    if (statsStr) {
      var stats = statsStr.split("~");
      for (var i = 0; i < 4 && i < statCells.length; i++) {
        var pair = stats[i] ? stats[i].split("|") : [];
        var v = statCells[i].querySelector(".gm-stat-v");
        var k = statCells[i].querySelector(".gm-stat-k");
        if (v && pair[0]) v.textContent = pair[0];
        if (k && pair[1]) k.textContent = pair[1];
      }
    }
    if (ultNameEl && card.hasAttribute("data-ult")) ultNameEl.textContent = card.getAttribute("data-ult");
  }

  function saveCard(card) {
    try {
      localStorage.setItem(CARD_KEY, card.getAttribute("data-role") || "");
    } catch (e) {
      /* storage unavailable */
    }
  }

  function selectChip(card, silent) {
    cards.forEach(function (c) { c.classList.remove("active"); });
    card.classList.add("active");
    if (roleEl) roleEl.textContent = card.getAttribute("data-role") || roleEl.textContent;
    if (tagEl) tagEl.textContent = card.getAttribute("data-tag") || tagEl.textContent;
    if (artEl && card.hasAttribute("data-color")) {
      artEl.style.setProperty("--tint", card.getAttribute("data-color"));
      artEl.style.setProperty("--tint-glow", card.getAttribute("data-glow") || "rgba(232,193,90,0.35)");
    }
    applyStats(card);
    activeCard = card;
    renderReadout(card);
    saveCard(card);
    if (!silent) sfx.select();
  }

  cards.forEach(function (card) {
    card.addEventListener("click", function () { selectChip(card); });
    card.addEventListener("pointerenter", function () { renderReadout(card); });
    card.addEventListener("pointerleave", function () { renderReadout(activeCard); });
  });

  var savedRole = null;
  try { savedRole = localStorage.getItem(CARD_KEY); } catch (e) {}
  var initialCard = cards.length ? cards[0] : null;
  if (savedRole) {
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute("data-role") === savedRole) { initialCard = cards[i]; break; }
    }
  }
  if (initialCard) selectChip(initialCard, true);

  /* ---------------- pointer-following reveal spot on the stacked art ----------------
     Photo 1 (top layer) covers everything. A small circular HOLE follows
     the pointer (evenodd clip-path ring of points); photo 2 shows through
     exactly under the cursor, everything else stays photo 1. On touch
     devices a tap opens the hole (tap again to close); dragging repositions. */
  var artTop = document.querySelector(".gm-art-top");
  if (artTop) {
    var LENS_R = 24;                 /* px radius of the reveal spot — tune to taste */
    var RING_PAD = 3;                /* px the ring extends past the hole */
    var lensOn = false;
    var cx = 50, cy = 50, tx = 50, ty = 50; /* centre in % of the art box */

    function lensToPct(e) {
      var r = artTop.getBoundingClientRect();
      if (!r.width || !r.height) return;
      tx = (e.clientX - r.left) / r.width * 100;
      ty = (e.clientY - r.top) / r.height * 100;
    }

    function paintLens() {
      var artLens = document.querySelector(".gm-art-lens");
      if (!lensOn) {
        artTop.style.clipPath = "";
        artTop.style.webkitClipPath = "";
        if (artLens) artLens.style.opacity = "0";
        return;
      }
      var r = artTop.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var rxp = LENS_R / r.width * 100;
      var ryp = LENS_R / r.height * 100;
      var pts = [];
      for (var i = 0; i < 36; i++) {
        var a = i * Math.PI * 2 / 36;
        pts.push(((cx + rxp * Math.cos(a)).toFixed(3)) + "% " + ((cy + ryp * Math.sin(a)).toFixed(3)) + "%");
      }
      var cp = "polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, " + pts.join(", ") + ")";
      artTop.style.clipPath = cp;
      artTop.style.webkitClipPath = cp;
      if (artLens) {
        var d = LENS_R * 2 + RING_PAD * 2;
        artLens.style.left = cx + "%";
        artLens.style.top = cy + "%";
        artLens.style.width = d + "px";
        artLens.style.height = d + "px";
        artLens.style.opacity = "1";
      }
    }

    function onPointerMove(e) {
      lensToPct(e);
      if (!isCoarse) lensOn = true;
      if (staysReduced) { cx = tx; cy = ty; }
      paintLens();
    }
    function onPointerLeave() {
      if (isCoarse) return;
      lensOn = false;
      paintLens();
    }
    artEl.addEventListener("pointermove", onPointerMove);
    artEl.addEventListener("pointerleave", onPointerLeave);
    if (isCoarse) {
      artEl.addEventListener("click", function (e) {
        lensToPct(e);
        lensOn = !lensOn;
        cx = tx; cy = ty;
        paintLens();
      });
    }
    if (staysReduced) {
      paintLens();
    } else {
      (function tickLens() {
        if (lensOn) {
          cx += (tx - cx) * 0.3;
          cy += (ty - cy) * 0.3;
          if (Math.abs(cx - tx) < 0.01) cx = tx;
          if (Math.abs(cy - ty) < 0.01) cy = ty;
        }
        paintLens();
        window.requestAnimationFrame(tickLens);
      })();
    }
  }

  /* ---------------- live ticker — match id + ms clock ---------------- */
  var tickId = document.getElementById("gmMatchId");
  var tickTime = document.getElementById("gmTicker");
  var tickEpoch = Date.now();
  if (tickId && !tickId.textContent) {
    var seed = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase();
    tickId.textContent = "MMX-" + seed;
  }
  var ticking = false;
  function startTicker() {
    if (!tickTime || ticking) return;
    ticking = true;
    tickEpoch = Date.now();
    window.setInterval(function () {
      var ms = Date.now() - tickEpoch;
      var m = String(Math.floor(ms / 60000)).padStart(2, "0");
      var s = String(Math.floor(ms / 1000) % 60).padStart(2, "0");
      var cs = String(ms % 1000).padStart(3, "0");
      tickTime.textContent = m + ":" + s + ":" + cs;
    }, 40);
  }
  if (document.body.classList.contains("gamemode")) startTicker();

  /* ---------------- bottom system log ribbon ---------------- */
  var logEl = document.getElementById("gmLogText");
  var logTimer = null, logSeq = 0, logFadeTimer = null;
  var LOG_LINES = [
    "SQUAD ASSEMBLED",
    "SIGNAL LOCKED // MMX",
    "CALLING CARD LOCKED",
    "BUY PHASE OPEN",
    "TARGETING SPOTFIRE",
    "PLANET STATUS: STILL ON OUR SIDE"
  ];
  function logStep() {
    if (!document.body.classList.contains("gamemode")) return;
    logEl.textContent = LOG_LINES[logSeq % LOG_LINES.length];
    logSeq++;
    logEl.style.opacity = "";
    if (logFadeTimer) clearTimeout(logFadeTimer);
    logFadeTimer = setTimeout(function () {
      logEl.style.opacity = "0.25";
    }, 3600);
  }
  function startLogs() {
    if (!logEl || logTimer) return;
    if (staysReduced) {
      logEl.textContent = LOG_LINES[0];
      return;
    }
    logStep();
    logTimer = setInterval(logStep, 4500);
  }
  function stopLogs() {
    if (logEl) logEl.style.opacity = "";
    if (logTimer) { clearInterval(logTimer); logTimer = null; }
    if (logFadeTimer) { clearTimeout(logFadeTimer); logFadeTimer = null; }
  }
  if (document.body.classList.contains("gamemode")) startLogs();

  /* ---------------- sound mute toggle ---------------- */
  var muteBtn = document.getElementById("gmMute");
  function syncMute() {
    if (!muteBtn) return;
    var off = sfx.isMuted();
    muteBtn.classList.toggle("muted", off);
    muteBtn.setAttribute("aria-pressed", String(off));
    muteBtn.textContent = off ? "SND OFF" : "SND ON";
  }
  if (muteBtn) {
    syncMute();
    muteBtn.addEventListener("click", function () {
      sfx.setMuted(!sfx.isMuted());
      syncMute();
      if (!sfx.isMuted()) sfx.select();
    });
  }

  /* ---------------- keyboard — Esc exits (or collapses a pill first),
     arrows move pill heads & chips ---------------- */
  document.addEventListener("keydown", function (e) {
    if (!document.body.classList.contains("gamemode")) return;
    if (e.key === "Escape") {
      e.preventDefault();
      if (activePill) openPill(null);
      else exitGame();
    }
  });

  if (gmScreen) {
    gmScreen.addEventListener("keydown", function (e) {
      if (!document.body.classList.contains("gamemode")) return;
      var el = document.activeElement;
      if (!el || !el.classList) return;
      var isHead = el.classList.contains("gm-pill-head");
      var isChip = el.classList.contains("gm-chip");
      if (!isHead && !isChip) return;

      var dir = null;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown": dir = 1; break;
        case "ArrowLeft":
        case "ArrowUp": dir = -1; break;
        default: return;
      }
      var list = isHead ? pillHeads : cards;
      var idx = Array.prototype.indexOf.call(list, el);
      if (idx === -1) return;
      var next = list[(idx + dir + list.length) % list.length];
      e.preventDefault();
      if (isHead) {
        var willOpen = !next.closest(".gm-pill").classList.contains("open");
        openPill(next.closest(".gm-pill"));
        if (willOpen) sfx.open(); else sfx.close();
      } else {
        selectChip(next);
      }
      next.focus();
    });
  }
})();