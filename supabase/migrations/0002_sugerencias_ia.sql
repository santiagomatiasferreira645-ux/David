-- Proveedores alternativos que encontró la búsqueda con IA, guardados para no repetir la consulta (y su costo).
-- Se ejecuta una vez en Supabase: SQL Editor > New query > pegar este archivo > Run.

create table sugerencias_ia (
  id              bigint generated always as identity primary key,
  busqueda_id     bigint references busquedas (id) on delete set null,
  pn              text not null,
  pn_normalizado  text generated always as (normalizar_pn(pn)) stored,
  marca           text,
  proveedores     jsonb not null default '[]'::jsonb,  -- lista devuelta por la IA
  modelo          text,
  usuario_id      uuid default auth.uid() references auth.users (id),
  creado_en       timestamptz not null default now()
);

create index sugerencias_ia_pn_idx on sugerencias_ia (pn_normalizado, creado_en desc);

alter table sugerencias_ia enable row level security;
create policy "usuarios internos" on sugerencias_ia for all to authenticated using (true) with check (true);
