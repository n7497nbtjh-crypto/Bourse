// Recommandations (cf/site/m/reco.js) : règle PEA, allocation indicative, contraintes d'enveloppe, effet des retours.
// Les calculs purs (objet RECO) sont exécutés hors navigateur. Usage : node tests/t_reco.mjs
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { divergences } from "../data/pea.mjs";
import { validerReco } from "../cf/src/espace.mjs";
const ctx = { module: { exports: null }, console };
vm.createContext(ctx);
vm.runInContext(readFileSync("cf/site/m/reco.js", "utf8"), ctx, { filename: "reco.js" });
const RECO = ctx.module.exports;
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log("ÉCHEC", m); } };

// --- 1. PEA : siège UE/EEE ET impôt sur les sociétés, pas la place de cotation
const pa = (c, d) => RECO.peaAction(c, d).ok;
ok(pa({ id: "lvmh", isin: "FR0000121014", sector: "conso" }) === true, "LVMH éligible");
ok(pa({ id: "equinor", isin: "NO0010096985", sector: "energie" }) === true, "Norvège (EEE) éligible");
ok(pa({ id: "nestle", isin: "CH0038863350", sector: "conso" }) === false, "Suisse hors PEA, même cotée en Europe");
ok(pa({ id: "shell", isin: "GB00BP6MXD84", sector: "energie" }) === false, "Royaume-Uni hors PEA depuis le Brexit");
ok(pa({ id: "wizz-air", isin: "JE00BN574F90", sector: "industrie" }) === false, "Jersey hors PEA");
ok(pa({ id: "klepierre", isin: "FR0000121964", sector: "immo" }) === false, "SIIC exclue du PEA malgré un siège en France");
ok(RECO.peaAction({ id: "klepierre", isin: "FR0000121964", sector: "immo" }).code === "reit", "motif SIIC");
ok(pa({ id: "merlin-properties", isin: "ES0105025003", sector: "immo" }) === false, "SOCIMI exclue");
ok(pa({ id: "nexity", isin: "FR0010112524", sector: "immo" }) === true, "promoteur imposé à l'IS : éligible");
ok(pa({ id: "castellum", isin: "SE0000379190", sector: "immo" }) === true, "foncière suédoise (pas de régime exonéré) : éligible");
ok(pa({ id: "fonciere-x", isin: "BE0003000000", sector: "immo" }) === null, "foncière belge inconnue : à vérifier");
ok(pa({ id: "medtronic", isin: "", sector: "sante", region: "US" }, { medtronic: { isin: "", pays: "Irlande" } }) === null, "sans ISIN mais siège irlandais selon Wikidata : à vérifier");
ok(pa({ id: "nvidia", sector: "tech", region: "US" }) === false, "américaine sans ISIN ni siège européen connu : hors PEA");
ok(pa({ id: "x", sector: "tech", region: "EU" }) === null, "européenne sans ISIN : à vérifier, jamais « oui » par défaut");
ok(pa({ id: "universal-music-group", isin: "NL0015000IY2", sector: "telecom" }, { "universal-music-group": { isin: "NL", pays: "États-Unis" } }) === null, "sources contradictoires : à vérifier");
ok(pa({ id: "x", isin: "US0000000000", sector: "tech" }, { x: { isin: "US", pays: "Irlande" } }) === null, "ISIN hors UE mais siège UE selon Wikidata : à vérifier");
ok(pa(null) === null, "titre inconnu");
const dv = divergences({ companies: [{ id: "a", isin: "NL1" }, { id: "b", isin: "FR1" }, { id: "c", isin: "US1" }, { id: "d", isin: "" }] }, { a: { pays: "États-Unis" }, b: { pays: "France" }, c: { pays: "États-Unis" }, d: { pays: "Irlande" } });
ok(Object.keys(dv).sort().join() === "a,d", "data/pea.mjs : divergences ISIN / Wikidata " + JSON.stringify(dv));
// ETF : éligibilité juridique distincte de l'exposition
const w = RECO.peaEtf({ pea: true, issuer: "Amundi", replication: "synthétique", compo: { p1: ["US", 73.1] } });
ok(w.ok === true && w.swap && w.expo.pays === "US" && w.expo.pct === 73.1, "ETF Monde PEA : éligible, exposé à 73 % aux États-Unis");
ok(RECO.peaEtf({ pea: false }).ok === false && RECO.peaEtf({ pea: null }).ok === null, "ETF non éligible / non indiqué");

