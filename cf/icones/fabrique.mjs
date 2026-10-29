// Fabrique les icônes de l'application à partir du logo texte « bilan. » (IBM Plex Sans Bold, licence SIL OFL),
// converti en tracés vectoriels : aucun texte ni police dans les SVG, rendu identique partout.
// Usage (outils de dev hors dépôt) :
//   npm i opentype.js@1.3.4 @fontsource/ibm-plex-sans@5.1.1 dans un dossier D, puis
//   NODE_DEPS=D/node_modules node cf/icones/fabrique.mjs   → cf/site/icons/favicon.svg et cf/icones/*.svg
//   python3 cf/icones/fabrique.py                          → les PNG de cf/site/icons/
import { writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const D = process.env.NODE_DEPS; if (!D) { console.log("NODE_DEPS manquant"); process.exit(1); }
const require = createRequire(D + "/");
const opentype = require("opentype.js");
const font = opentype.loadSync(D + "/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-700-normal.woff");
const INK = "#111214", PAPER = "#F8F5EE", LIME = "#C6F432", GREEN = "#0E6B4A";

// Tracé d'un texte, centré sur (cx, cy) à la taille donnée ; renvoie aussi la boîte
function trace(txt, size, x = 0, y = 0) { const p = font.getPath(txt, x, y, size); return { d: p.toPathData(2), box: p.getBoundingBox() }; }
// « bilan » et « . » séparés (le point a sa couleur), avec l'approche de la police
function marque(size, cx, cy, { ink, dot }) {
  const w1 = font.getAdvanceWidth("bilan", size), all = trace("bilan.", size), b = all.box;
  const ox = cx - (b.x1 + b.x2) / 2, oy = cy - (b.y1 + b.y2) / 2; // centrage optique sur la boîte réelle
  const mot = trace("bilan", size, ox, oy), pt = trace(".", size, ox + w1, oy);
  return { svg: `<path fill="${ink}" d="${mot.d}"/><path fill="${dot}" d="${pt.d}"/>`, w: b.x2 - b.x1, h: b.y2 - b.y1 };
}
const largeur = size => { const b = trace("bilan.", size).box; return b.x2 - b.x1; };
const tailleW = w => w / largeur(100) * 100; // taille de police pour une largeur voulue
function lettre(txt, size, cx, cy, ink, dot) { // « b. » pour les petites tailles
  const w1 = font.getAdvanceWidth(txt, size), all = trace(txt + ".", size).box, ox = cx - (all.x1 + all.x2) / 2, oy = cy - (all.y1 + all.y2) / 2;
  return `<path fill="${ink}" d="${trace(txt, size, ox, oy).d}"/><path fill="${dot}" d="${trace(".", size, ox + w1, oy).d}"/>`;
}
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>\n`;
mkdirSync("cf/icones", { recursive: true }); mkdirSync("cf/site/icons", { recursive: true });

// Icône « any » : carré à coins arrondis, logo sur 76 % de la largeur
writeFileSync("cf/icones/icone.svg", svg(512, 512, `<rect width="512" height="512" rx="112" fill="${INK}"/>` + marque(tailleW(512 * 0.74), 256, 262, { ink: PAPER, dot: LIME }).svg));
// Icône « maskable » : fond plein, logo dans la zone sûre (cercle de 80 %), soit 62 % de la largeur
writeFileSync("cf/icones/maskable.svg", svg(512, 512, `<rect width="512" height="512" fill="${INK}"/>` + marque(tailleW(512 * 0.62), 256, 262, { ink: PAPER, dot: LIME }).svg));
// Écran d'accueil iOS : carré plein (iOS arrondit lui-même)
writeFileSync("cf/icones/apple.svg", svg(180, 180, `<rect width="180" height="180" fill="${INK}"/>` + marque(tailleW(180 * 0.72), 90, 92, { ink: PAPER, dot: LIME }).svg));
// Favicon : « b. » sur carré arrondi
const fav = svg(64, 64, `<rect width="64" height="64" rx="14" fill="${INK}"/>` + lettre("b", 50, 32, 33, PAPER, LIME));
writeFileSync("cf/site/icons/favicon.svg", fav); writeFileSync("cf/icones/favicon.svg", fav);
// Badge Android (barre d'état) : silhouette blanche sur fond transparent
writeFileSync("cf/icones/badge.svg", svg(96, 96, lettre("b", 78, 48, 49, "#FFFFFF", "#FFFFFF")));
// Logo seul pour l'image de partage
writeFileSync("cf/icones/marque-encre.svg", svg(600, 200, marque(tailleW(560), 300, 100, { ink: INK, dot: GREEN }).svg));
console.log("SVG écrits");
