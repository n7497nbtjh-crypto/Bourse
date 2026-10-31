/* Module « contexte » de bilan. : chargé après le script principal de index.html (et après fiche.js et analyse.js).
   1. « Ce qui explique ces chiffres » : l'évolution des ventes année par année, les phases calculées
      (forte hausse, retournement, baisse prolongée…) et le contexte daté et sourcé qui les accompagne.
   2. « L'actualité qui la concerne » : sujets d'actualité vérifiés à la main (data/contexte.mjs → /data/contexte.json),
      avec une date de fin de pertinence, croisés avec les annonces et la presse récentes de l'entreprise.
   3. Une IA plus autocritique : marqueurs « Je ne suis pas sûr : … » / « Ce que je ne sais pas : … ».
   On enveloppe les fonctions existantes (window.f = function…) au lieu de les recopier : etapesListe (fiche.js),
   analyseForcesFaiblesses et ficheFaits (analyse.js), localAssist (ia.js puis fiche.js), localCopilot (ia.js).
   Fonction publique : contexteChiffresHTML(s, c), contexteActuHTML(s, c), contexteSujets(s, c). */

let CTX_D = null, CTX_P = null;
function ctxCharge() {
  if (!CTX_P) CTX_P = fetch("/data/contexte.json").then(r => r.ok ? r.json() : null).catch(() => null).then(j => { CTX_D = j; if (j) setTimeout(() => { try { ctxRafraichir(); } catch (e) { } }, 0); return j; });
  return CTX_P;
}
if (/^\/(entreprise|demander)/.test(location.pathname)) ctxCharge();

