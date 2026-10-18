// REMY THE RAT: the pet you can play with.
//
// Once you own the rat (rare items shop), clicking her in the corner (or "play with remy" in the inventory) opens
// this panel. Most buttons swap her picture for a few seconds, then she goes back to her main picture.
// "feed her cheese!" and "give a hat!" put the cheese / hat in the corner of the panel: drag it onto her and she changes picture.
// The panel only closes with the x (or Escape), never by clicking outside it, and her picture stays until you press another button.
// "pet" is different: it turns your cursor into a hand, and every click on her makes her squeak and squish.
//
// To CHANGE something: STATES below has one line per button.
//   art  - which drawing to show (they live in index.html, in the <svg class="pet-defs"> near the top: "pa-rat-eat" etc.)
//   ms   - how many milliseconds before she goes back to normal (0 = she stays that way until you press another button; all of them are 0 now)
//   say  - the little line under her
// The "battle!" button opens the battle (battle.js).

(function () {
  const el = document.getElementById("remy");
  if (!el) return;
  const art = document.getElementById("remy-art");
  const stage = document.getElementById("remy-stage");
  const title = document.getElementById("remy-title");
  const closeBtn = document.getElementById("remy-close");
  const card = el.querySelector(".remy-card");

  const MAIN = { art: "pa-rat", say: "" };
  const STATES = {
    eat:    { art: "pa-rat-eat",    ms: 0, say: "*nom nom nom*" },
    hat:    { art: "pa-rat-hat",    ms: 0, say: "how do i look?" },
    rain:   { art: "pa-rat-rain",   ms: 0, say: "*splish splash*" },
  };
  let timer = null, from = null, petting = false, sayTimer = null, curKey = null;
  const petBtn = el.querySelector('.remy-btn[data-act="pet"]');

  // a line under her picture
  let sayEl = card.querySelector(".remy-say");
  if (!sayEl) {
    sayEl = document.createElement("p");
    sayEl.className = "remy-say";
    sayEl.setAttribute("role", "status");
    stage.insertAdjacentElement("afterend", sayEl);
  }

  function name() { return window.YBShop && window.YBShop.nameOf ? window.YBShop.nameOf("rat") : "remy"; }

  function setPetting(on) {
    petting = on;
    card.dataset.petting = on ? "1" : "0";
    petBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  // a little squeak (made in the browser, no sound file)
  let ctx = null;
  function chirp() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = ctx || new AC();
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(1300, t);
      o.frequency.exponentialRampToValueAtTime(2400, t + 0.08);
      o.frequency.exponentialRampToValueAtTime(1700, t + 0.16);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.07, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.2);
    } catch (e) {}
  }
  function squeak() {
    chirp();
    sayEl.textContent = "squeak!";
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => { if (petting) sayEl.textContent = "pet her!"; }, 900);
    stage.classList.remove("squish");
    void stage.offsetWidth;                                       // (restarts the squish)
    stage.classList.add("squish");
  }

  // the raindrops: made once, they keep falling the whole time it's raining (CSS only shows them in the rain state)
  (function () {
    const rain = document.getElementById("remy-rain");
    if (!rain) return;
    const N = 26;
    for (let i = 0; i < N; i++) {
      const d = document.createElement("span");
      const dur = 1.1 + ((i * 37) % 10) / 10;                     // 1.1s - 2.0s, a different speed for each drop
      d.className = "remy-drop";
      d.style.setProperty("--x", ((i + 0.5) / N * 96 + 1 + ((i * 53) % 7) / 7 * 2).toFixed(1) + "%");
      d.style.setProperty("--s", (0.8 + ((i * 29) % 5) * 0.12).toFixed(2) + "rem");
      d.style.setProperty("--d", dur.toFixed(2) + "s");
      d.style.setProperty("--delay", "-" + (((i * 71) % 100) / 100 * dur).toFixed(2) + "s");   // (negative = already falling when it appears)
      d.innerHTML = '<svg viewBox="4 4 80 92" aria-hidden="true" focusable="false"><use href="#remy-drop"/></svg>';
      rain.appendChild(d);
    }
  })();

  // the things you drag onto her (the cheese and the hat): each one shows up in the corner, you drag it onto her
  const cheese = document.getElementById("remy-cheese");
  const hat = document.getElementById("remy-hat");
  const ITEMS = [{ btn: cheese, key: "eat" }, { btn: hat, key: "hat" }];
  function hideItems() {
    ITEMS.forEach((it) => { it.btn.hidden = true; it.btn.classList.remove("dragging"); it.btn.style.transform = ""; });
    stage.classList.remove("hungry");
  }
  function overRat(x, y) {
    const r = stage.getBoundingClientRect();
    return x > r.left + r.width * 0.15 && x < r.right - r.width * 0.15 && y > r.top - 20 && y < r.bottom + 20;
  }
  ITEMS.forEach((it) => {
    const b = it.btn;
    let drag = null;
    const reset = () => { drag = null; b.classList.remove("dragging"); stage.classList.remove("hungry"); b.style.transform = ""; };
    b.addEventListener("pointerdown", (e) => {
      if (e.button) return;
      b.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, moved: false };
      b.classList.add("dragging");
      stage.classList.add("hungry");
      e.preventDefault();
    });
    b.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      b.style.transform = "translate(" + dx + "px," + dy + "px) rotate(" + Math.max(-14, Math.min(14, dx / 12)) + "deg)";
    });
    b.addEventListener("pointerup", (e) => {
      if (!drag) return;
      const moved = drag.moved;
      reset();
      if (moved && overRat(e.clientX, e.clientY)) { hideItems(); show(it.key); }
      else if (moved) sayEl.textContent = "drag it onto her!";
    });
    b.addEventListener("pointercancel", reset);
    b.addEventListener("click", (e) => { if (e.detail === 0) { hideItems(); show(it.key); } });   // keyboard: Enter / Space
  });

  function show(key) {
    clearTimeout(timer);
    if (key !== "eat" && key !== "hat") hideItems();
    if (key) { setPetting(false); stage.classList.remove("squish"); }
    const st = key ? STATES[key] : MAIN;
    art.setAttribute("href", "#" + st.art);
    card.dataset.state = key || "main";
    curKey = key || null;
    sayEl.textContent = st.say;
    stage.classList.remove("pop");
    void stage.offsetWidth;                                       // (restarts the little bounce)
    if (key) stage.classList.add("pop");
    if (key && st.ms) timer = setTimeout(() => show(null), st.ms);
    if (!key && !petting) sayEl.textContent = "";
  }

  function open(opener) {
    if (!window.YBShop || !window.YBShop.owns("pet-rat")) return;
    from = opener || null;
    title.textContent = "this is " + name() + "!";
    setPetting(false);
    show(null);
    el.hidden = false;
    closeBtn.focus();
  }
  function close(restore) {
    if (el.hidden) return;
    clearTimeout(timer);
    el.hidden = true;
    hideItems();
    if (restore !== false && from && document.contains(from)) from.focus();
    from = null;
  }

  el.querySelectorAll(".remy-btn").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.act === "pet") {                                // pet: switch the hand on or off
      const on = !petting;                                        // (her picture stays exactly as it is: eating, hat, rain...)
      setPetting(on);
      hideItems();
      sayEl.textContent = on ? "pet her!" : (STATES[curKey] ? STATES[curKey].say : "");
    } else if (b.dataset.act === "eat" || b.dataset.act === "hat") {   // feed / hat: the item appears, you drag it onto her
      const isEat = b.dataset.act === "eat";
      hideItems();
      setPetting(false);
      (isEat ? cheese : hat).hidden = false;
      sayEl.textContent = isEat ? "drag the cheese onto her!" : "drag the hat onto her!";
    } else if (b.dataset.act === "battle") {                      // battle: the panel closes and the battle opens (battle.js)
      if (window.Battle) { const opener = from; close(false); window.Battle.start(opener); }
    } else show(b.dataset.act);
  }));
  stage.addEventListener("click", () => { if (petting) squeak(); });
  closeBtn.addEventListener("click", () => close());
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  window.addEventListener("hashchange", () => close(false));

  window.Remy = { open: open, close: close, chirp: chirp };
})();