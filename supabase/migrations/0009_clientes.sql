-- Clientes, lo que se les presupuestó o vendió y los precios acordados con cada uno.
-- Se ejecuta una vez en Supabase: SQL Editor > New query > pegar este archivo > Run.

create table if not exists clientes (
  id              text primary key,                -- C0001, C0002...
  empresa         text not null,
  razon_social    text,
  ruc             text,                            -- RUC / CUIT / CNPJ
  pais            text,
  ciudad          text,
  tipo            text,                            -- Naviera, Astillero, Minera, Agroindustria, Industria...
  moneda          text not null default 'USD',
  condicion_pago  text,                            -- "Contado", "30 días"...
  margen_pct      numeric check (margen_pct is null or margen_pct > -100),  -- recargo sobre el costo para sugerir precio
  dominios        text,                            -- dominios de mail que lo identifican: "hbsa.com.py, hidroviasdobrasil.com.br"
  notas           text,
  origen          text,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

create table if not exists clientes_contactos (
  id              bigint generated always as identity primary key,
  cliente_id      text not null references clientes (id) on delete cascade,
  nombre          text,
  cargo           text,
  email           text,
  telefono        text,                            -- formato internacional +595981123456
  tiene_whatsapp  text not null default 'No sé' check (tiene_whatsapp in ('Sí', 'No', 'No sé')),
  notas           text,
  origen          text,
  creado_en       timestamptz not null default now()
);

-- Un renglón por PN presupuestado o vendido a un cliente.
create table if not exists ventas (
  id               bigint generated always as identity primary key,
  cliente_id       text not null references clientes (id) on delete cascade,
  fecha            date not null default current_date,
  comprobante      text,                           -- n° de presupuesto o factura
  estado           text not null default 'Vendido' check (estado in ('Presupuestado', 'Vendido', 'Perdido')),
  pn               text,
  pn_normalizado   text generated always as (normalizar_pn(pn)) stored,
  marca            text,
  descripcion      text,
  modelo_motor     text,
  embarcacion      text,
  cantidad         numeric,
  precio_unitario  numeric,
  moneda           text,
  costo_unitario   numeric,                        -- lo que nos cuesta, en la misma moneda
  proveedor_id     text references proveedores (id) on delete set null,
  cotizacion_id    bigint references cotizaciones (id) on delete set null,
  busqueda_id      bigint references busquedas (id) on delete set null,
  plazo_entrega    text,
  notas            text,
  origen           text,                           -- "App", nombre del presupuesto importado...
  creado_por       uuid default auth.uid() references auth.users (id),
  creado_en        timestamptz not null default now()
);

-- Precio pactado con un cliente para un PN (lista especial). Uno vigente por cliente y PN.
create table if not exists precios_cliente (
  id               bigint generated always as identity primary key,
  cliente_id       text not null references clientes (id) on delete cascade,
  pn               text not null,
  pn_normalizado   text generated always as (normalizar_pn(pn)) stored,
  marca            text,
  descripcion      text,
  precio           numeric not null,
  moneda           text not null default 'USD',
  vigente_hasta    date,
  notas            text,
  creado_por       uuid default auth.uid() references auth.users (id),
  creado_en        timestamptz not null default now(),
  unique (cliente_id, pn_normalizado)
);

-- La búsqueda puede quedar atada a un cliente de la base (además del texto libre "cliente").
alter table busquedas add column if not exists cliente_id text references clientes (id) on delete set null;

create index if not exists clientes_empresa_idx on clientes using gin (lower(empresa) gin_trgm_ops);
create index if not exists clientes_contactos_cliente_idx on clientes_contactos (cliente_id);
create index if not exists ventas_cliente_idx on ventas (cliente_id, fecha desc);
create index if not exists ventas_pn_idx on ventas (pn_normalizado);
create index if not exists precios_cliente_pn_idx on precios_cliente (pn_normalizado);

-- Igual que el resto: con sesión iniciada se ve y edita todo; sin sesión, nada.
do $$
declare t text;
begin
  foreach t in array array['clientes', 'clientes_contactos', 'ventas', 'precios_cliente'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "usuarios internos" on %I', t);
    execute format('create policy "usuarios internos" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Presupuestos históricos (0007) y servicios (0008) guardan cliente_id: si esas tablas ya existen, se atan a clientes.
do $$
begin
  if to_regclass('public.presupuestos') is not null
     and not exists (select 1 from pg_constraint where conname = 'presupuestos_cliente_fk') then
    alter table presupuestos add constraint presupuestos_cliente_fk foreign key (cliente_id) references clientes (id) on delete set null;
  end if;
  if to_regclass('public.servicios') is not null
     and not exists (select 1 from pg_constraint where conname = 'servicios_cliente_fk') then
    alter table servicios add constraint servicios_cliente_fk foreign key (cliente_id) references clientes (id) on delete set null;
  end if;
end $$;
