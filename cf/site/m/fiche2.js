/* Module « fiche2 » de bilan. : chargé après fiche.js, comparer.js, tableaux.js et analyse.js.
   Présentation de la fiche entreprise /entreprise/:id (demandes de Romain du 29 octobre) :
   - la courbe du cours s'affiche tout de suite dans l'en-tête de la vue d'ensemble (widget chargé en différé) ;
   - hiérarchie typographique : vrais titres de section, petites capitales grises réservées aux étiquettes ;
   - onglets « Vue d'ensemble / Les chiffres en détail / Actualités et discussion » en segments marqués, collants ;
   - étapes du parcours plus visibles (étapes déjà lues cochées) ;
   - « Face à ses concurrents directs » : chaque entreprise est représentée par son logo sur les barres ;
   - la taille et le rang dans le secteur sont cliquables : classement du secteur et comparaison avec les voisines de rang.
   Fonctions redéclarées (contenu repris) : companyHeader, ficheSommaire, pageCompany, etapesBind, ficheGraphBox,
   ficheGraphique, concurrentsHTML. Enveloppées : ficheMetierHTML, ficheAnalyse (le texte produit est complété). */

const FICHE2_CSS = `
/* En-tête : identité, cours, puis courbe + en bref côte à côte */
.fhero{overflow:visible}
.fhero .fh-t h1{font-size:32px}
.f2-mid{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);grid-template-areas:"ch vl" "pr pr";border-top:1px solid var(--line2)}
.f2-mid.f2-noc{grid-template-areas:"vl pr";grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)}
.f2-mid .fh-sum{display:contents}
.f2-chart{grid-area:ch;padding:16px 22px 12px;min-width:0}
.f2-ch-h{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:8px}
.f2-h{font-family:var(--serif);font-weight:800;font-size:19px;line-height:1.2;letter-spacing:-.01em;color:var(--ink);margin:0}
.f2-h span{white-space:nowrap}
.f2-note{font-size:12.5px;color:var(--grey)}
#tvchart.f2-tv{height:340px;position:relative;border-radius:10px}
.f2-nm{display:none}@media (max-width:760px){.f2-nd{display:none}.f2-nm{display:inline}}
#tvchart .tradingview-widget-container{height:100%}
#tvchart .tradingview-widget-container__widget{height:calc(100% - 20px)}
#tvchart .tradingview-widget-copyright{font-size:11px;color:var(--light);text-align:right;padding:3px 0 0;line-height:16px}
.f2-tvph{position:absolute;inset:0;display:grid;place-items:center;color:var(--light);font-size:13px;background:repeating-linear-gradient(0deg,transparent 0 59px,var(--line2) 59px 60px);border-radius:10px}
.f2-mid .fh-vl{grid-area:vl;padding:16px 22px 16px;border-left:1px solid var(--line2);min-width:0}
.f2-mid.f2-noc .fh-vl{border-left:0}
.f2-mid .fh-prof{grid-area:pr;border-left:0;border-top:1px solid var(--line2);padding:16px 22px 18px;min-width:0}
.f2-mid.f2-noc .fh-prof{border-top:0;border-left:1px solid var(--line2)}
.f2-prh{display:flex;justify-content:space-between;align-items:flex-start;gap:12px 20px;flex-wrap:wrap;margin-bottom:6px}
.fh-sum .f2-h{margin-bottom:2px}
.fh-sum .f2-sub{font-size:12.5px;color:var(--grey);margin:0 0 6px}
.fh-v{font-size:16px}
.fh-feu{font-size:14px}
.f2-mid .fh-go{margin-top:14px;padding-top:12px}
.f2-mid:not(.f2-noc) .fh-pl .prof{display:grid;grid-template-columns:repeat(var(--n,5),minmax(0,1fr));gap:4px 28px}@media (max-width:1000px){.f2-mid:not(.f2-noc) .fh-pl .prof{grid-template-columns:repeat(auto-fill,minmax(170px,1fr))}}
.f2-mid:not(.f2-noc) .fh-pl .prof .pa2{grid-template-columns:1fr;gap:7px}
.f2-mid:not(.f2-noc) .fh-pl .prof .note{grid-column:1/-1}
.fh-prof .prof .pa2 .pt b{font-size:14px}
.fh-prof .prof .pa2 .pt small{color:var(--grey);font-size:12px}
.fh-pm .pmini small{font-size:12px;color:#55524C;text-transform:none;letter-spacing:0;font-weight:600}
.f2-rk{display:flex;align-items:center;gap:6px 12px;flex-wrap:wrap;margin:0;padding:8px 14px;border:1.5px solid var(--line);border-radius:12px;background:#fff;font:inherit;font-size:13.5px;color:var(--ink);cursor:pointer;text-align:left}
.f2-rk:hover,.f2-rk:focus-visible{border-color:var(--ink);outline:none}
.f2-rk b{font-family:var(--mono);font-size:15px}
.f2-rk .f2-go{margin-left:auto;font-weight:600;white-space:nowrap;text-decoration:underline;text-decoration-color:var(--lime);text-decoration-thickness:3px;text-underline-offset:3px}
/* Onglets : segments marqués, collants sous la barre du site */
.f2tabs.qtabs{position:sticky;top:57px;z-index:21;display:block;padding:8px 0;margin:-4px 0 6px;background:var(--page);overflow:visible;gap:0}
.f2seg{display:flex;gap:4px;padding:4px;background:#EAE5DA;border-radius:14px;max-width:100%;overflow-x:auto;scrollbar-width:none}
.f2seg::-webkit-scrollbar{display:none}
.f2tabs.qtabs a{flex:1 1 0;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 16px;border:0;border-radius:11px;font-size:15px;font-weight:600;color:#4A4741;white-space:nowrap;text-decoration:none;min-width:0}
.f2tabs.qtabs a svg{width:17px;height:17px;flex:none;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.f2tabs.qtabs a:hover{background:rgba(255,255,255,.6);color:var(--ink)}
.f2tabs.qtabs a.on{background:var(--ink);color:#fff;box-shadow:0 1px 3px rgba(17,18,20,.25)}
.f2tabs.qtabs a.on svg{stroke:#D6F26B}
.f2tabs .f2ts{display:none}
/* Étapes du parcours */
.etapes{top:124px;padding:8px 0 10px;margin:0 0 14px;border-bottom:1.5px solid var(--line)}
.etapes .etl{font-size:13px;font-weight:600;color:var(--ink)}
.etapes button{font-size:14px;font-weight:500;padding:8px 14px 8px 9px;border:1.5px solid var(--line);color:#3E3B36}
.etapes button:hover{border-color:var(--ink);color:var(--ink)}
.etapes button span{width:22px;height:22px;font-size:12px;background:#EAE5DA}
.etapes button.fait span{background:#DDEFE3;color:var(--g)}
.etapes button.on{font-weight:600}
.fside{top:190px}
/* Titres de section dans la fiche */
#ctab .ph{padding:18px 22px 10px;border-bottom:1px solid var(--line2);margin-bottom:2px}
#ctab .ph h2{font-size:22px;line-height:1.2}
#ctab .fside .ph{padding:14px 18px 6px;border-bottom:0}
#ctab .fside .ph h2{font-size:17px}
#ctab .ph > .light,#ctab .ph > span.light{color:var(--grey)!important}
#ctab .fm h3{font-size:18px;font-weight:800;margin:0 0 12px;color:var(--ink)}
#ctab .fbt{font-family:var(--sans);text-transform:none;letter-spacing:0;font-size:14px;font-weight:600;color:var(--ink);margin:16px 0 8px}
#ctab .fbt:first-child{margin-top:0}
#ctab .kick{color:#6E6A63}
#ctab h3{color:var(--ink)}
.ftile-lk{display:block;text-decoration:none;color:inherit;cursor:pointer;font:inherit;text-align:left;width:100%;border:1.5px solid var(--line)!important;transition:border-color .15s}
.ftile-lk:hover,.ftile-lk:focus-visible{border-color:var(--ink)!important;outline:none}
.ftile-lk .f2-go{display:block;margin-top:6px;font-size:12.5px;font-weight:600;color:var(--ink);text-decoration:underline;text-decoration-color:var(--lime);text-decoration-thickness:3px;text-underline-offset:3px}
.f2-anrk{display:inline-block;margin-top:6px;background:none;border:0;padding:0;font:inherit;font-size:13px;font-weight:600;color:var(--ink);cursor:pointer;text-decoration:underline;text-decoration-color:var(--lime);text-decoration-thickness:3px;text-underline-offset:3px}
.f2-up{margin:0 0 14px}
.f2-up button{font:inherit;font-size:13.5px;font-weight:600;background:#fff;border:1.5px solid var(--line);border-radius:99px;padding:7px 14px;cursor:pointer;color:var(--ink)}
.f2-up button:hover{border-color:var(--ink)}
/* Concurrents : logos sur les barres */
.f2-dots{position:relative;height:var(--h,34px);margin:0 16px}
.f2-dots .trk{position:absolute;left:-16px;right:-16px;top:calc(var(--y0,17px) - 2px);height:4px;background:#EFEAE0;border-radius:2px}
.f2-dots .cmpr-med{top:calc(var(--y0,17px) - 12px);height:24px}
.f2-lgd{position:absolute;top:calc(var(--y0,17px) + var(--lane,0) * 26px);transform:translate(-50%,-50%);display:block;border-radius:50%;line-height:0;outline:none;z-index:1;transition:top .15s}
.f2-lgd .lg{border-radius:50%;box-shadow:0 0 0 2px #fff,0 0 0 3px #9C968C;background:#fff}
.f2-lgd .lg b{font-size:10px}
.f2-lgd.me{z-index:3}
.f2-lgd.me .lg{box-shadow:0 0 0 2.5px #fff,0 0 0 5px var(--c,var(--ink)),0 2px 6px rgba(17,18,20,.25)}
.f2-lgd:focus-visible .lg,.f2-lgd:hover .lg{box-shadow:0 0 0 2px #fff,0 0 0 4px var(--ink)}
.f2-lgd.me:hover .lg{box-shadow:0 0 0 2.5px #fff,0 0 0 5px var(--c,var(--ink)),0 0 0 7px rgba(17,18,20,.2)}
.f2-lgd .f2-stem{position:absolute;left:50%;width:1.5px;background:#B9AE97;transform:translateX(-50%)}
.f2-lgd .f2-me{position:absolute;left:50%;bottom:calc(100% + 7px);transform:translateX(-50%);font-size:10.5px;font-weight:700;line-height:1;white-space:nowrap;background:var(--ink);color:#fff;border-radius:6px;padding:3px 6px;pointer-events:none}
.f2-dots.f2-hasme{margin-top:18px}
.f2-lgd.bord-g .f2-me{left:-6px;transform:none}.f2-lgd.bord-d .f2-me{left:auto;right:-6px;transform:none}
.f2-leg{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin:10px 0 2px;font-size:12.5px;color:var(--grey)}
.f2-leg i{display:inline-block;vertical-align:middle;margin-right:5px}
.f2-leg .lm{width:16px;height:16px;border-radius:50%;box-shadow:0 0 0 2px #fff,0 0 0 4px var(--ink)}
.f2-leg .lc{width:12px;height:12px;border-radius:50%;box-shadow:0 0 0 2px #fff,0 0 0 3px #9C968C;background:#fff}
.f2-leg .ld{width:2px;height:14px;background:var(--ink);opacity:.65}
.cmpr-rkc.f2-rkb{cursor:pointer;font:inherit;font-family:var(--mono);font-size:11.5px;background:#fff;text-decoration:underline;text-decoration-color:var(--lime);text-decoration-thickness:2px;text-underline-offset:2px}
.cmpr-rkc.f2-rkb.first{background:var(--lime)}
.cmpr-rkc.f2-rkb:hover{border-color:var(--ink)}
/* Classement du secteur (fenêtre) */
dialog.f2dlg{border:0;border-radius:18px;padding:0;width:min(560px,calc(100vw - 24px));max-height:min(86vh,760px);box-shadow:0 24px 64px -16px rgba(17,18,20,.45);color:var(--ink);background:#fff}
dialog.f2dlg::backdrop{background:rgba(17,18,20,.45)}
.f2dlg-in{display:flex;flex-direction:column;max-height:min(86vh,760px)}
.f2dlg-h{display:flex;gap:12px;align-items:flex-start;padding:18px 20px 12px;border-bottom:1px solid var(--line2)}
.f2dlg-h h2{font-family:var(--serif);font-size:21px;margin:0;line-height:1.2}
.f2dlg-h p{margin:4px 0 0;font-size:13.5px;color:var(--grey);line-height:1.45}
.f2dlg-x{margin-left:auto;flex:none;width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:#fff;font-size:20px;line-height:1;cursor:pointer;color:var(--grey)}
.f2dlg-x:hover{border-color:var(--ink);color:var(--ink)}
.f2dlg-l{overflow-y:auto;padding:6px 8px;margin:0;list-style:none}
.f2dlg-l li a{display:grid;grid-template-columns:30px 26px minmax(0,1fr) minmax(60px,30%) 86px;gap:10px;align-items:center;padding:7px 12px;border-radius:10px;color:var(--ink);text-decoration:none;font-size:14px}
.f2dlg-l li a:hover{background:var(--soft)}
.f2dlg-l li.me a{background:#F3F8E4;font-weight:700}
.f2dlg-l li.vois a{background:#FBF9F2}
.f2dlg-l .r{font-family:var(--mono);font-size:12.5px;color:var(--grey);text-align:right}
.f2dlg-l .n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.f2dlg-l .b{height:8px;background:var(--line2);border-radius:4px;overflow:hidden}.f2dlg-l .b i{display:block;height:100%;background:#B9AE97;border-radius:4px}
.f2dlg-l li.me .b i{background:var(--ink)}
.f2dlg-l .v{font-family:var(--mono);font-size:12.5px;white-space:nowrap;text-align:right;min-width:64px}
.f2dlg-l .gap{padding:2px 12px 4px;font-size:13px}.f2dlg-l .gap button{font-size:13px;color:var(--grey)}
.f2dlg-f{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:12px 20px 16px;border-top:1px solid var(--line2)}
.f2dlg-f .btn{display:inline-flex;align-items:center;height:42px;text-decoration:none}
.f2dlg-f small{flex-basis:100%;color:var(--light);font-size:12px;line-height:1.45}
.f2-mid.f2-miss:not(.f2-noc){grid-template-areas:"ch vl" "ch pr"}
.f2-mid.f2-miss:not(.f2-noc) .fh-prof{border-left:1px solid var(--line2)}
@media (max-width:1100px){.f2-mid{grid-template-columns:minmax(0,1.15fr) minmax(0,1fr)}.f2-mid .fh-go{display:none}}
@media (max-width:900px){
  .f2-mid,.f2-mid.f2-noc{grid-template-columns:minmax(0,1fr);grid-template-areas:"ch" "vl" "pr"}
  .f2-mid .fh-vl{border-left:0;border-top:1px solid var(--line2)}
  .f2-mid.f2-noc .fh-vl{border-top:0}
  .f2-mid.f2-noc .fh-prof{border-left:0;border-top:1px solid var(--line2)}
  .f2-rk{width:100%}
  .f2-mid.f2-miss:not(.f2-noc){grid-template-areas:"ch" "vl" "pr"}.f2-mid.f2-miss:not(.f2-noc) .fh-prof{border-left:0}
}
@media (max-width:760px){
  .f2-lg2{display:none}.f2-rk{width:auto;padding:7px 12px}
  .fhero .fh-t h1{font-size:26px}
  .f2-chart{padding:12px 16px 8px}
  #tvchart.f2-tv{height:220px;min-height:220px}
  .f2-h{font-size:18px}
  .f2-mid .fh-vl,.f2-mid .fh-prof{padding:12px 16px}
  .f2tabs.qtabs{top:52px;padding:6px 0;transition:top .2s}
  .bar.hide ~ main .f2tabs.qtabs{top:0}
  .f2tabs.qtabs a{padding:9px 6px;font-size:13.5px;gap:6px}
  .f2tabs.qtabs a svg{width:15px;height:15px}
  .f2tabs .f2tl{display:none}.f2tabs .f2ts{display:inline}
  .f2tabs.qtabs a{flex:1 1 auto}
  .fh-act{gap:6px}.fh-act .favbtn{font-size:13px;padding:5px 11px}
  .etapes{top:110px}
  .bar.hide ~ main .etapes{top:58px}
  .etapes button{font-size:13.5px;padding:7px 12px 7px 8px}
  #ctab .ph{padding:14px 16px 8px}
  #ctab .ph h2{font-size:20px}
  #ctab .fm h3{font-size:17px}
  .f2-dots{margin:0 13px}.f2-dots .trk{left:-13px;right:-13px}
  .f2dlg-l li a{grid-template-columns:26px 24px minmax(0,1fr) auto;padding:7px 8px}
  .f2dlg-l .b{display:none}
}
@media (max-width:420px){.f2tabs.qtabs a svg{display:none}.f2tabs.qtabs a{padding:9px 4px}}`;
document.head.insertAdjacentHTML("beforeend", `<style id="fiche2-css">${FICHE2_CSS}</style>`);

