// Nombres con los que aparece cada marca en la base. El primero es el nombre principal.
const GRUPOS: string[][] = [
  ["CAT", "Caterpillar", "Cat"],
  ["EMD", "Electro-Motive", "Electro Motive", "Electro-Motive Diesel", "GM EMD", "Progress Rail"],
  ["MAK", "MaK", "Caterpillar MaK"],
  ["GE", "General Electric", "GE Transportation", "Wabtec"],
  ["Detroit", "Detroit Diesel", "DDC"],
  ["Cummins"],
  ["John Deere", "Deere", "JD"],
  ["Volvo Penta", "Volvo"],
  ["MTU", "Rolls-Royce Power Systems", "Rolls Royce"],
  ["Wärtsilä", "Wartsila"],
  ["Twin Disc", "TwinDisc"],
  ["ZF", "ZF Marine"],
  ["Reintjes"],
  ["Lufkin"],
  ["Falk", "Rexnord", "Rexnord Falk"],
  ["Masson", "Masson Marine"],
  ["Haley", "Haley Marine Gears"],
  ["Clark", "Clark Industrial Power"],
  ["ABC", "Anglo Belgian Corporation", "Anglo Belgian"],
  ["Weichai"],
  ["Perkins"],
  ["Yanmar"],
  ["Mitsubishi", "MHI"],
  ["Scania"],
  ["Doosan"],
  ["MAN", "MAN Energy Solutions", "MAN B&W"],
  ["Niigata"],
  ["Baudouin", "Moteurs Baudouin"],
];

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Todas las formas de escribir la marca; si no está en la lista, solo la marca tal cual.
export function variantesMarca(marca: string): string[] {
  const m = sinAcentos(marca);
  if (!m) return [];
  const grupo = GRUPOS.find((g) => g.some((n) => sinAcentos(n) === m));
  return grupo ? [...new Set(grupo)] : [marca.trim()];
}

export function nombrePrincipal(marca: string): string {
  return variantesMarca(marca)[0] ?? marca.trim();
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Compara por palabra completa, para que "GE" no coincida con "Gears" ni "CAT" con "Catálogo".
export function coincideMarca(texto: string | null, marca: string): boolean {
  if (!texto || !marca.trim()) return false;
  const t = sinAcentos(texto);
  return variantesMarca(marca).some((v) => new RegExp(`(^|[^a-z0-9])${escapar(sinAcentos(v))}($|[^a-z0-9])`).test(t));
}
