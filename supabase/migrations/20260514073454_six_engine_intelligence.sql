alter table public.sessions drop constraint if exists sessions_status_check;
alter table public.sessions
  add constraint sessions_status_check check (
    status in (
      'uploaded',
      'queued',
      'transcribing',
      'extracting',
      'normalizing',
      'prioritizing',
      'linking_memory',
      'suggesting_tools',
      'completed',
      'failed',
      'partial_failed'
    )
  );

alter table public.transcripts
  add column if not exists cleaned_text text,
  add column if not exists segments_json jsonb not null default '[]'::jsonb,
  add column if not exists confidence numeric;

create table if not exists public.session_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  insight_type text not null check (
    insight_type in (
      'what_mattered',
      'key_moment',
      'risk',
      'unresolved_loop',
      'commitment',
      'topic',
      'emotional_signal'
    )
  ),
  title text not null,
  description text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  priority_score numeric not null default 0,
  signal_reason text,
  source_json jsonb not null default '{}'::jsonb,
  confidence numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.priority_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  title text not null,
  reason text not null,
  urgency_score numeric not null default 0,
  importance_score numeric not null default 0,
  confidence_score numeric not null default 0,
  relationship_score numeric not null default 0,
  recency_score numeric not null default 0,
  burden_score numeric not null default 0,
  final_score numeric not null default 0,
  rank integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.person_memory_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  summary text,
  relationship_context text,
  last_interaction_at timestamptz,
  interaction_count integer not null default 0,
  open_loop_count integer not null default 0,
  opportunity_count integer not null default 0,
  memory_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, person_id)
);

create table if not exists public.memory_edges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  target_type text not null,
  target_id uuid,
  relation_type text not null,
  weight numeric not null default 0.5,
  evidence_session_id uuid references public.sessions(id) on delete cascade,
  evidence text,
  confidence numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.long_term_memory_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  summary_type text not null,
  subject_type text,
  subject_id uuid,
  summary text not null,
  source_session_id uuid references public.sessions(id) on delete set null,
  compression_version text not null default 'resona-memory-v1',
  source_counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists session_insights_user_session_idx on public.session_insights (user_id, session_id, priority_score desc);
create index if not exists session_insights_user_type_idx on public.session_insights (user_id, insight_type, created_at desc);
create index if not exists priority_signals_user_session_rank_idx on public.priority_signals (user_id, session_id, rank);
create index if not exists person_memory_profiles_user_person_idx on public.person_memory_profiles (user_id, person_id);
create index if not exists memory_edges_user_source_idx on public.memory_edges (user_id, source_type, source_id);
create index if not exists memory_edges_user_target_idx on public.memory_edges (user_id, target_type, target_id);
create index if not exists long_term_memory_summaries_user_subject_idx on public.long_term_memory_summaries (user_id, subject_type, subject_id, created_at desc);

alter table public.session_insights enable row level security;
alter table public.priority_signals enable row level security;
alter table public.person_memory_profiles enable row level security;
alter table public.memory_edges enable row level security;
alter table public.long_term_memory_summaries enable row level security;

create policy "Users can manage own session insights" on public.session_insights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own priority signals" on public.priority_signals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own person memory profiles" on public.person_memory_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own memory edges" on public.memory_edges
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own long term memory summaries" on public.long_term_memory_summaries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
