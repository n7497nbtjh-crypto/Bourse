/* ---------- Fiche entreprise v4 : « L'année en cours » (4/11/2026, maquette validée docs/maquettes/fiche-trimestres-v5.html) ----------
   Placée juste sous le bandeau jaune (#f4-annee), seulement si l'entreprise a publié des trimestres après ses derniers comptes annuels.
   Données : /data/trim/<id>.json (comptes trimestriels déposés à la SEC, 24 trimestres, data/sec_trim.mjs ; le 4e trimestre est déduit).
   1) les trimestres de l'année en cours l'un après l'autre, avec ce qui se passe d'habitude à cette saison (médiane des années précédentes) ;
   2) à part, l'année face aux années précédentes : les mois écoulés, ou le dernier trimestre seul s'il raconte autre chose.
   Trois onglets : ventes, bénéfice net, marge nette. Le verdict de la fiche reste calculé sur les comptes annuels audités. */

function an4Cause(x, j) {
  const c = x.c, n = c.years.length, Y = c.years[n - 1], net = (c.fin || {}).net || [], a = net[n - 1], b = net[n - 2];
  if (a == null || b == null || c.years[n - 2] !== Y - 1 || !(Math.abs(b) > 0)) return;
  const tot = a - b; if (Math.abs(tot / b) < 0.25) return;
  const fe = /^\d{2}-\d{2}$/.test(c.fyEnd || "") ? c.fyEnd : "12-31", J = 864e5;
  const ex = y => { const E = new Date(`${y}-${fe}T12:00:00Z`); return (j.q || []).filter(q => q && q.end && q.net != null && new Date(q.end + "T12:00:00Z") - E <= 20 * J && E - new Date(q.end + "T12:00:00Z") < 345 * J).sort((u, v) => u.end < v.end ? -1 : 1); };
  const A = ex(Y), B = ex(Y - 1); if (A.length !== 4 || B.length !== 4) return;
  const som = L => L.reduce((t, q) => t + q.net, 0); if (Math.abs(som(A) - a) > Math.abs(a) * 0.02 + 1 || Math.abs(som(B) - b) > Math.abs(b) * 0.02 + 1) return;
  const d = A.map((q, k) => q.net - B[k].net), k = d.reduce((m, v, i) => v * Math.sign(tot) > d[m] * Math.sign(tot) ? i : m, 0), part = d[k] / tot;
  if (part < 0.5) return;
  const M = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"], fin = A[k].end, cur = c.currency;
  const baisse = tot < 0, cause = { titre: `Un trimestre fait l'essentiel de la ${baisse ? "baisse" : "hausse"}`,
    texte: `Sur le trimestre clos fin ${M[+fin.slice(5, 7) - 1]} ${fin.slice(0, 4)}, son bénéfice a été de ${f4Md(A[k].net, cur)}, contre ${f4Md(B[k].net, cur)} un an plus tôt : ${part >= 0.95 ? "à lui seul, il fait tout l'écart sur l'année (les autres trimestres se compensent)" : `à lui seul, ${ekFr(part * 100, 0)} % de l'écart sur l'année`}. Les comptes trimestriels ne disent pas pourquoi ; le communiqué de résultats de ce trimestre l'explique.` };
  const st = document.getElementById(x.bk ? "e1" : "e3"); if (!st || st.querySelector("[data-an4-cause]")) return;
  const html = `<div class="ek-cz" data-an4-cause><b>✦</b><strong>${ekEsc(cause.titre)}</strong><p>${ekEsc(cause.texte)}</p></div>`;
  const why = st.querySelector(".ek-why");
  if (why) { const h = why.querySelector(".ek-wh"); h.insertAdjacentHTML("afterend", html); return; }
  const side = st.querySelector(".ek-side"); if (!side) return;
  side.classList.remove("ek-side-seul"); side.insertAdjacentHTML("afterbegin", `<div class="ek-why"><p class="ek-wh">Ce qui l'explique</p>${html}</div>`);
}

/* 5/11 (maquette validée docs/maquettes/fiche-trimestres-v6.html) : « Ses derniers trimestres ». Une structure valable à toute date :
   toujours les QUATRE DERNIERS TRIMESTRES PUBLIÉS, chacun face au même trimestre un an plus tôt (barres grise et jaune, l'année écrite
   sous chaque barre), et le total des douze derniers mois face aux douze mois d'avant. Onglets Ventes / Bénéfice net / Marge nette.
   Remplace « L'année en cours » (v5, qui dépendait du nombre de trimestres écoulés). */
