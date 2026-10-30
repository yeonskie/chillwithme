// ---------- Announcements (the megaphone) ----------
// Announcements live in Supabase (see supabase-announcements.sql). To post one, open the "announcements" table in the
// Supabase dashboard (Table Editor) and insert a row: "body" is the message, "title" is optional. Untick "active" to take it down.
//
// The megaphone shows above the ticket on the home page and next to refresh / return / home everywhere else. It only
// appears when there's something to read, and a little dot says there's something you haven't opened yet.
// In the pop-up, every announcement has two buttons: "understood" (close) and "hide this" (gone for good, on this browser).
// "see all" (top left) lists every announcement, hidden ones too; tap a row to read it.

(function () {
  const pop = document.getElementById("ann-pop");
  const list = document.getElementById("ann-list");
  const allBtn = document.getElementById("ann-all"), closeBtn = document.getElementById("ann-close"), titleEl = document.getElementById("ann-title");
  const buttons = Array.from(document.querySelectorAll("[data-ann]"));
  if (!pop || !list || !buttons.length) return;
  if (typeof COMMUNITY === "undefined" || !COMMUNITY.url || !COMMUNITY.key) return;   // the online part isn't set up

  const MAX_SHOWN = 3;                       // newest few show up first; "all announcements" has the rest
  const REFRESH_MS = 2 * 60 * 1000;          // look for news at most this often while the tab is open
  const read = (k) => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  let items = [];                            // everything the database sent (newest first)
  let lastLoad = 0;
  const hidden = () => read("ann-hidden");
  const seen = () => read("ann-seen");
  const visible = () => { const h = hidden(); return items.filter((a) => h.indexOf(a.id) === -1).slice(0, MAX_SHOWN); };

  // ----- reactions: heart / thumbs up / party popper, once each per browser (tap again to undo) -----
  const KINDS = [["heart", "\u2764\uFE0F", "heart"], ["thumbs", "\uD83D\uDC4D", "thumbs up"], ["party", "\uD83C\uDF89", "celebrate"]];
  let me = ""; try { me = localStorage.getItem("ann-me") || ""; } catch (e) {}
  if (me.length < 8) { me = "a" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); try { localStorage.setItem("ann-me", me); } catch (e) {} }
  let reacts = {};                           // { announcement id: { heart: {n, mine}, ... } }
  const slot = (id, kind) => ((reacts[id] = reacts[id] || {})[kind] = reacts[id][kind] || { n: 0, mine: false });
  async function rpc(fn, args) {
    const res = await fetch(COMMUNITY.url.replace(/\/$/, "") + "/rest/v1/rpc/" + fn, { method: "POST", headers: { apikey: COMMUNITY.key, "Content-Type": "application/json" }, body: JSON.stringify(args) });
    if (!res.ok) throw new Error("rpc " + res.status);
    return res.status === 204 ? null : res.json();
  }
  async function loadReacts() {
    try {
      const rows = await rpc("ann_reactions", { p_client: me });
      if (!Array.isArray(rows)) return;
      reacts = {};
      rows.forEach((r) => { const s = slot(r.ann, r.kind); s.n = +r.n || 0; s.mine = !!r.mine; });
      if (!pop.hidden) build();
    } catch (e) { /* no reactions yet (the sql wasn't run?): the announcements still work */ }
  }
  function reactBar(a) {
    const bar = document.createElement("div");
    bar.className = "ann-react";
    KINDS.forEach(([kind, icon, label]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "ann-rx"; b.setAttribute("aria-label", label);
      const paintBtn = () => {
        const s = slot(a.id, kind);
        b.setAttribute("aria-pressed", s.mine ? "true" : "false");
        b.innerHTML = "";
        const i = document.createElement("span"); i.className = "ann-rx-i"; i.textContent = icon; b.appendChild(i);
        if (s.n > 0) { const n = document.createElement("span"); n.className = "ann-rx-n"; n.textContent = s.n; b.appendChild(n); }
      };
      paintBtn();
      b.addEventListener("click", () => {
        const s = slot(a.id, kind), on = !s.mine;
        s.mine = on; s.n = Math.max(0, s.n + (on ? 1 : -1)); paintBtn();
        rpc("ann_react", { p_ann: a.id, p_kind: kind, p_client: me, p_on: on }).catch(() => {
          s.mine = !on; s.n = Math.max(0, s.n + (on ? -1 : 1)); paintBtn();   // (it didn't go through: put it back)
        });
      });
      bar.appendChild(b);
    });
    return bar;
  }

  function onHome() { const n = location.hash.replace("#", "") || "home"; return n === "home" || !document.querySelector('.page[data-page="' + n + '"]'); }

  // which megaphone shows (home page one or top bar one), and whether the dot is on
  function paint() {
    const v = visible();
    const s = seen();
    const fresh = v.some((a) => s.indexOf(a.id) === -1);
    const home = onHome();
    buttons.forEach((b) => {
      const isHome = b.classList.contains("ann-home");
      b.hidden = !v.length || isHome !== home;
      const dot = b.querySelector(".ann-dot");
      if (dot) dot.hidden = !fresh;
      b.setAttribute("aria-label", fresh ? "announcements (new)" : "announcements");
    });
  }

  // ----- formatting: only a few safe tags get through (bold, italic, underline, strikethrough, lists, line breaks, links) -----
  const TAGS = { B: "b", STRONG: "b", I: "i", EM: "i", U: "u", S: "s", STRIKE: "s", DEL: "s", UL: "ul", OL: "ol", LI: "li", BR: "br" };
  function copyClean(from, to) {
    from.childNodes.forEach((n) => {
      if (n.nodeType === 3) { to.appendChild(document.createTextNode(n.nodeValue)); return; }
      if (n.nodeType !== 1) return;
      const t = n.tagName;
      if (t === "SCRIPT" || t === "STYLE" || t === "TEMPLATE") return;
      if (TAGS[t]) {
        const el = document.createElement(TAGS[t]);
        if (t !== "BR") copyClean(n, el);
        to.appendChild(el);
      } else if (t === "A") {
        const href = n.getAttribute("href") || "";
        if (/^https?:\/\//i.test(href)) {
          const el = document.createElement("a");
          el.href = href; el.target = "_blank"; el.rel = "noopener noreferrer";
          copyClean(n, el);
          to.appendChild(el);
        } else copyClean(n, to);
      } else if (t === "DIV" || t === "P") {          // the editor makes a <div> per line: turn them into line breaks
        if (to.childNodes.length) to.appendChild(document.createElement("br"));
        const only = n.childNodes.length === 1 && n.firstChild.nodeName === "BR";
        if (!only) copyClean(n, to);
      } else copyClean(n, to);                         // anything else: keep its words, drop the tag
    });
  }
  function clean(html) {                               // a safe copy of some html, as a fragment
    const doc = new DOMParser().parseFromString("<body>" + String(html || "") + "</body>", "text/html");
    const frag = document.createDocumentFragment();
    copyClean(doc.body, frag);
    while (frag.lastChild && frag.lastChild.nodeName === "BR") frag.removeChild(frag.lastChild);
    return frag;
  }

  const SIGNED = "yeonskie";                 // every announcement is signed with this
  const fmtDate = (iso) => {                 // 10.30.26 · 4:57 pm (in the visitor's own time)
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const p = (n) => String(n).padStart(2, "0");
    let h = d.getHours();
    const ap = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    return p(d.getMonth() + 1) + "." + p(d.getDate()) + "." + String(d.getFullYear()).slice(2) + " · " + h + ":" + p(d.getMinutes()) + " " + ap;
  };

  function item(a, withHide) {
    const box = document.createElement("article");
    box.className = "ann-item";
    const date = document.createElement("p");
    date.className = "ann-date";
    date.textContent = fmtDate(a.created_at);
    box.appendChild(date);
    if (a.title) {
      const t = document.createElement("h2");
      t.className = "ann-head";
      t.textContent = a.title;
      box.appendChild(t);
    }
    const body = document.createElement("p");
    body.className = "ann-body";
    body.appendChild(clean(a.body));          // cleaned first, so only the safe tags get through
    box.appendChild(body);
    const sign = document.createElement("p");
    sign.className = "ann-sign";
    sign.textContent = "— " + SIGNED;
    box.appendChild(sign);
    box.appendChild(reactBar(a));
    const row = document.createElement("div");
    row.className = "ann-actions";
    const ok = document.createElement("button");
    ok.type = "button"; ok.className = "ann-ok"; ok.textContent = "understood";
    ok.addEventListener("click", close);
    row.appendChild(ok);
    if (withHide) {
      const hide = document.createElement("button");
      hide.type = "button"; hide.className = "ann-hide"; hide.textContent = "hide this";
      hide.addEventListener("click", () => {
        write("ann-hidden", hidden().concat(a.id));
        paint();
        if (visible().length) build(); else close();
      });
      row.appendChild(hide);
    }
    box.appendChild(row);
    return box;
  }

  let view = "latest";                        // "latest" (the newest few), "all" (the menu) or "one" (one picked from the menu)
  function build() { draw(); allBtn.parentNode.hidden = allBtn.hidden; }
  function draw() {
    list.innerHTML = "";
    allBtn.hidden = false;
    if (view === "all") {
      titleEl.textContent = "all announcements";
      allBtn.textContent = "back";
      const menu = document.createElement("div");
      menu.className = "ann-menu";
      items.forEach((a) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "ann-row";
        const d = document.createElement("span"); d.className = "ann-row-date"; d.textContent = fmtDate(a.created_at).split(" · ")[0];
        const t = document.createElement("span"); t.className = "ann-row-title";
        t.textContent = a.title || (clean(a.body).textContent || "").trim().slice(0, 60) || "announcement";
        b.append(d, t);
        b.addEventListener("click", () => { view = "one"; one = a; build(); });
        menu.appendChild(b);
      });
      list.appendChild(menu);
      return;
    }
    titleEl.textContent = "announcements";
    if (view === "one") {
      allBtn.textContent = "see all";
      list.appendChild(item(one, false));
      return;
    }
    allBtn.textContent = "see all";
    allBtn.hidden = items.length <= visible().length;      // only once there's more than what's showing
    visible().forEach((a) => list.appendChild(item(a, true)));
  }
  let one = null;
  allBtn.addEventListener("click", () => { view = view === "all" ? "latest" : "all"; build(); pop.scrollTop = 0; const box = pop.querySelector(".ann-box"); if (box) box.scrollTop = 0; });
  closeBtn.addEventListener("click", close);

  let opener = null;
  function open(from) {
    if (!visible().length) return;
    opener = from || null;
    view = "latest";
    build();
    write("ann-seen", seen().concat(visible().map((a) => a.id).filter((id) => seen().indexOf(id) === -1)));   // opening it clears the dot
    paint();
    pop.hidden = false;
    const first = list.querySelector(".ann-ok");
    if (first) first.focus();
  }
  function close() {
    if (pop.hidden) return;
    pop.hidden = true;
    if (opener && !opener.hidden) opener.focus();
  }

  buttons.forEach((b) => b.addEventListener("click", () => open(b)));
  pop.addEventListener("click", (e) => { if (e.target === pop) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  window.addEventListener("hashchange", () => { paint(); });

  async function load() {
    lastLoad = Date.now();
    try {
      const url = COMMUNITY.url.replace(/\/$/, "") + "/rest/v1/announcements?select=id,created_at,title,body&active=eq.true&order=created_at.desc&limit=" + MAX_SHOWN * 3;
      const res = await fetch(url, { headers: { apikey: COMMUNITY.key } });
      if (!res.ok) return;
      const rows = await res.json();
      if (!Array.isArray(rows)) return;
      items = rows.filter((a) => a && a.id != null && typeof a.body === "string");
      // forget ids that were taken down, so the browser's lists don't grow forever
      const ids = items.map((a) => a.id);
      write("ann-hidden", hidden().filter((id) => ids.indexOf(id) !== -1));
      write("ann-seen", seen().filter((id) => ids.indexOf(id) !== -1));
      paint();
      if (!pop.hidden) { if (visible().length) build(); else close(); }
    } catch (e) { /* offline or not set up: no megaphone */ }
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - lastLoad > REFRESH_MS) { load(); loadReacts(); } });
  load();
  loadReacts();

  // ----- owner only: the + next to refresh writes a new announcement (posting is checked by the database too) -----
  const addBtn = document.getElementById("btn-ann-add"), dlg = document.getElementById("ann-new"), form = document.getElementById("ann-form");
  if (addBtn && dlg && form) {
    const fTitle = document.getElementById("ann-f-title"), fBody = document.getElementById("ann-f-body"), fMsg = document.getElementById("ann-f-msg"), fPost = document.getElementById("ann-f-post");
    const syncOwner = (on) => { addBtn.hidden = !on; if (!on) dlg.hidden = true; };
    window.addEventListener("ownermode", (e) => syncOwner(!!e.detail));
    syncOwner(typeof ownerMode !== "undefined" && ownerMode);
    const closeForm = () => { dlg.hidden = true; addBtn.focus(); };
    addBtn.addEventListener("click", () => { fMsg.textContent = ""; dlg.hidden = false; fTitle.focus(); });
    document.getElementById("ann-f-cancel").addEventListener("click", closeForm);
    // (it only closes with "cancel" or once it's posted, so a stray click outside can't throw away what you were writing)
    // the little toolbar
    const tools = form.querySelector(".ann-tools"), linkRow = document.getElementById("ann-link"), urlIn = document.getElementById("ann-f-url");
    let savedRange = null;
    const inEditor = () => { const s = getSelection(); return s.rangeCount && fBody.contains(s.anchorNode); };
    tools.addEventListener("mousedown", (e) => { if (e.target.closest("button")) e.preventDefault(); });   // keeps your selection while you tap a button
    tools.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      fBody.focus();
      if (b.dataset.cmd) { document.execCommand(b.dataset.cmd); showState(); }
      else if (b.dataset.act === "clear") { document.execCommand("removeFormat"); document.execCommand("unlink"); showState(); }
      else if (b.dataset.act === "link") {
        savedRange = inEditor() ? getSelection().getRangeAt(0).cloneRange() : null;
        linkRow.hidden = !linkRow.hidden;
        if (!linkRow.hidden) { urlIn.value = ""; urlIn.focus(); }
      }
    });
    function addLink() {
      let url = urlIn.value.trim();
      if (!url) { linkRow.hidden = true; return; }
      if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = "https://" + url;
      if (!/^https?:\/\//i.test(url)) { fMsg.textContent = "links need to start with http:// or https://"; return; }
      fMsg.textContent = "";
      fBody.focus();
      if (savedRange) { const s = getSelection(); s.removeAllRanges(); s.addRange(savedRange); }
      if (getSelection().isCollapsed) document.execCommand("insertHTML", false, '<a href="' + url.replace(/"/g, "%22") + '">' + url.replace(/</g, "&lt;") + "</a>");
      else document.execCommand("createLink", false, url);
      linkRow.hidden = true;
    }
    document.getElementById("ann-f-url-ok").addEventListener("click", addLink);
    urlIn.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } });
    function showState() {                              // bold / italic / ... look pressed when your cursor is in bold / italic / ...
      tools.querySelectorAll("[data-cmd]").forEach((b) => { let on = false; try { on = document.queryCommandState(b.dataset.cmd); } catch (e) {} b.setAttribute("aria-pressed", String(on)); });
    }
    document.addEventListener("selectionchange", () => { if (!dlg.hidden && inEditor()) showState(); });
    fBody.addEventListener("paste", (e) => {              // pasting keeps the words but drops the other app's styling
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData("text/plain");
      document.execCommand("insertText", false, text);
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const tmp = document.createElement("div");
      tmp.appendChild(clean(fBody.innerHTML));
      const body = tmp.innerHTML.trim();
      if (!tmp.textContent.trim()) { fMsg.textContent = "write a message first."; return; }
      if (body.length > 4000) { fMsg.textContent = "that's a bit long. shorten it a little."; return; }
      if (!window.siteDb || !window.siteDb.addAnnouncement) { fMsg.textContent = "sign in as the owner first."; return; }
      fPost.disabled = true;
      fMsg.textContent = "posting...";
      try {
        await window.siteDb.addAnnouncement({ title: fTitle.value.trim(), body });
        fTitle.value = ""; fBody.innerHTML = ""; linkRow.hidden = true; fMsg.textContent = "";
        dlg.hidden = true;
        await load();                                  // so the megaphone shows up right away
        const shown = buttons.find((b) => !b.hidden);
        if (shown) open(shown);
      } catch (err) {
        fMsg.textContent = /sg_|announcements|schema cache|relation|404/.test(String(err && err.message)) ? "the announcements table isn't set up yet. run supabase-announcements.sql in Supabase." : "couldn't post that. are you still signed in?";
      } finally {
        fPost.disabled = false;
      }
    });
  }
})();
