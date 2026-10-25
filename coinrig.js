// ---------- A little 3D hyrax coin (a disc with a real edge) that spins about its up-and-down axis ----------
// This is the coin from the reference gif: you see the dark edge turn into view, and the hyrax on both sides.
// It's used by the arcade (the token flying into the slot) and the wishing well (the coin turning over to write a wish, and the toss).
//   CoinRig.build(host, frontSvg, backNode, faceClass) -> the rig (added inside host). backNode is the drawing for the other side
//                                                          (left out = the front's drawing again, which comes out mirrored like the gif).
//   CoinRig.spin(rig, fromDeg, toDeg, options) -> the animation (options are the normal Web Animations ones: duration, delay, easing)
// The thickness is drawn in cqw, so the host has to be a size container (container-type: inline-size) and it scales with the coin.
window.CoinRig = (function () {
  function build(host, frontSvg, backNode, faceClass) {
    const rig = document.createElement("div");
    rig.className = "coin-rig";
    for (let k = 0; k < 9; k++) {
      const e = document.createElement("span");
      e.className = "coin-rig-edge";
      e.style.transform = "translateZ(" + ((k - 4) * 0.6).toFixed(1) + "cqw)";
      rig.appendChild(e);
    }
    [false, true].forEach((back) => {
      const f = document.createElement("div");
      f.className = "coin-tface" + (faceClass ? " " + faceClass : "");
      const art = back && backNode ? backNode.cloneNode(true) : frontSvg.cloneNode(true);
      f.appendChild(art);
      f.style.transform = (back ? "rotateY(180deg) " : "") + "translateZ(2.7cqw)";
      rig.appendChild(f);
    });
    host.appendChild(rig);
    return rig;
  }
  function spin(rig, from, to, options) {
    const P = "perspective(900px) ";
    return rig.animate(
      [{ transform: P + "rotateY(" + from + "deg)" }, { transform: P + "rotateY(" + to + "deg)" }],
      Object.assign({ fill: "both", easing: "linear" }, options || {})
    );
  }
  return { build, spin };
})();
