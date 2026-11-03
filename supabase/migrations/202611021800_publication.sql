-- MASO — Revue éditoriale, signature, publication, portail public, signalements, notifications (MOD-06)
-- Principes : seul le rédacteur en chef publie (vérifié ici) ; le portail ne donne jamais de verdict automatique ;
-- le public n'accède à la base que par les fonctions portal_* (lecture des rapports publiés, signalement limité).

create extension if not exists pgcrypto with schema extensions;

-- ─── Schéma privé : jamais exposé par l'API ─────────────────────────────────

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Clé de signature des rapports, générée dans la base à l'installation : elle n'apparaît dans aucun fichier.
create table private.signing_keys (
  id smallint primary key default 1 check (id = 1),
  secret text not null,
  created_at timestamptz not null default now()
);
insert into private.signing_keys (secret) values (encode(extensions.gen_random_bytes(32), 'hex'));

create sequence private.report_number;

-- Limitation du débit des signalements publics (empreinte de l'adresse IP, jamais l'adresse elle-même).
create table private.portal_requests (
  key text not null,
  at timestamptz not null default now()
);
create index on private.portal_requests (key, at);

create function private.sign(p_payload jsonb)
returns text
language sql stable set search_path = ''
as $$
  select encode(extensions.hmac(p_payload::text, (select secret from private.signing_keys where id = 1), 'sha256'), 'hex')
$$;

create function private.content_hash(p_payload jsonb)
returns text
language sql immutable set search_path = ''
as $$
  select encode(extensions.digest(p_payload::text, 'sha256'), 'hex')
$$;

-- Lien comparable : sans protocole, « www. », fragment, barre finale ni paramètres de suivi.
-- Copie dans src/features/portail/normalizeUrl.ts.
create function private.normalize_url(p_url text)
returns text
language plpgsql immutable set search_path = ''
as $$
declare
  v text := lower(trim(coalesce(p_url, '')));
begin
  if v = '' then
    return null;
  end if;
  v := regexp_replace(v, '#.*$', '');
  v := regexp_replace(v, '^[a-z]+://', '');
  v := regexp_replace(v, '^www\.', '');
  v := regexp_replace(v, '([?&])(utm_[a-z_]*|fbclid|gclid|igshid|si)=[^&]*', '\1', 'g');
  v := regexp_replace(v, '[?&]+$', '');
  v := regexp_replace(v, '\?&+', '?');
  v := regexp_replace(v, '&&+', '&', 'g');
  v := regexp_replace(v, '/+(\?|$)', '\1');
  return v;
end;
$$;

-- ─── Rapports : publication signée ──────────────────────────────────────────

alter table public.reports
  add column public_id text unique,
  add column signed_payload jsonb,
  add column content_hash text;

-- Le public ne lit plus la table : il passe par portal_report(), qui ne renvoie que le contenu signé.
drop policy "lecture publique des rapports publiés" on public.reports;
revoke select on public.reports from anon;

-- Une décision peut porter sur un dossier sans rapport (ex. rejet) : elle est rattachée au dossier.
alter table public.editorial_decisions
  add column case_id uuid references public.cases (id) on delete cascade,
  alter column report_id drop not null;
update public.editorial_decisions d set case_id = r.case_id from public.reports r where r.id = d.report_id;
alter table public.editorial_decisions alter column case_id set not null;
create index on public.editorial_decisions (case_id);

-- ─── Ce qui empêche la publication (W6) — copie dans src/features/revue/rules.ts ───

create function public.report_blockers(p_case_id uuid)
returns text[]
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_case public.cases;
  v_report public.reports;
  v_blockers text[] := '{}';
  v_claim jsonb;
