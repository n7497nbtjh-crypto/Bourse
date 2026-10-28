// Construit les données de test du site : toutes les entreprises réelles « en cours de collecte »,
// plus une entreprise fictive complète (« Société Exemple ») pour tester les fiches. Rien n'est publié.
import { writeFileSync, mkdirSync } from "node:fs";
import U, { SECTEURS } from "../../data/univers.mjs";
import { collectOne, summary } from "../../data/fetch_data.mjs";
import * as X from "./make.mjs";
const fake = async url => {
  const j = url.includes("gleif") ? X.gleif : url.includes("/api/filings") ? X.filings : url.match(/exemple-(\d{4})\.json$/) ? X.reports[url.match(/exemple-(\d{4})/)[1]] : null;
  return { ok: !!j, status: j ? 200 : 404, json: async () => j };
};
const ex = await collectOne(fake, { id: "exemple", name: "Société Exemple (test)", ticker: "EX", tv: "EURONEXT:EX", isin: "FR0000000000", sector: "industrie" });
const ex2 = { ...ex, id: "exemple-2", name: "Autre Exemple (test)", fin: Object.fromEntries(Object.entries(ex.fin).map(([k, s]) => [k, s.map(v => v == null ? null : v * 0.7)])) };
const out = new URL("./site/", import.meta.url);
mkdirSync(new URL("societes/", out), { recursive: true });
writeFileSync(new URL("societes/exemple.json", out), JSON.stringify(ex));
writeFileSync(new URL("societes/exemple-2.json", out), JSON.stringify(ex2));
writeFileSync(new URL("societes.json", out), JSON.stringify({ updated: "2026-10-26", sectors: SECTEURS, errors: [],
  companies: [summary(ex), summary(ex2), ...U.map(c => ({ id: c.id, name: c.name, ticker: c.ticker, tv: c.tv, isin: c.isin, sector: c.sector, missing: true }))] }));
console.log("données de test écrites");
