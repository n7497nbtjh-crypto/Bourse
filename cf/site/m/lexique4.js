/* ---------- Lexique v4 (3/11/2026), même direction que les autres pages v4 ----------
   /lexique. En-tête jaune : « Dix mots pour lire une entreprise. », une recherche dans toutes les notions, les dix
   essentielles en pastilles. Puis les dix essentielles en cartes (ce que c'est en grand, le calcul, le repère « bon ou
   moins bon », des entreprises réelles avec leur logo ; exemple, à lire avec et limite repliés), et toutes les autres
   notions par famille en cartes repliées. Contenus inchangés (TERMS, PTERMS, BASES, RULES, WITH, ESSENTIEL d'app.js).
   Exemples réels : comptes cohérents (f4Valide) et valeurs vraisemblables seulement (plus de « marge de 50 926 % »).
   Les ancres /lexique#marge… ouvrent la bonne carte. Remplace pageLexique. */
const LX4_BORNES = { g1: [-0.8, 3], marge: [-0.5, 0.7], nm: [-0.5, 0.6], roe: [-1, 1.5], lev: [0, 15], gear: [-1, 5], conv: [-3, 3], payout: [0, 1.5] };
function lx4Exemples(term) {
  const k = EXM[term]; if (!k || !R) return "";
  const [lo, hi] = LX4_BORNES[k] || [-Infinity, Infinity];
  const list = R.companies.filter(c => (typeof f4Valide !== "function" || f4Valide(c)) && !(isBank(c) && ["marge", "lev", "gear", "conv"].includes(k)))
    .map(c => [c, ratios(c)[k]]).filter(([, v]) => okn(v) && v >= lo && v <= hi).sort((a, b) => b[1] - a[1]);
  if (list.length < 5) return "";
  const li = ([c, v], cl) => `<a class="lx4-ex" href="/entreprise/${c.id}"><em>${cl}</em>${typeof mcLogo === "function" ? mcLogo(c) : ""}<span><b>${esc(c.name)}</b><small>${esc(EXFMT[k](v))}</small></span></a>`;
  const mid = list[Math.floor(list.length / 2)];
  return `<div class="lx4-exs"><small>Parmi ${F0.format(list.length)} entreprises suivies</small>${li(list[0], "Le plus haut")}${li(mid, "Au milieu")}${li(list.at(-1), "Le plus bas")}</div>`;
}
function lx4Carte(id, t, n) {
  const repere = RULES[id] || t.read;
  const plus = [t.ex ? `<p><b>Exemple.</b> ${esc(t.ex)}</p>` : "", WITH[id] ? `<p><b>À lire avec.</b> ${WITH[id].map(w => `<a class="lnk" href="#${w}">${esc((ALL[w] || {}).name || w)}</a>`).join(", ")}</p>` : "", t.limit ? `<p><b>Limite.</b> ${esc(t.limit)}</p>` : ""].join("");
  return `<article class="lx4-c" id="${id}" data-lx="${esc(norm((t.name || "") + " " + (t.what || "") + " " + id))}">
    <div class="lx4-h">${n ? `<span class="ir4-n">${n}</span>` : ""}<h3>${esc(t.name)}</h3></div>
    <p class="lx4-w">${esc(t.what)}</p>
    ${t.calc ? `<p class="lx4-calc"><span>Calcul</span>${esc(t.calc)}</p>` : ""}
    ${repere ? `<p class="lx4-rep"><span>${RULES[id] ? "Bon ou moins bon ?" : "Comment le lire"}</span>${esc(repere)}</p>` : ""}
    ${lx4Exemples(id)}
    ${plus ? `<details class="lx4-plus"><summary>Exemple, à lire avec, limite</summary>${plus}</details>` : ""}</article>`;
}
function pageLexique4() {
  setTitle("Lexique"); setNav("lex");
  const fr = typeof frSeul !== "function" || frSeul(), ESS = fr ? ESSENTIEL : ESSENTIEL.filter(k => k !== "pea").flatMap(k => k === "payout" ? ["rdt", k] : [k]); // hors de France : le PEA laisse sa place au rendement
  const rest = [["b", "Les bases", BASES], ["p", "Lire une entreprise", TERMS], ["b", "Portefeuille et simulations", PTERMS]]
    .map(([cl, g, o]) => [cl, g, Object.entries(o).filter(([k]) => !ESS.includes(k) && (fr || k !== "pea"))]).filter(([, , l]) => l.length);
  const tot = ESS.length + rest.reduce((a, [, , l]) => a + l.length, 0);
  app.innerHTML = `<div class="ek ek-page lx4">
    <section class="ek-hero"><span class="mc-stk">Lexique</span><h1 class="ag4-t">Dix mots pour lire une entreprise.</h1>
      <p class="mc-sub">Pour chacun : ce que c'est, comment on le calcule, à partir de quand c'est bon ou moins bon, et des entreprises réelles en exemple. ${F0.format(tot)} notions en tout.</p>
      <form class="vf-f lx4-f" role="search" onsubmit="return false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
        <input id="lx4q" class="el-in" type="search" autocomplete="off" placeholder="Chercher un mot : PER, dividende, ETF…" aria-label="Chercher une notion"></form>
      <div class="lx4-pills">${ESS.map((k, i) => `<a href="#${k}"><i>${i + 1}</i>${esc(ALL[k].name)}</a>`).join("")}</div>
      <a class="ou4-deb lx4-guide fr-seul" href="/pea-cto"><b>Avant d'acheter une action : dans quel compte ?</b><span>PEA, compte-titres, assurance-vie : ce qu'on peut y mettre et l'impôt sur les gains.</span><em>Lire le guide →</em></a></section>
    <section class="ek-sec" id="lx4-ess"><span class="ek-stk2 b">Les dix essentielles</span><h2>Dans l'ordre conseillé.</h2>
      <div class="lx4-g">${ESS.map((k, i) => lx4Carte(k, ALL[k], i + 1)).join("")}</div></section>
    ${rest.map(([cl, g, l]) => `<section class="ek-sec lx4-grp"><span class="ek-stk2 ${cl}">${esc(g)}</span><h2>${F0.format(l.length)} notions.</h2><div class="lx4-g lx4-g2">${l.map(([k, t]) => lx4Carte(k, t)).join("")}</div></section>`).join("")}
    <p class="ek-note" id="lx4-rien" hidden>Aucune notion ne correspond. Essayez un autre mot, ou posez la question à l'IA du site.</p></div>`;
  const q = $("#lx4q");
  q.oninput = () => { const t = norm(q.value.trim()); let n = 0;
    $$(".lx4-c").forEach(c => { const ok = !t || c.dataset.lx.includes(t); c.hidden = !ok; if (ok) n++; });
    $$(".ek-sec", app).forEach(s => { if (s.querySelector(".lx4-c")) s.hidden = !s.querySelector(".lx4-c:not([hidden])"); });
    $("#lx4-rien").hidden = n > 0; };
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => t.scrollIntoView({ block: "start" }), 30); }
}
window.pageLexique = pageLexique4;
