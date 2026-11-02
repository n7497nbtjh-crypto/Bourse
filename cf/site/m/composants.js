// Composants partagés ENKLAIR (lot 1 de la refonte, 2/11/2026).
// Une seule façon de faire chaque chose sur tout le site : fil en étapes, colonnes, points face aux rivales,
// partage, « Ce qui l'explique », carte « en savoir plus », transition, définitions.
// Chaque fonction reçoit des données et rend du HTML ; le style est dans /composants.css (classes ek-, sans !important).
// Maquette validée : docs/maquettes/fiche-hermes-v14.html. Démonstration : docs/maquettes/composants-demo.html.
// Tous les noms globaux commencent par ek (voir bilan-module : jamais de const pour un nom déjà pris).

function ekEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }
function ekMob() { return typeof innerWidth === "number" && innerWidth < 700; }
function ekFr(x, d) { return x == null || !isFinite(x) ? "–" : Number(x).toLocaleString("fr-FR", { minimumFractionDigits: d == null ? 1 : d, maximumFractionDigits: d == null ? 1 : d }); }
var EK_G = "#00A06B", EK_R = "#D92D12";
function ekTx(x, y, t, o) { o = o || {}; return `<text x="${x}" y="${y}" font-family="Inter" font-size="${o.fs || 12}" font-weight="${o.fw || 600}" fill="${o.c || "#777"}" text-anchor="${o.a || "start"}">${t}</text>`; }

// Indice replié sous un graphique (texte déjà échappé ou HTML simple fourni par le site).
function ekIndice(html) { return html ? `<details class="ek-hint"><summary><i>?</i>Indice</summary><p>${html}</p></details>` : ""; }
function ekSource(src) { if (!src) return ""; return `<div class="ek-src"><span>${ekEsc(src.texte || "")}</span>${src.lien ? `<a href="${ekEsc(src.lien)}" target="_blank" rel="noopener">${ekEsc(src.label || "dans le rapport officiel ↗")}</a>` : ""}</div>`; }
function ekBox(o, inner) { return `<div class="ek-box"><div class="ek-bt">${ekEsc(o.titre)}<small>${ekEsc(o.unite || "")}</small></div>${inner}${ekIndice(o.indice)}${ekSource(o.source)}</div>`; }

// Colonnes : axe gradué, valeur exacte, variation sur un an sous chaque année, ligne de contexte facultative.
// o = { titre, unite, annees:[2022…], valeurs:[…], fmt(v), max, graduations:[…], fmtAxe(v), ligne:{ nom, valeurs:[texte…], alerte:index }, indice, source }
function ekColonnes(o) {
  const M = ekMob(), s = o.valeurs, n = s.length, W = M ? 340 : 470, L = M ? 52 : 64, H = 150, T = 26, bw = M ? 34 : 44, gap = (W - L - 6) / n, y = v => T + H - v / o.max * H;
  let g = `<svg viewBox="0 0 ${W} ${T + H + (o.ligne ? 58 : 40)}" role="img" aria-label="${ekEsc(o.titre)}">`;
  o.graduations.forEach(t => g += `<line x1="${L}" x2="${W}" y1="${y(t)}" y2="${y(t)}" stroke="${t ? "#E2E0DA" : "#111"}" stroke-width="${t ? 1 : 2}"/>` + ekTx(L - 8, y(t) + 4, o.fmtAxe(t), { a: "end" }));
  s.forEach((v, i) => {
    if (v == null) return;
    const x = L + gap * i + gap / 2 - bw / 2, der = i === n - 1;
    g += `<rect x="${x}" y="${y(Math.max(v, 0))}" width="${bw}" height="${Math.abs(v) / o.max * H}" rx="8" fill="${der ? "#FFE14D" : "#fff"}" stroke="#111" stroke-width="2"/>`
      + `<text x="${x + bw / 2}" y="${y(Math.max(v, 0)) - 8}" text-anchor="middle" font-family="Bricolage Grotesque,Inter" font-size="${der ? 18 : 16}" font-weight="800">${o.fmt(v)}</text>`
      + ekTx(x + bw / 2, T + H + 18, o.annees[i], { a: "middle", c: "#111", fw: 800, fs: 13 });
    if (i && s[i - 1] > 0) { const c = (v / s[i - 1] - 1) * 100; g += ekTx(x + bw / 2, T + H + 34, (c > 0 ? "+" : "") + ekFr(c) + " %", { a: "middle", c: c >= 0 ? EK_G : EK_R, fw: 800 }); }
    if (o.ligne) g += ekTx(x + bw / 2, T + H + 52, ekEsc(o.ligne.valeurs[i] || ""), { a: "middle", c: o.ligne.alerte === i ? EK_R : "#555", fw: o.ligne.alerte === i ? 800 : 600 });
  });
  g += ekTx(L - 8, T + H + 34, "sur 1 an", { a: "end", c: "#555", fw: 700, fs: 11 });
  if (o.ligne) g += ekTx(L - 8, T + H + 52, ekEsc(o.ligne.nom), { a: "end", c: "#555", fw: 700, fs: 11 });
  return ekBox(o, g + "</svg>");
}

