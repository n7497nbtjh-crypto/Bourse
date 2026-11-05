import json, html
import os; B=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') + '/'
C=json.load(open(B+'cf/site/data/cours-semaine.json')); I=C['items']
E=lambda s: html.escape(s)
fr=lambda v,d=0: f"{v:,.{d}f}".replace(",", " ").replace(".", ",")
def pct(v): return ("+" if v>=0 else "−")+fr(abs(v),1)+" %"
def eur(v): return ("+" if v>=0 else "−")+fr(abs(v),0)+" €"
# Profil d'exemple (cohérent : un ETF monde en socle + quatre grandes françaises, dans un PEA de 10 000 € environ)
PF=[("e:amundi-msci-world-pea","Amundi MSCI World","amundi.png",950,True),("c:lvmh","LVMH","lvmh.png",3,False),("c:air-liquide","Air Liquide","air-liquide.png",6,False),("c:totalenergies","TotalEnergies","totalenergies.png",12,False),("c:schneider-electric","Schneider Electric","schneider-electric.png",4,False)]
FAV=[("c:hermes","Hermès","hermes.png"),("c:sanofi","Sanofi","sanofi.png"),("c:apple","Apple","apple.png"),("c:asml","ASML","asml.png")]
def var(k): s=[v for v in I[k] if v is not None]; return s[0],s[-1],(s[-1]/s[0]-1)*100
lignes=[]
for k,n,lg,q,etf in PF:
  a,b,v=var(k); lignes.append(dict(k=k,n=n,lg=lg,q=q,a=a,b=b,v=v,val=q*b,gain=q*(b-a),etf=etf))
tot=sum(l['val'] for l in lignes); tot0=sum(l['q']*l['a'] for l in lignes); g=tot-tot0; gp=g/tot0*100
for l in lignes: l['poids']=l['val']/tot*100
favs=[]
for k,n,lg in FAV:
  a,b,v=var(k); favs.append(dict(k=k,n=n,lg=lg,v=v))
best=max(lignes+favs,key=lambda x:x['v']); worst=min(lignes+favs,key=lambda x:x['v'])
def logo(f,emetteur=False): return f'<span class="lg"><img src="../../cf/site/logos/{"emetteurs/" if emetteur else ""}{f}" alt=""></span>'
# Actualité de la semaine : annonces officielles et presse relevées par le site (fichiers cf/site/data/actu/c/<id>.json),
# titres non français traduits comme le fait le site, articles de conseil (« acheter / vendre », objectifs de cours) écartés.
T={ # type: (libellé, classe)
 "res":("Résultats","t-res"),"rach":("Rachat d'actions","t-rach"),"presse":("Presse","t-pr"),"accord":("Accord","t-acc"),"div":("Dividende","t-div"),"obl":("Emprunt","t-obl")}
