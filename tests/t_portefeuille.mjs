// Portefeuille : prix de revient (PRU), ventes partielles, devises, migration des anciens formats, lecture des CSV des courtiers.
// Les calculs purs (objet PF3) sont lus dans cf/site/m/portefeuille.js, exécuté hors navigateur.
import { readFileSync } from "node:fs";
import vm from "node:vm";
const ctx = { module: { exports: null }, TextEncoder, console };
vm.createContext(ctx);
vm.runInContext(readFileSync("cf/site/m/portefeuille.js", "utf8"), ctx, { filename: "portefeuille.js" });
const PF3 = ctx.module.exports;
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log("ÉCHEC", m); } };
const near = (a, b, e = 1e-6) => a != null && b != null && Math.abs(a - b) <= e;
const fx = f => readFileSync("tests/fixtures/portefeuille/" + f, "utf8");

// --- Prix de revient : prix moyen pondéré, frais d'achat inclus
let p = PF3.position([["2026-01-10", "a", 10, 100, 2], ["2026-02-10", "a", 10, 120, 2]]);
ok(p.q === 20 && near(p.cost, 2204) && near(p.pru, 110.2), "PRU de deux achats, frais inclus " + JSON.stringify(p));
ok(p.fees === 4 && p.bought === 2200 && p.nBuy === 2, "frais et montants achetés");
// Vente partielle : le PRU des titres restants ne bouge pas, la plus-value est réalisée
p = PF3.position([["2026-01-10", "a", 10, 100, 2], ["2026-02-10", "a", 10, 120, 2], ["2026-03-10", "v", 5, 130, 2]]);
ok(p.q === 15 && near(p.pru, 110.2) && near(p.cost, 1653), "vente partielle : PRU inchangé " + JSON.stringify(p));
ok(near(p.real, 5 * 130 - 2 - 5 * 110.2), "plus-value réalisée = produit net − PRU × quantité vendue " + p.real);
// Ordre des opérations : la date compte, pas l'ordre de saisie
const p2 = PF3.position([["2026-03-10", "v", 5, 130, 2], ["2026-02-10", "a", 10, 120, 2], ["2026-01-10", "a", 10, 100, 2]]);
ok(near(p2.pru, p.pru) && near(p2.real, p.real), "opérations triées par date");
// Tout vendre remet le compteur à zéro ; les achats suivants repartent d'un nouveau PRU
p = PF3.position([["2026-01-01", "a", 4, 50, 0], ["2026-02-01", "v", 4, 60, 0], ["2026-03-01", "a", 2, 80, 1]]);
ok(p.q === 2 && near(p.pru, 80.5) && near(p.real, 40), "position soldée puis rachetée " + JSON.stringify(p));
// Vente supérieure à la quantité détenue : signalée, quantité bornée
p = PF3.position([["2026-01-01", "a", 3, 10, 0], ["2026-02-01", "v", 5, 12, 0]]);
ok(p.q === 0 && p.warn === "vente" && near(p.real, 3 * 12 - 30 + 0), "vente trop grande signalée " + JSON.stringify(p));
// Dividendes reçus et position reprise
p = PF3.position([["", "r", 12, 85.4, 0], ["2026-05-02", "d", 1, 14.4, 0], ["2026-06-01", "a", 3, 90, 1]]);
ok(p.q === 15 && near(p.pru, (12 * 85.4 + 271) / 15) && near(p.divs, 14.4), "position reprise + achat + dividende " + JSON.stringify(p));
// Saisie simple : « 12 parts achetées en moyenne à 85,40 € »
p = PF3.linePos({ k: "e:x", q: 12, pru: 85.4 });
ok(p.q === 12 && near(p.cost, 1024.8), "saisie simple");
// Fractions de parts (plans d'investissement programmés)
p = PF3.position([["2026-01-02", "a", 16.6389351082, 6.01, 0], ["2026-02-02", "a", 16.393443, 6.1, 0]]);
ok(near(p.cost, 100 + 100, 1e-3) && near(p.q, 33.0324, 1e-4), "fractions de parts " + JSON.stringify(p));

