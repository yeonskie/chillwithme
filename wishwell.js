// ---------- the wishes database (Supabase; see community-config.js and supabase-wishes.sql) ----------
// Anyone can read and add wishes, nothing else. Wishes are anonymous: nothing about the person is saved.
// To hide a wish, set approved to false in the Supabase dashboard (or delete the row).
const WWDB = (function () {
  const cfg = typeof COMMUNITY !== "undefined" ? COMMUNITY : {};
  const BASE = String(cfg.url || "").trim().replace(/\/+$/, "");
  const KEY = String(cfg.key || "").trim();
  const configured = /^https:\/\/[^\s/]+/i.test(BASE) && KEY.length > 20;
  const PAGE = 48;                         // wishes per load
  const COOLDOWN_MS = 20 * 1000;           // one wish every 20 seconds from the same browser
  const LAST_KEY = "wish-last";
  const MINE_KEY = "ww-mine";              // the wishes this browser has thrown in (kept here so they can sparkle in the grid)
  function mineList() {
    try { const a = JSON.parse(localStorage.getItem(MINE_KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }

  function headers(extra) {
    const h = { apikey: KEY, ...extra };
    if (/^eyJ/.test(KEY)) h.Authorization = "Bearer " + KEY;
    return h;
  }
  async function api(path, options) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    try {
      const res = await fetch(BASE + path, { ...options, signal: ctl.signal });
      if (!res.ok) throw new Error(String(res.status));
      return res;
    } finally { clearTimeout(timer); }
  }
  return {
    configured, PAGE,
    async list(offset) {
      const res = await api("/rest/v1/wishes?select=id,created_at,body&approved=eq.true&order=created_at.desc&limit=" + PAGE + "&offset=" + (offset || 0), { headers: headers() });
      return (await res.json()).filter((w) => w && typeof w.id === "string" && typeof w.body === "string");
    },
    async add(text) {
      await api("/rest/v1/wishes", {
        method: "POST",
        headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify({ body: text.slice(0, 120) }),
      });
      try {
        localStorage.setItem(LAST_KEY, String(Date.now()));
        const a = mineList(); a.push(text.slice(0, 120));
        localStorage.setItem(MINE_KEY, JSON.stringify(a.slice(-100)));
      } catch (e) {}
    },
    isMine(body) { return mineList().indexOf(body) !== -1; },
    waitLeft() {
      let last = 0;
      try { last = Number(localStorage.getItem(LAST_KEY)) || 0; } catch (e) {}
      return Math.max(0, COOLDOWN_MS - (Date.now() - last));
    },
  };
})();

// ---------- Wishing well: tap the hyrax coin, it opens up big and turns around, write a wish, throw it in ----------
// The coin's drawing is copied from the arcade's hyrax token, so there's only one copy of it to edit.
// (For now a wish isn't saved anywhere: it just gets thrown in. Saving them is the next step.)
(function () {
  const ww = document.getElementById("ww");
  const coin = document.getElementById("ww-coin");
  const card = document.getElementById("ww-card");
  const front = document.getElementById("ww-front");
  const wish = document.getElementById("ww-wish");
  const count = document.getElementById("ww-count");
  const dim = document.getElementById("ww-dim");
  const hint = document.getElementById("ww-hint");
  const goBtn = document.getElementById("ww-throw");
  const backBtn = document.getElementById("ww-cancel");
  const page = document.querySelector('.page[data-page="wishing-well"]');
  if (!ww || !coin || !card || !front || !wish) return;

  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const art = ww.querySelector(".ww-art");
  const HINT = "tap the coin to make a wish";
  let busy = false;
  let timers = [];
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  // the coin's drawing, copied from the arcade
  const src = document.querySelector(".ac-token svg");
  if (src) {
    const art = src.cloneNode(true);
    art.querySelectorAll(".hk-text").forEach((t) => t.remove());          // no "hyrax token" lettering on this one
    art.querySelectorAll("g").forEach((g) => { if (!g.children.length) g.remove(); });
    // the hyrax and its sparkles sit a little lower, now that the lettering is gone
    const NS = "http://www.w3.org/2000/svg";
    const lower = [];
    [...art.children].forEach((el) => {
      if (el.tagName !== "g") return;
      if (el.querySelector(".hk-ring")) { [...el.children].forEach((c) => { if (c.tagName === "g") lower.push(c); }); }
      else lower.push(el);
    });
    lower.forEach((el) => {
      const wrap = document.createElementNS(NS, "g");
      wrap.setAttribute("transform", "translate(0 38)");
      el.parentNode.insertBefore(wrap, el);
      wrap.appendChild(el);
    });
    front.appendChild(art);
  }

  const isOpen = () => coin.dataset.st === "open";
  const setFace = (f) => { coin.dataset.face = f; };

  // turn the coin around: it's a little 3D disc with an edge (see coinrig.js), so it spins half a turn and you see its edge go by
  function flip(toFace) {
    if (coin.dataset.face === toFace) return Promise.resolve();
    const faceArt = front.querySelector("svg"), backArt = card.querySelector(".ww-back > svg");
    if (reduce || !coin.animate || !window.CoinRig || !faceArt) { setFace(toFace); return Promise.resolve(); }
    const rig = CoinRig.build(coin, faceArt, backArt);
    coin.classList.add("ww-tossing");
    const toBack = toFace === "back";
    const a = CoinRig.spin(rig, toBack ? 0 : 180, toBack ? 180 : 360, { duration: 750, easing: "ease-in-out" });
    const finish = () => { setFace(toFace); a.cancel(); rig.remove(); coin.classList.remove("ww-tossing"); };
    return a.finished.then(finish).catch(finish);
  }

  function open() {
    if (busy || coin.dataset.st !== "rest") return;
    busy = true;
    ww.classList.add("is-open");
    coin.dataset.st = "open";
    later(() => {
      flip("back").then(() => {
        busy = false;
        wish.focus({ preventScroll: true });
        fit();
      });
    }, reduce ? 0 : 650);
  }

  function close(instant) {
    clearTimers();
    ww.classList.remove("is-open");
    if (instant) {
      setFace("front");
      coin.dataset.st = "rest";
      busy = false;
      return;
    }
    if (busy && coin.dataset.st !== "open") return;
    busy = true;
    wish.blur();
    flip("front").then(() => {
      coin.dataset.st = "rest";
      later(() => { busy = false; }, reduce ? 0 : 600);
    });
  }

  // the wish box grows with what's written (so the text stays in the middle of the coin)
  function fit() {
    wish.style.height = "auto";
    wish.style.height = Math.min(wish.scrollHeight, wish.parentElement.clientHeight) + "px";
    count.textContent = wish.value.length + " / " + wish.maxLength;
  }
  wish.addEventListener("input", fit);
  wish.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); throwIn(); }
  });

  // where the splash goes, in the fountain drawing's own coordinates
  const VB = { x: 150, y: 135, w: 780, h: 905 };
  const LAND = { x: 540, y: 662 };

  function splash() {
    if (!art) return;
    const ns = "http://www.w3.org/2000/svg";
    [0, 0.28].forEach((delay, i) => {
      const e = document.createElementNS(ns, "ellipse");
      e.setAttribute("class", "ww-splash");
      e.setAttribute("cx", LAND.x); e.setAttribute("cy", LAND.y);
      e.setAttribute("rx", i ? 62 : 44); e.setAttribute("ry", i ? 17 : 12);
      e.style.animationDelay = delay + "s";
      art.appendChild(e);
      setTimeout(() => e.remove(), 2400);
    });
  }

  function throwIn() {
    if (busy || !isOpen() || coin.dataset.face !== "back") return;
    if (!wish.value.trim()) {
      wish.classList.remove("is-empty-shake"); void wish.offsetWidth; wish.classList.add("is-empty-shake");
      wish.focus({ preventScroll: true });
      return;
    }
    const left = WWDB.waitLeft();
    if (left > 0) {
      hint.textContent = "the well needs a moment. try again in " + Math.ceil(left / 1000) + "s.";
      hint.style.opacity = "0.9";
      later(() => { hint.style.opacity = ""; }, 1800);
      return;
    }
    busy = true;
    wish.blur();
    const text = wish.value.trim();
    let saved = null;                                       // the wish is saved while the coin is in the air
    if (WWDB.configured) saved = WWDB.add(text).then(() => true, () => false);
    flip("front").then(() => {
      ww.classList.remove("is-open");                       // the page comes back as the coin flies
      const fr = ww.querySelector(".ww-fit").getBoundingClientRect();
      const cr = coin.getBoundingClientRect();
      const cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
      const tx = fr.left + ((LAND.x - VB.x) / VB.w) * fr.width;
      const ty = fr.top + ((LAND.y - VB.y) / VB.h) * fr.height;
      const dx = tx - cx, dy = ty - cy;
      const lift = -0.3 * fr.height;                         // up over the top of the fountain
      const endScale = (0.1 * fr.width) / cr.width;
      const base = "translate(-50%, -50%) ";
      coin.dataset.st = "throw";
      const done = () => {
        coin.dataset.st = "gone";
        splash();
        hint.textContent = "your wish is in the well";
        hint.style.opacity = "0.9";
        wish.value = ""; fit();
        if (!WWDB.configured) { hint.textContent = "the well isn't set up yet, so nobody will see it."; }
        else if (saved) saved.then((ok) => {
          if (ok) document.dispatchEvent(new CustomEvent("ww:added", { detail: { body: text } }));
          else { hint.textContent = "the well didn't catch it. try again in a bit."; wish.value = text; fit(); }
        });
        later(() => {
          hint.style.opacity = "";
          later(() => { hint.textContent = HINT; }, 350);
          setFace("front");
          coin.dataset.st = "rest";
          coin.classList.add("ww-back-in");
          later(() => { coin.classList.remove("ww-back-in"); busy = false; }, 900);
        }, reduce ? 1200 : 2600);
      };
      if (reduce || !coin.animate) {
        coin.animate && coin.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
        later(done, 300);
        return;
      }
      // a proper toss: a little dip as it's wound up, then a parabola (quick off the hand, slow at the top,
      // quicker on the way down), spinning like a coin (see the little 3D rig below), shrinking as it travels away
      const DUR = 1500, T0 = 0.1, T1 = 0.9, N = 30;
      const H = 0.34 * fr.height;                      // how high above the straight line it goes
      const frames = [{ offset: 0, transform: base + "translate(0px, 0px) scale(1)", opacity: 1 },
                      { offset: T0 * 0.6, transform: base + "translate(0px, " + 0.035 * fr.height + "px) scale(0.94)", opacity: 1 }];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const x = dx * t;
        const y = dy * t - 4 * H * t * (1 - t);
        const sc = 1 + (endScale - 1) * Math.pow(t, 0.75);
        const tilt = 45 * t;
        frames.push({ offset: T0 + (T1 - T0) * t, transform: base + "translate(" + x + "px, " + y + "px) scale(" + sc + ") rotate(" + tilt + "deg)", opacity: 1 });
      }
      frames.push({ offset: 1, transform: base + "translate(" + dx + "px, " + (dy + endScale * cr.height * 0.3) + "px) scale(" + endScale * 0.75 + ") rotate(45deg)", opacity: 0 });   // it only fades as it sinks into the water
      // for the flight the coin is the same little 3D disc, spinning one full turn on the way down
      const faceArt = front.querySelector("svg");
      const rig = CoinRig.build(coin, faceArt, null);
      coin.classList.add("ww-tossing");
      const spin = CoinRig.spin(rig, 0, 360, { duration: (T1 - T0) * DUR, delay: T0 * DUR });
      const cleanup = () => { spin.cancel(); rig.remove(); coin.classList.remove("ww-tossing"); };
      const a = coin.animate(frames, { duration: DUR, fill: "forwards", easing: "linear" });
      a.finished.then(() => { cleanup(); done(); a.cancel(); }).catch(() => { cleanup(); done(); });
    });
  }

  front.addEventListener("click", () => {
    if (coin.dataset.st === "rest") open();
    else if (isOpen() && coin.dataset.face === "front" && !busy) { busy = true; flip("back").then(() => { busy = false; wish.focus({ preventScroll: true }); }); }
  });
  goBtn.addEventListener("click", throwIn);
  backBtn.addEventListener("click", () => { if (isOpen() && !busy) close(); });
  dim.addEventListener("click", () => { if (isOpen() && !busy) close(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen() && !busy) close();
  });

  // leaving the page puts everything back
  window.addEventListener("hashchange", () => {
    if (location.hash !== "#wishing-well") {
      clearTimers();
      ww.classList.remove("is-open");
      setFace("front");
      coin.dataset.st = "rest";
      hint.textContent = HINT; hint.style.opacity = "";
      busy = false;
    }
  });
})();

