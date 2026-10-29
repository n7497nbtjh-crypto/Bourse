// Frais de courtage par ordre, actions françaises, offre de base de chaque courtier.
// Relevés le 28/10/2026 sur les grilles publiées et les comparatifs cités ; à vérifier sur le site du courtier avant d'ouvrir un compte.
// Chaque grille : liste de paliers [jusqu'à (montant de l'ordre en €), frais fixes €, pourcentage]. Le dernier palier n'a pas de plafond.
export default [
  { id: "trade-republic", name: "Trade Republic", pea: true, grille: [[Infinity, 1, 0]], plan: 0, note: "1 € par ordre. Plans d'investissement programmés gratuits. Ordres exécutés sur la plateforme Lang & Schwarz, pas sur Euronext." },
  { id: "boursobank", name: "BoursoBank (Découverte)", pea: true, grille: [[500, 1.99, 0], [Infinity, 0, 0.5]], note: "1,99 € jusqu'à 500 €, puis 0,5 % du montant. Une opération par mois minimum pour cette offre ; d'autres formules existent pour les ordres plus gros." },
  { id: "fortuneo", name: "Fortuneo (Starter)", pea: true, grille: [[500, 0, 0], [Infinity, 0, 0.35]], note: "0 € pour le 1er ordre du mois inférieur ou égal à 500 € (appliqué ici à chaque ordre, cas le plus favorable), sinon 0,35 % du montant, sans minimum. Grille officielle Fortuneo au 6 août 2026, vérifiée le 29/10/2026." },
  { id: "bourse-direct", name: "Bourse Direct", pea: true, grille: [[500, 0.99, 0], [1000, 1.9, 0], [2000, 2.9, 0], [4400, 3.8, 0], [Infinity, 0, 0.09]], note: "Frais fixes par palier jusqu'à 4 400 €, puis 0,09 %." },
  { id: "degiro", name: "Degiro", pea: false, grille: [[Infinity, 2, 0]], note: "2 € par ordre sur Euronext Paris (plus 1 € de frais de connexion par an et par place étrangère). Pas de PEA." },
  { id: "saxo", name: "Saxo (Classic)", pea: true, grille: [[2500, 2, 0], [Infinity, 0, 0.08]], note: "2 € jusqu'à 2 500 €, puis 0,08 %." },
  { id: "ibkr", name: "Interactive Brokers", pea: false, grille: [[Infinity, 1.25, 0.05]], min: 1.25, note: "0,05 % du montant, 1,25 € minimum. Pas de PEA." },
  { id: "autre", name: "Autre / ma banque", pea: true, grille: [[Infinity, 0, 0]], custom: true, note: "Indiquez vous-même les frais de votre banque (fixe et pourcentage)." },
];
export const SOURCES_COURTIERS = [
  { label: "Fortuneo, conditions tarifaires au 6 août 2026 (relevé le 29/10/2026)", url: "https://www.fortuneo.fr/files/tarifs_fortuneo.pdf" },
  { label: "pour-vos-finances.fr, comparatif des frais de courtage (janvier 2026)", url: "https://www.pour-vos-finances.fr/" },
  { label: "finance-heros.fr, comparatif courtiers (mars 2026)", url: "https://finance-heros.fr/" },
];
// Frais d'un ordre : palier trouvé, fixe + pourcentage, avec un minimum éventuel.
export function frais(c, montant, perso) {
  if (c.custom) return Math.max(0, (perso?.fixe || 0) + montant * (perso?.pct || 0) / 100);
  const p = c.grille.find(g => montant <= g[0]) || c.grille[c.grille.length - 1];
  return Math.round(Math.max(c.min || 0, p[1] + montant * p[2] / 100) * 100) / 100;
}
