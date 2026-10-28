// Diagnostic : montre comment quelques sociétés publient la ventilation de leur chiffre d'affaires (axes, membres, concepts).
import { writeFileSync } from "node:fs";
import U from "./univers.mjs";
import { leiFromIsin, filingsFor, getJSON } from "./fetch_data.mjs";
const ids = process.argv.slice(2), out = {};
for (const id of ids) {
  const c = U.find(x => x.id === id); if (!c) continue;
  try {
    const l = await leiFromIsin(fetch, c.isin, c.name); const fl = await filingsFor(fetch, l.lei, 1); const doc = await getJSON(fetch, fl[0].json);
    const rows = {};
    for (const f of Object.values(doc.facts || {})) {
      const d = f.dimensions || {}; const extra = Object.keys(d).filter(k => !["concept", "entity", "period", "unit", "language", "noteId"].includes(k));
      if (!extra.length || !/revenue|sales|turnover|chiffre/i.test(d.concept)) continue;
      const key = d.concept + " | " + extra.map(k => k + "=" + d[k]).join(" & ") + " | " + d.period;
      rows[key] = f.value;
    }
    out[id] = Object.entries(rows).slice(0, 80);
  } catch (e) { out[id] = String(e); }
}
writeFileSync(new URL("./diag/segments.json", import.meta.url), JSON.stringify(out, null, 1));
