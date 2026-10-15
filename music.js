// ---------- Music: your songs (songs.js), a player, and playlists visitors make ----------
// The music keeps playing when someone moves to another page, because the player lives
// outside the pages. A small player follows them around (top right) until they come back.

(function () {
const songsFileOk = typeof SONGS !== "undefined" && Array.isArray(SONGS);   // false if songs.js is missing or has a typo in it
// a song's categories: category: "k-pop"  or  category: ["k-pop", "chill"]  (or "k-pop, chill")
function toCategories(value) {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return list.map((c) => String(c).trim()).filter(Boolean);
}

const songs = (songsFileOk ? SONGS : [])
  .filter((s) => s && typeof s.src === "string" && s.src)
  .map((s) => ({
    title: s.title || fileTitle(s.src),
    artist: s.artist || "",
    src: s.src,
    cats: toCategories(s.category !== undefined ? s.category : s.categories),
  }));

// one tab per category, next to "all songs". CATEGORIES in songs.js (optional) sets their order;
// any other category follows in the order it first shows up in the song list
const cats = [];
function addCategory(name) {
  if (!cats.some((c) => c.toLowerCase() === name.toLowerCase())) cats.push(name);
}
function buildCategories() {
  cats.length = 0;
  toCategories(typeof CATEGORIES !== "undefined" ? CATEGORIES : []).forEach(addCategory);
  songs.forEach((s) => s.cats.forEach(addCategory));
}
buildCategories();
const fileSongs = songs.slice();               // the songs from songs.js; the ones added on the website come after them
const hasCategory = (song, name) => song.cats.some((c) => c.toLowerCase() === name.toLowerCase());

function fileTitle(src) {
  const name = src.split("/").pop().replace(/\.[^.]+$/, "");
  try { return decodeURIComponent(name); } catch (e) { return name; }
}

const audio = new Audio();
audio.preload = "metadata";

// the control icons (little line drawings, so they take the page's colors)
const SVG = (inner, filled) => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="' + (filled ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + inner + "</svg>";
const ICONS = {
  play: SVG('<polygon points="7 4 20 12 7 20 7 4"/>', true),
  pause: SVG('<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>', true),
  prev: SVG('<polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/>', true),
  next: SVG('<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>', true),
  shuffle: SVG('<polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>'),
  repeat: SVG('<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>'),
  repeat1: SVG('<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><path d="M11 10h1v4"/>'),
};
function setIcon(btn, name, label) {
  btn.innerHTML = ICONS[name];
  if (label) { btn.setAttribute("aria-label", label); btn.title = label; }
}

const $ = (id) => document.getElementById(id);
const el = {
  title: $("music-title"), artist: $("music-artist"), cur: $("music-cur"), dur: $("music-dur"),
  seek: $("music-seek"), play: $("music-play"), prev: $("music-prev"), next: $("music-next"),
  shuffle: $("music-shuffle"), repeat: $("music-repeat"), vol: $("music-vol"), msg: $("music-msg"),
  tabs: $("music-tabs"), list: $("music-list"), delpl: $("music-delpl"), note: $("music-note"),
  newpl: $("music-newpl"), toast: $("music-toast"),
  mini: $("mini"), miniTitle: $("mini-title"), miniPrev: $("mini-prev"), miniPlay: $("mini-play"), miniNext: $("mini-next"),
};

// ----- playlists (kept only in this browser) -----
const PL_KEY = "music-playlists";
const VOL_KEY = "music-volume";
const MAX_PLAYLISTS = 12;

function loadPlaylists() {
  try {
    const list = JSON.parse(localStorage.getItem(PL_KEY));
    if (!Array.isArray(list)) return [];
    return list
      .filter((p) => p && typeof p.name === "string" && Array.isArray(p.songs))
      .map((p) => ({ name: p.name.slice(0, 24), songs: p.songs.filter((s) => typeof s === "string") }));
  } catch (e) {
    return [];
  }
}

const playlists = loadPlaylists();

function savePlaylists() {
  try {
    localStorage.setItem(PL_KEY, JSON.stringify(playlists));
    return true;
  } catch (e) {
    return false;
  }
}

function songBySrc(src) {
  return songs.find((s) => s.src === src);
}

// the tabs, left to right: all songs (0), then the categories, then the playlists visitors make
let view = 0;
const catAt = () => (view >= 1 && view <= cats.length ? cats[view - 1] : null);   // the category being shown, if any
const plAt = () => view - 1 - cats.length;                                       // the playlist being shown (-1 if it isn't one)
function viewSongs() {
  if (view === 0) return songs;
  const cat = catAt();
  if (cat) return songs.filter((s) => hasCategory(s, cat));
  const pl = playlists[plAt()];
  return pl ? pl.songs.map(songBySrc).filter(Boolean) : songs;
}

// the icons on the buttons (play/pause is kept up to date by syncUI)
setIcon(el.prev, "prev"); setIcon(el.miniPrev, "prev");
setIcon(el.next, "next"); setIcon(el.miniNext, "next");
setIcon(el.shuffle, "shuffle");
setIcon(el.repeat, "repeat");
setIcon(el.play, "play"); setIcon(el.miniPlay, "play");

// ----- the player -----
let queue = [];                  // the songs lined up to play (a copy of the list you started from)
let qi = -1;                     // which one is playing
let shuffleOn = false;
let repeatMode = 0;             // 0 = off, 1 = repeat the whole list, 2 = repeat this song

function current() {
  return queue[qi] || null;
}

function fmt(sec) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return m + ":" + String(s).padStart(2, "0");
}

function loadSong(song) {
  el.msg.textContent = "";
  audio.src = song.src;
  el.title.textContent = song.title;
  el.artist.textContent = song.artist || " ";
  el.seek.value = 0;
  el.cur.textContent = "0:00";
  el.dur.textContent = "0:00";
  if ("mediaSession" in navigator && window.MediaMetadata) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: song.title, artist: song.artist });
  }
  syncUI();
}

