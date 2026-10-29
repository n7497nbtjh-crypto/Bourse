# Vérifie dans le navigateur ce que le chantier « calculs et données » change : comptes anciens
# sortis des médianes, des classements et des découvertes, dividende estimé repéré comme tel,
# taux de change de la BCE, indicateurs ajoutés, croissance sur exercices consécutifs.
#   python3 tests/t_donnees.py [--shots dossier]
import os, sys, json
from playwright.sync_api import sync_playwright

root = os.path.abspath("cf/site")
shots = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
if shots:
    os.makedirs(shots, exist_ok=True)

# Les vrais cours collectés : les indicateurs doivent se calculer sur l'ensemble des entreprises
with open(os.path.join(root, "data", "cours.json"), encoding="utf-8") as fh:
    COURS = json.load(fh)
COURS["items"].setdefault("c:honda", {"s": "NYSE:HMC", "cur": "USD", "p": 35.0, "chg": 0.2, "cap": 52000000000,
                                      "h52": 40, "l52": 25, "p1y": 30, "p3y": 28, "p5y": 26})


def route(r):
    u = r.request.url
    if "/api/cours" in u:
        return r.fulfill(json=COURS)
    if "/api/" in u or "openrouter.ai" in u:
        return r.fulfill(json={})
    if u.startswith("https://t.local/"):
        p = u[len("https://t.local/"):].split("?")[0].split("#")[0]
        f = os.path.join(root, p)
        if p and os.path.isfile(f):
            return r.fulfill(path=f)
        return r.fulfill(path=os.path.join(root, "index.html"), content_type="text/html")
    return r.abort()


fails = []
with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.route("**/*", route)
    pg.goto("https://t.local/entreprise/lvmh", wait_until="networkidle")
    pg.wait_for_timeout(1500)

    def ev(js):
        return pg.evaluate(js)

    # 1. les fonctions attendues sont bien celles qui tournent
    for f in ["donVieux", "donRetenue", "donDps", "donDpsNote", "donDette", "donMed", "donCroissance",
              "donPb", "donRoic", "donFxSync", "donMedInd", "donCagr"]:
        if ev(f"typeof {f}") != "function":
            fails.append(f"{f} absente")
    if "donCroissance" not in ev("String(ratios)"):
        fails.append("ratios() n'est pas celle de m/donnees.js")
    if "donCagr" not in ev("String(figuresOf)"):
        fails.append("figuresOf() n'est pas celle de m/donnees.js")
    if "provComptesPerimes" not in ev("String(computeMedians)"):
        fails.append("computeMedians() n'est pas celle de m/provenance.js")
    if "donFxSync" not in ev("String(computePE)"):
        fails.append("computePE() n'est pas celle de m/donnees.js")

    # 2. comptes anciens : exclus des médianes, des classements et des découvertes
    nb = ev("R.companies.filter(c=>!c.missing&&donVieux(c)).length")
    print("entreprises aux comptes anciens :", nb)
    if nb < 40:
        fails.append(f"seulement {nb} entreprises aux comptes anciens repérées (plus de 200 attendues)")
    if ev("R.companies.filter(c=>donRetenue(c)&&donVieux(c)).length"):
        fails.append("donRetenue garde des entreprises aux comptes anciens")
    if ev("typeof outVieux") != "function":
        fails.append("outVieux absente de m/outils.js")
    elif ev("R.companies.filter(c=>!c.missing&&donVieux(c)&&!outVieux(c)).length"):
        fails.append("les classements n'écartent pas les mêmes entreprises")

    # 3. médianes : effectif, exercices et entreprises écartées
    med = ev("donMed('conso')")
    print("médiane conso :", med)
    if not med or not med.get("n") or not med.get("annees"):
        fails.append("médiane sans effectif ni exercices")

    # 4. dividende : nature exposée
    nat = ev("(()=>{const o={};for(const c of R.companies){if(c.missing)continue;const d=donDps(c);const k=d.v==null?'aucun':d.estime?'estime':'publie';o[k]=(o[k]||0)+1}return o})()")
    print("natures des dividendes :", nat)

    # 5. taux de change : ceux de la BCE
    if not ev("donFxSync()"):
        fails.append("taux BCE non appliqués")
    fx = ev("[FXE.USD, FX && FX.USD, FXE.CZK != null]")
    if fx[1] and abs(fx[0] - fx[1]) > 1e-9:
        fails.append(f"FXE.USD={fx[0]} au lieu de {fx[1]}")
    if not fx[2]:
        fails.append("devises de la BCE non ajoutées à FXE")
    print("taux du dollar utilisé :", fx)

    # 6. une entreprise aux comptes anciens : ni PER ni rendement
    v = ev("(()=>{const c=RBY['honda']; if(!c)return null; const v=valo(c); return v&&{pe:v.pe,yld:v.yld,vieux:v.vieux,cap:!!v.capE,year:c.year}})()")
    print("honda :", v)
    if v and (v["pe"] is not None or v["yld"] is not None):
        fails.append("Honda : PER ou rendement encore calculé sur des comptes anciens")

    # 7. indicateurs ajoutés : des valeurs, aucun NaN
    ind = ev("(()=>{const o={};for(const k of ['ev_ebitda','rendement_fcf','cours_valeur_comptable','roce','roic']){let n=0,nan=0;for(const c of R.companies){if(c.missing)continue;let v=null;try{v=INDI[k][1](c)}catch(e){};if(v==null)continue;if(!isFinite(v))nan++;else n++}o[k]=[n,nan]}return o})()")
    print("indicateurs (valeurs, NaN) :", ind)
    for k, (n, nan) in ind.items():
        if nan:
            fails.append(f"{k} : {nan} valeurs non finies")
    if ind["cours_valeur_comptable"][0] < 200:
        fails.append("cours/valeur comptable : trop peu de valeurs (" + str(ind["cours_valeur_comptable"][0]) + ")")

    # 8. croissance : plus de « sur un an » entre exercices éloignés
    mauvais = ev("R.companies.filter(c=>!c.missing&&c.yearPrev!=null&&c.year-c.yearPrev>1&&ratios(c).g1!=null).length")
    if mauvais:
        fails.append(f"{mauvais} croissances sur un an calculées entre exercices éloignés")

    # 9. pas de NaN ni « undefined » visibles, aucune erreur JS
    for url in ["/entreprise/lvmh", "/entreprise/lvmh/comptes", "/entreprise/honda", "/entreprises",
                "/classements", "/decouvertes", "/dividendes", "/comparer?ids=lvmh,hermes,kering"]:
        pg.goto("https://t.local" + url, wait_until="networkidle")
        pg.wait_for_timeout(1200)
        t = pg.inner_text("body")
        for mot in ["NaN", "undefined", "Infinity"]:
            if mot in t:
                fails.append(f"{url} : « {mot} » affiché")
        if url == "/decouvertes":
            vieilles = ev("(()=>{try{return outDayPicks(TODAY).filter(x=>donVieux(x.c)).length}catch(e){return -1}})()")
            if vieilles > 0:
                fails.append(f"découvertes : {vieilles} entreprises aux comptes anciens")
        if shots:
            pg.screenshot(path=os.path.join(shots, url.strip("/").replace("/", "_").replace("?", "_") + ".png"))
    if errs:
        fails.append("erreurs JS : " + " | ".join(errs[:3]))
    b.close()

print("\n".join("ÉCHEC " + f for f in fails) if fails else "donnees (navigateur) : tout est bon")
sys.exit(1 if fails else 0)
