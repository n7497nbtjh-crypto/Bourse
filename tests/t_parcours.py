# Module « parcours » : Apprendre (point d'entrée unique, Académie, redirections) et rapport de la semaine sur mesure
# (assistant en 3 étapes, onglet « Mon rapport », accueil des visiteurs, Premium), à 1440 et 390 px.
# Usage : python3 tests/t_parcours.py [--shots dossier]
import os, sys, json, subprocess
from playwright.sync_api import sync_playwright
root = os.path.abspath("cf/site")
shots = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
def maq(*a): return subprocess.run(["node", "tests/synthese_maquette.mjs", *a], capture_output=True, text=True, check=True).stdout
SYN = {"complet": maq("plein", json.dumps({"secteurs": ["conso", "energie"]})), "court": maq("plein", json.dumps({"secteurs": ["conso"], "detail": "court", "sujets": {"lecons": True}})),
       "secteurs": maq("plein", json.dumps({"favoris": False, "portefeuille": False, "secteurs": ["conso", "energie"]}))}
DEF = {"v": 1, "favoris": True, "portefeuille": True, "secteurs": [], "indices": ["cac40", "stoxx50", "sp500", "nasdaq100", "dax", "ftse100", "nikkei"], "detail": "complet", "sujets": {"resultats": True, "dividendes": True, "actualite": True, "lecons": True}, "jour": 6, "notif": True, "configure": False}
STATE = {"in": False, "rapport": dict(DEF), "syn": "complet", "posts": []}
# Cours de clôture de TEST (inventés pour l'essai d'affichage, jamais publiés)
CS = {"dates": ["2026-10-21", "2026-10-22", "2026-10-23", "2026-10-26", "2026-10-27", "2026-10-28"],
      "items": {"c:lvmh": [640, 635, 630, 620, 610, 600], "c:totalenergies": [54, 54.2, 54.8, 55, 55.3, 55.4], "c:air-liquide": [167, 168, 169, 170, 170.5, 171], "c:bp": [4.6, 4.6, 4.55, 4.5, 4.52, 4.5], "c:eni": [15, 15.1, 15.1, 15.2, 15.3, 15.2]}}
COURS = {"c:lvmh": {"s": "EPA:MC", "cur": "EUR", "p": 597, "chg": -0.5, "cap": 3.0e11, "h52": 800, "l52": 520, "p1y": 690}, "c:totalenergies": {"s": "EPA:TTE", "cur": "EUR", "p": 55.5, "chg": 0.2, "cap": 1.2e11, "h52": 62, "l52": 50, "p1y": 58}}
def route(r):
    u, meth = r.request.url, r.request.method
    if "/api/espace/moi" in u:
        return r.fulfill(json={"connecte": True, "email": "test@exemple.fr", "premium": False, "plan": None, "donnees": {"favoris": ["c:lvmh", "c:nvidia"], "portefeuille": None, "profil": {"rapport": STATE["rapport"]}}, "nonlus": 1, "teaser": False} if STATE["in"] else {"connecte": False})
    if "/api/espace/rapport" in u:
        if meth == "POST":
            b = json.loads(r.request.post_data or "{}"); STATE["posts"].append(b); STATE["rapport"] = {**DEF, **b}
            return r.fulfill(json={"ok": True, "rapport": STATE["rapport"], "max_secteurs": 2, "premium": False})
        return r.fulfill(json={"rapport": STATE["rapport"], "defaut": DEF, "max_secteurs": 2, "premium": False})
    if "/api/espace/bilan" in u: return r.fulfill(body=SYN[STATE["syn"]], content_type="application/json")
    if "/api/espace/notifs" in u: return r.fulfill(json={"nonlus": 0, "notifs": []})
    if "/api/espace" in u: return r.fulfill(json={"ok": True})
    if "/api/premium/offres" in u: return r.fulfill(json={"mensuel": None, "unique": None, "limites": {"resume": [5, 80], "assistant": [3, 40], "veille": [1, 10], "portefeuille": [1, 10]}})
    if "/api/premium/statut" in u: return r.fulfill(json={"premium": False})
    if "/api/cours" in u: return r.fulfill(json={"updated": "2026-10-29T16:00:00Z", "items": COURS})
    if "/api/" in u: return r.fulfill(json={"items": []})
    if "//t.local" not in u: return r.fulfill(status=404, body="")
    path = u.split("//t.local", 1)[1].split("#")[0].split("?")[0]
    if path == "/data/cours-semaine.json": return r.fulfill(json=CS)
    f = os.path.join(root, path.lstrip("/"))
    if os.path.isfile(f): return r.fulfill(path=f)
    if "." in path.rsplit("/", 1)[-1]: return r.fulfill(status=404, body="")
    return r.fulfill(path=os.path.join(root, "index.html"))
