/* ---------- Liste des ETF v4 (3/11/2026) : maquette validée docs/maquettes/etf-liste-v3.html ----------
   En-tête jaune (recherche, filtres en un clic, trois portes pour débuter), familles, grands indices, puis les ETF en cartes :
   frais et performance sur un an face à la médiane de leur famille, une carte par fonds (ses parts regroupées).
   Dès qu'une recherche ou un filtre est actif, familles et grands indices s'effacent : les résultats montent sous l'en-tête.
   Adresses compatibles avec les anciens liens (/etf?cat=…, ?q=…, ?pea=1, ?env=pea, ?dist=…, ?em=…, ?fr=…). Remplace window.pageEtfs. */
const EL = { n: 9, logos: null, perf: null, med: null };
const EL_TRI = { taille: "Taille", frais: "Frais", perf: "Sur 1 an", nom: "Nom" };
const EL_FILTRES = [["pea", "Éligibles au PEA"], ["capi", "Capitalisant"], ["fr20", "Frais ≤ 0,20 %"], ["gros", "Plus de 1 Md€"], ["phys", "Réplication physique"]];
const EL_IDX = [["MSCI World", /^msci world$/i], ["S&P 500", /^s&p 500$/i], ["Nasdaq-100", /^nasdaq[- ]100$/i], ["Stoxx Europe 600", /^stoxx europe 600$/i], ["CAC 40", /^cac 40$/i], ["MSCI Emerging Markets", /^msci emerging markets$/i]];
const EL_ACTIF = /enhanced|active|esg|isr|sri|defensive|paris.aligned|climate|screened|leveraged|inverse|daily|couvert|hedged/i;
const EL_COUL = ["#FFF2B3", "#FFE0EC", "#DCE3FF", "#CDF5E4", "#FFE3D1", "#EDE3FF"];
const elBase = n => String(n || "").replace(/\s*\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
const elPc = (r, d = 1) => r == null || !isFinite(r) ? "–" : (r > 0 ? "+" : r < 0 ? "−" : "") + ekFr(Math.abs(r * 100), d) + " %";

function elEtat() {
  const u = new URLSearchParams(location.search), f = new Set((u.get("f") || "").split(",").filter(Boolean));
  if ((u.get("pea") || u.get("env") === "pea") && e4Fr()) f.add("pea");
  if (u.get("dist") === "capitalisation") f.add("capi");
  if (u.get("fr") && +u.get("fr") <= 0.2) f.add("fr20");
  return { q: u.get("q") || "", cat: u.get("cat") || "", em: u.get("em") || "", dist: u.get("dist") === "distribution" ? "distribution" : "", fr: u.get("fr") && +u.get("fr") > 0.2 ? +u.get("fr") : null, f, tri: EL_TRI[u.get("tri")] ? u.get("tri") : "taille", n: 9 };
}
function elMedianes() {
  if (EL.med) return EL.med;
  const M = {}, P = (EL.perf && EL.perf.items) || {};
  for (const c of Object.keys(ECAT)) { const l = ETF.list.filter(e => e.categorie === c); if (!l.length) continue;
    M[c] = { n: l.length, ter: f4Med(l.map(e => e.ter).filter(v => v != null)), a1: f4Med(l.map(e => P[e.id] && !P[e.id].sansDiv ? P[e.id].a1 : null).filter(v => v != null)), pea: l.filter(e => e.pea === true).length }; }
  return EL.med = M;
}
// Une carte par fonds : les parts (capitalisante, distribuante) d'un même fonds, au même prix, sont regroupées
function elFonds(L) {
  const m = new Map();
  for (const e of L) { const k = e.issuer + "|" + elBase(e.name) + "|" + e.ter; if (m.has(k)) m.get(k).parts.push(e); else m.set(k, { e, parts: [e] }); }
  return [...m.values()];
}
function elFiltrer(S) {
  const t = norm(S.q.trim()), tk = S.q.trim().toUpperCase();
  let l = ETF.list.filter(e => (!S.cat || e.categorie === S.cat) && (!S.em || e.issuer === S.em) && (!S.dist || e.distribution === S.dist)
    && (!S.f.has("pea") || e.pea === true) && (!S.f.has("capi") || e.distribution === "capitalisation") && (!S.f.has("fr20") || (e.ter != null && e.ter <= 0.2 + 1e-9))
    && (S.fr == null || (e.ter != null && e.ter <= S.fr + 1e-9)) && (!S.f.has("gros") || (e.encours || 0) >= 1000) && (!S.f.has("phys") || e.replication === "physique"));
  if (t) l = l.filter(e => e.isin === tk || e.ticker === tk || (e.cotations || []).some(c => c.ticker === tk) || (() => { const h = norm(e.name + " " + (e.index || "") + " " + e.issuer + " " + (ECAT[e.categorie] || "") + " " + (e.ticker || "")), hc = h.replace(/[^a-z0-9]/g, ""); return t.split(/\s+/).every(w => h.includes(w) || (w.replace(/[^a-z0-9]/g, "").length >= 3 && hc.includes(w.replace(/[^a-z0-9]/g, "")))); })()); // 9/11 : « sp500 » trouve « S&P 500 »
  const P = (EL.perf && EL.perf.items) || {}, a1 = e => P[e.id] && P[e.id].a1 != null ? P[e.id].a1 : -9;
  const by = { taille: (a, b) => (b.encours || 0) - (a.encours || 0), frais: (a, b) => (a.ter ?? 9) - (b.ter ?? 9) || (b.encours || 0) - (a.encours || 0), perf: (a, b) => a1(b) - a1(a) || (b.encours || 0) - (a.encours || 0), nom: (a, b) => a.name.localeCompare(b.name, "fr") }[S.tri];
  return elFonds(l.sort(by));
}
function elLogo(e) {
  const f = EL.logos && EL.logos[e.issuer] && EL.logos[e.issuer].f, ini = String(e.issuer || "?").replace(/[^A-Za-z ]/g, " ").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return f ? `<span class="el-lg el-lgi"><img src="/logos/emetteurs/${esc(f)}" alt="${esc(e.issuer)}" loading="lazy"></span>` : `<span class="el-lg" aria-hidden="true">${esc(ini)}</span>`;
}
function elJauge(v, m) { if (v == null || m == null) return ""; const mx = m * 2.5, x = Math.max(4, Math.min(96, v / mx * 100)), mm = Math.min(96, m / mx * 100); return `<div class="el-g" style="background:linear-gradient(90deg,#E2F8EE 0 ${mm}%,#FFE9E3 ${mm}% 100%)"><i style="left:${mm}%"></i><b style="left:${x}%"></b></div>`; }
function elCarte(F) {
  const e = F.e, c = elMedianes()[e.categorie] || {}, P = (EL.perf && EL.perf.items) || {}, a1 = P[e.id] && P[e.id].a1;
  const tf = e.ter == null || c.ter == null ? "" : e.ter / c.ter <= 0.8 ? "g" : e.ter / c.ter >= 1.25 ? "r" : "";
  const sd = P[e.id] && P[e.id].sansDiv, ta = a1 == null || c.a1 == null || sd ? "" : a1 - c.a1 > 0.02 ? "g" : c.a1 - a1 > 0.02 ? "r" : "", t10 = e.compo && e.compo.t10, fr = e4Fr();
  const div = F.parts.length > 1 ? `${F.parts.length} parts` : e.distribution === "distribution" ? "distribuant" : e.distribution ? "capitalisant" : "";
  const pills = [fr && e.pea === true ? ["g", "PEA ✓"] : null, e.encours ? ["", big(e.encours)] : null, div ? ["", div] : null, e.levier ? ["r", "levier ou inverse"] : null,
    t10 == null ? null : t10 > 50 ? ["r", "très concentré"] : t10 > 30 ? ["", "assez concentré"] : ["g", "très diversifié"]].filter(Boolean);
  return `<a class="el-c" href="/etf/${esc(e.id)}"><div class="el-ch">${elLogo(e)}<span><b>${esc(elBase(e.name))}</b><small>${esc([e.index, e.ticker].filter(Boolean).join(" · "))}</small></span></div>
    <div class="el-cn"><div><small>Frais par an</small><strong class="${tf}">${e.ter != null ? ekFr(e.ter, 2) + " %" : "–"}</strong>${elJauge(e.ter, c.ter)}<em>${c.ter != null ? "médiane " + ekFr(c.ter, 2) + " %" : ""}</em></div>
      <div><small>Sur 1 an</small><strong class="${ta}">${elPc(a1)}</strong><em>${a1 == null ? (/^(Amundi|iShares|SPDR|Invesco|HSBC)$/.test(e.issuer) ? "non publiée" : "émetteur pas encore suivi") : sd ? "sans les dividendes versés" : c.a1 != null ? "médiane " + elPc(c.a1) : ""}</em></div></div>
    <div class="el-cc">${pills.map(([k, t]) => `<span class="${k}">${esc(t)}</span>`).join("")}</div></a>`;
}

function pageEtfs4() {
  setTitle("Les ETF : frais, contenu, performance"); setNav("etf");
  const S = elEtat(), L = ETF.list, fr = e4Fr(), nPea = L.filter(e => e.pea === true).length;
  const ems = [...new Set(L.map(e => e.issuer))].sort((a, b) => L.filter(e => e.issuer === b).length - L.filter(e => e.issuer === a).length);
  app.innerHTML = `<div class="ek ek-page el-page">
    <section class="ek-hero el-h"><span class="el-stk">Les ETF</span>
      <h1>${F0.format(L.length)} ETF, lus et comparés.</h1>
      <p class="el-sub">Frais, contenu et performance relevés chez les émetteurs.${fr ? ` ${F0.format(nPea)} sont éligibles au PEA.` : ""}</p>
      <label class="el-q"><span aria-hidden="true">🔍</span><input class="el-in" type="search" id="elq" placeholder="MSCI World, CW8, IE00B4L5Y983…" aria-label="Chercher un ETF" value="${esc(S.q)}" autocomplete="off"></label>
      <div class="el-f" id="elf">Filtrer : ${EL_FILTRES.filter(([k]) => fr || k !== "pea").map(([k, t]) => `<button type="button" data-f="${k}" aria-pressed="false">${t}</button>`).join("")}</div>
      <div class="el-learn"><a href="/outils/recouvrement"><b>Comparer deux ETF</b><span>Ce qu'ils ont en commun, leurs frais, les entreprises en double.</span></a><a href="/lexique"><b>Lexique</b><span>ETF, frais, réplication : chaque mot expliqué.</span></a></div>
    </section>
    <div id="elintro"></div>
    <section class="ek-sec" id="elliste"><span class="ek-stk2">Tous les ETF</span><h2 id="elh">Chaque ligne, face à sa famille.</h2>
      <div class="el-sort"><span>Trier par :</span>${Object.entries(EL_TRI).map(([k, t]) => `<button type="button" data-tri="${k}">${t}</button>`).join("")}
        <span class="el-sel"><span id="eln"></span><select id="elem" aria-label="Émetteur"><option value="">Tous les émetteurs</option>${ems.map(m => `<option${m === S.em ? " selected" : ""}>${esc(m)}</option>`).join("")}</select>
        <select id="eldist" aria-label="Dividendes"><option value="">Dividendes : tous</option><option value="capitalisation"${S.f.has("capi") ? " selected" : ""}>Capitalisant</option><option value="distribution"${S.dist ? " selected" : ""}>Distribuant</option></select></span></div>
      <div class="el-cs" id="elcs"></div><div id="elplus"></div>
      <p class="el-note">Point jaune : les frais de l'ETF ; pointillé : la médiane de sa famille (zone verte, moins cher). Frais, taille, ${fr ? "PEA et " : ""}cotations relevés chaque mois chez les émetteurs ; performance en euros, dividendes réinvestis (Amundi et iShares pour l'instant). Les performances passées ne préjugent pas des performances futures. Rien ici n'est un conseil d'achat.</p></section></div>`;
  const rendre = () => {
    const actif = !!(S.q || S.cat || S.em || S.dist || S.fr != null || S.f.size);
    $("#elintro").innerHTML = actif ? "" : elIntro();
    $("#elh").textContent = S.cat ? `${ECAT[S.cat] || "Famille"} : chaque ETF face à sa famille.` : actif ? "Les ETF qui correspondent." : "Chaque ligne, face à sa famille.";
    const R = elFiltrer(S);
    $("#eln").textContent = `${F0.format(R.length)} fonds`;
    $("#elcs").innerHTML = R.length ? R.slice(0, S.n).map(elCarte).join("") : `<p class="ek-note">Aucun ETF ne correspond. Essayez un autre mot, ou retirez un filtre${S.cat ? ` (<button type="button" class="el-lien" data-cat="">toutes les familles</button>)` : ""}.</p>`;
    $("#elplus").innerHTML = R.length > S.n ? `<button type="button" class="el-more" id="elmore">Afficher ${F0.format(Math.min(30, R.length - S.n))} ETF de plus</button>` : "";
    $$("#elf button").forEach(b => { const on = S.f.has(b.dataset.f); b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
    $$(".el-sort [data-tri]").forEach(b => b.classList.toggle("on", b.dataset.tri === S.tri));
    const qs = new URLSearchParams(); if (S.q) qs.set("q", S.q); if (S.cat) qs.set("cat", S.cat); if (S.em) qs.set("em", S.em); if (S.dist) qs.set("dist", S.dist); if (S.fr != null) qs.set("fr", S.fr); if (S.f.size) qs.set("f", [...S.f].join(",")); if (S.tri !== "taille") qs.set("tri", S.tri);
    try { history.replaceState(history.state, "", "/etf" + (qs.toString() ? "?" + qs : "")); } catch (e) { }
  };
  const vers = () => { const t = $("#elliste"); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const maj = () => { S.n = 9; rendre(); };
  let tm; $("#elq").oninput = ev => { clearTimeout(tm); tm = setTimeout(() => { S.q = ev.target.value; maj(); }, 150); };
  $("#elem").onchange = ev => { S.em = ev.target.value; maj(); };
  $("#eldist").onchange = ev => { const v = ev.target.value; S.f.delete("capi"); S.dist = ""; if (v === "capitalisation") S.f.add("capi"); else if (v) S.dist = v; maj(); };
  app.querySelector(".el-page").onclick = ev => {
    const b = ev.target.closest("button,[data-cat],[data-idx]"); if (!b) return;
    if (b.dataset.f) { S.f.has(b.dataset.f) ? S.f.delete(b.dataset.f) : S.f.add(b.dataset.f); if (b.dataset.f === "capi") $("#eldist").value = S.f.has("capi") ? "capitalisation" : ""; maj(); }
    else if (b.dataset.tri) { S.tri = b.dataset.tri; maj(); }
    else if (b.id === "elmore") { S.n += 30; rendre(); }
    else if (b.dataset.cat !== undefined) { ev.preventDefault(); S.cat = b.dataset.cat; maj(); vers(); }
    else if (b.dataset.idx !== undefined) { ev.preventDefault(); S.q = b.dataset.idx; S.tri = "frais"; $("#elq").value = S.q; maj(); vers(); }
  };
  rendre();
  // Logos des émetteurs et performances : chargés une fois, puis la liste est redessinée
  const att = [];
  if (!EL.logos) att.push(getJSON("/logos/emetteurs/index.json", { l: {} }).then(j => EL.logos = j.l || {}));
  if (!EL.perf) att.push((typeof E4 === "object" && E4.perf ? Promise.resolve(E4.perf) : getJSON("/data/etf-perf.json", { items: {} })).then(j => { EL.perf = j; EL.med = null; if (typeof E4 === "object") E4.perf = j; }));
  if (att.length) Promise.all(att).then(() => { if (location.pathname === "/etf" && document.getElementById("elcs")) rendre(); });
}
function elIntro() {
  const M = elMedianes(), P = (EL.perf && EL.perf.items) || {}, fr = e4Fr();
  const tuiles = Object.keys(ECAT).filter(c => M[c]).map((c, i) => `<a class="el-t" href="/etf?cat=${c}" data-cat="${c}" style="background:${EL_COUL[i % EL_COUL.length]}"><b>${esc(ECAT[c])}</b><span>${F0.format(M[c].n)} ETF</span>${M[c].ter != null ? `<small>frais médians ${ekFr(M[c].ter, 2)} %</small>` : ""}</a>`).join("");
  const gi = EL_IDX.map(([nom, rx]) => { const l = ETF.list.filter(e => rx.test((e.index || "").trim()) && !EL_ACTIF.test(e.name + " " + e.index) && e.ter != null); if (!l.length) return "";
    const t = l.map(e => e.ter), mn = Math.min(...t), mx = Math.max(...t), pe = l.filter(e => e.pea === true).length, a1 = f4Med(l.map(e => P[e.id] && P[e.id].a1).filter(v => v != null)), a5 = f4Med(l.map(e => P[e.id] && P[e.id].a5).filter(v => v != null));
    return `<div class="el-i"><h3>${esc(nom)}</h3><small>${l.length} ETF le suivent${fr && pe ? `, dont ${pe} éligible${pe > 1 ? "s" : ""} au PEA` : ""}</small>
      <dl><dt>Frais par an</dt><dd>${mn === mx ? ekFr(mn, 2) : ekFr(mn, 2) + " à " + ekFr(mx, 2)} %</dd>${a1 != null ? `<dt>Sur 1 an</dt><dd class="${a1 >= 0 ? "g" : "r"}">${elPc(a1)}</dd>` : ""}${a5 != null ? `<dt>Sur 5 ans</dt><dd class="${a5 >= 0 ? "g" : "r"}">${elPc(a5, 0)}</dd>` : ""}</dl>
      <a href="/etf?q=${encodeURIComponent(nom)}&tri=frais" data-idx="${esc(nom)}">Voir ces ETF, du moins cher au plus cher →</a></div>`; }).join("");
  return `<section class="ek-sec"><span class="ek-stk2 b">Par famille</span><h2>Choisissez ce que vous voulez détenir.</h2><div class="el-tiles">${tuiles}</div></section>
    <section class="ek-sec"><span class="ek-stk2 p">Les grands indices</span><h2>Même indice, mêmes titres : seuls les frais changent.</h2><div class="el-idx">${gi}</div>
      <p class="el-note">Performance médiane des ETF de l'indice suivis par le site, en euros, dividendes réinvestis. Les performances passées ne préjugent pas des performances futures.</p></section>`;
}

window.pageEtfs = pageEtfs4;
