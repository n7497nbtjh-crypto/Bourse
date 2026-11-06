// Composants partagés ENKLAIR (lot 1 de la refonte, 2/11/2026).
// Une seule façon de faire chaque chose sur tout le site : fil en étapes, colonnes, points face aux rivales,
// partage, « Ce qui l'explique », carte « en savoir plus », transition, définitions.
// Chaque fonction reçoit des données et rend du HTML ; le style est dans /composants.css (classes ek-, sans !important).
// Maquette validée : docs/maquettes/fiche-hermes-v14.html. Démonstration : docs/maquettes/composants-demo.html.
// Tous les noms globaux commencent par ek (voir bilan-module : jamais de const pour un nom déjà pris).

function ekEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }
function ekMob() { return typeof innerWidth === "number" && innerWidth < 700; }
function ekFr(x, d) { if (x == null || !isFinite(x)) return "–"; const t = Number(x).toLocaleString("fr-FR", { minimumFractionDigits: d == null ? 1 : d, maximumFractionDigits: d == null ? 1 : d }); return /^[-−]0([,.]0*)?$/.test(t) ? t.slice(1) : t; } // 4/11 : jamais « -0 »
var EK_G = "#00A06B", EK_R = "#D92D12";
function ekTx(x, y, t, o) { o = o || {}; return `<text x="${x}" y="${y}" font-family="Inter" font-size="${o.fs || 12}" font-weight="${o.fw || 600}" fill="${o.c || "#777"}" text-anchor="${o.a || "start"}">${t}</text>`; }

// Indice replié sous un graphique (texte déjà échappé ou HTML simple fourni par le site).
function ekIndice(html) { return html ? `<details class="ek-hint"><summary><i>?</i>Indice</summary><p>${html}</p></details>` : ""; }
function ekSource(src) { if (!src) return ""; return `<div class="ek-src"><span>${ekEsc(src.texte || "")}</span>${src.lien ? `<a href="${ekEsc(src.lien)}" target="_blank" rel="noopener">${ekEsc(src.label || "dans le rapport officiel ↗")}</a>` : ""}</div>`; }
function ekBox(o, inner) { return `<div class="ek-box"><div class="ek-bt">${ekEsc(o.titre)}<small>${ekEsc(o.unite || "")}</small></div>${inner}${ekIndice(o.indice)}${ekSource(o.source)}</div>`; }

