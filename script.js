// Shows only the page that matches the URL hash (e.g. index.html#about).
// The top and bottom bars never reload, only the middle section changes.

const pages = document.querySelectorAll(".page");
const DEFAULT_PAGE = "home";

function showPage() {
  const name = location.hash.replace("#", "") || DEFAULT_PAGE;
  let found = false;

  pages.forEach((page) => {
    const match = page.dataset.page === name;
    page.classList.toggle("active", match);
    if (match) found = true;
  });

  // If the hash doesn't match any page, fall back to home
  if (!found) {
    document
      .querySelector(`[data-page="${DEFAULT_PAGE}"]`)
      .classList.add("active");
  }

  document.getElementById("main").scrollTop = 0;

  // the menu button for the page you're on stays highlighted
  document.querySelectorAll(".menu-card a").forEach((link) => {
    if (link.getAttribute("href") === "#" + name && found) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  // Return and home buttons only show when a page other than home is selected
  const onHome = !found || name === DEFAULT_PAGE;
  returnBtn.hidden = onHome;
  homeBtn.hidden = onHome;
}

// ---------- Top left buttons ----------
const refreshBtn = document.getElementById("btn-refresh");
const returnBtn = document.getElementById("btn-return");
const homeBtn = document.getElementById("btn-home");
let hasNavigated = false;   // true once the visitor has moved between pages here

refreshBtn.addEventListener("click", () => location.reload());

homeBtn.addEventListener("click", () => {
  location.hash = DEFAULT_PAGE;      // always goes straight to the home page
});

returnBtn.addEventListener("click", () => {
  if (hasNavigated) {
    history.back();                  // go back to the page they came from
  } else {
    location.hash = DEFAULT_PAGE;    // landed here directly, so go home
  }
});

window.addEventListener("hashchange", () => {
  hasNavigated = true;
  showPage();
});
showPage();

// ---------- Menu (bottom center): opens in the middle of the screen ----------
const menuBtn = document.getElementById("btn-menu");
const menuList = document.getElementById("menu-list");

function setMenu(open, returnFocus) {
  menuList.hidden = !open;
  menuBtn.setAttribute("aria-expanded", String(open));
  if (open) {
    // start on the page you're on, so the keyboard begins in a sensible place
    const here = menuList.querySelector('a[aria-current="page"]') || menuList.querySelector("a");
    if (here) here.focus();
  } else if (returnFocus) {
    menuBtn.focus();
  }
}

// click "get into it" to open or close the menu
menuBtn.addEventListener("click", () => {
  setMenu(menuList.hidden);
});

// picking a page closes the menu
menuList.addEventListener("click", (e) => {
  if (e.target.closest("a")) setMenu(false);
});

// clicking the empty space around it, or pressing Escape, also closes it
document.getElementById("menu-backdrop").addEventListener("click", () => setMenu(false));
document.getElementById("menu-x").addEventListener("click", () => setMenu(false, true));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !menuList.hidden) setMenu(false, true);
});

// ---------- Thoughts to consume: a grid of entries ----------
const thoughtsScroll = document.getElementById("thoughts-scroll");
const canvas = document.getElementById("thoughts-canvas");
const featured = document.getElementById("featured");
const featuredCard = document.getElementById("featured-card");
const featuredDate = document.getElementById("featured-date");
const featuredTitle = document.getElementById("featured-title");
const featuredBody = document.getElementById("featured-body");
const expandBtn = document.getElementById("btn-expand");

// the list on the page: entries.js plus anything added on the site (see journal.js).
// journal.js calls setEntries(...) to swap in the full list.
let entries = typeof ENTRIES !== "undefined" ? ENTRIES.slice() : [];
let entryEls = [];
let currentIndex = -1;
let lastPicked = -1;
let isExpanded = false;
let lastFocus = null;

function shuffleArray(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function buildEntries() {
  canvas.innerHTML = "";
  entryEls = entries.map((entry, i) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "entry";

    const date = document.createElement("span");
    date.className = "entry-date";
    date.textContent = entry.date || "";

    const title = document.createElement("span");
    title.className = "entry-title";
    title.textContent = entry.title || "";

    const preview = document.createElement("span");
    preview.className = "entry-preview";
    preview.textContent = String(entry.text || "").trim().split(/\n\s*\n/)[0];

    el.append(date, title, preview);
    el.addEventListener("click", () => openFeatured(i));
    canvas.appendChild(el);
    return el;
  });
}

// swaps in a new list of entries and redraws the grid
function setEntries(list) {
  entries = list.slice();
  buildEntries();
  if (!featured.hidden) closeFeatured();
}

// ----- the enlarged entry -----
function renderFeatured() {
  const entry = entries[currentIndex];
  featuredDate.textContent = entry.date || "";
  featuredTitle.textContent = entry.title || "";

  const paragraphs = String(entry.text || "").trim().split(/\n\s*\n/);
  featuredBody.innerHTML = "";
  (isExpanded ? paragraphs : paragraphs.slice(0, 1)).forEach((text) => {
    const p = document.createElement("p");
    p.textContent = text.trim();
    featuredBody.appendChild(p);
  });

  featuredCard.classList.toggle("expanded", isExpanded);
  expandBtn.textContent = isExpanded ? "collapse" : "expand";
  expandBtn.setAttribute("aria-expanded", String(isExpanded));
}

function openFeatured(i) {
  lastFocus = document.activeElement;
  currentIndex = i;
  isExpanded = false;
  renderFeatured();
  featured.hidden = false;
  featuredCard.scrollTop = 0;
  expandBtn.focus();
  // journal.js listens for this, to show edit / delete when you're signed in
  document.dispatchEvent(new CustomEvent("entryshown", { detail: entries[i] }));
}

