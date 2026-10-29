// Notifications push : chiffrement aes128gcm (vecteur de test de la RFC 8291), jeton VAPID ES256 (RFC 8292),
// clés créées par le Worker, abonnements, envoi groupé après la tâche du soir, nettoyage des abonnements expirés.
// Base SQLite en mémoire (comme D1), services de push simulés : chaque message envoyé est déchiffré comme le ferait le navigateur.
import { DatabaseSync } from "node:sqlite";
import { chiffrer, jetonVapid, b64u, unb64u, push, pousser, _envoi, endpointOk, message, categorie } from "../cf/src/push.mjs";
import { espace } from "../cf/src/espace.mjs";
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("ÉCHEC", m); } };
const TE = s => new TextEncoder().encode(s), TD = u => new TextDecoder().decode(u);
const concat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
const S = crypto.subtle;

/* ---------- 1. RFC 8291, section 5 : exemple complet ---------- */
const V = {
  clair: "When I grow up, I want to be a watermelon",
  as_public: "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  as_private: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  ua_public: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  ua_private: "q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94",
  salt: "DGv6ra1nlYgDCS1FRnbzlw",
  auth: "BTBZMqHH6r4Tts7J_aSIgg",
  message: "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN",
};
const jwkDe = (pub, d) => { const p = unb64u(pub); return { kty: "EC", crv: "P-256", x: b64u(p.slice(1, 33)), y: b64u(p.slice(33, 65)), d }; };
const asKeys = { publicKey: await S.importKey("raw", unb64u(V.as_public), { name: "ECDH", namedCurve: "P-256" }, true, []),
  privateKey: await S.importKey("jwk", jwkDe(V.as_public, V.as_private), { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]) };
const corps = await chiffrer(V.ua_public, V.auth, V.clair, { salt: unb64u(V.salt), cles: asKeys });
ok(b64u(corps) === V.message, "RFC 8291 : message chiffré identique à l'exemple de la RFC\n  obtenu  " + b64u(corps) + "\n  attendu " + V.message);

