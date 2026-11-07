/* ---------- Fiche ETF v4 (3/11/2026) : maquette validée docs/maquettes/etf-v1.html ----------
   Construite d'un bloc avec les composants partagés (m/composants.js, composants.css) : en-tête jaune (frais face à la médiane de la
   catégorie), verdict, chaîne des repères, fil en étapes (contenu, pays, performance, frais, fonctionnement, détention), ETF du même
   indice, IA, « Prouvé », avis et discussion. Performance : historique officiel des émetteurs (data/etf_historique.mjs → /data/etf-hist).
   Une étape sans donnée n'est pas affichée ; aucun chiffre n'est écrit s'il ne vient pas des fichiers du site. Remplace window.pageEtf. */
const E4 = { perf: null };
const e4Pc = (r, d = 1, sign = true) => r == null || !isFinite(r) ? "–" : (sign && r > 0 ? "+" : r < 0 ? "−" : "") + ekFr(Math.abs(r * 100), d) + " %";
const e4P = (v, d = 1) => v == null || !isFinite(v) ? "–" : ekFr(v, d) + " %";
const E4_ADJ = { US: "américain", JP: "japonais", FR: "français", DE: "allemand", GB: "britannique", CN: "chinois", IN: "indien", CH: "suisse", CA: "canadien", IT: "italien", ES: "espagnol", NL: "néerlandais", KR: "coréen", TW: "taïwanais", BR: "brésilien", AU: "australien" };
function e4Dans(code) { // « aux États-Unis », « en France », « au Japon », « à Taïwan »
  const n = (typeof COUNTRY !== "undefined" && COUNTRY[code]) || code;
  if (/^(États-Unis|Pays-Bas|Philippines|Émirats)/.test(n)) return "aux " + n;
  if (/^(Taïwan|Singapour|Hong Kong|Chypre|Malte)/.test(n)) return "à " + n;
  if (/^[AEIOUÉÈÂÎ]/i.test(n) || (/e$/.test(n) && !/^(Mexique|Cambodge|Mozambique|Zimbabwe)$/.test(n))) return "en " + n;
  return "au " + n;
}
// Nom court : sans la parenthèse finale (indice ou type de part), « · distrib. » gardé pour distinguer les parts distribuantes
const e4Court = r => { const n = String(r.name || ""), b = n.replace(/\s*\([^)]*\)/g, " ").replace(/\s+/g, " ").trim(); return b === n || b.length < 4 ? n : b + (/\(distrib/i.test(n) ? " · distrib." : ""); };
// ETF du même indice, sans les fonds gérés activement qui ne font que s'y comparer (« Enhanced », « Active », ESG…), une part par nom court
function e4Memes0(x) {
  const act = /enhanced|active|esg|isr|sri|defensive|paris.aligned|climate|screened/i, moiAct = act.test(x.e.name), vus = new Set([e4Court(x.e)]);
  return x.same.filter(r => r.ter != null && (moiAct || !act.test(r.name))).sort((a, b) => (b.encours || 0) - (a.encours || 0)).filter(r => { const k = e4Court(r); if (vus.has(k)) return false; vus.add(k); return true; });
}
const E4_SECT = { it: "Technologie", fin: "Finance", sante: "Santé", conso_disc: "Consommation", indus: "Industrie", comm: "Communication", conso_base: "Produits courants", energie: "Énergie", materiaux: "Matériaux", services_pub: "Eau, gaz, électricité", immo: "Immobilier", liquidites: "Liquidités", autre: "Autres" };
const e4SansIdx = (r, idx) => { const n = e4Court(r); if (!idx) return n; const t = n.replace(new RegExp("\\s*" + idx.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*", "i"), " ").replace(/\s+/g, " ").trim(); return t.length >= 3 ? t : n; };
const e4Fr = () => typeof frSeul === "function" ? frSeul() : true; // 3/11 : visiteur en France (choix ou détection, m/pays.js)
const e4Bond = e => ["obligations", "monetaire"].includes(e.categorie);

async function pageEtf4(id) {
  const e = ETFBY[id]; if (!e) return pageNotFound();
  setNav("etf"); setTitle(`${e.name} : composition, frais, performance`);
  app.innerHTML = `<div class="ek ek-page"><div class="empty">Chargement de la fiche…</div></div>`;
  if (!e.proxy || e.compo) { const F = await ETF_fichier(e); if (F && F.info) Object.assign(e, F.info); }
  const [c, H, P] = await Promise.all([etfComp(e).catch(() => null), getJSON(`/data/etf-hist/${id}.json`, null), E4.perf || getJSON("/data/etf-perf.json", null)]);
  if (location.pathname !== "/etf/" + id) return;
  E4.perf = P;
  let C = c;
  if (c && !c.niveau) { // ancien format : fonds américain de référence (SEC) ; secteurs d'après les entreprises reconnues par le site
    const m = {}; let known = 0; for (const [isin, w] of c.isins || []) { const co = ISINBY[isin]; if (co) { const k = "§" + co.sector; m[k] = (m[k] || 0) + w; known += w; } }
    C = { ...c, niveau: "indice", proxy: c.proxy || e.proxy, sectors: known > 40 ? Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, w]) => [k, w * 100 / known]) : [] };
  }
  const x = e4Ctx(e, C, H, P);
  let html = "";
  try { html = e4Tete(x) + e4Fil(x) + e4Memes(x) + e4Fin(x); }
  catch (err) { console.error("etf v4", err); html = e4Tete(x) + `<p class="ek-note">Une partie de la fiche n'a pas pu s'afficher.</p>`; }
  app.innerHTML = `<div class="ek ek-page" data-e4="${esc(id)}">${html}</div>`;
  try { avisBlock($("#e4avis"), "etf-" + e.id, e.name); } catch (err) { }
  window.E4X = x;
  const h0 = location.hash.slice(1), ANC = { ebuy: "t1", ecomp: "t1", efrais: "frais", erisques: "fonct", equestions: "e4ia" };
  const t = document.getElementById(ANC[h0] || h0); if (t) setTimeout(() => t.scrollIntoView({ block: "start" }), 30);
}

