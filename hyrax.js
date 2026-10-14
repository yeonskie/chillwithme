// ---------- Help the hyrax ----------
// A board of little boxes. Drag the hyrax around: the boxes under it are revealed.
// Some hide food. Find all the food and the hyrax gets its sunglasses.
//
// The four hyrax pictures live in games/hyrax/ (hyrax-1.png ... hyrax-4.png):
//   1 = eating   2 = waiting   3 = sunglasses (all food found)   4 = being dragged
// Swap any of those files for a new picture with the same name and it just works.

(function () {
  const board = document.getElementById("hy-board");
  const hyrax = document.getElementById("hy-hyrax");
  const hint = document.getElementById("hy-hint");
  const countEl = document.getElementById("hy-count");
  const soundBtn = document.getElementById("hy-sound");
  const againBtn = document.getElementById("hy-again");
  const restartBtn = document.getElementById("hy-restart");
  if (!board || !hyrax) return;

  // ---- things you can change ----
  const MONCH_FILE = "games/hyrax/monch.mp3";   // the sound that plays once when it eats; blank ("") = a built-in sound instead
  const MONCH_STYLE = "crunch";     // the built-in sound: "crunch" (crispy), "chomp" (low and thumpy) or "squeak" (cute)
  const MONCH_TEXT = "monch!";      // the word that pops up when it eats ("" for none)
  const HYRAX_SIZE = 1.8;           // how tall the hyrax is, in boxes (it was 2.6; smaller number = smaller hyrax)
  const EAT_MS = 800;               // how long the eating picture shows
  const PICS = { wait: 2, move: 4, eat: 1, done: 3 };
  const PLANT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21v-9"/><path d="M12 12c0-4-3-6-7-6 0 4 3 6 7 6z"/><path d="M12 14c0-3 2-5 6-5 0 3-2 5-6 5z"/></svg>';

  // preload the pictures so they don't flicker when they change
  Object.values(PICS).forEach((n) => { new Image().src = "games/hyrax/hyrax-" + n + ".png"; });

  let cells = [];          // { el, x, y, food, seen, eaten }
  let cell = 48, cols = 0, rows = 0, total = 0, eaten = 0;
  let pos = { x: 0, y: 0 };
  let dragging = false, grab = { x: 0, y: 0 };
  let eatTimer = null, finished = false, started = false, soundOn = true;

  // if a picture can't be found, say which one (usually the folder is in the wrong place)
  hyrax.addEventListener("error", () => {
    hint.textContent = "can't find the picture " + hyrax.getAttribute("src") + ". check it's in the games/hyrax folder.";
  });

  function setPic(state) {
    const src = "games/hyrax/hyrax-" + PICS[state] + ".png";
    if (!hyrax.src.endsWith(src)) hyrax.src = src;
  }
  function idleState() { return finished ? "done" : dragging ? "move" : "wait"; }

  // ---------- building the board ----------
  function build() {
    clearTimeout(eatTimer);
    eatTimer = null; finished = false; started = false; eaten = 0; dragging = false;
    board.querySelectorAll(".hy-cell").forEach((c) => c.remove());
    againBtn.hidden = true;
    hint.textContent = "the hyrax is hungry. drag it around to find food.";

    const small = window.matchMedia("(max-width: 40rem)").matches;
    cell = small ? 40 : 52;
    const w = board.clientWidth, h = board.clientHeight;
    cols = Math.max(4, Math.floor(w / cell));
    rows = Math.max(4, Math.floor(h / cell));
    board.style.setProperty("--cell", cell + "px");
    board.style.setProperty("--cols", cols);
    board.style.setProperty("--rows", rows);

    // the hyrax: a bit bigger than a couple of boxes
    const size = Math.round(cell * HYRAX_SIZE);
    hyrax.style.height = size + "px";
    pos = { x: w / 2, y: h / 2 };
    place();

    // the grid sits in the middle of the board
    const gridW = cols * cell, gridH = rows * cell;
    const offX = (w - gridW) / 2, offY = (h - gridH) / 2;
    board.style.setProperty("--off-x", offX + "px");
    board.style.setProperty("--off-y", offY + "px");

    cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const el = document.createElement("div");
        el.className = "hy-cell";
        el.style.left = offX + c * cell + "px";
        el.style.top = offY + r * cell + "px";
        board.insertBefore(el, hyrax);
        cells.push({ el, x: offX + (c + 0.5) * cell, y: offY + (r + 0.5) * cell, food: false, seen: false, eaten: false });
      }
    }

    // hide the food, away from where the hyrax starts
    total = Math.min(10, Math.max(5, Math.round((cols * rows) / 45)));
    const candidates = cells.filter((c) => Math.hypot(c.x - pos.x, c.y - pos.y) > cell * 3);
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    candidates.slice(0, total).forEach((c) => { c.food = true; c.el.innerHTML = PLANT; });
    updateCount();
    setPic("wait");
  }

  function updateCount() { countEl.textContent = "food found " + eaten + " / " + total; }

  // ---------- moving the hyrax ----------
  function place() {
    hyrax.style.transform = "translate(" + (pos.x - hyrax.offsetWidth / 2) + "px, " + (pos.y - hyrax.offsetHeight / 2) + "px)";
  }

  function moveTo(x, y) {
    // the whole hyrax stays on the board
    const hx = hyrax.offsetWidth / 2, hy = hyrax.offsetHeight / 2;
    pos.x = Math.min(board.clientWidth - hx, Math.max(hx, x));
    pos.y = Math.min(board.clientHeight - hy, Math.max(hy, y));
    place();
    started = true;
    reveal();
  }

  // boxes near the hyrax show what's under them; food under its nose gets eaten
  function reveal() {
    const R = hyrax.offsetHeight * 0.75 + cell * 0.3;   // boxes light up a little ahead of the hyrax, so you can spot the food
    const reach = Math.max(cell * 0.8, hyrax.offsetHeight * 0.4);   // how close to the food it has to be
    cells.forEach((c) => {
      const d = Math.hypot(c.x - pos.x, c.y - pos.y);
      if (d < R && !c.seen) { c.seen = true; c.el.classList.add("seen"); }
      if (c.food && !c.eaten && d < reach) eat(c);
    });
  }

  function eat(c) {
    c.eaten = true;
    c.el.classList.add("eaten");
    c.el.innerHTML = "";
    eaten++;
    updateCount();
    monch();
    pop();
    setPic("eat");
    clearTimeout(eatTimer);
    if (eaten >= total) {
      finished = true;
      eatTimer = setTimeout(win, EAT_MS);
    } else {
      eatTimer = setTimeout(() => { eatTimer = null; setPic(idleState()); }, EAT_MS);
    }
  }

  // a little word that floats up from the hyrax so you can tell it ate
  function pop() {
    if (!MONCH_TEXT) return;
    const s = document.createElement("span");
    s.className = "hy-pop";
    s.textContent = MONCH_TEXT;
    s.style.left = pos.x + "px";
    s.style.top = pos.y - hyrax.offsetHeight * 0.55 + "px";
    board.appendChild(s);
    setTimeout(() => s.remove(), 900);
  }

  function win() {
    eatTimer = null;
    setPic("done");
    hint.textContent = "the hyrax is full. thank you!";
    againBtn.hidden = false;
    cells.forEach((c) => { c.seen = true; c.el.classList.add("seen"); });
  }

  // ---------- dragging (mouse, finger and keyboard) ----------
  hyrax.addEventListener("pointerdown", (e) => {
    if (finished) return;
    e.preventDefault();
    dragging = true;
    const b = board.getBoundingClientRect();
    grab = { x: e.clientX - b.left - pos.x, y: e.clientY - b.top - pos.y };
    hyrax.setPointerCapture(e.pointerId);
    hyrax.classList.add("dragging");
    if (!eatTimer) setPic("move");
    wake();
  });
  hyrax.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const b = board.getBoundingClientRect();
    moveTo(e.clientX - b.left - grab.x, e.clientY - b.top - grab.y);
  });
  function drop() {
    if (!dragging) return;
    dragging = false;
    hyrax.classList.remove("dragging");
    if (!eatTimer) setPic(idleState());
  }
  hyrax.addEventListener("pointerup", drop);
  hyrax.addEventListener("pointercancel", drop);

  hyrax.addEventListener("keydown", (e) => {
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!step || finished) return;
    e.preventDefault();
    wake();
    if (!eatTimer) setPic("move");
    moveTo(pos.x + step[0] * cell * 0.5, pos.y + step[1] * cell * 0.5);
  });
  hyrax.addEventListener("keyup", () => { if (!eatTimer && !dragging) setPic(idleState()); });

  // ---------- sound ----------
  let ctx = null, audio = null;
  function wake() {
    if (MONCH_FILE) { if (!audio) audio = new Audio(MONCH_FILE); return; }
    try {
      if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
      if (ctx && ctx.state === "suspended") ctx.resume();
    } catch (e) { ctx = null; }
  }

  // the built-in sounds: a few quick bursts of filtered noise (and a little tone for some styles)
  const STYLES = {
    crunch: { times: [0, 0.14, 0.28], len: 0.09, freq: 900, step: 250, q: 0.9, vol: 0.8 },
    chomp:  { times: [0, 0.2, 0.4],   len: 0.14, freq: 220, step: -30, q: 0.7, vol: 1.0, thump: 110 },
    squeak: { times: [0, 0.12, 0.24], len: 0.07, freq: 1800, step: 400, q: 2.5, vol: 0.5, tone: 900 },
  };

  function monch() {
    if (!soundOn) return;
    if (MONCH_FILE) { if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); } return; }
    if (!ctx) return;
    const st = STYLES[MONCH_STYLE] || STYLES.crunch;
    try {
      const t0 = ctx.currentTime;
      st.times.forEach((delay, i) => {
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * st.len), ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let k = 0; k < data.length; k++) data[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / data.length, 2);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = st.freq + i * st.step;
        filter.Q.value = st.q;
        const gain = ctx.createGain();
        gain.gain.value = st.vol;
        src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
        src.start(t0 + delay);
        // optional low thump or high chirp under each bite
        const f = st.thump || (st.tone && st.tone + i * 150);
        if (f) {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.frequency.setValueAtTime(f, t0 + delay);
          o.frequency.exponentialRampToValueAtTime(f * (st.thump ? 0.5 : 1.5), t0 + delay + st.len);
          g.gain.setValueAtTime(0.5, t0 + delay);
          g.gain.exponentialRampToValueAtTime(0.001, t0 + delay + st.len);
          o.connect(g); g.connect(ctx.destination);
          o.start(t0 + delay); o.stop(t0 + delay + st.len);
        }
      });
    } catch (e) { /* no sound is fine */ }
  }

  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    soundBtn.textContent = "sound: " + (soundOn ? "on" : "off");
  });
  againBtn.addEventListener("click", () => { wake(); build(); });
  if (restartBtn) restartBtn.addEventListener("click", () => { wake(); build(); });   // new random food, hyrax back in the middle

  // ---------- the pop-up the first time you open the game ----------
  const intro = document.getElementById("hy-intro");
  const introGo = document.getElementById("hy-intro-go");
  const SEEN_KEY = "hyrax-intro-seen";    // remembered in the visitor's browser, so it only shows the first time
  let seenThisVisit = false;

  function introSeen() {
    if (seenThisVisit) return true;
    try { return localStorage.getItem(SEEN_KEY) === "1"; } catch (e) { return false; }
  }
  function showIntro() {
    if (!intro || introSeen()) return;
    intro.hidden = false;
    introGo.focus();
  }
  function closeIntro() {
    if (!intro || intro.hidden) return;
    intro.hidden = true;
    seenThisVisit = true;
    try { localStorage.setItem(SEEN_KEY, "1"); } catch (e) { /* it just shows again next time */ }
    wake();    // clicking the button also lets the sound play
    hyrax.focus({ preventScroll: true });
  }
  if (introGo) introGo.addEventListener("click", closeIntro);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeIntro(); });

  // ---------- when to build ----------
  // the board only has a size once the page is showing, so build then (and again if the window changes before you've started)
  function check() {
    if (location.hash !== "#hyrax") return;
    if (!cells.length) build();
    showIntro();
  }
  window.addEventListener("hashchange", () => {
    if (location.hash === "#hyrax") requestAnimationFrame(() => { if (!cells.length) build(); showIntro(); });
    else if (intro) intro.hidden = true;
  });
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (location.hash === "#hyrax" && !started && !finished) build(); }, 200);
  });
  check();
})();