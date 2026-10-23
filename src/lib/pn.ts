// Igual que la función normalizar_pn de la base: "8N-7005" -> "8N7005".
export function normalizarPn(pn: string): string {
  return pn.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

// Teléfono a formato internacional E.164 (+5491112345678). Devuelve "" si no se puede.
export function normalizarTelefono(tel: string | null | undefined): string {
  if (!tel) return "";
  const limpio = tel.trim();
  const digitos = limpio.replace(/\D/g, "");
  if (!digitos) return "";
  if (limpio.startsWith("+")) return "+" + digitos;
  if (digitos.startsWith("00")) return "+" + digitos.slice(2);
  return "";
}
