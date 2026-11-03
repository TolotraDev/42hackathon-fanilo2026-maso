-- MASO — Tests des règles de droits et du workflow (exécuter avec : npx supabase test db)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(36);

-- ─── Outils : exécuter une requête en tant qu'utilisateur (null = public anonyme) ──

create function pg_temp.run_as(p_uid uuid, p_sql text)
returns text
language plpgsql
as $$
declare
  v_error text;
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then '{"role":"anon"}' else json_build_object('sub', p_uid, 'role', 'authenticated')::text end,
    true);
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);  -- anciennes versions de auth.uid()
  execute case when p_uid is null then 'set local role anon' else 'set local role authenticated' end;
  begin
    execute p_sql;
  exception when others then
    v_error := sqlerrm;
  end;
  execute 'reset role';
  return v_error;     -- null = succès, sinon message d'erreur
end;
$$;

create function pg_temp.count_as(p_uid uuid, p_sql text)
returns bigint
language plpgsql
as $$
declare
  v_count bigint;
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then '{"role":"anon"}' else json_build_object('sub', p_uid, 'role', 'authenticated')::text end,
    true);
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);  -- anciennes versions de auth.uid()
  execute case when p_uid is null then 'set local role anon' else 'set local role authenticated' end;
  execute format('select count(*) from (%s) q', p_sql) into v_count;
  execute 'reset role';
  return v_count;
end;
$$;

-- ─── Comptes de test ────────────────────────────────────────────────────────

insert into auth.users (id, email, raw_app_meta_data) values
  ('a0000000-0000-4000-8000-000000000001', 'j@test.maso', '{"role":"journalist"}'),
  ('a0000000-0000-4000-8000-000000000002', 'fc@test.maso', '{"role":"fact_checker"}'),
  ('a0000000-0000-4000-8000-000000000003', 'ed1@test.maso', '{"role":"editor_in_chief"}'),
  ('a0000000-0000-4000-8000-000000000004', 'ed2@test.maso', '{"role":"editor_in_chief"}'),
  ('a0000000-0000-4000-8000-000000000005', 'admin@test.maso', '{"role":"admin"}'),
  ('a0000000-0000-4000-8000-000000000006', 'suspendu@test.maso', '{"role":"journalist"}');

-- Un utilisateur ne peut pas s'attribuer un rôle via ses propres métadonnées.
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-4000-8000-000000000007', 'intrus@test.maso', '{"role":"admin"}');

update public.profiles set active = false where id = 'a0000000-0000-4000-8000-000000000006';

select is((select role from public.profiles where id = 'a0000000-0000-4000-8000-000000000007'),
  'journalist'::public.user_role, 'le rôle saisi par l''utilisateur est ignoré à l''inscription');

-- ─── Création d'un dossier ──────────────────────────────────────────────────

select is(pg_temp.run_as('a0000000-0000-4000-8000-000000000001',
  $$insert into public.cases (title, claim) values ('Cas test', 'Antananarivo inondée ce matin')$$),
  null, 'un journaliste crée un dossier');

select is(pg_temp.run_as('a0000000-0000-4000-8000-000000000005',
  $$insert into public.cases (title) values ('Cas admin')$$) is not null,
  true, 'un administrateur ne crée pas de dossier');

create temp table t_case as select id from public.cases where title = 'Cas test';

-- Conditions de soumission d'un verdict (MOD-05) : une source liée, une preuve, une checklist justifiée.
insert into public.sources (id, type, name, created_by)
values ('b1000000-0000-4000-8000-000000000001', 'site', 'Source du cas test', 'a0000000-0000-4000-8000-000000000001');
insert into public.case_sources (case_id, source_id) values ((select id from t_case), 'b1000000-0000-4000-8000-000000000001');
insert into public.evidences (case_id, type, url, added_by)
values ((select id from t_case), 'link', 'https://example.org/photo', 'a0000000-0000-4000-8000-000000000001');
update public.checklist_items set explanation = 'Examiné pendant le test' where case_id = (select id from t_case);
create temp table t_evidence as select array_agg(id) as ids from public.evidences where case_id = (select id from t_case);

