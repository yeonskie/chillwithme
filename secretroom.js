// THE SECRET ROOM
//
// Buying the "secret room key" in the prize shop (it's in the list in shop.js) does three things:
//   1. a "secret room" button shows up in the bottom menu
//   2. a small secret door appears on the home page, just above the "navigation menu" button
//   3. both of them open the back of the fair: the first time with a question, then a loading screen,
//      then the secret room page (the section with data-page="secret-room" in index.html)
//
// You can change:
//   LOAD_MS    how long the loading screen stays (milliseconds). Tapping it skips ahead.
//   ASK_TEXT   is in index.html (id "sr-ask-title"), and so are the loading screen words (class "sr-load")
//   The map on the secret room page is the <svg class="sr-map"> in index.html: swap in your own drawing there.
//   What a dot does is at the bottom of this file (for now it just says the place isn't open yet).
//
// What's remembered in this browser: "yb-own" (has the key, saved by the shop), "yb-room-seen" (said yes once) and "yb-daily" (the day the daily prize was claimed).

(function () {
  const LOAD_MS = 3200;
  const $ = (id) => document.getElementById(id);
  const door = $("sr-door"), doorShop = $("sr-door-shop"), ask = $("sr-ask"), load = $("sr-load"), tab = $("menu-secret");
  const status = $("sr-status");
  if (!door || !ask || !load) return;

  function owned() { try { return JSON.parse(localStorage.getItem("yb-own") || "[]").indexOf("key") !== -1; } catch (e) { return false; } }
  function seen() { try { return localStorage.getItem("yb-room-seen") === "1"; } catch (e) { return false; } }
  function markSeen() { try { localStorage.setItem("yb-room-seen", "1"); } catch (e) {} }
  const pageName = () => location.hash.replace("#", "") || "home";

  // ----- what shows: the menu button, the door (home page only) -----
  const SMALL = 1100;                                       // "mobile / smaller screens": this wide or narrower
  function placeDoor() {                                   // sits right on top of the bottom bar, whatever height it is
    const bar = document.querySelector(".bar-bottom");
    let b = (bar ? bar.offsetHeight : 40) + 2;
    const yb = document.getElementById("yb-box");
    if (yb && !yb.hidden && (window.innerWidth <= SMALL || door.classList.contains("sr-door-corner"))) b = Math.max(b, Math.round(window.innerHeight - yb.getBoundingClientRect().top) + 14);   // phones: sits above the yeonbucks / inventory row instead of on top of it
    door.style.bottom = b + "px";
  }
  function sync() {
    const has = owned();
    if (tab) tab.hidden = !has;
    const lockedTab = $("menu-locked");
    if (lockedTab) lockedTab.hidden = has;                 // "???" in the menu until the key is found, then it becomes "secret room"
    const page = pageName();
    const corner = has && (["home", "shop", "secret-room", "rare-shop"].indexOf(page) === -1 || page === "home");   // (the home door goes bottom left too, above the yeonbucks box, so it never gets in the way of the buttons in the middle)
    door.hidden = !(has && (page === "home" || corner));   // home: centered; phones on every other page (not the prize shop / the room itself): bottom left
    door.classList.toggle("sr-door-corner", corner);   // (bottom left, any screen size)
    if (doorShop) doorShop.hidden = !has;                  // the one at the bottom of the prize shop
    if (!door.hidden) placeDoor();
    if (!has && (pageName() === "secret-room" || pageName() === "rare-shop")) location.hash = "#home";   // no key, no room
  }
  window.SR = { sync: sync };
  sync();
  window.addEventListener("hashchange", sync);
  window.addEventListener("resize", sync);
  const ybBoxEl = document.getElementById("yb-box");
  if (ybBoxEl && window.ResizeObserver) new ResizeObserver(() => { if (!door.hidden) placeDoor(); }).observe(ybBoxEl);   // the door follows the yeonbucks box when its height changes (e.g. its buttons re-arrange)
  window.addEventListener("storage", sync);
  setInterval(sync, 1000);                                 // (catches a purchase made in the shop)

  // ----- the question (first time only) -----
  let askFrom = null;
  function openAsk(from) {
    askFrom = from || null;
    ask.hidden = false;
    $("sr-yes").focus();
  }
  function closeAsk(restore) {
    if (ask.hidden) return;
    ask.hidden = true;
    if (restore !== false && askFrom && document.contains(askFrom)) askFrom.focus();
    askFrom = null;
  }
  $("sr-yes").addEventListener("click", () => { markSeen(); closeAsk(false); startLoading(); });
  $("sr-no").addEventListener("click", () => closeAsk());
  ask.addEventListener("click", (e) => { if (e.target === ask) closeAsk(); });

  // ----- the loading screen, then the room -----
  let loadTimer = null, loadSince = 0;
  function startLoading() {
    clearTimeout(loadTimer);
    load.hidden = false;
    load.classList.remove("go");
    void load.offsetWidth;                                 // restart the fade-in
    load.classList.add("go");
    loadSince = Date.now();
    loadTimer = setTimeout(finishLoading, LOAD_MS);
  }
  function finishLoading() {
    clearTimeout(loadTimer);
    if (load.hidden) return;
    load.hidden = true;
    if (owned()) location.hash = "#secret-room";
  }
  function cancelLoading() { clearTimeout(loadTimer); load.hidden = true; }
  load.addEventListener("click", () => { if (Date.now() - loadSince > 700) finishLoading(); });   // tap to skip

  // ----- opening the door (or the menu button) -----
  function enter(from) {
    if (!owned()) return;
    if (seen()) startLoading(); else openAsk(from);
  }
  door.addEventListener("click", () => enter(door));
  if (doorShop) {                                          // a second door at the bottom of the prize shop (same picture, same click)
    doorShop.innerHTML = door.innerHTML;
    doorShop.addEventListener("click", () => enter(doorShop));
  }
  document.addEventListener("click", (e) => {              // the menu button is a normal link, so catch it before the page changes
    const a = e.target.closest && e.target.closest('a[href="#secret-room"]');
    if (!a) return;
    if (a.classList.contains("hy-back")) return;           // "back to the secret room" links (from the rare items shop) just go back, no loading screen
    e.preventDefault();
    enter(null);
  }, true);

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!ask.hidden) closeAsk();
    else if (!load.hidden) cancelLoading();
  });
  window.addEventListener("hashchange", () => { closeAsk(false); if (!load.hidden && pageName() !== "home" && pageName() !== "secret-room") cancelLoading(); });

  // ----- the dots on the map -----
  // Each dot is one place to explore. For now they all say the same thing. When a place is ready, give it its own
  // action here (the dot's number is its place along the path, 2 to 7, left to right; room names are in ROOMS below).
  let statusTimer = null;
  function say(text) {
    if (!status) return;
    status.textContent = text;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { status.textContent = ""; }, 4000);
  }
  const ROOMS = { 2: "daily prize", 3: "spin the wheel", 4: "rare items shop", 5: "fortune teller", 6: "lost and found", 7: "the library" };   // (dot 1 is the door and isn't clickable)
  function openPlace(n) {
    if (n === 2) return daily();
    if (n === 3) return openWheel();
    if (n === 4) { location.hash = "#rare-shop"; return; }
    if (n === 5 && window.Fortune) return window.Fortune.open();
    if (n === 6 && window.LostFound) return window.LostFound.open();
    say((ROOMS[n] || "this place") + " isn't open yet. check back soon!");
  }

  // ----- room 3: the wheel -----
  // One free spin a day, plus a free extra spin every time it lands on "spin again". After that you can buy up to
  // EXTRA_SPINS more spins that day for SPIN_COST each. The slices are in the order they sit on the wheel, clockwise
  // from the pointer (each is 45 degrees). "weight" is how likely it is (they're out of 100). The mystery pet is on the
  // wheel; when it lands you pick one of the pets you don't have yet (once you have them all it stops coming up).
  const SPIN_COST = 1000, EXTRA_SPINS = 3;
  const PET_KINDS = ["koala", "frog", "panda"];                 // the mystery pets (add a new one here AND in shop.js and index.html)
  const SLICES = [
    { id: "again",   w: 16 },   // spin again
    { id: "boost",   w: 11 },   // 24 hr boost, +200 every 30 secs
    { id: "c200",    w: 20, coins: 200 },
    { id: "oops",    w: 24 },   // +0
    { id: "c100000", w: 1,  coins: 100000 },
    { id: "rainbow", w: 10 },   // rainbow sparkle tap (if you already have it, you get a random pet accessory you don't have yet; if you have them all, 1,000 instead)
    { id: "c5000",   w: 9,  coins: 5000 },
    { id: "pet",     w: 5 },   // new mystery pet! (the weight drops to 0 once all the pets are owned)
  ];
  const wOv = $("sr-wheel"), wheelG = $("sw-wheel"), wInfo = $("sw-info"), wRes = $("sw-result"), wBtn = $("sw-spin"), wClose = $("sw-close");
  const fmtN = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  let spinning = false, rot = 0;
  function wState() {
    let st = null;
    try { st = JSON.parse(localStorage.getItem("yb-wheel") || "null"); } catch (e) {}
    if (!st || st.day !== today()) st = { day: today(), spins: 0, paid: 0, extra: 0 };
    return st;
  }
  function wSave(st) { try { localStorage.setItem("yb-wheel", JSON.stringify(st)); } catch (e) {} }
  const freeLeft = (st) => 1 + st.extra - (st.spins - st.paid);
  const bal = () => (window.YB ? window.YB.have() : 0);
  function boostLeft() { let u = 0; try { u = Number(localStorage.getItem("yb-boost-until") || 0); } catch (e) {} return Math.max(0, u - Date.now()); }
  const spinItems = () => (window.YBItems ? window.YBItems.count("spin") : 0);     // free spin items from the lost and found
  function rainbowLabel() {                                    // once you own the rainbow sparkle tap, that slice says "random pet accessory" (it gives you one instead)
    const t = $("sw-rainbow");
    if (!t) return;
    const have = !!(window.YBShop && window.YBShop.owns("tap-rainbow"));
    if (t.dataset.have === String(have)) return;
    t.dataset.have = String(have);
    const a = t.querySelectorAll("tspan");
    if (have) { a[0].textContent = "random pet"; a[0].setAttribute("x", "-15"); a[1].textContent = "accessory"; a[1].setAttribute("x", "-8"); }
    else { a[0].textContent = "rainbow "; a[0].setAttribute("x", "0"); a[1].textContent = "sparkle tap"; a[1].setAttribute("x", "-30"); }
  }
  function wDraw() {
    rainbowLabel();
    const st = wState(), free = freeLeft(st) > 0 || spinItems() > 0, canPay = !free && st.paid < EXTRA_SPINS;
    wBtn.disabled = spinning || (!free && !(canPay && bal() >= SPIN_COST));
    wBtn.textContent = free ? "spin (free)" : canPay ? "spin for " + fmtN(SPIN_COST) : "come back tomorrow";
    let info = free ? (freeLeft(st) <= 0 ? "you have " + spinItems() + " free spin item" + (spinItems() === 1 ? "" : "s") + "!" : st.extra ? "you have a free spin!" : "1 free spin a day") : canPay ? (bal() >= SPIN_COST ? "extra spins today: " + (EXTRA_SPINS - st.paid) + " left" : "not enough yeonbucks for another spin") : "no spins left today. come back tomorrow!";
    const bl = boostLeft();
    if (bl) info += "  |  boost on: " + Math.floor(bl / 3600000) + "h " + Math.floor((bl % 3600000) / 60000) + "m left";
    wInfo.textContent = info;
    wClose.disabled = spinning;
  }
  // mystery pets: which ones you don't have yet, and how many "pick a pet" prizes are waiting
  const petsLeft = () => PET_KINDS.filter((k) => !(window.YBShop && window.YBShop.owns("pet-" + k)));
  const pending = () => { try { return Math.max(0, Number(localStorage.getItem("yb-pet-pending") || 0)); } catch (e) { return 0; } };
  const setPending = (n) => { try { localStorage.setItem("yb-pet-pending", String(Math.max(0, n))); } catch (e) {} };
  const weightOf = (s) => (s.id === "pet" && petsLeft().length - pending() <= 0 ? 0 : s.w);
  function pick() {
    const tot = SLICES.reduce((a, s) => a + weightOf(s), 0);
    let r = Math.random() * tot;
    for (let i = 0; i < SLICES.length; i++) { r -= weightOf(SLICES[i]); if (r < 0) return i; }
    return 0;
  }
  const pickBox = $("sw-pick"), pickOpts = $("sw-pick-opts"), pickOk = $("sw-pick-ok"), controls = $("sw-controls");
  let chosen = "";
  function showPick() {
    const left = petsLeft();
    if (!pending() || !left.length) { pickBox.hidden = true; controls.hidden = false; return false; }
    chosen = ""; pickOk.disabled = true; pickOpts.innerHTML = "";
    left.forEach((k) => {
      const art = document.querySelector('#pet .pet-art[data-pet="' + k + '"] .pet-a');
      const b = document.createElement("button");
      b.type = "button"; b.className = "sw-pet-opt"; b.setAttribute("aria-pressed", "false");
      b.innerHTML = '<span class="shop-prev-pet">' + (art ? art.outerHTML : "") + '</span><span class="nm">' + k + "</span>";
      b.addEventListener("click", () => {
        chosen = k; pickOk.disabled = false;
        pickOpts.querySelectorAll(".sw-pet-opt").forEach((o) => o.setAttribute("aria-pressed", o === b ? "true" : "false"));
      });
      pickOpts.appendChild(b);
    });
    pickBox.hidden = false; controls.hidden = true;
    return true;
  }
  pickOk.addEventListener("click", () => {
    if (!chosen || !window.YBShop) return;
    const k = chosen;
    window.YBShop.give("pet-" + k, true);
    setPending(pending() - 1);
    wRes.textContent = "";
    if (!showPick()) { wRes.textContent = k + " came home with you! find them in your inventory (they're out now if no pet was)"; wDraw(); }
  });
  function spin() {
    if (spinning) return;
    const st = wState();
    if (freeLeft(st) <= 0 && window.YBItems && window.YBItems.use("spin")) st.extra++;   // out of free spins: a free spin item counts as one
    const free = freeLeft(st) > 0;
    if (!free) {
      if (st.paid >= EXTRA_SPINS || !window.YB || !window.YB.spend(SPIN_COST)) return wDraw();
      st.paid++;
    }
    st.spins++;
    const i = pick(), s = SLICES[i];
    // the prize is decided and handed over right now; the spinning is just for show
    let msg = "";
    if (s.coins) { window.YB.add(s.coins); msg = (s.id === "c100000" ? "jackpot! " : "") + "+" + fmtN(s.coins) + " yeonbucks!"; }
    else if (s.id === "oops") msg = "oops! +0 yeonbucks. better luck next time";
    else if (s.id === "again") { st.extra++; msg = "spin again! you got a free extra spin"; }
    else if (s.id === "boost") {
      let u = 0; try { u = Number(localStorage.getItem("yb-boost-until") || 0); } catch (e) {}
      try { localStorage.setItem("yb-boost-until", String(Math.max(Date.now(), u) + 24 * 3600000)); } catch (e) {}
      msg = "24 hr boost! +200 every 30 secs for the next 24 hours";
    } else if (s.id === "rainbow") {
      if (window.YBShop && window.YBShop.give("tap-rainbow")) msg = "rainbow sparkle tap! turn it on in your inventory";
      else {                                                                       // already have it: a random pet accessory you don't have yet
        const NAMES = { "wear-hat": "witch hat", "wear-bow": "bow", "wear-soda": "soda" };
        const left = Object.keys(NAMES).filter((id) => !(window.YBShop && window.YBShop.owns(id)));
        if (left.length) {
          const id = left[Math.floor(Math.random() * left.length)];
          window.YBShop.give(id);
          msg = "you already have the rainbow sparkle tap, so you got a pet accessory: the " + NAMES[id] + "! put it on in your inventory";
        } else { window.YB.add(1000); msg = "you already have the rainbow sparkle tap and every accessory, so here's +1,000 yeonbucks"; }
      }
    } else { setPending(pending() + 1); msg = "a new mystery pet!"; }
    wSave(st);
    spinning = true; wRes.textContent = ""; wDraw();
    const center = i * 45 + 22.5 + (Math.random() * 24 - 12);                 // somewhere inside the slice
    rot += ((360 - center - (rot % 360)) % 360 + 360) % 360 + 360 * 5;        // lands that slice under the pointer
    wheelG.style.transform = "rotate(" + rot + "deg)";
    const ms = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches ? 600 : 4700;
    setTimeout(() => { spinning = false; wRes.textContent = msg; wDraw(); if (s.id === "pet") showPick(); }, ms);
  }
  function openWheel() { wRes.textContent = ""; wDraw(); showPick(); wOv.hidden = false; (pickBox.hidden ? wBtn : pickOpts.querySelector("button") || wBtn).focus(); }
  function closeWheel() { if (spinning) return; wOv.hidden = true; }
  wBtn.addEventListener("click", spin);
  wClose.addEventListener("click", closeWheel);
  wOv.addEventListener("click", (e) => { if (e.target === wOv) closeWheel(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeWheel(); });

  // ----- room 2: the daily prize (one claim a day, 1,000 to 5,000 in steps of 500) -----
  const dOv = $("sr-daily");
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };   // (their own calendar day, so it resets at their midnight)
  function claimedToday() { try { return localStorage.getItem("yb-daily") === today(); } catch (e) { return false; } }
  function daily() {
    const amt = $("sr-daily-amt"), note = $("sr-daily-note");
    if (claimedToday()) {
      amt.textContent = "already claimed!";
      note.textContent = "come back tomorrow for another prize";
    } else {
      const n = 1000 + 500 * Math.floor(Math.random() * 9);   // 1000, 1500, ... 5000
      try { localStorage.setItem("yb-daily", today()); } catch (e) {}
      if (window.YB && window.YB.add) window.YB.add(n);
      amt.textContent = "+" + n.toLocaleString() + " yeonbucks";
      note.textContent = "you claimed today's prize! come back tomorrow for another";
    }
    dOv.hidden = false;
    $("sr-daily-ok").focus();
  }
  $("sr-daily-ok").addEventListener("click", () => { dOv.hidden = true; });
  dOv.addEventListener("click", (e) => { if (e.target === dOv) dOv.hidden = true; });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") dOv.hidden = true; });
  document.querySelectorAll(".sr-dot").forEach((d) => {
    const n = Number(d.dataset.n);
    d.addEventListener("click", () => openPlace(n));
    d.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPlace(n); } });
  });
})();