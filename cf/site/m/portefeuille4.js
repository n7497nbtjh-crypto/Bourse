/* ---------- Mon portefeuille v4 (3/11/2026), même direction que les outils v4 ----------
   /portefeuille. Le module m/portefeuille.js (calculs, saisie, import, plis) reste en place ; cette couche :
   - met le résultat en titre du bandeau jaune (« 5 497 € aujourd'hui. » + plus-value, sur combien investi) ;
   - habille la page en v4 (classe .ek.ek-page.pf4 sur #pf3, CSS pf4 dans composants.css) : chiffres clés en cartes,
     lignes en tableau clair, et les onze blocs du tableau de bord en tuiles (titre + chiffre clé) : une tuile ouverte
     prend toute la largeur ; la rangée de pastilles de navigation, devenue inutile, est masquée.
   Remplace pagePortefeuille (enveloppe) et pf3Hero (enveloppe). */
const PF4_page0 = window.pagePortefeuille, PF4_hero0 = window.pf3Hero;
window.pf3Hero = function (R0, P) {
  const r = PF4_hero0.apply(this, arguments);
  try {
    const hb = $("#pf3hero"); if (hb) hb.classList.remove("panel"); // les chiffres clés en cartes, sans cadre autour
    const h = $("#pf3 h1.pagetitle"), s = $("#pf3 .pagesub"), T = R0 && R0.T, nb = s0 => String(s0).replace(/ /g, " ");
    if (h && s) {
      if (P && P.l && P.l.length && T && T.tot > 0) {
        h.textContent = nb(`${pf3Eu(T.tot)} aujourd'hui.`);
        pf4Donut(R0, s); // 4/11 (refonte) : la répartition en anneau dans le bandeau
        // 4/11 (Romain) : mettre en avant la notification quand une valeur chute
        if (!P.dem && !$("#pf4chute")) s.insertAdjacentHTML("afterend", typeof isPrem === "function" && isPrem()
          ? `<p class="pf4-chute" id="pf4chute"><span aria-hidden="true">🔔</span> <span>Une de vos lignes chute de plus de 5 % ? Vous recevez une notification le soir même. <a href="/espace/reglages">Notifications sur ce téléphone</a></span></p>`
          : `<p class="pf4-chute" id="pf4chute"><span aria-hidden="true">🔔</span> <span><b>Une de vos lignes chute de plus de 5 % ?</b> Avec Premium, ENKLAIR vous envoie une notification le soir même. <a href="/premium#alertes">Être prévenu</a></span></p>`);
        s.innerHTML = `${T.gainPct == null ? "Plus-value inconnue (cours manquants)" : `<b>${pf3Sg(T.gain)}</b> (${pf3Pc(T.gainPct)}) si vous vendiez aujourd'hui`}, sur ${pf3Eu(T.cost)} investis${T.dayN ? `, ${pf3Sg(T.day)} depuis hier` : ""}. ${P.dem ? "Portefeuille d'exemple : rien n'est enregistré." : `Calculé dans ce navigateur${typeof connecte === "function" && connecte() ? " et enregistré dans votre espace" : ""}.`}`;
      } else {
        h.textContent = "Ce que vous possédez vraiment.";
        s.textContent = "Ajoutez vos actions et vos ETF : la valeur aux cours du jour, votre plus ou moins-value, vos frais, vos dividendes et ce que contiennent vraiment vos ETF. Tout est calculé dans ce navigateur.";
      }
    }
  } catch (e) { }
  return r;
};
/* 4/11 (Romain : « plus visuel, plus sympa, plus facile pour mettre ses lignes ») : anneau des lignes dans le bandeau,
   bouton « Ajouter une ligne », saisie raccourcie (frais, courtier, date et PRU direct repliés), lignes en cartes (CSS .pf4). */