function closeFeatured() {
  if (featured.hidden) return;
  featured.hidden = true;
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

function pickOne() {
  if (!entries.length) return;
  let i = Math.floor(Math.random() * entries.length);
  // don't pick the same one twice in a row
  if (entries.length > 1 && i === lastPicked) {
    i = (i + 1 + Math.floor(Math.random() * (entries.length - 1))) % entries.length;
  }
  lastPicked = i;
  openFeatured(i);
}

// shuffle just mixes up the order of the boxes
document.getElementById("btn-shuffle").addEventListener("click", () => {
  shuffleArray([...entryEls]).forEach((el) => canvas.appendChild(el));
  thoughtsScroll.scrollTop = 0;
});
document.getElementById("btn-pick").addEventListener("click", pickOne);
document.getElementById("btn-close").addEventListener("click", closeFeatured);
document.getElementById("featured-backdrop").addEventListener("click", closeFeatured);
expandBtn.addEventListener("click", () => {
  isExpanded = !isExpanded;
  renderFeatured();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeFeatured();
});
window.addEventListener("hashchange", closeFeatured);   // leaving the page closes it

buildEntries();

// ---------- Braindump: moodboards ----------
const mbTabs = document.getElementById("mb-tabs");
const mbGrid = document.getElementById("mb-grid");
const baseBoards = typeof MOODBOARDS !== "undefined" ? MOODBOARDS : [];   // comes from moodboards.js
// everything below is filled in by registerBoard(): the boards from moodboards.js first, then boards made in this browser
const boards = [];
const boardMine = [];      // true for a board someone made with the "make yours" button
const boardOnline = [];    // true for a board you (the owner) made on the website, which everyone sees
const boardOnlineIds = []; // for each board: the database id behind each box you added on the website (null for the others)
const boardItems = [];
const boardSig = [];
const origCount = [];      // how many boxes come from moodboards.js (or, on a board of your own, 0); the rest were added here
const boardReady = [];
const boardPrep = [];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let currentBoard = 0;

// boards and boxes you added on the website while signed in (journal.js loads them from the database)
let onlineBoardNames = [];
let onlineItemMap = {};       // board name -> [{ id, item }]
let ownerMode = false;        // true while you're signed in

function clampNum(n, min, max) {
  return Math.min(max, Math.max(min, Number(n) || min));
}

// turns whatever was written in moodboards.js into a standard item:
// a plain web address becomes a picture, plain words become a text box
function normalizeItem(raw) {
  if (typeof raw === "string") {
    const s = raw.trim();
    return /^https?:\/\/\S+$/i.test(s) ? { type: "image", src: s } : { type: "text", text: raw };
  }
  const item = { ...raw };
  item.src = item.src || item.url || item.image || "";
  // a box with a "src" (even an empty one) is a picture; with a "color" it's a color box
  const hasPicture = ["src", "url", "image"].some((key) => key in raw);
  item.type = item.type || (hasPicture ? "image" : item.color ? "color" : "text");
  return item;
}

// ----- boxes you add with the + button (kept in this browser, in addition to moodboards.js) -----
const ADDED_KEY = "moodboard-added";

function boardKey(b) {
  return boards[b].name || "moodboard " + (b + 1);
}

function loadAdded() {
  try {
    const all = JSON.parse(localStorage.getItem(ADDED_KEY));
    return all && typeof all === "object" && !Array.isArray(all) ? all : {};
  } catch (e) {
    return {};
  }
}

function saveAdded(b, list) {
  try {
    const all = loadAdded();
    if (list.length) all[boardKey(b)] = list;
    else delete all[boardKey(b)];
    localStorage.setItem(ADDED_KEY, JSON.stringify(all));
    return true;
  } catch (e) {
    return false;
  }
}

// ----- boards people make themselves (kept only in their browser) -----
const MINE_KEY = "moodboard-mine";

function loadMine() {
  try {
    const list = JSON.parse(localStorage.getItem(MINE_KEY));
    if (!Array.isArray(list)) return [];
    return list
      .filter((u) => u && typeof u === "object" && typeof u.name === "string")
      .map((u) => ({
        name: u.name.slice(0, 24),
        items: Array.isArray(u.items) ? u.items.filter((x) => x && typeof x === "object") : [],
      }));
  } catch (e) {
    return [];
  }
}

const userBoards = loadMine();

function saveMine() {
  try {
    localStorage.setItem(MINE_KEY, JSON.stringify(userBoards));
    return true;
  } catch (e) {
    return false;
  }
}

// save or forget a box you added (on a board of your own the boxes live with the board)
function persistAdd(b, raw) {
  if (boardMine[b]) {
    boards[b].items.push(raw);
    if (saveMine()) return true;
    boards[b].items.pop();
    return false;
  }
  const list = loadAdded()[boardKey(b)];
  return saveAdded(b, [...(Array.isArray(list) ? list : []), raw]);
}

function persistRemove(b, idx) {
  if (boardMine[b]) {
    boards[b].items.splice(idx, 1);
    saveMine();
    return;
  }
  const list = loadAdded()[boardKey(b)] || [];
  list.splice(idx - origCount[b], 1);
  saveAdded(b, list);
}

// ----- remembering how you arranged each board (kept in this browser) -----
const LAYOUT_KEY = "moodboard-layouts";

function hashText(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return String(h);
}

// a fingerprint of each board's contents: if you edit moodboards.js, the saved arrangement
// for that board is dropped, so your changes always show up (see registerBoard)

function loadLayouts() {
  try {
    return JSON.parse(localStorage.getItem(LAYOUT_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function clearSavedLayout(b) {
  try {
    const all = loadLayouts();
    delete all[b];
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(all));
  } catch (e) {}
}

function saveLayout(b) {
  try {
    const all = loadLayouts();
    all[b] = { sig: boardSig[b], rows: boardRows[b] };
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(all));
  } catch (e) {}   // private windows can block saving; the board still works
}

// the saved arrangement for a board, or null if there isn't a usable one
function savedRows(b, count) {
  const entry = loadLayouts()[b];
  if (!entry || entry.sig !== boardSig[b] || !Array.isArray(entry.rows)) return null;
  if (!entry.rows.every(Array.isArray)) return null;
  const flat = entry.rows.flat();
  const valid =
    flat.length === count &&
    new Set(flat).size === count &&
    flat.every((i) => Number.isInteger(i) && i >= 0 && i < count);
  return valid ? entry.rows : null;
}

// how many of the 12 columns a box takes: the "cols" you set, otherwise a picture
// fits its own shape (a square picture is 3 columns, a wide one more, a tall one fewer)
function itemCols(item) {
  if (item.cols) return clampNum(item.cols, 1, 12);
  if (item.type === "image" && item.aspect) return clampNum(3 * item.aspect, 1, 12);
  return 3;
}

// finds out a picture's shape before the board is drawn, so every box can fit its picture
function loadShape(item) {
  if (item.type !== "image" || !item.src || item.cols) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) item.aspect = img.naturalWidth / img.naturalHeight;
      resolve();
    };
    img.onerror = () => {
      item.failed = true;
      resolve();
    };
    setTimeout(resolve, 6000);          // don't wait forever on a slow picture
    img.referrerPolicy = "no-referrer";
    img.src = item.src;
  });
}

// which boxes start on which line: a new line begins once the current one is full (12 columns)
function initialRows(items) {
  const rows = [];
  let sum = 0;
  items.forEach((item, i) => {
    const cols = itemCols(item);
    if (!rows.length || sum + cols > 12) {
      rows.push([]);
      sum = 0;
    }
    rows[rows.length - 1].push(i);
    sum += cols;
  });
  return rows;
}

const boardRows = [];                            // each board's current lines, kept while the page is open

