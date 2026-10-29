# Teste le module « analyse » (cf/site/m/analyse.js) sur des entreprises variées : forces, faiblesses, contexte.
# Usage : python3 tests/t_analyse.py [--shots dossier] [-v]
#   Vérifie : aucune erreur, pas de NaN / undefined / null / tiret cadratin, chaque facteur a un titre, un détail, une source,
#   au moins un élément pour chaque entreprise (même sans comptes), et le rendu HTML sans débordement à 390 et 1280 px.
import os, sys, json, re
exec(open("tests/audit.py").read().split("CHECK = ")[0])  # donne route() et sync_playwright
STATE = {}
def route2(r):  # les vrais cours du site (data/cours.json) plutôt que la maquette
    if "/api/cours" in r.request.url: return r.fulfill(status=404, body="")
    return route(r)
VERB = "-v" in sys.argv
SHOTS = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
IDS = (os.environ["IDS"] + " ").split() if os.environ.get("IDS") else ("lvmh totalenergies bnp-paribas renault unibail-rodamco-westfield engie orange sanofi axa apple nvidia pfizer exxonmobil realty-income "
       "tencent alibaba byd icbc country-garden baidu kweichow-moutai catl nestle novartis ubs bp hsbc rio-tinto atalaya-mining sap glencore "
       "credicorp nebius-group novo-nordisk tsmc aia").split()
JS = r"""async (ids) => {
  await Promise.all([PXP, analyseCharge()]);
  const out = {};
  for (const id of ids) {
    const s = RBY[id]; if (!s) { out[id] = { err: "absente" }; continue; }
    let c = null; if (!s.missing) { try { c = FULL[id] || (FULL[id] = await (await fetch(`/data/societes/${id}.json`)).json()); } catch (e) { } }
    try { const r = analyseForcesFaiblesses(s, c), h = analyseHTML(s, c), ia = analyseFaitsIA(s, c), ff = JSON.stringify(ficheFaits(s, c));
      const q = ["Quels sont ses atouts ?", "Quels sont ses risques ?", "Pourquoi est-elle risquée ?", "Est-ce une entreprise solide ?"].map(x => localAssist(s, c, x));
      out[id] = { r, hl: h.length, h, ia, ff: ff.length, q }; }
    catch (e) { out[id] = { err: String(e && e.stack || e).slice(0, 400) }; }
  }
  return out;
}"""
BAD = [("NaN", "NaN"), ("undefined", "undefined"), ("null", " null"), ("[object", "[object"), ("tiret cadratin", "—"), ("Infinity", "Infinity")]
pb = 0
BADS = dict(BAD)
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.route("**/*", route2)
    pg.goto("http://t.local/entreprise/lvmh"); pg.wait_for_timeout(800)
    res = pg.evaluate(JS, IDS)
    for i in IDS:
        o = res[i]
        if o.get("err"): print("ERREUR", i, o["err"]); pb += 1; continue
        r = o["r"]; tot = len(r["valorise"]) + len(r["defaut"]) + len(r["contexte"])
        txt = " ".join(it["titre"] + " " + it["detail"] + " " + (it.get("source") or "") for k in ("valorise", "defaut", "contexte") for it in r[k]) + " ".join(r["connu"] + r["manque"]) + o["ia"] + " ".join(x or "" for x in o["q"]) + re.sub("<[^>]+>", " ", o["h"])
        bad = [k for k, s in BAD if s in txt]
        noms = [it for k in ("valorise", "defaut", "contexte") for it in r[k] if not it.get("titre") or not it.get("detail") or not it.get("source")]
        if bad or noms or tot < 3: pb += 1; print("PROBLÈME", i, bad, [x.get("id") for x in noms], tot, [txt[max(0, txt.find(BADS[k]) - 120):txt.find(BADS[k]) + 30] for k in bad][:2])
        print(f"{i:28s} +{len(r['valorise'])} -{len(r['defaut'])} ctx{len(r['contexte'])}  html {o['hl']:6d}  ia {len(o['ia']):5d}  faits {o['ff']}")
        if VERB:
            for k in ("valorise", "defaut", "contexte"):
                for it in r[k]: print(f"   [{k[:3]} {it['poids']}] {it['titre']} :: {it['detail'][:160]}")
            print("   manque:", r["manque"])
            for x in o["q"]: print("   Q>", (x or "(rien)")[:300].replace("\n", " | "))
    if errs: pb += 1; print("ERREURS JS", errs[:3])
    # Rendu : on insère le bloc dans la page, à 1280 et 390 px
    for w in (1280, 390):
        pg.set_viewport_size({"width": w, "height": 900})
        for i in ("tencent", "atalaya-mining", "lvmh", "apple", "sap", "unibail-rodamco-westfield"):
            pg.goto(f"http://t.local/entreprise/{i}"); pg.wait_for_timeout(700)
            pg.evaluate("""(id) => { const el = document.querySelector('#etapes-corps') || document.querySelector('#app') || document.body; const d = document.createElement('div'); d.innerHTML = analyseHTML(RBY[id], FULL[id] || null); el.prepend(d.firstElementChild); }""", i)
            ov = pg.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
            if ov > 1: pb += 1; print("DÉBORDEMENT", w, i, ov)
            if SHOTS:
                os.makedirs(SHOTS, exist_ok=True)
                pg.locator("#analyse").screenshot(path=f"{SHOTS}/analyse_{i}_{w}.png")
    b.close()
print("problèmes :", pb)
sys.exit(1 if pb else 0)
