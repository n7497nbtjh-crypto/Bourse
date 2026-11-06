# Couleur dominante de chaque logo (cf/site/logos/*.png) : sert d'identité visuelle à chaque entreprise dans le rapport de la semaine.
# Pixels presque blancs, presque noirs, gris et transparents ignorés ; couleur la plus fréquente après regroupement.
# python3 scripts/logo_couleurs.py → cf/site/data/logo-couleurs.json { "lvmh": "#8a6d3b", … } (seulement les logos colorés)
import json, os, colorsys
from PIL import Image
D = os.path.join(os.path.dirname(__file__), "..", "cf", "site", "logos")
out = {}
for f in sorted(os.listdir(D)):
    if not f.endswith(".png"): continue
    try: im = Image.open(os.path.join(D, f)).convert("RGBA"); im.thumbnail((64, 64))
    except Exception: continue
    seaux = {}
    for r, g, b, a in im.getdata():
        if a < 128: continue
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        if l > 0.9 or l < 0.12 or s < 0.28: continue
        k = (r // 24, g // 24, b // 24); seaux[k] = seaux.get(k, 0) + 1
    if not seaux: continue
    k, n = max(seaux.items(), key=lambda x: x[1])
    if n < 25: continue
    r, g, b = [min(255, c * 24 + 12) for c in k]
    out[f[:-4]] = "#%02x%02x%02x" % (r, g, b)
json.dump(out, open(os.path.join(D, "..", "data", "logo-couleurs.json"), "w"), separators=(",", ":"))
print(len(out), "logos colorés")
