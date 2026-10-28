// ---------- casino de yeon: yeonbucks and the slots ----------
// YEONBUCKS: everyone starts with 500, and gets +50 for every 30 seconds they spend on the website
// (any page, as long as this tab is open and showing). The balance is saved in this browser, so it's
// per device and it's still there when they come back.
//
// THE SLOTS: a 3x3 grid of pictures. Matching pictures win. A "line" of three is any row, column or diagonal:
//   0x    no matches                                              you lose your whole bet
//   0.5x  two in a row (two matching pictures side by side or one above the other, not diagonal)   you get half back
//   1x    three in a row (a whole line)                           you get your bet back
//   5x    two lines of three (any two lines, like two rows, or a row and a diagonal)
//   10x   all nine the same: the JACKPOT
//
// THE ODDS: the jackpot is 5% (1 spin in 20) when you have 500 yeonbucks or less, and it gets less
// likely the more yeonbucks you have (at 1000 it's 2.5%, at 2000 it's 1.25%, and so on, down to a
// minimum of 0.25%). The other four results share everything that's left equally.
// To change the odds, the prizes, or how much you earn, edit the numbers just below.
//
// THE LEADERBOARD: people who press "join" in the little leaderboard box (top left) get their balance sent to Supabase
// (run supabase-casino.sql once). Nobody is on it unless they join.
//
// THE PICTURES: games/casino/slot-1.svg ... slot-9.svg. To use fewer, delete lines from PICTURES (and
// the files). "by" is the artist's name (the credits pop-up in the bottom bar lists them; see credits.js).

