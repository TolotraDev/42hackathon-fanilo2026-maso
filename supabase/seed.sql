-- MASO — Données de démonstration (fictives, aucune donnée personnelle réelle)
-- Un compte par rôle, mot de passe commun : Maso2026!demo  (à ne jamais utiliser en production)

insert into public.newsrooms (id, name, type, region)
values ('00000000-0000-4000-a000-000000000001', 'Rédaction démo MASO', 'online', 'Analamanga');

with demo (id, email, full_name, role) as (
  values
    ('00000000-0000-4000-b000-000000000001'::uuid, 'journaliste@maso.demo', 'Démo Journaliste', 'journalist'),
    ('00000000-0000-4000-b000-000000000002'::uuid, 'factchecker@maso.demo', 'Démo Fact-checker', 'fact_checker'),
    ('00000000-0000-4000-b000-000000000003'::uuid, 'redaction@maso.demo', 'Démo Rédaction en chef', 'editor_in_chief'),
    ('00000000-0000-4000-b000-000000000004'::uuid, 'admin@maso.demo', 'Démo Administration', 'admin')
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
  extensions.crypt('Maso2026!demo', extensions.gen_salt('bf')), now(),
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', role),
  jsonb_build_object('full_name', full_name, 'language', 'fr'),
  now(), now(), '', '', '', ''
from demo;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), now(), now()
from auth.users u
where u.email like '%@maso.demo';

update public.profiles set newsroom_id = '00000000-0000-4000-a000-000000000001'
where email like '%@maso.demo';
