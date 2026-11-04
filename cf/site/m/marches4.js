/* ---------- Marchés v4 (3/11/2026) : maquette validée docs/maquettes/marches-v1.html ----------
   En-tête jaune (la journée en une phrase calculée sur les indices, pastilles des indices avec drapeau, quatre portes),
   cartes des grands indices (variation du jour, place entre plus bas et plus haut sur un an, 1 et 5 ans), variation médiane
   du jour par secteur, plus fortes hausses et baisses par région, prochaines dates de l'agenda. Remplace window.pageMarches. */
const MC_FL = { cac40: "fr", stoxx50: "eu", dax: "de", sp500: "us", nasdaq100: "us", ftse100: "gb", nikkei: "jp" };
const MC_PAYS = { FR: "France", EU: "Zone euro", DE: "Allemagne", US: "États-Unis", GB: "Royaume-Uni", JP: "Japon" };
const MC_REG = [["all", "Monde"], ["FR", "France"], ["EU", "Europe"], ["US", "États-Unis"], ["MONDE", "Reste du monde"]];
const mcPc = (v, d = 1) => v == null || !isFinite(v) ? "–" : (v > 0 ? "+" : v < 0 ? "−" : "") + ekFr(Math.abs(v), d) + " %";
const mcDrap = k => MC_FL[k] ? `<img class="mc-fl" src="/drapeaux/${MC_FL[k]}.png" alt="" width="26" height="18">` : "";
function mcLogo(c) {
  const src = typeof f4LogoSrc === "function" ? f4LogoSrc(c) : null, ini = String(c.name || "").replace(/[^A-Za-zÀ-ÿ0-9 ]/g, " ").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return src ? `<span class="mc-lg mc-lgi"><img src="${src}" alt="" loading="lazy" onerror="this.parentNode.className='mc-lg';this.parentNode.textContent='${esc(ini).replace(/'/g, "")}'"></span>` : `<span class="mc-lg" aria-hidden="true">${esc(ini)}</span>`;
}
// Les entreprises de plus de 2 Md€ en Bourse avec une variation du jour (même filtre que les mouvements du jour)
function mcGrandes() { return R.companies.map(c => ({ c, p: pxOf(c), v: valo(c) })).filter(x => x.p && x.p.chg != null && isFinite(x.p.chg) && x.v && x.v.capE > 2e9); }

