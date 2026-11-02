// Images pour les réseaux d'ENKLAIR (X, Instagram, TikTok : enklair_), dans la DA du site (v3 « Quotidien »).
// Usage : node scripts/posts.js [AAAA-MM-JJ]  → posts/<date>/*.png (1080×1350 et 1080×1920) + legendes.txt
// Rien n'est publié : Romain relit et publie lui-même (ou plus tard avec ses propres clés). Aucun conseil, chiffres datés.
// Les chiffres viennent du site lui-même (mêmes fonctions que la fiche : rfAxes, rfVerdictMots), chargé en local.
const { ouvrir, aller } = require("./_site");
const { chromium } = require("playwright"), fs = require("fs"), path = require("path");
const SITE = "repere-bourse.pages.dev";

(async () => {
  const jour = process.argv[2] || new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  const { b, p } = await ouvrir();
  await aller(p, "/entreprises", 3000);
  const D = await p.evaluate(async (jour) => {
    await loadPrices();
    const capE = c => { const x = pxOf(c); const v = x && x.cap ? toEur(x.cap, x.cur) : null; return v && isFinite(v) ? v : 0; };
    const fiche = c => { const x = pxOf(c);
      const ax = rfAxes(c).filter(a => a.r).map(a => ({ k: a.k, t: a.t, p: a.r.p, word: a.word, rank: a.r.rank, n: a.r.n }));
      return { id: c.id, name: c.name, secteur: secName(c), pays: (COUNTRY && COUNTRY[c.country]) || "", chg: x ? x.chg : null, prix: x ? x.p : null, cur: x ? (x.cur || c.currency) : null, ax, verdict: rfVerdictMots(c) }; };
    const grandes = R.companies.filter(c => !c.missing && capE(c) > 20e9 && pxOf(c) && pxOf(c).chg != null && Math.abs(pxOf(c).chg) <= 15); // au-delà de 15 % en une séance, un cours erroné est plus probable qu'un vrai mouvement : jamais publié sans vérification
    const out = { seance: PXUP, posts: [] };
    // 1. Le chiffre du jour : la plus forte variation parmi les grandes entreprises (plus de 20 milliards d'euros en Bourse)
    const m = grandes.slice().sort((a, b) => Math.abs(pxOf(b).chg) - Math.abs(pxOf(a).chg))[0];
    if (m) out.posts.push({ type: "chiffre", ...fiche(m) });
    // 2. Résultats du jour : l'entreprise la plus grosse qui publie aujourd'hui (agenda officiel du site)
    let ev = [];
    for (const f of ["/data/agenda.json", "/data/agenda-auto.json"]) { try { const j = await (await fetch(f)).json(); ev = ev.concat(j.events || j.list || []); } catch (e) { } }
    const pub = ev.filter(e => e.date === jour && /sultat/i.test(e.type || "") && RBY[e.id] && !RBY[e.id].missing).sort((a, b) => capE(RBY[b.id]) - capE(RBY[a.id]))[0];
    if (pub) out.posts.push({ type: "resultats", label: pub.label, ...fiche(RBY[pub.id]) });
    return out;
  }, jour);
  await b.close();

  const dir = path.join(__dirname, "..", "posts", jour); fs.mkdirSync(dir, { recursive: true });
  const nf = (v, d = 2) => v == null ? "–" : v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = v => (v > 0 ? "+" : v < 0 ? "−" : "") + nf(Math.abs(v)) + " %";
  const dSeance = (() => { if (!D.seance || D.seance === "none") return ""; // la séance des cours : jour de la mise à jour, ramené au dernier jour ouvré (avant 9 h, la veille)
    const P = new Date(new Date(D.seance).toLocaleString("en-US", { timeZone: "Europe/Paris" })); if (P.getHours() < 9) P.setDate(P.getDate() - 1);
    while (P.getDay() === 0 || P.getDay() === 6) P.setDate(P.getDate() - 1);
    return P.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }); })();
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const NOMS = { croissance: "Croissance des ventes", marge: "Marge", solidite: "Solidité (dette)", dividende: "Dividende", prix: "Prix (PER)" };

  const html = (P, H) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Inter:wght@500;600;700;800&display=block" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0}body{width:1080px;height:${H}px;background:#fff;font-family:Inter,sans-serif;color:#111;font-variant-numeric:tabular-nums}
