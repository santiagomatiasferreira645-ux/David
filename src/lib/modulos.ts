// Registro único de los módulos de la app. El inicio arma sus tarjetas con esta lista y el menú de arriba
// muestra las secciones del módulo en el que se está. Para sumar un módulo nuevo alcanza con agregarlo acá
// (o pasar `disponible` a true): no hace falta tocar el menú ni el inicio.

export type Seccion = { href: string; texto: string; corto?: string };
export type Accion = { href: string; texto: string; palabras?: string };

export type Modulo = {
  id: string;
  nombre: string;
  descripcion: string;
  href: string;
  // Rutas que pertenecen al módulo: sirven para marcar el menú y recordar el último módulo usado.
  prefijos: string[];
  // Submenú que aparece arriba cuando se está dentro del módulo. En el celular va en filas de tres.
  secciones: Seccion[];
  // Atajos de la tarjeta del inicio y del buscador "¿Qué necesitás hacer?".
  acciones: Accion[];
  // Tabla de Supabase que se cuenta para mostrar la cifra de la tarjeta (si existe).
  conteo?: { tabla: string; texto: string };
  // Clases de color de la tarjeta (escritas completas para que Tailwind las incluya).
  color: { linea: string; texto: string; fondo: string };
  // Trazos del ícono (viewBox 0 0 24 24, sin relleno).
  icono: string[];
  // Los módulos que todavía se están construyendo se muestran como "Próximamente", sin link.
  disponible: boolean;
};

const CIAN = { linea: "border-t-acento/70", texto: "text-acento", fondo: "bg-acento/10" };
const VERDE = { linea: "border-t-verde/70", texto: "text-verde", fondo: "bg-verde/10" };
const AMARILLO = { linea: "border-t-amarillo/70", texto: "text-amarillo", fondo: "bg-amarillo/10" };

