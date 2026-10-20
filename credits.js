// ---------- Credits pop-up ----------
// The "credits" link in the bottom bar (next to the date) opens a list of every icon on the site, who made it and where it's used.
// The list itself is in index.html (the element with id "credits"): to add one, copy a <li> and change the words.
(function () {
  const ov = document.getElementById("credits");
  const openBtn = document.getElementById("credits-open");
  const closeBtn = document.getElementById("credits-close");
  if (!ov || !openBtn || !closeBtn) return;

  function open() {
    ov.hidden = false;
    closeBtn.focus();
  }
  function close() {
    if (ov.hidden) return;
    ov.hidden = true;
    openBtn.focus();
  }
  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
})();
