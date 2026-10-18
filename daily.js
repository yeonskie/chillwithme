// ---------- Daily reward: log in on consecutive days and the reward grows ----------
// The button is on the home page under "randomize my stay".
//
// TO CHANGE THE REWARDS, edit the list DAILY below. One entry per day of the cycle:
//   { yb: 300 }                              yeonbucks only
//   { yb: 500, gift: "pet-hamster" }         yeonbucks AND a gift. "gift" is an item id from the ITEMS list in shop.js
//                                            (put daily: true on that item so it's never sold, only given here).
// There are 30 days, about a month. When someone gets to the last day, the cycle starts over from day 1.
// If they miss a day, they start again at day 1.

(function () {
  const DAILY = [
    { yb: 500 },
    { yb: 750 },
    { yb: 1000 },
    { yb: 2000 },
    { yb: 3000 },
    { yb: 3500 },
    { yb: 4000 },   // day 7
    { yb: 4500 },
    { yb: 5000 },
    { yb: 6000 },
    { yb: 6500 },
    { yb: 7000 },
    { yb: 7500 },
    { yb: 8000 },   // day 14
    { yb: 9000 },
    { yb: 9500 },
    { yb: 10000 },
    { yb: 11000 },
    { yb: 12000 },
    { yb: 13000 },
    { yb: 14000 },   // day 21
    { yb: 15000 },
    { yb: 16000 },
    { yb: 17000 },
    { yb: 18000 },
    { yb: 20000 },
    { yb: 22000 },
    { yb: 25000 },   // day 28
    { yb: 30000 },
    { yb: 50000 },   // day 30
  ];

  const KEY = "yb-login";                                // (not "yb-daily": the secret room already uses that one)
  const $ = (id) => document.getElementById(id);
  const btn = $("home-daily"), dot = $("home-daily-dot"), pop = $("daily");
  if (!btn || !pop) return;
  const memory = {};
  const read = (k) => { try { const v = localStorage.getItem(k); return v === null ? memory[k] : v; } catch (e) { return memory[k]; } };
  const write = (k, v) => { memory[k] = String(v); try { localStorage.setItem(k, String(v)); } catch (e) {} };

  const dayKey = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const today = () => dayKey(new Date());
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };

  function load() {
    try { const s = JSON.parse(read(KEY)); if (s && typeof s.last === "string") return { last: s.last, streak: Math.max(0, Math.floor(s.streak) || 0) }; } catch (e) {}
    return { last: "", streak: 0 };
  }
  // where the player is right now: which day of the cycle they would claim next (or just claimed)
  function status() {
    const s = load(), t = today();
    if (s.last === t) return { claimed: true, streak: s.streak, day: ((s.streak - 1) % DAILY.length) + 1, next: (s.streak % DAILY.length) + 1 };
    const missed = !!s.last && s.last !== yesterday() && s.streak > 1;
    const rescue = missed && window.YBItems && window.YBItems.count("rescue") > 0;       // a streak rescue (from the lost and found) saves the streak
    const streak = s.last === yesterday() || rescue ? s.streak + 1 : 1;
    return { claimed: false, streak, day: ((streak - 1) % DAILY.length) + 1, broken: missed && !rescue, rescue: !!rescue, was: s.streak };
  }

  const giftName = (id) => (window.YBShop && window.YBShop.nameOf ? window.YBShop.nameOf(id) : id);
  const fmt = (n) => Number(n).toLocaleString("en-US");

  function drawDot() { const st = status(); dot.hidden = st.claimed; }

  let popFrom = null;
  function draw(extraNote) {
    const st = status();
    const grid = $("dl-grid");
    grid.innerHTML = "";
    DAILY.forEach((r, i) => {
      const n = i + 1;
      const li = document.createElement("li");
      const done = st.claimed ? n <= st.day : n < st.day;
      const now = !st.claimed && n === st.day;
      li.className = "dl-day" + (done ? " dl-done" : "") + (now ? " dl-now" : "");
      const num = document.createElement("span"); num.className = "dl-n"; num.textContent = "day " + n;
      const amt = document.createElement("span"); amt.className = "dl-amt"; amt.textContent = fmt(r.yb);
      li.append(num, amt);
      if (r.gift) { const g = document.createElement("span"); g.className = "dl-gift"; g.textContent = "+ " + giftName(r.gift); li.appendChild(g); }
      if (done) { const c = document.createElement("span"); c.className = "dl-check"; c.setAttribute("aria-hidden", "true"); c.textContent = "✓"; li.appendChild(c); }
      grid.appendChild(li);
    });
    const claim = $("dl-claim");
    claim.disabled = st.claimed;
    if (st.claimed) {
      claim.textContent = "come back tomorrow";
      $("dl-sub").textContent = "day " + st.day + " claimed. a " + st.streak + "-day streak! tomorrow is " + fmt(DAILY[st.next - 1].yb) + " yeonbucks.";
    } else {
      const r = DAILY[st.day - 1];
      claim.textContent = "claim " + fmt(r.yb) + (r.gift ? " + gift" : "");
      $("dl-sub").textContent = st.rescue ? "you missed a day, but a streak rescue will save your " + st.was + "-day streak when you claim!" : st.broken ? "you missed a day, so the streak starts over. today is day 1." : (st.day === 1 ? "log in every day and the rewards get bigger." : "day " + st.day + ". keep the streak going!");
    }
    $("dl-note").textContent = extraNote || "";
    const now = grid.querySelector(".dl-now");
    if (now && now.scrollIntoView) now.scrollIntoView({ block: "nearest" });
  }

  function claim() {
    const st = status();
    if (st.claimed) return;
    const r = DAILY[st.day - 1];
    write(KEY, JSON.stringify({ last: today(), streak: st.streak }));
    if (st.rescue) window.YBItems.use("rescue");
    if (window.YB) window.YB.add(r.yb);
    let note = (st.rescue ? "streak rescued! " : "") + "+" + fmt(r.yb) + " yeonbucks!";
    if (r.gift && window.YBShop) {
      const got = window.YBShop.give(r.gift, true);
      note += got ? " and you got " + giftName(r.gift) + "!" : " (you already own " + giftName(r.gift) + ")";
    }
    drawDot();
    draw(note);
  }

  function open(from) { draw(""); pop.hidden = false; popFrom = from || null; $("dl-close").focus(); }
  function close() { if (pop.hidden) return; pop.hidden = true; if (popFrom && document.contains(popFrom)) popFrom.focus(); popFrom = null; }

  btn.addEventListener("click", () => open(btn));
  $("dl-claim").addEventListener("click", claim);
  $("dl-close").addEventListener("click", close);
  pop.addEventListener("click", (e) => { if (e.target === pop) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  window.addEventListener("hashchange", close);
  drawDot();
  setInterval(drawDot, 60000);                          // flips to "ready" after midnight
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") drawDot(); });
})();