// ---------- Other people's wishes: a grid of coins, tap one to read it ----------
// Opens from the "see other wishes" button, or by tapping the water in the basin.
(function () {
  const page = document.querySelector('.page[data-page="wishing-well"]');
  const ww = document.getElementById("ww");
  const panel = document.getElementById("ww-wishes");
  const grid = document.getElementById("ww-grid");
  const msg = document.getElementById("ww-wmsg");
  const countEl = document.getElementById("ww-wcount");
  const pager = document.getElementById("ww-pager");
  const prevBtn = document.getElementById("ww-prev");
  const nextBtn = document.getElementById("ww-next");
  const pageNo = document.getElementById("ww-pageno");
  const closeBtn = document.getElementById("ww-wclose");
  const seeBtn = document.getElementById("ww-see");
  const pool = document.getElementById("ww-pool");
  const read = document.getElementById("ww-read");
  const big = document.getElementById("ww-bigcoin");
  const bigText = document.getElementById("ww-bigt");
  const bigDate = document.getElementById("ww-bigd");
  if (!page || !ww || !panel || !grid || !read || !big || !pager) return;

  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let wishes = [];
  let loadedAt = 0, loading = false, hasMore = false;
  let pg = 0;                                        // which page of coins is showing
  let from = null;                                   // the mini coin that was opened

  const isPanelOpen = () => !panel.hidden;
  const isReadOpen = () => !read.hidden;

  function dateText(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return String(d.getMonth() + 1).padStart(2, "0") + "." + String(d.getDate()).padStart(2, "0") + "." + String(d.getFullYear()).slice(2);
  }
  // each coin sits at its own small angle (the same one every time, picked from its id)
  function tilt(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return ((Math.abs(h) % 90) / 10 - 4.5).toFixed(1);
  }

  function say(t) { msg.textContent = t; msg.hidden = !t; }

  // a page of coins: 3 rows of 3 on a phone, 2 rows of 5 on a wider screen
  const perPage = () => (window.matchMedia && window.matchMedia("(max-width: 700px)").matches ? 9 : 10);

  function render() {
    grid.textContent = "";
    const per = perPage();
    const pages = Math.max(1, Math.ceil(wishes.length / per));
    if (pg > pages - 1) pg = pages - 1;
    wishes.slice(pg * per, pg * per + per).forEach((w, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ww-mini";
      b.style.setProperty("--r", tilt(w.id) + "deg");
      b.style.setProperty("--i", Math.min(i, 24));
      b.setAttribute("aria-label", WWDB.isMine(w.body) ? "read this wish (yours)" : "read this wish");
      if (WWDB.isMine(w.body)) {
        b.classList.add("is-mine");
        const sp = document.createElement("span");
        sp.className = "ww-spark";
        sp.textContent = "\u2726";
        sp.setAttribute("aria-hidden", "true");
        b.appendChild(sp);
      }
      const t = document.createElement("span");
      t.className = "ww-mini-t";
      const c = document.createElement("span");
      c.className = "ww-mini-c";
      c.textContent = w.body;
      t.appendChild(c);
      b.appendChild(t);
      b.addEventListener("click", () => openRead(w, b));
      grid.appendChild(b);
    });
    countEl.textContent = wishes.length ? wishes.length + (hasMore ? "+" : "") + (wishes.length === 1 && !hasMore ? " wish" : " wishes") + " in the well" : "";
    pager.hidden = pages < 2 && !hasMore;
    pageNo.textContent = (pg + 1) + " / " + pages + (hasMore ? "+" : "");
    prevBtn.disabled = pg === 0;
    nextBtn.disabled = pg >= pages - 1 && !hasMore;
  }

  async function load(append) {
    if (loading) return;
    if (!WWDB.configured) { say("the well isn't set up yet. check back soon."); return; }
    loading = true;
    say(append ? "" : "looking down the well...");
    try {
      const rows = await WWDB.list(append ? wishes.length : 0);
      wishes = append ? wishes.concat(rows) : rows;
      hasMore = rows.length >= WWDB.PAGE;
      loadedAt = Date.now();
      say(wishes.length ? "" : "nobody has made a wish yet. be the first.");
      render();
    } catch (e) {
      say("couldn't see down the well right now. try again in a bit.");
    }
    loading = false;
  }

  function openPanel() {
    if (isPanelOpen()) return;
    panel.hidden = false;
    panel.scrollTop = 0;
    pg = 0;
    document.body.classList.add("ww-wishes-open");
    render();
    if (!loadedAt || Date.now() - loadedAt > 45000) load(false);
    closeBtn.focus({ preventScroll: true });
  }
  function closePanel() {
    if (!isPanelOpen()) return;
    closeRead(true);
    panel.hidden = true;
    document.body.classList.remove("ww-wishes-open");
    (seeBtn || ww).focus && seeBtn && seeBtn.focus({ preventScroll: true });
  }

  // read one wish in full: the coin grows out of its place in the grid
  function openRead(w, mini) {
    from = mini;
    resetFace();
    bigText.textContent = w.body;
    bigDate.textContent = dateText(w.created_at) + (WWDB.isMine(w.body) ? " \u00b7 yours \u2726" : "");
    read.hidden = false;
    if (reduce || !big.animate) return;
    const a = mini.getBoundingClientRect(), b = big.getBoundingClientRect();
    if (!b.width) return;
    const dx = a.left + a.width / 2 - (b.left + b.width / 2);
    const dy = a.top + a.height / 2 - (b.top + b.height / 2);
    big.animate([
      { transform: "translate(" + dx + "px, " + dy + "px) scale(" + a.width / b.width + ")", opacity: 0.4 },
      { transform: "none", opacity: 1 }
    ], { duration: 520, easing: "cubic-bezier(0.3, 1.2, 0.5, 1)" });
  }
  function closeRead(instant) {
    if (!isReadOpen()) return;
    if (instant || reduce || !big.animate || !from || !document.body.contains(from)) { read.hidden = true; from = null; return; }
    const a = from.getBoundingClientRect(), b = big.getBoundingClientRect();
    const dx = a.left + a.width / 2 - (b.left + b.width / 2);
    const dy = a.top + a.height / 2 - (b.top + b.height / 2);
    const anim = big.animate([
      { transform: "none", opacity: 1 },
      { transform: "translate(" + dx + "px, " + dy + "px) scale(" + a.width / b.width + ")", opacity: 0 }
    ], { duration: 320, easing: "ease-in" });
    anim.finished.then(() => { read.hidden = true; from = null; }).catch(() => { read.hidden = true; });
  }

  // tap the wish coin and it turns over to the hyrax side (tap again and it turns back to the wish)
  let face = "wish", flipping = false;
  function setFace(f) { face = f; if (f === "hyrax") big.dataset.face = "hyrax"; else delete big.dataset.face; }
  function resetFace() {
    flipping = false;
    big.classList.remove("ww-flipping");
    big.querySelectorAll(".coin-rig").forEach((r) => r.remove());
    setFace("wish");
  }
  function hyraxSide() {
    let d = big.querySelector(".ww-bigface");
    if (!d) {
      const svg = document.querySelector("#ww-front svg");
      if (!svg) return null;
      d = document.createElement("div");
      d.className = "ww-front ww-bigface";
      d.appendChild(svg.cloneNode(true));
      big.appendChild(d);
    }
    return d.querySelector("svg");
  }
  // a copy of the wish coin as it looks right now, to be the other side of the spinning coin
  function wishSnapshot() {
    const c = big.cloneNode(true);
    c.removeAttribute("id");
    c.removeAttribute("data-face");
    c.classList.remove("ww-flipping");
    c.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    c.querySelectorAll(".coin-rig, .ww-bigface, .ww-bigx").forEach((n) => n.remove());
    return c;
  }
  function flipBig() {
    if (flipping) return;
    const to = face === "wish" ? "hyrax" : "wish";
    const hy = hyraxSide();
    if (!hy) return;
    if (reduce || !big.animate || !window.CoinRig) { setFace(to); return; }
    flipping = true;
    const rig = CoinRig.build(big, hy, wishSnapshot());
    big.classList.add("ww-flipping");
    const toHyrax = to === "hyrax";
    const a = CoinRig.spin(rig, toHyrax ? 180 : 0, toHyrax ? 360 : 180, { duration: 750, easing: "ease-in-out" });
    const finish = () => { setFace(to); a.cancel(); rig.remove(); big.classList.remove("ww-flipping"); flipping = false; };
    a.finished.then(finish).catch(finish);
  }

  seeBtn && seeBtn.addEventListener("click", openPanel);
  if (pool) {
    pool.addEventListener("click", openPanel);
    pool.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPanel(); } });
  }
  closeBtn.addEventListener("click", closePanel);
  prevBtn.addEventListener("click", () => { if (pg > 0) { pg--; render(); panel.scrollTop = 0; } });
  nextBtn.addEventListener("click", async () => {
    const per = perPage();
    if ((pg + 1) * per >= wishes.length && hasMore) {          // on the last coins we have: look further down the well
      const before = wishes.length;
      await load(true);
      if (wishes.length === before) return;
    }
    if ((pg + 1) * per < wishes.length) { pg++; render(); panel.scrollTop = 0; }
  });
  read.addEventListener("click", (e) => { if (e.target.closest("#ww-bigx")) closeRead(); else if (e.target.closest("#ww-bigcoin")) flipBig(); else closeRead(); });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (isReadOpen()) { e.stopPropagation(); closeRead(); }
    else if (isPanelOpen()) { e.stopPropagation(); closePanel(); }
  }, true);

  // a wish just thrown in shows up at the front of the grid
  document.addEventListener("ww:added", (e) => {
    wishes.unshift({ id: "mine-" + Date.now(), created_at: new Date().toISOString(), body: e.detail.body });
    loadedAt = 0;
    pg = 0;
    if (isPanelOpen()) render();
  });

  window.addEventListener("hashchange", () => {
    if (location.hash !== "#wishing-well") { closeRead(true); panel.hidden = true; document.body.classList.remove("ww-wishes-open"); }
  });
})();

// ---------- Previous confessions pop up ----------
(function () {
  const pop = document.getElementById("ww-conf");
  const openBtn = document.getElementById("ww-conf-open");
  const closeBtn = document.getElementById("ww-conf-x");
  if (!pop || !openBtn || !closeBtn) return;
  function open() { pop.hidden = false; closeBtn.focus({ preventScroll: true }); }
  function close() { if (pop.hidden) return; pop.hidden = true; openBtn.focus({ preventScroll: true }); }
  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  pop.addEventListener("click", (e) => { if (e.target === pop) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !pop.hidden) { e.stopPropagation(); close(); } }, true);
  window.addEventListener("hashchange", () => { if (location.hash !== "#wishing-well") pop.hidden = true; });
})();
