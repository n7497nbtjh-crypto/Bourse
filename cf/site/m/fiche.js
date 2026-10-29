/* Module « fiche » de bilan. : chargé après le script principal de index.html.
   Les fonctions déclarées ici remplacent celles du même nom (déclarations function, jamais const/let pour un nom existant).
   Fiche entreprise /entreprise/:id :
   - en-tête : identité, cours, verdict en une phrase et profil dans le secteur, sans défiler ;
   - parcours en étapes dans la colonne principale ; colonne latérale courte et collante (dates, dernières annonces, IA) ;
   - « Son métier » concret (répartition des ventes, chiffres clés, marques, dirigeants, frise) avec les faits Wikidata (CC0) ;
   - « Questions » : 8 à 12 questions de débutant, réponses calculées tout de suite par l'IA locale, « Approfondir avec l'IA » ;
   - confiance : document officiel source, « chiffres calculés, pas générés par une IA », date de mise à jour. */

const FICHE_CSS = `
.fhero{margin-bottom:14px}
.fh-top{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;padding:20px 22px 16px;align-items:start}
.fh-id{display:flex;gap:16px;align-items:flex-start;min-width:0}
.fh-t{min-width:0}
.fh-t h1{font-size:30px;line-height:1.08;margin:0}
.fh-desc{margin:5px 0 0;color:var(--grey);font-size:15px;line-height:1.45}
.fh-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.fh-tags>*{font-size:12px;line-height:1.5;padding:2px 9px;border-radius:99px;background:var(--soft);color:var(--grey);text-decoration:none;white-space:nowrap}
.fh-tags a:hover{background:var(--line)}
.fh-tags .ok{background:#E6F2EB;color:var(--g);font-weight:600}
.fh-act{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.fh-act .favbtn{margin:0;text-decoration:none;display:inline-flex;align-items:center;color:var(--ink);font-family:inherit}
.fh-act .fh-ia{background:var(--ink);color:#fff;border-color:var(--ink)}
.fh-act .fh-ia:hover{background:#2A2B2E}
#pxh{min-width:230px}
.fh-rg{margin-top:10px;width:230px;margin-left:auto}
.fh-rg .range{margin:8px 0 4px}
.fh-rg .range-l{font-size:11.5px}
.fh-perf{font-size:12.5px;color:var(--grey);text-align:right;margin-top:6px}
.fh-perf b{font-family:var(--mono);font-weight:600}
.fh-sum{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);border-top:1px solid var(--line2)}
.fh-vl{padding:16px 22px 16px}
.fh-v{font-size:15.5px;line-height:1.55;margin:4px 0 12px;color:var(--ink)}
.fh-feu{display:flex;gap:6px 16px;flex-wrap:wrap;font-size:13.5px;align-items:center}
.fh-feu span{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.fh-feu i{width:10px;height:10px;border-radius:50%;display:inline-block}
.fh-feu .f i{background:var(--g)}.fh-feu .m i{background:var(--n)}.fh-feu .v i{background:var(--o)}
.fh-feu b{font-family:var(--mono);font-size:15px}
.fh-feu button{margin-left:auto}
.fh-vl{display:flex;flex-direction:column}.fh-go{margin-top:auto;padding-top:14px;display:flex;gap:14px;align-items:center;border-top:1px dashed var(--line);margin-top:auto}.fh-go p{margin:0;font-size:13px;color:var(--grey);line-height:1.45}.fh-go b{color:var(--ink)}.fh-go .btn{flex:none;height:36px;padding:0 16px}
.fh-vl>.fh-feu{margin-bottom:14px}
.fh-prof{padding:14px 22px;background:#FCFBF8;border-left:1px solid var(--line2)}
.fh-prof .prof .pa2{padding:4px 0}
.fh-prof .prof .note{font-size:11.5px}
.fh-pm{display:none}@media (max-width:760px){.fh-pl{display:none}.fh-pm{display:block}.fh-pm .pmini{margin:8px 0 0}}
.fhero .qtabs{border-top:1px solid var(--line2);padding:0 22px}
.fcols{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:20px;align-items:start}
.fcols>*{min-width:0}
.fside{position:sticky;top:124px}
.fside .panel{margin-bottom:14px}
.fside .ph{padding:14px 18px 4px}.fside .ph h2{font-size:16.5px}
.fside .pb{padding:8px 18px 14px}
.fside .ag .it{padding:7px 18px}
.fside .src{padding:8px 18px}
.fann{list-style:none;margin:0;padding:0}
#fannb.fcourt{max-height:400px;overflow:hidden;position:relative;padding-bottom:0}
#fannb.fcourt:after{content:"";position:absolute;left:0;right:0;bottom:0;height:70px;background:linear-gradient(rgba(255,255,255,0),#fff)}
.fannall{padding:2px 18px 14px}
.fann li{padding:8px 0;border-bottom:1px solid var(--line2);font-size:13.5px;line-height:1.4}
.fann li:last-child{border-bottom:0}
.fann .fd{display:flex;gap:8px;align-items:center;font-size:11.5px;color:var(--light);margin-bottom:2px}
.fann .ncat{font-size:11px}
.fann a{color:var(--ink);text-decoration:none;font-weight:500}.fann a:hover{text-decoration:underline}
.fiamini p{margin:0 0 8px;font-size:13.5px;color:var(--grey)}
.fiamini .askf{flex-direction:column}.fiamini .askf input{flex:none;width:100%}
.fiamini .btn{width:100%}
.fkeys{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));overflow:hidden;border-top:1px solid var(--line2)}
.fk{padding:13px 20px 14px;box-shadow:1px 0 0 var(--line2),0 1px 0 var(--line2);border-left:3px solid transparent}
.fk.fk-fort{border-left-color:var(--g)}.fk.fk-vig{border-left-color:var(--o)}.fk.fk-moyen{border-left-color:var(--n)}
.fkeys.n4{grid-template-columns:repeat(4,minmax(0,1fr))}.fkeys.n2{grid-template-columns:repeat(2,minmax(0,1fr))}.fkeys.n3,.fkeys.n6{grid-template-columns:repeat(3,minmax(0,1fr))}.fkeys.n5{grid-template-columns:repeat(6,minmax(0,1fr))}.fkeys.n5 .fk{grid-column:span 2}.fkeys.n5 .fk:nth-child(n+4){grid-column:span 3}
.fk .kick{display:flex;justify-content:space-between;gap:8px}
.fk .vd{font-family:var(--sans);text-transform:none;letter-spacing:0;font-size:11.5px;font-weight:600}
.fk b{font-family:var(--mono);font-size:21px;font-weight:600;letter-spacing:-.02em;display:block;margin:3px 0 4px;white-space:nowrap}
.fk p{margin:0;font-size:13.5px;color:var(--grey);line-height:1.45}
.fconf{display:flex;gap:10px;align-items:flex-start;padding:11px 22px;background:#F4FAF6;border-top:1px solid var(--line2);font-size:12.5px;line-height:1.5;color:var(--grey)}
.fconf p{margin:0}.fconf b{color:var(--ink);font-weight:600}
.fci{flex:none;width:18px;height:18px;border-radius:50%;background:var(--g);color:#fff;display:grid;place-items:center;font-size:11px;font-weight:700;margin-top:1px}
.f1p{padding:4px 22px 16px;font-family:var(--serif);font-size:20px;line-height:1.35;font-weight:600;letter-spacing:-.01em}
.f1p small{display:block;font-family:var(--sans);font-size:13px;font-weight:400;color:var(--grey);margin-top:6px;letter-spacing:0}
.fm{padding:16px 22px;border-top:1px solid var(--line2)}
.fm h3{font-family:var(--serif);font-size:16.5px;margin:0 0 10px}
.fm p{margin:0 0 10px;font-size:14.5px;line-height:1.55}
.fm .src{margin:10px -22px -16px}
.ftiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.ftiles.n1,.ftiles.n2,.ftiles.n3,.ftiles.n4{grid-template-columns:repeat(var(--n),minmax(0,1fr))}.ftiles.n6{grid-template-columns:repeat(3,minmax(0,1fr))}
.ftiles.n5{grid-template-columns:repeat(6,minmax(0,1fr))}.ftiles.n5 .ftile{grid-column:span 2}.ftiles.n5 .ftile:nth-child(n+4){grid-column:span 3}
.ftile{border:1px solid var(--line2);border-radius:12px;padding:10px 14px;background:#FCFBF8;min-width:0}
.ftile .kick{margin:0}
.ftile b{display:block;font-family:var(--mono);font-size:18px;font-weight:600;letter-spacing:-.02em;margin:2px 0;overflow-wrap:anywhere}
.ftile b.txt{font-family:var(--sans);font-size:15.5px;letter-spacing:0}
.ftile small{display:block;font-size:12px;color:var(--light);line-height:1.35}
.fbars{display:flex;flex-direction:column;gap:7px;margin:4px 0 2px}
.fbar{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1.6fr) 46px 78px;gap:10px;align-items:center;font-size:13.5px}
.fbar .l{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fbar .b{height:10px;background:var(--line2);border-radius:5px;overflow:hidden}.fbar .b i{display:block;height:100%;border-radius:5px;background:var(--ink)}
.fbar .p{font-family:var(--mono);font-weight:600;text-align:right}.fbar .a{font-family:var(--mono);font-size:12.5px;color:var(--grey);text-align:right;white-space:nowrap}
.fbt{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--light);font-family:var(--mono);margin:12px 0 6px}
.fbt:first-child{margin-top:0}
.fchips{display:flex;flex-wrap:wrap;gap:6px}
.fchips span{font-size:13px;padding:4px 10px;border:1px solid var(--line);border-radius:99px;background:#fff}
.fcmp{display:grid;grid-template-columns:150px minmax(0,1fr) 70px;gap:6px 12px;align-items:center;font-size:13.5px}
.fcmp .b{height:8px;background:var(--line2);border-radius:4px;position:relative}
.fcmp .b i{position:absolute;left:0;top:0;bottom:0;border-radius:4px}
.fcmp .n{font-family:var(--mono);text-align:right;white-space:nowrap}
.fcmp small{color:var(--light)}
.fdir{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px}
.fdir div{border-left:3px solid var(--lime);padding:2px 0 2px 10px}.fdir small{display:block;color:var(--light);font-size:12px}.fdir b{font-weight:600}
.ffrise{list-style:none;margin:6px 0 0;padding:0;display:flex;position:relative}
.ffrise:before{content:"";position:absolute;left:8px;right:8px;top:7px;height:2px;background:var(--line)}
.ffrise li{flex:1;position:relative;padding-top:22px;font-size:12.5px;color:var(--grey);line-height:1.35;min-width:0;padding-right:8px}
.ffrise li:before{content:"";position:absolute;top:1px;left:2px;width:12px;height:12px;border-radius:50%;background:#fff;border:2px solid var(--ink)}
.ffrise li.fut:before{border-style:dashed;border-color:var(--g)}
.ffrise b{display:block;font-family:var(--mono);color:var(--ink);font-size:14px}
.fid2{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0 18px}
.fid2 div{padding:7px 0;border-bottom:1px dashed var(--line2);font-size:13.5px;display:flex;justify-content:space-between;gap:10px}
.fid2 span{color:var(--light)}.fid2 b{font-weight:500;text-align:right;overflow-wrap:anywhere}
.fgen{background:#FBF9F2;border:1px solid var(--line2);border-radius:10px;padding:10px 12px;font-size:13.5px;color:var(--grey)}
.fia{border:1.5px solid var(--ink)}
.fia-h{display:flex;gap:14px;align-items:flex-start;padding:18px 22px 6px}
.fia-ic{flex:none;width:38px;height:38px;border-radius:12px;background:var(--ink);color:#D6F26B;display:grid;place-items:center;font-size:19px}
.fia-h h2{font-size:19px;margin:0}
.fia-h p{margin:4px 0 0;font-size:13.5px;color:var(--grey);line-height:1.45}
.fia .pb{padding-top:8px}
.fia .askf input{height:46px;font-size:15.5px;border:1.5px solid var(--ink)}
.fia .askf .btn{height:46px;padding:0 22px}
.fia .chips{margin:10px 0 0}
.fapp{margin:8px 0 0;background:#fff;border:1.5px solid var(--g);color:var(--g);border-radius:99px;padding:4px 12px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer}
.fapp:hover{background:#EEF6F1}.fapp:disabled{opacity:.5;cursor:default}
.ffaqask{display:flex;flex-direction:column;gap:6px;padding:4px 22px 14px}
.ffaqask label{font-weight:600;font-size:14px}
.ffaq details.acc > summary{font-weight:600;line-height:1.4}
.ffaq .accb{padding:0 22px 16px}
.ffaq .accb p{margin:0 0 8px;font-size:14.5px;line-height:1.6}
.ffsrc{font-size:12px;color:var(--light);margin:6px 0 0}
.ffaq .fq-ia{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-family:var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--g);margin-bottom:6px}
#fgraph .tv-chart{height:320px}
@media (max-width:1100px){.fcols{grid-template-columns:minmax(0,1fr) 280px}.fkeys.n4{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){.ftiles.n3,.ftiles.n4,.ftiles.n5,.ftiles.n6{grid-template-columns:repeat(2,minmax(0,1fr))}.ftiles.n5 .ftile,.ftiles.n5 .ftile:nth-child(n+4){grid-column:auto}.ftiles.n3 .ftile:last-child,.ftiles.n5 .ftile:last-child{grid-column:span 2}.fkeys.n5 .fk,.fkeys.n5 .fk:nth-child(n+4){grid-column:auto}.fkeys.n2,.fkeys.n3,.fkeys.n4,.fkeys.n5,.fkeys.n6{grid-template-columns:1fr}}
@media (max-width:900px){.fcols{grid-template-columns:minmax(0,1fr)}.fside{position:static}.fiamini{display:none}.fh-sum{grid-template-columns:1fr}.fh-prof{border-left:0;border-top:1px solid var(--line2)}}
@media (max-width:760px){
  .fh-top{grid-template-columns:1fr;padding:14px 16px 12px;gap:12px}
  .fh-id{gap:12px}.fh-id .lg{--s:44px!important}
  .fh-t h1{font-size:24px}.fh-desc{font-size:14px}
  #pxh{min-width:0}#pxh .pxhead{align-items:flex-start;text-align:left;flex-direction:row;flex-wrap:wrap;gap:4px 10px;align-items:baseline}
  #pxh .pxhead .kick{display:none}#pxh .pxhead .p{font-size:24px}
  .fh-rg{margin-left:0;width:100%;max-width:340px}.fh-perf{text-align:left}
  .fh-vl,.fh-prof{padding:12px 16px}.fh-v{font-size:15px}
  .fh-feu button{margin-left:0}.fh-go{display:none}
  .fhero .qtabs{padding:0 16px}
  .fk{padding:12px 16px}.fconf{padding:10px 16px}.f1p{padding:2px 16px 14px;font-size:18px}.fm{padding:14px 16px}.fm .src{margin:10px -16px -14px}
  .fbar{grid-template-columns:minmax(0,1fr) 70px 42px;grid-template-areas:"l l p" "b b a"}.fbar .l{grid-area:l}.fbar .b{grid-area:b}.fbar .p{grid-area:p}.fbar .a{grid-area:a}
  .fcmp{grid-template-columns:110px minmax(0,1fr) 62px}
  .fia-h{padding:14px 16px 4px}.ffaqask{padding:4px 16px 12px}.ffaq .accb{padding:0 16px 14px}
  .ffrise{flex-direction:column;gap:10px}.ffrise:before{left:7px;right:auto;top:6px;bottom:6px;width:2px;height:auto}.ffrise li{padding:0 0 0 24px}
  #fgraph .tv-chart{height:300px}
}`;
document.head.insertAdjacentHTML("beforeend", `<style id="fiche-css">${FICHE_CSS}</style>`);

