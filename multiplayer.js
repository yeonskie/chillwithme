// ---------- The rat race: multiplayer ----------
// How it works: one person makes a room and gets a 4-letter code. Friends join with the code.
//   * everyone picks a rat (the same pick screen as single player) and a bet (taken off your yeonbucks right away). the bets make the pot.
//   * the host starts the race. everybody runs the same obstacle course at the same time, and you see each other's rats move.
//   * the first rat over the flag wins the WHOLE pot. run out of puffs and you're out. if everyone's out, bets come back.
//
// Two parts talk to Supabase (see supabase-ratrace-mp.sql):
//   * rooms, bets and who won: ordinary calls, checked every 1.2 seconds
//   * where everybody's rat is during the race: Supabase Realtime "broadcast" (a live connection, about 10 messages a second)
// Yeonbucks stay in your browser like everywhere else on the site, so this is just for fun.
//
// The race itself (the track, the jumping, the other rats) lives in ratrace.js (window.RRMP).

(function () {
  const modal = document.getElementById("mp-modal");
  if (!modal) return;
  const box = modal.querySelector(".mp-box");
  const $ = (s) => box.querySelector(s);

  // (read when it's needed: community-config.js may load after this file)
  let BASE = "", KEY = "", configured = false;
  function readConfig() {
    const cfg = typeof COMMUNITY !== "undefined" ? COMMUNITY : {};
    BASE = String(cfg.url || "").trim().replace(/\/+$/, "");
    KEY = String(cfg.key || "").trim();
    configured = /^https:\/\/[^\s/]+/i.test(BASE) && KEY.length > 20;
  }
  const POLL_MS = 1200;
  const MIN_BET = 50, MAX_BET = 100000;       // (the server enforces the real limits: keep these the same as rrm_cfg in the sql file)
  const REALTIME_LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => Number(n || 0).toLocaleString("en-US");
  const digits = (s) => parseInt(String(s).replace(/\D/g, "").slice(0, 9), 10) || 0;
  const art = () => window.RRArt || null;
  const have = () => (window.YB ? window.YB.have() : 0);

  // ----- who am I (remembered in this browser) -----
  let myId = store.get("rr-mp-id", "");
  if (!myId) { myId = "p" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); store.set("rr-mp-id", myId); }
  let name = store.get("rr-mp-name", "") || (store.get("sg-me", {}) || {}).name || "";

  // ----- talking to Supabase -----
  async function rpc(fn, args) {
    const headers = { apikey: KEY, "Content-Type": "application/json" };
    if (/^eyJ/.test(KEY)) headers.Authorization = "Bearer " + KEY;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000);
    try {
      const res = await fetch(BASE + "/rest/v1/rpc/" + fn, { method: "POST", headers, body: JSON.stringify(Object.assign({ p_id: myId }, args || {})), signal: ctl.signal });
      const text = await res.text();
      let j = null; try { j = text ? JSON.parse(text) : null; } catch (e) {}
      if (!res.ok) { const e = new Error((j && (j.message || j.msg)) || "something went wrong"); e.status = res.status; e.code = j && j.code; throw e; }
      return j;
    } finally { clearTimeout(timer); }
  }
  function nice(e) {
    const m = String((e && e.message) || "");
    if (e && (e.code === "PGRST202" || e.status === 404)) return "multiplayer isn't set up yet: run supabase-ratrace-mp.sql in Supabase.";
    if (e && e.name === "AbortError") return "the server is slow. trying again...";
    if (e instanceof TypeError) return "can't reach the server. check your connection.";
    return m || "something went wrong";
  }

  // ----- the live connection (everyone's rat during the race) -----
  let sb = null, chan = null, live = false;
  function loadLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = REALTIME_LIB; s.onload = () => res(); s.onerror = () => rej(new Error("couldn't load the live connection"));
      document.head.appendChild(s);
    });
  }
  async function openLive(room, onMsg) {
    live = false;
    try {
      await loadLib();
      sb = sb || window.supabase.createClient(BASE, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
      chan = sb.channel("rrm-" + room, { config: { broadcast: { self: false, ack: false } } });
      chan.on("broadcast", { event: "p" }, (m) => onMsg(m.payload));
      await new Promise((res, rej) => {
        const t = setTimeout(() => rej(new Error("timed out")), 7000);
        chan.subscribe((status) => { if (status === "SUBSCRIBED") { clearTimeout(t); res(); } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") { clearTimeout(t); rej(new Error(status)); } });
      });
      live = true;
    } catch (e) { live = false; }
    return live;
  }
  function closeLive() {
    try { if (sb && chan) sb.removeChannel(chan); } catch (e) {}
    chan = null; live = false;
  }
  const sendLive = (payload) => { if (chan && live) { try { chan.send({ type: "broadcast", event: "p", payload }); } catch (e) {} } };

  // ----- the bet that's currently taken off your balance -----
  // It's written down on this browser, so if the room goes away before the race, the bet comes back (and a payout can still be collected).
  //   { room, round, bet, started }
  let pending = store.get("rr-mp-pending", null);
  const setPending = (p) => { pending = p; if (p) store.set("rr-mp-pending", p); else store.del("rr-mp-pending"); };
  function give(n) { if (n > 0 && window.YB) window.YB.add(n); }
  function settle(s) {   // called with every bit of news: pays out, or gives a bet back
    if (!pending) return;
    const room = s && s.room, mine = room && (s.players || []).find((p) => p.me);
    if (!room || !mine || room.code !== pending.room) {          // the room is gone, or I'm no longer in it
      if (!pending.started) give(pending.bet);
      setPending(null); return;
    }
    if (mine.paid_round === pending.round) {                     // the race for my bet has been decided
      give(mine.paid); setPending(null);
    } else if (room.status === "racing" && room.round === pending.round) {
      if (!pending.started) setPending(Object.assign({}, pending, { started: true }));   // (a race is on: leaving now loses the bet)
    } else if (room.round > pending.round) {
      setPending(null);                                          // moved on without it (nothing to collect)
    } else if (room.status === "lobby" && !mine.ready) {          // my bet isn't there any more (dropped for being quiet)
      give(pending.bet); setPending(null);
    }
  }

  // ----- state -----
  let code = null;             // the room I'm in
  let st = null;               // the latest news: { now, room, players }
  let offset = 0;              // the server's clock minus mine
  let poll = null, busy = false, ticking = false;
  let sig = "";                // what the screen shows right now (it only redraws when this changes)
  let betVal = "50", notice = "", racing = false, raceKey = "";
  let myRat = null;            // the rat I picked for this race: { name, coat, stats }
  try { myRat = JSON.parse(sessionStorage.getItem("rr-mp-rat")); } catch (e) {}
  const keepRat = (r) => { myRat = r; try { if (r) sessionStorage.setItem("rr-mp-rat", JSON.stringify(r)); else sessionStorage.removeItem("rr-mp-rat"); } catch (e) {} };
  const say = (t) => { notice = t || ""; const m = $("#mp-msg"); if (m) m.textContent = notice; };
  function setRoom(c) { code = c; try { if (c) sessionStorage.setItem("rr-mp-room", c); else sessionStorage.removeItem("rr-mp-room"); } catch (e) {} }
  const mineOf = (s) => ((s && s.players) || []).find((p) => p.me) || {};

  // opened from an invite link (?mp=ABCD): ask for a name, then join that room
  let invited = "";
  try { invited = (new URLSearchParams(location.search).get("mp") || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4); } catch (e) {}
  if (invited.length !== 4) invited = "";
  const dropInvite = () => { invited = ""; try { history.replaceState(null, "", location.pathname + "#ratrace"); } catch (e) {} };

  // ----- opening and closing -----
  function open() {
    readConfig();
    modal.hidden = false;
    render(true);
    if (!configured) return;
    let saved = null; try { saved = sessionStorage.getItem("rr-mp-room"); } catch (e) {}
    if (saved && !code) setRoom(saved);
    if (code) tick(true);
    else if (pending) rpc("rrm_state", { p_code: pending.room }).then((s) => { settle(s); render(true); }).catch(() => {});
  }
  function startPolling() { if (!poll) poll = setInterval(tick, POLL_MS); }
  function stopPolling() { if (poll) { clearInterval(poll); poll = null; } }

  async function tick(force) {   // (force: called by a button while it's the one "busy")
    if (!code || (busy && force !== true) || ticking) return;
    ticking = true;
    try {
      const t0 = Date.now();
      const s = await rpc("rrm_state", { p_code: code });
      const t1 = Date.now();
      settle(s);
      if (!s || !s.room || !(s.players || []).some((p) => p.me)) {   // the room closed (or I was dropped for being quiet)
        endRace(); setRoom(null); st = null; stopPolling(); say("that room closed."); modal.hidden = false; render(true); return;
      }
      offset = Date.parse(s.now) - (t0 + t1) / 2;
      st = s;
      startPolling();
      follow();
      render(false);
    } catch (e) { say(nice(e)); } finally { ticking = false; }
  }

  // ----- the race starts and ends when the server says so -----
  function follow() {
    const r = st.room, mine = mineOf(st);
    if (r.status === "racing") startRace(r, mine);
    else if (racing) { endRace(); modal.hidden = false; sig = ""; }     // decided (or sent back to the lobby): show the result
  }
  function startRace(r, mine) {
    const key = code + ":" + r.round;
    if (raceKey === key) return;                                       // (start it once per race)
    raceKey = key;
    const late = Date.parse(r.race_at) - offset < Date.now() - 4000;   // joined or reloaded after it began
    if (!mine.ready || !myRat || late || !window.RRMP) {
      if (mine.ready) rpc("rrm_finish", { p_code: code, p_time: null, p_out: true }).catch(() => {});   // (so the others aren't kept waiting for me)
      modal.hidden = false; return;                                     // not in this race: watch the screen for the result
    }
    racing = true; modal.hidden = true;
    const others = st.players.filter((p) => !p.me && p.ready).map((p) => ({ pid: p.pid, name: p.rat_name + " (" + p.name + ")", coat: p.coat }));
    const myPid = mine.pid;
    openLive(code, (m) => { if (m && m.pid && window.RRMP) window.RRMP.remote(m.pid, m); }).then((ok) => { if (!ok && racing) say("the live connection didn't work: you can still race, but you won't see the others."); });
    const pot = r.pot || st.players.reduce((n, p) => n + (p.bet || 0), 0);
    window.RRMP.race({
      seed: r.seed, startAt: Date.parse(r.race_at) - offset, pot,
      me: { name: myRat.name + " (" + (mine.name || "you") + ")", coat: myRat.coat, stats: myRat.stats },
      others,
      onSend: (m) => sendLive(Object.assign({ pid: myPid }, m)),
      onFinish: (t) => { rpc("rrm_finish", { p_code: code, p_time: Math.round(t * 100) / 100, p_out: false }).catch(() => {}); },
      onOut: () => { rpc("rrm_finish", { p_code: code, p_time: null, p_out: true }).catch(() => {}); },
    });
  }
  function endRace() {
    if (!racing && !(window.RRMP && window.RRMP.racing)) return;
    racing = false;
    closeLive();
    if (window.RRMP) window.RRMP.stop();
  }

  // ----- drawing -----
  const statsLine = (r) => "speed " + r.stats.speed + " · jump " + r.stats.jump + " · hunger " + r.stats.hunger;
  const ratImg = (c) => (art() ? art().ratSVG(c) : "");
  const walletBar = () => '<p class="mp-wallet">you have <b>' + fmt(have()) + "</b> yeonbucks</p>";
  const head = (title) => '<button type="button" class="inv-close" data-mp="close" aria-label="close">&times;</button><h2 class="rr-box-title">' + esc(title) + "</h2>";

  function render(force) {
    if (!configured) { box.innerHTML = head("multi-player") + '<p class="rr-box-sub">multiplayer needs the online part switched on. it isn\'t yet.</p>'; return; }
    let key;
    if (!code || !st) key = "home|" + have();
    else key = [code, st.room.status, st.room.round, JSON.stringify(st.players), have(), myRat && myRat.name].join("|");
    if (!force && key === sig) return;
    sig = key;
    box.innerHTML = !code || !st ? viewHome() : st.room.status === "lobby" ? viewLobby() : st.room.status === "racing" ? viewWatch() : viewDone();
    const m = $("#mp-msg"); if (m) m.textContent = notice;
  }

  function viewHome() {
    if (invited) return head("multi-player") +
      '<p class="rr-box-sub">you\'re invited to room <b>' + esc(invited) + "</b>. type your name to join!</p>" +
      '<div class="mp-row"><input id="mp-name" type="text" maxlength="20" autocomplete="off" placeholder="your name" aria-label="your name" value="' + esc(name) + '"></div>' +
      '<button type="button" class="rr-opt rr-start" data-mp="invjoin">join room</button>' +
      '<button type="button" class="rr-text" data-mp="invother">use a different room</button>' +
      '<p class="rr-msg" id="mp-msg" role="status"></p>';
    return head("multi-player") +
      '<p class="rr-box-sub">race your friends over the obstacle course. first rat over the flag wins everyone\'s bets!</p>' +
      walletBar() +
      '<div class="mp-row"><input id="mp-name" type="text" maxlength="20" autocomplete="off" placeholder="your name" aria-label="your name" value="' + esc(name) + '"></div>' +
      '<button type="button" class="rr-opt rr-start" data-mp="create">make a room</button>' +
      '<div class="mp-row"><input id="mp-code" type="text" maxlength="4" autocomplete="off" autocapitalize="characters" placeholder="room code" aria-label="room code">' +
      '<button type="button" class="hy-btn" data-mp="join">join</button></div>' +
      '<p class="rr-msg" id="mp-msg" role="status"></p>';
  }

  function playersList(showResult) {
    const winner = st.room.winner;
    return '<ul class="mp-players">' + st.players.map((p) => {
      let info;
      if (showResult && p.ready) {
        info = (p.pid === winner ? "won " + fmt(p.payout) : winner ? "lost " + fmt(p.bet) : "bet back") + (p.out ? " · out of puffs" : p.fin_time != null ? " · " + Number(p.fin_time).toFixed(1) + "s" : "");
      } else info = p.ready ? esc(p.rat_name) + " · bet " + fmt(p.bet) + (p.go ? " · ready" : "") : "choosing...";
      return "<li" + (p.me ? ' class="me"' : "") + '><span>' + esc(p.name) + (p.host ? " ★" : "") + "</span><span>" + info + "</span></li>";
    }).join("") + "</ul>";
  }

  function viewLobby() {
    const r = st.room, mine = mineOf(st);
    const pot = st.players.reduce((n, p) => n + (p.ready ? p.bet : 0), 0);
    const ready = st.players.filter((p) => p.ready).length;
    const host = st.players.find((p) => p.host) || {};
    let mineBox;
    if (mine.ready && myRat) {
      mineBox = '<div class="mp-mine"><span class="mp-ratimg">' + ratImg(myRat.coat) + "</span><b>" + esc(myRat.name) + "</b><small>" + statsLine(myRat) + "</small><em>bet <b>" + fmt(mine.bet) + "</b> placed</em></div>" +
        '<div class="mp-row"><button type="button" class="hy-btn" data-mp="pick">change rat or bet</button><button type="button" class="hy-btn" data-mp="unbet">take back</button></div>' +
        (mine.host ? "" : '<button type="button" class="rr-opt rr-start" data-mp="go">' + (mine.go ? "ready! (tap to undo)" : "i'm ready") + "</button>");
    } else if (myRat) {
      mineBox = '<div class="mp-mine"><span class="mp-ratimg">' + ratImg(myRat.coat) + "</span><b>" + esc(myRat.name) + "</b><small>" + statsLine(myRat) + "</small>" +
        '<button type="button" class="rr-text mp-swap" data-mp="pick">pick a different rat</button></div>' +
        '<div class="mp-row"><input id="mp-bet" type="text" inputmode="numeric" autocomplete="off" value="' + esc(fmt(+betVal)) + '" aria-label="your bet"><button type="button" class="hy-btn" data-mp="bet">place bet</button></div>' +
        '<span class="rr-quick"><button type="button" data-q="50">50</button><button type="button" data-q="500">500</button><button type="button" data-q="5000">5000</button><button type="button" data-q="max">max</button></span>';
    } else {
      mineBox = '<button type="button" class="rr-opt rr-start" data-mp="pick">choose your rat</button>';
    }
    const others = st.players.filter((p) => p.ready && !p.host && !p.me);
    const allGo = others.every((p) => p.go);
    const canStart = ready >= 2 && mine.host && allGo;
    return head("room " + code) + walletBar() +
      '<p class="rr-box-sub">round <b>' + r.round + '</b> &nbsp;·&nbsp; pot <b>' + fmt(pot) + "</b></p>" +
      '<p class="mp-small">pick a rat, put a bet down, and get ready.<br>the first rat over the flag wins the whole pot!</p>' +
      mineBox + playersList(false) +
      '<button type="button" class="hy-btn" data-mp="invite">copy invite link</button>' +
      (mine.host ? '<button type="button" class="rr-opt rr-start" data-mp="start"' + (canStart ? "" : " disabled") + ">start race</button>" +
        (canStart ? "" : '<p class="mp-small">' + (ready < 2 ? "needs 2 players with a bet down" : "waiting for everyone to press i'm ready") + "</p>") :
        '<p class="mp-small">' + (mine.go ? "waiting for " + esc(host.name || "the host") + " to start the race" : "") + "</p>") +
      '<button type="button" class="rr-text" data-mp="leave">leave room</button>' +
      '<p class="rr-msg" id="mp-msg" role="status"></p>';
  }

  function viewWatch() {
    return head("room " + code) + '<p class="rr-box-sub">a race is on! wait here for the result.</p>' + playersList(false) +
      '<button type="button" class="rr-text" data-mp="leave">leave room</button><p class="rr-msg" id="mp-msg" role="status"></p>';
  }

  function viewDone() {
    const r = st.room, mine = mineOf(st);
    const win = st.players.find((p) => p.pid === r.winner);
    let top, line = "";
    if (win) {
      top = '<p class="mp-win"><b>' + esc(win.rat_name) + "</b> wins!</p>";
      line = mine.ready ? (mine.pid === win.pid ? "you won " + fmt(mine.payout) + " yeonbucks!" : "you lost " + fmt(mine.bet) + ".") : "";
    } else {
      top = '<p class="mp-win">nobody made it</p>';
      line = mine.ready ? "everyone ran out of puffs, so bets came back." : "";
    }
    return head("room " + code) + walletBar() + top + (line ? '<p class="rr-box-sub">' + esc(line) + "</p>" : "") +
      playersList(true) +
      '<button type="button" class="rr-opt rr-start" data-mp="next">next race</button>' +
      '<button type="button" class="rr-text" data-mp="leave">leave room</button>' +
      '<p class="rr-msg" id="mp-msg" role="status"></p>';
  }

  // ----- buttons -----
  async function run(fn) {   // one thing at a time
    if (busy) return;
    busy = true; say("");
    try { await fn(); } catch (e) { say(nice(e)); } finally { busy = false; }
  }
  const nameNow = () => { const n = ($("#mp-name") ? $("#mp-name").value : name).trim().slice(0, 20); if (n) { name = n; store.set("rr-mp-name", n); } return name || "player"; };
  async function copyInvite() {
    const local = /^(localhost|127\.|0\.0\.0\.0|192\.168\.|10\.)/.test(location.hostname) || location.protocol === "file:";
    const home = local ? location.origin + location.pathname.replace(/index\.html$/, "") : "https://www.yeonskie.com/";   // (testing on your own computer: link back to that copy)
    const link = home + "?mp=" + code + "#ratrace";
    try { await navigator.clipboard.writeText(link); say("invite link copied!"); return; } catch (e) {}
    if (navigator.share) {
      try { await navigator.share({ title: "rat race", text: "race me in the rat race!", url: link }); say("invite link shared!"); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    try {
      const t = document.createElement("textarea");
      t.value = link; t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
      document.body.appendChild(t); t.select(); t.setSelectionRange(0, link.length);
      const ok = document.execCommand("copy"); t.remove();
      if (ok) { say("invite link copied!"); return; }
    } catch (e) {}
    say("copy this link: " + link);
  }
  function enterRoom(c) {
    if (pending && pending.room !== c) { if (!pending.started) give(pending.bet); setPending(null); }   // (a bet left in another room comes back)
    setRoom(c); keepRat(null); raceKey = ""; sig = ""; return tick(true);
  }
  async function leaveRoom() {
    const c = code, was = st;
    endRace(); setRoom(null); st = null; stopPolling(); keepRat(null);
    if (pending && pending.room === c) {
      const mine = was && mineOf(was);
      if (mine && mine.paid_round === pending.round) give(mine.paid);                              // it was decided: collect
      else if (was && was.room.status === "racing") { /* left in the middle of a race: the bet is gone */ }
      else if (!pending.started) give(pending.bet);                                                // a bet in a race that never ran comes back
      setPending(null);
    }
    if (c) { try { await rpc("rrm_leave", { p_code: c }); } catch (e) {} }
    modal.hidden = false; render(true);
  }
  function close() {
    if (code) { run(async () => { await leaveRoom(); modal.hidden = true; }); return; }   // closing while in a room leaves it
    modal.hidden = true; stopPolling();
  }

  box.addEventListener("click", (e) => {
    const q = e.target.closest(".rr-quick button");
    if (q) { const inp = $("#mp-bet"); if (inp) { const v = q.dataset.q === "max" ? Math.min(MAX_BET, have()) : +q.dataset.q; inp.value = fmt(v); betVal = String(v); } return; }
    const b = e.target.closest("[data-mp]");
    if (!b) return;
    const act = b.dataset.mp;
    if (act === "close") return close();
    if (act === "create") return run(async () => { await enterRoom(await rpc("rrm_create", { p_name: nameNow() })); });
    if (act === "join") return run(async () => {
      const c = ($("#mp-code").value || "").trim().toUpperCase();
      if (c.length !== 4) throw new Error("room codes have 4 letters");
      await enterRoom(await rpc("rrm_join", { p_code: c, p_name: nameNow() }));
    });
    if (act === "invjoin") return run(async () => {
      await enterRoom(await rpc("rrm_join", { p_code: invited, p_name: nameNow() }));
      dropInvite();
    });
    if (act === "invother") { dropInvite(); render(true); return; }
    if (act === "invite") return copyInvite();
    if (act === "pick") return run(async () => {   // the pick screen (3 rats with stats), then back here to bet
      if (!window.RRMP) throw new Error("the game isn't ready yet");
      const mine = mineOf(st);
      if (mine.ready) {                              // changing: take the old bet back first
        await rpc("rrm_pick", { p_code: code, p_rat_name: null, p_coat: null, p_bet: 0 });
        if (pending && pending.room === code) { give(pending.bet); setPending(null); }
      }
      modal.hidden = true;
      window.RRMP.pickRat((rat) => { keepRat(rat); modal.hidden = false; sig = ""; render(true); tick(true); });
    });
    if (act === "bet") return run(async () => {
      if (!myRat) throw new Error("pick a rat first");
      const n = digits($("#mp-bet").value);
      if (n < MIN_BET || n > MAX_BET) throw new Error("bets are " + MIN_BET + " to " + fmt(MAX_BET));
      if (n > have()) throw new Error("you don't have that many yeonbucks");
      window.YB.spend(n);
      betVal = String(n);
      try { await rpc("rrm_pick", { p_code: code, p_rat_name: myRat.name, p_coat: myRat.coat, p_bet: n }); }
      catch (err) { give(n); throw err; }                                  // (the server said no: put your yeonbucks back)
      setPending({ room: code, round: st.room.round, bet: n, started: false });
      await tick(true);
    });
    if (act === "go") return run(async () => { await rpc("rrm_go", { p_code: code, p_go: !mineOf(st).go }); await tick(true); });
    if (act === "unbet") return run(async () => {
      await rpc("rrm_pick", { p_code: code, p_rat_name: null, p_coat: null, p_bet: 0 });
      if (pending && pending.room === code) { give(pending.bet); setPending(null); }
      await tick(true);
    });
    if (act === "start") return run(async () => { await rpc("rrm_start", { p_code: code }); await tick(true); });
    if (act === "next") return run(async () => { await rpc("rrm_next", { p_code: code }); keepRat(null); raceKey = ""; await tick(true); });
    if (act === "leave") return run(leaveRoom);
  });
  box.addEventListener("input", (e) => { if (e.target.id === "mp-bet") betVal = String(digits(e.target.value)); if (e.target.id === "mp-code") e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ""); });
  box.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || !e.target.id) return;
    const go = { "mp-bet": "bet", "mp-code": "join", "mp-name": invited ? "invjoin" : "create" }[e.target.id];
    const btn = go && box.querySelector('[data-mp="' + go + '"]');
    if (btn) btn.click();
  });
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

  // leaving the rat race page leaves the room (a bet in a race that hasn't run comes back)
  window.addEventListener("hashchange", () => {
    if (location.hash === "#ratrace") return;
    if (!modal.hidden) modal.hidden = true;
    if (code) { readConfig(); leaveRoom().then(() => { modal.hidden = true; }); }
  });

  // a bet left over from last time (the page was closed mid-bet): collect or give back as soon as the page loads
  window.addEventListener("load", () => {
    if (invited) { if (location.hash !== "#ratrace") location.hash = "#ratrace"; setTimeout(open, 500); }
    if (!pending) return;
    readConfig();
    if (configured) rpc("rrm_state", { p_code: pending.room }).then(settle).catch(() => {});
  });

  window.RRMulti = { open };
})();
