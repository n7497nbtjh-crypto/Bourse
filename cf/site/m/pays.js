/* ---------- Europe francophone (2/11/2026) : le pays du visiteur ----------
   France (par défaut), Belgique, Suisse, Luxembourg. Choix mémorisé sur l'appareil (bilan.pays), visible en haut
   d'« Apprendre » et de l'Académie. Hors France :
   - les leçons propres à la France (livrets, PEA, assurance-vie, flat tax…) sont remplacées par celles du pays
     (cf/site/data/academie-pays.json, sources officielles datées) ; les leçons universelles ne changent pas ;
   - « L'impôt selon le compte » devient un calcul simplifié pour le pays ; « Livret A ou Bourse » prévient que
     le Livret A est français et renvoie à l'équivalent ; la pastille PEA des fiches est masquée.
   Styles : site.css, bloc « Pays ». */
const PAYS = { fr: ["France", "🇫🇷", "en France", "la France"], be: ["Belgique", "🇧🇪", "en Belgique", "la Belgique"], ch: ["Suisse", "🇨🇭", "en Suisse", "la Suisse"], lu: ["Luxembourg", "🇱🇺", "au Luxembourg", "le Luxembourg"],
  ca: ["Canada", "🇨🇦", "au Canada", "le Canada"], de: ["Allemagne", "🇩🇪", "en Allemagne", "l'Allemagne"], it: ["Italie", "🇮🇹", "en Italie", "l'Italie"], es: ["Espagne", "🇪🇸", "en Espagne", "l'Espagne"] }; // 4/11 : Canada, Allemagne, Italie, Espagne
