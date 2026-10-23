import { describe, expect, it } from "vitest";
import { normalizarPn, normalizarTelefono } from "@/lib/pn";

describe("normalizarPn", () => {
  it("quita guiones, espacios y puntos y pasa a mayúsculas", () => {
    expect(normalizarPn("8n-7005")).toBe("8N7005");
    expect(normalizarPn(" 307-7541 ")).toBe("3077541");
    expect(normalizarPn("8347340 / 9093027")).toBe("83473409093027");
  });
});

describe("normalizarTelefono", () => {
  it("acepta formato internacional con + o 00", () => {
    expect(normalizarTelefono("+54 9 11 4927-2556")).toBe("+5491149272556");
    expect(normalizarTelefono("005491150994440")).toBe("+5491150994440");
  });
  it("descarta números locales sin código de país", () => {
    expect(normalizarTelefono("021 557177")).toBe("");
    expect(normalizarTelefono(null)).toBe("");
  });
});
