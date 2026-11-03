/* ---------- Agenda v4 (3/11/2026), même direction que Marchés et Actualité v4 ----------
   En-tête jaune : le nombre de rendez-vous de la semaine, la semaine en sept cases (nombre et logos par jour, cliquables),
   filtres en un clic (type, période). Puis vos valeurs (portefeuille et favoris), les rendez-vous jour par jour en cartes
   (logo, événement, type en couleur, heure de Paris si la société l'a annoncée), et les résultats publiés ces sept derniers
   jours avec leurs chiffres. Heures : O2_heure (m/outils2.js). Remplace window.pageAgenda. */
const AG4_TYPES = [["Tous", "Tous"], ["Résultats", "Résultats"], ["Assemblée", "Assemblées"], ["Dividende", "Dividendes"]];
const AG4_PER = [["semaine", "7 jours"], ["mois", "30 jours"], ["tout", "Tout"]];
const AG4_COUL = { "Résultats": "#1E6FD9", "Assemblée": "#8A6D1E", "Dividende": "#1E8A52" };
const ag4J = d => new Date(d + "T12:00:00");
function ag4Delai(d) { const n = Math.round((Date.parse(d + "T00:00:00Z") - Date.parse(TODAY + "T00:00:00Z")) / 864e5); return n === 0 ? "aujourd'hui" : n === 1 ? "demain" : n > 1 ? `dans ${n} jours` : n === -1 ? "hier" : `il y a ${-n} jours`; }
function ag4Carte(e) {
  const c = RBY[e.id], H = e.type === "Résultats" && typeof O2_heure === "function" ? O2_heure(e) : null, col = AG4_COUL[e.type] || "#5F5B55";
  return `<a class="ag4-c" href="/entreprise/${esc(c.id)}" style="--c:${col}" ${H ? `data-ag="${esc(e.id)}|${esc(e.date)}"` : ""}><div class="ag4-ch">${mcLogo(c)}<span><b>${esc(c.name)}</b><small>${esc(secName(c))}</small></span><em>${esc(e.type || "Date")}</em></div>
    <p>${esc(e.label || "")}</p><div class="o2-agh ag4-h">${H ? (H.ok ? `<b>${esc(H.court)}</b>${/^\d|^vers|^au plus/.test(H.court) ? " <small>heure de Paris</small>" : ""}` : `<small>${esc(H.court)}</small>`) : ""}</div></a>`;
}
function pageAgenda4() {
  setTitle("Agenda financier"); setNav("news");
  const q = new URLSearchParams(location.search);
  const st = { ty: AG4_TYPES.some(t => t[0] === q.get("type")) ? q.get("type") : "Tous", per: AG4_PER.some(p => p[0] === q.get("p")) ? q.get("p") : "semaine", n: 24 };
  const T0 = Date.parse(TODAY + "T00:00:00Z"), dans = e => (Date.parse(e.date + "T00:00:00Z") - T0) / 864e5;
  const semaine = upcoming().filter(e => dans(e) < 7), nE = new Set(AG.events.map(e => e.id)).size;
  const jours = [...Array(7)].map((_, i) => new Date(T0 + i * 864e5).toISOString().slice(0, 10));
  const cases = jours.map(d => { const L = semaine.filter(e => e.date === d); return `<${L.length ? `a href="#j-${d}"` : "div"} class="ag4-d${L.length ? "" : " vide"}" data-jour="${d}"><small>${esc(ag4J(d).toLocaleDateString("fr-FR", { weekday: "short" }))}</small><b>${ag4J(d).getDate()}</b><span>${L.length ? `${L.length} rendez-vous` : "rien"}</span><i>${L.slice(0, 4).map(e => mcLogo(RBY[e.id])).join("")}</i></${L.length ? "a" : "div"}>`; }).join("");
  app.innerHTML = `<div class="ek ek-page ag4-page">
    <section class="ek-hero"><span class="mc-stk">Agenda</span><h1 class="ag4-t">${semaine.length ? `${F0.format(semaine.length)} rendez-vous cette semaine.` : "Aucun rendez-vous cette semaine."}</h1>
      <p class="mc-sub">Résultats, assemblées et dividendes des ${F0.format(nE)} entreprises dont le site suit le calendrier officiel. Ce qui a été publié est plus bas.</p>
      <div class="ag4-w">${cases}</div></section>
    <div id="ag4moi"></div>
    <section class="ek-sec" id="ag4liste"><span class="ek-stk2">À venir</span><h2 id="ag4h">Jour par jour.</h2>
      <div class="el-f ax4-ch" id="ag4ty"><span>Type :</span>${AG4_TYPES.map(([k, l]) => `<button type="button" data-ty="${k}">${l}</button>`).join("")}<span class="ag4-sp"></span>${AG4_PER.map(([k, l]) => `<button type="button" data-per="${k}">${l}</button>`).join("")}</div>
      <div id="ag4l"></div><div id="ag4plus"></div>
      <p class="mc-note">Dates relevées sur les calendriers financiers officiels (lien sur chaque fiche). L'heure n'est affichée que si la société l'a annoncée, convertie à l'heure de Paris. Une date peut changer : la société fait foi.</p></section>
    <section class="ek-sec" id="ag4pub"><span class="ek-stk2 p">Publié</span><h2>Les résultats de ces sept derniers jours.</h2><div id="ag4r"><p class="ek-note">Recherche des communiqués…</p></div></section></div>`;
  const rendre = () => {
    $$("#ag4ty [data-ty]").forEach(b => b.classList.toggle("on", b.dataset.ty === st.ty)); $$("#ag4ty [data-per]").forEach(b => b.classList.toggle("on", b.dataset.per === st.per));
    const u = new URLSearchParams(); if (st.ty !== "Tous") u.set("type", st.ty); if (st.per !== "semaine") u.set("p", st.per); try { history.replaceState(history.state, "", "/agenda" + (u.toString() ? "?" + u : "")); } catch (e) { }
    const lim = st.per === "semaine" ? 7 : st.per === "mois" ? 30 : 1e4, L = upcoming().filter(e => (st.ty === "Tous" || e.type === st.ty) && dans(e) < lim);
    $("#ag4h").textContent = L.length ? `${F0.format(L.length)} rendez-vous, jour par jour.` : "Jour par jour.";
    if (!L.length) { $("#ag4l").innerHTML = `<p class="ek-note">Aucun rendez-vous sur cette période.</p>`; $("#ag4plus").innerHTML = ""; return; }
    let out = "", last = "", grille = [];
    const fermer = () => { if (grille.length) out += `<div class="ag4-g">${grille.join("")}</div>`; grille = []; };
    for (const e of L.slice(0, st.n)) { if (e.date !== last) { fermer(); last = e.date; out += `<h3 class="ax4-day" id="j-${e.date}">${esc(ag4J(e.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, x => x.toUpperCase()))} <small>${esc(ag4Delai(e.date))}</small></h3>`; } grille.push(ag4Carte(e)); }
    fermer();
    $("#ag4l").innerHTML = out; $("#ag4plus").innerHTML = L.length > st.n ? `<button type="button" class="el-more" data-plus>Afficher ${F0.format(Math.min(30, L.length - st.n))} de plus</button>` : "";
  };
  app.querySelector(".ag4-page").addEventListener("click", e => {
    const j = e.target.closest("a[data-jour]"); if (j) { e.preventDefault(); if (st.ty !== "Tous") st.ty = "Tous"; rendre(); const t = document.getElementById("j-" + j.dataset.jour); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.ty) { st.ty = b.dataset.ty; st.n = 24; rendre(); }
    else if (b.dataset.per) { st.per = b.dataset.per; st.n = 24; rendre(); }
    else if (b.dataset.plus !== undefined) { st.n += 30; rendre(); }
  });
  rendre(); ag4Moi(); ag4Publies();
}
// Vos valeurs : portefeuille puis favoris, prochaine date de chacune
function ag4Moi() {
  const pf = new Set((typeof pf2Load === "function" ? pf2Load().l || [] : []).map(l => l.k).filter(k => k && k.startsWith("c:")).map(k => k.slice(2)));
  const fv = new Set(favs().filter(k => k.startsWith("c:")).map(k => k.slice(2)));
  const ids = [...pf, ...[...fv].filter(id => !pf.has(id))].filter(id => RBY[id]); if (!ids.length) return;
  const L = ids.map(id => ({ id, e: upcoming().find(e => e.id === id) })).sort((a, b) => (a.e ? a.e.date : "9").localeCompare(b.e ? b.e.date : "9")).slice(0, 12);
  $("#ag4moi").innerHTML = `<section class="ek-sec"><span class="ek-stk2 b">Vos valeurs</span><h2>Leurs prochaines dates.</h2><div class="ag4-g">${L.map(({ id, e }) => e ? ag4Carte(e) : `<a class="ag4-c" href="/entreprise/${esc(id)}" style="--c:#C9C5BC"><div class="ag4-ch">${mcLogo(RBY[id])}<span><b>${esc(RBY[id].name)}</b><small>${esc(secName(RBY[id]))}</small></span></div><p>Aucune date annoncée pour l'instant.</p></a>`).join("")}</div></section>`;
}
// Résultats prévus ces sept derniers jours : les chiffres réellement publiés (annonces officielles collectées par le site)
async function ag4Publies() {
  const d7 = new Date(Date.parse(TODAY) - 7 * 864e5).toISOString().slice(0, 10);
  const ev = AG.events.filter(e => e.type === "Résultats" && e.date >= d7 && e.date <= TODAY && RBY[e.id]).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  const res = await Promise.all(ev.map(async e => { const j = await (typeof actuCo === "function" ? actuCo(e.id) : getJSON(`/data/actu/c/${e.id}.json`, { o: [] })), t0 = Date.parse(e.date) - 864e5, t1 = Date.parse(e.date) + 2 * 864e5;
    return [e, (j.o || []).filter(x => x.c === "resultats" && Date.parse(x.d) >= t0 && Date.parse(x.d) < t1).sort((a, b) => (b.f || []).length - (a.f || []).length)[0] || null]; }));
  const box = document.getElementById("ag4r"); if (!box) return;
  res.forEach(([e, x]) => { if (x && typeof O2_hParis === "function") document.querySelectorAll(`[data-ag="${e.id}|${e.date}"] .ag4-h`).forEach(h => { h.innerHTML = `<b class="ok">Publié à ${esc(O2_hParis(new Date(x.d)))}</b>`; }); });
  const P = res.filter(([, x]) => x);
  box.innerHTML = P.length ? P.map(([e, x]) => axCarte(x)).join("") : `<p class="ek-note">Aucune publication de résultats relevée ces sept derniers jours.</p>`;
}

window.pageAgenda = pageAgenda4;
