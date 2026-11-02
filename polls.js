// ---------- Polls and pinned posts on the community page ----------
// (pinned posts: the owner pins up to 3, shown as slim rows above the polls; tapping one opens it in a pop-up)
// The owner makes a poll (question, 2-6 choices, an optional end date). Visitors pick a choice, THEN the results show up, and they can
// change their pick any time until the poll ends. Polls live in Supabase (see supabase-polls.sql, which also keeps results hidden until you've voted).

(function () {
  const $ = (id) => document.getElementById(id);
  const box = $("cm-polls");
  const cfg = typeof COMMUNITY !== "undefined" ? COMMUNITY : {};
  const BASE = String(cfg.url || "").trim().replace(/\/+$/, "");
  const KEY = String(cfg.key || "").trim();
  if (!box || !/^https:\/\/[^\s/]+/i.test(BASE) || KEY.length < 20) return;

  const SHOWN = 3;                       // polls shown before "older polls"
  const MAX_OPTS = 6;
  let polls = [], results = {}, loadedAt = 0, showAll = false, owner = false;
  const busy = {};                       // poll id -> true while a vote is going through

  function headers(extra) {
    const h = { apikey: KEY, ...extra };
    if (/^eyJ/.test(KEY)) h.Authorization = "Bearer " + KEY;
    return h;
  }
  async function rpc(fn, args) {
    const res = await fetch(BASE + "/rest/v1/rpc/" + fn, { method: "POST", headers: headers({ "Content-Type": "application/json" }), body: JSON.stringify(args) });
    if (!res.ok) throw new Error("rpc " + res.status);
    return res.status === 204 ? null : res.json();
  }
  function me() {                         // the same random browser id the community board uses for reactions
    let id = ""; try { id = localStorage.getItem("yb-id") || ""; } catch (e) {}
    if (id.length < 8) { id = "y" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); try { localStorage.setItem("yb-id", id); } catch (e) {} }
    return id;
  }
  const endsAt = (p) => (p.ends_at ? new Date(p.ends_at) : null);
  const isClosed = (p) => { const d = endsAt(p); return !!d && d.getTime() <= Date.now(); };
  function dateText(d) { return String(d.getMonth() + 1).padStart(2, "0") + "." + String(d.getDate()).padStart(2, "0") + "." + d.getFullYear(); }

  async function load() {
    try {
      const res = await fetch(BASE + "/rest/v1/polls?select=id,created_at,question,description,options,ends_at&order=created_at.desc&limit=30", { headers: headers() });
      if (!res.ok) throw new Error("polls " + res.status);
      const rows = await res.json();
      polls = (Array.isArray(rows) ? rows : []).filter((p) => p && Array.isArray(p.options) && p.options.length >= 2);
      await loadResults(true);
      loadedAt = Date.now();
    } catch (e) { polls = []; /* no polls table yet (supabase-polls.sql not run?): the board just works without them */ }
    render();
  }
  async function loadResults(quiet) {
    try {
      const rows = await rpc("poll_results", { p_client: me() });
      results = {};
      (Array.isArray(rows) ? rows : []).forEach((r) => { results[r.id] = { mine: r.mine === null || r.mine === undefined ? null : +r.mine, counts: Array.isArray(r.counts) ? r.counts.map(Number) : null }; });
    } catch (e) { /* results stay hidden */ }
    if (!quiet) render();
  }

  async function vote(p, i) {
    if (busy[p.id] || isClosed(p)) return;
    const r = results[p.id] || (results[p.id] = { mine: null, counts: null });
    if (r.mine === i) return;
    busy[p.id] = true;
    const before = { mine: r.mine, counts: r.counts && r.counts.slice() };
    r.mine = i;                                          // (shows your pick right away; the real numbers come back from the database)
    if (r.counts) { if (before.mine !== null) r.counts[before.mine] = Math.max(0, r.counts[before.mine] - 1); r.counts[i] = (r.counts[i] || 0) + 1; }
    render();
    try {
      await rpc("poll_vote", { p_poll: p.id, p_client: me(), p_choice: i });
      await loadResults(true);
    } catch (e) { results[p.id] = before; }
    busy[p.id] = false;
    render();
  }

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }

  function buildPoll(p) {
    const r = results[p.id] || { mine: null, counts: null };
    const closed = isClosed(p);
    const total = r.counts ? r.counts.reduce((a, b) => a + b, 0) : 0;
    const card = el("article", "pl-card" + (closed ? " pl-closed" : ""));
    const top = el("p", "pl-meta");
    const d = endsAt(p);
    top.textContent = closed ? "poll · closed " + dateText(d) : d ? "poll · ends " + dateText(d) : "poll";
    card.appendChild(top);
    card.appendChild(el("h2", "pl-q", p.question));
    if (p.description) card.appendChild(el("p", "pl-desc", p.description));
    const list = el("div", "pl-opts");
    list.setAttribute("role", "group");
    list.setAttribute("aria-label", p.question);
    p.options.forEach((label, i) => {
      const showNums = !!r.counts;
      const mine = r.mine === i;
      const b = el(closed ? "div" : "button", "pl-opt" + (mine ? " pl-mine" : "") + (showNums ? " pl-shown" : ""));
      if (!closed) { b.type = "button"; b.setAttribute("aria-pressed", mine ? "true" : "false"); b.addEventListener("click", () => vote(p, i)); }
      if (showNums) {
        const pct = total ? Math.round((r.counts[i] / total) * 100) : 0;
        const bar = el("span", "pl-bar"); bar.style.width = pct + "%"; b.appendChild(bar);
        b.appendChild(el("span", "pl-l", (mine ? "✓ " : "") + label));
        b.appendChild(el("span", "pl-n", r.counts[i] + " · " + pct + "%"));
      } else {
        b.appendChild(el("span", "pl-l", label));
      }
      list.appendChild(b);
    });
    card.appendChild(list);
    const foot = el("p", "pl-foot");
    if (r.counts) foot.textContent = total + (total === 1 ? " vote" : " votes") + (!closed && r.mine !== null ? " · tap another choice to change yours" : "");
    else foot.textContent = closed ? "no votes yet" : "pick one to see the results";
    card.appendChild(foot);
    if (owner) card.appendChild(ownerRow(p, closed));
    return card;
  }

  function ownerRow(p, closed) {
    const row = el("div", "pl-owner");
    if (!closed) {
      const end = el("button", "pl-small", "end poll now"); end.type = "button";
      end.addEventListener("click", async () => {
        if (end.dataset.sure !== "1") { end.dataset.sure = "1"; end.textContent = "sure? tap again"; return; }
        try { await window.siteDb.endPoll(p.id); await load(); } catch (e) { end.textContent = "couldn't (still signed in?)"; }
      });
      row.appendChild(end);
    }
    const del = el("button", "pl-small", "delete"); del.type = "button";
    del.addEventListener("click", async () => {
      if (del.dataset.sure !== "1") { del.dataset.sure = "1"; del.textContent = "sure? tap again"; return; }
      try { await window.siteDb.removePoll(p.id); await load(); } catch (e) { del.textContent = "couldn't (still signed in?)"; }
    });
    row.appendChild(del);
    return row;
  }

  function render() {
    box.innerHTML = "";
    box.hidden = !polls.length;
    // open polls first, then closed ones (newest first inside each)
    const sorted = polls.filter((p) => !isClosed(p)).concat(polls.filter(isClosed));
    sorted.slice(0, showAll ? sorted.length : SHOWN).forEach((p) => box.appendChild(buildPoll(p)));
    if (sorted.length > SHOWN) {
      const more = el("button", "mb-reset pl-more", showAll ? "show fewer polls" : "older polls (" + (sorted.length - SHOWN) + ")");
      more.type = "button";
      more.addEventListener("click", () => { showAll = !showAll; render(); });
      box.appendChild(more);
    }
  }

  // ----- owner only: "+ new poll" (the database checks it's really you) -----
  const addBtn = $("cm-poll-add"), dlg = $("cm-poll-dlg"), form = $("cm-poll-form");
  if (addBtn && dlg && form) {
    const qIn = $("cm-poll-q"), descIn = $("cm-poll-desc"), optsBox = $("cm-poll-opts"), moreOpt = $("cm-poll-more"), endIn = $("cm-poll-end"), msg = $("cm-poll-msg"), send = $("cm-poll-send");
    const syncOwner = (on) => { owner = !!on; addBtn.hidden = !owner; if (!owner) dlg.hidden = true; render(); };
    window.addEventListener("ownermode", (e) => syncOwner(!!e.detail));
    syncOwner(typeof ownerMode !== "undefined" && ownerMode);

    function optInputs() { return Array.prototype.slice.call(optsBox.querySelectorAll("input")); }
    function addOpt(value) {
      if (optInputs().length >= MAX_OPTS) return;
      const inp = document.createElement("input");
      inp.type = "text"; inp.maxLength = 60; inp.value = value || ""; inp.autocomplete = "off";
      inp.setAttribute("aria-label", "choice " + (optInputs().length + 1));
      inp.placeholder = "choice " + (optInputs().length + 1);
      optsBox.appendChild(inp);
      moreOpt.hidden = optInputs().length >= MAX_OPTS;
      return inp;
    }
    function reset() {
      qIn.value = ""; descIn.value = ""; endIn.value = ""; msg.textContent = ""; optsBox.innerHTML = "";
      addOpt(); addOpt();
      endIn.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);   // (today, in your timezone)
    }
    addBtn.addEventListener("click", () => { reset(); dlg.hidden = false; qIn.focus(); });
    moreOpt.addEventListener("click", () => { const i = addOpt(); if (i) i.focus(); });
    $("cm-poll-cancel").addEventListener("click", () => { dlg.hidden = true; addBtn.focus(); });
    // (no click-outside close, so a stray tap can't throw away what you were writing)

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const question = qIn.value.trim();
      const description = descIn.value.trim();
      const options = optInputs().map((i) => i.value.trim()).filter(Boolean);
      if (!question) { msg.textContent = "write the question first."; return; }
      if (options.length < 2) { msg.textContent = "give it at least two choices."; return; }
      if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) { msg.textContent = "two of the choices are the same."; return; }
      let ends_at = null;
      if (endIn.value) {                                  // the poll closes at the end of that day (your time)
        const [y, m, d] = endIn.value.split("-").map(Number);
        const end = new Date(y, m - 1, d, 23, 59, 59);
        if (isNaN(end) || end.getTime() <= Date.now()) { msg.textContent = "the end date has to be today or later."; return; }
        ends_at = end.toISOString();
      }
      if (!window.siteDb || !window.siteDb.addPoll) { msg.textContent = "sign in as the owner first."; return; }
      send.disabled = true; msg.textContent = "posting...";
      try {
        await window.siteDb.addPoll({ question, description, options, ends_at });
        dlg.hidden = true; msg.textContent = "";
        await load();
      } catch (err) {
        msg.textContent = /polls|schema cache|relation|404/.test(String(err && err.message)) ? "the polls table isn't set up yet. run supabase-polls.sql in Supabase." : "couldn't post that. are you still signed in?";
      } finally { send.disabled = false; }
    });
  }


  // ----- pinned posts -----
  const pinBox = $("cm-pins");
  let pins = [];
  const MAX_PINS = 3;
  async function loadPins() {
    try {
      const res = await fetch(BASE + "/rest/v1/pinned_posts?select=id,created_at,title,body&order=created_at.desc&limit=10", { headers: headers() });
      if (!res.ok) throw new Error("pins " + res.status);
      const rows = await res.json();
      pins = (Array.isArray(rows) ? rows : []).filter((x) => x && typeof x.title === "string").slice(0, MAX_PINS);
    } catch (e) { pins = []; /* the pins table isn't there yet (supabase-polls.sql not run?): no pins, everything else works */ }
    renderPins();
  }
  function renderPins() {
    if (!pinBox) return;
    pinBox.innerHTML = "";
    pinBox.hidden = !pins.length;
    pins.forEach((x) => {
      const wrap = el("div", "pn-wrap");
      const row = el("button", "pn-row"); row.type = "button";
      row.setAttribute("aria-haspopup", "dialog");
      row.appendChild(el("span", "pl-meta pn-tag", "pinned"));
      row.appendChild(el("span", "pn-title", x.title));
      if (x.body) row.appendChild(el("span", "pn-peek", x.body.replace(/\s+/g, " ")));
      row.addEventListener("click", () => openPin(x, row));
      wrap.appendChild(row);
      if (owner) {
        const un = el("button", "pl-small pn-un", "unpin"); un.type = "button";
        un.addEventListener("click", async () => {
          if (un.dataset.sure !== "1") { un.dataset.sure = "1"; un.textContent = "sure?"; return; }
          try { await window.siteDb.removePin(x.id); await loadPins(); } catch (e) { un.textContent = "couldn't"; }
        });
        wrap.appendChild(un);
      }
      pinBox.appendChild(wrap);
    });
  }
  const viewDlg = $("cm-pin-view");
  let viewFrom = null;
  function openPin(x, from) {
    if (!viewDlg) return;
    viewFrom = from || null;
    $("cm-pin-view-title").textContent = x.title;
    $("cm-pin-view-body").textContent = x.body || "";
    viewDlg.hidden = false;
    $("cm-pin-view-close").focus();
  }
  function closePin() { if (viewDlg.hidden) return; viewDlg.hidden = true; if (viewFrom && document.contains(viewFrom)) viewFrom.focus(); }
  if (viewDlg) {
    $("cm-pin-view-close").addEventListener("click", closePin);
    $("cm-pin-view-backdrop").addEventListener("click", closePin);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePin(); });
  }
  const pinAdd = $("cm-pin-add"), pinDlg = $("cm-pin-dlg"), pinForm = $("cm-pin-form");
  if (pinAdd && pinDlg && pinForm) {
    const tIn = $("cm-pin-title"), bIn = $("cm-pin-body"), pMsg = $("cm-pin-msg"), pSend = $("cm-pin-send");
    const syncPinOwner = (on) => { pinAdd.hidden = !on; if (!on) pinDlg.hidden = true; renderPins(); };
    window.addEventListener("ownermode", (e) => syncPinOwner(!!e.detail));
    syncPinOwner(typeof ownerMode !== "undefined" && ownerMode);
    pinAdd.addEventListener("click", () => {
      tIn.value = ""; bIn.value = ""; pMsg.textContent = "";
      pMsg.textContent = pins.length >= MAX_PINS ? "you already have " + MAX_PINS + " pinned. unpin one first." : "";
      pinDlg.hidden = false; tIn.focus();
    });
    $("cm-pin-cancel").addEventListener("click", () => { pinDlg.hidden = true; pinAdd.focus(); });
    pinForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = tIn.value.trim(), body = bIn.value.trim();
      if (!title) { pMsg.textContent = "give it a title first."; return; }
      if (pins.length >= MAX_PINS) { pMsg.textContent = "you already have " + MAX_PINS + " pinned. unpin one first."; return; }
      if (!window.siteDb || !window.siteDb.addPin) { pMsg.textContent = "sign in as the owner first."; return; }
      pSend.disabled = true; pMsg.textContent = "pinning...";
      try {
        await window.siteDb.addPin({ title, body });
        pinDlg.hidden = true; pMsg.textContent = "";
        await loadPins();
      } catch (err) {
        const why = String(err && err.message);
        pMsg.textContent = /only 3/.test(why) ? "you already have 3 pinned. unpin one first." : /pinned_posts|schema cache|relation|404/.test(why) ? "the pinned posts table isn't set up yet. run supabase-polls.sql in Supabase." : "couldn't pin that. are you still signed in?";
      } finally { pSend.disabled = false; }
    });
  }

  // load when the community page opens (and again if it's been a minute), and with the "check for new" button
  function onShow() { if (location.hash === "#community" && (!loadedAt || Date.now() - loadedAt > 60000)) { load(); loadPins(); } }
  window.addEventListener("hashchange", onShow);
  const refresh = $("cm-refresh"); if (refresh) refresh.addEventListener("click", () => { load(); loadPins(); });
  onShow();
  setInterval(() => { if (location.hash === "#community" && polls.some((p) => endsAt(p))) render(); }, 30000);   // (a poll flips to "closed" on its own when its time passes)
})();
