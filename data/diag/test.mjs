// Diagnostic : rapports financiers annuels ESEF absents de filings.xbrl.org (ex. LVMH 2025) : que propose l'AMF (info-financiere.gouv.fr) ?
import { writeFileSync, mkdirSync } from "node:fs";
const DIR = "data/diag/fraicheur/"; mkdirSync(DIR, { recursive: true });
const UA = "bilan-univers/1.0 (site pedagogique; " + (process.env.CONTACT || "github.com/n7497nbtjh-crypto/bourse") + ")";
const log = [], L = (...a) => { log.push(a.join(" ")); console.log(...a); };
const API = "https://www.info-financiere.gouv.fr/api/explore/v2.1/catalog/datasets/flux-amf-new-prod/records";
const out = {};
try {
  // 1. Les champs du jeu de données
  const meta = await (await fetch("https://www.info-financiere.gouv.fr/api/explore/v2.1/catalog/datasets/flux-amf-new-prod", { headers: { "user-agent": UA } })).json();
  out.fields = (meta.fields || []).map(f => [f.name, f.type, f.label]);
  // 2. Documents récents de LVMH, Kering, TotalEnergies
  for (const isin of ["FR0000121014", "FR0000121485", "FR0014000MR3", "FR0000120271"]) {
    const u = new URL(API); u.searchParams.set("limit", "100"); u.searchParams.set("order_by", "uin_dat_amf desc");
    u.searchParams.set("where", `identificationsociete_iso_cd_isi = "${isin}" AND uin_dat_amf >= date'2026-01-01'`);
    const j = await (await fetch(u, { headers: { "user-agent": UA } })).json();
    out[isin] = (j.results || []).map(r => r);
    L(isin, (j.results || []).length, "documents");
  }
  // 3. Rapports financiers annuels récents
  const u = new URL(API); u.searchParams.set("limit", "100"); u.searchParams.set("where", `uin_dat_amf >= date'2026-03-01' AND search("rapport financier annuel")`);
  const j = await (await fetch(u, { headers: { "user-agent": UA } })).json();
  out.rfa = (j.results || []).slice(0, 30); out.rfaTotal = j.total_count;
  // 4. Fichiers joints : extensions
  const ext = {}; for (const r of [...out.rfa, ...Object.values(out).filter(Array.isArray).flat()]) for (const v of Object.values(r || {})) if (typeof v === "string" && /^https?:\/\//.test(v)) { const e = (v.match(/\.([a-z0-9]{2,5})(\?|$)/i) || [])[1] || "?"; ext[e] = (ext[e] || 0) + 1; }
  out.ext = ext; L("extensions", JSON.stringify(ext));
} catch (e) { L("erreur", e.message); }
writeFileSync(DIR + "amf.json", JSON.stringify(out, null, 1));
writeFileSync("data/diag/out.json", JSON.stringify({ fraicheur: log }, null, 1));
