# Répartitions types et listes par critères (/repartitions), classements floutés et découvertes du jour, à 1440 et 390 px.
# Depuis la refonte du 29 octobre 2026 (point P0-6 de l'audit), la page n'établit plus de profil et ne propose plus
# de répartition ni de titres à la personne : le test vérifie aussi que ce ton a disparu.
# Usage : python3 tests/t_reco.py [--shots dossier]
import os, sys, json
exec(open("tests/audit.py").read().split("CHECK = ")[0])  # donne route() et sync_playwright
SHOTS = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
STATE = {"posts": []}
PREM = {"on": False}
def route3(r):
    u = r.request.url
    if "/api/cours" in u: return r.fulfill(status=404, body="")  # les vrais cours du site (data/cours.json)
    if PREM["on"] and "/api/premium/statut" in u: return r.fulfill(json={"premium": True})
    if "/api/espace/reco" in u:
        if r.request.method == "POST": STATE["posts"].append(json.loads(r.request.post_data or "{}"))
        return r.fulfill(json={"ok": True})
    if "/api/espace/moi" in u and STATE.get("in"):
        return r.fulfill(json={"connecte": True, "email": "t@exemple.fr", "premium": PREM["on"], "donnees": {"favoris": [], "portefeuille": None, "profil": STATE.get("profil")}, "nonlus": 0})
    return route(r)
