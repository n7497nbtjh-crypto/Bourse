// Le bot garde chaque jour une copie des cours (secours si la feuille ne répond pas) et les taux de change de la BCE.
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { COURS_CSVS, parseCours } from "./cours_config.mjs";
import { clotures, seancePrecedente } from "../cf/src/synthese.mjs";
const OUT = new URL("../cf/site/data/", import.meta.url);
const today = new Date().toISOString().slice(0, 10);
try {
  const items = {};
  // 7/11 : Google sert parfois une copie ANCIENNE de la feuille publiée (le 7/11, le S&P 500 et le Nikkei du 2/11 au chiffre près,
  // rangés comme clôture du 6/11). Une feuille est jugée périmée quand plus de 20 % de ses cours sont identiques à ceux d'un jour
  // déjà archivé plus ancien que le dernier, tout en différant du dernier. On relit alors (3 fois, 30 s d'écart), puis on prend
  // la copie lue par le site (/api/cours) si elle est saine ; sinon les cours de cette feuille ne sont pas écrits (pas de faux cours du jour).
  const arch = {}; for (let i = 0; i < 2; i++) { const d = new Date(Date.now() - i * 28 * 864e5).toISOString().slice(0, 7); try { Object.assign(arch, JSON.parse(readFileSync(new URL(`../data/historique/${d}.json`, import.meta.url)))); } catch (e) { } }
  const jours = Object.keys(arch).sort(), der = jours[jours.length - 1];
  const perime = lot => {
    if (!der) return false; let n = 0, vieux = 0;
    for (const [k, v] of Object.entries(lot)) { const a = arch[der][k]; if (!(v.p > 0) || !(a > 0)) continue; n++; if (v.p !== a && jours.slice(0, -1).some(j => arch[j][k] === v.p)) vieux++; }
    return n >= 50 && vieux / n > 0.2;
  };
  let site = null;
  for (const u of COURS_CSVS) {
    let lot = null;
    for (let t = 0; t < 3; t++) {
      try { const r = await fetch(u + (t ? "&_=" + Date.now() : "")); lot = parseCours(await r.text()); } catch (e) { console.log("::warning::Feuille de cours non lue :", e.message); lot = null; }
      if (!lot || !perime(lot)) break;
      console.log(`::warning::Copie ancienne servie par Google (essai ${t + 1}) : ${u.slice(-20)}`); lot = "perime"; await new Promise(r => setTimeout(r, 30000));
    }
    if (lot === "perime") {
      try { site = site || (await (await fetch("https://enklair.com/api/cours")).json()).items; } catch (e) { site = {}; }
      const ids = new Set(Object.keys(parseCours(await (await fetch(u)).text()))), repli = Object.fromEntries(Object.entries(site || {}).filter(([k]) => ids.has(k)));
      if (Object.keys(repli).length && !perime(repli)) { console.log(`::notice::Cours de cette feuille repris de la copie du site (${Object.keys(repli).length})`); lot = repli; }
      else { console.log("::warning::Cours de cette feuille non écrits (copie ancienne partout)"); lot = null; }
    }
    if (lot) Object.assign(items, lot);
  }
  console.log(Object.keys(items).length, "cours lus dans la feuille");
  if (Object.keys(items).length > 50) {
    // Les colonnes historiques de la feuille (plus haut/bas sur 52 semaines, cours il y a 1, 3 et 5 ans) tombent parfois toutes
    // en panne (limites de GOOGLEFINANCE). On garde alors la dernière valeur connue, au plus 10 jours, mémorisée dans data/cours_ref.json.
    const REF = new URL("../data/cours_ref.json", import.meta.url), HF = ["h52", "l52", "p1y", "p3y", "p5y"];
    let mem = { items: {} }; try { mem = JSON.parse(readFileSync(REF)); } catch (e) { }
    // 7/11 : mémoire ligne par ligne (chaque titre garde la date de ses derniers cours passés) : depuis que les feuilles 2 à 4 n'ont plus
    // de colonnes historiques (limite de GOOGLEFINANCE), seule la feuille 1 les donne ; les autres titres gardent leur dernière valeur 45 jours au plus, datée (champ dp).
    const anc = mem.items || {}, neuf = {}; let repris = 0;
    for (const [k, v] of Object.entries(items)) {
      if (v.p1y != null) { neuf[k] = { ...Object.fromEntries(HF.filter(f => v[f] != null).map(f => [f, v[f]])), d: today }; continue; }
      const r = anc[k], d = (r && r.d) || mem.date; if (!r || !d || (Date.parse(today) - Date.parse(d)) / 864e5 > 45) continue;
      let pris = false; for (const f of ["p1y", "p3y", "p5y"]) if (v[f] == null && r[f] != null) { v[f] = r[f]; repris++; pris = true; }
      if (pris) v.dp = d; // date des cours passés : « il y a 1 an » compte à partir de ce jour (outils2.js, O2_sjSerie)
      neuf[k] = { ...r, d };
    }
    writeFileSync(REF, JSON.stringify({ date: today, items: neuf }));
    // 7/11 : l'historique propre du site (data/historique/AAAA-MM.json, clôtures relevées chaque jour depuis octobre 2026) prend le relais
    // dès qu'il remonte assez loin : cours d'il y a 1, 3 et 5 ans sans dépendre des colonnes historiques de Google.
    { const moinsA = a => { const d = new Date(today + "T12:00:00Z"); d.setUTCFullYear(d.getUTCFullYear() - a); return d.toISOString().slice(0, 10); };
      const lire = m => { try { return JSON.parse(readFileSync(new URL(`../data/historique/${m}.json`, import.meta.url))); } catch (e) { return null; } };
      let pris = 0;
      for (const [a, f] of [[1, "p1y"], [3, "p3y"], [5, "p5y"]]) {
        const cible = moinsA(a), mois = lire(cible.slice(0, 7)); if (!mois) continue;
        const jour = Object.keys(mois).filter(d => d <= cible && (Date.parse(cible) - Date.parse(d)) / 864e5 <= 5).sort().pop(); if (!jour) continue;
        for (const [k, v] of Object.entries(items)) if (v[f] == null && mois[jour][k] > 0) { v[f] = mois[jour][k]; pris++; }
      }
      if (pris) console.log(`Cours passés pris dans l'historique du site : ${pris}`); }
    if (repris) console.log(`::notice::Cours passés : ${repris} valeurs reprises de la mémoire (45 jours au plus, datées)`);
    // ETF sans cours dans les feuilles : valeur liquidative officielle de l'émetteur (datée, marquée vl), voir data/etf_vl.mjs
    try {
      const { valeursLiquidatives } = await import("./etf_vl.mjs");
      const etfs = JSON.parse(readFileSync(new URL("etf.json", OUT))).list.filter(e => !(items["e:" + e.id] && items["e:" + e.id].p > 0));
      const vl = await valeursLiquidatives(etfs); let n = 0;
      for (const [k, v] of Object.entries(vl)) if (!(items[k] && items[k].p > 0)) { items[k] = v; n++; }
      console.log(n, "ETF complétés par leur valeur liquidative officielle");
    } catch (e) { console.log("::warning::Valeurs liquidatives non lues :", e.message); }
    // 5/11 : entreprises sans cours dans les feuilles : cours de clôture repris d'Eulerpool (datés, marqués ep), voir data/eulerpool_cours.mjs
    try {
      const { coursEulerpool } = await import("./eulerpool_cours.mjs"), { default: U } = await import("./univers.mjs");
      const ep = await coursEulerpool(U.filter(c => !(items["c:" + c.id] && items["c:" + c.id].p > 0))); let n = 0;
      for (const [k, v] of Object.entries(ep)) if (!(items[k] && items[k].p > 0)) { items[k] = v; n++; }
      console.log(n, "entreprises complétées par leur cours Eulerpool");
    } catch (e) { console.log("::warning::Cours Eulerpool non lus :", e.message); }
    writeFileSync(new URL("cours.json", OUT), JSON.stringify({ updated: today, source: "Google Finance, cours de clôture ou différés", items }));
    // Historique quotidien (un fichier par mois) pour tracer nos propres courbes au fil du temps
    const dir = new URL("../data/historique/", import.meta.url); if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    // 1/11/2026 : chaque copie est rangée à la date de la SÉANCE qu'elle contient (et non du jour du passage du robot).
    // Le robot passe le matin (clôture de la veille) mais aussi à chaque mise en ligne, parfois le soir : avant, la copie du
    // vendredi soir était prise pour celle du jeudi, et les cours du week-end recopiaient le vendredi (courbe décalée d'un jour).
    // En séance (9 h - 22 h 30 à Paris, jours ouvrés), les cours ne sont pas des clôtures : rien n'est écrit.
    const paris = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" })), jourP = `${paris.getFullYear()}-${String(paris.getMonth() + 1).padStart(2, "0")}-${String(paris.getDate()).padStart(2, "0")}`;
    const hP = paris.getHours() + paris.getMinutes() / 60, ouvreP = paris.getDay() >= 1 && paris.getDay() <= 5;
    const seance = ouvreP && hP >= 22.5 ? jourP : (!ouvreP || hP < 9) ? seancePrecedente(jourP) : null;
    if (seance) {
      const f = new URL(seance.slice(0, 7) + ".json", dir), h = existsSync(f) ? JSON.parse(readFileSync(f)) : {};
      h[seance] = Object.fromEntries(Object.entries(items).map(([k, v]) => [k, v.p]));
      writeFileSync(f, JSON.stringify(h));
    } else console.log("En séance : pas de copie dans l'historique des clôtures");
    // Cours d'il y a une semaine (jour de Bourse le plus proche, 6 à 9 jours avant) : sert au bilan hebdomadaire par e-mail
    const all = {}; for (const m of new Set([today.slice(0, 7), new Date(Date.now() - 12 * 864e5).toISOString().slice(0, 7), new Date(Date.now() - 22 * 864e5).toISOString().slice(0, 7)])) { const g = new URL(m + ".json", dir); if (existsSync(g)) Object.assign(all, JSON.parse(readFileSync(g))); }
    const ref = Object.keys(all).filter(d => d <= new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10)).sort().pop();
    if (ref) writeFileSync(new URL("semaine.json", OUT), JSON.stringify({ date: ref, items: all[ref] }));
    // Cours de clôture des derniers jours de Bourse : synthèse de la semaine (variations, mini-graphiques).
    // Le robot passe tôt le matin : la copie du jour J contient la clôture du jour de Bourse précédent.
    const cl = clotures(all);
    if (cl.dates.length) writeFileSync(new URL("cours-semaine.json", OUT), JSON.stringify({ updated: today, source: "Google Finance, cours de clôture relevés chaque matin par le site", ...cl }));
  }
} catch (e) { console.log("::warning::Cours non lus :", e.message); }
try {
  const r = await fetch("https://data-api.ecb.europa.eu/service/data/EXR/D..EUR.SP00.A?lastNObservations=1&format=csvdata");
  const lines = (await r.text()).trim().split(/\r?\n/), head = lines.shift().split(","), ic = head.indexOf("CURRENCY"), iv = head.indexOf("OBS_VALUE");
  const fx = { EUR: 1 }; for (const l of lines) { const c = l.split(","); const v = parseFloat(c[iv]); if (v > 0) fx[c[ic]] = 1 / v; } // 1 unité de devise = x euros
  if (fx.USD) { writeFileSync(new URL("fx.json", OUT), JSON.stringify({ updated: today, source: "BCE", eur: fx })); console.log(Object.keys(fx).length, "taux BCE"); }
} catch (e) { console.log("::warning::Taux BCE non lus :", e.message); }
