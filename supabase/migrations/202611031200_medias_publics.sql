-- MASO — Médias dans le rapport public : photos, vidéos et liens vérifiés sont montrés au public.
--   1. Publication bloquée tant qu'aucune photo, vidéo, capture ou lien n'est rendu public (« public_media_missing »).
--   2. Le rapport signé contient le chemin du fichier de chaque preuve publique.
--   3. Le public peut lire ces fichiers, et seulement eux : les autres preuves restent privées.

create or replace function public.report_blockers(p_case_id uuid)
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
  -- Le public doit voir le contenu vérifié lui-même : au moins une photo, vidéo, capture ou lien rendu public.
  if not exists (
    select 1 from public.evidences e
    where e.case_id = p_case_id
      and e.type in ('image', 'video', 'screenshot', 'link')
      and e.id::text in (select jsonb_array_elements_text(coalesce(v_report.content -> 'public_evidence_ids', '[]')))
  ) then
    v_blockers := array_append(v_blockers, 'public_media_missing');
  end if;
  -- Personne ne valide son propre verdict (déjà validé par un autre rédacteur en chef, il peut être publié).
  if v_case.proposed_by = auth.uid() and v_case.status <> 'validated' then
    v_blockers := array_append(v_blockers, 'self_validation');
  end if;
  return v_blockers;
end;
$$;

create or replace function private.report_payload(p_case_id uuid, p_public_id text, p_editor uuid, p_at timestamptz)
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
        'sha256', p.sha256, 'origin', p.origin, 'added_at', p.created_at,
        -- Fichier de la preuve (photo, vidéo), lisible par le public une fois le rapport publié.
        'storage_path', p.storage_path
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

-- Un fichier du stockage des preuves est-il montré par un rapport publié ?
create or replace function public.is_public_evidence_file(p_name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.evidences e
    join public.reports r on r.case_id = e.case_id
    where e.storage_path = p_name
      and r.status = 'published'
      and e.id::text in (select jsonb_array_elements_text(coalesce(r.content -> 'public_evidence_ids', '[]')))
  )
$$;
revoke execute on function public.is_public_evidence_file(text) from public;
grant execute on function public.is_public_evidence_file(text) to anon, authenticated;

drop policy if exists "preuves publiées : lecture publique" on storage.objects;
create policy "preuves publiées : lecture publique" on storage.objects for select to anon, authenticated
  using (bucket_id = 'evidences' and public.is_public_evidence_file(name));
