import { describe, expect, it } from "vitest";
import { horaLocal, idiomaDe, linkLlamada, linkMail, linkWhatsapp, mensaje } from "@/lib/contacto";

const consulta = { pn: "8N7005", marca: "CAT", cantidad: 4, descripcion: "Inyector" };

describe("idiomaDe", () => {
  it("usa el idioma cargado y si no, el del país", () => {
    expect(idiomaDe("Inglés", "Argentina")).toBe("en");
    expect(idiomaDe(null, "Brasil")).toBe("pt");
    expect(idiomaDe(null, "USA")).toBe("en");
    expect(idiomaDe(null, "Paraguay")).toBe("es");
  });
});

describe("links de contacto", () => {
  it("arma WhatsApp con el mensaje en el idioma del proveedor", () => {
    const url = linkWhatsapp("+55 11 96442-0520", consulta, "pt")!;
    expect(url.startsWith("https://wa.me/5511964420520?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toContain("Precisamos de cotação de 4 unidade(s) do PN 8N7005 CAT (Inyector)");
  });
  it("no arma WhatsApp ni llamada sin código de país", () => {
    expect(linkWhatsapp("0981 123456", consulta, "es")).toBeNull();
    expect(linkLlamada("0981 123456")).toBeNull();
  });
  it("arma el mail con asunto y cuerpo, sin + en lugar de espacios", () => {
    const url = linkMail("parts@ejemplo.com", consulta, "en")!;
    expect(url).toMatch(/^mailto:parts@ejemplo\.com\?subject=RFQ%20PN%208N7005%20CAT&body=/);
    expect(url).not.toContain("+");
  });
  it("el mensaje en inglés pide precio, condición, plazo e Incoterm", () => {
    expect(mensaje(consulta, "en")).toContain("unit price, currency, condition");
  });
});

describe("horaLocal", () => {
  it("marca abierto en horario comercial y cerrado de noche o fin de semana", () => {
    // Miércoles 15:00 UTC = 10:00 en Chicago (horario de verano)
    expect(horaLocal("America/Chicago", new Date("2026-07-15T15:00:00Z"))).toEqual({ hora: "10:00", abierto: true });
    expect(horaLocal("Asia/Kolkata", new Date("2026-07-15T20:00:00Z"))?.abierto).toBe(false);
    expect(horaLocal("America/Asuncion", new Date("2026-07-18T15:00:00Z"))?.abierto).toBe(false); // sábado
  });
  it("devuelve null con zona inválida o vacía", () => {
    expect(horaLocal("No/Existe")).toBeNull();
    expect(horaLocal(null)).toBeNull();
  });
});
