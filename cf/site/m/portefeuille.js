/* Les compositions d'ETF classent par code (it, fin, conso_disc…) : on les ramène aux dix secteurs du site, pour une seule liste lisible */
const PF_SECT_ETF = { it: "tech", fin: "finance", sante: "sante", conso_disc: "conso", conso_base: "conso", indus: "industrie", comm: "telecom", energie: "energie", materiaux: "materiaux", services_pub: "services", immo: "immo", liquidites: "Liquidités et dérivés", autre: "Autres" };
function pfSecteurEtf(code) { const k = PF_SECT_ETF[code]; if (!k) return (typeof ETF_SECT !== "undefined" && ETF_SECT[code]) || code; return (R && R.sectors && R.sectors[k]) || k; }
/* Module « portefeuille » de bilan. : chargé après le script principal de index.html.
   Les fonctions déclarées ici remplacent celles du même nom (déclarations function, jamais const/let pour un nom existant).

   Contenu :
   1. PF3 : calculs purs, sans navigateur (prix de revient, migration des anciens formats, lecture des fichiers CSV
      des courtiers). Testés par tests/t_portefeuille.mjs.
   2. Valorisation et analyses (cours du site, transparence des ETF, frais, dividendes, diversification, alertes).
   3. La page /portefeuille : saisie, tableau de bord, analyse IA, import et export.

   Format enregistré (clé « bilan.portefeuille », synchronisé avec le compte, 60 Ko au plus côté serveur) :
   { v: 3, maj: horodatage, cfg: { courtier, env, mensuel, ordres, horizon },
     l: [ { k: "c:lvmh" | "e:<id d'ETF>" | "x:<ISIN>", q, pru, cur, env, br, o: [[date, type, quantité, prix, frais, taux], …], m, nm, isin, px } ] }
   Une ligne = une position (un titre, sur un compte, chez un courtier). q et pru sont recalculés à partir des opérations « o »
   quand elles existent (méthode du prix moyen pondéré, frais d'achat inclus) ; sinon ils sont saisis directement.
   Types d'opération : a = achat, v = vente, d = dividende reçu (prix = montant net), r = position reprise (quantité et PRU). */

const PF3 = (() => {
  const EPS = 1e-9;
  const r4 = x => Math.round(x * 1e4) / 1e4, rq = x => Math.round(x * 1e6) / 1e6; // rq : quantités (fractions de parts gardées à 6 décimales)
  const fin = x => typeof x === "number" && isFinite(x);
  const numOr = (x, d = 0) => { const n = typeof x === "string" ? parseFloat(x.replace(",", ".")) : x; return fin(n) ? n : d; };
  const isoOk = d => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);

  /* ---------- Prix de revient : prix moyen pondéré, frais d'achat inclus ---------- */
  // Les ventes ne changent pas le PRU des titres restants ; elles dégagent une plus-value réalisée.
  // Quand tout est vendu, le compteur repart de zéro pour les achats suivants (comme chez les courtiers français).
  function position(ops) {
    const list = (ops || []).map((o, i) => ({ o, i })).sort((a, b) => (a.o[0] || "").localeCompare(b.o[0] || "") || a.i - b.i);
    let q = 0, cost = 0, costE = 0, eurOk = true, real = 0, realE = 0, fees = 0, bought = 0, divs = 0, nBuy = 0, nSell = 0, warn = null, first = null, last = null;
    const buys = [];
    for (const { o } of list) {
      const [d, t] = o, oq = Math.abs(numOr(o[2])), p = numOr(o[3]), f = Math.abs(numOr(o[4])), x = numOr(o[5], NaN);
      if (d && (!first || d < first)) first = d;
      if (d && (!last || d > last)) last = d;
      if (t === "a" || t === "r") {
        if (!(oq > 0)) continue;
        const c = oq * p + (t === "a" ? f : 0);
        cost += c; q += oq;
        if (fin(x) && x > 0) costE += c * x; else eurOk = false;
        if (t === "a") { fees += f; bought += oq * p; nBuy++; buys.push({ d, q: oq, p, f, amt: oq * p }); }
      } else if (t === "v") {
        if (!(oq > 0)) continue;
        nSell++; fees += f;
        if (oq > q + EPS) warn = "vente";
        const qq = Math.min(oq, q), pru = q > EPS ? cost / q : 0, pruE = q > EPS ? costE / q : 0;
        const prod = qq * p - f * (qq / oq);
        real += prod - pru * qq;
        if (fin(x) && x > 0) realE += prod * x - pruE * qq; else eurOk = false;
        cost -= pru * qq; costE -= pruE * qq; q -= qq;
        if (q < EPS) { q = 0; cost = 0; costE = 0; }
      } else if (t === "d") divs += p * (oq || 1) - f;
    }
    return { q: rq(q), cost, pru: q > EPS ? cost / q : 0, costE: eurOk ? costE : null, realE: eurOk ? realE : null, real, fees, bought, divs, nBuy, nSell, warn, first, last, buys };
  }
  // La position d'une ligne : à partir de ses opérations, ou de la quantité et du PRU saisis.
  function linePos(l) {
    if (Array.isArray(l.o) && l.o.length) return position(l.o);
    const q = Math.max(0, numOr(l.q)), pru = Math.max(0, numOr(l.pru));
    return { q, cost: q * pru, pru, costE: null, realE: null, real: 0, fees: 0, bought: 0, divs: 0, nBuy: 0, nSell: 0, warn: null, first: null, last: null, buys: [] };
  }
  // Recopie q et pru calculés dans la ligne (lus par les anciennes versions et par le bilan de la semaine).
  function syncLine(l) {
    if (Array.isArray(l.o) && l.o.length) { const p = position(l.o); l.q = p.q; l.pru = r4(p.pru); }
    else delete l.o;
    return l;
  }

  /* ---------- Migration des anciens formats, sans perte ---------- */
  const KEYOK = /^(c|e):[a-z0-9-]{1,60}$|^x:[A-Z0-9]{12}$|^x:[a-z0-9-]{1,60}$/;
  const ENVS = ["pea", "cto", "av"];
  function cleanOp(o) {
    if (!Array.isArray(o)) return null;
    const t = ["a", "v", "d", "r"].includes(o[1]) ? o[1] : null; if (!t) return null;
    const d = isoOk(o[0]) ? o[0] : "", q = Math.abs(numOr(o[2])), p = Math.abs(numOr(o[3])), f = Math.abs(numOr(o[4])), x = numOr(o[5], NaN);
    if (t !== "d" && !(q > 0)) return null;
    const out = [d, t, Math.round(q * 1e8) / 1e8 || (t === "d" ? 1 : 0), Math.round(p * 1e6) / 1e6, Math.round(f * 100) / 100];
    if (fin(x) && x > 0 && x !== 1) out.push(Math.round(x * 1e6) / 1e6);
    if (o[6] === "p") { if (out.length < 6) out.push(null); out.push("p"); } // « p » : achat programmé, prix relevé le jour de la visite
    return out;
  }
  function cleanLine(l, cfg) {
    if (!l || typeof l !== "object" || typeof l.k !== "string" || !KEYOK.test(l.k)) return null;
    const out = { k: l.k };
    if (Array.isArray(l.o)) { const o = l.o.map(cleanOp).filter(Boolean); if (o.length) out.o = o; }
    if (!out.o) {
      const q = Math.max(0, numOr(l.q)), pru = Math.max(0, numOr(l.pru));
      if (q > 0) { out.q = rq(q); out.pru = r4(pru); }
    }
    const m = Math.max(0, numOr(l.m)); if (m > 0 && !(out.q > 0) && !out.o) out.m = Math.round(m * 100) / 100;
    if (!out.o && !(out.q > 0) && !out.m) return null; // ligne vide
    if (typeof l.cur === "string" && /^[A-Z]{3}$/.test(l.cur)) out.cur = l.cur;
    const env = ENVS.includes(l.env) ? l.env : cfg && ENVS.includes(cfg.env) ? cfg.env : null; if (env) out.env = env;
    const br = typeof l.br === "string" && /^[a-z0-9-]{1,40}$/.test(l.br) ? l.br : cfg && typeof cfg.courtier === "string" && /^[a-z0-9-]{1,40}$/.test(cfg.courtier) ? cfg.courtier : null; if (br) out.br = br;
    if (typeof l.nm === "string" && l.nm.trim()) out.nm = l.nm.trim().slice(0, 80);
    if (typeof l.isin === "string" && /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(l.isin)) out.isin = l.isin;
    const px = numOr(l.px, NaN); if (fin(px) && px > 0) out.px = px;
    const rv = numOr(l.rv, NaN); if (fin(rv) && rv) out.rv = Math.round(rv * 100) / 100;
    return syncLine(out);
  }
  // Ancien simulateur (clé « repere.pf.v2 ») : { ops: [{ id, type: achat|vente|dividende, date, q, px, fee }], prix, broker }
  function fromOld(old, known) {
    const by = {}, T = { achat: "a", vente: "v", dividende: "d" };
    for (const o of (old && Array.isArray(old.ops) ? old.ops : [])) {
      if (!o || typeof o.id !== "string" || !T[o.type]) continue;
      const id = o.id.toLowerCase();
      const k = known && known(id) ? "c:" + id : "x:" + id.replace(/^autre:/, "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
      if (!/^x:.+|^c:.+/.test(k) || k === "x:") continue;
      const l = by[k] = by[k] || { k, cur: "EUR", o: [], ...(k.startsWith("x:") ? { nm: o.id.replace(/^autre:/, "") } : {}), ...(old.broker ? { br: old.broker } : {}) };
      l.o.push(o.type === "dividende" ? [o.date, "d", 1, numOr(o.px), 0] : [o.date, T[o.type], numOr(o.q), numOr(o.px), numOr(o.fee)]);
      if (old.prix && numOr(old.prix[o.id], 0) > 0) l.px = numOr(old.prix[o.id]);
    }
    return Object.values(by);
  }
  // Toute donnée lue (navigateur, compte, fichier) passe par ici : on obtient toujours un portefeuille valide au format 3.
  function migrate(x, opts = {}) {
    const P = { v: 3, maj: 0, l: [], cfg: {} };
    if (!x || typeof x !== "object") return P;
    const cfg = x.cfg && typeof x.cfg === "object" ? x.cfg : {};
    for (const [k, re] of [["courtier", /^[a-z0-9-]{1,40}$/], ["env", /^(pea|cto|av|mix)$/], ["horizon", /^[0-4]$/]]) if (typeof cfg[k] === "string" && re.test(cfg[k])) P.cfg[k] = cfg[k];
    for (const k of ["mensuel", "ordres"]) { const n = numOr(cfg[k], NaN); if (fin(n) && n > 0) P.cfg[k] = String(n); }
    if (typeof cfg.perso === "object" && cfg.perso) P.cfg.perso = { fixe: Math.max(0, numOr(cfg.perso.fixe)), pct: Math.max(0, numOr(cfg.perso.pct)) };
    if (Array.isArray(cfg.prog)) { // 31/10 : achats programmés { k, jour (1 à 28), q (parts), depuis (AAAA-MM-JJ), dernier (AAAA-MM) }
      const pr = cfg.prog.filter(x => x && typeof x.k === "string" && /^[cex]:[A-Za-z0-9._-]{1,60}$/.test(x.k) && numOr(x.q) > 0 && isoOk(x.depuis)).slice(0, 12)
        .map(x => ({ k: x.k, jour: Math.min(28, Math.max(1, Math.round(numOr(x.jour, 1)))), q: rq(numOr(x.q)), depuis: x.depuis, dernier: /^\d{4}-\d{2}$/.test(x.dernier || "") ? x.dernier : "" }));
      if (pr.length) P.cfg.prog = pr; }
    if (fin(x.maj)) P.maj = x.maj;
    if (x.dem === true) P.dem = true;
    const legacyEnv = x.v === 3 ? null : cfg; // les anciennes versions avaient un seul compte et un seul courtier pour tout
    if (Array.isArray(x.l)) P.l = x.l.map(l => cleanLine(l, legacyEnv)).filter(Boolean);
    else if (Array.isArray(x.ops)) P.l = fromOld(x, opts.known).map(l => cleanLine(l, null)).filter(Boolean);
    return P;
  }
  const size = P => new TextEncoder().encode(JSON.stringify(P)).length;
  // Au-delà de la taille synchronisable, les opérations les plus anciennes sont résumées en une « position reprise »
  // (quantité et PRU identiques, plus-values réalisées gardées dans la ligne) : le prix de revient ne change pas.
  function compact(P, max = 56000) {
    let guard = 0;
    while (size(P) > max && guard++ < 50) {
      const l = P.l.filter(x => x.o && x.o.length > 6).sort((a, b) => b.o.length - a.o.length)[0];
      if (!l) break;
      const sorted = l.o.slice().sort((a, b) => (a[0] || "").localeCompare(b[0] || ""));
      const cut = Math.ceil(sorted.length / 2), old = sorted.slice(0, cut), p = position(old);
      const rest = sorted.slice(cut), head = p.q > 0 ? [[p.last || "", "r", p.q, r4(p.pru), 0]] : [];
      l.rv = Math.round(((l.rv || 0) + p.real) * 100) / 100; // plus-value déjà réalisée, en devise de la ligne
      l.o = [...head, ...rest]; syncLine(l);
    }
    return P;
  }

  /* ---------- Lecture des fichiers CSV ---------- */
  const nrm = s => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[\s_]+/g, " ").trim();
  function csvRows(text, delim) {
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
      if (c === '"' && cell === "") q = true;
      else if (c === delim) { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(c => String(c).trim() !== ""));
  }
  function parseCsv(text) {
    text = String(text || "").replace(/^﻿/, "");
    const lines = text.split(/\r?\n/).filter(l => l.trim()).slice(0, 12);
    const count = (l, d) => { let n = 0, q = false; for (const c of l) { if (c === '"') q = !q; else if (!q && c === d) n++; } return n; };
    const score = d => lines.reduce((a, l) => a + Math.min(count(l, d), 40), 0);
    const delim = [";", ",", "\t", "|"].map(d => [d, score(d)]).sort((a, b) => b[1] - a[1])[0][0];
    const rows = csvRows(text, delim).map(r => r.map(c => String(c).trim()));
    // Séparateur décimal du fichier : la forme la plus fréquente l'emporte (tout le fichier est examiné)
    let comma = 0, dot = 0;
    for (const r of rows) for (const c of r) { if (/^[-+(]?\d+,\d+\)?$/.test(c.replace(/[\s  ]/g, ""))) comma++; else if (/^[-+(]?\d+\.\d+\)?$/.test(c)) dot++; }
    return { delim, dec: comma > dot ? "," : ".", rows };
  }
  function num(s, dec = ",") {
    if (typeof s === "number") return isFinite(s) ? s : null;
    let t = String(s == null ? "" : s).trim().replace(/[\s  ']/g, "").replace(/€|\$|£|EUR|USD|GBP|CHF/gi, "");
    if (!t || t === "-" || t === "–") return null;
    let neg = false;
    if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
    if (t.endsWith("-")) { neg = true; t = t.slice(0, -1); }
    if (t.endsWith("%")) t = t.slice(0, -1);
    const lc = t.lastIndexOf(","), ld = t.lastIndexOf(".");
    if (lc >= 0 && ld >= 0) t = lc > ld ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
    else if (lc >= 0) t = (t.match(/,/g).length > 1 || (dec === "." && /^-?\d{1,3}(,\d{3})+$/.test(t))) ? t.replace(/,/g, "") : t.replace(",", ".");
    else if (ld >= 0 && (t.match(/\./g).length > 1 || (dec === "," && /^-?\d{1,3}(\.\d{3})+$/.test(t)))) t = t.replace(/\./g, "");
    const n = Number(t);
    return isFinite(n) ? (neg ? -n : n) : null;
  }
  function date(s) {
    const t = String(s || "").trim(); let m;
    if ((m = t.match(/^(\d{4})-(\d{2})-(\d{2})/))) return ok3(m[1], m[2], m[3]);
    if ((m = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/))) return ok3(m[3], m[2].padStart(2, "0"), m[1].padStart(2, "0"));
    if ((m = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2})$/))) return ok3("20" + m[3], m[2].padStart(2, "0"), m[1].padStart(2, "0"));
    if ((m = t.match(/^(\d{4})(\d{2})(\d{2})$/))) return ok3(m[1], m[2], m[3]);
    return "";
  }
  function ok3(y, m, d) { const iso = `${y}-${m}-${d}`, x = new Date(iso + "T12:00:00Z"); return isFinite(x) && x.toISOString().slice(0, 10) === iso ? iso : ""; }
  const ISIN = /^[A-Z]{2}[A-Z0-9]{9}\d$/;
  const isinIn = s => { const m = String(s || "").toUpperCase().match(/\b([A-Z]{2}[A-Z0-9]{9}\d)\b/); return m && ISIN.test(m[1]) ? m[1] : ""; };

  // Champs reconnus dans les en-têtes, en français, anglais, allemand et néerlandais
  const FIELDS = {
    date: [/^(date|datum|datetime|trade date|date d.?operation|date operation|date d.?execution|date execution|date de l.?operation|date ordre|date d.?ordre|jour)$/, /^date/, /datum/],
    type: [/^(type|typ|sens|operation|nature|nature de l.?operation|type d.?operation|type operation|opération|transaction type|action|mouvement)$/, /^type|operation|sens/],
    isin: [/^(isin|code isin|isin code|symbol\/isin|symbole\/isin|isin\/symbole|code)$/, /isin/],
    name: [/^(name|nom|produit|product|produkt|libelle|libelle valeur|valeur|titre|instrument|security|security name|designation|nom du titre|support|actif)$/, /libell|produit|product|designation|nom/],
    ticker: [/^(ticker|symbol|symbole|mnemo|mnemonique|code mnemo|tick)$/],
    qty: [/^(quantity|quantite|qte|qty|shares|stuck|stueck|anzahl|aantal|nombre|nb|nb titres|nombre de titres|parts|nombre de parts|nb de titres|quantite executee|qte executee)$/, /quantit|qte|^nb|nombre|shares|anzahl|aantal|stuck/],
    price: [/^(price|prix|cours|kurs|koers|pu|p\.u\.|prix unitaire|prix d.?execution|cours d.?execution|cours execute|unit price|prix execute|prix net|cours net)$/, /^prix|^cours|price|kurs|koers/],
    pru: [/^(buyingprice|pru|prix de revient|prix de revient unitaire|prix moyen|prix moyen d.?achat|prix d.?achat moyen|pmp|average price|average cost|avg price|cout moyen|prix d.?achat|average buy in|averagebuyin)$/, /buyingprice|pru|revient|prix moyen|average|pmp/],
    fees: [/^(fee|fees|frais|courtage|commission|frais de courtage|gebuhren|gebuhr|transactiekosten|kosten|frais de transaction|commissions|frais ttc|courtage ttc)$/, /fee|frais|courtage|commission|gebuhr|kosten/],
    amount: [/^(amount|montant|montant net|montant brut|total|value|wert|waarde|valeur|net amount|montant total|montant ttc|value eur|valeur eur|total eur|montant eur|valorisation)$/, /amount|montant|total|wert|waarde|valorisation/],
    currency: [/^(currency|devise|wahrung|valuta|monnaie|devise de cotation)$/],
    fx: [/^(fx|fx rate|fx_rate|exchange rate|taux de change|wechselkurs|wisselkoers|change)$/, /exchange rate|taux de change|wechselkurs|wisselkoers|fx/],
    status: [/^(statut|status|etat|state|situation)$/],
  };
  function guessMap(header) {
    const H = header.map(nrm), used = new Set(), map = {};
    for (const [f, res] of Object.entries(FIELDS)) {
      for (const re of res) {
        const i = H.findIndex((h, j) => h && !used.has(j) && re.test(h) && !(f === "fees" && /autofx/.test(h)) && !(f === "amount" && /(fee|frais|kosten|courtage|variation|latente|\+\/-)/.test(h)) && !(f === "name" && /isin/.test(h)) && !(f === "price" && /revient|moyen|average|buying/.test(h)) && !(f === "date" && /valeur|valuta|value date/.test(h)));
        if (i >= 0) { map[f] = i; used.add(i); break; }
      }
    }
    return map;
  }
  // Reconnaissance du format d'après l'en-tête
  function detect(header) {
    const H = header.map(nrm), has = (...a) => a.every(x => H.includes(x)), any = re => H.some(h => re.test(h));
    if (has("datetime", "category", "type", "symbol", "shares", "amount") && any(/^transaction id$/)) return "traderepublic";
    if (has("name", "isin", "quantity", "buyingprice")) return "boursobank";
    if (has("date", "operation", "nom", "isin", "quantite", "prix unitaire") && any(/^compte$/)) return "bilan";
    if ((has("date", "type", "value", "isin", "shares") || has("datum", "typ", "wert", "isin", "stuck") || has("date", "type", "valeur", "isin", "parts")) && H.length <= 12) return "pytr";
    if (any(/^(product|produit|produkt)$/) && any(/isin/) && any(/^(quantity|quantite|anzahl|aantal|amount)$/) && any(/^(time|heure|uhrzeit|tijd)$/)) return "degiro";
    if (any(/^(product|produit|produkt)$/) && any(/isin/) && any(/^(quantity|quantite|anzahl|aantal|amount)$/) && any(/^(closing|cloture|schlusskurs|slotkoers)$/)) return "degiro-pf";
    if (any(/libell/) && any(/isin/) && any(/^(qte|quantite)$/) && any(/^(pru|prix de revient|prix de revient unitaire|prix moyen d.?achat)$/)) return "fortuneo-pf";
    if (any(/libell/) && any(/^(operation|sens|nature)$/) && any(/^(qte|quantite)$/) && any(/courtage|commission/)) return "fortuneo";
    return "generic";
  }
  const FORMATS = { traderepublic: "Trade Republic (export des transactions)", boursobank: "BoursoBank (export des positions)", degiro: "Degiro (export des transactions)", "degiro-pf": "Degiro (export du portefeuille)", fortuneo: "Fortuneo (historique des opérations)", "fortuneo-pf": "Fortuneo (export du portefeuille)", pytr: "Trade Republic (fichier pytr)", bilan: "bilan. (export de ce site)", generic: "Fichier CSV" };
  const BROKER_OF = { traderepublic: "trade-republic", pytr: "trade-republic", boursobank: "boursobank", degiro: "degiro", "degiro-pf": "degiro", fortuneo: "fortuneo", "fortuneo-pf": "fortuneo" };
  /* Type d'opération lu dans une cellule :
     a achat · v vente · d dividende · s division ou regroupement (quantité ajoutée ou retirée) · ti titres reçus (transfert)
     · to titres sortis (transfert, remboursement) · x annulation · cash mouvement d'espèces · r position (export de ce site) */
  function opType(s, q) {
    const t = nrm(s);
    if (!t) return q != null ? (q < 0 ? "v" : q > 0 ? "a" : null) : null;
    if (/annul|cancel|storno|extourne/.test(t)) return "x";
    if (/^position/.test(t)) return "r";
    if (/dividend|dividende|coupon|distribution|ausschuttung/.test(t)) return "d";
    if (/split|division|regroupement|reverse|attribution (gratuite|d.?actions)|actions? gratuites?|bonusaktien|titres? ajoutes?/.test(t)) return "s";
    if (/transf|virement de titres|umbuchung|depotubertrag|aktien (erhalten|ubertragen)|entree de titres|sortie de titres|reception de titres|livraison de titres/.test(t)) return /sort|\bout|ausgang|ubertragen|emis|envoi/.test(t) ? "to" : "ti";
    if (/^(depot|deposit|einlage|retrait|removal|entnahme|interets?|interest|zinsen|frais|fees|gebuhren|impots|taxes?|steuern|remboursement (de frais|impots)|tax refund|fees refund|virement|versement|prelevement|carte|card|solde)\b/.test(t)) return "cash";
    if (/\b(sell|sold|vente|vendre|verkauf|verkoop|cession|rachat|remboursement)\b|^v$|vente/.test(t)) return "v";
    if (/\b(buy|bought|achat|acheter|kauf|koop|souscription|purchase|sparplan)\b|^a$|achat|savings plan|plan d.?investissement|investissement programme/.test(t)) return "a";
    return null;
  }
  // Ligne de synthèse (total, liquidités…) : jamais une position
  const SUMMARY = /^(total|totaux|sous total|sous-total|solde|soldes|liquidites?|especes|cash|valorisation( totale)?|montant total|somme|resultat|plus.?value totale|total general|grand total|gesamt|summe|totaal)\b/;
  const CLOSED = /clotur|vendu|solde|sold|closed|ferme|termin|annul/;
  // Header : première ligne contenant au moins deux champs reconnus (certains exports ont des lignes de titre avant)
  function headerRow(rows) {
    for (let i = 0; i < Math.min(rows.length, 15); i++) { const m = guessMap(rows[i]); if (Object.keys(m).length >= 2 && rows[i].filter(Boolean).length >= 3) return i; }
    return 0;
  }
  /* Lecture complète : TOUT le fichier est parcouru, chaque ligne aboutit à une opération, une position ou une ligne ignorée
     (avec sa raison). Renvoie des opérations (achats, ventes, dividendes, divisions, transferts) ou des positions (état du portefeuille). */
  function read(text, opts = {}) {
    const { rows, dec, delim } = parseCsv(text);
    if (!rows.length) return { format: "generic", rows: 0, ops: [], positions: [], ignored: [], sold: [], header: [], map: {}, dec, delim, error: "Le fichier est vide.", dups: 0 };
    const hi = headerRow(rows), header = rows[hi], body = rows.slice(hi + 1);
    const format = opts.format || detect(header);
    const map = opts.map ? { ...opts.map } : guessMap(header);
    if (format === "pytr" && !opts.map) { // pytr : Note = nom du titre, Value / Valeur / Wert = montant (quelle que soit la langue de l'export)
      const Hn = header.map(nrm), i = Hn.findIndex(h => h === "note" || h === "notiz"), v = Hn.findIndex(h => /^(value|valeur|wert|waarde|valor|valore)$/.test(h));
      if (i >= 0) map.name = i; if (v >= 0) map.amount = v;
    }
    const out = { format, label: FORMATS[format] || FORMATS.generic, broker: BROKER_OF[format] || null, header, map, dec, delim, rows: body.length, ops: [], positions: [], ignored: [], sold: [], crypto: {}, dups: 0, sample: body.slice(0, 5) };
    const H = header.map(nrm), col = re => H.findIndex(h => re.test(h));
    const cell = (r, i) => i != null && i >= 0 && i < r.length ? r[i] : "";
    const N = (r, i) => num(cell(r, i), dec);
    const ign = (line, why, kind = "") => { out.ignored.push({ line, why, kind }); };
    const op = o => { out.ops.push(o); };
    const seen = new Map(), headKey = header.join("\u0001");
    // Annulation : retire l'opération d'origine (même titre, même quantité, déjà lue), les deux restent visibles dans les lignes ignorées
    // Seule une opération du même jour, même titre et même quantité est retirée ; sinon rien n'est supprimé (à vérifier)
    const pending = [], cancel = (line, isin, name, q, label, d) => { pending.push([line, isin, name, q, label, d]); };
    const cancelNow = (line, isin, name, q, label, d) => {
      const id = isin || nrm(name);
      let k = -1; for (let i = out.ops.length - 1; i >= 0; i--) { const o = out.ops[i]; if ((o.isin || nrm(o.name)) === id && (o.t === "a" || o.t === "v") && q && Math.abs(o.q - Math.abs(q)) < 1e-6 && (o.date || "") === (d || "")) { k = i; break; } }
      if (k >= 0) { const o = out.ops.splice(k, 1)[0]; ign(o.line, `${label || name || isin} : ordre annulé par le courtier (annulation ligne ${line})`, "annule"); ign(line, `${label || name || isin} : annulation de l'ordre de la ligne ${o.line}`, "annule"); }
      else ign(line, `${label || name || isin} : annulation sans ordre correspondant le même jour dans le fichier (rien n'a été retiré, vérifiez la quantité)`, "annule");
    };
    body.forEach((r, j) => {
      const line = hi + j + 2;
      // Lignes en double : l'en-tête répété (fichiers mis bout à bout) et les lignes identiques à une ligne déjà lue
      const key = r.join("\u0001");
      if (key === headKey) return ign(line, "en-tête répété (plusieurs exports mis bout à bout)", "doublon");
      const tid = format === "traderepublic" ? cell(r, H.indexOf("transaction id")) : "";
      const dk = tid ? "id:" + tid : key;
      if (seen.has(dk) && !(opts.keepDup && !tid)) { out.dups++; return ign(line, `doublon exact de la ligne ${seen.get(dk)}${tid ? " (même identifiant d'opération)" : ""}`, "doublon"); }
      if (!seen.has(dk)) seen.set(dk, line);
      if (format === "traderepublic") {
        const g = n => cell(r, H.indexOf(nrm(n)));
        const cat = g("category"), type = g("type"), ac = g("asset_class"), isin = isinIn(g("symbol")), name = g("name") || g("symbol");
        const sh = num(g("shares"), dec), amt = num(g("amount"), dec), acct = g("account_type"), env = /pea/i.test(acct) ? "PEA" : "";
        const base = { isin, name, date: date(g("date") || g("datetime")), cur: g("currency") || "EUR", env, acct: acct && acct !== "DEFAULT" ? acct : "", line };
        if (/CANCEL/.test(type)) return cancel(line, isin, name, sh, name, base.date);
        const trade = cat === "TRADING" || /^PRIVATE_MARKET_(BUY|SELL)$/.test(type);
        if (trade) {
          if (ac === "CRYPTO" || !isin) { if (sh) out.crypto[name || "?"] = (out.crypto[name || "?"] || 0) + (/SELL/.test(type) ? -Math.abs(sh) : Math.abs(sh)); return ign(line, `${name || "?"} : cryptomonnaie ou produit sans ISIN, non suivi par le site`, "crypto"); }
          const q = Math.abs(sh || 0);
          if (!(q > 0)) return ign(line, `${name} : quantité absente`);
          const t = /BUY/.test(type) ? "a" : /SELL/.test(type) ? "v" : sh < 0 ? "v" : "a";
          const p = num(g("price"), dec) || (amt ? Math.abs(amt) / q : 0);
          if (!(p > 0)) return ign(line, `${name} : prix absent`);
          return op({ ...base, t, q, p, f: Math.abs(num(g("fee"), dec) || 0), plan: /savings plan|sparplan|saveback|round ?up/i.test(g("description")), fxNote: num(g("fx_rate"), dec) || null });
        }
        if (cat === "CASH" && /^(DIVIDEND|DISTRIBUTION|DIVIDEND_EQUIVALENT_PAYMENT)$/.test(type)) {
          if (!isin) return ign(line, "dividende sans ISIN");
          if (amt != null && amt < 0) return ign(line, `${name} : correction d'un dividende (montant négatif), à vérifier sur votre relevé`, "ambigu");
          const tax = num(g("tax"), dec) || 0;
          return op({ ...base, t: "d", q: 1, p: (amt || 0) + tax, f: 0 });
        }
        if (cat === "CORPORATE_ACTION") {
          if (!isin || !sh) return ign(line, `${name || ""} : opération sur titres (${type.toLowerCase().replace(/_/g, " ")}) sans quantité`);
          if (type === "SPLIT") return op({ ...base, t: "s", q: sh, p: 0, f: 0, why: "division" });
          if (/REDEMPTION|MATURITY|WARRANT_EXERCISE|LIQUIDATION/.test(type) && sh < 0) return op({ ...base, t: "to", q: Math.abs(sh), p: 0, f: 0, why: "remboursement ou échéance" });
          return op({ ...base, t: sh > 0 ? "ti" : "to", q: Math.abs(sh), p: null, f: 0, why: type.toLowerCase().replace(/_/g, " "), amb: true });
        }
        if (cat !== "CASH" && isin && sh) return op({ ...base, t: sh > 0 ? "ti" : "to", q: Math.abs(sh), p: null, f: 0, why: (cat + " " + type).toLowerCase().replace(/_/g, " "), amb: true });
        if (isin) return ign(line, `${name} : impôt ou montant en espèces lié au titre (${type.toLowerCase().replace(/_/g, " ")}), sans effet sur la quantité`, "cash");
        return ign(line, "mouvement d'espèces (virement, carte, intérêts, impôts)", "cash");
      }
      if (format === "boursobank" || format === "degiro-pf" || format === "fortuneo-pf" || (format === "generic" && map.pru != null && map.type == null)) {
        const isin = isinIn(cell(r, map.isin)) || isinIn(r.join(" "));
        const name = cell(r, map.name) || cell(r, map.ticker);
        if (!isin && SUMMARY.test(nrm(name || r.find(c => c) || ""))) return ign(line, `ligne de synthèse (« ${String(name || r.find(c => c)).slice(0, 40)} »)`, "synthese");
        if (!isin && !name) return ign(line, "ligne sans nom ni ISIN");
        const qs = N(r, map.qty), q = Math.abs(qs || 0), st = nrm(cell(r, map.status));
        if (!(q > 0) || (st && CLOSED.test(st))) { out.sold.push({ isin, name, line }); return ign(line, `${name || isin} : position soldée (${st && CLOSED.test(st) ? "statut « " + cell(r, map.status) + " »" : "quantité nulle"})`, "solde"); }
        let pru = N(r, map.pru);
        const val = N(r, map.amount), px = N(r, col(/^(cours|lastprice|last price|cloture|closing|dernier cours|schlusskurs|slotkoers|dernier)$/));
        if (format === "boursobank") { // le coût d'achat se déduit le plus sûrement de la valeur et de la plus-value latente
          const amount = N(r, col(/^amount$/)), varA = N(r, col(/^amountvariation$/));
          if (amount != null && varA != null && amount - varA > 0) pru = (amount - varA) / q;
        }
        out.positions.push({ isin, name, q, pru: pru != null && pru > 0 ? pru : null, cur: (cell(r, map.currency) || "EUR").toUpperCase(), ticker: cell(r, map.ticker), line, val: val > 0 ? val : null, px: px > 0 ? px : null, neg: qs < 0 });
        return;
      }
      if (format === "degiro") {
        const isin = isinIn(cell(r, map.isin));
        const qs = N(r, map.qty);
        if (!isin) return ign(line, "ligne sans ISIN");
        if (!qs) return ign(line, "quantité nulle (opération sur titres)");
        const price = N(r, map.price), q = Math.abs(qs);
        // Valeur en euros : colonne « Value EUR » / « Valeur » (la première après la valeur locale), taux de change, frais en euros
        const iLocal = col(/^(local value|valeur locale|wert in lokalwahrung|lokale waarde|montant devise locale)$/);
        let iEur = H.findIndex((h, k) => k > Math.max(iLocal, map.price || 0) && /^(value|valeur|wert|waarde|montant)( (eur|en eur))?$|^(value|valeur|wert|waarde) eur$|^wert eur$|^valeur eur$/.test(h));
        if (iEur < 0) iEur = col(/(value|valeur|wert|waarde) (eur|chf)/);
        const eur = N(r, iEur), rate = N(r, col(/exchange rate|taux de change|wechselkurs|wisselkoers/));
        const fee = H.reduce((a, h, k) => a + (/(fee|frais|kosten|gebuhr)/.test(h) ? Math.abs(N(r, k) || 0) : 0), 0);
        const curP = cell(r, (map.price || 0) + 1);
        const t = qs > 0 ? "a" : "v", accCur = ((H[iEur] || "").match(/\b(eur|chf|usd|gbp)\b/) || [0, "eur"])[1].toUpperCase();
        if (eur != null && Math.abs(eur) > 0) op({ isin, name: cell(r, map.name), date: date(cell(r, map.date)), t, q, p: Math.abs(eur) / q, f: fee, cur: accCur, pLocal: price, curLocal: /^[A-Z]{3}$/.test(curP) ? curP : null, line });
        else if (price) op({ isin, name: cell(r, map.name), date: date(cell(r, map.date)), t, q, p: price, f: fee, cur: /^[A-Z]{3}$/.test(curP) ? curP : "EUR", x: rate ? 1 / rate : null, line });
        else ign(line, "prix absent");
        return;
      }
      // Formats d'opérations : pytr, Fortuneo, export de ce site, fichier générique
      const name = cell(r, map.name), isin = isinIn(cell(r, map.isin)) || (map.isin == null ? isinIn(r.join(" ")) : "");
      const tick = cell(r, map.ticker);
      if (!isin && SUMMARY.test(nrm(name || r.find(c => c) || ""))) return ign(line, `ligne de synthèse (« ${String(name || r.find(c => c)).slice(0, 40)} »)`, "synthese");
      const typ = cell(r, map.type), qty = N(r, map.qty), price = N(r, map.price), pru = N(r, map.pru), fees = Math.abs(N(r, map.fees) || 0), amt = N(r, map.amount);
      if (map.type != null && opType(typ) === "cash") return ign(line, `mouvement d'espèces ou impôt (« ${typ} »)`, "cash");
      if (!isin && !name && !tick) return ign(line, "ligne sans nom ni ISIN");
      const label = name || isin || tick;
      // Sans colonne « opération » : un PRU ou l'absence de date indiquent une position ; sinon le signe de la quantité
      let t = map.type == null ? (qty && (map.pru != null || map.date == null) ? "r" : opType("", qty)) : opType(typ, map.qty != null ? null : qty);
      if (!t && map.type != null && !typ.trim() && qty) t = opType("", qty);
      if (t === "cash") return ign(line, `mouvement d'espèces ou impôt (« ${typ} »)`, "cash");
      if (t === "x") return cancel(line, isin, name, qty, label, date(cell(r, map.date)));
      if (!t) return ign(line, `${label} : opération « ${typ || "?"} » non prise en compte`);
      const cur = (cell(r, map.currency) || "").toUpperCase(), curOk = /^[A-Z]{3}$/.test(cur) ? cur : "EUR";
      const q = Math.abs(qty || 0), d = date(cell(r, map.date));
      const extra = format === "bilan" ? { env: cell(r, col(/^compte$/)), br: cell(r, col(/^courtier$/)) } : {};
      if (t === "r" && !(q > 0) && amt > 0) { out.positions.push({ isin, name, ticker: tick, q: 0, m: Math.abs(amt), pru: null, cur: "EUR", line, ...extra }); return; }
      if (t === "d") { const v = Math.abs(amt != null ? amt : (price || 0) * (q || 1)); if (!v) return ign(line, "dividende sans montant"); return op({ isin, name, ticker: tick, date: d, t, q: 1, p: v, f: 0, cur: curOk, line, ...extra }); }
      if (t === "s") { if (!qty) return ign(line, `${label} : division sans quantité`, "ambigu"); return op({ isin, name, ticker: tick, date: d, t, q: /regroupement|reverse/.test(nrm(typ)) && qty > 0 ? -qty : qty, p: 0, f: 0, cur: curOk, line, why: nrm(typ), amb: format !== "bilan", ...extra }); }
      if (!(q > 0)) return ign(line, `${label} : quantité absente`);
      if (t === "ti" || t === "to") { const pp = price > 0 ? price : pru > 0 ? pru : amt ? Math.abs(amt) / q : null; return op({ isin, name, ticker: tick, date: d, t, q, p: t === "ti" ? pp : 0, f: 0, cur: curOk, line, why: "transfert", amb: t === "ti" && !(pp > 0), ...extra }); }
      let p = t === "r" ? (pru != null ? pru : price) : price;
      if (!(p > 0) && amt != null) p = format === "pytr" ? Math.max(0, Math.abs(amt) - (t === "a" ? fees : -fees)) / q : Math.abs(amt) / q;
      if (format === "pytr" && t === "a" && price == null && amt != null) p = Math.max(0, Math.abs(amt) - fees) / q;
      if (format === "pytr" && t === "v" && price == null && amt != null) p = (Math.abs(amt) + fees) / q;
      if (!(p > 0)) return ign(line, `${label} : prix absent`);
      if (t === "r" && !d) { out.positions.push({ isin, name, ticker: tick, q, pru: p, cur: curOk, line, ...extra }); return; }
      op({ isin, name, ticker: tick, date: d, t, q, p, f: fees, cur: curOk, line, ...extra });
    });
    pending.forEach(a => cancelNow(...a));
    out.kind = out.ops.length && out.positions.length ? "mixte" : out.positions.length || (!out.ops.length && out.sold.length) ? "positions" : "operations";
    if (!out.ops.length && !out.positions.length && !out.sold.length && !out.error) out.error = format === "generic" ? "Aucune opération ni position reconnue : indiquez ci-dessous quelle colonne contient quoi." : "Aucune opération sur des actions ou des ETF dans ce fichier.";
    return out;
  }

  /* ---------- Reconstitution des positions ----------
     On ne choisit jamais des lignes du fichier : on rejoue toutes les opérations de chaque titre dans l'ordre des dates
     (achats, ventes, divisions, transferts) pour obtenir ce qui est détenu aujourd'hui. Les positions à zéro sont « vendues ».
     Chaque position reçoit ses opérations au format enregistré (a, v, d, r), ce qui garde le PRU identique dans tout le site. */
  function reconstruct(r, opts = {}) {
    const fill = opts.pru || {}; // prix de revient saisis dans l'aperçu pour des titres reçus sans prix
    const gid = x => [x.isin || (x.ticker ? "t:" + x.ticker.toUpperCase() : "n:" + nrm(x.name)), nrm(x.env), x.br || "", x.acct || ""].join("|");
    // Un titre lu tantôt avec son ISIN, tantôt avec son seul nom : on le regroupe sous l'ISIN
    const isinOfName = {};
    for (const x of [...r.ops, ...r.positions]) if (x.isin && x.name && !isinOfName[nrm(x.name)]) isinOfName[nrm(x.name)] = x.isin;
    const norm1 = x => (!x.isin && x.name && isinOfName[nrm(x.name)] ? { ...x, isin: isinOfName[nrm(x.name)], viaName: true } : x);
    const G = new Map(), get = x => { const id = gid(x); if (!G.has(id)) G.set(id, { id, isin: x.isin || "", name: x.name || x.isin || x.ticker || "", ticker: x.ticker || "", env: x.env || "", br: x.br || "", acct: x.acct || "", ops: [], pos: [], lines: [] }); const g = G.get(id); if (!g.name && x.name) g.name = x.name; if (!g.ticker && x.ticker) g.ticker = x.ticker; return g; };
    r.ops.map(norm1).forEach(o => { const g = get(o); g.ops.push(o); g.lines.push(o.line); });
    r.positions.map(norm1).forEach(p => { const g = get(p); g.pos.push(p); g.lines.push(p.line); });
    const soldRows = (r.sold || []).map(norm1).filter(x => !G.has(gid(x))); // état du portefeuille : lignes soldées (quantité nulle ou statut clôturé)
    const active = [], sold = [], orphans = [], amb = [], extraIgn = [];
    let oversell = 0;
    for (const g of G.values()) {
      const A = [];
      // Devise : une position est suivie dans une seule devise ; les opérations dans une autre devise sont signalées, pas mélangées
      const curs = {}; [...g.ops.filter(o => o.t !== "d"), ...g.pos].forEach(x => { const c = x.cur || "EUR"; curs[c] = (curs[c] || 0) + 1; });
      const cur = Object.entries(curs).sort((a, b) => b[1] - a[1])[0]?.[0] || (g.ops[0] && g.ops[0].cur) || "EUR";
      const ops = g.ops.filter(o => { if ((o.cur || "EUR") === cur || o.t === "d" && Object.keys(curs).length <= 1) return true; extraIgn.push({ line: o.line, why: `${g.name} : opération en ${o.cur}, alors que la position est suivie en ${cur} (non mélangée)`, kind: "ambigu" }); return false; });
      if (ops.length < g.ops.length) A.push(`${g.ops.length - ops.length} opération${g.ops.length - ops.length > 1 ? "s" : ""} dans une autre devise que ${cur} : vérifiez la quantité.`);
      // Positions d'un état du portefeuille : plusieurs lignes du même titre sont additionnées (PRU pondéré)
      let q0 = 0, c0 = 0, m0 = 0, pruMiss = false, val = null, px = null;
      for (const p of g.pos) { if (p.m) { m0 += p.m; continue; } q0 += p.q; if (p.pru > 0) c0 += p.q * p.pru; else pruMiss = true; if (p.val) val = (val || 0) + p.val; if (p.px) px = p.px; }
      if (g.pos.filter(p => !p.m).length > 1) A.push(`apparaît sur ${g.pos.length} lignes du fichier (${g.pos.map(p => "ligne " + p.line).join(", ")}) : quantités additionnées, PRU moyen pondéré.`);
      if (pruMiss) A.push("prix de revient absent du fichier : à compléter.");
      const list = ops.map((o, i) => ({ o, i })).sort((a, b) => (a.o.date || "").localeCompare(b.o.date || "") || a.i - b.i).map(x => x.o);
      const st = []; let q = 0, cost = 0, real = 0, divs = 0, needPru = false, first = null, last = null;
      if (q0 > 0) { st.push(["", "r", rq(q0), c0 > 0 ? Math.round(c0 / q0 * 1e6) / 1e6 : 0, 0]); q = q0; cost = c0; }
      for (const o of list) {
        if (o.date && (!first || o.date < first)) first = o.date;
        if (o.date && (!last || o.date > last)) last = o.date;
        if (o.t === "a" || o.t === "r") { q += o.q; cost += o.q * o.p + (o.t === "a" ? o.f || 0 : 0); st.push([o.date || "", o.t, o.q, Math.round(o.p * 1e6) / 1e6, Math.round((o.f || 0) * 100) / 100]); }
        else if (o.t === "v") {
          if (o.q > q + 1e-6) { oversell++; A.push(`vente de ${fmtQ(o.q)} titre${o.q > 1 ? "s" : ""} le ${fmtD(o.date)} alors que le fichier n'en montre que ${fmtQ(q)} : l'historique commence sans doute après vos premiers achats.`); }
          const qq = Math.min(o.q, q), pru = q > 1e-9 ? cost / q : 0;
          real += qq * o.p - (o.f || 0) * (qq / o.q) - pru * qq; cost -= pru * qq; q -= qq; if (q < 1e-9) { q = 0; cost = 0; }
          st.push([o.date || "", "v", o.q, Math.round(o.p * 1e6) / 1e6, Math.round((o.f || 0) * 100) / 100]);
        } else if (o.t === "d") { divs += o.p - (o.f || 0); st.push([o.date || "", "d", 1, Math.round(o.p * 1e6) / 1e6, 0]); }
        else if (o.t === "s") {
          if (o.q > 0 && q <= 1e-9) { // division sans titres détenus d'après le fichier : l'historique est incomplet, le PRU est inconnu
            let p = fill[g.id] > 0 ? fill[g.id] : 0; if (p) g.filled = true; else needPru = true;
            A.push(`division le ${fmtD(o.date)} alors que le fichier ne montre aucun titre détenu : l'historique est incomplet, indiquez le prix de revient.`);
            q += o.q; cost += o.q * p; st.push([o.date || "", "r", o.q, Math.round(p * 1e6) / 1e6, 0]); continue;
          }
          if (o.q > 0) { q += o.q; st.push([o.date || "", "r", o.q, 0, 0]); }
          else if (q > 1e-9) { const f = Math.max(0, (q + o.q) / q); st.forEach(s => { if (s[1] !== "d") { s[2] = rq(s[2] * f); if (s[3]) s[3] = Math.round(s[3] / f * 1e6) / 1e6; } }); q = q * f; if (q < 1e-9) { q = 0; cost = 0; } }
          A.push(o.amb ? `${o.why === "division" ? "division" : o.why || "division"} le ${fmtD(o.date)} : ${o.q > 0 ? "+" : "−"}${fmtQ(Math.abs(o.q))} titre${Math.abs(o.q) > 1 ? "s" : ""}, coût total inchangé. Vérifiez la quantité finale.` : null);
        } else if (o.t === "ti") {
          let p = o.p > 0 ? o.p : null;
          if (!(p > 0) && fill[g.id] > 0) { p = fill[g.id]; g.filled = true; }
          if (!(p > 0)) { needPru = true; p = 0; A.push(`${fmtQ(o.q)} titre${o.q > 1 ? "s" : ""} reçu${o.q > 1 ? "s" : ""} le ${fmtD(o.date)} (${o.why || "transfert"}) sans prix de revient : indiquez-le.`); }
          q += o.q; cost += o.q * p; st.push([o.date || "", "r", o.q, Math.round(p * 1e6) / 1e6, 0]);
        } else if (o.t === "to") {
          const qq = Math.min(o.q, q), pru = q > 1e-9 ? cost / q : 0;
          if (o.q > q + 1e-6) A.push(`sortie de ${fmtQ(o.q)} titres le ${fmtD(o.date)} alors que le fichier n'en montre que ${fmtQ(q)}.`);
          if (qq > 0) st.push([o.date || "", "v", rq(qq), Math.round(pru * 1e6) / 1e6, 0]);
          cost -= pru * qq; q -= qq; if (q < 1e-9) { q = 0; cost = 0; }
        }
      }
      const amb1 = A.filter(Boolean);
      // Contrôle : le calcul enregistré (méthode du site) redonne la même quantité et le même PRU
      const chk = st.length ? position(st) : null;
      const same = !chk || (Math.abs(chk.q - rq(q)) < 1e-5 && (q < 1e-9 || Math.abs(chk.pru - cost / q) <= Math.max(1e-6, (cost / q) * 1e-5)));
      if (!same) amb1.push("écart entre le calcul pas à pas et le calcul enregistré : vérifiez cette ligne.");
      const item = { id: g.id, isin: g.isin, name: g.name, ticker: g.ticker, env: g.env, br: g.br, acct: g.acct, cur, q: rq(q), pru: q > 1e-9 ? cost / q : 0, cost, real, divs, m: m0 || 0,
        ops: list.length ? st : null, pos: !list.length && q0 > 0 ? { q: rq(q0), pru: c0 > 0 ? c0 / q0 : 0 } : null, nOps: list.filter(o => o.t !== "d").length, first, last, lines: g.lines, amb: amb1, needPru, filled: !!g.filled, val, px, same };
      if (item.q > 1e-6 || item.m > 0) active.push(item);
      else if (!item.nOps && !g.pos.length) { item.orphan = true; amb1.push("dividendes reçus mais aucun achat dans le fichier : ce titre a sans doute été acheté avant la période exportée. Ajoutez-le à la main s'il est toujours détenu."); orphans.push(item); }
      else sold.push(item);
      if (amb1.length) amb.push({ id: g.id, name: g.name, items: amb1 });
    }
    for (const x of soldRows) if (!sold.some(y => y.id === gid(x))) sold.push({ id: gid(x), isin: x.isin || "", name: x.name || x.isin, ticker: "", env: x.env || "", br: x.br || "", acct: "", cur: "EUR", q: 0, pru: 0, cost: 0, real: 0, divs: 0, m: 0, ops: null, pos: null, nOps: 0, first: null, last: null, lines: [x.line], amb: [], needPru: false, filled: false, same: true, fromState: true });
    // Contrôle des valorisations d'un état du portefeuille : quantité × cours ≈ valorisation
    for (const a of active) if (a.val && a.px && a.q > 0 && Math.abs(a.q * a.px - a.val) / a.val > 0.03) { const t = `quantité × cours (${fmtQ(a.q)} × ${fmtQ(a.px)}) ne redonne pas la valorisation du fichier (${fmtQ(a.val)}) : vérifiez la quantité.`; a.amb.push(t); const e = amb.find(x => x.id === a.id); if (e) e.items.push(t); else amb.push({ id: a.id, name: a.name, items: [t] }); }
    // Toutes les lignes du fichier sont-elles comptées ?
    const seenL = new Set([...r.ops.map(o => o.line), ...r.positions.map(p => p.line), ...r.ignored.map(i => i.line), ...(r.cancelled || [])]);
    const dates = r.ops.map(o => o.date).filter(Boolean).sort();
    const period = dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null;
    const checks = [];
    checks.push({ ok: seenL.size === r.rows, t: `${r.rows} ligne${r.rows > 1 ? "s" : ""} lue${r.rows > 1 ? "s" : ""} sur ${r.rows} : chacune est reprise ou listée avec sa raison.` });
    if (r.kind !== "positions") checks.push({ ok: !oversell, t: oversell ? `${oversell} vente${oversell > 1 ? "s" : ""} portant sur plus de titres que l'historique n'en montre : voir « À vérifier ».` : "Quantités cohérentes : aucune vente ne dépasse les titres achetés auparavant." });
    checks.push({ ok: active.every(a => a.same) && sold.every(a => a.same), t: "PRU recalculé deux fois (pas à pas, puis avec la méthode du site) : mêmes résultats." });
    if (period) checks.push({ ok: true, info: true, t: `Opérations du ${fmtD(period.from)} au ${fmtD(period.to)}. Les titres achetés avant le ${fmtD(period.from)} n'apparaissent pas si l'export ne couvre qu'une période.` });
    if (r.dups) checks.push({ ok: true, info: true, t: `${r.dups} ligne${r.dups > 1 ? "s" : ""} en double comptée${r.dups > 1 ? "s" : ""} une seule fois.` });
    return { kind: r.kind, active, sold, orphans, amb, checks, period, extraIgn, crypto: Object.entries(r.crypto || {}).filter(([, v]) => Math.abs(v) > 1e-9).map(([n, v]) => ({ name: n, q: rq(v) })) };
  }
  const fmtQ = v => { const x = Math.round(v * 1e4) / 1e4; return String(x).replace(".", ","); };
  const fmtD = d => /^\d{4}-\d{2}-\d{2}$/.test(d || "") ? d.slice(8, 10) + "/" + d.slice(5, 7) + "/" + d.slice(0, 4) : "?";
  // Limite de la version gratuite : elle porte sur les positions actives, les plus importantes en valeur d'abord (jamais l'ordre du fichier)
  function pick(list, n, val) { return list.map((x, i) => ({ x, i, v: +val(x) || 0 })).sort((a, b) => b.v - a.v || a.i - b.i).slice(0, n === Infinity ? undefined : Math.max(0, n)).map(o => o.x); }
  // Export : un fichier lisible par Excel (point-virgule, virgule décimale) et réimportable ici
  function toCsv(P, nameOf) {
    const f = v => v == null || v === "" ? "" : String(Math.round(v * 1e6) / 1e6).replace(".", ",");
    const q = s => /[;"\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : String(s == null ? "" : s);
    const ENV = { pea: "PEA", cto: "CTO", av: "Assurance-vie" }, T = { a: "Achat", v: "Vente", d: "Dividende", r: "Position" };
    const out = ["Date;Opération;Nom;ISIN;Ticker;Quantité;Prix unitaire;Frais;Devise;Compte;Courtier;Montant investi"];
    for (const l of P.l) {
      const n = nameOf ? nameOf(l) : { name: l.nm || l.k, isin: l.isin || "", ticker: "" }, cur = l.cur || n.cur || "EUR";
      const base = [q(n.name), n.isin || "", q(n.ticker || "")];
      const tail = [cur, ENV[l.env] || "", l.br || ""];
      if (l.o && l.o.length) for (const o of l.o) out.push([o[0], o[1] === "r" && o[0] && !o[3] ? "Division" : T[o[1]], ...base, o[1] === "d" ? "" : f(o[2]), f(o[1] === "d" ? o[3] * (o[2] || 1) : o[3]), f(o[4]), ...tail, ""].join(";"));
      else if (l.q > 0) out.push(["", T.r, ...base, f(l.q), f(l.pru), "", ...tail, ""].join(";"));
      else if (l.m > 0) out.push(["", T.r, ...base, "", "", "", ...tail, f(l.m)].join(";"));
    }
    return "﻿" + out.join("\r\n") + "\r\n";
  }
  return { position, linePos, syncLine, migrate, compact, size, parseCsv, num, date, read, reconstruct, pick, detect, guessMap, toCsv, FORMATS, BROKER_OF, opType, cleanLine, KEYOK };
})();
if (typeof module === "object" && module) module.exports = PF3;