/* ---------- Profil de l'entreprise : mots-clés, pays, banque, taille ---------- */
const CTX_RE = {
  petrole: /petrole|\bgaz\b|raffin|gnl|forage|hydrocarbure|petroli|baril/,
  gaz: /\bgaz\b|gnl|gaz naturel/,
  auto: /automobil|\bvoitures?\b|vehicules? (electriques?|particuliers|utilitaires)|constructeur (auto|de voitures)|equipementier auto|\bpneus?\b|camions?\b/,
  semi: /semi.?conducteurs?|\bpuces?\b|microprocesseurs?|processeurs|lithographie|tranches de silicium|memoires? (vive|flash)/,
  ia: /intelligence artificielle|centres? de donnees|\bcloud\b|data ?centers?/,
  luxe: /\bluxe\b|maroquinerie|haute couture|joaill|horlog|\bmontres?\b|champagne|cognac/,
  spiritueux: /spiritueux|\bvins?\b|champagne|cognac|whisky|bieres?\b|brasseri/,
  ecommerce: /commerce en ligne|vente en ligne|e.?commerce|place de marche|livraison de repas|sites? de vente/,
  aerien: /compagnies? aeriennes?|transport aerien|vols? (reguliers|low cost)/,
  tourisme: /hotel|hotellerie|croisiere|tourisme|agence de voyages?|reservation de voyages?/,
  chimie: /chimi|ciment|acier|siderurg|aluminium|engrais|\bverre\b|papier/,
  mine: /\bmines?\b|minier|miniere|cuivre|lithium|nickel|minerai|charbon|uranium/,
  vaccin: /vaccins?|tests? de diagnostic|\bcovid\b/,
  reseau: /electricite|\bgaz\b|\beau\b|reseaux? (de distribution|electrique|de transport)|nucleaire|renouvelable/,
  alimentaire: /alimentaire|supermarche|hypermarche|grande distribution|epicerie|produits laitiers|boissons|biscuits/,
  assur: /assur|reassur/,
  defense: /defense|armement|militaire|munitions?|missiles?/,
};
const CTX_DEP = { douane: /douane|tarif/, chine: /chine|chinois|asie/, export: /restrictions? d.?export|controles? (des |a l.)?export/ };
const CTX_EURO = new Set(["FR", "DE", "NL", "BE", "LU", "IT", "ES", "PT", "IE", "AT", "FI", "GR", "SK", "SI", "EE", "LV", "LT", "MT", "CY", "HR", "MC"]);
const CTX_EUROPE = new Set(["GB", "CH", "NO", "SE", "DK", "PL", "CZ", "HU", "RO", "BG", "IS", "LI"]);
const ctxDe = n => (/^[AEIOUYÉÈÊÂÎÔH]/i.test(n) ? "d'" : "de ") + n;
const ctxPour = (im, nom) => `Pour les ${im.qui.charAt(0).toLowerCase() + im.qui.slice(1)}, comme ${nom}`;
const ctxDepuis = d => /-01-01$/.test(d) ? `depuis ${d.slice(0, 4)}` : `depuis le ${dLabel(d).replace(/^1 /, "1er ")}`;
const CTX_CYCL = new Set(["petrole", "auto", "aerien", "semi", "chimie", "mine"]);
const CTX_PROF = {};
function ctxProfil(s, c) {
  if (CTX_PROF[s.id] && CTX_PROF[s.id].c === c) return CTX_PROF[s.id];
  const txt = norm([s.name, s.desc, s.fiche && s.fiche.fait, s.fiche && s.fiche.argent].filter(Boolean).join(" ")), dep = norm((s.fiche && s.fiche.depend) || "");
  const kw = new Set(Object.keys(CTX_RE).filter(k => CTX_RE[k].test(txt)));
  Object.keys(CTX_DEP).forEach(k => { if (CTX_DEP[k].test(dep)) kw.add(k); });
  let pays = null;
  try { if (typeof analyseCtx === "function" && (ANALYSE_WD || /^\/entreprise\//.test(location.pathname))) pays = analyseCtx(s, c).pays; } catch (e) { } // hors fiche, pas de chargement de facteurs.json rien que pour le pays : l'ISIN suffit
  if (!pays && s.isin && /^[A-Z]{2}/.test(s.isin) && !["XS", "EU", "KY", "BM", "VG", "JE", "GG"].includes(s.isin.slice(0, 2))) pays = s.isin.slice(0, 2);
  if (!pays && (s.region === "FR" || s.region === "US")) pays = s.region;
  const bank = isBank(s) && !kw.has("assur");
  const caE = s.ca != null && !s.missing ? (typeof eurM === "function" ? eurM(s.ca, s.currency) : s.ca) : null;
  let dette = false; try { const r = ratios(s); dette = !bank && r && r.lev != null && r.lev > 3; } catch (e) { }
  return CTX_PROF[s.id] = { c, id: s.id, sector: s.sector, kw, pays, bank, grand: caE != null && caE >= 1000, dette, txt };
}
function ctxCible(ci, P) {
  if (!ci) return false;
  const sec = (ci.sec || []).includes(P.sector), kw = (ci.kw || []).some(k => P.kw.has(k));
  let ok = ci.et ? (sec && kw) : (ci.tous || sec || kw || (ci.ids || []).includes(P.id) || (ci.banque && P.bank) || (ci.grand && P.grand) || (ci.dette && P.dette));
  if (!ok) return false;
  if (ci.pays && !ci.pays.includes(P.pays)) return false;
  if (ci.paysNon && (P.pays ? ci.paysNon.includes(P.pays) : false)) return false;
  if (ci.euro && !CTX_EURO.has(P.pays)) return false;
  if (ci.europe && !(CTX_EURO.has(P.pays) || CTX_EUROPE.has(P.pays))) return false;
  return true;
}
const ctxSpec = (ci, P) => (ci.ids || []).includes(P.id) ? 3 : (ci.kw || []).some(k => P.kw.has(k)) || (ci.banque && P.bank) || (ci.dette && P.dette) ? 2 : (ci.sec || []).includes(P.sector) ? 1 : 0;

/* ---------- Petits formats ---------- */
const ctxP1 = v => (v > 0 ? "+" : v < 0 ? "−" : "") + nf(Math.abs(v) < 0.1 ? 1 : 0).format(Math.abs(v) * 100) + " %"; // 2.3 : même arrondi que tblxRel (+26 %, jamais 25,8 % à côté)
const ctxCap = t => t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
const ctxMoisFin = c => { const m = /^(\d\d)-\d\d$/.exec(c && c.fyEnd || ""); return m ? +m[1] : 12; };
const ctxAnCal = (c, y) => ctxMoisFin(c) <= 6 ? y - 1 : y; // un exercice clos fin janvier 2026 couvre surtout 2025
const ctxListe = a => a.length <= 1 ? (a[0] || "") : a.slice(0, -1).join(", ") + " et " + a.at(-1);
const ctxAnnees = ys => ys.length === 1 ? `${ys[0]}` : ys.length === 2 ? `${ys[0]} et ${ys[1]}` : `De ${ys[0]} à ${ys.at(-1)}`;
const ctxSrcL = l => (l || []).map(x => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.nom)}</a>`).join(" · ");

/* ---------- 1. La série et ses phases ---------- */
function ctxSerie(s, c) {
  if (!c || !c.years || c.years.length < 2 || !c.fin) return null;
  const bank = isBank(s);
  const pick = k => { const v = (c.fin[k] || []); const ys = [], vs = []; c.years.forEach((y, i) => { if (v[i] != null && isFinite(v[i])) { ys.push(y); vs.push(v[i]); } }); return { ys, vs }; };
  let k = "ca", d = pick("ca");
  if (d.ys.length < 2 || d.vs.some(x => x <= 0)) { k = "net"; d = pick("net"); }
  if (d.ys.length < 2) return null;
  const lab = k === "ca" ? (bank ? "revenus" : "ventes") : "bénéfice net";
  return { k, ys: d.ys, vs: d.vs, lab, Lab: ctxCap(lab), adj: k === "net" ? "annuel" : bank ? "annuels" : "annuelles", cur: c.currency || s.currency || "EUR", bank };
}
const CTX_SEUIL = 0.03, CTX_FORT = 0.15;
function ctxPhases(ser) {
  const { ys, vs } = ser, rows = [], g = [];
  for (let i = 0; i < ys.length; i++) {
    const gi = i && vs[i - 1] !== 0 ? (vs[i] - vs[i - 1]) / Math.abs(vs[i - 1]) : null;
    g.push(gi);
    rows.push({ y: ys[i], v: vs[i], g: gi, d: i ? vs[i] - vs[i - 1] : null, cum: vs[0] !== 0 ? (vs[i] - vs[0]) / Math.abs(vs[0]) : null, dc: vs[i] - vs[0] });
  }
  const cls = x => x == null ? null : x > CTX_SEUIL ? 1 : x < -CTX_SEUIL ? -1 : 0;
  const runs = []; // suites d'années de même sens
  for (let i = 1; i < ys.length; i++) { const k = cls(g[i]); const r = runs.at(-1); if (r && r.k === k) { r.ys.push(ys[i]); r.gs.push(g[i]); } else runs.push({ k, ys: [ys[i]], gs: [g[i]] }); }
  const phases = [];
  runs.forEach((r, j) => {
    const prev = runs[j - 1], fort = r.gs.some(x => Math.abs(x) >= CTX_FORT);
    const push = (ys, gs, type, mot) => phases.push({ ys, gs, type, mot, dir: r.k });
    if (r.k === 1) {
      if (prev && prev.k === -1) { push(r.ys.slice(0, 1), r.gs.slice(0, 1), "rebond", r.gs[0] >= CTX_FORT ? "fort rebond" : "rebond"); if (r.ys.length > 1) push(r.ys.slice(1), r.gs.slice(1), "hausse", "la progression continue"); }
      else push(r.ys, r.gs, "hausse", r.ys.length > 1 ? (fort ? "forte progression" : "progression continue") : (fort ? "forte progression" : "progression"));
    } else if (r.k === -1) {
      const rest = (ys, gs) => { const dec = gs.length >= 2 && Math.abs(gs.at(-1)) < Math.abs(gs[0]) * 0.85, acc = gs.length >= 2 && Math.abs(gs.at(-1)) > Math.abs(gs[0]) * 1.15; return "baisse prolongée" + (dec ? ", mais moins rapide" : acc ? ", qui s'accélère" : ""); };
      if (prev && prev.k === 1) { push(r.ys.slice(0, 1), r.gs.slice(0, 1), "retournement", "retournement"); if (r.ys.length > 1) push(r.ys.slice(1), r.gs.slice(1), "baisse", rest(r.ys.slice(1), r.gs.slice(1))); }
      else push(r.ys, r.gs, "baisse", r.ys.length > 1 ? rest(r.ys, r.gs) : (fort ? "forte baisse" : "baisse"));
    } else push(r.ys, r.gs, "stable", "stabilité");
  });
  const n = ys.length - 1, first = vs[0], last = vs[n], span = ys[n] - ys[0];
  const iMax = vs.indexOf(Math.max(...vs)), iMin = vs.indexOf(Math.min(...vs));
  const cagr = first > 0 && last > 0 && span > 0 ? Math.pow(last / first, 1 / span) - 1 : null;
  let finBaisse = 0; for (let i = n; i >= 1 && cls(g[i]) === -1; i--) finBaisse++;
  let finHausse = 0; for (let i = n; i >= 1 && cls(g[i]) === 1; i--) finHausse++;
  const gs = g.filter(x => x != null);
  return { rows, phases, cum: rows[n].cum, dc: rows[n].dc, cagr, pic: { y: ys[iMax], v: vs[iMax], i: iMax }, creux: { y: ys[iMin], v: vs[iMin], i: iMin }, finBaisse, finHausse, gmax: Math.max(...gs), gmin: Math.min(...gs), n };
}
function ctxEvts(P, c, ph) {
  if (!CTX_D || !CTX_D.evenements) return [];
  const cal = ph.ys.map(y => ctxAnCal(c, y));
  const ok = e => (e.sens === "0" || (ph.dir === 1 && e.sens === "+") || (ph.dir === -1 && e.sens === "-")) && e.ans.some(a => cal.includes(a)) && ctxCible(e.cible, P);
  const l = CTX_D.evenements.filter(ok);
  // l'événement le plus précis d'abord ; « tout le monde » seulement s'il n'y a rien de plus précis
  const spec = l.filter(e => !e.cible.tous || e.cible.pays);
  return (spec.length ? spec : l).slice(0, 2);
}
function ctxTendance(s, ser, R) {
  const { ys } = ser, L = ser.lab, nom = s.name;
  const yr = i => ys[i];
  if (R.finBaisse >= 2 && R.pic.i > 0 && R.pic.i < R.n) return `Après ${R.gmax >= CTX_FORT ? "une forte hausse" : "une hausse"} jusqu'en ${R.pic.y}, les ${L} ont diminué ${R.finBaisse} années consécutives.`;
  if (R.finBaisse >= 2) return `Les ${L} ont diminué ${R.finBaisse} années consécutives.`;
  if (R.finHausse === R.n && R.n >= 2) return `Les ${L} ont progressé chaque année depuis ${yr(0)}.`;
  if (R.finHausse >= 2) return `Les ${L} progressent depuis ${R.finHausse} ans${R.creux.i > 0 && R.creux.i < R.n ? `, après un point bas en ${R.creux.y}` : ""}.`;
  if (R.pic.i === R.n) return `${yr(R.n)} est la meilleure année de la période pour ses ${L}${R.cum != null ? ` (${ctxP1(R.cum)} depuis ${yr(0)})` : ""}.`;
  return `Sur la période, les ${L} ont ${R.cum >= 0 ? "progressé" : "reculé"} de ${ctxP1(Math.abs(R.cum))} au total, avec des hauts et des bas.`;
}
// Ce qui se passe pour les autres chiffres sur la même période
function ctxAutres(s, c, ser) {
  const y0 = ser.ys[0], y1 = ser.ys.at(-1), i0 = c.years.indexOf(y0), i1 = c.years.indexOf(y1), cur = ser.cur;
  const K = [["net", "Bénéfice net"], ["cfo", "Argent encaissé grâce à l'activité"], ["netDebt", "Dette nette"], ["divPaid", "Dividendes versés"]].filter(([k]) => k !== ser.k && !(ser.bank && (k === "cfo" || k === "netDebt")));
  const out = [];
  for (const [k, lab] of K) {
    const v = c.fin[k] || [], a = v[i0], b = v[i1];
    if (a == null || b == null || !isFinite(a) || !isFinite(b)) continue;
    const ev = a > 0 && b >= 0 ? (b - a) / a : null;
    out.push({ k, lab, a, b, ev, txt: k === "netDebt" ? (a <= 0 && b <= 0 ? "pas de dette nette" : b < a ? "en baisse" : b > a ? "en hausse" : "stable") : ev == null ? (b < 0 ? "perte" : a <= 0 && b > 0 ? "retour au bénéfice" : "") : ctxP1(ev) });
  }
  const P = [], f = x => out.find(o => o.k === x), net = f("net"), dv = f("divPaid"), dn = f("netDebt"), cfo = f("cfo");
  if (ser.k === "ca" && net && net.ev != null && ser.vs[0] > 0) {
    const cs = (ser.vs.at(-1) - ser.vs[0]) / ser.vs[0];
    if (net.ev < cs - 0.1) P.push(`Le bénéfice (${ctxP1(net.ev)}) a reculé plus vite que les ${ser.lab} (${ctxP1(cs)}) : la rentabilité s'est réduite.`);
    else if (net.ev > cs + 0.1) P.push(`Le bénéfice (${ctxP1(net.ev)}) a mieux évolué que les ${ser.lab} (${ctxP1(cs)}) : la rentabilité s'est améliorée.`);
    else P.push(`Le bénéfice (${ctxP1(net.ev)}) a évolué à peu près comme les ${ser.lab} (${ctxP1(cs)}).`);
  } else if (net && net.b < 0) P.push(`Elle est en perte sur son dernier exercice (${big(net.b, cur)}).`);
  if (dv && dv.a > 0.5) P.push(dv.b >= dv.a * 1.03 ? `Les dividendes versés ont augmenté (${big(dv.a, cur)} en ${y0}, ${big(dv.b, cur)} en ${y1}).` : dv.b >= dv.a * 0.97 ? `Les dividendes versés sont restés à peu près stables (${big(dv.a, cur)} en ${y0}, ${big(dv.b, cur)} en ${y1}).` : `Les dividendes versés ont baissé (${big(dv.a, cur)} en ${y0}, ${big(dv.b, cur)} en ${y1}).`);
  else if (dv && dv.b > 0.5 && !(dv.a > 0.5)) P.push(`Elle a commencé à verser un dividende sur la période (${big(dv.b, cur)} en ${y1}).`);
  if (dn && !ser.bank && !(dn.a <= 0 && dn.b <= 0)) P.push(dn.b > dn.a ? `Sa dette nette a augmenté (${big(dn.a, cur)} en ${y0}, ${big(dn.b, cur)} en ${y1}).` : `Sa dette nette a baissé (${big(dn.a, cur)} en ${y0}, ${big(dn.b, cur)} en ${y1}).`);
  if (cfo && cfo.b < 0) P.push("L'argent encaissé grâce à son activité est négatif sur le dernier exercice : un point à surveiller.");
  return { lignes: out, phrases: P, y0, y1 };
}
// Valeur de rendement, cyclique, de croissance : trois questions, trois réponses calculées
function ctxProfilInvest(s, c, ser, R, P) {
  const L = c.years.length - 1, fin = c.fin, dp = (fin.divPaid || []).filter(x => x != null && isFinite(x));
  const v = typeof valo === "function" && !s.missing ? valo(s) : null, yld = v && v.yld != null && isFinite(v.yld) ? v.yld : null;
  const netL = (fin.net || [])[L], divL = (fin.divPaid || [])[L], payout = netL > 0 && divL != null ? divL / netL : null;
  const regulier = dp.length >= 3 && dp.every(x => x > 0.5);
  const sectCycl = ["energie", "materiaux"].includes(s.sector) || [...CTX_CYCL].some(k => P.kw.has(k));
  const amp = R.gmax - R.gmin;
  const netV = (fin.net || []).filter(x => x != null), netCagr = netV.length >= 2 && netV[0] > 0 && netV.at(-1) > 0 ? Math.pow(netV.at(-1) / netV[0], 1 / Math.max(1, netV.length - 1)) - 1 : null;
  const out = [];
  // Rendement
  { let niv = "non", t;
    if (regulier && ((yld != null && yld >= 0.035) || (payout != null && payout >= 0.5))) niv = "oui";
    else if (regulier || (yld != null && yld >= 0.02)) niv = "en partie";
    t = dp.length ? `${regulier ? `Dividende versé chaque année de ${c.years[0]} à ${c.years[L]}` : dp.some(x => x > 0.5) ? "Dividende versé certaines années seulement" : "Pas de dividende versé"}${yld != null ? `, rendement de ${F1.format(yld * 100)} % au cours actuel` : ""}${payout != null && payout > 0 ? `, ${F0.format(Math.min(payout, 9.99) * 100)} % du dernier bénéfice distribué` : ""}.` : "Je ne suis pas sûr : le site ne trouve pas ses dividendes dans ses comptes, il ne peut pas répondre.";
    if (!dp.length) niv = "inconnu";
    out.push({ k: "rendement", nom: "Valeur de rendement", q: "Verse-t-elle un dividende élevé et régulier ?", niv, t, repere: "Repère du site : dividende versé chaque année, et rendement d'au moins 3,5 % ou plus de la moitié du bénéfice distribuée." }); }
  // Cyclique
  { let niv = amp >= 0.30 || (sectCycl && amp >= 0.15) ? "oui" : amp >= 0.15 || sectCycl ? "en partie" : "non";
    const t = `D'une année à l'autre, ses ${ser.lab} ont varié de ${ctxP1(R.gmin)} à ${ctxP1(R.gmax)}${sectCycl ? `. Son métier suit la conjoncture ou des prix qu'elle ne fixe pas (${ctxListe([P.kw.has("petrole") ? "pétrole et gaz" : "", P.kw.has("auto") ? "marché automobile" : "", P.kw.has("aerien") ? "voyages et kérosène" : "", P.kw.has("semi") ? "cycles des puces" : "", P.kw.has("chimie") || P.kw.has("mine") || s.sector === "materiaux" ? "matières premières" : ""].filter(Boolean)) || "conjoncture"})` : ""}.`;
    out.push({ k: "cyclique", nom: "Valeur cyclique", q: "Ses chiffres montent-ils et baissent-ils avec la conjoncture ?", niv, t, repere: "Repère du site : écart d'au moins 30 points entre la meilleure et la pire année, ou métier lié aux cycles avec au moins 15 points d'écart." }); }
  // Croissance
  { const cg = R.cagr; let niv = cg != null && cg >= 0.08 && (netCagr == null || netCagr >= 0) ? "oui" : cg != null && cg >= 0.04 ? "en partie" : "non";
    const t = cg == null ? "Croissance moyenne non calculable sur la période." : `${ser.Lab} : ${ctxP1(cg)} par an en moyenne de ${ser.ys[0]} à ${ser.ys.at(-1)}${netCagr != null ? `, bénéfice : ${ctxP1(netCagr)} par an` : ""}.`;
    out.push({ k: "croissance", nom: "Valeur de croissance", q: "Ses ventes et son bénéfice progressent-ils vite et durablement ?", niv, t, repere: "Repère du site : plus de 8 % par an en moyenne, sans recul du bénéfice." }); }
  const oui = out.filter(x => x.niv === "oui"), part = out.filter(x => x.niv === "en partie");
  const nomC = { rendement: "une valeur de rendement", cyclique: "une valeur cyclique", croissance: "une valeur de croissance" };
  let resume;
  if (oui.length === 1) resume = `Sur ces exercices, son profil ressemble surtout à ${nomC[oui[0].k]}${part.length ? `, avec un côté ${part.map(x => x.k).join(" et ")}` : ""}.`;
  else if (oui.length >= 2) resume = `Sur ces exercices, son profil ressemble à la fois à ${ctxListe(oui.map(x => nomC[x.k]))}.`;
  else if (part.length) resume = `Sur ces exercices, son profil n'est pas tranché : en partie ${ctxListe(part.map(x => x.k))}.`;
  else resume = "Sur ces exercices, son profil n'est nettement ni de rendement, ni cyclique, ni de croissance.";
  return { l: out, resume };
}
// Pourquoi une baisse des ventes ne veut pas forcément dire que l'entreprise va mal
function ctxPrudence(s, P, ser) {
  if (ser.k !== "ca") return "Le bénéfice net d'une foncière ou d'une holding inclut souvent la variation de valeur de ses actifs : il peut bouger fortement sans que l'activité change.";
  if (P.kw.has("petrole") && s.sector === "energie") return "Une baisse du chiffre d'affaires ne signifie pas forcément que l'entreprise va mal. Dans le pétrole et le gaz, les ventes suivent d'abord les prix du baril, du gaz et des carburants, que l'entreprise ne fixe pas.";
  if (s.sector === "services") return "Une baisse du chiffre d'affaires ne signifie pas forcément que l'entreprise va mal. Pour l'électricité et le gaz, les ventes suivent les prix de gros de l'énergie, souvent répercutés aux clients.";
  if (s.sector === "materiaux" || P.kw.has("chimie") || P.kw.has("mine")) return "Une baisse du chiffre d'affaires ne signifie pas forcément que l'entreprise va mal : ses ventes suivent le prix des matières premières et des métaux.";
  if (ser.bank) return "Une baisse des revenus d'une banque ne signifie pas forcément qu'elle va mal : ils suivent les taux d'intérêt et l'activité des marchés financiers.";
  return "Une baisse du chiffre d'affaires ne signifie pas forcément que l'entreprise va mal : elle peut venir des prix, du change (comptes publiés dans une autre devise), d'une activité vendue ou d'une année précédente exceptionnelle.";
}
function contexteChiffresHTML(s, c, inner) { // inner : bloc intégré au thème « Croissance » de l'onglet des chiffres
  try {
    ctxCSS();
    const ser = ctxSerie(s, c); if (!ser || ser.ys.length < 3) return "";
    const P = ctxProfil(s, c), R = ctxPhases(ser), B = v => big(v, ser.cur), y0 = ser.ys[0], yN = ser.ys.at(-1);
    const decal = ctxMoisFin(c) <= 6;
    const head = `<tr><th class="lab">Exercice</th><th>${esc(ser.Lab)}</th><th>Sur un an</th><th>Écart sur un an</th><th>Depuis ${y0}</th></tr>`;
    const rows = R.rows.map((r, i) => `<tr class="${i % 2 ? "z" : ""}${i === R.n ? " ctx-last" : ""}"><th class="lab">${r.y}${i === R.pic.i && R.pic.i > 0 && R.pic.i < R.n ? ` <span class="ctx-tag">sommet</span>` : ""}</th><td>${B(r.v)}</td>
      <td class="${r.g == null ? "" : r.g > CTX_SEUIL ? "ctx-up" : r.g < -CTX_SEUIL ? "ctx-dn" : ""}">${r.g == null ? `<span class="muted">départ</span>` : ctxP1(r.g)}</td>
      <td>${r.d == null ? `<span class="muted">·</span>` : (r.d >= 0 ? "+" : "−") + B(Math.abs(r.d))}</td><td>${r.cum == null || i === 0 ? `<span class="muted">·</span>` : ctxP1(r.cum)}</td></tr>`).reverse().join(""); // l'exercice le plus récent en premier (30/10)
    const table = `<table class="t tbx ctx-t">${head}${rows}</table>`;
    const chart = typeof colChart === "function" ? colChart({ labels: ser.ys.map(String), series: [{ name: ser.Lab, values: ser.vs }], fmt: B, tickFmt: typeof compact === "function" ? compact(ser.cur) : B, h: 150 }) : "";
    const vus = new Set();
    const ph = R.phases.map(p => {
      const ev = ctxEvts(P, c, p).filter(e => !vus.has(e.id) && vus.add(e.id)), gtxt = p.gs.length === 1 ? ctxP1(p.gs[0]) : p.gs.map(ctxP1).join(" puis ");
      const verbe = p.dir === 1 ? "augmentent" : p.dir === -1 ? "reculent" : "bougent peu";
      return `<li class="ctx-ph ctx-ph-${p.type}"><div class="ctx-phh"><b>${ctxAnnees(p.ys)} : ${esc(p.mot)}.</b> Les ${esc(ser.lab)} ${ser.k === "net" ? verbe.replace("augmentent", "augmente").replace("reculent", "recule").replace("bougent", "bouge") : verbe} (${gtxt}).</div>
        ${ev.length ? ev.map(e => `<div class="ctx-ev"><span class="ctx-evk">Contexte ${e.ans.length > 1 ? e.ans[0] + "-" + e.ans.at(-1) : e.ans[0]}</span><b>${esc(e.titre)}.</b> ${esc(e.texte)} <span class="ctx-src">Source : ${ctxSrcL(e.src)}</span></div>`).join("") : vus.has("_0") ? `<div class="ctx-ev ctx-ev0"><span class="ctx-evk">Contexte</span>Pas d'événement de secteur relié par le site.</div>` : (vus.add("_0"), `<div class="ctx-ev ctx-ev0"><span class="ctx-evk">Contexte</span>Le site ne relie aucun grand événement de son secteur à cette évolution. Elle peut venir de l'entreprise elle-même (lancements, rachats, cessions, prix) : son rapport annuel l'explique.</div>`)}</li>`;
    }).join("");
    const A = ctxAutres(s, c, ser), PI = ctxProfilInvest(s, c, ser, R, P), p = pxOf(s);
    const rapport = (c.sources && c.sources[0] && c.sources[0].report) || (typeof officielLink === "function" ? officielLink(s) : "") || "";
    const nivC = { oui: "ctx-oui", "en partie": "ctx-part", non: "ctx-non", inconnu: "ctx-non" };
    const autresT = A.lignes.length ? `<table class="t tbx ctx-t2"><tr><th class="lab">Indicateur</th><th>${A.y0}</th><th>${A.y1}</th><th>Évolution</th></tr>${A.lignes.map((o, i) => `<tr class="${i % 2 ? "z" : ""}"><th class="lab">${esc(o.lab)}</th><td>${B(o.a)}</td><td>${B(o.b)}</td><td>${esc(o.txt || "·")}</td></tr>`).join("")}</table>` : "";
    const scroll = h => typeof tblxScrollBox === "function" ? tblxScrollBox(h) : `<div class="scroll-x">${h}</div>`;
    const conf = [];
    if (decal) conf.push(`Ses exercices se terminent fin ${MOISL[ctxMoisFin(c) - 1]} : l'exercice ${yN} couvre surtout l'année ${yN - 1}. Le contexte est rapproché de cette année-là.`);
    if (ser.k === "net") conf.push(`Le site n'a pas son chiffre d'affaires : le tableau suit son bénéfice net, plus irrégulier.`);
    if (ser.cur !== "EUR") conf.push(`Ses comptes sont publiés en ${ser.cur === "USD" ? "dollars" : ser.cur} : une partie des variations peut venir du change.`);
    conf.push("Le site ne mesure pas la part de chaque événement dans ses chiffres : il montre ce qui s'est passé au même moment. Les rachats, cessions et effets de change peuvent aussi jouer.");
    const T = inner ? "details" : "section"; // dans l'onglet Chiffres : replié, une ligne de lecture en résumé (30/10, la page était trop chargée)
    return `<${T} class="${inner ? "ctx ctx-in" : "panel ctx"}" id="contexte-chiffres" data-ctx-chiffres="${esc(s.id)}"${inner ? ' data-ctx-in="1"' : ""}${CTX_D ? ' data-ctxv="1"' : ""}>
      ${inner ? `<summary class="ctx-sum"><span class="ctx-ti">Ce qui explique ces chiffres</span><span class="ctx-sl">${esc(ctxTendance(s, ser, R))}</span></summary>` : `<div class="ph"><h2 class="ctx-ti">Ce qui explique ces chiffres</h2><span class="light" style="font-size:12.5px">${y0} à ${yN} · comptes officiels</span></div>`}
      <div class="pb">
        <p class="ctx-lead">${esc(ctxTendance(s, ser, R))}</p>
        <div class="ctx-kpis">
          <div><span class="kick">Variation cumulée ${y0}-${yN}</span><b class="${R.cum >= 0 ? "up" : "down"}">${ctxP1(R.cum)}</b><small>soit ${B(Math.abs(R.dc))} ${ser.k === "net" ? "de bénéfice annuel" : `de ${esc(ser.lab)} ${ser.adj}`} en ${R.dc >= 0 ? "plus" : "moins"}</small></div>
          <div><span class="kick">Par an en moyenne</span><b>${R.cagr == null ? "·" : ctxP1(R.cagr)}</b><small>croissance annuelle moyenne</small></div>
          <div><span class="kick">Meilleure année</span><b>${R.pic.y}</b><small>${B(R.pic.v)}</small></div>
        </div>
        <h3 class="ctx-h">1. ${esc(ser.Lab)} année par année</h3>
        ${chart}
        ${scroll(table)}
        <details class="ctx-more"><summary>Comment lire cette évolution<small>les phases, le contexte daté, ce que cela signifie sur le long terme</small></summary>
        <h3 class="ctx-h">2. Comment lire cette évolution</h3>
        <ol class="ctx-phs">${ph}</ol>
        <p class="ctx-warn"><b>Attention :</b> ${esc(R.phases.some(p => p.dir === -1) ? ctxPrudence(s, P, ser) : `Une hausse des ${ser.lab} ne suffit pas à juger une entreprise : elle peut venir des prix, du change ou d'un rachat.`)} Il faut aussi regarder le bénéfice, la trésorerie, la dette, les investissements et le dividende.</p>
        ${A.lignes.length ? `<h3 class="ctx-h">3. Les autres chiffres sur la même période</h3>${scroll(autresT)}${A.phrases.length ? `<ul class="ctx-ul">${A.phrases.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}` : ""}
        <h3 class="ctx-h">${A.lignes.length ? "4" : "3"}. Ce que cela signifie pour un investisseur de long terme</h3>
        <ul class="ctx-ul">
          <li><b>Évolution des ${esc(ser.lab)} :</b> ${R.pic.i > 0 && R.pic.i < R.n ? `${R.dc >= 0 ? "en hausse" : "en baisse"} sur la période, ${ctxP1((ser.vs.at(-1) - R.pic.v) / Math.abs(R.pic.v))} depuis le sommet de ${R.pic.y}.` : `${ctxP1(R.cum)} de ${y0} à ${yN}.`}</li>
          ${Math.abs(R.cum) < 0.05 ? `<li><b>Résilience :</b> les ${esc(ser.lab)} restent proches de leur niveau de ${y0}.</li>` : ""}
          ${p && p.p1y ? `<li><b>Cours de Bourse :</b> ${ctxP1(p.p / p.p1y - 1)} sur un an. Le site n'a pas encore l'historique du cours depuis ${y0}.</li>` : ""}
          <li><b>Limite de l'indicateur :</b> ${ser.k === "net" ? "le bénéfice d'une seule année" : ser.bank ? "le niveau des revenus seul" : "le chiffre d'affaires seul"} ne permet pas de juger la rentabilité ni ce que reçoit l'actionnaire.</li>
        </ul>
        <div class="ctx-prof">
          <p class="ctx-profr">${esc(PI.resume)}</p>
          <div class="ctx-profg">${PI.l.map(x => `<div class="ctx-pc"><div class="ctx-pch"><b>${esc(x.nom)}</b><span class="ctx-niv ${nivC[x.niv]}">${x.niv === "oui" ? "Oui" : x.niv === "non" ? "Non" : x.niv === "inconnu" ? "Non mesuré" : "En partie"}</span></div><p class="ctx-q">${esc(x.q)}</p><p>${esc(x.t)}</p><p class="ctx-rep">${esc(x.repere)}</p></div>`).join("")}</div>
          <p class="ctx-rep">Ce classement est calculé à partir des comptes passés, avec des seuils fixes. Il décrit, il ne recommande rien : une entreprise peut changer de profil.</p>
        </div>
        </details>
        <details class="ctx-sur"><summary>Ce que le site ne sait pas</summary><ul>${conf.map(t => `<li>${esc(t)}</li>`).join("")}${rapport ? `<li>Pour les raisons précises, lisez le <a href="${esc(rapport)}" target="_blank" rel="noopener">rapport annuel ${yN}</a> (partie « commentaires sur l'exercice »).</li>` : ""}</ul></details>
      </div>
      <div class="src">Chiffres : comptes annuels officiels lus par le site (ESEF ou SEC). Contexte : table d'événements datés et sourcés (BCE, FMI, AIE, Commission européenne, Banque mondiale…), mise à jour le ${CTX_D ? dLabel(CTX_D.maj) : "·"}. Aucune prévision, aucun conseil.</div>
    </${T}>`;
  } catch (e) { console.warn("contexte : chiffres", e); return ""; }
}

/* ---------- 2. L'actualité qui la concerne ---------- */
function contexteSujets(s, c) {
  if (!CTX_D || !CTX_D.sujets || !s) return [];
  const P = ctxProfil(s, c), out = [];
  for (const sj of CTX_D.sujets) {
    if (sj.fin && sj.fin < TODAY) continue; // sujet expiré : plus affiché sans nouvelle vérification
    const im = (sj.impacts || []).find(i => ctxCible(i.cible, P));
    if (im) out.push({ sj, im, spec: ctxSpec(im.cible, P) });
  }
  return out.sort((a, b) => b.spec - a.spec);
}
const CTX_SENS = { "+": ["Plutôt favorable", "ctx-s-up"], "-": ["Plutôt défavorable", "ctx-s-dn"], "±": ["Effet à double tranchant", "ctx-s-mx"] };
function contexteActuHTML(s, c) {
  if (!s) return "";
  ctxCSS(); ctxCharge();
  if (!CTX_D) return `<section class="panel ctx" id="contexte-actu" data-ctx-actu="${esc(s.id)}"><div class="ph"><h2>L'actualité qui la concerne</h2></div><div class="pb muted" style="font-size:13.5px">Chargement du contexte…</div></section>`;
  const l = contexteSujets(s, c).slice(0, 4);
  const card = ({ sj, im }) => { const [lab, cl] = CTX_SENS[im.sens] || CTX_SENS["±"];
    return `<article class="ctx-sj"><div class="ctx-sjh"><span class="ctx-th">${esc(sj.theme)}</span><span class="ctx-sens ${cl}">${lab}</span></div>
      <h3>${esc(sj.titre)}</h3>
      <p class="ctx-pour"><b>${esc(ctxPour(im, s.name))} :</b> ${esc(im.mecanisme)}</p>
      <details><summary>Les faits datés (${ctxDepuis(sj.depuis)})</summary><ul>${sj.faits.map(t => `<li>${esc(t)}</li>`).join("")}</ul><p class="ctx-src">Sources : ${ctxSrcL(sj.src)}</p></details></article>`; };
  return `<section class="panel ctx" id="contexte-actu" data-ctx-actu="${esc(s.id)}">
    <div class="ph"><h2>L'actualité qui la concerne</h2><span class="light" style="font-size:12.5px">Vérifié le ${dLabel(CTX_D.maj)}</span></div>
    <div class="pb">
      ${l.length ? `<p class="ctx-lead">${l.length === 1 ? "Un sujet d'actualité" : `${l.length} sujets d'actualité`} suivi${l.length > 1 ? "s" : ""} par le site ${l.length > 1 ? "touchent" : "touche"} son secteur, son pays ou son métier. Les effets décrits sont possibles, pas certains.</p><div class="ctx-sjs">${l.map(card).join("")}</div>`
        : `<p class="ctx-lead">Aucun des sujets d'actualité suivis par le site ne concerne directement son secteur, son pays ou son métier.</p>`}
      <div class="ctx-co" data-ctx-co="${esc(s.id)}"></div>
    </div>
    <div class="src">Vérifié le ${dLabel(CTX_D.maj)} · <a class="lnk" href="/methode#contexte">Sources et méthode →</a></div>
  </section>`;
}
// Annonces officielles et presse récentes de l'entreprise (agent « actu »), croisées avec les sujets
// Titres de flux RSS parfois livrés avec des entités HTML (« b&#xE9;n&#xE9;fice ») : décodées avant l'échappement
const CTX_ENT = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };
function ctxDec(t) { return String(t || "").replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).replace(/&(amp|quot|apos|lt|gt|nbsp);/g, (m, k) => CTX_ENT[k]); }
function ctxCoFill(el, s) {
  if (!el || el.dataset.ok) return; el.dataset.ok = "1";
  const pr = typeof actuCo === "function" ? actuCo(s.id) : fetch(`/data/actu/c/${s.id}.json`).then(r => r.ok ? r.json() : null);
  Promise.resolve(pr).catch(() => null).then(j => {
    if (!j || !document.body.contains(el)) return;
    if (el.closest("#ctab")) { el.remove(); return; } // onglet Actualités de la fiche : les annonces et la presse ont déjà leurs blocs juste dessous (30/10, doublon retiré)
    const ROUT = new Set(["rachat", "capital", "initie", "agenda"]), lim = new Date(Date.now() - 90 * 864e5).toISOString();
    const o = (j.o || []).filter(a => !ROUT.has(a.c) && (a.i || 0) >= 1 && a.d >= lim).slice(0, 3);
    const sj = contexteSujets(s, FULL[s.id] || null), lie = t => { const n = norm(t || ""); const x = sj.find(({ sj }) => sj.mots && new RegExp(sj.mots).test(n)); return x ? x.sj : null; };
    const p = (j.p || []).slice(0, 12).map(a => ({ a, s: lie(a.t) })).sort((x, y) => (y.s ? 1 : 0) - (x.s ? 1 : 0) || y.a.d.localeCompare(x.a.d)).slice(0, 4);
    if (!o.length && !p.length) { el.innerHTML = `<p class="muted ctx-cov">Pas d'annonce officielle importante ni d'article de presse récent sur elle dans les sources du site.</p>`; return; }
    const d = iso => dShort(iso);
    el.innerHTML = `<h3 class="ctx-h">Ses annonces et la presse récentes</h3><ul class="ctx-col">
      ${o.map(a => `<li><span class="ctx-d">${d(a.d)}</span><span class="ctx-k">Annonce officielle</span><a href="${esc(a.u)}" target="_blank" rel="noopener">${esc(ctxDec(a.tf || a.t))}</a></li>`).join("")}
      ${p.map(({ a, s: x }) => `<li><span class="ctx-d">${d(a.d)}</span><span class="ctx-k">${esc(a.s || "Presse")}</span><a href="${esc(a.u)}" target="_blank" rel="noopener">${esc(ctxDec(a.t))}</a>${x ? `<span class="ctx-lie">Lié à : ${esc(x.titre.split(" : ")[0])}</span>` : ""}</li>`).join("")}</ul>
      <p class="ctx-rep">Titres seulement : le site n'a pas lu ces articles en détail. Lisez-les avant d'en tirer une conclusion.</p>`;
  });
}
function ctxRafraichir() {
  document.querySelectorAll("[data-ctx-actu]").forEach(el => { const s = RBY[el.dataset.ctxActu]; if (!s || !CTX_D || el.querySelector(".ctx-sjs, .ctx-co")) return; const h = contexteActuHTML(s, FULL[s.id] || null); if (h) el.outerHTML = h; });
  if (CTX_D) document.querySelectorAll("[data-ctx-chiffres]").forEach(el => { if (el.dataset.ctxv) return; const s = RBY[el.dataset.ctxChiffres]; const c = s && FULL[s.id]; if (!c) return; const h = contexteChiffresHTML(s, c, !!el.dataset.ctxIn); if (h) el.outerHTML = h; });
  document.querySelectorAll("[data-ctx-co]").forEach(el => { const s = RBY[el.dataset.ctxCo]; if (s) ctxCoFill(el, s); });
  try { if (typeof tblxBindScroll === "function") tblxBindScroll(); } catch (e) { }
}

/* ---------- Branchement dans la fiche ---------- */
// Les blocs sont placés directement par la fiche (m/fiche2.js) : « L'actualité qui la concerne » dans l'étape « Actualité »,
// « Ce qui explique ces chiffres » dans le thème « Croissance » de l'onglet « Les chiffres en détail » (m/tableaux.js).

/* ---------- Dans l'analyse (m/analyse.js) et dans les faits envoyés à l'IA ---------- */
if (typeof window.analyseForcesFaiblesses === "function") {
  const CTX_aff0 = window.analyseForcesFaiblesses;
  window.analyseForcesFaiblesses = function (s, c) {
    const out = CTX_aff0(s, c);
    try {
      if (!s || !out || !out.contexte) return out;
      if (!CTX_D) ctxCharge();
      contexteSujets(s, c).slice(0, 3).forEach(({ sj, im, spec }) => {
        if (out.contexte.some(i => i.id === "actu_" + sj.id)) return;
        const S0 = (sj.src || [])[0] || {}, S1 = (sj.src || [])[1];
        out.contexte.push({ id: "actu_" + sj.id, poids: spec >= 2 ? 3 : 2, titre: `Actualité : ${sj.titre}`, detail: `${im.mecanisme} Les faits : ${sj.faits[0]} (vérifié le ${dLabel(sj.maj)}).`, source: S0.nom || "", url: S0.url || "", src2: S1 ? [S1.nom, S1.url] : null, regle: true, actu: true });
      });
      const ser = ctxSerie(s, c);
      if (ser && ser.ys.length >= 3 && !out.contexte.some(i => i.id === "ctx_evol")) {
        const R = ctxPhases(ser), P = ctxProfil(s, c), ev = [...new Set(R.phases.flatMap(p => ctxEvts(P, c, p).map(e => e.titre)))].slice(0, 3);
        out.contexte.push({ id: "ctx_evol", poids: 2, titre: `Ce qui explique l'évolution de ses ${ser.lab}`, detail: `${ctxTendance(s, ser, R)} ${ev.length ? `Contexte connu sur la période : ${ev.join(" ; ")}.` : "Le site ne relie aucun grand événement de son secteur à ces variations."} Le détail année par année est dans « Tous les chiffres ».`, source: "bilan., comptes officiels et table d'événements datés", url: "/methode" });
      }
      out.contexte.sort((a, b) => b.poids - a.poids);
    } catch (e) { console.warn("contexte : analyse", e); }
    return out;
  };
}
if (typeof window.ficheFaits === "function") {
  const CTX_ff0 = window.ficheFaits;
  window.ficheFaits = function (s, c) {
    const F = CTX_ff0(s, c);
    try {
      if (!F || !s) return F;
      if (!CTX_D) ctxCharge();
      const l = contexteSujets(s, c).slice(0, 4);
      F.actualite_qui_la_concerne = l.map(({ sj, im }) => ({ sujet: sj.titre, depuis: sj.depuis, verifie_le: sj.maj, faits_dates: sj.faits, qui_est_expose: im.qui, effet_possible_pour_elle: im.mecanisme, sens: im.sens === "+" ? "plutôt favorable" : im.sens === "-" ? "plutôt défavorable" : "à double tranchant", sources: (sj.src || []).map(x => x.nom) }));
      if (CTX_D && !l.length) F.actualite_qui_la_concerne_note = "Aucun sujet d'actualité suivi par le site ne la concerne directement.";
      const ser = ctxSerie(s, c);
      if (ser && ser.ys.length >= 3) {
        const R = ctxPhases(ser), P = ctxProfil(s, c), PI = ctxProfilInvest(s, c, ser, R, P);
        F.evolution_pluriannuelle = { indicateur: ser.lab, devise: ser.cur, annees: ser.ys, valeurs_millions: ser.vs, evolution_annuelle_pct: R.rows.map(r => r.g == null ? null : Math.round(r.g * 1000) / 10), variation_cumulee_pct: Math.round(R.cum * 1000) / 10, croissance_annuelle_moyenne_pct: R.cagr == null ? null : Math.round(R.cagr * 1000) / 10, tendance: ctxTendance(s, ser, R),
          phases: R.phases.map(p => ({ annees: p.ys, lecture: p.mot, evolution_pct: p.gs.map(g => Math.round(g * 1000) / 10), contexte_connu: ctxEvts(P, c, p).map(e => `${e.titre} (source : ${e.src.map(x => x.nom).join(", ")})`) })),
          prudence: ctxPrudence(s, P, ser), profil_calcule: { resume: PI.resume, criteres: PI.l.map(x => `${x.nom} : ${x.niv} (${x.t})`) } };
      }
      F.fiabilite_des_donnees = ctxFiabilite(s, c);
    } catch (e) { console.warn("contexte : faits", e); }
    return F;
  };
}

/* ---------- 3. Une IA plus autocritique ---------- */
// Ce dont le site n'est pas sûr pour cette entreprise, dit simplement, avec ce qu'il faudrait vérifier et où.
function ctxFiabilite(s, c) {
  const out = [];
  if (!s) return out;
  if (!c || s.missing) out.push("Comptes non lus par le site : aucun chiffre financier n'est disponible ; le rapport annuel sur le site de l'entreprise fait foi.");
  else {
    const L = c.years.length - 1, fy = /^\d\d-\d\d$/.test(c.fyEnd || "") ? c.fyEnd : "12-31", fin = `${c.years[L]}-${fy}`, mois = (new Date(TODAY) - new Date(fin)) / (30.44 * 864e5);
    if (mois > 16) out.push(`Comptes anciens : le dernier exercice lu est clos le ${dLabel(fin)} ; un exercice plus récent existe sans doute.`);
    const f = typeof figuresOf === "function" ? figuresOf(c) : null;
    if (f && f.dpsEst) out.push("Dividende par action estimé par le site (dividendes versés divisés par le nombre d'actions) : le communiqué de l'entreprise donne le montant officiel.");
    if (c.years.length < 3) out.push(`Seulement ${c.years.length} exercices lus : les tendances sur plusieurs années sont fragiles.`);
  }
  const md = (typeof MED !== "undefined" && MED[s.sector]) || {};
  if (md.n != null && md.n < 5) out.push(`Médiane du secteur calculée sur ${md.n} entreprises seulement : repère fragile.`);
  if (typeof pxOf === "function" && !pxOf(s)) out.push("Cours de l'action indisponible : prix, PER et rendement ne se calculent pas.");
  if (CTX_D) out.push(`Actualité : sujets vérifiés à la main le ${dLabel(CTX_D.maj)} ; les effets décrits sont des mécanismes possibles, pas des mesures.`);
  return out;
}
const CTX_QACTU = /actualite|\bactus?\b|guerre|moyen orient|proche orient|\biran\b|israel|ormuz|petrole|baril|\bbrent\b|\bgaz\b|\bbce\b|taux d interet|taux directeur|hausse des taux|douanes?|tarifs?|\btreve\b|\bchine\b|chinois|terres rares|geopoliti|contexte|conjoncture|inflation|budget|\boat\b|licences?|exportations?|regulat|reglementation/;
function ctxRepActu(s, c, q) {
  const l = contexteSujets(s, c); if (!CTX_D) return null;
  const nom = s.name, vise = l.filter(({ sj }) => (sj.mots && new RegExp(sj.mots).test(q)) || norm(sj.theme).split(/[^a-z]+/).some(w => w.length >= 5 && q.includes(" " + w + " ")));
  const theme = /guerre|moyen orient|proche orient|iran|israel|ormuz|petrole|baril|brent|gaz|douane|tarif|treve|chine|chinois|terres rares|bce|taux|budget|oat|licence|export|regul|reglement/.test(q);
  const pick = vise.length ? vise : theme ? [] : l;
  const P = [];
  if (pick.length) {
    P.push(`Ce que le site suit dans l'actualité pour ${nom} (vérifié le ${dLabel(CTX_D.maj)}) :`);
    pick.slice(0, 3).forEach(({ sj, im }) => P.push(`${sj.titre}. ${sj.faits[0]} ${ctxPour(im, nom)} : ${im.mecanisme.charAt(0).toLowerCase() + im.mecanisme.slice(1)}`));
    P.push(`Je ne suis pas sûr de l'ampleur de ces effets : le site ne mesure pas leur part dans les résultats ${ctxDe(nom)}. À vérifier : ses prochains résultats et ce qu'elle en dit dans ses communiqués (onglet « Actualités »).`);
  } else if (theme) {
    const autre = CTX_D.sujets.filter(sj => (!sj.fin || sj.fin >= TODAY) && sj.mots && new RegExp(sj.mots).test(q))[0];
    P.push(`Ce que je ne sais pas : le site ne relie pas ${nom} à ce sujet d'actualité${autre ? ` (« ${autre.titre} »)` : ""}. Son secteur, son pays et son métier ne font pas partie des entreprises qu'il identifie comme exposées.`);
    if (l.length) P.push(`Les sujets d'actualité qui la concernent selon le site : ${l.slice(0, 3).map(x => x.sj.titre).join(" ; ")}.`);
    P.push(`À vérifier : son rapport annuel décrit ses risques principaux, souvent dans une partie « facteurs de risque ».`);
  } else return null;
  return P.join("\n");
}
function ctxDoutes(s, c, q, it, t) {
  const P = [], nom = s.name, has = re => re.test(t || "");
  if ((!c || s.missing) && !has(/pas encore lu|n'a pas encore|pas encore les comptes/)) P.push(`Je ne suis pas sûr : le site n'a pas encore lu les comptes de ${nom}. À vérifier : son dernier rapport annuel, sur son site.`);
  if (c && c.years && c.years.length) {
    const L = c.years.length - 1, fy = /^\d\d-\d\d$/.test(c.fyEnd || "") ? c.fyEnd : "12-31", fin = `${c.years[L]}-${fy}`;
    if ((new Date(TODAY) - new Date(fin)) / (30.44 * 864e5) > 16 && ["croissance", "marge", "dette", "dividende", "resume", "forts", "risques", "prix"].includes(it)) P.push(`Je ne suis pas sûr que ces chiffres soient encore à jour : ils viennent de l'exercice clos le ${dLabel(fin)}. Un exercice plus récent existe sans doute : regardez « Ses derniers chiffres et ses prochaines dates ».`);
    const f = typeof figuresOf === "function" ? figuresOf(c) : null;
    if (it === "dividende" && f && f.dpsEst && s.divPaid > 0.5) P.push("Je ne suis pas sûr du montant exact par action : le site l'estime à partir des dividendes versés et du nombre d'actions. Le communiqué de l'entreprise donne le chiffre officiel.");
  }
  const md = (typeof MED !== "undefined" && MED[s.sector]) || {};
  if (md.n != null && md.n >= 3 && md.n < 5 && /mediane/i.test(norm(t || ""))) P.push(`Repère fragile : la médiane de son secteur ne porte que sur ${md.n} entreprises.`);
  return P;
}
if (typeof window.localAssist === "function") {
  const CTX_la0 = window.localAssist;
  window.localAssist = function (s, c, raw) {
    let t = CTX_la0(s, c, raw);
    try {
      if (!s) return t;
      if (!CTX_D) ctxCharge();
      const q0 = typeof IA_txt === "function" ? IA_txt(raw) : " " + norm(raw) + " ", q = typeof IA_corrige === "function" ? IA_corrige(q0) : q0, it = typeof IA_intent === "function" ? IA_intent(q) : null;
      const actuQ = CTX_QACTU.test(q0) && !["defin", "prediction", "conseil", "pea", "identite", "dates"].includes(it);
      if (actuQ && CTX_D && (!t || !/(dividende|dette|marge|per\b)/.test(q))) {
        const a = ctxRepActu(s, c, q0);
        if (a) t = t && !["cours", "risques"].includes(it) ? a : (t ? t + "\n" + a : a);
      } else if (CTX_D && t && (it === "cours" && /pourquoi|baisse|chute|monte|hausse|perdu/.test(q) && !/marge|rentab|dette|\bper\b|dividende|benefice|ventes|chiffre d affaires|croissance|endett/.test(q) || it === "risques")) { // 4e passage 2.4 : jamais sur une question d'indicateur
        const l = contexteSujets(s, c).filter(x => x.im.sens !== "+").slice(0, 2);
        if (l.length) t += `\nDans l'actualité suivie par le site : ${l.map(({ sj, im }) => `${sj.titre} (${(m => m.charAt(0).toLowerCase() + m.slice(1))(im.mecanisme.split(/(?<=[.])\s/)[0].replace(/\.$/, ""))})`).join(" ; ")}.\nJe ne suis pas sûr que cela explique ${it === "cours" ? "ce mouvement de cours" : "ses résultats"} : le site ne le mesure pas.`;
      } else if (CTX_D && t && it === "croissance" && c) {
        const ser = ctxSerie(s, c);
        if (ser && ser.k === "ca" && ser.ys.length >= 3) { const R = ctxPhases(ser), P = ctxProfil(s, c), ev = [...new Set(R.phases.flatMap(p => ctxEvts(P, c, p).map(e => e.titre)))].slice(0, 2); t += `\nSur plusieurs années : ${ctxTendance(s, ser, R)}${ev.length ? ` Contexte connu : ${ev.join(" ; ")}.` : ""}`; }
      }
      if (t) { const d = ctxDoutes(s, c, q, it, t); if (d.length) t += "\n" + d.join("\n"); }
      if (t) t = t.replace(/ ?[—–] ?/g, ", ").replace(/!/g, ".");
    } catch (e) { console.warn("contexte : assistant", e); }
    return t;
  };
}
// Copilote : les montants et taux réglementés changent chaque année, on le dit et on indique la source officielle.
if (typeof window.localCopilot === "function") {
  const CTX_lc0 = window.localCopilot;
  window.localCopilot = function (raw) {
    const a = CTX_lc0(raw);
    try {
      if (a && a.action === "repondre" && a.texte && /\d/.test(a.texte) && /plafond|prelevements|flat tax|impot|fiscal|livret|\bpea\b|assurance.vie|abattement|retenue a la source/.test(norm(a.texte + " " + (a.titre || ""))) && !/A verifier/.test(norm(a.texte)))
        a.texte += "\nÀ vérifier : ces montants et taux sont ceux de 2026 et peuvent changer chaque année. Service-public.fr et impots.gouv.fr font foi.";
    } catch (e) { }
    return a;
  };
}
// Les phrases de doute ressortent visuellement dans les réponses de l'IA (locales ou serveur)
const CTX_DOUTE = /^(Je ne suis pas s[uû]r|Ce que je ne sais pas|À vérifier|Repère fragile)/;
function ctxMarque(root) {
  (root && root.querySelectorAll ? root.querySelectorAll("p, li") : []).forEach(p => { if (!p.dataset.cd && CTX_DOUTE.test((p.textContent || "").trim())) { p.dataset.cd = "1"; p.classList.add("ctx-doute"); } });
}
try {
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.matches && n.matches("p, li")) ctxMarque(n.parentNode); else ctxMarque(n); } })
    .observe(document.getElementById("app") || document.body, { childList: true, subtree: true });
} catch (e) { }

