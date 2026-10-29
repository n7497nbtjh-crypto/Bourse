// Connecteur MCP (/mcp) : protocole JSON-RPC « Streamable HTTP », outils en lecture seule sur les vraies données du site.
// Usage : node tests/t_mcp.mjs   (après node build.mjs)
// Avec le SDK officiel (facultatif, non installé dans le dépôt) : MCP_SDK=/chemin/vers/node_modules/@modelcontextprotocol/sdk node tests/t_mcp.mjs
import { readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
const { default: W } = await import("../cf/site/_worker.js");
const root = new URL("../cf/site/", import.meta.url);
const env = { ASSETS: { fetch: async req => {
  const p = new URL(req.url).pathname, f = new URL("." + (p === "/" ? "/index.html" : p), root);
  if (!existsSync(f)) return new Response("not found", { status: 404, headers: { "content-type": "text/html" } });
  return new Response(readFileSync(f), { headers: { "content-type": p.endsWith(".json") ? "application/json" : p.endsWith(".js") ? "text/javascript" : "text/html" } });
} } };
globalThis.caches = { default: { match: async () => undefined, put: async () => { } } }; // pas de feuille de cours en test : relevé publié
const realFetch = globalThis.fetch; globalThis.fetch = async (u, o) => String(u).includes("docs.google.com") ? new Response("", { status: 503 }) : realFetch(u, o);
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("ÉCHEC", m); } };
const H = { "content-type": "application/json", accept: "application/json, text/event-stream" };
const rpc = async (body, h = {}) => { const r = await W.fetch(new Request("https://t.local/mcp", { method: "POST", headers: { ...H, "cf-connecting-ip": "9.9.9.9", ...h }, body: typeof body === "string" ? body : JSON.stringify(body) }), env, {}); return [r.status, r.status === 202 ? null : await r.json(), r]; };
const call = async (name, args, id = 1) => { const [s, j] = await rpc({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } }); ok(s === 200 && j.result, `${name} : réponse ${s} ${JSON.stringify(j).slice(0, 200)}`); return j.result; };
const txt = r => r.content[0].text;

// Protocole
let [s, j, r] = await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } } });
ok(s === 200 && j.result.protocolVersion === "2025-06-18" && j.result.capabilities.tools && j.result.serverInfo.name === "bilan" && /pas un conseil|Ne transformez jamais/.test(j.result.instructions), "initialize " + JSON.stringify(j).slice(0, 300));
ok(r.headers.get("access-control-allow-origin") === "*" && /json/.test(r.headers.get("content-type")), "CORS et type JSON");
[s, j] = await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2099-01-01" } }); ok(j.result.protocolVersion === "2025-11-25" && j.result.serverInfo.icons, "version inconnue : la plus récente proposée");
[s, j] = await rpc({ jsonrpc: "2.0", method: "notifications/initialized" }); ok(s === 202 && j === null, "notification : 202 sans corps " + s);
[s, j] = await rpc({ jsonrpc: "2.0", id: "p", method: "ping" }); ok(j.id === "p" && JSON.stringify(j.result) === "{}", "ping");
[s, j] = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }, { "mcp-protocol-version": "2025-06-18" });
const names = j.result.tools.map(t => t.name);
ok(["rechercher_entreprise", "fiche_entreprise", "comparer_entreprises", "eligibilite_pea", "etf", "calendrier", "lecon", "search", "fetch"].every(n => names.includes(n)), "outils listés " + names);
ok(j.result.tools.every(t => t.inputSchema && t.inputSchema.type === "object" && t.annotations.readOnlyHint === true && t.annotations.destructiveHint === false && t.description.length > 40), "schémas et annotations lecture seule");
[s, j] = await rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "inexistant", arguments: {} } }); ok(j.error && j.error.code === -32602, "outil inconnu : -32602");
[s, j] = await rpc({ jsonrpc: "2.0", id: 4, method: "prompts/list" }); ok(j.error && j.error.code === -32601, "méthode non proposée : -32601");
[s, j] = await rpc("{pas du json"); ok(s === 400 && j.error.code === -32700, "JSON illisible : -32700");
[s, j] = await rpc({ id: 5, method: "ping" }); ok(j.error && j.error.code === -32600, "sans jsonrpc 2.0 : -32600");
[s, j] = await rpc({ jsonrpc: "2.0", id: 6, method: "ping" }, { "mcp-protocol-version": "1999-01-01" }); ok(s === 400, "en-tête de version inconnue : 400");
[s, j] = await rpc([{ jsonrpc: "2.0", id: 7, method: "ping" }, { jsonrpc: "2.0", method: "notifications/initialized" }, { jsonrpc: "2.0", id: 8, method: "tools/list" }]); ok(Array.isArray(j) && j.length === 2 && j[0].id === 7 && j[1].id === 8, "lot de requêtes");
let g = await W.fetch(new Request("https://t.local/mcp", { headers: { accept: "text/event-stream" } }), env, {}); ok(g.status === 405, "GET flux SSE : 405 " + g.status);
g = await W.fetch(new Request("https://t.local/mcp", { headers: { accept: "text/html" } }), env, {}); ok(g.status === 302 && g.headers.get("location") === "/connecteur", "GET depuis un navigateur : vers /connecteur");
g = await W.fetch(new Request("https://t.local/mcp", { method: "OPTIONS" }), env, {}); ok(g.status === 204 && /mcp-protocol-version/.test(g.headers.get("access-control-allow-headers")), "préflight CORS");