function playQueueAt(i) {
  qi = i;
  loadSong(queue[qi]);
  const p = audio.play();
  if (p && p.catch) p.catch(() => {});      // errors are shown by the "error" listener
}

function playFrom(list, i) {
  queue = list.slice();
  playQueueAt(i);
}

function togglePlay() {
  if (!current()) {
    const list = viewSongs();
    if (list.length) playFrom(list, 0);
    return;
  }
  if (audio.paused) {
    const p = audio.play();
    if (p && p.catch) p.catch(() => {});
  } else {
    audio.pause();
  }
}

function nextSong(fromEnd) {
  if (!queue.length) return;
  if (fromEnd && repeatMode === 2) {          // repeat one: play the same song again
    audio.currentTime = 0;
    const p = audio.play();
    if (p && p.catch) p.catch(() => {});
    return;
  }
  if (shuffleOn && queue.length > 1) {
    let k;
    do { k = Math.floor(Math.random() * queue.length); } while (k === qi);
    playQueueAt(k);
  } else if (qi + 1 < queue.length) {
    playQueueAt(qi + 1);
  } else if (repeatMode === 1) {
    playQueueAt(0);
  } else if (fromEnd) {
    audio.pause();                           // the end of the list: stop, ready to start over
    audio.currentTime = 0;
    syncUI();
  }
}

function prevSong() {
  if (!queue.length) return;
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  if (qi > 0) playQueueAt(qi - 1);
  else if (repeatMode === 1) playQueueAt(queue.length - 1);
  else audio.currentTime = 0;
}

