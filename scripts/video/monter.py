# Vidéo ENKLAIR (7/11 soir) : monte les images filmées par filmer.js dans un ordinateur, au format vertical 1080 x 1920.
# Caméra virtuelle (zoom vers l'information), curseur, effet de clic, titres. Usage :
#   python3 scripts/video/monter.py <dossier des images> <montage.json> <sortie.mp4>
# montage.json : { "segments": [{ "nom": "fiche", "titres": [[t, "Face à la [médiane]|de ses rivales."]], "fondu": 0.25 }] }
import sys, os, json, re, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS = 1080, 1920, 30
F = "/tmp/vid/fonts/"
S0X, S0Y, SW, SH = 14, 743, 1052, 695           # zone de la page dans l'ordinateur, plan large
B = SW / 1280                                     # pixels de sortie par pixel CSS au plan large
YCLIP = 640                                       # au-dessus : le titre, jamais recouvert
JAUNE, ENCRE = (255, 225, 77), (17, 17, 17)
F_URL = ImageFont.truetype(F + "inter600.ttf", 21)

def ease(t): return 4 * t * t * t if t < .5 else 1 - pow(-2 * t + 2, 3) / 2

def T(px, py, c0, z):  # point du plan large → sortie, pour une caméra (coin du cadrage c0 en CSS, zoom z)
    return (S0X + (px - S0X - c0[0] * B) * z, S0Y + (py - S0Y - c0[1] * B) * z)

def ordinateur(im, c0, z):
    d = ImageDraw.Draw(im)
    r = lambda x0, y0, x1, y1: (*T(x0, y0, c0, z), *T(x1, y1, c0, z))
    sh = Image.new("L", (W, H), 0); ds = ImageDraw.Draw(sh); x0, y0, x1, y1 = r(60, 1467, 1020, 1527); ds.ellipse((x0, y0, x1, y1), fill=110)
    im.paste((150, 150, 155), (0, 0), sh.filter(ImageFilter.GaussianBlur(22 * z)))
    d.rounded_rectangle(r(4, 675, 1076, 1472), radius=30 * z, fill=(13, 13, 15))
    d.rounded_rectangle(r(0, 1452, 1080, 1482), radius=12 * z, fill=(214, 214, 218))
    d.rectangle(r(14, 687, 1066, 743), fill=(242, 242, 242))
    for i, c in enumerate([(255, 95, 87), (254, 188, 46), (40, 200, 64)]):
        d.ellipse(r(32 + i * 22, 708, 46 + i * 22, 722), fill=c)
    d.rounded_rectangle(r(310, 699, 770, 731), radius=9 * z, fill="white")
    f = ImageFont.truetype(F + "inter600.ttf", max(8, round(21 * z))); t = "enklair.com"; tw = d.textlength(t, font=f)
    cx, cy = T(540, 703, c0, z); d.text((cx - tw / 2, cy), t, font=f, fill=(70, 70, 70))

def lignes(txt):
    return [[(m.group(1) or m.group(2), bool(m.group(1))) for m in re.finditer(r"\[([^\]]+)\]|([^\[]+)", l)] for l in txt.split("|")]

def titre(img, txt, ta, sortie=None):
    d = ImageDraw.Draw(img); L = lignes(txt)
    for taille in range(92, 56, -4):
        Fo = ImageFont.truetype(F + "brico800.ttf", taille)
        if max(sum(d.textlength(s, font=Fo) for s, _ in segs) for segs in L) <= 980: break
    lh = round(Fo.size * 1.12); y0 = 430 - lh * len(L) / 2
    k = min(1, ta / 0.35); a = ease(k)
    if sortie is not None: a = min(a, 1 - ease(min(1, sortie / 0.3)))
    dy = (1 - ease(k)) * 24
    for i, segs in enumerate(L):
        wl = sum(d.textlength(s, font=Fo) for s, _ in segs); x = W / 2 - wl / 2; y = y0 + i * lh + dy
        for s, hl in segs:
            sw = d.textlength(s, font=Fo)
            if hl:
                kk = ease(max(0, min(1, (ta - 0.35) / 0.4))) * a
                if kk > 0: fz = Fo.size; d.polygon([(x - 6, y + fz * .6), (x - 6 + (sw + 12) * kk, y + fz * .57), (x - 6 + (sw + 12) * kk, y + fz * 1.02), (x - 6, y + fz * 1.05)], fill=JAUNE)
            x += sw
        x = W / 2 - wl / 2; col = tuple(round(255 - (255 - c) * a) for c in ENCRE)
        for s, hl in segs: d.text((x, y), s, font=Fo, fill=col); x += d.textlength(s, font=Fo)

