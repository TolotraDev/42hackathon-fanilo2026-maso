-- MOD-07 / MOD-08 : paramètres de l'application (W13) et badges QR des journalistes (M14, W12, W0).

-- ─── Paramètres (W13) ───────────────────────────────────────────────────────
-- Sources de veille, règles de mots-clés et niveaux d'alerte, modèles de rédaction sans IA.
-- Lecture par l'équipe, modification par l'administration ; chaque changement est journalisé.

create table public.app_settings (
  key text primary key check (key in ('veille_sources', 'alert_rules', 'templates', 'legal')),
  value jsonb not null,
  updated_by uuid references public.profiles (id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();
create trigger log_audit after insert or update or delete on public.app_settings
  for each row execute function public.log_audit();

alter table public.app_settings enable row level security;
grant select on public.app_settings to authenticated;
grant insert, update, delete on public.app_settings to authenticated;
create policy "lecture équipe" on public.app_settings for select to authenticated
  using (public.is_staff() or public.has_role('admin'));
create policy "gestion admin" on public.app_settings for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

-- Même journal que la migration Ressources ; app_settings n'a pas d'« id » : sa clé sert d'identifiant.
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
    coalesce(v_row ->> 'id', v_row ->> 'source_id', v_row ->> 'case_id', v_row ->> 'key'),
    v_before,
    v_after
  );
  return coalesce(new, old);
end;
$$;

-- ─── Badges QR (M14, W12, W0) ───────────────────────────────────────────────
-- Le code du badge est aléatoire et unique ; seul l'administrateur l'émet ou le révoque.

create function public.admin_issue_badge(p_user_id uuid, p_valid_until date)
returns public.profiles
language plpgsql security definer set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if not public.has_role('admin') then
    raise exception 'role_not_allowed' using errcode = '42501';
  end if;
  if p_valid_until is null or p_valid_until <= current_date then
    raise exception 'invalid_badge_date' using errcode = '22023';
  end if;
  update public.profiles
     set badge_code = 'MB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
         badge_valid_until = p_valid_until,
         badge_revoked = false
   where id = p_user_id and role in ('journalist', 'fact_checker', 'editor_in_chief')
  returning * into v_profile;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  return v_profile;
end;
$$;

create function public.admin_revoke_badge(p_user_id uuid)
returns public.profiles
language plpgsql security definer set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if not public.has_role('admin') then
    raise exception 'role_not_allowed' using errcode = '42501';
  end if;
  update public.profiles set badge_revoked = true where id = p_user_id and badge_code is not null
  returning * into v_profile;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  return v_profile;
end;
$$;

-- Vérification publique (W0) : le minimum pour identifier le journaliste, rien de plus.
create function public.portal_verify_badge(p_code text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select jsonb_build_object(
      'found', true,
      'status', case
        when p.badge_revoked then 'revoked'
        when not p.active then 'suspended'
        when p.badge_valid_until < current_date then 'expired'
        else 'valid'
      end,
      'full_name', p.full_name,
      'role', p.role,
      'newsroom', n.name,
      'valid_until', p.badge_valid_until,
      'code', p.badge_code
    )
    from public.profiles p
    left join public.newsrooms n on n.id = p.newsroom_id
    where p.badge_code = upper(trim(p_code))
  ), jsonb_build_object('found', false))
$$;

revoke execute on function public.admin_issue_badge(uuid, date), public.admin_revoke_badge(uuid) from public, anon;
grant execute on function public.admin_issue_badge(uuid, date), public.admin_revoke_badge(uuid) to authenticated;
grant execute on function public.portal_verify_badge(text) to anon, authenticated;
