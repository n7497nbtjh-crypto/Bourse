/* Module « comparer » de bilan. : chargé après le script principal de index.html.
   Les fonctions déclarées ici remplacent celles du même nom (déclarations function, jamais const/let pour un nom existant).

   Remplace :
   - pageComparer() : la page /comparer ;
   - concurrentsHTML(s) : l'étape « Concurrents » de la fiche entreprise (appelée par etapesListe).
   Principe : le verdict d'abord (phrases calculées sur les comptes, instantanées, sans modèle), puis six thèmes
   (taille, croissance, rentabilité, solidité financière, prix en Bourse, dividende) avec des barres sur une même échelle
   et la médiane du secteur, puis tous les chiffres en dépliant. Rien n'est retiré par rapport à l'ancien tableau.
   « Approfondir avec l'IA » : l'IA connectée par le visiteur (m/monia.js, consigne « comparaison ») ; sinon, invitation à la connecter. */

/* ---------- Styles ---------- */
document.head.insertAdjacentHTML("beforeend", `<style id="cmpr-css">
.cmpr-selp{overflow:visible}
.cmpr-sel{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
.cmpr-card{position:relative;display:flex;align-items:flex-start;gap:10px;min-width:0;border:1px solid var(--line);border-radius:12px;padding:12px 40px 12px 12px;background:#fff}
.cmpr-card .cmpr-cl{display:flex;gap:10px;min-width:0;flex:1}
.cmpr-card .cmpr-cl > span{display:flex;flex-direction:column;min-width:0}
.cmpr-card b{font-weight:600;font-size:15px;line-height:1.25;overflow:hidden;text-overflow:ellipsis}
.cmpr-card small{color:var(--light);font-size:12px;line-height:1.4}
.cmpr-card .pills{margin-top:5px}
.cmpr-card a.cmpr-cl:hover b{text-decoration:underline;text-decoration-color:var(--lime);text-decoration-thickness:3px;text-underline-offset:3px}
.cmpr-x{position:absolute;top:9px;right:9px;width:28px;height:28px;border-radius:50%;border:1px solid var(--line);background:#fff;cursor:pointer;font-size:17px;line-height:1;color:var(--grey);display:grid;place-items:center;padding:0}
.cmpr-x:hover{border-color:var(--ink);color:var(--ink)}
.cmpr-add{flex-direction:column;gap:6px;border-style:dashed;border-width:1.5px;padding:10px 12px;background:#FCFBF8}
.cmpr-add label{font-size:12.5px;font-weight:600;color:var(--grey)}
.cmpr-q{position:relative;width:100%}
.cmpr-q input{width:100%;height:40px;border:1px solid var(--line);border-radius:10px;padding:0 12px;font:inherit;font-size:15px;background:#fff;outline:none}
.cmpr-q input:focus{border-color:var(--ink)}
.cmpr-sug{position:absolute;left:0;top:calc(100% + 4px);min-width:min(340px,calc(100vw - 48px));width:100%;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:0 12px 32px -10px rgba(17,18,20,.25);z-index:25;padding:4px;max-height:340px;overflow:auto}
.cmpr-sug .h{font-family:var(--mono);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--light);padding:8px 8px 4px}
.cmpr-sug button{display:flex;align-items:center;gap:10px;width:100%;border:0;background:none;padding:7px 8px;border-radius:8px;cursor:pointer;text-align:left}
.cmpr-sug button > span{display:flex;flex-direction:column;min-width:0}
.cmpr-sug button b{font-weight:600}
.cmpr-sug button small{color:var(--light);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cmpr-sug button em{margin-left:auto;font-style:normal;font-size:11.5px;color:var(--light);white-space:nowrap}
.cmpr-sug button.on,.cmpr-sug button:hover{background:var(--soft)}
.cmpr-sug .none{padding:10px;color:var(--grey);font-size:13.5px}
.cmpr-lim{justify-content:center;flex-direction:column;gap:4px;font-size:13.5px;color:var(--grey);padding:12px}
.cmpr-sugs{display:flex;align-items:center;flex-wrap:wrap;gap:6px 0;margin-top:12px}
.cmpr-sugs > span{font-size:13px;color:var(--light);margin-right:10px}
.cmpr-sugs .chip{gap:7px;padding:3px 11px 3px 4px;background:#fff}
.cmpr-sugs .chip .lg{border-radius:50%}
.cmpr-acts{display:flex;gap:6px 18px;flex-wrap:wrap;align-items:center;margin-top:12px;font-size:13px}
.cmpr-acts .linkbtn{font-size:13px;display:inline-flex;align-items:center;gap:6px}
.cmpr-acts svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.cmpr-cut{margin:12px 0 0;font-size:13.5px;color:var(--grey)}
.cmpr-pre{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.cmpr-pre a{display:flex;flex-direction:column;gap:8px;border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:#fff}
.cmpr-pre a:hover{border-color:var(--ink)}
.cmpr-pre .lgs{display:flex}.cmpr-pre .lgs .lg{margin-right:-6px;box-shadow:0 0 0 2px #fff}
.cmpr-pre b{font-family:var(--serif);font-size:16px}
.cmpr-pre small{color:var(--grey);font-size:13px}
/* verdict */
.cmpr-vp .ph h2{display:flex;align-items:center;gap:8px}
.cmpr-badge{font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--g);background:#EAF5EF;border-radius:99px;padding:3px 9px;white-space:nowrap}
.cmpr-lead{font-size:15.5px;line-height:1.55;margin:0 0 6px}
.cmpr-vl{list-style:none;margin:0;padding:0}
.cmpr-vl li{display:grid;grid-template-columns:190px minmax(0,1fr);gap:4px 18px;padding:11px 0;border-top:1px solid var(--line2);align-items:baseline}
.cmpr-vl .th{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--grey)}
.cmpr-vl .th svg,.cmpr-thh svg{width:17px;height:17px;flex:none;stroke:var(--ink);fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;position:relative;top:3px}
.cmpr-vl a.th:hover{color:var(--ink)}
.cmpr-vl p{margin:0;font-size:15px;line-height:1.5}
.cmpr-vl p.muted{font-size:14px}
.cmpr-notes{margin:12px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}
.cmpr-notes li{display:flex;gap:8px;align-items:baseline;font-size:13px;color:var(--grey);line-height:1.5}
.cmpr-notes li::before{content:"";flex:none;width:6px;height:6px;border-radius:50%;background:var(--amber);position:relative;top:-1px}
.cmpr-ia{display:flex;gap:10px 16px;align-items:center;flex-wrap:wrap;padding:14px 22px;background:#F4FAF6;border-top:1px solid var(--line2)}
.cmpr-ia .btn{display:inline-flex;align-items:center;gap:8px;height:40px}
.cmpr-ia .btn .s{color:var(--lime)}
.cmpr-ia p{margin:0;flex:1;min-width:220px;font-size:12.5px;color:var(--grey);line-height:1.45}
.cmpr-iaout:empty{display:none}
.cmpr-iaout{padding:0 22px 16px;background:#F4FAF6}
.cmpr-iaout .iares{background:#fff;margin:0}
.cmpr-iaout .iares .kick{color:var(--g)}
/* thèmes */
.cmpr-clip{overflow:clip}
.cmpr-legend{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;padding:4px 22px 14px;font-size:12.5px;color:var(--grey)}
.cmpr-legend span{display:inline-flex;align-items:center;gap:6px}
.cmpr-legend i{display:inline-block;width:14px;height:8px;border-radius:4px}
.cmpr-legend i.m{width:2px;height:14px;border-radius:0;background:var(--ink);opacity:.65}
.cmpr-th{padding:18px 22px 16px;border-top:1px solid var(--line2);scroll-margin-top:80px}
.cmpr-thh{display:flex;align-items:baseline;gap:6px 10px;flex-wrap:wrap;margin:0 0 12px}
.cmpr-thh h3{font-size:19px;margin:0}
.cmpr-ind{font-size:13px;color:var(--grey)}
.cmpr-win{margin-left:auto;align-self:center;background:var(--lime);color:var(--ink);border-radius:99px;padding:3px 11px;font-size:12.5px;font-weight:600;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.cmpr-thb{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(0,1fr);gap:16px 34px;align-items:start}
.cmpr-rows{display:flex;flex-direction:column;gap:2px}
.cmpr-jg{margin:4px 10px 14px}.cmpr-jgl{display:flex;justify-content:space-between;font-size:11.5px;color:var(--light);margin-bottom:6px}
.cmpr-jgb{position:relative;height:var(--h,34px);margin:0 16px}.cmpr-jgb:before{content:"";position:absolute;left:0;right:0;top:14px;height:6px;border-radius:9px;background:linear-gradient(90deg,var(--o),#E3D9A6 50%,var(--g))}
.cmpr-jgb.cmpr-jgn:before{background:linear-gradient(90deg,#E6E1D6,#B8B2A6)}
.cmpr-jgb em{position:absolute;left:50%;top:9px;width:2px;height:16px;background:var(--ink);opacity:.45;transform:translateX(-50%)}
.cmpr-dot{position:absolute;width:34px;height:34px;border-radius:50%;background:#fff;border:3px solid var(--n);transform:translateX(-50%);display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.15)}
.cmpr-dot.lv-fort{border-color:var(--g)}.cmpr-dot.lv-vig{border-color:var(--o)}.cmpr-dot.lv-moyen,.cmpr-dot.lv-n{border-color:#8F8A80}
.cmpr-dot .lg{--s:24px!important;width:24px;height:24px}
.cmpr-rows-j .cmpr-bar{display:none}.cmpr-rows-j .cmpr-row{grid-template-columns:minmax(110px,1fr) auto;padding:5px 10px}.cmpr-rows-j .cmpr-val{text-align:right}
.cmpr-rows-j .cmpr-row.win{background:transparent}.cmpr-rows-j .cmpr-row.win .cmpr-co span{font-weight:700}
.cmpr-row{display:grid;grid-template-columns:minmax(110px,170px) minmax(0,1fr) 150px;gap:14px;align-items:center;padding:7px 10px;border-radius:10px;outline:none}
.cmpr-row.win{background:var(--hl)}
.cmpr-row:focus-visible{box-shadow:0 0 0 2px var(--ink)}
.cmpr-co{display:flex;align-items:center;gap:8px;min-width:0}
.cmpr-co > span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}
.cmpr-row.win .cmpr-co > span{font-weight:700}
.cmpr-co .lg{border-radius:7px}
.cmpr-trk{position:relative;display:block;height:12px;background:#EFEAE0;border-radius:6px}
.cmpr-trk.cmpr-none{background:repeating-linear-gradient(90deg,#EFEAE0 0 6px,transparent 6px 10px);height:4px;margin:4px 0}
.cmpr-fill{position:absolute;top:0;bottom:0;border-radius:6px;min-width:3px}
.cmpr-zero{position:absolute;top:-4px;bottom:-4px;width:1px;background:var(--light)}
.cmpr-med{position:absolute;top:-6px;width:2px;height:24px;background:var(--ink);opacity:.65;transform:translateX(-1px);border-radius:1px}
.cmpr-val{text-align:right;min-width:0}
.cmpr-val b{display:block;font-family:var(--mono);font-size:15px;font-weight:600;letter-spacing:-.02em;white-space:nowrap}
.cmpr-val small{display:block;font-size:11.5px;line-height:1.35;color:var(--light)}
.cmpr-val small.vd{font-weight:600}
.cmpr-axis{display:flex;justify-content:space-between;gap:10px;font-size:11.5px;color:var(--light);margin:2px 10px 0}
.cmpr-exp{font-size:14px;line-height:1.55;color:var(--ink)}
.cmpr-exp p{margin:0 0 8px}
.cmpr-exp .cmpr-rule{font-size:12.5px;color:var(--grey)}
.cmpr-exp .cmpr-na{font-size:12.5px;color:var(--grey)}
details.cmpr-det{margin-top:12px;border:1px solid var(--line2);border-radius:12px;background:#FCFBF8}
details.cmpr-det > summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;padding:10px 14px;font-size:13.5px;font-weight:600}
details.cmpr-det > summary::-webkit-details-marker{display:none}
details.cmpr-det > summary small{font-weight:400;color:var(--light);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
details.cmpr-det > summary::after{content:"";margin-left:auto;flex:none;width:8px;height:8px;border-right:2px solid var(--ink);border-bottom:2px solid var(--ink);transform:rotate(45deg);position:relative;top:-2px}
details.cmpr-det[open] > summary::after{transform:rotate(-135deg);top:2px}
details.cmpr-det > div{padding:0 14px 12px}
.cmpr-t{width:100%;border-collapse:collapse;font-size:13.5px;background:#fff;border-radius:10px}
.cmpr-t th,.cmpr-t td{padding:9px 10px;border-bottom:1px solid var(--line2);text-align:left;vertical-align:top}
.cmpr-t thead th{font-size:12px;font-weight:600;color:var(--grey);vertical-align:bottom;line-height:1.3}
.cmpr-t thead .def{font-size:12px;font-weight:600;color:var(--grey);text-align:left}
.cmpr-t tbody th{font-weight:600;white-space:nowrap}
.cmpr-t tbody th .cmpr-co{gap:7px}
.cmpr-t tr:last-child > *{border-bottom:0}
.cmpr-t td b{font-family:var(--mono);font-weight:600;font-size:13.5px;white-space:nowrap}
.cmpr-t td small{display:block;color:var(--light);font-size:11.5px;line-height:1.35}
.cmpr-t td .dot{display:inline-block;width:8px;height:8px;margin-right:6px;vertical-align:1px}
.cmpr-t td .vd{font-weight:600}
.cmpr-t .na{color:var(--light)}
.cmpr-rk{display:flex;flex-direction:column;gap:5px;min-width:96px}
.cmpr-rk .pl{position:relative;display:block;height:4px;border-radius:4px;background:var(--line2);margin-top:6px}
.cmpr-rk .pm{position:absolute;left:50%;top:-3px;width:1px;height:10px;background:var(--light)}
.cmpr-rk .pd{position:absolute;top:-3px;width:10px;height:10px;border-radius:50%;transform:translateX(-50%);box-shadow:0 0 0 2px #fff}
.cmpr-tnote{font-size:12px;color:var(--grey);margin:8px 2px 0;line-height:1.5}
/* tableau complet */
.cmpr-all{width:100%;border-collapse:separate;border-spacing:0;font-size:13.5px}
.cmpr-all th,.cmpr-all td{padding:9px 12px;border-bottom:1px solid var(--line2);text-align:left;vertical-align:top}
.cmpr-all thead th{position:sticky;top:var(--cmpr-top,58px);z-index:3;background:#fff;border-bottom:1.5px solid var(--ink)}
.cmpr-all thead th:first-child{width:24%}
.cmpr-all tbody th{font-weight:600;font-size:13px;line-height:1.35}
.cmpr-all tbody th small{display:block;font-weight:400;color:var(--light);font-size:11.5px}
.cmpr-all tr.grp th{background:#FCFBF8;font-family:var(--mono);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--grey);padding:8px 12px}
.cmpr-all td b{font-family:var(--mono);font-weight:600;white-space:nowrap}
.cmpr-all td small{display:block;color:var(--light);font-size:11.5px}
.cmpr-all td .dot{display:inline-block;width:8px;height:8px;margin-right:6px;vertical-align:1px}
.cmpr-all td .vd{font-weight:600}
.cmpr-all .hl{background:var(--hl)}
/* sources */
.cmpr-src{margin:0;padding:0;list-style:none;font-size:13px;line-height:1.55;color:var(--grey)}
.cmpr-src li{padding:6px 0;border-top:1px solid var(--line2)}
.cmpr-src li:first-child{border-top:0}
.cmpr-src b{color:var(--ink);font-weight:600}
/* étape Concurrents de la fiche */
.cmpr-fl{font-size:15px;line-height:1.55;margin:0 0 4px}
.cmpr-peers{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 4px}
.cmpr-peers a{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);border-radius:99px;padding:3px 11px 3px 4px;font-size:13px;background:#fff}
.cmpr-peers a:hover{border-color:var(--ink)}
.cmpr-peers a.me{background:var(--ink);color:#fff;border-color:var(--ink)}
.cmpr-peers .lg{border-radius:50%}
.cmpr-pos{list-style:none;margin:8px 0 0;padding:0}
.cmpr-pos li{display:grid;grid-template-columns:190px minmax(0,1fr);gap:6px 20px;padding:13px 0;border-top:1px solid var(--line2);align-items:center}
.cmpr-posh{display:flex;flex-direction:column;gap:3px}
.cmpr-posh b{font-weight:600;display:flex;align-items:center;gap:8px}
.cmpr-posh b svg{width:16px;height:16px;flex:none;stroke:var(--ink);fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.cmpr-posh small{color:var(--light);font-size:12px}
.cmpr-rkc{align-self:flex-start;font-family:var(--mono);font-size:11.5px;border:1px solid var(--line);border-radius:99px;padding:1px 9px;white-space:nowrap}
.cmpr-rkc.first{background:var(--lime);border-color:var(--lime);font-weight:600}
.cmpr-dots{position:relative;height:26px;margin:0 9px}
.cmpr-dots .trk{position:absolute;left:-9px;right:-9px;top:11px;height:4px;background:#EFEAE0;border-radius:2px}
.cmpr-dots .cmpr-med{top:3px;height:20px}
.cmpr-dot{position:absolute;top:7px;width:12px;height:12px;border-radius:50%;background:#fff;border:2px solid #8A857D;transform:translateX(-50%);outline:none}
.cmpr-dot.me{top:3px;width:20px;height:20px;border:3px solid #fff;box-shadow:0 0 0 1px rgba(17,18,20,.25),0 1px 4px rgba(17,18,20,.2);z-index:2}
.cmpr-dot:focus-visible{box-shadow:0 0 0 2px var(--ink)}
.cmpr-dotl{display:flex;justify-content:space-between;gap:8px;font-size:11.5px;color:var(--light);margin:2px 0 0}
.cmpr-pos p{grid-column:2;margin:0;font-size:14px;line-height:1.5}
.cmpr-pos p.muted{font-size:13.5px}
.cmpr-fact{display:flex;gap:10px 18px;flex-wrap:wrap;align-items:center;margin-top:14px}
@media (max-width:900px){.cmpr-thb{grid-template-columns:1fr}.cmpr-exp{border-top:1px dashed var(--line2);padding-top:10px}}
@media (max-width:760px){
  .cmpr-sel{grid-template-columns:1fr}
  .cmpr-card:not(.cmpr-add):not(.cmpr-lim){padding:9px 40px 9px 9px}.cmpr-card .lg{--s:34px!important}.cmpr-card b{font-size:14.5px}
  .cmpr-card .pills{margin:0 0 0 6px;vertical-align:-1px}
  .cmpr-lim{border:0;padding:2px 2px 0;background:none;font-size:13px}.cmpr-lim b{font-size:13px!important}
  .cmpr-vl li{grid-template-columns:1fr;gap:3px}
  .cmpr-vl p{font-size:14.5px}
  .cmpr-ia,.cmpr-th,.cmpr-legend{padding-left:16px;padding-right:16px}
  .cmpr-iaout{padding:0 16px 14px}
  .cmpr-row{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"co val" "bar bar";gap:6px 10px;padding:8px}
  .cmpr-row .cmpr-co{grid-area:co}.cmpr-row .cmpr-val{grid-area:val}.cmpr-row .cmpr-bar{grid-area:bar}
  .cmpr-val small{max-width:46vw;margin-left:auto}
  .cmpr-axis{margin:2px 8px 0}
  .cmpr-win{margin-left:0}
  .cmpr-t thead{display:none}
  .cmpr-t,.cmpr-t tbody,.cmpr-t tr,.cmpr-t th,.cmpr-t td{display:block}
  .cmpr-t{background:none}
  .cmpr-t tr{background:#fff;border:1px solid var(--line2);border-radius:10px;margin:0 0 8px;padding:2px 12px}
  .cmpr-t tbody th{padding:9px 0 7px;border-bottom:1px solid var(--line2)}
  .cmpr-t td{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding:8px 0}
  .cmpr-t td::before{content:attr(data-l);color:var(--grey);font-size:12.5px;line-height:1.35;flex:1;min-width:0}
  .cmpr-t td > div{text-align:right;flex:none;max-width:60%}
  .cmpr-t tr > :last-child{border-bottom:0}
  .cmpr-rk{align-items:flex-end}.cmpr-rk .pl{width:90px}
  .cmpr-all thead{display:none}
  .cmpr-all,.cmpr-all tbody,.cmpr-all tr,.cmpr-all th,.cmpr-all td{display:block}
  .cmpr-all tr{border-bottom:1px solid var(--line2);padding:4px 0 8px}
  .cmpr-all tr.grp{border:0;padding:0}
  .cmpr-all tbody th{border:0;padding:10px 0 4px;display:flex;align-items:center;gap:6px;font-size:13px;color:var(--grey);font-weight:600}.cmpr-all tbody th .prov-i{flex:none;align-self:center;width:18px!important;height:18px!important}
  .cmpr-all tr:not(.grp){background:#fff;border:1px solid var(--line2);border-radius:10px;margin:0 0 8px;padding:2px 12px 6px}
  .cmpr-all tr.grp th{padding:8px 10px;border-radius:8px}
  .cmpr-all td{display:flex;justify-content:space-between;gap:12px;border:0;padding:4px 0}
  .cmpr-all td::before{content:attr(data-co);font-weight:600;color:var(--ink);font-size:14px;flex:1;min-width:0}
  .cmpr-all td > div{text-align:right;max-width:62%}
  .cmpr-all .hl{background:none}
  .cmpr-pos li{grid-template-columns:1fr;gap:8px}
  .cmpr-posh{flex-direction:row;flex-wrap:wrap;align-items:baseline;gap:4px 10px}
  .cmpr-posh .cmpr-rkc{margin-left:auto}
  .cmpr-pos p{grid-column:1}
}
</style>`);