// Colonnes : axe gradué, valeur exacte, variation sur un an sous chaque année, ligne de contexte facultative.
// o = { titre, unite, annees:[2022…], valeurs:[…], fmt(v), max, graduations:[…], fmtAxe(v), ligne:{ nom, valeurs:[texte…], alerte:index }, indice, source }
function ekColonnes(o) {
  // Accepte les valeurs négatives (pertes) : l'axe descend sous zéro, la valeur s'écrit sous la barre, les années restent en bas du graphique.
  const M = ekMob(), s = o.valeurs, n = s.length, W = M ? 340 : 500, L = o.ligne ? (M ? 80 : 84) : (M ? 64 : 68), T = 26, bw = M ? 30 : 36, gap = (W - L - 6) / n;
  const vals = s.filter(v => v != null), bas0 = Math.min(0, ...vals), pas = o.pas || (o.graduations.length > 1 ? o.graduations[1] - o.graduations[0] : o.max) || 1;
  const mn = bas0 < 0 ? -Math.ceil(-bas0 * 1.15 / pas) * pas : 0, top = Math.max(o.max, mn < 0 ? 0 : o.max), grads = o.graduations.slice();
  for (let t = -pas; t >= mn - 1e-9; t -= pas) grads.unshift(+t.toFixed(10));
  const Hp = M ? 120 : 105, H = mn < 0 ? Math.round(Hp * Math.min(1.8, Math.max(1, (o.max - mn) / Math.max(o.max, pas)))) : Hp, Bm = mn < 0 ? 22 : 0;
  const y = v => T + (o.max - v) / (o.max - mn) * H, yb = T + H + Bm;
  let g = `<svg viewBox="0 0 ${W} ${yb + (o.ligne ? 58 : o.sansVar ? 26 : 40)}" role="img" aria-label="${ekEsc(o.titre)}">`;
  grads.forEach(t => g += `<line x1="${L}" x2="${W}" y1="${y(t)}" y2="${y(t)}" stroke="${t ? "#E2E0DA" : "#111"}" stroke-width="${t ? 1 : 2}"/>` + ekTx(L - 8, y(t) + 4, o.fmtAxe(t), { a: "end" }));
  s.forEach((v, i) => {
    const x = L + gap * i + gap / 2 - bw / 2, der = i === n - 1;
    g += ekTx(x + bw / 2, yb + 18, o.annees[i], { a: "middle", c: "#111", fw: 800, fs: 13 });
    if (o.ligne) g += ekTx(x + bw / 2, yb + 52, ekEsc(o.ligne.valeurs[i] || ""), { a: "middle", c: o.ligne.alerte === i ? EK_R : "#555", fw: o.ligne.alerte === i ? 800 : 600 });
    if (v == null) return;
    const neg = v < 0, h = Math.max(2, Math.abs(v) / (o.max - mn) * H);
    g += `<rect x="${x}" y="${neg ? y(0) : y(v)}" width="${bw}" height="${h}" rx="8" fill="${neg ? "#FFDCD3" : der ? "#FFE14D" : "#fff"}" stroke="${neg ? EK_R : "#111"}" stroke-width="2"/>`
      + `<text x="${x + bw / 2}" y="${neg ? y(v) + 18 : y(v) - 8}" text-anchor="middle" font-family="Bricolage Grotesque,Inter" font-size="${der ? 18 : 16}" font-weight="800" fill="${neg ? EK_R : "#111"}">${o.fmt(v)}</text>`;
    if (o.sansVar) return; // valeurs déjà en variation (performances annuelles) : pas de ligne « variation »
    // 6/11 (Ericsson : « +142 040 % ») : au-delà de ×4, la variation se dit en « × N » ; depuis un chiffre quasi nul, on écrit seulement « bénéfice »
    if (i && s[i - 1] > 0) { const c = (v / s[i - 1] - 1) * 100, r = v / s[i - 1], txt = neg ? "perte" : r >= 50 ? "bénéfice" : r >= 5 ? "× " + ekFr(r, 0) : (c > 0 ? "+" : "") + ekFr(c) + " %"; g += ekTx(x + bw / 2, yb + 34, txt, { a: "middle", c: c >= 0 ? EK_G : EK_R, fw: 800 }); }
    else if (i && s[i - 1] != null && s[i - 1] < 0) g += ekTx(x + bw / 2, yb + 34, neg ? "perte" : "bénéfice", { a: "middle", c: neg ? EK_R : EK_G, fw: 800 });
  });
  if (!o.sansVar) g += ekTx(L - 8, yb + 34, "variation", { a: "end", c: "#555", fw: 700, fs: 11 });
  if (o.ligne) g += ekTx(L - 8, yb + 52, ekEsc(o.ligne.nom), { a: "end", c: "#555", fw: 700, fs: 11 });
  return ekBox(o, g + "</svg>");
}