/* =====================================================================
   2. Enregistrement, valorisation et analyses (navigateur)
   ===================================================================== */
const PF3_BACKUP = "bilan.portefeuille.avant-synchro", PF3_OLDKEY = "repere.pf.v2", PF3_DRAFT = "bilan.portefeuille.brouillon";
const PF3_ENV = { pea: "PEA", cto: "Compte-titres", av: "Assurance-vie" }, PF3_ENVS = { pea: "PEA", cto: "CTO", av: "Ass.-vie" };
const PF3_PAL = ["#111214", "#0E6B4A", "#D94F2B", "#0E7490", "#8FB51E", "#7A5C99", "#C2410C", "#B9AE97", "#5B4FC4", "#8A6D1E"], PF3_OTHER = "#D9D3C7";
const PF3_HORIZ = [["0", "Moins de 2 ans"], ["1", "2 à 5 ans"], ["2", "5 à 10 ans"], ["3", "Plus de 10 ans"]];
const PF3S = { open: -1, view: "ligne", lt: true, demo: null, form: null, imp: null, cache: null, ia: null };

function pf3Raw() { try { return JSON.parse(localStorage.getItem(PF2) || "null"); } catch (e) { return null; } }
function pf2Load() {
  const raw = pf3Raw();
  if ((!raw || !Array.isArray(raw.l) || !raw.l.length) && typeof R !== "undefined" && R && R.companies) { // ancien simulateur d'opérations
    let old = null; try { old = localStorage.getItem("bilan.portefeuille.repris") ? null : JSON.parse(localStorage.getItem(PF3_OLDKEY) || "null"); } catch (e) { }
    if (old && Array.isArray(old.ops) && old.ops.length) {
      const P = PF3.migrate(old, { known: id => !!RBY[id] });
      try { localStorage.setItem("bilan.portefeuille.repris", "1"); } catch (e) { }
      if (P.l.length) { P.maj = Date.now(); try { localStorage.setItem(PF2, JSON.stringify(P)); } catch (e) { } return P; }
    }
  }
  const P = PF3.migrate(raw);
  if (raw && raw.v !== 3 && Array.isArray(raw.l) && raw.l.length) { // première lecture d'un portefeuille de l'ancienne version : on garde l'original
    try { if (!localStorage.getItem("bilan.portefeuille.v2")) localStorage.setItem("bilan.portefeuille.v2", JSON.stringify(raw)); localStorage.setItem(PF2, JSON.stringify(P)); } catch (e) { }
  }
  return P;
}
function pf2Save(p) {
  const P = PF3.migrate(p);
  const syncing = typeof SYNCING !== "undefined" && SYNCING;
  if (syncing) { // données venues du compte : la version la plus récente l'emporte, l'autre est gardée de côté
    const loc = PF3.migrate(pf3Raw());
    if (loc.l.length && JSON.stringify(loc.l) !== JSON.stringify(P.l)) {
      if ((loc.maj || 0) > (P.maj || 0)) { setTimeout(() => { if (typeof pushDonnees === "function") pushDonnees(); }, 60); return; }
      try { localStorage.setItem(PF3_BACKUP, JSON.stringify({ at: Date.now(), p: loc })); } catch (e) { }
    }
  } else P.maj = Date.now();
  PF3.compact(P);
  try { localStorage.setItem(PF2, JSON.stringify(P)); } catch (e) { if (typeof toast === "function") toast("Enregistrement impossible dans ce navigateur (stockage plein ou désactivé)."); }
  PF3S.cache = null;
  if (typeof pushDonnees === "function") pushDonnees();
}

/* ---------- Ce que l'on sait d'un titre ---------- */
const pf3Strip = s => norm(String(s || "")).replace(/\.com\b/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\b(inc|incorporated|corp|corporation|co|company|ltd|limited|plc|sa|se|nv|ag|asa|ab|spa|the|holdings?|group|groupe|class [a-z]|cl [a-z]|adr|reg|shs|ord|common st(ock)?)\b/g, " ").replace(/\s+/g, " ").trim();
let PF3_NAMES = null;
function pf3ByName(name) {
  if (!PF3_NAMES) { PF3_NAMES = new Map(); R.companies.forEach(c => { const s = pf3Strip(c.name); if (s && !PF3_NAMES.has(s)) PF3_NAMES.set(s, c); }); }
  const s = pf3Strip(name); if (!s) return null;
  if (PF3_NAMES.has(s)) return PF3_NAMES.get(s);
  const w = s.split(" "); for (let n = w.length - 1; n >= 1; n--) { const t = w.slice(0, n).join(" "); if (t.length >= 4 && PF3_NAMES.has(t)) return PF3_NAMES.get(t); }
  return null;
}
// Cours en sous-unités (agorot israéliens, pence) ramenés à l'unité de la devise : les montants restent cohérents avec les fiches
const PF3_SUB = { ILA: ["ILS", 100], GBX: ["GBP", 100], GBp: ["GBP", 100], ZAc: ["ZAR", 100] };
function pf3PxN(px) { if (!px) return null; const s = PF3_SUB[px.cur]; if (!s) return px; const d = s[1], o = { ...px, cur: s[0] }; ["p", "h52", "l52", "p1y", "p3y", "p5y"].forEach(k => { if (typeof o[k] === "number") o[k] = o[k] / d; }); return o; }
function pf3Info(l) {
  const k = l.k, kind = k.slice(0, 1);
  if (kind === "c") { const c = RBY[k.slice(2)]; if (c) { const px = pf3PxN(PX[k]);
    return { kind, c, name: c.name, href: "/entreprise/" + c.id, ticker: c.ticker || "", isin: c.isin || "", type: "Action", pea: peaOk(c), px, sector: secName(c), country: (c.isin || "").slice(0, 2) || (c.region === "US" ? "US" : c.region === "FR" ? "FR" : ""), curQ: (px && px.cur) || c.currency || "EUR" }; } }
  if (kind === "e") { const e = ETFBY[k.slice(2)]; if (e) { const px = pf3PxN(PX[k]);
    return { kind, e, name: e.name, href: "/etf/" + e.id, ticker: e.ticker || "", isin: e.isin || "", type: "ETF", pea: !!e.pea, px, ter: e.ter || 0, cat: e.categorie, curQ: (px && px.cur) || e.devise || "EUR" }; } }
  return { kind: "x", name: l.nm || (l.isin || k.slice(2)), href: null, ticker: "", isin: l.isin || (/^x:[A-Z0-9]{12}$/.test(k) ? k.slice(2) : ""), type: "Titre", pea: null, px: null, curQ: l.cur || "EUR" };
}
const pf3Logo = (l, s = 28) => l.k.startsWith("x:") ? logo({ name: l.nm || "?" }, s) : keyLogo(l.k, s);
const pf3E = (v, cur) => { if (v == null || !isFinite(v)) return null; if (!cur || cur === "EUR") return v; const e = toEur(v, cur); return e != null && isFinite(e) ? e : null; };
const pf3Eu = (v, d = 0) => v == null || !isFinite(v) ? "–" : nf(d).format(v) + " €";
const pf3Sg = (v, d = 0) => v == null || !isFinite(v) ? "–" : (v > 0.004 ? "+" : v < -0.004 ? "−" : "") + nf(d).format(Math.abs(v)) + " €";
const pf3Pc = (v, d = 1) => v == null || !isFinite(v) ? "–" : (v > 0.00004 ? "+" : v < -0.00004 ? "−" : "") + nf(d).format(Math.abs(v * 100)) + " %";
const pf3Px = (v, cur) => v == null || !isFinite(v) ? "–" : nf(v >= 1000 ? 0 : v >= 10 ? 2 : v >= 1 ? 2 : 4).format(v) + " " + (CUR[cur] || cur || "€");
const pf3Cls = v => v > 0.004 ? "up" : v < -0.004 ? "down" : "";