function mcIndices() { return INDEX_INFO.map(([k, n, fl, quoi]) => ({ k, n, fl, quoi, p: PX["i:" + k] })).filter(x => x.p && x.p.chg != null); }
function mcCarteIdx(x) {
  const p = x.p, pos = p.h52 > p.l52 && p.l52 > 0 ? Math.max(0, Math.min(100, (p.p - p.l52) / (p.h52 - p.l52) * 100)) : null, a1 = p.p1y ? (p.p / p.p1y - 1) * 100 : null, a5 = p.p5y ? (p.p / p.p5y - 1) * 100 : null;
  return `<div class="mc-i"><div class="mc-ih">${mcDrap(x.k)}<b>${esc(x.n)}</b><span>${esc(MC_PAYS[x.fl] || "")}</span></div>
    <strong class="${p.chg > 0 ? "g" : p.chg < 0 ? "r" : ""}">${mcPc(p.chg, 2)}</strong><small>${F0.format(p.p)} points · ${esc(typeof jourSeance === "function" ? jourSeance() : "aujourd'hui")}</small>
    ${pos != null ? `<div class="mc-rg" title="Entre le plus bas (${F0.format(p.l52)}) et le plus haut (${F0.format(p.h52)}) des douze derniers mois"><i style="left:${pos}%"></i></div><div class="mc-rgl"><span>plus bas 1 an</span><span>plus haut</span></div>` : ""}
    <dl>${a1 != null ? `<dt>Sur 1 an</dt><dd class="${a1 >= 0 ? "g" : "r"}">${mcPc(a1, 0)}</dd>` : ""}${a5 != null ? `<dt>Sur 5 ans</dt><dd class="${a5 >= 0 ? "g" : "r"}">${mcPc(a5, 0)}</dd>` : ""}</dl><p>${esc(x.quoi)}</p></div>`;
}
function mcSecteurs(G) {
  const S = Object.entries(R.sectors || {}).map(([k, n]) => { const l = G.filter(x => x.c.sector === k).map(x => x.p.chg); return l.length >= 5 ? { n, m: f4Med(l), nb: l.length, h: l.filter(v => v > 0).length } : null; }).filter(Boolean).sort((a, b) => b.m - a.m);
  if (!S.length) return "";
  const mx = Math.max(...S.map(s => Math.abs(s.m)), 0.5);
  return `<div class="mc-ss">${S.map(s => `<div class="mc-s"><span class="n">${esc(s.n)}</span><span class="z"><i class="${s.m >= 0 ? "g" : "r"}" style="${s.m >= 0 ? "left:50%" : "right:50%"};width:${Math.abs(s.m) / mx * 50}%"></i></span><b class="${s.m > 0 ? "g" : s.m < 0 ? "r" : ""}">${mcPc(s.m, 2)}</b><small>${s.h} sur ${s.nb} en hausse</small></div>`).join("")}</div>`;
}
function mcMouvements(region) {
  const { up, dn, n } = moversData(region, 20); // 4/11 (Romain) : 5 visibles, les suivantes dans un pli « Voir plus »
  if (!n) return `<p class="ek-note">Les cours ne sont pas disponibles pour le moment.</p>`;
  const l = x => `<a class="mc-m" href="/entreprise/${esc(x.c.id)}">${mcLogo(x.c)}<span><b>${esc(x.c.name)}</b><small>${esc(secName(x.c))}</small></span><strong class="${x.p.chg > 0 ? "g" : "r"}">${mcPc(x.p.chg, 1)}</strong></a>`;
  const col = (L, vide, mot) => !L.length ? `<p class="ek-note">${vide}</p>` : L.slice(0, 5).map(l).join("") + (L.length > 5 ? `<details class="mc-plus"><summary>Voir ${L.length - 5} autres ${mot}</summary><div class="mc-col">${L.slice(5).map(l).join("")}</div></details>` : "");
  return `<div class="mc-mvs"><div><h3>▲ En hausse</h3><div class="mc-col">${col(up, "Aucune hausse.", "hausses")}</div></div><div><h3>▼ En baisse</h3><div class="mc-col">${col(dn, "Aucune baisse.", "baisses")}</div></div></div>`;
}
function mcAgenda() {
  const ev = (AG.events || []).filter(e => e.date >= TODAY && RBY[e.id]).sort((a, b) => a.date.localeCompare(b.date) || ((valo(RBY[b.id]) || {}).capE || 0) - ((valo(RBY[a.id]) || {}).capE || 0)).slice(0, 30);
  if (!ev.length) return "";
  const j = d => new Date(d + "T12:00:00");
  return `<section class="ek-sec"><span class="ek-stk2">À venir</span><h2>Les prochaines dates à suivre.</h2><div class="mc-es">${ev.map((e, i) => { const c = RBY[e.id];
    return `${i === 6 ? `</div><details class="mc-plus"><summary>Voir ${ev.length - 6} autres dates</summary><div class="mc-es">` : ""}<a class="mc-e" href="/entreprise/${esc(c.id)}"><span class="d"><b>${j(e.date).getDate()}</b><small>${esc(j(e.date).toLocaleDateString("fr-FR", { month: "short" }))}</small></span>${mcLogo(c)}<span><b>${esc(c.name)}</b><small>${esc(e.label || "")}</small></span><em class="${e.type === "Dividende" ? "dv" : ""}">${esc(e.type || "Date")}</em></a>`; }).join("")}</div>${ev.length > 6 ? "</details>" : ""}
    <p class="mc-note"><a href="/agenda">Tout l'agenda →</a></p></section>`;
}

