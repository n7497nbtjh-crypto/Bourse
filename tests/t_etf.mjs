import { parseNport, summarize } from "../data/etf_fetch.mjs";
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("ÉCHEC", m); } };
const xml = `<edgarSubmission><formData><genInfo><repPdEnd>2026-12-31</repPdEnd><repPdDate>2026-09-30</repPdDate></genInfo><fundInfo><netAssets>1000</netAssets></fundInfo>
<invstOrSecs><invstOrSec><name>APPLE INC</name><title>Apple Inc</title><cusip>037833100</cusip><identifiers><isin value="US0378331005"/></identifiers><valUSD>50</valUSD><pctVal>5.0</pctVal><assetCat>EC</assetCat><invCountry>US</invCountry></invstOrSec>
<invstOrSec><name>NESTLE SA &amp; CO</name><cusip>000</cusip><identifiers><isin value="CH0038863350"/></identifiers><valUSD>20</valUSD><pctVal>2.0</pctVal><assetCat>EC</assetCat><invCountry>CH</invCountry></invstOrSec>
<invstOrSec><name>USD CASH</name><pctVal>-0.1</pctVal><invCountry>US</invCountry></invstOrSec></invstOrSecs></formData></edgarSubmission>`;
const s = summarize(parseNport(xml));
ok(s.asOf === "2026-09-30" && s.lines === 2, "date et lignes " + JSON.stringify(s));
ok(s.top[0].name === "APPLE INC" && s.top[1].name === "NESTLE SA & CO" && s.top[0].isin === "US0378331005", "lignes principales");
ok(s.countries[0][0] === "US" && s.countries[0][1] === 5, "pays");
console.log(fails ? fails + " échec(s)" : "etf : tout est bon"); process.exit(fails ? 1 : 0);