// 3/11 : le PEA n'existe que pour les personnes domiciliées en France. frSeul() vaut vrai si le visiteur a choisi la France,
// ou, sans choix, si Cloudflare le situe en France (ou pays inconnu). Choix « autre » : pays hors de la liste.
// html[data-fr="0"] masque tout élément .fr-seul (site.css, bloc « Pays ») ; posé dès le <head> (index.html) pour éviter un clignement.
const frSeul = () => { let p = null; try { p = localStorage.getItem("bilan.pays"); } catch (e) { } const ip = document.documentElement.dataset.paysIp; return p ? p === "fr" : (!ip || ip === "fr"); };
const paysPose = () => document.documentElement.setAttribute("data-fr", frSeul() ? "1" : "0");
paysPose();
// Texte écrit pour un Français (« …, dans un PEA. ») : hors de France, la proposition qui parle du PEA est retirée.
const sansPea = t => !t || frSeul() ? t : String(t).replace(/,[^,.]*\bPEA\b[^,.]*(?=\.)/g, "").replace(/[^.]*\bPEA\b[^.]*\.\s*/g, "").trim();
let PAYS_DATA = null;
const paysGet = () => { const ip = document.documentElement.dataset.paysIp; const d = PAYS[ip] ? ip : "fr"; try { const p = localStorage.getItem("bilan.pays"); return PAYS[p] ? p : p === "autre" ? "fr" : d; } catch (e) { return d; } }; // « autre » : leçons générales (françaises), PEA masqué // choix mémorisé, sinon le pays d'où l'on visite (Cloudflare), sinon la France
function paysCharger() { return PAYS_DATA ? Promise.resolve(PAYS_DATA) : fetch("/data/academie-pays.json").then(r => r.json()).then(j => PAYS_DATA = j).catch(() => null); }
function paysAppliquer(aca, pd, p) { // remplace, dans l'Académie chargée, les leçons propres à la France par celles du pays
  if (!aca || !pd || p === "fr" || !pd.pays[p] || aca._pays === p) return aca;
  const P = pd.pays[p], L = P.lecons, fr = pd.fr_seul;
  aca._pays = p;
  aca.modules.forEach(m => {
    const out = fr[m.id] || []; if (!out.length) return;
    const garde = m.lecons.filter(l => !out.includes(l.id));
    if (m.id === "bases") { const i = m.lecons.findIndex(l => l.id === "epargne-precaution"); m.lecons = garde; if (L["epargne-precaution"]) m.lecons.splice(Math.max(0, i), 0, L["epargne-precaution"]); }
    else if (m.id === "placements") { m.titre = `Les placements disponibles ${P.en}`; m.lecons = [...Object.keys(L).filter(k => !["epargne-precaution", "fiscalite", "arnaques"].includes(k)).map(k => L[k]), ...garde]; if (P.quiz) m.quiz = P.quiz; m.intro = `L'épargne pour la retraite, le compte-titres et leurs règles ${P.en} en 2026, avec leurs sources officielles. Les leçons sur les actions, les obligations et les ETF valent partout.`; m.objectifs = [`Connaître les comptes et les avantages fiscaux disponibles ${P.en}`, "Distinguer le compte qui contient les titres des titres eux-mêmes", "Comprendre le fonctionnement des actions, obligations et ETF"]; }
    else if (m.id === "frais-fiscalite") { m.lecons = [...garde, L.fiscalite].filter(Boolean); m.quiz = (m.quiz || []).filter(q => !/PEA|Livret|assurance-vie|flat|PFU|31,4|IFU|prélèvements sociaux/i.test(JSON.stringify(q))); }
    else if (m.id === "psychologie") { m.lecons = m.lecons.map(l => l.id === "arnaques" && L.arnaques ? L.arnaques : l); }
    m.lecons.forEach(l => { if (L[l.id] === l) l.pays = p; });
  });
  return aca;
}
function paysInitAcademie() { // branché sur le chargement de l'Académie (ACA / ACAP, app.js)
  const p = paysGet(); document.documentElement.dataset.pays = p;
  if (p === "fr") return;
  const base = ACA ? Promise.resolve(ACA) : (ACAP || fetch("/data/academie.json").then(r => r.json()).then(j => ACA = j).catch(() => null));
  ACAP = Promise.all([base, paysCharger()]).then(([a, pd]) => { ACA = paysAppliquer(a, pd, p); return ACA; });
}
function paysChoisir(p) {
  if (!PAYS[p] && p !== "autre") return; try { localStorage.setItem("bilan.pays", p); } catch (e) { }
  paysPose(); paysPied(); ACA = null; ACAP = null; paysInitAcademie();
  if (typeof route === "function") route(); else location.reload();
}
const paysChoix = () => { let p = null; try { p = localStorage.getItem("bilan.pays"); } catch (e) { } if (PAYS[p] || p === "autre") return p; const ip = document.documentElement.dataset.paysIp; return PAYS[ip] ? ip : ip && ip !== "fr" ? "autre" : "fr"; };
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest(".pays-bar [data-pays],.pays-pied [data-pays]"); if (b) { e.preventDefault(); paysChoisir(b.dataset.pays); } });
function paysPied() { // pied de page, sur toutes les pages : le pays détecté, modifiable en un clic
  const f = document.querySelector("footer .f"); if (!f) return; const p = paysChoix(), L = [...Object.entries(PAYS), ["autre", ["Autre pays", "🌍"]]];
  let el = f.querySelector(".pays-pied"); if (!el) { el = document.createElement("div"); el.className = "pays-pied"; el.setAttribute("role", "group"); el.setAttribute("aria-label", "Votre pays"); f.appendChild(el); }
  el.innerHTML = `<span>Vous investissez depuis :</span>${L.map(([k, [n, d]]) => `<button type="button" data-pays="${k}" class="${k === p ? "on" : ""}" aria-pressed="${k === p}"><i aria-hidden="true">${d}</i>${n}</button>`).join("")}`;
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paysPied); else paysPied();

/* ---------- Calcul simplifié de l'impôt, hors France (remplace « PEA ou compte-titres ») ---------- */