// sets a board up: works out its boxes, measures its pictures, and works out its lines
function registerBoard(board, mine, online) {
  const b = boards.length;
  boards.push(board);
  boardMine.push(!!mine);
  boardOnline.push(!!online);
  let raw = (board.items || []).slice();
  const ids = raw.map(() => null);
  if (!mine) {
    // boxes added on the website count as part of the board, right after the ones from moodboards.js
    (onlineItemMap[board.name] || []).forEach((row) => { raw.push(row.item); ids.push(row.id); });
  }
  boardOnlineIds.push(ids);
  origCount.push(mine ? 0 : raw.length);
  if (!mine) {
    const extra = loadAdded()[boardKey(b)];
    if (Array.isArray(extra)) raw = [...raw, ...extra.filter((x) => x && typeof x === "object")];
  }
  const items = raw.map(normalizeItem);
  boardItems.push(items);
  boardSig.push(hashText(mine ? "mine:" + board.name : JSON.stringify([board, ids])));
  boardReady.push(false);
  boardPrep.push(
    Promise.all(items.map(loadShape)).then(() => {
      const k = boards.indexOf(board);          // the board may have moved or been deleted while its pictures loaded
      if (k < 0) return;
      boardRows[k] = savedRows(k, items.length) || initialRows(items);
      boardReady[k] = true;
    })
  );
  return b;
}

baseBoards.forEach((board) => registerBoard(board, false, false));
userBoards.forEach((board) => registerBoard(board, true, false));

// starts the boards over: moodboards.js first, then the ones you made on the website, then this browser's own
function rebuildBoards() {
  const keep = boards[currentBoard] ? boards[currentBoard].name : null;
  [boards, boardMine, boardOnline, boardOnlineIds, boardItems, boardSig, origCount, boardReady, boardPrep, boardRows].forEach((list) => { list.length = 0; });
  baseBoards.forEach((board) => registerBoard(board, false, false));
  onlineBoardNames
    .filter((name) => !baseBoards.some((base) => base.name === name))
    .forEach((name) => registerBoard({ name, items: [] }, false, true));
  userBoards.forEach((board) => registerBoard(board, true, false));
  const k = keep === null ? -1 : boards.findIndex((board) => board.name === keep);
  currentBoard = k >= 0 ? k : 0;
  renderTabs();
  renderBoard();
}

// journal.js calls this with what's stored online
function setOnlineBoards(names, rows) {
  onlineBoardNames = names.slice();
  onlineItemMap = {};
  rows.forEach((row) => {
    (onlineItemMap[row.board_name] = onlineItemMap[row.board_name] || []).push({ id: row.id, item: row.item });
  });
  closeLightbox();
  rebuildBoards();
}

// journal.js calls this when you sign in or out: shows or hides the owner buttons
function setOwnerMode(on) {
  ownerMode = !!on;
  const plusBox = document.getElementById("mb-plus-wrap");
  if (plusBox) plusBox.hidden = !ownerMode;       // the + is only for you, once you're signed in
  renderTabs();
}

// a color box can have one color ("color") or several ("colors"), like a palette
function itemColors(item) {
  const list = Array.isArray(item.colors) ? item.colors.filter((c) => typeof c === "string" && c) : [];
  return list.length ? list.slice(0, 12) : [item.color || "#cccccc"];
}

// fills a color box: a single color, or stripes with the name on a little tag
function fillColorBox(el, item) {
  const colors = itemColors(item);
  if (colors.length > 1) {
    el.classList.add("mb-palette");
    colors.forEach((color) => {
      const stripe = document.createElement("span");
      stripe.className = "mb-stripe";
      stripe.style.background = color;
      el.appendChild(stripe);
    });
    if (item.label) {
      const chip = document.createElement("span");
      chip.className = "mb-chip";
      chip.textContent = item.label;
      el.appendChild(chip);
    }
  } else {
    el.style.background = colors[0];
    el.style.color = readableOn(colors[0]);
    el.textContent = item.label || "";
  }
}

// picks black or white text so a label is readable on a color box
function readableOn(color) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color || "").trim());
  if (!m) return "#111111";
  let hex = m[1];
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#111111" : "#ffffff";
}

function imagePlaceholder(alt, failed) {
  const box = document.createElement("div");
  box.className = "mb-placeholder";
  const label = document.createElement("span");
  label.textContent = failed ? "couldn't load" + (alt ? ": " + alt : "") : alt || "image";
  box.appendChild(label);
  return box;
}

function buildItem(item, index) {
  const el = document.createElement("div");
  const type = item.type || "text";
  const cols = itemCols(item);
  el.className = "mb-item mb-" + type;
  el.style.setProperty("--c", cols);
  el.style.setProperty("--c-sm", Math.max(2, Math.min(6, Math.ceil(cols / 2))));   // on small screens
  el.style.setProperty("--r", clampNum(item.rows || 1, 1, 3));
  el.dataset.index = index;
  el.tabIndex = 0;               // so the keyboard can reach it (Enter opens it)

  if (type === "image") {
    if (item.src && !item.failed) {
      const img = document.createElement("img");
      img.referrerPolicy = "no-referrer";   // some sites only show their pictures when no page address is sent
      img.src = item.src;                   // works for web addresses and for files in your images folder
      img.alt = item.alt || "";
      img.draggable = false;
      img.addEventListener("error", () => img.replaceWith(imagePlaceholder(item.alt, true)));
      el.appendChild(img);
    } else {
      el.appendChild(imagePlaceholder(item.alt, item.failed));
    }
  } else if (type === "color") {
    fillColorBox(el, item);
  } else {
    if (item.title) {
      const title = document.createElement("h3");
      title.textContent = item.title;
      el.appendChild(title);
    }
    const body = document.createElement("p");
    body.textContent = item.text || "";
    el.appendChild(body);
  }
  return el;
}

// each line shares its width between its boxes, and is as tall as its tallest box
function setRowVars(row) {
  const kids = [...row.children];
  const total = kids.reduce((sum, c) => sum + Number(c.style.getPropertyValue("--c")), 0);
  const tall = kids.reduce((max, c) => Math.max(max, Number(c.style.getPropertyValue("--r"))), 1);
  row.style.setProperty("--n", kids.length);
  // with fill: true on a board, every line except the last stretches to the full width
  const fill = boards[currentBoard] && boards[currentBoard].fill && row.nextElementSibling;
  row.style.setProperty("--total", fill ? total : Math.max(12, total));
  row.style.setProperty("--rh", tall);
}

