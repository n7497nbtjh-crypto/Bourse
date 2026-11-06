# Maquette v4 de « Ce qui s'est passé pour vos entreprises » (rapport de la semaine), données réelles du rapport d'exemple du 6/11.
import json, html, os
d = json.load(open('/tmp/rex2.json'))
BASE = '../../cf/site/logos/'
COUL = {'lvmh': '#7a3b2e', 'hermes': '#b4561b', 'sanofi': '#5b2a86', 'air-liquide': '#0c6cb4', 'apple': '#3a3a3c', 'schneider-electric': '#0c9c54', 'totalenergies': '#e0243c', 'asml': '#243c84'}
SECT = {'lvmh': 'Luxe', 'hermes': 'Luxe', 'sanofi': 'Santé', 'air-liquide': 'Chimie', 'apple': 'Technologie', 'schneider-electric': 'Équipements électriques', 'totalenergies': 'Énergie', 'asml': 'Semi-conducteurs'}
# Titres de presse étrangers : traduction affichée avec la mention « traduit » (comme sur le site)
TR = {
 'The Birkin fund cashing in on the Hermès luxury-resale market': 'Le fonds Birkin qui profite du marché de la revente de luxe Hermès',
 'Sanofi Aktie: Khalifa University ist jetzt mit an Bord': "Sanofi : l'université Khalifa rejoint le projet",
 "[미국 특징주] 뉴질랜드 첫 '손 콘퍼런스' 엔비디아·ASML 추천": "Valeurs américaines : Nvidia et ASML recommandées à la première « conférence Sohn » de Nouvelle-Zélande",
 '光刻机也卖光了！ASML 2028年产能被抢空：EUV光刻机出货量有望达120台': "Les machines de lithographie aussi en rupture : la production 2028 d'ASML déjà réservée, jusqu'à 120 machines EUV livrées",
 'LVMH Aktie: Zenith zielt aufs obere Preisregal': 'LVMH : Zenith vise le haut de gamme',
 'Could $10,000 Invested in ASML Set You Up for Life?': '10 000 dollars placés dans ASML peuvent-ils suffire pour la vie ?',
 "LVMH Deepens China Engagement With 'New Generations' Pavilion at CIIE": "LVMH renforce sa présence en Chine avec un pavillon « Nouvelles Générations » au salon CIIE",
 'LVMH Aktie: Baader stuft runter, der Kurs springt': 'LVMH : Baader abaisse sa recommandation, le cours bondit',
 'TotalEnergies signs HoA with Jiangsu Guoxin Group': "TotalEnergies signe un protocole d'accord avec le chinois Jiangsu Guoxin",
 'Aktie im Blick: Der Apple-Konzern hat ein Luxusproblem, die Aktie ebenso': "Apple a un problème de luxe, et son action aussi",
 'Apple and Home Depot join list of objectors to tokenized stock plan pushed by NYSE owner': "Apple et Home Depot s'opposent au projet d'actions « tokenisées » du propriétaire du NYSE",
 'Apple inquieta al mercado por la presión de los chips y la IA sobre sus márgenes': "Apple inquiète le marché : la pression des puces et de l'IA sur ses marges",
 'Schneider Electric and Greenly are helping SMEs to reduce emissions and operational costs': 'Schneider Electric et Greenly aident les PME à réduire leurs émissions et leurs coûts',
}
MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
def dt(s): y, m, j = s.split('-'); return f"{int(j)} {MOIS[int(m)-1]}"
def pct(v, d=1): s = f"{abs(v):.{d}f}".replace('.', ','); return ('+' if v > 0 else '−' if v < 0 else '') + s + ' %'
def e(s): return html.escape(str(s or ''))
def spark(serie, c, w=150, h=46):
    lo, hi = min(serie), max(serie); r = (hi - lo) or 1
    pts = [(i * w / (len(serie) - 1), h - 4 - (v - lo) / r * (h - 8)) for i, v in enumerate(serie)]
    p = ' '.join(f"{x:.1f},{y:.1f}" for x, y in pts)
    a = f"0,{h} " + p + f" {w},{h}"
    return f'<svg class="sp" viewBox="0 0 {w} {h}" width="{w}" height="{h}"><polygon points="{a}" fill="{c}" opacity=".10"/><polyline points="{p}" fill="none" stroke="{c}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/><circle cx="{pts[-1][0]-2}" cy="{pts[-1][1]}" r="3.6" fill="{c}"/></svg>'
