// ---------- The carousel horse, built from a few 3D parts so it can turn all the way round ----------
// Each horse is a body (a squashed ball), a neck, a head, a tail and four legs, all placed in 3D. Every frame merry.js says which
// way the horse is facing (an angle) and this works out where each part lands on the screen, then draws the parts back to front.
// Every part is drawn twice: first all the parts as a slightly fatter shape in the outline colour, then all the real shapes on top,
// so the horse gets one clean outline round the whole of it (none between the parts).
//
// How it's laid out: x goes the way the horse faces, y goes down, z goes out to its side (the side nearest you when it faces right).
// All the sizes are in the same little units as the rest of the carousel drawing (the horse is about 240 wide).
//
// Things you can change:
//   PARTS   the list below: where each part is (points in x, y, z) and how thick it is (w)
//   LEG_SPREAD / BODY_SIDE   how far apart the legs are, how wide the body is

(function () {
  const LEG_SPREAD = 15;
  const BODY = { c: [-2, 2, 0], ax: 70, ay: 33, az: 29 };

  // a "chain" is a thick line through some points that gets thinner (or fatter) along the way: [x, y, radius] for each point.
  // z is how far out to the side it sits. (the head and neck, the tail and the legs are all chains)
  const CHAINS = [
    { id: "fleg2", pts: [[50, 26, 12.5], [50, 58, 10], [20, 74, 10]], z: -LEG_SPREAD },        // front leg, far side
    { id: "hleg2", pts: [[-34, 30, 16], [-50, 58, 10.5], [-62, 76, 10]], z: -LEG_SPREAD },       // hind leg, far side
    { id: "fleg1", pts: [[54, 6, 13], [92, 20, 10], [90, 62, 10]], z: LEG_SPREAD },         // front leg, near side (reaching forward)
    { id: "hleg1", pts: [[-12, 28, 17], [-4, 56, 11], [8, 75, 10.5]], z: LEG_SPREAD },         // hind leg, near side
    { id: "neck", pts: [[18, 0, 25], [50, -34, 19], [76, -64, 13]], z: 0 },
    { id: "head", pts: [[80, -66, 15], [104, -53, 11], [119, -46, 8.5]], z: 0 },
    { id: "tail", pts: [[-64, -8, 9], [-90, 4, 7.5], [-99, 28, 5.5], [-112, 38, 3.5]], z: 0 },
  ];
  // spikes are little flat triangles (the ears, the mane, the end of the tail)
  const SPIKES = [
    { id: "ear1", pts: [[76, -74], [90, -78], [80, -96]], z: 8 },
    { id: "ear2", pts: [[76, -74], [90, -78], [80, -96]], z: -8 },
    { id: "m1", pts: [[66, -70], [62, -54], [44, -82]], z: 0 },
    { id: "m2", pts: [[56, -58], [52, -42], [34, -70]], z: 0 },
    { id: "m3", pts: [[46, -46], [42, -30], [24, -58]], z: 0 },
    { id: "m4", pts: [[36, -36], [32, -20], [14, -47]], z: 0 },
    { id: "m5", pts: [[26, -26], [22, -12], [4, -37]], z: 0 },
    { id: "t1", pts: [[-104, 36], [-110, 46], [-126, 41]], z: 0 },
    { id: "t2", pts: [[-110, 28], [-116, 38], [-130, 29]], z: 0 },
  ];

  function build(group, variant) {
    const NS = "http://www.w3.org/2000/svg";
    // mc1 = a light horse with a dark line, mc3 = a dark horse with a light line (same as the rest of the drawing)
    const fill = variant === "mc3" ? "var(--text)" : "var(--bg)";
    const line = variant === "mc3" ? "var(--bg)" : "var(--text)";
    while (group.firstChild) group.removeChild(group.firstChild);
    const mk = (cls) => { const p = document.createElementNS(NS, "path"); p.setAttribute("class", cls); return p; };
    // two layers: all the outlines first, then all the shapes on top, so only the outside of the whole horse gets a line
    const layerO = document.createElementNS(NS, "g"), layerF = document.createElementNS(NS, "g");
    group.appendChild(layerO); group.appendChild(layerF);
    const parts = [];
    function part(kind, def) {
      const o = mk("mh-o"), f = mk("mh-f");
      layerO.appendChild(o); layerF.appendChild(f);
      parts.push({ kind, def, o, f });
    }
    CHAINS.forEach((d) => part("chain", d));
    SPIKES.forEach((d) => part("spike", d));
    part("body", BODY);

    const sw = "stroke-linecap:round;stroke-linejoin:round;vector-effect:none;fill-rule:nonzero;";
    // the outline of two round ends joined by straight sides (like a tapered sausage)
    function hull(A, B) {
      const dx = B.X - A.X, dy = B.Y - A.Y, dd = Math.sqrt(dx * dx + dy * dy);
      const f = (n) => n.toFixed(1);
      if (dd < Math.abs(A.r - B.r) + 0.5) {                       // one end hides the other: just a circle
        const C = A.r >= B.r ? A : B;
        return "M" + f(C.X - C.r) + "," + f(C.Y) + "a" + f(C.r) + "," + f(C.r) + " 0 1,0 " + f(2 * C.r) + ",0a" + f(C.r) + "," + f(C.r) + " 0 1,0 " + f(-2 * C.r) + ",0Z";
      }
      const phi = Math.atan2(dy, dx), al = Math.acos((A.r - B.r) / dd);
      const P = (C, ang) => f(C.X + C.r * Math.cos(ang)) + "," + f(C.Y + C.r * Math.sin(ang));
      return "M" + P(A, phi + al) + "A" + f(A.r) + "," + f(A.r) + " 0 " + (A.r > B.r ? 1 : 0) + ",1 " + P(A, phi - al) +
        "L" + P(B, phi - al) + "A" + f(B.r) + "," + f(B.r) + " 0 " + (B.r > A.r ? 1 : 0) + ",1 " + P(B, phi + al) + "Z";
    }
    function style(p, st) { p.setAttribute("style", st); }
    let lastOrder = "";

    // theta: the way the horse is facing. 0 = to the right (side on), then it swings round: 90deg = head on, 180 = to the left, 270 = tail on
    function update(theta, lineW) {
      const c = Math.cos(theta), s = Math.sin(theta);
      const proj = (x, y, z) => ({ X: x * c - z * s, Y: y, D: x * s + z * c });   // D = how near to you (bigger = nearer)
      const o = lineW;
      const order = [];
      parts.forEach((pt, idx) => {
        let d = "", depth = 0, rawDepth = 0;
        if (pt.kind === "chain") {
          const p = pt.def.pts.map((q) => { const r = proj(q[0], q[1], pt.def.z); r.r = q[2]; return r; });
          d = "";
          for (let k = 0; k + 1 < p.length; k++) d += hull(p[k], p[k + 1]);
          depth = p.reduce((a, q) => a + q.D, 0) / p.length;
          rawDepth = depth;
          depth += /^(neck|head)$/.test(pt.def.id) ? 1 : pt.def.id === "tail" ? -1 : 0;   // the head and neck draw over the body, the tail goes behind it
          style(pt.o, "fill:" + fill + ";stroke:" + line + ";stroke-width:" + (2 * o).toFixed(2) + ";" + sw);
          style(pt.f, "fill:" + fill + ";stroke:none;vector-effect:none;fill-rule:nonzero;");
        } else if (pt.kind === "spike") {
          const p = pt.def.pts.map((q) => proj(q[0], q[1], pt.def.z));
          d = "M" + p.map((q) => q.X.toFixed(1) + "," + q.Y.toFixed(1)).join("L") + "Z";
          rawDepth = p.reduce((a, q) => a + q.D, 0) / p.length;
          depth = rawDepth + (pt.def.id[0] === "e" ? 0.5 : 0.4);
          style(pt.o, "fill:" + fill + ";stroke:" + line + ";stroke-width:" + o.toFixed(2) + ";" + sw);
          style(pt.f, "fill:" + fill + ";stroke:none;");
          pt.f.setAttribute("d", d);
        } else {
          // the body: a ball squashed to the horse's size. seen from any side that's an ellipse
          const b = pt.def, cc = proj(b.c[0], b.c[1], b.c[2]);
          const rx = Math.sqrt(b.ax * b.ax * c * c + b.az * b.az * s * s), ry = b.ay;
          d = "M" + (cc.X - rx).toFixed(1) + "," + cc.Y.toFixed(1) + "a" + rx.toFixed(1) + "," + ry + " 0 1,0 " + (2 * rx).toFixed(1) + ",0a" + rx.toFixed(1) + "," + ry + " 0 1,0 " + (-2 * rx).toFixed(1) + ",0Z";
          depth = rawDepth = cc.D;
          style(pt.o, "fill:" + fill + ";stroke:" + line + ";stroke-width:" + (2 * o).toFixed(2) + ";vector-effect:none;");
          style(pt.f, "fill:" + fill + ";stroke:none;vector-effect:none;fill-rule:nonzero;");
        }
        pt.o.setAttribute("d", d);
        if (pt.kind !== "spike") pt.f.setAttribute("d", d);
        order.push([depth, idx]);
      });
      order.sort((a, b) => a[0] - b[0]);
      const key = order.map((q) => q[1]).join(",");
      if (key !== lastOrder) { order.forEach((q) => { layerO.appendChild(parts[q[1]].o); layerF.appendChild(parts[q[1]].f); }); lastOrder = key; }
    }
    return { update };
  }

  window.MerryHorse = { build };
})();
