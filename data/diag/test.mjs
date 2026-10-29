// Sonde : grille tarifaire officielle de Fortuneo (ordres de Bourse, offre Starter)
import { writeFileSync, mkdirSync } from "node:fs";
const DIR = "data/diag/courtiers/"; mkdirSync(DIR, { recursive: true });
const BROWSER = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const log = [], L = (...a) => { const s = a.join(" "); log.push(s); console.log(s); };
const strip = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&euro;/g, "€").replace(/&eacute;/g, "é").replace(/&egrave;/g, "è").replace(/&agrave;/g, "à").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const urls = ["https://www.fortuneo.fr/bourse/tarifs", "https://www.fortuneo.fr/tarifs-bancaires", "https://www.fortuneo.fr/bourse", "https://www.fortuneo.fr/bourse/offre-starter", "https://www.fortuneo.fr/tarifs", "https://www.fortuneo.fr/aide/bourse/tarifs-bourse"];
const out = {};
for (const u of urls) {
  try {
    const r = await fetch(u, { headers: { "user-agent": BROWSER, accept: "text/html,*/*", "accept-language": "fr-FR" }, redirect: "follow", signal: AbortSignal.timeout(30e3) });
    const h = await r.text(), t = strip(h);
    const pdfs = [...new Set([...h.matchAll(/href="([^"]+\.pdf[^"]*)"/gi)].map(m => m[1]))].filter(x => /tarif|grille|condition/i.test(x));
    const hits = [...t.matchAll(/.{0,220}(Starter|1,95|0,35 ?%|500 ?€|premier ordre).{0,260}/gi)].map(m => m[0]).slice(0, 12);
    out[u] = { status: r.status, url: r.url, len: h.length, pdfs: pdfs.slice(0, 10), hits };
    L(u, r.status, r.url, h.length, "pdf", pdfs.length, "extraits", hits.length);
    for (const p of pdfs.slice(0, 3)) {
      const pu = p.startsWith("http") ? p : new URL(p, r.url).toString();
      const pr = await fetch(pu, { headers: { "user-agent": BROWSER } }); const b = Buffer.from(await pr.arrayBuffer());
      writeFileSync(DIR + "fortuneo_" + pu.split("/").pop().replace(/[^\w.-]/g, "_").slice(0, 60), b); L("  pdf", pu, pr.status, b.length);
    }
  } catch (e) { L(u, "erreur", e.message); }
}
writeFileSync(DIR + "fortuneo.json", JSON.stringify(out, null, 1));
writeFileSync("data/diag/out.json", JSON.stringify({ courtiers: log, date: new Date().toISOString() }, null, 1));