L = {l['k']: l for l in d['lignes']}
A = {}
for a in d['annonces']: A.setdefault(a['k'], []).append(a)
TYPE = {'resultats': 'Résultats', 'presse': 'Presse', 'communique': 'Communiqué', 'capital': 'Réglementaire', 'accord': 'Accord'}
ROUTINE = lambda a: a['categorie'] == 'capital' or (a['categorie'] == 'communique' and not a.get('titre'))
def lead_of(lst):
    r = sorted([a for a in lst if a['categorie'] == 'resultats' and a.get('chiffres')], key=lambda a: not any('trimestre' in c[0] for c in a['chiffres']))
    if r: return r[0]  # le trimestre d'abord : c'est la nouvelle ; le rapport annuel reprend des chiffres en partie connus
    p = [a for a in lst if a['categorie'] == 'presse']
    # presse : un fait sur l'entreprise (accord, contrat, mise en service, production) avant les articles d'opinion ou de placement
    fait = lambda a: any(w in titre(a)[0].lower() for w in ('signe', 'accord', 'contrat', 'met en service', 'production', 'renforce', 'acquiert', 'lance'))
    opinion = lambda a: any(w in titre(a)[0].lower() for w in ('recommand', 'placés', '?', 'problème'))
    p.sort(key=lambda a: (not fait(a), opinion(a)))
    return p[0] if p else None
def titre(a):
    t = a.get('titre') or ''
    if a['categorie'] == 'resultats': t = {'Résultats': 'Résultats du trimestre juillet-septembre', 'Rapport annuel': "Rapport annuel de l'exercice clos fin septembre"}.get(t, t)
    return TR.get(t, t), t in TR
def chif(a):
    o = ''
    for lab, val in (a.get('chiffres') or [])[:3]:
        v, _, g = val.partition(' (')
        g = g.replace(' sur un an)', '').replace(')', '')
        gc = 'up' if g.startswith('+') else 'dn' if g[:1] in '−-' else ''
        o += f'<div class="fig"><span>{e(lab)}</span><b>{e(v)}</b>{f"<i class={gc}>{e(g)} sur un an</i>" if g else ""}</div>'
    return f'<div class="figs">{o}</div>' if o else ''
def src(a):
    n = a.get('source_nom') or a.get('site') or ''
    return f'<a class="src" href="{e(a.get("source"))}">{e(n)} ↗</a>'
def dossier(n, k):
    l = L[k]; idn = k[2:]; c = COUL.get(idn, '#333'); lst = sorted(A.get(k, []), key=lambda a: a['date'], reverse=True)
    lead = lead_of(lst); rest = [a for a in lst if a is not lead and not ROUTINE(a)]; rout = [a for a in lst if ROUTINE(a)]
    v = l['variation_semaine_pct']; pf = l.get('portefeuille') or {}
    meta = (f"{pf['poids_pct']:.0f} % de votre portefeuille" if pf.get('poids_pct') else 'Dans vos favoris') + ' · ' + SECT.get(idn, '')
    ind = l.get('indice')
    tous = [x for x in L.values() if x.get('en_portefeuille') == l.get('en_portefeuille') and x['type'] == 'action']
    rang = ''
    if v == max(x['variation_semaine_pct'] for x in tous): rang = 'Meilleure semaine ' + ('de votre portefeuille' if l.get('en_portefeuille') else 'de vos favoris')
    elif v == min(x['variation_semaine_pct'] for x in tous): rang = 'Plus forte baisse ' + ('de votre portefeuille' if l.get('en_portefeuille') else 'de vos favoris')
    nres = sum(1 for a in lst if a['categorie'] == 'resultats'); npr = sum(1 for a in lst if a['categorie'] == 'presse')
    bits = [rang] if rang else []
    bits.append(('résultats publiés' if nres else '') + (', ' if nres and npr else '') + (f'{npr} article{"s" if npr > 1 else ""} de presse' if npr else ''))
    deck = ' · '.join(b for b in bits if b)
    cmp_ = f'<div class="vs">{e(ind["nom"])} {pct(ind["pct"])}<br><b>{pct(l["ecart_pts"]).replace(" %", " pts")}</b> {"de mieux" if l["ecart_pts"] > 0 else "de moins"}</div>' if ind else ''
    h = f'''<article class="dos" style="--c:{c}"><div class="bande"></div>
<header><span class="num">{n:02d}</span><span class="lg"><img src="{BASE}{idn}.png" alt=""></span>
<div class="id"><h3>{e(l["nom"])}</h3><p>{e(meta)}</p>{f'<p class="deck">{e(deck)}</p>' if deck else ''}</div>
<div class="perf">{spark(l["serie"], c)}<div><b class="{"up" if v > 0 else "dn"}">{pct(v)}</b><small>sur la semaine</small></div>{cmp_}</div></header>'''
    if lead:
        t, tr = titre(lead)
        kick = f'{"Le fait de la semaine" if lead["categorie"] == "resultats" else "À lire cette semaine"} · {TYPE.get(lead["categorie"], "")} · {dt(lead["date"])}'
        lec = (lead.get('lecture') or [])[:2]
        h += f'''<section class="une"><p class="kick">{e(kick)}</p><h4>{e(t)}{' <em class="tr">traduit</em>' if tr else ''}</h4>{chif(lead)}
{f'<p class="lec">{e(" ".join(lec))}</p>' if lec else ''}<div class="act">{src(lead)}<button>✦ Expliquer</button></div>'''
        if lead['k'] == 'c:apple':
            h += '''<div class="ia"><b>✦ En clair</b><p>Apple a vendu pour 114,5 milliards de dollars entre juillet et septembre, 12 % de plus qu'un an plus tôt. Chaque action a rapporté 2,10 $ de bénéfice. Le dividende trimestriel est de 0,27 $.</p><small>Rédigé par l'IA d'ENKLAIR à partir de l'annonce. La source fait foi.</small></div>'''
        h += '</section>'
    if rest:
        h += '<section class="aussi"><p class="sub">Aussi cette semaine</p><ul>'
        for a in rest:
            t, tr = titre(a)
            h += f'<li><time>{dt(a["date"])}</time><span class="ty ty-{a["categorie"]}">{TYPE.get(a["categorie"], "")}</span><span class="t">{e(t)}{" <em class=tr>traduit</em>" if tr else ""}</span>{src(a)}<button class="mini">✦ Expliquer</button></li>'
        h += '</ul></section>'
    if rout:
        h += '<p class="reg">Publications réglementaires : ' + ' · '.join(f'{e(a.get("titre") or "communiqué déposé")} ({dt(a["date"])})' for a in rout) + '</p>'
    return h + '</article>'
