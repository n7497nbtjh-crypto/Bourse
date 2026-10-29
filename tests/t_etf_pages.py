# Pages ETF (liste et fiche) : captures à 390, 1280 et 1440 px, erreurs JavaScript, débordement, NaN/undefined.
# Usage : python3 tests/t_etf_pages.py [dossier_captures] [chemin1 chemin2 ...]
import os, sys, json
STATE = {}
exec(open("tests/audit.py").read().split("CHECK = ")[0])  # route() et sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/etf_shots"
os.makedirs(out, exist_ok=True)
paths = sys.argv[2:] or ["/etf", "/etf/amundi-msci-world-pea", "/etf/ishares-core-sp500", "/etf/amundi-cac40"]
bad = 0
with sync_playwright() as p:
    b = p.chromium.launch()
    for w in (390, 1280):
        ctx = b.new_context(viewport={"width": w, "height": 900}, device_scale_factor=1)
        ctx.route("**/*", route)
        for path in paths:
            pg = ctx.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" and "Failed to load resource" not in m.text else None)
            pg.goto("http://t.local" + path); pg.wait_for_timeout(1800)
            info = pg.evaluate("() => ({ sw: document.documentElement.scrollWidth, w: innerWidth, txt: document.querySelector('#app') ? document.querySelector('#app').innerText : '' })")
            pb = []
            if info["sw"] > info["w"] + 1: pb.append(f"débordement {info['sw']} > {info['w']}")
            for k in ("NaN", "undefined", "null %", "[object Object]"):
                if k in info["txt"]: pb.append("texte : " + k)
            if errs: pb.append("erreurs : " + " | ".join(errs[:3]))
            name = path.strip("/").replace("/", "_").replace("?", "_") or "accueil"
            pg.screenshot(path=f"{out}/{name}_{w}.png", full_page=True)
            print(("OK " if not pb else "PB ") + f"{w} {path} " + "; ".join(pb)); bad += bool(pb)
            pg.close()
        ctx.close()
    b.close()
print("problèmes :", bad); sys.exit(1 if bad else 0)
