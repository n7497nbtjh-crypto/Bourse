/* Module « rapport8 » d'ENKLAIR : le rapport de la semaine, version 8 (6/11 soir, maquette docs/maquettes/rapport-semaine-v6.html validée par Romain).
   Chargé après m/synthese.js, dont il réutilise les outils (synLogo, synPct, synEur, synLien, SYN6_T, SYN_ANN et le bouton « Expliquer »).
   Données ajoutées par le serveur (cf/src/rapport8.mjs) : rivales, monde, radio, dca ; ia_entreprises nourrie par les rivales et les comptes.
   Ordre : en-tête jaune (le chiffre de la semaine, trois cartes) · 1. Votre portefeuille (gains et pertes par ligne, achat programmé, radiographie)
   · 2. Le monde cette semaine · 3. Vos entreprises face à leurs rivales · 4. À venir. Tout texte non signé « IA » est calculé ici. */
let SYN8_B = null;
const R8_VERD = { suit: ["Suit son secteur", ""], mieux: ["Mieux que ses rivales", "j"], moins: ["Moins bien que ses rivales", "r"], resultats: ["Résultats publiés", "j"] };
const R8_COUL = ["#ffd6dc", "#e8e1ff", "#e6e6e6"];
function r8Num(v, d = 1) { return v == null || !isFinite(v) ? "–" : (d ? F1 : F0).format(Math.abs(v)); }
function r8Eur(v) { return v == null || !isFinite(v) ? "–" : (v > 0 ? "+" : v < 0 ? "−" : "") + F0.format(Math.abs(Math.round(v))) + " €"; }
function r8Jr(iso) { const d = new Date(String(iso).slice(0, 10) + "T12:00:00Z"); return `${d.getUTCDate() === 1 ? "1er" : d.getUTCDate()} ${SYN_MOIS[d.getUTCMonth()]}`; }
function r8Court(l) { const n = String(l.nom || "").replace(/\s*\([^)]*\)\s*$/, ""); return l.k && l.k.startsWith("e:") ? "votre ETF " + n : n; } // « Amundi PEA Monde (MSCI World) » → « votre ETF Amundi PEA Monde »
function r8Maj(t) { return String(t).replace(/^./, c => c.toUpperCase()); }
function r8Titre(t) { return String(t || "").replace(/^[A-Za-z0-9.-]+\.(ca|com|net|org|co\.uk|fr|de)\s+[-|:]\s+/i, ""); } // « Baystreet.ca - Shell sells… » → « Shell sells… »
function r8De(n) { n = String(n || "").replace(/\s*\([^)]*\)\s*$/, ""); return /^[aeiouyhàâéèêîôû]/i.test(n) ? "d'" + n : "de " + n; }
function r8Cls(v) { return v > 0.05 ? "up" : v < -0.05 ? "dn" : ""; }
function r8Bar(nom, v, moi, k) {
  if (v == null) return "";
  const w = Math.min(Math.abs(v) / 22 * 48, 48), c = moi ? "#111" : v < 0 ? "#d1242f" : "#0a8a3a";
  return `<div class="r8-bar${moi ? " moi" : ""}">${k ? `<a href="${synLien(k)}">${esc(nom)}</a>` : `<span>${esc(nom)}</span>`}<span class="tr"><span class="z"></span><span class="f" style="${v < 0 ? "right" : "left"}:50%;width:${w.toFixed(0)}%;background:${c}"></span></span><span class="p ${r8Cls(v)}">${synPct(v)}</span></div>`;
}
// Phrase calculée quand l'IA n'a rien rédigé (ou que son texte a été refusé) : seulement des faits du rapport
function r8Lecture(l, R, A) {
  const v = l.variation_semaine_pct, res = A.find(a => a.origine !== "presse" && a.categorie === "resultats" && (a.chiffres || []).length);
  const vs = R ? R.liste.filter(x => x.v != null) : [], off = A.filter(a => a.origine !== "presse"), courant = off.length && off.every(a => ["rachat", "capital"].includes(a.categorie));
  const out = [];
  if (res) out.push(`${l.nom} a publié ses résultats : ${res.chiffres.slice(0, 2).map(([a, b]) => `${a.toLowerCase()} ${b}`).join(", ")}.`);
  if (vs.length >= 2 && v != null) {
    const lo = Math.min(...vs.map(x => x.v)), hi = Math.max(...vs.map(x => x.v)), meil = vs.filter(x => x.v < v).length;
    const four = lo === hi ? `${synPct(lo)}` : `de ${synPct(lo)} à ${synPct(hi)}`;
    out.push(`Sur la semaine, ${l.nom} fait ${synPct(v)} ; ses rivales ont fait ${four}.` + (R.verdict === "suit" ? " Le mouvement est celui de tout son métier." : R.verdict === "mieux" ? (meil === vs.length ? ` Elle fait mieux que ses ${vs.length} rivales.` : ` Elle fait mieux que ${meil} de ses ${vs.length} rivales.`) : R.verdict === "moins" ? (meil === 0 ? ` Elle fait moins bien que ses ${vs.length} rivales.` : ` Elle fait moins bien que ${vs.length - meil} de ses ${vs.length} rivales.`) : ""));
  }
  if (!res && !A.some(a => a.origine !== "presse" && !["rachat", "capital"].includes(a.categorie))) out.push(courant ? "Elle n'a publié que des opérations courantes (rachats de ses propres actions, nombre d'actions)." : "Elle n'a rien annoncé d'officiel cette semaine.");
  return out.join(" ");
}


