// Quota des comparaisons des gratuits (cf/src/quota.mjs, 4/11) : 5 par semaine, même ensemble ou ensemble agrandi non recompté, autre appareil à part
import { DatabaseSync } from "node:sqlite";
import { quota } from "../cf/src/quota.mjs";
const sql = new DatabaseSync(":memory:");
const DB = { prepare: q => { const st = sql.prepare(q); let a = []; const o = { bind: (...x) => (a = x, o), run: async () => st.run(...a), first: async () => st.get(...a) || null, all: async () => ({ results: st.all(...a) }) }; return o; } };
const env = { DB };
const r = (ids, ip = "1.1.1.1") => quota(new Request("https://t/api/quota/comparer", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": ip }, body: JSON.stringify({ ids }) }), env).then(x => x.json());
const out = [];
out.push(await r(["a", "b"]), await r(["a", "b"]), await r(["a", "b", "c"]), await r(["d", "e"]), await r(["f", "g"]), await r(["h", "i"]), await r(["j", "k"]), await r(["l", "m"]), await r(["a", "b", "c"]), await r(["l", "m"], "2.2.2.2"));
const got = out.map(o => `${o.ok}/${o.reste}`).join(" "), exp = "true/2 true/2 true/2 true/1 true/0 false/0 false/0 false/0 true/0 true/2"; // 6/11 : 3 par semaine
if (got !== exp) { console.error("quota : ÉCHEC", got); process.exit(1); } console.log("quota : tout est bon");
