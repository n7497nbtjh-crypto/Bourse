# Communauté (module cf/site/m/communaute.js) : analyses argumentées, listes de suivi, bloc des fiches, anciens messages, à 1440 et 390 px.
# Le serveur est simulé (aucune écriture en production). Usage : python3 tests/t_communaute_ui.py [--shots dossier] [--root cf/site]
import os, sys, json
from playwright.sync_api import sync_playwright
root = os.path.abspath(sys.argv[sys.argv.index("--root") + 1] if "--root" in sys.argv else "cf/site")
shots = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
# Messages de TEST (jamais publiés)
AN = {"id": 7, "room": "lvmh", "pseudo": "Claire", "body": "Les ventes reculent mais la marge reste au-dessus de la médiane du secteur. La dette représente moins d'une année de résultat. Le recul vient surtout des vins et spiritueux, " * 3,
      "kind": "analyse", "parent": None, "created": 1761700000000, "likes": 6, "n": 1, "meta": json.dumps({"t": "Une marge qui résiste malgré le recul des ventes", "r": "La Chine pèse lourd ; une baisse de la demande toucherait d'abord la mode.", "h": "long", "ex": 2024})}
OLD = {"id": 3, "room": "lvmh", "pseudo": "Léa", "body": "Je compare [[c:lvmh]] et [[c:kering]] cette semaine.", "kind": "idee", "parent": None, "created": 1761000000000, "likes": 4, "meta": ""}
REP = {"id": 9, "room": "lvmh", "pseudo": "Bob", "body": "Pourquoi la Chine compte-t-elle autant ?", "kind": "avis", "parent": 7, "created": 1761800000000, "likes": 0, "meta": ""}
LI = {"id": 4, "pseudo": "Marc", "titre": "Le luxe européen", "note": "Je compare les marges.", "items": json.dumps(["c:lvmh", "c:kering", "e:amundi-msci-world-pea", "c:inconnue"]), "created": 1761700000000, "likes": 2}
ST = {"posts": [], "an": [AN], "votes": []}
def route(r):
    u, m = r.request.url, r.request.method
    if "/api/communaute" in u and m == "POST":
        b = json.loads(r.request.post_data or "{}"); path = u.split("//t.local", 1)[1]
        if path == "/api/communaute/liste": ST["posts"].append(("liste", b)); return r.fulfill(json={"ok": True, "id": 4, "cle": "a" * 32}, status=201)
        if path == "/api/communaute/liste/retirer": ST["posts"].append(("retirer", b)); return r.fulfill(json={"ok": True})
        if path in ("/api/communaute/aime", "/api/communaute/liste/utile", "/api/communaute/signaler"): ST["votes"].append(path); return r.fulfill(json={"ok": True})
        if path == "/api/communaute":
            ST["posts"].append(("msg", b)); it = dict(AN, id=11, pseudo=b.get("pseudo"), room=b.get("room"), body=b.get("body"), likes=0, n=0, meta=json.dumps({"t": b.get("these"), "r": b.get("risques"), "h": b.get("horizon")}))
            ST["an"].insert(0, it); return r.fulfill(json={"ok": True, "item": it}, status=201)
        return r.fulfill(json={"ok": True})
    if "/api/communaute/analyses" in u:
        room = u.split("room=")[1].split("&")[0] if "room=" in u else None
        return r.fulfill(json={"items": [a for a in ST["an"] if not room or a["room"] == room]})
    if "/api/communaute/listes" in u: return r.fulfill(json={"items": [LI]})
    if "/api/communaute/liste?" in u: return r.fulfill(json={"item": LI})
    if "/api/communaute/fil" in u:
        i = int(u.split("id=")[1]); a = next((x for x in ST["an"] if x["id"] == i), None)
        return r.fulfill(json={"question": a, "answers": [REP]} if a else {"error": "Message introuvable."}, status=200 if a else 404)
    if "/api/communaute/questions" in u: return r.fulfill(json={"items": []})
    if "/api/communaute/avis" in u: return r.fulfill(json={"room": "lvmh", "confiant": 1, "neutre": 0, "prudent": 1})
    if "/api/communaute/portefeuilles" in u: return r.fulfill(json={"n": 0, "items": []})
    if "/api/communaute/pronos" in u: return r.fulfill(json={"items": {}})
    if "/api/communaute/recent" in u: return r.fulfill(json={"items": [OLD], "rooms": []})
    if "/api/communaute" in u: return r.fulfill(json={"room": "lvmh", "items": [OLD, REP, AN]})
    if "/api/espace/moi" in u: return r.fulfill(json={"connecte": False})
    if "/api/" in u: return r.fulfill(json={"items": []})
    if "//t.local" not in u: return r.fulfill(status=404, body="")
    path = u.split("//t.local", 1)[1].split("#")[0].split("?")[0]
    f = os.path.join(root, path.lstrip("/"))
    if os.path.isfile(f): return r.fulfill(path=f)
    if "." in path.rsplit("/", 1)[-1]: return r.fulfill(status=404, body="")
    return r.fulfill(path=os.path.join(root, "index.html"))
