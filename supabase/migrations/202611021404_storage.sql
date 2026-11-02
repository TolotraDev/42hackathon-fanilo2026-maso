-- MASO — Stockage privé des preuves (fichiers originaux jamais modifiés)
-- Limite : 100 Mo par fichier (vidéo) ; la limite image de 20 Mo est appliquée côté interface.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidences', 'evidences', false, 104857600, array['image/*', 'video/*', 'application/pdf'])
on conflict (id) do nothing;

-- Lecture et ajout par l'équipe éditoriale ; aucune modification ni suppression.
create policy "preuves : lecture équipe" on storage.objects for select to authenticated
  using (bucket_id = 'evidences' and public.is_staff());
create policy "preuves : ajout équipe" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidences' and public.is_staff());
