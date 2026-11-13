export const JOUR = 864e5;
export const num = v => typeof v === "number" && isFinite(v) ? v : (typeof v === "string" && v.trim() !== "" && isFinite(+v) ? +v : null);
export const addJ = (ymd, n) => new Date(Date.parse(ymd + "T12:00:00Z") + n * JOUR).toISOString().slice(0, 10);
export const jsem = ymd => new Date(ymd + "T12:00:00Z").getUTCDay();
export const ouvre = ymd => { const w = jsem(ymd); return w >= 1 && w <= 5; };
export const seancePrecedente = ymd => { let d = addJ(ymd, -1); while (!ouvre(d)) d = addJ(d, -1); return d; };
export function lundiDe(semaine) {
  const m = /^(\d{4})-W(\d{2})$/.exec(semaine || ""); if (!m) return null;
  const j4 = Date.UTC(+m[1], 0, 4), w = (new Date(j4).getUTCDay() + 6) % 7;
  return new Date(j4 - w * JOUR + (+m[2] - 1) * 7 * JOUR).toISOString().slice(0, 10);
}
export function variationSemaine(cs, k, lundi, auj, live, semPrec) {
  const fin = addJ(lundi, 6), s = cs && cs.items && cs.items[k], dates = (cs && cs.dates) || [];
  let pts = [], partiel = false;
  if (s) {
    let iRef = -1; for (let i = 0; i < dates.length; i++) if (dates[i] < lundi && s[i] != null) iRef = i;
    const dans = []; for (let i = 0; i < dates.length; i++) if (dates[i] >= lundi && dates[i] <= fin && s[i] != null) dans.push(i);
    if (iRef < 0 && dans.length) { iRef = dans.shift(); partiel = true; }
    if (iRef >= 0) pts = [[dates[iRef], s[iRef]], ...dans.map(i => [dates[i], s[i]])];
  }
  if (!pts.length && semPrec && num(semPrec.items && semPrec.items[k]) > 0) pts = [[semPrec.date || null, semPrec.items[k]]]; // ancien fichier semaine.json
  if (!pts.length) return null;
  if (live && num(live.p) > 0 && auj && auj >= lundi && auj <= fin) { // semaine en cours : on ajoute le cours du moment
    const seance = ouvre(auj) ? auj : seancePrecedente(auj), der = pts[pts.length - 1][0];
    if (!der || der < seance) pts.push([seance, live.p]);
  }
  if (pts.length < 2) return null;
  const a = pts[0][1], b = pts[pts.length - 1][1];
  if (!(a > 0) || !(b > 0)) return null;
  const pct = r2((b / a - 1) * 100);
  if (Math.abs(pct) > 80) return null; // garde-fou : cours mal lu (unité, division d'actions)
  return { pct, serie: pts.map(p => p[1]), dates: pts.map(p => p[0]), du: pts[0][0], au: pts[pts.length - 1][0], partiel };
}
export const INDICES = { cac40: "CAC 40", stoxx50: "Euro Stoxx 50", stoxx600: "Stoxx Europe 600", sp500: "S&P 500", nasdaq100: "Nasdaq 100", dax: "DAX", ftse100: "FTSE 100", nikkei: "Nikkei 225" };
export const SECTEURS = { conso: "Consommation", industrie: "Industrie", energie: "Énergie", sante: "Santé", tech: "Technologie", finance: "Banque et assurance",
  telecom: "Télécoms et médias", materiaux: "Matériaux", services: "Services aux collectivités", immo: "Immobilier" };
export const r2 = v => Math.round(v * 100) / 100;

export function clotures(hist, n = 15) {
  const parSeance = {};
  // Depuis le 1/11/2026, chaque copie est rangée à la date de la séance qu'elle contient (data/cours_fetch.mjs) ; une date de week-end éventuelle compte pour le vendredi
  for (const d of Object.keys(hist || {}).sort()) if (/^\d{4}-\d{2}-\d{2}$/.test(d)) parSeance[ouvre(d) ? d : seancePrecedente(d)] = hist[d];
  const dates = Object.keys(parSeance).sort().slice(-n), keys = new Set();
  dates.forEach(d => Object.keys(parSeance[d] || {}).forEach(k => keys.add(k)));
  const items = {};
  for (const k of keys) {
    const s = dates.map(d => { const v = (parSeance[d] || {})[k]; return typeof v === "number" && isFinite(v) && v > 0 ? Math.round(v * 1e4) / 1e4 : null; });
    if (s.some(v => v != null)) items[k] = s;
  }
  return { dates, items };
}
