// ---------- Music: your songs (songs.js), a player, and playlists visitors make ----------
// The music keeps playing when someone moves to another page, because the player lives
// outside the pages. A small player follows them around (top right) until they come back.

const songsFileOk = typeof SONGS !== "undefined" && Array.isArray(SONGS);   // false if songs.js is missing or has a typo in it
const songs = (songsFileOk ? SONGS : [])
  .filter((s) => s && typeof s.src === "string" && s.src)
  .map((s) => ({ title: s.title || fileTitle(s.src), artist: s.artist || "", src: s.src }));

function fileTitle(src) {
  const name = src.split("/").pop().replace(/\.[^.]+$/, "");
  try { return decodeURIComponent(name); } catch (e) { return name; }
}

const audio = new Audio();
audio.preload = "metadata";

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

let view = 0;                    // 0 = all songs, otherwise playlist number + 1
function viewSongs() {
  if (view === 0) return songs;
  const pl = playlists[view - 1];
  return pl ? pl.songs.map(songBySrc).filter(Boolean) : songs;
}

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
  el.repeat.textContent = ["repeat", "repeat all", "repeat one"][repeatMode];
  el.repeat.setAttribute("aria-pressed", String(repeatMode > 0));
});

try {
  const v = Number(localStorage.getItem(VOL_KEY));
  if (localStorage.getItem(VOL_KEY) !== null && v >= 0 && v <= 100) el.vol.value = v;
} catch (e) {}
audio.volume = el.vol.value / 100;
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
  el.play.textContent = playing ? "pause" : "play";
  el.miniPlay.textContent = playing ? "pause" : "play";
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
  ["all songs", ...playlists.map((p) => p.name)].forEach((name, i) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "mb-tab";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(i === view));
    // each playlist shows how many songs are in it, so you can see an add worked
    tab.textContent = i === 0 ? name : name + " (" + playlists[i - 1].songs.filter(songBySrc).length + ")";
    tab.addEventListener("click", () => { view = i; el.toast.textContent = ""; renderTabs(); renderList(); });
    el.tabs.appendChild(tab);
  });
  el.delpl.hidden = view === 0;
  el.note.hidden = view === 0;
}

function renderList() {
  el.list.innerHTML = "";
  const list = viewSongs();
  if (!list.length) {
    const li = document.createElement("li");
    li.className = "music-empty";
    li.textContent = view === 0
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
    if (view === 0) {
      act.textContent = "add";
      act.setAttribute("aria-label", "add " + song.title + " to a playlist");
      act.addEventListener("click", () => openDialog(song));
    } else {
      act.textContent = "remove";
      act.setAttribute("aria-label", "remove " + song.title + " from this playlist");
      act.addEventListener("click", () => {
        const pl = playlists[view - 1];
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
        if (view === k + 1) renderList();
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
  if (!dialogSong) view = playlists.length;     // from the + button: jump to the new playlist
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
  const k = view - 1;
  if (!playlists[k]) return;
  const yes = await askConfirm('delete "' + playlists[k].name + '"? the songs stay in all songs.', "delete");
  if (!yes) { el.delpl.focus(); return; }
  if (view - 1 !== k) return;
  playlists.splice(k, 1);
  savePlaylists();
  view = 0;
  renderTabs();
  renderList();
});

renderTabs();
renderList();