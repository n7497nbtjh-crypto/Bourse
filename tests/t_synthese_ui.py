# « Votre semaine en 2 minutes » : Mon espace et accueil d'un membre connecté, à 390 et 1280 px (maquette de test).
# Usage : python3 tests/t_synthese_ui.py [--shots dossier]
import os, sys, json, subprocess
from playwright.sync_api import sync_playwright
root = os.path.abspath("cf/site")
shots = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
SYN = subprocess.run(["node", "tests/synthese_maquette.mjs"], capture_output=True, text=True, check=True).stdout
VIDE = subprocess.run(["node", "tests/synthese_maquette.mjs", "vide"], capture_output=True, text=True, check=True).stdout
STATE = {"prem": True, "vide": False}  # 4/11 : le rapport de la semaine est réservé à Premium
COURS = {"c:lvmh": {"s": "EPA:MC", "cur": "EUR", "p": 597, "chg": -0.5, "cap": 3.0e11, "h52": 800, "l52": 520, "p1y": 690},
         "c:nvidia": {"s": "NASDAQ:NVDA", "cur": "USD", "p": 192.4, "chg": 1.8, "cap": 4.5e12, "h52": 212, "l52": 95, "p1y": 140},
         "c:totalenergies": {"s": "EPA:TTE", "cur": "EUR", "p": 55.5, "chg": 0.2, "cap": 1.2e11, "h52": 62, "l52": 50, "p1y": 58},
         "c:hermes": {"s": "EPA:RMS", "cur": "EUR", "p": 2120, "chg": 0.3, "cap": 2.2e11, "h52": 2600, "l52": 1950, "p1y": 2300},
         "c:air-liquide": {"s": "EPA:AI", "cur": "EUR", "p": 171, "chg": 0.6, "cap": 9.7e10, "h52": 190, "l52": 160, "p1y": 170},
         "e:amundi-msci-world-pea": {"s": "EPA:DCAM", "cur": "EUR", "p": 5.67, "chg": 0.1, "cap": None, "h52": 6, "l52": 5, "p1y": 5.2}}
def route(r):
    u = r.request.url
    if "/api/espace/moi" in u: return r.fulfill(json={"connecte": True, "email": "test@exemple.fr", "premium": STATE["prem"], "plan": None, "donnees": {"favoris": ["c:lvmh", "c:nvidia"], "portefeuille": None, "profil": None}, "nonlus": 2, "teaser": False})
    if "/api/espace/bilan" in u: return r.fulfill(body=VIDE if STATE["vide"] else SYN, content_type="application/json")
    if "/api/espace" in u: return r.fulfill(json={"ok": True})
    if "/api/premium/statut" in u: return r.fulfill(json={"premium": STATE["prem"]})
    if "/api/cours" in u: return r.fulfill(json={"updated": "2026-10-29T16:00:00Z", "items": COURS})
    if "/api/" in u: return r.fulfill(json={"items": []})
    if "//t.local" not in u: return r.fulfill(status=404, body="")
    path = u.split("//t.local", 1)[1].split("#")[0].split("?")[0]
    f = os.path.join(root, path.lstrip("/"))
    if os.path.isfile(f): return r.fulfill(path=f)
    if "." in path.rsplit("/", 1)[-1]: return r.fulfill(status=404, body="")
    return r.fulfill(path=os.path.join(root, "index.html"))
