# Parcourt toutes les pages à 1440, 375 et 340 px : débordement horizontal, erreurs JavaScript, contenu vide.
# Usage : python3 tests/audit.py [--shots dossier]
import os, sys, json
from playwright.sync_api import sync_playwright
root = os.path.abspath("cf/site")
FONT = os.environ.get("FONT_DIR")  # facultatif : polices locales pour les captures (Google Fonts bloqué en test)
shots = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
pages = ["/", "/entreprises", "/actualites", "/actualites?src=us", "/actualites?src=toutes", "/agenda", "/lexique", "/portefeuille", "/simulateurs/epargne", "/simulateurs/frais", "/simulateurs/pea-cto", "/simulateurs/passe", "/mentions-legales", "/page-inconnue", "/pea-cto", "/comparer?ids=lvmh,kering,hermes,apple", "/comparer", "/favoris"]
pages += ["/etf", "/etf/amundi-msci-world-pea", "/etf/ishares-core-sp500", "/communaute", "/entreprise/lvmh/comprendre/argent", "/entreprise/lvmh/comprendre/marge", "/entreprise/lvmh/comprendre/varier", "/entreprise/lvmh/comprendre/prix", "/entreprise/totalenergies/comprendre/dette", "/entreprise/lvmh/communaute", "/entreprise/lvmh/actualite", "/actualites?src=monde", "/entreprise/bnp-paribas/comprendre/roe"]
pages += [f"/entreprise/{i}{t}" for i in ("lvmh", "hermes", "totalenergies", "bnp-paribas", "apple", "unibail-rodamco-westfield", "siemens", "asml") for t in ("", "/comptes", "/actualite", "/agenda")]
AMF = {"items": [{"date": "2026-10-27T18:02:00", "company": "TOTALENERGIES SE", "title": "Communiqué : résultats du troisième trimestre 2026", "type": "Information financière trimestrielle", "url": "https://example.org/doc.pdf"},
                 {"date": "2026-10-27T17:45:00", "company": "LVMH MOET HENNESSY LOUIS VUITTON", "title": "Déclaration des transactions sur actions propres", "type": "Rachat d'actions", "url": ""}] * 4}
def route(r):
    u = r.request.url
    if "/api/amf" in u: return r.fulfill(json=AMF)
    if "/api/presse" in u:
        return r.fulfill(json={"items": [{"title": "Le groupe publie des ventes en hausse au troisième trimestre", "url": "https://example.org/a", "site": "example.org", "date": "2026-10-27T15:00:00Z", "lang": "French"}] * 6})
    if "/api/communaute/avis" in u:
        return r.fulfill(json={"room": "lvmh", "confiant": 12, "neutre": 5, "prudent": 3})
    if "/api/communaute" in u:
        msg = {"id": 1, "room": "lvmh", "pseudo": "Romain", "body": "La marge de [[c:lvmh]] baisse depuis trois ans, je compare avec [[c:hermes]].", "kind": "idee", "created": 1761650000000, "likes": 2}
        if r.request.method == "POST": return r.fulfill(status=201, json={"ok": True, "item": msg})
        return r.fulfill(json={"items": [msg] * 3, "rooms": [{"room": "lvmh", "n": 3}, {"room": "general", "n": 1}]})
    if "tradingview.com" in u: return r.fulfill(body="", content_type="text/javascript")
    if "fonts.googleapis.com" in u:
        if not FONT: return r.fulfill(body="", content_type="text/css")
        fams = [("Fraunces", "fraunces", w, "normal") for w in (700, 900)] + [("IBM Plex Sans", "ibm-plex-sans", w, "normal") for w in (400, 600)] + [("IBM Plex Mono", "ibm-plex-mono", w, "normal") for w in (400, 600)]
        css = "".join(f"@font-face{{font-family:'{n}';font-style:{st};font-weight:{w};src:url(https://fonts.gstatic.com/{k}-latin-{w}-{st}.woff2) format('woff2')}}" for n, k, w, st in fams)
        return r.fulfill(body=css, content_type="text/css")
    if "fonts.gstatic.com" in u:
        f = os.path.join(FONT or "", u.rsplit("/", 1)[1]); return r.fulfill(path=f) if FONT and os.path.isfile(f) else r.fulfill(status=404, body="")
    if "//t.local" not in u: return r.fulfill(status=404, body="")  # logos et autres sites extérieurs
    path = u.split("//t.local", 1)[1].split("#")[0].split("?")[0]
    f = os.path.join(root, path.lstrip("/"))
    if os.path.isfile(f): return r.fulfill(path=f)
    if "." in path.rsplit("/", 1)[-1]: return r.fulfill(status=404, body="")
    return r.fulfill(path=os.path.join(root, "index.html"))
