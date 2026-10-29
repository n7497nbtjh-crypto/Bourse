/* Service worker de bilan. : application installable, rapide et lisible hors ligne, notifications push.
   Règles de cache (prudentes) :
   - Pages (navigations) : toujours le réseau d'abord, le HTML est revalidé à chaque visite. La dernière page reçue est gardée
     comme « coquille » pour l'ouverture hors ligne ; sans elle, une page hors ligne propre.
   - Scripts, styles, icônes du site : servis depuis le cache et mis à jour en arrière-plan, dans un cache propre à la version
     du site (en-tête x-bilan-version de chaque page). Dès qu'une page annonce une nouvelle version, l'ancien cache est vidé
     avant que la page ne demande ses scripts : jamais un ancien script avec une nouvelle page.
   - Données /data/* : réseau d'abord, cache en secours (hors ligne).
   - /api/*, /mcp et tout ce qui n'est pas une lecture (GET) : jamais interceptés ni mis en cache.
   - Polices Google : gardées (fichiers immuables). Autres sites : non interceptés. */
"use strict";
const SW_VERSION = "2026-10-29.1"; // à changer pour forcer la mise à jour du service worker lui-même
const C_COQUILLE = "bilan-coquille", C_DONNEES = "bilan-donnees", C_POLICES = "bilan-polices", P_STATIQUE = "bilan-statique-";
const MAX_DONNEES = 160;

/* ---------- Version du site ---------- */
let courante = null;
async function versionCourante() {
  if (courante) return courante;
  const k = (await caches.keys()).find(n => n.startsWith(P_STATIQUE));
  return courante = k ? k.slice(P_STATIQUE.length) : null;
}
async function aligner(v) { // nouvelle version annoncée par une page : on repart d'un cache neuf
  if (!v || v === await versionCourante()) return false;
  courante = v;
  await caches.open(P_STATIQUE + v);
  await Promise.all((await caches.keys()).filter(n => n.startsWith(P_STATIQUE) && n !== P_STATIQUE + v).map(n => caches.delete(n)));
  return true;
}
const estHTML = r => (r.headers.get("content-type") || "").includes("text/html");

/* ---------- Installation : coquille et scripts de la version en ligne ---------- */
self.addEventListener("install", e => {
  e.waitUntil((async () => {
    try {
      const r = await fetch("/", { cache: "no-store", credentials: "same-origin" });
      if (r.ok && estHTML(r)) {
        const v = r.headers.get("x-bilan-version"), html = await r.clone().text();
        await (await caches.open(C_COQUILLE)).put("/", r);
        if (v) {
          await aligner(v);
          const urls = [...new Set([...html.matchAll(/<script src="(\/[^"]+\.js)"/g)].map(m => m[1]).concat(["/manifest.webmanifest", "/icons/icon-192.png", "/icons/favicon.svg"]))];
          const c = await caches.open(P_STATIQUE + v);
          await Promise.all(urls.map(u => fetch(u, { cache: "no-cache" }).then(x => x.ok ? c.put(u, x) : null).catch(() => null)));
        }
      }
    } catch (x) { } // hors ligne à l'installation : le cache se remplira à la visite suivante
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const garder = n => [C_COQUILLE, C_DONNEES, C_POLICES].includes(n) || n.startsWith(P_STATIQUE);
    await Promise.all((await caches.keys()).filter(n => n.startsWith("bilan-") && !garder(n)).map(n => caches.delete(n)));
    if (self.registration.navigationPreload) { try { await self.registration.navigationPreload.enable(); } catch (x) { } }
    await self.clients.claim();
  })());
});

/* ---------- Requêtes ---------- */
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) {
    if (u.pathname.startsWith("/api/") || u.pathname === "/mcp" || u.pathname.startsWith("/mcp/") || u.pathname === "/sw.js") return; // jamais en cache
    if (req.mode === "navigate") return e.respondWith(navigation(e));
    if (u.pathname.startsWith("/data/")) return e.respondWith(donnees(e));
    if (/\.(js|css|png|svg|ico|webmanifest|woff2?)$/.test(u.pathname)) return e.respondWith(statique(e));
    return;
  }
  if (u.hostname === "fonts.gstatic.com") return e.respondWith(police(e));
  if (u.hostname === "fonts.googleapis.com") return e.respondWith(styleGoogle(e));
});