/* ---------- Données : faits Wikidata (CC0) ---------- */
const FICHE_WD = {}; // faits Wikidata par entreprise (fichiers /data/wd/<id>.json fabriqués par build.mjs)
function ficheWDLoad(id) {
  if (!id) return Promise.resolve(null);
  if (FICHE_WD[id] !== undefined) return Promise.resolve(FICHE_WD[id]);
  return fetch(`/data/wd/${id}.json`).then(r => r.ok ? r.json() : null).catch(() => null).then(j => { if (j && j.siege && /^(siège|si[eè]ge social|headquarters)/i.test(j.siege)) delete j.siege; return (FICHE_WD[id] = j); });
}
const ficheWd = id => FICHE_WD[id] || null;
const ficheWikiUrl = w => { const [l, ...t] = String(w).split(":"); return `https://${l}.wikipedia.org/wiki/${encodeURIComponent(t.join(":").replace(/ /g, "_"))}`; };
let FICHE_GEN = null;
function ficheGenerique(s) { // texte de fiche partagé par plusieurs entreprises : métier type du secteur, pas propre à l'entreprise
  if (!s.fiche || !s.fiche.fait) return true;
  if (!FICHE_GEN) { FICHE_GEN = {}; R.companies.forEach(c => { const t = c.fiche && c.fiche.fait; if (t) FICHE_GEN[t] = (FICHE_GEN[t] || 0) + 1; }); }
  return (FICHE_GEN[s.fiche.fait] || 0) >= 3;
}
const ficheMemeId = id => location.pathname.split("/")[2] === id;
function ficheVeille(el, ms, html) { // jamais de « Chargement… » sans fin
  if (!el) return;
  setTimeout(() => { if (el.isConnected && /Chargement/.test(el.textContent) && !el.querySelector(".nit,.pa,li")) el.innerHTML = html; }, ms);
}
function ficheSource(c) { // le document officiel d'où viennent les chiffres
  if (!c || !c.sources || !c.sources.length) return null;
  const x = c.sources[0];
  if (c.cik) return { url: x.report || `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${c.cik}&type=10-K`, label: "rapports annuels déposés à la SEC (EDGAR)" };
  return x.report ? { url: x.report, label: `rapport financier annuel officiel (ESEF), exercice clos le ${dLabel(x.periodEnd)}` } : null;
}
function ficheConfiance(c) {
  const src = ficheSource(c);
  return `<div class="fconf"><span class="fci" aria-hidden="true">✓</span><p><b>Chiffres calculés à partir des comptes publiés, pas générés par une IA.</b> ${src ? `Source : <a class="lnk" href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.label)}</a>` : ""}${c && c.updated ? ` · données mises à jour le ${dLabel(c.updated)}` : ""} · <a class="lnk" href="/methode">Notre méthode</a></p></div>`;
}

