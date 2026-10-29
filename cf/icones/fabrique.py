# Rastérise les icônes (SVG de cf/icones/, faits par fabrique.mjs) et dessine l'image de partage, avec Playwright.
# Usage : FONT_DIR=dossier des polices woff2 (fraunces-latin-800-normal.woff2, ibm-plex-*) python3 cf/icones/fabrique.py
import os, pathlib
from playwright.sync_api import sync_playwright
ICI = pathlib.Path("cf/icones"); OUT = pathlib.Path("cf/site/icons"); OUT.mkdir(parents=True, exist_ok=True)
FONT = os.environ.get("FONT_DIR", "")
PNG = [("icone.svg", "icon-192.png", 192), ("icone.svg", "icon-512.png", 512), ("maskable.svg", "icon-maskable-192.png", 192), ("maskable.svg", "icon-maskable-512.png", 512),
       ("apple.svg", "apple-touch-icon.png", 180), ("favicon.svg", "favicon-32.png", 32), ("favicon.svg", "favicon-48.png", 48), ("badge.svg", "badge-96.png", 96)]
ff = lambda fam, f, w: f"@font-face{{font-family:'{fam}';font-weight:{w};src:url(file://{FONT}/{f}) format('woff2')}}"
PARTAGE = f"""<!doctype html><html><head><meta charset="utf-8"><style>
{ff('Fraunces', 'fraunces-latin-800-normal.woff2', 800)}{ff('Plex', 'ibm-plex-sans-latin-400-normal.woff2', 400)}{ff('Plex', 'ibm-plex-sans-latin-600-normal.woff2', 600)}{ff('Mono', 'ibm-plex-mono-latin-500-normal.woff2', 500)}
*{{box-sizing:border-box;margin:0}} body{{width:1200px;height:630px;background:#F8F5EE;color:#111214;font-family:Plex,sans-serif;position:relative;overflow:hidden}}
.m{{position:absolute;left:72px;top:64px;height:92px}} .k{{position:absolute;left:76px;top:184px;font:500 17px Mono,monospace;letter-spacing:.12em;text-transform:uppercase;color:#87827A}}
h1{{position:absolute;left:72px;top:222px;width:660px;font:800 54px/1.06 Fraunces,serif;letter-spacing:-.02em}}
p{{position:absolute;left:76px;top:470px;width:640px;font:400 22px/1.45 Plex,sans-serif;color:#55524C}}
.c{{position:absolute;right:64px;top:118px;width:380px;background:#fff;border:1px solid #E6E0D4;border-radius:22px;padding:28px 28px 26px;box-shadow:0 10px 40px -18px rgba(17,18,20,.25)}}
.c b{{display:block;font:800 25px Fraunces,serif;margin:0 0 4px}} .c small{{display:block;font:500 13px Mono,monospace;letter-spacing:.08em;text-transform:uppercase;color:#87827A;margin:0 0 22px}}
.r{{margin:0 0 20px}} .r i{{display:block;font:600 16px Plex,sans-serif;font-style:normal;margin:0 0 9px}}
.z{{position:relative;height:14px;border-radius:99px;display:flex;overflow:visible}} .z span{{height:14px}}
.z .a{{width:32%;background:#D94F2B;opacity:.35;border-radius:99px 0 0 99px}} .z .b{{width:36%;background:#B9B2A5;opacity:.45}} .z .d{{width:32%;background:#0E6B4A;opacity:.35;border-radius:0 99px 99px 0}}
.z em{{position:absolute;top:-6px;width:3px;height:26px;background:#111214;border-radius:2px}} .z u{{position:absolute;top:-4px;width:22px;height:22px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 1px #111214}}
.l{{display:flex;justify-content:space-between;font:400 12.5px Plex,sans-serif;color:#87827A;margin-top:8px}}
.bar{{position:absolute;left:0;right:0;bottom:0;height:14px;background:#111214}} .bar s{{position:absolute;left:72px;bottom:0;width:180px;height:14px;background:#C6F432}}
</style></head><body>
<img class="m" src="file://{ICI.resolve()}/marque-encre.svg">
<div class="k">La Bourse, comptes à l'appui</div>
<h1>Les comptes officiels des entreprises cotées, expliqués simplement.</h1>
<p>Chaque chiffre comparé à la médiane du secteur. PEA, ETF, agenda, et une IA qui calcule à partir des sources. Information, pas conseil.</p>
<div class="c"><b>Chaque chiffre, sa zone</b><small>Comparé aux entreprises du secteur</small>
 <div class="r"><i>Marge</i><div class="z"><span class="a"></span><span class="b"></span><span class="d"></span><em style="left:49%"></em><u style="left:74%;background:#0E6B4A"></u></div><div class="l"><span>sous le secteur</span><span>médiane</span><span>au-dessus</span></div></div>
 <div class="r"><i>Croissance des ventes</i><div class="z"><span class="a"></span><span class="b"></span><span class="d"></span><em style="left:49%"></em><u style="left:44%;background:#111214"></u></div></div>
 <div class="r" style="margin:0"><i>Dette</i><div class="z"><span class="d" style="border-radius:99px 0 0 99px"></span><span class="b"></span><span class="a" style="border-radius:0 99px 99px 0"></span><em style="left:49%"></em><u style="left:20%;background:#0E6B4A"></u></div></div>
</div>
<div class="bar"><s></s></div>
</body></html>"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    for src, dst, n in PNG:
        pg.set_viewport_size({"width": n, "height": n})
        s = (ICI / src).read_text(encoding="utf-8").replace("<svg ", f'<svg style="display:block;width:{n}px;height:{n}px" ', 1)
        pg.set_content(f'<html><body style="margin:0;background:transparent">{s}</body></html>')
        pg.wait_for_timeout(100); pg.screenshot(path=str(OUT / dst), omit_background=True, clip={"x": 0, "y": 0, "width": n, "height": n})
    pg.set_viewport_size({"width": 1200, "height": 630}); (ICI / "partage.html").write_text(PARTAGE, encoding="utf-8")
    pg.goto(f"file://{(ICI / 'partage.html').resolve()}"); pg.wait_for_timeout(400)
    pg.screenshot(path=str(OUT / "partage.png"), clip={"x": 0, "y": 0, "width": 1200, "height": 630})
    (ICI / "partage.html").unlink()
    b.close()
print("PNG écrits")
