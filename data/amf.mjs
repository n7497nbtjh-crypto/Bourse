// Rapports financiers annuels des sociétés françaises déposés à l'AMF (info-financiere.gouv.fr, données ouvertes de la DILA).
// Sert quand filings.xbrl.org n'a pas (encore) indexé le dernier rapport ESEF d'une société : par exemple LVMH 2025.
// Le dépôt est un paquet ESEF (.zip ou .xbri) ou un fichier .xhtml au format iXBRL : on lit les chiffres balisés
// (ix:nonFraction) et on les met au format xBRL-JSON attendu par data/esef.mjs (extract).
import { inflateRawSync } from "node:zlib";

export const AMF_API = "https://www.info-financiere.gouv.fr/api/explore/v2.1/catalog/datasets/flux-amf-new-prod/records";
const TYPES = /rapports? financiers? (et d'audit )?annuels?|document de r[ée]f[ée]rence|document d'enregistrement universel/i;

// Dépôts ESEF annuels d'une société (par ISIN), du plus récent au plus ancien
export async function amfAnnualFilings(getJSON, fetchFn, isin, since = "2024-01-01") {
  const u = new URL(AMF_API);
  u.searchParams.set("limit", "50"); u.searchParams.set("order_by", "uin_dat_amf desc");
  u.searchParams.set("where", `identificationsociete_iso_cd_isi = "${isin}" AND uin_dat_amf >= date'${since}'`);
  const j = await getJSON(fetchFn, u.toString());
  const out = [];
  for (const r of (j && j.results) || []) {
    const url = r.url_de_recuperation || Object.values(r).find(v => typeof v === "string" && /^https?:\/\/.+\.(zip|xbri|xhtml|html)$/i.test(v));
    if (!url || !/\.(zip|xbri|xhtml|html)$/i.test(url)) continue;
    const typ = [r.sous_type_d_information, r.type_d_information, r.informationdeposee_inf_tit_inf].filter(Boolean).join(" ");
    if (!TYPES.test(typ)) continue;
    out.push({ url, date: String(r.uin_dat_amf || "").slice(0, 10), type: r.sous_type_d_information || "", lei: r.identificationsociete_iso_cd_lei || null });
  }
  return out;
}

// Lecture minimale d'une archive zip (répertoire central ; fichiers stockés ou compressés « deflate »)
export function unzip(buf) {
  const b = Buffer.from(buf), files = {};
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 70000); i--) if (b.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) return files;
  const n = b.readUInt16LE(eocd + 10); let p = b.readUInt32LE(eocd + 16);
  for (let k = 0; k < n && p + 46 <= b.length; k++) {
    if (b.readUInt32LE(p) !== 0x02014b50) break;
    const method = b.readUInt16LE(p + 10), csize = b.readUInt32LE(p + 20), nl = b.readUInt16LE(p + 28), el = b.readUInt16LE(p + 30), cl = b.readUInt16LE(p + 32), off = b.readUInt32LE(p + 42);
    const name = b.slice(p + 46, p + 46 + nl).toString("utf8");
    p += 46 + nl + el + cl;
    if (b.readUInt32LE(off) !== 0x04034b50) continue;
    const start = off + 30 + b.readUInt16LE(off + 26) + b.readUInt16LE(off + 28), data = b.slice(start, start + csize);
    files[name] = () => method === 0 ? data : method === 8 ? inflateRawSync(data) : null;
  }
  return files;
}

