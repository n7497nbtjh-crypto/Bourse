// Contrôle visuel de TOUTES les grandes pages du site (3/11/2026, après un bouton « Expliquer en clair » coupé et une loupe
// posée sous le texte de la recherche, vus par Romain alors que les contrôles des fiches ne regardaient pas ces pages).
// En ordinateur et en téléphone, sur chaque page, relève :
//  - un texte coupé ou qui dépasse de son bouton, de son lien ou de son champ (contenu plus haut ou plus large que la boîte) ;
//  - une icône posée sur le texte d'un champ de saisie, ou mal alignée avec lui ;
//  - un élément qui dépasse de l'écran (téléphone) ;
//  - deux boutons ou pastilles qui se chevauchent ;
//  - un texte technique affiché (undefined, NaN, ${…}).
// Usage : node scripts/relire-pages.js ; rapport dans /tmp/relecture-pages.txt ; code de sortie 1 s'il reste un problème.
const { ouvrir, aller } = require("./_site"), fs = require("fs");
const PAGES = process.argv.slice(2).length ? process.argv.slice(2) : ["/", "/entreprises", "/entreprise/lvmh", "/entreprise/bnp-paribas", "/comparer?ids=lvmh,hermes,kering", "/comparer", "/etf", "/etf/amundi-msci-world-pea", "/marches", "/actualites", "/actualites?vue=presse",
  "/agenda", "/classements", "/classements?c=dividende", "/dividendes", "/outils", "/outils/si-javais", "/outils/recouvrement", "/outils/verifier", "/simulateurs/epargne", "/simulateurs/frais", "/repartitions", "/idees-recues",
  "/apprendre", "/academie/placements/etf", "/lexique", "/pea-cto", "/portefeuille", "/espace", "/premium", "/methode", "/plan"];
