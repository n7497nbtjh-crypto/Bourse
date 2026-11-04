// Comptes lus dans un rapport annuel PDF (4/11/2026) : colonnes alignées sur les années, séparateurs suisses, part du groupe, pages trimestrielles écartées.
import { lireComptesPdf, robots, nombre } from "../data/rapports_site.mjs";
const ok = (c, m) => { if (!c) { console.error("ÉCHEC", m); process.exit(1); } };
const page = `Group Annual Report 2025 – Consolidated income statement

Consolidated income statement
January 1 – December 31
millions of CHF                                                         Notes        2025       2024
Sales                                                                    2, 18     3’555.4    3’530.6
Cost of goods sold                                                                –2’332.1   –2’347.4
Operating income (EBIT)                                                             433.1      382.5
Net income                                                                          294.7      265.4
– thereof attributable to shareholders of Example Ltd                               292.8      261.9
Basic earnings per share                                                   23        8.68       7.73
`;
const doc = Array.from({ length: 40 }, (_, i) => i === 10 ? page : "Page " + i + " December 31 December 31 December 31").join("\f");
const r = lireComptesPdf(doc);
ok(r.ok && r.currency === "CHF" && r.fyEnd === "12-31", "société reconnue");
ok(Math.abs(r.years[2025].ca - 3555.4) < 1e-6 && Math.abs(r.years[2024].ca - 3530.6) < 1e-6, "séparateur ’ et colonnes");
ok(Math.abs(r.years[2025].net - 292.8) < 1e-6, "part du groupe");
ok(r.years[2025].eps === 8.68, "bénéfice par action");
const multi = page.replace("Notes        2025       2024", "Note    2025    2024    2023").replace("3’555.4    3’530.6", "3’555.4    3’530.6    3’100.0");
ok(lireComptesPdf(Array.from({ length: 40 }, (_, i) => i === 10 ? multi : "x").join("\f")).years[2025] != null, "trois colonnes");
const trim = page.replace("Consolidated income statement\nJanuary 1", "Consolidated income statement Q3 2025\nJanuary 1");
ok(!lireComptesPdf(Array.from({ length: 40 }, (_, i) => i === 10 ? trim : "x").join("\f")).ok, "compte trimestriel écarté");
ok(!lireComptesPdf(page).ok, "document trop court écarté");
ok(nombre("(1,234)") === -1234 && nombre("1.234,5", true) === 1234.5 && nombre("–2’332.1") === -2332.1, "nombres");
const rb = robots("User-agent: *\nDisallow: /private/\nAllow: /private/ok\n");
ok(rb.ok("/investors") && !rb.ok("/private/x") && rb.ok("/private/ok"), "robots.txt");
console.log("rapports_site : tout est bon");