// --- Devises : taux de change historique (euros par unité de devise) quand il est connu
p = PF3.position([["2026-01-10", "a", 10, 200, 1, 0.9], ["2026-02-10", "a", 10, 220, 1, 0.85]]);
ok(near(p.pru, 210.1) && near(p.costE, 2001 * 0.9 + 2201 * 0.85), "coût en euros au taux de chaque achat " + p.costE);
p = PF3.position([["2026-01-10", "a", 10, 200, 0, 0.9], ["2026-02-10", "v", 5, 250, 0, 0.8]]);
ok(near(p.costE, 900) && near(p.realE, 5 * 250 * 0.8 - 900), "vente en devise : plus-value en euros au taux du jour de vente " + JSON.stringify(p));
p = PF3.position([["2026-01-10", "a", 10, 200, 0, 0.9], ["2026-02-10", "a", 1, 100, 0]]);
ok(p.costE === null, "taux manquant : coût en euros inconnu (converti au taux du jour à l'affichage)");

// --- Lecture des nombres et des dates
ok(PF3.num("1 234,56") === 1234.56 && PF3.num("1.234,56") === 1234.56 && PF3.num("1,234.56") === 1234.56 && PF3.num("-12.00") === -12, "nombres FR/EN");
ok(PF3.num("(12,5)") === -12.5 && PF3.num("71,4%") === 71.4 && PF3.num("") === null && PF3.num("1.234", ",") === 1234 && PF3.num("1.234", ".") === 1.234 && PF3.num("1 000,50 €") === 1000.5, "nombres : parenthèses, pourcentages, milliers");
ok(PF3.date("21-08-2026") === "2026-08-21" && PF3.date("03/09/2026") === "2026-09-03" && PF3.date("2026-01-06T10:03:11.000Z") === "2026-01-06" && PF3.date("31/02/2026") === "" && PF3.date("08.05.26") === "2026-05-08", "dates");
ok(PF3.opType("Achat Comptant") === "a" && PF3.opType("Vente Comptant") === "v" && PF3.opType("Rachat") === "v" && PF3.opType("Verkauf") === "v" && PF3.opType("Kauf") === "a" && PF3.opType("Dividende") === "d" && PF3.opType("", -3) === "v", "types d'opération");

// --- Trade Republic (export officiel des transactions, avril 2026)
let r = PF3.read(fx("traderepublic.csv"));
ok(r.format === "traderepublic" && r.broker === "trade-republic", "TR détecté " + r.format);
const trBuys = r.ops.filter(o => o.t === "a"), trSells = r.ops.filter(o => o.t === "v"), trDiv = r.ops.filter(o => o.t === "d");
ok(trBuys.length === 5 && trSells.length === 1 && trDiv.length === 1, "TR : 5 achats, 1 vente, 1 dividende " + JSON.stringify(r.ops.map(o => o.t)));
ok(trBuys.some(o => o.isin === "FR001400U5Q4" && o.plan && near(o.q, 16.6389351082) && near(o.p, 6.01)), "TR : plan d'investissement en fractions");
ok(trSells[0].isin === "FR0000121014" && trSells[0].q === 1 && trSells[0].p === 650 && trSells[0].f === 1, "TR : vente (quantité négative dans le fichier)");
ok(near(trDiv[0].p, 0.48), "TR : dividende net de la retenue " + trDiv[0].p);
ok(r.ignored.some(i => /crypto/.test(i.why)) && r.ignored.filter(i => /espèces/.test(i.why)).length === 3, "TR : crypto et mouvements d'espèces ignorés " + JSON.stringify(r.ignored));
{ const lv = r.ops.filter(o => o.isin === "FR0000121014").map(o => [o.date, o.t, o.q, o.p, o.f]); const pp = PF3.position(lv);
  ok(pp.q === 1 && near(pp.pru, 610.5) && near(pp.real, 650 - 1 - 610.5), "TR : PRU LVMH après vente " + JSON.stringify(pp)); }