const TQ_M = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function tqNom(end) { // mois du trimestre d'après sa date de fin (10 jours retirés : un exercice de 52 semaines finit parfois début janvier)
  const d = new Date(end + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - 10); const f = d.getUTCMonth(), dd = (f + 10) % 12, y = d.getUTCFullYear(); return { m: `${TQ_M[dd]}-${TQ_M[f]}`, y, yd: dd > f ? y - 1 : y, deb: dd, fin: f }; }
function tqSerie(j) { // les 4 derniers trimestres et, pour chacun, le même trimestre un an plus tôt (à 20 jours près)
  const J = 864e5, Q = (j.q || []).filter(q => q && q.end && q.ca != null).sort((a, b) => a.end < b.end ? -1 : 1);
  const dedans = Q.filter((q, i) => i === Q.length - 1 || q.end !== Q[i + 1].end);
  const ap = dedans.slice(-4); if (ap.length < 4) return null;
  // 10/11 : dernier trimestre de plus de 10 mois (ex. Honda, 2014) : rien plutôt qu'un ancien chiffre présenté comme récent
  if (Date.now() - new Date(ap[3].end + "T12:00:00Z") > 300 * J) return null;
  const av = ap.map(q => { const t = new Date(q.end + "T12:00:00Z") - 365.25 * J; return dedans.find(p => Math.abs(new Date(p.end + "T12:00:00Z") - t) <= 20 * J) || null; });
  if (av.some(q => !q)) return null;
  for (let i = 1; i < 4; i++) { const g = (new Date(ap[i].end) - new Date(ap[i - 1].end)) / J; if (g < 75 || g > 105) return null; }
  return { ap, av };
}
async function f4Annee(x) {
  const el = document.getElementById("f4-annee"); if (!el || !x || !x.c) return; // SEC, communiqués AMF (data/trim_eu.mjs) ou trimestres Eulerpool contrôlés
  let j = null; try { j = await fetch(`/data/trim/${x.s.id}.json`).then(r => r.ok ? r.json() : null); } catch (e) { }
  if (!j || (j.currency && x.c.currency && j.currency !== x.c.currency) || window.F4X !== x) return;
  try { an4Cause(x, j); } catch (e) { }
  const T = tqSerie(j); if (!T) return;
  const avecNet = [...T.ap, ...T.av].every(q => q.net != null);
  const metr = x.bk ? (avecNet ? ["net"] : []) : avecNet ? ["ca", "net", "mg"] : ["ca"]; if (!metr.length) return;
  x.an4 = { T, j, M: metr[0], metr };
  an4Dessiner(x);
}