/* ---------- Valorisation ligne par ligne ---------- */
function pf3Rows(P) {
  const rows = P.l.map((l, i) => {
    const info = pf3Info(l), pos = PF3.linePos(l), lcur = l.cur || info.curQ || "EUR";
    let price = null;
    if (info.px && info.px.p > 0) price = { p: info.px.p, cur: info.px.cur || info.curQ, src: "cours" };
    else if (l.px > 0) price = { p: l.px, cur: lcur, src: "saisi" };
    else if (pos.buys.length) price = { p: pos.buys[pos.buys.length - 1].p, cur: lcur, src: "achat" };
    else if (pos.pru > 0) price = { p: pos.pru, cur: lcur, src: "pru" };
    const mOnly = !(pos.q > 0) && l.m > 0 && !(l.o && l.o.length);
    const closed = !(pos.q > 0) && !mOnly;
    let valE = mOnly ? l.m : closed ? 0 : price ? pf3E(pos.q * price.p, price.cur) : null;
    let costE = mOnly ? l.m : closed ? 0 : pos.costE != null ? pos.costE : pf3E(pos.cost, lcur);
    const gainE = valE != null && costE != null && !mOnly && price && price.src === "cours" ? valE - costE : null;
    const dayE = valE && info.px && info.px.chg != null && price && price.src === "cours" ? valE - valE / (1 + info.px.chg / 100) : null;
    const realE = pf3E(pos.real + (l.rv || 0), lcur) || 0, feesE = pf3E(pos.fees, lcur) || 0, divsE = pf3E(pos.divs, lcur) || 0;
    const local = price && price.src === "cours" && price.cur === lcur && pos.pru > 0 ? price.p / pos.pru - 1 : null;
    return { i, l, info, pos, lcur, price, valE, costE, gainE, gainPct: gainE != null && costE > 0 ? gainE / costE : null, dayE, realE, feesE, divsE, local, mOnly, closed, fxApprox: lcur !== "EUR" && pos.costE == null && !mOnly };
  });
  const live = rows.filter(r => r.valE > 0), tot = live.reduce((a, r) => a + r.valE, 0);
  rows.forEach(r => r.w = tot > 0 && r.valE > 0 ? r.valE / tot : 0);
  const priced = live.filter(r => r.gainE != null);
  const T = {
    tot, n: live.length, cost: live.reduce((a, r) => a + (r.costE || 0), 0),
    gain: priced.reduce((a, r) => a + r.gainE, 0), gainBase: priced.reduce((a, r) => a + r.costE, 0),
    day: live.reduce((a, r) => a + (r.dayE || 0), 0), dayN: live.filter(r => r.dayE != null).length,
    real: rows.reduce((a, r) => a + r.realE, 0), fees: rows.reduce((a, r) => a + r.feesE, 0), divs: rows.reduce((a, r) => a + r.divsE, 0),
    noPx: live.filter(r => r.price && r.price.src !== "cours" && !r.mOnly).length, mOnly: live.filter(r => r.mOnly).length,
  };
  T.gainPct = T.gainBase > 0 ? T.gain / T.gainBase : null;
  T.dayPct = T.tot - T.day > 0 && T.dayN ? T.day / (T.tot - T.day) : null;
  return { rows, live, T };
}

/* ---------- Transparence des ETF : ce que l'on possède vraiment ---------- */
const PF3_CCUR = { US: "USD", GB: "GBP", JP: "JPY", CH: "CHF", CA: "CAD", AU: "AUD", HK: "HKD", CN: "CNY", TW: "TWD", KR: "KRW", IN: "INR", DK: "DKK", SE: "SEK", NO: "NOK", BR: "BRL", MX: "MXN", ZA: "ZAR", SG: "SGD", IL: "ILS", PL: "PLN", SA: "SAR" };
const PF3_EURO = new Set(["FR", "DE", "NL", "BE", "LU", "IT", "ES", "PT", "IE", "AT", "FI", "GR", "SK", "SI", "EE", "LV", "LT", "MT", "CY", "HR"]);
const pf3CurOf = cc => PF3_EURO.has(cc) ? "EUR" : PF3_CCUR[cc] || "Autres";
const PF3_CURN = { EUR: "Euro", USD: "Dollar américain", GBP: "Livre sterling", JPY: "Yen", CHF: "Franc suisse", CAD: "Dollar canadien", AUD: "Dollar australien", HKD: "Dollar de Hong Kong", CNY: "Yuan", TWD: "Dollar taïwanais", KRW: "Won", INR: "Roupie indienne", DKK: "Couronne danoise", SEK: "Couronne suédoise", NOK: "Couronne norvégienne", BRL: "Real brésilien", Autres: "Autres devises" };
const PF3_TYPE = { "actions-monde": "ETF actions", "actions-usa": "ETF actions", "actions-europe": "ETF actions", "actions-france": "ETF actions", "actions-emergents": "ETF actions", "actions-asie": "ETF actions", theme: "ETF actions", dividendes: "ETF actions", facteurs: "ETF actions", immobilier: "ETF immobilier", obligations: "ETF obligations", monetaire: "ETF monétaires", matieres: "ETF matières premières" };
const PF3_CATC = { "actions-france": "FR", "actions-usa": "US" };
async function pf3Comp(e) { // composition d'un ETF (format actuel : top, countries, isins ; champs facultatifs : sectors)
  if (!e) return null;
  try { const c = typeof etfComp === "function" ? await etfComp(e) : null; return c && (c.isins || c.top) ? c : null; } catch (x) { return null; }
}
async function pf3Look(rows) {
  const live = rows.filter(r => r.valE > 0), tot = live.reduce((a, r) => a + r.valE, 0);
  const X = { co: new Map(), sect: {}, ctry: {}, cur: {}, type: {}, env: {}, line: [], known: 0, sectKnown: 0, comps: [], noComp: [] };
  if (!tot) return X;
  const add = (o, k, w) => { o[k] = (o[k] || 0) + w; };
  const coAdd = (key, name, href, w, extra) => { const x = X.co.get(key) || { name, href, w: 0, via: new Set() }; x.w += w; if (extra) x.via.add(extra); if (!x.href && href) x.href = href; X.co.set(key, x); };
  for (const r of live) {
    const w = r.valE / tot, info = r.info;
    X.line.push({ label: info.name, w, v: r.valE, k: r.l.k });
    add(X.env, r.l.env ? PF3_ENV[r.l.env] : "Compte non précisé", w);
    if (info.kind === "c") {
      add(X.type, "Actions en direct", w); add(X.sect, info.sector, w); X.sectKnown += w; X.known += w;
      add(X.ctry, info.country || "Autres", w); add(X.cur, info.curQ || "EUR", w);
      coAdd("c:" + info.c.id, info.name, info.href, w, "direct");
    } else if (info.kind === "e") {
      const e = info.e; add(X.type, PF3_TYPE[e.categorie] || "ETF actions", w);
      const comp = /obligations|monetaire|matieres/.test(e.categorie) ? null : await pf3Comp(e);
      if (comp) {
        X.comps.push([e, comp, w]); X.known += w;
        let cov = 0; const cs = comp.countries || [];
        cs.forEach(([cc, p]) => { add(X.ctry, cc, w * p / 100); add(X.cur, pf3CurOf(cc), w * p / 100); cov += p / 100; });
        if (cov < 0.999) { add(X.ctry, "Autres", w * (1 - cov)); add(X.cur, "Autres", w * (1 - cov)); }
        const names = {}; (comp.top || []).forEach(h => { if (h.isin) names[h.isin] = h.name; });
        const secs = Array.isArray(comp.sectors) ? comp.sectors : comp.sectors && typeof comp.sectors === "object" ? Object.entries(comp.sectors) : null;
        let sk = 0;
        for (const [isin, p] of (comp.isins || [])) {
          const c = ISINBY[isin] || (names[isin] ? pf3ByName(names[isin]) : null), ww = w * p / 100;
          coAdd(c ? "c:" + c.id : names[isin] ? "n:" + pf3Strip(names[isin]) : "i:" + isin, c ? c.name : names[isin] ? titleCase(names[isin]).replace(/,?\s+(Class|Cl\.?) [A-Z]\.?$/i, "") : isin, c ? "/entreprise/" + c.id : null, ww, e.name);
          if (!secs && c) { add(X.sect, secName(c), ww); sk += ww; }
        }
        if (secs) { secs.forEach(([s, p]) => { add(X.sect, pfSecteurEtf(s), w * p / 100); sk += w * p / 100; }); }
        if (sk < w - 1e-9) add(X.sect, "Non renseigné (dans les ETF)", w - sk);
        X.sectKnown += sk;
      } else {
        X.noComp.push(r);
        const cc = PF3_CATC[e.categorie]; add(X.ctry, cc || "Non détaillé", w);
        add(X.cur, e.categorie === "actions-usa" ? "USD" : /obligations|monetaire/.test(e.categorie) ? (e.devise || "EUR") : "Autres", w);
        add(X.sect, /obligations|monetaire/.test(e.categorie) ? "Obligations et monétaire" : /matieres/.test(e.categorie) ? "Matières premières" : "Non renseigné (dans les ETF)", w);
        coAdd("e:" + e.id, e.name + " (composition non détaillée)", info.href, w, "etf");
      }
    } else {
      add(X.type, "Autres titres", w); add(X.sect, "Non renseigné", w); add(X.ctry, (info.isin || "").slice(0, 2) || "Non détaillé", w); add(X.cur, r.lcur, w);
      coAdd(r.l.k, info.name, null, w, "direct");
    }
  }
  // Chevauchement des ETF deux à deux (part identique)
  X.overlaps = [];
  for (let i = 0; i < X.comps.length; i++) for (let j = i + 1; j < X.comps.length; j++) {
    const ma = new Map(X.comps[i][1].isins || []), mb = new Map(X.comps[j][1].isins || []); let ov = 0;
    for (const [k, w] of ma) if (mb.has(k)) ov += Math.min(w, mb.get(k));
    X.overlaps.push([X.comps[i][0], X.comps[j][0], ov]);
  }
  // Concentration : nombre « effectif » d'entreprises (inverse de la somme des poids au carré), sur la partie connue
  const ws = [...X.co.entries()].filter(([k]) => !k.startsWith("e:")).map(([, x]) => x.w), sum = ws.reduce((a, b) => a + b, 0);
  X.neff = sum > 0 ? 1 / ws.reduce((a, w) => a + (w / sum) ** 2, 0) : null;
  X.top = [...X.co.values()].sort((a, b) => b.w - a.w);
  return X;
}

/* ---------- Score de diversification : quatre repères, chacun expliqué ---------- */
function pf3Score(X) {
  const items = [], clamp = x => Math.max(0, Math.min(1, x));
  // Position sur la jauge : le seuil « bon » tombe au tiers, le seuil « à surveiller » aux deux tiers ; la couleur suit la position
  const zp = (v, good, bad) => { const pos = clamp(1 / 3 + (v - good) / (bad - good) / 3); return { pos, s: 1 - pos, zone: pos <= 1 / 3 + 1e-9 ? "fort" : pos < 2 / 3 ? "moyen" : "vig" }; };
  const sorted = o => Object.entries(o).filter(([k]) => !/^(Autres|Non détaillé|Non renseigné.*|Autres devises)$/.test(k)).sort((a, b) => b[1] - a[1]);
  if (X.neff != null) items.push({ t: "Nombre réel d'entreprises", v: X.neff, txt: `${F0.format(X.neff)}`, ...zp(Math.log(Math.max(1, X.neff)), Math.log(30), Math.log(10)), rep: "Au moins 30 : une entreprise qui va mal pèse peu.", why: "Calculé une fois les ETF ouverts : 1 ÷ somme des poids au carré. Deux lignes de 50 % comptent pour 2, mille lignes égales pour 1 000." });
  const top = X.top && X.top.find(x => !/composition non détaillée/.test(x.name));
  if (top) items.push({ t: "Première entreprise", v: top.w, txt: `${esc(top.name)} : ${pct(top.w, 1, false)}`, ...zp(top.w, 0.05, 0.12), rep: "Moins de 5 % par entreprise, en comptant celles détenues dans vos ETF.", why: "Si elle perdait la moitié de sa valeur, votre portefeuille baisserait de " + pct(top.w / 2, 1, false) + "." });
  const c1 = sorted(X.ctry)[0];
  if (c1) items.push({ t: "Premier pays", v: c1[1], txt: `${esc(COUNTRY[c1[0]] || c1[0])} : ${pct(c1[1], 0, false)}`, ...zp(c1[1], 0.5, 0.75), rep: "Moins de 50 % dans un seul pays.", why: c1[0] === "US" ? "Un ETF Monde contient environ 70 % d'actions américaines : c'est le poids des États-Unis dans la Bourse mondiale." : "Une crise propre à ce pays toucherait une grande partie du portefeuille." });
  const s1 = sorted(X.sect).filter(([k]) => !/Obligations|Matières/.test(k))[0];
  if (s1 && X.sectKnown >= 0.4) items.push({ t: "Premier secteur", v: s1[1], txt: `${esc(s1[0])} : ${pct(s1[1], 0, false)}`, ...zp(s1[1], 0.3, 0.45), rep: "Moins de 30 % dans un même secteur.", why: "Les entreprises d'un secteur montent et baissent souvent ensemble (même conjoncture, mêmes règles)." });
  const score = items.length ? Math.round(items.reduce((a, x) => a + x.s, 0) / items.length * 100) : null;
  return { score, items, label: score == null ? "" : score >= 75 ? "large" : score >= 50 ? "moyenne" : "faible" };
}

/* ---------- Frais : courtage payé, poids selon la taille des ordres, frais des ETF, coût sur 10 ans ---------- */
function pf3Fees(R0, P) {
  const cfg = P.cfg || {}, orders = [];
  R0.rows.forEach(r => { r.pos.buys.forEach(b => { const a = pf3E(b.amt, r.lcur), f = pf3E(b.f, r.lcur); if (a > 0) orders.push({ d: b.d, a, f: f || 0, br: r.l.br, name: r.info.name }); }); });
  const paid = R0.T.fees, bought = orders.reduce((a, o) => a + o.a, 0), fromOrders = orders.reduce((a, o) => a + o.f, 0);
  const etf = R0.live.filter(r => r.info.kind === "e"), etfV = etf.reduce((a, r) => a + r.valE, 0), terE = etf.reduce((a, r) => a + r.valE * (r.info.ter || 0) / 100, 0);
  const mainB = (cfg.courtier && BROKERS.list.find(b => b.id === cfg.courtier)) || (() => { const c = {}; R0.live.forEach(r => { if (r.l.br) c[r.l.br] = (c[r.l.br] || 0) + r.valE; }); const id = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return id ? BROKERS.list.find(b => b.id === id[0]) : null; })();
  const m = +cfg.mensuel || 0, n = Math.max(1, +cfg.ordres || 1);
  let yearBrok = null, yearSrc = "";
  if (mainB && m > 0) { yearBrok = brokerFee(mainB, m / n, cfg.perso) * n * 12; yearSrc = `${n} achat${n > 1 ? "s" : ""} de ${F0.format(m / n)} € par mois chez ${mainB.name}`; }
  else { const y = orders.filter(o => o.d && o.d >= addDays(TODAY, -365)); if (y.length) { yearBrok = y.reduce((a, o) => a + o.f, 0); yearSrc = "vos achats des douze derniers mois"; } }
  const heavy = orders.filter(o => o.f / o.a > 0.01);
  const med = orders.length ? median(orders.map(o => o.a)) : m > 0 ? m / n : null;
  return { orders, paid, bought, fromOrders, ratio: bought > 0 ? fromOrders / bought : null, etfV, terE, ter: etfV > 0 ? terE / etfV : null, mainB, yearBrok, yearSrc, ten: terE * 10 + (yearBrok || 0) * 10, heavy, med };
}

