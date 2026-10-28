// Achats et ventes d'actions par les dirigeants des sociétés américaines (formulaires 4 déposés à la SEC).
// Seuls les achats (code P) et les ventes (code S) en Bourse sont gardés ; les attributions gratuites et les levées d'options ne le sont pas.
import { writeFileSync } from "node:fs";
import U from "./univers.mjs";
import { cikMap, subsUrl } from "./sec.mjs";
import { UA, getJSON, pool } from "./fetch_data.mjs";
const OUT = new URL("../cf/site/data/dirigeants.json", import.meta.url);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tag = (x, t) => { const m = x.match(new RegExp(`<${t}>\\s*(?:<value>)?\\s*([^<]*)`, "i")); return m ? m[1].trim() : ""; };
export function parseForm4(xml) {
  const owner = tag(xml, "rptOwnerName"), title = tag(xml, "officerTitle") || (/<isDirector>\s*(1|true)/i.test(xml) ? "Administrateur" : ""), out = [];
  for (const t of xml.split(/<nonDerivativeTransaction>/i).slice(1)) {
    const code = tag(t, "transactionCode"); if (!/^[PS]$/.test(code)) continue;
    const sh = parseFloat(tag(t, "transactionShares")), px = parseFloat(tag(t, "transactionPricePerShare")), d = tag(t, "transactionDate");
    if (sh > 0) out.push({ owner, title, code, sh, px: isFinite(px) ? px : null, d: d.slice(0, 10) });
  }
  return out;
}
export async function main(max = 470) {
  const CIK = await cikMap(getJSON, fetch), since = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10), res = {}, stop = Date.now() + 12 * 60e3;
  await pool(U.filter(c => c.sec).slice(0, max), 4, async c => {
    if (Date.now() > stop) return;
    try {
      const cik = c.cik || CIK[c.sec]; if (!cik) return;
      const r = (await getJSON(fetch, subsUrl(cik)))?.filings?.recent || {}, list = [];
      for (let i = 0; i < (r.form || []).length && list.length < 8; i++) if (r.form[i] === "4" && r.filingDate[i] >= since) list.push(`https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${String(r.accessionNumber[i]).replace(/-/g, "")}/${String(r.primaryDocument[i]).replace(/^xsl[^/]+\//, "")}`);
      const tx = [];
      for (const u of list) { const x = await fetch(u, { headers: { "user-agent": UA } }); if (x.ok) parseForm4(await x.text()).forEach(t => tx.push({ ...t, u })); await sleep(120); }
      if (tx.length) res[c.id] = tx.sort((a, b) => b.d.localeCompare(a.d)).slice(0, 20);
    } catch (e) { }
    await sleep(120);
  });
  writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), source: "SEC, formulaires 4", items: res }));
  console.log(Object.keys(res).length, "sociétés avec des opérations de dirigeants");
  return res;
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.log("::warning::Opérations des dirigeants non lues :", e.message); });
