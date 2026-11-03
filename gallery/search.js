// Search scoring, shared by a collection's own search and the go-to-anything palette: best match first, typos forgiven.

// Optimal string alignment distance, capped: enough to forgive a typo without matching everything.
function typoDistance(a, b, cap = 2) {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev2 = null, prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      let d = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, prev2[j - 2] + 1);
      row.push(d);
      if (d < best) best = d;
    }
    if (best > cap) return cap + 1;
    prev2 = prev;
    prev = row;
  }
  return prev[b.length];
}

// the lowercase fields scoring reads; words is what a typo is measured against
export function searchable({ id, name, tags = [], cat = "", catName = "", desc = "", loop = false, acted = false }) {
  const lname = name.toLowerCase(), ltags = tags.map((t) => t.toLowerCase()), lcat = catName.toLowerCase();
  const words = [...new Set([...lname.split(/[^a-z0-9]+/), ...ltags, cat].filter(Boolean))];
  return { id, lname, names: lname.split(/[^a-z0-9]+/), tags: ltags, cat, catName: lcat, desc: desc.toLowerCase(), loop, acted, words };
}

function termScore(s, term) {
  if (s.lname === term) return 100;
  if (s.names[0] === term) return 90;
  if (s.names[0].startsWith(term)) return 80;
  if (s.names.includes(term)) return 75;
  if (s.names.some((w) => w.startsWith(term))) return 65;
  if (s.tags.includes(term) || s.cat === term || s.catName === term) return 55;
  if (s.tags.some((t) => t.startsWith(term)) || s.catName.startsWith(term)) return 40;
  if (s.lname.includes(term) || s.id.includes(term)) return 30;
  if ((term === "loop" || term === "loops") && s.loop) return 28;
  if ((term === "acted" || term === "act") && s.acted) return 28;
  // a typo in a name or tag says more about what you meant than the same letters somewhere in a description
  if (term.length >= 4) {
    const allowed = term.length >= 7 ? 2 : 1;
    if (s.words.some((w) => typoDistance(term, w, allowed) <= allowed)) return 22;
  }
  return s.desc.includes(term) ? 14 : 0;
}

export function score(s, terms) {
  let total = 0;
  for (const t of terms) {
    const v = termScore(s, t);
    if (!v) return 0;
    total += v;
  }
  return total;
}

export const termsOf = (q) => q.trim().toLowerCase().split(/\s+/).filter(Boolean);
