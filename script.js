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

// ---------- Menu (bottom center) ----------
const menuBtn = document.getElementById("btn-menu");
const menuList = document.getElementById("menu-list");

function setMenu(open) {
  menuList.classList.toggle("open", open);
  menuBtn.setAttribute("aria-expanded", String(open));
}

// click "get into it" to open or close the menu
menuBtn.addEventListener("click", () => {
  setMenu(!menuList.classList.contains("open"));
});

// picking a page closes the menu
menuList.addEventListener("click", (e) => {
  if (e.target.closest("a")) setMenu(false);
});

// clicking anywhere else, or pressing Escape, also closes it
document.addEventListener("click", (e) => {
  if (!e.target.closest(".cell-menu")) setMenu(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenu(false);
});

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

// remember their choice (so refresh doesn't reset it); dark is the default
let saved = "dark";
try { saved = localStorage.getItem("theme") || "dark"; } catch (e) {}
setTheme(saved);