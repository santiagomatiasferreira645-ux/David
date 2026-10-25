-- Fotos de referencia de cada PN, guardadas en Supabase Storage en la carpeta del PN normalizado (ej. 8N7005/1729800000000.jpg).
-- Se ejecuta una vez en Supabase: SQL Editor > New query > pegar este archivo > Run.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imagenes-pn', 'imagenes-pn', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "usuarios internos imagenes pn" on storage.objects for all to authenticated
  using (bucket_id = 'imagenes-pn') with check (bucket_id = 'imagenes-pn');
