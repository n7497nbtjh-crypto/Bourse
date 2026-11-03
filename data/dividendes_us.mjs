// Dividendes annoncés des entreprises américaines suivies (3/11/2026, Romain : « 27 dividendes sur le site, c'est ridicule »).
// Source : calendrier des dividendes publié par Nasdaq (api.nasdaq.com/api/calendar/dividends?date=…), qui liste chaque jour
// les dividendes déclarés par les sociétés cotées aux États-Unis : date de détachement (ex-date), date de versement, montant.
// Seules les entreprises suivies par le site dont le cours affiché est coté aux États-Unis sont gardées : les certificats
// américains (ADR) d'entreprises suivies sur leur Bourse d'origine sont écartés (montant et dates différents).
// Aux États-Unis le règlement se fait en J+1 : la date d'enregistrement tombe le jour du détachement ; on garde donc
// le détachement et le versement. Les entreprises dont le calendrier officiel est déjà relevé (data/agenda) sont laissées de côté.
// Résultat : cf/site/data/agenda-dividendes.json ({ updated, source, events: [{ id, date, type, label, source }] }).
// Usage : node data/dividendes_us.mjs [--jours 75]
import { readFileSync, writeFileSync } from "node:fs";
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? +process.argv[i + 1] || d : d; };
const JOURS = arg("--jours", 75), UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const SRC = "https://www.nasdaq.com/market-activity/dividends";
const S = JSON.parse(readFileSync("cf/site/data/societes.json", "utf8")), C = S.companies || S;
const officiel = new Set(JSON.parse(readFileSync("cf/site/data/agenda.json", "utf8")).events.filter(e => e.type === "Dividende").map(e => e.id));
// Cotée aux États-Unis : région US, ou cours suivi par le site sur une Bourse américaine (tv « NYSE:… », « NASDAQ:… ») ;
// dans ce cas le dividende de cette cotation est celui que touche l'acheteur au cours affiché (montant par certificat).
const usa = c => c.region === "US" ? c.ticker : /^(NYSE|NASDAQ|AMEX):/.test(c.tv || "") ? String(c.tv).split(":")[1] : null;
const parTicker = new Map(C.filter(c => usa(c) && !officiel.has(c.id)).map(c => [String(usa(c)).toUpperCase().replace(/\./g, "-"), c]));
const iso = d => { const m = String(d || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[1]}-${m[2]}` : null; };
const montant = v => (+v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + " $";
const pause = ms => new Promise(r => setTimeout(r, ms));
const today = new Date(); today.setUTCHours(0, 0, 0, 0);
const ev = new Map(); let jours = 0, pannes = 0, lignes = 0;
for (let i = -30; i < JOURS; i++) { // 30 jours en arrière : détachements passés dont le versement est encore à venir
  const d = new Date(today.getTime() + i * 864e5); if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
  const j = d.toISOString().slice(0, 10);
  try {
    const r = await fetch(`https://api.nasdaq.com/api/calendar/dividends?date=${j}`, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const rows = ((await r.json()).data?.calendar?.rows) || []; jours++; lignes += rows.length;
    for (const x of rows) {
      const c = parTicker.get(String(x.symbol || "").toUpperCase().replace(/\./g, "-")); if (!c) continue;
      const ex = iso(x.dividend_Ex_Date), pay = iso(x.payment_Date), amt = +x.dividend_Rate; if (!ex || !(amt > 0)) continue;
      const k = c.id + "|" + ex, lab = `(${montant(amt)})`;
      ev.set(k + "|d", { id: c.id, date: ex, type: "Dividende", label: `Détachement du dividende ${lab}`, source: SRC });
      if (pay && pay >= ex) ev.set(k + "|p", { id: c.id, date: pay, type: "Dividende", label: `Paiement du dividende ${lab}`, source: SRC });
    }
  } catch (e) { pannes++; console.log("panne", j, e.message); }
  await pause(400);
}
const T0 = today.toISOString().slice(0, 10), events = [...ev.values()].filter(e => e.date >= T0 || [...ev.values()].some(x => x.id === e.id && x.date >= T0)).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
if (!jours) { console.log("Aucun jour lu : fichier laissé tel quel."); process.exit(0); }
writeFileSync("cf/site/data/agenda-dividendes.json", JSON.stringify({ updated: new Date().toISOString(), source: "Nasdaq, calendrier des dividendes", events }));
console.log(`${jours} jours lus (${pannes} pannes), ${lignes} lignes, ${new Set(events.map(e => e.id)).size} entreprises suivies, ${events.length} dates.`);
