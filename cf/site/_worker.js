// data/univers.mjs
var SECTEURS = {
  conso: "Consommation",
  industrie: "Industrie",
  energie: "\xC9nergie",
  sante: "Sant\xE9",
  tech: "Technologie",
  finance: "Banque et assurance",
  telecom: "T\xE9l\xE9coms et m\xE9dias",
  materiaux: "Mat\xE9riaux",
  services: "Services aux collectivit\xE9s",
  immo: "Immobilier"
}, univers_default = [
  { id: "accor", name: "Accor", ticker: "AC", isin: "FR0000120404", sector: "conso" },
  { id: "air-liquide", name: "Air Liquide", ticker: "AI", isin: "FR0000120073", sector: "materiaux" },
  { id: "airbus", name: "Airbus", ticker: "AIR", isin: "NL0000235190", sector: "industrie" },
  { id: "arcelormittal", name: "ArcelorMittal", legal: "ArcelorMittal", ticker: "MT", isin: "LU1598757687", sector: "materiaux" },
  { id: "axa", name: "AXA", ticker: "CS", isin: "FR0000120628", sector: "finance" },
  { id: "biomerieux", name: "bioM\xE9rieux", ticker: "BIM", isin: "FR0013280286", sector: "sante" },
  { id: "bnp-paribas", name: "BNP Paribas", ticker: "BNP", isin: "FR0000131104", sector: "finance" },
  { id: "bouygues", name: "Bouygues", ticker: "EN", isin: "FR0000120503", sector: "industrie" },
  { id: "bureau-veritas", name: "Bureau Veritas", ticker: "BVI", isin: "FR0006174348", sector: "industrie" },
  { id: "capgemini", name: "Capgemini", ticker: "CAP", isin: "FR0000125338", sector: "tech" },
  { id: "carrefour", name: "Carrefour", ticker: "CA", isin: "FR0000120172", sector: "conso" },
  { id: "credit-agricole", name: "Cr\xE9dit Agricole", ticker: "ACA", isin: "FR0000045072", sector: "finance" },
  { id: "danone", name: "Danone", ticker: "BN", isin: "FR0000120644", sector: "conso" },
  { id: "dassault-systemes", name: "Dassault Syst\xE8mes", ticker: "DSY", isin: "FR0014003TT8", sector: "tech" },
  { id: "edenred", name: "Edenred", ticker: "EDEN", isin: "FR0010908533", sector: "tech" },
  { id: "engie", name: "Engie", ticker: "ENGI", isin: "FR0010208488", sector: "services" },
  { id: "essilorluxottica", name: "EssilorLuxottica", ticker: "EL", isin: "FR0000121667", sector: "sante" },
  { id: "eurofins", name: "Eurofins Scientific", ticker: "ERF", isin: "FR0014000MR3", sector: "sante" },
  { id: "hermes", name: "Herm\xE8s", ticker: "RMS", isin: "FR0000052292", sector: "conso" },
  { id: "kering", name: "Kering", ticker: "KER", isin: "FR0000121485", sector: "conso" },
  { id: "legrand", name: "Legrand", ticker: "LR", isin: "FR0010307819", sector: "industrie" },
  { id: "loreal", name: "L'Or\xE9al", ticker: "OR", isin: "FR0000120321", sector: "conso" },
  { id: "lvmh", name: "LVMH", ticker: "MC", isin: "FR0000121014", sector: "conso" },
  { id: "michelin", name: "Michelin", ticker: "ML", isin: "FR001400AJ45", sector: "industrie" },
  { id: "orange", name: "Orange", ticker: "ORA", isin: "FR0000133308", sector: "telecom" },
  { id: "pernod-ricard", name: "Pernod Ricard", ticker: "RI", isin: "FR0000120693", sector: "conso" },
  { id: "publicis", name: "Publicis", ticker: "PUB", isin: "FR0000130577", sector: "telecom" },
  { id: "renault", name: "Renault", ticker: "RNO", isin: "FR0000131906", sector: "industrie" },
  { id: "safran", name: "Safran", ticker: "SAF", isin: "FR0000073272", sector: "industrie" },
  { id: "saint-gobain", name: "Saint-Gobain", ticker: "SGO", isin: "FR0000125007", sector: "materiaux" },
  { id: "sanofi", name: "Sanofi", ticker: "SAN", isin: "FR0000120578", sector: "sante" },
  { id: "schneider-electric", name: "Schneider Electric", ticker: "SU", isin: "FR0000121972", sector: "industrie" },
  { id: "societe-generale", name: "Soci\xE9t\xE9 G\xE9n\xE9rale", ticker: "GLE", isin: "FR0000130809", sector: "finance" },
  { id: "stmicroelectronics", name: "STMicroelectronics", ticker: "STMPA", isin: "NL0000226223", sector: "tech" },
  { id: "teleperformance", name: "Teleperformance", ticker: "TEP", isin: "FR0000051807", sector: "tech" },
  { id: "thales", name: "Thales", ticker: "HO", isin: "FR0000121329", sector: "industrie" },
  { id: "totalenergies", name: "TotalEnergies", ticker: "TTE", isin: "FR0000120271", sector: "energie" },
  { id: "unibail-rodamco-westfield", name: "Unibail-Rodamco-Westfield", ticker: "URW", isin: "FR0013326246", sector: "immo" },
  { id: "veolia", name: "Veolia", ticker: "VIE", isin: "FR0000124141", sector: "services" },
  { id: "vinci", name: "Vinci", ticker: "DG", isin: "FR0000125486", sector: "industrie" }
].map((c) => ({ ...c, tv: "EURONEXT:" + c.ticker }));

