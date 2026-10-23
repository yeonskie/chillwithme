// ---------- Scattergories (multiplayer) ----------
// How it works: one person makes a room and gets a 4-letter code. Friends join with the code.
// Everyone gets the same letter and the same categories, types an answer for each one before the
// timer runs out, then the answers are shown side by side and scored:
//   - an answer nobody else had = 10 points
//   - the same answer as someone else = 5 points
//   - blank, or doesn't start with the letter = 0
// The host can tap any answer to throw it out (or let one through that the game rejected).
//
// Rooms live in Supabase (see supabase-scattergories.sql). The game checks for news every
// 1.5 seconds, so there's nothing to keep open or connect. If you want to change the game:
//   CATEGORY_POOL = the categories the shuffle picks from
//   LETTERS       = the letters that can come up (no Q, U, V, X, Y, Z: too hard)
//   POINTS_ALONE / POINTS_SHARED = the scoring
//   WIN_PRIZE     = yeonbucks the winner gets (a tie: everyone tied gets it). Needs 2 or more players, so you can't win alone.

(function () {
  const $ = (id) => document.getElementById(id);
  if (!$("sg-join")) return;

  const CATEGORY_POOL = [
    "a girl's name", "a boy's name", "a country", "a city", "an animal", "a food", "a fruit or vegetable",
    "a drink", "a movie", "a tv show", "a song", "a band or singer", "a k-pop group", "a k-pop idol",
    "a kdrama", "a celebrity", "a cartoon character", "a job", "something in a kitchen",
    "something in a bedroom", "something in a bathroom", "something you wear", "a brand", "a restaurant",
    "a candy or snack", "a sport", "a school subject", "a hobby", "a color", "a thing that's round",
    "a thing that's sticky", "a thing that's cold", "something you'd find at the beach", "a type of weather",
    "a hairstyle", "a flower or plant", "a book", "a video game", "an app", "a school supply",
    "something you'd pack for a trip", "an instrument", "a superhero or villain", "a reason to be late",
    "something that's red", "a thing you shouldn't touch", "a pet name", "a dessert", "a body part",
    "something scary", "a famous place",
  ];
  const LETTERS = "ABCDEFGHIJKLMNOPRSTW";
  const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";      // no I or O, they look like 1 and 0
  // The address of your live site, used for invite links, e.g. "https://yeonskie.github.io/chillwithme/"
  // Leave it as "" to use whatever address the page is on.
  const SITE_URL = "https://yeonskie.github.io/chillwithme/";
  const START_CATEGORIES = 8;
  const POINTS_ALONE = 10, POINTS_SHARED = 5;
  const WIN_PRIZE = 5000;                              // yeonbucks for winning a game
  const POLL_MS = 1500;
  const STOP_SECS = 8;                                 // after someone hits "i'm done", everyone gets this long
  const AWAY_MS = 30000;                               // quiet for this long = shown as "away"

  const cfg = typeof COMMUNITY !== "undefined" ? COMMUNITY : {};
  const BASE = String(cfg.url || "").trim().replace(/\/+$/, "");
  const KEY = String(cfg.key || "").trim();
  const configured = /^https:\/\/[^\s/]+/i.test(BASE) && KEY.length > 20;

  const PANELS = ["sg-join", "sg-lobby", "sg-play", "sg-reveal", "sg-done"];

  // ----- who am I (remembered in this browser) -----
  let me = { id: "", name: "" };
  try { me = JSON.parse(localStorage.getItem("sg-me")) || me; } catch (e) {}
  if (!me.id) me.id = "p" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  function saveMe() { try { localStorage.setItem("sg-me", JSON.stringify(me)); } catch (e) {} }
  function rememberRoom(c) { try { if (c) sessionStorage.setItem("sg-room", c); else sessionStorage.removeItem("sg-room"); } catch (e) {} }

  let code = null;            // the room I'm in
  let st = null;              // the latest news: { now, room, players }
  let offset = 0;             // my clock vs the database's clock
  let polling = false;
  let lastPing = 0;
  let builtKey = "";          // which round the answer boxes were built for
  let flushed = false;
  let called = false;         // true once I hit "i'm done" this round
  let lastReveal = 0;
  let sig = "";               // what the reveal screen currently shows
  let myAnswers = {};         // { "1": [...], "2": [...] }
  let saveTimer = null;

  const note = $("sg-note");
  function say(text) { note.textContent = text || ""; }

  // ----- talking to Supabase -----
  async function api(path, options) {
    const headers = { apikey: KEY, "Content-Type": "application/json", ...((options && options.headers) || {}) };
    if (/^eyJ/.test(KEY)) headers.Authorization = "Bearer " + KEY;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000);
    try {
      const res = await fetch(BASE + path, { ...options, headers, signal: ctl.signal });
      if (!res.ok) {
        let why = "";
        try { const j = await res.json(); why = j.message || j.error || ""; } catch (e) {}
        const err = new Error(res.status + (why ? ": " + why : ""));
        err.status = res.status;
        throw err;
      }
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    } finally {
      clearTimeout(timer);
    }
  }
  const rpc = (name, args) => api("/rest/v1/rpc/" + name, { method: "POST", body: JSON.stringify(args || {}) });
  const enc = encodeURIComponent;

  function explain(e) {
    const m = String((e && e.message) || e);
    if (/sg_|schema cache|relation|404/.test(m) && !/Failed to fetch/.test(m)) return "the scattergories tables aren't set up yet. run supabase-scattergories.sql in Supabase.";
    return "couldn't reach the game. check your internet and try again.";
  }

  // ----- little helpers -----
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function show(id) {
    PANELS.forEach((p) => { $(p).hidden = p !== id; });
    $("sg-leave").hidden = id === "sg-join";               // "leave game" shows whenever you're in a room
  }
  const serverNow = () => Date.now() + offset;
  function playerIsActive(p) { return Date.parse(st.now) - Date.parse(p.seen_at) < AWAY_MS; }
  // the host is whoever made the room. if they've gone quiet the longest-standing player takes over
  function hostId() {
    const room = st.room, ps = st.players;
    const h = ps.find((p) => p.id === room.host_id);
    if (h && playerIsActive(h)) return room.host_id;
    const next = ps.find(playerIsActive);
    return next ? next.id : room.host_id;
  }
  const isHost = () => st && st.room && hostId() === me.id;
  function pickCategories(n, avoid) {
    const pool = CATEGORY_POOL.filter((c) => !avoid || !avoid.includes(c));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return pool.slice(0, n);
  }

  // ----- scoring -----
  function strip(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function norm(s) { return strip(s).replace(/^\s*(the|a|an)\s+/, "").replace(/[^a-z0-9]/g, ""); }
  function firstChar(s) { const m = s.match(/[a-z0-9]/); return m ? m[0] : ""; }
  function startsRight(s, letter) {
    const raw = strip(s), l = letter.toLowerCase();
    return firstChar(raw) === l || firstChar(raw.replace(/^\s*(the|a|an)\s+/, "")) === l;
  }

  // works out every cell of one round: { cats: [ { name, cells: [ {player, text, pts, why, key} ] } ] }
  function scoreRound(room, players, r, letter) {
    const cats = room.categories.map((name, ci) => {
      const cells = players.map((p) => {
        const text = String(((p.answers || {})[r] || [])[ci] || "").trim();
        const key = r + ":" + ci + ":" + p.id;
        const rule = (room.vetoes || {})[key];                 // "no" = thrown out, "yes" = let through
        const letterOk = text ? startsRight(text, letter) : false;
        let valid = !!text && letterOk;
        let why = "";
        if (text && !letterOk) why = "doesn't start with " + letter;
        if (text && rule === "no") { valid = false; why = "thrown out"; }
        if (text && rule === "yes") { valid = true; why = ""; }
        return { player: p, text, valid, why, key, rule };
      });
      const counts = {};
      cells.forEach((c) => { if (c.valid) { const n = norm(c.text); counts[n] = (counts[n] || 0) + 1; } });
      cells.forEach((c) => {
        c.pts = !c.valid ? 0 : counts[norm(c.text)] > 1 ? POINTS_SHARED : POINTS_ALONE;
        c.shared = c.valid && counts[norm(c.text)] > 1;
      });
      return { name, cells };
    });
    return cats;
  }

  // totals up to (and including) round `upTo`. the letter of each round is only known for the current one,
  // so earlier rounds are remembered as they're played (see roundLetters)
  function totals(room, players) {
    const out = {};
    players.forEach((p) => { out[p.id] = { total: 0, last: 0 }; });
    for (let r = 1; r <= room.round; r++) {
      const letter = room.used.charAt(r - 1);       // "used" holds each round's letter, in order
      if (!letter) continue;
      const cats = scoreRound(room, players, r, letter);
      cats.forEach((c) => c.cells.forEach((cell) => {
        out[cell.player.id].total += cell.pts;
        if (r === room.round) out[cell.player.id].last += cell.pts;
      }));
    }
    return out;
  }

  // ----- joining and leaving -----
  async function addMe(c) {
    await api("/rest/v1/sg_players?on_conflict=room,id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ room: c, id: me.id, name: me.name, seen_at: new Date().toISOString() }),
    });
  }

  function takeName() {
    const name = $("sg-name").value.replace(/\s+/g, " ").trim().slice(0, 20);
    if (!name) { say("type your name first."); $("sg-name").focus(); return null; }
    me.name = name;
    saveMe();
    return name;
  }

  function enterRoom(c) {
    code = c;
    rememberRoom(c);
    st = null; builtKey = ""; sig = ""; flushed = false; myAnswers = {};
    say("");
    poll();
  }

  async function createRoom() {
    if (!takeName()) return;
    $("sg-create").disabled = true;
    try {
      try { await rpc("sg_cleanup"); } catch (e) {}
      for (let i = 0; i < 6; i++) {
        let c = "";
        for (let k = 0; k < 4; k++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
        try {
          await api("/rest/v1/sg_rooms", {
            method: "POST",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({ code: c, host_id: me.id, categories: pickCategories(START_CATEGORIES) }),
          });
        } catch (e) {
          if (e.status === 409) continue;                       // that code is taken, try another
          throw e;
        }
        await addMe(c);
        enterRoom(c);
        return;
      }
      say("couldn't make a room. try again.");
    } catch (e) {
      say(explain(e));
    } finally {
      $("sg-create").disabled = false;
    }
  }

  async function joinRoom(c) {
    if (!takeName()) return;
    c = String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (c.length < 4) { say("type the room code."); $("sg-code").focus(); return; }
    try {
      const s = await rpc("sg_state", { p_code: c });
      if (!s || !s.room) { say("can't find a room with that code."); return; }
      const already = s.players.some((p) => p.id === me.id);
      if (s.room.status !== "lobby" && !already) { say("that game has already started."); return; }
      if (s.players.length >= 12 && !already) { say("that room is full."); return; }
      await addMe(c);
      enterRoom(c);
    } catch (e) {
      say(explain(e));
    }
  }

  function leaveLocal(message) {
    code = null; st = null; builtKey = ""; sig = "";
    rememberRoom(null);
    show("sg-join");
    say(message || "");
  }

  async function leaveRoom() {
    const c = code;
    leaveLocal("");
    try { await api("/rest/v1/sg_players?room=eq." + enc(c) + "&id=eq." + enc(me.id), { method: "DELETE" }); } catch (e) {}
  }

  // ----- the loop that checks for news -----
  async function poll() {
    if (!code || polling || location.hash !== "#scattergories") return;
    polling = true;
    try {
      const t0 = Date.now();
      const s = await rpc("sg_state", { p_code: code });
      const t1 = Date.now();
      if (!s || !s.room) { leaveLocal("that room is gone."); return; }
      offset = Date.parse(s.now) - (t0 + t1) / 2;
      const mine = s.players.find((p) => p.id === me.id);
      if (!mine) {
        if (s.room.status === "lobby") { await addMe(code); polling = false; return poll(); }
        leaveLocal("you're not in that game anymore.");
        return;
      }
      if (!Object.keys(myAnswers).length && mine.answers) myAnswers = mine.answers;
      st = s;
      if (Date.now() - lastPing > 10000) { lastPing = Date.now(); rpc("sg_ping", { p_code: code, p_id: me.id }).catch(() => {}); }
      render();
    } catch (e) {
      say(explain(e));
    } finally {
      polling = false;
    }
  }
  setInterval(poll, POLL_MS);
  window.addEventListener("hashchange", () => { if (location.hash === "#scattergories") poll(); });

  // ----- drawing the right screen -----
  function render() {
    const room = st.room;
    if (note.textContent && !/^(type|can't|that|you're)/.test(note.textContent)) say("");
    if (room.status !== "done") { try { localStorage.removeItem("yb-sg-paid"); } catch (e) {} }   // a new game can pay out again
    if (room.status === "lobby") renderLobby();
    else if (room.status === "playing") renderPlay();
    else if (room.status === "reveal") renderReveal();
    else renderDone();
  }

  function renderLobby() {
    show("sg-lobby");
    const room = st.room, host = isHost(), hid = hostId();
    $("sg-lobby-code").textContent = room.code;

    const list = $("sg-lobby-players");
    list.textContent = "";
    st.players.forEach((p) => {
      const li = el("li", "sg-player", p.name + (p.id === me.id ? " (you)" : ""));
      if (p.id === hid) li.appendChild(el("span", "sg-tag", "host"));
      if (!playerIsActive(p)) li.appendChild(el("span", "sg-tag", "away"));
      list.appendChild(li);
    });

    const rs = $("sg-rounds"), ss = $("sg-secs");
    rs.disabled = ss.disabled = !host;
    if (document.activeElement !== rs) rs.value = String(room.rounds);
    if (document.activeElement !== ss) ss.value = String(room.round_secs);
    [$("sg-addcat"), $("sg-shuffle").parentNode, $("sg-start").parentNode].forEach((n) => { n.hidden = !host; });
    $("sg-waithost").hidden = host;

    const ul = $("sg-cats");
    const key = JSON.stringify([room.categories, host]);
    if (ul.dataset.key !== key) {
      ul.dataset.key = key;
      ul.textContent = "";
      room.categories.forEach((c, i) => {
        const li = el("li", "sg-cat");
        li.appendChild(el("span", "", c));
        if (host) {
          const x = el("button", "sg-x", "×");
          x.type = "button";
          x.setAttribute("aria-label", "remove " + c);
          x.dataset.i = i;
          li.appendChild(x);
        }
        ul.appendChild(li);
      });
    }
  }

  function renderPlay() {
    show("sg-play");
    const room = st.room;
    $("sg-roundlabel").textContent = "round " + room.round + " / " + room.rounds;
    $("sg-letter").textContent = room.letter;

    const key = room.code + ":" + room.round;
    if (builtKey !== key) {
      builtKey = key;
      flushed = false;
      called = false;
      const form = $("sg-answers");
      form.textContent = "";
      const saved = myAnswers[room.round] || [];
      room.categories.forEach((c, i) => {
        const row = el("label", "sg-ans");
        row.appendChild(el("span", "sg-ans-cat", (i + 1) + ". " + c));
        const input = document.createElement("input");
        input.type = "text";
        input.maxLength = 40;
        input.autocomplete = "off";
        input.spellcheck = false;
        input.placeholder = room.letter + "...";
        input.dataset.i = i;
        input.value = saved[i] || "";
        row.appendChild(input);
        form.appendChild(row);
      });
      const first = form.querySelector("input");
      if (first) first.focus();
      $("sg-stop").disabled = false;
      $("sg-stopnote").hidden = true;
    }
    tick();
  }

  function collect() {
    return Array.from($("sg-answers").querySelectorAll("input")).map((i) => i.value.trim());
  }
  function saveAnswers() {
    if (!st || !code || !st.room) return Promise.resolve();
    const r = st.room.round;
    myAnswers[r] = collect();
    return api("/rest/v1/sg_players?room=eq." + enc(code) + "&id=eq." + enc(me.id), {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ answers: myAnswers }),
    }).catch(() => {});
  }
  $("sg-answers").addEventListener("input", () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveAnswers, 500);
  });
  $("sg-answers").addEventListener("submit", (e) => e.preventDefault());

  function lock() {
    $("sg-answers").querySelectorAll("input").forEach((i) => { i.disabled = true; });
    $("sg-stop").disabled = true;
  }

  // runs 4 times a second: the countdown, and what to do when it hits zero
  function tick() {
    if (!st || !st.room || st.room.status !== "playing" || !st.room.ends_at) return;
    const left = Date.parse(st.room.ends_at) - serverNow();
    const secs = Math.max(0, Math.ceil(left / 1000));
    const t = $("sg-timer");
    t.textContent = Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0");
    t.classList.toggle("sg-low", secs <= 10);
    const n = $("sg-stopnote");
    n.hidden = !called && !(left > 0 && secs <= STOP_SECS && st.room.round_secs > STOP_SECS + 2);
    n.textContent = called ? "you called time! everyone has a few seconds left." : "time's almost up!";
    if (left <= 0) {
      if (!flushed) { flushed = true; lock(); clearTimeout(saveTimer); saveAnswers(); }
      if (Date.now() - lastReveal > 1000) {
        lastReveal = Date.now();
        rpc("sg_to_reveal", { p_code: code }).then(poll).catch(() => {});
      }
    }
  }
  setInterval(tick, 250);

  $("sg-stop").addEventListener("click", async () => {
    called = true;
    lock();
    flushed = true;
    clearTimeout(saveTimer);
    await saveAnswers();
    try { await rpc("sg_stop", { p_code: code, p_secs: STOP_SECS }); } catch (e) {}
    called = true;
    tick();
    poll();
  });

  function renderReveal() {
    show("sg-reveal");
    const room = st.room, host = isHost();
    $("sg-reveal-label").textContent = "round " + room.round + " / " + room.rounds;
    $("sg-reveal-letter").textContent = room.letter;
    $("sg-reveal-help").textContent = POINTS_SHARED + " points if someone else had the same answer, " + POINTS_ALONE + " if yours was different." +
      (host ? " tap an answer to throw it out (or let it through)." : " the host can throw out answers that don't count.");

    const next = $("sg-next");
    next.hidden = !host;
    next.textContent = room.round >= room.rounds ? "see final scores" : "next round";
    $("sg-waitnext").hidden = host;

    const newSig = JSON.stringify([room.round, room.vetoes, room.categories, host, st.players.map((p) => [p.id, p.name, (p.answers || {})[room.round]])]);
    if (newSig === sig) return;
    sig = newSig;

    const body = $("sg-reveal-body");
    body.textContent = "";
    scoreRound(room, st.players, room.round, room.letter).forEach((cat) => {
      const box = el("div", "sg-cat-result");
      box.appendChild(el("h3", "sg-cat-name", cat.name));
      cat.cells.forEach((c) => {
        const row = el(host ? "button" : "div", "sg-cell" + (c.valid ? "" : " sg-bad") + (c.rule ? " sg-ruled" : ""));
        if (host) { row.type = "button"; row.dataset.key = c.key; row.dataset.rule = c.rule || ""; row.dataset.valid = c.valid ? "1" : ""; row.dataset.text = c.text ? "1" : ""; }
        row.appendChild(el("span", "sg-cell-name", c.player.name));
        row.appendChild(el("span", "sg-cell-text", c.text || "—"));
        const side = c.why ? c.why : c.valid ? "+" + c.pts + (c.shared ? " (same)" : "") : "";
        row.appendChild(el("span", "sg-cell-pts", side));
        box.appendChild(row);
      });
      body.appendChild(box);
    });
    drawScores($("sg-reveal-scores"), true);
  }

  function drawScores(ol, showLast) {
    const t = totals(st.room, st.players);
    const rows = st.players.slice().sort((a, b) => t[b.id].total - t[a.id].total);
    ol.textContent = "";
    rows.forEach((p) => {
      const li = el("li", "sg-score");
      li.appendChild(el("span", "", p.name + (p.id === me.id ? " (you)" : "")));
      const pts = el("span", "sg-score-pts", String(t[p.id].total));
      if (showLast && t[p.id].last) pts.textContent += "  (+" + t[p.id].last + ")";
      li.appendChild(pts);
      ol.appendChild(li);
    });
    return rows.length ? { top: rows[0], tie: rows.filter((p) => t[p.id].total === t[rows[0].id].total) } : null;
  }

  // the host taps an answer: auto-valid -> thrown out, auto-invalid -> let through, tap again to undo
  $("sg-reveal-body").addEventListener("click", async (e) => {
    const row = e.target.closest(".sg-cell");
    if (!row || !row.dataset.key || !isHost() || !row.dataset.text) return;
    const vetoes = { ...(st.room.vetoes || {}) };
    const key = row.dataset.key;
    if (vetoes[key]) delete vetoes[key];
    else vetoes[key] = row.dataset.valid ? "no" : "yes";
    st.room.vetoes = vetoes;
    sig = "";
    renderReveal();
    try {
      await api("/rest/v1/sg_rooms?code=eq." + enc(code), { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ vetoes }) });
    } catch (err) { say(explain(err)); }
  });

  $("sg-next").addEventListener("click", async () => {
    const room = st.room;
    $("sg-next").disabled = true;
    try {
      if (room.round >= room.rounds) {
        await api("/rest/v1/sg_rooms?code=eq." + enc(code), { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "done" }) });
      } else {
        const free = LETTERS.split("").filter((l) => !room.used.includes(l));
        const pool = free.length ? free : LETTERS.split("");
        const letter = pool[Math.floor(Math.random() * pool.length)];
        await rpc("sg_start_round", { p_code: code, p_round: room.round + 1, p_letter: letter, p_used: room.used + letter, p_secs: room.round_secs });
      }
      poll();
    } catch (e) {
      say(explain(e));
    } finally {
      $("sg-next").disabled = false;
    }
  });

  function renderDone() {
    show("sg-done");
    const host = isHost();
    const res = drawScores($("sg-done-scores"), false);
    $("sg-again").hidden = !host;
    $("sg-waitagain").hidden = host;
    if (res) {
      const names = res.tie.map((p) => p.name).join(" and ");
      let text = res.tie.length > 1 ? "it's a tie: " + names + "!" : names + " wins!";
      // the prize: paid once per game, only to the people who won, and only if someone else was playing
      const iWon = res.tie.some((p) => p.id === me.id);
      const t = totals(st.room, st.players);
      if (iWon && st.players.length >= 2 && t[res.top.id].total > 0 && window.YB && window.YB.prize) {
        const gameKey = code + ":" + st.room.used;
        let paid = ""; try { paid = localStorage.getItem("yb-sg-paid") || ""; } catch (e) {}
        let amount = 0;
        if (paid.indexOf(gameKey + "=") === 0) amount = Number(paid.slice(gameKey.length + 1)) || WIN_PRIZE;   // already paid: just remember how much
        else {
          amount = window.YB.prize(WIN_PRIZE);                  // (a bit more with the prize bonus)
          try { localStorage.setItem("yb-sg-paid", gameKey + "=" + amount); } catch (e) {}
        }
        text += " you won " + amount.toLocaleString("en-US") + " yeonbucks!";
      }
      say(text);
    }
  }

  // ----- the lobby buttons -----
  async function patchRoom(body) {
    try {
      await api("/rest/v1/sg_rooms?code=eq." + enc(code), { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(body) });
      poll();
    } catch (e) { say(explain(e)); }
  }
  $("sg-rounds").addEventListener("change", () => patchRoom({ rounds: Number($("sg-rounds").value) }));
  $("sg-secs").addEventListener("change", () => patchRoom({ round_secs: Number($("sg-secs").value) }));
  $("sg-shuffle").addEventListener("click", () => patchRoom({ categories: pickCategories(Math.max(1, st.room.categories.length || START_CATEGORIES)) }));
  $("sg-cats").addEventListener("click", (e) => {
    const x = e.target.closest(".sg-x");
    if (!x || !isHost()) return;
    const cats = st.room.categories.slice();
    cats.splice(Number(x.dataset.i), 1);
    st.room.categories = cats;
    renderLobby();
    patchRoom({ categories: cats });
  });
  $("sg-addcat").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("sg-newcat");
    const v = input.value.replace(/\s+/g, " ").trim().slice(0, 40);
    if (!v || !isHost()) return;
    if (st.room.categories.length >= 16) { say("that's plenty of categories!"); return; }
    if (st.room.categories.some((c) => c.toLowerCase() === v.toLowerCase())) { input.value = ""; return; }
    const cats = st.room.categories.concat(v);
    st.room.categories = cats;
    input.value = "";
    renderLobby();
    patchRoom({ categories: cats });
  });

  $("sg-start").addEventListener("click", async () => {
    if (!isHost()) return;
    if (!st.room.categories.length) { say("add at least one category."); return; }
    $("sg-start").disabled = true;
    try {
      const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
      await api("/rest/v1/sg_rooms?code=eq." + enc(code), { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ vetoes: {}, used: "" }) });
      await rpc("sg_start_round", { p_code: code, p_round: 1, p_letter: letter, p_used: letter, p_secs: st.room.round_secs });
      poll();
    } catch (e) {
      say(explain(e));
    } finally {
      $("sg-start").disabled = false;
    }
  });

  $("sg-again").addEventListener("click", async () => {
    if (!isHost()) return;
    try {
      await api("/rest/v1/sg_players?room=eq." + enc(code), { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ answers: {} }) });
      myAnswers = {};
      await api("/rest/v1/sg_rooms?code=eq." + enc(code), {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "lobby", round: 0, letter: "", used: "", ends_at: null, vetoes: {}, categories: pickCategories(START_CATEGORIES) }),
      });
      say("");
      poll();
    } catch (e) { say(explain(e)); }
  });

  $("sg-leave").addEventListener("click", async () => {
    const midGame = st && st.room && (st.room.status === "playing" || st.room.status === "reveal");
    if (midGame && typeof askConfirm === "function") {
      const yes = await askConfirm("leave the game? your answers and points will be lost.", "leave");
      if (!yes) return;
    }
    leaveRoom();
  });

  // the rules pop-up
  const rules = $("sg-rules");
  function openRules() { rules.hidden = false; rules.querySelector(".gi-dialog-card").scrollTop = 0; $("sg-rules-close").focus({ preventScroll: true }); }
  function closeRules() { rules.hidden = true; $("sg-rules-btn").focus(); }
  $("sg-rules-btn").addEventListener("click", openRules);
  $("sg-rules-close").addEventListener("click", closeRules);
  $("sg-rules-backdrop").addEventListener("click", closeRules);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !rules.hidden) closeRules(); });

  $("sg-copy").addEventListener("click", async () => {
    // invite links use SITE_URL if you set it. otherwise they use the address you're on right now,
    // which is a 127.0.0.1 number when you're testing on your own computer (that only works for you)
    const home = (SITE_URL || (location.origin + location.pathname)).replace(/index\.html$/, "").replace(/[?#].*$/, "");
    const link = home + (home.endsWith("/") ? "" : "/") + "?room=" + st.room.code + "#scattergories";
    // 1) copy the link. 2) if the browser won't let us (some phones), open the phone's share sheet with the link.
    // 3) if that isn't possible either, try the old way of copying. 4) last resort: show the link itself so it can be copied by hand.
    try { await navigator.clipboard.writeText(link); say("invite link copied!"); return; } catch (e) {}
    if (navigator.share) {
      try { await navigator.share({ title: "scattergories", text: "join my scattergories room!", url: link }); say("invite link shared!"); return; }
      catch (e) { if (e && e.name === "AbortError") return; }   // (they closed the share sheet: nothing to say)
    }
    try {
      const t = document.createElement("textarea");
      t.value = link; t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
      document.body.appendChild(t); t.select(); t.setSelectionRange(0, link.length);
      const ok = document.execCommand("copy"); t.remove();
      if (ok) { say("invite link copied!"); return; }
    } catch (e) {}
    say("copy this link: " + link);
  });

  // ----- the first screen -----
  $("sg-create").addEventListener("click", createRoom);
  $("sg-joinform").addEventListener("submit", (e) => { e.preventDefault(); joinRoom($("sg-code").value); });
  $("sg-code").addEventListener("input", () => { $("sg-code").value = $("sg-code").value.toUpperCase().replace(/[^A-Z0-9]/g, ""); });
  $("sg-name").value = me.name || "";

  // opened from an invite link (?room=ABCD): ask for a name, then join that room straight away
  let invited = "";
  try {
    invited = (new URLSearchParams(location.search).get("room") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  } catch (e) {}

  function inviteMode(on) {
    $("sg-invite").hidden = $("sg-invite-row").hidden = !on;
    $("sg-make").hidden = $("sg-or").hidden = $("sg-joinform").hidden = on;
    if (on) { $("sg-invite-code").textContent = invited; $("sg-name").focus(); }
  }
  function dropInviteFromAddress() {
    try { history.replaceState(null, "", location.pathname + "#scattergories"); } catch (e) {}
  }
  $("sg-invite-join").addEventListener("click", async () => {
    $("sg-invite-join").disabled = true;
    await joinRoom(invited);
    $("sg-invite-join").disabled = false;
    if (code) { inviteMode(false); dropInviteFromAddress(); invited = ""; }
  });
  $("sg-invite-other").addEventListener("click", () => {
    inviteMode(false); dropInviteFromAddress(); invited = ""; say("");
    $("sg-code").value = "";
  });
  $("sg-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && invited) { e.preventDefault(); $("sg-invite-join").click(); }
  });

  if (!configured) {
    say("the online part isn't set up yet, so rooms can't be made. (see community-config.js)");
    $("sg-create").disabled = true;
    $("sg-joinform").querySelectorAll("input, button").forEach((n) => { n.disabled = true; });
  } else {
    // came back after a refresh: go straight back into the room
    let back = null;
    try { back = sessionStorage.getItem("sg-room"); } catch (e) {}
    if (back) { code = back; poll(); }
    show("sg-join");
    if (invited && invited !== back) {
      inviteMode(true);
      // tell them now if the room can't be joined, instead of after they type a name
      rpc("sg_state", { p_code: invited }).then((r) => {
        if (!invited) return;
        const known = r && r.room && r.players.some((p) => p.id === me.id);
        if (!r || !r.room) { inviteMode(false); invited = ""; say("that room doesn't exist anymore. make a new one or ask for a new link."); }
        else if (r.room.status !== "lobby" && !known) { inviteMode(false); invited = ""; say("that game has already started."); }
      }).catch(() => {});
    } else if (invited) { dropInviteFromAddress(); invited = ""; }
  }
})();