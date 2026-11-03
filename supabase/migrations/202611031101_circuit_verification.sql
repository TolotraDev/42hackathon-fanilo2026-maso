-- MASO — Circuit de vérification en trois temps :
--   1. le journaliste met le dossier en analyse, relit le rapport d'analyse automatique et le valide
--      (« En analyse » → « À vérifier ») ;
--   2. le fact-checker vérifie : il l'envoie au rédacteur en chef avec son verdict et sa note
--      (« À vérifier » → « À relire »), ou le renvoie au journaliste avec un motif (« Correction demandée ») ;
--   3. le rédacteur en chef relit, ajuste le rapport proposé et publie (inchangé, revue éditoriale).
-- Les mêmes règles sont reproduites dans src/lib/workflow.ts pour l'interface.

create or replace function public.can_transition(p_from public.case_status, p_to public.case_status, p_role public.user_role)
returns boolean
language sql immutable set search_path = ''
as $$
  select case
    when p_role is null or p_role = 'admin' then false
    -- Équipe éditoriale : avancer l'enquête, soumettre l'analyse au fact-checker
    when (p_from, p_to) in (
      ('new', 'in_analysis'),
      ('in_analysis', 'awaiting_response'),
      ('awaiting_response', 'in_analysis'),
      ('correction_requested', 'in_analysis'),
      ('in_analysis', 'to_verify'),
      ('correction_requested', 'to_verify')
    ) then true
    -- Fact-checker ou rédacteur en chef : soumettre le verdict, ou renvoyer l'analyse au journaliste
    when (p_from, p_to) in (
      ('in_analysis', 'to_review'),
      ('correction_requested', 'to_review'),
      ('to_verify', 'to_review'),
      ('to_verify', 'correction_requested')
    ) then p_role in ('fact_checker', 'editor_in_chief')
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

-- Le fact-checker peut proposer son verdict sur une analyse soumise (« À vérifier »).
create or replace function public.propose_verdict(
  p_case_id uuid,
  p_verdict public.verdict,
  p_confidence public.confidence_level,
  p_justification text,
  p_evidence_ids uuid[]
)
returns public.cases
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_status public.case_status;
  v_blockers text[];
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
  if v_status not in ('in_analysis', 'correction_requested', 'to_verify') then
    raise exception 'transition_not_allowed' using errcode = '42501';
  end if;

  v_blockers := public.verdict_blockers(p_case_id, p_evidence_ids);
  if cardinality(v_blockers) > 0 then
    raise exception 'submission_blocked' using errcode = '22023', detail = array_to_string(v_blockers, ',');
  end if;

  update public.cases set
    verdict = p_verdict,
    confidence = p_confidence,
    justification = trim(p_justification),
    justification_evidence_ids = p_evidence_ids,
    proposed_by = v_uid,
    proposed_at = now()
  where id = p_case_id;

  return public.change_case_status(p_case_id, 'to_review', 'Verdict proposé : ' || p_verdict::text);
end;
$$;

-- Notifications : l'analyse soumise prévient les fact-checkers ; le renvoi prévient le journaliste (déjà géré).
create or replace function public.notify_case_status()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_case public.cases;
  v_team uuid[];
begin
  select * into v_case from public.cases where id = new.case_id;
  v_team := array[v_case.created_by, v_case.assigned_to, v_case.proposed_by];
  if new.to_status = 'to_verify' then
    perform private.notify(array(select id from public.profiles where role = 'fact_checker'), 'analysis_submitted', new.case_id, v_case.title);
  elsif new.to_status = 'to_review' then
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