audio.addEventListener("play", syncUI);
audio.addEventListener("pause", syncUI);
audio.addEventListener("ended", () => nextSong(true));
audio.addEventListener("loadedmetadata", () => { el.dur.textContent = fmt(audio.duration); });
audio.addEventListener("timeupdate", () => {
  el.cur.textContent = fmt(audio.currentTime);
  if (audio.duration) el.seek.value = Math.round((audio.currentTime / audio.duration) * 1000);
});
audio.addEventListener("error", () => {
  el.msg.textContent = "couldn't play that one. is the file in the music folder, with the same name as in songs.js?";
  syncUI();
});

el.play.addEventListener("click", togglePlay);
el.next.addEventListener("click", () => nextSong(false));
el.prev.addEventListener("click", prevSong);
el.miniPrev.addEventListener("click", prevSong);
el.miniPlay.addEventListener("click", togglePlay);
el.miniNext.addEventListener("click", () => nextSong(false));
el.seek.addEventListener("input", () => {
  if (audio.duration) audio.currentTime = (el.seek.value / 1000) * audio.duration;
});
el.shuffle.addEventListener("click", () => {
  shuffleOn = !shuffleOn;
  el.shuffle.setAttribute("aria-pressed", String(shuffleOn));
});
el.repeat.addEventListener("click", () => {
  repeatMode = (repeatMode + 1) % 3;         // off, then the whole list, then just this song
  setIcon(el.repeat, repeatMode === 2 ? "repeat1" : "repeat", ["repeat: off", "repeat: all songs", "repeat: this song"][repeatMode]);
  el.repeat.setAttribute("aria-pressed", String(repeatMode > 0));
});

try {
  const v = Number(localStorage.getItem(VOL_KEY));
  if (localStorage.getItem(VOL_KEY) !== null && v >= 0 && v <= 100) el.vol.value = v;
} catch (e) {}
audio.volume = el.vol.value / 100;
// iPhones and iPads don't let a web page change the volume (it's always the phone's own volume
// buttons), so the slider would do nothing there. Hide it when the browser ignores the setting.
try {
  audio.volume = 0.5;
  if (Math.abs(audio.volume - 0.5) > 0.01) el.vol.closest(".music-vol").hidden = true;
  audio.volume = el.vol.value / 100;
} catch (e) {}
el.vol.addEventListener("input", () => {
  audio.volume = el.vol.value / 100;
  try { localStorage.setItem(VOL_KEY, el.vol.value); } catch (e) {}
});

if ("mediaSession" in navigator) {
  const handlers = { play: togglePlay, pause: togglePlay, previoustrack: prevSong, nexttrack: () => nextSong(false) };
  Object.keys(handlers).forEach((action) => {
    try { navigator.mediaSession.setActionHandler(action, handlers[action]); } catch (e) {}
  });
}

// keeps the buttons, the highlighted row and the small player in step with what's happening
function syncUI() {
  const playing = !audio.paused && !audio.ended && !!current();
  setIcon(el.play, playing ? "pause" : "play", playing ? "pause" : "play");
  setIcon(el.miniPlay, playing ? "pause" : "play", playing ? "pause" : "play");
  const song = current();
  el.mini.hidden = !song || location.hash === "#music";
  el.miniTitle.textContent = song ? song.title : "";
  el.list.querySelectorAll("li[data-src]").forEach((li) => {
    const isNow = !!song && li.dataset.src === song.src;
    li.classList.toggle("current", isNow);
    li.querySelector(".song-no").textContent = isNow ? (playing ? "now" : "||") : li.dataset.no;
  });
}

window.addEventListener("hashchange", syncUI);

let toastTimer = null;
function say(text) {
  el.toast.textContent = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.toast.textContent = ""; }, 3500);
}

// ----- the list and the tabs -----
function renderTabs() {
  el.tabs.innerHTML = "";
  ["all songs", ...cats, ...playlists.map((p) => p.name)].forEach((name, i) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "mb-tab";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(i === view));
    // each playlist shows how many songs are in it, so you can see an add worked
    tab.textContent = i <= cats.length ? name : name + " (" + playlists[i - 1 - cats.length].songs.filter(songBySrc).length + ")";
    tab.addEventListener("click", () => { view = i; el.toast.textContent = ""; renderTabs(); renderList(); });
    el.tabs.appendChild(tab);
  });
  el.delpl.hidden = plAt() < 0;       // delete and the little secret note are for playlists only
  el.note.hidden = plAt() < 0;
}

