/* ENKLAIR : le script principal du site, sorti de index.html le 30/10/2026 (lot 6 : la page ne porte plus que le HTML et le CSS ; ce fichier est mis en cache par le service worker). */
"use strict";
const SITE = "ENKLAIR";
const RATES = { pfu: 0.314, ps: 0.186, year: 2026 }; // taux en vigueur en 2026, à vérifier chaque année
let R = null, AG = { events: [] }; // R : entreprises ; AG : agenda
const RBY = {}, FULL = {};
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const TODAY = new Date().toISOString().slice(0, 10);
// 1/11/2026 : quand la Bourse est fermée (week-end, avant 9 h), la variation affichée est celle de la dernière séance : on la nomme
// (« vendredi ») au lieu d'écrire « aujourd'hui ». Jours fériés non gérés.
function jourSeance() {
  try { const P = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" })), d = P.getDay(), h = P.getHours();
    if (d >= 1 && d <= 5 && h >= 9) return "aujourd'hui";
    const s = new Date(P); do { s.setDate(s.getDate() - 1); } while (s.getDay() === 0 || s.getDay() === 6);
    const veille = new Date(P); veille.setDate(veille.getDate() - 1);
    return s.toDateString() === veille.toDateString() ? "hier" : ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][s.getDay()];
  } catch (e) { return "aujourd'hui"; }
}

/* ---------- Formats ---------- */
const nf = d => { const f = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }); return { format: v => f.format(v).replace(/^-/, "\u2212"), formatToParts: f.formatToParts.bind(f) }; }; // signe moins typographique (−), jamais le tiret
const F0 = nf(0), F1 = nf(1), F2 = nf(2);
const CUR = { EUR: "€", USD: "$", GBP: "£", CHF: "CHF" };
const eur = (v, d = 2, cur = "EUR") => (v == null || !isFinite(v)) ? "–" : nf(d).format(v) + " " + (CUR[cur] || cur);
const pct = (v, d = 1, sign = true) => (v == null || !isFinite(v)) ? "–" : (sign && v > 0 ? "+" : "") + nf(d).format(v * 100) + " %";
const cls = v => v > 0 ? "up" : v < 0 ? "down" : "";
const big = (m, cur = "EUR") => m == null || !isFinite(m) ? "–" : (Math.abs(m) >= 1000 ? F1.format(m / 1000) + " Md" : F0.format(m) + " M") + (CUR[cur] || " " + cur);
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MOISL = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const mLong = ym => { const [y, m] = ym.split("-"); return MOISL[+m - 1] + " " + y; };
const dLabel = iso => { const [y, m, d] = iso.slice(0, 10).split("-"); return (+d) + " " + MOISL[+m - 1] + " " + y; };
const dShort = iso => { const [y, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}/${y.slice(2)}`; };
const median = a => { const s = a.filter(v => v != null && isFinite(v)).sort((x, y) => x - y); if (!s.length) return null; const k = Math.floor(s.length / 2); return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };

/* ---------- Indicateurs à partir des comptes ---------- */
const NOT_BANK = new Set(["visa", "mastercard"]); // classées en finance mais sans métier de prêteur
const isBank = c => c.sector === "finance" && !NOT_BANK.has(c.id);
const okn = x => x != null && isFinite(x);
function ratios(s) { // s : chiffres du dernier exercice
  return {
    g1: okn(s.ca) && s.caPrev > 0 ? s.ca / s.caPrev - 1 : null,
    marge: s.ca > 0 && okn(s.ebit) ? s.ebit / s.ca : null,
    nm: s.ca > 0 && okn(s.net) ? s.net / s.ca : null,
    ng: okn(s.net) && s.netPrev > 0 ? s.net / s.netPrev - 1 : null,
    roe: s.equity > 0 && okn(s.net) ? s.net / s.equity : null,
    lev: s.ebitda > 0 && okn(s.netDebt) ? s.netDebt / s.ebitda : null,
    gear: s.equity > 0 && okn(s.netDebt) ? s.netDebt / s.equity : null,
    conv: s.net > 0 && okn(s.fcf) ? s.fcf / s.net : null,
    payout: okn(s.divPaid) && s.net > 0 ? s.divPaid / s.net : null,
  };
}
const MKEYS = ["g1", "marge", "nm", "roe", "lev", "gear", "conv", "payout"];
let MED = {};
function computeMedians() { // médiane des entreprises suivies, par secteur (toutes régions)
  const by = {};
  R.companies.filter(c => !c.missing).forEach(c => { const r = ratios(c); if (isBank(c)) { r.lev = r.gear = r.conv = r.marge = null; } (by[c.sector] = by[c.sector] || []).push(r); });
  MED = Object.fromEntries(Object.entries(by).map(([k, l]) => [k, { n: l.length, ...Object.fromEntries(MKEYS.map(m => [m, median(l.map(x => x[m]))])) }]));
}
const regName = c => (R.regions && R.regions[c.region]) || "";
const secName = c => R.sectors[c.sector] || c.sector;
/* Les textes de fiche (ce qu'elle fait, d'où vient l'argent, ce qui fait varier ses résultats) pèsent la moitié de l'univers :
   ils sont servis à part (/data/fiches.json) et rattachés aux entreprises à la première demande. */
let FICHES = null, FICHESP = null;
function fichesMerge() { if (!FICHES || !R) return; R.companies.forEach(c => { if (FICHES[c.id]) c.fiche = FICHES[c.id]; }); FICHES.__ok = true; }
function loadFiches() {
  if (!FICHESP) FICHESP = getJSON("/data/fiches.json", {}).then(F => { FICHES = F; fichesMerge(); return F; });
  if (FICHES && R && !FICHES.__ok) fichesMerge(); // demandé avant l'univers, arrivé avant lui : rattachement au premier appel suivant
  return FICHESP;
}
const eventsOf = id => AG.events.filter(e => e.id === id).sort((a, b) => a.date.localeCompare(b.date));
const upcoming = () => AG.events.filter(e => e.date >= TODAY && RBY[e.id]).sort((a, b) => a.date.localeCompare(b.date));

/* ---------- Lecture : chaque chiffre traduit en phrase, avec un repère ---------- */
// Trois niveaux, décrits par des seuils affichés. Ce sont des repères de lecture des comptes, pas un avis sur l'action.
const LV = { fort: "Point fort", moyen: "Dans la moyenne", vig: "Point de vigilance", na: "Ne s'applique pas" };
const RULES = {
  croissance: "Plus de 5 % sur un an : point fort. De 0 à 5 % : dans la moyenne. En baisse : point de vigilance.",
  marge: "Comparée aux entreprises du même secteur : nettement au-dessus, point fort ; nettement en dessous, point de vigilance. Sans comparaison possible : plus de 15 % point fort, moins de 7 % point de vigilance.",
  net: "Bénéfice en hausse : point fort. En baisse de moins de 30 % : dans la moyenne. Perte, ou bénéfice divisé par plus de 1,4 : point de vigilance.",
  roe: "Plus de 15 % : point fort. De 8 à 15 % : dans la moyenne. Moins de 8 % : point de vigilance.",
  lev: "Moins de 1,5 an : point fort. De 1,5 à 3 ans : dans la moyenne. Plus de 3 ans : point de vigilance. Plus de trésorerie que de dettes : point fort.",
  gear: "Moins de 50 % : point fort. De 50 à 100 % : dans la moyenne. Plus de 100 % : point de vigilance.",
  fcf: "Plus de 80 € d'argent disponible pour 100 € de bénéfice : point fort. Positif mais moins : dans la moyenne. Négatif : point de vigilance.",
  payout: "Moins de 60 % du bénéfice : point fort, il reste une marge si les bénéfices baissent. De 60 à 90 % : dans la moyenne. Plus de 90 % : point de vigilance.",
  per: "Moins de 10 : bas. De 10 à 20 : la zone la plus courante. De 20 à 30 : élevé. Plus de 30 : très élevé. Ni bon ni mauvais en soi : tout dépend de la croissance attendue.",
  rdt: "La plupart des grandes entreprises versent entre 1 et 5 % par an. Au-delà de 6 %, vérifiez que le dividende est couvert par le bénéfice.",
};
let CURSYM = "€";
const e100 = v => F1.format(v * 100).replace(/,0$/, "") + " " + CURSYM;
function lecture(co, f) {
  const m = ratios(f), med = MED[co.sector] || {}, cur = f.currency || co.currency, bank = isBank(co), out = [];
  const medOk = med.n >= 3;
  const medTxt = (v, fm) => v != null && medOk ? ` Médiane des ${med.n} entreprises du secteur suivies ici : ${fm(v)}.` : "";
  const B = v => big(v, cur);
  if (m.g1 != null) out.push({ term: "croissance", q: bank ? "Les revenus progressent-ils ?" : "Les ventes progressent-elles ?", value: pct(m.g1), lv: m.g1 >= 0.05 ? "fort" : m.g1 >= 0 ? "moyen" : "vig",
    text: `${bank ? "Les revenus sont passés" : "Les ventes sont passées"} de ${B(f.caPrev)} à ${B(f.ca)} en un an.${f.cagr != null ? ` Depuis ${f.first} : ${pct(f.cagr)} par an en moyenne.` : ""}` });
  if (m.marge != null && !bank) {
    const mm = medOk ? med.marge : null;
    let lv = mm != null ? (m.marge >= mm + Math.max(0.03, Math.abs(mm) * 0.25) ? "fort" : m.marge <= mm - Math.max(0.03, Math.abs(mm) * 0.3) ? "vig" : "moyen") : (m.marge >= 0.15 ? "fort" : m.marge >= 0.07 ? "moyen" : "vig");
    if (m.marge < 0) lv = "vig";
    out.push({ term: "marge", q: "Que reste-t-il des ventes une fois les coûts payés ?", value: pct(m.marge, 1, false), lv,
      text: (m.marge >= 0 ? `Sur 100 ${CURSYM} de ventes, il reste ${e100(m.marge)} une fois payés les salaires, les achats et les autres coûts de l'activité.` : `L'activité perd ${e100(-m.marge)} pour 100 ${CURSYM} de ventes.`) + medTxt(mm, e100) });
  }
  if (f.net != null) {
    let lv, t;
    if (f.net < 0) { lv = "vig"; t = `Perte de ${B(-f.net)} sur l'exercice ${f.year}.`; }
    else if (f.netPrev != null && f.netPrev < 0) { lv = "fort"; t = `Bénéfice de ${B(f.net)}, après une perte l'année précédente.`; }
    else { lv = m.ng == null ? "moyen" : m.ng >= 0 ? "fort" : m.ng > -0.3 ? "moyen" : "vig"; t = `Bénéfice de ${B(f.net)} sur l'exercice ${f.year}${m.ng != null ? `, ${m.ng >= 0 ? "en hausse" : "en baisse"} de ${pct(Math.abs(m.ng), 0, false)} sur un an` : ""}.`; }
    if (m.nm != null && f.net > 0) t += ` Sur 100 ${CURSYM} ${bank ? "de revenus" : "de ventes"}, ${e100(m.nm)} de bénéfice final.`;
    out.push({ term: "net", q: "L'entreprise gagne-t-elle de l'argent ?", value: B(f.net), lv, text: t });
  }
  if (m.roe != null) out.push({ term: "roe", q: "L'argent des actionnaires rapporte-t-il ?", value: pct(m.roe, 1, false), lv: m.roe >= 0.15 ? "fort" : m.roe >= 0.08 ? "moyen" : "vig",
    text: `Pour 100 ${CURSYM} qui appartiennent aux actionnaires, l'entreprise a gagné ${e100(m.roe)} en un an.` + medTxt(med.roe, e100) });
  else if (f.equity != null && f.equity <= 0) out.push({ term: "roe", q: "L'argent des actionnaires rapporte-t-il ?", value: "–", lv: "na", text: "Capitaux propres négatifs : ce ratio ne se calcule pas. Voir l'explication plus bas." });
  if (bank) out.push({ term: "lev", q: "La dette est-elle sous contrôle ?", value: "–", lv: "na", text: "Pour une banque ou un assureur, emprunter et prêter est le métier lui-même : ce repère ne s'applique pas." });
  else if (f.netDebt != null) {
    if (f.netDebt < 0) out.push({ term: "dettenette", q: "La dette est-elle sous contrôle ?", value: "Pas de dette nette", lv: "fort", text: `L'entreprise a ${B(-f.netDebt)} de trésorerie de plus que ses dettes financières.` });
    else if (m.lev != null) out.push({ term: "lev", q: "La dette est-elle sous contrôle ?", value: F1.format(m.lev) + " an" + (m.lev >= 2 ? "s" : ""), lv: m.lev <= 1.5 ? "fort" : m.lev <= 3 ? "moyen" : "vig",
      text: `Sa dette nette de ${B(f.netDebt)} équivaut à ${F1.format(m.lev)} année${m.lev >= 2 ? "s" : ""} de l'argent dégagé par son activité avant investissements (EBITDA).` });
    else if (m.gear != null) out.push({ term: "gear", q: "La dette est-elle sous contrôle ?", value: pct(m.gear, 0, false), lv: m.gear <= 0.5 ? "fort" : m.gear <= 1 ? "moyen" : "vig",
      text: `Sa dette nette de ${B(f.netDebt)} représente ${pct(m.gear, 0, false)} de ce qui appartient aux actionnaires.` });
  }
  if (!bank && f.fcf != null) out.push({ term: "fcf", q: "Les bénéfices se transforment-ils en argent ?", value: B(f.fcf), lv: f.fcf < 0 ? "vig" : m.conv != null && m.conv >= 0.8 ? "fort" : "moyen",
    text: f.fcf >= 0 ? `Après avoir payé ses investissements (usines, machines, logiciels), il lui reste ${B(f.fcf)}${m.conv != null ? `, soit ${F0.format(m.conv * 100)} € pour 100 € de bénéfice` : ""}.` : `Ses investissements ont coûté plus que l'argent encaissé grâce à l'activité : il manque ${B(-f.fcf)} sur l'exercice.` });
  if (f.divPaid != null) {
    if (f.divPaid < 0.5) out.push({ term: "payout", q: "Le dividende est-il couvert ?", value: "Aucun", lv: "na", text: "Pas de dividende versé sur l'exercice : l'entreprise garde ses bénéfices pour investir ou racheter ses actions." });
    else if (!(f.net > 0)) out.push({ term: "payout", q: "Le dividende est-il couvert ?", value: B(f.divPaid), lv: "vig", text: `${B(f.divPaid)} versés aux actionnaires alors que l'entreprise est en perte : le dividende est payé avec sa trésorerie ou sa dette.` });
    else out.push({ term: "payout", q: "Le dividende est-il couvert ?", value: pct(m.payout, 0, false), lv: m.payout <= 0.6 ? "fort" : m.payout <= 0.9 ? "moyen" : "vig",
      text: `Sur 100 € de bénéfice, ${F0.format(m.payout * 100)} € ont été versés aux actionnaires${f.dps != null ? ` (${eur(f.dps, 2, cur)} par action${f.dpsEst ? ", estimé" : ""})` : ""}.` });
  }
  return out;
}
// Une phrase concrète par repère, avec les chiffres de l'entreprise (titre de chaque ligne)
const CAT = { croissance: "Croissance des ventes", marge: "Marge d'exploitation", net: "Bénéfice net", roe: "Rentabilité des capitaux propres", lev: "Endettement", gear: "Endettement", dettenette: "Endettement", fcf: "Trésorerie disponible", payout: "Dividende" };
function concret(co, f, items) {
  CURSYM = CUR[f.currency] || f.currency || "€";
  const m = ratios(f), med = MED[co.sector] || {}, B = v => big(v, f.currency), bank = isBank(co), medOk = med.n >= 3;
  const sect = (v, fm) => v != null && medOk ? ` (secteur : ${fm(v)})` : "";
  for (const i of items) {
    const t = i.term;
    if (t === "croissance") i.say = `${bank ? "Revenus" : "Ventes"} ${m.g1 >= 0 ? "en hausse" : "en baisse"} de ${pct(Math.abs(m.g1), 0, false)} en un an, à ${B(f.ca)}`;
    else if (t === "marge") i.say = m.marge < 0 ? `L'activité coûte plus qu'elle ne rapporte : −${e100(-m.marge)} pour 100 ${CURSYM} de ventes` : `Une fois payés salaires, achats et frais, il reste ${e100(m.marge)} sur 100 ${CURSYM} de ventes${sect(med.marge > 0 ? med.marge : null, e100)}`;
    else if (t === "net") i.say = f.net < 0 ? `Perte de ${B(-f.net)} sur l'exercice ${f.year}` : `${B(f.net)} de bénéfice après impôts${m.ng != null ? `, ${m.ng >= 0 ? "en hausse" : "en baisse"} de ${pct(Math.abs(m.ng), 0, false)} sur un an` : ""}`;
    else if (t === "roe") i.say = i.lv === "na" ? "Ne se calcule pas : les capitaux propres sont négatifs" : `Gagne ${e100(m.roe)} par an pour 100 ${CURSYM} appartenant aux actionnaires${sect(med.roe, e100)}`;
    else if (t === "lev" && i.lv === "na") i.say = "Emprunter et prêter est le métier d'une banque : ce critère ne s'applique pas";
    else if (t === "dettenette") i.say = `Pas de dette nette : ${B(-f.netDebt)} de trésorerie de plus que ses emprunts`;
    else if (t === "lev") i.say = `Il faudrait ${F1.format(m.lev)} an${m.lev >= 2 ? "s" : ""} de résultat d'exploitation pour rembourser sa dette nette (${B(f.netDebt)})`;
    else if (t === "gear") i.say = `Dette nette de ${B(f.netDebt)}, soit ${pct(m.gear, 0, false)} de ce qui appartient aux actionnaires`;
    else if (t === "fcf") i.say = f.fcf >= 0 ? `Une fois ses investissements payés, il lui reste ${B(f.fcf)} d'argent disponible` : `Ses investissements ont coûté ${B(-f.fcf)} de plus que ce que l'activité a rapporté`;
    else if (t === "payout") i.say = i.lv === "na" ? "Aucun dividende versé : les bénéfices restent dans l'entreprise" : !(f.net > 0) ? `Verse ${B(f.divPaid)} de dividendes alors qu'elle est en perte` : `Reverse ${pct(m.payout, 0, false)} de son bénéfice aux actionnaires et garde le reste`;
    i.cat = CAT[t] || "";
  }
  return items;
}
// Ce qu'il faut retenir : points forts et points de vigilance, en phrases
const CROSS_POS = new Set(["Bonne rentabilité sans dette excessive", "Marge en hausse trois ans de suite", "Perte comptable, mais de l'argent encaissé"]);
function retenir(co, f) {
  const items = concret(co, f, lecture(co, f)), cross = croisements(co, f);
  const forts = [...items.filter(i => i.lv === "fort").map(i => i.say), ...cross.filter(([h]) => CROSS_POS.has(h)).map(([h]) => h)];
  const vig = [...items.filter(i => i.lv === "vig").map(i => i.say), ...cross.filter(([h]) => !CROSS_POS.has(h) && !/Secteur cyclique|Banque ou assurance/.test(h)).map(([h]) => h)];
  return { forts, vig };
}
function croisements(co, f) { // ce qu'il faut regarder ensemble
  const m = ratios(f), bank = isBank(co), out = [];
  const hiDebt = !bank && ((m.lev != null && m.lev > 3) || (m.lev == null && m.gear != null && m.gear > 1));
  if (m.roe >= 0.15 && hiDebt) out.push(["Bonne rentabilité, mais avec beaucoup de dette", "La rentabilité des capitaux propres est forte en partie parce que l'entreprise travaille avec de l'argent emprunté. Cela marche bien quand les bénéfices tiennent, moins quand ils baissent."]);
  if (m.roe >= 0.15 && !hiDebt && !bank && f.netDebt != null) out.push(["Bonne rentabilité sans dette excessive", "Les bénéfices viennent de l'activité elle-même, pas d'un effet de la dette."]);
  if (m.g1 >= 0.1 && f.fcf < 0) out.push(["Forte croissance, mais l'argent sort", "Les ventes montent vite, mais les investissements coûtent plus que ce que l'activité rapporte. La croissance est financée par la trésorerie, la dette ou de nouvelles actions."]);
  if (m.g1 < 0 && m.ng > 0.05) out.push(["Bénéfice en hausse alors que les ventes baissent", "Cela peut venir d'économies, d'une baisse d'impôts ou d'un gain ponctuel (vente d'une activité). Le rapport annuel donne le détail."]);
  if (m.g1 > 0.05 && m.ng != null && m.ng < -0.15) out.push(["Ventes en hausse, bénéfice en baisse", "L'entreprise vend plus mais gagne moins : coûts en hausse, prix sous pression ou charge exceptionnelle."]);
  if (m.payout > 1 || (f.net <= 0 && f.divPaid > 0.5)) out.push(["Dividende plus élevé que le bénéfice", "L'entreprise verse plus qu'elle ne gagne. Cela ne peut pas durer sans hausse des bénéfices."]);
  if (!bank && f.net > 0 && m.conv != null && m.conv >= 0 && m.conv < 0.5) out.push(["Bénéfice peu transformé en argent", `Pour 100 € de bénéfice, il ne reste que ${F0.format(m.conv * 100)} € une fois les investissements payés. Les investissements sont lourds, ou les clients paient tard.`]);
  if (!bank && f.net < 0 && f.fcf > 0) out.push(["Perte comptable, mais de l'argent encaissé", "Le résultat est négatif, mais l'activité a quand même rapporté de l'argent. Souvent, une charge sans sortie d'argent (dépréciation d'une acquisition) pèse sur le résultat."]);
  if (f.margeTrend === "baisse") out.push(["Marge en baisse trois ans de suite", `Elle est passée de ${pct(f.marges.at(-3), 1, false)} à ${pct(f.marges.at(-1), 1, false)}. L'entreprise garde moins sur chaque vente.`]);
  if (f.margeTrend === "hausse") out.push(["Marge en hausse trois ans de suite", `Elle est passée de ${pct(f.marges.at(-3), 1, false)} à ${pct(f.marges.at(-1), 1, false)}. L'entreprise garde plus sur chaque vente.`]);
  if (f.equity != null && f.equity <= 0) out.push(["Capitaux propres négatifs", "Les dettes dépassent la valeur comptable des actifs. Fréquent aux États-Unis chez des entreprises rentables qui rachètent beaucoup leurs actions ; plus préoccupant quand l'entreprise perd de l'argent."]);
  if (["energie", "materiaux"].includes(co.sector)) out.push(["Secteur cyclique", "Les bénéfices suivent les prix du pétrole, du gaz ou des métaux. Une seule année dit peu : comparez plusieurs exercices dans l'onglet Comptes."]);
  if (bank) out.push(["Banque ou assurance : d'autres repères", "La dette et l'argent disponible ne se lisent pas comme pour une entreprise industrielle. La rentabilité des capitaux propres et la régularité du bénéfice comptent davantage."]);
  return out;
}
function tally(items) { const t = { fort: 0, moyen: 0, vig: 0 }; items.forEach(i => { if (t[i.lv] != null) t[i.lv]++; }); return t; }
function tallyTxt(t) { return [t.fort && `${t.fort} point${t.fort > 1 ? "s" : ""} fort${t.fort > 1 ? "s" : ""}`, t.moyen && `${t.moyen} dans la moyenne`, t.vig && `${t.vig} point${t.vig > 1 ? "s" : ""} de vigilance`].filter(Boolean).join(" · "); }
const quick = c => c.missing ? null : (typeof rfTally === "function" ? rfTally(c, { ...c, cagr: null }) : tally(lecture(c, { ...c, cagr: null }))); // 30/10 : même compte des points partout (rfNiveaux, fiche2.js)