CHK = r"""(W) => {
  const p = [];
  if (document.documentElement.scrollWidth > W + 1) p.push('page plus large : ' + document.documentElement.scrollWidth);
  document.querySelectorAll('#app *').forEach(e => { if (e.closest('.out-tabs,.scroll-x,.filters,.tabs,.chart,.bars,.qtabs')) return; const r = e.getBoundingClientRect(); if (r.width && r.right > W + 1) p.push('dépasse : ' + e.tagName + '.' + String(e.className).slice(0, 30)); });
  const t = document.querySelector('#app').textContent;
  if (/NaN|undefined|Infinity|\[object/.test(t)) p.push('NaN/undefined/Infinity');
  return [...new Set(p)].slice(0, 6);
}"""
bad = 0
def fail(*a):
    global bad; bad += 1; print("ÉCHEC", *a)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for nom, opts in [("ordi", dict(viewport={"width": 1440, "height": 900})), ("tel", dict(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2))]:
        W = opts["viewport"]["width"]
        ctx = b.new_context(**opts); pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e) + " @ " + pg.url + " " + (e.stack or "")[:300].replace("\n", " | ")))
        pg.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errs.append(m.text))
        pg.route("**/*", route3)
        shot = lambda n: SHOTS and (os.makedirs(SHOTS, exist_ok=True) or pg.screenshot(path=f"{SHOTS}/{nom}_{n}.png", full_page=True))
        # 1. La page : quatre exemples de répartition, expliqués, sans questionnaire ni profil
        pg.goto("http://t.local/repartitions"); pg.wait_for_timeout(1500)
        if pg.locator("#rc-form").count(): fail(nom, "un questionnaire de profil est encore affiché")
        if pg.locator(".rc-ex").count() != 4: fail(nom, "4 exemples de répartition attendus", pg.locator(".rc-ex").count())
        t = pg.inner_text("#app")
        for s2 in ["À quoi cet exemple correspond", "Ses limites", "Calcul sur cet exemple", "pas un conseil en investissement"]:
            if s2.lower() not in t.lower(): fail(nom, "texte manquant", s2)
        for s2 in ["pour vous", "votre profil", "selon votre profil", "à étudier"]:  # « conseil adapté à votre situation » reste : c'est le renvoi vers un CIF
            if s2 in t.lower(): fail(nom, "ton personnalisé", s2)
        p = pg.evaluate(CHK, W); p and fail(nom, "/repartitions", p)
        shot("repartitions")
        # rien n'est enregistré sur l'appareil
        if pg.evaluate("localStorage.getItem('bilan.profil') || localStorage.getItem('bilan.reco.retours')"): fail(nom, "la page enregistre encore des réponses")
        # 2. Le compte choisi change ce que chaque classe peut contenir
        pg.select_option("#rc-env", "pea"); pg.wait_for_timeout(300)
        if "Pas possible dans un PEA" not in pg.inner_text("#rc-ex"): fail(nom, "PEA : les obligations devraient être signalées comme impossibles")
        pg.select_option("#rc-env", "av"); pg.wait_for_timeout(300)
        if "Assurance-vie" not in pg.inner_text("#rc-ex"): fail(nom, "assurance-vie : placement non mis à jour")
        # 3. Liste d'ETF sur critères choisis
        n0 = pg.locator("#rc-l .rc-row").count()
        if n0 < 5: fail(nom, "liste d'ETF trop courte", n0)
        pg.select_option("#f-pea", "oui"); pg.wait_for_timeout(400)
        nok = pg.evaluate("[...document.querySelectorAll('#rc-l .rc-row .rc-pea')].filter(x => !x.classList.contains('rc-pea-ok')).length")
        if nok: fail(nom, "critère « éligible au PEA » non respecté", nok)
        pg.select_option("#f-ter", "0.15"); pg.wait_for_timeout(400)
        hors = pg.evaluate("""[...document.querySelectorAll('#rc-l .rc-row em')].map(e => e.textContent).filter(x => /^Frais /.test(x)).filter(x => parseFloat(x.replace(',', '.').match(/[\\d.]+/)[0]) > 0.15).length""")
        if hors: fail(nom, "critère « frais » non respecté", hors)
        p = pg.evaluate(CHK, W); p and fail(nom, "/repartitions ETF filtrés", p)
        # 4. Liste d'entreprises
        pg.click("[data-rc-type=ent]"); pg.wait_for_timeout(700)
        if pg.locator("#rc-l .rc-row").count() < 5: fail(nom, "liste d'entreprises trop courte", pg.locator("#rc-l .rc-row").count())
        pg.select_option("#f-sect", "sante"); pg.wait_for_timeout(500)
        if pg.locator("#rc-l .rc-row").count() < 1: fail(nom, "filtre par secteur : aucune entreprise")
        pg.select_option("#f-pea", "oui"); pg.wait_for_timeout(500)
        nok = pg.evaluate("[...document.querySelectorAll('#rc-l .rc-row .rc-pea')].filter(x => !x.classList.contains('rc-pea-ok')).length")
        if nok: fail(nom, "entreprises : critère PEA non respecté", nok)
        p = pg.evaluate(CHK, W); p and fail(nom, "/repartitions entreprises", p)
        shot("repartitions_entreprises")
        # 5. Ancienne adresse redirigée
        pg.goto("http://t.local/pour-moi"); pg.wait_for_timeout(1200)
        if pg.evaluate("location.pathname") != "/repartitions": fail(nom, "/pour-moi non redirigé", pg.evaluate("location.pathname"))
        # 6. Classements : aperçu flouté sans Premium
        pg.goto("http://t.local/classements"); pg.wait_for_timeout(1500)
        nb = pg.locator(".out-blur").count(); nv = pg.locator("a.out-row").count()
        if nb != 3 or nv < 5: fail(nom, "aperçu du classement", nb, nv)
        blur_txt = pg.evaluate("[...document.querySelectorAll('.out-blur')].map(e => e.textContent).join(' ')")
        top = pg.evaluate("outClRows('points', {}).slice(0, 3).map(x => x.c.name)")
        if any(n in blur_txt for n in top) or pg.evaluate("[...document.querySelectorAll('.out-blur a, .out-blur img')].length"): fail(nom, "nom d'une entreprise floutée présent dans la page")
        if pg.locator(".out-crit").count() != 1: fail(nom, "critères et limites non affichés")
        p = pg.evaluate(CHK, W); p and fail(nom, "/classements", p)
        shot("classements")
        PREM["on"] = True; pg.evaluate("localStorage.setItem('bilan.premium', 'tok')")
        ctx2 = b.new_context(**opts); pg2 = ctx2.new_page(); pg2.route("**/*", route3)
        pg2.add_init_script("try{localStorage.setItem('bilan.premium.token','x');localStorage.setItem('bilan.premium','x')}catch(e){}")
        pg2.goto("http://t.local/classements"); pg2.wait_for_timeout(1200)
        pg2.evaluate("PREM = { premium: true }"); pg2.evaluate("pageClassements()"); pg2.wait_for_timeout(1200)
        if pg2.locator(".out-blur").count() or pg2.locator("a.out-row").count() < 15: fail(nom, "Premium : liste complète attendue", pg2.locator(".out-blur").count(), pg2.locator("a.out-row").count())
        ctx2.close(); PREM["on"] = False
        # 7. Découvertes : diversité, ETF PEA, justifications
        pg.goto("http://t.local/decouvertes"); pg.wait_for_timeout(1800)
        d = pg.evaluate("""() => { const l = outDayPicks(TODAY, 6); return { n: l.length, sect: new Set(l.map(x => x.c.sector)).size, large: l.filter(x => x.T.t === 'large').length,
          small: l.filter(x => x.T.t === 'small' || x.T.t === 'micro').length, reg: [...new Set(l.map(x => x.c.region))], etf: outEtfPicks(TODAY, 2).map(e => [e.pea, e.categorie]) }; }""")
        if d["n"] < 5 or d["sect"] != d["n"] or d["large"] or d["small"] < 1 or len(d["reg"]) < 2: fail(nom, "diversité des découvertes", d)
        if len(d["etf"]) != 2 or any(not e[0] for e in d["etf"]) or d["etf"][0][1] == d["etf"][1][1]: fail(nom, "ETF du jour", d["etf"])
        txt = pg.inner_text("#app")
        for s in ["Activité", "Raison de la sélection", "Valorisation, catalyseurs et risques", "ETF éligibles au PEA"]:
            if s.lower() not in txt.lower(): fail(nom, "découvertes : manque", s)
        # 30 jours : aucune grande capitalisation, au moins une petite chaque jour
        mois = pg.evaluate("""() => Array.from({length: 30}, (_, k) => { const d = new Date(Date.parse(TODAY + 'T12:00:00Z') + k * 864e5).toISOString().slice(0, 10), l = outDayPicks(d, 6); return [l.length, l.filter(x => x.T.t === 'large').length, l.filter(x => x.T.t !== 'mid').length, new Set(l.map(x => x.c.sector)).size]; })""")
        if any(m[1] or m[0] < 5 or m[3] != m[0] or m[2] < 1 for m in mois): fail(nom, "30 jours de découvertes", [m for m in mois if m[1] or m[0] < 5 or m[3] != m[0] or m[2] < 1][:3])
        pg.evaluate("document.querySelectorAll('.out-dc .rc-det').forEach(d => d.open = true)"); pg.wait_for_timeout(900)
        p = pg.evaluate(CHK, W); p and fail(nom, "/decouvertes", p)
        shot("decouvertes")
        # 8. Accueil : bloc découvertes toujours rendu
        pg.goto("http://t.local/"); pg.wait_for_timeout(1500)
        p = pg.evaluate(CHK, W); p and fail(nom, "accueil", p)
        if errs: fail(nom, "erreurs JS", errs[:4])
        ctx.close()
    b.close()
print("t_reco.py :", "OK" if not bad else f"{bad} problème(s)")
sys.exit(1 if bad else 0)
