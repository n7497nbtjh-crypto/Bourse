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
/* ===== 8/11 après-midi (Romain, maquettes docs/maquettes/rapport-semaine-v7 à v9) : nouvelle présentation du rapport =====
   Le résultat (bandeau jaune : euros, phrase, courbe, votre semaine face aux indices) ; « Vos lignes » (une ligne par valeur : gagné ou perdu,
   semaine, jauge face à la médiane de ses rivales ; le clic ouvre pourquoi elle a bougé, la presse et ses rivales) ; le monde en tuiles
   (la radiographie « chez vous » rangée dans chaque sujet, filtres par thème et pays) ; à venir en bande. */
const r9Abs = x => F1.format(Math.abs(x)) + "\u00a0%"; // « a perdu 4,4 % » : sans signe
const r9Le = n => /^[AEIOUÉ]/i.test(String(n)) ? "l'" + n : "le " + n;
function r9Verd(l, R0) {
  const v = l.variation_semaine_pct, med = R0 && R0.med; if (v == null || med == null) return null;
  const d = v - med; return d > 1.5 ? ["Mieux que ses rivales", "up"] : d < -1.5 ? ["Moins bien que ses rivales", "dn"] : ["Comme ses rivales", ""];
}
function r9Jauge(l, R0) { const v = l.variation_semaine_pct, med = R0 && R0.med; if (v == null || med == null) return ""; const p = 50 + Math.max(-46, Math.min(46, (v - med) / 6 * 46)); return `<div class="r9-gauge"><i style="left:${p.toFixed(1)}%"></i></div>`; }
// « Pourquoi elle a bougé » : la phrase qui dit l'essentiel, la semaine en trois barres, cinq cases jour par jour, deux phrases au plus
function r9Pq(l, R0, A) {
  const v = l.variation_semaine_pct, ix = l.indice && l.indice.pct != null ? l.indice : null, med = R0 ? R0.med : null, J = (R0 && R0.jours) || [], nom = esc(r8Maj(r8Court(l)));
  const res = [...A].reverse().find(a => a.origine !== "presse" && a.categorie === "resultats" && (a.chiffres || []).length), resJ = res ? String(res.date).slice(0, 10) : null;
  const eI = ix && v != null ? v - ix.pct : null, eR = med != null && v != null ? v - med : null;
  let lead = v == null ? `${nom} : le site n'a pas son cours de la semaine.` : "";
  if (!lead && eI != null && Math.abs(eI) >= 1.5 && Math.abs(eI) >= Math.abs(eR || 0)) {
    const I = esc(r9Le(ix.nom));
    lead = v < 0 && ix.pct < 0 ? (v > ix.pct ? `${nom} a mieux résisté que ${I} : ${synPct(v)} sur la semaine, contre ${synPct(ix.pct)}.` : `${nom} a reculé plus que ${I} : ${synPct(v)} sur la semaine, contre ${synPct(ix.pct)}.`)
      : v >= 0 && ix.pct < 0 ? `${nom} a monté (${synPct(v)}) pendant que ${I} reculait (${synPct(ix.pct)}).`
      : v < 0 && ix.pct >= 0 ? `${nom} a reculé (${synPct(v)}) pendant que ${I} montait (${synPct(ix.pct)}).`
      : v > ix.pct ? `${nom} a fait mieux que ${I} : ${synPct(v)} sur la semaine, contre ${synPct(ix.pct)}.` : `${nom} a moins monté que ${I} : ${synPct(v)} sur la semaine, contre ${synPct(ix.pct)}.`;
  } else if (!lead && eR != null && Math.abs(eR) > 1.5) lead = `${nom} a fait ${eR > 0 ? "mieux" : "moins bien"} que ses rivales : ${synPct(v)} sur la semaine, contre ${synPct(med)} en médiane.`;
  else if (!lead) lead = med != null ? `${nom} a suivi ses rivales : ${synPct(v)} sur la semaine, ${synPct(med)} pour leur médiane.` : `${nom} : ${synPct(v)} sur la semaine.`;
  // la semaine en trois barres
  const B = [[nom, v, "moi"], med != null ? ["Ses rivales <small>(médiane)</small>", med, ""] : null, ix ? [esc(ix.nom), ix.pct, ""] : null].filter(z => z && z[1] != null);
  const mx = Math.max(0.5, ...B.map(z => Math.abs(z[1]))) * 1.15;
  const trio = B.length > 1 ? `<div class="r9-trio">${B.map(([n, x, c]) => `<div class="tb ${c}"><span>${n}</span><div class="tt"><i class="${x < 0 ? "n" : "p"}" style="${x < 0 ? "right" : "left"}:50%;width:${(Math.abs(x) / mx * 50).toFixed(1)}%"></i></div><b class="${r8Cls(x)}">${synPct(x)}</b></div>`).join("")}</div>` : "";
  // jour par jour, avec ce qui s'est passé ce jour-là
  const choc = J.filter(j => j.ind != null && Math.abs(j.ind) >= 2).sort((a, c) => Math.abs(c.ind) - Math.abs(a.ind))[0];
  const fort = J.filter(j => j.v != null).sort((a, c) => Math.abs(c.v) - Math.abs(a.v))[0];
  const ixC = ix ? ix.nom.replace(/^Euro Stoxx 50$/, "Stoxx 50").replace(/^Nasdaq 100$/, "Nasdaq").replace(/^S&P 500$/, "S&P").replace(/^Nikkei 225$/, "Nikkei").replace(/^FTSE 100$/, "FTSE") : "";
  const tagDe = j => j.date === resJ ? ["Résultats", "res"] : choc && j === choc ? [`${ixC} ${synPct(j.ind)}`, j.ind < 0 ? "cr" : "hs"] : fort && j === fort && Math.abs(j.v) >= 2 ? ["Jour clé", "ft"] : null;
  const jours = J.length >= 2 ? `<div class="r9-dcs">${J.map(j => { const t = tagDe(j); return `<div class="dc ${t ? t[1] : ""}"><span class="ev${t ? "" : " vide"}">${t ? esc(t[0]) : "&nbsp;"}</span><small>${esc(r8Jour(j.date).replace(/\s+\S+\.?$/, ""))}</small><b class="${r8Cls(j.v)}">${synPct(j.v)}</b></div>`; }).join("")}</div>` : "";
  // 8/11 (Romain : « Lundi, ses résultats… » mal présenté, « pas trop d'infos ») : ses chiffres publiés en pastilles, plus de phrases
  const kpi = res ? `<div class="r9-kpi"><p class="r9-sh">Ses résultats, publiés le ${esc(r8Jr(res.date))}</p><div>${res.chiffres.slice(0, 3).map(([a, b]) => { const m = /^(.*?)\s*\((.*)\)\s*$/.exec(String(b)), v = m ? m[1] : String(b), p = m ? m[2] : "";
    return `<div class="k"><small>${esc(a)}</small><b>${esc(v)}</b>${p ? `<span class="${/^[+]/.test(p) ? "up" : /^[−-]/.test(p) ? "dn" : ""}">${esc(p.replace(/ %/g, "\u00a0%"))}</span>` : ""}</div>`; }).join("")}</div></div>` : "";
  const P0 = !J.length && !res && R0 ? r8Pourquoi(l, R0, A).slice(0, 2) : [];
  return `<div class="r9-box r9-pq"><p class="r9-h"><i>✦</i> Pourquoi elle a bougé</p><p class="r9-lead">${lead}</p><div class="r9-pqg"><div>${trio}${P0.map(t => `<p>${t}</p>`).join("")}</div><div>${jours ? `<p class="r9-sh">Jour par jour</p>${jours}` : ""}</div></div>${kpi}</div>`;
}
// Face à ses rivales : chaque entreprise placée sur une échelle, la médiane en pointillé, zone rouge à gauche, verte à droite
function r9Riv(l, R0) {
  if (!R0) return ""; const v = l.variation_semaine_pct;
  const L = [...R0.liste.map(x => ({ ...x })), { k: l.k, nom: l.nom, v, moi: true }].filter(x => x.v != null).sort((a, c) => c.v - a.v); if (L.length < 3) return "";
  const ab = L.map(x => Math.abs(x.v)).sort((a, c) => a - c), lim = Math.max(2, ab[Math.floor(ab.length * 0.8)] || 2, Math.abs(R0.med || 0) + 1) * 1.25, X = x => 50 + Math.max(-49, Math.min(49, x / lim * 50));
  const m = X(R0.med), fmtA = Math.round(lim * 10) / 10;
  return `<div class="r9-box r9-riv"><p class="r9-h">Face à ses rivales, sur la semaine</p><div class="r9-med" style="--m:${m.toFixed(1)}%"><span>médiane ${synPct(R0.med)}</span></div>${L.map(x => { const out = Math.abs(x.v) > lim;
    return `<div class="r9-dl${x.moi ? " me" : ""}" style="--m:${m.toFixed(1)}%"><span>${x.moi ? esc(x.nom) : `<a href="${synLien(x.k)}">${esc(x.nom)}</a>`}</span><div class="tr"><i style="left:${X(x.v).toFixed(1)}%"${out ? ` class="out"` : ""}></i></div><b class="${r8Cls(x.v)}">${synPct(x.v)}</b></div>`; }).join("")}
    <div class="r9-ax"><span></span><div><span>${synPct(-fmtA)}</span><span>0</span><span>${synPct(fmtA)}</span></div><span></span></div>
    ${R0.nouvelles && R0.nouvelles.length ? `<div class="r9-nouv"><p class="r9-sh">Leurs nouvelles</p>${R0.nouvelles.map(a => { const lg = typeof synLangue === "function" ? synLangue(a.titre) : "fr";
      return `<div><b>${esc(a.nom)}</b> · ${a.origine === "presse" ? `<span${lg !== "fr" ? ` data-tr="${lg}"` : ""}>${esc(r8Titre(a.titre))}</span> (presse)` : esc((SYN6_T[a.categorie] || ["Annonce"])[0]) + (a.chiffres && a.chiffres.length ? " : " + a.chiffres.slice(0, 2).map(([x, y]) => `${x.toLowerCase()} ${y}`).join(", ") : "")}${a.source ? ` <a href="${esc(a.source)}" target="_blank" rel="noopener">↗</a>` : ""}</div>`; }).join("")}</div>` : ""}</div>`;
}
function r9Plus(arts) { // « Pour aller plus loin » : les articles, en menu déroulant
  if (!arts.length) return "";
  return `<details class="r9-plus"><summary>Pour aller plus loin <span class="nb">${arts.length} article${arts.length > 1 ? "s" : ""}</span></summary><ul>${arts.map(a => `<li><a href="${esc(a.u)}" target="_blank" rel="noopener">« ${esc(r8Titre(a.t))} »</a> <span>${esc(String(a.s || "").replace(/^www\./, ""))} · ${esc(r8Jr(a.d))}</span></li>`).join("")}</ul></details>`;
}

