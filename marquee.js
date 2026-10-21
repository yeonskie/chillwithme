// ---------- The top middle strip: the scrolling marquee ----------
// One message at a time scrolls across the strip, right to left, like the old marquee. It goes across once (it doesn't
// repeat), and the next message follows close behind it, so the strip stays full.
//
// What it says (a shuffled deck: every message gets a turn before any comes round again):
//   - FAIR_SIGNS       little announcements. add or change lines in this list.
//   - a greeting       (changes with the time of day, see greeting())
//   - NEWS             the "what's new" lines you pick (its own list below, so only the short, interesting ones)
//   - the leaderboard  who's number 1 right now
//   - the rare shop    how long until the new stock
//   - the community    the newest post's name (only when the community board is connected)
// Things you can change just below: SPEED (how fast it scrolls).
(function () {
  const win = document.getElementById("ticker");
  if (!win) return;

  const SPEED = 55;                // how fast the text scrolls, in pixels per second (bigger = faster)
  const GAP = 110;                 // the least empty space between one message and the next (pixels; smaller = closer together)
  const STILL_MS = 6000;           // (only for "reduce motion", where nothing scrolls: how long each message stays)
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const FAIR_SIGNS = [
    "the clowns are coming! run away quickly!",
    "step right up to the prize shop!",
    "the fortune teller is in, are you lucky today?",
    "no running near the carousel please!",
    "please keep your hands inside the ride at all times",
    "tickets are free. yeonbucks are not",
    "psst... the carousel spins faster if you tap it",
    "now serving: thoughts to consume",
    "cotton candy not included",
    "the back of the fair calls to you...",
    "warning: rats seen on the fairgrounds, watch out...",
    "the back of the fair calls to you. will you listen?",
    "wind speeds are high today, don't get swept away. we don't have insurance.",
    "find your fate at the fortune teller",
    "make memories at the photobooth (spoiler?)",
    "save your yeonbucks for the secret room key... you might discover something magical",
    "leave your confessions at the booth, not like anyone is listening",
    "please ignore the sound of scurrying rats (health inspector don't read this)",
  ];

  const NEWS = [
    "homepage menu scrolls smoothly",
    "no more cap on the leaderboard",
    "redesigned fortune teller cards",
    "revamped shop designs",
    "door designs",
  ];

  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return "up late? the fair never closes";
    if (h < 12) return "good morning, fairgoer";
    if (h < 17) return "good afternoon, fairgoer";
    if (h < 22) return "good evening, fairgoer";
    return "late night at the fair";
  }

  // ----- things that come from elsewhere (all optional: if one isn't available, it's just left out) -----
  const cfg = typeof COMMUNITY !== "undefined" ? COMMUNITY : {};
  const BASE = String(cfg.url || "").trim().replace(/\/+$/, "");
  const KEY = String(cfg.key || "").trim();
  const num = (n) => Number(n).toLocaleString("en-US");
  let leader = null, newestPost = null;

  function headers(extra) {
    const h = Object.assign({ apikey: KEY }, extra);
    if (/^eyJ/.test(KEY)) h.Authorization = "Bearer " + KEY;
    return h;
  }
  function refreshOnline() {
    if (!BASE || !KEY || document.hidden) return;
    fetch(BASE + "/rest/v1/rpc/cz_board", { method: "POST", headers: headers({ "Content-Type": "application/json" }), body: JSON.stringify({ p_id: "" }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && d.top && d.top[0]) leader = d.top[0]; })
      .catch(() => {});
    fetch(BASE + "/rest/v1/posts?select=name&approved=eq.true&order=created_at.desc&limit=1", { headers: headers() })
      .then((r) => (r.ok ? r.json() : null))
      .then((rows) => { if (rows && rows[0] && rows[0].name) newestPost = rows[0]; })
      .catch(() => {});
  }
  function savedLeader() {                                    // (what the leaderboard box last remembered, if we haven't heard back yet)
    try { const d = JSON.parse(localStorage.getItem("yb-board")); return d && d.top && d.top[0]; } catch (e) { return null; }
  }

  function messages() {
    const out = FAIR_SIGNS.map((t) => ({ t: t, kind: "sign" }));
    out.push({ t: greeting(), kind: "greeting" });
    NEWS.forEach((t) => out.push({ t: "new: " + t, kind: "news" }));
    const top = leader || savedLeader();
    if (top && top.name) out.push({ t: "#1 on the leaderboard: " + top.name + " (" + num(top.balance) + ")", kind: "leader" });
    const restock = document.getElementById("rare-restock");
    if (restock && restock.textContent.trim()) out.push({ t: "rare shop: " + restock.textContent.trim(), kind: "rare" });
    if (newestPost) out.push({ t: "new on the community board: " + newestPost.name, kind: "post" });
    return out;
  }

  // ----- the deck: a fair shuffle of everything, dealt one at a time. every message gets a turn before any comes round
  // again, and it never deals the same kind of message twice in a row (so the "new:" lines don't come out together) -----
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  let deck = [], last = { t: "", kind: "" };
  function nextMessage() {
    if (!deck.length) deck = shuffle(messages());
    let i = deck.findIndex((m) => m.kind !== last.kind && m.t !== last.t);
    if (i === -1) { deck = shuffle(messages()); i = deck.findIndex((m) => m.kind !== last.kind && m.t !== last.t); }   // only the same kind was left: start a fresh deck
    if (i === -1) i = 0;
    last = deck.splice(i, 1)[0];
    return last.t;
  }

  // ----- the scrolling: each message glides across once, from the right edge to the left edge (nothing repeats).
  // the next message starts coming in as soon as the one in front of it has cleared the right edge by GAP, so there are
  // no big empty stretches (two messages can be on the strip at the same time).
  // when the page first loads (or the window is resized), the strip is filled straight away: the first messages start
  // already part-way across instead of coming in from an empty strip. -----
  let timer = null;
  function still(text) {                                                          // "reduce motion": no scrolling, the message just changes now and then
    win.textContent = "";
    const el = document.createElement("div");
    el.className = "marquee-still";
    el.textContent = text;
    win.appendChild(el);
    timer = setTimeout(next, STILL_MS);
  }
  // puts one message on the strip with its left edge at startX (the right edge of the strip = enters from the right).
  // returns where the left edge of the message after it should start
  function spawn(text, startX) {
    const track = document.createElement("div");
    track.className = "marquee-track";
    track.style.animation = "none";                                               // (the slide is done below, not by the css loop)
    const item = document.createElement("span");
    item.className = "marquee-item";
    item.style.paddingRight = "0";
    item.textContent = text;
    track.appendChild(item);
    win.appendChild(track);
    const w = win.clientWidth, iw = item.offsetWidth;
    const anim = track.animate([{ transform: "translateX(" + w + "px)" }, { transform: "translateX(" + -iw + "px)" }],
      { duration: ((w + iw) / SPEED) * 1000, easing: "linear", fill: "forwards" });
    if (startX < w) anim.currentTime = ((w - startX) / SPEED) * 1000;           // already part-way across
    anim.onfinish = () => track.remove();
    return startX + iw + GAP;
  }
  function usable() { return win.offsetParent !== null && !document.hidden; }     // (the strip is hidden on phones)
  function fill() {
    clearTimeout(timer);
    if (!usable()) { timer = setTimeout(fill, 1500); return; }
    win.textContent = "";
    if (reduced) { still(nextMessage()); return; }
    const w = win.clientWidth;
    let x = 0;
    while (x < w) x = spawn(nextMessage(), x);
    timer = setTimeout(next, ((x - w) / SPEED) * 1000);
  }
  function next() {
    clearTimeout(timer);
    if (!usable()) { timer = setTimeout(next, 1500); return; }
    if (reduced) { still(nextMessage()); return; }
    const nx = spawn(nextMessage(), win.clientWidth);
    timer = setTimeout(next, ((nx - win.clientWidth) / SPEED) * 1000);
  }

  let resizeTimer = null;
  window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (win.offsetParent !== null) fill(); }, 250); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) fill(); });
  refreshOnline();
  setInterval(refreshOnline, 120000);
  fill();
})();