/* ---------- En-tête : l'essentiel sans défiler ---------- */
function ficheCours(s) {
  const p = pxOf(s);
  let out = priceHead(s);
  if (!p) return out;
  if (p.h52 > p.l52) { const pos = Math.min(1, Math.max(0, (p.p - p.l52) / (p.h52 - p.l52))); out += `<div class="fh-rg" title="Position du cours entre son plus bas et son plus haut sur un an"><div class="range sm"><i style="left:${pos * 100}%"></i></div><div class="range-l"><span>${pxFmt(p.l52, p.cur)}</span><span>sur 1 an</span><span>${pxFmt(p.h52, p.cur)}</span></div></div>`; }
  if (p.p1y) out += `<div class="fh-perf">Sur un an : <b class="${p.p >= p.p1y ? "up" : "down"}">${sgn(p.p / p.p1y - 1)}</b></div>`;
  return out;
}
/* ficheSommaire, companyHeader, pageCompany, tabBref, etapesListe, etapesBind, ficheGraphBox, ficheGraphique et ficheRetenirHTML
   sont définies une seule fois, dans m/fiche2.js (refonte de la fiche du 29 octobre). */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-fiche-ia]"); if (!b) return;
  e.preventDefault();
  if (!$("#assistant")) { const id = location.pathname.split("/")[2]; go(`/entreprise/${id}?ia=1`); return; }
  ficheVersIA();
});
function ficheVersIA(q) {
  const a = $("#assistant"); if (!a) return;
  a.scrollIntoView({ behavior: "smooth", block: "start" });
  const inp = $("#assistant input"); if (inp && !q) setTimeout(() => inp.focus({ preventScroll: true }), 350);
}

