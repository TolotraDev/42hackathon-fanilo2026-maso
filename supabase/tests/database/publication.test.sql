-- MASO — Tests MOD-06 : revue éditoriale, signature, portail public, signalements, notifications
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(54);

-- Exécuter une requête en tant qu'utilisateur (null = public anonyme) : renvoie null ou le message d'erreur.
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

-- Même chose, mais renvoie le résultat (jsonb) de la requête.
create function pg_temp.json_as(p_uid uuid, p_sql text)
returns jsonb
language plpgsql
as $$
declare
  v jsonb;
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
  ('f6000000-0000-4000-8000-000000000001', 'j@pub.maso', '{"role":"journalist"}'),
  ('f6000000-0000-4000-8000-000000000002', 'fc@pub.maso', '{"role":"fact_checker"}'),
  ('f6000000-0000-4000-8000-000000000003', 'ed1@pub.maso', '{"role":"editor_in_chief"}'),
  ('f6000000-0000-4000-8000-000000000004', 'ed2@pub.maso', '{"role":"editor_in_chief"}');
update public.profiles set full_name = 'Rédactrice Test' where id = 'f6000000-0000-4000-8000-000000000003';

-- ─── Un dossier prêt pour la revue ──────────────────────────────────────────

insert into public.cases (id, title, claim, category, region, created_by, assigned_to)
values ('ca600000-0000-4000-8000-000000000001', 'Photo d''inondation', 'Antananarivo inondée ce matin', 'Climat', 'Analamanga',
        'f6000000-0000-4000-8000-000000000001', 'f6000000-0000-4000-8000-000000000002');
insert into public.sources (id, type, name) values ('5c600000-0000-4000-8000-000000000001', 'page', 'Page virale');
insert into public.case_sources values ('ca600000-0000-4000-8000-000000000001', '5c600000-0000-4000-8000-000000000001');
insert into public.evidences (id, case_id, type, url, sha256, phash, origin, added_by, created_at) values
  ('e6000000-0000-4000-8000-000000000001', 'ca600000-0000-4000-8000-000000000001', 'image', 'https://www.example.org/photo-2024/',
   repeat('ab', 32), 'f0f0f0f0f0f0f0f0', 'Archive 2024', 'f6000000-0000-4000-8000-000000000001', now() - interval '2 hours'),
  ('e6000000-0000-4000-8000-000000000002', 'ca600000-0000-4000-8000-000000000001', 'link', 'https://example.org/interne',
   null, null, 'Note interne', 'f6000000-0000-4000-8000-000000000001', now() - interval '1 hour');
update public.checklist_items set explanation = 'Traité pendant le test' where case_id = 'ca600000-0000-4000-8000-000000000001';
update public.cases set status = 'in_analysis' where id = 'ca600000-0000-4000-8000-000000000001';
select pg_temp.run_as('f6000000-0000-4000-8000-000000000002',
  $$select public.propose_verdict('ca600000-0000-4000-8000-000000000001', 'out_of_context', 'high', 'Photo de 2024 [P1].', '{e6000000-0000-4000-8000-000000000001}')$$);

-- ─── Droits de décision ─────────────────────────────────────────────────────

select matches(pg_temp.run_as('f6000000-0000-4000-8000-000000000001',
  $$select public.editorial_decision('ca600000-0000-4000-8000-000000000001', 'validate_publish', 'Je publie')$$),
  'role_not_allowed', 'un journaliste ne publie pas');
select matches(pg_temp.run_as('f6000000-0000-4000-8000-000000000002',
  $$select public.editorial_decision('ca600000-0000-4000-8000-000000000001', 'validate_publish', 'Je publie')$$),
  'role_not_allowed', 'un fact-checker ne publie pas');
select matches(pg_temp.run_as('f6000000-0000-4000-8000-000000000003',
  $$select public.editorial_decision('ca600000-0000-4000-8000-000000000001', 'request_correction', '  ')$$),
  'comment_required', 'toute décision exige un commentaire');
select is(pg_temp.json_as('f6000000-0000-4000-8000-000000000003',
  $$select to_jsonb(public.report_blockers('ca600000-0000-4000-8000-000000000001'))$$),
  '["report_missing"]'::jsonb, 'sans rapport, la publication est bloquée');

-- ─── Rapport : affirmations liées aux preuves ───────────────────────────────

