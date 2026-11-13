/* ---------- « Deux ETF se recouvrent-ils ? » v4 (3/11/2026), même direction que les autres outils v4 ----------
   /outils/recouvrement. En-tête jaune : la part de l'argent en double en titre, le verdict en phrase, le choix des fonds
   (2 à 4, part de chacun, exemples) en carte blanche dans le bandeau.
   Puis : ce que vous détenez vraiment (barre : en double / propre à chaque fonds, trois chiffres), les plus grosses
   entreprises fonds par fonds, ce que cela change, secteurs et pays, et repliés : paire par paire, expositions indirectes, sources.
   Calculs inchangés : O2_rcCalcul (m/outils2.js) prépare les données et appelle O2_rcAfficher, redéfinie ici.
   Mêmes paramètres d'adresse (?a ?b ?c ?d ?w). Remplace outilRecouvrement. */
async function outilRecouvrement4() {
  O2_css(); setTitle("Recouvrement des ETF"); setNav("sim");
  const S = O2_rcEtat();
  const trouve = re => ETF.list.find(e => re.test(e.index || "") && e.compo && e.pea) || ETF.list.find(e => re.test(e.index || "") && e.compo) || ETF.list.find(e => re.test(e.index || ""));
  const presets = [["Monde + S&P 500", /^MSCI World$/i, /^S&P 500$/i], ["Monde + Nasdaq 100", /^MSCI World$/i, /^Nasdaq.?100$/i], ["Monde + Europe", /^MSCI World$/i, /^(MSCI Europe|Stoxx Europe 600)$/i], ["CAC 40 + Euro Stoxx 50", /^CAC 40$/i, /^Euro Stoxx 50$/i]]
    .map(([l, a, b]) => { const ea = trouve(a), eb = trouve(b); return ea && eb ? [l, ea.id, eb.id] : null; }).filter(Boolean);
  app.innerHTML = `<div class="ek ek-page s4 rc4">
    <section class="ek-hero"><span class="mc-stk">Mes ETF se recouvrent-ils ?</span><h1 class="ag4-t" id="rct">Lecture des compositions…</h1><p class="mc-sub" id="rcs">Beaucoup d'ETF contiennent les mêmes grandes entreprises. Choisissez 2 à 4 fonds et la part de chacun : le site ouvre leurs compositions officielles.</p>
      <div class="s4-form rv-form"><div id="o2rl" class="rv-l"></div>
        <div class="rv-act"><a href="#" role="button" class="rv-add" id="o2radd">+ Ajouter un ETF</a><span>Exemples :</span><div class="s4-seg rv-ex">${presets.map(([l, a, b]) => `<a href="#" role="button" data-a="${a}" data-b="${b}">${esc(l)}</a>`).join("")}</div></div></div></section>
    <div id="o2rr"></div></div>`;
  const lignes = () => {
    $("#o2rl").innerHTML = S.ids.map((id, i) => `<div class="rv-row"><span class="rv-dot" style="background:${O2_RC[i]}"></span>
      <div class="s4-f rv-pk"><span>ETF n° ${i + 1}</span><div class="sj-pkw"><input id="o2rq${i}" class="el-in" type="search" autocomplete="off" placeholder="Nom d'un ETF"><div class="msug" hidden></div></div></div>
      <label class="s4-f rv-w"><span>Part (%)</span><input id="o2rw${i}" class="el-in" type="number" inputmode="decimal" min="0" max="100" step="5" value="${S.w[i]}"></label>
      ${S.ids.length > 2 ? `<a href="#" role="button" class="rv-x" data-x="${i}" aria-label="Retirer ce fonds">×</a>` : ""}</div>`).join("");
    S.ids.forEach((id, i) => {
      $("#o2rq" + i).value = ETFBY[id].name; bindPicker("o2rq" + i, k => { S.ids[i] = k.slice(2); maj(); }, true);
      $("#o2rw" + i).oninput = () => { S.w[i] = Math.max(0, parseFloat(String($("#o2rw" + i).value).replace(",", ".")) || 0); clearTimeout(S.t); S.t = setTimeout(maj, 250, false); };
    });
    $$("#o2rl [data-x]").forEach(b => b.onclick = e => { e.preventDefault(); const i = +b.dataset.x; S.ids.splice(i, 1); S.w.splice(i, 1); maj(); });
    $("#o2radd").hidden = S.ids.length >= 4;
  };
  const maj = (redessine = true) => {
    const q = new URLSearchParams(); S.ids.forEach((id, i) => q.set("abcd"[i], id)); q.set("w", S.w.join(","));
    history.replaceState({}, "", "/outils/recouvrement?" + q); if (redessine) lignes();
    $$(".rv-ex [data-a]").forEach(b => b.classList.toggle("on", S.ids.length === 2 && S.ids[0] === b.dataset.a && S.ids[1] === b.dataset.b));
    O2_rcCalcul(S);
  };
  $("#o2radd").onclick = e => { e.preventDefault(); const x = ETF.list.find(y => y.compo && !S.ids.includes(y.id) && /Emerging|Europe/i.test(y.index || "")) || ETF.list.find(y => !S.ids.includes(y.id)); if (!x) return; S.ids.push(x.id); S.w = S.ids.map(() => Math.round(100 / S.ids.length)); maj(); };
  $$(".rv-ex [data-a]").forEach(b => b.onclick = e => { e.preventDefault(); S.ids = [b.dataset.a, b.dataset.b]; S.w = [50, 50]; maj(); });
  maj();
}
window.outilRecouvrement = outilRecouvrement4;
