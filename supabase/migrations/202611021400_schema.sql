-- MASO — Schéma initial (cahier des charges, section 14)
-- Les valeurs des types énumérés sont identiques à src/types/domain.ts.

-- ─── Types ──────────────────────────────────────────────────────────────────

create type public.user_role as enum ('journalist', 'fact_checker', 'editor_in_chief', 'admin');
create type public.language_code as enum ('fr', 'mg', 'en');
create type public.newsroom_type as enum ('press', 'radio', 'tv', 'online');
create type public.case_status as enum (
  'new', 'in_analysis', 'awaiting_response', 'to_review',
  'correction_requested', 'validated', 'published', 'closed'
);
create type public.verdict as enum (
  'confirmed', 'mostly_true', 'misleading', 'out_of_context', 'false', 'fabricated', 'unverifiable'
);
create type public.confidence_level as enum ('high', 'medium', 'low');
create type public.alert_level as enum ('low', 'medium', 'high');
create type public.alert_status as enum ('new', 'in_progress', 'verified', 'debunked');
create type public.checklist_state as enum ('todo', 'in_progress', 'done', 'not_applicable');
create type public.checklist_block as enum ('origin', 'context', 'content', 'sources', 'adversarial', 'conclusion');
create type public.confirmation_status as enum ('to_contact', 'sent', 'answered', 'reminder_needed', 'no_answer');
create type public.evidence_type as enum ('image', 'video', 'link', 'screenshot', 'document', 'text', 'analysis');
create type public.visibility_level as enum ('public', 'team', 'private');
create type public.publication_status as enum ('draft', 'submitted', 'validated', 'published', 'retracted');
create type public.decision_type as enum ('validate_publish', 'request_correction', 'request_verification', 'reject');

-- ─── Rédactions et utilisateurs ─────────────────────────────────────────────

create table public.newsrooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.newsroom_type not null,
  region text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.user_role not null default 'journalist',
  language public.language_code not null default 'fr',
  newsroom_id uuid references public.newsrooms (id) on delete set null,
  badge_code text unique,
  badge_valid_until date,
  badge_revoked boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Veille et signalements ─────────────────────────────────────────────────

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  content_url text,
  text text,
  platform text,
  region text,
  theme text,
  language public.language_code,
  level public.alert_level not null default 'low',
  status public.alert_status not null default 'new',
  sha256 text,
  phash text,
  occurrences integer not null default 1 check (occurrences > 0),
  reporter_contact text,
  tracking_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  taken_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (content_url is not null or text is not null)
);

-- ─── Dossiers ───────────────────────────────────────────────────────────────

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  claim text not null default '',
  category text,
  region text,
  priority smallint not null default 2 check (priority between 1 and 3),
  status public.case_status not null default 'new',
  assigned_to uuid references public.profiles (id) on delete set null,
  created_by uuid not null references public.profiles (id) default auth.uid(),
  due_date date,
  alert_id uuid references public.alerts (id) on delete set null,
  verdict public.verdict,
  confidence public.confidence_level,
  justification text,
  proposed_by uuid references public.profiles (id),
  proposed_at timestamptz,
  validated_by uuid references public.profiles (id),
  validated_at timestamptz,
  published_at timestamptz,
  closed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.case_status_history (
  id bigint generated always as identity primary key,
  case_id uuid not null references public.cases (id) on delete cascade,
  from_status public.case_status not null,
  to_status public.case_status not null,
  reason text not null check (length(trim(reason)) > 0),
  changed_by uuid not null references public.profiles (id),
  changed_at timestamptz not null default now()
);

-- ─── Preuves et analyses ────────────────────────────────────────────────────

create table public.evidences (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  type public.evidence_type not null,
  storage_path text,
  url text,
  archive_url text,
  sha256 text,
  phash text,
  origin text,
  analysis jsonb,
  added_by uuid not null references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  check (storage_path is not null or url is not null)
);

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.evidences (id) on delete cascade,
  steps jsonb not null default '[]',
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- ─── Sources ────────────────────────────────────────────────────────────────

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('media', 'page', 'site', 'account', 'journalist', 'institution', 'person')),
  name text not null,
  url text,
  created_on date,
  contacts jsonb not null default '{}',
  criteria jsonb not null default '{}',
  score numeric(4, 2) check (score between 0 and 10),
  verified boolean not null default false,
  verified_by uuid references public.profiles (id),
  confidential boolean not null default false,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Détails confidentiels : aucun accès direct, uniquement via fonctions journalisées.
