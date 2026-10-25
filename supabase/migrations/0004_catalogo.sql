-- Catálogos de repuestos (manuales de fábrica): cada PN con su descripción, lista de partes y página del PDF.
-- Se ejecuta una vez en Supabase: SQL Editor > New query > pegar este archivo > Run.
-- Los datos de cada catálogo se cargan aparte (no van en el repositorio).

create table catalogo_pn (
  id              bigint generated always as identity primary key,
  catalogo        text not null,                 -- ej. "EMD 645 · Catálogo 302"
  archivo         text not null,                 -- PDF en Storage, bucket "catalogos"
  pn              text not null,
  pn_normalizado  text generated always as (normalizar_pn(pn)) stored,
  descripcion     text,
  lista           text,                          -- lista de partes (P.L.), ej. "B18"
  titulo          text,                          -- título de la lista de partes
  pagina          int,                           -- página del PDF
  nota            text                           -- ej. "8215737 reemplazado por 9525737"
);

create index catalogo_pn_pn_idx on catalogo_pn (pn_normalizado);

alter table catalogo_pn enable row level security;
create policy "usuarios internos" on catalogo_pn for all to authenticated using (true) with check (true);

-- PDFs de los catálogos (privados; se suben desde Storage en el panel de Supabase).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalogos', 'catalogos', false, 52428800, array['application/pdf']);

create policy "usuarios internos catalogos" on storage.objects for all to authenticated
  using (bucket_id = 'catalogos') with check (bucket_id = 'catalogos');
