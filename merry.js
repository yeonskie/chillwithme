// ---------- Home page: the little carousel ----------
// Four poles, each with a horse on it, go round together on a loop: they get a little smaller at the back, pass behind the
// middle (the drape), and come round the front again. The horses bob up and down along their poles, and turn around
// (squashing flat for a moment, like a real one seen from the front) at the two sides. The stripes on the poles turn
// (that part is css, see style.css). It stops when the home page isn't showing, and stays still if "reduce motion" is on.
// Tap or click it (or the < > buttons below) to make it spin faster for a moment.
//
// Things you can change:
//   SPEED    how fast it goes round (seconds for one full turn)
//   RADIUS   how far left and right the poles travel (in the drawing's units; the drawing is 880 wide)
//   BOB      how far the horses go up and down their poles
(function () {
  const svg = document.querySelector("#home-merry svg");
  if (!svg) return;
  const back = svg.querySelector("#mg-back");
  const front = svg.querySelector("#mg-front");
  const units = Array.from(svg.querySelectorAll(".mg-unit"));
  if (!back || !front || units.length === 0) return;

  const SPEED = 14;
  const RADIUS = 300;
  const BOB = 14;
  const CX = 540, CY = 717.6;                 // the middle of the ride, in the drawing
  const POLE_TOP = 375.6;                     // where the poles start (hidden under the top of the ride)
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const poles = units.map((u) => u.querySelector(".mg-pole"));
  const horses = units.map((u) => u.querySelector(".mg-horse"));
  // the stripes on the poles are moved here too (not by a separate css animation), so they always move in step with the
  // horses, including when you tap to spin it faster
  const stripes = units.map((u) => u.querySelector(".mg-stripes"));
  const STRIPE_GAP = 64.34;                          // the distance from one stripe to the next on the pole
  const STRIPE_SPEED = 35.66;                        // how far the stripes slide for each bit the ride turns
  let angle = 0, boost = 0, last = 0, where = units.map(() => null);

  // the horses are drawn with a plain line (not a "same width at any size" line) so they can squash flat without turning
  // into a dark smudge; this keeps that line about 0.9px thick on screen whatever size the drawing is shown at
  // (it was 1.2px; change HORSE_LINE to make the horses' lines thicker or thinner)
  const HORSE_LINE = 0.9;
  function lineWidth() {
    const w = svg.getBoundingClientRect().width;
    if (w > 0) svg.style.setProperty("--hsw", (HORSE_LINE / (w / 880)).toFixed(2) + "px");
  }
  lineWidth();
  if (window.ResizeObserver) new ResizeObserver(lineWidth).observe(svg); else window.addEventListener("resize", lineWidth);

  function place() {
    units.forEach((u, i) => {
      const a = angle + (i * Math.PI * 2) / units.length + 0.45;
      const d = Math.sin(a);                           // 1 = right at the front, -1 = right at the back
      const x = CX - RADIUS * Math.cos(a);
      const y = CY + 22 * d + BOB * Math.sin(2 * a + i * 1.3);
      const poleScale = 1.2 * (1 + 0.17 * d);          // thicker at the front
      const horseScale = 0.91 + 0.09 * d;              // bigger at the front
      const turn = (d < 0 ? -1 : 1) * Math.max(Math.pow(Math.abs(d), 0.75), 0.002);   // squashes flat at the sides, then faces the other way
      u.setAttribute("transform", "translate(" + x.toFixed(1) + " 0)");
      poles[i].setAttribute("transform", "translate(0 " + POLE_TOP + ") scale(" + poleScale.toFixed(3) + ")");
      horses[i].setAttribute("transform", "translate(0 " + y.toFixed(1) + ") scale(" + (horseScale * turn).toFixed(3) + " " + horseScale.toFixed(3) + ")");
      if (stripes[i]) {
        const slide = (angle * STRIPE_SPEED) % STRIPE_GAP;
        stripes[i].setAttribute("transform", "translate(0 " + (stripes[i].classList.contains("mg-down") ? slide : -slide).toFixed(2) + ")");
      }
      const layer = d >= 0 ? "front" : "back";
      if (where[i] !== layer) {                        // front ones are in front of the drape, back ones behind it
        (d >= 0 ? front : back).appendChild(u);
        where[i] = layer;
      }
    });
  }

  function onHome() { return !location.hash || location.hash === "#home"; }

  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000 || 0);
    last = t;
    if (!onHome() || document.hidden) return;
    boost = Math.max(0, boost - dt * 1.2);
    const speedUp = 1 + 4 * boost * boost;           // eases back to normal speed
    angle += ((Math.PI * 2) / SPEED) * dt * speedUp;
    place();
  }

  function spin() { boost = 1; }
  const wrap = document.getElementById("home-merry");
  wrap.addEventListener("click", spin);
  ["home-prev", "home-next"].forEach((id) => { const b = document.getElementById(id); if (b) b.addEventListener("click", spin); });

  place();
  if (!reduced) requestAnimationFrame(frame);
})();