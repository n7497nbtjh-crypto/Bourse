# Pages d'actualité (module m/actu.js) : rendu à 1280 et 390 px, sans erreur JS, sans débordement, captures facultatives.
# Usage : python3 tests/t_actu_pages.py [--shots dossier]
import os, sys
from playwright.sync_api import sync_playwright
root = os.path.abspath("cf/site")
shots = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
PAGES = ["/actualites", "/actualites?zone=EU", "/actualites?zone=fav", "/actualites?vue=presse", "/actualites?type=resultats", "/entreprise/upm", "/entreprise/upm/actualite", "/entreprise/lvmh/actualite", "/entreprise/unilever/actualite", "/"]
def route(r):
    u = r.request.url
    if "/api/presse" in u: return r.fulfill(json={"items": [], "error": "La presse n'est pas disponible pour le moment."})
    if "/api/" in u: return r.fulfill(json={"items": []})
    if "//t.local" not in u: return r.fulfill(status=404, body="")
    path = u.split("//t.local", 1)[1].split("#")[0].split("?")[0]
    f = os.path.join(root, path.lstrip("/"))
    if os.path.isfile(f): return r.fulfill(path=f)
    if "." in path.rsplit("/", 1)[-1]: return r.fulfill(status=404, body="")
    return r.fulfill(path=os.path.join(root, "index.html"))
CHECK = """(W) => { const p = []; if (document.documentElement.scrollWidth > W + 1) p.push('débordement ' + document.documentElement.scrollWidth);
  const t = document.querySelector('#app').textContent; if (/NaN|undefined/.test(t)) p.push('NaN/undefined'); if (!t.trim()) p.push('vide');
  document.querySelectorAll('#app *').forEach(e => { if (e.closest('.scroll-x,.filters,.chips,.qtabs')) return; const r = e.getBoundingClientRect(); if (r.width && r.right > W + 1) p.push('dépasse ' + e.tagName + '.' + String(e.className).slice(0, 20)); });
  return [...new Set(p)].slice(0, 5); }"""
bad = 0
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for name, vp in (("ordi", {"width": 1280, "height": 900}), ("tel", {"width": 390, "height": 844})):
        ctx = b.new_context(viewport=vp); ctx.add_init_script('try{localStorage.setItem("bilan.favoris",JSON.stringify(["c:upm","c:unilever","c:lvmh"]))}catch(e){}')
        pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errs.append(m.text))
        pg.route("**/*", route)
        for path in PAGES:
            pg.goto("http://t.local" + path); pg.wait_for_timeout(900)
            p = pg.evaluate(CHECK, vp["width"]); stuck = pg.evaluate("[...document.querySelectorAll('#app *')].filter(e => e.children.length === 0 && /^Chargement…$/.test(e.textContent.trim())).length")
            if stuck: p.append(f"{stuck} bloc(s) encore « Chargement… »")
            if p: bad += 1; print("PROBLÈME", name, path, p)
            if shots:
                os.makedirs(shots, exist_ok=True); pg.screenshot(path=f"{shots}/{name}{path.replace('/', '_').replace('?', '_')}.png", full_page=True)
        if errs: bad += 1; print("ERREURS JS", name, errs[:5])
    b.close()
print("t_actu_pages :", "0 problème" if not bad else f"{bad} problème(s)"); sys.exit(1 if bad else 0)
