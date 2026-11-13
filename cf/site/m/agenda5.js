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
const AG5 = { sec: null, jours: 7, jour: null };
const ag5Lab = e => String(e.label || "").replace(/\s*\((date habituelle|habituellement)[^)]*\)/i, "").trim() || e.type || "Date";
const ag5Jour = d => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, x => x.toUpperCase());
const ag5Court = d => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: d.slice(0, 4) === TODAY.slice(0, 4) ? undefined : "numeric" });
const ag5Tags = e => `<span class="ag5-ty ${AG5_TYPE[e.type] || ""}">${esc(e.type || "Date")}</span><span class="ag5-st${e.estime ? " e" : ""}">${e.estime ? "À confirmer" : "Annoncée"}</span>`;
function ag5Prochaines() { const m = new Map(); for (const e of upcoming()) { const o = m.get(e.id); if (!o || (o.date === e.date && o.estime && !e.estime)) m.set(e.id, e); } return m; } // une date par entreprise : la plus proche (l'annoncée d'abord)
/* 13/11 soir (Romain : « l'agenda des résultats est à refaire, les résultats publiés sont tout en bas, cachés ») :
   1. bandeau : trois chiffres (déjà publiés sur 7 jours, aujourd'hui, 7 prochains jours) et la recherche ;
   2. « Déjà publiés » juste dessous : les résultats annoncés ces 7 derniers jours (fil des annonces officielles), un par entreprise ;
   3. vos favoris ; 4. « À venir » jour par jour : un onglet par jour, filtre par secteur en pastilles, au lieu d'une liste de 3 500 px. */
const AG5_PUB_N = 8;
function ag5PubCarte(x) { const c = RBY[x.id], f = (x.f || [])[0], d = new Date(x.d), h = typeof hhmm === "function" ? hhmm(x.d) : "";
  return `<a class="ag6-pc" href="/entreprise/${esc(c.id)}">${mcLogo(c)}<span class="ag6-pn"><b>${esc(c.name)}</b><small>${esc(d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Paris" }))}${h ? " · " + esc(h) : ""}</small></span>
    ${f ? `<span class="ag6-pf"><small>${esc(f[0])}</small><b>${esc(f[1])}</b></span>` : `<span class="ag6-pf"><small>${esc(x.tf || "Résultats")}</small><b class="nb">Annonce publiée</b></span>`}</a>`; }
