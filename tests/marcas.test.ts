import { describe, expect, it } from "vitest";
import { coincideMarca, nombrePrincipal, variantesMarca } from "@/lib/marcas";

describe("marcas", () => {
  it("reconoce los nombres equivalentes de una marca", () => {
    expect(coincideMarca("Caterpillar, Perkins", "CAT")).toBe(true);
    expect(coincideMarca("CAT", "caterpillar")).toBe(true);
    expect(coincideMarca("Electro-Motive, MIBA", "EMD")).toBe(true);
    expect(coincideMarca("Wartsila", "Wärtsilä")).toBe(true);
  });

  it("compara por palabra completa", () => {
    expect(coincideMarca("Haley Marine Gears", "GE")).toBe(false);
    expect(coincideMarca("EMD, GE", "GE")).toBe(true);
    expect(coincideMarca("Catálogo general", "CAT")).toBe(false);
  });

  it("deja igual una marca que no está en la lista", () => {
    expect(variantesMarca("Hatz")).toEqual(["Hatz"]);
    expect(coincideMarca("Hatz, Lister", "hatz")).toBe(true);
    expect(nombrePrincipal("caterpillar")).toBe("CAT");
  });
});
