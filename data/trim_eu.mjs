// Trimestres des sociétés françaises (4/11/2026) : chiffre d'affaires de chaque trimestre, relevé dans les communiqués
// déposés à l'AMF (info-financiere.gouv.fr, Licence Ouverte Etalab), pour la section « L'année en cours » de la fiche.
// Les sociétés européennes ne publient pas de comptes trimestriels structurés comme la SEC : on lit le communiqué (PDF),
// on garde la phrase qui donne le chiffre d'affaires DU GROUPE et sa période (trimestre, semestre, neuf mois, année), puis :
//   T2 = 1er semestre − T1 ; T3 = neuf mois − 1er semestre (ou T3 publié) ; T4 = année (comptes annuels de la fiche) − neuf mois.
// Garde-fous : chaque trimestre entre 12 % et 40 % des ventes annuelles, même trimestre d'une année sur l'autre entre ×0,6 et ×1,6 ;
// tout trimestre douteux est écarté. Seulement les exercices calés sur l'année civile, en euros. Pas de bénéfice (rarement trimestriel).
// Sortie : cf/site/data/trim/<id>.json (même format que data/sec_trim.mjs, form "AMF", lien u vers le communiqué).
// Tableaux (4/11, 2e version) : tableaux() rattache chaque nombre de la ligne « Chiffre d'affaires » à la période écrite au-dessus ;
// un chiffre est confirmé quand deux communiqués donnent la même valeur ou que la variation écrite correspond (publiable()).
// Cache : data/trim_eu_cache.json (chaque communiqué lu une seule fois).   node data/trim_eu.mjs [--depuis 2024-01-01] [--max N] [--hors-ligne]
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import U from "./univers.mjs";
import { UA } from "./fetch_data.mjs";
import { periode } from "./actu_regles.mjs";

const API = "https://www.info-financiere.gouv.fr/api/explore/v2.1/catalog/datasets/flux-amf-new-prod/records";
const SOC = new URL("../cf/site/data/societes/", import.meta.url), OUT = new URL("../cf/site/data/trim/", import.meta.url), CACHE = new URL("trim_eu_cache.json", import.meta.url);
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const DEPUIS = arg("--depuis", "2024-01-01"), MAX = +arg("--max", 4000), STOP = Date.now() + (+arg("--minutes", 100)) * 60e3;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const RES = /chiffre d.affaires|ventes|revenus|r[ée]sultats|information financi[èe]re trimestrielle|trimestr|semestr|neuf mois|9 ?mois|\bT[1-4]\b|\bS1\b|\b9M\b|annuel/i;
const PAS = /assembl[ée]e|droits de vote|rachat|programme|mise à disposition|document d.enregistrement|contrat de liquidit|nomination|dividende$/i;