const FICHE2_ICONS = {
  "": `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>`,
  comptes: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16"/><path d="M7 16V10"/><path d="M12 16V5"/><path d="M17 16v-4"/></svg>`,
  actualite: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M8 9.5h8M8 12.5h5"/></svg>`,
};
const FICHE2_COURT = { "": "Vue d'ensemble", comptes: "Chiffres", actualite: "Actualités" };

/* ---------- Onglets de la fiche ---------- */
function fiche2Onglets(s, tab) {
  return `<nav class="qtabs f2tabs" aria-label="Rubriques de la fiche ${esc(s.name)}"><div class="f2seg">${CTABS.map(([k, n]) => `<a href="/entreprise/${s.id}${k ? "/" + k : ""}" class="${k === (tab || "") ? "on" : ""}"${k === (tab || "") ? ` aria-current="page"` : ""}>${FICHE2_ICONS[k] || ""}<span class="f2tl">${n}</span><span class="f2ts">${FICHE2_COURT[k] || n}</span></a>`).join("")}</div></nav>`;
}

/* ---------- Taille dans le secteur : classement et voisines de rang ---------- */
function fiche2Rang(s) {
  if (!s) return null;
  if (!s.missing && s.ca > 0) {
    const l = R.companies.filter(x => x.sector === s.sector && !x.missing && x.ca > 0).map(x => ({ c: x, v: caEur(x) })).sort((a, b) => b.v - a.v);
    const rank = l.findIndex(x => x.c.id === s.id) + 1;
    return rank && l.length > 2 ? { l, rank, n: l.length, crit: "ventes", lib: "par les ventes annuelles, converties en euros", fmt: v => big(v, "EUR") } : null;
  }
  const capOf = x => { const v = !x.missing && valo(x); if (v && v.capE) return v.capE; const p = pxOf(x); return p && p.cap ? toEur(p.cap, p.cur) : null; };
  const l = R.companies.filter(x => x.sector === s.sector).map(x => ({ c: x, v: capOf(x) })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  const rank = l.findIndex(x => x.c.id === s.id) + 1;
  return rank && l.length > 2 ? { l, rank, n: l.length, crit: "capitalisation", lib: "par la valeur en Bourse, au cours différé", fmt: v => capFmt(v) } : null;
}
function fiche2Voisines(s, r) { // l'entreprise et ses voisines de rang, dans la limite de la comparaison gratuite
  const max = (isPrem() ? 5 : FREE.cmp) - 1, i = r.rank - 1, out = [];
  for (const d of [-1, 1, -2, 2, -3, 3, -4, 4]) { const x = r.l[i + d]; if (x && out.length < max) out.push(x.c); }
  return out.sort((a, b) => r.l.findIndex(x => x.c === a) - r.l.findIndex(x => x.c === b));
}
const fiche2Ord = n => n === 1 ? "1re" : n + "e";
function fiche2RangBouton(s, cls = "f2-rk") {
  const r = fiche2Rang(s); if (!r) return "";
  return `<button type="button" class="${cls}" data-f2-rang="${s.id}" aria-haspopup="dialog"><span>Taille dans son secteur : <b>${fiche2Ord(r.rank)}</b> sur ${r.n}</span><span class="f2-go">Classement<span class="f2-lg2"> et comparaison</span></span></button>`;
}
function fiche2Classement(id) {
  const s = RBY[id], r = fiche2Rang(s); if (!r) return;
  const vois = fiche2Voisines(s, r), ids = [s, ...vois].map(c => c.id), max = r.l[0].v;
  const show = new Set(); r.l.forEach((x, i) => { if (i < 10 || Math.abs(i - (r.rank - 1)) <= 3) show.add(i); });
  let prev = -1; const rows = [];
  const gap = k => `<li class="gap"><button type="button" class="linkbtn" data-f2-tout>⋯ ${k} autre${k > 1 ? "s" : ""} : tout afficher</button></li>`;
  r.l.forEach((x, i) => {
    const vis = show.has(i);
    if (vis && i > prev + 1 && prev >= 0) rows.push(gap(i - prev - 1));
    if (vis) prev = i;
    const me = x.c.id === s.id, v = ids.includes(x.c.id) && !me;
    rows.push(`<li class="${me ? "me" : v ? "vois" : ""}"${vis ? "" : " hidden"}><a href="/entreprise/${x.c.id}"><span class="r">${i + 1}</span>${logo(x.c, 24)}<span class="n">${esc(x.c.name)}</span><span class="b"><i style="width:${Math.max(2, x.v / max * 100).toFixed(1)}%"></i></span><span class="v">${x.v > 0 ? r.fmt(x.v) : big(x.c.ca, x.c.currency)}</span></a></li>`);
  });
  if (prev < r.l.length - 1) rows.push(gap(r.l.length - 1 - prev));
  let d = $("#f2dlg");
  if (!d) { d = document.createElement("dialog"); d.id = "f2dlg"; d.className = "f2dlg"; document.body.appendChild(d); d.addEventListener("click", e => { if (e.target.closest("[data-f2-tout]")) { d.querySelectorAll(".f2dlg-l li[hidden]").forEach(li => li.hidden = false); d.querySelectorAll(".f2dlg-l li.gap").forEach(li => li.remove()); return; } if (e.target === d || e.target.closest(".f2dlg-x") || e.target.closest("a")) d.close(); }); }
  const noms = vois.map(c => esc(c.name));
  d.innerHTML = `<div class="f2dlg-in"><div class="f2dlg-h"><div><h2>${esc(secName(s))} : le classement</h2><p>${esc(s.name)} est <b>${fiche2Ord(r.rank)} sur ${r.n}</b> ${esc(r.lib)}, parmi les entreprises du secteur suivies par le site.</p></div><button type="button" class="f2dlg-x" aria-label="Fermer">×</button></div>
    <ol class="f2dlg-l">${rows.join("")}</ol>
    <div class="f2dlg-f">${vois.length ? `<a class="btn" href="/comparer?ids=${ids.join(",")}">Comparer avec ${listFr(noms)}</a>` : ""}<a class="more" href="/entreprises?secteur=${encodeURIComponent(s.sector)}">Tout le secteur ${esc(secName(s).toLowerCase())} →</a>
      <small>${r.crit === "ventes" ? "Ventes du dernier exercice publié par chaque entreprise (rapports ESEF et SEC), converties en euros aux taux de la BCE." : "Valeur en Bourse au cours différé, convertie en euros."} La taille ne dit pas si une action est chère ou intéressante : ce n'est pas un conseil.</small></div></div>`;
  try { d.showModal(); } catch (e) { d.setAttribute("open", ""); }
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-f2-rang]"); if (b) { e.preventDefault(); fiche2Classement(b.dataset.f2Rang); return; }
  const c = e.target.closest("[data-f2-courbe]"); if (c) { e.preventDefault(); const g = $(".f2-chart"); if (g) g.scrollIntoView({ behavior: "smooth", block: "center" }); }
});

