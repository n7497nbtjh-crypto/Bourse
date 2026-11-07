# Vidéo ENKLAIR (7/11 soir, v2) : monte les images filmées par filmer.js dans un ordinateur, au format vertical 1080 x 1920.
# Romain : l'ordinateur reste entier dans l'image ; zooms rares et lents, qui suivent le curseur ; transitions douces.
#   python3 scripts/video/monter.py <dossier des images> <montage.json> <sortie.mp4>
# montage.json : { "titres": [[t en secondes depuis le début, "Face à la [médiane]|de ses rivales."]], "segments": [{ "nom": "fiche" }] }
import sys, os, json, re, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS = 1080, 1920, 30
F = "/tmp/vid/fonts/"
JAUNE, ENCRE = (255, 225, 77), (17, 17, 17)
# Ordinateur dessiné en coordonnées « plan » (largeur 1072), puis réduit et placé à chaque image.
LX0, LX1 = 4, 1076                  # bords de l'écran (cadre noir)
SX0, SY0, SX1, SY1 = 14, 687, 1066, 1438   # intérieur de l'écran ; la page commence sous la barre (743)
CY0 = 743
K0 = 0.76                           # échelle au plan large : ordinateur de 815 px de large
ZMAX = 1.0 / K0 * 0.985             # au plus près, l'ordinateur touche presque les bords de l'image
CX, CY = 540, 1065                  # centre de l'ordinateur dans le plan
ZONE = (6, 590, W - 6, H - 40)      # l'ordinateur ne sort jamais de cette zone (le titre est au-dessus)

def ease(t): return 4 * t * t * t if t < .5 else 1 - pow(-2 * t + 2, 3) / 2

def lignes(txt):
    return [[(m.group(1) or m.group(2), bool(m.group(1))) for m in re.finditer(r"\[([^\]]+)\]|([^\[]+)", l)] for l in txt.split("|")]

def titre(img, txt, ta, sortie=None):
    d = ImageDraw.Draw(img); L = lignes(txt)
    for taille in range(92, 56, -4):
        Fo = ImageFont.truetype(F + "brico800.ttf", taille)
        if max(sum(d.textlength(s, font=Fo) for s, _ in segs) for segs in L) <= 980: break
    lh = round(Fo.size * 1.12); y0 = 515 - lh * len(L) / 2
    a = ease(min(1, ta / 0.4))
    if sortie is not None: a = min(a, 1 - ease(min(1, sortie / 0.35)))
    dy = (1 - a) * 22
    for i, segs in enumerate(L):
        wl = sum(d.textlength(s, font=Fo) for s, _ in segs); x = W / 2 - wl / 2; y = y0 + i * lh + dy
        for s, hl in segs:
            sw = d.textlength(s, font=Fo)
            if hl:
                kk = ease(max(0, min(1, (ta - 0.4) / 0.45))) * a
                if kk > 0: fz = Fo.size; d.polygon([(x - 6, y + fz * .6), (x - 6 + (sw + 12) * kk, y + fz * .57), (x - 6 + (sw + 12) * kk, y + fz * 1.02), (x - 6, y + fz * 1.05)], fill=JAUNE)
            x += sw
        x = W / 2 - wl / 2; col = tuple(round(255 - (255 - c) * a) for c in ENCRE)
        for s, hl in segs: d.text((x, y), s, font=Fo, fill=col); x += d.textlength(s, font=Fo)

CURSEUR = [(0, 0), (0, 30), (8, 23), (13, 35), (18, 33), (13, 21), (23, 21)]
def curseur(im, cx, cy, s, clic):
    d = ImageDraw.Draw(im, "RGBA")
    if clic is not None:
        rr = (10 + 30 * ease(clic)) * s; al = round(150 * (1 - clic)); d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), outline=(17, 17, 17, al), width=max(2, round(3 * s)))
        d.ellipse((cx - rr * .45, cy - rr * .45, cx + rr * .45, cy + rr * .45), fill=(255, 225, 77, round(al * .9)))
    pts = [(cx + x * s, cy + y * s) for x, y in CURSEUR]
    d.polygon([(x + 2, y + 3) for x, y in pts], fill=(0, 0, 0, 60)); d.polygon(pts, fill=(17, 17, 17, 255), outline=(255, 255, 255, 255)); d.line(pts + [pts[0]], fill=(255, 255, 255, 255), width=max(2, round(2 * s)))