// Fichiers iXBRL d'un paquet ESEF (le rapport est dans le dossier « reports »)
export function ixbrlFiles(buf, url = "") {
  if (/\.x?html?$/i.test(url)) return [Buffer.from(buf).toString("utf8")];
  const z = unzip(buf), names = Object.keys(z).filter(n => /\.x?html?$/i.test(n) && !/ixbrlviewer|viewer/i.test(n));
  const rep = names.filter(n => /\/reports\//i.test(n)), use = rep.length ? rep : names;
  const out = []; for (const n of use) { const d = z[n](); if (d) out.push(d.toString("utf8")); }
  // paquet emboîté (zip dans le zip)
  if (!out.length) for (const n of Object.keys(z).filter(n => /\.zip$/i.test(n))) { const d = z[n](); if (d) out.push(...ixbrlFiles(d, n)); }
  return out;
}

const attr = (s, k) => { const m = s.match(new RegExp(`\\b${k}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i")); return m ? (m[2] ?? m[3]) : null; };
const strip = s => s.replace(/<[^>]+>/g, "").replace(/&nbsp;|&#160;|&#xa0;/gi, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const nextDay = d => { const t = new Date(d.slice(0, 10) + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 19); };

// Valeur d'un fait numérique iXBRL selon son format (ixt:num-dot-decimal, ixt:num-comma-decimal, ixt:fixed-zero…)
export function ixValue(text, format = "", scale = 0, sign = null) {
  let t = strip(text);
  let v;
  if (/zero|dash/i.test(format) || /^[-–—]$/.test(t)) v = 0;
  else {
    t = t.replace(/[\s  ']/g, "");
    if (/comma/i.test(format)) t = t.replace(/\./g, "").replace(",", ".");
    else t = t.replace(/,/g, "");
    t = t.replace(/[^0-9.]/g, "");
    if (!t) return null;
    v = Number(t);
  }
  if (!isFinite(v)) return null;
  v = v * Math.pow(10, Number(scale) || 0);
  return sign === "-" ? -v : v;
}

// iXBRL -> { facts } au format xBRL-JSON (dimensions : concept, entity, period, unit, et les axes éventuels)
export function ixbrlToJson(htmls) {
  const contexts = {}, units = {}, facts = {};
  let id = 0;
  for (const h of htmls) {
    for (const m of h.matchAll(/<(?:[\w-]+:)?context\b([^>]*)>([\s\S]*?)<\/(?:[\w-]+:)?context>/gi)) {
      const cid = attr(m[1], "id"), body = m[2]; if (!cid) continue;
      const g = re => (body.match(re) || [])[1];
      const start = g(/<(?:[\w-]+:)?startDate>\s*([^<\s]+)/i), end = g(/<(?:[\w-]+:)?endDate>\s*([^<\s]+)/i), inst = g(/<(?:[\w-]+:)?instant>\s*([^<\s]+)/i);
      const period = start && end ? `${start.slice(0, 10)}T00:00:00/${nextDay(end)}` : inst ? nextDay(inst) : null;
      const dims = {};
      for (const d of body.matchAll(/<(?:[\w-]+:)?explicitMember\b([^>]*)>([^<]*)</gi)) dims[attr(d[1], "dimension")] = d[2].trim();
      for (const d of body.matchAll(/<(?:[\w-]+:)?typedMember\b([^>]*)>([\s\S]*?)<\/(?:[\w-]+:)?typedMember>/gi)) dims[attr(d[1], "dimension")] = strip(d[2]);
      const entity = g(/<(?:[\w-]+:)?identifier\b[^>]*>\s*([^<\s]+)/i);
      contexts[cid] = { period, dims, entity };
    }
    for (const m of h.matchAll(/<(?:[\w-]+:)?unit\b([^>]*)>([\s\S]*?)<\/(?:[\w-]+:)?unit>/gi)) {
      const uid = attr(m[1], "id"); if (!uid) continue;
      const ms = [...m[2].matchAll(/<(?:[\w-]+:)?measure>\s*([^<\s]+)/gi)].map(x => x[1]);
      units[uid] = /divide/i.test(m[2]) && ms.length >= 2 ? `${ms[0]}/${ms[1]}` : ms[0];
    }
  }
  for (const h of htmls) {
    for (const m of h.matchAll(/<ix:nonFraction\b([^>]*?)(\/>|>([\s\S]*?)<\/ix:nonFraction>)/gi)) {
      const a = m[1], ctx = contexts[attr(a, "contextRef")]; if (!ctx || !ctx.period) continue;
      if (/\bxsi:nil\s*=\s*"true"/i.test(a)) continue;
      const v = ixValue(m[3] || "", attr(a, "format") || "", attr(a, "scale"), attr(a, "sign"));
      if (v == null) continue;
      const dims = { concept: attr(a, "name"), entity: ctx.entity ? "scheme:" + ctx.entity : undefined, period: ctx.period, unit: units[attr(a, "unitRef")] || undefined, ...ctx.dims };
      for (const k of Object.keys(dims)) if (dims[k] === undefined) delete dims[k];
      facts["f" + (++id)] = { value: String(v), decimals: attr(a, "decimals"), dimensions: dims };
    }
  }
  return { documentInfo: { documentType: "https://xbrl.org/2021/xbrl-json", source: "iXBRL AMF" }, facts };
}

// Télécharge un dépôt AMF et le convertit
export async function amfDoc(fetchFn, ua, f) {
  const r = await fetchFn(f.url, { headers: { "user-agent": ua } });
  if (!r || !r.ok || !r.arrayBuffer) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  const htmls = ixbrlFiles(buf, f.url);
  if (!htmls.length) return null;
  const doc = ixbrlToJson(htmls);
  return Object.keys(doc.facts).length ? doc : null;
}