function ficheAnnonces(s, el) {
  if (!el) return;
  const all = "";
  if (typeof actuFicheCourt === "function") {
    try {
      actuFicheCourt(el, s, { max: 3 }); el.classList.add("fcourt"); // bloc borné : la colonne latérale reste courte
      const sec = el.closest("section"), titre = () => { if (sec && el.querySelector("h2,h3,.ph")) { const h = sec.querySelector(":scope > .ph"); if (h) h.remove(); } };
      titre(); setTimeout(titre, 1500); // le bloc de l'agent « actu » a déjà son titre : pas de double titre
      ficheVeille(el, 10000, `<p class="muted" style="margin:0 0 8px;font-size:13.5px">Pas d'annonce récente disponible pour le moment.</p>${all}`);
      return;
    } catch (e) { }
  }
  const vide = `<p class="muted" style="margin:0 0 8px;font-size:13.5px">${s.region === "FR" || s.sec ? "Pas d'annonce récente disponible pour le moment." : "Cette société publie ses communiqués auprès du régulateur de son pays, sans flux ouvert."}</p>${all}`;
  if (!(s.region === "FR" || s.sec)) { el.innerHTML = vide; return; }
  el.innerHTML = `<p class="muted" style="margin:0;font-size:13px">Chargement…</p>`;
  Promise.all([s.sec ? loadSec(s.id) : loadAmf("&isin=" + s.isin, 60), loadAna()]).then(([items]) => {
    const l = [...items.filter(i => !NCAT[i.cat].routine), ...items.filter(i => NCAT[i.cat].routine)].slice(0, 3); // les annonces importantes d'abord
    if (!l.length) { el.innerHTML = vide; return; }
    el.innerHTML = `<ul class="fann">${l.map(i => { const a = ANA && i.url ? ANA[i.url] : null, C = NCAT[i.cat]; return `<li><div class="fd"><span class="ncat" style="--c:${C.c}">${C.label}</span>${i.date ? dShort(i.date) : ""}</div><a href="/entreprise/${s.id}/actualite">${esc((a && a.titre) || i.title)}</a></li>`; }).join("")}</ul>${all}`;
  }).catch(() => { el.innerHTML = vide; });
  ficheVeille(el, 9000, vide);
}

