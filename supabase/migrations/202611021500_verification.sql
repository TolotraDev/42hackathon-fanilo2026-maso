-- MASO — Vérification (MOD-03) : images déjà vues, fiches sources et score de fiabilité

-- ─── Images déjà vues (section 9, étape 2) ──────────────────────────────────
-- Empreinte perceptuelle (pHash 64 bits, 16 caractères hexadécimaux) calculée par l'application.
-- Distance de Hamming : nombre de bits différents ; ≤ 10 = image visuellement très proche.

create function public.find_similar_images(p_sha256 text, p_phash text, p_max_distance integer default 10)
returns table (
  evidence_id uuid,
  case_id uuid,
  case_title text,
  case_status public.case_status,
  verdict public.verdict,
  distance integer,
  exact boolean
)
language sql stable security invoker set search_path = ''
as $$
  with candidates as (
    select e.id, e.case_id, e.sha256,
      case when e.phash ~ '^[0-9a-f]{16}$' and p_phash ~ '^[0-9a-f]{16}$'
        then bit_count(('x' || e.phash)::bit(64) # ('x' || p_phash)::bit(64))::integer
      end as distance
    from public.evidences e
  )
  select c.id, k.id, k.title, k.status, k.verdict, c.distance, c.sha256 = p_sha256
  from candidates c
  join public.cases k on k.id = c.case_id
  where c.sha256 = p_sha256 or c.distance <= p_max_distance
  order by (c.sha256 = p_sha256) desc, c.distance nulls last
  limit 10
$$;

revoke execute on function public.find_similar_images(text, text, integer) from public, anon;
grant execute on function public.find_similar_images(text, text, integer) to authenticated;
create index on public.evidences (url);

-- ─── Fiches sources (M7) ────────────────────────────────────────────────────

alter table public.sources
  add column domain text generated always as (
    lower(substring(url from '^(?:[a-z]+://)?(?:www\.)?([^/:?#]+)'))
  ) stored;
create index on public.sources (domain);

-- Les 8 critères du cahier des charges. Chaque critère noté (0 défavorable, 1 partiel, 2 favorable)
-- doit être justifié par un humain. Le score (sur 10) n'évalue que la source, jamais une affirmation.
create function public.compute_source_score()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_key text;
  v_item jsonb;
  v_total integer := 0;
  v_count integer := 0;
begin
  for v_key, v_item in select * from jsonb_each(coalesce(new.criteria, '{}'::jsonb)) loop
    if v_key not in ('identity', 'transparency', 'seniority', 'corrections_history',
                     'competence', 'proximity', 'independence', 'corroboration') then
      raise exception 'unknown_criterion' using errcode = '22023', detail = v_key;
    end if;
    if jsonb_typeof(v_item -> 'score') <> 'number' or (v_item ->> 'score')::integer not between 0 and 2 then
      raise exception 'invalid_criterion_score' using errcode = '22023', detail = v_key;
    end if;
    if coalesce(trim(v_item ->> 'justification'), '') = '' then
      raise exception 'justification_required' using errcode = '22023', detail = v_key;
    end if;
    v_total := v_total + (v_item ->> 'score')::integer;
    v_count := v_count + 1;
  end loop;
  new.score := case when v_count = 0 then null else round(10.0 * v_total / (2 * v_count), 1) end;
  return new;
end;
$$;

create trigger compute_source_score before insert or update of criteria on public.sources
  for each row execute function public.compute_source_score();

-- Mention « vérifiée » : décision du rédacteur en chef uniquement.
create function public.verify_source(p_source_id uuid, p_verified boolean)
returns public.sources
language plpgsql security definer set search_path = ''
as $$
declare
  v_source public.sources;
begin
  if not public.has_role('editor_in_chief') then
    raise exception 'role_not_allowed' using errcode = '42501';
  end if;
  update public.sources
  set verified = p_verified, verified_by = case when p_verified then auth.uid() end
  where id = p_source_id
  returning * into v_source;
  if not found then
    raise exception 'source_not_found' using errcode = 'P0002';
  end if;
  return v_source;
end;
$$;

revoke execute on function public.verify_source(uuid, boolean) from public, anon;
grant execute on function public.verify_source(uuid, boolean) to authenticated;
