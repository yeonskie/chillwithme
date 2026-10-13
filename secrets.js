// ---------- Fairgrounds places: anyone can hide a secret in one of them ----------
// Secrets live in Supabase (see community-config.js and supabase-secrets.sql).
// Everything is anonymous: no names are collected, every secret shows as "anonymous" and in quotes.
// Visitors can read and add, nothing else. You hide or delete secrets in the Supabase dashboard.

(function () {
  const cfg = typeof COMMUNITY !== "undefined" ? COMMUNITY : {};
  const BASE = String(cfg.url || "").trim().replace(/\/+$/, "");
  const KEY = String(cfg.key || "").trim();
  const configured = /^https:\/\/[^\s/]+/i.test(BASE) && KEY.length > 20;

  const PAGE = 30;                         // secrets per load
  const COOLDOWN_MS = 30 * 1000;           // one secret every 30 seconds from the same browser
  const LAST_KEY = "secret-last-post";

  const SUBS = {
    "circus-tent": "step right up. whisper it into the big top.",
    "fun-house": "laugh it off. nobody will know it was you.",
    "house-of-mirrors": "say it to your reflection. we'll keep it.",
    "haunted-house": "leave it with the ghosts. they're good at keeping quiet.",
    "tunnel-of-love": "love me, love me not. tell the tunnel.",
  };

  function headers(extra) {
    const h = { apikey: KEY, ...extra };
    if (/^eyJ/.test(KEY)) h.Authorization = "Bearer " + KEY;
    return h;
  }

  async function api(path, options) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    try {
      const res = await fetch(BASE + path, { ...options, signal: ctl.signal });
      if (!res.ok) throw new Error(String(res.status));
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  function dateText(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return String(d.getMonth() + 1).padStart(2, "0") + "." + String(d.getDate()).padStart(2, "0") + "." + d.getFullYear();
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // ----- one shared pop up that shows a secret in full -----
  let pop = null, popText = null, popMeta = null, popFrom = null;
  function ensurePop() {
    if (pop) return;
    pop = el("div", "mb-add");
    pop.hidden = true;
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-modal", "true");
    const bd = el("div", "mb-add-backdrop");
    const card = el("div", "mb-add-card secret-pop");
    popText = el("p", "secret-pop-text");
    popMeta = el("p", "cm-card-meta");
    const x = el("button", "place-more", "close");
    x.type = "button";
    card.append(popText, popMeta, x);
    pop.append(bd, card);
    (document.getElementById("main") || document.body).appendChild(pop);
    bd.addEventListener("click", closePop);
    x.addEventListener("click", closePop);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !pop.hidden) closePop(); });
    window.addEventListener("hashchange", closePop);
  }
  function showSecret(s) {
    ensurePop();
    popFrom = document.activeElement;
    popText.textContent = "\u201C" + s.body + "\u201D";
    popMeta.textContent = ["anonymous", dateText(s.created_at)].filter(Boolean).join(" \u00b7 ");
    pop.hidden = false;
    pop.querySelector("button").focus();
  }
  function closePop() {
    if (!pop || pop.hidden) return;
    pop.hidden = true;
    if (popFrom && popFrom.focus) popFrom.focus();
  }

  function setup(section) {
    const place = section.dataset.place;
    const title = section.dataset.title;
    let secrets = [], loadedAt = 0, loading = false, statusTimer = null;

    const back = el("a", "place-back", "← back to the fairgrounds");
    back.href = "#confession";
    const h = el("h1", "place-title", title);
    const sub = el("p", "place-sub", SUBS[place] || "");

    const form = el("form", "place-form");
    form.autocomplete = "off";
    const body = el("textarea");
    body.maxLength = 500;
    body.placeholder = "your secret...";
    body.required = true;
    body.setAttribute("aria-label", "your secret");
    const send = el("button", "", "hide it here");
    send.type = "submit";
    form.append(body, send);

    const status = el("p", "place-status");
    status.setAttribute("aria-live", "polite");
    const grid = el("div", "cm-grid");
    const more = el("button", "place-more", "show more");
    more.type = "button";
    more.hidden = true;
    const inner = el("div", "place-inner");
    inner.append(back, h, sub, form, status, grid, more);
    section.append(inner);

    function say(text, keep) {
      status.textContent = text;
      clearTimeout(statusTimer);
      if (!keep && text) statusTimer = setTimeout(() => { status.textContent = ""; }, 6000);
    }

    function card(s) {
      const c = el("article", "cm-card secret-card");
      c.tabIndex = 0;
      c.setAttribute("role", "button");
      c.setAttribute("aria-label", "open this secret");
      const open = () => showSecret(s);
      c.addEventListener("click", open);
      c.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
      const box = el("div", "cm-card-text");
      box.appendChild(el("p", "", "\u201C" + s.body + "\u201D"));      // shown in quotes
      box.appendChild(el("p", "cm-card-meta", ["anonymous", dateText(s.created_at)].filter(Boolean).join(" · ")));
      c.appendChild(box);
      return c;
    }

    function render() {
      grid.innerHTML = "";
      secrets.forEach((s) => grid.appendChild(card(s)));
      if (!secrets.length && !loading && loadedAt) say("no secrets here yet. be the first.", true);
    }

    async function load(append) {
      if (!configured || loading) return;
      loading = true;
      more.hidden = true;
      say("loading...", true);
      try {
        const offset = append ? secrets.length : 0;
        const res = await api(
          "/rest/v1/secrets?select=id,created_at,name,body&approved=eq.true&place=eq." + encodeURIComponent(place) +
          "&order=created_at.desc&limit=" + PAGE + "&offset=" + offset,
          { headers: headers() }
        );
        const rows = (await res.json()).filter((s) => s && typeof s.id === "string");
        secrets = append ? secrets.concat(rows) : rows;
        loadedAt = Date.now();
        loading = false;
        say("", true);
        render();
        more.hidden = rows.length < PAGE;
      } catch (e) {
        loading = false;
        say("couldn't open this place right now. try again in a bit.", true);
        render();
      }
    }

    function onShow() {
      if (location.hash !== "#" + place) return;
      if (!configured) { say("this place isn't set up yet. check back soon.", true); return; }
      if (!loadedAt || Date.now() - loadedAt > 60000) load(false);
    }
    window.addEventListener("hashchange", onShow);
    more.addEventListener("click", () => load(true));
    onShow();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!configured) { say("this place isn't set up yet. check back soon.", true); return; }
      const text = body.value.trim();
      if (!text) { say("write something first.", false); return; }
      let last = 0;
      try { last = Number(localStorage.getItem(LAST_KEY)) || 0; } catch (err) {}
      const wait = COOLDOWN_MS - (Date.now() - last);
      if (wait > 0) { say("give it a moment, then try again (" + Math.ceil(wait / 1000) + "s).", false); return; }
      send.disabled = true;
      say("hiding it...", true);
      try {
        await api("/rest/v1/secrets", {
          method: "POST",
          headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
          body: JSON.stringify({ place, name: "anonymous", body: text.slice(0, 500) }),
        });
        try { localStorage.setItem(LAST_KEY, String(Date.now())); } catch (err) {}
        form.reset();
        say("your secret is hidden.", false);
        loadedAt = 0;
        send.disabled = false;
        load(false);
      } catch (err) {
        send.disabled = false;
        say("couldn't hide it just now. try again in a bit.", false);
      }
    });
  }

  document.querySelectorAll(".page.place").forEach(setup);
})();