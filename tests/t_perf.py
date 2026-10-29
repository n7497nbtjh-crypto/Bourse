# Mesures objectives de l'interface et du chargement (audit d'octobre 2026, docs/audit-2026-10.md).
# Sert la version locale comme tests/audit.py (fichiers de cf/site, API simulées, sites extérieurs bloqués),
# puis, pour chaque page et chaque largeur (390 et 1440 px) :
#   - octets et requêtes avant le premier affichage, temps jusqu'au contenu (processeur ralenti x4 sur mobile),
#     LCP, CLS, total des tâches longues (> 50 ms) ;
#   - textes à faible contraste (ratio WCAG 2.1 calculé contre le fond réel), tailles de police,
#     cibles tactiles plus petites que 44 px (et 24 px), titres, images sans texte alternatif,
#     boutons et champs sans nom accessible, hauteur de la page en écrans.
# Usage : python3 tests/t_perf.py [--out dossier] [--shots] [--pages /,/marches]
# Le réseau n'est pas simulé (fichiers locaux) : les temps mesurent le coût du JavaScript, pas celui du téléchargement.
import os, sys, json, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath("cf/site")
ARG = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
OUT = ARG("--out", "/tmp/bilan-mesures")
SHOTS = "--shots" in sys.argv
PAGES = (ARG("--pages") or "/,/entreprise/lvmh,/entreprise/lvmh/comptes,/etf/amundi-msci-world-pea,/comparer?ids=lvmh,kering,hermes,/portefeuille,/marches,/apprendre").split(",")
# Les ids de /comparer contiennent des virgules : on recolle les morceaux qui ne commencent pas par « / »
P2 = []
for p in PAGES:
    if p.startswith("/") or not P2: P2.append(p)
    else: P2[-1] += "," + p
PAGES = P2
COURS = json.load(open(os.path.join(ROOT, "data/cours.json")))
STATS = {}

def route(r):
    u = r.request.url
    st = STATS.setdefault("cur", {"n": 0, "octets": 0, "ext": 0, "par": {}})
    if "/api/cours" in u: return r.fulfill(json=COURS)
    if "/api/" in u or "/mcp" in u: return r.fulfill(json={})
    if "//t.local" not in u:  # sites extérieurs : comptés, pas joints
        st["ext"] += 1; host = u.split("/")[2]; st["par"][host] = st["par"].get(host, 0) + 1
        return r.fulfill(status=404, body="")
    path = u.split("//t.local", 1)[1].split("#")[0].split("?")[0]
    f = os.path.join(ROOT, path.lstrip("/"))
    if not os.path.isfile(f):
        if "." in path.rsplit("/", 1)[-1]: return r.fulfill(status=404, body="")
        f = os.path.join(ROOT, "index.html")
    st["n"] += 1; st["octets"] += os.path.getsize(f)
    return r.fulfill(path=f)

INIT = """
window.__lcp = 0; window.__cls = 0; window.__lt = 0; window.__ltn = 0;
try {
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) { window.__lt += e.duration; window.__ltn++; } }).observe({ type: 'longtask', buffered: true });
} catch (e) {}
"""

MESURE = r"""(W) => {
  const lum = c => { const v = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const rgba = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const mix = (top, bot) => { const a = top[3]; return [top[0] * a + bot[0] * (1 - a), top[1] * a + bot[1] * (1 - a), top[2] * a + bot[2] * (1 - a), 1]; };
  const bgOf = el => { const stack = []; for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) { stack.push(c); if (c[3] >= 1) break; } }
    let b = [255, 255, 255, 1]; for (let i = stack.length - 1; i >= 0; i--) b = mix(stack[i], b); return b; };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const zone = document.querySelector('#app');
  const txt = [];
  zone.querySelectorAll('*').forEach(e => {
    if (!vis(e)) return;
    const own = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
    if (!own) return;
    const s = getComputedStyle(e); const fg = rgba(s.color); if (!fg) return;
    const bg = bgOf(e), col = mix(fg, bg), fs = parseFloat(s.fontSize), fw = +s.fontWeight || 400;
    const large = fs >= 24 || (fs >= 18.66 && fw >= 700);
    txt.push({ r: ratio(col, bg), fs, large, c: s.color, b: 'rgb(' + bg.slice(0, 3).map(Math.round).join(',') + ')', t: own.slice(0, 40), n: own.length });
  });
  const faible = txt.filter(x => x.r < (x.large ? 3 : 4.5));
  const grp = {}; faible.forEach(x => { const k = x.c + ' sur ' + x.b; (grp[k] = grp[k] || { k, r: Math.round(x.r * 100) / 100, n: 0, ex: x.t, fs: x.fs }).n++; });
  const fsH = {}; let chars = 0, petits = 0; txt.forEach(x => { const k = Math.round(x.fs * 2) / 2; fsH[k] = (fsH[k] || 0) + x.n; chars += x.n; if (x.fs < 12) petits += x.n; });
  const cibles = [...document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab],label[for]')].filter(vis).filter(e => !e.closest('.tradingview-widget-container'));
  const sous44 = [], sous24 = [];
  cibles.forEach(e => { const r = e.getBoundingClientRect(); const m = Math.min(r.width, r.height); if (m < 44) sous44.push(e); if (m < 24) sous24.push(e.tagName.toLowerCase() + ':' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24)); });
  const nom = e => (e.getAttribute('aria-label') || e.getAttribute('title') || e.textContent || e.value || '').trim() || (e.id && document.querySelector('label[for="' + e.id + '"]') ? 'label' : '') || (e.closest('label') ? 'label' : '');
  const sansNom = [...document.querySelectorAll('button,a[href],input:not([type=hidden]):not([type=submit]),select,textarea')].filter(vis).filter(e => !nom(e) && !(e.tagName === 'INPUT' && e.placeholder && e.getAttribute('aria-label')) && !e.querySelector('img[alt]:not([alt=""]),svg title'));
  const imgs = [...document.querySelectorAll('#app img')].filter(i => !i.hasAttribute('alt'));
  const hs = [...document.querySelectorAll('#app h1,#app h2,#app h3,#app h4')].filter(vis).map(h => +h.tagName[1]);
  let saut = 0; hs.forEach((h, i) => { if (i && h > hs[i - 1] + 1) saut++; });
  return {
    ecrans: Math.round(document.documentElement.scrollHeight / innerHeight * 10) / 10,
    mots: (zone.innerText || '').split(/\s+/).filter(Boolean).length,
    textes: txt.length, contraste_faible: faible.length, groupes: Object.values(grp).sort((a, b) => b.n - a.n).slice(0, 8),
    polices: fsH, part_moins_12px: chars ? Math.round(petits / chars * 1000) / 10 : 0,
    cibles: cibles.length, sous44: sous44.length, sous24: sous24.length, ex24: [...new Set(sous24)].slice(0, 6),
    sans_nom: sansNom.length, ex_sans_nom: sansNom.slice(0, 4).map(e => e.outerHTML.slice(0, 90)),
    img_sans_alt: imgs.length, h1: hs.filter(h => h === 1).length, h2: hs.filter(h => h === 2).length, sauts_titres: saut,
    deborde: document.documentElement.scrollWidth > W + 1,
  };
}"""