function fichePrixSans(s) {
  const p = pxOf(s);
  if (!p) return `<section class="panel" id="prix"><div class="ph"><h2>Le prix de l'action</h2></div><div class="pb muted">${PXUP && PXUP !== "none" ? "Le cours de cette action n'est pas disponible dans notre source pour le moment." : "Chargement du cours…"}</div></section>`;
  const capE = p.cap ? toEur(p.cap, p.cur) : null;
  return `<section class="panel" id="prix"><div class="ph"><h2>Le prix de l'action</h2><span class="light" style="font-size:12.5px">Cours différé · ${esc(p.s)}</span></div>
    <div class="tiles"><div class="tile"><span class="kick">Cours</span><span class="v">${pxFmt(p.p, p.cur)}</span><small>${p.chg != null ? `${p.chg > 0 ? "+" : ""}${F2.format(p.chg)} % aujourd'hui` : "dernier cours connu"}</small></div>
      ${capE ? `<div class="tile"><span class="kick">Valeur en Bourse</span><span class="v">${capFmt(capE)}</span><small>prix de toutes ses actions</small></div>` : ""}
      ${p.p1y ? `<div class="tile"><span class="kick">Sur un an</span><span class="v ${p.p >= p.p1y ? "up" : "down"}">${sgn(p.p / p.p1y - 1)}</span><small>évolution du cours</small></div>` : ""}</div>
    <div class="pb"><p class="muted" style="margin:0">Sans comptes publiés lisibles, le prix ne peut pas être comparé au bénéfice (PER).</p></div></section>`;
}


function ficheAnalyse(s, c) { // emplacement réservé à l'agent « analyse » (facteurs qui valorisent ou pénalisent l'entreprise)
  if (typeof analyseForcesFaiblesses !== "function") return "";
  try { const r = analyseForcesFaiblesses(s, c); return typeof r === "string" ? `<div class="fanalyse">${r}</div>` : ""; } catch (e) { return ""; }
}

/* ---------- Étape 2 : son métier, concret ---------- */
function ficheBarres(list, total, cur, unite) { // list : [[nom, valeur]] ; unite "pct" (parts publiées) ou "montant"
  const tot = list.reduce((a, x) => a + x[1], 0) || 1;
  return `<div class="fbars">${list.slice(0, 8).map(([n, v]) => { const p = v / tot; return `<div class="fbar"><span class="l" title="${esc(n)}">${esc(n)}</span><span class="b"><i style="width:${Math.max(1.5, p * 100)}%"></i></span><span class="p">${F0.format(p * 100)} %</span><span class="a">${unite === "montant" ? big(v, cur) : total ? "≈ " + big(total * p, cur) : ""}</span></div>`; }).join("")}</div>`;
}
function ficheMetierHTML(s, c) {
  const wd = ficheWd(s.id), f = c ? figuresOf(c) : null, gen = ficheGenerique(s), rep = REP[s.id], segs = (c && c.segments) || {}, cur = f ? f.currency : s.currency, bank = isBank(s);
  const Y = +TODAY.slice(0, 4), out = [];
  // En une phrase
  const phrase = !gen ? s.fiche.fait : s.desc || (s.fiche && s.fiche.fait) || "";
  out.push(`<p class="f1p">${esc(phrase)}${!gen && s.desc && s.desc !== phrase ? `<small>${esc(s.desc)}</small>` : ""}</p>`);
  if (wd && wd.secteurs) wd.secteurs = wd.secteurs.filter(x => !/si[eè]ges? sociaux|holding/i.test(x));
  if (wd && ((wd.secteurs && wd.secteurs.length) || wd.maison)) out.push(`<div class="fm" style="padding-top:12px;padding-bottom:12px">${wd.secteurs && wd.secteurs.length ? `<p class="fbt">Ses domaines d'activité</p><div class="fchips">${wd.secteurs.map(x => `<span>${esc(x)}</span>`).join("")}</div>` : ""}${wd.maison ? `<p style="margin:10px 0 0;font-size:13.5px">Elle appartient au groupe <b>${esc(wd.maison[0])}</b>.</p>` : ""}</div>`);
  // Chiffres clés
  const peers = R.companies.filter(x => x.sector === s.sector && !x.missing && x.ca > 0).sort((a, b) => caEur(b) - caEur(a)), rank = peers.findIndex(x => x.id === s.id) + 1, v = valo(s);
  const tiles = [
    f && f.ca != null ? [bank ? `Revenus ${f.year}` : `Ventes ${f.year}`, big(f.ca, cur), bank ? "produit de son activité sur l'année" : "chiffre d'affaires de l'année"] : null,
    wd && wd.effectif ? ["Salariés", F0.format(wd.effectif[0]), wd.effectif[1] ? `chiffre de ${wd.effectif[1]}` : "dernier chiffre connu"] : null,
    wd && wd.fonde ? ["Création", String(wd.fonde), Y - wd.fonde > 1 ? `il y a ${Y - wd.fonde} ans` : "récente"] : null,
    wd && wd.siege ? ["Siège", wd.siege, wd.pays || "", true] : null,
    v && v.capE ? ["Valeur en Bourse", capFmt(v.capE), "au cours actuel"] : null,
    rank && peers.length > 2 ? ["Taille dans son secteur", `${rank}<sup>${rank === 1 ? "re" : "e"}</sup> sur ${peers.length}`, "par les ventes, parmi les entreprises suivies", false, true] : null,
  ].filter(Boolean);
  if (tiles.length) out.push(`<div class="fm"><h3>${esc(s.name)} en chiffres</h3><div class="ftiles n${tiles.length}" style="--n:${tiles.length}">${tiles.map(([k, val, sub, txt, html]) => `<div class="ftile"><p class="kick">${k}</p><b class="${txt ? "txt" : ""}">${html ? val : esc(val)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</div>`).join("")}</div></div>`);
  // Comment elle gagne son argent
  let acts = null, zones = null, unite = "pct", srcRep = "", anRep = null;
  if (segs.activites || segs.produits || segs.geo) {
    const a = segs.activites || segs.produits; if (a) acts = a.items.map(i => [segName(i.name), i.ca]);
    if (segs.geo) zones = segs.geo.items.map(i => [segName(i.name), i.ca]);
    unite = "montant"; anRep = (a || segs.geo).year; srcRep = `Ventilation publiée dans le rapport annuel ${anRep}.`;
  } else if (rep && (rep.activites || rep.zones)) { acts = rep.activites || null; zones = rep.zones || null; anRep = rep.annee; srcRep = `Répartition relevée dans le <a class="lnk" href="${esc(rep.source)}" target="_blank" rel="noopener">rapport de l'entreprise</a>, exercice ${rep.annee}${f && f.ca && f.year === rep.annee ? `, montants calculés sur les ventes ${f.year}` : ""}.`; }
  const caRep = unite === "pct" && f && f.ca && f.year === anRep ? f.ca : null; // jamais de mélange entre deux exercices
  const argent = !gen && s.fiche.argent ? `<p>${esc(s.fiche.argent)}</p>` : "";
  if (argent || acts || zones) {
    const top = acts && acts.length ? [...acts].sort((a, b) => b[1] - a[1])[0] : null, tot = acts ? acts.reduce((a, x) => a + x[1], 0) : 0;
    out.push(`<div class="fm"><h3>Comment elle gagne son argent</h3>${argent}
      ${top && acts.length > 1 ? `<p><b>${esc(top[0])}</b> représente ${F0.format(top[1] / tot * 100)} % de ses ventes${anRep ? ` (exercice ${anRep})` : ""}.</p>` : ""}
      ${acts ? `<p class="fbt">Par activité${anRep ? " · " + anRep : ""}</p>${ficheBarres([...acts].sort((a, b) => b[1] - a[1]), caRep, cur, unite)}` : ""}
      ${zones ? `<p class="fbt">Par zone géographique${anRep ? " · " + anRep : ""}</p>${ficheBarres([...zones].sort((a, b) => b[1] - a[1]), caRep, cur, unite)}` : ""}
      ${!acts && !zones ? `<p class="muted" style="font-size:13.5px">La répartition de ses ventes par activité n'est pas encore relevée sur le site : elle figure dans son rapport annuel${c && c.cik ? " (10-K, « Segment information »)" : ", dans la note sur l'information sectorielle"}.</p>` : ""}
      <p style="margin:8px 0 0;display:flex;gap:10px 18px;flex-wrap:wrap;align-items:center">${ctLink(s, "argent", "D'où viennent ses ventes, en détail")}<button type="button" class="fapp" style="margin:0" data-approf="Expliquez concrètement le métier de ${esc(s.name)} : ce qu'elle vend, à quels clients, comment elle gagne de l'argent et ce qui pèse sur ses coûts, avec les chiffres de la fiche.">✦ Le métier expliqué par l'IA</button></p>
      ${srcRep ? `<div class="src">${srcRep}</div>` : ""}</div>`);
  }
  // Marques, produits, filiales
  const marques = wd ? [...new Set([...(wd.marques || []), ...(wd.produits || [])])].filter(x => x.length < 40).slice(0, 14) : [];
  if (marques.length || (wd && wd.filiales)) out.push(`<div class="fm"><h3>Ses marques, produits et filiales connus</h3>
      ${marques.length ? `<div class="fchips">${marques.map(m => `<span>${esc(m)}</span>`).join("")}</div>` : ""}
      ${wd.filiales ? `<p class="fbt" style="margin-top:12px">Principales filiales${wd.nfiliales > wd.filiales.length ? ` (${wd.nfiliales} recensées)` : ""}</p><div class="fchips">${wd.filiales.map(m => `<span>${esc(m)}</span>`).join("")}</div>` : ""}
      <div class="src">Liste tirée de Wikidata (base ouverte, licence CC0) : elle peut être incomplète.</div></div>`);
  else if (gen && s.fiche) out.push(`<div class="fm"><h3>Le métier type de son secteur</h3><p class="fgen">${esc(s.fiche.fait)} ${esc(s.fiche.argent || "")}</p><p class="muted" style="font-size:12.5px;margin:6px 0 0">Description générale de son secteur d'activité, pas propre à ${esc(s.name)}.</p></div>`);
  // Sa place dans son secteur
  const med = MED[s.sector] || {}, md0 = med, m = ratios(s);
  const rows = [];
  if (!bank && m.marge != null && med.marge != null && med.n >= 3) rows.push(["Marge d'exploitation", m.marge, med.marge, x => pct(x, 1, false), true]);
  if (bank && m.roe != null && med.roe != null && med.n >= 3) rows.push(["Rentabilité des capitaux propres", m.roe, med.roe, x => pct(x, 1, false), true]);
  if (m.g1 != null && med.g1 != null && med.n >= 3) rows.push(["Croissance des ventes", m.g1, med.g1, x => pct(x), true]);
  if (rows.length) {
    const bar = (val, ref, good) => { const mx = Math.max(Math.abs(val), Math.abs(ref), 1e-9); return `<span class="b"><i style="width:${Math.max(2, Math.abs(val) / mx * 100)}%;background:${good}"></i></span>`; };
    out.push(`<div class="fm"><h3>Sa place dans le secteur ${esc(secName(s).toLowerCase())}</h3><div class="fcmp">${rows.map(([l, val, ref, fm]) => { const better = val >= ref; return `<span>${l}<br><small>${esc(s.name)}</small></span>${bar(val, ref, better ? "var(--g)" : "var(--o)")}<span class="n">${fm(val)}</span><span><small>médiane du secteur</small></span>${bar(ref, val, "var(--n)")}<span class="n">${fm(ref)}</span>`; }).join("")}</div>
      <p class="muted" style="font-size:12.5px;margin:10px 0 0">Médiane des ${med.n} entreprises du secteur suivies par le site : la moitié fait mieux, l'autre moitié moins bien. ${medBtn("Qu'est-ce que la médiane ?")}</p></div>`);
  }
  if (!c && md0.n >= 3) out.push(`<div class="fm"><h3>Son secteur en repères</h3><div class="ftiles n4" style="--n:4">${[md0.g1 != null ? ["Croissance médiane", pct(md0.g1, 1), "des ventes sur un an"] : null, md0.marge != null ? ["Marge médiane", pct(md0.marge, 1, false), "marge d'exploitation"] : null, MEDPE[s.sector] ? ["PER médian", F0.format(MEDPE[s.sector]), "prix ÷ bénéfice annuel"] : null, ["Entreprises suivies", F0.format(md0.n), "avec des comptes publiés"]].filter(Boolean).map(([k, v2, sub]) => `<div class="ftile"><p class="kick">${k}</p><b>${esc(v2)}</b><small>${sub}</small></div>`).join("")}</div><p class="muted" style="font-size:12.5px;margin:10px 0 0">Valeurs de l'entreprise « du milieu » du secteur ${esc(secName(s).toLowerCase())} : en attendant les comptes de ${esc(s.name)}, elles donnent l'ordre de grandeur du métier. ${medBtn("Qu'est-ce que la médiane ?")}</p></div>`);
  // Qui la dirige
  const dir = wd ? [["Directeur général", wd.pdg], ["Président", wd.president], [wd.fondateurs && wd.fondateurs.length > 1 ? "Fondateurs" : "Fondateur", wd.fondateurs]].filter(x => x[1] && x[1].length) : [];
  if (dir.length) out.push(`<div class="fm"><h3>Qui la dirige</h3><div class="fdir">${dir.map(([k, l]) => `<div><small>${k}</small><b>${l.map(esc).join(", ")}</b></div>`).join("")}</div><div class="src">Wikidata (licence CC0). Les changements récents peuvent ne pas y figurer encore : le rapport annuel fait foi.</div></div>`);
  // Frise
  const ev = eventsOf(s.id).find(e => e.date >= TODAY), fr = [];
  if (wd && wd.fonde) fr.push([String(wd.fonde), "Création de l'entreprise"]);
  if (c && c.years.length > 1) fr.push([String(c.years[0]), "Premiers comptes lus par le site"]);
  if (f) fr.push([String(f.year), "Dernier exercice publié"]);
  if (ev) fr.push([dShort(ev.date), esc(ev.label), true]);
  if (fr.length >= 3) out.push(`<div class="fm"><h3>Repères dans le temps</h3><ol class="ffrise">${fr.map(([d, l, fut]) => `<li class="${fut ? "fut" : ""}"><b>${d}</b>${l}</li>`).join("")}</ol></div>`);
  // Ce qui fait bouger ses résultats
  if (!gen && s.fiche.depend) out.push(`<div class="fm"><h3>Ce qui fait bouger ses résultats</h3><p>${esc(s.fiche.depend)}</p><p style="margin:0">${ctLink(s, "varier", "Le bénéfice année après année")}</p></div>`);
  // Identité
  const pea = peaOk(s), [bx, tk] = String(s.tv || "").split(":"), site = (wd && wd.site) || (s.domain ? "https://www." + s.domain : "");
  const idl = [["Pays", (s.isin && typeof COUNTRY !== "undefined" && COUNTRY[s.isin.slice(0, 2)]) || regName(s)], ["Secteur", esc(secName(s))], ["Code en Bourse", esc(`${tk || s.ticker}${bx ? " · " + ((typeof IA_BOURSES !== "undefined" && IA_BOURSES[bx]) || bx) : ""}`)], s.isin ? ["ISIN", esc(s.isin)] : null,
    pea != null ? ["Compte possible", pea ? `PEA ou compte-titres <a class="lnk" href="/pea-cto">?</a>` : `Compte-titres <a class="lnk" href="/pea-cto">?</a>`] : null,
    site ? ["Site officiel", `<a class="lnk" href="${esc(site)}" target="_blank" rel="noopener">${esc(site.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").slice(0, 32))}</a>`] : null,
    wd && wd.wiki ? ["Encyclopédie", `<a class="lnk" href="${esc(ficheWikiUrl(wd.wiki))}" target="_blank" rel="noopener">Wikipédia</a>`] : null].filter(Boolean);
  out.push(`<div class="fm"><h3>Carte d'identité</h3><div class="fid2">${idl.map(([k, val]) => `<div><span>${k}</span><b>${val}</b></div>`).join("")}</div></div>`);
  return `<section class="panel" id="metier"><div class="ph"><h2>Son métier</h2><span class="light" style="font-size:12.5px">Ce qu'elle vend, à qui, et comment elle gagne de l'argent</span></div>${out.join("")}
    <div class="src">Sources : ${f ? `comptes annuels ${f.year} (${c && c.cik ? "SEC" : "ESEF"})` : "fiche du site"}${wd ? `, faits d'identité <a href="https://www.wikidata.org/wiki/${esc(wd.q)}" target="_blank" rel="noopener">Wikidata</a> (CC0) ${wd.maj ? `relevés le ${dLabel(wd.maj)}` : ""}` : ""}. Rien n'est inventé : une information absente des sources n'est pas affichée.</div></section>
    ${s.sec ? `<section class="panel" id="fdirig"></section>` : ""}`;
}

/* ---------- Étape « Questions » : réponses calculées par l'IA du site, approfondies par le modèle ---------- */
function ficheQuestions(s, c) {
  const N = s.name, f = c ? figuresOf(c) : null, v = valo(s), wd = ficheWd(s.id), Q = [];
  const src = { compte: f ? `comptes annuels ${f.year} publiés par l'entreprise` : "fiche du site", cours: "cours différé (Google Finance)", med: "médiane des entreprises du secteur suivies par le site" };
  const add = (q, ask, s2) => Q.push({ q, ask, src: s2 });
  add(`Que fait ${N} et comment gagne-t-elle de l'argent ?`, "que fait elle et comment gagne t elle de l argent", "description de l'activité" + (REP[s.id] ? ", répartition des ventes tirée du rapport annuel" : ""));
  if (f) add(`Que retenir des derniers comptes de ${N} ?`, "que retenir de ses derniers comptes", `${src.compte}, comparés à la ${src.med}`);
  if (f) add(`${N} verse-t-elle un dividende ?`, "verse t elle un dividende", `${src.compte}${v && v.yld ? ", " + src.cours : ""}`);
  if (v && v.pe || (f && f.net != null && f.net <= 0)) add(`L'action ${N} est-elle chère par rapport à son secteur ?`, "l action est elle chere par rapport a son secteur", `${src.cours}, bénéfice ${f ? f.year : ""}, ${src.med}`);
  if (f) add(`${N} est-elle trop endettée ?`, "est elle trop endettee", src.compte);
  if (f && f.caPrev != null) add(`Les ventes de ${N} progressent-elles ?`, "ses ventes progressent elles", `${src.compte}, ${src.med}`);
  if (f) add(`${N} est-elle rentable ?`, "est elle rentable", `${src.compte}, ${src.med}`);
  if (f) add(`Quels sont les risques à surveiller chez ${N} ?`, "quels sont les risques a surveiller", `${src.compte}, ${src.med}`);
  if (peaOk(s) != null) add(`Peut-on mettre des actions ${N} dans un PEA ?`, "peut on mettre ses actions dans un pea", "pays du siège (code ISIN), règles fiscales 2026");
  add(`Quand ${N} publie-t-elle ses prochains résultats ?`, "quand publie t elle ses prochains resultats", "calendrier financier publié par l'entreprise");
  if (peersOf(s, 3).list.length) add(`Qui sont les concurrentes de ${N} ?`, "qui sont ses concurrentes", `comptes publiés de chaque entreprise`);
  if (wd && (wd.fonde || wd.siege || wd.effectif)) add(`Depuis quand ${N} existe-t-elle, et combien de personnes y travaillent ?`, "fiche identite depuis quand existe et salaries", "Wikidata (CC0)");
  if (!f && pxOf(s)) add(`Comment a évolué le cours de ${N} ?`, "comment a evolue le cours", src.cours);
  if (!f && v && v.capE) add(`Combien vaut ${N} en Bourse ?`, "combien vaut elle en bourse", src.cours);
  if (wd && wd.pdg && !f) add(`Qui dirige ${N} ?`, "qui est son pdg", "Wikidata (CC0)");
  add(`Où l'action ${N} est-elle cotée ?`, "ou est elle cotee", "code ISIN et place de cotation");
  const md = MED[s.sector] || {};
  if (!f && md.n >= 3) Q.push({ q: `Dans quel secteur est ${N}, et comment vont ses concurrentes ?`, a: ficheSecteurTxt(s), src: src.med });
  if (!f) Q.push({ q: `Pourquoi les comptes de ${N} ne sont-ils pas affichés ?`, a: missingTxt(s, true).replace(/<[^>]+>/g, "") + " En attendant, l'IA répond à partir de son métier, de son cours et de ses concurrentes.", src: "collecte des comptes du site" });
  return Q.slice(0, 12);
}
function ficheSecteurTxt(s) { // repères du secteur, utiles surtout quand les comptes de l'entreprise manquent
  const md = MED[s.sector] || {}, mp = MEDPE[s.sector], P = [`${s.name} appartient au secteur ${secName(s).toLowerCase()}, où le site suit ${md.n} entreprises avec des comptes publiés.`];
  if (md.g1 != null) P.push(`Leurs ventes ont évolué de ${pct(md.g1, 1)} sur un an pour l'entreprise médiane.`);
  if (md.marge != null) P.push(`Leur marge d'exploitation médiane est de ${pct(md.marge, 1, false)} : sur 100 € de ventes, il reste environ ${F0.format(md.marge * 100)} € une fois les coûts payés.`);
  if (mp) P.push(`En Bourse, l'entreprise médiane du secteur vaut ${F0.format(mp)} fois son bénéfice annuel (PER).`);
  const pr = peersOf(s, 3).list; if (pr.length) P.push(`Entreprises comparables : ${pr.map(x => x.name).join(", ")}.`);
  return P.join("\n");
}
function ficheReponse(s, c, ask) {
  try { return localAssist(s, c, ask); } catch (e) { return null; }
}
function faqHTML(s, c) {
  const Q = ficheQuestions(s, c).map(x => ({ ...x, a: x.a || ficheReponse(s, c, x.ask) })).filter(x => x.a);
  return `<section class="panel ffaq" id="faq"><div class="ph"><h2>Questions fréquentes sur ${esc(s.name)}</h2><span class="light" style="font-size:12.5px">${Q.length} réponses calculées par l'IA du site</span></div>
    <form class="ffaqask" data-fiche-mini autocomplete="off"><label for="ffq">Posez votre propre question</label><div class="askf"><input id="ffq" type="text" maxlength="300" placeholder="Par exemple : pourquoi sa marge baisse-t-elle ?"><button class="btn" type="submit">Demander à l'IA</button></div></form>
    ${Q.map((x, i) => acc(esc(x.q), `<p class="fq-ia">✦ Réponse instantanée de l'IA, calculée à partir des données</p>${resumeHTML(x.a)}<p class="ffsrc">Source des chiffres : ${esc(x.src)}.</p><button type="button" class="fapp" data-approf="${esc(x.q)}">✦ Approfondir avec l'IA</button>`, i === 0)).join("")}
    <div class="src">Les réponses sont calculées dans votre navigateur à partir des comptes officiels, des cours et des médianes du secteur : sans limite et sans invention. « Approfondir » transmet la question et les mêmes données au modèle d'IA du site, qui rédige une explication plus complète. Aucune réponse n'est un conseil d'achat ou de vente.</div></section>`;
}
document.addEventListener("submit", e => {
  const f = e.target.closest("[data-fiche-mini]"); if (!f || f.closest("#fside")) return;
  e.preventDefault(); const i = $("input", f), q = i.value.trim(); if (q.length < 3) return; i.value = ""; ficheDemander(q);
});
document.addEventListener("click", e => { const b = e.target.closest("[data-approf]"); if (!b) return; e.preventDefault(); b.disabled = true; ficheDemander(b.dataset.approf, true); });
let FICHE_ASK = null;
function ficheDemander(q, serveur = false) {
  if (!FICHE_ASK) { setTimeout(() => FICHE_ASK && FICHE_ASK(q, serveur), 600); return; }
  FICHE_ASK(q, serveur);
}

/* ---------- L'assistant de la fiche ---------- */
function assistantPanel(s, c, root) {
  if (!root || $("#assistant")) return;
  const sec = document.createElement("section"); sec.className = "panel asst fia"; sec.id = "assistant";
  const asks = c ? ASK : ["Comment gagne-t-elle de l'argent ?", "Où est-elle cotée ?", "Peut-on la mettre dans un PEA ?", "Qui sont ses concurrentes ?"];
  sec.innerHTML = `<div class="fia-h"><span class="fia-ic" aria-hidden="true">✦</span><div><h2>Une question sur ${esc(s.name)} ? L'IA vous répond</h2>
      <p>Réponses calculées à partir des comptes officiels, des médianes du secteur, du cours et des annonces de cette fiche. L'IA explique ; elle ne dit jamais s'il faut acheter.</p></div></div><div class="pb">
    <form class="askf" autocomplete="off"><input type="text" maxlength="300" placeholder="Votre question, par exemple : pourquoi sa marge baisse-t-elle ?" aria-label="Votre question"><button class="btn" type="submit">Demander</button></form>
    <div class="chips">${asks.map(q => `<button type="button" class="chip" data-ask="${esc(q)}">${esc(q)}</button>`).join("")}</div>
    <div class="asklog"></div><p class="iafoot" style="margin-top:10px">Les questions courantes (activité, prix, dette, dividende, croissance, marge, concurrentes, risques, dates) ont une réponse instantanée et illimitée. Les autres, et « Approfondir », passent par le modèle d'IA : ${isPrem() ? "100 par jour avec Premium." : `5 par jour en version gratuite, 100 avec <a class="lnk" href="/premium">Premium</a>.`}</p></div>`;
  const corps = $("#etapes-corps", root), first = root.firstElementChild;
  if (corps) corps.appendChild(sec); else if (first) first.after(sec); else root.appendChild(sec);
  liaUI();
  const log = $(".asklog", sec), inp = $("input", sec);
  const serveur = async (q, box) => {
    box.innerHTML = `<div class="iathink"><span></span><span></span><span></span>L'IA rédige une réponse à partir des données de la fiche…</div>`;
    try { const j = await (await iaFetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: q, faits: { ...ficheFaits(s, c), identite: ficheWd(s.id) } }) })).json();
      box.innerHTML = j.txt ? resumeHTML(j.txt) + `<p class="iafoot">Rédigé par le modèle d'IA du site à partir des chiffres de la fiche. Vérifiez les chiffres dans les étapes ci-dessus.</p>` : iaErr(j, "Réponse indisponible.");
    } catch (e) { box.innerHTML = `<p class="muted">L'IA est indisponible pour le moment. Les réponses instantanées restent disponibles.</p>`; }
  };
  const ask = async (q, force = false) => {
    q = q.trim(); if (q.length < 3) return;
    const item = document.createElement("div"); item.className = "askit"; item.innerHTML = `<p class="askq">${esc(q)}</p><div class="aska"><p class="muted">L'IA lit la fiche…</p></div>`; log.prepend(item);
    const box = $(".aska", item);
    if (force) { sec.scrollIntoView({ behavior: "smooth", block: "start" }); return serveur(q, box); }
    await loadAna();
    const loc = ficheReponse(s, c, q);
    if (loc) {
      box.innerHTML = resumeHTML(loc) + `<p class="iafoot">Réponse instantanée, tirée des chiffres de la fiche. Rien n'est généré au hasard : chaque chiffre vient des comptes publiés.</p><button type="button" class="fapp">✦ Approfondir avec l'IA</button>`;
      $(".fapp", box).onclick = ev => { ev.target.disabled = true; const d = document.createElement("div"); d.className = "aska"; item.appendChild(d); serveur(q, d); };
      return;
    }
    return serveur(q, box);
  };
  FICHE_ASK = (q, force) => { ask(q, force); if (!force) sec.scrollIntoView({ behavior: "smooth", block: "start" }); };
  sec.addEventListener("click", e => { const b = e.target.closest("[data-ask]"); if (b) { b.disabled = true; ask(b.dataset.ask); } });
  $("form", sec).onsubmit = e => { e.preventDefault(); ask(inp.value); inp.value = ""; };
  if (new URLSearchParams(location.search).get("ia")) ficheVersIA();
}

