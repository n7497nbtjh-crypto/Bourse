# L'IA du site (cf/site/m/monia.js côté navigateur, cf/src/iasite.mjs côté serveur, testé dans t_compte.mjs).
# Ici, le serveur est simulé : réponses rédigées dans le panneau ✦ et le copilote, tâche et faits envoyés au serveur,
# aucune consigne ni clé dans le navigateur, aucun appel à un éditeur d'IA, limite du jour (visiteur puis site) :
# la réponse calculée reste et une ligne explique pourquoi. Page « L'IA du site ».
# Usage : python3 tests/t_monia.py   (captures dans /tmp/monia_*.png)
import os, sys, json
exec(open("tests/audit.py").read().split("CHECK = ")[0])  # donne route() et sync_playwright
STATE = {}
B = "https://t.local"
fails = []
def ok(c, m):
    if not c: fails.append(m); print("ÉCHEC", m)
    else: print("ok  ", m)
FILTRE = json.dumps({"action": "filtre", "titre": "Entreprises françaises peu endettées", "secteur": None, "region": "FR", "pea": None, "criteres": [{"indicateur": "dette", "condition": "inf", "valeur": 1}], "tri": "dette", "explication": "Entreprises françaises dont la dette est faible."})
ST = {"appels": [], "ext": [], "mode": "ok"}
def route3(r):
    u = r.request.url
    if any(h in u for h in ("openrouter.ai", "api.openai.com", "api.anthropic.com", "googleapis.com/v1", "api.mistral.ai")): ST["ext"].append(u); return r.fulfill(status=500, body="")
    if "/api/ia/etat" in u:
        if ST["mode"] == "epuise": return r.fulfill(json={"disponible": False, "site_epuise": True, "reste_visiteur": 2, "plafond_visiteur": 3, "niveau": "visiteur", "plafonds": {"visiteur": 3, "compte": 10, "premium": 150}})
        return r.fulfill(json={"disponible": True, "reste_visiteur": 2, "plafond_visiteur": 3, "site_epuise": False, "niveau": "visiteur", "plafonds": {"visiteur": 3, "compte": 10, "premium": 150}})
    if "/api/ia/rediger" in u:
        b = json.loads(r.request.post_data or "{}"); ST["appels"].append(b)
        if ST["mode"] == "limite": return r.fulfill(status=429, json={"limite": "visiteur", "niveau": "visiteur", "message": "Vous avez posé vos 3 questions rédigées du jour."})
        if b.get("tache") == "demande": return r.fulfill(json={"txt": FILTRE, "modele": "Qwen3 30B"})
        return r.fulfill(json={"txt": "Réponse rédigée de test : la marge reste au-dessus de la médiane du secteur.\nSources : comptes annuels publiés par l'entreprise (ESEF).", "modele": "Qwen3 30B"})
    return route(r)