.w{height:100%;padding:${H > 1500 ? 120 : 64}px 72px;display:flex;flex-direction:column;gap:${H > 1500 ? 44 : 30}px;${H > 1500 ? "justify-content:space-between" : ""}}
.top{display:flex;align-items:center;justify-content:space-between}
.logo{font:800 46px "Bricolage Grotesque";letter-spacing:-.05em;background:#FFE14D;padding:4px 18px 8px;border-radius:14px;transform:rotate(-2deg)}
.stk{font:800 30px "Bricolage Grotesque";padding:10px 22px;border-radius:14px;border:4px solid #111;box-shadow:6px 6px 0 #111;transform:rotate(-3deg);background:${P.type === "chiffre" ? "#FF7EB3" : "#9DB0FF"}}
h1{font:800 104px/.92 "Bricolage Grotesque";letter-spacing:-.055em}
.sub{font:700 30px Inter;color:#444;margin-top:12px}
.big{background:#FFE14D;border-radius:40px;padding:36px 44px}
.big b{display:block;font:800 ${P.type === "chiffre" ? 190 : 76}px/.95 "Bricolage Grotesque";letter-spacing:-.05em;color:${P.type === "chiffre" ? (P.chg >= 0 ? "#00875A" : "#C2260E") : "#111"}}
.big span{display:block;font:700 30px Inter;margin-top:14px}
.card{border:4px solid #111;border-radius:36px;padding:30px 36px;display:grid;gap:22px}
.card h2{font:800 38px "Bricolage Grotesque";letter-spacing:-.04em}
.row{display:grid;grid-template-columns:330px 1fr 230px;align-items:center;gap:24px;font:700 27px Inter}
.ms{height:16px;border-radius:8px;background:linear-gradient(90deg,#FFD0C4 50%,#BFF0DA 50%);position:relative}
.ms:before{content:"";position:absolute;left:50%;top:-8px;width:4px;height:32px;background:#111}
.ms i{position:absolute;top:-10px;width:36px;height:36px;margin-left:-18px;border-radius:50%;background:#111;border:6px solid #fff}
.row em{font-style:normal;font-weight:800;text-align:right}
.v{font:800 36px/1.15 "Bricolage Grotesque";letter-spacing:-.03em}
.foot{${H > 1500 ? '' : 'margin-top:auto;'}display:flex;justify-content:space-between;align-items:flex-end;font:600 22px/1.35 Inter;color:#444}
.foot b{color:#111;font-weight:800}</style></head><body><div class="w">
<div class="top"><span class="logo">ENKLAIR</span><span class="stk">${P.type === "chiffre" ? "Le chiffre du jour" : "Résultats aujourd'hui"}</span></div>
<div><h1>${esc(P.name)}</h1><p class="sub">${esc(P.secteur)}${P.pays ? " · " + esc(P.pays) : ""}</p></div>
<div class="big">${P.type === "chiffre" ? `<b>${pct(P.chg)}</b><span>en Bourse à la séance du ${esc(dSeance)}</span>` : `<b>${esc(P.label)}</b><span>Publication prévue le ${esc(new Date(jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }))}, d'après son calendrier officiel</span>`}</div>
<div class="card"><h2>Face à son secteur, d'après ses derniers comptes</h2>${P.ax.filter(a => a.k !== "dividende").slice(0, 4).map(a => `<div class="row"><span>${esc(NOMS[a.k] || a.t)}</span><div class="ms"><i style="left:${(a.p * 100).toFixed(0)}%"></i></div><em>${esc(a.word || "")}</em></div>`).join("")}
<p class="v">${esc(P.verdict)}.</p></div>
<div class="foot"><span>Trait noir : la médiane du secteur. À droite, c'est mieux.<br>Comptes officiels, cours différés. <b>Information, pas conseil.</b></span><span style="text-align:right"><b>@enklair_</b><br>${SITE}</span></div>
</div></body></html>`;

  const br = await chromium.launch(), lg = [];
  for (const [i, P] of D.posts.entries()) {
    for (const H of [1350, 1920]) {
      const pg = await br.newPage({ viewport: { width: 1080, height: H } });
      await pg.setContent(html(P, H), { waitUntil: "networkidle" }).catch(() => { });
      await pg.waitForTimeout(500);
      await pg.screenshot({ path: path.join(dir, `${i + 1}-${P.type}-${P.id}-${H === 1350 ? "carre" : "story"}.png`) }); await pg.close();
    }
    const lien = `https://${SITE}/entreprise/${P.id}`;
    lg.push(P.type === "chiffre"
      ? `${i + 1}. ${P.name} : ${pct(P.chg)} à la séance du ${dSeance}.\nFace à son secteur : ${P.verdict.toLowerCase()}.\nLes comptes, la médiane du secteur et les sources : ${lien}\nInformation, pas conseil.\n#Bourse #${P.name.replace(/[^A-Za-zÀ-ÿ0-9]/g, "")} #Investir`
      : `${i + 1}. ${P.name} publie aujourd'hui : ${P.label}.\nAvant les chiffres, où en est-elle face à son secteur ? ${P.verdict}.\nLa fiche complète : ${lien}\nInformation, pas conseil.\n#Bourse #Résultats #${P.name.replace(/[^A-Za-zÀ-ÿ0-9]/g, "")}`);
  }
  await br.close();
  fs.writeFileSync(path.join(dir, "legendes.txt"), lg.join("\n\n") + "\n");
  console.log(`${D.posts.length} post(s) dans posts/${jour}`);
})();
