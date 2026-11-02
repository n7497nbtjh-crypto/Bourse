/* ---------- Europe francophone (2/11/2026) : le pays du visiteur ----------
   France (par défaut), Belgique, Suisse, Luxembourg. Choix mémorisé sur l'appareil (bilan.pays), visible en haut
   d'« Apprendre » et de l'Académie. Hors France :
   - les leçons propres à la France (livrets, PEA, assurance-vie, flat tax…) sont remplacées par celles du pays
     (cf/site/data/academie-pays.json, sources officielles datées) ; les leçons universelles ne changent pas ;
   - « L'impôt selon le compte » devient un calcul simplifié pour le pays ; « Livret A ou Bourse » prévient que
     le Livret A est français et renvoie à l'équivalent ; la pastille PEA des fiches est masquée.
   Styles : site.css, bloc « Pays ». */
const PAYS = { fr: ["France", "🇫🇷"], be: ["Belgique", "🇧🇪"], ch: ["Suisse", "🇨🇭"], lu: ["Luxembourg", "🇱🇺"] };
let PAYS_DATA = null;
const paysGet = () => { const ip = document.documentElement.dataset.paysIp; const d = PAYS[ip] ? ip : "fr"; try { const p = localStorage.getItem("bilan.pays"); return PAYS[p] ? p : d; } catch (e) { return d; } }; // choix mémorisé, sinon le pays d'où l'on visite (Cloudflare), sinon la France
function paysCharger() { return PAYS_DATA ? Promise.resolve(PAYS_DATA) : fetch("/data/academie-pays.json").then(r => r.json()).then(j => PAYS_DATA = j).catch(() => null); }
function paysAppliquer(aca, pd, p) { // remplace, dans l'Académie chargée, les leçons propres à la France par celles du pays
  if (!aca || !pd || p === "fr" || !pd.pays[p] || aca._pays === p) return aca;
  const P = pd.pays[p], L = P.lecons, fr = pd.fr_seul;
  aca._pays = p;
  aca.modules.forEach(m => {
    const out = fr[m.id] || []; if (!out.length) return;
    const garde = m.lecons.filter(l => !out.includes(l.id));
    if (m.id === "bases") { const i = m.lecons.findIndex(l => l.id === "epargne-precaution"); m.lecons = garde; if (L["epargne-precaution"]) m.lecons.splice(Math.max(0, i), 0, L["epargne-precaution"]); }
    else if (m.id === "placements") { m.titre = `Les placements disponibles ${P.en}`; m.lecons = [...["pilier-3a", "epargne-pension", "prevoyance-vieillesse", "compte-titres"].map(k => L[k]).filter(Boolean), ...garde]; if (P.quiz) m.quiz = P.quiz; m.intro = `L'épargne pour la retraite, le compte-titres et leurs règles ${P.en} en 2026, avec leurs sources officielles. Les leçons sur les actions, les obligations et les ETF valent partout.`; m.objectifs = [`Connaître les comptes et les avantages fiscaux disponibles ${P.en}`, "Distinguer le compte qui contient les titres des titres eux-mêmes", "Comprendre le fonctionnement des actions, obligations et ETF"]; }
    else if (m.id === "frais-fiscalite") { m.lecons = [...garde, L.fiscalite].filter(Boolean); m.quiz = (m.quiz || []).filter(q => !/PEA|Livret|assurance-vie|flat|PFU|31,4|IFU|prélèvements sociaux/i.test(JSON.stringify(q))); }
    else if (m.id === "psychologie") { m.lecons = m.lecons.map(l => l.id === "arnaques" && L.arnaques ? L.arnaques : l); }
    m.lecons.forEach(l => { if (L[l.id] === l) l.pays = p; });
  });
  return aca;
}
function paysInitAcademie() { // branché sur le chargement de l'Académie (ACA / ACAP, app.js)
  const p = paysGet(); document.documentElement.dataset.pays = p;
  if (p === "fr") return;
  const base = ACA ? Promise.resolve(ACA) : (ACAP || fetch("/data/academie.json").then(r => r.json()).then(j => ACA = j).catch(() => null));
  ACAP = Promise.all([base, paysCharger()]).then(([a, pd]) => { ACA = paysAppliquer(a, pd, p); return ACA; });
}
function paysChoisir(p) {
  if (!PAYS[p]) return; try { localStorage.setItem("bilan.pays", p); } catch (e) { }
  ACA = null; ACAP = null; paysInitAcademie();
  if (typeof route === "function") route(); else location.reload();
}
function paysBarreHTML() {
  const p = paysGet();
  return `<div class="pays-bar" role="group" aria-label="Votre pays"><span>Vous investissez depuis :</span>${Object.entries(PAYS).map(([k, [n, d]]) => `<button type="button" data-pays="${k}" class="${k === p ? "on" : ""}" aria-pressed="${k === p}"><i aria-hidden="true">${d}</i>${n}</button>`).join("")}${p !== "fr" ? `<small>Les leçons sur l'épargne, les comptes et l'impôt sont adaptées à la ${p === "lu" ? "situation au Luxembourg" : p === "ch" ? "situation en Suisse" : "situation en Belgique"}. Montants 2026, sources officielles en bas de chaque leçon.</small>` : ""}</div>`;
}
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest(".pays-bar [data-pays]"); if (b) { e.preventDefault(); paysChoisir(b.dataset.pays); } });
const PAYS_CARTES = { // les deux premières cartes d'« Apprendre » (réserve, compte), hors France
  be: [["sur un compte d'épargne réglementé", "Intérêts exonérés jusqu'à 1 020 € par personne en 2026, puis taxés à 15 %.", "/academie/bases/epargne-precaution"], ["Compte-titres", "et l'épargne-pension pour la retraite", "Pas d'équivalent du PEA en Belgique. Chaque achat ou vente paie la taxe de Bourse ; depuis 2026, les plus-values sont taxées à 10 % au-delà de 10 000 € par an.", "/academie/placements/compte-titres", "Le compte-titres et la TOB →"]],
  ch: [["sur un compte épargne", "Intérêts imposables comme revenu ; dépôts garantis jusqu'à 100 000 francs par banque.", "/academie/bases/epargne-precaution"], ["Pilier 3a", "puis un dépôt-titres", "Jusqu'à 7 258 francs déductibles en 2026 pour un salarié. Sur un dépôt-titres, les gains en capital privés ne sont pas imposés.", "/academie/placements/pilier-3a", "Le pilier 3a →"]],
  lu: [["sur un compte d'épargne", "Intérêts soumis à une retenue libératoire de 20 % ; dépôts garantis jusqu'à 100 000 € par banque.", "/academie/bases/epargne-precaution"], ["Compte-titres", "et la prévoyance-vieillesse", "Plus-values exonérées après six mois de détention ; jusqu'à 4 500 € déductibles par an pour la retraite depuis 2026.", "/academie/placements/compte-titres", "Le compte-titres →"]] };