(async () => {
  const { b, p } = await ouvrir(), out = [], errs = [];
  p.on("pageerror", e => errs.push(e.message));
  for (const [nom, W, H] of [["ordinateur", 1280, 900], ["téléphone", 390, 844]]) {
    await p.setViewportSize({ width: W, height: H });
    for (const u of PAGES) {
      try { await aller(p, u, 2500); } catch (e) { out.push([nom, u, "page non chargée", e.message]); continue; }
      const r = await p.evaluate(W => {
        const P = [], vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0.05; };
        const nm = e => (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/).slice(0, 2).join(".") : e.tagName.toLowerCase()) + " « " + (e.textContent || e.placeholder || "").trim().replace(/\s+/g, " ").slice(0, 35) + " »";
        const app = document.getElementById("app") || document.body;
        // 1. Texte coupé ou qui sort de sa boîte : boutons, liens-boutons, pastilles, champs
        app.querySelectorAll("button, a, input, select, label, span, b, em, small, strong").forEach(e => {
          if (!vis(e) || e.closest("svg, .tv, iframe, [data-tv], .tradingview-widget-container, .results, .msug")) return;
          const s = getComputedStyle(e); if (s.display === "inline" || !(e.textContent || "").trim() && e.tagName !== "INPUT") return;
          if (e.tagName === "INPUT" || e.tagName === "SELECT") return;
          if (e.querySelector("img, svg") || /(^|\s|-)(lg|logo|mono)(\s|-|$)/.test(e.className || "")) return; // logos : l'image dépasse du cadre arrondi exprès
          const kids = [...e.children].filter(vis);
          if (kids.some(k => /^(DIV|UL|OL|TABLE|SECTION|ARTICLE|P|H\d)$/.test(k.tagName))) return; // une boîte qui en contient d'autres : jugée par ses enfants
          const hautes = e.scrollHeight > e.clientHeight + 2 && e.clientHeight > 0, larges = e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0;
          const coupe = /hidden|clip/.test(s.overflowY + s.overflowX) || s.textOverflow === "ellipsis";
          if ((hautes || larges) && (coupe || /^(BUTTON|A)$/.test(e.tagName) && s.height !== "auto")) {
            if (larges && s.textOverflow === "ellipsis" && /^(SPAN|SMALL|B)$/.test(e.tagName)) return; // « … » voulu dans une liste étroite
            P.push(["texte coupé ou qui déborde de sa boîte", nm(e)]);
          }
        });
        // 1 bis. Bouton dessiné (fond ou cadre) dont le texte touche le bord : pas de marge intérieure
        app.querySelectorAll("button, a").forEach(e => { if (!vis(e) || (e.textContent || "").trim().length <= 2 || e.querySelector("img, svg")) return; const s = getComputedStyle(e);
          const dessine = parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== "none" || (s.backgroundColor !== "rgba(0, 0, 0, 0)" && s.backgroundColor !== "transparent");
          if (!dessine || s.display === "inline") return; const pv = parseFloat(s.paddingTop) + parseFloat(s.paddingBottom), ph = parseFloat(s.paddingLeft) + parseFloat(s.paddingRight);
          if (pv < 3 && ph < 10 && e.getBoundingClientRect().height < 30) P.push(["bouton dont le texte touche le bord", nm(e)]); });
        // 2. Champs de saisie : icône posée sur le texte, ou mal alignée
        app.querySelectorAll("input[type=search], input[type=text], input:not([type])").forEach(i => {
          if (!vis(i)) return;
          const ri = i.getBoundingClientRect(), si = getComputedStyle(i), x0 = ri.left + parseFloat(si.paddingLeft) + parseFloat(si.borderLeftWidth), x1 = ri.right - parseFloat(si.paddingRight);
          const box = i.parentElement; if (!box) return;
          [...box.querySelectorAll("svg, img, i, .ico")].filter(vis).forEach(c => { if (c.contains(i)) return; const rc = c.getBoundingClientRect();
            const sur = rc.right > x0 + 2 && rc.left < x1 - 2 && rc.bottom > ri.top + 4 && rc.top < ri.bottom - 4;
            const cy = (rc.top + rc.bottom) / 2, ciy = (ri.top + ri.bottom) / 2;
            if (sur) P.push(["icône posée sur le texte d'un champ", nm(i)]);
            else if (Math.abs(cy - ciy) > Math.max(8, ri.height / 2) && rc.left < ri.left) P.push(["icône mal alignée avec son champ", nm(i)]); });
          const ph = i.placeholder || i.value; if (ph && i.scrollWidth > i.clientWidth + 40) P.push(["texte du champ plus long que le champ", nm(i)]);
        });
        // 3. Débordement de l'écran
        app.querySelectorAll("*").forEach(e => { if (!vis(e) || e.closest(".scroll-x, .ek-tc .scroll-x, [class*=scroll], .tv, table")) return; const r = e.getBoundingClientRect(); if (r.right > W + 2 && getComputedStyle(e).position !== "fixed") P.push(["dépasse de l'écran", nm(e)]); });
        // 4. Boutons ou pastilles qui se chevauchent (frères dans une même rangée)
        const ctrl = [...app.querySelectorAll("button, a.ek-btn, .ek-chip, .el-f button, .mc-chips span, .ax4-t, .ag4-ch em")].filter(vis);
        for (let i = 0; i < ctrl.length; i++) for (let j = i + 1; j < Math.min(ctrl.length, i + 12); j++) { const a = ctrl[i].getBoundingClientRect(), c = ctrl[j].getBoundingClientRect();
          if (ctrl[i].contains(ctrl[j]) || ctrl[j].contains(ctrl[i])) continue;
          if (Math.min(a.right, c.right) - Math.max(a.left, c.left) > 4 && Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top) > 4) P.push(["boutons qui se chevauchent", nm(ctrl[i]) + " / " + nm(ctrl[j])]); }
        // 5. Texte technique
        const t = app.innerText.match(/.{0,25}(\$\{|=>|\bundefined\b|\bNaN\b|\[object).{0,15}/); if (t) P.push(["code ou valeur technique affiché", t[0]]);
        const vus = new Set(); return P.filter(x => { const k = x.join("|"); if (vus.has(k)) return false; vus.add(k); return true; }).slice(0, 12);
      }, W);
      r.forEach(x => out.push([nom, u, ...x]));
    }
  }
  await b.close();
  const par = {}; out.forEach(([n, u, t, d]) => (par[t + " · " + n] = par[t + " · " + n] || []).push(`${u} : ${d || ""}`));
  const txt = Object.entries(par).map(([k, l]) => `${l.length} × ${k}\n${l.slice(0, 25).map(x => "   " + x).join("\n")}`).join("\n") + (errs.length ? `\nErreurs JS :\n${[...new Set(errs)].slice(0, 10).map(e => "   " + e).join("\n")}` : "");
  fs.writeFileSync("/tmp/relecture-pages.txt", txt);
  console.log(`${PAGES.length * 2} pages vues, ${out.length} problème(s), ${errs.length} erreur(s) JS. Rapport : /tmp/relecture-pages.txt`);
  process.exit(out.length || errs.length ? 1 : 0);
})();
