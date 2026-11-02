/* Module « x » d'ENKLAIR (5e passage, E2, E3, E4) : page privée /x pour Romain.
   Protégée comme l'administration : la clé ADMIN_KEY est saisie par Romain dans cette page, gardée seulement le temps de l'onglet
   (sessionStorage), et vérifiée par le Worker (GET /api/espace/mesures, en-tête x-admin-key). Le site ne l'écrit nulle part ailleurs.
   Contenu : 3 messages du jour (≤ 270 caractères, liens utm), image 1200 × 675 par message, suite verticale 1080 × 1920 (3 images),
   et le tunnel de la semaine (visites → fiche → suivre → compte → rapport ouvert → aperçu → page Premium → essai). */
const X_ORIG = "https://enklair.com";
const xJour = () => Math.floor(Date.now() / 864e5);
const xUtm = (path, camp) => `${X_ORIG}${path}?utm_source=x&utm_medium=social&utm_campaign=${camp}-${TODAY}`;
const xLen = t => t.replace(/https?:\/\/\S+/g, "x".repeat(23)).length; // X compte chaque lien pour 23 caractères
const xCoupe = (avant, lien, max = 270) => { let t = avant; while (xLen(t + "\n" + lien) > max && t.length > 40) t = t.replace(/\s+\S+$/, "") + "…"; return t + "\n" + lien; };

async function xMessages() {
  await Promise.all([PXP, typeof outHist === "function" ? outHist() : null].filter(Boolean));
  const j = xJour(), M = [];
  // 1. Une entreprise face à la médiane de son secteur (parmi les 150 plus grosses, une par jour)
  const gros = R.companies.filter(c => !c.missing).map(c => ({ c, cap: INDI.capitalisation[1](c), m: INDI.marge[1](c) })).filter(x => x.cap && x.m != null && !(AVERIF[x.c.id] && AVERIF[x.c.id].marge)).sort((a, b) => b.cap - a.cap).slice(0, 150);
  if (gros.length) {
    const { c, m } = gros[j % gros.length], med = medInd(c.sector, "marge"), f = INDI.marge[2];
    const pos = med == null ? "" : m > med ? "Au-dessus de la médiane." : m < med ? "Sous la médiane." : "Pile sur la médiane.";
    M.push({ type: "entreprise", lien: xUtm("/entreprise/" + c.id, "fiche"), kick: `${c.name} · ${secName(c)}`, chiffre: f(m), libelle: "de marge d'exploitation", repere: med != null ? `médiane du secteur : ${f(med)}` : "", v: m, med,
      accroche: `${c.name} garde-t-elle plus que ses concurrents ?`, conclusion: pos,
      texte: `${c.name} garde ${f(m)} de ses ventes en résultat d'exploitation. La médiane de son secteur (${secName(c).toLowerCase()}) : ${f(med)}. ${pos} Les comptes, chaque chiffre avec sa source :` });
  }
  // 2. Une page de réponse (classement), une par jour
  const Q = ((await seoQuestions()).pages || []).filter(p => p.en_ligne);
  if (Q.length) {
    const q = Q[j % Q.length], a = JSON.parse(JSON.stringify(q.a)), { l, tri } = runFiltre(a), I = INDI[tri.indicateur], t3 = l.slice(0, 3), med = median(l.map(c => I[1](c)));
    if (t3.length) M.push({ type: "classement", lien: xUtm("/question/" + q.id, "question"), kick: q.titre, chiffre: I[2](I[1](t3[0])), libelle: `${t3[0].name}, en tête`, repere: med != null && tri.indicateur !== "capitalisation" ? `médiane des ${l.length} : ${I[2](med)}` : `${l.length} entreprises classées`, v: I[1](t3[0]), med: tri.indicateur !== "capitalisation" ? med : null,
      accroche: q.q, conclusion: `Puis ${t3.slice(1).map(c => c.name).join(" et ")}.`,
      texte: `${q.q}\nEn tête : ${t3.map(c => `${c.name} (${I[2](I[1](c))})`).join(", ")}.${med != null && tri.indicateur !== "capitalisation" ? ` Médiane : ${I[2](med)}.` : ""}\nLe classement complet, avec les sources :` });
  }
  // 3. Une leçon de l'Académie
  try {
    const A = await fetch("/data/academie.json").then(r => r.json()), L = [];
    (A.modules || []).forEach(mo => (mo.lecons || []).filter(x => !x.premium && x.resume).forEach(x => L.push({ mo, x })));
    if (L.length) { const { mo, x } = L[j % L.length];
      M.push({ type: "lecon", lien: xUtm(`/academie/${mo.id}/${x.id}`, "lecon"), kick: "L'Académie · " + mo.titre, chiffre: `${x.duree_min || 3} min`, libelle: x.titre, repere: "gratuit, sans compte", v: null, med: null,
        accroche: x.titre, conclusion: x.resume, texte: `${x.titre}\n${x.resume}\n${x.duree_min || 3} minutes, gratuit :` }); }
  } catch (e) { }
  return M.map(m => ({ ...m, post: xCoupe(m.texte, m.lien) }));
}