// Points sur une échelle face à la médiane : zone verte du côté « mieux », rouge de l'autre ; l'entreprise de la page en jaune.
// o = { titre, unite, lignes:[{ nom, v, texte, moi }], mediane, mediane_label, basEstMieux, max, graduations, fmtAxe, indice, source }
// Une ligne sans valeur (v null) n'est pas placée : elle est listée sous l'échelle avec sa raison (texte).
function ekPoints(o) {
  const M = ekMob(), W = M ? 380 : 560, L = M ? 88 : 110, R = M ? 60 : 70, T = 28, rh = 34,
    hors = o.lignes.filter(r => r.v == null), rows = o.lignes.filter(r => r.v != null), H = rows.length * rh + 18, x = v => L + (W - L - R) * Math.min(v, o.max) / o.max, m = x(o.mediane), bas = !!o.basEstMieux;
  let g = `<svg viewBox="0 0 ${W} ${T + H + 26}" role="img" aria-label="${ekEsc(o.titre)}">`;
  g += `<rect x="${L}" y="${T - 6}" width="${m - L}" height="${H}" fill="${bas ? "#E2F8EE" : "#FFE9E3"}"/><rect x="${m}" y="${T - 6}" width="${W - R - m}" height="${H}" fill="${bas ? "#FFE9E3" : "#E2F8EE"}"/>`;
  g += ekTx(L + 6, T + H - 12, bas ? (o.motBas || "moins cher") : "moins bien", { fw: 800, c: bas ? EK_G : EK_R, fs: 11 }) + ekTx(W - R - 6, T + H - 12, bas ? (o.motHaut || "plus cher") : "mieux", { a: "end", fw: 800, c: bas ? EK_R : EK_G, fs: 11 });
  o.graduations.forEach(t => g += `<line x1="${x(t)}" x2="${x(t)}" y1="${T - 6}" y2="${T + H - 6}" stroke="#fff" stroke-width="1.5"/>` + ekTx(x(t), T + H + 12, o.fmtAxe(t), { a: "middle" }));
  g += `<line x1="${m}" x2="${m}" y1="${T - 14}" y2="${T + H - 6}" stroke="#111" stroke-width="2" stroke-dasharray="5 4"/><rect x="${m - 52}" y="${T - 30}" width="104" height="18" rx="5" fill="#111"/>` + ekTx(m, T - 17, ekEsc(o.mediane_label), { a: "middle", c: "#fff", fw: 800, fs: 11 });
  rows.forEach((r, i) => {
    const cy = T + i * rh + 10, mieux = bas ? r.v < o.mediane : r.v > o.mediane;
    g += ekTx(L - 12, cy + 4, ekEsc(r.nom), { a: "end", c: "#111", fw: r.moi ? 800 : 600, fs: r.moi ? 14 : 13 });
    g += `<line x1="${L}" x2="${x(r.v)}" y1="${cy}" y2="${cy}" stroke="#111" stroke-opacity=".25" stroke-width="1.5"/><circle cx="${x(r.v)}" cy="${cy}" r="${r.moi ? 9 : 6}" fill="${r.moi ? "#FFE14D" : "#111"}" stroke="#111" stroke-width="2"/>`
      + ekTx(W - R + 12, cy + 4, ekEsc(r.texte), { fw: 800, c: r.v === o.mediane ? "#111" : mieux ? EK_G : EK_R, fs: r.moi ? 14 : 13 });
  });
  g += "</svg>" + hors.map(r => `<p class="ek-out"><b>${ekEsc(r.nom)}</b> n'est pas placée : ${ekEsc(r.texte)}.</p>`).join("");
  return ekBox(o, g);
}

