# Teste les pages du module « outils » (classements, dividendes, découvertes, comparaisons toutes prêtes) à 1440 et 390 px.
# Usage : python3 tests/t_outils.py [--shots dossier] [--prem]
import os, sys, json
exec(open("tests/audit.py").read().split("CHECK = ")[0])  # donne route() et sync_playwright
PREM = "--prem" in sys.argv
STATE = {}
def route3(r):
    if PREM and "/api/premium/statut" in r.request.url: return r.fulfill(json={"premium": True})
    if PREM and "/api/espace/moi" in r.request.url: return r.fulfill(json={"connecte": True, "email": "t@exemple.fr", "premium": True, "donnees": {}})
    if "/api/cours" in r.request.url: return r.fulfill(status=404, body="")  # les vrais cours du site (data/cours.json)
    return route(r)
CHK = r"""(W) => {
  const p = [];
  if (document.documentElement.scrollWidth > W + 1) p.push('page plus large : ' + document.documentElement.scrollWidth);
  document.querySelectorAll('#app *').forEach(e => { if (e.closest('.out-tabs,.out-tw,.scroll-x')) return; const r = e.getBoundingClientRect(); if (r.width && r.right > W + 1) p.push('dépasse : ' + e.tagName + '.' + String(e.className).slice(0, 30)); });
  const t = document.querySelector('#app').textContent;
  if (/NaN|undefined|Infinity/.test(t)) p.push('NaN/undefined/Infinity');
  return [...new Set(p)].slice(0, 6);
}"""
PAGES = [("/classements", "classements"), ("/classements?c=tete", "cl_tete"), ("/classements?c=dividende&r=fr", "cl_div"), ("/classements?c=croissance&pea=1", "cl_cro"), ("/classements?c=solides&t=m", "cl_sol"),
         ("/dividendes", "dividendes"), ("/decouvertes", "decouvertes"), ("/comparer", "comparer"), ("/comparer?ids=bnp-paribas,societe-generale", "comparer2")]
bad = 0
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for nom, opts in [("ordi", dict(viewport={"width": 1440, "height": 900})), ("tel", dict(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2))]:
        ctx = b.new_context(**opts); pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e) + " @ " + pg.url))
        pg.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errs.append(m.text))
        pg.route("**/*", route3)
        for path, n in PAGES:
            pg.goto("http://t.local" + path); pg.wait_for_timeout(1200)
            p = pg.evaluate(CHK, opts["viewport"]["width"])
            if p: bad += 1; print(nom, path, p)
            if SHOTS := (sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None):
                os.makedirs(SHOTS, exist_ok=True); pg.screenshot(path=f"{SHOTS}/{nom}_{n}.png", full_page=True)
        # simulateur de dividendes : recherche, montant, compte
        pg.goto("http://t.local/dividendes"); pg.wait_for_timeout(1000)
        pg.fill("#out-sq", "sanofi"); pg.wait_for_timeout(200); pg.click("#out-ss button[data-id]"); pg.fill("#out-sm", "10000"); pg.wait_for_timeout(150)
        t1 = pg.inner_text("#out-sr"); pg.click(".out-acct button[data-a=cto]"); pg.wait_for_timeout(150); t2 = pg.inner_text("#out-sr")
        if "€" not in t1 or "Prélèvement" not in t2: bad += 1; print(nom, "simulateur", t1[:120], "|", t2[:120])
        pg.check("#out-pea"); pg.wait_for_timeout(150)
        # classements : changement d'onglet et de filtre
        pg.goto("http://t.local/classements"); pg.wait_for_timeout(1000)
        pg.click(".out-tabs button[data-k=dividende]"); pg.wait_for_timeout(200)
        n = pg.locator(".out-list .out-row").count(); lock = pg.locator(".out-lockc").count()
        if (not PREM and (n != 3 or lock != 1)) or (PREM and n < 10): bad += 1; print(nom, "classement", n, lock)
        if "c=dividende" not in pg.url: bad += 1; print(nom, "adresse", pg.url)
        # comparer : galerie et filtre par thème
        pg.goto("http://t.local/comparer"); pg.wait_for_timeout(1000)
        k = pg.locator(".out-pc").count()
        pg.click(".out-thc button[data-th=fin]"); pg.wait_for_timeout(100); vis = pg.locator(".out-gth:not([hidden])").count()
        if k < 30 or vis != 1: bad += 1; print(nom, "galerie", k, vis)
        print(nom, "galerie :", k, "comparaisons ; classement dividende :", n, "lignes")
        if errs: bad += 1; print(nom, "erreurs JS :", errs[:5])
        ctx.close()
    b.close()
print("problèmes :", bad); sys.exit(1 if bad else 0)