// Points sur une échelle face à la médiane : zone verte du côté « mieux », rouge de l'autre ; l'entreprise de la page en jaune.
// o = { titre, unite, lignes:[{ nom, v, texte, moi }], mediane, mediane_label, basEstMieux, max, graduations, fmtAxe, indice, source }
// Une ligne sans valeur (v null) n'est pas placée : elle est listée sous l'échelle avec sa raison (texte).
function ekPoints(o) {
  const M = ekMob(), W = M ? 380 : 560, R = Math.max(M ? 60 : 70, 30 + Math.max(0, ...o.lignes.filter(r => r.v != null).map(r => String(r.texte || "").length * 7.6))), T = 34, lg = Math.max(0, ...o.lignes.filter(r => r.v != null).map(r => String(r.nom).length * (r.moi ? 8.2 : 7.4))), lw = Math.max(0, ...o.lignes.filter(r => r.v != null).flatMap(r => String(r.nom).split(/[\s-]+/).map(m => m.length * (r.moi ? 8.8 : 7.9)))), L = Math.round(Math.max(Math.min(W * 0.4, Math.max(M ? 88 : 110, lg + 18)), Math.min(W * 0.5, lw + 22))), coupe = (t, moi) => { t = String(t); const k = moi ? 9 : 7.8, mx = Math.floor((L - 18) / k); return t.length * k + 18 > L ? t.slice(0, mx - 1).trim() + "…" : t; },
    lignesNom = r => { const k = r.moi ? 8.8 : 7.9, mx = Math.max(6, Math.floor((L - 18) / k)), w = []; [...String(r.nom).matchAll(/(\s*)([^\s-]+-?)/g)].forEach(([, sp, m]) => { const d = w.length - 1, j = (sp ? " " : "") + m; if (d >= 0 && (w[d] + j).length <= mx) w[d] += j; else w.push(m); });
      return (w.length <= 5 ? w : [...w.slice(0, 4), w.slice(4).join(" ")]).map(t => t.length > mx ? t.slice(0, mx - 1).trim() + "…" : t); },
    rh = 34 + 15 * (Math.max(1, ...o.lignes.filter(r => r.v != null).map(r => lignesNom(r).length)) - 1),
    hors = o.lignes.filter(r => r.v == null), rows = o.lignes.filter(r => r.v != null), H = Math.max(rows.length * rh + 30, 3 * rh + 12), mn0 = o.min || 0, x = v => L + (W - L - R) * (Math.max(mn0, Math.min(v, o.max)) - mn0) / (o.max - mn0), m = x(o.mediane), bas = !!o.basEstMieux;
  if (!rows.length) return ekBox(o, hors.map(r => `<p class="ek-out"><b>${ekEsc(r.nom)}</b> n'est pas placée : ${ekEsc(r.texte)}.</p>`).join(""));
  let g = `<svg viewBox="0 0 ${W} ${T + H + 26}" role="img" aria-label="${ekEsc(o.titre)}">`;
  const neu = !!o.neutre, zB = neu ? "#F1F1EE" : bas ? "#E2F8EE" : "#FFE9E3", zH = neu ? "#F1F1EE" : bas ? "#FFE9E3" : "#E2F8EE", cB = neu ? "#555" : bas ? EK_G : EK_R, cH = neu ? "#555" : bas ? EK_R : EK_G; // neutre (4/11) : PER, aucune zone verte ou rouge
  g += `<rect x="${L}" y="${T - 6}" width="${m - L}" height="${H}" fill="${zB}"/><rect x="${m}" y="${T - 6}" width="${W - R - m}" height="${H}" fill="${zH}"/>`;
  if (m - L >= 84) g += ekTx(L + 6, T + H - 12, o.motBas || (bas ? "plus bas" : "moins bien"), { fw: 800, c: cB, fs: 11 });
  if (W - R - m >= 84) g += ekTx(W - R - 6, T + H - 12, o.motHaut || (bas ? "plus haut" : "mieux"), { a: "end", fw: 800, c: cH, fs: 11 });
  // 5/11 (PDD sur téléphone : « 5 CNY / 10 CNY » superposés) : une graduation sur deux (ou trois) quand les étiquettes n'ont pas la place
  const gl = o.graduations.map(t => String(o.fmtAxe(t))), ecartG = o.graduations.length > 1 ? Math.abs(x(o.graduations[1]) - x(o.graduations[0])) : 1e9, saut = Math.max(1, Math.ceil((Math.max(...gl.map(v => v.length)) * 6.6 + 8) / ecartG));
  const i0 = Math.max(0, o.graduations.findIndex(t => Math.abs(t) < 1e-9)); // 6/11 : une graduation sur deux en partant de zéro (0 toujours écrit)
  o.graduations.forEach((t, i) => g += `<line x1="${x(t)}" x2="${x(t)}" y1="${T - 6}" y2="${T + H - 6}" stroke="#fff" stroke-width="1.5"/>` + ((i - i0) % saut ? "" : ekTx(x(t), T + H + 12, gl[i], { a: "middle" })));
  g += `<line x1="${m}" x2="${m}" y1="${T - 14}" y2="${T + H - 6}" stroke="#111" stroke-width="2" stroke-dasharray="5 4"/><rect x="${m - 52}" y="${T - 30}" width="104" height="18" rx="5" fill="#111"/>` + ekTx(m, T - 17, ekEsc(o.mediane_label), { a: "middle", c: "#fff", fw: 800, fs: 11 });
  rows.forEach((r, i) => {
    const cy = T + i * rh + rh / 2 - 7, mieux = bas ? r.v < o.mediane : r.v > o.mediane;
    // Nom trop long : sur deux ou trois lignes plutôt que coupé (3/11) ; « … » seulement au-delà
    const l2 = lignesNom(r), st = { a: "end", c: "#111", fw: r.moi ? 800 : 600, fs: l2.length > 1 ? (r.moi ? 13 : 12) : (r.moi ? 14 : 13) };
    l2.forEach((t, j) => g += ekTx(L - 12, cy + 4 + (j - (l2.length - 1) / 2) * 15, ekEsc(t), st));
    // Valeur hors échelle : le point est posé au bout de l'axe avec une flèche, et une note sous le graphique doit dire le vrai chiffre (r.note)
    const hx = r.v > o.max, lx = r.v < mn0, col = r.ton === "r" ? EK_R : r.ton === "g" ? EK_G : r.ton === "n" || neu ? "#111" : Math.abs(r.v - o.mediane) <= Math.abs(o.mediane) * 0.05 ? "#111" : mieux ? EK_G : EK_R;
    g += `<line x1="${L}" x2="${x(r.v)}" y1="${cy}" y2="${cy}" stroke="#111" stroke-opacity=".25" stroke-width="1.5"/>${hx ? `<path d="M${x(r.v) + 8} ${cy - 6} L${x(r.v) + 16} ${cy} L${x(r.v) + 8} ${cy + 6} Z" fill="${col}"/>` : ""}${lx ? `<path d="M${x(r.v) + 9} ${cy - 6} L${x(r.v) + 2} ${cy} L${x(r.v) + 9} ${cy + 6} Z" fill="${col}"/>` : ""}<circle cx="${x(r.v) + (lx ? 22 : 0)}" cy="${cy}" r="${r.moi ? 9 : 6}" fill="${r.moi ? "#FFE14D" : "#111"}" stroke="#111" stroke-width="2"${hx ? ` data-hors="${ekEsc(r.nom)}"` : ""}/>`
      + ekTx(W - R + 20, cy + 4, ekEsc(r.texte), { fw: 800, c: col, fs: r.moi ? 14 : 13 });
  });
  g += "</svg>" + rows.filter(r => r.note).map(r => `<p class="ek-out ek-out-h"><b>${ekEsc(r.nom)}</b> ${ekEsc(r.note)}</p>`).join("") + hors.map(r => `<p class="ek-out"><b>${ekEsc(r.nom)}</b> n'est pas placée : ${ekEsc(r.texte)}.</p>`).join("");
  return ekBox(o, g);
}

