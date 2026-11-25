-- Presupuestos históricos: los propios (a clientes) y los que nos mandaron proveedores, leídos con IA.
-- Cada renglón queda en presupuesto_items; los de servicios también se copian a la tabla servicios (0008) si ya existe.
-- Se ejecuta una vez en Supabase: SQL Editor > New query > pegar este archivo > Run.

create table if not exists presupuestos (
  id                bigint generated always as identity primary key,
  tipo              text check (tipo in ('propio', 'proveedor')),  -- propio: lo emitimos a un cliente; proveedor: nos lo mandaron
  empresa           text,                                          -- empresa nuestra que lo emitió (DAYSA, Técnica Naval, SPES)
  numero            text,
  fecha             date,
  cliente           text,                                          -- cliente o embarcación
  cliente_id        text,                                          -- clientes.id, si la tabla existe
  proveedor_id      text references proveedores (id) on delete set null,
  proveedor_nombre  text,                                          -- como figura en el presupuesto
  moneda            text,
  total             numeric,
  condiciones       text,                                          -- forma de pago, plazo, validez, incoterm
  archivo           text not null,                                 -- ruta en Storage, bucket "presupuestos"
  nombre_archivo    text,
  estado            text not null default 'procesando' check (estado in ('procesando', 'listo', 'error')),
  error             text,
  notas             text,
  creado_por        uuid default auth.uid() references auth.users (id),
  creado_en         timestamptz not null default now()
);

create table if not exists presupuesto_items (
  id               bigint generated always as identity primary key,
  presupuesto_id   bigint not null references presupuestos (id) on delete cascade,
  clase            text not null default 'repuesto' check (clase in ('repuesto', 'servicio')),
  pn               text,
  pn_normalizado   text generated always as (normalizar_pn(pn)) stored,
  marca            text,
  descripcion      text,
  modelo_motor     text,
  cantidad         numeric,
  unidad           text,
  precio_unitario  numeric,
  moneda           text,
  plazo_dias       int,
  notas            text,
  creado_en        timestamptz not null default now()
);

create index if not exists presupuesto_items_pn_idx on presupuesto_items using gin (pn_normalizado gin_trgm_ops);
create index if not exists presupuesto_items_desc_idx on presupuesto_items using gin (lower(descripcion) gin_trgm_ops);
create index if not exists presupuesto_items_presupuesto_idx on presupuesto_items (presupuesto_id);
create index if not exists presupuestos_fecha_idx on presupuestos (fecha desc);

alter table presupuestos enable row level security;
alter table presupuesto_items enable row level security;
drop policy if exists "usuarios internos" on presupuestos;
drop policy if exists "usuarios internos" on presupuesto_items;
create policy "usuarios internos" on presupuestos for all to authenticated using (true) with check (true);
create policy "usuarios internos" on presupuesto_items for all to authenticated using (true) with check (true);

-- Si ya está la base de clientes, el presupuesto queda ligado a su ficha.
do $$
begin
  if to_regclass('public.clientes') is not null
     and not exists (select 1 from pg_constraint where conname = 'presupuestos_cliente_fk') then
    alter table presupuestos add constraint presupuestos_cliente_fk foreign key (cliente_id) references clientes (id) on delete set null;
  end if;
end $$;

-- Archivos originales (PDF, fotos, Excel), privados: solo usuarios con sesión.
insert into storage.buckets (id, name, public, file_size_limit)
values ('presupuestos', 'presupuestos', false, 15728640)
on conflict (id) do nothing;

drop policy if exists "usuarios internos presupuestos" on storage.objects;
create policy "usuarios internos presupuestos" on storage.objects for all to authenticated
  using (bucket_id = 'presupuestos') with check (bucket_id = 'presupuestos');
