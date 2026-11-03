# Module « contexte » (cf/site/m/contexte.js) : « Ce qui explique ces chiffres », « L'actualité qui la concerne »,
# marqueurs de doute de l'IA locale. Vérifie 20 fiches à 390 et 1280 px : pas d'erreur JS, pas de NaN/undefined,
# pas de débordement horizontal, contenu attendu présent. Depuis la fiche v4 (3/11), les deux blocs du module ne sont plus
# affichés sur la fiche : le test les construit dans la page et vérifie leur contenu, et vérifie le bloc #actu de la fiche.
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
J = r"""async () => {
  // Fiche v4 : bloc #actu. Les blocs du module (contexteChiffresHTML, contexteActuHTML) ne sont plus posés sur la fiche (3/11) :
  // on les construit ici dans un cadre de la page pour vérifier leur contenu (ils servent aussi à l'IA locale).
  const t = document.body.innerText, ov = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  await ctxCharge(); const id = location.pathname.split('/')[2], s = RBY[id];
  let c = null; if (!s.missing) c = FULL[id] || (FULL[id] = await (await fetch(`/data/societes/${id}.json`)).json());
  let box = document.getElementById('t-ctx'); if (!box) { box = document.createElement('div'); box.id = 't-ctx'; document.querySelector('#app').appendChild(box); }
  box.innerHTML = (c ? contexteChiffresHTML(s, c, false) : '') + contexteActuHTML(s, c);
  box.querySelectorAll('details').forEach(d => d.open = true);
  const ch = document.querySelector('#contexte-chiffres'), ac = document.querySelector('#contexte-actu'), fa = document.querySelector('#actu');
  const bad = [...document.querySelectorAll('#contexte-chiffres, #contexte-actu, #actu')].map(e => e.innerText).join(' ').match(/NaN|undefined|null|\[object|Infinity|—/g);
  const wide = [...document.querySelectorAll('#contexte-chiffres *, #contexte-actu *, #actu *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1 && !e.closest('.scroll-x, .tbx-sc'); }).map(e => e.tagName + '.' + e.className).slice(0, 3);
  box.remove();
  return { ov, ch: ch ? ch.innerText : null, ac: ac ? ac.innerText : null, fa: !!fa, bad, wide };
}"""
ok, ko = 0, []
ACTU = {}
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for W in (390, 1280):
        pg = b.new_page(viewport={"width": W, "height": 900}); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.route("**/*", route)
        for i in IDS:
            errs.clear()
            for et in ["fiche"]:
                pg.goto(f"http://t.local/entreprise/{i}"); pg.wait_for_timeout(1300)
                r = pg.evaluate(J); pb = []
                if errs: pb.append("erreurs JS : " + "; ".join(errs[:2]))
                if r["ov"] > 1: pb.append(f"débordement {r['ov']} px")
                if r["bad"]: pb.append("texte suspect : " + ",".join(set(r["bad"])))
                if r["wide"]: pb.append("élément trop large : " + ",".join(r["wide"]))
                if i not in SANS and not r["fa"]: pb.append("bloc #actu de la fiche absent")  # sans comptes : fiche réduite à l'en-tête
                if not r["ac"]: pb.append("contexte d'actualité vide")
                if i not in SANS and not r["ch"]: pb.append("contexte des chiffres vide")
                allt = (r["ch"] or "") + (r["ac"] or "")
                for m in (ATTENDU.get(i, []) if W == 1280 else []):
                    if m.lower() not in allt.lower(): pb.append(f"« {m} » absent")
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
