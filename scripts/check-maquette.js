// Usage : node scripts/check-maquette.js (vérifie docs/maquettes/comparer-v1.html ; changer le nom du fichier pour une autre maquette)
// Contrôle de la maquette : code affiché, débordement de l'écran, textes qui se chevauchent dans les tableaux
const { chromium } = require("playwright");
(async () => { const b = await chromium.launch();
  for (const w of [1280, 390]) { const p = await b.newPage({ viewport: { width: w, height: 900 } }); const errs = []; p.on("pageerror", e => errs.push(e.message));
    await p.goto("file:///home/claude/bourse/docs/maquettes/comparer-v1.html"); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => { const P = [], W = document.documentElement.clientWidth, txt = document.body.innerText;
      if (/\$\{|=>|undefined|NaN/.test(txt)) P.push("code ou valeur technique affiché : " + (txt.match(/.{0,30}(\$\{|=>|undefined|NaN).{0,20}/) || [""])[0]);
      if (document.documentElement.scrollWidth > W) P.push("page plus large que l'écran");
      document.querySelectorAll("td, th, em, b, small, span").forEach(e => { if (e.children.length > 2) return; if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow === "visible" && getComputedStyle(e).display !== "inline") P.push("déborde de sa case : " + e.textContent.trim().slice(0, 30)); });
      document.querySelectorAll("table").forEach(t => { t.querySelectorAll("tr").forEach(tr => { const c = [...tr.children].map(x => x.getBoundingClientRect()); for (let i = 1; i < c.length; i++) if (c[i].left < c[i - 1].right - 1) P.push("cases superposées : " + tr.textContent.trim().slice(0, 30)); }); });
      return P.slice(0, 12); });
    console.log(w, errs, r); }
  process.exit(0); })();
