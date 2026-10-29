# Pistes personnalisées (/pour-moi), classements floutés et découvertes du jour, à 1440 et 390 px.
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
ANS = {"horizon": 2, "liquidite": 2, "precaution": 2, "capital": 2, "versement": 2, "perte": 2, "baisse": 2, "objectif": 2, "connaissance": 1, "choisir": 1, "enveloppe": 0}
PF = {"v": 3, "l": [{"k": "e:amundi-msci-world-pea", "m": 12000, "env": "pea"}, {"k": "c:lvmh", "m": 4000, "env": "pea"}, {"k": "c:nvidia", "m": 3000, "env": "pea"}, {"k": "c:klepierre", "m": 1500, "env": "pea"}]}
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
        # 1. Questionnaire vide puis rempli au clic
        pg.goto("http://t.local/pour-moi"); pg.wait_for_timeout(1500)
        if pg.locator("#rc-form fieldset").count() != 11: fail(nom, "11 questions attendues", pg.locator("#rc-form fieldset").count())
        p = pg.evaluate(CHK, W); p and fail(nom, "/pour-moi vide", p)
        shot("pourmoi_vide")
        for k, v in ANS.items():
            pg.click(f"#rc-form input[name={k}][value='{v}'] + span"); pg.wait_for_timeout(60)
        pg.wait_for_timeout(1500)
        t = pg.inner_text("#rc-out")
        for s in ["Votre profil", "Répartition indicative", "ETF à étudier", "Entreprises à étudier", "points de vigilance"]:
            if s.lower() not in t.lower(): fail(nom, "section manquante", s)
        stored = pg.evaluate("JSON.parse(localStorage.getItem('bilan.profil'))")
        if any(stored.get(k) != v for k, v in ANS.items()): fail(nom, "réponses mal enregistrées", stored)
        # PEA : toutes les pistes affichées sont éligibles
        nok = pg.evaluate("[...document.querySelectorAll('#rc-out .rc-card:not(.rc-sect) .rc-pea')].filter(x => !x.classList.contains('rc-pea-ok')).length")
        if nok: fail(nom, "piste non éligible au PEA proposée pour un PEA", nok)
        if pg.locator("#rc-out .rc-card").count() < 5: fail(nom, "trop peu de pistes", pg.locator("#rc-out .rc-card").count())
        p = pg.evaluate(CHK, W); p and fail(nom, "/pour-moi rempli", p)
        # ouvrir les détails d'une entreprise : catalyseurs chargés
        pg.evaluate("document.querySelectorAll('#rc-out .rc-det').forEach(d => d.open = true)"); pg.wait_for_timeout(800)
        if "Chargement des annonces" in pg.inner_text("#rc-out"): fail(nom, "catalyseurs non chargés")
        shot("pourmoi_resultats")
        # 2. Retour « trop risquée » sur la piste la plus risquée : le plafond baisse
        risks = pg.evaluate("[...document.querySelectorAll('#rc-out .rc-card[data-id^=\"c:\"], #rc-out .rc-card[data-id^=\"e:\"]')].map(c => +c.querySelector('.rc-risk').className.match(/rc-r(\\d)/)[1])")
        mx = max(risks)
        cid = pg.evaluate(f"[...document.querySelectorAll('#rc-out .rc-card[data-id^=\"c:\"], #rc-out .rc-card[data-id^=\"e:\"]')].find(c => c.querySelector('.rc-r{mx}')).dataset.id")
        eq0 = pg.inner_text(".rc-vs")
        pg.click(f".rc-fb[data-fb='{cid}'] button[data-v=risque]"); pg.wait_for_timeout(500)
        risks2 = pg.evaluate("[...document.querySelectorAll('#rc-out .rc-card[data-id^=\"c:\"], #rc-out .rc-card[data-id^=\"e:\"]')].map(c => +c.querySelector('.rc-risk').className.match(/rc-r(\\d)/)[1])")
        if max(risks2) >= mx: fail(nom, "après « trop risquée », risque max", mx, "→", max(risks2))
        if pg.locator(f"#rc-out .rc-card[data-id='{cid}']").count(): fail(nom, "la piste jugée trop risquée est encore affichée")
        if pg.inner_text(".rc-vs") == eq0: fail(nom, "la part d'actions n'a pas bougé", eq0)
        ret = pg.evaluate("JSON.parse(localStorage.getItem('bilan.reco.retours'))")
        if not ret or ret[-1]["v"] != "risque": fail(nom, "retour non enregistré", ret)
        # « redondante » sur un ETF : remplacé
        eid = pg.evaluate("document.querySelector('#rc-out .rc-card[data-id^=\"e:\"]').dataset.id")
        pg.click(f".rc-fb[data-fb='{eid}'] button[data-v=redondant]"); pg.wait_for_timeout(400)
        if pg.locator(f"#rc-out .rc-card[data-id='{eid}']").count(): fail(nom, "ETF redondant encore affiché")
        # effacer les retours
        pg.evaluate("document.querySelector('#rc-out details.acc').open = true"); pg.click("#rc-reset"); pg.wait_for_timeout(400)
        if pg.evaluate("JSON.parse(localStorage.getItem('bilan.reco.retours')).filter(r => r.v).length"): fail(nom, "retours non effacés")
        # 3. Avec un portefeuille : points de vigilance et lignes déjà détenues exclues
        pg.evaluate(f"localStorage.setItem('bilan.portefeuille', {json.dumps(json.dumps(PF))})")
        pg.goto("http://t.local/pour-moi"); pg.wait_for_timeout(1800)
        v = pg.inner_text("#rc-out")
        if "Klépierre" not in v or "Nvidia" not in v: fail(nom, "Klépierre (SIIC) et Nvidia (États-Unis) dans un PEA non signalées", v[:300])
        if pg.locator("#rc-out .rc-card[data-id='e:amundi-msci-world-pea']").count(): fail(nom, "ETF déjà détenu proposé")
        p = pg.evaluate(CHK, W); p and fail(nom, "/pour-moi portefeuille", p)
        shot("pourmoi_portefeuille")
        # 4. Version compacte (accueil, Mon espace)
        h = pg.evaluate("recoAccueilHTML()")
        if "Votre profil" not in h or "/pour-moi" not in h: fail(nom, "version compacte", h[:200])
        h2 = pg.evaluate("localStorage.removeItem('bilan.profil'); recoEspaceHTML()")
        if "Trouver mes pistes" not in h2: fail(nom, "compacte sans profil", h2[:200])
        # 5. Compte connecté : réponses et retours envoyés au serveur
        STATE["in"] = True; STATE["posts"].clear(); STATE["profil"] = {"rapport": {"x": 1}, **ANS}
        pg.goto("http://t.local/pour-moi"); pg.wait_for_timeout(1500)
        if pg.locator("#rc-form").count(): fail(nom, "les réponses du compte ne sont pas reprises")
        cid = pg.evaluate("document.querySelector('#rc-out .rc-card[data-id^=\"e:\"]').dataset.id")
        pg.click(f".rc-fb[data-fb='{cid}'] button[data-v=ok]"); pg.wait_for_timeout(1000)
        if not STATE["posts"] or not any(r.get("v") == "ok" for r in STATE["posts"][-1].get("retours", [])): fail(nom, "retour non envoyé au compte", STATE["posts"][-1:] )
        STATE["in"] = False; pg.evaluate("localStorage.clear()")
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
