-- Catálogos cargados desde la app: el PDF se lee página por página con IA y los PN van a catalogo_pn.
-- Se ejecuta una vez en Supabase: SQL Editor > New query > pegar este archivo > Run.

create table if not exists catalogos (
  id                bigint generated always as identity primary key,
  nombre            text not null unique,          -- ej. "CAT 3516 · Parts Manual"; es el valor de catalogo_pn.catalogo
  archivo           text not null,                 -- PDF en Storage, bucket "catalogos"
  paginas           int,
  pagina_procesada  int not null default 0,        -- hasta qué página se leyó, para retomar si se corta
  estado            text not null default 'procesando' check (estado in ('procesando', 'listo')),
  creado_en         timestamptz not null default now()
);

alter table catalogos enable row level security;
drop policy if exists "usuarios internos" on catalogos;
create policy "usuarios internos" on catalogos for all to authenticated using (true) with check (true);

create index if not exists catalogo_pn_catalogo_idx on catalogo_pn (catalogo, pagina);

-- El catálogo EMD 645 ya cargado.
insert into catalogos (nombre, archivo, paginas, pagina_procesada, estado)
values ('EMD 645 · Catálogo 302', 'emd-645-catalogo-302.pdf', 586, 586, 'listo')
on conflict (nombre) do nothing;