insert into public.reports (id, case_id, content, claim_evidence_links) values (
  'a6000000-0000-4000-8000-000000000001', 'ca600000-0000-4000-8000-000000000001',
  '{"summary":"La photo date de 2024.","explanation":"Elle a été publiée en mars 2024.","method":"Recherche inversée.","public_evidence_ids":["e6000000-0000-4000-8000-000000000001"]}',
  '[{"text":"La photo a été publiée en 2024","evidence_ids":["e6000000-0000-4000-8000-000000000001"]},{"text":"Aucune inondation ce matin","evidence_ids":[]}]'
);
select is(pg_temp.json_as('f6000000-0000-4000-8000-000000000003',
  $$select to_jsonb(public.report_blockers('ca600000-0000-4000-8000-000000000001'))$$),
  '["unsupported_claim"]'::jsonb, 'une affirmation non étayée bloque la publication');
select matches(pg_temp.run_as('f6000000-0000-4000-8000-000000000003',
  $$select public.editorial_decision('ca600000-0000-4000-8000-000000000001', 'validate_publish', 'OK')$$),
  'publication_blocked', 'le serveur refuse de publier un rapport non étayé');

update public.cases set proposed_by = 'f6000000-0000-4000-8000-000000000003' where id = 'ca600000-0000-4000-8000-000000000001';
select ok(pg_temp.json_as('f6000000-0000-4000-8000-000000000003',
  $$select to_jsonb(public.report_blockers('ca600000-0000-4000-8000-000000000001'))$$) ? 'self_validation',
  'personne ne publie un verdict qu''il a lui-même proposé');
update public.cases set proposed_by = 'f6000000-0000-4000-8000-000000000002' where id = 'ca600000-0000-4000-8000-000000000001';

-- ─── Demande de correction, puis nouvelle soumission ────────────────────────

select is(pg_temp.run_as('f6000000-0000-4000-8000-000000000003',
  $$select public.editorial_decision('ca600000-0000-4000-8000-000000000001', 'request_correction', 'Étayer la deuxième affirmation')$$),
  null, 'le rédacteur en chef demande une correction');
select is((select status from public.cases where id = 'ca600000-0000-4000-8000-000000000001'),
  'correction_requested'::public.case_status, 'le dossier repart en correction');
select is((select count(*) from public.editorial_decisions where case_id = 'ca600000-0000-4000-8000-000000000001' and type = 'request_correction'),
  1::bigint, 'la décision et son commentaire sont enregistrés');
select is((select count(*) from public.notifications where user_id = 'f6000000-0000-4000-8000-000000000002' and kind = 'correction_requested'),
  1::bigint, 'le fact-checker est notifié de la correction demandée');

select is(pg_temp.run_as('f6000000-0000-4000-8000-000000000002', $$
  update public.reports set claim_evidence_links =
    '[{"text":"La photo a été publiée en 2024","evidence_ids":["e6000000-0000-4000-8000-000000000001"]},{"text":"Aucune inondation ce matin","evidence_ids":["e6000000-0000-4000-8000-000000000002"]}]'
  where id = 'a6000000-0000-4000-8000-000000000001'
$$), null, 'le fact-checker corrige le rapport');
select is((select count(*) from public.report_versions where report_id = 'a6000000-0000-4000-8000-000000000001'),
  1::bigint, 'la version précédente du rapport est conservée (comparaison)');
select is(pg_temp.run_as('f6000000-0000-4000-8000-000000000002',
  $$select public.propose_verdict('ca600000-0000-4000-8000-000000000001', 'out_of_context', 'high', 'Photo de 2024 [P1].', '{e6000000-0000-4000-8000-000000000001}')$$),
  null, 'le fact-checker soumet à nouveau');
select is((select count(*) from public.notifications where kind = 'review_requested'
  and user_id in ('f6000000-0000-4000-8000-000000000003', 'f6000000-0000-4000-8000-000000000004')
  and case_id = 'ca600000-0000-4000-8000-000000000001'), 4::bigint,
  'les deux rédacteurs en chef sont notifiés à chaque demande de relecture');

-- ─── Validation, signature et publication en un clic ────────────────────────

select matches(pg_temp.json_as('f6000000-0000-4000-8000-000000000003',
  $$select public.editorial_decision('ca600000-0000-4000-8000-000000000001', 'validate_publish', 'Preuves solides')$$) ->> 'public_id',
  '^MASO-\d{4}-\d{4}$', 'publication : un numéro public est attribué');
select is((select status from public.cases where id = 'ca600000-0000-4000-8000-000000000001'),
  'published'::public.case_status, 'le dossier est publié');
select ok((select signature is not null and status = 'published' and signed_at is not null from public.reports where id = 'a6000000-0000-4000-8000-000000000001'),
  'le rapport est signé et publié');
select is((select validated_by from public.cases where id = 'ca600000-0000-4000-8000-000000000001'),
  'f6000000-0000-4000-8000-000000000003'::uuid, 'la validation est attribuée à un humain');
select is((select count(*) from public.notifications where kind = 'published'
  and user_id in ('f6000000-0000-4000-8000-000000000001', 'f6000000-0000-4000-8000-000000000002')), 2::bigint,
  'le journaliste et le fact-checker sont notifiés de la publication');