function pf4Donut(R0, sub) {
  let d = $("#pf4don");
  if (!d) { sub.insertAdjacentHTML("afterend", `<div id="pf4don" class="pf4-don"></div>`); d = $("#pf4don"); }
  const L = (R0.live || []).filter(r => r.valE > 0).sort((a, b) => b.valE - a.valE), tot = L.reduce((x, r) => x + r.valE, 0);
  if (!L.length || !tot) { d.innerHTML = ""; return; }
  const top = L.slice(0, 6), reste = L.slice(6).reduce((x, r) => x + r.valE, 0);
  const parts = [...top.map((r, i) => ({ label: r.info.name, w: r.valE / tot, c: PF3_PAL[i % PF3_PAL.length], v: r.valE })), ...(reste > 0 ? [{ label: `${L.length - 6} autres`, w: reste / tot, c: PF3_OTHER, v: reste }] : [])];
  d.innerHTML = `<div class="pf4-dg">${pf3Donut(parts, String(L.length), L.length > 1 ? "lignes" : "ligne")}</div>
    <div class="pf4-dl">${parts.map(p => `<div><i style="background:${p.c}"></i><span>${esc(p.label)}</span><b>${pct(p.w, p.w < 0.1 ? 1 : 0, false)}</b></div>`).join("")}
    <button type="button" class="ek-btn dk pf4-addb" data-pf4-add>＋ Ajouter une ligne</button></div>`;
}
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-pf4-add]"); if (!b) return;
  const box = $("#pf3lines"), q = $("#pfq"); if (box) box.scrollIntoView({ behavior: "smooth", block: "start" }); if (q) setTimeout(() => q.focus(), 350); });
// Saisie raccourcie : le titre, le nombre de parts, le prix et le compte ; le reste replié (ouvert si déjà rempli)
let PF4_PLUS = false;
if (typeof pf3Form === "function") { const PF4_form0 = pf3Form; pf3Form = function () { const r = PF4_form0.apply(this, arguments); try { pf4FormCourt(); } catch (e) { } return r; }; }
function pf4FormCourt() {
  const n = $("#pf3new"); if (!n || n.dataset.pf4) return; n.dataset.pf4 = "1"; n.classList.add("pf4-new");
  const st = $$(".pf3st", n), opt = $(".pf3opt", n), hint = $(".pf3hint", n), F = PF3S.form || {};
  const plus = document.createElement("details"); plus.className = "pf4-plus"; plus.open = PF4_PLUS || !!(F.f || F.br || F.d || F.mode === "pru");
  plus.innerHTML = `<summary>Frais, courtier, date d'achat, PRU de votre courtier (facultatif)</summary><div class="pf4-pi"></div>`;
  plus.ontoggle = () => { PF4_PLUS = plus.open; };
  const pi = plus.querySelector(".pf4-pi");
  if (st[3]) pi.appendChild(st[3]); // frais et courtier
  const dt = opt && $("#pf3nd", opt); if (dt) pi.appendChild(dt.closest("label"));
  const brx = opt && $("#pf3nbr", opt); if (brx && !pi.contains(brx)) pi.appendChild(brx.closest("label"));
  if (hint) pi.appendChild(hint);
  const pru = $("#pf3nprev", n); if (pru) pru.insertAdjacentElement("beforebegin", plus); else n.appendChild(plus);
}
/* 4/11 (Romain) : achat, vente et dividende repérables d'un coup d'œil dans les opérations d'une ligne */
if (typeof pf3DetBind === "function") { const PF4_det0 = pf3DetBind; pf3DetBind = function () { const r = PF4_det0.apply(this, arguments); try { pf4Ops(); } catch (e) { } return r; }; }
function pf4Ops() {
  $$("#pf3 .pf3ot tbody tr").forEach(tr => { const td = tr.children[1]; if (!td || td.dataset.pf4) return; td.dataset.pf4 = "1";
    const t = td.textContent.trim(), k = /^Achat/.test(t) ? "a" : /^Vente/.test(t) ? "v" : /^Dividende/.test(t) ? "d" : "o";
    td.innerHTML = `<span class="pf4-op pf4-op-${k}">${k === "a" ? "▲" : k === "v" ? "▼" : k === "d" ? "€" : "•"} ${esc(t)}</span>`; tr.classList.add("pf4-tr-" + k); });
}
/* 4/11 (Romain : « revois le visuel de ces encadrés et leur contenu ») : chaque tuile du tableau de bord dit ce qu'elle contient,
   avec une icône et une couleur ; le chiffre clé reste en pastille. */
