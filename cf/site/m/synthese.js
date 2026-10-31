/* Module « synthese » de bilan. : chargé après le script principal de index.html.
   Les fonctions déclarées ici remplacent celles du même nom (déclarations function, jamais const/let pour un nom existant).

   « Votre semaine en 2 minutes » : la synthèse hebdomadaire de ce que la personne suit (favoris et portefeuille),
   en tête de Mon espace (remplace espaceBilan) et sur l'accueil d'un membre connecté (synAccueil, appelée par pageHome).
   Les chiffres viennent du serveur (/api/espace/bilan, calculés par cf/src/synthese.mjs) ; l'interprétation est calculée
   ici avec les connaissances du site (médianes du secteur, points forts et de vigilance des comptes, Académie). */

document.head.insertAdjacentHTML("beforeend", `<style id="syn-css">
.synwrap{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:20px;align-items:start}
.synwrap>aside{position:sticky;top:76px}
@media (max-width:1040px){.synwrap{grid-template-columns:minmax(0,1fr)}.synwrap>aside{position:static}}
.synhero{background:var(--card,#fff);border:1px solid var(--line,#E6E0D4);border-radius:16px;box-shadow:var(--shadow);padding:20px 22px 18px;margin-bottom:20px}
.synhero .kick{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.synhero h2{font-family:var(--serif);font-size:26px;line-height:1.15;margin:4px 0 10px;letter-spacing:-.01em}
.synmeta{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px}
.synmeta span{font-size:12.5px;background:var(--soft);border:1px solid var(--line2,#EFEAE0);border-radius:99px;padding:3px 10px;color:var(--grey)}
.synmeta span.on{background:#EAF4EE;border-color:#CFE6D8;color:var(--g)}
.synk{list-style:none;margin:0;padding:0;display:grid;gap:10px;counter-reset:k}
.synk li{counter-increment:k;display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px;font-size:15.5px;line-height:1.5}
.synk li::before{content:counter(k);width:26px;height:26px;border-radius:50%;background:var(--ink);color:#fff;font:600 13px/26px var(--mono);text-align:center}
.synnav{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 0;padding-top:14px;border-top:1px solid var(--line2,#EFEAE0)}
.synnav a,.synnav button{font:inherit;font-size:13px;border:1px solid var(--line);background:#fff;border-radius:99px;padding:6px 12px;color:var(--ink);cursor:pointer;text-decoration:none;white-space:nowrap}
.synnav a:hover,.synnav button:hover{border-color:var(--ink)}
.synnav .pri{background:var(--ink);color:#fff;border-color:var(--ink)}
.synsec{scroll-margin-top:80px}
.synkpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:0 0 14px}
.synkpi{border:1px solid var(--line2,#EFEAE0);border-radius:12px;padding:10px 12px;background:#FCFBF8;min-width:0;color:inherit;text-decoration:none;display:block}
a.synkpi:hover{border-color:var(--ink)}
.synkpi small{display:block;font-size:12px;color:var(--grey);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.synkpi b{display:block;font-family:var(--serif);font-size:24px;font-weight:800;line-height:1.2;margin-top:2px}
.synkpi span{display:block;font-size:12.5px;color:var(--grey);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.synkpi svg{display:block;margin-top:4px}
.synidx{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12.5px;color:var(--grey);margin:0 0 10px}
.synidx b{font-weight:600}
.synrows{display:flex;flex-direction:column}
.synrow{display:grid;grid-template-columns:minmax(0,1fr) 92px 74px 132px 86px;gap:4px 12px;align-items:center;padding:9px 6px;border-top:1px solid var(--line2,#EFEAE0);color:inherit;text-decoration:none;border-radius:8px}
.synrow:first-child{border-top:0}
.synrow:hover{background:var(--soft)}
.synrow .nm{display:flex;align-items:center;gap:10px;min-width:0}
.synrow .nm span{min-width:0}
.synrow .nm b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
.synrow .nm small{display:block;font-size:12px;color:var(--light);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.synrow .v{font-weight:700;font-size:14.5px;font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
.synrow .vs{font-size:12.5px;color:var(--grey);text-align:right;line-height:1.3}
.synrow .eu{font-weight:600;font-size:13px;font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
.synrow .na{color:var(--light);font-size:12.5px;text-align:right}
.synhead{display:grid;grid-template-columns:minmax(0,1fr) 92px 74px 132px 86px;gap:12px;padding:0 6px 6px;font-size:12px;color:var(--light);border-bottom:1px solid var(--line2,#EFEAE0)}
.synhead span:not(:first-child){text-align:right}
@media (max-width:640px){
  .synhead{display:none}
  .synrow{grid-template-columns:minmax(0,1fr) 66px 64px;gap:2px 8px;padding:10px 2px}
  .synrow .sp svg{width:66px}
  .synrow .vs{grid-row:2;grid-column:1 / 3;text-align:left;padding-left:40px}
  .synrow .eu{grid-row:2;grid-column:3}
  .synhero{padding:16px 16px 14px}.synhero h2{font-size:22px}
  .synk li{font-size:15px}
}
.synnews{display:flex;flex-direction:column;gap:0}
.synnew{padding:12px 0;border-top:1px solid var(--line2,#EFEAE0)}
.synnew:first-child{border-top:0;padding-top:2px}
.synnew .h{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;margin:0 0 4px}
.synnew .h b{font-weight:600}
.synnew .h small{color:var(--light);font-size:12.5px}
.syncat{font:600 11px/1 var(--mono);text-transform:uppercase;letter-spacing:.05em;border-radius:99px;padding:4px 8px;background:var(--soft);color:var(--grey);white-space:nowrap}
.syncat.c-opa,.syncat.c-resultats,.syncat.c-ca{background:#111214;color:#fff}
.syncat.c-dividende{background:#EAF4EE;color:var(--g)}
.syncat.c-dirigeants,.syncat.c-operation,.syncat.c-incident,.syncat.c-financement{background:#FFF1E6;color:#9A4A10}
.synnew .ch{color:var(--grey);font-size:13.5px}.synnew .ch b{color:var(--ink);font-weight:600}
.synnew p{margin:2px 0;font-size:14px;line-height:1.5}
.synnew .t{font-weight:500}
.synchif{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 0}
.synchif span{font-size:12.5px;border:1px solid var(--line);border-radius:8px;padding:2px 8px;background:#fff}
.synlinks{display:flex;flex-wrap:wrap;gap:4px 14px;margin:6px 0 0;font-size:13px}
.synlinks a{color:var(--link)}
.synlinks a:hover{text-decoration:underline}
.synev{display:grid;grid-template-columns:62px minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 0;border-top:1px solid var(--line2,#EFEAE0)}
.synev:first-child{border-top:0}
.synev .d{text-align:center;border:1px solid var(--line);border-radius:10px;padding:4px 0;line-height:1.1;background:#fff}
.synev .d b{display:block;font:800 20px var(--serif)}
.synev .d small{font-size:11px;color:var(--grey);text-transform:uppercase;letter-spacing:.04em}
.synev .w b{font-weight:600}
.synev .w span{display:block;font-size:13px;color:var(--grey)}
.synev button{font:inherit;font-size:12.5px;border:1px solid var(--line);background:#fff;border-radius:99px;padding:4px 10px;cursor:pointer;white-space:nowrap}
.synev button:hover{border-color:var(--ink)}
.syninter{display:grid;gap:12px}
.syncard{border:1px solid var(--line2,#EFEAE0);border-radius:12px;padding:12px 14px;background:#FCFBF8}
.syncard h3{font-size:15px;margin:0 0 6px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline}
.syncard h3 a{color:inherit}
.syncard h3 a:hover{text-decoration:underline}
.syncard ul{margin:0;padding:0;list-style:none;display:grid;gap:6px}
.syncard li{display:grid;grid-template-columns:12px minmax(0,1fr);gap:8px;font-size:14px;line-height:1.5}
.syncard li::before{content:"";width:8px;height:8px;border-radius:50%;margin-top:7px;background:var(--n,#BDB7AC)}
.syncard li.vert::before{background:var(--g)}
.syncard li.rouge::before{background:var(--o)}
.syncard .les{margin:8px 0 0;font-size:13px}
.syncard .les a{color:var(--link)}
.synal{display:grid;grid-template-columns:12px minmax(0,1fr);gap:8px;padding:8px 0;border-top:1px solid var(--line2,#EFEAE0)}
.synal:first-child{border-top:0}
.synal::before{content:"";width:9px;height:9px;border-radius:50%;margin-top:6px;background:var(--n,#BDB7AC)}
.synal.vig::before{background:var(--o)}.synal.moyen::before{background:#E9B23C}.synal.fort::before{background:var(--g)}
.synal b{font-weight:600}
.synal p{margin:2px 0 0;font-size:13.5px;color:var(--grey)}
.synevol{font:600 11px/1 var(--mono);text-transform:uppercase;letter-spacing:.04em;border-radius:99px;padding:3px 7px;margin-left:6px;background:#FFF1E6;color:#9A4A10;white-space:nowrap}
.synevol.st{background:var(--soft);color:var(--grey)}.synevol.ok{background:#EAF4EE;color:var(--g)}
.synweeks{display:flex;gap:6px;margin:4px 0 8px}
.synweeks a{flex:1;display:grid;grid-template-rows:34px 34px auto;justify-items:center;text-decoration:none;color:inherit;min-width:0;background:linear-gradient(var(--line),var(--line)) 0 34px/100% 1px no-repeat}
.synweeks a i{display:block;width:100%;max-width:26px;border-radius:4px 4px 0 0;background:var(--g);align-self:end}
.synweeks a i.neg{background:var(--o);border-radius:0 0 4px 4px;grid-row:2;align-self:start}
.synweeks a small{font:500 10.5px var(--mono);color:var(--light);margin-top:3px;grid-row:3}
.synweeks a.on small{color:var(--ink);font-weight:700}
.synwk{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-top:1px solid var(--line2,#EFEAE0);font-size:13.5px;color:inherit;text-decoration:none}
.synwk:hover span{text-decoration:underline}
.synhome{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:18px;align-items:center}
.synhome .synk li{font-size:14.5px}
.synhome .kp{display:grid;gap:8px}
.synhome .kp .synkpi small,.synhome .kp .synkpi span{white-space:normal}
@media (max-width:860px){.synhome{grid-template-columns:minmax(0,1fr)}.synhome .kp{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.synhome .kp .synkpi{padding:8px 9px}.synhome .kp .synkpi b{font-size:19px}.synhome .kp .synkpi small,.synhome .kp .synkpi span{font-size:11.5px}}
.synfoot{font-size:12.5px;color:var(--grey);margin:4px 0 0}
.synmore{margin:10px 0 0;padding:10px 12px;border-radius:10px;background:var(--soft);font-size:13.5px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between}
</style>`);