CHECK = r"""(W) => {
  const p = [];
  if (document.documentElement.scrollWidth > W + 1) p.push('page plus large que l\'écran : ' + document.documentElement.scrollWidth);
  document.querySelectorAll('main *').forEach(e => { if (e.closest('.scroll-x,.tabs,.chart,.bars,.filters,.qtabs')) return; const r = e.getBoundingClientRect(); if (r.width && r.right > W + 1) p.push('dépasse : ' + e.tagName + '.' + String(e.className).slice(0, 30)); });
  const t = document.querySelector('#app').textContent;
  if (/NaN|undefined|\bnull\b/.test(t)) p.push('NaN, null ou undefined affiché');
  if (t.includes('—')) p.push('tiret cadratin');
  if (document.querySelector('#app a[href^="/debuter"]')) p.push('lien vers /debuter');
  return [...new Set(p)].slice(0, 6);
}"""
bad = 0
def pb(name, cond, msg):
    global bad
    if not cond: bad += 1; print("ÉCHEC", name, ":", msg)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for name, opts in [("ordi", dict(viewport={"width": 1440, "height": 900})), ("tel", dict(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2))]:
        W = opts["viewport"]["width"]
        ctx = b.new_context(**opts); ctx.add_init_script('try{localStorage.setItem("bilan.favoris",JSON.stringify(["c:lvmh","c:totalenergies"]))}catch(e){}')
        pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e) + " @ " + pg.url))
        pg.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errs.append(m.text))
        pg.route("**/*", route)
        def look(path, shot=None, wait=600):
            pg.goto("http://t.local" + path); pg.wait_for_timeout(wait)
            p = pg.evaluate(CHECK, W); pb(f"{name} {path}", not p, p)
            if shots and shot: os.makedirs(shots, exist_ok=True); pg.screenshot(path=f"{shots}/{name}_{shot}.png", full_page=True)
        STATE.update({"in": False, "rapport": dict(DEF), "posts": []})
        # Apprendre : un seul point d'entrée
        look("/apprendre", "apprendre")
        pb(name, pg.locator(".pa-niv").count() == 3 and pg.locator(".pa-niv.cur").count() == 1 and pg.locator(".ap4 a.ou4-c").count() >= 3, "les 3 niveaux et les repères")  # 3/11 : Apprendre v4 (apprendre4.js)
        pb(name, pg.locator(".pa-deep .pa-mods a").count() == 8, "« Approfondir » (8 modules)")
        look("/academie", "academie"); pb(name, pg.evaluate("location.pathname") == "/apprendre" and pg.locator(".pa-niv").count() == 3, "/academie ouvre Apprendre et ses 3 niveaux")  # 3/11 : la porte unique est /apprendre
        look("/idees-recues", "idees"); pb(name, pg.locator(".ir").count() == 12, "les 12 idées reçues")
        pg.click("#trader .ir4-pli:nth-child(2) summary"); pg.wait_for_timeout(300)  # 3/11 : idées reçues v4 (idees4.js), plus de quiz
        pb(name, pg.locator("#trader .cm-viz").count() == 1 and pg.locator("#casino .ir4-ret").count() == 1 and pg.locator(".ir4-som a").count() == 12, "idées reçues : sommaire, données dépliées, à retenir")
        look("/academie/express", "express"); pb(name, pg.locator(".pa-niv").count() == 3, "les 3 niveaux du parcours court")
        look("/academie/express/lire"); pb(name, pg.locator(".acal").count() >= 6, "liste des leçons du niveau")
        look("/academie/express/lire/dette-nette", "express_lecon"); pb(name, pg.locator(".par-deep a[href='/academie/comptes/bilan']").count() == 1, "lien Approfondir")
        look("/academie/bases/inflation"); pb(name, pg.locator(".pa-irl[href='/idees-recues#livret-a']").count() == 1, "idée reçue liée en fin de leçon")
        look("/academie/express/prix/quiz")
        for de, vers in (("/debuter", "/apprendre"), ("/debuter/bases", "/academie/express/bases"), ("/debuter/lire/per", "/academie/express/lire/per"), ("/premiers-pas", "/academie/express")):  # 3/11 : /debuter mène à /apprendre
            pg.goto("http://t.local" + de); pg.wait_for_timeout(400); pb(name, pg.url.endswith(vers), f"{de} redirigé vers {pg.url}")
        look("/academie/comptes/bilan"); pb(name, pg.locator('.crumbs a[href="/apprendre"]').count() == 1, "fil d'Ariane Apprendre sur une leçon")
        look("/lexique"); pb(name, pg.locator(".lx4 .lx4-c").count() >= 40 and pg.locator(".lx4-pills a").count() == 10, "lexique : les notions et les dix essentielles")  # 3/11 : lexique v4
        look("/commencer", "commencer"); look("/pea-cto"); look("/outils")
        pb(name, pg.locator('.cards a[href="/debuter"], .cards a[href="/commencer"]').count() == 0, "page Outils sans les cours")
        menu = pg.evaluate("[...document.querySelectorAll('#nav [data-g=deb] a, #mpanel a')].map(a => a.getAttribute('href'))")
        pb(name, "/apprendre" in menu and not any(h.startswith("/debuter") for h in menu), "menu Apprendre " + str(menu))
        # Accueil d'un visiteur : aperçu calculé et invitation
        look("/", "accueil_visiteur", 1200)
        pb(name, pg.locator("#app a[href^='/espace'], #app a[href^='/rapport-exemple']").count() >= 1, "l'accueil mène à Mon espace ou au rapport exemple")  # 3/11 : accueil v4
        look("/premium", "premium"); pb(name, pg.locator(".pr4 .prem-a").count() == 5 and "rapport sur mesure" in pg.inner_text(".ptab").lower(), "Premium : cinq arguments et le rapport sur mesure dans le tableau")  # 3/11 : Premium v4
        # Mon espace : assistant au premier passage
        STATE.update({"in": True, "syn": "complet"})
        pg.goto("http://t.local/espace"); pg.wait_for_timeout(900)
        pb(name, pg.locator("#parwf").count() == 1, "assistant affiché")
        if shots: pg.screenshot(path=f"{shots}/{name}_assistant1.png", full_page=True)
        p = pg.evaluate(CHECK, W); pb(name + " assistant", not p, p)
        pg.locator("#parwf input[name=sect][value=energie]").check(force=True); pg.locator("#parwf input[name=sect][value=conso]").check(force=True)
        pb(name, pg.locator("#parwf input[name=sect][value=tech]").is_disabled(), "2 secteurs au plus sans Premium")
        pg.click("#parnext"); pg.wait_for_timeout(300)
        pg.locator("#parwf input[name=detail][value=court]").check(force=True)
        if shots: pg.screenshot(path=f"{shots}/{name}_assistant2.png", full_page=True)
        pg.click("#parnext"); pg.wait_for_timeout(500)
        pg.locator("#parwf input[name=jour][value='1']").check(force=True)
        if shots: pg.screenshot(path=f"{shots}/{name}_assistant3.png", full_page=True)
        p = pg.evaluate(CHECK, W); pb(name + " assistant 3", not p, p)
        pg.click("#parnext"); pg.wait_for_timeout(1200)
        post = STATE["posts"][-1] if STATE["posts"] else {}
        pb(name, post.get("secteurs") == ["conso", "energie"] and post.get("detail") == "court" and post.get("jour") == 1 and post.get("configure") is True, "réglages envoyés " + json.dumps(post))
        pb(name, pg.locator("#espb .s5").count() == 1, "rapport de la semaine affiché après les réglages")  # 3/11 : rapport v5 (synPageV5)
        if shots: pg.screenshot(path=f"{shots}/{name}_espace_rapport.png", full_page=True)
        p = pg.evaluate(CHECK, W); pb(name + " synthèse", not p, p)
        # Version courte
        STATE["syn"] = "court"; pg.goto("http://t.local/espace"); pg.wait_for_timeout(900)
        pb(name, pg.locator("#espb .s5").count() == 1, "rapport de la semaine, version courte")  # 3/11 : rapport v5 ; l'ancien découpage court/complet (#synint, #parplus) n'existe plus
        if shots: pg.screenshot(path=f"{shots}/{name}_espace_court.png", full_page=True)
        # Rapport des seuls secteurs
        STATE["syn"] = "secteurs"; pg.goto("http://t.local/espace"); pg.wait_for_timeout(900)
        pb(name, pg.locator("#synsect .par-sect").count() == 2 and "secteur" in pg.inner_text(".synk").lower(), "rapport des seuls secteurs")
        p = pg.evaluate(CHECK, W); pb(name + " secteurs seuls", not p, p)
        if shots: pg.screenshot(path=f"{shots}/{name}_espace_secteurs.png", full_page=True)
        # Onglet « Mon rapport »
        STATE["syn"] = "complet"; look("/espace/rapport", "mon_rapport", 900)
        pb(name, pg.locator("#parrf").count() == 1 and pg.locator('.esptabs a.on[href="/espace/rapport"]').count() == 1, "onglet Mon rapport")
        pg.locator("#parrf input[name=suj][value=dividendes]").uncheck(force=True); pg.click("#parsave"); pg.wait_for_timeout(500)
        pb(name, STATE["posts"][-1]["sujets"]["dividendes"] is False and "Enregistré" in pg.inner_text("#parmsg"), "enregistrement depuis l'onglet")
        look("/", "accueil_membre", 1200); pb(name, pg.locator("#app a[href^='/espace']").count() >= 1, "lien vers Mon espace sur l'accueil d'un membre")  # 3/11 : accueil v4
        pb(name, not errs, errs[:4])
        print(f"== {name} : {bad} problème(s), erreurs JS : {len(errs)}")
        ctx.close()
    b.close()
print("parcours : tout est bon" if not bad else f"parcours : {bad} problème(s)")
sys.exit(1 if bad else 0)
