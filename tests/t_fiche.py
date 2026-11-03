# Fiches entreprise : mise en page équilibrée à toutes les largeurs, rien de bloqué sur « Chargement… ».
# Usage : python3 tests/t_fiche.py [--shots dossier] [--ids lvmh,apple] [--largeurs 1440,390] [--presse-bloquee]
# Fiche v4 (m/fiche4.js, 3/11). Mesures, pour chaque fiche et chaque largeur :
#  - pas de débordement horizontal, pas de NaN / undefined, pas d'erreur JavaScript ;
#  - le verdict tient dans le premier écran sur ordinateur ;
#  - le fil a 5 étapes (4 pour banques et assurances), les blocs Actualité et Tous les chiffres sont là, avec des tableaux remplis ;
#  - aucun « Chargement… » ne reste affiché (la presse peut être bloquée avec --presse-bloquee) ;
#  - les anciennes adresses /comptes et /actualite ouvrent la même page.
import os, sys, json
exec(open("tests/audit.py").read().split("CHECK = ")[0])  # route() et sync_playwright
STATE = {}
ARG = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
SHOTS = ARG("--shots")
IDS = ARG("--ids", "totalenergies,lvmh,bnp-paribas,axa,scor,gecina,unibail-rodamco-westfield,apple,nvidia,microsoft,sap,lectra,dassault-aviation,vinci,schneider-electric,cegedim,hermes,sodexo,toyota,tsmc,hdfc-bank,saudi-aramco,siemens,asml,rio-tinto,weyerhaeuser,atalaya-mining,airbus,kering").split(",")
WS = [int(x) for x in ARG("--largeurs", "1440,1280,1024,768,390").split(",")]
BLOQUE = "--presse-bloquee" in sys.argv
BASE = ARG("--base", "http://t.local")  # --base https://repere-bourse.pages.dev : contrôle en production
FONTS = os.environ.get("FONT_DIR")
U = {c["id"]: c for c in json.load(open("cf/site/data/univers.json"))["companies"]}
IDS = [i for i in IDS if i in U]

def route3(r):
    u = r.request.url
    if "/api/cours" in u: return r.fulfill(status=404, body="")  # les vrais cours de data/cours.json
    if "/api/presse" in u and BLOQUE: return  # la requête ne répond jamais
    if "fonts.googleapis.com" in u and FONTS:
        fams = [("Fraunces", "fraunces", w) for w in (600, 800, 900)] + [("IBM Plex Sans", "ibm-plex-sans", w) for w in (400, 500, 600, 700)] + [("IBM Plex Mono", "ibm-plex-mono", w) for w in (400, 500, 600)]
        css = "".join(f"@font-face{{font-family:'{n}';font-style:normal;font-weight:{w};src:url(https://fonts.gstatic.com/{k}-latin-{w}-normal.woff2) format('woff2')}}" for n, k, w in fams)
        return r.fulfill(body=css, content_type="text/css")
    if "fonts.gstatic.com" in u and FONTS:
        f = os.path.join(FONTS, u.rsplit("/", 1)[1]); return r.fulfill(path=f) if os.path.isfile(f) else r.fulfill(status=404, body="")
    return route(r)

