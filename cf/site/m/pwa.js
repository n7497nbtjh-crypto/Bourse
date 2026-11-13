/* Module « pwa » d'ENKLAIR : chargé après le script principal de index.html.
   Contenu : application installable (service worker /sw.js, invitation discrète à installer), bandeau hors ligne,
   avis de nouvelle version, notifications push depuis « Mon espace », page /connecteur (ENKLAIR dans Claude et ChatGPT).
   Les fonctions de index.html complétées ici (espaceAlertes, espaceReglages) sont enveloppées, pas réécrites :
   la version d'origine s'exécute, puis ce module ajoute ses blocs. */
"use strict";
const PWA_LS = k => { try { return localStorage.getItem("bilan.pwa." + k); } catch (e) { return null; } };
const PWA_SET = (k, v) => { try { v == null ? localStorage.removeItem("bilan.pwa." + k) : localStorage.setItem("bilan.pwa." + k, String(v)); } catch (e) { } };
const PWA_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const PWA_SEUL = () => (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
const PWA_SW_OK = "serviceWorker" in navigator && window.isSecureContext;
const PWA_PARTAGE = `<svg class="pwa-ico" viewBox="0 0 24 24" aria-label="Partager" role="img"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v7A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5H16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
let PWA_INVITE = null; // événement beforeinstallprompt mis de côté (Chrome, Edge, Samsung Internet)

/* styles : voir site.css */

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
const PWA_T0 = Date.now();
async function pwaVerifierVersion(auto) { // auto : au chargement, si une version plus récente est en ligne, la page se recharge d'elle-même (rien n'a encore été saisi)
  if (!PWA_VERSION || document.hidden || (!auto && Date.now() - PWA_VU < 5 * 6e4) || document.getElementById("pwamaj")) return;
  PWA_VU = Date.now();
  try {
    const r = await fetch("/", { method: "HEAD", cache: "no-store", credentials: "same-origin" }), v = r.headers.get("x-bilan-version");
    if (v && v !== PWA_VERSION) {
      PWA_NOUVELLE = v;
      const saisie = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && document.activeElement.value;
      if (auto === true && !saisie && Date.now() - PWA_T0 < 20000 && !sessionStorage.getItem("pwa-rechg:" + v)) { try { sessionStorage.setItem("pwa-rechg:" + v, "1"); } catch (e) { } location.reload(); return; }
      document.querySelector("header").insertAdjacentHTML("afterend", `<div class="pwa-maj" id="pwamaj" role="status"><div class="wrap"><span>Une nouvelle version d'ENKLAIR est en ligne.</span><button type="button" id="pwamajb">Mettre à jour</button></div></div>`);
      document.getElementById("pwamajb").onclick = () => location.reload();
    }
  } catch (e) { }
}
let PWA_NOUVELLE = null;
document.addEventListener("visibilitychange", () => pwaVerifierVersion(false));
// Changement de page dans le site : si une version plus récente est en ligne, la page suivante est chargée en entier
// (sinon l'onglet resté ouvert garderait les anciens scripts). Vérification au plus une fois par minute.
(() => {
  const go0 = window.go; if (typeof go0 !== "function") return;
  let vu = 0;
  window.go = function (url) {
    if (PWA_NOUVELLE) { location.href = url; return; }
    if (Date.now() - vu > 6e4) { vu = Date.now(); PWA_VU = 0; pwaVerifierVersion(false); }
    return go0.apply(this, arguments);
  };
})();
setTimeout(() => pwaVerifierVersion(true), 2500); // au chargement : la version en ligne est comparée à celle affichée
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
addEventListener("appinstalled", () => { PWA_INVITE = null; PWA_SET("installe", Date.now()); pwaFermerInvite(); toast("ENKLAIR est installé : retrouvez-le sur votre écran d'accueil."); });
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
  if (/^\/(espace|premium)/.test(location.pathname)) return;
  try { sessionStorage.setItem("bilan.pwa.vue", "1"); } catch (e) { }
  const t = PWA_INVITE ? `<b>Installez ENKLAIR sur cet appareil</b><span>Ouverture en un geste, lecture hors ligne et alertes sur vos entreprises.</span>`
    : `<b>Ajoutez ENKLAIR à votre écran d'accueil</b><span>Touchez ${PWA_PARTAGE} Partager, puis « Sur l'écran d'accueil ».</span>`;
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

/* Mon espace : le bloc « Application » (installer ENKLAIR). */
const PWA_REGLAGES = typeof espaceReglages === "function" ? espaceReglages : null;
if (PWA_REGLAGES) espaceReglages = function (el, m) {
  const r = PWA_REGLAGES(el, m);
  const del = document.getElementById("delf");
  const s = document.createElement("section"); s.className = "panel"; s.id = "pwaapp";
  const inst = PWA_SEUL() || PWA_LS("installe");
  s.innerHTML = `<div class="ph"><h2>Application</h2></div><div class="pb"><div class="pwa-acts" style="margin-bottom:10px">${inst ? `<span class="pwa-etat on"><i></i>ENKLAIR est installé</span>` : PWA_INVITE ? `<button type="button" class="btn" id="pwainst">Installer ENKLAIR sur cet appareil</button>` : ""}</div>
    <p class="muted" style="margin:0;font-size:13.5px">${inst ? "Ouvrez ENKLAIR depuis son icône : les pages déjà vues restent lisibles sans connexion." : PWA_IOS ? `Sur iPhone et iPad : touchez ${PWA_PARTAGE} Partager, puis « Sur l'écran d'accueil ».` : PWA_INVITE ? "L'application s'ouvre en un geste depuis votre écran d'accueil et reste lisible sans connexion." : "Dans Chrome ou Edge, le menu du navigateur propose « Installer ENKLAIR » ; sur iPhone, « Sur l'écran d'accueil » dans le menu Partager."}</p></div>`;
  const sup = del && del.closest("section");
  if (sup && sup.parentElement === el) el.insertBefore(s, sup); else el.appendChild(s);
  const b = document.getElementById("pwainst"); if (b) b.onclick = async () => { await pwaInstaller(); s.remove(); espaceReglages(el, m); };
  return r;
};

/* ---------- Page /connecteur : ENKLAIR dans Claude, ChatGPT et les autres assistants ---------- */

/* ---------- /ia/connecter (5e passage, C) : brancher Claude ou ChatGPT sur ENKLAIR en trois étapes ----------
   Connecteur réservé à Premium depuis le 4/11 (adresse personnelle /mcp/<clé> d'un compte Premium ; sinon chaque outil renvoie l'explication). Les illustrations sont
   des schémas du site, pas des captures d'écran de Claude ou de ChatGPT (dont les écrans changent souvent). */
