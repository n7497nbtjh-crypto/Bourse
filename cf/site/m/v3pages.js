/* ---------- Style v3 « Quotidien » sur toutes les pages (2/11/2026) ----------
   Chaque page à titre classique (h1.pagetitle + .pagesub) reçoit le bandeau jaune de l'accueil et de la fiche : étiquette penchée
   de la rubrique (Apprendre, Marchés, Outils, Mon espace), grand titre, phrase d'introduction. Le fil d'Ariane, s'il existe,
   passe dans le bandeau. Les pages qui ont déjà leur propre bandeau (accueil .a4, fiche .f3, entreprises .e3) ne sont pas touchées.
   Styles : site.css, bloc « Pages v3 ». */
const V3_STK = { dec: ["Apprendre", "a4-bl"], exp: ["Marchés", "a4-pk"], ana: ["Outils", "a4-gr"], esp: ["Mon espace", "a4-wh"] };
function v3Hero() {
  const h = document.querySelector("#app h1.pagetitle");
  if (!h || h.closest(".v3-hero,.a4,.f3,.e3,.no-v3")) return;
  const prev = h.previousElementSibling, stk0 = prev && prev.matches(".a4-stk,.stk,.kick") ? prev : null; // étiquette déjà posée par la page (Mon espace…)
  const cr = (stk0 ? stk0.previousElementSibling : prev) && (stk0 ? stk0.previousElementSibling : prev).matches(".crumbs") ? (stk0 ? stk0.previousElementSibling : prev) : null;
  const sec = document.createElement("section"); sec.className = "v3-hero";
  h.parentNode.insertBefore(sec, cr || stk0 || h);
  if (cr) sec.appendChild(cr);
  if (stk0) sec.appendChild(stk0);
  else if (!cr) { let k = null; try { k = navRubrique(location.pathname); } catch (e) { } const s = V3_STK[k]; if (s) sec.insertAdjacentHTML("beforeend", `<span class="a4-stk ${s[1]}">${s[0]}</span>`); }
  sec.appendChild(h);
  while (sec.nextElementSibling && sec.nextElementSibling.matches(".pagesub,p.lead,.pagesub2")) sec.appendChild(sec.nextElementSibling);
}
(() => { const a = document.getElementById("app"); if (!a) return; let t = 0;
  new MutationObserver(() => { if (t) return; t = requestAnimationFrame(() => { t = 0; try { v3Hero(); } catch (e) { console.error("v3", e); } }); }).observe(a, { childList: true, subtree: true }); })();