// ——— Tout ce que la fiche calcule, une seule fois ———
function e4Ctx(e, C, H, P) {
  const bond = e4Bond(e), v = ETF_terVerdict(e), rk = ETF_rank(e, x => x.ter, false), { same: same0, cat } = ETF_voisins(e), same = e4Memes0({ e, same: same0 });
  const tops = C && C.top ? C.top.slice(0, 10) : [], t10 = tops.reduce((a, t) => a + (t.pct || 0), 0);
  const ctry = C ? (C.countries || []).filter(k => k[1] >= 0.5 && k[0] !== "XS" && k[0] !== "EU") : [], secs = C && !bond ? (C.sectors || []).filter(s => s[1] >= 0.5) : [];
  const hors = C && C.countries && C.countries.length ? C.countries.filter(([k]) => !ETF_EURO.has(k) && k !== "XS").reduce((a, k) => a + k[1], 0) : null;
  const items = (P && P.items) || {}, peers = ETF_peers(e), pf = H && H.perf;
  const medA1 = (() => { const a = peers.map(p => items[p.id] && !items[p.id].sansDiv && items[p.id].a1).filter(v => v != null && v !== false); return a.length >= 5 ? f4Med(a) : null; })();
  const medEnc = f4Med(peers.map(p => p.encours).filter(v => v > 0));
  const n = (C && C.lines) || (e.compo && e.compo.n) || null, pays = (C && (C.countries || []).filter(k => k[0] !== "XS" && k[0] !== "EU").length) || (e.compo && e.compo.pays) || null;
  const mot = bond ? "obligations" : e.categorie === "immobilier" ? "sociétés immobilières" : "entreprises";
  return { e, C, H, pf, bond, v, rk, same, cat, tops, t10, ctry, secs, hors, items, medA1, medEnc, n, pays, mot, fr: e4Fr(), synth: e.replication === "synthétique" };
}

