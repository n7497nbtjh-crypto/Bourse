// Générateur du lot auto1 à partir des données brutes de data/diag/auto1/ (Wikidata, filings.xbrl.org, GLEIF, Euronext, Nasdaq Nordic, OpenFIGI, SEC).
// node data/diag/auto1/gen/gen.mjs . --max-us 350 --max-eu-nodata 150 --max-monde 120 --write   (SCRATCH=dossier pour sel.json et drop.json, par défaut /tmp)
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { K as K0 } from "./kinds.mjs";
import { SIC } from "./sic.mjs";
import { IND, INST, INST_EXCLU, EXCLU_RE } from "./wdmap.mjs";
const REPO = process.argv[2], D = REPO + "/data/diag/auto1/";
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? +process.argv[i + 1] : d; };
const J = f => existsSync(D + f) ? JSON.parse(readFileSync(D + f)) : {};
const { isinOk } = await import(pathToFileURL(REPO + "/data/isin.mjs").href);
// Liste existante, sans le lot auto1 lui-même (s'il est déjà branché dans univers.mjs)
const LOT = process.argv.includes("--lot") ? process.argv[process.argv.indexOf("--lot") + 1] : "auto1", ONLY_US = process.argv.includes("--only-us");
const AUTO = existsSync(REPO + "/data/lots/" + LOT + ".mjs") ? new Set((await import(pathToFileURL(REPO + "/data/lots/" + LOT + ".mjs").href)).default.map(c => c.id)) : new Set();
const U = (await import(pathToFileURL(REPO + "/data/univers.mjs").href)).default.filter(c => !AUTO.has(c.id));
console.log("liste existante :", U.length, "sociétés");
const W = J("wd.json"), LB = J("wdlab.json"), E = J("esef.json"), G = J("gleif.json"), F = J("figi.json"), SB = J("sec_base.json"), SS = J("sec_subs.json");
const K = { ...K0,
  gen_industrie: { sector: "industrie", desc: "Industrie et services aux entreprises.", fait: "Fournit des produits, des équipements ou des services aux entreprises.", argent: "La vente de ses produits et de ses services aux entreprises et aux collectivités.", depend: "L'activité économique et les investissements de ses clients." },
  gen_conso: { sector: "conso", desc: "Produits et services pour les particuliers.", fait: "Vend des produits ou des services aux particuliers.", argent: "Les ventes aux particuliers, directement ou par des distributeurs.", depend: "Le pouvoir d'achat des ménages et la concurrence." },
  gen_tech: { sector: "tech", desc: "Technologies et services numériques.", fait: "Conçoit et vend des produits ou des services technologiques.", argent: "La vente de produits, de logiciels ou de services aux entreprises et aux particuliers.", depend: "Les dépenses technologiques des entreprises et la concurrence." },
  gen_energie: { sector: "energie", desc: "Énergie.", fait: "Produit, transporte ou vend de l'énergie.", argent: "La vente d'énergie ou de services liés à l'énergie.", depend: "Les prix de l'énergie et la demande." },
  gen_sante: { sector: "sante", desc: "Santé.", fait: "Fournit des produits ou des services de santé.", argent: "La vente de ses produits ou de ses services aux patients, aux hôpitaux et aux professionnels de santé.", depend: "Les remboursements, les autorisations sanitaires et la concurrence." },
  gen_materiaux: { sector: "materiaux", desc: "Matériaux de base.", fait: "Produit ou transforme des matériaux de base.", argent: "La vente de matériaux aux industriels.", depend: "Le prix des matières premières et la demande industrielle." },
  gen_finance: K0.services_financiers, gen_telecom: K0.telecom, gen_services: { sector: "services", desc: "Services aux collectivités : énergie, eau ou gaz.", fait: "Fournit de l'électricité, du gaz ou de l'eau aux particuliers et aux entreprises.", argent: "La vente d'énergie ou d'eau, et des tarifs de réseau souvent encadrés.", depend: "Les tarifs fixés par les régulateurs, les prix de l'énergie et les taux d'intérêt." },
  gen_immo: K0.immo,
  sante_gen: { sector: "sante", desc: "Santé.", fait: "Fournit des produits ou des services de santé.", argent: "La vente de ses produits ou de ses services aux patients, aux hôpitaux et aux professionnels de santé.", depend: "Les remboursements, les autorisations sanitaires et la concurrence." },
  materiaux_gen: { sector: "materiaux", desc: "Matériaux de base et chimie.", fait: "Produit des matériaux de base ou des produits chimiques.", argent: "La vente de matériaux aux industriels.", depend: "Le prix des matières premières et la demande industrielle." },
  petrole_gen: { sector: "energie", desc: "Pétrole et gaz.", fait: "Travaille dans le pétrole et le gaz (production, transport, raffinage ou distribution).", argent: "La vente de pétrole, de gaz, de carburants ou de services liés.", depend: "Le prix du pétrole et du gaz." },
  mines_gen: { sector: "materiaux", desc: "Exploitation minière.", fait: "Exploite des mines et vend les minerais ou les métaux extraits.", argent: "La vente des minerais et des métaux extraits.", depend: "Le cours des matières premières extraites et les coûts d'exploitation." },
  auto_gen: { sector: "industrie", desc: "Industrie automobile.", fait: "Travaille pour l'industrie automobile : véhicules, pièces ou équipements.", argent: "La vente de véhicules, de pièces ou d'équipements.", depend: "La production et les ventes de voitures." },
  electronique: { sector: "tech", desc: "Électronique.", fait: "Conçoit et fabrique des produits ou des composants électroniques.", argent: "La vente de ses produits aux industriels et aux particuliers.", depend: "La demande d'électronique et le prix des composants." },
  grossiste: { sector: "industrie", desc: "Commerce de gros et distribution.", fait: "Achète des produits en grande quantité et les revend aux professionnels.", argent: "Une marge sur les produits revendus.", depend: "L'activité de ses clients et la concurrence." },
  transport_gen: { sector: "industrie", desc: "Transport de personnes ou de marchandises.", fait: "Transporte des personnes ou des marchandises.", argent: "Le prix du transport facturé aux clients.", depend: "L'activité économique, les volumes transportés et le prix du carburant." },
  transport_public: { sector: "industrie", desc: "Transport public de voyageurs.", fait: "Exploite des réseaux de bus, de trains ou de métros.", argent: "Des contrats avec les autorités de transport et la vente de billets.", depend: "Les contrats publics, la fréquentation et le coût de l'énergie et du personnel." },
  promoteur_immo: { sector: "immo", desc: "Promotion immobilière.", fait: "Développe et vend des projets immobiliers (logements, bureaux, commerces).", argent: "La vente des biens construits.", depend: "Les taux des crédits, la demande de logements et le coût de la construction." },
  hotels_gen: { sector: "conso", desc: "Hôtellerie et restauration.", fait: "Exploite des hôtels ou des restaurants.", argent: "Les nuits d'hôtel et les repas vendus.", depend: "Le tourisme, les voyages d'affaires et la consommation des ménages." },
  utilities_gen: { sector: "services", desc: "Services aux collectivités : énergie, eau ou gaz.", fait: "Fournit de l'électricité, du gaz ou de l'eau aux particuliers et aux entreprises.", argent: "La vente d'énergie ou d'eau, et des tarifs de réseau souvent encadrés.", depend: "Les tarifs fixés par les régulateurs, les prix de l'énergie et les taux d'intérêt." },
  cybersecurite: { sector: "tech", desc: "Cybersécurité.", fait: "Développe des logiciels et des services de protection contre les attaques informatiques.", argent: "Les abonnements, les licences et les services.", depend: "Les budgets de sécurité informatique des entreprises." },
  fintech: { sector: "finance", desc: "Services financiers en ligne.", fait: "Propose des services financiers en ligne (paiement, crédit, épargne ou courtage).", argent: "Des commissions et des intérêts sur les services rendus.", depend: "Le nombre de clients, les taux d'intérêt et la réglementation." },
  divertissement: { sector: "telecom", desc: "Divertissement : contenus et spectacles.", fait: "Produit et diffuse des contenus ou des spectacles de divertissement.", argent: "La vente de contenus, de billets et de droits.", depend: "Le succès des contenus et les habitudes du public." },
  musique: { sector: "telecom", desc: "Musique : enregistrement, édition et concerts.", fait: "Produit, édite ou diffuse de la musique.", argent: "Les droits sur la musique écoutée en streaming, vendue ou diffusée, et les concerts.", depend: "Le succès des artistes et la croissance du streaming." },
  batteries: { sector: "industrie", desc: "Batteries.", fait: "Fabrique des batteries ou des composants de batteries.", argent: "La vente de batteries aux constructeurs automobiles et aux industriels.", depend: "La demande de voitures électriques et de stockage d'énergie, et le prix des métaux." },
  robotique: { sector: "industrie", desc: "Robots et automatisation industrielle.", fait: "Conçoit des robots, des automatismes ou des systèmes de contrôle pour l'industrie.", argent: "La vente d'équipements et de logiciels, puis les services.", depend: "Les investissements des industriels." },
  distrib_materiaux: { sector: "industrie", desc: "Distribution de matériaux de construction.", fait: "Distribue des matériaux et des équipements aux professionnels du bâtiment.", argent: "Une marge sur les produits revendus.", depend: "L'activité du bâtiment et de la rénovation." },
};
const GENS = new Set(Object.keys(K).filter(k => /gen/.test(k)).concat(["services_financiers", "grossiste", "transport_gen", "electronique", "conglomerat", "investissement"]));
for (const v of Object.values(IND).concat(Object.values(INST)).concat(Object.values(SIC))) if (v && !K[v]) throw new Error("type inconnu " + v);