// --- 2. Profil et allocation
const A = (o = {}) => ({ horizon: 2, baisse: 2, precaution: 2, connaissance: 1, choisir: 1, perte: 3, liquidite: 2, objectif: 2, capital: 2, versement: 2, enveloppe: 0, ...o });
ok(!RECO.profil({ horizon: 2 }).complet && RECO.profil({ horizon: 2 }).manque.length === 10, "profil incomplet : questions manquantes listées");
const P1 = RECO.profil(A());
ok(P1.complet && P1.eq === 75 && P1.eqMin === 65 && P1.eqMax === 75, "dynamique : 75 % d'actions, fourchette bornée par le plafond " + JSON.stringify([P1.eq, P1.eqMin, P1.eqMax]));
ok(P1.niveau === 4 && P1.label === "Dynamique", "niveau 4");
ok(P1.dMax === 10, "actions en direct : 10 % au plus (connaissances de base, un peu de choix)");
const sum = P => P.classes.reduce((a, x) => a + x.v, 0);
ok(sum(P1) === 100, "les classes centrales font 100 % : " + sum(P1));
ok(P1.classes.every(x => x.r[0] <= x.v && x.v <= x.r[1] && x.r[0] % 5 === 0 && x.r[1] % 5 === 0), "fourchettes arrondies à 5 et encadrant la valeur centrale");
const P2 = RECO.profil(A({ horizon: 0 }));
ok(P2.eq <= 30 && P2.eqMax <= 30 && P2.prereq.some(t => /5 ans/.test(t)), "horizon < 5 ans : 30 % d'actions au plus");
ok(P2.classes.every(x => x.k !== "oblig"), "court terme : la part prudente reste sans risque de perte en capital");
const P3 = RECO.profil(A({ perte: 0 }));
ok(P3.eq === 10 && P3.niveau === 1 && P3.dMax === 0, "aucune perte supportable : 10 % d'actions, pas d'action en direct");
const P4 = RECO.profil(A({ objectif: 0 }));
ok(P4.eq <= 30, "objectif protéger : 30 % au plus");
const P5 = RECO.profil(A({ connaissance: 0 }));
ok(P5.eq <= 70 && P5.dMax === 0, "débutant : 70 % au plus, pas d'action en direct");
const P6 = RECO.profil(A({ choisir: 2, connaissance: 2, baisse: 3 }));
ok(P6.dMax === 25 && P6.eq === 90, "investisseur aguerri : 90 % d'actions dont 25 % au plus en direct");
ok(RECO.profil(A({ precaution: 0 })).prereq[0].includes("épargne de précaution"), "pas d'épargne de précaution : rappel en premier");
const minEq = [0, 1, 2, 3].map(b => RECO.profil(A({ baisse: b })).eq);
ok(minEq.every((v, i) => i === 0 || v >= minEq[i - 1]), "plus de tolérance aux baisses → jamais moins d'actions " + minEq);
// toutes les combinaisons : jamais de NaN, toujours 100 %, plafond respecté
let all = true;
for (let h = 0; h < 3; h++) for (let b = 0; b < 4; b++) for (let p = 0; p < 4; p++) for (let l = 0; l < 3; l++) for (let o = 0; o < 4; o++) for (let k = 0; k < 3; k++) {
  const P = RECO.profil(A({ horizon: h, baisse: b, perte: p, liquidite: l, objectif: o, connaissance: k }));
  if (sum(P) !== 100 || !(P.eqMax <= P.plafond) || P.classes.some(x => !isFinite(x.v) || x.v < 0) || P.eq > [30, 60, 90][h]) { all = false; console.log("combinaison", h, b, p, l, o, k, P.eq, sum(P)); break; }
}
ok(all, "2 592 combinaisons : 100 %, plafond respecté, pas de valeur négative");

// --- 3. Contraintes d'enveloppe
ok(/Pas possible dans un PEA/.test(RECO.placement("pea", "oblig")), "PEA : pas d'obligations");
ok(/européennes/.test(RECO.placement("pea", "direct")), "PEA : actions européennes seulement");
ok(/fonds en euros/.test(RECO.placement("av", "garanti")), "assurance-vie : fonds en euros");
ok(RECO.profil(A({ enveloppe: 0 })).env === "pea" && RECO.profil(A({ enveloppe: 3 })).env === "av", "enveloppe lue");

// --- 4. Niveau de risque
ok(RECO.risqueAction({ taille: "large" }) === 3 && RECO.risqueAction({ taille: "micro" }) === 5 && RECO.risqueAction({ taille: "small", perte: true }) === 5, "risque d'une action : 3 à 5");
ok(RECO.risqueEtf({ categorie: "monetaire" }) === 1 && RECO.risqueEtf({ categorie: "actions-monde" }) === 3 && RECO.risqueEtf({ categorie: "theme" }) === 4, "risque des ETF");
ok(P1.riskMax === 4 && RECO.profil(A({ perte: 0 })).riskMax === 2, "plafond de risque selon le profil");