// Outils
let x = await call("rechercher_entreprise", { requete: "LVMH" });
ok(x.structuredContent.entreprises[0].id === "lvmh" && /information factuelle/i.test(txt(x)) && /Sources :/.test(txt(x)), "recherche par nom " + txt(x).slice(0, 120));
x = await call("rechercher_entreprise", { requete: "FR0000120271" }); ok(x.structuredContent.entreprises[0].id === "totalenergies", "recherche par ISIN");
x = await call("rechercher_entreprise", { requete: "AAPL" }); ok(x.structuredContent.entreprises[0].id === "apple", "recherche par ticker");
x = await call("rechercher_entreprise", { requete: "luxe", region: "FR" }); ok(x.structuredContent.entreprises.length >= 2 && x.structuredContent.entreprises.every(c => c.region === "France"), "recherche par activité et région " + x.structuredContent.entreprises.map(c => c.id));
x = await call("rechercher_entreprise", { requete: "MSCI World" }); ok(x.structuredContent.etf.length >= 1, "ETF signalés dans la recherche");
x = await call("rechercher_entreprise", {}); ok(x.isError === true && /requete/.test(txt(x)), "paramètre manquant : erreur lisible");

x = await call("fiche_entreprise", { entreprise: "lvmh" }); const F = x.structuredContent;
ok(F.nom === "LVMH" && F.exercice >= 2024 && F.reperes.length >= 5 && F.reperes.every(r => ["vert", "gris", "orange", "sans objet"].includes(r.verdict) && r.regle), "fiche : repères " + JSON.stringify(F.reperes.map(r => [r.cle, r.verdict])));
const marge = F.reperes.find(r => r.cle === "marge");
ok(marge && marge.mediane_secteur > 0 && /médiane du secteur/.test(txt(x)) && F.secteur_compare.entreprises >= 3, "fiche : médiane du secteur " + JSON.stringify(marge));
ok(F.historique && F.historique.length >= 3 && F.sources.some(s => /filings\.xbrl\.org/.test(s.url)) && F.sources.some(s => s.url === "https://t.local/entreprise/lvmh/comptes"), "fiche : historique et sources officielles");
ok(F.pea.eligible === true && F.bourse && F.bourse.per > 0 && F.bourse.source, "fiche : PEA et PER " + JSON.stringify(F.bourse).slice(0, 200));
ok(!/NaN|undefined/.test(txt(x)) && !/—/.test(txt(x)) && /pas un conseil/.test(txt(x)), "fiche : texte propre");
x = await call("fiche_entreprise", { entreprise: "Apple" }); ok(x.structuredContent.pea.eligible === null && x.structuredContent.sources.some(s => /sec\.gov/.test(s.url)) && x.structuredContent.devise_des_comptes === "USD", "fiche US : SEC, PEA non déterminé sans ISIN");
x = await call("fiche_entreprise", { entreprise: "BNP Paribas" }); ok(x.structuredContent.reperes.find(r => r.cle === "dette").verdict === "sans objet" && !x.structuredContent.reperes.find(r => r.cle === "marge"), "banque : dette et marge sans objet");
x = await call("fiche_entreprise", { entreprise: "zzzz-inconnue" }); ok(x.isError && /introuvable/.test(txt(x)), "entreprise inconnue");
x = await call("fiche_entreprise", { entreprise: "totalenergie" }); ok(!x.isError && x.structuredContent.id === "totalenergies", "nom approché " + txt(x).slice(0, 80));

