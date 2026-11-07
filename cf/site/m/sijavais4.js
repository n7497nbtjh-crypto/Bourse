/* ---------- « Et si j'avais investi ? » v4 (3/11/2026), même direction que le simulateur d'épargne v4 ----------
   /outils/si-javais. En-tête jaune : le résultat en titre, le formulaire en carte blanche dans le bandeau.
   Puis : face aux autres placements (une carte par placement, gain ou perte en vert ou rouge, la hausse des prix comme repère),
   la courbe (O2_courbe), les chiffres date par date et les hypothèses repliés, les sources.
   Calculs inchangés : O2_sjSerie, O2_ref, O2C.livretA, O2C.inflation (m/outils2.js). Mêmes paramètres d'adresse (?k, ?vs, ?m, ?ans, ?bk).
   Remplace outilSiJavais (appelée par pageOutils("si-javais")). */
const sjNb = t => String(t).replace(/\u202f/g, "\u00a0"); // espace fine insécable presque invisible dans les grands titres serrés
async function outilSiJavais4() {
  O2_css(); setTitle("Et si j'avais investi ?"); setNav("sim"); await PXP;
  const q = new URLSearchParams(location.search);
  const exk = ["c:lvmh", "c:totalenergies", "c:air-liquide", "c:apple", "c:microsoft", "c:schneider-electric", "c:loreal"].find(k => PX[k] && (PX[k].p5y > 0 || PX[k].p1y > 0)) || Object.keys(PX).find(k => k.startsWith("c:") && PX[k].p5y > 0);
  const S = { k: q.get("k") && (PX[q.get("k")] || RBY[q.get("k").slice(2)] || (q.get("k").startsWith("e:") && typeof ETFBY !== "undefined" && ETFBY[q.get("k").slice(2)])) ? q.get("k") : exk, cmp: q.get("vs") === "aucun" ? "" : PX[q.get("vs")] ? q.get("vs") : null, amt: +q.get("m") > 0 ? +q.get("m") : 1000,
    ans: [1, 3, 5].includes(+q.get("ans")) ? +q.get("ans") : (PX[exk] && PX[exk].p5y > 0 ? 5 : 1), bk: BROKERS.list.some(b => b.id === q.get("bk")) ? q.get("bk") : "trade-republic" };
  const defCmp = k => { const c = k.startsWith("c:") ? RBY[k.slice(2)] : null, e = k.startsWith("e:") ? ETFBY[k.slice(2)] : null;
    return c ? (c.region === "US" ? "i:sp500" : c.region === "FR" ? "i:cac40" : ["DE", "NL", "IT", "ES", "BE", "FI", "IE", "AT", "PT"].includes((c.isin || "").slice(0, 2)) ? "i:stoxx50" : "i:sp500") : e && /CAC|France/i.test(e.index || "") ? "i:stoxx50" : "i:cac40"; };
  if (S.cmp === null) S.cmp = defCmp(S.k);
  const seg = (id, L) => `<div class="s4-seg" id="${id}">${L.map(([v_, l]) => `<a href="#" role="button" data-v="${v_}">${l}</a>`).join("")}</div>`;
  app.innerHTML = `<div class="ek ek-page s4 sj4">
    <section class="ek-hero"><span class="mc-stk">Et si j'avais investi ?</span><h1 class="ag4-t" id="sjt">Calcul…</h1><p class="mc-sub" id="sjs">Une somme placée en une fois il y a 1, 3 ou 5 ans, avec les cours réellement relevés.</p>
      <div class="s4-form sj-form" id="sjform">
        <div class="s4-f sj-pk"><span>Action ou ETF</span><div class="sj-pkw"><input id="sjq" class="el-in" type="search" autocomplete="off" placeholder="Nom d'une action ou d'un ETF"><div class="msug" hidden></div></div></div>
        <label class="s4-f"><span>Montant placé (€)</span><input id="sjm" class="el-in" type="number" inputmode="decimal" min="10" step="100" value="${S.amt}"></label>
        <div class="s4-f"><span>Il y a</span>${seg("sja", [[5, "5 ans"], [3, "3 ans"], [1, "1 an"]])}</div>
        <div class="s4-f sj-vs"><span>Comparer avec</span>${seg("sjv", [["i:cac40", "CAC 40"], ["i:stoxx50", "Euro Stoxx 50"], ["i:sp500", "S&P 500"], ["i:nasdaq100", "Nasdaq 100"], ["", "Aucun indice"]])}</div>
      </div></section>
    <div id="sjr"></div></div>`;
  const ref = await O2_ref(), H = await O2_json("/data/historique.json");
  const marque = (id, v_) => $$(`#${id} [data-v]`).forEach(b => b.classList.toggle("on", b.dataset.v === String(v_)));
  const run = async () => {
    await Promise.all([S.k, S.cmp].filter(Boolean).map(sj4Hist));
    const u = new URLSearchParams({ k: S.k, vs: S.cmp || "aucun", m: S.amt, ans: S.ans }); history.replaceState({}, "", "/outils/si-javais?" + u);
    marque("sja", S.ans); marque("sjv", S.cmp || "");
    sj4Calcul(S, ref, H);
  };
  bindPicker("sjq", k => { S.k = k; S.cmp = defCmp(k); run(); }); $("#sjq").value = O2_nomK(S.k);
  let t = null; $("#sjm").oninput = () => { S.amt = Math.max(0, parseFloat(String($("#sjm").value).replace(",", ".")) || 0); clearTimeout(t); t = setTimeout(run, 200); };
  $("#sjform").addEventListener("click", e => { const x = e.target.closest(".s4-seg [data-v]"); if (!x) return; e.preventDefault();
    if (x.parentElement.id === "sja") S.ans = +x.dataset.v; else S.cmp = x.dataset.v || ""; run(); });
  run();
}
// 7/11 : série officielle d'un ETF (si les feuilles Google n'ont pas ses cours passés), gardée en mémoire
async function sj4Hist(k) { if (!k || !k.startsWith("e:") || k in O2_ETFH) return; const p = PX[k]; if (p && p.p5y > 0) return;
  try { const r = await fetch(`/data/etf-hist/${k.slice(2)}.json`); O2_ETFH[k] = r.ok ? await r.json() : null; } catch (e) { O2_ETFH[k] = null; } }
