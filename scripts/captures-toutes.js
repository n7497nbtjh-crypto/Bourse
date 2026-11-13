// Captures de référence : toutes les pages gardées, en deux tailles, pour comparer avant et après un nettoyage du CSS.
const { ouvrir, aller } = require("./_site.js"), fs = require("fs");
const dir = process.argv[2]; fs.mkdirSync(dir, { recursive: true });
const monde = (fs.existsSync("/tmp/monde.json") ? fs.readFileSync("/tmp/monde.json", "utf8") : JSON.stringify({ sujets: [] })) /* copie de /api/monde, facultative */;
const PAGES = ["/", "/entreprises", "/entreprises?secteur=tech", "/entreprise/lvmh", "/entreprise/bnp-paribas", "/entreprise/apple", "/entreprise/nvidia", "/entreprise/totalenergies", "/comparer?ids=lvmh,hermes,kering", "/comparer", "/etf", "/etf/amundi-msci-world-pea",
  "/marches", "/actualites", "/actualites?vue=presse", "/actualites?vue=annonces", "/agenda", "/classements", "/classements?c=dividende", "/dividendes", "/outils/recouvrement", "/outils/recouvrement?a=amundi-msci-world-pea&b=amundi-pea-s-p-500",
  "/lexique", "/espace", "/premium", "/premium/merci?session_id=x", "/methode", "/plan", "/favoris", "/indice/cac40", "/decouvertes", "/mentions-legales", "/cgv", "/confidentialite", "/avertissement", "/page-inconnue", "/espace/etat"];
const ETATS = [["", null, { unique: "https://buy.stripe.com/x", prix_unique: "19 € pour un an" }], ["in", { connecte: true, email: "exemple@exemple.fr", premium: true, plan: "unique", premium_jusqu_au: 1800000000000, donnees: { favoris: ["c:lvmh", "c:apple", "e:amundi-msci-world-pea"] } }, { unique: "https://buy.stripe.com/x", prix_unique: "39 €" }]];
(async () => {
  for (const [nom, vp] of [["ordi", { width: 1280, height: 900 }], ["tel", { width: 390, height: 844 }]]) for (const [et, moi, offres] of ETATS) {
    const { b, p, ctx } = await ouvrir({ viewport: vp, isMobile: vp.width < 500 });
    await p.emulateMedia({ reducedMotion: "reduce" });
    await ctx.addInitScript(`try{localStorage.setItem("bilan.favoris",JSON.stringify(["c:lvmh","c:apple","e:amundi-msci-world-pea"]));localStorage.setItem("bilan.pays","fr")}catch(e){}; Date.now = () => 1794589200000;`);
    await p.route(/\/api\/monde/, r => r.fulfill({ contentType: "application/json", body: monde }));
    await p.route(/\/api\/premium\/offres/, r => r.fulfill({ json: offres }));
    await p.route(/\/api\/premium\/statut/, r => r.fulfill({ json: moi ? { premium: true, plan: "unique", until: 1800000000000 } : { premium: false } }));
    if (moi) await p.route(/\/api\/espace\/moi/, r => r.fulfill({ json: moi }));
    const liste = et ? ["/espace", "/favoris", "/premium", "/entreprise/lvmh", "/classements", "/", "/agenda"] : PAGES;
    for (const u of liste) {
      try { await aller(p, u, 1700); await p.evaluate(() => document.querySelectorAll("details").forEach(d => d.open = true)); await p.waitForTimeout(150);
        await p.screenshot({ path: `${dir}/${nom}${et ? "_" + et : ""}${u.replace(/[\/?=&,]/g, "_")}.png`, fullPage: true }); } catch (e) { console.log("raté", nom, u, String(e).slice(0, 80)); }
    }
    // menus et fenêtres : menu du téléphone, recherche, définition
    try { await aller(p, "/entreprise/lvmh", 1500);
      await p.evaluate(() => { const i = document.querySelector("[data-search] input"); if (i) { i.value = "herm"; i.dispatchEvent(new Event("input", { bubbles: true })); } }); await p.waitForTimeout(400);
      await p.screenshot({ path: `${dir}/${nom}${et}_recherche.png` });
      await p.evaluate(() => { const d = document.querySelector("[data-ek-def]"); if (d) d.click(); }); await p.waitForTimeout(300); await p.screenshot({ path: `${dir}/${nom}${et}_definition.png` });
      await p.keyboard.press("Escape"); await p.evaluate(() => { const m = document.querySelector(".navburger, #navbtn, [data-menu], .menubtn, header button[aria-label*='enu']"); if (m) m.click(); }); await p.waitForTimeout(300); await p.screenshot({ path: `${dir}/${nom}${et}_menu.png` });
    } catch (e) { console.log("raté interactions", nom, String(e).slice(0, 80)); }
    await b.close();
  }
  console.log(fs.readdirSync(dir).length, "captures dans", dir);
})();