x = await call("comparer_entreprises", { entreprises: ["lvmh", "hermes", "kering"] });
ok(x.structuredContent.entreprises.length === 3 && /\| Marge d'exploitation \|/.test(txt(x)) && /\| PEA \| oui \| oui \| oui \|/.test(txt(x)), "comparaison " + txt(x).slice(0, 300));
x = await call("comparer_entreprises", { entreprises: ["lvmh"] }); ok(x.isError, "comparaison : deux au moins");

x = await call("eligibilite_pea", { titre: "Apple" }); ok(x.structuredContent.eligible === null && /siège/.test(txt(x)), "PEA : Apple sans ISIN");
x = await call("eligibilite_pea", { titre: "ASML" }); ok(x.structuredContent.eligible === true && /NL/.test(txt(x)), "PEA : ASML");
x = await call("eligibilite_pea", { titre: "Shell" }); ok(x.structuredContent.eligible === false, "PEA : Shell (Royaume-Uni)");
x = await call("eligibilite_pea", { titre: "FR001400U5Q4" }); ok(x.structuredContent.type === "etf" && x.structuredContent.eligible === true, "PEA : ETF par ISIN");
x = await call("eligibilite_pea", { titre: "US0378331005" }); ok(x.structuredContent.eligible === null && /US/.test(txt(x)) && /L221-31/.test(txt(x)), "PEA : ISIN non suivi");

x = await call("etf", { requete: "amundi-msci-world-pea" }); const E = x.structuredContent;
ok(E.id === "amundi-msci-world-pea" && E.frais_courants_pct > 0 && E.pea === true && E.composition && E.composition.principales_lignes.length >= 5 && /N-PORT/.test(E.composition.note), "ETF : détail et composition " + JSON.stringify(E).slice(0, 250));
x = await call("etf", { pea: true, categorie: "actions-monde", limite: 5 }); ok(x.structuredContent.etf.length >= 2 && x.structuredContent.etf.every(e => e.pea) && x.structuredContent.etf.every((e, i, a) => !i || (a[i - 1].frais_courants_pct ?? 9) <= (e.frais_courants_pct ?? 9)), "ETF : liste filtrée, moins chers d'abord");
x = await call("etf", { requete: "S&P 500" }); ok(!x.isError && (x.structuredContent.etf || [x.structuredContent]).length >= 1, "ETF : par indice");

x = await call("calendrier", { jours: 366 }); const D = x.structuredContent.dates;
ok(D.length > 0 && D.every((d, i) => !i || D[i - 1].date <= d.date) && D.every(d => d.date >= new Date(Date.now() - 864e5).toISOString().slice(0, 10)), "calendrier trié, à venir " + D.length);
x = await call("calendrier", { entreprise: "totalenergies", type: "dividende", jours: 366 }); ok(x.structuredContent.dates.every(d => d.id === "totalenergies" && /ividende/.test(d.type + d.libelle)), "calendrier filtré");

x = await call("lecon", { sujet: "intérêts composés" }); ok(/compos/i.test(x.structuredContent.titre) && x.structuredContent.lien.includes("/academie/") && (x.structuredContent.contenu || x.structuredContent.premium), "leçon trouvée " + x.structuredContent.titre);
x = await call("lecon", { sujet: "qwxzv" }); ok(x.isError, "leçon introuvable");

x = await call("search", { query: "LVMH" }); const SR = JSON.parse(txt(x)).results;
ok(SR.length && SR[0].id === "entreprise:lvmh" && SR[0].url.endsWith("/entreprise/lvmh"), "search (ChatGPT) " + JSON.stringify(SR[0]));
x = await call("fetch", { id: "entreprise:lvmh" }); const doc = JSON.parse(txt(x)); ok(doc.id === "entreprise:lvmh" && doc.title === "LVMH" && /Marge/.test(doc.text) && doc.url, "fetch (ChatGPT)");
x = await call("fetch", { id: "etf:amundi-msci-world-pea" }); ok(!x.isError && JSON.parse(txt(x)).text.includes("MSCI World"), "fetch ETF");

// Débit : 240 appels par minute
let lim = null; for (let i = 0; i < 241; i++) { const [, jj] = await rpc({ jsonrpc: "2.0", id: 100 + i, method: "tools/call", params: { name: "rechercher_entreprise", arguments: { requete: "air" } } }, { "cf-connecting-ip": "8.8.8.8" }); if (jj.result.isError) lim = jj; }
ok(lim && /Trop de requêtes/.test(lim.result.content[0].text), "241e appel de la minute refusé");

// Page /connecteur servie avec son titre
const pg = await W.fetch(new Request("https://t.local/connecteur"), env, {}); const ht = await pg.text();
ok(pg.status === 200 && /<title>Utiliser bilan. dans ChatGPT ou Claude/.test(ht) && /rel="manifest"/.test(ht) && /og:image/.test(ht) && pg.headers.get("x-bilan-version"), "page /connecteur");

// Client MCP officiel (facultatif)
if (process.env.MCP_SDK) {
  const srv = createServer(async (q, res) => { const ch = []; for await (const c of q) ch.push(c);
    const rq = new Request("https://t.local" + q.url, { method: q.method, headers: Object.fromEntries(Object.entries(q.headers).filter(([k]) => k !== "host")), body: ["GET", "HEAD"].includes(q.method) ? undefined : Buffer.concat(ch) });
    const rr = await W.fetch(rq, env, {}); res.writeHead(rr.status, Object.fromEntries(rr.headers)); res.end(Buffer.from(await rr.arrayBuffer())); });
  await new Promise(k => srv.listen(0, k));
  const { Client } = await import(process.env.MCP_SDK + "/dist/esm/client/index.js"), { StreamableHTTPClientTransport } = await import(process.env.MCP_SDK + "/dist/esm/client/streamableHttp.js");
  const cl = new Client({ name: "test-bilan", version: "1.0.0" });
  await cl.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${srv.address().port}/mcp`)));
  const sv = cl.getServerVersion(), tl = await cl.listTools(), fr = await cl.callTool({ name: "fiche_entreprise", arguments: { entreprise: "Air Liquide" } });
  ok(sv.name === "bilan" && tl.tools.length === 9 && fr.content[0].text.includes("Air Liquide") && fr.structuredContent.reperes.length > 3, "SDK officiel : connexion, liste, appel");
  const pe = await cl.callTool({ name: "eligibilite_pea", arguments: { titre: "Nvidia" } }); ok(/PEA|ISIN/.test(pe.content[0].text), "SDK officiel : eligibilite_pea");
  await cl.close(); srv.close();
  console.log("SDK MCP", sv.name, sv.version, "·", tl.tools.length, "outils");
}
console.log(fails ? `mcp : ${fails} échec(s)` : "mcp : tout est bon"); process.exit(fails ? 1 : 0);
