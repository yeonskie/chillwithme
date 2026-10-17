// TEST MODE: a little panel for trying out the prize shop with fake yeonbucks.
//
// It only shows up when you're previewing the site on your own computer (Live Server, 127.0.0.1 or
// localhost) or opening the file directly. On the real GitHub Pages site it does nothing, so visitors
// never see it. To remove it for good, delete this file and its <script> line in index.html.
// (It only touches this browser's saved data, nothing is shared with anyone.)

(function () {
  const h = location.hostname;
  const local = location.protocol === "file:" || h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "";
  if (!local) return;

  const KEYS = ["yb-own", "yb-eq", "yb-petnames", "yb-petname", "yb-room-seen", "yb-daily", "yb-wheel", "yb-boost-until", "yb-pet-pending", "yb-rare-shift"];   // the shop's saved stuff
  const bal = () => { const v = parseInt(localStorage.getItem("yeonbucks"), 10); return Number.isFinite(v) ? v : 0; };
  const redraw = () => { if (window.YB) window.YB.redraw(); };
  const setBal = (n) => { try { localStorage.setItem("yeonbucks", String(Math.max(0, Math.floor(n)))); } catch (e) {} redraw(); };

  const css = document.createElement("style");
  css.textContent =
    "#tm{position:fixed;top:calc(var(--bar-height) + .5rem);left:.6rem;z-index:9999;font:inherit;font-size:.72rem;color:var(--text);text-align:left}" +
    "#tm *{box-sizing:border-box;font:inherit}" +
    "#tm-tab{padding:.25rem .6rem;background:#F8DE7E;color:#1a1a1a;border:1px solid #1a1a1a;border-radius:var(--radius);cursor:pointer}" +
    "#tm-panel{margin-top:.35rem;width:13.5rem;padding:.7rem;background:var(--bg);border:1.5px solid var(--line);border-radius:var(--radius)}" +
    "#tm-panel[hidden]{display:none}" +
    "#tm-panel h3{margin:0 0 .45rem;font-size:.68rem;font-weight:400;text-transform:uppercase;letter-spacing:.06em;opacity:.7}" +
    "#tm-panel h3:not(:first-child){margin-top:.75rem}" +
    ".tm-row{display:flex;flex-wrap:wrap;gap:.3rem}" +
    "#tm-panel button{padding:.2rem .5rem;color:inherit;background:none;border:1px solid var(--line);border-radius:var(--radius);cursor:pointer}" +
    "#tm-panel button:hover,#tm-panel button:focus-visible{background:var(--text);color:var(--bg);outline:none}" +
    "#tm-panel input{width:100%;min-width:0;padding:.25rem .45rem;color:inherit;background:var(--bg);border:1px solid var(--line);border-radius:var(--radius)}" +
    "#tm-bal{margin:0 0 .5rem}" +
    "@media (max-width:40rem){#tm{top:auto;bottom:calc(var(--bar-height) + 3rem)}}";
  document.head.appendChild(css);

  const wrap = document.createElement("div");
  wrap.id = "tm";
  wrap.innerHTML =
    '<button type="button" id="tm-tab" aria-expanded="false">test mode</button>' +
    '<div id="tm-panel" hidden>' +
      '<p id="tm-bal"></p>' +
      "<h3>add yeonbucks</h3>" +
      '<div class="tm-row" data-add>' +
        '<button type="button" data-n="1000">+1,000</button>' +
        '<button type="button" data-n="10000">+10,000</button>' +
        '<button type="button" data-n="100000">+100,000</button>' +
      "</div>" +
      "<h3>set an exact amount</h3>" +
      '<div class="tm-row"><input id="tm-amt" type="number" min="0" step="1" placeholder="e.g. 30000"><button type="button" id="tm-set">set</button></div>' +
      "<h3>give me (free)</h3>" +
      '<div class="tm-row" data-give>' +
        '<button type="button" data-id="key">secret room key</button>' +
        '<button type="button" data-id="pet-koala">koala</button>' +
        '<button type="button" data-id="pet-frog">frog</button>' +
        '<button type="button" data-id="pet-panda">panda</button>' +
        '<button type="button" data-id="pet-fish">fish</button>' +
        '<button type="button" data-id="pet-chicken">chicken</button>' +
        '<button type="button" data-id="pet-elephant">elephant</button>' +
        '<button type="button" data-id="pet-goat">goat</button>' +
        '<button type="button" data-id="pet-hamster">hamster</button>' +
        '<button type="button" data-id="pet-hedgehog">hedgehog</button>' +
        '<button type="button" data-id="pet-mouse">mouse</button>' +
        '<button type="button" data-id="pet-turtle">turtle</button>' +
        '<button type="button" data-id="tap-rainbow">rainbow tap</button>' +
      "</div>" +
      "<h3>start a new day</h3>" +
      '<div class="tm-row"><button type="button" id="tm-day">new day (daily prize + wheel)</button></div>' +
      "<h3>rare items shop</h3>" +
      '<div class="tm-row"><button type="button" id="tm-stock">show the next stock</button></div>' +
      "<h3>try things</h3>" +
      '<div class="tm-row">' +
        '<button type="button" id="tm-earn">earn in 2s</button>' +
        '<button type="button" id="tm-reset">reset shop</button>' +
      "</div>" +
    "</div>";
  document.body.appendChild(wrap);

  const tab = wrap.querySelector("#tm-tab");
  const panel = wrap.querySelector("#tm-panel");
  const balEl = wrap.querySelector("#tm-bal");
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const show = () => { balEl.textContent = "you have " + fmt(bal()) + " yeonbucks"; };
  show();
  setInterval(show, 500);

  tab.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    tab.setAttribute("aria-expanded", String(!panel.hidden));
    show();
  });
  wrap.querySelector("[data-add]").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) { setBal(bal() + Number(b.dataset.n)); show(); }
  });
  wrap.querySelector("#tm-set").addEventListener("click", () => {
    const n = Number(wrap.querySelector("#tm-amt").value);
    if (Number.isFinite(n) && n >= 0) { setBal(n); show(); }
  });
  wrap.querySelector("[data-give]").addEventListener("click", (e) => {   // hand over a shop or wheel item (pets come out right away if none is out)
    const b = e.target.closest("button");
    if (!b || !window.YBShop) return;
    const ok = window.YBShop.give(b.dataset.id, true);
    b.textContent = ok ? "got it!" : "already have";
    setTimeout(() => location.reload(), 600);
  });
  wrap.querySelector("#tm-day").addEventListener("click", () => {        // forget today's daily prize and wheel spins
    try { localStorage.removeItem("yb-daily"); localStorage.removeItem("yb-wheel"); } catch (e) {}
    wrap.querySelector("#tm-day").textContent = "done!";
  });
  wrap.querySelector("#tm-stock").addEventListener("click", () => {      // the rare shop changes every other day: jump ahead to the next stock
    try { localStorage.setItem("yb-rare-shift", String((parseInt(localStorage.getItem("yb-rare-shift"), 10) || 0) + 1)); } catch (e) {}
    location.reload();
  });
  wrap.querySelector("#tm-earn").addEventListener("click", () => {      // jump the 30-second clock to 2 seconds before an earn
    try { localStorage.setItem("yb-prog", "28"); } catch (e) {}
    redraw();
  });
  wrap.querySelector("#tm-reset").addEventListener("click", () => {     // forget everything bought, and put you back at 500
    if (!confirm("reset the shop? this forgets everything you bought (and your pet names) and sets yeonbucks back to 500.")) return;
    try { KEYS.forEach((k) => localStorage.removeItem(k)); localStorage.setItem("yeonbucks", "500"); } catch (e) {}
    location.reload();
  });
})();