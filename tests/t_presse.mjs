import { normalize, queryFor } from "../cf/src/presse.mjs";
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("ÉCHEC", m); } };
const items = normalize({ articles: [
  { url: "https://a.fr/1", title: "LVMH : les ventes reculent", seendate: "20261028T143000Z", domain: "a.fr", language: "French", sourcecountry: "France" },
  { url: "https://b.fr/1", title: "LVMH : les ventes reculent", seendate: "20261028T150000Z", domain: "b.fr" },
  { url: "", title: "sans lien" },
] });
ok(items.length === 1 && items[0].date === "2026-10-28T14:30:00Z" && items[0].site === "a.fr", "articles " + JSON.stringify(items));
ok(queryFor("Alphabet (Google)").startsWith('"Alphabet" ('), "nom nettoyé " + queryFor("Alphabet (Google)"));
console.log(fails ? fails + " échec(s)" : "presse : tout est bon"); process.exit(fails ? 1 : 0);
