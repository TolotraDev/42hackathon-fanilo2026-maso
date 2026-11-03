-- MASO — Dossiers (MOD-05) : checklist guidée, règles de soumission du verdict, création hors ligne

-- ─── Création hors ligne ────────────────────────────────────────────────────
-- L'appareil choisit l'identifiant d'un dossier, d'une preuve ou d'un rapport créé sans réseau,
-- pour que les liens entre eux restent valables après synchronisation.
grant insert (id) on public.cases to authenticated;
grant insert (id) on public.reports to authenticated;

-- ─── Checklist guidée (section 11.2) ────────────────────────────────────────
-- Chaque question est enregistrée par sa clé (bloc.question) : l'interface la traduit en MG / FR / EN.

create function public.checklist_template()
returns table (block public.checklist_block, question text, sort_order integer)
language sql immutable set search_path = ''
as $$
  values
    ('origin'::public.checklist_block, 'origin.first_publisher', 1),
    ('origin', 'origin.first_date', 2),
    ('origin', 'origin.account_credible', 3),
    ('origin', 'origin.reposted', 4),
    ('context', 'context.place_date_confirmed', 5),
    ('context', 'context.older_version', 6),
    ('context', 'context.matches_event', 7),
    ('content', 'content.technical_analysis', 8),
    ('content', 'content.reverse_search', 9),
    ('content', 'content.figures_compared', 10),
    ('sources', 'sources.two_independent', 11),
    ('sources', 'sources.direct_knowledge', 12),
    ('sources', 'sources.conflicts_examined', 13),
    ('sources', 'sources.statements_crosschecked', 14),
    ('adversarial', 'adversarial.party_contacted', 15),
    ('adversarial', 'adversarial.response_kept', 16),
    ('adversarial', 'adversarial.counter_evidence', 17)
$$;

alter table public.checklist_items add column sort_order integer not null default 0;
create unique index checklist_items_case_question on public.checklist_items (case_id, question);

create function public.create_case_checklist()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.checklist_items (case_id, block, question, sort_order, author_id)
  select new.id, t.block, t.question, t.sort_order, new.created_by
  from public.checklist_template() t
  on conflict (case_id, question) do nothing;
  return new;
end;
$$;

create trigger create_case_checklist after insert on public.cases
  for each row execute function public.create_case_checklist();

-- Dossiers créés avant ce module : on leur ajoute la checklist.
insert into public.checklist_items (case_id, block, question, sort_order, author_id)
select c.id, t.block, t.question, t.sort_order, c.created_by
from public.cases c cross join public.checklist_template() t
on conflict (case_id, question) do nothing;

-- Un dossier validé, publié ou classé n'est plus modifiable : sa checklist non plus.
drop policy "checklist équipe" on public.checklist_items;
create policy "checklist : lecture équipe" on public.checklist_items for select to authenticated using (public.is_staff());
create policy "checklist : ajout équipe" on public.checklist_items for insert to authenticated with check (public.is_staff());
create policy "checklist : modification tant que le dossier est ouvert" on public.checklist_items for update to authenticated
  using (public.is_staff() and exists (
    select 1 from public.cases c where c.id = case_id and c.status not in ('validated', 'published', 'closed')
  ))
  with check (public.is_staff());

-- ─── Verdict proposé : règles de soumission (M13) ───────────────────────────
-- Refusé sans affirmation, sans source liée, sans preuve citée dans la justification,
-- ou si un point de checklist n'est ni fait, ni « non applicable », ni justifié.

alter table public.cases add column justification_evidence_ids uuid[] not null default '{}';

create function public.verdict_blockers(p_case_id uuid, p_evidence_ids uuid[] default null)
returns text[]
language sql stable security definer set search_path = ''
as $$
  select array_remove(array[
    case when coalesce(trim(c.claim), '') = '' then 'claim_missing' end,
    case when not exists (select 1 from public.case_sources s where s.case_id = c.id) then 'source_missing' end,
    case when not exists (
      select 1 from public.evidences e
      where e.case_id = c.id and e.id = any (coalesce(p_evidence_ids, c.justification_evidence_ids))
    ) then 'evidence_missing' end,
    case when exists (
      select 1 from public.checklist_items i
      where i.case_id = c.id and i.state in ('todo', 'in_progress') and coalesce(trim(i.explanation), '') = ''
    ) then 'checklist_unjustified' end
  ], null)
  from public.cases c
  where c.id = p_case_id and public.is_staff()
$$;

drop function public.propose_verdict(uuid, public.verdict, public.confidence_level, text);

create function public.propose_verdict(
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
  if v_status not in ('in_analysis', 'correction_requested') then
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

revoke execute on function
  public.propose_verdict(uuid, public.verdict, public.confidence_level, text, uuid[]),
  public.verdict_blockers(uuid, uuid[]),
  public.create_case_checklist(),
  public.checklist_template()
from public, anon;
grant execute on function
  public.propose_verdict(uuid, public.verdict, public.confidence_level, text, uuid[]),
  public.verdict_blockers(uuid, uuid[])
to authenticated;

-- ─── Commentaires sur le dossier (collaboration) ────────────────────────────
grant insert (id, case_id, target_type, target_id, body, mentions) on public.comments to authenticated;
