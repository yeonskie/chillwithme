// THE PRIZE SHOP
//
// To ADD or CHANGE something in the shop, edit the list ITEMS below. Each one has:
//   id     - a short name nothing else uses (it's what gets saved in the visitor's browser)
//   group  - (not shown for now, handy if you ever want headings back)
//   name   - what the box says
//   desc   - the little line under the name
//   price  - cost in yeonbucks
//   wheel  - (optional) true = not sold in the shop, it's a prize from the secret room wheel
//   rare   - (optional) true = sold in the RARE ITEMS SHOP in the secret room instead (see "THE RARE ITEMS SHOP" lower down)
//   (the shop shows the items in this order, 9 at a time with an arrow to the next page, so just keep adding to the list. Keep the secret room key last.)
//   kind   - "perk"   : you just own it (the earn boosts, lucky charm and prize bonus are switched on in casino.js, the secret room key in secretroom.js; "tag" is the little label in the box)
//            "cursor" : a trail that follows the mouse. "value" is "sparkle" or "heart"
//            "tap"    : little stars or hearts pop where you tap or click. "value" is "sparkle" or "heart"
//            "bg"     : a page background. "value" is "dots", "grid" or "stars"
//            "accent" : tints the whole site a color. "value" is "pink", "blue", "green" or "lavender" (the colors are in style.css, search "data-accent")
//            "pet"    : a little pet in the bottom right corner. "value" is the animal's name, e.g. "dog" or "koala" (what they say is at the bottom of this file)
//            "soon"   : shows in the shop but can't be bought yet
//   short  - (optional) a shorter name for the small inventory buttons
//   desktop - (optional) true = the card says "(desktop only)", for things that need a mouse
//
// What a visitor owns is saved in this browser ("yb-own"), and so is what they have switched on ("yb-eq").
// The cursor trails are drawn at the bottom of this file, the backgrounds are in style.css (search "html[data-bg").

