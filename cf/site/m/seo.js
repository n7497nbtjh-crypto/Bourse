/* Module « seo » de bilan. (5e passage, E1) : pages de réponse fabriquées à partir des données.
   Liste dans data/questions.json (copiée dans cf/site/data/questions.json). Route : /question/<id>. */
let SEO_Q = null;
function seoQuestions() { return SEO_Q || (SEO_Q = fetch("/data/questions.json").then(r => r.json()).catch(() => ({ pages: [] }))); }
async function pageQuestion(id) {
  const Q = await seoQuestions(), q = (Q.pages || []).find(p => p.id === id && p.en_ligne);
  if (!q || !R) return pageNotFound();
  setTitle(q.titre); setNav("ent");
  app.innerHTML = `<div class="empty">Chargement des comptes…</div>`;
  await Promise.all([PXP, typeof outHist === "function" ? outHist() : null, typeof premStatus === "function" ? premStatus() : null].filter(Boolean));
  const a = JSON.parse(JSON.stringify(q.a)), { l, tri } = runFiltre(a), I = INDI[tri.indicateur], top = l.slice(0, 3);
  const med = median(l.map(c => I[1](c)));
  const rep = top.length ? `En tête : ${top.map(c => `<a class="lnk" href="/entreprise/${c.id}">${esc(c.name)}</a> (${I[2](I[1](c))})`).join(", ")}.${med != null && tri.indicateur !== "capitalisation" ? ` La médiane des ${l.length} entreprises classées est de ${I[2](med)}.` : ` ${l.length} entreprises remplissent ce critère.`}` : "Aucune entreprise ne remplit ce critère aujourd'hui.";
  const autres = (Q.pages || []).filter(p => p.en_ligne && p.id !== id);
  app.innerHTML = `<div class="crumbs"><a href="/classements">Classements</a> › ${esc(q.titre)}</div>
    <h1 class="pagetitle">${esc(q.q)}</h1>
    <p class="lead seoq-rep">${rep}</p>
    <section class="panel"><div class="pb filt-w">${(filtreHTML(a), filtreCorps(a))}</div></section>
    <details class="fold seoq-f"><summary>Comment lire ce classement</summary><div class="pb"><p>${esc(q.pourquoi || "")}</p><p class="muted">Chiffres tirés des derniers comptes annuels publiés et du cours du jour, recalculés à chaque mise à jour des données. Un classement n'est pas un conseil d'achat.</p></div></details>
    <section class="seoq-autres"><h2>Autres questions</h2>${autres.map(p => `<a class="hbr" href="/question/${p.id}"><b>${esc(p.q)}</b></a>`).join("")}</section>`;
}
if (typeof ROUTES_EXTRA !== "undefined") ROUTES_EXTRA.push([/^\/question\/([a-z0-9-]+)$/, id => pageQuestion(id)]);
// Pastilles « questions » en haut de /classements
function seoLiens(el) { if (!el) return; seoQuestions().then(Q => { const l = (Q.pages || []).filter(p => p.en_ligne); el.innerHTML = l.length ? `<span class="seoq-cl">Questions :</span>${l.map(p => `<a class="chip" href="/question/${p.id}">${esc(p.q)}</a>`).join("")}` : ""; }); }