begin
  if not public.is_staff() then
    raise exception 'role_not_allowed' using errcode = '42501';
  end if;
  select * into v_case from public.cases where id = p_case_id;
  if not found then
    raise exception 'case_not_found' using errcode = 'P0002';
  end if;
  select * into v_report from public.reports where case_id = p_case_id order by created_at desc limit 1;

  if v_case.verdict is null then
    v_blockers := array_append(v_blockers, 'verdict_missing');
  end if;
  if v_report.id is null then
    return array_append(v_blockers, 'report_missing');
  end if;
  if coalesce(trim(v_report.content ->> 'summary'), '') = '' then
    v_blockers := array_append(v_blockers, 'summary_missing');
  end if;
  if coalesce(trim(v_report.content ->> 'explanation'), '') = '' then
    v_blockers := array_append(v_blockers, 'explanation_missing');
  end if;
  if jsonb_typeof(v_report.claim_evidence_links) <> 'array' or jsonb_array_length(v_report.claim_evidence_links) = 0 then
    v_blockers := array_append(v_blockers, 'claims_missing');
  else
    -- Chaque affirmation du rapport doit renvoyer à au moins une preuve du dossier.
    for v_claim in select * from jsonb_array_elements(v_report.claim_evidence_links) loop
      if coalesce(trim(v_claim ->> 'text'), '') = '' or not exists (
        select 1 from public.evidences e
        where e.case_id = p_case_id
          and e.id::text in (select jsonb_array_elements_text(coalesce(v_claim -> 'evidence_ids', '[]')))
      ) then
        v_blockers := array_append(v_blockers, 'unsupported_claim');
        exit;
      end if;
    end loop;
  end if;
  -- Personne ne valide son propre verdict (déjà validé par un autre rédacteur en chef, il peut être publié).
  if v_case.proposed_by = auth.uid() and v_case.status <> 'validated' then
    v_blockers := array_append(v_blockers, 'self_validation');
  end if;
  return v_blockers;
end;
$$;

-- Contenu public du rapport, tel qu'il est signé : rien d'autre n'est montré au public.
-- Preuves numérotées P1, P2… dans l'ordre d'ajout (même numérotation que dans le dossier).
create function private.report_payload(p_case_id uuid, p_public_id text, p_editor uuid, p_at timestamptz)
returns jsonb
language sql stable set search_path = ''
as $$
  with c as (select * from public.cases where id = p_case_id),
  r as (select * from public.reports where case_id = p_case_id order by created_at desc limit 1),
  labelled as (
    select e.*, 'P' || row_number() over (order by e.created_at, e.id) as label,
      row_number() over (order by e.created_at, e.id) as n
    from public.evidences e where e.case_id = p_case_id
  ),
  published as (
    select l.* from labelled l, r
    where l.id::text in (select jsonb_array_elements_text(coalesce(r.content -> 'public_evidence_ids', '[]')))
  )
  select jsonb_build_object(
    'public_id', p_public_id,
    'language', r.language,
    'title', c.title,
    'claim', c.claim,
    'verdict', c.verdict,
    'confidence', c.confidence,
    'theme', c.category,
    'region', c.region,
    'summary', trim(r.content ->> 'summary'),
    'explanation', trim(r.content ->> 'explanation'),
    'method', coalesce(trim(r.content ->> 'method'), ''),
    'claims', coalesce((
      select jsonb_agg(jsonb_build_object(
        'text', trim(x.claim ->> 'text'),
        'evidence', coalesce((
          select jsonb_agg(l.label order by l.n) from labelled l
          where l.id::text in (select jsonb_array_elements_text(coalesce(x.claim -> 'evidence_ids', '[]')))
        ), '[]')
      ) order by x.ord)
      from jsonb_array_elements(r.claim_evidence_links) with ordinality as x(claim, ord)
    ), '[]'),
    'evidences', coalesce((
      select jsonb_agg(jsonb_build_object(
        'label', p.label, 'type', p.type, 'url', p.url, 'archive_url', p.archive_url,
        'sha256', p.sha256, 'origin', p.origin, 'added_at', p.created_at
      ) order by p.n) from published p
    ), '[]'),
    'newsroom', coalesce((
      select n.name from public.profiles pr join public.newsrooms n on n.id = pr.newsroom_id where pr.id = p_editor
    ), 'MASO'),
    'validated_by', (select nullif(full_name, '') from public.profiles where id = p_editor),
    'published_at', p_at,
    'corrections', '[]'::jsonb
  )
  from c, r
$$;

-- ─── Revue éditoriale (W6) : une décision motivée, enregistrée ──────────────
-- validate_publish : valide, signe et publie en un clic ; request_correction : retour au fact-checker ;
-- request_verification : retour en analyse ; reject : dossier classé.

