# Contrôle des données des 300 plus grosses capitalisations (1/11/2026, objectif « zéro chiffre faux »).
# Liste ce qui manque ou paraît douteux ; ne bloque pas la mise en ligne. Usage : python3 scripts/check_top300.py
import json, datetime
U = json.load(open('cf/site/data/univers-min.json'))['companies']; px = json.load(open('cf/site/data/cours.json'))['items']
av = json.load(open('cf/site/data/a-verifier.json'))['items']
top = sorted([c for c in U if px.get('c:' + c['id'], {}).get('cap')], key=lambda c: -px['c:' + c['id']]['cap'])[:300]
today = datetime.date.today(); P = {}
for c in top:
    try: s = json.load(open(f"cf/site/data/societes/{c['id']}.json"))
    except Exception: P.setdefault('sans comptes', []).append(c['id']); continue
    f = s.get('fin', {}); n = len(s['years']) - 1; v = lambda k: (f.get(k) or [None] * (n + 1))[n]
    fe = s.get('fyEnd') or '12-31'; clos = datetime.date(s['years'][n], int(fe[:2]), int(fe[3:5]))
    if (today - clos).days > 456: P.setdefault('comptes de plus de 15 mois', []).append(f"{c['id']} ({s['years'][n]})")
    bank = c['sector'] == 'finance'; ca, eb, nd, debt, cash = v('ca'), v('ebit'), v('netDebt'), v('debt'), v('cash')
    if not bank and ca is None: P.setdefault('ventes absentes', []).append(c['id'])
    if not bank and eb is None: P.setdefault("résultat d'exploitation absent", []).append(c['id'])
    if not bank and nd is None: P.setdefault('dette absente', []).append(c['id'])
    if not bank and nd is not None and nd < 0 and debt is not None and cash and ca and debt < 0.05 * ca and cash > 0.15 * ca: P.setdefault('trésorerie nette à contrôler', []).append(c['id'])
    if c['id'] in av: P.setdefault('à vérifier (saut d\'une année à l\'autre)', []).append(c['id'])
for k, l in P.items(): print(f"{k} : {len(l)}\n   {', '.join(l)}")
