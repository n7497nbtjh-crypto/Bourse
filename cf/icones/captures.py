# Captures du site pour la fenêtre d'installation (manifeste « screenshots ») : vraies pages du site en ligne.
# Usage : FONT_DIR=dossier des polices python3 cf/icones/captures.py [https://repere-bourse.pages.dev]
import os, sys
from playwright.sync_api import sync_playwright
BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://repere-bourse.pages.dev").rstrip("/"); FONT = os.environ.get("FONT_DIR", "")
def route(r):
    u = r.request.url
    if "fonts.googleapis.com" in u:
        fams = [("Fraunces", "fraunces", w) for w in (600, 800, 900)] + [("IBM Plex Sans", "ibm-plex-sans", w) for w in (400, 500, 600, 700)] + [("IBM Plex Mono", "ibm-plex-mono", w) for w in (400, 500, 600)]
        return r.fulfill(body="".join(f"@font-face{{font-family:'{n}';font-weight:{w};src:url(https://fonts.gstatic.com/{k}-latin-{w}-normal.woff2) format('woff2')}}" for n, k, w in fams), content_type="text/css")
    if "fonts.gstatic.com" in u:
        f = os.path.join(FONT, u.rsplit("/", 1)[1]); return r.fulfill(path=f) if os.path.isfile(f) else r.fulfill(status=404, body="")
    return r.continue_()
SHOTS = [("/", "ecran-accueil.jpg", 412, 892, 2.0, True), ("/entreprise/lvmh", "ecran-fiche.jpg", 412, 892, 2.0, True), ("/entreprise/lvmh", "ecran-large.jpg", 1280, 800, 1.0, False)]
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for path, out, w, h, dpr, mob in SHOTS:
        c = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=dpr, is_mobile=mob, has_touch=mob); c.route("**/*", route)
        c.add_init_script("try{localStorage.setItem('bilan.pwa.non', String(Date.now()))}catch(e){}")
        p = c.new_page(); p.goto(BASE + path)
        p.wait_for_function("document.querySelector('#app').textContent.trim().length > 200", timeout=30000); p.wait_for_timeout(2500)
        p.add_style_tag(content="#orciab,.toast{display:none!important}")
        p.screenshot(path=f"cf/site/icons/{out}", type="jpeg", quality=82); c.close()
    b.close()
print("captures écrites")
