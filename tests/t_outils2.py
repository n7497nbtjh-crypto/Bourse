# Teste les pages du module « outils2 » (recouvrement d'ETF, « Et si j'avais investi ? », simulateur, agenda, hier) à 1440 et 390 px.
# Usage : python3 tests/t_outils2.py [--shots dossier]
import os, sys, json
exec(open("tests/audit.py").read().split("CHECK = ")[0])  # donne route() et sync_playwright
STATE = {}
SHOTS = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
def route3(r):
    u = r.request.url
    if "/api/cours" in u: return r.fulfill(status=404, body="")  # les vrais cours du site (data/cours.json)
    return route(r)
CHK = r"""(W) => {
  const p = [];
  if (document.documentElement.scrollWidth > W + 1) p.push('page plus large : ' + document.documentElement.scrollWidth);
  document.querySelectorAll('#app *').forEach(e => { if (e.closest('.tbx-box,.scroll-x,.o2-cw')) return; const r = e.getBoundingClientRect(); if (r.width && r.right > W + 1) p.push('dépasse : ' + e.tagName + '.' + e.className); });
  const t = document.querySelector('#app').textContent;
  if (/NaN|undefined|Infinity|\[object/.test(t)) p.push('NaN/undefined/Infinity');
  if (t.length < 400) p.push('page presque vide');
  return [...new Set(p)].slice(0, 6);
}"""
PAGES = [("/outils/recouvrement", "rec"), ("/outils/recouvrement?a=amundi-msci-world-pea&b=ishares-core-sp500&c=amundi-nasdaq100-pea&w=60,30,10", "rec3"),
         ("/outils/si-javais", "si"), ("/outils/si-javais?k=c:apple&ans=3", "si_apple"), ("/outils/si-javais?k=e:amundi-msci-world-pea&ans=1", "si_etf"),
         ("/simulateurs", "sim"), ("/simulateurs/frais", "sim_frais"), ("/simulateurs/pea-cto?env=cto&ans=3", "sim_cto"), ("/simulateurs/epargne?hyp=perso&rp=1&rc=4&rf=7&reel=1", "sim_perso"),
         ("/agenda", "agenda"), ("/agenda?type=Résultats&p=semaine", "agenda_res"), ("/hier", "hier"), ("/hier?d=2026-10-27", "hier27")]
bad = 0
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for nom, opts in [("ordi", dict(viewport={"width": 1440, "height": 900})), ("tel", dict(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2))]:
        ctx = b.new_context(**opts); pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e) + " @ " + pg.url))
        pg.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errs.append(m.text))
        pg.route("**/*", route3)
        for path, n in PAGES:
            pg.goto("http://t.local" + path); pg.wait_for_timeout(1800)
            p = pg.evaluate(CHK, opts["viewport"]["width"])
            if p: bad += 1; print(nom, path, p)
            if SHOTS: os.makedirs(SHOTS, exist_ok=True); pg.screenshot(path=f"{SHOTS}/{nom}_{n}.png", full_page=True)
        # Recouvrement : un preset met deux fonds, le verdict et le tableau des paires s'affichent
        pg.goto("http://t.local/outils/recouvrement"); pg.wait_for_timeout(1500)
        t = pg.inner_text("#o2rr")
        if "poids réellement en double" not in t.lower() or "%" not in t: bad += 1; print(nom, "recouvrement", t[:200])
        # Et si : le montant change la phrase
        pg.goto("http://t.local/outils/si-javais?k=c:lvmh&ans=5"); pg.wait_for_timeout(1500)
        t1 = pg.inner_text("#o2sr .o2-verdict"); pg.fill("#o2sm", "2000"); pg.wait_for_timeout(500); t2 = pg.inner_text("#o2sr .o2-verdict").replace("\u202f", " ").replace("\xa0", " ")
        if t1 == t2 or "2 000 €" not in t2.replace("\u202f", " ").replace("\xa0", " "): bad += 1; print(nom, "si-javais", t1[:120], "|", t2[:120])
        if "Livret A" not in pg.inner_text("#o2sr") or "Hypothèses" not in pg.inner_text("#o2sr"): bad += 1; print(nom, "si-javais : séries ou hypothèses manquantes")
        # Simulateur : PEA puis compte-titres, la valeur nette change ; frais de change modifiables
        pg.goto("http://t.local/simulateurs"); pg.wait_for_timeout(1200)
        a = pg.inner_text("#o2res .o2-verdict"); pg.click("#o2env button[data-v=cto]"); pg.wait_for_timeout(300); c = pg.inner_text("#o2res .o2-verdict")
        if a == c or "compte-titres" not in c: bad += 1; print(nom, "simulateur PEA/CTO", a[:100], "|", c[:100])
        pg.click("#o2det summary"); pg.fill("#o2chg", "0.5"); pg.wait_for_timeout(400)
        if "Frais de change" not in pg.inner_text("#o2res"): bad += 1; print(nom, "frais de change absents")
        # Hier : la synthèse IA s'ouvre
        pg.goto("http://t.local/hier?d=2026-10-28"); pg.wait_for_timeout(2000)
        if pg.locator("[data-ia]").count():
            pg.locator("[data-ia]").first.click(); pg.wait_for_timeout(500)
            if "Connectez votre IA" not in pg.inner_text(".o2-hia >> nth=0"): bad += 1; print(nom, "invitation à connecter son IA absente")
        else: bad += 1; print(nom, "pas de bouton IA sur /hier")
        if errs: bad += len(errs); print(nom, "erreurs JS :", errs[:5])
        ctx.close()
    b.close()
print("problèmes :", bad); sys.exit(1 if bad else 0)