select is(pg_temp.run_as('f6000000-0000-4000-8000-000000000002',
  $$update public.reports set content = '{"summary":"Modifié"}' where id = 'a6000000-0000-4000-8000-000000000001'$$), null,
  'modifier un rapport publié ne lève pas d''erreur…');
select is((select content ->> 'summary' from public.reports where id = 'a6000000-0000-4000-8000-000000000001'),
  'La photo date de 2024.', '… mais n''a aucun effet');

create temp table t_pub as select public_id from public.reports where id = 'a6000000-0000-4000-8000-000000000001';
grant select on t_pub to anon;

-- ─── Portail public ─────────────────────────────────────────────────────────

select matches(pg_temp.run_as(null, 'select * from public.reports'), 'permission denied',
  'le public ne lit pas la table des rapports');
select is(pg_temp.json_as(null, $$select jsonb_agg(c ->> 'title') from public.portal_reports('inondation') c$$),
  '["Photo d''inondation"]'::jsonb, 'le public retrouve le rapport publié par mot-clé');
select is(pg_temp.json_as(null, $$select count(*)::text::jsonb from public.portal_reports(p_verdict => 'false')$$),
  '0'::jsonb, 'filtre par verdict');
select is(pg_temp.json_as(null, format($$select public.portal_report(%L) -> 'claims' -> 1 -> 'evidence'$$, (select public_id from t_pub))),
  '["P2"]'::jsonb, 'page rapport : chaque affirmation renvoie à ses preuves');
select is(pg_temp.json_as(null, format($$select jsonb_path_query_array(public.portal_report(%L), '$.evidences[*].label')$$, (select public_id from t_pub))),
  '["P1"]'::jsonb, 'seules les preuves publiables sont montrées');
select ok(not (pg_temp.json_as(null, format($$select public.portal_report(%L)$$, (select public_id from t_pub)))::text ~ 'interne|justification|created_by'),
  'aucune donnée interne (note, justification, auteurs) dans la page publique');
select is(pg_temp.json_as(null, format($$select public.portal_verify_report(%L) -> 'valid'$$, (select public_id from t_pub))),
  'true'::jsonb, 'vérification par QR : la signature est valide');

update public.reports set signed_payload = jsonb_set(signed_payload, '{verdict}', '"confirmed"') where id = 'a6000000-0000-4000-8000-000000000001';
select is(pg_temp.json_as(null, format($$select public.portal_verify_report(%L) -> 'valid'$$, (select public_id from t_pub))),
  'false'::jsonb, 'un rapport modifié après signature est détecté');
update public.reports set signed_payload = jsonb_set(signed_payload, '{verdict}', '"out_of_context"') where id = 'a6000000-0000-4000-8000-000000000001';

select matches(pg_temp.run_as('f6000000-0000-4000-8000-000000000001',
  $$select public.add_report_correction('ca600000-0000-4000-8000-000000000001', 'Date précisée')$$),
  'role_not_allowed', 'seul le rédacteur en chef corrige un rapport publié');
select is(pg_temp.json_as('f6000000-0000-4000-8000-000000000003',
  $$select jsonb_array_length(public.add_report_correction('ca600000-0000-4000-8000-000000000001', 'Date précisée : mars 2024') -> 'corrections')::text::jsonb$$),
  '1'::jsonb, 'la correction est ajoutée au rapport publié');
select is(pg_temp.json_as(null, format($$select public.portal_verify_report(%L) -> 'valid'$$, (select public_id from t_pub))),
  'true'::jsonb, 'le rapport corrigé est signé à nouveau');

-- ─── « Déjà vérifié ? » ──────────────────────────────────────────────────────

select is(pg_temp.json_as(null, $$select public.portal_lookup(p_sha256 => repeat('ab', 32)) -> 0 -> 'reason'$$) #>> '{}',
  'same_file', 'même fichier : déjà vérifié');
select is(pg_temp.json_as(null, $$select public.portal_lookup(p_phash => 'f0f0f0f0f0f0f0f1') -> 0 -> 'reason'$$) #>> '{}',
  'similar_image', 'image recompressée (empreinte très proche) : déjà vérifié');
select is(pg_temp.json_as(null, $$select public.portal_lookup(p_url => 'http://example.org/photo-2024?utm_source=facebook') -> 0 -> 'reason'$$) #>> '{}',
  'same_link', 'même lien (variante de partage) : déjà vérifié');
select is(pg_temp.json_as(null, $$select public.portal_lookup(p_phash => '0f0f0f0f0f0f0f0f', p_url => 'https://autre.example.org/x')$$),
  '[]'::jsonb, 'contenu inconnu : aucun verdict automatique');

