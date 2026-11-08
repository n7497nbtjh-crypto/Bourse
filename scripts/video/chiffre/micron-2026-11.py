# Vidéo TikTok « Micron −17 % en une journée » (8/11). Chiffres vérifiés :
# clôtures Nasdaq (stockanalysis.com) 30/10 884,74 · 2/11 833,59 · 3/11 855,10 · 4/11 795,23 · 5/11 656,39 (−17,46 %) · 6/11 690,00 ; 6/11/2025 238,33 $.
# Poids de Micron dans l'ETF Monde : 1,18 % (composition du 31/08 sur le site) ; 1 300 entreprises.
import subprocess, os, math, sys
from PIL import Image, ImageDraw, ImageFont
W, H, FPS = 1080, 1920, 30
BR = "/tmp/vid/fonts/brico800.ttf"; IB = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"; IXB = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"; IM = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"
J = (255, 225, 77); N = (17, 17, 17); R = (214, 36, 60); V = (10, 138, 58); G = (85, 82, 76); B = (255, 255, 255)
F = {}
def f(p, s):
    k = (p, s)
    if k not in F: F[k] = ImageFont.truetype(p, s)
    return F[k]
e3 = lambda x: 1 - (1 - max(0, min(1, x))) ** 3
eb = lambda x: (lambda t: 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2)(max(0, min(1, x)))  # léger rebond
def ctext(d, y, txt, font, fill=N, cx=W / 2):
    w = d.textlength(txt, font=font); d.text((cx - w / 2, y), txt, font=font, fill=fill); return w
def fit(txt, p, s, maxw):
    while ImageFont.truetype(p, s).getlength(txt) > maxw: s -= 4
    return f(p, s)
def pill(d, x, y, txt, font, fond=J, enc=N, pad=(22, 10), rot=False, cx=False):
    w = d.textlength(txt, font=font); bb = font.getbbox(txt); h = bb[3] - bb[1]
    if cx: x = x - (w + 2 * pad[0]) / 2
    d.rounded_rectangle((x, y, x + w + 2 * pad[0], y + h + 2 * pad[1] + 8), radius=14, fill=fond, outline=enc, width=4)
    d.text((x + pad[0], y + pad[1] - bb[1] + 4), txt, font=font, fill=N if fond != N else J)
    return x + w + 2 * pad[0]
def carte(d, box, fond=B, ombre=True, r=34):
    x0, y0, x1, y1 = box
    if ombre: d.rounded_rectangle((x0 + 10, y0 + 10, x1 + 10, y1 + 10), radius=r, fill=N)
    d.rounded_rectangle(box, radius=r, fill=fond, outline=N, width=5)
def surligne(d, x, y, txt, font, fill=N, p=1.0):
    w = d.textlength(txt, font=font); bb = font.getbbox(txt)
    d.rectangle((x - 6, y + bb[3] * 0.55, x - 6 + (w + 12) * p, y + bb[3] * 0.98), fill=J)
    d.text((x, y), txt, font=font, fill=fill); return w

# ---------- scènes ----------
def s1(t, dur):  # l'accroche : visible dès la première image
    c = Image.new("RGB", (W, H), J); d = ImageDraw.Draw(c)
    pill(d, W / 2, 330, "MICRON · JEUDI 5 NOVEMBRE", f(IXB, 38), fond=N, cx=True)
    s = 1 + 0.06 * (1 - e3(t / 0.35)); txt = "−17 %"
    b0 = fit(txt, BR, 360, 840); big = f(BR, int(b0.size * s)); w = d.textlength(txt, font=big)
    d.text(((W - w) / 2, 640 - (big.size - b0.size) * 0.5), txt, font=big, fill=R)
    ctext(d, 1060, "en UNE journée.", fit("en UNE journée.", BR, 112, 800))
    if t > 0.9:
        a = e3((t - 0.9) / 0.4); ft = f(IM, 40); ctext(d, 1250 + 20 * (1 - a), "Et vous en avez peut-être sans le savoir.", ft)
    return c

