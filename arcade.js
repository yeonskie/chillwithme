// ---------- The arcade: the games going round in a circle ----------
// Each game is an <li> in index.html. This works out where each one sits on the circle,
// so adding or removing a game just works. (On phones the CSS turns the circle into a plain list.)

(function () {
  const ring = document.getElementById("arcade-ring");
  const status = document.getElementById("arcade-status");
  if (!ring) return;

  const items = Array.from(ring.querySelectorAll(".arcade-item"));
  ring.style.setProperty("--n", items.length);
  items.forEach((item, i) => item.style.setProperty("--i", i));

  // the games aren't built yet: say so instead of doing nothing
  let timer = null;
  ring.addEventListener("click", (e) => {
    const card = e.target.closest(".arcade-card");
    if (!card) return;
    if (card.dataset.href) { location.hash = card.dataset.href; return; }   // a finished game opens its page
    if (!status) return;
    const name = card.querySelector(".arcade-name");
    status.textContent = (name ? name.textContent : "this game") + " isn't open yet. check back soon.";
    clearTimeout(timer);
    timer = setTimeout(() => { status.textContent = ""; }, 5000);
  });
})();