function renderList() {
  el.list.innerHTML = "";
  const list = viewSongs();
  if (!list.length) {
    const li = document.createElement("li");
    li.className = "music-empty";
    li.textContent = plAt() < 0
      ? (songsFileOk
          ? "no songs yet. put mp3 files in the music folder and list them in songs.js."
          : "couldn't read songs.js. check that it's next to index.html and that every line ends with a comma and every title and file name is in quotes.")
      : "nothing in this playlist yet. go to all songs and hit add.";
    el.list.appendChild(li);
    return;
  }
  list.forEach((song, i) => {
    const li = document.createElement("li");
    li.dataset.src = song.src;
    li.dataset.no = String(i + 1).padStart(2, "0");

    const main = document.createElement("button");
    main.type = "button";
    main.className = "song-main";
    main.innerHTML = '<span class="song-no"></span><span class="song-title"></span><span class="song-artist"></span>';
    main.querySelector(".song-title").textContent = song.title;
    main.querySelector(".song-artist").textContent = song.artist;
    main.addEventListener("click", () => {
      const now = current();
      if (now && now.src === song.src) {
        // same song: just pause or resume, but line up the next songs from this list
        queue = list.slice();
        qi = i;
        togglePlay();
      } else {
        playFrom(list, i);
      }
    });

    const act = document.createElement("button");
    act.type = "button";
    act.className = "song-act";
    if (plAt() < 0) {
      act.textContent = "add";
      act.setAttribute("aria-label", "add " + song.title + " to a playlist");
      act.addEventListener("click", () => openDialog(song));
    } else {
      act.textContent = "remove";
      act.setAttribute("aria-label", "remove " + song.title + " from this playlist");
      act.addEventListener("click", () => {
        const pl = playlists[plAt()];
        pl.songs.splice(pl.songs.indexOf(song.src), 1);
        savePlaylists();
        renderTabs();
        renderList();
        say('removed "' + song.title + '" from ' + pl.name);
      });
    }
    li.append(main, act);
    el.list.appendChild(li);
  });
  syncUI();
}

// ----- the add-to-playlist / new-playlist box -----
const dialog = $("music-dialog");
const form = $("music-dialog-form");
const dMsg = $("music-dialog-msg");
const nameInput = $("music-new-name");
let dialogSong = null;                  // the song being added, or null when just making a playlist
let dialogOpener = null;

function openDialog(song) {
  dialogSong = song || null;
  dialogOpener = document.activeElement;
  form.reset();
  dMsg.textContent = "";
  $("music-dialog-title").textContent = song ? "add to playlist" : "new playlist";
  $("music-dialog-sub").textContent = song ? song.title : "";
  $("music-dialog-sub").hidden = !song;
  $("music-new-label").textContent = song ? "or start a new playlist" : "name";

  const pick = $("music-pick");
  pick.innerHTML = "";
  pick.hidden = !song || !playlists.length;
  if (song) {
    playlists.forEach((pl, k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = pl.name;
      b.addEventListener("click", () => {
        if (pl.songs.includes(song.src)) { dMsg.textContent = "already in " + pl.name; return; }
        pl.songs.push(song.src);
        if (!savePlaylists()) { pl.songs.pop(); dMsg.textContent = "couldn't save. is your browser blocking storage?"; return; }
        closeDialog();
        renderTabs();
        if (plAt() === k) renderList();
        say('added "' + song.title + '" to ' + pl.name);
      });
      pick.appendChild(b);
    });
  }
  dialog.hidden = false;
  (pick.hidden ? nameInput : pick.querySelector("button")).focus();
}

