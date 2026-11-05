// Comptes annuels des sociétés sans source officielle ouverte (Allemagne, Japon, Suisse, Chine, Inde, Corée…), repris d'Eulerpool (5/11/2026).
// Offre gratuite d'Eulerpool : 100 000 appels par mois, mention « Data by Eulerpool » avec lien obligatoire partout où les chiffres
// sont montrés (faite sur la fiche : source sous les graphiques et bloc « D'où viennent ces chiffres »). Demande écrite envoyée par Romain
// pour confirmer l'usage sur un site public ; si Eulerpool refuse, supprimer les fiches `sourceEP` (node data/eulerpool.mjs --retirer).
//   node data/eulerpool.mjs --max 400           complète les fiches sans comptes (EULERPOOL_KEY requis)
//   node data/eulerpool.mjs --ids nestle,lindt-and-sprungli
//   node data/eulerpool.mjs --retirer           retire toutes les fiches reprises d'Eulerpool
// Ce qui est gardé, et pourquoi (essai du 5/11 : prévisions mêlées aux comptes, assureurs incohérents, trimestres peu fiables) :
//  - comptes ANNUELS seulement, et seulement les exercices clos présents aussi dans le bilan (les années « futures » sont des prévisions) ;
//  - banques et assurances écartées (chiffres incohérents, fonds propres douteux) ; fonds propres jamais repris (Nestlé : 62,7 Md au lieu d'environ 37) ;
//  - contrôles : ventes > 0 sur chaque année, bénéfice et résultat d'exploitation < ventes, pas de saut des ventes de plus de x3 d'une année
//    à l'autre, au moins deux exercices dont le dernier clos depuis moins de 20 mois ; sinon la société est laissée sans comptes.
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
const KEY = process.env.EULERPOOL_KEY || "", B = "https://api.eulerpool.com/api/1";
const OUT = new URL("../cf/site/data/", import.meta.url), CACHE = new URL("./eulerpool_cache.json", import.meta.url);
export const SOURCE_EP = "Eulerpool";
// Devise de cotation par place. 5/11 : quand la devise des comptes annoncée diffère de celle de la cotation, les chiffres sont
// souvent faux (Tencent, Xiaomi, Meituan : montants en dollars de Hong Kong étiquetés en yuans ; ABB : rien ne correspond) : écartés.
export const DEVISE_PLACE = { TSE: "JPY", XETR: "EUR", FWB: "EUR", SIX: "CHF", NSE: "INR", BSE: "INR", HKEX: "HKD", EURONEXT: "EUR", OMXHEX: "EUR", MIL: "EUR", BME: "EUR", VIE: "EUR", ATHEX: "EUR", ASX: "AUD", KRX: "KRW", GPW: "PLN", OMXSTO: "SEK", OMXCOP: "DKK", OSL: "NOK", TWSE: "TWD", TSX: "CAD", LSE: "GBP", SZSE: "CNY", SSE: "CNY", TADAWUL: "SAR", SGX: "SGD", BMFBOVESPA: "BRL", BMV: "MXN", TASE: "ILS" };
const r1 = v => v == null || !isFinite(v) ? null : Math.round(v * 100) / 100;

