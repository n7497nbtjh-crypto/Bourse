/* Module « actu » d'ENKLAIR : chargé après le script principal de index.html.
   Les fonctions déclarées ici remplacent celles du même nom (déclarations function, jamais const/let pour un nom existant).
   Données : /data/actu/fil.json (fil récent), /data/actu/c/<id>.json (une entreprise, 90 jours), /data/actu/j/<jour>.json (un jour).
   Fonctions fournies aux autres modules : actuFicheCourt(el, s), actuFicheDetail(el, s), actuBandeau(el), actuBandeauHTML(),
   presseBlock(el, opts), newsBlock(el, opts), actuCo(id) (promesse des données d'une entreprise). */
const ACTU_CAT = {
  resultats: { l: "Résultats", c: "#1E6FD9", why: "L'entreprise publie ses ventes et ses bénéfices de la période. C'est en général l'annonce qui fait le plus bouger le cours." },
  rapport: { l: "Rapport annuel", c: "#5B4FC4", why: "Le document complet de l'année : comptes audités, risques, rémunérations. C'est la source des chiffres du site." },
  dividende: { l: "Dividende", c: "#1E8A52", why: "Montant et dates du dividende. Pour le recevoir, il faut détenir l'action la veille de la date de détachement." },
  operation: { l: "Acquisition, OPA", c: "#C2410C", why: "Achat, vente ou rapprochement d'entreprises. À regarder : le prix payé et son financement (trésorerie, dette, nouvelles actions)." },
  dirigeants: { l: "Direction", c: "#7C3A8F", why: "Changement à la tête de l'entreprise ou au conseil d'administration. Un départ soudain du directeur général est suivi de près." },
  assemblee: { l: "Assemblée", c: "#8A6D1E", why: "Les actionnaires votent les comptes, le dividende et les administrateurs. Chaque actionnaire peut voter." },
  emission: { l: "Émission, financement", c: "#0E7490", why: "L'entreprise lève de l'argent : nouvelles actions (la part de chaque actionnaire baisse) ou emprunt (la dette augmente)." },
  contrat: { l: "Contrat", c: "#3F6212", why: "Un contrat ou une commande que l'entreprise juge important pour son activité." },
  incident: { l: "Incident", c: "#B42318", why: "L'entreprise signale un incident important, par exemple une attaque informatique." },
  rachat: { l: "Rachat d'actions", c: "#8A857D", routine: 1, why: "L'entreprise rachète ses propres actions. Déclaration obligatoire, souvent hebdomadaire : rarement une nouvelle en soi." },
  capital: { l: "Actionnariat", c: "#8A857D", routine: 1, why: "Nombre d'actions, droits de vote ou franchissement de seuil par un actionnaire. Publication obligatoire, rarement importante." },
  initie: { l: "Dirigeant", c: "#8A857D", routine: 1, why: "Un dirigeant a acheté ou vendu des actions de l'entreprise. Publication obligatoire." },
  agenda: { l: "Calendrier", c: "#8A857D", routine: 1, why: "Date d'une prochaine publication ou d'une présentation aux investisseurs." },
  autre: { l: "Communiqué", c: "#5F5B55", why: "Communiqué officiel de l'entreprise." },
};
const ACTU_SRC = { amf: "AMF", sec: "SEC", nasdaq: "Nasdaq Nordic", oslo: "Oslo Børs", nsm: "FCA (NSM)" };
const ACTU_LANG = { en: "en anglais", sv: "en suédois", fi: "en finnois", da: "en danois", no: "en norvégien", de: "en allemand", es: "en espagnol", it: "en italien", nl: "en néerlandais", is: "en islandais" };
const ACTU_MEM = {};
/* styles : voir site.css */

/* ---------- Chargement (avec délai maximal : jamais de « Chargement… » sans fin) ---------- */
// Titres de presse collectés avec des entités HTML (&#xE9;…) : décodés une fois, au chargement (le collecteur data/actu.mjs les décode désormais lui-même)
const actuDec = s => typeof s !== "string" || s.indexOf("&") < 0 ? s : s.replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d)).replace(/&(amp|quot|apos|nbsp);/g, (m, k) => ({ amp: "&", quot: '"', apos: "'", nbsp: " " }[k]));
function actuDecodeTitres(j) { if (j && Array.isArray(j.p)) j.p.forEach(a => { if (a) a.t = actuDec(a.t); }); return j; }
function actuGet(u, ms = 8000) {
  if (ACTU_MEM[u]) return ACTU_MEM[u];
  const ctl = typeof AbortController !== "undefined" ? new AbortController() : null, t = setTimeout(() => ctl && ctl.abort(), ms);
  const p = fetch(u, ctl ? { signal: ctl.signal } : {}).then(r => r.ok ? r.json() : null).then(actuDecodeTitres).catch(() => null).finally(() => clearTimeout(t));
  ACTU_MEM[u] = p; p.then(j => { if (!j) delete ACTU_MEM[u]; });
  return p;
}
function actuFil() { return actuGet("/data/actu/fil.json").then(j => j || { o: [], p: [], sources: [], jours: [] }); }
function actuCo(id) { return actuGet(`/data/actu/c/${encodeURIComponent(id)}.json`).then(j => j || { id, o: [], p: [] }); }
const actuJour = d => actuGet(`/data/actu/j/${d}.json`).then(j => (j && j.o) || []);