/* ---------- En-tête : identité, cours, courbe, en bref, profil ---------- */
function ficheSommaire(s) {
  if (s.missing) {
    const wd = ficheWd(s.id), md = MED[s.sector] || {}, faits = [wd && wd.fonde ? `créée en ${wd.fonde}` : "", wd && wd.siege ? `siège à ${esc(wd.siege)}` : "", wd && wd.effectif ? `${F0.format(wd.effectif[0])} salariés` : ""].filter(Boolean);
    return `<div class="fh-sum"><div class="fh-vl"><h2 class="f2-h">En bref</h2><p class="fh-v" id="fverdict">${esc(s.desc || (s.fiche && s.fiche.fait) || "")}${faits.length ? ` ${esc(s.name)} : ${faits.join(", ")}.` : ""}</p><p class="muted" style="margin:0;font-size:13px">${esc(missingTxt(s))} : en attendant, son métier, son secteur, son cours et les réponses de l'IA sont ci-dessous.</p></div>
      <div class="fh-prof"><div class="f2-prh"><h2 class="f2-h">Son secteur en repères : <span>${esc(secName(s))}</span></h2>${fiche2RangBouton(s)}</div>${md.n >= 3 ? `<div class="fh-feu" style="margin-top:8px">${md.marge != null ? `<span>Marge médiane <b>${pct(md.marge, 1, false)}</b></span>` : ""}${md.g1 != null ? `<span>Croissance médiane <b>${pct(md.g1, 1)}</b></span>` : ""}${MEDPE[s.sector] ? `<span>PER médian <b>${F0.format(MEDPE[s.sector])}</b></span>` : ""}</div><p class="muted" style="margin:8px 0 0;font-size:12.5px">Valeurs de l'entreprise « du milieu » parmi les ${md.n} du secteur suivies par le site.</p>` : `<p class="muted" style="margin:4px 0 0;font-size:13.5px">Pas assez d'entreprises du secteur suivies pour donner des repères.</p>`}</div></div>`;
  }
  CURSYM = CUR[s.currency] || s.currency || "€";
  const t = quick(s), phrase = enBref(s, { ...s, currency: s.currency, year: s.year }, []);
  const rk = fiche2RangBouton(s), titre = `<div class="f2-prh"><div><h2 class="f2-h">Son profil dans le secteur <span>${esc(secName(s))}</span></h2><p class="f2-sub">Sa place parmi les entreprises du même secteur, critère par critère.</p></div>${rk}</div>`;
  const prof = (profilHTML(s) || "").replace(/<p class="kick"[^>]*>Son profil dans le secteur[^<]*<\/p>/, "");
  return `<div class="fh-sum"><div class="fh-vl"><h2 class="f2-h">En bref</h2><p class="f2-sub">Exercice ${esc(s.year)}, d'après les comptes officiels</p><p class="fh-v" id="fverdict">${phrase || esc(s.desc || "")}</p>
      ${t ? `<div class="fh-feu"><span class="f"><i></i><b>${t.fort}</b> point${t.fort > 1 ? "s" : ""} fort${t.fort > 1 ? "s" : ""}</span><span class="m"><i></i><b>${t.moyen}</b> dans la moyenne</span><span class="v"><i></i><b>${t.vig}</b> point${t.vig > 1 ? "s" : ""} de vigilance</span><button type="button" class="linkbtn lnk" data-et="retenir">Le détail</button></div>` : ""}
      <div class="fh-go"><p><b>Nouveau en Bourse ?</b> La fiche se lit en étapes, dans l'ordre où l'on se pose les questions : l'essentiel, son métier, ses comptes, son prix, puis vos questions à l'IA.</p><button type="button" class="btn" data-et="retenir">Commencer</button></div></div>
    <div class="fh-prof">${titre}${prof ? `<div class="fh-pl" style="--n:${Math.max(3, (prof.match(/class="pa2"/g) || []).length)}">${prof}</div><div class="fh-pm">${profilMini(s)}</div>` : `<p class="muted" style="margin:4px 0 0;font-size:13.5px">Pas assez d'entreprises comparables suivies dans son secteur pour la situer critère par critère.</p>`}</div></div>`;
}
function companyHeader(s, tab, chart = true) { // en-tête commun à toutes les pages d'une entreprise
  const pea = peaOk(s), place = String(s.tv || "").split(":")[0], bourse = (typeof IA_BOURSES !== "undefined" && IA_BOURSES[place]) || place;
  const cmp = `/comparer?ids=${[s, ...peersOf(s, 3).list].map(c => c.id).join(",")}`;
  const courbe = !tab && chart && s.tv;
  return `<div class="crumbs"><a href="/entreprises">Entreprises</a> › <a href="/entreprises?secteur=${s.sector}">${esc(secName(s))}</a> › <a href="/entreprise/${s.id}">${esc(s.name)}</a></div>
    <section class="panel fhero"><div class="fh-top">
      <div class="fh-id">${logo(s, 56)}<div class="fh-t"><h1>${esc(s.name)}</h1>${s.desc ? `<p class="fh-desc">${esc(s.desc)}</p>` : ""}
        <div class="fh-tags"><span title="Code de l'action">${esc(s.ticker)}</span>${bourse ? `<span>${esc(bourse)}</span>` : ""}<span>${esc(regName(s))}</span><a href="/entreprises?secteur=${s.sector}">${esc(secName(s))}</a>${pea != null ? `<span class="${pea ? "ok" : ""}">${pea ? "Éligible au PEA" : "Hors PEA : compte-titres"}</span>` : ""}</div>
        <div class="fh-act">${favBtn("c:" + s.id)}<a class="favbtn" href="${cmp}">Comparer à ses concurrents</a>${tab === "comprendre" ? "" : `<button type="button" class="favbtn fh-ia" data-fiche-ia>✦ Poser une question à l'IA</button>`}</div></div></div>
      <div class="px" id="pxh">${ficheCours(s)}</div></div>
      ${!tab ? `<div class="f2-mid${courbe ? "" : " f2-noc"}${s.missing ? " f2-miss" : ""}">${courbe ? `<div class="f2-chart"><div class="f2-ch-h"><h2 class="f2-h">Le cours de l'action</h2><span class="f2-note"><span class="f2-nd">Cours différé · choisissez la période au-dessus de la courbe</span><span class="f2-nm">Cours différé</span></span></div><div class="tv tv-chart f2-tv" id="tvchart" role="img" aria-label="Courbe du cours de ${esc(s.name)}"><div class="f2-tvph">Chargement de la courbe…</div></div></div>` : ""}${ficheSommaire(s)}</div>` : ""}
    </section>
    ${fiche2Onglets(s, tab)}`;
}
async function pageCompany(id, tab) {
  const s = RBY[id];
  if (!s) return pageNotFound();
  setNav("ent");
  if (tab === "agenda" || tab === "communaute") tab = "actualite";
  tab = CTABS.some(t => t[0] === (tab || "")) ? (tab || "") : "";
  setTitle(s.name + (tab ? " : " + CTABS.find(t => t[0] === tab)[1].toLowerCase() : ""));
  app.innerHTML = companyHeader(s, tab) + `<div id="ctab"><div class="empty">Chargement de la fiche…</div></div>`;
  if (!tab) ficheGraphique(s); // la courbe se charge pendant que la fiche arrive, sans la retarder
  const load = s.missing ? Promise.resolve(null) : (FULL[id] ? Promise.resolve(FULL[id]) : fetch(`/data/societes/${id}.json`).then(r => r.json()).then(j => FULL[id] = j).catch(() => null));
  const [c] = await Promise.all([load, PXP, ficheWDLoad(id)]);
  if (!ficheMemeId(id)) return; // l'utilisateur a changé de page entre-temps
  const ph = $("#pxh"); if (ph) ph.innerHTML = ficheCours(s);
  const sm = $(".fh-sum"); if (sm) sm.outerHTML = ficheSommaire(s); // le profil « Prix » a besoin du cours
  ({ "": tabBref, comptes: tabComptes, actualite: (s, c, el) => { tabActu(s, c, el); const d = document.createElement("div"); d.id = "discussion"; el.appendChild(d); tabCommu(s, c, d); } })[tab](s, c, $("#ctab"));
  if (tab === "comptes") $$("#ctab .scroll-x").forEach(x => { x.scrollLeft = x.scrollWidth; });
  if (!tab) { fiche2Etapes(); fiche2Lanes(); premStatus().then(() => { if (ficheMemeId(id)) assistantPanel(s, c, $("#ctab")); }); }
}

/* ---------- Courbe du cours : dans l'en-tête, chargée en différé ---------- */
function ficheGraphBox(s) { // l'étape « Son prix » renvoie à la courbe de l'en-tête (un seul graphique par page)
  if (!s.tv) return "";
  return `<p class="f2-up"><button type="button" data-f2-courbe>↑ La courbe du cours est en haut de la fiche</button></p>`;
}
function ficheGraphique(s) {
  const el = $("#tvchart"); if (!el || el.dataset.on || !el.classList.contains("f2-tv")) return;
  el.dataset.on = "1";
  const run = () => {
    if (!el.isConnected || !s.tv) return;
    tvChart(el, s.tv, s.name);
    try { const sc = el.querySelector("script"), cfg = JSON.parse(sc.innerHTML); cfg.symbols = [[s.name, s.tv + "|12M"]]; if (matchMedia("(max-width:760px)").matches) cfg.chartOnly = true; sc.innerHTML = JSON.stringify(cfg); } catch (e) { } // la courbe s'ouvre sur un an, plus parlant qu'une séance
  };
  if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 1200 }); else setTimeout(run, 300);
}

/* ---------- Parcours en étapes : étapes lues cochées, logos des concurrents replacés ---------- */
function fiche2Etapes() {
  const L = $$("#etapes [data-et]"), i = L.findIndex(b => b.classList.contains("on"));
  L.forEach((b, j) => { b.classList.toggle("fait", j < i); const n = b.querySelector("span"); if (n) n.textContent = j < i ? "✓" : String(j + 1); });
}
function etapesBind(s) {
  const show = k => {
    $$("#etapes [data-et]").forEach(b => b.classList.toggle("on", b.dataset.et === k));
    $$("#etapes-corps .etape").forEach(d => d.hidden = d.dataset.etape !== k);
    const u = new URL(location.href); u.searchParams.set("etape", k); history.replaceState({}, "", u.pathname + u.search);
    const nav = $("#etapes"); if (nav && nav.getBoundingClientRect().top < 0) nav.scrollIntoView({ block: "start" });
    else if (nav && nav.getBoundingClientRect().top > innerHeight * 0.6) nav.scrollIntoView({ block: "start", behavior: "smooth" });
    const b = $(`#etapes [data-et="${k}"]`); if (b && b.parentElement) { const p = b.parentElement; p.scrollLeft = Math.max(0, b.offsetLeft - (p.clientWidth - b.offsetWidth) / 2); }
    ficheGraphique(s); fiche2Etapes(); fiche2Lanes();
  };
  ETAPE_SHOW = show;
  if (!etapesBind.on) { etapesBind.on = true; app.addEventListener("click", e => { const b = e.target.closest("[data-et]"); if (b && app.contains(b) && ETAPE_SHOW) { e.preventDefault(); ETAPE_SHOW(b.dataset.et); } }); }
}

