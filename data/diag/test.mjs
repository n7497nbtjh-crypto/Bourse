import { writeFileSync } from "node:fs";
const UA = { "user-agent": `bilan (site pedagogique) ${process.env.CONTACT || ""}` };
const out = {};
async function t(name, url, opts = {}, n = 600) {
  try { const r = await fetch(url, { headers: { ...UA, ...(opts.h || {}) } }); const b = Buffer.from(await r.arrayBuffer()); out[name] = { status: r.status, type: r.headers.get("content-type"), size: b.length, head: opts.bin ? b.subarray(0, 8).toString("hex") : b.toString("utf8").slice(0, n) }; }
  catch (e) { out[name] = String(e); }
}
await t("stooq_aapl", "https://stooq.com/q/d/l/?s=aapl.us&i=d");
await t("stooq_mc", "https://stooq.com/q/d/l/?s=mc.fr&i=d");
await t("stooq_air_paris", "https://stooq.com/q/d/l/?s=air.fr&i=d");
await t("stooq_sap_de", "https://stooq.com/q/d/l/?s=sap.de&i=d");
await t("stooq_cac", "https://stooq.com/q/d/l/?s=^cac&i=d");
await t("stooq_spx", "https://stooq.com/q/d/l/?s=^spx&i=d");
await t("stooq_bulk_us", "https://stooq.com/db/d/?b=d_us_txt", { bin: true });
await t("stooq_q", "https://stooq.com/q/l/?s=aapl.us+mc.fr+sap.de&f=sd2t2ohlcv&h&e=csv");
await t("sec_sub_nvda", "https://data.sec.gov/submissions/CIK0001045810.json", {}, 300);
await t("sec_idx", "https://www.sec.gov/Archives/edgar/data/1089113/000165495426009183/index.json", {}, 1500);
await t("amf", "https://www.info-financiere.gouv.fr/api/explore/v2.1/catalog/datasets/flux-amf-new-prod/records?limit=2&order_by=" + encodeURIComponent("dateinformation desc"), {}, 4000);
await t("ecb_fx", "https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?lastNObservations=2&format=csvdata", {}, 400);
writeFileSync(new URL("./out.json", import.meta.url), JSON.stringify(out, null, 1));