// Variante point-virgule
r = PF3.read(fx("traderepublic.csv").replace(/","/g, '";"'));
ok(r.format === "traderepublic" && r.ops.length === 7, "TR : variante point-virgule");

// --- BoursoBank (export des positions)
r = PF3.read(fx("boursobank.csv"));
ok(r.format === "boursobank" && r.delim === ";" && r.dec === ",", "Bourso détecté");
ok(r.positions.length === 4 && r.positions[0].isin === "FR0011871128" && r.positions[0].q === 35, "Bourso : 4 positions");
ok(near(r.positions[0].pru, (1683.5 - 97.3) / 35), "Bourso : PRU déduit de la valeur et de la plus-value latente " + r.positions[0].pru);
ok(near(r.positions[3].pru, 231.47), "Bourso : PRU de la colonne buyingPrice quand la valeur manque");

// --- Degiro (transactions, anglais et français)
r = PF3.read(fx("degiro-en.csv"));
ok(r.format === "degiro" && r.ops.length === 4, "Degiro EN détecté " + r.format + " " + r.ops.length);
{ const ap = r.ops.filter(o => o.isin === "US0378331005"); const buy = ap.find(o => o.t === "a"), sell = ap.find(o => o.t === "v");
  ok(buy && near(buy.p, 892.86 / 5) && near(buy.f, 4.23) && buy.cur === "EUR" && buy.curLocal === "USD" && buy.pLocal === 200, "Degiro : achat en dollars converti en euros au taux du jour " + JSON.stringify(buy));
  ok(sell && sell.q === 2 && near(sell.p, 211.2) && near(sell.f, 3.06), "Degiro : vente (quantité négative) " + JSON.stringify(sell));
  const pp = PF3.position(ap.map(o => [o.date, o.t, o.q, o.p, o.f]));
  ok(pp.q === 3 && near(pp.pru, (892.86 + 4.23) / 5) && near(pp.real, 422.4 - 3.06 - 2 * (892.86 + 4.23) / 5), "Degiro : PRU en euros après vente partielle " + JSON.stringify(pp)); }
ok(r.ops.find(o => o.isin === "NL0010273215").date === "2026-04-15", "Degiro : date JJ-MM-AAAA");
r = PF3.read(fx("degiro-fr.csv"));
ok(r.format === "degiro" && r.ops.length === 2 && near(PF3.position(r.ops.map(o => [o.date, o.t, o.q, o.p, o.f])).pru, (1282 + 600.2) / 3), "Degiro FR : PRU " + JSON.stringify(r.ops));

// --- Fortuneo (historique des opérations, ligne de titre avant l'en-tête ; export du portefeuille)
r = PF3.read(fx("fortuneo.csv"));
ok(r.format === "fortuneo" && r.ops.length === 5, "Fortuneo détecté " + r.format + " " + r.ops.length + " " + JSON.stringify(r.ignored));
{ const sa = r.ops.filter(o => o.name === "SANOFI"), pp = PF3.position(sa.map(o => [o.date, o.t, o.q, o.p, o.f]));
  ok(pp.q === 9 && near(pp.pru, (885.95 + 422.45) / 15) && near(pp.divs, 59.4), "Fortuneo : PRU Sanofi, vente partielle, dividende " + JSON.stringify(pp)); }
r = PF3.read(fx("fortuneo-portefeuille.csv"));
ok(r.format === "fortuneo-pf" && r.positions.length === 2 && near(r.positions[0].pru, 541.35) && r.positions[1].isin === "FR0000120578", "Fortuneo : positions " + JSON.stringify(r.positions));

