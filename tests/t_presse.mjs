import presse, { normalize, queryFor } from "../cf/src/presse.mjs";
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("ÉCHEC", m); } };
const items = normalize({ articles: [
  { url: "https://a.fr/1", title: "LVMH : les ventes reculent", seendate: "20261028T143000Z", domain: "a.fr", language: "French", sourcecountry: "France" },
  { url: "https://b.fr/1", title: "LVMH : les ventes reculent", seendate: "20261028T150000Z", domain: "b.fr" },
  { url: "", title: "sans lien" },
] });
ok(items.length === 1 && items[0].date === "2026-10-28T14:30:00Z" && items[0].site === "a.fr", "articles " + JSON.stringify(items));
ok(queryFor("Alphabet (Google)").startsWith('"Alphabet" ('), "nom nettoyé " + queryFor("Alphabet (Google)"));
// GDELT renvoie un 429 en texte brut : la route doit répondre un JSON lisible avec une liste vide (plus de « Chargement… » sans fin)
const idx = [{ id: "lvmh", name: "LVMH" }];
const r429 = await presse(new Request("https://t.local/api/presse?id=lvmh"), idx, async () => new Response("Please limit requests to one every 5 seconds", { status: 429 }));
const j429 = await r429.json(); ok(r429.status === 200 && Array.isArray(j429.items) && !j429.items.length && j429.error, "429 " + JSON.stringify(j429));
const lent = await presse(new Request("https://t.local/api/presse?id=lvmh"), idx, (u, o) => new Promise((res, rej) => o.signal.addEventListener("abort", () => rej(new Error("abort")))));
ok((await lent.json()).items.length === 0, "délai maximal");
const bon = await presse(new Request("https://t.local/api/presse?sujet=marches"), idx, async () => new Response(JSON.stringify({ articles: [{ url: "https://a.fr/2", title: "Les marchés", seendate: "20261028T143000Z", domain: "a.fr" }] })));
ok((await bon.json()).items.length === 1, "réponse valide");
console.log(fails ? fails + " échec(s)" : "presse : tout est bon"); process.exit(fails ? 1 : 0);