-- ─── Workflow : statuts ─────────────────────────────────────────────────────

select is(pg_temp.run_as('a0000000-0000-4000-8000-000000000001',
  format($$select public.change_case_status(%L, 'in_analysis', 'Début de l''analyse')$$, (select id from t_case))),
  null, 'le journaliste lance l''analyse');

select matches(pg_temp.run_as('a0000000-0000-4000-8000-000000000001',
  format($$update public.cases set status = 'published' where id = %L$$, (select id from t_case))),
  'permission denied', 'le statut ne se modifie jamais directement');

select matches(pg_temp.run_as('a0000000-0000-4000-8000-000000000001',
  format($$select public.propose_verdict(%L, 'out_of_context', 'high', 'Photo de 2024', %L)$$, (select id from t_case), (select ids from t_evidence))),
  'role_not_allowed', 'un journaliste ne propose pas de verdict');

select matches(pg_temp.run_as('a0000000-0000-4000-8000-000000000002',
  format($$select public.propose_verdict(%L, 'out_of_context', 'high', '  ', %L)$$, (select id from t_case), (select ids from t_evidence))),
  'justification_required', 'un verdict sans justification est refusé');

select is(pg_temp.run_as('a0000000-0000-4000-8000-000000000002',
  format($$select public.propose_verdict(%L, 'out_of_context', 'high', 'Photo publiée en 2024 [P1]', %L)$$, (select id from t_case), (select ids from t_evidence))),
  null, 'le fact-checker propose un verdict');

select is((select status from public.cases where id = (select id from t_case)),
  'to_review'::public.case_status, 'le dossier passe « à relire »');

select matches(pg_temp.run_as('a0000000-0000-4000-8000-000000000003',
  format($$select public.change_case_status(%L, 'correction_requested', '')$$, (select id from t_case))),
  'reason_required', 'tout changement de statut doit être motivé');

select matches(pg_temp.run_as('a0000000-0000-4000-8000-000000000002',
  format($$select public.change_case_status(%L, 'validated', 'Je valide')$$, (select id from t_case))),
  'transition_not_allowed', 'un fact-checker ne valide pas');

select is(pg_temp.run_as('a0000000-0000-4000-8000-000000000003',
  format($$select public.change_case_status(%L, 'correction_requested', 'Préciser la date')$$, (select id from t_case))),
  null, 'le rédacteur en chef demande une correction');

select is(pg_temp.run_as('a0000000-0000-4000-8000-000000000003',
  format($$select public.propose_verdict(%L, 'out_of_context', 'high', 'Photo publiée en 2024 [P1] [P2]', %L)$$, (select id from t_case), (select ids from t_evidence))),
  null, 'le rédacteur en chef peut aussi proposer un verdict');

select matches(pg_temp.run_as('a0000000-0000-4000-8000-000000000003',
  format($$select public.change_case_status(%L, 'validated', 'Validé')$$, (select id from t_case))),
  'self_validation_forbidden', 'personne ne valide son propre travail');

select is(pg_temp.run_as('a0000000-0000-4000-8000-000000000004',
  format($$select public.change_case_status(%L, 'validated', 'Preuves suffisantes')$$, (select id from t_case))),
  null, 'un autre rédacteur en chef valide');

select matches(pg_temp.run_as('a0000000-0000-4000-8000-000000000001',
  format($$select public.change_case_status(%L, 'published', 'Je publie')$$, (select id from t_case))),
  'transition_not_allowed', 'un journaliste ne peut pas publier');

select matches(pg_temp.run_as('a0000000-0000-4000-8000-000000000003',
  format($$select public.change_case_status(%L, 'published', 'Publication')$$, (select id from t_case))),
  'publish_via_review', 'la publication passe obligatoirement par la revue (signature)');

insert into public.reports (case_id, content, claim_evidence_links)
select id, '{"summary":"Photo ancienne.","explanation":"La photo date de 2024."}',
  jsonb_build_array(jsonb_build_object('text', 'La photo date de 2024', 'evidence_ids', to_jsonb((select ids from t_evidence))))
from t_case;