function renderTabs() {
  const mine = !!boardMine[currentBoard];
  document.getElementById("mb-add-mine").hidden = !mine || ownerMode;       // adding to a board of your own (you, the owner, use the other + instead)
  // you can delete your own boards, and (signed in) the ones you made for everyone
  document.getElementById("mb-delete").hidden = !(mine || (ownerMode && boardOnline[currentBoard]));
  document.getElementById("mb-note").hidden = !mine;
  mbTabs.innerHTML = "";
  boards.forEach((board, i) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "mb-tab";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(i === currentBoard));
    tab.textContent = board.name || "moodboard " + (i + 1);
    tab.addEventListener("click", () => {
      currentBoard = i;
      renderTabs();
      renderBoard();
    });
    mbTabs.appendChild(tab);
  });
}

function drawBoard(b) {
  mbGrid.innerHTML = "";
  const items = boardItems[b];
  boardRows[b].forEach((indices) => {
    const row = document.createElement("div");
    row.className = "mb-row";
    indices.forEach((i) => row.appendChild(buildItem(items[i], i)));
    mbGrid.appendChild(row);
  });
  if (!boardRows[b].length) {
    const note = document.createElement("p");
    note.className = "mb-loading";
    note.textContent = "nothing here yet.";
    mbGrid.appendChild(note);
  }
  [...mbGrid.children].forEach(setRowVars);   // after they're all in place, so "fill" knows which line is last
}

function renderBoard() {
  const b = currentBoard;
  mbGrid.innerHTML = "";
  if (!boardItems[b]) {
    const note = document.createElement("p");
    note.className = "mb-loading";
    note.textContent = "no moodboards yet.";
    mbGrid.appendChild(note);
    return;
  }
  if (boardReady[b]) {
    drawBoard(b);
    return;
  }
  const note = document.createElement("p");
  note.className = "mb-loading";
  note.textContent = "loading...";
  mbGrid.appendChild(note);
  boardPrep[b].then(() => {
    if (b === currentBoard) drawBoard(b);
  });
}

// the reset button: put this board back the way it is in moodboards.js
document.getElementById("mb-reset").addEventListener("click", () => {
  const b = currentBoard;
  if (!boardReady[b]) return;
  const before = new Map([...mbGrid.querySelectorAll(".mb-item")].map((el) => [el.dataset.index, el.getBoundingClientRect()]));

  boardRows[b] = initialRows(boardItems[b]);
  clearSavedLayout(b);
  drawBoard(b);

  // slide every box from where it was to where it landed
  if (reduceMotion.matches) return;
  mbGrid.querySelectorAll(".mb-item").forEach((el) => {
    const a = before.get(el.dataset.index), r = el.getBoundingClientRect();
    if (!a) return;
    const dx = a.left - r.left, dy = a.top - r.top;
    if (dx || dy) {
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
        { duration: 250, easing: "ease" }
      );
    }
  });
});

// ----- the + button: add a picture, some text, or a color to the current moodboard -----
const addDialog = document.getElementById("mb-add-dialog");
const addForm = document.getElementById("mb-add-form");
const addMsg = document.getElementById("mb-add-msg");
const addGo = document.getElementById("mb-add-go");
const addButton = document.getElementById("mb-add");
let addKind = "image";
let addForSite = false;        // true when the owner is adding a box for everyone
let addColors = ["#e8b4c8"];
const SWATCH_IDEAS = ["#9fb8d6", "#f2e3a5", "#b9d9b0", "#d9b9e8", "#f0b99b", "#a5dcd6", "#c9c9c9"];

function drawSwatches() {
  const box = document.getElementById("mb-add-swatches");
  box.innerHTML = "";
  addColors.forEach((color, i) => {
    const wrap = document.createElement("span");
    wrap.className = "sw";
    const input = document.createElement("input");
    input.type = "color";
    input.value = color;
    input.setAttribute("aria-label", "color " + (i + 1));
    input.addEventListener("input", () => { addColors[i] = input.value; });
    wrap.appendChild(input);
    if (addColors.length > 1) {
      const x = document.createElement("button");
      x.type = "button";
      x.className = "sw-x";
      x.textContent = "×";
      x.setAttribute("aria-label", "remove color " + (i + 1));
      x.addEventListener("click", () => { addColors.splice(i, 1); drawSwatches(); });
      wrap.appendChild(x);
    }
    box.appendChild(wrap);
  });
  document.getElementById("mb-add-morecolor").hidden = addColors.length >= 8;
}

document.getElementById("mb-add-morecolor").addEventListener("click", () => {
  if (addColors.length >= 8) return;
  addColors.push(SWATCH_IDEAS[(addColors.length - 1) % SWATCH_IDEAS.length]);
  drawSwatches();
});

function setAddKind(kind) {
  addKind = kind;
  document.querySelectorAll("#mb-add-kinds button").forEach((btn) => btn.setAttribute("aria-pressed", String(btn.dataset.kind === kind)));
  addForm.querySelectorAll("[data-fields]").forEach((box) => { box.hidden = box.dataset.fields !== kind; });
  addMsg.textContent = "";
}

function openAdd(forSite) {
  if (!boards.length) return;
  addForSite = forSite === true;
  addForm.reset();
  setAddKind("image");
  addColors = ["#e8b4c8"];
  drawSwatches();
  document.getElementById("mb-add-filehint").textContent = addForSite
    ? "uploaded pictures are saved online, so everyone can see them."
    : "uploaded pictures stay in your browser. no one else can see.";
  document.getElementById("mb-add-title").textContent = addForSite ? "add for everyone" : "add more";
  document.getElementById("mb-add-sub").textContent = addForSite
    ? "goes onto " + boardKey(currentBoard) + " for everyone to see"
    : "goes onto " + boardKey(currentBoard);
  addDialog.hidden = false;
  document.getElementById("mb-add-src").focus();
}

function closeAdd() {
  if (addDialog.hidden) return;
  addDialog.hidden = true;
  (addForSite ? addButton : document.getElementById("mb-add-mine")).focus();
}

// puts a new box at the end of the current board and remembers it
let addFailed = "";            // why the last add didn't work: "load" (picture) or "save" (browser storage)

async function addToBoard(b, raw) {
  addFailed = "";
  if (!boardReady[b]) await boardPrep[b];
  const item = normalizeItem(raw);
  await loadShape(item);
  if (!boards[b]) return false;
  if (item.type === "image" && item.failed) { addFailed = "load"; return false; }

  if (!boards[b] || !persistAdd(b, raw)) { addFailed = "save"; return false; }

  boardItems[b].push(item);
  const idx = boardItems[b].length - 1;
  const rows = boardRows[b];
  const last = rows[rows.length - 1];
  const used = last ? last.reduce((sum, i) => sum + itemCols(boardItems[b][i]), 0) : 99;
  if (last && used + itemCols(item) <= 12) last.push(idx);
  else rows.push([idx]);
  saveLayout(b);
  if (b === currentBoard) drawBoard(b);
  return true;
}