(function () {
  const START = 500;                 // yeonbucks everyone starts with
  const EARN = 50;                   // yeonbucks earned...  (75 or 100 once an earn boost is bought in the prize shop)
  const EVERY = 30;                  // ...every this many seconds on the site
  const BET_STEP = 1;                // bets go up by this much (1 = you can bet down to the last yeonbuck)
  const SPIN_MS = 1800;              // how long the pictures shuffle for
  const JACKPOT = 0.05;              // the jackpot chance at START yeonbucks or less
  const JACKPOT_BOOST = 0.03;        // the jackpot boost (prize shop, 50k) adds this much on top of the lucky charm
  const CHARM_BONUS = 0.05;          // the lucky charm adds this much to the jackpot chance (0.05 = 5 percentage points)
  const PRIZE_BONUS = 0.10;          // the prize bonus adds this much to every game prize (0.10 = +10%)
  const CASHBACK_CHANCE = 0.10;      // the cashback item (prize shop): this chance on every spin...
  const CASHBACK_PART = 0.10;        // ...to get this much of the bet back (0.10 = 10%)
  const JACKPOT_MIN = 0.0025;        // ...and it never goes below this

  const PICTURES = [
    { img: "games/casino/slot-1.svg", by: "Nhor" },
    { img: "games/casino/slot-2.svg", by: "YANDI RS" },
    { img: "games/casino/slot-3.svg", by: "Romaldon" },
    { img: "games/casino/slot-4.svg", by: "Magicon" },
    { img: "games/casino/slot-5.svg", by: "Marie Van den Broeck" },
    { img: "games/casino/slot-6.svg", by: "Lulis Dian RP" },
    { img: "games/casino/slot-7.svg", by: "Edy Susanto" },
    { img: "games/casino/slot-8.svg", by: "Besokpagi" },
    { img: "games/casino/slot-9.svg", by: "Kiki Rizky" },
  ];

  // ----- saving (in this browser) -----
  const memory = {};
  function read(k) { try { const v = localStorage.getItem(k); return v === null ? memory[k] : v; } catch (e) { return memory[k]; } }
  function write(k, v) { memory[k] = String(v); try { localStorage.setItem(k, String(v)); } catch (e) {} }

  function balance() {
    const v = parseInt(read("yeonbucks"), 10);
    if (Number.isFinite(v) && v >= 0) return v;
    write("yeonbucks", START);
    return START;
  }
  // the earn boost (bought in the prize shop) is remembered in "yb-own"
  function owns(id) { try { return JSON.parse(read("yb-own") || "[]").indexOf(id) !== -1; } catch (e) { return false; } }
  const boostOn = () => Number(read("yb-boost-until") || 0) > Date.now();   // the wheel's 24 hour boost
  const foundOn = (k) => Number(read(k) || 0) > Date.now();       // the timed boosts from the lost and found (see lostfound.js): "yb-luck-until", "yb-pay-until", "yb-earn-until"
  const earnAmt = () => (boostOn() ? 200 : owns("boost2") ? 100 : owns("boost") ? 75 : EARN) + (foundOn("yb-earn-until") ? 100 : 0);   // the best boost you have (the wheel's 24 hour boost is +200), plus the lost and found's +100 while it lasts
  function setBalance(n) { write("yeonbucks", Math.max(0, Math.floor(n))); }

  // ----- earning: counts the seconds this tab is showing -----
  // (every open tab shares the same clock, so two tabs don't earn double)
  function progress() { const v = parseFloat(read("yb-prog")); return Number.isFinite(v) && v >= 0 ? v : 0; }
  function earnTick() {
    const now = Date.now();
    const last = parseInt(read("yb-t"), 10);
    write("yb-t", now);
    if (document.visibilityState !== "visible") return;
    let dt = Number.isFinite(last) ? (now - last) / 1000 : 0;
    dt = Math.min(Math.max(dt, 0), 2);                    // never count a long gap (computer asleep, etc.)
    let prog = progress() + dt;
    if (prog >= EVERY) {
      const times = Math.floor(prog / EVERY);
      prog -= times * EVERY;
      setBalance(balance() + times * earnAmt());
      updateBox();                                        // show the new total right away, together with the "+50!"
      refresh();
      popEarn(times * earnAmt());
    }
    write("yb-prog", prog);
  }
  setInterval(() => { earnTick(); refresh(); updateBox(); }, 1000);   // the bottom-left number is redrawn every second too, not just when something happens

  // ----- a spin in progress (shared by every tab, so they all show the same number) -----
  // while the pictures are spinning the prize is "held back" from what's shown, in every open tab,
  // and no other tab can start a spin until it's over
  function hold() { try { const h = JSON.parse(read("yb-hold")); if (h && h.until > Date.now()) return h; } catch (e) {} return null; }
  const held = () => { const h = hold(); return h ? h.amt : 0; };
  const shown = () => Math.max(0, balance() - held());
  function holdSet(amt) { write("yb-hold", JSON.stringify({ amt, until: Date.now() + SPIN_MS + 4000 })); }
  function holdClear() { write("yb-hold", ""); }

  // ----- the "___ yeonbucks earned" box (everywhere except the casino and the two shops) -----
  const ybBox = document.getElementById("yb-box"), ybAmt = document.getElementById("yb-amt");
  // a little "+50!" that floats up next to the number whenever you earn yeonbucks
  const ybPop = document.getElementById("yb-pop");
  function popEarn(n) {
    if (!ybPop) return;
    ybPop.textContent = "+" + n + "!";
    ybPop.classList.remove("yb-pop-go");
    void ybPop.offsetWidth;                                             // restart the animation if it's already running
    ybPop.classList.add("yb-pop-go");
  }
  function updateBox() {
    if (!ybBox) return;
    const page = location.hash.replace("#", "");
    const show = page !== "casino" && page !== "shop" && page !== "rare-shop";
    ybBox.hidden = !show;
    document.body.classList.toggle("has-yb", show);
    if (!show) return;
    ybAmt.textContent = shown().toLocaleString("en-US");
    const mini = document.getElementById("mini");                       // the music player (on phones it sits just above the bottom bar too)
    document.body.classList.toggle("has-mini", !!mini && !mini.hidden);
  }
  if (ybBox && window.ResizeObserver) new ResizeObserver(() => document.documentElement.style.setProperty("--yb-h", ybBox.offsetHeight + "px")).observe(ybBox);   // (so the pet can sit above the box, whatever its height)
  const miniEl = document.getElementById("mini");
  if (miniEl && window.MutationObserver) new MutationObserver(updateBox).observe(miniEl, { attributes: true, attributeFilter: ["hidden"] });
  setInterval(updateBox, 500);
  document.addEventListener("visibilitychange", updateBox);   // phones: catch up the moment the tab comes back
  window.addEventListener("pageshow", updateBox);
  window.addEventListener("hashchange", updateBox);
  window.addEventListener("resize", updateBox);
  window.addEventListener("storage", updateBox);
  updateBox();

  // ----- the casino page -----
  const $ = (id) => document.getElementById(id);
  const grid = $("cz-grid");
  if (!grid) return;

  const machineEl = grid.parentElement;   // the machine box (it gets the yellow jackpot outline)
  // ---- the lever: drawn in 3d. It pivots at the holder and swings toward you (up -> straight at you -> down), with perspective,
  // so the ball grows as it comes at you. pose(deg): 0 = up, 180 = hanging straight down.
  const lever = (() => {
    const svg = document.querySelector(".cz-lever svg");
    if (!svg) return { down() {}, up() {}, set() {} };
    const fade = svg.querySelector("#cz-fade"), ffade = svg.querySelector("#cz-ffade"), armF = svg.querySelector(".cz-armf"), armS = svg.querySelector(".cz-arms"), ballG = svg.querySelector(".cz-ballg");
    const PX = 50.45, PY = 231.46, HW = 11.25, EXTRA = 0.58, TRIM = 1.5, BALLDX = (EXTRA + TRIM) / 2 + 1.04, LEN = 198.3, LEAN = 4.95, FAR = LEN * 2.3, BX = 55.4, BY = 33.2;   // EXTRA = how much wider the arm is on its right side. TRIM = how much narrower on its left side
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const BOOST = 0.28, DOWN = 140, SINK = 54;   // DOWN: where it rests when pulled. SINK: how far the bottom of the arm slides down into the holder (about half of it) at the most pulled
    let deg = 0, raf = 0;
    const ss = (v) => { v = Math.min(1, Math.max(0, v)); return v * v * (3 - 2 * v); };
    function pose(d) {
      deg = d;
      const a = d * Math.PI / 180, t = Math.min(1, Math.max(0, d / 180));
      const z = LEN * Math.sin(a);
      const s = FAR / (FAR - z) * (1 + BOOST * ss((d - 90) / (DOWN - 90)));   // past straight-at-you it keeps growing, so it ends big and close
      const by = PY + SINK * ss((d - 50) / (DOWN - 50));                       // the bottom of the arm slides down into the holder as it gets pulled
      const x = PX + LEAN * (1 - t) * s, y = by - LEN * Math.cos(a) * s, hw = HW * s, hr = (HW + EXTRA) * s;
      const bl = PX - HW + TRIM, tl = x - hw + TRIM * s;   // left edge at the bottom and at the ball
      armF.setAttribute("points", bl + "," + by + " " + (PX + HW + EXTRA) + "," + by + " " + (x + hr) + "," + y + " " + tl + "," + y);
      armS.setAttribute("d", "M" + bl + "," + by + "L" + tl + "," + y + "M" + (PX + HW + EXTRA) + "," + by + "L" + (x + hr) + "," + y);
      // the bottom of the arm feathers away as it sinks into the holder (no fade at rest, so it still meets the holder top cleanly)
      const sunk = ss((d - 50) / (DOWN - 50)), dx = x - PX, dy = y - by, ln = Math.hypot(dx, dy) || 1;
      const fl = dy < 0 ? Math.max(0.01, by - PY) : 5;     // pointing up: only the part that's inside the holder fades. pointing down: it fades along its top stretch
      const f = Math.min(fl, ln) / ln;
      for (const g of [fade, ffade]) {
        g.setAttribute("x1", PX); g.setAttribute("y1", by);
        g.setAttribute("x2", PX + dx * f); g.setAttribute("y2", by + dy * f);
      }
      ffade.firstElementChild.style.stopOpacity = sunk > 0.001 ? 0 : 1;
      ballG.setAttribute("transform", "translate(" + (x + BALLDX * s) + " " + y + ") scale(" + s + ") translate(" + -BX + " " + -BY + ")");
    }
    function run(from, to, ms, ease) {
      cancelAnimationFrame(raf);
      if (reduce) { pose(to); return; }
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / ms);
        pose(from + (to - from) * ease(p));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    // pull: starts slow (it takes a push), then drops fast and lands with a small bounce
    const pull = (p) => (p < 0.8 ? Math.pow(p / 0.8, 1.7) * 1.04 : 1.04 - 0.04 * Math.sin(((p - 0.8) / 0.2) * Math.PI / 2));
    // let go: snaps back up and wobbles a little past the top
    const back = (p) => { const c = 1.1, q = p - 1; return 1 + (c + 1) * q * q * q + c * q * q; };
    return {
      down() { run(deg, DOWN, 380, pull); },
      up() { run(deg, 0, 600, back); },
      set: pose,
    };
  })();
  window.czLever = lever;

  const balEl = $("cz-bal"), nextEl = $("cz-next"), msg = $("cz-msg"), betEl = $("cz-bet"), spinBtn = $("cz-spin");
  let spinning = false;

  function say(text, cls) {   // **like this** makes part of the message bold (used for the amounts)
    msg.textContent = "";
    text.split("**").forEach((part, i) => {
      if (!part) return;
      if (i % 2) { const b = document.createElement("strong"); b.textContent = part; msg.appendChild(b); }
      else msg.appendChild(document.createTextNode(part));
    });
    msg.className = "cz-msg" + (cls ? " " + cls : "");
  }

  // the 9 boxes
  const cells = [];
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("div");
    cell.className = "cz-cell";
    const img = document.createElement("img");
    img.alt = "";
    img.draggable = false;
    cell.appendChild(img);
    grid.appendChild(cell);
    cells.push(cell);
  }
  function paint(cell, n) { cell.dataset.sym = n; cell.firstChild.src = PICTURES[n].img; }

  // ----- reading a finished grid: what did it win? -----
  // a grid is 9 numbers (which picture is in each box). evaluate() says what it's worth and which boxes won.
  const ROWS = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
  const COLS = [[0, 3, 6], [1, 4, 7], [2, 5, 8]];
  const DIAGS = [[0, 4, 8], [2, 4, 6]];
  const LINES = ROWS.concat(COLS, DIAGS);                   // every line of three that counts
  // every pair of neighbours for "two in a row": side by side or one above the other (diagonals don't count here)
  const SIDE_BY_SIDE = [[0, 1], [1, 2], [3, 4], [4, 5], [6, 7], [7, 8], [0, 3], [3, 6], [1, 4], [4, 7], [2, 5], [5, 8]];
  function evaluate(g) {
    if (g.every((v) => v === g[0])) return { mult: 10, cells: [0, 1, 2, 3, 4, 5, 6, 7, 8] };
    const lines = LINES.filter((l) => g[l[0]] === g[l[1]] && g[l[1]] === g[l[2]]);
    if (lines.length >= 2) return { mult: 5, cells: [...new Set([].concat(...lines))] };
    if (lines.length === 1) return { mult: 1, cells: lines[0] };
    const pairs = SIDE_BY_SIDE.filter((p) => g[p[0]] === g[p[1]]);
    if (pairs.length) return { mult: 0.5, cells: [...new Set([].concat(...pairs))] };
    return { mult: 0, cells: [] };
  }

  // ----- deciding what you get -----
  const rnd = (n) => Math.floor(Math.random() * n);
  const N = PICTURES.length;
  function jackpotChance(bal) {
    const base = Math.max(JACKPOT_MIN, JACKPOT * Math.min(1, START / Math.max(bal, 1)));
    return Math.min(1, base + (owns("charm") ? CHARM_BONUS : 0) + (owns("charm2") ? JACKPOT_BOOST : 0) + (foundOn("yb-luck-until") ? CHARM_BONUS : 0));       // the lucky charm (prize shop) adds 5 percentage points, and so does the lost and found's week of luck
  }
  function pickResult() {
    if (Math.random() < jackpotChance(balance())) return 10;
    return [0, 0.5, 1, 5][rnd(4)];                         // the other four are equally likely
  }

  // builds a random grid that is worth exactly `mult` (it keeps trying until evaluate() agrees)
  function makeGrid(mult) {
    let g;
    for (let tries = 0; tries < 20000; tries++) {
      g = Array.from({ length: 9 }, () => rnd(N));
      if (mult === 10) {
        g.fill(rnd(N));
      } else if (mult === 5) {
        // two different lines. if they cross they share a box, so they have to be the same picture
        const first = rnd(LINES.length);
        let second = rnd(LINES.length - 1);
        if (second >= first) second++;
        const l1 = LINES[first], l2 = LINES[second], a = rnd(N);
        const cross = l1.some((i) => l2.indexOf(i) >= 0);
        l1.forEach((i) => { g[i] = a; });
        const b = cross ? a : rnd(N);
        l2.forEach((i) => { g[i] = b; });
      } else if (mult === 1) {
        const line = LINES[rnd(LINES.length)], a = rnd(N);
        line.forEach((i) => { g[i] = a; });
      } else if (mult === 0.5) {
        const p = SIDE_BY_SIDE[rnd(SIDE_BY_SIDE.length)], a = rnd(N);
        g[p[0]] = g[p[1]] = a;
      } else {
        // no matches at all: no box matches the one beside it or above it
        for (let i = 0; i < 9; i++) {
          const bad = [];
          SIDE_BY_SIDE.forEach((p) => { if (p[1] === i && p[0] < i) bad.push(g[p[0]]); if (p[0] === i && p[1] < i) bad.push(g[p[1]]); });
          const ok = PICTURES.map((_, n) => n).filter((n) => bad.indexOf(n) < 0);
          if (ok.length) g[i] = ok[rnd(ok.length)];
        }
      }
      if (evaluate(g).mult === mult) return g;
    }
    return g;
  }

  // ----- the "how it works" pop-up -----
  // a tiny 3x3 diagram: the boxes that need to match are filled in
  function mini(filled) {
    const d = document.createElement("span");
    d.className = "cz-mini";
    for (let i = 0; i < 9; i++) {
      const s = document.createElement("span");
      if (filled.indexOf(i) >= 0) s.className = "on";
      d.appendChild(s);
    }
    return d;
  }
  [
    { pics: [[]], text: "0x: no matches, you lose your bet" },
    { pics: [[3, 4], [1, 4]], text: "0.5x: two in a row (side by side or up and down), you get half your bet back" },
    { pics: [[3, 4, 5], [1, 4, 7], [0, 4, 8]], text: "1x: three in a row (across, down or diagonal), you get your bet back" },
    { pics: [[0, 1, 2, 6, 7, 8], [3, 4, 5, 1, 4, 7], [0, 4, 8, 2, 6]], text: "5x: any two lines of three, like two rows, a row and a column, or both diagonals" },
    { pics: [[0, 1, 2, 3, 4, 5, 6, 7, 8]], text: "10x: all nine the same. jackpot!" },
  ].forEach((row) => {
    const li = document.createElement("li");
    li.className = "cz-pay-item";
    const box = document.createElement("span");
    box.className = "cz-pay-row";
    row.pics.forEach((f) => box.appendChild(mini(f)));
    li.appendChild(box);
    const t = document.createElement("span");
    t.className = "cz-pay-text";
    t.textContent = row.text;
    li.appendChild(t);
    $("cz-pay").appendChild(li);
  });
  function pct(x) { return (Math.round(x * 10000) / 100) + "%"; }
  function updateJackpotNote() {
    $("cz-jp").textContent = "the jackpot starts at " + pct(JACKPOT) + " and gets less likely the more yeonbucks you have. right now it's " + pct(jackpotChance(balance())) + "." + (owns("charm") || owns("charm2") || foundOn("yb-luck-until") ? " (your lucky charm is helping!)" : "");
  }

  const fmt = (n) => Number(n).toLocaleString("en-US");

  function refresh() {
    balEl.textContent = fmt(shown());
    balEl.dataset.len = String(balEl.textContent.length);
    document.querySelectorAll("[data-earn]").forEach((el) => { el.textContent = earnAmt(); });   // the "+50" in the text (75 with the boost)
    document.querySelectorAll("[data-yb]").forEach((el) => { el.textContent = fmt(shown()); el.dataset.len = String(el.textContent.length); });   // "you have ___ yeonbucks" boxes on other pages
    const left = Math.max(0, Math.ceil(EVERY - progress()));
    nextEl.textContent = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
    spinBtn.disabled = spinning || !!hold() || balance() < BET_STEP;
    if (!spinning && balance() < BET_STEP && !msg.dataset.broke) { msg.dataset.broke = "1"; say("you're out of yeonbucks. you'll get more soon!"); }
    if (balance() >= BET_STEP) delete msg.dataset.broke;
  }
  window.addEventListener("storage", refresh);

  // a small door for the prize shop (shop.js): see what you have, spend it, redraw the numbers
  window.YB = {
    have: () => shown(),
    spend: (n) => { if (shown() < n) return false; setBalance(balance() - n); refresh(); updateBox(); return true; },
    redraw: () => { refresh(); updateBox(); },
    add: (n) => { setBalance(balance() + Math.max(0, Math.floor(n))); refresh(); updateBox(); },
    // a prize from one of the games: +10% with the prize bonus. Gives back how much was paid, so the game can say so
    prize: (n) => {
      const paid = Math.max(0, Math.round(n * (1 + (owns("bonus") ? PRIZE_BONUS : 0) + (foundOn("yb-pay-until") ? PRIZE_BONUS : 0))));   // the prize bonus and the lost and found's week of +10% add up
      setBalance(balance() + paid); refresh(); updateBox();
      return paid;
    },
  };

  // the bet box grows with the number, so big bets (like 100000) never get cut off
  const fitCtx = document.createElement("canvas").getContext("2d");
  function fitBet() {   // the bet always shows in full: a long number is scaled down to fit the tray window (the text stays 16px so phones don't zoom in)
    const cs = getComputedStyle(betEl), win = betEl.parentElement.clientWidth;
    betEl.style.transform = ""; betEl.style.width = "";
    if (!win || !fitCtx) return;
    fitCtx.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
    const w = fitCtx.measureText(betEl.value || "0").width + 4, avail = win * 0.86;
    if (w > avail) { betEl.style.width = Math.ceil(w) + "px"; betEl.style.transform = "scale(" + (avail / w).toFixed(3) + ")"; }
  }

  // the bet shows commas as you type (100,000), so it's a text box that only keeps the digits
  const betDigits = () => String(betEl.value).replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12);
  const betFormat = (d) => (d ? Number(d).toLocaleString("en-US") : "");
  betEl.addEventListener("input", () => {
    const pos = betEl.selectionStart == null ? betEl.value.length : betEl.selectionStart;
    const before = betEl.value.slice(0, pos).replace(/\D/g, "").length;      // digits left of the cursor
    betEl.value = betFormat(betDigits());
    let n = 0, p = 0;
    while (p < betEl.value.length && n < before) { if (/\d/.test(betEl.value[p])) n++; p++; }
    try { betEl.setSelectionRange(p, p); } catch (e) {}
    fitBet();
  });
  window.addEventListener("resize", fitBet);
  fitBet();
  function readBet() {
    let b = Math.floor(Number(betDigits() || 0) / BET_STEP) * BET_STEP;
    if (!Number.isFinite(b) || b < BET_STEP) b = BET_STEP;
    return b;
  }
  $("cz-quick").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const v = b.dataset.bet === "max" ? Math.floor(balance() / BET_STEP) * BET_STEP : Number(b.dataset.bet);
    betEl.value = betFormat(String(Math.max(BET_STEP, v)));
    fitBet();
  });

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // runs "step" a few times in a row, 180ms apart (this is what makes the winning flash)
  async function flash(step, times) {
    if (reduced) return;
    for (let k = 0; k < times; k++) { step(); await wait(180); }
  }

  async function spin() {
    if (spinning) return;
    if (hold()) { say("another tab is spinning. wait a sec!"); return; }
    const bet = readBet();
    betEl.value = betFormat(String(bet));
    fitBet();
    if (bet > balance()) { say("you only have " + fmt(balance()) + " yeonbucks. try a smaller bet.", "cz-bad"); return; }

    // decide the result first, and settle the money straight away (so refreshing can't cheat)
    const result = pickResult();
    const win = Math.round(bet * result);                    // (0.5x of an odd bet rounds up, so 5 yeonbucks pays back 3)
    const cash = owns("cashback") && Math.random() < CASHBACK_CHANCE ? Math.round(bet * CASHBACK_PART) : 0;   // cashback, whatever the spin gives
    spinning = true;
    spinBtn.disabled = true;
    spinBtn.classList.add("cz-pulled"); lever.down();                        // the lever arm stays down until the wheels stop (removed again at the end of the spin)
    setBalance(balance() - bet + win + cash);
    holdSet(win + cash);                                           // every tab shows the balance after the bet, before the prize arrives
    refresh();
    say("spinning...");
    msg.parentElement.classList.add("cz-spun");                 // after the first spin the welcome title goes away and only the results show
    cells.forEach((c) => c.classList.remove("cz-win", "cz-pair"));
    grid.classList.remove("cz-jackpot");
    machineEl.classList.remove("cz-gold");

    const final = makeGrid(result);
    if (reduced) {
      cells.forEach((c, i) => paint(c, final[i]));
    } else {
      // every box flickers through pictures, and the columns stop one after another, left to right
      const stopAt = [900, 1400, 1900];
      const start = Date.now();
      const stopped = [false, false, false];
      while (stopped.some((x) => !x)) {
        const t = Date.now() - start;
        for (let col = 0; col < 3; col++) {
          if (stopped[col]) continue;
          const idx = [col, col + 3, col + 6];
          if (t >= stopAt[col]) {
            idx.forEach((i) => { paint(cells[i], final[i]); cells[i].classList.remove("cz-spinning"); });
            stopped[col] = true;
          } else {
            idx.forEach((i) => { paint(cells[i], rnd(N)); cells[i].classList.add("cz-spinning"); });
          }
        }
        await wait(90);
      }
    }

    holdClear();                                              // the prize arrives on screen (the button stays off until the light show is over)
    const won = evaluate(final).cells.map((i) => cells[i]);
    if (result === 10) {
      // jackpot: the whole machine flashes, then stays lit
      say("jackpot! all nine match! you won **" + fmt(win) + "** yeonbucks!");
      await flash(() => { grid.classList.toggle("cz-jackpot"); machineEl.classList.toggle("cz-gold"); }, 7);
      grid.classList.add("cz-jackpot");
      machineEl.classList.add("cz-gold");
    } else if (result === 5) {
      // two lines: they flash, then stay lit
      say("two lines! 5x: you won **" + fmt(win) + "** yeonbucks!");
      await flash(() => won.forEach((c) => c.classList.toggle("cz-win")), 5);
      won.forEach((c) => c.classList.add("cz-win"));
    } else if (result === 1) {
      // three in a row: lit up and steady
      won.forEach((c) => c.classList.add("cz-win"));
      say("three in a row! 1x: you got your **" + fmt(bet) + "** back.");
    } else if (result === 0.5) {
      // two in a row: the pair gets a dashed outline
      won.forEach((c) => c.classList.add("cz-pair"));
      say("two in a row! 0.5x: you got half back (**" + fmt(win) + "**).");
    } else {
      say("no matches. you lost **" + fmt(bet) + "** yeonbucks.", "cz-bad");
    }
    if (cash > 0) {                                           // cashback: added to the end of whatever the spin said
      const b = document.createElement("strong");
      b.textContent = fmt(cash);
      msg.appendChild(document.createTextNode(" cashback! "));
      msg.appendChild(b);
      msg.appendChild(document.createTextNode(" yeonbucks back."));
    }
    spinning = false;
    spinBtn.classList.remove("cz-pulled"); lever.up();
    refresh();
  }

  // the "how it works" pop-up
  const how = $("cz-how");
  function openHow() { updateJackpotNote(); how.hidden = false; how.querySelector(".gi-dialog-card").scrollTop = 0; $("cz-how-close").focus({ preventScroll: true }); }
  function closeHow() { how.hidden = true; $("cz-how-btn").focus(); }
  $("cz-how-btn").addEventListener("click", openHow);
  $("cz-how-close").addEventListener("click", closeHow);
  $("cz-how-backdrop").addEventListener("click", closeHow);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !how.hidden) closeHow(); });


  // ----- the leaderboard (small box in the top left; needs supabase-casino.sql, and community-config.js for the address) -----
  // the board is drawn in two places: the little box on the casino page, and a popup (the "leaderboard" link by the yeonbucks)
  function lbView(p, rows, unit) {
    const g = (s) => $(p + "-" + s);
    return { list: g("list"), me: g("me"), note: g("note"), name: g("name"), form: g("form"), remove: g("remove"), edit: g("edit"), save: g("save"), cancel: g("cancel"), rows: rows, unit: unit || "" };
  }
  const VIEWS = [lbView("cz-lb", 100), lbView("lb2", 100, " yeonbucks")].filter((v) => v.list);     // (both show everyone the board sends back: up to 100; the popup list scrolls inside after about 15 rows)
  const lbList = VIEWS[0].list;
  let lastSent = null, lastSentAt = 0, sending = false, joined = false;

  function myId() {
    let id = read("yb-id");
    if (!id) { id = "y" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); write("yb-id", id); }
    return id;
  }
  const myName = () => (read("yb-name") || "").trim();
  function lbApi(name, args) {
    const cfg = typeof COMMUNITY !== "undefined" ? COMMUNITY : {};
    const base = String(cfg.url || "").trim().replace(/\/+$/, "");
    const key = String(cfg.key || "").trim();
    if (!/^https:\/\/[^\s/]+/i.test(base) || key.length < 20) return Promise.reject(new Error("not configured"));
    const headers = { apikey: key, "Content-Type": "application/json" };
    if (/^eyJ/.test(key)) headers.Authorization = "Bearer " + key;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 12000);
    return fetch(base + "/rest/v1/rpc/" + name, { method: "POST", headers, body: JSON.stringify(args), signal: ctl.signal })
      .then((res) => { if (!res.ok) throw new Error(String(res.status)); return res.text(); })
      .then((t) => (t ? JSON.parse(t) : null))
      .finally(() => clearTimeout(timer));
  }
  // send my balance (only if I joined, and only when it changed; at most once a second)
  async function sendScore(force) {
    if (sending || !myName()) return;
    const bal = shown();
    if (!force && (bal === lastSent || Date.now() - lastSentAt < 1000)) return;
    sending = true;
    try {
      await lbApi("cz_submit", { p_id: myId(), p_name: myName(), p_balance: bal });
      lastSent = bal; lastSentAt = Date.now();
      lbTick();                                          // and look at the board right away, so my own change shows up too
    } catch (e) { lastSentAt = Date.now(); } finally { sending = false; }
  }
  // (my balance goes out within about a second of changing, and the board is re-read every 1.5 seconds,
  //  so a change shows up for everyone looking at the board in under 3 seconds)
  setInterval(() => { if (!spinning) sendScore(false); }, 500);

  function drawBoard(data) {
    const me = data && data.me;
    joined = !!me;
    VIEWS.forEach((v) => {
      v.list.innerHTML = "";
      const top = ((data && data.top) || []).slice(0, v.rows);
      top.forEach((p, i) => {
        const li = document.createElement("li");
        if (p.me) li.className = "cz-lb-you";
        const rank = document.createElement("span"); rank.className = "cz-lb-rank"; rank.textContent = i + 1;
        const nm = document.createElement("span"); nm.className = "cz-lb-name"; nm.textContent = p.name;
        const bl = document.createElement("span"); bl.className = "cz-lb-bal"; bl.textContent = Number(p.balance).toLocaleString("en-US");
        if (v.unit) { const u = document.createElement("span"); u.className = "cz-lb-unit"; u.textContent = v.unit; bl.appendChild(u); }
        li.append(rank, nm, bl);
        v.list.appendChild(li);
      });
      if (!top.length) { const li = document.createElement("li"); li.className = "cz-lb-empty"; li.textContent = "nobody yet!"; v.list.appendChild(li); }
      v.me.textContent = me && !top.some((p) => p.me) ? "you: #" + me.rank + " (" + Number(me.balance).toLocaleString("en-US") + v.unit + ")" : "";
      v.edit.textContent = me ? "edit" : "join";
      v.save.textContent = me ? "save" : "join";
      v.remove.hidden = !me;
    });
  }
  const setNote = (t) => VIEWS.forEach((v) => { v.note.textContent = t; });
  let loading = false;
  async function loadBoard() {
    if (loading) return;
    loading = true;
    try {
      const data = await lbApi("cz_board", { p_id: myId() });
      drawBoard(data); setNote("");
      write("yb-board", JSON.stringify(data));          // remembered, so next time the box fills in instantly
    } catch (e) {
      if (lbList.children.length) return;               // keep showing the last list if the internet blips
      setNote(/not configured/.test(String(e.message)) ? "not connected yet" : "can't load. did you run supabase-casino.sql?");
    } finally { loading = false; }
  }
  const page = document.querySelector('.page[data-page="casino"]');
  const pop = $("lb-pop");
  const popOpen = () => !!pop && !pop.hidden;
  function lbTick() { if (((page && page.classList.contains("active")) || popOpen()) && document.visibilityState === "visible") loadBoard(); }
  setInterval(lbTick, 1500);
  window.addEventListener("hashchange", () => setTimeout(lbTick, 50));
  document.addEventListener("visibilitychange", lbTick);

  VIEWS.forEach((v) => {
    const showForm = (on) => { v.form.hidden = !on; v.edit.hidden = on; if (on) { v.name.value = myName(); v.name.focus({ preventScroll: true }); } };
    v.edit.addEventListener("click", () => showForm(true));
    v.cancel.addEventListener("click", () => { showForm(false); setNote(""); });
    v.form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const n = v.name.value.trim().slice(0, 20);
      if (!n) { setNote("type a name first"); return; }
      write("yb-name", n);
      setNote("saving...");
      window.dispatchEvent(new Event("yb-name-changed"));
      await sendScore(true);
      await loadBoard();
      showForm(false);
    });
    v.remove.addEventListener("click", async () => {
      try { await lbApi("cz_remove", { p_id: myId() }); } catch (e) {}
      write("yb-name", ""); lastSent = null; window.dispatchEvent(new Event("yb-name-changed"));
      await loadBoard();
      showForm(false);
      setNote("you're off the board");
    });
  });

  // the popup (opened by the "leaderboard" link by the yeonbucks box, on every page except the casino and the shop)
  if (pop) {
    const openPop = (from) => { pop.hidden = false; pop.dataset.from = ""; loadBoard(); const x = $("lb-close"); if (x) x.focus(); popFrom = from || null; };
    let popFrom = null;
    const closePop = () => { if (pop.hidden) return; pop.hidden = true; if (popFrom && document.contains(popFrom)) popFrom.focus(); popFrom = null; };
    document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest("[data-lb-open]"); if (b) openPop(b); });
    const x = $("lb-close"); if (x) x.addEventListener("click", closePop);
    pop.addEventListener("click", (e) => { if (e.target === pop) closePop(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePop(); });
    window.addEventListener("hashchange", closePop);
  }
  // show the last list we saved straight away, then fetch a fresh one as soon as every script has loaded
  // (the address in community-config.js loads after this file, so asking any sooner says "not connected")
  try { const saved = JSON.parse(read("yb-board")); if (saved && saved.top) drawBoard(saved); } catch (e) {}
  if (!lbList.children.length) setNote("loading...");
  if (document.readyState === "complete") lbTick(); else window.addEventListener("load", lbTick);

  // when someone first enters the arcade (or any game page), ask for a name, once.
  // "skip" is remembered, and "join" on the leaderboard still works later.
  (function welcome() {
    const wel = $("wel"), form = $("wel-form"), input = $("wel-name"), note = $("wel-note");
    if (!wel || !form) return;
    const close = () => { wel.hidden = true; };
    // every game page counts, so people who jump straight to one still get asked (not the secret room, rare shop or confession booth; the community board does)
    const GAME_PAGES = /^#(arcade|casino|shop|idol|scattergories|hyrax|community|circus-tent|fun-house|house-of-mirrors|haunted-house|tunnel-of-love)$/;
    const onGamePage = () => GAME_PAGES.test(location.hash);
    const skip = () => { write("yb-asked", "1"); close(); };
    function maybeShow() {
      if (!onGamePage()) return;
      const cfg = typeof COMMUNITY !== "undefined" ? COMMUNITY : {};
      if (!cfg.url || !cfg.key) return;                       // no board connected, nothing to join
      if (myName() || read("yb-asked")) return;
      wel.hidden = false; input.focus({ preventScroll: true });
    }
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const n = input.value.trim().slice(0, 20);
      if (!n) { note.textContent = "type a name first"; return; }
      write("yb-name", n); write("yb-asked", "1"); window.dispatchEvent(new Event("yb-name-changed"));
      note.textContent = "joining...";
      await sendScore(true); await loadBoard();
      close();
    });
    $("wel-skip").addEventListener("click", skip);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !wel.hidden) skip(); });
    window.addEventListener("hashchange", () => { if (!onGamePage()) close(); else setTimeout(maybeShow, 300); });
    if (document.readyState === "complete") setTimeout(maybeShow, 600); else window.addEventListener("load", () => setTimeout(maybeShow, 600));
  })();

  spinBtn.addEventListener("click", spin);
  betEl.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); spin(); } });

  // the machine starts on a mixed-up grid
  makeGrid(0).forEach((n, i) => paint(cells[i], n));
  refresh();
})();