/* ---------- Rendu d'une annonce ---------- */
// L'essentiel (30/10) : jamais un dépôt sans contenu (« FORM 6-K », communiqué sans chiffres ni lecture), ni les votes d'assemblée
const actuVide = it => /^FORM \d|^6-K$|^8-K$/i.test(String(it.t || "").trim()) || ((it.c === "communique" || it.c === "autre") && !(it.f || []).length && !(it.r || []).length && !(it.x && it.x.c) && (!it.t || /^(Communiqué|Information importante|FORM)/i.test(it.t)));
const actuImp = it => !(ACTU_CAT[it.c] || {}).routine && it.i >= 1 && !actuVide(it) && it.c !== "assemblee";
const actuType = (it, f) => f === "tout" ? true : f === "imp" ? actuImp(it) : f === "operation" ? it.c === "operation" || it.c === "contrat" : it.c === f;

/* ---------- Presse ---------- */
function presseHTML(items, max = 8) {
  const dec = x => String(x || "").replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d)).replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&");
  const L = (items || []).map(a => ({ t: dec(a.t || a.title), u: a.u || a.url, s: a.s || a.site || "", d: a.d || a.date || "", l: a.l || (a.lang === "French" ? "fr" : a.lang === "English" ? "en" : "") })).filter(a => a.t && a.u);
  if (!L.length) return `<div class="ax-empty" style="padding:6px 0">Aucun article récent repéré dans les médias suivis.</div>`;
  return `<div class="press">${L.slice(0, max).map(a => `<a class="ax-pr" href="${esc(a.u)}" target="_blank" rel="noopener nofollow"><span class="pt">${esc(a.t)}</span><span class="pm">${esc(String(a.s).replace(/^www\./, ""))}${a.l ? ` · ${esc(a.l.toUpperCase())}` : ""}${a.d ? ` · ${dShort(a.d)}` : ""}</span></a>`).join("")}</div>`;
}
const ACTU_PNOTE = `<p class="note" style="margin-top:6px">Titres repérés par le site dans des médias reconnus (index ouvert GDELT, flux de BBC News). L'article se lit chez l'éditeur ; le site n'en reprend pas le texte.</p>`;
function presseBlock(el, { id = null, sujet = null, max = 8 } = {}) {
  if (!el) return;
  el.innerHTML = `<div class="muted" style="font-size:13px">Chargement…</div>`;
  const fin = L => { el.innerHTML = presseHTML(L, max) + (L.length ? ACTU_PNOTE : ""); };
  const secours = () => { // la route du serveur (GDELT en direct), avec délai maximal
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 7000);
    return fetch(`/api/presse?${id ? "id=" + encodeURIComponent(id) : "sujet=" + sujet}`, { signal: ctl.signal }).then(r => r.ok ? r.json() : { items: [] }).then(j => j.items || []).catch(() => []).finally(() => clearTimeout(t));
  };
  let collecte = false; // le fichier de l'entreprise existe : la collecte est passée, inutile d'interroger GDELT en direct
  const p = id ? actuGet(`/data/actu/c/${encodeURIComponent(id)}.json`).then(j => { collecte = !!j; return (j && j.p) || []; }) : actuFil().then(j => (j.p || []).filter(a => sujet === "monde" ? a.l !== "fr" : a.l === "fr" || sujet !== "marches"));
  p.then(L => L.length || collecte ? L : secours()).then(fin).catch(() => fin([]));
}

/* ---------- Bloc d'annonces réutilisable (compatible avec les appels existants) ---------- */

/* ---------- Fiche entreprise : bloc court (colonne latérale) et onglet détaillé ---------- */
// Aucune annonce collectée : dernières publications officielles connues (comptes annuels) et lien vers l'entreprise

/* ---------- Accueil : « Ce qui se passe dans les entreprises » ---------- */