// the + shows a little menu under it: hover on a computer, tap on a phone
// (guarded: if index.html is out of date and has no menu, the rest of the page still works)
if (document.getElementById("mb-plus-wrap")) {
  const plusWrap = document.getElementById("mb-plus-wrap");
  const plusDrop = document.getElementById("mb-drop");

  function setPlusMenu(open) {
    // "add entry" needs a shared moodboard to put it on (not a private one of your own)
    if (open) document.getElementById("mb-choose-entry").hidden = !boards.length || !!boardMine[currentBoard];
    plusWrap.classList.toggle("open", open);
    addButton.setAttribute("aria-expanded", String(open));
  }

  // a mouse (or pen) opens it by hovering; a finger opens it with a tap. checking the kind of pointer
  // works on every device, including laptops that also have a touch screen
  let plusPointer = "mouse";
  plusWrap.addEventListener("pointerdown", (e) => { plusPointer = e.pointerType || "mouse"; });
  plusWrap.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch") setPlusMenu(true); });
  plusWrap.addEventListener("pointerleave", (e) => { if (e.pointerType !== "touch") setPlusMenu(false); });
  addButton.addEventListener("click", (e) => {
    const open = plusWrap.classList.contains("open");
    // a mouse click while hovering keeps it open; a tap or the keyboard toggles it
    setPlusMenu(plusPointer === "touch" || e.detail === 0 ? !open : true);
  });
  document.addEventListener("click", (e) => { if (!plusWrap.contains(e.target)) setPlusMenu(false); });
  plusWrap.addEventListener("keydown", (e) => { if (e.key === "Escape") { setPlusMenu(false); addButton.focus(); } });
  document.getElementById("mb-choose-entry").addEventListener("click", () => { setPlusMenu(false); openAdd(true); });
  document.getElementById("mb-choose-board").addEventListener("click", () => { setPlusMenu(false); openNew(true); });
  window.addEventListener("hashchange", () => setPlusMenu(false));
}

// the + on a board of your own (kept in this browser)
document.getElementById("mb-add-mine").addEventListener("click", () => openAdd(false));
document.getElementById("mb-add-cancel").addEventListener("click", closeAdd);
document.getElementById("mb-add-backdrop").addEventListener("click", closeAdd);
document.getElementById("mb-add-kinds").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (btn) setAddKind(btn.dataset.kind);
});
addDialog.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAdd(); });
window.addEventListener("hashchange", closeAdd);

// ----- uploading a picture from your device -----
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;       // bigger files are turned away before trying

function readPicture(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); img.naturalWidth ? resolve(img) : reject(new Error("couldn't read that picture")); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("couldn't read that picture")); };
    img.src = url;
  });
}

// makes a picture smaller so it loads quickly: the longest side becomes maxSide, saved as a jpeg
async function shrinkPicture(file, maxSide, quality) {
  const img = await readPicture(file);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#ffffff";                    // see-through parts of a png turn white
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    cv.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("couldn't prepare that picture"))), "image/jpeg", quality);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("couldn't read that picture"));
    reader.readAsDataURL(blob);
  });
}

// the address to save for a picture picked from the device
async function pictureFromFile(file, forSite) {
  if (!/^image\//.test(file.type)) throw new Error("that file isn't a picture");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("that picture is too big (8 MB at most)");
  if (forSite) {
    // saved online for everyone: a gif keeps its animation (up to 5 MB), anything else is shrunk first
    const blob = file.type === "image/gif" && file.size <= 5 * 1024 * 1024 ? file : await shrinkPicture(file, 1800, 0.85);
    return siteDb.uploadImage(blob);
  }
  // kept in this browser only, so it's made small enough to fit in the browser's storage
  let url = await blobToDataUrl(await shrinkPicture(file, 1000, 0.78));
  if (url.length > 350000) url = await blobToDataUrl(await shrinkPicture(file, 640, 0.7));
  return url;
}

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  let raw;
  if (addKind === "image") {
    let src = document.getElementById("mb-add-src").value.trim();
    const file = document.getElementById("mb-add-file").files[0];
    if (!src && !file) { addMsg.textContent = "paste a picture address or choose a file first"; return; }
    if (file) {                                    // an uploaded file wins over an address
      addGo.disabled = true;
      addMsg.textContent = "preparing the picture...";
      try {
        src = await pictureFromFile(file, addForSite);
      } catch (err) {
        addGo.disabled = false;
        addMsg.textContent = err.message;
        return;
      }
    }
    raw = { type: "image", src, alt: document.getElementById("mb-add-alt").value.trim() };
  } else if (addKind === "text") {
    const text = document.getElementById("mb-add-text").value.trim();
    if (!text) { addMsg.textContent = "write something first"; return; }
    raw = { type: "text", text, cols: 4 };
    const title = document.getElementById("mb-add-title-in").value.trim();
    if (title) raw.title = title;
  } else {
    raw = addColors.length > 1
      ? { type: "color", colors: [...addColors], cols: Math.min(6, Math.max(2, addColors.length)) }
      : { type: "color", color: addColors[0], cols: 2 };
    const label = document.getElementById("mb-add-label").value.trim();
    if (label) raw.label = label;
  }
  addGo.disabled = true;
  addMsg.textContent = addKind === "image" ? "checking the picture..." : "";
  let ok;
  if (addForSite) {
    // saved online, so everyone sees it
    const test = normalizeItem(raw);
    await loadShape(test);
    if (test.type === "image" && test.failed) ok = false;
    else {
      try {
        addMsg.textContent = "saving...";
        await siteDb.addItem(boardKey(currentBoard), raw);
        ok = true;
      } catch (err) {
        addGo.disabled = false;
        addMsg.textContent = "couldn't save that (" + err.message + ")";
        return;
      }
    }
  } else {
    ok = await addToBoard(currentBoard, raw);
  }
  addGo.disabled = false;
  if (ok) closeAdd();
  else if (addFailed === "save") addMsg.textContent = "couldn't save that. your browser's storage might be full";
  else addMsg.textContent = addKind === "image" ? "couldn't load that picture. check the address" : "couldn't save that";
});

// ----- the in-page "are you sure?" box (the browser's own pop up can be blocked) -----
const confirmBox = document.getElementById("mb-confirm");
let confirmDone = null;

function askConfirm(message, yesLabel) {
  return new Promise((resolve) => {
    confirmDone = resolve;
    document.getElementById("mb-confirm-text").textContent = message;
    document.getElementById("mb-confirm-yes").textContent = yesLabel || "yes";
    confirmBox.hidden = false;
    document.getElementById("mb-confirm-no").focus();
  });
}

function answerConfirm(yes) {
  if (confirmBox.hidden) return;
  confirmBox.hidden = true;
  const done = confirmDone;
  confirmDone = null;
  if (done) done(yes);
}