// --- pytr (fichier non officiel) et fichier générique avec correspondance des colonnes
r = PF3.read(fx("pytr.csv"));
ok(r.format === "pytr" && r.ops.length === 4, "pytr détecté");
ok(near(r.ops.find(o => o.isin === "FR001400U5Q4").p, 5.9) && r.ops.find(o => o.isin === "FR001400U5Q4").name.startsWith("Amundi"), "pytr : prix hors frais, nom tiré de la note");
r = PF3.read(fx("generique.csv"));
ok(r.format === "generic" && r.map.date === 0 && r.map.name === 1 && r.map.type === 2 && r.map.qty === 3 && r.map.price === 4 && r.map.fees === 5, "générique : colonnes devinées " + JSON.stringify(r.map));
ok(r.ops.length === 3 && r.ops[0].name === "LVMH" && near(r.ops[0].p, 602.1) && r.ops[2].t === "v", "générique : opérations " + JSON.stringify(r.ops));
r = PF3.read("Valeur;Combien;Prix\nLVMH;3;600\n", { map: { name: 0, qty: 1, pru: 2 } });
ok(r.positions.length === 1 && r.positions[0].q === 3 && r.positions[0].pru === 600, "générique : correspondance choisie à la main → positions");
r = PF3.read("");
ok(r.error && !r.ops.length, "fichier vide");

