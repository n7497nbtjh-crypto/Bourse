# Mesure la pertinence des réponses calculées de bilan. (copilote « Demander à bilan. » et assistant de fiche).
# Usage : python3 tests/t_ia.py            (avec cf/site/ia.js, les nouvelles règles)
#         python3 tests/t_ia.py --sortie r.json (enregistre toutes les réponses pour les relire)
#         python3 tests/t_ia.py --ancien   (anciennes règles de index.html, pour comparer)
#         python3 tests/t_ia.py -v         (affiche aussi les réponses des questions réussies)
import os, sys, json, re, unicodedata
exec(open("tests/audit.py").read().split("CHECK = ")[0])  # donne route() et sync_playwright
STATE = {}
ANCIEN = "--ancien" in sys.argv
VERB = "-v" in sys.argv
SORTIE = sys.argv[sys.argv.index("--sortie") + 1] if "--sortie" in sys.argv else None  # écrit toutes les réponses (JSON) pour les relire
QS = json.load(open("tests/ia_questions.json"))

HTML = open("cf/site/index.html", encoding="utf-8").read()
if not ANCIEN and '<script src="/ia.js">' not in HTML:  # ancienne page sans ia.js : on l'ajoute comme en production
    HTML = HTML.replace("const termeTexte = t =>", "const termeTexte_ancien = t =>").replace("</body>", '<script src="/ia.js"></script></body>')
if ANCIEN: sys.exit("--ancien n'a plus de sens : les anciennes règles ont été retirées de index.html")
def route2(r):  # les vrais cours du site (data/cours.json) plutôt que la maquette : médianes de PER réalistes
    u = r.request.url
    if "/api/cours" in u: return r.fulfill(status=404, body="")
    path = u.split("//t.local", 1)[-1].split("?")[0]
    if "//t.local" in u and not path.startswith("/api/") and "." not in path.rsplit("/", 1)[-1]: return r.fulfill(body=HTML, content_type="text/html; charset=utf-8")
    if "/api/" in r.request.url and not any(k in r.request.url for k in ("/api/premium/statut", "/api/amf", "/api/espace/moi")): return r.fulfill(status=503, json={"error": "test"})
    return route(r)

# Même enchaînement que iaRun : règles locales, puis leçons pour les questions ouvertes, sinon l'IA connectée du visiteur (« serveur » ci-dessous).
RUN = r"""async (qs) => {
  await Promise.all([PXP, loadAna(), acaLoad()]);
  const OUV = /pourquoi|comment|c.?est quoi|qu.?est|explique|difference|faut.?il|doit.?on|risque|definition|signifie|fonctionne|marche|vaut.?il|interet/i;
  return qs.map(q => {
    let a = null, err = null;
    try { a = localCopilot(q); } catch (e) { err = String(e && e.stack || e).slice(0, 300); }
    if (!a && !err && OUV.test(norm(q))) { const h = chercheLecons(q); if (h.length) a = { action: "lecons", hits: h.map(x => x.m.id + "/" + x.l.id) }; }
    if (!a) a = { action: err ? "erreur" : "serveur", err };
    const o = JSON.parse(JSON.stringify(a));
    if (o.action === "fiche" && !o.id && o.nom) { const x = resoudre(o.nom); if (x) { if (x.etf) o.etf = x.etf.id; else o.id = x.id; } }
    if (o.action === "comparer" && !o.ids && o.noms) o.ids = o.noms.map(resoudre).filter(x => x && !x.etf).map(x => x.id);
    if (o.action === "filtre") { try { o.n = runFiltre(o).l.length; } catch (e) { o.err = String(e).slice(0, 200); } }
    return o;
  });
}"""
ASSIST = r"""async ([ids, qs]) => {
  await Promise.all([PXP, loadAna()]);
  const out = {};
  for (const id of ids) {
    const s = RBY[id], c = FULL[id] || (FULL[id] = await (await fetch(`/data/societes/${id}.json`)).json());
    out[id] = qs.map(q => { try { return localAssist(s, c, q.replace(/\{nom\}/g, s.name)); } catch (e) { return "ERREUR " + String(e && e.stack || e).slice(0, 300); } });
  }
  return out;
}"""

def n(s): return unicodedata.normalize("NFD", str(s or "").replace("\u202f", " ").replace("\u00a0", " ").replace("’", "'")).encode("ascii", "ignore").decode().lower().replace("\n", " ")
REFUS = re.compile(r"personne ne (peut|sait|connait)|ne (peut|pouvons) pas (savoir|prevoir|dire)|ne (predit|prevoit|recommande|conseille|dit) (pas|jamais|aucun)|ne donne (pas|aucun)|aucune? (prevision|prediction|recommandation)|pas (de|un) conseil")
HORS = re.compile(r"(le site|bilan\.?|l.ia|je) (repond|traite|parle|couvre|explique|suit|ne suit)|questions? sur (la bourse|les placements|l.investissement)|ne suit pas|hors du champ|ne (couvre|traite) pas")
STYLE = [("tiret cadratin", "—"), ("tiret demi-cadratin", "–"), ("point d'exclamation", "!"), ("undefined", "undefined"), ("NaN", "NaN"), ("null", "null"), ("[object", "[object")]

