/* Module « orchestre » d'ENKLAIR : chargé après le script principal de index.html.
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
    regle: "225 grandes entreprises japonaises. Particularité : il est pondéré par le prix de l'action, pas par la taille de l'entreprise. Une action au cours élevé pèse plus, même si l'entreprise est plus petite.",
    histoire: "Calculé depuis 1950.",
    nuance: "Coté en yens : le taux de change compte pour un épargnant en euros." },
};
const ORC_CHEV = `<svg class="orcchev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;


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
  const etfRow = e => `<a class="orcrow" href="/etf/${e.id}">${logo({ name: e.issuer, domain: issuerDom(e) }, 30)}<span class="t"><b>${esc(e.name)}</b><small>${esc(e.issuer || "")}${e.pea && (typeof frSeul !== "function" || frSeul()) ? ` · <span class="orcpea">PEA</span>` : ""}${e.distribution ? ` · ${/dist/i.test(e.distribution) ? "distribuant" : "capitalisant"}` : ""}</small></span><span class="v"><b>${pct(e.ter / 100, 2, false)}</b><small>par an</small></span>${ORC_CHEV}</a>`;
  const qs = [`C'est quoi le ${name} ?`, `Comment investir dans le ${name} ?`, ...((typeof frSeul !== "function" || frSeul()) ? [`ETF ${name} éligible PEA`] : [])];
  app.innerHTML = `<div class="crumbs"><a href="/marches">Marchés</a> › ${esc(name)}</div>
    <section class="panel orchead"><div class="pb"><div class="orcid"><span class="flag">${FLAG[fl]}</span><div><p class="kick">Indice boursier · ${esc(F.fournisseur)}</p><h1 class="pagetitle" style="margin:0">${esc(name)}</h1><p class="pagesub" style="margin:4px 0 0">${esc(what)}</p></div></div>
      ${p ? `<div class="orcnum"><b class="num">${F0.format(p.p)}</b><span>points</span><span class="${p.chg > 0 ? "up" : p.chg < 0 ? "down" : ""}">${p.chg != null ? (p.chg > 0 ? "+" : "") + F2.format(p.chg) + " % " + jourSeance() : ""}</span>${y != null ? `<span class="${y >= 0 ? "up" : "down"}">${sgn(y, 1)} sur un an</span>` : ""}<small class="light">Cours différés</small></div>` : ""}</div></section>
    <div class="orcgrid"><div>
      <section class="panel"><div class="ph"><h2>Comment il est construit</h2></div><div class="pb orcfacts">
        <div><span class="kick">Contenu</span><p>${F.n} entreprises cotées sur ${esc(F.place)}.</p></div>
        <div><span class="kick">Règle de calcul</span><p>${esc(F.regle)}</p></div>
        <div><span class="kick">Depuis</span><p>${esc(F.histoire)}</p></div>
        <div class="orcwarn"><span class="kick">À savoir</span><p>${esc(F.nuance)}</p></div>
        <p class="note" style="margin:0">Un indice ne s'achète pas directement : on passe par un fonds qui le reproduit, en général un ETF.</p></div></section>
      <section class="panel"><div class="ph"><h2>Les plus grandes entreprises de ce marché sur ENKLAIR</h2></div><div class="pb">
        ${cos.length ? `<div class="orclist">${cos.map(({ c, v }) => `<a class="orcrow" href="/entreprise/${c.id}">${logo(c, 30)}<span class="t"><b>${esc(c.name)}</b><small>${esc(secName(c))}</small></span><span class="v"><b>${big(v.capE / 1e6)}</b><small>en Bourse</small></span>${ORC_CHEV}</a>`).join("")}</div>
          <p class="note" style="margin:10px 0 0">Classées par valeur en Bourse parmi les entreprises suivies par le site. Ce n'est pas la composition officielle de l'indice, publiée par ${esc(F.fournisseur)}.</p>` : `<p class="muted" style="margin:0">Le site ne suit pas encore d'entreprises de ce marché.</p>`}</div></section>
    </div><div>
      <section class="panel"><div class="ph"><h2>Investir dans le ${esc(name)}</h2></div><div class="pb">
        ${etfs.length ? `<p class="muted" style="margin:0 0 10px;font-size:13.5px">${etfs.length} ETF du site reproduisent cet indice, du moins cher au plus cher. Les frais courants sont prélevés chaque année dans le fonds.</p><div class="orclist">${etfs.slice(0, 8).map(etfRow).join("")}</div>`
          : proches.length ? `<p class="muted" style="margin:0 0 10px;font-size:13.5px">Aucun ETF du site ne reproduit exactement cet indice. Voici des ETF sur la même zone, du moins cher au plus cher.</p><div class="orclist">${proches.map(etfRow).join("")}</div>` : `<p class="muted" style="margin:0">Aucun ETF du site ne suit encore cet indice.</p>`}
        <p class="note" style="margin:10px 0 0">Comparez aussi l'indice suivi, la taille du fonds et vos frais de courtage. Ce n'est pas une recommandation. <a class="lnk" href="/etf">Tous les ETF</a></p></div></section>
    </div></div>`;
}
ROUTES_EXTRA.push([/^\/indice\/([a-z0-9]+)$/, id => pageIndice(id)]);

/* ---------- Accueil : les ETF en lignes claires et cliquables ---------- */

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
  /* styles : voir site.css */
})();