// ---------- Existant ----------
const norm = s => String(s || "").replace(/[øØ]/g, "o").replace(/[æÆ]/g, "ae").replace(/ß/g, "ss").replace(/[łŁ]/g, "l").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ")
  .replace(/\b(the|plc|p\.?l\.?c|s\.?a|s\.?e|a\.?g|n\.?v|asa|ab|oyj|abp|spa|s\.p\.a|inc|incorporated|corp|corporation|ltd|limited|group|groupe|gruppo|grupo|holding|holdings|co|company|as|a\/s|publ|se|sa|nv|bv|kgaa|kg|gmbh|ag|llc|lp|l\.p|trust|the)\b/g, " ")
  .replace(/[^a-z0-9]+/g, "");
const HAVE = { isin: new Set(U.map(c => c.isin).filter(Boolean)), id: new Set(U.map(c => c.id)), name: new Set(U.map(c => norm(c.name)).concat(U.map(c => norm(c.legal)).filter(Boolean))),
  tv: new Set(U.map(c => c.tv)), sec: new Set(U.map(c => c.sec).filter(Boolean)), cik: new Set(U.map(c => c.cik).filter(Boolean)), domain: new Set(U.map(c => c.domain)) };

// ---------- Outils ----------
const EUC = new Set("AT BE BG CH CY CZ DE DK EE ES FI FR GB GG GR HR HU IE IM IS IT JE LI LT LU LV MT NL NO PL PT RO SE SI SK FO GI".split(" "));
const EU_QID = new Set("Q142 Q183 Q145 Q38 Q29 Q55 Q31 Q32 Q39 Q40 Q34 Q35 Q20 Q33 Q189 Q27 Q45 Q41 Q229 Q233 Q36 Q213 Q214 Q28 Q218 Q219 Q224 Q215 Q191 Q211 Q37 Q347 Q235 Q785 Q25230 Q9676 Q1410 Q4628 Q174193".split(" "));
const US_STATES = new Set("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC PR".split(" "));
const BADHOST = /archive\.org|euronext\.com|nasdaqomx|nasdaq\.com|bolsamadrid|londonstockexchange|facebook|twitter|x\.com$|linkedin|wikipedia|google\.|youtube|instagram|bloomberg|reuters|github\.io|wordpress\.com|blogspot|sec\.gov|jpx\.co\.jp|hkex|asx\.com/;
const hostCount = {}; for (const o of Object.values(W)) for (const w of o.web || []) { try { const h = new URL(w).hostname.replace(/^www\./, "").toLowerCase(); hostCount[h] = (hostCount[h] || 0) + 1; } catch (e) {} }
function domainOf(o) {
  const hs = [];
  for (const w of o.web || []) {
    let h; try { h = new URL(w).hostname.replace(/^www\d?\./, "").toLowerCase(); } catch (e) { continue; }
    if (!h || !h.includes(".") || BADHOST.test(h) || hostCount[h] > 2) continue;
    hs.push(h);
  }
  return hs.sort((a, b) => a.split(".").length - b.split(".").length || (b.endsWith(".com") - a.endsWith(".com")) || a.length - b.length)[0] || null;
}
// Le site doit ressembler au nom de la société (ou à son symbole) : sinon la fiche Wikidata est peut-être périmée
const GENERIC_W = new Set("bank banque banca banco energy energie group groupe holding holdings international industries industrie company capital financial finance services service systems technologies technology global corporation the and pharma medical health insurance properties property real estate invest investment investments partners resources solutions brands foods motor motors air airlines".split(" "));
const TR = s => String(s || "").replace(/[øØ]/g, "o").replace(/[æÆ]/g, "ae").replace(/ß/g, "ss").replace(/[łŁ]/g, "l").replace(/[đĐ]/g, "d").replace(/[þÞ]/g, "th");
const toks = s => TR(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " ").split(/[^a-z0-9]+/).filter(w => w.length >= 3);
function domainMatches(domain, names, ticker) {
  const parts = domain.split("."), lab = (parts.length > 2 && parts[parts.length - 2].length <= 3 ? parts[parts.length - 3] : parts[parts.length - 2]).replace(/-/g, "");
  const all = parts.join("").replace(/-/g, "");
  for (const n of names) {
    const joined = TR(n).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (joined.length >= 2 && (lab === joined || (lab.length >= 3 && joined.startsWith(lab)) || (joined.length >= 4 && all.includes(joined)))) return true;
    const ws2 = TR(n).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const ini2 = ws2.map(w => w[0]).join(""); if (ini2.length >= 2 && lab.startsWith(ini2)) return true;
    if (lab.length >= 2 && ini2.length >= 2 && ini2.startsWith(lab)) return true;
    if (ws2[0] && ws2[0].length >= 3 && lab.length <= 12 && lab.startsWith(ws2[0].slice(0, 3))) return true;
    if (ws2.some(w => w.length >= 2 && /\d/.test(w) && lab.startsWith(w))) return true;
    const ws = toks(n); if (!ws.length) continue;
    if (ws.some(w => !GENERIC_W.has(w) && all.includes(w))) return true;
    if (lab.length >= 3 && ws.join("").includes(lab)) return true;
    const ini = ws.map(w => w[0]).join(""); if (ini.length >= 2 && lab.startsWith(ini)) return true;
    if (ws.some(w => w.length >= 4 && lab.startsWith(w.slice(0, 4)))) return true;
  }
  const t = String(ticker || "").toLowerCase().replace(/[^a-z]/g, ""); if (t.length >= 2 && lab.startsWith(t)) return true;
  return false;
}
const UML = s => String(s || "").replace(/ä/gi, "ae").replace(/ö/gi, "oe").replace(/ü/gi, "ue");
const initials = s => TR(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(w => w && !["and", "of", "the"].includes(w)).map(w => w[0]).join("");
const iniMatch = (a, b) => { const ia = initials(a); return ia.length >= 3 && toks(b).some(w => w.length >= 3 && ia.startsWith(w)); };
const tokOverlap = (a, b) => tokOverlap0(a, b) || tokOverlap0(UML(a), b) || tokOverlap0(a, UML(b)) || iniMatch(a, b) || iniMatch(b, a);
const tokOverlap0 = (a, b) => { if (norm(a) && norm(b) && (norm(a).includes(norm(b)) || norm(b).includes(norm(a)))) return true; const A0 = toks(a), B0 = toks(b); if (!A0.filter(w => !GENERIC_W.has(w)).length || !B0.filter(w => !GENERIC_W.has(w)).length) return A0.some(w => B0.includes(w)); const B = new Set(toks(b).filter(w => !GENERIC_W.has(w))); return toks(a).filter(w => !GENERIC_W.has(w)).some(w => B.has(w) || [...B].some(x => x.startsWith(w) || w.startsWith(x))); };
const slug = s => TR(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-+/g, "-");
const STOP = new Set("entreprise entreprises société sociétés societe groupe group compagnie firme multinationale cotée coté cote en bourse de d du des la le les l et basée basé base dont siège siege à a au aux holding publique anonyme commerciale industriel industrielle financière financier international internationale mondiale mondial nationale national européenne européen européenne principal principale grande grand importante important leader filiale enterprise company sise situé située implanté implantée domicilié domiciliée origine ayant son sur dans par pour une un qui est".split(" "));
const NAT = /^(sino|nordique|scandinave|fran[cç]ais|britanni|allemand|améric|americ|italien|espagnol|suédois|suedois|norvégien|norvegien|danois|finlandais|néerlandais|neerlandais|belge|suisse|autrichien|polonais|grec|grecque|portugais|irlandais|luxembourgeois|chypriote|japonais|chinois|coréen|coreen|sud-coréen|indien|canadien|australien|brésilien|bresilien|mexicain|israélien|israelien|saoudien|taïwanais|taiwanais|hongkongais|singapourien|islandais|maltais|estonien|lituanien|letton|tchèque|tcheque|slovaque|slovène|slovene|croate|roumain|bulgare|hongrois|turc|russe|ukrainien|sud-africain|écossais|ecossais|anglais|gallois|bermudien|jersiais|néo-zélandais|chilien|argentin|colombien|péruvien|indonésien|thaïlandais|malaisien|philippin|vietnamien|égyptien|émirati|qatari|koweïtien|nigérian|kenyan|marocain)/i;
const COUNTRY = /^(france|royaume-uni|allemagne|italie|espagne|suède|norvège|danemark|finlande|pays-bas|belgique|suisse|autriche|pologne|grèce|portugal|irlande|luxembourg|chypre|japon|chine|corée|inde|canada|australie|brésil|mexique|israël|états-unis|etats-unis|islande|europe|monde|londres|paris|tokyo)$/i;
function descFr(o, kd) {
  let d = (o.dfr || "").trim().replace(/\s*[—–]\s*/g, ", ").replace(/\s+/g, " ");
  if (!d || d.length > 88 || /\d{4}|wiki|\(|\)|;|https?:|centrale|ancien|ancienne|disparu|défunt|fondée? en|homonymie|appel public|^(ville|commune|village|rivière|personnalité|site web|page)/i.test(d)) return kd;
  const words = d.toLowerCase().replace(/[’']/g, " ").split(/[\s,]+/).filter(Boolean);
  const meaning = words.filter(w => !STOP.has(w) && !NAT.test(w) && !COUNTRY.test(w) && w.length > 2);
  if (meaning.length < 1) return kd;
  d = d.replace(/^(une?|la|le)\s+/i, ""); d = d.charAt(0).toUpperCase() + d.slice(1); if (!/[.!?]$/.test(d)) d += ".";
  return d;
}
// Type d'activité : un seul type précis, sinon le type générique du secteur commun ; secteurs contradictoires -> indéterminé
const GEN_OF = { industrie: "gen_industrie", conso: "gen_conso", tech: "gen_tech", energie: "gen_energie", sante: "gen_sante", materiaux: "gen_materiaux", finance: "gen_finance", telecom: "gen_telecom", services: "gen_services", immo: "gen_immo" };
let AMBIG = 0;
function kindOf(o, exchSector) {
  const ks = [];
  for (const q of o.inst || []) if (INST[q]) ks.push(INST[q]);
  for (const q of o.ind || []) if (IND[q]) ks.push(IND[q]);
  const spec = [...new Set(ks.filter(k => !GENS.has(k)))], gen = [...new Set(ks.filter(k => GENS.has(k)))];
  let k = null;
  if (spec.length === 1) k = spec[0];
  else if (spec.length > 1) {
    const secs = [...new Set(spec.map(x => K[x].sector))];
    if (secs.length === 1) k = spec.every(x => x === spec[0]) ? spec[0] : GEN_OF[secs[0]];
    else if (exchSector && secs.includes(exchSector)) { const m = spec.filter(x => K[x].sector === exchSector); k = m.length === 1 ? m[0] : GEN_OF[exchSector]; }
    else { AMBIG++; return null; }
  } else if (gen.length) { const secs = [...new Set(gen.map(x => K[x].sector))]; if (secs.length === 1) k = gen[0]; else if (exchSector && secs.includes(exchSector)) k = GEN_OF[exchSector]; else { AMBIG++; return null; } }
  // classement officiel de la bourse prioritaire quand il contredit nettement Wikidata (énergie, matériaux, finance, immobilier, services aux collectivités, santé)
  const STRONG = new Set(["energie", "materiaux", "finance", "immo", "services", "sante"]);
  if (exchSector && (!k || (K[k].sector !== exchSector && (STRONG.has(exchSector) || STRONG.has(K[k].sector))))) k = GEN_OF[exchSector];
  return k;
}
const hasEsef = lei => !!(lei && E[lei] && E[lei].p.some(p => p[1] && p[0] >= "2023-06-30"));
const excluded = o => (o.inst || []).some(q => INST_EXCLU.has(q)) || EXCLU_RE.test(o.en || "") || EXCLU_RE.test(o.den || "") || /central bank|national bank of|banque nationale suisse|banque centrale/i.test((o.en || "") + " " + (o.den || "") + " " + (o.fr || ""));
// Société qui dépose ses comptes annuels à la SEC et cotée à New York : traitée avec les États-Unis
const secFiler = o => (o.cik || []).some(c => { const s = SS[+c]; if (!s) return false; const r = ["10-K", "20-F", "40-F"].map(f => s.fm && s.fm[f]).filter(Boolean).sort().pop(); return r >= "2025-01-01" && (s.x || []).some(x => x === "NYSE" || x === "Nasdaq"); });

// ---------- Listes de cotation ----------
const ENX = {}; // ISIN -> [{p, t, m, turnover}]
{
  const lines = readFileSync(D + "liste_euronext_get.csv", "utf8").split(/\r?\n/);
  const parse = l => { const out = []; let cur = "", q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ";" && !q) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out; };
  for (const l of lines.slice(4)) {
    const c = parse(l); if (c.length < 13) continue;
    const [name, isin, sym, mkt] = c, turn = +c[12] || 0, mk = mkt.split(",")[0].trim();
    let p = null, rank = 9;
    if (/^Euronext (Paris|Amsterdam|Brussels|Lisbon|Dublin)$/.test(mk)) { p = "EURONEXT"; rank = 1; }
    else if (/^Euronext Growth (Paris|Brussels|Lisbon|Dublin)$/.test(mk)) { p = "EURONEXT"; rank = 3; }
    else if (mk === "Euronext Milan") { p = "MIL"; rank = 1; } else if (mk === "Euronext Growth Milan") { p = "MIL"; rank = 3; }
    else if (mk === "Oslo Børs") { p = "OSL"; rank = 1; } else if (/^Euronext (Growth|Expand) Oslo$/.test(mk)) { p = "OSL"; rank = 3; }
    if (!p || !isin) continue;
    (ENX[isin] || (ENX[isin] = [])).push({ p, t: sym.trim().toUpperCase(), m: mk, rank, turn, name });
  }
}
const NORD = {}; const NSECT = {};
for (const f of readdirSync(D).filter(f => f.startsWith("liste_nordic_"))) {
  const [, , m, ...cat] = f.replace(".json", "").split("_"); const main = cat.join("_") === "MAIN_MARKET";
  const p = { STO: "OMXSTO", CPH: "OMXCOP", HEL: "OMXHEX" }[m]; if (!p) continue; // Islande : pas de code Google Finance connu de data/gf.mjs
  for (const r of JSON.parse(readFileSync(D + f)).data.instrumentListing.rows) {
    if (!r.isin || r.assetClass !== "SHARES" || /PREF|\bPR\b/i.test(r.symbol)) continue;
    (NORD[r.isin] || (NORD[r.isin] = [])).push({ p, t: r.symbol.trim().toUpperCase().replace(/\s+/g, "_"), m: m + (main ? "" : " First North"), rank: main ? 1 : 3, turn: +String(r.turnover || "0").replace(/,/g, ""), name: r.fullName });
    if (r.sector) NSECT[r.isin] = r.sector;
  }
}
// Xetra (Deutsche Börse) et SIX : listes officielles des actions négociées
const XS = {};
if (existsSync(D + "liste_xetra.csv")) for (const l of readFileSync(D + "liste_xetra.csv", "utf8").split(/\r?\n/).slice(3)) {
  const f = l.split(";"); if (f.length < 65 || f[1] !== "Active" || f[18] !== "CS") continue;
  const isin = f[3], grp = f[12], prim = f[64];
  if (!(["DEUTSCHLAND", "DAX", "MDAX", "SDAX"].includes(grp) || prim === "XETR" || prim === "XFRA")) continue;
  if (!/^[A-Z0-9]{1,6}$/.test(f[7])) continue;
  (XS[isin] || (XS[isin] = [])).push({ p: "XETR", t: f[7], m: "Xetra " + grp, rank: 1, turn: 0, name: f[2] });
}
if (existsSync(D + "liste_six_fqs2.csv")) for (const l of readFileSync(D + "liste_six_fqs2.csv", "utf8").split(/\r?\n/).slice(1)) {
  const [nm, sym, isin, typ] = l.split(";");
  if (!isin || !/^(CH|LI)/.test(isin) || !["Registered Share", "Bearer Share", "Participation Certificate"].includes(typ) || /2\. LINIE/i.test(nm)) continue;
  (XS[isin] || (XS[isin] = [])).push({ p: "SIX", t: String(sym).toUpperCase(), m: "SIX", rank: 1, turn: 0, name: nm });
}
const NSEC = { "Consumer Staples": "conso", "Consumer Discretionary": "conso", Industrials: "industrie", Energy: "energie", "Health Care": "sante", Technology: "tech", Financials: "finance", Telecommunications: "telecom", "Basic Materials": "materiaux", Utilities: "services", "Real Estate": "immo" };
// Bourse principale attendue selon le pays de l'ISIN (préfixes TradingView) ; pays absents : toute bourse européenne acceptée
const OFFICIAL = new Set("FR NL BE PT IT NO SE DK FI DE CH LI".split(" ")); // listes officielles lues : Euronext, Nasdaq Nordic, Xetra, SIX
const STRONG_HOME = new Set("CH LI DE AT ES PL GR SE DK FI NO IT FR PT CZ HU RO BG HR SI SK EE LT LV".split(" ")); // une cotation hors de ce pays est presque toujours secondaire
const HOME_TV = { FR: ["EURONEXT"], NL: ["EURONEXT"], BE: ["EURONEXT"], PT: ["EURONEXT"], IE: ["EURONEXT", "LSE"], IT: ["MIL"], NO: ["OSL"], SE: ["OMXSTO"], DK: ["OMXCOP"], FO: ["OMXCOP"], FI: ["OMXHEX"],
  GB: ["LSE"], ES: ["BME"], DE: ["XETR"], AT: ["VIE"], CH: ["SIX"], LI: ["SIX"], PL: ["GPW"], GR: ["ATHEX"] };
// OpenFIGI : codes de bourse Bloomberg -> préfixe TradingView
const FX = { LN: "LSE", SM: "BME", GY: "XETR", AV: "VIE", SW: "SIX", SE: "SIX", PW: "GPW", GA: "ATHEX", IM: "MIL", FP: "EURONEXT", NA: "EURONEXT", BB: "EURONEXT", PL: "EURONEXT", ID: "EURONEXT", NO: "OSL" };
const HOME = { GB: ["LN"], JE: ["LN"], GG: ["LN"], IM: ["LN"], IE: ["ID", "LN"], ES: ["SM"], DE: ["GY"], AT: ["AV"], CH: ["SW", "SE"], LI: ["SW", "SE"], PL: ["PW"], GR: ["GA"], IT: ["IM"], FR: ["FP"], NL: ["NA"], BE: ["BB"], PT: ["PL"], LU: ["FP", "NA", "BB", "GY"], CY: ["LN", "GA"], NO: ["NO"], MT: [], HU: [], CZ: [], RO: [], HR: [], SI: [], BG: [], EE: [], LT: [], LV: [], IS: [], DK: [], SE: [], FI: [] };
function figiListing(isin) {
  const L = (F[isin] || []).filter(r => ["Common Stock", "REIT", "Dutch Cert", "NY Reg Shrs"].includes(r[2]) && FX[r[0]]);
  const pref = [...(HOME[isin.slice(0, 2)] || []), "LN", "GY", "SW", "SE", "SM", "IM", "AV", "PW", "GA"];
  for (const code of pref) {
    const r = L.find(x => x[0] === code); if (!r) continue;
    let t = String(r[1]).toUpperCase();
    if (code === "LN") { t = t.replace(/\/$/, ".").replace(/\//g, "."); if (/^0[A-Z0-9]{3}$/.test(t)) continue; } // codes 0XXX : carnet international (cotation secondaire)
    if (!/^[A-Z0-9][A-Z0-9._]*$/.test(t)) continue;
    if (code === "LN" && /^[A-Z0-9]{1,2}$/.test(t)) t += ".";
    return { p: FX[code], t, m: "FIGI " + code, rank: 2, turn: 0, name: r[3] };
  }
  return null;
}
// Wikidata : bourses -> préfixe TradingView
const WX = { Q171240: "LSE", Q2385849: "EURONEXT", Q478720: "EURONEXT", Q1146518: "EURONEXT", Q2415561: "EURONEXT", Q144458: "EURONEXT", Q842108: "EURONEXT", Q936563: "MIL", Q3642744: "MIL",
  Q617426: "BME", Q909158: "OSL", Q151139: "XETR", Q819468: "XETR", Q1019983: "OMXCOP", Q581755: "OMXHEX", Q1019992: "OMXSTO", Q661834: "SIX", Q698535: "VIE", Q59551: "GPW", Q755341: "ATHEX",
  Q217475: "TSE", Q496672: "HKEX", Q732670: "ASX", Q818723: "TSX", Q796297: "BMFBOVESPA", Q891559: "BMV", Q548621: "TWSE", Q1507974: "TASE", Q495364: "KRX", Q495372: "KRX", Q491503: "KRX",
  Q739514: "SSE", Q517750: "SZSE", Q1515558: "SGX", Q2006583: "TADAWUL", Q638740: "NSE", Q13677: "NYSE", Q82059: "NASDAQ" };
const MONDE_EX = new Set(["TSE", "HKEX", "ASX", "TSX", "BMFBOVESPA", "BMV", "TWSE", "TASE", "KRX", "SSE", "SZSE", "SGX", "TADAWUL", "NSE"]);
const TICK_OK = { TSE: /^[0-9][0-9A-Z]{3}$/, HKEX: /^[0-9]{1,5}$/, KRX: /^[0-9]{6}$/, SSE: /^6[0-9]{5}$/, SZSE: /^[0-3][0-9]{5}$/, TWSE: /^[0-9]{4}$/, TADAWUL: /^[0-9]{4}$/, ASX: /^[A-Z0-9]{3}$/,
  TSX: /^[A-Z][A-Z0-9.]{0,6}$/, BMFBOVESPA: /^[A-Z]{4}[0-9]{1,2}$/, BMV: /^[A-Z&]{2,10}[A-Z0-9]{0,4}$/, TASE: /^[A-Z0-9.]{2,8}$/, SGX: /^[A-Z0-9]{3,4}$/, NSE: /^[A-Z0-9&-]{2,12}$/ };
function wdTicker(p, raw) {
  let t = String(raw || "").trim().toUpperCase();
  t = t.replace(/^[A-Z]+:\s*/, "").replace(/\.(HK|T|L|PA|AS|BR|LS|IR|MI|MC|DE|F|VI|WA|AT|SW|ST|CO|HE|OL|AX|TO|SA|MX|TW|TA|KS|KQ|SS|SZ|SI|SR|NS|BO)$/, "");
  if (p === "KRX") t = t.replace(/^A(?=\d{6}$)/, "");
  if (p === "HKEX") t = t.replace(/^0+(?=\d)/, "");
  if (["OMXSTO", "OMXCOP", "OMXHEX"].includes(p)) t = t.replace(/[\s-]+/g, "_");
  if (p === "NYSE" || p === "NASDAQ") t = t.replace(/-/g, ".");
  if (TICK_OK[p] && !TICK_OK[p].test(t)) return null;
  if (!/^[A-Z0-9][A-Z0-9._]*$/.test(t)) return null;
  return t;
}

// ---------- Fabrication d'un enregistrement ----------
const OUT = [], DROP = {}, drop = (why, name) => { (DROP[why] || (DROP[why] = [])).push(name); };
const taken = { id: new Set(HAVE.id), isin: new Set(HAVE.isin), name: new Set(HAVE.name), tv: new Set(HAVE.tv), domain: new Set(HAVE.domain), lei: new Set(), cik: new Set(HAVE.cik), sec: new Set(HAVE.sec) };
function makeId(name, ticker) {
  const cut = (x, n) => x.length <= n ? x : x.slice(0, n).replace(/-[^-]*$/, "");
  let id = cut(slug(name), 48);
  if (!id || taken.id.has(id)) id = cut(slug(name), 40) + "-" + slug(ticker);
  if (taken.id.has(id)) return null;
  return id;
}
function push(rec, extra) {
  if (!/^[A-Z_]+:[A-Z0-9._]+$/.test(rec.tv)) { drop("symbole de cotation non reconnu", rec.name + " / " + rec.tv); return false; }
  if (rec.desc.length > 95) rec.desc = K[extra.kind].desc;
  for (const [k, v] of [["isin", rec.isin], ["name", norm(rec.name)], ["tv", rec.tv], ["domain", rec.domain], ["lei", rec.lei], ["cik", rec.cik], ["sec", rec.sec]]) if (v && taken[k].has(v)) { drop("déjà dans la liste (" + k + ")", rec.name); return false; }
  const id = makeId(rec.name, rec.ticker); if (!id) { drop("identifiant en double", rec.name); return false; }
  rec = { id, ...rec };
  for (const [k, v] of [["isin", rec.isin], ["name", norm(rec.name)], ["tv", rec.tv], ["domain", rec.domain], ["lei", rec.lei], ["cik", rec.cik], ["sec", rec.sec], ["id", id]]) if (v) taken[k].add(v);
  OUT.push({ rec, ...extra }); return true;
}
function fiche(kind) { const k = K[kind]; return { fait: k.fait, argent: k.argent, depend: k.depend }; }
const clean = s => String(s || "").replace(/\s*[—–]\s*/g, ", ").replace(/\s+/g, " ").trim();

// ---------- Atalaya Mining (exemple signalé : fiche rédigée à la main) ----------
if (LOT === "auto1") push({ name: "Atalaya Mining", ticker: "ATYM", isin: "CY0106002112", lei: "549300QNQPXVRXGXOX56", tv: "LSE:ATYM", region: "EU", sector: "materiaux", domain: "atalayamining.com",
  desc: "Extraction de cuivre à la mine de Riotinto, en Andalousie (Espagne).",
  fiche: { fait: "Exploite la mine de cuivre à ciel ouvert de Riotinto, en Andalousie (Espagne), et développe d'autres projets miniers dans la région.", argent: "La vente de concentrés de cuivre aux fonderies.", depend: "Le cours du cuivre, la teneur du minerai extrait et les coûts d'énergie et d'exploitation." } },
  { data: hasEsef("549300QNQPXVRXGXOX56"), score: 1e9, zone: "EU", kind: "cuivre" });

// ---------- Europe (Wikidata + listes de cotation + ESEF) ----------
// LEI des sociétés déjà suivies (par leurs ISIN) : évite les doublons sous un autre ISIN
const HAVE_LEI = new Set();
for (const [lei, l] of Object.entries(G.leiIsin || {})) if (l.some(i => HAVE.isin.has(i))) HAVE_LEI.add(lei);
for (const i of HAVE.isin) if (G.isinLei && G.isinLei[i]) HAVE_LEI.add(G.isinLei[i]);
// Corrections manuelles de secteur repérées à la relecture (secteur Wikidata manifestement faux)
const OVR = { "TGS-NOPEC Geophysical Company": "services_petroliers", "Roche Bobois": "meubles", "Temenos": "logiciels", "Prodways Group": "machines", "OCI NV": "engrais", "Moneysupermarket.com": "internet", "MONY Group": "internet", "GEA Group": "machines" };
const NAME_OVR = { "Schweizerische Industrie Gesellschaft": "SIG Group", "Moneysupermarket.com": "MONY Group" };
const LEGAL = /[,\s]+(spółka akcyjna|s\.?a\.?|plc|p\.l\.c\.|ab \(publ\)|ab|asa|a\/s|as|n\.?v\.?|se|ag|oyj|abp|s\.?p\.?a\.?|ltd|limited|inc|holding s\.?a\.?)\.?$/i;
function prettyName(n) {
  let s = clean(n); if (!s) return "";
  for (let i = 0; i < 2; i++) s = s.replace(LEGAL, "").trim();
  if (s === s.toUpperCase() && /[A-Z]{4}/.test(s) && (/\s/.test(s) || s.length > 7)) s = s.toLowerCase().split(/(\s+|-)/).map(w => w.length <= 3 && /^[a-z0-9]+$/.test(w) && !["and", "the", "of", "de", "la", "le", "des", "du", "et", "von", "und"].includes(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)).join("").replace(/\b(And|Of|The)\b/g, w => w.toLowerCase()).replace(/^./, c => c.toUpperCase());
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const euCand = [];
// Symbole -> cotation dans les listes officielles (pour retrouver l'ISIN actuel quand celui de Wikidata est périmé)
const SYM = {};
for (const M of [ENX, NORD, XS]) for (const [i, l] of Object.entries(M)) for (const c of l) (SYM[c.p + ":" + c.t] || (SYM[c.p + ":" + c.t] = [])).push({ ...c, isin: i });
const ISIN_LEI = { ...(G.isinLei || {}) }; for (const [lei, l] of Object.entries(G.leiIsin || {})) for (const i of l) if (!ISIN_LEI[i]) ISIN_LEI[i] = lei;
const EU_EX = new Set(["LSE", "EURONEXT", "MIL", "BME", "OSL", "XETR", "OMXCOP", "OMXHEX", "OMXSTO", "SIX", "VIE", "GPW", "ATHEX"]);
for (const [q, o] of Object.entries(W)) {
  const isins = (o.isin || []).filter(i => isinOk(i) && EUC.has(i.slice(0, 2)));
  const wx = (o.x || []).map(([x, t]) => [WX[x], t]).filter(([p]) => EU_EX.has(p));
  if (!isins.length && !wx.length) continue;
  let name = prettyName(o.fr || o.en); if (!name) continue; if (NAME_OVR[name]) name = NAME_OVR[name];
  if (o.dead) { drop("société dissoute (Wikidata)", name); continue; }
  if (excluded(o)) { drop("fonds, ETF ou indice", name); continue; }
  if (isins.some(i => HAVE.isin.has(i))) { drop("déjà dans la liste (isin)", name); continue; }
  // cotations possibles : listes officielles par ISIN, puis par symbole Wikidata, OpenFIGI, enfin Wikidata seul
  const opts = [];
  for (const i of isins) { for (const c of [...(ENX[i] || []), ...(NORD[i] || []), ...(XS[i] || [])]) opts.push({ ...c, isin: i }); const f = figiListing(i); if (f) opts.push({ ...f, isin: i }); }
  for (const [p, t] of wx) {
    const tk = wdTicker(p, t); if (!tk) continue;
    for (const c of SYM[p + ":" + tk] || []) if (isinOk(c.isin) && !opts.some(x => x.isin === c.isin && x.p === c.p)) opts.push({ ...c, viaSym: true });
    if (isins[0]) opts.push({ p, t: tk, m: "Wikidata", rank: 4, turn: 0, isin: isins[0] });
  }
  if (!opts.length) { drop("aucune cotation européenne trouvée", name); continue; }
  const isHome = c => (HOME_TV[c.isin.slice(0, 2)] || []).includes(c.p);
  const okO = opts.filter(c => isHome(c) || !STRONG_HOME.has(c.isin.slice(0, 2))).sort((a, b) => a.rank - b.rank || (isHome(b) - isHome(a)) || b.turn - a.turn);
  if (!okO.length) { drop("cotation principale introuvable (seulement une cotation secondaire)", name); continue; }
  const L = okO[0], isin = L.isin, cc = isin.slice(0, 2);
  if (HAVE.isin.has(isin)) { drop("déjà dans la liste (isin)", name); continue; }
  if (L.viaSym && !tokOverlap(o.en || o.fr, L.name) && !tokOverlap(o.fr || o.en, L.name)) { drop("symbole Wikidata repris par une autre société", name + " / " + L.name); continue; }
  if (secFiler(o)) { drop("dépose ses comptes à la SEC (traitée avec les États-Unis)", name); continue; }
  const lei = (o.lei || []).find(l => /^[A-Z0-9]{20}$/.test(l) && hasEsef(l)) || ISIN_LEI[isin] || (o.lei || [])[0] || null;
  const domain = domainOf(o); if (!domain) { drop("pas de site officiel (Wikidata)", name); continue; }
  if (lei && HAVE_LEI.has(lei)) { drop("déjà dans la liste (lei)", name); continue; }
  // Nom de la cotation (liste officielle ou OpenFIGI) : doit correspondre à la fiche Wikidata, sinon la fiche est périmée (société renommée) ou fausse
  if (L.name && !tokOverlap(o.en || o.fr, L.name) && !tokOverlap(o.fr || o.en, L.name)) {
    if (domainMatches(domain, [L.name], L.t)) name = prettyName(L.name);
    else { drop("nom de la cotation différent de la fiche Wikidata", name + " / " + L.name); continue; }
  }
  if (!domainMatches(domain, [name, o.fr, o.en, L.name], L.t)) { drop("site officiel sans rapport avec le nom", name + " / " + domain); continue; }
  const kind = OVR[name] || kindOf(o, NSEC[NSECT[isin]] || null); if (!kind) { drop("secteur indéterminé", name); continue; }
  const k = K[kind];
  const data = hasEsef(lei);
  // Pays dont la bourse publie une liste officielle lue ici (Euronext, Nasdaq Nordic, Xetra, SIX) : la cotation doit y figurer
  if ((L.rank === 2 || L.rank === 4) && OFFICIAL.has(cc) && isHome(L)) { drop("absente de la liste officielle de la bourse (radiée ou secondaire)", name); continue; }
  if (L.rank === 2 && L.p === "XETR" && cc !== "DE") { drop("cotation principale introuvable (seulement une cotation secondaire)", name); continue; }
  // Cotation trouvée seulement par OpenFIGI ou Wikidata : exiger un signe d'activité (rapport ESEF récent, ou cotation encore active selon Wikidata)
  if (L.rank === 2 || L.rank === 4) {
    const last = lei && E[lei] ? E[lei].p.filter(p => p[1]).map(p => p[0]).sort().pop() : null;
    if (L.p === "LSE" && !(last && last >= "2024-12-01")) { drop("cotation non confirmée (Londres sans rapport UKSEF récent)", name); continue; }
    const wdListed = (o.x || []).some(([x]) => WX[x] === L.p);
    if (data ? !(last && last >= "2024-12-01") : !wdListed) { drop("cotation non confirmée (ni rapport annuel récent, ni cotation active sur Wikidata)", name); continue; }
  }
  euCand.push([{ name, ticker: L.t.replace(/_/g, " ").replace(/\.$/, ""), isin, ...(lei ? { lei } : {}), tv: `${L.p}:${L.t}`, region: cc === "FR" ? "FR" : "EU", sector: k.sector, domain,
    desc: OVR[name] ? k.desc : descFr(o, k.desc), fiche: fiche(kind) }, { data, score: (data ? 1e6 : 0) - (L.rank >= 4 ? 5000 : 0) + (+o.sl || 0) * 100 + Math.log10(1 + L.turn), zone: "EU", kind, mkt: L.m, q }]);
}

// ---------- États-Unis et sociétés déposant leurs comptes à la SEC ----------
const wdByCik = {}, wdByTick = {};
for (const [q, o] of Object.entries(W)) { for (const c of o.cik || []) wdByCik[+c] = o; for (const [x, t] of o.x || []) if (WX[x] === "NYSE" || WX[x] === "NASDAQ") { const tk = wdTicker(WX[x], t); if (tk) wdByTick[WX[x] + ":" + tk] = o; } }
const usCand = [];
const PREF = /-(P[A-Z]?|W[S]?|U[N]?|R[T]?)$|\.(W|U|R)$/;
for (const [cik, s] of Object.entries(SS)) {
  const pairs = (s.t || []).map((t, i) => [t, (s.x || [])[i]]).filter(([t, x]) => (x === "NYSE" || x === "Nasdaq") && !PREF.test(t) && !(x === "Nasdaq" && (/^[A-Z]{4}[WURP]$/.test(t) || /^[A-Z]{3}P[A-Z]$/.test(t))));
  const nm = s.n || cik;
  if (!pairs.length) { drop("pas d'action ordinaire cotée à New York", nm); continue; }
  const [t, x] = pairs[0]; const p = x === "NYSE" ? "NYSE" : "NASDAQ", tvT = t.replace(/-/g, ".");
  if (HAVE.sec.has(t)) { drop("déjà dans la liste (sec)", nm); continue; }
  const sic = String(s.sic || "");
  if (["6770", "6189", "6726", "6722", "6799", "9995", "6221"].includes(sic) || /\b(acquisition corp|acquisition co|SPAC|ETF|fund|trust$|royalty trust)\b/i.test(nm) && !["6798", "6022", "6021"].includes(sic)) { drop("SPAC, fonds ou trust", nm); continue; }
  const recent = ["10-K", "20-F", "40-F"].map(f => s.fm && s.fm[f]).filter(Boolean).sort().pop();
  if (!recent || recent < "2025-01-01") { drop("pas de rapport annuel récent à la SEC", nm); continue; }
  const o = wdByCik[+cik] || wdByTick[p + ":" + tvT] || null;
  if (!o) { drop("pas de fiche Wikidata (site officiel inconnu)", nm); continue; }
  if ((o.en || o.fr) && !tokOverlap(o.en || o.fr, nm) && !tokOverlap(o.fr || o.en, nm)) { drop("fiche Wikidata d'une autre société (nom différent de la SEC)", nm + " / " + (o.en || o.fr)); continue; }
  let kind = SIC[sic] || null;
  if (!kind) kind = kindOf(o);
  else if (GENS.has(kind)) { const w = kindOf(o, K[kind].sector); if (w && K[w].sector === K[kind].sector) kind = w; }
  if (!kind) { drop("secteur indéterminé", nm); continue; }
  if (o.dead) { drop("société dissoute (Wikidata)", nm); continue; }
  if (excluded(o)) { drop("fonds, ETF ou indice", nm); continue; }
  const domain = domainOf(o); if (!domain) { drop("pas de site officiel (Wikidata)", nm); continue; }
  if (!domainMatches(domain, [nm, o.en, o.fr], t)) { drop("site officiel sans rapport avec le nom", nm + " / " + domain); continue; }
  if (/^(GEO GROUP|CoreCivic)/i.test(nm)) { drop("activité mal décrite par le code SIC (relecture)", nm); continue; }
  const wdName = clean(o.en || o.fr), secName = prettyName(secClean(nm));
  const name = toks(wdName).every(w => toks(secName).includes(w) || GENERIC_W.has(w)) ? wdName : secName; if (!name) { drop("nom manquant", nm); continue; }
  // Relecture : sociétés écartées (activité mal décrite, site périmé, minage de cryptomonnaies) et secteurs corrigés
  if (/^(Innovate|Neighborhood Intelligence|Valvoline|Compass Diversified|People|MARA Holdings|CleanSpark|Bitdeer|Argo Blockchain|Canaan|Riot Platforms|Hut 8|Cipher Mining|Bitfarms|TeraWulf|Core Scientific)\b/i.test(name)) { drop("relecture : activité mal décrite ou douteuse", name); continue; }
  const OVR_US = { "SSR Mining": ["or", "ssrmining.com"], "Federal Signal Corporation": ["camions"], "MSA Safety": ["securite"], "Armstrong World Industries": ["materiaux_construction"] };
  let domain2 = domain; if (OVR_US[name]) { kind = OVR_US[name][0]; if (OVR_US[name][1]) domain2 = OVR_US[name][1]; }
  const k = K[kind];
  let region = "US"; if (!US_STATES.has(s.ad || "")) { const cs = o.country || []; region = cs.includes("Q30") ? "US" : cs.some(c => EU_QID.has(c)) ? "EU" : "MONDE"; }
  const isin = (o.isin || []).find(i => isinOk(i) && i.startsWith("US")) || (o.isin || []).find(i => isinOk(i)) || null;
  const rev = (SB.frames || {})[String(+cik)] || 0;
  usCand.push([{ name, ticker: t.replace(/-/g, "."), ...(isin ? { isin } : {}), sec: t, cik: String(cik).padStart(10, "0"), tv: `${p}:${tvT}`, region, sector: k.sector, domain: domain2, desc: descFr(o, k.desc), fiche: fiche(kind) },
    { data: true, score: rev || (+o.sl || 0) * 5e7, zone: region === "US" ? "US" : "SEC-" + region, kind, sic, form: Object.keys(s.fm || {}).join("/") }]);
}

function secClean(n) {
  let s = String(n || "").replace(/\s*\/[A-Z]{2,3}\/?\s*$/, "").replace(/\\[A-Z]+$/, "").replace(/,?\s+(INC|CORP|CORPORATION|CO|LTD|LIMITED|PLC|LLC|L\.?P|N\.?V|S\.?A|AG|SE|HOLDINGS? INC|INCORPORATED)\.?$/i, "").trim();
  s = s.replace(/,?\s+(INC|CORP|CO|LTD|PLC)\.?$/i, "").trim();
  if (s === s.toUpperCase()) s = s.toLowerCase().replace(/(^|[\s\-\/&(])([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/\b(Of|And|The|De|Du)\b/g, w => w.toLowerCase()).replace(/^./, c => c.toUpperCase());
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------- Reste du monde (grandes sociétés) ----------
// Listes officielles : Tokyo (JPX), Hong Kong (HKEX), Inde (NSE), Australie (ASX), Toronto (TSX). Symbole -> { nom, isin }
const WL = { TSE: {}, HKEX: {}, NSE: {}, ASX: {}, TSX: {} };
if (existsSync(D + "liste_jpx.json")) for (const [code, nm, sect] of JSON.parse(readFileSync(D + "liste_jpx.json"))) if (code && /Market/.test(sect || "") && !/ETF|REIT|PRO Market|Foreign/i.test(sect)) WL.TSE[String(code).toUpperCase()] = { name: nm };
if (existsSync(D + "liste_hkex.json")) for (const [code, nm, sub, isin] of JSON.parse(readFileSync(D + "liste_hkex.json"))) if (code && /Equity Securities \(Main Board\)/i.test(sub || "")) WL.HKEX[String(+code)] = { name: nm, isin };
if (existsSync(D + "liste_nse.csv")) for (const l of readFileSync(D + "liste_nse.csv", "utf8").split(/\r?\n/).slice(1)) { const f = l.split(","); if (f[2] && f[2].trim() === "EQ") WL.NSE[f[0].trim()] = { name: f[1], isin: (f[6] || "").trim() }; }
if (existsSync(D + "liste_asx2.csv")) for (const l of readFileSync(D + "liste_asx2.csv", "utf8").split(/\r?\n/).slice(1)) { const f = l.split('","').map(x => x.replace(/"/g, "")); if (f[0]) WL.ASX[f[0]] = { name: f[1], cap: +(l.split(",").pop()) || 0 }; }
if (existsSync(D + "liste_tsx.json")) for (const r of JSON.parse(readFileSync(D + "liste_tsx.json")).results || []) for (const ins of r.instruments || []) WL.TSX[String(ins.symbol).toUpperCase()] = { name: r.name };
const moCand = [];
for (const [q, o] of Object.entries(W)) {
  const name = prettyName(o.fr || o.en); if (!name) continue;
  const isins = (o.isin || []).filter(i => isinOk(i));
  if (!isins.length || isins.some(i => EUC.has(i.slice(0, 2)) || i.startsWith("US"))) continue;
  const Ls = [];
  for (const [x, t] of o.x || []) { const p = WX[x]; if (!p || !MONDE_EX.has(p)) continue; const tk = wdTicker(p, t); if (tk) Ls.push({ p, t: tk }); }
  if (!Ls.length) continue;
  if (o.dead) { drop("société dissoute (Wikidata)", name); continue; }
  if (excluded(o)) { drop("fonds, ETF ou indice", name); continue; }
  if (isins.some(i => HAVE.isin.has(i))) { drop("déjà dans la liste (isin)", name); continue; }
  // comptes à la SEC (20-F / 40-F) si la société y est inscrite
  let sec = "", cik = null;
  for (const c of o.cik || []) { const s = SS[+c]; if (!s) continue; const recent = ["20-F", "40-F", "10-K"].map(f => s.fm && s.fm[f]).filter(Boolean).sort().pop(); const tt = (s.t || []).find((tk, i) => ["NYSE", "Nasdaq"].includes((s.x || [])[i]) && !PREF.test(tk)); if (recent >= "2025-01-01" && tt) { sec = tt; cik = String(+c).padStart(10, "0"); } }
  // cotation : vérifiée dans la liste officielle de la bourse quand elle est disponible, nom compris
  let L = null, isin = isins[0], why = "bourse sans liste officielle lue ici";
  for (const c of Ls.sort((a, b) => a.t.length - b.t.length)) {
    const list = WL[c.p];
    if (!list) { if (sec && !L) L = c; continue; }
    const e = list[c.t]; if (!e) { why = "symbole absent de la liste officielle (radiée ?)"; continue; }
    if (!tokOverlap(o.en || o.fr, e.name) && !tokOverlap(o.fr || o.en, e.name)) { why = "symbole de la liste officielle attribué à une autre société"; continue; }
    L = c; if (e.isin && isinOk(e.isin)) isin = e.isin; break;
  }
  if (!L) { drop("monde : " + why, name); continue; }
  if (HAVE.isin.has(isin)) { drop("déjà dans la liste (isin)", name); continue; }
  const domain = domainOf(o); if (!domain) { drop("pas de site officiel (Wikidata)", name); continue; }
  if (!domainMatches(domain, [o.en, o.fr], L.t)) { drop("site officiel sans rapport avec le nom", name + " / " + domain); continue; }
  const kind = kindOf(o); if (!kind) { drop("secteur indéterminé", name); continue; }
  const k = K[kind];
  moCand.push([{ name, ticker: L.t, isin, sec, ...(cik ? { cik } : {}), tv: `${L.p}:${L.t}`, region: "MONDE", sector: k.sector, domain, desc: descFr(o, k.desc), fiche: fiche(kind) },
    { data: !!sec, score: (+o.sl || 0) + (+o.emp > 0 ? Math.log10(+o.emp) : 0), zone: "MONDE", kind }]);
}

// ---------- Sélection ----------
const MAX = { US: arg("--max-us", 1e9), EUnd: arg("--max-eu-nodata", 1e9), MOnd: arg("--max-monde", 1e9) };
const desc = l => l.sort((a, b) => b[1].score - a[1].score);
let nUS = 0, nEUnd = 0, nMO = 0;
let nF = 0; const MAXF = arg("--max-foreign", 1e9);
for (const [rec, x] of desc(usCand)) { if (x.zone === "US") { if (nUS >= MAX.US) continue; if (push(rec, x)) nUS++; } else if (nF < MAXF && push(rec, x)) nF++; }
if (!ONLY_US) for (const [rec, x] of desc(euCand)) if (x.data) push(rec, x);
if (!ONLY_US) for (const [rec, x] of desc(moCand)) if (x.data) push(rec, x);
if (!ONLY_US) for (const [rec, x] of desc(euCand)) if (!x.data && nEUnd < MAX.EUnd && push(rec, x)) nEUnd++;
if (!ONLY_US) for (const [rec, x] of desc(moCand)) if (!x.data && nMO < MAX.MOnd && push(rec, x)) nMO++;

// ---------- Bilan ----------
const by = (f) => { const m = {}; for (const r of OUT) { const k = f(r); m[k] = (m[k] || 0) + 1; } return m; };
console.log("total", OUT.length, "| candidats EU", euCand.length, "US", usCand.length, "MONDE", moCand.length);
console.log("région", by(r => r.rec.region)); console.log("secteur", by(r => r.rec.sector));
console.log("avec comptes", by(r => r.rec.region + ":" + (r.rec.sec ? "SEC" : r.data ? "ESEF" : "cours seul")));
console.log("bourses", by(r => r.rec.tv.split(":")[0]));
console.log("écartés", Object.fromEntries(Object.entries(DROP).map(([k, v]) => [k, v.length])));
writeFileSync((process.env.SCRATCH || "/tmp") + "/sel.json", JSON.stringify(OUT, null, 1));
writeFileSync((process.env.SCRATCH || "/tmp") + "/drop.json", JSON.stringify(DROP, null, 1));
if (process.argv.includes("--write")) {
  const q = s => JSON.stringify(s);
  const line = r => `  { id: ${q(r.id)}, name: ${q(r.name)}, ticker: ${q(r.ticker)}, ${r.isin ? `isin: ${q(r.isin)}, ` : ""}${r.lei ? `lei: ${q(r.lei)}, ` : ""}${r.sec !== undefined ? `sec: ${q(r.sec)}, ` : ""}${r.cik ? `cik: ${q(r.cik)}, ` : ""}tv: ${q(r.tv)}, region: ${q(r.region)}, sector: ${q(r.sector)}, domain: ${q(r.domain)},\n    desc: ${q(r.desc)},\n    fiche: { fait: ${q(r.fiche.fait)}, argent: ${q(r.fiche.argent)}, depend: ${q(r.fiche.depend)} } },`;
  const grp = [["Europe (dont Royaume-Uni) : rapports annuels ESEF/UKSEF lus sur filings.xbrl.org par le LEI", r => (r.rec.region === "EU" || r.rec.region === "FR") && !r.rec.sec && r.data],
    ["Europe : cours seulement (pas de rapport ESEF publié sur filings.xbrl.org)", r => (r.rec.region === "EU" || r.rec.region === "FR") && !r.rec.sec && !r.data],
    ["États-Unis : comptes lus à la SEC (companyfacts, par le numéro CIK)", r => r.rec.region === "US"],
    ["Sociétés non américaines qui déposent leurs comptes à la SEC (10-K, 20-F ou 40-F)", r => r.rec.region !== "US" && r.rec.sec],
    ["Reste du monde : cours seulement", r => r.rec.region === "MONDE" && !r.rec.sec]];
  let body = "";
  for (const [t, f] of grp) { const rs = OUT.filter(f); if (!rs.length) continue; body += `  // ——— ${t} ———\n` + rs.map(r => line(r.rec)).join("\n") + "\n"; }
  const head = `// Lot « auto1 » : ${OUT.length} sociétés cotées ajoutées automatiquement à partir de sources ouvertes (collecte : data/diag/test.mjs, résultats bruts dans data/diag/auto1/).
// Identifiants : Wikidata (ISIN, site officiel, secteur, description), GLEIF (correspondance ISIN-LEI), filings.xbrl.org (rapports ESEF/UKSEF),
// listes officielles des bourses (Euronext, Nasdaq Nordic, Xetra, SIX, Tokyo, Hong Kong, NSE, ASX, TSX), OpenFIGI (cotations), SEC EDGAR (numéro CIK, code SIC, formulaires déposés).
// Écartées : fonds, ETF, SPAC, sociétés dissoutes ou radiées, cotations secondaires, secteur indéterminé, site officiel incohérent avec le nom.
// lei = identifiant de la société pour filings.xbrl.org ; sec = code de cotation à New York et cik = numéro SEC, pour les sociétés qui déposent leurs comptes à la SEC.
// La fiche (fait, argent, depend) décrit le métier type du secteur d'activité trouvé (code SIC ou secteur Wikidata) : textes génériques, sans chiffre ni fait propre à la société.
// Atalaya Mining (Londres : ATYM) est rédigée à la main.
export default [
`;
  const head2 = LOT === "auto1" ? head : head.replace("Lot « auto1 »", "Lot « " + LOT + " »").replace(/\n\/\/ Atalaya[^\n]*/, "");
  writeFileSync(REPO + "/data/lots/" + LOT + ".mjs", head2 + body + "];\n");
  console.log("écrit", OUT.length);
}