/* ---------- Dividendes attendus sur douze mois ---------- */
function pf3Divs(R0) {
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(TODAY.slice(0, 7) + "-01T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() + i); return d.toISOString().slice(0, 7); });
  const per = Object.fromEntries(months.map(m => [m, 0])), lines = [];
  let total = 0, undated = 0;
  const end = addDays(TODAY, 366);
  for (const r of R0.live) {
    if (r.info.kind === "c") {
      const c = r.info.c, v = valo(c), yld = v && v.yld;
      if (!yld || !(r.valE > 0)) { lines.push({ r, est: 0, why: c.missing ? "comptes non disponibles" : "pas de dividende dans les derniers comptes" }); continue; }
      const est = r.valE * yld; total += est;
      const pay = AG.events.filter(e => e.id === c.id && e.date >= TODAY && e.date <= end && /ividende|acompte|solde/i.test(e.type + " " + e.label) && /paiement|mise en paiement|versement/i.test(e.label));
      const det = pay.length ? pay : AG.events.filter(e => e.id === c.id && e.date >= TODAY && e.date <= end && /ividende|acompte|solde/i.test(e.type + " " + e.label) && /détachement|dernier jour/i.test(e.label));
      const uniq = [...new Map(det.map(e => [e.date.slice(0, 7), e])).values()];
      if (uniq.length) uniq.forEach(e => { if (per[e.date.slice(0, 7)] != null) per[e.date.slice(0, 7)] += est / uniq.length; else undated += est / uniq.length; });
      else undated += est;
      lines.push({ r, est, yld, next: uniq[0] || null, dps: c.dps, dpsEst: typeof donDps === "function" && donDps(c).estime, cur: c.currency, year: c.year });
    } else if (r.info.kind === "e") {
      const dist = /dist/i.test(r.info.e.distribution || "");
      lines.push({ r, est: null, etf: true, dist });
    }
  }
  return { months, per, total, undated, lines, yld: R0.T.tot > 0 ? total / R0.T.tot : null };
}

/* ---------- Ce qui mérite l'attention ---------- */
function pf3Alerts(R0, X, F, P, prof) {
  const W = [], T = R0.T, cfg = P.cfg || {};
  const push = (lv, t, why, tag) => W.push({ lv, t, why, tag });
  const big = R0.live.slice().sort((a, b) => b.valE - a.valE);
  big.filter(r => r.info.kind !== "e" && r.w > 0.1).forEach(r => push(r.w > 0.25 ? "vig" : "moyen", `${esc(r.info.name)} pèse ${pct(r.w, 0, false)} du portefeuille.`, `Si son cours baissait de 30 %, votre portefeuille perdrait ${pct(r.w * 0.3, 1, false)}. Beaucoup d'investisseurs limitent une action seule à 5 ou 10 %.`, "concentration"));
  const top3 = big.slice(0, 3).reduce((a, r) => a + r.w, 0);
  if (big.length >= 4 && top3 > 0.7 && big.slice(0, 3).some(r => r.info.kind !== "e")) push("moyen", `Trois lignes concentrent ${pct(top3, 0, false)} de votre argent.`, "Votre résultat dépendra surtout d'elles. C'est un choix possible, à faire en connaissance de cause.", "concentration");
  if (X && X.top) { const co = X.top.find(x => x.via.size > 1 && x.via.has("direct") && x.w > 0.05); if (co) push("moyen", `${esc(co.name)} représente ${pct(co.w, 1, false)} du portefeuille en comptant vos ETF.`, "Vous la détenez en direct et à travers un ou plusieurs ETF : son poids réel est plus élevé que celui de la ligne seule.", "concentration"); }
  if (X && X.overlaps) X.overlaps.filter(o => o[2] > 50).forEach(([a, b, ov]) => push("moyen", `${esc(a.name)} et ${esc(b.name)} se recouvrent à ${F0.format(ov)} %.`, "Ils contiennent en bonne partie les mêmes entreprises : les deux réunis diversifient moins qu'il n'y paraît. Le recouvrement est calculé sur leurs compositions publiées.", "doublon"));
  if (X && X.sect) { const s1 = Object.entries(X.sect).filter(([k]) => !/^Non renseigné|Obligations|Matières/.test(k)).sort((a, b) => b[1] - a[1])[0]; if (s1 && s1[1] > 0.4) push("vig", `Le secteur ${esc(s1[0].toLowerCase())} représente ${pct(s1[1], 0, false)} du portefeuille.`, "Les entreprises d'un même secteur montent et baissent souvent ensemble.", "secteur"); }
  if (X && X.ctry) { const c1 = Object.entries(X.ctry).filter(([k]) => !/^(Autres|Non détaillé)$/.test(k)).sort((a, b) => b[1] - a[1])[0]; if (c1 && c1[1] > 0.65) push("moyen", `${pct(c1[1], 0, false)} de votre argent est placé dans un seul pays (${esc(COUNTRY[c1[0]] || c1[0])}).`, c1[0] === "US" ? "C'est fréquent avec un ETF Monde : les États-Unis pèsent environ 70 % des indices mondiaux." : "Une crise propre à ce pays toucherait tout le portefeuille.", "pays"); }
  if (X && X.cur) { const fx = Object.entries(X.cur).filter(([k]) => k !== "EUR").reduce((a, [, w]) => a + w, 0); if (fx > 0.5) push("moyen", `${pct(fx, 0, false)} du portefeuille dépend d'autres devises que l'euro.`, "Même un ETF coté en euros suit des entreprises qui vendent en dollars ou en yens : si l'euro monte face à ces devises, la valeur en euros baisse, et inversement.", "devise"); }
  R0.live.filter(r => r.l.env === "pea" && r.info.pea === false).forEach(r => push("vig", `${esc(r.info.name)} est rangée dans un PEA, mais n'y est pas éligible.`, r.info.kind === "e" ? "Cet ETF ne remplit pas les conditions du PEA (75 % d'actions européennes ou réplication synthétique). Vérifiez dans quel compte il se trouve vraiment." : "Un PEA n'accepte que les actions d'entreprises dont le siège est dans l'Union européenne ou l'Espace économique européen. Vérifiez le compte indiqué pour cette ligne.", "pea"));
  const cto = R0.live.filter(r => r.l.env === "cto"), ctoPea = cto.filter(r => r.info.pea).reduce((a, r) => a + r.w, 0);
  if (ctoPea > 0.25 && !R0.live.some(r => r.l.env === "pea")) push("moyen", `${pct(ctoPea, 0, false)} de vos lignes sur compte-titres seraient éligibles au PEA.`, "En 2026, les gains d'un PEA de plus de 5 ans sont imposés à 18,6 % (prélèvements sociaux seuls), contre 31,4 % sur un compte-titres. Les versements d'un PEA sont plafonnés à 150 000 €.", "fiscalite");
  cto.filter(r => r.info.kind === "e" && /dist/i.test(r.info.e.distribution || "")).forEach(r => push("moyen", `${esc(r.info.name)} verse ses dividendes sur un compte-titres.`, "Chaque dividende reçu y est imposé l'année même. Un ETF capitalisant réinvestit les dividendes sans impôt tant que vous ne vendez pas.", "fiscalite"));
  if (F.heavy.length) { const fr = F.heavy.reduce((a, o) => a + o.f, 0) / F.heavy.reduce((a, o) => a + o.a, 0); push(fr > 0.02 ? "vig" : "moyen", `${F.heavy.length} achat${F.heavy.length > 1 ? "s ont" : " a"} coûté plus de 1 % en frais de courtage (${pct(fr, 1, false)} en moyenne).`, `Des frais fixes pèsent lourd sur un petit ordre : un achat de ${F0.format(median(F.heavy.map(o => o.a)))} € doit d'abord monter de ${pct(fr, 1, false)} pour couvrir ses frais. Regrouper ses achats, ou un plan d'investissement programmé à frais réduits, diminue ce poids.`, "frais"); }
  if (F.ter != null && F.ter > 0.004) push("moyen", `Vos ETF coûtent en moyenne ${pct(F.ter, 2, false)} par an.`, "Des ETF qui suivent les mêmes indices existent souvent à 0,10 ou 0,20 % par an. Sur 20 ans, 0,3 point de frais en plus peut représenter environ 6 % du capital final.", "frais");
  R0.live.filter(r => r.gainPct != null && r.gainPct < -0.3).forEach(r => push("moyen", `${esc(r.info.name)} est ${pct(-r.gainPct, 0, false)} sous votre prix de revient.`, "Une forte baisse est le moment de vérifier si les comptes ont changé, ou seulement le cours. Ce n'est ni un signal d'achat ni un signal de vente.", "baisse"));
  R0.live.filter(r => r.info.kind === "c").forEach(r => { const t = quick(r.info.c); if (t && t.vig >= 3) push("moyen", `${esc(r.info.name)} cumule ${t.vig} points de vigilance dans ses comptes.`, "Ce n'est pas une raison de vendre, mais une raison de lire sa fiche et de suivre ses prochains résultats.", "comptes"); });
  R0.rows.filter(r => r.pos.warn === "vente").forEach(r => push("vig", `${esc(r.info.name)} : une vente dépasse la quantité détenue.`, "Vérifiez les opérations de cette ligne : un achat manque peut-être.", "saisie"));
  const equity = R0.live.filter(r => !(r.info.kind === "e" && /obligations|monetaire/.test(r.info.cat))).reduce((a, r) => a + r.w, 0);
  const hz = cfg.horizon != null && cfg.horizon !== "" ? +cfg.horizon : prof && prof.ans && prof.ans.horizon === 0 ? 1 : null;
  if (hz != null && hz <= 1 && equity > 0.5) push("vig", `Vous avez indiqué un horizon de ${hz === 0 ? "moins de 2 ans" : "moins de 5 ans"}, et ${pct(equity, 0, false)} du portefeuille est en actions.`, "Sur quelques années, une baisse de 30 % ou plus est possible sans laisser le temps de remonter : en 2008, les grands indices ont mis plus de cinq ans à retrouver leur niveau.", "profil");
  if (prof && prof.ans) {
    if (prof.ans.precaution === 0) push("vig", "Vous avez indiqué ne pas avoir encore d'épargne de précaution.", "Sans réserve disponible sur un livret, un imprévu peut obliger à vendre au pire moment. La pratique courante est de garder 3 à 6 mois de dépenses de côté avant d'investir en Bourse.", "profil");
    if (prof.ans.baisse === 0 && equity > 0.6) push("moyen", `Vous avez indiqué que vous vendriez après une baisse de 30 %, avec ${pct(equity, 0, false)} en actions.`, "Vendre après une forte baisse transforme une perte temporaire en perte définitive. Une part d'actions plus faible rend les baisses plus faciles à traverser.", "profil");
  }
  if (T.noPx) push("info", `${T.noPx} ligne${T.noPx > 1 ? "s n'ont" : " n'a"} pas de cours sur le site.`, "Elle est valorisée au dernier prix connu (votre prix d'achat ou le cours saisi) : sa plus ou moins-value n'est pas calculée.", "donnees");
  const order = { vig: 0, moyen: 1, info: 2, fort: 3 };
  return W.sort((a, b) => order[a.lv] - order[b.lv]);
}

/* ---------- Lecture rédigée, calculée sur vos chiffres (instantanée, illimitée, sans serveur) ---------- */
function pf3Local(R0, X, S, F, D, A, P, prof) {
  const T = R0.T, out = [], cfg = P.cfg || {};
  const big = R0.live.slice().sort((a, b) => b.valE - a.valE), etfW = R0.live.filter(r => r.info.kind === "e").reduce((a, r) => a + r.w, 0);
  // En bref
  let s = `Votre portefeuille vaut ${pf3Eu(T.tot)} et compte ${T.n} ligne${T.n > 1 ? "s" : ""}`;
  s += etfW > 0.99 ? ", uniquement des ETF." : etfW > 0 ? `, dont ${pct(etfW, 0, false)} en ETF.` : ", uniquement des actions en direct.";
  if (T.gainPct != null) s += ` Par rapport à ce que vous avez payé (${pf3Eu(T.gainBase)}, frais compris), il est ${T.gain >= 0 ? "en hausse" : "en baisse"} de ${pct(Math.abs(T.gainPct), 1, false)}, soit ${pf3Sg(T.gain)} avant impôts.`;
  if (T.real) s += ` Vos ventes ont déjà dégagé ${pf3Sg(T.real)} de plus ou moins-value réalisée.`;
  out.push(["En bref", s]);
  // Ce qui ressort
  const r2 = [];
  if (S.score != null) r2.push(`Sa diversification est ${S.label} (${S.score} sur 100)${X.neff ? ` : une fois vos ETF ouverts, votre argent est réparti comme sur environ ${F0.format(X.neff)} entreprises de même poids` : ""}.`);
  // la plus grosse ligne et le premier pays sont déjà lus dans le bloc Diversification (jauges) : on ne les répète pas ici
  const fxW = Object.entries(X.cur || {}).filter(([k]) => k !== "EUR").reduce((a, [, w]) => a + w, 0);
  if (fxW > 0.2) r2.push(`Environ ${pct(fxW, 0, false)} de la valeur dépend d'autres devises que l'euro, même si vos titres sont cotés en euros.`);
  const envs = Object.keys(X.env || {}); if (envs.length && !(envs.length === 1 && envs[0] === "Compte non précisé")) r2.push(`Répartition par compte : ${Object.entries(X.env).sort((a, b) => b[1] - a[1]).map(([k, w]) => `${k} ${pct(w, 0, false)}`).join(", ")}.`);
  out.push(["Ce qui ressort", r2.join(" ")]);
  // Points d'attention
  const heavy = big.filter(r => r.info.kind !== "e" && r.w > 0.1), seen = new Set(), att = [];
  if (heavy.length > 1) att.push(`${heavy.length} actions pèsent chacune plus de 10 % : ${heavy.map(r => `${r.info.name} (${pct(r.w, 0, false)})`).join(", ")}.`);
  A.filter(a => (a.lv === "vig" || a.lv === "moyen") && !(heavy.length > 1 && a.tag === "concentration" && / pèse /.test(a.t))).forEach(a => { if (att.length < 3 && !seen.has(a.tag)) { seen.add(a.tag); att.push(pf3Plain(a.t)); } });
  out.push(["Points d'attention", att.length ? att.join(" ") + (A.filter(a => a.lv !== "info").length > 3 ? " D'autres remarques figurent dans la liste ci-dessous." : "") : "Aucune ligne ne dépasse les repères de concentration habituels, et les frais restent raisonnables. Cela ne dit rien des performances à venir."]);
  // Les frais
  const f = [];
  if (F.orders.length) f.push(`Vous avez payé ${pf3Eu(F.fromOrders, 2)} de frais de courtage sur ${F.orders.length} achat${F.orders.length > 1 ? "s" : ""}, soit ${pct(F.ratio, 2, false)} des montants investis.`);
  if (F.ter != null) f.push(`Vos ETF prélèvent en moyenne ${pct(F.ter, 2, false)} par an, environ ${pf3Eu(F.terE)} par an à la valeur actuelle.`);
  if (F.ten > 0) f.push(`Sur 10 ans, à valeur constante, l'ensemble représenterait environ ${pf3Eu(F.ten)}${F.yearSrc ? ` (courtage estimé d'après ${F.yearSrc})` : ""}.`);
  if (f.length) out.push(["Les frais", f.join(" ")]);
  // À suivre
  const nx = [];
  if (D.total > 0) nx.push(`Dividendes attendus sur douze mois : environ ${pf3Eu(D.total)} avant impôts, d'après les derniers dividendes versés par vos actions.`);
  const cos = R0.live.filter(r => r.info.kind === "c").map(r => r.info.c), ev = AG.events.filter(e => e.date >= TODAY && cos.some(c => c.id === e.id) && /sultat/i.test(e.type + e.label)).sort((a, b) => a.date.localeCompare(b.date))[0];
  if (ev) nx.push(`Prochains résultats : ${RBY[ev.id].name}, le ${dLabel(ev.date)}.`);
  const hz = cfg.horizon != null && cfg.horizon !== "" ? +cfg.horizon : null;
  if (hz == null && !prof) nx.push("Indiquez votre horizon de placement ci-dessus : l'analyse en tiendra compte.");
  if (nx.length) out.push(["À suivre", nx.join(" ")]);
  return out;
}
const pf3Plain = h => String(h).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const PF3_HEADS = /^(En bref|Ce qui ressort|Points d.attention|Les frais|À suivre|A suivre|En résumé|Ce que l.analyse remarque)\s*:?$/i;
function pf3Txt(txt) {
  const parts = Array.isArray(txt) ? txt.flatMap(([h, t]) => [h, t]) : String(txt).replace(/\*\*|#+ /g, "").split(/\n+/).map(x => x.trim()).filter(Boolean);
  return parts.map(p => PF3_HEADS.test(p.replace(/[«»]/g, "").trim()) ? `<p class="kick pf3h">${esc(p.replace(/[«»:]/g, "").trim())}</p>` : `<p>${esc(p)}</p>`).join("");
}
// Les faits transmis à l'IA qui rédige : uniquement des chiffres calculés ici
function pf3Faits(R0, X, S, F, D, A, P, prof) {
  const T = R0.T, cfg = P.cfg || {}, r1 = v => v == null || !isFinite(v) ? null : Math.round(v * 10) / 10, p1 = v => v == null || !isFinite(v) ? null : Math.round(v * 1000) / 10;
  const top = o => Object.entries(o || {}).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, w]) => [COUNTRY[k] || PF3_CURN[k] || k, p1(w)]);
  return { type: "portefeuille", date: TODAY, valeur_eur: Math.round(T.tot), investi_eur: Math.round(T.gainBase), plus_value_eur: Math.round(T.gain), plus_value_pct: p1(T.gainPct), plus_value_realisee_eur: Math.round(T.real), variation_jour_pct: p1(T.dayPct),
    lignes: R0.live.slice().sort((a, b) => b.valE - a.valE).slice(0, 15).map(r => ({ nom: r.info.name, type: r.info.type, compte: PF3_ENV[r.l.env] || null, poids_pct: p1(r.w), plus_value_pct: p1(r.gainPct), frais_annuels_pct: r.info.ter != null ? r.info.ter : undefined, eligible_pea: r.info.pea })),
    diversification: { score_sur_100: S.score, appreciation: S.label, nombre_reel_entreprises: X.neff ? Math.round(X.neff) : null, reperes: S.items.map(i => `${i.t} : ${pf3Plain(i.txt)}`) },
    premieres_expositions: (X.top || []).slice(0, 6).map(x => [x.name, p1(x.w)]), pays: top(X.ctry), devises: top(X.cur), secteurs: top(X.sect), comptes: top(X.env),
    chevauchements_etf: (X.overlaps || []).filter(o => o[2] > 30).map(([a, b, ov]) => `${a.name} et ${b.name} : ${Math.round(ov)} % en commun`),
    frais: { courtage_paye_eur: r1(F.fromOrders), courtage_pct_des_achats: p1(F.ratio), achats_de_plus_de_1pct_de_frais: F.heavy.length, taille_mediane_des_achats_eur: F.med ? Math.round(F.med) : null, frais_etf_pct_par_an: F.ter != null ? Math.round(F.ter * 10000) / 100 : null, frais_etf_eur_par_an: Math.round(F.terE), cout_10_ans_valeur_constante_eur: Math.round(F.ten), courtier_principal: F.mainB ? F.mainB.name : null },
    dividendes_12_mois_eur: Math.round(D.total), versement_mensuel_eur: +cfg.mensuel || null, achats_par_mois: +cfg.ordres || null,
    horizon: cfg.horizon != null && cfg.horizon !== "" ? (PF3_HORIZ.find(h => h[0] === String(cfg.horizon)) || [])[1] : null, profil_questionnaire: prof ? prof.titre : null,
    remarques: A.filter(a => a.lv !== "info").slice(0, 8).map(a => pf3Plain(a.t)) };
}

/* =====================================================================
   3. La page /portefeuille
   ===================================================================== */
function pf3P() { return PF3S.demo || pf2Load(); }
function pf3Save(P) { if (PF3S.demo) { PF3S.demo = PF3.migrate(P); PF3S.demo.dem = true; } else pf2Save(P); }
const pf3Num = v => { const n = PF3.num(v, ","); return n == null ? null : n; };
const pf3In = (id, label, val, attrs = "", suf = "") => `<label class="pf3f"><span>${label}</span><span class="pf3iw"><input id="${id}" type="text" inputmode="decimal" autocomplete="off" value="${esc(val == null ? "" : val)}" ${attrs}>${suf ? `<i>${suf}</i>` : ""}</span></label>`;
const pf3Fmt = v => v == null || !isFinite(v) ? "" : String(Math.round(v * 1e4) / 1e4).replace(".", ",");
const pf3Chips = (name, list, cur) => `<div class="pf3chips" role="radiogroup" data-g="${name}">${list.map(([v, l]) => `<button type="button" role="radio" aria-checked="${String(v) === String(cur)}" data-v="${v}" class="${String(v) === String(cur) ? "on" : ""}">${l}</button>`).join("")}</div>`;
const pf3BrSel = (id, cur) => `<label class="pf3f"><span>Courtier</span><select id="${id}"><option value="">Non précisé</option>${BROKERS.list.map(b => `<option value="${b.id}" ${b.id === cur ? "selected" : ""}>${esc(b.name)}</option>`).join("")}</select></label>`;
function pf3DraftLoad() { try { return JSON.parse(localStorage.getItem(PF3_DRAFT) || "null"); } catch (e) { return null; } }
function pf3DraftSave(f) { try { f ? localStorage.setItem(PF3_DRAFT, JSON.stringify(f)) : localStorage.removeItem(PF3_DRAFT); } catch (e) { } }
function pf3Undo(msg, prev) {
  toast(`${msg} <button type="button" class="pf3undo" id="pf3undo">Annuler</button>`);
  const b = $("#pf3undo"); if (b) b.onclick = () => { pf3Save(prev); pf3Draw(); const t = $("#toast"); if (t) t.classList.remove("on"); };
}

/* ---------- Recherche : nom, ticker ou ISIN ---------- */
let PF3_IDX = null;
function pf3Index() {
  if (PF3_IDX) return PF3_IDX;
  PF3_IDX = [...ETF.list.map(e => ({ k: "e:" + e.id, name: e.name, tick: e.ticker || "", isin: e.isin || "", type: "ETF", sub: e.index || "", pea: !!e.pea, n: norm(`${e.name} ${e.index || ""} ${e.issuer || ""}`), px: !!PX["e:" + e.id] })),
    ...R.companies.map(c => ({ k: "c:" + c.id, name: c.name, tick: c.ticker || "", isin: c.isin || "", type: "Action", sub: secName(c), pea: peaOk(c) === true, n: norm(c.name), px: !!PX["c:" + c.id] }))];
  return PF3_IDX;
}
function pf3Find(q) {
  const t = norm(q.trim()); if (t.length < 1) return [];
  const T = t.toUpperCase().replace(/\s/g, ""), out = [];
  for (const x of pf3Index()) {
    let s = 0;
    if (x.isin && x.isin === T) s = 120;
    else if (x.tick && x.tick.toUpperCase() === T) s = 110;
    else if (x.n === t) s = 100;
    else if (x.n.startsWith(t)) s = 80;
    else if (x.n.includes(" " + t)) s = 65;
    else if (t.length >= 2 && x.n.includes(t)) s = 45;
    else if (t.length >= 3 && x.isin && x.isin.startsWith(T)) s = 40;
    else if (t.length >= 3 && norm(x.sub).includes(t) && x.type === "ETF") s = 35;
    if (s) out.push([s + (x.px ? 4 : 0) - x.name.length / 100, x]);
  }
  return out.sort((a, b) => b[0] - a[0]).slice(0, 8).map(a => a[1]);
}
function pf3Search() {
  const q = $("#pfq"), box = $("#pfs"); if (!q) return;
  let hits = [], sel = -1;
  const close = () => { box.hidden = true; q.setAttribute("aria-expanded", "false"); sel = -1; };
  const paint = () => $$("[role=option]", box).forEach((b, i) => { b.classList.toggle("on", i === sel); b.setAttribute("aria-selected", i === sel); if (i === sel) { q.setAttribute("aria-activedescendant", b.id); b.scrollIntoView({ block: "nearest" }); } });
  const pick = i => { const x = hits[i]; if (!x) return; close(); q.value = ""; pf3FormOpen(x.k); };
  q.oninput = () => {
    const v = q.value.trim(); hits = pf3Find(v); sel = hits.length ? 0 : -1;
    if (!v) { close(); return; }
    const isin = v.toUpperCase().replace(/\s/g, "");
    const ext = /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(isin) && !hits.some(h => h.isin === isin);
    box.innerHTML = hits.map((x, i) => `<button type="button" role="option" id="pfs${i}" data-i="${i}" class="${i === sel ? "on" : ""}">${keyLogo(x.k, 32)}<span class="pf3sn"><b>${esc(x.name)}</b><small>${[x.tick, x.type === "ETF" ? x.sub : x.sub].filter(Boolean).map(esc).join(" · ")}</small></span><span class="pf3bd"><em class="t-${x.type === "ETF" ? "e" : "a"}">${x.type}</em>${x.pea ? `<em class="t-p">PEA</em>` : ""}</span></button>`).join("")
      + (ext ? `<button type="button" role="option" id="pfsx" data-x="${isin}"><span class="lg" style="--s:32px"><b>?</b></span><span class="pf3sn"><b>Ajouter ${isin}</b><small>Titre hors de la liste du site : suivi sans cours automatique</small></span></button>` : "")
      + (!hits.length && !ext ? `<div class="pf3none">Aucun titre trouvé pour « ${esc(v)} ». Essayez le nom de l'entreprise, son ticker (MC, AAPL) ou son code ISIN (12 caractères, sur l'appli de votre courtier).</div>` : "");
    box.hidden = false; q.setAttribute("aria-expanded", "true");
    $$("[data-i]", box).forEach(b => b.onclick = () => pick(+b.dataset.i));
    const xb = $("[data-x]", box); if (xb) xb.onclick = () => { close(); q.value = ""; pf3FormOpen("x:" + xb.dataset.x); };
  };
  q.onkeydown = e => {
    const n = $$("[role=option]", box).length;
    if (e.key === "ArrowDown" && n) { e.preventDefault(); sel = (sel + 1) % n; paint(); }
    else if (e.key === "ArrowUp" && n) { e.preventDefault(); sel = (sel - 1 + n) % n; paint(); }
    else if (e.key === "Enter") { e.preventDefault(); const b = $$("[role=option]", box)[sel]; if (b) b.click(); }
    else if (e.key === "Escape") close();
  };
  q.onfocus = () => { if (q.value.trim()) q.oninput(); };
  document.addEventListener("pointerdown", e => { if (!e.target.closest(".pf3add")) close(); });
}

/* ---------- Nouvelle ligne, en quatre étapes : le titre, la quantité, le prix payé, les frais ; le PRU se calcule en direct ---------- */
function pf3FormOpen(k) {
  const P = pf3P(), cfg = P.cfg || {}, last = P.l[P.l.length - 1] || {};
  PF3S.form = { k, mode: "buy", q: "", p: "", f: "", d: "", env: last.env || (["pea", "cto", "av"].includes(cfg.env) ? cfg.env : ""), br: last.br || cfg.courtier || "", nm: "" };
  pf3DraftSave(PF3S.form); pf3Form();
  const f = $("#pf3new"); if (f) { f.scrollIntoView({ block: "nearest", behavior: "smooth" }); const i = $("#pf3nnm") || $("#pf3nq"); if (i) setTimeout(() => i.focus({ preventScroll: true }), 60); }
}
function pf3FormCalc(F, P) { // ce que donnent les champs saisis : montant, frais, PRU, valeur
  const info = pf3Info({ k: F.k, nm: F.nm }), exist = P.l.find(l => l.k === F.k && (l.env || "") === (F.env || "") && (l.br || "") === (F.br || ""));
  const curQ = info.curQ || "EUR", cur = exist ? (exist.cur || curQ) : (F.cur || "EUR"), toCur = cur === "EUR" ? 1 : 1 / (pf3E(1, cur) || 1);
  const q = pf3Num(F.q), p = pf3Num(F.p), b = F.br && BROKERS.list.find(x => x.id === F.br);
  const amt = q > 0 && p > 0 ? q * p : null;
  let f = F.mode === "pru" ? 0 : pf3Num(F.f), fAuto = false;
  if (F.mode !== "pru" && f == null) { f = amt && b ? brokerFee(b, pf3E(amt, cur) || amt, (P.cfg || {}).perso) * toCur : 0; fAuto = !!(amt && b); }
  const pru = amt ? (F.mode === "pru" ? p : (amt + f) / q) : null;
  const pos = exist ? PF3.linePos(exist) : null;
  const npos = exist && amt && F.mode !== "pru" ? PF3.position([...(exist.o && exist.o.length ? exist.o : exist.q > 0 ? [["", "r", exist.q, exist.pru, 0]] : []), [F.d || TODAY, "a", q, p, f]]) : null;
  const vE = info.px && q > 0 ? pf3E(q * info.px.p, info.px.cur) : null, cE = amt ? pf3E(F.mode === "pru" ? amt : amt + f, cur) : null;
  return { info, exist, curQ, cur, C: CUR[cur] || cur, q, p, f, fAuto, b, amt, pru, pos, npos, vE, cE };
}
function pf3Form() {
  const box = $("#pf3form"); if (!box) return;
  const F = PF3S.form; if (!F || !F.k) { box.innerHTML = ""; return; }
  const P = pf3P(), X = pf3FormCalc(F, P), info = X.info, l0 = { k: F.k, nm: F.nm }, pxSame = info.px && info.px.cur === X.cur;
  const step = (n, body) => `<li class="pf3st"><span class="pf3sn2" aria-hidden="true">${n}</span><div>${body}</div></li>`;
  box.innerHTML = `<div class="pf3new" id="pf3new" role="group" aria-label="Nouvelle ligne">
    <ol class="pf3steps">
      ${step(1, `<div class="pf3nh">${pf3Logo(l0, 40)}<div><b>${esc(info.name || "Nouveau titre")}</b><small>${[info.ticker, info.type, info.isin, info.px ? "cours actuel " + pf3Px(info.px.p, info.px.cur) : info.kind === "x" ? "pas de cours sur le site" : "cours indisponible"].filter(Boolean).map(esc).join(" · ")}</small></div><button type="button" class="pf3x" id="pf3nx" aria-label="Annuler">×</button></div>
        ${info.kind === "x" ? `<label class="pf3f"><span>Nom du titre</span><span class="pf3iw"><input id="pf3nnm" type="text" value="${esc(F.nm || "")}" placeholder="ex. iShares Core MSCI World"></span></label>` : ""}`)}
      ${step(2, `${pf3In("pf3nq", "Nombre de parts", F.q, 'placeholder="ex. 12"')}<small class="pf3sh">Pour une fraction de part (plan d'investissement), écrivez par exemple 0,5.</small>`)}
      ${step(3, `${pf3In("pf3np", F.mode === "pru" ? "Prix de revient unitaire (PRU) affiché par votre courtier" : "Prix payé par part", F.p, `placeholder="${pxSame ? "ex. " + pf3Fmt(info.px.p) : "ex. 85,40"}"`, X.C)}
        <small class="pf3sh">${F.mode === "pru" ? "Le PRU inclut déjà les frais d'achat." : `Le cours auquel l'achat a été exécuté. Si vous avez acheté en plusieurs fois, indiquez le prix moyen.${pxSame && !F.p ? ` <button type="button" class="linkbtn" id="pf3usepx">Utiliser le cours actuel (${pf3Px(info.px.p, info.px.cur)})</button>` : ""}`}</small>
        ${X.curQ !== "EUR" && !X.exist ? `<div class="pf3cur"><span>Prix en</span>${pf3Chips("cur", [["EUR", "euros"], [X.curQ, CUR[X.curQ] === "$" ? "dollars" : X.curQ]], X.cur)}<small>Le cours de ${esc(info.name)} est en ${esc(X.curQ)}. Choisissez la devise affichée par votre courtier.</small></div>` : ""}`)}
      ${F.mode === "pru" ? "" : step(4, `<div class="pf3grid pf3g2" style="margin-top:0">${pf3In("pf3nf", "Frais de courtage", F.f, `placeholder="${X.fAuto ? pf3Fmt(Math.round(X.f * 100) / 100) : "0"}"`, X.C)}${pf3BrSel("pf3nbr", F.br)}</div>
        <small class="pf3sh">${X.fAuto ? `Calculés selon la grille de ${esc(X.b.name)} : ${pf3Eu(pf3E(X.f, X.cur), 2)}. Modifiez si votre relevé indique autre chose.` : X.b ? "Saisissez d'abord la quantité et le prix : les frais seront calculés selon la grille du courtier." : "Choisissez votre courtier : les frais seront calculés selon sa grille. Ou saisissez-les (0 si aucun)."}</small>`)}
    </ol>
    <div class="pf3pru" id="pf3nprev" aria-live="polite"></div>
    <div class="pf3opt"><div class="pf3f"><span>Compte</span>${pf3Chips("env", [["pea", "PEA"], ["cto", "Compte-titres"], ["av", "Assurance-vie"]], F.env)}</div>
      ${F.mode === "pru" ? pf3BrSel("pf3nbr", F.br) : `<label class="pf3f"><span>Date de l'achat (facultatif)</span><span class="pf3iw"><input id="pf3nd" type="date" value="${esc(F.d || "")}" max="${TODAY}"></span></label>`}</div>
    <p class="pf3hint">${F.mode === "pru" ? `<button type="button" class="linkbtn" id="pf3nmode">Revenir à la saisie du prix payé et des frais</button>` : `Votre courtier affiche déjà un PRU ? <button type="button" class="linkbtn" id="pf3nmode">Saisissez-le directement</button>.`}</p>
    <div class="pf3btns"><button type="button" class="btn" id="pf3nok">${X.exist ? "Ajouter cet achat à la ligne" : "Ajouter au portefeuille"}</button><button type="button" class="linkbtn" id="pf3nno">Annuler</button></div></div>`;
  const read = () => { const g = id => { const el = $("#" + id); return el ? el.value : undefined; };
    for (const [id, k] of [["pf3nq", "q"], ["pf3np", "p"], ["pf3nf", "f"], ["pf3nd", "d"], ["pf3nnm", "nm"], ["pf3nbr", "br"]]) { const v = g(id); if (v !== undefined) F[k] = v; }
    F.cur = pf3FormCalc(F, P).cur; };
  const prev = () => {
    read(); pf3DraftSave(F);
    const Y = pf3FormCalc(F, pf3P()), el = $("#pf3nprev"), msgs = [];
    const nb = v => nf(v % 1 ? 4 : 0).format(v), fees = $("#pf3nf"); if (fees && Y.fAuto) fees.placeholder = pf3Fmt(Math.round(Y.f * 100) / 100);
    if (Y.pru) {
      const calc = F.mode === "pru" ? `${nb(Y.q)} parts × ${pf3Px(Y.p, Y.cur)}` : `(${nb(Y.q)} × ${pf3Px(Y.p, Y.cur)} + ${nf(2).format(Y.f)} ${Y.C} de frais) ÷ ${nb(Y.q)}`;
      el.innerHTML = `<div class="pf3pk"><span class="kick">Votre prix de revient unitaire (PRU)</span><b>${pf3Px(Y.npos ? Y.npos.pru : Y.pru, Y.cur)}</b></div>
        <p class="pf3pd"><b>PRU</b> : ce qu'une part vous a coûté en moyenne, frais d'achat compris. ${Y.npos ? `Avec vos ${nb(Y.pos.q)} parts déjà détenues à ${pf3Px(Y.pos.pru, Y.cur)}, votre PRU devient ${pf3Px(Y.npos.pru, Y.cur)} pour ${nb(Y.npos.q)} parts.` : F.mode === "pru" ? `Montant investi : ${calc} = ${pf3Eu(Y.cE, 2)}.` : `Ici : ${calc} = <b>${pf3Px(Y.pru, Y.cur)}</b> par part.`}</p>
        <div class="pf3pv"><span>Montant investi<b>${pf3Eu(Y.cE, 2)}</b></span>${Y.vE ? `<span>Valeur actuelle<b>${pf3Eu(Y.vE)}</b></span><span>Plus ou moins-value latente<b class="${pf3Cls(Y.vE - Y.cE)}">${pf3Sg(Y.vE - Y.cE)} (${pf3Pc(Y.vE / Y.cE - 1)})</b></span>` : ""}</div>`;
      if (Y.vE && Math.abs(Y.vE / Y.cE - 1) > 0.6) msgs.push(`<span class="pf3warn">Écart important avec le cours actuel : vérifiez le prix${Y.curQ !== "EUR" ? " et sa devise" : ""}.</span>`);
      if (F.mode !== "pru" && Y.amt && Y.f / Y.amt > 0.01) msgs.push(`<span class="pf3warn">Les frais représentent ${pct(Y.f / Y.amt, 1, false)} de cet achat : le placement doit monter d'autant pour les couvrir.</span>`);
    } else el.innerHTML = `<div class="pf3pk"><span class="kick">Votre prix de revient unitaire (PRU)</span><b class="light">–</b></div><p class="pf3pd"><b>PRU</b> : ce qu'une part vous a coûté en moyenne, frais d'achat compris. Exemple : 10 parts à 50 € + 2 € de frais = 50,20 € par part. Il se calcule dès que vous indiquez la quantité et le prix.</p>`;
    if (F.env === "pea" && Y.info.pea === false) msgs.push(`<span class="pf3warn">${esc(Y.info.name)} n'est pas éligible au PEA${Y.info.kind === "c" ? " (siège hors de l'Union européenne)" : ""}.</span>`);
    if (Y.exist && F.mode === "pru") msgs.push(`Vous avez déjà cette ligne sur ce compte : sa quantité et son PRU seront remplacés.`);
    if (!Y.exist && pfFullQuiet(pf3P())) msgs.push(`<span class="pf3warn">La version gratuite suit jusqu'à ${FREE.pf} positions actives : <a class="lnk" href="/premium">Premium</a> les suit sans limite.</span>`);
    if (msgs.length) el.insertAdjacentHTML("beforeend", msgs.map(m => `<p class="pf3pm">${m}</p>`).join(""));
  };
  $$(".pf3new input, .pf3new select", box).forEach(i => { i.oninput = prev; i.onchange = i.tagName === "SELECT" ? () => { read(); pf3DraftSave(F); pf3Form(); } : prev; i.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); $("#pf3nok").click(); } }; });
  $$(".pf3new .pf3chips", box).forEach(g => g.onclick = e => { const b = e.target.closest("button"); if (!b) return; read(); F[g.dataset.g] = g.dataset.g === "env" && F.env === b.dataset.v ? "" : b.dataset.v; pf3DraftSave(F); pf3Form(); });
  const up = $("#pf3usepx"); if (up) up.onclick = () => { $("#pf3np").value = pf3Fmt(info.px.p); prev(); up.remove(); };
  $("#pf3nmode").onclick = () => { read(); F.mode = F.mode === "pru" ? "buy" : "pru"; pf3DraftSave(F); pf3Form(); };
  $("#pf3nx").onclick = $("#pf3nno").onclick = () => { PF3S.form = null; pf3DraftSave(null); pf3Form(); };
  $("#pf3nok").onclick = () => { read(); pf3FormSubmit(); };
  prev();
}
function pfFullQuiet(P) { return !isPrem() && P.l.filter(pf3IsActive).length >= FREE.pf; }
// La limite gratuite porte sur les positions actives (les lignes entièrement vendues ne comptent pas).
function pfFull(P) { if (isPrem() || P.l.filter(pf3IsActive).length < FREE.pf) return false; toast(`La version gratuite suit jusqu'à ${FREE.pf} positions actives. <a href="/premium">Premium</a> les suit sans limite.`); return true; }
function pf3FormSubmit() {
  const F = PF3S.form, P = pf3P(), prev = JSON.parse(JSON.stringify(P)), X = pf3FormCalc(F, P), el = $("#pf3nprev");
  const err = m => { el.insertAdjacentHTML("afterbegin", `<p class="pf3err">${m}</p>`); };
  $$(".pf3err", el).forEach(x => x.remove());
  if (F.k.startsWith("x:") && !(F.nm || "").trim()) return err("Indiquez le nom du titre.");
  if (!(X.q > 0)) return err("Étape 2 : indiquez le nombre de parts (par exemple 12, ou 0,5 pour une fraction).");
  if (!(X.p > 0)) return err(F.mode === "pru" ? "Étape 3 : indiquez le PRU affiché par votre courtier." : "Étape 3 : indiquez le prix payé par part.");
  let line = X.exist;
  if (F.mode === "pru" && line && line.o && line.o.length) return err(`Cette ligne a déjà ${line.o.length} opération${line.o.length > 1 ? "s" : ""} : saisissez le prix payé et les frais, ou ouvrez la ligne dans la liste pour la modifier.`);
  if (!line && pfFull(P)) return;
  const isNew = !line;
  if (isNew) { line = { k: F.k, cur: X.cur }; if (F.env) line.env = F.env; if (F.br) line.br = F.br; if (F.k.startsWith("x:")) { line.nm = F.nm.trim(); if (/^x:[A-Z0-9]{12}$/.test(F.k)) line.isin = F.k.slice(2); } }
  if (F.mode === "pru") { delete line.o; line.q = X.q; line.pru = X.p; line.cur = X.cur; }
  else { if (!line.o) line.o = line.q > 0 && line.pru > 0 ? [["", "r", line.q, line.pru, 0]] : []; line.cur = X.cur; line.o.push([F.d || "", "a", X.q, X.p, Math.round(X.f * 100) / 100]); }
  PF3.syncLine(line);
  if (isNew) P.l.push(line);
  if (F.br) { P.cfg = P.cfg || {}; P.cfg.courtier = P.cfg.courtier || F.br; }
  pf3Save(P); PF3S.form = null; pf3DraftSave(null); PF3S.open = -1; pf3Draw();
  pf3Undo(`${esc(X.info.name || F.nm)} ${isNew ? "ajouté" : "mis à jour"} : PRU ${pf3Px(line.pru, line.cur)}.`, prev);
}

/* ---------- Les notions, définies en une phrase avec un exemple chiffré (vos chiffres quand ils existent) ---------- */
function pf3Defs(R0) {
  const T = R0.T, r = R0.live.slice().sort((a, b) => b.valE - a.valE).find(x => x.price && x.price.src === "cours" && !x.mOnly) || null;
  const e = R0.live.filter(x => x.info.kind === "e" && x.info.ter)[0] || null, nb = v => nf(v % 1 ? 2 : 0).format(v);
  return [
    ["valeur", "Valeur actuelle", "Ce que vaudraient vos titres si vous les vendiez au cours du jour.", r ? `${r.info.name} : ${nb(r.pos.q)} parts × ${pf3Px(r.price.p, r.price.cur)} = ${pf3Eu(r.valE)}.` : "10 parts cotées 55 € valent 550 €."],
    ["investi", "Montant investi", "Ce que vous avez payé pour les titres que vous détenez encore, frais d'achat compris.", r ? `${r.info.name} : ${nb(r.pos.q)} parts × ${pf3Px(r.pos.pru, r.lcur)} de PRU = ${pf3Eu(r.costE)}.` : "10 parts à 50 € + 2 € de frais = 502 € investis."],
    ["pru", "Prix de revient unitaire (PRU)", "Ce qu'une part vous a coûté en moyenne, frais d'achat compris.", "10 parts à 50 € + 2 € de frais = 50,20 € par part. Une vente ne change pas le PRU des parts restantes."],
    ["latente", "Plus ou moins-value latente", "Le gain ou la perte si vous vendiez aujourd'hui, avant impôts : valeur actuelle moins montant investi.", r && r.gainE != null ? `${r.info.name} : ${pf3Eu(r.valE)} − ${pf3Eu(r.costE)} = ${pf3Sg(r.gainE)} (${pf3Pc(r.gainPct)}).` : "550 € de valeur − 502 € investis = +48 €, soit +9,6 %."],
    ["poids", "Poids", "La part d'une ligne dans la valeur totale du portefeuille.", r && T.tot ? `${r.info.name} : ${pf3Eu(r.valE)} ÷ ${pf3Eu(T.tot)} = ${pct(r.w, 0, false)}.` : "Une ligne de 550 € dans un portefeuille de 2 200 € pèse 25 %."],
    ["ter", "Frais courants d'un ETF", "Ce que l'ETF prélève chaque année sur votre argent, directement dans son cours.", e ? `${e.info.name} : ${pct(e.info.ter / 100, 2, false)} de ${pf3Eu(e.valE)} = ${pf3Eu(e.valE * e.info.ter / 100, 2)} par an.` : "0,20 % par an sur 1 000 € = 2 € par an."],
  ];
}
if (typeof ALL === "object" && ALL) {
  Object.assign(ALL, {
    pf_pru: { name: "Prix de revient unitaire (PRU)", what: "Ce qu'une part vous a coûté en moyenne, frais d'achat compris.", calc: "(somme des montants achetés + frais d'achat) ÷ nombre de parts. Exemple : 10 parts à 50 € + 2 € de frais = 50,20 € par part.", read: "Au-dessus du PRU, la ligne est en plus-value ; en dessous, en moins-value. Une vente ne change pas le PRU des parts restantes." },
    pf_latente: { name: "Plus ou moins-value latente", what: "Le gain ou la perte si vous vendiez aujourd'hui, avant impôts.", calc: "valeur actuelle − montant investi. Exemple : 550 € − 502 € = +48 €.", read: "« Latente » : tant que vous ne vendez pas, ce gain ou cette perte n'est pas réalisé." },
    pf_poids: { name: "Poids d'une ligne", what: "La part d'une ligne dans la valeur totale du portefeuille.", calc: "valeur de la ligne ÷ valeur totale. Exemple : 550 € ÷ 2 200 € = 25 %.", read: "Beaucoup d'investisseurs limitent une action seule à 5 ou 10 % du portefeuille." },
    pf_valeur: { name: "Valeur actuelle", what: "Ce que vaudraient vos titres si vous les vendiez au cours du jour.", calc: "nombre de parts × cours. Exemple : 10 parts × 55 € = 550 €.", read: "Les cours sont différés : la valeur exacte au moment d'une vente peut différer un peu." },
    pf_investi: { name: "Montant investi", what: "Ce que vous avez payé pour les titres que vous détenez encore, frais d'achat compris.", calc: "nombre de parts × PRU. Exemple : 10 parts × 50,20 € = 502 €.", read: "Il sert de base au calcul de la plus ou moins-value." },
  });
}