create function public.editorial_decision(p_case_id uuid, p_type public.decision_type, p_comment text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_case public.cases;
  v_report public.reports;
  v_blockers text[];
  v_to public.case_status;
  v_public_id text;
  v_payload jsonb;
  v_now timestamptz := now();
begin
  if not public.has_role('editor_in_chief') then
    raise exception 'role_not_allowed' using errcode = '42501';
  end if;
  if coalesce(trim(p_comment), '') = '' then
    raise exception 'comment_required' using errcode = '22023';
  end if;
  select * into v_case from public.cases where id = p_case_id for update;
  if not found then
    raise exception 'case_not_found' using errcode = 'P0002';
  end if;
  if not (v_case.status = 'to_review' or (v_case.status = 'validated' and p_type = 'validate_publish')) then
    raise exception 'not_in_review' using errcode = '42501';
  end if;
  select * into v_report from public.reports where case_id = p_case_id order by created_at desc limit 1 for update;

  if p_type = 'validate_publish' then
    v_blockers := public.report_blockers(p_case_id);
    if cardinality(v_blockers) > 0 then
      raise exception 'publication_blocked' using errcode = '22023', detail = array_to_string(v_blockers, ',');
    end if;
    v_to := 'published';
    v_public_id := 'MASO-' || to_char(v_now, 'YYYY') || '-' || lpad(nextval('private.report_number')::text, 4, '0');
    v_payload := private.report_payload(p_case_id, v_public_id, v_uid, v_now);
    update public.reports set
      status = 'published',
      public_id = v_public_id,
      signed_payload = v_payload,
      signature = private.sign(v_payload),
      content_hash = private.content_hash(v_payload),
      signed_at = v_now,
      published_at = v_now
    where id = v_report.id;
    -- Le signalement d'origine passe à « vérifié » ou « démenti » (suivi par code).
    if v_case.alert_id is not null then
      update public.alerts
      set status = case when v_case.verdict in ('confirmed', 'mostly_true') then 'verified' else 'debunked' end::public.alert_status
      where id = v_case.alert_id;
    end if;
  elsif p_type = 'request_correction' then
    v_to := 'correction_requested';
    update public.reports set status = 'draft' where id = v_report.id;
  elsif p_type = 'request_verification' then
    v_to := 'in_analysis';
  else
    v_to := 'closed';
  end if;

  update public.cases set
    status = v_to,
    validated_by = case when v_to = 'published' and v_case.status = 'to_review' then v_uid else validated_by end,
    validated_at = case when v_to = 'published' and v_case.status = 'to_review' then v_now else validated_at end,
    published_at = case when v_to = 'published' then v_now else published_at end,
    closed_reason = case when v_to = 'closed' then trim(p_comment) else closed_reason end
  where id = p_case_id;

  insert into public.case_status_history (case_id, from_status, to_status, reason, changed_by)
  values (p_case_id, v_case.status, v_to, trim(p_comment), v_uid);

  insert into public.editorial_decisions (case_id, report_id, type, comment, author_id)
  values (p_case_id, v_report.id, p_type, trim(p_comment), v_uid);

  return jsonb_build_object('status', v_to, 'public_id', v_public_id);
end;
$$;

-- Correction d'un rapport publié : ajoutée au contenu public, datée, puis le rapport est signé à nouveau.
create function public.add_report_correction(p_case_id uuid, p_text text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_report public.reports;
  v_payload jsonb;
begin
  if not public.has_role('editor_in_chief') then
    raise exception 'role_not_allowed' using errcode = '42501';
  end if;
  if coalesce(trim(p_text), '') = '' then
    raise exception 'comment_required' using errcode = '22023';
  end if;
  select * into v_report from public.reports
  where case_id = p_case_id and status = 'published' order by created_at desc limit 1 for update;
  if not found then
    raise exception 'not_published' using errcode = 'P0002';
  end if;
  v_payload := jsonb_set(
    v_report.signed_payload, '{corrections}',
    coalesce(v_report.signed_payload -> 'corrections', '[]') || jsonb_build_object('at', now(), 'text', trim(p_text))
  );
  update public.reports set
    signed_payload = v_payload,
    corrections = v_payload -> 'corrections',
    signature = private.sign(v_payload),
    content_hash = private.content_hash(v_payload),
    signed_at = now()
  where id = v_report.id;
  return v_payload;
end;
$$;

-- La publication ne passe que par la revue éditoriale (signature) : plus de publication par simple changement de statut.
create or replace function public.change_case_status(p_case_id uuid, p_to public.case_status, p_reason text)
returns public.cases
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role := public.app_role();
  v_case public.cases;
  v_from public.case_status;
begin
  if v_uid is null or v_role is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'reason_required' using errcode = '22023';
  end if;

  select * into v_case from public.cases where id = p_case_id for update;
  if not found then
    raise exception 'case_not_found' using errcode = 'P0002';
  end if;
  v_from := v_case.status;

  if not public.can_transition(v_from, p_to, v_role) then
    raise exception 'transition_not_allowed' using errcode = '42501',
      detail = format('%s → %s interdit pour le rôle %s', v_from, p_to, v_role);
  end if;
  if p_to = 'published' then
    raise exception 'publish_via_review' using errcode = '42501';
  end if;
  if p_to = 'to_review' and (v_case.verdict is null or v_case.confidence is null) then
    raise exception 'verdict_required' using errcode = '22023';
  end if;
  -- Personne ne valide son propre travail.
  if p_to = 'validated' and v_case.proposed_by = v_uid then
    raise exception 'self_validation_forbidden' using errcode = '42501';
  end if;

  update public.cases set
    status = p_to,
    validated_by = case when p_to = 'validated' then v_uid else validated_by end,
    validated_at = case when p_to = 'validated' then now() else validated_at end,
    closed_reason = case when p_to = 'closed' then p_reason else closed_reason end
  where id = p_case_id
  returning * into v_case;

  insert into public.case_status_history (case_id, from_status, to_status, reason, changed_by)
  values (p_case_id, v_from, p_to, trim(p_reason), v_uid);

  return v_case;
end;
$$;

-- ─── Portail public (W0) : lecture des rapports publiés ─────────────────────

create function private.report_card(p_report public.reports)
returns jsonb
language sql immutable set search_path = ''
as $$
  select jsonb_build_object(
    'public_id', p_report.public_id,
    'title', p_report.signed_payload ->> 'title',
    'claim', p_report.signed_payload ->> 'claim',
    'verdict', p_report.signed_payload ->> 'verdict',
    'summary', p_report.signed_payload ->> 'summary',
    'theme', p_report.signed_payload ->> 'theme',
    'region', p_report.signed_payload ->> 'region',
    'language', p_report.signed_payload ->> 'language',
    'newsroom', p_report.signed_payload ->> 'newsroom',
    'published_at', p_report.published_at,
    'corrected', jsonb_array_length(coalesce(p_report.signed_payload -> 'corrections', '[]')) > 0
  )
$$;

create function public.portal_reports(
  p_query text default null,
  p_verdict public.verdict default null,
  p_theme text default null,
  p_region text default null,
  p_language public.language_code default null,
  p_from date default null,
  p_to date default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns setof jsonb
language sql stable security definer set search_path = ''
as $$
  select private.report_card(r)
  from public.reports r
  where r.status = 'published'
    and (coalesce(trim(p_query), '') = '' or (
      coalesce(r.signed_payload ->> 'title', '') || ' ' || coalesce(r.signed_payload ->> 'claim', '') || ' ' ||
      coalesce(r.signed_payload ->> 'summary', '') || ' ' || r.public_id
    ) ilike '%' || trim(p_query) || '%')
    and (p_verdict is null or r.signed_payload ->> 'verdict' = p_verdict::text)
    and (coalesce(p_theme, '') = '' or r.signed_payload ->> 'theme' ilike p_theme)
    and (coalesce(p_region, '') = '' or r.signed_payload ->> 'region' ilike p_region)
    and (p_language is null or r.language = p_language)
    and (p_from is null or r.published_at >= p_from)
    and (p_to is null or r.published_at < p_to + 1)
  order by r.published_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50) offset greatest(coalesce(p_offset, 0), 0)
$$;

-- Rapport complet : contenu signé, signature et empreinte (vérifiables par le QR).
create function public.portal_report(p_public_id text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select r.signed_payload || jsonb_build_object('signature', r.signature, 'content_hash', r.content_hash, 'signed_at', r.signed_at)
  from public.reports r
  where r.status = 'published' and r.public_id = upper(trim(p_public_id))
$$;

-- Vérification d'un rapport (QR) : la signature est recalculée sur le contenu actuellement en base.
create function public.portal_verify_report(p_public_id text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select jsonb_build_object(
      'found', true,
      'valid', r.signature = private.sign(r.signed_payload) and r.content_hash = private.content_hash(r.signed_payload),
      'public_id', r.public_id,
      'title', r.signed_payload ->> 'title',
      'verdict', r.signed_payload ->> 'verdict',
      'newsroom', r.signed_payload ->> 'newsroom',
      'published_at', r.published_at,
      'signed_at', r.signed_at,
      'content_hash', r.content_hash
    )
    from public.reports r
    where r.status = 'published' and r.public_id = upper(trim(p_public_id))
  ), jsonb_build_object('found', false))
$$;

-- « Déjà vérifié ? » : même fichier, image très proche (pHash ≤ 10) ou même lien, parmi les rapports publiés.
create function public.portal_lookup(p_sha256 text default null, p_phash text default null, p_url text default null)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with matches as (
    select distinct on (r.id) r, case
        when p_sha256 ~ '^[0-9a-f]{64}$' and e.sha256 = p_sha256 then 'same_file'
        when p_url is not null and private.normalize_url(p_url) in (private.normalize_url(e.url), private.normalize_url(e.archive_url)) then 'same_link'
        else 'similar_image'
      end as reason
    from public.evidences e
    join public.reports r on r.case_id = e.case_id and r.status = 'published'
    where (p_sha256 ~ '^[0-9a-f]{64}$' and e.sha256 = p_sha256)
      or (p_phash ~ '^[0-9a-f]{16}$' and e.phash ~ '^[0-9a-f]{16}$'
          and bit_count(('x' || e.phash)::bit(64) # ('x' || p_phash)::bit(64)) <= 10)
      or (p_url is not null and private.normalize_url(p_url) in (private.normalize_url(e.url), private.normalize_url(e.archive_url)))
    order by r.id
  )
  select coalesce(jsonb_agg(private.report_card(m.r) || jsonb_build_object('reason', m.reason) order by (m.r).published_at desc), '[]')
  from (select * from matches limit 5) m
$$;

-- ─── Signalement sans compte (W0) ───────────────────────────────────────────

alter table public.alerts add column storage_path text unique;
-- Un signalement peut ne contenir qu'un fichier (capture d'écran, photo).
alter table public.alerts drop constraint alerts_check;
alter table public.alerts add constraint alerts_content_check
  check (content_url is not null or text is not null or storage_path is not null);
revoke insert on public.alerts from anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('signalements', 'signalements', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Dépôt d'un fichier : seulement à l'emplacement réservé par un signalement accepté il y a moins de 15 minutes.
create function public.portal_upload_allowed(p_name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.alerts
    where storage_path = p_name and created_at > now() - interval '15 minutes'
  )
$$;

create policy "signalements : dépôt public limité" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'signalements' and public.portal_upload_allowed(name));
create policy "signalements : lecture équipe" on storage.objects for select to authenticated
  using (bucket_id = 'signalements' and public.is_staff());

create function public.portal_submit_alert(
  p_text text default null,
  p_url text default null,
  p_platform text default null,
  p_region text default null,
  p_language public.language_code default null,
  p_contact text default null,
  p_sha256 text default null,
  p_phash text default null,
  p_file_ext text default null,
  p_trap text default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_text text := nullif(trim(coalesce(p_text, '')), '');
  v_url text := nullif(trim(coalesce(p_url, '')), '');
  v_ip text;
  v_key text;
  v_existing public.alerts;
  v_alert public.alerts;
  v_path text;
  v_id uuid := gen_random_uuid();
begin
  -- Champ piège invisible rempli : robot. Réponse normale, rien n'est enregistré.
  if coalesce(p_trap, '') <> '' then
    return jsonb_build_object('tracking_code', upper(substr(md5(random()::text), 1, 10)), 'duplicate', false, 'upload_path', null, 'matches', '[]'::jsonb);
  end if;

  if v_text is null and v_url is null and p_file_ext is null then
    raise exception 'content_required' using errcode = '22023';
  end if;
  if length(coalesce(v_text, '')) > 2000 or length(coalesce(v_url, '')) > 2048
     or length(coalesce(p_contact, '')) > 200 or length(coalesce(p_platform, '')) > 40 or length(coalesce(p_region, '')) > 60 then
    raise exception 'too_long' using errcode = '22023';
  end if;
  if v_url is not null and v_url !~* '^https?://[^\s/]+\.[^\s]+$' then
    raise exception 'invalid_url' using errcode = '22023';
  end if;
  if (p_sha256 is not null and p_sha256 !~ '^[0-9a-f]{64}$') or (p_phash is not null and p_phash !~ '^[0-9a-f]{16}$')
     or (p_file_ext is not null and p_file_ext not in ('jpg', 'png', 'webp'))
     or (p_file_ext is not null and p_sha256 is null) then
    raise exception 'invalid_file' using errcode = '22023';
  end if;

  -- Débit : 10 signalements par heure et par adresse ; 300 par heure au total.
  v_ip := split_part(coalesce(
    nullif(current_setting('request.headers', true), '')::jsonb ->> 'cf-connecting-ip',
    nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-forwarded-for',
    'inconnue'), ',', 1);
  v_key := private.content_hash(to_jsonb(trim(v_ip)));
  delete from private.portal_requests where at < now() - interval '1 day';
  if (select count(*) from private.portal_requests where key = v_key and at > now() - interval '1 hour') >= 10
     or (select count(*) from private.portal_requests where at > now() - interval '1 hour') >= 300 then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  insert into private.portal_requests (key) values (v_key);

  -- Déduplication : même fichier, même lien ou même texte reçu dans les 30 derniers jours.
  select * into v_existing from public.alerts a
  where a.created_at > now() - interval '30 days' and (
    (p_sha256 is not null and a.sha256 = p_sha256)
    or (v_url is not null and private.normalize_url(a.content_url) = private.normalize_url(v_url))
    or (p_sha256 is null and v_url is null and lower(a.text) = lower(v_text))
  )
  order by a.created_at limit 1;

  if found then
    update public.alerts set occurrences = occurrences + 1 where id = v_existing.id;
    return jsonb_build_object(
      'tracking_code', v_existing.tracking_code, 'duplicate', true, 'upload_path', null,
      'matches', public.portal_lookup(p_sha256, p_phash, v_url)
    );
  end if;

  if p_file_ext is not null then
    v_path := 'public/' || v_id || '.' || p_file_ext;
  end if;
  insert into public.alerts (id, content_url, text, platform, region, language, reporter_contact, sha256, phash, storage_path)
  values (v_id, v_url, v_text, nullif(trim(p_platform), ''), nullif(trim(p_region), ''), p_language,
          nullif(trim(p_contact), ''), p_sha256, p_phash, v_path)
  returning * into v_alert;

  return jsonb_build_object(
    'tracking_code', v_alert.tracking_code, 'duplicate', false, 'upload_path', v_path,
    'matches', public.portal_lookup(p_sha256, p_phash, v_url)
  );
end;
$$;

-- Suivi d'un signalement par son code : uniquement l'état, jamais le contenu ni le contact.
create function public.portal_track(p_code text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select jsonb_build_object(
      'found', true,
      'status', a.status,
      'received_at', a.created_at,
      'report', (
        select private.report_card(r) from public.cases c
        join public.reports r on r.case_id = c.id and r.status = 'published'
        where c.alert_id = a.id order by r.published_at desc limit 1
      )
    )
    from public.alerts a where a.tracking_code = upper(trim(p_code))
  ), jsonb_build_object('found', false))
$$;

-- Un dossier créé depuis un signalement le fait passer « pris en charge ».
create function public.take_alert_on_case()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.alerts set status = 'in_progress', taken_by = new.created_by
  where id = new.alert_id and status = 'new';
  return new;
end;
$$;

create trigger take_alert_on_case after insert on public.cases
  for each row when (new.alert_id is not null) execute function public.take_alert_on_case();

-- ─── Notifications (section 12) ─────────────────────────────────────────────

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  case_id uuid references public.cases (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy "ses notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "marquer comme lue" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Envoie une notification à chaque membre actif de l'équipe listé, sauf à l'auteur de l'action.
create function private.notify(p_users uuid[], p_kind text, p_case_id uuid, p_body text default null)
returns void
language sql set search_path = ''
as $$
  insert into public.notifications (user_id, kind, case_id, actor_id, body)
  select distinct p.id, p_kind, p_case_id, auth.uid(), left(p_body, 280)
  from public.profiles p
  where p.id = any (p_users) and p.active and p.role in ('journalist', 'fact_checker', 'editor_in_chief')
    and p.id is distinct from auth.uid()
$$;

create function public.notify_case_assignment()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.assigned_to is not null and new.assigned_to is distinct from old.assigned_to then
    perform private.notify(array[new.assigned_to], 'assigned', new.id, new.title);
  end if;
  return new;
end;
$$;

create trigger notify_case_assignment after update of assigned_to on public.cases
  for each row execute function public.notify_case_assignment();

create function public.notify_case_status()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_case public.cases;
  v_team uuid[];
begin
  select * into v_case from public.cases where id = new.case_id;
  v_team := array[v_case.created_by, v_case.assigned_to, v_case.proposed_by];
  if new.to_status = 'to_review' then
    perform private.notify(array(select id from public.profiles where role = 'editor_in_chief'), 'review_requested', new.case_id, v_case.title);
  elsif new.to_status = 'correction_requested' then
    perform private.notify(v_team, 'correction_requested', new.case_id, new.reason);
  elsif new.to_status = 'in_analysis' and new.from_status = 'to_review' then
    perform private.notify(v_team, 'verification_requested', new.case_id, new.reason);
  elsif new.to_status = 'closed' and new.from_status = 'to_review' then
    perform private.notify(v_team, 'rejected', new.case_id, new.reason);
  elsif new.to_status = 'validated' then
    perform private.notify(v_team, 'validated', new.case_id, v_case.title);
  elsif new.to_status = 'published' then
    perform private.notify(v_team, 'published', new.case_id, v_case.title);
  end if;
  return new;
end;
$$;

create trigger notify_case_status after insert on public.case_status_history
  for each row execute function public.notify_case_status();

-- Mentions @ dans les commentaires.
create function public.notify_mentions()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if cardinality(new.mentions) > 0 then
    perform private.notify(new.mentions, 'mentioned', new.case_id, new.body);
  end if;
  return new;
end;
$$;

create trigger notify_mentions after insert on public.comments
  for each row execute function public.notify_mentions();

-- Nouveau signalement du public : l'équipe éditoriale est prévenue.
create function public.notify_public_alert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.notify(
    array(select id from public.profiles where role in ('journalist', 'editor_in_chief')),
    'public_report', null, coalesce(new.text, new.content_url, '')
  );
  return new;
end;
$$;

create trigger notify_public_alert after insert on public.alerts
  for each row when (new.created_by is null) execute function public.notify_public_alert();

-- ─── Droits d'exécution ─────────────────────────────────────────────────────

revoke execute on all functions in schema private from public, anon, authenticated;

revoke execute on function
  public.report_blockers(uuid),
  public.editorial_decision(uuid, public.decision_type, text),
  public.add_report_correction(uuid, text),
  public.change_case_status(uuid, public.case_status, text),
  public.portal_reports(text, public.verdict, text, text, public.language_code, date, date, integer, integer),
  public.portal_report(text),
  public.portal_verify_report(text),
  public.portal_lookup(text, text, text),
  public.portal_submit_alert(text, text, text, text, public.language_code, text, text, text, text, text),
  public.portal_track(text),
  public.portal_upload_allowed(text),
  public.take_alert_on_case(),
  public.notify_case_assignment(),
  public.notify_case_status(),
  public.notify_mentions(),
  public.notify_public_alert()
from public, anon, authenticated;

grant execute on function
  public.report_blockers(uuid),
  public.editorial_decision(uuid, public.decision_type, text),
  public.add_report_correction(uuid, text),
  public.change_case_status(uuid, public.case_status, text)
to authenticated;

grant execute on function
  public.portal_reports(text, public.verdict, text, text, public.language_code, date, date, integer, integer),
  public.portal_report(text),
  public.portal_verify_report(text),
  public.portal_lookup(text, text, text),
  public.portal_submit_alert(text, text, text, text, public.language_code, text, text, text, text, text),
  public.portal_track(text),
  public.portal_upload_allowed(text)
to anon, authenticated;