function closeDialog() {
  if (dialog.hidden) return;
  dialog.hidden = true;
  if (dialogOpener && dialogOpener.focus && document.contains(dialogOpener)) dialogOpener.focus();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (playlists.length >= MAX_PLAYLISTS) { dMsg.textContent = "that's plenty of playlists for now (" + MAX_PLAYLISTS + ")"; return; }
  const name = nameInput.value.trim().slice(0, 24) || "my playlist";
  const pl = { name, songs: dialogSong ? [dialogSong.src] : [] };
  playlists.push(pl);
  if (!savePlaylists()) {
    playlists.pop();
    dMsg.textContent = "couldn't save. is your browser blocking storage?";
    return;
  }
  if (!dialogSong) view = cats.length + playlists.length;     // from the + button: jump to the new playlist
  closeDialog();
  renderTabs();
  renderList();
  say(dialogSong ? 'made "' + name + '" with "' + dialogSong.title + '" in it' : 'made "' + name + '"');
});

el.newpl.addEventListener("click", () => openDialog(null));
$("music-dialog-cancel").addEventListener("click", closeDialog);
$("music-dialog-backdrop").addEventListener("click", closeDialog);
dialog.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDialog(); });
window.addEventListener("hashchange", closeDialog);

el.delpl.addEventListener("click", async () => {
  const k = plAt();
  if (!playlists[k]) return;
  const yes = await askConfirm('delete "' + playlists[k].name + '"? the songs stay in all songs.', "delete");
  if (!yes) { el.delpl.focus(); return; }
  if (plAt() !== k) return;
  playlists.splice(k, 1);
  savePlaylists();
  view = 0;
  renderTabs();
  renderList();
});

// ----- songs you add on the website (owner only, see supabase-music.sql) -----
// they're stored in Supabase; everyone sees them after the songs from songs.js
let online = [];

function whenReady(fn) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
  else fn();
}

async function loadOnline() {
  const BASE = String((typeof COMMUNITY !== "undefined" ? COMMUNITY.url : "") || "").trim().replace(/\/+$/, "");
  const KEY = String((typeof COMMUNITY !== "undefined" ? COMMUNITY.key : "") || "").trim();
  if (!(/^https:\/\/[^\s/]+/i.test(BASE) && KEY.length > 20)) return false;
  try {
    const h = { apikey: KEY };
    if (/^eyJ/.test(KEY)) h.Authorization = "Bearer " + KEY;
    const res = await fetch(BASE + "/rest/v1/songs?select=*&order=created_at.asc&limit=1000", { headers: h });
    if (!res.ok) return false;                     // the table isn't set up yet: just use songs.js
    const rows = await res.json();
    online = rows
      .filter((r) => r && typeof r.src === "string" && r.src)
      .map((r) => ({ id: r.id, title: r.title || fileTitle(r.src), artist: r.artist || "", src: r.src, cats: toCategories(r.categories), online: true }));
    return true;
  } catch (e) {
    return false;
  }
}

// puts songs.js and the online songs together and redraws, keeping what's playing and the tab you're on
function mergeOnline() {
  const have = new Set(fileSongs.map((s) => s.src));
  songs.splice(0, songs.length, ...fileSongs, ...online.filter((s) => !have.has(s.src)));
  buildCategories();
  if (view > cats.length + playlists.length) view = 0;
  renderTabs();
  renderList();
}

const addSongBtn = $("music-addsong"), songDialog = $("song-dialog"), songForm = $("song-form");
const songMsg = $("song-msg"), songSave = $("song-save");
let isOwner = typeof ownerMode !== "undefined" && ownerMode;

function syncOwner(on) {
  isOwner = !!on;
  addSongBtn.hidden = !isOwner;
  if (!isOwner && !songDialog.hidden) songDialog.hidden = true;
}
window.addEventListener("ownermode", (e) => syncOwner(e.detail));
syncOwner(isOwner);

const splitList = (s) => Array.from(new Set(String(s || "").split(",").map((x) => x.trim()).filter(Boolean)));