// Partage d'un total en deux parts, avec la médiane des rivales en pointillé.
// o = { titre, unite, part (0-100), partTexte, resteTexte, mediane (0-100), mediane_label, indice, source }
function ekPartage(o) {
  return ekBox(o, `<div class="ek-split"><span style="left:${o.mediane}%"><em>${ekEsc(o.mediane_label)}</em></span><div style="width:${o.part}%">${ekEsc(o.partTexte)}</div><div style="width:${100 - o.part}%">${ekEsc(o.resteTexte)}</div></div><div class="ek-splitl"><span>0 %</span><span>100 %</span></div>`);
}

// « Ce qui l'explique » : des causes numérotées, chacune avec sa preuve, puis « À surveiller ».
// o = { causes:[{ titre, texte, lien:{ href, label } }], surveiller }
function ekExplique(o) {
  return `<div class="ek-why"><p class="ek-wh">Ce qui l'explique</p>${o.causes.map((c, k) => `<div class="ek-cz"><b>${k + 1}</b><strong>${ekEsc(c.titre)}</strong><p>${ekEsc(c.texte)} ${c.lien ? `<a href="${ekEsc(c.lien.href)}">${ekEsc(c.lien.label)}</a>` : ""}</p></div>`).join("")}${o.surveiller ? `<div class="ek-watch"><b>À surveiller</b>${ekEsc(o.surveiller)}</div>` : ""}</div>`;
}

// Carte « en savoir plus » mise en avant (repliée). Un lien vers #id l'ouvre et la montre.
function ekPlus(o) { return `<details class="ek-more" id="${ekEsc(o.id)}"><summary><span class="ek-ic">${ekEsc(o.icone || "+")}</span><span class="ek-tt">${ekEsc(o.titre)}</span><span class="ek-op"></span></summary><div class="ek-in">${o.html}</div></details>`; }
// Petit tableau année par année pour les cartes : lignes = [[libellé, [valeurs déjà formatées]]].
function ekTableau(annees, lignes) { return `<table class="ek-tbl"><tr><th></th>${annees.map(a => `<th>${a}</th>`).join("")}</tr>${lignes.map(([l, v]) => `<tr><td>${ekEsc(l)}</td>${v.map(x => `<td>${ekEsc(x)}</td>`).join("")}</tr>`).join("")}</table>`; }

// Transition vers l'étape suivante : une phrase, pas un bouton.
function ekTransition(t) { return t ? `<div class="ek-trans"><i>↓</i><p><span>${ekEsc(t)}</span></p></div>` : ""; }

