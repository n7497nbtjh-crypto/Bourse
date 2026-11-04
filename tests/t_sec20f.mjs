// Lecture directe d'une instance XBRL de rapport 20-F (4/11/2026) : contextes sans dimension, unités, montants par action.
import { instanceIfrs } from "../data/sec.mjs";
const xml = `<xbrl><context id="a"><entity><identifier>1</identifier></entity><period><startDate>2025-01-01</startDate><endDate>2025-12-31</endDate></period></context>
<context id="b"><entity><identifier>1</identifier><segment><xbrldi:explicitMember dimension="x">y</xbrldi:explicitMember></segment></entity><period><startDate>2025-01-01</startDate><endDate>2025-12-31</endDate></period></context>
<context id="i"><entity><identifier>1</identifier></entity><period><instant>2025-12-31</instant></period></context>
<unit id="twd"><measure>iso4217:TWD</measure></unit><unit id="ps"><divide><unitNumerator><measure>iso4217:TWD</measure></unitNumerator><unitDenominator><measure>xbrli:shares</measure></unitDenominator></divide></unit>
<ifrs-full:Revenue contextRef="a" unitRef="twd" decimals="-5">1000000</ifrs-full:Revenue>
<ifrs-full:Revenue contextRef="b" unitRef="twd" decimals="-5">400000</ifrs-full:Revenue>
<ifrs-full:BasicEarningsLossPerShare contextRef="a" unitRef="ps">12.5</ifrs-full:BasicEarningsLossPerShare>
<ifrs-full:CashAndCashEquivalents contextRef="i" unitRef="twd">300</ifrs-full:CashAndCashEquivalents>
<ifrs-full:Goodwill contextRef="i" unitRef="twd">9</ifrs-full:Goodwill></xbrl>`;
const F = instanceIfrs(xml, "2026-04-16");
const ok = (c, m) => { if (!c) { console.error("ÉCHEC", m); process.exit(1); } };
ok(F.Revenue.units.TWD.length === 1 && F.Revenue.units.TWD[0].val === 1e6, "ventes du groupe seules (segment écarté)");
ok(F.Revenue.units.TWD[0].form === "20-F" && F.Revenue.units.TWD[0].filed === "2026-04-16", "forme et date de dépôt");
ok(F.BasicEarningsLossPerShare.units["TWD/shares"][0].val === 12.5, "montant par action");
ok(F.CashAndCashEquivalents.units.TWD[0].end === "2025-12-31" && !F.CashAndCashEquivalents.units.TWD[0].start, "instant");
ok(!F.Goodwill, "concept inutile écarté");
console.log("sec20f : tout est bon");