// 7/11 nuit (Romain : « mettre en avant pourquoi les entreprises ont baissé ou augmenté », « beaucoup de répétitions dans le cadre ») :
// d'où vient le mouvement (le marché, son métier, ou elle seule), le jour où tout s'est joué et ce qui s'est passé ce jour-là,
// puis seulement des chiffres qui ne sont pas déjà dans l'en-tête ou dans les barres des rivales. Tout est calculé, sans IA.
const R8_JS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
function r8Jour(iso) { const d = new Date(String(iso).slice(0, 10) + "T12:00:00Z"); return R8_JS[d.getUTCDay()] + " " + r8Jr(iso); }
// 7/11 nuit (Romain : « quand une entreprise publie ses résultats, le client veut savoir ce que le rapport en dit » ; « rien de propre à Veolia » refusé) :
// 1. s'il y a des résultats : ce qu'ils disent (croissance face à son dernier exercice et à ses rivales), puis l'accueil de la Bourse ce jour-là ;
// 2. sinon : où elle se place face à ses rivales et au marché, le jour où tout s'est joué, et ce qui s'est dit ou annoncé ce jour-là (titre de presse, annonce, rivale).
// Rend du HTML (les titres de presse gardent leur traduction automatique).
function r8Titr(a) { const lg = typeof synLangue === "function" ? synLangue(a.titre) : "fr"; return `« <span${lg !== "fr" ? ` data-tr="${lg}"` : ""}>${esc(r8Titre(a.titre))}</span> »`; }
function r8Croiss(x) { const m = /\(([+−-])\s?(\d+(?:,\d+)?)\s?%/.exec(String(x || "")); return m ? (m[1] === "+" ? 1 : -1) * parseFloat(m[2].replace(",", ".")) : null; }
function r8Fort(l, R, A, pub) { // le jour où tout s'est joué, et ce qui s'est dit ou annoncé ce jour-là
  const v = l.variation_semaine_pct, ind = l.indice, J = (R && R.jours) || [];
  const fort = J.length ? J.reduce((m, j) => Math.abs(j.v) > Math.abs(m.v) ? j : m) : null;
  if (!(fort && v != null && Math.abs(fort.v) >= 1 && Math.abs(fort.v) >= Math.abs(v) * 0.35) || fort.date === pub) {
    // pas de jour qui ressort : une semaine régulière ?
    if (J.length >= 4 && (J.every(j => j.v < 0) || J.every(j => j.v > 0))) { const vs = J.map(j => j.v), lo = Math.min(...vs.map(Math.abs)), hi = Math.max(...vs.map(Math.abs));
      return { date: null, t: `Elle a ${vs[0] > 0 ? "monté" : "baissé"} chaque jour de la semaine, de ${F1.format(lo)} à ${F1.format(hi)}\u00a0% par jour : un mouvement continu plutôt qu'une nouvelle précise.` }; }
    return null; }
  const ce = A.filter(a => String(a.date).slice(0, 10) === fort.date), off = ce.find(a => a.origine !== "presse" && !["rachat", "capital"].includes(a.categorie)), pr = ce.find(a => a.origine === "presse");
  const rn = R && (R.nouvelles || []).find(a => String(a.date).slice(0, 10) === fort.date);
  const veille = pub && J.findIndex(j => j.date === pub) - J.findIndex(j => j.date === fort.date) === 1;
  let t = `${pub ? `Sa plus forte ${fort.v > 0 ? "hausse" : "baisse"} de la semaine, ${r8Jour(fort.date)}${veille ? ", la veille de ses résultats" : ""}` : `L'essentiel s'est joué ${r8Jour(fort.date)}`} : ${synPct(fort.v)}${fort.riv != null ? `, ses rivales ${synPct(fort.riv)}` : ""}${fort.ind != null && ind ? `, le ${esc(ind.nom)} ${synPct(fort.ind)}` : ""}.`;
  if (off) t += ` Ce jour-là, elle a publié : ${esc(r8Maj((SYN6_T[off.categorie] || ["annonce"])[0].toLowerCase()))}${off.titre ? ` (${esc(off.titre)})` : ""}.`;
  else if (pr) t += ` Ce jour-là, la presse titrait ${r8Titr(pr)}.`;
  else if (rn) t += ` Ce jour-là, ${esc(rn.nom)} ${rn.origine === "presse" ? `faisait l'actualité : ${r8Titr(rn)}` : `publiait : ${rn.titre ? esc(r8Maj(rn.titre.toLowerCase())) : esc((SYN6_T[rn.categorie] || ["une annonce"])[0].toLowerCase())}`}.`;
  else if (fort.riv != null && Math.abs(fort.v - fort.riv) <= 1.2) t += " Tout son métier a bougé ainsi ce jour-là.";
  else if (fort.ind != null && Math.abs(fort.v - fort.ind) <= 1) t += " Tout le marché a bougé ainsi ce jour-là.";
  else t += " Elle n'a rien publié ce jour-là, et nous n'avons trouvé aucun article.";
  return { date: fort.date, t };
}
function r8Pourquoi(l, R, A) {
  const v = l.variation_semaine_pct, ind = l.indice, J = (R && R.jours) || [], out = [], nom = l.nom;
  const nr = R ? R.liste.filter(x => x.v != null).length : 0, med = R && R.med;
  const res = [...A].reverse().find(a => a.origine !== "presse" && a.categorie === "resultats" && (a.chiffres || []).length);
  const jourDe = d => J.find(j => j.date === String(d).slice(0, 10));
  if (res) {
    out.push(`Ses résultats, publiés le ${esc(r8Jr(res.date))} : ${res.chiffres.slice(0, 2).map(([a, b]) => `${esc(a.toLowerCase())} ${esc(String(b).replace(/ %/g, "\u00a0%"))}`).join(", ")}.`);
    const rc = R && R.reaction;
    if (rc) out.push(`Le jour de la publication (${r8Jour(rc.date)}), la Bourse ${rc.med == null ? `a fait ${synPct(rc.v)}` : Math.abs(rc.v - rc.med) < 1 ? `l'a accueillie comme ses rivales : ${synPct(rc.v)}, ses rivales ${synPct(rc.med)}` : `l'a ${rc.v > rc.med ? "mieux" : "moins bien"} accueillie que ses rivales : ${synPct(rc.v)} contre ${synPct(rc.med)}`}.`);
    const f2 = r8Fort(l, R, A, rc ? rc.date : null); if (f2) out.push(f2.t);
    if (v != null && med != null) out.push(`Sur la semaine, ${synPct(v)}${Math.abs(v - med) <= 1.5 ? `, comme ses ${nr} rivales (${synPct(med)} en médiane)` : `, ${v > med ? "mieux" : "moins bien"} que ses ${nr} rivales (${synPct(med)} en médiane)`}.`);
    return out;
  }
  // Sans résultats : sa place face à ses rivales et au marché
  if (v != null && med != null) {
    const d = v - med, mk = ind && ind.pct != null ? `, le ${esc(ind.nom)} ${synPct(ind.pct)}` : "";
    out.push(Math.abs(d) <= 1.5 ? `${esc(nom)} a bougé avec tout son métier : ses ${nr} rivales ont fait ${synPct(med)} en médiane${mk}.` : `${esc(nom)} fait ${d > 0 ? "mieux" : "moins bien"} que ses ${nr} rivales : ${synPct(v)} contre ${synPct(med)} en médiane${mk}.`);
  }
  const fort = r8Fort(l, R, A, null);
  if (fort) out.push(fort.t);
  // Ce qu'elle a publié d'autre cette semaine (contrat, dirigeants, opération…)
  const autres = A.filter(a => a.origine !== "presse" && !["rachat", "capital", "resultats"].includes(a.categorie) && a.titre && (!fort || String(a.date).slice(0, 10) !== fort.date)).slice(0, 2);
  for (const a of autres) out.push(`Le ${esc(r8Jr(a.date))}, elle a publié : ${esc(r8Maj((SYN6_T[a.categorie] || ["annonce"])[0].toLowerCase()))} (${esc(a.titre)}).`);
  return out;
}
function r8Jours(l, R, A) { // 7/11 nuit (Romain : « illisible, trop de paramètres ») : seulement le cours de l'action, jour par jour
  const J = (R && R.jours) || []; if (J.length < 2) return "";
  const res = new Set(A.filter(a => a.origine !== "presse" && a.categorie === "resultats").map(a => String(a.date).slice(0, 10)));
  const mx = Math.max(1, ...J.map(j => Math.abs(j.v))), h = x => (Math.min(Math.abs(x), mx) / mx * 38).toFixed(0);
  return `<div class="r8-jours"><p class="r8-jt">Son cours, jour par jour</p><div class="r8-jg">${J.map(j => `<div class="r8-jc${res.has(j.date) ? " res" : ""}"><div class="r8-jb"><span class="m ${j.v < 0 ? "dn" : "up"}" style="height:${h(j.v)}px;${j.v < 0 ? "top" : "bottom"}:50%"></span></div><b class="${r8Cls(j.v)}">${synPct(j.v)}</b><small>${R8_JS[new Date(j.date + "T12:00:00Z").getUTCDay()]}</small>${res.has(j.date) ? `<em>Résultats</em>` : ""}</div>`).join("")}</div></div>`;
}
// Les chiffres qui ne sont ni dans l'en-tête ni dans les barres : ses résultats, l'accueil de la Bourse, ses ventes et sa marge face aux rivales
function r8Faits(l, R, A) { // 7/11 nuit (Romain) : plus de chiffres de l'exercice passé ici ; seulement les chiffres publiés cette semaine, en plus des deux premiers
  const res = [...A].reverse().find(a => a.origine !== "presse" && a.categorie === "resultats" && (a.chiffres || []).length);
  if (!res || res.chiffres.length < 3) return "";
  return `<div class="r8-faits"><div class="r8-fl r8-lgf"><span class="k">Ses autres chiffres</span><span class="v">${esc(res.chiffres.slice(2, 5).map(([a, b]) => `${a} ${b}`).join(" · "))}</span><span class="c">publiés le ${esc(r8Jr(res.date))}</span></div></div>`;
}
function synPageV8(b, m) {
  SYN_ANN = []; SYN8_B = b;
  const L = (b.lignes || []).slice(), pf = b.portefeuille, R = b.rivales || {}, IA = b.ia_entreprises || {}, M = (b.monde && b.monde.sujets) || [];
  const vide = a => a.origine !== "presse" && !(a.chiffres || []).length && ["communique", "autre", "agenda"].includes(a.categorie) && !/rachat/i.test(a.titre || "");
  const ann = (b.annonces || []).filter(a => !(a.origine === "presse" && SYN6_RECO.test(a.titre || "")) && !vide(a));
  const deK = k => ann.filter(a => a.k === k).sort((x, y) => String(y.date).localeCompare(x.date));
  const g = pf && pf.var_eur != null ? pf.var_eur : null, idx = b.indices || [];
  const SANSV = L.filter(l => l.portefeuille && l.portefeuille.var_eur == null); // 7/11 : lignes sans cours de la semaine (ETF non suivi…), jamais omises
  const Lpf = L.filter(l => l.portefeuille && l.portefeuille.var_eur != null).sort((x, y) => y.portefeuille.var_eur - x.portefeuille.var_eur);
  const avecV = L.filter(l => l.variation_semaine_pct != null);
  // Les trois cartes : ce qui a le plus pesé, le plus aidé (en euros si portefeuille), la nouvelle à retenir (des résultats chiffrés d'abord)
  const pire = Lpf.length ? Lpf[Lpf.length - 1] : avecV.slice().sort((x, y) => x.variation_semaine_pct - y.variation_semaine_pct)[0];
  const meil = Lpf.length ? Lpf[0] : avecV.slice().sort((x, y) => y.variation_semaine_pct - x.variation_semaine_pct)[0];
  const res = ann.filter(a => a.origine !== "presse" && (a.chiffres || []).length && L.some(l => l.k === a.k)).sort((x, y) => (y.categorie === "resultats") - (x.categorie === "resultats"))[0];
  const radio = b.radio && b.radio.seaux || [], us = radio.find(x => /États-Unis/.test(x.lab));
  const carte = (lab, l, eurOk, cls) => { if (!l) return ""; const e = eurOk && l.portefeuille ? l.portefeuille.var_eur : null, v = l.variation_semaine_pct;
    const R0 = R[l.k], why = R0 && R0.verdict === "suit" ? "Comme tout son secteur." : R0 && R0.verdict === "mieux" ? "Mieux que ses rivales." : R0 && R0.verdict === "moins" ? "Moins bien que ses rivales." : l.k.startsWith("e:") && radio.length ? `${F0.format(Math.round(l.portefeuille.poids_pct || 0))} % de votre portefeuille.` : "";
    return `<a class="r8-v" href="${synLien(l.k)}"><small>${lab}</small><b class="${cls}">${esc(r8Maj(r8Court(l)).replace(/^Votre ETF /, "ETF "))} ${e != null ? r8Eur(e) : synPct(v)}</b><p>${esc(why)}</p></a>`; };
  const nouv = res ? `<a class="r8-v" href="${synLien(res.k)}"><small>La nouvelle à retenir</small><b>${esc(res.nom || "")}</b><p>${esc(res.chiffres.slice(0, 2).map(([a, v]) => `${a} : ${v}`).join(" · "))}</p></a>` : "";
  const cartes = [pire && (Lpf.length ? pire.portefeuille.var_eur < 0 : pire.variation_semaine_pct < 0) ? carte("Ce qui a le plus pesé", pire, true, "dn") : "", meil && (Lpf.length ? meil.portefeuille.var_eur > 0 : meil.variation_semaine_pct > 0) ? carte("Ce qui a le plus aidé", meil, true, "up") : "", nouv].filter(Boolean).join("");
  // Titre : calculé. Si une ligne pèse plus de la moitié du mouvement, on le dit.
  let titre = "Votre semaine en Bourse.", sous = "";
  if (g != null) {
    const gros = Lpf.slice().sort((x, y) => Math.abs(y.portefeuille.var_eur) - Math.abs(x.portefeuille.var_eur))[0];
    const part = gros && Math.sign(gros.portefeuille.var_eur) === Math.sign(g) && Math.abs(g) >= 1 ? gros.portefeuille.var_eur / g : 0;
    titre = part >= 0.6 && Lpf.length > 1 ? `${esc(r8Maj(r8Court(gros)))} explique ${F0.format(Math.abs(Math.round(gros.portefeuille.var_eur)))}&nbsp;€ sur les ${F0.format(Math.abs(Math.round(g)))}&nbsp;€ ${g < 0 ? "perdus" : "gagnés"} cette semaine.`
      : `Votre portefeuille a ${g >= 0 ? "gagné" : "perdu"} ${F0.format(Math.abs(Math.round(g)))}&nbsp;€ cette semaine.`;
    const autres = Lpf.filter(l => l !== gros).reduce((a, l) => a + l.portefeuille.var_eur, 0);
    sous = part >= 0.6 && Lpf.length > 1 ? `Vos ${Lpf.length - 1} autres lignes ensemble : ${r8Eur(autres)}.` : "";
  } else if (meil) titre = `Cette semaine, ${esc(meil.nom)} a le plus bougé parmi vos valeurs.`;
  const spark = (() => { const v = (pf && pf.serie || []).filter(x => x != null); if (v.length < 2) return ""; const lo = Math.min(...v), hi = Math.max(...v), r = hi - lo || 1, w = 150, h = 54;
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline fill="none" stroke="${g < 0 ? "#d1242f" : "#0a8a3a"}" stroke-width="3" stroke-linejoin="round" points="${v.map((x, i) => `${(i * w / (v.length - 1)).toFixed(1)},${(h - 3 - (x - lo) / r * (h - 6)).toFixed(1)}`).join(" ")}"/></svg>`; })();
  const chips = idx.map(i => `<span class="r8-chip">${esc(i.nom)} <b class="${r8Cls(i.pct)}">${synPct(i.pct)}</b></span>`).join("");
  const pfCarte = pf && g != null ? `<div class="r8-card r8-pfc"><small>Votre portefeuille</small><div class="r8-row"><div><div class="r8-big ${r8Cls(g)}">${r8Eur(g)}</div><span>${synPct(pf.var_pct)} · il vaut ${F0.format(Math.round(pf.valeur_eur))}&nbsp;€</span>${SANSV.length ? `<small class="r8-sansv">Variation calculée sans ${esc(SANSV.map(l => r8Court(l).replace(/^votre ETF /, "")).join(", "))} (${F0.format(Math.round(SANSV.reduce((a, l) => a + l.portefeuille.valeur_eur, 0)))}&nbsp;€), dont le site n'a pas le cours de la semaine.</small>` : ""}</div>${spark}</div><div class="r8-chips">${chips}</div></div>`
    : chips ? `<div class="r8-card r8-pfc"><small>Les indices de la semaine</small><div class="r8-chips">${chips}</div></div>` : "";
  let h = `<div class="r8"><div class="r8-band"><div class="r8-w">
    <div class="r8-top"><span class="r8-logo">ENKLAIR</span><span>${b.date_rapport ? "Rapport du " + esc(new Date(b.date_rapport + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })) : "Votre rapport · " + (b.du ? esc(synDuAu(b)) : "") + (b.en_cours ? " (en cours)" : "")}</span></div>
    <div class="r8-hg"><div><h1>${titre}</h1>${sous ? `<p class="r8-l">${sous}</p>` : ""}</div>${pfCarte}</div>
    ${cartes ? `<div class="r8-trois">${cartes}</div>` : ""}</div></div><div class="r8-w">`;
  const secs = [Lpf.length ? ["pf", "Votre portefeuille"] : null, M.length ? ["monde", "Le monde cette semaine"] : null, ["co", "Vos entreprises"], (b.a_venir || []).length || (b.dca || []).length ? ["av", "À venir"] : null].filter(Boolean);
  h += `<nav class="r8-som">${secs.map(([id, t], i) => `<a href="#r8-${id}"><i>${i + 1}</i>${t}</a>`).join("")}</nav>`;
  let num = 0;

  /* ---------- 1. Portefeuille ---------- */
  if (Lpf.length) { num++;
    const mx = Math.max(1, ...Lpf.map(l => Math.abs(l.portefeuille.var_eur)));
    const bars = Lpf.map(l => { const e = l.portefeuille.var_eur; return `<div class="r8-cb"><span><a href="${synLien(l.k)}">${esc(r8Court(l).replace(/^votre ETF /, "ETF "))}</a><small>${F0.format(Math.round(l.portefeuille.poids_pct || 0))} % du portefeuille</small></span><span class="tr"><span class="z"></span><span class="f" style="${e < 0 ? "right" : "left"}:50%;width:${(Math.abs(e) / mx * 48).toFixed(0)}%;background:${e < 0 ? "#d1242f" : "#0a8a3a"}"></span></span><b class="${r8Cls(e)}">${r8Eur(e)}</b></div>`; }).join("");
    const gros = Lpf.slice().sort((x, y) => Math.abs(y.portefeuille.var_eur) - Math.abs(x.portefeuille.var_eur))[0], reste = Lpf.filter(l => l !== gros).reduce((a, l) => a + l.portefeuille.var_eur, 0);
    const retenir = Lpf.length > 1 && Math.abs(gros.portefeuille.var_eur) > Math.abs(reste) ? `<p class="r8-ret"><b>À retenir.</b> ${esc(r8Maj(r8Court(gros)))} seul : ${r8Eur(gros.portefeuille.var_eur)}. Toutes vos autres lignes ensemble : ${r8Eur(reste)}.</p>` : "";
    // Lecture calculée : exposition aux États-Unis, comparaison aux indices
    const lec = [];
    if (us && us.pct >= 5) { const direct = us.direct.length, via = us.via_etf.reduce((a, x) => a + x.eur, 0);
      lec.push(`${F0.format(Math.round(us.pct))} % de votre argent est placé aux États-Unis${via > 0 && !direct ? ", uniquement à travers vos ETF" : via > 0 ? `, dont ${F0.format(via)} € à travers vos ETF` : ""}.`); }
    const cac = idx.find(i => i.id === "cac40"), sp = idx.find(i => i.id === "sp500");
    if (pf.var_pct != null && cac) lec.push(`Votre portefeuille (${synPct(pf.var_pct)}) a fait ${pf.var_pct >= cac.pct ? "mieux" : "moins bien"} que le CAC 40 (${synPct(cac.pct)})${sp ? ` et ${pf.var_pct >= sp.pct ? "mieux" : "moins bien"} que le S&P 500 (${synPct(sp.pct)})` : ""}.`);
    const al = (pf.alertes || []).slice(0, 2).map(a => `<p class="r8-al"><b>${esc(a.texte)}</b> ${esc(a.pourquoi || "")}</p>`).join("");
    h += `<section id="r8-pf"><span class="r8-tag">${num} · Votre portefeuille</span><h2>Ce que chaque ligne vous a fait gagner ou perdre.</h2><p class="r8-sub">En euros, sur la semaine. La ligne la plus lourde n'est pas toujours celle qu'on regarde.</p>
      <div class="r8-g2"><div class="r8-card r8-box"><p class="r8-lab">Gains et pertes de la semaine</p>${bars}${SANSV.map(l => `<div class="r8-cb r8-cbx"><span><a href="${synLien(l.k)}">${esc(r8Court(l).replace(/^votre ETF /, "ETF "))}</a><small>${F0.format(Math.round(l.portefeuille.poids_pct || 0))} % du portefeuille · ${F0.format(l.portefeuille.valeur_eur)}&nbsp;€${l.portefeuille.source_valeur === "achat" ? " au prix d'achat" : ""}</small></span><span class="r8-nc">Cours de la semaine pas suivi par le site</span></div>`).join("")}${retenir}</div>
      <div class="r8-card r8-box"><p class="r8-lab">Ce qu'il faut en retenir</p>${lec.map(t => `<p class="r8-p">${esc(t)}</p>`).join("")}${al}<p class="r8-ia">Calculé par ENKLAIR à partir de votre portefeuille, des cours et du contenu officiel de vos ETF. Aucune prévision, aucun conseil.</p></div></div>`;
    // Achats programmés
    for (const x of b.dca || []) {
      const cur = x.devise && x.devise !== "EUR" ? x.devise : "€", mt = v => v == null ? "–" : F2.format(v) + " " + cur;
      const t = x.date ? `Votre achat du ${r8Jr(x.date)} : ${F0.format(x.q)} part${x.q > 1 ? "s" : ""} ${r8De(x.nom)}.` : `Votre achat programmé : ${F0.format(x.q)} part${x.q > 1 ? "s" : ""} ${r8De(x.nom)}, le ${x.jour === 1 ? "1er" : x.jour} de chaque mois.`;
      const p1 = x.date && x.prix && x.prix_avant ? `Achetées ${mt(x.prix)} l'une, contre ${mt(x.prix_avant)} une semaine plus tôt (cours de clôture).` : "";
      const p2 = x.n_achats && x.prix_moyen ? ` Depuis le début, ${x.n_achats} achat${x.n_achats > 1 ? "s" : ""} programmé${x.n_achats > 1 ? "s" : ""} à ${mt(x.prix_moyen)} en moyenne (prix relevés par le site)${x.cours ? `, pour un cours de ${mt(x.cours)} aujourd'hui` : ""}.` : "";
      const kp = x.montant != null ? `<div class="r8-kp"><div><b>${mt(x.montant).replace(/,00(?=\s)/, "")}</b><small>ce mois-ci</small></div><div><b>${mt(x.montant_avant).replace(/,00(?=\s)/, "")}</b><small>une semaine plus tôt</small></div></div>` : `<div class="r8-kp"><div><b>${r8Jr(x.prochain)}</b><small>prochain achat</small></div></div>`;
      h += `<div class="r8-card r8-dca"><div class="r8-ic">↻</div><div><span class="r8-tag b">Votre achat programmé</span><h3>${esc(t)}</h3><p>${esc(p1 + p2) || "Le rapport suit chaque achat et son prix."}</p></div>${kp}</div>`;
    }
    if ((b.dca || []).length) h += `<p class="r8-note">Ce qui s'est passé, jamais s'il faut continuer : c'est votre décision.</p>`;
    // Radiographie
    if (radio.length) {
      const C = ["#d1242f", "#2b59c3", "#7a5af8", "#111"];
      h += `<div class="r8-sh"><span class="r8-tag r">Radiographie</span><h3 class="r8-h3">Votre argent face aux sujets de la semaine.</h3><p class="r8-sub">Ce que vous possédez vraiment, ETF compris. La barre montre la part de votre portefeuille.</p></div><div class="r8-radio">${radio.map((x, i) => {
        const s = x.sujet != null ? M[x.sujet] : null, comp = [x.direct.length ? `En direct : ${x.direct.join(", ")}.` : "", x.via_etf.length ? `${x.direct.length ? "Et à travers" : "À travers"} ${x.via_etf.map(e => `${r8Court({ nom: e.nom, k: "e:" })} (${F0.format(e.eur)} €)`).join(", ")}${x.exemples.length ? ` : ${x.exemples.join(", ")}` : ""}.` : ""].filter(Boolean).join(" ");
        return `<div class="r8-rx${s ? " hot" : ""}"><span class="th">${esc(x.lab)}</span><div class="pc">${F0.format(Math.round(x.pct))}&nbsp;%<small>${F0.format(x.eur)}&nbsp;€</small></div><div class="stack"><span style="width:${Math.min(100, x.pct).toFixed(1)}%;background:${C[i % 4]}"></span></div><p>${esc(comp)}</p>${s ? `<p class="sem"><b>Sujet de la semaine</b> : ${esc(s.titre)}</p>` : ""}</div>`; }).join("")}</div>
        <p class="r8-note">${b.radio.source ? `Contenu des ETF : ${esc(b.radio.source.nom)}${b.radio.source.au ? `, au ${esc(r8Jr(b.radio.source.au))} ${esc(b.radio.source.au.slice(0, 4))}` : ""}. ` : ""}Les entreprises des ETF que le site ne reconnaît pas ne sont pas comptées : les vrais totaux peuvent être un peu plus élevés.</p>`;
    }
    const faibles = (b.radio && b.radio.faibles) || []; // 7/11 : moins de 5 % du portefeuille, cité en une ligne
    const nc = (b.radio && b.radio.non_comptes) || [];
    if (nc.length && (radio.length || faibles.length)) h += `<p class="r8-faible"><b>Pas compté ici</b> : ${nc.map(x => `${esc(r8Court({ nom: x.nom, k: x.k || "e:" }))} (${F0.format(x.eur)}&nbsp;€, ${F0.format(Math.round(x.pct))}&nbsp;% du portefeuille)`).join(", ")}. Le site ne connaît pas encore ${nc.length > 1 ? "leur" : "son"} contenu : ${nc.length > 1 ? "ces lignes ne sont pas comptées" : "cette ligne n'est pas comptée"} dans les parts ci-dessus.</p>`;
    if (faibles.length) h += `${radio.length ? "" : `<div class="r8-sh"><span class="r8-tag r">Radiographie</span><h3 class="r8-h3">Votre argent face aux sujets de la semaine.</h3></div>`}<p class="r8-faible"><b>${radio.length ? "Touchés de loin" : "Les sujets de la semaine touchent peu votre portefeuille"}</b> : ${faibles.map(x => `${esc(x.lab)} ${x.pct < 1 ? "moins de 1" : F0.format(Math.round(x.pct))}&nbsp;%`).join(" · ")}.</p>`;
    h += `</section>`;
  }

  /* ---------- 7/11 soir : dans vos ETF, vos vraies entreprises (b.etf8, cf/src/rapport8.mjs transparenceDe) ---------- */
  const X8 = b.etf8 || null;
  if (X8 && (X8.par_etf || []).length) { num++;
    const mv = r => `<div class="r8x-mv"><a href="${synLien(r.k)}">${esc(r.nom)} <small>${F1.format(r.poids)} %</small></a><span class="${r8Cls(r.ve)}">${synPct(r.ve)}</span><b class="${r8Cls(r.eur)}">${r8Eur(r.eur)}</b></div>`;
    h += `<section id="r8-etf"><span class="r8-tag">${num} · Dans vos ETF</span><h2>Ce qu'il y a dans vos ETF.</h2>
      ${(X8.memes_indices || []).map(m => `<p class="r8x-note">À retenir : ${m.etfs.map(e => esc(r8Court({ nom: e.nom, k: e.k }))).join(" et ")} suivent le même indice (${esc(m.index)}). Ils contiennent les mêmes entreprises : réunis, c'est comme un seul ETF de ${F0.format(m.eur)} €.</p>`).join("")}
      ${(X8.sans_compo || []).length ? `<p class="r8-faible"><b>Contenu non publié</b> : ${X8.sans_compo.map(x => `${esc(r8Court({ nom: x.nom, k: x.k }))} (${F0.format(x.eur)}&nbsp;€)`).join(", ")}. Le site ne sait pas encore ce qu'il contient.</p>` : ""}`;
    const E = X8.entreprises || [], mx = Math.max(1, ...E.map(x => x.eur)), MT = X8.metiers || [], mxm = Math.max(1, ...MT.map(x => Math.abs(x.eur)));
    h += `<div class="r8-sh"><span class="r8-tag b">Vos vraies entreprises</span><h3 class="r8-h3">Les ${E.length} entreprises où est vraiment votre argent.</h3><p class="r8-sub">${X8.profil === "etf" ? "Vos ETF additionnés." : "En direct et à travers vos ETF, additionnés."} Un clic ouvre la fiche.</p></div>
      <div class="r8x-deux"><div class="r8-card r8x-box"><table class="r8x-top"><thead><tr><th>Entreprise</th><th>Votre argent</th><th>Semaine</th><th>Pour vous</th></tr></thead><tbody>${E.map(x => `<tr><td><span class="r8x-bar" style="width:${Math.max(6, Math.round(x.eur / mx * 64))}px"></span><a href="${synLien(x.k)}">${esc(x.nom)}</a>${x.direct > 0 && x.via > 0 ? ` <small>dont ${F0.format(x.direct)} € en direct</small>` : ""}</td><td><b>${F0.format(x.eur)} €</b></td><td class="${r8Cls(x.v)}">${x.v != null ? synPct(x.v) : "–"}</td><td class="${r8Cls(x.contrib)}"><b>${x.contrib != null ? r8Eur(x.contrib) : "–"}</b></td></tr>`).join("")}</tbody></table>
      <p class="r8x-cov">Ces ${E.length} entreprises : ${F0.format(X8.top_eur)} €, ${F0.format(Math.round(X8.top_pct))} % de votre argent.</p></div>
      <div class="r8-card r8x-box"><p class="r8-lab">Par métier, cette semaine</p>${MT.map(x => { const w = Math.round(Math.abs(x.eur) / mxm * 46); return `<div class="r8x-met"><span>${esc(x.nom)}</span><div class="tr"><i class="z"></i><i class="f ${x.eur < 0 ? "dn" : "up"}" style="${x.eur < 0 ? `right:50%;width:${w}%` : `left:50%;width:${w}%`}"></i></div><b class="${r8Cls(x.eur)}">${r8Eur(x.eur)}</b></div>`; }).join("")}
      ${(X8.doublons || []).length ? (() => { const DB = X8.doublons, et = [...new Set(DB.flatMap(d => d.etfs))].map(n => r8Court({ nom: n, k: "e:" })), vs = DB.map(d => d.via); return `<p class="r8x-note"><b>En double</b> : ${esc(DB.map(d => d.nom).join(", ").replace(/, ([^,]*)$/, " et $1"))} ${DB.length > 1 ? "sont" : "est"} en direct dans votre portefeuille et aussi dans ${esc(et.join(", "))} (${Math.min(...vs) === Math.max(...vs) ? F0.format(vs[0]) : `${F0.format(Math.min(...vs))} à ${F0.format(Math.max(...vs))}`} € chacune).</p>`; })() : ""}</div></div>
      <p class="r8-note">Contenu des ETF : ${esc(X8.source || "positions publiées des fonds")}. Variations en euros, au taux de la BCE.</p></section>`;
  }

  /* ---------- 2. Le monde ---------- */
  if (M.length) { num++;
    h += `<section id="r8-monde"><span class="r8-tag b">${num} · Le monde cette semaine</span><h2>Ce qui a fait bouger les marchés.</h2><p class="r8-sub">Les sujets de la semaine, ce que nos chiffres montrent, et lesquelles de vos valeurs sont concernées.</p><div class="r8-monde">${M.map((s, i) => {
      const touche = s.touche.map(t => `<a class="r8-pill" href="${synLien(t.k)}">${esc(t.nom)} ${t.v != null ? synPct(t.v) : ""}${t.eur != null ? ` · ${r8Eur(t.eur)}` : ""}</a>`).join("");
      const viaEtf = radio.filter(x => x.sujet === i && x.via_etf.length).flatMap(x => x.via_etf).map(e => `<span class="r8-pill">${esc(r8Maj(r8Court({ nom: e.nom, k: "e:" })))} · ${F0.format(e.eur)}&nbsp;€ concernés</span>`).join("");
      return `<div class="r8-sujet"><div class="hd" style="background:${R8_COUL[i % 3]}"><span class="th">${esc(s.theme)}</span><h3>${esc(s.titre)}</h3></div><div class="bd"><p class="fait">${esc(s.fait)}</p>
        ${s.chiffres.length ? `<div class="r8-chif"><span class="t">Nos chiffres de la semaine</span>${s.chiffres.map(c => `<div>${c.k ? `<a href="${synLien(c.k)}">${esc(c.lab)}</a>` : `<span>${esc(c.lab)}</span>`}<b class="${r8Cls(c.v)}">${synPct(c.v)}</b></div>`).join("")}</div>` : ""}
        <div class="r8-vous"><b class="hh">Chez vous</b>${touche || viaEtf ? touche + viaEtf : `<p>Aucune de vos valeurs n'est directement concernée.</p>`}</div>
        ${s.fond ? `<p class="r8-fond">Toile de fond : ${esc(s.fond.titre)} (dossier ENKLAIR${s.fond.maj ? `, mis à jour le ${esc(r8Jr(s.fond.maj))}` : ""}).</p>` : ""}
        <p class="r8-src">Sources : ${s.titres.map(t => `<a href="${esc(t.u)}" target="_blank" rel="noopener">${esc(String(t.s || "").replace(/^www\./, ""))}, ${esc(r8Jr(t.d))} ↗</a>`).join(" · ")}. Sujet choisi et résumé par l'IA d'ENKLAIR à partir de ces titres ; chiffres calculés par le site.</p></div></div>`; }).join("")}</div></section>`;
  }

  /* ---------- 3. Vos entreprises ---------- */
  num++;
  const LV = ((b.etf8 && b.etf8.vues) || []).filter(v => R[v.k]).map(v => ({ ...v, vue: true })); // 7/11 soir : les plus grosses entreprises des ETF
  const coLignes = [...L.filter(l => l.k.startsWith("c:") || l.k.startsWith("e:")), ...LV]; // 8/11 (Romain) : un encadré par entreprise et par ETF suivis ou en portefeuille
  const aRes = l => deK(l.k).some(a => a.origine !== "presse" && a.categorie === "resultats"); // 7/11 nuit : celles qui ont publié leurs résultats d'abord
  const ordre = l => (aRes(l) ? 0 : 1) * 4e6 + (l.vue ? 2e6 : 0) + (l.portefeuille ? 0 : 1) * 1e6 - (deK(l.k).length * 100 + Math.abs((l.portefeuille && l.portefeuille.var_eur) || l.variation_semaine_pct || 0));
  coLignes.sort((a, c) => ordre(a) - ordre(c));
  const avecNouv = coLignes;
  const calmes = [];
  h += `<section id="r8-co"><span class="r8-tag v">${num} · Vos valeurs</span><h2>Pourquoi chacune a bougé.</h2><p class="r8-sub">Chacune est comparée à ses rivales sur la même semaine : on voit tout de suite si le mouvement vient d'elle ou de tout son métier.</p>`;
  const ETFX = Object.fromEntries(((b.etf8 && b.etf8.par_etf) || []).map(e => [e.k, e]));
  const mvE = r => `<div class="r8x-mv"><a href="${synLien(r.k)}">${esc(r.nom)} <small>${F1.format(r.poids)} %</small></a><span class="${r8Cls(r.ve)}">${synPct(r.ve)}</span><b class="${r8Cls(r.eur)}">${r8Eur(r.eur)}</b></div>`;
  for (const l of avecNouv) {
    if (l.k.startsWith("e:")) { // 8/11 : un ETF, ce qui l'a fait bouger (ses plus grosses entreprises, en euros pour vous)
      const e = ETFX[l.k], v = l.variation_semaine_pct, ind = l.indice;
      const meta = l.portefeuille ? `${F0.format(Math.round(l.portefeuille.poids_pct || 0))} % de votre portefeuille${l.portefeuille.var_eur != null ? ` · ${r8Eur(l.portefeuille.var_eur)} cette semaine` : ""}` : "Dans vos favoris";
      const phrase = v == null ? "Le site n'a pas son cours de la semaine." : e && (e.baisse.length || e.hausse.length) ? `${e.n ? `Il contient ${F0.format(e.n)} entreprises. ` : ""}Celles qui ont le plus pesé, en euros pour vous :` : ind && ind.pct != null ? `Il a fait ${synPct(v)}, son indice ${esc(ind.nom)} ${synPct(ind.pct)}.` : `Il a fait ${synPct(v)} sur la semaine.`;
      h += `<article class="r8-card r8-co"><div class="r8-coh">${synLogo(l.k, 44)}<div class="nm"><h3><a href="${synLien(l.k)}">${esc(r8Maj(r8Court(l)))}</a></h3><small>${esc(meta)}</small></div><div class="pf"><b class="${r8Cls(v)}">${v == null ? "–" : synPct(v)}</b><small>${ind && ind.pct != null ? `${esc(ind.nom)} ${synPct(ind.pct)}` : "sur la semaine"}</small></div></div>
        <div class="r8-cob seul"><div class="r8-lec"><p class="r8-lab"><i>✦</i> Pourquoi il a bougé</p><p class="r8-ouv">${phrase}</p>${e ? `${e.baisse.length ? `<p class="r8x-h">Ont fait baisser</p>${e.baisse.map(mvE).join("")}` : ""}${e.hausse.length ? `<p class="r8x-h">Ont fait monter</p>${e.hausse.map(mvE).join("")}` : ""}<p class="r8x-cov">Entreprises suivies par le site : ${F0.format(e.couvert_pct)} % du fonds.${e.via_indice ? ` Contenu de l'indice ${esc(e.via_indice)} (l'émetteur ne publie pas ses positions).` : ""}</p>` : ""}</div></div>
        <div class="r8-cof"><a href="${synLien(l.k)}">Voir la fiche de l'ETF</a></div></article>`;
      continue; }
    const A = deK(l.k), R0 = R[l.k], ia = IA[l.k], [vt, vc] = (R0 && R8_VERD[R0.verdict]) || [null, ""], v = l.variation_semaine_pct;
    const meta = [l.vue ? `${F0.format(l.via_eur)} € à travers vos ETF` : l.portefeuille ? `${F0.format(Math.round(l.portefeuille.poids_pct || 0))} % de votre portefeuille${l.portefeuille.var_eur != null ? ` · ${r8Eur(l.portefeuille.var_eur)} cette semaine` : ""}` : "Dans vos favoris"].join("");
    // L'IA n'est montrée que pour une annonce officielle (elle explique l'annonce) ; le « pourquoi » est toujours calculé
    const annOff = A.some(a => a.origine !== "presse" && !["rachat", "capital"].includes(a.categorie)), P = R0 ? r8Pourquoi(l, R0, A) : [];
    const lecture = (P.length ? `<p class="r8-ouv">${P[0]}</p>${P.slice(1).map(t => `<p>${t}</p>`).join("")}` : `<p class="r8-ouv">${esc(r8Lecture(l, R0, A))}</p>`)
      + (R0 ? r8Jours(l, R0, A) : "") + r8Faits(l, R0, A)
      + (ia && ia.clair && annOff ? `<div class="r8-iac"><p class="r8-lab">Son annonce en clair</p><p>${esc(ia.clair)}</p>${ia.change ? `<p>${esc(ia.change)}</p>` : ""}<p class="r8-ia">Rédigé par l'IA d'ENKLAIR à partir de l'annonce. La source fait foi.</p></div>` : "");
    const res = A.find(a => a.origine !== "presse" && (a.chiffres || []).length), npr = A.filter(a => a.origine === "presse").length, ncour = A.filter(a => ["rachat", "capital"].includes(a.categorie) && a.origine !== "presse").length;
    const preuve = [ncour ? "Opérations courantes : " + ncour : ""].filter(Boolean);
    // 8/11 (Romain : « mettre en avant les articles qui concernent les entreprises ») : jusqu'à 3 articles visibles, chacun avec « Expliquer »
    const PR = A.filter(a => a.origine === "presse").slice(0, 3);
    const presse = PR.length ? `<div class="r8-presse"><p class="r8-lab">Dans la presse cette semaine</p>${PR.map(a => `<div class="r8-pr"><p><time>${esc(r8Jr(a.date))}</time> ${r8Titr(a)}</p><span class="r8-ac">${a.source ? `<a href="${esc(a.source)}" target="_blank" rel="noopener">${esc(String(a.site || "presse").replace(/^www\./, ""))} ↗</a>` : ""}<button type="button" class="r8-exp" data-syn-exp="${SYN_ANN.push(a) - 1}">✦ Expliquer</button></span><div class="syn4-cl"></div></div>`).join("")}</div>` : "";
    const bars = R0 ? [...R0.liste.map(x => ({ ...x, moi: false })), { k: l.k, nom: l.nom, v, moi: true }].filter(x => x.v != null).sort((a, c) => c.v - a.v).map(x => r8Bar(x.nom, x.v, x.moi, x.moi ? null : x.k)).join("") : "";
    const nv = R0 && R0.nouvelles.length ? `<div class="r8-nouv"><p class="r8-lab">Leurs nouvelles</p>${R0.nouvelles.map(a => { const lg = typeof synLangue === "function" ? synLangue(a.titre) : "fr";
      return `<div><b>${esc(a.nom)}</b> · ${a.origine === "presse" ? `<span${lg !== "fr" ? ` data-tr="${lg}"` : ""}>${esc(r8Titre(a.titre))}</span> (presse)` : esc((SYN6_T[a.categorie] || ["Annonce"])[0]) + (a.chiffres && a.chiffres.length ? " : " + a.chiffres.slice(0, 2).map(([x, y]) => `${x.toLowerCase()} ${y}`).join(", ") : a.titre ? " : " + a.titre : "")}${a.source ? ` <a href="${esc(a.source)}" target="_blank" rel="noopener">↗</a>` : ""}</div>`; }).join("")}</div>` : "";
    const liste = A.length ? `<details class="r8-det"><summary>${A.length > 1 ? `Les ${A.length} annonces et articles` : "L'annonce de la semaine"}</summary>${A.map(a => { const pr = a.origine === "presse", lg = pr && typeof synLangue === "function" ? synLangue(a.titre) : "fr", lab = pr ? "Presse" : (SYN6_T[a.categorie] || ["Annonce"])[0];
      return `<div class="r8-li"><time>${esc(r8Jr(a.date))}</time><span class="r8-ty">${esc(lab)}</span><div><p><span${lg !== "fr" ? ` data-tr="${lg}"` : ""}>${esc(a.titre || a.type || lab)}</span></p>${(a.chiffres || []).length ? `<p class="r8-mini">${esc(a.chiffres.slice(0, 3).map(([x, y]) => `${x} : ${y}`).join(" · "))}</p>` : ""}<div class="syn4-cl"></div></div><span class="r8-ac">${a.source ? `<a href="${esc(a.source)}" target="_blank" rel="noopener">${esc(pr ? String(a.site || "presse").replace(/^www\./, "") : a.source_nom || "Source")} ↗</a>` : ""}<button type="button" class="r8-exp" data-syn-exp="${SYN_ANN.push(a) - 1}">✦ Expliquer</button></span></div>`; }).join("")}</details>` : "";
    const dt = (b.a_venir || []).find(e => e.k === l.k);
    h += `<article class="r8-card r8-co"><div class="r8-coh">${synLogo(l.k, 44)}<div class="nm"><h3><a href="${synLien(l.k)}">${esc(l.nom)}</a>${vt ? ` <span class="r8-verd ${vc}">${vt}</span>` : ""}</h3><small>${esc(meta)}</small></div><div class="pf"><b class="${r8Cls(v)}">${synPct(v)}</b><small>${l.indice ? `${esc(l.indice.nom)} ${synPct(l.indice.pct)}` : "sur la semaine"}</small></div></div>
      <div class="r8-cob${bars ? "" : " seul"}"><div class="r8-lec"><p class="r8-lab"><i title="Calculé par ENKLAIR : cours de clôture, annonces officielles, comptes des rivales">✦</i> Pourquoi elle a bougé</p>${lecture}${presse}${preuve.length ? `<div class="r8-preuve">${preuve.map(t => `<span>${esc(t)}</span>`).join("")}</div>` : ""}</div>
      ${bars ? `<div class="r8-riv"><p class="r8-lab">Ses rivales sur la semaine</p>${bars}${nv}</div>` : ""}</div>
      <div class="r8-cof">${liste}<a href="${synLien(l.k)}">Voir la fiche</a>${dt ? `<span class="r8-dt">${esc(r8Jr(dt.date))} · ${esc(String(dt.label || "").replace(/^./, c => c.toLowerCase()))}</span>` : ""}</div></article>`;
  }
  if (calmes.length) h += `<div class="r8-calme"><b>Sans nouvelle cette semaine</b> · ${calmes.map(l => `<a href="${synLien(l.k)}">${esc(l.nom)} <span class="${r8Cls(l.variation_semaine_pct)}">${synPct(l.variation_semaine_pct)}</span></a>`).join(", ")}</div>`;
  if (!L.length) h += `<p class="muted">Ajoutez des favoris ou des lignes de portefeuille pour les suivre ici.</p>`;
  h += `</section>`;

  /* ---------- 7/11 soir : ce qui joue sans qu'on le voie (devise, frais) et vos dividendes ---------- */
  if (X8 && (X8.devise || X8.frais || (X8.dividendes || []).length)) { num++;
    const D = X8.devise, Fr = X8.frais, DV = X8.dividendes || [];
    h += `<section id="r8-dev"><span class="r8-tag v">${num} · Devise, frais${DV.length ? " et dividendes" : ""}</span><h2>Ce qui joue sans que vous le voyiez.</h2><div class="r8x-deux">
      ${D ? `<div class="r8-card r8x-box"><p class="r8-lab"><i>$</i>L'effet du dollar</p><div class="r8x-big">${F0.format(D.us_eur)} €</div><p>de votre argent est placé aux États-Unis${X8.par_etf.length ? (X8.profil === "etf" ? ", à travers vos ETF" : ", en direct et à travers vos ETF") : ""} (${F0.format(Math.round(D.us_pct))} %).</p>
        <p>Le dollar a ${D.usd_pct >= 0 ? "pris" : "perdu"} <b>${F2.format(Math.abs(D.usd_pct))} %</b> face à l'euro cette semaine (1 € = ${String(D.taux_debut).replace(".", ",")} $ le ${esc(r8Jr(D.date_debut))}, ${String(D.taux_fin).replace(".", ",")} $ le ${esc(r8Jr(D.date_fin))}) : <b class="${r8Cls(D.effet_eur)}">${r8Eur(D.effet_eur)}</b> pour vous, quoi que fassent les actions.</p><p class="r8x-cov">Taux de référence de la BCE.</p></div>` : ""}
      ${Fr ? `<div class="r8-card r8x-box"><p class="r8-lab"><i>%</i>Les frais de vos ETF</p><div class="r8x-big">${F0.format(Math.round(Fr.an))} € <small>par an</small></div><p>Soit ${F2.format(Fr.semaine)} € cette semaine, déjà retirés de la valeur de vos ETF.</p>${Fr.lignes.map(f => `<div class="r8x-mv"><span>${esc(f.nom)} <small>${F2.format(f.ter)} % par an</small></span><span></span><b>${F0.format(Math.round(f.an))} €</b></div>`).join("")}</div>` : ""}
      ${DV.length ? `<div class="r8-card r8x-box"><p class="r8-lab"><i>€</i>Vos dividendes</p>${DV.map(x => `<div class="r8x-mv"><a href="${synLien(x.k)}">${esc(x.nom)} <small>${x.montant != null ? `${F2.format(x.montant)} ${esc(x.devise || "")} par action` : ""}</small></a><span>${x.date ? `${x.passe ? "détaché le" : "détachement le"} ${esc(r8Jr(x.date))}` : ""}${x.paiement ? ` · payé le ${esc(r8Jr(x.paiement))}` : ""}</span><b>${x.eur != null ? `≈ ${F2.format(x.eur)} €` : "–"}</b></div>`).join("")}<p class="r8x-cov">Pour le nombre d'actions de votre portefeuille, avant impôts, au taux de change du jour. Calendriers publiés par les places de cotation.</p></div>` : ""}
      </div></section>`;
  }

  /* ---------- 4. À venir ---------- */
  const av = [...(b.a_venir || []).slice(0, 14).map(e => ({ date: e.date, k: e.k, t: e.nom || "", p: String(e.label || "").replace(/^./, c => c.toLowerCase()) })),
    ...((b.etf8 && b.etf8.a_venir) || []).map(e => ({ date: e.date, k: e.k, t: e.nom, p: `${e.label}${e.via ? ` · ${F0.format(e.via)} € à travers vos ETF` : ""}` })),
    ...(b.dca || []).map(x => ({ date: x.prochain, k: x.k, t: "Votre achat programmé", p: `${F0.format(x.q)} part${x.q > 1 ? "s" : ""} ${r8De(x.nom)}` }))].sort((a, c) => a.date.localeCompare(c.date));
  if (av.length) { num++;
    h += `<section id="r8-av"><span class="r8-tag">${num} · À venir</span><h2>Les dates à noter.</h2><div class="r8-av">${av.map(e => { const d = new Date(e.date + "T12:00:00Z");
      return `<div class="r8-card"><div class="r8-cal"><small>${esc(SYN_MOIS[d.getUTCMonth()].replace(".", "").toUpperCase())}</small><b>${d.getUTCDate()}</b></div><p><b>${esc(e.t)}</b><br>${esc(e.p)}</p></div>`; }).join("")}</div>
      ${(b.a_venir || []).length ? `<p class="r8-note"><button type="button" class="s6-ics" data-synics="all">＋ Ajouter à mon agenda (.ics)</button></p>` : ""}</section>`;
  }
  h += `<p class="r8-fin">Information, pas conseil : ENKLAIR ne dit jamais quoi acheter ou vendre. Variations entre la clôture précédant la semaine et le dernier cours connu (différé). Annonces : documents officiels (AMF, SEC, bourses nordiques et de Londres). Presse : titres relevés par le site ; seul le titre est connu, l'article fait foi.</p></div></div>`;
  setTimeout(() => { if (typeof axTraduire === "function") axTraduire(); }, 50);
  return h;
}
synPageHTML = synPageV8;

/* 6/11 soir (Romain : « j'espère qu'elle ne formule pas une réponse générique que chacun pourrait formuler avec sa propre IA et le lien de l'article ») :
   le bouton « Expliquer » d'une annonce ou d'un article joint la fiche de l'entreprise (comptes, médiane du secteur, rivales, dates, ce qui fait varier
   ses résultats) et, dans le rapport, sa semaine face à ses rivales. Utilisé par m/synthese.js, m/actu4.js et m/actu.js. */
async function iaFicheContexte(id) {
  const s = typeof RBY !== "undefined" ? RBY[id] : null; if (!s) return {};
  let full = typeof FULL !== "undefined" ? FULL[id] : null;
  if (!full) { try { full = await (await fetch(`/data/societes/${id}.json`)).json(); if (typeof FULL !== "undefined") FULL[id] = full; } catch (e) { full = null; } }
  try { if (typeof loadAna === "function") await loadAna(); } catch (e) { }
  const out = {};
  try { if (typeof ficheFaits === "function") { const f = ficheFaits(s, full); delete f.donnees_manquantes; out.fiche_de_l_entreprise = f; } } catch (e) { }
  const l = SYN8_B && (SYN8_B.lignes || []).find(x => x.k === "c:" + id), R = SYN8_B && (SYN8_B.rivales || {})["c:" + id];
  if (l) out.sa_semaine_en_bourse = { variation_pct: l.variation_semaine_pct, rivales: R ? R.liste.filter(x => x.v != null).map(x => ({ nom: x.nom, variation_pct: x.v })) : [] };
  return out;
}