async function pageMarches4() {
  setTitle("Les marchés aujourd'hui"); setNav("mkt");
  app.innerHTML = `<div class="ek ek-page"><div class="empty">Chargement des marchés…</div></div>`;
  await Promise.all([PXP, typeof loadAna === "function" ? loadAna() : null]);
  if (location.pathname !== "/marches") return;
  const ix = mcIndices(), up = ix.filter(x => x.p.chg > 0).length, G = mcGrandes();
  const titre = !ix.length ? "Les marchés." : up === 0 ? "Une journée de baisse." : up === ix.length ? "Une journée de hausse." : up > ix.length / 2 ? "Une journée plutôt en hausse." : up < ix.length / 2 ? "Une journée plutôt en baisse." : "Une journée partagée.";
  const sous = !ix.length ? "Les cours ne sont pas disponibles pour le moment." : `${up === 0 ? `Les ${ix.length} grands indices baissent.` : up === ix.length ? `Les ${ix.length} grands indices montent.` : `${up} grand${up > 1 ? "s" : ""} indice${up > 1 ? "s" : ""} sur ${ix.length} en hausse.`} Cours différés${typeof PXUP === "string" && PXUP !== "none" ? ", relevés le " + esc(new Date(PXUP).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })) : ""}.`;
  const portes = [["/entreprises", "Entreprises", `${F0.format(R.companies.length)} fiches`, "Chacune face à la médiane de son secteur.", "M4 20V9l8-5 8 5v11M9 20v-6h6v6"],
    ["/etf", "ETF", `${F0.format(ETF.list.length)} fonds`, (typeof frSeul !== "function" || frSeul() ? "Frais, PEA, ce qu'ils contiennent vraiment." : "Frais, performance, ce qu'ils contiennent vraiment."), "M4 18l5-6 4 3 7-9M4 4v16h16"],
    ["/actualites", "Actualité", "chaque jour", "Annonces officielles lues et chiffrées.", "M5 4h14v16H5zM8 9h8M8 13h8M8 17h5"],
    ["/agenda", "Agenda", "jour par jour", "Résultats et dividendes à venir.", "M4 5h16v15H4zM4 9h16M8 3v4M16 3v4"],
    ["/classements", "Classements", "par critère", "Les mieux placées sur la marge, la dette, le prix.", "M4 20h16M7 20V10M12 20V4M17 20v-8"]];
  const secteurs = mcSecteurs(G);
  app.innerHTML = `<div class="ek ek-page mc-page">
    <section class="ek-hero mc-h"><span class="mc-stk">Marchés</span><h1>${titre}</h1><p class="mc-sub">${sous}</p>
      <div class="mc-chips">${ix.map(x => `<span class="${x.p.chg > 0 ? "g" : x.p.chg < 0 ? "r" : ""}">${mcDrap(x.k)}${esc(x.n)} ${mcPc(x.p.chg, 2)}</span>`).join("")}</div>
      <div class="mc-portes">${portes.map(p => `<a class="mc-p" href="${p[0]}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${p[4]}"/></svg><b>${p[1]}</b><em>${p[2]}</em><span>${p[3]}</span></a>`).join("")}</div></section>
    ${ix.length ? `<section class="ek-sec"><span class="ek-stk2">Les grands indices</span><h2>Aujourd'hui, et où ils en sont sur un an.</h2><div class="mc-is">${ix.map(mcCarteIdx).join("")}</div>
      <p class="mc-note">Le point jaune situe le niveau du jour entre le plus bas et le plus haut des douze derniers mois. Un indice résume la tendance d'un marché : il monte quand ses plus grosses entreprises montent.</p></section>` : ""}
    ${secteurs ? `<section class="ek-sec"><span class="ek-stk2 b">Par secteur</span><h2>Quels métiers ont monté, lesquels ont baissé.</h2>${secteurs}
      <p class="mc-note">Variation médiane de la dernière séance des ${F0.format(G.length)} entreprises suivies valant plus de 2 milliards d'euros en Bourse, secteur par secteur. Selon la Bourse, la dernière séance n'est pas toujours celle d'aujourd'hui.</p></section>` : ""}
    <section class="ek-sec"><span class="ek-stk2 p">Ce qui a bougé</span><h2>Les plus fortes hausses et baisses du jour.</h2>
      <div class="mc-reg" id="mcreg">${MC_REG.map(([k, l], i) => `<button type="button" data-r="${k}" class="${i ? "" : "on"}">${l}</button>`).join("")}</div>
      <div id="mcmv">${mcMouvements("all")}</div>
      <p class="mc-note">Pour une grande entreprise, plus de 5 % en une journée suit presque toujours une annonce : ouvrez la fiche pour voir laquelle. Un mouvement d'une journée ne dit rien de la solidité de l'entreprise.</p></section>
    ${mcAgenda()}</div>`;
  $("#mcreg").onclick = e => { const b = e.target.closest("button"); if (!b) return; $$("#mcreg button").forEach(x => x.classList.toggle("on", x === b)); $("#mcmv").innerHTML = mcMouvements(b.dataset.r); };
}

window.pageMarches = pageMarches4;
