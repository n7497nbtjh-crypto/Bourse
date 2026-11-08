# Vidéo ENKLAIR (7/11 nuit) : monte la vidéo dans le style de la vidéo d'origine.
# Début de l'original gardé tel quel (même rythme), puis de vrais blocs du site filmés par elements.js,
# posés sur fond blanc, avec des titres comme l'original ; fin de l'original (logo ENKLAIR).
# Usage : python3 scripts/video/composer.py montage.json dossier_captures orig.mp4 sortie.mp4
import json, sys, os, math, subprocess
from PIL import Image, ImageDraw, ImageFont

M = json.load(open(sys.argv[1])); CAP = sys.argv[2]; ORIG = sys.argv[3]; OUT = sys.argv[4]
W, H, FPS = 1080, 1920, 60
FONT = "/tmp/vid/fonts/brico800.ttf"; JAUNE = (255, 225, 77); NOIR = (17, 17, 17)

def e3(x): x = min(1, max(0, x)); return 1 - (1 - x) ** 3
def eio(x): x = min(1, max(0, x)); return x * x * (3 - 2 * x)

_cache = {}
def img(bloc, i):
    k = (bloc, i)
    if k not in _cache:
        if len(_cache) > 400: _cache.clear()
        _cache[k] = Image.open(f"{CAP}/{bloc}/f{i:03d}.jpg").convert("RGB")
    return _cache[k]

def titre(lignes, t, dur, premium):
    """Titre noir sur blanc, dernière ligne surlignée en jaune (balayage), comme l'original."""
    c = Image.new("RGB", (W, H), "white")
    S = 138; f = ImageFont.truetype(FONT, S)
    while max(f.getlength(l) for l in lignes) > 840: S -= 4; f = ImageFont.truetype(FONT, S)
    lh = 1.165 * S; n = len(lignes); hb = (n - 1) * lh + 0.72 * S
    top = 882 - hb / 2 - (0.16 * S) - (90 if premium else 0)
    a = eio(t / 0.18) * (1 - eio((t - dur + 0.2) / 0.2))
    d = ImageDraw.Draw(c)
    for i, l in enumerate(lignes):
        wl = f.getlength(l); x = (W - wl) / 2; y = top + i * lh; base = y + 0.94 * S
        if i == n - 1:
            p = e3((t - 0.1) / 0.3)
            if p > 0:
                x0, x1 = x - 0.14 * S, x + wl + 0.09 * S
                lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); dl = ImageDraw.Draw(lay)
                dl.rounded_rectangle((x0, base - 0.34 * S, x0 + (x1 - x0) * p, base + 0.094 * S), radius=10, fill=JAUNE + (255,))
                c.paste(lay, (0, 0), lay)
        d.text((x, y), l, font=f, fill=NOIR)
    if premium:
        fp = ImageFont.truetype(FONT, 50); tw = fp.getlength("Premium")
        pill = Image.new("RGBA", (int(tw + 80), 96), (0, 0, 0, 0)); dp = ImageDraw.Draw(pill)
        dp.rounded_rectangle((0, 0, pill.width - 1, 95), radius=48, fill=NOIR); dp.text((40, 16), "Premium", font=fp, fill=JAUNE)
        q = e3((t - 0.15) / 0.3); pill = pill.rotate(4 - 2 * (1 - q), resample=Image.BICUBIC, expand=True)
        pa = pill.split()[3].point(lambda v: int(v * q)); pill.putalpha(pa)
        yb = top + (n - 1) * lh + 1.25 * S + 60
        c.paste(pill, (int((W - pill.width) / 2), int(yb + 20 * (1 - q))), pill)
    return Image.blend(Image.new("RGB", (W, H), "white"), c, a)

def plan(sc):
    """Pose les blocs les uns sous les autres, à leur place horizontale réelle, groupe centré."""
    blocs = []
    for b in sc["blocs"]:
        m = json.load(open(f"{CAP}/{b['id']}/meta.json")); blocs.append((b, m))
    x0 = min(m["x"] for _, m in blocs); x1 = max(m["x"] + m["w"] for _, m in blocs)
    tot = sum(m["h"] for b, m in blocs if not b.get("superpose")) + sum(b.get("gap", 40) for b, _ in blocs[1:] if not b.get("superpose"))
    hmax = max([m["h"] for b, m in blocs if b.get("superpose")] + [0]); tot += max(0, hmax - blocs[-2][1]["h"]) if hmax else 0
    s = min(1.0, 860 / (x1 - x0), 1560 / tot)
    y = max(240, (H - tot * s) / 2 - 40); pos = []
    for k, (b, m) in enumerate(blocs):
        if b.get("superpose"):  # même place que le bloc précédent (il le remplace à l'écran)
            px, py, _ = pos[-1]; pos.append((W / 2 - (x1 - x0) * s / 2 + (m["x"] - x0) * s, py, s)); continue
        if k: y += b.get("gap", 40) * s
        pos.append((W / 2 - (x1 - x0) * s / 2 + (m["x"] - x0) * s, y, s)); y += m["h"] * s
    return blocs, pos

