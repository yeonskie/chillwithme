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
    { id: "cheese",  w: 6,  name: "cheese tap",        text: "remy left a trail of cheese in her path as she scurries away...", item: "tap-cheese", remy: true },
    { id: "chtrail", w: 3,  name: "cheese trail",      text: "remy dragged in a whole trail of cheese. very proud of herself.", item: "cur-cheese", remy: true },
    { id: "hat",     w: 5,  name: "witch hat",         text: "a pointy hat, a little dusty. your pet can wear it!", item: "wear-hat" },
    { id: "bow",     w: 5,  name: "bow",               text: "a cute bow. your pet can wear it!", item: "wear-bow" },
    { id: "soda",    w: 5,  name: "soda",              text: "a cold soda. still fizzy. your pet can hold it!", item: "wear-soda" },
    { id: "luck",    w: 6,  name: "lucky week",        text: "+5% jackpot chance at the casino for 1 week.", boost: { key: "yb-luck-until", ms: 7 * DAY } },
    { id: "pay",     w: 6,  name: "bonus week",        text: "an extra +10% payout in the games for 1 week.", boost: { key: "yb-pay-until", ms: 7 * DAY } },
    { id: "earn",    w: 4,  name: "earn rush",         text: "lasts 48 hours.", boost: { key: "yb-earn-until", ms: 2 * DAY } },
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

  const BOX = '<svg class="lf-box" viewBox="3.9 7.9 56.1 48.1" fill="currentColor" aria-hidden="true" focusable="false"><path d="M31.2949753,55c-0.1058807,0-0.212698-0.0167503-0.3148308-0.0521126l-20.7816334-7.1785011 c-0.3860416-0.1340027-0.6446533-0.4950714-0.6446533-0.9008026V26.0505562c0-0.3015099,0.1442976-0.5862675,0.3879166-0.7658691 c0.2445564-0.1796017,0.5575123-0.2335758,0.8507919-0.146101l20.7816334,6.2804909 c0.4038448,0.1228371,0.6802597,0.4932079,0.6802597,0.9119701v21.7160378c0,0.3089523-0.1499214,0.597435-0.4038448,0.776104 C31.6866398,54.9404411,31.491745,55,31.2949753,55z M11.472826,46.1911201l18.8626652,6.5159264v-19.67062L11.472826,27.3366184 V46.1911201z"/><path d="M30.7177849,32.8186722c-0.3195152,0-0.6324711-0.1581993-0.814249-0.4485397l-4.3364162-6.8909531L8.1277504,19.6034908 l3.5343485,5.8487015c0.272666,0.4513321,0.1255579,1.0366669-0.3288851,1.3074665 c-0.4553804,0.2717285-1.0447512,0.1246967-1.3164797-0.3266354l-4.8798747-8.0765114 c-0.2070761-0.3424549-0.1770926-0.7779655,0.0758967-1.0887794c0.2520518-0.3117447,0.6727629-0.4327202,1.055057-0.3043003 l20.2400494,6.8202286c0.2098885,0.0707226,0.3879166,0.2112408,0.5050411,0.3973579l4.5172577,7.1803627 c0.2810993,0.4448166,0.1442966,1.0329437-0.3045235,1.3121185C31.0672855,32.7721405,30.8911304,32.8186722,30.7177849,32.8186722z"/><path d="M31.2949753,55c-0.1995811,0-0.396349-0.0614166-0.5621986-0.1805344 c-0.2492409-0.178669-0.3972855-0.4671516-0.3972855-0.7723808V32.3310471c0-0.424345,0.2820358-0.798439,0.6933765-0.9156914 l21.8666744-6.2804928c0.2867203-0.0828209,0.6024895-0.0251255,0.8423615,0.1544781 c0.241745,0.1796017,0.3832283,0.4615669,0.3832283,0.7612152v20.8180275c0,0.4113159-0.2651672,0.776104-0.6587067,0.9045258 l-21.8666744,7.1785011C31.497366,54.9832497,31.3961697,55,31.2949753,55z M32.2544594,33.0475922v19.6817894l19.9477043-6.549427 v-18.861948L32.2544594,33.0475922z"/><path d="M31.2949753,33.2839622c-0.268919,0-0.5303402-0.1116714-0.7149277-0.3182602 c-0.2464314-0.2735901-0.3129578-0.662571-0.1714706-0.9994431l3.9756737-9.5123997 c0.1105652-0.2633533,0.334507-0.4643593,0.6090469-0.5462513l22.7699394-6.8202276 c0.3644905-0.1126003,0.759903,0.0037222,1.0063324,0.2931328c0.2473679,0.2866192,0.3007774,0.6923532,0.1349297,1.0329447 l-4.8789406,10.0512066c-0.1180611,0.2438126-0.3354416,0.4262047-0.5978012,0.5015831l-21.8666763,6.2804909 C31.4739418,33.2709351,31.3839893,33.2839622,31.2949753,33.2839622z M35.9827652,23.6012669l-3.0358658,7.2631836 l19.5363655-5.6114025l3.7451706-7.7154484L35.9827652,23.6012669z"/><path d="M40.639637,22.1644497c-0.1105652,0-0.2201958-0.0186119-0.3251381-0.0567665l-9.3446617-3.345438 c-0.2745399-0.0977116-0.4881744-0.314537-0.5828114-0.5881271c-0.0937004-0.273592-0.058094-0.5750999,0.0983849-0.8189125 l5.0597782-7.9127293c0.2408066-0.3796768,0.7130547-0.5378761,1.1375122-0.3843298l18.9966545,6.8518677 c0.3879166,0.1395864,0.6427803,0.5108881,0.6315384,0.9212751c-0.0121803,0.410387-0.2867203,0.7677288-0.6821327,0.8859138 l-14.7117767,4.4062996C40.8260994,22.1504898,40.7333336,22.1644497,40.639637,22.1644497z M32.7473183,17.3728867 l7.9194908,2.8354816l11.6412354-3.486887l-15.5560036-5.6114044L32.7473183,17.3728867z"/><path d="M17.6626205,22.7628136c-0.4160252,0-0.7992573-0.2698689-0.9210663-0.6867695 c-0.1480465-0.5053062,0.1442966-1.0338764,0.6530857-1.1809082l13.6323547-3.9438019 c0.5059776-0.1526146,1.0400639,0.1423798,1.1890469,0.6486149c0.1480446,0.5053062-0.1442986,1.0338764-0.6530857,1.1809082 L17.9306011,22.724659C17.8415871,22.7507153,17.7506981,22.7628136,17.6626205,22.7628136z"/><path d="M22.9791355,37.5627747c-0.2305012,0-0.4610023-0.0316429-0.6877537-0.0967827l-4.492897-1.2879219 c-0.6296616-0.1805344-1.152504-0.5937119-1.4701462-1.1650887c-0.3185787-0.5713768-0.392601-1.2302284-0.2108231-1.8574409 c0.181776-0.6272125,0.5996761-1.1464767,1.1749916-1.4628716c0.574379-0.3126755,1.2387085-0.3889828,1.870245-0.2065907 l4.4928951,1.2879238c1.3024235,0.3740959,2.055769,1.7308807,1.6809711,3.0243912 c-0.1827145,0.6272087-0.599678,1.1446114-1.174057,1.4591484C23.7933846,37.4604073,23.3886032,37.5627747,22.9791355,37.5627747z M18.477808,33.2951279c-0.089016,0-0.17803,0.0223351-0.2586117,0.0670013 c-0.1255569,0.0688629-0.2173824,0.1842575-0.2576733,0.3219833s-0.0234261,0.2810326,0.0459118,0.4075928 c0.0702763,0.1246986,0.1845894,0.2158966,0.3223267,0.2549782l4.4947701,1.2879257h0.0009365 c0.1358643,0.0390854,0.2820358,0.0260544,0.4094677-0.0446663c0.1264954-0.0688629,0.2183208-0.1823959,0.2576733-0.3201218 c0.0824566-0.2847557-0.0833912-0.5825424-0.3701134-0.6644363l-4.4928951-1.2879219 C18.5799408,33.3025742,18.5284061,33.2951279,18.477808,33.2951279z"/><path d="M42.0245171,48.588295c-0.3035889,0-0.5856247-0.1916962-0.6840096-0.493206 c-0.1236839-0.3759537,0.0833931-0.7779655,0.4610023-0.9008026l8.480751-2.743351 c0.3785477-0.1228371,0.785202,0.0818901,0.9070129,0.4578438c0.1236839,0.3759537-0.0833931,0.7779655-0.4610023,0.9008026 l-8.480751,2.7433548C42.1734962,48.5771294,42.0985374,48.588295,42.0245171,48.588295z"/><path d="M43.6502037,45.5546036c-0.3035851,0-0.5856209-0.1917-0.6840057-0.4932098 c-0.1236839-0.3759537,0.0833893-0.7779655,0.4610023-0.9008026l6.8550606-2.2166443 c0.3785477-0.1228333,0.785202,0.0837555,0.9070129,0.4578476c0.1236839,0.3759537-0.0833931,0.7779655-0.4610023,0.9008026 l-6.8550644,2.2166443C43.7991867,45.5434341,43.7242279,45.5546036,43.6502037,45.5546036z"/><path d="M45.7003517,42.2510414c-0.3035889,0-0.5856247-0.1917-0.6840096-0.4932098 c-0.1236801-0.3759537,0.0833931-0.7798271,0.4610023-0.9008026l4.6128311-1.4907913 c0.3794861-0.1228371,0.785202,0.0837555,0.9070129,0.4578476c0.1236839,0.3759537-0.0833931,0.7798271-0.4610023,0.9008026 l-4.6128311,1.4907913C45.8493347,42.239872,45.7743721,42.2510414,45.7003517,42.2510414z"/><path d="M5.9595418,32.1114311c-0.3120198,0-0.6109214-0.1507549-0.7926989-0.415041 c-0.2267528-0.3312874-0.2220678-0.766798,0.0121813-1.0925026l4.3626533-6.060873 c0.3092079-0.4280682,0.9060745-0.5267086,1.3389673-0.2205486c0.4310179,0.3061619,0.5303392,0.9008026,0.2220678,1.3298016 l-2.839098,3.9447327l2.0145416-0.506237c0.5078516-0.1340027,1.0344429,0.1786728,1.1656227,0.6886311 c0.1293058,0.5118198-0.181777,1.0292225-0.6952515,1.1576424l-4.5537996,1.1446133 C6.1169572,32.1021233,6.0373125,32.1114311,5.9595418,32.1114311z"/></svg>';   // (box icon by basith ibrahim, Noun Project)
  function picFor(f) {                                                   // the picture for a find: its drawing if it has one, otherwise big words
    const art = f.item && window.YBShop && window.YBShop.art(f.item);
    if (art) return art;
    if (f.yb) return '<span class="lf-big">+' + fmt(f.yb) + "</span>";
    if (f.token) return '<span class="lf-big">' + ({ spin: "1 spin", rescue: "1 save", hint: "1 hint" }[f.token]) + "</span>";
    if (f.boost) return "<span class=\"lf-big" + (f.boost.key === "yb-earn-until" ? " lf-big-long" : "") + "\">" + ({ "yb-luck-until": "+5%", "yb-pay-until": "+10%", "yb-earn-until": "+100 every 30 seconds" }[f.boost.key]) + "</span>";
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