/* ---------- Définitions ---------- */
const TERMS = {
  cours: { name: "Cours et performance", what: "L'évolution du prix de l'action.", calc: "Variation du cours sur la période.", read: "Avec les dividendes réinvestis, on voit ce qu'a réellement gagné un actionnaire qui a gardé ses titres.", limit: "Le passé ne dit rien de l'évolution future." },
  cap: { name: "Capitalisation", what: "La valeur totale de l'entreprise en Bourse.", calc: "Cours × nombre d'actions.", read: "Plus de 10 Md€ : grande capitalisation. De 1 à 10 Md€ : moyenne. Moins de 1 Md€ : petite.", limit: "Elle change chaque jour avec le cours." },
  ca: { name: "Chiffre d'affaires", ex: "Une boulangerie qui vend 500 pains à 2 € a un chiffre d'affaires de 1 000 €, quels que soient ses coûts.", what: "Ce que l'entreprise vend en un an.", calc: "Total des ventes de l'exercice.", read: "Sa croissance montre si l'activité grandit ou recule.", limit: "Le rachat d'une autre entreprise gonfle la croissance sans que l'activité d'origine progresse. Les banques et assureurs ne publient pas de chiffre d'affaires au sens habituel." },
  croissance: { name: "Croissance du chiffre d'affaires", ex: "Ventes de 110 M€ cette année contre 100 M€ l'an dernier : croissance de 10 %.", what: "La variation des ventes d'une année sur l'autre.", calc: "(Chiffre d'affaires de l'année ÷ celui de l'année précédente) − 1.", read: "Une croissance régulière sur plusieurs années compte plus qu'une seule bonne année.", limit: "Les variations de change et les acquisitions la modifient." },
  resexp: { name: "Résultat d'exploitation", what: "Ce que rapporte l'activité elle-même, avant les frais financiers et les impôts.", calc: "Chiffre d'affaires − coûts de l'activité.", read: "C'est la base de la marge d'exploitation.", limit: "Certaines entreprises le présentent sous un autre nom ou ne le publient pas sous la forme standard." },
  marge: { name: "Marge d'exploitation", ex: "Ventes de 1 000 €, coûts de l'activité de 850 € : il reste 150 €, soit une marge de 15 %.", what: "Ce que l'activité rapporte sur 100 € vendus.", calc: "Résultat d'exploitation ÷ chiffre d'affaires.", read: "Se compare entre entreprises du même secteur.", limit: "Très différente d'un secteur à l'autre : 4 % peut être normal dans la distribution, faible dans le logiciel." },
  net: { name: "Résultat net", ex: "Sur 150 € de résultat d'exploitation, l'entreprise paie 20 € d'intérêts et 35 € d'impôts : résultat net de 95 €.", what: "Le bénéfice final revenant aux actionnaires, après toutes les charges et les impôts.", calc: "Résultat d'exploitation − frais financiers − impôts ± éléments exceptionnels.", read: "Montre si l'entreprise gagne de l'argent.", limit: "Un élément exceptionnel (vente d'une filiale, dépréciation) peut le fausser une année." },
  bnpa: { name: "BNPA", what: "Le bénéfice net par action.", calc: "Résultat net ÷ nombre moyen d'actions.", read: "C'est la base du calcul du PER.", limit: "Les rachats d'actions le font monter sans que le bénéfice total change." },
  per: { name: "PER", ex: "Une action à 60 € d'une entreprise qui gagne 4 € par action : PER de 15.", what: "Combien d'années de bénéfices le prix de l'action représente.", calc: "Cours ÷ bénéfice net par action.", read: "La plupart des actions se situent entre 10 et 20. Un PER élevé veut dire que les investisseurs paient beaucoup parce qu'ils croient à la suite : le marché y croit. Un PER bas veut dire qu'ils doutent de la suite : le marché doute.", limit: "Impossible à calculer quand l'entreprise perd de l'argent." },
  dps: { name: "Dividende par action", what: "La somme versée à l'actionnaire pour chaque action détenue.", calc: "Montant voté en assemblée générale. Ici : dividende versé pendant l'exercice, tel que publié dans les comptes.", read: "Sa régularité sur plusieurs années compte autant que son montant.", limit: "L'entreprise peut le réduire ou le supprimer." },
  rdt: { name: "Rendement du dividende", ex: "Une action à 50 € qui verse 2 € par an : rendement de 4 %.", what: "Ce que l'action verse chaque année par rapport à son prix.", calc: "Dividende par action ÷ cours.", read: "Les entreprises matures versent en général plus que les entreprises en forte croissance.", limit: "Un rendement très élevé vient souvent d'un cours en forte baisse." },
  payout: { name: "Taux de distribution", ex: "Bénéfice de 100 M€, dividendes versés de 45 M€ : taux de distribution de 45 %.", what: "La part du bénéfice versée en dividende.", calc: "Dividendes versés ÷ résultat net.", read: "Au-delà de 90 %, le dividende devient difficile à maintenir.", limit: "Une année de bénéfice exceptionnellement bas fait grimper le taux." },
  ebitda: { name: "EBITDA", what: "Le résultat de l'activité avant amortissements : une mesure de l'argent généré par l'exploitation.", calc: "Résultat d'exploitation + dotations aux amortissements. Ici estimé à partir des comptes publiés.", read: "Sert surtout à mesurer la capacité à rembourser la dette.", limit: "Ne tient pas compte des investissements nécessaires pour faire tourner l'activité." },
  dette: { name: "Dette financière", what: "Les emprunts et obligations de l'entreprise.", calc: "Emprunts à long terme + emprunts à court terme, hors dettes de location.", read: "À rapporter à la taille de l'entreprise et à ce qu'elle génère.", limit: "Chaque entreprise présente sa dette un peu différemment." },
  tresorerie: { name: "Trésorerie", what: "L'argent disponible immédiatement.", calc: "Trésorerie et équivalents de trésorerie à la clôture.", read: "Permet de faire face aux dépenses sans emprunter.", limit: "Une photo à la date de clôture des comptes." },
  dettenette: { name: "Dette nette", ex: "Emprunts de 800 M€, trésorerie de 300 M€ : dette nette de 500 M€.", what: "Les dettes financières moins la trésorerie disponible.", calc: "Dette financière − trésorerie. Ici estimée à partir des comptes publiés.", read: "Négative : l'entreprise a plus de trésorerie que de dettes.", limit: "Peut différer de la dette nette annoncée par l'entreprise, qui inclut parfois d'autres éléments." },
  lev: { name: "Dette nette ÷ EBITDA", ex: "Dette nette de 6 Md€, EBITDA de 3 Md€ : il faudrait 2 ans pour rembourser.", what: "En combien d'années l'entreprise pourrait rembourser sa dette avec ce que génère son activité.", calc: "Dette nette ÷ EBITDA.", read: "Moins de 2 : situation solide. De 2 à 4 : maîtrisée. Plus de 4 : endettement élevé.", limit: "Ne s'applique pas aux banques et assureurs, dont la dette fait partie du métier." },
  gear: { name: "Dette nette ÷ capitaux propres", what: "Le poids de la dette par rapport à ce qui appartient aux actionnaires.", calc: "Dette nette ÷ capitaux propres.", read: "Moins de 50 % : endettement modéré. Au-delà de 100 % : la dette dépasse les capitaux propres.", limit: "Ne s'applique pas aux banques et assureurs." },
  capitaux: { name: "Capitaux propres", what: "Ce qui appartient aux actionnaires dans le bilan.", calc: "Total des actifs − total des dettes, part du groupe.", read: "Sert au calcul de la rentabilité des capitaux propres.", limit: "Valeur comptable, souvent loin de la valeur en Bourse." },
  roe: { name: "Rentabilité des capitaux propres (ROE)", ex: "Capitaux propres de 1 000 M€, bénéfice de 150 M€ : rentabilité de 15 %.", what: "Ce que l'entreprise gagne avec l'argent de ses actionnaires.", calc: "Résultat net ÷ capitaux propres.", read: "Se compare au secteur.", limit: "Une dette importante le gonfle artificiellement." },
  cfo: { name: "Flux de trésorerie d'exploitation", what: "L'argent réellement encaissé grâce à l'activité.", calc: "Résultat corrigé des éléments sans effet sur la trésorerie et des variations du besoin en fonds de roulement.", read: "Proche du résultat net ou au-dessus : les bénéfices se transforment bien en argent.", limit: "Varie avec les délais de paiement des clients et des fournisseurs." },
  fcf: { name: "Flux de trésorerie disponible", ex: "L'activité rapporte 500 M€ d'argent, les nouvelles usines en coûtent 300 M€ : flux disponible de 200 M€.", what: "L'argent réellement généré après les investissements.", calc: "Flux de trésorerie d'exploitation − investissements corporels et incorporels.", read: "Positif plusieurs années de suite : l'entreprise finance seule son développement et son dividende.", limit: "Un gros investissement ponctuel peut le rendre négatif une année." },
};
const PTERMS = {
  gain: { name: "Gain ou perte", what: "Valeur finale − total versé, plus les dividendes encaissés.", read: "Le chiffre le plus concret : combien d'euros ont été gagnés ou perdus." },
  annu: { name: "Rendement annualisé", what: "Le rendement moyen par an, intérêts composés compris.", calc: "(valeur finale ÷ valeur initiale)^(1 ÷ nombre d'années) − 1", read: "Permet de comparer des placements sur des durées différentes." },
  tri: { name: "Rendement selon vos versements (TRI)", what: "Le rendement annuel réellement obtenu, en tenant compte du montant et de la date de chaque versement.", read: "C'est la mesure qui correspond à l'expérience de l'investisseur." },
  twr: { name: "Rendement des placements", what: "La performance des placements eux-mêmes, sans l'effet des dates de versement.", read: "C'est la mesure utilisée par les fonds et les indices, pour comparer un portefeuille à un indice." },
  dd: { name: "Perte maximale", what: "La plus forte baisse entre un sommet et le creux qui a suivi.", calc: "plus petite valeur de (valeur ÷ plus haut atteint avant − 1)", read: "Ce qu'il fallait supporter sans vendre." },
  rec: { name: "Temps de récupération", what: "Le temps pour revenir au sommet après la perte maximale.", read: "Il peut durer plusieurs années." },
  vol: { name: "Volatilité", what: "L'ampleur des variations habituelles, ramenée à un an.", calc: "écart-type des rendements mensuels × √12", read: "Plus elle est élevée, plus le parcours est agité." },
  frais: { name: "Frais", what: "Les frais de courtage à chaque ordre et les frais annuels des fonds.", read: "Ils réduisent le rendement chaque année, et l'écart grandit avec le temps." },
  rep: { name: "Répartition", what: "Le poids de chaque secteur et de la plus grosse ligne.", read: "Montre si le portefeuille dépend d'un seul secteur ou d'une seule action." },
};
const BASES = {
  action: { name: "Action", what: "Une part du capital d'une entreprise. L'actionnaire possède une petite partie de l'entreprise et peut recevoir une part de ses bénéfices sous forme de dividende." },
  fonds: { name: "Fonds indiciel (ETF)", what: "Un fonds coté qui reproduit un indice, par exemple les 40 plus grandes entreprises françaises. Une seule ligne donne accès à des dizaines ou des centaines d'entreprises." },
  indice: { name: "Indice", what: "Un panier d'entreprises qui sert de référence pour mesurer l'évolution d'un marché, comme le CAC 40 ou le MSCI World." },
  pea: { name: "PEA", what: "Le plan d'épargne en actions : une enveloppe réservée aux actions européennes et à certains fonds. Versements limités à 150 000 €. Après 5 ans, les gains ne paient plus d'impôt sur le revenu, seulement les prélèvements sociaux." },
  cto: { name: "Compte-titres", what: "Un compte sans limite de montant ni de pays. Les dividendes et les plus-values sont imposés l'année où ils sont perçus ou réalisés." },
  esef: { name: "Rapport annuel ESEF", what: "Le format électronique obligatoire des comptes annuels des sociétés cotées en Europe depuis 2021. Chaque chiffre y porte une étiquette standard, ce qui permet de le lire automatiquement." },
  amf: { name: "Information réglementée (AMF)", what: "Les documents que les sociétés cotées doivent publier : résultats, rapports annuels, assemblées, opérations sur le capital. Ils sont déposés auprès de l'Autorité des marchés financiers et publiés sur info-financiere.gouv.fr." },
  mediane: { name: "Médiane du secteur", what: "La valeur du milieu parmi les entreprises suivies du même secteur : la moitié fait mieux, l'autre moitié moins bien.", read: "Sert de repère. Elle dépend des entreprises suivies par le site." },
};
const ALL = { ...TERMS, ...PTERMS, ...BASES };
const def = (key, label) => `<button type="button" class="def" data-def="${key}">${esc(label || ALL[key].name)}</button>`;
const pop = document.getElementById("pop");
let popFor = null;
function openDef(btn) {
  const t = ALL[btn.dataset.def]; if (!t) return;
  pop.innerHTML = `<button class="x" type="button" aria-label="Fermer">×</button><h4>${esc(t.name)}</h4><p>${esc(t.what)}</p>
    ${t.calc ? `<p><span class="k">Calcul :</span> ${esc(t.calc)}</p>` : ""}${t.read ? `<p><span class="k">Comment le lire :</span> ${esc(t.read)}</p>` : ""}${t.limit ? `<p><span class="k">Limite :</span> ${esc(t.limit)}</p>` : ""}
    <p><a href="/lexique#${btn.dataset.def}">Voir dans le lexique</a></p>`;
  pop.classList.add("open"); popFor = btn;
  if (innerWidth > 760) {
    const r = btn.getBoundingClientRect(), w = pop.offsetWidth;
    pop.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left + scrollX)) + "px";
    pop.style.top = (r.bottom + scrollY + 6) + "px";
  }
  pop.focus({ preventScroll: true });
}
function closeDef() { pop.classList.remove("open"); popFor = null; }
document.addEventListener("click", e => {
  const b = e.target.closest(".def");
  if (b) { e.preventDefault(); if (popFor === b) closeDef(); else openDef(b); return; }
  if (e.target.closest("#pop .x") || (!e.target.closest("#pop") && pop.classList.contains("open"))) closeDef();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closeDef(); });