/* ---------- Petits outils ---------- */
const CMPR_ICON = {
  taille: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M6 21V11M11 21V5M16 21v-7M20 21V9"/></svg>',
  croissance: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
  rentabilite: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="7" r="2.6"/><circle cx="17" cy="17" r="2.6"/><path d="M19 5L5 19"/></svg>',
  solidite: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 4.8-3.4 8-8 9-4.6-1-8-4.2-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
  prix: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.4"/></svg>',
  dividende: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="6" rx="7" ry="2.8"/><path d="M5 6v6c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8V6"/><path d="M5 12v6c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8v-6"/></svg>',
  lien: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
};
const CMPR_LV = { fort: "Point fort", moyen: "Dans la moyenne", vig: "Point de vigilance" };
const CMPR_COL = { fort: "var(--g)", moyen: "var(--n)", vig: "var(--o)" };
const CMPR_PRESETS = [
  [["lvmh", "hermes", "kering"], "Le luxe français", "Trois maisons, trois modèles : marge, croissance et prix en Bourse très différents."],
  [["apple", "microsoft", "alphabet"], "Les géants de la tech", "Les plus grandes valeurs en Bourse du monde, côte à côte."],
  [["bnp-paribas", "societe-generale", "credit-agricole"], "Les banques françaises", "Pour une banque, la rentabilité se lit sur les capitaux propres."],
  [["totalenergies", "shell", "bp"], "Les pétrolières", "Un secteur cyclique : les bénéfices suivent le prix du pétrole."],
  [["airbus", "boeing", "safran"], "L'aéronautique", "Avionneurs et motoriste : marges, dette et carnets de commandes."],
  [["nvidia", "amd", "intel"], "Les fabricants de puces", "Une croissance et des prix en Bourse qui n'ont rien à voir."],
];
const cmprAn = x => F1.format(x).replace(/,0$/, "") + (Math.abs(x) >= 2 ? " ans" : " an");
const cmprP = (x, d) => pct(x, d == null ? (Math.abs(x) >= 0.1 ? 0 : 1) : d, false); // pourcentage court pour les phrases
const cmprB = n => `<b>${esc(n)}</b>`;
const cmprTxt = h => String(h).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const CMPR_MED = {};
function cmprMedCA(sector) { // médiane des ventes du secteur, en millions d'euros
  if (!(sector in CMPR_MED)) CMPR_MED[sector] = median(R.companies.filter(c => c.sector === sector && !c.missing && c.ca > 0).map(c => eurM(c.ca, c.currency)));
  return CMPR_MED[sector];
}
function cmprFull(ids) { // comptes complets (plusieurs années, sources) : chargés à part, gardés dans FULL
  return Promise.all(ids.map(id => { const c = RBY[id]; if (!c || c.missing) return null; if (FULL[id]) return FULL[id];
    return fetch(`/data/societes/${id}.json`).then(r => r.ok ? r.json() : null).then(j => j ? (FULL[id] = j) : null).catch(() => null); }));
}

