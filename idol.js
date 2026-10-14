// ---------- Guess the k-pop idol ----------
// A blurry photo. Type a name. Every wrong guess makes the photo clearer.
// The idols (names, spellings, hints, photos) live in idols.js.

(function () {
  // wait until the whole page (including idols.js) has loaded, so the order of the script lines doesn't matter
  if (document.readyState !== "complete") { window.addEventListener("load", init); } else { init(); }

  function init() {
  const $ = (id) => document.getElementById(id);
  const photoBox = $("gi-photo"), img = $("gi-img"), msg = $("gi-msg");
  const form = $("gi-form"), input = $("gi-input"), actions = $("gi-actions");
  const hintBtn = $("gi-hintbtn"), skipBtn = $("gi-skip"), nextBtn = $("gi-next");
  const hintText = $("gi-hinttext"), roundEl = $("gi-round"), scoreEl = $("gi-score");
  const gameEl = $("gi-game"), endEl = $("gi-end"), endScore = $("gi-end-score");
  const restartBtn = $("gi-restart"), againBtn = $("gi-again");
  const cfg = typeof COMMUNITY !== "undefined" ? COMMUNITY : {};
  const BASE = String(cfg.url || "").trim().replace(/\/+$/, "");
  const KEY = String(cfg.key || "").trim();
  const configured = /^https:\/\/[^\s/]+/i.test(BASE) && KEY.length > 20;
  if (!photoBox) return;
  if (typeof IDOLS === "undefined" || !IDOLS.length) {
    msg.textContent = "the idol list (idols.js) didn't load. check that it's in the same folder as index.html and has no typos.";
    form.hidden = true; actions.hidden = true;
    return;
  }

  // ---- things you can change ----
  const ROUNDS = 10;                         // photos per game (fewer if you have fewer idols)
  const BLUR = [9, 6, 4, 2, 1];          // how blurry the photo is after 0, 1, 2... wrong guesses
  const MAX_POINTS = 5;                      // points for a right answer. each wrong guess and each hint takes 1 away, so the score can go negative
  const PHOTO_DIR = "games/idol/photos/";

  const MAX_WRONG = BLUR.length;             // this many wrong guesses and the round is over

  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  const slug = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const photoOf = (idol) => (/^https?:\/\//.test(idol.photo || "") ? idol.photo : PHOTO_DIR + (idol.photo || slug(idol.name) + ".jpg"));

  // every spelling that counts for each idol
  const addKeys = (idol) => { idol.keys = new Set([norm(idol.name), ...(idol.alts || []).map(norm)]); return idol; };
  IDOLS.forEach(addKeys);

  // ALL = the idols in idols.js plus the ones you added on the website (loaded from Supabase)
  let ALL = IDOLS.slice();
  let online = [];

  async function loadOnline() {
    if (!configured) return;
    try {
      const h = { apikey: KEY };
      if (/^eyJ/.test(KEY)) h.Authorization = "Bearer " + KEY;
      const res = await fetch(BASE + "/rest/v1/idols?select=*&order=created_at.asc", { headers: h });
      if (!res.ok) return;                       // the table isn't set up yet: just use idols.js
      const rows = await res.json();
      const have = new Set(IDOLS.map((i) => norm(i.name)));
      online = rows
        .filter((r) => r && r.name && r.photo && !have.has(norm(r.name)))
        .map((r) => addKeys({ id: r.id, name: r.name, groups: r.groups || [], alts: r.alts || [], hint: r.hint || "", photo: r.photo, online: true }));
      ALL = IDOLS.concat(online);
    } catch (e) { /* offline or not set up: idols.js still works */ }
  }
  let readyDone = false;
  const ready = loadOnline().then(() => { readyDone = true; });

  let queue = [], current = null, roundNo = 0, total = 0, score = 0;
  let wrong = 0, hintUsed = false, over = false, roundPts = 0;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function newGame() {
    if (!readyDone) { ready.then(newGame); return; }     // wait for the idols added online
    firstMissing = "";
    queue = shuffle(ALL.slice());
    total = Math.min(ROUNDS, queue.length);
    roundNo = 0; score = 0;
    gameEl.hidden = false; endEl.hidden = true; restartBtn.hidden = false;
    nextRound();
  }

  function setBlur(n) { photoBox.style.setProperty("--blur", n); }

  let firstMissing = "";

  function nextRound() {
    if (roundNo >= total) return roundNo ? finish() : noPhotos();
    const idol = queue.shift();
    if (!idol) return roundNo ? finish() : noPhotos();
    // make sure the photo exists before using it; if not, quietly skip that idol
    const test = new Image();
    test.onload = () => start(idol);
    test.onerror = () => { if (!firstMissing) firstMissing = photoOf(idol); total = Math.min(total, roundNo + queue.length); nextRound(); };
    test.src = photoOf(idol);
  }

  // none of the photos could be found (usually the folder is in the wrong place)
  function noPhotos() {
    photoBox.classList.add("clear");
    img.removeAttribute("src");
    msg.textContent = "can't find the photos. i looked for " + firstMissing + " - check that the photos folder is inside games/idol/.";
    form.hidden = true; actions.hidden = true; nextBtn.hidden = true;
    roundEl.textContent = "round 0 / 0";
  }

  function start(idol) {
    current = idol; roundNo++; wrong = 0; hintUsed = false; over = false; roundPts = 0;
    photoBox.classList.remove("clear");
    photoBox.style.setProperty("--blur", BLUR[0]);
    // swap the picture without a flash of the sharp one
    img.style.transition = "none";
    img.src = photoOf(idol);
    void img.offsetWidth;
    img.style.transition = "";
    msg.textContent = "who is this?";
    hintText.textContent = "";
    input.value = ""; form.hidden = false; actions.hidden = false; nextBtn.hidden = true;
    hintBtn.disabled = !idol.hint;
    updateBar();
    if (!window.matchMedia("(pointer: coarse)").matches) input.focus();
  }

  const fmt = (n) => (n > 0 ? "+" + n : String(n));

  function updateBar() {
    roundEl.textContent = "round " + roundNo + " / " + total;
    scoreEl.textContent = "score " + score;
  }

  // the round is over: show the answer and the next button
  function reveal(text) {
    over = true;
    photoBox.classList.add("clear");
    setBlur(0);
    msg.innerHTML = text + "<br><strong>" + current.name + "</strong> (" + (current.groups || []).join(", ") + ")";
    form.hidden = true; actions.hidden = true;
    nextBtn.hidden = false;
    nextBtn.textContent = roundNo >= total ? "see my score" : "next";
    updateBar();
    nextBtn.focus();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (over) return;
    const guess = norm(input.value);
    if (!guess) return;
    const matches = ALL.filter((i) => i.keys.has(guess));

    if (matches.includes(current)) {
      score += MAX_POINTS; roundPts += MAX_POINTS;
      reveal("yes! " + fmt(roundPts) + " this round");
      return;
    }
    if (!matches.length) {            // not on the list: doesn't count as a guess
      msg.textContent = "that's not one of the idols here. try another spelling?";
      input.select();
      return;
    }
    wrong++; score--; roundPts--;     // every wrong guess costs a point
    updateBar();
    if (wrong >= MAX_WRONG) { reveal("out of guesses! " + fmt(roundPts) + " this round"); return; }
    setBlur(BLUR[wrong]);
    const sameGroup = matches.some((m) => (m.groups || []).some((g) => (current.groups || []).includes(g)));
    msg.textContent = (sameGroup ? "right group, wrong member!" : "nope!") + " -1 point. " + (MAX_WRONG - wrong) + (MAX_WRONG - wrong === 1 ? " guess" : " guesses") + " left.";
    input.value = ""; input.focus();
  });

  hintBtn.addEventListener("click", () => {
    if (over || hintUsed || !current.hint) return;
    hintUsed = true; score--; roundPts--;    // a hint costs a point
    updateBar();
    hintText.textContent = "hint: " + current.hint;
    hintBtn.disabled = true;
    input.focus();
  });
  skipBtn.addEventListener("click", () => { if (!over) reveal("skipped. " + fmt(roundPts) + " this round"); });
  nextBtn.addEventListener("click", nextRound);

  function finish() {
    gameEl.hidden = true; endEl.hidden = false; restartBtn.hidden = true;
    const best = total * MAX_POINTS;
    endScore.textContent = "you scored " + score + " out of " + best + ".";
  }

  restartBtn.addEventListener("click", newGame);
  againBtn.addEventListener("click", newGame);

  // ---------- owner only: add an idol from the website ----------
  const addBtn = $("gi-add"), dlg = $("gi-dialog"), dForm = $("gi-add-form"), fMsg = $("gi-f-msg"), fSave = $("gi-f-save");
  const addedBox = $("gi-added"), addedList = $("gi-added-list");
  let isOwner = typeof ownerMode !== "undefined" && ownerMode;    // set by script.js once you're signed in

  function syncOwner(on) {
    isOwner = !!on;
    addBtn.hidden = !isOwner;
    if (!isOwner) dlg.hidden = true;
  }
  window.addEventListener("ownermode", (e) => syncOwner(e.detail));
  syncOwner(isOwner);

  const list = (s) => Array.from(new Set(String(s || "").split(",").map((x) => x.trim()).filter(Boolean)));

  function drawAdded() {
    addedList.innerHTML = "";
    online.forEach((idol) => {
      const li = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = idol.name + (idol.groups.length ? " (" + idol.groups.join(", ") + ")" : "");
      const del = document.createElement("button");
      del.type = "button"; del.textContent = "remove";
      del.addEventListener("click", async () => {
        const yes = typeof askConfirm === "function" ? await askConfirm("remove " + idol.name + " from the game?", "remove") : true;
        if (!yes) return;
        try {
          await window.siteDb.removeIdol(idol.id, idol.photo);
          await loadOnline();
          drawAdded();
          fMsg.textContent = "removed " + idol.name + ".";
        } catch (err) { fMsg.textContent = "couldn't remove: " + err.message; }
      });
      li.append(label, del);
      addedList.appendChild(li);
    });
    addedBox.hidden = !online.length;
  }

  function openDialog() {
    fMsg.textContent = "";
    drawAdded();
    dlg.hidden = false;
    $("gi-f-name").focus();
  }
  function closeDialog() { dlg.hidden = true; }
  addBtn.addEventListener("click", openDialog);
  $("gi-f-cancel").addEventListener("click", closeDialog);
  $("gi-dialog-backdrop").addEventListener("click", closeDialog);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !dlg.hidden) closeDialog(); });
  window.addEventListener("hashchange", closeDialog);

  // shrinks the photo (long side 720px) so it loads quickly
  function shrink(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const im = new Image();
      im.onload = () => {
        const s = Math.min(1, 720 / Math.max(im.naturalWidth, im.naturalHeight));
        const cv = document.createElement("canvas");
        cv.width = Math.round(im.naturalWidth * s); cv.height = Math.round(im.naturalHeight * s);
        cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        cv.toBlob((b) => (b ? resolve(b) : reject(new Error("couldn't read that photo"))), "image/jpeg", 0.82);
      };
      im.onerror = () => { URL.revokeObjectURL(url); reject(new Error("couldn't open that photo (try a jpg or png)")); };
      im.src = url;
    });
  }

  dForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("gi-f-name").value.trim();
    const file = $("gi-f-photo").files[0];
    if (!name) { fMsg.textContent = "add a name first."; return; }
    if (!file) { fMsg.textContent = "choose a photo."; return; }
    if (ALL.some((i) => norm(i.name) === norm(name))) { fMsg.textContent = name + " is already in the game."; return; }

    const groups = list($("gi-f-groups").value);
    let alts = list($("gi-f-alts").value);
    if ($("gi-f-combos").checked) groups.forEach((g) => { alts.push(g + " " + name, name + " " + g); });   // "blackpink jisoo" and "jisoo blackpink"
    alts = Array.from(new Set(alts));

    fSave.disabled = true;
    fMsg.textContent = "saving...";
    try {
      const photo = await window.siteDb.uploadImage(await shrink(file));
      await window.siteDb.addIdol({ name, groups, alts, hint: $("gi-f-hint").value.trim() || null, photo });
      await loadOnline();
      drawAdded();
      dForm.reset();
      $("gi-f-combos").checked = true;
      fMsg.textContent = "added " + name + "! add another, or close this.";
      $("gi-f-name").focus();
    } catch (err) {
      fMsg.textContent = "couldn't save: " + err.message + (/^404/.test(err.message) ? " (did you run supabase-idols.sql?)" : "");
    } finally {
      fSave.disabled = false;
    }
  });

  // start a fresh game each time the page is opened
  function check() { if (location.hash === "#idol") newGame(); }
  window.addEventListener("hashchange", check);
  check();
  }
})();