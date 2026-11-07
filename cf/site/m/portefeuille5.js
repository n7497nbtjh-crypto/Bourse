/* ---------- Mon portefeuille v5 (7/11, maquette docs/maquettes/portefeuille-v5.html validée par Romain : « beaucoup d'outils, sûrement trop ») ----------
   Couche chargée après m/portefeuille4.js. Les calculs, la saisie et les tuiles de portefeuille.js / portefeuille4.js restent ;
   cette couche range les onze tuiles du tableau de bord en quatre blocs, et met le reste sous « Plus » :
     1. Ce que vous possédez vraiment   ← pf3-possede, pf3-repartition, pf3-diversification
     2. Points d'attention              ← pf3-alertes, pf3-risque
     3. Vos frais                       ← pf3-frais
     4. Dates à venir et dividendes     ← pf3-dates, pf3-dividendes (7/11, Romain : « mets les dividendes aussi »), pf3prog, pf3-pea
     Plus                               ← pf3-analyse (IA), pf3-partage, export CSV
   Rien n'est retiré du calcul : chaque ancien bloc est déplacé tel quel (ouvert, sans son bandeau), jamais supprimé. */
const PF5_BLOCS = [
  ["possede", "1 · Ce que vous possédez vraiment", ["pf3-possede", "pf3-repartition", "pf3-diversification"]],
  ["attention", "2 · Points d'attention", ["pf3-alertes", "pf3-risque"]],
  ["frais", "3 · Vos frais", ["pf3-frais"]],
  ["dates", "4 · Dates à venir et dividendes", ["pf3-dates", "pf3-dividendes", "pf3prog", "pf3-pea"]],
];
const PF5_PLUS = [["pf3-analyse", "L'analyse écrite de votre portefeuille"], ["pf3-partage", "Partager anonymement"]];
function pf5Ranger() {
  const dash = $("#pf3dash"); if (!dash || !$("#pf3dash>details.pf3pl, #pf3prog>section")) return;
  let grille = $("#pf5"); if (!grille) { grille = document.createElement("div"); grille.id = "pf5"; grille.className = "pf5"; dash.insertAdjacentElement("beforebegin", grille); }
  // Le tableau de bord ou les achats programmés viennent d'être redessinés : les anciens blocs déplacés sont retirés avant de reprendre les neufs
  if ($("#pf3dash>details.pf3pl")) $$("#pf5 details.pf5-in, #pf5-plus details.pf5-plusd").forEach(x => x.remove());
  if ($("#pf3prog>section")) $$("#pf5 section.pf5-in").forEach(x => x.remove());
  const prendre = id => { const d = document.getElementById(id) || (id === "pf3prog" ? $("#pf3prog>section") : null); if (!d) return null;
    if (d.tagName === "DETAILS") { d.open = true; d.classList.add("pf5-in"); const s = d.querySelector(":scope>summary"), h = s && s.querySelector("h2"); if (h && !d.querySelector(":scope>.pf5-h")) d.insertAdjacentHTML("afterbegin", `<h3 class="pf5-h">${esc(h.textContent.trim())}</h3>`); }
    else { d.classList.add("pf5-in"); const h = d.querySelector(".ph h2"); if (h && !d.querySelector(":scope>.pf5-h")) { d.insertAdjacentHTML("afterbegin", `<h3 class="pf5-h">${esc(h.textContent.trim())}</h3>`); const ph = d.querySelector(".ph"); if (ph) ph.classList.add("pf5-ph"); } }
    return d; };
  const nav = $("#pf3nav"); if (nav) nav.hidden = true;
  let n = 0;
  for (const [k, titre, ids] of PF5_BLOCS) {
    let b = $("#pf5-" + k); if (!b) { b = document.createElement("section"); b.id = "pf5-" + k; b.className = "pf5-b"; b.innerHTML = `<p class="pf5-lab">${titre}</p>`; grille.appendChild(b); }
    for (const id of ids) { const d = prendre(id); if (d && d.parentElement !== b) b.appendChild(d); }
    b.hidden = b.children.length <= 1; if (!b.hidden) n++;
  }
  let plus = $("#pf5-plus"); if (!plus) { plus = document.createElement("section"); plus.id = "pf5-plus"; plus.className = "pf5-plus"; plus.innerHTML = `<b>Plus</b>`; dash.insertAdjacentElement("afterend", plus); }
  for (const [id, lab] of PF5_PLUS) { const d = document.getElementById(id); if (!d || d.dataset.pf5) continue; d.dataset.pf5 = "1"; d.open = false; d.classList.add("pf5-plusd");
    const s = d.querySelector(":scope>summary"); if (s) { s.innerHTML = `<span>${esc(lab)}</span>`; } plus.appendChild(d); }
  const exp = $("#pf3exp"); if (exp && !exp.hidden && !$("#pf5-exp")) plus.insertAdjacentHTML("beforeend", `<button type="button" id="pf5-exp" class="pf5-lnk">Exporter en CSV</button>`);
  const e2 = $("#pf5-exp"); if (e2) e2.onclick = () => { const x = $("#pf3exp"); if (x) x.click(); };
  plus.hidden = plus.children.length <= 1;
  if (!n) grille.hidden = true; else grille.hidden = false;
}
if (typeof pf3Dash === "function") { const PF5_dash0 = pf3Dash; pf3Dash = async function () { const r = await PF5_dash0.apply(this, arguments); try { pf5Ranger(); } catch (e) { console.error("pf5", e); } return r; }; }
if (typeof pf3ProgDraw === "function") { const PF5_prog0 = pf3ProgDraw; pf3ProgDraw = function () { const r = PF5_prog0.apply(this, arguments); try { pf5Ranger(); } catch (e) { } return r; }; }
