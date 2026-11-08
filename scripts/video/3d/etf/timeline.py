import json, re
D = "/tmp/etf"; M = json.load(open(f"{D}/voix/mots.json"))
AFF = ["Vous avez un ETF Monde ? Alors 70 % de votre argent est aux États-Unis.",
 "Il suit l'indice MSCI World : environ 1 300 entreprises, de 23 pays.",
 "Mais elles ne pèsent pas pareil. Les 10 plus grosses font, à elles seules, 28 %.",
 "En tête : Nvidia. Puis Apple. Puis Microsoft. Ensemble, près de 15 %.",
 "Et la France ? 2 % seulement. Avec TotalEnergies, Safran, ou L'Oréal.",
 "Sur 100 € placés, 70 partent aux États-Unis. 2, en France.",
 "Ce que contient vraiment un ETF Monde, vous le voyez sur ENKLAIR."]
GAP = 0.3; T = []; t = 0.05
for o in M: T.append(t); t += o["dur"] + GAP
fin = t + 1.0
sc = [{"id": k + 1, "debut": round(max(0, T[k] - (0.05 if k == 0 else .12)), 3), "fin": round((T[k + 1] - .12) if k + 1 < len(M) else fin, 3)} for k in range(len(M))]
CLE = re.compile(r"[0-9%€]|^(ETF|Monde|MSCI|World|Nvidia|Apple|Microsoft|France|États-Unis|ENKLAIR|TotalEnergies|Safran|L'Oréal)$")
mots = []
for k, (o, t0) in enumerate(zip(M, T)):
    toks = re.sub(r"(\d) (%|€|\d{3})", "\\1\u00a0\\2", AFF[k]).split(" ")
    W = o["mots"]; n = len(toks)
    for i, w in enumerate(toks):
        j = round(i * (len(W) - 1) / max(1, n - 1)); a = W[j][1]
        mots.append({"m": w, "a": round(t0 + a, 3), "b": round(t0 + W[j][2], 3), "cle": bool(CLE.search(w.strip(".,!?:;"))), "l": k + 1})
    # paquets de 3 mots, coupés à la ponctuation
    p = 0; c = 0
    for x in [m for m in mots if m["l"] == k + 1]:
        x["p"] = f"{k + 1}-{p}"; c += 1
        if c >= 3 or re.search(r"[.,!?:]$", x["m"]): p += 1; c = 0
# temps croissants
for i in range(1, len(mots)):
    if mots[i]["a"] < mots[i - 1]["a"] + .08 and mots[i]["l"] == mots[i - 1]["l"]: mots[i]["a"] = round(mots[i - 1]["a"] + .08, 3)
json.dump({"scenes": sc, "lignes": [{"i": o["i"], "t": round(t0, 3), "dur": o["dur"]} for o, t0 in zip(M, T)], "mots": mots, "duree": round(fin, 3)}, open(f"{D}/site/timeline.json", "w"), ensure_ascii=False)
print(round(fin, 2)); print([(s["id"], s["debut"], s["fin"]) for s in sc])
