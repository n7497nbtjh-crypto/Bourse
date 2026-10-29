// Questions fréquentes de chaque fiche entreprise, au format FAQPage (schema.org), pour les moteurs de recherche.
// Lancé par build.mjs : écrit cf/site/data/faq/<id>.json (fichiers fabriqués, non versionnés), que le Worker
// insère dans la page /entreprise/<id> sous forme de JSON-LD. Mêmes questions que l'étape « Questions » de la fiche,
// réponses calculées avec les mêmes chiffres (comptes publiés, médiane du secteur, agenda, Wikidata). Aucun chiffre inventé.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";

const J = (f, d) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch (e) { return d; } };
const nf = d => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const CUR = { EUR: "€", USD: "$", GBP: "£", CHF: "CHF" };
const big = (m, cur) => (Math.abs(m) >= 1000 ? nf(1).format(m / 1000) + " Md" : nf(0).format(m) + " M") + (CUR[cur] || " " + cur);
const pct = (v, d = 0) => nf(d).format(v * 100) + " %";
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const dLabel = iso => { const [y, m, d] = iso.split("-"); return `${+d} ${MOIS[+m - 1]} ${y}`; };
const EEA = new Set(["FR", "DE", "NL", "BE", "LU", "IT", "ES", "PT", "IE", "AT", "FI", "SE", "DK", "NO", "IS", "LI", "PL", "CZ", "GR", "HU", "SK", "SI", "EE", "LV", "LT", "MT", "CY", "HR", "BG", "RO"]);
const median = a => { const s = a.filter(v => v != null && isFinite(v)).sort((x, y) => x - y); if (!s.length) return null; const k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };
const ratios = s => ({ g1: s.ca != null && s.caPrev > 0 ? s.ca / s.caPrev - 1 : null, marge: s.ca > 0 && s.ebit != null ? s.ebit / s.ca : null, nm: s.ca > 0 && s.net != null ? s.net / s.ca : null,
  lev: s.ebitda > 0 && s.netDebt != null ? s.netDebt / s.ebitda : null, payout: s.divPaid != null && s.net > 0 ? s.divPaid / s.net : null, roe: s.equity > 0 && s.net != null ? s.net / s.equity : null });