ACTU={
"c:air-liquide":[("29 oct.","res","Chiffre d'affaires du 3e trimestre 2026",[("Chiffre d'affaires du trimestre","7,3 Md€"),("Sur un an","+4,3 %")],"Les ventes progressent, portées d'après la société par l'électronique (gaz pour les usines de puces).","AMF"),
  ("30 oct.","presse","« L'électronique tire la croissance, le titre se rapproche de ses records »",[],"","abcbourse.com"),
  ("30 oct.","rach","Rachète ses propres actions",[],"Une société qui rachète ses actions réduit leur nombre : chaque action restante représente une part un peu plus grande de l'entreprise.","AMF")],
"c:totalenergies":[("29 oct.","res","Résultats du 3e trimestre 2026",[],"Chiffres pas encore relevés par le site : ils s'afficheront sur la fiche dès leur lecture.","AMF"),
  ("1er nov.","accord","Cède une partie d'un bloc d'exploration au Nigeria",[],"","rigzone.com · traduit de l'anglais"),
  ("5 nov.","accord","Signe un protocole d'accord avec le chinois Jiangsu Guoxin (gaz naturel liquéfié)",[],"","lngindustry.com · traduit de l'anglais"),
  ("5 nov.","presse","Met en service sa première borne de recharge rapide pour camions électriques en France",[],"","clubic.com")],
"c:lvmh":[("29 oct.","presse","Sephora ferme des magasins en France",[],"","boerse-express.com · traduit de l'allemand"),
  ("30 oct.","presse","« Pourquoi les dynasties du luxe peinent à lâcher le pouvoir »",[],"","bilan.ch"),
  ("3 nov.","rach","Rachète ses propres actions",[],"","AMF")],
"c:schneider-electric":[("1er nov.","accord","Avec NVIDIA et HPE, développe l'IA dans les usines de procédés",[],"","commonperu.com · traduit de l'espagnol"),
  ("2 nov.","rach","Rachète ses propres actions (déclaration de la semaine)",[],"","AMF")],
"c:amundi-msci-world-pea":[],
"c:sanofi":[("30 oct.","res","Chiffre d'affaires du 3e trimestre 2026",[("Chiffre d'affaires du trimestre","14,4 Md€"),("Sur un an","+14 %"),("Résultat opérationnel","5,4 Md€ (+20 %)")],"Ventes et résultat montent à deux chiffres ; la presse retient le médicament Dupixent et des perspectives relevées.","AMF"),
  ("30 oct.","presse","« Sanofi relève ses perspectives de croissance et grimpe en Bourse »",[],"","lefigaro.fr")],
"c:apple":[("2 nov.","res","Résultats du trimestre juillet-septembre",[("Ventes du trimestre","114,5 Md$"),("Sur un an","+12 %"),("Dividende annoncé","0,27 $ par action")],"Sur son exercice complet, clos en septembre, les ventes atteignent 478,8 Md$ (+15 %).","SEC"),
  ("5 nov.","obl","Cherche à emprunter environ 7 Md$ par une émission d'obligations",[],"","macdailynews.com · traduit de l'anglais")],
"c:hermes":[("29 oct.","presse","Classement Interbrand : Hermès passe devant Louis Vuitton parmi les marques du luxe",[],"","milanofinanza.it · traduit de l'italien")],
"c:asml":[("1er nov.","rach","Rachats d'actions déclarés pour 499 M€",[],"","boerse-express.com · traduit de l'allemand")],
}
# ——— v2 (5/11) : largeur pleine, « À retenir » en tête, une rangée par entreprise, presse regroupée ———
DOT={"res":"#E0B400","rach":"#8A8A80","presse":"#4C7BF2","accord":"#8B5CF6","div":"#00A06B","obl":"#F08C2E"}
def pill(v): return f'<span class="pv {"dn" if v<0 else "up"}">{pct(v)}</span>'
def ev(d,t,ti,ch,lec,src):
  chips=''.join(f'<span class="ch"><small>{E(a)}</small><b>{E(b)}</b></span>' for a,b in ch)
  return f'''<li><p class="ty"><i style="background:{DOT[t]}"></i>{T[t][0]} · {E(d)}</p><p class="ti">{E(ti)}</p>{f'<div class="chs">{chips}</div>' if chips else ''}{f'<p class="lec">{E(lec)}</p>' if lec else ''}<p class="src">{E(src)} ↗</p></li>'''
def rangee(k,n,lg,v,etf=False,poids=None):
  A=ACTU.get(k,[]); off=[a for a in A if a[1]!="presse"]; pr=[a for a in A if a[1]=="presse"]
  corps=''.join(ev(*a) for a in off)
  if pr: corps+=f'''<li class="prs"><p class="ty"><i style="background:{DOT["presse"]}"></i>Dans la presse</p>{''.join(f'<p class="pt">« {E(a[2].strip("« »"))} » <span>{E(a[5])} · {E(a[0])}</span></p>' for a in pr)}</li>'''
  if not A: corps='<li class="vide">'+("Un ETF ne publie pas de résultats : son cours suit les quelque 1 300 entreprises qu'il contient." if etf else "Rien de publié cette semaine.")+'</li>'
  meta=" · ".join(x for x in ["ETF" if etf else "", f"{fr(poids,0)} % du portefeuille" if poids else "favori"] if x)
  return f'''<article class="rw{' calme' if not A else ''}"><div class="rw-id">{logo(lg,etf)}<div><b>{E(n)}</b><small>{meta}</small></div>{pill(v)}</div><ul>{corps}</ul></article>'''
ret=[("apple.png","Apple","Ventes du trimestre","114,5 Md$","+12 % sur un an : l'activité accélère.","up"),
     ("sanofi.png","Sanofi","Chiffre d'affaires du trimestre","14,4 Md€","+14 % sur un an, perspectives relevées.","up"),
     (worst["lg"],worst["n"],"Sur la semaine",pct(worst["v"]),"La plus forte baisse de vos valeurs cette semaine.","dn")]
