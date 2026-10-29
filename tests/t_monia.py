# « Connecter mon IA » (cf/site/m/monia.js) : flux OpenRouter complet avec des réponses simulées.
# PKCE (défi S256 vérifié), échange du code, liste des modèles, appel du modèle avec consignes, faits et sources,
# copilote, déconnexion ; et surtout : la clé n'est jamais envoyée au site. Sans IA connectée : réponses calculées + invitation.
# Usage : python3 tests/t_monia.py   (captures dans /tmp/monia_*.png)
import os, sys, json, re, base64, hashlib
from urllib.parse import urlparse, parse_qs
exec(open("tests/audit.py").read().split("CHECK = ")[0])  # donne route() et sync_playwright
STATE = {}  # route() de audit.py : visiteur non connecté
CLE = "sk-or-v1-CLE-SECRETE-DE-TEST-0123456789"
B = "https://t.local"
fails = []
def ok(c, m):
    if not c: fails.append(m); print("ÉCHEC", m)
    else: print("ok  ", m)

ST = {"defi": None, "etat": None, "echange": None, "appels": [], "site": []}
MODELES = {"data": [
    {"id": "meta-llama/llama-3.3-70b-instruct:free", "name": "Meta: Llama 3.3 70B Instruct (free)", "created": 1733000000, "context_length": 131072, "pricing": {"prompt": "0", "completion": "0"}, "architecture": {"input_modalities": ["text"], "output_modalities": ["text"]}},
    {"id": "mistralai/mistral-small-3.2-24b-instruct:free", "name": "Mistral: Mistral Small 3.2 24B (free)", "created": 1750000000, "context_length": 131072, "pricing": {"prompt": "0", "completion": "0"}, "architecture": {"input_modalities": ["text", "image"], "output_modalities": ["text"]}},
    {"id": "mistralai/mistral-small-3.2-24b-instruct", "name": "Mistral: Mistral Small 3.2 24B", "created": 1750000000, "context_length": 131072, "pricing": {"prompt": "0.0000001", "completion": "0.0000003"}, "architecture": {"input_modalities": ["text"], "output_modalities": ["text"]}},
    {"id": "openai/gpt-image-1", "name": "OpenAI: image", "created": 1760000000, "context_length": 32000, "pricing": {"prompt": "0.00001", "completion": "0.00004"}, "architecture": {"input_modalities": ["text"], "output_modalities": ["image"]}},
    {"id": "qwen/qwen3-coder:free", "name": "Qwen3 Coder (free)", "created": 1760000000, "context_length": 262000, "pricing": {"prompt": "0", "completion": "0"}},
]}
FILTRE = json.dumps({"action": "filtre", "titre": "Entreprises françaises peu endettées", "secteur": None, "region": "FR", "pea": None, "criteres": [{"indicateur": "dette", "condition": "inf", "valeur": 1}], "tri": {"indicateur": "capitalisation", "ordre": "desc"}, "limite": 10})

def route3(r):
    u = r.request.url
    if u.startswith(B) or "//t.local" in u:
        tout = u + " " + json.dumps(r.request.headers) + " " + (r.request.post_data or "")
        ST["site"].append(tout)
        if "/api/" in u and not any(k in u for k in ("/api/premium/statut", "/api/espace", "/api/cours", "/api/amf", "/api/presse", "/api/communaute")): return r.fulfill(status=410, json={"error": "retirée"})
        return route(r)
    if "openrouter.ai" not in u: return route(r)
    pu = urlparse(u); q = parse_qs(pu.query); h = r.request.headers
    if pu.path == "/auth":
        ST["defi"] = q.get("code_challenge", [None])[0]; ST["etat"] = q.get("state", [None])[0]; ST["auth"] = q
        cb = q.get("callback_url", [""])[0]
        # page d'autorisation simulée : renvoie vers callback_url avec le code (comme OpenRouter après « Autoriser »)
        return r.fulfill(content_type="text/html", body="<!doctype html><title>OpenRouter (simulé)</title><script>location.replace(" + json.dumps(cb + "?code=CODE-TEST&state=" + (ST["etat"] or "")) + ")</script>")
    if pu.path == "/api/v1/auth/keys":
        b = json.loads(r.request.post_data or "{}"); ST["echange"] = b
        v = b.get("code_verifier") or ""
        calc = base64.urlsafe_b64encode(hashlib.sha256(v.encode()).digest()).decode().rstrip("=")
        if r.request.method != "POST" or b.get("code") != "CODE-TEST" or b.get("code_challenge_method") != "S256" or calc != ST["defi"]: return r.fulfill(status=403, json={"error": "Invalid code or code_verifier"})
        return r.fulfill(json={"key": CLE, "user_id": "u_test"}, headers={"access-control-allow-origin": "*"})
    if pu.path == "/api/v1/models": return r.fulfill(json=MODELES, headers={"access-control-allow-origin": "*"})
    if pu.path == "/api/v1/key":
        if h.get("authorization") != "Bearer " + CLE: return r.fulfill(status=401, json={})
        return r.fulfill(json={"data": {"label": "bilan.", "is_free_tier": True, "free_model_daily_requests": {"used": 3, "limit": 50, "remaining": 47}}}, headers={"access-control-allow-origin": "*"})
    if pu.path == "/api/v1/chat/completions":
        if h.get("authorization") != "Bearer " + CLE: return r.fulfill(status=401, json={"error": {"message": "clé"}})
        b = json.loads(r.request.post_data or "{}"); ST["appels"].append(b)
        sys_ = b["messages"][0]["content"]; user = b["messages"][1]["content"]
        if sys_.startswith("Tu es le moteur de recherche"): txt = FILTRE
        elif sys_.startswith("Tu expliques à une personne qui débute en Bourse une annonce"): txt = json.dumps({"clair": "L'entreprise annonce ses ventes du trimestre, avec les chiffres fournis.", "change": "Cela renseigne sur son activité récente."})
        else: txt = "Réponse rédigée de test : la marge reste au-dessus de la médiane du secteur.\nSources : comptes annuels publiés par l'entreprise (ESEF), médianes du secteur calculées par bilan."
        return r.fulfill(json={"id": "gen-1", "model": b.get("model"), "choices": [{"message": {"role": "assistant", "content": txt}}]}, headers={"access-control-allow-origin": "*"})
    return r.fulfill(status=404, body="")