// ——— En-tête ———
function e4Tete(x) {
  const { e, v, rk } = x, pl = ETF_place(e);
  const sub = e.fiche ? esc(typeof sansPea === "function" ? sansPea(e.fiche.quoi) : e.fiche.quoi) : `${x.n ? `${F0.format(x.n)} ${x.mot}${x.pays > 1 ? ` de ${F0.format(x.pays)} pays` : ""} en une seule ligne.` : ""} `;
  const tags = [e.pea === true && x.fr ? `<span class="g">Éligible au PEA ✓</span>` : e.pea === false && x.fr ? `<span>Hors PEA</span>` : "",
    e.distribution ? `<span>${e.distribution === "distribution" ? "Distribuant" : "Capitalisant"}</span>` : "",
    e.replication ? `<span>Réplication ${esc(e.replication)}${e.methode === "échantillonnée" ? " (échantillon)" : ""}</span>` : "",
    e.couvert ? `<span>Couvert en euros</span>` : "", e.levier ? `<span class="r">Levier ou inverse</span>` : "",
    `<span>${esc(e.issuer)}${e.domicile ? ` · fonds ${esc(e.domicile === "France" ? "français" : e.domicile === "Irlande" ? "irlandais" : e.domicile === "Luxembourg" ? "luxembourgeois" : e.domicile === "Allemagne" ? "allemand" : "de droit " + e.domicile)}` : ""}</span>`].join("");
  const pos = rk ? (v && Math.abs(e.ter - v.m) < 0.005 ? 50 : Math.round((1 - rk.p) * 100)) : null;
  const carte = e.ter != null ? `<div class="et-card"><div class="k">Frais courants</div><div class="v">${e4P(e.ter, 2)}<small>par an</small></div>
      <div class="eu">soit ${eur(e.ter * 10, Math.abs(e.ter * 10 - Math.round(e.ter * 10)) < 0.05 ? 0 : 1)} par an pour 1 000 € placés</div>
      ${pos != null && v ? `<div class="et-gauge"><i style="left:50%"><em>médiane ${e4P(v.m, 2)}</em></i><b style="left:${Math.max(3, Math.min(97, pos))}%"></b></div><div class="et-gl"><span>moins cher</span><span>plus cher</span></div>
      <p class="et-gn">Face aux ${F0.format(rk.n)} ETF « ${esc(ECAT[e.categorie] || "de sa catégorie")} » suivis par le site.</p>` : ""}
      ${e.tv ? `<button type="button" class="ek-lk tv" data-e4-tv>Voir le graphique du cours ↗</button>` : ""}</div>` : `<div class="et-card"><div class="k">Frais courants</div><p class="eu">Non communiqués par l'émetteur.</p></div>`;
  return `<section class="ek-hero"><div class="et-hero"><div>
      <div class="ek-crumb"><a href="/etf">ETF</a><span>›</span><a href="/etf?cat=${esc(e.categorie || "")}">${esc(ECAT[e.categorie] || "Autres")}</a></div>
      <h1>${esc(e.name)}</h1>
      <p class="et-sub">${sub}${e.index ? ` Il suit l'indice <b>${esc(e.index)}</b>.` : ""}</p>
      <div class="et-tags">${tags}</div>
      <div class="et-id">${e.ticker ? `Ticker <b>${esc(e.ticker)}</b>${pl ? ` · ${esc(pl.place)}` : ""}` : ""}<code>${esc(e.isin)}</code><button type="button" class="et-cp" data-e4-copy="${esc(e.isin)}">copier</button></div>
    </div>${carte}</div>
    <div id="e4tv" hidden></div>
    ${e4Verdict(x)}${e4Chaine(x)}
    <div class="ek-medl"><span>Chaque repère est placé face à la ${ekDefMot("mediane", "médiane", {})} des ETF de sa catégorie.</span>
      <div class="ek-acts">${typeof favBtn === "function" ? favBtn("e:" + e.id).replace('class="favbtn', 'class="ek-btn dk favbtn') : ""}<button type="button" class="ek-btn" data-e4-pf>+ Mon portefeuille</button><button type="button" class="ek-btn bl" data-f4-ia>✦ Poser une question à l'IA</button></div></div>
  </section>`;
}

function e4Verdict(x) {
  const { e, v, t10, ctry, tops } = x, p1 = ctry[0];
  const a = !tops.length ? "" : t10 > 50 ? "<em>Très concentré</em>" : t10 > 30 ? "Assez concentré" : x.n >= 200 ? "Très diversifié" : "Diversifié";
  const b = !v ? "" : v.c === "g" ? "frais bas" : v.c === "o" ? "<em>frais élevés</em>" : "frais dans la norme";
  const c = e.levier ? "<em>à levier</em>" : p1 && p1[1] >= 60 ? `<em>surtout ${E4_ADJ[p1[0]] || e4Dans(p1[0]).replace(/^(en|au|aux|à) /, "") }</em>` : x.synth && e.pea && x.fr ? "logé en PEA par un contrat" : "";
  const parts = [a, b, c].filter(Boolean); if (!parts.length) return "";
  return `<div class="ek-vrd"><span class="ek-stk2" style="background:#fff">Le verdict</span><h2>${parts.join(", ").replace(/^(<em>)?(\w|É)/, (m0, t, l) => (t || "") + l.toUpperCase())}.</h2></div>`;
}

// ——— Les étapes (construites une fois : la chaîne et le fil en sont tirés) ———
function e4Etapes(x) {
  if (x.E) return x.E;
  const { e } = x, E = [];
  // 1. Ce qu'il contient
  if (x.tops.length) {
    const mx = x.tops[0].pct || 1, ini = t => String(ETF_nomLigne(t)).replace(/[^A-Za-zÀ-ÿ0-9 ]/g, " ").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
    const reste = x.n ? x.n - x.tops.length : null, t3 = x.tops.slice(0, 3).reduce((a, t) => a + (t.pct || 0), 0);
    const noms = x.tops.map(t => ETF_nomLigne(t)), dbl = n => noms.filter(v => v === n).length > 1;
    const barres = `<div class="et-top">${x.tops.map((t, i) => { const co = e4Societe(t), cl = dbl(noms[i]) && (String(t.name).match(/\bCL(?:ASS)?\.?\s+([A-Z])\b/i) || [])[1], nm = esc(noms[i] + (cl ? ` (${cl.toUpperCase()})` : "")); return `<div><span class="nm">${co ? f4Logo(co, ini(t), true) : `<span class="ek-lg ek-lg-s" aria-hidden="true">${esc(ini(t))}</span>`}${co ? `<a href="/entreprise/${esc(co.id)}">${nm}</a>` : `<span>${nm}</span>`}</span><i style="width:${(t.pct || 0) / mx * 100}%"></i><b>${ekFr(t.pct || 0, 1)} %</b></div>`; }).join("")}${reste > 0 ? `<div class="sep">Les ${F0.format(reste)} autres lignes : ${ekFr(Math.max(0, 100 - x.t10), 1)} % de l'ETF</div>` : ""}</div>`;
    const vis = ekBox({ titre: "Les 10 plus grosses lignes", unite: "part de l'ETF", indice: `Chaque barre est la part de l'ETF placée dans une ligne.${reste > 0 ? ` Les ${F0.format(reste)} autres pèsent ensemble le reste.` : ""} Un nom souligné mène à la fiche de l'entreprise.`, source: { texte: e4SrcCompo(x), lien: x.C && x.C.source && x.C.source.url, label: "voir la source ↗" } }, barres);
    const conc = x.t10 > 50;
    const droite = `<div class="et-side"><p class="h">À retenir</p><div class="et-risk">${x.n >= 100 ? `<div><span class="g">diversifié</span><p>${F0.format(x.n)} lignes : la faillite de l'une d'elles pèse très peu.</p></div>` : ""}<div><span class="${conc ? "r" : "o"}">${conc ? "concentré" : "mais"}</span><p>Les 10 premières font ${ekFr(x.t10, 0)} % de l'ETF, dont ${ekFr(t3, 0)} % pour ${x.tops.slice(0, 3).map(t => esc(ETF_nomLigne(t))).join(", ").replace(/, ([^,]*)$/, " et $1")}.</p></div></div></div>`;
    E.push({ sur: "Ce qu'il contient", concept: { cle: "diversification" }, titre: x.n ? `${F0.format(x.n)} ${x.mot} en une seule ligne.` : "ses plus grosses lignes.", visuel: vis, explique: droite,
      q: "", ch: ["Ce qu'il contient", x.n ? F0.format(x.n) : ekFr(x.t10, 0) + " %", x.n >= 200 && x.t10 < 35 ? "g" : x.t10 > 50 ? "r" : "", x.n ? `${x.mot}${x.pays > 1 ? ` dans ${F0.format(x.pays)} pays` : x.pays === 1 ? ", un seul pays" : ""}` : "dans les 10 premières lignes", `10 premières : ${ekFr(x.t10, 0)} %`] });
  } else {
    E.push({ sur: "Ce qu'il contient", concept: { cle: "diversification" }, titre: e.categorie === "matieres" ? "pas un panier d'entreprises." : "sa composition n'est pas encore relevée.",
      visuel: "", explique: `<div class="et-side"><p class="h">Ce que vous achetez</p><p class="et-p">${ETF_phrase(e, x.C)}</p>${e.fiche && e.fiche.varie ? `<p class="et-p"><b>Ce qui fait varier sa valeur :</b> ${esc(e.fiche.varie)}</p>` : ""}</div>`,
      q: "", ch: ["Ce qu'il contient", e.categorie === "matieres" ? "Matière" : "–", "", e.categorie === "matieres" ? "première, pas des entreprises" : "composition non relevée", ""] });
  }
  // 2. Où va l'argent
  if (x.ctry.length) {
    const hb = (L, c) => { const mx = Math.max(...L.map(k => k[1])); return `<div class="et-hb">${L.map(k => `<div><span>${esc(k[0])}</span><i style="width:${k[1] / mx * 100}%;${c ? `background:${c}` : ""}"></i><b>${ekFr(k[1], 1)} %</b></div>`).join("")}</div>`; };
    const tronque = (L, nom, nb) => { const t = L.slice(0, nb), r = L.slice(nb).reduce((a, k) => a + k[1], 0); return r >= 0.5 ? [...t, [nom, r]] : t; };
    const PA = tronque(x.ctry.map(([k, w]) => [COUNTRY[k] || k, w]), "Autres pays", 6), SE = tronque(x.secs.filter(s => s[0] !== "liquidites").map(([k, w]) => [k[0] === "§" ? (R.sectors[k.slice(1)] || k.slice(1)) : (E4_SECT[k] || ETF_SECT[k] || k), w]), "Autres", 6);
    const vis = ekBox({ titre: "Où va votre argent", unite: "part de l'ETF", indice: `Le poids de chaque pays${SE.length ? " et de chaque secteur" : ""} dans l'ETF.`, source: { texte: e4SrcCompo(x), lien: x.C && x.C.source && x.C.source.url, label: "voir la source ↗" } },
      (PA.length === 1 && SE.length
        // Un seul pays : la colonne « Par pays » n'aurait qu'une barre ; le pays est écrit en tête, les secteurs prennent toute la largeur
        ? `<p class="et-1p"><b>${ekFr(PA[0][1], 0)} %</b> ${esc(e4Dans(x.ctry[0][0]))} : un seul pays</p><div class="et-two un"><div><h4>Par secteur</h4>${hb(SE, "#7FE0B9")}</div></div>`
        : `<div class="et-two${SE.length ? "" : " un"}"><div><h4>Par pays</h4>${hb(PA)}</div>${SE.length ? `<div><h4>Par secteur</h4>${hb(SE, "#7FE0B9")}</div>` : ""}</div>`));
    const p1 = x.ctry[0], hors = x.hors;
    const R2 = [];
    if (hors != null && hors > 20 && !e.couvert) R2.push(["r", "change", `${ekFr(hors, 0)} % hors zone euro : si ces devises baissent face à l'euro, l'ETF baisse aussi, même si les cours ne bougent pas.`]);
    else if (e.couvert) R2.push(["g", "couvert", "Cette part est couverte contre le change ; la couverture a un coût, compris dans la performance."]);
    else if (hors != null) R2.push(["g", "euro", `${ekFr(100 - hors, 0)} % en zone euro : peu d'effet du change.`]);
    if (p1[1] >= 50) R2.push(["o", "un pays", `${esc(COUNTRY[p1[0]] || p1[0])} pèse ${ekFr(p1[1], 0)} % : l'ETF dépend d'abord de l'économie de ce pays.`]);
    if (SE[0] && SE[0][1] >= 25 && SE[0][0] !== "Autres") R2.push(["o", "un secteur", `${esc(SE[0][0])} : ${ekFr(SE[0][1], 0)} % de l'ETF.`]);
    const tit = hors != null && hors < 15 ? "presque tout en euros." : p1[1] >= 60 ? `surtout ${e4Dans(p1[0])}.` : p1[1] >= 30 ? `d'abord ${e4Dans(p1[0])}.` : `réparti entre ${F0.format(x.ctry.length)} pays.`;
    E.push({ sur: "Où va l'argent", concept: { cle: "change" }, titre: tit, visuel: vis, explique: R2.length ? `<div class="et-side"><p class="h">Ce que ça change pour vous</p><div class="et-risk">${R2.map(r => `<div><span class="${r[0]}">${r[1]}</span><p>${r[2]}</p></div>`).join("")}</div></div>` : "",
      q: x.secs.length ? "Mais dans quels pays et quels métiers ?" : "Mais dans quels pays ?", ch: ["Où va l'argent", ekFr(p1[1], 0) + " %", p1[1] >= 60 ? "r" : "", e4Dans(p1[0]), hors != null ? `hors zone euro : ${ekFr(hors, 0)} %` : "le premier pays"] });
  }
  // 3. Sa performance
  E.push(e4Perf(x));
  // 4. Ses frais
  if (e.ter != null) E.push(e4Frais(x));
  // 5. Son fonctionnement
  if (e.replication) E.push(e4Fonct(x));
  // 6. Le détenir
  E.push(e4Detenir(x));
  E.forEach((s, i) => { s.n = i + 1; s.id = "t" + (i + 1); if (i) E[i - 1].suite = (s.q || "").replace(/ \?/g, "\u00a0?"); });
  return x.E = E;
}
// Ligne d'un ETF → fiche entreprise du site : par l'ISIN, sinon par le nom (sociétés américaines sans ISIN dans les données)
const e4Societe = t => (t.isin && ISINBY[t.isin]) || (t.name && typeof pf3ByName === "function" ? pf3ByName(t.name) : null);
const e4SrcCompo = x => !x.C ? "Émetteur" : x.C.proxy ? `Fonds américain ${x.C.proxy} (SEC), même indice` : (x.C.source && x.C.source.nom) || "Émetteur";

