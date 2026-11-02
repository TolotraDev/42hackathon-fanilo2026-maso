-- MASO — Droits d'accès par rôle (cahier des charges, section 3)
-- Principe : tout est refusé par défaut, chaque accès est accordé explicitement.
-- Les colonnes sensibles (statut, verdict, rôle, publication…) ne sont modifiables
-- que par les fonctions de 202611021403_workflow.sql.

-- ─── Refus par défaut ───────────────────────────────────────────────────────

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon;
grant execute on function public.app_role(), public.has_role(public.user_role[]), public.is_staff() to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'newsrooms', 'profiles', 'alerts', 'cases', 'case_status_history', 'evidences', 'analyses',
    'sources', 'source_confidential', 'source_access_grants', 'case_sources', 'resource_people',
    'confirmation_requests', 'statistic_indicators', 'checklist_items', 'reports', 'report_versions',
    'editorial_decisions', 'ai_suggestions', 'comments', 'glossary_terms', 'audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- ─── Rédactions ─────────────────────────────────────────────────────────────

grant select, insert, update, delete on public.newsrooms to authenticated;
create policy "lecture équipe" on public.newsrooms for select to authenticated using (public.app_role() is not null);
create policy "gestion admin" on public.newsrooms for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

-- ─── Profils ────────────────────────────────────────────────────────────────

grant select on public.profiles to authenticated;
grant update (full_name, language) on public.profiles to authenticated;
-- Chacun voit son propre profil (même suspendu, pour afficher le message) ; l'équipe voit les membres actifs.
create policy "lecture" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role('admin') or (active and public.app_role() is not null));
create policy "modification de son profil" on public.profiles for update to authenticated
  using (id = auth.uid() and active) with check (id = auth.uid());

-- ─── Alertes et signalements ────────────────────────────────────────────────
-- Tout le monde peut signaler (y compris le public) ; seule l'équipe éditoriale consulte.

grant insert (content_url, text, platform, region, theme, language, reporter_contact, sha256, phash)
  on public.alerts to anon, authenticated;
grant select on public.alerts to authenticated;
grant update (level, status, taken_by, region, theme, occurrences) on public.alerts to authenticated;
create policy "signalement ouvert" on public.alerts for insert to anon, authenticated with check (true);
create policy "lecture équipe" on public.alerts for select to authenticated using (public.is_staff());
create policy "traitement équipe" on public.alerts for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ─── Dossiers ───────────────────────────────────────────────────────────────

grant select on public.cases to authenticated;
grant insert (title, claim, category, region, priority, assigned_to, due_date, alert_id) on public.cases to authenticated;
grant update (title, claim, category, region, priority, assigned_to, due_date) on public.cases to authenticated;
create policy "lecture équipe" on public.cases for select to authenticated using (public.is_staff());
create policy "création équipe" on public.cases for insert to authenticated
  with check (public.is_staff() and created_by = auth.uid());
-- Un dossier validé, publié ou classé n'est plus modifiable directement.
create policy "modification équipe" on public.cases for update to authenticated
  using (public.is_staff() and status not in ('validated', 'published', 'closed'))
  with check (public.is_staff());

grant select on public.case_status_history to authenticated;
create policy "lecture équipe" on public.case_status_history for select to authenticated using (public.is_staff());

-- ─── Preuves et analyses (pas de suppression : chaîne de conservation) ──────

grant select, insert on public.evidences to authenticated;
grant update (analysis, archive_url) on public.evidences to authenticated;
create policy "lecture équipe" on public.evidences for select to authenticated using (public.is_staff());
create policy "ajout équipe" on public.evidences for insert to authenticated
  with check (public.is_staff() and added_by = auth.uid());
create policy "analyse équipe" on public.evidences for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

grant select, insert on public.analyses to authenticated;
create policy "lecture équipe" on public.analyses for select to authenticated using (public.is_staff());
create policy "ajout équipe" on public.analyses for insert to authenticated with check (public.is_staff());

-- ─── Sources ────────────────────────────────────────────────────────────────

grant select on public.sources to authenticated;
grant insert (type, name, url, created_on, contacts, criteria, score, confidential) on public.sources to authenticated;
grant update (type, name, url, created_on, contacts, criteria, score, confidential) on public.sources to authenticated;
create policy "lecture équipe" on public.sources for select to authenticated using (public.is_staff());
create policy "ajout équipe" on public.sources for insert to authenticated with check (public.is_staff());
create policy "modification équipe" on public.sources for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
-- source_confidential : aucune politique → aucun accès direct (voir get_confidential_source_details).

grant select, insert, delete on public.source_access_grants to authenticated;
create policy "autorisations rédacteur en chef" on public.source_access_grants for all to authenticated
  using (public.has_role('editor_in_chief')) with check (public.has_role('editor_in_chief'));

