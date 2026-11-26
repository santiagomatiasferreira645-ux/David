import { describe, expect, it, vi } from "vitest";
import Anthropic from "@anthropic-ai/sdk";

vi.mock("server-only", () => ({}));
const { explicarErrorIA } = await import("@/lib/ia");

const error = (status: number, mensaje: string) =>
  Anthropic.APIError.generate(status, { type: "error", error: { type: "x", message: mensaje } }, mensaje, new Headers());

describe("explicarErrorIA", () => {
  it("avisa cuando falta crédito", () => {
    expect(explicarErrorIA(error(400, "Your credit balance is too low to access the Anthropic API."))).toMatch(/sin crédito/);
  });
  it("avisa cuando la clave no es válida", () => {
    expect(explicarErrorIA(error(401, "invalid x-api-key"))).toMatch(/no es válida/);
  });
  it("avisa cuando la búsqueda web está deshabilitada", () => {
    expect(explicarErrorIA(error(400, "Web search is not enabled for this organization"))).toMatch(/búsqueda web no está habilitada/);
  });
  it("muestra el motivo de otros rechazos", () => {
    expect(explicarErrorIA(error(400, "algo raro"))).toMatch(/algo raro/);
  });
  it("distingue el tiempo agotado y la saturación", () => {
    expect(explicarErrorIA(new Anthropic.APIConnectionTimeoutError())).toMatch(/tardó/);
    expect(explicarErrorIA(error(529, "Overloaded"))).toMatch(/saturado/);
  });
});