/* ---------- Les lignes : tableau sur ordinateur, cartes sur téléphone ---------- */
function pf3List(R0, P) {
  const box = $("#pf3list"); if (!box) return;
  if (!P.l.length) { box.innerHTML = pf3Empty(); pf3EmptyBind(); return; }
  const live = R0.rows.filter(r => !r.closed).sort((a, b) => (b.valE || 0) - (a.valE || 0)), closed = R0.rows.filter(r => r.closed);
  const row = r => {
    const i = r.info, l = r.l, open = PF3S.open === r.i, g = r.gainE, sub = [l.env ? PF3_ENVS[l.env] : "", l.br ? (BROKERS.list.find(b => b.id === l.br) || {}).name || "" : ""].filter(Boolean).join(" · ").replace(/ \(.*\)/, "");
    const pxTxt = r.price ? pf3Px(r.price.p, r.price.cur) : "–", pxNote = !r.price ? "" : r.price.src === "cours" ? (i.px && i.px.chg != null ? `<small class="${pf3Cls(i.px.chg)}">${pf3Pc(i.px.chg / 100, 2)}</small>` : "") : `<small class="light">${r.price.src === "saisi" ? "cours saisi" : "sans cours"}</small>`;
    const gain = r.mOnly ? `<span class="light">montant seul</span>` : g == null ? `<span class="light">–</span>` : `<b class="${pf3Cls(g)}">${pf3Sg(g)}</b><small class="${pf3Cls(g)}">${pf3Pc(r.gainPct)}</small>`;
    const qty = r.mOnly ? "–" : nf(r.pos.q % 1 ? (r.pos.q < 10 ? 4 : 2) : 0).format(r.pos.q);
    return `<div class="pf3r${open ? " open" : ""}" data-i="${r.i}">
      <button type="button" class="pf3rb" aria-expanded="${open}" aria-controls="pf3d${r.i}">
        <span class="pf3n">${pf3Logo(l, 34)}<span><b>${esc(i.name)}</b><small>${esc(sub || i.type)}${i.kind === "e" ? ` · <span class="pf3tag">ETF</span>` : ""}${r.pos.warn ? ` · <span class="pf3warn">à vérifier</span>` : ""}</small></span></span>
        <span class="pf3c c-q">${qty}</span><span class="pf3c c-pru">${r.mOnly ? "–" : pf3Px(r.pos.pru, r.lcur)}</span><span class="pf3c c-px">${pxTxt}${pxNote}</span>
        <span class="pf3c c-v"><b>${pf3Eu(r.valE)}</b><small class="pf3mq">${r.mOnly ? "montant investi" : `${qty} × ${pxTxt}`}</small></span><span class="pf3c c-g">${gain}</span><span class="pf3c c-w">${pct(r.w, r.w < 0.1 ? 1 : 0, false)}<i class="pf3wb"><i style="width:${Math.round(r.w * 100)}%"></i></i></span>
        <span class="pf3chev" aria-hidden="true"></span></button>
      <div class="pf3det" id="pf3d${r.i}" ${open ? "" : "hidden"}>${open ? pf3Det(r, P) : ""}</div></div>`;
  };
  box.innerHTML = `<div class="pf3l"><div class="pf3hd"><span>Ligne</span><span>Quantité</span><span>${def("pf_pru", "PRU")}</span><span>Cours</span><span>${def("pf_valeur", "Valeur")}</span><span>${def("pf_latente", "Plus ou moins-value")}</span><span>${def("pf_poids", "Poids")}</span><span></span></div>${live.map(row).join("")}</div>
    ${closed.length ? `<details class="pf3closed"><summary>${closed.length} ligne${closed.length > 1 ? "s" : ""} entièrement vendue${closed.length > 1 ? "s" : ""}</summary><div class="pf3l">${closed.map(row).join("")}</div></details>` : ""}`;
  $$(".pf3rb", box).forEach(b => b.onclick = () => { const i = +b.closest(".pf3r").dataset.i; PF3S.open = PF3S.open === i ? -1 : i; PF3S.op = null; pf3List(pf3Rows(pf3P()), pf3P()); if (PF3S.open >= 0) { const d = $("#pf3d" + i); if (d) d.scrollIntoView({ block: "nearest", behavior: "smooth" }); } });
  if (PF3S.open >= 0) pf3DetBind(R0.rows.find(r => r.i === PF3S.open), P);
}
function pf3Empty() {
  const f = favs().filter(k => k.startsWith("c:") ? RBY[k.slice(2)] : ETFBY[k.slice(2)]).slice(0, 6);
  return `<div class="pf3empty"><div class="pf3e1"><p class="kick">Pour commencer</p><h3>Ajoutez votre première ligne</h3>
    <ol><li>Tapez le nom, le ticker ou le code ISIN d'une action ou d'un ETF dans le champ ci-dessus.</li><li>Indiquez combien de parts vous détenez et leur prix moyen, par exemple <b>12 parts à 85,40 €</b>.</li><li>Le site calcule la valeur, la plus ou moins-value, les frais, les dividendes et la diversification.</li></ol>
    <div class="pf3btns"><button type="button" class="btn" id="pf3eimp">Importer le fichier de mon courtier</button><button type="button" class="linkbtn" id="pf3edemo">Voir un exemple rempli</button></div></div>
    <div class="pf3e2" aria-hidden="true"><p class="kick">Exemple</p><div class="pf3ex"><span class="lg" style="--s:30px"><b>AP</b></span><span><b>Amundi PEA Monde</b><small>PEA · 12 parts · PRU 85,40 €</small></span></div><div class="pf3ex"><span class="lg" style="--s:30px"><b>TE</b></span><span><b>TotalEnergies</b><small>Compte-titres · 20 parts · PRU 57,85 €</small></span></div></div></div>
    ${f.length ? `<div class="pf3fav"><span class="light">Depuis vos favoris :</span>${f.map(k => `<button type="button" class="pf3pick" data-k="${k}">${keyLogo(k, 22)}${esc(keyName(k))}</button>`).join("")}</div>` : ""}`;
}
function pf3EmptyBind() {
  const i = $("#pf3eimp"); if (i) i.onclick = () => pf3ImpOpen();
  const d = $("#pf3edemo"); if (d) d.onclick = () => { PF3S.demo = pf3Demo(); PF3S.open = -1; pf3Draw(); window.scrollTo({ top: 0, behavior: "smooth" }); };
  $$(".pf3pick").forEach(b => b.onclick = () => pf3FormOpen(b.dataset.k));
}
function pf3Demo() {
  const ex = [["e:amundi-msci-world-pea", "pea", "trade-republic", [["2025-03-03", "a", 120, 5.42, 1], ["2025-09-01", "a", 80, 5.71, 1], ["2026-03-02", "a", 60, 6.02, 1]]], ["c:totalenergies", "pea", "boursobank", [["2025-06-10", "a", 20, 57.85, 1.99]]], ["c:air-liquide", "pea", "boursobank", [["2025-11-04", "a", 4, 160.1, 1.99]]], ["e:amundi-sp500-pea", "pea", "trade-republic", [["2025-04-01", "a", 15, 44.2, 1]]], ["c:apple", "cto", "trade-republic", [["2025-05-12", "a", 3, 178.4, 1]]]];
  return PF3.migrate({ v: 3, dem: true, cfg: { courtier: "trade-republic", mensuel: "150", ordres: "1" }, l: ex.filter(([k]) => k.startsWith("c:") ? RBY[k.slice(2)] : ETFBY[k.slice(2)]).map(([k, env, br, o]) => ({ k, env, br, cur: "EUR", o })) });
}

