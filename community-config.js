// ---------- Community settings ----------
// The community page stores posts in Supabase (a free hosted database). After you make
// your Supabase project, paste its two public values in here:
//
//   url: the "Project URL"     (Supabase dashboard > Project Settings > API)
//   key: the "anon" or "publishable" key, from the same page
//
// These two are meant to be public. They are safe to put on GitHub because the rules in
// supabase-setup.sql only let visitors read approved posts and send new ones for review.
// NEVER paste a "service_role" or "secret" key in here.
//
// While these are empty, the community page just says it isn't set up yet.

const COMMUNITY = {
  url: "https://ejdrvffdnakjrztwgnhz.supabase.co",
  key: "sb_publishable_s-Du0sVZYAxF7Abb7rQZsw_qhUD4z-G",
};
