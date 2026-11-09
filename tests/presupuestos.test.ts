import { describe, expect, it } from "vitest";
import { archivoAceptado, buscarPorNombre, carpetaDe, esArchivoOculto, fechaValida, filaServicio, limpiarLeido, monedaValida, rutaArchivo, type PresupuestoLeido } from "@/lib/presupuestos";

const base: PresupuestoLeido = {
  tipo: "proveedor",
  empresa: null,
  numero: "123",
  fecha: "2024-03-15",
  cliente: "B/M Don Pedro",
  proveedor: "Wärtsilä Argentina S.A.",
  moneda: "US$",
  total: 1500,
  condiciones: null,
  items: [],
};
const item = { pn: null, marca: null, modelo_motor: null, cantidad: null, unidad: null, precio_unitario: null, moneda: null, plazo_dias: null, categoria: "No aplica", notas: null };

describe("presupuestos", () => {
  it("valida fechas reales", () => {
    expect(fechaValida("2024-02-29")).toBe("2024-02-29");
    expect(fechaValida("2023-02-29")).toBeNull();
    expect(fechaValida("15/03/2024")).toBeNull();
    expect(fechaValida(null)).toBeNull();
  });

  it("normaliza monedas", () => {
    expect(monedaValida("US$")).toBe("USD");
    expect(monedaValida("eur")).toBe("EUR");
    expect(monedaValida("")).toBeNull();
  });

  it("limpia lo que devuelve la IA", () => {
    const l = limpiarLeido({
      ...base,
      items: [
        { ...item, clase: "repuesto", pn: " 8N-7005 ", descripcion: "Gasket", precio_unitario: 12.5 },
        { ...item, clase: "servicio", descripcion: "Overhaul motor principal", categoria: "Overhaul" },
        { ...item, clase: "servicio", descripcion: "Viáticos", categoria: "Inventada" },
        { ...item, clase: "repuesto", pn: "null", descripcion: "  " },
      ],
    });
    expect(l.moneda).toBe("USD");
    expect(l.items).toHaveLength(3);
    expect(l.items[0]).toMatchObject({ pn: "8N-7005", moneda: "USD", precio_unitario: 12.5 });
    expect(l.items[1].categoria).toBe("Overhaul");
    expect(l.items[2].categoria).toBe("Otro");
  });

  it("encuentra el proveedor por nombre aunque cambie la sigla o los acentos", () => {
    const lista = [
      { id: "P0001", nombre: "Wartsila Argentina" },
      { id: "P0002", nombre: "Diesel Parts" },
      { id: "P0003", nombre: "Diesel Parts Brasil" },
    ];
    expect(buscarPorNombre(lista, "Wärtsilä Argentina S.A.")?.id).toBe("P0001");
    expect(buscarPorNombre(lista, "diesel parts ltda")?.id).toBe("P0002");
    expect(buscarPorNombre(lista, "Diesel")).toBeNull();
    expect(buscarPorNombre(lista, null)).toBeNull();
  });

  it("arma el renglón para el módulo de servicios", () => {
    const [s] = limpiarLeido({ ...base, items: [{ ...item, clase: "servicio", descripcion: "Rectificado de cigüeñal", categoria: "Rectificado", precio_unitario: 900 }] }).items;
    expect(filaServicio(s, { id: 7, tipo: "proveedor", proveedor_id: "P0001", proveedor_nombre: "Wartsila", cliente: "X", fecha: "2024-01-01" })).toMatchObject({
      prestador: "proveedor",
      proveedor_id: "P0001",
      categoria: "Rectificado",
      precio: 900,
      presupuesto_id: 7,
      estado: "presupuestado",
      origen: "Presupuesto histórico",
    });
    expect(filaServicio(s, { id: 7, tipo: "propio", proveedor_id: "P0001", proveedor_nombre: "x", cliente: null, fecha: null }).proveedor_id).toBeNull();
  });

  it("acepta los formatos que la IA puede leer y arma un nombre de archivo seguro", () => {
    expect(archivoAceptado("Presupuesto.PDF")).toBe(true);
    expect(archivoAceptado("foto.jpeg")).toBe(true);
    expect(archivoAceptado("oferta.docx")).toBe(false);
    expect(rutaArchivo("Presupuesto Nº 123 (final).pdf", 1)).toBe("1-presupuesto-n-123-final.pdf");
  });

  it("toma el cliente de la carpeta y saltea archivos de sistema", () => {
    expect(carpetaDe("Presupuestos/Naviera Sur/2023/oferta.pdf")).toBe("Naviera Sur");
    expect(carpetaDe("Naviera Sur/oferta.pdf")).toBe("Naviera Sur");
    expect(carpetaDe("oferta.pdf")).toBeNull();
    expect(esArchivoOculto("Clientes/.DS_Store")).toBe(true);
    expect(esArchivoOculto("Clientes/~$oferta.xlsx")).toBe(true);
    expect(esArchivoOculto("Clientes/Thumbs.db")).toBe(true);
    expect(esArchivoOculto("Clientes/oferta.pdf")).toBe(false);
    expect(rutaArchivo("Clientes/Naviera Sur/Oferta 12.pdf", 5)).toBe("5-oferta-12.pdf");
  });
});
