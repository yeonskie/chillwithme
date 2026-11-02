// ---------- the home page always fits on screen (no scrolling) ----------
// On short phones and in-app browsers (discord, instagram...) there isn't room for everything at full size, so this measures what's
// left and shrinks the whole home page a little (never below 55%) so the buttons still end above the yeonbucks box.
(function () {
  const page = document.querySelector('.page[data-page="home"]');
  const home = page && page.querySelector(".home");
  if (!home) return;
  const phone = window.matchMedia("(max-width: 40rem) and (pointer: coarse)");
  let raf = 0;
  function fit() {
    raf = 0;
    home.style.zoom = "";
    if (!phone.matches || !page.classList.contains("active")) return;
    const cs = getComputedStyle(page);
    const avail = page.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const need = home.offsetHeight;
    if (avail > 0 && need > avail) home.style.zoom = String(Math.max(0.55, Math.floor((avail / need) * 100) / 100));
  }
  function soon() { if (!raf) raf = requestAnimationFrame(fit); }
  window.addEventListener("resize", soon);
  window.addEventListener("orientationchange", soon);
  window.addEventListener("hashchange", soon);
  window.addEventListener("load", soon);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", soon);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(soon);
  new MutationObserver(soon).observe(document.body, { attributes: true, attributeFilter: ["class"] });   // (the yeonbucks box / mini player appearing changes the room)
  new MutationObserver(soon).observe(page, { attributes: true, attributeFilter: ["class"] });
  soon();
})();