function e4Perf(x) {
  const { e, pf, H } = x, q = "Qu'a-t-il rapporté ces dernières années ?";
  if (!pf) return { sur: "Sa performance", concept: { cle: "perf" }, titre: "historique non disponible.", visuel: "", q,
    explique: `<div class="et-side"><p class="h">Pourquoi ?</p><p class="et-p">Le site relève la performance sur le site officiel de l'émetteur (Amundi, iShares et HSBC pour l'instant). ${esc(e.issuer)} ne la publie pas encore sous une forme que le site peut lire pour ce fonds.${e.tv ? " Le graphique du cours, en haut de la page, montre son évolution en Bourse." : ""}</p></div>`,
    ch: ["Sa performance", "–", "", "historique non disponible", ""] };
  const ans = Object.keys(pf.annees || {}).sort().slice(ekMob() ? -5 : -6), vals = ans.map(a => pf.annees[a] * 100);
  const hausses = Object.values(pf.annees || {}).filter(v => v > 0).length, nA = Object.keys(pf.annees || {}).length;
  const per = [["1 an", pf.a1], ["3 ans", pf.a3], ["5 ans", pf.a5], ["10 ans", pf.a10]].filter(p => p[1] != null);
  const deb = pf.debut ? new Date(pf.debut + "T12:00:00") : null, ageA = deb ? (Date.now() - deb) / 31557600000 : null;
  const DIVR = H.sansDiv ? "sans les dividendes versés" : "dividendes réinvestis";
  const conv = H.deviseFonds && H.deviseFonds !== "EUR" ? ` Fonds tenu en ${esc(H.deviseFonds)}, converti en euros au taux de la BCE.` : "";
  const src = { texte: `${esc(e.issuer)}, au ${new Date(H.asOf + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`, lien: H.url, label: "fiche de l'émetteur ↗" };
  let vis;
  if (ans.length >= 2) {
    const mxv = Math.max(5, ...vals), nice = f4Nice(mxv);
    vis = ekColonnes({ titre: "Ce qu'il a rapporté chaque année", unite: `en euros, ${DIVR}, après frais`, annees: ans, valeurs: vals, fmt: v => (v > 0 ? "+" : "") + ekFr(v, 0) + " %", max: nice.max, graduations: nice.ticks, fmtAxe: t => ekFr(t, 0) + " %", sansVar: true,
      indice: `Chaque colonne est la variation de la part du 1er janvier au 31 décembre. En rouge : une année de baisse.${conv} Les performances passées ne préjugent pas des performances futures.`, source: src });
  } else {
    const L = [["6 mois", pf.m6], ["Depuis janvier", pf.ytd], ["1 an", pf.a1], ["Depuis la création", pf.depuis]].filter(p => p[1] != null);
    vis = ekBox({ titre: "Ce qu'il a rapporté", unite: `en euros, ${DIVR}, après frais`, indice: `Fonds créé ${deb ? "le " + deb.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "récemment"} : pas encore d'année civile complète.${conv} Les performances passées ne préjugent pas des performances futures.`, source: src },
      `<div class="et-nums">${L.map(p => `<div><small>${p[0]}</small><b class="${p[1] < 0 ? "r" : ""}">${e4Pc(p[1])}</b></div>`).join("")}</div>`);
  }
  const pb = pf.pireBaisse;
  const droite = `<div class="et-side"><p class="h">Sur plusieurs années</p><div class="et-cout">${per.map(p => `<div><span><b>${p[0]}</b>${p[0] === "1 an" && x.medA1 != null ? `<small>médiane de sa catégorie : ${e4Pc(x.medA1)}</small>` : ""}</span><em class="${p[1] < 0 ? "r" : ""}">${e4Pc(p[1], 0)}</em></div>`).join("")}
    ${pb ? `<div><span><b>${ekDefMot("baisse", "Pire baisse", {})}</b><small>${ageA != null && ageA < 5 ? "depuis la création" : "sur 5 ans"}, du ${new Date(pb.de + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })} au ${new Date(pb.a + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</small></span><em class="r">${e4Pc(pb.v, 0)}</em></div>` : ""}</div>
    <p class="et-hyp">En euros, ${DIVR} et frais déduits${H.sansDiv ? " (part de distribution : les dividendes versés s'ajoutent au gain)" : ""}, au ${new Date(H.asOf + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}. Ce n'est pas une prévision.</p></div>`;
  const ton = !H.sansDiv && pf.a1 != null && x.medA1 != null ? (pf.a1 - x.medA1 > 0.02 ? "g" : x.medA1 - pf.a1 > 0.02 ? "r" : "") : "";
  const titre = nA >= 2 ? (hausses ? `${hausses} année${hausses > 1 ? "s" : ""} de hausse sur ${nA}.` : `aucune année de hausse sur ${nA}.`) : nA === 1 ? "une seule année complète d'historique." : ageA != null && ageA < 2 ? `${ageA < 1 ? "moins d'un an" : ageA < 1.4 ? "un an" : "un an et demi"} d'historique.` : "ce qu'il a rapporté.";
  return { sur: "Sa performance", concept: { cle: "perf" }, titre, visuel: vis, explique: droite, q,
    cmp: ton ? { texte: ton === "g" ? "Plus que la médiane de sa catégorie sur un an" : "Moins que la médiane de sa catégorie sur un an", ton } : null,
    ch: ["Sa performance", e4Pc(pf.a1 != null ? pf.a1 : pf.depuis, 1), ton, pf.a1 != null ? (H.sansDiv ? "sur un an, sans les dividendes versés" : `sur un an, ${x.bond ? "revenus" : "dividendes"} réinvestis`) : "depuis sa création", x.medA1 != null && pf.a1 != null ? `médiane : ${e4Pc(x.medA1)}` : ""] };
}

function e4Frais(x) {
  const { e, v } = x, cmpSame = x.same.length >= 2;
  const parTer = [...x.same].sort((a, b) => a.ter - b.ter), L0 = cmpSame ? [...new Set([parTer[0], parTer[parTer.length - 1], ...x.same.slice(0, 5)])] : x.cat.slice(0, 6), L = [e, ...L0].sort((a, b) => a.ter - b.ter);
  const mx = Math.max(...L.map(r => r.ter), v ? v.m : 0) * 1.15, nice = f4Nice(mx);
  const vis = ekPoints({ titre: "Frais courants par an", unite: cmpSame ? `ETF qui suivent le ${e.index}` : "ETF de la même catégorie", basEstMieux: true, motBas: "moins cher", motHaut: "plus cher",
    lignes: L.map(r => ({ nom: e4SansIdx(r, cmpSame && e.index), v: r.ter, texte: e4P(r.ter, 2), moi: r.id === e.id })), mediane: v ? v.m : f4Med(L.map(r => r.ter)), mediane_label: `médiane ${e4P(v ? v.m : f4Med(L.map(r => r.ter)), 2)}`,
    max: nice.max, graduations: [0, nice.max / 2, nice.max], fmtAxe: t => ekFr(t, 2) + " %", indice: `À gauche du pointillé (zone verte), l'ETF coûte moins que la médiane des ${F0.format(ETF_peers(e).length)} ETF « ${esc(ECAT[e.categorie] || "de sa catégorie")} » suivis par le site.`, source: { texte: "Fiches des émetteurs" } });
  const same = x.same.filter(s => s.ter != null), bas = same.length ? same.reduce((a, b) => b.ter < a.ter ? b : a) : null, haut = same.length ? same.reduce((a, b) => b.ter > a.ter ? b : a) : null;
  const cout = t => ETF_cout(t, 20).cout, ligne = (t, s, val, cl) => `<div><span><b>${t}</b><small>${s}</small></span><em class="${cl}">${eur(val, 0)}</em></div>`;
  const droite = `<div class="et-side"><p class="h">Ce que coûtent les frais en 20 ans</p><div class="et-cout">${ligne("Cet ETF", e4P(e.ter, 2) + " par an", cout(e.ter), "")}
    ${bas && bas.ter < e.ter ? ligne("Le moins cher du même indice", `${e4P(bas.ter, 2)} par an${x.fr && bas.pea !== true && e.pea === true ? ", hors PEA" : ""}`, cout(bas.ter), "g") : ""}
    ${haut && haut.ter > e.ter ? ligne("Le plus cher du même indice", `${e4P(haut.ter, 2)} par an`, cout(haut.ter), "r") : ""}</div>
    <p class="et-hyp">Pour 100 € placés chaque mois pendant 20 ans, avec une hausse illustrative de 5 % par an avant frais. Ce n'est pas une prévision. Les frais de courtage s'y ajoutent.</p></div>`;
  const tit = !v ? "ce qu'il prélève chaque année." : v.c === "g" ? "parmi les moins chers." : v.c === "o" ? "plus cher que la plupart." : "dans la norme.";
  return { sur: "Ses frais", concept: { cle: "ter" }, titre: tit, visuel: vis, explique: droite, q: "Combien coûte-t-il chaque année ?",
    cmp: v ? { texte: v.c === "g" ? "Moins cher que la médiane de sa catégorie" : v.c === "o" ? "Plus cher que la médiane de sa catégorie" : "Comme la médiane de sa catégorie", ton: v.c === "o" ? "r" : v.c } : null,
    ch: ["Ses frais", e4P(e.ter, 2), v ? (v.c === "o" ? "r" : v.c === "g" ? "g" : "") : "", "par an", v ? `médiane : ${e4P(v.m, 2)}` : ""] };
}

function e4Fonct(x) {
  const { e } = x, idx = e.index ? esc(e.index) : "l'indice", cp = e.contrepartie ? esc(e.contrepartie) : "une banque";
  const sch = x.synth
    ? `<div class="et-sch"><div><b>Votre argent</b>Vous achetez des parts de l'ETF en Bourse.</div><i>→</i><div class="y"><b>Le fonds</b>${e.pea === true ? (x.fr ? "Il détient surtout des actions européennes, pour rester éligible au PEA." : "Il détient surtout des actions européennes.") : "Il détient un panier d'autres titres."}</div><i>→</i><div><b>Le contrat (swap)</b>${cp} lui verse la performance de ${idx}, en échange de celle de son panier.</div></div>`
    : `<div class="et-sch"><div><b>Votre argent</b>Vous achetez des parts de l'ETF en Bourse.</div><i>→</i><div class="y"><b>Le fonds</b>Il achète ${e.methode === "échantillonnée" ? "un échantillon représentatif des" : "les"} titres de ${idx}.</div><i>→</i><div><b>Les titres</b>Ils sont conservés par une banque dépositaire, au nom du fonds, séparés des comptes de ${esc(e.issuer)}.</div></div>`;
  const vis = ekBox({ titre: "Comment il suit l'indice", unite: `réplication ${e.replication}`, indice: x.synth ? "Un ETF « synthétique » ne détient pas forcément les titres de l'indice : il détient d'autres titres et un contrat (swap) qui lui verse la performance de l'indice." + (x.fr ? " C'est ce qui permet de loger un indice mondial dans un PEA." : "") : "Un ETF « physique » achète réellement les titres de l'indice, dans les mêmes proportions.", source: { texte: `Fiche ${e.issuer}`, lien: e.url, label: "fiche de l'émetteur ↗" } }, sch);
  const R = [];
  R.push(["r", "marché", e.categorie === "obligations" ? "Si les taux d'intérêt montent, le prix des obligations baisse, et l'ETF avec." : e.categorie === "monetaire" ? "Variations faibles ; le rendement suit les taux de la BCE." : `Si ${idx} baisse, l'ETF baisse. Le capital n'est pas garanti.`]);
  if (x.hors != null && x.hors > 20 && !e.couvert) R.push(["r", "change", `${ekFr(x.hors, 0)} % du fonds est hors zone euro.`]);
  if (x.synth) R.push(["g", "contrepartie", `Si ${cp} faisait défaut, la loi limite l'exposition au contrat à 10 % du fonds.`]);
  if (e.levier) R.push(["r", "levier", "Il amplifie ou inverse les variations d'une journée : sur plusieurs jours, l'écart avec l'indice peut être fort."]);
  if (e.encours != null && e.encours < 100) R.push(["o", "petit fonds", `${big(e.encours)} d'encours : l'émetteur peut le fermer ou le fusionner (vous récupérez la valeur de vos parts).`]);
  return { sur: "Son fonctionnement", concept: { cle: x.synth ? "swap" : "physique" }, titre: (() => { const de = e.index && e.index.length <= 22 ? "du " + e.index : "de son indice"; return x.synth ? `il ne détient pas les titres ${de}.` : `il achète les titres ${de}.`; })(),
    visuel: vis, explique: `<div class="et-side"><p class="h">Les risques</p><div class="et-risk">${R.map(r => `<div><span class="${r[0]}">${r[1]}</span><p>${r[2]}</p></div>`).join("")}</div></div>`, q: "Comment fait-il pour suivre l'indice ?",
    ch: ["Son fonctionnement", x.synth ? "Swap" : "Physique", "", x.synth ? "il ne détient pas les titres" : e.methode === "échantillonnée" ? "un échantillon des titres" : "il détient les titres", x.synth && e.contrepartie ? `contrat avec ${e.contrepartie}` : ""] };
}

function e4Detenir(x) {
  const { e } = x, capi = e.distribution !== "distribution", deb = e.creation ? new Date(e.creation + "T12:00:00") : null, age = deb ? (Date.now() - deb) / 31557600000 : null;
  const ageT = age == null ? "–" : age < 1 ? "moins d'un an" : age < 1.75 ? (age < 1.25 ? "1 an" : "1 an et demi") : F0.format(Math.floor(age)) + " ans";
  const env = x.fr ? (e.pea === true ? ["g", "PEA ✓", (e.peaSrc === "composition" ? `D'après sa composition (${e.peaPart} % d'actions de sociétés européennes, 75 % exigés) : l'émetteur ne publie pas cette information, votre courtier confirme. ` : "") + "Aussi en compte-titres. Dans un PEA, les gains sont exonérés d'impôt sur le revenu après 5 ans (les prélèvements sociaux restent dus)."] : e.pea === false ? ["", "Compte-titres", "Non éligible au PEA" + (e.peaSrc === "composition" ? ` : ${e.peaPart} % seulement d'actions de sociétés européennes, 75 % sont exigés` : "") + ". Certaines assurances vie le proposent aussi."] : ["", "À vérifier", "L'émetteur n'indique pas son éligibilité au PEA."]) : ["", "Compte-titres", "Le régime fiscal dépend de votre pays de résidence."];
  const cards = `<div class="et-hold"><div class="${env[0]}"><small>Enveloppe</small><b>${env[1]}</b><p>${env[2]}</p></div>
    ${e.distribution ? `<div><small>Dividendes</small><b>${capi ? "Capitalisant" : "Distribuant"}</b><p>${capi ? "Les dividendes sont réinvestis dans le fonds : rien n'est versé, rien à déclarer chaque année." : "Les dividendes vous sont versés, en général une à quatre fois par an, et sont imposés l'année où vous les recevez" + (x.fr ? " (hors PEA)." : ".")}</p></div>` : ""}
    <div class="${age != null && age < 3 ? "r" : ""}"><small>Âge du fonds</small><b>${ageT}</b><p>${deb ? `Créé le ${deb.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}${age < 3 ? " : peu d'historique" : ""}. ` : ""}${e.encours ? `Taille du fonds : ${big(e.encours)}${x.medEnc ? `, médiane de sa catégorie ${big(x.medEnc)}` : ""}.` : ""}</p></div></div>`;
  const pl = ETF_place(e), cots = (e.cotations || []).filter(c => c.ticker);
  const em = typeof ETF_EMET === "object" ? (ETF_EMET[e.issuer] || ETF_EMET[Object.keys(ETF_EMET).find(k => (e.issuer || "").startsWith(k))]) : null;
  const droite = `<div class="et-side"><p class="h">Où le trouver</p><div class="et-risk"><div><span class="g">Bourse</span><p>${pl ? `Coté sur ${esc(pl.place)} sous le code ${esc(e.ticker)}` : e.ticker ? `Code ${esc(e.ticker)}` : "Coté en Bourse"} : il s'achète comme une action, avec son code ISIN ${esc(e.isin)}.${cots.length > 1 ? ` Aussi coté : ${cots.filter(c => c !== pl).slice(0, 3).map(c => `${esc(c.ticker)} (${esc(c.place.replace("Euronext ", ""))})`).join(", ")}.` : ""}</p></div><div><span class="o">à vérifier</span><p>Les frais de courtage de votre banque ou courtier s'ajoutent aux frais courants.</p></div>${em ? `<div><span class="n">émetteur</span><p>${esc(em[0])}</p></div>` : ""}</div></div>`;
  const tit = x.fr && e.pea === true ? `logeable en PEA, ${capi ? "rien à déclarer chaque année." : "dividendes versés."}` : capi ? "rien à déclarer chaque année." : "des dividendes versés.";
  return { sur: "Le détenir", concept: { cle: capi ? "capitalisant" : "distribuant" }, titre: tit, visuel: cards, explique: droite, q: "Et pour le détenir ?",
    ch: ["Le détenir", x.fr ? (e.pea === true ? "PEA ✓" : e.pea === false ? "Hors PEA" : "–") : (capi ? "Capi." : "Distrib."), x.fr && e.pea === true ? "g" : "", capi ? "capitalisant" : "distribuant", capi ? "dividendes réinvestis" : "dividendes versés"] };
}

function e4Chaine(x) {
  const E = e4Etapes(x);
  return `<div class="ek-chain" style="--n:${E.length}">${E.map((s, i) => { const r = s.ch; return `<a class="ek-rp" href="#t${i + 1}"><span class="ek-st"><i>${i + 1}</i>${esc(r[0])}</span><span class="ek-v ${r[2]}">${esc(r[1])}</span><span class="ek-s">${esc(r[3])}</span><span class="ek-ml">${esc(r[4] || "")}</span><span class="ek-go">Comprendre <span>↓</span></span></a>`; }).join("")}</div>`;
}
function e4Fil(x) {
  const E = e4Etapes(x);
  return `<section class="ek-sec" id="fil"><span class="ek-stk2">En ${E.length} questions</span><h2>Ce que vous achetez vraiment.</h2>${ekFil(E)}</section>`;
}

// ——— Le même indice chez d'autres émetteurs ———
function e4Memes(x) {
  const { e } = x, same = x.same.length;
  const T = [e, ...(same ? x.same.slice(0, 7) : x.cat.slice(0, 6))].filter(r => r.ter != null).sort((a, b) => a.ter - b.ter || (b.encours || 0) - (a.encours || 0));
  if (T.length < 2) return "";
  const a1 = r => x.items[r.id] && x.items[r.id].a1, terMn = Math.min(...T.map(r => r.ter)), terMx = Math.max(...T.map(r => r.ter));
  const P = T.map(a1).filter(v => v != null), ec = P.length >= 2 && Math.max(...P) - Math.min(...P) >= 0.005, pMn = ec ? Math.min(...P) : null, pMx = ec ? Math.max(...P) : null;
  const cel = (txt, best, worst) => `<td class="${best ? "et-b" : worst ? "et-w" : ""}">${best ? "▲ " : worst ? "▼ " : ""}${txt}</td>`;
  const lignes = T.map(r => { const p = a1(r); return `<tr class="${r.id === e.id ? "moi" : ""}"><th>${r.id === e.id ? esc(e4Court(r)) : `<a href="/etf/${esc(r.id)}">${esc(e4Court(r))}</a>`}</th>${cel(e4P(r.ter, 2), terMn !== terMx && r.ter === terMn, terMn !== terMx && r.ter === terMx)}${p == null ? "<td>–</td>" : cel(e4Pc(p), pMn !== pMx && p === pMx, pMn !== pMx && p === pMn)}<td>${r.encours ? big(r.encours) : "–"}</td>${x.fr ? `<td>${r.pea === true ? "✓" : "–"}</td>` : ""}<td>${r.distribution === "distribution" ? "distribuant" : r.distribution ? "capitalisant" : "–"}</td><td>${esc(r.replication || "–")}</td></tr>`; }).join("");
  return `<section class="ek-sec" id="memes"><span class="ek-stk2 b">Pour choisir</span><h2>${same ? "Le même indice, chez d'autres émetteurs." : "Les ETF les plus proches."}</h2>
    <div class="ek-tc ek-tc-l"><div class="scroll-x"><table class="ek-tt ek-tt-r"><thead><tr><th></th><th>Frais par an</th><th>Sur 1 an</th><th>Taille du fonds</th>${x.fr ? "<th>PEA</th>" : ""}<th>Dividendes</th><th>Réplication</th></tr></thead><tbody>${lignes}</tbody></table></div>
    <p class="ek-tn">${same ? "Même indice, mêmes titres : l'écart se joue sur les frais, l'enveloppe et la taille du fonds." : `Pas d'autre ETF suivi sur ${e.index ? esc(e.index) : "cet indice"} : voici les plus gros de sa catégorie, qui suivent d'autres indices.`} ▲ le moins cher et la meilleure performance · ▼ l'inverse. Performance sur 1 an en euros, dividendes réinvestis (– : non publiée par l'émetteur).</p></div>
    <p class="ek-note">${same > 7 ? `<a href="/etf?q=${encodeURIComponent(e.index || "")}">Tous les ETF sur ${esc(e.index)} ↗</a> · ` : ""}<a href="/outils/recouvrement?a=${esc(e.id)}${T[1] ? `&b=${esc((T[0].id === e.id ? T[1] : T[0]).id)}` : ""}">Voir les titres en commun avec un autre ETF ↗</a></p></section>`;
}

// ——— IA, Prouvé, communauté ———
function e4Fin(x) {
  const { e, H } = x, vois = x.same.find(s => s.ter != null) || x.cat[0];
  const qs = [vois ? `Quelle différence entre ${e4Court(e)} et ${e4Court(vois)} ?` : `Que contient ${e4Court(e)} ?`, x.synth ? `Que se passe-t-il si ${e.contrepartie || "la banque du swap"} fait défaut ?` : e.distribution === "distribution" ? `Quand ${e4Court(e)} verse-t-il ses dividendes ?` : `Pourquoi ${e4Court(e)} est-il capitalisant ?`];
  return `<section class="ek-end" id="e4ia"><h2>✦ Une question sur cet ETF ?</h2><div class="ek-qs">${qs.map(q => `<button type="button" data-f4-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>
      <form class="ek-ask" data-f4-ask><input type="text" name="q" maxlength="300" placeholder="Posez votre question sur ${esc(e.name)}…" aria-label="Votre question sur ${esc(e.name)}" autocomplete="off"><button type="submit">Demander</button></form>
      <small>L'IA du site répond avec les chiffres de cette page. Information factuelle, sans conseil.</small></section>
    <section class="ek-sec"><span class="ek-stk2" style="background:#FFE14D">Prouvé</span><h2>D'où viennent ces chiffres.</h2>
      <div class="ek-proof"><span class="ek-stk2">Prouvé</span><p>Frais, taille et caractéristiques relevés sur <b>la fiche de l'émetteur${e.src ? ` (${esc(e.src)})` : ""}</b>. Composition : ${esc(e4SrcCompo(x))}${x.C && x.C.asOf ? `, au ${esc(dLabel(x.C.asOf))}` : ""}.${H ? ` Performance : ${esc(H.src)}.` : ""} Vérifiez-les dans le document d'informations clés (DIC) avant d'investir.</p>${e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener nofollow">Ouvrir la fiche ${esc(e.issuer)} ↗</a>` : ""}</div></section>
    <section class="ek-sec" id="e4com"><span class="ek-stk2 p">Communauté</span><h2>Avis et discussion.</h2>
      <div class="et-com"><div class="ek-box"><div class="ek-bt">Avis des visiteurs<small></small></div><div id="e4avis"></div></div></div></section>`;
}

// ——— Actions de l'en-tête ———
document.addEventListener("click", ev => {
  const t = ev.target.closest && ev.target.closest("[data-e4-copy],[data-e4-tv],[data-e4-pf]"); if (!t) return;
  const m = location.pathname.match(/^\/etf\/([^/]+)/), e = m && ETFBY[m[1]]; if (!e) return;
  if (t.dataset.e4Copy) { try { navigator.clipboard.writeText(e.isin).then(() => toast("ISIN copié : " + esc(e.isin)), () => toast("ISIN : " + esc(e.isin))); } catch (x) { toast("ISIN : " + esc(e.isin)); } return; }
  if (t.dataset.e4Pf !== undefined) { ETF_ajoutPf(e); return; }
  const box = document.getElementById("e4tv"); if (!box) return; box.hidden = !box.hidden;
  if (!box.hidden && !box.dataset.on && typeof tvChart === "function") { box.dataset.on = "1"; box.className = "ek-tvbox"; tvChart(box, e.tv, e.name); }
  t.textContent = box.hidden ? "Voir le graphique du cours ↗" : "Masquer le graphique";
});

window.pageEtf = pageEtf4;