function paysPoser() { // la barre se pose sous le titre des pages Apprendre et Académie ; les cartes « réserve » et « compte » suivent le pays
  const h = $("#app h1"); if (!h || $(".pays-bar", app)) return;
  h.insertAdjacentHTML("afterend", paysBarreHTML());
  const p = paysGet(), C = PAYS_CARTES[p], cs = $$(".cm3-c", app); if (!C || cs.length < 2) return;
  const [r, c] = C, set = (el, sel, t) => { const x = el.querySelector(sel); if (x && t != null) x.textContent = t; };
  set(cs[0], ".cm3-u", "de dépenses, " + r[0]); set(cs[0], ".cm3-d", r[1]); cs[0].setAttribute("href", r[2]);
  set(cs[1], ".cm3-v", c[0]); set(cs[1], ".cm3-u", c[1]); set(cs[1], ".cm3-d", c[2]); set(cs[1], ".cm3-l", c[4]); cs[1].setAttribute("href", c[3]);
}

/* ---------- Calcul simplifié de l'impôt, hors France (remplace « PEA ou compte-titres ») ---------- */
const PAYS_FISC = {
  be: { t: "Belgique", cur: "€", ch: [["div", "Dividendes bruts reçus dans l'année", 1500], ["pv", "Plus-values réalisées dans l'année (gains de 2026 et après)", 4000], ["ops", "Montant total de vos achats et ventes", 12000]], sel: ["tob", "Type de titres", [["0.35", "Actions (TOB 0,35 %)"], ["0.12", "ETF enregistrés ailleurs dans l'EEE (0,12 %)"], ["1.32", "ETF de capitalisation enregistrés en Belgique (1,32 %)"]]],
    calc: x => { const d = Math.max(0, x.div - 833) * 0.30, g = Math.max(0, x.pv - 10000) * 0.10, t = x.ops * x.tob / 100; return [["Précompte sur dividendes", d, `30 % au-delà des 833 € exonérés (à réclamer dans la déclaration)`], ["Taxe sur les plus-values", g, "10 % au-delà de la franchise de 10 000 €"], ["Taxe sur les opérations de Bourse", t, "plafonnée par opération : 1 300 €, 1 600 € ou 4 000 € selon le taux"]]; },
    src: [["SPF Finances, exonération des dividendes", "https://fin.belgium.be/fr/particuliers/avantages-fiscaux/exoneration-dividendes"], ["Test-Achats, taxe sur les plus-values", "https://www.test-achats.be/argent/impots/news/taxe-plus-values"], ["Test-Achats, taxe sur les opérations de Bourse", "https://www.test-achats.be/invest/fiscalite-et-droits/taxation/dossiers/taxe-de-bourse/taxe-operation-bourse"]],
    note: "Les dividendes étrangers subissent en plus l'impôt du pays d'origine. Les plus-values constituées avant le 1er janvier 2026 sont exonérées." },
  ch: { t: "Suisse", cur: "CHF", ch: [["div", "Dividendes bruts reçus dans l'année", 1500], ["tm", "Votre taux marginal d'imposition estimé, en %", 25], ["pv", "Gains réalisés en vendant des titres", 4000], ["ops", "Montant total de vos achats et ventes chez un courtier suisse", 12000]], sel: ["dt", "Titres achetés et vendus", [["0.075", "Suisses (droit de timbre 0,075 %)"], ["0.15", "Étrangers (0,15 %)"], ["0", "Courtier étranger (pas de droit de timbre)"]]],
    calc: x => [["Impôt sur les dividendes", x.div * x.tm / 100, "imposés comme revenu ; l'impôt anticipé de 35 % est récupéré via la déclaration"], ["Impôt sur les gains", 0, "gains en capital privés non imposés (hors commerçant professionnel de titres)"], ["Droit de timbre de négociation", x.ops * x.dt / 100, "prélevé par le courtier suisse à chaque opération"]],
    src: [["PostFinance, déclarer les actions en Suisse", "https://www.postfinance.ch/fr/blog/placer-de-largent-mode-demploi/declarer-les-actions-en-suisse.html"], ["PostFinance, courtages et droit de timbre", "https://www.postfinance.ch/fr/particuliers/placements/solutions/trading-en-ligne/e-trading/courtages-et-autres-frais.html"]],
    note: "Les titres comptent aussi dans votre fortune imposable (impôt cantonal sur la fortune), non calculé ici." },
  lu: { t: "Luxembourg", cur: "€", ch: [["div", "Dividendes bruts reçus dans l'année", 1500], ["tm", "Votre taux marginal d'imposition estimé, en %", 30], ["pv", "Plus-values réalisées dans l'année", 4000]], sel: ["duree", "Titres vendus après", [["long", "Plus de six mois (participation de 10 % au plus)"], ["court", "Moins de six mois"]]], sel2: ["ue", "Dividendes versés par", [["1", "Des sociétés luxembourgeoises ou de l'UE (50 % exonérés)"], ["0", "D'autres sociétés"]]],
    calc: x => { const base = x.ue === "1" ? x.div * 0.5 : x.div, d = base * x.tm / 100, g = x.duree === "court" && x.pv >= 500 ? x.pv * x.tm / 100 : 0; return [["Impôt sur les dividendes", d, x.ue === "1" ? "barème progressif sur 50 % du montant brut" : "barème progressif sur le montant brut"], ["Impôt sur les plus-values", g, x.duree === "court" ? (x.pv < 500 ? "gains spéculatifs sous 500 € sur l'année : exonérés" : "plus-value spéculative imposée au barème") : "exonérées après six mois de détention"], ["Taxe de Bourse", 0, "pas de taxe luxembourgeoise sur les opérations"]]; },
    src: [["Guichet.lu, achat et vente d'actions", "https://guichet.public.lu/fr/citoyens/fiscalite/declaration-impot-decompte/capitaux-mobiliers/banque-dividende-interets/achat-vente-actions.html"], ["Guichet.lu, dividendes", "https://guichet.public.lu/fr/citoyens/fiscalite/declaration-impot-decompte/capitaux-mobiliers/banque-dividende-interets/identifier-declarer-dividendes.html"]],
    note: "Un allongement du délai de six à douze mois a été annoncé pour 2027 : vérifiez la règle en vigueur avant de vendre." } };
