// Sonde n° 2 du chantier « communication » : fiches MSCI (recherche de la fiche en euros) et pages de rendements annuels.
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = process.env.SORTIE || "data/sonde/out/communication2";
mkdirSync(OUT, { recursive: true });
const UA = "bilan-site (contact via GitHub n7497nbtjh-crypto/Bourse)";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const save = (n, d) => writeFileSync(`${OUT}/${n}`, typeof d === "string" ? d : JSON.stringify(d, null, 1));
let pdfjs = null; try { pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs"); } catch (e) { console.log("pdfjs absent", String(e)); }
async function pdfText(u) {
  const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
  const buf = new Uint8Array(await r.arrayBuffer());
  if (!pdfjs || String.fromCharCode(...buf.slice(0, 4)) !== "%PDF") return { status: r.status, txt: new TextDecoder().decode(buf).slice(0, 2000) };
  const doc = await pdfjs.getDocument({ data: buf }).promise; let txt = "";
  for (let i = 1; i <= doc.numPages; i++) { const p = await doc.getPage(i); const c = await p.getTextContent(); txt += c.items.map(x => x.str).join(" ") + "\n\n"; }
  return { status: r.status, txt };
}
const IDS = ["ff545d0e-0088-425b-8bd5-b0a92d02bff5", "309722c0-de32-f68b-f16c-9cb10b484445", "23dbd3f5-62a2-bdba-e981-64f0a73a9d44", "7bf31704-62a3-ecab-f221-b898379aecee", "8f801008-0016-d37a-d221-0b8333d95557", "18c3e10d-4d10-97f4-ecce-64710a4772a1", "890dd84d-3750-4656-87f2-1229ed5a5d6e", "5165e137-8bde-9383-7cc4-0c7f369bf61c", "45175455-990a-a866-657c-9cfda0f22aab", "ba7adc82-8a05-435d-831c-7e91c36606b3", "17ffcefa-d7da-4613-a5a9-dcf7a4d89c2c", "d9948ba0-906b-d0a4-b28e-08a3a488e50c", "67859d42-8584-f4a3-c0af-1abb51743e47", "a487ea40-4a22-8c27-7e8b-1e74e9f15543", "7e213418-c4c5-4e7f-8213-050a64d7b566", "d6afd811-4427-f1d1-0f16-54f0f14071c0", "5eb43764-87ee-4d1a-ac07-6d7d7db8a4ec", "33da7627-9696-3135-2009-43f9ca9f7353", "f50f7512-b92d-db61-7c1d-118a885e29b5"];
const idx = [];
for (const id of IDS) {
  try {
    const { status, txt } = await pdfText(`https://www.msci.com/documents/10199/${id}`);
    const titre = (txt.match(/MSCI [^|]{3,80}?\((?:EUR|USD|GBP|JPY|CHF|LOCAL)\)/) || [])[0] || txt.slice(0, 120);
    idx.push({ id, status, titre, len: txt.length });
    save(`msci_${id}.txt`, txt);
    console.log(id, status, titre);
  } catch (e) { console.log(id, String(e)); }
  await sleep(1000);
}
save("msci_index.json", idx);
const PAGES = {
  wiki_en_msci_world: "https://en.wikipedia.org/w/api.php?action=parse&page=MSCI_World&prop=wikitext&format=json",
  chartrow_returns: "https://chartrow.com/msci-world/returns",
  chartrow_urth: "https://chartrow.com/quote/urth/returns",
  curvo_robots: "https://curvo.eu/robots.txt",
  curvo_world_eur: "https://curvo.eu/backtest/en/market-index/msci-world?currency=eur",
  chartrow_robots: "https://chartrow.com/robots.txt",
};
for (const [k, u] of Object.entries(PAGES)) {
  try { const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) }); const t = await r.text(); save(`page_${k}.txt`, `${r.status} ${r.url}\n` + t.slice(0, 2_500_000)); console.log(k, r.status, t.length); }
  catch (e) { console.log(k, String(e)); }
  await sleep(1000);
}
console.log("fin");