create table public.source_confidential (
  source_id uuid primary key references public.sources (id) on delete cascade,
  details text not null,
  updated_at timestamptz not null default now()
);

create table public.source_access_grants (
  source_id uuid not null references public.sources (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  granted_by uuid not null references public.profiles (id) default auth.uid(),
  granted_at timestamptz not null default now(),
  primary key (source_id, user_id)
);

create table public.case_sources (
  case_id uuid not null references public.cases (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete cascade,
  primary key (case_id, source_id)
);

-- ─── Personnes-ressources ───────────────────────────────────────────────────

create table public.resource_people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  position text,
  organization text,
  domains text[] not null default '{}',
  region text,
  languages public.language_code[] not null default '{}',
  phone text,
  whatsapp text,
  email text,
  visibility public.visibility_level not null default 'team',
  consent boolean not null default false,
  consent_at timestamptz,
  validated boolean not null default false,
  last_validated_at timestamptz,
  active boolean not null default true,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.confirmation_requests (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  person_id uuid references public.resource_people (id) on delete set null,
  channel text not null check (channel in ('phone', 'whatsapp', 'email', 'in_person')),
  sent_at timestamptz,
  status public.confirmation_status not null default 'to_contact',
  response text,
  reminder_at timestamptz,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- ─── Statistiques ───────────────────────────────────────────────────────────

create table public.statistic_indicators (
  id uuid primary key default gen_random_uuid(),
  theme text not null,
  name text not null,
  value numeric not null,
  unit text,
  year integer not null check (year between 1900 and 2100),
  source text not null check (length(trim(source)) > 0),
  source_url text,
  source_updated_at date not null,
  validated boolean not null default false,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- ─── Checklist ──────────────────────────────────────────────────────────────

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  block public.checklist_block not null,
  question text not null,
  state public.checklist_state not null default 'todo',
  explanation text,
  evidence_ids uuid[] not null default '{}',
  author_id uuid references public.profiles (id) default auth.uid(),
  updated_at timestamptz not null default now(),
  -- Un point « fait » doit être lié à au moins une preuve (section 11.2).
  check (state <> 'done' or cardinality(evidence_ids) > 0)
);

-- ─── Rapports et décisions ──────────────────────────────────────────────────

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  language public.language_code not null default 'fr',
  content jsonb not null default '{}',
  claim_evidence_links jsonb not null default '[]',
  version integer not null default 1,
  status public.publication_status not null default 'draft',
  signature text,
  signed_at timestamptz,
  published_at timestamptz,
  corrections jsonb not null default '[]',
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.report_versions (
  id bigint generated always as identity primary key,
  report_id uuid not null references public.reports (id) on delete cascade,
  version integer not null,
  content jsonb not null,
  claim_evidence_links jsonb not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (report_id, version)
);

create table public.editorial_decisions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  type public.decision_type not null,
  comment text not null check (length(trim(comment)) > 0),
  author_id uuid not null references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- ─── IA, commentaires, glossaire ────────────────────────────────────────────

create table public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  function text not null,
  model text not null,
  prompt_version text not null,
  prompt text not null,
  cited_excerpts jsonb not null default '[]',
  output jsonb not null,
  compliant boolean not null,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  target_type text not null,
  target_id uuid,
  body text not null check (length(trim(body)) > 0),
  mentions uuid[] not null default '{}',
  author_id uuid not null references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.glossary_terms (
  id uuid primary key default gen_random_uuid(),
  term_fr text not null,
  term_mg text not null,
  term_en text,
  context text,
  created_at timestamptz not null default now()
);

-- ─── Journal d'audit (ajout seul) ───────────────────────────────────────────

create table public.audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

-- ─── Index ──────────────────────────────────────────────────────────────────

create index on public.cases (status);
create index on public.cases (assigned_to);
create index on public.case_status_history (case_id);
create index on public.evidences (case_id);
create index on public.evidences (sha256);
create index on public.evidences (phash);
create index on public.alerts (status, level);
create index on public.alerts (sha256);
create index on public.checklist_items (case_id);
create index on public.reports (case_id);
create index on public.reports (status);
create index on public.comments (case_id);
create index on public.audit_logs (entity, entity_id);
create index on public.audit_logs (created_at desc);