// =====================================================================
// --- Import : reconstitution des positions (jamais l'ordre des lignes du fichier)
// =====================================================================
const act = R => Object.fromEntries(R.active.map(a => [a.isin || a.name, a]));
// Oracle indépendant : la somme des quantités achetées, vendues et ajoutées par division, titre par titre, lue à la main dans le fichier TR
const trOracle = txt => { const rows = txt.trim().split("\n").map(l => l.slice(1, -1).split('","')), H = rows[0], ix = n => H.indexOf(n), net = {}, ids = new Set();
  for (const r of rows.slice(1)) { if (r[0] === "datetime" || ids.has(r[ix("transaction_id")])) continue; ids.add(r[ix("transaction_id")]);
    const cat = r[ix("category")], t = r[ix("type")], s = r[ix("symbol")], q = +r[ix("shares")] || 0;
    if (!/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(s)) continue;
    if (cat === "TRADING" && (t === "BUY" || t === "SELL")) net[s] = (net[s] || 0) + q; else if (t === "SPLIT") net[s] = (net[s] || 0) + q; else if (t === "BUY_CANCELLED") net[s] = (net[s] || 0) - q; }
  return net; };
{ // Le scénario de Romain : six premières lignes d'achats (revendus depuis), positions actuelles en fin de fichier
  const txt = fx("traderepublic-romain.csv"), r1 = PF3.read(txt), R1 = PF3.reconstruct(r1), A = act(R1);
  ok(r1.format === "traderepublic" && r1.kind === "operations", "TR Romain : journal d'opérations détecté " + r1.kind);
  const firstSix = r1.ops.filter(o => o.t === "a").slice(0, 6).map(o => o.isin);
  ok(firstSix.length === 6 && firstSix.every(i => !A[i]) && firstSix.every(i => R1.sold.some(s => s.isin === i)), "TR Romain : les 6 premières lignes (vendues) ne sont PAS des positions actives " + firstSix);
  const net = trOracle(txt), held = Object.entries(net).filter(([, q]) => q > 1e-9);
  ok(held.length === 12 && R1.active.length === 12, `TR Romain : 12 positions détenues (oracle ${held.length}, import ${R1.active.length})`);
  ok(held.every(([i, q]) => A[i] && near(A[i].q, q, 1e-6)), "TR Romain : aucune position active perdue, quantités exactes " + held.filter(([i, q]) => !A[i] || !near(A[i].q, q, 1e-6)).map(x => x[0]));
  ok(R1.sold.length === 6 && R1.sold.every(s => !(net[s.isin] > 1e-9)), "TR Romain : 6 positions soldées listées comme vendues " + R1.sold.map(s => s.name));
  ok(near(A.US67066G1040.q, 10) && near(A.US67066G1040.pru, 88.1), "TR Romain : division Nvidia (+9 titres), PRU divisé par 10 " + A.US67066G1040.pru);
  ok(near(A.FR0000120271.q, 12) && near(A.FR0000120271.pru, (584 + 1 + 280.5 + 1) / 15), "TR Romain : TotalEnergies, deux achats puis vente partielle, PRU inchangé " + A.FR0000120271.pru);
  ok(near(A.FR001400U5Q4.q, 14 * 0 + [5.42, 5.38, 5.61, 5.70, 5.83, 5.95, 5.66, 5.31, 5.58, 5.74, 5.86, 5.92, 6.01, 6.10].reduce((a, p) => a + Math.round(100 / p * 1e10) / 1e10, 0), 1e-5) && near(A.FR001400U5Q4.cost, 1400, 0.01), "TR Romain : plan d'investissement en fractions (14 × 100 €) " + A.FR001400U5Q4.q);
  ok(near(A.FR0000052292.q, 1) && near(A.FR0000052292.pru, 2296), "TR Romain : achat annulé le même jour retiré, l'achat du lendemain gardé " + A.FR0000052292.q);
  ok(r1.ignored.filter(i => i.kind === "annule").length === 2, "TR Romain : l'ordre annulé et son annulation restent visibles dans les lignes ignorées");
  ok(r1.dups === 2 && r1.ignored.some(i => /en-tête répété/.test(i.why)), "TR Romain : deux exports mis bout à bout, doublons comptés une fois " + r1.dups);
  ok(R1.crypto.length === 1 && R1.crypto[0].name === "Bitcoin" && near(R1.crypto[0].q, 0.002), "TR Romain : cryptomonnaie signalée, non importée");
  ok(R1.checks.every(c => c.ok) && R1.checks[0].t.startsWith(`${r1.rows} lignes lues sur ${r1.rows}`), "TR Romain : contrôles au vert, toutes les lignes comptées " + JSON.stringify(R1.checks.filter(c => !c.ok)));
  ok(R1.active.every(a => a.ops && near(PF3.position(a.ops).q, a.q, 1e-6) && near(PF3.position(a.ops).pru, a.pru, 1e-6)), "TR Romain : opérations enregistrées = même quantité et même PRU");
  ok(R1.active.every(a => { const l = PF3.cleanLine({ k: "x:" + a.isin, cur: a.cur, o: a.ops }); return l && near(l.q, a.q, 1e-6); }), "TR Romain : quantités gardées après enregistrement (6 décimales)");
  // L'ordre du fichier ne change rien : mêmes positions si les lignes sont inversées
  const lines = txt.trim().split("\n"), rev = [lines[0], ...lines.slice(1).filter(l => !l.startsWith('"datetime"')).reverse()].join("\n");
  const Rr = PF3.reconstruct(PF3.read(rev)), Ar = act(Rr);
  ok(Rr.active.length === 12 && R1.active.every(a => Ar[a.isin] && near(Ar[a.isin].q, a.q, 1e-6) && near(Ar[a.isin].pru, a.pru, 1e-6)), "TR Romain : fichier inversé, mêmes positions et mêmes PRU");
  // Limite gratuite : 10 positions actives, les plus grosses en valeur ; jamais les premières lignes
  const top = PF3.pick(R1.active, 10, a => a.cost), small = R1.active.filter(a => !top.includes(a));
  ok(top.length === 10 && small.length === 2 && small.every(s => top.every(t => t.cost >= s.cost)), "limite gratuite : les 10 plus grosses positions actives sont retenues " + small.map(s => s.name));
  ok(PF3.pick(R1.active, Infinity, a => a.cost).length === 12, "Premium : aucune limite");
}
{ // Journal générique : ventes totales, achats et ventes partiels, doublon exact, devises, transferts entrants, division, ligne de synthèse
  const r2 = PF3.read(fx("journal-generique.csv")), R2 = PF3.reconstruct(r2), A = act(R2);
  ok(r2.format === "generic" && R2.active.length === 5 && R2.sold.length === 2, "journal : 5 positions détenues, 2 vendues " + R2.active.map(a => a.name) + " / " + R2.sold.map(a => a.name));
  ok(near(A.US0378331005.q, 5) && near(A.US0378331005.pru, (741.8 + 346) / 6) && A.US0378331005.cur === "USD", "journal : Apple en dollars, vente partielle, PRU " + A.US0378331005.pru);
  ok(R2.extraIgn.some(i => /en EUR, alors que la position est suivie en USD/.test(i.why)) && A.US0378331005.amb.some(t => /autre devise/.test(t)), "journal : l'achat en euros d'un titre suivi en dollars est signalé, pas mélangé");
  ok(near(A.US67066G1040.q, 20) && near(A.US67066G1040.pru, 2401 / 20) && A.US67066G1040.amb.some(t => /division/.test(t)), "journal : division (+18 titres), à vérifier");
  ok(near(A.FR0000120073.q, 5) && near(A.FR0000120073.pru, 150) && !A.FR0000120073.needPru, "journal : transfert entrant avec son PRU");
  ok(A.FR0000073272.needPru && A.FR0000073272.amb.some(t => /sans prix de revient/.test(t)), "journal : transfert entrant sans prix, PRU demandé");
  ok(near(A.FR001400U5Q4.q, 120) && A.FR001400U5Q4.nOps === 2, "journal : ligne sans ISIN rattachée au même titre par son nom");
  ok(r2.dups === 1 && r2.ignored.some(i => i.kind === "synthese") && r2.ignored.some(i => i.kind === "cash"), "journal : doublon, ligne « Total » et versement d'espèces écartés avec leur raison");
  ok(R2.checks[0].ok, "journal : toutes les lignes comptées");
  const Rf = PF3.reconstruct(r2, { pru: { [A.FR0000073272.id]: 180 } });
  ok(near(act(Rf).FR0000073272.pru, 180) && !act(Rf).FR0000073272.needPru, "journal : PRU saisi dans l'aperçu pour les titres reçus");
  const Rd = PF3.reconstruct(PF3.read(fx("journal-generique.csv"), { keepDup: true }));
  ok(act(Rd).FR0000121485 && near(act(Rd).FR0000121485.q, 3), "journal : « compter aussi les doublons » garde le second achat Kering (cas ambigu laissé au choix)");
}
{ // État du portefeuille : statut, quantité nulle, ligne de synthèse, titre sur deux lignes, contrôle de la valorisation
  const r3 = PF3.read(fx("etat-portefeuille.csv")), R3 = PF3.reconstruct(r3), A = act(R3);
  ok(r3.kind === "positions" && R3.active.length === 3, "état : 3 positions actives " + R3.active.map(a => a.name));
  ok(R3.sold.map(s => s.isin).sort().join() === "FR0000131906,FR0000133308", "état : « Clôturée », « Vendue » et quantité nulle → vendues " + R3.sold.map(s => s.name));
  ok(near(A.FR0000120073.q, 6) && near(A.FR0000120073.pru, (4 * 160.1 + 2 * 170) / 6) && A.FR0000120073.amb.length, "état : titre sur deux lignes additionné, PRU pondéré, signalé");
  ok(near(A.FR0000120271.q, 20), "état : ligne en double comptée une fois " + A.FR0000120271.q);
  ok(A.FR0000121014.amb.some(t => /valorisation/.test(t)) && !A.FR0000120271.amb.some(t => /valorisation/.test(t)), "état : quantité × cours ≠ valorisation signalé");
  ok(r3.ignored.some(i => i.kind === "synthese"), "état : ligne « Total portefeuille » écartée");
}
{ // pytr en français : dépôt, intérêts, transfert entrant sans prix, vente partielle
  const r4 = PF3.read(fx("pytr-fr.csv")), R4 = PF3.reconstruct(r4), A = act(R4);
  ok(r4.format === "pytr" && R4.active.length === 2, "pytr FR : 2 positions " + R4.active.map(a => a.name));
  ok(near(A.FR001400U5Q4.q, 66.393443) && near(A.FR001400U5Q4.pru, 691 / 116.393443) && A.FR001400U5Q4.name.startsWith("Amundi"), "pytr FR : montants en colonne « Valeur », nom en « Note » " + A.FR001400U5Q4.pru);
  ok(A.FR0000120073.needPru, "pytr FR : « Transfert (Entrant) » sans prix → PRU demandé");
  ok(r4.ignored.filter(i => i.kind === "cash").length === 3, "pytr FR : dépôt, intérêts, remboursement d'impôts ignorés");
}
{ // Vente supérieure aux titres achetés : signalée, jamais masquée
  const R5 = PF3.reconstruct(PF3.read("Date;Opération;Valeur;Quantité;Cours\n2026-01-02;Achat;LVMH;3;600\n2026-02-02;Vente;LVMH;5;650\n2026-03-02;Achat;Orange;10;11\n"));
  ok(!R5.checks.find(c => /Quantités|vente/.test(c.t)).ok && R5.amb.some(a => a.items.some(t => /historique commence/.test(t))), "vente supérieure aux achats signalée");
  ok(R5.active.length === 1 && R5.active[0].name === "Orange", "vente supérieure : la position vendue n'apparaît pas comme détenue");
}
{ // Export puis réimport avec une division : quantité et PRU identiques
  const P0 = PF3.migrate({ v: 3, l: [{ k: "c:nvidia", cur: "USD", o: [["2024-05-20", "a", 1, 880, 1], ["2024-06-10", "r", 9, 0, 0]] }] });
  const csv0 = PF3.toCsv(P0, l => ({ name: "NVIDIA", isin: "US67066G1040", ticker: "" }));
  ok(csv0.includes(";Division;"), "export : la division a son libellé");
  const Rx = PF3.reconstruct(PF3.read(csv0));
  ok(Rx.active.length === 1 && near(Rx.active[0].q, 10) && near(Rx.active[0].pru, 88.1), "réimport d'une division : même quantité et même PRU " + JSON.stringify(Rx.active.map(a => [a.q, a.pru])));
}

