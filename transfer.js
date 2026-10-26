// ---------- Bringing your save over from the old address (yeonskie.github.io) to the new one (yeonskie.com) ----------
// Everything you earn and own (yeonbucks, items, pets, your leaderboard name...) is saved in your browser, and a browser keeps
// a separate save for every web address. So when the site moved to yeonskie.com it looked brand new. This brings the old save over:
//   1. on a first visit with nothing saved, a little box asks "did you play before?"
//   2. "yes" opens the helper page on the old address (see the transfer-helper folder: it lives in its own repo called
//      yeonskie.github.io), which packs the old save into the link and sends you back here
//   3. this reads it out of the link, shows how much it found, and copies it in when you say yes
// The owner sign-in for the journal and moodboards is NOT copied (just sign in again).
// You can also open  yeonskie.com/?transfer  any time to ask again.

(function () {
  const NEW_HOSTS = ["yeonskie.com", "www.yeonskie.com", "localhost", "127.0.0.1"];   // (localhost is just so it can be tried out)
  const HELPER = "https://yeonskie.github.io/";
  const SKIP = ["journal-session", "transfer-asked"];
  const ASKED = "transfer-asked";
  if (NEW_HOSTS.indexOf(location.hostname) < 0) return;

  // the link back from the helper looks like  yeonskie.com/#import=....  (a # part so it never goes over the network).
  // grab it right now, before the page's own code reads the address, and take it out of the address bar
  let incoming = null;
  const m = /^#import=(.*)$/.exec(location.hash);
  if (m) {
    incoming = m[1];
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  }

  function decode(text) {
    if (text === "none") return {};
    try {
      let b = text.replace(/-/g, "+").replace(/_/g, "/");
      while (b.length % 4) b += "=";
      const bin = atob(b), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const obj = JSON.parse(new TextDecoder().decode(bytes));
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
      const out = {};
      let n = 0;
      Object.keys(obj).forEach((k) => {
        if (n >= 300 || SKIP.indexOf(k) > -1 || k.length > 100 || typeof obj[k] !== "string" || obj[k].length > 300000) return;
        out[k] = obj[k]; n++;
      });
      return out;
    } catch (e) { return null; }
  }

  // (worked out right now, before the rest of the site gets going and saves its own first bits)
  const wasNew = (function () {
    try {
      return !["yeonbucks", "yb-id", "yb-own", "yb-name", "yb-login", "yb-daily", "yb-t", "yb-prog"].some((k) => localStorage.getItem(k) !== null);
    } catch (e) { return false; }
  })();
  function asked() { try { return localStorage.getItem(ASKED) === "1"; } catch (e) { return true; } }
  function markAsked() { try { localStorage.setItem(ASKED, "1"); } catch (e) {} }

  function box(html) {
    const d = document.createElement("div");
    d.className = "xfer";
    d.setAttribute("role", "dialog");
    d.innerHTML = html;
    document.body.appendChild(d);
    return d;
  }

  function ready() {
    if (incoming !== null) {
      const data = decode(incoming);
      const keys = data ? Object.keys(data) : [];
      if (!data) {
        const d = box('<p>that link got scrambled, sorry. try again?</p><div class="xfer-row"><button type="button" class="hy-btn" data-go>try again</button><button type="button" class="hy-btn" data-no>close</button></div>');
        d.querySelector("[data-go]").addEventListener("click", () => { location.href = HELPER + "?go=1"; });
        d.querySelector("[data-no]").addEventListener("click", () => d.remove());
      } else if (!keys.length) {
        const d = box('<p>i looked, but there was nothing saved on the old address in this browser. (it only works in the same browser you played in.)</p><div class="xfer-row"><button type="button" class="hy-btn" data-no>ok</button></div>');
        d.querySelector("[data-no]").addEventListener("click", () => { markAsked(); d.remove(); });
      } else {
        const d = box('<p>found your old save (' + keys.length + ' things: yeonbucks, items, pets and more). bring it over? this replaces what\'s saved here.</p><div class="xfer-row"><button type="button" class="hy-btn" data-yes>bring it over</button><button type="button" class="hy-btn" data-no>no thanks</button></div>');
        d.querySelector("[data-yes]").addEventListener("click", () => {
          try { keys.forEach((k) => localStorage.setItem(k, data[k])); markAsked(); } catch (e) {}
          location.reload();
        });
        d.querySelector("[data-no]").addEventListener("click", () => { markAsked(); d.remove(); });
      }
      return;
    }
    if (/[?&]transfer(=|&|$)/.test(location.search) || (wasNew && !asked())) {
      const d = box('<p>did you play before? i can bring your stuff over from the old address.</p><div class="xfer-row"><button type="button" class="hy-btn" data-go>yes, bring it over</button><button type="button" class="hy-btn" data-no>no, i\'m new</button></div>');
      d.querySelector("[data-go]").addEventListener("click", () => { location.href = HELPER + "?go=1"; });
      d.querySelector("[data-no]").addEventListener("click", () => { markAsked(); d.remove(); });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
})();
