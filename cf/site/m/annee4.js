/* ---------- Fiche entreprise v4 : « L'année en cours » (4/11/2026, maquette validée docs/maquettes/fiche-trimestres-v5.html) ----------
   Placée juste sous le bandeau jaune (#f4-annee), seulement si l'entreprise a publié des trimestres après ses derniers comptes annuels.
   Données : /data/trim/<id>.json (comptes trimestriels déposés à la SEC, 24 trimestres, data/sec_trim.mjs ; le 4e trimestre est déduit).
   1) les trimestres de l'année en cours l'un après l'autre, avec ce qui se passe d'habitude à cette saison (médiane des années précédentes) ;
   2) à part, l'année face aux années précédentes : les mois écoulés, ou le dernier trimestre seul s'il raconte autre chose.
   Trois onglets : ventes, bénéfice net, marge nette. Le verdict de la fiche reste calculé sur les comptes annuels audités. */
const AN4_FL = '<svg viewBox="0 0 64 32" width="64" height="32" aria-hidden="true"><path d="M3 16h50M40 4l14 12-14 12" fill="none" stroke="#111" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const AN4_QN = ["1er trimestre", "2e trimestre", "3e trimestre", "4e trimestre"], AN4_QC = ["1er", "2e", "3e", "4e"];
const AN4_MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

// Grille de l'exercice en cours et des précédents : G[n][k] = { ca, net, end, filed } (n = 0 pour l'exercice en cours, k = trimestre)
function an4Grille(c, j) {
  const Y = c.years[c.years.length - 1], fe = /^\d{2}-\d{2}$/.test(c.fyEnd || "") ? c.fyEnd : "12-31";
  const E = new Date(`${Y}-${fe}T12:00:00Z`), J = 864e5, Q = (j.q || []).filter(q => q && q.end);
  const proche = (cible) => Q.find(q => Math.abs(new Date(q.end + "T12:00:00Z") - cible) <= 20 * J) || null;
  const plus = (d, m) => { const x = new Date(d); x.setUTCMonth(x.getUTCMonth() + m); return x; };
  const cur = Q.filter(q => new Date(q.end + "T12:00:00Z") - E > 20 * J); // 4 trimestres : l'exercice est clos, la fiche attend ses comptes annuels
  if (!cur.length || cur.length > 3) return null;
  if (!cur.length) return null;
  const G = [];
  for (let n = 0; n <= 5; n++) G.push([0, 1, 2, 3].map(k => { const q = proche(plus(E, 3 * (k + 1) - 12 * n)); return q && q.ca != null ? q : null; }));
  // 4/11 (Unum) : une année dont les quatre trimestres ne redonnent pas les comptes annuels (comptes refaits après coup,
  // changement de norme) est écartée : sinon on compare des chiffres de deux versions différentes.
  for (let n = 1; n < G.length; n++) {
    const i = c.years.indexOf(Y - (n - 1)); if (i < 0 || G[n].some(q => !q)) continue;
    const ecart = (k, an) => { if (an == null || G[n].some(q => q[k] == null)) return false; const t = G[n].reduce((a, q) => a + q[k], 0); return Math.abs(t - an) > Math.max(Math.abs(an) * 0.02, 1); };
    if (ecart("ca", (c.fin.ca || [])[i]) || ecart("net", (c.fin.net || [])[i])) G[n] = [null, null, null, null];
  }
  const nbr = cur.length; if (G[0].slice(0, nbr).some(x => !x)) return null;
  return { G, n: nbr, Y: Y + 1, mois: AN4_MOIS[+fe.slice(0, 2) - 1], civil: fe.slice(0, 2) === "12" || (fe.slice(0, 2) === "01" && +fe.slice(3) <= 7) }; // exercice de 52 semaines clos début janvier = année civile
}

// 4/11 (Unum : « −58,5 % » expliqué par « son capital grandit… ») : quand un seul trimestre fait plus de la moitié de la
// variation du bénéfice sur l'année, l'étape du bénéfice le dit. Seulement si les quatre trimestres redonnent les comptes annuels.
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