/* ---------- Petits outils ---------- */
const SYN_CAT = { opa: "Offre publique", resultats: "Résultats", ca: "Chiffre d'affaires", dividende: "Dividende", operation: "Opération", dirigeants: "Dirigeants", ag: "Assemblée", capital: "Capital", communique: "Communiqué", financement: "Financement", incident: "Incident", initie: "Dirigeants", agenda: "Calendrier", presse: "Presse" };
const SYN_MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const SYN_JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const SYN_LECONS = { // situation → leçon de l'Académie (module/leçon)
  resultats: ["comptes", "compte-resultat"], ca: ["comptes", "compte-resultat"], dividende: ["bourse", "dividendes"], ag: ["bourse", "action"],
  baisse: ["psychologie", "aversion-pertes"], hausse: ["psychologie", "recence-troupeau"], indice: ["bourse", "indices"], per: ["valorisation", "per"],
  ligne: ["portefeuille", "concentration"], top3: ["portefeuille", "concentration"], frais: ["frais-fiscalite", "frais-courants"], pea: ["placements", "pea"], mediane: ["comptes", "mediane"],
};
function synPct(v, d = 1) { if (v == null || !isFinite(v)) return "–"; const r = Math.round(v * 10 ** d) / 10 ** d; return (r > 0 ? "+" : r < 0 ? "−" : "") + nf(d).format(Math.abs(r)) + " %"; }
function synEur(v, sign = true) { return v == null || !isFinite(v) ? "–" : (sign ? (v > 0 ? "+" : v < 0 ? "−" : "") : "") + F0.format(Math.abs(Math.round(v))) + " €"; }
function synInsec(t) { return esc(t).replace(/ ([%€])/g, "&nbsp;$1").replace(/(\d) (Md€|M€|pts?)/g, "$1&nbsp;$2"); } // pas de retour à la ligne avant % ou €
function synCls(v) { const r = Math.round((v || 0) * 10) / 10; return r > 0 ? "up" : r < 0 ? "down" : "muted"; }
function synJour(iso) { const d = new Date(iso + "T12:00:00Z"); return `${SYN_JOURS[d.getUTCDay()]} ${d.getUTCDate()} ${SYN_MOIS[d.getUTCMonth()]}`; }
function synDuAu(b) {
  if (!b.du || !b.au) return "";
  const a = new Date(b.du + "T12:00:00Z"), z = new Date(b.au + "T12:00:00Z"), M = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const j = d => d.getUTCDate() === 1 ? "1er" : String(d.getUTCDate());
  return a.getUTCMonth() === z.getUTCMonth() ? `du ${j(a)} au ${j(z)} ${M[z.getUTCMonth()]}` : `du ${j(a)} ${M[a.getUTCMonth()]} au ${j(z)} ${M[z.getUTCMonth()]}`;
}
function synLien(k) { return (k.startsWith("e:") ? "/etf/" : "/entreprise/") + k.slice(2); }
function synObj(k) { return k.startsWith("c:") ? RBY[k.slice(2)] : ETFBY[k.slice(2)]; }
function synLogo(k, s = 32) { const o = synObj(k); if (!o) return ""; return k.startsWith("c:") ? logo(o, s) : logo({ name: o.issuer || o.name, domain: typeof issuerDom === "function" ? issuerDom(o) : null }, s); }
// Mini-graphique de la semaine : la ligne pointillée est le cours de départ.
function synSpark(serie, w = 88, h = 26, label = "") {
  const s = (serie || []).filter(v => v != null && isFinite(v)); if (s.length < 2) return `<svg width="${w}" height="${h}" aria-hidden="true"></svg>`;
  const mn = Math.min(...s), mx = Math.max(...s), r = mx - mn || 1, X = i => 2 + i * (w - 6) / (s.length - 1), Y = v => 3 + (h - 6) * (1 - (v - mn) / r);
  const col = s[s.length - 1] >= s[0] ? "var(--up)" : "var(--down)", pts = s.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label || "Évolution sur la semaine")}"><line x1="2" x2="${w - 2}" y1="${Y(s[0]).toFixed(1)}" y2="${Y(s[0]).toFixed(1)}" stroke="var(--light)" stroke-width="1" stroke-dasharray="2 3"/><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${X(s.length - 1).toFixed(1)}" cy="${Y(s[s.length - 1]).toFixed(1)}" r="2.6" fill="${col}"/></svg>`;
}
function synLecon(code) {
  const x = SYN_LECONS[code]; if (!x || typeof ACA === "undefined" || !ACA) return null;
  const m = ACA.modules.find(m => m.id === x[0]), l = m && m.lecons.find(l => l.id === x[1]);
  return l ? { href: `/academie/${m.id}/${l.id}`, titre: l.titre } : null;
}

/* ---------- Interprétation : ce que la semaine change, au regard des connaissances du site ---------- */
// Repère d'un indicateur des comptes par rapport à la médiane du secteur (zone verte ou rouge, écart de plus de 10 %).
function synRepere(c, k) {
  if (!c || typeof INDI === "undefined" || !INDI[k] || typeof medInd !== "function") return null;
  let v, med; try { v = INDI[k][1](c); med = medInd(c.sector, k); } catch (e) { return null; }
  if (v == null || med == null || !isFinite(v) || !isFinite(med)) return null;
  const [label, , fmt, lowGood] = INDI[k], ecart = med !== 0 ? (v - med) / Math.abs(med) : 0;
  const zone = lowGood == null || Math.abs(ecart) < 0.1 ? "" : (lowGood ? v < med : v > med) ? "vert" : "rouge";
  const qual = k === "per" ? (zone === "vert" ? " (moins cher que la plupart de ses concurrents au regard de ses bénéfices)" : zone === "rouge" ? " (plus cher que la plupart de ses concurrents au regard de ses bénéfices)" : " (dans la moyenne)")
    : zone === "vert" ? " (mieux que la plupart de ses concurrents)" : zone === "rouge" ? " (moins bien que la plupart de ses concurrents)" : " (dans la moyenne)";
  const txt = `${label} : ${fmt(v)}, contre ${fmt(med)} pour la médiane de son secteur${qual}.`;
  return { zone, txt };
}
function synFacteurs(c) { // facteurs publiés par le module « analyse » (atouts, risques), s'il est chargé
  if (typeof analyseFaitsIA !== "function" || !c) return [];
  try {
    const r = analyseFaitsIA(c, c) || {}, out = [];
    const pick = (arr, z) => (Array.isArray(arr) ? arr : []).slice(0, 2).forEach(x => { const t = typeof x === "string" ? x : x && (x.texte || x.titre || x.label); if (t) out.push({ zone: z, txt: String(t) }); });
    pick(r.atouts, "vert"); pick(r.risques, "rouge");
    return out.slice(0, 3);
  } catch (e) { return []; }
}
function synPoints(l, b) {
  const c = l.k.startsWith("c:") ? RBY[l.k.slice(2)] : null, e = l.k.startsWith("e:") ? ETFBY[l.k.slice(2)] : null, pts = [], v = l.variation_semaine_pct;
  let lec = null;
  if (v != null) {
    const a = Math.abs(v), grand = c && (valo(c) || {}).capE > 10e9;
    pts.push({ zone: "", txt: a >= 8 ? `Un mouvement de ${synPct(v)} en une semaine est très important${grand ? " pour une entreprise de cette taille" : ""}.` : a >= 4 ? `Un mouvement de ${synPct(v)} en une semaine est notable${e ? " pour un ETF" : grand ? " pour une grande entreprise" : ""}.` : `Un mouvement de ${synPct(v)} sur la semaine reste dans l'ordinaire${e ? " pour un ETF" : " pour une action"}.` });
    if (l.indice && l.ecart_pts != null) pts.push({ zone: "", txt: `${l.ecart_pts >= 0 ? "C'est " + nf(1).format(Math.abs(l.ecart_pts)) + " point" + (Math.abs(l.ecart_pts) >= 2 ? "s" : "") + " de mieux" : "C'est " + nf(1).format(Math.abs(l.ecart_pts)) + " point" + (Math.abs(l.ecart_pts) >= 2 ? "s" : "") + " de moins"} que le ${l.indice.nom} (${synPct(l.indice.pct)}) : ${Math.abs(l.ecart_pts) >= 3 ? "le mouvement est propre à " + (e ? "cet ETF" : "l'entreprise") + " plus qu'au marché." : "le mouvement suit surtout celui du marché."}` });
    lec = a >= 5 ? (v < 0 ? "baisse" : "hausse") : l.indice ? "indice" : null;
  }
  const ann = (b.annonces || []).filter(a => a.k === l.k).sort((x, y) => y.poids - x.poids)[0];
  if (ann) { pts.push({ zone: "", txt: `Publié cette semaine : ${ann.titre || ann.type || SYN_CAT[ann.categorie] || "une annonce"}${(ann.chiffres || []).length ? " (" + ann.chiffres.slice(0, 2).map(x => x.join(" : ")).join(", ") + ")" : ""}. ${v != null && Math.abs(v) >= 4 ? "Un cours qui bouge la semaine d'une publication ne prouve pas que l'un explique l'autre." : ""}` }); lec = SYN_LECONS[ann.categorie] ? ann.categorie : lec; }
  if (c && !c.missing) {
    const ks = ann && /dividende/.test(ann.categorie) ? ["rendement", "distribution", "dette"] : v != null && Math.abs(v) >= 5 ? ["per", "marge", "dette"] : ["marge", "croissance", "dette"];
    ks.map(k => synRepere(c, k)).filter(Boolean).slice(0, 2).forEach(r => pts.push(r));
    synFacteurs(c).forEach(x => pts.push(x));
    const t = typeof quick === "function" ? quick(c) : null;
    if (t && (t.fort || t.vig)) pts.push({ zone: t.vig > t.fort ? "rouge" : t.fort > t.vig ? "vert" : "", txt: `Sur ses derniers comptes, le site relève ${tallyTxt(t)}. La semaine en Bourse ne change pas ces chiffres : ils changeront aux prochains résultats.` });
  }
  if (e && e.ter != null) pts.push({ zone: e.ter <= 0.2 ? "vert" : e.ter > 0.4 ? "rouge" : "", txt: `Frais courants : ${pct(e.ter / 100, 2, false)} par an${e.ter <= 0.2 ? ", parmi les plus bas" : e.ter > 0.4 ? ", plus que la plupart des ETF de même catégorie" : ""}.` });
  const lecon = synLecon(lec || "mediane");
  return { pts, lecon, c, e, ann };
}
function synCarte(l, b) {
  const { pts, lecon } = synPoints(l, b), v = l.variation_semaine_pct, c = l.k.startsWith("c:") ? RBY[l.k.slice(2)] : null;
  const titre = `<a href="${synLien(l.k)}">${esc(l.nom)}</a>${v != null ? `<span class="${synCls(v)} num">${synPct(v)}</span>` : ""}${l.en_portefeuille && l.portefeuille ? `<small class="light">${nf(0).format(l.portefeuille.poids_pct)} % du portefeuille</small>` : ""}`;
  return `<div class="syncard"><h3>${titre}</h3><ul>${pts.slice(0, 5).map(p => `<li class="${p.zone}">${esc(p.txt)}</li>`).join("")}</ul>${lecon ? `<p class="les">À lire : <a href="${lecon.href}">${esc(lecon.titre)} →</a></p>` : ""}</div>`;
}
// Les lignes qui méritent un commentaire : plus forts mouvements, publications, lignes lourdes du portefeuille.
function synAInterpreter(b) {
  const L = (b.lignes || []).slice(), score = l => Math.abs(l.variation_semaine_pct || 0) + ((b.annonces || []).some(a => a.k === l.k && a.origine === "officiel") ? 6 : 0) + (l.portefeuille ? l.portefeuille.poids_pct / 10 : 0);
  return L.filter(l => l.variation_semaine_pct != null || (b.annonces || []).some(a => a.k === l.k)).sort((x, y) => score(y) - score(x));
}