/* ---------- Les chiffres d'une entreprise, prêts à comparer ---------- */
function cmprFig(c) {
  const ok = !c.missing && (c.ca != null || c.net != null), bank = isBank(c), v = valo(c), items = {};
  if (ok) lecture(c, { ...c, cagr: null }).forEach(i => { items[i.term] = i; });
  const med = MED[c.sector] || {};
  return { c, ok, bank, v, items, m: ok ? ratios(c) : {}, cur: c.currency || "EUR", med: med.n >= 3 ? med : {}, caE: ok && c.ca > 0 ? eurM(c.ca, c.currency) : null, netE: ok && c.net != null ? eurM(c.net, c.currency) : null, full: FULL[c.id] || null, t: ok ? quick(c) : null };
}
function cmprCtx(cos) {
  const F = cos.map(cmprFig);
  return { F, roe: F.some(x => x.ok && x.bank), sectors: new Set(F.map(x => x.c.sector)) };
}
const cmprLvOf = (F, k) => F.items[k] ? F.items[k].lv : null;
function cmprNa(F, why) { return !F.ok ? (F.c.missing ? missingTxt(F.c).replace("Comptes non disponibles en données ouvertes", "comptes non disponibles") : "comptes incomplets") : why || "non publié"; }

/* ---------- Les six thèmes : un indicateur principal, une phrase, les détails ---------- */
// val(F, X) → { v : valeur pour la barre, txt, lv, word, med, medTxt, key : plus grand = en tête } ou null
const CMPR_T = [
  { k: "taille", t: "Taille", ind: () => "Ventes annuelles, converties en euros", term: "ca", neutral: true, lead: () => "est la plus grande",
    ex: () => "Ce que l'entreprise a vendu en un an. Les montants sont convertis en euros pour être comparables. La taille dit à qui l'on a affaire ; elle ne dit pas si l'entreprise est rentable.",
    rule: () => "La taille n'est ni un point fort ni un point faible : ses barres restent noires.",
    val: F => { if (F.caE == null) return null; const md = cmprMedCA(F.c.sector);
      return { v: F.caE, txt: big(F.caE, "EUR"), word: (F.cur !== "EUR" ? big(F.c.ca, F.cur) + " · " : "") + "exercice " + F.c.year, med: md, medTxt: md != null ? big(md, "EUR") : "" }; },
    say: (r, F) => `${r.txt} de ${F.bank ? "revenus" : "ventes"}`, na: F => cmprNa(F) },
  { k: "croissance", t: "Croissance", ind: () => "Évolution des ventes sur un an", term: "croissance", lead: r => r.v >= 0 ? "progresse le plus vite" : "recule le moins",
    ex: () => "L'évolution des ventes entre les deux derniers exercices. Une entreprise qui grandit vend plus chaque année ; une seule année peut tromper (rachat d'une autre entreprise, effet des taux de change).",
    rule: () => RULES.croissance, hi: 150, lo: -60,
    val: F => { const g = F.m.g1; if (g == null) return null; const md = F.med.g1;
      return { v: g * 100, txt: pct(g), lv: cmprLvOf(F, "croissance"), med: md != null ? md * 100 : null, medTxt: md != null ? pct(md) : "" }; },
    say: (r, F) => `${r.txt} de ${F.bank ? "revenus" : "ventes"} sur un an`, na: F => cmprNa(F) },
  { k: "rentabilite", t: "Rentabilité", ind: X => X.roe ? "Rentabilité des capitaux propres" : "Marge d'exploitation", term: X => X.roe ? "roe" : "marge", lead: () => "est la plus rentable",
    ex: X => X.roe ? "Ce que l'entreprise gagne en un an pour 100 € qui appartiennent à ses actionnaires. C'est le repère qui s'applique aussi aux banques et aux assureurs, dont la marge ne se calcule pas comme ailleurs." : "Sur 100 € de ventes, ce qu'il reste une fois payés les salaires, les achats et les frais. Plus la marge est haute, plus l'entreprise garde d'argent sur chaque vente.",
    rule: X => X.roe ? RULES.roe : RULES.marge, hi: 120, lo: -60,
    val: (F, X) => { const x = X.roe ? F.m.roe : F.bank ? null : F.m.marge; if (x == null) return null; const md = X.roe ? F.med.roe : F.med.marge;
      return { v: x * 100, raw: x, txt: pct(x, 1, false), lv: cmprLvOf(F, X.roe ? "roe" : "marge"), med: md != null ? md * 100 : null, medTxt: md != null ? pct(md, 1, false) : "" }; },
    say: (r, F, X) => `${cmprP(r.raw)} de ${X.roe ? "rentabilité des capitaux propres" : "marge"}`, short: r => cmprP(r.raw),
    na: (F, X) => F.bank && !X.roe ? "ne s'applique pas à une banque" : F.ok && F.c.equity != null && F.c.equity <= 0 ? "capitaux propres négatifs" : cmprNa(F) },
  { k: "solidite", t: "Solidité financière", ind: () => "Dette nette, en années de résultat", term: "lev", lead: r => r.cash ? "est la plus solide" : "est la moins endettée",
    ex: () => "Le nombre d'années de résultat d'exploitation (avant amortissements) qu'il faudrait pour rembourser la dette nette. Moins il en faut, plus l'entreprise est solide. À gauche du zéro : elle a plus de trésorerie que de dettes.",
    rule: () => RULES.lev, lo: -3, hi: 8,
    val: F => { if (!F.ok || F.bank) return null; const c = F.c, m = F.m, md = F.med.lev, mm = { med: md != null ? md : null, medTxt: md != null ? cmprAn(md) : "" };
      if (c.netDebt != null && c.netDebt < 0) return { v: m.lev != null ? m.lev : -1, cash: true, txt: "Pas de dette nette", lv: "fort", word: `${big(-c.netDebt, F.cur)} de trésorerie en plus`, key: 100 + (c.ca > 0 ? -c.netDebt / c.ca : 0), ...mm };
      if (m.lev != null) return { v: m.lev, txt: cmprAn(m.lev), lv: cmprLvOf(F, "lev"), key: -m.lev, ...mm };
      if (m.gear != null) return { v: null, txt: pct(m.gear, 0, false), lv: cmprLvOf(F, "gear"), word: "de ses capitaux propres", key: -20 - m.gear, gear: true };
      return null; },
    say: r => r.cash ? "plus de trésorerie que de dettes" : r.gear ? `une dette nette égale à ${r.txt} de ses capitaux propres` : `${r.txt} de résultat suffirai${r.v >= 2 ? "en" : ""}t à rembourser sa dette`,
    short: r => r.cash ? "aucune dette nette" : r.txt,
    na: F => F.ok && F.bank ? "ne s'applique pas à une banque" : cmprNa(F) },
  { k: "prix", t: "Prix en Bourse", ind: () => "Prix rapporté au bénéfice (PER)", term: "per", lead: () => "est la moins chère",
    ex: () => "Le PER : combien d'années de bénéfice coûte l'entreprise en Bourse. Plus il est bas, moins l'action est chère au regard de ce que l'entreprise gagne aujourd'hui. Moins cher ne veut pas dire « bonne affaire » : un prix élevé traduit souvent des attentes de croissance.",
    rule: () => "Vert : nettement moins cher que la médiane de son secteur ; orange : nettement plus cher. " + RULES.per, hi: 120,
    val: F => { const v = F.v; if (!v || !v.pe) return null; const md = MEDPE[F.c.sector] || null;
      const lv = md ? (v.pe < md * 0.75 ? "fort" : v.pe > md * 1.3 ? "vig" : "moyen") : null;
      return { v: v.pe, txt: F0.format(v.pe) + " fois", lv, word: lv ? { fort: "Moins cher que son secteur", moyen: "Proche de son secteur", vig: "Plus cher que son secteur" }[lv] : "", med: md, medTxt: md ? F0.format(md) + " fois" : "", key: -v.pe }; },
    say: r => `${r.txt} ses bénéfices annuels`,
    na: F => !F.v ? (PXUP && PXUP !== "none" ? "cours indisponible" : "chargement du cours") : F.ok && F.c.net != null && F.c.net <= 0 ? "en perte : ne se calcule pas" : cmprNa(F, "non calculable") },
  { k: "dividende", t: "Dividende", ind: () => "Rendement : dividende annuel ÷ prix de l'action", term: "rdt", neutral: true, lead: r => r.v > 0 ? "a le rendement le plus élevé" : "",
    ex: () => "Ce que l'action rapporte chaque année en dividende, par rapport à son prix : 3 % correspondent à environ 30 € par an pour 1 000 € d'actions, avant impôts. Un rendement très élevé vient parfois d'un cours en forte baisse.",
    rule: () => "La barre montre le rendement. La couleur du texte dit si le dividende est couvert par le bénéfice. " + RULES.payout, hi: 14,
    val: F => { const c = F.c, v = F.v, m = F.m; if (!F.ok) return null;
      const md = medInd(c.sector, "rendement"), mm = { med: md, medTxt: md != null ? pct(md / 100, 1, false) : "" };
      if (c.divPaid != null && c.divPaid < 0.5 && !(c.dps > 0)) return { v: 0, txt: "Aucun", word: "pas de dividende versé", key: 0, ...mm };
      if (!v || v.yld == null) return null;
      const it = F.items.payout, lv = it && it.lv !== "na" ? it.lv : null;
      return { v: v.yld * 100, txt: pct(v.yld, 1, false), lv, word: m.payout != null && c.net > 0 ? `${pct(m.payout, 0, false)} du bénéfice versé` : lv === "vig" ? "versé malgré une perte" : "", key: v.yld, ...mm }; },
    say: r => r.v > 0 ? `${r.txt} par an au cours actuel` : "aucun dividende", short: r => r.v > 0 ? r.txt : "aucun dividende",
    na: F => F.ok && !F.v ? (PXUP && PXUP !== "none" ? "cours indisponible" : "chargement du cours") : cmprNa(F) },
];
const CMPR_AXE = { croissance: ["Croissance"], rentabilite: ["Marge", "Rentabilité"], solidite: ["Solidité"], prix: ["Prix"], dividende: ["Dividende"] };

