/* ---------- Fiche ETF v3 (2/11/2026) : même direction que la fiche entreprise ----------
   Après pageEtf, « En bref » est recomposé : étiquette penchée, verdict en grand, tuile Frais avec la jauge v3 face à la médiane
   de sa catégorie, deux cartes (essentiel, risques) en pastilles. Les barres des dix plus grosses lignes passent au dessin v3.
   Styles : site.css, bloc « Fiche ETF v3 ». */
function etf3Recomposer() {
  const br = $("#ebref"); if (!br || br.dataset.v3) return; br.dataset.v3 = "1";
  const vc = $(".rf-vc", br), fv = $("#fverdict", br), fr = $(".rf-fr", br), jg = $(".rf6-jg i", br), jl = $(".rf6-jg small", br), vd = $(".etfvd", br);
  const pts = $$(".rf-pts .rf-bl", br), foot = $(".rf-foot", br);
  const pos = jg ? parseFloat(jg.style.left) : null, fb = fr && fr.querySelector("b");
  const liste = bl => `<div class="e3f-card"><small>${esc((bl.querySelector("h3") || {}).textContent || "")}</small><div class="f3-chips">${$$("li", bl).map(li => `<span class="${li.className.includes("rf-d") ? "warn" : ""}">${esc(li.textContent)}</span>`).join("")}</div></div>`;
  br.innerHTML = `<span class="a4-stk a4-ye">En bref</span>
    ${vc ? `<h2 class="e3f-v">${esc(vc.childNodes[0].textContent)}</h2><p class="e3f-sub">${esc((vc.querySelector("small") || {}).textContent || "")}</p>` : ""}
    ${fv ? `<p class="f3-lec">${fv.innerHTML}</p>` : ""}
    ${fb ? `<div class="e3f-frais"><small>Frais par an</small><b>${esc(fb.textContent)}</b>${vd ? `<span class="e3f-vd ${vd.className.replace("etfvd", "").trim()}">${esc(vd.textContent)}</span>` : ""}${pos != null ? `<div class="f3-ms"><i>médiane</i><b style="left:${pos}%"></b></div><em>${esc(jl ? jl.textContent : "")}</em>` : ""}</div>` : ""}
    <div class="e3f-pts">${pts.map(liste).join("")}</div>
    ${foot ? `<div class="f3-qs">${$$("a", foot).map(a => `<a class="f3-pv" href="${a.getAttribute("href")}" data-rf-go="${a.dataset.rfGo || ""}">${esc(a.textContent)} ↓</a>`).join("")}</div>` : ""}`;
  // dix plus grosses lignes : barres v3
  $$(".hb", $("#ecomp") || document).forEach(hb => { if (hb.dataset.v3) return; hb.dataset.v3 = "1"; hb.classList.add("e3f-hb"); $$(".hbb > span", hb).forEach((sp, i) => { sp.style.background = F3_COUL[i % F3_COUL.length]; }); });
}
(() => { const p0 = window.pageEtf; if (typeof p0 !== "function") return;
  window.pageEtf = async function () { const r = await p0.apply(this, arguments); try { etf3Recomposer(); } catch (e) { console.error("etf v3", e); } return r; }; })();