function an4Dessiner(x) {
  const el = document.getElementById("f4-annee"), S = x.an4, { T, j } = S, M = S.M, cur = x.c.currency || x.s.currency, nomE = x.s.name;
  const val = (q, m) => m === "ca" ? q.ca : m === "net" ? q.net : q.ca > 0 && q.net != null ? q.net / q.ca * 100 : null;
  const tot = (L, m) => m === "mg" ? L.reduce((a, q) => a + q.net, 0) / L.reduce((a, q) => a + q.ca, 0) * 100 : L.reduce((a, q) => a + val(q, m), 0);
  const fmt = (v, m) => v == null || !isFinite(v) ? "–" : m === "mg" ? ekFr(v, 1) + " %" : f4Md(v, cur);
  const ev = (a, b, m) => a == null || b == null ? null : m === "mg" ? a - b : b > 0 ? (a / b - 1) * 100 : null;
  const evT = (e, m) => e == null ? "" : `${e >= 0 ? "+" : "−"}${ekFr(Math.abs(e), 1)}${m === "mg" ? " pt" : " %"}`;
  const ton = e => e == null ? "" : e >= 0 ? "" : " dn";
  const tA = tot(T.ap, M), tV = tot(T.av, M), e = ev(tA, tV, M);
  const n0 = tqNom(T.ap[0].end), n3 = tqNom(T.ap[3].end), p0 = tqNom(T.av[0].end), p3 = tqNom(T.av[3].end);
  const per = (a, b) => `${a.m.split("-")[0]} ${a.yd} à ${b.m.split("-")[1]} ${b.y}`;
  const de = /^[aeiouyhéèêâîôûAEIOUYHÉÈÊÂÎÔÛ]/.test(nomE) ? `d'${nomE}` : `de ${nomE}`, quoi = { ca: `les ventes ${de} ont`, net: `le bénéfice ${de} a`, mg: "" }[M];
  const titre = M === "mg" ? `Sur les 12 derniers mois, ${esc(nomE)} a gardé <em class="${e != null && e < 0 ? "dn" : ""}">${ekFr(tA, 1)} %</em> de ses ventes en bénéfice.`
    : tV > 0 && tA < 0 ? `Sur les 12 derniers mois, ${esc(quoi.replace(/ (ont|a)$/, ""))} ${M === "ca" ? "sont devenues négatives" : "est devenu une perte"} : <em class="dn">${fmt(tA, M)}</em>, contre ${fmt(tV, M)} un an plus tôt.` // 6/11 : plus de « reculé de 240 % » (Kemper)
    : tV > 0 && Math.abs(e) < 0.5 ? `Sur les 12 derniers mois, ${esc(quoi)} <em>à peine bougé</em> (${evT(e, M)}).`
    : tV > 0 ? `Sur les 12 derniers mois, ${esc(quoi)} ${e >= 0 ? "progressé" : "reculé"} de <em class="${e < 0 ? "dn" : ""}">${ekFr(Math.abs(e), 0)} %</em>.`
    : `Sur les 12 derniers mois, ${esc(quoi)} atteint <em>${fmt(tA, M)}</em>.`;
  const eur = v => M !== "mg" && cur && cur !== "EUR" && typeof f4EnEur === "function" ? f4EnEur(v, cur).replace(/^ \(|\)$/g, "") : "";
  const LAB = { ca: "Ventes", net: "Bénéfice net", mg: "Marge nette" };
  const tabs = S.metr.length > 1 ? `<div class="tq-tabs" role="tablist">${S.metr.map(m => `<a href="#annee" role="tab" aria-selected="${m === M}" class="${m === M ? "on" : ""}" data-an4-m="${m}">${LAB[m]}</a>`).join("")}</div>` : "";
  const duo = `<div class="tq-duo"><div class="tq-now"><small>12 derniers mois (${per(n0, n3)})</small><b>${fmt(tA, M)}</b><i>${M === "mg" ? "de bénéfice sur 100 de ventes" : eur(tA)}</i></div>
    <div class="tq-fl">${e != null ? `<span class="tq-pill${ton(e)}">${evT(e, M)}</span><span>sur un an</span>` : ""}</div>
    <div><small>Les 12 mois d'avant (${per(p0, p3)})</small><b>${fmt(tV, M)}</b><i>${M === "mg" ? "de bénéfice sur 100 de ventes" : eur(tV)}</i></div></div>`;
  const vs = [...T.ap, ...T.av].map(q => val(q, M)), vmax = Math.max(...vs.map(v => Math.abs(v || 0))) || 1, neg = vs.some(v => v < 0);
  const h = v => v == null ? 0 : Math.max(2, Math.abs(v) / vmax * 100);
  const cols = T.ap.map((q, i) => { const a = val(T.av[i], M), b = val(q, M), d = ev(b, a, M), nq = tqNom(q.end), np = tqNom(T.av[i].end);
    return `<div class="tq-col${i === 3 ? " last" : ""}">${d != null ? `<span class="tq-pill sm${ton(d)}">${evT(d, M)}</span>` : `<span class="tq-pill sm vide">&nbsp;</span>`}
      <div class="tq-bars"><div class="tq-bar av${a < 0 ? " neg" : ""}" style="height:${h(a)}%"><span>${fmt(a, M)}</span></div><div class="tq-bar ap${b < 0 ? " neg" : ""}" style="height:${h(b)}%"><span>${fmt(b, M)}</span></div></div>
      <div class="tq-ans"><em class="av">${np.y}</em><em class="ap">${nq.y}</em></div><b>${nq.m}</b><small>${i === 3 ? "dernier publié" : "&nbsp;"}</small></div>`; }).join("");
  const tb = `<details class="tq-det"><summary>Les chiffres, trimestre par trimestre</summary><table><tr><th>Trimestre</th><th>${LAB[M]}</th><th>Un an plus tôt</th><th>Évolution</th></tr>${T.ap.map((q, i) => { const nq = tqNom(q.end); return `<tr><td>${nq.m} ${nq.y}</td><td>${fmt(val(q, M), M)}</td><td>${fmt(val(T.av[i], M), M)}</td><td>${evT(ev(val(q, M), val(T.av[i], M), M), M)}</td></tr>`; }).join("")}</table></details>`;
  const xs = T.ap.map((q, i) => ev(val(q, M), val(T.av[i], M), M)), d = xs[3], p = xs[2];
  const tend = d == null || p == null ? "" : M === "mg" ? (d > p ? "l'écart avec l'an dernier s'améliore" : "l'écart avec l'an dernier se réduit")
    : d >= 0 && p >= 0 ? (d < p - 1 ? "la hausse ralentit" : d > p + 1 ? "la hausse accélère" : "la hausse continue au même rythme")
    : d < 0 && p < 0 ? (d < p - 1 ? "la baisse s'accentue" : d > p + 1 ? "la baisse se réduit" : "la baisse continue") : d >= 0 ? "retour à la hausse" : "passage à la baisse";
  const dt = s => s ? new Date(s + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";
  const ep = j.fournisseur === "Eulerpool", amf = /AMF/.test(j.source || ""), dq = T.ap[3];
  const auj = new Date().toISOString().slice(0, 10), nx = (typeof AG !== "undefined" && AG.events || []).filter(v => v.id === x.s.id && v.date >= auj && /résultat|resultat|chiffre|trimestr/i.test((v.type || "") + " " + (v.label || ""))).sort((a, b) => a.date < b.date ? -1 : 1)[0];
  const der = `<div class="tq-der"><div><small>Le dernier trimestre (${n3.m} ${n3.y}${!ep && dq.filed ? `, publié le ${dt(dq.filed)}` : ""})</small>
      <p>${LAB[M]} : <b>${fmt(val(dq, M), M)}</b>${d != null ? `, soit <b class="${d >= 0 ? "up" : "dn"}">${evT(d, M)}</b> sur un an. Au trimestre d'avant : ${evT(p, M)}.${tend ? ` En clair : <b>${tend}</b>.` : ""}` : "."}</p></div>
    <div class="tq-nx"><small>Prochain trimestre attendu</small><b>${nx ? dt(nx.date) : "date pas encore annoncée"}</b><small>${nx ? esc(nx.label || "") : "Elle apparaîtra ici et dans l'agenda dès qu'elle sera connue."}</small></div></div>`;
  const lien = ep ? `<a href="https://eulerpool.com" target="_blank" rel="noopener">Data by Eulerpool ↗</a>` : amf ? (dq.u ? `<a href="${esc(dq.u)}" target="_blank" rel="noopener">Le dernier communiqué ↗</a>` : "") : "";
  const src = ep ? "Comptes trimestriels publiés par l'entreprise, fournis par Eulerpool, non audités." : amf ? "Chiffres d'affaires lus dans les communiqués déposés à l'AMF, non audités." : "Comptes trimestriels déposés à la SEC (formulaires 10-Q et 10-K), non audités.";
  el.innerHTML = `<section class="ek-sec an4 tq" id="annee"><span class="ek-stk2 b">Ses derniers trimestres</span><h2 class="tq-t">${titre}</h2>${tabs}${duo}
    <div class="tq-box"><h3>Chaque trimestre, face au même trimestre un an plus tôt</h3><div class="tq-cols${neg ? " tq-neg" : ""}">${cols}</div>${tb}</div>
    ${der}<p class="ek-tn">${src}${cur && cur !== "EUR" && M !== "mg" ? " Équivalent en euros au taux de la BCE du jour." : ""} Le verdict de la fiche reste calculé sur les comptes annuels. ${lien}</p></section>`;
}

document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-an4-m],[data-an4-c]"), x = window.F4X; if (!b || !x || !x.an4) return; e.preventDefault();
  if (b.dataset.an4M) x.an4.M = b.dataset.an4M;
  an4Dessiner(x);
});