CHECK = r"""(W) => {
  const p = [];
  if (document.documentElement.scrollWidth > W + 1) p.push('page plus large que l\'écran : ' + document.documentElement.scrollWidth);
  document.querySelectorAll('main *').forEach(e => {
    if (e.closest('.scroll-x,.tabs,.chart,.bars,.filters,.qtabs')) return;
    const r = e.getBoundingClientRect(); if (r.width && r.right > W + 1) p.push('dépasse : ' + e.tagName + '.' + String(e.className).slice(0, 24));
  });
  if (!document.querySelector('#app').textContent.trim()) p.push('page vide');
  if (document.querySelector('#app').textContent.includes('NaN') || document.querySelector('#app').textContent.includes('undefined')) p.push('NaN ou undefined affiché');
  return [...new Set(p)].slice(0, 6);
}"""
bad = 0
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for name, opts in [("ordi", dict(viewport={"width": 1440, "height": 900})), ("tel", dict(viewport={"width": 375, "height": 812}, has_touch=True, is_mobile=True, device_scale_factor=2)), ("petit", dict(viewport={"width": 340, "height": 700}, has_touch=True, is_mobile=True))]:
        ctx = b.new_context(**opts); ctx.add_init_script('try{localStorage.setItem("bilan.favoris",JSON.stringify(["c:lvmh","c:nvidia","c:totalenergies","e:amundi-msci-world-pea"]))}catch(e){}'); pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
        pg.route("**/*", route)
        probs = {}
        for path in pages:
            pg.goto("http://t.local" + path); pg.wait_for_timeout(450)
            p = pg.evaluate(CHECK, opts["viewport"]["width"])
            if p: probs[path] = p
            if shots and name != "petit" and path in ("/", "/entreprises", "/entreprise/lvmh", "/entreprise/lvmh/comptes", "/lexique", "/etf/amundi-msci-world-pea", "/entreprise/lvmh/comprendre/argent", "/entreprise/lvmh/comprendre/marge", "/communaute"):
                os.makedirs(shots, exist_ok=True)
                pg.screenshot(path=f"{shots}/{name}{(path.replace('/', '_').replace('?', '_') if path != '/' else '_accueil')}.png", full_page=True)
        # Portefeuille : ajout d'une opération
        pg.goto("http://t.local/portefeuille"); pg.wait_for_timeout(300)
        pg.fill("#op", "100"); pg.wait_for_timeout(50)
        if pg.input_value("#of") != "1.00": probs["/portefeuille (frais)"] = ["frais non calculés : " + pg.input_value("#of")]
        pg.click("#oadd"); pg.wait_for_timeout(200)
        if "Aucune opération" in pg.inner_text("#pfbody"): probs["/portefeuille (ajout)"] = ["l'opération n'a pas été ajoutée"]
        p = pg.evaluate(CHECK, opts["viewport"]["width"])
        if p: probs["/portefeuille après ajout"] = p
        if shots and name != "petit": pg.screenshot(path=f"{shots}/{name}_portefeuille_rempli.png", full_page=True)
        # Définition : ouverture de la bulle
        pg.goto("http://t.local/entreprise/lvmh/comptes"); pg.wait_for_timeout(300)
        pg.locator(".def[data-def=marge]").first.scroll_into_view_if_needed(); pg.wait_for_timeout(300)  # le défilement referme la bulle : on défile d'abord
        pg.click(".def[data-def=marge]"); pg.wait_for_timeout(150)
        if not pg.evaluate("document.getElementById('pop').classList.contains('open')"): probs["définition"] = ["la bulle ne s'ouvre pas"]
        p = pg.evaluate(CHECK, opts["viewport"]["width"])
        if p: probs["chiffres + bulle"] = p
        if shots and name != "petit": pg.screenshot(path=f"{shots}/{name}_definition.png")
        # Fiche : calcul du PER avec un cours saisi
        pg.goto("http://t.local/entreprise/lvmh"); pg.wait_for_timeout(400)
        pg.fill("#pxin", "600"); pg.wait_for_timeout(100)
        if "PER" not in pg.inner_text("#pxout"): probs["PER"] = ["le PER n'est pas calculé"]
        p = pg.evaluate(CHECK, opts["viewport"]["width"])
        if p: probs["fiche + PER"] = p
        if shots and name != "petit": pg.screenshot(path=f"{shots}/{name}_fiche_per.png", full_page=True)
        ectx = [e for e in errs if "fonts" not in e and "404" not in e]
        print(f"== {name} : {len(pages)} pages, problèmes : {len(probs)}, erreurs JS : {len(ectx)}")
        for k, v in probs.items(): print("  ", k, v)
        for e in ectx[:5]: print("   erreur :", e)
        bad += len(probs) + len(ectx)
        ctx.close()
    b.close()
sys.exit(1 if bad else 0)
