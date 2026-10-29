/* Module « orchestre » de bilan. : chargé après le script principal de index.html.
   Les fonctions déclarées ici remplacent celles du même nom (déclarations function, jamais const/let pour un nom existant).
   Contenu : indices cliquables et pages d'indice, bloc ETF de l'accueil, bandeau de confiance. */

/* ---------- Indices : fiches et ETF qui les répliquent ---------- */
// Faits stables sur chaque indice (méthode publiée par le fournisseur de l'indice).
const ORC_IDX = {
  cac40: { etf: /^CAC 40/i, pays: c => c.region === "FR", n: 40, place: "Euronext Paris", fournisseur: "Euronext",
    regle: "Chaque entreprise pèse selon sa valeur en Bourse, en ne comptant que les actions réellement échangées (le flottant), avec un plafond de 15 % par entreprise.",
    histoire: "Calculé depuis 1987, sur une base de 1 000 points au 31 décembre 1987.",
    nuance: "C'est un indice de prix : les dividendes versés ne sont pas réinvestis dans le calcul. Avec les dividendes (le CAC 40 GR), la performance sur longue période est nettement plus élevée." },
  stoxx50: { etf: /^Euro Stoxx 50/i, pays: c => ["FR", "DE", "NL", "IT", "ES", "BE", "FI", "IE", "AT", "PT"].includes((c.isin || "").slice(0, 2)), n: 50, place: "les Bourses de la zone euro", fournisseur: "STOXX",
    regle: "Les 50 plus grandes entreprises de la zone euro, pondérées par leur valeur en Bourse (flottant), avec un plafond de 10 % par entreprise.",
    histoire: "Lancé en 1998.",
    nuance: "Il ne contient que des entreprises de la zone euro : pas de sociétés suisses ni britanniques." },
  dax: { etf: /^DAX/i, pays: c => (c.isin || "").startsWith("DE"), n: 40, place: "la Bourse de Francfort", fournisseur: "Deutsche Börse (STOXX)",
    regle: "Les 40 plus grandes entreprises allemandes, pondérées par leur valeur en Bourse (flottant). Il est passé de 30 à 40 entreprises en septembre 2021.",
    histoire: "Calculé depuis 1988, sur une base de 1 000 points.",
    nuance: "Contrairement au CAC 40, le DAX réinvestit les dividendes dans son calcul : comparer directement leurs courbes avantage le DAX." },
  sp500: { etf: /^S&P 500$/i, pays: c => c.region === "US", n: 500, place: "les Bourses américaines (NYSE et Nasdaq)", fournisseur: "S&P Dow Jones Indices",
    regle: "Environ 500 grandes entreprises américaines choisies par un comité, pondérées par leur valeur en Bourse (flottant). Les plus grosses entreprises technologiques y pèsent lourd.",
    histoire: "Publié sous sa forme actuelle depuis 1957.",
    nuance: "Coté en dollars : pour un épargnant en euros, la variation du dollar s'ajoute ou se retranche à celle de l'indice." },
  nasdaq100: { etf: /^Nasdaq.?100/i, pays: c => c.region === "US" && c.sector === "tech", n: 100, place: "le Nasdaq", fournisseur: "Nasdaq",
    regle: "Les 100 plus grandes entreprises non financières cotées au Nasdaq, pondérées par leur valeur en Bourse avec des plafonds. Très concentré sur la technologie.",
    histoire: "Créé en 1985.",
    nuance: "Plus concentré et plus volatil que le S&P 500 : quelques géants y pèsent une grande part. Coté en dollars." },
  ftse100: { etf: /^FTSE 100/i, pays: c => (c.isin || "").startsWith("GB"), n: 100, place: "la Bourse de Londres", fournisseur: "FTSE Russell",
    regle: "Les 100 plus grandes entreprises cotées à Londres, pondérées par leur valeur en Bourse (flottant).",
    histoire: "Créé en 1984, sur une base de 1 000 points.",
    nuance: "Coté en livres sterling. Beaucoup de ses entreprises font l'essentiel de leurs ventes hors du Royaume-Uni." },
  nikkei: { etf: /Nikkei 225/i, pays: c => (c.isin || "").startsWith("JP"), n: 225, place: "la Bourse de Tokyo", fournisseur: "Nikkei",
    regle: "225 grandes entreprises japonaises. Particularité : il est pondéré par le prix de l'action, pas par la taille de l'entreprise. Une action chère pèse plus, même si l'entreprise est plus petite.",
    histoire: "Calculé depuis 1950.",
    nuance: "Coté en yens : le taux de change compte pour un épargnant en euros." },
};
const ORC_CHEV = `<svg class="orcchev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;

function indicesHTML() {
  const rows = INDEX_INFO.map(([id, name, fl, what]) => ({ id, name, fl, what, p: PX["i:" + id] })).filter(r => r.p);
  if (!rows.length) return `<div class="pb muted">Les indices ne sont pas disponibles pour le moment.</div>`;
  const up = rows.filter(r => r.p.chg > 0).length;
  return `<div class="idxs">${rows.map(r => { const y = r.p.p1y ? r.p.p / r.p.p1y - 1 : null;
    return `<a class="idx idxa" href="/indice/${r.id}" title="${esc(r.what)}"><span class="flag">${FLAG[r.fl]}</span><span class="in"><b>${esc(r.name)}</b><small>${F0.format(r.p.p)} points</small></span>
      <span class="iv"><b class="${r.p.chg > 0 ? "up" : r.p.chg < 0 ? "down" : ""}">${r.p.chg != null ? (r.p.chg > 0 ? "+" : "") + F2.format(r.p.chg) + " %" : "–"}</b><small>${y != null ? `${sgn(y, 0)} sur un an` : ""}</small></span>${ORC_CHEV}</a>`; }).join("")}</div>
    <p class="note" style="margin:10px 0 0">${up === rows.length ? "Tous les grands indices montent aujourd'hui." : up === 0 ? "Tous les grands indices baissent aujourd'hui." : `${up} indice${up > 1 ? "s" : ""} sur ${rows.length} en hausse aujourd'hui.`} Cliquez sur un indice pour voir ce qu'il contient et les ETF qui permettent d'y investir. Variations sur la journée, cours différés.</p>`;
}

async function pageIndice(id) {
  const I = INDEX_INFO.find(x => x[0] === id), F = ORC_IDX[id];
  if (!I || !F) return pageNotFound();
  const [, name, fl, what] = I;
  setTitle(name); setNav("mkt");
  await PXP;
  const p = PX["i:" + id], y = p && p.p1y ? p.p / p.p1y - 1 : null;
  const etfs = ETF.list.filter(e => F.etf.test(e.index || "") && e.ter != null).sort((a, b) => a.ter - b.ter);
  const proches = etfs.length ? [] : ETF.list.filter(e => e.ter != null && (id === "cac40" ? e.categorie === "actions-france" : id === "sp500" || id === "nasdaq100" ? e.categorie === "actions-usa" : id === "nikkei" ? e.categorie === "actions-asie" : e.categorie === "actions-europe")).sort((a, b) => a.ter - b.ter).slice(0, 5);
  const cos = R.companies.filter(c => !c.missing && F.pays(c)).map(c => ({ c, v: valo(c) })).filter(x => x.v && x.v.capE > 0).sort((a, b) => b.v.capE - a.v.capE).slice(0, 10);
  const etfRow = e => `<a class="orcrow" href="/etf/${e.id}">${logo({ name: e.issuer, domain: issuerDom(e) }, 30)}<span class="t"><b>${esc(e.name)}</b><small>${esc(e.issuer || "")}${e.pea ? ` · <span class="orcpea">PEA</span>` : ""}${e.distribution ? ` · ${/dist/i.test(e.distribution) ? "distribuant" : "capitalisant"}` : ""}</small></span><span class="v"><b>${pct(e.ter / 100, 2, false)}</b><small>par an</small></span>${ORC_CHEV}</a>`;
  const qs = [`C'est quoi le ${name} ?`, `Comment investir dans le ${name} ?`, `ETF ${name} éligible PEA`];
  app.innerHTML = `<div class="crumbs"><a href="/marches">Marchés</a> › ${esc(name)}</div>
    <section class="panel orchead"><div class="pb"><div class="orcid"><span class="flag">${FLAG[fl]}</span><div><p class="kick">Indice boursier · ${esc(F.fournisseur)}</p><h1 class="pagetitle" style="margin:0">${esc(name)}</h1><p class="pagesub" style="margin:4px 0 0">${esc(what)}</p></div></div>
      ${p ? `<div class="orcnum"><b class="num">${F0.format(p.p)}</b><span>points</span><span class="${p.chg > 0 ? "up" : p.chg < 0 ? "down" : ""}">${p.chg != null ? (p.chg > 0 ? "+" : "") + F2.format(p.chg) + " % aujourd'hui" : ""}</span>${y != null ? `<span class="${y >= 0 ? "up" : "down"}">${sgn(y, 1)} sur un an</span>` : ""}<small class="light">Cours différés</small></div>` : ""}</div></section>
    <div class="orcgrid"><div>
      <section class="panel"><div class="ph"><h2>Comment il est construit</h2></div><div class="pb orcfacts">
        <div><span class="kick">Contenu</span><p>${F.n} entreprises cotées sur ${esc(F.place)}.</p></div>
        <div><span class="kick">Règle de calcul</span><p>${esc(F.regle)}</p></div>
        <div><span class="kick">Depuis</span><p>${esc(F.histoire)}</p></div>
        <div class="orcwarn"><span class="kick">À savoir</span><p>${esc(F.nuance)}</p></div>
        <p class="note" style="margin:0">Un indice ne s'achète pas directement : on passe par un fonds qui le reproduit, en général un ETF. <a class="lnk" href="/academie/bourse/indices">La leçon sur les indices</a></p></div></section>
      <section class="panel"><div class="ph"><h2>Les plus grandes entreprises de ce marché sur bilan.</h2></div><div class="pb">
        ${cos.length ? `<div class="orclist">${cos.map(({ c, v }) => `<a class="orcrow" href="/entreprise/${c.id}">${logo(c, 30)}<span class="t"><b>${esc(c.name)}</b><small>${esc(secName(c))}</small></span><span class="v"><b>${big(v.capE / 1e6)}</b><small>en Bourse</small></span>${ORC_CHEV}</a>`).join("")}</div>
          <p class="note" style="margin:10px 0 0">Classées par valeur en Bourse parmi les entreprises suivies par le site. Ce n'est pas la composition officielle de l'indice, publiée par ${esc(F.fournisseur)}.</p>` : `<p class="muted" style="margin:0">Le site ne suit pas encore d'entreprises de ce marché.</p>`}</div></section>
    </div><div>
      <section class="panel"><div class="ph"><h2>Investir dans le ${esc(name)}</h2></div><div class="pb">
        ${etfs.length ? `<p class="muted" style="margin:0 0 10px;font-size:13.5px">${etfs.length} ETF du site reproduisent cet indice, du moins cher au plus cher. Les frais courants sont prélevés chaque année dans le fonds.</p><div class="orclist">${etfs.slice(0, 8).map(etfRow).join("")}</div>`
          : proches.length ? `<p class="muted" style="margin:0 0 10px;font-size:13.5px">Aucun ETF du site ne reproduit exactement cet indice. Voici des ETF sur la même zone, du moins cher au plus cher.</p><div class="orclist">${proches.map(etfRow).join("")}</div>` : `<p class="muted" style="margin:0">Aucun ETF du site ne suit encore cet indice.</p>`}
        <p class="note" style="margin:10px 0 0">Comparez aussi l'indice suivi, la taille du fonds et vos frais de courtage. Ce n'est pas une recommandation. <a class="lnk" href="/etf">Tous les ETF</a></p></div></section>
      <section class="panel orcia"><div class="ph"><h2>✦ Questions à l'IA</h2></div><div class="pb"><div class="chips">${qs.map(q => `<a class="chip" href="/demander?q=${encodeURIComponent(q)}">${esc(q)}</a>`).join("")}</div>
        <p class="note" style="margin:10px 0 0">Réponses calculées à partir des données du site et des leçons de l'Académie.</p></div></section>
    </div></div>`;
}
ROUTES_EXTRA.push([/^\/indice\/([a-z0-9]+)$/, id => pageIndice(id)]);

/* ---------- Accueil : les ETF en lignes claires et cliquables ---------- */
function erankHTML() {
  const [k, , fn] = ERANKS.find(r => r[0] === erankK);
  const l = ETF.list.filter(fn);
  const rows = (k === "gros" ? l.sort((a, b) => b.encours - a.encours) : l.filter(e => e.ter != null).sort((a, b) => a.ter - b.ter)).slice(0, 8);
  if (!rows.length) return `<div class="empty">Aucun ETF dans cette catégorie.</div>`;
  return `<p class="muted" style="margin:0 0 8px;font-size:13px">${k === "gros" ? "Encours : l'argent placé dans le fonds par l'ensemble des épargnants." : "Frais courants prélevés chaque année : les moins chers en premier."} Cliquez sur un ETF pour voir sa composition, ses frais et son émetteur.</p>
    <div class="orclist">${rows.map((e, i) => `<a class="orcrow" href="/etf/${e.id}"><span class="rk">${i + 1}</span>${logo({ name: e.issuer, domain: issuerDom(e) }, 28)}<span class="t"><b>${esc(e.name)}</b><small>${esc(e.index || e.issuer || "")}${e.pea ? ` · <span class="orcpea">PEA</span>` : ""}</small></span><span class="v"><b>${k === "gros" ? big(e.encours) : pct(e.ter / 100, 2, false)}</b><small>${k === "gros" ? "encours" : "par an"}</small></span>${ORC_CHEV}</a>`).join("")}</div>`;
}

(() => {
  const css = `