/* ---------- Style ---------- */
function ctxCSS() {
  if (ctxCSS.on) return; ctxCSS.on = 1;
  document.head.insertAdjacentHTML("beforeend", `<style id="ctx-css">
.ctx .pb{padding-top:6px}
.ctx-lead{font-size:16px;line-height:1.5;margin:4px 0 14px;font-weight:500}
.ctx-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 18px}
.ctx-kpis>div{background:var(--soft);border-radius:12px;padding:12px 14px;min-width:0}
.ctx-kpis .kick{display:block;font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--grey);margin-bottom:4px}
.ctx-kpis b{display:block;font-size:22px;font-variant-numeric:tabular-nums}
.ctx-kpis b.up{color:var(--up)} .ctx-kpis b.down{color:var(--down)}
.ctx-kpis small{color:var(--grey);font-size:12.5px}
.ctx-h{font-size:15px;margin:22px 0 10px;padding-top:14px;border-top:1px solid var(--rule)}
.ctx-t td,.ctx-t2 td{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.ctx-t th,.ctx-t2 th{white-space:nowrap}
.ctx-t td.ctx-up{color:var(--up);font-weight:600} .ctx-t td.ctx-dn{color:var(--down);font-weight:600}
.ctx-t tr.ctx-last th,.ctx-t tr.ctx-last td{font-weight:700}
.ctx-tag{font-size:10.5px;font-weight:600;background:var(--hl);border-radius:6px;padding:1px 6px;margin-left:4px;color:#6B5200}
.ctx-phs{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.ctx-ph{border-left:3px solid var(--rule);padding:2px 0 2px 12px}
.ctx-ph-hausse,.ctx-ph-rebond{border-left-color:var(--up)} .ctx-ph-baisse,.ctx-ph-retournement{border-left-color:var(--down)}
.ctx-phh{font-size:14.5px;line-height:1.5}
.ctx-ev{font-size:13.5px;line-height:1.5;color:#2b2925;margin-top:6px;background:var(--soft);border-radius:10px;padding:8px 10px}
.ctx-ev0{color:var(--grey)}
.ctx-evk{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--grey);margin-right:6px}
.ctx-src{display:block;font-size:12px;color:var(--light);margin-top:3px}
.ctx-src a,.ctx-col a{color:var(--link)}
.ctx-warn{font-size:13.5px;line-height:1.5;background:#FFF7E8;border:1px solid #F1DFB8;border-radius:10px;padding:10px 12px;margin:14px 0 0}
.ctx-ul{margin:6px 0 0;padding-left:18px;font-size:14px;line-height:1.55}
.ctx-ul li{margin:3px 0}
.ctx-prof{margin-top:14px}
.ctx-profr{font-weight:600;margin:0 0 10px;font-size:14.5px}
.ctx-profg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.ctx-pc{border:1px solid var(--rule);border-radius:12px;padding:12px 14px;min-width:0}
.ctx-pc p{margin:4px 0;font-size:13.5px;line-height:1.45}
.ctx-pch{display:flex;justify-content:space-between;align-items:center;gap:8px}
.ctx-q{color:var(--grey)}
.ctx-rep{font-size:12px!important;color:var(--light);line-height:1.45}
.ctx-niv{font-size:12px;font-weight:700;border-radius:999px;padding:2px 9px;white-space:nowrap}
.ctx-oui{background:#E3F2EA;color:#0F6B3F} .ctx-part{background:#FFF1D6;color:#7A5300} .ctx-non{background:var(--soft);color:var(--grey)}
.ctx-sur{margin-top:14px;font-size:13.5px} .ctx-sur summary{cursor:pointer;font-weight:600}
.ctx-sur ul{padding-left:18px;line-height:1.5}
.ctx-sjs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.ctx-sj{border:1px solid var(--rule);border-radius:12px;padding:12px 14px;min-width:0}
.ctx-sj h3{font-size:15px;margin:6px 0 6px;line-height:1.35}
.ctx-sjh{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
.ctx-th{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--grey)}
.ctx-sens{font-size:11.5px;font-weight:700;border-radius:999px;padding:1px 8px}
.ctx-s-up{background:#E3F2EA;color:#0F6B3F} .ctx-s-dn{background:#FBE7E3;color:#A0301F} .ctx-s-mx{background:#FFF1D6;color:#7A5300}
.ctx-pour{font-size:13.5px;line-height:1.5;margin:0 0 6px}
.ctx-sj details{font-size:13px} .ctx-sj summary{cursor:pointer;color:var(--link)}
.ctx-sj ul{padding-left:18px;line-height:1.5;margin:6px 0}
.ctx-col{list-style:none;margin:0;padding:0}
.ctx-col li{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline;padding:8px 0;border-bottom:1px solid var(--rule);font-size:13.5px;line-height:1.4}
.ctx-col a{flex:1 1 220px;min-width:0;overflow-wrap:anywhere}
.ctx-d{font-variant-numeric:tabular-nums;color:var(--grey);font-size:12.5px}
.ctx-k{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:var(--grey)}
.ctx-lie{font-size:11.5px;background:var(--hl);border-radius:6px;padding:1px 6px}
.ctx-cov{font-size:13.5px;margin:12px 0 0}
p.ctx-doute,li.ctx-doute{background:#FFF7E8;border-left:3px solid #E0A93B;padding:6px 10px;border-radius:6px}
@media (max-width:760px){.ctx-kpis{grid-template-columns:1fr 1fr}.ctx-kpis>div:last-child{grid-column:1/-1}.ctx-profg,.ctx-sjs{grid-template-columns:1fr}.ctx-kpis b{font-size:19px}}
</style>`);
}
