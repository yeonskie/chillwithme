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

// click "navigation menu" to open or close the menu
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
  const tools = document.querySelector(".thoughts-toolbar");     // the shuffle / pick buttons can live inside the canvas (duck pond), so don't wipe them
  if (tools && canvas.contains(tools)) document.body.appendChild(tools);
  canvas.innerHTML = "";
  // the duck pond (duckpond.js) shows the entries as ducks; the old grid below is only used if that file is missing
  if (window.DuckPond) {
    canvas.classList.add("pond");
    entryEls = [];
    DuckPond.build(canvas, entries, openFeatured);
    return;
  }
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
  document.body.classList.add("entry-open");   // the secret door steps out of the way
  featuredCard.scrollTop = 0;
  expandBtn.focus();
  // journal.js listens for this, to show edit / delete when you're signed in
  document.dispatchEvent(new CustomEvent("entryshown", { detail: entries[i] }));
}

function closeFeatured() {
  if (featured.hidden) return;
  featured.hidden = true;
  document.body.classList.remove("entry-open");
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

// shuffle mixes up the order of the boxes (or, in the duck pond, which ducks have the thoughts)
document.getElementById("btn-shuffle").addEventListener("click", () => {
  if (window.DuckPond) { DuckPond.shuffle(); return; }
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
const TABS_SHOWN = 5;          // how many moodboard tabs show before the rest go behind "+ more"
let tabsExpanded = false;

// boards and boxes you added on the website while signed in (journal.js loads them from the database)
let onlineBoardNames = [];
let onlineItemMap = {};       // board name -> [{ id, item }]
let boardMeta = {};           // board name -> { description, position, layout, layout_at }: what you set for everyone (journal.js loads it)
const metaOf = (name) => boardMeta[name] || {};
let savedFlash = null;        // the timer that puts "save order" back after it says "saved"
const unsavedOrder = new Set();   // names of shared boards you've rearranged but not saved yet (the "save order" button)
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

// the name shown for a board: a title you set for everyone (owner), otherwise its own name
function boardTitle(b) {
  const board = boards[b];
  if (!board) return "";
  const t = boardMine[b] ? "" : String(metaOf(board.name).title || "").trim();
  return t || board.name || "moodboard " + (b + 1);
}

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

// ----- the order you set for everyone (saved online by journal.js, see supabase-board-meta.sql) -----
// each box is remembered by its online id (boxes from moodboards.js by their place in that file),
// so adding or removing a box later doesn't throw the order away
function itemKey(b, i) {
  return (boardOnlineIds[b] && boardOnlineIds[b][i]) || "c" + i;
}

function sharedRows(b, count) {
  const m = metaOf(boards[b] && boards[b].name);
  if (boardMine[b] || !Array.isArray(m.layout)) return null;
  const where = new Map();
  for (let i = 0; i < count; i++) where.set(itemKey(b, i), i);
  const used = new Set(), rows = [];
  m.layout.forEach((row) => {
    if (!Array.isArray(row)) return;
    const line = [];
    row.forEach((key) => {
      if (where.has(key) && !used.has(key)) { used.add(key); line.push(where.get(key)); }
    });
    if (line.length) rows.push(line);
  });
  if (!rows.length) return null;
  const fresh = [];                                // boxes added since you set the order go at the top, newest first
  for (let i = count - 1; i >= 0; i--) if (!used.has(itemKey(b, i))) fresh.push(i);
  return fresh.length ? evenRows([fresh, ...rows]) : rows;
}

// the big title under the tickets: the alternate title you set online, otherwise the board's name
function boardHeading(b) {
  if (!boards[b]) return "";
  const h = boardMine[b] ? "" : String(metaOf(boards[b].name).heading || "").trim();
  return h || boardTitle(b);
}

// the description under a moodboard's name: what you set online, otherwise "description" from moodboards.js
function boardDesc(b) {
  if (!boards[b] || boardMine[b]) return "";
  const m = metaOf(boards[b].name);
  return String(m.description != null ? m.description : boards[b].description || "").trim();
}

// saves how a board is arranged, for everyone (owner only; the "save order" button); clear puts it back to the default
function shareLayout(b, clear) {
  const name = boards[b].name;
  const keys = clear ? null : boardRows[b].map((row) => row.map((i) => itemKey(b, i)));
  const at = new Date().toISOString();
  if (typeof siteDb === "undefined") return Promise.reject(new Error("not available"));
  return siteDb.saveLayout(name, keys, at).then(() => {
    boardMeta[name] = { ...metaOf(name), layout: keys, layout_at: at };
  });
}

// how many of the 12 columns a box takes: the "cols" you set, otherwise a picture
// fits its own shape (a square picture is 3 columns, a wide one more, a tall one fewer)
function itemCols(item) {
  // text boxes without a width of their own are narrow: 2 columns for a short note, 3 for anything longer
  // (the add box used to save every text box as 4 wide, so a 4 on a text box counts as "automatic" too)
  if (item.type === "text" && (!item.cols || item.cols === 4)) {
    return String((item.title || "") + (item.text || "")).trim().length <= 60 ? 2 : 3;
  }
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

// every line holds 4 boxes (only the last line may hold fewer): this keeps the order and re-cuts the lines
const PER_ROW = 4;
function evenRows(rows) {
  const flat = rows.flat();
  const out = [];
  for (let i = 0; i < flat.length; i += PER_ROW) out.push(flat.slice(i, i + PER_ROW));
  return out;
}

// the order boxes start in: the newest ones (added on the website, or in this browser) come first,
// then the boxes from moodboards.js in the order they're written there
function defaultOrder(b, count) {
  const fileCount = boardMine[b] || !boards[b] ? 0 : Math.min(count, (boards[b].items || []).length);
  const order = [];
  for (let i = count - 1; i >= fileCount; i--) order.push(i);
  for (let i = 0; i < fileCount; i++) order.push(i);
  return order;
}

// which boxes start on which line: every box is the same size now, so each line holds 4 (and wraps on small screens)
function initialRows(items, b) {
  const order = b === undefined ? items.map((item, i) => i) : defaultOrder(b, items.length);
  const rows = [];
  order.forEach((i) => {
    if (!rows.length || rows[rows.length - 1].length >= 4) rows.push([]);
    rows[rows.length - 1].push(i);
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
  boardSig.push(hashText(mine ? "mine:" + board.name : JSON.stringify([board, ids, metaOf(board.name).layout_at || ""])));
  boardReady.push(false);
  boardPrep.push(
    Promise.all(items.map(loadShape)).then(() => {
      const k = boards.indexOf(board);          // the board may have moved or been deleted while its pictures loaded
      if (k < 0) return;
      boardRows[k] = savedRows(k, items.length) || sharedRows(k, items.length) || initialRows(items, k);
      boardReady[k] = true;
    })
  );
  return b;
}

baseBoards.forEach((board) => registerBoard(board, false, false));
userBoards.forEach((board) => registerBoard(board, true, false));

// starts the boards over: moodboards.js first, then the ones you made on the website, then this browser's own
function rebuildBoards() {
  unsavedOrder.clear();
  const keep = boards[currentBoard] ? boards[currentBoard].name : null;
  [boards, boardMine, boardOnline, boardOnlineIds, boardItems, boardSig, origCount, boardReady, boardPrep, boardRows].forEach((list) => { list.length = 0; });
  // the shared boards sit in the order you set (the move buttons), the rest in the order they were made
  const shared = baseBoards.map((board) => ({ board, online: false }));
  onlineBoardNames
    .filter((name) => !baseBoards.some((base) => base.name === name))
    .forEach((name) => shared.push({ board: { name, items: [] }, online: true }));
  const place = (e) => (Number.isInteger(metaOf(e.board.name).position) ? metaOf(e.board.name).position : Infinity);
  shared
    .map((e, n) => ({ e, n }))
    .sort((x, y) => (place(x.e) === place(y.e) ? x.n - y.n : place(x.e) < place(y.e) ? -1 : 1))
    .forEach(({ e }) => registerBoard(e.board, false, e.online));
  userBoards.forEach((board) => registerBoard(board, true, false));
  const k = keep === null ? -1 : boards.findIndex((board) => board.name === keep);
  currentBoard = k >= 0 ? k : 0;
  renderTabs();
  renderBoard();
}

// journal.js calls this with what's stored online
function setOnlineBoards(names, rows, meta) {
  onlineBoardNames = names.slice();
  boardMeta = {};
  (meta || []).forEach((m) => { if (m && typeof m.board_name === "string") boardMeta[m.board_name] = m; });
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
  window.dispatchEvent(new CustomEvent("ownermode", { detail: ownerMode }));   // other pages (like the idol game) listen for this
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
      if (item.alt) {                       // the caption sits along the bottom of the box
        const cap = document.createElement("p");
        cap.className = "mb-cap";
        const words = document.createElement("span");       // (the two-line limit sits on this inner part, so no padding lets a third line peek out)
        words.textContent = item.alt;
        cap.appendChild(words);
        el.appendChild(cap);
      }
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

let tabLimit = TABS_SHOWN;       // on phones this shrinks until the closed tabs (and "+ N more") fit in two rows
function renderTabs() {
  tabLimit = TABS_SHOWN;
  renderTabsPass();
}
function renderTabsPass() {
  const mine = !!boardMine[currentBoard];
  document.getElementById("mb-add-mine").hidden = !mine || ownerMode;       // adding to a board of your own (you, the owner, use the other + instead)
  // you can delete your own boards, and (signed in) the ones you made for everyone
  document.getElementById("mb-delete").hidden = !(mine || (ownerMode && boardOnline[currentBoard]));
  document.getElementById("mb-note").hidden = !mine;
  // the description under the tabs, and (for you, signed in) the buttons that change it and the board's place
  const heading = document.getElementById("mb-heading");
  if (heading) {
    const t = boardHeading(currentBoard);
    heading.textContent = t;
    heading.hidden = !t;
  }
  const desc = document.getElementById("mb-desc");
  if (desc) {
    const text = boardDesc(currentBoard);
    desc.textContent = text;
    desc.hidden = !text;
  }
  const shareable = ownerMode && boards[currentBoard] && !mine;
  const sharedList = boards.map((x, i) => i).filter((i) => !boardMine[i]);
  const editBtn = document.getElementById("mb-edit-desc");
  const leftBtn = document.getElementById("mb-move-left");
  const rightBtn = document.getElementById("mb-move-right");
  updateSaveOrder();
  const renameBtn = document.getElementById("mb-rename");
  if (renameBtn) renameBtn.hidden = !(shareable || (mine && boards[currentBoard]));
  if (editBtn && leftBtn && rightBtn) {
    editBtn.hidden = !shareable;
    leftBtn.hidden = !shareable || sharedList[0] === currentBoard;
    rightBtn.hidden = !shareable || sharedList[sharedList.length - 1] === currentBoard;
  }
  mbTabs.innerHTML = "";
  // only the first few moodboards show as tabs; the rest sit behind a "+ more" button (the board you're on always shows)
  const crowded = boards.length > tabLimit;
  mbTabs.classList.toggle("expanded", crowded && tabsExpanded);
  boards.forEach((board, i) => {
    if (crowded && !tabsExpanded && i >= tabLimit && i !== currentBoard) return;
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "mb-tab";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(i === currentBoard));
    tab.textContent = boardTitle(i);
    tab.addEventListener("click", () => {
      currentBoard = i;
      renderTabs();
      renderBoard();
    });
    mbTabs.appendChild(tab);
  });
  // closed: "+ N more" is the last tab in the row
  const hidden = boards.length - boards.filter((b, i) => i < tabLimit || i === currentBoard).length;
  if (crowded && !tabsExpanded && hidden > 0) {
    const moreTab = document.createElement("button");
    moreTab.type = "button";
    moreTab.className = "mb-tab mb-more";
    moreTab.id = "mb-more-tab";
    moreTab.setAttribute("aria-expanded", "false");
    moreTab.textContent = "+ " + hidden + " more";
    moreTab.addEventListener("click", () => {
      tabsExpanded = true;
      renderTabs();
      const less = document.getElementById("mb-more");
      if (less) less.focus();
    });
    mbTabs.appendChild(moreTab);
  }
  // open: a plain "see less" sits left of reset
  const less = document.getElementById("mb-more");
  if (less) {
    less.hidden = !(crowded && tabsExpanded);
    less.textContent = "see less";
  }
  fitStrip();
  // phones: at most two rows of tickets while the list is closed ("+ N more" counts as one of them)
  if (!tabsExpanded && tabLimit > 1 && window.matchMedia("(max-width: 40rem)").matches && mbTabs.offsetParent !== null) {
    const rows = new Set([...mbTabs.children].map((c) => c.offsetTop)).size;
    if (rows > 2) { tabLimit--; renderTabsPass(); return; }
  }
  checkTopWrap();
}

// tabs as ticket stubs: one connected strip when every moodboard name fits on one line (wider screens, closed list),
// otherwise each tab is its own ticket (see "ticket stubs" in style.css)
function fitStrip() {
  const top = document.querySelector(".mb-top");
  if (!top || top.offsetParent === null) return;
  const wantStrip = !mbTabs.classList.contains("expanded") && mbTabs.children.length > 0 && !window.matchMedia("(max-width: 40rem)").matches;
  if (!wantStrip) { mbTabs.classList.remove("mb-strip"); return; }
  // measure the strip's natural width with the strip look on, against the room the tabs actually have
  mbTabs.classList.add("mb-strip");
  const room = top.clientWidth - 8;
  const need = [...mbTabs.children].reduce((w, c) => w + c.getBoundingClientRect().width, 0) + 14;
  if (need > room) mbTabs.classList.remove("mb-strip");
}
window.addEventListener("resize", fitStrip);
if (window.ResizeObserver) new ResizeObserver(() => fitStrip()).observe(document.querySelector(".mb-top") || document.body);

// centers the buttons by the moodboard names whenever they don't all fit on one line
// (measured with the centering off, so it can switch back when the window is made wider)
function checkTopWrap() {
  const top = document.querySelector(".mb-top");
  const left = top && top.querySelector(".mb-left");
  const right = top && top.querySelector(".mb-right");
  if (!top || !left || !right || top.offsetParent === null) return;      // not on screen
  if (window.getComputedStyle(top).display !== "flex") { top.classList.remove("wrapped"); return; }   // phones use their own layout
  top.classList.remove("wrapped");
  const kids = [...left.children].filter((c) => c.offsetParent !== null);
  const leftWraps = kids.length > 1 && kids.some((c) => Math.abs(c.offsetTop - kids[0].offsetTop) > 4 && c.offsetTop > kids[0].offsetTop + 4);
  const rightWraps = right.offsetTop >= left.offsetTop + left.offsetHeight - 2 && [...right.children].some((c) => c.offsetParent !== null);
  top.classList.toggle("wrapped", leftWraps || rightWraps);
}
window.addEventListener("resize", checkTopWrap);
window.addEventListener("hashchange", () => setTimeout(checkTopWrap, 0));
if (window.ResizeObserver) {
  const mbBox = document.querySelector(".mb");
  if (mbBox) new ResizeObserver(() => checkTopWrap()).observe(mbBox);
}

function drawBoard(b) {
  boardRows[b] = evenRows(boardRows[b]);       // always 4 to a line, whatever was saved or added
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

// opens a moodboard by its number (home.js uses this for the random pages)
function showBoard(i) {
  if (!(i >= 0 && i < boards.length)) return;
  currentBoard = i;
  renderTabs();
  renderBoard();
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

// "see less" (shown once all the moodboards are open) folds the extra moodboards away again
if (document.getElementById("mb-more")) {
  document.getElementById("mb-more").addEventListener("click", () => {
    tabsExpanded = false;
    renderTabs();
    const again = document.getElementById("mb-more-tab");
    if (again) again.focus();
  });
}

// the reset button: put this board back the way it is in moodboards.js
document.getElementById("mb-reset").addEventListener("click", () => {
  const b = currentBoard;
  if (!boardReady[b]) return;
  const before = new Map([...mbGrid.querySelectorAll(".mb-item")].map((el) => [el.dataset.index, el.getBoundingClientRect()]));

  // a visitor goes back to the order you set for everyone; you (signed in) clear that order too
  boardRows[b] = (!ownerMode && sharedRows(b, boardItems[b].length)) || initialRows(boardItems[b], b);
  clearSavedLayout(b);
  if (ownerMode && !boardMine[b]) {                    // for you this is a draft: "save order" makes it the order for everyone
    unsavedOrder.add(boards[b].name);
    updateSaveOrder();
  }
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
  document.getElementById("mb-add-title").textContent = addForSite ? "add for everyone" : "add more";
  document.getElementById("mb-add-sub").textContent = addForSite
    ? "goes onto " + boardTitle(currentBoard) + " for everyone to see"
    : "goes onto " + boardTitle(currentBoard);
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
  boardRows[b] = evenRows([[idx], ...boardRows[b]]);       // the new box goes first
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

// adds several uploaded pictures in one go (the caption, if there is one, goes on every box).
// they end up in the order they were picked; a picture that fails is skipped and the rest still go in
// (each entry is either a File from the device or a picture address typed in; addresses go first, then the files)
async function addManyPictures(files, alt) {
  addGo.disabled = true;
  let done = 0, failed = 0;
  // on a private board each new box goes to the front, so the last one picked is added first
  const list = addForSite ? files : [...files].reverse();
  for (let i = 0; i < list.length; i++) {
    addMsg.textContent = "adding picture " + (done + failed + 1) + " of " + list.length + "...";
    try {
      const src = typeof list[i] === "string" ? list[i] : await pictureFromFile(list[i], addForSite);
      const raw = { type: "image", src, alt };
      if (addForSite) {
        const test = normalizeItem(raw);
        await loadShape(test);
        if (test.type === "image" && test.failed) throw new Error("load");
        await siteDb.addItem(boardKey(currentBoard), raw);
      } else if (!(await addToBoard(currentBoard, raw))) {
        throw new Error("save");
      }
      done++;
    } catch (err) {
      failed++;
    }
  }
  addGo.disabled = false;
  if (!failed) { closeAdd(); return; }
  addMsg.textContent = done
    ? "added " + done + ", but " + failed + " didn't work (too big, not a picture, or storage is full)"
    : "none of those pictures could be added (too big, not a picture, or storage is full)";
}

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  let raw;
  if (addKind === "image") {
    let src = document.getElementById("mb-add-src").value.trim();
    const files = [...document.getElementById("mb-add-file").files];
    const file = files[0];
    if (!src && !file) { addMsg.textContent = "paste a picture address or choose a file first"; return; }
    // several addresses (one per line, or separated by spaces or commas) and/or several files: each one becomes its own box
    const addresses = src.split(/[\s,]+/).filter(Boolean);
    if (addresses.length > 1 || files.length > 1 || (addresses.length && files.length)) {
      await addManyPictures([...addresses, ...files], document.getElementById("mb-add-alt").value.trim());
      return;
    }
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
    raw = { type: "text", text };               // no width saved: text boxes size themselves (see itemCols)
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
    const yes = await askConfirm('delete "' + boardTitle(b) + '" for everyone, with everything in it? this can\'t be undone.', "delete");
    if (!yes) { document.getElementById("mb-delete").focus(); return; }
    try {
      await siteDb.removeBoard(name, (onlineItemMap[name] || []).map((row) => row.item && row.item.src));
    } catch (err) {
      askConfirm("couldn't delete that (" + err.message + ")", "ok");
    }
    return;
  }
  if (!boardMine[b]) return;
  const yes = await askConfirm('delete "' + boardTitle(b) + '" and everything in it? this can\'t be undone.', "delete");
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

// ----- you, signed in: "save order" makes the way you arranged the boxes the order for everyone -----
function updateSaveOrder() {
  const saveOrderBtn = document.getElementById("mb-save-order");
  if (!saveOrderBtn) return;
  const b = currentBoard;
  const on = ownerMode && boards[b] && !boardMine[b];
  saveOrderBtn.hidden = !on;
  if (!on) return;
  const dirty = unsavedOrder.has(boards[b].name);
  saveOrderBtn.disabled = !dirty;
  if (!savedFlash) saveOrderBtn.textContent = "save order";
}

if (document.getElementById("mb-save-order")) {
  const saveOrderBtn = document.getElementById("mb-save-order");
  saveOrderBtn.addEventListener("click", async () => {
    const b = currentBoard;
    if (!boards[b] || boardMine[b] || !boardReady[b]) return;
    const name = boards[b].name;
    saveOrderBtn.disabled = true;
    saveOrderBtn.textContent = "saving...";
    try {
      await shareLayout(b);
      unsavedOrder.delete(name);
      saveOrderBtn.textContent = "saved";
      savedFlash = setTimeout(() => { savedFlash = null; updateSaveOrder(); }, 1800);
    } catch (err) {
      saveOrderBtn.textContent = "save order";
      askConfirm("couldn't save the new order for everyone (" + err.message + ")", "ok");
    }
    updateSaveOrder();
  });
}

// ----- rename a moodboard: you (signed in) for everyone, anyone for a board they made themselves -----
(function () {
  const dialog = document.getElementById("mb-name-dialog");
  const form = document.getElementById("mb-name-form");
  const input = document.getElementById("mb-name-text");
  const msg = document.getElementById("mb-name-msg");
  const saveBtn = document.getElementById("mb-name-save");
  const openBtn = document.getElementById("mb-rename");
  if (!dialog || !form || !input || !openBtn) return;        // index.html out of date: the rest still works

  function open() {
    const b = currentBoard;
    if (!boards[b] || !(boardMine[b] || ownerMode)) return;
    document.getElementById("mb-name-for").textContent = boardMine[b]
      ? "only you will see the new name"
      : "everyone will see the new name";
    input.maxLength = boardMine[b] ? 24 : 40;
    input.value = boardTitle(b);
    msg.textContent = "";
    dialog.hidden = false;
    input.focus();
    input.select();
  }
  function close() {
    if (dialog.hidden) return;
    dialog.hidden = true;
    openBtn.focus();
  }
  openBtn.addEventListener("click", open);
  document.getElementById("mb-name-cancel").addEventListener("click", close);
  document.getElementById("mb-name-backdrop").addEventListener("click", close);
  dialog.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  window.addEventListener("hashchange", close);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const b = currentBoard;
    const board = boards[b];
    if (!board) return;
    const name = input.value.trim().slice(0, boardMine[b] ? 24 : 40);
    const clash = boards.some((x, i) => i !== b && boardTitle(i).toLowerCase() === name.toLowerCase());
    if (boardMine[b]) {
      if (!name) { msg.textContent = "give it a name"; return; }
      if (clash) { msg.textContent = "there's already a board with that name"; return; }
      board.name = name;                              // the board lives in this browser, so just change it here
      boardSig[b] = hashText("mine:" + name);
      saveMine();
      saveLayout(b);                                  // keep how it was arranged
      dialog.hidden = true;
      renderTabs();
      openBtn.focus();
      return;
    }
    if (!ownerMode || typeof siteDb === "undefined") return;
    if (name && clash) { msg.textContent = "there's already a board with that name"; return; }
    saveBtn.disabled = true;
    msg.textContent = "saving...";
    try {
      // an empty box (or its original name) puts the original name back
      await siteDb.saveTitle(board.name, !name || name === board.name ? null : name);
      dialog.hidden = true;
      openBtn.focus();
    } catch (err) {
      msg.textContent = "couldn't save that (" + err.message + ")";
    }
    saveBtn.disabled = false;
  });
})();

// ----- you, signed in: edit a moodboard's description, and move it along the tabs (for everyone) -----
(function () {
  const dialog = document.getElementById("mb-desc-dialog");
  const form = document.getElementById("mb-desc-form");
  const text = document.getElementById("mb-desc-text");
  const headingIn = document.getElementById("mb-heading-text");
  const msg = document.getElementById("mb-desc-msg");
  const saveBtn = document.getElementById("mb-desc-save");
  const editBtn = document.getElementById("mb-edit-desc");
  const leftBtn = document.getElementById("mb-move-left");
  const rightBtn = document.getElementById("mb-move-right");
  if (!dialog || !form || !editBtn || !leftBtn || !rightBtn) return;      // index.html out of date: the rest still works

  function open() {
    if (!ownerMode || boardMine[currentBoard] || !boards[currentBoard]) return;
    document.getElementById("mb-desc-for").textContent = boardTitle(currentBoard);
    text.value = boardDesc(currentBoard);
    if (headingIn) headingIn.value = String(metaOf(boards[currentBoard].name).heading || "").trim();
    msg.textContent = "";
    dialog.hidden = false;
    text.focus();
  }
  function close() {
    if (dialog.hidden) return;
    dialog.hidden = true;
    editBtn.focus();
  }
  editBtn.addEventListener("click", open);
  document.getElementById("mb-desc-cancel").addEventListener("click", close);
  document.getElementById("mb-desc-backdrop").addEventListener("click", close);
  dialog.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  window.addEventListener("hashchange", close);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = boards[currentBoard] && boards[currentBoard].name;
    if (!name || typeof siteDb === "undefined") return;
    saveBtn.disabled = true;
    msg.textContent = "saving...";
    try {
      const had = String(metaOf(name).heading || "").trim();
      const nowHeading = headingIn ? headingIn.value.trim().slice(0, 60) : had;
      // the heading is only sent when it changed, so descriptions still save before the "heading" column exists
      await siteDb.saveBoardText(name, text.value.trim().slice(0, 300), nowHeading === had ? undefined : nowHeading);
      dialog.hidden = true;
    } catch (err) {
      msg.textContent = "couldn't save that (" + err.message + ")";
    }
    saveBtn.disabled = false;
  });

  // move this board one place earlier or later among the shared boards (yours made in a browser stay at the end)
  async function move(step) {
    const list = boards.map((x, i) => i).filter((i) => !boardMine[i]);
    const at = list.indexOf(currentBoard), to = at + step;
    if (at < 0 || to < 0 || to >= list.length || typeof siteDb === "undefined") return;
    const names = list.map((i) => boards[i].name);
    [names[at], names[to]] = [names[to], names[at]];
    leftBtn.disabled = rightBtn.disabled = true;
    try {
      await siteDb.saveOrder(names);
    } catch (err) {
      askConfirm("couldn't save the new order (" + err.message + ")", "ok");
    }
    leftBtn.disabled = rightBtn.disabled = false;
  }
  leftBtn.addEventListener("click", () => move(-1));
  rightBtn.addEventListener("click", () => move(1));
})();

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
      img.addEventListener("load", () => { fitSlideImage(img); centerSlide(false); });   // its size is only known once it loads
      img.addEventListener("error", () => {
        img.replaceWith(imagePlaceholder(item.alt, true));
        slide.classList.add("mb-slide-ph");
        centerSlide(false);
      });
      slide.appendChild(img);
      if (item.alt) {                       // the caption goes under the picture, like on a community post
        const cap = document.createElement("p");
        cap.className = "mb-slide-cap";
        cap.textContent = item.alt;
        slide.appendChild(cap);
        slide.classList.add("has-cap");
      }
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

// sizes a picture so the frame is exactly the picture, as big as fits on the screen (small pictures are scaled up, big ones down)
function fitSlideImage(img) {
  if (!img.naturalWidth || !img.naturalHeight) return;
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const side = window.matchMedia("(max-width: 40rem)").matches ? 2.5 : 8;      // phones: nearly edge to edge
  const maxW = Math.max(120, window.innerWidth - side * rem);
  const capH = img.parentNode.classList.contains("has-cap") ? 4.5 * rem : 0;      // room for the caption under it
  const maxH = Math.max(120, Math.min(44 * rem, (lightStage.clientHeight || window.innerHeight) - 2.2 * rem) - capH);
  const k = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
  img.style.width = Math.round(img.naturalWidth * k) + "px";
  img.style.height = Math.round(img.naturalHeight * k) + "px";
}

function fitAllSlideImages() {
  lightTrack.querySelectorAll(".mb-slide-image img").forEach(fitSlideImage);
  centerSlide(false);
}
window.addEventListener("resize", () => { if (!light.hidden) fitAllSlideImages(); });

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
  fitAllSlideImages();
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

// re-cuts the lines on screen into 4 boxes each (the last line may have fewer), keeping the order
function rebalanceRows() {
  const items = [...mbGrid.querySelectorAll(".mb-item")];
  const rows = [...mbGrid.children].filter((r) => r.classList.contains("mb-row"));
  const need = Math.ceil(items.length / PER_ROW);
  while (rows.length < need) {
    const row = document.createElement("div");
    row.className = "mb-row";
    mbGrid.appendChild(row);
    rows.push(row);
  }
  rows.forEach((row, k) => row.append(...items.slice(k * PER_ROW, (k + 1) * PER_ROW)));
  rows.forEach((row) => { if (!row.children.length) row.remove(); });
}

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
    rebalanceRows();                                // keep 4 to a line while you drag
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
    if (ownerMode && !boardMine[currentBoard]) {
      clearSavedLayout(currentBoard);            // you're setting the order for everyone: it waits for the "save order" button
      unsavedOrder.add(boards[currentBoard].name);
      updateSaveOrder();
    } else {
      saveLayout(currentBoard);
    }
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

// ---------- Confession booth: the words fade in one by one, then the button ----------
const confessIntro = document.getElementById("confession-intro");
const confessNext = document.getElementById("confession-next");
const confessLine = document.getElementById("confession-line");
const confessGo = document.getElementById("confession-go");

if (confessIntro && confessNext && confessLine && confessGo) {
  // split the sentence into words, so each one can fade in on its own
  const sentence = confessLine.textContent.trim();
  const words = sentence.split(/\s+/);
  confessLine.setAttribute("aria-label", sentence);
  confessLine.textContent = "";
  words.forEach((word, i) => {
    const span = document.createElement("span");
    span.className = "confession-word";
    span.setAttribute("aria-hidden", "true");
    span.style.setProperty("--i", i);
    span.textContent = word;
    confessLine.appendChild(span);
    if (i < words.length - 1) confessLine.appendChild(document.createTextNode(" "));
  });
  // the button comes in after the last word
  confessGo.style.setProperty("--go-delay", 0.5 + words.length * 0.35 + 0.8 + "s");

  // someone who has already been through the first screen goes straight to the fair grounds next time
  const SEEN_KEY = "confession-seen";
  function hasSeen() {
    try { return localStorage.getItem(SEEN_KEY) === "1"; } catch (e) { return false; }
  }
  function markSeen() {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch (e) {}
  }

  // sets the page up for the next visit: the intro for a first time, the fair grounds (no animation) after that
  function resetConfession() {
    confessIntro.classList.remove("leaving");
    const seen = hasSeen();
    confessIntro.hidden = seen;
    confessNext.hidden = !seen;
    confessNext.classList.toggle("instant", seen);
  }

  // the button: fade the first screen out, then show the fair grounds
  confessGo.addEventListener("click", () => {
    markSeen();
    confessIntro.classList.add("leaving");
    setTimeout(() => {
      confessIntro.hidden = true;
      confessNext.classList.remove("instant");     // this first time it fades in
      confessNext.hidden = false;
    }, reduceMotion.matches ? 0 : 600);
  });

  // leaving the page sets it up for the next visit
  window.addEventListener("hashchange", () => {
    if (location.hash !== "#confession") resetConfession();
  });
  resetConfession();
}

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

// ----- "check out all posts": a menu of every entry -----
(function () {
  const ov = document.getElementById("posts-pop"), openBtn = document.getElementById("btn-allposts");
  const closeBtn = document.getElementById("posts-close"), list = document.getElementById("posts-list"), note = document.getElementById("posts-note");
  if (!ov || !openBtn || !closeBtn || !list) return;
  function fill() {
    list.innerHTML = "";
    note.textContent = entries.length ? entries.length + (entries.length === 1 ? " post so far" : " posts so far") : "no posts yet";
    entries.forEach((en, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "posts-row";
      const d = document.createElement("span"); d.className = "posts-date"; d.textContent = en.date || "";
      const t = document.createElement("span"); t.className = "posts-title"; t.textContent = en.title || "untitled";
      b.append(d, t);
      b.addEventListener("click", () => { ov.hidden = true; openFeatured(i); });
      list.appendChild(b);
    });
  }
  function open() { fill(); ov.hidden = false; list.scrollTop = 0; closeBtn.focus(); }
  function close() { if (ov.hidden) return; ov.hidden = true; openBtn.focus(); }
  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
})();