function synPageV8(b, m) {
  SYN_ANN = []; SYN8_B = b; setTimeout(() => r8SynCharger(), 500);
  const L = (b.lignes || []).slice(), pf = b.portefeuille, R = b.rivales || {}, IA = b.ia_entreprises || {}, M = (b.monde && b.monde.sujets) || [];
  const vide = a => a.origine !== "presse" && !(a.chiffres || []).length && ["communique", "autre", "agenda"].includes(a.categorie) && !/rachat/i.test(a.titre || "");
  const ann = (b.annonces || []).filter(a => !(a.origine === "presse" && SYN6_RECO.test(a.titre || "")) && !vide(a));
  const deK = k => ann.filter(a => a.k === k).sort((x, y) => String(y.date).localeCompare(x.date));
  const g = pf && pf.var_eur != null ? pf.var_eur : null, idx = b.indices || [];
  const Lpf = L.filter(l => l.portefeuille && l.portefeuille.var_eur != null).sort((x, y) => Math.abs(y.portefeuille.var_eur) - Math.abs(x.portefeuille.var_eur));
  const SANSV = L.filter(l => l.portefeuille && l.portefeuille.var_eur == null);
  const radio = b.radio && b.radio.seaux || [];
  /* ---------- Le résultat ---------- */
  let phrase = "";
  if (g != null) {
    const gros = Lpf[0], part = gros && Math.sign(gros.portefeuille.var_eur) === Math.sign(g) && Math.abs(g) >= 1 ? gros.portefeuille.var_eur / g : 0, autres = Lpf.filter(l => l !== gros).reduce((a, l) => a + l.portefeuille.var_eur, 0);
    phrase = part >= 0.6 && Lpf.length > 1 ? `${esc(r8Maj(r8Court(gros))).replace(/^Votre (.*)$/, "Votre <em>$1</em>")} a fait ${part >= 0.95 ? "toute" : "l'essentiel de"} la ${g < 0 ? "baisse" : "hausse"} : ${r8Eur(gros.portefeuille.var_eur)}. ${Lpf.length - 1 > 1 ? `Vos ${Lpf.length - 1} autres lignes, elles, finissent à` : "Votre autre ligne finit à"} ${r8Eur(autres)}.`
      : Lpf.length ? `${g < 0 ? "Ce qui a le plus pesé" : "Ce qui a le plus aidé"} : ${esc(r8Court(Lpf.slice().sort((x, y) => (g < 0 ? x.portefeuille.var_eur - y.portefeuille.var_eur : y.portefeuille.var_eur - x.portefeuille.var_eur))[0]))}.` : "";
  }
  const spark = (() => { const v = (pf && pf.serie || []).filter(x => x != null); if (v.length < 2) return ""; const lo = Math.min(...v), hi = Math.max(...v), r = hi - lo || 1, w = 400, h = 120, Y = x => (h - 8 - (x - lo) / r * (h - 16)).toFixed(1);
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" aria-hidden="true"><line x1="0" y1="${Y(v[0])}" x2="${w}" y2="${Y(v[0])}" stroke="#111" stroke-dasharray="4 5" stroke-width="1.5"/><polyline fill="none" stroke="${g < 0 ? "#d1242f" : "#0a8a3a"}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" points="${v.map((x, i) => `${(6 + i * (w - 12) / (v.length - 1)).toFixed(1)},${Y(x)}`).join(" ")}"/><circle cx="${w - 6}" cy="${Y(v[v.length - 1])}" r="6" fill="${g < 0 ? "#d1242f" : "#0a8a3a"}" stroke="#111" stroke-width="2"/></svg>`; })();
  const perf = [pf && pf.var_pct != null ? ["Votre portefeuille", pf.var_pct, "moi"] : null, ...idx.slice(0, 3).map(i => [i.nom, i.pct, ""])].filter(z => z && z[1] != null);
  const mxp = Math.max(1, ...perf.map(z => Math.abs(z[1]))) * 1.2;
  const date = b.date_rapport ? "Rapport du " + esc(new Date(b.date_rapport + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })) : "Votre rapport" + (b.en_cours ? " (semaine en cours)" : "");
  let h = `<div class="r8 r9"><div class="r9-band"><div class="r8-w">
    <div class="r9-top"><span class="r8-logo">ENKLAIR</span><span class="r9-tag">${date}</span></div>
    <div class="r9-hero"><div><div class="r9-lab">Votre semaine${b.du ? ", " + esc(synDuAu(b)) : ""}</div>
      ${g != null ? `<div class="r9-big ${r8Cls(g)}">${r8Eur(g)}</div><div class="r9-pc ${r8Cls(g)}">${synPct(pf.var_pct)} <span>· votre portefeuille vaut ${F0.format(Math.round(pf.valeur_eur))}&nbsp;€</span></div>` : `<div class="r9-big">Vos valeurs.</div>`}
      ${phrase ? `<p class="r9-ver">${phrase}</p>` : ""}${SANSV.length ? `<p class="r9-sansv">Sans cours de la semaine, non comptés : ${SANSV.map(l => esc(r8Court(l))).join(", ")}.</p>` : ""}</div>
      ${spark ? `<div class="r8-card r9-spark"><div class="t"><span>Votre portefeuille, jour par jour</span><b class="${r8Cls(g)}">${synPct(pf.var_pct)}</b></div>${spark}</div>` : ""}</div>
    ${perf.length ? `<div class="r9-perf">${perf.map(([n, x, c]) => `<div class="pf ${c}"><small>${esc(n)}</small><b class="${r8Cls(x)}">${synPct(x)}</b><div class="tr2"><i class="${x < 0 ? "n" : "p"}" style="${x < 0 ? "right" : "left"}:50%;width:${(Math.abs(x) / mxp * 50).toFixed(1)}%"></i></div></div>`).join("")}</div>` : ""}
  </div></div><div class="r8-w">`;
  const secs = [["l", "Vos lignes"], b.etf8 && (b.etf8.par_etf || []).length ? ["etf", "Dans vos ETF"] : null, M.length ? ["monde", "Le monde"] : null, ["av", "À venir"]].filter(Boolean);
  h += `<nav class="r9-nav">${secs.map(([id, t], i) => `<a href="#r8-${id}"${i ? "" : ` class="on"`}>${t}</a>`).join("")}</nav>`;
  let num = 0;

  /* ---------- Vos lignes ---------- */
  const LV = ((b.etf8 && b.etf8.vues) || []).filter(v => R[v.k]).map(v => ({ ...v, vue: true }));
  const aRes = l => deK(l.k).some(a => a.origine !== "presse" && a.categorie === "resultats");
  const fav = L.filter(l => !l.portefeuille && (l.k.startsWith("c:") || l.k.startsWith("e:"))).sort((a, c) => (aRes(c) - aRes(a)) || Math.abs(c.variation_semaine_pct || 0) - Math.abs(a.variation_semaine_pct || 0));
  const groupes = [["", [...Lpf, ...SANSV]], ["Vos favoris", fav], ["Les plus grosses entreprises de vos ETF", LV]].filter(z => z[1].length);
  const ouvre = (fav.find(aRes) || Lpf.find(aRes) || Lpf[0] || fav[0] || {}).k;
  const mxe = Math.max(1, ...Lpf.map(l => Math.abs(l.portefeuille.var_eur)));
  const ETFX = Object.fromEntries(((b.etf8 && b.etf8.par_etf) || []).map(e => [e.k, e]));
  const mvE = r => `<div class="r8x-mv"><a href="${synLien(r.k)}">${esc(r.nom)} <small>${F1.format(r.poids)} %</small></a><span class="${r8Cls(r.ve)}">${synPct(r.ve)}</span><b class="${r8Cls(r.eur)}">${r8Eur(r.eur)}</b></div>`;
  const detail = l => {
    const A = deK(l.k), R0 = R[l.k], v = l.variation_semaine_pct, dt = (b.a_venir || []).find(e => e.k === l.k);
    if (l.k.startsWith("e:")) { const e = ETFX[l.k], ind = l.indice;
      const phrase = v == null ? "Le site n'a pas son cours de la semaine." : e && (e.baisse.length || e.hausse.length) ? `${e.n ? `Il contient ${F0.format(e.n)} entreprises. ` : ""}Celles qui ont le plus pesé, en euros pour vous :` : ind && ind.pct != null ? `Il a fait ${synPct(v)}, ${esc(r9Le(ind.nom))} ${synPct(ind.pct)}.` : `Il a fait ${synPct(v)} sur la semaine.`;
      return `<div class="r9-box"><p class="r9-h"><i>✦</i> Pourquoi il a bougé</p><p class="r9-lead">${phrase}</p>${e ? `${e.baisse.length ? `<p class="r9-sh">Ont fait baisser</p>${e.baisse.map(mvE).join("")}` : ""}${e.hausse.length ? `<p class="r9-sh">Ont fait monter</p>${e.hausse.map(mvE).join("")}` : ""}` : ""}</div><div class="r9-pied"><a href="${synLien(l.k)}">Voir la fiche de l'ETF</a></div>`; }
    const ia = IA[l.k], annOff = A.some(a => a.origine !== "presse" && !["rachat", "capital"].includes(a.categorie));
    const PR = A.filter(a => a.origine === "presse").slice(0, 8).map(a => ({ u: a.source, t: a.titre, s: a.site || "presse", d: a.date })).filter(a => a.u);
    const presse = /^c:/.test(l.k) ? `<div class="r9-box r9-pr"><p class="r9-h">Ce que dit la presse</p>${SYN8_B && SYN8_B.au ? `<div class="r8-syn" data-r8syn="${esc(l.k)}" data-nom="${esc(l.nom || "")}" data-au="${esc(SYN8_B.au)}"></div>` : ""}${r9Plus(PR)}</div>` : "";
    const iaB = ia && ia.clair && annOff ? `<div class="r9-box"><p class="r9-h">Son annonce en clair</p><p>${esc(ia.clair)}</p>${ia.change ? `<p>${esc(ia.change)}</p>` : ""}<p class="r8-ia">Rédigé par l'IA d'ENKLAIR à partir de l'annonce. La source fait foi.</p></div>` : "";
    const off = A.filter(a => a.origine !== "presse");
    const liste = off.length ? `<details class="r8-det"><summary>${off.length > 1 ? `Ses ${off.length} annonces officielles` : "Son annonce officielle"}</summary>${off.map(a => { const lab = (SYN6_T[a.categorie] || ["Annonce"])[0];
      return `<div class="r8-li"><time>${esc(r8Jr(a.date))}</time><span class="r8-ty">${esc(lab)}</span><div><p>${esc(a.titre || a.type || lab)}</p>${(a.chiffres || []).length ? `<p class="r8-mini">${esc(a.chiffres.slice(0, 3).map(([x, y]) => `${x} : ${y}`).join(" · "))}</p>` : ""}</div>${a.source ? `<a href="${esc(a.source)}" target="_blank" rel="noopener">↗</a>` : ""}</div>`; }).join("")}</details>` : "";
    return `<div class="r9-duo${presse ? "" : " seul"}">${r9Pq(l, R0, A)}${presse}</div>${iaB}${r9Riv(l, R0)}<div class="r9-pied">${liste}<a href="${synLien(l.k)}">Voir la fiche</a>${dt ? `<span class="r8-dt">${esc(r8Jr(dt.date))} · ${esc(String(dt.label || "").replace(/^./, c => c.toLowerCase()))}</span>` : ""}</div>`;
  };
  const ligne = l => { const R0 = R[l.k], v = l.variation_semaine_pct, e = l.portefeuille ? l.portefeuille.var_eur : null, vd = r9Verd(l, R0), op = l.k === ouvre;
    const meta = l.vue ? `${F0.format(l.via_eur)} € à travers vos ETF` : l.portefeuille ? `${F0.format(Math.round(l.portefeuille.poids_pct || 0))} % de votre argent` : "dans vos favoris";
    const eur = e != null ? `<div class="r9-eur"><div class="l">${e < 0 ? `<i style="width:${(Math.abs(e) / mxe * 100).toFixed(1)}%"></i>` : ""}</div><div class="r">${e > 0 ? `<i style="width:${(e / mxe * 100).toFixed(1)}%"></i>` : ""}</div><b class="${r8Cls(e)}">${r8Eur(e)}</b></div>` : `<div class="r9-eur0">${l.portefeuille ? "pas de cours cette semaine" : l.vue ? "à travers vos ETF" : "pas dans votre portefeuille"}</div>`;
    const vs = l.k.startsWith("e:") ? `<div class="r9-vs"><div class="vw" style="grid-column:1/3">ETF<small>${l.indice && l.indice.pct != null ? `${esc(l.indice.nom)} ${synPct(l.indice.pct)}` : ""}</small></div></div>` : vd ? `<div class="r9-vs">${r9Jauge(l, R0)}<div class="vw ${vd[1]}">${vd[0]}<small>médiane ${synPct(R0.med)}</small></div></div>` : `<div class="r9-vs"></div>`;
    return `<div class="r9-row${op ? " open" : ""}" role="button" tabindex="0" aria-expanded="${op}" data-r9="${esc(l.k)}"><div class="r9-nm">${synLogo(l.k, 38)}<div><b>${esc(r8Maj(r8Court(l)).replace(/^Votre ETF /, "ETF "))}</b><small>${aRes(l) ? `<span class="r9-res">Résultats publiés</span> ` : ""}${esc(meta)}</small></div></div>${eur}<div class="r9-pct ${r8Cls(v)}">${v == null ? "–" : synPct(v)}</div>${vs}<div class="r9-chev">${op ? "⌃" : "⌄"}</div></div>
      <div class="r9-det" data-r9d="${esc(l.k)}"${op ? "" : " hidden"}>${detail(l)}</div>`; };
  num++;
  h += `<section id="r8-l"><h2 class="r9-h2">Vos lignes.</h2><div class="r8-card r9-list"><div class="r9-hd"><span>Valeur</span><span>${Lpf.length ? "Gagné ou perdu" : ""}</span><span style="text-align:right">Semaine</span><span>Face à ses rivales</span><span></span></div>
    ${groupes.map(([t, G]) => `${t ? `<div class="r9-grp">${t}</div>` : ""}${G.map(ligne).join("")}`).join("")}</div>`;
  if (!L.length) h += `<p class="muted">Ajoutez des favoris ou des lignes de portefeuille pour les suivre ici.</p>`;
  for (const x of b.dca || []) { const cur = x.devise && x.devise !== "EUR" ? x.devise : "€", mt = v => v == null ? "–" : F2.format(v) + " " + cur;
    h += `<p class="r9-dca"><span>↻</span>${x.date ? `Votre achat programmé du ${esc(r8Jr(x.date))} : ${F0.format(x.q)} part${x.q > 1 ? "s" : ""} ${esc(r8De(x.nom))}${x.prix ? ` à ${mt(x.prix)}${x.prix_avant ? ` (${mt(x.prix_avant)} une semaine plus tôt)` : ""}` : ""}.` : `Votre achat programmé : ${F0.format(x.q)} part${x.q > 1 ? "s" : ""} ${esc(r8De(x.nom))}, le ${x.jour === 1 ? "1er" : x.jour} de chaque mois.`}</p>`; }
  for (const a of (pf && pf.alertes || []).slice(0, 2)) h += `<p class="r9-al"><b>${esc(a.texte)}</b> ${esc(a.pourquoi || "")}</p>`;
  h += `</section>`;
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

  /* ---------- Le monde ---------- */
  if (M.length) {
    const chez = i => { const S = radio.filter(x => x.sujet === i), s = M[i]; const pct = S.reduce((a, x) => a + x.pct, 0), eur = S.reduce((a, x) => a + x.eur, 0);
      const via = [...new Set(S.flatMap(x => x.via_etf.map(e => r8Court({ nom: e.nom, k: "e:" }))))], ex = S.flatMap(x => x.exemples || []).slice(0, 3);
      return { pct, eur, via, ex, touche: s.touche || [] }; };
    const toks = M.map(s => String(s.theme || "").split(/\s*·\s*/).filter(Boolean)), cnt = {}; toks.flat().forEach(t => cnt[t] = (cnt[t] || 0) + 1);
    const filt = Object.entries(cnt).sort((a, c) => c[1] - a[1]).slice(0, 7);
    const pills = t => t.map(x => `<a class="r8-pill" href="${synLien(x.k)}">${esc(x.nom)} ${x.v != null ? `<span class="${r8Cls(x.v)}">${synPct(x.v)}</span>` : ""}</a>`).join("");
    const srcs = s => s.titres.length ? `<p class="r9-src">${s.titres.map(t => `<a href="${esc(t.u)}" target="_blank" rel="noopener">${esc(String(t.s || "").replace(/^www\./, ""))}, ${esc(r8Jr(t.d))}</a>`).join(" · ")}</p>` : "";
    const COUL = ["b", "r", "g", "j"];
    const grand = (s, i) => { const c = chez(i);
      return `<div class="r8-card r9-mc ${COUL[i % 4]}" data-th="${esc(toks[i].join("|"))}"><span class="r9-tagm">${esc(s.theme)}</span><h3>${esc(s.titre)}</h3><p>${esc(s.fait)}</p>
        ${s.chiffres.length ? `<div class="r9-chif">${s.chiffres.slice(0, 4).map(x => `<span>${x.k ? `<a href="${synLien(x.k)}">${esc(x.lab)}</a>` : esc(x.lab)} <b class="${r8Cls(x.v)}">${synPct(x.v)}</b></span>`).join("")}</div>` : ""}
        <div class="r9-chez"><div class="lab">Chez vous</div>${c.pct >= 1 ? `<div class="r2"><b>${F0.format(Math.round(c.pct))}&nbsp;%</b><span>de votre argent · ${F0.format(c.eur)}&nbsp;€</span></div><div class="bar"><i style="width:${Math.min(100, c.pct).toFixed(1)}%"></i></div><small>${c.via.length ? `À travers ${esc(c.via.join(", "))}${c.ex.length ? " : " + esc(c.ex.join(", ")) + "…" : "."}` : ""}</small>` : ""}${c.touche.length ? `<div class="r9-ch2">${pills(c.touche)}</div>` : c.pct < 1 ? `<small>Aucune de vos valeurs n'est directement concernée.</small>` : ""}</div>${srcs(s)}</div>`; };
    const petit = (s, i) => { const c = chez(i), t = c.touche[0];
      return `<div class="r9-tl" data-th="${esc(toks[i].join("|"))}"><span class="r9-tagm ${COUL[i % 4]}">${esc(s.theme)}</span><h4>${esc(s.titre)}</h4><p>${esc(s.fait.split(/(?<=\.)\s/)[0])}</p><div class="cv">${t ? `Chez vous : ${esc(t.nom)} ${t.v != null ? synPct(t.v) : ""}` : c.pct >= 1 ? `Chez vous : ${F0.format(Math.round(c.pct))} % · ${F0.format(c.eur)} €` : `<span class="gr">Aucune de vos valeurs directement</span>`}</div>${srcs(s)}</div>`; };
    h += `<section id="r8-monde"><h2 class="r9-h2">Le monde.</h2>${M.length > 3 ? `<div class="r9-fil"><a class="on" data-r9f="">Tout (${M.length})</a>${filt.map(([t, n]) => `<a data-r9f="${esc(t)}">${esc(t)} (${n})</a>`).join("")}</div>` : ""}
      <div class="r9-une">${M.slice(0, 2).map(grand).join("")}</div>${M.length > 2 ? `<div class="r9-tiles">${M.slice(2).map((s, j) => petit(s, j + 2)).join("")}</div>` : ""}
      <p class="r8-note">Sujets choisis et résumés par l'IA d'ENKLAIR à partir des titres de la presse ; chiffres et « chez vous » calculés par le site.${b.radio && b.radio.source ? ` Contenu des ETF : ${esc(b.radio.source.nom)}.` : ""}</p></section>`;
  }
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

  /* ---------- À venir ---------- */
  const av = [...(b.a_venir || []).slice(0, 24).map(e => ({ date: e.date, k: e.k, t: e.nom || "", p: String(e.label || "").replace(/^./, c => c.toUpperCase()), est: !!e.estime })),
    ...((b.etf8 && b.etf8.a_venir) || []).map(e => ({ date: e.date, k: e.k, t: e.nom, p: `${e.label}${e.via ? ` · ${F0.format(e.via)} € à travers vos ETF` : ""}`, est: !!e.estime })),
    ...(b.dca || []).filter(x => x.prochain).map(x => ({ date: x.prochain, k: x.k, t: "Votre achat programmé", p: `${F0.format(x.q)} part${x.q > 1 ? "s" : ""} ${r8De(x.nom)}`, moi: true }))].sort((a, c) => a.date.localeCompare(c.date));
  if (av.length) h += `<section id="r8-av"><h2 class="r9-h2">À venir.</h2><div class="r9-strip">${av.map(e => { const d = new Date(e.date + "T12:00:00Z");
      return `<a class="r8-card r9-dt${e.moi ? " moi" : ""}${e.est ? " est" : ""}" href="${e.k ? synLien(e.k) : "#"}"><div class="r8-cal"><small>${esc(SYN_MOIS[d.getUTCMonth()].replace(".", "").toUpperCase())}</small><b>${d.getUTCDate()}</b></div><strong>${esc(e.t)}</strong><span>${esc(e.p)}</span></a>`; }).join("")}</div>
      ${(b.a_venir || []).length ? `<p class="r8-note"><button type="button" class="s6-ics" data-synics="all">＋ Ajouter à mon agenda (.ics)</button></p>` : ""}</section>`;
  h += `<p class="r8-fin">Information, pas conseil : ENKLAIR ne dit jamais quoi acheter ou vendre. Variations entre la clôture précédant la semaine et le dernier cours connu (différé). Annonces : documents officiels (AMF, SEC, bourses nordiques et de Londres). Presse : synthèse de l'IA d'ENKLAIR, les articles font foi.</p></div></div>`;
  setTimeout(() => { if (typeof axTraduire === "function") axTraduire(); }, 50);
  return h;
}
// Ouvrir ou fermer une ligne ; filtres du monde
document.addEventListener("click", e => {
  const r = e.target.closest && e.target.closest(".r9-row"); if (r && !e.target.closest("a")) { const d = r.nextElementSibling; if (!d || !d.matches(".r9-det")) return; const ouvrir = d.hidden; d.hidden = !ouvrir; r.classList.toggle("open", ouvrir); r.setAttribute("aria-expanded", String(ouvrir)); r.querySelector(".r9-chev").textContent = ouvrir ? "⌃" : "⌄"; if (ouvrir) r8SynCharger(d); return; }
  const f = e.target.closest && e.target.closest("[data-r9f]"); if (f) { e.preventDefault(); const sec = f.closest("section"), t = f.dataset.r9f; sec.querySelectorAll("[data-r9f]").forEach(a => a.classList.toggle("on", a === f)); sec.querySelectorAll("[data-th]").forEach(x => { x.hidden = !!t && !x.dataset.th.split("|").includes(t); }); }
});
document.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".r9-row")) { e.preventDefault(); e.target.click(); } });
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

document.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("[data-r8t]")) { e.preventDefault(); e.target.click(); } });
document.addEventListener("click", e => { // 8/11 : tuiles du rapport, un encadré à la fois
  const t = e.target.closest("[data-r8t]"); if (!t) return; const sec = t.closest("section"); if (!sec) return;
  sec.querySelectorAll("[data-r8t]").forEach(b => { const on = b === t; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
  sec.querySelectorAll("[data-r8c]").forEach(c => { c.hidden = c.dataset.r8c !== t.dataset.r8t; });
  const c = sec.querySelector(`[data-r8c="${CSS.escape(t.dataset.r8t)}"]`); if (c) r8SynCharger(c);
  if (c && c.getBoundingClientRect().top > innerHeight * 0.7) c.scrollIntoView({ behavior: "smooth", block: "start" });
});

/* 8/11 : « Ce que dit la presse cette semaine », une synthèse de plusieurs articles écrite une fois par entreprise et par semaine (/api/ia/presse) */
function r8SynCharger(boite) {
  (boite ? [boite] : [...document.querySelectorAll("[data-r8c]:not([hidden]), .r9-det:not([hidden])")]).forEach(b => b.querySelectorAll("[data-r8syn]:not([data-fait])").forEach(el => {
    el.dataset.fait = "1"; const r9 = !!el.closest(".r9-pr"); el.innerHTML = `${r9 ? "" : `<p class="r8-lab">Ce que dit la presse cette semaine</p>`}<p class="r8-syn-att">Lecture des articles…</p>`;
    const vide = () => { const bx = el.closest(".r9-pr"); el.remove(); if (bx && !bx.querySelector(".r9-plus")) bx.remove(); };
    fetch(`/api/ia/presse?k=${encodeURIComponent(el.dataset.r8syn)}&au=${encodeURIComponent(el.dataset.au)}&nom=${encodeURIComponent(el.dataset.nom)}`).then(r => r.json()).then(j => {
      if (!j || !j.clair) return vide();
      const S = j.sources || [];
      el.innerHTML = `${r9 ? "" : `<p class="r8-lab">Ce que dit la presse cette semaine</p>`}${(j.sujets || []).length ? `<p class="r8-syn-s">${j.sujets.map(x => `<span>${esc(x)}</span>`).join("")}</p>` : ""}${String(j.clair).split(/\n+/).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join("")}<p class="r8-ia">Synthèse écrite par l'IA d'ENKLAIR à partir de ces articles, la même pour tous les lecteurs.</p>`;
      const p = el.parentElement, d = p && p.querySelector(".r9-plus, .r8-src"), vu = new Set(), arts = S.filter(a => a.u && !vu.has(a.u) && vu.add(a.u)).map(a => ({ u: a.u, t: a.titre || a.media, s: a.media, d: a.date }));
      if (arts.length) { if (d) d.remove(); el.insertAdjacentHTML("afterend", r9Plus(arts)); }
    }).catch(vide);
  }));
}
