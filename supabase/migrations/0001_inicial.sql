-- Esquema inicial del motor de búsqueda de repuestos.
-- Se ejecuta una vez en Supabase: SQL Editor > New query > pegar este archivo > Run.

create extension if not exists pg_trgm;

-- PN sin guiones, espacios ni puntos, en mayúsculas: "8N-7005" -> "8N7005".
create or replace function normalizar_pn(t text) returns text
language sql immutable as $$
  select upper(regexp_replace(coalesce(t, ''), '[^A-Za-z0-9]', '', 'g'))
$$;

create table proveedores (
  id              text primary key,               -- P0001, P0002...
  empresa         text not null,
  pais            text,
  ciudad          text,
  zona_horaria    text,                            -- IANA, ej. America/Chicago
  idioma          text,                            -- Español, Inglés, Portugués...
  marcas          text,                            -- texto libre: "EMD, CAT"
  tipo            text,
  web             text,
  calificacion    smallint check (calificacion between 1 and 5),
  origen          text,
  productos       text,
  notas           text,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

create table contactos (
  id               bigint generated always as identity primary key,
  proveedor_id     text not null references proveedores (id) on delete cascade,
  nombre           text,
  cargo            text,
  email            text,
  telefono         text,                           -- formato internacional +5491112345678
  tiene_whatsapp   text not null default 'No sé' check (tiene_whatsapp in ('Sí', 'No', 'No sé')),
  canal_preferido  text check (canal_preferido in ('Email', 'WhatsApp', 'Llamada', 'WeChat', 'Telegram', 'Formulario web')),
  wechat           text,
  telegram         text,
  horario          text,
  origen           text,
  notas            text,
  creado_en        timestamptz not null default now()
);

create table busquedas (
  id              bigint generated always as identity primary key,
  pn              text not null,
  pn_normalizado  text generated always as (normalizar_pn(pn)) stored,
  marca           text,
  cantidad        numeric,
  cliente         text,                            -- cliente o embarcación
  estado          text not null default 'abierta' check (estado in ('abierta', 'cotizada', 'comprada', 'perdida')),
  usuario_id      uuid default auth.uid() references auth.users (id),
  creado_en       timestamptz not null default now()
);

create table cotizaciones (
  id               bigint generated always as identity primary key,
  busqueda_id      bigint references busquedas (id) on delete set null,
  proveedor_id     text references proveedores (id) on delete set null,
  fecha            date not null default current_date,
  pn               text,
  pn_normalizado   text generated always as (normalizar_pn(pn)) stored,
  marca            text,
  descripcion      text,
  modelo_motor     text,
  cantidad         numeric,
  precio_unitario  numeric,
  moneda           text,
  incoterm         text,
  plazo_dias       integer,
  condicion        text,
  tipo_precio      text not null default 'Cotización del proveedor'
                   check (tipo_precio in ('Cotización del proveedor', 'Referencia de mercado', 'Flete / servicio', 'Precio propio / oferta nuestra')),
  validez          date,
  notas            text,
  origen           text,
  creado_por       uuid default auth.uid() references auth.users (id),
  creado_en        timestamptz not null default now()
);

-- PN que se le pidieron a un proveedor aunque no haya precio registrado.
create table consultas_pn (
  id               bigint generated always as identity primary key,
  proveedor_id     text references proveedores (id) on delete set null,
  fecha            date,
  pn               text not null,
  pn_normalizado   text generated always as (normalizar_pn(pn)) stored,
  marca            text,
  descripcion      text,
  modelo_motor     text,
  creado_en        timestamptz not null default now()
);

-- Cada mail, WhatsApp o llamada iniciada desde la app.
create table contactos_realizados (
  id           bigint generated always as identity primary key,
  busqueda_id  bigint references busquedas (id) on delete cascade,
  contacto_id  bigint references contactos (id) on delete set null,
  proveedor_id text references proveedores (id) on delete set null,
  canal        text not null,
  fecha        timestamptz not null default now(),
  respondio    boolean,
  usuario_id   uuid default auth.uid() references auth.users (id)
);

create index cotizaciones_pn_idx on cotizaciones using gin (pn_normalizado gin_trgm_ops);
create index consultas_pn_idx on consultas_pn using gin (pn_normalizado gin_trgm_ops);
create index busquedas_pn_idx on busquedas (pn_normalizado);
create index proveedores_marcas_idx on proveedores using gin (lower(marcas) gin_trgm_ops);
create index contactos_proveedor_idx on contactos (proveedor_id);

-- Todos los usuarios con sesión iniciada ven y editan todo; sin sesión, nada.
do $$
declare t text;
begin
  foreach t in array array['proveedores', 'contactos', 'busquedas', 'cotizaciones', 'consultas_pn', 'contactos_realizados'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "usuarios internos" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