/* ---------- Rendu ---------- */
function synKpis(b) {
  const L = (b.lignes || []).filter(l => l.variation_semaine_pct != null), pf = b.portefeuille, T = [];
  if (pf && pf.var_pct != null) T.push(`<a class="synkpi" href="/portefeuille"><small>Mon portefeuille</small><b class="${synCls(pf.var_eur)}">${synEur(pf.var_eur)}</b><span>${synPct(pf.var_pct)} · ${synEur(pf.valeur_eur, false)}${pf.estime ? " (estimé)" : ""}</span>${pf.serie ? synSpark(pf.serie, 130, 26, "Valeur du portefeuille sur la semaine") : ""}</a>`);
  else if (L.length) T.push(`<div class="synkpi"><small>Moyenne de vos valeurs</small><b class="${synCls(b.moyenne)}">${synPct(b.moyenne)}</b><span>${b.hausses || 0} en hausse · ${b.baisses || 0} en baisse</span></div>`);
  const cac = (b.indices || []).find(i => i.id === "cac40");
  if (cac) T.push(`<div class="synkpi"><small>CAC 40, même période</small><b class="${synCls(cac.pct)}">${synPct(cac.pct)}</b><span>${(b.indices || []).filter(i => i.id === "sp500").map(i => `S&P 500 ${synPct(i.pct)}`).join("") || "indice de la Bourse de Paris"}</span></div>`);
  const best = L[0], worst = L.length > 1 ? L[L.length - 1] : null;
  if (best) T.push(`<a class="synkpi" href="${synLien(best.k)}"><small>Plus forte hausse</small><b class="${synCls(best.variation_semaine_pct)}">${synPct(best.variation_semaine_pct)}</b><span>${esc(best.nom)}</span></a>`);
  if (worst) T.push(`<a class="synkpi" href="${synLien(worst.k)}"><small>Plus forte baisse</small><b class="${synCls(worst.variation_semaine_pct)}">${synPct(worst.variation_semaine_pct)}</b><span>${esc(worst.nom)}</span></a>`);
  return T.length ? `<div class="synkpis">${T.join("")}</div>` : "";
}
function synRowsHTML(b) {
  const L = (b.lignes || []).slice().sort((x, y) => (y.variation_semaine_pct ?? -1e9) - (x.variation_semaine_pct ?? -1e9)), pf = !!b.portefeuille;
  return `<div class="synhead syn-nosp"><span>Valeur</span><span>Sur la semaine</span><span>Face à son indice</span><span>${pf ? "En euros" : ""}</span></div><div class="synrows syn-nosp">${L.map(l => {
    const v = l.variation_semaine_pct, sub = [l.type === "etf" ? "ETF" : (RBY[l.k.slice(2)] ? secName(RBY[l.k.slice(2)]) : ""), l.en_portefeuille && l.portefeuille ? `${nf(0).format(l.portefeuille.poids_pct)} % du portefeuille` : l.en_portefeuille ? "dans le portefeuille" : "favori"].filter(Boolean).join(" · ");
    return `<a class="synrow" href="${synLien(l.k)}"><span class="nm">${synLogo(l.k, 30)}<span><b>${esc(l.nom)}</b><small>${esc(sub)}</small></span></span>
      <span class="v ${v == null ? "na" : synCls(v)}">${v == null ? "–" : synPct(v)}</span>
      <span class="vs">${l.indice && l.ecart_pts != null ? `<b class="${synCls(l.ecart_pts)}">${l.ecart_pts > 0 ? "+" : l.ecart_pts < 0 ? "−" : ""}${nf(1).format(Math.abs(l.ecart_pts))} pt${Math.abs(l.ecart_pts) >= 2 ? "s" : ""}</b> vs ${esc(l.indice.nom)}` : v == null ? "cours de la semaine manquant" : `<span class="light">pas d'indice équivalent</span>`}</span>
      <span class="eu ${l.portefeuille && l.portefeuille.var_eur != null ? synCls(l.portefeuille.var_eur) : ""}">${l.portefeuille && l.portefeuille.var_eur != null ? synEur(l.portefeuille.var_eur) : ""}</span></a>`; }).join("")}</div>`;
}
function synNewsHTML(b, prem) {
  const A = b.annonces || [], max = prem ? 30 : 6, vis = A.slice(0, max);
  if (!A.length) return `<p class="muted" style="margin:0">Aucune annonce officielle ni article repéré cette semaine pour vos valeurs. Le site relève chaque jour les communiqués déposés à l'AMF et à la SEC.</p>`;
  return `<div class="synnews">${vis.map(a => `<div class="synnew"><div class="h"><span class="syncat c-${esc(a.categorie || "communique")}">${esc(SYN_CAT[a.categorie] || a.categorie_label || "Communiqué")}</span><b>${esc(a.nom || "")}</b><small>${a.date ? esc(synJour(a.date)) : ""}${a.origine === "presse" ? " · presse" : " · publication officielle"}</small></div>
      ${a.titre ? `<p class="t">${esc(a.titre)}</p>` : a.type && a.type !== SYN_CAT[a.categorie] ? `<p class="t">${esc(a.type)}</p>` : ""}${a.resume ? `<p>${esc(a.resume)}</p>` : ""}${a.change ? `<p class="ch"><b>Ce que cela change :</b> ${esc(a.change)}</p>` : ""}
      ${(a.chiffres || []).length ? `<div class="synchif">${a.chiffres.map(c => `<span>${esc(c[0])} : <b>${esc(c[1])}</b></span>`).join("")}</div>` : ""}
      <div class="synlinks">${a.source ? `<a href="${esc(a.source)}" target="_blank" rel="noopener">${a.origine === "presse" ? "Lire l'article" + (a.site ? " (" + esc(a.site) + ")" : "") : "Document officiel" + (a.source_nom ? " (" + esc(a.source_nom) + ")" : "")} ↗</a>` : ""}<a href="${esc(a.lien || synLien(a.k))}">${a.k.startsWith("c:") ? "Toute son actualité" : "Sa fiche"} →</a></div></div>`).join("")}</div>
    ${A.length > max ? `<div class="synmore"><span><b>${A.length - max} autre${A.length - max > 1 ? "s" : ""} annonce${A.length - max > 1 ? "s" : ""}</b> cette semaine, classée${A.length - max > 1 ? "s" : ""} par importance.</span><a class="btn" href="/premium">Tout voir avec Premium</a></div>` : ""}
    <p class="synfoot">Classées par importance : offre publique, résultats, chiffre d'affaires, dividende, opérations, dirigeants. Résumés tirés des documents officiels${A.some(a => a.origine === "presse") ? " ; les articles de presse sont repérés automatiquement et non vérifiés par le site" : ""}.</p>`;
}
function synAgendaHTML(b) {
  const pfk = new Set((b.lignes || []).filter(l => l.portefeuille).map(l => l.k));
  const E = (b.a_venir || []).slice().sort((x, y) => (pfk.has(y.k) - pfk.has(x.k)) || String(x.date).localeCompare(String(y.date)));
  if (!E.length) return `<p class="muted" style="margin:0">Aucune date de résultats, de dividende ou d'assemblée annoncée pour vos valeurs dans les deux prochaines semaines. <a class="lnk" href="/agenda">Voir l'agenda complet</a>.</p>`;
  return `${E.map((e, i) => { const d = new Date(e.date + "T12:00:00Z");
    return `<div class="synev"><span class="d"><small>${SYN_JOURS[d.getUTCDay()]}</small><b>${d.getUTCDate()}</b><small>${SYN_MOIS[d.getUTCMonth()]}</small></span><span class="w"><b><a href="${esc(e.lien || "/entreprise/" + e.id + "/agenda")}">${esc(e.nom || "")}</a>${pfk.has(e.k) ? ` <span class="syn4-pill">portefeuille</span>` : ""}</b><span>${esc(e.label || "")}</span></span><button type="button" data-synics="${i}" aria-label="Ajouter ${esc(e.nom || "")} à mon agenda">+ Agenda</button></div>`; }).join("")}
    <div class="synnav" style="border:0;padding-top:6px;margin-top:6px"><button type="button" data-synics="all">Tout ajouter à mon agenda (.ics)</button><a href="/agenda">Agenda complet</a></div>
    <p class="synfoot">Le fichier .ics s'ouvre dans Google Agenda, Apple Calendrier ou Outlook. Rien n'est envoyé.</p>`;
}
function synAlertesHTML(b) {
  const pf = b.portefeuille; if (!pf || !(pf.alertes || []).length && !(pf.levees || []).length) return "";
  const ord = { nouveau: 0, hausse: 1, baisse: 1, stable: 2, null: 3 }, A = pf.alertes.slice().sort((x, y) => (ord[x.evol] ?? 3) - (ord[y.evol] ?? 3));
  const ev = a => a.evol === "nouveau" ? `<span class="synevol">Nouveau</span>` : a.evol === "hausse" || a.evol === "baisse" ? `<span class="synevol">${a.evol === "hausse" ? "En hausse" : "En baisse"}${a.avant != null ? ` : ${nf(a.code === "frais" ? 2 : 0).format(a.avant)} → ${nf(a.code === "frais" ? 2 : 0).format(a.valeur)}${a.code === "frais" ? " %" : " %"}` : ""}</span>` : a.evol === "stable" ? `<span class="synevol st">Inchangé</span>` : "";
  return `<div class="syncard"><h3>Votre portefeuille</h3>${A.map(a => { const l = synLecon(a.code); return `<div class="synal ${esc(a.niveau || "")}"><div><b>${esc(a.texte)}</b>${ev(a)}<p>${esc(a.pourquoi || "")}${l ? ` <a class="lnk" href="${l.href}">${esc(l.titre)} →</a>` : ""}</p></div></div>`; }).join("")}
    ${(pf.levees || []).map(a => `<div class="synal fort"><div><b>${esc(a.texte || "Une alerte de la semaine dernière")}</b><span class="synevol ok">Levée</span><p>Ce point de la semaine dernière ne se vérifie plus.</p></div></div>`).join("")}
    <p class="synfoot">Repères de diversification généraux, calculés sur vos lignes. Ce ne sont pas des conseils personnalisés.</p></div>`;
}
function synHistHTML(b, prem) {
  const H = (b.historique || []).slice(0, prem ? 12 : 2), cur = { semaine: b.semaine, v: b.portefeuille && b.portefeuille.var_pct != null ? b.portefeuille.var_pct : b.moyenne };
  const pts = [...H.map(h => ({ semaine: h.semaine, v: h.portefeuille_pct ?? h.moyenne })).reverse(), cur].filter(x => x.v != null);
  const mx = Math.max(1, ...pts.map(x => Math.abs(x.v)));
  const bars = pts.length >= 2 ? `<div class="synweeks">${pts.map(x => `<a href="/espace/bilan?semaine=${esc(x.semaine)}" class="${x.semaine === b.semaine ? "on" : ""}" title="Semaine ${esc(String(x.semaine).slice(-2))} : ${synPct(x.v)}"><i class="${x.v < 0 ? "neg" : ""}" style="height:${Math.max(2, Math.abs(x.v) / mx * 32)}px"></i><small>S${esc(String(x.semaine).slice(-2))}</small></a>`).join("")}</div>` : "";
  return `<section class="panel"><div class="ph"><h2>Semaines précédentes</h2></div><div class="pb">${bars}${H.length ? H.map(h => { const v = h.portefeuille_pct ?? h.moyenne; return `<a class="synwk" href="/espace/bilan?semaine=${esc(h.semaine)}"><span>Semaine ${esc(String(h.semaine).replace(/^\d{4}-W/, ""))}</span><b class="${synCls(v)} num">${v != null ? synPct(v) : "–"}</b></a>`; }).join("") : `<p class="muted" style="margin:0">Votre première synthèse est celle-ci. Elle est gardée chaque semaine.</p>`}
    ${!prem && (b.historique || []).length > 2 ? `<p class="note"><a class="lnk" href="/premium">Premium</a> garde 12 semaines d'historique, toutes les annonces et l'analyse de chaque ligne.</p>` : !prem ? `<p class="note">Avec <a class="lnk" href="/premium">Premium</a> : 12 semaines d'historique, toutes les annonces et l'analyse de chaque ligne.</p>` : ""}</div></section>`;
}
function synTexte(b) {
  if (b.texte) return `<div class="iares">${resumeHTML(b.texte)}<p class="iafoot">Commentaire rédigé par une IA à partir des seuls chiffres de cette page. Ce n'est pas un conseil.</p></div>`;
  const t = typeof bilanLocal === "function" ? bilanLocal(b) : "";
  return `<div class="iares" id="syniab">${t ? `${resumeHTML(t)}<p class="iafoot">Résumé calculé à partir de vos chiffres.</p>` : ""}${synIaBouton(b)}</div>`;
}
/* Commentaire de la semaine : rédigé à la demande par l'IA connectée du visiteur (m/monia.js), à partir des faits de la synthèse. */
let SYN_IA_B = null;
function synIaBouton(b) {
  SYN_IA_B = b;
  return miaConnectee() ? `<button type="button" class="fapp" data-syn-ia>✦ Commenter ma semaine avec l'IA</button>` : miaInvite();
}
function synIaFaits(c) { // mêmes faits que l'ancien commentaire du serveur : tous calculés par le site
  const L = c.lignes || [];
  return { semaine: c.semaine, periode: c.partiel && c.depuis ? "depuis le " + c.depuis : "semaine complète", moyenne_semaine_pct: c.moyenne, nombre_de_lignes: L.length, hausses: c.hausses, baisses: c.baisses,
    essentiel_calcule: c.essentiel || [], indices: (c.indices || []).map(i => ({ indice: i.nom, variation_semaine_pct: i.pct })),
    portefeuille: c.portefeuille ? { valeur_eur: c.portefeuille.valeur_eur, variation_semaine_eur: c.portefeuille.var_eur, variation_semaine_pct: c.portefeuille.var_pct,
      alertes: (c.portefeuille.alertes || []).filter(a => a.niveau !== "fort").map(a => ({ alerte: a.texte, evolution: a.evol })) } : null,
    lignes: L.filter(l => l.variation_semaine_pct != null).slice(0, 25).map(l => ({ nom: l.nom, variation_semaine_pct: l.variation_semaine_pct, indice_de_reference: l.indice ? l.indice.nom : null, ecart_avec_indice_points: l.ecart_pts, dans_le_portefeuille: !!l.en_portefeuille })),
    annonces: (c.annonces || []).slice(0, 8).map(a => ({ entreprise: a.nom, date: a.date, type: a.type, chiffres: a.chiffres, en_clair: a.resume })),
    a_venir: (c.a_venir || []).slice(0, 6).map(e => ({ entreprise: e.nom, date: e.date, evenement: e.label })),
    secteurs_suivis: (c.secteurs || []).filter(x => x.n).map(x => ({ secteur: x.nom, variation_mediane_semaine_pct: x.mediane_pct, entreprises: x.n, hausses: x.hausses, baisses: x.baisses })) };
}
document.addEventListener("click", async e => {
  const bt = e.target.closest("[data-syn-ia]"); if (!bt || !SYN_IA_B) return;
  bt.disabled = true; bt.textContent = "L'IA rédige le commentaire…";
  const j = await iaRediger("bilan", synIaFaits(SYN_IA_B), { max: 650 });
  bt.outerHTML = j.txt ? `<div class="synia">${resumeHTML(j.txt)}${miaPied(j)}</div>` : miaRendu(j);
});
function synEssentiel(b) {
  if ((b.essentiel || []).length) return b.essentiel;
  const L = (b.lignes || []).filter(l => l.variation_semaine_pct != null).sort((x, y) => y.variation_semaine_pct - x.variation_semaine_pct), E = [];
  if (L.length) E.push(`Vos valeurs suivies ont évolué de ${synPct(b.moyenne)} en moyenne sur la semaine.`);
  if (L.length > 1) E.push(`La plus forte hausse : ${L[0].nom} (${synPct(L[0].variation_semaine_pct)}). La plus forte baisse : ${L[L.length - 1].nom} (${synPct(L[L.length - 1].variation_semaine_pct)}).`);
  if ((b.a_venir || []).length) E.push(`À venir : ${b.a_venir[0].nom}, ${b.a_venir[0].label || ""}, le ${dLabel(b.a_venir[0].date)}.`);
  return E;
}
function synIcs(b, which) {
  const E = (b.a_venir || []).filter(e => e.id || (e.k || "").startsWith("c:")).map(e => ({ id: e.id || e.k.slice(2), date: e.date, label: e.label || e.type || "", source: e.source || "" }));
  const list = which === "all" ? E : [E[+which]].filter(Boolean); if (!list.length) return;
  const a = document.createElement("a"); a.href = URL.createObjectURL(icsFile(list, "Mes rendez-vous (bilan.)")); a.download = list.length > 1 ? "bilan-semaine.ics" : `bilan-${list[0].id}.ics`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); // lien hors de la page : le routeur ne l'intercepte pas
  toast(list.length > 1 ? `${list.length} dates ajoutées au fichier d'agenda.` : "Date ajoutée au fichier d'agenda.");
}
function synNotifHTML() { // lien avec le module « pwa » : bouton d'abonnement aux notifications, s'il le fournit
  try { if (typeof pwaNotifBouton === "function") return pwaNotifBouton({ sujet: "synthese", texte: "Être prévenu chaque samedi" }) || ""; } catch (e) { }
  // sinon : les réglages des notifications push sont en tête de l'onglet Alertes (module pwa)
  if (typeof pwaPanneauPush === "function" && "PushManager" in window && "Notification" in window) return `<a href="/espace/alertes">Être prévenu chaque samedi</a>`;
  return "";
}