-- ─── Signalement sans compte et anti-abus ───────────────────────────────────

create temp table t_alert as
select pg_temp.json_as(null, $$select public.portal_submit_alert(p_text => 'Pénurie de riz annoncée', p_platform => 'WhatsApp')$$) as r;
grant select on t_alert to anon;
select is((select (r ->> 'duplicate')::boolean from t_alert), false, 'signalement enregistré avec un code de suivi');
select is(pg_temp.json_as(null, $$select public.portal_submit_alert(p_text => '  pénurie de RIZ annoncée ')$$) ->> 'tracking_code',
  (select r ->> 'tracking_code' from t_alert), 'un signalement identique est regroupé (même code)');
select is((select occurrences from public.alerts where tracking_code = (select r ->> 'tracking_code' from t_alert)), 2,
  'les occurrences sont comptées');
select matches(pg_temp.run_as(null, $$select public.portal_submit_alert(p_url => 'javascript:alert(1)')$$),
  'invalid_url', 'lien invalide refusé');
select is(pg_temp.json_as(null, $$select public.portal_submit_alert(p_text => 'robot', p_trap => 'spam') -> 'duplicate'$$) #>> '{}',
  'false', 'champ piège rempli : réponse normale…');
select is((select count(*) from public.alerts where text = 'robot'), 0::bigint, '… mais rien n''est enregistré');

select set_config('request.headers', '{"x-forwarded-for":"203.0.113.9"}', true);
select pg_temp.run_as(null, format($$select public.portal_submit_alert(p_text => 'Rumeur n°%s')$$, n)) from generate_series(1, 10) n;
select matches(pg_temp.run_as(null, $$select public.portal_submit_alert(p_text => 'Rumeur n°11')$$),
  'rate_limited', 'au-delà de 10 signalements par heure depuis la même adresse : refusé');

select is(pg_temp.json_as(null, format($$select public.portal_track(%L)$$, lower((select r ->> 'tracking_code' from t_alert)))) - 'received_at',
  '{"found": true, "status": "new", "report": null}'::jsonb, 'suivi par code : uniquement l''état, jamais le contenu');

select is(pg_temp.run_as('f6000000-0000-4000-8000-000000000001', format(
  $$insert into public.cases (title, claim, alert_id) select 'Riz', 'Pénurie', id from public.alerts where tracking_code = %L$$,
  (select r ->> 'tracking_code' from t_alert))), null, 'un journaliste crée un dossier depuis le signalement');
select is((select status from public.alerts where tracking_code = (select r ->> 'tracking_code' from t_alert)),
  'in_progress'::public.alert_status, 'le signalement passe « pris en charge »');

select set_config('request.headers', '{"x-forwarded-for":"198.51.100.7"}', true);
create temp table t_file as
select pg_temp.json_as(null, $$select public.portal_submit_alert(p_sha256 => repeat('cd', 32), p_phash => '1234567812345678', p_file_ext => 'jpg')$$) as r;
grant select on t_file to anon;
select matches((select r ->> 'upload_path' from t_file), '^public/[0-9a-f-]{36}\.jpg$', 'un fichier signalé reçoit un emplacement de dépôt réservé');
select is(pg_temp.json_as(null, format($$select to_jsonb(public.portal_upload_allowed(%L))$$, (select r ->> 'upload_path' from t_file))),
  'true'::jsonb, 'le dépôt est autorisé à cet emplacement…');
select is(pg_temp.json_as(null, $$select to_jsonb(public.portal_upload_allowed('public/autre.jpg'))$$),
  'false'::jsonb, '… et nulle part ailleurs');

-- ─── Notifications ──────────────────────────────────────────────────────────

select is(pg_temp.run_as('f6000000-0000-4000-8000-000000000002', $$
  insert into public.comments (case_id, target_type, body, mentions)
  values ('ca600000-0000-4000-8000-000000000001', 'case', '@Journaliste peux-tu archiver la page ?', '{f6000000-0000-4000-8000-000000000001}')
$$), null, 'le fact-checker mentionne le journaliste');
select is((select count(*) from public.notifications where user_id = 'f6000000-0000-4000-8000-000000000001' and kind = 'mentioned'),
  1::bigint, 'la personne mentionnée est notifiée');
select ok((select count(*) from public.notifications where user_id = 'f6000000-0000-4000-8000-000000000001' and kind = 'public_report') > 0,
  'l''équipe est notifiée des signalements du public');
select is(pg_temp.json_as('f6000000-0000-4000-8000-000000000001',
  $$select to_jsonb(count(*)) from public.notifications where user_id <> auth.uid()$$), '0'::jsonb,
  'chacun ne voit que ses propres notifications');

select finish();
rollback;
