export type Proveedor = {
  id: string;
  empresa: string;
  pais: string | null;
  ciudad: string | null;
  zona_horaria: string | null;
  idioma: string | null;
  marcas: string | null;
  tipo: string | null;
  web: string | null;
  calificacion: number | null;
  origen: string | null;
  productos: string | null;
  notas: string | null;
};

export type Contacto = {
  id: number;
  proveedor_id: string;
  nombre: string | null;
  cargo: string | null;
  email: string | null;
  telefono: string | null;
  tiene_whatsapp: "Sí" | "No" | "No sé";
  canal_preferido: string | null;
  wechat: string | null;
  notas: string | null;
};

export type Cotizacion = {
  id: number;
  busqueda_id: number | null;
  proveedor_id: string | null;
  fecha: string;
  pn: string | null;
  pn_normalizado: string | null;
  marca: string | null;
  descripcion: string | null;
  modelo_motor: string | null;
  cantidad: number | null;
  precio_unitario: number | null;
  moneda: string | null;
  incoterm: string | null;
  plazo_dias: number | null;
  condicion: string | null;
  tipo_precio: string;
  notas: string | null;
};

export type ConsultaPn = {
  id: number;
  proveedor_id: string | null;
  fecha: string | null;
  pn: string;
  pn_normalizado: string;
  marca: string | null;
  descripcion: string | null;
};

export type Busqueda = {
  id: number;
  pn: string;
  pn_normalizado: string;
  marca: string | null;
  cantidad: number | null;
  cliente: string | null;
  estado: "abierta" | "cotizada" | "comprada" | "perdida";
  creado_en: string;
};