// Lignes Eulerpool (montants en millions, devise de cotation du profil) → comptes au format du site, ou { raison } si refusé.
// 5/11 (2e version) : une année douteuse au début de la série ne fait plus écarter la société : on garde les années propres
// les plus récentes (au moins deux). Banques et assurances : seulement bénéfice, bénéfice par action et dividendes
// (leurs « ventes » et fonds propres chez Eulerpool sont inutilisables), et bénéfice sans saut de plus de x4 d'une année à l'autre.
export function convertirEP(c, { profil, inc, bs, cf, dv }, auj = new Date().toISOString().slice(0, 10)) {
  if (!profil || !profil.currency) return { raison: "profil ou devise absents" };
  const fin_k = c.sector === "finance";
  const place = String(c.tv || "").split(":")[0], dc = DEVISE_PLACE[place];
  if (!dc) return { raison: `place de cotation non prévue (${place || "aucune"})` };
  if (dc !== profil.currency) return { raison: `comptes en ${profil.currency}, cotation en ${dc} : écartée (montants souvent faux)` };
  const reels = new Set((bs || []).map(x => String(x.period).slice(0, 10)).filter(p => p <= auj)); // le bilan ne contient que des exercices clos
  let L = (inc || []).filter(x => { const p = String(x.period).slice(0, 10); return p <= auj && reels.has(p) && (fin_k ? x.netIncome != null : x.revenue != null); })
    .sort((a, b) => String(a.period).localeCompare(String(b.period)));
  const an = x => String(x.period).slice(0, 4);
  const ok1 = x => fin_k ? true : x.revenue > 0 && (x.netIncome == null || Math.abs(x.netIncome) <= x.revenue) && (x.ebit == null || Math.abs(x.ebit) <= x.revenue);
  const saut = (a, b) => fin_k ? a.netIncome > 0 && b.netIncome > 0 && (b.netIncome / a.netIncome > 4 || a.netIncome / b.netIncome > 4) : b.revenue / a.revenue > 3 || a.revenue / b.revenue > 3;
  let debut = 0, raison = "";
  for (let i = 0; i < L.length; i++) {
    if (!ok1(L[i])) { debut = i + 1; raison = `année ${an(L[i])} incohérente`; }
    else if (i > debut && saut(L[i - 1], L[i])) { debut = i; raison = `saut ${an(L[i - 1])} → ${an(L[i])}`; }
  }
  L = L.slice(debut).slice(-5);
  if (L.length < 2) return { raison: L.length ? `un seul exercice cohérent (${raison})` : raison || "aucun exercice clos" };
  const fin = String(L.at(-1).period).slice(0, 10), mois = (Date.parse(auj) - Date.parse(fin)) / 2629746e3;
  if (mois > 20) return { raison: `derniers comptes clos le ${fin}` };
  const bsP = Object.fromEntries((bs || []).map(x => [String(x.period).slice(0, 10), x]));
  const cfP = Object.fromEntries((cf || []).map(x => [String(x.period).slice(0, 10), x]));
  const years = L.map(x => +String(x.period).slice(0, 4)), per = L.map(x => String(x.period).slice(0, 10));
  const col = f => per.map(f);
  const debt = col(p => { const b = bsP[p]; if (!b) return null; const s = [b.shortTermDebt, b.currentPortionLongTermDebt, b.longTermDebt].filter(v => v != null); return s.length ? r1(s.reduce((a, v) => a + v, 0)) : null; });
  const cash = col(p => r1(bsP[p] && bsP[p].cashShortTermInvestments));
  const cfo = col(p => r1(cfP[p] && cfP[p].netOperatingCashFlow)), capex = col(p => cfP[p] && cfP[p].capex != null ? r1(Math.abs(cfP[p].capex)) : null);
  const fin_ = {
    ca: L.map(x => r1(x.revenue)), ebit: L.map(x => r1(x.ebit)), net: L.map(x => r1(x.netIncome)),
    eps: L.map(x => x.diluted_eps == null ? null : Math.round(x.diluted_eps * 100) / 100),
    pretax: L.map(x => r1(x.pretaxIncome)), tax: L.map(x => r1(x.provisionforIncomeTaxes)),
    cash, debt, netDebt: debt.map((d, i) => d != null && cash[i] != null ? r1(d - cash[i]) : null),
    cfo, capex, fcf: col(p => r1(cfP[p] && cfP[p].fcf)).map((v, i) => v ?? (cfo[i] != null && capex[i] != null ? r1(cfo[i] - capex[i]) : null)),
    divPaid: col(p => cfP[p] && cfP[p].cashDividendsPaid != null ? r1(Math.abs(cfP[p].cashDividendsPaid)) : null),
  };
  // Dividende par action de chaque exercice (5/11) : versements dont la date de détachement tombe entre 7 mois avant et 5 mois
  // après la clôture (Japon : acompte en septembre et solde fin mars ; Europe : versement après l'assemblée du printemps).
  // Exercice dont la fenêtre n'est pas encore close : inconnu. Aucun versement connu chez Eulerpool : inconnu (pas « 0 »).
  // Part versée invraisemblable (plus de 150 % du bénéfice par action) : écarté.
  if (Array.isArray(dv) && dv.length) {
    const T = dv.filter(x => x && x.dividend > 0 && x.period).map(x => ({ t: Date.parse(String(x.period).slice(0, 10)), v: x.dividend }));
    fin_.dps = per.map((p, i) => { const e = Date.parse(p); if (e + 152 * 864e5 > Date.parse(auj)) return null;
      const v = T.filter(x => x.t > e - 212 * 864e5 && x.t <= e + 152 * 864e5).reduce((a, x) => a + x.v, 0), eps = fin_.eps[i];
      return eps > 0 && v / eps > 1.5 ? null : Math.round(v * 1e4) / 1e4; });
  }
  if (fin_k) for (const k of ["ca", "ebit", "cash", "debt", "netDebt", "cfo", "capex", "fcf"]) delete fin_[k];
  for (const k of Object.keys(fin_)) if (fin_[k].every(v => v == null)) delete fin_[k];
  const lien = `https://eulerpool.com/stock/${encodeURIComponent(c.isin)}`;
  return { comptes: { years, currency: profil.currency, fyEnd: fin.slice(5), fin: fin_, norme: SOURCE_EP,
    sources: per.slice().reverse().map(p => ({ periodEnd: p, source: SOURCE_EP, report: lien, json: null })) } };
}