/* Les lignes de détail de chaque thème : [libellé, terme du lexique, cellule(F, X) → { txt, lv, sub } | null] */
function cmprMedSub(v, fm) { return v != null && isFinite(v) ? `secteur : ${fm(v)}` : ""; }
function cmprAxis(F, names) {
  const a = profilAxes(F.c).find(x => names.includes(x[0])); if (!a) return null; const r = a[1];
  return { html: `<div class="cmpr-rk"><span class="pl"><i class="pm"></i><i class="pd" style="left:${(r.p * 100).toFixed(1)}%;background:${axCol(r.p)}"></i></span><small>${esc(axWord(r.p))} · ${r.rank}e sur ${r.n}</small></div>` };
}
function cmprCagr(F) {
  const c = F.full; if (!c || !c.fin || !c.fin.ca) return null;
  const L = c.years.length - 1, a = c.fin.ca[0], b = c.fin.ca[L]; if (!(L >= 2 && a > 0 && b > 0)) return null;
  const g = Math.pow(b / a, 1 / L) - 1; return { txt: pct(g), sub: `par an depuis ${c.years[0]}`, lv: g >= 0.05 ? "fort" : g >= 0 ? "moyen" : "vig" };
}
function cmprRange(F) {
  const p = F.v && F.v.p; if (!p || !(p.h52 > p.l52)) return null;
  const pos = Math.min(1, Math.max(0, (p.p - p.l52) / (p.h52 - p.l52)));
  return { txt: pos > 0.85 ? "Près du plus haut" : pos < 0.15 ? "Près du plus bas" : `À ${F0.format(pos * 100)} %`, sub: `entre ${pxFmt(p.l52, p.cur)} et ${pxFmt(p.h52, p.cur)}`, plain: true };
}
const CMPR_D = {
  taille: [
    ["Ventes en euros", "ca", F => F.caE == null ? null : { txt: big(F.caE, "EUR"), sub: F.cur !== "EUR" ? `${big(F.c.ca, F.cur)} d'origine` : (F.bank ? "revenus" : "") }],
    ["Bénéfice net en euros", "net", F => F.netE == null ? null : { txt: big(F.netE, "EUR"), lv: cmprLvOf(F, "net") }],
    ["Valeur en Bourse", "cap", F => F.v && F.v.capE ? { txt: capFmt(F.v.capE), sub: "au cours actuel" } : null, true],
    ["Exercice", null, F => F.ok ? { txt: String(F.c.year), sub: F.full && F.full.fyEnd ? `clos le ${F.full.fyEnd.split("-").reverse().join("/")}` : "" } : null],
  ],
  croissance: [
    ["Croissance des ventes sur un an", "croissance", F => F.m.g1 == null ? null : { txt: pct(F.m.g1), lv: cmprLvOf(F, "croissance"), sub: cmprMedSub(F.med.g1, x => pct(x)) }],
    ["Croissance moyenne des ventes", "croissance", F => cmprCagr(F)],
    ["Évolution du bénéfice net", "net", F => F.m.ng == null ? (F.ok && F.c.net < 0 ? { txt: "Perte", lv: "vig" } : null) : { txt: pct(F.m.ng), lv: cmprLvOf(F, "net"), sub: "sur un an" }],
    ["Place dans son secteur", "mediane", F => cmprAxis(F, CMPR_AXE.croissance)],
  ],
  rentabilite: [
    ["Marge d'exploitation", "marge", F => F.ok && F.bank ? { txt: "–", sub: "ne s'applique pas", plain: true } : F.m.marge == null ? null : { txt: pct(F.m.marge, 1, false), lv: cmprLvOf(F, "marge"), sub: cmprMedSub(F.med.marge, x => pct(x, 1, false)) }],
    ["Marge nette", "net", F => F.m.nm == null ? null : { txt: pct(F.m.nm, 1, false), sub: cmprMedSub(F.med.nm, x => pct(x, 1, false)) }],
    ["Rentabilité des capitaux propres", "roe", F => F.m.roe == null ? (F.ok && F.c.equity != null && F.c.equity <= 0 ? { txt: "–", sub: "capitaux propres négatifs", plain: true } : null) : { txt: pct(F.m.roe, 1, false), lv: cmprLvOf(F, "roe"), sub: cmprMedSub(F.med.roe, x => pct(x, 1, false)) }],
    ["Bénéfice net", "net", F => !F.ok || F.c.net == null ? null : { txt: big(F.c.net, F.cur), lv: cmprLvOf(F, "net"), sub: F.cur !== "EUR" && F.netE != null ? `${big(F.netE, "EUR")} en euros` : `exercice ${F.c.year}` }],
    ["Rentabilité des capitaux employés (ROCE)", "roce", F => { if (F.ok && F.bank) return { txt: "–", sub: "ne s'applique pas", plain: true }; const x = typeof provRoce === "function" ? provRoce(F.c) : null; if (x == null) return null;
      const md = medInd(F.c.sector, "roce"); return { txt: pct(x, 1, false), sub: cmprMedSub(md, v => pct(v / 100, 1, false)) || "avant impôt", plain: true }; }],
    ["Place dans son secteur", "mediane", (F, X) => cmprAxis(F, X.roe ? ["Rentabilité", "Marge"] : CMPR_AXE.rentabilite)],
  ],
  solidite: [
    ["Dette nette", "dettenette", F => !F.ok ? null : F.bank ? { txt: "–", sub: "ne s'applique pas", plain: true } : F.c.netDebt == null ? null : F.c.netDebt < 0 ? { txt: "Aucune", lv: "fort", sub: `${big(-F.c.netDebt, F.cur)} de trésorerie en plus` } : { txt: big(F.c.netDebt, F.cur), sub: F.cur !== "EUR" ? `${big(eurM(F.c.netDebt, F.cur), "EUR")} en euros` : "" }],
    ["Dette ÷ EBITDA", "lev", F => F.ok && F.bank ? { txt: "–", sub: "ne s'applique pas", plain: true } : !F.ok || F.m.lev == null || F.c.netDebt < 0 ? null : { txt: cmprAn(F.m.lev), lv: cmprLvOf(F, "lev"), sub: cmprMedSub(F.med.lev, cmprAn) }],
    ["Dette ÷ capitaux propres", "gear", F => F.ok && F.bank ? { txt: "–", sub: "ne s'applique pas", plain: true } : !F.ok || F.m.gear == null || F.c.netDebt < 0 ? null : { txt: pct(F.m.gear, 0, false), lv: cmprLvOf(F, "gear"), sub: cmprMedSub(F.med.gear, x => pct(x, 0, false)) }],
    ["Trésorerie disponible", "fcf", F => !F.ok ? null : F.bank ? { txt: "–", sub: "ne s'applique pas", plain: true } : F.c.fcf == null ? null : { txt: big(F.c.fcf, F.cur), lv: cmprLvOf(F, "fcf"), sub: F.m.conv != null ? `${F0.format(F.m.conv * 100)} € pour 100 € de bénéfice` : "" }],
    ["Place dans son secteur", "mediane", F => cmprAxis(F, CMPR_AXE.solidite)],
  ],
  prix: [
    ["PER", "per", F => { const r = CMPR_T[4].val(F); return r ? { txt: r.txt, lv: r.lv, word: r.word, sub: cmprMedSub(r.med, x => F0.format(x) + " fois") } : null; }, true],
    ["Valeur d'entreprise ÷ EBITDA", "evebitda", F => { if (F.ok && F.bank) return { txt: "–", sub: "ne s'applique pas", plain: true }; const x = typeof provEvEbitda === "function" ? provEvEbitda(F.c) : null; if (x == null) return null;
      const md = medInd(F.c.sector, "ev_ebitda"); return { txt: F1.format(x) + " fois", sub: cmprMedSub(md, v => F1.format(v) + " fois") || "dettes comprises", plain: true }; }, true],
    ["Valeur en Bourse", "cap", F => F.v && F.v.capE ? { txt: capFmt(F.v.capE), sub: "capitalisation, en euros" } : null, true],
    ["Cours de l'action", "cours", F => F.v ? { txt: pxFmt(F.v.p.p, F.v.p.cur), sub: F.v.p.chg != null ? `${F.v.p.chg > 0 ? "+" : ""}${F2.format(F.v.p.chg)} % aujourd'hui` : "", plain: true } : null, true],
    ["Sur un an", null, F => cmprRange(F), true],
    ["Place dans son secteur", "mediane", F => cmprAxis(F, CMPR_AXE.prix)],
  ],
  dividende: [
    ["Rendement", "rdt", F => F.v && F.v.yld != null ? { txt: pct(F.v.yld, 1, false), sub: cmprMedSub(medInd(F.c.sector, "rendement"), x => pct(x / 100, 1, false)), plain: true } : null, true],
    ["Part du bénéfice versée", "payout", F => { const it = F.items.payout; return it ? { txt: String(it.value), lv: it.lv !== "na" ? it.lv : null, sub: it.lv === "na" ? "pas de dividende" : cmprMedSub(F.med.payout, x => pct(x, 0, false)) } : null; }],
    ["Dividende par action", "dps", F => F.ok && F.c.dps > 0 ? { txt: eur(F.c.dps, 2, F.cur), sub: `versé pendant l'exercice ${F.c.year}${typeof donDps === "function" && donDps(F.c).estime ? ", estimé" : ""}`, plain: true } : null],
    ["Total versé aux actionnaires", "divverses", F => F.ok && F.c.divPaid != null ? { txt: F.c.divPaid < 0.5 ? "Aucun" : big(F.c.divPaid, F.cur), plain: true } : null],
    ["Place dans son secteur", "mediane", F => cmprAxis(F, CMPR_AXE.dividende)],
  ],
};
function cmprCell(x, F, label) {
  if (!x) return `<div><b class="na">–</b><small>${esc(label === "Place dans son secteur" ? (F.ok ? "pas assez de chiffres" : "comptes non disponibles") : F.ok || label === undefined ? "non publié" : "comptes non disponibles")}</small></div>`;
  if (x.html) return x.html;
  const lv = x.lv && CMPR_LV[x.lv] ? x.lv : null;
  return `<div>${lv ? `<span class="dot dot-${lv}"></span>` : ""}<b>${esc(x.txt)}</b>${lv ? `<small class="vd vd-${lv}">${esc(x.word || CMPR_LV[lv])}</small>` : ""}${x.sub ? `<small>${esc(x.sub)}</small>` : ""}</div>`;
}