PX = [("30/10", 884.74), ("2/11", 833.59), ("3/11", 855.10), ("4/11", 795.23), ("5/11", 656.39), ("6/11", 690.00)]
def s2(t, dur):
    c = Image.new("RGB", (W, H), B); d = ImageDraw.Draw(c)
    d.text((110, 270), "Micron", font=f(BR, 120), fill=N)
    d.text((114, 410), "le géant américain de la mémoire", font=f(IM, 42), fill=G)
    d.text((114, 462), "pour l'intelligence artificielle", font=f(IM, 42), fill=G)
    # graphique : cours de clôture, en dollars
    x0, x1, y0, y1 = 170, 900, 640, 1180; lo, hi = 600, 920
    X = lambda i: x0 + i * (x1 - x0) / (len(PX) - 1); Y = lambda v: y1 - (v - lo) / (hi - lo) * (y1 - y0)
    carte(d, (115, 580, 955, 1290), ombre=True)
    for v in (700, 800, 900):
        d.line((x0, Y(v), x1, Y(v)), fill=(236, 236, 236), width=3); d.text((x1 - 60, Y(v) - 44), f"{v} $", font=f(IB, 28), fill=(160, 160, 160))
    p = e3(t / 1.8) * (len(PX) - 1)
    for i in range(len(PX) - 1):
        if p <= i: break
        q = min(1, p - i); xa, ya, xb, yb = X(i), Y(PX[i][1]), X(i + 1), Y(PX[i + 1][1])
        d.line((xa, ya, xa + (xb - xa) * q, ya + (yb - ya) * q), fill=R if i == 3 else N, width=12 if i == 3 else 8)
    for i, (lab, v) in enumerate(PX):
        if p >= i - 0.01:
            r = 15 if i == 4 else 10; d.ellipse((X(i) - r, Y(v) - r, X(i) + r, Y(v) + r), fill=R if i == 4 else N)
        d.text((X(i) - d.textlength(lab, font=f(IB, 30)) / 2, 1205), lab, font=f(IB, 30), fill=G)
    if p > 3.95:  # la journée du 5 novembre
        a = e3((p - 3.95) / 0.6) if p < 4.55 else 1
        pill(d, X(4) - 230, Y(656.39) + 30, "−17,5 % en un jour", f(IXB, 36), fond=(255, 208, 218))
    if t > 3.6:
        a = eb((t - 3.6) / 0.45); fs = int(110 * (0.6 + 0.4 * a))
        ctext(d, 1370, "−22 %", f(BR, fs), fill=R)
        ctext(d, 1510, "sur la semaine", f(BR, 60))
    d.text((110, 1610), "Cours de clôture au Nasdaq, du 30 octobre au 6 novembre 2026.", font=f(IM, 26), fill=(140, 140, 140))
    return c

PILLS = ["Apple", "Nvidia", "Microsoft", "Amazon", "Alphabet", "Meta", "Broadcom", "Tesla", "JPMorgan", "Micron"]
def s3(t, dur):
    c = Image.new("RGB", (W, H), B); d = ImageDraw.Draw(c)
    ctext(d, 300, "Vous pensez", f(BR, 96)); ctext(d, 410, "ne pas en avoir ?", f(BR, 96))
    if t > 1.7:
        a = e3((t - 1.7) / 0.4); y = 620 + 60 * (1 - a)
        carte(d, (110, y, 970, y + 820))
        d.text((160, y + 50), "Un ETF Monde", font=f(BR, 74), fill=N)
        d.text((164, y + 150), "environ 1 300 entreprises dedans", font=f(IM, 38), fill=G)
        xx, yy = 160, y + 240; ft = f(IXB, 40)
        for k, nm in enumerate(PILLS):
            if t < 1.9 + k * 0.12: break
            w = d.textlength(nm, font=ft) + 44
            if xx + w > 930: xx, yy = 160, yy + 96
            mic = nm == "Micron"
            pill(d, xx, yy, nm, ft, fond=J if mic else (244, 244, 244), enc=N)
            xx += w + 18
        if t > 1.9 + len(PILLS) * 0.12 + 0.2:
            pill(d, 160, y + 640, "Micron : environ 1 % du fonds", f(IXB, 44), fond=N)
    return c

def s4(t, dur):
    c = Image.new("RGB", (W, H), B); d = ImageDraw.Draw(c)
    ctext(d, 340, "Pour 1 000 €", f(BR, 104)); ctext(d, 470, "dans un ETF Monde", f(BR, 72))
    if t > 1.2:
        a = eb((t - 1.2) / 0.45); b0 = fit("−2,60 €", BR, 250, 840); fs = int(b0.size * (0.55 + 0.45 * a))
        ctext(d, 760 - (fs - b0.size) * 0.5, "−2,60 €", f(BR, fs), fill=R)
        ctext(d, 1080, "rien qu'avec Micron,", f(BR, 64)); ctext(d, 1165, "cette semaine.", f(BR, 64))
        d.text((110, 1600), "Calcul : 1 000 € × 1,18 % (poids de Micron) × −22 %.", font=f(IM, 28), fill=(140, 140, 140))
    return c

