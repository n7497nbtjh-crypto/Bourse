# « Connecter mon IA » (cf/site/m/monia.js) : connexion directe à ChatGPT (OpenAI), Claude (Anthropic), Gemini (Google)
# et Mistral, avec des réponses simulées. Vérifie : choix de l'éditeur, clé vérifiée par la liste des modèles, modèle rapide
# choisi par défaut, format d'appel propre à chaque éditeur (consignes, faits, sources), clé refusée, déconnexion ;
# et surtout : la clé n'est jamais envoyée au site. Sans IA connectée : réponses calculées + invitation.
# Usage : python3 tests/t_monia.py   (captures dans /tmp/monia_*.png)
import os, sys, json
from urllib.parse import urlparse, parse_qs
exec(open("tests/audit.py").read().split("CHECK = ")[0])  # donne route() et sync_playwright
STATE = {}  # route() de audit.py : visiteur non connecté
B = "https://t.local"
CLES = {"openai": "sk-proj-CLE-SECRETE-OPENAI-0123456789abcdef", "anthropic": "sk-ant-api03-CLE-SECRETE-ANTHROPIC-0123456789",
        "gemini": "AIzaSyCLE-SECRETE-GEMINI-0123456789abcdefgh", "mistral": "CLESECRETEMISTRAL0123456789abcdef"}
HOTES = {"api.openai.com": "openai", "api.anthropic.com": "anthropic", "generativelanguage.googleapis.com": "gemini", "api.mistral.ai": "mistral"}
MODELES = {
    "openai": {"data": [{"id": "gpt-9", "created": 1790000000}, {"id": "gpt-9-mini", "created": 1790000000}, {"id": "gpt-9-mini-2026-08-01", "created": 1785000000},
                        {"id": "gpt-image-2", "created": 1791000000}, {"id": "gpt-9-realtime", "created": 1791000000}, {"id": "text-embedding-3-small", "created": 1700000000}]},
    "anthropic": {"data": [{"id": "claude-opus-9", "display_name": "Claude Opus 9", "created_at": "2026-09-01T00:00:00Z"},
                           {"id": "claude-haiku-9", "display_name": "Claude Haiku 9", "created_at": "2026-08-01T00:00:00Z"}]},
    "gemini": {"models": [{"name": "models/gemini-9.0-pro", "displayName": "Gemini 9 Pro", "supportedGenerationMethods": ["generateContent"]},
                          {"name": "models/gemini-9.0-flash", "displayName": "Gemini 9 Flash", "supportedGenerationMethods": ["generateContent"]},
                          {"name": "models/gemini-9.0-flash-lite", "displayName": "Gemini 9 Flash-Lite", "supportedGenerationMethods": ["generateContent"]},
                          {"name": "models/gemini-9.0-flash-image", "displayName": "image", "supportedGenerationMethods": ["generateContent"]},
                          {"name": "models/text-embedding-9", "displayName": "emb", "supportedGenerationMethods": ["embedContent"]}]},
    "mistral": {"data": [{"id": "mistral-large-latest", "created": 1790000000, "capabilities": {"completion_chat": True}},
                         {"id": "mistral-small-latest", "created": 1790000000, "capabilities": {"completion_chat": True}},
                         {"id": "codestral-latest", "created": 1790000000, "capabilities": {"completion_chat": True}},
                         {"id": "mistral-embed", "created": 1790000000, "capabilities": {"completion_chat": False}}]},
}
DEFAUT = {"openai": "gpt-9-mini", "anthropic": "claude-haiku-9", "gemini": "gemini-9.0-flash", "mistral": "mistral-small-latest"}
TXT = "Réponse rédigée de test : la marge reste au-dessus de la médiane du secteur.\nSources : comptes annuels publiés par l'entreprise (ESEF), médianes du secteur calculées par bilan."
fails = []
def ok(c, m):
    if not c: fails.append(m); print("ÉCHEC", m)
    else: print("ok  ", m)
ST = {"appels": [], "site": []}
CORS = {"access-control-allow-origin": "*"}

def cle_recue(f, u, h):
    if f == "anthropic": return h.get("x-api-key")
    if f == "gemini": return h.get("x-goog-api-key") or parse_qs(urlparse(u).query).get("key", [None])[0]
    return (h.get("authorization") or "").replace("Bearer ", "")

