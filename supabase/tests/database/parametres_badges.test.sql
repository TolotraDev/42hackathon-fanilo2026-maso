-- MASO — Paramètres (W13) et badges QR (M14, W12, W0) (exécuter avec : npx supabase test db)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(11);

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

insert into auth.users (id, email, raw_app_meta_data) values
  ('b0000000-0000-4000-8000-000000000001', 'j@test.maso', '{"role":"journalist"}'),
  ('b0000000-0000-4000-8000-000000000005', 'admin@test.maso', '{"role":"admin"}');
update public.profiles set full_name = 'Journaliste Test' where id = 'b0000000-0000-4000-8000-000000000001';

-- ─── Paramètres ─────────────────────────────────────────────────────────────

select is(pg_temp.run_as('b0000000-0000-4000-8000-000000000005',
  $$insert into public.app_settings (key, value) values ('veille_sources', '["https://example.org/rss"]')$$),
  null, 'l''administrateur enregistre les sources de veille');

select isnt(pg_temp.run_as('b0000000-0000-4000-8000-000000000001',
  $$insert into public.app_settings (key, value) values ('templates', '{}')$$),
  null, 'un journaliste ne modifie pas les paramètres');

select ok(exists(select 1 from public.audit_logs where entity = 'app_settings' and entity_id = 'veille_sources'),
  'le changement de paramètre est journalisé avec sa clé');

-- ─── Badges ─────────────────────────────────────────────────────────────────

select isnt(pg_temp.run_as('b0000000-0000-4000-8000-000000000001',
  $$select public.admin_issue_badge('b0000000-0000-4000-8000-000000000001', current_date + 365)$$),
  null, 'un journaliste ne s''émet pas de badge lui-même');

select is(pg_temp.run_as('b0000000-0000-4000-8000-000000000005',
  $$select public.admin_issue_badge('b0000000-0000-4000-8000-000000000001', current_date + 365)$$),
  null, 'l''administrateur émet un badge');

select isnt(pg_temp.run_as('b0000000-0000-4000-8000-000000000005',
  $$select public.admin_issue_badge('b0000000-0000-4000-8000-000000000005', current_date + 365)$$),
  null, 'un administrateur n''a pas de badge de journaliste');

select ok((select badge_code like 'MB-%' from public.profiles where id = 'b0000000-0000-4000-8000-000000000001'),
  'le code du badge est généré');

select is((public.portal_verify_badge((select badge_code from public.profiles where id = 'b0000000-0000-4000-8000-000000000001')) ->> 'status'),
  'valid', 'le public vérifie un badge valide');

select is((public.portal_verify_badge('MB-INCONNU') ->> 'found')::boolean, false, 'un code inconnu n''est pas trouvé');

select is(pg_temp.run_as('b0000000-0000-4000-8000-000000000005',
  $$select public.admin_revoke_badge('b0000000-0000-4000-8000-000000000001')$$),
  null, 'l''administrateur révoque le badge');

select is((public.portal_verify_badge((select badge_code from public.profiles where id = 'b0000000-0000-4000-8000-000000000001')) ->> 'status'),
  'revoked', 'un badge révoqué est signalé comme tel');

select * from finish();
rollback;