// Dessin des images (canvas) : papier crème, encre, un seul accent (vert acide), pas de décor
function xCanvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function xLignes(ctx, t, x, y, maxW, lh) { const mots = String(t).split(/\s+/); let l = "", n = 0; for (const m of mots) { const e = l ? l + " " + m : m; if (ctx.measureText(e).width > maxW && l) { ctx.fillText(l, x, y + n * lh); n++; l = m; } else l = e; } if (l) { ctx.fillText(l, x, y + n * lh); n++; } return n; }
function xFond(ctx, w, h) { ctx.fillStyle = "#F8F5EE"; ctx.fillRect(0, 0, w, h); }
function xMarque(ctx, x, y, s) { ctx.fillStyle = "#111214"; ctx.font = `800 ${s}px "Inter Tight", Inter, Arial, sans-serif`; ctx.fillText("ENKLAIR", x, y); const w = ctx.measureText("bilan").width; ctx.fillStyle = "#0E6B4A"; ctx.fillText(".", x + w, y); }
function xBarre(ctx, x, y, w, m) { // valeur et médiane sur une même règle
  if (m.v == null || m.med == null) return; const max = Math.max(m.v, m.med) * 1.15 || 1, X = v => x + Math.max(0, Math.min(1, v / max)) * w;
  ctx.fillStyle = "#E2DCCF"; ctx.fillRect(x, y, w, 14); ctx.fillStyle = m.v >= m.med ? "#C6F432" : "#F2C6B8"; ctx.fillRect(x, y, X(m.v) - x, 14);
  ctx.fillStyle = "#111214"; ctx.fillRect(X(m.med) - 2, y - 10, 4, 34);
}
function xImage(m) {
  const c = xCanvas(1200, 675), k = c.getContext("2d"); xFond(k, 1200, 675); xMarque(k, 72, 104, 44);
  k.fillStyle = "#55524C"; k.font = `500 30px "IBM Plex Sans", Arial, sans-serif`; xLignes(k, m.kick, 72, 190, 1056, 40);
  k.fillStyle = "#111214"; k.font = `700 150px "Inter Tight", Inter, Arial, sans-serif`; k.fillText(m.chiffre, 66, 380);
  k.font = `500 38px "IBM Plex Sans", Arial, sans-serif`; xLignes(k, m.libelle, 72, 445, 1056, 48);
  xBarre(k, 72, 520, 700, m); k.fillStyle = "#55524C"; k.font = `500 28px "IBM Plex Sans", Arial, sans-serif`; if (m.repere) k.fillText(m.repere, m.med != null ? 800 : 72, 538);
  k.fillStyle = "#6F6A63"; k.font = `400 24px "IBM Plex Sans", Arial, sans-serif`; k.fillText("Comptes officiels, sources affichées. Sans conseil.", 72, 625);
  return c;
}
function xVertical(m) { // 3 images 1080 × 1920 : l'accroche, le chiffre, où lire la suite
  const V = [];
  for (let i = 0; i < 3; i++) {
    const c = xCanvas(1080, 1920), k = c.getContext("2d"); xFond(k, 1080, 1920); xMarque(k, 90, 170, 60);
    k.fillStyle = "#6F6A63"; k.font = `500 34px "IBM Plex Sans", Arial, sans-serif`; k.fillText(`${i + 1} / 3`, 900, 170);
    if (i === 0) { k.fillStyle = "#111214"; k.font = `700 96px "Inter Tight", Inter, Arial, sans-serif`; xLignes(k, m.accroche, 90, 760, 900, 112); }
    if (i === 1) { k.fillStyle = "#55524C"; k.font = `500 40px "IBM Plex Sans", Arial, sans-serif`; xLignes(k, m.kick, 90, 620, 900, 52);
      k.fillStyle = "#111214"; k.font = `700 210px "Inter Tight", Inter, Arial, sans-serif`; k.fillText(m.chiffre, 80, 900);
      k.font = `500 50px "IBM Plex Sans", Arial, sans-serif`; xLignes(k, m.libelle, 90, 1000, 900, 64); xBarre(k, 90, 1160, 900, m);
      k.fillStyle = "#55524C"; k.font = `500 40px "IBM Plex Sans", Arial, sans-serif`; if (m.repere) k.fillText(m.repere, 90, 1260); }
    if (i === 2) { k.fillStyle = "#111214"; k.font = `600 64px "Inter Tight", Inter, Arial, sans-serif`; const n = xLignes(k, m.conclusion || "", 90, 760, 900, 80);
      k.fillStyle = "#55524C"; k.font = `500 44px "IBM Plex Sans", Arial, sans-serif`; xLignes(k, "Le détail, chiffres et sources : enklair.com", 90, 820 + n * 80, 900, 58);
      k.fillStyle = "#6F6A63"; k.font = `400 32px "IBM Plex Sans", Arial, sans-serif`; k.fillText("Information, pas un conseil d'investissement.", 90, 1780); }
    V.push(c);
  }
  return V;
}
function xTelecharger(c, nom) { const a = document.createElement("a"); a.download = nom; a.href = c.toDataURL("image/png"); document.body.appendChild(a); a.click(); a.remove(); }

