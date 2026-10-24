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

// ---------- The arcade cabinet: after a few quiet seconds one game gives a little nudge ----------
(function () {
  const page = document.querySelector('.page[data-page="arcade"]');
  const btns = page ? Array.from(page.querySelectorAll(".ac-btn")) : [];
  if (!btns.length) return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let timer = null, last = -1;
  function nudge() {
    if (page.classList.contains("active") && !document.hidden) {
      let i;
      do { i = Math.floor(Math.random() * btns.length); } while (i === last && btns.length > 1);
      last = i;
      const b = btns[i];
      b.classList.remove("ac-nudge");
      void b.offsetWidth;                       // restart the animation
      b.classList.add("ac-nudge");
      b.addEventListener("animationend", () => b.classList.remove("ac-nudge"), { once: true });
    }
    timer = setTimeout(nudge, 6000);            // still quiet: another one in a bit
  }
  function wake() { clearTimeout(timer); timer = setTimeout(nudge, 5000); }

  ["pointerdown", "pointermove", "keydown", "touchstart", "scroll"].forEach((ev) =>
    window.addEventListener(ev, wake, { passive: true, capture: true }));
  window.addEventListener("hashchange", wake);
  wake();
})();
