// Communiqués européens en anglais (4/11/2026) : montants en devises européennes, période, variation, pièges.
import { extractEU, normEU } from "../data/actu_analyse.mjs";
const ok = (c, m) => { if (!c) { console.error("ÉCHEC", m); process.exit(1); } };
let x = extractEU("Net sales in the first quarter amounted to SEK 4,679 million (4,101), representing growth of 14.1 percent.");
ok(x.dev === "SEK" && x.ca.v === 4679e6 && x.ca.q === "trimestre" && Math.abs(x.ca.g - 0.141) < 1e-9, "phrase nordique");
x = extractEU("Revenue for the quarter was MSEK 8,161 (7,644). Net income for the period was SEK 690m (528) in the third quarter.");
ok(x.ca.v === 8161e6 && Math.abs(x.ca.g - (8161 / 7644 - 1)) < 1e-9, "MSEK + an dernier entre parenthèses");
ok(x.net.v === 690e6 && x.net.q === "trimestre", "SEK 690m");
x = extractEU("Total revenues increased by USD 65 million to USD 1,929 million in the quarter.", "3Q26");
ok(x.ca.v === 1929e6, "« increased by … to … » : montant de la période");
x = extractEU("Boliden is a metals company with revenues of SEK 90 billion and 6,000 employees worldwide today.", "Interim report January-September");
ok(!x.ca, "phrase de présentation sans période écartée");
x = extractEU("In the third quarter, profit after tax was impacted by exceptional items of USD 55 million relating to a settlement.");
ok(!x.net, "élément exceptionnel écarté");
x = extractEU("Excluding notable items, total income was £138 million higher than Q2 2026 in the third quarter.");
ok(!x.ca, "écart entre deux trimestres écarté");
ok(normEU("EUR 1.2bn and EUR 300m").dev === "EUR", "devise relevée");
console.log("actu_eu : tout est bon");
