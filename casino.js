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
// the files). "by" is the artist's name, shown in the "how it works" pop-up (Noun Project credit).

(function () {
  const START = 500;                 // yeonbucks everyone starts with
  const EARN = 50;                   // yeonbucks earned...  (75 or 100 once an earn boost is bought in the prize shop)
  const EVERY = 30;                  // ...every this many seconds on the site
  const BET_STEP = 1;                // bets go up by this much (1 = you can bet down to the last yeonbuck)
  const SPIN_MS = 1800;              // how long the pictures shuffle for
  const JACKPOT = 0.05;              // the jackpot chance at START yeonbucks or less
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
  const earnAmt = () => (owns("boost2") ? 100 : owns("boost") ? 75 : EARN);   // the best boost you own
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

  // ----- the "___ yeonbucks earned" box (everywhere except the casino and the shop) -----
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
    const show = page !== "casino" && page !== "shop";
    ybBox.hidden = !show;
    document.body.classList.toggle("has-yb", show);
    if (!show) return;
    ybAmt.textContent = shown();
    const mini = document.getElementById("mini");                       // the music player (on phones it sits just above the bottom bar too)
    document.body.classList.toggle("has-mini", !!mini && !mini.hidden);
  }
  const miniEl = document.getElementById("mini");
  if (miniEl && window.MutationObserver) new MutationObserver(updateBox).observe(miniEl, { attributes: true, attributeFilter: ["hidden"] });
  const ybWhere = document.getElementById("yb-where"), ybLinks = document.getElementById("yb-links");
  function ybOpen(on) { if (!ybLinks) return; ybLinks.hidden = !on; ybWhere.setAttribute("aria-expanded", on ? "true" : "false"); }
  if (ybWhere) {
    ybWhere.addEventListener("click", () => ybOpen(ybLinks.hidden));
    document.addEventListener("click", (e) => { if (!ybBox.contains(e.target)) ybOpen(false); });
    window.addEventListener("hashchange", () => ybOpen(false));
  }
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

  const balEl = $("cz-bal"), nextEl = $("cz-next"), msg = $("cz-msg"), betEl = $("cz-bet"), spinBtn = $("cz-spin");
  let spinning = false;

  function say(text, cls) { msg.textContent = text; msg.className = "cz-msg" + (cls ? " " + cls : ""); }

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
    return Math.max(JACKPOT_MIN, JACKPOT * Math.min(1, START / Math.max(bal, 1)));
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
  const artists = PICTURES.map((s) => s.by).filter((v, k, a) => v && a.indexOf(v) === k);
  $("cz-credits").textContent = "icons by " + artists.join(", ") + ", from the Noun Project.";
  function pct(x) { return (Math.round(x * 10000) / 100) + "%"; }
  function updateJackpotNote() {
    $("cz-jp").textContent = "the jackpot starts at " + pct(JACKPOT) + " and gets less likely the more yeonbucks you have. right now it's " + pct(jackpotChance(balance())) + ".";
  }

  const fmt = (n) => String(n);

  function refresh() {
    balEl.textContent = fmt(shown());
    document.querySelectorAll("[data-earn]").forEach((el) => { el.textContent = earnAmt(); });   // the "+50" in the text (75 with the boost)
    document.querySelectorAll("[data-yb]").forEach((el) => { el.textContent = fmt(shown()); });   // "you have ___ yeonbucks" boxes on other pages
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
    add: (n) => { setBalance(balance() + Math.max(0, Math.floor(n))); refresh(); updateBox(); },   // prizes from the other games
  };

  function readBet() {
    let b = Math.floor(Number(betEl.value) / BET_STEP) * BET_STEP;
    if (!Number.isFinite(b) || b < BET_STEP) b = BET_STEP;
    return b;
  }
  $("cz-quick").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const v = b.dataset.bet === "max" ? Math.floor(balance() / BET_STEP) * BET_STEP : Number(b.dataset.bet);
    betEl.value = Math.max(BET_STEP, v);
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
    betEl.value = bet;
    if (bet > balance()) { say("you only have " + fmt(balance()) + " yeonbucks. try a smaller bet.", "cz-bad"); return; }

    // decide the result first, and settle the money straight away (so refreshing can't cheat)
    const result = pickResult();
    const win = Math.round(bet * result);                    // (0.5x of an odd bet rounds up, so 5 yeonbucks pays back 3)
    spinning = true;
    spinBtn.disabled = true;
    setBalance(balance() - bet + win);
    holdSet(win);                                             // every tab shows the balance after the bet, before the prize arrives
    refresh();
    say("spinning...");
    cells.forEach((c) => c.classList.remove("cz-win", "cz-pair"));
    grid.classList.remove("cz-jackpot");

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
      say("jackpot! all nine match! you won " + fmt(win) + " yeonbucks!");
      await flash(() => grid.classList.toggle("cz-jackpot"), 7);
      grid.classList.add("cz-jackpot");
    } else if (result === 5) {
      // two lines: they flash, then stay lit
      say("two lines! 5x: you won " + fmt(win) + " yeonbucks!");
      await flash(() => won.forEach((c) => c.classList.toggle("cz-win")), 5);
      won.forEach((c) => c.classList.add("cz-win"));
    } else if (result === 1) {
      // three in a row: lit up and steady
      won.forEach((c) => c.classList.add("cz-win"));
      say("three in a row! 1x: you got your " + fmt(bet) + " back.");
    } else if (result === 0.5) {
      // two in a row: the pair gets a dashed outline
      won.forEach((c) => c.classList.add("cz-pair"));
      say("two in a row! 0.5x: you got half back (" + fmt(win) + ").");
    } else {
      say("no matches. you lost " + fmt(bet) + " yeonbucks.", "cz-bad");
    }
    spinning = false;
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
  const lbList = $("cz-lb-list"), lbMe = $("cz-lb-me"), lbNote = $("cz-lb-note"), lbName = $("cz-lb-name");
  const lbForm = $("cz-lb-form"), lbRemove = $("cz-lb-remove"), lbEdit = $("cz-lb-edit"), lbSave = $("cz-lb-save");
  const LB_ROWS = 5;                                   // how many people the little box shows
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
  // send my balance (only if I joined, and only when it changed; at most every 8 seconds)
  async function sendScore(force) {
    if (sending || !myName()) return;
    const bal = shown();
    if (!force && (bal === lastSent || Date.now() - lastSentAt < 8000)) return;
    sending = true;
    try {
      await lbApi("cz_submit", { p_id: myId(), p_name: myName(), p_balance: bal });
      lastSent = bal; lastSentAt = Date.now();
    } catch (e) { lastSentAt = Date.now(); } finally { sending = false; }
  }
  setInterval(() => { if (!spinning) sendScore(false); }, 3000);

  function drawBoard(data) {
    lbList.innerHTML = "";
    const top = ((data && data.top) || []).slice(0, LB_ROWS);
    top.forEach((p, i) => {
      const li = document.createElement("li");
      if (p.me) li.className = "cz-lb-you";
      const rank = document.createElement("span"); rank.className = "cz-lb-rank"; rank.textContent = i + 1;
      const nm = document.createElement("span"); nm.className = "cz-lb-name"; nm.textContent = p.name;
      const bl = document.createElement("span"); bl.className = "cz-lb-bal"; bl.textContent = p.balance;
      li.append(rank, nm, bl);
      lbList.appendChild(li);
    });
    if (!top.length) { const li = document.createElement("li"); li.className = "cz-lb-empty"; li.textContent = "nobody yet!"; lbList.appendChild(li); }
    const me = data && data.me;
    joined = !!me;
    lbMe.textContent = me && !top.some((p) => p.me) ? "you: #" + me.rank + " (" + me.balance + ")" : "";
    lbEdit.textContent = me ? "edit" : "join";
    lbSave.textContent = me ? "save" : "join";
    lbRemove.hidden = !me;
  }
  async function loadBoard() {
    try {
      const data = await lbApi("cz_board", { p_id: myId() });
      drawBoard(data); lbNote.textContent = "";
      write("yb-board", JSON.stringify(data));          // remembered, so next time the box fills in instantly
    } catch (e) {
      if (lbList.children.length) return;               // keep showing the last list if the internet blips
      lbNote.textContent = /not configured/.test(String(e.message)) ? "not connected yet" : "can't load. did you run supabase-casino.sql?";
    }
  }
  const page = document.querySelector('.page[data-page="casino"]');
  function lbTick() { if (page && page.classList.contains("active") && document.visibilityState === "visible") loadBoard(); }
  setInterval(lbTick, 10000);
  window.addEventListener("hashchange", () => setTimeout(lbTick, 50));
  document.addEventListener("visibilitychange", lbTick);

  function showForm(on) { lbForm.hidden = !on; lbEdit.hidden = on; if (on) { lbName.value = myName(); lbName.focus({ preventScroll: true }); } }
  lbEdit.addEventListener("click", () => showForm(true));
  $("cz-lb-cancel").addEventListener("click", () => { showForm(false); lbNote.textContent = ""; });
  lbForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const n = lbName.value.trim().slice(0, 20);
    if (!n) { lbNote.textContent = "type a name first"; return; }
    write("yb-name", n);
    lbNote.textContent = "saving...";
    await sendScore(true);
    await loadBoard();
    showForm(false);
  });
  lbRemove.addEventListener("click", async () => {
    try { await lbApi("cz_remove", { p_id: myId() }); } catch (e) {}
    write("yb-name", ""); lastSent = null;
    await loadBoard();
    showForm(false);
    lbNote.textContent = "you're off the board";
  });
  // show the last list we saved straight away, then fetch a fresh one as soon as every script has loaded
  // (the address in community-config.js loads after this file, so asking any sooner says "not connected")
  try { const saved = JSON.parse(read("yb-board")); if (saved && saved.top) drawBoard(saved); } catch (e) {}
  if (!lbList.children.length) lbNote.textContent = "loading...";
  if (document.readyState === "complete") lbTick(); else window.addEventListener("load", lbTick);

  spinBtn.addEventListener("click", spin);
  betEl.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); spin(); } });

  // the machine starts on a mixed-up grid
  makeGrid(0).forEach((n, i) => paint(cells[i], n));
  refresh();
})();