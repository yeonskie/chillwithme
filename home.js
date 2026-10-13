// ---------- Home page: the rotating boxes ----------
// The boxes slide from left to right and fade into each other. It turns by itself every 3 seconds. It waits while someone hovers or focuses it, and
// whenever the home page isn't the one showing. The < and > buttons (and swiping) turn it by hand.

(function () {
  const box = document.getElementById("home-carousel");
  const list = document.getElementById("home-slides");
  const prev = document.getElementById("home-prev");
  const next = document.getElementById("home-next");
  if (!box || !list || !prev || !next) return;

  const slides = Array.from(list.querySelectorAll(".home-slide"));
  if (!slides.length) return;

  const EVERY_MS = 3000;          // how often it changes
  const MOVE_MS = 1200;           // how long the slide and fade takes
  const SHIFT_PX = 50;            // how far each box travels while it fades
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let index = 0, timer = null, paused = false;

  let running = [];

  // dir 1: boxes travel left to right (the next one slides in from the left)
  // dir -1: the other way round (used by the < button)
  function show(i, dir) {
    const from = index;
    index = (i + slides.length) % slides.length;
    running.forEach((a) => a.finish());              // if one is still moving, let it land first
    running = [];
    slides.forEach((s, n) => {
      const on = n === index;
      s.classList.toggle("active", on);
      s.setAttribute("aria-hidden", String(!on));
      const link = s.querySelector("a");
      if (link) link.tabIndex = on ? 0 : -1;
    });
    if (dir === undefined || from === index || !slides[from].animate) return;
    const d = dir < 0 ? -1 : 1;
    const opts = { duration: reduced ? 0 : MOVE_MS, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" };
    const incoming = slides[index], outgoing = slides[from];
    outgoing.classList.add("leaving");
    const out = outgoing.animate(
      [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(" + d * SHIFT_PX + "px)" }], opts);
    const inn = incoming.animate(
      [{ opacity: 0, transform: "translateX(" + -d * SHIFT_PX + "px)" }, { opacity: 1, transform: "none" }], opts);
    running = [out, inn];
    out.onfinish = () => { outgoing.classList.remove("leaving"); out.cancel(); };
    inn.onfinish = () => { inn.cancel(); };
  }

  function onHome() {
    return !location.hash || location.hash === "#home";
  }

  function stop() { clearInterval(timer); timer = null; }
  function start() {
    stop();
    if (reduced || paused || document.hidden || slides.length < 2) return;
    timer = setInterval(() => { if (onHome()) show(index + 1, 1); }, EVERY_MS);
  }

  prev.addEventListener("click", () => { show(index - 1, -1); start(); });
  next.addEventListener("click", () => { show(index + 1, 1); start(); });

  box.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch") { paused = true; stop(); } });
  box.addEventListener("pointerleave", (e) => { if (e.pointerType !== "touch") { paused = false; start(); } });
  box.addEventListener("focusin", () => { paused = true; stop(); });
  box.addEventListener("focusout", () => { paused = false; start(); });
  document.addEventListener("visibilitychange", start);

  // swipe left or right on a phone
  let startX = null;
  list.addEventListener("pointerdown", (e) => { startX = e.clientX; });
  list.addEventListener("pointerup", (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) { const d = dx < 0 ? -1 : 1; show(index - d, d); start(); }
  });
  list.addEventListener("pointercancel", () => { startX = null; });

  // a random page: the ones in the boxes plus every fairground place (never the same one twice in a row,
  // and never the page you're already on). Used by "randomize my stay" and by "surprise me" in the bottom bar.
  let lastPick = "";
  function goRandom() {
    const pages = slides.map((s) => s.querySelector("a")).filter(Boolean).map((a) => a.getAttribute("href"))
      .concat(Array.from(document.querySelectorAll(".page.place")).map((p) => "#" + p.dataset.page));
    const options = pages.filter((p) => p !== lastPick && p !== location.hash);
    const pool = options.length ? options : pages;
    if (!pool.length) return;
    lastPick = pool[Math.floor(Math.random() * pool.length)];
    location.hash = lastPick;
  }

  const randomBtn = document.getElementById("home-random");
  if (randomBtn) randomBtn.addEventListener("click", goRandom);

  // bottom left: the name on the home page, "surprise me" everywhere else
  const barName = document.getElementById("bar-name");
  const barSurprise = document.getElementById("bar-surprise");
  if (barName && barSurprise) {
    const sync = () => {
      const current = document.querySelector(".page.active");
      const atHome = !current || current.dataset.page === "home";
      barName.hidden = !atHome;
      barSurprise.hidden = atHome;
    };
    barSurprise.addEventListener("click", goRandom);
    window.addEventListener("hashchange", sync);
    sync();
  }

  show(0);
  start();
})();