// Une étape du fil. o = { id, n, sur, titre, mots:[{ cle, ex, calc }], visuel, explique, plus, suite }
function ekEtape(o) {
  return `<div class="ek-step" id="${ekEsc(o.id)}"><div class="ek-rail"><b>${o.n}</b></div><div class="ek-sc">
  <div class="ek-q">${o.n} · ${ekEsc(o.sur)}</div><h3 class="ek-h">${ekEsc(o.titre)}</h3>
  ${o.mots && o.mots.length ? `<div class="ek-defs">Les mots de l'étape : ${o.mots.map(m => ekDefBouton(m.cle, m)).join("")}</div>` : ""}
  <div class="ek-row">${o.visuel}${o.explique || ""}</div>${o.plus || ""}${ekTransition(o.suite)}</div></div>`;
}
function ekFil(etapes) { return `<div class="ek ek-fil">${etapes.map(ekEtape).join("")}</div>`; }

// ——— Définitions : une seule fenêtre pour tout le site ———
// « En clair » pour débuter ; calcul et lecture pour les confirmés ; l'exemple chiffré est fourni par la page (ex, calc).
var EK_DEF = {
  ventes: { t: "Chiffre d'affaires", aka: "aussi appelé « ventes »", c: "Tout ce que les clients ont payé dans l'année, avant de retirer le moindre coût.", calc: "Somme des ventes de produits et services, hors taxes", lire: "C'est le point de départ de tout le reste. Il dit la taille de l'entreprise, pas si elle gagne de l'argent.", lecon: null },
  croissance: { t: "Croissance des ventes", aka: "variation du chiffre d'affaires sur un an", c: "De combien les ventes ont augmenté, ou baissé, par rapport à l'année d'avant.", calc: "Ventes de l'année ÷ ventes de l'année précédente − 1", lire: "À comparer aux rivales : si tout le secteur recule, une petite hausse est déjà une performance. Elle inclut les effets de change et les rachats d'entreprises." },
  marge: { t: "Marge d'exploitation", aka: "ou marge opérationnelle", c: "Sur 100 € vendus, ce qu'il reste une fois payés la fabrication, les boutiques, les salaires et la publicité.", calc: "Résultat d'exploitation ÷ chiffre d'affaires", lire: "Plus elle est haute, plus le métier est rentable en lui-même. Elle se calcule avant intérêts et impôts : on peut donc comparer une entreprise endettée et une qui ne l'est pas." },
  benefice: { t: "Bénéfice net", aka: "résultat net part du groupe", c: "Ce qu'il reste à la toute fin, une fois payés les coûts, les intérêts et l'impôt.", calc: "Résultat d'exploitation + résultat financier − impôt, part des actionnaires du groupe", lire: "C'est la base du dividende et du PER. Il peut baisser même quand l'activité va bien, par exemple si l'impôt augmente." },
  impot: { t: "Taux d'impôt", aka: "taux d'imposition effectif", c: "La part du résultat que l'entreprise a réellement payée en impôt sur les bénéfices.", calc: "Impôt sur les résultats ÷ résultat avant impôt", lire: "Il dépend des pays où l'entreprise gagne de l'argent et des règles de l'année. Une hausse du taux réduit le bénéfice sans que l'activité change." },
  treso: { t: "Trésorerie nette", aka: "le contraire de la dette nette", c: "L'argent disponible une fois toutes les dettes financières remboursées.", calc: "Trésorerie et placements − emprunts (hors dettes de loyers)", lire: "Positive : l'entreprise a plus d'argent que de dettes et ne dépend pas des banques. Négative : on parle de dette nette, à comparer au résultat annuel." },
  dette: { t: "Dette nette", aka: "", c: "Ce que l'entreprise doit aux banques et aux prêteurs, moins l'argent qu'elle a en caisse.", calc: "Emprunts − trésorerie et placements (hors dettes de loyers)", lire: "On la compare au résultat annuel : moins de 2 années de résultat est courant, au-delà de 3 l'entreprise dépend davantage de ses prêteurs." },
  distrib: { t: "Part du bénéfice versée", aka: "taux de distribution", c: "Sur 100 € de bénéfice, combien l'entreprise donne à ses actionnaires.", calc: "Dividendes versés dans l'année ÷ bénéfice net", lire: "Près de 100 % : presque tout est versé, il reste peu pour investir. Au-delà de 100 %, l'entreprise puise dans ses réserves. Un dividende exceptionnel peut gonfler une année." },
  dpa: { t: "Dividende par action", aka: "DPA", c: "La somme reçue pour chaque action détenue.", calc: "Dividende total décidé ÷ nombre d'actions", lire: "Sa régularité compte autant que son montant : une hausse année après année montre une entreprise sûre de ses résultats." },
  rendement: { t: "Rendement du dividende", aka: "", c: "Ce que rapporte le dividende chaque année, en pourcentage du prix de l'action.", calc: "Dividende par action ÷ cours de l'action", lire: "Il baisse quand l'action est chère, même si le dividende monte. Un rendement très élevé peut annoncer une baisse du dividende : à vérifier." },
  per: { t: "PER", aka: "Price Earnings Ratio, ou « multiple de bénéfice »", c: "Combien d'années du bénéfice actuel il faudrait pour payer l'entreprise au prix de la Bourse.", calc: "Valeur en Bourse ÷ bénéfice net (ou cours ÷ bénéfice par action)", lire: "Élevé : le marché paie cher, car il attend une croissance ou une grande régularité. Bas : il doute, ou l'action est délaissée. Sans sens si le bénéfice est presque nul." },
  capi: { t: "Valeur en Bourse", aka: "capitalisation boursière", c: "Le prix de toute l'entreprise, selon le cours du jour.", calc: "Cours de l'action × nombre d'actions", lire: "Elle change chaque jour avec le cours. Elle ne dit pas si l'action est chère : pour ça, on la compare au bénéfice (PER)." },
  mediane: { t: "Médiane", aka: "", c: "La valeur du milieu : quand on range les entreprises de la meilleure à la moins bonne, la moitié fait mieux, la moitié moins bien.", calc: "Valeur centrale de la liste triée (moyenne des deux du milieu si leur nombre est pair)", lire: "Contrairement à la moyenne, un seul chiffre extrême ne la fausse pas. Sur ENKLAIR, elle est calculée sur les rivales du même métier, sans l'entreprise de la page." },
};
// Pastille cliquable. m = { ex: "41,1 %", calc: "6 569 ÷ 16 002 M€", nom: "Hermès" } (exemple chiffré facultatif).
function ekDefBouton(cle, m) { m = m || {}; const d = EK_DEF[cle]; if (!d) return ""; return `<button type="button" class="ek-def" data-ek-def="${ekEsc(cle)}" data-ek-ex="${ekEsc(m.ex || "")}" data-ek-calc="${ekEsc(m.calc || "")}" data-ek-nom="${ekEsc(m.nom || "")}">${ekEsc(m.texte || d.t)}<i>?</i></button>`; }
// Mot souligné en pointillé dans une phrase, qui ouvre la même fenêtre.
function ekDefMot(cle, texte, m) { m = m || {}; return `<b class="ek-dw" role="button" tabindex="0" data-ek-def="${ekEsc(cle)}" data-ek-ex="${ekEsc(m.ex || "")}" data-ek-calc="${ekEsc(m.calc || "")}" data-ek-nom="${ekEsc(m.nom || "")}">${ekEsc(texte)}</b>`; }
function ekDefOuvrir(cle, ex, calc, nom) {
  const d = EK_DEF[cle]; if (!d) return;
  let w = document.getElementById("ek-dlg");
  if (!w) { w = document.createElement("div"); w.id = "ek-dlg"; w.className = "ek ek-dlg"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true"); document.body.appendChild(w); }
  w.innerHTML = `<div class="ek-dc"><span class="ek-stk">Définition</span><button type="button" class="ek-x" aria-label="Fermer">✕</button><h4>${ekEsc(d.t)}</h4>${d.aka ? `<div class="ek-aka">${ekEsc(d.aka)}</div>` : ""}<p class="ek-clair">${ekEsc(d.c)}</p>
    <dl><dt>Le calcul</dt><dd><code>${ekEsc(d.calc)}</code></dd><dt>Comment le lire</dt><dd>${ekEsc(d.lire)}</dd></dl>
    ${ex || d.lecon ? `<div class="ek-ex">${ex ? `<span>${nom ? "Chez " + ekEsc(nom) : "Exemple"}<br><b>${ekEsc(ex)}</b> <small>${ekEsc(calc || "")}</small></span>` : "<span></span>"}${d.lecon ? `<a class="ek-ls" href="${ekEsc(d.lecon)}">Leçon complète →</a>` : ""}</div>` : ""}</div>`;
  w.classList.add("on"); const x = w.querySelector(".ek-x"); if (x) x.focus();
}
function ekDefFermer() { const w = document.getElementById("ek-dlg"); if (w) w.classList.remove("on"); }
if (typeof document !== "undefined" && !window.ekEcoute) {
  window.ekEcoute = true;
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-ek-def]");
    if (b) { e.preventDefault(); ekDefOuvrir(b.dataset.ekDef, b.dataset.ekEx, b.dataset.ekCalc, b.dataset.ekNom); return; }
    const w = document.getElementById("ek-dlg"); if (w && (e.target === w || (e.target.closest && e.target.closest(".ek-x")))) { ekDefFermer(); return; }
    // Un lien vers une carte « en savoir plus » l'ouvre avant d'y aller.
    const a = e.target.closest && e.target.closest('a[href^="#"]'); if (a) { const d = document.getElementById(a.getAttribute("href").slice(1)); if (d && d.tagName === "DETAILS" && d.classList.contains("ek-more")) { e.preventDefault(); d.open = true; d.scrollIntoView({ behavior: "smooth", block: "center" }); } }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") ekDefFermer();
    if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("ek-dw")) { e.preventDefault(); e.target.click(); }
  });
}
