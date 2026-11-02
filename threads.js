// ---------- Threads: puts replies in reading order (shared by the community board and the thoughts-to-consume comments) ----------
// Takes the replies (oldest first), each with an id and a parent_id (empty = a reply straight to the post/entry).
// Gives back a flat list: every top-level reply, with everything said under it right below, oldest first.
// It only goes one step in (so it stays readable on a phone): a reply to a reply to a reply just says "replying to name".
//   [{ row, depth: 0 or 1, to: "name" or null }]
window.threadOrder = function (rows) {
  const byId = {};
  rows.forEach((r) => { byId[r.id] = r; });
  const tops = rows.filter((r) => !r.parent_id || !byId[r.parent_id]);          // (a reply whose parent is gone counts as top-level)
  const isTop = new Set(tops.map((r) => r.id));
  const rootOf = (r) => { let cur = r, guard = 0; while (cur.parent_id && byId[cur.parent_id] && guard++ < 50) cur = byId[cur.parent_id]; return cur; };
  const under = {};
  rows.forEach((r) => { if (!isTop.has(r.id)) { const root = rootOf(r); (under[root.id] = under[root.id] || []).push(r); } });
  const out = [];
  tops.forEach((root) => {
    out.push({ row: root, depth: 0, to: null });
    (under[root.id] || []).forEach((r) => {
      const parent = byId[r.parent_id];
      out.push({ row: r, depth: 1, to: parent && parent.id !== root.id ? (parent.name || "someone") : null });   // (replying straight to the top one is obvious, so no label)
    });
  });
  return out;
};
