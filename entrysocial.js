// ---------- Reactions and comments on thoughts to consume (the entries) ----------
// Under an opened entry: the four reactions (heart / smile / star / sad, once each per browser, tap again to undo) and a comments button.
// Comments open in their own window, can be replied to (threads, see threads.js), and the owner can delete them.
// Needs supabase-entry-social.sql. Until that's run, the entries just look as before.

(function () {
  const $ = (id) => document.getElementById(id);
  const cfg = typeof COMMUNITY !== "undefined" ? COMMUNITY : {};
  const BASE = String(cfg.url || "").trim().replace(/\/+$/, "");
  const KEY = String(cfg.key || "").trim();
  const bar = $("es-social");
  if (!bar || !/^https:\/\/[^\s/]+/i.test(BASE) || KEY.length < 20) return;

  const KINDS = [
    { key: "heart", glyph: "♥", label: "love" },
    { key: "smile", glyph: "☺", label: "smile" },
    { key: "star", glyph: "✦", label: "wow" },
    { key: "sad", glyph: "☹", label: "sad" },
  ];
  const COOLDOWN = 20 * 1000;
  const stats = {};                       // entry id -> { comments, reacts: { heart: 2 }, mine: [] }
  let cur = null;                         // the entry that's open
  let owner = typeof ownerMode !== "undefined" && !!ownerMode;
  window.addEventListener("ownermode", (e) => { owner = !!e.detail; if (cDlg && !cDlg.hidden) loadComments(); });

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
  function me() {                         // the same random browser id the community board uses
    let id = ""; try { id = localStorage.getItem("yb-id") || ""; } catch (e) {}
    if (id.length < 8) { id = "y" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); try { localStorage.setItem("yb-id", id); } catch (e) {} }
    return id;
  }
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const dateText = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : String(d.getMonth() + 1).padStart(2, "0") + "." + String(d.getDate()).padStart(2, "0") + "." + d.getFullYear(); };
  const statOf = (id) => stats[id] || (stats[id] = { comments: 0, reacts: {}, mine: [] });
  const eligible = (en) => !!(en && en.id && en.online && !en.draft);     // (only published online entries; drafts and the old entries.js ones have nothing to react to)

  // ----- the bar under the entry -----
  function draw() {
    bar.innerHTML = "";
    if (!eligible(cur)) { bar.hidden = true; return; }
    bar.hidden = false;
    const st = statOf(cur.id);
    const row = el("div", "es-reacts");
    KINDS.forEach((k) => {
      const on = st.mine.indexOf(k.key) >= 0;
      const b = el("button", "cm-react" + (on ? " cm-react-on" : "")); b.type = "button";
      b.setAttribute("aria-pressed", on ? "true" : "false"); b.setAttribute("aria-label", k.label); b.dataset.tip = k.label;
      b.append(el("span", "cm-react-g", k.glyph), el("span", "cm-react-n", st.reacts[k.key] > 0 ? String(st.reacts[k.key]) : ""));
      b.addEventListener("click", () => toggle(k.key));
      row.appendChild(b);
    });
    bar.appendChild(row);
    const cb = el("button", "es-cbtn", st.comments > 0 ? "comments (" + st.comments + ")" : "add a comment"); cb.type = "button";
    cb.addEventListener("click", openComments);
    bar.appendChild(cb);
  }
  async function loadStats(en) {
    try {
      const rows = await rpc("entry_stats", { p_ids: [en.id], p_voter: me() });
      const s = Array.isArray(rows) ? rows[0] : null;
      if (s) stats[en.id] = { comments: +s.comments || 0, reacts: s.reacts && typeof s.reacts === "object" ? s.reacts : {}, mine: Array.isArray(s.mine) ? s.mine : [] };
      else bar.hidden = true;                           // (not set up yet, or no such entry: show nothing)
    } catch (e) { bar.hidden = true; return; }
    if (cur && cur.id === en.id) draw();
  }
  function toggle(kind) {
    if (!cur) return;
    const id = cur.id, st = statOf(id), was = st.mine.indexOf(kind) >= 0;
    const apply = (on) => { st.mine = st.mine.filter((k) => k !== kind); if (on) st.mine.push(kind); st.reacts[kind] = Math.max(0, (st.reacts[kind] || 0) + (on ? 1 : -1)); if (cur && cur.id === id) draw(); };
    apply(!was);                                       // (shows right away)
    rpc("entry_react", { p_entry: id, p_voter: me(), p_kind: kind, p_on: !was }).catch(() => apply(was));   // (it didn't go through: put it back)
  }
  document.addEventListener("entryshown", (e) => {
    cur = e.detail || null;
    bar.hidden = true;
    if (eligible(cur)) { if (stats[cur.id]) draw(); loadStats(cur); }
  });

  // ----- the comments window -----
  const cDlg = $("es-cm"), list = $("es-cm-list"), note = $("es-cm-note");
  let replyTo = null;
  async function loadComments() {
    if (!cur) return;
    const id = cur.id;
    note.textContent = "loading...";
    try {
      const res = await fetch(BASE + "/rest/v1/entry_comments?select=id,parent_id,created_at,name,body&approved=eq.true&entry_id=eq." + encodeURIComponent(id) + "&order=created_at.asc&limit=300", { headers: headers() });
      if (!res.ok) throw new Error("comments " + res.status);
      const rows = await res.json();
      if (!cur || cur.id !== id) return;
      list.innerHTML = "";
      let ordered = rows.map((r) => ({ row: r, depth: 0, to: null }));
      try { ordered = window.threadOrder(rows); } catch (e) { /* threads.js missing: a plain list */ }
      ordered.forEach((it) => list.appendChild(line(it)));
      statOf(id).comments = rows.length; draw();
      note.textContent = rows.length ? "" : "no comments yet. be the first.";
    } catch (e) { if (cur && cur.id === id) note.textContent = "couldn't load the comments right now."; }
  }
  function line(it) {
    const c = it.row;
    const li = el("li", "cm-reply" + (it.depth ? " cm-reply-nested" : ""));
    if (it.to) li.appendChild(el("p", "cm-reply-to", "↳ replying to " + it.to));
    li.appendChild(el("p", "cm-reply-text", c.body));
    li.appendChild(el("p", "cm-card-meta", [c.name, dateText(c.created_at)].filter(Boolean).join(" · ")));
    const act = el("div", "es-line-acts");
    const re = el("button", "cm-reply-act", "reply"); re.type = "button";
    re.addEventListener("click", () => { setReplyTo(c); $("es-cm-body").focus(); });
    act.appendChild(re);
    if (owner) {
      const del = el("button", "cm-reply-act", "delete"); del.type = "button";
      del.addEventListener("click", async () => {
        if (del.dataset.sure !== "1") { del.dataset.sure = "1"; del.textContent = "sure?"; return; }
        try { await window.siteDb.removeEntryComment(c.id); await loadComments(); } catch (e) { del.textContent = "couldn't"; }
      });
      act.appendChild(del);
    }
    li.appendChild(act);
    return li;
  }
  function setReplyTo(c) {
    replyTo = c && c.id ? c : null;
    const who = $("es-cm-to");
    if (!replyTo) { who.hidden = true; return; }
    const snip = String(replyTo.body || "").replace(/\s+/g, " ").trim();
    who.firstChild.textContent = "↳ replying to " + (replyTo.name || "someone") + ": “" + (snip.length > 50 ? snip.slice(0, 50) + "…" : snip) + "” ";
    who.hidden = false;
  }
  function openComments() {
    if (!cur || !cDlg) return;
    $("es-cm-title").textContent = cur.title || "this entry";
    list.innerHTML = ""; note.textContent = ""; $("es-cm-body").value = ""; setReplyTo(null);
    cDlg.hidden = false;
    loadComments();
  }
  function closeComments() { if (!cDlg || cDlg.hidden) return false; cDlg.hidden = true; return true; }
  if (cDlg) {
    $("es-cm-close").addEventListener("click", closeComments);
    $("es-cm-backdrop").addEventListener("click", closeComments);
    $("es-cm-cancel-reply").addEventListener("click", () => setReplyTo(null));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && closeComments()) { e.stopImmediatePropagation(); } }, true);   // (Esc closes just this window, not the entry under it)
    $("es-cm-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!cur) return;
      const send = $("es-cm-send");
      const body = $("es-cm-body").value.trim(), name = $("es-cm-name").value.trim().slice(0, 24);
      if (!body) { note.textContent = "write something first"; return; }
      let last = 0; try { last = Number(localStorage.getItem("entry-last-comment")) || 0; } catch (err) {}
      const wait = COOLDOWN - (Date.now() - last);
      if (wait > 0) { note.textContent = "one comment every 20 seconds, please. try again in " + Math.ceil(wait / 1000) + "s"; return; }
      send.disabled = true; note.textContent = "sending...";
      try {
        const row = replyTo ? { entry_id: cur.id, parent_id: replyTo.id, name, body } : { entry_id: cur.id, name, body };
        const res = await fetch(BASE + "/rest/v1/entry_comments", { method: "POST", headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }), body: JSON.stringify(row) });
        if (!res.ok) throw new Error("comment " + res.status);
        try { localStorage.setItem("entry-last-comment", String(Date.now())); } catch (err) {}
        $("es-cm-body").value = ""; setReplyTo(null);
        await loadComments();
      } catch (err) {
        note.textContent = "couldn't send that right now. try again in a bit.";
      } finally { send.disabled = false; }
    });
  }
})();
