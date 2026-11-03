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
        # 3/11 : pages v4 : la provenance n'est plus dans des bulles « i » mais dans le bloc « Prouvé » et les liens vers les documents
        for u, attendu in (("/entreprise/lvmh", "rapport annuel"), ("/entreprise/totalenergies", "rapport annuel"), ("/etf/amundi-msci-world-pea", "émetteur")):
            pg.goto(BASE + u); pg.wait_for_timeout(2500)
            ok(pg.locator(".ek-proof").count() == 1, tag + f"{u} : bloc « Prouvé »")
            t = pg.inner_text(".ek-proof") if pg.locator(".ek-proof").count() else ""
            ok(attendu in t.lower() and pg.locator(".ek-proof a[href^=http]").count() >= 1, tag + f"{u} : source nommée et lien vers le document")
            p = pg.evaluate(CHECK, W); ok(not p, tag + f"{u} sans débordement ni NaN {p}")
        pg.goto(BASE + "/comparer?ids=lvmh,kering,hermes"); pg.wait_for_timeout(2500)
        ok(pg.locator("#app a[href^=http]").count() >= 3, tag + "comparateur : liens vers les sources")
        p = pg.evaluate(CHECK, W); ok(not p, tag + f"comparateur sans débordement ni NaN {p}")
        # Vérifier une offre : trois issues
        pg.goto(BASE + "/outils/verifier"); pg.wait_for_timeout(1500)
        def cherche(q):
            pg.fill("#lnq", q); pg.wait_for_timeout(600); return pg.inner_text("#lnr")
        r = cherche(dom); ok("Signalé par l'AMF" in r, tag + f"correspondance trouvée ({dom})")
        r = cherche("https://www." + dom + "/inscription"); ok("Signalé par l'AMF" in r, tag + "adresse complète du site reconnue")
        r = cherche("crypto"); ok("Recherche insuffisante" in r and "ne prouve pas" in r, tag + "mot générique : recherche insuffisante")
        r = cherche("ab"); ok("Recherche insuffisante" in r, tag + "saisie trop courte : recherche insuffisante")
        r = cherche("zzqx-societe-inexistante-bilan.fr"); ok("Pas sur les listes noires" in r and "ne prouve pas" in r, tag + "aucune correspondance, avec le rappel")
        ok("mise à jour le" in pg.inner_text("#lns"), tag + "date de mise à jour de la liste")
        if SHOTS: pg.screenshot(path=f"{SHOTS}/{W}_verifier.png", full_page=True)
        p = pg.evaluate(CHECK, W); ok(not p, tag + f"vérifier sans débordement {p}")
        ok(not errs, tag + f"aucune erreur JavaScript {errs[:3]}")
        ctx.close()
    b.close()
print(f"{len(fails)} échec(s)")
sys.exit(1 if fails else 0)