/* ---------- Classement et phrases ---------- */
function cmprRows(T, X) {
  const rows = X.F.map(F => ({ F, r: T.val(F, X) })), ok = rows.filter(x => x.r && !x.r.gear); // dette en % des capitaux propres : affichée, mais pas classée avec les années de résultat
  ok.forEach(x => { if (x.r.key == null) x.r.key = x.r.v; });
  const sorted = ok.slice().sort((a, b) => b.r.key - a.r.key);
  return { rows, ok, sorted, best: sorted.length >= 2 && sorted[0].r.key !== sorted[1].r.key ? sorted[0] : null };
}
function cmprSentence(T, X, S) {
  const s = S.sorted; if (s.length < 2) return null;
  const w = s[0], l = s.at(-1), W = cmprB(w.F.c.name), L = esc(l.F.c.name), short = r => T.short ? T.short(r) : r.txt;
  if (T.k === "solidite") {
    const cash = s.filter(x => x.r.cash);
    if (cash.length === s.length) return `${listFr(cash.map(x => cmprB(x.F.c.name)))} ont toutes plus de trésorerie que de dettes.`;
    if (cash.length > 1) return `${listFr(cash.map(x => cmprB(x.F.c.name)))} ont plus de trésorerie que de dettes. ${L} est la plus endettée : ${T.say(l.r)}.`;
    if (cash.length === 1) return `${W} est la plus solide : plus de trésorerie que de dettes. ${L} est la plus endettée : ${T.say(l.r)}.`;
    return `${W} est la moins endettée : ${T.say(w.r)}, contre ${short(l.r)} pour ${L}.`;
  }
  if (T.k === "dividende" && !(w.r.v > 0)) return "Aucune ne verse de dividende sur son dernier exercice.";
  if (w.r.key === l.r.key) return `${listFr(s.map(x => cmprB(x.F.c.name)))} sont au même niveau : ${short(w.r)}.`;
  const lead = T.lead(w.r) || "est en tête";
  return `${W} ${lead} : ${T.say(w.r, w.F, X)}, contre ${short(l.r)} pour ${L}.`;
}
function cmprVerdict(X) {
  const lines = CMPR_T.map(T => { const S = cmprRows(T, X), html = cmprSentence(T, X, S); return { T, S, html, txt: html ? cmprTxt(html) : "" }; });
  const tt = X.F.filter(F => F.t).sort((a, b) => (b.t.fort - b.t.vig) - (a.t.fort - a.t.vig) || b.t.fort - a.t.fort);
  let lead = "";
  if (tt.length >= 2) {
    const a = tt[0], z = tt.slice().sort((p, q) => q.t.vig - p.t.vig || p.t.fort - q.t.fort)[0], tot = t => t.fort + t.moyen + t.vig;
    lead = `D'après les derniers comptes publiés, ${cmprB(a.c.name)} cumule le plus de points forts (${a.t.fort} sur ${tot(a.t)} repères)`;
    lead += z !== a && z.t.vig ? `, ${cmprB(z.c.name)} le plus de points de vigilance (${z.t.vig}).` : z.t.vig ? `, mais aussi le plus de points de vigilance (${z.t.vig}).` : ", et aucune ne présente de point de vigilance.";
  }
  return { lines, lead };
}
function cmprNotes(X) {
  const F = X.F, out = [], ok = F.filter(x => x.ok);
  const yrs = new Set(ok.map(x => x.c.year));
  if (yrs.size > 1) out.push(`Exercices différents : ${ok.map(x => `${esc(x.c.name)} ${x.c.year}`).join(", ")}. Les derniers comptes publiés ne portent pas sur la même année.`);
  const fx = [...new Set(ok.filter(x => x.cur !== "EUR").map(x => x.cur))];
  if (fx.length) out.push(`Montants convertis en euros aux taux de référence de la BCE (${fx.map(c => CUR[c] ? `${c}, ${CUR[c]}` : c).join(" ; ")}) ; le montant d'origine reste indiqué. Les pourcentages se comparent directement.`);
  const banks = ok.filter(x => x.bank);
  if (banks.length && banks.length < ok.length) out.push(`${listFr(banks.map(x => esc(x.c.name)))} ${banks.length > 1 ? "sont des banques ou des assureurs" : "est une banque ou un assureur"} : la marge et la dette ne s'y lisent pas comme ailleurs. La rentabilité est donc mesurée sur les capitaux propres pour toutes.`);
  const miss = F.filter(x => !x.ok);
  if (miss.length) out.push(`${listFr(miss.map(x => esc(x.c.name)))} : ${missingTxt(miss[0].c).toLowerCase()}${miss.length > 1 ? " pour certaines" : ""}. ${miss.length > 1 ? "Elles n'apparaissent" : "Elle n'apparaît"} que pour la valeur en Bourse et le cours.`);
  if (X.sectors.size > 1) out.push(`Secteurs différents (${[...X.sectors].map(k => esc(R.sectors[k] || k).toLowerCase()).join(", ")}) : chaque chiffre est comparé à la médiane de son propre secteur.`);
  return out;
}

