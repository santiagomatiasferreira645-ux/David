-- Servicios presupuestados: los nuestros (a clientes) y los que nos presupuestaron proveedores o talleres parceros.
-- Sirven de precio de referencia ante la consulta de un cliente.
-- Se ejecuta una vez en Supabase: SQL Editor > New query > pegar este archivo > Run.
-- Conviene correrlo después de 0007_presupuestos.sql, así queda el vínculo con el presupuesto original.

create table if not exists servicios (
  id                bigint generated always as identity primary key,
  prestador         text not null check (prestador in ('propio', 'proveedor')),  -- propio = lo hacemos nosotros
  proveedor_id      text references proveedores (id) on delete set null,          -- el parcero, si está dado de alta
  proveedor_nombre  text,                                                         -- el parcero, si no está en proveedores
  categoria         text not null default 'Otro' check (categoria in (
                      'Overhaul', 'Reparación', 'Mano de obra', 'Rectificado', 'Inspección / diagnóstico',
                      'Montaje / instalación', 'Flete / logística', 'Otro')),
  descripcion       text not null,
  marca             text,
  modelo_motor      text,
  equipo            text,                                                         -- motor, reductor, generador, bomba...
  cliente           text,                                                         -- cliente o embarcación
  cliente_id        text,                                                         -- cliente de la base de clientes, si existe
  lugar             text,                                                         -- dónde se hizo o se iba a hacer
  fecha             date,
  cantidad          numeric,
  unidad            text,                                                         -- hora, día, servicio, global...
  precio            numeric,                                                      -- precio por unidad
  moneda            text,
  plazo_dias        integer,
  estado            text not null default 'presupuestado' check (estado in ('presupuestado', 'aprobado', 'realizado', 'perdido')),
  presupuesto_id    bigint,                                                       -- presupuesto histórico del que salió
  origen            text,                                                         -- 'App', 'Presupuesto histórico'...
  notas             text,
  creado_por        uuid default auth.uid() references auth.users (id),
  creado_en         timestamptz not null default now()
);

create index if not exists servicios_descripcion_idx on servicios using gin (lower(descripcion) gin_trgm_ops);
create index if not exists servicios_proveedor_idx on servicios (proveedor_id);
create index if not exists servicios_presupuesto_idx on servicios (presupuesto_id);
create index if not exists servicios_fecha_idx on servicios (fecha desc);

-- Vínculos con el presupuesto original y con la base de clientes, si esas tablas ya existen.
do $$
begin
  if to_regclass('public.presupuestos') is not null
     and not exists (select 1 from pg_constraint where conname = 'servicios_presupuesto_fk') then
    alter table servicios add constraint servicios_presupuesto_fk
      foreign key (presupuesto_id) references presupuestos (id) on delete set null;
  end if;
  if to_regclass('public.clientes') is not null
     and not exists (select 1 from pg_constraint where conname = 'servicios_cliente_fk') then
    alter table servicios add constraint servicios_cliente_fk
      foreign key (cliente_id) references clientes (id) on delete set null;
  end if;
end $$;

-- Igual que el resto: con sesión iniciada se ve y edita todo; sin sesión, nada.
alter table servicios enable row level security;
drop policy if exists "usuarios internos" on servicios;
create policy "usuarios internos" on servicios for all to authenticated using (true) with check (true);