.idxa{color:inherit;text-decoration:none;grid-template-columns:34px 1fr auto 16px!important;border-radius:8px;transition:background .15s}
.idxa:hover{background:var(--soft)}.idxa:hover b{text-decoration:none}
.orcchev{width:16px;height:16px;fill:none;stroke:var(--light);stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}
a:hover>.orcchev{stroke:var(--ink)}
.orclist{display:flex;flex-direction:column}
.orcrow{display:flex;align-items:center;gap:12px;padding:9px 6px;border-bottom:1px solid var(--line2);color:inherit;text-decoration:none;border-radius:8px;transition:background .15s}
.orcrow:last-child{border-bottom:0}.orcrow:hover{background:var(--soft)}
.orcrow .rk{width:18px;font:600 12px var(--mono);color:var(--light);text-align:right;flex:none}
.orcrow .t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.orcrow .t b{font-size:14px;font-weight:600;line-height:1.3}
.orcrow .t small{font-size:12px;color:var(--grey);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.orcrow .v{display:flex;flex-direction:column;align-items:flex-end;flex:none}.orcrow .v b{font:600 14px var(--mono)}.orcrow .v small{font-size:11.5px;color:var(--light)}
.orcpea{display:inline-block;font:600 10px var(--mono);letter-spacing:.04em;color:#0E6B4A;background:#E4F1EA;border-radius:4px;padding:1px 5px}
.orchead .pb{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap}
.orcid{display:flex;gap:14px;align-items:flex-start}.orcid .flag svg{width:42px;height:28px;border-radius:5px;box-shadow:0 0 0 1px var(--line);margin-top:6px}
.orcnum{display:flex;flex-direction:column;align-items:flex-end;gap:2px;text-align:right}.orcnum>b{font-size:30px}
.orcgrid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:18px;align-items:start}.orcgrid>div{min-width:0}
.orcfacts{display:flex;flex-direction:column;gap:12px}.orcfacts p{margin:2px 0 0}
.orcwarn{background:#FFF7E6;border:1px solid #F1DFB8;border-radius:10px;padding:10px 12px}
@media (max-width:860px){.orcgrid{grid-template-columns:minmax(0,1fr)}.orcnum{align-items:flex-start;text-align:left}}
`;
  document.head.insertAdjacentHTML("beforeend", `<style id="orc-css">${css}</style>`);
})();

/* ---------- Accueil : bandeau de confiance ---------- */
function orcConfiance() {
  const maj = PXUP && PXUP !== "none" ? (/T\d/.test(PXUP) ? new Date(PXUP).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : dLabel(String(PXUP).slice(0, 10))) : null;
  const ico = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  const items = [
    [ico("M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4"), "Comptes officiels", `Chiffres tirés des rapports annuels déposés auprès des autorités (ESEF en Europe, SEC aux États-Unis).`, "/methode"],
    [ico("M4 12l5 5L20 6"), "Calculé, pas inventé", "L'IA traduit votre question en critères ; les chiffres sont calculés sur les données, avec leur source.", "/methode"],
    [ico("M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"), "Indépendant", "Aucune publicité, aucun produit financier vendu, aucun conseil d'achat ou de vente.", "/methode"],
    [ico("M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"), "À jour", maj ? `Cours mis à jour le ${maj} · ${F0.format(R.companies.length)} entreprises et ${ETF.list.length} ETF suivis.` : `${F0.format(R.companies.length)} entreprises et ${ETF.list.length} ETF suivis.`, "/methode"],
  ];
  return `<ul class="orctrust">${items.map(([i, t, d, h]) => `<li><a href="${h}"><span class="ic">${i}</span><span><b>${t}</b><small>${d}</small></span></a></li>`).join("")}</ul>`;
}
document.head.insertAdjacentHTML("beforeend", `<style>
.orctrust{list-style:none;margin:22px 0 0;padding:0;display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.orctrust a{display:flex;gap:10px;align-items:flex-start;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:inherit;text-decoration:none;height:100%;box-sizing:border-box;transition:border-color .15s}
.orctrust a:hover{border-color:var(--ink)}
.orctrust .ic{flex:none;width:30px;height:30px;border-radius:8px;background:#E4F1EA;color:#0E6B4A;display:grid;place-items:center}
.orctrust svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.orctrust b{display:block;font-size:13.5px;margin-bottom:2px}.orctrust small{display:block;font-size:12px;line-height:1.4;color:var(--grey)}
@media (max-width:980px){.orctrust{grid-template-columns:repeat(2,1fr)}}
@media (max-width:520px){.orctrust{gap:8px}.orctrust a{padding:10px;align-items:center}.orctrust small{display:none}.orctrust b{margin:0;font-size:13px}}
</style>`);

/* ---------- L'IA sur toutes les pages : bouton et panneau contextuel ----------
   Sur une fiche, l'IA répond sur l'entreprise (règles locales instantanées, puis serveur) ;
   ailleurs, c'est le copilote « Demander à bilan. » (critères, comparaisons, notions, leçons). */
const ORC_IA = { open: false };
function orcIaCtx() {
  const p = location.pathname, m = p.match(/^\/entreprise\/([a-z0-9-]+)/), e = p.match(/^\/etf\/([a-z0-9-]+)/), i = p.match(/^\/indice\/([a-z0-9]+)/);
  if (m && RBY[m[1]] && !RBY[m[1]].missing) return { type: "co", s: RBY[m[1]], label: RBY[m[1]].name, qs: ASK.slice(0, 4) };
  if (e && ETFBY[e[1]]) { const x = ETFBY[e[1]]; return { type: "etf", label: x.name, qs: [`${x.name} est-il éligible au PEA ?`, "C'est quoi un ETF capitalisant ?", "Comment choisir un ETF ?", "ETF monde PEA pas cher"] }; }
  if (i) { const I = INDEX_INFO.find(x => x[0] === i[1]); if (I) return { type: "gen", label: I[1], qs: [`C'est quoi le ${I[1]} ?`, `Comment investir dans le ${I[1]} ?`, "Pourquoi diversifier ?"] }; }
  if (/^\/portefeuille/.test(p)) return { type: "gen", label: "Votre portefeuille", qs: ["Combien de lignes dans un portefeuille ?", "Les frais de courtage c'est combien ?", "PEA ou compte-titres ?", "Que faire quand ça baisse ?"] };
  if (/^\/academie/.test(p)) return { type: "gen", label: "L'Académie", qs: ["C'est quoi le PER ?", "Comment fonctionne le PEA ?", "C'est quoi un ETF ?", "Pourquoi les intérêts composés comptent ?"] };
  return { type: "gen", label: null, qs: ["Entreprises françaises peu endettées qui versent un dividende", "Compare LVMH et Hermès", "ETF monde éligible PEA", "C'est quoi le PER ?"] };
}
function orcIaShell() {
  if ($("#orcia")) return;
  document.body.insertAdjacentHTML("beforeend", `<button type="button" id="orciab" class="orciab" aria-haspopup="dialog" aria-controls="orcia"><span class="st">✦</span><span class="lb">Demander à l'IA</span></button>
    <div id="orcia" class="orcia" role="dialog" aria-modal="true" aria-labelledby="orciat" hidden><div class="orciabg" data-orcclose></div>
      <div class="orciap"><div class="orciah"><div><p class="kick" id="orciactx"></p><h2 id="orciat">✦ L'IA de bilan.</h2></div><button type="button" class="orciax" data-orcclose aria-label="Fermer">×</button></div>
        <div class="orciab2"><div class="chips" id="orciaq"></div><div id="orcialog" class="orcialog"></div></div>
        <form id="orciaf" class="orciaf" autocomplete="off"><input type="text" maxlength="300" placeholder="Votre question…" aria-label="Votre question"><button class="btn" type="submit">Demander</button></form>
        <p class="orciaft">Chiffres calculés sur les comptes officiels et les données du site, avec leur source. Information, pas conseil.</p></div></div>`);
  $("#orciab").onclick = () => orcIaOpen();
  $("#orcia").addEventListener("click", e => { if (e.target.closest("[data-orcclose]")) orcIaClose(); const q = e.target.closest("[data-orcq]"); if (q) orcIaAsk(q.dataset.orcq); if (e.target.closest("#orcialog a[href^='/']")) setTimeout(orcIaClose, 0); });
  $("#orciaf").onsubmit = e => { e.preventDefault(); const i = $("#orciaf input"); orcIaAsk(i.value); i.value = ""; };
  document.addEventListener("keydown", e => { if (e.key === "Escape" && ORC_IA.open) orcIaClose(); });
  addEventListener("popstate", () => { if (ORC_IA.open) orcIaClose(); });
}
function orcIaOpen() {
  const c = orcIaCtx(); ORC_IA.ctx = c;
  $("#orciactx").textContent = c.label ? (c.type === "co" ? "Question sur " : "À propos de : ") + c.label : "Copilote · 2 000 entreprises et des ETF";
  $("#orciaq").innerHTML = c.qs.map(q => `<button type="button" class="chip" data-orcq="${esc(q)}">${esc(q)}</button>`).join("");
  $("#orcia").hidden = false; ORC_IA.open = true; document.documentElement.classList.add("orcia-on");
  setTimeout(() => $("#orciaf input").focus(), 50);
}
function orcIaClose() { const d = $("#orcia"); if (d) d.hidden = true; ORC_IA.open = false; document.documentElement.classList.remove("orcia-on"); const b = $("#orciab"); if (b) b.focus({ preventScroll: true }); }
async function orcIaAsk(q) {
  q = String(q || "").trim(); if (q.length < 3) return;
  const log = $("#orcialog"), c = ORC_IA.ctx || orcIaCtx();
  const it = document.createElement("div"); it.className = "orciait"; it.innerHTML = `<p class="askq">${esc(q)}</p><div class="aska"></div>`; log.prepend(it);
  const out = $(".aska", it);
  if (c.type === "co") {
    out.innerHTML = `<div class="iathink"><span></span><span></span><span></span> L'IA lit la fiche…</div>`;
    const s = c.s; let full = FULL[s.id];
    if (!full) { try { full = FULL[s.id] = await (await fetch(`/data/societes/${s.id}.json`)).json(); } catch (e) { full = null; } }
    await loadAna();
    const loc = localAssist(s, full, q);
    if (loc) { out.innerHTML = resumeHTML(loc) + `<p class="iafoot">Réponse instantanée, calculée à partir des chiffres de la fiche.</p>`; return; }
    try { const j = await (await iaFetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: q, faits: ficheFaits(s, full) }) })).json();
      out.innerHTML = j.txt ? resumeHTML(j.txt) + `<p class="iafoot">Rédigé par l'IA à partir des seules données de la fiche. À vérifier ; ce n'est pas un conseil.</p>` : iaErr(j, "Réponse indisponible.");
    } catch (e) { out.innerHTML = `<p class="muted">L'IA est indisponible pour le moment.</p>`; }
    return;
  }
  const before = location.pathname + location.search;
  await iaRun(q, out);
  if (location.pathname + location.search !== before) orcIaClose(); // l'IA a ouvert une fiche ou une comparaison
}
function orcIaVisibilite() {
  const b = $("#orciab"); if (!b) return;
  const p = location.pathname, cache = p === "/demander" || (p === "/" && scrollY < 520);
  b.classList.toggle("off", cache);
}
(() => {
  const start = () => { orcIaShell(); orcIaVisibilite(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
  addEventListener("scroll", orcIaVisibilite, { passive: true });
  addEventListener("popstate", () => setTimeout(orcIaVisibilite, 0));
  document.addEventListener("click", e => { if (e.target.closest("a[href^='/']")) setTimeout(orcIaVisibilite, 50); });
  document.head.insertAdjacentHTML("beforeend", `<style>
.orciab{position:fixed;right:20px;bottom:20px;z-index:60;display:flex;align-items:center;gap:8px;height:46px;padding:0 18px 0 14px;border-radius:999px;border:0;background:var(--ink);color:#fff;font:600 14px inherit;cursor:pointer;box-shadow:0 8px 24px -8px rgba(17,18,20,.45);transition:transform .2s,opacity .2s}
.orciab .st{color:#D6F26B;font-size:17px}.orciab:hover{transform:translateY(-2px)}.orciab.off{opacity:0;pointer-events:none;transform:translateY(12px)}
.orcia{position:fixed;inset:0;z-index:80}.orcia[hidden]{display:none}
.orciabg{position:absolute;inset:0;background:rgba(17,18,20,.35)}
.orciap{position:absolute;top:0;right:0;bottom:0;width:min(440px,100%);background:var(--page);display:flex;flex-direction:column;box-shadow:-12px 0 40px -12px rgba(0,0,0,.3);animation:orcin .22s ease-out}
@keyframes orcin{from{transform:translateX(30px);opacity:.4}to{transform:none;opacity:1}}
.orciah{display:flex;justify-content:space-between;align-items:flex-start;padding:18px 18px 10px;border-bottom:1px solid var(--line)}.orciah h2{font:600 20px var(--serif);margin:2px 0 0}
.orciax{border:0;background:none;font-size:26px;line-height:1;cursor:pointer;color:var(--grey);padding:0 4px}
.orciab2{flex:1;overflow:auto;padding:14px 18px}.orciab2 .chips{margin-bottom:12px}
.orcialog{display:flex;flex-direction:column;gap:14px}.orciait{border:1px solid var(--line);background:var(--card);border-radius:12px;padding:12px}
.orciait .askq{font-weight:600;margin:0 0 6px}.orciait .iares2 h2.iah{font-size:17px}.orciait table{font-size:12.5px}
.orciaf{display:flex;gap:8px;padding:12px 18px;border-top:1px solid var(--line);background:var(--card)}.orciaf input{flex:1;min-width:0;height:40px;border:1px solid var(--line);border-radius:10px;padding:0 12px;font:inherit}
.orciaft{margin:0;padding:0 18px 14px;background:var(--card);font-size:11.5px;color:var(--light)}
html.orcia-on{overflow:hidden}
@media (max-width:760px){.orciab{right:14px;bottom:calc(14px + env(safe-area-inset-bottom));height:44px;padding:0 14px 0 12px}.orciab .lb{font-size:13px}
  .orciap{top:auto;height:88vh;width:100%;border-radius:18px 18px 0 0;animation:orcup .22s ease-out}@keyframes orcup{from{transform:translateY(40px)}to{transform:none}}}
@media print{.orciab,.orcia{display:none!important}}
</style>`);
})();

/* ---------- Méthode et sources : la fiabilité rendue visible ---------- */
function pageMethode() {
  setTitle("Méthode, sources et IA"); setNav("new");
  const ico = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  const nCo = R.companies.filter(c => !c.missing).length;
  const SRC = [
    ["Comptes annuels des entreprises européennes", "Rapports financiers annuels au format officiel ESEF, déposés par les sociétés cotées", "filings.xbrl.org", "https://filings.xbrl.org"],
    ["Comptes des entreprises américaines", "Dépôts auprès de la Securities and Exchange Commission (10-K, 20-F)", "SEC EDGAR", "https://www.sec.gov/edgar"],
    ["Annonces des sociétés françaises", "Informations réglementées publiées par les émetteurs", "AMF, info-financiere.gouv.fr", "https://www.info-financiere.gouv.fr"],
    ["Listes noires", "Sites et entités non autorisés signalés par l'Autorité des marchés financiers", "AMF via data.gouv.fr", "https://www.data.gouv.fr"],
    ["Taux de change", "Taux de référence quotidiens de l'euro", "Banque centrale européenne", "https://www.ecb.europa.eu"],
    ["Cours de Bourse", "Cours de clôture ou différés, à titre indicatif", "Google Finance", "https://www.google.com/finance"],
    ["ETF", "Fiches, documents d'informations clés et compositions publiés par les émetteurs", "Sites des émetteurs", null],
  ];
  app.innerHTML = `<div class="crumbs"><a href="/">Accueil</a> › Méthode et sources</div>
    <div class="mtdhero"><p class="kick">Transparence</p><h1 class="pagetitle">Comment bilan. fabrique ses chiffres</h1>
      <p class="pagesub">Des documents officiels, des calculs vérifiables, une IA encadrée. Voici, étape par étape, ce qui se passe entre le rapport annuel d'une entreprise et ce que vous lisez.</p>
      <div class="mtdkpi"><span><b>${F0.format(nCo)}</b>entreprises avec leurs comptes</span><span><b>${ETF.list.length}</b>ETF suivis</span><span><b>0</b>publicité</span><span><b>0</b>conseil d'achat ou de vente</span></div></div>
    <ol class="mtdflow">
      <li><span class="ic">${ico("M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4")}</span><b>1. Les sources officielles</b><p>Rapports annuels déposés auprès des autorités (ESEF en Europe, SEC aux États-Unis), annonces réglementées, taux de la BCE.</p></li>
      <li><span class="ic">${ico("M4 19V5M4 19h16M8 15l3-4 3 2 4-6")}</span><b>2. Le calcul</b><p>Le site lit les chiffres (ventes, résultats, dette, dividendes) et calcule les ratios lui-même. Des contrôles écartent les valeurs incohérentes.</p></li>
      <li><span class="ic">${ico("M12 3v18M5 8h14M5 16h14")}</span><b>3. La comparaison</b><p>Chaque chiffre est situé par rapport à la médiane des entreprises du même secteur : vert nettement mieux, orange nettement moins bien, gris dans la moyenne.</p></li>
      <li><span class="ic">${ico("M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z")}</span><b>4. L'explication</b><p>Des phrases simples, construites à partir des chiffres. L'IA traduit vos questions en calculs ; elle ne fabrique pas les chiffres.</p></li>
    </ol>
    <div class="mtdgrid">
      <section class="panel"><div class="ph"><h2>Comment lire les couleurs</h2></div><div class="pb">
        <div class="mtdleg"><span class="g">Point fort</span><span class="n">Dans la moyenne</span><span class="o">Point de vigilance</span></div>
        <p>La <b>médiane</b> d'un secteur est la valeur du milieu : la moitié des entreprises fait mieux, l'autre moins bien. Un chiffre est vert quand il est nettement meilleur que cette médiane, orange quand il est nettement moins bon.</p>
        <p class="muted" style="margin:0">Un point orange n'est pas une mauvaise nouvelle en soi : c'est ce qu'il faut surveiller. Une couleur n'est jamais une note d'achat.</p></div></section>
      <section class="panel"><div class="ph"><h2>L'IA, en trois niveaux</h2></div><div class="pb mtdia">
        <div><b>1. Règles du site, dans votre navigateur</b><p>Recherches par critères, comparaisons, définitions, questions sur une fiche : comprises et calculées sur les données, sans modèle génératif. Réponse instantanée, exacte par construction, sans limite.</p></div>
        <div><b>2. Leçons vérifiées de l'Académie</b><p>Les questions de cours renvoient vers des leçons rédigées à partir de sources officielles, avec leurs chiffres 2026.</p></div>
        <div><b>3. Modèle de langage encadré</b><p>Pour les questions libres seulement : un modèle ouvert (dans votre navigateur si votre appareil le permet, sinon sur nos serveurs) reçoit uniquement les chiffres du site et des consignes strictes. Sa réponse est signalée comme rédigée par une IA.</p></div></div></section>
    </div>
    <section class="panel"><div class="ph"><h2>Les règles données à l'IA contre les biais</h2></div><div class="pb"><ul class="mtdcheck">
      <li>Séparer les faits de leur interprétation</li><li>Présenter à la fois ce qui est favorable et ce qui demande de la vigilance</li><li>Ne pas donner plus de poids à la dernière nouvelle qu'aux comptes de plusieurs années</li>
      <li>Comparer à la médiane du secteur plutôt que juger dans l'absolu</li><li>Aucun mot d'emphase, aucune prédiction de cours</li><li>Aucune recommandation d'acheter, de vendre ou de conserver</li>
      <li>Dire quand une information manque</li><li>Ne citer que les chiffres fournis</li></ul></div></section>
    <section class="panel"><div class="ph"><h2>Nos sources</h2></div><div class="pb"><div class="mtdsrc">${SRC.map(([t, d, n, u]) => `<div><b>${t}</b><span>${d}</span>${u ? `<a class="lnk" href="${u}" target="_blank" rel="noopener">${n}</a>` : `<span class="light">${n}</span>`}</div>`).join("")}</div>
      <p class="note" style="margin:12px 0 0">Les cours viennent d'une source gratuite et différée : ils sont indicatifs et peuvent avoir plusieurs minutes de retard.</p></div></section>
    <div class="mtdgrid">
      <section class="panel"><div class="ph"><h2>Ce que le site ne fait pas</h2></div><div class="pb"><ul class="mtdno">
        <li>Il ne dit pas quoi acheter ni quand vendre.</li><li>Il ne publie ni objectifs de cours ni recommandations d'analystes (travaux payants, soumis à licence).</li>
        <li>Il ne connaît ni votre patrimoine ni vos revenus : ses repères sont généraux.</li><li>Il ne vend aucun produit financier et n'affiche aucune publicité.</li></ul>
        <p class="note" style="margin:10px 0 0">Pour un conseil adapté à votre situation : un conseiller en investissements financiers (CIF) enregistré à l'ORIAS.</p></div></section>
      <section class="panel"><div class="ph"><h2>Les limites à connaître</h2></div><div class="pb"><ul class="mtdno">
        <li>Les comptes annuels ont plusieurs mois de retard sur l'activité réelle.</li><li>Un ratio d'une seule année peut être faussé par un élément exceptionnel.</li>
        <li>Les cours sont différés.</li><li>L'IA peut se tromper : vérifiez un chiffre important dans le document source, dont le lien est donné.</li></ul></div></section>
    </div>
    <section class="panel mtderr"><div class="pb"><div><h2 style="margin:0 0 4px">Vous voyez une erreur ?</h2><p class="muted" style="margin:0">Un chiffre faux, une explication trompeuse, un lien cassé : dites-le nous, chaque signalement est relu.</p></div><button type="button" class="btn" data-signaler>Signaler une erreur</button></div></section>
    <p class="note"><a class="lnk" href="/avertissement">Avertissement sur les risques</a> · <a class="lnk" href="/confidentialite">Confidentialité</a> · <a class="lnk" href="/mentions-legales">Mentions légales</a> · <a class="lnk" href="/academie">L'Académie</a></p>`;
}

/* ---------- Signaler une erreur (pied de page et page Méthode) ---------- */
function orcSignaler() {
  let d = $("#orcsig");
  if (!d) {
    document.body.insertAdjacentHTML("beforeend", `<div id="orcsig" class="orcia" role="dialog" aria-modal="true" aria-labelledby="orcsigt" hidden><div class="orciabg" data-sigclose></div>
      <form class="orcsigp" autocomplete="off"><div class="orciah" style="padding:0 0 10px"><h2 id="orcsigt" style="font:600 20px var(--serif);margin:0">Signaler une erreur</h2><button type="button" class="orciax" data-sigclose aria-label="Fermer">×</button></div>
        <p class="muted" style="margin:0 0 10px;font-size:13.5px">Page concernée : <b id="orcsigpage"></b></p>
        <label class="orcsigl">Type d'erreur<select name="quoi"><option value="chiffre">Un chiffre faux</option><option value="ia">Une réponse de l'IA</option><option value="texte">Un texte ou une explication</option><option value="lien">Un lien cassé</option><option value="autre">Autre</option></select></label>
        <label class="orcsigl">Ce qui ne va pas<textarea name="texte" rows="4" maxlength="1000" placeholder="Par exemple : la marge 2025 affichée est 23 %, le rapport annuel indique 21,9 %." required></textarea></label>
        <p class="note" style="margin:0 0 10px">N'indiquez pas de données personnelles. Aucune adresse n'est conservée.</p>
        <div style="display:flex;gap:10px;align-items:center"><button class="btn" type="submit">Envoyer</button><span id="orcsigmsg" class="muted" style="font-size:13.5px"></span></div></form></div>`);
    d = $("#orcsig");
    d.addEventListener("click", e => { if (e.target.closest("[data-sigclose]")) d.hidden = true; });
    $("form", d).onsubmit = async e => {
      e.preventDefault(); const f = e.target, msg = $("#orcsigmsg");
      msg.textContent = "Envoi…";
      try { const r = await fetch("/api/signaler", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ page: location.pathname + location.search, quoi: f.quoi.value, texte: f.texte.value }) }); const j = await r.json();
        if (j.ok) { msg.textContent = ""; f.reset(); d.hidden = true; toast("Merci, votre signalement a bien été envoyé. Il sera relu."); } else msg.textContent = j.error || "Envoi impossible.";
      } catch (er) { msg.textContent = "Envoi impossible pour le moment."; }
    };
  }
  $("#orcsigpage").textContent = location.pathname;
  d.hidden = false; setTimeout(() => $("textarea", d).focus(), 50);
}
document.addEventListener("click", e => { if (e.target.closest("[data-signaler]")) { e.preventDefault(); orcSignaler(); } });
(() => { const add = () => { const f = document.querySelector("footer .f > div:last-child"); if (f && !f.querySelector("[data-signaler]")) f.insertAdjacentHTML("beforeend", `<a href="#" data-signaler>Signaler une erreur</a>`); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add); else add(); })();
document.head.insertAdjacentHTML("beforeend", `<style>
.mtdhero{margin:6px 0 18px}.mtdkpi{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
.mtdkpi span{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 14px;font-size:12.5px;color:var(--grey);display:flex;flex-direction:column;min-width:120px}.mtdkpi b{font:600 22px var(--serif);color:var(--ink)}
.mtdflow{list-style:none;margin:0 0 18px;padding:0;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;counter-reset:none}
.mtdflow li{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;position:relative}
.mtdflow li:not(:last-child)::after{content:"";position:absolute;right:-12px;top:34px;width:12px;height:2px;background:var(--line)}
.mtdflow .ic{width:36px;height:36px;border-radius:10px;background:#E4F1EA;color:#0E6B4A;display:grid;place-items:center;margin-bottom:10px}
.mtdflow svg,.mtdno svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.mtdflow b{display:block;margin-bottom:4px}.mtdflow p{margin:0;font-size:13.5px;color:var(--grey);line-height:1.5}
.mtdgrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;align-items:start}
.mtdleg{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}.mtdleg span{font-size:13px;font-weight:600;border-radius:999px;padding:5px 12px}
.mtdleg .g{background:#E4F1EA;color:#0E6B4A}.mtdleg .n{background:var(--soft);color:var(--grey)}.mtdleg .o{background:#FBE9DF;color:#B5501D}
.mtdia{display:flex;flex-direction:column;gap:12px}.mtdia>div{border-left:3px solid #0E6B4A;padding-left:12px}.mtdia p{margin:3px 0 0;font-size:13.5px;color:var(--grey)}
.mtdcheck{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,1fr);gap:8px 20px}
.mtdcheck li{position:relative;padding-left:26px;font-size:14px}.mtdcheck li::before{content:"✓";position:absolute;left:0;top:0;width:18px;height:18px;border-radius:50%;background:#E4F1EA;color:#0E6B4A;font-size:11px;display:grid;place-items:center;font-weight:700}
.mtdno{margin:0;padding-left:18px}.mtdno li{margin:0 0 6px;font-size:14px}
.mtdsrc{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.mtdsrc>div{border:1px solid var(--line2);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:3px}.mtdsrc span{font-size:13px;color:var(--grey)}.mtdsrc .lnk{font-size:13px;align-self:flex-start}
.mtderr .pb{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.orcsigp{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(480px,calc(100% - 32px));background:var(--page);border-radius:16px;padding:18px;box-shadow:0 20px 60px -20px rgba(0,0,0,.4)}
.orcsigl{display:flex;flex-direction:column;gap:5px;font-size:13.5px;font-weight:600;margin:0 0 10px}.orcsigl select,.orcsigl textarea{font:inherit;font-weight:400;border:1px solid var(--line);border-radius:10px;padding:9px 10px;background:var(--card)}
@media (max-width:900px){.mtdflow{grid-template-columns:repeat(2,1fr)}.mtdflow li::after{display:none}.mtdgrid{grid-template-columns:minmax(0,1fr)}}
@media (max-width:560px){.mtdflow{grid-template-columns:1fr}.mtdcheck,.mtdsrc{grid-template-columns:1fr}}
</style>`);