/* ---------- Accueil : bandeau de confiance ---------- */
/* styles : voir site.css */

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
  app.innerHTML = `<div class="ek ek-page mt4"><section class="ek-hero"><span class="mc-stk">Méthode et sources</span><h1 class="ag4-t">Comment ENKLAIR fabrique ses chiffres</h1>
      <p class="mc-sub">Des documents officiels, des calculs vérifiables, une IA encadrée. Voici, étape par étape, ce qui se passe entre le rapport annuel d'une entreprise et ce que vous lisez.</p>
      <div class="mtdkpi"><span><b>${F0.format(nCo)}</b>entreprises avec leurs comptes</span><span><b>${F0.format(ETF.list.length)}</b>ETF suivis</span><span><b>0</b>publicité</span><span><b>0</b>conseil d'achat ou de vente</span></div></section>
    <section class="ek-sec"><span class="ek-stk2 b">Étape par étape</span><h2>Du rapport annuel à votre écran.</h2><ol class="mtdflow">
      <li><span class="ic">${ico("M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4")}</span><b>1. Les sources officielles</b><p>Rapports annuels déposés auprès des autorités (ESEF en Europe, SEC aux États-Unis), annonces réglementées, taux de la BCE.</p></li>
      <li><span class="ic">${ico("M4 19V5M4 19h16M8 15l3-4 3 2 4-6")}</span><b>2. Le calcul</b><p>Le site lit les chiffres (ventes, résultats, dette, dividendes) et calcule les ratios lui-même. Des contrôles écartent les valeurs incohérentes.</p></li>
      <li><span class="ic">${ico("M12 3v18M5 8h14M5 16h14")}</span><b>3. La comparaison</b><p>Chaque chiffre est situé par rapport à la médiane des entreprises du même secteur : vert nettement mieux, orange nettement moins bien, gris dans la moyenne.</p></li>
      <li><span class="ic">${ico("M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z")}</span><b>4. L'explication</b><p>Des phrases simples, construites à partir des chiffres. L'IA traduit vos questions en calculs ; elle ne fabrique pas les chiffres.</p></li>
    </ol></section>
    <div class="mtdgrid">
      <section class="panel"><div class="ph"><h2>Comment lire les couleurs</h2></div><div class="pb">
        <div class="mtdleg"><span class="g">Point fort</span><span class="n">Dans la moyenne</span><span class="o">Point de vigilance</span></div>
        <p>La <b>médiane</b> d'un secteur est la valeur du milieu : la moitié des entreprises fait mieux, l'autre moins bien. Un chiffre est vert quand il est nettement meilleur que cette médiane, orange quand il est nettement moins bon.</p>
        <p class="muted" style="margin:0">Un point orange n'est pas une mauvaise nouvelle en soi : c'est ce qu'il faut surveiller. Une couleur n'est jamais une note d'achat.</p></div></section>
      <section class="panel"><div class="ph"><h2>L'IA, en trois niveaux</h2></div><div class="pb mtdia">
        <div><b>1. Règles du site, dans votre navigateur</b><p>Recherches par critères, comparaisons, définitions, questions sur une fiche : comprises et calculées sur les données, sans modèle génératif. Réponse instantanée, exacte par construction, sans limite.</p></div>
        <div><b>2. Leçons vérifiées de l'Académie</b><p>Les questions de cours renvoient vers des leçons rédigées à partir de sources officielles, avec leurs chiffres 2026.</p></div>
        <div><b>3. L'IA du site, pour les questions libres</b><p>Gratuite, sans compte ni clé : un modèle ouvert (Qwen3 ou Mistral Small) hébergé par Cloudflare reçoit votre question, les chiffres du site, leurs sources et des consignes strictes. Sa réponse est signalée comme rédigée par une IA. 3 questions par semaine en gratuit, 50 par jour avec Premium.</p></div></div></section>
    </div>
    <section class="panel"><div class="ph"><h2>Les règles données à l'IA contre les biais</h2></div><div class="pb"><ul class="mtdcheck">
      <li>Séparer les faits de leur interprétation</li><li>Présenter à la fois ce qui est favorable et ce qui demande de la vigilance</li><li>Ne pas donner plus de poids à la dernière nouvelle qu'aux comptes de plusieurs années</li>
      <li>Comparer à la médiane du secteur plutôt que juger dans l'absolu</li><li>Aucun mot d'emphase, aucune prédiction de cours</li><li>Aucune recommandation d'acheter, de vendre ou de conserver</li>
      <li>Dire quand une information manque</li><li>Ne citer que les chiffres fournis</li></ul></div></section>
    <section class="panel" id="contexte"><div class="ph"><h2>Nos sources</h2></div><div class="pb"><div class="mtdsrc">${SRC.map(([t, d, n, u]) => `<div><b>${t}</b><span>${d}</span>${u ? `<a class="lnk" href="${u}" target="_blank" rel="noopener">${n}</a>` : `<span class="light">${n}</span>`}</div>`).join("")}</div>
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
    <p class="note"><a class="lnk" href="/avertissement">Avertissement sur les risques</a> · <a class="lnk" href="/confidentialite">Confidentialité</a> · <a class="lnk" href="/mentions-legales">Mentions légales</a></p></div>`;
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
/* styles : voir site.css */