/* ---------- La taille dans le secteur devient cliquable (tuile « en chiffres », analyse) ---------- */
ficheMetierHTML = (orig => function (s, c) {
  const h = orig(s, c), r = fiche2Rang(s);
  if (!r || r.crit !== "ventes") return h;
  return h.replace(/<div class="ftile"><p class="kick">Taille dans son secteur<\/p>([\s\S]*?)<\/div>/, (m, corps) => `<button type="button" class="ftile ftile-lk" data-f2-rang="${s.id}" aria-haspopup="dialog"><span class="kick" style="display:block">Taille dans son secteur</span>${corps}<span class="f2-go">Voir le classement</span></button>`);
})(ficheMetierHTML);
ficheAnalyse = (orig => function (s, c) {
  const h = orig(s, c); if (!h || !fiche2Rang(s)) return h;
  return h.replace(/(<li class="anf-i[^"]*" data-anf="taille(?:_cap)?">[\s\S]*?)(<\/div><\/li>)/, `$1<button type="button" class="f2-anrk" data-f2-rang="${s.id}" aria-haspopup="dialog">Voir le classement du secteur</button>$2`);
})(ficheAnalyse);

/* ---------- Étape « Concurrents » : les logos des entreprises sur les barres ---------- */
function fiche2Lanes() { // écarte vers le bas les logos qui se chevauchent (mesure réelle en pixels)
  requestAnimationFrame(() => $$(".f2-dots").forEach(box => {
    const W = box.clientWidth; if (!W) return;
    const L = [...box.querySelectorAll(".f2-lgd")].map(e => ({ e, x: parseFloat(e.style.left) / 100 * W, w: e.querySelector(".lg") ? e.querySelector(".lg").offsetWidth : 24, me: e.classList.contains("me") }));
    const lanes = []; // couloir 0 : sur la barre ; 1, 2… : en dessous, reliés à leur position par un trait
    L.sort((a, b) => (b.me - a.me) || (a.x - b.x)).forEach(o => {
      let k = 0; while ((lanes[k] || []).some(([a, b]) => o.x - o.w / 2 - 3 < b && o.x + o.w / 2 + 3 > a)) k++;
      (lanes[k] = lanes[k] || []).push([o.x - o.w / 2, o.x + o.w / 2]); o.lane = k;
    });
    const down = Math.max(0, ...L.map(o => o.lane));
    box.style.setProperty("--h", (34 + down * 26) + "px");
    L.forEach(o => {
      o.e.style.setProperty("--lane", o.lane); o.e.classList.toggle("bord-g", o.me && o.x < 70); o.e.classList.toggle("bord-d", o.me && o.x > W - 70);
      let st = o.e.querySelector(".f2-stem");
      if (o.lane) { if (!st) { st = document.createElement("i"); st.className = "f2-stem"; o.e.prepend(st); } const h = o.lane * 26 - o.w / 2 - 2; st.style.height = Math.max(0, h) + "px"; st.style.top = -h + "px"; }
      else if (st) st.remove();
    });
  }));
}
addEventListener("resize", () => { clearTimeout(fiche2Lanes.t); fiche2Lanes.t = setTimeout(fiche2Lanes, 150); });
function concurrentsHTML(s) {
  const { peers, auto, all } = cmprFiche(s); if (!peers.length) return "";
  const CMAX = isPrem() ? 5 : FREE.cmp, link = "/comparer?ids=" + all.slice(0, CMAX).map(c => c.id).join(",");
  const X = cmprCtx(all), me0 = X.F[0];
  if (!me0.ok) return `<section class="panel" id="concurrents"><div class="ph"><h2>${auto ? "Des entreprises comparables" : "Ses concurrents directs"}</h2><a href="${link}">Comparer en détail →</a></div><div class="pb"><p class="muted" style="margin:0 0 6px">${esc(missingTxt(s, true))}</p><div class="cmpr-peers">${peers.map(c => `<a href="/entreprise/${c.id}">${logo(c, 22)}${esc(c.name)}</a>`).join("")}</div>${fiche2RangBouton(s)}</div></section>`;
  const firsts = [], lasts = [];
  const lines = CMPR_T.map(T => {
    const S = cmprRows(T, X), me = S.ok.find(x => x.F === me0), pos = cmprScale(T, S), ind = T.ind(X);
    const head = `<div class="cmpr-posh"><b>${CMPR_ICON[T.k]}${esc(T.t)}</b><small>${esc(ind)}</small>`;
    const mine = S.rows[0].r;
    if (!me || S.ok.length < 2) return `<li>${head}</div><p class="muted">${me ? (T.k === "solidite" && X.F.some(F => F.ok && F.bank) ? esc(cmprNoCmp(T, X)) : "Pas assez de chiffres publiés chez ses concurrentes pour comparer.") : mine && mine.gear ? `${esc(s.name)} : dette nette égale à ${esc(mine.txt)} de ses capitaux propres. Son résultat avant amortissements n'est pas publié : la comparaison en années de résultat n'est pas possible.` : `${esc(s.name)} : ${esc(T.na(me0, X))}.`}</p></li>`;
    const rk = S.sorted.indexOf(me) + 1, n = S.sorted.length;
    if (rk === 1) firsts.push(T); else if (rk === n) lasts.push(T);
    const dots = pos ? S.ok.filter(x => x.r.v != null).sort((a, b) => (a === me) - (b === me)).map(x => {
      const p = pos(x.r.v), isMe = x === me, col = T.neutral || !x.r.lv || x.r.lv === "moyen" ? "var(--ink)" : CMPR_COL[x.r.lv];
      return `<span class="f2-lgd${isMe ? " me" : ""}" style="left:${p.toFixed(2)}%;${isMe ? `--c:${col}` : ""}" tabindex="0" aria-label="${esc(x.F.c.name)} : ${esc(x.r.txt)}" ${tipAttr({ h: x.F.c.name, r: [[ind, x.r.txt, ""]], n: isMe ? "L'entreprise de cette fiche" : "Concurrente" })}>${isMe ? `<span class="f2-me">${esc(x.F.c.name)}</span>` : ""}${logo(x.F.c, isMe ? 30 : 24)}</span>`; }).join("") : "";
    const med = pos && me.r.med != null ? `<i class="cmpr-med" style="left:${pos(me.r.med).toFixed(2)}%" ${tipAttr({ h: "Médiane du secteur", r: [[(R.sectors[s.sector] || "").toLowerCase(), me.r.medTxt, SAND]] })}></i>` : "";
    const chip = T.k === "taille" && fiche2Rang(s) ? `<button type="button" class="cmpr-rkc f2-rkb${rk === 1 ? " first" : ""}" data-f2-rang="${s.id}" aria-haspopup="dialog" title="Voir le classement du secteur">${rk === 1 ? "1re" : rk + "e"} sur ${n}</button>` : `<span class="cmpr-rkc${rk === 1 ? " first" : ""}">${rk === 1 ? "1re" : rk + "e"} sur ${n}</span>`;
    return `<li>${head}${chip}</div>
      <div>${dots ? `<div class="f2-dots f2-hasme"><span class="trk"></span>${med}${dots}</div><div class="cmpr-dotl"><span>${T.k === "solidite" ? "moins endettée" : T.k === "prix" ? "moins chère" : "moins"}</span><span>${T.k === "solidite" ? "plus endettée" : T.k === "prix" ? "plus chère" : "plus"}</span></div>` : ""}</div>
      <p>${cmprPosSentence(T, X, S, me, s)}</p></li>`;
  });
  const lbl = T => ({ taille: "la taille", croissance: "la croissance", rentabilite: "la rentabilité", solidite: "la solidité financière", prix: "le prix en Bourse le plus bas", dividende: "le rendement du dividende" }[T.k]);
  const lead = firsts.length || lasts.length ? `Face à ${peers.filter(c => !c.missing).length > 1 ? `ses ${peers.filter(c => !c.missing).length} ${auto ? "voisines de secteur" : "concurrentes"}` : "sa concurrente"}, ${cmprB(s.name)} ${firsts.length ? `arrive en tête pour ${listFr(firsts.map(lbl))}` : ""}${firsts.length && lasts.length ? " ; elle est " : lasts.length ? "est " : ""}${lasts.length ? `dernière pour ${listFr(lasts.map(lbl).map(x => x.replace("le prix en Bourse le plus bas", "le prix en Bourse")))}` : ""}.` : "";
  const notes = cmprNotes(X);
  return `<section class="panel cmpr-clip" id="concurrents"><div class="ph"><h2>${auto ? "Face aux entreprises comparables" : "Face à ses concurrents directs"}</h2><a href="${link}">Comparer en détail →</a></div>
    <div class="pb" style="padding-bottom:8px">${lead ? `<p class="cmpr-fl">${lead}</p>` : ""}
      <p class="muted" style="margin:6px 0 0;font-size:13.5px">${auto ? `Aucun concurrent direct de ${esc(s.name)} n'est encore suivi sur le site : voici les entreprises de son secteur dont la taille est la plus proche.` : `Les entreprises qui vendent les mêmes produits ou services, aux mêmes clients.`} Chaque entreprise est placée sur les barres avec son logo : touchez ou survolez un logo pour voir son nom et son chiffre.</p>
      <div class="cmpr-peers"><a class="me" href="#etapes">${logo(s, 22)}${esc(s.name)}</a>${peers.map(c => `<a href="/entreprise/${c.id}">${logo(c, 22)}${esc(c.name)}</a>`).join("")}</div>
      <p class="f2-leg"><span><i class="lm"></i>${esc(s.name)} (grand logo cerclé)</span><span><i class="lc"></i>ses ${auto ? "voisines" : "concurrentes"}</span><span><i class="ld"></i>médiane du secteur</span></p>
      <ul class="cmpr-pos">${lines.join("")}</ul>
      ${notes.length ? `<ul class="cmpr-notes">${notes.map(n => `<li>${n}</li>`).join("")}</ul>` : ""}
      <div class="cmpr-fact"><a class="btn" href="${link}" style="display:inline-flex;align-items:center;height:40px">Comparer en détail</a><span class="light" style="font-size:12.5px">${all.length > CMAX ? `Les ${CMAX} premières en version gratuite, ${Math.min(5, all.length)} avec Premium.` : "Verdict, barres et tous les chiffres côte à côte."}</span></div></div>
    ${cmprIABar(all.length, s)}
    <div class="pb" style="padding-top:12px"><details class="cmpr-det" style="margin:0"><summary>Les chiffres de chaque concurrente<small>tous les indicateurs, côte à côte</small></summary><div>${cmprAllTable(X, s.id)}</div></details></div>
    <div class="src">Chiffres du dernier exercice publié par chaque entreprise (rapports ESEF et SEC), montants convertis en euros aux taux de la BCE. Cours différés de Google Finance. Ce classement décrit les comptes ; ce n'est pas un conseil.</div></section>`;
}

/* La fiche a pu être affichée avant le chargement de ce module : on la refait avec la nouvelle version */
if (typeof R !== "undefined" && R && R.companies && /^\/entreprise\/[^/]+(\/(comptes|actualite|agenda|communaute))?\/?$/.test(location.pathname)) { const [, , id, t] = location.pathname.split("/"); pageCompany(id, t); }
