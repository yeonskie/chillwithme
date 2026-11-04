// ---------- Polls and pinned posts on the community page ----------
// (pinned posts: the owner pins up to 3 community posts with the "pin" button on an opened post; they show as slim rows above the polls, and tapping one opens it in a pop-up)
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
  let pins = [], viewFrom = null, viewPollId = null;     // pinned rows, and the pop-up that opens one
  let viewDirect = false;                                // true when the pop-up was opened from a link (so it stays open even if that poll isn't pinned)
  const MAX_PINS = 3;
  const viewDlg = $("cm-pin-view");
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

  // ----- links to one poll: yeonskie.com/#community?poll=ID (the owner gets a "copy link" button on every poll) -----
  const onCommunity = () => location.hash.split("?")[0] === "#community";
  function linkedId() { const m = /[?&]poll=([^&]+)/.exec(location.hash); return m ? decodeURIComponent(m[1]) : null; }
  function openLinked() {
    const id = linkedId();
    if (id === null || !viewDlg) return;
    if (!polls.some((p) => String(p.id) === id)) return;
    if (!viewDlg.hidden && String(viewPollId) === id) return;
    viewDirect = true;
    openPin({ poll_id: polls.filter((p) => String(p.id) === id)[0].id }, null);
  }

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
    if (onCommunity()) openLinked();
  }
  async function loadResults(quiet) {
    try {
      const rows = await rpc("poll_results", { p_client: me() });
      results = {};
      (Array.isArray(rows) ? rows : []).forEach((r) => { results[r.id] = { mine: r.mine === null || r.mine === undefined ? null : +r.mine, comments: +r.comments || 0, counts: Array.isArray(r.counts) ? r.counts.map(Number) : null }; });
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
    const cb = el("button", "pl-small pl-cbtn", r.comments > 0 ? "comments (" + r.comments + ")" : "add a comment"); cb.type = "button";
    cb.addEventListener("click", () => openComments(p));
    card.appendChild(cb);
    if (owner) card.appendChild(ownerRow(p, closed));
    return card;
  }

  function ownerRow(p, closed) {
    const row = el("div", "pl-owner");
    const copy = el("button", "pl-small", "copy link"); copy.type = "button";
    copy.addEventListener("click", async () => {
      const url = location.origin + location.pathname + "#community?poll=" + encodeURIComponent(p.id);
      try { await navigator.clipboard.writeText(url); copy.textContent = "copied!"; }
      catch (e) { copy.textContent = url; }              // (no clipboard access: show the link so it can be copied by hand)
      setTimeout(() => { copy.textContent = "copy link"; }, 2500);
    });
    row.appendChild(copy);
    const mine = pollPin(p);
    const pin = el("button", "pl-small", mine ? "unpin" : "pin"); pin.type = "button";
    pin.addEventListener("click", async () => {
      try {
        if (mine) { await window.siteDb.removePin(mine.id); await loadPins(); return; }
        if (pins.length >= MAX_PINS) { pin.textContent = "3 pinned already. unpin one first"; return; }
        await window.siteDb.addPin({ title: p.question.slice(0, 80), body: String(p.description || "").slice(0, 2000), poll_id: p.id });
        await loadPins();
      } catch (e) { pin.textContent = /only 3/.test(String(e && e.message)) ? "3 pinned already. unpin one first" : /column|schema cache|poll_id/.test(String(e && e.message)) ? "run supabase-polls.sql again" : "couldn't (still signed in?)"; }
    });
    row.appendChild(pin);
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
    // (a pinned poll lives in the slim pinned rows instead, so it isn't shown twice)
    const shown = polls.filter((p) => !pollPin(p));
    box.hidden = !shown.length;
    // open polls first, then closed ones (newest first inside each)
    const sorted = shown.filter((p) => !isClosed(p)).concat(shown.filter(isClosed));
    sorted.slice(0, showAll ? sorted.length : SHOWN).forEach((p) => box.appendChild(buildPoll(p)));
    if (sorted.length > SHOWN) {
      const more = el("button", "mb-reset pl-more", showAll ? "show fewer polls" : "older polls (" + (sorted.length - SHOWN) + ")");
      more.type = "button";
      more.addEventListener("click", () => { showAll = !showAll; render(); });
      box.appendChild(more);
    }
    refreshPollView();
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



  // ----- comments on a poll (like replies on a community post) -----
  const cDlg = $("pl-cm");
  let cPoll = null;
  const REPLY_COOLDOWN = 20 * 1000;
  async function loadComments() {
    const list = $("pl-cm-list"), note = $("pl-cm-note");
    if (!cPoll) return;
    const id = cPoll.id;
    note.textContent = "loading...";
    try {
      const res = await fetch(BASE + "/rest/v1/poll_comments?select=id,created_at,name,body&approved=eq.true&poll_id=eq." + encodeURIComponent(id) + "&order=created_at.asc&limit=200", { headers: headers() });
      if (!res.ok) throw new Error("comments " + res.status);
      const rows = await res.json();
      if (!cPoll || cPoll.id !== id) return;
      list.innerHTML = "";
      (Array.isArray(rows) ? rows : []).forEach((c) => {
        const li = el("li", "cm-reply");
        li.appendChild(el("p", "cm-reply-text", c.body));
        li.appendChild(el("p", "cm-card-meta", [c.name, dateText(new Date(c.created_at))].filter(Boolean).join(" \u00b7 ")));
        if (owner) {
          const del = el("button", "pl-small", "delete"); del.type = "button";
          del.addEventListener("click", async () => {
            if (del.dataset.sure !== "1") { del.dataset.sure = "1"; del.textContent = "sure?"; return; }
            try { await window.siteDb.removePollComment(c.id); await loadComments(); } catch (e) { del.textContent = "couldn't"; }
          });
          li.appendChild(del);
        }
        list.appendChild(li);
      });
      const r = results[id] || (results[id] = { mine: null, counts: null, comments: 0 });
      r.comments = rows.length; render();
      note.textContent = rows.length ? "" : "no comments yet. be the first.";
    } catch (e) { if (cPoll && cPoll.id === id) note.textContent = "couldn't load the comments right now."; }
  }
  function openComments(p) {
    if (!cDlg) return;
    cPoll = p;
    $("pl-cm-title").textContent = p.question;
    $("pl-cm-list").innerHTML = "";
    $("pl-cm-note").textContent = "";
    $("pl-cm-body").value = "";
    cDlg.hidden = false;
    loadComments();
    $("pl-cm-body").focus();
  }
  function closeComments() { if (!cDlg || cDlg.hidden) return false; cDlg.hidden = true; cPoll = null; return true; }
  if (cDlg) {
    $("pl-cm-close").addEventListener("click", closeComments);
    $("pl-cm-backdrop").addEventListener("click", closeComments);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && closeComments()) e.stopImmediatePropagation(); }, true);   // (Esc closes just this window, not the one under it)
    $("pl-cm-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!cPoll) return;
      const note = $("pl-cm-note"), send = $("pl-cm-send");
      const body = $("pl-cm-body").value.trim(), name = $("pl-cm-name").value.trim().slice(0, 24);
      if (!body) { note.textContent = "write something first"; return; }
      let last = 0; try { last = Number(localStorage.getItem("poll-last-comment")) || 0; } catch (err) {}
      const wait = REPLY_COOLDOWN - (Date.now() - last);
      if (wait > 0) { note.textContent = "one comment every 20 seconds, please. try again in " + Math.ceil(wait / 1000) + "s"; return; }
      send.disabled = true; note.textContent = "sending...";
      try {
        const res = await fetch(BASE + "/rest/v1/poll_comments", { method: "POST", headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }), body: JSON.stringify({ poll_id: cPoll.id, name, body }) });
        if (!res.ok) throw new Error("comment " + res.status);
        try { localStorage.setItem("poll-last-comment", String(Date.now())); } catch (err) {}
        $("pl-cm-body").value = "";
        await loadComments();
      } catch (err) {
        note.textContent = "couldn't send that right now. try again in a bit.";
      } finally { send.disabled = false; }
    });
  }

  // ----- pinned posts -----
  const pinBox = $("cm-pins");
  function pollPin(p) { return pins.filter((x) => x.poll_id !== null && x.poll_id !== undefined && String(x.poll_id) === String(p.id))[0] || null; }
  async function loadPins() {
    try {
      const res = await fetch(BASE + "/rest/v1/pinned_posts?select=id,created_at,title,body,post_id,poll_id,image_url,author&order=created_at.desc&limit=10", { headers: headers() });
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
    syncPinBtn();
    pins.forEach((x) => {
      const wrap = el("div", "pn-wrap");
      const row = el("button", "pn-row"); row.type = "button";
      row.setAttribute("aria-haspopup", "dialog");
      row.appendChild(el("span", "pl-meta pn-tag", "pinned"));
      row.appendChild(el("span", "pn-title", x.title));
      if (x.poll_id) row.appendChild(el("span", "pn-peek", "poll \u00b7 " + (x.body ? x.body.replace(/\s+/g, " ") : "tap to vote")));
      else if (x.body) row.appendChild(el("span", "pn-peek", x.body.replace(/\s+/g, " ")));
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
    if (viewPollId !== null && !viewDirect && !pins.some((x) => String(x.poll_id) === String(viewPollId)) && viewDlg && !viewDlg.hidden) closePin();   // (it got unpinned while open)
    render();                                          // (polls that are pinned move out of the list below)
  }
  // a pinned poll opens as the real poll (so people can vote right there); it redraws whenever the votes change
  function refreshPollView() {
    const holder = $("cm-pin-view-poll");
    if (!holder || viewPollId === null || !viewDlg || viewDlg.hidden) return;
    const poll = polls.filter((p) => String(p.id) === String(viewPollId))[0];
    holder.innerHTML = "";
    if (poll) holder.appendChild(buildPoll(poll));
  }
  function openPin(x, from) {
    if (!viewDlg) return;
    if (from) viewDirect = false;
    viewFrom = from || null;
    const asPoll = x.poll_id !== null && x.poll_id !== undefined && polls.some((p) => String(p.id) === String(x.poll_id));
    viewPollId = asPoll ? x.poll_id : null;
    ["cm-pin-view-title", "cm-pin-view-body", "cm-pin-view-meta"].forEach((id) => { $(id).hidden = asPoll; });
    $("cm-pin-view-poll").hidden = !asPoll;
    if (asPoll) { $("cm-pin-view-img").hidden = true; viewDlg.hidden = false; refreshPollView(); $("cm-pin-view-close").focus(); return; }
    $("cm-pin-view-title").textContent = x.title;
    $("cm-pin-view-body").textContent = x.body || "";
    const img = $("cm-pin-view-img");
    if (x.image_url && /^https:\/\/[^\s]{4,500}$/.test(x.image_url)) { img.referrerPolicy = "no-referrer"; img.src = x.image_url; img.hidden = false; } else { img.hidden = true; img.removeAttribute("src"); }
    $("cm-pin-view-meta").textContent = [x.author, x.created_at ? dateText(new Date(x.created_at)) : ""].filter(Boolean).join(" \u00b7 ");
    viewDlg.hidden = false;
    $("cm-pin-view-close").focus();
  }
  function closePin() {
    if (viewDlg.hidden) return;
    if (linkedId() !== null) { try { history.replaceState(null, "", location.pathname + location.search + "#community"); } catch (e) {} }   // (so a refresh doesn't pop it open again)
    viewDirect = false; viewDlg.hidden = true; viewPollId = null; const ph = $("cm-pin-view-poll"); if (ph) ph.innerHTML = ""; if (viewFrom && document.contains(viewFrom)) viewFrom.focus(); }
  if (viewDlg) {
    $("cm-pin-view-close").addEventListener("click", closePin);
    $("cm-pin-view-backdrop").addEventListener("click", closePin);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePin(); });
  }
  // ----- owner only: the "pin" button on an opened post (next to "+ add reply") -----
  const pinBtn = $("cm-pin-btn"), pinNote = $("cm-pin-note"), pinDlg = $("cm-pin-dlg"), pinForm = $("cm-pin-form");
  let current = null;                                    // the post that's open in the thread window
  const pinOf = (post) => (post ? pins.filter((x) => x.post_id === String(post.id))[0] : null);
  function syncPinBtn() {
    if (!pinBtn) return;
    pinBtn.hidden = !owner || !current;
    if (pinNote) pinNote.textContent = "";
    pinBtn.textContent = pinOf(current) ? "unpin" : "pin";
  }
  window.addEventListener("cm-thread-open", (e) => { current = e.detail; syncPinBtn(); });
  if (pinBtn && pinDlg && pinForm) {
    const tIn = $("cm-pin-title"), peek = $("cm-pin-peek"), pMsg = $("cm-pin-msg"), pSend = $("cm-pin-send");
    const syncPinOwner = (on) => { if (!on) pinDlg.hidden = true; renderPins(); syncPinBtn(); };
    window.addEventListener("ownermode", (e) => syncPinOwner(!!e.detail));
    const snippet = (post) => String((post && post.body) || "").replace(/\s+/g, " ").trim();
    pinBtn.addEventListener("click", async () => {
      if (!current) return;
      const mine = pinOf(current);
      if (mine) {                                        // already pinned: this unpins it
        try { await window.siteDb.removePin(mine.id); await loadPins(); } catch (e) { pinNote.textContent = "couldn't unpin (still signed in?)"; }
        return;
      }
      if (pins.length >= MAX_PINS) { pinNote.textContent = "you already have " + MAX_PINS + " pinned. unpin one first (the \"unpin\" next to it at the top)."; return; }
      pinNote.textContent = ""; pMsg.textContent = "";
      const text = snippet(current);
      peek.textContent = text ? "\u201c" + (text.length > 90 ? text.slice(0, 90) + "\u2026" : text) + "\u201d" : (current.image_url ? "a photo post" : "");
      tIn.value = text ? text.slice(0, 40).replace(/\s+\S*$/, (m) => (text.length > 40 ? "" : m)) : "a photo from the board";
      pinDlg.hidden = false; tIn.focus(); tIn.select();
    });
    const closePinDlg = () => { if (pinDlg.hidden) return; pinDlg.hidden = true; pinBtn.focus(); };
    $("cm-pin-cancel").addEventListener("click", closePinDlg);
    $("cm-pin-backdrop").addEventListener("click", closePinDlg);
    pinForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = tIn.value.trim();
      if (!title) { pMsg.textContent = "give it a title first."; return; }
      if (pins.length >= MAX_PINS) { pMsg.textContent = "you already have " + MAX_PINS + " pinned. unpin one first."; return; }
      if (!window.siteDb || !window.siteDb.addPin || !current) { pMsg.textContent = "sign in as the owner first."; return; }
      pSend.disabled = true; pMsg.textContent = "pinning...";
      try {
        await window.siteDb.addPin({ title, body: String(current.body || "").slice(0, 2000), post_id: String(current.id), image_url: current.image_url || null, author: String(current.name || "").slice(0, 24) || null });
        pinDlg.hidden = true; pMsg.textContent = "";
        await loadPins();
      } catch (err) {
        const why = String(err && err.message);
        pMsg.textContent = /only 3/.test(why) ? "you already have 3 pinned. unpin one first." : /pinned_posts|schema cache|relation|column|404/.test(why) ? "the pinned posts table needs updating. run supabase-polls.sql in Supabase again." : "couldn't pin that. are you still signed in?";
      } finally { pSend.disabled = false; }
    });
  }

  // load when the community page opens (and again if it's been a minute)
  function onShow() {
    if (!onCommunity()) return;
    if (!loadedAt || Date.now() - loadedAt > 60000) { load(); loadPins(); }
    else openLinked();
  }
  window.addEventListener("hashchange", onShow);
  onShow();
  setInterval(() => { if (onCommunity() && polls.some((p) => endsAt(p))) render(); }, 30000);   // (a poll flips to "closed" on its own when its time passes)
})();