async function f4Annee(x) {
  const el = document.getElementById("f4-annee"); if (!el || !x || !x.c) return; // SEC, communiqués AMF (data/trim_eu.mjs) ou trimestres Eulerpool contrôlés (data/eulerpool.mjs --trim)
  let j = null; try { j = await fetch(`/data/trim/${x.s.id}.json`).then(r => r.ok ? r.json() : null); } catch (e) { }
  if (!j || (j.currency && x.c.currency && j.currency !== x.c.currency) || window.F4X !== x) return;
  try { an4Cause(x, j); } catch (e) { }
  const A = an4Grille(x.c, j); if (!A) return;
  const avecNet = A.G[0].slice(0, A.n).every(q => q.net != null);
  const metr = x.bk ? (avecNet ? ["net"] : []) : avecNet ? ["ca", "net", "mg"] : ["ca"]; if (!metr.length) return;
  x.an4 = { A, j, M: metr[0], choix: null, metr };
  an4Dessiner(x);
}

function an4Dessiner(x) {
  const el = document.getElementById("f4-annee"), S = x.an4, { A, j } = S, n = A.n, cur = x.c.currency || x.s.currency, M = S.M;
  const val = (y, k, m) => { const q = A.G[y] && A.G[y][k]; if (!q) return null; return m === "ca" ? q.ca : m === "net" ? q.net : q.net != null && q.ca > 0 ? q.net / q.ca * 100 : null; };
  const cum = (y, kk, m) => { const r = A.G[y] && A.G[y].slice(0, kk); if (!r || r.some(q => !q || (m !== "ca" && q.net == null))) return null;
    const ca = r.reduce((s, q) => s + q.ca, 0), net = r.reduce((s, q) => s + (q.net || 0), 0); return m === "ca" ? ca : m === "net" ? net : ca > 0 ? net / ca * 100 : null; };
  const fmt = (v, m) => v == null ? "–" : m === "mg" ? ekFr(v, 1) + " %" : f4Md(v, cur);
  const ch = (a, b, m) => a == null || b == null ? null : m === "mg" ? a - b : b > 0 ? (a / b - 1) * 100 : null;
  const u = m => m === "mg" ? " pt" : " %", sg = (v, m) => `${v >= 0 ? "+" : "−"}${ekFr(Math.abs(v), 1)}${u(m)}`;
  const pill = (d, m, txt = "") => d == null ? "" : Math.abs(d) < .05 ? `<em class="n">= stable${txt}</em>` : `<em class="${Math.abs(d) < (m === "mg" ? .5 : 1) ? "n" : d > 0 ? "g" : "r"}">${d >= 0 ? "▲ +" : "▼ −"}${ekFr(Math.abs(d), 1)}${u(m)}${txt}</em>`;
  const LAB = { ca: ["les ventes", "Ventes", "atteignent"], net: ["le bénéfice", "Bénéfice net", "atteint"], mg: ["la marge", "Marge nette", "atteint"] };
  const an = y => A.civil ? String(A.Y - y) : `${A.Y - y}`, lib = A.civil ? `${A.Y}` : `l'exercice ${A.Y}`, mois = n * 3;
  const dt = d => d ? new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "";

  // titre : les ventes des mois écoulés face à la croissance du dernier exercice complet (comptes annuels de la fiche)
  const ca = x.c.fin && x.c.fin.ca || [], gA = ca.length > 1 && ca[ca.length - 2] > 0 ? (ca[ca.length - 1] / ca[ca.length - 2] - 1) * 100 : null;
  const gY = ch(cum(0, n, "ca"), cum(1, n, "ca"), "ca");
  const nbT = ["un trimestre", "deux trimestres", "trois trimestres"][n - 1];
  // 5/11 (Puma : « ses ventes accélèrent » avec −9 %) : le sens dépend du signe des deux croissances
  const verbe = x.bk || gY == null ? null : gA == null ? (gY >= 0 ? "ses ventes montent" : "ses ventes baissent")
    : gY >= 0 && gA >= 0 ? (gY > gA + 2 ? "ses ventes accélèrent" : gY < gA - 2 ? "ses ventes ralentissent" : "ses ventes gardent leur rythme")
    : gY < 0 && gA < 0 ? (gY > gA + 2 ? "ses ventes baissent moins vite" : gY < gA - 2 ? "ses ventes baissent plus vite" : "ses ventes continuent de baisser")
    : gY >= 0 ? "ses ventes repartent à la hausse" : "ses ventes se mettent à baisser";
  const titre = verbe ? `${A.civil ? A.Y : "Exercice " + A.Y} : <span>${verbe}</span> après ${nbT}.` : `${A.civil ? A.Y : "Exercice " + A.Y} : ${nbT} déjà publié${n > 1 ? "s" : ""}.`;

  // onglets
  const seg = S.metr.length > 1 ? `<p class="an4-segt">${mois} premiers mois de ${lib}, face aux ${mois} premiers mois ${A.civil ? "de " + (A.Y - 1) : "de l'exercice précédent"} <span>· cliquez pour changer le chiffre affiché</span></p>
    <div class="an4-seg" role="tablist" aria-label="Chiffre affiché" style="--n:${S.metr.length}">${S.metr.map(m => { const v = cum(0, n, m), d = ch(v, cum(1, n, m), m);
      return `<a href="#annee" role="tab" aria-selected="${m === M}" class="${m === M ? "sel" : ""}" data-an4-m="${m}"><span><i></i>${LAB[m][1]}</span><b>${fmt(v, m)}</b>${d != null ? `<em class="${d >= 0 ? "up" : "dn"}">${d >= 0 ? "▲ +" : "▼ −"}${ekFr(Math.abs(d), 1)}${u(m)}<span class="an4-sa"> sur un an</span></em>` : ""}<u>${m === M ? "✓ Affiché" : "Afficher →"}</u></a>`; }).join("")}</div>` : "";

  // 1) les trimestres de l'année l'un après l'autre
  const cards = [...Array(n).keys()].map(k => ({ k, v: val(0, k, M) })), mx = Math.max(...cards.map(c => c.v == null ? -Infinity : c.v));
  const tops = n > 1 ? cards.filter(c => c.v != null && c.v >= mx - Math.abs(mx) * .005).map(c => c.k) : [];
  const habit = k => { const r = [1, 2, 3, 4].map(y => ch(val(y, k, M), val(y, k - 1, M), M)).filter(v => v != null).sort((a, b) => a - b); if (r.length < 2) return null; const h = r.length >> 1; return r.length % 2 ? r[h] : (r[h - 1] + r[h]) / 2; };
  let seq = "", notes = [];
  cards.forEach((c, i) => {
    if (i) { const d = ch(c.v, cards[i - 1].v, M), h = habit(c.k); notes.push({ k: c.k, d, h });
      seq += `<div class="an4-ar"><small class="an4-arl">Du T${cards[i - 1].k + 1} au T${c.k + 1}</small><b>${AN4_FL}</b>${pill(d, M)}${h != null ? `<small>d'habitude<br><b>${sg(h, M)}</b></small>` : ""}</div>`; }
    const q = A.G[0][c.k];
    seq += `<div class="an4-q${tops.includes(c.k) ? " top" : ""}"><div class="an4-st">T${c.k + 1} · ${AN4_QN[c.k]}<small>${q.u ? `<a href="${esc(q.u)}" target="_blank" rel="noopener" title="Le communiqué">${esc(dt(q.filed))} ↗</a>` : esc(dt(q.filed))}${q.deduit ? " · déduit" : ""}</small></div><div class="an4-v">${fmt(c.v, M)}</div>${val(1, c.k, M) != null ? `<div class="an4-s"><span class="an4-av">${A.civil ? `T${c.k + 1} ${A.Y - 1}` : "Un an plus tôt"} : <b>${fmt(val(1, c.k, M), M)}</b></span>${pill(ch(c.v, val(1, c.k, M), M), M)}</div>` : ""}${tops.includes(c.k) ? `<span class="an4-tg">${tops.length > 1 ? "Le plus fort, à égalité" : `Le plus fort de ${A.civil ? A.Y : "l'exercice"}`}</span>` : ""}</div>`;
  });
  const TH = M === "mg" ? 1 : 3, hors = notes.filter(o => o.d != null && o.h != null).map(o => ({ ...o, e: o.d - o.h })).filter(o => Math.abs(o.e) >= TH).sort((a, b) => Math.abs(b.e) - Math.abs(a.e));
  const nm = k => `Du ${AN4_QC[k - 1]} au ${AN4_QN[k]}`, compar = notes.filter(o => o.d != null && o.h != null);
  const say1 = !compar.length ? "" : !hors.length ? `<p class="an4-say">Les variations d'un trimestre à l'autre <b>suivent le rythme habituel des saisons</b> : rien d'inhabituel cette année.</p>`
    : `<p class="an4-say">${hors.slice(0, 2).sort((a, b) => a.k - b.k).map(o => `${nm(o.k)} : <b>${o.e > 0 ? "mieux" : "moins bien"} que d'habitude</b> (${sg(o.d, M)}, contre ${sg(o.h, M)} les années précédentes).`).join(" ")}${hors.length === 1 && compar.length > 1 ? " L'autre passage suit le rythme habituel." : ""}</p>`;
  const cols = `150px ${cards.map(() => "minmax(0,1fr)").join(" 150px ")}`;

  const amf = /AMF/.test(j.source || ""), ep = j.fournisseur === "Eulerpool", dern = A.G[0][n - 1];
  const lien = ep ? `<a class="ek-lk" href="https://eulerpool.com" target="_blank" rel="noopener">Data by Eulerpool ↗</a>` : amf ? (dern.u ? `<a class="ek-lk" href="${esc(dern.u)}" target="_blank" rel="noopener">Le dernier communiqué ↗</a>` : "") : `<a class="ek-lk" href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&amp;CIK=${esc(String(x.c.cik))}&amp;type=10-Q" target="_blank" rel="noopener">Les rapports officiels ↗</a>`;
  // 2) l'année face aux précédentes : les mois écoulés, ou le dernier trimestre s'il raconte autre chose
  const dYtd = ch(cum(0, n, M), cum(1, n, M), M), dLast = ch(val(0, n - 1, M), val(1, n - 1, M), M);
  const auto = n > 1 && dYtd != null && dLast != null && (Math.abs(dLast - dYtd) >= (M === "mg" ? 1.5 : 4) || Math.sign(dLast) !== Math.sign(dYtd)) ? "last" : "ytd";
  const mode = n === 1 ? "ytd" : (S.choix || auto), per = n === 1 ? `le ${AN4_QN[0]}` : mode === "ytd" ? `les ${mois} premiers mois` : `le ${AN4_QN[n - 1]}`;
  const rows = [0, 1, 2, 3, 4, 5].map(y => ({ y, v: mode === "ytd" ? cum(y, n, M) : val(y, n - 1, M), p: mode === "ytd" ? cum(y + 1, n, M) : val(y + 1, n - 1, M) })).filter(r => r.v != null);
  let part2 = "";
  if (rows.length >= 3 && rows[0].y === 0) {
    const pos = rows.map(r => Math.max(0, r.v)), mxv = Math.max(...pos) || 1, tri = rows.slice().sort((a, b) => b.v - a.v), rang = tri.findIndex(r => r.y === 0) + 1, d = ch(rows[0].v, rows[0].p, M);
    const say2 = `Sur ${per}, ${LAB[M][0]} ${LAB[M][2]} ${fmt(rows[0].v, M)} : ${rang === 1 ? `<b>le plus haut niveau depuis ${an(rows[rows.length - 1].y)}</b>` : `<b>${rang === 2 ? "2e" : rang + "e"} sur ${rows.length}</b>, derrière ${an(tri[0].y)} (${fmt(tri[0].v, M)})`}${d != null && Math.abs(d) < 0.05 ? ", stable sur un an" : d != null ? `, ${d >= 0 ? "en hausse" : "en baisse"} de ${ekFr(Math.abs(d), 1)}${M === "mg" ? (Math.abs(d) >= 2 ? " points" : " point") : " %"} sur un an` : ""}.`;
    const alt = n > 1 ? `<a href="#annee" class="an4-alt" data-an4-c="${mode === "ytd" ? "last" : "ytd"}">Voir plutôt ${mode === "ytd" ? `le ${AN4_QN[n - 1]} seul` : `les ${mois} premiers mois`}</a>` : "";
    part2 = `<div class="an4-part"><h3 class="an4-pt"><i>2</i>${mode === "ytd" && n > 1 ? `${A.civil ? A.Y : "L'exercice " + A.Y} jusqu'ici` : `Le ${AN4_QN[n - 1]}`}, face aux années précédentes</h3>
      <div class="an4-why"><span class="an4-pill"><i></i>Comparaison : ${per} de chaque ${A.civil ? "année" : "exercice"}</span>${alt}</div>
      <div class="an4-box"><div class="an4-yrs"><div class="an4-mt"><span>${LAB[M][1].toUpperCase()}</span> · ${per}</div>${rows.map(r => `<div class="an4-yl${r.y === 0 ? " cur" : ""}"><b>${an(r.y)}</b><div class="an4-tr"><i style="width:${(Math.max(0, r.v) / mxv * 100).toFixed(1)}%"></i></div><span class="an4-vv">${fmt(r.v, M)}</span>${pill(ch(r.v, r.p, M), M) || "<span></span>"}</div>`).join("")}</div>
        <p class="an4-say">${say2}</p>
        <div class="an4-row"><span class="an4-pill"><i></i>${A.civil ? A.Y : "Exercice " + A.Y}${ep ? ", trimestres clos le" : ""} : ${A.G[0].slice(0, n).map(q => dt(q.filed)).join(", ").replace(/, ([^,]*)$/, " et $1")} · non audité${n > 1 ? "s" : ""}</span>${lien}</div></div></div>`;
  }

  el.innerHTML = `<section class="ek-sec an4" id="annee"><span class="ek-stk2 b">L'année en cours</span><h2>${titre}</h2>${seg}
    <div class="an4-part"><h3 class="an4-pt"><i>1</i>${n > 1 ? `Les trimestres de ${lib}, l'un après l'autre` : `Le premier trimestre de ${lib}`}</h3>
      <div class="an4-seq" style="--an4-cols:${cols}"><div class="an4-mt2"><b>${LAB[M][1].toUpperCase()}</b><small>par trimestre</small></div>${seq}</div>${say1}</div>
    ${part2}
    <p class="ek-tn">${ep ? "Comptes trimestriels publiés par l'entreprise, fournis par Eulerpool, non audités. ENKLAIR ne les affiche que si, sur les deux derniers exercices, les quatre trimestres redonnent les comptes annuels. Dates : fin de chaque trimestre. Ces chiffres montrent la tendance sans remplacer le verdict" : amf ? "Chiffre d'affaires relevé dans les communiqués de l'entreprise déposés à l'AMF, non audité. Quand seul le semestre ou les neuf mois sont publiés, le trimestre est déduit (semestre moins 1er trimestre, neuf mois moins semestre) ; le 4e trimestre est l'année des comptes annuels moins les neuf premiers mois. Ces chiffres montrent la tendance sans remplacer le verdict" : "Comptes trimestriels déposés à la SEC, non audités : ils montrent la tendance sans remplacer le verdict"}, calculé sur l'exercice ${x.c.years[x.c.years.length - 1]}. Chaque trimestre est comparé au même trimestre de l'année précédente, pour effacer les effets de saison.${A.civil ? "" : ` Exercice clos en ${A.mois}.`}</p>
    </section>`;
}

document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-an4-m],[data-an4-c]"), x = window.F4X; if (!b || !x || !x.an4) return; e.preventDefault();
  if (b.dataset.an4M) { x.an4.M = b.dataset.an4M; x.an4.choix = null; } else x.an4.choix = b.dataset.an4C;
  an4Dessiner(x);
});
