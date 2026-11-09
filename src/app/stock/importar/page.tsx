import { listarDepositos } from "@/lib/stock-datos";
import { importarStock } from "../acciones";
import { AvisoError, Encabezado, opcionesDeposito } from "../componentes";
import { PegarPlanilla } from "./pegar";

// Carga masiva: se copia la planilla de Excel (con la fila de títulos) y se pega.
export default async function Importar({ searchParams }: { searchParams: { error?: string } }) {
  const depositos = await listarDepositos(true);
  return (
    <div className="space-y-4">
      <div className="tarjeta p-5">
        <Encabezado titulo="Cargar stock desde una planilla">
          <p className="mt-1 text-sm secundario">
            Copiá las celdas en Excel o Google Sheets, incluida la fila de títulos, y pegalas abajo. Columnas que se reconocen: PN, Marca,
            Descripción, Cantidad, Depósito, Ubicación, Condición, Costo, Precio y Moneda. Alcanza con PN y Cantidad.
          </p>
          <p className="mt-1 text-sm secundario">Si la planilla trae la columna Depósito con un nombre que no existe, el depósito se crea.</p>
        </Encabezado>
      </div>
      <AvisoError error={searchParams.error} />
      <PegarPlanilla depositos={opcionesDeposito(depositos)} accion={importarStock} />
    </div>
  );
}
