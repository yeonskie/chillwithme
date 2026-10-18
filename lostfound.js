// ---------- THE LOST AND FOUND (secret room, dot 6) ----------
// One look around a day. What turns up depends on the day: it's picked at random from FINDS (some are likelier than
// others), but it's worked out from today's date, so coming back the same day shows the same thing.
// Everything you find is listed in "my finds".
//
// TO CHANGE WHAT CAN BE FOUND, edit the list FINDS below. Each find has:
//   id      - a short name nothing else uses (it's what gets saved)
//   w       - how likely it is (a bigger number = more often. they're compared to each other, not out of 100)
//   name    - what it's called
//   text    - the little line shown when you find it
//   and ONE of these for what you get:
//   yb: 500                         yeonbucks
//   item: "wear-hat"                an item from the ITEMS list in shop.js (give it lost: true so it's never sold). You only get it once:
//                                   when you already own it, the find isn't picked any more
//   boost: { key: "yb-luck-until", ms: 7 * DAY }    a timed boost. casino.js reads the key (the time it ends). finding another adds more time
//   token: "spin"                   a 1-use item (count saved in "yb-items"): "spin" (free wheel spin), "rescue" (daily reward streak) or "hint" (guess the idol)
//   and optionally:
//   remy: true                      only found if you own remy (she brings it, and her picture shows)
//   after: "2026-10-31"             only found after this day (the ghost tap is a halloween exclusive that leaves the shop on the 31st)
//
// Remembered in this browser: "yb-lost" (today's find), "yb-finds" (how many of each you've found), "yb-items" (1-use items).

