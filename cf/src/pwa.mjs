// Balises ajoutées à chaque page HTML par le Worker : application installable (manifeste, icônes, couleur de la barre),
// aperçus de partage (Open Graph, Twitter), version du site (lue par le service worker pour ne jamais servir un vieux site),
// préchargement des données lues au démarrage.
/* global BILAN_VERSION */
export const VERSION = typeof BILAN_VERSION === "string" ? BILAN_VERSION : "dev"; // empreinte des fichiers du site, fixée par build.mjs
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const DONNEES = ["societes", "univers", "agenda", "agenda-auto", "etf", "courtiers", "repartitions", "concurrents"]; // lues au démarrage de chaque page (segments-fr.json, facultatif, n'est pas préchargé)
export function tete(html, { title, desc, url, statut }) {
  const canon = url.origin + (url.pathname.replace(/\/+$/, "") || "/");
  const t = [
    `<meta name="bilan-version" content="${VERSION}">`,
    `<link rel="manifest" href="/manifest.webmanifest">`,
    `<meta name="theme-color" content="#F8F5EE">`,
    `<link rel="icon" href="/icons/favicon.svg" type="image/svg+xml">`,
    `<link rel="icon" href="/icons/favicon-32.png" sizes="32x32" type="image/png">`,
    `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`,
    `<meta name="apple-mobile-web-app-title" content="bilan.">`,
    `<meta name="mobile-web-app-capable" content="yes">`,
    `<meta name="apple-mobile-web-app-capable" content="yes">`,
    `<meta name="apple-mobile-web-app-status-bar-style" content="default">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="bilan.">`,
    `<meta property="og:locale" content="fr_FR">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    ...(statut === 200 ? [`<meta property="og:url" content="${esc(canon)}">`] : []),
    `<meta property="og:image" content="${url.origin}/icons/partage.png">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="bilan. La Bourse, comptes à l'appui : les comptes officiels des entreprises cotées, expliqués simplement.">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    ...DONNEES.map(f => `<link rel="preload" href="/data/${f}.json" as="fetch" crossorigin>`),
    // Avant l'affichage de la page : la zone de contenu garde la hauteur de l'écran (le pied de page ne saute plus) et un trait discret indique le chargement
    `<style>#app:empty{min-height:calc(100vh - 56px)}#app:empty::after{content:"";display:block;width:64px;height:3px;margin:30vh auto 0;border-radius:3px;background:#111214;opacity:.22;animation:bilanCharge .9s ease-in-out infinite alternate}@keyframes bilanCharge{from{transform:scaleX(.25)}to{transform:scaleX(1)}}@media (prefers-reduced-motion:reduce){#app:empty::after{animation:none}}</style>`,
  ].join("\n");
  return html.replace(/<link rel="icon" href="data:[^"]*">\n?/, "").replace("</head>", t + "\n</head>");
}