function sj4Calcul(S, ref, H) {
  const el = $("#sjr"), titre = $("#sjt"), sous = $("#sjs"); if (!el) return;
  let deb = O2_moinsAns(TODAY, S.ans); const b = null, frais = 0; // 7/11 (Romain) : plus de choix du courtier ici ; les frais d'achat ne sont pas comptés
  const A = O2_sjSerie(S.k, S, ref, H, frais), I = S.cmp && S.cmp !== S.k ? O2_sjSerie(S.cmp, S, ref, H, 0) : null;
  if (A.err) {
    titre.textContent = `${O2_nomK(S.k)} : calcul impossible.`;
    sous.textContent = `${A.err[0].toUpperCase() + A.err.slice(1)}. ${S.ans > 1 ? "Essayez une période plus courte. " : ""}Le site n'invente aucun cours : il n'affiche que ceux qu'il a relevés.`;
    el.innerHTML = ""; return;
  }
  if (A.base) deb = O2_moinsAns(A.base, S.ans); // 7/11 : les cours passés peuvent dater de quelques jours (mémoire du robot, série hebdomadaire de l'émetteur)
  const xs = A.pts.map(p => p[0]), dates = xs.map(x => x === 0 ? (A.finDate || TODAY) : O2_moinsAns(A.base || TODAY, -x));
  const T = ref && ref.livretA ? ref.livretA.taux : null, ipc = ref && ref.ipc ? ref.ipc.mois : null;
  const livret = T ? xs.map((x, i) => [x, O2C.livretA(S.amt, deb, dates[i], T)]) : null;
  const m0 = ipc && O2C.moisProche(ipc, deb), prix = m0 ? xs.map((x, i) => { const m1 = O2C.moisProche(ipc, dates[i]); return [x, O2C.inflation(S.amt, ipc[m0], ipc[m1])]; }) : null;
  const mFin = ipc && O2C.moisProche(ipc, TODAY);
  const series = [{ nom: A.nom + (A.div ? " sans les dividendes" : ""), couleur: O2_C.ink, pts: A.pts, points: true, epais: 2.5 }];
  if (A.div) series.push({ nom: A.nom + " dividendes non réinvestis", couleur: O2_C.ink, tirets: true, pts: A.div, points: true });
  if (I && !I.err) series.push({ nom: I.nom + " (indice, sans dividendes)", couleur: O2_C.bleu, pts: I.pts, points: true });
  if (livret) series.push({ nom: "Livret A", couleur: O2_C.vert, pts: livret, points: true });
  if (prix) series.push({ nom: "Hausse des prix (même pouvoir d'achat)", couleur: O2_C.orange, tirets: true, pts: prix, epais: 1.5 });
  const RI = A.div ? sj4Reinv(A, S, ref, H) : null;
  if (RI) series.splice(2, 0, { nom: A.nom + " dividendes réinvestis (estimation)", couleur: O2_C.vert, tirets: true, pts: RI, points: true });
  const fin = s => s && s.pts ? s.pts[s.pts.length - 1][1] : null, vA = A.div ? A.div.at(-1)[1] : fin(A), vI = I && !I.err ? fin(I) : null, vL = livret ? livret.at(-1)[1] : null, vP = prix ? prix.at(-1)[1] : null;
  const pc = x => x != null ? O2_p((x / S.amt - 1) * 100, 0) : "–";
  // En-tête : le résultat
  titre.textContent = sjNb(`${O2_e(S.amt)} dans ${A.nom} en ${O2_dCourt(deb)} : ${O2_e(vA)} ${A.finDate ? "au " + dLabel(A.finDate) : "aujourd'hui"}.`);
  sous.innerHTML = `Soit <b>${pc(vA)}</b>${A.div ? `, dividendes perçus et gardés de côté${RI ? ` (environ ${sjNb(O2_e(RI.at(-1)[1]))} s'ils avaient été réinvestis)` : ""}` : ""}${frais ? `, après ${eur(frais)} de frais d'achat` : ""}.${vP != null ? (vA >= vP ? " Mieux que la hausse des prix : le pouvoir d'achat a été préservé." : " Moins que la hausse des prix : ce placement a perdu du pouvoir d'achat.") : ""} Le passé ne dit rien de l'avenir.`;
  // Cartes : chaque placement face au montant de départ, la hausse des prix comme repère
  const cartes = [[A.nom + (A.div ? ", dividendes non réinvestis" : ""), vA, "a", A.div ? "dividendes gardés de côté" : ""], ...(RI ? [[A.nom + ", dividendes réinvestis", RI.at(-1)[1], "r", "estimation : chaque dividende rachète des actions"]] : []), ...(vI != null ? [[I.nom, vI, "i", "indice, sans dividendes"]] : []), ...(vL != null ? [["Livret A", vL, "l", "taux officiels successifs"]] : [])];
  const carte = ([n, x, k, sub]) => { const g = x >= S.amt, bat = vP != null ? x >= vP : null;
    return `<div class="sj-c${k === "a" ? " a" : ""}"><span class="s4-k">${esc(n)}</span><b>${sjNb(O2_e(x))}</b><span class="sj-p ${g ? "g" : "r"}">${pc(x)}</span>
      ${bat != null ? `<small class="${bat ? "g" : "r"}">${bat ? "▲ au-dessus" : "▼ en dessous"} de la hausse des prix</small>` : ""}${sub ? `<small>${esc(sub)}</small>` : ""}</div>`; };
  const e = S.k.startsWith("e:") ? ETFBY[S.k.slice(2)] : null;
  const hyp = [
    `Montant : ${O2_e(S.amt)} placés en une seule fois le ${dLabel(deb)}, sans versement ensuite. Les versements mensuels demanderaient les cours mois par mois, que le site ne conserve pas encore.`,
    `Frais d'achat : non comptés (ils dépendent de votre courtier, souvent entre 0 et 1 % de l'achat). ${e ? `Les frais courants de l'ETF (${e.ter != null ? pct(e.ter / 100, 2, false) + " par an" : "non indiqués"}) sont déjà déduits de son cours.` : ""} Pas de frais de revente ni d'impôt : c'est la valeur avant revente.`,
    A.div ? `Dividendes : dividende par action publié dans les comptes annuels des exercices ${A.div.exos.join(", ")}, supposé versé le 1er juin de l'année suivante. « Non réinvestis » : gardés en liquidités, sans intérêt. « Réinvestis » : chaque dividende rachète des actions au cours de ce jour-là, estimé en ligne droite entre les deux cours relevés les plus proches. Ni impôt ni frais sur les dividendes. Estimation : les dates et acomptes réels varient.`
      : A.hist && A.hist.mensuel ? `Valeurs : performance officielle sur ${S.ans} an${S.ans > 1 ? "s" : ""} au ${dLabel(A.hist.asOf)}, publiée par ${esc(String(A.hist.src).split(",")[0])} dans sa fiche mensuelle, dividendes réinvestis, en euros. Le site n'a pas encore la valeur de la part jour par jour.`
      : A.hist ? `Valeurs : valeur liquidative officielle publiée par ${esc(String(A.hist.src).split(" (")[0])}, ajustée des dividendes (comme s'ils étaient réinvestis), en euros, une valeur par semaine, du ${dLabel(A.hist.debut)} au ${dLabel(A.hist.asOf)}.`
      : e ? (e.distribution === "distribution" ? "Dividendes : cet ETF les distribue ; ils ne sont pas comptés ici (montants versés non disponibles)." : "Dividendes : cet ETF les réinvestit ; ils sont déjà dans son cours.") : "Dividendes : non comptés (dividendes par action non disponibles ou dans une autre devise que le cours).",
    `Devise : ${A.cur && A.cur !== "EUR" ? `cours en ${esc(A.cur)}, convertis en euros au taux moyen du mois (BCE) pour le passé et au taux du jour pour aujourd'hui. La variation du ${esc(A.cur)} face à l'euro est donc comprise.` : "cours en euros."}`,
    I && !I.err ? `Indice : ${esc(I.nom)}, indice de prix (dividendes non réinvestis), sans frais : il ne s'achète pas directement.` : I && I.err ? `Indice ${esc(O2_nomK(S.cmp))} : ${esc(I.err)}.` : "",
    livret ? `Livret A : taux officiels successifs (${T.filter(t => t[0] >= deb.slice(0, 7)).map(t => `${F1.format(t[1])} % au ${dLabel(t[0])}`).slice(-4).join(", ") || "taux en vigueur"}), intérêts par quinzaine capitalisés au 31 décembre, sans plafond ni impôt (le Livret A n'est pas imposé).` : "",
    prix ? `Hausse des prix : indice des prix à la consommation de l'Insee, de ${O2_moisL(m0)} à ${O2_moisL(mFin)} (dernier mois publié).` : "Hausse des prix : indice de l'Insee indisponible.",
    `${xs.length} cours relevés (${dates.map(dLabel).join(", ")}) : entre deux points, la courbe est tracée en ligne droite, alors que le cours a varié davantage. Un autre point de départ, quelques semaines plus tôt ou plus tard, donnerait un autre résultat.`,
  ].filter(Boolean);
  const lignes = series.map(s => `<tr><th scope="row" class="l lab"><span class="nm">${esc(s.nom)}</span></th>${xs.map(x => { const p = s.pts.find(z => z[0] === x); return `<td class="num">${p && p[1] != null ? O2_e(p[1]) : "–"}</td>`; }).join("")}<td class="num"><b>${pc(fin(s))}</b></td></tr>`).join("");
  el.innerHTML = `
    <section class="ek-sec"><span class="ek-stk2 b">Face aux autres placements</span><h2>Pour ${sjNb(O2_e(S.amt))} placés en ${O2_dCourt(deb)}.</h2>
      <div class="sj-cs">${cartes.map(carte).join("")}${vP != null ? `<div class="sj-c ref"><span class="s4-k">Hausse des prix</span><b>${sjNb(O2_e(vP))}</b><span class="sj-p">${pc(vP)}</span><small>ce qu'il fallait pour garder le même pouvoir d'achat (Insee)</small></div>` : ""}</div>
      ${sj4Barres(S, [...(RI ? [[A.nom + ", dividendes réinvestis", RI.at(-1)[1]]] : []), [A.nom + (A.div ? ", dividendes non réinvestis" : ""), vA, true], ...(A.div ? [[A.nom + ", sans les dividendes", fin(A)]] : []), ...(vI != null ? [[I.nom, vI]] : []), ...(vL != null ? [["Livret A", vL]] : [])], vP)}</section>
    <section class="ek-sec">
      <details class="s4-pl"><summary>Le parcours, date par date</summary><div class="s4-ch" id="sjc"></div>${tblxScrollBox(`<table class="t tbx"><thead><tr><th class="l lab" scope="col">Placement</th>${dates.map(d => `<th scope="col">${O2_dCourt(d)}</th>`).join("")}<th scope="col">Évolution</th></tr></thead><tbody>${lignes}</tbody></table>`, "Faites glisser pour voir toutes les colonnes")}</details>
      <details class="s4-pl"><summary>Hypothèses du calcul</summary><ul>${hyp.map(x => `<li>${x}</li>`).join("")}</ul></details>
      <p class="ek-note"><b>Le passé ne dit rien de l'avenir.</b> Ce n'est pas un conseil d'achat ou de vente. ${A.hist ? `Valeurs : valeur liquidative officielle de l'émetteur (${esc(String(A.hist.src).split(" (")[0])}), au ${dLabel(A.hist.asOf)}.` : `Cours : Google Finance (cours de clôture ou différés relevés par le site, mise à jour du ${PXUP && PXUP !== "none" ? dLabel(String(PXUP).slice(0, 10)) : "jour"}).`} Taux de change : ${ref && ref.fx ? O2_src("BCE, taux de référence", ref.fx.url) : "BCE"}.${prix ? ` Prix : ${O2_src(ref.ipc.source, ref.ipc.url)}.` : ""}${livret ? ` Livret A : ${O2_src("Service-public.gouv.fr", ref.livretA.url)}.` : ""} Frais : ${brokerSrc()}${A.div ? " Dividendes : comptes annuels officiels (ESEF, SEC) lus par le site." : ""}</p></section>`;
  const ticks = xs.map((x, i) => [x, O2_dCourt(dates[i])]), pli = $("#sjc").closest("details");
  const dessine = () => { if (pli.dataset.ok) return; pli.dataset.ok = "1"; O2_courbe($("#sjc"), { series, xTicks: ticks, yFmt: (v_, ax) => ax ? F0.format(v_) + " €" : O2_e(v_), tipX: x => dLabel(O2_moinsAns(TODAY, -x)), refY: S.amt, titre: "Valeur du placement au fil du temps" }); };
  pli.addEventListener("toggle", () => { if (pli.open) dessine(); });
  tblxBindScroll(el);
}
// Barres horizontales : la valeur d'aujourd'hui de chaque placement, face au montant placé (trait noir) et à la hausse des prix (pointillé orange)
// Dividendes réinvestis (estimation) : chaque dividende annuel, supposé versé le 1er juin, rachète des actions au cours de ce jour,
// estimé en ligne droite entre les deux cours relevés les plus proches (en euros). Renvoie [[x, valeur], …] aux dates relevées.
function sj4Reinv(A, S, ref, H) {
  const c = RBY[S.k.slice(2)], h = c && H && H.h && H.h[c.id]; if (!h || !h.d) return null;
  const deb = O2_moinsAns(TODAY, S.ans), an = iso => (Date.parse(iso) - Date.parse(TODAY)) / (365.25 * 864e5);
  const P = A.pts.filter(p => p[1] != null).map(([x, v_]) => [x, v_ / A.parts]); // cours en euros aux dates relevées
  const prixA = t => { for (let i = 0; i < P.length - 1; i++) if (t >= P[i][0] && t <= P[i + 1][0]) { const [x0, y0] = P[i], [x1, y1] = P[i + 1]; return y0 + (y1 - y0) * (t - x0) / (x1 - x0); } return null; };
  const V = h.d.map((x, i) => [h.y + i, x]).filter(([y, x]) => x > 0 && `${y + 1}-06-01` > deb && `${y + 1}-06-01` <= TODAY).map(([y, x]) => { const iso = `${y + 1}-06-01`, fx = O2_fx(ref, A.cur, iso); return { t: an(iso), d: fx ? x / fx : null }; });
  if (!V.length || V.some(v_ => v_.d == null)) return null;
  return P.map(([x, px]) => { let n = A.parts; V.filter(v_ => v_.t <= x).forEach(v_ => { const pa = prixA(v_.t); if (pa > 0) n += n * v_.d / pa; }); return [x, n * px]; });
}
// Barres horizontales : la valeur d'aujourd'hui de chaque placement, face au montant placé (trait noir) et à la hausse des prix (pointillé orange)
function sj4Barres(S, L, vP) {
  const max = Math.max(S.amt, vP || 0, ...L.map(x => x[1] || 0)) * 1.04, X = v_ => (v_ / max * 100).toFixed(2) + "%", fin = v_ => v_ / max > .7 ? " fin" : "";
  const traits = `<em class="m" style="left:${X(S.amt)}"></em>${vP != null ? `<em class="p" style="left:${X(vP)}"></em>` : ""}`;
  return `<div class="sj-bars" role="img" aria-label="Valeur aujourd'hui de chaque placement">
    <div class="sj-br sj-ax"><span></span><div class="sj-bt"><u class="m${fin(S.amt)}" style="left:${X(S.amt)}">${sjNb(O2_e(S.amt))} placés</u></div><span></span></div>
    ${L.filter(x => x[1] != null).map(([n, v_, a]) => `<div class="sj-br${a ? " a" : ""}"><span class="sj-bn">${esc(n)}</span><div class="sj-bt">${traits}<i class="${v_ >= S.amt ? "g" : "r"}" style="width:${X(v_)}"></i></div><b class="sj-bv ${v_ >= S.amt ? "g" : "r"}">${sjNb(O2_e(v_))}</b></div>`).join("")}
    ${vP != null ? `<div class="sj-br sj-ax"><span></span><div class="sj-bt"><u class="p${fin(vP)}" style="left:${X(vP)}">hausse des prix : ${sjNb(O2_e(vP))}</u></div><span></span></div>` : ""}
  </div><p class="ek-note">Barre verte : plus que le montant placé ; rouge : moins. Trait noir : le montant placé. Pointillé orange : ce qu'il fallait pour garder le même pouvoir d'achat. La courbe date par date est dans le pli plus bas.</p>`;
}
window.outilSiJavais = outilSiJavais4;