/* Barre de recherche : texte d'aide court quand la barre est étroite (tablette) */
(() => { const fit = () => { const i = document.querySelector("header [data-search] input"); if (!i) return; i.dataset.ph = i.dataset.ph || i.placeholder; i.placeholder = innerWidth > 760 && innerWidth < 940 ? "Rechercher" : i.dataset.ph; };
  addEventListener("resize", fit, { passive: true }); if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fit); else fit(); })();

/* Favoris bien visibles : lien « ★ Favoris » avec compteur dans la barre (ordinateur), bouton étoile sur mobile,
   et un court message après chaque ajout pour dire où retrouver la liste. */
/* styles : voir site.css */
(() => {
  // le lien « ★ Favoris » de la barre et l'étoile du téléphone sont construits par m/nav.js
  let tm;
  document.addEventListener("click", ev => {
    const b = ev.target.closest("[data-fav]"); if (!b || location.pathname === "/favoris") return;
    setTimeout(() => {
      if (typeof isFav !== "function" || !isFav(b.dataset.fav)) return;
      let t = document.querySelector(".orcfavt");
      if (!t) { t = document.createElement("div"); t.className = "orcfavt"; t.setAttribute("role", "status"); document.body.appendChild(t); }
      const rap = "";
      t.innerHTML = `<span>Ajouté à vos favoris. Retrouvez-les avec <b>★ Favoris</b> en haut de page.${rap}</span><a href="/favoris">Voir</a>`;
      requestAnimationFrame(() => t.classList.add("vis")); clearTimeout(tm); tm = setTimeout(() => t.classList.remove("vis"), rap ? 7000 : 3800);
    }, 0);
  });
})();

/* Entreprises citées dans une question (nom ou code) : leurs chiffres principaux sont joints aux faits, sinon l'IA ne peut pas comparer. */