/* ---------- Le détail d'une ligne : opérations, compte, courtier ---------- */
function pf3Det(r, P) {
  const l = r.l, i = r.info, pos = r.pos, hasOps = !!(l.o && l.o.length), cur = r.lcur, C = CUR[cur] || cur;
  const T = { a: "Achat", v: "Vente", d: "Dividende", r: "Position reprise", s: "Division (titres ajoutés)" };
  const facts = [["Quantité", r.mOnly ? "–" : nf(pos.q % 1 ? 4 : 0).format(pos.q)], [def("pf_pru", "Prix de revient (PRU)"), r.mOnly ? "–" : pf3Px(pos.pru, cur), "frais d'achat inclus"], [def("pf_investi", "Montant investi"), pf3Eu(r.costE, 2), r.fxApprox ? "converti au taux du jour" : ""], [def("pf_valeur", "Valeur actuelle"), pf3Eu(r.valE, 2), r.price && r.price.src !== "cours" ? "au dernier prix connu" : ""],
    [def("pf_latente", "Plus ou moins-value latente"), r.gainE == null ? "–" : `<span class="${pf3Cls(r.gainE)}">${pf3Sg(r.gainE, 2)} (${pf3Pc(r.gainPct)})</span>`, r.local != null && r.lcur !== "EUR" ? `${pf3Pc(r.local)} en ${cur}` : ""],
    ...(r.realE ? [["Plus-value réalisée", `<span class="${pf3Cls(r.realE)}">${pf3Sg(r.realE, 2)}</span>`, "sur vos ventes"]] : []), ...(r.feesE ? [["Frais de courtage payés", pf3Eu(r.feesE, 2), pos.bought ? pct(pos.fees / pos.bought, 2, false) + " des achats" : ""]] : []), ...(r.divsE ? [["Dividendes reçus", pf3Eu(r.divsE, 2), ""]] : [])];
  const op = PF3S.op;
  return `<div class="pf3facts">${facts.map(([k, v, s]) => `<div><span>${k}</span><b>${v}</b>${s ? `<small>${s}</small>` : ""}</div>`).join("")}</div>
    <div class="pf3grid pf3g2 pf3set"><div class="pf3f"><span>Compte</span>${pf3Chips("lenv", [["pea", "PEA"], ["cto", "Compte-titres"], ["av", "Assurance-vie"]], l.env || "")}</div>${pf3BrSel("pf3lbr", l.br || "")}</div>
    ${l.env === "pea" && i.pea === false ? `<p class="pf3warn">${esc(i.name)} n'est pas éligible au PEA : vérifiez le compte de cette ligne.</p>` : ""}
    ${hasOps ? `<div class="pf3ops"><p class="kick">Opérations</p><div class="scroll-x"><table class="t pf3ot"><thead><tr><th class="l">Date</th><th class="l">Opération</th><th>Quantité</th><th>Prix</th><th>Frais</th><th>Montant</th><th></th></tr></thead><tbody>
      ${l.o.map((o, j) => [o, j]).sort((a, b) => (b[0][0] || "").localeCompare(a[0][0] || "")).map(([o, j]) => `<tr class="${o[1] === "d" ? "pf3od" : ""}"><td class="l">${o[0] ? dLabel(o[0]) : "–"}${o[6] === "p" ? ` <span class="pf3pgm" title="Achat programmé : prix relevé le jour de l'ajout, pas celui de cette date">programmé</span>` : ""}</td><td class="l">${T[o[1] === "r" && o[0] && !o[3] ? "s" : o[1]]}</td><td class="num">${o[1] === "d" ? "–" : nf(o[2] % 1 ? 4 : 0).format(o[2])}</td><td class="num">${o[1] === "d" ? "–" : pf3Px(o[3], cur)}</td><td class="num">${o[4] ? nf(2).format(o[4]) + " " + C : "–"}</td><td class="num">${nf(2).format(o[1] === "d" ? o[3] * (o[2] || 1) : o[2] * o[3] + (o[1] === "a" ? o[4] : -o[4])) + " " + C}</td><td><button type="button" class="pf3del" data-op="${j}" aria-label="Supprimer cette opération">×</button></td></tr>`).join("")}</tbody></table></div></div>`
    : r.mOnly ? `<div class="pf3grid">${pf3In("pf3lq", "Nombre de parts", "", 'placeholder="12"')}${pf3In("pf3lpru", "Prix de revient unitaire", "", "", C)}</div><p class="pf3hint">Cette ligne n'a qu'un montant investi (${pf3Eu(l.m)}). Indiquez le nombre de parts et le PRU pour suivre sa valeur et sa plus-value.</p><div class="pf3btns"><button type="button" class="btn" id="pf3lsave">Enregistrer</button></div>`
    : `<div class="pf3grid">${pf3In("pf3lq", "Nombre de parts", pf3Fmt(l.q))}${pf3In("pf3lpru", "Prix de revient unitaire (PRU)", pf3Fmt(l.pru), "", C)}</div><div class="pf3btns"><button type="button" class="btn" id="pf3lsave">Enregistrer</button><span class="pf3saved light" id="pf3lmsg" aria-live="polite"></span></div>`}
    ${op ? pf3OpForm(r, op) : `<div class="pf3btns pf3addop"><button type="button" class="pf3opb" data-add="a">+ Achat</button><button type="button" class="pf3opb" data-add="v" ${pos.q > 0 ? "" : "disabled"}>+ Vente</button><button type="button" class="pf3opb" data-add="d">+ Dividende reçu</button>${!hasOps && !r.mOnly ? `<span class="pf3hint" style="margin:0">Ajouter une opération détaille la ligne : le PRU sera recalculé à chaque achat.</span>` : ""}</div>`}
    ${!i.px ? `<div class="pf3grid">${pf3In("pf3lpx", "Cours actuel (facultatif)", pf3Fmt(l.px), 'placeholder="à saisir"', C)}</div><p class="pf3hint">Le site n'a pas de cours pour ce titre. Sans cours saisi, la ligne est valorisée à votre dernier prix d'achat.</p>` : ""}
    <div class="pf3foot">${i.href ? `<a class="more" href="${i.href}">Voir la fiche de ${esc(i.name)} →</a>` : "<span></span>"}<button type="button" class="pf3rm" id="pf3lrm">Retirer cette ligne</button></div>`;
}
function pf3OpForm(r, t) {
  const i = r.info, cur = r.lcur, C = CUR[cur] || cur, px = i.px && i.px.cur === cur ? pf3Fmt(i.px.p) : "";
  return `<div class="pf3opf" id="pf3opf"><p class="kick">${t === "a" ? "Nouvel achat" : t === "v" ? "Nouvelle vente" : "Dividende reçu"}</p><div class="pf3grid">
    <label class="pf3f"><span>Date</span><span class="pf3iw"><input id="pf3od" type="date" value="${TODAY}" max="${TODAY}"></span></label>
    ${t === "d" ? pf3In("pf3op", "Montant reçu (net)", "", 'placeholder="0,00"', C) : pf3In("pf3oq", "Quantité", "", `placeholder="${t === "v" ? nf(0).format(r.pos.q) : "10"}"`) + pf3In("pf3op", "Prix unitaire", px, "", C) + pf3In("pf3of", "Frais", "", `placeholder="${r.l.br ? "auto" : "0"}"`, "€")}</div>
    <p class="pf3hint" id="pf3omsg">${t === "v" ? "La vente ne change pas le PRU des parts restantes : elle dégage une plus ou moins-value réalisée." : t === "a" ? "Le PRU sera recalculé : prix moyen pondéré, frais d'achat inclus." : "Montant effectivement versé sur votre compte, après impôts éventuels."}</p>
    <div class="pf3btns"><button type="button" class="btn" id="pf3ook">Enregistrer</button><button type="button" class="linkbtn" id="pf3ono">Annuler</button></div></div>`;
}
function pf3DetBind(r, P) {
  if (!r) return;
  const box = $("#pf3d" + r.i), l = P.l[r.i]; if (!box || !l) return;
  const commit = msg => { PF3.syncLine(l); pf3Save(P); pf3Draw(); if (msg) toast(msg); };
  $$(".pf3chips[data-g=lenv] button", box).forEach(b => b.onclick = () => { const v = b.dataset.v; if (l.env === v) delete l.env; else l.env = v; commit(); });
  const br = $("#pf3lbr", box); if (br) br.onchange = () => { if (br.value) l.br = br.value; else delete l.br; commit(); };
  const sv = $("#pf3lsave", box); if (sv) sv.onclick = () => { const q = pf3Num($("#pf3lq").value), pru = pf3Num($("#pf3lpru").value);
    if (!(q > 0) || !(pru > 0)) { const m = $("#pf3lmsg") || $(".pf3hint", box); if (m) m.innerHTML = `<span class="pf3err">Indiquez une quantité et un PRU supérieurs à zéro.</span>`; return; }
    const prev = JSON.parse(JSON.stringify(P)); l.q = q; l.pru = pru; delete l.m; commit(); pf3Undo("Ligne mise à jour.", prev); };
  $$("#pf3lq, #pf3lpru", box).forEach(i => i.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); sv && sv.click(); } });
  const px = $("#pf3lpx", box); if (px) px.onchange = () => { const v = pf3Num(px.value); if (v > 0) l.px = v; else delete l.px; commit(); };
  $$("[data-add]", box).forEach(b => b.onclick = () => { PF3S.op = b.dataset.add; pf3List(pf3Rows(P), P); const f = $("#pf3oq") || $("#pf3op"); if (f) f.focus(); });
  $$("[data-op]", box).forEach(b => b.onclick = () => { const prev = JSON.parse(JSON.stringify(P)); l.o.splice(+b.dataset.op, 1); if (!l.o.length) { delete l.o; l.q = 0; l.pru = 0; } if (!l.o && !l.m) P.l.splice(r.i, 1), PF3S.open = -1; commit(); pf3Undo("Opération supprimée.", prev); });
  const rm = $("#pf3lrm", box); if (rm) rm.onclick = () => { const prev = JSON.parse(JSON.stringify(P)); P.l.splice(r.i, 1); PF3S.open = -1; pf3Save(P); pf3Draw(); pf3Undo(`${esc(r.info.name)} retiré du portefeuille.`, prev); };
  const of = $("#pf3opf", box);
  if (of) {
    const t = PF3S.op, b = l.br && BROKERS.list.find(x => x.id === l.br), cur = r.lcur;
    const upd = () => { if (t === "d") return; const q = pf3Num($("#pf3oq").value), p = pf3Num($("#pf3op").value), m = $("#pf3omsg");
      if (q > 0 && p > 0 && b && pf3Num($("#pf3of").value) == null) { const f = brokerFee(b, pf3E(q * p, cur) || q * p, (P.cfg || {}).perso); m.innerHTML = `Frais estimés chez ${esc(b.name)} : <b>${pf3Eu(f, 2)}</b>, soit ${pct(f / (pf3E(q * p, cur) || q * p), 2, false)} du montant.`; }
      if (t === "v" && q > r.pos.q + 1e-9) m.innerHTML = `<span class="pf3warn">Vous ne détenez que ${nf(r.pos.q % 1 ? 4 : 0).format(r.pos.q)} parts.</span>`; };
    $$("input", of).forEach(i => { i.oninput = upd; i.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); $("#pf3ook").click(); } }; });
    $("#pf3ono").onclick = () => { PF3S.op = null; pf3List(pf3Rows(P), P); };
    $("#pf3ook").onclick = () => {
      const d = $("#pf3od").value || TODAY, m = $("#pf3omsg"), prev = JSON.parse(JSON.stringify(P));
      if (!l.o) l.o = l.q > 0 && l.pru > 0 ? [["", "r", l.q, l.pru, 0]] : [];
      if (!l.cur) l.cur = cur;
      if (t === "d") { const v = pf3Num($("#pf3op").value); if (!(v > 0)) { m.innerHTML = `<span class="pf3err">Indiquez le montant reçu.</span>`; return; } l.o.push([d, "d", 1, v, 0]); }
      else { const q = pf3Num($("#pf3oq").value), p = pf3Num($("#pf3op").value); let f = pf3Num($("#pf3of").value);
        if (!(q > 0) || !(p > 0)) { m.innerHTML = `<span class="pf3err">Indiquez la quantité et le prix unitaire.</span>`; return; }
        if (t === "v" && q > r.pos.q + 1e-9) { m.innerHTML = `<span class="pf3err">Vous ne détenez que ${nf(r.pos.q % 1 ? 4 : 0).format(r.pos.q)} parts.</span>`; return; }
        if (f == null) f = b ? brokerFee(b, pf3E(q * p, cur) || q * p, (P.cfg || {}).perso) / (cur === "EUR" ? 1 : (pf3E(1, cur) || 1)) : 0;
        l.o.push([d, t, q, p, Math.round(f * 100) / 100]); }
      PF3S.op = null; commit(); pf3Undo(t === "a" ? "Achat enregistré, PRU recalculé." : t === "v" ? "Vente enregistrée." : "Dividende enregistré.", prev);
    };
  }
}

/* ---------- Petits graphiques SVG ---------- */
function pf3Donut(parts, center = "", sub = "") {
  const r = 58, C = 2 * Math.PI * r, tot = parts.reduce((a, p) => a + p.w, 0) || 1; let off = 0;
  const segs = parts.map(p => { const len = p.w / tot * C, gap = parts.length > 1 ? Math.min(2, len / 3) : 0;
    const s = `<circle cx="80" cy="80" r="${r}" fill="none" stroke="${p.c}" stroke-width="24" stroke-dasharray="${Math.max(0, len - gap).toFixed(2)} ${(C - Math.max(0, len - gap)).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 80 80)" tabindex="0" ${tipAttr({ h: p.label, r: [["Part", pct(p.w / tot, 1, false), p.c], ...(p.v != null ? [["Valeur", pf3Eu(p.v), ""]] : [])] })}/>`; off += len; return s; }).join("");
  return `<svg class="pf3don" viewBox="0 0 160 160" role="img" aria-label="${esc(parts.map(p => `${p.label} ${pct(p.w / tot, 0, false)}`).join(", "))}">${segs}<text x="80" y="78" text-anchor="middle" class="pf3dc">${esc(center)}</text><text x="80" y="96" text-anchor="middle" class="pf3ds">${esc(sub)}</text></svg>`;
}
function pf3Legend(parts, tot) {
  return `<div class="pf3leg">${parts.map(p => `<div class="pf3lr">${p.href ? `<a href="${p.href}">` : "<span>"}<i style="background:${p.c}"></i><span class="pf3ll">${esc(p.label)}</span>${p.href ? "</a>" : "</span>"}<b>${pct(p.w, p.w < 0.1 ? 1 : 0, false)}</b>${tot ? `<small>${pf3Eu(p.w * tot)}</small>` : ""}</div>`).join("")}</div>`;
}
function pf3Parts(obj, max = 7, labelOf = k => k) {
  const e = Object.entries(obj).filter(([, w]) => w > 0.0005).sort((a, b) => b[1] - a[1]);
  const other = /^(Autres|Non détaillé|Non renseigné.*|Compte non précisé|Autres devises)$/;
  const main = e.filter(([k]) => !other.test(k)), rest = e.filter(([k]) => other.test(k));
  const head = main.slice(0, max), tail = [...main.slice(max), ...rest], tw = tail.reduce((a, [, w]) => a + w, 0);
  return [...head.map(([k, w], i) => ({ label: labelOf(k), w, c: PF3_PAL[i % PF3_PAL.length] })), ...(tw > 0.0005 ? [{ label: tail.length === 1 ? labelOf(tail[0][0]) : "Autres", w: tw, c: PF3_OTHER }] : [])];
}
function pf3Months(D) {
  const mob = matchMedia("(max-width:760px)").matches, vals = D.months.map(m => D.per[m]), all = [...vals, D.undated], max = Math.max(...all, 1e-9), W = mob ? 400 : 900, H = mob ? 150 : 180, bw = W / 13;
  const bars = all.map((v, i) => { const h = Math.max(v > 0 ? 3 : 0, v / max * (H - 46)), x = i * bw + 6, lab = i < 12 ? MOIS[+D.months[i].slice(5) - 1] : mob ? "?" : "sans date";
    return `<g ${tipAttr({ h: i < 12 ? `${MOISL[+D.months[i].slice(5) - 1]} ${D.months[i].slice(0, 4)}` : "Date non annoncée", r: [["Estimation", pf3Eu(v), i < 12 ? INK : SAND]] })} tabindex="0"><rect x="${x}" y="${H - 24 - h}" width="${bw - 12}" height="${h}" rx="3" fill="${i < 12 ? "var(--ink)" : SAND}"/>${v > 0 ? `<text x="${x + (bw - 12) / 2}" y="${H - 30 - h}" text-anchor="middle" class="pf3bv">${F0.format(v)} €</text>` : ""}<text x="${x + (bw - 12) / 2}" y="${H - 8}" text-anchor="middle" class="pf3bl">${lab}</text><rect x="${i * bw}" y="0" width="${bw}" height="${H}" fill="transparent"/></g>`; }).join("");
  return `<div class="scroll-x"><svg class="pf3bars" viewBox="0 0 ${W} ${H}" role="img" aria-label="Dividendes estimés par mois">${bars}<line x1="0" x2="${W}" y1="${H - 24}" y2="${H - 24}" stroke="var(--line)"/></svg></div>`;
}
function pf3FeeChart(F) {
  const b = F.mainB; if (!b) return "";
  const mob = matchMedia("(max-width:760px)").matches, W = mob ? 400 : 900, H = mob ? 190 : 230, pl = 44, pr = 12, pt = 14, pb = 30, xs = mob ? [25, 100, 500, 1000, 5000] : [25, 50, 100, 200, 500, 1000, 2000, 5000];
  const X = a => pl + (Math.log(a) - Math.log(25)) / (Math.log(5000) - Math.log(25)) * (W - pl - pr);
  const pts = []; for (let a = 25; a <= 5000; a *= 1.06) pts.push([a, brokerFee(b, a) / a]);
  const ords = F.orders.filter(o => o.a >= 25 && o.a <= 5000), ymax = Math.min(0.08, Math.max(0.012, ...pts.map(p => p[1]).filter(v => v < 0.08), ...ords.map(o => o.f / o.a))) * 1.1;
  const Y = v => pt + (1 - Math.min(v, ymax) / ymax) * (H - pt - pb);
  const yt = [0, 0.005, 0.01, 0.02, 0.04, 0.06].filter(v => v <= ymax);
  const path = pts.map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1)).join("");
  return `<div class="chart2"><div class="lg2"><span><i class="ln" style="background:var(--ink)"></i>Frais chez ${esc(b.name)} selon le montant de l'ordre</span>${ords.length ? `<span><i style="background:var(--o);border-radius:50%"></i>Vos achats</span>` : ""}</div>
    <div class="scroll-x"><svg class="pf3fc" viewBox="0 0 ${W} ${H}" role="img" aria-label="Frais de courtage en pourcentage selon la taille de l'ordre">
    <rect x="${pl}" y="${Y(ymax)}" width="${W - pl - pr}" height="${Y(0.01) - Y(ymax)}" fill="#FBEDE8" opacity=".7"/><text x="${W - pr - 4}" y="${Y(ymax) + 12}" text-anchor="end" class="pf3bl" fill="#B23A1E">plus de 1 % : frais lourds</text>
    ${yt.map(v => `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="${GRIDC}"/><text x="${pl - 6}" y="${Y(v) + 4}" text-anchor="end" class="pf3bl">${F1.format(v * 100).replace(",0", "")} %</text>`).join("")}
    ${xs.map(a => `<text x="${X(a)}" y="${H - 10}" text-anchor="middle" class="pf3bl">${a >= 1000 ? a / 1000 + " k€" : a + " €"}</text>`).join("")}
    <path d="${path}" fill="none" stroke="var(--ink)" stroke-width="2"/>
    ${ords.map(o => `<circle cx="${X(o.a).toFixed(1)}" cy="${Y(o.f / o.a).toFixed(1)}" r="5" fill="var(--o)" stroke="#fff" stroke-width="1.5" tabindex="0" ${tipAttr({ h: o.name, r: [["Montant", pf3Eu(o.a, 2), ""], ["Frais", `${pf3Eu(o.f, 2)} (${pct(o.f / o.a, 2, false)})`, ""], ...(o.d ? [["Date", dLabel(o.d), ""]] : [])] })}/>`).join("")}
    </svg></div></div>`;
}

function pf3DefsOpen() { try { return localStorage.getItem("bilan.portefeuille.defs") === "1"; } catch (e) { return false; } } // fermé par défaut : les définitions s'ouvrent à la demande
/* ---------- Haut de page : la valeur, le gain, la journée ---------- */
function pf3Hero(R0, P) {
  const el = $("#pf3hero"); if (!el) return;
  const T = R0.T;
  if (!P.l.length) { el.hidden = true; return; }
  el.hidden = false;
  const upd = PXUP && PXUP !== "none" ? (/T/.test(PXUP) ? `cours du ${dLabel(PXUP.slice(0, 10))} à ${PXUP.slice(11, 16).replace(":", " h ")} (UTC)` : `cours du ${dLabel(PXUP)}`) : "cours indisponibles";
  const parts = R0.live.slice().sort((a, b) => b.valE - a.valE).map((r, i) => ({ label: r.info.name, w: r.w, c: i < PF3_PAL.length ? PF3_PAL[i] : PF3_OTHER, v: r.valE }));
  el.innerHTML = `${P.dem ? `<div class="pf3demo"><b>Exemple</b> : ce portefeuille fictif montre ce que calcule la page. Rien n'est enregistré. <button type="button" class="linkbtn" id="pf3dkeep">Partir de cet exemple</button> · <button type="button" class="linkbtn" id="pf3dquit">Revenir à mon portefeuille</button></div>` : ""}
    <div class="pf3k"><div class="pf3k1"><span class="kick">Valeur actuelle</span><b class="pf3big">${pf3Eu(T.tot)}</b><small>${T.n > 1 ? `vos ${T.n} lignes` : "votre ligne"} au ${upd}</small></div>
      <div><span class="kick">Montant investi</span><b>${pf3Eu(T.cost)}</b><small>ce que vous avez payé, frais d'achat compris</small></div>
      <div><span class="kick">Plus ou moins-value latente</span><b class="${pf3Cls(T.gain)}">${T.gainPct == null ? "–" : pf3Sg(T.gain)}</b><small><span class="${pf3Cls(T.gain)}">${T.gainPct == null ? "pas de cours" : pf3Pc(T.gainPct)}</span> si vous vendiez aujourd'hui, avant impôts</small></div>
      <div><span class="kick">Aujourd'hui</span><b class="${pf3Cls(T.day)}">${T.dayN ? pf3Sg(T.day) : "–"}</b><small><span class="${pf3Cls(T.day)}">${T.dayPct != null ? pf3Pc(T.dayPct, 2) : "variation inconnue"}</span> depuis la clôture d'hier</small></div></div>
    <div class="pf3verd" id="pf3verd"></div>
    ${parts.length > 1 ? `<div class="pf3stk" role="img" aria-label="Poids de chaque ligne">${parts.map(p => `<span style="width:${(p.w * 100).toFixed(2)}%;background:${p.c}" tabindex="0" ${tipAttr({ h: p.label, r: [["Poids", pct(p.w, 1, false), p.c], ["Valeur", pf3Eu(p.v), ""]] })}></span>`).join("")}</div>` : ""}
    <details class="pf3defs" id="pf3defs" ${pf3DefsOpen() ? "open" : ""}><summary>Comprendre ces chiffres</summary><div class="pf3dg">${pf3Defs(R0).map(([k, t, d, ex]) => `<div><b>${t}</b><p>${d}</p><p class="pf3dx"><span>Exemple</span> ${esc(ex)}</p></div>`).join("")}</div></details>
    ${T.real || T.divs ? `<p class="pf3kn">${T.real ? `Plus ou moins-value réalisée sur vos ventes : <b class="${pf3Cls(T.real)}">${pf3Sg(T.real)}</b>. ` : ""}${T.divs ? `Dividendes reçus enregistrés : <b>${pf3Eu(T.divs)}</b>.` : ""}</p>` : ""}`;
  const k = $("#pf3dkeep"); if (k) k.onclick = () => { const D = PF3S.demo; PF3S.demo = null; const cur = pf2Load(); if (cur.l.length && !confirm("Remplacer votre portefeuille actuel par l'exemple ?")) return; delete D.dem; pf2Save(D); pf3Draw(); };
  const q = $("#pf3dquit"); if (q) q.onclick = () => { PF3S.demo = null; pf3Draw(); };
  const dd = $("#pf3defs"); if (dd) dd.ontoggle = () => { try { localStorage.setItem("bilan.portefeuille.defs", dd.open ? "1" : "0"); } catch (e) { } };
}

/* ---------- Tableau de bord : analyse, répartition, diversification, frais, dividendes ---------- */
let PF3_TOKEN = 0;
async function pf3Dash(R0, P) {
  const el = $("#pf3dash"); if (!el) return;
  const tok = ++PF3_TOKEN;
  if (!R0.live.length) { el.innerHTML = ""; return; }
  if (!el.innerHTML) el.innerHTML = `<section class="panel"><div class="pb muted">Calcul de la répartition…</div></section>`;
  const [X, prof] = await Promise.all([pf3Look(R0.rows), profilInvestisseur().catch(() => null)]);
  if (tok !== PF3_TOKEN) return;
  const S = pf3Score(X), F = pf3Fees(R0, P), D = pf3Divs(R0), A = pf3Alerts(R0, X, F, P, prof), cfg = P.cfg || {};
  PF3S.ctx = { R0, X, S, F, D, A, P, prof };
  const vd = $("#pf3verd"); if (vd) { const att = A.filter(a => a.lv === "vig").length + A.filter(a => a.lv === "moyen").length;
    vd.innerHTML = [S.score != null ? `<a href="#pf3-diversification"><span class="dot dot-${S.score >= 75 ? "fort" : S.score >= 50 ? "moyen" : "vig"}"></span>Diversification ${S.label} <b>${S.score}/100</b></a>` : "",
      F.ter != null || F.orders.length ? `<a href="#pf3-frais"><span class="dot dot-${(F.ter || 0) > 0.004 || F.heavy.length ? "vig" : "fort"}"></span>Frais ${F.ter != null ? `des ETF <b>${pct(F.ter, 2, false)}/an</b>` : `de courtage <b>${pct(F.ratio, 2, false)}</b>`}</a>` : "",
      D.total > 0 ? `<a href="#pf3-dividendes"><span class="dot dot-fort"></span>Dividendes attendus <b>≈ ${pf3Eu(D.total)}/an</b></a>` : "",
      `<a href="#pf3-alertes"><span class="dot dot-${att ? "moyen" : "fort"}"></span>${att ? `<b>${att}</b> point${att > 1 ? "s" : ""} d'attention` : "Aucun point d'attention"}</a>`].filter(Boolean).join("");
    $$("a", vd).forEach(a => a.onclick = e => { e.preventDefault(); const t = document.getElementById(a.getAttribute("href").slice(1)); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); }); }
  const loc = pf3Local(R0, X, S, F, D, A, P, prof).filter(([h]) => h === "En bref" || h === "Ce qui ressort"); // le verdict seulement : frais, dividendes et remarques ont chacun leur bloc plus bas, inutile de les répéter ici
  const nAtt = A.filter(a => a.lv !== "info").length;
  const VIEWS = [["ligne", "Lignes"], ["sect", "Secteurs"], ["ctry", "Pays"], ["cur", "Devises"], ["type", "Types"], ["env", "Comptes"]];
  const cos = R0.live.filter(r => r.info.kind === "c").map(r => r.info.c), up = AG.events.filter(e => e.date >= TODAY && cos.some(c => c.id === e.id)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
  const bestB = F.med && BROKERS.list.length ? BROKERS.list.filter(b => !b.custom).map(b => ({ b, f: brokerFee(b, F.med) })).sort((a, z) => a.f - z.f) : [];
  el.innerHTML = `
  <section class="panel pf3ia" id="pf3-analyse"><div class="ph"><h2>L'analyse de votre portefeuille</h2><span class="pf3bdg">Calculée sur vos chiffres</span></div>
    <div class="pb"><div class="pf3par"><div class="pf3f"><span>Votre horizon</span>${pf3Chips("hz", PF3_HORIZ, cfg.horizon != null ? cfg.horizon : "")}</div>
      ${pf3In("pf3cm", "Versement par mois", cfg.mensuel || "", 'placeholder="150"', "€")}${pf3In("pf3co", "Achats par mois", cfg.ordres || "", 'placeholder="1"')}${pf3BrSel("pf3cb", cfg.courtier || "")}</div>
      ${prof ? `<p class="pf3hint">Votre profil du questionnaire : <b>${esc(prof.titre)}</b>. Il est pris en compte.</p>` : `<p class="pf3hint">Pour une analyse plus complète, répondez aux <a class="lnk" href="/apprendre#profil">5 questions du profil</a> (horizon, épargne de précaution, réaction aux baisses).</p>`}
      <div class="pf3loc" id="pf3loc">${pf3Txt(loc.slice(0, 3))}${loc.length > 3 ? `<div id="pf3locm" hidden>${pf3Txt(loc.slice(3))}</div><button type="button" class="linkbtn" id="pf3locb">Lire la suite : ${loc.slice(3).map(x => x[0].toLowerCase()).join(", ")}</button>` : ""}</div>
      <div class="pf3go"><button type="button" class="btn pf3gob" id="pf3go">✦ Expliquer mon portefeuille</button><span class="light">${miaConnectee() ? `L'IA du site rédige une explication à partir de ces calculs, sans rien ajouter. Les chiffres de vos lignes lui sont envoyés, sans votre nom.` : `<a class="lnk" href="/espace/ia">L'IA du site</a> n'est pas disponible pour le moment : elle rédige d'habitude une explication à partir de ces calculs.`}</span></div>
      <div id="pf3iab" aria-live="polite"></div>
      <p class="pf3disc">Information, pas conseil : cette analyse décrit votre portefeuille avec des repères généraux. Elle ne tient pas compte de toute votre situation et ne recommande ni achat ni vente.</p></div></section>
  <section class="panel" id="pf3-alertes"><div class="ph"><h2>Points d'attention</h2><span class="light" style="font-size:12.5px">${nAtt ? `${nAtt} remarque${nAtt > 1 ? "s" : ""}` : "aucune remarque"}</span></div><div class="pb">
    ${(A.length ? A : [{ lv: "fort", t: "Rien de particulier à signaler.", why: "Pas de ligne trop lourde, pas de secteur dominant, des frais raisonnables. Cela ne dit rien des performances futures." }]).map((a, i) => `<div class="gf pf3gf${i >= 5 ? " pf3more" : ""}" ${i >= 5 ? "hidden" : ""}><span class="dot dot-${a.lv === "info" ? "moyen" : a.lv}"></span><div><b>${a.t}</b><p>${a.why}</p></div></div>`).join("")}
    ${A.length > 5 ? `<button type="button" class="linkbtn" id="pf3amore">${A.length - 5 > 1 ? `Voir les ${A.length - 5} autres remarques` : "Voir l'autre remarque"}</button>` : ""}
    <p class="note">Repères généraux calculés sur vos lignes, pas des conseils personnalisés.</p></div></section>
  <section class="panel" id="pf3-repartition"><div class="ph"><h2>Répartition</h2><label class="pf3tog"><input type="checkbox" id="pf3lt" ${PF3S.lt ? "checked" : ""}> Ouvrir les ETF</label></div>
    <div class="filters pf3views" role="tablist">${VIEWS.map(([k, l]) => `<button type="button" role="tab" aria-selected="${PF3S.view === k}" data-v="${k}" class="${PF3S.view === k ? "on" : ""}">${l}</button>`).join("")}</div>
    <div class="pb" id="pf3rep"></div></section>
  <div class="two" id="pf3-diversification"><section class="panel"><div class="ph"><h2>Diversification</h2></div><div class="pb">
      ${S.score != null ? `<div class="pf3sc"><div class="pf3ring" style="--p:${S.score}"><b>${S.score}</b><small>sur 100</small></div><div><p class="pf3scl">Diversification <b>${S.label}</b></p><p class="muted">Ce score mesure seulement la dispersion de votre argent, une fois les ETF ouverts. Il ne juge ni la qualité des placements ni leur risque.</p></div></div>
      ${S.items.map(it => `<div class="pf3crit"><div class="pf3ct"><span class="dot dot-${it.zone}"></span><b>${it.t}</b><span class="num">${it.txt}</span></div><div class="pf3zone"><i style="left:${Math.round((1 - it.s) * 100)}%"></i></div><p>${it.rep} ${it.why}</p></div>`).join("")}` : `<p class="muted">Pas assez de données.</p>`}
      ${X.noComp.length ? `<p class="note">Composition non disponible pour ${X.noComp.map(r => esc(r.info.name)).join(", ")} : ${X.noComp.length > 1 ? "ces lignes comptent" : "cette ligne compte"} comme un seul bloc.</p>` : ""}</div></section>
    <section class="panel"><div class="ph"><h2>Ce que vous possédez vraiment</h2></div><div class="pb">${hbars(X.top.slice(0, 12).map(x => ({ label: x.name, v: x.w, href: x.href })), v => pct(v, v < 0.01 ? 2 : 1, false))}
      <p class="note">Vos ETF sont « ouverts » : chaque entreprise qu'ils contiennent est comptée selon son poids, et additionnée à vos actions en direct.${X.comps.length ? (d => ` Compositions publiées par des fonds équivalents (même indice)${d ? `, au ${esc(d)}` : ""}.`)(X.comps.map(c => c[1].asOf).filter(Boolean).sort()[0]) : ""}</p></div></section></div>
  <section class="panel" id="pf3-frais"><div class="ph"><h2>Les frais</h2></div>
    <div class="tiles"><div class="tile"><span class="kick">Courtage payé</span><span class="v">${F.orders.length ? pf3Eu(F.fromOrders, 2) : "–"}</span><small>${F.orders.length ? `${pct(F.ratio, 2, false)} de ${pf3Eu(F.bought)} achetés, ${F.orders.length} achat${F.orders.length > 1 ? "s" : ""}` : "ajoutez vos achats datés pour le calculer"}</small></div>
      <div class="tile"><span class="kick">Frais des ETF</span><span class="v">${F.ter != null ? pct(F.ter, 2, false) : "–"}</span><small>${F.ter != null ? `par an en moyenne pondérée, soit ${pf3Eu(F.terE)} par an` : "aucun ETF"}</small></div>
      <div class="tile"><span class="kick">Coût sur 10 ans</span><span class="v">${F.ten > 0 ? "≈ " + pf3Eu(F.ten) : "–"}</span><small>à valeur constante : frais des ETF${F.yearBrok != null ? " et courtage au rythme actuel" : ""}</small></div></div>
    <div class="pb">${F.mainB ? pf3FeeChart(F) : `<p class="muted">Indiquez votre courtier (dans l'analyse ci-dessus ou sur chaque ligne) pour voir le poids de ses frais selon la taille de vos ordres.</p>`}
      ${bestB.length ? `<details class="pf3cmp"><summary>Ce que coûterait un ordre de ${F0.format(F.med)} € chez les courtiers suivis</summary><div class="pf3bk">${bestB.map(({ b, f }) => `<div class="${F.mainB && b.id === F.mainB.id ? "on" : ""}"><span>${esc(b.name)}</span><b>${pf3Eu(f, 2)}</b><small>${pct(f / F.med, 2, false)}</small></div>`).join("")}</div><p class="note">${brokerSrc()} Offre de base, actions françaises ; d'autres frais peuvent s'ajouter (change, places étrangères).</p></details>` : ""}
      <p class="note">${F.yearSrc ? `Courtage annuel estimé d'après ${esc(F.yearSrc)} : ${pf3Eu(F.yearBrok)}. ` : ""}Coût sur 10 ans : frais annuels × 10, sans hypothèse de rendement. Les frais des ETF sont prélevés dans leur cours : vous ne les voyez pas sur votre relevé.</p></div></section>
  <section class="panel" id="pf3-dividendes"><div class="ph"><h2>Dividendes attendus sur 12 mois</h2></div>
    <div class="tiles"><div class="tile"><span class="kick">Estimation</span><span class="v">${pf3Eu(D.total)}</span><small>avant impôts, actions en direct</small></div><div class="tile"><span class="kick">Rendement</span><span class="v">${D.yld != null ? pct(D.yld, 2, false) : "–"}</span><small>de la valeur totale du portefeuille</small></div></div>
    <div class="pb">${D.total > 0 ? pf3Months(D) : ""}
      ${D.lines.length ? `<div class="scroll-x"><table class="t pf3dt"><thead><tr><th class="l">Ligne</th><th>Dernier dividende</th><th>Estimation 12 mois</th><th class="l">Prochaine date</th></tr></thead><tbody>${D.lines.map(x => `<tr><td class="l">${esc(x.r.info.name)}</td><td class="num">${x.etf ? (x.dist ? "distribue" : "capitalise") : x.dps ? pf3Px(x.dps, x.cur) + " par action" + (x.dpsEst ? " (estimé)" : "") : "–"}</td><td class="num">${x.etf ? (x.dist ? "non estimé" : "réinvestis") : x.est ? pf3Eu(x.est) : "–"}</td><td class="l">${x.next ? `${dLabel(x.next.date)} · ${esc(x.next.label)}` : x.etf ? "" : x.est ? "non annoncée" : esc(x.why || "")}</td></tr>`).join("")}</tbody></table></div>` : ""}
      <p class="note">Estimation : dernier dividende annuel publié dans les comptes (rapporté au cours du jour), multiplié par votre nombre de titres. Les mois viennent des dates annoncées par les entreprises (<a class="lnk" href="/dividendes">calendrier des dividendes</a>) ; sans date annoncée, le montant est compté à part. Un ETF capitalisant réinvestit ses dividendes ; pour un ETF distribuant, le site n'a pas encore le montant. Ce n'est pas une prévision : une entreprise peut réduire son dividende.</p></div></section>
  <div class="two"><section class="panel"><div class="ph"><h2>Prochaines dates de vos entreprises</h2></div>${up.length ? agendaHTML(up, true) : `<div class="pb muted">Aucune date annoncée pour vos actions en direct.</div>`}</section>
    <section class="panel"><div class="ph"><h2>Partager anonymement</h2></div><div class="pb" style="font-size:14px;line-height:1.55"><p style="margin-top:0">Ajoutez la composition de votre portefeuille (les lignes et leur poids, jamais les montants) au <a class="lnk" href="/communaute?onglet=portefeuilles">classement des visiteurs</a>.</p><button type="button" class="btn" id="pfsh" ${P.dem ? "disabled" : ""}>Partager anonymement</button> <button type="button" class="linkbtn" id="pfun">Retirer mon partage</button> <span class="muted" id="pfsm" style="font-size:12.5px"></span></div></section></div>`;
  pf3Rep(X, R0);
  // Paramètres de l'analyse
  const setCfg = (k, v) => { const Q = pf3P(); Q.cfg = { ...(Q.cfg || {}) }; if (v === "" || v == null) delete Q.cfg[k]; else Q.cfg[k] = String(v); pf3Save(Q); pf3Dash(pf3Rows(Q), Q); };
  $$(".pf3chips[data-g=hz] button", el).forEach(b => b.onclick = () => setCfg("horizon", cfg.horizon === b.dataset.v ? "" : b.dataset.v));
  [["#pf3cm", "mensuel"], ["#pf3co", "ordres"]].forEach(([id, k]) => { const i = $(id, el); i.onchange = () => { const v = pf3Num(i.value); setCfg(k, v > 0 ? v : ""); }; });
  $("#pf3cb", el).onchange = e => setCfg("courtier", e.target.value);
  $$(".pf3views button", el).forEach(b => b.onclick = () => { PF3S.view = b.dataset.v; $$(".pf3views button", el).forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", x === b); }); pf3Rep(X, R0); });
  $("#pf3lt", el).onchange = e => { PF3S.lt = e.target.checked; pf3Rep(X, R0); };
  const am = $("#pf3amore", el); if (am) am.onclick = () => { $$(".pf3more", el).forEach(x => x.hidden = false); am.remove(); };
  $("#pf3go", el).onclick = () => pf3Explain();
  const lb = $("#pf3locb", el); if (lb) lb.onclick = () => { $("#pf3locm").hidden = false; lb.remove(); };
  const sh = $("#pfsh"); if (sh) sh.onclick = () => post("/api/communaute/portefeuille", { lignes: R0.live.filter(r => !r.l.k.startsWith("x:")).map(r => [r.l.k, r.w]) }).then(j => { $("#pfsm").textContent = j.error || "Partagé, merci."; }).catch(() => { $("#pfsm").textContent = "Indisponible pour le moment."; });
  $("#pfun").onclick = () => post("/api/communaute/portefeuille", { retirer: true }).then(() => { $("#pfsm").textContent = "Partage retiré."; }).catch(() => { });
  if (PF3S.ia && PF3S.ia.key === JSON.stringify(pf3Faits(R0, X, S, F, D, A, P, prof))) $("#pf3iab").innerHTML = PF3S.ia.html;
}
function pf3Rep(X, R0) {
  const box = $("#pf3rep"); if (!box) return;
  const v = PF3S.view, tot = R0.T.tot;
  let obj, lab = k => k, note = "";
  const raw = () => { const o = { sect: {}, ctry: {}, cur: {} }; R0.live.forEach(r => { const i = r.info, w = r.w;
    if (i.kind === "c") { o.sect[i.sector] = (o.sect[i.sector] || 0) + w; o.ctry[i.country || "Autres"] = (o.ctry[i.country || "Autres"] || 0) + w; o.cur[i.curQ] = (o.cur[i.curQ] || 0) + w; }
    else { const k = i.kind === "e" ? "ETF " + (ECAT[i.cat] || "") : "Autres"; o.sect[k] = (o.sect[k] || 0) + w; o.ctry[k] = (o.ctry[k] || 0) + w; o.cur[i.curQ || "EUR"] = (o.cur[i.curQ || "EUR"] || 0) + w; } }); return o; };
  if (v === "ligne") { const parts = X.line.slice().sort((a, b) => b.w - a.w).map((x, i) => ({ label: x.label, w: x.w, c: i < 9 ? PF3_PAL[i] : PF3_OTHER, href: x.k.startsWith("x:") ? null : keyHref(x.k) }));
    const head = parts.slice(0, 9), rest = parts.slice(9), rw = rest.reduce((a, p) => a + p.w, 0); obj = [...head, ...(rw ? [{ label: rest.length > 1 ? `${rest.length} autres lignes` : (rest[0].label || "1 autre ligne"), w: rw, c: PF3_OTHER }] : [])]; }
  else if (v === "type" || v === "env") obj = pf3Parts(X[v], 7);
  else { const src = PF3S.lt ? X : raw(); obj = pf3Parts(src[v], 7, v === "ctry" ? k => COUNTRY[k] || k : v === "cur" ? k => PF3_CURN[k] || k : k => k);
    note = v === "cur" ? (PF3S.lt ? "Exposition économique : devise des pays où se trouvent les entreprises, même quand l'ETF est coté en euros." : "Devise de cotation de chaque ligne, telle que l'affiche votre courtier.") : v === "sect" && PF3S.lt ? `Secteur connu pour ${pct(X.sectKnown, 0, false)} de la valeur : dans les ETF, le secteur n'est connu que pour les entreprises suivies par le site et les principales lignes.` : v === "ctry" && PF3S.lt ? "Pays des entreprises contenues dans vos ETF (les douze premiers pays de chaque ETF), et pays d'immatriculation de vos actions." : ""; }
  const tg = $("#pf3lt"); if (tg) tg.closest("label").style.visibility = ["sect", "ctry", "cur"].includes(v) ? "" : "hidden";
  const top = obj[0] || { label: "", w: 0 };
  box.innerHTML = `<div class="pf3rp">${pf3Donut(obj, pct(top.w, 0, false), top.label.length > 16 ? top.label.slice(0, 15) + "…" : top.label)}${pf3Legend(obj, tot)}</div>${note ? `<p class="note">${note}</p>` : ""}`;
}

/* ---------- « Expliquer mon portefeuille » : rédigé par l'IA connectée du visiteur (m/monia.js) ---------- */
async function pf3Explain() {
  const c = PF3S.ctx; if (!c) return;
  const box = $("#pf3iab"), btn = $("#pf3go"), faits = pf3Faits(c.R0, c.X, c.S, c.F, c.D, c.A, c.P, c.prof), key = JSON.stringify(faits);
  box.innerHTML = `<div class="pf3wait"><span></span>Rédaction en cours à partir de vos chiffres…</div>`; btn.disabled = true;
  const done = (txt, foot) => { const html = `<div class="iares pf3res">${pf3Txt(txt)}<p class="iafoot">${foot}</p></div>`; box.innerHTML = html; PF3S.ia = { key, html }; btn.disabled = false; };
  const j = await iaRediger("portefeuille", faits, { max: 750 });
  if (j.txt) return done(j.txt, `${j.sources ? `Sources : ${esc(j.sources)}. ` : ""}Rédigé par l'IA de bilan. (${esc(j.modele)}) à partir des seuls chiffres calculés sur cette page. Vérifiez-les ci-dessus. Ce n'est pas un conseil en investissement.`);
  box.innerHTML = j.invite ? miaInvite("L'analyse calculée ci-dessus est complète.") : `<p class="muted">${esc(j.error || "La rédaction n'est pas disponible pour le moment.")}</p><p class="pf3hint">L'analyse calculée ci-dessus reste complète et à jour.</p>`;
  btn.disabled = false;
}

