-- MASO — Fonctions utilitaires et triggers (audit, horodatage, profils, versions)

-- ─── Rôle de l'utilisateur connecté ─────────────────────────────────────────
-- Un compte suspendu (active = false) n'a plus aucun rôle : toutes les politiques RLS le refusent.

create function public.app_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create function public.has_role(variadic roles public.user_role[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.app_role() = any (roles), false)
$$;

-- Équipe éditoriale : journaliste, fact-checker, rédacteur en chef (l'admin n'en fait pas partie).
create function public.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.has_role('journalist', 'fact_checker', 'editor_in_chief')
$$;

-- ─── Horodatage updated_at ──────────────────────────────────────────────────

create function public.set_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.cases for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.sources for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.source_confidential for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.resource_people for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.checklist_items for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.reports for each row execute function public.set_updated_at();

-- L'auteur d'un point de checklist est la dernière personne qui l'a modifié.
create function public.set_checklist_author()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.author_id := coalesce(auth.uid(), new.author_id);
  return new;
end;
$$;

create trigger set_checklist_author before update on public.checklist_items
  for each row execute function public.set_checklist_author();

-- ─── Journal d'audit ────────────────────────────────────────────────────────

create function public.log_audit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_before jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_after jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  -- Le contenu confidentiel n'est jamais recopié dans le journal.
  if tg_table_name = 'source_confidential' then
    v_before := null;
    v_after := null;
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

do $$
declare
  t text;
begin
  foreach t in array array[
    'newsrooms', 'profiles', 'alerts', 'cases', 'evidences', 'analyses', 'sources',
    'source_confidential', 'source_access_grants', 'case_sources', 'resource_people',
    'confirmation_requests', 'statistic_indicators', 'checklist_items', 'reports',
    'editorial_decisions', 'ai_suggestions', 'comments', 'glossary_terms'
  ] loop
    execute format(
      'create trigger log_audit after insert or update or delete on public.%I for each row execute function public.log_audit()',
      t
    );
  end loop;
end;
$$;

-- Le journal est en ajout seul : aucune modification ni suppression, même par un administrateur.
create function public.prevent_audit_change()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  raise exception 'audit_log_is_append_only' using errcode = '42501';
end;
$$;

create trigger prevent_audit_change before update or delete on public.audit_logs
  for each row execute function public.prevent_audit_change();
create trigger prevent_audit_truncate before truncate on public.audit_logs
  for each statement execute function public.prevent_audit_change();

-- Fonction utilisée par les RPC pour journaliser une action sans changement de ligne.
create function public.write_audit(p_action text, p_entity text, p_entity_id text, p_details jsonb default null)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.audit_logs (user_id, action, entity, entity_id, after)
  values (auth.uid(), p_action, p_entity, p_entity_id, p_details)
$$;

-- ─── Création automatique du profil ─────────────────────────────────────────
-- Le rôle vient uniquement de raw_app_meta_data (modifiable seulement côté serveur),
-- jamais des métadonnées saisies par l'utilisateur.

create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_role public.user_role := 'journalist';
  v_language public.language_code := 'fr';
begin
  if new.raw_app_meta_data ->> 'role' in ('journalist', 'fact_checker', 'editor_in_chief', 'admin') then
    v_role := (new.raw_app_meta_data ->> 'role')::public.user_role;
  end if;
  if new.raw_user_meta_data ->> 'language' in ('fr', 'mg', 'en') then
    v_language := (new.raw_user_meta_data ->> 'language')::public.language_code;
  end if;

  insert into public.profiles (id, email, full_name, role, language)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''), v_role, v_language);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Versions des rapports ──────────────────────────────────────────────────

create function public.version_report()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.content is distinct from old.content or new.claim_evidence_links is distinct from old.claim_evidence_links then
    insert into public.report_versions (report_id, version, content, claim_evidence_links, created_by)
    values (old.id, old.version, old.content, old.claim_evidence_links, auth.uid());
    new.version := old.version + 1;
  end if;
  return new;
end;
$$;

create trigger version_report before update on public.reports
  for each row execute function public.version_report();