// cf/src/amf.mjs
var API = "https://www.info-financiere.gouv.fr/api/explore/v2.1/catalog/datasets/flux-amf-new-prod/records";
function pick(rec, tests) {
  for (let t of tests)
    for (let [k, v] of Object.entries(rec))
      if (!(v == null || v === "" || typeof v == "object") && t(k, v))
        return String(v);
  return "";
}
function normalize(rec) {
  let r = rec.record && rec.record.fields ? rec.record.fields : rec, date = r.uin_dat_amf || pick(r, [(k) => /dat/.test(k)]), company = pick(r, [(k) => /nom_soc|raison_sociale|denomination/.test(k), (k) => /societe.*nom|nom.*societe/.test(k), (k) => /(^|_)nom($|_)/.test(k)]), title = pick(r, [(k) => /tit/.test(k), (k) => /libelle|objet|intitule/.test(k)]), type = r.sous_type_d_information || r.subtype_of_information || pick(r, [(k) => /sous_type|subtype/.test(k), (k) => /type/.test(k) && !/mime|content/.test(k)]), url = pick(r, [(k, v) => /^https?:\/\//.test(v) && /\.pdf/i.test(v), (k, v) => /^https?:\/\//.test(v)]);
  return {
    id: r.uin_idt_uin || "",
    date: String(date || ""),
    lang: r.informationdeposee_inf_lng_inf || "",
    isin: r.identificationsociete_iso_cd_isi || "",
    company,
    title: title || type || "Publication",
    type,
    url
  };
}
async function amf(request, followed = []) {
  let u = new URL(request.url), limit = Math.max(1, Math.min(50, parseInt(u.searchParams.get("limit") || "20", 10) || 20)), q = (u.searchParams.get("q") || "").replace(/["\\]/g, "").slice(0, 60).trim(), isin = (u.searchParams.get("isin") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12), raw = u.searchParams.get("raw") === "1", where = [];
  u.searchParams.get("suivies") === "1" && followed.length && where.push(`identificationsociete_iso_cd_isi in (${followed.map((i) => `"${i}"`).join(",")})`), isin && where.push(`identificationsociete_iso_cd_isi="${isin}"`), q && where.push(`"${q}"`);
  let api = new URL(API);
  api.searchParams.set("limit", String(limit)), api.searchParams.set("order_by", "uin_dat_amf desc"), where.length && api.searchParams.set("where", where.join(" AND "));
  let cache = typeof caches < "u" ? caches.default : null, key = new Request(api.toString() + (raw ? "&_raw" : ""));
  if (cache) {
    let hit = await cache.match(key);
    if (hit) return hit;
  }
  let body, status = 200;
  try {
    let r = await fetch(api.toString(), { headers: { accept: "application/json" }, cf: { cacheTtl: 900 } });
    if (!r.ok) throw new Error("AMF " + r.status);
    let j = await r.json(), list = j.results || j.records || [];
    body = raw ? j : { source: "AMF \u2013 info-financiere.gouv.fr", total: j.total_count ?? list.length, items: list.map(normalize) };
  } catch {
    status = 502, body = { error: "Le flux de l'AMF est momentan\xE9ment indisponible.", items: [] };
  }
  let res = new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": `public, max-age=${status === 200 ? 900 : 60}` }
  });
  return cache && status === 200 && await cache.put(key, res.clone()), res;
}

// cf/src/worker.mjs
var INDEX = univers_default.map((c) => ({ id: c.id, name: c.name, sector: SECTEURS[c.sector], desc: "" })), SITE = "Rep\xE8re", BASE_DESC = "Les chiffres cl\xE9s des entreprises cot\xE9es, expliqu\xE9s simplement, et des simulateurs pour comprendre l'investissement. Informations factuelles, sans conseil.", TOOLS = { passe: "Simulateur sur le pass\xE9", interets: "Simulateur d'int\xE9r\xEAts compos\xE9s", frais: "Simulateur de l'impact des frais", "pea-cto": "Simulateur PEA ou compte-titres", "une-fois": "Investir en une fois ou chaque mois" }, BY = Object.fromEntries(INDEX.map((c) => [c.id, c])), esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function meta(path) {
  let p = path.replace(/\/+$/, "") || "/", base = p.replace(/^(\/entreprise\/[a-z0-9-]+)\/(comptes|actualite|agenda)$/, "$1"), m;
  if (p === "/") return { title: `${SITE} \xB7 La Bourse expliqu\xE9e`, desc: BASE_DESC };
  if (m = base.match(/^\/entreprise\/([a-z0-9-]+)$/)) {
    let c = BY[m[1]];
    return c ? { title: `${c.name} : cours, comptes et actualit\xE9 \xB7 ${SITE}`, desc: `${c.name} (${c.sector}) : cours de l'action, chiffre d'affaires, marge, r\xE9sultat, dette et dividende tir\xE9s des rapports annuels, publications officielles AMF. Chaque chiffre est expliqu\xE9.` } : null;
  }
  if (m = p.match(/^\/simulateurs(?:\/([a-z-]+))?$/)) {
    let t = TOOLS[m[1] || "passe"];
    return t ? { title: `${t} \xB7 ${SITE}`, desc: "Simulez l'\xE9volution d'un placement, avec les hypoth\xE8ses affich\xE9es. Outil p\xE9dagogique, sans conseil." } : null;
  }
  return p === "/actualites" ? { title: `Actualit\xE9 des entreprises \xB7 ${SITE}`, desc: "R\xE9sultats, dividendes, assembl\xE9es g\xE9n\xE9rales et publications officielles d\xE9pos\xE9es aupr\xE8s de l'AMF." } : p === "/agenda" ? { title: `Agenda financier \xB7 ${SITE}`, desc: "Dates des r\xE9sultats, assembl\xE9es g\xE9n\xE9rales et dividendes des entreprises cot\xE9es." } : p === "/portefeuille" ? { title: `Portefeuille \xB7 ${SITE}`, desc: "Suivez la performance r\xE9elle de vos placements ou entra\xEEnez-vous avec un portefeuille virtuel." } : p === "/lexique" ? { title: `Lexique \xB7 ${SITE}`, desc: "PER, rendement, marge, dette, volatilit\xE9 : chaque chiffre de la Bourse expliqu\xE9 simplement, avec ses limites." } : p === "/mentions-legales" ? { title: `Mentions l\xE9gales \xB7 ${SITE}`, desc: BASE_DESC } : null;
}
var worker_default = {
  async fetch(request, env) {
    let url = new URL(request.url);
    if (url.pathname === "/api/amf") return amf(request, univers_default.map((c) => c.isin));
    if (url.pathname.startsWith("/api/")) return Response.json({ error: "Introuvable" }, { status: 404 });
    let info = meta(url.pathname);
    if (!info) {
      let r = await env.ASSETS.fetch(request);
      if (r.status !== 404 && !(r.headers.get("content-type") || "").includes("text/html")) return r;
      if (url.pathname.match(/\.[a-z0-9]+$/i)) return new Response("Introuvable", { status: 404 });
    }
    let html = await (await env.ASSETS.fetch(new Request(new URL("/", url), request))).text(), t = info || { title: `Page introuvable \xB7 ${SITE}`, desc: BASE_DESC };
    return html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(t.title)}</title>`).replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(t.desc)}">
<link rel="canonical" href="${url.origin}${url.pathname.replace(/\/+$/, "") || "/"}">`), new Response(html, { status: info ? 200 : 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
  }
};
export {
  worker_default as default,
  meta
};
