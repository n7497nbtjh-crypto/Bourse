// Contrôle des visuels des fiches entreprise (fiche v4), créé le 3/11/2026 après des graphiques cassés vus par Romain
// (barres de perte posées sur les années, étiquettes qui sortent de l'écran, surlignage décalé…).
// Même principe que relire-fiches.js pour les textes : on ouvre beaucoup de fiches, en grand écran ET en téléphone, et on mesure.
// Repère :
//  - deux textes d'un graphique qui se chevauchent ;
//  - un texte posé sur une barre ou un point (hors étiquettes prévues pour être dessus) ;
//  - un texte qui sort du cadre du graphique ;
//  - un élément de la page qui dépasse de l'écran (téléphone) ;
//  - un bloc dont le contenu déborde sans barre de défilement.
// Usage : node scripts/relire-visuel.js [n] ; rapport dans /tmp/relecture-visuel.txt ; code de sortie 1 s'il reste un problème.
const { ouvrir, aller, ROOT } = require("./_site"), fs = require("fs"), path = require("path");
const FIXES = ["lvmh", "hermes", "alstom", "bnp-paribas", "totalenergies", "asml", "kering", "apple", "intel", "atos", "eutelsat", "moderna", "axa", "baker-hughes"];
(async () => {
  const n = +process.argv[2] || 40, dir = path.join(ROOT, "data", "societes");
  const tous = fs.readdirSync(dir).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5)).filter(id => !FIXES.includes(id));
  for (let i = tous.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [tous[i], tous[j]] = [tous[j], tous[i]]; }
  let ids = [...FIXES, ...tous.slice(0, Math.max(0, n - FIXES.length))].filter(id => fs.existsSync(path.join(dir, id + ".json")) || FIXES.includes(id));
  // Mode « comparer » (node scripts/relire-visuel.js 30 comparer) : des comparaisons fixes + des trios tirés au hasard dans un même secteur
  const MODE = process.argv[3] || "fiche";
  if (MODE === "comparer") {
    const idx = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "societes.json"), "utf8")), L = (idx.companies || idx).filter(c => !c.missing && c.ca > 0), par = {};
    L.forEach(c => (par[c.sector] = par[c.sector] || []).push(c.id));
    const fix = ["lvmh,hermes,kering", "apple,microsoft,alphabet", "bnp-paribas,societe-generale,axa", "totalenergies,shell,bp", "apple,lvmh", "intel,amd,asml", "kering,atos", "alstom,airbus,safran"];
    const tir = []; const secs = Object.keys(par).filter(k => par[k].length >= 3);
    while (tir.length < Math.max(0, n - fix.length)) { const sc = par[secs[Math.floor(Math.random() * secs.length)]], t = new Set(); while (t.size < 3) t.add(sc[Math.floor(Math.random() * sc.length)]); tir.push([...t].join(",")); }
    ids = [...fix, ...tir];
  }
  // Mode « accueil » (node scripts/relire-visuel.js 4 accueil) : la page d'accueil, avec chacun des quatre exemples affiché
  if (MODE === "accueil") ids = ["hermes", "lvmh", "asml", "sanofi"];
  // Mode « etf » (node scripts/relire-visuel.js 30 etf) : des fiches ETF fixes (avec et sans historique, obligations, or, levier) + tirage au hasard
  if (MODE === "etf") {
    const L = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "etf.json"), "utf8")).list.map(e => e.id);
    const fix = ["amundi-msci-world-pea", "amundi-msci-world-swap", "ishares-core-msci-world", "ishares-msci-world-swap-pea", "spdr-sp500"].filter(i => L.includes(i));
    const autres = ["obligations", "matieres", "monetaire"].map(c => (JSON.parse(fs.readFileSync(path.join(ROOT, "data", "etf.json"), "utf8")).list.find(e => e.categorie === c) || {}).id).filter(Boolean);
    const lev = (JSON.parse(fs.readFileSync(path.join(ROOT, "data", "etf.json"), "utf8")).list.find(e => e.levier) || {}).id;
    ids = [...fix, ...autres, ...(lev ? [lev] : [])]; while (ids.length < n) { const i = L[Math.floor(Math.random() * L.length)]; if (!ids.includes(i)) ids.push(i); }
  }
  const url = id => MODE === "accueil" ? "/" : MODE === "etf" ? "/etf/" + id : MODE === "comparer" ? "/comparer?ids=" + id : "/entreprise/" + id;
  const out = [], tailles = [["ordinateur", { width: 1280, height: 900 }], ["téléphone", { width: 360, height: 800 }]];
  let vues = 0;
  for (const [nomT, vp] of tailles) {
    const { b, p } = await ouvrir({ viewport: vp });
    for (const id of ids) {
      try { await aller(p, url(id), MODE === "comparer" ? 2600 : 1800); } catch (e) { continue; }
      if (MODE === "accueil") { await p.evaluate(id => { if (typeof a4Montrer === "function") a4Montrer(id); }, id); await p.waitForTimeout(400); }
      const r = await p.evaluate(() => {
        const P = [], W = document.documentElement.clientWidth;
        const inter = (a, b, m = 1) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > m && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > m;
        const nomEtape = el => { const st = el.closest(".ek-step"); return st ? st.id : (el.closest("section") || {}).id || "page"; };
        document.querySelectorAll(":is(.ek-page,.a4) svg").forEach(svg => {
          const box = svg.getBoundingClientRect(); if (!box.width) return;
          const T = [...svg.querySelectorAll("text")].filter(t => t.textContent.trim()).map(t => ({ t, r: t.getBoundingClientRect(), s: t.textContent.trim() }));
          // formes « pleines » : barres et points (pas les zones de fond, les quadrillages, ni le fond noir de l'étiquette de médiane)
          const F = [...svg.querySelectorAll("rect, circle")].map(e => ({ e, r: e.getBoundingClientRect() })).filter(o => {
            const f = (o.e.getAttribute("fill") || "").toLowerCase(); if (o.e.tagName === "rect" && (o.r.width > box.width * 0.3 || ["#e2f8ee", "#ffe9e3"].includes(f) && o.r.height > 40 || f === "#111")) return false;
            return o.r.width > 2 && o.r.height > 2; });
          for (let i = 0; i < T.length; i++) {
            const a = T[i];
            if (a.r.left < box.left - 2 || a.r.right > box.right + 2 || a.r.top < box.top - 2 || a.r.bottom > box.bottom + 2) P.push(["sort du graphique", nomEtape(svg), a.s]);
            for (let j = i + 1; j < T.length; j++) if (inter(a.r, T[j].r, 2)) P.push(["textes superposés", nomEtape(svg), a.s + " / " + T[j].s]);
            F.forEach(f => { if (inter(a.r, f.r, 3)) P.push(["texte sur une barre ou un point", nomEtape(svg), a.s]); });
          }
        });
        // Code ou valeur technique affiché à la place d'un texte (ex. « g=>` », « undefined », « NaN »)
        { const t = (document.querySelector(".ek-page,.a4") || document.body).innerText, m = t.match(/.{0,25}(\$\{|=>|\bundefined\b|\bNaN\b|\bnull\b|\[object).{0,15}/); if (m) P.push(["code ou valeur technique affiché", "page", m[0]]); }
        // Cases de tableau qui se superposent
        document.querySelectorAll(":is(.ek-page,.a4) table tr").forEach(tr => { const c = [...tr.children].map(x => x.getBoundingClientRect()); for (let i = 1; i < c.length; i++) if (c[i].width && c[i - 1].width && c[i].left < c[i - 1].right - 1) { P.push(["cases de tableau superposées", nomEtape(tr), tr.textContent.trim().slice(0, 40)]); break; } });
        // Valeur hors échelle : point posé au bout de l'axe ; le vrai chiffre doit être écrit sous le graphique
        document.querySelectorAll(".ek-page circle[data-hors]").forEach(c => { const box = c.closest(".ek-box"), nom = c.getAttribute("data-hors");
          if (!box || ![...box.querySelectorAll(".ek-out-h")].some(p => p.textContent.includes(nom))) P.push(["valeur hors échelle sans explication", nomEtape(c), nom]); });
        // Vraisemblance : un chiffre « sur 100 » au-delà de 150 affiché tel quel dans un graphique (ex. « 1 022 € » versés sur 100 € de bénéfice)
        document.querySelectorAll(".ek-page .ek-box").forEach(b => { const t = (b.querySelector(".ek-bt") || {}).textContent || ""; if (!/sur 100/.test(t)) return;
          b.querySelectorAll("svg text[font-weight=\"800\"]").forEach(x => { const m = x.textContent.replace(/\s/g, "").match(/^(-?\d+)(€|\$|£|%|[A-Z]{3})$/); if (m && Math.abs(+m[1]) > 150) P.push(["chiffre « sur 100 » invraisemblable affiché tel quel", nomEtape(b), x.textContent]); }); });
        document.querySelectorAll(":is(.ek-page,.a4) *").forEach(e => {
          const r = e.getBoundingClientRect(); if (!r.width || e.closest(".scroll-x, svg")) return;
          if (r.right > W + 1) P.push(["dépasse de l'écran", nomEtape(e), (e.className && e.className.baseVal == null ? e.className : e.tagName) + " : " + (e.textContent || "").trim().slice(0, 40)]);
        });
        document.querySelectorAll(":is(.ek-page,.a4) :is(.ek-box,.ek-tc,.ek-why,.ek-cmp,.ek-h,.a4-tri>div,.a4-duo>div)").forEach(e => {
          if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX === "visible") P.push(["contenu qui déborde", nomEtape(e), e.className]);
        });
        // l'icône « ? » du terme du titre doit rester sur la même ligne que le terme
        // libellé coupé (« … » dans un graphique, ou texte tronqué par le style) : le lecteur ne peut pas le lire en entier (3/11, vu par Romain)
        document.querySelectorAll(":is(.ek-page,.a4) .ek-box :is(text,span,a,b,th,td)").forEach(e => { if (e.children.length && e.tagName !== "text") return; const t = (e.textContent || "").trim(); const cs = e.tagName === "text" ? null : getComputedStyle(e);
          if (/…$/.test(t) || (cs && cs.textOverflow === "ellipsis" && e.scrollWidth > e.clientWidth + 1)) P.push(["libellé coupé", nomEtape(e), t.slice(0, 40)]); });
        document.querySelectorAll(".ek-hc").forEach(h => { const i = h.querySelector("i"); if (!i) return; const rs = [...h.getClientRects()], ri = i.getBoundingClientRect(); if (!rs.some(r => ri.top >= r.top - 6 && ri.bottom <= r.bottom + 6)) P.push(["icône « ? » décalée", nomEtape(h), h.textContent]); });
        const vus = new Set(); return P.filter(x => { const k = x.join("|"); if (vus.has(k)) return false; vus.add(k); return true; });
      });
      vues++;
      r.forEach(x => out.push([nomT, id, ...x]));
    }
    await b.close();
  }
  const par = new Map(); out.forEach(([t, id, type, ou, quoi]) => { const k = `${type} · ${ou} · ${t}`; if (!par.has(k)) par.set(k, []); par.get(k).push(`${id} : ${quoi}`); });
  const txt = [...par].sort((a, b) => b[1].length - a[1].length).map(([k, L]) => `${L.length} × ${k}\n   ${L.slice(0, 6).join("\n   ")}`).join("\n");
  fs.writeFileSync("/tmp/relecture-visuel.txt", txt + "\n");
  console.log(`${vues} pages vues (${ids.length} fiches × ${tailles.length} tailles), ${out.length} problème(s) en ${par.size} type(s). Rapport : /tmp/relecture-visuel.txt`);
  process.exit(out.length ? 1 : 0);
})();
