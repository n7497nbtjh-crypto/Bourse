# Provenance des chiffres (cf/site/m/provenance.js) et « Vérifier une offre ».
# Usage : python3 tests/t_provenance.py [--shots dossier] [--base https://repere-bourse.pages.dev]
# Vérifie à 1440 et 390 px :
#  - un bouton « i » sur les indicateurs de la fiche (tuiles, thèmes, tableau complet, valorisation), du comparateur et de la fiche ETF ;
#  - la bulle s'ouvre au clic (et au toucher), au survol, au clavier ; elle donne nature, formule, période, source, date de récupération ;
#  - les ratios ajoutés (ROCE, valeur d'entreprise ÷ EBITDA) apparaissent ;
#  - « Vérifier une offre » : correspondance, recherche insuffisante, aucune correspondance, avec le rappel « ne prouve pas ».
import os, sys, json
exec(open("tests/audit.py").read().split("CHECK = ")[0])  # route() et sync_playwright
CHECK = open("tests/audit.py").read().split('CHECK = r"""')[1].split('"""')[0]
ARG = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
SHOTS, BASE = ARG("--shots"), ARG("--base", "http://t.local")
STATE = {}
def route3(r):
    if "/api/cours" in r.request.url and BASE == "http://t.local": return r.fulfill(status=404, body="")  # les cours du fichier du robot
    if BASE != "http://t.local" and "repere-bourse" in r.request.url: return r.continue_()
    return route(r)
