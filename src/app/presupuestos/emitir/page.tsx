import { notFound } from "next/navigation";
import { esMembrete, esModelo, nuevoPresupuesto } from "@/lib/presupuesto-emitido";
import { leerEmitido, nombresClientes, numerosSugeridos } from "@/lib/presupuesto-emitido-datos";
import { FormularioEmitir } from "./formulario";

// Emitir presupuesto con membrete de DAYSA o Técnica Naval: repuestos, repuestos + mano de obra / logística, o servicios.
// Con ?id= se abre uno ya guardado para corregirlo o volver a enviarlo.
export default async function Emitir({ searchParams }: { searchParams: { id?: string; membrete?: string; modelo?: string } }) {
  const [numeros, clientes] = await Promise.all([numerosSugeridos(), nombresClientes()]);
  let inicial;
  if (searchParams.id) {
    inicial = await leerEmitido(Number(searchParams.id));
    if (!inicial) notFound();
  } else {
    const membrete = esMembrete(searchParams.membrete) ? searchParams.membrete : "daysa";
    inicial = { ...nuevoPresupuesto(membrete, esModelo(searchParams.modelo) ? searchParams.modelo : "repuestos"), numero: numeros[membrete] };
  }
  return <FormularioEmitir key={inicial.id ?? "nuevo"} inicial={inicial} numeros={numeros} clientes={clientes} />;
}
