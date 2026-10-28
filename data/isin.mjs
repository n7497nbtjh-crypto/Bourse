// Clé de contrôle d'un code ISIN (algorithme de Luhn sur les chiffres).
export function isinOk(isin) {
  if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)) return false;
  const digits = isin.slice(0, 11).split("").map(ch => /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch).join("");
  let sum = 0, dbl = true;
  for (let i = digits.length - 1; i >= 0; i--) { let d = +digits[i]; if (dbl) { d *= 2; if (d > 9) d -= 9; } sum += d; dbl = !dbl; }
  return (10 - (sum % 10)) % 10 === +isin[11];
}