// --- Export puis réimport : rien ne se perd
const P = PF3.migrate({ v: 3, l: [{ k: "c:lvmh", env: "pea", br: "boursobank", cur: "EUR", o: [["2026-01-06", "a", 2, 610, 1], ["2026-06-18", "v", 1, 650, 1], ["2026-07-01", "d", 1, 6.5, 0]] }, { k: "e:amundi-msci-world-pea", q: 12, pru: 85.4, env: "pea" }, { k: "x:IE00B4L5Y983", nm: "iShares Core MSCI World", isin: "IE00B4L5Y983", q: 3, pru: 98.12, env: "cto", br: "degiro" }, { k: "c:apple", m: 1000 }] });
const csv = PF3.toCsv(P, l => ({ name: l.nm || l.k.slice(2), isin: l.isin || "", ticker: "" }));
ok(csv.startsWith("﻿Date;Opération;Nom;ISIN") && csv.includes("2026-06-18;Vente;lvmh;;;1;650;1;EUR;PEA;boursobank"), "export CSV " + csv.split("\r\n")[2]);
r = PF3.read(csv);
ok(r.format === "bilan" && r.ops.length === 3 && r.positions.length === 3, "réimport de l'export " + r.format + " " + r.ops.length + "/" + r.positions.length);
ok(r.positions.some(x => x.q === 12 && x.pru === 85.4 && x.env === "PEA") && r.positions.some(x => x.m === 1000) && r.ops.some(o => o.t === "d" && o.p === 6.5), "réimport : positions, montant investi et dividende");