with sync_playwright() as pw:
    br = pw.chromium.launch()
    for W, H in ((1280, 900), (390, 844)):
        ST.update({"appels": [], "site": []})
        ctx = br.new_context(viewport={"width": W, "height": H}, ignore_https_errors=True); pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.route("**/*", route3)
        tag = f"[{W}] "
        # 1. Sans IA connectée : page « Mon IA », panneau ✦ en « Réponses calculées », invitation discrète
        pg.goto(B + "/espace/ia", timeout=90000); pg.wait_for_selector("[data-mia-connect]", timeout=20000)
        t = pg.inner_text("#app"); ok("Connecter mon IA" in t and "jamais envoyée" in t and "ChatGPT ou Claude" in t, tag + "page Mon IA sans connexion")
        pg.screenshot(path=f"/tmp/monia_off_{W}.png", full_page=True)
        ok(pg.evaluate("document.documentElement.scrollWidth") <= W + 1, tag + "pas de débordement horizontal (Mon IA)")
        pg.goto(B + "/entreprise/lvmh", timeout=90000); pg.wait_for_selector("#orciab", state="attached", timeout=20000); pg.wait_for_timeout(600)
        pg.evaluate("orcIaOpen()"); pg.wait_for_timeout(200)
        ok("Réponses calculées" in pg.inner_text("#orcia"), tag + "panneau ✦ : « Réponses calculées »")
        pg.evaluate("orcIaAsk('Expliquez concrètement le métier de LVMH', { rediger: true })"); pg.wait_for_timeout(1200)
        t = pg.inner_text("#orcialog"); ok("Connectez votre IA" in t, tag + "sans IA : invitation discrète " + t[:100])
        ok(not ST["appels"], tag + "aucun appel au modèle sans connexion")
        # 2. Connexion : PKCE, retour sur /espace/ia?code=…, échange du code
        pg.goto(B + "/espace/ia"); pg.wait_for_selector("[data-mia-connect]")
        pg.click("[data-mia-connect]")
        try: pg.wait_for_selector(".mia-mod, .mia-msg.ko", timeout=20000)
        except Exception: print("DEBUG", pg.url, errs[:3]); print(pg.content()[:300])
        a = ST.get("auth") or {}
        ok(a.get("code_challenge_method") == ["S256"] and len(ST["defi"] or "") == 43 and a.get("callback_url") == [B + "/espace/ia"], tag + "défi PKCE S256 et adresse de retour " + json.dumps(a)[:200])
        ok(ST["echange"] and ST["echange"].get("code") == "CODE-TEST" and len(ST["echange"].get("code_verifier", "")) == 43, tag + "échange du code avec le vérificateur")
        ok("code=" not in pg.url, tag + "le code ne reste pas dans l'adresse")
        st = pg.evaluate("JSON.parse(localStorage.getItem('bilan.monia'))")
        ok(st and st.get("key") == CLE and st.get("model") == "mistralai/mistral-small-3.2-24b-instruct:free", tag + "clé gardée dans le navigateur, premier modèle gratuit choisi (Mistral) " + json.dumps(st)[:120])
        t = pg.inner_text("#app")
        ok("Gratuit" in t and "Mistral Small 3.2" in t and "Qwen3 Coder" not in t and "image" not in t.lower().split("modèle utilisé")[1][:400], tag + "liste courte filtrée, modèles gratuits signalés")
        ok("3 sur 50" in t, tag + "quota gratuit du jour affiché")
        ok("IA connectée : Mistral Small 3.2" in t, tag + "état « IA connectée : <modèle> »")
        pg.click("label.mia-mod:has-text('Llama 3.3') >> nth=0"); pg.wait_for_timeout(200)
        ok(pg.evaluate("JSON.parse(localStorage.getItem('bilan.monia')).model") == "meta-llama/llama-3.3-70b-instruct:free", tag + "changement de modèle")
        pg.screenshot(path=f"/tmp/monia_on_{W}.png", full_page=True)
        ok(pg.evaluate("document.documentElement.scrollWidth") <= W + 1, tag + "pas de débordement horizontal (Mon IA connectée)")
        # 3. Fiche : panneau ✦ « IA connectée », réponse rédigée avec consignes, faits et sources
        pg.goto(B + "/entreprise/lvmh"); pg.wait_for_selector("#orciab", state="attached"); pg.wait_for_timeout(600)
        pg.evaluate("orcIaOpen()"); ok("IA connectée : Llama 3.3 70B Instruct" in pg.inner_text("#orcia"), tag + "panneau ✦ : « IA connectée : Llama 3.3 70B Instruct »")
        pg.evaluate("orcIaAsk('Expliquez concrètement le métier de LVMH', { rediger: true })")
        pg.wait_for_function("document.querySelector('#orcialog').innerText.includes('Rédigé par votre IA connectée')", timeout=15000)
        t = pg.inner_text("#orcialog"); ok("Réponse rédigée de test" in t and "Sources" in t and "comptes annuels publiés" in t and "Llama 3.3" in t, tag + "réponse rédigée affichée avec ses sources")
        c = ST["appels"][-1]; sys_, user = c["messages"][0]["content"], c["messages"][1]["content"]
        ok(c["model"] == "meta-llama/llama-3.3-70b-instruct:free", tag + "modèle choisi envoyé")
        ok("Règles d'objectivité" in sys_ and "Je ne suis pas sûr" in sys_ and "« Sources : »" in sys_, tag + "consignes : règles d'objectivité, autocritique, sources")
        ok("Faits :" in user and "mediane_du_secteur" in user and '"sources"' in user and "Question : Expliquez concrètement" in user, tag + "faits du site (médianes, sources) et question envoyés")
        if pg.locator("#orciaq .chip").count(): pg.screenshot(path=f"/tmp/monia_panneau_{W}.png")
        # 4. Copilote : question libre traduite par l'IA connectée en recherche calculée par le site
        q = pg.evaluate("""() => { for (const q of ["quelles boites ont une gouvernance exemplaire selon vous", "trouve moi des pépites méconnues en dehors des sentiers battus", "zorglub frobnicate xyzzy"]) { let a = null; try { a = localCopilot(q); } catch (e) { } if (!a && !chercheLecons(q).length) return q; } return null; }""")
        if q:
            n0 = len(ST["appels"]); pg.goto(B + "/demander?q=" + q.replace(" ", "+"))
            pg.wait_for_function("document.querySelector('#iaout') && /remplissent|Aucune entreprise/.test(document.querySelector('#iaout').innerText)", timeout=15000)
            t = pg.inner_text("#iaout"); ok(len(ST["appels"]) > n0 and ST["appels"][n0]["messages"][0]["content"].startswith("Tu es le moteur de recherche") and ("Votre IA connectée" in t or "votre IA connectée" in t), tag + "copilote : action proposée par l'IA, résultats calculés " + t[:80])
        else: ok(False, tag + "pas de question libre de test trouvée")
        # 5. Aucune clé envoyée au site
        fuite = [x[:120] for x in ST["site"] if CLE in x]
        ok(not fuite and len(ST["site"]) > 20, tag + f"la clé n'apparaît dans aucune des {len(ST['site'])} requêtes vers le site {fuite[:2]}")
        # 6. Déconnexion en un clic
        pg.goto(B + "/espace/ia"); pg.wait_for_selector("[data-mia-off]"); pg.click("[data-mia-off]"); pg.wait_for_selector("[data-mia-connect]", timeout=10000)
        ok(pg.evaluate("localStorage.getItem('bilan.monia')") is None, tag + "déconnexion : clé effacée")
        pg.goto(B + "/entreprise/lvmh"); pg.wait_for_selector("#orciab", state="attached"); pg.wait_for_timeout(500)
        pg.evaluate("orcIaOpen()"); ok("Réponses calculées" in pg.inner_text("#orcia"), tag + "après déconnexion : « Réponses calculées »")
        ok(not [e for e in errs if "ResizeObserver" not in e], tag + "aucune erreur JavaScript " + str(errs[:3]))
        ctx.close()
    br.close()
print(f"{len(fails)} échec(s)" if fails else "monia : tout est bon")
sys.exit(1 if fails else 0)