/* ---------- Contexte : les sujets d'actualité du site qui touchent les valeurs du rapport ---------- */
let SYN_CTX = undefined;
async function synContexte() { if (SYN_CTX !== undefined) return SYN_CTX; try { const r = await fetch("/data/contexte.json"); SYN_CTX = r.ok ? await r.json() : null; } catch (e) { SYN_CTX = null; } return SYN_CTX; }
const SYN_SENS = { "+": ["plutôt favorable", "up"], "-": ["plutôt défavorable", "dn"], "±": ["à double tranchant", "mx"] };
function synSujets(b) { // sujets du contexte dont au moins un impact vise une valeur du rapport
  const ctx = SYN_CTX; if (!ctx || !ctx.sujets || typeof ctxCible !== "function" || typeof ctxProfil !== "function") return [];
  const cos = (b.lignes || []).filter(l => l.k.startsWith("c:")).map(l => RBY[l.k.slice(2)]).filter(c => c && !c.missing);
  const out = [];
  for (const sj of ctx.sujets) { if (sj.fin && sj.fin < TODAY) continue;
    const touches = [];
    for (const im of sj.impacts || []) for (const c of cos) { let ok = false; try { ok = ctxCible(im.cible, ctxProfil(c, FULL[c.id] || null)); } catch (e) { } if (ok && !touches.some(t => t.c === c)) touches.push({ c, im }); }
    if (touches.length) out.push({ sj, touches });
  }
  return out.sort((x, y) => y.touches.length - x.touches.length).slice(0, 3);
}
function synFaitsIA(b, sujets) { // les faits transmis à l'IA du site : rien d'autre que ce que la page affiche
  const r1 = v => v == null ? null : Math.round(v * 10) / 10, r0 = v => v == null ? null : Math.round(v);
  const f = { semaine: b.semaine, du: b.du, au: b.au, portefeuille: b.portefeuille && b.portefeuille.var_pct != null ? { variation_pct: r1(b.portefeuille.var_pct), variation_eur: r0(b.portefeuille.var_eur) } : null, indices: (b.indices || []).map(i => ({ nom: i.nom, pct: r1(i.pct) })),
    valeurs: (b.lignes || []).map(l => ({ nom: l.nom, variation_semaine_pct: r1(l.variation_semaine_pct), indice: l.indice ? { nom: l.indice.nom, pct: r1(l.indice.pct) } : null, poids_portefeuille_pct: l.portefeuille ? r0(l.portefeuille.poids_pct) : null })),
    annonces: (b.annonces || []).filter(a => a.origine !== "presse").slice(0, 8).map(a => ({ valeur: a.nom || a.k, titre: a.titre, date: a.date, lecture: (a.lecture || []).join(" "), chiffres: a.chiffres })),
    contexte: sujets.map(({ sj, touches }) => ({ sujet: sj.titre, fait: (sj.faits || []).slice(-1)[0], concerne: touches.map(t => `${t.c.name} (${(SYN_SENS[t.im.sens] || SYN_SENS["±"])[0]}) : ${t.im.mecanisme}`) })),
    a_venir: (b.a_venir || []).slice(0, 6).map(e => ({ valeur: e.nom || e.k, quoi: e.label, date: e.date })),
    secteurs: (b.secteurs || []).map(x => ({ secteur: x.nom, mediane_semaine_pct: x.mediane_pct, n: x.n })),
    sources: ["Cours de Bourse relevés par le site (différés)", "Annonces officielles (AMF, SEC) lues par le site", "Sujets d'actualité vérifiés à la main par le site", "Agenda publié par les entreprises"] };
  return JSON.stringify(f);
}
async function synIA(b, el, auto) { // le commentaire de l'IA du site, une fois par semaine et par navigateur
  if (!el || typeof miaAppel !== "function") return;
  const sig = "bilan.ia." + (b.semaine || "") + "." + ((b.lignes || []).map(l => l.k).join(",")).length;
  let cache = null; try { cache = JSON.parse(sessionStorage.getItem(sig) || "null"); } catch (e) { }
  const rendre = txt => { el.innerHTML = `<p class="syn4-iak">La lecture de l'IA du site</p><div class="syn4-iat">${esc(txt).replace(/\n{2,}/g, "</p><p>").replace(/^/, "<p>").replace(/$/, "</p>")}</div><p class="syn4-ias">Rédigée à partir des seuls faits de cette page. Information, pas conseil.</p>`; };
  if (cache && cache.txt) return rendre(cache.txt);
  const lancer = async () => {
    el.innerHTML = `<p class="syn4-iak">La lecture de l'IA du site</p><p class="muted">Rédaction en cours…</p>`;
    const r = await miaAppel("bilan", synFaitsIA(b, synSujets(b)), 700);
    if (r && r.txt) { try { sessionStorage.setItem(sig, JSON.stringify({ txt: r.txt })); } catch (e) { } rendre(r.txt); }
    else el.innerHTML = `<p class="syn4-iak">La lecture de l'IA du site</p><p class="muted">${esc((r && r.message) || "Indisponible pour le moment.")}</p>`;
  };
  if (auto) return lancer();
  el.innerHTML = `<p class="syn4-iak">La lecture de l'IA du site</p><p class="muted" style="margin:0 0 8px">Deux ou trois paragraphes qui relient ces faits entre eux, rédigés à la demande par l'IA du site (compte dans vos questions du jour).</p><button type="button" class="btn" id="syn4-iab">Lire le commentaire de l'IA</button>`;
  const btn = el.querySelector("#syn4-iab"); if (btn) btn.onclick = lancer;
}

