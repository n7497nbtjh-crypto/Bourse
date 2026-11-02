/* ---------- Comparer v3 (2/11/2026) : le tableau de comparaison devient des cartes par critère, comme « Face aux autres » sur la fiche ----------
   Après cmprRenderBody (m/comparer.js), le bloc « verdict » est recomposé : les constats en jaune, puis six cartes (marge, croissance,
   dette, prix, dividende, taille) avec barres horizontales, mieux placée en vert, moins bien placée en rouge, médiane du secteur de la
   première entreprise en pointillé. Le bouton IA et l'export CSV sont gardés. Styles : site.css, bloc « Comparer v3 ». */
function c3Recomposer(ids) {
  const vp = $("#cmpr-verdict"); if (!vp || vp.dataset.v3 || typeof f3CritCards !== "function") return;
  const L = ids.map(id => RBY[id]).filter(c => c && !c.missing); if (L.length < 2) return;
  const s = L[0], bank = isBank(s), caE = c => (typeof caEur === "function" ? caEur(c) : null) || null;
  const crit = [
    bank ? ["Rentabilité : ce qu'elles gagnent sur 100 € de capitaux propres", c => ratios(c).roe, v => f3Nb(v * 100) + " €", x => f3Med(x, y => ratios(y).roe), "hi", "Le bénéfice net rapporté aux capitaux propres (ROE), la mesure de rentabilité usuelle pour une banque."]
      : ["Marge : ce qu'il leur reste sur 100 € de ventes", c => ratios(c).marge, v => f3Nb(Math.round(v * 100), 0) + " €", x => f3Med(x, y => ratios(y).marge), "hi", "La marge d'exploitation : ce qui reste des ventes une fois payés la fabrication, les salaires, les loyers et la publicité."],
    ["Croissance : l'évolution de leurs ventes sur un an", c => ratios(c).g1, v => f3Pct(v * 100), x => f3Med(x, y => ratios(y).g1), "hi", "La hausse ou la baisse du chiffre d'affaires sur le dernier exercice."],
    bank ? null : ["Dette : en années de résultat", c => c.netDebt != null && c.netDebt < 0 ? 0 : ratios(c).lev, v => v <= 0 ? "aucune" : f3Nb(v, 1) + " an" + (v >= 2 ? "s" : ""), x => f3Med(x, y => y.netDebt != null && y.netDebt < 0 ? 0 : ratios(y).lev), "lo", "La dette nette rapportée au résultat d'exploitation avant amortissements : en combien d'années elle pourrait être remboursée. Zéro : plus de trésorerie que de dettes."],
    ["Prix : combien d'années de bénéfice coûte l'action", f3Pe, v => f3Nb(Math.round(v), 0) + " fois", x => f3Med(x, f3Pe), "lo", "Le PER compare la valeur en Bourse au bénéfice annuel. Plus il est bas, moins l'action est chère au regard de ce qu'elle gagne."],
    ["Dividende : le rendement au cours actuel", f3Yld, v => f3Nb(v * 100, 1) + " %", x => f3Med(x, f3Yld), "hi", "Le dividende annuel rapporté au prix de l'action. Un rendement élevé n'est pas une garantie : le dividende peut être réduit."],
    ["Taille : leurs ventes annuelles, en euros", c => caE(c) > 0 ? caE(c) : null, v => f3Montant(v, "EUR"), null, "hi", "Le chiffre d'affaires du dernier exercice, converti en euros. Une grande entreprise n'est pas forcément la plus rentable."]].filter(Boolean);
  const cards = f3CritCards(crit, L, s, false); if (!cards.length) return;
  const syn = $(".cmpr-syn, .cmpr-ligne", vp), lead = null, lines = syn ? $$("li, span", syn).filter(x => x.closest(".cmpr-syn") || x.parentElement === syn).map(x => x.innerHTML) : [], csv = $("#cmpr-csv, [data-cmpr-csv]", vp), ia = $(".cmpr-ia", vp);
  const w = document.createElement("div"); w.className = "c3";
  w.innerHTML = `<span class="a4-stk a4-bl">Le verdict</span><h2 class="c3-h">${esc(s.name)} contre ${esc(listFr(L.slice(1).map(c => c.name)))}.</h2>
    ${syn ? `<div class="f3-lec c3-lec">${syn.tagName === "OL" || syn.tagName === "UL" ? `<ol>${lines.map(l => `<li>${l}</li>`).join("")}</ol>` : syn.innerHTML}</div>` : ""}
    <div class="f3-cmp c3-cards">${cards.join("")}</div>
    <div class="f3-leg"><span><i class="b"></i>la mieux placée</span><span><i class="w"></i>la moins bien placée</span><span>Trait pointillé : médiane du secteur de ${esc(s.name)} (${esc(secName(s).toLowerCase())}). Pour le prix et la dette, la mieux placée est la plus basse.</span></div>
    <p class="c3-note">Être en tête sur un critère n'est ni une recommandation ni une prédiction : ce sont les derniers comptes publiés, comparés entre eux.</p><div class="c3-acts"></div>`;
  const acts = $(".c3-acts", w); if (ia) acts.appendChild(ia); if (csv) acts.appendChild(csv);
  vp.innerHTML = ""; vp.appendChild(w); vp.dataset.v3 = "1"; vp.classList.add("c3-host");
  const dbl = $("#cmpr-tout"); if (dbl) dbl.remove(); // « Les indicateurs, un par un » redisait les cartes
}
(() => { const r0 = window.cmprRenderBody; if (typeof r0 !== "function") return;
  window.cmprRenderBody = function (ids) { const r = r0.apply(this, arguments); try { c3Recomposer(ids); } catch (e) { console.error("comparer v3", e); } return r; }; })();