/* ---------- Modules de cours TradingView (gratuits, avec mention de la source) ---------- */

/* ---------- Graphiques des simulateurs ---------- */
/* ---------- Pièces communes ---------- */
const app = $("#app");
function setTitle(t) { document.title = t ? `${t} · ${SITE}` : SITE; }
function agendaHTML(list, showCo = true) {
  if (!list.length) return `<div class="empty">Aucune date renseignée pour l'instant.</div>`;
  return `<div class="ag">${list.map(e => { const [y, m, d] = e.date.split("-"); const c = RBY[e.id]; return `<div class="it"><div class="d"><b>${+d}</b>${MOIS[+m - 1]} ${y.slice(2)}</div><div>
    ${showCo && c ? `<a class="co" href="/entreprise/${c.id}">${esc(c.name)}</a>` : ""}<div class="ev">${esc(e.label)}</div></div></div>`; }).join("")}</div>`;
}
/* ---------- Actualité : publications officielles classées et expliquées ---------- */
// Publications de l'AMF (France), dédoublonnées FR/EN, au format commun
const DAYKEY_F = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }), DAYKEY_M = new Map(); // 1/11 : un seul formateur (en créer un par appel coûtait 0,6 s à l'accueil)
const dayKey = iso => { let k = DAYKEY_M.get(iso); if (k === undefined) { const d = new Date(iso); k = isNaN(d) ? "" : DAYKEY_F.format(d); DAYKEY_M.set(iso, k); } return k; };
function dayLabel(iso) {
  const k = dayKey(iso), now = new Date();
  if (k === dayKey(now.toISOString())) return "Aujourd'hui";
  if (k === dayKey(new Date(now - 864e5).toISOString())) return "Hier";
  const d = new Date(iso); return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" }).format(d).replace(/^./, c => c.toUpperCase());
}
const hhmm = iso => { const d = new Date(iso); return isNaN(d) || !/T\d/.test(iso) ? "" : new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(d); };
let ANA = null, ANAP = null;
const loadAna = () => ANAP || (ANAP = fetch("/data/actu-analyse.json").then(r => r.json()).then(j => { ANA = j.items || {}; }).catch(() => { ANA = {}; }));
// Bloc réutilisable : charge, filtre, affiche
/* ---------- Logos et cartes d'entreprise ---------- */
const initials = n => n.replace(/[^A-Za-zÀ-ÿ' -]/g, "").split(/[\s-]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
let AVERIF = {}; // id → { ca: [années], marge: [années], equity: [années] } : chiffres à vérifier (5e passage, A8)
const AVERIF_LIB = { ca: "ventes", marge: "marge d'exploitation", equity: "fonds propres" }, AVERIF_ROWS = { ca: ["ca", "g", "g1"], marge: ["marge", "ebit", "ebitm"], equity: ["equity", "roe"] };
let LOGO_ABS = new Set(), LOGOS = {}; // LOGOS : logos hébergés par le site (cf/site/logos, collectés sur Wikimedia Commons avec leur licence par data/logos_fetch.mjs)
const LOGO_TEINTES = { tech: 215, finance: 150, sante: 350, conso: 25, industrie: 205, materiaux: 40, telecom: 265, immo: 95, energie: 10, services: 180 }; // 5e passage : une teinte par secteur pour la pastille à l'initiale
function logoTeinte(n, sect) { if (sect && LOGO_TEINTES[sect] != null) return LOGO_TEINTES[sect]; let h = 0; for (const ch of String(n || "")) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; } // couleur du secteur, sinon déterministe à partir du nom
function logo(c, size = 40) { // logo hébergé par le site ; sinon un rond coloré (couleur fixée par le nom) avec l'initiale. Plus aucune requête vers Google ou gstatic (3e passage, 1.5)
  // 4e passage (31/10, 2.2) : logo hébergé par le site (Commons ou site officiel, collecté par le robot), sinon le rond coloré avec l'initiale. Aucune requête externe.
  const l = c && c.id && LOGOS[c.id] && LOGOS[c.id].f ? `/logos/${LOGOS[c.id].f}` : null, sz = Math.max(size, 24);
  return `<span class="lg${l ? "" : " lg-ini"}" style="--s:${sz}px;--lgh:${logoTeinte(c.name, c.sector)}"><b>${esc(initials(c.name))}</b>${l ? `<img src="${l}" alt="" loading="lazy" width="${sz}" height="${sz}" onerror="this.parentNode.classList.add('lg-ini');this.remove()">` : ""}</span>`;
}
function caLine(c) {
  if (c.missing) return `<span class="light">${missingTxt(c)}</span>`;
  const t = quick(c);
  return `<span class="light">${c.ca != null ? `Ventes ${c.year} : <b class="num" style="color:var(--ink)">${big(c.ca, c.currency)}</b>` : `Exercice ${c.year ?? "–"}`}</span>${t ? pills(t) : ""}`;
}
function missingTxt(c, long) { // pourquoi les comptes manquent
  if ((c.isin || "").startsWith("DE")) return long ? "Les sociétés allemandes déposent leurs comptes au registre fédéral allemand, qui ne propose pas de base ouverte réutilisable : leurs chiffres ne peuvent pas être affichés ici pour l'instant. La fiche et le cours restent disponibles." : "Comptes non disponibles en données ouvertes";
  if (c.region === "MONDE" && !c.sec) return long ? `Le site n'a pas les comptes officiels de ${esc(c.name)} : sa place de cotation ne les publie pas dans un format ouvert que le site sait lire (le site lit les dépôts européens ESEF et américains SEC). Le cours, l'actualité et le métier restent disponibles.` : "Comptes non disponibles en données ouvertes";
  return long ? `Les comptes de ${esc(c.name)} sont en cours de collecte. Ils apparaîtront après la prochaine mise à jour.` : "Comptes en cours de collecte";
}
const pills = t => `<span class="pills" title="${esc(tallyTxt(t))}"><span class="f"><i></i>${t.fort}</span><span class="m"><i></i>${t.moyen}</span><span class="v"><i></i>${t.vig}</span></span>`;
function coCard(c) {
  return `<a class="cocard" href="/entreprise/${c.id}"><div class="top">${logo(c, 44)}<div><div class="nm">${esc(c.name)}</div><div class="sec">${esc(regName(c))} · ${esc(secName(c))}</div></div></div>
    <div class="d">${esc(c.desc || "")}</div><div class="f">${caLine(c)}</div></a>`;
}
const LEGEND = `<div class="dleg"><span class="f"><i></i>Points forts</span><span class="m"><i></i>Dans la moyenne</span><span class="v"><i></i>Points de vigilance</span><span class="light">Nombre de repères de chaque couleur dans les comptes de l'entreprise.</span></div>`;

/* ---------- Petits graphiques (SVG et barres HTML) ---------- */
// Barres verticales par année, avec ligne de repère facultative (médiane du secteur)
// Barres horizontales : une ligne par élément (classements, comparaisons, répartitions)
// Barre empilée à 100 % avec légende (répartition du chiffre d'affaires)

/* ---------- « Comprendre » : une explication détaillée par idée, avec les chiffres de l'entreprise ---------- */
let SEGFR = {}, REP = {};
/* ---------- ETF ---------- */
let ETF = { list: [] }, ETFBY = {};
const ISSUERDOM = { Amundi: "amundi.com", iShares: "ishares.com", Vanguard: "vanguard.com", "BNP Paribas": "bnpparibas.com", "BNP Paribas Easy": "bnpparibas.com", Xtrackers: "xtrackers.com", SPDR: "ssga.com", Invesco: "invesco.com", Lyxor: "amundi.com" };
const issuerDom = e => e.domain || ISSUERDOM[e.issuer] || ISSUERDOM[Object.keys(ISSUERDOM).find(k => (e.issuer || "").startsWith(k))] || "";
const ECAT = { "actions-monde": "Monde", "actions-usa": "États-Unis", "actions-europe": "Europe", "actions-france": "France", "actions-emergents": "Pays émergents", "actions-asie": "Asie", theme: "Thématiques", dividendes: "Dividendes", facteurs: "Facteurs", immobilier: "Immobilier", obligations: "Obligations", monetaire: "Monétaire", matieres: "Matières premières" };
const COUNTRY = { US: "États-Unis", JP: "Japon", GB: "Royaume-Uni", FR: "France", CA: "Canada", DE: "Allemagne", CH: "Suisse", NL: "Pays-Bas", AU: "Australie", TW: "Taïwan", CN: "Chine", IN: "Inde", KR: "Corée du Sud", IT: "Italie", ES: "Espagne", SE: "Suède", DK: "Danemark", IE: "Irlande", BR: "Brésil", HK: "Hong Kong", SG: "Singapour", BE: "Belgique", FI: "Finlande", NO: "Norvège", ZA: "Afrique du Sud", SA: "Arabie saoudite", MX: "Mexique", IL: "Israël", AT: "Autriche", PT: "Portugal", LU: "Luxembourg", JE: "Jersey", BM: "Bermudes", KY: "Îles Caïmans" };
// pageEtfs : m/etfs4.js (liste des ETF v4, 3/11/2026)
const ISINBY = {};
// pageEtf : m/etf4.js (fiche ETF v4, 3/11/2026)

/* ---------- Presse (GDELT) : articles récents, lien vers l'éditeur ---------- */

/* ---------- Avis des visiteurs sur une entreprise ou un ETF ---------- */

/* ---------- Communauté : mentions cliquables d'entreprises et d'ETF ---------- */
// [[c:lvmh]] -> lien vers la fiche ; [[e:id]] -> lien vers l'ETF
// Suggestions pendant la frappe : les derniers mots tapés sont comparés aux noms d'entreprises et d'ETF
// pageActus : m/actu4.js

/* ---------- Graphique de cours : jour, semaine, mois, 3 mois, an, 5 ans, tout ---------- */

/* ---------- Accueil ---------- */
/* ---------- Liste des entreprises ---------- */
// Taille approximative en euros, seulement pour trier (taux arrondis)
const FXE = { EUR: 1, USD: 0.92, GBP: 1.17, SEK: 0.087, DKK: 0.134, NOK: 0.085, CHF: 1.05, JPY: 0.0061, PLN: 0.23, CAD: 0.67, INR: 0.011, BRL: 0.17, TWD: 0.029, CNY: 0.13, HKD: 0.12, AUD: 0.6, MXN: 0.05, KRW: 0.00068 };
const caEur = c => c.ca > 0 ? c.ca * (FXE[c.currency] ?? 0) : 0;
let listState = { region: "all", sector: "all", view: "cartes", sort: "name", dir: 1 };
document.addEventListener("click", e => {
  if (e.target.closest("a,button,.def,input,select")) return;
  const tr = e.target.closest("tr[data-id],tr[data-href]");
  if (tr) go(tr.dataset.href || "/entreprise/" + tr.dataset.id);
});

/* ---------- Fiche entreprise ---------- */
function pageComprendre(id) { app.innerHTML = `<div class="empty">Chargement…</div>`; } // 4/11 : /comprendre renvoie vers la fiche v4 (m/fiche-commun.js)
function pageCompany(id) { app.innerHTML = `<div class="empty">Chargement de la fiche…</div>`; } // 4/11 : la fiche est construite par m/fiche4.js (window.pageCompany)
const at = (c, k, i) => c.fin[k] ? c.fin[k][i] : null;
const acc = (summary, body, open = false, cls = "") => `<details class="acc ${cls}"${open ? " open" : ""}><summary>${summary}<span class="chev" aria-hidden="true"></span></summary><div class="accb">${body}</div></details>`;

/* Ce que fait l'entreprise : trois cartes, avec la répartition des ventes et des liens pour approfondir */
function feu(t) { // les trois couleurs, avec leur nombre et une barre de proportion
  const n = t.fort + t.moyen + t.vig || 1;
  return `<div class="feu"><div class="feun"><span class="f"><i></i><b>${t.fort}</b> point${t.fort > 1 ? "s" : ""} fort${t.fort > 1 ? "s" : ""}</span><span class="m"><i></i><b>${t.moyen}</b> dans la moyenne</span><span class="v"><i></i><b>${t.vig}</b> point${t.vig > 1 ? "s" : ""} de vigilance</span></div>
    <div class="feub"><span class="f" style="width:${t.fort / n * 100}%"></span><span class="m" style="width:${t.moyen / n * 100}%"></span><span class="v" style="width:${t.vig / n * 100}%"></span></div></div>`;
}
/* Ses comptes en questions : une ligne simple par question, le détail en dépliant « Approfondir » */
/* Le dividende, expliqué */
function officielLink(s) {
  if (s.region === "US" || s.sec) return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(s.sec || s.ticker)}&type=&dateb=&owner=include&count=40`;
  return s.domain ? "https://www." + s.domain : "";
}
/* ---------- Fiche entreprise : un parcours en étapes, dans l'ordre où un débutant se pose les questions ---------- */

/* ---------- Actualité et agenda ---------- */

/* ---------- Lexique : la page est construite par m/lexique4.js (3/11/2026) ; ESSENTIEL, WITH, EXM, EXFMT servent encore ---------- */
const ESSENTIEL = ["action", "pea", "ca", "croissance", "marge", "net", "lev", "fcf", "payout", "per"];
const WITH = { // à lire avec
  croissance: ["marge", "fcf"], marge: ["croissance", "net"], net: ["marge", "fcf"], roe: ["lev", "gear"], lev: ["roe", "fcf"], gear: ["roe", "lev"],
  fcf: ["net", "croissance"], payout: ["fcf", "net"], per: ["croissance", "net"], rdt: ["payout", "per"], dettenette: ["lev", "gear"],
};
const EXM = { croissance: "g1", marge: "marge", net: "nm", roe: "roe", lev: "lev", gear: "gear", fcf: "conv", payout: "payout" };
const EXFMT = { g1: v => pct(v), marge: v => pct(v, 1, false), nm: v => pct(v, 1, false) + " de marge nette", roe: v => pct(v, 1, false), lev: v => F1.format(v) + " an" + (v >= 2 ? "s" : ""), gear: v => pct(v, 0, false), conv: v => F0.format(v * 100) + " € pour 100 € de bénéfice", payout: v => pct(v, 0, false) };

/* ---------- Courtiers ---------- */
let BROKERS = { list: [], sources: [] };

/* ---------- Simulateurs ---------- */
const v = id => { const x = parseFloat(String($("#" + id).value).replace(",", ".")); return isFinite(x) ? x : 0; };
const chips = (id, list, cur) => `<div class="chips" id="${id}">${list.map(([v, l]) => `<button type="button" data-v="${v}" class="${String(v) === String(cur) ? "on" : ""}">${l}</button>`).join("")}</div>`;


/* ---------- Portefeuille : opérations saisies, frais du courtier calculés ---------- */

function pageNotFound() { setTitle("Page introuvable"); setNav(""); app.innerHTML = `<h1 class="pagetitle">Page introuvable</h1><p class="pagesub"><a class="lnk" href="/">Retour à l'accueil</a></p>`; }

/* ---------- Navigation ---------- */
/* ---------- Favoris : entreprises et ETF suivis, gardés sur l'appareil (sans compte) ---------- */
const FKEY = "bilan.favoris"; let FAVMEM = [];
function favs() { try { const x = JSON.parse(localStorage.getItem(FKEY) || "null"); if (Array.isArray(x)) return x; } catch (e) { } return FAVMEM; }
function setFavs(a) { FAVMEM = a; try { localStorage.setItem(FKEY, JSON.stringify(a)); } catch (e) { } favCount(); if (typeof pushDonnees === "function") pushDonnees(); }
const isFav = k => favs().includes(k);
const favLbl = k => isFav(k) ? "★ Dans vos favoris" : "☆ Ajouter aux favoris";
const favBtn = k => `<button type="button" class="favbtn${isFav(k) ? " on" : ""}" data-fav="${k}" aria-pressed="${isFav(k)}">${favLbl(k)}</button>`;
function favCount() { const n = favs().filter(k => k.startsWith("c:") ? RBY[k.slice(2)] : ETFBY[k.slice(2)]).length; $$(".favn").forEach(el => el.textContent = n ? String(n) : ""); }
document.addEventListener("click", ev => {
  const b = ev.target.closest("[data-fav]"); if (!b) return;
  const k = b.dataset.fav, a = favs().slice(), i = a.indexOf(k);
  if (i >= 0) a.splice(i, 1); else { a.unshift(k); try { navigator.sendBeacon && navigator.sendBeacon("/api/compteur?e=suivre"); } catch (e) { } } // tunnel (E4) : compteur anonyme
  setFavs(a);
  $$(`[data-fav="${k}"]`).forEach(x => { x.classList.toggle("on", isFav(k)); x.setAttribute("aria-pressed", isFav(k)); x.textContent = favLbl(k); });
  if (location.pathname === "/favoris" && b.closest(".favlist")) pageFavoris();
});

/* ---------- Concurrents directs et comparateur ---------- */
let CONC = {}, PXP = Promise.resolve();
function peersOf(s, n = 4) {
  const hand = (CONC[s.id] || []).map(id => RBY[id]).filter(Boolean);
  if (hand.length >= 2) return { list: hand.slice(0, n), auto: false };
  const size = caEur(s) || 1, same = R.companies.filter(x => x.id !== s.id && x.sector === s.sector && !x.missing && x.ca > 0 && !hand.includes(x));
  const auto = same.sort((a, b) => Math.abs(Math.log((caEur(a) || 1) / size)) - Math.abs(Math.log((caEur(b) || 1) / size))).slice(0, n - hand.length);
  return { list: [...hand, ...auto], auto: !hand.length };
}
// pageComparer : définie dans m/comparer4.js (3/11/2026).

/* ---------- PEA, compte-titres, assurance-vie : où acheter des actions ---------- */
const EEA = new Set(["FR", "DE", "NL", "BE", "LU", "IT", "ES", "PT", "IE", "AT", "FI", "SE", "DK", "NO", "IS", "LI", "PL", "CZ", "GR", "HU", "SK", "SI", "EE", "LV", "LT", "MT", "CY", "HR", "BG", "RO"]);
// Règle complète (siège UE/EEE et impôt sur les sociétés, foncières exonérées exclues) : recoPeaOk dans m/reco.js
const peaOk = c => typeof recoPeaOk === "function" ? recoPeaOk(c) : c.isin ? EEA.has(c.isin.slice(0, 2)) : null;

/* =====================================================================
   Refonte v2 : graphiques, cours, l'essentiel, dividende, prix, synthèses
   ===================================================================== */

/* ---------- Infobulles des graphiques (une seule, partagée) ---------- */
const CTIP = document.createElement("div"); CTIP.className = "ctip"; document.body.appendChild(CTIP);
function tipShow(el, x, y) {
  let d; try { d = JSON.parse(el.getAttribute("data-tip")); } catch (e) { return; }
  CTIP.textContent = "";
  const h = document.createElement("div"); h.className = "h"; h.textContent = d.h || ""; CTIP.appendChild(h);
  (d.r || []).forEach(([name, val, col]) => {
    const r = document.createElement("div"); r.className = "r";
    const sp = document.createElement("span"); if (col) { const i = document.createElement("i"); i.style.background = col; sp.appendChild(i); }
    sp.appendChild(document.createTextNode(name)); const b = document.createElement("b"); b.textContent = val;
    r.append(sp, b); CTIP.appendChild(r);
  });
  if (d.n) { const n = document.createElement("div"); n.style.cssText = "margin-top:4px;color:var(--light);font-size:11.5px"; n.textContent = d.n; CTIP.appendChild(n); }
  CTIP.style.display = "block";
  const w = CTIP.offsetWidth, hh = CTIP.offsetHeight;
  CTIP.style.left = Math.min(innerWidth - w - 8, Math.max(8, x + 14)) + "px";
  CTIP.style.top = Math.max(8, y - hh - 12) + "px";
}
document.addEventListener("pointermove", e => { const el = e.target.closest && e.target.closest("[data-tip]"); if (el) tipShow(el, e.clientX, e.clientY); else CTIP.style.display = "none"; });
document.addEventListener("focusin", e => { const el = e.target.closest && e.target.closest("[data-tip]"); if (el) { const r = el.getBoundingClientRect(); tipShow(el, r.left + r.width / 2, r.top); } });
document.addEventListener("focusout", () => { CTIP.style.display = "none"; });
const tipAttr = o => `data-tip="${esc(JSON.stringify(o))}"`;

/* ---------- Échelles « rondes » ---------- */
function niceTicks(min, max, n = 4) {
  if (min === max) { max = min + 1; }
  const span = max - min, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0))), f = step0 / mag;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, t = [];
  for (let v = lo; v <= hi + step / 2; v += step) t.push(+v.toFixed(10));
  return t;
}
const INK = "#111214", SAND = "#B9AE97", GREENC = "#0E6B4A", ORANGEC = "#D94F2B", GRIDC = "#ECE6DA", AXC = "#8A857D";