/* ---------- Page /actualites ---------- */
function actuStats(L) { // « Les chiffres à retenir », calculés sur les annonces affichées
  const res = L.filter(x => x.c === "resultats"), g = [];
  for (const x of res) { const v = (x.f || []).find(([l]) => /^(Ventes|Chiffre d'affaires)/.test(l)); const m = v && v[1].match(/\(([+−-])\s?(\d+(?:,\d+)?)\s?%/); /* « (+2,5 % sur un an) » : l'ancien motif exigeait « %) » (3/11) */ if (m) g.push((m[1] === "+" ? 1 : -1) * parseFloat(m[2].replace(",", "."))); }
  const up = g.filter(v => v > 0).length, med = g.length ? median(g) : null;
  return [
    [F0.format(L.length), "annonces", "sur la période affichée"],
    [F0.format(res.length), "publications de résultats", `${new Set(res.map(x => x.id)).size} entreprises`],
    g.length >= 3 ? [`${Math.round(up / g.length * 100)} %`, "ont des ventes en hausse", `médiane ${med > 0 ? "+" : ""}${F1.format(med)} % sur un an (${g.length} annonces chiffrées)`, up / g.length >= 0.5 ? "up" : "dn"] : [F0.format(L.filter(x => x.c === "dividende").length), "annonces de dividende", "montants et dates"],
    [F0.format(L.filter(x => x.c === "operation").length + L.filter(x => x.c === "dirigeants" && x.i >= 3).length), "acquisitions, OPA ou changements de dirigeant", "à lire en priorité"],
  ];
}
// pageActus : m/actu4.js (Actualité v4, 3/11/2026)

// « Expliquer en clair » : rédigé par l'IA connectée du visiteur (m/monia.js) à partir des faits de l'annonce ; sinon, les phrases calculées restent affichées.
/* Ce que l'IA reçoit avec une annonce officielle : les faits de la fiche de l'entreprise (comptes, repères, rivales). */
async function actuFicheContexte(id) {
  const s = typeof RBY !== "undefined" ? RBY[id] : null; if (!s) return {};
  let full = typeof FULL !== "undefined" ? FULL[id] : null;
  if (!full) { try { full = await (await fetch(`/data/societes/${id}.json`)).json(); if (typeof FULL !== "undefined") FULL[id] = full; } catch (e) { full = null; } }
  try { if (typeof loadAna === "function") await loadAna(); } catch (e) { }
  const out = {};
  try { if (typeof ficheFaits === "function") { const f = ficheFaits(s, full); delete f.donnees_manquantes; out.fiche_de_l_entreprise = f; } } catch (e) { }
  return out;
}
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-clair]"); if (!b) return; e.preventDefault();
  const [id, k] = b.dataset.clair.split("|"), box = b.nextElementSibling;
  if (!miaConnectee()) { b.remove(); box.outerHTML = miaInvite(); return; }
  b.disabled = true; b.textContent = "Rédaction en cours…";
  const co = RBY[id], it = ((await actuCo(id)).o || []).find(x => x.k === k);
  if (!it) { b.remove(); box.outerHTML = `<p class="ax-why">Annonce introuvable : rechargez la page.</p>`; return; }
  const f = co && co.ca != null ? { ventes_millions: co.ca, devise: co.currency } : null;
  const j = await iaRediger("annonce", { ...(co ? await actuFicheContexte(co.id) : {}), entreprise: co ? co.name : id, secteur: co ? secName(co) : null, activite: co && co.fiche ? co.fiche.fait : co ? co.desc : null, type: it.tf, titre_officiel: it.t, date: String(it.d).slice(0, 10), chiffres: it.f || [], lecture_calculee: it.r || [], dernier_exercice: f, lien: it.u }, { max: 420 });
  b.remove();
  const x = j.txt ? jsonFrom(j.txt) : null;
  box.outerHTML = x && x.clair ? `<div class="ax-cl"><b>En clair</b><p>${esc(x.clair)}</p>${x.change ? `<b>Ce que cela change pour l'entreprise</b><p>${esc(x.change)}</p>` : ""}<small>Rédigé par l'IA d'ENKLAIR (${esc(j.modele)}) à partir de l'annonce. La source fait foi.</small></div>`
    : j.txt ? `<div class="ax-cl"><b>En clair</b>${resumeHTML(j.txt)}<small>Rédigé par l'IA d'ENKLAIR (${esc(j.modele)}) à partir de l'annonce. La source fait foi.</small></div>` : `<p class="ax-why">${esc(j.error || "Explication indisponible pour le moment.")}</p>`;
});

/* styles : voir site.css */

/* styles : voir site.css */