/* ---------- L'IA locale de la fiche : faits Wikidata, et le cours sur un an même sans historique ---------- */
const FICHE_LA0 = window.localAssist;
window.localAssist = function (s, c, raw) {
  const q = typeof IA_txt === "function" ? IA_txt(raw) : String(raw).toLowerCase(), wd = s ? ficheWd(s.id) : null;
  if (wd && /(depuis quand|cree|creee|creation|fonde|fondee|fondation|date de naissance|siege|salaries|employes|effectifs?|personnes? (y )?travaill|\bpdg\b|patron|dirige|directeur general|\bceo\b|president|fondateur|fiche identite)/.test(" " + q + " ") && !/dividende|dette|marge|cours|prix|chere?/.test(q)) {
    const P = [], N = s.name;
    if (wd.fonde && /depuis|cree|creation|fond|existe|identite/.test(q)) P.push(`${N} a été créée en ${wd.fonde}, il y a ${+TODAY.slice(0, 4) - wd.fonde} ans.`);
    if (wd.siege && /siege|ou |identite|existe/.test(q)) P.push(`Son siège est à ${wd.siege}${wd.pays ? ` (${wd.pays})` : ""}.`);
    if (wd.effectif && /salari|employ|effectif|personne|travaill|identite/.test(q)) P.push(`Elle emploie environ ${F0.format(wd.effectif[0])} personnes${wd.effectif[1] ? ` (chiffre de ${wd.effectif[1]})` : ""}.`);
    if (/pdg|patron|dirige|directeur|ceo|president|fondateur/.test(q)) {
      if (wd.pdg) P.push(`Directeur général : ${wd.pdg.join(", ")}.`);
      if (wd.president) P.push(`Président du conseil : ${wd.president.join(", ")}.`);
      if (wd.fondateurs && /fondateur|identite/.test(q)) P.push(`${wd.fondateurs.length > 1 ? "Fondateurs" : "Fondateur"} : ${wd.fondateurs.join(", ")}.`);
    }
    if (P.length) { P.push("Source : Wikidata, base de connaissances ouverte. Le rapport annuel de l'entreprise fait foi en cas d'écart."); return P.join("\n"); }
  }
  let t = FICHE_LA0(s, c, raw);
  const p = s && pxOf(s);
  if (t && p && !p.p1y && p.h52 > p.l52 && /Dernier cours connu/.test(t) && !/Sur un an/.test(t)) {
    const x = v => eur(v, v >= 100 ? 0 : 2, p.cur);
    t = t.replace(/(Dernier cours connu[^\n]*\n?)/, `$1Sur un an, le cours a évolué entre ${x(p.l52)} (plus bas) et ${x(p.h52)} (plus haut).\n`);
  }
  return t;
};

