// ---------- The arcade: the games going round in a circle ----------
// Each game is an <li> in index.html. This works out where each one sits on the circle,
// so adding or removing a game just works. (On phones the CSS turns the circle into a plain list.)

(function () {
  const ring = document.getElementById("arcade-ring");
  const status = document.getElementById("arcade-status");
  if (!ring) return;

  const items = Array.from(ring.querySelectorAll(".arcade-item"));
  ring.style.setProperty("--n", items.length);
  items.forEach((item, i) => item.style.setProperty("--i", i));

  // the games aren't built yet: say so instead of doing nothing
  let timer = null;
  ring.addEventListener("click", (e) => {
    const card = e.target.closest(".arcade-card");
    if (!card) return;
    if (card.dataset.href) { location.hash = card.dataset.href; return; }   // a finished game opens its page
    if (!status) return;
    const name = card.querySelector(".arcade-name");
    status.textContent = (name ? name.textContent : "this game") + " isn't open yet. check back soon.";
    clearTimeout(timer);
    timer = setTimeout(() => { status.textContent = ""; }, 5000);
  });
})();

// ---------- The arcade cabinet: after a few quiet seconds one game gives a little nudge ----------
(function () {
  const page = document.querySelector('.page[data-page="arcade"]');
  const btns = page ? Array.from(page.querySelectorAll(".ac-btn")) : [];
  if (!btns.length) return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let timer = null, last = -1;
  function nudge() {
    if (page.classList.contains("active") && !document.hidden && !(document.querySelector(".ac") || {dataset:{}}).dataset.coin && !document.querySelector(".ac.is-locked")) {
      let i;
      do { i = Math.floor(Math.random() * btns.length); } while (i === last && btns.length > 1);
      last = i;
      const b = btns[i];
      b.classList.remove("ac-nudge");
      void b.offsetWidth;                       // restart the animation
      b.classList.add("ac-nudge");
      b.addEventListener("animationend", () => b.classList.remove("ac-nudge"), { once: true });
    }
    timer = setTimeout(nudge, 6000);            // still quiet: another one in a bit
  }
  function wake() { clearTimeout(timer); timer = setTimeout(nudge, 5000); }

  ["pointerdown", "pointermove", "keydown", "touchstart", "scroll"].forEach((ev) =>
    window.addEventListener(ev, wake, { passive: true, capture: true }));
  window.addEventListener("hashchange", wake);
  wake();
})();


// ---------- The arcade cabinet: the buttons on the control panel can be pressed (they don't do anything) ----------
(function () {
  const art = document.querySelector(".ac-art");
  if (!art) return;
  art.addEventListener("pointerdown", (e) => {
    const key = e.target.closest(".ac-key, .ac-coin");
    if (key) {
      key.classList.remove("ac-hit-on");
      void key.getBoundingClientRect();
      key.classList.add("ac-hit-on");
      setTimeout(() => key.classList.remove("ac-hit-on"), key.classList.contains("ac-coin") ? 350 : 160);
      return;
    }
    const joy = e.target.closest(".ac-joy");
    if (joy) {                                   // a quick flick to one side and back
      const stick = joy.querySelector(".ac-stick");
      const cls = Math.random() < 0.5 ? "ac-flick-l" : "ac-flick-r";
      stick.classList.add(cls);
      setTimeout(() => stick.classList.remove(cls), 180);
    }
  });
})();


// ---------- The arcade cabinet: the hyrax token ----------
// click the little coin to take it out (it grows over the screen), click it again and it flies to the coin slot,
// drops in, and the screen flashes inverse. a moment later the coin is back so it can be used again.
(function () {
  const ac = document.querySelector(".ac");
  const tok = ac && ac.querySelector(".ac-token");
  const flash = ac && ac.querySelector(".ac-flash");
  if (!tok || !flash) return;

  // the games are locked the first time you come in (until the token goes in the slot)
  const nav = ac.querySelector(".ac-screen");
  const note = ac.querySelector(".ac-insert");
  let unlocked = false;
  try { unlocked = sessionStorage.getItem("arcade-token") === "1"; } catch (e) {}
  const lock = (on) => { ac.classList.toggle("is-locked", on); if (nav) nav.inert = on; };
  lock(!unlocked);
  const unlock = () => { lock(false); try { sessionStorage.setItem("arcade-token", "1"); } catch (e) {} };
  if (note) note.addEventListener("click", () => {      // a nudge toward the coin
    if (tok.dataset.st !== "rest") return;
    tok.classList.remove("ac-wiggle"); void tok.offsetWidth; tok.classList.add("ac-wiggle");
    setTimeout(() => tok.classList.remove("ac-wiggle"), 550);
  });

  const setState = (st) => {
    tok.dataset.st = st;
    if (st === "up" || st === "in") ac.dataset.coin = st; else delete ac.dataset.coin;
    tok.setAttribute("aria-label", st === "up" ? "hyrax token: put it in the coin slot" : "hyrax token: take it out");
  };
  const putBack = () => { if (tok.dataset.st === "up") setState("rest"); };

  tok.addEventListener("click", () => {
    const st = tok.dataset.st;
    if (st === "rest") { tok.classList.remove("ac-back"); setState("up"); return; }
    if (st !== "up") return;
    setState("in");
    const done = (e) => {
      if (e.target !== tok) return;
      tok.removeEventListener("animationend", done);
      setState("gone");
      unlock();
      flash.classList.remove("on"); void flash.offsetWidth; flash.classList.add("on"); ac.classList.add("flashing");
      flash.addEventListener("animationend", () => { flash.classList.remove("on"); ac.classList.remove("flashing"); }, { once: true });
      setTimeout(() => { tok.classList.add("ac-back"); setState("rest"); }, 2000);
    };
    tok.addEventListener("animationend", done);
  });

  // click anywhere else, or press escape, and the coin goes back
  document.addEventListener("pointerdown", (e) => { if (!tok.contains(e.target)) putBack(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") putBack(); });
  window.addEventListener("hashchange", putBack);
})();


// ---------- The arcade cabinet: how far its side lines have to run to reach the bottom bar (phones) ----------
(function () {
  const page = document.querySelector('.page[data-page="arcade"]');
  const ac = page && page.querySelector(".ac");
  if (!ac) return;
  function measure() {
    if (!page.classList.contains("active")) return;
    const p = page.getBoundingClientRect(), c = ac.getBoundingClientRect();
    // the side lines are drawn in the cabinet svg, so they join its base exactly: lengthen them down to the bottom bar
    const ext = ac.querySelector(".ac-ext");
    if (ext && c.width) {
      const len = Math.max(0, p.bottom - c.bottom) * 630 / c.width;
      const fill = ac.querySelector(".ac-extfill");
      if (fill) fill.setAttribute("d", "M242.05,1080H842.83V" + (1080 + len + 2).toFixed(1) + "H242.05Z");
      ext.setAttribute("d", "M242.05,1080V" + (1080 + len + 2).toFixed(1) + "M842.83,1080V" + (1080 + len + 2).toFixed(1));
    }
  }
  window.addEventListener("resize", measure);
  window.addEventListener("hashchange", () => setTimeout(measure, 0));
  window.addEventListener("load", measure);
  measure();
})();
