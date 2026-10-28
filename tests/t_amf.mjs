// Vérifie que la lecture des publications AMF tolère plusieurs formes de réponse.
import { normalize } from "../cf/src/amf.mjs";
let bad = 0;
const ok = (c, m) => { if (!c) bad++; console.log(c ? "ok " : "ÉCART", m); };
const a = normalize({ uin_idt_uin: "123", uin_dat_amf: "2026-10-27T18:02:00+00:00", identificationsociete_iso_cd_isi: "FR0000120271", identificationsociete_iso_nom_soc: "TOTALENERGIES SE", informationdeposee_inf_tit_inf: "Résultats du 3e trimestre", subtype_of_information: "Information trimestrielle", url_de_recuperation: "https://www.info-financiere.gouv.fr/x.pdf" });
ok(a.company === "TOTALENERGIES SE", "nom de société");
ok(a.title === "Résultats du 3e trimestre", "titre");
ok(a.url.endsWith(".pdf"), "lien du document");
ok(a.date.startsWith("2026-10-27"), "date");
const b = normalize({ record: { fields: { uin_dat_amf: "2026-10-26", raison_sociale: "LVMH", libelle: "Rachat d'actions" } } });
ok(b.company === "LVMH" && b.title === "Rachat d'actions", "ancien format v2.0");
console.log(bad ? `${bad} écart(s)` : "0 écart"); process.exit(bad ? 1 : 0);
