// ---------- Guess the k-pop idol ----------
// A blurry photo. Type a name. Every wrong guess makes the photo clearer.
// The idols (names, spellings, hints, photos) live in idols.js.

(function () {
  // wait until the whole page (including idols.js) has loaded, so the order of the script lines doesn't matter
  if (document.readyState !== "complete") { window.addEventListener("load", init); } else { init(); }

  function init() {
  const $ = (id) => document.getElementById(id);
  const photoBox = $("gi-photo"), img = $("gi-img"), msg = $("gi-msg");
  const form = $("gi-form"), input = $("gi-input"), actions = $("gi-actions");
  const hintBtn = $("gi-hintbtn"), skipBtn = $("gi-skip"), nextBtn = $("gi-next");
  const hintText = $("gi-hinttext"), roundEl = $("gi-round"), scoreEl = $("gi-score");
  const gameEl = $("gi-game"), endEl = $("gi-end"), endScore = $("gi-end-score");
  const restartBtn = $("gi-restart"), againBtn = $("gi-again");
  if (!photoBox) return;
  if (typeof IDOLS === "undefined" || !IDOLS.length) {
    msg.textContent = "the idol list (idols.js) didn't load. check that it's in the same folder as index.html and has no typos.";
    form.hidden = true; actions.hidden = true;
    return;
  }

  // ---- things you can change ----
  const ROUNDS = 10;                         // photos per game (fewer if you have fewer idols)
  const BLUR = [9, 6, 4, 2, 1];          // how blurry the photo is after 0, 1, 2... wrong guesses
  const MAX_POINTS = 5;                      // points for a right answer. each wrong guess and each hint takes 1 away, so the score can go negative
  const PHOTO_DIR = "games/idol/photos/";

  const MAX_WRONG = BLUR.length;             // this many wrong guesses and the round is over

  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  const slug = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const photoOf = (idol) => PHOTO_DIR + (idol.photo || slug(idol.name) + ".jpg");

  // every spelling that counts for each idol
  IDOLS.forEach((idol) => { idol.keys = new Set([norm(idol.name), ...(idol.alts || []).map(norm)]); });

  let queue = [], current = null, roundNo = 0, total = 0, score = 0;
  let wrong = 0, hintUsed = false, over = false, roundPts = 0;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function newGame() {
    firstMissing = "";
    queue = shuffle(IDOLS.slice());
    total = Math.min(ROUNDS, queue.length);
    roundNo = 0; score = 0;
    gameEl.hidden = false; endEl.hidden = true; restartBtn.hidden = false;
    nextRound();
  }

  function setBlur(n) { photoBox.style.setProperty("--blur", n); }

  let firstMissing = "";

  function nextRound() {
    if (roundNo >= total) return roundNo ? finish() : noPhotos();
    const idol = queue.shift();
    if (!idol) return roundNo ? finish() : noPhotos();
    // make sure the photo exists before using it; if not, quietly skip that idol
    const test = new Image();
    test.onload = () => start(idol);
    test.onerror = () => { if (!firstMissing) firstMissing = photoOf(idol); total = Math.min(total, roundNo + queue.length); nextRound(); };
    test.src = photoOf(idol);
  }

  // none of the photos could be found (usually the folder is in the wrong place)
  function noPhotos() {
    photoBox.classList.add("clear");
    img.removeAttribute("src");
    msg.textContent = "can't find the photos. i looked for " + firstMissing + " - check that the photos folder is inside games/idol/.";
    form.hidden = true; actions.hidden = true; nextBtn.hidden = true;
    roundEl.textContent = "round 0 / 0";
  }

  function start(idol) {
    current = idol; roundNo++; wrong = 0; hintUsed = false; over = false; roundPts = 0;
    photoBox.classList.remove("clear");
    photoBox.style.setProperty("--blur", BLUR[0]);
    // swap the picture without a flash of the sharp one
    img.style.transition = "none";
    img.src = photoOf(idol);
    void img.offsetWidth;
    img.style.transition = "";
    msg.textContent = "who is this?";
    hintText.textContent = "";
    input.value = ""; form.hidden = false; actions.hidden = false; nextBtn.hidden = true;
    hintBtn.disabled = !idol.hint;
    updateBar();
    if (!window.matchMedia("(pointer: coarse)").matches) input.focus();
  }

  const fmt = (n) => (n > 0 ? "+" + n : String(n));

  function updateBar() {
    roundEl.textContent = "round " + roundNo + " / " + total;
    scoreEl.textContent = "score " + score;
  }

  // the round is over: show the answer and the next button
  function reveal(text) {
    over = true;
    photoBox.classList.add("clear");
    setBlur(0);
    msg.innerHTML = text + "<br><strong>" + current.name + "</strong> (" + (current.groups || []).join(", ") + ")";
    form.hidden = true; actions.hidden = true;
    nextBtn.hidden = false;
    nextBtn.textContent = roundNo >= total ? "see my score" : "next";
    updateBar();
    nextBtn.focus();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (over) return;
    const guess = norm(input.value);
    if (!guess) return;
    const matches = IDOLS.filter((i) => i.keys.has(guess));

    if (matches.includes(current)) {
      score += MAX_POINTS; roundPts += MAX_POINTS;
      reveal("yes! " + fmt(roundPts) + " this round");
      return;
    }
    if (!matches.length) {            // not on the list: doesn't count as a guess
      msg.textContent = "that's not one of the idols here. try another spelling?";
      input.select();
      return;
    }
    wrong++; score--; roundPts--;     // every wrong guess costs a point
    updateBar();
    if (wrong >= MAX_WRONG) { reveal("out of guesses! " + fmt(roundPts) + " this round"); return; }
    setBlur(BLUR[wrong]);
    const sameGroup = matches.some((m) => (m.groups || []).some((g) => (current.groups || []).includes(g)));
    msg.textContent = (sameGroup ? "right group, wrong member!" : "nope!") + " -1 point. " + (MAX_WRONG - wrong) + (MAX_WRONG - wrong === 1 ? " guess" : " guesses") + " left.";
    input.value = ""; input.focus();
  });

  hintBtn.addEventListener("click", () => {
    if (over || hintUsed || !current.hint) return;
    hintUsed = true; score--; roundPts--;    // a hint costs a point
    updateBar();
    hintText.textContent = "hint: " + current.hint;
    hintBtn.disabled = true;
    input.focus();
  });
  skipBtn.addEventListener("click", () => { if (!over) reveal("skipped. " + fmt(roundPts) + " this round"); });
  nextBtn.addEventListener("click", nextRound);

  function finish() {
    gameEl.hidden = true; endEl.hidden = false; restartBtn.hidden = true;
    const best = total * MAX_POINTS;
    endScore.textContent = "you scored " + score + " out of " + best + ".";
  }

  restartBtn.addEventListener("click", newGame);
  againBtn.addEventListener("click", newGame);

  // start a fresh game each time the page is opened
  function check() { if (location.hash === "#idol") newGame(); }
  window.addEventListener("hashchange", check);
  check();
  }
})();