// --- 5. Effet des retours
const C = [
  { id: "c:a", kind: "ent", risk: 4, s: 5, tags: ["sect:tech", "taille:small"] },
  { id: "c:b", kind: "ent", risk: 3, s: 4, tags: ["sect:sante", "taille:mid"] },
  { id: "c:c", kind: "ent", risk: 3, s: 3, tags: ["sect:tech", "taille:large"] },
  { id: "c:d", kind: "ent", risk: 3, s: 2, tags: ["sect:conso", "taille:mid"] },
  { id: "c:e", kind: "ent", risk: 4, s: 1, tags: ["sect:energie", "taille:small"] },
];
const ids = l => l.map(x => x.id).join(",");
let sel = RECO.choisir(C, { n: 3, riskMax: 4, uniq: "sect:" });
ok(ids(sel) === "c:a,c:b,c:d", "sans retour : un secteur par piste " + ids(sel));
sel = RECO.choisir(C, { n: 3, riskMax: 4, modele: RECO.modele([{ id: "c:a", v: "risque", risk: 4, tags: ["sect:tech"] }]), uniq: "sect:" });
ok(sel.every(x => x.risk <= 3) && !sel.some(x => x.id === "c:a"), "« trop risquée » (4/5) : plus aucune piste de risque 4 " + ids(sel));
const Mr = RECO.modele([{ id: "c:a", v: "risque", risk: 4, kind: "ent" }]);
ok(RECO.profil(A(), [{ id: "c:a", v: "risque", risk: 4, kind: "ent" }]).eq === 70 && Mr.eqAdj === 5, "« trop risquée » : 5 points d'actions en moins");
ok(RECO.profil(A(), Array.from({ length: 6 }, (_, i) => ({ id: "x" + i, v: "risque", risk: 5 }))).eq === 60, "au plus 15 points retirés");
sel = RECO.choisir(C, { n: 3, riskMax: 4, modele: RECO.modele([{ id: "c:b", v: "redondant", tags: ["sect:sante"] }]), uniq: "sect:" });
ok(!sel.some(x => x.id === "c:b") && ids(sel) === "c:a,c:d,c:e", "« redondante » : piste retirée, remplacée par la suivante " + ids(sel));
sel = RECO.choisir(C, { n: 2, riskMax: 4, modele: RECO.modele([{ id: "c:x", v: "ok", tags: ["sect:conso"] }, { id: "c:y", v: "ok", tags: ["sect:conso"] }, { id: "c:z", v: "ok", tags: ["sect:conso"] }]), uniq: "sect:" });
ok(sel[0].id === "c:d", "« pertinente » : les pistes semblables passent devant " + ids(sel));
sel = RECO.choisir(C, { n: 3, riskMax: 4, modele: RECO.modele([{ id: "c:a", v: "inadapte", tags: ["sect:tech"] }]), uniq: "sect:" });
ok(!sel.some(x => x.id === "c:a") && sel[0].id === "c:b", "« inadaptée » : retirée, le secteur perd du poids " + ids(sel));
const Mlast = RECO.modele([{ id: "c:a", v: "inadapte", at: 1 }, { id: "c:a", v: "ok", at: 2, tags: [] }]);
ok(!Mlast.excl.has("c:a"), "le dernier avis sur une piste remplace le précédent");
ok(RECO.choisir(C, { n: 5, riskMax: 4, held: new Set(["c:a"]) }).every(x => x.id !== "c:a"), "une ligne déjà détenue n'est pas proposée");

// --- 6. Enregistrement côté serveur (validation)
const v = validerReco({ reponses: { horizon: 2, perte: 9 } });
ok(v.error && /perte/.test(v.error), "réponse hors bornes refusée");
const v2 = validerReco({ reponses: { horizon: 2, enveloppe: 4, inconnu: 3 }, retours: [{ id: "c:a", v: "risque", kind: "ent", tags: ["<b>x</b>"], risk: 4, at: 5 }, { id: "c:b", v: "pirate" }, "x"] });
ok(!v2.error && v2.reponses.horizon === 2 && v2.reponses.enveloppe === 4 && !("inconnu" in v2.reponses), "réponses connues seulement");
ok(v2.retours.length === 2 && v2.retours[0].tags[0] === "bx/b" && v2.retours[1].v === null, "retours nettoyés " + JSON.stringify(v2.retours));
ok(validerReco({ reponses: {} }).retours === undefined, "sans retours : la liste enregistrée n'est pas écrasée");

console.log(`${n - fails}/${n} vérifications réussies`);
process.exit(fails ? 1 : 0);
