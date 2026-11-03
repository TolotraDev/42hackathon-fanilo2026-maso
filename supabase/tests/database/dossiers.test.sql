-- MASO — Tests MOD-05 : checklist guidée, règles de soumission du verdict, création hors ligne
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(13);

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

create function pg_temp.blockers_as(p_uid uuid, p_case uuid, p_evidence uuid[] default null)
returns text
language plpgsql
as $$
declare
  v text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  execute 'set local role authenticated';
  select array_to_string(public.verdict_blockers(p_case, p_evidence), ',') into v;
  execute 'reset role';
  return v;
end;
$$;

create function pg_temp.rows_after_update(p_uid uuid, p_sql text)
returns setof uuid
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  execute 'set local role authenticated';
  return query execute p_sql;
  execute 'reset role';
end;
$$;

insert into auth.users (id, email, raw_app_meta_data) values
  ('d1000000-0000-4000-8000-000000000001', 'j@dossiers.maso', '{"role":"journalist"}'),
  ('d1000000-0000-4000-8000-000000000002', 'fc@dossiers.maso', '{"role":"fact_checker"}');

-- ─── Création hors ligne : l'identifiant choisi par l'appareil est conservé ─

select is(pg_temp.run_as('d1000000-0000-4000-8000-000000000001', $$
  insert into public.cases (id, title) values ('c1000000-0000-4000-8000-000000000001', 'Créé hors ligne')
$$), null, 'un dossier créé hors ligne garde son identifiant');

-- ─── Checklist guidée ───────────────────────────────────────────────────────

select is((select count(*) from public.checklist_items where case_id = 'c1000000-0000-4000-8000-000000000001'),
  17::bigint, 'la checklist du cahier des charges (17 questions) est créée automatiquement');
select is((select array_agg(distinct block::text order by block::text) from public.checklist_items where case_id = 'c1000000-0000-4000-8000-000000000001'),
  array['adversarial', 'content', 'context', 'origin', 'sources'], 'les blocs Origine, Contexte, Contenu, Sources, Contradictoire sont présents');
select matches(pg_temp.run_as('d1000000-0000-4000-8000-000000000001', $$
  update public.checklist_items set state = 'done' where case_id = 'c1000000-0000-4000-8000-000000000001' and question = 'origin.first_publisher'
$$), 'check constraint', 'un point « fait » sans preuve liée est refusé');

-- ─── Règles de soumission ───────────────────────────────────────────────────

select is(pg_temp.blockers_as('d1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001'),
  'claim_missing,source_missing,evidence_missing,checklist_unjustified', 'dossier vide : les 4 blocages sont signalés');
select is(pg_temp.run_as('d1000000-0000-4000-8000-000000000002', $$
  select public.change_case_status('c1000000-0000-4000-8000-000000000001', 'in_analysis', 'Début de l''analyse')
$$), null, 'le fact-checker lance l''analyse');

update public.cases set claim = 'Antananarivo inondée ce matin' where id = 'c1000000-0000-4000-8000-000000000001';
insert into public.sources (id, type, name) values ('51000000-0000-4000-8000-000000000001', 'page', 'Page source');
insert into public.case_sources values ('c1000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001');
insert into public.evidences (id, case_id, type, url, added_by)
values ('e1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'link', 'https://example.org/archive', 'd1000000-0000-4000-8000-000000000001');

select is(pg_temp.blockers_as('d1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', '{e1000000-0000-4000-8000-000000000001}'),
  'checklist_unjustified', 'reste seulement la checklist non justifiée');
select matches(pg_temp.run_as('d1000000-0000-4000-8000-000000000002', $$
  select public.propose_verdict('c1000000-0000-4000-8000-000000000001', 'out_of_context', 'high', 'Photo de 2024 [P1].', '{e1000000-0000-4000-8000-000000000001}')
$$), 'submission_blocked', 'le serveur refuse la soumission tant que la checklist n''est pas justifiée');

-- Points traités : un fait (avec preuve), les autres non applicables ou expliqués
update public.checklist_items set state = 'done', evidence_ids = '{e1000000-0000-4000-8000-000000000001}'
where case_id = 'c1000000-0000-4000-8000-000000000001' and question = 'content.reverse_search';
update public.checklist_items set state = 'not_applicable'
where case_id = 'c1000000-0000-4000-8000-000000000001' and block = 'content' and question <> 'content.reverse_search';
update public.checklist_items set explanation = 'Pas encore possible : auteur injoignable.'
where case_id = 'c1000000-0000-4000-8000-000000000001' and state = 'todo';

select is(pg_temp.blockers_as('d1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001',
  '{e9999999-0000-4000-8000-000000000009}'),
  'evidence_missing', 'une preuve qui n''appartient pas au dossier ne compte pas');
select is(pg_temp.run_as('d1000000-0000-4000-8000-000000000002', $$
  select public.propose_verdict('c1000000-0000-4000-8000-000000000001', 'out_of_context', 'high', 'Photo de 2024 [P1].', '{e1000000-0000-4000-8000-000000000001}')
$$), null, 'toutes les conditions remplies : le verdict est proposé');
select is((select status from public.cases where id = 'c1000000-0000-4000-8000-000000000001'), 'to_review'::public.case_status,
  'le dossier passe « à relire »');
select is((select justification_evidence_ids from public.cases where id = 'c1000000-0000-4000-8000-000000000001'),
  '{e1000000-0000-4000-8000-000000000001}'::uuid[], 'les preuves citées par la justification sont enregistrées');
update public.cases set status = 'validated' where id = 'c1000000-0000-4000-8000-000000000001';

select is((select count(*) from pg_temp.rows_after_update('d1000000-0000-4000-8000-000000000001',
  $$update public.checklist_items set explanation = 'modifié après coup' where case_id = 'c1000000-0000-4000-8000-000000000001' returning id$$)),
  0::bigint, 'la checklist d''un dossier soumis puis validé est verrouillée par le serveur');

select * from finish();
rollback;
