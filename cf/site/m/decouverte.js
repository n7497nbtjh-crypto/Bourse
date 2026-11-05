/* La découverte de la semaine (4/11/2026, demande de Romain) : chaque semaine, une entreprise de taille petite ou moyenne
   présentée en détail, fonctionnalité du site (page /decouverte, carte sur l'accueil) : identité, métier, verdict, cinq repères face
   à ses rivales, ventes et marge sur plusieurs années, rivales, prochaine date.
   Choix par une règle publique, jamais par la qualité (sinon ce serait une recommandation) : un secteur à tour de rôle,
   puis, dans ce secteur, une entreprise valant entre 300 millions et 10 milliards d'euros en Bourse, aux comptes complets
   et récents, prise à tour de rôle par ordre alphabétique de son identifiant.
   Réutilise les briques de la fiche v4 (f4Ctx, f4Verdict, f4Chaine, f4MetierSec, f4E1, f4E2 de m/fiche4.js).
   L'accueil pose <section id="acc-dec"> ; ce module le remplit. Remplace l'ancienne sélection quotidienne /decouvertes (m/outils.js),
   qui retenait des entreprises « dont les comptes ressortent » : un tri par qualité, trop proche d'une recommandation. */
const DEC_REGLE = "Chaque semaine, un secteur à tour de rôle ; dans ce secteur, une entreprise valant entre 300 millions et 10 milliards d'euros en Bourse, aux comptes complets et récents, prise à tour de rôle par ordre alphabétique. Ce n'est ni un classement ni un conseil : une entreprise à connaître, pas à acheter.";
function decNumero(sem) { const m = String(sem || "").match(/^(\d{4})-W(\d{2})$/); return m ? +m[1] * 53 + +m[2] : 0; }
function decChoix(sem) {
  if (typeof R === "undefined" || !R || !R.companies || typeof f4Valide !== "function") return null;
  const an = +String(sem).slice(0, 4) || new Date().getFullYear();
  const C = R.companies.filter(c => {
    if (c.missing || !f4Valide(c) || (typeof isBank === "function" && isBank(c)) || !c.desc || !(c.year >= an - 1)) return false;
    const v = typeof valo === "function" ? valo(c) : null; return v && v.capE >= 3e8 && v.capE <= 1e10;
  });
  const secs = [...new Set(C.map(c => c.sector))].sort(); if (!secs.length) return null;
  const n = decNumero(sem), sec = secs[n % secs.length], L = C.filter(c => c.sector === sec).sort((a, b) => a.id.localeCompare(b.id));
  return L[Math.floor(n / secs.length) % L.length] || null;
}
const decTaille = e => e >= 2e9 ? "entreprise moyenne" : "petite entreprise";
// 4/11 (Romain : « une vraie présentation, avec une plus-value, pas sa fiche ») : un récit construit sur les comptes et les faits
// publiés, en six parties : qui elle est, ce qu'elle fait, ses comptes racontés, face à ses rivales, ce qu'il faut surveiller, la suite.
// Tout est calculé : aucun texte écrit à la main pour une entreprise, aucune prévision, aucun avis sur le prix.
const decAn = (a, i) => a && a[i] != null && isFinite(a[i]) ? a[i] : null;
function decRecit(s, c, x) {
  const Y = c.years || [], F = c.fin || {}, n = Y.length, cur = s.currency, md = v => f4Md(v, cur), out = [], vig = [];
  const ca = F.ca || [], net = F.net || [], ebit = F.ebit || [];
  const i0 = ca.findIndex(v => v != null && v > 0), i1 = n - 1;
  if (i0 >= 0 && i1 > i0 && ca[i1] > 0) {
    const t = ca[i1] / ca[i0] - 1, ans = Y[i1] - Y[i0], cagr = Math.pow(ca[i1] / ca[i0], 1 / ans) - 1;
    const hausses = ca.slice(i0 + 1).filter((v, k) => v != null && ca[i0 + k] != null && v > ca[i0 + k]).length;
    out.push(`<b>Ses ventes</b> sont passées de ${md(ca[i0])} en ${Y[i0]} à ${md(ca[i1])} en ${Y[i1]}, soit ${t >= 0 ? "+" : "−"}${ekFr(Math.abs(t * 100), 0)} % en ${ans} ans (${cagr >= 0 ? "+" : "−"}${ekFr(Math.abs(cagr * 100), 1)} % par an en moyenne). Elles ont augmenté ${hausses} année${hausses > 1 ? "s" : ""} sur ${ans}.`);
    if (t < -0.15) vig.push(`Ses ventes ont baissé de ${ekFr(Math.abs(t * 100), 0)} % depuis ${Y[i0]} : l'activité rétrécit.`);
  }
  const pertes = net.filter(v => v != null && v < 0).length, nl = decAn(net, i1);
  if (nl != null) {
    const exc = net.map((v, k) => v != null && ca[k] > 0 && v > ca[k] * 0.4 ? Y[k] : null).filter(Boolean);
    out.push(`<b>Son résultat</b> : ${nl >= 0 ? `un bénéfice de ${md(nl)}` : `une perte de ${md(-nl)}`} en ${Y[i1]}${pertes ? `, et ${pertes} année${pertes > 1 ? "s" : ""} de perte sur les ${n} dernières` : `, et aucune perte sur les ${n} dernières années`}.${exc.length ? ` En ${exc.join(" et ")}, le bénéfice dépasse 40 % des ventes : un gain exceptionnel (vente d'une activité, par exemple), qui ne se répète pas.` : ""}`);
    if (pertes >= 2) vig.push(`${pertes} années de perte sur ${n} : elle ne gagne pas d'argent de façon régulière.`);
  }
  const m0 = ca[i0] > 0 && ebit[i0] != null ? ebit[i0] / ca[i0] : null, m1 = ca[i1] > 0 && ebit[i1] != null ? ebit[i1] / ca[i1] : null;
  if (m1 != null && !x.bk) out.push(`<b>Sa marge d'exploitation</b> (ce qu'il reste des ventes une fois l'activité payée) : ${ekFr(m1 * 100, 0)} % en ${Y[i1]}${m0 != null && i0 < i1 ? `, contre ${ekFr(m0 * 100, 0)} % en ${Y[i0]}` : ""}${x.MED.m != null ? ` ; la médiane de ${x.P.qui} est de ${ekFr(x.MED.m * 100, 0)} %` : ""}.`);
  const nd = decAn(F.netDebt, i1), eb = decAn(ebit, i1);
  if (nd != null) {
    if (nd <= 0) out.push(`<b>Sa dette</b> : elle a plus de trésorerie que de dettes (${md(-nd)} d'avance).`);
    else { const lev = eb > 0 ? nd / eb : null; out.push(`<b>Sa dette nette</b> est de ${md(nd)}${lev != null ? `, soit ${ekFr(lev, 1)} années de résultat d'exploitation` : ""}.`); if (lev == null || lev > 4) vig.push(lev == null ? "Elle a une dette nette alors que son activité ne dégage pas de résultat d'exploitation." : `Sa dette représente ${ekFr(lev, 1)} années de résultat d'exploitation : c'est beaucoup.`); }
  }
  const dv = decAn(F.divPaid, i1);
  if (dv != null && dv > 0) out.push(`<b>Ses actionnaires</b> ont reçu ${md(dv)} de dividendes en ${Y[i1]}${nl > 0 ? `, soit ${ekFr(dv / nl * 100, 0)} % du bénéfice` : ", alors que l'année s'est soldée par une perte"}.`);
  else if (!(c.sourcePdf || c.sourceEP)) out.push(`<b>Ses actionnaires</b> : aucun dividende versé en ${Y[i1]}. Ce que l'entreprise gagne reste dans l'entreprise.`);
  const v = valo(s) || {};
  if (v.capE && v.capE < 2e9) vig.push("C'est une petite entreprise en Bourse : son cours peut bouger plus fort, et ses actions s'échangent moins facilement que celles des grandes.");
  if (cur && cur !== "EUR") vig.push(`Ses comptes sont en ${cur === "USD" ? "dollars" : cur} : pour un épargnant en euros, le taux de change joue aussi.`);
  return { out, vig };
}
async function decHTML(sem) {
  const s = decChoix(sem); if (!s) return "";
  const c = FULL[s.id] || await fetch(`/data/societes/${s.id}.json`).then(r => r.ok ? r.json() : null).then(j => j ? (FULL[s.id] = j) : null).catch(() => null);
  if (!c || !c.fin) return "";
  if (typeof ficheWDLoad === "function") await ficheWDLoad(s.id).catch(() => null);
  const x = f4Ctx(s, c), v = valo(s) || {}, wd = typeof ficheWd === "function" ? ficheWd(s.id) : null, an = +TODAY.slice(0, 4);
  const fi = (typeof FICHES !== "undefined" && FICHES && FICHES[s.id]) || null;
  let rang = null; try { const sec = R.companies.filter(z => z.sector === s.sector && f4Valide(z)).sort((p, q) => (q.ca || 0) - (p.ca || 0)); const k = sec.findIndex(z => z.id === s.id); if (k >= 0 && sec.length > 5) rang = [k + 1, sec.length]; } catch (e) { }
  // 4/11 (Romain : « plus de storytelling : salariés, date de création, PDG, aller dans le détail ») : faits Wikidata racontés
  const L2 = a => a && a.length ? (a.length === 1 ? a[0] : a.slice(0, -1).join(", ") + " et " + a[a.length - 1]) : "";
  const qui = [`${esc(s.name)} : ${esc(String(s.desc).replace(/\.$/, "").replace(/^./, m => m.toLowerCase()))}.`,
    wd && wd.fonde ? `L'histoire commence en ${wd.fonde}, il y a ${an - wd.fonde} ans${wd.fondateurs && wd.fondateurs.length ? `, quand ${esc(L2(wd.fondateurs.slice(0, 3)))} ${wd.fondateurs.length > 1 ? "la fondent" : "la fonde"}` : ""}.` : "",
    wd && wd.siege ? `Son siège est à ${esc(wd.siege)}${wd.pays ? ` (${esc(wd.pays)})` : ""}.` : "",
    wd && wd.pdg && wd.pdg.length ? `Elle est dirigée aujourd'hui par ${esc(L2(wd.pdg.slice(0, 2)))}${wd.president && wd.president.length && wd.president[0] !== wd.pdg[0] ? ` ; ${esc(L2(wd.president.slice(0, 1)))} préside son conseil` : ""}.` : wd && wd.president && wd.president.length ? `${esc(L2(wd.president.slice(0, 1)))} préside son conseil.` : "",
    wd && wd.effectif && wd.effectif[0] ? `Environ ${F0.format(wd.effectif[0])} personnes y travaillent${wd.effectif[1] ? ` (chiffre de ${wd.effectif[1]})` : ""}${s.ca > 0 && wd.effectif[0] > 0 ? `, soit environ ${F0.format(Math.round(s.ca * 1e6 / wd.effectif[0] / 1000) * 1000)} ${F4_SYM(s.currency).trim()} de ventes par personne et par an` : ""}.` : "",
    wd && wd.produits && wd.produits.length ? `Parmi ce qu'elle vend : ${esc(L2(wd.produits.slice(0, 4)))}.` : wd && wd.marques && wd.marques.length ? `Ses marques : ${esc(L2(wd.marques.slice(0, 4)))}.` : "",
    wd && wd.nfiliales ? `Elle contrôle ${F0.format(wd.nfiliales)} filiale${wd.nfiliales > 1 ? "s" : ""}${wd.filiales && wd.filiales.length ? `, dont ${esc(L2(wd.filiales.slice(0, 3)))}` : ""}.` : "",
    v.capE ? `En Bourse, elle vaut ${f4Md(v.capE / 1e6, "EUR")} : c'est une ${decTaille(v.capE)}${rang ? `, ${rang[0]}${rang[0] > 1 ? "e" : "re"} sur ${rang[1]} de son secteur (${esc(secName(s).toLowerCase())}) par les ventes` : ""}.` : ""].filter(Boolean);
  const faitsId = [wd && wd.fonde ? ["Création", String(wd.fonde)] : null, wd && wd.pdg && wd.pdg.length ? ["Direction", wd.pdg[0]] : null, wd && wd.effectif && wd.effectif[0] ? ["Salariés", F0.format(wd.effectif[0])] : null, wd && wd.siege ? ["Siège", wd.siege] : null, v.capE ? ["Valeur en Bourse", f4Md(v.capE / 1e6, "EUR")] : null].filter(Boolean);
  const liens = [wd && wd.site ? `<a href="${esc(wd.site)}" target="_blank" rel="noopener">Son site officiel ↗</a>` : "", wd && wd.wiki && /^fr:/.test(wd.wiki) ? `<a href="https://fr.wikipedia.org/wiki/${esc(encodeURIComponent(wd.wiki.slice(3).replace(/ /g, "_")))}" target="_blank" rel="noopener">Son histoire sur Wikipédia ↗</a>` : ""].filter(Boolean).join("");
  const fait = fi ? [["Ce qu'elle fait", fi.fait], ["Comment elle gagne de l'argent", fi.argent], ["Ce dont elle dépend", fi.depend]].filter(([, t]) => t) : [];
  const { out, vig } = decRecit(s, c, x);
  let ventes = ""; try { ventes = f4E1(x).visuel || ""; } catch (e) { }
  let verdict = "", chaine = ""; try { verdict = f4Verdict(x); chaine = f4Chaine(x).replace(/href="#e(\d)"/g, `href="/entreprise/${s.id}#e$1"`); } catch (e) { }
  const riv = x.P.mode === "rivales" ? x.P.L.slice(0, 6) : [];
  const ev = (typeof eventsOf === "function" ? eventsOf(s.id) : []).filter(e => e.date >= TODAY).slice(0, 4);
  let k = 0; const sec = (t, h) => `<section class="dec-s"><h3><i>${++k}</i>${t}</h3>${h}</section>`;
  return `<div class="ek dec-in dec-v2">
    ${sec("Qui est-elle ?", `${faitsId.length ? `<div class="dec-id">${faitsId.map(([k, t]) => `<div><small>${esc(k)}</small><b>${esc(t)}</b></div>`).join("")}</div>` : ""}<div class="dec-qui">${f4Logo(s, null)}<div>${[qui.slice(0, 4), qui.slice(4)].filter(a => a.length).map(a => `<p>${a.join(" ")}</p>`).join("")}${liens ? `<p class="dec-liens">${liens}</p>` : ""}</div></div>`)}
    ${fait.length ? sec("Ce qu'elle fait", `<div class="dec-3">${fait.map(([t, d], j) => `<div class="c${j}"><b>${esc(t)}</b><p>${esc(d)}</p></div>`).join("")}</div>`) : ""}
    ${out.length ? sec("Ses comptes, racontés", `<div class="dec-cpt"><ul class="dec-l">${out.map(t => `<li>${t}</li>`).join("")}</ul>${ventes ? `<div class="dec-vis">${ventes}</div>` : ""}</div>`) : ""}
    ${verdict || chaine ? sec("Face à ses rivales", `${verdict}${chaine}${riv.length ? `<p class="dec-riv">Comparée à : ${riv.map(r => `<a href="/entreprise/${esc(r.id)}">${esc(r.name)}</a>`).join(", ")}.</p>` : `<p class="dec-riv">Comparée aux entreprises de son secteur.</p>`}`) : ""}
    ${sec("Son actualité", `<div class="dec-actu" data-dec-actu="${esc(s.id)}"><p class="dec-riv">Chargement des dernières annonces…</p></div>`)}
    ${vig.length ? sec("Ce qu'il faut surveiller", `<ul class="dec-vig">${vig.map(t => `<li>${t}</li>`).join("")}</ul>`) : ""}
    ${sec("La suite", `${ev.length ? `<ul class="dec-ev">${ev.map(e => `<li><b>${new Date(e.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</b> ${esc(e.label || e.type || "")}</li>`).join("")}</ul>` : `<p class="dec-riv">Aucune date annoncée pour le moment.</p>`}
      <div class="dec-act"><a class="ek-btn dk" href="/entreprise/${esc(s.id)}">Toute la fiche de ${esc(s.name)} →</a>${riv.length >= 2 ? `<a class="ek-btn" href="/comparer?ids=${esc([s.id, ...riv.slice(0, 2).map(r => r.id)].join(","))}">La comparer à ses rivales</a>` : ""}</div>`)}
    <p class="dec-regle">Sources : comptes annuels publiés par l'entreprise${c.sources && c.sources[0] && c.sources[0].report ? ` (<a href="${esc(c.sources[0].report)}" target="_blank" rel="noopener">rapport officiel</a>)` : ""}, Wikidata pour l'identité. Comment elle est choisie : ${esc(DEC_REGLE)}</p></div>`;
}
function decSemaine(t = Date.now()) { // semaine ISO, « 2026-W45 »
  const d = new Date(t); d.setUTCHours(12, 0, 0, 0); d.setUTCDate(d.getUTCDate() + 3 - (d.getUTCDay() + 6) % 7);
  const j1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4)); return `${d.getUTCFullYear()}-W${String(1 + Math.round(((d - j1) / 864e5 - 3 + (j1.getUTCDay() + 6) % 7) / 7)).padStart(2, "0")}`;
}
// Carte de l'accueil : l'essentiel, puis la présentation complète sur /decouverte
function decCarte(s) {
  const v = valo(s) || {}, M = f4M(s), sym = F4_SYM(s.currency).trim();
  const K = [s.ca > 0 ? [`Ventes ${s.year}`, f4Md(s.ca, s.currency), M.g != null ? `${M.g >= 0 ? "+" : "−"}${ekFr(Math.abs(M.g * 100), 1)} % sur un an` : ""] : null,
    M.nm != null ? [M.nm < 0 ? "Perte" : "Bénéfice", `${ekFr(Math.abs(M.nm * 100), 0)} ${sym}`, `${M.nm < 0 ? "perdus" : "gardés"} sur 100 ${sym} de ventes`] : null,
    v.capE ? ["Valeur en Bourse", f4Md(v.capE / 1e6, "EUR"), decTaille(v.capE)] : null].filter(Boolean);
  return `<div class="ek dec-card"><a class="dec-cl" href="/decouverte">
    <div class="dec-head">${f4Logo(s, null)}<div><h3>${esc(s.name)}</h3><p>${esc(secName(s))} · ${esc(regName(s) || "")}</p></div></div>
    <p class="dec-desc">${esc(s.desc)}</p>
    <div class="dec-faits">${K.map(([k, t, d]) => `<div><small>${esc(k)}</small><b>${esc(t)}</b>${d ? `<em>${esc(d)}</em>` : ""}</div>`).join("")}</div>
    <span class="dec-go">Lire sa présentation complète →</span></a></div>`;
}
async function decAccueil(el) {
  if (!el || el.dataset.ok) return; el.dataset.ok = "1";
  try { await (typeof PXP !== "undefined" ? PXP : null); } catch (e) { }
  const s = decChoix(decSemaine()); if (!s || !el.isConnected) { if (el.isConnected) el.remove(); return; }
  el.innerHTML = `<span class="a4-stk a4-ye">La découverte de la semaine</span><h2>Une entreprise à connaître.</h2>${decCarte(s)}
    <p class="a4-plus"><a href="/decouverte">La présentation complète →</a><a href="/decouverte#avant">Les semaines précédentes →</a></p>`;
}
async function pageDecouverte() {
  setTitle("La découverte de la semaine"); if (typeof setNav === "function") setNav("ent");
  app.innerHTML = `<div class="ek ek-page"><div class="empty">Chargement…</div></div>`;
  try { await Promise.all([typeof PXP !== "undefined" ? PXP : null, typeof loadFiches === "function" ? loadFiches() : null]); } catch (e) { }
  const sem = decSemaine(), s = decChoix(sem), h = s ? await decHTML(sem).catch(() => "") : "";
  if (location.pathname !== "/decouverte") return;
  const avant = [1, 2, 3, 4, 5, 6].map(k => decChoix(decSemaine(Date.now() - k * 7 * 864e5))).filter(Boolean);
  setTimeout(() => decActu(), 0);
  app.innerHTML = `<div class="ek ek-page dc4"><section class="ek-hero dc4-hero"><span class="mc-stk">La découverte de la semaine</span>
      <h1 class="ag4-t">${s ? esc(s.name) + "." : "Une entreprise à connaître."}</h1>
      <p class="mc-sub">Chaque semaine, une entreprise moins connue, présentée en détail : ce qu'elle fait, ses comptes face à ses rivales, ce qui l'attend. Pour apprendre à lire une entreprise, pas pour l'acheter.</p></section>
    ${h ? `<section class="ek-sec dc4-pres">${h}</section>` : `<p class="ek-note">La découverte de la semaine n'a pas pu être préparée pour le moment.</p>`}
    ${avant.length ? `<section class="ek-sec" id="avant"><span class="ek-stk2 b">Les semaines précédentes</span><h2>Déjà présentées.</h2><div class="dc4-av">${avant.map(c => `<a href="/entreprise/${esc(c.id)}">${f4Logo(c, null, true)}<span><b>${esc(c.name)}</b><small>${esc(secName(c))} · ${esc(regName(c) || "")}</small></span></a>`).join("")}</div></section>` : ""}</div>`;
}
// Les annonces officielles (90 jours) et les articles de presse qui la concernent, avec leur lien
function decActu() {
  const el = document.querySelector("[data-dec-actu]"); if (!el || typeof actuCo !== "function") { if (el) el.innerHTML = `<p class="dec-riv">Aucune annonce repérée.</p>`; return; }
  const id = el.dataset.decActu;
  actuCo(id).then(j => {
    const o = (j.o || []).slice(0, 4), pr = (j.p || []).slice(0, 4);
    const off = o.length ? `<div class="dec-ax">${o.map(it => `<div class="dec-axd">${it.d ? `<span>${esc(new Date(String(it.d).slice(0, 10) + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }))}</span>` : ""}` + (typeof axCarte === "function" ? axCarte(it) : `<a href="${esc(it.u || it.url || "#")}" target="_blank" rel="noopener">${esc(it.t || it.title || "")}</a>`) + "</div>").join("")}</div>` : "";
    const pre = pr.length && typeof presseHTML === "function" ? `<div class="dec-pr"><p class="dec-prt">Dans la presse</p>${presseHTML(pr, 4)}</div>` : "";
    el.innerHTML = off || pre ? off + pre + `<p class="dec-liens"><a href="/entreprise/${esc(id)}/actualite">Toute son actualité →</a></p>` : `<p class="dec-riv">Aucune annonce officielle ni article repéré ces 90 derniers jours.</p>`;
  }).catch(() => { el.innerHTML = `<p class="dec-riv">L'actualité n'est pas disponible pour le moment.</p>`; });
}
if (typeof ROUTES_EXTRA !== "undefined") {
  ROUTES_EXTRA.unshift([/^\/decouverte\/?$/, () => pageDecouverte()]);
  ROUTES_EXTRA.unshift([/^\/decouvertes\/?$/, () => { history.replaceState({}, "", "/decouverte"); pageDecouverte(); }]); // ancienne sélection quotidienne
}
// L'accueil est écrit par innerHTML : on remplit la section dès qu'elle apparaît.
(function () {
  const voir = () => document.querySelectorAll("#acc-dec:not([data-ok])").forEach(decAccueil);
  new MutationObserver(voir).observe(document.documentElement, { childList: true, subtree: true });
})();