select is(pg_temp.run_as('a0000000-0000-4000-8000-000000000003',
  format($$select public.editorial_decision(%L, 'validate_publish', 'Publication')$$, (select id from t_case))),
  null, 'le rédacteur en chef publie');

select isnt((select published_at from public.cases where id = (select id from t_case)), null,
  'la publication est horodatée');

select is((select count(*) from public.case_status_history where case_id = (select id from t_case)),
  6::bigint, 'chaque changement de statut est historisé');

select is(pg_temp.run_as('a0000000-0000-4000-8000-000000000001',
  format($$update public.cases set title = 'Modifié' where id = %L$$, (select id from t_case))), null,
  'la mise à jour d''un dossier publié ne lève pas d''erreur…');
select is((select title from public.cases where id = (select id from t_case)), 'Cas test',
  '… mais n''a aucun effet');

-- ─── Visibilité selon le rôle ───────────────────────────────────────────────

select is(pg_temp.count_as('a0000000-0000-4000-8000-000000000005', 'select * from public.cases'), 0::bigint,
  'l''administrateur ne voit pas les dossiers');
select is(pg_temp.count_as('a0000000-0000-4000-8000-000000000006', 'select * from public.cases'), 0::bigint,
  'un compte suspendu ne voit plus rien');
select is(pg_temp.count_as(null, 'select * from public.statistic_indicators'),
  (select count(*) from public.statistic_indicators),
  'le public peut lire toutes les statistiques');
select is(pg_temp.run_as(null,
  $$select public.portal_submit_alert(p_text => 'Rumeur vue sur Facebook', p_platform => 'facebook')$$),
  null, 'le public peut signaler une rumeur sans compte');
select matches(pg_temp.run_as(null, 'select * from public.alerts'),
  'permission denied', 'le public ne lit pas les signalements');

-- ─── Administration ─────────────────────────────────────────────────────────

select matches(pg_temp.run_as('a0000000-0000-4000-8000-000000000001',
  $$select public.admin_set_role('a0000000-0000-4000-8000-000000000002', 'admin')$$),
  'role_not_allowed', 'seul l''administrateur change les rôles');
select matches(pg_temp.run_as('a0000000-0000-4000-8000-000000000005',
  $$select public.admin_set_active('a0000000-0000-4000-8000-000000000005', false)$$),
  'cannot_change_own_account', 'l''administrateur ne peut pas suspendre son propre compte');
select is(pg_temp.run_as('a0000000-0000-4000-8000-000000000005',
  $$select public.admin_set_role('a0000000-0000-4000-8000-000000000007', 'fact_checker')$$),
  null, 'l''administrateur change un rôle');

-- ─── Sources confidentielles ────────────────────────────────────────────────

select is(pg_temp.run_as('a0000000-0000-4000-8000-000000000001', $$
  with s as (insert into public.sources (type, name) values ('person', 'Témoin') returning id)
  select public.set_confidential_source_details((select id from s), 'Téléphone du témoin')
$$), null, 'le journaliste enregistre une source confidentielle');
create temp table t_source as select id from public.sources where name = 'Témoin';
select matches(pg_temp.run_as('a0000000-0000-4000-8000-000000000005',
  format($$select public.get_confidential_source_details(%L)$$, (select id from t_source))),
  'role_not_allowed', 'l''administrateur n''a pas accès aux sources confidentielles');
select is(pg_temp.run_as('a0000000-0000-4000-8000-000000000003',
  format($$select public.get_confidential_source_details(%L)$$, (select id from t_source))),
  null, 'le rédacteur en chef consulte une source confidentielle');

-- ─── Journal d'audit ────────────────────────────────────────────────────────

select ok((select count(*) from public.audit_logs where action = 'read_confidential'
  and user_id = 'a0000000-0000-4000-8000-000000000003') = 1, 'la consultation confidentielle est journalisée');
select ok((select count(*) from public.audit_logs where entity = 'source_confidential' and after is not null) = 0,
  'le contenu confidentiel n''est jamais recopié dans le journal');
select throws_like($$delete from public.audit_logs$$, '%append_only%',
  'le journal d''audit est en ajout seul, même pour le propriétaire de la base');

select * from finish();
rollback;