def route3(r):
    u = r.request.url; pu = urlparse(u); h = r.request.headers
    if "//t.local" in u:
        ST["site"].append(u + " " + json.dumps(h) + " " + (r.request.post_data or ""))
        return route(r)
    f = HOTES.get(pu.hostname)
    if not f: return route(r)
    if cle_recue(f, u, h) != CLES[f]: return r.fulfill(status=401, json={"error": {"message": "invalid api key"}}, headers=CORS)
    if f == "anthropic" and h.get("anthropic-dangerous-direct-browser-access") != "true": return r.fulfill(status=401, json={"error": {"message": "CORS"}}, headers=CORS)
    if pu.path.endswith("/models"): return r.fulfill(json=MODELES[f], headers=CORS)
    b = json.loads(r.request.post_data or "{}"); ST["appels"].append({"f": f, "path": pu.path, "b": b})
    if f == "anthropic": return r.fulfill(json={"content": [{"type": "text", "text": TXT}]}, headers=CORS)
    if f == "gemini": return r.fulfill(json={"candidates": [{"content": {"parts": [{"text": "réflexion", "thought": True}, {"text": TXT}]}}]}, headers=CORS)
    return r.fulfill(json={"choices": [{"message": {"role": "assistant", "content": TXT}}]}, headers=CORS)

def connecter(pg, f, cle, tag):
    pg.goto(B + "/espace/ia"); pg.evaluate("localStorage.removeItem('bilan.monia')"); pg.goto(B + "/espace/ia"); pg.wait_for_selector("[data-mia-form]", timeout=20000)
    pg.click(f"label.mia-f:has(input[value='{f}'])"); pg.wait_for_selector(f"label.mia-f.on:has(input[value='{f}'])")
    pg.fill("[data-mia-form] input", cle); pg.click("[data-mia-form] button")
    pg.wait_for_selector("#miamod, .mia-msg.ko", timeout=20000)

def systeme_et_question(a):
    b = a["b"]
    if a["f"] == "anthropic": return b.get("system", ""), b["messages"][0]["content"]
    if a["f"] == "gemini": return b["systemInstruction"]["parts"][0]["text"], b["contents"][0]["parts"][0]["text"]
    return b["messages"][0]["content"], b["messages"][1]["content"]

