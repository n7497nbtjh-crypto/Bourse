// Éligibilité au PEA : liste des entreprises dont les deux indices du pays du siège se contredisent.
// Indice 1 : le pays du code ISIN (deux premières lettres), en général le pays où la société est immatriculée.
// Indice 2 : le pays de l'entreprise d'après Wikidata (base collaborative, CC0), quand il est renseigné.
// Quand l'un dit « UE/EEE » et l'autre non, le site affiche « à vérifier » au lieu de trancher (règle dans cf/site/m/reco.js).
// Fichier fabriqué par build.mjs à chaque mise en ligne (cf/site/data/pea.json) : ne pas le committer.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

export const EEE_ISIN = ["FR", "DE", "NL", "BE", "LU", "IT", "ES", "PT", "IE", "AT", "FI", "SE", "DK", "NO", "IS", "LI", "PL", "CZ", "GR", "HU", "SK", "SI", "EE", "LV", "LT", "MT", "CY", "HR", "BG", "RO"];
export const EEE_NOMS = ["France", "Allemagne", "Pays-Bas", "Belgique", "Luxembourg", "Italie", "Espagne", "Portugal", "Irlande", "Autriche", "Finlande", "Suède", "Danemark", "Norvège", "Islande", "Liechtenstein", "Pologne", "Tchéquie", "République tchèque", "Grèce", "Hongrie", "Slovaquie", "Slovénie", "Estonie", "Lettonie", "Lituanie", "Malte", "Chypre", "Croatie", "Bulgarie", "Roumanie"];

export function divergences(soc, wd) {
  const E = new Set(EEE_ISIN), N = new Set(EEE_NOMS), out = {};
  for (const c of soc.companies || []) {
    if (c.missing) continue;
    const pays = wd[c.id] && wd[c.id].pays; if (!pays) continue;
    const i = (c.isin || "").slice(0, 2), isinEee = i ? E.has(i) : null, paysEee = N.has(pays);
    if (isinEee === null) { if (paysEee) out[c.id] = { isin: "", pays }; continue; } // pas d'ISIN mais siège européen d'après Wikidata
    if (isinEee !== paysEee) out[c.id] = { isin: i, pays };
  }
  return out;
}

export function pea(dir = "cf/site/data", out = "cf/site/data/pea.json") {
  if (!existsSync(`${dir}/societes.json`) || !existsSync(`${dir}/wikidata.json`)) return 0;
  const soc = JSON.parse(readFileSync(`${dir}/societes.json`, "utf8")), W = JSON.parse(readFileSync(`${dir}/wikidata.json`, "utf8"));
  const d = divergences(soc, W.items || {});
  writeFileSync(out, JSON.stringify({ maj: W.updated || null, source: "Pays du code ISIN (societes.json) et pays de l'entreprise d'après Wikidata (CC0)", divergences: d }));
  return Object.keys(d).length;
}