CHECK = r"""(W) => {
  const p = [];
  if (document.documentElement.scrollWidth > W + 1) p.push('page plus large que l\'écran : ' + document.documentElement.scrollWidth);
  document.querySelectorAll('main *').forEach(e => { if (e.closest('.scroll-x,.tabs,.chart,.bars,.filters,.qtabs')) return; const r = e.getBoundingClientRect(); if (r.width && r.right > W + 1) p.push('dépasse : ' + e.tagName + '.' + String(e.className).slice(0, 24)); });
  const t = document.querySelector('#app').textContent;
  if (t.includes('NaN') || t.includes('undefined') || t.includes('null')) p.push('NaN, null ou undefined affiché');
  if (t.includes('—')) p.push('tiret cadratin');
  return [...new Set(p)].slice(0, 6);
}"""
bad = 0
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for name, opts in [("ordi", dict(viewport={"width": 1280, "height": 900})), ("tel", dict(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2))]:
        ctx = b.new_context(accept_downloads=True, **opts); pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and "404" not in m.text and errs.append(m.text))
        pg.route("**/*", route)
        probs = {}
        W = opts["viewport"]["width"]
        # 3/11 : rapport v5 (synPageV5 de m/synthese.js) : trois chiffres, pourquoi ça a bougé, actualité, IA, favoris, agenda
        # 4/11 : sans Premium, la carte « Premium » remplace le rapport ; avec Premium, le rapport (actualité d'abord)
        STATE["prem"] = False
        pg.goto("http://t.local/espace"); pg.wait_for_selector(".es4-prem", timeout=8000)
        if "Votre semaine en 2 minutes" not in pg.inner_text("#app"): probs.setdefault("/espace gratuit", []).append("carte Premium absente")
        for prem in (True,):
            STATE["prem"] = prem
            pg.goto("http://t.local/espace"); pg.wait_for_selector(".s7", timeout=8000); pg.wait_for_timeout(300)
            txt = pg.inner_text("#app").replace("\xa0", " ").replace("\u202f", " ")
            for need in ("Mon portefeuille", "Mes favoris", "Ce qui s'est passé pour vos entreprises", "Dans votre portefeuille", "Vos prochaines dates", "LVMH", "TotalEnergies"):
                if need.lower() not in txt.lower(): probs.setdefault(f"/espace prem={prem}", []).append("manque : " + need)
            # 5/11 : rapport v6 (synPageV6) : cases en tête, une carte par valeur, au moins une annonce
            if pg.locator(".s7-kpis>span").count() < 2: probs.setdefault(f"/espace prem={prem}", []).append(f"{pg.locator('.s7-kpis>span').count()} pastilles en tête")
            if pg.locator(".s7-rw").count() != 6: probs.setdefault(f"/espace prem={prem}", []).append(f"{pg.locator('.s7-rw').count()} cartes de valeurs au lieu de 6")
            if pg.locator(".s7-rw li:not(.s7-vide)").count() < 1: probs.setdefault(f"/espace prem={prem}", []).append("aucune annonce")
            p = pg.evaluate(CHECK, W)
            if p: probs.setdefault(f"/espace prem={prem}", []).extend(p)
            if shots: os.makedirs(shots, exist_ok=True); pg.screenshot(path=f"{shots}/{name}_espace{'_prem' if prem else ''}.png", full_page=True)
        # Ajout à l'agenda : un fichier .ics est proposé
        with pg.expect_download() as dl: pg.locator("[data-synics]").first.click()
        d = dl.value; ics = open(d.path()).read()
        if "BEGIN:VCALENDAR" not in ics or "BEGIN:VEVENT" not in ics: probs["ics"] = ["fichier d'agenda incorrect"]
        # Accueil connecté : page d'accueil v4 sans erreur
        pg.goto("http://t.local/"); pg.wait_for_timeout(1500)
        p = pg.evaluate(CHECK, W)
        if p: probs["/ connecté"] = p
        # Rien à suivre
        STATE["vide"] = True
        pg.goto("http://t.local/espace"); pg.wait_for_timeout(2000)
        if "se construit avec ce que vous suivez" not in pg.inner_text("#app"): probs["vide"] = ["message d'accueil absent"]
        p = pg.evaluate(CHECK, W)
        if p: probs["/espace vide"] = p
        STATE["vide"] = False
        print(f"== {name} : problèmes : {len(probs)}, erreurs JS : {len(errs)}")
        for k, v in probs.items(): print("  ", k, v)
        for e in errs[:5]: print("   erreur :", e)
        bad += len(probs) + len(errs)
        ctx.close()
    b.close()
print("synthese (affichage) : " + ("tout est bon" if not bad else f"{bad} problème(s)"))
sys.exit(1 if bad else 0)
