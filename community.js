// ---------- Community: anyone can post a thought or a photo, and it shows up right away ----------
// Posts live in Supabase (see community-config.js and supabase-setup.sql).
// Visitors can read posts and add new ones, nothing else. You delete or hide posts in the Supabase dashboard.

(function () {
  const $ = (id) => document.getElementById(id);
  const cfg = typeof COMMUNITY !== "undefined" ? COMMUNITY : {};
  const BASE = String(cfg.url || "").trim().replace(/\/+$/, "");
  const KEY = String(cfg.key || "").trim();
  const configured = /^https:\/\/[^\s/]+/i.test(BASE) && KEY.length > 20;

  const PAGE = 30;                       // posts per load
  const COOLDOWN_MS = 60 * 1000;         // one post a minute from the same browser
  const LAST_KEY = "community-last-post";
  const PHOTO_RE = /^https:\/\/[^\s]{4,500}$/;      // photos are web addresses, https only

  const grid = $("cm-grid"), status = $("cm-status"), moreBtn = $("cm-more");
  const dialog = $("cm-dialog"), form = $("cm-form"), msg = $("cm-msg"), sendBtn = $("cm-send");
  const photoInput = $("cm-photo"), preview = $("cm-preview"), addBtn = $("cm-add"), fileInput = $("cm-file");

  let posts = [];
  let loadedAt = 0;
  let loading = false;
  let photoOk = "";                      // the picture address that has been checked and works
  let pendingBlob = null;                // a photo picked from the device, shrunk and waiting to be sent with the post
  let pendingUrl = "";                   // its preview address (freed when it's no longer needed)
  const BUCKET = "community-photos";
  const MAX_FILE_BYTES = 8 * 1024 * 1024;   // files bigger than this are turned away before trying
  let statusTimer = null;

  // ----- talking to Supabase -----
  function headers(extra) {
    const h = { apikey: KEY, ...extra };
    if (/^eyJ/.test(KEY)) h.Authorization = "Bearer " + KEY;      // older keys are tokens; newer ones go in apikey only
    return h;
  }

  async function api(path, options) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    try {
      const res = await fetch(BASE + path, { ...options, signal: ctl.signal });
      if (!res.ok) {
        let why = "";                                   // Supabase says what went wrong; keep it so we can show it
        try { const j = await res.json(); why = j.message || j.error || j.hint || ""; } catch (e) {}
        throw new Error(res.status + (why ? ": " + why : ""));
      }
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  // ----- showing posts -----
  function say(text, keep) {
    status.textContent = text;
    clearTimeout(statusTimer);
    if (!keep && text) statusTimer = setTimeout(() => { status.textContent = ""; }, 6000);
  }

  function dateText(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return String(d.getMonth() + 1).padStart(2, "0") + "." + String(d.getDate()).padStart(2, "0") + "." + d.getFullYear();
  }

  function buildCard(p) {
    const card = document.createElement("article");
    card.className = "cm-card";
    if (p.image_url && PHOTO_RE.test(p.image_url)) {
      const img = document.createElement("img");
      img.loading = "lazy";
      img.alt = p.body ? "" : "a photo someone shared";
      img.referrerPolicy = "no-referrer";       // don't tell the picture's host which page it's on
      img.addEventListener("error", () => {      // a picture that no longer loads just disappears
        img.remove();
        if (!card.querySelector("p:not(.cm-card-meta)") && !card.querySelector("img")) card.remove();
      });
      img.src = p.image_url;
      card.appendChild(img);
    }
    const box = document.createElement("div");
    box.className = "cm-card-text";
    if (p.body) {
      const text = document.createElement("p");
      text.textContent = p.body;
      box.appendChild(text);
    }
    const meta = document.createElement("p");
    meta.className = "cm-card-meta";
    meta.textContent = [p.name, dateText(p.created_at)].filter(Boolean).join(" · ");
    box.appendChild(meta);
    card.appendChild(box);
    return card;
  }

  function render() {
    grid.innerHTML = "";
    posts.forEach((p) => grid.appendChild(buildCard(p)));
    if (!posts.length && !loading && loadedAt) say("nothing here yet. be the first.", true);
  }

  async function load(append) {
    if (!configured) return;
    if (loading) return;
    loading = true;
    moreBtn.hidden = true;
    say("loading...", true);
    try {
      const offset = append ? posts.length : 0;
      const res = await api(
        "/rest/v1/posts?select=id,created_at,name,body,image_url&approved=eq.true&order=created_at.desc&limit=" + PAGE + "&offset=" + offset,
        { headers: headers() }
      );
      const rows = (await res.json()).filter((p) => p && typeof p.id === "string");
      posts = append ? posts.concat(rows) : rows;
      loadedAt = Date.now();
      loading = false;
      say("", true);
      render();
      moreBtn.hidden = rows.length < PAGE;
    } catch (e) {
      loading = false;
      say("couldn't load the community right now. try again in a bit.", true);
      render();
    }
  }

  // load when someone opens the page (and again if it's been a minute)
  function onShow() {
    if (location.hash !== "#community") return;
    if (!configured) {
      say("the community isn't set up yet. check back soon.", true);
      return;
    }
    if (!loadedAt || Date.now() - loadedAt > 60000) load(false);
  }

  window.addEventListener("hashchange", onShow);
  $("cm-refresh").addEventListener("click", () => load(false));
  moreBtn.addEventListener("click", () => load(true));
  onShow();

  // ----- the add box -----
  function openDialog() {
    if (!configured) { say("the community isn't set up yet. check back soon.", true); return; }
    form.reset();
    photoOk = "";
    clearPending();
    preview.hidden = true;
    preview.removeAttribute("src");
    msg.textContent = "";
    dialog.hidden = false;
    $("cm-body").focus();
  }

  function closeDialog() {
    if (dialog.hidden) return;
    dialog.hidden = true;
    addBtn.focus();
  }

  addBtn.addEventListener("click", openDialog);
  $("cm-cancel").addEventListener("click", closeDialog);
  $("cm-dialog-backdrop").addEventListener("click", closeDialog);
  dialog.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDialog(); });
  window.addEventListener("hashchange", closeDialog);

  // checks that a picture address really is a picture that loads
  function checkPhoto(url) {
    return new Promise((resolve) => {
      if (!PHOTO_RE.test(url)) return resolve(false);
      const img = new Image();
      const done = (ok) => { clearTimeout(timer); resolve(ok); };
      const timer = setTimeout(() => done(false), 10000);
      img.onload = () => done(!!(img.naturalWidth && img.naturalHeight));
      img.onerror = () => done(false);
      img.referrerPolicy = "no-referrer";
      img.src = url;
    });
  }

  function photoProblem(url) {
    return /^http:\/\//i.test(url)
      ? "the address has to start with https://"
      : "couldn't load that picture. paste the picture's own address (it usually ends in .jpg or .png)";
  }

  // when the address is pasted in, check it and show a preview
  photoInput.addEventListener("change", async () => {
    const url = photoInput.value.trim();
    photoOk = "";
    preview.hidden = true;
    msg.textContent = "";
    if (!url) return;
    fileInput.value = "";                       // an address replaces any uploaded file
    clearPending();
    msg.textContent = "checking the picture...";
    sendBtn.disabled = true;
    const ok = await checkPhoto(url);
    sendBtn.disabled = false;
    if (photoInput.value.trim() !== url) return;     // they changed it while we were checking
    if (ok) {
      photoOk = url;
      preview.src = url;
      preview.referrerPolicy = "no-referrer";
      preview.hidden = false;
      msg.textContent = "";
    } else {
      msg.textContent = photoProblem(url);
    }
  });

  // ----- a photo picked from the device -----
  function clearPending() {
    pendingBlob = null;
    if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    pendingUrl = "";
  }

  // makes a photo smaller so it loads quickly: longest side 1400px, saved as a jpeg
  function shrinkPhoto(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        if (!img.naturalWidth) return reject(new Error("couldn't read that photo"));
        const scale = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const cv = document.createElement("canvas");
        cv.width = w;
        cv.height = h;
        const ctx = cv.getContext("2d");
        ctx.fillStyle = "#ffffff";              // see-through parts of a png turn white
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        cv.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("couldn't prepare that photo"))), "image/jpeg", 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("couldn't read that photo")); };
      img.src = url;
    });
  }

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    clearPending();
    photoOk = "";
    preview.hidden = true;
    msg.textContent = "";
    if (!file) return;
    photoInput.value = "";                      // an uploaded file replaces any address
    if (!/^image\//.test(file.type)) { fileInput.value = ""; msg.textContent = "that file isn't a photo"; return; }
    if (file.size > MAX_FILE_BYTES) { fileInput.value = ""; msg.textContent = "that photo is too big (8 MB at most)"; return; }
    msg.textContent = "preparing the photo...";
    sendBtn.disabled = true;
    try {
      const blob = await shrinkPhoto(file);
      if (fileInput.files[0] !== file) return;  // they picked something else meanwhile
      pendingBlob = blob;
      pendingUrl = URL.createObjectURL(blob);
      preview.src = pendingUrl;
      preview.hidden = false;
      msg.textContent = "";
    } catch (err) {
      fileInput.value = "";
      msg.textContent = err.message;
    } finally {
      sendBtn.disabled = false;
    }
  });

  // sends the photo to storage and gives back its public address
  async function uploadPending() {
    const name = newId() + ".jpg";
    await api("/storage/v1/object/" + BUCKET + "/" + name, {
      method: "POST",
      headers: headers({ "Content-Type": "image/jpeg" }),
      body: pendingBlob,
    });
    return BASE + "/storage/v1/object/public/" + BUCKET + "/" + name;
  }

  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    const hex = "0123456789abcdef";
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.floor(Math.random() * 16);
      return hex[c === "x" ? r : (r & 3) | 8];
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = $("cm-body").value.trim();
    const name = $("cm-name").value.trim().slice(0, 24);
    let photoUrl = photoInput.value.trim();
    if (!body && !photoUrl && !pendingBlob) { msg.textContent = "write something or add a photo first"; return; }

    let last = 0;
    try { last = Number(localStorage.getItem(LAST_KEY)) || 0; } catch (err) {}
    const wait = COOLDOWN_MS - (Date.now() - last);
    if (wait > 0) { msg.textContent = "one post a minute, please. try again in " + Math.ceil(wait / 1000) + "s"; return; }

    sendBtn.disabled = true;
    if (pendingBlob) {
      msg.textContent = "uploading the photo...";
      try {
        photoUrl = await uploadPending();
      } catch (err) {
        sendBtn.disabled = false;
        msg.textContent = "couldn't upload that photo right now. try again in a bit. (" + String(err.message || err).slice(0, 160) + ")";
        return;
      }
      photoOk = photoUrl;
    }
    if (!pendingBlob) msg.textContent = photoUrl ? "checking the picture..." : "sending...";
    if (photoUrl && photoOk !== photoUrl && !(await checkPhoto(photoUrl))) {
      sendBtn.disabled = false;
      msg.textContent = photoProblem(photoUrl);
      return;
    }
    msg.textContent = "sending...";
    const id = newId();
    try {
      await api("/rest/v1/posts", {
        method: "POST",
        headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify({ id, name, body, image_url: photoUrl || null }),
      });
      try { localStorage.setItem(LAST_KEY, String(Date.now())); } catch (err) {}
      sendBtn.disabled = false;
      clearPending();
      closeDialog();
      say("posted!");
      await load(false);                       // fetch the feed again so the new post is at the top
      say("posted!");
    } catch (err) {
      sendBtn.disabled = false;
      msg.textContent = "couldn't send that right now. try again in a bit. (" + String(err.message || err).slice(0, 160) + ")";
    }
  });

  render();
})();