async function get(path) {
  const r = await fetch(`${B}${path}?token=${KEY}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(30000) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Eulerpool ${r.status} ${path.split("/")[2]}`);
  return r.json();
}

async function main() {
  const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
  const { default: U } = await import("./univers.mjs"), { summary, VERSION } = await import("./fetch_data.mjs");
  const idx = JSON.parse(readFileSync(new URL("societes.json", OUT), "utf8")), parId = new Map(idx.companies.map((c, i) => [c.id, i]));
  const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
  const sauver = () => { writeFileSync(new URL("societes.json", OUT), JSON.stringify(idx)); writeFileSync(CACHE, JSON.stringify(cache)); };
  if (process.argv.includes("--retirer")) {
    let n = 0; for (const c of U) { const f = new URL(`societes/${c.id}.json`, OUT); if (!existsSync(f)) continue; const j = JSON.parse(readFileSync(f, "utf8")); if (!j.sourceEP) continue;
      unlinkSync(f); const k = parId.get(c.id); if (k != null) idx.companies[k] = { id: c.id, name: c.name, ticker: c.ticker, tv: c.tv, isin: c.isin, region: c.region, domain: c.domain, desc: c.desc, sector: c.sector, missing: true }; n++; }
    sauver(); console.log(n, "fiches Eulerpool retirées"); return;
  }
  if (!KEY) { console.log("EULERPOOL_KEY absent : rien à faire."); return; }
  const seuls = (arg("--ids", "") || "").split(",").filter(Boolean), MAX = +arg("--max", 400), J = 864e5, maintenant = Date.now();
  const sansComptes = c => { const s = idx.companies[parId.get(c.id)]; return !s || s.missing || !existsSync(new URL(`societes/${c.id}.json`, OUT)); };
  const estEP = c => { const f = new URL(`societes/${c.id}.json`, OUT); return existsSync(f) && JSON.parse(readFileSync(f, "utf8")).sourceEP; };
  const TOUT = process.argv.includes("--tout"); // tout redemander, sans tenir compte des essais récents
  const lireF = c => { const f = new URL(`societes/${c.id}.json`, OUT); return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null; };
  // Fiche officielle en retard : dernier exercice clos depuis plus de 13 mois (un rapport plus récent existe sans doute)
  const enRetard = c => { const j = lireF(c); if (!j || j.sourceEP || j.sourcePdf || !(j.years || []).length) return false; const s = idx.companies[parId.get(c.id)] || {};
    const clos = s.clos || `${j.years.at(-1)}-${j.fyEnd || "12-31"}`; return maintenant - Date.parse(clos) > 13 * 30.4 * J; };
  const recent = (c, jours) => !TOUT && cache[c.id] && maintenant - Date.parse(cache[c.id].d) < jours * J;
  const todo = U.filter(c => c.isin && !c.sec && !c.cik && (seuls.length ? seuls.includes(c.id)
    : (sansComptes(c) && !recent(c, 20)) // échec : nouvel essai au bout de 20 jours
      || (estEP(c) && !recent(c, 30)) // fiche Eulerpool : relue tous les 30 jours (nouvel exercice)
      || (enRetard(c) && !recent(c, 20)))) // fiche officielle bloquée à un ancien exercice
    .slice(0, MAX);
  console.log(todo.length, "sociétés à demander à Eulerpool");
  let ok = 0, appels = 0;
  for (const c of todo) {
    try {
      const profil = await get(`/equity/profile/${c.isin}`); appels++;
      if (!profil) { cache[c.id] = { d: new Date().toISOString().slice(0, 10), ok: false, pourquoi: "inconnue chez Eulerpool" }; console.log("✗", c.id, "inconnue"); continue; }
      const [inc, bs, cf, dv] = await Promise.all(["incomestatement", "balancesheet", "cashflowstatement", "dividends"].map(p => get(`/equity/${p}/${c.isin}`))); appels += 4;
      const r = convertirEP(c, { profil, inc, bs, cf, dv });
      cache[c.id] = { d: new Date().toISOString().slice(0, 10), ok: !!r.comptes, ...(r.comptes ? { an: r.comptes.years.at(-1) } : { pourquoi: r.raison }) };
      if (!r.comptes) { // une fiche Eulerpool qui ne passe plus les contrôles est retirée (pas de chiffre douteux laissé en ligne)
        if (estEP(c)) { unlinkSync(new URL(`societes/${c.id}.json`, OUT)); const k = parId.get(c.id); if (k != null) idx.companies[k] = { id: c.id, name: c.name, ticker: c.ticker, tv: c.tv, isin: c.isin, region: c.region, domain: c.domain, desc: c.desc, sector: c.sector, missing: true }; console.log("retirée", c.id); }
        console.log("✗", c.id, r.raison); continue; }
      const off = lireF(c);
      if (off && !off.sourceEP && !off.sourcePdf) { // fiche officielle en retard : Eulerpool doit aller plus loin ET redonner les chiffres officiels
        const k = c.sector === "finance" ? "net" : "ca", E = r.comptes, com = off.years.filter(y => E.years.includes(y));
        const ecart = com.map(y => { const o = off.fin[k] && off.fin[k][off.years.indexOf(y)], e = E.fin[k] && E.fin[k][E.years.indexOf(y)]; return o && e != null ? Math.abs(e / o - 1) : null; }).filter(v => v != null);
        const pourquoi = E.years.at(-1) <= off.years.at(-1) ? "pas plus récent que les comptes officiels" : off.currency !== E.currency ? `devise différente (${off.currency} / ${E.currency})`
          : !ecart.length ? "aucune année commune pour vérifier" : Math.max(...ecart) > 0.03 ? `écart de ${Math.round(Math.max(...ecart) * 100)} % avec les comptes officiels` : "";
        if (pourquoi) { cache[c.id] = { d: new Date().toISOString().slice(0, 10), ok: false, retard: true, pourquoi }; console.log("· gardée", c.id, pourquoi); continue; }
      }
      const full = { v: VERSION, devise2: true, dette3: true, id: c.id, name: c.name, ticker: c.ticker, tv: c.tv, isin: c.isin, region: c.region, domain: c.domain, desc: c.desc, lei: c.lei || null, legalName: c.legal || c.name, sector: c.sector,
        ...r.comptes, sourceEP: true, updated: new Date().toISOString().slice(0, 10) };
      writeFileSync(new URL(`societes/${c.id}.json`, OUT), JSON.stringify(full));
      const k = parId.get(c.id); if (k != null) idx.companies[k] = summary(full); else { parId.set(c.id, idx.companies.length); idx.companies.push(summary(full)); }
      ok++; const n = full.fin.ca.length - 1;
      console.log("✓", c.id, full.years.at(-1), full.currency, "ventes", Math.round(full.fin.ca[n]), "net", full.fin.net ? Math.round(full.fin.net[n]) : "–");
    } catch (e) { console.log("panne", c.id, e.message); if (/ 5\d\d /.test(e.message)) { console.log("Eulerpool en panne : arrêt"); break; } }
    if ((ok + 1) % 20 === 0) sauver();
    await new Promise(r => setTimeout(r, 300));
  }
  sauver();
  console.log(`${ok} fiche(s) écrite(s) sur ${todo.length}, ${appels} appels`);
}
if (process.argv[1] && /[\/\\]eulerpool\.mjs$/.test(process.argv[1])) main();