(function () {
  const DAY = 24 * 3600000;
  const FINDS = [
    { id: "yb1",     w: 14, name: "+1 yeonbucks",      text: "one lonely yeonbuck, stuck to the bottom of a shoe.", yb: 1 },
    { id: "yb500",   w: 14, name: "+500 yeonbucks",    text: "a little pile of coins, tucked behind the box.", yb: 500 },
    { id: "yb5000",  w: 5,  name: "+5,000 yeonbucks",  text: "whoa. someone really lost this one.", yb: 5000 },
    { id: "yb100k",  w: 1,  name: "jackpot! +100,000 yeonbucks", text: "an envelope stuffed full of yeonbucks. nobody's coming back for it.", yb: 100000 },
    { id: "ghost",   w: 3,  name: "halloween ghost tap", text: "an expired halloween thing, but it still works. boo!", item: "tap-ghost", after: "2026-10-31" },
    { id: "cheese",  w: 6,  name: "cheese tap",        text: "remy came back with a piece of cheese. she dropped it in your inventory!", item: "tap-cheese", remy: true },
    { id: "chtrail", w: 3,  name: "cheese trail",      text: "remy dragged in a whole trail of cheese. very proud of herself.", item: "cur-cheese", remy: true },
    { id: "hat",     w: 5,  name: "witch hat",         text: "a pointy hat, a little dusty. your pet can wear it!", item: "wear-hat" },
    { id: "bow",     w: 5,  name: "bow",               text: "a cute bow. your pet can wear it!", item: "wear-bow" },
    { id: "soda",    w: 5,  name: "soda",              text: "a cold soda. still fizzy. your pet can hold it!", item: "wear-soda" },
    { id: "luck",    w: 6,  name: "lucky week",        text: "+5% jackpot chance at the casino for 1 week.", boost: { key: "yb-luck-until", ms: 7 * DAY } },
    { id: "pay",     w: 6,  name: "bonus week",        text: "an extra +10% payout in the games for 1 week.", boost: { key: "yb-pay-until", ms: 7 * DAY } },
    { id: "earn",    w: 4,  name: "earn rush",         text: "an extra +100 yeonbucks every 30 seconds for 48 hours.", boost: { key: "yb-earn-until", ms: 2 * DAY } },
    { id: "spin",    w: 8,  name: "free spin",         text: "a free spin for the wheel. use it any time!", token: "spin" },
    { id: "rescue",  w: 6,  name: "streak rescue",     text: "miss a day of the daily reward and this saves your streak.", token: "rescue" },
    { id: "hint",    w: 8,  name: "free hint",        text: "a free hint for guess the kpop idol. no point lost!", token: "hint" },
    { id: "rainbow", w: 4,  name: "rainbow sparkle tap", text: "rainbow stars for every tap. turn it on in your inventory!", item: "tap-rainbow" },
    { id: "rtrail",  w: 4,  name: "rainbow trail",     text: "rainbow stars follow your cursor. turn it on in your inventory!", item: "cur-rainbow" },
  ];
  const find = (id) => FINDS.filter((f) => f.id === id)[0];

  // ----- what's remembered -----
  const memory = {};
  const read = (k) => { try { return localStorage.getItem(k); } catch (e) { return memory[k]; } };      // (the memory copy is only used when the browser won't let the site save)
  const write = (k, v) => { memory[k] = String(v); try { localStorage.setItem(k, String(v)); } catch (e) {} };
  const json = (k, fb) => { try { const v = JSON.parse(read(k)); return v == null ? fb : v; } catch (e) { return fb; } };
  const dayKey = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // ----- the 1-use items and the timed boosts (other files ask for them through window.YBItems) -----
  const TOKENS = { spin: "free spin", rescue: "streak rescue", hint: "idol hint" };
  const BOOSTS = [
    { key: "yb-luck-until", text: "casino jackpot +5%" },
    { key: "yb-pay-until",  text: "game payouts +10%" },
    { key: "yb-earn-until", text: "+100 every 30 secs" },
  ];
  const tokens = () => json("yb-items", {});
  const timeLeft = (ms) => { const m = Math.max(1, Math.ceil(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60); return d ? d + "d " + h + "h" : h ? h + "h " + (m % 60) + "m" : m + "m"; };
  window.YBItems = {
    count: (k) => Math.max(0, Math.floor(Number(tokens()[k]) || 0)),
    add: (k, n) => { const t = tokens(); t[k] = Math.max(0, (Number(t[k]) || 0) + (n || 1)); write("yb-items", JSON.stringify(t)); },
    use: (k) => { const t = tokens(); if (!(Number(t[k]) > 0)) return false; t[k]--; write("yb-items", JSON.stringify(t)); return true; },
    summary: () => {                                           // what the inventory lists under "found items"
      const out = [];
      Object.keys(TOKENS).forEach((k) => { const n = window.YBItems.count(k); if (n) out.push(TOKENS[k] + " x" + n); });
      BOOSTS.forEach((b) => { const left = Number(read(b.key) || 0) - Date.now(); if (left > 0) out.push(b.text + " (" + timeLeft(left) + " left)"); });
      return out;
    },
  };

  // ----- picking today's find -----
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const owns = (id) => !!(window.YBShop && window.YBShop.owns(id));
  function eligible(f) {
    if (f.after && dayKey() <= f.after) return false;
    if (f.remy && !owns("pet-rat")) return false;
    if (f.item && owns(f.item)) return false;
    return true;
  }
  function pickToday() {
    const pool = FINDS.filter(eligible);
    const rand = rng(hash(dayKey() + "|" + (read("yb-id") || "") + "|" + (read("yb-lost-seed") || "")));        // the same for the same day (and a little different for each person; the seed is only used by test mode)
    let r = rand() * pool.reduce((a, f) => a + f.w, 0);
    for (let i = 0; i < pool.length; i++) { r -= pool[i].w; if (r < 0) return pool[i]; }
    return pool[pool.length - 1];
  }
  function give(f) {
    if (f.yb) window.YB.add(f.yb);
    else if (f.item) window.YBShop.give(f.item);
    else if (f.token) window.YBItems.add(f.token, 1);
    else if (f.boost) write(f.boost.key, String(Math.max(Date.now(), Number(read(f.boost.key) || 0)) + f.boost.ms));
  }
  const today = () => { const t = json("yb-lost", null); return t && t.day === dayKey() && find(t.id) ? find(t.id) : null; };
  const finds = () => json("yb-finds", {});

  // ----- the pop-up -----
  const $ = (id) => document.getElementById(id);
  const ov = $("lostfound"), picEl = $("lf-pic"), nameEl = $("lf-name"), textEl = $("lf-text"), subEl = $("lf-sub"), goBtn = $("lf-go"), listBtn = $("lf-list"), remyEl = $("lf-remy");
  const bookOv = $("lf-book"), bookBody = $("lf-book-body"), bookTitle = $("lf-book-title");
  if (!ov || !goBtn) return;

  const BOX = '<svg viewBox="0 0 100 80" aria-hidden="true" focusable="false"><path d="M8 28L50 40l42-12v36L50 76 8 64z" style="fill:var(--bg)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 28L26 8l24 8 24-8 18 20M50 40v36M26 8l24 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M60 52l12-3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M22 52h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".5"/></svg>';
  function picFor(f) {                                                   // the picture for a find: its drawing if it has one, otherwise big words
    const art = f.item && window.YBShop && window.YBShop.art(f.item);
    if (art) return art;
    if (f.yb) return '<span class="lf-big">+' + fmt(f.yb) + "</span>";
    if (f.token) return '<span class="lf-big">' + ({ spin: "1 spin", rescue: "1 save", hint: "1 hint" }[f.token]) + "</span>";
    if (f.boost) return '<span class="lf-big">' + ({ "yb-luck-until": "+5%", "yb-pay-until": "+10%", "yb-earn-until": "+100" }[f.boost.key]) + "</span>";
    return '<span class="lf-big lf-rainbow">✦ ✧ ✦</span>';
  }
  function remyArt() { const a = document.querySelector('#pet .pet-art[data-pet="rat"] .pet-a'); return a ? a.outerHTML : ""; }
  function show(f, animate) {
    if (!f) {
      picEl.innerHTML = BOX; picEl.classList.remove("lf-pop");
      nameEl.textContent = "a box of lost things";
      textEl.textContent = "";
      remyEl.innerHTML = ""; remyEl.hidden = true;
      subEl.textContent = "one look around a day. see what turned up!";
      goBtn.hidden = false; goBtn.textContent = "look around";
    } else {
      picEl.innerHTML = picFor(f);
      picEl.classList.remove("lf-pop"); void picEl.offsetWidth; if (animate) picEl.classList.add("lf-pop");
      nameEl.textContent = f.name;
      textEl.textContent = f.text;
      remyEl.hidden = !f.remy; remyEl.innerHTML = f.remy ? '<span class="lf-remy-art">' + remyArt() + "</span><span>remy brought you something!</span>" : "";
      subEl.textContent = animate ? "you found something!" : "today's find. come back tomorrow!";
      goBtn.hidden = true;
    }
    listBtn.textContent = "my finds (" + Object.keys(finds()).length + "/" + FINDS.length + ")";
  }
  function look() {
    if (today()) return;
    const f = pickToday();
    write("yb-lost", JSON.stringify({ day: dayKey(), id: f.id }));
    const fs = finds(); fs[f.id] = (fs[f.id] || 0) + 1; write("yb-finds", JSON.stringify(fs));
    give(f);
    show(f, true);
  }
  function open() { show(today(), false); ov.hidden = false; (goBtn.hidden ? $("lf-close") : goBtn).focus(); }
  function close() { ov.hidden = true; }
  goBtn.addEventListener("click", look);
  $("lf-close").addEventListener("click", close);
  ov.addEventListener("click", (e) => { if (e.target === ov) close(); });

  // ----- my finds -----
  function openBook() {
    const fs = finds();
    bookTitle.textContent = "my finds (" + Object.keys(fs).length + "/" + FINDS.length + ")";
    bookBody.innerHTML = "";
    const ul = document.createElement("ul");
    ul.className = "lf-list";
    FINDS.forEach((f) => {
      const li = document.createElement("li");
      if (fs[f.id]) {
        li.innerHTML = '<span class="lf-li-name"></span><span class="lf-li-n"></span>';
        li.querySelector(".lf-li-name").textContent = f.name;
        li.querySelector(".lf-li-n").textContent = fs[f.id] > 1 ? "x" + fs[f.id] : "";
      } else { li.className = "lf-locked"; li.textContent = "???"; }
      ul.appendChild(li);
    });
    bookBody.appendChild(ul);
    bookOv.hidden = false;
    $("lf-book-close").focus();
  }
  function closeBook() { bookOv.hidden = true; }
  listBtn.addEventListener("click", openBook);
  $("lf-book-close").addEventListener("click", closeBook);
  bookOv.addEventListener("click", (e) => { if (e.target === bookOv) closeBook(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (!bookOv.hidden) closeBook(); else close(); } });
  window.addEventListener("hashchange", () => { close(); closeBook(); });

  window.LostFound = { open: open, close: close, today: today };
})();