// The gallery's detail sheet says how to import an effect from the main library. These effects live in anime/fx, so
// rewrite the snippet and the source link to point there. Cosmetic only: the player itself is the main gallery's.

const fix = () => {
  const code = document.querySelector("#d-code"), src = document.querySelector("#d-src"), id = document.querySelector("#d-id")?.textContent;
  if (!code || !id) return;
  const fixed = code.textContent.replace(/"pixelfx\/fx\/([^"]+)"/, `"./anime/fx/$1.js"`);
  if (fixed !== code.textContent) code.textContent = fixed; // only when it changes, or the observer would loop
  if (src) src.href = `../fx/${id}.js`;
};
for (const sel of ["#d-code", "#d-id"]) {
  const el = document.querySelector(sel);
  if (el) new MutationObserver(fix).observe(el, { childList: true, characterData: true, subtree: true });
}