document.getElementById("mb-confirm-yes").addEventListener("click", () => answerConfirm(true));
document.getElementById("mb-confirm-no").addEventListener("click", () => answerConfirm(false));
document.getElementById("mb-confirm-backdrop").addEventListener("click", () => answerConfirm(false));
document.addEventListener("keydown", (e) => {
  if (confirmBox.hidden || e.key !== "Escape") return;
  e.stopImmediatePropagation();       // closes only this box, not the viewer behind it
  answerConfirm(false);
});
window.addEventListener("hashchange", () => answerConfirm(false));

// ----- "make yours": a moodboard that only lives in this visitor's browser -----
const newDialog = document.getElementById("mb-new-dialog");
const newForm = document.getElementById("mb-new-form");
const newMsg = document.getElementById("mb-new-msg");
const newButton = document.getElementById("mb-new");
const MAX_MINE = 12;
let newForSite = false;        // true when the owner is making a board for everyone

function openNew(forSite) {
  newForSite = forSite === true;
  document.getElementById("mb-new-title").textContent = newForSite ? "make a board for everyone" : "make your own moodboard";
  document.getElementById("mb-new-sub").textContent = newForSite
    ? "everyone will see it on the website."
    : "this only lives on your browser. no one else can see, like a little secret.";
  newForm.reset();
  newMsg.textContent = "";
  newDialog.hidden = false;
  document.getElementById("mb-new-name").focus();
}

function closeNew() {
  if (newDialog.hidden) return;
  newDialog.hidden = true;
  (newForSite ? addButton : newButton).focus();
}

newButton.addEventListener("click", () => openNew(false));
document.getElementById("mb-new-cancel").addEventListener("click", closeNew);
document.getElementById("mb-new-backdrop").addEventListener("click", closeNew);
newDialog.addEventListener("keydown", (e) => { if (e.key === "Escape") closeNew(); });
window.addEventListener("hashchange", closeNew);

newForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (newForSite) {
    const name = document.getElementById("mb-new-name").value.trim().slice(0, 24);
    if (!name) { newMsg.textContent = "give it a name first"; return; }
    if (boards.some((board) => board.name === name)) { newMsg.textContent = "there's already a board with that name"; return; }
    try {
      newMsg.textContent = "saving...";
      await siteDb.addBoard(name);
    } catch (err) {
      newMsg.textContent = "couldn't save that (" + err.message + ")";
      return;
    }
    const k = boards.findIndex((board) => board.name === name);
    if (k >= 0) { currentBoard = k; renderTabs(); renderBoard(); }
    closeNew();
    return;
  }
  if (userBoards.length >= MAX_MINE) { newMsg.textContent = "that's plenty of boards for now (" + MAX_MINE + ")"; return; }
  const name = document.getElementById("mb-new-name").value.trim().slice(0, 24) || "my moodboard";
  const board = { name, items: [] };
  userBoards.push(board);
  if (!saveMine()) {
    userBoards.pop();
    newMsg.textContent = "couldn't save it. is your browser blocking storage?";
    return;
  }
  currentBoard = registerBoard(board, true);
  renderTabs();
  renderBoard();
  closeNew();
});

// delete a board of your own
document.getElementById("mb-delete").addEventListener("click", async () => {
  const b = currentBoard;
  if (ownerMode && boardOnline[b]) {
    const name = boards[b].name;
    const yes = await askConfirm('delete "' + name + '" for everyone, with everything in it? this can\'t be undone.', "delete");
    if (!yes) { document.getElementById("mb-delete").focus(); return; }
    try {
      await siteDb.removeBoard(name, (onlineItemMap[name] || []).map((row) => row.item && row.item.src));
    } catch (err) {
      askConfirm("couldn't delete that (" + err.message + ")", "ok");
    }
    return;
  }
  if (!boardMine[b]) return;
  const yes = await askConfirm('delete "' + boards[b].name + '" and everything in it? this can\'t be undone.', "delete");
  if (!yes) { document.getElementById("mb-delete").focus(); return; }
  if (!boardMine[b] || b !== currentBoard) return;
  userBoards.splice(userBoards.indexOf(boards[b]), 1);
  saveMine();
  try {                                    // later boards move up one spot, and so do their saved arrangements
    const all = loadLayouts(), next = {};
    Object.keys(all).forEach((key) => {
      const k = Number(key);
      if (k < b) next[k] = all[key];
      else if (k > b) next[k - 1] = all[key];
    });
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
  } catch (e) {}
  [boards, boardMine, boardOnline, boardOnlineIds, boardItems, boardSig, origCount, boardReady, boardPrep, boardRows].forEach((list) => list.splice(b, 1));
  currentBoard = Math.max(0, b - 1);
  renderTabs();
  renderBoard();
});

// ----- click a box to see it enlarged, like a carousel -----
const light = document.getElementById("mb-light");
const lightStage = document.getElementById("mb-light-stage");
const lightTrack = document.getElementById("mb-light-track");
const lightCount = document.getElementById("mb-count");
const lightPrev = document.getElementById("mb-prev");
const lightNext = document.getElementById("mb-next");
const lightRemove = document.getElementById("mb-remove");
let slides = [];
let slideItems = [];           // the item number behind each slide
let slideIndex = 0;
let lightFocus = null;
let mbJustDragged = false;     // true for an instant after a drag, so letting go doesn't open a box

// the enlarged version of one box: pictures whole, text in full
function buildSlide(item) {
  const slide = document.createElement("div");
  const type = item.type || "text";
  slide.className = "mb-slide mb-slide-" + type;

  if (type === "image") {
    if (item.src && !item.failed) {
      const img = document.createElement("img");
      img.referrerPolicy = "no-referrer";
      img.src = item.src;
      img.alt = item.alt || "";
      img.draggable = false;
      img.addEventListener("load", () => centerSlide(false));   // its width is only known once it loads
      img.addEventListener("error", () => {
        img.replaceWith(imagePlaceholder(item.alt, true));
        slide.classList.add("mb-slide-ph");
        centerSlide(false);
      });
      slide.appendChild(img);
    } else {
      slide.classList.add("mb-slide-ph");
      slide.appendChild(imagePlaceholder(item.alt, item.failed));
    }
  } else if (type === "color") {
    fillColorBox(slide, item);
  } else {
    if (item.title) {
      const title = document.createElement("h2");
      title.textContent = item.title;
      slide.appendChild(title);
    }
    const body = document.createElement("p");
    body.textContent = item.text || "";
    slide.appendChild(body);
  }
  return slide;
}