/* ---------- Onglet Actualités : annonces, presse, agenda ---------- */
function tabActu(s, c, el) {
  const us = !!s.sec, fr = s.region === "FR", up = eventsOf(s.id).filter(e => e.date >= TODAY), past = eventsOf(s.id).filter(e => e.date < TODAY).reverse();
  const side = `<section class="panel"><div class="ph"><h2>À venir</h2></div>${up.length ? agendaHTML(up.slice(0, 6), false) : `<div class="pb muted" style="font-size:13.5px">Aucune date annoncée pour l'instant.</div>`}${up.find(e => e.source) ? `<div class="src">Sources : ${[...new Set(up.filter(e => e.source).map(e => e.source))].slice(0, 3).map(u => { let h = u; try { h = new URL(u).hostname.replace(/^www\./, ""); } catch (x) { } return `<a class="lnk" href="${esc(u)}" target="_blank" rel="noopener">${esc(h)}</a>`; }).join(", ")}</div>` : ""}</section>
      ${past.length ? `<section class="panel"><div class="ph"><h2>Passé</h2></div>${agendaHTML(past.slice(0, 3), false)}</section>` : ""}`;
  if (typeof actuFicheDetail === "function") {
    el.innerHTML = `<div class="fcols"><div id="factu"></div><aside class="fside">${side}</aside></div>`;
    try { actuFicheDetail($("#factu"), s); return; } catch (e) { }
  }
  el.innerHTML = `<div class="fcols"><div>
      <section class="panel"><div class="ph"><h2>Annonces officielles</h2></div><div class="pb" id="offi">${us || fr ? "" : `Cette société publie ses communiqués auprès du régulateur de son pays, sans flux ouvert. ${officielLink(s) ? `<a class="lnk" href="${esc(officielLink(s))}" target="_blank" rel="noopener">Site de l'entreprise</a>` : ""}`}</div>
        ${us || fr ? `<div class="src">Source : ${us ? "SEC, EDGAR" : "AMF, info-financiere.gouv.fr"}.</div>` : ""}</section>
      <section class="panel"><div class="ph"><h2>Dans la presse</h2><span class="light" style="font-size:12.5px">3 dernières semaines, France et monde</span></div><div class="pb" id="pres"></div></section>
    </div><aside class="fside">${side}</aside></div>`;
  presseBlock($("#pres"), { id: s.id, max: 25 });
  ficheVeille($("#pres"), 10000, `<div class="muted" style="font-size:13.5px">Aucun article de presse disponible pour le moment.</div>`);
  if (us) newsBlock($("#offi"), { src: "US", id: s.id, showCo: false });
  else if (fr) newsBlock($("#offi"), { params: "&isin=" + s.isin, showCo: false });
  ficheVeille($("#offi"), 12000, `<div class="muted" style="font-size:13.5px">Les annonces officielles ne sont pas disponibles pour le moment.</div>`);
}

/* Le module peut se charger après le premier affichage : on redessine alors la fiche avec la nouvelle mise en page. */
if (typeof R !== "undefined" && R && /^\/entreprise\/[a-z0-9-]+(\/(comptes|actualite|agenda|communaute))?\/?$/.test(location.pathname)) route();
