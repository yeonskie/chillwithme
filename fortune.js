// ---------- THE FORTUNE TELLER (secret room, dot 5) ----------
// One reading a day. Three face-down tarot cards (love, fortune, luck): pick one and it flips to show a fortune.
// Come back the same day and you see the same fortune. Every fortune you get is saved in "my fortunes".
//
// TO CHANGE THE FORTUNES, edit the lists in FORTUNES below. Each one is either just the words:
//     "a soft hello is coming your way."
// or the words plus a reward (you can add either or both):
//     { t: "you will find a coin today.", yb: 500 }
// IMPORTANT: add new fortunes at the END of a list, and don't reorder or delete old ones, because each person's
// "my fortunes" list remembers a fortune by its place in the list. (Fixing a typo in the words is fine.)
// A reading picks a fortune you haven't had yet when there are any left, so people see new ones first.
//
// Remembered in this browser: "yb-fortune" (today's reading) and "yb-fortunes" (every fortune received).

(function () {
  const FORTUNES = {
    love: [
      "someone is thinking about you right now. (they won't say.)",
      "a soft hello is coming your way.",
      "you are the main character in someone's favorite story.",
      "be kind to yourself first. love follows.",
      "a crush is closer than you think.",
      "your next hug will be a really good one.",
      "someone saved your message. they read it twice.",
      "the right person won't make you guess.",
      "you are easier to love than you think.",
      "text them. the worst they can say is nothing.",
      "an old friend is about to reach out.",
      "love is in the small things today: a snack, a song, a wave.",
      "you will make someone smile without trying.",
      "romance is a slow burn. enjoy the warmth.",
      "you're someone's lucky day.",
      "a stranger will be unexpectedly sweet to you.",
      "open your heart a crack. just a crack.",
      "your people are looking for you too.",
      "tell someone you love them today. say it plainly.",
      "you are loved more than your brain admits.",
    ],
    fortune: [
      "a small decision today will matter later. choose gently.",
      "the thing you're putting off is lighter than it looks.",
      "good news is on its way, slowly, like a snail with a letter.",
      "you will find what you were looking for right after you stop.",
      "a new door opens soon. no need to knock.",
      "rest is also progress.",
      "your future self says thank you.",
      "what feels like the end is just a chapter break.",
      "the idea you keep avoiding is the right one.",
      "patience will pay off. probably with interest.",
      "someone will ask for your advice. trust yourself.",
      "the path is unclear, but your feet know the way.",
      "a quiet day will turn into a good memory.",
      "you're closer than you were yesterday.",
      "say yes to the invitation you almost decline.",
      "change is coming. wear comfortable shoes.",
      "you will learn something unexpected today.",
      "the storm passes. it always does.",
      "your hard work is being noticed.",
      "today's small step is tomorrow's big leap.",
    ],
    luck: [
      "today is a good day to try your luck.",
      "you will find something small and shiny.",
      "the next coin you see is a lucky one.",
      "green lights all the way home.",
      "the universe is rooting for you. (loudly.)",
      "a lucky number is following you. it's probably 7.",
      "your toast will land butter side up.",
      "something you lost will turn up.",
      "luck favors the curious. poke around.",
      "expect a pleasant surprise before dinner.",
      "you'll be in the right place at the right time.",
      "the line you pick will move fastest.",
      "a four-leaf clover is hiding nearby.",
      "wish on the next star you see. it's listening.",
      "your luck is warming up. stay tuned.",
      "a rat will cross your path. good luck. (hi remy.)",
      "you will win a small argument today. be humble.",
      "free snack energy today.",
      "the wheel might surprise you. give it a spin.",
      "luck is on your side, and also behind you, giving you a little push.",
    ],
  };
  const CATS = ["love", "fortune", "luck"];                       // the three cards, left to right
  const TOTAL = CATS.reduce((a, c) => a + FORTUNES[c].length, 0);

  const $ = (id) => document.getElementById(id);
  const ov = $("fortune"), cardsEl = $("ft-cards"), revealEl = $("ft-reveal"), subEl = $("ft-sub"), bookBtn = $("ft-book");
  const bookOv = $("fortune-book"), bookBody = $("ft-book-body"), bookTitle = $("ft-book-title");
  if (!ov || !cardsEl) return;

  // ----- what's remembered -----
  const memory = {};
  const read = (k) => { try { return localStorage.getItem(k); } catch (e) { return memory[k]; } };      // (the memory copy is only used when the browser won't let the site save)
  const write = (k, v) => { memory[k] = String(v); try { localStorage.setItem(k, String(v)); } catch (e) {} };
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };   // their own calendar day: resets at their midnight
  const textOf = (f) => (typeof f === "string" ? f : f.t);
  const rewardOf = (f) => (typeof f === "string" ? 0 : Number(f.yb) || 0);
  function reading() {
    try { const r = JSON.parse(read("yb-fortune")); if (r && r.day === today() && FORTUNES[r.cat] && FORTUNES[r.cat][r.idx] !== undefined) return r; } catch (e) {}
    return null;
  }
  function received() {
    try { const a = JSON.parse(read("yb-fortunes")); if (Array.isArray(a)) return a; } catch (e) {}
    return [];
  }
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // ----- the drawings: a card back, and one little symbol for each card -----
  const BACK = '<svg viewBox="0 0 100 150" aria-hidden="true" focusable="false"><rect x="4" y="4" width="92" height="142" rx="3" style="fill:var(--bg)" stroke="currentColor" stroke-width="1.5"/><rect x="11" y="11" width="78" height="128" rx="2" fill="none" stroke="currentColor" stroke-width="1"/>' +
    '<path d="M50 52l5.5 15.5L71 73l-15.5 5.5L50 94l-5.5-15.5L29 73l15.5-5.5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<path d="M38 112a12 12 0 1 0 12 12 9 9 0 0 1-12-12z" fill="none" stroke="currentColor" stroke-width="1.2"/>' +
    '<circle cx="68" cy="30" r="1.6" fill="currentColor"/><circle cx="30" cy="34" r="1.2" fill="currentColor"/><circle cx="74" cy="118" r="1.2" fill="currentColor"/><circle cx="26" cy="96" r="1" fill="currentColor"/></svg>';
  const SYMBOL = {
    love: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 21s-7.5-4.6-9.8-9.2C.6 8.6 2.4 4.5 6.2 4.3c2.2-.1 4.1 1.1 5.8 3.2 1.7-2.1 3.6-3.3 5.8-3.2 3.8.2 5.6 4.3 4 7.5C19.5 16.4 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    fortune: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.5l2.4 6.7 6.7 2.4-6.7 2.4L12 20.7l-2.4-6.7L2.9 11.6l6.7-2.4z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    luck: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><circle cx="8.6" cy="8.6" r="4.2"/><circle cx="15.4" cy="8.6" r="4.2"/><circle cx="8.6" cy="15.4" r="4.2"/><circle cx="15.4" cy="15.4" r="4.2"/><path d="M12 12l5.5 9.5" stroke-linecap="round"/></g></svg>',
  };

  // ----- the reading -----
  function draw(cat) {
    const pool = FORTUNES[cat];
    const have = received();
    const fresh = pool.map((f, i) => i).filter((i) => have.indexOf(cat + ":" + i) === -1);
    const choices = fresh.length ? fresh : pool.map((f, i) => i);          // new ones first; once you've had them all, anything
    const idx = choices[Math.floor(Math.random() * choices.length)];
    write("yb-fortune", JSON.stringify({ day: today(), cat: cat, idx: idx }));
    if (have.indexOf(cat + ":" + idx) === -1) { have.push(cat + ":" + idx); write("yb-fortunes", JSON.stringify(have)); }
    const yb = rewardOf(pool[idx]);
    if (yb && window.YB && window.YB.add) window.YB.add(yb);
    return { day: today(), cat: cat, idx: idx };
  }

  function faceHTML(cat, idx) {
    const f = FORTUNES[cat][idx], yb = rewardOf(f);
    return '<span class="ft-sym">' + SYMBOL[cat] + '</span><span class="ft-cat">' + cat + '</span><span class="ft-text"></span>' + (yb ? '<span class="ft-yb">+' + fmt(yb) + " yeonbucks</span>" : "");
  }
  function showReveal(r, animate) {
    cardsEl.hidden = true;
    revealEl.hidden = false;
    revealEl.innerHTML = '<div class="ft-flip' + (animate ? "" : " is-flipped") + '"><div class="ft-face ft-back">' + BACK + '</div><div class="ft-face ft-front">' + faceHTML(r.cat, r.idx) + "</div></div>";
    revealEl.querySelector(".ft-text").textContent = textOf(FORTUNES[r.cat][r.idx]);
    const flip = revealEl.querySelector(".ft-flip");
    if (animate) setTimeout(() => flip.classList.add("is-flipped"), 120);
  }
  function showPick() {
    revealEl.hidden = true;
    cardsEl.hidden = false;
    cardsEl.innerHTML = "";
    CATS.forEach((cat) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ft-pick";
      b.setAttribute("aria-label", cat + " card");
      b.innerHTML = '<span class="ft-back-art">' + BACK + '</span><span class="ft-pick-name">' + cat + "</span>";
      b.addEventListener("click", () => { const r = draw(cat); drawState(); showReveal(r, true); });
      cardsEl.appendChild(b);
    });
  }
  function drawState() {
    const r = reading();
    bookBtn.textContent = "my fortunes (" + received().length + "/" + TOTAL + ")";
    subEl.textContent = r ? "today's reading. come back tomorrow for another!" : "pick a card. one reading a day.";
  }

  function open() {
    drawState();
    const r = reading();
    if (r) showReveal(r, false); else showPick();
    ov.hidden = false;
    $("ft-close").focus();
  }
  function close() { ov.hidden = true; }
  $("ft-close").addEventListener("click", close);
  ov.addEventListener("click", (e) => { if (e.target === ov) close(); });

  // ----- my fortunes -----
  function openBook() {
    const have = received();
    bookTitle.textContent = "my fortunes (" + have.length + "/" + TOTAL + ")";
    bookBody.innerHTML = "";
    CATS.forEach((cat) => {
      const h = document.createElement("h3");
      const got = FORTUNES[cat].filter((f, i) => have.indexOf(cat + ":" + i) !== -1).length;
      h.textContent = cat + " (" + got + "/" + FORTUNES[cat].length + ")";
      const ul = document.createElement("ul");
      ul.className = "ft-list";
      FORTUNES[cat].forEach((f, i) => {
        if (have.indexOf(cat + ":" + i) === -1) return;       // only the ones you've received
        const li = document.createElement("li");
        li.textContent = textOf(f);
        ul.appendChild(li);
      });
      const left = FORTUNES[cat].length - got;
      const li = document.createElement("li");
      li.className = "ft-locked";
      li.textContent = left ? (got ? left + " more to find" : "none yet. " + left + " to find") : "you found them all!";
      ul.appendChild(li);
      bookBody.append(h, ul);
    });
    bookOv.hidden = false;
    $("ft-book-close").focus();
  }
  function closeBook() { bookOv.hidden = true; }
  bookBtn.addEventListener("click", openBook);
  $("ft-book-close").addEventListener("click", closeBook);
  bookOv.addEventListener("click", (e) => { if (e.target === bookOv) closeBook(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (!bookOv.hidden) closeBook(); else close(); } });
  window.addEventListener("hashchange", () => { close(); closeBook(); });

  window.Fortune = { open: open };
})();