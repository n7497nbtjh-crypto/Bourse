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
def carte(k,n,lg,v,etf=False,poids=None):
  A=ACTU.get(k,[])
  it="".join(f'''<li><span class="tg {T[t][1]}">{T[t][0]}</span><div><p class="it-t">{E(ti)}</p>{''.join(f'<span class="ch"><small>{E(a)}</small><b>{E(b)}</b></span>' for a,b in ch) if ch else ''}{f'<p class="it-l">{E(l)}</p>' if l else ''}<p class="it-s">{d} · {E(s)} ↗</p></div></li>''' for d,t,ti,ch,l,s in A)
  vide='<p class="vide">Rien de publié cette semaine. Un ETF ne publie pas de résultats : son cours suit les quelque 1 300 entreprises qu\'il contient.</p>' if etf else '<p class="vide">Rien de publié cette semaine.</p>'
  return f'''<article class="co"><header>{logo(lg,etf)}<div><b>{E(n)}</b><small>{" · ".join(x for x in ["ETF" if etf else "", f"{fr(poids,0)} % du portefeuille" if poids else ""] if x)}</small></div><span class="pv {'dn' if v<0 else ''}">{pct(v)}</span></header>{f'<ul>{it}</ul>' if A else vide}</article>'''
nb=sum(len(v) for v in ACTU.values())
cartesPF="".join(carte(l['k'],l['n'],l['lg'],l['v'],l['etf'],l['poids']) for l in sorted(lignes,key=lambda l:-len(ACTU.get(l['k'],[]))))
cartesFav="".join(carte(f['k'],f['n'],f['lg'],f['v']) for f in sorted(favs,key=lambda f:-len(ACTU.get(f['k'],[]))))
mx=max(abs(l['gain']) for l in lignes)
contrib="".join(f'''<div class="cb"><span class="cbn">{logo(l['lg'],l['etf'])}{E(l['n'])}<small>{fr(l['poids'],0)} %</small></span><span class="cbz"><i class="{'dn' if l['gain']<0 else 'up'}" style="width:{abs(l['gain'])/mx*50:.1f}%"></i></span><b class="{'dn' if l['gain']<0 else 'up'}">{eur(l['gain'])}</b><small class="cbv">{pct(l['v'])}</small></div>''' for l in sorted(lignes,key=lambda l:-l['gain']))
html_=f'''<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ENKLAIR · maquette : le rapport de la semaine (v1)</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600;700;800&display=swap">
<style>
:root{{--ink:#111;--y:#FFE14D;--yl:#FFF6C7;--g:#00A06B;--r:#D92D12;--gz:#E2F8EE;--rz:#FFE9E3}}
*{{box-sizing:border-box;margin:0;padding:0}}body{{background:#fff;color:var(--ink);font:400 16px/1.5 Inter,sans-serif;font-variant-numeric:tabular-nums}}
.w{{max-width:1100px;margin:0 auto;padding:32px 28px 80px}}
.note{{background:#F4F4F4;border-radius:14px;padding:14px 18px;font:600 14px/1.45 Inter;margin-bottom:26px}}
.stk{{display:inline-block;font:800 14px "Bricolage Grotesque";padding:5px 12px;border-radius:10px;border:2px solid var(--ink);box-shadow:3px 3px 0 var(--ink);transform:rotate(-2deg);background:#fff}}
.stk.b{{background:#A9B6FF}}.stk.p{{background:#FFB3D1}}.stk.v{{background:#B8F0D4}}
h2{{font:800 clamp(28px,3.6vw,40px)/1.05 "Bricolage Grotesque";letter-spacing:-.04em;margin:12px 0 18px}}
.up{{color:var(--g)}}.dn{{color:var(--r)}}
.lg{{width:38px;height:38px;border:2px solid var(--ink);border-radius:10px;background:#fff;display:grid;place-items:center;overflow:hidden;flex:none}}.lg img{{max-width:78%;max-height:70%}}
/* en-tête */
.hero{{background:var(--y);border-radius:28px;padding:26px 30px 28px}}
.mast{{display:flex;justify-content:space-between;align-items:center;font:700 14px Inter}}.mast b{{font:800 22px "Bricolage Grotesque";letter-spacing:-.03em}}
.hero h1{{font:800 clamp(34px,4.6vw,56px)/1 "Bricolage Grotesque";letter-spacing:-.05em;margin:18px 0 6px;max-width:20ch}}
.hero .sub{{font:600 16px Inter;color:#333}}
.tiles{{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:20px}}
.tiles>div{{background:#fff;border:2px solid var(--ink);border-radius:18px;padding:12px 16px}}
.tiles small{{display:block;font:700 12.5px Inter;color:#555}}.tiles b{{display:block;font:800 26px/1.1 "Bricolage Grotesque";letter-spacing:-.03em;margin-top:4px}}.tiles span{{font:600 13px Inter;color:#444}}
.sec{{margin-top:48px}}
/* actualité */
.cos{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}}
.co{{border:2px solid var(--ink);border-radius:20px;padding:16px 18px;background:#fff}}
.co header{{display:flex;gap:12px;align-items:center;padding-bottom:12px;border-bottom:2px solid #EEE}}
.co header div{{flex:1;min-width:0}}.co header b{{display:block;font:800 18px "Bricolage Grotesque";letter-spacing:-.02em}}.co header small{{font:600 12.5px Inter;color:#666}}
.pv{{font:800 15px "Bricolage Grotesque";border:2px solid var(--ink);border-radius:999px;padding:3px 10px;background:var(--gz);color:var(--g);white-space:nowrap}}.pv.dn{{background:var(--rz);color:var(--r)}}
.co ul{{list-style:none}}.co li{{display:grid;grid-template-columns:118px 1fr;gap:12px;padding:12px 0;border-bottom:1px solid #F0F0F0}}.co li:last-child{{border-bottom:0;padding-bottom:0}}
.tg{{display:inline-block;align-self:start;text-align:center;font:700 12px Inter;border:2px solid var(--ink);border-radius:8px;padding:3px 6px}}
.t-res{{background:var(--y)}}.t-rach{{background:#EEECE6}}.t-pr{{background:#DCE7FF}}.t-acc{{background:#E8DCFF}}.t-div{{background:var(--gz)}}.t-obl{{background:#FFE3C7}}
.it-t{{font:700 15px/1.35 Inter}}.it-l{{font:500 14px/1.45 Inter;color:#333;margin-top:6px}}.it-s{{font:600 12px Inter;color:#777;margin-top:6px}}
.ch{{display:inline-block;background:#FAF9F5;border:1px solid #E6E4DE;border-radius:10px;padding:5px 9px;margin:8px 6px 0 0}}.ch small{{display:block;font:600 11px Inter;color:#666}}.ch b{{font:800 16px "Bricolage Grotesque"}}
.vide{{font:500 14px Inter;color:#666;padding-top:12px}}
.sub2{{font:800 18px "Bricolage Grotesque";margin:26px 0 12px}}
/* portefeuille */
.pfw{{display:grid;grid-template-columns:300px 1fr;gap:18px;align-items:start}}
.pfk{{background:var(--y);border:2px solid var(--ink);border-radius:20px;padding:18px 20px;box-shadow:4px 4px 0 var(--ink)}}.pfk small{{display:block;font:700 13px Inter;color:#444}}.pfk b{{display:block;font:800 40px/1.05 "Bricolage Grotesque";letter-spacing:-.04em;margin:4px 0}}
.cbs{{border:2px solid var(--ink);border-radius:20px;padding:16px 18px}}.cbs h3{{font:800 18px "Bricolage Grotesque";margin-bottom:10px}}
.cb{{display:grid;grid-template-columns:230px 1fr 90px 70px;gap:12px;align-items:center;padding:8px 0;border-bottom:1px solid #F0F0F0}}.cb:last-child{{border:0}}
.cbn{{display:flex;align-items:center;gap:10px;font:700 14.5px Inter}}.cbn .lg{{width:30px;height:30px;border-radius:8px}}.cbn small{{font:600 12px Inter;color:#777;margin-left:auto}}
.cbz{{position:relative;height:14px;background:linear-gradient(90deg,transparent calc(50% - 1px),#111 calc(50% - 1px) calc(50% + 1px),transparent calc(50% + 1px))}}
.cbz i{{position:absolute;top:0;height:14px;border-radius:4px;border:2px solid var(--ink)}}.cbz i.up{{left:50%;background:#7FE0B4}}.cbz i.dn{{right:50%;background:#FF9E8A}}
.cb>b{{font:800 16px "Bricolage Grotesque";text-align:right}}.cbv{{font:600 12.5px Inter;color:#666;text-align:right}}
.ias{{font:500 12.5px Inter;color:#666;margin-top:10px}}
/* contexte */
.ctx{{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}}.ctx>div{{border:2px solid var(--ink);border-radius:18px;padding:14px 16px}}
.ctx small{{font:700 12px Inter;color:#555}}.ctx h4{{font:800 17px/1.2 "Bricolage Grotesque";margin:4px 0 8px}}.ctx p{{font:500 13.5px/1.45 Inter;color:#333}}
.qui{{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}}.qui span{{font:700 12px Inter;border-radius:999px;padding:3px 9px;border:2px solid var(--ink)}}.s-m{{background:var(--rz)}}.s-pm{{background:#FFF1C2}}
/* agenda */
.ag{{border:2px solid var(--ink);border-radius:20px;overflow:hidden}}.ag div{{display:grid;grid-template-columns:90px 40px 1fr auto;gap:14px;align-items:center;padding:12px 18px;border-bottom:1px solid #EEE}}.ag div:last-child{{border:0}}
.ag .dt{{font:800 18px "Bricolage Grotesque";background:var(--y);border:2px solid var(--ink);border-radius:10px;text-align:center;padding:4px 0}}.ag .lg{{width:34px;height:34px}}.ag b{{font:700 15px Inter}}.ag em{{font:700 12px Inter;font-style:normal;color:#555}}
.foot{{font:500 12.5px Inter;color:#666;margin-top:40px;border-top:2px solid #EEE;padding-top:14px}}
@media(max-width:760px){{.w{{padding:18px 14px}}.tiles{{grid-template-columns:1fr 1fr}}.cos,.ctx,.pfw{{grid-template-columns:1fr}}.co li{{grid-template-columns:1fr;gap:6px}}.tg{{justify-self:start}}.cb{{grid-template-columns:1fr 70px;}}.cbz,.cbv{{display:none}}.ag div{{grid-template-columns:70px 1fr;}}.ag .lg,.ag em{{display:none}}}}
</style></head><body><div class="w">
<p class="note">Maquette v1 du rapport de la semaine. Profil d'exemple plus cohérent : un PEA d'environ 10 000 € (un ETF monde en socle, {fr(lignes[0]['poids'],0)} %, et quatre grandes entreprises françaises) et quatre favoris. Tous les chiffres et toutes les nouvelles viennent des données du site (cours de clôture du 28 octobre au 4 novembre, annonces officielles, presse) ; les articles qui disent d'acheter ou de vendre sont écartés. Ordre : ce qui a bougé, toute l'actualité de vos entreprises, ce qui a fait bouger le portefeuille, le contexte, ce qui arrive.</p>
<section class="hero"><p class="mast"><b>ENKLAIR</b><span>Votre rapport · semaine du 28 octobre au 4 novembre 2026</span></p>
<h1>Votre portefeuille a {"gagné" if g>=0 else "perdu"} {fr(abs(g),0)}&nbsp;€ cette semaine.</h1><p class="sub">{pct(gp)} sur {fr(tot0,0)} €. {nb} nouvelles sur vos neuf valeurs, dont {sum(1 for v in ACTU.values() for x in v if x[1]=='res')} publications de résultats.</p>
<div class="tiles"><div><small>Valeur au 4 novembre</small><b>{fr(tot,0)} €</b><span>5 lignes, dans un PEA</span></div>
<div><small>La plus forte hausse</small><b class="up">{pct(best['v'])}</b><span>{E(best['n'])}</span></div>
<div><small>La plus forte baisse</small><b class="dn">{pct(worst['v'])}</b><span>{E(worst['n'])}</span></div>
<div><small>À venir</small><b>12 nov.</b><span>Apple détache son dividende</span></div></div></section>

<section class="sec"><span class="stk b">L'actualité</span><h2>Ce qui s'est passé pour vos entreprises.</h2>
<p class="sub2">Dans votre portefeuille</p><div class="cos">{cartesPF}</div>
<p class="sub2">Dans vos favoris</p><div class="cos">{cartesFav}</div></section>

<section class="sec"><span class="stk p">Votre portefeuille</span><h2>Ce qui l'a fait bouger.</h2>
<div class="pfw"><div class="pfk"><small>Gain de la semaine</small><b class="{'up' if g>=0 else 'dn'}">{eur(g)}</b><small>{pct(gp)} · valeur {fr(tot,0)} €</small></div>
<div class="cbs"><h3>Ce que chaque ligne a apporté, en euros</h3>{contrib}<p class="ias">Gain de la ligne = nombre de parts × variation du cours sur la semaine. Une petite ligne qui monte beaucoup peut moins compter qu'une grosse ligne qui monte un peu.</p></div></div></section>

<section class="sec"><span class="stk v">Le contexte</span><h2>Ce qui touche leurs secteurs en ce moment.</h2>
<div class="ctx"><div><small>Géopolitique et énergie</small><h4>Moyen-Orient : pétrole cher, détroit d'Ormuz perturbé</h4><p>Fin octobre, le Brent tourne autour de 110 dollars le baril, contre 69 dollars en moyenne en 2025 (Banque mondiale).</p><div class="qui"><span class="s-pm">± TotalEnergies</span></div></div>
<div><small>Chine</small><h4>Croissance ralentie et consommation prudente</h4><p>Le PIB chinois a progressé de 4,5 % sur un an au 3e trimestre, en bas de l'objectif officiel.</p><div class="qui"><span class="s-m">− LVMH</span><span class="s-m">− Hermès</span></div></div>
<div><small>Technologie</small><h4>Investissements massifs dans l'intelligence artificielle</h4><p>Les grands groupes du numérique investissent dans des centres de données : plus de puces, de serveurs et d'électricité.</p><div class="qui"><span class="s-pm">± ASML</span><span class="s-pm">± Schneider Electric</span><span class="s-pm">± Air Liquide</span></div></div></div></section>

<section class="sec"><span class="stk">À venir</span><h2>Ce qui arrive pour vos valeurs.</h2>
<div class="ag"><div><span class="dt">12 nov.</span>{logo("apple.png")}<b>Apple détache son dividende de 0,27 $ par action</b><em>Favori</em></div>
<div><span class="dt">16 nov.</span>{logo("apple.png")}<b>Apple verse ce dividende</b><em>Favori</em></div>
<div><span class="dt">30 nov.</span>{logo("lvmh.png")}<b>LVMH : dernier jour pour acheter et toucher l'acompte sur dividende</b><em>Portefeuille</em></div>
<div><span class="dt">3 déc.</span>{logo("lvmh.png")}<b>LVMH verse un acompte de 5,50 € par action, soit 16,50 € pour vos 3 actions</b><em>Portefeuille</em></div>
<div><span class="dt">31 déc.</span>{logo("totalenergies.png")}<b>TotalEnergies détache son 2e acompte sur dividende</b><em>Portefeuille</em></div></div></section>
<p class="foot">Variations entre la clôture du 28 octobre et celle du 4 novembre (Google Finance, cours différés ; valeur liquidative officielle pour l'ETF). Annonces : documents officiels (AMF, SEC). Presse : articles relevés par le site, titres traduits quand ils ne sont pas en français. Information, pas conseil.</p>
</div></body></html>'''
open(B+'docs/maquettes/rapport-semaine-v1.html','w').write(html_)
print(fr(tot,0),eur(g),pct(gp),best['n'],pct(best['v']),worst['n'],pct(worst['v']),nb)
for l in lignes: print(l['n'],fr(l['val'],0),eur(l['gain']),pct(l['v']),fr(l['poids'],0))
