// « Signaler une erreur », testé sur une base SQLite en mémoire qui imite Cloudflare D1.
import { DatabaseSync } from "node:sqlite";
import { signaler } from "../cf/src/signaler.mjs";
const sql = new DatabaseSync(":memory:");
const stmt = (q, p = []) => ({ bind: (...a) => stmt(q, a), all: async () => ({ results: sql.prepare(q).all(...p) }), first: async () => sql.prepare(q).get(...p) ?? null, run: async () => { sql.prepare(q).run(...p); return { meta: {} }; } });
const env = { DB: { prepare: q => stmt(q) }, ADMIN_KEY: "k" };
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("ÉCHEC", m); } };
const call = async (method, body, ip = "1.1.1.1", h = {}) => { const r = await signaler(new Request("https://t.local/api/signaler", { method, headers: { "content-type": "application/json", "cf-connecting-ip": ip, ...h }, body: body ? JSON.stringify(body) : undefined }), env); return [r.status, await r.json()]; };
let [s, j] = await call("POST", { page: "/entreprise/lvmh", quoi: "chiffre", texte: "La marge affichée ne correspond pas au rapport annuel." });
ok(s === 200 && j.ok, "signalement enregistré " + s);
[s] = await call("POST", { page: "/entreprise/lvmh", quoi: "chiffre", texte: "court" }); ok(s === 400, "texte trop court refusé");
[s] = await call("POST", { page: "javascript:alert(1)", texte: "une page invalide ici" }); ok(s === 400, "page invalide refusée");
for (let i = 0; i < 4; i++) await call("POST", { page: "/", texte: "signalement numéro " + i }, "2.2.2.2");
[s] = await call("POST", { page: "/", texte: "signalement numéro 5" }, "2.2.2.2"); ok(s === 200, "5e accepté");
[s] = await call("POST", { page: "/", texte: "signalement numéro 6" }, "2.2.2.2"); ok(s === 429, "6e limité");
[s] = await call("GET"); ok(s === 403, "lecture protégée");
[s, j] = await call("GET", null, "1.1.1.1", { "x-admin-key": "k" }); ok(s === 200 && j.items.length === 6 && !("who" in j.items[0]), "lecture avec la clé, sans empreinte");
console.log(fails ? `${fails} échec(s)` : "signaler : tout est bon"); process.exit(fails ? 1 : 0);