MESURE = r"""(W) => {
  const p = [], app = document.querySelector('#app');
  if (document.documentElement.scrollWidth > W + 1) p.push('page plus large que l\'écran : ' + document.documentElement.scrollWidth);
  document.querySelectorAll('#app *').forEach(e => { if (e.closest('.scroll-x,.ek-tvbox')) return; const r = e.getBoundingClientRect(); if (r.width && r.right > W + 1) p.push('dépasse : ' + e.tagName + '.' + String(e.className).slice(0, 30)); });
  if (/NaN|undefined|\[object/.test(app.textContent)) p.push('NaN ou undefined affiché');
  const out = { p: [...new Set(p)].slice(0, 6) };
  out.doc = document.documentElement.scrollHeight;
  const v = document.querySelector('.ek-vrd'); out.verdict = v ? Math.round(v.getBoundingClientRect().bottom + scrollY) : null;
  out.etapes = document.querySelectorAll('.ek-step').length;
  return out;
}"""
LOADING = r"""() => [...document.querySelectorAll('#app *')].filter(e => !e.children.length && /Chargement/.test(e.textContent) && e.offsetParent).map(e => (e.closest('section,[id]') || e).id || e.className).slice(0, 4)"""
ETAPES = r"""() => {
  const out = [], n = document.querySelectorAll('.ek-step').length, sans = /pas encore relevés|incomplets/.test(document.querySelector('#app').innerText);
  if (sans) return out; // fiche réduite à l'en-tête : rien d'autre à vérifier
  if (!document.querySelector('.ek-vrd')) out.push('verdict absent');
  if (n !== 5 && n !== 4) out.push('fil : ' + n + ' étapes');
  if (!document.querySelector('#actu')) out.push('bloc Actualité absent');
  const t = document.querySelector('#tout'); if (!t) out.push('bloc Tous les chiffres absent');
  else { const tc = t.querySelectorAll('.ek-tc'); if (tc.length < 2) out.push('Tous les chiffres : ' + tc.length + ' tableau(x)');
    tc.forEach(c => { if (c.querySelectorAll('tbody tr').length < 1 && !c.id) out.push('tableau vide : ' + (c.querySelector('h3') || c).innerText.slice(0, 30)); }); }
  return out;
}"""
bad = 0
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for W in WS:
        mob = W < 700
        ctx = b.new_context(viewport={"width": W, "height": 844 if mob else 900}, has_touch=mob, is_mobile=mob, device_scale_factor=1)
        pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e) + " @ " + pg.url))
        pg.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errs.append(m.text + " @ " + pg.url))
        if BASE == "http://t.local": pg.route("**/*", route3)
        probs = {}
        for i in IDS:
            pg.goto(f"{BASE}/entreprise/{i}"); pg.wait_for_timeout(900 if BASE == "http://t.local" else 3500)
            m = pg.evaluate(MESURE, W)
            if not mob and m["verdict"] and m["verdict"] > 900: m["p"].append(f"verdict sous la ligne de flottaison ({m['verdict']} px)")
            e2 = pg.evaluate(ETAPES)
            m["p"] += e2
            if BLOQUE or W == WS[0]:
                pg.wait_for_timeout(11000 if BLOQUE else 2500)
                l = pg.evaluate(LOADING)
                if l: m["p"].append("Chargement… resté affiché : " + ", ".join(l))
            for t in ("comptes", "actualite"):
                if W in (WS[0], WS[-1]):
                    pg.goto(f"{BASE}/entreprise/{i}/{t}"); pg.wait_for_timeout(500)
                    x = pg.evaluate(MESURE, W); m["p"] += [f"[{t}] " + y for y in x["p"]]
                    if x["etapes"] != m["etapes"]: m["p"].append(f"[{t}] pas la même page ({x['etapes']} étapes au lieu de {m['etapes']})")
            if m["p"]: probs[i] = m["p"]
            print(f"  {W:>4} {i:<28} doc {m['doc']:>5}  verdict {m['verdict']}  étapes {m['etapes']}" + ("  !" if m["p"] else ""))
            if SHOTS:
                os.makedirs(SHOTS, exist_ok=True)
                pg.goto(f"{BASE}/entreprise/{i}"); pg.wait_for_timeout(900 if BASE == "http://t.local" else 3500)
                pg.screenshot(path=f"{SHOTS}/{i}_{W}.png", full_page=True)
        print(f"== {W} px : {len(IDS)} fiches, problèmes : {len(probs)}, erreurs JS : {len(errs)}")
        for k, v in probs.items(): print("   ", k, v)
        for e in errs[:6]: print("    erreur :", e)
        bad += len(probs) + len(errs)
        ctx.close()
    b.close()
sys.exit(1 if bad else 0)
