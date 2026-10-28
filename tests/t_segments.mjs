import { extractSegments, bestSegments, humanize } from "../data/esef.mjs";
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("ÉCHEC", m); } };
const P = "2025-01-01T00:00:00/2026-01-01T00:00:00", P0 = "2024-01-01T00:00:00/2025-01-01T00:00:00";
const f = (concept, v, dims = {}, period = P) => ({ value: String(v), dimensions: { concept, entity: "x", period, unit: "iso4217:EUR", ...dims } });
const doc = { facts: Object.fromEntries([
  f("ifrs-full:Revenue", 100e6),
  f("ifrs-full:Revenue", 60e6, { "ifrs-full:SegmentsAxis": "mc:FashionAndLeatherGoodsMember" }),
  f("ifrs-full:Revenue", 40e6, { "ifrs-full:SegmentsAxis": "mc:WinesAndSpiritsMember" }),
  f("ifrs-full:Revenue", 35e6, { "ifrs-full:SegmentsAxis": "mc:WinesAndSpiritsMember" }, P0),
  f("ifrs-full:Revenue", -5e6, { "ifrs-full:SegmentsAxis": "mc:EliminationsMember" }),
  f("ifrs-full:ProfitLossFromOperatingActivities", 20e6, { "ifrs-full:SegmentsAxis": "mc:FashionAndLeatherGoodsMember", "ifrs-full:ConsolidationItemsAxis": "ifrs-full:OperatingSegmentsMember" }),
  f("ifrs-full:Revenue", 30e6, { "ifrs-full:GeographicalAreasAxis": "mc:AsiaMember" }),
  f("ifrs-full:Revenue", 70e6, { "ifrs-full:GeographicalAreasAxis": "mc:EuropeAndUSMember" }),
  f("ifrs-full:Revenue", 9e6, { "ifrs-full:SegmentsAxis": "mc:FashionAndLeatherGoodsMember", "ifrs-full:GeographicalAreasAxis": "mc:AsiaMember" }),
].map((x, i) => [i, x])) };
const s = bestSegments([extractSegments(doc)], { 2025: 100 });
ok(humanize("mc:FashionAndLeatherGoodsMember") === "Fashion And Leather Goods", "nom lisible " + humanize("mc:FashionAndLeatherGoodsMember"));
ok(s.activites && s.activites.items.length === 2 && s.activites.items[0].ca === 60 && s.activites.items[0].ebit === 20, "activités " + JSON.stringify(s.activites));
ok(s.activites.items[1].prev === 35, "année précédente");
ok(s.geo && s.geo.items.length === 2 && s.geo.items[0].name === "Europe And US", "zones " + JSON.stringify(s.geo));
console.log(fails ? fails + " échec(s)" : "ventilations : tout est bon"); process.exit(fails ? 1 : 0);