// Partage « sur 100 € » : une seule barre en deux blocs dont la largeur suit la part, la comparaison aux rivales en une ligne.
// o = { titre, unite, verse (0-100), verseTexte, garde (0-100), gardeTexte, comparaison (HTML court), indice, source }
function ekPartage(o) {
  // Barre sur 100 : la part versée colorée (ton g / r), la médiane en trait sur la barre, les deux montants dessous.
  const v = Math.max(0, Math.min(100, o.verse)), g = Math.max(0, 100 - v), m = o.mediane != null ? Math.max(0, Math.min(100, o.mediane)) : null;
  const al = m == null ? "" : m < 32 ? " d" : m > 68 ? " f" : "";
  return ekBox(o, `<div class="ek-cbar${m != null ? " ek-cbar-m" : ""}"><i class="${o.ton === "r" ? "r" : o.ton === "n" ? "n" : "g"}" style="width:${v}%"></i>${m != null ? `<em class="${al.trim()}" style="left:${m}%"><span>${ekEsc(o.medianeLabel || "médiane")}</span></em>` : ""}</div>
<div class="ek-cleg">${v > 0 ? `<div class="v ${o.ton === "r" ? "r" : o.ton === "n" ? "n" : "g"}"><b>${ekEsc(o.verseValeur)}</b><span>${ekEsc(o.verseTexte)}</span></div>` : ""}${g > 0 ? `<div><b>${ekEsc(o.gardeValeur)}</b><span>${ekEsc(o.gardeTexte)}</span></div>` : ""}</div>${o.comparaison ? `<p class="ek-cmpl">${o.comparaison}</p>` : ""}`);
}

// « Ce qui l'explique » : des causes numérotées, chacune avec sa preuve, puis « À surveiller ».
// o = { causes:[{ titre, texte, lien:{ href, label } }], surveiller }
function ekExplique(o) {
  return `<div class="ek-why"><p class="ek-wh">Ce qui l'explique</p>${o.causes.map((c, k) => `<div class="ek-cz"><b>${k + 1}</b><strong>${ekEsc(c.titre)}</strong><p>${ekEsc(c.texte)} ${c.lien ? `<a href="${ekEsc(c.lien.href)}">${ekEsc(c.lien.label)}</a>` : ""}</p></div>`).join("")}${o.surveiller ? `<div class="ek-watch"><b>À surveiller</b>${ekEsc(o.surveiller)}</div>` : ""}</div>`;
}

