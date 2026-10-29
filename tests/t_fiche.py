# Fiches entreprise : mise en page équilibrée à toutes les largeurs, rien de bloqué sur « Chargement… ».
# Usage : python3 tests/t_fiche.py [--shots dossier] [--ids lvmh,apple] [--largeurs 1440,390] [--presse-bloquee]
# Mesures, pour chaque fiche et chaque largeur :
#  - la colonne latérale ne dépasse pas la colonne principale (sinon un grand vide à gauche en bas de page) ;
#  - pas de débordement horizontal, pas de NaN / undefined, pas d'erreur JavaScript ;
#  - l'en-tête (identité, cours, verdict, profil) tient dans le premier écran sur ordinateur ;
#  - aucun « Chargement… » ne reste affiché (la presse peut être bloquée avec --presse-bloquee) ;
#  - les étapes s'ouvrent toutes sans erreur, la FAQ a entre 8 et 12 questions avec une réponse.
import os, sys, json
exec(open("tests/audit.py").read().split("CHECK = ")[0])  # route() et sync_playwright
STATE = {}
ARG = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
SHOTS = ARG("--shots")
IDS = ARG("--ids", "totalenergies,lvmh,bnp-paribas,axa,scor,gecina,unibail-rodamco-westfield,apple,nvidia,microsoft,sap,lectra,dassault-aviation,vinci,schneider-electric,cegedim,hermes,sodexo,toyota,tsmc,hdfc-bank,saudi-aramco,siemens,asml,rio-tinto,weyerhaeuser,atalaya-mining,airbus,kering").split(",")
WS = [int(x) for x in ARG("--largeurs", "1440,1280,1024,768,390").split(",")]
BLOQUE = "--presse-bloquee" in sys.argv
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
  const p = [], app = document.querySelector('#app'), H = innerHeight;
  if (document.documentElement.scrollWidth > W + 1) p.push('page plus large que l\'écran : ' + document.documentElement.scrollWidth);
  document.querySelectorAll('main *').forEach(e => { if (e.closest('.scroll-x,.tabs,.chart,.bars,.filters,.qtabs,.etapes')) return; const r = e.getBoundingClientRect(); if (r.width && r.right > W + 1) p.push('dépasse : ' + e.tagName + '.' + String(e.className).slice(0, 30)); });
  if (/NaN|undefined|\[object/.test(app.textContent)) p.push('NaN ou undefined affiché');
  const out = { p: [...new Set(p)].slice(0, 6) };
  const cols = document.querySelector('#ctab .fcols') || document.querySelector('#ctab .cols');
  if (cols && cols.children.length > 1) {
    const a = cols.children[0].getBoundingClientRect(), b = cols.children[1].getBoundingClientRect();
    out.main = Math.round(a.height); out.side = Math.round(b.height);
    if (b.left > a.left + 50 && b.height > a.height + 220) out.p.push(`colonne latérale plus longue que la principale de ${Math.round(b.height - a.height)} px`);
  }
  out.doc = document.documentElement.scrollHeight;
  const v = document.querySelector('#fverdict'); out.verdict = v ? Math.round(v.getBoundingClientRect().bottom + scrollY) : null;
  const et = document.querySelector('#etapes'); out.etapes = et ? Math.round(et.getBoundingClientRect().top + scrollY) : null;
  return out;
}"""
LOADING = r"""() => [...document.querySelectorAll('#app *')].filter(e => !e.children.length && /Chargement/.test(e.textContent) && e.offsetParent).map(e => (e.closest('section,[id]') || e).id || e.className).slice(0, 4)"""
ETAPES = r"""async () => {
  const out = [], btns = [...document.querySelectorAll('#etapes [data-et]')];
  for (const b of btns) { b.click(); await new Promise(r => setTimeout(r, 60)); const d = document.querySelector(`.etape[data-etape="${b.dataset.et}"]`);
    const t = d ? d.innerText : ''; if (!d || t.trim().length < 40) out.push('étape vide : ' + b.dataset.et); if (/NaN|undefined/.test(t)) out.push('NaN dans ' + b.dataset.et); }
  const faq = document.querySelectorAll('#faq details');
  if (btns.some(b => b.dataset.et === 'faq')) { if (faq.length < 8 || faq.length > 12) out.push('FAQ : ' + faq.length + ' questions'); faq.forEach(d => { d.open = true; if ((d.querySelector('.accb') || d).innerText.trim().length < 20) out.push('FAQ sans réponse : ' + d.querySelector('summary').innerText.slice(0, 40)); }); }
  if (btns.length) btns[0].click();
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
        pg.route("**/*", route3)
        probs = {}
        for i in IDS:
            pg.goto(f"http://t.local/entreprise/{i}"); pg.wait_for_timeout(900)
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
                    pg.goto(f"http://t.local/entreprise/{i}/{t}"); pg.wait_for_timeout(500)
                    x = pg.evaluate(MESURE, W); m["p"] += [f"[{t}] " + y for y in x["p"]]
            if m["p"]: probs[i] = m["p"]
            print(f"  {W:>4} {i:<28} doc {m['doc']:>5}  principale {m.get('main', '-'):>5}  latérale {m.get('side', '-'):>5}  verdict {m['verdict']}  étapes {m['etapes']}" + ("  !" if m["p"] else ""))
            if SHOTS:
                os.makedirs(SHOTS, exist_ok=True)
                pg.goto(f"http://t.local/entreprise/{i}"); pg.wait_for_timeout(900)
                pg.screenshot(path=f"{SHOTS}/{i}_{W}.png", full_page=True)
        print(f"== {W} px : {len(IDS)} fiches, problèmes : {len(probs)}, erreurs JS : {len(errs)}")
        for k, v in probs.items(): print("   ", k, v)
        for e in errs[:6]: print("    erreur :", e)
        bad += len(probs) + len(errs)
        ctx.close()
    b.close()
sys.exit(1 if bad else 0)
