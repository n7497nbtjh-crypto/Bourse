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
  .f2dlg-l li a{grid-template-columns:26px 24px minmax(0,1fr) auto;padding:7px 8px}
  .f2dlg-l .b{display:none}
}
@media (max-width:420px){.f2tabs.qtabs a svg{display:none}.f2tabs.qtabs a{padding:9px 4px}}
/* ===== Refonte du 29 octobre (13 h 30) : en-tête allégé, « En bref » en synthèse, concurrents en tableau ===== */
.rf-hero .fh-top{padding:16px 22px 14px;gap:20px}
.rf-hero .fh-t h1{font-size:28px}
.rf-hero .fh-desc{font-size:14.5px;margin-top:3px}
.rf-hero .fh-tags{margin-top:8px}
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
  .rf-keys .fk{padding:11px 14px 12px}
  .rf-keys .fk b{font-size:18px}
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
function ficheSommaire(s, c) {
  if (c === undefined) c = FULL[s.id] || null;
  if (s.missing || !c) {
    const wd = ficheWd(s.id), md = MED[s.sector] || {}, faits = [wd && wd.fonde ? `créée en ${wd.fonde}` : "", wd && wd.siege ? `siège à ${esc(wd.siege)}` : "", wd && wd.effectif ? `${F0.format(wd.effectif[0])} salariés` : ""].filter(Boolean);
    return `<div class="fh-sum rf-sum"><h2 class="f2-h">En bref</h2><p class="fh-v" id="fverdict">${s.fiche && s.fiche.fait && s.fiche.fait !== s.desc ? esc(s.fiche.fait) + " " : ""}${faits.length ? `${esc(s.name)} : ${faits.join(", ")}.` : s.fiche && s.fiche.fait && s.fiche.fait !== s.desc ? "" : esc(s.desc || "")}</p>
      ${s.missing ? `<p class="rf-no">${esc(missingTxt(s))}. Son métier, son cours, son actualité et les réponses de l'IA sont ci-dessous.</p>` : `<p class="rf-no">Chargement des comptes…</p>`}
      ${s.missing && md.n >= 3 ? `<div class="rf-bl"><h3>Son secteur en repères : ${esc(secName(s))}</h3><div class="fh-feu">${md.marge != null ? `<span>Marge médiane <b>${pct(md.marge, 1, false)}</b></span>` : ""}${md.g1 != null ? `<span>Croissance médiane <b>${pct(md.g1, 1)}</b></span>` : ""}${MEDPE[s.sector] ? `<span>PER médian <b>${F0.format(MEDPE[s.sector])}</b></span>` : ""}</div></div>` : ""}
      ${rfAVenir(s)}</div>`;
  }
  CURSYM = CUR[s.currency] || s.currency || "€";
  const t = quick(s), sit = rfSituation(s, c), P = rfPoints(s, c);
  const li = (i, k) => `<li class="rf-${k}"><i></i><button type="button" class="rf-anf" data-rf-anf="${esc(i.id)}" title="Lire le détail et la source">${esc(i.titre)}</button></li>`;
  return `<div class="fh-sum rf-sum"><div class="rf-sh"><h2 class="f2-h">En bref</h2><span class="f2-sub">Exercice ${esc(s.year)} · comptes officiels</span></div>
      <p class="fh-v" id="fverdict">${sit || esc(s.desc || "")}</p>
      ${P && (P.v.length || P.d.length) ? `<div class="rf-pts">
        <div class="rf-bl"><h3>Atouts</h3>${P.v.length ? `<ul>${P.v.map(i => li(i, "v")).join("")}</ul>` : `<p class="rf-no">Aucun atout net dans ses comptes.</p>`}</div>
        <div class="rf-bl"><h3>À surveiller</h3>${P.d.length ? `<ul>${P.d.map(i => li(i, "d")).join("")}</ul>` : `<p class="rf-no">Rien d'inquiétant dans les derniers comptes.</p>`}</div></div>` : ""}
      ${rfAVenir(s)}
      <div class="rf-foot">${t ? `<span class="rf-tally" title="Selon les seuils de lecture du site et la médiane du secteur"><span class="f"><i></i>${t.fort} fort${t.fort > 1 ? "s" : ""}</span><span class="m"><i></i>${t.moyen} moyen${t.moyen > 1 ? "s" : ""}</span><span class="v"><i></i>${t.vig} à surveiller</span></span>` : ""}<button type="button" class="linkbtn lnk" data-et="retenir">L'analyse complète</button></div></div>`;
}
function companyHeader(s, tab, chart = true) { // en-tête commun à toutes les pages d'une entreprise
  const pea = peaOk(s), place = String(s.tv || "").split(":")[0], bourse = (typeof IA_BOURSES !== "undefined" && IA_BOURSES[place]) || place;
  const cmp = `/comparer?ids=${[s, ...peersOf(s, 3).list].map(c => c.id).join(",")}`;
  const courbe = !tab && chart && s.tv;
  return `<div class="crumbs"><a href="/entreprises">Entreprises</a> › <a href="/entreprises?secteur=${s.sector}">${esc(secName(s))}</a> › <a href="/entreprise/${s.id}">${esc(s.name)}</a></div>
    <section class="panel fhero rf-hero"><div class="fh-top">
      <div class="fh-id">${logo(s, 48)}<div class="fh-t"><h1>${esc(s.name)}</h1>${s.desc ? `<p class="fh-desc">${esc(s.desc)}</p>` : ""}
        <div class="fh-tags"><span title="Code de l'action">${esc(s.ticker)}</span>${bourse ? `<span>${esc(bourse)}</span>` : ""}<span>${esc(regName(s))}</span><a href="/entreprises?secteur=${s.sector}">${esc(secName(s))}</a>${pea != null ? `<span class="${pea ? "ok" : ""}">${pea ? "Éligible au PEA" : "Hors PEA : compte-titres"}</span>` : ""}</div>
        <div class="fh-act">${favBtn("c:" + s.id)}<a class="favbtn" href="${cmp}">Comparer<span class="f2-lg2">&nbsp;à ses concurrents</span></a>${tab === "comprendre" ? "" : `<button type="button" class="favbtn fh-ia" data-fiche-ia>✦ Poser une question à l'IA</button>`}</div></div></div>
      <div class="px" id="pxh">${ficheCours(s)}</div></div>
      ${!tab ? `<div class="f2-mid rf-mid${courbe ? "" : " f2-noc"}">${courbe ? `<div class="f2-chart"><div class="f2-ch-h"><h2 class="f2-h">Le cours de l'action</h2><span class="f2-note"><span class="f2-nd">Cours différé · relevés disponibles</span><span class="f2-nm">Cours différé</span></span></div><div class="tv tv-chart f2-tv" id="tvchart" role="img" aria-label="Courbe du cours de ${esc(s.name)}"><div class="f2-tvph">Chargement de la courbe…</div></div></div>` : ""}${ficheSommaire(s, s.missing ? null : FULL[s.id])}</div>` : ""}
    </section>
    ${fiche2Onglets(s, tab)}`;
}

/* ---------- Vue d'ensemble : les étapes, une colonne latérale courte (dernières annonces) ---------- */
function tabBref(s, c, el) {
  el.innerHTML = `${etapesHTML(s, c)}
    <div class="fcols"><div id="etapes-corps">${etapesCorps(s, c)}</div>
      <aside class="fside" id="fside">
        <section class="panel" id="actus"><div class="ph"><h2>Dernières annonces</h2></div><div class="pb" id="fannb"></div><p class="fannall"><a class="more" href="/entreprise/${s.id}/actualite">Toutes les actualités →</a></p></section>
      </aside></div>`;
  etapesBind(s);
  if (typeof tblxSortable === "function") $$(".rf-ctab", el).forEach(t => tblxSortable(t));
  if (typeof tblxBindScroll === "function") tblxBindScroll(el);
  const qs = new URLSearchParams(location.search), voir = qs.get("voir");
  if (voir) { const d = $(`details[data-term="${voir}"]`) || $("#" + voir); if (d && d.tagName === "DETAILS") d.open = true; }
  ficheAnnonces(s, $("#fannb"));
  if (typeof dirigeantsHTML === "function") dirigeantsHTML(s, $("#fdirig"));
  ficheGraphique(s);
  if (typeof ctxRafraichir === "function") setTimeout(() => { try { ctxRafraichir(); } catch (e) { } }, 0);
}
/* Le parcours : l'essentiel, le métier, les concurrents, l'actualité, les questions.
   Les comptes, le prix et le dividende sont regroupés par thème dans l'onglet « Les chiffres en détail ». */
const RF_ETAPES_CHIFFRES = { comptes: "", prix: "valorisation", dividende: "dividende" };
function etapesListe(s, c) {
  if (typeof ctxCharge === "function") ctxCharge();
  const actu = () => typeof contexteActuHTML === "function" ? contexteActuHTML(s, c) : "";
  if (!c) return [
    ["metier", "Son métier", () => ficheMetierHTML(s, null) + `<section class="panel"><div class="pb muted">${missingTxt(s, true)}</div></section>`],
    ["prix", "Son prix", () => ficheGraphBox(s) + fichePrixSans(s)],
    ["actualite", "Actualité", actu],
    ["faq", "Questions", () => faqHTML(s, null)],
  ];
  return [
    ["retenir", "L'essentiel", () => ficheRetenirHTML(s, c)],
    ["metier", "Son métier", () => ficheMetierHTML(s, c)],
    ["concurrents", "Concurrents", () => concurrentsHTML(s)],
    ["actualite", "Actualité", actu],
    ["faq", "Questions", () => faqHTML(s, c)],
  ];
}
/* Étape 1 : les indicateurs principaux (une tuile chacun, reliée à son thème détaillé), puis l'analyse sur plusieurs années */
const RF_TUILE_PROV = { Ventes: () => "ca", Marge: () => "marge", "Bénéfice": () => "net", Dette: k => k === "aucune" ? "netDebt" : "lev", Dividende: k => /%/.test(k) ? "payout" : "divPaid", Prix: () => "per" };
const RF_TUILE_THEME = { Ventes: "croissance", Marge: "rentabilite", "Bénéfice": "rentabilite", Dette: "bilan", Dividende: "dividende", Prix: "valorisation" };
function ficheRetenirHTML(s, c) {
  const f = figuresOf(c), facts = essentielFacts(s, f), items = lecture(s, f);
  const lvOf = l => { const k = { Ventes: ["croissance"], Marge: ["marge"], "Bénéfice": ["net"], Dette: ["lev", "dettenette", "gear"], Dividende: ["payout"] }[l]; const it = k && items.find(i => k.includes(i.term)); return it ? it.lv : null; };
  return `<section class="panel" id="retenir"><div class="ph"><h2>Les indicateurs principaux</h2><span class="light" style="font-size:12.5px">Exercice ${f.year}</span></div>${typeof provComptesVieux === "function" ? provComptesVieux(c, s) : ""}
    <div class="fkeys rf-keys n${facts.length}">${facts.map(([l, k, t]) => { const lv = lvOf(l), th = RF_TUILE_THEME[l], pk = RF_TUILE_PROV[l] && RF_TUILE_PROV[l](k);
      // tuile entière cliquable (lien étiré) ; le bouton « i » (provenance du chiffre) reste au-dessus du lien
      return `<div class="fk fk-l${lv ? " fk-" + lv : ""}"><span class="kick"><span>${l}${pk && typeof provBtn === "function" ? provBtn(pk, "c:" + s.id) : ""}</span>${lv && lv !== "na" ? `<span class="vd vd-${lv}">${VERDICT[lv]}</span>` : ""}</span><a class="fk-a" href="/entreprise/${s.id}/comptes#rf-${th}"><b>${k}</b><p>${t}</p></a></div>`; }).join("")}</div>
    <p class="rf-keysn">Touchez un indicateur pour son évolution sur plusieurs années, dans l'onglet <a class="lnk" href="/entreprise/${s.id}/comptes">Les chiffres en détail</a>.</p>
    ${ficheAnalyse(s, c)}
    ${ficheConfiance(c)}
    <div class="src">Les couleurs comparent chaque chiffre à des seuils simples et à la médiane de son secteur. Un point de vigilance n'est pas une mauvaise nouvelle en soi : c'est ce qu'il faut surveiller. Rien ici ne dit s'il faut acheter.</div></section>`;
}
async function pageCompany(id, tab) {
  const s = RBY[id];
  if (!s) return pageNotFound();
  setNav("ent");
  if (tab === "agenda" || tab === "communaute") tab = "actualite";
  tab = CTABS.some(t => t[0] === (tab || "")) ? (tab || "") : "";
  const et = new URLSearchParams(location.search).get("etape");
  if (!tab && !s.missing && et in RF_ETAPES_CHIFFRES) { // anciens liens vers les étapes « Ses comptes », « Son prix », « Dividende »
    tab = "comptes"; history.replaceState(history.state, "", `/entreprise/${id}/comptes${RF_ETAPES_CHIFFRES[et] ? "#rf-" + RF_ETAPES_CHIFFRES[et] : ""}`);
  }
  setTitle(s.name + (tab ? " : " + CTABS.find(t => t[0] === tab)[1].toLowerCase() : ""));
  app.innerHTML = companyHeader(s, tab) + `<div id="ctab"><div class="empty">Chargement de la fiche…</div></div>`;
  if (!tab) ficheGraphique(s); // la courbe se charge pendant que la fiche arrive, sans la retarder
  const load = s.missing ? Promise.resolve(null) : (FULL[id] ? Promise.resolve(FULL[id]) : fetch(`/data/societes/${id}.json`).then(r => r.json()).then(j => FULL[id] = j).catch(() => null));
  const [c] = await Promise.all([load, PXP, ficheWDLoad(id)]);
  if (!ficheMemeId(id)) return; // l'utilisateur a changé de page entre-temps
  const ph = $("#pxh"); if (ph) ph.innerHTML = ficheCours(s);
  const sm = $(".fh-sum"); if (sm) sm.outerHTML = ficheSommaire(s, c); // la situation et le prix ont besoin des comptes et du cours
  ({ "": tabBref, comptes: tabComptes, actualite: (s, c, el) => { tabActu(s, c, el); const d = document.createElement("div"); d.id = "discussion"; el.appendChild(d); tabCommu(s, c, d); } })[tab](s, c, $("#ctab"));
  if (tab === "comptes" && location.hash.startsWith("#rf-")) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => t.scrollIntoView({ block: "start" }), 30); }
  if (!tab) { fiche2Etapes(); premStatus().then(() => { if (ficheMemeId(id)) assistantPanel(s, c, $("#ctab")); }); }
}
document.addEventListener("click", e => { // « En bref » → le point détaillé, avec son chiffre et sa source, dans « L'essentiel »
  const b = e.target.closest && e.target.closest("[data-rf-anf]"); if (!b) return;
  e.preventDefault(); if (typeof ETAPE_SHOW === "function") ETAPE_SHOW("retenir");
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
    ficheGraphique(s); fiche2Etapes();
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
  if (!r) { const na = T.na(F, X); return `<td class="num na" data-v="" title="${esc(na)}"><span class="rf-na">–</span><small>${esc(na)}</small></td>`; }
  const lv = !T.neutral && r.lv && r.lv !== "na" ? r.lv : null, key = r.key != null ? r.key : r.v;
  const txt = r.cash ? "Aucune" : T.k === "dividende" && !(r.v > 0) ? "Aucun" : T.short && T.k !== "prix" ? T.short(r) : r.txt;
  return `<td class="num${lv ? " rf-" + lv : ""}" data-v="${key != null && isFinite(key) ? key : ""}" title="${esc(F.c.name + " : " + T.say(r, F, X))}"><span class="rf-cv">${lv ? `<i class="dot dot-${lv}" aria-hidden="true"></i>` : ""}${esc(txt)}</span>${lv ? `<small class="vd-${lv}">${esc(r.word && T.k === "prix" ? r.word : CMPR_LV[lv])}</small>` : r.word && T.k !== "taille" ? `<small>${esc(r.word)}</small>` : ""}</td>`;
}
function rfCmpForces(T, F, X) { // une phrase par critère coloré, sans comparaison au « meilleur » du groupe
  const r = T.val(F, X); if (!r || T.neutral || !r.lv || r.lv === "na" || r.lv === "moyen") return null;
  const med = r.medTxt ? ` (secteur : ${r.medTxt})` : "";
  return { lv: r.lv, html: `<b>${esc(RF_CMP_COURT[T.k])}</b> : ${esc(T.say(r, F, X))}${esc(med)}` };
}
function concurrentsHTML(s) {
  const { peers, auto, all } = cmprFiche(s); if (!peers.length) return rfPlaceHTML(s);
  const CMAX = isPrem() ? 5 : FREE.cmp, link = "/comparer?ids=" + all.slice(0, CMAX).map(c => c.id).join(",");
  const X = cmprCtx(all), me0 = X.F[0];
  const titre = auto ? "Face aux entreprises comparables" : "Face à ses concurrents directs";
  if (!me0.ok) return `<section class="panel" id="concurrents"><div class="ph"><h2>${titre}</h2><a href="${link}">Comparer en détail →</a></div><div class="pb"><p class="muted" style="margin:0 0 6px">${esc(missingTxt(s, true))}</p><div class="cmpr-peers">${peers.map(c => `<a href="/entreprise/${c.id}">${logo(c, 24)}${esc(c.name)}</a>`).join("")}</div>${fiche2RangBouton(s)}</div></section>` + rfPlaceHTML(s);
  const T6 = RF_CMP_ORD.map(k => CMPR_T.find(T => T.k === k)).filter(Boolean);
  const head = `<tr><th scope="col" class="l lab">Entreprise</th>${T6.map((T, i) => `<th scope="col" data-sk="${i + 1}" title="${esc(T.ind(X))} · cliquer pour trier"><span class="rf-cth">${esc(RF_CMP_COURT[T.k])}</span><small>${esc(RF_CMP_SOUS[T.k](X))}</small></th>`).join("")}</tr>`;
  const rows = X.F.map((F, j) => `<tr class="${j === 0 ? "rf-me" : j % 2 ? "" : "z"}"><th scope="row" class="l lab" data-v="${esc(F.c.name)}"><a class="rf-co" href="/entreprise/${F.c.id}">${logo(F.c, 24)}<span class="nm">${esc(F.c.name)}</span></a>${j === 0 ? `<small class="rf-tag">cette fiche</small>` : ""}</th>${T6.map(T => rfCmpCell(T, F, X)).join("")}</tr>`).join("");
  const medRow = `<tr class="rf-med"><th scope="row" class="l lab"><span class="nm">Médiane du secteur</span><small>${esc(secName(s))}</small></th>${T6.map(T => { const r = T.val(me0, X); return `<td class="num">${r && r.medTxt ? esc(r.medTxt) : `<span class="rf-na">–</span>`}</td>`; }).join("")}</tr>`;
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
    <div class="pb rf-cmpi"><p class="rf-intro">${auto ? `Aucun concurrent direct de ${esc(s.name)} n'est encore suivi sur le site : voici les entreprises de son secteur dont la taille est la plus proche.` : `Les entreprises qui vendent les mêmes produits ou services, aux mêmes clients.`} Chaque case est comparée aux repères du site et à la médiane du secteur de l'entreprise : <span class="rf-lg"><i class="dot dot-fort"></i>point fort</span> <span class="rf-lg"><i class="dot dot-vig"></i>point de vigilance</span> <span class="rf-lg"><i class="dot dot-moyen"></i>sans couleur : dans la moyenne</span>. La taille et le dividende ne sont pas colorés.</p></div>
    ${tblxScrollBox(`<table class="t tbx tbx-sort rf-ctab"><caption class="sr">${esc(s.name)} et ses ${auto ? "voisines de secteur" : "concurrentes"}, critère par critère</caption><thead>${head}</thead><tbody>${rows}</tbody><tfoot>${medRow}</tfoot></table>`, "Faites glisser pour voir tous les critères")}
    <div class="pb"><h3 class="rf-h3">Atouts et faiblesses de chacune</h3><p class="rf-sub">Le tableau ne désigne pas de gagnante : une action plus chère peut correspondre à une entreprise qui grandit plus vite, une forte dette à un métier très régulier.</p>
      <div class="rf-cards">${cartes}</div>
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
  const n = (prof.match(/class="pa2"/g) || []).length;
  return `<section class="panel rf-place" id="secteur-place"><div class="ph"><h2>Sa place dans le secteur ${esc(secName(s).toLowerCase())}</h2></div>
    <div class="pb"><p class="rf-sub" style="margin-top:0">Parmi toutes les entreprises du secteur suivies par le site, critère par critère.</p>${rk}
      ${prof ? `<div class="fh-pl rf-pl" style="--n:${Math.max(3, n)}">${prof}</div><div class="fh-pm">${profilMini(s)}</div>` : ""}</div></section>`;
}
/* La fiche a pu être affichée avant le chargement de ce module : on la refait avec la nouvelle version */
if (typeof R !== "undefined" && R && R.companies && /^\/entreprise\/[^/]+(\/(comptes|actualite|agenda|communaute))?\/?$/.test(location.pathname)) { const [, , id, t] = location.pathname.split("/"); pageCompany(id, t); }