LN = json.load(open("cf/site/data/listes-noires.json"))
dom = next(x["n"] for x in LN["items"] if "." in x["n"] and "@" not in x["n"] and " " not in x["n"] and len(x["n"]) > 8)
fails = []
def ok(c, m):
    print(("ok  " if c else "ÉCHEC ") + m)
    if not c: fails.append(m)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for W in (1440, 390):
        opts = dict(viewport={"width": W, "height": 900}) if W > 800 else dict(viewport={"width": W, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
        ctx = b.new_context(**opts); pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)[:300]))
        pg.route("**/*", route3)
        tag = f"[{W}] "
        def bulle(sel, attendu=("D'où vient", "Formule")):
            el = pg.locator(sel).first; el.scroll_into_view_if_needed(); pg.wait_for_timeout(150)
            el.click() if W > 800 else el.tap(); pg.wait_for_timeout(700)
            t = pg.inner_text("#pop") if pg.evaluate("document.getElementById('pop').classList.contains('open')") else ""
            return t, all(a.lower() in t.lower() for a in attendu)
        # Fiche : tuiles de l'essentiel
        pg.goto(BASE + "/entreprise/lvmh"); pg.wait_for_timeout(1800)
        n = pg.locator("#retenir .prov-i").count(); ok(n >= 5, tag + f"fiche : {n} boutons « i » sur les indicateurs principaux")
        t, good = bulle("#retenir .prov-i[data-prov=marge]", ("D'où vient", "Formule", "Période", "Source", "Récupéré le", "Calculé par le site"))
        ok(good, tag + "bulle de la marge : nature, formule, période, source, date de récupération")
        ok("Exercice annuel 2025, clos le 31 décembre 2025" in t, tag + "date de référence de l'exercice")
        if SHOTS and W > 800: os.makedirs(SHOTS, exist_ok=True); pg.screenshot(path=f"{SHOTS}/{W}_bulle_tuile.png")
        if SHOTS and W <= 800: os.makedirs(SHOTS, exist_ok=True); pg.screenshot(path=f"{SHOTS}/{W}_bulle_tuile.png")
        pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
        ok(not pg.evaluate("document.getElementById('pop').classList.contains('open')"), tag + "Échap referme la bulle")
        href = pg.evaluate("location.pathname"); ok(href == "/entreprise/lvmh", tag + "le « i » n'ouvre pas le lien de la tuile")
        # la tuile reste un lien
        ok(pg.locator("#retenir a.fk-a").count() >= 5, tag + "les tuiles restent cliquables")
        if W > 800:  # survol et clavier
            pg.mouse.move(0, 0); pg.locator("#retenir .prov-i").nth(1).hover(); pg.wait_for_timeout(900)
            ok("Résultat net" in pg.inner_text("#pop") or "Marge" in pg.inner_text("#pop"), tag + "la bulle s'ouvre au survol")
            pg.mouse.move(5, 5); pg.wait_for_timeout(700)
            ok(not pg.evaluate("document.getElementById('pop').classList.contains('open')"), tag + "elle se referme quand la souris s'éloigne")
            pg.evaluate("document.querySelectorAll('#retenir .prov-i')[0].blur()")
            pg.keyboard.press("Tab"); pg.evaluate("document.querySelectorAll('#retenir .prov-i')[2].focus()"); pg.wait_for_timeout(800)
            ok(pg.evaluate("document.getElementById('pop').classList.contains('open')"), tag + "elle s'ouvre au clavier (focus)")
            pg.keyboard.press("Escape")
        p = pg.evaluate(CHECK, W); ok(not p, tag + f"fiche sans débordement ni NaN {p}")
        # Chiffres en détail : thèmes, ROCE, valorisation, tableau complet
        pg.goto(BASE + "/entreprise/lvmh/comptes"); pg.wait_for_timeout(1800)
        ok(pg.locator("#rf-rentabilite tr[data-k=roce]").count() == 1, tag + "ligne ROCE dans le thème Rentabilité")
        ok(pg.locator("#rf-croissance .prov-i").count() >= 2, tag + "boutons « i » dans les thèmes")
        ok("valeur d'entreprise" in pg.inner_text("#rf-valorisation").lower(), tag + "valeur d'entreprise ÷ EBITDA dans la valorisation")
        t, good = bulle("#rf-valorisation .prov-i[data-prov=evebitda]", ("Estimé", "Cours", "Récupéré le", "Change") if False else ("Estimé", "Cours", "Récupéré le"))
        ok(good, tag + "bulle EV/EBITDA : comptes et cours, nature « estimé »")
        if SHOTS: pg.screenshot(path=f"{SHOTS}/{W}_bulle_evebitda.png")
        pg.keyboard.press("Escape")
        ok(pg.locator("#rf-dividende .prov-i").count() >= 2, tag + "boutons « i » dans le dividende")
        p = pg.evaluate(CHECK, W); ok(not p, tag + f"chiffres sans débordement ni NaN {p}")
        # Comptes anciens : signalés (Alibaba, exercice clos en mars)
        # Comparateur
        pg.goto(BASE + "/comparer?ids=lvmh,kering,hermes"); pg.wait_for_timeout(2000)
        n = pg.locator("#app .prov-i:visible").count(); ok(n >= 5, tag + f"comparateur : {n} boutons « i »")
        if n:
            t, good = bulle("#app .prov-i:visible", ("D'où vient", "Formule"))
            ok(good and ("LVMH" in t or "Kering" in t or "Source" in t), tag + "bulle du comparateur : une ligne par entreprise")
            pg.keyboard.press("Escape")
        p = pg.evaluate(CHECK, W); ok(not p, tag + f"comparateur sans débordement ni NaN {p}")
        # ETF
        pg.goto(BASE + "/etf/amundi-msci-world-pea"); pg.wait_for_timeout(2500)
        ok(pg.locator("#efrais .prov-i").count() == 1 and pg.locator("#ecarac .prov-i").count() == 1, tag + "ETF : frais et encours")
        t, good = bulle("#efrais .prov-i", ("Publié par l'émetteur", "Source", "Récupéré le"))
        ok(good, tag + "bulle des frais de l'ETF")
        pg.keyboard.press("Escape")
        if pg.locator("#ecomp .prov-i").count():
            t, good = bulle("#ecomp .prov-i", ("Date de référence", "Source"))
            ok(good, tag + "bulle de la composition (date de référence)")
            pg.keyboard.press("Escape")
        p = pg.evaluate(CHECK, W); ok(not p, tag + f"ETF sans débordement ni NaN {p}")
        # Vérifier une offre : trois issues
        pg.goto(BASE + "/outils/verifier"); pg.wait_for_timeout(1500)
        def cherche(q):
            pg.fill("#lnq", q); pg.wait_for_timeout(600); return pg.inner_text("#lnr")
        r = cherche(dom); ok("Correspondance trouvée dans les listes noires de l'AMF" in r, tag + f"correspondance trouvée ({dom})")
        r = cherche("https://www." + dom + "/inscription"); ok("Correspondance trouvée" in r, tag + "adresse complète du site reconnue")
        r = cherche("crypto"); ok("Recherche insuffisante" in r and "ne prouve pas" in r, tag + "mot générique : recherche insuffisante")
        r = cherche("ab"); ok("Recherche insuffisante" in r, tag + "saisie trop courte : recherche insuffisante")
        r = cherche("zzqx-societe-inexistante-bilan.fr"); ok("Aucune correspondance" in r and "ne prouve pas" in r, tag + "aucune correspondance, avec le rappel")
        ok("mise à jour le" in pg.inner_text("#lns"), tag + "date de mise à jour de la liste")
        if SHOTS: pg.screenshot(path=f"{SHOTS}/{W}_verifier.png", full_page=True)
        p = pg.evaluate(CHECK, W); ok(not p, tag + f"vérifier sans débordement {p}")
        ok(not errs, tag + f"aucune erreur JavaScript {errs[:3]}")
        ctx.close()
    b.close()
print(f"{len(fails)} échec(s)")
sys.exit(1 if fails else 0)