def cadre_plan(sc, lay, t):
    blocs, pos = lay; dur = sc["dur"]; fond = tuple(sc.get("fond", (255, 255, 255))); c = Image.new("RGB", (W, H), fond)
    sortie = 1 - eio((t - dur + 0.22) / 0.22)
    for (b, m), (x, y, s) in zip(blocs, pos):
        tb = t - b.get("at", 0)
        if tb < 0: continue
        a = e3(tb / 0.3) * sortie * (1 - eio((t - b["fin"]) / 0.25) if "fin" in b else 1)
        if a <= 0: continue
        i = min(m["n"] - 1, int(round(tb * FPS)))
        im = img(b["id"], i)
        if s != 1: im = im.resize((round(m["w"] * s), round(m["h"] * s)), Image.LANCZOS)
        if b.get("fondu_bas"):  # liste coupée : elle s'efface vers le bas au lieu d'un bord net
            fb = round(b["fondu_bas"] * s); bl = Image.new("RGB", (im.width, fb), "white"); mk = Image.linear_gradient("L").resize((im.width, fb))
            im = im.copy(); im.paste(Image.composite(bl, im.crop((0, im.height - fb, im.width, im.height)), mk), (0, im.height - fb))
        dy = 26 * (1 - e3(tb / 0.4))
        zone = c.crop((round(x), round(y + dy), round(x) + im.width, round(y + dy) + im.height))
        c.paste(Image.blend(zone, im, a), (round(x), round(y + dy)))
    if sc.get("fond"):  # fond coloré : il passe au blanc à la sortie (enchaînement comme l'original)
        c = Image.blend(c, Image.new("RGB", (W, H), "white"), 1 - sortie)
    return c

def nom(texte, t, dur):
    """Un nom d'entreprise noir sur blanc, coupe franche (début de la vidéo d'origine)."""
    c = Image.new("RGB", (W, H), "white"); S = 209; f = ImageFont.truetype(FONT, S)
    while f.getlength(texte) > 780: S -= 6; f = ImageFont.truetype(FONT, S)
    ImageDraw.Draw(c).text(((W - f.getlength(texte)) / 2, 1039 - 0.94 * S), texte, font=f, fill=NOIR)
    return c

def rendre(scenes, sortie, seuls=None, T0=0):
    ff = None if seuls else subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", sortie + ".tmp.mp4"], stdin=subprocess.PIPE)
    for sc in scenes:
        lay = plan(sc) if sc["type"] == "plan" else None
        for k in range(round(sc["dur"] * FPS)):
            t = k / FPS; tg = T0 + t
            if seuls is not None and not any(abs(tg - float(v)) < 0.5 / FPS for v in seuls): continue
            fr = titre(sc["lignes"], t, sc["dur"], sc.get("premium")) if sc["type"] == "titre" else nom(sc["texte"], t, sc["dur"]) if sc["type"] == "nom" else cadre_plan(sc, lay, t)
            if seuls is not None: fr.save(f"/tmp/v5/img_{tg:.2f}.jpg", quality=88); continue
            ff.stdin.write(fr.tobytes())
        T0 += sc["dur"]
    if ff: ff.stdin.close(); ff.wait(); os.rename(sortie + ".tmp.mp4", sortie)
    return T0

def main():
    # Montage par parties : {"orig": [début, fin]} (extrait de la vidéo d'origine) ou {"scenes": [...]} (rendu ici)
    parties = M.get("parties") or [{"orig": [0, M["debut"]]}, {"scenes": M["scenes"]}, {"orig": [M["fin_depuis"], None]}]
    seuls = os.environ.get("IMAGES"); seuls = seuls.split(",") if seuls else None
    entrees, fc, T = [], "", 0
    for i, p in enumerate(parties):
        if "orig" in p:
            a, b = p["orig"]; fc += f"[0:v]trim=start={a}" + (f":end={b}" if b else "") + f",setpts=PTS-STARTPTS,fps=60,scale=886:1576,pad=1080:1920:97:172:white,setsar=1[p{i}];"  # 8/11 : marges pour TikTok (écrans plus hauts que 9:16, côtés coupés)
            T += (b or 24.9) - a
        else:
            fichier = f"/tmp/v5/partie{i}.mp4"; T = rendre(p["scenes"], fichier, seuls, T)
            entrees.append(fichier); fc += f"[{len(entrees)}:v]setpts=PTS-STARTPTS[p{i}];"
    if seuls: print("images", seuls); return
    fc += "".join(f"[p{i}]" for i in range(len(parties))) + f"concat=n={len(parties)}:v=1:a=0,format=yuv420p[v]"
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", ORIG] + sum([["-i", e] for e in entrees], []) + ["-filter_complex", fc, "-map", "[v]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-r", "60", "-movflags", "+faststart", OUT + ".tmp.mp4"]
    subprocess.run(cmd, check=True); os.rename(OUT + ".tmp.mp4", OUT); print("ok", OUT)

main()
