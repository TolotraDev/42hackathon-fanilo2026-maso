-- MASO — Workflow des dossiers, administration et sources confidentielles
-- Ces fonctions sont le seul moyen de modifier les colonnes protégées.
-- Les mêmes règles sont reproduites dans src/lib/workflow.ts pour l'interface.

-- ─── Transitions de statut autorisées (section 6) ───────────────────────────

create function public.can_transition(p_from public.case_status, p_to public.case_status, p_role public.user_role)
returns boolean
language sql immutable set search_path = ''
as $$
  select case
    when p_role is null or p_role = 'admin' then false
    -- Équipe éditoriale : avancer l'enquête
    when (p_from, p_to) in (
      ('new', 'in_analysis'),
      ('in_analysis', 'awaiting_response'),
      ('awaiting_response', 'in_analysis'),
      ('correction_requested', 'in_analysis')
    ) then true
    -- Fact-checker ou rédacteur en chef : soumettre le verdict proposé
    when (p_from, p_to) in (('in_analysis', 'to_review'), ('correction_requested', 'to_review'))
      then p_role in ('fact_checker', 'editor_in_chief')
    -- Rédacteur en chef uniquement : revue, validation, publication, classement
    when (p_from, p_to) in (
      ('to_review', 'correction_requested'),
      ('to_review', 'in_analysis'),
      ('to_review', 'validated'),
      ('validated', 'published')
    ) then p_role = 'editor_in_chief'
    when p_to = 'closed' and p_from not in ('published', 'closed') then p_role = 'editor_in_chief'
    else false
  end
$$;

-- ─── Changement de statut : horodaté, motivé, contrôlé ──────────────────────

create function public.change_case_status(p_case_id uuid, p_to public.case_status, p_reason text)
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
    published_at = case when p_to = 'published' then now() else published_at end,
    closed_reason = case when p_to = 'closed' then p_reason else closed_reason end
  where id = p_case_id
  returning * into v_case;

  insert into public.case_status_history (case_id, from_status, to_status, reason, changed_by)
  values (p_case_id, v_from, p_to, trim(p_reason), v_uid);

  return v_case;
end;
$$;

-- ─── Verdict proposé par le fact-checker (section 11.1) ─────────────────────

create function public.propose_verdict(
  p_case_id uuid,
  p_verdict public.verdict,
  p_confidence public.confidence_level,
  p_justification text
)
returns public.cases
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_status public.case_status;
begin
  if not public.has_role('fact_checker', 'editor_in_chief') then
    raise exception 'role_not_allowed' using errcode = '42501';
  end if;
  if coalesce(trim(p_justification), '') = '' then
    raise exception 'justification_required' using errcode = '22023';
  end if;

  select status into v_status from public.cases where id = p_case_id for update;
  if not found then
    raise exception 'case_not_found' using errcode = 'P0002';
  end if;
  if v_status not in ('in_analysis', 'correction_requested') then
    raise exception 'transition_not_allowed' using errcode = '42501';
  end if;

  update public.cases set
    verdict = p_verdict,
    confidence = p_confidence,
    justification = trim(p_justification),
    proposed_by = v_uid,
    proposed_at = now()
  where id = p_case_id;

  return public.change_case_status(p_case_id, 'to_review', 'Verdict proposé : ' || p_verdict::text);
end;
$$;

-- ─── Administration des comptes (W12) ───────────────────────────────────────

create function public.admin_set_role(p_user_id uuid, p_role public.user_role)
returns public.profiles
language plpgsql security definer set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if not public.has_role('admin') then
    raise exception 'role_not_allowed' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot_change_own_account' using errcode = '42501';
  end if;
  update public.profiles set role = p_role where id = p_user_id returning * into v_profile;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  return v_profile;
end;
$$;

create function public.admin_set_active(p_user_id uuid, p_active boolean)
returns public.profiles
language plpgsql security definer set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if not public.has_role('admin') then
    raise exception 'role_not_allowed' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot_change_own_account' using errcode = '42501';
  end if;
  update public.profiles set active = p_active where id = p_user_id returning * into v_profile;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  return v_profile;
end;
$$;

-- ─── Sources confidentielles : accès restreint et journalisé ────────────────
-- Accès : auteur de la source, rédacteur en chef, journaliste responsable d'un dossier lié,
-- ou personne autorisée explicitement. L'administrateur n'y a pas accès.

create function public.can_read_confidential_source(p_source_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_staff() and (
    public.has_role('editor_in_chief')
    or exists (select 1 from public.sources s where s.id = p_source_id and s.created_by = auth.uid())
    or exists (select 1 from public.source_access_grants g where g.source_id = p_source_id and g.user_id = auth.uid())
    or exists (
      select 1 from public.case_sources cs join public.cases c on c.id = cs.case_id
      where cs.source_id = p_source_id and c.assigned_to = auth.uid()
    )
  )
$$;

create function public.get_confidential_source_details(p_source_id uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_details text;
begin
  if not public.can_read_confidential_source(p_source_id) then
    raise exception 'role_not_allowed' using errcode = '42501';
  end if;
  select details into v_details from public.source_confidential where source_id = p_source_id;
  perform public.write_audit('read_confidential', 'sources', p_source_id::text);
  return v_details;
end;
$$;

create function public.set_confidential_source_details(p_source_id uuid, p_details text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.can_read_confidential_source(p_source_id) then
    raise exception 'role_not_allowed' using errcode = '42501';
  end if;
  insert into public.source_confidential (source_id, details) values (p_source_id, p_details)
  on conflict (source_id) do update set details = excluded.details;
  update public.sources set confidential = true where id = p_source_id;
end;
$$;

-- ─── Droits d'exécution ─────────────────────────────────────────────────────

revoke execute on function
  public.change_case_status(uuid, public.case_status, text),
  public.propose_verdict(uuid, public.verdict, public.confidence_level, text),
  public.admin_set_role(uuid, public.user_role),
  public.admin_set_active(uuid, boolean),
  public.get_confidential_source_details(uuid),
  public.set_confidential_source_details(uuid, text),
  public.can_read_confidential_source(uuid),
  public.can_transition(public.case_status, public.case_status, public.user_role),
  public.write_audit(text, text, text, jsonb)
from public, anon;

grant execute on function
  public.change_case_status(uuid, public.case_status, text),
  public.propose_verdict(uuid, public.verdict, public.confidence_level, text),
  public.admin_set_role(uuid, public.user_role),
  public.admin_set_active(uuid, boolean),
  public.get_confidential_source_details(uuid),
  public.set_confidential_source_details(uuid, text),
  public.can_transition(public.case_status, public.case_status, public.user_role)
to authenticated;