(function () {
  const RARE_PRICE = 45000;                                      // what every pet in the rare items shop costs
  const ITEMS = [
    { id: "bg-dots",     group: "backgrounds",   name: "faint dots",     desc: "a soft dotted page",                  price: 500,   kind: "bg", value: "dots" },
    { id: "bg-grid",     group: "backgrounds",   name: "grid paper",     desc: "notebook grid lines",                 price: 500,   kind: "bg", value: "grid" },
    { id: "bg-stars",    group: "backgrounds",   name: "star background", desc: "tiny stars scattered around",        price: 750,   kind: "bg", value: "stars" },
    { id: "cur-sparkle", group: "cursor trails", name: "sparkle trail",  desc: "stars follow your cursor",            price: 2000,  kind: "cursor", value: "sparkle", desktop: true },
    { id: "cur-heart",   group: "cursor trails", name: "heart trail",    desc: "hearts follow your cursor",           price: 1500,  kind: "cursor", value: "heart", desktop: true },
    { id: "tap-sparkle", group: "tap",           name: "tap sparkles",   desc: "stars pop where you tap or click",    price: 2500,  kind: "tap", value: "sparkle" },
    { id: "tap-heart",   group: "tap",           name: "tap hearts",     desc: "hearts pop where you tap or click",   price: 2500,  kind: "tap", value: "heart" },
    { id: "acc-pink",     group: "accents",      name: "light pink",     desc: "a soft pink tint over the site",      price: 2500,  kind: "accent", value: "pink" },
    { id: "acc-blue",     group: "accents",      name: "blue",           desc: "a cool blue tint over the site",      price: 2500,  kind: "accent", value: "blue" },
    { id: "acc-green",    group: "accents",      name: "neon green",     desc: "a fresh green tint over the site",    price: 2500,  kind: "accent", value: "green" },
    { id: "acc-lavender", group: "accents",      name: "lavender",       desc: "a dreamy purple tint over the site",  price: 2500,  kind: "accent", value: "lavender" },
    { id: "boost",      group: "boosts",       name: "earn boost",      desc: "+75 every 30 seconds instead of +50", price: 10000, kind: "perk", tag: "+75" },
    { id: "boost2",     group: "boosts",       name: "super earn boost", desc: "+100 every 30 seconds instead of +50", price: 35000, kind: "perk", tag: "+100" },
    { id: "charm",      group: "boosts",       name: "lucky charm",     desc: "+5% chance of the casino jackpot",    price: 20000, kind: "perk", tag: "+5%" },
    { id: "bonus",      group: "boosts",       name: "prize bonus",     desc: "+10% on every game prize",            price: 25000, kind: "perk", tag: "+10%" },
    { id: "pet-dog",     group: "pets",          name: "dog",            desc: "a little buddy for the corner of your screen", price: 30000, kind: "pet", value: "dog" },
    { id: "pet-cat",     group: "pets",          name: "cat",            desc: "a little buddy for the corner of your screen", price: 30000, kind: "pet", value: "cat" },
    { id: "pet-bunny",   group: "pets",          name: "bunny",          desc: "a little buddy for the corner of your screen", price: 30000, kind: "pet", value: "bunny" },
    { id: "key",         group: "secret",        name: "secret room key", desc: "opens the secret room at the back of the fair", price: 50000, kind: "perk", tag: "?" },
    // rare: true = sold in the rare items shop (secret room), not the prize shop. koala, frog and panda are also wheel prizes.
    // soon: true on a "kind: soon" item keeps it on the shelf as "coming soon" (the rat is on its way).
    { id: "pet-koala",    group: "pets", name: "koala",    desc: "a rare little buddy for the corner of your screen", price: RARE_PRICE, kind: "pet", value: "koala", rare: true },
    { id: "pet-frog",     group: "pets", name: "frog",     desc: "a rare little buddy for the corner of your screen", price: RARE_PRICE, kind: "pet", value: "frog", rare: true },
    { id: "pet-panda",    group: "pets", name: "panda",    desc: "a rare little buddy for the corner of your screen", price: RARE_PRICE, kind: "pet", value: "panda", rare: true },
    { id: "pet-fish",     group: "pets", name: "fish",     desc: "a rare little buddy for the corner of your screen", price: RARE_PRICE, kind: "pet", value: "fish", rare: true },
    { id: "pet-chicken",  group: "pets", name: "chicken",  desc: "a rare little buddy for the corner of your screen", price: RARE_PRICE, kind: "pet", value: "chicken", rare: true },
    { id: "pet-elephant", group: "pets", name: "elephant", desc: "a rare little buddy for the corner of your screen", price: RARE_PRICE, kind: "pet", value: "elephant", rare: true },
    { id: "pet-goat",     group: "pets", name: "goat",     desc: "a rare little buddy for the corner of your screen", price: RARE_PRICE, kind: "pet", value: "goat", rare: true },
    { id: "pet-hamster",  group: "pets", name: "hamster",  desc: "a rare little buddy for the corner of your screen", price: RARE_PRICE, kind: "pet", value: "hamster", rare: true },
    { id: "pet-hedgehog", group: "pets", name: "hedgehog", desc: "a rare little buddy for the corner of your screen", price: RARE_PRICE, kind: "pet", value: "hedgehog", rare: true },
    { id: "pet-mouse",    group: "pets", name: "mouse",    desc: "a rare little buddy for the corner of your screen", price: RARE_PRICE, kind: "pet", value: "mouse", rare: true },
    { id: "pet-turtle",   group: "pets", name: "turtle",   desc: "a rare little buddy for the corner of your screen", price: RARE_PRICE, kind: "pet", value: "turtle", rare: true },
    // pinned: true = always on the rare shelf (first), the rest rotate. The rat is the interactive pet: clicking her opens her panel (remy.js).
    { id: "pet-rat",      group: "pets", name: "exclusive remy tomodachi", short: "remy", desc: "feed her, dress her up... battle?", price: 100000, kind: "pet", value: "rat", rare: true, pinned: true },
    // wheel: true = never sold in a shop, only won on the secret room's wheel (it still shows up in the inventory once you have it)
    { id: "tap-rainbow", group: "tap",           name: "rainbow sparkle tap", desc: "rainbow stars pop where you tap or click", price: 0, kind: "tap", value: "rainbow", wheel: true },
  ];
  const SHOP = ITEMS.filter((i) => !i.wheel && !i.rare);         // what the prize shop sells

  // ----- what's owned / switched on (saved in this browser) -----
  function load(k, fallback) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  let own = load("yb-own", []);
  let eq = load("yb-eq", { cursor: "", bg: "", pet: "", accent: "", tap: "" });
  const EQKEY = { cursor: "cursor", bg: "bg", pet: "pet", accent: "accent", tap: "tap" };   // which slot each kind of item goes in
  let petNames = load("yb-petnames", {});                       // each pet has its own name
  if (!petNames.dog && load("yb-petname", "")) petNames.dog = load("yb-petname", "");   // (an older single name, if there was one)
  const PETS = ["dog", "cat", "bunny", "koala", "frog", "panda", "fish", "chicken", "elephant", "goat", "hamster", "hedgehog", "mouse", "turtle", "rat"];
  const nameOf = (kind) => kind === "rat" ? "remy" : petNames[kind] || ({ cat: "kitty", bunny: "bun", koala: "koko", frog: "froggy", panda: "bao", fish: "bubbles", chicken: "peep", elephant: "ellie", goat: "billy", hamster: "hammy", hedgehog: "spike", mouse: "mimi", turtle: "shelly", rat: "remy" }[kind] || "buddy");
  const owns = (id) => own.indexOf(id) !== -1;
  const find = (id) => ITEMS.filter((i) => i.id === id)[0];
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // ----- the backgrounds -----
  function applyLook() {
    const root = document.documentElement;
    if (eq.bg) root.dataset.bg = eq.bg; else delete root.dataset.bg;
    if (eq.accent) root.dataset.accent = eq.accent; else delete root.dataset.accent;
    const pet = document.getElementById("pet");
    if (pet) { pet.hidden = PETS.indexOf(eq.pet) === -1; pet.dataset.kind = eq.pet || ""; }
    if (window.SR) window.SR.sync();                           // (the secret room's menu button and door)
  }

  // ----- the shop page -----
  let msgTimer = null;
  function say(t) {                                              // (the prize shop and the rare items shop each have a .shop-msg line)
    const lines = document.querySelectorAll(".shop-msg");
    lines.forEach((m) => { m.textContent = t; });
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { lines.forEach((m) => { m.textContent = ""; }); }, 3500);
  }
  const have = () => (window.YB ? window.YB.have() : 0);

  function isOn(item) { return EQKEY[item.kind] ? (eq[EQKEY[item.kind]] || "") === item.value : false; }

  function label(item) {
    if (item.kind === "soon") return { text: "coming soon", disabled: true };
    if (!owns(item.id)) return { text: "buy", disabled: have() < item.price };
    if (item.kind === "perk") return { text: "owned", disabled: true };
    if (item.value === "rat" && isOn(item)) return { text: "play time", disabled: false };   // the rat opens her panel instead of "turn off" (turn her off in the inventory)
    return { text: isOn(item) ? "turn off" : "turn on", disabled: false };
  }

  function preview(item) {
    if (item.kind === "bg") return '<span class="shop-prev" data-p="' + item.value + '"></span>';
    if (item.kind === "accent") return '<span class="shop-prev shop-prev-accent" data-a="' + item.value + '"></span>';
    if (item.kind === "tap") return '<span class="shop-prev shop-prev-glyph" data-g="' + item.value + '">' + (item.value === "heart" ? "\u2665 \u2665 \u2665" : "\u2726 \u2727 \u2726") + "</span>";
    if (item.kind === "cursor") return '<span class="shop-prev shop-prev-glyph" data-g="' + item.value + '">' + (item.value === "heart" ? "♥ ♥ ♥" : "✦ ✧ ✦") + "</span>";
    if (item.kind === "pet") { const a = document.querySelector('#pet .pet-art[data-pet="' + item.value + '"] .pet-a'); return '<span class="shop-prev shop-prev-pet">' + (a ? a.outerHTML : "") + "</span>"; }
    if (item.kind === "soon") return '<span class="shop-prev shop-prev-glyph">?</span>';
    return '<span class="shop-prev shop-prev-glyph">' + (item.tag || "") + "</span>";
  }

  // a "shelf" is one shop's grid of cards. It shows 9 at a time (3 x 3), or 6 on a phone, with arrows to the other pages.
  // list() says what's on it right now. The prize shop and the rare items shop each have one.
  const phone = window.matchMedia ? window.matchMedia("(max-width: 40rem)") : { matches: false };
  const perPage = () => (phone.matches ? 6 : 9);
  function makeShelf(box, list) {
    let page = 0;
    function build() {
      if (!box) return;
      const items = list();
      const pages = Math.max(1, Math.ceil(items.length / perPage()));
      page = Math.min(Math.max(page, 0), pages - 1);
      box.innerHTML = "";
      const grid = document.createElement("div");   // everything in one set of rows
      grid.className = "shop-grid";
      box.appendChild(grid);
      items.slice(page * perPage(), page * perPage() + perPage()).forEach((item) => {
        const card = document.createElement("div");
        card.className = "shop-item";
        card.dataset.id = item.id;
        card.innerHTML = preview(item) +
          '<span class="shop-name"></span><span class="shop-desc"></span><span class="shop-price"></span>' +
          '<button type="button" class="hy-btn shop-buy"></button>';
        card.querySelector(".shop-name").textContent = item.name;
        if (item.desktop) {                                          // "(desktop only)" under the name
          const note = document.createElement("small");
          note.className = "shop-note";
          note.textContent = "(desktop only)";
          card.querySelector(".shop-name").appendChild(note);
        }
        card.querySelector(".shop-desc").textContent = item.desc;
        card.querySelector(".shop-price").textContent = item.kind === "soon" ? "? yeonbucks" : fmt(item.price) + " yeonbucks";
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
        const lab = document.createElement("span");
        lab.className = "shop-page";
        lab.textContent = (page + 1) + " / " + pages;
        nav.appendChild(prev); nav.appendChild(lab); nav.appendChild(next);
        box.appendChild(nav);
      }
      update();
    }
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
    return { build: build, update: update };
  }
  const prizeShelf = makeShelf(document.getElementById("shop-items"), () => SHOP);

  // ----- THE RARE ITEMS SHOP (the secret room, room 4) -----
  // Same look as the prize shop. It only stocks RARE_SLOTS things at a time and the stock changes every other day,
  // the same for every visitor (it's worked out from the date, nothing is saved). Items marked pinned: true (the rat) are
  // always on the shelf, and the rest of the spots are picked at random from everything else marked rare: true in ITEMS.
  const RARE_SLOTS = 4;
  const dayNumber = () => { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };   // today, counted in the visitor's own time zone
  const stockWindow = () => Math.floor(dayNumber() / 2) + (parseInt(localStorage.getItem("yb-rare-shift"), 10) || 0);   // (the shift is only used by test mode)
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function rareStock() {
    const rare = ITEMS.filter((i) => i.rare);
    const pinned = rare.filter((i) => i.pinned);                 // always there, first
    const pool = rare.filter((i) => !i.pinned && i.kind !== "soon");
    const rand = rng(stockWindow() * 2654435761 + 12345);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    return pinned.concat(pool.slice(0, Math.max(0, RARE_SLOTS - pinned.length)));
  }
  let rareShown = -1;
  const rareShelf = makeShelf(document.getElementById("rare-items"), rareStock);
  const restockEl = document.getElementById("rare-restock");
  function restockText() {
    const d = new Date();
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (2 - (dayNumber() % 2)));   // the next even day's midnight
    const mins = Math.max(1, Math.ceil((next - d) / 60000));
    const days = Math.floor(mins / 1440), hrs = Math.floor((mins % 1440) / 60), m = mins % 60;
    return "new stock in " + (days ? days + " day " : "") + (hrs ? hrs + " hr " : "") + (days ? "" : m + " min");
  }
  function rareTick() {                                          // rebuild when the stock changes, keep the timer fresh
    if (rareShown !== stockWindow()) { rareShown = stockWindow(); rareShelf.build(); }
    if (restockEl) restockEl.textContent = restockText().trim();
  }
  function build() { prizeShelf.build(); rareShelf.build(); rareShown = stockWindow(); if (restockEl) restockEl.textContent = restockText().trim(); }
  function update() { prizeShelf.update(); rareShelf.update(); }
  window.addEventListener("storage", (e) => { if (e.key === "yb-rare-shift") rareTick(); });
  if (phone.addEventListener) phone.addEventListener("change", build);

  function act(item) {
    if (item.kind === "soon") return;
    if (!owns(item.id)) {
      if (!window.YB || !window.YB.spend(item.price)) { say("not enough yeonbucks yet!"); update(); return; }
      own.push(item.id);
      save("yb-own", own);
      if (EQKEY[item.kind]) eq[EQKEY[item.kind]] = item.value;     // switch it on right away
      save("yb-eq", eq);
      const nm = /^the /.test(item.name) ? item.name : "the " + item.name;
      say(item.kind === "pet" ? "you got " + nm + "! give it a name in your inventory." : "you got " + nm + "!");
    } else if (item.value === "rat" && isOn(item) && window.Remy) {
      window.Remy.open(); return;
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
      eq = load("yb-eq", { cursor: "", bg: "", pet: "", accent: "", tap: "" });
      petNames = load("yb-petnames", {});
      applyLook();
      update();
    }
  });
  setInterval(() => { update(); rareTick(); }, 1000);   // so "buy" lights up as soon as you can afford it

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
    [{ name: none, value: "" }].concat(owned.map((i) => ({ name: i.short || i.name, value: i.value }))).forEach((o) => {
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
    invBody.appendChild(group("cursor trail (desktop only)", "cursor", "no trail"));
    invBody.appendChild(group("background", "bg", "plain"));
    invBody.appendChild(group("color accent", "accent", "none"));
    invBody.appendChild(group("tap effect", "tap", "none"));
    const pets = group("pet", "pet", "no pet");
    const kind = eq.pet;                                     // the name box is for the pet that's out
    if (PETS.indexOf(kind) !== -1 && kind !== "rat" && owns("pet-" + kind)) {   // (remy keeps her name: no name box)
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
    if (owns("pet-rat") && window.Remy) {                    // the rat has her own panel
      const play = document.createElement("button");
      play.type = "button"; play.className = "hy-btn inv-play";
      play.textContent = "play with " + nameOf("rat");
      play.addEventListener("click", () => { closeInv(false); window.Remy.open(); });
      pets.appendChild(play);
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

  // ----- the "how it works" pop-up (from the bottom-left box or the shop page) -----
  const howEl = document.getElementById("how");
  let howFrom = null;
  function openHow(from) {
    if (!howEl) return;
    howFrom = from || null;
    if (window.YB) window.YB.redraw();                       // so the "+50" in the text is right
    howEl.hidden = false;
    const c = document.getElementById("how-close");
    if (c) c.focus();
  }
  function closeHow(restore) {
    if (!howEl || howEl.hidden) return;
    howEl.hidden = true;
    if (restore !== false && howFrom && document.contains(howFrom)) howFrom.focus();
    howFrom = null;
  }
  document.querySelectorAll("[data-how-open]").forEach((b) => b.addEventListener("click", () => openHow(b)));
  if (howEl) {
    document.getElementById("how-close").addEventListener("click", () => closeHow());
    howEl.addEventListener("click", (e) => { if (e.target === howEl || e.target.closest(".how-links a")) closeHow(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeHow(); });
    window.addEventListener("hashchange", () => closeHow(false));
  }

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

  // ----- tap sparkles: a little burst of stars where you tap or click (phones too) -----
  let tapAlive = 0;
  const TAP_GLYPHS = { sparkle: ["\u2726", "\u2727", "\u2736"], heart: ["\u2665"], rainbow: ["\u2726", "\u2727", "\u2736"] };
  window.addEventListener("pointerdown", (e) => {
    if (reduce || !TAP_GLYPHS[eq.tap] || tapAlive > 60) return;
    const glyphs = TAP_GLYPHS[eq.tap];
    for (let i = 0; i < 6; i++) {
      const bit = document.createElement("span");
      bit.className = "tap-bit tap-" + eq.tap;
      bit.textContent = glyphs[i % glyphs.length];
      if (eq.tap === "rainbow") bit.style.color = "hsl(" + Math.round((i * 60 + Math.random() * 30) % 360) + " 90% 60%)";   // each star a different color
      const ang = (Math.PI * 2 * i) / 6 + Math.random() * 0.6;
      const dist = 22 + Math.random() * 20;
      bit.style.left = e.clientX + "px";
      bit.style.top = e.clientY + "px";
      bit.style.setProperty("--tx", (Math.cos(ang) * dist).toFixed(1) + "px");
      bit.style.setProperty("--ty", (Math.sin(ang) * dist).toFixed(1) + "px");
      bit.style.setProperty("--s", (0.7 + Math.random() * 0.6).toFixed(2));
      document.body.appendChild(bit);
      tapAlive++;
      bit.addEventListener("animationend", () => { bit.remove(); tapAlive--; });
    }
  }, { passive: true });

  // ----- the pet: sits in the bottom right corner, waves and talks when you point at it -----
  const petEl = document.getElementById("pet"), petBtn = document.getElementById("pet-btn"), petBubble = document.getElementById("pet-bubble");
  let petTimer = null, lastSaid = -1;
  const PET_LINES = {                                   // <- what each pet says (one at random); {name} becomes its name
    dog: ["buwark!", "woof!", "hello i'm {name}!"],
    cat: ["mrow", "hiss!", "hello i'm {name}!"],
    bunny: ["squeak!", "*thump thump*", "hello i'm {name}!"],
    koala: ["*munch munch*", "zzz...", "hello i'm {name}!"],
    frog: ["ribbit!", "*splash*", "hello i'm {name}!"],
    panda: ["*munches bamboo*", "rawr? (not scary)", "hello i'm {name}!"],
    fish: ["blub blub", "*bubbles*", "hello i'm {name}!"],
    chicken: ["bawk bawk!", "*flaps wings*", "hello i'm {name}!"],
    elephant: ["*toot!*", "*trumpets softly*", "hello i'm {name}!"],
    goat: ["baaaa!", "*headbutt* (gently)", "hello i'm {name}!"],
    hamster: ["*stuffs cheeks*", "squeak squeak", "hello i'm {name}!"],
    hedgehog: ["*curls up*", "snuffle snuffle", "hello i'm {name}!"],
    mouse: ["squeak!", "*nibbles cheese*", "hello i'm {name}!"],
    turtle: ["...hi. (slowly)", "*hides in shell*", "hello i'm {name}!"],
    rat: ["squeak!", "*nibbles cheese*", "click me to play!", "hello i'm {name}!"],
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
    petBtn.addEventListener("click", () => {
      if (eq.pet === "rat" && window.Remy) { window.Remy.open(petBtn); return; }   // the rat opens her panel (remy.js)
      if (!petEl.classList.contains("is-up")) petSay();
    });   // phones: tap (a mouse click doesn't change the line)
    petBtn.addEventListener("focus", () => { if (petBtn.matches(":focus-visible")) petSay(); });     // keyboard only
    petBtn.addEventListener("blur", () => { clearTimeout(petTimer); petHush(); });
    petBtn.addEventListener("pointerleave", (e) => {
      clearTimeout(petTimer);
      if (e.pointerType === "mouse" || e.pointerType === "pen") petHush();   // the line goes away as soon as you stop pointing at it
      else petTimer = setTimeout(petHush, 2600);                              // (a finger lifts right away, so give it a moment)
    });
  }

  // the secret room wheel hands out wheel prizes through this (returns false if you already own it)
  window.YBShop = {
    give: function (id, equipPet) {
      if (!find(id) || owns(id)) return false;
      own.push(id);
      save("yb-own", own);
      const it = find(id);
      if (equipPet && it.kind === "pet" && !eq.pet) { eq.pet = it.value; save("yb-eq", eq); applyLook(); }   // a new pet comes out right away if none is out
      update(); drawInv();
      return true;
    },
    owns: owns,
    nameOf: nameOf,
  };
})();