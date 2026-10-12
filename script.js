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
}

window.addEventListener("hashchange", showPage);
showPage();
