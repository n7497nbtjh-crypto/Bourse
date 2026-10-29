# Application installable et connecteur : à lancer contre un site servi par le Worker (local ou en ligne), en lecture seule.
#   python3 tests/t_pwa.py [http://127.0.0.1:8788] [--shots dossier]
# Local : wrangler pages dev cf/site --port 8788 --d1 DB  (après node build.mjs). Aucun compte n'est créé.
# Vérifie : balises de la page, manifeste et icônes, service worker (contrôle, caches, versions), lecture hors ligne,
# page /connecteur (ordinateur et téléphone), réponse réelle du connecteur MCP, absence d'erreur JavaScript et de débordement.
import json, os, sys, struct
from playwright.sync_api import sync_playwright
BASE = next((a for a in sys.argv[1:] if a.startswith("http")), "http://127.0.0.1:8788").rstrip("/")
import time
def attendre(page, expr, ms): # équivalent de wait_for_function sans eval côté page (la CSP du site interdit unsafe-eval)
    fin = time.time() + ms / 1000
    while time.time() < fin:
        if page.evaluate("() => !!(" + expr + ")"): return True
        page.wait_for_timeout(250)
    raise TimeoutError(expr)
SHOTS = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
FONT = os.environ.get("FONT_DIR")
bad = 0
def ok(c, m):
    global bad
    if not c: bad += 1; print("ÉCHEC", m)
def fonts(route):  # Google Fonts : polices locales si FONT_DIR, sinon rien (le test reste valable)
    u = route.request.url
    if "fonts.googleapis.com" in u:
        fams = [("Fraunces", "fraunces", w) for w in (600, 800, 900)] + [("IBM Plex Sans", "ibm-plex-sans", w) for w in (400, 500, 600, 700)] + [("IBM Plex Mono", "ibm-plex-mono", w) for w in (400, 500, 600)]
        css = "".join(f"@font-face{{font-family:'{n}';font-weight:{w};src:url(https://fonts.gstatic.com/{k}-latin-{w}-normal.woff2) format('woff2')}}" for n, k, w in fams) if FONT else ""
        return route.fulfill(body=css, content_type="text/css")
    if "fonts.gstatic.com" in u:
        f = os.path.join(FONT or "", u.rsplit("/", 1)[1])
        return route.fulfill(path=f) if FONT and os.path.isfile(f) else route.fulfill(status=404, body="")
    if "tradingview.com" in u or "google.com/s2" in u or "googleusercontent" in u: return route.fulfill(status=404, body="")
    return route.continue_()
CHECK = """W => { const p = []; if (document.documentElement.scrollWidth > W + 1) p.push('page plus large que l\\'écran : ' + document.documentElement.scrollWidth);
  document.querySelectorAll('main *').forEach(e => { if (e.closest('.scroll-x,.tabs,.chart,.bars,.filters,.qtabs,.pwa-cmd,.pwa-out')) return; const r = e.getBoundingClientRect(); if (r.width && r.right > W + 1) p.push('dépasse : ' + e.tagName + '.' + String(e.className).slice(0, 30)); });
  const t = document.querySelector('#app').textContent; if (!t.trim()) p.push('page vide'); if (/NaN|undefined/.test(t)) p.push('NaN ou undefined affiché'); return [...new Set(p)].slice(0, 6); }"""