function xTunnel(t) {
  if (!t || t.erreur || !t.cette_semaine) return `<p class="muted">Tunnel indisponible${t && t.erreur ? ` : ${esc(t.erreur)}` : ""}.</p>`;
  const E = [["visites", "Pages vues"], ["depuis_moteurs", "dont depuis un moteur"], ["depuis_x", "dont depuis X"], ["fiches", "Fiches ouvertes"], ["suivre", "« Suivre » touché"], ["rapport_exemple", "Rapport exemple ouvert"], ["comptes", "Comptes créés"], ["rapports_ouverts", "Rapports ouverts"], ["apercus_alerte", "Aperçus d'alerte vus"], ["page_premium", "Page Premium vue"], ["essais", "Essais commencés"]];
  const a = t.cette_semaine, b = t.semaine_precedente || {};
  return `<table class="t x-tun"><thead><tr><th class="l" scope="col">Étape</th><th scope="col">${esc(a.semaine)}</th><th scope="col">${esc(b.semaine || "")}</th></tr></thead><tbody>${E.map(([k, l]) => `<tr><th class="l" scope="row">${l}</th><td class="num">${a[k] ?? 0}</td><td class="num">${b[k] ?? 0}</td></tr>`).join("")}<tr><th class="l" scope="row">Premium en cours</th><td class="num">${t.premium_actifs ?? 0}</td><td></td></tr></tbody></table>
    <p class="muted" style="font-size:13.5px">Compteurs anonymes par semaine, sans cookie ni adresse IP. Les robots ne sont pas comptés.</p>`;
}