// --- Migration des anciens formats, sans perte
let M = PF3.migrate({ l: [{ k: "c:totalenergies", q: 10, pru: 50 }, { k: "e:cw8", m: 1000 }, { k: "c:lvmh", mode: "qte", q: 0, pru: 0 }, { k: "pas une clé" }], cfg: { courtier: "boursobank", env: "pea", mensuel: "150", ordres: "1" } });
ok(M.v === 3 && M.l.length === 2, "migration pf2 : lignes vides et invalides retirées " + JSON.stringify(M.l));
ok(M.l[0].k === "c:totalenergies" && M.l[0].q === 10 && M.l[0].pru === 50 && M.l[0].env === "pea" && M.l[0].br === "boursobank" && M.l[0].cur === undefined, "migration pf2 : compte et courtier repris, devise de cotation conservée");
ok(M.l[1].m === 1000 && M.cfg.mensuel === "150" && M.cfg.courtier === "boursobank", "migration pf2 : montant investi et habitudes");
ok(JSON.stringify(PF3.migrate(M)) === JSON.stringify(M), "migration idempotente");
M = PF3.migrate({ cfg: { env: "mix" }, l: [{ k: "c:lvmh", q: 3, pru: 600 }] });
ok(M.l[0].env === undefined && M.cfg.env === "mix", "« plusieurs comptes » : pas d'enveloppe imposée aux lignes");
M = PF3.migrate({ ops: [{ id: "lvmh", type: "achat", date: "2025-01-02", q: 2, px: 700, fee: 2 }, { id: "lvmh", type: "vente", date: "2025-06-02", q: 1, px: 750, fee: 2 }, { id: "autre:Ma Société", type: "achat", date: "2025-02-02", q: 5, px: 10, fee: 0 }, { id: "lvmh", type: "dividende", date: "2025-05-02", q: 0, px: 13 }], prix: { "autre:Ma Société": 12 }, broker: "degiro" }, { known: id => id === "lvmh" });
const lv = M.l.find(l => l.k === "c:lvmh"), au = M.l.find(l => l.k.startsWith("x:"));
ok(lv && lv.o.length === 3 && lv.q === 1 && near(lv.pru, 701) && lv.br === "degiro", "migration de l'ancien simulateur : opérations reprises " + JSON.stringify(lv));
ok(au && au.k === "x:ma-societe" && au.nm === "Ma Société" && au.px === 12 && au.q === 5, "migration de l'ancien simulateur : titre hors liste " + JSON.stringify(au));
ok(PF3.migrate(null).l.length === 0 && PF3.migrate("x").v === 3 && PF3.migrate({ l: "x" }).l.length === 0, "données illisibles : portefeuille vide valide");

