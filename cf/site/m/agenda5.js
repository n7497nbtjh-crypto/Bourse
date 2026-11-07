/* ---------- Agenda v5 (7/11/2026, maquette docs/maquettes/agenda-v6.html validée par Romain) ----------
   1. En tête : combien d'entreprises publient dans les 7 prochains jours, et une recherche : une entreprise a-t-elle une date
      cette semaine ? Sinon sa prochaine date connue, sinon « aucune date connue ».
   2. Les prochaines dates de vos favoris et de votre portefeuille, avec logo.
   3. Un encadré coloré par secteur (et « Tout ») : le nombre d'entreprises qui ont une date ; un clic filtre la liste.
   4. Toutes les dates, jour par jour, dans l'ordre : logo, nom, événement, type (résultats, dividende, assemblée), annoncée ou à confirmer.
   5. Les résultats publiés ces sept derniers jours (ag4Publies, inchangé).
   Pas de sous-titres (Romain). Remplace window.pageAgenda (agenda4.js reste chargé pour ag4Publies et ag4Carte). */
const AG5_COUL = { finance: "#7FB4FF", conso: "#FFB27A", industrie: "#B9C2CC", telecom: "#C6A8FF", tech: "#7DE3C8", energie: "#FFD25C", services: "#9EE07A", sante: "#FF9AB5", immo: "#E8C9A0", materiaux: "#D9B38C" };
const AG5_TYPE = { "Résultats": "res", "Dividende": "div", "Assemblée": "ag" };
const AG5 = { sec: null, jours: 7 };
const ag5Lab = e => String(e.label || "").replace(/\s*\((date habituelle|habituellement)[^)]*\)/i, "").trim() || e.type || "Date";
const ag5Jour = d => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, x => x.toUpperCase());
const ag5Court = d => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: d.slice(0, 4) === TODAY.slice(0, 4) ? undefined : "numeric" });
const ag5Tags = e => `<span class="ag5-ty ${AG5_TYPE[e.type] || ""}">${esc(e.type || "Date")}</span><span class="ag5-st${e.estime ? " e" : ""}">${e.estime ? "À confirmer" : "Annoncée"}</span>`;
function ag5Prochaines() { const m = new Map(); for (const e of upcoming()) { const o = m.get(e.id); if (!o || (o.date === e.date && o.estime && !e.estime)) m.set(e.id, e); } return m; } // une date par entreprise : la plus proche (l'annoncée d'abord)
function pageAgenda5() {
  setTitle("Agenda financier"); setNav("news");
  const T0 = Date.parse(TODAY + "T00:00:00Z"), dans = e => (Date.parse(e.date + "T00:00:00Z") - T0) / 864e5;
  const NX = ag5Prochaines(), sem = [...NX.values()].filter(e => dans(e) < 7), conf = sem.filter(e => !e.estime).length;
  app.innerHTML = `<div class="ek ek-page ag5">
    <section class="ek-hero ag5-hero"><span class="mc-stk">Agenda</span>
      <h1 class="ag4-t">${sem.length ? `${F0.format(sem.length)} entreprises publient dans les 7 prochains jours.` : "Aucune publication dans les 7 prochains jours."}</h1>
      <p class="ag5-k">${F0.format(conf)} date${conf > 1 ? "s" : ""} annoncée${conf > 1 ? "s" : ""} par les entreprises, ${F0.format(sem.length - conf)} date${sem.length - conf > 1 ? "s" : ""} habituelle${sem.length - conf > 1 ? "s" : ""} à confirmer.</p>
      <label class="ag5-q"><span aria-hidden="true">🔍</span><input id="ag5q" type="search" placeholder="Une entreprise : a-t-elle une date cette semaine ?" autocomplete="off"></label>
      <div class="ag5-ans" id="ag5ans" hidden></div></section>
    <div id="ag5moi"></div>
    <section class="ek-sec"><h2>Combien d'entreprises publient, secteur par secteur.</h2><div class="ag5-secs" id="ag5secs"></div></section>
    <section class="ek-sec"><h2 id="ag5h"></h2><div class="ag5-per" id="ag5per"></div><div id="ag5l"></div></section>
    <section class="ek-sec" id="ag4pub"><h2>Les résultats publiés ces sept derniers jours.</h2><div id="ag4r"><p class="ek-note">Recherche des communiqués…</p></div></section>
    <p class="mc-note">Dates relevées sur les calendriers financiers officiels. « À confirmer » : date habituelle d'après l'an dernier, tant que l'entreprise n'a pas annoncé la sienne. Une date peut changer : la société fait foi.</p></div>`;
  // Vos valeurs
  const pf = new Set((typeof pf2Load === "function" ? pf2Load().l || [] : []).map(l => l.k).filter(k => k && k.startsWith("c:")).map(k => k.slice(2)));
  const fv = new Set(favs().filter(k => k.startsWith("c:")).map(k => k.slice(2)));
  const ids = [...new Set([...fv, ...pf])].filter(id => RBY[id]);
  if (ids.length) {
    const L = ids.map(id => ({ id, e: NX.get(id) || null })).sort((a, b) => (a.e ? a.e.date : "9").localeCompare(b.e ? b.e.date : "9")).slice(0, 16);
    $("#ag5moi").innerHTML = `<section class="ek-sec"><h2>Les prochaines dates de vos favoris et de votre portefeuille.</h2><div class="ag5-fav">${L.map(({ id, e }) => { const c = RBY[id], s = e && dans(e) < 7;
      return `<a class="ag5-fc${s ? " sem" : ""}${e && e.estime ? " e" : ""}" href="/entreprise/${esc(id)}"><span class="ag5-fh">${mcLogo(c)}<span><small>${e ? (s ? "Cette semaine" : "Plus tard") : "Pas de date"}</small><b>${esc(c.name)}</b></span></span>
        <span class="ag5-fd">${e ? esc(ag5Court(e.date)) : "–"}</span>${e ? `<span class="ag5-fl">${esc(ag5Lab(e))}</span><span class="ag5-tags">${ag5Tags(e)}</span>` : `<span class="ag5-fl">Aucune date connue pour le moment.</span>`}</a>`; }).join("")}</div></section>`;
  }
  const rendre = () => {
    const P = [...NX.values()].filter(e => dans(e) < AG5.jours), par = {};
    P.forEach(e => { const k = (RBY[e.id] || {}).sector || "autre"; (par[k] = par[k] || []).push(e); });
    const ordre = Object.entries(par).sort((a, b) => b[1].length - a[1].length), mx = Math.max(1, P.length);
    $("#ag5secs").innerHTML = `<button type="button" class="ag5-sc tout${AG5.sec ? "" : " act"}" data-s=""><b>${F0.format(P.length)}</b><span>Tout</span><i style="width:100%"></i></button>`
      + ordre.map(([k, l]) => `<button type="button" class="ag5-sc${AG5.sec === k ? " act" : ""}" data-s="${esc(k)}" style="--c:${AG5_COUL[k] || "#E2DED5"}"><b>${F0.format(l.length)}</b><span>${esc(R.sectors[k] || "Autres")}</span><i style="width:${(l.length / mx * 100).toFixed(0)}%"></i></button>`).join("");
    const L = P.filter(e => !AG5.sec || (RBY[e.id] || {}).sector === AG5.sec).sort((a, b) => a.date.localeCompare(b.date) || (a.estime - b.estime) || RBY[a.id].name.localeCompare(RBY[b.id].name));
    $("#ag5h").textContent = `${AG5.sec ? (R.sectors[AG5.sec] || "Autres") + " : " : ""}${F0.format(L.length)} entreprise${L.length > 1 ? "s" : ""} publient dans les ${AG5.jours} prochains jours, dans l'ordre des dates.`;
    $("#ag5per").innerHTML = [[7, "7 prochains jours"], [30, "30 prochains jours"]].map(([n, l]) => `<button type="button" data-j="${n}" class="ag5-pb${AG5.jours === n ? " act" : ""}">${l}</button>`).join("") + (AG5.sec ? `<button type="button" class="ag5-pb" data-s="">Tous les secteurs</button>` : "");
    const J = {}; L.forEach(e => (J[e.date] = J[e.date] || []).push(e));
    $("#ag5l").innerHTML = L.length ? Object.entries(J).map(([d, xs]) => `<div class="ag5-j"><h3>${esc(ag5Jour(d))} <small>${esc(ag4Delai(d))} · ${xs.length}</small></h3>${xs.map(e => { const c = RBY[e.id];
      return `<a class="ag5-ev${e.estime ? " e" : ""}" href="/entreprise/${esc(c.id)}">${mcLogo(c)}<span class="ag5-n"><b>${esc(c.name)}</b><small>${esc(ag5Lab(e))}</small></span><span class="ag5-tags">${ag5Tags(e)}</span></a>`; }).join("")}</div>`).join("")
      : `<p class="ek-note">Aucune date sur cette période.</p>`;
  };
  app.querySelector(".ag5").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.s !== undefined) { AG5.sec = b.dataset.s || null; rendre(); } else if (b.dataset.j) { AG5.jours = +b.dataset.j; rendre(); } });
  // Recherche : une date cette semaine ? sinon la prochaine connue
  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  $("#ag5q").oninput = () => { const q = norm($("#ag5q").value.trim()), A = $("#ag5ans"); if (q.length < 2) { A.hidden = true; return; }
    const r = R.companies.filter(c => !c.missing && (norm(c.name).includes(q) || norm(c.ticker) === q)).sort((a, b) => (norm(a.name).startsWith(q) ? 0 : 1) - (norm(b.name).startsWith(q) ? 0 : 1)).slice(0, 5);
    A.hidden = false;
    A.innerHTML = r.length ? r.map(c => { const e = NX.get(c.id), s = e && dans(e) < 7;
      return `<a class="ag5-r" href="/entreprise/${esc(c.id)}">${mcLogo(c)}<b>${esc(c.name)}</b><span class="ag5-rd">${s ? `<strong class="ok">Oui : ${esc(ag5Jour(e.date))}</strong> · ${esc(ag5Lab(e))}` : e ? `Pas cette semaine. Prochaine date connue : <strong>${esc(ag5Court(e.date))}</strong> · ${esc(ag5Lab(e))}` : "Aucune date connue pour le moment."}${e ? `<span class="ag5-tags">${ag5Tags(e)}</span>` : ""}</span></a>`; }).join("")
      : `<p class="ek-note">Aucune entreprise de ce nom sur le site.</p>`; };
  rendre(); if (typeof ag4Publies === "function") ag4Publies();
}
window.pageAgenda = pageAgenda5;