with sync_playwright() as pw:
    br = pw.chromium.launch()
    for W, H in ((1280, 900), (390, 844)):
        ST.update({"appels": [], "ext": [], "mode": "ok"})
        ctx = br.new_context(viewport={"width": W, "height": H}, ignore_https_errors=True); pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.route("**/*", route3)
        tag = f"[{W}] "
        # 1. Page « L'IA du site »
        pg.goto(B + "/espace/ia", timeout=90000); pg.wait_for_function("document.querySelector('#miareste') && /reste 2 aujourd/.test(document.querySelector('#miareste').innerText)", timeout=20000)
        t = pg.inner_text("#app")
        ok("Gratuite, sans compte et sans clé" in t and "IA du site : gratuite" in t and "clé" not in t.split("Comment elle répond")[1].split("Aucun compte")[0], tag + "page L'IA du site : gratuite, reste du jour affiché")
        pg.screenshot(path=f"/tmp/monia_page_{W}.png", full_page=True)
        ok(pg.evaluate("document.documentElement.scrollWidth") <= W + 1, tag + "pas de débordement horizontal")
        # 2. Fiche : question rédigée par l'IA du site
        pg.goto(B + "/entreprise/lvmh"); pg.wait_for_selector("#orciab", state="attached", timeout=20000); pg.wait_for_timeout(600)
        pg.evaluate("orcIaOpen()"); pg.wait_for_timeout(200)
        ok("IA du site : gratuite" in pg.inner_text("#orcia"), tag + "panneau ✦ : « IA du site : gratuite »")
        pg.evaluate("orcIaAsk('Expliquez concrètement le métier de LVMH', { rediger: true })")
        pg.wait_for_function("document.querySelector('#orcialog').innerText.includes('Rédigé par')", timeout=15000)
        t = pg.inner_text("#orcialog"); ok("Réponse rédigée de test" in t and "Sources" in t and "IA de bilan." in t and "Qwen3" in t, tag + "réponse rédigée affichée, signalée, avec ses sources")
        a = ST["appels"][-1]
        ok(a["tache"] == "assistant" and "Faits :" in a["user"] and "mediane_du_secteur" in a["user"] and "Question : Expliquez" in a["user"], tag + "tâche, faits et question envoyés au serveur")
        ok("Règles d'objectivité" not in json.dumps(a) and set(a) <= {"tache", "user", "max"}, tag + "aucune consigne envoyée par le navigateur (le serveur garde les siennes)")
        pg.screenshot(path=f"/tmp/monia_panneau_{W}.png")
        # 3. Copilote : question libre traduite en recherche calculée
        n0 = len(ST["appels"]); pg.goto(B + "/demander?q=quelles+boites+ont+une+gouvernance+exemplaire+selon+vous")
        try: pg.wait_for_function("document.querySelector('#iaout') && /remplissent|Aucune entreprise/.test(document.querySelector('#iaout').innerText)", timeout=15000)
        except Exception: print("DEBUG", pg.inner_text("#iaout")[:300] if pg.query_selector("#iaout") else "")
        ok(any(x["tache"] == "demande" for x in ST["appels"][n0:]), tag + "copilote : question libre envoyée à l'IA du site")
        # 4. Limite du visiteur atteinte : la réponse calculée reste, une ligne explique
        ST["mode"] = "limite"; pg.goto(B + "/entreprise/lvmh"); pg.wait_for_selector("#orciab", state="attached"); pg.wait_for_timeout(600)
        pg.evaluate("orcIaOpen()"); pg.evaluate("orcIaAsk('Expliquez concrètement le métier de LVMH', { rediger: true })"); pg.wait_for_timeout(1500)
        t = pg.inner_text("#orcialog"); ok("questions rédigées du jour" in t and "revient demain" in t and "compte gratuit" in t and "Premium" in t, tag + "limite du visiteur : explication et marche suivante " + t[-200:])
        n1 = len(ST["appels"]); pg.evaluate("orcIaAsk('Pourquoi la marge baisse ?', { rediger: true })"); pg.wait_for_timeout(1000)
        ok(len(ST["appels"]) == n1, tag + "après la limite : plus d'appel au serveur sur cette page")
        ok("limite du jour atteinte" in pg.inner_text("#orcia"), tag + "panneau : « Réponses calculées (limite du jour atteinte) »")
        # 5. Part gratuite du site épuisée (connue dès l'arrivée)
        ST["mode"] = "epuise"; n2 = len(ST["appels"]); pg.goto(B + "/espace/ia"); pg.wait_for_function("/épuisée/.test(document.querySelector('#miareste').innerText)", timeout=15000)
        ok(len(ST["appels"]) == n2, tag + "part du site épuisée : aucune question envoyée")
        # 6. Rien vers un éditeur d'IA, aucune ancienne clé gardée
        ok(not ST["ext"], tag + f"aucun appel direct à un éditeur d'IA {ST['ext'][:2]}")
        pg.evaluate("localStorage.setItem('bilan.monia', JSON.stringify({ f: 'openai', key: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx' }))"); pg.goto(B + "/"); pg.wait_for_timeout(1200)
        ok(pg.evaluate("localStorage.getItem('bilan.monia')") is None, tag + "ancienne clé effacée du navigateur")
        ok(not [e for e in errs if "ResizeObserver" not in e], tag + "aucune erreur JavaScript " + str(errs[:3]))
        ctx.close()
    br.close()
print(f"{len(fails)} échec(s)" if fails else "monia : tout est bon")
sys.exit(1 if fails else 0)
