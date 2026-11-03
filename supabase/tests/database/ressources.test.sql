-- MASO — Tests MOD-04 : visibilité des coordonnées, validation, droit de retrait, notes privées
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(17);

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

create function pg_temp.value_as(p_uid uuid, p_sql text)
returns text
language plpgsql
as $$
declare
  v_value text;
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then '{"role":"anon"}' else json_build_object('sub', p_uid, 'role', 'authenticated')::text end, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  execute case when p_uid is null then 'set local role anon' else 'set local role authenticated' end;
  execute p_sql into v_value;
  execute 'reset role';
  return v_value;
end;
$$;

insert into auth.users (id, email, raw_app_meta_data) values
  ('e0000000-0000-4000-8000-000000000001', 'j@res.maso', '{"role":"journalist"}'),
  ('e0000000-0000-4000-8000-000000000002', 'j2@res.maso', '{"role":"journalist"}'),
  ('e0000000-0000-4000-8000-000000000003', 'ed@res.maso', '{"role":"editor_in_chief"}'),
  ('e0000000-0000-4000-8000-000000000004', 'admin@res.maso', '{"role":"admin"}');

insert into public.resource_people (id, full_name, domains, phone, email, visibility, consent, validated, active, created_by) values
  ('f0000000-0000-4000-8000-000000000001', 'Expert équipe', '{météo}', '+261 34 11 111 11', 'equipe@exemple.mg', 'team', true, true, true, 'e0000000-0000-4000-8000-000000000003'),
  ('f0000000-0000-4000-8000-000000000002', 'Expert privé', '{santé}', '+261 34 22 222 22', 'prive@exemple.mg', 'private', true, true, true, 'e0000000-0000-4000-8000-000000000003'),
  ('f0000000-0000-4000-8000-000000000003', 'Sans consentement', '{économie}', '+261 34 33 333 33', null, 'team', false, false, true, 'e0000000-0000-4000-8000-000000000003');

-- ─── Visibilité ─────────────────────────────────────────────────────────────

select is(pg_temp.value_as('e0000000-0000-4000-8000-000000000001',
  $$select phone from public.resource_people_directory where full_name = 'Expert équipe'$$),
  '+261 34 11 111 11', 'visibilité « équipe » : le journaliste voit les coordonnées');
select is(pg_temp.value_as('e0000000-0000-4000-8000-000000000001',
  $$select coalesce(phone, 'masqué') from public.resource_people_directory where full_name = 'Expert privé'$$),
  'masqué', 'visibilité « privée » : coordonnées masquées pour le journaliste');
select is(pg_temp.value_as('e0000000-0000-4000-8000-000000000003',
  $$select phone from public.resource_people_directory where full_name = 'Expert privé'$$),
  '+261 34 22 222 22', 'le rédacteur en chef voit les coordonnées privées');
select is(pg_temp.value_as('e0000000-0000-4000-8000-000000000001',
  $$select count(*)::text from public.resource_people$$),
  '0', 'le journaliste ne lit pas la table brute (contournement impossible)');
select is(pg_temp.value_as('e0000000-0000-4000-8000-000000000001',
  $$select count(*)::text from public.resource_people_directory where full_name = 'Sans consentement'$$),
  '0', 'une personne sans consentement n''apparaît pas dans l''annuaire');
select matches(pg_temp.run_as(null, 'select * from public.resource_people_directory'),
  'permission denied', 'le public n''accède pas à l''annuaire de l''équipe');

-- ─── Proposition et validation ──────────────────────────────────────────────

select is(pg_temp.run_as('e0000000-0000-4000-8000-000000000001', $$
  insert into public.resource_people (full_name, domains, visibility, consent, consent_at)
  values ('Proposition', '{climat}', 'team', true, now())
$$), null, 'un journaliste propose une personne');
select is(pg_temp.value_as('e0000000-0000-4000-8000-000000000002',
  $$select count(*)::text from public.resource_people_directory where full_name = 'Proposition'$$),
  '0', 'la proposition n''est pas visible avant validation');
select matches(pg_temp.run_as('e0000000-0000-4000-8000-000000000001',
  format($$select public.validate_resource_person(%L)$$, (select id from public.resource_people where full_name = 'Proposition'))),
  'role_not_allowed', 'un journaliste ne valide pas');
select matches(pg_temp.run_as('e0000000-0000-4000-8000-000000000003',
  $$select public.validate_resource_person('f0000000-0000-4000-8000-000000000003')$$),
  'consent_required', 'on ne valide pas une personne qui n''a pas consenti');
select is(pg_temp.run_as('e0000000-0000-4000-8000-000000000003',
  format($$select public.validate_resource_person(%L)$$, (select id from public.resource_people where full_name = 'Proposition'))),
  null, 'le rédacteur en chef valide');
select is(pg_temp.value_as('e0000000-0000-4000-8000-000000000002',
  $$select count(*)::text from public.resource_people_directory where full_name = 'Proposition'$$),
  '1', 'après validation, toute l''équipe la voit');

-- ─── Droit de retrait ───────────────────────────────────────────────────────

select is(pg_temp.run_as('e0000000-0000-4000-8000-000000000003',
  $$select public.withdraw_resource_person('f0000000-0000-4000-8000-000000000001')$$),
  null, 'droit de retrait exercé');
select is((select coalesce(phone, '') || coalesce(email, '') from public.resource_people where id = 'f0000000-0000-4000-8000-000000000001'),
  '', 'les coordonnées sont effacées');
select is((select count(*) from public.audit_logs where entity = 'resource_people'
  and (before ? 'phone' or after ? 'phone' or before ? 'email' or after ? 'email')),
  0::bigint, 'le journal d''audit ne conserve aucune coordonnée');

-- ─── Notes privées ──────────────────────────────────────────────────────────

select pg_temp.run_as('e0000000-0000-4000-8000-000000000001', $$
  insert into public.resource_person_notes (person_id, favorite, note) values ('f0000000-0000-4000-8000-000000000002', true, 'Joignable le matin')
$$);
select is(pg_temp.value_as('e0000000-0000-4000-8000-000000000002',
  $$select count(*)::text from public.resource_person_notes$$),
  '0', 'les notes et favoris d''un journaliste sont invisibles pour les autres');

select is(pg_temp.run_as('e0000000-0000-4000-8000-000000000004',
  $$insert into public.sources (type, name, url) values ('media', 'Média ajouté par l''admin', 'https://media.example')$$),
  null, 'l''administrateur gère l''annuaire des médias et sources');

select * from finish();
rollback;