res = {}
os.makedirs(OUT, exist_ok=True)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for nom, opts, cpu in [("tel390", dict(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2), 4),
                           ("ordi1440", dict(viewport={"width": 1440, "height": 900}), 1)]:
        ctx = b.new_context(service_workers="block", **opts); ctx.set_default_timeout(60000)
        ctx.add_init_script(INIT)
        pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)[:160]))
        pg.on("console", lambda m: m.type == "error" and "404" not in m.text and errs.append(m.text[:160]))
        cdp = ctx.new_cdp_session(pg)
        if cpu > 1: cdp.send("Emulation.setCPUThrottlingRate", {"rate": cpu})
        pg.route("**/*", route)
        for path in PAGES:
            STATS["cur"] = {"n": 0, "octets": 0, "ext": 0, "par": {}}
            t0 = time.time()
            pg.goto("http://t.local" + path, wait_until="commit")
            try: pg.wait_for_function("document.querySelector('#app') && document.querySelector('#app').textContent.trim().length > 200 && !/Chargement/.test(document.querySelector('#app').textContent.slice(0, 300))", timeout=60000)
            except Exception: pass
            contenu = round(time.time() - t0, 2)
            avant = dict(STATS["cur"])
            pg.wait_for_timeout(1500)
            m = pg.evaluate(MESURE, opts["viewport"]["width"])
            perf = pg.evaluate("({lcp: Math.round(window.__lcp), cls: Math.round(window.__cls*1000)/1000, longues_ms: Math.round(window.__lt), longues_n: window.__ltn})")
            m.update(perf); m["contenu_s"] = contenu
            m["requetes_site"] = STATS["cur"]["n"]; m["ko_site"] = round(STATS["cur"]["octets"] / 1024); m["ko_avant_contenu"] = round(avant["octets"] / 1024)
            m["requetes_ext"] = STATS["cur"]["ext"]; m["hotes_ext"] = STATS["cur"]["par"]
            res.setdefault(nom, {})[path] = m
            if SHOTS: pg.screenshot(path=f"{OUT}/{nom}{path.replace('/', '_').replace('?', '_').replace(',', '-') or '_'}.png", full_page=False)
        # États vides : favoris, portefeuille et comparateur sans rien (stockage local vidé)
        pg.evaluate("try{localStorage.clear()}catch(e){}")
        for path in ("/favoris", "/portefeuille", "/comparer"):
            pg.goto("http://t.local" + path); pg.wait_for_timeout(1500)
            res.setdefault(nom, {})["vide " + path] = pg.evaluate("document.querySelector('#app').innerText.replace(/\\s+/g,' ').slice(0, 400)")
        res[nom]["erreurs"] = errs[:10]
        ctx.close()
    b.close()
json.dump(res, open(f"{OUT}/mesures.json", "w"), ensure_ascii=False, indent=1)
for nom, pages in res.items():
    print("==", nom)
    for p, m in pages.items():
        if isinstance(m, dict):
            print(f"  {p}: contenu {m['contenu_s']} s, LCP {m['lcp']} ms, CLS {m['cls']}, tâches longues {m['longues_ms']} ms ({m['longues_n']}), {m['ko_avant_contenu']} ko avant contenu / {m['ko_site']} ko, ext {m['requetes_ext']}, "
                  f"{m['ecrans']} écrans, {m['mots']} mots, contraste faible {m['contraste_faible']}/{m['textes']}, <12px {m['part_moins_12px']} %, cibles <44 {m['sous44']}/{m['cibles']} (<24 : {m['sous24']}), sans nom {m['sans_nom']}, h1 {m['h1']}")
print("détail :", f"{OUT}/mesures.json")