/* ---------- Import d'un fichier CSV de courtier, avec aperçu avant validation ---------- */
const PF3_HOW = [
  ["Trade Republic", "Dans l'application : Profil, puis Relevés et documents (selon la version), puis « Export des transactions ». Choisissez la période et créez le fichier CSV. Il contient vos achats, ventes et dividendes ; disponible depuis avril 2026."],
  ["BoursoBank", "Dans votre espace Bourse, ouvrez le portefeuille du PEA ou du compte-titres et cherchez l'icône d'export (fichier CSV). Le fichier donne chaque position avec sa quantité et son prix de revient."],
  ["Degiro", "Dans Boîte de réception, puis Transactions : choisissez la période, puis Exporter au format CSV. Le fichier donne chaque achat et vente avec ses frais et sa valeur en euros."],
  ["Fortuneo", "Dans l'espace Bourse, l'historique des opérations ou le portefeuille se téléchargent en général au format Excel ou CSV. Un fichier Excel s'enregistre en CSV depuis le tableur (Fichier, Enregistrer sous, CSV)."],
  ["Autre courtier", "Tout fichier CSV avec au moins un nom ou un code ISIN et une quantité. Si le format n'est pas reconnu, vous indiquerez quelle colonne contient quoi, avec un aperçu."],
];
function pf3ImpOpen() {
  const box = $("#pf3impbox"); if (!box) return;
  PF3S.imp = null;
  box.innerHTML = `<div class="pf3imp" id="pf3impr" role="region" aria-label="Importer un fichier"><div class="pf3nh"><div><b>Importer depuis votre courtier</b><small>Trade Republic, BoursoBank, Degiro, Fortuneo ou tout fichier CSV. Le fichier est lu dans ce navigateur : il n'est envoyé nulle part.</small></div><button type="button" class="pf3x" id="pf3ix" aria-label="Fermer">×</button></div>
    <label class="pf3drop" id="pf3drop"><input type="file" id="pf3file" accept=".csv,.txt,text/csv,text/plain"><b>Choisir le fichier CSV</b><span>ou le déposer ici</span></label>
    <details class="pf3how"><summary>Où trouver ce fichier chez mon courtier ?</summary>${PF3_HOW.map(([n, t]) => `<p><b>${n}</b> : ${t}</p>`).join("")}<p class="light">Les menus changent d'une version à l'autre de chaque application : l'aperçu ci-dessous vous permet de vérifier avant d'importer.</p></details>
    <div id="pf3ires" aria-live="polite"></div></div>`;
  box.scrollIntoView({ block: "nearest", behavior: "smooth" });
  const lst = $("#pf3list"); if (lst && !pf3P().l.length) lst.hidden = true;
  $("#pf3ix").onclick = () => { box.innerHTML = ""; PF3S.imp = null; if (lst) lst.hidden = false; };
  const inp = $("#pf3file"), drop = $("#pf3drop");
  inp.onchange = () => inp.files[0] && pf3ImpFile(inp.files[0]);
  ["dragover", "dragenter"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add("on"); }));
  ["dragleave", "drop"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove("on"); if (t === "drop" && e.dataTransfer.files[0]) pf3ImpFile(e.dataTransfer.files[0]); }));
}
async function pf3ImpFile(file) {
  const res = $("#pf3ires");
  if (file.size > 5e6) { res.innerHTML = `<p class="pf3err">Fichier trop volumineux (5 Mo au plus).</p>`; return; }
  if (/\.(xlsx?|ods|pdf)$/i.test(file.name)) { res.innerHTML = `<p class="pf3err">Ce fichier n'est pas un CSV. Ouvrez-le dans un tableur et enregistrez-le au format CSV (Fichier, Enregistrer sous).</p>`; return; }
  const buf = await file.arrayBuffer(); let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch (e) { text = new TextDecoder("windows-1252").decode(buf); }
  PF3S.imp = { text, name: file.name, env: "", br: "", mode: "add", map: null };
  pf3ImpRead();
}
function pf3Match(it) {
  const isin = (it.isin || "").toUpperCase();
  if (isin) { if (ISINBY[isin]) return "c:" + ISINBY[isin].id; const e = ETF.list.find(x => x.isin === isin); if (e) return "e:" + e.id; }
  const tk = (it.ticker || "").toUpperCase();
  if (tk) { const c = R.companies.filter(x => (x.ticker || "").toUpperCase() === tk); if (c.length === 1) return "c:" + c[0].id; const e = ETF.list.find(x => (x.ticker || "").toUpperCase() === tk); if (e) return "e:" + e.id; }
  if (it.name) { const e = ETF.list.find(x => norm(x.name) === norm(it.name)); if (e) return "e:" + e.id; const c = pf3ByName(it.name); if (c && (!isin || !c.isin || c.isin === isin)) return "c:" + c.id; }
  if (isin) return "x:" + isin;
  const slug = norm(it.name || "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return slug ? "x:" + slug : null;
}
/* Import : le fichier est lu en entier, les positions sont reconstituées (PF3.reconstruct), puis rattachées aux titres du site.
   Rien n'est enregistré avant la confirmation ; l'ancien portefeuille est sauvegardé et peut être restauré. */
const PF3_IMPBAK = "bilan.portefeuille.avant-import";
const pf3IsActive = l => { const p = PF3.linePos(l); return p.q > 1e-9 || (l.m > 0 && !(l.o && l.o.length)); };
const pf3LKey = l => [l.k, l.env || "", l.br || ""].join("|");
function pf3ImpBuild(S) {
  const r = S.r, R = PF3.reconstruct(r, { pru: S.pru || {} });
  const envOf = s => { const t = norm(s || ""); return /pea/.test(t) ? "pea" : /cto|compte.titres/.test(t) ? "cto" : /assurance/.test(t) ? "av" : S.env; };
  const brOf = s => (s && BROKERS.list.find(b => b.id === s) ? s : S.br);
  const by = new Map(), unk = [];
  for (const it of [...R.active, ...R.sold]) {
    const k = pf3Match(it); if (!k) { unk.push(it); continue; }
    const env = it.env ? envOf(it.env) : S.env, br = it.br ? brOf(it.br) : S.br, id = [k, env || "", br || "", it.acct || "", it.cur].join("|");
    if (!by.has(id)) by.set(id, { id, k, env, br, cur: it.cur, acct: it.acct || "", items: [] });
    by.get(id).items.push(it);
  }
  const out = [];
  for (const L of by.values()) {
    const it0 = L.items[0], l = { k: L.k, cur: L.cur };
    if (L.env) l.env = L.env; if (L.br) l.br = L.br;
    if (L.k.startsWith("x:")) { l.nm = it0.name || it0.isin; if (it0.isin) l.isin = it0.isin; }
    const ops = L.items.flatMap(i => i.ops || []), pos = L.items.filter(i => i.pos);
    if (ops.length) l.o = [...pos.map(i => ["", "r", i.pos.q, i.pos.pru, 0]), ...ops];
    else if (pos.length) { const q = pos.reduce((a, i) => a + i.pos.q, 0), c = pos.reduce((a, i) => a + i.pos.q * i.pos.pru, 0); l.q = q; l.pru = q > 0 ? c / q : 0; }
    const m = L.items.reduce((a, i) => a + (i.m || 0), 0); if (m > 0 && !l.o && !(l.q > 0)) l.m = m;
    const line = PF3.cleanLine(l, null); if (!line) continue;
    const R1 = pf3Rows({ l: [line] }).rows[0], active = pf3IsActive(line);
    out.push({ id: L.id, line, R1, active, name: R1.info.name, src: it0.name || it0.isin, acct: L.acct, items: L.items,
      amb: L.items.flatMap(i => i.amb), needPru: L.items.some(i => i.needPru), filled: L.items.some(i => i.filled), gids: L.items.map(i => i.id),
      nOps: L.items.reduce((a, i) => a + i.nOps, 0), first: L.items.map(i => i.first).filter(Boolean).sort()[0] || null, last: L.items.map(i => i.last).filter(Boolean).sort().pop() || null,
      real: L.items.reduce((a, i) => a + (i.real || 0), 0), w: R1.valE != null ? R1.valE : pf3E(R1.pos.cost, R1.lcur) || 0 });
  }
  const act = out.filter(x => x.active).sort((a, b) => b.w - a.w), sold = out.filter(x => !x.active).sort((a, b) => (b.last || "").localeCompare(a.last || ""));
  return { R, act, sold, unk, nAmb: act.filter(x => x.amb.length || x.needPru).length + R.orphans.length };
}
function pf3ImpRead() {
  const S = PF3S.imp, res = $("#pf3ires"); if (!S || !res) return;
  if (!S.r || S.reread) { S.r = PF3.read(S.text, { ...(S.map ? { map: S.map, format: "generic" } : {}), keepDup: !!S.keepDup }); S.reread = false; if (!S.br && S.r.broker) S.br = S.r.broker; }
  const r = S.r, B = pf3ImpBuild(S), P = pf3P(); S.B = B;
  const prem = isPrem(), replace = S.mode === "replace" || P.dem || !P.l.length;
  const ids = new Set([...B.act, ...B.sold].map(x => pf3LKey(x.line)));
  const kept = replace ? [] : P.l.filter(l => !ids.has(pf3LKey(l))), keptAct = kept.filter(pf3IsActive).length;
  const avail = prem ? Infinity : Math.max(0, FREE.pf - keptAct);
  // Sélection : par défaut, les positions les plus importantes en valeur (jamais l'ordre des lignes du fichier)
  if (!S.sel || S.selFor !== S.mode + "|" + B.act.length) { S.sel = new Set(PF3.pick(B.act, avail, x => x.w).map(x => x.id)); S.selFor = S.mode + "|" + B.act.length; }
  [...S.sel].forEach(id => { if (!B.act.some(x => x.id === id)) S.sel.delete(id); });
  const sel = B.act.filter(x => S.sel.has(x.id)), selVal = sel.reduce((a, x) => a + (x.R1.valE || 0), 0);
  const exSold = replace ? [] : B.sold.filter(x => P.l.some(l => pf3LKey(l) === pf3LKey(x.line) && pf3IsActive(l)));
  if (!S.updSold) S.updSold = new Set(exSold.map(x => x.id));
  const removed = replace && P.l.length && !P.dem ? P.l.filter(l => pf3IsActive(l) && !sel.some(x => pf3LKey(x.line) === pf3LKey(l))) : [];
  const ignAll = [...r.ignored, ...B.R.extraIgn], ignBy = new Map();
  ignAll.forEach(x => { const g = ignBy.get(x.why) || []; g.push(x.line); ignBy.set(x.why, g); });
  const nCash = ignAll.filter(x => x.kind === "cash").length, nCrypto = ignAll.filter(x => x.kind === "crypto").length;
  const ignAmb = ignAll.filter(x => x.kind === "annule" || x.kind === "ambigu"), nAmb = B.nAmb + ignAmb.length + (B.R.crypto.length ? 1 : 0);
  const qf = q => nf(q % 1 ? (q < 10 ? 4 : 2) : 0).format(q);
  const F = [["name", "Nom du titre"], ["isin", "Code ISIN"], ["ticker", "Ticker"], ["date", "Date"], ["type", "Opération (achat, vente)"], ["qty", "Quantité"], ["price", "Prix unitaire"], ["pru", "Prix de revient (PRU)"], ["fees", "Frais"], ["amount", "Montant"], ["currency", "Devise"]];
  const showMap = r.format === "generic" || S.showMap;
  const kindTxt = r.kind === "positions" ? "État du portefeuille" : r.kind === "mixte" ? "Positions et opérations" : "Journal d'opérations";
  const over = B.act.length > avail;
  const missPru = sel.filter(x => x.needPru);
  const risky = replace && P.l.length && !P.dem && (sel.length < B.act.length || B.nAmb > 0 || removed.length > 0);
  const posRow = x => { const R1 = x.R1, on = S.sel.has(x.id), dis = !on && sel.length >= avail, l = x.line;
    const sub = [l.k.startsWith("x:") ? `<span class="pf3warn">hors liste du site</span>` : "", x.src && norm(x.src) !== norm(x.name) ? esc(x.src) : "", R1.mOnly ? "montant investi" : x.nOps ? `${x.nOps} opération${x.nOps > 1 ? "s" : ""}${x.first ? " depuis le " + dLabel(x.first) : ""}` : "position du fichier", l.env ? PF3_ENVS[l.env] : "", x.acct ? "compte " + esc(x.acct.toLowerCase()) : ""].filter(Boolean).join(" · ");
    const valTxt = R1.valE == null ? "–" : pf3Eu(R1.valE), valSub = R1.mOnly ? "montant investi" : R1.price && R1.price.src === "cours" ? "au cours du jour" : R1.price ? "dernier prix connu" : "";
    return `<li class="pf3ip${on ? " on" : ""}${x.amb.length || x.needPru ? " amb" : ""}"><label class="pf3ipc"><input type="checkbox" data-sel="${esc(x.id)}" ${on ? "checked" : ""} ${dis ? "disabled" : ""} aria-label="Importer ${esc(x.name)}"></label>
      <span class="pf3ipn">${pf3Logo(l, 26)}<span><b>${esc(x.name)}</b><small>${sub}</small></span></span>
      <span class="pf3ipv"><span><i>Quantité</i>${R1.mOnly ? "–" : qf(R1.pos.q)}</span><span><i>PRU</i>${R1.mOnly ? "–" : x.needPru ? "à saisir" : pf3Px(R1.pos.pru, R1.lcur)}</span><span><i>Valeur</i><b>${valTxt}</b>${valSub ? `<small>${valSub}</small>` : ""}</span></span>
      ${x.amb.length || x.needPru ? `<div class="pf3ipa">${x.amb.filter(t => !/sans prix de revient/.test(t) || !x.filled).map(t => `<p>${esc(t)}</p>`).join("")}${x.needPru || x.filled ? `<label class="pf3f pf3ipru"><span>PRU des titres reçus (${CUR[R1.lcur] || R1.lcur})</span><span class="pf3iw"><input type="text" inputmode="decimal" data-pru="${esc(x.gids[0])}" value="${esc(S.pru && S.pru[x.gids[0]] ? pf3Fmt(S.pru[x.gids[0]]) : "")}" placeholder="sur le relevé de l'ancien courtier"></span></label>` : ""}</div>` : ""}</li>`; };
  res.innerHTML = `<div class="pf3ir">
    <div class="pf3irh"><p><b>${esc(r.label)}</b> · ${esc(S.name)} <span class="pf3tagk">${kindTxt}</span></p>
      <p class="light">${r.rows} ligne${r.rows > 1 ? "s" : ""} lue${r.rows > 1 ? "s" : ""}, du début à la fin du fichier. ${B.act.length} position${B.act.length > 1 ? "s" : ""} détenue${B.act.length > 1 ? "s" : ""} aujourd'hui${B.sold.length ? `, ${B.sold.length} vendue${B.sold.length > 1 ? "s" : ""} depuis` : ""}${nCash || nCrypto ? `, ${nCash + nCrypto} ligne${nCash + nCrypto > 1 ? "s" : ""} sans effet sur vos titres (${[nCash ? "espèces, impôts" : "", nCrypto ? "cryptomonnaies" : ""].filter(Boolean).join(", ")})` : ""}.</p></div>
    ${r.error && !B.act.length && !B.sold.length ? `<p class="pf3err">${esc(r.error)}</p>` : ""}
    ${B.act.length ? `<div class="pf3isec"><div class="pf3ish"><h3>Positions détenues</h3><span class="light">triées par valeur</span></div>
      ${over ? `<p class="pf3inote">${prem ? "" : `La version gratuite suit ${FREE.pf} positions actives${keptAct ? ` (vous en avez déjà ${keptAct} hors de ce fichier)` : ""}. Le fichier en contient ${B.act.length} : ${avail ? `les ${avail} plus importantes en valeur sont cochées, choisissez celles à suivre` : "aucune nouvelle position ne peut être ajoutée, choisissez « Remplacer tout le portefeuille » ou libérez des lignes"}. <a class="lnk" href="/premium">Premium</a> les suit toutes.`}</p>` : ""}
      <ul class="pf3ipl">${B.act.map(posRow).join("")}</ul>
      <p class="pf3isum"><b>${sel.length} position${sel.length > 1 ? "s" : ""} sélectionnée${sel.length > 1 ? "s" : ""}</b>${selVal ? ` · ${pf3Eu(selVal)} aux cours connus` : ""}${B.act.length > sel.length ? ` · ${B.act.length - sel.length} non cochée${B.act.length - sel.length > 1 ? "s" : ""}` : ""}</p></div>` : ""}
    ${B.sold.length ? `<details class="pf3how pf3isold"${exSold.length ? " open" : ""}><summary>Positions vendues depuis (${B.sold.length}) : non importées</summary><p class="pf3hint" style="margin-top:2px">Toutes leurs parts ont été vendues d'après le fichier : elles ne font plus partie du portefeuille.</p><ul>${B.sold.map(x => `<li><b>${esc(x.name)}</b> <span class="light">${x.last ? "dernière opération le " + dLabel(x.last) : ""}${x.real ? ` · plus-value réalisée ${pf3Sg(pf3E(x.real, x.line.cur) || 0)}` : ""}</span>${exSold.includes(x) ? `<label class="pf3ichk"><input type="checkbox" data-usold="${esc(x.id)}" ${S.updSold.has(x.id) ? "checked" : ""}> encore dans votre portefeuille : la marquer vendue</label>` : ""}</li>`).join("")}</ul></details>` : ""}
    ${nAmb ? `<details class="pf3how pf3iamb" open><summary>À vérifier (${nAmb})</summary><ul>${B.act.filter(x => x.amb.length || x.needPru).map(x => `<li><b>${esc(x.name)}</b> : ${esc(x.amb[0] || "prix de revient à saisir")}${x.amb.length > 1 ? ` <span class="light">(+${x.amb.length - 1})</span>` : ""}</li>`).join("")}${B.R.orphans.map(x => `<li><b>${esc(x.name)}</b> : ${esc(x.amb[0])}</li>`).join("")}${ignAmb.map(x => `<li>${esc(x.why)} <span class="light">(ligne ${x.line})</span></li>`).join("")}${B.R.crypto.length ? `<li><b>Cryptomonnaies</b> (non suivies par le site, non importées) : ${B.R.crypto.map(c => `${esc(c.name)} ${qf(c.q)}`).join(", ")}</li>` : ""}</ul></details>` : ""}
    <details class="pf3how pf3ichecks"><summary>Contrôles (${B.R.checks.filter(c => !c.ok).length ? `${B.R.checks.filter(c => !c.ok).length} point${B.R.checks.filter(c => !c.ok).length > 1 ? "s" : ""} à vérifier` : "tout est cohérent"})</summary><ul>${B.R.checks.map(c => `<li class="${c.ok ? (c.info ? "i" : "ok") : "ko"}">${esc(c.t)}</li>`).join("")}${r.dups && !S.keepDup ? `<li class="i">Deux opérations réellement identiques le même jour ? <button type="button" class="linkbtn" id="pf3ikeep">Compter aussi les lignes en double</button></li>` : S.keepDup ? `<li class="i">Les lignes en double sont comptées. <button type="button" class="linkbtn" id="pf3ikeep">Les compter une seule fois</button></li>` : ""}</ul></details>
    ${ignBy.size ? `<details class="pf3how"><summary>Lignes non reprises (${ignAll.length}), avec la raison</summary><ul>${[...ignBy.entries()].slice(0, 40).map(([why, ls]) => `<li>${esc(why)} <span class="light">(${ls.length > 1 ? `${ls.length} lignes : ` : "ligne "}${ls.slice(0, 6).join(", ")}${ls.length > 6 ? "…" : ""})</span></li>`).join("")}</ul></details>` : ""}
    ${B.act.length || exSold.length ? `<div class="pf3grid pf3g2"><div class="pf3f"><span>Compte de ces positions</span>${pf3Chips("ienv", [["pea", "PEA"], ["cto", "Compte-titres"], ["av", "Assurance-vie"]], S.env)}</div>${pf3BrSel("pf3ibr", S.br)}</div>
      ${P.l.length && !P.dem ? `<div class="pf3f"><span>Votre portefeuille actuel (${P.l.filter(pf3IsActive).length} position${P.l.filter(pf3IsActive).length > 1 ? "s" : ""})</span>${pf3Chips("imode", [["add", "Ajouter ou mettre à jour"], ["replace", "Remplacer tout le portefeuille"]], S.mode)}</div>
        <p class="pf3hint">${S.mode === "add" ? "Une position déjà présente (même titre, même compte, même courtier) est mise à jour : ses opérations sont complétées sans doublon. Les autres lignes ne changent pas." : "Le portefeuille actuel sera remplacé par la sélection ci-dessus. Il est sauvegardé : vous pourrez le restaurer."}</p>
        ${removed.length ? `<p class="pf3warn">Ces positions de votre portefeuille ne seront plus suivies : ${esc(removed.map(l => pf3Info(l).name).slice(0, 8).join(", "))}${removed.length > 8 ? "…" : ""}.</p>` : ""}
        ${risky ? `<label class="pf3ichk pf3iconf"><input type="checkbox" id="pf3iconf" ${S.confirm ? "checked" : ""}> J'ai vérifié l'aperçu : remplacer mon portefeuille${sel.length < B.act.length ? ` par ${sel.length} des ${B.act.length} positions du fichier` : ""}${B.nAmb ? " malgré les points à vérifier" : ""}.</label>` : ""}` : ""}
      <p class="pf3err" id="pf3imsg" aria-live="polite" hidden></p>
      <div class="pf3btns"><button type="button" class="btn" id="pf3igo" ${(!sel.length && !(exSold.length && S.updSold.size)) || (risky && !S.confirm) ? "disabled" : ""}>${sel.length ? `Importer ${sel.length} position${sel.length > 1 ? "s" : ""}` : "Mettre à jour"}</button><button type="button" class="linkbtn" id="pf3ino">Annuler</button><button type="button" class="linkbtn" id="pf3imap">${showMap ? "" : "Corriger la correspondance des colonnes"}</button></div>` : ""}
    ${showMap ? `<div class="pf3map"><p class="kick">Quelle colonne contient quoi ?</p><div class="pf3grid">${F.map(([k, lab]) => `<label class="pf3f"><span>${lab}</span><select data-m="${k}"><option value="">—</option>${r.header.map((h, i) => `<option value="${i}" ${r.map[k] === i ? "selected" : ""}>${esc(h || "colonne " + (i + 1))}${r.sample[0] && r.sample[0][i] ? ` (ex. ${esc(String(r.sample[0][i]).slice(0, 18))})` : ""}</option>`).join("")}</select></label>`).join("")}</div><p class="pf3hint">Il faut au moins le nom ou l'ISIN, et la quantité. Avec une date et un prix, chaque ligne devient un achat ou une vente ; avec un PRU, une position.</p></div>` : ""}</div>`;
  $$("[data-sel]", res).forEach(c => c.onchange = () => { if (c.checked) S.sel.add(c.dataset.sel); else S.sel.delete(c.dataset.sel); S.confirm = false; pf3ImpRead(); });
  $$("[data-usold]", res).forEach(c => c.onchange = () => { if (c.checked) S.updSold.add(c.dataset.usold); else S.updSold.delete(c.dataset.usold); pf3ImpRead(); });
  $$("[data-pru]", res).forEach(i => i.onchange = () => { S.pru = S.pru || {}; const v = pf3Num(i.value); if (v > 0) S.pru[i.dataset.pru] = v; else delete S.pru[i.dataset.pru]; pf3ImpRead(); });
  $$(".pf3chips[data-g=ienv] button", res).forEach(b => b.onclick = () => { S.env = S.env === b.dataset.v ? "" : b.dataset.v; S.sel = null; pf3ImpRead(); });
  $$(".pf3chips[data-g=imode] button", res).forEach(b => b.onclick = () => { S.mode = b.dataset.v; S.confirm = false; pf3ImpRead(); });
  const br = $("#pf3ibr", res); if (br) br.onchange = () => { S.br = br.value; S.sel = null; pf3ImpRead(); };
  const cf = $("#pf3iconf", res); if (cf) cf.onchange = () => { S.confirm = cf.checked; pf3ImpRead(); };
  const kp = $("#pf3ikeep", res); if (kp) kp.onclick = () => { S.keepDup = !S.keepDup; S.reread = true; S.sel = null; pf3ImpRead(); };
  const mp = $("#pf3imap", res); if (mp) { if (!mp.textContent) mp.remove(); else mp.onclick = () => { S.showMap = true; pf3ImpRead(); }; }
  $$("[data-m]", res).forEach(s => s.onchange = () => { S.map = Object.fromEntries($$("[data-m]", res).filter(x => x.value !== "").map(x => [x.dataset.m, +x.value])); S.showMap = true; S.reread = true; S.sel = null; pf3ImpRead(); });
  const no = $("#pf3ino", res); if (no) no.onclick = () => { const x = $("#pf3ix"); if (x) x.click(); };
  const go = $("#pf3igo", res); if (go) go.onclick = () => pf3ImpApply();
}
function pf3ImpApply() {
  const S = PF3S.imp; if (!S || !S.B) return;
  const B = S.B, msg = $("#pf3imsg"), P = pf3P(), prev = JSON.parse(JSON.stringify(P));
  const sel = B.act.filter(x => S.sel.has(x.id)), miss = sel.filter(x => x.needPru);
  if (miss.length) { if (msg) { msg.hidden = false; msg.textContent = `Indiquez le prix de revient des titres reçus pour ${miss.map(x => x.name).join(", ")} (il figure sur le relevé de l'ancien courtier), ou décochez ${miss.length > 1 ? "ces lignes" : "cette ligne"}.`; } const i = $(`[data-pru="${CSS.escape(miss[0].gids[0])}"]`); if (i) i.focus(); return; }
  const replace = S.mode === "replace" || P.dem || !P.l.length;
  if (replace && !sel.length) { if (msg) { msg.hidden = false; msg.textContent = "Aucune position sélectionnée : votre portefeuille n'est pas remplacé."; } return; }
  const upd = replace ? [] : B.sold.filter(x => S.updSold && S.updSold.has(x.id));
  try { if (P.l.length && !P.dem) localStorage.setItem(PF3_IMPBAK, JSON.stringify({ at: Date.now(), p: prev, file: S.name, mode: replace ? "replace" : "add" })); } catch (e) { }
  if (replace) P.l = [];
  delete P.dem; PF3S.demo = null;
  let n = 0, u = 0;
  const key = o => [o[0], o[1], Math.round(o[2] * 1000), Math.round(o[3] * 100)].join("|"); // tolérant aux arrondis d'un import précédent
  for (const x of [...sel, ...upd]) {
    const l = JSON.parse(JSON.stringify(x.line));
    const ex = P.l.find(y => pf3LKey(y) === pf3LKey(l));
    if (!ex) { P.l.push(l); n++; continue; }
    u++;
    if (l.o) { if (!ex.o || (ex.cur || "EUR") !== (l.cur || "EUR")) { ex.o = l.o.slice(); ex.cur = l.cur; } else { const have = new Set(ex.o.map(key)); l.o.forEach(o => { if (!have.has(key(o))) ex.o.push(o); }); } delete ex.m; }
    else { delete ex.o; if (l.m) ex.m = l.m; else { ex.q = l.q; ex.pru = l.pru; ex.cur = l.cur; delete ex.m; } }
    PF3.syncLine(ex);
  }
  if (S.br) { P.cfg = P.cfg || {}; P.cfg.courtier = P.cfg.courtier || S.br; }
  pf2Save(P); PF3S.imp = null; $("#pf3impbox").innerHTML = ""; PF3S.open = -1; pf3Draw();
  pf3Undo(`${n ? `${n} position${n > 1 ? "s" : ""} importée${n > 1 ? "s" : ""}` : ""}${n && u ? ", " : ""}${u ? `${u} mise${u > 1 ? "s" : ""} à jour` : ""}${!n && !u ? "Rien à importer" : ""}.`, prev);
}
function pf3Export() {
  const P = pf3P(); if (!P.l.length) { toast("Votre portefeuille est vide."); return; }
  const csv = PF3.toCsv(P, l => { const i = pf3Info(l); return { name: i.name, isin: i.isin || "", ticker: i.ticker || "", cur: i.curQ }; });
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = `portefeuille-bilan-${TODAY}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  toast("Fichier CSV téléchargé : il s'ouvre dans Excel ou LibreOffice et se réimporte ici.");
}

/* ---------- Avertissement après synchronisation : la version de l'appareil est gardée ---------- */
function pf3Notice() {
  const el = $("#pf3notice"); if (!el) return;
  let b = null, ib = null; try { b = JSON.parse(localStorage.getItem(PF3_BACKUP) || "null"); ib = JSON.parse(localStorage.getItem(PF3_IMPBAK) || "null"); } catch (e) { }
  const okB = b && b.p && b.p.l && b.p.l.length && Date.now() - b.at < 30 * 864e5, okI = ib && ib.p && ib.p.l && ib.p.l.length && Date.now() - ib.at < 14 * 864e5;
  if (!okB && !okI) { el.innerHTML = ""; return; }
  const one = (id, txt) => `<div class="notice pf3note"><span>${txt}</span><span><button type="button" class="linkbtn" data-rest="${id}">Restaurer cette version</button> · <button type="button" class="linkbtn" data-del="${id}">Ignorer</button></span></div>`;
  const n = x => { const a = x.p.l.filter(pf3IsActive).length; return `${a} position${a > 1 ? "s" : ""}`; };
  el.innerHTML = (okI ? one("i", `Import du ${dLabel(new Date(ib.at).toISOString().slice(0, 10))}${ib.file ? ` (${esc(ib.file)})` : ""} : votre portefeuille d'avant (${n(ib)}) est sauvegardé sur cet appareil.`) : "")
    + (okB ? one("b", `Votre compte a remplacé le portefeuille enregistré sur cet appareil (${n(b)}, le ${dLabel(new Date(b.at).toISOString().slice(0, 10))}). La version de l'appareil est gardée.`) : "");
  const K = { i: PF3_IMPBAK, b: PF3_BACKUP }, V = { i: ib, b };
  $$("[data-rest]", el).forEach(x => x.onclick = () => { const id = x.dataset.rest, prev = pf2Load(), p = V[id].p; p.maj = Date.now(); pf2Save(p); try { localStorage.removeItem(K[id]); } catch (e) { } pf3Draw(); pf3Undo("Version précédente restaurée.", prev); });
  $$("[data-del]", el).forEach(x => x.onclick = () => { try { localStorage.removeItem(K[x.dataset.del]); } catch (e) { } pf3Notice(); });
}

/* ---------- La page ---------- */
/* ---------- Achats programmés (31/10, Romain) : « une part de MSCI World chaque mois, le 5 ».
   À chaque visite, les échéances passées depuis la dernière application sont ajoutées comme achats, au cours connu le jour de la visite
   (le site n'a pas l'historique des cours) : l'opération est marquée « p » et le prix est présenté comme relevé à la visite. ---------- */
function pf3ProgAppliquer(P) {
  const L = (P.cfg && P.cfg.prog) || []; if (!L.length) return 0;
  let n = 0; const ym = d => d.slice(0, 7);
  for (const pr of L) {
    const info = pf3Info({ k: pr.k }), px = pf3PxN(PX[pr.k]); if (!px || !(px.p > 0)) continue;
    const cur = new Date((pr.dernier || ym(pr.depuis)) + "-01T12:00:00Z"); if (pr.dernier) cur.setUTCMonth(cur.getUTCMonth() + 1); // premier mois à examiner
    const guard = 60;
    for (let i = 0; i < guard; i++) {
      const d = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, "0")}-${String(pr.jour).padStart(2, "0")}`;
      if (d > TODAY) break;
      if (d >= pr.depuis) {
        let line = P.l.find(l => l.k === pr.k && (l.env || "") === ((P.cfg && P.cfg.env && P.cfg.env !== "mix" ? P.cfg.env : "") || ""));
        if (!line) { if (pfFull(P)) break; line = { k: pr.k, cur: px.cur || info.curQ || "EUR" }; if (P.cfg && P.cfg.env && P.cfg.env !== "mix") line.env = P.cfg.env; P.l.push(line); }
        if (!line.o) line.o = line.q > 0 && line.pru > 0 ? [["", "r", line.q, line.pru, 0]] : [];
        line.o.push([d, "a", pr.q, px.p, 0, null, "p"]); PF3.syncLine(line); n++;
      }
      pr.dernier = d.slice(0, 7); cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
  }
  if (n) { pf3Save(P); PF3S.progN = n; }
  return n;
}
function pf3ProgHTML(P) {
  const L = (P.cfg && P.cfg.prog) || [];
  const rows = L.map((pr, i) => { const info = pf3Info({ k: pr.k }), px = pf3PxN(PX[pr.k]); return `<li><span class="pf3pgn">${esc(info.name || pr.k)}</span><span class="pf3pgd">${!px || !(px.p > 0) ? `<span class="pf3pgm" style="background:#FBE9E4;color:#8A3A22">cours indisponible : les achats seront ajoutés quand le site l'aura</span> ` : ""}${nf(pr.q % 1 ? 2 : 0).format(pr.q)} part${pr.q > 1 ? "s" : ""} le ${pr.jour} de chaque mois, depuis le ${dLabel(pr.depuis)}${pr.dernier ? ` · dernier ajout : ${pr.dernier.split("-").reverse().join("/")}` : ""}</span><button type="button" class="pf3ab" data-pf3pgx="${i}">Arrêter</button></li>`; }).join("");
  return `<section class="panel" id="pf3-prog"><div class="ph"><h2>Achats programmés</h2><span class="pf3bdg">Comme un versement automatique</span></div>
    <div class="pb"><p class="pf3hint" style="margin-top:0">Vous achetez la même chose chaque mois (une part d'ETF, quelques actions) ? Indiquez-le une fois : à chaque visite, le site ajoute les achats arrivés à échéance dans vos lignes, au cours connu ce jour-là. Vous pouvez corriger le prix dans la ligne.</p>
      ${rows ? `<ul class="pf3pg">${rows}</ul>` : ""}
      <form class="pf3pgf" id="pf3pgf"><label><span>Titre</span><input type="text" id="pf3pgq" placeholder="MSCI World, LVMH…" autocomplete="off" required><input type="hidden" id="pf3pgk"><div class="pf3pgs" id="pf3pgs" hidden></div></label>
        <label><span>Parts par mois</span><input type="number" id="pf3pgn" min="0.01" step="0.01" placeholder="1" required></label>
        <label><span>Le jour</span><input type="number" id="pf3pgj" min="1" max="28" value="5" required></label>
        <label><span>Depuis le</span><input type="date" id="pf3pgd" value="${TODAY}" max="${TODAY}" required></label>
        <button type="submit" class="btn">Programmer</button></form>
      <p class="pf3disc">Les achats ajoutés automatiquement sont marqués « programmé » dans la ligne : leur prix est celui connu le jour de l'ajout (cours différé), pas celui de la date d'achat. Rien n'est acheté pour vous : le site ne passe aucun ordre.</p></div></section>`;
}
function pf3ProgLier(el) {
  const f = $("#pf3pgf", el); if (!f) return;
  const q = $("#pf3pgq", el), k = $("#pf3pgk", el), box = $("#pf3pgs", el);
  q.oninput = () => { k.value = ""; const h = pf3Find(q.value); box.hidden = !h.length; box.innerHTML = h.map(x => `<button type="button" data-k="${esc(x.k)}"><b>${esc(x.name)}</b> <small>${esc(x.type)} · ${esc(x.sub)}</small></button>`).join(""); };
  box.onclick = e => { const b = e.target.closest("button[data-k]"); if (!b) return; k.value = b.dataset.k; q.value = b.querySelector("b").textContent; box.hidden = true; };
  f.onsubmit = e => { e.preventDefault(); if (!k.value) { const h = pf3Find(q.value); if (h.length === 1) k.value = h[0].k; else { q.focus(); q.oninput(); return; } }
    const P = pf3P(); P.cfg = P.cfg || {}; P.cfg.prog = P.cfg.prog || [];
    if (P.cfg.prog.length >= 12) return;
    P.cfg.prog.push({ k: k.value, jour: Math.min(28, Math.max(1, +$("#pf3pgj", el).value || 5)), q: +$("#pf3pgn", el).value, depuis: $("#pf3pgd", el).value || TODAY, dernier: "" });
    pf3Save(P); pf3ProgAppliquer(pf3P()); pf3Draw(); };
  el.querySelectorAll("[data-pf3pgx]").forEach(b => b.onclick = () => { const P = pf3P(); P.cfg.prog.splice(+b.dataset.pf3pgx, 1); if (!P.cfg.prog.length) delete P.cfg.prog; pf3Save(P); pf3Draw(); });
}
function pf3Draw() {
  const P0 = pf3P(); if (pf3ProgAppliquer(P0)) { /* enregistré */ }
  const P = pf3P(), R0 = pf3Rows(P);
  const pg = $("#pf3prog"); if (pg) { pg.innerHTML = pf3ProgHTML(P); pf3ProgLier(pg); }
  pf3Hero(R0, P); pf3List(R0, P); pf3Notice();
  const lst = $("#pf3list"); if (lst && !PF3S.imp) lst.hidden = false;
  const nav = $("#pf3nav"); if (nav) nav.hidden = !R0.live.length;
  const ex = $("#pf3exp"); if (ex) ex.hidden = !P.l.length;
  pf3Dash(R0, P);
}
async function pagePortefeuille() {
  setTitle("Mon portefeuille"); setNav("pf");
  pf3Css();
  await PXP;
  if (!BROKERS.list.length) { try { BROKERS = await (await fetch("/data/courtiers.json")).json(); } catch (e) { } }
  PF3S.open = -1; PF3S.op = null; PF3S.imp = null; PF3S.form = pf3DraftLoad();
  app.innerHTML = `<div id="pf3" class="pf3">
    <h1 class="pagetitle">Mon portefeuille</h1>
    <p class="pagesub">Vos actions et vos ETF, leur valeur aux cours du jour, votre plus ou moins-value, vos frais, vos dividendes et ce que vous possédez vraiment une fois les ETF ouverts. Tout est calculé dans ce navigateur${connecte() ? " et enregistré dans votre compte" : ""}.</p>
    <div id="pf3notice"></div>
    <section class="panel pf3hero" id="pf3hero" hidden></section>
    <nav class="pf3nav scroll-x" id="pf3nav" aria-label="Sections du portefeuille" hidden>${[["pf3lines", "Lignes"], ["pf3-analyse", "Analyse"], ["pf3-repartition", "Répartition"], ["pf3-diversification", "Diversification"], ["pf3-frais", "Frais"], ["pf3-dividendes", "Dividendes"]].map(([id, l]) => `<a href="#${id}">${l}</a>`).join("")}</nav>
    <section class="panel" id="pf3lines"><div class="ph"><h2>Mes lignes</h2><div class="pf3act"><button type="button" class="pf3ab" id="pf3imp">Importer un fichier</button><button type="button" class="pf3ab" id="pf3exp" hidden>Exporter</button></div></div>
      <div class="pb pf3add"><label for="pfq" class="pf3al">Ajouter une action ou un ETF</label><div class="pf3sw"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><input id="pfq" type="search" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="pfs" autocomplete="off" spellcheck="false" placeholder="Tapez un nom, un ticker ou un ISIN"><div class="pf3sug" id="pfs" role="listbox" hidden></div></div>
        <div id="pf3form"></div><div id="pf3impbox"></div></div>
      <div id="pf3list"></div>
      <div class="src">Prix de revient (PRU) calculé comme le font les courtiers français : prix moyen pondéré des achats, frais d'achat inclus ; une vente ne le modifie pas. Cours différés (Google Finance), taux de change de la BCE.</div></section>
    <div id="pf3dash"></div><div id="pf3prog"></div></div>`;
  pf3Search();
  $("#pf3imp").onclick = () => pf3ImpOpen();
  $("#pf3exp").onclick = () => pf3Export();
  $$("#pf3nav a").forEach(a => a.onclick = e => { e.preventDefault(); const t = document.getElementById(a.getAttribute("href").slice(1)); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); });
  if (PF3S.form && PF3S.form.k && (PF3S.form.k.startsWith("x:") || (PF3S.form.k.startsWith("c:") ? RBY[PF3S.form.k.slice(2)] : ETFBY[PF3S.form.k.slice(2)]))) pf3Form(); else PF3S.form = null;
  pf3Draw();
}

/* ---------- Styles du module ---------- */
function pf3Css() {
  if (document.getElementById("pf3css")) return;
  document.head.insertAdjacentHTML("beforeend", `<style id="pf3css">
.pf3 .pagesub{max-width:860px}
.pf3pg{list-style:none;margin:0 0 14px;padding:0}.pf3pg li{display:flex;gap:12px;align-items:center;padding:8px 0;border-bottom:1px solid var(--rule)}.pf3pgn{font-weight:600;min-width:0}.pf3pgd{flex:1;font-size:13.5px;color:var(--grey)}
.pf3pgf{display:grid;grid-template-columns:minmax(0,2fr) repeat(3,minmax(0,1fr)) auto;gap:10px;align-items:end}.pf3pgf label{display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--grey);position:relative}.pf3pgf input{padding:9px 10px;border:1px solid var(--rule);border-radius:6px;font:inherit;color:var(--ink);background:#fff}.pf3pgs{position:absolute;top:100%;left:0;right:0;z-index:5;background:#fff;border:1px solid var(--rule);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.08);max-height:260px;overflow:auto}.pf3pgs button{display:block;width:100%;text-align:left;padding:8px 10px;border:0;background:none;cursor:pointer;font:inherit}.pf3pgs button:hover{background:var(--hl)}.pf3pgs small{color:var(--grey)}
.pf3pgm{display:inline-block;margin-left:6px;padding:1px 6px;border-radius:999px;background:var(--hl);font-size:11px;color:var(--grey)}
@media (max-width:760px){.pf3pgf{grid-template-columns:repeat(2,minmax(0,1fr))}.pf3pgf label:first-child{grid-column:1 / -1}}
.pf3hero .pf3demo{background:var(--hl);padding:10px 22px;font-size:13.5px;border-bottom:1px solid var(--line2)}
.pf3k{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr}
.pf3k > div{padding:18px 22px;border-right:1px solid var(--line2);min-width:0}
.pf3k > div:last-child{border-right:0}
.pf3k b{display:block;font-family:var(--mono);font-size:21px;font-weight:600;letter-spacing:-.02em;margin:3px 0 2px;white-space:nowrap}
.pf3k b.pf3big{font-size:34px;line-height:1.1}
.pf3k small{display:block;color:var(--grey);font-size:12.5px;line-height:1.35}
.pf3stk{display:flex;height:10px;gap:2px;margin:0 22px 16px;border-radius:99px;overflow:hidden}
.pf3stk span{display:block;height:100%;min-width:2px}
.pf3kn{margin:-6px 22px 14px;font-size:13px;color:var(--grey)}
.pf3nav{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:-4px 0 16px;padding:2px 0}
.pf3nav::-webkit-scrollbar{display:none}
.pf3nav a{flex:none;border:1px solid var(--line);background:#fff;border-radius:99px;padding:6px 13px;font-size:13.5px;color:var(--ink)}
.pf3nav a:hover{border-color:var(--ink)}
.pf3act{display:flex;gap:8px;flex-wrap:wrap}
.pf3ab{border:1.5px solid var(--ink);background:#fff;border-radius:10px;padding:6px 12px;font-size:13.5px;font-weight:600;cursor:pointer}
.pf3ab:hover{background:var(--hl)}
.pf3add{padding-bottom:8px}
.pf3al{display:block;font-size:12.5px;color:var(--grey);margin-bottom:6px}
.pf3sw{position:relative;max-width:620px}
.pf3sw > svg{position:absolute;left:14px;top:14px;width:20px;height:20px;color:var(--light);pointer-events:none}
.pf3sw input{width:100%;height:48px;border:1.5px solid var(--ink);border-radius:12px;padding:0 14px 0 44px;font-size:16px;background:#fff;outline:none}
.pf3sw input:focus{box-shadow:0 0 0 3px var(--lime)}
.pf3sug{position:absolute;left:0;right:0;top:calc(100% + 6px);background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:0 14px 40px rgba(17,18,20,.16);z-index:25;padding:6px;max-height:min(440px,60vh);overflow:auto}
.pf3sug [role=option]{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px;width:100%;min-height:54px;border:0;background:none;padding:8px 10px;border-radius:10px;cursor:pointer;text-align:left}
.pf3sug [role=option].on,.pf3sug [role=option]:hover{background:var(--soft)}
.pf3sn{display:flex;flex-direction:column;min-width:0}
.pf3sn b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pf3sn small{color:var(--light);font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pf3bd{display:flex;gap:4px}
.pf3bd em,.pf3tag{font-style:normal;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;border-radius:6px;padding:2px 6px;background:var(--soft);color:var(--grey)}
.pf3bd em.t-e{background:#E6F0F3;color:#0E5566}.pf3bd em.t-p{background:#E4F2EA;color:var(--g)}
.pf3tag{font-size:9.5px;padding:1px 5px}
.pf3none{padding:12px;color:var(--grey);font-size:13.5px;line-height:1.5}
.pf3new,.pf3imp{margin-top:14px;background:#FBF9F4;border:1px solid var(--line);border-radius:14px;padding:14px 16px 16px;max-width:860px}
.pf3nh{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.pf3nh > div{flex:1;min-width:0;display:flex;flex-direction:column}
.pf3nh b{font-size:16px}.pf3nh small{color:var(--grey);font-size:12.5px;overflow-wrap:anywhere}
.pf3x{border:0;background:none;font-size:24px;line-height:1;cursor:pointer;color:var(--grey);width:36px;height:36px;border-radius:50%;flex:none}
.pf3x:hover{background:var(--soft);color:var(--ink)}
.pf3chips{display:flex;gap:6px;flex-wrap:wrap}
.pf3chips button{border:1px solid var(--line);background:#fff;border-radius:99px;padding:7px 13px;cursor:pointer;font-size:13.5px;min-height:36px}
.pf3chips button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.pf3grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px 12px;margin:12px 0 4px}
.pf3g2{grid-template-columns:minmax(0,1.4fr) minmax(0,1fr)}
.pf3f{display:flex;flex-direction:column;gap:5px;min-width:0}
.pf3f > span:first-child{font-size:12.5px;color:var(--grey)}
.pf3iw{position:relative;display:block}
.pf3iw input,.pf3f select{width:100%;height:42px;border:1px solid var(--line);border-radius:10px;background:#fff;padding:0 10px;font-size:16px;outline:none;font-family:var(--mono)}
.pf3f select{font-family:var(--sans);font-size:14.5px}
.pf3iw input[type=date]{font-family:var(--sans);font-size:15px}
.pf3iw input:focus,.pf3f select:focus{border-color:var(--ink);box-shadow:0 0 0 3px var(--lime)}
.pf3iw i{position:absolute;right:11px;top:11px;font-style:normal;color:var(--light);pointer-events:none}
.pf3iw i ~ input,.pf3iw input:has(+ i){padding-right:30px}
.pf3cur{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:6px 0 2px;font-size:13px;color:var(--grey)}
.pf3cur small{flex-basis:100%;font-size:12px;color:var(--light)}
.pf3hint{font-size:12.5px;color:var(--grey);margin:8px 0 0;line-height:1.45}
.pf3prev{font-size:13.5px;margin-top:8px}.pf3prev p{margin:4px 0}
.pf3warn{color:#B23A1E}.pf3err{color:#B23A1E;font-weight:600;margin:6px 0 0}
.pf3btns{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:12px}
.pf3btns .btn{height:42px}
.pf3l{display:flex;flex-direction:column}
.pf3hd,.pf3rb{display:grid;grid-template-columns:minmax(0,2.3fr) .7fr 1fr 1fr 1fr 1.15fr .8fr 18px;gap:10px;align-items:center}
.pf3hd{padding:8px 22px;border-top:1px solid var(--line2);border-bottom:1px solid var(--line);font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--light)}
.pf3hd span:not(:first-child){text-align:right}
.pf3r{border-bottom:1px solid var(--line2)}
.pf3rb{width:100%;border:0;background:none;padding:11px 22px;cursor:pointer;text-align:left;font-size:14px}
.pf3rb:hover{background:#FCFBF8}.pf3r.open > .pf3rb{background:#F8F6F0}
.pf3n{display:flex;align-items:center;gap:11px;min-width:0}
.pf3n > span:last-child{display:flex;flex-direction:column;min-width:0}
.pf3n b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pf3n small{color:var(--light);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pf3c{text-align:right;font-family:var(--mono);font-size:13.5px;white-space:nowrap;display:flex;flex-direction:column;align-items:flex-end;letter-spacing:-.02em}
.pf3c small{font-size:11.5px}
.pf3c b{font-weight:600}
.pf3mq{display:none}
.pf3wb{display:block;width:44px;height:4px;background:var(--line2);border-radius:9px;margin-top:4px;overflow:hidden}.pf3wb i{display:block;height:100%;background:var(--ink)}
.pf3chev{width:9px;height:9px;border-right:2px solid var(--light);border-bottom:2px solid var(--light);transform:rotate(45deg);margin-top:-5px;transition:transform .15s}
.pf3r.open .pf3chev{transform:rotate(-135deg);margin-top:4px}
.pf3det{padding:4px 22px 18px;background:#FCFBF8;border-top:1px solid var(--line2)}
.pf3facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1px;background:var(--line2);border:1px solid var(--line2);border-radius:12px;overflow:hidden;margin:12px 0 6px}
.pf3facts > div{background:#fff;padding:9px 12px;display:flex;flex-direction:column;min-width:0}
.pf3facts span{font-size:11.5px;color:var(--grey)}.pf3facts .def{font-size:inherit;color:inherit;text-align:left;padding:0}.pf3facts b{font-family:var(--mono);font-size:15px;font-weight:600;letter-spacing:-.02em}.pf3facts small{font-size:11.5px;color:var(--light)}
.pf3set{margin-top:14px}
.pf3ops{margin-top:14px}
.pf3ot td,.pf3ot th{font-size:13px}
.pf3del{border:0;background:none;color:var(--light);font-size:18px;cursor:pointer;width:32px;height:32px;border-radius:50%}
.pf3del:hover{background:#FBEDE8;color:#B23A1E}
.pf3opb{border:1px dashed var(--grey);background:#fff;border-radius:10px;padding:7px 12px;font-size:13.5px;cursor:pointer;min-height:38px}
.pf3opb:hover:not([disabled]){border-style:solid;border-color:var(--ink)}
.pf3opb[disabled]{opacity:.4;cursor:default}
.pf3opf{margin-top:14px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:#fff}
.pf3foot{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:16px;padding-top:12px;border-top:1px solid var(--line2)}
.pf3rm{border:0;background:none;color:#B23A1E;cursor:pointer;font-size:13.5px;padding:6px 0}
.pf3rm:hover{text-decoration:underline}
.pf3closed{border-top:1px solid var(--line2)}.pf3closed > summary{padding:12px 22px;cursor:pointer;color:var(--grey);font-size:13.5px}
.pf3empty{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:24px;padding:8px 22px 22px}
.pf3empty h3{font-family:var(--serif);font-size:22px;margin:2px 0 8px}
.pf3empty ol{margin:0;padding-left:20px;line-height:1.6;font-size:14.5px}
.pf3e2{background:#FBF9F4;border:1px dashed var(--line);border-radius:14px;padding:14px 16px;align-self:start}
.pf3ex{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line2)}.pf3ex:last-child{border-bottom:0}
.pf3ex > span:last-child{display:flex;flex-direction:column}.pf3ex small{color:var(--grey);font-size:12.5px}
.pf3fav{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:0 22px 18px;font-size:13.5px}
.pf3pick{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);background:#fff;border-radius:99px;padding:4px 12px 4px 5px;cursor:pointer;font-size:13.5px}
.pf3pick:hover{border-color:var(--ink)}
.pf3ia .ph{flex-wrap:wrap}
.pf3bdg{font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;background:var(--lime);border-radius:6px;padding:3px 8px}
.pf3par{display:grid;grid-template-columns:minmax(0,2fr) repeat(3,minmax(0,1fr));gap:10px 12px;align-items:end;padding-bottom:12px;border-bottom:1px solid var(--line2)}
.pf3loc{margin-top:14px;font-size:15px;line-height:1.6;max-width:880px}
.pf3loc p{margin:0 0 8px}.pf3h{margin:14px 0 3px!important}
.pf3go{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:16px 0 4px;padding:14px 16px;border:1.5px solid var(--ink);border-radius:14px;background:#FBFDF1}
.pf3go .btn.pf3gob{height:48px;padding:0 22px;font-size:15.5px;font-weight:700;background:var(--lime);color:var(--ink);border:1.5px solid var(--ink)}
.pf3go .btn.pf3gob:hover{background:#B5E21F}
.pf3go .light{font-size:13px;flex:1;min-width:200px}
.pf3res{margin-top:12px}.pf3res p{margin:0 0 7px}
.pf3wait{display:flex;align-items:center;gap:10px;color:var(--grey);margin-top:12px}.pf3wait span{width:16px;height:16px;border-radius:50%;border:2px solid var(--line);border-top-color:var(--ink);animation:pf3sp 1s linear infinite}
@keyframes pf3sp{to{transform:rotate(360deg)}}
.pf3disc{font-size:12.5px;color:var(--grey);margin:14px 0 0;padding:9px 12px;background:var(--soft);border-radius:10px}
.pf3gf p{margin:3px 0 0;color:var(--grey);font-size:13.5px;line-height:1.5}
.pf3tog{display:flex;align-items:center;gap:7px;font-size:13.5px;cursor:pointer}
.pf3tog input{width:18px;height:18px;accent-color:var(--ink)}
.pf3views{margin-top:4px}
.pf3rp{display:grid;grid-template-columns:200px minmax(0,1fr);gap:28px;align-items:center}
.pf3don{width:200px;height:200px;display:block}
.pf3don circle{cursor:default;transition:opacity .15s}.pf3don circle:hover,.pf3don circle:focus{opacity:.8;outline:none}
.pf3dc{font-family:var(--mono);font-size:21px;font-weight:600;fill:var(--ink)}.pf3ds{font-size:10px;fill:var(--grey)}
.pf3leg{display:flex;flex-direction:column}
.pf3lr{display:grid;grid-template-columns:minmax(0,1fr) auto 90px;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--line2);font-size:14px}
.pf3lr:last-child{border-bottom:0}
.pf3lr > a,.pf3lr > span{display:flex;align-items:center;gap:9px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pf3lr > a:hover{text-decoration:underline}
.pf3ll{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.pf3lr i{width:11px;height:11px;border-radius:3px;flex:none}
.pf3lr b{font-family:var(--mono);font-weight:600}.pf3lr small{font-family:var(--mono);color:var(--light);text-align:right;font-size:12.5px}
.pf3sc{display:flex;gap:18px;align-items:center;margin-bottom:10px}
.pf3sc p{margin:0 0 4px;font-size:13.5px}
.pf3scl{font-size:16px!important}
.pf3ring{--p:50;flex:none;width:96px;height:96px;border-radius:50%;background:conic-gradient(var(--ink) calc(var(--p) * 1%),var(--line2) 0);display:grid;place-items:center;position:relative}
.pf3ring::before{content:"";position:absolute;inset:10px;background:#fff;border-radius:50%}
.pf3ring b,.pf3ring small{position:relative;grid-area:1/1}.pf3ring b{font-family:var(--mono);font-size:28px;margin-top:-12px}.pf3ring small{font-size:11px;color:var(--grey);margin-top:28px}
.pf3crit{padding:10px 0;border-top:1px solid var(--line2)}
.pf3ct{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.pf3ct .num{margin-left:auto;font-size:13px}
.pf3crit p{margin:5px 0 0;font-size:12.5px;color:var(--grey);line-height:1.45}
.pf3zone{position:relative;height:6px;border-radius:9px;background:linear-gradient(90deg,var(--g),#E3D9A6 50%,var(--o));margin:8px 0 2px}
.pf3zone i{position:absolute;top:-4px;width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid var(--ink);transform:translateX(-50%)}
.pf3bars{width:100%;max-width:820px;min-width:520px;height:auto;display:block}
.pf3bv{font-family:var(--mono);font-size:11px;fill:var(--ink)}.pf3bl{font-size:11px;fill:var(--grey)}
.pf3cmp{margin-top:10px}.pf3cmp > summary{cursor:pointer;font-weight:600;font-size:14px;padding:6px 0}
.pf3bk{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin-top:8px}
.pf3bk > div{border:1px solid var(--line2);border-radius:10px;padding:8px 10px;display:grid;grid-template-columns:1fr auto;gap:0 8px;font-size:13px}
.pf3bk > div.on{border-color:var(--ink);background:var(--hl)}
.pf3bk b{font-family:var(--mono)}.pf3bk small{grid-column:2;text-align:right;color:var(--grey);font-family:var(--mono)}
.pf3dt td,.pf3dt th{font-size:13px}
.pf3drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:2px dashed var(--line);border-radius:14px;padding:22px;cursor:pointer;background:#fff;text-align:center}
.pf3drop.on,.pf3drop:hover{border-color:var(--ink);background:var(--hl)}
.pf3drop input{position:absolute;width:1px;height:1px;opacity:0}
.pf3drop span{color:var(--grey);font-size:13px}
.pf3how{margin-top:10px;font-size:13.5px;line-height:1.5}.pf3how > summary{cursor:pointer;font-weight:600;padding:4px 0}.pf3how p{margin:6px 0}
.pf3ir{margin-top:12px}.pf3irh{margin:0 0 8px;line-height:1.5}
.pf3it td,.pf3it th{font-size:13px}.pf3itn{display:flex;align-items:center;gap:8px}.pf3itn > span{display:flex;flex-direction:column}.pf3itn small{color:var(--light);font-size:11.5px}.pf3it tr.pf3off td{opacity:.4}
.pf3map{margin-top:12px;padding-top:10px;border-top:1px solid var(--line)}
.pf3note{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:16px;padding:10px 14px;border-radius:12px;border:1px solid #DCEBA6;font-size:13.5px}
.pf3undo{margin-left:10px;background:var(--lime);color:var(--ink);border:0;border-radius:8px;padding:4px 10px;font-weight:700;cursor:pointer}
@media (max-width:980px){.pf3par{grid-template-columns:1fr 1fr}.pf3par > .pf3f:first-child{grid-column:1/-1}}
@media (max-width:760px){
  .pf3k{grid-template-columns:repeat(3,minmax(0,1fr))}.pf3k > div{padding:12px 10px 12px 16px;border-right:1px solid var(--line2)}.pf3k > div:last-child{border-right:0}.pf3k > div.pf3k1{border-right:0;border-bottom:1px solid var(--line2)}.pf3k .kick{font-size:9.5px;letter-spacing:.05em}.pf3k small{font-size:11.5px}
  .pf3k1{grid-column:1/-1}.pf3k b{font-size:16px}.pf3k b.pf3big{font-size:30px}
  .pf3stk{margin:12px 16px}.pf3kn{margin:0 16px 12px}.pf3hero .pf3demo{padding:10px 16px}
  .pf3hd{display:none}
  .pf3rb{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"n v" "n g";gap:2px 10px;padding:12px 16px}
  .pf3n{grid-area:n}.c-v{grid-area:v}.c-g{grid-area:g;flex-direction:row;gap:6px;align-items:baseline}
  .c-q,.c-pru,.c-px,.c-w,.pf3chev{display:none}
  .pf3mq{display:block;color:var(--light);font-size:11.5px;font-family:var(--mono)}
  .c-v b{font-size:15px}
  .pf3det{padding:4px 16px 16px}.pf3facts{grid-template-columns:1fr 1fr}
  .pf3g2{grid-template-columns:1fr}
  .pf3empty{grid-template-columns:1fr;padding:6px 16px 18px}.pf3fav{padding:0 16px 16px}
  .pf3rp{grid-template-columns:1fr;justify-items:center;gap:12px}.pf3leg{width:100%}
  .pf3lr{grid-template-columns:minmax(0,1fr) auto 76px}
  .pf3par{grid-template-columns:1fr 1fr}
  .pf3go{padding:12px}.pf3go .btn.pf3gob{width:100%}
  .pf3sug{max-height:52vh}
  .pf3new,.pf3imp{padding:12px}
  .pf3closed > summary{padding:12px 16px}
  .pf3 .tiles .tile:last-child:nth-child(odd){grid-column:1/-1}
  .pf3fc{min-width:0;width:100%;height:auto;display:block}.pf3bars{min-width:0;max-width:none} /* dessinés en 400 unités sur téléphone : tout tient dans l'écran, sans défilement */
  .pf3fc .pf3bl,.pf3bars .pf3bl,.pf3bars .pf3bv{font-size:10px}
  .pf3dt th:nth-child(2),.pf3dt td:nth-child(2){display:none} /* sur téléphone, la colonne « dernier dividende » cède la place : l'estimation et la date comptent davantage */
  .pf3dt td.l{white-space:normal}
  .pf3ot{display:block}.pf3ot thead{display:none}.pf3ot tbody{display:block}.pf3ot tr{display:grid;grid-template-columns:minmax(0,1fr) auto auto 32px;grid-template-areas:"d q m x" "o p f x";column-gap:12px;row-gap:2px;padding:9px 0;border-bottom:1px solid var(--line2);align-items:center}.pf3ot td{border:0!important;padding:0!important;text-align:right}.pf3ot td:nth-child(1){grid-area:d;text-align:left}.pf3ot td:nth-child(2){grid-area:o;text-align:left;color:var(--grey);font-size:12px}.pf3ot td:nth-child(3){grid-area:q}.pf3ot td:nth-child(4){grid-area:p;color:var(--grey);font-size:12px}.pf3ot td:nth-child(5){grid-area:f;color:var(--grey);font-size:12px}.pf3ot td:nth-child(6){grid-area:m;font-weight:600}.pf3ot td:nth-child(7){grid-area:x}.pf3ot td:nth-child(3)::after{content:" parts"}.pf3ot td:nth-child(4)::before{content:"à "}.pf3ot td:nth-child(5)::before{content:"frais "}.pf3od td:nth-child(3),.pf3od td:nth-child(4),.pf3od td:nth-child(5){visibility:hidden}
}
.pf3steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:14px}
.pf3st{display:grid;grid-template-columns:28px minmax(0,1fr);gap:12px;align-items:start}
.pf3sn2{width:28px;height:28px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;font-family:var(--mono);font-size:13px;font-weight:600;margin-top:4px}
.pf3st .pf3nh{margin:0}
.pf3st .pf3iw{max-width:320px}
.pf3st .pf3g2 .pf3iw{max-width:none}
.pf3sh{display:block;font-size:12.5px;color:var(--grey);margin-top:5px;line-height:1.45}
.pf3pru{margin:16px 0 4px;border:1.5px solid var(--ink);border-radius:14px;background:#fff;padding:12px 16px}
.pf3pk{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}
.pf3pk b{font-family:var(--mono);font-size:26px;font-weight:600;letter-spacing:-.02em}
.pf3pd{margin:6px 0 0;font-size:13.5px;line-height:1.5}
.pf3pv{display:flex;flex-wrap:wrap;gap:6px 24px;margin-top:10px;padding-top:10px;border-top:1px solid var(--line2)}
.pf3pv span{display:flex;flex-direction:column;font-size:12px;color:var(--grey)}.pf3pv b{font-family:var(--mono);font-size:15px;color:var(--ink)}.pf3pv b.up{color:var(--up)}.pf3pv b.down{color:var(--down)}
.pf3pm{margin:8px 0 0;font-size:13px}
.pf3opt{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:10px 12px;margin-top:14px}
.pf3hd .def{font:inherit;letter-spacing:inherit;text-transform:inherit;color:inherit}
.pf3verd{display:flex;flex-wrap:wrap;gap:8px;padding:0 22px 14px}
.pf3verd a{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);border-radius:99px;padding:5px 12px;font-size:13px;background:#fff}
.pf3verd a:hover{border-color:var(--ink)}.pf3verd .dot{width:9px;height:9px}
.pf3defs{border-top:1px solid var(--line2)}
.pf3defs > summary{padding:11px 22px;cursor:pointer;font-weight:600;font-size:14px}
.pf3dg{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1px;background:var(--line2);border-top:1px solid var(--line2)}
.pf3dg > div{background:#FCFBF8;padding:12px 22px}
.pf3dg b{font-size:14px}.pf3dg p{margin:4px 0 0;font-size:13px;line-height:1.45;color:var(--grey)}
.pf3dx{color:var(--ink)!important}.pf3dx span{font-family:var(--mono);font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--light);margin-right:4px}
@media (max-width:760px){.pf3opt{grid-template-columns:1fr}.pf3verd{padding:0 16px 12px}.pf3defs > summary{padding:11px 16px}.pf3dg > div{padding:12px 16px}.pf3st .pf3iw{max-width:none}}
.pf3irh p{margin:0 0 4px;line-height:1.5}
.pf3tagk{display:inline-block;font-size:11.5px;font-weight:600;background:var(--soft);border:1px solid var(--line);border-radius:99px;padding:1px 8px;margin-left:4px;vertical-align:1px}
.pf3isec{margin:14px 0 6px}
.pf3ish{display:flex;align-items:baseline;gap:10px;margin-bottom:6px}
.pf3ish h3{font-size:15px;margin:0}
.pf3ish span{font-size:12.5px}
.pf3inote{background:var(--hl);border:1px solid var(--line);border-radius:10px;padding:9px 12px;font-size:13px;line-height:1.5;margin:0 0 8px}
.pf3ipl{list-style:none;margin:0;padding:0;border:1px solid var(--line);border-radius:12px;background:var(--card);overflow:hidden}
.pf3ip{display:grid;grid-template-columns:30px minmax(0,1fr) auto;align-items:center;gap:4px 8px;padding:9px 12px;border-top:1px solid var(--line2)}
.pf3ip:first-child{border-top:0}
.pf3ip:not(.on) .pf3ipn,.pf3ip:not(.on) .pf3ipv{opacity:.45}
.pf3ipc input{width:18px;height:18px;accent-color:var(--ink);cursor:pointer}
.pf3ipn{display:flex;align-items:center;gap:8px;min-width:0}
.pf3ipn > span{display:flex;flex-direction:column;min-width:0}
.pf3ipn b{font-size:14px;overflow-wrap:anywhere}
.pf3ipn small{color:var(--light);font-size:11.5px;line-height:1.35;overflow-wrap:anywhere}
.pf3ipv{display:grid;grid-template-columns:repeat(3,minmax(78px,auto));gap:12px;text-align:right;font-family:var(--mono);font-size:13px}
.pf3ipv > span{display:flex;flex-direction:column}
.pf3ipv i{font-style:normal;font-family:var(--sans);font-size:10.5px;color:var(--light);text-transform:uppercase;letter-spacing:.04em}
.pf3ipv small{font-family:var(--sans);font-size:10.5px;color:var(--light)}
.pf3ipa{grid-column:2/-1;font-size:12.5px;color:#8A3A12;line-height:1.45}
.pf3ipa p{margin:2px 0}
.pf3ipa p::before{content:"À vérifier : ";font-weight:600}
.pf3ipru{max-width:320px;margin-top:6px}
.pf3ip.amb{background:#FFFBF2}
.pf3isum{font-size:13px;margin:8px 2px 0;color:var(--grey)}
.pf3isum b{color:var(--ink)}
.pf3isold ul,.pf3iamb ul,.pf3ichecks ul{margin:6px 0 0;padding-left:18px}
.pf3isold li,.pf3iamb li,.pf3ichecks li{margin:4px 0}
.pf3ichecks ul{list-style:none;padding-left:0}
.pf3ichecks li{padding-left:22px;position:relative}
.pf3ichecks li::before{position:absolute;left:0;top:0;font-weight:700}
.pf3ichecks li.ok::before{content:"✓";color:var(--up)}
.pf3ichecks li.ko::before{content:"!";color:var(--down)}
.pf3ichecks li.i::before{content:"i";color:var(--light);font-style:italic}
.pf3ichk{display:flex;gap:8px;align-items:flex-start;font-size:13px;margin:6px 0 0;cursor:pointer;line-height:1.45}
.pf3ichk input{margin-top:2px;accent-color:var(--ink)}
.pf3iconf{background:var(--hl);border:1px solid var(--line);border-radius:10px;padding:9px 12px;margin-top:10px}
@media (max-width:760px){
  .pf3ip{grid-template-columns:26px minmax(0,1fr);padding:10px}
  .pf3ipv{grid-column:2/-1;grid-template-columns:repeat(3,minmax(0,1fr));text-align:left;gap:8px}
}
</style>`);
}

/* La page a pu être affichée par l'ancienne version si les données sont arrivées avant ce module : on la refait. */
if (typeof document !== "undefined" && typeof location !== "undefined" && location.pathname.replace(/\/+$/, "") === "/portefeuille" && typeof R !== "undefined" && R && document.getElementById("pflines") && !document.getElementById("pf3")) pagePortefeuille();