export function faqSeo(out = "cf/site/data/faq") {
  const S = J("cf/site/data/societes.json", { companies: [] }), U = J("cf/site/data/univers.json", { companies: [] });
  const WD = J("cf/site/data/wikidata.json", { items: {} }).items || {};
  const AG = [...J("cf/site/data/agenda.json", { events: [] }).events, ...J("cf/site/data/agenda-auto.json", { events: [] }).events];
  const today = new Date().toISOString().slice(0, 10), year = +today.slice(0, 4);
  const BY = Object.fromEntries(S.companies.map(c => [c.id, c]));
  const NOT_BANK = new Set(["visa", "mastercard"]), bank = c => c.sector === "finance" && !NOT_BANK.has(c.id);
  const med = {};
  for (const c of S.companies) if (!c.missing) { const r = ratios(c); if (bank(c)) r.marge = r.lev = null; (med[c.sector] = med[c.sector] || []).push(r); }
  const MED = Object.fromEntries(Object.entries(med).map(([k, l]) => [k, { n: l.length, ...Object.fromEntries(["g1", "marge", "lev", "payout", "roe"].map(m => [m, median(l.map(x => x[m]))])) }]));
  if (existsSync(out)) rmSync(out, { recursive: true });
  mkdirSync(out, { recursive: true });
  let n = 0;
  for (const u of U.companies) {
    const s = { ...(BY[u.id] || {}), ...u }, N = s.name, cur = s.currency || "EUR", r = ratios(s), md = MED[s.sector] || {}, ok = md.n >= 3, wd = WD[s.id] ? { ...WD[s.id] } : null, qa = [];
    if (wd && wd.siege && /^(siège|si[eè]ge social|headquarters)/i.test(wd.siege)) delete wd.siege;
    const fiche = u.fiche || {};
    qa.push([`Que fait ${N} et comment gagne-t-elle de l'argent ?`, [fiche.fait || s.desc, fiche.argent].filter(Boolean).join(" ")]);
    if (!s.missing && s.year) {
      if (s.divPaid != null) qa.push([`${N} verse-t-elle un dividende ?`, s.divPaid > 0.5 ? `Oui. Sur l'exercice ${s.year}, ${N} a versé ${big(s.divPaid, cur)} de dividendes à ses actionnaires${r.payout != null ? `, soit ${pct(r.payout)} de son bénéfice` : ""}.` : `Non, pas sur l'exercice ${s.year} : elle garde ses bénéfices pour investir, se désendetter ou racheter ses actions.`]);
      if (!bank(s) && s.netDebt != null) qa.push([`${N} est-elle trop endettée ?`, s.netDebt < 0 ? `Non : sur l'exercice ${s.year}, sa trésorerie dépasse ses dettes financières de ${big(-s.netDebt, cur)}.` : r.lev != null ? `Sur l'exercice ${s.year}, sa dette nette de ${big(s.netDebt, cur)} représente ${nf(1).format(r.lev)} année${r.lev >= 2 ? "s" : ""} de résultat d'exploitation avant amortissements${ok && md.lev != null ? ` (médiane de son secteur : ${nf(1).format(md.lev)})` : ""}.` : `Sa dette nette est de ${big(s.netDebt, cur)} sur l'exercice ${s.year}.`]);
      if (r.g1 != null) qa.push([`Les ventes de ${N} progressent-elles ?`, `Ses ${bank(s) ? "revenus sont passés" : "ventes sont passées"} de ${big(s.caPrev, cur)} à ${big(s.ca, cur)} sur l'exercice ${s.year}, soit ${r.g1 >= 0 ? "une hausse" : "une baisse"} de ${pct(Math.abs(r.g1), 1)}${ok && md.g1 != null ? ` (médiane de son secteur : ${r.g1 >= 0 && md.g1 >= 0 ? "+" : ""}${pct(md.g1, 1)})` : ""}.`]);
      if (s.net != null) qa.push([`${N} est-elle rentable ?`, s.net >= 0 ? `Oui : ${N} a gagné ${big(s.net, cur)} sur l'exercice ${s.year}${r.marge != null && !bank(s) ? `, avec une marge d'exploitation de ${pct(r.marge, 1)}${ok && md.marge != null ? ` (médiane de son secteur : ${pct(md.marge, 1)})` : ""}` : ""}.` : `Non, pas sur l'exercice ${s.year} : ${N} a perdu ${big(-s.net, cur)}.`]);
    }
    const pea = s.isin ? EEA.has(s.isin.slice(0, 2)) : s.region === "FR" ? true : null;
    if (pea != null) qa.push([`Peut-on mettre des actions ${N} dans un PEA ?`, pea ? `Oui : le siège de ${N} est dans l'Union européenne ou l'Espace économique européen. Ses actions peuvent aller dans un PEA ou un compte-titres.` : `Non : le siège de ${N} n'est pas dans l'Union européenne. Ses actions se détiennent dans un compte-titres ; un ETF éligible au PEA peut en revanche la contenir.`]);
    const nx = AG.filter(e => e.id === s.id && e.date >= today && /résultat|resultat|chiffre/i.test(e.type + " " + e.label)).sort((a, b) => a.date.localeCompare(b.date))[0];
    qa.push([`Quand ${N} publie-t-elle ses prochains résultats ?`, nx ? `La prochaine publication annoncée est le ${dLabel(nx.date)} : ${nx.label.charAt(0).toLowerCase() + nx.label.slice(1)}.` : `Aucune date n'est encore annoncée. Les grandes entreprises publient leurs résultats deux à quatre fois par an.`]);
    if (wd && (wd.fonde || wd.siege || wd.effectif)) qa.push([`Depuis quand ${N} existe-t-elle, et combien de personnes y travaillent ?`, [wd.fonde ? `${N} a été créée en ${wd.fonde}.` : "", wd.siege ? `Son siège est à ${wd.siege}${wd.pays ? ` (${wd.pays})` : ""}.` : "", wd.effectif ? `Elle emploie environ ${nf(0).format(wd.effectif[0])} personnes${wd.effectif[1] ? ` (chiffre de ${wd.effectif[1]})` : ""}.` : ""].filter(Boolean).join(" ") + " Source : Wikidata."]);
    const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: qa.filter(([q, a]) => q && a && a.length > 20).map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a.replace(/ /g, " ") } })) };
    if (ld.mainEntity.length >= 3) { writeFileSync(`${out}/${s.id}.json`, JSON.stringify(ld)); n++; }
  }
  return n;
}
if (import.meta.url === `file://${process.argv[1]}`) console.log(faqSeo(), "fichiers FAQ écrits");