retenir=''.join(f'''<div class="rt"><div class="rt-h">{logo(lg)}<b>{E(n)}</b></div><small>{E(a)}</small><p class="rt-f {c}">{E(f)}</p><p>{E(t)}</p></div>''' for lg,n,a,f,t,c in ret)
pfR=''.join(rangee(l['k'],l['n'],l['lg'],l['v'],l['etf'],l['poids']) for l in sorted(lignes,key=lambda l:-len(ACTU.get(l['k'],[]))))
fvR=''.join(rangee(f['k'],f['n'],f['lg'],f['v']) for f in sorted(favs,key=lambda f:-len(ACTU.get(f['k'],[]))))
nb=sum(len(v) for v in ACTU.values())
top3=sum(sorted((l['poids'] for l in lignes),reverse=True)[:3])
mx=max(abs(l['gain']) for l in lignes)
contrib=''.join(f'''<div class="cb"><span class="cbn">{logo(l['lg'],l['etf'])}{E(l['n'])}</span><span class="cbz"><i class="{'dn' if l['gain']<0 else 'up'}" style="width:{abs(l['gain'])/mx*50:.1f}%"></i></span><b class="{'dn' if l['gain']<0 else 'up'}">{eur(l['gain'])}</b></div>''' for l in sorted(lignes,key=lambda l:-l['gain']))
AG=[("12","nov.","apple.png","Apple détache son dividende de 0,27 $","Favori"),("16","nov.","apple.png","Apple verse ce dividende","Favori"),("30","nov.","lvmh.png","LVMH : dernier jour pour toucher l'acompte","Portefeuille"),("3","déc.","lvmh.png","LVMH verse 5,50 € par action, soit 16,50 € pour vous","Portefeuille")]
agenda=''.join(f'<div class="ag1"><span class="dt">{j}<small>{m}</small></span>{logo(lg)}<p>{E(t)}<small>{q}</small></p></div>' for j,m,lg,t,q in AG)
H=f'''<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ENKLAIR · maquette : le rapport de la semaine (v2)</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600;700;800&display=swap">
<style>
:root{{--ink:#111;--y:#FFE14D;--yl:#FFF6C7;--g:#00A06B;--r:#D92D12;--gz:#E2F8EE;--rz:#FFE9E3;--mut:#666}}
*{{box-sizing:border-box;margin:0;padding:0}}body{{background:#fff;color:var(--ink);font:400 16px/1.5 Inter,sans-serif;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased}}
.w{{max-width:1240px;margin:0 auto;padding:28px 32px 80px}}
.note{{background:#F4F4F4;border-radius:14px;padding:12px 16px;font:600 13.5px/1.45 Inter;margin-bottom:22px}}
.up{{color:var(--g)}}.dn{{color:var(--r)}}
.lg{{width:40px;height:40px;border:2px solid var(--ink);border-radius:11px;background:#fff;display:grid;place-items:center;overflow:hidden;flex:none}}.lg img{{max-width:74%;max-height:66%}}
.stk{{display:inline-block;font:800 13px "Bricolage Grotesque";padding:4px 11px;border-radius:9px;border:2px solid var(--ink);box-shadow:2px 2px 0 var(--ink);transform:rotate(-2deg);background:#fff}}
h2{{font:800 clamp(26px,3.2vw,38px)/1.05 "Bricolage Grotesque";letter-spacing:-.04em;margin:10px 0 18px}}
.sec{{margin-top:52px}}
/* 1. en-tête : le chiffre, puis l'essentiel en trois cartes, dans le même bandeau */
.hero{{background:var(--y);border-radius:30px;padding:26px 32px 30px}}
.mast{{display:flex;justify-content:space-between;align-items:center;font:700 13.5px Inter;gap:12px;flex-wrap:wrap}}.mast b{{font:800 22px "Bricolage Grotesque";letter-spacing:-.03em}}
.hg{{display:grid;grid-template-columns:1.05fr 1.6fr;gap:28px;align-items:end;margin-top:18px}}
.hero h1{{font:800 clamp(34px,4.4vw,58px)/.98 "Bricolage Grotesque";letter-spacing:-.05em}}
.hero h1 em{{font-style:normal;background:#fff;border:3px solid var(--ink);border-radius:14px;padding:0 10px;box-shadow:4px 4px 0 var(--ink);white-space:nowrap}}
.hsub{{font:600 15.5px/1.45 Inter;color:#333;margin-top:14px}}
.kpis{{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}}.kpis span{{background:#fff;border:2px solid var(--ink);border-radius:999px;padding:5px 12px;font:700 13px Inter}}.kpis b{{font-weight:800}}
.rts>small{{display:block;font:800 13px "Bricolage Grotesque";margin-bottom:8px}}
.rtg{{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}}
.rt{{background:#fff;border:2px solid var(--ink);border-radius:20px;padding:14px 16px;box-shadow:4px 4px 0 var(--ink)}}
.rt-h{{display:flex;align-items:center;gap:9px}}.rt-h .lg{{width:32px;height:32px;border-radius:9px}}.rt-h b{{font:800 16px "Bricolage Grotesque"}}
.rt small{{display:block;font:700 12px Inter;color:#666;margin-top:10px}}.rt-f{{font:800 30px/1.05 "Bricolage Grotesque";letter-spacing:-.04em}}.rt p:last-child{{font:500 13px/1.4 Inter;color:#333;margin-top:6px}}
/* 2. l'actualité : une rangée par entreprise, sur toute la largeur */
.grp{{font:800 15px "Bricolage Grotesque";color:#555;margin:22px 0 10px;display:flex;align-items:center;gap:10px}}.grp:after{{content:"";flex:1;height:2px;background:#EEE}}
.rw{{display:grid;grid-template-columns:250px 1fr;gap:24px;border:2px solid var(--ink);border-radius:22px;padding:18px 22px;margin-bottom:12px;background:#fff}}
.rw-id{{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;align-items:center;align-self:start;position:sticky;top:10px}}
.rw-id b{{display:block;font:800 19px/1.15 "Bricolage Grotesque";letter-spacing:-.02em}}.rw-id small{{font:600 12.5px Inter;color:var(--mut)}}
.pv{{grid-column:1/-1;justify-self:start;margin-top:8px;font:800 17px "Bricolage Grotesque";border:2px solid var(--ink);border-radius:999px;padding:3px 12px}}.pv.up{{background:var(--gz)}}.pv.dn{{background:var(--rz)}}
.rw ul{{list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 26px}}
.rw li{{min-width:0}}
.ty{{display:flex;align-items:center;gap:7px;font:700 12px Inter;color:var(--mut);text-transform:none}}.ty i{{width:9px;height:9px;border-radius:50%;flex:none}}
.ti{{font:700 16px/1.35 Inter;margin-top:3px}}
.chs{{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}}.ch{{background:var(--yl);border-radius:10px;padding:5px 10px}}.ch small{{display:block;font:600 11px Inter;color:#666}}.ch b{{font:800 17px "Bricolage Grotesque"}}
.lec{{font:500 14px/1.45 Inter;color:#333;margin-top:8px;border-left:3px solid var(--y);padding-left:10px}}
.src{{font:600 12px Inter;color:#888;margin-top:6px}}
.prs .pt{{font:600 14px/1.4 Inter;margin-top:6px}}.prs .pt span{{display:block;font:600 12px Inter;color:#888}}
.rw.calme{{border-style:dashed;border-color:#BBB;padding:12px 22px}}.rw.calme .vide{{grid-column:1/-1;font:500 14px Inter;color:var(--mut);align-self:center}}.rw.calme ul{{display:block;align-self:center}}
/* 3. portefeuille + agenda côte à côte */
.duo{{display:grid;grid-template-columns:1.3fr 1fr;gap:18px;align-items:start}}
.box{{border:2px solid var(--ink);border-radius:22px;padding:18px 20px}}.box h3{{font:800 19px "Bricolage Grotesque";margin-bottom:12px}}
.cb{{display:grid;grid-template-columns:200px 1fr 80px;gap:12px;align-items:center;padding:7px 0}}
.cbn{{display:flex;align-items:center;gap:10px;font:700 14px Inter}}.cbn .lg{{width:28px;height:28px;border-radius:8px}}
.cbz{{position:relative;height:14px;background:linear-gradient(90deg,transparent calc(50% - 1px),#111 calc(50% - 1px) calc(50% + 1px),transparent calc(50% + 1px))}}
.cbz i{{position:absolute;top:0;height:14px;border-radius:4px;border:2px solid var(--ink)}}.cbz i.up{{left:50%;background:#7FE0B4}}.cbz i.dn{{right:50%;background:#FF9E8A}}
.cb>b{{font:800 16px "Bricolage Grotesque";text-align:right}}
.al{{margin-top:12px;background:var(--rz);border-radius:12px;padding:9px 12px;font:600 13px/1.4 Inter}}
.ag1{{display:grid;grid-template-columns:48px 34px 1fr;gap:12px;align-items:center;padding:9px 0;border-bottom:1px solid #EEE}}.ag1:last-child{{border:0}}
.dt{{background:var(--y);border:2px solid var(--ink);border-radius:10px;text-align:center;font:800 18px/1 "Bricolage Grotesque";padding:5px 0}}.dt small{{display:block;font:700 10px Inter}}
.ag1 .lg{{width:32px;height:32px;border-radius:9px}}.ag1 p{{font:700 14px/1.35 Inter}}.ag1 p small{{display:block;font:600 12px Inter;color:var(--mut)}}
.ics{{display:inline-block;margin-top:12px;font:700 13px Inter;border-bottom:2px solid var(--y)}}
/* 4. contexte */
.ctx{{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}}.ctx>div{{background:#FAF9F5;border-radius:18px;padding:16px 18px}}
.ctx small{{font:700 12px Inter;color:#555}}.ctx h4{{font:800 17px/1.2 "Bricolage Grotesque";margin:4px 0 8px}}.ctx p{{font:500 13.5px/1.45 Inter;color:#333}}
.qui{{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}}.qui span{{font:700 12px Inter;border-radius:999px;padding:3px 9px;background:#fff;border:1.5px solid #CCC}}
.foot{{font:500 12px Inter;color:#777;margin-top:40px;border-top:2px solid #EEE;padding-top:14px}}
@media(max-width:900px){{.hg,.duo,.ctx{{grid-template-columns:1fr}}.rtg{{grid-template-columns:1fr}}.rw{{grid-template-columns:1fr;gap:14px;padding:16px}}.rw-id{{position:static}}.rw ul{{grid-template-columns:1fr}}.cb{{grid-template-columns:130px 1fr 70px}}.w{{padding:16px 14px}}.hero{{padding:20px 18px 22px;border-radius:24px}}}}
</style></head><body><div class="w">
<p class="note">Maquette v2 du rapport de la semaine (même profil d'exemple que la v1). Ce qui change : toute la largeur de l'écran, « À retenir » dès le bandeau, une rangée par entreprise (annonces sur deux colonnes, presse regroupée), plus de grosses étiquettes « Presse » à gauche, portefeuille et agenda côte à côte.</p>
<section class="hero"><p class="mast"><b>ENKLAIR</b><span>Votre rapport · semaine du 28 octobre au 4 novembre 2026</span></p>
<div class="hg"><div><h1>Votre portefeuille a {"gagné" if g>=0 else "perdu"} <em class="{'up' if g>=0 else 'dn'}">{fr(abs(g),0)}&nbsp;€</em> cette semaine.</h1>
<p class="hsub">{pct(gp)} sur {fr(tot0,0)} €. Il vaut {fr(tot,0)} € au 4 novembre.</p>
<div class="kpis"><span>{nb} nouvelles sur vos 9 valeurs</span><span>▲ <b>{E(best['n'])}</b> {pct(best['v'])}</span><span>▼ <b>{E(worst['n'])}</b> {pct(worst['v'])}</span></div></div>
<div class="rts"><small>À retenir</small><div class="rtg">{retenir}</div></div></div></section>
<section class="sec"><span class="stk" style="background:#A9B6FF">L'actualité</span><h2>Ce qui s'est passé pour vos entreprises.</h2>
<p class="grp">Dans votre portefeuille</p>{pfR}<p class="grp">Dans vos favoris</p>{fvR}</section>
<section class="sec duo"><div><span class="stk" style="background:#FFB3D1">Votre portefeuille</span><h2>Ce qui l'a fait bouger.</h2>
<div class="box"><h3>Ce que chaque ligne a apporté</h3>{contrib}<p class="al">⚠ Trois lignes concentrent {fr(top3,0)} % du portefeuille.</p></div></div>
<div><span class="stk">À venir</span><h2>Vos prochaines dates.</h2><div class="box">{agenda}<a class="ics">＋ Ajouter à mon agenda</a></div></div></section>
<section class="sec"><span class="stk" style="background:#B8F0D4">Le contexte</span><h2>Ce qui touche leurs secteurs.</h2>
<div class="ctx"><div><small>Géopolitique et énergie</small><h4>Moyen-Orient : pétrole cher</h4><p>Le Brent tourne autour de 110 dollars le baril fin octobre.</p><div class="qui"><span>TotalEnergies</span><span>Air Liquide</span></div></div>
<div><small>Chine</small><h4>Croissance ralentie, consommation prudente</h4><p>PIB chinois +4,5 % sur un an au 3e trimestre.</p><div class="qui"><span>LVMH</span><span>Hermès</span><span>Apple</span></div></div>
<div><small>Technologie</small><h4>Investissements massifs dans l'IA</h4><p>Plus de puces, de serveurs et d'électricité pour les centres de données.</p><div class="qui"><span>ASML</span><span>Schneider</span><span>Apple</span></div></div></div></section>
<p class="foot">Variations entre la clôture du 28 octobre et celle du 4 novembre (cours différés ; valeur liquidative officielle pour l'ETF). Annonces : documents officiels et presse, liens vers chaque source. Information, pas un conseil d'investissement.</p>
</div></body></html>'''
open(B+'docs/maquettes/rapport-semaine-v2.html','w').write(H)
print("ok", fr(tot,0), eur(g))