def png_size(b): return struct.unpack(">II", b[16:24])
with sync_playwright() as pw:
    br = pw.chromium.launch()
    # 1. Balises, manifeste, icônes
    ctx = br.new_context(viewport={"width": 1280, "height": 900}); ctx.route("**/*", fonts)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errs.append(m.text))
    r = pg.goto(BASE + "/entreprise/lvmh"); pg.wait_for_timeout(1500)
    v = r.headers.get("x-bilan-version")
    head = pg.evaluate("""() => ({ manifest: !!document.querySelector('link[rel=manifest]'), theme: (document.querySelector('meta[name=theme-color]') || {}).content, apple: !!document.querySelector('link[rel=apple-touch-icon]'),
      ogt: (document.querySelector('meta[property="og:title"]') || {}).content, ogi: (document.querySelector('meta[property="og:image"]') || {}).content, ogu: (document.querySelector('meta[property="og:url"]') || {}).content,
      tw: (document.querySelector('meta[name="twitter:card"]') || {}).content, ver: (document.querySelector('meta[name="bilan-version"]') || {}).content,
      icons: [...document.querySelectorAll('link[rel=icon]')].map(l => l.getAttribute('href')), pre: document.querySelectorAll('link[rel=preload][as=fetch]').length })""")
    ok(v and head["ver"] == v, f"version dans l'en-tête et la page {v} {head['ver']}")
    ok(head["manifest"] and head["theme"] == "#F8F5EE" and head["apple"] and head["tw"] == "summary_large_image", "balises d'application " + json.dumps(head))
    ok("LVMH" in (head["ogt"] or "") and head["ogi"].endswith("/icons/partage.png") and head["ogu"].endswith("/entreprise/lvmh"), "Open Graph de la page")
    ok("/icons/favicon.svg" in head["icons"] and not any(i.startswith("data:") for i in head["icons"]), "favicon du logo bilan. " + str(head["icons"]))
    ok(head["pre"] >= 6, "données préchargées")
    man = pg.evaluate("fetch('/manifest.webmanifest').then(r => r.json())")
    ok(man["short_name"] == "bilan." and man["display"] == "standalone" and man["start_url"].startswith("/") and any(i["purpose"] == "maskable" for i in man["icons"]), "manifeste")
    for i in man["icons"]:
        if i["type"] != "image/png": continue
        b = pg.evaluate("u => fetch(u).then(r => r.arrayBuffer()).then(b => Array.from(new Uint8Array(b).slice(0, 24)))", i["src"])
        w, h = png_size(bytes(b)); ok(f"{w}x{h}" == i["sizes"], f"icône {i['src']} {w}x{h}")
    for f, n in [("/icons/apple-touch-icon.png", 180), ("/icons/partage.png", 1200), ("/icons/badge-96.png", 96)] + [(s["src"], 0) for s in man.get("screenshots", [])]:
        st =pg.evaluate("u => fetch(u).then(r => r.status)", f); ok(st == 200, f"{f} servi")
    # 2. Service worker : enregistré, contrôle la page, met en cache ce qu'il faut (et jamais /api)
    attendre(pg, "navigator.serviceWorker && navigator.serviceWorker.controller !== null", 15000)
    pg.reload(); pg.wait_for_timeout(2500)
    caches = pg.evaluate("""async () => { const o = {}; for (const k of await caches.keys()) o[k] = (await (await caches.open(k)).keys()).map(r => new URL(r.url).pathname); return o; }""")
    stat = [k for k in caches if k.startswith("bilan-statique-")]
    ok(stat == ["bilan-statique-" + v], "un seul cache de scripts, à la version en ligne " + str(list(caches)))
    ok(stat and "/ia.js" in caches[stat[0]] and any(p.startswith("/m/") for p in caches[stat[0]]), "scripts du site en cache")
    ok("/" in caches.get("bilan-coquille", []), "coquille en cache")
    ok("/data/societes.json" in caches.get("bilan-donnees", []) and "/data/univers-min.json" in caches.get("bilan-donnees", []), "données en cache")
    ok(not any(p.startswith("/api/") or p == "/mcp" for l in caches.values() for p in l), "rien de /api ni /mcp en cache")
    # 3. Hors ligne : la fiche s'ouvre avec les dernières données, une page jamais vue garde la coquille, le bandeau s'affiche
    ctx.set_offline(True)
    pg.goto(BASE + "/entreprise/hermes"); pg.wait_for_timeout(2500)
    ok("Hermès" in pg.inner_text("#app") and pg.locator("#pwaoff").count() == 1, "hors ligne : fiche lue depuis le cache, bandeau affiché")
    if SHOTS: os.makedirs(SHOTS, exist_ok=True); pg.screenshot(path=f"{SHOTS}/hors-ligne.png")
    ctx.set_offline(False); pg.wait_for_timeout(300)
    ok(pg.locator("#pwaoff").count() == 0, "bandeau retiré au retour du réseau")
    # 4. Page /connecteur et appel réel du connecteur
    pg.goto(BASE + "/connecteur"); pg.wait_for_timeout(1200)
    ok("ChatGPT ou Claude" in pg.title() and BASE + "/mcp" in pg.inner_text("#pwaurl"), "page /connecteur")
    pg.click("[data-ong=chatgpt]"); ok(pg.is_visible("[data-pan=chatgpt]") and not pg.is_visible("[data-pan=claude]"), "onglets")
    pg.fill("#pwaq", "Air Liquide"); pg.click("#pwatry button"); attendre(pg, "document.querySelector('#pwaout').textContent.includes('Sources')", 15000)
    out = pg.inner_text("#pwaout"); ok("Air Liquide" in out and "médiane du secteur" in out and "pas un conseil" in out, "le connecteur répond depuis la page")
    for W, H, mob in [(1440, 900, False), (390, 844, True)]:
        c2 = br.new_context(viewport={"width": W, "height": H}, is_mobile=mob, has_touch=mob, device_scale_factor=2 if mob else 1); c2.route("**/*", fonts)
        p2 = c2.new_page(); p2.on("pageerror", lambda e: errs.append(str(e)))
        for path in ["/connecteur", "/"]:
            p2.goto(BASE + path)
            try: attendre(p2, "document.querySelector('#app').textContent.trim().length > 200", 20000)
            except Exception: pass
            p2.wait_for_timeout(800); pb = p2.evaluate(CHECK, W); ok(not pb, f"{path} à {W} px : {pb}")
            if SHOTS: p2.screenshot(path=f"{SHOTS}/{path.strip('/') or 'accueil'}-{W}.png", full_page=path != "/")
        c2.close()
    g = pg.evaluate("u => fetch(u, { headers: { accept: 'text/html' }, redirect: 'manual' }).then(r => r.type)", BASE + "/mcp"); ok(g == "opaqueredirect", "GET /mcp depuis un navigateur : redirection " + g)
    ok(not errs, "erreurs JavaScript : " + " | ".join(errs[:5]))
    br.close()
print(f"pwa : {bad} échec(s)" if bad else "pwa : tout est bon"); sys.exit(1 if bad else 0)