def style(t):
    return [k for k, s in STYLE if s in str(t or "")]

def match(o, e):
    act = e["action"]
    if act == "serveur": return o["action"] == "serveur"
    if act == "lecons":
        return o["action"] == "lecons" and (not e.get("lecon") or any(h in e["lecon"] for h in o.get("hits", [])))
    if act in ("refus", "hors"):
        if o["action"] != "repondre": return False
        t = n((o.get("titre") or "") + " " + (o.get("texte") or ""))
        return bool((REFUS if act == "refus" else HORS).search(t)) and not re.search(r"va (monter|baisser) (demain|bientot)", t)
    if o["action"] != act: return False
    if act == "repondre":
        return bool(re.search(e["re"], n((o.get("titre") or "") + " " + (o.get("texte") or ""))))
    if act == "fiche": return (e.get("id") and o.get("id") == e["id"]) or (e.get("etf") and o.get("etf") == e["etf"])
    if act == "comparer":
        ids = o.get("ids") or []
        return all(i in ids for i in e["ids"]) and len(ids) >= e.get("min", len(e["ids"]))
    if act == "etf":
        return all(o.get(k) == e[k] or (k == "pea" and e[k] is False and not o.get(k)) for k in ("categorie", "pea") if k in e)
    if act == "filtre":
        for k in ("secteur", "region", "pays"):
            if k in e and (o.get(k) or None) != e[k]: return False
        if "pea" in e and bool(o.get("pea")) != e["pea"]: return False
        if "criteres" in e:
            got = {c["indicateur"]: c for c in o.get("criteres") or []}
            if set(got) != {c[0] for c in e["criteres"]}: return False
            for c in e["criteres"]:
                if len(c) > 1 and got[c[0]]["condition"] != c[1]: return False
                if len(c) > 2 and got[c[0]].get("valeur") != c[2]: return False
        if "tri" in e:
            t = o.get("tri") or {}
            ind, ordre = e["tri"].split(":")
            if t.get("indicateur") != ind or t.get("ordre") != ordre: return False
        return True
    return False

def court(o):
    o = dict(o); o.pop("local", None)
    if "texte" in o: o["texte"] = o["texte"][:160].replace("\n", " / ") + ("…" if len(o["texte"]) > 160 else "")
    return json.dumps(o, ensure_ascii=False)

with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.route("**/*", route2)
    pg.goto("http://t.local/demander"); pg.wait_for_function("typeof R !== 'undefined' && R && R.companies && R.companies.length > 100", timeout=20000)
    cop = QS["copilote"]
    res = pg.evaluate(RUN, [x["q"] for x in cop])
    fq = QS["fiche"]
    asr = pg.evaluate(ASSIST, [QS["societes"], [x["q"] for x in fq]])
    # Parcours réel dans la page : iaRun affiche le résultat ou ouvre la bonne page ; l'assistant de fiche répond
    ui = []
    for q, attendu in [("boites tech pas cheres", "entreprises remplissent"), ("etf monde eligible pea", "ETF"), ("c'est quoi un etf", "indice"), ("quelle action va monter demain", "Personne"),
                       ("comment declarer mes dividendes aux impots", "Académie"), ("lvmh ou hermes", "/comparer?ids=lvmh,hermes"), ("etf cw8", "/etf/amundi-msci-world-swap"), ("total", "/entreprise/totalenergies")]:
        pg.goto("http://t.local/demander?q=" + q.replace(" ", "+")); pg.wait_for_timeout(900)
        for _ in range(12):  # machine chargée : on laisse la page finir de se remplir (4 s au plus)
            txt = pg.url + " " + pg.inner_text("#app")
            if attendu in txt and "undefined" not in txt and "NaN" not in txt: break
            pg.wait_for_timeout(250)
        if attendu not in txt or "undefined" in txt or "NaN" in txt: ui.append(f"« {q} » : attendu « {attendu} », obtenu {pg.url} {pg.inner_text('#app')[:160]!r}")
    pg.goto("http://t.local/entreprise/lvmh"); pg.wait_for_timeout(900)
    if pg.locator("#orciab").count():  # l'assistant de fiche est le panneau ✦ (seul point d'entrée de l'IA)
        pg.click("#orciab"); pg.fill("#orciaf input", "pourquoi le cours baisse"); pg.press("#orciaf input", "Enter")
        t = ""
        for _ in range(16):
            pg.wait_for_timeout(250); t = pg.inner_text("#orcialog")
            if "Réponse instantanée" in t: break
        if "Réponse instantanée" not in t or "Sur un an" not in t: ui.append("assistant de fiche : pas de réponse locale affichée " + t[:120])
        et = pg.inner_text("#orcia")
        if "Réponses calculées" not in et and "IA du site" not in et: ui.append("panneau ✦ : état de l'IA absent " + et[:80])
    else: ui.append("assistant de fiche (panneau ✦) absent")
    b.close()

