import { MARCAS_FRECUENTES } from "@/lib/marcas";
import { BusquedaMultiple } from "./multiple";

export default function Multiple() {
  return <BusquedaMultiple marcas={MARCAS_FRECUENTES} />;
}