export const MODULOS: Modulo[] = [
  {
    id: "repuestos",
    nombre: "Repuestos",
    descripcion: "Buscar por PN, búsqueda múltiple, catálogos de fábrica y precios cotizados.",
    href: "/buscar",
    prefijos: ["/buscar", "/historial", "/repuestos", "/catalogo", "/cotizaciones"],
    secciones: [
      { href: "/buscar", texto: "Buscar" },
      { href: "/buscar/multiple", texto: "Búsqueda múltiple", corto: "Múltiple" },
      { href: "/historial", texto: "Historial" },
      { href: "/repuestos", texto: "Lista de PN", corto: "PN" },
      { href: "/catalogo", texto: "Catálogos" },
      { href: "/cotizaciones/nueva", texto: "Cargar precio", corto: "Precio" },
    ],
    acciones: [
      { href: "/buscar", texto: "Buscar un repuesto por PN", palabras: "part number pn buscar cotizar consultar" },
      { href: "/buscar/multiple", texto: "Buscar una lista de PN", palabras: "varios excel pegar lista" },
      { href: "/cotizaciones/nueva", texto: "Cargar un precio recibido", palabras: "cotizacion precio cargar" },
      { href: "/catalogo", texto: "Consultar catálogos de fábrica", palabras: "manual catalogo pdf emd" },
      { href: "/historial", texto: "Ver búsquedas anteriores", palabras: "historial abiertas estado" },
    ],
    conteo: { tabla: "busquedas", texto: "búsquedas" },
    color: CIAN,
    icono: ["M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"],
    disponible: true,
  },
  {
    id: "proveedores",
    nombre: "Proveedores",
    descripcion: "Fichas con contactos, marcas que manejan y todos los precios que pasaron.",
    href: "/proveedores",
    prefijos: ["/proveedores"],
    secciones: [
      { href: "/proveedores", texto: "Proveedores" },
      { href: "/proveedores/nuevo", texto: "Nuevo proveedor", corto: "Nuevo" },
    ],
    acciones: [
      { href: "/proveedores", texto: "Buscar un proveedor", palabras: "empresa contacto whatsapp mail telefono pais" },
      { href: "/proveedores/nuevo", texto: "Agregar un proveedor", palabras: "nuevo alta cargar" },
    ],
    conteo: { tabla: "proveedores", texto: "proveedores" },
    color: VERDE,
    icono: ["M3 21h18", "M5 21V8l7-4 7 4v13", "M9 21v-6h6v6", "M9 11h.01M15 11h.01"],
    disponible: true,
  },
  {
    id: "stock",
    nombre: "Stock propio",
    descripcion: "Repuestos que tenemos en depósito, con cantidades y ubicación.",
    href: "/stock",
    prefijos: ["/stock"],
    secciones: [
      { href: "/stock", texto: "Stock" },
      { href: "/stock/nuevo", texto: "Cargar stock", corto: "Cargar" },
      { href: "/stock/importar", texto: "Importar planilla", corto: "Importar" },
      { href: "/stock/depositos", texto: "Depósitos" },
    ],
    acciones: [
      { href: "/stock", texto: "Ver qué tenemos en stock", palabras: "deposito existencia inventario" },
      { href: "/stock/nuevo", texto: "Cargar stock", palabras: "ingreso alta" },
    ],
    conteo: { tabla: "stock_articulos", texto: "artículos" },
    color: AMARILLO,
    icono: ["M21 8 12 3 3 8v8l9 5 9-5z", "M3 8l9 5 9-5", "M12 13v8"],
    disponible: false,
  },
  {
    id: "presupuestos",
    nombre: "Presupuestos",
    descripcion: "Presupuestos históricos enviados a clientes, para reutilizar precios.",
    href: "/presupuestos",
    prefijos: ["/presupuestos"],
    secciones: [
      { href: "/presupuestos", texto: "Presupuestos" },
      { href: "/presupuestos/cargar", texto: "Cargar presupuesto", corto: "Cargar" },
    ],
    acciones: [
      { href: "/presupuestos", texto: "Buscar en presupuestos anteriores", palabras: "historico cotizado cliente" },
      { href: "/presupuestos/cargar", texto: "Cargar un presupuesto", palabras: "subir pdf ia" },
    ],
    conteo: { tabla: "presupuesto_items", texto: "precios" },
    color: CIAN,
    icono: ["M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z", "M14 3v6h6", "M8 13h8M8 17h5"],
    disponible: false,
  },
  {
    id: "servicios",
    nombre: "Servicios",
    descripcion: "Servicios y trabajos que ofrecemos, con su precio de referencia.",
    href: "/servicios",
    prefijos: ["/servicios"],
    secciones: [
      { href: "/servicios", texto: "Servicios" },
      { href: "/servicios/nuevo", texto: "Nuevo servicio", corto: "Nuevo" },
    ],
    acciones: [
      { href: "/servicios", texto: "Buscar un servicio", palabras: "trabajo mano de obra reparacion" },
      { href: "/servicios/nuevo", texto: "Cargar un servicio", palabras: "alta nuevo" },
    ],
    conteo: { tabla: "servicios", texto: "servicios" },
    color: VERDE,
    icono: ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"],
    disponible: false,
  },
  {
    id: "clientes",
    nombre: "Clientes",
    descripcion: "Base de clientes con sus embarcaciones y los precios que se les pasaron.",
    href: "/clientes",
    prefijos: ["/clientes"],
    secciones: [
      { href: "/clientes", texto: "Clientes" },
      { href: "/clientes/nuevo", texto: "Nuevo cliente", corto: "Nuevo" },
    ],
    acciones: [
      { href: "/clientes", texto: "Buscar un cliente", palabras: "embarcacion barco armador" },
      { href: "/clientes/nuevo", texto: "Agregar un cliente", palabras: "alta nuevo" },
    ],
    conteo: { tabla: "clientes", texto: "clientes" },
    color: AMARILLO,
    icono: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"],
    disponible: false,
  },
];

const coincide = (ruta: string, prefijo: string) => ruta === prefijo || ruta.startsWith(prefijo + "/");

// El módulo al que pertenece una ruta, o null (inicio, cuenta, login).
export function moduloDeRuta(ruta: string): Modulo | null {
  return MODULOS.find((m) => m.prefijos.some((p) => coincide(ruta, p))) ?? null;
}

// La sección activa es la de prefijo más largo: así /buscar/multiple no marca también "Buscar".
export function seccionActiva(modulo: Modulo, ruta: string): string | null {
  const candidatas = modulo.secciones.filter((s) => coincide(ruta, s.href)).sort((a, b) => b.href.length - a.href.length);
  return candidatas[0]?.href ?? null;
}

export function moduloPorId(id: string | undefined): Modulo | null {
  return MODULOS.find((m) => m.id === id && m.disponible) ?? null;
}

// Nombre de la cookie donde se recuerda el último módulo usado, para ofrecer "Seguir en …" en el inicio.
export const COOKIE_MODULO = "ultimo_modulo";

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Atajos que coinciden con lo que se escribió en "¿Qué necesitás hacer?". Cada palabra tiene que aparecer.
export function buscarAcciones(texto: string): { modulo: Modulo; accion: Accion }[] {
  const palabras = sinTildes(texto).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return [];
  return MODULOS.filter((m) => m.disponible).flatMap((modulo) =>
    modulo.acciones
      .filter((accion) => {
        const pajar = sinTildes(`${accion.texto} ${accion.palabras ?? ""} ${modulo.nombre}`);
        return palabras.every((p) => pajar.includes(p));
      })
      .map((accion) => ({ modulo, accion })),
  );
}
