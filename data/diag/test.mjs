// Diagnostic (2) : lecture des rapports annuels ESEF déposés à l'AMF (data/amf.mjs) pour des sociétés en retard ou sans données.
import { writeFileSync, mkdirSync } from "node:fs";
import { amfAnnualFilings, amfDoc, ixbrlFiles, unzip } from "../amf.mjs";
import { extract, toSeries, merge } from "../esef.mjs";
import { getJSON, UA } from "../fetch_data.mjs";
const DIR = "data/diag/fraicheur/"; mkdirSync(DIR, { recursive: true });
const log = [], L = (...a) => { const s = a.join(" "); log.push(s); console.log(s); };
const T0 = Date.now();
const LIST = [["lvmh", "FR0000121014"], ["air-liquide", "FR0000120073"], ["orange", "FR0000133308"], ["eiffage", "FR0000130452"], ["jcdecaux", "FR0000077919"], ["lectra", "FR0000065484"], ["essilorluxottica", "FR0000121667"], ["publicis", "FR0000130577"], ["veolia", "FR0000124141"], ["bouygues", "FR0000120503"]];
const res = {};
for (const [id, isin] of LIST) {
  if (Date.now() - T0 > 12 * 60e3) break;
  try {
    const fl = await amfAnnualFilings(getJSON, fetch, isin, "2025-01-01");
    L(id, fl.length, "dépôts annuels", JSON.stringify(fl.slice(0, 4)));
    res[id] = { filings: fl };
    for (const f of fl.slice(0, 3)) {
      const t = Date.now();
      const r = await fetch(f.url, { headers: { "user-agent": UA } }); const buf = Buffer.from(await r.arrayBuffer());
      const magic = buf.slice(0, 4).toString("hex"), z = magic === "504b0304" ? Object.keys(unzip(buf)) : [];
      const htmls = ixbrlFiles(buf, f.url);
      const doc = await amfDoc(async () => ({ ok: true, arrayBuffer: async () => buf }), UA, f);
      const ex = doc ? extract(doc) : null, s = ex ? toSeries(merge([ex])) : null;
      L("  ", f.url.split("/").pop(), "taille", buf.length, "magic", magic, "fichiers", z.length, JSON.stringify(z.filter(n => /html/i.test(n)).slice(0, 4)), "iXBRL", htmls.length, "faits", doc ? Object.keys(doc.facts).length : 0,
        "années", s ? JSON.stringify(s.years) : "-", "CA", s && s.fin.ca ? JSON.stringify(s.fin.ca) : "-", "net", s && s.fin.net ? JSON.stringify(s.fin.net) : "-", Math.round((Date.now() - t) / 1000) + "s");
      res[id][f.url] = s;
      if (s && s.years.length) break;
    }
  } catch (e) { L(id, "erreur", e.message); }
}
writeFileSync(DIR + "amf_lecture.json", JSON.stringify(res, null, 1));
writeFileSync("data/diag/out.json", JSON.stringify({ fraicheur: log }, null, 1));