def calme(k):
    l = L[k]; idn = k[2:].replace('amundi-msci-world-pea', 'amundi'); c = COUL.get(k[2:], '#555'); v = l['variation_semaine_pct']
    pf = l.get('portefeuille') or {}
    sous = (f"{pf['poids_pct']:.0f} % du portefeuille" if pf.get('poids_pct') else 'Favori') + ' · aucune annonce'
    return f'<tr><td class="cl"><span class="lg s"><img src="{BASE}{idn}.png" alt=""></span><span><b>{e(l["nom"])}</b><small>{e(sous)}</small></span></td><td class="cs">{spark(l["serie"], c, 84, 26)}</td><td class="cp {"up" if v > 0 else "dn"}">{pct(v)}</td></tr>'
port = sorted([k for k in L if L[k].get('en_portefeuille')], key=lambda k: -(L[k].get('portefeuille') or {}).get('poids_pct', 0))
fav = [k for k in L if L[k].get('favori')]
def bloc(titre_, ks, n0):
    act = [k for k in ks if A.get(k)]; q = [k for k in ks if not A.get(k)]
    o = f'<h2 class="grp">{titre_}<span>{len(act)} avec des nouvelles · {len(q)} sans</span></h2>'
    o += ''.join(dossier(n0 + i, k) for i, k in enumerate(act))
    if q: o += '<div class="calmes"><p class="sub">Sans nouvelle cette semaine</p><table class="ct">' + ''.join(calme(k) for k in q) + '</table></div>'
    return o, n0 + len(act)
b1, n = bloc('Dans votre portefeuille', port, 1); b2, _ = bloc('Dans vos favoris', fav, n)
CSS = open('/tmp/m4/style.css').read()
page = f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Maquette rapport v4</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"><style>{CSS}</style></head><body>
<p class="note">Maquette v4 : chaque entreprise devient un « dossier » à sa couleur (bande, courbe de la semaine, encadré). Le fait marquant est mis en avant (grands chiffres, lecture, ✦ Expliquer), le reste en liste courte, les publications réglementaires en une ligne. Les entreprises sans nouvelle sont regroupées en petites cartes. Données réelles du rapport d'exemple (semaine du 2 au 8 novembre).</p>
<main><p class="tag">L'actualité</p><h1>Ce qui s'est passé pour vos entreprises.</h1>
<p class="chap">{sum(1 for k in L if A.get(k))} de vos {len(L)} valeurs ont fait parler d'elles cette semaine. Une seule a publié des résultats : Apple.</p>
{b1}{b2}</main></body></html>'''
open('docs/maquettes/rapport-semaine-v4.html', 'w').write(page)
print('ok', len(page))