if SORTIE: json.dump({"copilote": [{"q": x["q"], "r": o} for x, o in zip(cop, res)], "fiche": {sid: [{"q": x["q"], "r": asr[sid][i]} for i, x in enumerate(fq)] for sid in QS["societes"]}}, open(SORTIE, "w"), ensure_ascii=False, indent=1)
print(f"== Règles {'anciennes (index.html)' if ANCIEN else 'nouvelles (cf/site/ia.js)'}")
ok_c, par_cat, fails = 0, {}, []
for x, o in zip(cop, res):
    good = any(match(o, e) for e in x["attendu"])
    st = style(o.get("texte")) + style(o.get("titre"))
    if good and st: good = False; o["_style"] = st
    if good and o["action"] == "filtre" and o.get("n") == 0: o["_vide"] = True  # accepté, signalé
    ok_c += good
    c = par_cat.setdefault(x["cat"], [0, 0]); c[0] += good; c[1] += 1
    if not good: fails.append((x, o))
    elif VERB: print("  ok  ", x["q"], "→", court(o))
print(f"Copilote : {ok_c}/{len(cop)} = {ok_c / len(cop):.1%}")
ctl = [(x, o) for x, o in zip(cop, res) if x.get("jeu") == "controle"]
if ctl: k = sum(1 for x, o in ctl if x not in [f[0] for f in fails]); print(f"  dont jeu de contrôle (questions écrites après les règles) : {k}/{len(ctl)} = {k / len(ctl):.1%}")
print("  par catégorie : " + ", ".join(f"{k} {a}/{t}" for k, (a, t) in par_cat.items()))
vides = [x["q"] for x, o in zip(cop, res) if o.get("_vide")]
if vides: print(f"  recherches comprises mais sans résultat dans les données ({len(vides)}) : " + " ; ".join(vides))
for x, o in fails:
    print(f"  ÉCHEC [{x['cat']}] « {x['q']} »\n      attendu : {x['comportement']}\n      obtenu  : {court(o)}")

ok_f, tot_f, ffails, par_int = 0, 0, [], {}
for i, x in enumerate(fq):
    e = x["attendu"]
    for sid in QS["societes"]:
        t = asr[sid][i]; tot_f += 1
        why = []
        if t is None:
            if not e.get("ou_serveur"): why.append("pas de réponse locale (envoyée au modèle)")
        else:
            nt = n(t)
            if t.startswith("ERREUR"): why.append(t)
            if not re.search(e["re"], nt): why.append("ne répond pas à la question")
            if e.get("chiffre") and not re.search(r"\d", t): why.append("aucun chiffre")
            if e.get("mediane") and not re.search(r"median|secteur|concurren", nt): why.append("pas de comparaison au secteur")
            why += ["style : " + s for s in style(t)]
            if re.search(r"\btu\b|\bton\b|\btes\b", nt): why.append("tutoiement")
        good = not why
        ok_f += good
        c = par_int.setdefault(x["intent"], [0, 0]); c[0] += good; c[1] += 1
        if not good: ffails.append((x, sid, t, why))
        elif VERB: print("  ok  ", sid, x["q"], "→", (t or "(serveur)")[:200].replace("\n", " / "))
print(f"Assistant de fiche : {ok_f}/{tot_f} = {ok_f / tot_f:.1%} ({len(fq)} questions × {len(QS['societes'])} entreprises)")
fctl = [x for x in fq if x.get("jeu") == "controle"]
if fctl: nb = sum(1 for x, sid, t, w in ffails if x.get("jeu") == "controle"); print(f"  dont jeu de contrôle : {len(fctl) * len(QS['societes']) - nb}/{len(fctl) * len(QS['societes'])}")
print("  par intention : " + ", ".join(f"{k} {a}/{t}" for k, (a, t) in par_int.items()))
for x, sid, t, why in ffails:
    print(f"  ÉCHEC [{sid}] « {x['q']} » : {', '.join(why)}\n      obtenu : {(t or '(rien)')[:260].replace(chr(10), ' / ')}")
tot = ok_c + ok_f; N = len(cop) + tot_f
print(f"TOTAL : {tot}/{N} = {tot / N:.1%}  (questions distinctes : {len(cop) + len(fq)})")
print(f"Parcours dans la page : {8 + 1 - len(ui)}/9" + ("" if not ui else "\n  " + "\n  ".join(ui)))
if errs: print("Erreurs JS :", errs[:5])
sys.exit(0 if tot / N >= 0.9 and not errs and not ui else 1)
