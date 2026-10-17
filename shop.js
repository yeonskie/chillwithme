// THE PRIZE SHOP
//
// To ADD or CHANGE something in the shop, edit the list ITEMS below. Each one has:
//   id     - a short name nothing else uses (it's what gets saved in the visitor's browser)
//   group  - (not shown for now, handy if you ever want headings back)
//   name   - what the box says
//   desc   - the little line under the name
//   price  - cost in yeonbucks
//   (the shop shows 9 at a time with an arrow to the next page, so just keep adding to the list. Keep the secret room key last.)
//   kind   - "perk"   : you just own it (the earn boosts are switched on in casino.js; "tag" is the little label in the box)
//            "cursor" : a trail that follows the mouse. "value" is "sparkle" or "heart"
//            "bg"     : a page background. "value" is "dots", "grid" or "stars"
//            "pet"    : a little pet in the bottom right corner. "value" is "dog" or "cat" (what they say is at the bottom of this file)
//            "soon"   : shows in the shop but can't be bought yet
//
// What a visitor owns is saved in this browser ("yb-own"), and so is what they have switched on ("yb-eq").
// The cursor trails are drawn at the bottom of this file, the backgrounds are in style.css (search "html[data-bg").

(function () {
  const ITEMS = [
    { id: "boost",      group: "boosts",       name: "earn boost",      desc: "+75 every 30 seconds instead of +50", price: 10000, kind: "perk", tag: "+75" },
    { id: "boost2",     group: "boosts",       name: "super earn boost", desc: "+100 every 30 seconds instead of +50", price: 35000, kind: "perk", tag: "+100" },
    { id: "cur-sparkle", group: "cursor trails", name: "sparkle trail",  desc: "stars follow your cursor",            price: 2000,  kind: "cursor", value: "sparkle" },
    { id: "cur-heart",   group: "cursor trails", name: "heart trail",    desc: "hearts follow your cursor",           price: 1500,  kind: "cursor", value: "heart" },
    { id: "bg-dots",     group: "backgrounds",   name: "faint dots",     desc: "a soft dotted page",                  price: 500,   kind: "bg", value: "dots" },
    { id: "bg-grid",     group: "backgrounds",   name: "grid paper",     desc: "notebook grid lines",                 price: 500,   kind: "bg", value: "grid" },
    { id: "bg-stars",    group: "backgrounds",   name: "star background", desc: "tiny stars scattered around",        price: 750,   kind: "bg", value: "stars" },
    { id: "pet-dog",     group: "pets",          name: "dog",            desc: "a little buddy for the corner of your screen", price: 30000, kind: "pet", value: "dog" },
    { id: "pet-cat",     group: "pets",          name: "cat",            desc: "a little buddy for the corner of your screen", price: 30000, kind: "pet", value: "cat" },
    { id: "key",         group: "secret",        name: "secret room key", desc: "opens something... (coming soon)",    price: 50000, kind: "soon" },
  ];

  // ----- what's owned / switched on (saved in this browser) -----
  function load(k, fallback) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  let own = load("yb-own", []);
  let eq = load("yb-eq", { cursor: "", bg: "", pet: "" });
  const EQKEY = { cursor: "cursor", bg: "bg", pet: "pet" };   // which slot each kind of item goes in
  let petNames = load("yb-petnames", {});                       // each pet has its own name
  if (!petNames.dog && load("yb-petname", "")) petNames.dog = load("yb-petname", "");   // (an older single name, if there was one)
  const nameOf = (kind) => petNames[kind] || (kind === "cat" ? "kitty" : "buddy");
  const owns = (id) => own.indexOf(id) !== -1;
  const find = (id) => ITEMS.filter((i) => i.id === id)[0];
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // ----- the backgrounds -----
  function applyLook() {
    const root = document.documentElement;
    if (eq.bg) root.dataset.bg = eq.bg; else delete root.dataset.bg;
    const pet = document.getElementById("pet");
    if (pet) { pet.hidden = eq.pet !== "dog" && eq.pet !== "cat"; pet.dataset.kind = eq.pet || ""; }
  }

  // ----- the shop page -----
  const box = document.getElementById("shop-items");
  const msg = document.getElementById("shop-msg");
  let msgTimer = null;
  function say(t) {
    if (!msg) return;
    msg.textContent = t;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { msg.textContent = ""; }, 3500);
  }
  const have = () => (window.YB ? window.YB.have() : 0);

  function isOn(item) { return EQKEY[item.kind] ? (eq[EQKEY[item.kind]] || "") === item.value : false; }

  function label(item) {
    if (item.kind === "soon") return { text: "coming soon", disabled: true };
    if (!owns(item.id)) return { text: "buy", disabled: have() < item.price };
    if (item.kind === "perk") return { text: "owned", disabled: true };
    return { text: isOn(item) ? "turn off" : "turn on", disabled: false };
  }

  function preview(item) {
    if (item.kind === "bg") return '<span class="shop-prev" data-p="' + item.value + '"></span>';
    if (item.kind === "cursor") return '<span class="shop-prev shop-prev-glyph" data-g="' + item.value + '">' + (item.value === "heart" ? "♥ ♥ ♥" : "✦ ✧ ✦") + "</span>";
    if (item.kind === "pet") { const a = document.querySelector('#pet .pet-art[data-pet="' + item.value + '"] .pet-a'); return '<span class="shop-prev shop-prev-pet">' + (a ? a.outerHTML : "") + "</span>"; }
    if (item.kind === "soon") return '<span class="shop-prev shop-prev-glyph">?</span>';
    return '<span class="shop-prev shop-prev-glyph">' + (item.tag || "") + "</span>";
  }

  // the shop shows 9 at a time (3 x 3), or 6 on a phone, with arrows to the other pages
  const phone = window.matchMedia ? window.matchMedia("(max-width: 40rem)") : { matches: false };
  const perPage = () => (phone.matches ? 6 : 9);
  let page = 0;
  function build() {
    if (!box) return;
    const pages = Math.max(1, Math.ceil(ITEMS.length / perPage()));
    page = Math.min(Math.max(page, 0), pages - 1);
    box.innerHTML = "";
    const grid = document.createElement("div");   // everything in one set of rows
    grid.className = "shop-grid";
    box.appendChild(grid);
    ITEMS.slice(page * perPage(), page * perPage() + perPage()).forEach((item) => {
      const card = document.createElement("div");
      card.className = "shop-item";
      card.dataset.id = item.id;
      card.innerHTML = preview(item) +
        '<span class="shop-name"></span><span class="shop-desc"></span><span class="shop-price"></span>' +
        '<button type="button" class="hy-btn shop-buy"></button>';
      card.querySelector(".shop-name").textContent = item.name;
      card.querySelector(".shop-desc").textContent = item.desc;
      card.querySelector(".shop-price").textContent = fmt(item.price) + " yeonbucks";
      card.querySelector(".shop-buy").addEventListener("click", () => act(item));
      grid.appendChild(card);
    });
    if (pages > 1) {                                // the arrows
      const nav = document.createElement("div");
      nav.className = "shop-pager";
      const prev = document.createElement("button");
      prev.type = "button"; prev.className = "hy-btn shop-arrow"; prev.textContent = "\u2190"; prev.setAttribute("aria-label", "previous page");
      prev.disabled = page === 0;
      prev.addEventListener("click", () => { page--; build(); });
      const next = document.createElement("button");
      next.type = "button"; next.className = "hy-btn shop-arrow"; next.textContent = "\u2192"; next.setAttribute("aria-label", "next page");
      next.disabled = page === pages - 1;
      next.addEventListener("click", () => { page++; build(); });
      const label = document.createElement("span");
      label.className = "shop-page";
      label.textContent = (page + 1) + " / " + pages;
      nav.appendChild(prev); nav.appendChild(label); nav.appendChild(next);
      box.appendChild(nav);
    }
    update();
  }
  if (phone.addEventListener) phone.addEventListener("change", build);

  function update() {
    if (!box) return;
    box.querySelectorAll(".shop-item").forEach((card) => {
      const item = find(card.dataset.id);
      const l = label(item);
      const b = card.querySelector(".shop-buy");
      b.textContent = l.text;
      b.disabled = l.disabled;
      card.classList.toggle("is-owned", owns(item.id));
      card.classList.toggle("is-on", isOn(item));
      card.classList.toggle("is-short", !owns(item.id) && item.kind !== "soon" && have() < item.price);
    });
  }

  function act(item) {
    if (item.kind === "soon") return;
    if (!owns(item.id)) {
      if (!window.YB || !window.YB.spend(item.price)) { say("not enough yeonbucks yet!"); update(); return; }
      own.push(item.id);
      save("yb-own", own);
      if (EQKEY[item.kind]) eq[EQKEY[item.kind]] = item.value;     // switch it on right away
      save("yb-eq", eq);
      say(item.kind === "pet" ? "you got the " + item.name + "! give it a name in your inventory." : "you got the " + item.name + "!");
    } else if (EQKEY[item.kind]) {
      eq[EQKEY[item.kind]] = isOn(item) ? "" : item.value;
      save("yb-eq", eq);
    }
    applyLook();
    if (window.YB) window.YB.redraw();
    update();
  }

  // another tab changed something: catch up
  window.addEventListener("storage", (e) => {
    if (e.key === "yb-own" || e.key === "yb-eq" || e.key === null) {
      own = load("yb-own", []);
      eq = load("yb-eq", { cursor: "", bg: "", pet: "" });
      petNames = load("yb-petnames", {});
      applyLook();
      update();
    }
  });
  setInterval(update, 1000);   // so "buy" lights up as soon as you can afford it

  // ----- the inventory pop-up (from the shop page or the bottom-left box): choose what's switched on -----
  const invEl = document.getElementById("inv"), invBody = document.getElementById("inv-body");
  let invFrom = null;
  function pick(kind, value) {
    eq[EQKEY[kind]] = value;
    save("yb-eq", eq);
    applyLook();
    update();
    drawInv();
  }
  function group(title, kind, none) {
    const owned = ITEMS.filter((i) => i.kind === kind && owns(i.id));
    const wrap = document.createElement("div");
    wrap.className = "inv-group";
    const h = document.createElement("h3");
    h.textContent = title;
    wrap.appendChild(h);
    if (!owned.length) {
      const p = document.createElement("p");
      p.className = "inv-empty";
      p.textContent = "nothing yet. find some in the prize shop!";
      wrap.appendChild(p);
      return wrap;
    }
    const row = document.createElement("div");
    row.className = "inv-opts";
    [{ name: none, value: "" }].concat(owned.map((i) => ({ name: i.name, value: i.value }))).forEach((o) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "inv-opt";
      const on = (eq[EQKEY[kind]] || "") === o.value;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.textContent = o.name;
      b.addEventListener("click", () => pick(kind, o.value));
      row.appendChild(b);
    });
    wrap.appendChild(row);
    return wrap;
  }
  function drawInv() {
    if (!invBody) return;
    invBody.innerHTML = "";
    invBody.appendChild(group("cursor trail", "cursor", "no trail"));
    invBody.appendChild(group("background", "bg", "plain"));
    const pets = group("pet", "pet", "no pet");
    const kind = eq.pet;                                     // the name box is for the pet that's out
    if ((kind === "dog" || kind === "cat") && owns("pet-" + kind)) {
      const lab = document.createElement("label");
      lab.className = "inv-name";
      lab.textContent = "name ";
      const inp = document.createElement("input");
      inp.type = "text"; inp.maxLength = 16; inp.placeholder = nameOf(kind); inp.autocomplete = "off";
      inp.value = petNames[kind] || "";
      inp.addEventListener("input", () => { petNames[kind] = inp.value.trim().slice(0, 16); save("yb-petnames", petNames); });
      lab.appendChild(inp);
      pets.appendChild(lab);
    }
    invBody.appendChild(pets);
    const perks = ITEMS.filter((i) => i.kind === "perk" && owns(i.id));
    const wrap = document.createElement("div");
    wrap.className = "inv-group";
    const h = document.createElement("h3");
    h.textContent = "boosts (always on)";
    wrap.appendChild(h);
    const p = document.createElement("p");
    p.className = perks.length ? "inv-perks" : "inv-empty";
    p.textContent = perks.length ? perks.map((i) => i.name).join(", ") : "nothing yet.";
    wrap.appendChild(p);
    invBody.appendChild(wrap);
    const go = document.createElement("a");
    go.href = "#shop";
    go.className = "inv-shoplink";
    go.textContent = "go to the prize shop";
    go.addEventListener("click", () => closeInv(false));
    invBody.appendChild(go);
  }
  function openInv(from) {
    if (!invEl) return;
    invFrom = from || null;
    drawInv();
    invEl.hidden = false;
    const c = document.getElementById("inv-close");
    if (c) c.focus();
  }
  function closeInv(restore) {
    if (!invEl || invEl.hidden) return;
    invEl.hidden = true;
    if (restore !== false && invFrom && document.contains(invFrom)) invFrom.focus();
    invFrom = null;
  }
  document.querySelectorAll("[data-inv-open]").forEach((b) => b.addEventListener("click", () => openInv(b)));
  if (invEl) {
    document.getElementById("inv-close").addEventListener("click", () => closeInv());
    invEl.addEventListener("click", (e) => { if (e.target === invEl) closeInv(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeInv(); });
    window.addEventListener("hashchange", () => closeInv(false));
  }
  window.addEventListener("storage", () => { if (invEl && !invEl.hidden) drawInv(); });

  applyLook();
  build();

  // ----- the cursor trails (sparkles or hearts that follow the mouse) -----
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let lastX = -999, lastY = -999, alive = 0;
  const GLYPHS = { sparkle: ["✦", "✧", "✶"], heart: ["♥"] };
  window.addEventListener("pointermove", (e) => {
    if (reduce || !eq.cursor || e.pointerType === "touch") return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (dx * dx + dy * dy < 18 * 18 || alive > 40) return;   // only every so often, never a flood
    lastX = e.clientX; lastY = e.clientY;
    const set = GLYPHS[eq.cursor] || GLYPHS.sparkle;
    const bit = document.createElement("span");
    bit.className = "trail-bit trail-" + eq.cursor;
    bit.textContent = set[Math.floor(Math.random() * set.length)];
    bit.style.left = e.clientX + "px";
    bit.style.top = e.clientY + "px";
    bit.style.setProperty("--dx", (Math.random() * 30 - 15).toFixed(0) + "px");
    bit.style.setProperty("--s", (0.7 + Math.random() * 0.7).toFixed(2));
    document.body.appendChild(bit);
    alive++;
    bit.addEventListener("animationend", () => { bit.remove(); alive--; });
  }, { passive: true });

  // ----- the pet: sits in the bottom right corner, waves and talks when you point at it -----
  const petEl = document.getElementById("pet"), petBtn = document.getElementById("pet-btn"), petBubble = document.getElementById("pet-bubble");
  let petTimer = null, lastSaid = -1;
  const PET_LINES = {                                   // <- what each pet says (one at random); {name} becomes its name
    dog: ["buwark!", "woof!", "hello i'm {name}!"],
    cat: ["mrow", "hiss!", "hello i'm {name}!"],
  };
  function petSay() {
    const kind = eq.pet;
    const lines = (PET_LINES[kind] || PET_LINES.dog).map((l) => l.replace("{name}", nameOf(kind)));
    let i = Math.floor(Math.random() * lines.length);
    if (i === lastSaid) i = (i + 1) % lines.length;                    // never the same one twice in a row
    lastSaid = i;
    petBubble.textContent = lines[i];
    petEl.classList.add("is-up");
    clearTimeout(petTimer);
    petTimer = setTimeout(petHush, 2600);
  }
  function petHush() { petEl.classList.remove("is-up"); }
  if (petEl && petBtn) {
    petBtn.addEventListener("pointerenter", petSay);
    petBtn.addEventListener("click", () => { if (!petEl.classList.contains("is-up")) petSay(); });   // phones: tap (a mouse click doesn't change the line)
    petBtn.addEventListener("focus", () => { if (petBtn.matches(":focus-visible")) petSay(); });     // keyboard only
    petBtn.addEventListener("blur", () => { clearTimeout(petTimer); petHush(); });
    petBtn.addEventListener("pointerleave", (e) => {
      clearTimeout(petTimer);
      if (e.pointerType === "mouse" || e.pointerType === "pen") petHush();   // the line goes away as soon as you stop pointing at it
      else petTimer = setTimeout(petHush, 2600);                              // (a finger lifts right away, so give it a moment)
    });
  }
})();