with sync_playwright() as pw:
    br = pw.chromium.launch()
    for W, H in ((1280, 900), (390, 844)):
        ST.update({"appels": [], "site": []})
        ctx = br.new_context(viewport={"width": W, "height": H}, ignore_https_errors=True); pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.route("**/*", route3)
        tag = f"[{W}] "
        # 1. Sans IA connectée
        pg.goto(B + "/espace/ia", timeout=90000); pg.wait_for_selector("[data-mia-form]", timeout=20000)
        t = pg.inner_text("#app")
        ok(all(n in t for n in ("ChatGPT", "Claude", "Gemini", "Mistral")) and "jamais à bilan" in t and "OpenRouter" not in t, tag + "page Mon IA : quatre éditeurs, sans OpenRouter")
        pg.screenshot(path=f"/tmp/monia_off_{W}.png", full_page=True)
        ok(pg.evaluate("document.documentElement.scrollWidth") <= W + 1, tag + "pas de débordement horizontal (Mon IA)")
        pg.goto(B + "/entreprise/lvmh", timeout=90000); pg.wait_for_selector("#orciab", state="attached", timeout=20000); pg.wait_for_timeout(600)
        pg.evaluate("orcIaOpen()"); pg.wait_for_timeout(200)
        ok("Réponses calculées" in pg.inner_text("#orcia"), tag + "panneau ✦ : « Réponses calculées »")
        pg.evaluate("orcIaAsk('Expliquez concrètement le métier de LVMH', { rediger: true })"); pg.wait_for_timeout(1200)
        ok("Connectez votre IA" in pg.inner_text("#orcialog"), tag + "sans IA : invitation discrète")
        ok(not ST["appels"], tag + "aucun appel au modèle sans connexion")
        # 2. Clé refusée, puis clé mal formée
        connecter(pg, "mistral", "CLEFAUSSE0123456789abcdefXYZ", tag)
        ok("refuse cette clé" in pg.inner_text("#app") and pg.evaluate("localStorage.getItem('bilan.monia')") is None, tag + "clé refusée : message clair, rien de gardé")
        connecter(pg, "openai", "bonjour", tag)
        ok("ne ressemble pas à une clé ChatGPT" in pg.inner_text("#app"), tag + "texte qui n'est pas une clé : refusé avant tout appel")
        # 3. Les quatre éditeurs : connexion, modèle par défaut, appel au bon format
        for f in ("mistral", "anthropic", "gemini", "openai"):
            connecter(pg, f, CLES[f], tag)
            st = pg.evaluate("JSON.parse(localStorage.getItem('bilan.monia'))")
            ok(st and st.get("f") == f and st.get("key") == CLES[f] and st.get("model") == DEFAUT[f], tag + f"{f} : clé gardée dans le navigateur, modèle rapide par défaut ({st and st.get('model')})")
            opts = pg.eval_on_selector_all("#miamod option", "l => l.map(o => o.value)")
            ok(opts and not any(x for x in opts if any(k in x for k in ("image", "embed", "realtime", "codestral", "2026-08"))), tag + f"{f} : liste filtrée {opts}")
            if f == "mistral": pg.screenshot(path=f"/tmp/monia_on_{W}.png", full_page=True)
            pg.goto(B + "/entreprise/lvmh"); pg.wait_for_selector("#orciab", state="attached"); pg.wait_for_timeout(600)
            pg.evaluate("orcIaOpen()"); pg.wait_for_timeout(150)
            n0 = len(ST["appels"])
            pg.evaluate("orcIaAsk('Expliquez concrètement le métier de LVMH', { rediger: true })")
            try: pg.wait_for_function("document.querySelector('#orcialog').innerText.includes('Rédigé par votre IA connectée')", timeout=15000)
            except Exception: print("DEBUG", pg.inner_text("#orcialog")[-300:])
            t = pg.inner_text("#orcialog")
            ok("Réponse rédigée de test" in t and "Sources" in t and "réflexion" not in t, tag + f"{f} : réponse rédigée affichée avec ses sources")
            a = ST["appels"][n0] if len(ST["appels"]) > n0 else None
            ok(a and a["f"] == f, tag + f"{f} : appel envoyé directement à l'éditeur")
            if a:
                s, q = systeme_et_question(a)
                ok("Règles d'objectivité" in s and "Faits :" in q and "mediane_du_secteur" in q and "Question : Expliquez" in q, tag + f"{f} : consignes, faits et question au bon endroit")
                mod = a["path"].split("/models/")[1].split(":")[0] if f == "gemini" else a["b"].get("model")
                ok(mod == DEFAUT[f], tag + f"{f} : modèle envoyé {mod}")
                if f == "openai": ok("max_completion_tokens" in a["b"] and "temperature" not in a["b"], tag + "openai : paramètres des modèles récents")
                if f == "anthropic": ok(a["b"].get("max_tokens") and a["b"]["messages"][0]["role"] == "user", tag + "anthropic : format Messages")
        # 4. Changement de modèle
        pg.goto(B + "/espace/ia"); pg.wait_for_selector("#miamod"); pg.select_option("#miamod", "gpt-9"); pg.wait_for_timeout(200)
        ok(pg.evaluate("JSON.parse(localStorage.getItem('bilan.monia')).model") == "gpt-9", tag + "changement de modèle")
        ok("ChatGPT · GPT-9" in pg.inner_text("#app"), tag + "état « IA connectée : ChatGPT · GPT-9 »")
        # 5. Aucune clé envoyée au site
        fuite = [x[:120] for x in ST["site"] for c in CLES.values() if c in x]
        ok(not fuite and len(ST["site"]) > 20, tag + f"aucune clé dans les {len(ST['site'])} requêtes vers le site {fuite[:2]}")
        # 6. Ancienne connexion OpenRouter : oubliée proprement
        pg.evaluate("localStorage.setItem('bilan.monia', JSON.stringify({ key: 'sk-or-v1-x', model: 'm' }))"); pg.goto(B + "/espace/ia"); pg.wait_for_selector("[data-mia-form]", timeout=10000)
        ok(True, tag + "ancienne connexion OpenRouter : page de connexion affichée")
        # 7. Déconnexion
        connecter(pg, "mistral", CLES["mistral"], tag); pg.click("[data-mia-off]"); pg.wait_for_selector("[data-mia-form]", timeout=10000)
        ok(pg.evaluate("localStorage.getItem('bilan.monia')") is None, tag + "déconnexion : clé effacée")
        ok(not [e for e in errs if "ResizeObserver" not in e], tag + "aucune erreur JavaScript " + str(errs[:3]))
        ctx.close()
    br.close()
print(f"{len(fails)} échec(s)" if fails else "monia : tout est bon")
sys.exit(1 if fails else 0)
