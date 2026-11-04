# Analyse des textes relevés par scripts/relire-textes.js (4/11/2026) : fautes à corriger avant de pousser.
# Rapport : /tmp/relecture-textes.txt. Mots inconnus : dictionnaire français de pyspellchecker
# (pip install --break-system-packages pyspellchecker), sans les mots à majuscule (noms propres) ni ceux qui contiennent un chiffre.
import json, re, sys, collections
T = json.load(open("/tmp/relecture-textes.json"))
REGLES = [
    (r"—", "tiret cadratin"),
    (r"(?i)(?<![\w-])(tu|toi|ton|ta|tes|tien|tienne)(?![\w-])(?! (?:as|es|peux|veux|dois|vas)\b)", None),  # filtré plus bas
    (r"\b(\w{3,}) \1\b", "mot répété"),
    (r" [,.](?!\d)", "espace avant , ou ."),
    (r"[a-zà-ÿ][.!?][A-ZÀ-Ý][a-zà-ÿ]", "pas d'espace après la ponctuation"),
    (r"\b(NaN|undefined|null|Infinity|\[object)\b", "valeur cassée"),
    (r"\.\.(?!\.)", "deux points de suite"),
    (r"\( ", "espace après ("),
]
TUTOIE = re.compile(r"(?<![\w'-])(tu|ton|tes)(?![\w'-])", re.I)
out, n = [], collections.Counter()
for page, txt in T.items():
    for ligne in txt.split("\n"):
        l = ligne.strip()
        if not l: continue
        for rx, nom in REGLES:
            if nom is None: continue
            for m in re.finditer(rx, l):
                ctx = l[max(0, m.start() - 40): m.end() + 40]
                if nom == "mot répété" and m.group(1).lower() in ("nous", "vous", "plus", "très", "bien", "fois"): continue
                if nom == "pas d'espace après la ponctuation" and re.search(r"\w\.\w+\.(com|fr|org|gov|net|io)|[A-Z]\.[A-Z]|e\.g|i\.e|https?:|www\.", ctx): continue
                out.append((nom, page, ctx)); n[nom] += 1
        for m in TUTOIE.finditer(l):
            ctx = l[max(0, m.start() - 40): m.end() + 40]
            if re.search(r"(?i)\b(ton(ne|nes|s)?\b(?= de)|bon ton|un ton|le ton|ce ton|TON)\b", ctx) and m.group(1).lower() == "ton": continue
            out.append(("tutoiement ?", page, ctx)); n["tutoiement ?"] += 1
# Mots inconnus
try:
    from spellchecker import SpellChecker
    sp = SpellChecker(language="fr")
    mots = collections.Counter()
    ou = collections.defaultdict(set)
    for page, txt in T.items():
        for w in re.findall(r"[A-Za-zÀ-ÿœæŒÆ'’-]+", txt):
            for x in re.split(r"[-'’]", w):
                if len(x) >= 4 and x.islower(): mots[x] += 1; ou[x].add(page)
    inc = sp.unknown(list(mots))
    for w in sorted(inc, key=lambda x: -mots[x]):
        out.append(("mot inconnu", ",".join(sorted(ou[w]))[:80], f"{w} ({mots[w]} fois)")); n["mot inconnu"] += 1
except ImportError:
    print("pyspellchecker absent : mots inconnus non vérifiés")
with open("/tmp/relecture-textes.txt", "w") as f:
    for nom in n:
        f.write(f"== {nom} : {n[nom]}\n")
        for o in out:
            if o[0] == nom: f.write(f"   {o[1]} : {o[2]}\n")
print(", ".join(f"{k} : {v}" for k, v in n.items()) or "aucune faute repérée", "· rapport /tmp/relecture-textes.txt")
