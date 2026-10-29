# Import d'un fichier de courtier dans /portefeuille, à 1280 et 390 px (version gratuite puis Premium).
# Scénario de Romain : le portefeuille contient les six vieilles lignes (vendues depuis) d'un import raté ;
# le fichier Trade Republic a ses 12 positions actuelles en fin de fichier.
# Usage : python3 tests/t_portefeuille_import.py [--shots dossier]
import os, sys, json
exec(open("tests/audit.py").read().split("CHECK = ")[0])  # donne route() et sync_playwright
SHOTS = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
FX = os.path.abspath("tests/fixtures/portefeuille/traderepublic-romain.csv")
OLD = {"v": 3, "maj": 1, "cfg": {}, "l": [{"k": "c:" + k, "q": q, "pru": p, "br": "trade-republic"} for k, q, p in [
    ("orange", 20, 10.5), ("carrefour", 10, 17.8), ("renault", 5, 36.2), ("ubisoft", 8, 28.4), ("air-france-klm", 30, 11.2), ("engie", 15, 15.1)]]}
CHK = r"""(W) => {
  const p = [];
  if (document.documentElement.scrollWidth > W + 1) p.push('page plus large : ' + document.documentElement.scrollWidth);
  document.querySelectorAll('#app *').forEach(e => { if (e.closest('.scroll-x,.pf3nav')) return; const r = e.getBoundingClientRect(); if (r.width && r.right > W + 1) p.push('dépasse : ' + e.tagName + '.' + String(e.className).slice(0, 30)); });
  if (/NaN|undefined|Infinity|\[object/.test(document.querySelector('#app').textContent)) p.push('NaN/undefined/Infinity');
  return [...new Set(p)].slice(0, 6);
}"""
LIVE = "JSON.parse(localStorage.getItem('bilan.portefeuille')).l.filter(l => PF3.linePos(l).q > 0).map(l => l.k)"
STATE = {}
bad = 0
def fail(*a):
    global bad; bad += 1; print("ÉCHEC", *a)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for nom, opts, prem in [("ordi", dict(viewport={"width": 1280, "height": 900}), False), ("tel", dict(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2), False), ("prem", dict(viewport={"width": 1280, "height": 900}), True)]:
        ctx = b.new_context(**opts)
        ctx.add_init_script("try{if(!sessionStorage.getItem('init')){sessionStorage.setItem('init','1');localStorage.setItem('bilan.portefeuille'," + json.dumps(json.dumps(OLD)) + ")" + (";localStorage.setItem('bilan.premium','jeton-test')" if prem else "") + "}}catch(e){}")
        pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errs.append(m.text))
        def rt(r):
            if prem and "/api/premium/statut" in r.request.url: return r.fulfill(json={"premium": True})
            return route(r)
        pg.route("**/*", rt)
        def open_file():
            pg.goto("http://t.local/portefeuille"); pg.wait_for_timeout(900)
            pg.click("#pf3imp"); pg.wait_for_timeout(200)
            pg.set_input_files("#pf3file", FX); pg.wait_for_timeout(700)
        open_file()
        txt = pg.inner_text("#pf3ires")
        n, c = pg.locator(".pf3ip").count(), pg.locator(".pf3ip input[data-sel]:checked").count()
        if n != 12 or c != (12 if prem else 10): fail(nom, "positions détenues / pré-cochées", n, c)
        act = pg.inner_text(".pf3ipl")
        for x in ("Orange", "Carrefour", "Renault", "Ubisoft", "Air France", "Engie"):
            if x in act: fail(nom, "position vendue affichée comme détenue :", x)
        for x in ("Amundi PEA Monde", "TotalEnergies", "LVMH", "Hermès", "Airbus", "Sanofi"):
            if x.lower() not in act.lower(): fail(nom, "position active absente :", x)
        if "Positions vendues depuis (6)" not in txt or pg.locator("[data-usold]:checked").count() != 6: fail(nom, "vendues : 6 attendues, à marquer vendues dans le portefeuille")
        if not prem and "version gratuite suit 10 positions actives" not in txt: fail(nom, "explication de la limite absente")
        if "54 lignes lues" not in txt: fail(nom, "lignes lues", txt[:200])
        if not prem:  # les deux plus petites positions ne sont pas cochées
            off = [t.split("\n")[0] for t in pg.locator(".pf3ip:not(.on) .pf3ipn").all_inner_texts()]
            if len(off) != 2: fail(nom, "positions non cochées", off)
        p = pg.evaluate(CHK, opts["viewport"]["width"])
        if p: fail(nom, "aperçu", p)
        if SHOTS: os.makedirs(SHOTS, exist_ok=True); pg.locator("#pf3impr").screenshot(path=f"{SHOTS}/{nom}_import_apercu.png")
        # 1. « Ajouter ou mettre à jour » : les six vieilles lignes sont marquées vendues, les positions actuelles importées
        pg.click("#pf3igo"); pg.wait_for_timeout(700)
        live = pg.evaluate(LIVE)
        if len(live) != (12 if prem else 10) or any(k in live for k in ("c:orange", "c:engie")): fail(nom, "positions actives après import", live)
        if pg.evaluate("JSON.parse(localStorage.getItem('bilan.portefeuille')).l.length") != (18 if prem else 16): fail(nom, "lignes vendues gardées avec leur historique")
        bak = pg.evaluate("JSON.parse(localStorage.getItem('bilan.portefeuille.avant-import')||'null')")
        if not bak or len(bak["p"]["l"]) != 6: fail(nom, "sauvegarde de l'ancien portefeuille")
        if "Restaurer" not in pg.inner_text("#pf3notice"): fail(nom, "bouton de restauration absent")
        if not prem and not pg.evaluate("pfFullQuiet(pf2Load())"): fail(nom, "10 positions actives : la limite gratuite devrait être atteinte")
        pg.wait_for_timeout(400)
        p = pg.evaluate(CHK, opts["viewport"]["width"])
        if p: fail(nom, "après import", p)
        if SHOTS: pg.screenshot(path=f"{SHOTS}/{nom}_import_fait.png", full_page=False)
        # 2. Restaurer l'ancien portefeuille
        pg.click("#pf3notice [data-rest=i]"); pg.wait_for_timeout(500)
        if sorted(pg.evaluate(LIVE)) != sorted("c:" + x for x in ("orange", "carrefour", "renault", "ubisoft", "air-france-klm", "engie")): fail(nom, "restauration")
        # 3. « Remplacer » : confirmation explicite quand des positions du fichier ne sont pas toutes cochées
        open_file()
        pg.click(".pf3chips[data-g=imode] button[data-v=replace]"); pg.wait_for_timeout(250)
        # (les six anciennes lignes seraient retirées, et en gratuit deux positions du fichier ne sont pas cochées)
        if not pg.locator("#pf3igo").is_disabled() or not pg.locator("#pf3iconf").count(): fail(nom, "remplacement incomplet sans confirmation")
        else: pg.check("#pf3iconf"); pg.wait_for_timeout(200)
        if pg.locator("#pf3igo").is_disabled(): fail(nom, "bouton désactivé")
        if SHOTS and nom == "tel": pg.locator("#pf3impr").screenshot(path=f"{SHOTS}/{nom}_import_remplacer.png")
        pg.click("#pf3igo"); pg.wait_for_timeout(600)
        if len(pg.evaluate(LIVE)) != (12 if prem else 10) or pg.evaluate("JSON.parse(localStorage.getItem('bilan.portefeuille')).l.length") != (12 if prem else 10): fail(nom, "remplacement")
        if errs: fail(nom, "erreurs JS", errs[:3])
        ctx.close()
    b.close()
print("import du portefeuille :", "tout est bon" if not bad else f"{bad} problème(s)")
sys.exit(1 if bad else 0)
