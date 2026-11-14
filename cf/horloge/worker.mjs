// Horloge des robots d'ENKLAIR (14/11/2026). GitHub lance ses robots programmés avec des heures de retard, ou pas du tout.
// Ce petit programme Cloudflare tourne chaque minute et demande à GitHub de lancer chaque robot à son heure exacte
// (même horaire que dans .github/workflows, en heure UTC), plus le robot « réveil » toutes les demi-heures en filet de sécurité.
// Il a besoin d'un seul secret, GH_TOKEN : jeton GitHub limité au dépôt Bourse, droit « Actions » en lecture et écriture.
// Créé et collé par Romain dans Cloudflare ; ce code ne le lit que pour l'envoyer à GitHub.
const DEPOT = "n7497nbtjh-crypto/Bourse";
export const HORAIRES = {
  "actu.yml": ["41 1,4,7,10,13,16,19,22 * * *"],
  "ancres.yml": ["10 1 * * *"],
  "donnees.yml": ["17 5 * * *", "47 7 * * *", "47 10 * * *"],
  "esef-sites.yml": ["40 2 * * 2,5"],
  "etat.yml": ["5 6 * * *", "35 8 * * *", "35 11 * * *"],
  "etf-hist.yml": ["17 5 * * 6"],
  "etf.yml": ["41 4 * * 1"],
  "eulerpool.yml": ["37 4 * * 2"],
  "facteurs.yml": ["41 4 9 * *"],
  "logos.yml": ["40 2 * * *"],
  "og.yml": ["10 4 * * 0"],
  "rapports-site.yml": ["10 3 * * 3"],
  "reveil.yml": ["7,37 * * * *"],
  "trim-eu.yml": ["20 3 * * 2-6"],
  "wikidata.yml": ["17 3 3 * *"],
};
// Un champ de cron (« * », « 5 », « 1,4,7 », « 2-6 », « */30 ») contient-il la valeur v ?
function champ(c, v) {
  return c.split(",").some(p => {
    if (p === "*") return true;
    const [r, pas] = p.split("/"), s = pas ? +pas : 1;
    const [a, b] = r === "*" ? [0, 99] : r.includes("-") ? r.split("-").map(Number) : [+r, pas ? 99 : +r];
    return v >= a && v <= b && (v - a) % s === 0;
  });
}
export function aLancer(d) {
  const t = [d.getUTCMinutes(), d.getUTCHours(), d.getUTCDate(), d.getUTCMonth() + 1, d.getUTCDay()];
  return Object.entries(HORAIRES).filter(([, L]) => L.some(c => c.trim().split(/\s+/).every((x, i) => champ(x, t[i])))).map(([f]) => f);
}
async function lancer(f, env) {
  const r = await fetch(`https://api.github.com/repos/${DEPOT}/actions/workflows/${f}/dispatches`, {
    method: "POST", body: JSON.stringify({ ref: "main" }),
    headers: { authorization: `Bearer ${env.GH_TOKEN}`, accept: "application/vnd.github+json", "user-agent": "enklair-horloge", "x-github-api-version": "2022-11-28" } });
  return r.status;
}
export default {
  async scheduled(ev, env, ctx) {
    if (!env.GH_TOKEN) return console.log("GH_TOKEN absent : aucun robot lancé");
    for (const f of aLancer(new Date(ev.scheduledTime))) console.log(f, await lancer(f, env)); // 204 = lancé
  },
  // Page de contrôle, sans rien lancer : jeton présent ou non, accepté par GitHub ou non, robots de la prochaine heure
  async fetch(req, env) {
    let jeton = "absent";
    if (env.GH_TOKEN) { const r = await fetch(`https://api.github.com/repos/${DEPOT}/actions/workflows`, { headers: { authorization: `Bearer ${env.GH_TOKEN}`, accept: "application/vnd.github+json", "user-agent": "enklair-horloge" } }); jeton = r.ok ? "accepté par GitHub" : "refusé par GitHub (" + r.status + ")"; }
    const now = Date.now(), prochains = [];
    for (let m = 1; m <= 60; m++) { const d = new Date(Math.floor(now / 6e4 + m) * 6e4); for (const f of aLancer(d)) prochains.push(d.toISOString().slice(11, 16) + " UTC " + f); }
    return Response.json({ horloge: "en marche", jeton, prochains });
  },
};