/* ---------- Lecture d'un communiqué ---------- */
const MONTANT = /(\d{1,3}(?:[   .]\d{3})*(?:,\d+)?)\s*(milliards?|millions?|Mds?|Md|M)\s*(?:d['’]\s?euros|€|EUR|euros)/i;
const SEGMENT = /\b(unit|SBU|business|r[ée]current|annualis|p[ôo]le|division|activit[ée]s? (?!du groupe)|branche|segment|m[ée]tier|zone|r[ée]gion|banque de|bricolage|am[ée]rique|europe|asie|afrique|chine|france|international|hors\b|dont\b|ajust[ée])/i;
const GROUPE = /\bgroupe\b|consolid[ée]|\btotal\b/i;
export function caPeriode(texte, titre = "") {
  const S = texte.replace(/\s+/g, " ").slice(0, 12000).split(/(?<=[.;])\s+(?=[A-ZÀ-Ý"«(•])/).map(s => s.trim()).filter(s => s.length > 25 && s.length < 500);
  for (const s of S.slice(0, 40)) {
    const k = s.search(/chiffre d['’]affaires/i); if (k < 0) continue;
    const apres = s.slice(k), m = apres.match(new RegExp(`^chiffre d['’]affaires[^.;:]{0,80}?(?:s['’]établit à|s['’]est établi à|s['’]élève à|s['’]est élevé à|atteint|ressort à|de|à)\\s+${MONTANT.source}`, "i"));
    if (!m) continue;
    const avant = s.slice(0, k + m[0].length), entre = m[0].slice(18, m[0].length - m[1].length - m[2].length);
    if (SEGMENT.test(avant) && !GROUPE.test(avant)) continue; // chiffre d'une activité, pas du groupe
    if (/\b(des|licences?|logiciels?|services?|activit|division|segment|p[ôo]le|branche|programme|produits?)\b/i.test(entre) && !GROUPE.test(entre)) continue;
    const fen = s.slice(Math.max(0, k - 140), k + m[0].length + 90); // la période se lit autour du chiffre, pas dans toute la phrase
    if (/objectif|perspective|sup[ée]rieur à|environ|attendu|pr[ée]vu|guidance|ajust|[ée]conomique|pro ?forma|contributif|carnet|prises? de commandes?/i.test(fen)) continue;
    const yy = (fen.match(/\b(20\d\d)\b/g) || []).map(Number), per0 = perDe(m[0]) || perDe(s.slice(Math.max(0, k - 140), k)) || perDe(s.slice(k + m[0].length, k + m[0].length + 90));
    if (!per0 && yy.length) continue; // « en 2025, la société a réalisé… » : présentation de la société, pas la période publiée
    const per = per0 || perDe(titre); if (!per) continue;
    const v = parseFloat(m[1].replace(/[   .]/g, "").replace(",", ".")) * (/^(milliard|md)/i.test(m[2]) ? 1000 : 1);
    const reste = s.slice(k + m[0].length, k + m[0].length + 160), g = reste.match(/([+\-−])\s?(\d+(?:,\d+)?)\s?%|(hausse|progression|croissance|baisse|recul|repli)\s+(?:organique\s+)?(?:de\s+)?\+?(\d+(?:,\d+)?)\s?%/i);
    const gv = g ? (g[1] ? (g[1] === "+" ? 1 : -1) * parseFloat(g[2].replace(",", ".")) : (/baisse|recul|repli/i.test(g[3]) ? -1 : 1) * parseFloat(g[4].replace(",", "."))) : null;
    return { per, v: Math.round(v * 10) / 10, g: gv, cmp: g ? /comparable|organique|constant|hors effet|pcc/i.test(reste) : null, s: s.slice(0, 300) };
  }
  return null;
}

// Période d'une phrase ou d'un titre : le cumul (neuf mois, « au 30 septembre ») passe avant le trimestre
export function perDe(t) {
  const f = String(t || "");
  if (/neuf (premiers )?mois|9 (premiers )?mois|\b9M\b|cumul|au 30 septembre|à fin septembre|fin septembre/i.test(f)) return "9M";
  if (/premier semestre|1er semestre|\bS1\b|\bH1\b|semestriel|au 30 juin|à fin juin/i.test(f)) return "S1";
  const p = periode(f); if (!p) return null;
  return p.neuf ? "9M" : p.q ? "T" + p.q : p.s ? "S1" : p.a ? "A" : null;
}
// Année de la période : celle de la publication (exercice civil) ; l'année entière et le 4e trimestre sont publiés l'année suivante
export const anDe = (per, d) => +String(d).slice(0, 4) - ((per === "A" || per === "T4") && +String(d).slice(5, 7) <= 6 ? 1 : 0);

/* ---------- Lecture des tableaux (4/11, 2e version) ----------
   La plupart des communiqués donnent le chiffre d'affaires dans un tableau : « Chiffre d'affaires   7 233   6 876   +5,2 % » sous un en-tête
   « T3 2026   T3 2025   Variation ». pdftotext -layout garde les colonnes : chaque nombre est rattaché à l'en-tête placé au-dessus de lui.
   Le tableau donne aussi l'année précédente (l'historique vient avec) et souvent la variation, qui sert de vérification. */
const TOKP = /(?:\b(?:T|Q)[1-4]\b|\b[SH][12]\b|\b9 ?m(?:ois)?\b|\bneuf (?:premiers )?mois\b|\b9 premiers mois\b|\b(?:1er|premier|2e|2ème|deuxième|3e|3ème|troisième|4e|4ème|quatrième) (?:trimestre|semestre)\b|\bsemestre\b|\btrimestre\b|\b(?:30|31)[\/.](?:03|06|09|12)[\/.](?:20)?\d\d\b|\b20[12]\d\b|\b[TQSH][1-4][ \-–]?(?:20)?[2-3]\d\b|\b9M[ \-–]?(?:20)?[2-3]\d\b)/gi;
const NUMC = /(?<![\d,.])[+\-−]?\d{1,3}(?:[ \u00a0\u202f]\d{3})*(?:,\d+)?(?![\d])(?:\s?(%|pts?|pb|bp|M€|Md€|M€|x))?/g;
const LIGNE_CA = /^\s*(?:chiffre d['’]affaires|ventes|revenus?)(?:\s(?:consolid[ée]e?s?|du groupe|group|total|totales?|publi[ée]e?s?|nettes?|net|\(M€\)|\(en M€\)|en M€|M€|\(1\)|\(a\)|¹|\*))*\s{2,}\S/i;
export function tableaux(tx, titre = "", d = "") {
  const L = tx.split("\n"), out = [];
  for (let i = 0; i < L.length; i++) {
    const l = L[i]; if (!LIGNE_CA.test(l) || /\b(p[ôo]le|division|activit|segment|zone|r[ée]gion|organique|comparable|constant|ajust)/i.test(l.slice(0, 50))) continue;
    const debut = l.search(/\s{2,}\S/), cel = [];
    for (const m of l.slice(debut).matchAll(NUMC)) { const x = debut + m.index, t = m[0].trim(), pc = /%|pts?|pb|bp/.test(m[1] || "");
      const v = parseFloat(t.replace(/[+\s\u00a0\u202f%M€dptsbx]/g, "").replace("−", "-").replace(",", "."));
      if (!isFinite(v)) continue; cel.push({ x: x + t.length / 2, v: /Md€/.test(t) ? v * 1000 : v, pc, brut: t }); }
    const vals = cel.filter(c => !c.pc && !/^20[12]\d$/.test(c.brut)); if (vals.length < 1) continue;
    // unité du tableau
    const autour = L.slice(Math.max(0, i - 14), i + 2).join(" ");
    const mult = /en milliards|\(Md€\)|en Md€|\bMd€\b/i.test(autour) && !/en millions|M€/i.test(autour.replace(/Md€/g, "")) ? 1000 : /en milliers|\(K€\)|k€/i.test(autour) ? 0.001 : 1;
    // en-tête : les lignes au-dessus qui portent des périodes
    const hautes = []; for (let k = i - 1; k >= Math.max(0, i - 9); k--) { const toks = [...L[k].matchAll(TOKP)].map(m => ({ x: m.index + m[0].length / 2, t: m[0] })); if (toks.length) hautes.push(toks); if (hautes.length >= 3) break; }
    if (!hautes.length) continue;
    // variations du tableau : une cellule % juste après deux montants confirme le couple
    const conf = new Set();
    for (let k = 0; k < cel.length; k++) if (cel[k].pc) { const a = cel[k - 2], b = cel[k - 1]; if (a && b && !a.pc && !b.pc && b.v > 0 && Math.abs((a.v / b.v - 1) * 100 - cel[k].v) <= 0.6) { conf.add(a); conf.add(b); } }
    for (const c of vals) {
      const morceaux = hautes.map(toks => toks.filter(t => Math.abs(t.x - c.x) <= 9).sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x))[0]).filter(Boolean).map(t => t.t);
      if (!morceaux.length) continue;
      const h = morceaux.reverse().join(" "), per = perDe(h.replace(/\b([TQ])([1-4])/i, "T$2").replace(/\bH1\b/i, "S1").replace(/\b(30|31)[\/.]09[\/.]\S+/, "9 mois").replace(/\b30[\/.]06[\/.]\S+/, "1er semestre").replace(/\b31[\/.]03[\/.]\S+/, "T1").replace(/\b31[\/.]12[\/.]\S+/, "exercice")) || perDe(titre);
      const y4 = h.match(/\b(20[12]\d)\b/), y2 = h.match(/[TQSH9M][1-4M]?[ \-–]?([2-3]\d)\b/i), an = y4 ? +y4[1] : y2 ? 2000 + +y2[1] : null;
      if (!per || !an || per === "A") continue;
      out.push({ per, an, v: Math.round(c.v * mult * 10) / 10, ok: conf.has(c) ? 1 : 0, src: "tableau" });
    }
  }
  // une même période lue deux fois dans le même communiqué : on garde la première
  const vu = new Set(); return out.filter(r => { const k = r.an + "|" + r.per; if (vu.has(k)) return false; vu.add(k); return true; });
}

/* ---------- Trimestres d'une société ---------- */
const FIN = { 1: "03-31", 2: "06-30", 3: "09-30", 4: "12-31" };
// Plusieurs communiqués donnent souvent le même chiffre (celui de l'an dernier revient en comparaison) : on garde la valeur que le plus
// de communiqués donnent (à 1 % près), sinon la plus récente ; deux communiqués d'accord = chiffre confirmé.
export function choisir(rel) {
  rel = rel.filter(r => !(r.v >= 1000 && r.v % 100 === 0 && r.src !== "tableau")); // « 4,1 milliards » dans une phrase : arrondi trop grossier
  const g = {}; for (const r of rel) (g[r.an + "|" + r.per] = g[r.an + "|" + r.per] || []).push(r);
  const P = {};
  for (const [k, L] of Object.entries(g)) {
    const grp = []; for (const r of L.slice().sort((a, b) => a.d < b.d ? 1 : -1)) { const c = grp.find(x => Math.abs(x.v / r.v - 1) <= 0.01); if (c) { c.docs.add(r.u); c.n++; c.ok = c.ok || r.ok; } else grp.push({ v: r.v, r, docs: new Set([r.u]), n: 1, ok: r.ok }); }
    grp.sort((a, b) => b.docs.size - a.docs.size); const best = grp[0], doute = grp.length > 1 && grp[1].docs.size === best.docs.size && Math.abs(grp[1].v / best.v - 1) > 0.05;
    P[k] = { ...best.r, v: best.v, conf: best.docs.size >= 2 || !!best.ok, doute };
  }
  return P;
}
export function trimestres(rel, annuel) { // rel : [{ per, an, v, d, u }], annuel : { 2024: ventes de l'année (M€) }
  const C = choisir(rel), ans = [...new Set(Object.keys(C).map(k => +k.split("|")[0]))].sort(), Q = [];
  for (const an of ans) {
    const P = {}; for (const per of ["T1", "T2", "T3", "T4", "S1", "9M", "A"]) if (C[an + "|" + per]) P[per] = C[an + "|" + per];
    const A = annuel[an] || null, ref = A || annuel[an - 1] || null; if (!ref) continue;
    const t = {};
    if (P.T1) t[1] = { v: P.T1.v, r: P.T1, conf: P.T1.conf };
    if (P.T2) t[2] = { v: P.T2.v, r: P.T2, conf: P.T2.conf }; else if (P.S1 && t[1]) t[2] = { v: P.S1.v - t[1].v, r: P.S1, deduit: 1, conf: P.S1.conf && t[1].conf };
    const s1 = P.S1 ? P.S1 : t[1] && t[2] ? { v: t[1].v + t[2].v, conf: t[1].conf && t[2].conf } : null;
    if (P.T3) t[3] = { v: P.T3.v, r: P.T3, conf: P.T3.conf }; else if (P["9M"] && s1) t[3] = { v: P["9M"].v - s1.v, r: P["9M"], deduit: 1, conf: P["9M"].conf && s1.conf };
    const n9 = P["9M"] ? P["9M"] : t[1] && t[2] && t[3] ? { v: t[1].v + t[2].v + t[3].v, conf: t[1].conf && t[2].conf && t[3].conf } : null;
    if (P.T4) t[4] = { v: P.T4.v, r: P.T4, conf: P.T4.conf }; else if (A && n9) t[4] = { v: A - n9.v, r: null, deduit: 1, conf: n9.conf };
    for (const k of [1, 2, 3, 4]) { const x = t[k]; if (!x || !(x.v >= 0.12 * ref && x.v <= 0.4 * ref)) continue;
      Q.push({ end: `${an}-${FIN[k]}`, ca: Math.round(x.v * 10) / 10, net: null, filed: x.r ? x.r.d : null, form: "AMF", u: x.r ? x.r.u : null, conf: x.conf ? 1 : 0, ...(x.deduit ? { deduit: 1 } : {}) }); }
  }
  // dans une même année, un trimestre très loin des autres trahit une erreur de lecture (chiffre d'une activité, d'une autre période)
  const med = {}; for (const q of Q) (med[q.end.slice(0, 4)] = med[q.end.slice(0, 4)] || []).push(q.ca);
  const mil = a => { const b = a.slice().sort((x, y) => x - y), h = b.length >> 1; return b.length % 2 ? b[h] : (b[h - 1] + b[h]) / 2; };
  const Q2 = Q.filter(q => { const a = med[q.end.slice(0, 4)]; if (a.length < 2) return true; const m = mil(a); return q.ca >= 0.7 * m && q.ca <= 1.3 * m; });
  // même trimestre d'une année sur l'autre : un écart extrême trahit aussi une erreur
  const by = Object.fromEntries(Q2.map(q => [q.end, q]));
  return Q2.filter(q => { const p = by[(+q.end.slice(0, 4) - 1) + q.end.slice(4)]; return !p || (q.ca / p.ca >= 0.7 && q.ca / p.ca <= 1.4); });
}
// Publication : chaque trimestre de l'année en cours doit être confirmé (deux communiqués d'accord, ou la variation écrite dans le
// tableau ou la phrase qui correspond), ainsi que le même trimestre de l'année précédente qui sert de comparaison.
export function publiable(Q) {
  if (!Q.length) return false;
  const an = Math.max(...Q.map(q => +q.end.slice(0, 4))), cours = Q.filter(q => +q.end.slice(0, 4) === an), by = Object.fromEntries(Q.map(q => [q.end, q]));
  return cours.every(q => q.conf && (by[(an - 1) + q.end.slice(4)] || {}).conf);
}

/* ---------- Collecte ---------- */
async function get(url) { for (let i = 1; i <= 4; i++) { try { const r = await fetch(url, { headers: { "user-agent": UA } }); if (r.ok) return r; if (r.status === 404) return null; } catch (e) { } await sleep(1500 * i); } return null; }
async function main() {
  const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE)) : {};
  const sec = new Set(readdirSync(OUT).filter(f => f.endsWith(".json")).filter(f => { try { const j = JSON.parse(readFileSync(new URL(f, OUT))); return j.source && !/AMF/.test(j.source); } catch (e) { return false; } }).map(f => f.slice(0, -5)));
  const cos = U.filter(c => /^FR/.test(c.isin || "") && !sec.has(c.id)).map(c => { try { const s = JSON.parse(readFileSync(new URL(c.id + ".json", SOC))); return s.fyEnd === "12-31" && s.currency === "EUR" && s.fin && s.fin.ca ? { ...c, s } : null; } catch (e) { return null; } }).filter(Boolean);
  console.log(cos.length, "sociétés françaises (exercice civil, en euros)");
  const recs = [], horsLigne = process.argv.includes("--hors-ligne"); // --hors-ligne : seulement l'assemblage, à partir du cache
  for (let i = 0; i < cos.length && !horsLigne; i += 40) {
    const where = `identificationsociete_iso_cd_isi in (${cos.slice(i, i + 40).map(c => `"${c.isin}"`).join(",")}) AND uin_dat_amf >= date'${DEPUIS}'`;
    for (let off = 0; off < 9900; off += 100) {
      const u = new URL(API); u.searchParams.set("limit", "100"); u.searchParams.set("offset", String(off)); u.searchParams.set("order_by", "uin_dat_amf desc"); u.searchParams.set("where", where);
      const r = await get(u.toString()); const j = r ? await r.json() : null, L = (j && j.results) || []; recs.push(...L); if (L.length < 100) break; await sleep(250);
    }
  }
  const byIsin = Object.fromEntries(cos.map(c => [c.isin, c])), lus = [];
  for (const r of recs) {
    const url = r.url_de_recuperation || Object.values(r).find(v => typeof v === "string" && /^https?:\/\/.+\.pdf/i.test(v)), t = r.informationdeposee_inf_tit_inf || r.sous_type_d_information || "";
    const off = [r.type_d_information, r.sous_type_d_information, t].filter(Boolean).join(" ");
    if (!url || r.informationdeposee_inf_lng_inf === "Anglais" || !RES.test(off) || PAS.test(t) || !byIsin[r.identificationsociete_iso_cd_isi]) continue;
    lus.push({ id: byIsin[r.identificationsociete_iso_cd_isi].id, d: String(r.uin_dat_amf).slice(0, 10), t, u: url });
  }
  console.log(recs.length, "publications,", lus.length, "communiqués de chiffre d'affaires ou de résultats");
  let n = 0;
  const L = lus.filter(x => !cache[x.u] || !cache[x.u].v2).slice(0, MAX) // v2 : relu avec les tableaux, f = "/tmp/trim_eu.pdf";
  for (const x of L) {
    if (Date.now() > STOP) break;
    const r = await get(x.u); if (!r) continue;
    try { writeFileSync(f, Buffer.from(await r.arrayBuffer())); const tx = execFileSync("pdftotext", ["-l", "4", f, "-"], { maxBuffer: 5e7, stdio: ["ignore", "pipe", "ignore"] }).toString();
      const e = caPeriode(tx, x.t), tl = tableaux(execFileSync("pdftotext", ["-layout", "-l", "4", f, "-"], { maxBuffer: 5e7, stdio: ["ignore", "pipe", "ignore"] }).toString(), x.t, x.d);
      const l = [...(e ? [{ per: e.per, an: anDe(e.per, x.d), v: e.v, g: e.g, cmp: e.cmp, src: "phrase" }] : []), ...tl];
      cache[x.u] = l.length ? { v2: 1, d: x.d, id: x.id, l } : { v2: 1, x: 1, d: x.d, id: x.id }; n++; } catch (e) { cache[x.u] = { v2: 1, x: 1, d: x.d, id: x.id }; }
    if (n % 50 === 0) writeFileSync(CACHE, JSON.stringify(cache)); await sleep(300);
  }
  writeFileSync(CACHE, JSON.stringify(cache));
  console.log(n, "communiqués lus,", L.length - n, "restants");
  // assemblage par société
  // une phrase dont la variation annoncée correspond au chiffre de l'an dernier (tableau ou autre communiqué) est confirmée
  const rel = {}; for (const [u, e] of Object.entries(cache)) if (!e.x) for (const r of (e.l || [{ ...e, src: "phrase" }])) (rel[e.id] = rel[e.id] || []).push({ ...r, d: e.d, u });
  for (const R of Object.values(rel)) for (const r of R) if (r.g != null && !r.ok) { const p = R.find(x => x.an === r.an - 1 && x.per === r.per && Math.abs((r.v / x.v - 1) * 100 - r.g) <= (r.cmp ? 6 : 1.5)); if (p) { r.ok = 1; p.ok = 1; } }
  let ecrits = 0; mkdirSync(OUT, { recursive: true });
  for (const c of cos) {
    const R = rel[c.id]; if (!R) continue;
    const annuel = Object.fromEntries(c.s.years.map((y, i) => [y, c.s.fin.ca[i]]).filter(([, v]) => v > 0));
    const q0 = trimestres(R, annuel), q = publiable(q0) ? q0 : []; if (q.length < 3) { try { const f = new URL(c.id + ".json", OUT), o = existsSync(f) && JSON.parse(readFileSync(f)); if (o && /AMF/.test(o.source || "")) unlinkSync(f); } catch (e) { } continue; }
    writeFileSync(new URL(c.id + ".json", OUT), JSON.stringify({ id: c.id, updated: new Date().toISOString().slice(0, 10), source: "AMF, communiqués (info-financiere.gouv.fr)", currency: "EUR", q: q.slice(-24) }));
    ecrits++;
  }
  const index = readdirSync(OUT).filter(f => f.endsWith(".json") && f !== "index.json").map(f => f.slice(0, -5));
  writeFileSync(new URL("index.json", OUT), JSON.stringify({ updated: new Date().toISOString().slice(0, 10), ids: index }));
  console.log(ecrits, "sociétés françaises avec trimestres");
}
if (import.meta.url === `file://${process.argv[1]}`) main();
