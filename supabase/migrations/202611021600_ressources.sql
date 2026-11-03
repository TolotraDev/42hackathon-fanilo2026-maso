-- MASO — Ressources (MOD-04) : annuaire des personnes-ressources, favoris et notes, statistiques

-- ─── Coordonnées protégées selon la visibilité consentie (M9, W9) ──────────
-- La table n'est plus lue directement par l'équipe : seuls le rédacteur en chef, l'administrateur
-- et l'auteur d'une proposition y ont accès. L'équipe passe par la vue ci-dessous.

drop policy "lecture" on public.resource_people;
create policy "lecture gestion" on public.resource_people for select to authenticated
  using (public.has_role('editor_in_chief', 'admin') or created_by = auth.uid());

-- Annuaire de l'équipe : personnes actives, consentantes et validées (tout pour la gestion).
-- Coordonnées masquées si la personne a choisi une visibilité « privée ».
create view public.resource_people_directory with (security_barrier = true) as
  select
    p.id, p.full_name, p.position, p.organization, p.domains, p.region, p.languages,
    p.visibility, p.consent, p.validated, p.last_validated_at, p.active, p.created_at,
    case when v.contacts_visible then p.phone end as phone,
    case when v.contacts_visible then p.whatsapp end as whatsapp,
    case when v.contacts_visible then p.email end as email,
    v.contacts_visible
  from public.resource_people p
  cross join lateral (
    select p.visibility <> 'private' or public.has_role('editor_in_chief', 'admin') or p.created_by = auth.uid()
      as contacts_visible
  ) v
  where (public.is_staff() or public.has_role('admin'))
    and ((p.active and p.consent and p.validated) or public.has_role('editor_in_chief', 'admin'));

revoke all on public.resource_people_directory from anon;
grant select on public.resource_people_directory to authenticated;

-- Le journaliste propose une personne (non validée) ; le rédacteur en chef ou l'admin valide.
create function public.validate_resource_person(p_person_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.has_role('editor_in_chief', 'admin') then
    raise exception 'role_not_allowed' using errcode = '42501';
  end if;
  update public.resource_people
  set validated = true, last_validated_at = now()
  where id = p_person_id and consent;
  if not found then
    raise exception 'consent_required' using errcode = '22023';
  end if;
end;
$$;

-- Droit de retrait : la personne est retirée de l'annuaire et ses coordonnées effacées.
create function public.withdraw_resource_person(p_person_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.has_role('editor_in_chief', 'admin') then
    raise exception 'role_not_allowed' using errcode = '42501';
  end if;
  update public.resource_people
  set active = false, consent = false, validated = false, phone = null, whatsapp = null, email = null
  where id = p_person_id;
end;
$$;

revoke execute on function public.validate_resource_person(uuid), public.withdraw_resource_person(uuid) from public, anon;
grant execute on function public.validate_resource_person(uuid), public.withdraw_resource_person(uuid) to authenticated;

-- Le journal d'audit ne conserve jamais les coordonnées des personnes-ressources (droit de retrait).
create or replace function public.log_audit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_before jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_after jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  if tg_table_name = 'source_confidential' then
    v_before := null;
    v_after := null;
  elsif tg_table_name = 'resource_people' then
    v_before := v_before - array['phone', 'whatsapp', 'email'];
    v_after := v_after - array['phone', 'whatsapp', 'email'];
  end if;

  insert into public.audit_logs (user_id, action, entity, entity_id, before, after)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(v_row ->> 'id', v_row ->> 'source_id', v_row ->> 'case_id'),
    v_before,
    v_after
  );
  return coalesce(new, old);
end;
$$;

-- ─── Annuaire des médias et sources (W8) : géré aussi par l'administrateur (section 3) ─

drop policy "lecture équipe" on public.sources;
drop policy "ajout équipe" on public.sources;
drop policy "modification équipe" on public.sources;
create policy "lecture équipe et admin" on public.sources for select to authenticated
  using (public.is_staff() or public.has_role('admin'));
create policy "ajout équipe et admin" on public.sources for insert to authenticated
  with check (public.is_staff() or public.has_role('admin'));
create policy "modification équipe et admin" on public.sources for update to authenticated
  using (public.is_staff() or public.has_role('admin')) with check (public.is_staff() or public.has_role('admin'));

-- ─── Favoris et notes privées (M9) : visibles uniquement par leur auteur ───

create table public.resource_person_notes (
  person_id uuid not null references public.resource_people (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  favorite boolean not null default false,
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (person_id, user_id)
);

alter table public.resource_person_notes enable row level security;
grant select, insert, update, delete on public.resource_person_notes to authenticated;
create policy "notes personnelles" on public.resource_person_notes for all to authenticated
  using (user_id = auth.uid() and public.app_role() is not null)
  with check (user_id = auth.uid() and public.app_role() is not null);
create trigger set_updated_at before update on public.resource_person_notes
  for each row execute function public.set_updated_at();

-- ─── Statistiques (M10, W10) ────────────────────────────────────────────────

-- Un même indicateur (code, année) n'est importé qu'une fois.
alter table public.statistic_indicators add column code text;
create unique index statistic_indicators_code_year on public.statistic_indicators (code, year) where code is not null;
grant insert (code) on public.statistic_indicators to authenticated;

-- ─── Preuves sans fichier : comparaison de chiffres, analyse (M10 « ajout au dossier ») ─

alter table public.evidences drop constraint evidences_check;
alter table public.evidences add constraint evidences_check
  check (storage_path is not null or url is not null or type in ('analysis', 'text'));

-- Demandes de confirmation : l'équipe consulte les demandes d'une personne depuis sa fiche.
create index on public.confirmation_requests (person_id);