async function navigation(e) {
  try {
    const r = (await e.preloadResponse) || await fetch(e.request);
    if (r.ok && estHTML(r)) {
      const v = r.headers.get("x-bilan-version");
      if (await aligner(v)) avertir({ type: "bilan-version", version: v });
      const copie = r.clone();
      e.waitUntil(caches.open(C_COQUILLE).then(c => c.put("/", copie)).catch(() => { }));
    }
    return r;
  } catch (x) {
    const c = await caches.match("/", { cacheName: C_COQUILLE });
    return c || horsLigne();
  }
}
async function statique(e) {
  const v = await versionCourante();
  if (!v) return fetch(e.request);
  const c = await caches.open(P_STATIQUE + v), hit = await c.match(e.request);
  const net = fetch(e.request).then(r => { if (r.ok && r.type === "basic" && courante === v) return c.put(e.request, r.clone()).then(() => r); return r; });
  if (hit) { e.waitUntil(net.catch(() => { })); return hit; } // tout de suite depuis le cache, rafraîchi en arrière-plan
  return net;
}
async function donnees(e) {
  const c = await caches.open(C_DONNEES);
  try {
    const r = await fetch(e.request);
    if (r.ok) e.waitUntil(c.put(e.request, r.clone()).then(() => taille(c)).catch(() => { }));
    return r;
  } catch (x) {
    const hit = await c.match(e.request);
    if (hit) return hit;
    throw x;
  }
}
async function taille(c) { const k = await c.keys(); if (k.length > MAX_DONNEES) await Promise.all(k.slice(0, k.length - MAX_DONNEES).map(r => c.delete(r))); }
async function police(e) {
  const c = await caches.open(C_POLICES), hit = await c.match(e.request);
  if (hit) return hit;
  const r = await fetch(e.request);
  if (r.ok && r.type !== "opaque") e.waitUntil(c.put(e.request, r.clone()));
  return r;
}
async function styleGoogle(e) {
  const c = await caches.open(C_POLICES), hit = await c.match(e.request);
  const net = fetch(e.request).then(r => { if (r.ok || r.type === "opaque") e.waitUntil(c.put(e.request, r.clone())); return r; });
  if (hit) { e.waitUntil(net.catch(() => { })); return hit; }
  return net;
}
async function avertir(msg) { for (const c of await self.clients.matchAll({ type: "window" })) c.postMessage(msg); }

function horsLigne() {
  return new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#F8F5EE"><title>Hors ligne · bilan.</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F8F5EE;color:#111214;font:16px/1.5 "IBM Plex Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:24px;box-sizing:border-box}
main{max-width:440px;background:#fff;border:1px solid #E6E0D4;border-radius:16px;padding:28px 26px;box-shadow:0 6px 24px -12px rgba(17,18,20,.12)}
.l{font-weight:700;font-size:24px;letter-spacing:-.02em;margin:0 0 18px}.l i{color:#0E6B4A;font-style:normal}h1{font:800 22px/1.2 Fraunces,Georgia,serif;margin:0 0 8px}p{margin:0 0 16px;color:#55524C}
button{font:inherit;font-weight:600;background:#111214;color:#fff;border:0;border-radius:10px;padding:10px 18px;cursor:pointer}</style></head>
<body><main><p class="l">bilan<i>.</i></p><h1>Vous êtes hors ligne</h1><p>Cette page n'a pas encore été enregistrée sur votre appareil. Les pages déjà ouvertes restent consultables sans connexion, avec les dernières données chargées.</p><button onclick="location.reload()">Réessayer</button></main></body></html>`,
    { status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

/* ---------- Notifications push ---------- */
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { b: e.data ? e.data.text() : "" }; }
  const url = typeof d.u === "string" && d.u.startsWith("/") ? d.u : "/espace/alertes";
  e.waitUntil(self.registration.showNotification(d.t || "bilan.", {
    body: d.b || "Du nouveau sur vos entreprises.", icon: "/icons/icon-192.png", badge: "/icons/badge-96.png", lang: "fr", dir: "ltr",
    tag: d.tag || undefined, renotify: !!d.tag, timestamp: d.ts || Date.now(), data: { url } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/espace/alertes", self.location.origin).href;
  e.waitUntil((async () => {
    const fen = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of fen) if (new URL(c.url).origin === self.location.origin) {
      try { await c.focus(); } catch (x) { }
      try { c.postMessage({ type: "bilan-aller", url }); return; } catch (x) { }
    }
    await self.clients.openWindow(url);
  })());
});
self.addEventListener("pushsubscriptionchange", e => { // le navigateur a renouvelé l'abonnement : on prévient le site
  e.waitUntil((async () => {
    const ancien = e.oldSubscription ? e.oldSubscription.endpoint : null;
    let sub = e.newSubscription;
    if (!sub) {
      const k = await fetch("/api/push/cle").then(r => r.json()).then(j => j.cle).catch(() => null);
      if (!k) return;
      const raw = Uint8Array.from(atob(k.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((k.length + 3) % 4)), c => c.charCodeAt(0));
      sub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: raw });
    }
    await fetch("/api/push/abonnement", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ abonnement: sub.toJSON(), ancien }) });
  })().catch(() => { }));
});
self.addEventListener("message", e => { if (e.data && e.data.type === "bilan-version-sw") e.source && e.source.postMessage({ type: "bilan-version-sw", version: SW_VERSION }); });
