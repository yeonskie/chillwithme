// ---------- Journal: entries stored online, and a secret way for ONLY YOU to add more ----------
// - Everyone sees the entries from entries.js plus the ones stored in Supabase (the "entries" table).
// - Only you can add, edit or delete online entries. To sign in, tap the date in the bottom right
//   corner 5 times quickly. A box asks for your email and password. Once you're in, a "+" shows up
//   next to "shuffle", and every online entry gets "edit" and "delete" buttons.
// - This is not just hidden buttons: the database itself refuses writes from anyone who isn't
//   you (see supabase-journal.sql). Even if a visitor finds the box, they can't do anything.
// - Nothing secret is stored in this file. Your password is never saved, only a login token
//   in YOUR browser, which you can clear with "sign out".

(function () {
  const $ = (id) => document.getElementById(id);
  const cfg = typeof COMMUNITY !== "undefined" ? COMMUNITY : {};
  const BASE = String(cfg.url || "").trim().replace(/\/+$/, "");
  const KEY = String(cfg.key || "").trim();
  const configured = /^https:\/\/[^\s/]+/i.test(BASE) && KEY.length > 20;

  const TAPS = 5, TAP_WINDOW_MS = 3000;           // the secret: 5 taps on the date within 3 seconds
  const SESSION_KEY = "journal-session";
  const DATE_RE = /^\d{2}\.\d{2}\.\d{4}$/;

  const fileEntries = typeof ENTRIES !== "undefined" ? ENTRIES.slice() : [];
  let onlineEntries = [];
  let session = null;                              // { access_token, refresh_token, expires_at, email }
  let isOwner = false;
  let editingId = null;                            // null = writing a new entry
  let shown = null;                                // the entry open in the big card

  const addBtn = $("entry-add"), editBtn = $("btn-edit"), delBtn = $("btn-delete");
  const dialog = $("entry-dialog"), form = $("entry-form"), msg = $("entry-msg"), saveBtn = $("entry-save");
  const ownerDialog = $("owner-dialog"), ownerForm = $("owner-form"), ownerMsg = $("owner-msg");

  // ----- remembering the login (in this browser only) -----
  function loadSession() {
    try { session = JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch (e) { session = null; }
  }
  function saveSession() {
    try {
      if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }

  // ----- talking to Supabase -----
  async function request(path, options, token) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    try {
      const headers = { apikey: KEY, "Content-Type": "application/json", ...((options && options.headers) || {}) };
      if (token) headers.Authorization = "Bearer " + token;
      else if (/^eyJ/.test(KEY)) headers.Authorization = "Bearer " + KEY;
      const res = await fetch(BASE + path, { ...options, headers, signal: ctl.signal });
      if (!res.ok) {
        let why = "";
        try { const j = await res.json(); why = j.message || j.msg || j.error_description || j.error || ""; } catch (e) {}
        const err = new Error(res.status + (why ? ": " + why : ""));
        err.status = res.status;
        throw err;
      }
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  function takeTokens(data, email) {
    session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
      email: email || (data.user && data.user.email) || (session && session.email) || "",
    };
    saveSession();
  }

  async function refreshSession() {
    if (!session || !session.refresh_token) throw new Error("no session");
    const res = await request("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    takeTokens(await res.json());
  }

  // a token that works: refreshes it first if it is about to run out
  async function goodToken() {
    if (!session) throw new Error("not signed in");
    if (session.expires_at - Math.floor(Date.now() / 1000) < 60) await refreshSession();
    return session.access_token;
  }

  // a request as you (signed in). if the login turned out to be too old it retries once
  async function asOwner(path, options) {
    try {
      return await request(path, options, await goodToken());
    } catch (e) {
      if (e.status === 401 && session) {
        await refreshSession();
        return await request(path, options, session.access_token);
      }
      throw e;
    }
  }

  // asks the database whether this login is really the owner (the database makes the real decision)
  async function checkOwner() {
    try {
      const res = await asOwner("/rest/v1/rpc/is_owner", { method: "POST", body: "{}" });
      return (await res.json()) === true;
    } catch (e) {
      return false;
    }
  }

  // ----- the list of entries -----
  function sortKey(date) {
    const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(date || ""));
    return m ? Number(m[3] + m[1] + m[2]) : 0;
  }

  function showAll() {
    const all = [...onlineEntries, ...fileEntries];
    all.sort((a, b) => sortKey(b.date) - sortKey(a.date));     // newest first (stable, so ties keep their order)
    setEntries(all);
  }

  async function loadOnline() {
    if (!configured) return;
    try {
      const res = await request("/rest/v1/entries?select=id,title,entry_date,body&order=created_at.desc&limit=500", { method: "GET" });
      const rows = await res.json();
      onlineEntries = rows.map((r) => ({ id: r.id, title: r.title || "", date: r.entry_date || "", text: r.body || "", online: true }));
      showAll();
    } catch (e) {
      // can't reach the database: the entries from entries.js are still there
    }
  }

  // ----- moodboards stored online (boards and boxes you made on the website) -----
  let hadBoards = false;

  async function loadBoards(force) {
    if (!configured) return;
    try {
      const [boardRows, itemRows, metaRows] = await Promise.all([
        request("/rest/v1/boards?select=name&order=created_at.asc&limit=100", { method: "GET" }).then((r) => r.json()),
        request("/rest/v1/board_items?select=id,board_name,item&order=created_at.asc&limit=2000", { method: "GET" }).then((r) => r.json()),
        // descriptions and the order you set (supabase-board-meta.sql); if that hasn't been run yet, the boards still load
        request("/rest/v1/board_meta?select=board_name,title,description,position,layout,layout_at&limit=500", { method: "GET" }).then((r) => r.json()).catch(() => []),
      ]);
      const meta = (Array.isArray(metaRows) ? metaRows : []).filter((m) => m && typeof m.board_name === "string");
      const names = boardRows.map((r) => r.name).filter((n) => typeof n === "string");
      const items = itemRows.filter((r) => r && r.item && typeof r.item === "object" && typeof r.board_name === "string");
      if (!force && !hadBoards && !names.length && !items.length && !meta.length) return;      // nothing online: leave the page as it is
      hadBoards = true;
      setOnlineBoards(names, items, meta);
    } catch (e) {
      // can't reach the database: moodboards.js still shows
    }
  }

  // pictures you upload live in a public storage bucket called "moodboard" (see supabase-moodboards.sql)
  const BUCKET = "moodboard";
  const PUBLIC = "/storage/v1/object/public/" + BUCKET + "/";

  // when a box with an uploaded picture is removed, its file goes too (pictures from web addresses are left alone)
  async function dropFile(src) {
    const s = String(src || "");
    if (!s.startsWith(BASE + PUBLIC)) return;
    try {
      await asOwner("/storage/v1/object/" + BUCKET + "/" + s.slice((BASE + PUBLIC).length), { method: "DELETE" });
    } catch (e) {
      // a leftover file is harmless
    }
  }

  // adds or updates the settings rows (one per moodboard), keeping any column that isn't mentioned
  async function upsertMeta(rows) {
    await asOwner("/rest/v1/board_meta?on_conflict=board_name", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows),
    });
  }

  // what script.js calls when you add or remove something for everyone (the database only accepts you)
  window.siteDb = {
    async addItem(boardName, item) {
      await asOwner("/rest/v1/board_items", { method: "POST", body: JSON.stringify({ board_name: boardName, item }) });
      await loadBoards(true);
    },
    // saves a picture file online (the "moodboard" storage bucket) and gives back its public address
    async uploadImage(blob) {
      const ext = blob.type === "image/gif" ? "gif" : "jpg";
      const name = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
      await asOwner("/storage/v1/object/" + BUCKET + "/" + name, {
        method: "POST",
        headers: { "Content-Type": blob.type || "image/jpeg" },
        body: blob,
      });
      return BASE + PUBLIC + name;
    },
    async removeItem(id, src) {
      await asOwner("/rest/v1/board_items?id=eq." + encodeURIComponent(id), { method: "DELETE" });
      await dropFile(src);
      await loadBoards(true);
    },
    async addBoard(name) {
      await asOwner("/rest/v1/boards", { method: "POST", body: JSON.stringify({ name }) });
      await loadBoards(true);
    },
    // a moodboard's name as shown to everyone (empty puts back its own name)
    async saveTitle(name, title) {
      await upsertMeta([{ board_name: name, title: title || null }]);
      await loadBoards(true);
    },
    // a moodboard's description (for everyone). empty puts back the one from moodboards.js, if there is one
    async saveDescription(name, text) {
      await upsertMeta([{ board_name: name, description: text || null }]);
      await loadBoards(true);
    },
    // the order of the shared moodboards: a list of their names, first to last
    async saveOrder(names) {
      await upsertMeta(names.map((n, i) => ({ board_name: n, position: i })));
      await loadBoards(true);
    },
    // how a moodboard's boxes are arranged, for everyone (rows of box ids); null puts it back to the default
    async saveLayout(name, rows, at) {
      await upsertMeta([{ board_name: name, layout: rows, layout_at: at }]);
    },
    async removeBoard(name, srcs) {
      await asOwner("/rest/v1/board_meta?board_name=eq." + encodeURIComponent(name), { method: "DELETE" }).catch(() => {});
      await asOwner("/rest/v1/board_items?board_name=eq." + encodeURIComponent(name), { method: "DELETE" });
      await asOwner("/rest/v1/boards?name=eq." + encodeURIComponent(name), { method: "DELETE" });
      for (const src of srcs || []) await dropFile(src);
      await loadBoards(true);
    },
  };

  // ----- owner mode on / off -----
  function updateOwnerUI() {
    addBtn.hidden = !isOwner;
    const canEdit = isOwner && shown && shown.online;
    editBtn.hidden = delBtn.hidden = !canEdit;
  }

  async function setOwner(on) {
    isOwner = on;
    updateOwnerUI();
    setOwnerMode(on);       // the moodboard page shows or hides its owner buttons
  }

  document.addEventListener("entryshown", (e) => {
    shown = e.detail;
    updateOwnerUI();
  });

  // ----- the secret: tap the date 5 times -----
  let taps = [];
  $("today").addEventListener("click", () => {
    const now = Date.now();
    taps = taps.filter((t) => now - t < TAP_WINDOW_MS);
    taps.push(now);
    if (taps.length >= TAPS) {
      taps = [];
      openOwnerDialog();
    }
  });

  // ----- sign in / sign out box -----
  function openOwnerDialog() {
    ownerMsg.textContent = "";
    $("owner-pass").value = "";
    if (isOwner) {
      $("owner-title").textContent = "hello you";
      $("owner-sub").textContent = "you're signed in" + (session && session.email ? " as " + session.email : "") + ".";
      $("owner-fields").hidden = true;
      $("owner-go").textContent = "sign out";
    } else {
      $("owner-title").textContent = "owner sign in";
      $("owner-sub").textContent = configured ? "" : "the database isn't set up yet (see community-config.js).";
      $("owner-fields").hidden = false;
      $("owner-go").textContent = "sign in";
    }
    ownerDialog.hidden = false;
    (isOwner ? $("owner-go") : $("owner-email")).focus();
  }

  function closeOwnerDialog() { ownerDialog.hidden = true; }

  ownerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isOwner) {
      session = null;
      saveSession();
      await setOwner(false);
      closeOwnerDialog();
      return;
    }
    if (!configured) { ownerMsg.textContent = "the database isn't set up yet."; return; }
    const email = $("owner-email").value.trim(), pass = $("owner-pass").value;
    if (!email || !pass) { ownerMsg.textContent = "type your email and password."; return; }
    $("owner-go").disabled = true;
    ownerMsg.textContent = "signing in...";
    try {
      const res = await request("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: JSON.stringify({ email, password: pass }),
      });
      takeTokens(await res.json(), email);
      if (await checkOwner()) {
        $("owner-pass").value = "";
        await setOwner(true);
        closeOwnerDialog();
      } else {
        session = null;
        saveSession();
        ownerMsg.textContent = "that didn't work.";
      }
    } catch (err) {
      session = null;
      saveSession();
      ownerMsg.textContent = "that didn't work.";
    } finally {
      $("owner-go").disabled = false;
    }
  });
  $("owner-cancel").addEventListener("click", closeOwnerDialog);
  $("owner-backdrop").addEventListener("click", closeOwnerDialog);

  // ----- the editor -----
  function todayText() {
    const d = new Date();
    return String(d.getMonth() + 1).padStart(2, "0") + "." + String(d.getDate()).padStart(2, "0") + "." + d.getFullYear();
  }

  function openEditor(entry) {
    editingId = entry ? entry.id : null;
    $("entry-dialog-title").textContent = entry ? "edit entry" : "new entry";
    $("entry-title").value = entry ? entry.title : "";
    $("entry-date").value = entry ? entry.date : todayText();
    $("entry-text").value = entry ? entry.text : "";
    msg.textContent = "";
    dialog.hidden = false;
    $("entry-title").focus();
  }

  function closeEditor() { dialog.hidden = true; }

  addBtn.addEventListener("click", () => openEditor(null));
  editBtn.addEventListener("click", () => {
    const entry = shown;
    closeFeatured();
    if (entry && entry.online) openEditor(entry);
  });

  delBtn.addEventListener("click", async () => {
    const entry = shown;
    if (!entry || !entry.online) return;
    const yes = await askConfirm('delete "' + (entry.title || "this entry") + '"? this can\'t be undone.', "delete");
    if (!yes) return;
    try {
      await asOwner("/rest/v1/entries?id=eq." + encodeURIComponent(entry.id), { method: "DELETE" });
      closeFeatured();
      await loadOnline();
    } catch (e) {
      alertLater("couldn't delete that: " + e.message);
    }
  });

  // a tiny message in the toolbar spot when something goes wrong outside a dialog
  function alertLater(text) {
    askConfirm(text, "ok");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = $("entry-title").value.trim();
    const date = $("entry-date").value.trim();
    const text = $("entry-text").value.trim();
    if (!title && !text) { msg.textContent = "write a title or some words first."; return; }
    if (!DATE_RE.test(date)) { msg.textContent = "date should look like 10.12.2026"; return; }
    saveBtn.disabled = true;
    msg.textContent = "saving...";
    const row = { title, entry_date: date, body: text };
    try {
      if (editingId) {
        await asOwner("/rest/v1/entries?id=eq." + encodeURIComponent(editingId), { method: "PATCH", body: JSON.stringify(row) });
      } else {
        await asOwner("/rest/v1/entries", { method: "POST", body: JSON.stringify(row) });
      }
      closeEditor();
      await loadOnline();
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        msg.textContent = "you're not signed in anymore. tap the date 5 times to sign in again.";
        session = null; saveSession(); setOwner(false);
      } else {
        msg.textContent = "couldn't save that right now (" + err.message + ")";
      }
    } finally {
      saveBtn.disabled = false;
    }
  });
  $("entry-cancel").addEventListener("click", closeEditor);
  $("entry-dialog-backdrop").addEventListener("click", () => {
    // clicking outside only closes it if nothing's been written, so a stray click can't lose your entry
    if (!$("entry-title").value.trim() && !$("entry-text").value.trim()) closeEditor();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!ownerDialog.hidden) closeOwnerDialog();
    else if (!dialog.hidden && $("mb-confirm").hidden) closeEditor();
  });
  window.addEventListener("hashchange", () => { closeOwnerDialog(); closeEditor(); });

  // ----- start -----
  loadSession();
  loadOnline();
  loadBoards();
  if (configured && session) {
    checkOwner().then((ok) => {
      if (ok) setOwner(true);
      else { session = null; saveSession(); }
    });
  }
})();