// --- Taille synchronisable (60 Ko au plus côté serveur) : les vieilles opérations sont résumées sans changer le PRU
const big = { v: 3, l: [] };
for (let i = 0; i < 6; i++) { const o = []; for (let j = 0; j < 400; j++) o.push([`20${10 + Math.floor(j / 12)}-${String(1 + j % 12).padStart(2, "0")}-02`, j % 7 === 6 ? "v" : "a", 1.2345 + j % 3, 50 + j / 10, 1]); big.l.push(PF3.syncLine({ k: "e:etf-" + i, o })); }
const before = big.l.map(l => [l.q, l.pru]);
ok(PF3.size(big) > 60000, "gros historique : " + PF3.size(big) + " octets");
PF3.compact(big);
ok(PF3.size(big) <= 56000, "compacté sous la limite : " + PF3.size(big));
ok(big.l.every((l, i) => near(l.q, before[i][0], 1e-3) && near(l.pru, before[i][1], 1e-3)), "quantités et PRU inchangés après compactage");
ok(big.l.every(l => l.o[0][1] === "r" && typeof l.rv === "number"), "position reprise et plus-value réalisée gardée");

console.log(fails ? `${fails} échec(s) sur ${n}` : `portefeuille : ${n} vérifications OK`);
process.exit(fails ? 1 : 0);