// the existing categories as little buttons: tap one to add it to the box
function drawChips() {
  const box = $("song-chips");
  box.innerHTML = "";
  const chosen = splitList($("song-cats").value).map((c) => c.toLowerCase());
  cats.forEach((name) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = name;
    b.classList.toggle("on", chosen.includes(name.toLowerCase()));
    b.addEventListener("click", () => {
      const list = splitList($("song-cats").value);
      const at = list.findIndex((c) => c.toLowerCase() === name.toLowerCase());
      if (at >= 0) list.splice(at, 1); else list.push(name);
      $("song-cats").value = list.join(", ");
      drawChips();
    });
    box.appendChild(b);
  });
  box.hidden = !cats.length;
}

function drawAdded() {
  const ul = $("song-added-list");
  ul.innerHTML = "";
  online.forEach((song) => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = song.title + (song.artist ? " - " + song.artist : "");
    const del = document.createElement("button");
    del.type = "button"; del.textContent = "remove";
    del.addEventListener("click", async () => {
      const yes = await askConfirm('remove "' + song.title + '" from the site?', "remove");
      if (!yes) return;
      try {
        await window.siteDb.removeSong(song.id, song.src);
        if (current() && current().src === song.src) { audio.pause(); audio.removeAttribute("src"); queue = []; qi = -1; el.title.textContent = "nothing playing"; el.artist.textContent = "pick a song below"; }
        await loadOnline();
        mergeOnline();
        drawAdded();
        songMsg.textContent = "removed " + song.title + ".";
      } catch (err) { songMsg.textContent = "couldn't remove: " + err.message; }
    });
    li.append(label, del);
    ul.appendChild(li);
  });
  $("song-added").hidden = !online.length;
}

function openSongDialog() {
  songForm.reset();
  songMsg.textContent = "";
  drawChips();
  drawAdded();
  songDialog.hidden = false;
  $("song-file").focus();
}
function closeSongDialog() { songDialog.hidden = true; }
addSongBtn.addEventListener("click", openSongDialog);
$("song-cancel").addEventListener("click", closeSongDialog);
$("song-dialog-backdrop").addEventListener("click", closeSongDialog);
songDialog.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSongDialog(); });
window.addEventListener("hashchange", closeSongDialog);
$("song-cats").addEventListener("input", drawChips);

// choosing a file fills in the title from its name (you can change it)
$("song-file").addEventListener("change", () => {
  const f = $("song-file").files[0];
  if (f && !$("song-title").value.trim()) $("song-title").value = fileTitle(f.name).replace(/[_]+/g, " ").trim();
});

const MAX_MB = 50;                                  // the most the free Supabase plan allows for one file

songForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = $("song-file").files[0];
  const title = $("song-title").value.trim();
  if (!file) { songMsg.textContent = "choose a music file."; return; }
  if (!title) { songMsg.textContent = "add a song title."; return; }
  if (file.size > MAX_MB * 1024 * 1024) { songMsg.textContent = "that file is " + Math.round(file.size / 1048576) + " MB. the limit is " + MAX_MB + " MB."; return; }

  songSave.disabled = true;
  songMsg.textContent = "uploading... a big file can take a minute.";
  try {
    const src = await window.siteDb.uploadAudio(file);
    songMsg.textContent = "saving...";
    await window.siteDb.addSong({ title, artist: $("song-artist").value.trim(), categories: splitList($("song-cats").value), src });
    await loadOnline();
    mergeOnline();
    songForm.reset();
    drawChips();
    drawAdded();
    songMsg.textContent = 'added "' + title + '"! add another, or close this.';
    $("song-file").focus();
  } catch (err) {
    songMsg.textContent = "couldn't save: " + err.message + (/^404/.test(err.message) ? " (did you run supabase-music.sql?)" : "");
  } finally {
    songSave.disabled = false;
  }
});

whenReady(async () => { if (await loadOnline()) mergeOnline(); });

renderTabs();
renderList();
})();