// Déchiffrement côté navigateur (RFC 8291 section 3.4, RFC 8188 section 2), pour vérifier les messages envoyés plus bas
async function dechiffrer(body, uaPriv, uaPub, auth) {
  const salt = body.slice(0, 16), rs = new DataView(body.buffer, body.byteOffset).getUint32(16), idlen = body[20], asPub = body.slice(21, 21 + idlen), ct = body.slice(21 + idlen);
  const asKey = await S.importKey("raw", asPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await S.deriveBits({ name: "ECDH", public: asKey }, uaPriv, 256));
  const hk = async (s, ikm, info, n) => new Uint8Array(await S.deriveBits({ name: "HKDF", hash: "SHA-256", salt: s, info }, await S.importKey("raw", ikm, "HKDF", false, ["deriveBits"]), n * 8));
  const ikm = await hk(auth, ecdh, concat(TE("WebPush: info\0"), uaPub, asPub), 32);
  const cek = await hk(salt, ikm, TE("Content-Encoding: aes128gcm\0"), 16), nonce = await hk(salt, ikm, TE("Content-Encoding: nonce\0"), 12);
  const pt = new Uint8Array(await S.decrypt({ name: "AES-GCM", iv: nonce }, await S.importKey("raw", cek, "AES-GCM", false, ["decrypt"]), ct));
  let end = pt.length - 1; while (end >= 0 && pt[end] === 0) end--;
  if (pt[end] !== 2) throw new Error("délimiteur absent");
  return { rs, idlen, texte: TD(pt.slice(0, end)) };
}
const uaPrivRfc = await S.importKey("jwk", jwkDe(V.ua_public, V.ua_private), { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
const d0 = await dechiffrer(unb64u(V.message), uaPrivRfc, unb64u(V.ua_public), unb64u(V.auth));
ok(d0.texte === V.clair && d0.rs === 4096 && d0.idlen === 65, "RFC 8291 : l'exemple de la RFC se déchiffre");

// Un appareil simulé : ses clés comme celles que fournit PushManager.subscribe()
async function appareil() {
  const k = await S.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const pub = new Uint8Array(await S.exportKey("raw", k.publicKey)), auth = crypto.getRandomValues(new Uint8Array(16));
  return { k, pub, auth, keys: { p256dh: b64u(pub), auth: b64u(auth) } };
}
const ap0 = await appareil();
const c1 = await chiffrer(ap0.keys.p256dh, ap0.keys.auth, "Bonjour é ✓"), c2 = await chiffrer(ap0.keys.p256dh, ap0.keys.auth, "Bonjour é ✓");
ok((await dechiffrer(c1, ap0.k.privateKey, ap0.pub, ap0.auth)).texte === "Bonjour é ✓", "aller-retour avec des clés tirées au hasard");
ok(b64u(c1) !== b64u(c2) && b64u(c1.slice(0, 16)) !== b64u(c2.slice(0, 16)) && b64u(c1.slice(21, 86)) !== b64u(c2.slice(21, 86)), "sel et clé éphémère nouveaux à chaque message");
let jete = false; try { await chiffrer(ap0.keys.p256dh, ap0.keys.auth, "x".repeat(3801)); } catch (e) { jete = true; } ok(jete, "message trop long refusé");
jete = false; try { await chiffrer("AAAA", ap0.keys.auth, "x"); } catch (e) { jete = true; } ok(jete, "clé p256dh invalide refusée");

/* ---------- 2. RFC 8292 : jeton VAPID ES256 ---------- */
const vk = await S.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const jwt = await jetonVapid(vk.privateKey, "https://fcm.googleapis.com", "https://bilan.example", 1900000000);
const [h, c, s] = jwt.split(".");
ok(JSON.stringify(JSON.parse(TD(unb64u(h)))) === '{"typ":"JWT","alg":"ES256"}' && JSON.parse(TD(unb64u(c))).aud === "https://fcm.googleapis.com" && JSON.parse(TD(unb64u(c))).exp === 1900000000 && JSON.parse(TD(unb64u(c))).sub === "https://bilan.example", "JWT : en-tête et revendications");
ok(unb64u(s).length === 64 && await S.verify({ name: "ECDSA", hash: "SHA-256" }, vk.publicKey, unb64u(s), TE(h + "." + c)), "JWT : signature ES256 (r||s) vérifiée avec la clé publique");
ok(!/[+/=]/.test(jwt), "JWT en base64url sans remplissage");

/* ---------- 3. Messages affichés ---------- */
ok(categorie({ type: "agenda", texte: "TotalEnergies : demain, Détachement du dividende." }) === "dividendes" && categorie({ type: "agenda", texte: "LVMH : demain, Assemblée générale." }) === "annonces" && categorie({ type: "resultats" }) === "annonces" && categorie({ type: "mouvement" }) === "mouvements" && categorie({ type: "bilan" }) === "bilan", "catégories");
let mm = message([{ id: 7, type: "mouvement", texte: "LVMH : +6,0 % aujourd'hui. Un mouvement de cette taille suit souvent une annonce : regardez son actualité.", lien: "/entreprise/lvmh", at: 1 }]);
ok(mm.t === "LVMH · mouvement du jour" && mm.b.startsWith("+6,0 % aujourd'hui") && mm.u === "/entreprise/lvmh" && mm.tag === "bilan-7", "message d'un mouvement " + JSON.stringify(mm));
mm = message([{ id: 1, type: "annonce", texte: "A : x", at: 1 }, { id: 2, type: "mouvement", texte: "B : y", at: 2 }]);
ok(mm.t === "2 nouvelles alertes sur vos entreprises" && mm.u === "/espace/alertes" && mm.b === "A : x B : y", "messages regroupés " + JSON.stringify(mm));
ok(endpointOk("https://fcm.googleapis.com/fcm/send/abc") && endpointOk("https://web.push.apple.com/QGx") && endpointOk("https://updates.push.services.mozilla.com/wpush/v2/x") && endpointOk("https://wns2-par02p.notify.windows.com/w/?token=x"), "services de push reconnus");
ok(!endpointOk("http://fcm.googleapis.com/x") && !endpointOk("https://evil.example/x") && !endpointOk("https://fcm.googleapis.com.evil.example/x") && !endpointOk("https://fcm.googleapis.com:8443/x") && !endpointOk("https://u:p@fcm.googleapis.com/x") && !endpointOk(42), "adresses quelconques refusées");

/* ---------- 4. Routes et envoi, base en mémoire ---------- */
const sql = new DatabaseSync(":memory:");
const stmt = (q, p = []) => ({ bind: (...a) => stmt(q, a), all: async () => ({ results: sql.prepare(q).all(...p) }), first: async () => sql.prepare(q).get(...p) ?? null, run: async () => ({ meta: { changes: Number(sql.prepare(q).run(...p).changes) } }) });
const env = { DB: { prepare: q => stmt(q) }, HASH_SALT: "sel-test", SITE_URL: "https://bilan.example" };
const req = (method, path, body, h = {}) => new Request("https://t.local" + path, { method, headers: { "content-type": "application/json", "cf-connecting-ip": "1.1.1.1", ...h }, body: body ? JSON.stringify(body) : undefined });
const P = async (method, path, body, cookie, h = {}) => { const r = await push(req(method, path, body, cookie ? { cookie, ...h } : h), env); return [r.status, await r.json()]; };
const inscrire = async email => { const r = await espace(req("POST", "/api/espace/inscription", { email, motdepasse: "motdepasse-solide" }, { "cf-connecting-ip": email }), env); return r.headers.get("set-cookie").split(";")[0]; };

let [st, j] = await P("GET", "/api/push/cle");
ok(st === 200 && unb64u(j.cle).length === 65 && unb64u(j.cle)[0] === 4, "clé publique VAPID créée au premier besoin " + JSON.stringify(j));
const cle1 = j.cle; [st, j] = await P("GET", "/api/push/cle"); ok(j.cle === cle1, "la même clé ensuite");
const vrow = sql.prepare("SELECT * FROM push_vapid").all();
ok(vrow.length === 1 && JSON.parse(vrow[0].prive).d && !JSON.stringify(j).includes(JSON.parse(vrow[0].prive).d), "une seule paire, la clé privée reste dans la base");

const A = await inscrire("a@ex.fr"), B = await inscrire("b@ex.fr");
const apA = await appareil(), apA2 = await appareil(), apB = await appareil();
const EA = "https://fcm.googleapis.com/fcm/send/appareil-a", EA2 = "https://updates.push.services.mozilla.com/wpush/v2/appareil-a2", EB = "https://web.push.apple.com/appareil-b";
[st] = await P("POST", "/api/push/abonnement", { abonnement: { endpoint: EA, keys: apA.keys } }); ok(st === 401, "abonnement : connexion requise " + st);
[st] = await P("POST", "/api/push/abonnement", { abonnement: { endpoint: "https://evil.example/x", keys: apA.keys } }, A); ok(st === 400, "service inconnu refusé");
[st] = await P("POST", "/api/push/abonnement", { abonnement: { endpoint: EA, keys: { p256dh: "abc", auth: apA.keys.auth } } }, A); ok(st === 400, "clé invalide refusée");
[st] = await P("POST", "/api/push/abonnement", { abonnement: { endpoint: EA, keys: apA.keys } }, A, { origin: "https://autre-site.example" }); ok(st === 403, "autre origine refusée");
[st, j] = await P("POST", "/api/push/abonnement", { abonnement: { endpoint: EA, keys: apA.keys }, choix: { mouvements: false } }, A, { "user-agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36" });
ok(st === 200 && j.choix.mouvements === false && j.choix.annonces === true && j.choix.dividendes === true && j.choix.bilan === true, "abonnement enregistré " + JSON.stringify(j));
ok(sql.prepare("SELECT appareil FROM push_abonnements WHERE endpoint = ?").get(EA).appareil === "Chrome sur Android", "appareil reconnu");
[st, j] = await P("POST", "/api/push/abonnement", { abonnement: { endpoint: EA2, keys: apA2.keys }, choix: { annonces: false, dividendes: false, mouvements: true, bilan: false } }, A); ok(st === 200, "second appareil");
[st, j] = await P("POST", "/api/push/abonnement", { abonnement: { endpoint: EB, keys: apB.keys } }, B); ok(st === 200, "appareil du compte B");
[st, j] = await P("POST", "/api/push/etat", { endpoint: EA }, A); ok(j.abonne === true && j.choix.mouvements === false, "état de l'appareil " + JSON.stringify(j));
[st, j] = await P("POST", "/api/push/etat", { endpoint: EA }, B); ok(j.abonne === false && j.autre_compte === true, "appareil d'un autre compte");
[st, j] = await P("POST", "/api/push/etat", { endpoint: "https://fcm.googleapis.com/fcm/send/inconnu" }, A); ok(j.abonne === false, "appareil inconnu");
// Changement de choix sans tout renvoyer : les autres choix restent
[st, j] = await P("POST", "/api/push/abonnement", { abonnement: { endpoint: EA, keys: apA.keys }, choix: { bilan: false } }, A); ok(j.choix.mouvements === false && j.choix.bilan === false && j.choix.annonces === true, "choix modifiés un par un " + JSON.stringify(j));
[st, j] = await P("POST", "/api/push/abonnement", { abonnement: { endpoint: EA, keys: apA.keys }, choix: { bilan: true } }, A);

// Envoi : services de push simulés
let envoyes = [], statut = () => 201;
_envoi(async (u, o) => { envoyes.push({ u, o }); return new Response(null, { status: statut(u) }); });
const cid = e => sql.prepare("SELECT id FROM comptes WHERE email = ?").get(e).id, idA = cid("a@ex.fr"), idB = cid("b@ex.fr");
const now = Date.now();
const notif = (compte, type, texte, lien, at = now) => sql.prepare("INSERT INTO notifs (compte, at, type, texte, lien, cle) VALUES (?, ?, ?, ?, ?, ?)").run(compte, at, type, texte, lien, type + texte + at).lastInsertRowid;
notif(idA, "annonce", "LVMH : Chiffre d'affaires trimestriel. Ventes : 19,1 Md€ (+2 %).", "/entreprise/lvmh/actualite");
notif(idA, "mouvement", "Nvidia : +6,1 % aujourd'hui. Un mouvement de cette taille suit souvent une annonce : regardez son actualité.", "/entreprise/nvidia");
notif(idA, "annonce", "Vieille annonce : rien.", "/entreprise/x", now - 3 * 864e5); // trop vieille : jamais poussée
notif(idB, "agenda", "TotalEnergies : demain, Détachement du 2e acompte sur dividende.", "/entreprise/totalenergies/agenda");
let r = await pousser(env, { origin: "https://t.local", budget: 0 });
ok(r.reste === true && envoyes.length === 0, "budget nul : rien n'est envoyé, il en reste " + JSON.stringify(r));
r = await pousser(env, { origin: "https://t.local", budget: 30 });
ok(r.envoyes === 3 && r.reste === false && envoyes.length === 3, "trois appareils prévenus " + JSON.stringify(r));
const de = async (e, ap) => { const x = envoyes.find(z => z.u === e); return x ? JSON.parse((await dechiffrer(new Uint8Array(x.o.body), ap.k.privateKey, ap.pub, ap.auth)).texte) : null; };
const mA = await de(EA, apA), mA2 = await de(EA2, apA2), mB = await de(EB, apB);
ok(mA && mA.t === "LVMH · nouvelle publication" && mA.b.includes("19,1 Md€") && mA.u === "/entreprise/lvmh/actualite", "appareil A : l'annonce seulement (mouvements désactivés) " + JSON.stringify(mA));
ok(mA2 && mA2.t === "Nvidia · mouvement du jour" && mA2.u === "/entreprise/nvidia", "appareil A2 : le mouvement seulement " + JSON.stringify(mA2));
ok(mB && mB.t === "TotalEnergies · dividende demain" && /acompte/.test(mB.b), "appareil B : le dividende " + JSON.stringify(mB));
const x0 = envoyes[0].o.headers;
ok(x0["content-encoding"] === "aes128gcm" && x0.ttl === "43200" && /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]{87}$/.test(x0.authorization) && x0.authorization.endsWith("k=" + cle1), "en-têtes Web Push " + x0.authorization.slice(0, 40));
const jw = x0.authorization.match(/t=([^,]+)/)[1].split("."), cl = JSON.parse(TD(unb64u(jw[1])));
const pubV = await S.importKey("raw", unb64u(cle1), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
ok(await S.verify({ name: "ECDSA", hash: "SHA-256" }, pubV, unb64u(jw[2]), TE(jw[0] + "." + jw[1])), "jeton signé par la clé gardée dans la base");
ok(cl.sub === "https://bilan.example" && cl.exp > now / 1000 && cl.exp <= now / 1000 + 24 * 3600 && ["https://fcm.googleapis.com", "https://updates.push.services.mozilla.com", "https://web.push.apple.com"].includes(cl.aud), "revendications du jeton " + JSON.stringify(cl));
envoyes = []; r = await pousser(env, { origin: "https://t.local", budget: 30 }); ok(r.envoyes === 0 && envoyes.length === 0, "rien n'est envoyé deux fois");

// Plusieurs alertes d'un coup : un seul message ; abonnement expiré (410) supprimé
notif(idA, "annonce", "Hermès : Résultats semestriels.", "/entreprise/hermes/actualite");
notif(idA, "resultats", "Kering : demain, Résultats du 3e trimestre.", "/entreprise/kering/agenda");
notif(idB, "bilan", "Votre bilan de la semaine est prêt.", "/espace");
statut = u => u === EB ? 410 : 201; envoyes = [];
r = await pousser(env, { origin: "https://t.local", budget: 30 });
const mA3 = await de(EA, apA);
ok(mA3 && mA3.t === "2 nouvelles alertes sur vos entreprises" && mA3.u === "/espace/alertes" && /Hermès/.test(mA3.b) && /Kering/.test(mA3.b), "alertes regroupées " + JSON.stringify(mA3));
ok(!envoyes.find(z => z.u === EA2), "appareil A2 : rien (annonces désactivées)");
ok(r.supprimes === 1 && !sql.prepare("SELECT 1 FROM push_abonnements WHERE endpoint = ?").get(EB), "abonnement expiré (410) supprimé " + JSON.stringify(r));
ok(envoyes.find(z => z.u === EB).o.headers.ttl === "172800", "bilan de la semaine : gardé deux jours par le service");
// Erreurs répétées : supprimé au 5e échec
statut = () => 500;
for (let i = 0; i < 5; i++) { notif(idA, "annonce", "Air Liquide : publication " + i + ".", "/entreprise/air-liquide/actualite", now + i + 1); await pousser(env, { origin: "https://t.local", budget: 30 }); }
ok(!sql.prepare("SELECT 1 FROM push_abonnements WHERE endpoint = ?").get(EA), "5 échecs de suite : abonnement supprimé");
ok(sql.prepare("SELECT 1 FROM push_abonnements WHERE endpoint = ?").get(EA2), "l'autre appareil reste");

// Abonnement pris après une alerte : l'alerte n'est pas poussée ; budget limité : la suite au prochain appel
statut = () => 201;
const n1 = notif(idB, "annonce", "Danone : publication ancienne.", "/entreprise/danone/actualite", now - 36e5);
[st] = await P("POST", "/api/push/abonnement", { abonnement: { endpoint: EB, keys: apB.keys } }, B);
envoyes = []; r = await pousser(env, { origin: "https://t.local", budget: 30 }); ok(envoyes.length === 0, "alertes d'avant l'abonnement non poussées");
const C = await inscrire("c@ex.fr"), apC = await appareil(), EC = "https://fcm.googleapis.com/fcm/send/appareil-c";
await P("POST", "/api/push/abonnement", { abonnement: { endpoint: EC, keys: apC.keys } }, C);
notif(idB, "annonce", "Orange : résultats.", "/entreprise/orange/actualite", now + 100); notif(cid("c@ex.fr"), "annonce", "Sanofi : résultats.", "/entreprise/sanofi/actualite", now + 100);
envoyes = []; r = await pousser(env, { origin: "https://t.local", budget: 1 });
ok(r.envoyes === 1 && r.reste === true, "budget de 1 : un envoi, il en reste " + JSON.stringify(r));
r = await pousser(env, { origin: "https://t.local", budget: 1 }); ok(r.envoyes === 1 && r.reste === false && envoyes.length === 2 && new Set(envoyes.map(z => z.u)).size === 2, "la suite au second appel " + JSON.stringify(r));

// Renouvellement par le navigateur (pushsubscriptionchange) : sans cookie, l'ancien abonnement suffit
const apC2 = await appareil(), EC2 = "https://fcm.googleapis.com/fcm/send/appareil-c-nouveau";
[st, j] = await P("POST", "/api/push/abonnement", { abonnement: { endpoint: EC2, keys: apC2.keys }, ancien: EC });
ok(st === 200 && sql.prepare("SELECT compte FROM push_abonnements WHERE endpoint = ?").get(EC2).compte === cid("c@ex.fr") && !sql.prepare("SELECT 1 FROM push_abonnements WHERE endpoint = ?").get(EC), "abonnement renouvelé sans cookie " + st);
[st] = await P("POST", "/api/push/abonnement", { abonnement: { endpoint: "https://fcm.googleapis.com/fcm/send/pirate", keys: apC2.keys }, ancien: "https://fcm.googleapis.com/fcm/send/inexistant" }); ok(st === 401, "ancien abonnement inconnu : refusé");

// Essai
[st, j] = await P("POST", "/api/push/essai", { endpoint: EA2 }); ok(st === 401, "essai : connexion requise");
[st, j] = await P("POST", "/api/push/essai", { endpoint: EB }, A); ok(st === 404, "essai : appareil d'un autre compte");
envoyes = []; [st, j] = await P("POST", "/api/push/essai", { endpoint: EA2 }, A); const me = await de(EA2, apA2);
ok(st === 200 && j.ok && me && /essai/.test(me.t), "notification d'essai " + JSON.stringify(j));
[st] = await P("POST", "/api/push/essai", { endpoint: EA2 }, A); ok(st === 429, "un essai par minute au plus");

// Désabonnement, ménage des comptes supprimés
[st] = await P("POST", "/api/push/desabonnement", { endpoint: EA2 }); ok(st === 200 && !sql.prepare("SELECT 1 FROM push_abonnements WHERE endpoint = ?").get(EA2), "désabonnement");
sql.prepare("DELETE FROM comptes WHERE email = 'c@ex.fr'").run();
await pousser(env, { origin: "https://t.local", budget: 30 });
ok(!sql.prepare("SELECT 1 FROM push_abonnements WHERE endpoint = ?").get(EC2), "appareils d'un compte supprimé effacés au ménage");
[st] = await P("GET", "/api/push/autre"); ok(st === 404, "route inconnue");

// Tâche du soir par le Worker construit : l'espace d'abord, les envois dans l'appel suivant, « reste » tant qu'il y a à faire
const { default: W } = await import("../cf/site/_worker.js");
globalThis.caches = { default: { match: async () => new Response(JSON.stringify({ items: {} })), put: async () => { } } };
const envW = { ...env, ADMIN_KEY: "cle-test", ASSETS: { fetch: async () => new Response("{}") } };
const T = async () => { const r = await W.fetch(new Request("https://t.local/api/espace/tache", { method: "POST", headers: { "x-admin-key": "cle-test" } }), envW, {}); return [r.status, await r.json()]; };
let [ts, tj] = await (async () => { const r = await W.fetch(new Request("https://t.local/api/espace/tache", { method: "POST" }), envW, {}); return [r.status, await r.json()]; })();
ok(ts === 403 && !tj.push, "tâche sans clé : refusée, rien n'est envoyé");
const Dn = await inscrire("d@ex.fr"), apD = await appareil(), ED = "https://fcm.googleapis.com/fcm/send/appareil-d";
await P("POST", "/api/push/abonnement", { abonnement: { endpoint: ED, keys: apD.keys } }, Dn);
notif(cid("d@ex.fr"), "annonce", "Engie : résultats.", "/entreprise/engie/actualite", now + 200);
statut = () => 201; envoyes = [];
const vraiFetch = globalThis.fetch; // le Worker construit a sa propre copie de push.mjs : on simule le service au niveau de fetch
globalThis.fetch = async (u, o) => endpointOk(String(u)) ? (envoyes.push({ u: String(u), o }), new Response(null, { status: 201 })) : vraiFetch(u, o);
[ts, tj] = await T(); ok(ts === 200 && tj.traites >= 1 && tj.push && tj.push.envoyes === 0 && tj.reste >= 1, "appel 1 : l'espace travaille, l'envoi attend " + JSON.stringify(tj));
let n = 0; while (tj.reste && n++ < 10) [ts, tj] = await T();
ok(envoyes.some(z => z.u === ED) && tj.reste === 0, "appels suivants : notification envoyée, plus rien à faire " + JSON.stringify(tj));
ok((await push(req("GET", "/api/push/cle"), {})).status === 503, "sans base : indisponible");

console.log(fails ? `push : ${fails} échec(s)` : "push : tout est bon"); process.exit(fails ? 1 : 0);
