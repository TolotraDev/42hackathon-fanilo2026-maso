-- MASO — Médias dans le rapport public : obligatoires pour publier, seuls fichiers publics lisibles par tous
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(6);

create function pg_temp.run_as(p_uid uuid, p_sql text)
returns text
language plpgsql
as $$
declare
  v_error text;
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then '{"role":"anon"}' else json_build_object('sub', p_uid, 'role', 'authenticated')::text end, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  execute case when p_uid is null then 'set local role anon' else 'set local role authenticated' end;
  begin
    execute p_sql;
  exception when others then
    v_error := sqlerrm;
  end;
  execute 'reset role';
  return v_error;
end;
$$;

create function pg_temp.count_as(p_uid uuid, p_sql text)
returns bigint
language plpgsql
as $$
declare
  v bigint;
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then '{"role":"anon"}' else json_build_object('sub', p_uid, 'role', 'authenticated')::text end, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  execute case when p_uid is null then 'set local role anon' else 'set local role authenticated' end;
  execute p_sql into v;
  execute 'reset role';
  return v;
end;
$$;

insert into auth.users (id, email, raw_app_meta_data) values
  ('ae000000-0000-4000-8000-000000000001', 'fc@medias.maso', '{"role":"fact_checker"}'),
  ('ae000000-0000-4000-8000-000000000002', 'ec@medias.maso', '{"role":"editor_in_chief"}');

insert into public.cases (id, title, claim, status, verdict, confidence, justification, proposed_by, created_by)
values ('ca800000-0000-4000-8000-000000000001', 'Pont effondré', 'Le pont de Mahitsy est effondré', 'to_review', 'fabricated', 'high',
        'Image générée par IA.', 'ae000000-0000-4000-8000-000000000001', 'ae000000-0000-4000-8000-000000000001');
insert into public.evidences (id, case_id, type, storage_path, sha256, origin, added_by) values
  ('e8000000-0000-4000-8000-000000000001', 'ca800000-0000-4000-8000-000000000001', 'image', 'ca800000/photo-publique.jpg', repeat('cd', 32), 'Signalement', 'ae000000-0000-4000-8000-000000000001'),
  ('e8000000-0000-4000-8000-000000000002', 'ca800000-0000-4000-8000-000000000001', 'image', 'ca800000/photo-privee.jpg', repeat('ef', 32), 'Source confidentielle', 'ae000000-0000-4000-8000-000000000001');
insert into public.evidences (id, case_id, type, analysis, origin, added_by) values
  ('e8000000-0000-4000-8000-000000000003', 'ca800000-0000-4000-8000-000000000001', 'analysis', '{"kind":"auto_report"}', 'Rapport d''analyse', 'ae000000-0000-4000-8000-000000000001');
insert into storage.objects (bucket_id, name) values ('evidences', 'ca800000/photo-publique.jpg'), ('evidences', 'ca800000/photo-privee.jpg');

-- Rapport qui ne montre au public que le rapport d'analyse : pas de média.
insert into public.reports (case_id, content, claim_evidence_links) values ('ca800000-0000-4000-8000-000000000001',
  '{"summary":"Image fabriquée.","explanation":"Générée par IA.","method":"C2PA.","public_evidence_ids":["e8000000-0000-4000-8000-000000000003"]}',
  '[{"text":"Le certificat indique une IA.","evidence_ids":["e8000000-0000-4000-8000-000000000003"]}]');

select ok(pg_temp.run_as('ae000000-0000-4000-8000-000000000002',
  $$select public.editorial_decision('ca800000-0000-4000-8000-000000000001', 'validate_publish', 'Je publie')$$) like '%publication_blocked%',
  'sans photo, vidéo ou lien public, la publication est bloquée');

update public.reports set content = jsonb_set(content, '{public_evidence_ids}',
  '["e8000000-0000-4000-8000-000000000001","e8000000-0000-4000-8000-000000000003"]')
where case_id = 'ca800000-0000-4000-8000-000000000001';

select is(pg_temp.count_as(null, $$select count(*) from storage.objects where bucket_id = 'evidences'$$), 0::bigint,
  'avant publication, le public ne lit aucun fichier');

select is(pg_temp.run_as('ae000000-0000-4000-8000-000000000002',
  $$select public.editorial_decision('ca800000-0000-4000-8000-000000000001', 'validate_publish', 'Je publie')$$),
  null, 'avec une photo publique, le rapport est publié');

select is((select signed_payload -> 'evidences' -> 0 ->> 'storage_path' from public.reports where case_id = 'ca800000-0000-4000-8000-000000000001'),
  'ca800000/photo-publique.jpg', 'le rapport signé contient le fichier de la photo');

select is(pg_temp.count_as(null, $$select count(*) from storage.objects where bucket_id = 'evidences' and name = 'ca800000/photo-publique.jpg'$$), 1::bigint,
  'le public lit la photo montrée dans le rapport publié');

select is(pg_temp.count_as(null, $$select count(*) from storage.objects where bucket_id = 'evidences' and name = 'ca800000/photo-privee.jpg'$$), 0::bigint,
  'la preuve non publique reste privée');

select * from finish();
rollback;