CURSEUR = [(0, 0), (0, 30), (8, 23), (13, 35), (18, 33), (13, 21), (23, 21)]
def curseur(im, cx, cy, z, clic):
    d = ImageDraw.Draw(im, "RGBA"); s = 1.15 * z ** 0.5
    if clic is not None:
        rr = (10 + 34 * ease(clic)) * s; al = round(150 * (1 - clic)); d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), outline=(17, 17, 17, al), width=max(2, round(3 * s)))
        d.ellipse((cx - rr * .45, cy - rr * .45, cx + rr * .45, cy + rr * .45), fill=(255, 225, 77, round(al * .9)))
    pts = [(cx + x * s, cy + y * s) for x, y in CURSEUR]
    d.polygon([(x + 2, y + 3) for x, y in pts], fill=(0, 0, 0, 60)); d.polygon(pts, fill=(17, 17, 17, 255), outline=(255, 255, 255, 255)); d.line(pts + [pts[0]], fill=(255, 255, 255, 255), width=max(2, round(2 * s)))

def cadre(src, c, titres_seg, t):
    z, fx, fy = c["cam"]; vw, vh = 1280 / z, 846 / z
    c0 = (min(max(fx - vw / 2, 0), 1280 - vw), min(max(fy - vh / 2, 0), 846 - vh))
    im = Image.new("RGB", (W, H), "white"); ordinateur(im, c0, z)
    x0, y0 = T(S0X, S0Y, c0, z); x1, y1 = T(S0X + SW, S0Y + SH, c0, z)
    pg = src.resize((round(x1 - x0), round(y1 - y0)), Image.LANCZOS); im.paste(pg, (round(x0), round(y0)))
    if c.get("cur"): cx, cy = T(S0X + c["cur"][0] * B, S0Y + c["cur"][1] * B, c0, z); curseur(im, cx, cy, z, c.get("clic"))
    ImageDraw.Draw(im).rectangle((0, 0, W, YCLIP), fill="white")
    if z > 1.02:  # bord adouci sous le titre quand la page dépasse de l'écran
        g = Image.linear_gradient("L").resize((W, 60)).transpose(Image.FLIP_TOP_BOTTOM); im.paste(Image.new("RGB", (W, 60), "white"), (0, YCLIP), g)
    for i, (t0, txt) in enumerate(titres_seg):
        t1 = titres_seg[i + 1][0] if i + 1 < len(titres_seg) else 1e9
        if t0 <= t < t1 + 0.3: titre(im, txt, t - t0, (t - t1) if t >= t1 else None)
    return im

def monter(dossier, montage, sortie):
    M = json.load(open(montage)); tmp = sortie + ".tmp.mp4"
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", tmp], stdin=subprocess.PIPE)
    prec = None
    for seg in M["segments"]:
        P = json.load(open(os.path.join(dossier, seg["nom"], "plan.json")))["cadres"]; fondu = seg.get("fondu", 0)
        for i, c in enumerate(P):
            src = Image.open(os.path.join(dossier, seg["nom"], f"{i + 1:05d}.jpg")).convert("RGB")
            im = cadre(src, c, seg.get("titres", []), i / FPS)
            if prec is not None and fondu and i / FPS < fondu: im = Image.blend(prec, im, ease(i / FPS / fondu))
            ff.stdin.write(im.tobytes()); last = im
        prec = last
    ff.stdin.close()
    if ff.wait() == 0: os.replace(tmp, sortie)

if __name__ == "__main__": monter(*sys.argv[1:4])