/* Colonnes par année : une ou deux séries, axe gradué, repère facultatif (médiane du secteur), infobulle par année */
/* Courbes (pourcentages au fil des années, comparaison à une référence) */
// Ancienne fonction gardée pour les appels existants : redirige vers le nouveau graphique
const compact = cur => v => { const a = Math.abs(v), s = CUR[cur] || cur || "", d1 = x => F1.format(x).replace(/,0$/, ""); return a >= 1000 ? d1(v / 1000) + " Md" + (s ? " " + s : "") : F0.format(v) + " M" + (s ? " " + s : ""); };

/* ---------- Cours de Bourse (feuille Google publiée) et taux de change (BCE) ---------- */
let PX = {}, PXUP = null, FX = null;
async function loadPrices() {
  if (PXUP) return;
  const fxP = fetch("/data/fx.json").then(r => r.json()).then(j => { window.FXDATE = j.updated; return j.eur; }).catch(() => null); // 1/11 : en parallèle des cours (un aller-retour de moins)
  // 5/11 : fichier du robot demandé en parallèle ; il complète les titres absents de la copie de la feuille ou sans prix
  // (cours Eulerpool, valeurs liquidatives des ETF : la copie gardée par le Worker peut dater de la veille)
  const robP = fetch("/data/cours.json").then(r => r.ok ? r.json() : null).catch(() => null);
  try { const r = await fetch("/api/cours"); if (r.ok) { const j = await r.json(); PX = j.items || {}; PXUP = j.updated; } } catch (e) { }
  const rob = await robP;
  if (rob && rob.items) { if (!PXUP) { PX = rob.items; PXUP = rob.updated; } else for (const [k, v] of Object.entries(rob.items)) { const it = PX[k]; if (!it || (!(it.p > 0) && v.p > 0) || ((v.ep || v.vl) && v.d && (!it.d || v.d > it.d))) PX[k] = it || !rob.updated || v.vl || v.ep ? v : { ...v, d: rob.updated }; else for (const f of ["cur", "cap", "chg", "h52", "l52", "p1y", "p3y", "p5y", "dp"]) if (it[f] == null && v[f] != null && (f !== "cur" || (it.p > 0 && v.p > 0 && Math.abs(it.p / v.p - 1) < 0.3)) && (f !== "cap" && f !== "chg" || it.cur === v.cur)) it[f] = v[f]; } } // 7/11 : la copie du Worker peut venir d'une feuille recalculée en partie (cours sans devise) : le fichier du robot complète
  if (!PXUP) PXUP = "none";
  FX = await fxP;
  computePE();
}
const toEur = (v, cur) => v == null || !cur ? null : v * ((FX && FX[cur]) || FXE[cur] || (cur === "EUR" ? 1 : NaN));
const pxOf = c => PX["c:" + c.id] || null;
const pxEtf = e => PX["e:" + e.id] || null;
function valo(c) { // capitalisation, PER, rendement, à partir du cours et des derniers comptes
  const p = pxOf(c); if (!p) return null;
  let capE = p.cap ? toEur(p.cap, p.cur) : null; const netE = c.net != null ? toEur(c.net * 1e6, c.currency) : null;
  let pe = capE && netE > 0 ? capE / netE : null, sain = true;
  if (pe == null && c.eps > 0 && p.cur === c.currency) pe = p.p / c.eps;
  // Garde-fou : devise des comptes mal lue ou capitalisation erronée dans la source des cours.
  // Si le PER tiré de la capitalisation est invraisemblable, on le recalcule avec le cours et le bénéfice par action.
  // 2/11 : cours et comptes dans deux devises (Hong Kong, certificats américains) : les deux ramenés en euros ; la capitalisation publiée n'est
  // garde-fou ne mélange plus les devises (Banco Santander-Chile ressortait plus grosse qu'Apple).
  const meme = p.cur === c.currency, peE = c.eps > 0 && p.p > 0 ? (meme ? p.p / c.eps : (() => { const a = toEur(p.p, p.cur), e = toEur(c.eps, c.currency); return a > 0 && e > 0 && isFinite(a / e) ? a / e : null; })()) : null;
  if (peE != null && peE >= 3 && peE <= 150 && (pe == null || pe < 3 || pe > 150)) { pe = peE; sain = false; if (c.net > 0) capE = toEur(p.p * c.net * 1e6 / c.eps, p.cur); }
  let yld = null;
  if (sain && c.divPaid > 0.5 && capE) yld = toEur(c.divPaid * 1e6, c.currency) / capE;
  if ((yld == null || yld > 0.15) && c.dps > 0 && (p.cur === c.currency || !sain)) yld = c.dps / p.p;
  if (yld != null && (yld > 0.25 || yld < 0)) yld = null;
  if (pe != null && (pe > 500 || pe < 2)) pe = null;
  // 3e passage (30/10), 1.3 : un PER au-delà de 100 (bénéfice quasi nul) n'est pas significatif : il ne compte ni dans le verdict,
  // ni dans les jauges, ni dans les médianes ; les écrans l'affichent « n.s. » avec la valeur brute en bulle (peBrut).
  const peNs = pe != null && pe > 100, peBrut = pe;
  if (peNs) pe = null;
  return { p, capE, pe, yld, peNs, peBrut };
}
const NS_PE = "Bénéfice trop faible cette année pour comparer le prix (PER non significatif)", NS_PAYOUT = "Le dividende versé dépasse le bénéfice de l'année : il est pris sur la trésorerie ou les réserves", NS_CROIS = "Base de comparaison trop faible pour une variation significative";
const nsPayout = x => x != null && x > 1.5, nsCrois = x => x != null && Math.abs(x) > 2; // part du bénéfice versée > 150 %, variation > ±200 %
let MEDPE = {};
const pxFmt = (v, cur) => v == null ? "–" : nf(v >= 1000 ? 0 : 2).format(v) + " " + (CUR[cur] || cur || "");
const capFmt = v => v == null ? "–" : v >= 1e12 ? F1.format(v / 1e12) + " 000 Md€".replace(" 000 Md€", " billions d'€") : v >= 1e9 ? F1.format(v / 1e9) + " Md€" : F0.format(v / 1e6) + " M€";

/* ---------- Mots simples pour les tendances ---------- */
const sgn = (v, d = 0) => (v > 0 ? "+" : v < 0 ? "−" : "") + nf(d).format(Math.abs(v * 100)) + " %";

/* ---------- L'essentiel : cinq faits, chacun avec son chiffre ---------- */
/* ---------- Synthèse d'une comparaison ---------- */
const listFr = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " et " + a.at(-1);

/* ---------- Dividende, refait ---------- */

/* ---------- Prix de l'action, calculé automatiquement ---------- */
/* ---------- Questions fréquentes sur une entreprise (en bas de fiche) ---------- */

/* ---------- Calendrier des dividendes (avec export vers un agenda) ---------- */
function icsFile(events, name) {
  const d = x => x.replace(/-/g, ""), esc2 = t => String(t).replace(/[,;\\]/g, m => "\\" + m).replace(/\n/g, " ");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//bilan//calendrier//FR", "CALSCALE:GREGORIAN", "X-WR-CALNAME:" + esc2(name)];
  events.forEach((e, i) => { const co = RBY[e.id]; const next = new Date(e.date + "T00:00:00Z"); next.setUTCDate(next.getUTCDate() + 1);
    lines.push("BEGIN:VEVENT", `UID:${d(e.date)}-${e.id}-${i}@bilan`, `DTSTAMP:${d(TODAY)}T000000Z`, `DTSTART;VALUE=DATE:${d(e.date)}`, `DTEND;VALUE=DATE:${d(next.toISOString().slice(0, 10))}`, `SUMMARY:${esc2((co ? co.name : e.id) + " : " + e.label)}`, e.source ? `URL:${e.source}` : "", "END:VEVENT"); });
  lines.push("END:VCALENDAR");
  return new Blob([lines.filter(Boolean).join("\r\n")], { type: "text/calendar" });
}
// pageDividendes : m/dividendes4.js

/* ---------- Premiers pas : parcours en trois niveaux, avec quiz ---------- */

/* =====================================================================
   Communauté, Portefeuille et Outils : nouvelle version
   ===================================================================== */
const keyName = k => k.startsWith("c:") ? (RBY[k.slice(2)] || {}).name : (ETFBY[k.slice(2)] || {}).name;
const post = (path, body) => fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());