// slides the row so the chosen box sits in the middle
function centerSlide(animate = true) {
  const slide = slides[slideIndex];
  if (!slide) return;
  lightTrack.classList.toggle("instant", !animate);
  const x = lightStage.clientWidth / 2 - (slide.offsetLeft + slide.offsetWidth / 2);
  lightTrack.style.transform = `translateX(${x}px)`;
}

// the database id of a box you added on the website, or null
function siteItemId(b, idx) {
  return ownerMode && boardOnlineIds[b] && boardOnlineIds[b][idx] ? boardOnlineIds[b][idx] : null;
}

function showSlide(i, animate = true) {
  slideIndex = Math.max(0, Math.min(slides.length - 1, i));
  slides.forEach((s, k) => s.classList.toggle("active", k === slideIndex));
  lightCount.textContent = `${slideIndex + 1} / ${slides.length}`;
  lightPrev.disabled = slideIndex === 0;
  lightNext.disabled = slideIndex === slides.length - 1;
  // boxes you added in this browser can be removed; so can the ones you put on the website, while you're signed in
  lightRemove.hidden = !(slideItems[slideIndex] >= origCount[currentBoard] || siteItemId(currentBoard, slideItems[slideIndex]));
  centerSlide(animate);
}

function openLightbox(el) {
  // the row is in the same order as the boxes are on the board right now
  const boxes = [...mbGrid.querySelectorAll(".mb-item")];
  const items = boardItems[currentBoard];
  slideItems = boxes.map((box) => Number(box.dataset.index));
  slides = boxes.map((box) => buildSlide(items[Number(box.dataset.index)]));
  lightTrack.innerHTML = "";
  slides.forEach((s) => lightTrack.appendChild(s));
  lightFocus = document.activeElement;
  light.hidden = false;
  showSlide(boxes.indexOf(el), false);
  document.getElementById("mb-light-close").focus();
}

function closeLightbox() {
  if (light.hidden) return;
  light.hidden = true;
  lightTrack.innerHTML = "";
  slides = [];
  slideItems = [];
  if (lightFocus && lightFocus.focus) lightFocus.focus();
}

lightPrev.addEventListener("click", () => showSlide(slideIndex - 1));
lightNext.addEventListener("click", () => showSlide(slideIndex + 1));
document.getElementById("mb-light-close").addEventListener("click", closeLightbox);

// remove a box you added with the + button (boxes from moodboards.js are removed by editing that file)
lightRemove.addEventListener("click", async () => {
  const b = currentBoard, idx = slideItems[slideIndex];
  const siteId = siteItemId(b, idx);
  if (siteId) {
    const yes = await askConfirm("remove this box for everyone?", "remove");
    if (!yes) { lightRemove.focus(); return; }
    try {
      await siteDb.removeItem(siteId, boardItems[b][idx].src);      // reloads the boards, which closes this viewer
    } catch (err) {
      askConfirm("couldn't remove that (" + err.message + ")", "ok");
    }
    return;
  }
  if (!(idx >= origCount[b])) return;
  const yes = await askConfirm("remove this box?", "remove");
  if (!yes) { lightRemove.focus(); return; }
  if (b !== currentBoard || !boardItems[b][idx]) return;
  persistRemove(b, idx);
  boardItems[b].splice(idx, 1);
  boardRows[b] = boardRows[b].map((r) => r.filter((i) => i !== idx).map((i) => (i > idx ? i - 1 : i))).filter((r) => r.length);
  saveLayout(b);
  lightFocus = null;
  closeLightbox();
  drawBoard(b);
});

// click a faded neighbor to bring it to the middle; click empty space to close
lightTrack.addEventListener("click", (e) => {
  const slide = e.target.closest(".mb-slide");
  if (!slide) closeLightbox();
  else if (!slide.classList.contains("active")) showSlide(slides.indexOf(slide));
});
lightStage.addEventListener("click", (e) => {
  if (e.target === lightStage) closeLightbox();
});

document.addEventListener("keydown", (e) => {
  if (light.hidden || !confirmBox.hidden) return;
  if (e.key === "ArrowLeft") showSlide(slideIndex - 1);
  else if (e.key === "ArrowRight") showSlide(slideIndex + 1);
  else if (e.key === "Escape") closeLightbox();
});

// swipe left or right on a touch screen
let swipeX = null;
lightStage.addEventListener("touchstart", (e) => { swipeX = e.touches[0].clientX; }, { passive: true });
lightStage.addEventListener("touchend", (e) => {
  if (swipeX === null) return;
  const dx = e.changedTouches[0].clientX - swipeX;
  swipeX = null;
  if (Math.abs(dx) > 50) showSlide(slideIndex + (dx < 0 ? 1 : -1));
});

window.addEventListener("resize", () => { if (!light.hidden) centerSlide(false); });
window.addEventListener("hashchange", closeLightbox);   // leaving the page closes it

// clicking a box opens it (a drag doesn't)
mbGrid.addEventListener("click", (e) => {
  if (mbJustDragged) return;
  const el = e.target.closest(".mb-item");
  if (el && mbGrid.contains(el)) openLightbox(el);
});
mbGrid.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const el = e.target.closest(".mb-item");
  if (!el) return;
  e.preventDefault();
  openLightbox(el);
});

function readRows() {
  return [...mbGrid.children]
    .map((row) => [...row.children].map((c) => Number(c.dataset.index)))
    .filter((row) => row.length);
}

