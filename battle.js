// THE BATTLE: remy (top right) against your cheese (bottom left), the classic way: pick FIGHT / CAPTURE / PET / RUN.
//
// It opens from the "battle!" button in remy's panel (remy.js). The layout (the boxes, platforms and buttons) is in index.html
// (id="battle") and style.css (search "the battle"). Everything you might want to change is in the list below.
//
//   - MOVES: what the cheese can do when you pick FIGHT (min / max = how much HP it takes off remy, out of 100)
//   - FOE_MOVES: what remy does back
//   - MISS_ME / MISS_FOE: how often each side misses (0.1 = 1 in 10). The odds are tilted so remy wins most fights
//   - when remy runs out of HP she turns into the angel picture (you win)
//     when the cheese runs out of HP remy does her celebration picture (she wins)
//   - PET does nothing except make remy squeak (it doesn't use up your turn)
//   - CAPTURE: a chance to catch her that gets better the lower her HP is; if it works the battle ends

(function () {
  const el = document.getElementById("battle");
  if (!el) return;
  const $ = (id) => document.getElementById(id);
  const sayEl = $("bt-say"), menuEl = $("bt-menu"), closeBtn = $("bt-close");
  const foeG = $("bt-foe"), meG = $("bt-me"), foeArt = $("bt-foe-art");
  const bars = { foe: $("bt-foe-hp"), me: $("bt-me-hp") };

  const MOVES = [
    { name: "MELT",    min: 10, max: 22 },
    { name: "CRUMBLE", min: 8,  max: 20 },
    { name: "STINK",   min: 5,  max: 16 },
  ];
  const FOE_MOVES = [
    { name: "GNAW",      min: 16, max: 28 },
    { name: "SCRATCH",   min: 14, max: 26 },
    { name: "TAIL WHIP", min: 12, max: 30 },
  ];
  const MISS_ME = 0.25;     // how often the cheese misses (the rat is slippery)
  const MISS_FOE = 0.05;    // how often remy misses
  const ART = { idle: "pa-rat-battle", angel: "pa-rat-angel", win: "pa-rat-party" };

  const S = { me: 100, foe: 100 };
  let run = 0, opener = null, skipType = false;
  class Cancel extends Error {}

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const foeName = () => (window.YBShop && window.YBShop.nameOf ? window.YBShop.nameOf("rat") : "remy");
  async function pause(ms, id) { await wait(ms); if (id !== run || el.hidden) throw new Cancel(); }

  // the little text box types its words out (click it to skip to the end)
  async function say(text, id, hold) {
    skipType = false;
    for (let i = 1; i <= text.length; i++) {
      if (skipType) break;
      sayEl.textContent = text.slice(0, i);
      await pause(22, id);
    }
    sayEl.textContent = text;
    if (hold !== 0) await pause(hold || 800, id);
  }
  sayEl.addEventListener("click", () => { skipType = true; });

  function setHP(side, v) {
    S[side] = Math.max(0, Math.min(100, v));
    bars[side].style.setProperty("--hp", S[side] / 100);
    bars[side].dataset.lv = S[side] > 50 ? "hi" : S[side] > 20 ? "mid" : "lo";
  }

  function menu(items) {
    menuEl.innerHTML = "";
    items.forEach((it) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "bt-btn"; b.textContent = it.label;
      b.addEventListener("click", () => { if (!el.hidden) it.fn(); });
      menuEl.appendChild(b);
    });
    const first = menuEl.querySelector("button");
    if (first) first.focus();
  }

  function anim(g, cls, ms) {
    g.classList.remove(cls); void g.getBoundingClientRect();
    g.classList.add(cls);
    return ms ? wait(ms).then(() => g.classList.remove(cls)) : Promise.resolve();
  }
  const ring = $("bt-ring");
  const setArt = (key) => { foeArt.setAttribute("href", "#" + ART[key]); ring.style.display = key === "angel" ? "" : "none"; };

  function reset() {
    foeG.setAttribute("class", "bt-sprite"); meG.setAttribute("class", "bt-sprite");
    setArt("idle");
    bars.foe.style.transition = bars.me.style.transition = "none";
    setHP("foe", 100); setHP("me", 100);
    void bars.foe.offsetWidth;
    bars.foe.style.transition = bars.me.style.transition = "";
    $("bt-foe-name").textContent = foeName();
  }

  // ----- the turns -----
  function mainMenu(id) {
    say("what will the cheese do?", id, 0).catch(guard);
    menu([
      { label: "FIGHT",   fn: moveMenu },
      { label: "CAPTURE", fn: () => go(capture) },
      { label: "PET",     fn: () => go(pet) },
      { label: "RUN",     fn: () => leave(true) },
    ]);
  }
  function moveMenu() {
    menu(MOVES.map((m) => ({ label: m.name, fn: () => go((id) => fight(m, id)) })).concat([{ label: "BACK", fn: () => mainMenu(run) }]));
  }
  const guard = (e) => { if (!(e instanceof Cancel)) throw e; };
  function go(fn) {                                               // run a turn; stops quietly if the battle is closed half way
    const id = run;
    menu([]);
    fn(id).catch(guard);
  }

  async function fight(m, id) {
    await say("cheese used " + m.name + "!", id);
    await anim(meG, "bt-lunge-me", 520);
    if (Math.random() < MISS_ME) await say("it missed!", id);
    else {
      anim(foeG, "bt-hit", 500);
      setHP("foe", S.foe - rand(m.min, m.max));
      await pause(900, id);
    }
    if (S.foe <= 0) return win(id);
    return foeTurn(id);
  }
  async function foeTurn(id) {
    const m = pick(FOE_MOVES);
    await say(foeName() + " used " + m.name + "!", id);
    await anim(foeG, "bt-lunge-foe", 520);
    if (Math.random() < MISS_FOE) await say("it missed!", id);
    else {
      anim(meG, "bt-hit", 500);
      setHP("me", S.me - rand(m.min, m.max));
      await pause(900, id);
    }
    if (S.me <= 0) return lose(id);
    mainMenu(id);
  }
  async function pet(id) {                                        // does nothing but make her squeak (and it isn't a turn)
    if (window.Remy && window.Remy.chirp) window.Remy.chirp();
    anim(foeG, "bt-squish", 520);
    await say("cheese pet " + foeName() + "... squeak!", id);
    mainMenu(id);
  }
  async function capture(id) {
    await say("cheese tried to capture " + foeName() + "!", id);
    const chance = 0.15 + (1 - S.foe / 100) * 0.7;
    if (Math.random() < chance) {
      await say("gotcha! " + foeName() + " was captured!", id);
      return endMenu(id);
    }
    await say("oh no! " + foeName() + " broke free!", id);
    return foeTurn(id);
  }
  async function win(id) {                                        // remy is out of HP: the angel picture
    await say(foeName() + " fainted!", id, 500);
    setArt("angel");
    anim(foeG, "bt-ascend");
    await say("she's an angel now. you win!", id, 400);
    endMenu(id);
  }
  async function lose(id) {                                       // the cheese is out of HP: remy celebrates
    await say("cheese fainted!", id, 400);
    anim(meG, "bt-ko");
    setArt("win");
    anim(foeG, "bt-cheer");
    await say(foeName() + " wins!", id, 400);
    endMenu(id);
  }
  function endMenu() {
    say("play again?", run, 0).catch(guard);
    menu([{ label: "REMATCH", fn: start }, { label: "BACK", fn: () => leave(true) }]);
  }

  // ----- opening and closing -----
  function start(from) {
    if (from && from.nodeType === 1) opener = from;
    run++;
    const id = run;
    reset();
    el.hidden = false;
    menu([]);
    say("a wild " + foeName() + " appeared!", id).then(() => mainMenu(id)).catch(guard);
  }
  function leave(backToPanel) {
    if (el.hidden) return;
    run++;
    el.hidden = true;
    sayEl.textContent = "";
    if (backToPanel && window.Remy) window.Remy.open(opener);       // back to remy's panel
    opener = null;
  }

  closeBtn.addEventListener("click", () => leave(true));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !el.hidden) leave(true); });
  window.addEventListener("hashchange", () => leave(false));

  window.Battle = { start: start, leave: leave };
})();