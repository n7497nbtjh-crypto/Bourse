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
.f2tabs.qtabs :is(a,button){flex:1 1 0;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;border:0;border-radius:11px;background:none;font:inherit;font-size:15px;font-weight:600;color:#4A4741;white-space:nowrap;text-decoration:none;min-width:0;cursor:pointer}
.f2tabs.qtabs :is(a,button):hover{background:rgba(255,255,255,.6);color:var(--ink)}
.f2tabs.qtabs :is(a,button).on{background:var(--ink);color:#fff;box-shadow:0 1px 3px rgba(17,18,20,.25)}
.f2tabs.qtabs :is(a,button):focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.f2tabs .f2ts{display:none}
/* Étapes du parcours */
.etapes{top:124px;padding:8px 0 10px;margin:0 0 14px;border-bottom:1.5px solid var(--line)}
.etapes .etl{font-size:13px;font-weight:600;color:var(--ink)}
.etapes button{font-size:14px;font-weight:500;padding:8px 14px 8px 9px;border:1.5px solid var(--line);color:#3E3B36}
.etapes button:hover{border-color:var(--ink);color:var(--ink)}
.etapes button span{width:22px;height:22px;font-size:12px;background:#EAE5DA}
.etapes button.fait span{background:#DDEFE3;color:var(--g)}
.etapes button.on{font-weight:600}
.fside{top:130px}
@media (max-height:860px){.fside{position:static}}
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
  .f2tabs.qtabs :is(a,button){flex:none;padding:9px 12px;font-size:14px;min-height:40px}
  .f2tabs .f2tl{display:none}.f2tabs .f2ts{display:inline}
  .fh-act{gap:6px}.fh-act .favbtn{font-size:13px;padding:5px 11px}
  .etapes{top:110px}
  .bar.hide ~ main .etapes{top:58px}
  .etapes button{font-size:13.5px;padding:7px 12px 7px 8px}
  #ctab .ph{padding:14px 16px 8px}
  #ctab .ph h2{font-size:20px}
  #ctab .fm h3{font-size:17px}
  .f2dlg-l li a{grid-template-columns:26px 24px minmax(0,1fr) auto;padding:7px 8px}
  .f2dlg-l .b{display:none}
}
/* ===== Refonte du 29 octobre (13 h 30) : en-tête allégé, « En bref » en synthèse, concurrents en tableau ===== */
.rf-hero .fh-top{padding:16px 22px 14px;gap:20px}
.rf-hero .fh-t h1{font-size:28px}
.rf-hero .fh-desc{font-size:14.5px;margin-top:3px}
.rf-hero .fh-tags{margin-top:8px;align-items:center}.fh-ids{margin:4px 0 0;font-size:12.5px;color:var(--grey);font-variant-numeric:tabular-nums;display:flex;flex-wrap:wrap;gap:0 4px;align-items:center}.fh-copy{border:0;background:none;color:var(--grey);cursor:pointer;font-size:14px;padding:0 4px;line-height:1;position:relative}.fh-copy::after{content:"";position:absolute;inset:-14px -10px}.fh-copy.ok{color:var(--g)}.fh-tags2>*{position:relative;line-height:1.6}.fh-tags2>a::after{content:"";position:absolute;inset:-10px 0}
.rf-hero .fh-act{margin-top:10px}
.rf-mid,.rf-mid.f2-noc{grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);grid-template-areas:"ch vl"}
.rf-mid.f2-noc{grid-template-columns:minmax(0,1fr);grid-template-areas:"vl"}
.rf-mid #tvchart.f2-tv{height:316px}
.rf-sum{grid-area:vl;display:flex!important;flex-direction:column;gap:12px;padding:16px 22px 16px;border-left:1px solid var(--line2);min-width:0}
.rf-mid.f2-noc .rf-sum{border-left:0}
.rf-sh{display:flex;align-items:baseline;justify-content:space-between;gap:4px 12px;flex-wrap:wrap}
.rf-sum .f2-sub{font-size:12.5px;color:var(--grey);margin:0}
.rf-sum .fh-v{margin:0;font-size:16px;line-height:1.5}
.rf-pts{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px 18px}
.rf-bl h3{font-family:var(--sans);font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#6E6A63;margin:0 0 6px}
.rf-bl ul{list-style:none;margin:0;padding:0;display:grid;gap:5px}
.rf-bl li{display:flex;gap:8px;align-items:baseline;font-size:13.5px;line-height:1.4}
.rf-bl li i{flex:none;width:8px;height:8px;border-radius:50%;transform:translateY(-1px)}
.rf-anf{background:none;border:0;padding:0;font:inherit;color:inherit;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-color:transparent;text-underline-offset:3px;transition:text-decoration-color .15s}
.rf-anf:hover,.rf-anf:focus-visible{text-decoration-color:var(--lime);text-decoration-thickness:2px;outline:none}
.anf-i.rf-flash{background:#F3F8E4;border-radius:8px;transition:background .3s}
.rf-bl li.rf-v i{background:var(--g)} .rf-bl li.rf-d i{background:var(--o)}
.rf-ev ul{gap:4px}
.rf-ev li b{flex:none;min-width:58px;font-family:var(--mono);font-size:12.5px;font-weight:600}
.rf-ev li span{color:#3E3B36}
.rf-no{margin:0;font-size:13px;color:var(--grey);line-height:1.45}
.rf-lk{display:inline-block;margin-top:6px;font-size:13px;font-weight:600;color:var(--ink);text-decoration:underline;text-decoration-color:var(--lime);text-decoration-thickness:3px;text-underline-offset:3px}
.rf-foot{display:flex;justify-content:space-between;align-items:center;gap:8px 14px;flex-wrap:wrap;margin-top:auto;padding-top:10px;border-top:1px solid var(--line2);font-size:13px}
.rf-tally{display:flex;gap:12px;flex-wrap:wrap;color:var(--grey)}
.rf-tally span{display:inline-flex;align-items:center;gap:5px}
.rf-tally i{width:8px;height:8px;border-radius:50%}
.rf-tally .f i{background:var(--g)} .rf-tally .m i{background:var(--n)} .rf-tally .v i{background:var(--o)}
/* Étape « L'essentiel » : tuiles cliquables */
a.fk{color:inherit;text-decoration:none;transition:background .15s}
a.fk:hover,a.fk:focus-visible{background:#FBF9F2;outline:none}
a.fk:hover b{text-decoration:underline;text-decoration-color:var(--lime);text-decoration-thickness:3px;text-underline-offset:4px}
.fk-l{position:relative;transition:background .15s}
.fk-l .fk-a{color:inherit;text-decoration:none;display:block;outline:none}
.fk-l .fk-a::after{content:"";position:absolute;inset:0}
.fk-l .kick .prov-i,.fk-l .fk-a .def,.fk-l .fk-a button{position:relative;z-index:1}
.fk-l:hover,.fk-l:focus-within{background:#FBF9F2}
.fk-l:has(.fk-a:focus-visible){box-shadow:inset 0 0 0 2px var(--link,#1F4FD1)}
.fk-l:hover b{text-decoration:underline;text-decoration-color:var(--lime);text-decoration-thickness:3px;text-underline-offset:4px}
.rf-keys .fk{padding:16px 20px 16px;display:flex;flex-direction:column}
.rf-keys .fk .kick{font-size:12px;letter-spacing:.06em;align-items:center;min-height:22px}
.rf-keys .fk .vd{padding:2px 8px;border-radius:99px;font-size:11.5px;white-space:nowrap}
.rf-keys .fk.fk-fort .vd{background:#DDEFE3}.rf-keys .fk.fk-vig .vd{background:#FBE3D9}.rf-keys .fk.fk-moyen .vd{background:#EEEBE4}
.rf-keys .fk b{font-size:32px;line-height:1.1;margin:10px 0 10px;color:var(--ink)}
.rf-keys .fk .fk-r{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:6px 0;margin:0 0 8px;border-top:1px solid var(--line2);border-bottom:1px solid var(--line2);font-size:12.5px;color:var(--grey)}
.rf-keys .fk .fk-r b{font-size:14px;margin:0;line-height:1.3;color:var(--ink)}
.rf-keys .fk .fk-r b.up{color:var(--g)}.rf-keys .fk .fk-r b.dn{color:var(--o)}
.rf-keys .fk p{font-size:13px;line-height:1.45;color:var(--grey)}
.rf-keys .fk .fk-g{position:relative;display:block;height:6px;border-radius:9px;background:linear-gradient(90deg,var(--o),#E3D9A6 50%,var(--g));margin:4px 0 10px}
.rf-keys .fk .fk-g.fk-gn{background:linear-gradient(90deg,#E6E1D6,#B8B2A6)}
.rf-keys .fk .fk-g em{position:absolute;left:50%;top:-3px;width:2px;height:12px;background:var(--ink);opacity:.45;transform:translateX(-50%)}
.rf-keys .fk .fk-g i{position:absolute;top:-4px;width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid var(--ink);transform:translateX(-50%)}
.rf-keys .fk .fk-rr{display:flex;flex-direction:column;gap:3px;margin:0}
.rf-keys .fk .fk-rr > span{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:12.5px;color:var(--grey)}
.rf-keys .fk .fk-rr b{font-size:13.5px;margin:0;line-height:1.3;color:var(--ink);font-family:var(--mono)}.rf-keys .fk .fk-rr b.up{color:var(--g)}.rf-keys .fk .fk-rr b.dn{color:var(--o)}
.rf-keys .fk .fk-pos{display:block;margin-top:8px;font-size:12px;color:var(--light)}
.fcols.fcols-1{grid-template-columns:minmax(0,1fr)}
#rf-trim{padding:0 22px 16px}.rf-trimi{border:1px solid var(--line2);border-left:3px solid var(--lime);border-radius:10px;padding:12px 16px;background:#FDFCF7}
.rf-trimh{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px}.rf-trimh b{font-size:15px}.rf-trimh .light{font-size:12.5px}
.rf-trimc{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0 4px}.rf-trimc div{display:flex;flex-direction:column;gap:2px;padding:12px 14px;border:1px solid var(--rule);border-radius:8px;background:#fff}.rf-trimc span{font-size:12px;color:var(--grey)}.rf-trimc b{font-family:var(--mono);font-size:22px;line-height:1.1}.rf-trimc small{font-size:12.5px;font-weight:600}.rf-trimc small.up{color:var(--up)}.rf-trimc small.dn{color:var(--down)}@media (min-width:761px){.rf-trimc{grid-template-columns:repeat(4,minmax(0,1fr))}}
.rf-triml{font-size:13.5px;color:var(--grey);margin:8px 0 0;line-height:1.5}.rf-trimf{font-size:13px;margin:8px 0 0}
@media (max-width:760px){#rf-trim{padding:0 16px 14px}}
.rf-fct{width:100%;border-collapse:collapse;font-size:13px}
.rf-fct th,.rf-fct td{padding:7px 6px;border-top:1px solid var(--line2);text-align:right;white-space:nowrap}
.rf-fct thead th{border-top:0;font-size:11.5px;font-weight:600;color:var(--grey);padding-top:2px}
.rf-fct th[scope=row]{text-align:left;font-weight:500;padding-left:18px;max-width:130px}
.rf-fct td{font-family:var(--mono);letter-spacing:-.02em}.rf-fct td:last-child{padding-right:18px}
.rf-fct th[scope=row] a{display:flex;align-items:center;gap:7px;color:inherit;text-decoration:none;min-width:0}
.rf-fct th[scope=row] a span{overflow:hidden;text-overflow:ellipsis}
.rf-fct th[scope=row] small{font-size:10.5px;color:var(--o);font-weight:600}
.rf-fct tr.me{background:#F6F8E6}.rf-fct tr.me th,.rf-fct tr.me td{font-weight:700}
.rf-fct td.up,.rf-fcl .up{color:var(--g)}.rf-fct td.dn,.rf-fcl .dn{color:var(--o)}
.rf-fct tfoot th,.rf-fct tfoot td{border-top:1.5px solid var(--line);color:var(--grey);font-size:12px}
.rf-fct .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.rf-fcl{margin:0;padding:8px 18px 4px;font-size:11.5px;color:var(--grey);line-height:1.4}.rf-fcl span{font-weight:600}
.rf-fc .rf-fcrk{margin:8px 18px 0;width:calc(100% - 36px)}
/* 1d : verdict d'abord. « En bref » à gauche et en premier, la courbe à droite ; la phrase de synthèse en grand */
@media (min-width:901px){
  .rf-hero:not(.rf-etf) .rf-mid:not(.f2-noc){grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);grid-template-areas:"vl ch"}
  .rf-hero:not(.rf-etf) .rf-mid:not(.f2-noc) .rf-sum{border-left:0;border-right:1px solid var(--line2)}
}
.rf-hero .rf-sum .fh-v{font-family:var(--serif);font-size:20px;font-weight:500;line-height:1.4;letter-spacing:-.01em}
.rf-sum p.rf-tally{margin:0;gap:6px;font-size:13px}
.rf-sum p.rf-tally span{padding:4px 10px;border-radius:99px;font-weight:600;color:var(--ink)}
@media (max-width:760px){.rf-hero .rf-sum .fh-v{font-size:18px}}
.rf-sum p.rf-tally .f{background:#DDEFE3}.rf-sum p.rf-tally .m{background:#EEEBE4}.rf-sum p.rf-tally .v{background:#FBE3D9}
.rf-keysn{margin:0;padding:10px 20px;font-size:13px;color:var(--grey);border-bottom:1px solid var(--line2)}
/* Étape « Concurrents » : tableau côte à côte */
.rf-intro{margin:0;font-size:14px;line-height:1.55;color:#3E3B36}
.rf-lg{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;font-size:13px}
.rf-lg .dot,.rf-ctab .dot,.rf-cmp .dot{width:9px;height:9px;display:inline-block}
.rf-cmp .tbx-box{margin:4px 0 0}
.rf-ctab{min-width:780px;width:100%}
.rf-ctab th.lab{width:170px;min-width:150px}
.rf-ctab thead th{vertical-align:bottom;text-align:right;padding:10px 12px;line-height:1.25}
.rf-ctab thead th .rf-cth{display:inline-flex;gap:5px;align-items:center;font-size:13px;color:var(--ink);text-transform:none;letter-spacing:0;font-weight:700}
.rf-ctab thead th .rf-cth svg{width:14px;height:14px}
.rf-ctab thead th small{display:block;font-size:11px;font-weight:400;color:var(--grey);text-transform:none;letter-spacing:0;margin-top:2px;white-space:normal}
.rf-ctab td{vertical-align:middle;text-align:right;padding:10px 12px;height:58px}
.rf-ctab td small{display:block;font-family:var(--sans);font-size:11.5px;color:var(--grey);margin-top:2px;white-space:normal;line-height:1.25}
.rf-ctab td.rf-fort{background:#E6F3EB;color:#176B40}.rf-ctab td.rf-vig{background:#FBEBE2;color:#A8481A}.rf-ctab tr.z td.rf-fort{background:#DFEFE5}.rf-ctab tr.z td.rf-vig{background:#F8E3D7}
.rf-lg{display:inline-block;padding:1px 8px;border-radius:99px;background:#F1EFEA;font-size:12.5px;color:var(--ink)}.rf-lg-f{background:#E6F3EB;color:#176B40}.rf-lg-v{background:#FBEBE2;color:#A8481A}
.rf-ctab td.rf-fort small{color:var(--g)} .rf-ctab td.rf-vig small{color:var(--o)}
.rf-ctab .rf-cv{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:14px;font-weight:600;white-space:nowrap}
.rf-ctab .rf-na{color:var(--light)}
.rf-co{display:flex;align-items:center;gap:10px;color:var(--ink);text-decoration:none;min-width:0}
.rf-co .lg,.rf-card .lg{width:24px!important;height:24px!important;flex:none}
.rf-co .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;font-size:14px}
.rf-co:hover .nm{text-decoration:underline}
.rf-tag{display:inline-block;margin:3px 0 0 34px;font-size:11px;font-weight:600;color:var(--g);font-family:var(--sans);letter-spacing:0;text-transform:none}
.rf-ctab tr.rf-me th,.rf-ctab tr.rf-me td{background:#F5F8EA}
.rf-ctab tfoot th,.rf-ctab tfoot td{background:#FBF9F2;border-top:1.5px solid var(--line);font-size:13px;color:var(--grey);height:auto}
.rf-ctab tfoot td{font-family:var(--mono)}
.rf-ctab tfoot th .nm{text-transform:none;letter-spacing:0;font-size:13px;font-weight:600;color:var(--ink)}
.rf-ctab tfoot th small{display:block;font-size:11.5px;color:var(--light);font-weight:400}
.rf-h3{font-family:var(--serif);font-size:18px;font-weight:800;margin:4px 0 4px}
.rf-sub{margin:0 0 12px;font-size:13.5px;color:var(--grey);line-height:1.5}
.rf-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}
.rf-card{border:1px solid var(--line);border-radius:12px;padding:12px 14px 14px;background:#fff;display:flex;flex-direction:column}
.rf-card.rf-me{border-color:#BFD48A;background:#FBFDF4}
.rf-ch{display:flex;align-items:center;gap:10px;margin-bottom:6px;min-height:28px}
.rf-ch b{font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rf-ch .rf-tag,.rf-ch .rf-lk{margin:0 0 0 auto;flex:none}
.rf-card h4{font-family:var(--sans);font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin:10px 0 4px}
.rf-card h4.rf-p{color:var(--g)} .rf-card h4.rf-m{color:var(--o)}
.rf-card ul{margin:0;padding-left:16px;font-size:13.5px;line-height:1.45;display:grid;gap:3px}
.rf-place .prof{display:grid;grid-template-columns:repeat(var(--n,5),minmax(0,1fr));gap:4px 26px;margin-top:14px}
.rf-place .prof .pa2{grid-template-columns:1fr;gap:7px}
.rf-place .prof .note{grid-column:1/-1}
@media (max-width:1000px){.rf-place .prof{grid-template-columns:repeat(auto-fill,minmax(170px,1fr))}}
/* En-tête : sa place dans le secteur (30/10) : une jauge par critère, l'une sous l'autre */
.rf-hplace .prof{display:grid;grid-template-columns:1fr;gap:10px;margin-top:4px}.rf-hplace .prof .pa2{grid-template-columns:150px minmax(0,1fr);align-items:center;gap:4px 14px}
.rf-hplace .prof .pa2 b{font-size:14px}.rf-hplace .prof .pa2 small{display:block;font-size:12px;color:var(--grey)}
.rf-hplace .rf-tally{margin:0 0 12px}.rf-plnote{font-size:12px;color:var(--light);margin:10px 0 0;line-height:1.45}
.rf-hplace .fh-rk{margin-top:12px}
.rf-syn-in{display:block;padding:0}.rf-syn .rf-sum{border-left:0;padding:0}
@media (max-width:1100px){.rf-pts{grid-template-columns:minmax(0,1fr)}}
@media (max-width:900px){
  .rf-mid,.rf-mid.f2-noc{grid-template-columns:minmax(0,1fr);grid-template-areas:"vl" "ch"}
  .rf-sum{border-left:0;border-bottom:1px solid var(--line2)}
  .rf-mid .f2-chart{border-top:0}
  .rf-pts{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
}
@media (max-width:760px){
  .rf-hero .fh-top{padding:14px 16px 12px}
  .rf-hero .fh-t h1{font-size:25px}
  .rf-sum{padding:14px 16px}
  .rf-mid #tvchart.f2-tv{height:230px;min-height:230px}
  .rf-keys.fkeys{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  .rf-keys .fk .kick{justify-content:flex-start;flex-wrap:wrap;gap:4px 8px}.rf-keys .fk .fk-mx{display:none}.rf-keys .fk .kick .prov-i{width:20px;height:20px;font-size:11px}
  .rf-keys .fk{padding:11px 14px 12px}
  .rf-keys .fk b{font-size:24px;margin:6px 0}
  .rf-keys .fk .fk-r{font-size:11.5px;flex-direction:column;gap:0}
  .rf-keys .fk .fk-r b{font-size:13px}
  .rf-keys .fk p{font-size:12.5px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .rf-keys .fk .kick{flex-direction:column;gap:1px}
  .rf-keysn{padding:10px 16px}
  .rf-ctab th.lab{width:140px;min-width:140px}
  .rf-ctab{min-width:720px}
  .rf-co .nm{max-width:92px}
}
@media (max-width:480px){.rf-pts{grid-template-columns:minmax(0,1fr)}}
/* Fiche ETF : même hiérarchie que la fiche entreprise */
.rf-bl li.rf-n i{background:var(--n)}
.rf-etfhd{padding:16px 22px 14px}
.rf-etfhd .top{display:flex;gap:20px;align-items:flex-start;justify-content:space-between}
.rf-etfid{display:flex;gap:14px;align-items:flex-start;min-width:0;flex:1}
.rf-etfpx{flex:none;width:280px;min-height:0}
.rf-etf .rf-mid #tvchart.f2-tv{height:300px}
.rf-fr{margin:0;font-size:14px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center}
.rf-fr b{font-family:var(--mono);font-size:18px}
.rf-fr .etfvd{margin:0}
.rf-etfprof{border-top:1px solid var(--line2)}
.etfter-l{margin:0;font-size:14px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center}
.etfter-l b{font-family:var(--mono);font-size:18px}
#ecarac .etfkv{margin:0}
@media (max-width:900px){.rf-etfhd .top{flex-direction:column}.rf-etfpx{width:100%}}
@media (max-width:760px){.rf-etfhd{padding:14px 16px 12px}.rf-etf .rf-mid #tvchart.f2-tv{height:230px}}
`;
document.head.insertAdjacentHTML("beforeend", `<style id="fiche2-css">${FICHE2_CSS}</style>`);

/* ---------- Une seule rangée d'onglets (29 octobre, 17 h) ----------
   Les étapes de la vue d'ensemble (boutons, sans rechargement) et les deux autres pages de la fiche
   (« Les chiffres en détail », « Actualités et discussion », liens) sont réunies dans une seule barre collante.
   Plus de seconde rangée « Comprendre … : 1, 2, 3 » ; l'ancienne étape « Actualité » est en tête de l'onglet Actualités. */
const FICHE2_ORDRE = ["entreprise", "prix", "change", "metier", "faq", "@comptes", "@actualite"]; // 30/10 (retour de Romain) : trois parties, puis les pages de détail
const FICHE2_LIB = { retenir: ["L'essentiel", "Essentiel"], metier: ["Son métier", "Métier"], prix: ["Son prix", "Prix"], "@comptes": ["Les chiffres en détail", "Chiffres"], concurrents: ["Concurrents", "Concurrents"], "@actualite": ["Actualités et discussion", "Actualités"], faq: ["Questions", "Questions"] , synthese: ["Synthèse", "Synthèse"], entreprise: ["Comprendre l'entreprise", "L'entreprise"], change: ["Comprendre ce qui change", "Ce qui change"] };
function fiche2EtapesPrevues(s) { return (s.missing ? ["metier", "prix", "faq"] : ["entreprise", "prix", "change"]).map(k => [k, FICHE2_LIB[k][0]]); }
function fiche2Onglets(s, tab, L) {
  L = L || fiche2EtapesPrevues(s);
  const keys = new Set(L.map(x => x[0])), cur = tab ? null : etapeCourante(L);
  const lab = (k, n) => `<span class="f2tl">${esc(n || FICHE2_LIB[k][0])}</span><span class="f2ts">${esc(FICHE2_LIB[k] ? FICHE2_LIB[k][1] : n)}</span>`;
  const items = FICHE2_ORDRE.filter(k => k[0] === "@" || keys.has(k)).map(k => {
    if (k[0] === "@") { const t = k.slice(1), on = tab === t; return `<a href="/entreprise/${s.id}/${t}" class="${on ? "on" : ""}"${on ? ` aria-current="page"` : ""}>${lab(k)}</a>`; }
    const n = L.find(x => x[0] === k)[1];
    if (!tab) return `<button type="button" data-et="${k}" class="${k === cur ? "on" : ""}"${k === cur ? ` aria-current="true"` : ""}>${lab(k, n)}</button>`;
    return `<a href="/entreprise/${s.id}${k === L[0][0] ? "" : "?etape=" + k}">${lab(k, n)}</a>`;
  });
  return `<nav class="qtabs f2tabs" id="etapes" aria-label="Rubriques de la fiche ${esc(s.name)}"><div class="f2seg">${items.join("")}</div></nav>`;
}
function fiche2Centrer() { // sur téléphone, l'onglet actif reste visible dans la barre qui défile
  const b = $("#etapes .on"), p = b && b.parentElement; if (p) p.scrollLeft = Math.max(0, b.offsetLeft - (p.clientWidth - b.offsetWidth) / 2);
}
function etapesHTML() { return ""; } // la rangée « Comprendre … » est fusionnée dans fiche2Onglets

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
  return `<button type="button" class="${cls}" data-f2-rang="${s.id}" aria-haspopup="dialog"><span>Taille dans son secteur (${esc(secName(s).toLowerCase())}) : <b>${fiche2Ord(r.rank)}</b> sur ${r.n}</span><span class="f2-go">Classement</span></button>`;
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

/* ---------- En-tête : identité et cours, puis la courbe et « En bref » côte à côte ----------
   Refonte du 29 octobre (13 h 30) : plus de bandeau « profil dans le secteur » dans l'en-tête (il passe dans l'étape « Concurrents »),
   plus de bloc « Nouveau en Bourse ? ». « En bref » ne répète aucun chiffre des tuiles : la situation en mots,
   les atouts et les points à surveiller (titres de l'analyse), puis les prochaines dates. */
const RF_MOIS = d => { try { return new Date(d + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }); } catch (e) { return dShort(d); } };
function rfSituation(s, c) { // la situation en une ou deux phrases, à partir des seuils de lecture du site (aucun chiffre répété)
  const f = figuresOf(c), m = ratios(f), bank = isBank(s), it = {};
  lecture(s, f).forEach(i => { it[i.term] = i; });
  const lv = k => it[k] && it[k].lv !== "na" ? it[k].lv : null, traits = [];
  if (f.net != null && f.net < 0) traits.push("en perte sur son dernier exercice");
  else if (f.net != null || lv(bank ? "roe" : "marge")) { const r = lv(bank ? "roe" : "marge"); traits.push(r === "fort" ? "très rentable" : r === "vig" ? "peu rentable" : "rentable"); }
  if (!bank) {
    if (f.netDebt != null && f.netDebt < 0) traits.push("sans dette nette");
    else { const d = lv("lev") || lv("gear"); if (d) traits.push({ fort: "peu endettée", moyen: "modérément endettée", vig: "fortement endettée" }[d]); }
  }
  const vt = bank ? "revenus" : "ventes";
  if (m.g1 != null) traits.push(m.g1 >= 0.05 ? `dont les ${vt} progressent` : m.g1 <= -0.03 ? `dont les ${vt} reculent` : `aux ${vt} stables sur un an`);
  if (!traits.length) return "";
  const t1 = traits.length > 1 ? traits.slice(0, -1).join(", ") + (traits.at(-1).startsWith("dont") || traits.at(-1).startsWith("aux") ? ", " : " et ") + traits.at(-1) : traits[0];
  const out = [`${esc(s.name)} est une entreprise ${t1}.`];
  const v = valo(s), mp = MEDPE[s.sector];
  if (v && v.pe && mp) out.push(`En Bourse, son action est ${v.pe > mp * 1.3 ? "plus chère" : v.pe < mp * 0.75 ? "moins chère" : "ni plus ni moins chère"} que celles de son secteur au regard de son bénéfice.`);
  else if (v && f.net != null && f.net <= 0) out.push("En perte, son prix en Bourse ne se compare pas à son bénéfice.");
  return out.join(" ");
}
function rfPoints(s, c) { // atouts et points à surveiller : les titres de l'analyse (détaillés dans « L'essentiel »)
  if (typeof analyseForcesFaiblesses !== "function") return null;
  try { const r = analyseForcesFaiblesses(s, c); return { v: r.valorise.slice(0, 3), d: r.defaut.slice(0, 3), nv: r.valorise.length, nd: r.defaut.length }; } catch (e) { return null; }
}
function rfAVenir(s) {
  const up = eventsOf(s.id).filter(e => e.date >= TODAY).slice(0, 3);
  return `<div class="rf-bl rf-ev"><h3>À venir</h3>${up.length ? `<ul>${up.map(e => `<li><b>${esc(RF_MOIS(e.date))}</b><span>${esc(e.label)}</span></li>`).join("")}</ul>` : `<p class="rf-no">Aucune date annoncée pour l'instant. Le site les ajoute dès que l'entreprise les publie.</p>`}<a class="rf-lk" href="/entreprise/${s.id}/actualite">Agenda et actualités →</a></div>`;
}
function rfNiveaux(s, f) { // les niveaux (point fort / moyen / à surveiller) dérivent des positions des jauges (une seule source, lot A du 31/10)
  const A = Object.fromEntries(rfAxes(s).map(a => [a.k, a])), lv = k => A[k] && A[k].lv ? A[k].lv : null;
  return { croissance: lv("croissance"), rentabilite: lv("marge"), solidite: A.solidite && A.solidite.special === "sansdette" ? "fort" : lv("solidite"), valorisation: lv("prix") };
}
function rfTally(s, f) { const t = { fort: 0, moyen: 0, vig: 0 }; Object.values(rfNiveaux(s, f)).forEach(l => { if (l && t[l] != null) t[l]++; }); return t; }
function rfVerdictCourt(s, c) { return rfVerdictMots(s); } // deux ou trois mots, déduits des mêmes positions que les jauges
function ficheSommaire(s, c) {
  const wait = c === undefined && !s.missing && !FULL[s.id]; // les comptes arrivent : on réserve la place du verdict (pas de saut sur téléphone)
  if (c === undefined) c = FULL[s.id] || null;
  if (s.missing || !c) {
    const wd = ficheWd(s.id), md = MED[s.sector] || {}, faits = [wd && wd.fonde ? `créée en ${wd.fonde}` : "", wd && wd.siege ? `siège à ${esc(wd.siege)}` : "", wd && wd.effectif ? `${F0.format(wd.effectif[0])} salariés` : ""].filter(Boolean);
    return `<div class="fh-sum rf-sum${wait ? " fh-wait" : ""}"><h2 class="f2-h">En bref</h2><p class="fh-v" id="fverdict">${s.fiche && s.fiche.fait && s.fiche.fait !== s.desc ? esc(s.fiche.fait) + " " : ""}${faits.length ? `${esc(s.name)} : ${faits.join(", ")}.` : s.fiche && s.fiche.fait && s.fiche.fait !== s.desc ? "" : esc(s.desc || "")}</p>
      ${s.missing ? `<details class="rf-bientot"><summary><b>Comptes bientôt disponibles</b><span>Le cours, le métier et l'actualité sont déjà là · pourquoi ?</span></summary><p>${esc(missingTxt(s, true))}</p></details>` : `<p class="rf-no">Chargement des comptes…</p>`}
      ${s.missing && md.n >= 3 ? `<div class="rf-bl"><h3>Son secteur en repères : ${esc(secName(s))}</h3><div class="fh-feu">${md.marge != null ? `<span>Marge médiane <b>${pct(md.marge, 1, false)}</b></span>` : ""}${md.g1 != null ? `<span>Croissance médiane <b>${pct(md.g1, 1)}</b></span>` : ""}${MEDPE[s.sector] ? `<span>PER médian <b>${F0.format(MEDPE[s.sector])}</b></span>` : ""}</div></div>` : ""}
      ${rfAVenir(s)}</div>`;
  }
  CURSYM = CUR[s.currency] || s.currency || "€";
  const t = rfTally(s, figuresOf(c)); // même compte que les blocs « Comprendre l'entreprise »
  // 30/10 (Romain) : l'en-tête montre sa place dans le secteur (jauges face à la médiane) ; le verdict « En bref » passe dans l'onglet Synthèse
  const prof = (profilHTML(s) || "").replace(/<p class="kick"[^>]*>Son profil dans le secteur[^<]*<\/p>/, "").replace(/<p class="note"[^>]*>[\s\S]*?<\/p>\s*<\/div>\s*$/, "</div>");
  const rk = fiche2RangBouton(s), n = (prof.match(/class="pa2[ "]/g) || []).length;
  const vc = rfVerdictCourt(s, c);
  const prof3 = prof; // les libellés viennent de rfAxes (une seule source)
  const md = MED[s.sector] || {};
  return `<div class="fh-sum rf-sum rf-hplace">${vc ? `<p class="rf-vc">${esc(vc)}<small id="rf-date">Derniers comptes : exercice ${esc(s.year)}${c.fyEnd ? `, clos le ${esc(String(c.fyEnd).split("-").reverse().join("/"))}` : ""}</small></p>` : ""}<div class="rf-sh"><h2 class="f2-h">Sa place dans le secteur ${esc(secName(s).toLowerCase())}</h2><button type="button" class="rf-info" data-rf-info aria-label="Comment lire ces jauges" title="Comparé à la médiane de ${md.n || "?"} entreprises du secteur suivies par le site : à droite les mieux placées, au milieu la médiane. Pour le prix, à droite signifie moins cher au regard du bénéfice.">ⓘ</button></div>
      ${prof ? `<div class="fh-pl rf-pl" style="--n:${Math.max(3, n)}">${prof3.replace(/<\/div>\s*$/, "")}</div>` : `<p class="rf-no">Pas assez d'entreprises comparables dans son secteur pour la situer.</p>`}
      ${rk}</div>`;
}
function ficheSyntheseHTML(s, c) { // l'ancien « En bref » de l'en-tête, avec l'analyse détaillée (onglet Synthèse, 30/10)
  CURSYM = CUR[s.currency] || s.currency || "€";
  const t = quick(s), sit = rfSituation(s, c), P = rfPoints(s, c);
  const li = (i, k) => `<li class="rf-${k}"><i></i><button type="button" class="rf-anf" data-rf-anf="${esc(i.id)}" title="Lire le détail et la source">${esc(i.titre)}</button></li>`;
  return `<section class="panel rf-syn" id="synthese-bilan"><div class="ph"><h2>En bref</h2><span class="light" style="font-size:12.5px">Exercice ${esc(s.year)} · comptes officiels</span></div><div class="pb"><div class="fh-sum rf-sum rf-syn-in">
      <p class="fh-v" id="fverdict">${sit || esc(s.desc || "")}</p>
      ${t ? `<p class="rf-tally" title="Selon les seuils de lecture du site et la médiane du secteur"><span class="f"><i></i>${t.fort} point${t.fort > 1 ? "s" : ""} fort${t.fort > 1 ? "s" : ""}</span><span class="m"><i></i>${t.moyen} dans la moyenne</span><span class="v"><i></i>${t.vig} à surveiller</span></p>` : ""}
      ${P && (P.v.length || P.d.length) ? `<div class="rf-pts">
        <div class="rf-bl"><h3>Atouts</h3>${P.v.length ? `<ul>${P.v.map(i => li(i, "v")).join("")}</ul>` : `<p class="rf-no">Aucun atout net dans ses comptes.</p>`}</div>
        <div class="rf-bl"><h3>À surveiller</h3>${P.d.length ? `<ul>${P.d.map(i => li(i, "d")).join("")}</ul>` : `<p class="rf-no">Rien d'inquiétant dans les derniers comptes.</p>`}</div></div>` : ""}
      ${rfAVenir(s)}</div></div></section>
    ${ficheAnalyse(s, c)}
    ${ficheConfiance(c)}
    <div id="discussion" class="rf-disc"></div>`;
}
function companyHeader(s, tab, chart = true) { // en-tête commun à toutes les pages d'une entreprise
  const pea = peaOk(s), place = String(s.tv || "").split(":")[0], bourse = (typeof IA_BOURSES !== "undefined" && IA_BOURSES[place]) || place;
  const cmp = `/comparer?ids=${[s, ...peersOf(s, 3).list].map(c => c.id).join(",")}`;
  const courbe = !tab && chart && s.tv;
  return `<div class="crumbs"><a href="/entreprises">Entreprises</a> › <a href="/entreprises?secteur=${s.sector}">${esc(secName(s))}</a> › <a href="/entreprise/${s.id}">${esc(s.name)}</a></div>
    <section class="panel fhero rf-hero"><div class="fh-top">
      <div class="fh-id">${logo(s, 48)}<div class="fh-t"><h1>${esc(s.name)}</h1>${s.desc ? `<p class="fh-desc">${esc(s.desc)}</p>` : ""}
        <p class="fh-ids"><span title="Code de l'action">${esc(s.ticker)}</span>${bourse ? ` · <span>${esc(bourse)}</span>` : ""}${s.isin ? ` · <span title="Code ISIN : l'identifiant international de l'action, le même chez tous les courtiers">ISIN ${esc(s.isin)}</span> <button type="button" class="fh-copy" data-copy="${esc(s.isin)}" aria-label="Copier l'ISIN" title="Copier l'ISIN">⧉</button>` : ""}</p>
        <div class="fh-tags fh-tags2"><a href="/entreprises?secteur=${s.sector}">${esc(secName(s))}</a>${pea != null ? `<span class="${pea ? "ok" : ""}">${pea ? "PEA ✓" : "Compte-titres"}</span>` : `<span>${esc(regName(s))}</span>`}</div>
        <div class="fh-act">${favBtn("c:" + s.id)}<a class="favbtn" href="${cmp}">Comparer<span class="f2-lg2">&nbsp;à ses concurrents</span></a>${tab === "comprendre" ? "" : `<button type="button" class="favbtn fh-ia" data-fiche-ia>✦ Poser une question à l'IA</button>`}</div></div></div>
      <div class="px" id="pxh">${ficheCours(s)}</div></div>
      ${!tab ? `<div class="f2-mid rf-mid${courbe ? "" : " f2-noc"}">${courbe ? `<div class="f2-chart"><div class="f2-ch-h"><h2 class="f2-h">Le cours de l'action</h2><span class="f2-note"><span class="f2-nd">Graphique TradingView · cours différé</span><span class="f2-nm">Cours différé</span></span></div><div class="tv tv-chart f2-tv" id="tvchart" role="img" aria-label="Courbe du cours de ${esc(s.name)}"><div class="f2-tvph">Chargement de la courbe…</div></div></div>` : ""}${ficheSommaire(s, s.missing ? null : FULL[s.id])}</div>` : ""}
    </section>
    ${fiche2Onglets(s, tab)}`;
}

/* ---------- Colonne de droite : face à ses concurrents (29 octobre, 17 h 45) ----------
   L'entreprise et 3 concurrentes sur trois repères, la médiane du secteur en dernière ligne.
   Vert / orange : au-dessus / en dessous de la médiane (croissance, marge). Le PER n'est pas coloré : moins cher n'est ni bien ni mal. */
function rfFaceConc(s) {
  if (s.missing || !s.ca) return "";
  const P = peersOf(s, 3).list.filter(c => !c.missing); if (!P.length) return "";
  const md = MED[s.sector] || {}, mp = MEDPE[s.sector];
  const col = (v, m) => v == null || m == null || md.n < 3 ? "" : v > m * 1.1 + 0.002 ? "up" : v < m * 0.9 - 0.002 ? "dn" : "";
  const row = (c, me) => { const m = ratios(c), v = valo(c), y = c.year && c.year !== s.year ? `<small title="Dernier exercice publié">${esc(String(c.year))}</small>` : "";
    return `<tr class="${me ? "me" : ""}"><th scope="row"><a href="/entreprise/${c.id}">${logo(c, 20)}<span>${esc(c.name)}</span>${y}</a></th>
      <td class="${col(m.g1, md.g1)}">${m.g1 != null ? sgn(m.g1) : "–"}</td><td class="${isBank(c) ? "" : col(m.marge, md.marge)}">${!isBank(c) && m.marge != null ? pct(m.marge, 0, false) : "–"}</td><td>${v && v.pe ? F0.format(v.pe) : "–"}</td></tr>`; };
  const ids = [s, ...P].map(c => c.id).join(",");
  return `<section class="panel rf-fc rf-side-conc"><div class="ph"><h2>Face à ses concurrents</h2></div>
    <table class="rf-fct"><thead><tr><th scope="col"><span class="sr">Entreprise</span></th><th scope="col" title="Évolution des ventes sur un an">Ventes 1 an</th><th scope="col" title="Marge d'exploitation">Marge</th><th scope="col" title="Prix en Bourse en années de bénéfice">PER</th></tr></thead>
    <tbody>${row(s, true)}${P.map(c => row(c, false)).join("")}</tbody>
    ${md.n >= 3 ? `<tfoot><tr><th scope="row">Médiane du secteur</th><td>${md.g1 != null ? sgn(md.g1) : "–"}</td><td>${md.marge != null ? pct(md.marge, 0, false) : "–"}</td><td>${mp ? F0.format(mp) : "–"}</td></tr></tfoot>` : ""}</table>
    <p class="rf-fcl"><span class="up">vert</span> au-dessus de la médiane, <span class="dn">orange</span> en dessous. Derniers comptes publiés de chaque entreprise.</p>
    ${fiche2RangBouton(s, "f2-rk rf-fcrk")}
    <p class="fannall"><a class="more" href="/comparer?ids=${ids}">Comparer en détail →</a></p></section>`;
}

/* ---------- Vue d'ensemble : les étapes, une colonne latérale courte (dernières annonces) ---------- */
function tabBref(s, c, el) {
  const nav = $("#etapes"); if (nav) { nav.outerHTML = fiche2Onglets(s, "", etapesListe(s, c)); fiche2Centrer(); }
  // Plus de colonne latérale (29/10, demande de Romain) : les annonces ont leur onglet, les concurrents leur étape
  el.innerHTML = `<div class="fcols fcols-1"><div id="etapes-corps">${etapesCorps(s, c)}</div></div>`;
  if (new URLSearchParams(location.search).get("etape") === "synthese") { const d = $("#discussion"); if (d && !d.dataset.on && typeof tabCommu === "function") { d.dataset.on = "1"; try { tabCommu(s, c, d); } catch (e) { } } }
  etapesBind(s);
  if (typeof tblxSortable === "function") $$(".rf-ctab", el).forEach(t => tblxSortable(t));
  if (typeof tblxBindScroll === "function") tblxBindScroll(el);
  const qs = new URLSearchParams(location.search), voir = qs.get("voir");
  if (voir) { const d = $(`details[data-term="${voir}"]`) || $("#" + voir); if (d && d.tagName === "DETAILS") d.open = true; }
  if (typeof dirigeantsHTML === "function") dirigeantsHTML(s, $("#fdirig"));
  ficheGraphique(s);
  if (typeof ctxRafraichir === "function") setTimeout(() => { try { ctxRafraichir(); } catch (e) { } }, 0);
}
/* Le parcours : l'essentiel, le métier, les concurrents, les questions (l'actualité est l'onglet « Actualités et discussion »).
   Les comptes, le prix et le dividende sont regroupés par thème dans l'onglet « Les chiffres en détail ». */
const RF_ETAPES_CHIFFRES = { comptes: "", prix: "valorisation", dividende: "dividende" };
function etapesListe(s, c) {
  if (typeof ctxCharge === "function") ctxCharge();
  if (!c) return [
    ["metier", "Son métier", () => ficheMetierHTML(s, null) + `<section class="panel"><div class="pb muted">${missingTxt(s, true)}</div></section>`],
    ["prix", "Son prix", () => ficheGraphBox(s) + fichePrixSans(s)],
    ["faq", "Questions", () => faqHTML(s, null)],
  ];
  return [
    ["entreprise", "Comprendre l'entreprise", () => rfPartieEntreprise(s, c)],
    ["prix", "Comprendre son prix", () => rfPartiePrix(s, c)],
    ["change", "Comprendre ce qui change", () => rfPartieChange(s, c)],
  ];
}
/* Étape 1 : les indicateurs principaux (une tuile chacun, reliée à son thème détaillé), puis l'analyse sur plusieurs années */
const RF_TUILE_PROV = { Ventes: () => "ca", Marge: () => "marge", "Bénéfice": () => "net", Dette: k => k === "aucune" ? "netDebt" : "lev", Dividende: k => /%/.test(k) ? "payout" : "divPaid", Prix: () => "per" };
const RF_TUILE_THEME = { Ventes: "croissance", Marge: "rentabilite", "Bénéfice": "rentabilite", Dette: "bilan", Dividende: "dividende", Prix: "valorisation" };
/* Jauge d'un indicateur : position de l'entreprise parmi celles de son secteur (rang en pourcentage), la médiane au milieu.
   Rouge à gauche, vert à droite ; pour la dette et le prix, l'échelle est inversée (moins, c'est mieux). Le dividende n'est ni bon ni mauvais : jauge grise. */
const RF_JAUGE = { Ventes: ["g1", false], Marge: ["marge", false], "Bénéfice": ["ng", false], Dette: ["lev", true], Dividende: ["payout", null], Prix: ["pe", true] };
function rfSecteurVals(s, key) {
  const l = [];
  (R.companies || []).forEach(c => { if (c.sector !== s.sector || c.missing || (typeof donRetenue === "function" && !donRetenue(c))) return;
    let v = null; if (key === "pe" || key === "yld") { const x = valo(c); v = x && x[key]; } else if (key === "ca") { v = c.ca > 0 ? caEur(c) : null; } else { if (isBank(c) && (key === "lev" || key === "marge")) return; v = ratios(c)[key]; }
    if (v != null && isFinite(v)) l.push(v); });
  return l;
}
const RF_POS_AXE = { g1: "croissance", marge: "marge", roe: "marge", lev: "solidite", pe: "prix", rendement: "dividende" };
function rfPosition(s, key, inv, val) { // rang de l'entreprise (0 à 1) parmi son secteur pour un indicateur ; null si trop peu d'entreprises
  if (RF_POS_AXE[key]) { const a = rfAxes(s).find(x => x.k === RF_POS_AXE[key]); if (a && a.r) return { pos: a.r.p, n: a.r.n }; } // même position que la jauge de l'en-tête
  if (val == null || !isFinite(val)) return null;
  const vals = rfSecteurVals(s, key), n = vals.length; if (n < 5) return null;
  const below = vals.filter(x => x < val).length, eq = vals.filter(x => x === val).length; let pos = (below + eq / 2) / n; if (inv) pos = 1 - pos;
  return { pos, n };
}
function rfRepere(s, f, l) { // sous le chiffre : la jauge, puis deux repères courts (sur un an, médiane du secteur)
  const m = ratios(f), md = MED[s.sector] || {}, B = v => big(v, f.currency), spec = RF_JAUGE[l]; if (!spec) return "";
  const [key, inv] = spec;
  let val = key === "pe" ? (valo(s) || {}).pe : key === "lev" && f.netDebt != null && f.netDebt < 0 ? -1 : m[key];
  if (l === "Dividende" && !(f.divPaid >= 0.5 && f.net > 0)) val = null;
  const vals = rfSecteurVals(s, key), n = vals.length;
  let pos = null; if (val != null && isFinite(val) && n >= 5) { const below = vals.filter(x => x < val).length, eq = vals.filter(x => x === val).length; pos = (below + eq / 2) / n; if (inv) pos = 1 - pos; }
  const medV = key === "pe" ? MEDPE[s.sector] : (md.n >= 3 ? md[key] : null);
  const fmt = v => key === "pe" ? `${F0.format(v)} fois` : key === "lev" ? `${F1.format(v)} an${v >= 2 ? "s" : ""}` : key === "g1" || key === "ng" ? sgn(v) : pct(v, 0, false);
  const rep = [];
  if ((key === "g1" || key === "ng") && val != null) rep.push(`<span>Sur un an<b class="${val > 0 ? "up" : val < 0 ? "dn" : ""}">${sgn(val)}</b></span>`);
  if (key === "lev" && f.netDebt != null) rep.push(`<span>${f.netDebt < 0 ? "Trésorerie nette" : "Dette nette"}<b>${B(Math.abs(f.netDebt))}</b></span>`);
  if (medV != null && isFinite(medV)) rep.push(`<span><span>Médiane<span class="fk-mx"> du secteur</span></span><b>${fmt(medV)}</b></span>`);
  const mots = l === "Prix" ? ["Moins cher que", "Plus cher que"] : l === "Dette" ? ["Moins endetté que", "Plus endetté que"] : ["Mieux placé que", "Moins bien placé que"];
  const place = pos == null ? "" : inv === null ? `${pos >= 0.5 ? "Plus élevé" : "Plus bas"} que ${F0.format(Math.round((pos >= 0.5 ? pos : 1 - pos) * 100))} % du secteur` : pos >= 0.5 ? `${mots[0]} ${F0.format(Math.round(pos * 100))} % du secteur` : `${mots[1]} ${F0.format(Math.round((1 - pos) * 100))} % du secteur`;
  return `${pos != null ? `<span class="fk-g${inv === null ? " fk-gn" : ""}" title="${esc(s.name)} parmi les ${n} entreprises du secteur suivies par le site : la médiane est au milieu"><em></em><i style="left:${Math.round(pos * 100)}%"></i></span>` : ""}
    ${rep.length ? `<span class="fk-rr">${rep.join("")}</span>` : ""}${place ? `<small class="fk-pos">${place}</small>` : ""}`;
}
/* L'essentiel en six modules (30 octobre 2026) : présentation, croissance, rentabilité, solidité, valorisation, risques et
   événements. Chaque module : un verdict en une phrase, deux ou trois chiffres, la jauge « sa place dans le secteur », un lien
   pour approfondir. Lisible par un débutant (le verdict d'abord), complet pour un confirmé (les chiffres et la médiane). */
const RF6_LV = { fort: ["Point fort", "fort"], moyen: ["Dans la moyenne", "moyen"], vig: ["À surveiller", "vig"] };
function rf6Jauge(s, key, inv, val) { // jauge de position dans le secteur, ou rien
  const p = rfPosition(s, key, inv, val); if (!p) return "";
  const pos = Math.round(p.pos * 100), txt = inv === null ? `${pos >= 50 ? "plus élevé" : "plus bas"} que ${pos >= 50 ? pos : 100 - pos} % du secteur` : pos >= 50 ? `mieux placé que ${pos} % du secteur` : `moins bien placé que ${100 - pos} % du secteur`;
  return `<div class="rf6-jg${inv === null ? " rf6-jgn" : ""}" title="${esc(s.name)} parmi les ${p.n} entreprises du secteur suivies par le site ; la médiane est au milieu"><span class="fk-g${inv === null ? " fk-gn" : ""}"><em></em><i style="left:${pos}%"></i></span><small>${txt}</small></div>`;
}
function rf6Fig(l, v, sub, cls) { return v == null ? "" : `<div class="rf6-fig"><small>${l}</small><b${cls ? ` class="${cls}"` : ""}>${v}</b>${sub ? `<span>${sub}</span>` : ""}</div>`; }
function rf6Mod(n, titre, lv, verdict, figs, jauge, lien, extra = "") {
  const L = lv && RF6_LV[lv];
  return `<li class="rf6-mod${L ? " rf6-" + L[1] : ""}"><div class="rf6-h"><span class="rf6-n">${n}</span><h3>${titre}</h3>${L ? `<span class="vd vd-${L[1]}">${L[0]}</span>` : ""}</div>
    <div class="rf6-b">${figs ? `<div class="rf6-figs">${figs}</div><details class="rf6-why"><summary>Pourquoi ?</summary><p class="rf6-v">${verdict}</p></details>` : `<p class="rf6-v">${verdict}</p>`}${extra}</div>
    <div class="rf6-r">${jauge}${lien ? `<a class="rf6-lk" href="${lien[0]}">${lien[1]} →</a>` : ""}</div></li>`;
}
function ficheRetenirHTML(s, c, part) {
  const f = figuresOf(c), m = ratios(f), bank = isBank(s), B = v => big(v, f.currency), md = MED[s.sector] || {}, medOk = md.n >= 3, it = {};
  lecture(s, f).forEach(i => { if (!it[i.term]) it[i.term] = i; });
  const lv = k => it[k] && it[k].lv !== "na" ? it[k].lv : null, v = valo(s) || {}, pts = rfPoints(s, c), base = `/entreprise/${s.id}`;
  const medS = (val, fm) => val != null && medOk && isFinite(val) ? `médiane du secteur ${fm(val)}` : "";
  // A. Présentation
  const conc = (() => { try { const { peers } = cmprFiche(s); return peers.slice(0, 3).map(p => `<a href="/entreprise/${p.id}">${esc(p.name)}</a>`); } catch (e) { return []; } })();
  const presA = `${esc(s.desc || "")}${s.desc && !/[.!?]$/.test(s.desc) ? "." : ""} ${esc(s.name)} est cotée ${regName(s) ? `en ${esc(regName(s))}` : ""} dans le secteur ${esc(secName(s)).toLowerCase()}${conc.length ? `, aux côtés de ${conc.join(", ")}` : ""}.`;
  // B. Croissance
  const NIV = rfNiveaux(s, f), vt = bank ? "revenus" : "ventes", gLv = NIV.croissance;
  const croB = m.g1 == null ? `Le site n'a pas deux exercices consécutifs pour mesurer l'évolution des ${vt}.` : `Les ${vt} ${m.g1 >= 0.05 ? "progressent" : m.g1 <= -0.03 ? "reculent" : "sont stables"} sur un an (${sgn(m.g1)})${f.cagr != null && f.first ? `, ${sgn(f.cagr)} par an en moyenne depuis ${f.first}` : ""}${medS(md.g1, sgn) ? ` ; ${medS(md.g1, sgn)}` : ""}.`;
  const croF = rf6Fig(bank ? "Revenus" : "Ventes", B(f.ca), f.caPrev != null ? `${B(f.caPrev)} un an plus tôt` : "") + rf6Fig("Bénéfice net", f.net != null ? B(f.net) : null, m.ng != null ? `${sgn(m.ng)} sur un an` : "", f.net < 0 ? "dn" : "");
  // C. Rentabilité
  const rLv = NIV.rentabilite;
  const renB = f.net != null && f.net < 0 ? `L'entreprise est en perte sur son dernier exercice (${B(f.net)}).` : bank ? (m.roe != null ? `L'argent des actionnaires rapporte ${pct(m.roe, 0, false)} par an${medS(md.roe, x => pct(x, 0, false)) ? ` ; ${medS(md.roe, x => pct(x, 0, false))}` : ""}.` : "Rentabilité non mesurable avec les comptes lus.") : m.marge != null ? `Sur 100 ${CURSYM} de ventes, il reste ${e100(m.marge)} une fois payés salaires, achats et autres coûts${medS(md.marge, e100) ? ` ; ${medS(md.marge, e100)}` : ""}.` : m.nm != null ? `Sur 100 ${CURSYM} de ventes, il reste ${e100(m.nm)} de bénéfice net, une fois tout payé, impôts compris${medS(md.nm, e100) ? ` ; ${medS(md.nm, e100)}` : ""}.` : "Marge non mesurable avec les comptes lus.";
  const renF = rf6Fig(bank ? "Rendement des fonds propres" : "Marge d'exploitation", bank ? (m.roe != null ? pct(m.roe, 0, false) : null) : (m.marge != null ? pct(m.marge, m.marge < 0.1 ? 1 : 0, false) : null)) + rf6Fig(bank ? "" : "Marge nette", bank ? null : (m.nm != null ? pct(m.nm, 1, false) : null)) + (!bank && m.roe != null ? rf6Fig("Rendement des fonds propres", pct(m.roe, 0, false)) : "");
  // D. Solidité
  const dLv = NIV.solidite;
  const solB = bank ? "Pour une banque ou un assureur, la dette fait partie du métier : le site ne la juge pas avec les mêmes repères." : f.netDebt == null ? "Dette nette non lue dans les comptes." : f.netDebt < 0 ? `Pas de dette nette : la trésorerie dépasse les emprunts de ${B(-f.netDebt)}.` : m.lev != null ? `Il faudrait ${F1.format(m.lev)} an${m.lev >= 2 ? "s" : ""} de résultat d'exploitation (avant amortissements) pour rembourser la dette nette${medS(md.lev, x => `${F1.format(x)} an${x >= 2 ? "s" : ""}`) ? ` ; ${medS(md.lev, x => `${F1.format(x)} an${x >= 2 ? "s" : ""}`)}` : ""}.` : `Dette nette de ${B(f.netDebt)}${m.gear != null ? `, soit ${pct(m.gear, 0, false)} des fonds propres` : ""}.`;
  const solF = bank ? "" : rf6Fig(f.netDebt != null && f.netDebt < 0 ? "Trésorerie nette" : "Dette nette", f.netDebt != null ? B(Math.abs(f.netDebt)) : null) + rf6Fig("Trésorerie", f.cash != null ? B(f.cash) : null) + rf6Fig("Fonds propres", f.equity != null ? B(f.equity) : null);
  // E. Valorisation
  const mp = MEDPE[s.sector], pLv = NIV.valorisation;
  const valB = v.pe ? `L'action vaut ${F0.format(v.pe)} fois le bénéfice par action${mp ? ` ; ${medS(mp, x => `${F0.format(x)} fois`)}` : ""}. ${v.pe < (mp || 15) * 0.75 ? "Moins cher que son secteur : le marché attend moins de cette entreprise, ou doute." : v.pe > (mp || 15) * 1.3 ? "Plus cher que son secteur : le marché attend une forte croissance, ou paie la qualité." : "Dans la norme de son secteur."}` : f.net != null && f.net <= 0 ? "En perte, le prix de l'action ne se compare pas à son bénéfice." : "Pas de cours récent pour calculer la valorisation.";
  const valF = rf6Fig("PER", v.pe ? `${F0.format(v.pe)} fois` : null) + rf6Fig("Rendement du dividende", v.yld != null ? pct(v.yld, 1, false) : null, f.divPaid >= 0.5 && f.net > 0 && m.payout != null ? `${pct(m.payout, 0, false)} du bénéfice versé` : "") + rf6Fig("Capitalisation", v.capE ? big(v.capE / 1e6, "EUR") : null);
  // F. Risques et événements
  const up = eventsOf(s.id).filter(e => e.date >= TODAY).slice(0, 2);
  const risNom = x => { let t = typeof x === "string" ? x : x.t || x.titre || x.l || ""; if (rLv === "fort" && /^marge en baisse/i.test(t)) t = "Marge élevée mais en baisse sur un an"; return esc(t); }; // pas de contradiction avec « Rentabilité : point fort »
  const risB = pts && pts.d.length ? `À surveiller : ${pts.d.map(risNom).filter(Boolean).join(" · ")}.` : pts && pts.v.length ? "Aucun point de vigilance ressorti des comptes lus." : "Le site n'a pas assez d'éléments pour relever des risques.";
  const risX = part ? "" : `${up.length ? `<p class="rf6-ev">À venir : ${up.map(e => `<b>${esc(RF_MOIS(e.date))}</b> ${esc(e.label)}`).join(" · ")}</p>` : ""}<div id="rf-trim" hidden></div>`;
  const MODS = {
    pres: rf6Mod("01", "Son métier et ses concurrents", null, presA, "", "", ["#rf-metier", "Son métier en détail"]),
    cro: rf6Mod("02", "Croissance", gLv, croB, croF, rf6Jauge(s, "g1", false, m.g1), [base + "/comptes#rf-croissance", "Les chiffres"]),
    ren: rf6Mod("03", "Rentabilité", rLv, renB, renF, rf6Jauge(s, bank ? "roe" : m.marge != null ? "marge" : "nm", false, bank ? m.roe : m.marge != null ? m.marge : m.nm), [base + "/comptes#rf-rentabilite", "Les chiffres"]),
    sol: rf6Mod("04", "Solidité financière", dLv, solB, solF, bank ? "" : m.lev != null || (f.netDebt != null && f.netDebt < 0) ? rf6Jauge(s, "lev", true, f.netDebt != null && f.netDebt < 0 ? -1 : m.lev) : rf6Jauge(s, "gear", true, m.gear), [base + "/comptes#rf-bilan", "Les chiffres"]),
    val: rf6Mod(part ? "01" : "05", "Valorisation", pLv, valB, valF, rf6Jauge(s, "pe", true, v.pe), [base + "/comptes#rf-valorisation", "Le prix en détail"]),
    ris: rf6Mod(part ? "05" : "06", "Risques", null, risB, "", "", ["#rf-sources", "Points forts et à surveiller"], risX),
  };
  if (part === "entreprise") return `<section class="panel rf6" id="retenir"><div class="ph"><h2>Comprendre l'entreprise</h2><span class="light" style="font-size:12.5px">Exercice ${f.year} · comptes officiels</span></div>${typeof provComptesVieux === "function" ? provComptesVieux(c, s) : ""}
    <p class="rf6-lede">${rfSituation(s, c)}</p>
    <ol class="rf6-mods">${MODS.pres}${MODS.cro}${MODS.ren}${MODS.sol}${MODS.ris}</ol>
    <div class="src">Les verdicts comparent chaque chiffre à des seuils simples et à la médiane des entreprises du secteur suivies par le site. « À surveiller » n'est pas une mauvaise nouvelle en soi : c'est un point à regarder avant de se décider.</div></section>`;
  if (part === "prix") {
    const mp2 = MEDPE[s.sector], mot = v.pe && mp2 ? (v.pe > mp2 * 1.3 ? "Chère" : v.pe < mp2 * 0.75 ? "Bon marché" : "Prix dans la norme") : null;
    return `<section class="panel rf6" id="rf-prix"><div class="ph"><h2>Comprendre son prix</h2><span class="light" style="font-size:12.5px">Cours du jour · bénéfice ${f.year}</span></div>
    ${mot ? `<p class="rf-vc rf-vcp">${mot}<small>${F0.format(v.pe)} fois le bénéfice, médiane du secteur ${F0.format(mp2)} fois</small></p>` : v.pe ? `<p class="rf-vc rf-vcp">${F0.format(v.pe)} fois le bénéfice<small>pas assez d'entreprises du secteur pour une médiane</small></p>` : `<p class="rf6-lede">Pas de PER calculable : l'entreprise est en perte ou son bénéfice par action n'est pas lu.</p>`}
    <ol class="rf6-mods">${MODS.val}</ol></section>`;
  }
  const place = typeof profilHTML === "function" ? "" : "";
  return `<section class="panel rf6" id="retenir"><div class="ph"><h2>L'essentiel</h2><span class="light" style="font-size:12.5px">Exercice ${f.year} · comptes officiels</span></div>${typeof provComptesVieux === "function" ? provComptesVieux(c, s) : ""}
    <p class="rf6-lede">${rfSituation(s, c)}</p>
    <ol class="rf6-mods">
      ${MODS.pres}
      ${MODS.cro}
      ${MODS.ren}
      ${MODS.sol}
      ${MODS.val}
      ${MODS.ris}
    </ol>
    <div class="src">Les verdicts comparent chaque chiffre à des seuils simples et à la médiane des entreprises du secteur suivies par le site. « À surveiller » n'est pas une mauvaise nouvelle en soi : c'est ce qu'il faut regarder de près. Rien ici ne dit s'il faut acheter.</div></section>`;
}
document.head.insertAdjacentHTML("beforeend", `<style>
.rf6 .ph{border-bottom:1px solid var(--ink)}
.rf-ctab-t th.rf-coh{text-align:left;vertical-align:bottom;font-weight:600}.rf-ctab-t th.rf-coh .nm,.rf-ctab-t th.rf-medh .nm{text-transform:none;letter-spacing:0;font-size:14px;font-family:var(--sans)}.rf-ctab-t th.rf-coh .rf-co{display:flex;align-items:center;gap:8px;color:var(--ink);text-decoration:none}.rf-ctab-t th.rf-coh .rf-tag{display:block;margin-top:3px}
.rf-ctab-t th.rf-medh{text-align:right;vertical-align:bottom;color:var(--grey);font-weight:600}.rf-ctab-t th.rf-medh small{display:block;font-weight:400;text-transform:none;letter-spacing:0;font-family:var(--sans);font-size:11.5px}
.rf-ctab-t td.rf-medc{color:var(--grey);background:var(--soft)}.rf-ctab-t td.rf-q{font-size:12.5px;white-space:nowrap}
.rf-ctab-t th[scope=row] .rf-cth{display:block;font-weight:700}.rf-ctab-t th[scope=row] small{display:block;font-weight:400;color:var(--grey);text-transform:none;letter-spacing:0;font-family:var(--sans)}
.rf-ctab-t td.rf-me,.rf-ctab-t th.rf-me{box-shadow:inset 2px 0 0 var(--ink)}
.rf-ctab tr.rf-q td,.rf-ctab tr.rf-q th{color:var(--grey);font-size:12.5px}.rf-ctab tr.rf-q .nm{font-weight:500}.rf-ctab tr.rf-q th small{text-transform:none;letter-spacing:0;font-family:var(--sans)}
.rf-lirel{list-style:none;margin:8px 0 0;padding:0}.rf-lirel li{font-size:13.5px;line-height:1.5;color:var(--grey);padding:6px 0;border-top:1px solid var(--rule)}.rf-lirel b{color:var(--ink);font-weight:600}
.rf6-lede{font-size:16.5px;line-height:1.55;margin:0;padding:18px 22px 14px;max-width:820px;color:var(--ink)}
.rf6-mods{list-style:none;margin:0;padding:0 22px}
.rf6-mod{display:grid;grid-template-columns:200px minmax(0,1fr) 230px;gap:10px 28px;padding:18px 0;border-top:1px solid var(--rule)}
.rf6-h{display:flex;flex-direction:column;gap:6px;align-items:flex-start}
.rf6-n{font-family:var(--mono);font-size:12px;color:var(--light)}
.rf6-h h3{font-size:17px;font-weight:700;margin:0;line-height:1.2}
.rf6-v{margin:0;font-size:14.5px;line-height:1.55;max-width:600px}
.rf6-figs{display:flex;flex-wrap:wrap;gap:8px 28px;margin-top:2px}
.rf6-why{margin-top:10px}.rf6-why summary{cursor:pointer;font-size:13px;font-weight:600;color:var(--grey);list-style:none;display:inline-flex;align-items:center;gap:6px}.rf6-why summary::-webkit-details-marker{display:none}.rf6-why summary::before{content:"+";font-family:var(--mono);width:16px;height:16px;border:1px solid var(--rule);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px}.rf6-why[open] summary::before{content:"−"}.rf6-why .rf6-v{margin-top:8px}
.rf-vc{font-family:var(--serif);font-weight:800;font-size:30px;line-height:1.1;letter-spacing:-.015em;margin:0 0 12px;display:flex;flex-direction:column;gap:4px}.rf-vc small{font-family:var(--sans);font-weight:500;font-size:12.5px;color:var(--grey);letter-spacing:0}
.rf6-fig{display:flex;flex-direction:column;gap:2px;min-width:110px}.rf6-fig small{font-size:12px;color:var(--grey)}.rf6-fig b{font-family:var(--mono);font-weight:500;font-size:20px;line-height:1.1}.rf6-fig b.dn{color:var(--down)}.rf6-fig span{font-size:12px;color:var(--light)}
.rf6-ev{margin:10px 0 0;font-size:13.5px;color:var(--grey)}.rf6-ev b{color:var(--ink);font-weight:600}
.rf6-r{display:flex;flex-direction:column;gap:10px;align-items:flex-start}
.rf6-jg{width:100%}.rf6-jg .fk-g{position:relative;display:block;height:6px;border-radius:9px;background:linear-gradient(90deg,var(--o),#E3D9A6 50%,var(--g));margin:6px 0 8px}.rf6-jg .fk-g.fk-gn{background:linear-gradient(90deg,#E6E1D6,#B8B2A6)}
.rf6-jg .fk-g em{position:absolute;left:50%;top:-3px;width:2px;height:12px;background:var(--ink);opacity:.45;transform:translateX(-50%)}.rf6-jg .fk-g i{position:absolute;top:-4px;width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid var(--ink);transform:translateX(-50%)}
.rf6-jg small{font-size:12px;color:var(--grey)}
.rf6-lk{font-size:13.5px;font-weight:600;color:var(--ink)}
.rf6 .src{padding:14px 22px 18px;border-top:1px solid var(--rule)}
@media (max-width:900px){.rf6-mod{grid-template-columns:minmax(0,1fr);gap:10px}.rf6-h{flex-direction:row;align-items:center;flex-wrap:wrap}.rf6-r{width:100%}.rf6-lede{padding:14px 16px 10px;font-size:15.5px}.rf6-mods{padding:0 16px}.rf6 .src{padding:12px 16px 16px}}
</style>`);
/* Depuis la clôture : la dernière publication de résultats (trimestre, semestre), avec ses chiffres quand le site les a relevés
   (rapports 10-Q de la SEC, communiqués lus). Les indicateurs restent ceux de l'exercice clos : un trimestre ne donne ni marge
   annuelle, ni dette comparable. Le visiteur voit ainsi ce qui a été publié depuis, et ce que le site en a ou non. */
async function rfTrimestresSEC(s, c, box) { // trimestres lus à la SEC (10-Q) : le dernier trimestre et les 12 derniers mois, face au dernier exercice clos
  if (!c || !c.cik) return false;
  let t = await rfTrimCharge(s.id);
  if (!t || !t.q || !t.q.length || !document.body.contains(box)) return false;
  const fin = c.years && c.years.length ? `${c.years.at(-1)}-${typeof c.fyEnd === "string" && /^\d{2}-\d{2}$/.test(c.fyEnd) ? c.fyEnd : "12-31"}` : "";
  const nouveaux = t.q.filter(x => !fin || x.end > fin); if (!nouveaux.length) return false;
  const last = nouveaux.at(-1), B = v => big(v, t.currency), prevY = t.q.find(x => x.end < last.end && Math.abs((Date.parse(last.end) - Date.parse(x.end)) / 864e5 - 365) < 20);
  const g = (a, b) => a != null && b ? (a / b - 1) : null;
  const caFY = c.fin && c.fin.ca ? c.fin.ca.at(-1) : null, netFY = c.fin && c.fin.net ? c.fin.net.at(-1) : null, memeDevise = t.currency === c.currency;
  const tuiles = [];
  if (last.ca != null) tuiles.push(`<div><span>Ventes du trimestre</span><b>${B(last.ca)}</b>${prevY && prevY.ca ? `<small class="${g(last.ca, prevY.ca) >= 0 ? "up" : "dn"}">${g(last.ca, prevY.ca) >= 0 ? "↑" : "↓"} ${sgn(g(last.ca, prevY.ca))} sur un an</small>` : ""}</div>`);
  if (last.net != null) tuiles.push(`<div><span>Bénéfice net du trimestre</span><b>${B(last.net)}</b>${prevY && prevY.net ? `<small class="${g(last.net, prevY.net) >= 0 ? "up" : "dn"}">${g(last.net, prevY.net) >= 0 ? "↑" : "↓"} ${sgn(g(last.net, prevY.net))} sur un an</small>` : ""}</div>`);
  if (t.ttm && t.ttm.ca != null) tuiles.push(`<div><span>Ventes sur 12 mois glissants</span><b>${B(t.ttm.ca)}</b>${memeDevise && caFY ? `<small class="${t.ttm.ca >= caFY ? "up" : "dn"}">${t.ttm.ca >= caFY ? "↑" : "↓"} ${sgn(g(t.ttm.ca, caFY))} vs exercice ${c.years.at(-1)}</small>` : ""}</div>`);
  if (t.ttm && t.ttm.net != null) tuiles.push(`<div><span>Bénéfice sur 12 mois glissants</span><b>${B(t.ttm.net)}</b>${memeDevise && netFY ? `<small class="${t.ttm.net >= netFY ? "up" : "dn"}">${t.ttm.net >= netFY ? "↑" : "↓"} ${sgn(g(t.ttm.net, netFY))} vs exercice ${c.years.at(-1)}</small>` : ""}</div>`);
  const lec = []; // 4e passage 3.2 : une ligne, pas trois ; les tuiles portent déjà les variations
  if (memeDevise && caFY && t.ttm && t.ttm.ca != null) { const v = g(t.ttm.ca, caFY); lec.push(`Activité ${v >= 0.03 ? "en hausse" : v <= -0.03 ? "en baisse" : "stable"} sur 12 mois (${sgn(v)}).`); }
  else if (prevY && prevY.ca && last.ca != null) { const v = g(last.ca, prevY.ca); lec.push(`Ventes du trimestre ${v >= 0.05 ? "en hausse" : v <= -0.05 ? "en baisse" : "stables"} sur un an (${sgn(v)}).`); }
  box.innerHTML = `<div class="rf-trimi"><div class="rf-trimh"><span class="kick">Depuis la clôture de l'exercice ${esc(c.years.at(-1))}</span><b>Trimestre clos le ${dLabel(last.end)}</b><span class="light">rapport ${esc(last.form)} déposé le ${dLabel(last.filed)} · ${nouveaux.length === 1 ? "1er" : nouveaux.length + "e"} trimestre publié depuis la clôture de l'exercice ${esc(c.years.at(-1))}</span></div>
    <div class="rf-trimc">${tuiles.join("")}</div>${lec.length ? `<p class="rf-triml">${lec.map(esc).join(" ")} Chiffres non audités ; les jauges restent sur l'exercice clos.</p>` : ""}
    <p class="rf-trimf"><a class="lnk" href="${esc(t.source)}" target="_blank" rel="noopener">Données SEC (companyfacts)</a> · <a class="lnk" href="/entreprise/${s.id}/actualite">Toutes ses annonces</a></p></div>`;
  box.hidden = false;
  const dt = document.getElementById("rf-date"); if (dt) { const d = new Date(last.end + "T00:00:00"); dt.textContent = `Derniers comptes : T${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()} (${last.form || "10-Q"}${last.filed ? ", " + dLabel(last.filed) : ""}) · verdict sur l'exercice ${c.years.at(-1)}`; }
  return true;
}
async function rfDernierTrimestre(s, c) {
  const box = document.getElementById("rf-trim"); if (!box || typeof actuGet !== "function") return;
  if (await rfTrimestresSEC(s, c, box)) return;
  let j = null; try { j = await actuGet(`/data/actu/c/${s.id}.json`); } catch (e) { }
  if (!j || !document.body.contains(box)) return;
  const fin = c && c.years && c.years.length ? `${c.years.at(-1)}-${typeof c.fyEnd === "string" && /^\d{2}-\d{2}$/.test(c.fyEnd) ? c.fyEnd : "12-31"}` : ""; // clôture du dernier exercice (juin pour Microsoft, par exemple)
  const tous = (j.o || []).filter(x => !(typeof ACTU_CAT !== "undefined" && (ACTU_CAT[x.c] || {}).routine)).sort((a, b) => b.d.localeCompare(a.d));
  const o = tous.find(x => x.c === "resultats" && (!fin || x.d.slice(0, 10) > fin)) || null;
  if (tous[0]) RF_DERNIERE[s.id] = { t: tous[0].tf || tous[0].t, d: tous[0].d.slice(0, 10), u: tous[0].u, c: tous[0].c }; // une seule source de vérité pour « dernière annonce » (fiche et IA)
  if (!o) { if (tous[0]) { box.innerHTML = `<p class="rf-no" style="padding:14px 22px">Dernière annonce officielle : <b>${esc(tous[0].tf || tous[0].t)}</b>, le ${dLabel(tous[0].d.slice(0, 10))}. Aucune publication chiffrée relevée depuis la clôture de l'exercice ${esc(String(c.years.at(-1)))}.</p>`; box.hidden = false; } return; }
  let A = null; try { if (typeof loadAna === "function") { await loadAna(); A = ANA && o.u && ANA[o.u]; } } catch (e) { }
  const ch = (A && A.chiffres) || [], lec = (A && A.lecture) || [];
  const quand = dLabel(o.d.slice(0, 10));
  box.innerHTML = `<div class="rf-trimi"><div class="rf-trimh"><span class="kick">Depuis la clôture de l'exercice ${esc(c.years.at(-1))}</span><b>${esc(o.tf || o.t)}</b><span class="light">publié le ${quand}</span></div>
    ${ch.length ? `<div class="rf-trimc">${ch.slice(0, 4).map(([l, v]) => `<div><span>${esc(l)}</span><b>${esc(v)}</b></div>`).join("")}</div>${lec.length ? `<p class="rf-triml">${lec.slice(0, 2).map(esc).join(" ")}</p>` : ""}`
      : `<p class="rf-triml">Les chiffres de cette publication ne sont pas encore relevés par le site : les indicateurs ci-dessus portent sur le dernier exercice clos, audité et déposé.</p>`}
    <p class="rf-trimf"><a class="lnk" href="${esc(o.u)}" target="_blank" rel="noopener">Lire la publication</a> · <a class="lnk" href="#rf-agenda" data-rf-ouvre="rf-agenda">Toutes ses annonces</a>${tous[0] && tous[0] !== o ? ` · dernière annonce : ${esc(tous[0].tf || tous[0].t)}, le ${dLabel(tous[0].d.slice(0, 10))}` : ""}</p></div>`;
  box.hidden = false;
}
async function pageCompany(id, tab) {
  const s = RBY[id];
  if (!s) return pageNotFound();
  setNav("ent");
  if (tab === "agenda" || tab === "communaute") tab = "actualite";
  tab = CTABS.some(t => t[0] === (tab || "")) ? (tab || "") : "";
  const et = new URLSearchParams(location.search).get("etape");
  if (!tab && et === "actualite") { tab = "actualite"; history.replaceState(history.state, "", `/entreprise/${id}/actualite`); }
  if (!tab && !s.missing && et in RF_ETAPES_CHIFFRES) { // anciens liens vers les étapes « Ses comptes », « Son prix », « Dividende »
    tab = "comptes"; history.replaceState(history.state, "", `/entreprise/${id}/comptes${RF_ETAPES_CHIFFRES[et] ? "#rf-" + RF_ETAPES_CHIFFRES[et] : ""}`);
  }
  setTitle(s.name + (tab ? " : " + CTABS.find(t => t[0] === tab)[1].toLowerCase() : ""));
  app.innerHTML = companyHeader(s, tab) + `<div id="ctab"><div class="empty">Chargement de la fiche…</div></div>`;
  fiche2Centrer();
  if (!tab) ficheGraphique(s); // la courbe se charge pendant que la fiche arrive, sans la retarder
  const load = s.missing ? Promise.resolve(null) : (FULL[id] ? Promise.resolve(FULL[id]) : fetch(`/data/societes/${id}.json`).then(r => r.json()).then(j => FULL[id] = j).catch(() => null));
  const [c] = await Promise.all([load, PXP, ficheWDLoad(id), typeof loadFiches === "function" ? loadFiches() : null]); // les textes de fiche arrivent avec les comptes
  if (!ficheMemeId(id)) return; // l'utilisateur a changé de page entre-temps
  const ph = $("#pxh"); if (ph) ph.innerHTML = ficheCours(s);
  const sm = $(".fh-sum"); if (sm) sm.outerHTML = ficheSommaire(s, c); // la situation et le prix ont besoin des comptes et du cours
  ({ "": tabBref, comptes: tabComptes, actualite: (s, c, el) => { tabActu(s, c, el); if (typeof contexteActuHTML === "function") { el.insertAdjacentHTML("afterbegin", contexteActuHTML(s, c)); if (typeof ctxRafraichir === "function") setTimeout(() => { try { ctxRafraichir(); } catch (e) { } }, 0); } } })[tab](s, c, $("#ctab")); // la discussion et les avis des visiteurs sont dans l'onglet Synthèse (30/10)
  if (!tab && c) rfDernierTrimestre(s, c);
  if (tab === "comptes" && location.hash.startsWith("#rf-")) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => t.scrollIntoView({ block: "start" }), 30); }
  if (!tab) { fiche2Etapes(); premStatus().then(() => { if (ficheMemeId(id)) assistantPanel(s, c, $("#ctab")); }); }
}
document.addEventListener("click", e => { // « En bref » → le point détaillé, avec son chiffre et sa source, dans « L'essentiel »
  const b = e.target.closest && e.target.closest("[data-rf-anf]"); if (!b) return;
  e.preventDefault(); if (typeof ETAPE_SHOW === "function") ETAPE_SHOW("synthese");
  const t = document.querySelector(`#etapes-corps [data-anf="${CSS.escape(b.dataset.rfAnf)}"]`); if (!t) return;
  const d = t.closest("details"); if (d) d.open = true;
  t.scrollIntoView({ behavior: "smooth", block: "center" }); t.classList.add("rf-flash"); setTimeout(() => t.classList.remove("rf-flash"), 1800);
});
document.addEventListener("analyse:pret", () => { // l'analyse complète (pays, devise…) arrive après l'affichage : « En bref » est mis à jour
  const m = location.pathname.match(/^\/entreprise\/([^/]+)\/?$/), sm = $(".rf-sum");
  if (m && sm && RBY[m[1]] && FULL[m[1]]) sm.outerHTML = ficheSommaire(RBY[m[1]], FULL[m[1]]);
});

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
function fiche2Etapes() { } // les onglets ne sont plus numérotés
function etapesBind(s) {
  const show = k => {
    $$("#etapes [data-et]").forEach(b => b.classList.toggle("on", b.dataset.et === k));
    $$("#etapes-corps .etape").forEach(d => d.hidden = d.dataset.etape !== k);
    const u = new URL(location.href); u.searchParams.set("etape", k); history.replaceState({}, "", u.pathname + u.search);
    const nav = $("#etapes"); if (nav && nav.getBoundingClientRect().top < 0) nav.scrollIntoView({ block: "start" });
    else if (nav && nav.getBoundingClientRect().top > innerHeight * 0.6) nav.scrollIntoView({ block: "start", behavior: "smooth" });
    const b = $(`#etapes [data-et="${k}"]`); if (b && b.parentElement) { const p = b.parentElement; p.scrollLeft = Math.max(0, b.offsetLeft - (p.clientWidth - b.offsetWidth) / 2); }
    ficheGraphique(s); fiche2Etapes();
    if (k === "synthese") { const d = $("#discussion"); if (d && !d.dataset.on && typeof tabCommu === "function") { d.dataset.on = "1"; try { tabCommu(s, FULL[s.id] || null, d); } catch (e) { } } }
    $$(".etape:not([hidden]) .tbx-sc").forEach(x => x.dispatchEvent(new Event("scroll")));
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

/* ---------- Étape « Concurrents » : un tableau côte à côte, les atouts et faiblesses de chacune, sa place dans le secteur ----------
   Refonte du 29 octobre (13 h 30) : plus de logos superposés sur des barres ; chaque entreprise a une ligne, chaque critère une colonne
   (croissance, rentabilité, solidité, prix, dividende, taille), couleurs selon les seuils du site et la médiane de son secteur.
   Aucun classement global ni « gagnant » : chaque entreprise a ses atouts et ses faiblesses, écrits à partir de ses chiffres. */
const RF_CMP_ORD = ["croissance", "rentabilite", "solidite", "prix", "dividende", "taille"];
const RF_CMP_COURT = { taille: "Taille", croissance: "Croissance", rentabilite: "Rentabilité", solidite: "Endettement", prix: "Valorisation", dividende: "Dividende" };
const RF_CMP_SOUS = { taille: () => "ventes annuelles, en euros", croissance: () => "ventes sur un an", rentabilite: X => X.roe ? "rentabilité des capitaux propres" : "marge d'exploitation", solidite: () => "dette nette, en années de résultat", prix: () => "prix ÷ bénéfice (PER)", dividende: () => "rendement annuel" };
function rfCmpCell(T, F, X) {
  const r = T.val(F, X);
  if (!r && T.k === "prix" && F.v && F.v.peNs) return `<td class="num na" data-v="" title="${esc(F.c.name + " : " + NS_PE + " (" + F0.format(F.v.peBrut) + " fois en brut)")}"><span class="rf-na">n.s.</span><small>bénéfice trop faible</small></td>`; // 1.3 : PER non significatif
  if (r && T.k === "croissance" && typeof nsCrois === "function" && F.ok && nsCrois(ratios(F.c).g1)) return `<td class="num na" data-v="" title="${esc(F.c.name + " : " + NS_CROIS + " (" + sgn(ratios(F.c).g1) + ")")}"><span class="rf-na">n.s.</span><small>base trop faible</small></td>`;
  if (!r) { const na = T.na(F, X); return `<td class="num na" data-v="" title="${esc(na)}"><span class="rf-na">–</span><small>${esc(na)}</small></td>`; }
  const lv = !T.neutral && r.lv && r.lv !== "na" ? r.lv : null, key = r.key != null ? r.key : r.v;
  const txt = r.cash ? "Aucune" : T.k === "dividende" && !(r.v > 0) ? "Aucun" : T.short && T.k !== "prix" ? T.short(r) : r.txt;
  return `<td class="num${lv ? " rf-" + lv : ""}" data-v="${key != null && isFinite(key) ? key : ""}" title="${esc(F.c.name + " : " + T.say(r, F, X))}"><span class="rf-cv">${esc(txt)}</span></td>`;
}
function rfCmpForces(T, F, X) { // une phrase par critère coloré, sans comparaison au « meilleur » du groupe
  const r = T.val(F, X); if (!r || T.neutral || !r.lv || r.lv === "na" || r.lv === "moyen") return null;
  const med = r.medTxt ? ` (secteur : ${r.medTxt})` : "";
  return { lv: r.lv, html: `<b>${esc(RF_CMP_COURT[T.k])}</b> : ${esc(T.say(r, F, X))}${esc(med)}` };
}
const RF_CMP_DEF = { croissance: "croissance", rentabilite: "marge", solidite: "lev", prix: "per", dividende: "rdt", taille: "ca" };
const RF_CMP_KEY = { croissance: ["g1", v => sgn(v)], rentabilite: ["marge", v => pct(v, 0, false)], solidite: ["lev", v => `${F1.format(v)} an${v >= 2 ? "s" : ""}`], prix: ["pe", v => `${F0.format(v)} fois`], dividende: ["yld", v => pct(v, 1, false)], taille: ["ca", v => big(v, "EUR")] };
function rfQuartiles(s, k) { // quart inférieur et quart supérieur du secteur, formatés ; null si moins de 8 entreprises
  const spec = RF_CMP_KEY[k]; if (!spec) return null;
  const vals = rfSecteurVals(s, spec[0]).sort((a, b) => a - b), n = vals.length; if (n < 8) return null;
  const q = p => { const i = (n - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return vals[lo] + (vals[hi] - vals[lo]) * (i - lo); };
  return [spec[1](q(0.25)), spec[1](q(0.75))];
}
/* Tableau transposé (30/10, Romain) : les critères en lignes, les entreprises en colonnes ; la médiane et la fourchette du secteur en dernières colonnes.
   Réutilisé par la page Comparer. s = l'entreprise de référence (secteur des médianes), X = cmprCtx(...) */
function rfCmpTableHTML(s, X) {
  const T6 = RF_CMP_ORD.map(k => CMPR_T.find(T => T.k === k)).filter(Boolean), me0 = X.F[0];
  const head = `<tr><th scope="col" class="l lab">Critère</th>${X.F.map((F, j) => `<th scope="col" class="rf-coh${j === 0 ? " rf-me" : ""}"><a class="rf-co" href="/entreprise/${F.c.id}">${logo(F.c, 24)}<span class="nm">${esc(F.c.name)}</span></a></th>`).join("")}<th scope="col" class="rf-medh" title="La médiane : la moitié des entreprises du secteur font mieux, l'autre moitié moins bien. C'est le repère « normal » du secteur."><span class="nm">Secteur ${esc(secName(s).toLowerCase())}</span><small>valeur du milieu (médiane)</small></th><th scope="col" class="rf-medh rf-qh"><span class="nm">La moitié du secteur</span><small>du quart inférieur au supérieur</small></th></tr>`;
  const rows = T6.map(T => { const r0 = T.val(me0, X), q = rfQuartiles(s, T.k);
    return `<tr data-k="${T.k}"><th scope="row" class="l lab"><span class="rf-cth">${esc(RF_CMP_COURT[T.k])}</span><small>${esc(RF_CMP_SOUS[T.k](X))}</small></th>${X.F.map((F, j) => rfCmpCell(T, F, X).replace('<td class="num', `<td class="num${j === 0 ? " rf-me" : ""}`)).join("")}<td class="num rf-medc">${r0 && r0.medTxt ? esc(r0.medTxt) : `<span class="rf-na">–</span>`}</td><td class="num rf-medc rf-q">${q ? `${esc(q[0])} à ${esc(q[1])}` : `<span class="rf-na">–</span>`}</td></tr>`; }).join("");
  return `<table class="t tbx rf-ctab rf-ctab-t"><caption class="sr">${esc(s.name)} et les entreprises comparées, critère par critère</caption><thead>${head}</thead><tbody>${rows}</tbody></table>`;
}
function concurrentsHTML(s) {
  const { peers, auto, all } = cmprFiche(s); if (!peers.length) return rfPlaceHTML(s);
  const CMAX = isPrem() ? 5 : FREE.cmp, link = "/comparer?ids=" + all.slice(0, CMAX).map(c => c.id).join(",");
  const X = cmprCtx(all), me0 = X.F[0];
  const titre = auto ? "Face aux entreprises comparables" : "Face à ses concurrents directs";
  if (!me0.ok) return `<section class="panel" id="concurrents"><div class="ph"><h2>${titre}</h2><a href="${link}">Comparer en détail →</a></div><div class="pb"><p class="muted" style="margin:0 0 6px">${esc(missingTxt(s, true))}</p><div class="cmpr-peers">${peers.map(c => `<a href="/entreprise/${c.id}">${logo(c, 24)}${esc(c.name)}</a>`).join("")}</div>${fiche2RangBouton(s)}</div></section>` + rfPlaceHTML(s);
  const T6 = RF_CMP_ORD.map(k => CMPR_T.find(T => T.k === k)).filter(Boolean);
  const lire = T6.map(T => { const d = ALL[RF_CMP_DEF[T.k]]; return d && d.limit ? `<li><b>${esc(RF_CMP_COURT[T.k])}</b> : ${esc(d.limit)}</li>` : ""; }).filter(Boolean).join("");
  const cartes = X.F.map((F, j) => {
    if (!F.ok) return `<div class="rf-card"><div class="rf-ch">${logo(F.c, 24)}<b>${esc(F.c.name)}</b></div><p class="rf-no">${esc(cmprNa(F))} : comparaison impossible sur les comptes.</p></div>`;
    const L = T6.map(T => rfCmpForces(T, F, X)).filter(Boolean), plus = L.filter(x => x.lv === "fort"), moins = L.filter(x => x.lv === "vig");
    return `<div class="rf-card${j === 0 ? " rf-me" : ""}"><div class="rf-ch">${logo(F.c, 24)}<b>${esc(F.c.name)}</b>${j === 0 ? `<small class="rf-tag">cette fiche</small>` : `<a class="rf-lk" href="/entreprise/${F.c.id}">Sa fiche →</a>`}</div>
      ${!plus.length && !moins.length ? `<p class="rf-no" style="margin-top:6px">Dans la moyenne sur tous les critères comparés : ni atout ni faiblesse nette.</p>` : `
      <h4 class="rf-p">Atouts</h4>${plus.length ? `<ul>${plus.map(x => `<li>${x.html}</li>`).join("")}</ul>` : `<p class="rf-no">Aucun critère nettement au-dessus des repères.</p>`}
      <h4 class="rf-m">Faiblesses</h4>${moins.length ? `<ul>${moins.map(x => `<li>${x.html}</li>`).join("")}</ul>` : `<p class="rf-no">Aucun critère nettement en dessous des repères.</p>`}`}</div>`;
  }).join("");
  const notes = cmprNotes(X);
  return `<section class="panel rf-cmp" id="concurrents"><div class="ph"><h2>${titre}</h2><a href="${link}">Comparer en détail →</a></div>
    <div class="pb rf-cmpi"><p class="rf-intro">${auto ? `Aucun concurrent direct de ${esc(s.name)} n'est encore suivi sur le site : voici les entreprises de son secteur dont la taille est la plus proche.` : `Les entreprises qui vendent les mêmes produits ou services, aux mêmes clients.`} Chaque case est comparée aux repères du site et à la médiane du secteur : <span class="rf-lg rf-lg-f">vert, point fort</span> <span class="rf-lg rf-lg-v">orange, à surveiller</span> <span class="rf-lg">sans couleur, dans la moyenne</span>. Survolez une case pour la phrase complète. La taille et le dividende ne sont pas colorés.</p></div>
    ${tblxScrollBox(rfCmpTableHTML(s, X).replace('<span class="nm">' + esc(s.name) + '</span></a>', '<span class="nm">' + esc(s.name) + '</span></a><small class="rf-tag">cette fiche</small>'), "Faites glisser pour voir toutes les entreprises")}
    <div class="pb"><details class="cmpr-det rf-cartes" style="margin:0"><summary>Atouts et faiblesses de chacune<small>le tableau, lu entreprise par entreprise</small></summary><p class="rf-sub">Le tableau ne désigne pas de gagnante : une action plus chère peut correspondre à une entreprise qui grandit plus vite, une forte dette à un métier très régulier.</p>
      <div class="rf-cards">${cartes}</div></details>
      ${lire ? `<details class="cmpr-det rf-lire" style="margin:10px 0 0"><summary>Comment lire chaque ligne<small>ce que le chiffre dit, et ce qu'il ne dit pas</small></summary><ul class="rf-lirel">${lire}</ul></details>` : ""}
      ${notes.length ? `<ul class="cmpr-notes">${notes.map(n => `<li>${n}</li>`).join("")}</ul>` : ""}
      <div class="cmpr-fact"><a class="btn" href="${link}" style="display:inline-flex;align-items:center;height:40px">Comparer en détail</a><span class="light" style="font-size:12.5px">${all.length > CMAX ? `Les ${CMAX} premières en version gratuite, ${Math.min(5, all.length)} avec Premium.` : "Barres, graphiques et tous les chiffres côte à côte."}</span></div></div>
    ${cmprIABar(all.length, s)}
    <div class="pb" style="padding-top:12px"><details class="cmpr-det" style="margin:0"><summary>Tous les indicateurs de chaque entreprise<small>marges, dette, trésorerie, dividende, côte à côte</small></summary><div>${cmprAllTable(X, s.id)}</div></details></div>
    <div class="src">Chiffres du dernier exercice publié par chaque entreprise (rapports ESEF et SEC), montants convertis en euros aux taux de la BCE. Cours différés de Google Finance. Ce tableau décrit les comptes ; ce n'est pas un conseil.</div></section>` + rfPlaceHTML(s);
}
function rfPlaceHTML(s) { // sa place parmi toutes les entreprises du secteur suivies (ancien bandeau de l'en-tête)
  const prof = s.missing ? "" : (profilHTML(s) || "").replace(/<p class="kick"[^>]*>Son profil dans le secteur[^<]*<\/p>/, "");
  const rk = fiche2RangBouton(s);
  if (!prof && !rk) return "";
  const n = (prof.match(/class="pa2[ "]/g) || []).length;
  return `<section class="panel rf-place" id="secteur-place"><div class="ph"><h2>Sa place dans le secteur ${esc(secName(s).toLowerCase())}</h2></div>
    <div class="pb"><p class="rf-sub" style="margin-top:0">Parmi toutes les entreprises du secteur suivies par le site, critère par critère.</p>${rk}
      ${prof ? `<div class="fh-pl rf-pl" style="--n:${Math.max(3, n)}">${prof}</div><div class="fh-pm">${profilMini(s)}</div>` : ""}</div></section>`;
}
/* La fiche a pu être affichée avant le chargement de ce module : on la refait avec la nouvelle version */
if (typeof R !== "undefined" && R && R.companies && /^\/entreprise\/[^/]+(\/(comptes|actualite|agenda|communaute))?\/?$/.test(location.pathname)) { const [, , id, t] = location.pathname.split("/"); pageCompany(id, t); }

/* ---------- 30/10 (retour de Romain) : la fiche en trois parties, chacune ouverte par une synthèse courte ----------
   1. Comprendre l'entreprise (ce qu'elle fait, croissance, rentabilité, dette, risques), puis au clic : son métier en détail, points forts et à surveiller, questions.
   2. Comprendre son prix (valorisation face au secteur, la courbe, les concurrents côte à côte).
   3. Comprendre ce qui change (dernière publication, dates à venir, annonces et presse). Rien n'est retiré : tout reste au clic. */
function rfPli(id, titre, sous, corps, ouvert) {
  return `<details class="rf-pl" id="${id}"${ouvert ? " open" : ""}><summary><b>${titre}</b>${sous ? `<span>${sous}</span>` : ""}</summary><div class="rf-plb">${corps}</div></details>`;
}
function rfPartieEntreprise(s, c) {
  return ficheRetenirHTML(s, c, "entreprise")
    + rfPli("rf-metier", "Son métier en détail", "Activités, pays, taille dans le secteur, dirigeants", ficheMetierHTML(s, c))
    + rfPli("rf-synth", "Points forts, à surveiller, discussion", "L'analyse détaillée, chaque point relié à sa source", ficheSyntheseHTML(s, c))
    + rfPli("rf-faq", "Questions fréquentes", "", faqHTML(s, c));
}
function rfPartiePrix(s, c) {
  return ficheRetenirHTML(s, c, "prix") + ficheGraphBox(s) + concurrentsHTML(s);
}
function rfPartieChange(s, c) {
  return `<section class="panel rf6" id="rf-change"><div class="ph"><h2>Comprendre ce qui change</h2><span class="light" style="font-size:12.5px">Depuis la clôture de l'exercice ${esc(String(c.year || s.year || ""))}</span></div>
    <div id="rf-trim"><p class="rf-no" style="padding:14px 22px">Aucune publication chiffrée relevée par le site depuis la clôture du dernier exercice. Les annonces officielles et la presse sont ci-dessous.</p></div><div class="rf-chev">${rfAVenir(s)}</div></section>
    <div id="factu"></div>`;
}
tabBref = (orig => function (s, c, el) {
  orig(s, c, el);
  const fa = $("#factu"); if (fa && typeof actuFicheDetail === "function") { try { actuFicheDetail(fa, s); } catch (e) { } }
  const sy = $("#rf-synth"); if (sy) sy.addEventListener("toggle", () => { const d = $("#discussion"); if (sy.open && d && !d.dataset.on && typeof tabCommu === "function") { d.dataset.on = "1"; try { tabCommu(s, FULL[s.id] || null, d); } catch (e) { } } });
  if (location.hash && /^#rf-(metier|synth|faq)$/.test(location.hash)) rfOuvrir(location.hash.slice(1) === "rf-metier" ? "rf-metier" : "rf-sources");
})(tabBref);
function rfOuvrir(id) { // ouvre un pli de la fiche et y va
  if (id === "rf-synth" || id === "rf-faq") id = "rf-sources";
  const d = document.getElementById(id); if (!d) return;
  if (d.tagName === "DETAILS") d.open = true;
  d.scrollIntoView({ behavior: "smooth", block: "start" });
  if (id === "rf-synth") d.dispatchEvent(new Event("toggle"));
}
document.addEventListener("click", e => {
  const a = e.target.closest && e.target.closest('a.rf6-lk[href^="#rf-"]'); if (!a) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const id = a.getAttribute("href").slice(1);
  if (ETAPE_SHOW && !document.getElementById(id)) ETAPE_SHOW("entreprise");
  rfOuvrir(id);
}, true);
// Anciens liens : ?etape=retenir|metier|synthese|faq → l'entreprise ; ?etape=concurrents → son prix ; ?etape=actualite → ce qui change
pageCompany = (orig => function (id, tab) {
  const q = new URLSearchParams(location.search), et = q.get("etape"), M = { retenir: "entreprise", metier: "entreprise", synthese: "entreprise", faq: "entreprise", concurrents: "prix", actualite: "change" };
  const s = RBY[id];
  if (!tab && et && M[et] && s && !s.missing) { const h = et === "metier" ? "#rf-metier" : et === "synthese" ? "#rf-synth" : et === "faq" ? "#rf-faq" : ""; q.set("etape", M[et]); history.replaceState(history.state, "", `${location.pathname}?${q}${h}`); }
  return orig(id, tab);
})(pageCompany);
document.head.insertAdjacentHTML("beforeend", `<style>
.rf-pl{border:1px solid var(--rule);border-radius:6px;background:#fff;margin:12px 0}
.rf-pl>summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:minmax(0,1fr) 22px;gap:2px 12px;align-items:center;padding:14px 22px}
.rf-pl>summary::-webkit-details-marker{display:none}.rf-pl>summary b{font-size:16px}.rf-pl>summary span{grid-column:1;font-size:13px;color:var(--grey)}
.rf-pl>summary::after{content:"+";grid-column:2;grid-row:1/span 2;font-family:var(--mono);font-size:22px;color:var(--light);text-align:right}.rf-pl[open]>summary::after{content:"–"}
.rf-pl>summary:hover b{text-decoration:underline;text-decoration-color:var(--lime);text-decoration-thickness:3px;text-underline-offset:3px}
.rf-plb{border-top:1px solid var(--rule)}.rf-plb>.panel{border:0;box-shadow:none;margin:0;border-radius:0}
.rf-vcp{padding:18px 22px 6px;margin:0}
#rf-change #rf-trim{padding:14px 22px 18px}.rf-chev{padding:0 22px 16px}.rf-chev .rf-bl{margin:0}
@media (max-width:760px){.rf-pl>summary{padding:12px 16px}.rf-vcp{padding:14px 16px 4px}#rf-change #rf-trim{padding:12px 16px 14px}}
</style>`);

/* ====================================================================================
   Lot 4 (30/10, prompt de refonte) : la fiche en une seule page, zéro onglet.
   Niveau 1 : en-tête (verdict, cinq jauges), la courbe, « Ce qu'elle fait », « Ce qui a changé ».
   Niveau 2 « Tous les chiffres » : sections repliables sans phrase de verdict (résultats avec trimestres, rentabilité,
   bilan et dette, valorisation, dividende, agenda et annonces, concurrents, pourquoi ces verdicts, tous les comptes, sources),
   ouvertes d'office si le réglage « Afficher toujours le détail » est coché. Export CSV, ajout au comparateur.
   /entreprise/x/comptes et /actualite redirigent vers la fiche (ancre). Rien n'est retiré.
   ==================================================================================== */
document.head.insertAdjacentHTML("beforeend", `<style>.pa2.pa2-ns .pl{opacity:.45;filter:grayscale(1)}.pa2.pa2-ns .pt small{color:var(--grey)}</style>`);
let RF_TRIM_IDX = null;
async function rfTrimCharge(id) { // trimestres SEC : lus seulement si l'index les annonce (zéro 404), un seul chargement par fiche
  if (!RF_TRIM_IDX) RF_TRIM_IDX = fetch("/data/trim/index.json").then(r => r.ok ? r.json() : null).then(j => new Set((j && j.ids) || [])).catch(() => new Set());
  const idx = await RF_TRIM_IDX; if (!idx.has(id)) return null;
  RF_TRIM_CACHE[id] = RF_TRIM_CACHE[id] || fetch(`/data/trim/${id}.json`).then(r => r.ok ? r.json() : null).catch(() => null);
  return RF_TRIM_CACHE[id];
}
const RF_TRIM_CACHE = {};
const RF_DERNIERE = {}; // dernière annonce par entreprise, lue par la fiche et reprise par l'IA (ia.js)
const RF_DETAIL_CLE = "bilan.detail";
function rfDetailToujours() { try { return localStorage.getItem(RF_DETAIL_CLE) === "1"; } catch (e) { return false; } }
function rfDetailSet(v) { try { localStorage.setItem(RF_DETAIL_CLE, v ? "1" : "0"); } catch (e) { } }
function rfPli2(id, titre, sous, corps, open, cle) { // 31/10 (Romain) : un chiffre clé visible avant d'ouvrir, et un vrai bouton « Ouvrir »
  return `<details class="rf-pl rf-pl2" id="${id}"${open ? " open" : ""}><summary><span class="rf-plt"><b>${titre}</b>${sous ? `<span>${sous}</span>` : ""}</span>${cle && cle.val ? `<span class="rf-plk"><small>${esc(cle.lab)}</small><b>${esc(cle.val)}</b>${cle.p != null ? `<span class="rf-plm" title="Sa place parmi les entreprises du secteur"><i class="pl"><i class="pm"></i><i class="pd" style="left:${(cle.p * 100).toFixed(0)}%;background:${axCol(cle.p)}"></i></i>${cle.med ? `<small>secteur ${esc(cle.med)}</small>` : ""}</span>` : ""}</span>` : ""}<span class="rf-plo" aria-hidden="true"><i>Ouvrir</i><i>Fermer</i></span></summary><div class="rf-plb">${corps}</div></details>`;
}
function rfFaitHTML(s, c) { // « Ce qu'elle fait » : une phrase, puis ses concurrents cliquables
  let peers = []; try { peers = cmprFiche(s).peers.slice(0, 5); } catch (e) { }
  const arg = s.fiche && s.fiche.argent ? String(s.fiche.argent).trim() : ""; // comment elle gagne de l'argent (texte de fiche), la description courte est déjà dans l'en-tête
  return `<section class="panel rf-l1" id="rf-fait"><div class="ph"><h2>Son métier et ses concurrents</h2>${regName(s) ? `<span class="light" style="font-size:12.5px">${esc(regName(s))} · ${esc(secName(s))}</span>` : ""}</div><div class="pb">
    ${peers.length ? `<p class="rf-peers"><span>Concurrents</span>${peers.map(p => `<a class="chip" href="/entreprise/${p.id}">${logo(p, 24)}${esc(p.name)}</a>`).join("")}</p>` : ""}
    ${arg ? `<p class="rf-l1p">${esc(arg)}</p>` : ""}</div>
    ${rfPli2("rf-metier", "Activités, pays, dirigeants", "Son métier en détail, sa taille dans le secteur", ficheMetierHTML(s, c), false)}</section>`;
}
function rfChangeHTML(s, c) { // « Ce qui a changé » : la dernière publication (trimestre si disponible), la prochaine date
  const up = eventsOf(s.id).filter(e => e.date >= TODAY).slice(0, 2);
  return `<section class="panel rf-l1" id="rf-change"><div class="ph"><h2>Ses derniers chiffres et ses prochaines dates</h2></div>
    <div id="rf-trim"><p class="rf-no" style="padding:14px 22px">Aucune publication chiffrée relevée par le site depuis la clôture de l'exercice ${esc(String(s.year || ""))}.</p></div>
    ${up.length ? `<p class="rf6-ev" style="padding:0 22px 14px;margin:0">À venir : ${up.map(e => `<b>${esc(RF_MOIS(e.date))}</b> ${esc(e.label)}`).join(" · ")}</p>` : ""}
    ${rfPli2("rf-agenda", "Toutes ses annonces et ses dates", "Annonces officielles, presse, agenda", `<div class="rf-chev">${rfAVenir(s)}</div><div id="factu"></div>`, false)}</section>`;
}
function rfTrimTableHTML(t, c) { // tableau des trimestres lus à la SEC (10-Q / 10-K), du plus récent au plus ancien
  const Q = [...t.q].sort((a, b) => b.end.localeCompare(a.end)).slice(0, 8), B = v => v == null ? "–" : big(v, t.currency);
  const lab = q => { const d = new Date(q.end + "T00:00:00"); return `T${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`; };
  const prevY = q => t.q.find(x => x.end < q.end && Math.abs((Date.parse(q.end) - Date.parse(x.end)) / 864e5 - 365) < 20);
  const g = (a, b) => a != null && b ? sgn(a / b - 1) : "";
  return `<div class="tbx-sc scroll-x"><table class="t tbx rf-trimt"><thead><tr><th class="l">Trimestre clos le</th><th>Ventes</th><th>sur un an</th><th>Bénéfice net</th><th>sur un an</th><th>Bénéfice par action</th><th class="l">Document</th></tr></thead><tbody>
    ${Q.map(q => { const p = prevY(q); return `<tr><td class="l"><b>${lab(q)}</b><small style="display:block;color:var(--grey)">${dLabel(q.end)}</small></td><td>${B(q.ca)}</td><td>${p ? g(q.ca, p.ca) : "–"}</td><td>${B(q.net)}</td><td>${p ? g(q.net, p.net) : "–"}</td><td>${q.eps != null ? F2.format(q.eps) : "–"}</td><td class="l">${esc(q.form || "")}${q.filed ? ` · ${dLabel(q.filed)}` : ""}</td></tr>`; }).join("")}</tbody></table></div>
    <div class="src">Trimestres lus dans les données publiques de la SEC (companyfacts, XBRL) ; chaque ligne vient du 10-Q ou du 10-K déposé à la date indiquée. <a class="lnk" href="${esc(t.source)}" target="_blank" rel="noopener">Source</a>.</div>`;
}
function rfCsv(s, c) { // tous les comptes, année par année, en CSV (séparateur point-virgule, décimale virgule)
  const P = tblxRows(s, c), Y = c.years, q = v => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [[`Indicateur (${c.currency} ; montants en millions, ratios en nombre, pourcentages en fraction)`, ...Y, "note"].map(q).join(";")];
  const note = r => { const v = r.last; return (r.k === "g" && typeof nsCrois === "function" && nsCrois(v)) || (r.k === "payout" && typeof nsPayout === "function" && nsPayout(v)) ? "non significatif" : ""; };
  P.rows.forEach(r => lines.push([r.label || r.k, ...Y.map((y, i) => { const v = (r.vals || [])[i]; return v == null ? "" : String(Math.round(v * 1000) / 1000).replace(".", ","); }), note(r)].map(q).join(";")));
  const v0 = valo(s); if (v0 && (v0.pe || v0.peNs)) lines.push(["PER (cours actuel ÷ bénéfice par action)", ...Y.map((y, i) => i === Y.length - 1 ? String(Math.round((v0.pe || v0.peBrut) * 10) / 10).replace(".", ",") : ""), v0.peNs ? "non significatif" : ""].map(q).join(";"));
  return "﻿" + lines.join("\n");
}
async function ficheUneSeulePage(s, c, el) {
  const base = `/entreprise/${s.id}`, auto = rfDetailToujours();
  const nav = $("#etapes"); if (nav) nav.remove();
  if (!c) { // pas de comptes : métier, prix, questions, actualité, comme avant mais sans onglet
    el.innerHTML = `<div class="fcols fcols-1"><div id="etapes-corps">${ficheMetierHTML(s, null)}<section class="panel"><div class="pb muted">${missingTxt(s, true)}</div></section>${ficheGraphBox(s)}${fichePrixSans(s)}${rfPli2("rf-agenda", "Annonces et agenda", "", `${rfAVenir(s)}<div id="factu"></div>`, true)}${rfPli2("rf-faq", "Questions fréquentes", "", faqHTML(s, null), false)}</div></div>`;
    const fa = $("#factu"); if (fa && typeof actuFicheDetail === "function") { try { actuFicheDetail(fa, s); } catch (e) { } }
    if (typeof dirigeantsHTML === "function") dirigeantsHTML(s, $("#fdirig")); ficheGraphique(s); return;
  }
  const chiffres = document.createElement("div"); chiffres.id = "rf-chiffres-src";
  try { tabComptes(s, c, chiffres); } catch (e) { chiffres.innerHTML = ""; }
  const th = k => { const x = chiffres.querySelector(`#rf-${k}`); if (!x) return ""; x.classList.add("rf-th-in"); return x.outerHTML; };
  const top = chiffres.querySelector("#tbx"), tout = chiffres.querySelector("#rf-tout"), srcs = [...chiffres.querySelectorAll("section.panel")].filter(x => x.querySelector("h2") && /^Sources/.test(x.querySelector("h2").textContent));
  const jg = (key, inv, val) => { const p = rfPosition(s, key, inv, val); return p ? `<span class="rf-pq ${Math.round(p.pos * 100) >= 50 ? "ok" : "ko"}">${inv === null ? "" : (Math.round(p.pos * 100) >= 50 ? "mieux placée que " + Math.min(99, Math.round(p.pos * 100)) : "moins bien placée que " + Math.min(99, 100 - Math.round(p.pos * 100))) + " % du secteur"}</span>` : ""; };
  const f = figuresOf(c), m = ratios(f), v = valo(s) || {}, bank = isBank(s), A = Object.fromEntries(rfAxes(s).map(a => [a.k, a])), md = MED[s.sector] || {};
  el.innerHTML = `<div class="fcols fcols-1"><div id="etapes-corps">
    ${rfFaitHTML(s, c)}
    ${rfChangeHTML(s, c)}
    <section class="rf-l2" id="tous-les-chiffres"><div class="rf-l2h"><h2>Tous les chiffres</h2><label class="rf-l2t"><input type="checkbox" id="rf-detail"${auto ? " checked" : ""}> Afficher toujours le détail</label></div>
      ${rfPli2("rf-resultats", "Résultats", `<span id="rf-res-sous">Ventes, bénéfice, par an</span> ${jg("g1", false, m.g1)}`, `<div class="rf-ta" id="rf-ta" hidden><button type="button" class="on" data-ta="a">Par an</button><button type="button" data-ta="t">Par trimestre</button></div><div id="rf-ta-a">${th("croissance")}</div><div id="rf-ta-t" hidden></div>${top ? `<div class="rf-chgw">${top.outerHTML}</div>` : ""}`, auto, { lab: "Ventes " + (f.year || ""), val: f.ca != null ? compact(c.currency)(f.ca) + (m.g1 != null && !nsCrois(m.g1) ? " · " + pct(m.g1, 1) : "") : "", p: (A.croissance && A.croissance.r || {}).p, med: m.g1 != null && md.g1 != null ? pct(md.g1, 1) : "" })}
      ${rfPli2("rf-rentab", "Rentabilité", `Marges, rendement des capitaux propres, face à la médiane ${jg(bank ? "roe" : "marge", false, bank ? m.roe : m.marge)}`, th("rentabilite"), auto, { lab: bank ? "Rendement des capitaux propres" : "Marge d'exploitation", val: bank ? (m.roe != null ? pct(m.roe, 1, false) : "") : (m.marge != null ? pct(m.marge, 1, false) : ""), p: (A.marge && A.marge.r || {}).p, med: bank ? (md.roe != null ? pct(md.roe, 1, false) : "") : (md.marge != null ? pct(md.marge, 1, false) : "") })}
      ${th("bilan") || th("flux") ? rfPli2("rf-dette", "Bilan, dette et trésorerie", `Dette nette, fonds propres, ce que les bénéfices deviennent en argent ${jg("lev", true, m.lev)}`, th("bilan") + th("flux"), auto, { lab: m.lev != null ? (m.lev < 0 ? "Trésorerie nette, en années d'EBITDA" : "Dette nette, en années d'EBITDA") : "Dette nette", val: m.lev != null ? nf(1).format(Math.abs(m.lev)) : f.netDebt != null ? compact(c.currency)(f.netDebt) : "", p: (A.solidite && A.solidite.r || {}).p, med: md.lev != null ? nf(1).format(md.lev) : "" }) : ""}
      ${th("valorisation") ? rfPli2("rf-valo", "Prix en Bourse", `PER, rendement, capitalisation, face au secteur ${jg("pe", true, v.pe)}`, th("valorisation") + ficheGraphBox(s), auto, { lab: "Prix payé (PER)", val: v.pe ? nf(0).format(v.pe) + " fois le résultat" : v.peNs ? "n.s." : "", p: (A.prix && A.prix.r || {}).p, med: MEDPE[s.sector] ? nf(0).format(MEDPE[s.sector]) + " fois" : "" }) : ""}
      ${th("dividende") ? rfPli2("rf-div", "Dividende", "Rendement, part du bénéfice versée, historique", th("dividende"), auto, { lab: "Rendement", val: v.yld != null ? pct(v.yld, 1, false) : "", p: (A.dividende && A.dividende.r || {}).p }) : ""}
      ${tout ? rfPli2("rf-tout-w", "Comptes complets", `${c.years.length} exercices, compte de résultat, bilan, flux · export CSV`, tout.outerHTML + `<p class="rf-l2a" style="padding:0 22px 14px"><button type="button" class="btn" id="rf-csv">Exporter en CSV</button></p>`, auto, { lab: "Exercices", val: String(c.years.length) }) : ""}
      ${rfPli2("rf-sources", "Sources et méthode", "Les documents officiels, pourquoi ces verdicts, les questions fréquentes", (srcs.length ? srcs.map(x => x.outerHTML).join("") : "") + ficheSyntheseHTML(s, c).replace(/<form class="ffaqask"[\s\S]*?<\/form>/, "") + faqHTML(s, c).replace(/<form class="ffaqask"[\s\S]*?<\/form>/, ""), auto)}
      
    </section></div></div>`;
  // réglage « toujours le détail »
  const cb = $("#rf-detail"); if (cb) cb.onchange = () => { rfDetailSet(cb.checked); $$("#tous-les-chiffres details.rf-pl2").forEach(d => d.open = cb.checked); };
  // les comportements de l'ancien onglet « Les chiffres en détail » (graphiques, lignes dépliables) sont rattachés au conteneur
  rfLierChiffres(s, c, $("#tous-les-chiffres"));
  // trimestres : la bascule Par an / Par trimestre apparaît si le site a des trimestres pour cette entreprise
  if (c.cik) rfTrimCharge(s.id).then(t => { if (!t || !t.q || !t.q.length || !$("#rf-ta")) return; $("#rf-ta").hidden = false; const rs = $("#rf-res-sous"); if (rs) rs.textContent = "Ventes, bénéfice, par trimestre et par an"; $("#rf-ta-t").innerHTML = rfTrimTableHTML(t, c);
    $$("#rf-ta button").forEach(b => b.onclick = () => { $$("#rf-ta button").forEach(x => x.classList.toggle("on", x === b)); $("#rf-ta-a").hidden = b.dataset.ta !== "a"; $("#rf-ta-t").hidden = b.dataset.ta !== "t"; }); }).catch(() => { });
  const csv = $("#rf-csv"); if (csv) csv.onclick = () => { const blob = new Blob([rfCsv(s, c)], { type: "text/csv;charset=utf-8" }), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${s.id}-comptes.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  const fa = $("#factu"); if (fa && typeof actuFicheDetail === "function") { try { actuFicheDetail(fa, s); } catch (e) { } }
  const sy = $("#rf-sources"); if (sy) { const init = () => { const d = $("#discussion"); if (sy.open && d && !d.dataset.on && typeof tabCommu === "function") { d.dataset.on = "1"; try { tabCommu(s, c, d); } catch (e) { } } }; sy.addEventListener("toggle", init); if (sy.open) init(); }
  if (typeof tblxSortable === "function") $$(".rf-ctab", el).forEach(t => tblxSortable(t));
  if (typeof tblxBindScroll === "function") tblxBindScroll(el);
  $$("table.cmpr-all, table.pcmp", el).forEach(t => { if (!t.closest(".scroll-x,.tbx-sc")) { const d = document.createElement("div"); d.className = "scroll-x"; d.style.overflowX = "auto"; t.replaceWith(d); d.appendChild(t); } }); // tableaux larges : défilement horizontal sur tablette
  if (typeof dirigeantsHTML === "function") dirigeantsHTML(s, $("#fdirig"));
  ficheGraphique(s);
  if (typeof ctxRafraichir === "function") setTimeout(() => { try { ctxRafraichir(); } catch (e) { } }, 0);
  const h = location.hash; if (h && /^#rf-/.test(h)) setTimeout(() => rfOuvrir(h.slice(1)), 50);
}
function rfLierChiffres(s, c, el) { // graphiques par thème et lignes dépliables, comme dans tabComptes, mais sur la fiche
  if (!el) return;
  const P = tblxRows(s, c), Y = c.years, byK = k => P.rows.find(r => r.k === k);
  const setG = (box, k) => { const r = byK(k); if (!r || !box) return; $$(".rf-gsel button", box).forEach(b => b.classList.toggle("on", b.dataset.g === k)); $(".rf-gbox", box).innerHTML = tblxChart(s, c, r); const d = $(".rf-gdef", box); if (d) d.innerHTML = tblxDefHTML(r); };
  $$(".rf-thc", el).forEach(box => { const b = $(".rf-gsel button", box); if (b) setG(box, b.dataset.g); });
  const toggleDet = tr => {
    const open = tr.nextElementSibling && tr.nextElementSibling.classList.contains("det");
    if (open) { tr.nextElementSibling.remove(); tr.setAttribute("aria-expanded", "false"); return; }
    const r = byK(tr.dataset.k); if (!r) return;
    const sc = tr.closest(".tbx-sc"), w = sc ? sc.clientWidth : 320, n = tr.cells.length;
    tr.insertAdjacentHTML("afterend", `<tr class="det"><td colspan="${n}"><div class="tbx-detw" style="width:${Math.max(240, w - 2)}px">${tblxDetail(r, Y)}</div></td></tr>`);
    tr.setAttribute("aria-expanded", "true");
  };
  el.addEventListener("click", e => {
    const gb = e.target.closest(".tbx-gb, .rf-kt");
    if (gb) { const th = gb.closest(".rf-th"), box = th && $(".rf-thc", th); if (box && $(`.rf-gsel button[data-g="${gb.dataset.g}"]`, box)) { setG(box, gb.dataset.g); } return; }
    const sel = e.target.closest(".rf-gsel button"); if (sel) { setG(sel.closest(".rf-thc"), sel.dataset.g); return; }
    const a = e.target.closest(".rf-thnav a, a.rf-chg"); if (a) { e.preventDefault(); const id = a.getAttribute("href").slice(1); const M = { "rf-croissance": "rf-resultats", "rf-rentabilite": "rf-rentab", "rf-bilan": "rf-dette", "rf-flux": "rf-dette", "rf-valorisation": "rf-valo", "rf-dividende": "rf-div", "rf-tout": "rf-tout-w" }; rfOuvrir(M[id] || id); return; }
    if (e.target.closest(".def,a,button,summary")) return;
    const tr = e.target.closest(".tbx-full tbody tr[data-k], .rf-tht tbody tr[data-k]"); if (tr) toggleDet(tr);
  });
  el.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches(".tbx-full tbody tr[data-k], .rf-tht tbody tr[data-k]")) { e.preventDefault(); toggleDet(e.target); } });
  $$(".lab .def", el).forEach(b => { const t = ALL[b.dataset.def]; if (t) b.title = t.what; });
  el.querySelectorAll("details.rf-pl2").forEach(d => d.addEventListener("toggle", () => { if (d.open) { tblxBindScroll(d); $$(".tbx-sc", d).forEach(x => x.dispatchEvent(new Event("scroll"))); } }));
}
document.addEventListener("click", e => { // liens internes de la fiche (« Son métier en détail », « Annonces et agenda ») : ouvrir le pli
  const a = e.target.closest && e.target.closest("[data-rf-ouvre]"); if (!a) return;
  e.preventDefault(); e.stopImmediatePropagation(); rfOuvrir(a.dataset.rfOuvre);
}, true);
// Plus d'onglets : les anciennes adresses /comptes, /actualite, /agenda, /communaute ouvrent la fiche sur le bon pli
pageCompany = (orig => function (id, tab) {
  const s = RBY[id];
  if (s && tab) { const M = { comptes: "#tous-les-chiffres", actualite: "#rf-agenda", agenda: "#rf-agenda", communaute: "#rf-sources" }; const h = location.hash && /^#rf-/.test(location.hash) ? location.hash : (M[tab] || ""); history.replaceState(history.state, "", `/entreprise/${id}${h}`); tab = ""; }
  return orig(id, tab);
})(pageCompany);
fiche2Onglets = function () { return ""; }; // zéro onglet
tabBref = function (s, c, el) { return ficheUneSeulePage(s, c, el); };
document.head.insertAdjacentHTML("beforeend", `<style>
.rf-info{border:0;background:none;color:var(--grey);font-size:16px;cursor:help;padding:0 4px;line-height:1}
.rf-l1 .rf-l1p{font-size:16.5px;line-height:1.55;margin:0 0 10px;max-width:760px}.rf-peers{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 10px}.rf-peers>span{font-size:12.5px;color:var(--grey);margin-right:4px}.rf-peers .chip{display:inline-flex;align-items:center;gap:6px;text-decoration:none}.rf-l1l{margin:0;font-size:13.5px}
.rf-l2{margin:26px 0 0}.rf-l2h{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;border-top:1px solid var(--ink);padding-top:12px;margin:0 0 10px}.rf-l2h h2{font-family:var(--serif);font-weight:800;font-size:26px;margin:0}.rf-l2t{font-size:13px;color:var(--grey);display:flex;gap:6px;align-items:center;cursor:pointer}
.rf-pl2>summary span .rf-pq{font-family:var(--mono);font-size:12px;color:var(--ink);background:var(--soft);padding:1px 6px;border-radius:4px;margin-left:6px}
.rf-th-in.panel,.rf-plb>#tbx.panel,.rf-plb>#rf-tout.panel{border:0;box-shadow:none;margin:0;border-radius:0}.rf-plb .rf-top .ph{display:none}
.rf-ta{display:flex;gap:6px;padding:12px 22px 0}.rf-ta button{font:inherit;font-size:13px;padding:6px 12px;border:1px solid var(--ink);background:#fff;border-radius:999px;cursor:pointer}.rf-ta button.on{background:var(--ink);color:#fff}
.rf-trimt td,.rf-trimt th{white-space:nowrap}#rf-ta-t{padding:12px 22px 4px}
.rf-l2a{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0 0}
#tous-les-chiffres .tbx-lv{display:none} /* niveau 2 sans mot de verdict : la position face au secteur est dans la ligne du pli */
@media (max-width:760px){.rf-ta{padding:10px 16px 0}#rf-ta-t{padding:10px 16px 4px}}
</style>`);
/* 3e passage (30/10), 1.1 : sur téléphone, les cinq jauges restent visibles, empilées une par ligne (l'ancienne règle de fiche.js les masquait au profit d'un mini-profil qui n'existe plus) */
document.head.insertAdjacentHTML("beforeend", `<style>@media (max-width:760px){.rf-hplace .fh-pl{display:block!important}.rf-hplace .prof{display:grid;grid-template-columns:1fr!important;gap:8px}.rf-hplace .prof .pa2{display:grid;grid-template-columns:92px minmax(0,1fr)!important;align-items:center;gap:2px 10px}.rf-hplace .prof .pa2 .pt b{font-size:13.5px}.rf-hplace .prof .pa2 .pt small{font-size:12px}}</style>`);

/* 31/10 (Romain) : en-tête de la fiche. Les jauges respirent (plus de bande vide sous la taille dans le secteur), les libellés ne mordent plus sur le cadre, la taille cite le secteur. */
document.head.insertAdjacentHTML("beforeend", `<style>
.rf-hplace{display:flex;flex-direction:column}.rf-hplace .fh-pl.rf-pl{flex:1;display:flex;flex-direction:column;justify-content:center;margin:14px 0 0;padding:18px 18px 16px}.rf-hplace .f2-rk{margin-top:16px}
.rf-hplace .prof .pa2{align-items:start;gap:8px 14px}.rf-hplace .prof .pa2 .pt{min-height:44px}.rf-hplace .prof .pa2 .pt b{font-size:15px}.rf-hplace .prof .pa2 .pt small{font-size:13px}
@media (min-width:761px){.rf-hplace .prof{gap:14px 26px}.rf-hplace .prof .pa2 .pl{height:9px;margin-top:4px}.rf-hplace .prof .pa2 .pm{top:-4px;height:17px}.rf-hplace .prof .pa2 .pd{top:-4px;width:17px;height:17px}}
.rf-hplace .fh-pl.rf-pl{overflow:visible}
</style>`);

document.head.insertAdjacentHTML("beforeend", `<style>.rf-gwrap{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:18px 32px;align-items:start}.rf-gdef{font-size:13.5px;line-height:1.55;color:var(--ink);border-left:3px solid var(--lime);padding:4px 0 4px 16px;margin-top:30px}.rf-gdef p{margin:0 0 8px}.rf-gdef .kick{margin:10px 0 2px;color:var(--grey)}.rf-gdef .kick:first-child{margin-top:0}@media (max-width:900px){.rf-gwrap{grid-template-columns:minmax(0,1fr)}.rf-gdef{margin-top:4px}}</style>`);

document.head.insertAdjacentHTML("beforeend", `<style>
.rf-pl2>summary{display:flex;align-items:center;gap:18px}.rf-pl2>summary .rf-plt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.rf-pl2>summary::after{display:none!important}
.rf-plk{display:flex;flex-direction:column;align-items:flex-end;text-align:right;min-width:0;flex:none}.rf-plk small{font-size:12px;color:var(--grey);white-space:nowrap}.rf-plk b{font-size:22px;line-height:1.1;font-variant-numeric:tabular-nums;letter-spacing:-.01em;white-space:nowrap}
.rf-plo{flex:none;border:1px solid var(--ink);border-radius:999px;padding:7px 14px;font:600 13px var(--sans);color:var(--ink);background:#fff}.rf-plo i{font-style:normal}.rf-plo i+i{display:none}.rf-pl2[open]>summary .rf-plo i{display:none}.rf-pl2[open]>summary .rf-plo i+i{display:inline}.rf-pl2>summary:hover .rf-plo{background:var(--ink);color:#fff}
.rf-pl2>summary span .rf-pq.ok{background:#E3F2E8;color:#0E6B4A}.rf-pl2>summary span .rf-pq.ko{background:#FBE9E4;color:#8A3A22}
@media (max-width:600px){.rf-pl2>summary{flex-wrap:wrap;gap:8px 12px}.rf-pl2>summary .rf-plt{flex-basis:100%}.rf-plk{align-items:flex-start;text-align:left;flex:1}.rf-plk b{font-size:19px}}
</style>`);

document.addEventListener("click", e => { const b = e.target.closest(".fh-copy"); if (!b) return; const t = b.dataset.copy; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { b.classList.add("ok"); b.textContent = "✓"; setTimeout(() => { b.classList.remove("ok"); b.textContent = "⧉"; }, 1500); }).catch(() => { prompt("ISIN à copier :", t); }); });

document.head.insertAdjacentHTML("beforeend", `<style>.rf-bientot{margin:8px 0 12px;border:1px solid var(--rule);border-radius:8px;background:var(--hl)}.rf-bientot>summary{list-style:none;cursor:pointer;display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;padding:10px 14px;font-size:14px}.rf-bientot>summary::-webkit-details-marker{display:none}.rf-bientot>summary span{font-size:12.5px;color:var(--grey)}.rf-bientot>p{margin:0;padding:0 14px 12px;font-size:13.5px;color:var(--grey)}</style>`);

document.head.insertAdjacentHTML("beforeend", `<style>.pa2-ic{width:15px;height:15px;flex:none;margin-right:5px;color:var(--grey)}.prof .pa2 .pt b{display:flex;align-items:center;white-space:nowrap}.rf-plm{display:flex;align-items:center;gap:8px;margin-top:4px}.rf-plm>.pl{position:relative;display:block;width:72px;height:6px;border-radius:99px;background:linear-gradient(90deg,#F6DED5,#EEE9DF 45%,#EEE9DF 55%,#D9EBDF)}.rf-plm .pm{position:absolute;left:50%;top:-3px;width:2px;height:12px;background:var(--light)}.rf-plm .pd{position:absolute;top:-3px;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.15);transform:translateX(-50%)}.rf-plm small{font-size:11.5px;color:var(--grey);white-space:nowrap}@media (max-width:600px){.rf-plm{justify-content:flex-start}}</style>`);