// Carte « en savoir plus » mise en avant (repliée). Un lien vers #id l'ouvre et la montre.
function ekPlus(o) { return `<details class="ek-more" id="${ekEsc(o.id)}"><summary><span class="ek-ic">${ekEsc(o.icone || "+")}</span><span class="ek-tt">${ekEsc(o.titre)}</span><span class="ek-op"></span></summary><div class="ek-in scroll-x">${o.html}</div></details>`; }
// Petit tableau année par année pour les cartes : lignes = [[libellé, [valeurs déjà formatées]]].
function ekTableau(annees, lignes) { return `<table class="ek-tbl"><tr><th></th>${annees.map(a => `<th>${a}</th>`).join("")}</tr>${lignes.map(([l, v]) => v == null ? `<tr class="ek-grp"><th colspan="${annees.length + 1}">${ekEsc(l)}</th></tr>` : `<tr><td>${ekEsc(l)}</td>${v.map(x => `<td>${ekEsc(x)}</td>`).join("")}</tr>`).join("")}</table>`; }

// Transition vers l'étape suivante : une phrase, pas un bouton.
function ekTransition(t) { return t ? `<div class="ek-trans"><i>↓</i><p><span>${ekEsc(t)}</span></p></div>` : ""; }

// Une étape du fil. o = { id, n, sur, titre, mots:[{ cle, ex, calc }], visuel, explique, plus, suite, haut (visuel court : pas d'étirement) }
function ekEtape(o) {
  // o.concept = { cle, texte, ex, calc, nom } : le terme exact en tête du titre, cliquable. o.cmp = { texte, ton: g | r | n } : pastille de comparaison.
  const c = o.concept, d = c && EK_DEF[c.cle];
  const tete = d ? `<span class="ek-hc" role="button" tabindex="0" data-ek-def="${ekEsc(c.cle)}" data-ek-ex="${ekEsc(c.ex || "")}" data-ek-calc="${ekEsc(c.calc || "")}" data-ek-nom="${ekEsc(c.nom || "")}">${ekEsc(c.texte || d.t)}<i>?</i></span> : ` : "";
  const cmp = o.cmp && o.cmp.texte ? `<p class="ek-cmp ${o.cmp.ton || "n"}">${/^(Comme|Même)/.test(o.cmp.texte) ? "" : o.cmp.ton === "g" ? "▲ " : o.cmp.ton === "r" ? "▼ " : ""}${ekEsc(o.cmp.texte)}</p>` : "";
  const mots = (o.mots || []).filter(m => !c || m.cle !== c.cle);
  const titre = d ? o.titre : String(o.titre || "").replace(/^./, x => x.toUpperCase());
  const cote = o.visuel && (o.explique || o.suite); // la question suivante va toujours dans la colonne de droite, sous l'explication
  const droite = cote ? `<div class="ek-side${o.explique ? "" : " ek-side-seul"}">${o.explique || ""}${ekTransition(o.suite)}</div>` : (o.explique || "");
  return `<div class="ek-step" id="${ekEsc(o.id)}"><div class="ek-rail"><b>${o.n}</b></div><div class="ek-sc">
  <div class="ek-q">${o.n} · ${ekEsc(o.sur)}</div><h3 class="ek-h">${tete}${ekEsc(titre)}</h3>${cmp}
  ${mots.length ? `<div class="ek-defs">${c ? "Autre mot" + (mots.length > 1 ? "s" : "") : "Les mots de l'étape"} : ${mots.map(m => ekDefBouton(m.cle, m)).join("")}</div>` : ""}
  ${o.visuel || o.explique ? `<div class="ek-row${o.haut ? " ek-row-top" : ""}${o.visuel && !cote ? " ek-row-1" : ""}">${o.visuel ? `<div class="ek-main">${o.visuel}</div>` : ""}${droite}</div>` : ""}${o.plus || ""}${cote ? "" : ekTransition(o.suite)}</div></div>`;
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
  rendement: { t: "Rendement du dividende", aka: "", c: "Ce que rapporte le dividende chaque année, en pourcentage du prix de l'action.", calc: "Dividende par action ÷ cours de l'action", lire: "Il baisse quand le cours monte, même si le dividende monte. Un rendement très élevé peut annoncer une baisse du dividende : à vérifier." },
  per: { t: "PER", aka: "Price Earnings Ratio, ou « multiple de bénéfice »", c: "Combien d'années du bénéfice actuel il faudrait pour payer l'entreprise au prix de la Bourse.", calc: "Valeur en Bourse ÷ bénéfice net (ou cours ÷ bénéfice par action)", lire: "Un PER élevé veut dire que les investisseurs paient beaucoup parce qu'ils croient à la suite (croissance, régularité des bénéfices) : le marché y croit. Un PER bas veut dire qu'ils paient peu parce qu'ils doutent de la suite, ou que l'action est délaissée : le marché doute. Sans sens si le bénéfice est presque nul." },
  capi: { t: "Valeur en Bourse", aka: "capitalisation boursière", c: "Le prix de toute l'entreprise, selon le cours du jour.", calc: "Cours de l'action × nombre d'actions", lire: "Elle change chaque jour avec le cours. Elle ne dit pas si l'action est chère : pour ça, on la compare au bénéfice (PER)." },
  roe: { t: "Rentabilité des capitaux propres", aka: "ROE (Return on Equity)", c: "Sur 100 € apportés et laissés par les actionnaires, combien l'entreprise gagne en un an.", calc: "Bénéfice net ÷ capitaux propres", lire: "C'est la mesure de référence pour une banque ou un assureur, dont les « ventes » ne se comparent pas à celles d'une industrie. Au-dessus de 10 %, une banque européenne rapporte plus que son coût du capital habituel." },
  diversification: { t: "Diversification", c: "Répartir son argent sur beaucoup de titres pour qu'aucun ne pèse trop.", calc: "Nombre de lignes du fonds et poids des plus grosses", lire: "Plus il y a de lignes, et moins les premières pèsent, plus le risque propre à une entreprise est dilué." },
  change: { t: "Risque de change", c: "Quand l'ETF détient des titres en dollars ou en yens, sa valeur en euros bouge aussi avec le cours de ces devises.", calc: "Part du fonds investie hors de la zone euro", lire: "Sur le long terme, l'effet est souvent faible, mais il peut être fort sur une année. Une part « couverte » neutralise le change, contre un coût." },
  perf: { t: "Performance", aka: "dividendes réinvestis", c: "De combien la valeur d'une part a monté ou baissé sur la période, dividendes compris et frais déjà déduits.", calc: "Valeur liquidative en fin de période ÷ valeur en début de période − 1", lire: "Elle dépend d'abord de l'indice suivi : entre ETF du même indice, l'écart vient surtout des frais. Les performances passées ne préjugent pas des performances futures." },
  baisse: { t: "Pire baisse", aka: "perte maximale", c: "La plus forte chute de la part entre un plus haut et le plus bas qui a suivi.", calc: "Plus bas ÷ plus haut précédent − 1, sur la période", lire: "Elle montre ce qu'il fallait pouvoir supporter sans vendre. Les actions peuvent perdre 30 % ou plus en quelques mois." },
  ter: { t: "Frais courants", aka: "TER (Total Expense Ratio)", c: "Ce que le fonds prélève chaque année, directement dans sa valeur : vous ne le payez pas à part.", calc: "Frais annuels du fonds ÷ encours du fonds", lire: "À comparer entre ETF du même indice : c'est l'écart le plus sûr d'une année sur l'autre. Les frais de courtage s'y ajoutent." },
  swap: { t: "Réplication synthétique", aka: "ou par swap", c: "L'ETF ne détient pas les titres de l'indice : un contrat avec une banque lui verse la performance de l'indice.", calc: "Contrat d'échange (swap) avec une contrepartie", lire: "En France, permet de loger des indices étrangers dans un PEA. La réglementation européenne limite l'exposition à la banque à 10 % du fonds." },
  physique: { t: "Réplication physique", c: "L'ETF achète réellement les titres de l'indice, dans les mêmes proportions (ou un échantillon représentatif).", calc: "Titres détenus par le fonds, conservés par une banque dépositaire", lire: "Le plus simple à comprendre : ce que vous voyez dans la composition est ce que le fonds possède." },
  capitalisant: { t: "ETF capitalisant", c: "Les dividendes des entreprises sont réinvestis dans le fonds au lieu de vous être versés.", calc: "Politique de distribution du fonds", lire: "Pratique pour faire grossir un placement sans rien déclarer chaque année ; un ETF « distribuant » vous verse les dividendes." },
  distribuant: { t: "ETF distribuant", c: "Les dividendes reçus par le fonds vous sont versés en argent, en général une à quatre fois par an.", calc: "Politique de distribution du fonds", lire: "Utile pour un revenu régulier. En général, ces versements sont imposés l'année où vous les recevez." },
  detachement: { t: "Détachement du dividende", aka: "ex-date", c: "Le jour où le dividende « se détache » de l'action : à partir de ce jour, un nouvel acheteur ne le touchera pas.", calc: "Pour le recevoir : détenir l'action à la clôture de la veille ouvrée", lire: "Ce jour-là, le cours baisse mécaniquement d'environ le montant du dividende. Le versement arrive quelques jours ou semaines plus tard." },
  brutnet: { t: "Dividende brut et net", c: "Le brut est ce que l'entreprise verse ; le net est ce qui vous reste une fois les impôts prélevés.", calc: "Net = brut − retenue à la source étrangère − impôt et prélèvements de votre pays", lire: "En France, dans un PEA, rien n'est prélevé tant que l'argent reste dans le plan ; sur un compte-titres, le prélèvement forfaitaire s'applique chaque année." },
  interets: { t: "Intérêts composés", aka: "", c: "Les gains d'une année rapportent à leur tour l'année suivante : la somme grossit de plus en plus vite avec le temps.", calc: "Valeur après n années = somme placée × (1 + rendement)^n", lire: "C'est pourquoi la durée compte autant que le montant. Les frais se composent de la même façon, dans l'autre sens." },
  scenario: { t: "Scénario tiré de l'histoire", aka: "", c: "Le rendement réellement obtenu par un placement sur toutes les périodes de même durée du passé : la pire, la médiane, la meilleure.", calc: "Rendement annuel moyen de chaque période glissante de N années de l'indice", lire: "Ce n'est pas une prévision : l'avenir peut faire mieux ou pire que tout ce qui a déjà été vu." },
  courtage: { t: "Frais de courtage", aka: "", c: "Ce que le courtier prend à chaque achat ou vente.", calc: "Frais fixes par ordre, ou pourcentage du montant, selon la grille du courtier", lire: "Un frais fixe pèse lourd sur les petits achats : 1 € représente 1 % d'un achat de 100 €." },
  pea: { t: "PEA", aka: "Plan d'épargne en actions", c: "Un compte français pour les actions européennes et les fonds éligibles. Après 5 ans, les gains ne paient que les prélèvements sociaux.", calc: "Versements plafonnés à 150 000 € ; impôt au retrait : 18,6 % après 5 ans (2026), 31,4 % avant", lire: "Réservé aux personnes domiciliées en France. Un retrait avant 5 ans ferme en principe le plan." },
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

// La question de l'étape suivante se met là où il reste de la place : à droite si l'explication est plus courte que le graphique, sinon sous le graphique.
function ekPlacer(root) {
  if (ekMob()) return;
  (root || document).querySelectorAll(".ek-step .ek-row").forEach(row => {
    const main = row.querySelector(".ek-main"), side = row.querySelector(".ek-side"); if (!main || !side) return;
    const tr = row.querySelector(".ek-trans"); if (!tr) return;
    side.appendChild(tr); side.classList.toggle("ek-side-seul", !side.querySelector(".ek-why, .cx-ev"));
    const hs = side.getBoundingClientRect().height, hm = main.getBoundingClientRect().height;
    if (hs > hm + 16 && side.children.length > 1) { main.appendChild(tr); side.classList.remove("ek-side-seul"); }
  });
}
if (typeof window !== "undefined") {
  let ekT; const ekGo = () => { clearTimeout(ekT); ekT = setTimeout(() => ekPlacer(), 60); };
  window.addEventListener("resize", ekGo);
  new MutationObserver(m => { if (m.some(r => [...r.addedNodes].some(n => n.nodeType === 1 && (n.matches(".ek-step, .ek-fil") || n.querySelector && n.querySelector(".ek-step"))))) ekGo(); }).observe(document.documentElement, { childList: true, subtree: true });
}
