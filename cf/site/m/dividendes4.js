/* ---------- Dividendes v4 (3/11/2026), même direction que Marchés, Agenda et Classements v4 ----------
   En-tête jaune (le prochain détachement en titre, trois grands chiffres), « Combien je toucherais ? » (entreprise, montant,
   PEA ou compte-titres), filtres en un clic, calendrier en cartes par mois (export .ics), plus hauts rendements avec leur
   garde-fou (couvert par le bénéfice ?), dividendes relevés plusieurs années de suite, le détachement en trois dates.
   Calculs inchangés (m/outils.js : outDivEvents, outDivKind, OUT_DK, outDivAmt, outDivTop, outCouv, outDivSim, outStats).
   Remplace window.pageDividendes. */
const DV4_REG = [["", "Toutes"], ["fr", "France"], ["eu", "Europe"], ["us", "États-Unis"], ["monde", "Reste du monde"]];
const DV4_COUL = { det: "#1E8A52", pay: "#1E6FD9", rec: "#8A6D1E", autre: "#5F5B55" };
// Veille ouvrée (samedi et dimanche sautés) : pour toucher le dividende, il faut détenir l'action à la clôture de ce jour
function dv4Veille(d) { const t = new Date(d + "T12:00:00Z"); do { t.setUTCDate(t.getUTCDate() - 1); } while (t.getUTCDay() === 0 || t.getUTCDay() === 6); return t.toISOString().slice(0, 10); }
// Un dividende = la date pour acheter (détachement, ou enregistrement aux États-Unis) et la date de versement qui suit
function dv4Groupes(L) {
  const par = {}; L.forEach(e => (par[e.id] = par[e.id] || []).push(e));
  const G = [];
  for (const id in par) {
    const E = par[id].sort((a, b) => a.date.localeCompare(b.date)), pris = new Set();
    E.forEach((e, i) => { if (pris.has(i) || outDivKind(e) === "pay") return; pris.add(i);
      const j = E.findIndex((x, k) => k > i && !pris.has(k) && outDivKind(x) === "pay" && (Date.parse(x.date) - Date.parse(e.date)) / 864e5 <= 75);
      if (j >= 0) pris.add(j); G.push({ id, achat: e, verse: j >= 0 ? E[j] : null }); });
    E.forEach((e, i) => { if (!pris.has(i)) G.push({ id, achat: null, verse: e }); });
  }
  return G.map(g => ({ ...g, cle: (g.achat || g.verse).date })).sort((a, b) => a.cle.localeCompare(b.cle));
}
function dv4Quoi(e) { return String(e.label || "").replace(/^(Détachement|Paiement|Date d'enregistrement|Dernier jour pour acheter avec droit à|Mise en paiement|Versement)\s*(du|de la|de l'|des|à l')?\s*/i, "").replace(/\s*\([\d\s,.]+\s*(€|\$|£|CHF|kr|NOK)\)\s*/, " ").replace(/^./, x => x.toUpperCase()).trim(); }
function dv4Carte(g) {
  const c = RBY[g.id], v = valo(c), cv = outCouv(c), e0 = g.achat || g.verse, amt = outDivAmt(g.achat || {}) || outDivAmt(g.verse || {});
  const jour = d => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const dern = g.achat ? (/dernier jour/i.test(g.achat.label || "") ? g.achat.date : dv4Veille(g.achat.date)) : null;
  return `<a class="dv5-c" href="/entreprise/${esc(c.id)}"><div class="dv5-h">${mcLogo(c)}<span><b>${esc(c.name)}</b><small>${esc(dv4Quoi(e0) || "Dividende")}</small></span>${amt ? `<strong>${esc(amt)}<small>par action</small></strong>` : ""}</div>
    <div class="dv5-t">${dern ? `<div class="a"><i></i><span><small>Acheter au plus tard le</small><b>${esc(jour(dern))}</b></span></div>` : ""}${g.verse ? `<div class="p"><i></i><span><small>Versé le</small><b>${esc(jour(g.verse.date))}</b></span></div>` : ""}</div>
    <div class="dv5-f">${v && v.yld ? `<span>Rendement <b>${esc(pct(v.yld, 1, false))}</b></span>` : ""}${cv ? `<span class="${cv.k === "oui" ? "g" : cv.k === "non" ? "r" : ""}" title="${esc(cv.d)}">${esc(cv.t)}</span>` : ""}${typeof peaOk === "function" && peaOk(c) && e4Fr() ? `<span class="g">PEA ✓</span>` : ""}</div></a>`;
}
function dv4Cal(L, tout) {
  const G = dv4Groupes(L);
  if (!G.length) return `<p class="ek-note">Aucun dividende annoncé avec ces filtres pour l'instant.</p>`;
  const vis = tout ? G : G.slice(0, 12), par = {};
  vis.forEach(g => (par[g.cle.slice(0, 7)] = par[g.cle.slice(0, 7)] || []).push(g));
  return Object.entries(par).map(([mk, l]) => `<h3 class="ax4-day">${esc(MOISL[+mk.slice(5) - 1].replace(/^./, x => x.toUpperCase()))} ${mk.slice(0, 4)} <small>${l.length} dividende${l.length > 1 ? "s" : ""}</small></h3><div class="dv5-g">${l.map(dv4Carte).join("")}</div>`).join("")
    + (G.length > vis.length ? `<button type="button" class="el-more" data-tout>Afficher les ${F0.format(G.length - vis.length)} autres dividendes</button>` : "");
}
function dv4Rang(c, i, grand, petit, sous, ton) {
  return `<a class="cl4-r dv4-r" href="/entreprise/${esc(c.id)}"><span class="cl4-rk${i < 3 ? " top" : ""}">${i + 1}</span>${mcLogo(c)}<span class="cl4-n"><b>${esc(c.name)}</b><small>${esc(secName(c))}${typeof peaOk === "function" && peaOk(c) && e4Fr() ? " · PEA ✓" : ""}</small></span><span class="cl4-v"><strong class="${ton || ""}">${esc(grand)}</strong><small>${esc(petit)}</small><em>${esc(sous || "")}</em></span></a>`;
}
async function pageDividendes4() {
  setTitle("Dividendes : calendrier, rendements et simulateur"); setNav("news");
  if (!R) return;
  app.innerHTML = `<div class="ek ek-page"><div class="empty">Chargement…</div></div>`;
  await Promise.all([PXP, outHist()]);
  if (location.pathname !== "/dividendes") return;
  const favIds = new Set(favs().filter(k => k.startsWith("c:")).map(k => k.slice(2)));
  const f = { s: "", r: "", pea: "", fav: false, favIds, cv: true, all: false }, S = outStats(), fr = e4Fr();
  const tous = outDivEvents({ ...f }), det = tous.filter(e => outDivKind(e) === "det"), nx = det[0], n4 = Object.values(S).filter(s => s.divUp >= 4).length;
  const defC = RBY["totalenergies"] && valo(RBY["totalenergies"]) ? RBY["totalenergies"] : outDivTop(f)[0] && outDivTop(f)[0].c;
  const sim = { c: defC, m: 5000, a: fr ? "pea" : "cto" };
  const jour = d => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  app.innerHTML = `<div class="ek ek-page dv4-page">
    <section class="ek-hero"><span class="mc-stk">Dividendes</span><h1 class="ag4-t">Qui verse un dividende, et quand.</h1>
      <p class="mc-sub">${F0.format(dv4Groupes(tous).length)} dividendes annoncés par les entreprises suivies.${nx ? ` Le prochain détachement : ${esc(RBY[nx.id].name)}, le ${esc(jour(nx.date))}.` : ""}</p>
      <div class="dv5-steps"><div><i>1</i><b>Acheter avant</b><span>Détenir l'action à la clôture, la veille du détachement.</span></div><div><i>2</i><b>Le détachement</b><span>Le cours baisse d'environ le montant du dividende.</span></div><div><i>3</i><b>Le versement</b><span>Quelques jours ou semaines plus tard, l'argent arrive.</span></div></div></section>
    <section class="ek-sec" id="dv4cal"><span class="ek-stk2 b">Calendrier</span><h2>Les prochains dividendes.</h2>
      <div class="el-f ax4-ch" id="dv4f"><span>Région :</span>${DV4_REG.map(([k, l]) => `<button type="button" data-r="${k}">${l}</button>`).join("")}${fr ? `<button type="button" data-pea>Éligibles au PEA</button>` : ""}<button type="button" data-fav>Mes favoris</button>
        <select id="dv4s" aria-label="Secteur">${outSecOpts().map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join("")}</select><button type="button" class="dv4-ics" id="dv4ics">Ajouter à mon agenda (.ics)</button></div>
      <div id="dv4c"></div>
      <p class="mc-note">Chaque date vient du calendrier publié par l'entreprise ou d'un communiqué. « Acheter au plus tard » : la veille ouvrée du détachement (aux États-Unis, de la date d'enregistrement) ; votre courtier peut avoir ses propres délais. Le fichier .ics s'ouvre dans Google Agenda, Apple Calendrier ou Outlook : rien n'est envoyé.</p></section>
    <section class="ek-sec" id="dv4sim"><span class="ek-stk2">Simulateur</span><h2>Combien je toucherais ?</h2>
      <div class="dv4-sim"><div class="dv4-f"><label class="dv4-q"><span>Entreprise</span><input id="dv4q" class="el-in" type="search" autocomplete="off" placeholder="Nom de l'entreprise" value="${sim.c ? esc(sim.c.name) : ""}"><div class="dv4-sug" id="dv4sug" hidden></div></label>
        <label><span>Montant investi</span><input id="dv4m" type="number" min="100" step="100" value="${sim.m}" inputmode="numeric"></label>
        <div><span>Compte</span><div class="ax4-vue dv4-acct" id="dv4a">${fr ? `<button type="button" data-a="pea">PEA</button>` : ""}<button type="button" data-a="cto">Compte-titres</button></div></div></div>
        <div id="dv4r"></div></div></section>
    <div class="dv4-two"><section class="ek-sec"><span class="ek-stk2 p">Rendement</span><h2>Les plus hauts rendements.</h2>
        <div class="el-f ax4-ch"><button type="button" data-cv class="on">Dividende couvert seulement</button></div><div id="dv4top"></div>
        <p class="mc-note">Rendement = dernier dividende annuel ÷ cours (différé). « Couvert » : le dividende versé est inférieur à 90 % du bénéfice du dernier exercice. Un rendement très élevé vient souvent d'un cours qui a beaucoup baissé.</p></section>
      <section class="ek-sec"><span class="ek-stk2 b">Régularité</span><h2>Dividendes relevés.</h2><div id="dv4up"></div>
        <p class="mc-note">Années de suite où le dividende par action a augmenté (rapports annuels, cinq exercices au plus). <a href="/classements?c=dividende">Le classement complet →</a></p></section></div>
    <section class="ek-sec"><p class="mc-note">Le dividende n'est pas un cadeau : la valeur sort de l'entreprise pour arriver chez l'actionnaire (une action à 50 € qui verse 2 € ouvre vers 48 €). Ce qui compte, c'est qu'elle puisse le payer avec ses bénéfices.${fr ? ` Dans un PEA, il reste sans impôt ; sur un compte-titres, ${esc(pct(RATES.pfu, 1, false))} sont prélevés.` : ""} Ces listes trient des faits ; ce n'est pas une recommandation d'achat.</p></section></div>`;
  const drawSim = () => { $$("#dv4a button").forEach(b => b.classList.toggle("on", b.dataset.a === sim.a)); $("#dv4r").innerHTML = sim.c ? outDivSim(sim.c, Math.max(0, +sim.m || 0), sim.a) : `<p class="ek-note">Choisissez une entreprise.</p>`; };
  const draw = () => {
    $$("#dv4f [data-r]").forEach(b => b.classList.toggle("on", b.dataset.r === f.r)); const bp = $("#dv4f [data-pea]"); if (bp) bp.classList.toggle("on", !!f.pea); $("#dv4f [data-fav]").classList.toggle("on", f.fav); $(".dv4-page [data-cv]").classList.toggle("on", f.cv);
    $("#dv4c").innerHTML = dv4Cal(outDivEvents(f), f.all);
    const top = outDivTop(f).slice(0, 10);
    $("#dv4top").innerHTML = top.length ? `<div class="cl4-list">${top.map((x, i) => { const cv = outCouv(x.c); return dv4Rang(x.c, i, pct(x.v.yld, 1, false), "de rendement", cv ? `${cv.t} · ${cv.d}` : "", ""); }).join("")}</div>` : `<p class="ek-note">Aucune entreprise ne correspond avec ces filtres.</p>`;
    const up = R.companies.filter(c => !c.missing && !outVieux(c) && S[c.id] && S[c.id].divUp >= 2 && (!f.s || c.sector === f.s) && outRegOk(c, f.r) && (!f.pea || peaOk(c)) && (!f.fav || favIds.has(c.id)))
      .map(c => ({ c, y: (valo(c) || {}).yld || 0 })).filter(x => x.y >= 0.01).sort((a, b) => S[b.c.id].divUp - S[a.c.id].divUp || b.y - a.y).slice(0, 10);
    $("#dv4up").innerHTML = up.length ? `<div class="cl4-list">${up.map((x, i) => { const st = S[x.c.id]; return dv4Rang(x.c, i, `${st.divUp} ans`, "de hausse", [st.dCagr != null ? `${sgn(st.dCagr, 1)} par an` : "", x.y ? `rendement ${pct(x.y, 1, false)}` : ""].filter(Boolean).join(" · "), ""); }).join("")}</div>` : `<p class="ek-note">Aucune entreprise ne correspond avec ces filtres.</p>`;
  };
  drawSim(); draw();
  const page = app.querySelector(".dv4-page");
  page.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.a) { sim.a = b.dataset.a; drawSim(); }
    else if (b.dataset.r !== undefined) { f.r = b.dataset.r; f.all = false; draw(); }
    else if (b.dataset.pea !== undefined) { f.pea = f.pea ? "" : "1"; draw(); }
    else if (b.dataset.fav !== undefined) { f.fav = !f.fav; draw(); }
    else if (b.dataset.cv !== undefined) { f.cv = !f.cv; draw(); }
    else if (b.dataset.tout !== undefined) { f.all = true; draw(); }
    else if (b.id === "dv4ics") { const L = outDivEvents(f); if (!L.length) return toast("Aucune date à exporter avec ces filtres."); const a = document.createElement("a"); a.href = URL.createObjectURL(icsFile(L, "Dividendes (ENKLAIR)")); a.download = "dividendes-enklair.ics"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
    else if (b.dataset.id) { sim.c = RBY[b.dataset.id]; $("#dv4q").value = sim.c.name; $("#dv4sug").hidden = true; drawSim(); }
  });
  $("#dv4s").onchange = e => { f.s = e.target.value; draw(); };
  $("#dv4m").oninput = e => { sim.m = e.target.value; drawSim(); };
  const q = $("#dv4q"), sg = $("#dv4sug"), pool = R.companies.filter(c => !c.missing && !outVieux(c) && c.divPaid > 0.5);
  q.oninput = () => { const t = norm(q.value.trim()); if (t.length < 2) { sg.hidden = true; return; }
    const l = pool.filter(c => norm(c.name).includes(t) || norm(c.ticker || "") === t).slice(0, 6);
    sg.innerHTML = l.length ? l.map(c => { const v = valo(c); return `<button type="button" data-id="${esc(c.id)}">${mcLogo(c)}<span>${esc(c.name)}</span><small>${v && v.yld ? esc(pct(v.yld, 1, false)) : ""}</small></button>`; }).join("") : `<p class="ek-note">Aucune entreprise versant un dividende ne correspond.</p>`; sg.hidden = false; };
  q.onfocus = () => q.select();
  document.addEventListener("click", function fermer(e) { const g = document.getElementById("dv4sug"); if (!g) { document.removeEventListener("click", fermer); return; } if (!e.target.closest(".dv4-q")) g.hidden = true; });
}

window.pageDividendes = pageDividendes4;