function pageAgenda5() {
  setTitle("Agenda financier"); setNav("news");
  const T0 = Date.parse(TODAY + "T00:00:00Z"), dans = e => (Date.parse(e.date + "T00:00:00Z") - T0) / 864e5;
  const NX = ag5Prochaines(), sem = [...NX.values()].filter(e => dans(e) < 7), auj = sem.filter(e => dans(e) < 1).length, conf = sem.filter(e => !e.estime).length;
  app.innerHTML = `<div class="ek ek-page ag5">
    <section class="ek-hero ag5-hero"><span class="mc-stk">Agenda des résultats</span>
      <h1 class="ag4-t">Qui publie ses résultats, et quand.</h1>
      <div class="ag6-k3"><a href="#ag6pub"><b id="ag6npub">…</b><span>résultats publiés ces 7 derniers jours</span></a><a href="#ag6av"><b>${F0.format(auj)}</b><span>publication${auj > 1 ? "s" : ""} attendue${auj > 1 ? "s" : ""} aujourd'hui</span></a><a href="#ag6av"><b>${F0.format(sem.length)}</b><span>dans les 7 prochains jours, dont ${F0.format(conf)} date${conf > 1 ? "s" : ""} annoncée${conf > 1 ? "s" : ""}</span></a></div>
      <label class="ag5-q"><span aria-hidden="true">🔍</span><input id="ag5q" type="search" placeholder="Une entreprise : a-t-elle une date cette semaine ?" autocomplete="off"></label>
      <div class="ag5-ans" id="ag5ans" hidden></div></section>
    <section class="ek-sec" id="ag6pub"><span class="ek-stk2 g">Déjà publiés</span><h2>Les résultats des 7 derniers jours.</h2><div class="ag6-pub" id="ag6publ"><p class="ek-note">Lecture des annonces officielles…</p></div></section>
    <div id="ag5moi"></div>
    <section class="ek-sec" id="ag6av"><span class="ek-stk2">À venir</span><h2 id="ag5h"></h2>
      <div class="ag6-sec scroll-x" id="ag5secs"></div><div class="ag6-days scroll-x" id="ag6days"></div><div id="ag5l"></div><div class="ag5-per" id="ag5per"></div></section>
    <p class="mc-note">Dates relevées sur les calendriers financiers officiels. « À confirmer » : date habituelle d'après l'an dernier, tant que l'entreprise n'a pas annoncé la sienne. Une date peut changer : la société fait foi. Résultats publiés : annonces officielles relevées par le site (AMF, SEC et bourses européennes).</p></div>`;
  // Déjà publiés : fil des annonces officielles, une carte par entreprise (celle qui donne le plus de chiffres)
  (typeof actuFil === "function" ? actuFil() : getJSON("/data/actu/fil.json", { o: [] })).then(j => {
    const d7 = Date.now() - 7 * 864e5, m = new Map();
    for (const x of (j && j.o) || []) { if (x.c !== "resultats" || !RBY[x.id] || Date.parse(x.d) < d7) continue; const o = m.get(x.id); if (!o || (x.f || []).length > (o.f || []).length) m.set(x.id, x); }
    const L = [...m.values()].sort((a, b) => (b.i || 0) - (a.i || 0) || ((b.f || []).length > 0) - ((a.f || []).length > 0) || String(b.d).localeCompare(String(a.d)));
    const n = $("#ag6npub"); if (n) n.textContent = F0.format(L.length);
    const box = $("#ag6publ"); if (!box) return;
    box.innerHTML = L.length ? L.slice(0, AG5_PUB_N).map(ag5PubCarte).join("") + (L.length > AG5_PUB_N ? `<a class="ag6-plus" href="/actualites?vue=annonces&type=resultats">Les ${F0.format(L.length)} résultats publiés, dans le fil de l'actualité →</a>` : "")
      : `<p class="ek-note">Aucune publication de résultats relevée ces sept derniers jours.</p>`;
  });
  // Vos favoris
  const fv = favs().filter(k => k.startsWith("c:")).map(k => k.slice(2)).filter(id => RBY[id]);
  if (fv.length) {
    const L = fv.map(id => ({ id, e: NX.get(id) || null })).sort((a, b) => (a.e ? a.e.date : "9").localeCompare(b.e ? b.e.date : "9")).slice(0, 16);
    $("#ag5moi").innerHTML = `<section class="ek-sec"><span class="ek-stk2 p">Vos favoris</span><h2>Leurs prochaines dates.</h2><div class="ag5-fav">${L.map(({ id, e }) => { const c = RBY[id], s = e && dans(e) < 7;
      return `<a class="ag5-fc${s ? " sem" : ""}${e && e.estime ? " e" : ""}" href="/entreprise/${esc(id)}"><span class="ag5-fh">${mcLogo(c)}<span><small>${e ? (s ? "Cette semaine" : "Plus tard") : "Pas de date"}</small><b>${esc(c.name)}</b></span></span>
        <span class="ag5-fd">${e ? esc(ag5Court(e.date)) : "–"}</span>${e ? `<span class="ag5-fl">${esc(ag5Lab(e))}</span><span class="ag5-tags">${ag5Tags(e)}</span>` : `<span class="ag5-fl">Aucune date connue pour le moment.</span>`}</a>`; }).join("")}</div></section>`;
  }
  // À venir, jour par jour
  const jourCourt = d => { const n = dans({ date: d }); return n < 1 ? "Aujourd'hui" : n < 2 ? "Demain" : new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }).replace(/^./, x => x.toUpperCase()); };
  const rendre = () => {
    const P = [...NX.values()].filter(e => dans(e) < AG5.jours), par = {};
    P.forEach(e => { const k = (RBY[e.id] || {}).sector || "autre"; (par[k] = par[k] || []).push(e); });
    const ordre = Object.entries(par).sort((a, b) => b[1].length - a[1].length);
    $("#ag5secs").innerHTML = `<button type="button" class="ag6-s${AG5.sec ? "" : " act"}" data-s="">Tous les secteurs <b>${F0.format(P.length)}</b></button>`
      + ordre.map(([k, l]) => `<button type="button" class="ag6-s${AG5.sec === k ? " act" : ""}" data-s="${esc(k)}" style="--c:${AG5_COUL[k] || "#E2DED5"}"><i></i>${esc(R.sectors[k] || "Autres")} <b>${F0.format(l.length)}</b></button>`).join("");
    const L = P.filter(e => !AG5.sec || (RBY[e.id] || {}).sector === AG5.sec).sort((a, b) => a.date.localeCompare(b.date) || (a.estime - b.estime) || RBY[a.id].name.localeCompare(RBY[b.id].name));
    const J = {}; L.forEach(e => (J[e.date] = J[e.date] || []).push(e)); const jours = Object.keys(J);
    if (!AG5.jour || (AG5.jour !== "tout" && !J[AG5.jour])) AG5.jour = jours[0] || "tout";
    $("#ag5h").textContent = `${F0.format(L.length)} publication${L.length > 1 ? "s" : ""} dans les ${AG5.jours} prochains jours${AG5.sec ? " · " + (R.sectors[AG5.sec] || "Autres") : ""}.`;
    $("#ag6days").innerHTML = jours.map(d => `<button type="button" class="ag6-d${AG5.jour === d ? " act" : ""}" data-d="${d}"><span>${esc(jourCourt(d))}</span><b>${F0.format(J[d].length)}</b></button>`).join("")
      + (jours.length > 1 ? `<button type="button" class="ag6-d tout${AG5.jour === "tout" ? " act" : ""}" data-d="tout"><span>Tous les jours</span><b>${F0.format(L.length)}</b></button>` : "");
    const ligne = e => { const c = RBY[e.id]; return `<a class="ag5-ev${e.estime ? " e" : ""}" href="/entreprise/${esc(c.id)}">${mcLogo(c)}<span class="ag5-n"><b>${esc(c.name)}</b><small>${esc(ag5Lab(e))}</small></span><span class="ag5-tags">${ag5Tags(e)}</span></a>`; };
    const montre = AG5.jour === "tout" ? jours : [AG5.jour];
    $("#ag5l").innerHTML = L.length ? montre.map(d => `<div class="ag5-j"><h3>${esc(ag5Jour(d))} <small>${esc(ag4Delai(d))} · ${J[d].length}</small></h3>${J[d].map(ligne).join("")}</div>`).join("") : `<p class="ek-note">Aucune date sur cette période.</p>`;
    $("#ag5per").innerHTML = AG5.jours === 7 ? `<button type="button" data-j="30" class="ag5-pb">Voir les 30 prochains jours</button>` : `<button type="button" data-j="7" class="ag5-pb">Revenir aux 7 prochains jours</button>`;
  };
  app.querySelector(".ag5").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.s !== undefined) { AG5.sec = b.dataset.s || null; AG5.jour = null; rendre(); }
    else if (b.dataset.d) { AG5.jour = b.dataset.d; rendre(); }
    else if (b.dataset.j) { AG5.jours = +b.dataset.j; AG5.jour = null; rendre(); } });
  // Recherche : une date cette semaine ? sinon la prochaine connue
  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  $("#ag5q").oninput = () => { const q = norm($("#ag5q").value.trim()), A = $("#ag5ans"); if (q.length < 2) { A.hidden = true; return; }
    const r = R.companies.filter(c => !c.missing && (norm(c.name).includes(q) || norm(c.ticker) === q)).sort((a, b) => (norm(a.name).startsWith(q) ? 0 : 1) - (norm(b.name).startsWith(q) ? 0 : 1)).slice(0, 5);
    A.hidden = false;
    A.innerHTML = r.length ? r.map(c => { const e = NX.get(c.id), s = e && dans(e) < 7;
      return `<a class="ag5-r" href="/entreprise/${esc(c.id)}">${mcLogo(c)}<b>${esc(c.name)}</b><span class="ag5-rd">${s ? `<strong class="ok">Oui : ${esc(ag5Jour(e.date))}</strong> · ${esc(ag5Lab(e))}` : e ? `Pas cette semaine. Prochaine date connue : <strong>${esc(ag5Court(e.date))}</strong> · ${esc(ag5Lab(e))}` : "Aucune date connue pour le moment."}${e ? `<span class="ag5-tags">${ag5Tags(e)}</span>` : ""}</span></a>`; }).join("")
      : `<p class="ek-note">Aucune entreprise de ce nom sur le site.</p>`; };
  rendre();
}
window.pageAgenda = pageAgenda5;