const PF4_TUILES = {
  "pf3-possede": ["#FFE14D", "M4 7h16v13H4zM9 7V4h6v3", "Les entreprises que vous détenez à travers vos ETF, réunies avec vos actions."],
  "pf3-repartition": ["#BFE9FF", "M12 3v9l7 5M12 12L5 17M12 3a9 9 0 1 0 .01 0", "Pays, secteurs, devises et comptes : où est vraiment votre argent."],
  "pf3-diversification": ["#C9F2DD", "M4 20V10M10 20V4M16 20v-7M22 20H2", "Une note sur 100 : concentration, nombre de lignes, pays, secteurs."],
  "pf3-frais": ["#FFD7C9", "M12 3v18M17 7H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6", "Frais des ETF et courtage chaque année, et ce qu'ils coûtent sur dix ans."],
  "pf3-pea": ["#E5DCFF", "M5 4h14v16H5zM5 9h14M9 4v5", "La date des cinq ans de votre PEA et ce qu'il vous reste à verser."],
  "pf3-dividendes": ["#FFE14D", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 10h6M9 14h6", "Ce que vos lignes devraient vous verser sur douze mois, mois par mois."],
  "pf3-risque": ["#FFD0C4", "M12 3l9 17H3zM12 10v4M12 17h.01", "Ce qu'une baisse de 10, 20 ou 30 % coûterait, en euros."],
  "pf3-alertes": ["#FFF1B8", "M12 4a6 6 0 0 1 6 6v4l2 3H4l2-3v-4a6 6 0 0 1 6-6zM10 20h4", "Ce qui mérite un coup d'œil : une ligne trop lourde, un compte mal choisi…"],
  "pf3-analyse": ["#DDE6FF", "M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z", "Votre portefeuille résumé en quelques phrases, calculées sur vos chiffres."],
  "pf3-dates": ["#C9F2DD", "M4 5h16v15H4zM4 9h16M8 3v4M16 3v4", "Résultats, dividendes et assemblées de vos entreprises à venir."],
  "pf3-partage": ["#EFEFEA", "M15 5l5 5-5 5M20 10H9a5 5 0 0 0-5 5v4", "Un lien vers la répartition de votre portefeuille, sans montants ni nom."]
};
function pf4Tuiles() {
  $$(".ek.pf4 #pf3dash>details.pf3pl").forEach(d => {
    const T = PF4_TUILES[d.id], s0 = d.querySelector(":scope>summary"); if (!T || !s0 || s0.querySelector(".pf4-ti")) return;
    d.style.setProperty("--pf4c", T[0]);
    s0.insertAdjacentHTML("afterbegin", `<span class="pf4-ti" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${T[1]}"/></svg></span>`);
    const h = s0.querySelector("h2"); if (h) h.insertAdjacentHTML("afterend", `<span class="pf4-td">${esc(T[2])}</span>`);
  });
}
if (typeof pf3Dash === "function") { const PF4_dash1 = pf3Dash; pf3Dash = async function () { const r = await PF4_dash1.apply(this, arguments); try { pf4Tuiles(); } catch (e) { } return r; }; }
/* 4/11 (Romain : « affiche toutes les performances et mets-les plus en valeur ») : la plus ou moins-value en grand sur chaque
   carte, la variation du jour en pastille ; une ligne sans cours sur le site le dit (au lieu d'un tiret) et propose de saisir le cours. */
if (typeof pf3List === "function") { const PF4_list0 = pf3List; pf3List = function () { const r = PF4_list0.apply(this, arguments); try { pf4Perf(); } catch (e) { } return r; }; }
function pf4Perf() {
  $$("#pf3 .pf3r").forEach(row => {
    const b = row.querySelector(".pf3rb"); if (!b || b.dataset.pf4) return; b.dataset.pf4 = "1";
    const g = b.querySelector(".c-g"), px = b.querySelector(".c-px small"), v = b.querySelector(".c-v");
    if (px && v && px.classList.contains("vl")) v.insertAdjacentHTML("beforeend", `<span class="pf4-jour pf4-vl" title="${esc(px.title)}">${esc(px.textContent.trim())}</span>`);
    else if (px && v && /[+−-]\d/.test(px.textContent)) v.insertAdjacentHTML("beforeend", `<span class="pf4-jour ${px.className}">${esc(px.textContent.trim())} aujourd'hui</span>`);
    if (g && !g.querySelector("b")) { g.classList.add("pf4-nc"); g.innerHTML = /montant/.test(g.textContent) ? `<b>?</b><small>montant seul</small>` : `<b>Pas de cours</b><small>sur le site</small>`; g.title = "Le site n'a pas de cours pour ce titre : ouvrez la ligne pour saisir le cours actuel."; }
  });
}
window.pagePortefeuille = async function () {
  const r = await PF4_page0.apply(this, arguments);
  const el = $("#pf3"); if (el) el.classList.add("ek", "ek-page", "pf4");
  return r;
};

/* 4/11 (Premium) : la radiographie détaillée est réservée à Premium. Sans Premium (4/11 : plus de demi-version), chaque tuile garde son titre, sans son chiffre clé ; le détail de quatre tuiles est remplacé par ce qu'il contient et le lien vers Premium.
   Le portefeuille d'exemple reste entièrement ouvert, pour montrer ce que l'on obtient. */
const PF4_PREM = {
  "pf3-possede": "Ce que vous possédez vraiment à travers vos ETF : les entreprises qui reviennent dans plusieurs fonds, réunies, et votre vraie part dans chacune.",
  "pf3-repartition": "Vos expositions par pays, secteur, devise, type et compte, ligne par ligne et à travers le contenu de vos ETF.",
  "pf3-risque": "Ce qu'une baisse de 10, 20 ou 30 % coûterait en euros, ligne par ligne, et les lignes qui pèsent le plus dans le risque.",
  "pf3-dividendes": "Le calendrier de vos dividendes des 12 prochains mois : date, montant attendu par ligne et total par mois."
};
function pf4Verrou(P) {
  if ((typeof isPrem === "function" && isPrem()) || (P && P.dem)) return;
  for (const [id, txt] of Object.entries(PF4_PREM)) {
    const d = document.getElementById(id); if (!d || d.dataset.pf4v) continue;
    d.dataset.pf4v = "1"; d.classList.add("pf4v");
    const s = d.querySelector(":scope>summary"); if (!s) continue;
    [...d.children].forEach(c => { if (c !== s) c.remove(); });
    s.insertAdjacentHTML("beforeend", `<span class="pf4v-b">🔒 Avec Premium</span>`);
    d.insertAdjacentHTML("beforeend", `<div class="pf4v-c"><p>${esc(txt)}</p><p class="pf4v-l">Calculé sur votre portefeuille, avec Premium, comme les alertes sur toutes vos valeurs et les classements complets.</p><a class="ek-btn dk" href="/premium#portefeuille">Voir Premium</a></div>`);
  }
}
if (typeof pf3Dash === "function") { const PF4_dash0 = pf3Dash; pf3Dash = async function (R0, P) { const r = await PF4_dash0.apply(this, arguments); try { pf4Verrou(P); } catch (e) { } return r; }; }
