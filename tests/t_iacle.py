# Clé personnelle (BYOK), chaîne de repli de l'IA et point d'entrée IA contextuel (module cf/site/m/iacle.js).
# Usage : python3 tests/t_iacle.py [--shots dossier]
# Vérifie surtout que la clé ne part jamais vers le site : toutes les requêtes vers t.local sont inspectées.
import os, sys, json
exec(open("tests/audit.py").read().split("CHECK = ")[0])  # route() et sync_playwright
STATE = {"in": True}  # membre connecté dans la maquette de audit.py
shots = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
CLE = "gsk_TEST_cle_factice_0123456789"
fails = []
def ok(c, m):
    print(("ok   " if c else "ÉCHEC ") + m)
    if not c: fails.append(m)

MODE = {"groq": "ok"}  # ok | 401 | filtre
vus = []  # requêtes vers le fournisseur
def groq(r):
    req = r.request
    if req.method == "OPTIONS": return r.fulfill(status=204, headers={"access-control-allow-origin": "*", "access-control-allow-headers": "authorization,content-type", "access-control-allow-methods": "POST"})
    vus.append({"auth": req.headers.get("authorization"), "body": req.post_data or ""})
    h = {"access-control-allow-origin": "*"}
    if MODE["groq"] == "401": return r.fulfill(status=401, headers=h, json={"error": {"message": "Invalid API Key"}})
    b = json.loads(req.post_data or "{}")
    if b.get("response_format"):
        txt = json.dumps({"action": "filtre", "titre": "Entreprises françaises peu endettées", "secteur": None, "region": "FR", "pea": False, "criteres": [{"indicateur": "dette", "condition": "inf_mediane"}], "tri": {"indicateur": "dette", "ordre": "asc"}})
    else:
        txt = "Réponse de la clé personnelle : LVMH vend surtout des produits de luxe, chiffres de 2024 à l'appui."
    return r.fulfill(headers=h, json={"choices": [{"message": {"role": "assistant", "content": txt}}]})

fuites = []
def espion(req):
    if "//t.local" in req.url:
        blob = req.url + json.dumps(dict(req.headers)) + (req.post_data or "")
        if CLE in blob or CLE[-8:] in blob: fuites.append(req.url)