const ETFCOMP = {};
const titleCase = s => String(s).toLowerCase().replace(/(^|[\s.-])([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase()).replace(/\b(Inc|Corp|Corporation|Ltd|Plc|Sa|Se|Nv|Ag|Co)\b\.?/gi, m => m.toUpperCase() === "SA" || m.toUpperCase() === "SE" ? m.toUpperCase() : m);

/* ---------- Outils : la page est dans m/outils4.js ; ici, seulement le relais vers « Comparer deux ETF » ---------- */
function pageOutils(t) {
  setNav("sim");
  if (t === "recouvrement") return outilRecouvrement();
  goR("/outils");
}
function bindPicker(id, onPick, etfOnly = false) {
  const q = $("#" + id), box = q.nextElementSibling;
  q.oninput = () => { const t = norm(q.value.trim()); if (t.length < 2) { box.hidden = true; return; }
    const hits = [...ETF.list.filter(e => norm(e.name + " " + e.index).includes(t)).map(e => ["e:" + e.id, e.name, "ETF"]), ...(etfOnly ? [] : R.companies.filter(c => norm(c.name + " " + c.ticker).includes(t)).map(c => ["c:" + c.id, c.name, secName(c)]))].slice(0, 8);
    box.innerHTML = hits.map(([k, n, s]) => `<button type="button" data-k="${k}">${esc(n)} <small>${esc(s)}</small></button>`).join(""); box.hidden = !hits.length;
    $$("button", box).forEach(b => b.onclick = () => { q.value = keyName(b.dataset.k); box.hidden = true; onPick(b.dataset.k); }); };
}


/* ---------- Vérifier un site, une appli ou une offre (listes noires de l'AMF) ---------- */

/* ---------- Opérations des dirigeants (sociétés américaines) ---------- */
/* =====================================================================
   Lot v5 : indices, plus forts mouvements, médianes, comparaison en euros,
   résumés IA des annonces, favoris et bilan de liste, portefeuille avec PRU et garde-fous
   ===================================================================== */
ALL.mediane = { name: "Médiane du secteur", what: "La valeur du milieu : si l'on range les entreprises d'un secteur de la moins bonne à la meilleure, la moitié fait mieux que la médiane et la moitié fait moins bien.", ex: "Cinq entreprises ont des marges de 4 %, 8 %, 10 %, 12 % et 60 %. La médiane est de 10 % : c'est l'entreprise du milieu. La moyenne serait de 19 %, tirée vers le haut par une seule entreprise exceptionnelle.", read: "Au-dessus de la médiane : l'entreprise fait mieux que la moitié de son secteur. Nettement au-dessus (plus d'un quart d'écart) : c'est un point fort. En dessous : moins bien que la moitié de ses concurrentes.", limit: "Elle compare à des entreprises du même grand secteur, qui n'ont pas toujours exactement le même métier : une marge de logiciel et une marge de matériel informatique ne se lisent pas pareil." };
const medBtn = (label = "médiane") => `<button type="button" class="def linkbtn" data-def="mediane">${label}</button>`;
const MED_NOTE = `<div class="mednote"><b>Comment lire la médiane ?</b> C'est l'entreprise « du milieu » de son secteur : la moitié fait mieux, la moitié moins bien. Elle sert de repère : nettement au-dessus, c'est un point fort ; nettement en dessous, un point à surveiller. Contrairement à la moyenne, elle n'est pas faussée par un ou deux géants. ${medBtn("En savoir plus")}</div>`;

/* ---------- Indices : pastilles maison (drapeaux dessinés) ---------- */
const FLAG = {
  FR: `<svg viewBox="0 0 30 20"><rect width="10" height="20" fill="#1F3A93"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#D9353B"/></svg>`,
  DE: `<svg viewBox="0 0 30 20"><rect width="30" height="7" fill="#111"/><rect y="7" width="30" height="6" fill="#D9353B"/><rect y="13" width="30" height="7" fill="#F2C230"/></svg>`,
  US: `<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/>${[0, 2, 4, 6, 8, 10].map(i => `<rect y="${i * 1.54 * 1.08}" width="30" height="1.6" fill="#C8352E"/>`).join("")}<rect width="13" height="10.8" fill="#24356F"/></svg>`,
  EU: `<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#1F3A93"/>${Array.from({ length: 12 }, (_, i) => `<circle cx="${15 + 6 * Math.cos(i * Math.PI / 6)}" cy="${10 + 6 * Math.sin(i * Math.PI / 6)}" r="0.9" fill="#F2C230"/>`).join("")}</svg>`,
  GB: `<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#24356F"/><path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M15 0V20M0 10H30" stroke="#fff" stroke-width="6"/><path d="M15 0V20M0 10H30" stroke="#C8352E" stroke-width="3"/></svg>`,
  JP: `<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="5.5" fill="#C8352E"/></svg>`,
};
const INDEX_INFO = [
  ["cac40", "CAC 40", "FR", "Les 40 plus grandes sociétés françaises cotées à Paris."],
  ["stoxx50", "Euro Stoxx 50", "EU", "Les 50 plus grandes entreprises de la zone euro."],
  ["dax", "DAX", "DE", "Les 40 plus grandes entreprises allemandes."],
  ["sp500", "S&P 500", "US", "Les 500 plus grandes entreprises américaines : l'indice de référence mondial."],
  ["nasdaq100", "Nasdaq 100", "US", "Les 100 plus grandes entreprises non financières du Nasdaq, très orienté technologie."],
  ["ftse100", "FTSE 100", "GB", "Les 100 plus grandes entreprises cotées à Londres."],
  ["nikkei", "Nikkei 225", "JP", "Les 225 grandes entreprises japonaises de référence."],
];

/* ---------- Plus forts mouvements du jour ---------- */
function moversData(region = "all", n = 8) {
  const l = R.companies.map(c => ({ c, p: pxOf(c), v: valo(c) })).filter(x => x.p && x.p.chg != null && x.v && x.v.capE > 2e9 && (region === "all" || x.c.region === region));
  const up = l.filter(x => x.p.chg > 0).sort((a, b) => b.p.chg - a.p.chg).slice(0, n), dn = l.filter(x => x.p.chg < 0).sort((a, b) => a.p.chg - b.p.chg).slice(0, n);
  return { up, dn, n: l.length };
}
// pageMarches : m/marches4.js (Marchés v4, 3/11/2026)

/* ---------- Comparaison : montants convertis en euros ---------- */
const eurM = (v, cur) => { const e = toEur(v, cur); return e == null || !isFinite(e) ? null : e; }; // en millions

/* ---------- Mise en forme d'un texte rédigé (titres de paragraphes reconnus) ---------- */
function resumeHTML(txt) {
  const parts = String(txt).split(/\n+/).map(x => x.trim()).filter(Boolean);
  return parts.map(p => /^(« ?)?(Ce qui est annoncé|Ce que ça veut dire|À surveiller|En résumé|Ce qui a bougé|Ce qui a été annoncé|À venir|Ce que l'analyse remarque|Points d'attention)( ?»)?\s*:?$/i.test(p.replace(/[*#]/g, "")) ? `<p class="kick" style="margin:10px 0 2px">${esc(p.replace(/[*#«»:]/g, "").trim())}</p>` : `<p style="margin:0 0 6px">${esc(p.replace(/[*#]/g, "")).replace(/\[\[([^\]|]+)\|(\/[^\]]+)\]\]/g, (m0, t, h) => `<a class="lnk" href="${h}">${t}</a>`)}</p>`).join(""); // [[texte|/lien]] : lien interne dans une réponse calculée
}
/* ---------- Favoris : présentation soignée et bilan rédigé de la liste ---------- */
/* ---------- Portefeuille : quantités, prix de revient, plus-values et garde-fous ---------- */


/* ---------- Profil en 5 axes : où se situe l'entreprise dans son secteur (sans verdict) ---------- */
const RANK_M = new Map(); // 1/11 : valeurs du secteur calculées une fois par indicateur (avant : recalculées pour chaque entreprise, 2,3 s à l'accueil)
function rankIn(s, fn, higherBetter = true, cle = null) { // position de 0 (dernière) à 1 (première) parmi les entreprises du secteur
  const calc = () => R.companies.filter(c => c.sector === s.sector && !c.missing && !(isBank(c) !== isBank(s))).map(c => ({ id: c.id, v: fn(c) })).filter(x => okn(x.v));
  let l; if (cle) { const k = `${cle}|${s.sector}|${isBank(s)}|${PXUP || ""}|${R.companies.length}`; l = RANK_M.get(k); if (!l) { l = calc(); RANK_M.set(k, l); } } else l = calc();
  const me = l.find(x => x.id === s.id); if (!me || l.length < 5) return null;
  const better = l.filter(x => higherBetter ? x.v > me.v : x.v < me.v).length, eq = l.filter(x => x.v === me.v && x.id !== s.id).length; // ex æquo (sans dette, par exemple) : au milieu du groupe
  return { p: Math.max(0, Math.min(1, 1 - (better + eq / 2) / (l.length - 1))), n: l.length, rank: better + 1 };
}
/* ---------- Les cinq axes du profil : UNE seule source (4e passage, 31/10, lot A) ----------
   Chaque axe place l'entreprise parmi celles de son secteur (0 = dernière, 1 = première, au sens « mieux »).
   Le libellé de la jauge, le verdict en deux mots, les niveaux (point fort / à surveiller) et la phrase « mieux placée
   que X % » des sections en dérivent tous : ils ne peuvent plus se contredire. scripts/check-contradictions.mjs le vérifie. */
const AX_WORDS = { // 5e passage (A4) : les libellés des jauges ne répètent plus les mots du verdict (rentable, endettée, chère, bon marché) : le verdict se lit une fois, la jauge dit la place
  croissance: ["parmi les plus rapides", "plus rapide que la médiane", "dans la norme du secteur", "plus lente que la médiane", "parmi les plus lentes"],
  marge: ["parmi les meilleures", "au-dessus de la médiane", "dans la norme du secteur", "sous la médiane", "parmi les plus faibles"],
  solidite: ["parmi les plus solides", "plus solide que la médiane", "dans la norme du secteur", "moins solide que la médiane", "parmi les moins solides"],
  dividende: ["parmi les plus généreuses", "rendement au-dessus de la médiane", "rendement dans la norme", "rendement sous la médiane", "parmi les moins généreuses"],
  prix: ["PER parmi les plus bas", "PER plus bas que la médiane", "PER dans la norme du secteur", "PER plus haut que la médiane", "PER parmi les plus hauts"],
};
const axBand = p => p >= 0.75 ? 0 : p >= 0.55 ? 1 : p > 0.45 ? 2 : p > 0.25 ? 3 : 4; // 0 = en tête … 4 = en queue
const axWord = (p, k = "croissance") => (AX_WORDS[k] || AX_WORDS.croissance)[axBand(p)];
const axLevel = p => p >= 0.55 ? "fort" : p <= 0.25 ? "vig" : "moyen";
function rfAxes(s) { // [{ k, t (titre), d (ce qui est mesuré), r: { p, rank, n } | null, special }] ; les axes sans rang sont omis, sauf « Pas de dividende »
  if (!s || s.missing) return [];
  const bank = isBank(s), v = valo(s), sd = !bank && s.netDebt != null && s.netDebt < 0;
  const yld = v && v.yld != null ? v.yld : null, noDiv = ((s.dps === 0 || s.dps == null) && (s.divPaid == null || s.divPaid <= 0)) || (yld != null && yld < 0.001); // moins de 0,1 % : dividende symbolique, traité comme absent
  const A = [
    { k: "croissance", t: "Croissance", d: "Hausse des ventes sur un an", r: rankIn(s, c => ratios(c).g1, true, "g1") },
    { k: "marge", t: bank ? "Rentabilité" : "Marge", d: bank ? "Bénéfice rapporté aux capitaux propres" : "Ce qui reste sur 100 de ventes", r: bank ? rankIn(s, c => ratios(c).roe, true, "roe") : rankIn(s, c => ratios(c).marge, true, "marge") },
    { k: "solidite", t: "Solidité", d: "Dette nette rapportée au résultat (moins, c'est mieux)", r: bank ? null : rankIn(s, c => c.netDebt != null && c.netDebt < 0 ? -1 : ratios(c).lev, false, "lev"), special: sd ? "sansdette" : null },
    { k: "dividende", t: "Dividende", d: "Rendement : dividende rapporté au cours", r: yld != null && yld >= 0.001 ? rankIn(s, c => { const x = valo(c); return x && x.yld >= 0.001 ? x.yld : null; }, true, "yld") : null, special: noDiv ? "nodiv" : null },
    { k: "prix", t: "Prix", d: "PER : à droite, plus bas au regard du bénéfice", r: v && v.pe ? rankIn(s, c => { const x = valo(c); return x && x.pe ? x.pe : null; }, false, "pe") : null, special: v && v.peNs ? "ns" : null },
  ];
  return A.filter(a => a.r || a.special === "nodiv" || a.special === "ns").map(a => ({ ...a, word: a.special === "nodiv" ? "pas de dividende" : a.special === "ns" ? "n.s." : a.special === "sansdette" && a.r && a.r.p >= 0.55 ? "sans dette" : axWord(a.r.p, a.k), lv: a.r ? axLevel(a.r.p) : null }));
}
function rfVerdictMots(s) { // le verdict en deux ou trois éléments, déduits des mêmes positions que les jauges
  // 5e passage (A4) : un mot aussi pour le milieu (« dette moyenne », « prix moyen ») ; toujours 2 ou 3 éléments quand les jauges existent
  const A = Object.fromEntries(rfAxes(s).map(a => [a.k, a])), mots = [], band = k => A[k] && A[k].r ? axBand(A[k].r.p) : null;
  if (s.net != null && s.net < 0) mots.push("En perte");
  else { const b = band("marge"); if (b === 0) mots.push("Très rentable"); else if (b === 1) mots.push("Rentable"); else if (b === 2) mots.push("Rentabilité moyenne"); else if (b === 3) mots.push("Rentabilité sous la médiane"); else if (b === 4) mots.push("Peu rentable"); }
  if (A.solidite && A.solidite.special === "sansdette") mots.push("sans dette");
  else { const b = band("solidite"); if (b === 0 || b === 1) mots.push("peu endettée"); else if (b === 2) mots.push("dette moyenne"); else if (b === 3) mots.push("dette assez élevée"); else if (b === 4) mots.push("endettée"); }
  { const b = band("prix"); if (b === 0 || b === 1) mots.push("le marché doute"); else if (b === 2) mots.push("le marché est partagé"); else if (b === 3 || b === 4) mots.push("le marché y croit"); } // 4/11 : pas de jugement sur le prix
  if (mots.length < 2) { const b = band("croissance"); if (b === 0 || b === 1) mots.push("en croissance"); else if (b === 2) mots.push("croissance moyenne"); else if (b === 3) mots.push("croissance sous la médiane"); else if (b === 4) mots.push("croissance faible"); }
  if (!mots.length) mots.push("Dans la norme de son secteur");
  return mots.slice(0, 3).map((m, i) => i ? m.replace(/^./, x => x.toLowerCase()) : m.replace(/^./, x => x.toUpperCase())).join(", ");
}
/* ---------- Premium : jeton gardé sur l'appareil, quotas, incitations ---------- */
const TKEY = "bilan.premium", FREE = { pf: Infinity, cmp: 3 }; // 4/11 : portefeuille sans limite de lignes pour tous ; comparaisons : 5 par semaine (cf/src/quota.mjs)
function premTok() { try { return localStorage.getItem(TKEY) || ""; } catch (e) { return ""; } }
function setPremTok(t) { try { t ? localStorage.setItem(TKEY, t) : localStorage.removeItem(TKEY); } catch (e) { } PREM = null; }
let PREM = null, PREMP = null;
function premStatus() {
  if (PREM) return Promise.resolve(PREM);
  if (PREMP) return PREMP;
  const t = premTok(); if (!t) return Promise.resolve(PREM = { premium: false });
  return PREMP = fetch("/api/premium/statut", { headers: { "x-bilan-token": t } }).then(r => r.json()).catch(() => ({ premium: false })).then(j => { PREMP = null; PREM = j; document.documentElement.classList.toggle("is-prem", !!j.premium); return j; });
}
const isPrem = () => !!(PREM && PREM.premium);
function iaFetch(url, opts = {}) { const t = premTok(); return fetch(url, { ...opts, headers: { ...(opts.headers || {}), ...(t ? { "x-bilan-token": t } : {}) } }); }
function toast(html) { let t = $("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); } t.innerHTML = html; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 6000); }
premStatus();

/* ---------- Score visuel : le profil en 5 axes, en version compacte (cartes, comparaisons) ---------- */
function profilAxes(s) { return rfAxes(s).filter(a => a.r).map(a => [a.t, a.r, a.word, a.k]); } // forme compacte, gardée pour les appels existants
/* ---------- Assistant de fiche : questions sur l'entreprise, réponses tirées des données du site ---------- */
const R1 = x => x == null || !isFinite(x) ? null : Math.round(x * 1000) / 10;
/* ---------- Page Premium ---------- */
let OFFRES = null;
async function pagePremium(sub) { // 13/11 : seule la page « Merci » reste ici ; la page Premium est dans m/premium5.js
  setTitle(sub === "merci" ? "Merci" : "Premium"); setNav("prem");
  if (sub === "merci") return premiumMerci();
}
async function premiumMerci() {
  const sid = new URLSearchParams(location.search).get("session_id") || "";
  app.innerHTML = `<h1 class="pagetitle">Merci</h1><section class="panel"><div class="pb" id="merci"><p class="muted">Vérification du paiement…</p></div></section>`;
  let j = {}; for (let i = 0; i < 4; i++) { try { j = await (await fetch("/api/premium/activer?session_id=" + encodeURIComponent(sid))).json(); } catch (e) { j = { error: "Vérification impossible pour le moment." }; } if (j.token || !/pas encore confirmé/.test(j.error || "")) break; await new Promise(r => setTimeout(r, 4000)); }
  if (!j.token) { $("#merci").innerHTML = `<p>${esc(j.error || "Paiement introuvable.")}</p><p class="muted">Si vous avez été débité, écrivez-nous en indiquant l'adresse utilisée pour payer : votre accès sera ouvert à la main.</p>`; return; }
  setPremTok(j.token); await premStatus(); const mo = await moi(true).catch(() => ({})); // connecté : l'abonnement est rattaché au compte par moi()
  $("#merci").innerHTML = (mo && mo.connecte ? `<p class="lead" style="margin-top:0"><b>Votre abonnement est rattaché à votre espace</b> (${esc(mo.email || "")}), sur tous vos appareils.</p>` : `<div class="note" style="margin:0 0 14px;border:2px solid #111;border-radius:14px;padding:12px 14px;background:#FFF6C7"><b>Dernière étape : créez votre espace.</b> Avec un espace (une adresse et un mot de passe), Premium vous suit sur tous vos appareils. Votre abonnement y sera rattaché automatiquement. <a class="lnk" href="/espace"><b>Créer mon espace →</b></a></div>`) + `<p class="lead" style="margin-top:0"><b>Premium est actif.</b> Toutes les fiches, les classements et les comparaisons sont ouverts sur cet appareil.</p><p>Votre code d'accès, à garder pour activer Premium sur un autre appareil :</p><p class="code">${esc(j.token)}</p><p class="muted" style="font-size:13.5px">Il vous sera aussi renvoyé sur demande, à l'adresse utilisée pour payer, depuis la page Premium.</p><div style="display:flex;gap:16px;flex-wrap:wrap"><a class="more" href="/entreprises">Ouvrir une fiche →</a><a class="more" href="/classements">Voir les classements →</a></div>`;
}

/* ---------- Nouvel investisseur : par où commencer ---------- */

/* ---------- Pages légales ---------- */
let LEGAL = null;
const LEGAL_PAGES = { "/mentions-legales": "mentions", "/cgv": "cgv", "/confidentialite": "confidentialite", "/avertissement": "avertissement" };
async function pageLegal(p) {
  const k = LEGAL_PAGES[p]; setNav("");
  if (!LEGAL) { try { LEGAL = await (await fetch("/data/legal.json")).json(); } catch (e) { app.innerHTML = `<div class="empty">Page indisponible.</div>`; return; } }
  const P = LEGAL.pages[k]; setTitle(P.titre);
  const fill = s => esc(s).replace(/\[([^\]]{2,40})\]/g, `<mark class="todo" title="À compléter par l'éditeur">$1</mark>`);
  app.innerHTML = `<div class="legal"><h1 class="pagetitle">${esc(P.titre)}</h1>${/\[[^\]]+\]/.test(JSON.stringify(P)) ? `<p class="note">Les passages surlignés sont en cours de complétion par l'éditeur.</p>` : ""}
    <section class="panel"><div class="pb">${P.sections.map(s => `<h2>${esc(s.h)}</h2>${s.p.map(x => `<p>${fill(x)}</p>`).join("")}`).join("")}</div></section>
    <p class="note">${Object.entries(LEGAL_PAGES).filter(([, v]) => v !== k).map(([u, v]) => `<a class="lnk" href="${u}">${esc(LEGAL.pages[v].titre)}</a>`).join(" · ")}</p></div>`;
}

/* ====================================================================================================
   v8 : comptes clients (Mon espace), copilote IA « Demander à ENKLAIR », accueil en bandeaux, favoris refaits
   ==================================================================================================== */

/* ---------- Compte : session par cookie, synchronisation des favoris et du portefeuille ---------- */
let MOI = null, MOIP = null;
function moi(force) {
  if (MOI && !force) return Promise.resolve(MOI);
  if (MOIP && !force) return MOIP;
  return MOIP = fetch("/api/espace/moi", { credentials: "same-origin" }).then(r => r.ok ? r.json() : { connecte: false }).catch(() => ({ connecte: false })).then(async j => {
    // 5/11 : un abonnement payé sur cet appareil est rattaché au compte dès la connexion
    let t = ""; try { t = localStorage.getItem(TKEY) || ""; } catch (e) { }
    if (j.connecte && !j.premium && t) { const r = await post2("/api/espace/premium", { token: t }).catch(() => ({})); if (r && r.ok) { j.premium = true; j.plan = r.plan; j.premium_jusqu_au = r.premium_jusqu_au; } }
    MOIP = null; MOI = j; document.documentElement.classList.toggle("is-in", !!j.connecte);
    const payer = location.pathname === "/espace" ? new URLSearchParams(location.search).get("payer") : null; // 5/11 : espace obligatoire avant de payer
    if (j.connecte && payer === "unique" && !window.ESP_SANS_PAYER) { const o = await fetch("/api/premium/offres").then(r => r.json()).catch(() => ({})); if (premOuvert(o)) { location.href = o[payer] + "?prefilled_email=" + encodeURIComponent(j.email || ""); return j; } }
    if (j.connecte && j.jeton && j.jeton !== t) { try { localStorage.setItem(TKEY, j.jeton); } catch (e) { } } // compte propriétaire (7/11)
    if (j.connecte) { if (j.premium) { PREM = { premium: true, plan: j.plan }; document.documentElement.classList.add("is-prem"); } syncFromServer(j); }
    espaceBadge(); return j;
  });
}
const connecte = () => !!(MOI && MOI.connecte);
/* 13/11 (Romain) : une seule formule, 19 € par an. Le bouton de paiement n'est ouvert que si le lien de paiement déclaré par le
   serveur est bien à ce prix (variable PRIX_UNIQUE du Worker, qui doit commencer par « 19 ») : jamais 19 € affichés et 39 € prélevés. */
const PREM_PRIX = 19;
const premOuvert = o => !!(o && o.unique && new RegExp("^" + PREM_PRIX + "\\b").test(String(o.prix_unique || "").trim()));
let SYNCING = false;
function syncFromServer(j) {
  const d = j.donnees || {}; SYNCING = true;
  try {
    const local = favs(), srv = Array.isArray(d.favoris) ? d.favoris : [];
    const union = [...new Set([...srv, ...local])];
    setFavs(union);
    SYNCING = false;
    if (union.length !== srv.length) pushDonnees();
  } finally { SYNCING = false; }
}
let pushT = null;
function pushDonnees() {
  if (!connecte() || SYNCING) return;
  clearTimeout(pushT);
  pushT = setTimeout(() => fetch("/api/espace/donnees", { method: "PUT", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ favoris: favs() }) }).catch(() => { }), 800);
}
function espaceBadge() {
  const n = MOI && MOI.connecte ? MOI.nonlus || 0 : 0;
  $$(".espn").forEach(el => el.textContent = n ? String(n) : "");
  $$(".esplbl").forEach(el => el.textContent = MOI && MOI.connecte ? "Mon espace" : "Se connecter");
}
moi();

/* ---------- Menu en rubriques ---------- */
document.addEventListener("click", e => {
  const b = e.target.closest(".dd > button");
  $$(".dd.open").forEach(d => { if (!b || d !== b.parentElement) d.classList.remove("open"); });
  if (b) { b.parentElement.classList.toggle("open"); b.setAttribute("aria-expanded", b.parentElement.classList.contains("open")); }
});
document.addEventListener("keydown", e => { if (e.key === "Escape") $$(".dd.open").forEach(d => d.classList.remove("open")); });

/* ---------- Jauge à zones : où se place un chiffre par rapport à la médiane de son secteur ---------- */
// lowGood : true quand un chiffre bas est favorable (dette, PER)

/* ---------- Le PER expliqué avec les chiffres de l'entreprise ---------- */

/* ---------- Copilote : « Demander à ENKLAIR » ---------- */
const INDI = {
  croissance: ["Croissance des ventes", c => { const x = ratios(c).g1; return x == null ? null : x * 100; }, x => pct(x / 100), false],
  marge: ["Marge d'exploitation", c => isBank(c) ? null : (x => x == null ? null : x * 100)(ratios(c).marge), x => pct(x / 100, 1, false), false],
  marge_nette: ["Marge nette", c => { const x = ratios(c).nm; return x == null ? null : x * 100; }, x => pct(x / 100, 1, false), false],
  rentabilite: ["Rentabilité des capitaux propres", c => { const x = ratios(c).roe; return x == null ? null : x * 100; }, x => pct(x / 100, 1, false), false],
  dette: ["Dette (années de résultat)", c => isBank(c) ? null : c.netDebt != null && c.netDebt < 0 ? -0.1 : ratios(c).lev, x => x < 0 ? "plus de trésorerie que de dette" : F1.format(x) + " an" + (x >= 2 ? "s" : ""), true],
  per: ["PER", c => { const v = valo(c); return v && v.pe ? v.pe : null; }, x => F0.format(x), true],
  rendement: ["Rendement du dividende", c => { const v = valo(c); return v && v.yld != null ? v.yld * 100 : null; }, x => pct(x / 100, 1, false), false],
  distribution: ["Part du bénéfice versée", c => { const x = ratios(c).payout; return x == null ? null : x * 100; }, x => pct(x / 100, 0, false), null],
  variation_1an: ["Cours sur 1 an", c => { const p = pxOf(c); return p && p.p1y ? (p.p / p.p1y - 1) * 100 : null; }, x => pct(x / 100), null],
  capitalisation: ["Valeur en Bourse", c => { const v = valo(c); return v && v.capE ? v.capE / 1e9 : null; }, x => capFmt(x * 1e9), null],
  taille: ["Ventes annuelles", c => c.ca > 0 ? caEur(c) / 1000 : null, x => F1.format(x) + " Md€", null],
};
const MEDI = {};
// Thèmes repérés dans la question : filtre sur le nom et la description des entreprises, le nom et l'indice des ETF.
const THEME_RE = { defense: [/d[ée]fense|armement|militaire|munitions|defense/i, "défense"], semi: [/semi.?conduct|puces|semiconductor/i, "semi-conducteurs"], eau: [/\beau\b|water/i, "eau"],
  ia: [/intelligence artificielle|artificial intelligence|big data|\bIA\b/, "intelligence artificielle"], robot: [/robot|automation|automatisation/i, "robotique"], cyber: [/cyber/i, "cybersécurité"],
  clean: [/clean|renouvelable|solaire|[ée]olien|transition [ée]nerg/i, "énergies renouvelables"], or: [/gold|\bor\b|aurif/i, "or"], mines: [/\bmines?\b|mini[eè]re?s?|cuivre|lithium|zinc|nickel|gold|\bor\b|uranium/i, "mines"],
  luxe: [/luxe|luxury|maroquinerie|joaill|haute couture|montres/i, "luxe"], sante: [/health|sant[ée]|pharma|m[ée]dic|biotech/i, "santé"] };
function runFiltre(a) {
  let l = R.companies.filter(c => !c.missing && (!a.secteur || c.sector === a.secteur) && (!a.region || c.region === a.region || (a.region === "EU" && c.region === "FR")) && (!a.pays || (c.isin || "").startsWith(a.pays)) && (!a.pea || peaOk(c)));
  if (a.sauf) l = l.filter(c => !a.sauf.includes(c.sector)); // pages de réponse (m/seo.js) : secteurs écartés quand l'indicateur n'y a pas de sens
  if (a.fiable) { const CH = { croissance: "ca", taille: "ca", marge: "marge", rentabilite: "equity" }, ch = [...a.criteres.map(k => k.indicateur), a.tri && a.tri.indicateur].map(k => CH[k]).filter(Boolean); l = l.filter(c => !ch.some(f => AVERIF[c.id] && AVERIF[c.id][f])); } // chiffre « à vérifier » : écarté du classement
  if (a.mot && THEME_RE[a.mot]) { const l2 = l.filter(c => THEME_RE[a.mot][0].test(c.name + " " + (c.desc || ""))); if (l2.length) l = l2; else a.mot = null; }
  l = l.filter(c => a.criteres.every(k => { const f = INDI[k.indicateur]; if (!f) return true; const v = f[1](c); if (v == null) return false;
    if (k.condition === "sup") return k.valeur == null || v > k.valeur; if (k.condition === "inf") return k.valeur == null || v < k.valeur;
    const m = medInd(c.sector, k.indicateur); if (m == null) return false; return k.condition === "sup_mediane" ? v > m : v < m; }));
  const t = a.tri || (a.criteres[0] ? { indicateur: a.criteres[0].indicateur, ordre: INDI[a.criteres[0].indicateur][3] ? "asc" : "desc" } : { indicateur: "capitalisation", ordre: "desc" });
  if (INDI[t.indicateur] && INDI[t.indicateur][3] === true && a.criteres.some(k => k.indicateur === t.indicateur && /inf/.test(k.condition))) t.ordre = "asc";
  const f = INDI[t.indicateur] ? INDI[t.indicateur][1] : INDI.capitalisation[1];
  return { l: l.map(c => ({ c, v: f(c) })).sort((x, y) => (y.v ?? -1e9) * (t.ordre === "asc" ? -1 : 1) - (x.v ?? -1e9) * (t.ordre === "asc" ? -1 : 1)).map(x => x.c), tri: t };
}
document.addEventListener("click", e => { const b = e.target.closest("[data-favall]"); if (!b) return; const add = b.dataset.favall.split(",").filter(Boolean); setFavs([...new Set([...favs(), ...add])]); b.textContent = "★ Ajoutées à vos favoris"; b.disabled = true; });

/* ---------- Accueil en bandeaux ---------- */
const band = (n, kick, title, link, body) => `<section class="band"><div class="bandh"><span class="bandn">${n}</span><div><p class="kick">${kick}</p><h2>${title}</h2></div>${link ? `<a class="more" href="${link[0]}">${link[1]} →</a>` : ""}</div>${body}</section>`;

/* ---------- Mon espace : connexion, compte ---------- */
const post2 = (u, b, m = "POST") => fetch(u, { method: m, credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(b || {}) }).then(async r => ({ status: r.status, ...(await r.json().catch(() => ({}))) }));
function espaceConnexion() {
  // 3/11 (v4) : bandeau jaune, avantages en cartes à icône, formulaire en carte blanche (mêmes identifiants : espf, lt, espgo, espm, swap, lost, cgu)
  const ic = k => typeof ou4Ic === "function" ? ou4Ic(k) : "";
  const BEN = [["listes", "Vos favoris", "Les entreprises et les ETF que vous suivez, retrouvés en un clic."],
    ["pf", "Partout pareil", "Vos favoris sur votre téléphone et votre ordinateur."],
    ["agenda", "Votre agenda", "Les prochaines dates de résultats de vos favoris."]];
  app.innerHTML = `<div class="ek ek-page es4"><section class="ek-hero es4-hero"><div class="es4-l"><span class="mc-stk">Mon espace</span><h1 class="ag4-t">Vos valeurs, au même endroit.</h1>
      <p class="mc-sub">Gratuit, avec une adresse e-mail. Aucune donnée vendue ; vous pouvez supprimer votre compte à tout moment.</p>
      <div class="es4-ben">${BEN.map(([k, t, d]) => `<div>${ic(k)}<b>${esc(t)}</b><span>${esc(d)}</span></div>`).join("")}</div>
</div>
    <div class="es4-r"><h2 id="lt">Créer mon espace</h2>
      <form id="espf" class="espform es4-form"><label>Adresse e-mail<input type="email" name="email" required autocomplete="email"></label><label>Mot de passe <small class="light">(10 caractères minimum)</small><input type="password" name="mdp" required minlength="10" autocomplete="new-password"></label>
        <label class="es4-chk" id="cgu"><input type="checkbox" name="cgu" required> J'accepte les <a class="lnk" href="/cgv" target="_blank">conditions</a> et la <a class="lnk" href="/confidentialite" target="_blank">politique de confidentialité</a>.</label>
        <button class="btn" type="submit" id="espgo">Créer mon espace</button><p class="muted" id="espm" style="font-size:13.5px;margin:0"></p></form>
      <p class="es4-alt"><button type="button" class="linkbtn" id="swap">J'ai déjà un espace : me connecter</button> · <button type="button" class="linkbtn" id="lost">Mot de passe oublié</button></p></div></section></div>`;
  let mode = "inscription";
  if (/[?&]payer=unique/.test(location.search) && $("#espf")) $("#espf").insertAdjacentHTML("afterbegin", `<p style="margin:0 0 12px;border:2px solid #111;border-radius:12px;padding:10px 12px;background:#FFF6C7;font:600 13.5px/1.4 Inter"><b>Avant le paiement :</b> créez votre espace, ou connectez-vous. Votre abonnement Premium y sera rattaché, sur tous vos appareils.</p>`);
  const f = $("#espf"), setMode = md => { mode = md; $("#lt").textContent = md === "inscription" ? "Créer mon espace" : md === "connexion" ? "Me connecter" : "Retrouver mon accès";
    $("#espgo").textContent = md === "inscription" ? "Créer mon espace" : md === "connexion" ? "Me connecter" : "Changer mon mot de passe"; $("#cgu").hidden = md !== "inscription"; $("input[name=cgu]", f).required = md === "inscription";
    $("#swap").textContent = md === "inscription" ? "J'ai déjà un espace : me connecter" : "Créer un espace";
    let c = $("input[name=code]", f); if (md === "secours" && !c) { $("label", f).insertAdjacentHTML("afterend", `<label>Code de secours <small class="light">(reçu à la création)</small><input name="code" required autocomplete="off"></label>`); } else if (md !== "secours" && c) c.parentElement.remove();
    $("input[name=mdp]", f).autocomplete = md === "connexion" ? "current-password" : "new-password"; };
  $("#swap").onclick = () => setMode(mode === "inscription" ? "connexion" : "inscription");
  $("#lost").onclick = () => setMode("secours");
  f.onsubmit = async e => { e.preventDefault(); const fd = new FormData(f), email = fd.get("email"), mdp = fd.get("mdp"); $("#espm").textContent = "Un instant…";
    const r = mode === "inscription" ? await post2("/api/espace/inscription", { email, motdepasse: mdp, favoris: favs() }) : mode === "connexion" ? await post2("/api/espace/connexion", { email, motdepasse: mdp }) : await post2("/api/espace/secours", { email, code: fd.get("code"), nouveau: mdp });
    if (r.error) { $("#espm").textContent = r.error; return; }
    if (r.code_secours) { app.innerHTML = `<section class="panel" style="max-width:640px;margin:20px auto"><div class="pb"><h1 class="pagetitle" style="margin-top:0">Votre espace est créé</h1><p>Gardez ce <b>code de secours</b> : il permet de changer de mot de passe si vous l'oubliez. Il ne sera plus affiché.</p><p class="code">${esc(r.code_secours)}</p><a class="btn" href="/espace${/[?&]payer=unique/.test(location.search) ? "?payer=" + new URLSearchParams(location.search).get("payer") : ""}">${/[?&]payer=/.test(location.search) ? "Continuer vers le paiement" : "Voir mon espace"}</a></div></section>`; MOI = null; window.ESP_SANS_PAYER = true; moi(true).then(() => { window.ESP_SANS_PAYER = false; }); return; }
    MOI = null; await moi(true); pageEspace(); };
}
async function pageEspace() {
  setTitle("Mon espace"); setNav("esp");
  app.innerHTML = `<div class="empty">Chargement…</div>`;
  const m = await moi(true);
  if (!m.connecte) return espaceConnexion();
  app.innerHTML = `<div class="esphead esphead2"><div><p class="kick">Mon espace${m.premium ? " · Premium" : ` · <a class="lnk" href="/premium">passer à Premium</a>`}</p><h1 class="pagetitle" style="margin:2px 0 0">Votre compte</h1><p class="muted" style="margin:2px 0 0">${esc(m.email)}</p></div></div>
    <nav class="esptabs scroll-x"><a href="/espace" class="on">Mon compte</a><a href="/favoris">Mes favoris</a></nav><div id="espb"></div>`;
  espaceReglages($("#espb"), m);
}
function espaceReglages(el, m) {
  el.innerHTML = `<div class="two"><section class="panel"><div class="ph"><h2>Mot de passe</h2></div><div class="pb"><form id="mdpf" class="espform"><label>Mot de passe actuel<input type="password" name="a" required autocomplete="current-password"></label><label>Nouveau mot de passe<input type="password" name="n" required minlength="10" autocomplete="new-password"></label><button class="btn">Changer</button><p class="muted" id="mdpm" style="font-size:13.5px;margin:0"></p></form></div></section>
    <section class="panel"><div class="ph"><h2>Session</h2></div><div class="pb"><p class="muted" style="margin-top:0">Vos favoris sont enregistrés dans votre espace et retrouvés sur tous vos appareils.</p>
      <div style="display:flex;gap:14px;flex-wrap:wrap"><button class="btn ghost" id="logout">Me déconnecter</button></div></div></section></div>
    ${m.premium ? `<section class="panel" id="abo"><div class="ph"><h2>Mon abonnement</h2></div><div class="pb"><p style="margin-top:0">${m.plan === "proprietaire" ? "Compte du propriétaire : Premium sans abonnement." : m.plan === "annuel" ? `Premium annuel, renouvelé chaque année jusqu'à sa résiliation${m.premium_jusqu_au ? ` (payé jusqu'au ${esc(dLabel(new Date(m.premium_jusqu_au).toISOString()))})` : ""}.` : m.plan === "mensuel" ? `Premium mensuel${m.premium_jusqu_au ? `, payé jusqu'au ${esc(dLabel(new Date(m.premium_jusqu_au).toISOString()))}` : ""}. Il se renouvelle chaque mois jusqu'à sa résiliation.` : `Premium pour un an (payé une fois, sans renouvellement)${m.premium_jusqu_au ? ` : jusqu'au ${esc(dLabel(new Date(m.premium_jusqu_au).toISOString()))}` : ""}.`}</p>
      ${m.resiliable || m.plan === "mensuel" || m.plan === "annuel" ? `<button class="btn" id="portail2">Gérer ou résilier mon abonnement</button><p class="muted" style="font-size:13px;margin:8px 0 0">La résiliation prend effet à la fin de la période déjà payée : Premium reste ouvert jusque-là, plus rien n'est prélevé ensuite.</p><p id="portm" class="muted"></p>` : ""}</div></section>` : ""}
    <section class="panel"><div class="ph"><h2>Supprimer mon espace</h2></div><div class="pb"><p class="muted" style="margin-top:0">Votre compte et vos favoris sont effacés définitivement. ${m.resiliable || m.plan === "mensuel" || m.plan === "annuel" ? "<b>Résiliez d'abord votre abonnement</b> (encadré « Mon abonnement ») : sinon il continuerait d'être prélevé. La suppression est refusée tant qu'il est actif." : m.plan === "unique" ? "Votre Premium payé pour un an est rattaché à ce compte : il serait perdu, sans remboursement automatique." : ""}</p><form id="delf" class="espform" style="max-width:420px"><label>Mot de passe<input type="password" name="p" required autocomplete="current-password"></label><button class="btn danger">Supprimer définitivement</button><p class="muted" id="delm" style="font-size:13.5px;margin:0"></p></form></div></section>`;
  $("#mdpf").onsubmit = async e => { e.preventDefault(); const fd = new FormData(e.target); const r = await post2("/api/espace/motdepasse", { ancien: fd.get("a"), nouveau: fd.get("n") }); $("#mdpm").textContent = r.error || "Mot de passe changé."; };
  $("#logout").onclick = async () => { await post2("/api/espace/deconnexion"); MOI = { connecte: false }; document.documentElement.classList.remove("is-in"); espaceBadge(); go("/"); };
  if ($("#portail2")) $("#portail2").onclick = async () => { const P = $("#portail2"); P.disabled = true; try { const j = await (await iaFetch("/api/premium/portail")).json(); if (j.url) { location.href = j.url; return; } $("#portm").textContent = j.error || "Portail indisponible."; } catch (e) { $("#portm").textContent = "Portail indisponible pour le moment."; } P.disabled = false; };
  $("#delf").onsubmit = async e => { e.preventDefault(); const fd = new FormData(e.target); const r = await post2("/api/espace/supprimer", { motdepasse: fd.get("p") }); if (r.error) { $("#delm").textContent = r.error; return; } MOI = { connecte: false }; espaceBadge(); app.innerHTML = `<section class="panel"><div class="pb"><p class="lead" style="margin:0">Votre espace a été supprimé. Les favoris enregistrés sur cet appareil restent ici tant que vous ne videz pas votre navigateur.</p></div></section>`; };
}

/* ---------- Favoris, en liste lisible ---------- */
let favTab = "actions";
async function pageFavoris() {
  setTitle("Mes favoris"); setNav("fav");
  app.innerHTML = `<div class="empty">Chargement…</div>`;
  await Promise.all([PXP, loadAna()]);
  const keys = favs(), cos = keys.filter(k => k.startsWith("c:")).map(k => RBY[k.slice(2)]).filter(Boolean), etfs = keys.filter(k => k.startsWith("e:")).map(k => ETFBY[k.slice(2)]).filter(Boolean);
  if (!cos.length && !etfs.length) { app.innerHTML = `<h1 class="pagetitle">Mes favoris</h1><section class="panel"><div class="pb"><p class="lead" style="margin-top:0">Vous ne suivez encore aucune entreprise.</p><p>Sur chaque fiche, le bouton « ☆ Ajouter aux favoris » l'ajoute ici.</p><a class="btn" href="/entreprises">Parcourir les entreprises</a></div></section>`; return; }
  const withP = cos.map(c => ({ c, p: pxOf(c) })), chgs = withP.filter(x => x.p && x.p.chg != null).map(x => x.p.chg), avg = chgs.length ? chgs.reduce((a, b) => a + b, 0) / chgs.length : null;
  const up = cos.flatMap(c => eventsOf(c.id).filter(e => e.date >= TODAY).map(e => ({ ...e, c }))).sort((a, b) => a.date.localeCompare(b.date));
  const ups = withP.filter(x => x.p && x.p.chg > 0).length, downs = withP.filter(x => x.p && x.p.chg < 0).length;
  if (favTab === "etf" && !etfs.length) favTab = "actions"; if (favTab === "actions" && !cos.length) favTab = "etf";
  const row = c => { const p = pxOf(c), y = p && p.p1y ? p.p / p.p1y - 1 : null, pos = p && p.h52 > p.l52 ? Math.min(1, Math.max(0, (p.p - p.l52) / (p.h52 - p.l52))) : null, nx = eventsOf(c.id).find(e => e.date >= TODAY), t = quick(c);
    return `<div class="frow"><a class="cell-co" href="/entreprise/${c.id}">${logo(c, 34)}<span><b>${esc(c.name)}</b><small class="light">${esc(secName(c))}</small></span></a>
      <div class="fpx">${p ? `<b class="num">${pxFmt(p.p, p.cur)}</b><span class="num ${p.chg > 0 ? "up" : p.chg < 0 ? "down" : "muted"}">${p.chg != null ? (p.chg > 0 ? "+" : "") + F2.format(p.chg) + " %" : ""}</span>` : `<span class="light">–</span>`}</div>
      <div class="f1y"><small class="light">1 an</small><b class="num ${y >= 0 ? "up" : "down"}">${y != null ? sgn(y, 0) : "–"}</b></div>
      <div class="f52">${pos != null ? `<small class="light">${pos > 0.85 ? "près du plus haut" : pos < 0.15 ? "près du plus bas" : "sur un an"}</small><div class="range sm"><i style="left:${pos * 100}%"></i></div>` : ""}</div>
      <div class="fpr">${t ? pills(t) : ""}</div>
      <div class="fnx">${nx ? `<small class="light">${esc(dLabel(nx.date))}</small><span>${esc(nx.label)}</span>` : `<small class="light">pas de date annoncée</small>`}</div>
      <button type="button" class="favx" data-fav="c:${c.id}" title="Retirer des favoris" aria-label="Retirer ${esc(c.name)} des favoris">★</button></div>`; };
  const erow = e => { const p = pxEtf(e), y = p && p.p1y ? p.p / p.p1y - 1 : null;
    return `<div class="frow"><a class="cell-co" href="/etf/${e.id}">${logo({ name: e.issuer, domain: issuerDom(e) }, 34)}<span><b>${esc(e.name)}</b><small class="light">${esc(ECAT[e.categorie] || "")}${e.pea ? " · PEA" : ""}</small></span></a>
      <div class="fpx">${p ? `<b class="num">${pxFmt(p.p, p.cur)}</b><span class="num ${p.chg > 0 ? "up" : p.chg < 0 ? "down" : "muted"}">${p.chg != null ? (p.chg > 0 ? "+" : "") + F2.format(p.chg) + " %" : ""}</span>` : `<span class="light">–</span>`}</div>
      <div class="f1y"><small class="light">1 an</small><b class="num ${y >= 0 ? "up" : "down"}">${y != null ? sgn(y, 0) : "–"}</b></div>
      <div class="f52"><small class="light">frais</small><b class="num">${e.ter != null ? pct(e.ter / 100, 2, false) : "–"}</b></div><div class="fpr"></div><div class="fnx"><small class="light">${esc(e.index || "")}</small></div>
      <button type="button" class="favx" data-fav="e:${e.id}" title="Retirer des favoris" aria-label="Retirer ${esc(e.name)} des favoris">★</button></div>`; };
  app.innerHTML = `<div class="favhead"><div><p class="kick">Mon espace</p><h1 class="pagetitle" style="margin:2px 0 4px">Mes favoris</h1>
      <p class="muted" style="margin:0">${cos.length} entreprise${cos.length > 1 ? "s" : ""} et ${etfs.length} ETF suivis${connecte() ? ", enregistrés dans votre espace" : `, enregistrés sur cet appareil. <a class="lnk" href="/espace">Créez votre espace</a> pour les retrouver partout et recevoir votre bilan de la semaine`}.</p></div>
      ${avg != null ? `<div class="favday"><small>Aujourd'hui, en moyenne</small><b class="${avg >= 0 ? "up" : "down"}">${(avg > 0 ? "+" : "") + F2.format(avg)} %</b><small>${ups} en hausse · ${downs} en baisse</small></div>` : ""}</div>
    <div class="favact"><a class="btn ghost" href="/espace">Mon bilan de la semaine</a>${cos.length > 1 ? `<a class="btn ghost" href="/comparer?ids=${cos.slice(0, isPrem() ? 5 : 3).map(c => c.id).join(",")}">Les comparer</a>` : ""}</div>
    <div id="vbil"></div>
    <section class="panel"><div class="filters" id="ftab">${cos.length ? `<button data-t="actions" class="${favTab === "actions" ? "on" : ""}">Actions <span class="light">${cos.length}</span></button>` : ""}${etfs.length ? `<button data-t="etf" class="${favTab === "etf" ? "on" : ""}">ETF <span class="light">${etfs.length}</span></button>` : ""}</div>
      <div class="flist">${favTab === "actions" ? cos.map(row).join("") : etfs.map(erow).join("")}</div>
      ${favTab === "actions" ? `<div class="src">Points de couleur : ce que disent les comptes (vert : points forts, gris : dans la moyenne, orange : points de vigilance). Cours différés.</div>` : ""}</section>
    <div class="two"><section class="panel"><div class="ph"><h2>Leurs prochaines dates</h2><a href="/dividendes">Dividendes</a></div>${up.length ? agendaHTML(up.slice(0, 8), true) : `<div class="pb muted">Aucune date annoncée.</div>`}</section>
      <section class="panel"><div class="ph"><h2>Dans la presse</h2></div><div id="fpz">${cos.slice(0, 3).map((c, i) => `<div class="pb"><div class="cap">${esc(c.name)}</div><div id="fp${i}"></div></div>`).join("")}</div><div class="src">Articles repérés par GDELT, non vérifiés par le site.</div></section></div>`;
  $("#ftab").onclick = e => { const b = e.target.closest("button"); if (!b) return; favTab = b.dataset.t; pageFavoris(); };
  cos.slice(0, 3).forEach((c, i) => presseBlock($("#fp" + i), { id: c.id, max: 2 }));
}

document.addEventListener("click", e => { if (e.target.closest(".favx") && location.pathname === "/favoris") setTimeout(pageFavoris, 0); });

/* ====================================================================================================
   v9 : IA sans limite pour l'essentiel. Les questions courantes sont comprises et traitées dans le navigateur,
   avec les données du site : réponse instantanée, aucun appel au modèle, aucun quota. Le modèle ne sert qu'aux
   questions vraiment libres.
   ==================================================================================================== */
const has = (q, re) => re.test(q);

/* Le moteur local (localCopilot, localAssist, termeDe, chercheLecons…) est dans /ia.js. */

/* ---------- Textes de secours, toujours disponibles ---------- */

/* ====================================================================================================
   v10 : graphiques tactiles, portefeuille analysé avec les habitudes et le profil, page Méthode.
   ==================================================================================================== */

/* Validation d'une action du copilote proposée par l'IA connectée (m/monia.js) : seules les actions et les champs connus passent */
const jsonFrom = t => { if (!t) return null; const i = t.indexOf("{"), j = t.lastIndexOf("}"); if (i < 0 || j <= i) return null; try { return JSON.parse(t.slice(i, j + 1)); } catch (e) { return null; } };
/* ---------- Graphiques : taille réelle de l'écran et infobulles au doigt ---------- */
const chartW = () => Math.max(300, Math.min(640, (window.innerWidth || 640) - 44));
let tipOn = null;
function tipAt(x, y, show = true) {
  const t = document.elementFromPoint(x, y), el = t && t.closest && t.closest("[data-tip]");
  if (tipOn && tipOn !== el) tipOn.classList.remove("on");
  if (el && show) { tipShow(el, x, y); el.classList.add("on"); tipOn = el; } else if (!el) { CTIP.style.display = "none"; tipOn = null; }
}
document.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") tipAt(e.clientX, e.clientY); }, { passive: true });
document.addEventListener("pointermove", e => { if (e.pointerType !== "mouse" && e.buttons) tipAt(e.clientX, e.clientY); }, { passive: true });
window.addEventListener("scroll", () => { if (CTIP.style.display === "block" && tipOn) { CTIP.style.display = "none"; tipOn.classList.remove("on"); tipOn = null; } }, { passive: true });

/* ---------- Profil du questionnaire, utilisé par les analyses ---------- */

/* ---------- Portefeuille : vos habitudes (courtier, enveloppe, versements) et le profil ---------- */

/* ---------- Méthode, sources et IA ---------- */

/* ====================================================================================================
   v11 : l'Académie (cours de culture financière, quiz, progression) et la formation guidée Premium
   ==================================================================================================== */
let ACA = null, ACAP = null;


/* ====================================================================================================
   v12 : l'Académie devient interactive : leçons en cartes à dévoiler, chiffres mis en valeur,
   manipulations (curseurs) intégrées, question d'auto-évaluation, points et niveau.
   ==================================================================================================== */
// Un curseur : [clé, libellé, min, max, pas, valeur, format]
/* Une question du quiz du module, choisie parce qu'elle parle de la leçon */
/* Points et niveau */
/* 30/10 (Romain) : un visuel par leçon. Les chiffres de l'exemple, en gros, avant le texte ; le texte en dessous. */

const ROUTES_EXTRA = [];
/* 13/11 (recentrage, docs/chantier-recentrage-2026-11.md) : pages supprimées, renvoyées vers la page la plus proche.
   La même table est dans cf/src/worker.mjs (redirection 301 côté serveur). */
const PAGES_PARTIES = [
  [/^\/(apprendre|commencer|debuter|premiers-pas|academie|formation)(\/.*)?$/, "/"],
  [/^\/(pea-cto|idees-recues|livret-a-ou-bourse|pourquoi-bilan|repartitions|pour-moi)$/, "/"],
  [/^\/simulateurs(\/.*)?$/, "/outils"],
  [/^\/outils\/(si-javais|verifier)$/, "/outils"],
  [/^\/(communaute|pronostics)$/, "/outils"],
  [/^\/hier$/, "/actualites"],
  [/^\/(demander|ia\/connecter)$/, "/"],
  [/^\/(portefeuille|rapport-exemple|connecteur)$/, "/"],
  [/^\/espace\/(ia|bilan|alertes|rapport)$/, "/espace"]];
function route() {
  closeDef();
  const p = location.pathname.replace(/\/+$/, "") || "/";
  let m;
  const parti = PAGES_PARTIES.find(([re]) => re.test(p));
  if (parti) { history.replaceState({}, "", parti[1]); return route(); }
  if (p === "/aller") { // clic sur un module de cours : on ouvre la fiche de l'entreprise ou de l'ETF
    const sym = (new URLSearchParams(location.search).get("tvwidgetsymbol") || "").toUpperCase();
    const c = R.companies.find(x => (x.tv || "").toUpperCase() === sym) || R.companies.find(x => sym.endsWith(":" + (x.ticker || "").toUpperCase()));
    const e = ETF.list.find(x => (x.tv || "").toUpperCase() === sym);
    history.replaceState({}, "", c ? "/entreprise/" + c.id : e ? "/etf/" + e.id : "/");
    return route();
  }
  if (p === "/") pageHome();
  else if (p === "/entreprises") pageEntreprises();
  else if ((m = p.match(/^\/entreprise\/([a-z0-9-]+)\/comprendre(?:\/([a-z]+))?$/))) pageComprendre(m[1], m[2]);
  else if ((m = p.match(/^\/entreprise\/([a-z0-9-]+)(?:\/([a-z]+))?$/))) pageCompany(m[1], m[2]);
  else if (p === "/etf") pageEtfs();
  else if ((m = p.match(/^\/etf\/([a-z0-9-]+)$/))) pageEtf(m[1]);
  else if (p === "/actualites") pageActus();
  else if (p === "/agenda") pageAgenda();
  else if (p === "/lexique") pageLexique();
  else if (p === "/favoris") pageFavoris();
  else if (p === "/comparer") pageComparer();
  else if (p === "/dividendes") pageDividendes();
  else if (p === "/marches") pageMarches();
  else if ((m = p.match(/^\/outils(?:\/([a-z-]+))?$/))) pageOutils(m[1]);
  else if (LEGAL_PAGES[p]) pageLegal(p);
  else if (p === "/methode") pageMethode();
  else if ((m = p.match(/^\/espace(?:\/(reglages))?$/))) pageEspace(m[1]);
  else if ((m = p.match(/^\/premium(?:\/(merci))?$/))) pagePremium(m[1]);
  else if (ROUTES_EXTRA.some(([re, fn]) => { const mm = p.match(re); if (mm) fn(...mm.slice(1)); return !!mm; })) { }
  else pageNotFound();
}
// Routes ajoutées par les modules (cf/site/m/*.js) : ROUTES_EXTRA.push([/^\/chemin\/([a-z0-9-]+)$/, id => pageX(id)])
function goR(url) { history.replaceState({}, "", url); route(); if (!location.hash) window.scrollTo(0, 0); } // redirection sans entrée dans l'historique (anciennes adresses)
function go(url) { history.pushState({}, "", url); route(); if (!location.hash) { window.scrollTo(0, 0); goHaut(); } closePanels(); }
// 4/11 : sur téléphone, la page arrivait parfois au milieu (Romain, « Voir la fiche d'Hermès ») : on remonte encore pendant la construction
// de la page, sauf si la personne a déjà fait défiler ou si l'adresse vise un bloc (/entreprise/x/comptes, ancre).
function goHaut() {
  const p0 = location.pathname; if (/^\/entreprise\/[^/]+\/./.test(p0)) return;
  let bouge = false; const stop = () => { bouge = true; }; addEventListener("touchmove", stop, { once: true, passive: true }); addEventListener("wheel", stop, { once: true, passive: true });
  [120, 450, 1200].forEach(t => setTimeout(() => { if (!bouge && !location.hash && location.pathname === p0 && scrollY > 0) window.scrollTo(0, 0); }, t));
  setTimeout(() => { removeEventListener("touchmove", stop); removeEventListener("wheel", stop); }, 1300);
} // 4/11 : sur téléphone, la page arrivait parfois au milieu (Romain, « Voir la fiche d'Hermès ») : on remonte aussi une fois la page construite
try { history.scrollRestoration = "manual"; } catch (e) { }
document.addEventListener("click", e => {
  const a = e.target.closest("a[href]");
  if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const u = new URL(typeof a.href === "string" ? a.href : a.getAttribute("href"), location.href); // lien dans un SVG : a.href n'est pas une chaîne
  if (u.origin !== location.origin) return;
  if (u.pathname === location.pathname && u.search === location.search && u.hash) { closePanels(); closeDef(); return; }
  e.preventDefault(); go(u.pathname + u.search + u.hash);
});
window.addEventListener("popstate", route);

/* ---------- Barre : menu, recherche, masquage au défilement ---------- */
const bar = $("#bar"), mpanel = $("#mpanel"), msearch = $("#msearch");
function closePanels() { mpanel.classList.remove("open"); msearch.classList.remove("open"); $("#menuBtn").setAttribute("aria-expanded", "false"); $("#searchBtn").setAttribute("aria-expanded", "false"); $$(".results").forEach(r => r.classList.remove("open")); }
$("#menuBtn").onclick = () => { const o = !mpanel.classList.contains("open"); closePanels(); if (o) { mpanel.classList.add("open"); $("#menuBtn").setAttribute("aria-expanded", "true"); } };
$("#searchBtn").onclick = () => { const o = !msearch.classList.contains("open"); closePanels(); if (o) { msearch.classList.add("open"); $("#searchBtn").setAttribute("aria-expanded", "true"); $("input", msearch).focus({ preventScroll: true }); } };
const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function bindSearch(root) {
 $$("[data-search]", root).forEach(box => {
  if (box._bound) return; box._bound = true;
  const inp = $("input", box), res = $(".results", box); let sel = -1;
  const show = () => {
    const q = norm(inp.value.trim());
    if (!q || !R) { res.classList.remove("open"); return; }
    const rk = c => norm(c.ticker) === q || (c.isin || "").toLowerCase() === q ? 0 : norm(c.name).startsWith(q) ? 1 : 2;
    const qc = q.replace(/[^a-z0-9]/g, ""), cmp = t => qc.length >= 3 && norm(t || "").replace(/[^a-z0-9]/g, "").includes(qc); // 9/11 (Romain) : « sp500 » trouve « S&P 500 », « nasdaq100 » trouve « Nasdaq-100 »
    const cos = R.companies.filter(c => norm(c.name).includes(q) || cmp(c.name) || norm(c.ticker) === q || (c.isin || "").toLowerCase() === q).sort((a, b) => rk(a) - rk(b) || (a.missing ? 1 : 0) - (b.missing ? 1 : 0)).slice(0, 7);
    const mots = q.split(/\s+/).filter(Boolean), tousMots = t => mots.length > 1 && mots.every(w => norm(t).includes(w)); // « pea us tech esg » : chaque mot, dans n'importe quel ordre (nom + indice)
    const etfs = ETF.list.filter(e => norm(e.name + " " + e.index + " " + e.ticker).includes(q) || cmp(e.name + " " + e.index) || tousMots(e.name + " " + e.index + " " + e.issuer) || e.isin.toLowerCase() === q).sort((a, b) => (cmp(b.index) || norm(b.index || "").includes(q)) - (cmp(a.index) || norm(a.index || "").includes(q))).slice(0, 4);
    sel = -1;
    const hl = t => { const s0 = String(t || ""), k = norm(s0).indexOf(q); return k < 0 || norm(s0).length !== s0.length ? esc(s0) : esc(s0.slice(0, k)) + "<mark>" + esc(s0.slice(k, k + q.length)) + "</mark>" + esc(s0.slice(k + q.length)); };
    res.innerHTML = cos.length || etfs.length ? (cos.length ? `<div class="sr-h">Entreprises</div>` : "") + cos.map(c => `<a href="/entreprise/${c.id}" class="srow">${logo(c, 34)}<span class="st"><span class="sr-n">${hl(c.name)}</span><span class="sr-m">${esc(c.ticker)} · ${esc(regName(c))} · ${esc(secName(c))}</span></span><span class="sr-go">→</span></a>`).join("") + (etfs.length ? `<div class="sr-h">ETF</div>` : "") + etfs.map(e => `<a href="/etf/${e.id}" class="srow">${logo({ name: e.issuer, domain: issuerDom(e) }, 34)}<span class="st"><span class="sr-n">${hl(e.name)}</span><span class="sr-m"><b class="sr-p">ETF</b>${e.pea ? `<b class="sr-p sr-pea fr-seul">PEA</b>` : ""}${esc(e.ticker || "")}${e.index ? " · " + esc(e.index) : ""}</span></span><span class="sr-go">→</span></a>`).join("") : `<div class="none">Aucun résultat.</div>`;
    $(".none", res) && $(".none", res).remove();
    res.classList.add("open");
  };
  inp.addEventListener("input", show); inp.addEventListener("focus", show);
  inp.addEventListener("keydown", e => {
    const items = $$("a", res);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, Math.min(items.length - 1, sel + (e.key === "ArrowDown" ? 1 : -1))); items.forEach((a, i) => a.classList.toggle("sel", i === sel)); }
    else if (e.key === "Enter" && items.length) { e.preventDefault(); const a = items[Math.max(0, sel)]; inp.value = ""; const u = new URL(a.href); go(u.pathname + u.search); inp.blur(); }
    else if (e.key === "Escape") { res.classList.remove("open"); inp.blur(); }
  });
  res.addEventListener("click", () => { inp.value = ""; });
 });
}
bindSearch(document);
document.addEventListener("pointerdown", e => { if (!e.target.closest("[data-search]")) $$(".results").forEach(r => r.classList.remove("open")); });
(() => { // téléphone : la barre se cache en descendant (seuil cumulé, rebond du bas ignoré)
  let lastY = scrollY, acc = 0;
  addEventListener("scroll", () => {
    const y = scrollY, dy = y - lastY; lastY = y;
    if (innerWidth > 760) { bar.classList.remove("hide"); return; }
    if (y < 60) { bar.classList.remove("hide"); acc = 0; return; }
    if (y + innerHeight >= document.documentElement.scrollHeight - 4 || mpanel.classList.contains("open") || msearch.classList.contains("open")) return;
    if ((dy > 0) !== (acc > 0)) acc = 0;
    acc += dy;
    if (acc > 60) { bar.classList.add("hide"); closeDef(); } else if (acc < -30) bar.classList.remove("hide");
  }, { passive: true });
})();

/* ---------- Démarrage ---------- */
// Un fichier absent sous /data/ renvoyait la page d'accueil entière (516 ko) avec un code 200 : on refuse tout ce qui n'est pas du JSON (audit P0-3).
const getJSON = (u, fallback) => fetch(u).then(r => r.ok && /json/i.test(r.headers.get("content-type") || "") ? r.json() : fallback).catch(() => fallback);
Promise.all([getJSON("/data/societes.json", null), getJSON("/data/agenda.json", { events: [] }), getJSON("/data/univers-min.json", null), getJSON("/data/courtiers.json", { list: [], sources: [] }), getJSON("/data/agenda-auto.json", { events: [] }), getJSON("/data/etf.json", { list: [] }), getJSON("/data/agenda-habituel.json", { events: [] }), getJSON("/data/repartitions.json", {}), getJSON("/data/concurrents.json", {}), getJSON("/logos/index.json", { l: {} }), getJSON("/data/a-verifier.json", { items: {} })]).then(([r, ag, uni, br, auto, etf, hab, rep, conc, lg, av]) => {
  LOGOS = (lg && lg.l) || {};
  AVERIF = (av && av.items) || {}; // 5e passage (A8) : chiffres à vérifier (sauts d'une année à l'autre repérés par tests/t_coherence.mjs)
  REP = rep || {}; CONC = conc || {};
  ETF = etf || { list: [] }; ETF.list.forEach(e => ETFBY[e.id] = e); SEGFR = {};
  if (!r || !uni) { app.innerHTML = `<div class="empty">Les données n'ont pas pu être chargées.</div>`; return; }
  // Agenda : dates officielles relevées à la main, puis dates estimées d'après l'an dernier pour les autres
  const manual = new Set((ag?.events || []).map(e => e.id));
  AG = { events: [...(ag?.events || []), ...(auto?.events || []).filter(e => !manual.has(e.id))] }; BROKERS = br;
  // 7/11 : dates habituelles de résultats (l'an dernier + 1 an, data/agenda_habituel.mjs), marquées « à confirmer », pour les entreprises sans date officielle
  { const off = new Set(AG.events.filter(e => e.type === "Résultats" && e.date >= TODAY).map(e => e.id)); AG.events.push(...(hab?.events || []).filter(e => !off.has(e.id))); }
  // Dividendes des entreprises américaines (calendrier Nasdaq, data/dividendes_us.mjs) : seulement celles sans calendrier officiel relevé
  window.AG_DIVP = Promise.all([getJSON("/data/agenda-dividendes.json", { events: [] }), getJSON("/data/agenda-dividendes-eu.json", { events: [] })]).then(D => { const off = new Set(AG.events.filter(e => e.type === "Dividende").map(e => e.id)); D.forEach(d => AG.events.push(...(d.events || []).filter(e => !off.has(e.id)))); });
  const S = Object.fromEntries((r.companies || []).map(c => [c.id, c]));
  // La liste des entreprises suivies fait foi ; les comptes collectés s'y ajoutent
  // 5/11 (Romain : « une fiche vide fait amateur ») : une entreprise sans comptes relevés n'est pas montrée ; elle revient seule dès que
  // ses comptes arrivent (les robots continuent de les chercher dans data/univers.mjs). Son adresse renvoie vers /entreprises.
  const tout = uni.companies.map(u => ({ ...(S[u.id] || { missing: true }), ...u }));
  window.SANS_COMPTES = new Set(tout.filter(c => c.missing || c.year == null || Date.now() >= Date.UTC(c.year + 2, 6, 1)).map(c => c.id)); // 6/11 (Romain) : comptes trop anciens (exercice N encore affiché après juin N+2) masqués aussi ; ils reviennent avec leurs comptes
  R = { ...r, regions: uni.regions, companies: tout.filter(c => !SANS_COMPTES.has(c.id)) };
  R.companies.forEach(c => { RBY[c.id] = c; if (c.isin) ISINBY[c.isin] = c; });
  fichesMerge(); // si les textes de fiche sont déjà arrivés (accueil)
  computeMedians();
  favCount();
  PXP = loadPrices();
  // Premier affichage seulement quand tous les modules (styles compris) sont chargés : sinon la page se redessine un instant plus tard et saute
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => route(), { once: true }); else route();
});

/* styles : voir site.css */

/* styles : voir site.css */