async function pageX() {
  setTitle("X, privé"); setNav("");
  let cle = null; try { cle = sessionStorage.getItem("bilan_admin"); } catch (e) { }
  const porte = msg => { app.innerHTML = `<h1 class="pagetitle">Page privée</h1><p class="pagesub">Réservée à l'éditeur du site. Saisissez la clé d'administration : elle reste dans cet onglet et disparaît à sa fermeture.</p>
    <form id="xK" class="x-k"><label for="xKi">Clé d'administration</label><input id="xKi" type="password" autocomplete="off" required><button class="btn" type="submit">Ouvrir</button></form>${msg ? `<p class="x-err">${esc(msg)}</p>` : ""}`;
    document.getElementById("xK").onsubmit = e => { e.preventDefault(); try { sessionStorage.setItem("bilan_admin", document.getElementById("xKi").value.trim()); } catch (er) { } pageX(); }; };
  if (!cle) return porte();
  app.innerHTML = `<div class="empty">Vérification…</div>`;
  let mes = null;
  try { const r = await fetch("/api/espace/mesures", { headers: { "x-admin-key": cle } }); if (r.status === 401 || r.status === 403) { try { sessionStorage.removeItem("bilan_admin"); } catch (e) { } return porte("Clé refusée."); } if (r.ok) mes = await r.json(); } catch (e) { }
  if (!mes) return porte("Le site n'a pas pu vérifier la clé (réseau). Réessayez.");
  const M = await xMessages();
  app.innerHTML = `<h1 class="pagetitle">X : les messages du jour</h1><p class="pagesub">Trois messages tirés des données du ${esc(TODAY)}, chacun de 270 caractères au plus (un lien compte pour 23), avec son image. Copiez, publiez vous-même.</p>
    ${M.map((m, i) => `<section class="panel x-post"><div class="pb"><p class="kick">${["Entreprise du jour", "Classement", "Leçon"][["entreprise", "classement", "lecon"].indexOf(m.type)] || ""} · ${xLen(m.post)} / 270</p>
      <pre class="x-txt" id="xT${i}">${esc(m.post)}</pre><div class="x-img" id="xI${i}"></div>
      <div class="x-act"><button class="btn" type="button" data-cp="${i}">Copier le texte</button><button class="btn ghost" type="button" data-im="${i}">Image 1200 × 675</button><button class="btn ghost" type="button" data-vt="${i}">Suite verticale 1080 × 1920</button></div></div></section>`).join("")}
    <section class="panel"><div class="ph"><h2>Le tunnel de la semaine</h2></div><div class="pb">${xTunnel(mes.tunnel)}</div></section>
    <p><button class="lnk" type="button" id="xOut">Fermer la session</button></p>`;
  M.forEach((m, i) => { const c = xImage(m); c.className = "x-cv"; document.getElementById("xI" + i).appendChild(c); });
  app.querySelectorAll("[data-cp]").forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(M[+b.dataset.cp].post); b.textContent = "Copié"; } catch (e) { b.textContent = "Copie impossible : sélectionnez le texte"; } });
  app.querySelectorAll("[data-im]").forEach(b => b.onclick = () => xTelecharger(xImage(M[+b.dataset.im]), `bilan-${TODAY}-${M[+b.dataset.im].type}.png`));
  app.querySelectorAll("[data-vt]").forEach(b => b.onclick = () => xVertical(M[+b.dataset.vt]).forEach((c, k) => setTimeout(() => xTelecharger(c, `bilan-${TODAY}-${M[+b.dataset.vt].type}-${k + 1}.png`), k * 400)));
  document.getElementById("xOut").onclick = () => { try { sessionStorage.removeItem("bilan_admin"); } catch (e) { } pageX(); };
}
if (typeof ROUTES_EXTRA !== "undefined") ROUTES_EXTRA.push([/^\/x$/, () => pageX()]);
