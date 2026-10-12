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

  // Return button only shows when a page other than home is selected
  returnBtn.hidden = !found || name === DEFAULT_PAGE;
}

// ---------- Top left buttons ----------
const refreshBtn = document.getElementById("btn-refresh");
const returnBtn = document.getElementById("btn-return");
let hasNavigated = false;   // true once the visitor has moved between pages here

refreshBtn.addEventListener("click", () => location.reload());

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
