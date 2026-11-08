import json, re, unicodedata
D = "/tmp/v3d"; M = json.load(open(f"{D}/voix/mots.json"))
GAP = 0.28; T = []; t = 0.05
EXTRA = {7: 1.1}
for o in M: T.append(t); t += o["dur"] + GAP + EXTRA.get(o["i"], 0)
fin = t + 0.9
SCENES = [[1], [2], [3], [4, 5], [6], [7], [8]]
sc = []
for k, L in enumerate(SCENES):
    a = T[L[0] - 1] - (0.05 if k == 0 else 0.12); b = (T[SCENES[k + 1][0] - 1] - 0.12) if k + 1 < len(SCENES) else fin
    sc.append({"id": k + 1, "debut": round(max(0, a), 3), "fin": round(b, 3), "lignes": L})
FIX = {"Micran": "Micron", "Enclair": "ENKLAIR", "fond": "fonds", }
CLE = re.compile(r"[0-9%€$]|^(Micron|ETF|Monde|ENKLAIR|plongé|journée|mémoire|pourtant|IA)$", re.I)
mots = []
for o, t0 in zip(M, T):
    W = []
    for w, a, b in o["mots"]:
        w = w.strip()
        if W and (w.startswith("'") or w.startswith(",") or w.strip(".,!?") in ("%", "€", "$")): W[-1][0] += ("\u00a0" if w.strip(".,!?") in ("%", "€", "$") else "") + w; W[-1][2] = b; continue
        W.append([w, a, b])
    out = []
    for i, (w, a, b) in enumerate(W):
        if w.lower() == "moins" and i + 1 < len(W) and re.match(r"\d", W[i + 1][0]): W[i + 1][0] = "−" + W[i + 1][0]; W[i + 1][1] = a; continue
        core = w.strip(".,!?;:"); w = w.replace(core, FIX.get(core, core)) if core else w
        w = re.sub(r"(\d)\s?([%€$])", "\\1\u00a0\\2", w); w = re.sub(r"\b(\d)(\d{3})\b", "\\1\u00a0\\2", w)
        out.append({"m": w, "a": round(t0 + a, 3), "b": round(t0 + b, 3), "cle": bool(CLE.search(w.strip(".,!?;:")))})
    # paquets de 3 mots au plus, coupés à la ponctuation
    p = 0; n = 0
    for x in out:
        x["p"] = f"{o['i']}-{p}"; n += 1
        if n >= 3 or re.search(r"[.,!?:]$", x["m"]): p += 1; n = 0
    mots += out
json.dump({"scenes": sc, "lignes": [{"i": o["i"], "t": round(t0, 3), "dur": o["dur"]} for o, t0 in zip(M, T)], "mots": mots, "duree": round(fin, 3)}, open(f"{D}/site/timeline.json", "w"), ensure_ascii=False, indent=0)
print(round(fin, 2), "s"); print([(s["id"], s["debut"], s["fin"]) for s in sc]); print(" | ".join(x["m"] + ("*" if x["cle"] else "") for x in mots))
