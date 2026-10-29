# Module « contexte » (cf/site/m/contexte.js) : « Ce qui explique ces chiffres », « L'actualité qui la concerne »,
# marqueurs de doute de l'IA locale. Vérifie 20 fiches à 390 et 1280 px : pas d'erreur JS, pas de NaN/undefined,
# pas de débordement horizontal, contenu attendu présent.
# Usage : python3 tests/t_contexte.py [--shots dossier]
import os, sys, json
exec(open("tests/audit.py").read().split("CHECK = ")[0])  # route() et sync_playwright
STATE = {}
shots = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
if shots: os.makedirs(shots, exist_ok=True)
IDS = ["totalenergies", "alibaba", "lvmh", "bnp-paribas", "stellantis", "nvidia", "societe-generale", "klepierre", "sap", "pfizer",
       "air-france-klm", "engie", "arkema", "tencent", "asml", "shell", "kering", "pernod-ricard", "covivio", "jd-com"]
SANS = {"sap", "tencent"}  # entreprises sans comptes lus : pas de bloc « chiffres », bloc actualité dans « Son métier »
ATTENDU = {"totalenergies": ["Moyen-Orient", "Gaz européen", "retournement"], "alibaba": ["plateformes", "Trêve"], "lvmh": ["Chine"], "bnp-paribas": ["BCE"],
           "stellantis": ["Droits de douane"], "nvidia": ["licence"], "klepierre": ["foncières"], "air-france-klm": ["Compagnies aériennes"], "pfizer": ["Covid"]}
J = r"""() => {
  const t = document.body.innerText, ov = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  const ch = document.querySelector('#contexte-chiffres'), ac = document.querySelector('#contexte-actu');
  const bad = [...document.querySelectorAll('#contexte-chiffres, #contexte-actu')].map(e => e.innerText).join(' ').match(/NaN|undefined|null|\[object|Infinity|—/g);
  const wide = [...document.querySelectorAll('#contexte-chiffres *, #contexte-actu *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1 && !e.closest('.scroll-x, .tbx-sc'); }).map(e => e.tagName + '.' + e.className).slice(0, 3);
  return { ov, ch: ch ? ch.innerText : null, ac: ac ? ac.innerText : null, bad, wide };
}"""
ok, ko = 0, []
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for W in (390, 1280):
        pg = b.new_page(viewport={"width": W, "height": 900}); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.route("**/*", route)
        for i in IDS:
            errs.clear()
            for et in (["metier"] if i in SANS else ["comptes", "retenir"]):
                pg.goto(f"http://t.local/entreprise/{i}?etape={et}"); pg.wait_for_timeout(1300)
                r = pg.evaluate(J); pb = []
                if errs: pb.append("erreurs JS : " + "; ".join(errs[:2]))
                if r["ov"] > 1: pb.append(f"débordement {r['ov']} px")
                if r["bad"]: pb.append("texte suspect : " + ",".join(set(r["bad"])))
                if r["wide"]: pb.append("élément trop large : " + ",".join(r["wide"]))
                if not r["ac"]: pb.append("bloc actualité absent")
                if i not in SANS and not r["ch"]: pb.append("bloc chiffres absent")
                allt = (r["ch"] or "") + (r["ac"] or "")
                for m in (ATTENDU.get(i, []) if W == 1280 and et == "comptes" else []):
                    if m.lower() not in allt.lower(): pb.append(f"« {m} » absent")
                if shots and i in ("totalenergies", "alibaba", "bnp-paribas", "sap", "klepierre", "nvidia"):
                    for sel, nm in (("#contexte-chiffres", "chiffres"), ("#contexte-actu", "actu")):
                        el = pg.locator(sel)
                        if el.count() and el.first.is_visible(): el.first.screenshot(path=f"{shots}/{i}_{nm}_{W}.png")
                if pb: ko.append(f"{i} {et} {W}px : " + " | ".join(pb))
                else: ok += 1
        pg.close()
    # IA locale : questions d'actualité et marqueurs de doute
    pg = b.new_page(); pg.route("**/*", route); pg.goto("http://t.local/entreprise/totalenergies"); pg.wait_for_timeout(1500)
    rep = pg.evaluate("""async () => { const out = {}; for (const [id, q] of [["totalenergies", "quel impact de la guerre au moyen orient sur total"], ["alibaba", "les risques en chine pour alibaba"], ["lvmh", "est ce que la chine pèse sur ses ventes"], ["sap", "est elle rentable"], ["nvidia", "quel effet des droits de douane"], ["totalenergies", "pourquoi le cours baisse"]]) { const s = RBY[id]; let c = null; if (!s.missing) c = FULL[id] || (FULL[id] = await (await fetch(`/data/societes/${id}.json`)).json()); out[id + " | " + q] = localAssist(s, c, q); } out.faits = Object.keys(ficheFaits(RBY.totalenergies, FULL.totalenergies)); return out; }""")
    for k, v in rep.items():
        print("---", k, "\n", v if isinstance(v, str) else json.dumps(v, ensure_ascii=False))
    b.close()
print(f"Fiches : {ok}/{ok + len(ko)} sans problème")
for x in ko: print("  ", x)
sys.exit(1 if ko else 0)