// ----- drag a box to a new spot; the others slide out of the way -----
// opts.immediate: lift the box at once (used after a long press on a touch screen)
// opts.onDone: called when the box is let go
function startItemDrag(e, el, opts) {
  const startX = e.clientX, startY = e.clientY;
  const mainEl = document.getElementById("main");
  let pointer = { x: startX, y: startY };
  let started = false;
  let grabX = 0, grabY = 0;     // where you grabbed the box, as a fraction of its size
  let frame = null;
  let lastMove = 0;
  let movePoint = null;         // where the cursor was at the last move
  let lastKey = null;           // the spot the box was last put in

  // keeps the held box under the cursor, wherever the board has put it
  function follow() {
    el.style.transform = "none";
    const r = el.getBoundingClientRect();
    el.style.transform = `translate(${pointer.x - r.left - grabX * r.width}px, ${pointer.y - r.top - grabY * r.height}px)`;
  }

  // works out where the held box would go: before or after the box under the
  // cursor (left half = before, right half = after), or the end of a short line
  function spotUnderCursor() {
    const hit = document.elementFromPoint(pointer.x, pointer.y);
    if (!hit) return null;
    const target = hit.closest(".mb-item");
    if (target && target !== el && mbGrid.contains(target)) {
      const r = target.getBoundingClientRect();
      return { ref: target, where: pointer.x < r.left + r.width / 2 ? "before" : "after" };
    }
    const row = !target && hit.closest(".mb-row");
    if (row) {
      // the empty space after the last box of a line
      const last = row.lastElementChild;
      if (last !== el && pointer.x > last.getBoundingClientRect().right) return { ref: last, where: "after" };
    }
    return null;
  }

  function tryMove() {
    if (performance.now() - lastMove < 120) return;
    // after a move, wait for the cursor to move on, so boxes don't flip back and forth
    if (movePoint && Math.hypot(pointer.x - movePoint.x, pointer.y - movePoint.y) < 20) return;

    const spot = spotUnderCursor();
    if (!spot) {
      lastKey = null;
      return;
    }
    const key = spot.ref.dataset.index + spot.where;
    if (key === lastKey) return;
    lastKey = key;
    // already exactly there?
    if (spot.where === "before" && spot.ref.previousElementSibling === el) return;
    if (spot.where === "after" && spot.ref.nextElementSibling === el) return;

    lastMove = performance.now();
    movePoint = { x: pointer.x, y: pointer.y };

    const others = [...mbGrid.querySelectorAll(".mb-item")].filter((c) => c !== el);
    const before = new Map(others.map((c) => [c, c.getBoundingClientRect()]));

    const oldRow = el.parentElement;
    if (spot.where === "before") spot.ref.before(el);
    else spot.ref.after(el);
    if (!oldRow.children.length) oldRow.remove();   // a line with nothing left disappears
    [...mbGrid.children].forEach(setRowVars);
    follow();

    // slide every other box from where it was to where it is now
    if (reduceMotion.matches) return;
    others.forEach((c) => {
      const a = before.get(c), b = c.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (dx || dy) {
        c.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
          { duration: 200, easing: "ease" }
        );
      }
    });
  }

  // runs every frame while a box is held
  function tick() {
    // holding a box near the top or bottom scrolls the page along
    const r = mainEl.getBoundingClientRect();
    const EDGE = 60, SPEED = 12;
    if (pointer.y < r.top + EDGE) mainEl.scrollTop -= SPEED;
    else if (pointer.y > r.bottom - EDGE) mainEl.scrollTop += SPEED;
    follow();
    tryMove();
    frame = requestAnimationFrame(tick);
  }

  function lift() {
    started = true;
    const r = el.getBoundingClientRect();
    grabX = (startX - r.left) / r.width;
    grabY = (startY - r.top) / r.height;
    el.classList.add("lifted");
    mbGrid.classList.add("sorting");
    frame = requestAnimationFrame(tick);
  }

  function onMove(ev) {
    pointer = { x: ev.clientX, y: ev.clientY };
    if (started) return;
    // small wiggles don't count as a drag
    if (Math.hypot(pointer.x - startX, pointer.y - startY) < 5) return;
    lift();
  }

  function onUp() {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    if (opts && opts.onDone) opts.onDone();
    if (!started) return;
    cancelAnimationFrame(frame);
    mbJustDragged = true;                                    // so letting go after a drag doesn't open the box
    setTimeout(() => { mbJustDragged = false; }, 0);

    // settle into the final spot
    const from = el.getBoundingClientRect();
    el.style.transform = "none";
    const to = el.getBoundingClientRect();
    el.classList.remove("lifted");
    mbGrid.classList.remove("sorting");
    if (!reduceMotion.matches) {
      el.style.zIndex = 30;
      const slide = el.animate(
        [{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)` }, { transform: "none" }],
        { duration: 180, easing: "ease" }
      );
      slide.onfinish = () => { el.style.zIndex = ""; };
    }

    // remember the new arrangement, so switching tabs and coming back keeps it
    boardRows[currentBoard] = readRows();
    saveLayout(currentBoard);
  }

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  if (opts && opts.immediate) lift();
}

// On a touch screen, a quick swipe still scrolls the page and a tap opens the box.
// To move a box, press and hold it for a moment (it buzzes if your phone can), then drag.
let lastPointerType = "mouse";

function startTouchHold(e, el) {
  const id = e.pointerId;
  let x = e.clientX, y = e.clientY;
  const sx = x, sy = y;
  const timer = setTimeout(pickUp, 350);

  function stopWatching() {
    clearTimeout(timer);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", cancel);
    window.removeEventListener("pointercancel", cancel);
  }
  function cancel() { stopWatching(); }
  function onMove(ev) {
    if (ev.pointerId !== id) return;
    x = ev.clientX;
    y = ev.clientY;
    if (Math.hypot(x - sx, y - sy) > 10) cancel();     // they're scrolling, not holding
  }
  function pickUp() {
    stopWatching();
    if (navigator.vibrate) { try { navigator.vibrate(15); } catch (err) {} }
    // while a box is held, the page must not scroll under the finger
    const stopScroll = (ev) => ev.preventDefault();
    window.addEventListener("touchmove", stopScroll, { passive: false });
    startItemDrag({ clientX: x, clientY: y }, el, {
      immediate: true,
      onDone: () => window.removeEventListener("touchmove", stopScroll),
    });
  }

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", cancel);
  window.addEventListener("pointercancel", cancel);
}

mbGrid.addEventListener("pointerdown", (e) => {
  lastPointerType = e.pointerType;
  if (e.button !== 0) return;
  const el = e.target.closest(".mb-item");
  if (!el) return;
  if (e.pointerType === "touch") startTouchHold(e, el);
  else startItemDrag(e, el);
});

// no "save image" / copy menu when a finger presses and holds a box
mbGrid.addEventListener("contextmenu", (e) => {
  if (lastPointerType === "touch" && e.target.closest(".mb-item")) e.preventDefault();
});

mbGrid.addEventListener("dragstart", (e) => e.preventDefault());   // no ghost images

renderTabs();
renderBoard();

// ---------- Today's date (bottom right), shown as month.date.year ----------
const todayEl = document.getElementById("today");

function showDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  todayEl.textContent = `${month}.${day}.${now.getFullYear()}`;
}

showDate();
setInterval(showDate, 60000);   // re-checks every minute so it rolls over at midnight

// ---------- Light / dark toggle ----------
const themeBtn = document.getElementById("btn-theme");

function setTheme(mode) {
  const light = mode === "light";
  document.documentElement.dataset.theme = light ? "light" : "dark";
  themeBtn.textContent = light ? "let the darkness creep in ⏾⋆.˚" : "bring the sun back 𖤓˚࿔";
  try { localStorage.setItem("theme", mode); } catch (e) {}
}

themeBtn.addEventListener("click", () => {
  const isLight = document.documentElement.dataset.theme === "light";
  setTheme(isLight ? "dark" : "light");
});

// remember their choice (so refresh doesn't reset it); light is the default
let saved = "light";
try { saved = localStorage.getItem("theme") || "light"; } catch (e) {}
setTheme(saved);