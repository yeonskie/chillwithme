// ---------- the homepage extras: string lights along the top, and floating balloons you can pop ----------
// THE LIGHTS:  a string of little lights fixed under the top bar. They're black and tan like the rest of the page, and only show on the homepage.
//              (the drawing is the LIGHTS_SWAG svg below, one "swag" of wire. it gets repeated to fill the screen width)
// THE BALLOONS: balloons float slowly up the homepage. tap one to pop it and win 1 to 10 yeonbucks.
//              every balloon gets its own random amount when it appears (bigger balloons are worth a little more).
//              the drawing is BALLOON_PARTS below: a white one and a dark one are picked at random.
//              they float up the left and right edges of the homepage (not through the middle), behind the rest of the page. tap one to pop it.
// To change things, edit the numbers just below.

(function () {
  const MIN_BALLOONS = 2;            // there are always at least this many balloons floating (a new one appears right away when one is popped or floats off)
  const MAX_DESKTOP = 12;            // ...and never more than this many at once on a computer...
  const MAX_PHONE = 4;               // ...or on a phone (screens 640 pixels wide or less)
  const SPAWN_DESKTOP = [1250, 2000];   // when there's room, a new balloon floats in every 1.25 to 2 seconds on a computer...
  const SPAWN_PHONE = [5500, 8000];     // ...and every 5.5 to 8 seconds on a phone (milliseconds)
  const PRIZE_CHANCE = 0.65;         // only some balloons have yeonbucks inside: 0.65 = about 6 or 7 in 10 (the rest just pop)
  const SPEED_MIN = 22;              // how fast they rise, in pixels per second (small number = slower)
  const SPEED_MAX = 34;
  const PRIZE_MIN = 1;               // a prize balloon is worth between these two amounts of yeonbucks
  const PRIZE_MAX = 10;
  const START_BALLOONS = 3;          // how many are already floating when you arrive on the homepage

  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const isPhone = () => window.innerWidth <= 640;
  const maxBalloons = () => (isPhone() ? MAX_PHONE : MAX_DESKTOP);
  const atHome = () => { const p = document.querySelector(".page.active"); return !p || p.dataset.page === "home"; };

  // ================= the string lights =================
  // one swag of wire with its 9 little flags (from string_lights_updated.svg). the flags alternate light / dark all along the string,
  // (a short bit of wire at the end of each swag joins it to the next one, so there's no gap)
  // so there are two swags (one starting light, one starting dark) that take turns
  const SWAG_OPEN = '<svg class="hl-swag" viewBox="-0.41 0 385.04 90" aria-hidden="true" focusable="false">';
  const LIGHTS_SWAGS = [
    SWAG_OPEN + '<path class="hl-w" d="M100.74,73.58c8-5.1,15.67-10.48,22.98-16.1-14.73-3.05-29.3-7.14-43.59-12.25,4.29,9.03,9.07,17.99,14.35,26.84,1.24,2.1,4.23,2.82,6.26,1.52Z"/><path class="hl-k" d="M55.53,58.14c8.69-3.92,17.08-8.18,25.14-12.72-14.29-5.09-28.31-11.21-41.94-18.36,3.08,9.59,6.67,19.17,10.75,28.69.96,2.26,3.85,3.4,6.06,2.39Z"/><path class="hl-w" d="M12.32,36.27c9.25-2.62,18.22-5.61,26.91-8.96C25.59,20.19,12.34,12.03-.41,2.84c1.83,10.01,4.15,20.08,6.97,30.16.67,2.39,3.41,3.95,5.76,3.28Z"/><path class="hl-k" d="M147.26,82.59c7.2-6.15,14.03-12.53,20.48-19.09-14.95-1.02-29.84-3.06-44.57-6.14,5.43,8.34,11.34,16.55,17.73,24.59,1.51,1.9,4.54,2.21,6.37.64Z"/><path class="hl-w" d="M194.4,85.18c6.28-7.07,12.18-14.31,17.68-21.69-14.95,1.02-29.95,1.01-44.9-.03,6.48,7.52,13.43,14.86,20.84,21.95,1.75,1.68,4.79,1.57,6.39-.23Z"/><path class="hl-k" d="M333.24,54.17c3.03-9.06,5.65-18.13,7.85-27.17-13.63,7.16-27.64,13.28-41.94,18.38,9.04,4.27,18.45,8.16,28.21,11.63,2.31.82,5.1-.52,5.87-2.83Z"/><path class="hl-w" d="M288.38,70.93c4.18-8.53,7.95-17.12,11.3-25.75-14.29,5.12-28.85,9.21-43.58,12.27,8.31,5.48,17.03,10.64,26.14,15.45,2.15,1.14,5.07.2,6.14-1.97Z"/><path class="hl-k" d="M242.07,81.26c5.26-7.87,10.12-15.86,14.58-23.93-14.73,3.08-29.62,5.14-44.57,6.16,7.46,6.56,15.36,12.87,23.68,18.88,1.97,1.42,4.97.9,6.31-1.11Z"/><path class="hl-w" d="M375.95,30.99c1.83-9.46,3.26-18.87,4.27-28.22-12.75,9.19-26,17.36-39.64,24.49,9.63,2.93,19.59,5.41,29.85,7.41,2.43.48,5.05-1.28,5.52-3.68Z"/><path class="hl-wire" d="M-.41,2.84c112.62,81.16,264.21,81.87,377.52,2.15"/><path class="hl-wire" d="M377.11,4.99L384.63,2.84"/></svg>',
    SWAG_OPEN + '<g transform="translate(-385.04 0)"><path class="hl-k" d="M485.78,73.58c8-5.1,15.67-10.48,22.98-16.1-14.73-3.05-29.3-7.14-43.59-12.25,4.29,9.03,9.07,17.99,14.35,26.84,1.24,2.1,4.22,2.82,6.26,1.52Z"/><path class="hl-w" d="M440.57,58.14c8.69-3.92,17.07-8.18,25.14-12.72-14.3-5.09-28.31-11.21-41.94-18.36,3.08,9.59,6.67,19.17,10.75,28.69.97,2.26,3.84,3.4,6.06,2.39Z"/><path class="hl-k" d="M397.37,36.27c9.25-2.62,18.22-5.61,26.91-8.96-13.64-7.13-26.89-15.28-39.64-24.47,1.83,10.01,4.15,20.08,6.97,30.16.67,2.39,3.41,3.94,5.76,3.28Z"/><path class="hl-w" d="M532.3,82.59c7.2-6.15,14.03-12.53,20.48-19.09-14.95-1.02-29.84-3.06-44.57-6.14,5.43,8.34,11.34,16.55,17.73,24.59,1.51,1.9,4.54,2.21,6.37.64Z"/><path class="hl-k" d="M579.45,85.18c6.28-7.07,12.18-14.31,17.68-21.69-14.95,1.02-29.96,1.01-44.9-.03,6.48,7.52,13.43,14.86,20.84,21.95,1.75,1.68,4.79,1.57,6.39-.23Z"/><path class="hl-w" d="M718.28,54.17c3.03-9.06,5.65-18.13,7.85-27.18-13.63,7.16-27.64,13.28-41.94,18.38,9.04,4.27,18.45,8.16,28.21,11.62,2.3.82,5.1-.52,5.87-2.83Z"/><path class="hl-k" d="M673.43,70.93c4.18-8.53,7.95-17.12,11.3-25.75-14.29,5.12-28.85,9.21-43.58,12.27,8.31,5.48,17.03,10.64,26.14,15.45,2.15,1.14,5.08.2,6.14-1.97Z"/><path class="hl-w" d="M627.12,81.26c5.26-7.87,10.12-15.86,14.58-23.93-14.73,3.08-29.62,5.14-44.57,6.16,7.46,6.56,15.36,12.87,23.68,18.88,1.96,1.42,4.98.9,6.31-1.11Z"/><path class="hl-k" d="M760.99,30.99c1.83-9.46,3.26-18.87,4.27-28.22-12.75,9.19-26,17.36-39.63,24.49,9.63,2.93,19.59,5.41,29.85,7.41,2.42.48,5.06-1.28,5.52-3.68Z"/><path class="hl-wire" d="M384.63,2.84c112.62,81.16,264.21,81.87,377.52,2.15"/></g><path class="hl-wire" d="M377.11,4.99L384.63,2.84"/></svg>',
  ];
  const SWAG_RATIO = 385.04 / 90;                    // width / height of one swag

  const lights = document.createElement("div");
  lights.className = "hl-lights";
  lights.setAttribute("aria-hidden", "true");
  lights.hidden = true;
  document.body.appendChild(lights);

  let lightsCount = 0;
  function buildLights() {
    const h = parseFloat(getComputedStyle(lights).height) || 40;
    const n = Math.ceil(window.innerWidth / (h * SWAG_RATIO)) + 1;
    if (n === lightsCount) return;
    lightsCount = n;
    let html = "";
    for (let k = 0; k < n; k++) html += LIGHTS_SWAGS[k % 2];
    lights.innerHTML = html;
  }

  // ================= the balloons =================
  // from balloon_white.svg / balloon_dark.svg. the two drawings are the same shape, only the colors change:
  const BALLOON_PARTS =
    '<path class="hb-string" d="M627.32,878.65c-7.04,36.53-19.01,65.74-25.31,79.53-2.11,4.61-7.58,6.56-12.1,4.37-.1-.05-.2-.1-.3-.15-4.22-2.22-5.98-7.35-4.01-11.69,5.9-12.96,17.51-41.24,24.14-75.94,5.29-27.72,6.42-54.08,3.35-78.33-3.79-29.96-14.06-56.83-30.51-79.85-40.56-56.74-52.65-109.32-55.64-143.44-2.03-23.08-.34-41,1.32-51.56.82-5.27,5.68-8.79,10.79-8.14.23.03.45.06.68.11,3.9,1.36,6.48,5.05,6.48,9.13,0,.5-.04,1.01-.12,1.52-1.49,9.47-3.15,26.39-1.14,48.27,2.91,31.68,14.34,80.58,52.27,133.64,18.27,25.56,29.63,55.29,33.77,88.36,3.28,26.2,2.04,54.52-3.67,84.17Z"/>' +
    '<path class="hb-body" d="M558.65,501.05l26,28.9c3.31,3.68.7,9.55-4.25,9.55h-80.81c-4.95,0-7.57-5.87-4.25-9.55l26.01-28.9c-93.18-10.15-165.94-95.63-165.94-199.58,0-110.81,82.65-200.63,184.59-200.63s184.59,89.82,184.59,200.63c0,103.95-72.76,189.43-165.94,199.58Z"/>' +
    '<path class="hb-shine" d="M645.43,177.99c32.9,32.94,40.11,82.54,23.49,123.21-3.4,8.32-15.88,4.92-14.46-3.96,5.52-34.68-5.09-71.43-31.81-98.16-26.82-26.82-63.7-37.4-98.47-31.77-8.76,1.42-12.33-10.97-4.14-14.39,41.41-17.32,91.98-9.6,125.4,25.07Z"/>';
  const BALLOON_VIEWBOX = "350 96 380 872";           // (just the balloon, cropped from the 1080 x 1080 drawing)
  const BODY_AT = 0.26;                                // how far down the balloon the round part's middle is (for the pop)

  const layer = document.createElement("div");
  layer.className = "hb-layer";
  layer.hidden = true;
  document.body.appendChild(layer);
  // the pop effects (burst and "+7") go in their own layer, on top of the page, so you can always see them
  const fx = document.createElement("div");
  fx.className = "hb-layer hb-fx";
  fx.hidden = true;
  document.body.appendChild(fx);

  let count = 0, timer = 0, running = false;
  const balloons = new Map();         // each floating balloon -> its animation and its prize

  function award(n) {
    if (window.YB && typeof window.YB.add === "function") window.YB.add(n);
  }

  function pop(el, prize) {
    const r = el.getBoundingClientRect(), lr = layer.getBoundingClientRect();
    const cx = r.left - lr.left + r.width / 2;
    const cy = r.top - lr.top + r.height * BODY_AT;
    const b = balloons.get(el);
    if (b) b.fly.cancel();
    balloons.delete(el);
    el.remove();
    count--;
    if (prize > 0) award(prize);
    refill();

    // a little burst of lines...
    if (!reduced) {
      for (let i = 0; i < 9; i++) {
        const t = document.createElement("span");
        t.className = "hb-tick";
        const a = (360 / 9) * i + rand(-10, 10);
        t.style.left = cx + "px"; t.style.top = cy + "px";
        fx.appendChild(t);
        const an = t.animate([
          { transform: "rotate(" + a + "deg) translateY(-1.1rem)", opacity: 1 },
          { transform: "rotate(" + a + "deg) translateY(-2.6rem)", opacity: 0 },
        ], { duration: 420, easing: "cubic-bezier(.2,.7,.3,1)" });
        an.onfinish = () => t.remove();
      }
    }
    // ...and the "+7" floats up (only the balloons that had yeonbucks in them)
    if (prize <= 0) return;
    const txt = document.createElement("span");
    txt.className = "hb-plus";
    txt.textContent = "+" + prize;
    txt.style.left = cx + "px"; txt.style.top = cy + "px";
    fx.appendChild(txt);
    const an = txt.animate(
      reduced
        ? [{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }]
        : [
            { transform: "translate(-50%, -50%) scale(.4)", opacity: 0 },
            { transform: "translate(-50%, -90%) scale(1.15)", opacity: 1, offset: 0.18 },
            { transform: "translate(-50%, -150%) scale(1)", opacity: 1, offset: 0.7 },
            { transform: "translate(-50%, -230%) scale(1)", opacity: 0 },
          ],
      { duration: 1100, easing: "ease-out" }
    );
    an.onfinish = () => txt.remove();
  }

  // frac = how far up it already is (so the first few balloons are already part of the way up)
  function spawn(frac) {
    if (!layer.clientHeight) return;
    const prize = Math.random() < PRIZE_CHANCE ? Math.floor(rand(PRIZE_MIN, PRIZE_MAX + 1)) : 0;   // 0 = an empty balloon
    const size = prize || 4;                                                                         // (empty balloons are a middle size, so you can't tell which have yeonbucks)
    const w = (window.innerWidth > 640 ? 2.1 : 1.7) * 16 + (size - 1) * (window.innerWidth > 640 ? 3 : 2);   // bigger balloon = bigger prize
    const h = w * (872 / 380);
    // stay out of the middle: balloons only float up the left and right edges, beside the title, carousel and buttons.
    // (the middle is measured from the page itself, so it works at any screen size)
    const room = Math.max(0, layer.clientWidth - w);
    let zl = Infinity, zr = -Infinity;
    const grow = (r) => { if (r.width) { zl = Math.min(zl, r.left); zr = Math.max(zr, r.right); } };
    document.querySelectorAll(".home-title, .home-sub-below").forEach((n) => {     // (the words themselves, not the empty room beside them)
      const rg = document.createRange();
      rg.selectNodeContents(n);
      grow(rg.getBoundingClientRect());
    });
    document.querySelectorAll(".home-merry, .home-carousel, .home-bottom button").forEach((n) => grow(n.getBoundingClientRect()));
    const GAP = 8;                                                   // a little breathing room next to the middle (the balloons sway a bit)
    const leftMax = Math.max(0, zl - w - GAP);                       // the left edge strip is from 0 to here
    const rightMin = Math.min(room, zr + GAP);                       // the right edge strip is from here to the edge
    const sides = [];
    if (zl === Infinity) sides.push([0, room]);
    else {
      if (zl - GAP > w * 0.6) sides.push([0, leftMax]);
      if (layer.clientWidth - zr - GAP > w * 0.6) sides.push([rightMin, room]);
      if (!sides.length) sides.push([0, leftMax], [rightMin, room]);   // (no space either side: just use the very edges)
    }
    // on a phone the page is nearly as wide as the screen, so balloons hug the very edges (a little of each one can hang off the side of the screen)
    if (isPhone()) { sides.length = 0; sides.push([-w * 0.4, 0], [room, room + w * 0.4]); }
    const pick = () => { const sd = sides[Math.floor(Math.random() * sides.length)]; return rand(sd[0], Math.max(sd[0], sd[1])); };
    // spread out: try a few spots and take the one furthest from the balloons already floating
    let x = pick(), best = -1;
    for (let k = 0; k < 8; k++) {
      const cand = pick();
      let gap = Infinity;
      balloons.forEach((_, other) => { gap = Math.min(gap, Math.abs(other.offsetLeft - cand)); });
      if (gap > best) { best = gap; x = cand; }
    }

    const el = document.createElement("div");
    el.className = "hb " + (Math.random() < 0.5 ? "hb-white" : "hb-dark");
    el.style.width = w + "px"; el.style.height = h + "px"; el.style.left = x + "px";
    el.innerHTML = '<span class="hb-sway"><svg viewBox="' + BALLOON_VIEWBOX + '" focusable="false" aria-hidden="true">' + BALLOON_PARTS + "</svg></span>";
    layer.appendChild(el);
    count++;

    const from = layer.clientHeight + 8, to = -h - 8;
    const speed = rand(SPEED_MIN, SPEED_MAX);
    const dur = ((from - to) / speed) * 1000;
    const fly = el.animate(
      [{ transform: "translateY(" + from + "px)" }, { transform: "translateY(" + to + "px)" }],
      { duration: dur, easing: "linear", fill: "forwards" }
    );
    if (frac) fly.currentTime = frac * dur;
    fly.onfinish = () => { el.remove(); balloons.delete(el); count--; refill(); };
    balloons.set(el, { fly, prize });

    if (!reduced) {
      const sway = el.firstChild.animate(
        [{ transform: "translateX(-0.35rem) rotate(-3deg)" }, { transform: "translateX(0.35rem) rotate(3deg)" }],
        { duration: rand(3200, 5200), direction: "alternate", iterations: Infinity, easing: "ease-in-out" }
      );
      sway.currentTime = rand(0, 4000);
    }
  }

  // the balloons float behind the page, so taps are checked here instead: a tap on empty page (not a link or button)
  // that lands on a balloon pops it. (a little extra room around each balloon makes the small ones easier to hit)
  const PAD = 8;
  document.addEventListener("click", (e) => {
    if (layer.hidden || !balloons.size) return;
    const t = e.target;
    if (!t.closest || !t.closest("main")) return;
    if (t.closest("a, button, input, select, textarea, label, summary, [role=button], [data-lb-open], #home-merry")) return;
    for (const el of balloons.keys()) {
      const r = el.getBoundingClientRect();
      if (e.clientX >= r.left - PAD && e.clientX <= r.right + PAD && e.clientY >= r.top - PAD && e.clientY <= r.bottom + PAD) {
        pop(el, balloons.get(el).prize);
        return;
      }
    }
  });

  // keeps at least MIN_BALLOONS floating: when one is popped or floats off the top, the next one comes in a moment later
  function refill() {
    if (!running) return;
    setTimeout(() => { if (running && count < MIN_BALLOONS) spawn(0); }, 400);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (running && document.visibilityState === "visible" && count < maxBalloons()) spawn(0);
      if (running) schedule();
    }, rand(...(isPhone() ? SPAWN_PHONE : SPAWN_DESKTOP)));
  }

  function start() {
    if (running) return;
    running = true;
    for (let i = 0; i < START_BALLOONS; i++) spawn(0.08 + (0.8 * (i + rand(0.2, 0.8))) / START_BALLOONS);   // (evenly up the screen, not bunched)
    schedule();
  }
  function stop() {
    running = false;
    clearTimeout(timer);
    layer.querySelectorAll("*").forEach((n) => n.remove());
    balloons.clear();
    count = 0;
  }

  function sync() {
    const on = atHome();
    lights.hidden = !on;
    layer.hidden = !on;
    fx.hidden = !on;
    if (on) { buildLights(); start(); } else stop();
  }

  window.addEventListener("hashchange", () => setTimeout(sync, 0));
  window.addEventListener("resize", () => { if (!lights.hidden) buildLights(); });
  sync();
})();