grant select, insert, delete on public.case_sources to authenticated;
create policy "liens équipe" on public.case_sources for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ─── Personnes-ressources ───────────────────────────────────────────────────
-- L'équipe et l'admin consultent et proposent ; le rédacteur en chef et l'admin valident.

grant select on public.resource_people to authenticated;
grant insert (full_name, position, organization, domains, region, languages, phone, whatsapp, email, visibility, consent, consent_at)
  on public.resource_people to authenticated;
grant update on public.resource_people to authenticated;
create policy "lecture" on public.resource_people for select to authenticated
  using (public.is_staff() or public.has_role('admin'));
create policy "proposition" on public.resource_people for insert to authenticated
  with check (public.is_staff() or public.has_role('admin'));
create policy "validation" on public.resource_people for update to authenticated
  using (public.has_role('editor_in_chief', 'admin')) with check (public.has_role('editor_in_chief', 'admin'));

-- Annuaire public (mode invité) : uniquement les personnes ayant consenti, sans coordonnées.
create view public.resource_people_public as
  select id, full_name, position, organization, domains, region, languages, last_validated_at
  from public.resource_people
  where active and consent and validated and visibility = 'public';
grant select on public.resource_people_public to anon, authenticated;

grant select, insert, update on public.confirmation_requests to authenticated;
create policy "demandes équipe" on public.confirmation_requests for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ─── Statistiques (lecture publique, aucune donnée sans source ni date) ─────

grant select on public.statistic_indicators to anon, authenticated;
grant insert (theme, name, value, unit, year, source, source_url, source_updated_at) on public.statistic_indicators to authenticated;
grant update on public.statistic_indicators to authenticated;
create policy "lecture publique" on public.statistic_indicators for select to anon, authenticated using (true);
create policy "proposition" on public.statistic_indicators for insert to authenticated
  with check (public.is_staff() or public.has_role('admin'));
create policy "validation" on public.statistic_indicators for update to authenticated
  using (public.has_role('editor_in_chief', 'admin')) with check (public.has_role('editor_in_chief', 'admin'));

-- ─── Checklist ──────────────────────────────────────────────────────────────

grant select, insert on public.checklist_items to authenticated;
grant update (state, explanation, evidence_ids) on public.checklist_items to authenticated;
create policy "checklist équipe" on public.checklist_items for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ─── Rapports ───────────────────────────────────────────────────────────────
-- Le statut de publication et la signature ne sont modifiables que côté serveur.

grant select on public.reports to anon, authenticated;
grant insert (case_id, language, content, claim_evidence_links) on public.reports to authenticated;
grant update (language, content, claim_evidence_links) on public.reports to authenticated;
create policy "lecture équipe" on public.reports for select to authenticated using (public.is_staff());
create policy "lecture publique des rapports publiés" on public.reports for select to anon, authenticated
  using (status = 'published');
create policy "rédaction équipe" on public.reports for insert to authenticated with check (public.is_staff());
create policy "modification brouillon" on public.reports for update to authenticated
  using (public.is_staff() and status in ('draft', 'submitted')) with check (public.is_staff());

grant select on public.report_versions to authenticated;
create policy "lecture équipe" on public.report_versions for select to authenticated using (public.is_staff());

grant select on public.editorial_decisions to authenticated;
create policy "lecture équipe" on public.editorial_decisions for select to authenticated using (public.is_staff());

-- ─── IA, commentaires, glossaire ────────────────────────────────────────────

grant select, insert on public.ai_suggestions to authenticated;
create policy "suggestions équipe" on public.ai_suggestions for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

grant select, insert, delete on public.comments to authenticated;
grant update (body, mentions) on public.comments to authenticated;
create policy "lecture équipe" on public.comments for select to authenticated using (public.is_staff());
create policy "ajout équipe" on public.comments for insert to authenticated
  with check (public.is_staff() and author_id = auth.uid());
create policy "modification par l'auteur" on public.comments for update to authenticated
  using (author_id = auth.uid() and public.is_staff()) with check (author_id = auth.uid());
create policy "suppression par l'auteur" on public.comments for delete to authenticated
  using (author_id = auth.uid() and public.is_staff());

grant select on public.glossary_terms to anon, authenticated;
grant insert, update, delete on public.glossary_terms to authenticated;
create policy "lecture publique" on public.glossary_terms for select to anon, authenticated using (true);
create policy "gestion admin" on public.glossary_terms for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

-- ─── Journal d'audit : lecture rédacteur en chef et admin, aucune écriture ──

grant select on public.audit_logs to authenticated;
create policy "lecture contrôle" on public.audit_logs for select to authenticated
  using (public.has_role('editor_in_chief', 'admin'));