/* ---------- Barres sur une même échelle, avec la médiane du secteur ---------- */
function cmprScale(T, S) {
  const vals = S.ok.flatMap(x => [x.r.v, x.r.med]).filter(okn);
  if (!vals.length) return null;
  let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
  if (T.lo != null) lo = Math.max(lo, T.lo); if (T.hi != null) hi = Math.min(hi, T.hi);
  if (hi - lo < 1e-9) hi = lo + 1;
  return v => (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * 100;
}
function cmprBar(T, x, pos) {
  const r = x.r, c = x.F.c;
  if (!r || r.v == null || !pos) return `<span class="cmpr-trk cmpr-none"></span>`;
  const z = pos(0), p = pos(r.v), a = Math.min(z, p), w = Math.abs(p - z);
  const col = T.neutral || !r.lv ? "var(--ink)" : CMPR_COL[r.lv];
  return `<span class="cmpr-trk">${z > 0.5 && z < 99.5 ? `<i class="cmpr-zero" style="left:${z.toFixed(2)}%"></i>` : ""}<i class="cmpr-fill" style="left:${a.toFixed(2)}%;width:${w.toFixed(2)}%;background:${col}"></i>${r.med != null ? `<i class="cmpr-med" style="left:${pos(r.med).toFixed(2)}%"></i>` : ""}</span>`;
}
/* La jauge « face à sa médiane » (29/10/2026, présentation voulue par Romain) : chaque entreprise est placée selon son rang parmi
   les entreprises de SON secteur suivies par le site ; la médiane est au milieu, à droite les mieux placées. Les barres détaillées
   restent dessous, pour les valeurs. Taille et dividende : rang seulement, sans couleur. */
const CMPR_JG = { taille: ["ca", false, true], croissance: ["g1", false, false], rentabilite: [null, false, false], solidite: ["lev", true, false], prix: ["pe", true, false], dividende: ["yld", false, true] };
function cmprJaugeHTML(T, X, S) {
  const spec = CMPR_JG[T.k]; if (!spec || typeof rfPosition !== "function") return "";
  const dots = S.rows.map(x => {
    const F = x.F, c = F.c, r = x.r; if (!r || !F.ok) return null;
    let key = spec[0], inv = spec[1], val;
    if (T.k === "rentabilite") { key = X.roe ? "roe" : "marge"; val = r.raw; }
    else if (T.k === "taille") val = F.caE;
    else if (T.k === "croissance") val = r.v / 100;
    else if (T.k === "solidite") val = r.cash ? -1 : r.gear ? null : r.v;
    else if (T.k === "prix") val = r.v;
    else if (T.k === "dividende") val = (valo(c) || {}).yld;
    const P = rfPosition(c, key, inv, val); if (!P) return null;
    const lv = spec[2] || T.neutral || !r.lv ? "n" : r.lv;
    return { c, pos: P.pos, n: P.n, lv, txt: r.txt };
  }).filter(Boolean);
  if (dots.length < 2) return "";
  // deux points trop proches : léger décalage vertical pour rester lisibles
  const sorted = dots.slice().sort((a, b) => a.pos - b.pos); sorted.forEach((d, i) => { d.row = 0; for (let j = 0; j < i; j++) if (Math.abs(sorted[j].pos - d.pos) < 0.06 && sorted[j].row === d.row) d.row++; });
  const H = 34 + 30 * Math.max(...dots.map(d => d.row));
  return `<div class="cmpr-jg" style="--h:${H}px"><div class="cmpr-jgl"><span>sous la médiane de son secteur</span><span>médiane</span><span>au-dessus</span></div>
    <div class="cmpr-jgb${spec[2] ? " cmpr-jgn" : ""}"><em></em>${dots.map(d => `<a class="cmpr-dot lv-${d.lv}" style="left:${(d.pos * 100).toFixed(1)}%;top:${d.row * 30}px" href="/entreprise/${d.c.id}" title="${esc(d.c.name)} : ${esc(d.txt)} · ${spec[1] ? "mieux placée" : "au-dessus"} de ${Math.round(d.pos * 100)} % des ${d.n} entreprises de son secteur">${logo(d.c, 20)}</a>`).join("")}</div></div>`;
}
function cmprThemeHTML(T, X, S) {
  const pos = cmprScale(T, S), ind = T.ind(X), term = typeof T.term === "function" ? T.term(X) : T.term;
  const na = S.rows.filter(x => !x.r);
  const rows = S.rows.map(x => {
    const r = x.r, c = x.F.c, win = S.best && S.best === x;
    const word = r ? (r.word != null && r.word !== "" ? r.word : r.lv ? CMPR_LV[r.lv] : "") : "";
    const sub = r ? [word, r.medTxt ? `secteur : ${r.medTxt}` : ""].filter(Boolean) : [];
    const tip = r ? tipAttr({ h: c.name, r: [[ind, r.txt, T.neutral || !r.lv ? INK : CMPR_COL[r.lv].replace("var(--g)", GREENC).replace("var(--o)", ORANGEC).replace("var(--n)", "#B9B2A5")], ...(r.medTxt ? [[`Médiane du secteur ${(R.sectors[c.sector] || "").toLowerCase()}`, r.medTxt, SAND]] : [])], n: word }) : "";
    return `<div class="cmpr-row${win ? " win" : ""}" ${r ? tip + ' tabindex="0"' : ""}>
      <a class="cmpr-co" href="/entreprise/${c.id}">${logo(c, 24)}<span>${esc(c.name)}</span></a>
      <div class="cmpr-bar">${cmprBar(T, x, pos)}</div>
      <div class="cmpr-val">${r ? `<b>${esc(r.txt)}</b>${sub.length ? `<small${r.lv && !T.neutral ? ` class="vd vd-${r.lv}"` : r.lv && T.k === "dividende" ? ` class="vd vd-${r.lv}"` : ""}>${esc(sub[0])}</small>${sub[1] ? `<small>${esc(sub[1])}</small>` : ""}` : ""}` : `<b class="light">–</b><small>${esc(T.na(x.F, X))}</small>`}</div></div>`;
  }).join("");
  const axis = T.k === "solidite" && pos && S.ok.some(x => x.r.v != null && x.r.v < 0) ? `<div class="cmpr-axis"><span>← plus de trésorerie que de dettes</span><span>plus endettée →</span></div>` : "";
  const jauge = cmprJaugeHTML(T, X, S);
  const D = CMPR_D[T.k] || [];
  const det = `<details class="cmpr-det"><summary><span style="white-space:nowrap">Tous les chiffres</span><small>${esc(D.map(d => d[0].toLowerCase()).join(", "))}</small></summary><div>${cmprDetTable(D, X)}<p class="cmpr-tnote">${esc(T.rule(X))}</p></div></details>`;
  return `<section class="cmpr-th" id="cmpr-${T.k}"><div class="cmpr-thh">${CMPR_ICON[T.k]}<h3>${T.t}</h3><span class="cmpr-ind">${term && ALL[term] ? def(term, ind) : esc(ind)}${typeof provBtn === "function" ? provBtn({ taille: "ca", croissance: "g", solidite: "lev", prix: "per", dividende: "rendement" }[T.k] || term, X.F.map(F => "c:" + F.c.id).join(","), ind) : ""}</span>${S.best ? `<span class="cmpr-win">${esc(cmprWinLabel(T, S.best.r))} : ${esc(S.best.F.c.name)}</span>` : ""}</div>
    <div class="cmpr-thb"><div>${jauge}<div class="cmpr-rows${jauge ? " cmpr-rows-j" : ""}">${rows}</div>${axis}</div>
      <div class="cmpr-exp"><p>${esc(T.ex(X))}</p>${S.ok.length < 2 ? `<p class="cmpr-na">${cmprNoCmp(T, X)}</p>` : ""}<p class="cmpr-rule">${esc(T.k === "taille" || T.k === "dividende" ? T.rule(X) : "Couleurs : " + (T.k === "prix" ? "vert, nettement moins cher que la médiane de son secteur ; orange, nettement plus cher." : "vert, point fort ; gris, dans la moyenne ; orange, point de vigilance. Le détail des seuils est dans « Tous les chiffres »."))}</p></div></div>
    ${det}</section>`;
}
function cmprNoCmp(T, X) {
  if (T.k === "solidite" && X.F.some(F => F.ok && F.bank)) return "La dette ne se lit pas de la même façon pour une banque ou un assureur : emprunter et prêter est leur métier. Ce critère ne compare que les autres entreprises, et il en faut au moins deux.";
  return "Pas assez de chiffres publiés pour comparer ce critère.";
}
function cmprWinLabel(T, r) {
  return { taille: "La plus grande", croissance: r.v >= 0 ? "Croissance la plus forte" : "Recul le plus faible", rentabilite: "La plus rentable", solidite: r.cash ? "La plus solide" : "La moins endettée", prix: "La moins chère", dividende: "Rendement le plus élevé" }[T.k] || "En tête";
}
// Provenance (m/provenance.js) : clé du registre des indicateurs pour chaque ligne, quand elle diffère de la notion du lexique
const CMPR_PROV = { "Croissance moyenne des ventes": "cagr", "Évolution du bénéfice net": "ng", "Bénéfice net en euros": "net", "Sur un an": "range52", "Trésorerie disponible": "fcf", "Exercice": null, "Place dans son secteur": null };
function cmprProv(d, X) {
  if (typeof provBtn !== "function") return "";
  const k = d[0] in CMPR_PROV ? CMPR_PROV[d[0]] : d[1]; if (!k) return "";
  return provBtn(k, X.F.map(F => "c:" + F.c.id).join(","), d[0]);
}
function cmprDetTable(D, X) {
  return `<table class="cmpr-t"><thead><tr><th></th>${D.map(d => `<th>${d[1] && ALL[d[1]] ? def(d[1], d[0]) : esc(d[0])}${cmprProv(d, X)}</th>`).join("")}</tr></thead><tbody>
    ${X.F.map(F => `<tr><th scope="row"><a class="cmpr-co" href="/entreprise/${F.c.id}">${logo(F.c, 22)}<span>${esc(F.c.name)}</span></a></th>${D.map(d => `<td data-l="${esc(d[0])}">${cmprCell((F.ok || d[3]) ? d[2](F, X) : null, F, d[0])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
// Tableau récapitulatif : un indicateur par ligne, une entreprise par colonne (en-tête collant ; cartes empilées sur téléphone)
function cmprAllTable(X, hl) {
  const groups = CMPR_T.map(T => [T.t, CMPR_D[T.k]]);
  const head = `<thead><tr><th></th>${X.F.map(F => `<th${F.c.id === hl ? ' class="hl"' : ""}><a class="cmpr-co" href="/entreprise/${F.c.id}">${logo(F.c, 24)}<span>${esc(F.c.name)}</span></a></th>`).join("")}</tr></thead>`;
  const body = groups.map(([t, D]) => `<tr class="grp"><th colspan="${X.F.length + 1}">${esc(t)}</th></tr>` + D.map(d => `<tr><th>${esc(d[0])}${cmprProv(d, X)}</th>${X.F.map(F => `<td data-co="${esc(F.c.name)}"${F.c.id === hl ? ' class="hl"' : ""}>${cmprCell((F.ok || d[3]) ? d[2](F, X) : null, F, d[0])}</td>`).join("")}</tr>`).join("")).join("")
    + `<tr class="grp"><th colspan="${X.F.length + 1}">Bilan des comptes</th></tr><tr><th>Repères de lecture<small>points forts, dans la moyenne, de vigilance</small></th>${X.F.map(F => `<td data-co="${esc(F.c.name)}"${F.c.id === hl ? ' class="hl"' : ""}><div>${F.t ? pills(F.t) : `<small>${esc(missingTxt(F.c))}</small>`}</div></td>`).join("")}</tr>`;
  return `<table class="cmpr-all">${head}<tbody>${body}</tbody></table>`;
}

/* ---------- Sources et dates ---------- */
function cmprSources(X) {
  const items = X.F.map(F => {
    const c = F.c, full = F.full;
    if (!F.ok) return `<li><b>${esc(c.name)}</b> : ${esc(missingTxt(c))}.</li>`;
    const close = full && full.fyEnd ? ` clos le ${full.fyEnd.split("-").reverse().join("/")}` : "";
    let doc = full && full.cik ? `rapport annuel 10-K déposé à la SEC (EDGAR)` : "rapport financier annuel au format ESEF";
    const src = full && full.sources && full.sources[0];
    if (src && src.report) doc = `<a class="lnk" href="${esc(src.report)}" target="_blank" rel="noopener">${doc}</a>`;
    return `<li><b>${esc(c.name)}</b> : exercice ${c.year}${close}, ${doc}${full && full.updated ? `, lu le ${dLabel(full.updated)}` : ""}.</li>`;
  }).join("");
  const pk = typeof provCours === "function" ? provCours(null) : null;
  const px = PXUP && PXUP !== "none" ? `Cours et valeur en Bourse : Google Finance, cours différés, relevés le ${dLabel(String(PXUP).slice(0, 10))}${pk && pk.live && pk.heure ? ` à ${pk.heure}` : ""}${pk && pk.vieux ? ` (pas de nouveau relevé depuis ${pk.jo} jours ouvrés)` : ""}.` : "Cours en cours de chargement.";
  return `<ul class="cmpr-src">${items}<li>${px} Taux de change : BCE. Médianes : entreprises du même secteur suivies par le site (${[...X.sectors].map(k => `${esc((R.sectors[k] || k).toLowerCase())} : ${R.companies.filter(c => c.sector === k && !c.missing).length}`).join(", ")}).</li></ul>`;
}

/* ---------- IA : explication rédigée, à partir des seuls chiffres affichés ---------- */
function cmprFaits(X, focus) {
  const V = cmprVerdict(X);
  return {
    comparaison: focus ? `${focus.name} face à ses concurrentes` : X.F.map(F => F.c.name).join(", "), date_du_jour: TODAY,
    entreprises: X.F.map(F => { const c = F.c, m = F.m, v = F.v, md = F.med;
      return { nom: c.name, secteur: secName(c), pays: regName(c), banque_ou_assurance: F.bank, comptes_disponibles: F.ok, exercice: F.ok ? c.year : null, devise_des_comptes: c.currency || null,
        ventes_milliards_eur: F.caE != null ? Math.round(F.caE / 100) / 10 : null, croissance_ventes_pct: R1(m.g1), marge_exploitation_pct: F.bank ? null : R1(m.marge), marge_nette_pct: R1(m.nm),
        rentabilite_capitaux_propres_pct: R1(m.roe), benefice_net_milliards_eur: F.netE != null ? Math.round(F.netE / 100) / 10 : null,
        dette: !F.ok ? null : F.bank ? "ne s'applique pas (banque ou assurance)" : c.netDebt != null && c.netDebt < 0 ? "plus de trésorerie que de dettes" : m.lev != null ? `${F1.format(m.lev)} années de résultat d'exploitation avant amortissements` : m.gear != null ? `dette nette égale à ${Math.round(m.gear * 100)} % des capitaux propres` : null,
        part_du_benefice_versee_en_dividende_pct: R1(m.payout), per: v && v.pe ? Math.round(v.pe) : null, rendement_dividende_pct: v ? R1(v.yld) : null, capitalisation_milliards_eur: v && v.capE ? Math.round(v.capE / 1e8) / 10 : null,
        reperes_de_lecture: F.t ? `${F.t.fort} points forts, ${F.t.moyen} dans la moyenne, ${F.t.vig} points de vigilance` : null,
        mediane_du_secteur: { croissance_pct: R1(md.g1), marge_pct: R1(md.marge), rentabilite_pct: R1(md.roe), dette_annees: md.lev != null ? Math.round(md.lev * 10) / 10 : null, per: MEDPE[c.sector] ? Math.round(MEDPE[c.sector]) : null } }; }),
    verdict_calcule_par_le_site: V.lines.filter(l => l.txt).map(l => `${l.T.t} : ${l.txt}`),
    remarques: cmprNotes(X).map(cmprTxt),
  };
}
function cmprIAHTML(txt) {
  const H = /^(« ?)?(En résumé|Ce qui les distingue|Ce qui la distingue|Ce qu'il faut regarder ensuite|À regarder ensuite|À surveiller|Points d'attention|Ce que ça veut dire)( ?»)?\s*:?$/i;
  return String(txt).split(/\n+/).map(x => x.trim()).filter(Boolean).map(p => { const q = p.replace(/[*#]/g, "").trim(); return H.test(q) ? `<p class="kick" style="margin:10px 0 2px">${esc(q.replace(/[«»:]/g, "").trim())}</p>` : `<p style="margin:0 0 6px">${esc(q)}</p>`; }).join("");
}
async function cmprAsk(X, focus, out, btn) {
  if (!out) return;
  if (btn) btn.disabled = true;
  out.innerHTML = `<div class="iares"><div class="iathink"><span></span><span></span><span></span> L'IA relit les chiffres de la comparaison…</div></div>`;
  const faits = cmprFaits(X, focus), q = focus ? `Comment ${focus.name} se situe-t-elle face à ses concurrentes ? Expliquez les écarts simplement.` : "Expliquez simplement ce qui distingue ces entreprises, critère par critère, et ce qu'il faut regarder ensuite.";
  const j = await iaRediger("comparaison", faits, { question: q, max: 700 }), txt = j.txt;
  if (!out.isConnected) return;
  out.innerHTML = txt ? `<div class="iares"><p class="kick" style="margin:0 0 4px">✦ L'explication de l'IA</p>${cmprIAHTML(txt)}${miaPied(j)}</div>` : miaRendu(j, "Le verdict calculé ci-dessus reste complet.");
  if (btn) { btn.disabled = false; if (txt) btn.hidden = true; }
}
function cmprIABar(n, focus) {
  return `<div class="cmpr-ia"><button type="button" class="btn" data-cmpr-ia${focus ? ` data-focus="${esc(focus.id)}"` : ""}><span class="s" aria-hidden="true">✦</span>Approfondir avec l'IA</button><p>Une explication rédigée de ${focus ? "sa position" : n > 2 ? "ces écarts" : "cet écart"}, à partir des seuls chiffres de cette page, sans conseil. ${miaConnectee() ? `Rédigée par l'IA de bilan.` : `<a class="lnk" href="/espace/ia">L'IA du site</a> n'est pas disponible pour le moment.`}</p></div><div class="cmpr-iaout" aria-live="polite"></div>`;
}

/* ---------- Page /comparer ---------- */
let CMPR_STATE = null, CMPR_FOCUSQ = false;
async function pageComparer() {
  setNav("ent");
  if (!R) return;
  const s0 = location.search;
  if (!app.querySelector(".cmpr-page")) app.innerHTML = `<div class="empty">Chargement…</div>`;
  await PXP; await premStatus();
  if (location.pathname !== "/comparer" || location.search !== s0) return;
  const CMAX = isPrem() ? 5 : FREE.cmp;
  const raw = [...new Set((new URLSearchParams(location.search).get("ids") || "").split(",").map(x => x.trim()).filter(id => RBY[id]))];
  const ids = raw.slice(0, CMAX), cut = raw.slice(CMAX).map(id => RBY[id]), cos = ids.map(id => RBY[id]);
  setTitle(cos.length >= 2 ? `${listFr(cos.map(c => c.name))} : la comparaison` : "Comparer des entreprises");
  // comptes complets (dates de clôture, liens des rapports, croissance sur plusieurs années) : on les attend un court instant
  const fp = cmprFull(ids); await Promise.race([fp, new Promise(r => setTimeout(r, 600))]);
  if (location.pathname !== "/comparer" || location.search !== s0) return;
  cmprRender(ids, cut, CMAX);
  fp.then(() => { if (location.pathname === "/comparer" && location.search === s0 && CMPR_STATE && CMPR_STATE.stale && ids.some(id => FULL[id])) { const y = scrollY; cmprRenderBody(ids); window.scrollTo(0, y); } });
}
function cmprSugList(ids) { // concurrents directs des entreprises choisies (listes établies à la main d'abord)
  const cos = ids.map(id => RBY[id]).filter(Boolean), seen = new Set(ids), out = [];
  for (const c of cos) for (const p of peersOf(c, 5).list) if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }
  return out.filter(c => !c.missing).concat(out.filter(c => c.missing)).slice(0, 6);
}
function cmprRender(ids, cut, CMAX) {
  const cos = ids.map(id => RBY[id]), url = a => "/comparer" + (a.length ? "?ids=" + a.join(",") : ""), sug = cmprSugList(ids);
  const card = c => { const t = c.missing ? null : quick(c);
    return `<div class="cmpr-card"><a class="cmpr-cl" href="/entreprise/${c.id}">${logo(c, 40)}<span><b>${esc(c.name)}</b><small>${esc([c.ticker, regName(c), secName(c)].filter(Boolean).join(" · "))}</small><small>${c.missing ? esc(missingTxt(c)) : `Comptes ${c.year}${c.currency && c.currency !== "EUR" ? ` · en ${c.currency}` : ""}`}${t ? " " + pills(t) : ""}</small></span></a><button type="button" class="cmpr-x" data-cmpr-rm="${c.id}" aria-label="Retirer ${esc(c.name)} de la comparaison" title="Retirer">×</button></div>`; };
  const add = ids.length < CMAX ? `<div class="cmpr-card cmpr-add"><label for="cmpq">${ids.length ? "Ajouter une entreprise" : "Choisir une entreprise"}</label><div class="cmpr-q"><input id="cmpq" type="search" autocomplete="off" spellcheck="false" placeholder="Nom ou code (ex. LVMH, AAPL)" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="cmps"><div class="cmpr-sug" id="cmps" role="listbox" hidden></div></div><small>${ids.length}/${CMAX} · ${CMAX === 5 ? "Premium : cinq à la fois" : `cinq avec <a class="lnk" href="/premium">Premium</a>`}</small></div>`
    : `<div class="cmpr-card cmpr-lim"><b style="font-size:14px">${CMAX} entreprises : c'est le maximum${CMAX === 5 ? "" : " en version gratuite"}.</b><span>${CMAX === 5 ? "Retirez-en une pour en ajouter une autre." : `Retirez-en une, ou passez à <a class="lnk" href="/premium">Premium</a> pour en comparer cinq.`}</span></div>`;
  app.innerHTML = `<div class="cmpr-page"><div class="crumbs"><a href="/entreprises">Entreprises</a> › Comparer</div>
    <h1 class="pagetitle">${cos.length >= 2 ? esc(listFr(cos.map(c => c.name))) : "Comparer des entreprises"}</h1>
    <p class="pagesub">${cos.length >= 2 ? "Le verdict d'abord, critère par critère, puis le détail de chaque chiffre, toujours face à la médiane de son secteur. Ce sont des faits tirés des comptes officiels, pas un conseil d'achat." : "Choisissez deux à cinq entreprises : le site calcule aussitôt qui est la plus grande, la plus rentable, la plus solide ou la moins chère, à partir de leurs comptes officiels."}</p>
    <section class="panel cmpr-selp"><div class="pb" style="padding-top:16px">
      <div class="cmpr-sel">${cos.map(card).join("")}${add}</div>
      ${cut.length ? `<p class="cmpr-cut">La version gratuite compare ${FREE.cmp} entreprises à la fois : ${esc(listFr(cut.map(c => c.name)))} ${cut.length > 1 ? "n'ont" : "n'a"} pas été ajoutée${cut.length > 1 ? "s" : ""}. <a class="lnk" href="/premium">Premium</a> en compare cinq.</p>` : ""}
      ${sug.length && ids.length < CMAX ? `<div class="cmpr-sugs"><span>${ids.length ? "Concurrents directs :" : "Suggestions :"}</span>${sug.map(c => `<a class="chip" href="${url([...ids, c.id])}" title="Ajouter ${esc(c.name)}">${logo(c, 20)}+ ${esc(c.name)}</a>`).join("")}</div>` : ""}
      ${ids.length ? `<div class="cmpr-acts">${ids.length >= 2 ? `<button type="button" class="linkbtn" data-cmpr-share>${CMPR_ICON.lien}Partager cette comparaison</button>` : ""}<a class="linkbtn" href="/comparer">Tout retirer</a></div>` : ""}
    </div></section>
    <div id="cmpr-body"></div></div>`;
  CMPR_STATE = { ids, CMAX };
  cmprRenderBody(ids);
  cmprBindSearch(ids, url);
  if (CMPR_FOCUSQ) { CMPR_FOCUSQ = false; const q = $("#cmpq"); if (q) q.focus({ preventScroll: true }); }
}
function cmprRenderBody(ids) {
  const el = $("#cmpr-body"); if (!el) return;
  const cos = ids.map(id => RBY[id]);
  if (CMPR_STATE) CMPR_STATE.stale = ids.some(id => !RBY[id].missing && !FULL[id]);
  if (cos.length < 2) {
    el.innerHTML = cos.length === 1 ? `<section class="panel"><div class="empty">Ajoutez au moins une autre entreprise : le verdict et la comparaison critère par critère s'afficheront ici.</div></section>`
      : `<section class="panel"><div class="ph"><h2>Des comparaisons pour commencer</h2></div><div class="pb"><div class="cmpr-pre">${CMPR_PRESETS.map(([l, t, d]) => [l.filter(id => RBY[id]), t, d]).filter(([l]) => l.length >= 2).map(([l, t, d]) => `<a href="/comparer?ids=${l.join(",")}"><span class="lgs">${l.map(id => logo(RBY[id], 30)).join("")}</span><b>${esc(t)}</b><small>${esc(listFr(l.map(id => RBY[id].name)))}. ${esc(d)}</small></a>`).join("")}</div></div></section>`;
    return;
  }
  const X = cmprCtx(cos), V = cmprVerdict(X), notes = cmprNotes(X);
  el.innerHTML = `
    <section class="panel cmpr-vp" id="cmpr-verdict"><div class="ph"><h2>Le verdict, critère par critère</h2><span class="cmpr-badge">Calculé à l'instant sur les comptes</span></div>
      <div class="pb">${V.lead ? `<p class="cmpr-lead">${V.lead}</p>` : ""}
        <ul class="cmpr-vl">${V.lines.map(l => `<li><a class="th" href="#cmpr-${l.T.k}">${CMPR_ICON[l.T.k]}${esc(l.T.t)}</a>${l.html ? `<p>${l.html}</p>` : `<p class="muted">${cmprNoCmp(l.T, X)}</p>`}</li>`).join("")}</ul>
        ${notes.length ? `<ul class="cmpr-notes">${notes.map(n => `<li>${n}</li>`).join("")}</ul>` : ""}
        <p class="note" style="margin:12px 0 0">Être en tête sur un critère n'est ni une recommandation ni une prédiction : ce sont les derniers comptes publiés, comparés entre eux.</p></div>
      ${typeof rfCmpTableHTML === "function" && X.F.length && X.F[0].ok ? `<div class="cmpr-tbl">${tblxScrollBox(rfCmpTableHTML(cos[0], X), "Faites glisser pour voir toutes les entreprises")}<p class="note" style="margin:8px 18px 14px">Vert : point fort ; orange : à surveiller ; sans couleur : dans la moyenne. La médiane et la fourchette sont celles du secteur de ${esc(cos[0].name)}.</p></div>` : ""}
      ${cmprIABar(cos.length, null)}</section>
    <section class="panel cmpr-clip" id="cmpr-themes"><div class="ph"><h2>Le détail, thème par thème</h2></div>
      <div class="cmpr-legend"><span>Chaque point place l'entreprise parmi celles de son secteur suivies par le site : à droite les mieux placées.</span><span><i class="m"></i>médiane de son secteur</span><span><i style="background:var(--g)"></i>point fort</span><span><i style="background:var(--n)"></i>dans la moyenne</span><span><i style="background:var(--o)"></i>point de vigilance</span></div>
      ${V.lines.map(l => cmprThemeHTML(l.T, X, l.S)).join("")}</section>
    <section class="panel cmpr-clip"><details class="acc" id="cmpr-tout"><summary><span><b>Tous les chiffres sur un seul tableau</b><br><small class="light" style="font-weight:400">Les ${CMPR_T.reduce((a, T) => a + CMPR_D[T.k].length, 0) + 1} indicateurs, entreprise par entreprise</small></span><span class="chev" aria-hidden="true"></span></summary><div class="accb" style="padding:0 22px 16px">${cmprAllTable(X, null)}</div></details></section>
    <section class="panel"><div class="ph"><h2>Sources et dates</h2></div><div class="pb" style="padding-top:6px">${cmprSources(X)}</div></section>
    <section class="panel"><details class="acc"><summary><b>Comment lire cette comparaison</b><span class="chev" aria-hidden="true"></span></summary><div class="accb" style="padding:0 22px 14px"><ol class="steps2">
      <li><b>Comparez des entreprises du même métier.</b> Une marge de 10 % est faible pour un éditeur de logiciels et élevée pour un supermarché.</li>
      <li><b>Regardez plusieurs critères ensemble.</b> Une forte rentabilité avec beaucoup de dette ne vaut pas une forte rentabilité sans dette.</li>
      <li><b>Un chiffre est la photo d'une année.</b> Sur chaque fiche, « Les chiffres en détail » montre l'évolution sur plusieurs années.</li>
      <li><b>Servez-vous de la médiane.</b> Le trait noir sur chaque barre est la médiane du secteur : la moitié des entreprises fait mieux, l'autre moitié moins bien. ${medBtn("Qu'est-ce que la médiane ?")}</li>
      <li><b>Une entreprise solide peut avoir une action chère.</b> Le thème « Prix en Bourse » compare le prix de l'action aux bénéfices ; un prix élevé traduit souvent des attentes de croissance.</li></ol></div></details></section>`;
  const top = () => { const b = $("#bar"); if (b) document.documentElement.style.setProperty("--cmpr-top", (b.classList.contains("hide") ? 0 : b.offsetHeight) + "px"); };
  top();
  if (CMPR_STATE) CMPR_STATE.X = X;
}
function cmprBindSearch(ids, url) {
  const q = $("#cmpq"), box = $("#cmps"); if (!q) return;
  let hits = [], sel = -1;
  const pick = id => { if (!id || ids.includes(id)) return; CMPR_FOCUSQ = ids.length + 1 < CMPR_STATE.CMAX; go(url([...ids, id])); };
  const draw = () => {
    const t = norm(q.value.trim());
    let head = "";
    if (!t) { hits = cmprSugList(ids).slice(0, 6); head = hits.length ? (ids.length ? "Concurrents directs" : "") : ""; }
    else {
      const score = c => { const n = norm(c.name), tk = norm(c.ticker || ""); if (tk === t || (c.isin || "").toLowerCase() === t) return 0; if (n.startsWith(t)) return 1; if (n.split(/[\s'’.-]+/).some(w => w.startsWith(t))) return 2; if (t.length >= 2 && n.includes(t)) return 3; if (t.length >= 2 && tk.startsWith(t)) return 3; return 9; };
      hits = R.companies.filter(c => !ids.includes(c.id)).map(c => [score(c), c]).filter(x => x[0] < 9).sort((a, b) => a[0] - b[0] || caEur(b[1]) - caEur(a[1])).slice(0, 8).map(x => x[1]);
    }
    if (!hits.length && !t) { box.hidden = true; q.setAttribute("aria-expanded", "false"); return; }
    sel = -1;
    box.innerHTML = (head ? `<div class="h">${head}</div>` : "") + (hits.length ? hits.map((c, i) => `<button type="button" role="option" id="cmps-${i}" data-id="${c.id}">${logo(c, 30)}<span><b>${esc(c.name)}</b><small>${esc([c.ticker, secName(c), regName(c)].filter(Boolean).join(" · "))}</small></span>${c.missing ? `<em>comptes indisponibles</em>` : ""}</button>`).join("") : `<div class="none">Aucune entreprise trouvée parmi les ${F0.format(R.companies.length)} suivies.</div>`);
    box.hidden = false; q.setAttribute("aria-expanded", "true");
  };
  const mark = () => { $$("button", box).forEach((b, i) => b.classList.toggle("on", i === sel)); const b = $$("button", box)[sel]; if (b) { b.scrollIntoView({ block: "nearest" }); q.setAttribute("aria-activedescendant", b.id); } };
  q.addEventListener("input", draw);
  q.addEventListener("focus", draw);
  q.addEventListener("keydown", e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (box.hidden) draw(); const n = $$("button", box).length; if (!n) return; sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + n) % n; mark(); }
    else if (e.key === "Enter") { e.preventDefault(); const b = $$("button", box)[Math.max(0, sel)]; if (b && (sel >= 0 || q.value.trim())) pick(b.dataset.id); }
    else if (e.key === "Escape") { box.hidden = true; q.setAttribute("aria-expanded", "false"); }
  });
  box.addEventListener("mousedown", e => e.preventDefault()); // garde le focus dans le champ pendant le clic
  box.addEventListener("click", e => { const b = e.target.closest("button[data-id]"); if (b) pick(b.dataset.id); });
  q.addEventListener("blur", () => setTimeout(() => { box.hidden = true; q.setAttribute("aria-expanded", "false"); }, 120));
}
async function cmprShare() {
  const url = location.origin + "/comparer" + location.search, title = document.title;
  if (navigator.share && matchMedia("(pointer: coarse)").matches) { try { await navigator.share({ title, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
  let ok = false;
  try { await navigator.clipboard.writeText(url); ok = true; } catch (e) {
    try { const t = document.createElement("textarea"); t.value = url; t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(t); t.select(); ok = document.execCommand("copy"); t.remove(); } catch (x) { }
  }
  toast(ok ? "Lien copié. Collez-le pour partager cette comparaison." : `Copiez ce lien : <span style="word-break:break-all">${esc(url)}</span>`);
}
document.addEventListener("click", e => {
  const rm = e.target.closest("[data-cmpr-rm]");
  if (rm && CMPR_STATE) { e.preventDefault(); const ids = CMPR_STATE.ids.filter(id => id !== rm.dataset.cmprRm); go("/comparer" + (ids.length ? "?ids=" + ids.join(",") : "")); return; }
  if (e.target.closest("[data-cmpr-share]")) { e.preventDefault(); cmprShare(); return; }
  const ia = e.target.closest("[data-cmpr-ia]");
  if (ia) {
    e.preventDefault();
    const out = ia.closest(".cmpr-ia") && ia.closest(".cmpr-ia").nextElementSibling;
    if (ia.dataset.focus) { const s = RBY[ia.dataset.focus]; if (s) cmprAsk(cmprCtx(cmprFiche(s).all), s, out, ia); }
    else if (CMPR_STATE && CMPR_STATE.X) cmprAsk(CMPR_STATE.X, null, out, ia);
  }
});
addEventListener("scroll", () => { if (!CMPR_STATE || location.pathname !== "/comparer") return; const b = $("#bar"); if (b) document.documentElement.style.setProperty("--cmpr-top", (b.classList.contains("hide") ? 0 : b.offsetHeight) + "px"); }, { passive: true });

/* ---------- Étape « Concurrents » de la fiche : position face à 3 à 5 concurrentes ---------- */
function cmprFiche(s) {
  const { list, auto } = peersOf(s, 4);
  const peers = list.filter(c => !c.missing).concat(list.filter(c => c.missing));
  return { peers, auto, all: [s, ...peers] };
}
// L'étape « Concurrents » de la fiche (concurrentsHTML) est définie une seule fois, dans m/fiche2.js.

/* La page a pu être affichée avant le chargement de ce module : on la refait avec la nouvelle version */
if (typeof R !== "undefined" && R && location.pathname === "/comparer") pageComparer();
