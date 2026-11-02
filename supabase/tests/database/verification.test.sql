-- MASO — Tests MOD-03 : images déjà vues, score des sources, validation des sources
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

create function pg_temp.run_as(p_uid uuid, p_sql text)
returns text
language plpgsql
as $$
declare
  v_error text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  execute 'set local role authenticated';
  begin
    execute p_sql;
  exception when others then
    v_error := sqlerrm;
  end;
  execute 'reset role';
  return v_error;
end;
$$;

create function pg_temp.rows_as(p_uid uuid, p_sql text)
returns setof jsonb
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  execute 'set local role authenticated';
  return query execute format('select to_jsonb(q) from (%s) q', p_sql);
  execute 'reset role';
end;
$$;

insert into auth.users (id, email, raw_app_meta_data) values
  ('c0000000-0000-4000-8000-000000000001', 'j@verif.maso', '{"role":"journalist"}'),
  ('c0000000-0000-4000-8000-000000000002', 'ed@verif.maso', '{"role":"editor_in_chief"}'),
  ('c0000000-0000-4000-8000-000000000003', 'admin@verif.maso', '{"role":"admin"}');

-- Un dossier et une preuve image (empreinte connue)
insert into public.cases (id, title, created_by)
values ('d0000000-0000-4000-8000-000000000001', 'Inondation 2024', 'c0000000-0000-4000-8000-000000000001');
insert into public.evidences (case_id, type, storage_path, sha256, phash, added_by)
values ('d0000000-0000-4000-8000-000000000001', 'image', 'd0000000/photo.jpg',
        'aaaa', 'f0f0f0f0f0f0f0f0', 'c0000000-0000-4000-8000-000000000001');

-- ─── Déjà vu ? ──────────────────────────────────────────────────────────────

select is(
  (select count(*) from pg_temp.rows_as('c0000000-0000-4000-8000-000000000001',
    $$select * from public.find_similar_images('autre', 'f0f0f0f0f0f0f0f1')$$)),
  1::bigint, 'une image presque identique (1 bit d''écart) est retrouvée');
select is(
  (select r ->> 'distance' from pg_temp.rows_as('c0000000-0000-4000-8000-000000000001',
    $$select * from public.find_similar_images('autre', 'f0f0f0f0f0f0f0f1')$$) r),
  '1', 'la distance est le nombre de bits différents');
select is(
  (select (r ->> 'exact')::boolean from pg_temp.rows_as('c0000000-0000-4000-8000-000000000001',
    $$select * from public.find_similar_images('aaaa', '0000000000000000')$$) r),
  true, 'le même fichier (SHA-256) est reconnu comme identique');
select is(
  (select count(*) from pg_temp.rows_as('c0000000-0000-4000-8000-000000000001',
    $$select * from public.find_similar_images('autre', '0f0f0f0f0f0f0f0f')$$)),
  0::bigint, 'une image différente n''est pas retrouvée');
select is(
  (select count(*) from pg_temp.rows_as('c0000000-0000-4000-8000-000000000003',
    $$select * from public.find_similar_images('aaaa', 'f0f0f0f0f0f0f0f0')$$)),
  0::bigint, 'l''administrateur ne voit pas les preuves des dossiers');

-- ─── Score de fiabilité des sources ─────────────────────────────────────────

select is(pg_temp.run_as('c0000000-0000-4000-8000-000000000001', $$
  insert into public.sources (type, name, url, criteria) values ('site', 'Info Flash', 'https://www.infoflash.example/article/1',
    '{"identity": {"score": 0, "justification": "Aucune mention légale"}, "seniority": {"score": 1, "justification": "Domaine créé il y a 8 mois"}}')
$$), null, 'un journaliste crée une fiche source avec critères justifiés');
select is((select score from public.sources where name = 'Info Flash'), 2.5::numeric,
  'le score est calculé par le serveur : (0 + 1) / 4 × 10 = 2,5');
select is((select domain from public.sources where name = 'Info Flash'), 'infoflash.example',
  'le domaine est extrait de l''adresse');
select matches(pg_temp.run_as('c0000000-0000-4000-8000-000000000001', $$
  insert into public.sources (type, name, criteria) values ('page', 'Sans justification', '{"identity": {"score": 2, "justification": " "}}')
$$), 'justification_required', 'un critère noté sans justification est refusé');
select matches(pg_temp.run_as('c0000000-0000-4000-8000-000000000001', $$
  insert into public.sources (type, name, criteria) values ('page', 'Critère inventé', '{"popularite": {"score": 2, "justification": "Beaucoup de likes"}}')
$$), 'unknown_criterion', 'seuls les 8 critères du cahier des charges sont acceptés');

-- ─── Mention « vérifiée » ───────────────────────────────────────────────────

select matches(pg_temp.run_as('c0000000-0000-4000-8000-000000000001',
  format($$select public.verify_source(%L, true)$$, (select id from public.sources where name = 'Info Flash'))),
  'role_not_allowed', 'un journaliste ne peut pas marquer une source comme vérifiée');
select is(pg_temp.run_as('c0000000-0000-4000-8000-000000000002',
  format($$select public.verify_source(%L, true)$$, (select id from public.sources where name = 'Info Flash'))),
  null, 'le rédacteur en chef valide la fiche source');

select * from finish();
rollback;
