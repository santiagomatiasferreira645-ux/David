-- Listados de stock en PDF que se mandan a clientes por WhatsApp o mail: el PDF se guarda acá y el
-- cliente lo abre con un link firmado que vence a los 7 días (el espacio es privado).
-- Se ejecuta una vez en Supabase: SQL Editor > New query > pegar este archivo > Run (se puede volver a correr).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listados', 'listados', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "usuarios internos listados" on storage.objects;
create policy "usuarios internos listados" on storage.objects for all to authenticated
  using (bucket_id = 'listados') with check (bucket_id = 'listados');