let SYN_ANN = []; // annonces affichées, pour le bouton « Expliquer » (31/10, Romain : l'IA explique l'annonce, à la place de « Lire la publication »)
document.addEventListener("click", async e => {
  const btn = e.target.closest("[data-syn-exp]"); if (!btn) return;
  const a = SYN_ANN[+btn.dataset.synExp], box = btn.closest("article").querySelector(".syn4-cl"); if (!a || !box) return;
  btn.disabled = true; btn.textContent = "Rédaction en cours…";
  const co = a.k && a.k.startsWith("c:") ? RBY[a.k.slice(2)] : null, f = co && co.ca != null ? { ventes_millions: co.ca, devise: co.currency } : null;
  let j; try { j = await iaRediger("annonce", { entreprise: a.nom || (co && co.name), secteur: co ? secName(co) : null, activite: co && co.fiche ? co.fiche.fait : co ? co.desc : null, type: SYN_CAT[a.categorie] || a.type, titre_officiel: a.titre, date: a.date, chiffres: a.chiffres || [], lecture_calculee: a.lecture || [], dernier_exercice: f, lien: a.source }, { max: 420 }); } catch (err) { j = { error: "L'IA est indisponible pour le moment." }; }
  btn.remove();
  const x = j.txt && typeof jsonFrom === "function" ? jsonFrom(j.txt) : null;
  box.innerHTML = x && x.clair ? `<div class="ax-cl"><b>En clair</b><p>${esc(x.clair)}</p>${x.change ? `<b>Ce que cela change pour l'entreprise</b><p>${esc(x.change)}</p>` : ""}<small>Rédigé par l'IA de bilan. (${esc(j.modele || "")}) à partir de l'annonce. La source fait foi.</small></div>`
    : j.txt ? `<div class="ax-cl"><b>En clair</b>${resumeHTML(j.txt)}<small>Rédigé par l'IA de bilan. à partir de l'annonce. La source fait foi.</small></div>` : `<p class="muted">${esc(j.error || "Explication indisponible pour le moment.")}</p>`;
});
function synSecteursHTML(b) { // 31/10 (Romain) : la répartition du portefeuille par secteur, en camembert, à côté des valeurs
  const L = (b.lignes || []).filter(l => l.portefeuille && l.portefeuille.poids_pct != null); if (L.length < 2) return "";
  const G = {}; L.forEach(l => { const c = l.k.startsWith("c:") ? RBY[l.k.slice(2)] : null, k = l.type === "etf" ? "ETF" : c ? secName(c) : "Autre"; G[k] = (G[k] || 0) + l.portefeuille.poids_pct; });
  const parts = Object.entries(G).sort((x, y) => y[1] - x[1]), tot = parts.reduce((a, [, v]) => a + v, 0) || 1;
  const teintes = ["#1F1D1A", "#4A4640", "#79746C", "#A8A299", "#CBC5BA", "#E3DED5", "#F0ECE4"]; // une seule teinte, du foncé au clair, dans l'ordre des poids
  let acc = 0; const R = 46, C = 2 * Math.PI * R;
  const arcs = parts.map(([k, v], i) => { const f = v / tot, d = `<circle r="${R}" cx="60" cy="60" fill="none" stroke="${teintes[Math.min(i, teintes.length - 1)]}" stroke-width="20" stroke-dasharray="${(C * f - 2).toFixed(2)} ${(C - C * f + 2).toFixed(2)}" stroke-dashoffset="${(-C * acc).toFixed(2)}" transform="rotate(-90 60 60)"><title>${esc(k)} : ${nf(0).format(f * 100)} %</title></circle>`; acc += f; return d; }).join("");
  const plus = parts[0], lecture = parts.length === 1 ? "" : plus[1] / tot > 0.5 ? `Plus de la moitié du portefeuille est dans un seul secteur (${plus[0]}) : ce qui arrive à ce secteur pèse sur l'ensemble.` : parts.length >= 4 ? `Quatre secteurs ou plus : les hausses et les baisses d'un secteur se compensent en partie.` : `Le portefeuille repose sur ${parts.length} secteur${parts.length > 1 ? "s" : ""}.`;
  return `<div class="syn4-rep"><svg viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="Répartition du portefeuille par secteur">${arcs}</svg>
    <div class="syn4-repl"><p class="syn4-iak">Répartition par secteur</p><ul>${parts.map(([k, v], i) => `<li><i style="background:${teintes[Math.min(i, teintes.length - 1)]}"></i><span>${esc(k)}</span><b>${nf(0).format(v / tot * 100)} %</b></li>`).join("")}</ul>${lecture ? `<p class="syn4-ias">${esc(lecture)} Repère général de diversification, pas un conseil.</p>` : ""}</div></div>`;
}
function synFavorisHTML(b) { // 31/10 : la performance de vos favoris (hors portefeuille) sur la semaine, et pourquoi chaque valeur a bougé
  const F = (b.lignes || []).filter(l => !l.portefeuille && l.variation_semaine_pct != null); if (!F.length) return "";
  const moy = F.reduce((a, l) => a + l.variation_semaine_pct, 0) / F.length, h = F.filter(l => l.variation_semaine_pct > 0).length, idx = (b.indices || [])[0];
  return `<div class="syn4-tuiles syn4-fav"><div class="syn4-t"><small>Vos favoris, en moyenne</small><b class="${synCls(moy)}">${synPct(moy)}</b><span>${h} sur ${F.length} en hausse cette semaine</span></div>${idx ? `<div class="syn4-t"><small>${esc(idx.nom)}, pour comparer</small><b class="${synCls(idx.pct)}">${synPct(idx.pct)}</b></div>` : ""}</div>`;
}
function synPourquoi(l, A, b) { // une raison factuelle du mouvement : annonce officielle, secteur entier, ou simple marché
  const v = l.variation_semaine_pct; if (v == null) return "";
  if (A.length) return `${v > 0 ? "Monte" : v < 0 ? "Baisse" : "Stable"} la semaine de sa publication « ${A[0].titre || SYN_CAT[A[0].categorie] || "annonce"} ».`;
  const c = l.k.startsWith("c:") ? RBY[l.k.slice(2)] : null, sec = c && (b.secteurs || []).find(x => x.nom === secName(c) && x.mediane_pct != null);
  if (sec && Math.abs(sec.mediane_pct) >= 1 && Math.sign(sec.mediane_pct) === Math.sign(v)) return `Tout son secteur ${sec.mediane_pct > 0 ? "monte" : "baisse"} (médiane ${synPct(sec.mediane_pct)}) : mouvement d'ensemble, pas propre à l'entreprise.`;
  if (l.indice && l.ecart_pts != null && Math.abs(l.ecart_pts) < 1.5) return `Suit son marché (${l.indice.nom} ${synPct(l.indice.pct)}) : pas de publication officielle cette semaine.`;
  return `Pas de publication officielle cette semaine : le mouvement vient du marché, pas d'une nouvelle de l'entreprise.`;
}
function synIdeeHTML(b) { // 31/10 : une piste à découvrir, factuelle : une entreprise du jour dans un secteur absent de la liste
  if (typeof outDayPicks !== "function" || typeof outDecCard !== "function") return ""; if (typeof outCSS === "function") outCSS(); if (typeof recoCSS === "function") recoCSS();
  const secs = new Set((b.lignes || []).map(l => { const c = l.k.startsWith("c:") ? RBY[l.k.slice(2)] : null; return c ? c.sector : null; }).filter(Boolean));
  let picks = []; try { picks = outDayPicks(TODAY, 6); } catch (e) { return ""; }
  const x = picks.find(p => p && p.c && !secs.has(p.c.sector)) || picks[0]; if (!x) return "";
  return `<section class="syn4-sec"><h2>Une entreprise à découvrir</h2><p class="syn4-ias" style="margin:0 0 10px">Tirée des découvertes du jour, dans un secteur ${secs.has(x.c.sector) ? "que vous suivez déjà" : "absent de votre liste"}. Une information, pas une recommandation.</p><div class="out-dg syn4-idee">${outDecCard(x, false)}</div></section>`;
}
function synPageHTML(b, m) {
  SYN_ANN = [];
  // 30/10 (Romain) : capter l'attention par le visuel, moins de texte ; l'actualité interprétée et son contexte ; le portefeuille simulé ; les valeurs en liste compacte
  const ess = synEssentiel(b), sem = String(b.semaine || "").replace(/^\d{4}-W/, ""), pf = b.portefeuille;
  const statut = b.en_cours === false || b.provisoire === false ? "Synthèse définitive" : "Semaine en cours, mise à jour à chaque visite";
  const jour = iso => { const d = new Date(iso + "T12:00:00Z"); return `${SYN_JOURS[d.getUTCDay()]} ${d.getUTCDate()} ${SYN_MOIS[d.getUTCMonth()]}`; };
  const anglais = t => /\b(the|and|of|billion|million|quarter|year|growth|guidance)\b/i.test(String(t || ""));
  const generique = t => /^(Une information publiée par l'entreprise|La publication des ventes de la période|Document déposé)/.test(String(t || ""));
  // 1. En un coup d'œil : trois ou quatre grands chiffres
  const tuiles = [];
  if (pf && pf.var_pct != null) tuiles.push(`<div class="syn4-t syn4-tp"><small>Mon portefeuille</small><b class="${synCls(pf.var_pct)}">${synPct(pf.var_pct)}</b>${pf.var_eur != null ? `<span>${synEur(pf.var_eur)} cette semaine</span>` : ""}</div>`);
  (b.indices || []).slice(0, 3).forEach(i => tuiles.push(`<div class="syn4-t"><small>${esc(i.nom)}</small><b class="${synCls(i.pct)}">${synPct(i.pct)}</b></div>`));
  // 2. L'actualité qui touche vos valeurs : annonces lues + sujets du contexte
  const ROUT = new Set(["rachat", "capital", "initie", "agenda", "autre"]), seen = new Set();
  const annonces = (b.annonces || []).filter(a => a.origine !== "presse" && !ROUT.has(a.categorie) && !seen.has(a.k + a.titre) && seen.add(a.k + a.titre)).sort((x, y) => y.poids - x.poids).map(a => {
    const lec = (a.lecture || []).filter(t => t && t !== a.resume && !generique(t)).join(" "), ch = (a.chiffres || []).slice(0, 3);
    const corps = lec || (a.resume && !anglais(a.resume) && !generique(a.resume) ? a.resume : "");
    if (!corps && !ch.length && a.categorie !== "resultats") return "";
    return `<article class="syn4-ann"><div class="syn4-annh">${synLogo(a.k, 26)}<a href="${synLien(a.k)}"><b>${esc(a.nom || synObj(a.k) && synObj(a.k).name || "")}</b></a><span class="syn4-pill">${esc(SYN_CAT[a.categorie] || a.type || "Annonce")}</span><small>${esc(jour(a.date))}</small></div>
      <p class="syn4-annt">${esc(a.titre || "")}</p>
      ${ch.length ? `<div class="syn4-ch">${ch.map(([l, v]) => `<span><small>${esc(l)}</small><b>${esc(String(v))}</b></span>`).join("")}</div>` : ""}
      ${corps ? `<p class="syn4-lec">${esc(corps)}</p>` : `<p class="syn4-lec muted">Chiffres pas encore relevés par le site ; ses indicateurs restent ceux du dernier exercice clos.</p>`}
      <div class="syn4-acts">${miaConnectee() ? `<button type="button" class="syn4-exp" data-syn-exp="${SYN_ANN.push(a) - 1}">✦ Expliquer</button>` : ""}${a.source ? `<a class="lnk" href="${esc(a.source)}" target="_blank" rel="noopener">La publication</a>` : ""}</div><div class="syn4-cl"></div></article>`;
  }).filter(Boolean).slice(0, 4);
  const sujets = synSujets(b).map(({ sj, touches }) => `<article class="syn4-sj"><p class="syn4-theme">${esc(sj.theme)}</p><h4>${esc(sj.titre)}</h4><p class="syn4-fait">${esc((sj.faits || []).slice(-1)[0] || "")}</p>
      <ul class="syn4-touch">${(() => { const G = []; touches.forEach(t => { const g = G.find(x => x.im === t.im); if (g) g.cs.push(t.c); else G.push({ im: t.im, cs: [t.c] }); }); return G.slice(0, 4).map(g => { const [l, c] = SYN_SENS[g.im.sens] || SYN_SENS["±"]; return `<li>${g.cs.map(x => `<a href="/entreprise/${x.id}">${esc(x.name)}</a>`).join(", ")} <em class="syn4-s${c}">${l}</em><span>${esc(accPhraseCourte(g.im.mecanisme))}</span></li>`; }).join(""); })()}</ul></article>`);
  // 3. Votre portefeuille : variation, simulation et concentration
  let pfHTML = "";
  if (pf && pf.var_pct != null) {
    const mise = 1000, apres = mise * (1 + pf.var_pct / 100);
    const grosse = (b.lignes || []).filter(l => l.portefeuille && l.portefeuille.poids_pct != null).sort((x, y) => y.portefeuille.poids_pct - x.portefeuille.poids_pct)[0];
    const sim = [`<div class="syn4-sim"><small>1 000 € placés comme votre portefeuille au début de la semaine</small><b>${nf(0).format(Math.round(apres))} €</b><span>soit ${synEur(apres - mise)}</span></div>`];
    if (grosse) sim.push(`<div class="syn4-sim"><small>Si ${esc(grosse.nom)} (${nf(0).format(grosse.portefeuille.poids_pct)} % du portefeuille) baissait de 30 %</small><b class="dn">${synPct(-0.3 * grosse.portefeuille.poids_pct, 0)}</b><span>sur l'ensemble, toutes choses égales par ailleurs</span></div>`);
    const total = pf.valeur_eur || (pf.var_eur != null && pf.var_pct ? pf.var_eur / pf.var_pct * 100 : null);
    if (total) sim.push(`<div class="syn4-sim"><small>Si tout le marché baissait de 10 %</small><b class="dn">${synEur(-0.1 * total)}</b><span>environ, sur ${nf(0).format(Math.round(total))} € : un portefeuille d'actions suit le marché à court terme</span></div>`);
    pfHTML = `${synSecteursHTML(b)}<div class="syn4-sims">${sim.join("")}</div>${synAlertesHTML(b).replace('<h3>Votre portefeuille</h3>', "")}<p class="syn4-ias">Simulations arithmétiques sur vos lignes, pas des prévisions. Information, pas conseil.</p>`;
  }
  // 4. Vos valeurs : une ligne par valeur, le détail au clic
  const L = (b.lignes || []).slice().sort((x, y) => Math.abs(y.variation_semaine_pct ?? 0) - Math.abs(x.variation_semaine_pct ?? 0));
  const lignes = L.map(l => {
    const v = l.variation_semaine_pct, c = l.k.startsWith("c:") ? RBY[l.k.slice(2)] : null, A = (b.annonces || []).filter(a => a.k === l.k && a.origine !== "presse" && !ROUT.has(a.categorie));
    const ev = A[0] ? SYN_CAT[A[0].categorie] || A[0].type || "Annonce" : "", nx = (b.a_venir || []).find(e => e.k === l.k);
    const { pts } = synPoints(l, b), rep = pts.find(p => p.zone && !/^Publié cette semaine|^Un mouvement|^C'est /.test(p.txt));
    return `<details class="syn4-l"><summary><span class="syn4-ln">${synLogo(l.k, 26)}<span><b>${esc(l.nom)}</b><small>${l.type === "etf" ? "ETF" : c ? esc(secName(c)) : ""}${l.portefeuille ? ` · ${nf(0).format(l.portefeuille.poids_pct)} %` : ""}</small></span></span>
        <span class="syn4-lv ${v == null ? "na" : synCls(v)}">${v == null ? "–" : synPct(v)}</span><span class="syn4-li">${l.indice && l.ecart_pts != null ? `${l.ecart_pts > 0 ? "+" : l.ecart_pts < 0 ? "−" : ""}${nf(1).format(Math.abs(l.ecart_pts))} pt vs ${esc(l.indice.nom)}` : ""}</span>
        <span class="syn4-le">${ev ? `<span class="syn4-pill">${esc(ev)}</span>` : ""}${nx ? `<small>${esc(jour(nx.date))} : ${esc(nx.label)}</small>` : ""}</span><span class="syn4-why">${esc(synPourquoi(l, A, b))}</span></summary>
      <div class="syn4-ld">${A.slice(0, 2).map(a => `<p><b>${esc(a.titre || a.type)}</b> <small>${esc(jour(a.date))}</small>${(a.lecture || []).filter(t => !generique(t)).length ? `<br>${esc((a.lecture || []).filter(t => !generique(t)).join(" "))}` : ""}${a.source ? ` <a class="lnk" href="${esc(a.source)}" target="_blank" rel="noopener">Lire</a>` : ""}</p>`).join("")}
        ${rep ? `<p class="${rep.zone}">${c ? "Sur ses comptes : " : ""}${esc(rep.txt).replace(/(^|[\s(:])-(\d)/g, "$1−$2")}</p>` : ""}
        <p><a class="lnk" href="${synLien(l.k)}">Ouvrir la fiche →</a></p></div></details>`;
  }).join("");
  const sect = (b.secteurs || []).filter(x => x.n).map(x => `<div class="syn4-t"><small>${esc(x.nom)}</small><b class="${synCls(x.mediane_pct)}">${synPct(x.mediane_pct)}</b><span>médiane de ${x.n} entreprises</span></div>`);
  return `<div class="syn4">
    <header class="syn4-head"><p class="syn4-date">Semaine ${esc(sem)}${b.du ? ` · ${esc(synDuAu(b))}` : ""}${b.genere ? ` · chiffres du ${esc(new Date(b.genere).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }))}` : ""} · ${esc(statut).toLowerCase()}</p>
      ${tuiles.length ? `<div class="syn4-tuiles">${tuiles.join("")}</div>` : ""}
      ${ess.length ? `<ol class="synk syn4-ess">${ess.map(p => `<li>${synInsec(p)}</li>`).join("")}</ol>` : ""}</header>
    <section class="syn4-sec"><h2>L'actualité qui touche vos valeurs</h2>
      ${annonces.length ? `<div class="syn4-anns">${annonces.join("")}</div>` : `<p class="muted">Aucune publication officielle de vos valeurs cette semaine.</p>`}
      ${sujets.length ? `<h3>Le contexte</h3><div class="syn4-sjs">${sujets.join("")}</div>` : ""}
</section>
    ${pfHTML ? `<section class="syn4-sec"><h2>Votre portefeuille</h2>${pfHTML}</section>` : ""}
    <section class="syn4-sec"><h2>Vos valeurs</h2>${synFavorisHTML(b)}<div class="syn4-ls">${lignes || `<p class="muted">Ajoutez des favoris ou des lignes de portefeuille pour les suivre ici.</p>`}</div></section>
    <section class="syn4-sec"><h2>À venir sur deux semaines</h2><p class="syn4-ias" style="margin:0 0 10px">Votre portefeuille d'abord, vos favoris ensuite.</p>${synAgendaHTML(b)}</section>
    ${synIdeeHTML(b)}
    ${sect.length ? `<section class="syn4-sec"><h2>Les secteurs que vous suivez</h2><div class="syn4-tuiles">${sect.join("")}</div></section>` : ""}
    <p class="synfoot">Variations entre la clôture précédant la semaine et le dernier cours connu (différé), dans la devise de cotation. Annonces : documents officiels (AMF, SEC) lus par le site. Information, pas conseil.</p>
  </div>`;
}
const accPhraseCourte = t => { const m = String(t || "").match(/^.*?[.!?](\s|$)/); return (m ? m[0] : String(t || "")).trim(); };

async function synCharger(qs) {
  try { const r = await fetch("/api/espace/bilan" + qs, { credentials: "same-origin" }); return synNormalise(await r.json()); } catch (e) { return { error: "Synthèse indisponible pour le moment." }; }
}

function synNormalise(b) { // bilans enregistrés avant la synthèse (format précédent) : mêmes champs de base
  if (!b || b.error) return b || { error: "Synthèse indisponible pour le moment." };
  const kOf = x => x.k || (x.id ? "c:" + x.id : "");
  b.lignes = (b.lignes || []).filter(l => l && l.k).map(l => ({ type: l.k.startsWith("e:") ? "etf" : "action", favori: !l.en_portefeuille, ...l }));
  b.annonces = (b.annonces || []).map(a => ({ ...a, k: kOf(a) })).filter(a => a.k);
  b.a_venir = (b.a_venir || []).map(e => ({ ...e, k: kOf(e), id: e.id || (kOf(e).startsWith("c:") ? kOf(e).slice(2) : "") })).filter(e => e.k);
  return b;
}

/* ---------- Mon espace : la synthèse remplace l'ancien bilan ---------- */
async function espaceBilan(el, m) {
  el.innerHTML = `<div class="empty">Préparation de votre semaine…</div>`;
  const sem = new URLSearchParams(location.search).get("semaine") || "";
  const [b] = await Promise.all([synCharger(sem ? "?semaine=" + encodeURIComponent(sem) : ""), typeof PXP !== "undefined" ? PXP : null, typeof acaLoad === "function" ? acaLoad() : null, synContexte(), typeof loadFiches === "function" ? loadFiches() : null]);
  if (b.error) { el.innerHTML = `<section class="panel"><div class="pb">${esc(b.error)} <a class="lnk" href="/espace">Revenir à la semaine en cours</a></div></section>`; return; }
  if (b.vide || !(b.lignes || []).length) { el.innerHTML = `<section class="synhero"><p class="kick">Votre semaine en 2 minutes</p><h2>Votre synthèse se construit avec ce que vous suivez</h2><p style="margin:0 0 12px">Ajoutez des entreprises ou des ETF à vos favoris (bouton « ☆ Ajouter aux favoris » de chaque fiche) ou à votre portefeuille. Chaque semaine, vous retrouverez ici leurs variations, leurs annonces, les dates à venir et ce que cela change.</p><div class="synnav" style="border:0;padding:0;margin:0"><a class="pri" href="/entreprises">Parcourir les entreprises</a><a href="/etf">Les ETF</a><a href="/portefeuille">Mon portefeuille</a></div></section>`; return; }
  el.innerHTML = synPageHTML(b, m);
  synIA(b, document.getElementById("syn4-ia"), true);
  if (/^#syn(var|act|av|int)$/.test(location.hash)) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => t.scrollIntoView({ block: "start" }), 60); }
  el.onclick = e => {
    const i = e.target.closest("[data-synics]"); if (i) { synIcs(b, i.dataset.synics); return; }
    const j = e.target.closest("[data-synjump]"); if (j) { const t = document.getElementById(j.dataset.synjump); if (t) { e.preventDefault(); t.scrollIntoView({ behavior: "smooth", block: "start" }); } }
  };
}

/* ---------- Accueil d'un membre connecté (appelée par pageHome) ---------- */
async function synAccueil(el, m) {
  el.innerHTML = `<section class="panel"><div class="pb"><p class="muted" style="margin:0">Préparation de votre semaine…</p></div></section>`;
  const b = await synCharger("?apercu=1");
  if (!el.isConnected) return;
  if (b.error || b.vide || !(b.lignes || []).length) {
    el.innerHTML = `<section class="panel"><div class="pb espteaser"><div><b>Votre semaine en 2 minutes vous attend dans votre espace.</b><div class="muted">Ajoutez des entreprises ou des ETF à vos favoris : chaque semaine, leurs variations, leurs annonces et les dates à venir, résumées pour vous.${m.nonlus ? ` ${m.nonlus} alerte${m.nonlus > 1 ? "s" : ""} non lue${m.nonlus > 1 ? "s" : ""}.` : ""}</div></div><a class="btn" href="/espace">Ouvrir mon espace</a></div></section>`; return;
  }
  const L = (b.lignes || []).filter(l => l.variation_semaine_pct != null), pf = b.portefeuille, best = L[0], worst = L.length > 1 ? L[L.length - 1] : null, ess = synEssentiel(b);
  const kp = [pf && pf.var_pct != null ? `<a class="synkpi" href="/portefeuille"><small>Mon portefeuille</small><b class="${synCls(pf.var_eur)}">${synEur(pf.var_eur)}</b><span>${synPct(pf.var_pct)} sur la semaine</span></a>` : L.length ? `<div class="synkpi"><small>Moyenne de vos valeurs</small><b class="${synCls(b.moyenne)}">${synPct(b.moyenne)}</b><span>${b.hausses || 0} en hausse · ${b.baisses || 0} en baisse</span></div>` : "",
    best ? `<a class="synkpi" href="${synLien(best.k)}"><small>Plus forte hausse</small><b class="${synCls(best.variation_semaine_pct)}">${synPct(best.variation_semaine_pct)}</b><span>${esc(best.nom)}</span></a>` : "",
    worst ? `<a class="synkpi" href="${synLien(worst.k)}"><small>Plus forte baisse</small><b class="${synCls(worst.variation_semaine_pct)}">${synPct(worst.variation_semaine_pct)}</b><span>${esc(worst.nom)}</span></a>` : ""].filter(Boolean);
  el.innerHTML = `<section class="panel"><div class="pb synhome"><div><p class="kick">Votre semaine en 2 minutes · semaine ${esc(String(b.semaine || "").replace(/^\d{4}-W/, ""))}</p>
      ${ess.length ? `<ol class="synk" style="margin-top:8px">${ess.map(p => `<li>${synInsec(p)}</li>`).join("")}</ol>` : ""}
      <div class="synnav" style="border:0;padding-top:4px"><a class="pri" href="/espace">Lire ma semaine (${b.lecture_min || 2} min)</a>${(b.annonces || []).length ? `<a href="/espace#synact">${b.annonces.length} actualité${b.annonces.length > 1 ? "s" : ""}</a>` : ""}${(b.a_venir || []).length ? `<a href="/espace#synav">${b.a_venir.length} date${b.a_venir.length > 1 ? "s" : ""} à venir</a>` : ""}${m.nonlus ? `<a href="/espace/alertes">${m.nonlus} alerte${m.nonlus > 1 ? "s" : ""}</a>` : ""}</div></div>
      ${kp.length ? `<div class="kp">${kp.join("")}</div>` : ""}</div></section>`;
}


/* ---------- Mon espace : même page, onglet renommé « Ma semaine » ---------- */
async function pageEspace(onglet) {
  setTitle("Mon espace"); setNav("esp");
  app.innerHTML = `<div class="empty">Chargement…</div>`;
  const m = await moi(true);
  if (!m.connecte) return espaceConnexion();
  onglet = onglet || "bilan";
  const tabs = [["bilan", "Ma semaine"], ["alertes", `Alertes${m.nonlus ? ` <span class="espn2">${m.nonlus}</span>` : ""}`], ["favoris", "Mes favoris"], ["portefeuille", "Mon portefeuille"], ["reglages", "Réglages"]];
  app.innerHTML = `<div class="esphead"><div><p class="kick">Mon espace${m.premium ? " · Premium" : ""}</p><h1 class="pagetitle" style="margin:2px 0 0">Bonjour</h1><p class="muted" style="margin:2px 0 0">${esc(m.email)}</p></div>${m.premium ? "" : `<a class="btn ghost" href="/premium">Passer à Premium</a>`}</div>
    <nav class="esptabs scroll-x">${tabs.map(([k, l]) => `<a href="${k === "favoris" ? "/favoris" : k === "portefeuille" ? "/portefeuille" : "/espace/" + k}" class="${k === onglet ? "on" : ""}">${l}</a>`).join("")}</nav><div id="espb"></div>`;
  const el = $("#espb");
  if (onglet === "bilan") return espaceBilan(el, m);
  if (onglet === "alertes") return espaceAlertes(el, m);
  return espaceReglages(el, m);
}

/* ---------- Le rapport exemple, public (30/10/2026) ----------
   Le vrai rapport de la semaine, calculé ce jour avec les chiffres du site, pour un profil fictif. En tête : ce qui est suivi
   dans cet exemple et ce que chacun peut régler dans le sien. Rien n'est enregistré. */
const SYN_EX_REG = [
  ["Ce qu'il suit", "Vos favoris, votre portefeuille, ou les deux. Ici : quatre favoris et un petit portefeuille PEA."],
  ["Les secteurs", "Jusqu'à deux secteurs suivis gratuitement (six avec Premium), avec leur médiane de la semaine. Ici : énergie et technologie."],
  ["Les indices", "Les indices de référence affichés en face de vos lignes. Ici : CAC 40, Euro Stoxx 50 et S&P 500."],
  ["Les sujets", "Résultats, dividendes, actualité, leçons : vous gardez ceux qui vous intéressent."],
  ["Le jour d'envoi", "Samedi, dimanche ou lundi matin, par e-mail ou dans votre espace. Le rapport se met à jour pendant la semaine."],
];
async function pageRapportExemple() {
  setTitle("Un rapport de la semaine, en exemple"); if (typeof setNav === "function") setNav("espace");
  app.innerHTML = `<div class="crumbs"><a href="/espace">Mon espace</a> › Rapport exemple</div><div class="empty">Calcul du rapport de cette semaine…</div>`;
  let b = null; try { const r = await fetch("/api/rapport-exemple"); b = r.ok ? await r.json() : null; } catch (e) { }
  if (!b) { app.innerHTML = `<section class="panel"><div class="pb">Le rapport exemple n'a pas pu être calculé pour le moment. <a class="lnk" href="/espace">Créer mon rapport</a></div></section>`; return; }
  await Promise.all([typeof PXP !== "undefined" ? PXP : null, typeof acaLoad === "function" ? acaLoad() : null, synContexte(), typeof loadFiches === "function" ? loadFiches() : null]);
  b = synNormalise(b);
  app.innerHTML = `<div class="crumbs"><a href="/espace">Mon espace</a> › Rapport exemple</div>
    <h1 class="pagetitle">Le rapport de la semaine, en vrai</h1>
    <p class="pagesub">Ce que reçoit un membre, calculé aujourd'hui avec les chiffres du site, pour un profil d'exemple (quatre favoris, un petit portefeuille PEA, deux secteurs). Le vôtre suit vos propres titres.</p>
    <div id="synex">${synPageHTML(b, { premium: false })}</div>
    <section class="synx"><h2>Ce que vous réglez dans le vôtre</h2><ul class="synx-l">${SYN_EX_REG.map(([t, d]) => `<li><b>${esc(t)}</b> : ${esc(d)}</li>`).join("")}</ul></section>
    <section class="panel"><div class="pb" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between"><span>Gratuit, sans carte bancaire : il suffit d'une adresse e-mail.</span><a class="btn" href="/espace">Créer mon rapport</a></div></section>`;
  synIA(b, document.getElementById("syn4-ia"), false);
  const ex = document.getElementById("synex"); if (ex) ex.onclick = e => { const i = e.target.closest("[data-synics]"); if (i) { synIcs(b, i.dataset.synics); return; } const j = e.target.closest("[data-synjump]"); if (j) { const t = document.getElementById(j.dataset.synjump); if (t) { e.preventDefault(); t.scrollIntoView({ behavior: "smooth", block: "start" }); } } };
}
ROUTES_EXTRA.push([/^\/rapport-exemple\/?$/, () => pageRapportExemple()]);
document.head.insertAdjacentHTML("beforeend", `<style>
#synex .synwrap{grid-template-columns:minmax(0,1fr)!important}#synex .synwrap > :not(:first-child){display:none}
.synx-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0;border-top:1px solid var(--line2)}
.synx-g > div{padding:14px 22px;border-right:1px solid var(--line2);border-bottom:1px solid var(--line2)}.synx-g b{font-size:14.5px}.synx-g p{margin:4px 0 0;font-size:13.5px;color:var(--grey);line-height:1.5}
</style>`);

/* 30/10 (Romain) : plus de mini-courbes dans le rapport ; la variation de la semaine en grand, en première colonne après le nom */
document.head.insertAdjacentHTML("beforeend", `<style>
.synhead.syn-nosp,.synrows.syn-nosp .synrow{grid-template-columns:minmax(0,1fr) 110px 150px 90px}
.synrows.syn-nosp .synrow .v{font-size:18px;font-weight:700}
@media (max-width:760px){.synrows.syn-nosp .synrow{grid-template-columns:minmax(0,1fr) 90px}.synrows.syn-nosp .synrow .vs{grid-row:2;grid-column:1/2;padding-left:40px}.synrows.syn-nosp .synrow .eu{grid-row:2;grid-column:2}}
</style>`);
document.head.insertAdjacentHTML("beforeend", `<style>
.syn2{max-width:860px}.syn2-head{padding:6px 0 10px}.syn2-head h2{font-family:var(--serif);font-size:28px;margin:2px 0 6px}.syn2-meta{font-size:13px;color:var(--grey);margin:0 0 12px}
.syn2 .synk{margin:0 0 14px}.syn2-kpi{font-size:14px;color:var(--grey);margin:0}.syn2-kpi b{color:var(--ink);font-family:var(--mono)}.syn2-kpi .sep{margin:0 10px;color:var(--light)}
.syn2-sec{background:#fff;border:1px solid var(--line2);border-radius:14px;padding:18px 22px;margin:14px 0}.syn2-sec > h2{font-family:var(--serif);font-size:20px;margin:0 0 10px}
.syn2-co{padding:14px 0;border-top:1px solid var(--line2)}.syn2-co:first-of-type{border-top:0}
.syn2-h{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:12px;align-items:center}.syn2-h a{color:inherit;text-decoration:none;display:flex;flex-direction:column}.syn2-h a b{font-size:16px}.syn2-h a small{font-size:12.5px;color:var(--grey)}
.syn2-v{font-family:var(--mono);font-size:22px;font-weight:700;text-align:right;display:flex;flex-direction:column;align-items:flex-end;line-height:1.1}.syn2-v small{font-family:var(--sans);font-size:12px;font-weight:500;color:var(--grey);margin-top:3px}.syn2-v.up{color:var(--g)}.syn2-v.down{color:var(--o)}.syn2-v.na{color:var(--light)}
.syn2-l{margin:10px 0 0 42px;padding:0;list-style:none;display:grid;gap:8px}.syn2-l li{font-size:14px;line-height:1.5;color:var(--ink)}.syn2-l li small{color:var(--grey);font-size:12.5px}.syn2-l li .vert{color:var(--g)}.syn2-l li .rouge{color:#A8481A}
.syn2-rien{margin:8px 0 0 42px;font-size:13.5px;color:var(--light)}.syn2-sect{margin:0;padding-left:18px;font-size:14px;line-height:1.6}.syn2-al .synal{border:0;padding:0;background:transparent}
.syn3-head{padding:0 0 18px;border-bottom:1px solid var(--ink)}.syn3-date{font-size:13px;color:var(--grey);margin:0 0 6px}.syn3-head h2{font-family:var(--serif);font-weight:800;font-size:30px;letter-spacing:-.015em;margin:0 0 12px}
.syn3-ess{margin:0 0 12px}.syn3 .syn2-meta{margin:10px 0 0}
.syn3-sec{padding:18px 0 6px;border-bottom:1px solid var(--rule)}.syn3-sec > h2{font-family:var(--serif);font-weight:800;font-size:22px;margin:0 0 6px}
.syn3-co{display:grid;grid-template-columns:minmax(0,1fr);padding:16px 0;border-top:1px solid var(--rule)}.syn3-co:first-of-type{border-top:0}
.syn3-h{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:12px;align-items:center}.syn3-h a{color:inherit;text-decoration:none;display:flex;flex-direction:column}.syn3-h a b{font-size:16.5px}.syn3-h a small{font-size:12.5px;color:var(--grey)}
.syn3-v{font-family:var(--mono);font-size:22px;font-weight:500;text-align:right;display:flex;flex-direction:column;align-items:flex-end;line-height:1.1}.syn3-v small{font-family:var(--sans);font-size:12px;font-weight:500;color:var(--grey);margin-top:3px}.syn3-v.na{color:var(--light)}
.syn3-b{margin:10px 0 0 40px;display:grid;gap:8px}.syn3-b p{margin:0;font-size:14.5px;line-height:1.55}.syn3-fait small{color:var(--grey);font-size:12.5px;font-weight:400}.syn3-cours{color:var(--ink)}.syn3-rep{color:var(--grey)}.syn3-rep.vert{color:var(--g)}.syn3-rep.rouge{color:var(--down)}.syn3-nx{color:var(--grey)}
.synx{margin:28px 0 18px}.synx h2{font-size:17px;font-weight:700;margin:0 0 8px}.synx-l{margin:0;padding-left:18px;font-size:14px;line-height:1.6;color:var(--grey)}.synx-l b{color:var(--ink);font-weight:600}
.syn4{max-width:900px}.syn4-head{padding:0 0 18px;border-bottom:1px solid var(--ink)}.syn4-date{font-size:13px;color:var(--grey);margin:0 0 14px}
.syn4-tuiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0;border:1px solid var(--rule);border-radius:12px;overflow:hidden;background:#fff}
.syn4-t{padding:14px 16px;border-right:1px solid var(--rule);display:flex;flex-direction:column;gap:4px}.syn4-t:last-child{border-right:0}.syn4-t small{font-size:12.5px;color:var(--grey)}.syn4-t b{font-family:var(--mono);font-weight:500;font-size:30px;line-height:1}.syn4-t span{font-size:12px;color:var(--light)}.syn4-tp{background:var(--soft)}
.syn4-ess{margin:16px 0 0}
.syn4-sec{padding:20px 0 8px;border-bottom:1px solid var(--rule)}.syn4-sec > h2{font-family:var(--serif);font-weight:800;font-size:24px;letter-spacing:-.01em;margin:0 0 12px}.syn4-sec h3{font-size:15px;font-weight:700;margin:18px 0 8px}
.syn4-anns{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}
.syn4-ann{border:1px solid var(--rule);border-radius:12px;padding:14px 16px;background:#fff;display:flex;flex-direction:column;gap:8px}
.syn4-annh{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.syn4-annh a{color:var(--ink);text-decoration:none;font-size:15px}.syn4-annh small{color:var(--grey);font-size:12.5px;margin-left:auto}
.syn4-pill{font-size:11.5px;font-weight:600;padding:3px 8px;border-radius:99px;background:var(--soft);color:var(--grey)}
.syn4-annt{margin:0;font-weight:600;font-size:14.5px}.syn4-ch{display:flex;flex-wrap:wrap;gap:6px 20px}.syn4-ch span{display:flex;flex-direction:column}.syn4-ch small{font-size:11.5px;color:var(--grey)}.syn4-ch b{font-family:var(--mono);font-weight:500;font-size:18px}
.syn4-lec{margin:0;font-size:14px;line-height:1.5}
.syn4-sjs{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:0 28px}
.syn4-sj{padding:10px 0 12px;border-top:1px solid var(--rule)}.syn4-theme{font-size:12.5px;color:var(--grey);margin:0 0 2px;font-weight:600}.syn4-sj h4{font-size:16px;font-weight:700;margin:0 0 6px}.syn4-fait{margin:0 0 8px;font-size:13.5px;line-height:1.5;color:var(--grey)}
.syn4-touch{list-style:none;margin:0;padding:0;display:grid;gap:6px}.syn4-touch li{font-size:13.5px;line-height:1.45}.syn4-touch li a{font-weight:600;color:var(--ink)}.syn4-touch li em{font-style:normal;font-size:12.5px;margin:0 6px}.syn4-touch li span{display:block;color:var(--grey);font-size:13px}
.syn4-sup{color:var(--g)}.syn4-sdn{color:var(--down)}.syn4-smx{color:var(--grey)}
.syn4-ia{margin:18px 0 0;padding:14px 18px;border-left:3px solid var(--lime);background:#fff;border-radius:0 12px 12px 0}.syn4-iak{font-size:12.5px;font-weight:600;color:var(--grey);margin:0 0 6px}.syn4-iat p{margin:0 0 8px;font-size:14.5px;line-height:1.6}.syn4-ias{font-size:12px;color:var(--light);margin:6px 0 0}
.syn4-sims{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:0 0 12px}.syn4-sim{border:1px solid var(--rule);border-radius:12px;padding:12px 14px;background:#fff;display:flex;flex-direction:column;gap:4px}.syn4-sim small{font-size:12.5px;color:var(--grey);line-height:1.4}.syn4-sim b{font-family:var(--mono);font-weight:500;font-size:26px}.syn4-sim b.dn{color:var(--down)}.syn4-sim span{font-size:12px;color:var(--light)}
.syn4-ls{display:grid}.syn4-l{border-top:1px solid var(--rule)}.syn4-l:first-child{border-top:0}.syn4-l summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:minmax(0,1.4fr) 90px 120px minmax(0,1fr);gap:12px;align-items:center;padding:12px 0}.syn4-l summary::-webkit-details-marker{display:none}
.syn4-ln{display:flex;align-items:center;gap:10px;min-width:0}.syn4-ln span{display:flex;flex-direction:column;min-width:0}.syn4-ln b{font-size:15px}.syn4-ln small{font-size:12px;color:var(--grey)}
.syn4-lv{font-family:var(--mono);font-size:19px;font-weight:500;text-align:right}.syn4-lv.na{color:var(--light)}.syn4-li{font-size:12px;color:var(--grey)}.syn4-le{display:flex;flex-direction:column;gap:3px;align-items:flex-start}.syn4-le small{font-size:12px;color:var(--grey)}
.syn4-ld{padding:0 0 14px 36px}.syn4-ld p{margin:0 0 8px;font-size:14px;line-height:1.5}.syn4-ld p.vert{color:var(--g)}.syn4-ld p.rouge{color:var(--down)}.syn4-ld small{color:var(--grey)}
@media (max-width:760px){.syn4-l summary{grid-template-columns:minmax(0,1fr) 80px;grid-template-areas:"n v" "e e" "w w"}.syn4-why{grid-area:w;padding-left:0}.syn4-ln{grid-area:n}.syn4-lv{grid-area:v}.syn4-li{display:none}.syn4-le{grid-area:e;flex-direction:row;flex-wrap:wrap;gap:8px}.syn4-ld{padding-left:0}.syn4-t b{font-size:24px}}
@media (max-width:760px){.syn3-b{margin-left:0}.syn3-v{font-size:19px}.syn3-head h2{font-size:26px}}
@media (max-width:760px){.syn2-sec{padding:14px 14px}.syn2-l,.syn2-rien{margin-left:0}.syn2-v{font-size:19px}}
</style>`);

document.head.insertAdjacentHTML("beforeend", `<style>
.syn4-acts{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:8px}.syn4-exp{background:var(--ink);color:#fff;border:0;border-radius:999px;padding:8px 14px;font:600 13.5px var(--sans);cursor:pointer}.syn4-exp:disabled{opacity:.6}.syn4-acts .lnk{font-size:13px}
.syn4-cl .ax-cl{margin-top:10px;padding:12px 14px;background:#F3F7E8;border-radius:8px;font-size:14px}.syn4-cl .ax-cl b{display:block;margin:8px 0 2px;font-size:12.5px;color:var(--grey)}.syn4-cl .ax-cl b:first-child{margin-top:0}.syn4-cl .ax-cl p{margin:0}.syn4-cl .ax-cl small{display:block;margin-top:8px;color:var(--grey);font-size:12px}
.syn4-rep{display:grid;grid-template-columns:120px minmax(0,1fr);gap:18px 24px;align-items:center;padding:14px 16px;background:#fff;border:1px solid var(--rule);border-radius:8px;margin-bottom:12px}.syn4-repl ul{list-style:none;margin:6px 0 0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 18px}.syn4-repl li{display:flex;align-items:center;gap:8px;font-size:14px}.syn4-repl li i{width:12px;height:12px;border-radius:3px;flex:none}.syn4-repl li span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.syn4-repl li b{font-variant-numeric:tabular-nums}
.syn4-fav{margin-bottom:12px}.syn4-why{grid-column:1 / -1;margin:-6px 0 0;padding-left:38px;font-size:13.5px;color:var(--grey)}.syn4-idee{display:grid;grid-template-columns:minmax(0,420px)}
@media (max-width:600px){.syn4-rep{grid-template-columns:minmax(0,1fr);justify-items:center}.syn4-repl ul{grid-template-columns:minmax(0,1fr)}.syn4-why{padding-left:14px}}
</style>`);