function pageFiscPays(p) {
  const F = PAYS_FISC[p]; setNav("sim"); setTitle(`Simulateur : l'impôt sur vos placements (${F.t})`);
  const sels = [F.sel, F.sel2].filter(Boolean);
  app.innerHTML = `<div class="crumbs"><a href="/outils">Outils</a> › Simulateur</div><h1 class="pagetitle">L'impôt sur vos placements, ${p === "lu" ? "au" : "en"} ${F.t}</h1>
    <p class="pagesub">Un calcul simplifié pour une année, avec les règles 2026. Il ne remplace pas votre déclaration ni l'avis d'un conseiller fiscal.</p>
    <section class="panel pays-sim"><div class="pays-in">${F.ch.map(([k, l, v]) => `<label>${esc(l)}<input type="number" inputmode="decimal" min="0" data-k="${k}" value="${v}"></label>`).join("")}${sels.map(([k, l, o]) => `<label>${esc(l)}<select data-k="${k}">${o.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join("")}</select></label>`).join("")}</div>
    <div class="pays-out" id="pays-out"></div><p class="pays-note">${esc(F.note)}</p>
    <p class="pays-src">Sources : ${F.src.map(([l, u]) => `<a class="lnk" href="${u}" target="_blank" rel="noopener">${esc(l)}</a>`).join(" · ")}</p></section>
    <p class="pays-chg">Vous investissez depuis un autre pays ? <a class="lnk" href="/apprendre">Changer de pays dans « Apprendre »</a></p>`;
  const go = () => { const x = {}; $$(".pays-sim [data-k]").forEach(i => { x[i.dataset.k] = i.tagName === "SELECT" ? (isNaN(+i.value) || i.dataset.k === "ue" ? i.value : +i.value) : Math.max(0, parseFloat(String(i.value).replace(",", ".")) || 0); });
    const R = F.calc(x), tot = R.reduce((a, r) => a + r[1], 0), f = v => F0.format(Math.round(v)) + " " + F.cur;
    $("#pays-out").innerHTML = `<div class="pays-tot"><small>Total estimé pour l'année</small><b>${f(tot)}</b></div>${R.map(([l, v, n]) => `<div class="pays-l"><span>${esc(l)}<small>${esc(n)}</small></span><b>${f(v)}</b></div>`).join("")}`; };
  $$(".pays-sim [data-k]").forEach(i => i.addEventListener("input", go)); go();
}

