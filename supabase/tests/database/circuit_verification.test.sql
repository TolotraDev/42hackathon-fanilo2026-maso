-- MASO — Circuit de vérification : journaliste → fact-checker (« À vérifier ») → rédacteur en chef
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

insert into auth.users (id, email, raw_app_meta_data) values
  ('c7000000-0000-4000-8000-000000000001', 'j@circuit.maso', '{"role":"journalist"}'),
  ('c7000000-0000-4000-8000-000000000002', 'fc@circuit.maso', '{"role":"fact_checker"}'),
  ('c7000000-0000-4000-8000-000000000003', 'ec@circuit.maso', '{"role":"editor_in_chief"}');

insert into public.cases (id, title, claim, created_by)
values ('ca700000-0000-4000-8000-000000000001', 'Pont effondré', 'Cette photo montre le pont de Mahitsy effondré hier',
        'c7000000-0000-4000-8000-000000000001');
insert into public.sources (id, type, name) values ('5c700000-0000-4000-8000-000000000001', 'page', 'Page virale');
insert into public.case_sources values ('ca700000-0000-4000-8000-000000000001', '5c700000-0000-4000-8000-000000000001');
insert into public.evidences (id, case_id, type, analysis, origin, added_by) values
  ('e7000000-0000-4000-8000-000000000001', 'ca700000-0000-4000-8000-000000000001', 'analysis',
   '{"kind":"auto_report","version":1,"vigilance":"high","items":[]}', 'Rapport d''analyse', 'c7000000-0000-4000-8000-000000000001');
update public.checklist_items set explanation = 'Traité pendant le test' where case_id = 'ca700000-0000-4000-8000-000000000001';

-- 1. Le journaliste met en analyse, puis valide son rapport : il part au fact-checker.
select is(pg_temp.run_as('c7000000-0000-4000-8000-000000000001',
  $$select public.change_case_status('ca700000-0000-4000-8000-000000000001', 'in_analysis', 'Mise en analyse')$$),
  null, 'le journaliste met le dossier en analyse');
select is(pg_temp.run_as('c7000000-0000-4000-8000-000000000001',
  $$select public.change_case_status('ca700000-0000-4000-8000-000000000001', 'to_verify', 'Analyse validée')$$),
  null, 'le journaliste envoie son rapport validé au fact-checker');
select is((select status::text from public.cases where id = 'ca700000-0000-4000-8000-000000000001'), 'to_verify', 'le dossier est « À vérifier »');
select is((select count(*) from public.notifications where user_id = 'c7000000-0000-4000-8000-000000000002' and kind = 'analysis_submitted'),
  1::bigint, 'le fact-checker est prévenu');

-- 2. Le journaliste ne peut ni conclure ni s'auto-envoyer au rédacteur en chef.
select ok(pg_temp.run_as('c7000000-0000-4000-8000-000000000001',
  $$select public.change_case_status('ca700000-0000-4000-8000-000000000001', 'to_review', 'Raccourci')$$) is not null,
  'le journaliste ne peut pas sauter la vérification');
select ok(pg_temp.run_as('c7000000-0000-4000-8000-000000000001',
  $$select public.propose_verdict('ca700000-0000-4000-8000-000000000001', 'fabricated', 'high', 'Note', '{e7000000-0000-4000-8000-000000000001}')$$) like '%role_not_allowed%',
  'le journaliste ne propose pas de verdict');

-- 3. Le fact-checker renvoie au journaliste avec un motif.
select is(pg_temp.run_as('c7000000-0000-4000-8000-000000000002',
  $$select public.change_case_status('ca700000-0000-4000-8000-000000000001', 'correction_requested', 'Recherche inversée manquante')$$),
  null, 'le fact-checker renvoie l''analyse au journaliste');
select is((select body from public.notifications where user_id = 'c7000000-0000-4000-8000-000000000001' and kind = 'correction_requested'),
  'Recherche inversée manquante', 'le journaliste reçoit le motif');

-- 4. Le journaliste corrige et renvoie ; le fact-checker envoie au rédacteur en chef avec verdict et note.
select is(pg_temp.run_as('c7000000-0000-4000-8000-000000000001',
  $$select public.change_case_status('ca700000-0000-4000-8000-000000000001', 'to_verify', 'Recherche inversée faite')$$),
  null, 'le journaliste renvoie l''analyse corrigée');
select is(pg_temp.run_as('c7000000-0000-4000-8000-000000000002',
  $$select public.propose_verdict('ca700000-0000-4000-8000-000000000001', 'fabricated', 'high', 'Le certificat C2PA indique une image générée par IA.', '{e7000000-0000-4000-8000-000000000001}')$$),
  null, 'le fact-checker envoie au rédacteur en chef avec son verdict');
select is((select status::text from public.cases where id = 'ca700000-0000-4000-8000-000000000001'), 'to_review', 'le dossier est « À relire »');
select is((select count(*) from public.notifications where user_id = 'c7000000-0000-4000-8000-000000000003' and kind = 'review_requested'),
  1::bigint, 'le rédacteur en chef est prévenu');

select * from finish();
rollback;
