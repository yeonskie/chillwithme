// ---------- Updates pop-up ----------
// The "updates" link in the bottom bar (next to credits) opens this list.
// This is the file to edit when you add something new to the site. Newest day first.
// To add a new day, copy one { date, items } block and put it at the TOP of the list.
// To add something to a day that's already there, add a line to its items.

const UPDATES = [
  {
    date: "10.24.26",
    items: [
      "revamped arcade page",
      "hyrax coin animation in arcade room",
      "added animations to joystick/buttons/title in arcade room",
      "replaced confession booth with wishing well",
      "new shop items: flower trail, paw print trail",
      "animated jukebox while playing songs",
    ],
  },
  {
    date: "10.23.26",
    items: [
      "revamped casino design",
      "added tickets as moodboard titles",
      "added two additional boosts: jackpot boost, cashback",
    ],
  },
  {
    date: "10.22.26",
    items: [
      "retitled 'music page' to 'jukebox' and revamped design",
      "cropped moodboard posts with captions",
      "shop categories",
      "orange and yellow tints",
      "ability to hide secret door",
      "star, heart, raindrop backgrounds now animated",
      "new ticket design for homepage title and shop",
      "bigger buttons + expand option for jukebox categories on mobile",
      "shop sign stays pinned on mobile",
    ],
  },
  {
    date: "10.21.26",
    items: [
      "fixed glitch where door covers add button on posts",
      "made footer and bottom elements fixed on screen",
      "new carnival-themed marquee in header",
      "removed cap on leaderboard at 100 mil",
      "new menu scroll animation on homepage",
      "balloons on homescreen, pop to earn yeonbucks",
      "triangle flags to top of homepage",
      "repositioned homepage and made title larger",
    ],
  },
  {
    date: "10.20.26",
    items: [
      "updated the door",
      "updated carousel",
      "revamped prize shop/rare items shop design",
      "changed some titles to shrikhand font",
      "new fortune teller cards",
    ],
  },
  {
    date: "10.19.26",
    items: [
      "new homepage with tap-to-spin carousel",
      "updated mobile music player pop-up",
      "created credits page",
      "asks for leaderboard name on each page -homepage",
    ],
  },
  {
    date: "10.18.26",
    items: [
      "daily login rewards",
      "new locations in secret room",
      "remy updated modes",
      "added reactions + replies on community board",
      "new taps in prize shop (yeonbucks tap, flower petal tap, bubble tap, ghost tap (halloween exclusive)",
      "new y2k cursor in prize shop",
      "updated menu columns",
    ],
  },
];

(function () {
  const list = document.getElementById("updates-list");
  if (!list) return;
  UPDATES.forEach((day) => {
    const box = document.createElement("div");
    box.className = "updates-day";
    const d = document.createElement("p");
    d.className = "updates-date";
    d.textContent = day.date;
    const ul = document.createElement("ul");
    ul.className = "updates-items";
    (day.items || []).forEach((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      ul.appendChild(li);
    });
    box.appendChild(d);
    box.appendChild(ul);
    list.appendChild(box);
  });
})();

(function () {
  const ov = document.getElementById("updates-pop");
  const openBtn = document.getElementById("updates-open");
  const closeBtn = document.getElementById("updates-close");
  if (!ov || !openBtn || !closeBtn) return;
  function open() { ov.hidden = false; closeBtn.focus(); }
  function close() { if (ov.hidden) return; ov.hidden = true; openBtn.focus(); }
  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
})();