def s5(t, dur):
    c = Image.new("RGB", (W, H), B); d = ImageDraw.Draw(c)
    ctext(d, 290, "Et pourtant…", f(BR, 100))
    base = 1380; mx = 760
    for k, (lab, v, x) in enumerate([("6 nov. 2025", 238.33, 230), ("6 nov. 2026", 690.0, 610)]):
        st = 0.9 + k * 1.9
        if t < st: continue
        a = e3((t - st) / 0.7); h = v / 700 * mx * a
        d.rounded_rectangle((x, base - h, x + 240, base), radius=18, fill=J if k else (230, 230, 230), outline=N, width=5)
        ctext(d, base - h - 120, f"{round(v)} $", f(BR, 84), cx=x + 120)
        ctext(d, base + 30, lab, f(IB, 36), fill=G, cx=x + 120)
    if t > 3.6: pill(d, W / 2, 1520, "× 2,9 en un an", f(IXB, 54), fond=N, cx=True)
    return c

def s6(t, dur):
    c = Image.new("RGB", (W, H), B); d = ImageDraw.Draw(c)
    a = eb(t / 0.4); ft = f(BR, int(150 * (0.7 + 0.3 * a))); w = d.textlength("ENKLAIR", font=ft)
    d.rounded_rectangle(((W - w) / 2 - 40, 560, (W + w) / 2 + 40, 560 + ft.size * 1.25), radius=30, fill=N)
    d.text(((W - w) / 2, 560 + ft.size * 0.05), "ENKLAIR", font=ft, fill=J)
    ctext(d, 870, "Ce que contient", f(BR, 84)); ctext(d, 970, "vraiment votre ETF.", f(BR, 84))
    pill(d, W / 2, 1150, "enklair.com", f(IXB, 58), fond=J, cx=True)
    d.text((110, 1600), "Information, pas un conseil en investissement.", font=f(IM, 28), fill=(140, 140, 140))
    return c

SC = [s1, s2, s3, s4, s5, s6]
def dur_voix(i): return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"/tmp/mu/v{i}.wav"], capture_output=True, text=True).stdout)
D = [dur_voix(i) + (0.35 if i < 6 else 0.9) for i in range(1, 7)]
seul = os.environ.get("IMAGE")
if seul:  # images de contrôle : IMAGE=2:4.0,3:5.5
    for x in seul.split(","):
        k, t = x.split(":"); SC[int(k) - 1](float(t), D[int(k) - 1]).save(f"/tmp/mu/img_{k}_{t}.png")
    sys.exit()
for k, sc in enumerate(SC):
    out = f"/tmp/mu/s{k + 1}.mp4"
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", out + ".tmp.mp4"], stdin=subprocess.PIPE)
    for n in range(int(round(D[k] * FPS))): ff.stdin.write(sc(n / FPS, D[k]).tobytes())
    ff.stdin.close(); ff.wait(); os.rename(out + ".tmp.mp4", out)
# son : chaque phrase au début de sa scène
starts = [sum(D[:k]) for k in range(6)]
inp = sum([["-i", f"/tmp/mu/v{k + 1}.wav"] for k in range(6)], [])
fc = "".join(f"[{k}:a]adelay={int(starts[k] * 1000 + 80)}|{int(starts[k] * 1000 + 80)}[a{k}];" for k in range(6)) + "".join(f"[a{k}]" for k in range(6)) + f"amix=inputs=6:normalize=0,apad,atrim=0:{sum(D):.3f},loudnorm=I=-14:TP=-1.5[a]"
subprocess.run(["ffmpeg", "-v", "error", "-y"] + inp + ["-filter_complex", fc, "-map", "[a]", "-ar", "48000", "/tmp/mu/voix.wav"], check=True)
open("/tmp/mu/liste.txt", "w").write("".join(f"file '/tmp/mu/s{k + 1}.mp4'\n" for k in range(6)))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", "/tmp/mu/liste.txt", "-i", "/tmp/mu/voix.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", "/tmp/mu/micron.tmp.mp4"], check=True)
os.rename("/tmp/mu/micron.tmp.mp4", "/tmp/mu/enklair-micron.mp4"); print("ok", round(sum(D), 1), "s")
