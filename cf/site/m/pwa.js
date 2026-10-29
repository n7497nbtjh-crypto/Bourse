/* Module « pwa » de bilan. : chargé après le script principal de index.html.
   Contenu : application installable (service worker /sw.js, invitation discrète à installer), bandeau hors ligne,
   avis de nouvelle version, notifications push depuis « Mon espace », page /connecteur (bilan. dans Claude et ChatGPT).
   Les fonctions de index.html complétées ici (espaceAlertes, espaceReglages) sont enveloppées, pas réécrites :
   la version d'origine s'exécute, puis ce module ajoute ses blocs. */
"use strict";
const PWA_LS = k => { try { return localStorage.getItem("bilan.pwa." + k); } catch (e) { return null; } };
const PWA_SET = (k, v) => { try { v == null ? localStorage.removeItem("bilan.pwa." + k) : localStorage.setItem("bilan.pwa." + k, String(v)); } catch (e) { } };
const PWA_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const PWA_SEUL = () => (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
const PWA_SW_OK = "serviceWorker" in navigator && window.isSecureContext;
const PWA_PUSH_OK = PWA_SW_OK && "PushManager" in window && "Notification" in window;
const PWA_CHOIX = [["annonces", "Résultats, annonces et assemblées", "La veille d'une publication de résultats et le soir d'une annonce officielle."], ["dividendes", "Dividendes", "La veille du détachement d'un dividende."], ["mouvements", "Mouvement de plus de 5 %", "Le soir où une de vos entreprises a bougé de plus de 5 % en une séance."], ["bilan", "Bilan de la semaine", "Le samedi matin, quand votre bilan est prêt."]];
const PWA_PARTAGE = `<svg class="pwa-ico" viewBox="0 0 24 24" aria-label="Partager" role="img"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v7A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5H16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
let PWA_INVITE = null; // événement beforeinstallprompt mis de côté (Chrome, Edge, Samsung Internet)

document.head.insertAdjacentHTML("beforeend", `<style>
.pwa-ico{width:17px;height:17px;vertical-align:-3px;display:inline-block}
.pwa-band{background:var(--card,#fff);border-bottom:1px solid var(--line,#E6E0D4)}
.pwa-band .wrap{display:flex;align-items:center;gap:14px;padding-top:10px;padding-bottom:10px}
.pwa-band img{width:38px;height:38px;border-radius:9px;flex:none}
.pwa-band .t{flex:1;min-width:0;font-size:14px;line-height:1.4}.pwa-band .t b{display:block;font-weight:600}.pwa-band .t span{color:var(--grey)}
.pwa-band .act{display:flex;gap:8px;align-items:center;flex:none}
.pwa-band .btn{height:36px;padding:0 14px;font-size:14px}
.pwa-x{background:none;border:0;width:34px;height:34px;border-radius:8px;color:var(--grey);font-size:20px;line-height:1;cursor:pointer}.pwa-x:hover{background:var(--soft,#F1ECE1);color:var(--ink)}
.pwa-off{background:#111214;color:#F8F5EE;font-size:13px;text-align:center;padding:6px 16px}.pwa-off b{color:#C6F432;font-weight:600}
.pwa-maj{background:var(--hl,#F3FBD3);border-bottom:1px solid #DCEBA6;font-size:13.5px}.pwa-maj .wrap{display:flex;gap:12px;align-items:center;justify-content:center;padding-top:7px;padding-bottom:7px;flex-wrap:wrap}
.pwa-maj button{font:inherit;font-weight:600;background:var(--ink);color:#fff;border:0;border-radius:8px;padding:4px 12px;cursor:pointer}
@media (max-width:640px){.pwa-band .wrap{flex-wrap:wrap;gap:10px}.pwa-band .t{flex-basis:calc(100% - 100px)}.pwa-band .act{width:100%;justify-content:flex-end}}
.pwa-push .pb{display:flex;flex-direction:column;gap:12px}
.pwa-etat{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:600;border-radius:99px;padding:3px 11px;background:var(--soft,#F1ECE1);color:var(--grey)}
.pwa-etat.on{background:#E6F2EC;color:var(--g,#0E6B4A)}.pwa-etat i{width:8px;height:8px;border-radius:50%;background:currentColor}
.pwa-ch{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.pwa-ch label{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--line,#E6E0D4);border-radius:12px;padding:10px 12px;cursor:pointer;background:#fff}
.pwa-ch label:has(input:checked){border-color:var(--ink);background:#FCFBF8}
.pwa-ch input{margin:3px 0 0;accent-color:var(--ink,#111214);width:16px;height:16px;flex:none}
.pwa-ch b{display:block;font-size:14px;font-weight:600}.pwa-ch small{display:block;color:var(--grey);font-size:12.5px;line-height:1.4}
.pwa-acts{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.pwa-msg{font-size:13px;color:var(--grey)}
@media (max-width:640px){.pwa-ch{grid-template-columns:1fr}}
.pwa-hero{padding:26px 0 10px;max-width:860px}.pwa-hero h1{font-family:var(--serif);font-size:clamp(30px,4.6vw,48px);line-height:1.06;letter-spacing:-.02em;margin:8px 0 14px}
.pwa-hero p.lead{font-size:17px;color:var(--grey);max-width:720px}
.pwa-url{display:flex;gap:10px;align-items:stretch;flex-wrap:wrap;margin:18px 0 6px}
.pwa-url code{flex:1;min-width:0;display:flex;align-items:center;font:500 15px var(--mono);background:#fff;border:1.5px solid var(--ink);border-radius:12px;padding:10px 14px;overflow-wrap:anywhere}
.pwa-url .btn{height:auto;min-height:44px}
@media (max-width:600px){.pwa-url code{flex-basis:100%;font-size:14px}.pwa-url .btn{width:100%;justify-content:center}}
.pwa-tools{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.pwa-tool{border:1px solid var(--line,#E6E0D4);border-radius:14px;padding:14px 16px;background:#fff;display:flex;flex-direction:column;gap:6px}
.pwa-tool h3{font-family:var(--serif);font-size:17px;margin:0}.pwa-tool p{margin:0;font-size:13.5px;color:var(--grey);line-height:1.45}
.pwa-tool q{font-size:13.5px;font-style:italic;color:var(--ink);quotes:"« " " »"}
.pwa-tool code{font:500 11.5px var(--mono);color:var(--light)}
@media (max-width:960px){.pwa-tools{grid-template-columns:repeat(2,minmax(0,1fr))}}@media (max-width:600px){.pwa-tools{grid-template-columns:1fr}}
.pwa-steps{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px;font-size:14.5px;line-height:1.5}
.pwa-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 14px}
.pwa-tabs button{font:inherit;font-size:14px;font-weight:600;border:1.5px solid var(--ink);background:#fff;border-radius:99px;padding:6px 14px;cursor:pointer}.pwa-tabs button.on{background:var(--ink);color:#fff}
.pwa-cmd{display:block;font:500 13px var(--mono);background:#111214;color:#F8F5EE;border-radius:10px;padding:12px 14px;overflow-x:auto;white-space:pre;margin:8px 0}
.pwa-try{display:flex;gap:10px;flex-wrap:wrap}.pwa-try input{flex:1;min-width:180px;height:42px;border:1px solid var(--line,#E6E0D4);border-radius:10px;padding:0 12px;font:inherit;background:#fff}
.pwa-out{margin:12px 0 0;max-height:380px;overflow:auto;background:#FCFBF8;border:1px solid var(--line2,#EFEAE0);border-radius:12px;padding:12px 14px;font:13px/1.55 var(--mono);white-space:pre-wrap;overflow-wrap:anywhere}
.pwa-garde{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.pwa-garde div{border-left:3px solid var(--lime,#C6F432);padding:2px 0 2px 12px}.pwa-garde b{display:block;font-size:14.5px}.pwa-garde span{font-size:13.5px;color:var(--grey)}
@media (max-width:760px){.pwa-garde{grid-template-columns:1fr}}
</style>`);

/* ---------- Service worker ---------- */
function pwaEnregistrer() {
  if (!PWA_SW_OK) return;
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => { });
  navigator.serviceWorker.addEventListener("message", e => {
    const d = e.data || {};
    if (d.type === "bilan-aller" && typeof d.url === "string") { const u = new URL(d.url, location.href); if (u.origin === location.origin) go(u.pathname + u.search + u.hash); }
  });
}
if (document.readyState === "complete") setTimeout(pwaEnregistrer, 1500); else addEventListener("load", () => setTimeout(pwaEnregistrer, 1500)); // après le démarrage de la page

/* ---------- Nouvelle version en ligne (application restée ouverte) ---------- */
const PWA_VERSION = (document.querySelector('meta[name="bilan-version"]') || {}).content || null;
let PWA_VU = Date.now();
async function pwaVerifierVersion() {
  if (!PWA_VERSION || document.hidden || Date.now() - PWA_VU < 30 * 6e4 || document.getElementById("pwamaj")) return;
  PWA_VU = Date.now();
  try {
    const r = await fetch("/", { method: "HEAD", cache: "no-store", credentials: "same-origin" }), v = r.headers.get("x-bilan-version");
    if (v && v !== PWA_VERSION) {
      document.querySelector("header").insertAdjacentHTML("afterend", `<div class="pwa-maj" id="pwamaj" role="status"><div class="wrap"><span>Une nouvelle version de bilan. est en ligne.</span><button type="button" id="pwamajb">Mettre à jour</button></div></div>`);
      document.getElementById("pwamajb").onclick = () => location.reload();
    }
  } catch (e) { }
}
document.addEventListener("visibilitychange", pwaVerifierVersion);
setInterval(pwaVerifierVersion, 10 * 6e4);

/* ---------- Hors ligne ---------- */
function pwaReseau() {
  let b = document.getElementById("pwaoff");
  if (navigator.onLine) { if (b) b.remove(); return; }
  if (!b) document.querySelector("header").insertAdjacentHTML("afterend", `<div class="pwa-off" id="pwaoff" role="status"><b>Hors ligne.</b> Vous consultez les dernières données enregistrées sur cet appareil.</div>`);
}
addEventListener("online", pwaReseau); addEventListener("offline", pwaReseau); pwaReseau();

/* ---------- Invitation à installer : discrète, après quelques pages, jamais deux fois de suite ---------- */
addEventListener("beforeinstallprompt", e => { e.preventDefault(); PWA_INVITE = e; pwaPeutInviter(); });
addEventListener("appinstalled", () => { PWA_INVITE = null; PWA_SET("installe", Date.now()); pwaFermerInvite(); toast("bilan. est installé : retrouvez-le sur votre écran d'accueil."); });
(() => { // compte des visites (une par session) et des pages vues
  try { if (!sessionStorage.getItem("bilan.pwa.session")) { sessionStorage.setItem("bilan.pwa.session", "1"); PWA_SET("visites", (+PWA_LS("visites") || 0) + 1); } } catch (e) { }
})();
let PWA_PAGES = 0;
function pwaPeutInviter() {
  if (PWA_SEUL() || document.getElementById("pwainv")) return;
  if (Date.now() - (+PWA_LS("non") || 0) < 60 * 864e5 || PWA_LS("installe")) return;
  try { if (sessionStorage.getItem("bilan.pwa.vue")) return; } catch (e) { }
  if (!(PWA_INVITE || (PWA_IOS && /Safari\//.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent)))) return;
  if ((+PWA_LS("visites") || 0) < 2 && PWA_PAGES < 3) return; // pas à la première page d'une première visite
  if (/^\/(espace|premium|connecteur)/.test(location.pathname) && location.pathname !== "/espace/reglages") return;
  try { sessionStorage.setItem("bilan.pwa.vue", "1"); } catch (e) { }
  const t = PWA_INVITE ? `<b>Installez bilan. sur cet appareil</b><span>Ouverture en un geste, lecture hors ligne et alertes sur vos entreprises.</span>`
    : `<b>Ajoutez bilan. à votre écran d'accueil</b><span>Touchez ${PWA_PARTAGE} Partager, puis « Sur l'écran d'accueil ».</span>`;
  document.querySelector("header").insertAdjacentHTML("afterend", `<div class="pwa-band" id="pwainv" role="region" aria-label="Installer l'application"><div class="wrap"><img src="/icons/icon-192.png" alt=""><div class="t">${t}</div><div class="act">${PWA_INVITE ? `<button type="button" class="btn" id="pwainvok">Installer</button>` : ""}<button type="button" class="pwa-x" id="pwainvx" aria-label="Plus tard">×</button></div></div></div>`);
  document.getElementById("pwainvx").onclick = () => { PWA_SET("non", Date.now()); pwaFermerInvite(); };
  if (PWA_INVITE) document.getElementById("pwainvok").onclick = () => pwaInstaller();
}
function pwaFermerInvite() { const b = document.getElementById("pwainv"); if (b) b.remove(); }
async function pwaInstaller() {
  if (!PWA_INVITE) return false;
  const e = PWA_INVITE; PWA_INVITE = null;
  try { await e.prompt(); const c = await e.userChoice; if (c && c.outcome === "dismissed") PWA_SET("non", Date.now()); } catch (x) { }
  pwaFermerInvite(); return true;
}
addEventListener("popstate", () => { PWA_PAGES++; setTimeout(pwaPeutInviter, 800); });
document.addEventListener("click", e => { const a = e.target.closest && e.target.closest("a[href^='/']"); if (a) { PWA_PAGES++; setTimeout(pwaPeutInviter, 1200); } });
setTimeout(pwaPeutInviter, 20000);

/* ---------- Notifications push : « Mon espace » ---------- */
const pwaCle = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0));
async function pwaRegistration() {
  if (!PWA_PUSH_OK) return null;
  let reg = await navigator.serviceWorker.getRegistration("/");
  if (!reg) { try { reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" }); } catch (e) { return null; } }
  return navigator.serviceWorker.ready;
}
async function pwaAbonnementLocal() { const reg = await pwaRegistration(); return reg ? reg.pushManager.getSubscription() : null; }
async function pwaDesabonnerLocal() {
  try { const s = await pwaAbonnementLocal(); if (!s) return; await post2("/api/push/desabonnement", { endpoint: s.endpoint }).catch(() => { }); await s.unsubscribe(); } catch (e) { }
}
function pwaChoixHTML(ch) {
  return `<div class="pwa-ch">${PWA_CHOIX.map(([k, l, d]) => `<label><input type="checkbox" data-pc="${k}"${ch[k] !== false ? " checked" : ""}><span><b>${l}</b><small>${d}</small></span></label>`).join("")}</div>`;
}
const pwaLireChoix = el => Object.fromEntries([...el.querySelectorAll("[data-pc]")].map(i => [i.dataset.pc, i.checked]));
async function pwaPanneauPush(el, ou) {
  const box = document.createElement("section"); box.className = "panel pwa-push"; box.id = "pwapush";
  const old = document.getElementById("pwapush"); if (old) old.remove();
  if (ou === "haut") el.prepend(box); else el.appendChild(box);
  const tete = (etat, on) => `<div class="ph"><h2>Notifications sur cet appareil</h2><span class="pwa-etat${on ? " on" : ""}"><i></i>${etat}</span></div>`;
  if (!PWA_PUSH_OK) {
    box.innerHTML = tete("Indisponibles") + `<div class="pb"><p class="muted" style="margin:0">${PWA_IOS && !PWA_SEUL()
      ? `Sur iPhone et iPad, les notifications fonctionnent une fois bilan. ajouté à l'écran d'accueil (iOS 16.4 ou plus récent) : touchez ${PWA_PARTAGE} Partager, puis « Sur l'écran d'accueil », et ouvrez bilan. depuis son icône.`
      : "Ce navigateur ne permet pas de recevoir des notifications de sites. Vos alertes restent consultables ici, chaque soir de semaine."}</p></div>`;
    return;
  }
  box.innerHTML = tete("Vérification…") + `<div class="pb"><p class="muted" style="margin:0">Un instant…</p></div>`;
  const sub = await pwaAbonnementLocal().catch(() => null);
  const etat = sub ? await post2("/api/push/etat", { endpoint: sub.endpoint }).catch(() => ({})) : { abonne: false, choix: {} };
  const ch = etat.choix || {};
  if (Notification.permission === "denied") {
    box.innerHTML = tete("Bloquées") + `<div class="pb"><p class="muted" style="margin:0">Les notifications sont bloquées pour ce site dans les réglages de votre navigateur. Autorisez-les dans les paramètres du site (icône à gauche de l'adresse), puis revenez sur cette page.</p></div>`;
    return;
  }
  if (sub && etat.abonne) {
    box.innerHTML = tete("Activées", true) + `<div class="pb"><p class="muted" style="margin:0">Une notification le soir après la clôture, seulement pour ce que vous cochez. Cliquez dessus pour ouvrir la page concernée.</p>${pwaChoixHTML(ch)}
      <div class="pwa-acts"><button type="button" class="btn ghost" id="pwaessai">Envoyer une notification d'essai</button><button type="button" class="btn ghost" id="pwadesac">Désactiver sur cet appareil</button><span class="pwa-msg" id="pwamsg" role="status"></span></div></div>`;
    const msg = t => { const m = box.querySelector("#pwamsg"); if (m) m.textContent = t; };
    box.querySelectorAll("[data-pc]").forEach(i => i.onchange = async () => { const r = await post2("/api/push/abonnement", { abonnement: sub.toJSON(), choix: pwaLireChoix(box) }); msg(r.ok ? "Choix enregistrés." : r.error || "Enregistrement impossible."); });
    box.querySelector("#pwaessai").onclick = async e => { e.target.disabled = true; msg("Envoi…"); const r = await post2("/api/push/essai", { endpoint: sub.endpoint }); msg(r.ok ? "Envoyée : elle arrive dans quelques secondes." : r.error || "Envoi impossible."); setTimeout(() => { e.target.disabled = false; }, 4000); };
    box.querySelector("#pwadesac").onclick = async () => { await pwaDesabonnerLocal(); pwaPanneauPush(el, ou); };
    return;
  }
  box.innerHTML = tete(etat.autre_compte ? "Liées à un autre compte" : "Désactivées") + `<div class="pb"><p style="margin:0">Recevez vos alertes ici, sans ouvrir le site : une notification le soir après la clôture, seulement pour ce que vous choisissez.${etat.autre_compte ? " Cet appareil reçoit aujourd'hui les alertes d'un autre compte : les activer ici les rattache au vôtre." : ""}</p>${pwaChoixHTML(ch)}
    <div class="pwa-acts"><button type="button" class="btn" id="pwaon">Activer les notifications</button><span class="pwa-msg" id="pwamsg" role="status">Votre navigateur vous demandera l'autorisation.</span></div></div>`;
  box.querySelector("#pwaon").onclick = async e => {
    const b = e.target, msg = t => { box.querySelector("#pwamsg").textContent = t; };
    b.disabled = true; msg("Activation…");
    try {
      const p = await Notification.requestPermission();
      if (p !== "granted") { msg(p === "denied" ? "Vous avez refusé les notifications. Vous pourrez changer d'avis dans les réglages du navigateur." : "Autorisation non donnée."); b.disabled = false; return; }
      const reg = await pwaRegistration(), { cle } = await fetch("/api/push/cle").then(r => r.json());
      let s = await reg.pushManager.getSubscription();
      if (s && s.options && s.options.applicationServerKey && new Uint8Array(s.options.applicationServerKey).join() !== pwaCle(cle).join()) { await s.unsubscribe(); s = null; }
      if (!s) s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: pwaCle(cle) });
      const r = await post2("/api/push/abonnement", { abonnement: s.toJSON(), choix: pwaLireChoix(box) });
      if (!r.ok) { msg(r.error || "Activation impossible pour le moment."); b.disabled = false; return; }
      toast("Notifications activées sur cet appareil.");
      pwaPanneauPush(el, ou);
    } catch (x) { msg("Activation impossible sur ce navigateur. Réessayez plus tard."); b.disabled = false; }
  };
}

/* Onglet « Alertes » : le bloc des notifications en tête ; « Réglages » : l'application et le connecteur IA. */
const PWA_ALERTES = typeof espaceAlertes === "function" ? espaceAlertes : null;
if (PWA_ALERTES) espaceAlertes = async function (el, m) { await PWA_ALERTES(el, m); if (el.isConnected) pwaPanneauPush(el, "haut"); };
const PWA_REGLAGES = typeof espaceReglages === "function" ? espaceReglages : null;
if (PWA_REGLAGES) espaceReglages = function (el, m) {
  const r = PWA_REGLAGES(el, m);
  const lo = document.getElementById("logout");
  if (lo && lo.onclick) { const o = lo.onclick; lo.onclick = async e => { await pwaDesabonnerLocal(); return o.call(lo, e); }; } // se déconnecter : plus de notifications de ce compte ici
  const del = document.getElementById("delf");
  if (del && del.onsubmit) { const o = del.onsubmit; del.onsubmit = async e => { await o.call(del, e); if (typeof MOI === "object" && MOI && MOI.connecte === false) pwaDesabonnerLocal(); }; }
  const s = document.createElement("section"); s.className = "panel"; s.id = "pwaapp";
  const inst = PWA_SEUL() || PWA_LS("installe");
  s.innerHTML = `<div class="ph"><h2>Application et notifications</h2></div><div class="pb"><div class="pwa-acts" style="margin-bottom:10px">${inst ? `<span class="pwa-etat on"><i></i>bilan. est installé</span>` : PWA_INVITE ? `<button type="button" class="btn" id="pwainst">Installer bilan. sur cet appareil</button>` : ""}<a class="btn ghost" href="/espace/alertes">Régler les notifications</a><a class="btn ghost" href="/connecteur">Utiliser bilan. dans Claude ou ChatGPT</a></div>
    <p class="muted" style="margin:0;font-size:13.5px">${inst ? "Ouvrez bilan. depuis son icône : les pages déjà vues restent lisibles sans connexion." : PWA_IOS ? `Sur iPhone et iPad : touchez ${PWA_PARTAGE} Partager, puis « Sur l'écran d'accueil ».` : PWA_INVITE ? "L'application s'ouvre en un geste depuis votre écran d'accueil et reste lisible sans connexion." : "Dans Chrome ou Edge, le menu du navigateur propose « Installer bilan. » ; sur iPhone, « Sur l'écran d'accueil » dans le menu Partager."}</p></div>`;
  const sup = del && del.closest("section");
  if (sup && sup.parentElement === el) el.insertBefore(s, sup); else el.appendChild(s);
  const b = document.getElementById("pwainst"); if (b) b.onclick = async () => { await pwaInstaller(); s.remove(); espaceReglages(el, m); };
  return r;
};

/* ---------- Pied de page : liens ---------- */
(() => { const f = document.querySelector("footer .f > div:last-child"); if (f && !f.querySelector('a[href="/connecteur"]')) f.insertAdjacentHTML("beforeend", `<a href="/connecteur">Connecteur IA (Claude, ChatGPT)</a>`); })();

/* ---------- Page /connecteur : bilan. dans Claude, ChatGPT et les autres assistants ---------- */
const PWA_OUTILS = [
  ["fiche_entreprise", "Lire les comptes d'une entreprise", "Les chiffres clés des derniers comptes officiels, la médiane du secteur et le repère vert, gris ou orange de chacun.", "Que disent les derniers comptes de Schneider Electric ?"],
  ["comparer_entreprises", "Comparer", "Jusqu'à six entreprises côte à côte, sur les mêmes chiffres et avec leur place dans le secteur.", "Compare la marge et la dette de LVMH, Hermès et Kering."],
  ["eligibilite_pea", "Vérifier l'éligibilité au PEA", "Pour une action ou un ETF, avec la règle qui s'applique et sa source.", "Puis-je mettre ASML dans mon PEA ?"],
  ["etf", "Choisir parmi les ETF", "Frais, indice, PEA, distribution, et la composition quand elle est publiée.", "Quels ETF MSCI World éligibles au PEA coûtent le moins cher ?"],
  ["calendrier", "Suivre l'agenda", "Résultats, dividendes et assemblées à venir, avec la source de chaque date.", "Quelles entreprises publient leurs résultats cette semaine ?"],
  ["lecon", "Apprendre", "La leçon de l'Académie qui répond à la question, avec un exemple chiffré.", "Explique-moi les intérêts composés avec un exemple."],
  ["rechercher_entreprise", "Trouver une entreprise", "Par son nom, son ticker, son ISIN ou un mot de son activité.", "Trouve les entreprises françaises de la défense."],
];
function pageConnecteur() {
  setTitle("Connecteur IA"); setNav("");
  const url = location.origin + "/mcp", dans = PWA_LS("onglet") || "claude";
  app.innerHTML = `<div class="crumbs"><a href="/">Accueil</a> › Connecteur IA</div>
    <section class="pwa-hero"><p class="kick">Connecteur IA · gratuit · lecture seule</p>
      <h1>bilan. dans Claude et ChatGPT</h1>
      <p class="lead">Ajoutez bilan. à votre assistant IA. Il lit alors les comptes officiels de plus de 1 000 entreprises, la médiane de leur secteur, l'éligibilité au PEA, les ETF et l'agenda. Il calcule à partir de ces données au lieu d'inventer, et il cite ses sources.</p>
      <div class="pwa-url"><code id="pwaurl">${esc(url)}</code><button type="button" class="btn" id="pwacopie">Copier l'adresse</button></div>
      <p class="note" style="margin:6px 0 0">Aucun compte ni clé nécessaire. Protocole ouvert MCP (Model Context Protocol), reconnu par Claude, ChatGPT et la plupart des assistants.</p></section>

    <section class="panel"><div class="ph"><h2>L'ajouter en deux minutes</h2></div><div class="pb">
      <div class="pwa-tabs" role="tablist">${[["claude", "Claude"], ["chatgpt", "ChatGPT"], ["autres", "Claude Code et autres"]].map(([k, l]) => `<button type="button" role="tab" data-ong="${k}" aria-selected="${k === dans}" class="${k === dans ? "on" : ""}">${l}</button>`).join("")}</div>
      <div data-pan="claude"${dans === "claude" ? "" : " hidden"}><ol class="pwa-steps">
        <li>Sur claude.ai ou dans l'application Claude pour ordinateur, ouvrez <b>Personnaliser</b>, puis <b>Connecteurs</b>.</li>
        <li>Cliquez sur <b>+</b>, puis <b>Ajouter un connecteur personnalisé</b>.</li>
        <li>Nom : <b>bilan.</b> · Adresse : <code>${esc(url)}</code>. Pas d'authentification à configurer.</li>
        <li>Dans une conversation, cliquez sur <b>+</b> en bas à gauche, puis <b>Connecteurs</b>, et activez bilan.</li></ol>
        <p class="note">Disponible avec les offres Free (un connecteur personnalisé), Pro, Max, Team et Enterprise. Sur Team et Enterprise, un propriétaire de l'organisation l'ajoute d'abord dans les paramètres de l'organisation. Les intitulés peuvent changer : <a class="lnk" href="https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp" target="_blank" rel="noopener">aide de Claude</a>.</p></div>
      <div data-pan="chatgpt"${dans === "chatgpt" ? "" : " hidden"}><ol class="pwa-steps">
        <li>Dans ChatGPT sur le web, ouvrez <b>Paramètres</b>, puis <b>Applications et connecteurs</b>.</li>
        <li>Dans <b>Paramètres avancés</b>, activez le <b>mode développeur</b>.</li>
        <li>Cliquez sur <b>Créer</b> : nom <b>bilan.</b>, adresse <code>${esc(url)}</code>, authentification <b>aucune</b>.</li>
        <li>Dans une conversation, choisissez bilan. dans le menu des outils, puis posez votre question.</li></ol>
        <p class="note">Disponible avec les offres Plus, Pro, Business, Enterprise et Edu. Sans le mode développeur, ChatGPT peut utiliser bilan. comme source de recherche approfondie (outils search et fetch). Les intitulés peuvent changer d'une version à l'autre.</p></div>
      <div data-pan="autres"${dans === "autres" ? "" : " hidden"}><p style="margin:0 0 6px">Claude Code, en une commande :</p><code class="pwa-cmd">claude mcp add --transport http bilan ${esc(url)}</code>
        <p style="margin:12px 0 6px">Cursor, VS Code, Windsurf et les autres clients MCP : ajoutez un serveur distant « Streamable HTTP » avec cette adresse, sans authentification.</p><code class="pwa-cmd">{ "mcpServers": { "bilan": { "url": "${esc(url)}" } } }</code></div>
    </div></section>

    <section class="panel"><div class="ph"><h2>Ce que votre assistant peut faire</h2><span class="light" style="font-size:12.5px">${PWA_OUTILS.length} outils, plus search et fetch pour ChatGPT</span></div><div class="pb"><div class="pwa-tools">
      ${PWA_OUTILS.map(([n, t, d, q]) => `<div class="pwa-tool"><h3>${t}</h3><p>${d}</p><q>${q}</q><code>${n}</code></div>`).join("")}</div></div></section>

    <section class="panel"><div class="ph"><h2>Voir ce que reçoit l'assistant</h2></div><div class="pb">
      <p style="margin:0 0 10px">Tapez une entreprise : voici, mot pour mot, la réponse que le connecteur envoie à Claude ou à ChatGPT.</p>
      <form class="pwa-try" id="pwatry"><input id="pwaq" value="Air Liquide" aria-label="Entreprise" autocomplete="off"><button class="btn">Interroger le connecteur</button></form>
      <pre class="pwa-out" id="pwaout" hidden></pre></div></section>

    <section class="panel"><div class="ph"><h2>Les garde-fous</h2></div><div class="pb"><div class="pwa-garde">
      <div><b>Information, pas conseil</b><span>Chaque réponse rappelle qu'il s'agit d'information. Les repères vert, gris et orange décrivent les comptes passés selon des <a class="lnk" href="/methode">seuils publiés</a>, pas l'intérêt d'acheter.</span></div>
      <div><b>Des sources à chaque réponse</b><span>Rapports annuels officiels (ESEF, SEC), calendriers des entreprises, et le lien vers la page bilan. pour vérifier.</span></div>
      <div><b>Lecture seule, sans données personnelles</b><span>Pas de compte, pas d'écriture. L'adresse IP ne sert, sous forme d'empreinte anonyme renouvelée chaque jour, qu'à limiter le débit.</span></div></div>
      <p class="note">L'assistant reste responsable de ce qu'il écrit : vérifiez les chiffres importants sur la fiche bilan. dont il donne le lien.</p></div></section>

    <section class="panel"><details class="acc"><summary class="ph" style="cursor:pointer"><h2>Détails techniques</h2></summary><div class="pb" style="font-size:14px;line-height:1.55">
      <p style="margin-top:0">Serveur MCP distant, transport <b>Streamable HTTP</b> (JSON-RPC 2.0 en POST sur <code>/mcp</code>), sans session ni authentification. Versions du protocole : 2025-11-25, 2025-06-18, 2025-03-26 et 2024-11-05. Méthodes : initialize, ping, tools/list, tools/call. Chaque outil renvoie un texte lisible et des données structurées (structuredContent).</p>
      <p>Données : les mêmes fichiers que le site, mis à jour chaque jour par les robots de collecte. Débit : 240 appels par minute et 30 000 par jour pour une même adresse. Accès depuis un navigateur autorisé (CORS).</p>
      <code class="pwa-cmd">curl -s ${esc(url)} -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"eligibilite_pea","arguments":{"titre":"ASML"}}}'</code></div></details></section>`;
  $$("[data-ong]").forEach(b => b.onclick = () => { PWA_SET("onglet", b.dataset.ong); $$("[data-ong]").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", x === b); }); $$("[data-pan]").forEach(p => p.hidden = p.dataset.pan !== b.dataset.ong); });
  $("#pwacopie").onclick = async () => { try { await navigator.clipboard.writeText(url); toast("Adresse copiée : collez-la dans les réglages de votre assistant."); } catch (e) { const r = document.createRange(); r.selectNodeContents($("#pwaurl")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast("Adresse sélectionnée : copiez-la avec Ctrl+C."); } };
  $("#pwatry").onsubmit = async e => {
    e.preventDefault(); const q = $("#pwaq").value.trim(), out = $("#pwaout"); if (!q) return;
    out.hidden = false; out.textContent = "Interrogation du connecteur…";
    try {
      const r = await fetch("/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "fiche_entreprise", arguments: { entreprise: q } } }) });
      const j = await r.json(); out.textContent = j.result ? j.result.content.map(c => c.text).join("\n") : (j.error && j.error.message) || "Réponse inattendue.";
    } catch (x) { out.textContent = "Le connecteur ne répond pas pour le moment. Réessayez dans un instant."; }
  };
}
if (typeof ROUTES_EXTRA !== "undefined") ROUTES_EXTRA.push([/^\/connecteur$/, () => pageConnecteur()]);