def placement(z, foc):
    """Échelle k et centre O de l'ordinateur : il grandit sur place (centre fixe), et ne glisse de côté que s'il reste de la place,
    vers le point visé ; il reste toujours entier dans l'image."""
    k = K0 * z
    w2 = (LX1 - LX0) / 2 * k; marge = max(0, (W - 12) / 2 - w2)
    ox = W / 2 - max(-marge, min(marge, (foc[0] - CX) * k * 0.5))
    return k, (ox, 1120)

def cadre(src, c, vp, titres_seg, t, fond):
    z, fx, fy = c["cam"]; sc = (SX1 - SX0) / vp[0]
    foc = (SX0 + fx * sc, CY0 + fy * sc)                              # point visé, en coordonnées du plan
    k, O = placement(z, foc)
    P = lambda x, y: (O[0] + (x - CX) * k, O[1] + (y - CY) * k)
    R = lambda x0, y0, x1, y1: (*P(x0, y0), *P(x1, y1))
    im = fond.copy(); d = ImageDraw.Draw(im)
    sh = Image.new("L", (W, H), 0); ImageDraw.Draw(sh).ellipse(R(60, 1470, 1020, 1530), fill=100)
    im.paste((150, 150, 155), (0, 0), sh.filter(ImageFilter.GaussianBlur(20 * k)))
    d.rounded_rectangle(R(LX0, 675, LX1, 1472), radius=30 * k, fill=(13, 13, 15))
    d.rounded_rectangle(R(0, 1452, 1080, 1482), radius=12 * k, fill=(214, 214, 218))
    d.rounded_rectangle(R(470, 1452, 610, 1462), radius=6 * k, fill=(176, 176, 181))
    d.rectangle(R(SX0, SY0, SX1, CY0), fill=(242, 242, 242))
    for i, col in enumerate([(255, 95, 87), (254, 188, 46), (40, 200, 64)]): d.ellipse(R(32 + i * 22, 708, 46 + i * 22, 722), fill=col)
    d.rounded_rectangle(R(310, 699, 770, 731), radius=9 * k, fill="white")
    f = ImageFont.truetype(F + "inter600.ttf", max(8, round(21 * k))); tx = "enklair.com"; tw = d.textlength(tx, font=f); px, py = P(540, 704); d.text((px - tw / 2, py), tx, font=f, fill=(70, 70, 70))
    x0, y0 = P(SX0, CY0); x1, y1 = P(SX1, SY1)
    im.paste(src.resize((round(x1 - x0), round(y1 - y0)), Image.LANCZOS), (round(x0), round(y0)))
    if c.get("cur"):
        cx, cy = P(SX0 + c["cur"][0] * sc, CY0 + c["cur"][1] * sc)
        if x0 - 5 <= cx <= x1 and y0 - 5 <= cy <= y1: curseur(im, cx, cy, 1.0 + 0.25 * (z - 1), c.get("clic"))
    for i, (t0, txt) in enumerate(titres_seg):
        t1 = titres_seg[i + 1][0] if i + 1 < len(titres_seg) else 1e9
        if t0 <= t < t1 + 0.35: titre(im, txt, t - t0, (t - t1) if t >= t1 else None)
    return im

def monter(dossier, montage, sortie):
    M = json.load(open(montage)); tmp = sortie + ".tmp.mp4"; fond = Image.new("RGB", (W, H), "white")
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", tmp], stdin=subprocess.PIPE)
    n = 0
    for seg in M["segments"]:
        J = json.load(open(os.path.join(dossier, seg["nom"], "plan.json"))); vp = J.get("viewport", [1280, 846])
        for i, c in enumerate(J["cadres"]):
            src = Image.open(os.path.join(dossier, seg["nom"], f"{i + 1:05d}.jpg")).convert("RGB")
            ff.stdin.write(cadre(src, c, vp, M.get("titres", []), n / FPS, fond).tobytes()); n += 1
    ff.stdin.close()
    if ff.wait() == 0: os.replace(tmp, sortie)

if __name__ == "__main__": monter(*sys.argv[1:4])
