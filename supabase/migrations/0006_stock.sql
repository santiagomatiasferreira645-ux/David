-- Stock propio: artículos multimarca por PN, guardados en uno o varios depósitos.
-- Se ejecuta una vez en Supabase: SQL Editor > New query > pegar este archivo > Run.
--
-- La cantidad de cada depósito no se escribe a mano: sale de los movimientos (ingreso, egreso,
-- transferencia o ajuste). Cada movimiento suma o resta en stock_existencias con un trigger,
-- así el historial y el saldo nunca se separan.

create table if not exists depositos (
  id         bigint generated always as identity primary key,
  nombre     text not null unique,                 -- ej. "Galpón Zárate", "Taller Asunción"
  ubicacion  text,                                 -- ciudad, país o dirección
  notas      text,
  activo     boolean not null default true,
  creado_en  timestamptz not null default now()
);

create table if not exists stock_articulos (
  id               bigint generated always as identity primary key,
  pn               text not null,
  pn_normalizado   text generated always as (normalizar_pn(pn)) stored,
  marca            text,                           -- nombre principal de la marca (CAT, no Caterpillar)
  descripcion      text,
  modelo_motor     text,
  condicion        text not null default 'Nuevo original'
                   check (condicion in ('Nuevo original', 'Nuevo OEM', 'Alternativo', 'Usado', 'Reacondicionado')),
  costo_unitario   numeric,                        -- lo que nos costó
  precio_venta     numeric,                        -- precio de referencia para el cliente
  moneda           text not null default 'USD',
  notas            text,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);

-- Un mismo PN puede estar como nuevo y como usado, o de dos marcas; pero no repetido igual.
create unique index if not exists stock_articulos_unico_idx
  on stock_articulos (pn_normalizado, lower(coalesce(marca, '')), condicion);
create index if not exists stock_articulos_pn_idx on stock_articulos using gin (pn_normalizado gin_trgm_ops);
create index if not exists stock_articulos_desc_idx on stock_articulos using gin (lower(coalesce(descripcion, '')) gin_trgm_ops);

create table if not exists stock_existencias (
  articulo_id     bigint not null references stock_articulos (id) on delete cascade,
  deposito_id     bigint not null references depositos (id) on delete restrict,
  cantidad        numeric not null default 0 check (cantidad >= 0),
  ubicacion       text,                            -- estante, caja o sector dentro del depósito
  actualizado_en  timestamptz not null default now(),
  primary key (articulo_id, deposito_id)
);

create index if not exists stock_existencias_deposito_idx on stock_existencias (deposito_id);

create table if not exists stock_movimientos (
  id           bigint generated always as identity primary key,
  articulo_id  bigint not null references stock_articulos (id) on delete cascade,
  deposito_id  bigint not null references depositos (id) on delete restrict,
  tipo         text not null check (tipo in ('ingreso', 'egreso', 'transferencia', 'ajuste')),
  cantidad     numeric not null check (cantidad <> 0),   -- positivo entra, negativo sale
  referencia   text,                                     -- remito, factura, cliente, embarcación...
  notas        text,
  fecha        timestamptz not null default now(),
  usuario_id   uuid default auth.uid() references auth.users (id)
);

create index if not exists stock_movimientos_articulo_idx on stock_movimientos (articulo_id, fecha desc);

-- Cada movimiento actualiza el saldo del depósito. Si deja el saldo en negativo, el check de
-- stock_existencias lo rechaza y no se guarda nada (una transferencia va en un solo insert de dos filas).
create or replace function aplicar_movimiento_stock() returns trigger
language plpgsql as $$
begin
  -- Primero se actualiza: un insert con cantidad negativa choca con el check aunque la fila exista.
  update stock_existencias set cantidad = cantidad + new.cantidad, actualizado_en = now()
  where articulo_id = new.articulo_id and deposito_id = new.deposito_id;
  if not found then
    insert into stock_existencias (articulo_id, deposito_id, cantidad)
    values (new.articulo_id, new.deposito_id, new.cantidad)
    on conflict (articulo_id, deposito_id)
    do update set cantidad = stock_existencias.cantidad + excluded.cantidad, actualizado_en = now();
  end if;
  update stock_articulos set actualizado_en = now() where id = new.articulo_id;
  return new;
end $$;

drop trigger if exists movimiento_stock on stock_movimientos;
create trigger movimiento_stock after insert on stock_movimientos
  for each row execute function aplicar_movimiento_stock();

-- Todos los usuarios con sesión iniciada ven y editan todo; sin sesión, nada.
do $$
declare t text;
begin
  foreach t in array array['depositos', 'stock_articulos', 'stock_existencias', 'stock_movimientos'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "usuarios internos" on %I', t);
    execute format('create policy "usuarios internos" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Un primer depósito para empezar; se renombra o se agregan otros desde la app.
insert into depositos (nombre) values ('Depósito principal') on conflict (nombre) do nothing;