CHECK = r"""(W) => {
  const p = [];
  if (document.documentElement.scrollWidth > W + 1) p.push('page plus large que l\'écran : ' + document.documentElement.scrollWidth);
  const t = document.querySelector('#app').innerText;
  if (/NaN|undefined|\bnull\b|\[\[/.test(t)) p.push('NaN, null, undefined ou jeton brut affiché');
  if (t.includes('—')) p.push('tiret cadratin');
  return p;
}"""
bad = 0
def pb(name, cond, msg):
    global bad
    if not cond: bad += 1; print("ÉCHEC", name, ":", msg)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for name, opts in [("ordi", dict(viewport={"width": 1440, "height": 900})), ("tel", dict(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True))]:
        W = opts["viewport"]["width"]; ST.update({"posts": [], "an": [AN], "votes": []})
        ctx = b.new_context(**opts); ctx.add_init_script('try{if(!sessionStorage.getItem("t")){sessionStorage.setItem("t",1);localStorage.setItem("bilan.favoris",JSON.stringify(["c:lvmh","c:totalenergies"]))}}catch(e){}')
        pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e) + " @ " + pg.url))
        pg.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errs.append(m.text))
        pg.route("**/*", route)
        def look(path, shot=None, wait=900):
            pg.goto("http://t.local" + path); pg.wait_for_timeout(wait)
            p = pg.evaluate(CHECK, W); pb(f"{name} {path}", not p, p)
            if shots and shot: os.makedirs(shots, exist_ok=True); pg.screenshot(path=f"{shots}/{name}_{shot}.png", full_page=True)
        look("/communaute", "analyses")
        pb(name, pg.locator(".cmu-tabs a").count() == 4 and pg.locator(".cmu-an").count() == 1 and pg.locator(".cmu-bandeau").count() == 1, "4 onglets, 1 analyse, rappel visible")
        pb(name, pg.locator(".cmu-an .cmu-f").count() >= 3 and "Ajoutés automatiquement" in pg.inner_text(".cmu-an") and "comptes 2024" in pg.inner_text(".cmu-an"), "chiffres du site ajoutés, exercice signalé")
        pg.click(".cmu-plus"); pb(name, pg.locator(".cmu-arg.clamp").count() == 0, "« Lire la suite »")
        pg.click(".cmu-an [data-a=aime]"); pg.wait_for_timeout(200); pb(name, "Utile · 7" in pg.inner_text(".cmu-an .cmu-vote") and "/api/communaute/aime" in ST["votes"], "vote utile")
        # Écrire une analyse : contrôles côté navigateur puis envoi
        pg.click("#cmu-ecrire"); pg.click(".cmu-form button[type=submit]")
        pb(name, "Choisissez l'entreprise" in pg.inner_text(".cmu-form .cmsg"), "fiche obligatoire")
        pg.fill("#cmu-q", "kering"); pg.wait_for_timeout(200); pg.locator(".cmu-form .msug button").first.dispatch_event("pointerdown")
        pb(name, pg.locator(".cmu-prev .cmu-f").count() >= 2, "aperçu des chiffres de la fiche choisie")
        pg.fill("#cmu-t", "Une marge qui baisse depuis deux ans"); pg.fill("#cmu-b", "x" * 90); pg.fill("#cmu-r", "Une dépendance forte à une seule marque, Gucci."); pg.fill("#cmu-p", "Testeur")
        pg.click(".cmu-form button[type=submit]"); pb(name, "horizon" in pg.inner_text(".cmu-form .cmsg"), "horizon obligatoire")
        pg.click(".cmu-hzs label >> nth=2"); pg.click(".cmu-form button[type=submit]"); pb(name, "Cochez" in pg.inner_text(".cmu-form .cmsg"), "confirmation obligatoire")
        pg.check(".cmu-ok input"); pg.click(".cmu-form button[type=submit]"); pg.wait_for_timeout(900)
        sent = [x[1] for x in ST["posts"] if x[0] == "msg"]
        pb(name, sent and sent[0]["room"] == "kering" and sent[0]["horizon"] == "long" and sent[0].get("ex") and "ok" not in sent[0] and "a=11" in pg.url, "analyse envoyée puis affichée " + str(sent[:1]) + pg.url)
        if shots: pg.screenshot(path=f"{shots}/{name}_fil.png", full_page=True)
        pb(name, pg.locator(".cmu-msg").count() == 1 and pg.locator("#rep textarea").count() == 1, "fil : réponses et formulaire")
        # Ancienne adresse de discussion : analyses de la fiche + anciens messages lisibles
        look("/communaute?onglet=discussions&salon=lvmh", "salon")
        pb(name, pg.locator(".cmu-salon").count() == 1 and pg.locator(".cmu-old .cmu-msg").count() == 1 and pg.locator(".cmu-old .mention").count() == 2, "ancien salon : filtre et anciens messages avec mentions")
        # Listes de suivi
        look("/communaute?onglet=listes", "listes")
        pb(name, pg.locator(".cmu-li").count() == 1 and pg.locator(".cmu-li .cmu-lic .chip").count() == 3, "liste publique (ligne inconnue ignorée)")
        pg.click("#cmu-partager"); pb(name, pg.locator("#cmu-pick input:checked").count() == 2, "favoris proposés")
        pg.fill("#cmu-lt", "Mes valeurs"); pg.fill("#cmu-lp", "Testeur"); pg.fill("#cmu-ladd", "air liq"); pg.wait_for_timeout(200); pg.locator("#cmu-lform .msug button").first.dispatch_event("pointerdown")
        pg.click("#cmu-lform button[type=submit]"); pg.wait_for_timeout(900)
        sent = [x[1] for x in ST["posts"] if x[0] == "liste"]
        pb(name, sent and sent[0]["items"] == ["c:lvmh", "c:totalenergies", "c:air-liquide"] and "liste=4" in pg.url, "liste envoyée " + str(sent))
        pb(name, pg.locator(".cmu-l1 table tbody tr").count() == 2 and pg.locator(".cmu-etfs a").count() == 1 and pg.locator("#cmu-retirer").count() == 1, "détail : chiffres, ETF, retrait possible par l'auteur")
        if shots: pg.screenshot(path=f"{shots}/{name}_liste.png", full_page=True)
        pg.click("#cmu-copier"); fav = pg.evaluate("JSON.parse(localStorage.getItem('bilan.favoris'))")
        pb(name, "c:kering" in fav and "e:amundi-msci-world-pea" in fav and "c:inconnue" not in fav, "copie dans les favoris " + str(fav))
        pg.click("#cmu-retirer"); pg.wait_for_timeout(500); pb(name, any(x[0] == "retirer" and x[1]["cle"] == "a" * 32 for x in ST["posts"]), "retrait avec la clé locale")
        look("/communaute?onglet=portefeuilles"); pb(name, pg.locator(".cmu-tabs a.on").inner_text() == "Listes de suivi" and pg.locator("#portefeuilles").count() == 1, "ancien onglet portefeuilles")
        look("/communaute?onglet=questions"); pb(name, pg.locator(".qform textarea").count() == 1, "questions")
        look("/communaute?onglet=pronostics")
        # Fiche entreprise et ETF : bloc d'analyses
        look("/entreprise/lvmh/actualite", "fiche", 1500)
        pb(name, pg.locator("#discussion .cmu-an").count() == 1 and pg.locator("#discussion .cmu-blo .cmu-old").count() == 1 and pg.locator("#avisb .avb").count() == 1, "fiche : analyses, anciens messages, avis")
        pg.click("#discussion [data-cmu-ecrire]"); pb(name, pg.locator("#discussion .cmu-blf input[name=room]").get_attribute("value") == "lvmh", "formulaire lié à la fiche")
        look("/etf/amundi-msci-world-pea", "etf", 1800); pb(name, pg.locator("#cmini .cmu-bloc").count() == 1, "fiche ETF : bloc d'analyses")
        print(f"== {name} : {bad} problème(s), erreurs JS : {len(errs)}"); [print("  JS", e[:200]) for e in errs[:5]]; bad += len(errs)
        ctx.close()
    b.close()
print("communauté (pages) : " + ("tout est bon" if not bad else f"{bad} problème(s)")); sys.exit(1 if bad else 0)