with sync_playwright() as p:
    b = p.chromium.launch()
    for W in (1280, 390):
        vus.clear(); MODE["groq"] = "ok"
        ctx = b.new_context(viewport={"width": W, "height": 900})
        ctx.route("**/*", route)
        ctx.route("https://api.groq.com/**", groq)
        pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("request", espion)
        def wait(): pg.wait_for_timeout(700)
        # 1. Page Mon IA, dans Mon espace (connecté dans la maquette)
        pg.goto("http://t.local/espace/ia"); pg.wait_for_selector("#iakf", timeout=15000); wait()
        ok(pg.locator(".esptabs a.on").inner_text().strip() == "Mon IA", f"{W} : onglet « Mon IA » actif dans Mon espace")
        ok(pg.locator(".iak-ch li").count() == 5, f"{W} : les 5 étapes de la chaîne sont affichées")
        ok("Active" in pg.locator(".iak-ch li").nth(4).inner_text(), f"{W} : IA en ligne du site indiquée active")
        ok("jamais envoyée aux serveurs de bilan" in pg.inner_text("#iakf"), f"{W} : avertissement sur la clé")
        if shots: pg.screenshot(path=f"{shots}/iacle_espace_{W}.png", full_page=True)
        # 2. Mauvaise adresse refusée, puis clé enregistrée et testée
        pg.select_option("#iakf select[name=f]", "autre"); pg.fill("#iakf input[name=url]", "http://exemple.com/v1/chat/completions"); pg.fill("#iakf input[name=modele]", "x"); pg.fill("#iakf input[name=cle]", CLE)
        pg.click("#iakf button[type=submit]"); wait()
        ok("Adresse non acceptée" in pg.inner_text("#iakmsg"), f"{W} : adresse http extérieure refusée")
        pg.select_option("#iakf select[name=f]", "groq"); pg.fill("#iakf input[name=cle]", CLE)
        pg.click("#iakf button[type=submit]"); pg.wait_for_timeout(900)
        ok("votre clé fonctionne" in pg.inner_text("#iakmsg"), f"{W} : test de la clé réussi")
        ok(vus and vus[-1]["auth"] == "Bearer " + CLE, f"{W} : la clé part vers le service choisi")
        st = pg.evaluate("[sessionStorage.getItem('bilan.ia_cle'), localStorage.getItem('bilan.ia_cle')]")
        ok(st[0] and CLE in st[0] and not st[1], f"{W} : clé gardée pour la session seulement (case non cochée)")
        pg.wait_for_timeout(1200)
        ok("Active : Groq" in pg.inner_text(".iak-ch"), f"{W} : étape 4 active après enregistrement")
        # 3. Chaîne : la clé répond avant le serveur
        pg.goto("http://t.local/entreprise/lvmh"); pg.wait_for_timeout(1500)
        j = pg.evaluate("""async () => (await iaFetch('/api/assistant', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: 'Que pensez-vous de sa stratégie ?', faits: { entreprise: 'LVMH' } }) })).json()""")
        ok(j.get("ia") == "cle" and "clé personnelle" in j.get("txt", ""), f"{W} : /api/assistant servi par la clé personnelle")
        ok("Question : Que pensez-vous" in vus[-1]["body"] and "assistant" not in (vus[-1]["auth"] or ""), f"{W} : consigne et faits envoyés au service")
        j = pg.evaluate("""async () => (await iaFetch('/api/demande', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: 'des boites pas trop endettees svp' }) })).json()""")
        ok(j.get("action") == "filtre" and j.get("ia") == "cle", f"{W} : /api/demande traduit en filtre par la clé")
        n0 = len(vus)
        j = pg.evaluate("""async () => (await iaFetch('/api/veille/inscription', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json()""")
        ok(len(vus) == n0, f"{W} : les autres appels au serveur ne passent pas par la clé")
        # 4. Clé refusée : repli sur le serveur, avec un message
        MODE["groq"] = "401"
        j = pg.evaluate("""async () => (await iaFetch('/api/assistant', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: 'Une autre question longue ?', faits: {} }) })).json()""")
        wait()
        ok("txt" in j and j.get("ia") is None, f"{W} : clé refusée, le serveur répond")
        ok("refusée" in (pg.inner_text("#toast") if pg.locator("#toast").count() else ""), f"{W} : message « clé refusée » affiché")
        MODE["groq"] = "ok"
        # 5. Un seul point d'entrée IA : plus de lien dans le menu, bouton contextuel sur les listes
        pg.goto("http://t.local/entreprises"); pg.wait_for_selector("[data-iakctx]", timeout=15000)
        ok(pg.evaluate("document.querySelectorAll('.ddm a[href=\"/demander\"], #mpanel a[href=\"/demander\"]').length") == 1, f"{W} : un seul lien vers l'IA dans les menus (« Recherche par l'IA » retiré)")
        pg.click("[data-iakctx]"); wait()
        ctxt = pg.evaluate("[document.querySelector('#orcia').hidden, document.querySelector('#orciactx').textContent]")
        ok(not ctxt[0] and "Les entreprises" in ctxt[1], f"{W} : le bouton ouvre l'assistant central avec le contexte de la liste {ctxt}")
        ok(pg.locator("#orciaq .chip").count() >= 3, f"{W} : questions suggérées selon la liste")
        if shots: pg.screenshot(path=f"{shots}/iacle_entreprises_{W}.png")
        pg.keyboard.press("Escape")
        pg.goto("http://t.local/etf?cat=actions-monde&env=pea"); pg.wait_for_selector("[data-iakctx]", timeout=15000)
        pg.click("[data-iakctx]"); wait()
        ctxt = pg.evaluate("[location.href, document.querySelector('#orciactx').textContent]")
        ok("Les ETF" in ctxt[1] and "PEA" in ctxt[1], f"{W} : contexte ETF (filtres) transmis à l'assistant {ctxt}")
        ok("/espace/ia" in pg.inner_html("#orcia .orciaft"), f"{W} : lien « Réglages de l'IA » dans l'assistant")
        if shots: pg.screenshot(path=f"{shots}/iacle_etf_{W}.png")
        # 6. Suppression
        pg.goto("http://t.local/espace/ia"); pg.wait_for_selector("#iakdel", timeout=15000); pg.click("#iakdel"); wait()
        st = pg.evaluate("[sessionStorage.getItem('bilan.ia_cle'), localStorage.getItem('bilan.ia_cle')]")
        ok(not st[0] and not st[1], f"{W} : clé supprimée du navigateur")
        ok(pg.evaluate("document.documentElement.scrollWidth") <= W + 1, f"{W} : pas de débordement horizontal")
        ok(not fuites, f"{W} : la clé n'a jamais été envoyée au site {fuites[:2]}")
        ok(not errs, f"{W} : aucune erreur JavaScript {errs[:2]}")
        ctx.close()
    b.close()
print(f"\n{len(fails)} échec(s)" if fails else "\niacle : tout est bon")
sys.exit(1 if fails else 0)
