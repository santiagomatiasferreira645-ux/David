import { listarDepositos } from "@/lib/stock-datos";
import { crearArticulo } from "../acciones";
import { AvisoError, Campo, CamposArticulo, Encabezado, Lista, opcionesDeposito } from "../componentes";

type Params = { pn?: string; marca?: string; error?: string };

// Alta de un artículo propio, con la cantidad inicial en un depósito.
export default async function NuevoArticulo({ searchParams }: { searchParams: Params }) {
  const depositos = await listarDepositos(true);
  return (
    <form action={crearArticulo} className="tarjeta space-y-5 p-5 sm:p-6">
      <Encabezado titulo="Agregar un artículo al stock">
        <p className="mt-1 text-sm secundario">El mismo PN puede estar dos veces si es de otra marca o en otra condición (por ejemplo nuevo y usado).</p>
      </Encabezado>
      <AvisoError error={searchParams.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <CamposArticulo a={{ pn: searchParams.pn, marca: searchParams.marca }} />
      </div>
      <fieldset className="grid gap-4 border-t border-borde/60 pt-4 sm:grid-cols-3">
        <legend className="subtitulo pb-2 text-amarillo">Existencia inicial</legend>
        <Lista nombre="deposito" texto="Depósito" opciones={opcionesDeposito(depositos)} />
        <Campo nombre="cantidad" texto="Cantidad" tipo="number" valor={0} />
        <Campo nombre="ubicacion" texto="Estante o sector" />
      </fieldset>
      <button className="boton">Guardar artículo</button>
    </form>
  );
}