/* ---------- branchements ---------- */
paysInitAcademie();
(() => {
  const wrap = (nom, apres) => { const f0 = window[nom]; if (typeof f0 !== "function") return; window[nom] = async function () { const r = await f0.apply(this, arguments); try { apres.apply(this, arguments); } catch (e) { } return r; }; };
  wrap("pageApprendre", paysPoser);
  wrap("pageAcademie", (mid, lid) => { paysPoser(); const p = paysGet(); if (p === "fr" || !lid) return; });
  const sim0 = window.pageSim;
  if (typeof sim0 === "function") window.pageSim = function (tool) { const p = paysGet(); if (tool === "pea-cto" && p !== "fr" && PAYS_FISC[p]) return pageFiscPays(p); return sim0.apply(this, arguments); };
  wrap("pageEnveloppes", () => { const p = paysGet(); if (p === "fr") return; const h = $("#app h1"); if (!h) return;
    const L = { be: ["/academie/placements/compte-titres", "Le compte-titres et la taxe de Bourse en Belgique"], ch: ["/academie/placements/pilier-3a", "Le pilier 3a et le dépôt-titres en Suisse"], lu: ["/academie/placements/compte-titres", "Le compte-titres au Luxembourg"] }[p];
    h.insertAdjacentHTML("afterend", `<div class="pays-info"><b>${PAYS[p][1]} Cette page décrit les comptes français</b> (PEA, compte-titres, assurance-vie), réservés aux personnes domiciliées en France pour le PEA. Pour votre pays : <a class="lnk" href="${L[0]}">${L[1]}</a> · <a class="lnk" href="/simulateurs/pea-cto">l'impôt sur vos placements</a></div>`); });
  wrap("pageLivretBourse", () => { const p = paysGet(); if (p === "fr") return; const h = $("#app h1"); if (!h) return;
    const eq = { be: "le compte d'épargne réglementé (intérêts exonérés jusqu'à 1 020 € en 2026)", ch: "le compte épargne bancaire, et le pilier 3a pour la retraite", lu: "le compte d'épargne (retenue libératoire de 20 % sur les intérêts)" }[p];
    h.insertAdjacentHTML("afterend", `<div class="pays-info"><b>${PAYS[p][1]} Vous investissez depuis ${p === "lu" ? "le Luxembourg" : p === "ch" ? "la Suisse" : "la Belgique"}.</b> Le Livret A est un placement français. Ce comparateur reste utile comme repère : chez vous, l'équivalent est ${eq}. <a class="lnk" href="/academie/bases/epargne-precaution">L'épargne de précaution ${p === "lu" ? "au" : "en"} ${PAYS[p][0]}</a></div>`); });
})();
