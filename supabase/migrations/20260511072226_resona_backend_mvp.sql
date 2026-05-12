create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled conversation',
  source_type text not null default 'other' check (source_type in ('meeting', 'event', 'lecture', 'casual', 'mentorship', 'other')),
  audio_storage_path text not null,
  status text not null default 'uploaded' check (status in ('uploaded', 'queued', 'transcribing', 'extracting', 'normalizing', 'suggesting_tools', 'completed', 'failed', 'partial_failed')),
  summary text,
  started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  raw_text text not null,
  language text,
  model_used text not null,
  provider text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  company text,
  role text,
  notes text,
  confidence numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.session_people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  relationship_context text,
  confidence numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (session_id, person_id)
);

create table if not exists public.action_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  title text not null,
  description text,
  owner_name text,
  related_person_id uuid references public.people(id) on delete set null,
  due_at timestamptz,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'scheduled', 'done', 'dismissed')),
  confidence numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  type text not null check (type in ('internship', 'startup', 'collaboration', 'intro', 'funding', 'learning', 'hiring', 'research', 'other')),
  title text not null,
  description text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  confidence numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memory_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  fact text not null,
  category text not null check (category in ('person', 'preference', 'opportunity', 'commitment', 'topic', 'decision', 'relationship', 'context')),
  confidence numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  action_item_id uuid references public.action_items(id) on delete set null,
  reason text not null,
  suggested_message text not null,
  suggested_date timestamptz,
  status text not null default 'suggested' check (status in ('suggested', 'approved', 'sent', 'dismissed')),
  confidence numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tool_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  action_item_id uuid references public.action_items(id) on delete set null,
  tool_name text not null,
  action_type text not null,
  payload_json jsonb not null,
  reason text not null,
  status text not null default 'suggested' check (status in ('suggested', 'approved', 'executing', 'executed', 'failed', 'dismissed')),
  confidence numeric not null default 0,
  requires_approval boolean not null default true,
  executed_result_json jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  executed_at timestamptz
);

create table if not exists public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  google_account_email text not null,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  expires_at timestamptz not null,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, google_account_email)
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_action_id uuid not null references public.tool_actions(id) on delete cascade,
  google_event_id text not null,
  calendar_id text not null default 'primary',
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'created',
  created_at timestamptz not null default now()
);

create table if not exists public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  trigger_run_id text,
  status text not null default 'queued',
  current_step text not null default 'queued',
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_extraction_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  provider text not null,
  model text not null,
  prompt_version text not null,
  raw_output_json jsonb not null,
  validated_output_json jsonb,
  status text not null,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_created_idx on public.sessions (user_id, created_at desc);
create index if not exists sessions_user_status_idx on public.sessions (user_id, status);
create index if not exists transcripts_session_idx on public.transcripts (session_id);
create index if not exists processing_jobs_session_idx on public.processing_jobs (session_id);
create index if not exists processing_jobs_user_status_idx on public.processing_jobs (user_id, status);
create index if not exists people_user_email_idx on public.people (user_id, lower(email));
create index if not exists people_user_name_idx on public.people (user_id, lower(name));
create index if not exists action_items_user_status_idx on public.action_items (user_id, status);
create index if not exists tool_actions_user_status_idx on public.tool_actions (user_id, status);
create index if not exists memory_facts_user_created_idx on public.memory_facts (user_id, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'session-audio',
  'session-audio',
  false,
  104857600,
  array['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg', 'audio/m4a']
)
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.transcripts enable row level security;
alter table public.people enable row level security;
alter table public.session_people enable row level security;
alter table public.action_items enable row level security;
alter table public.opportunities enable row level security;
alter table public.memory_facts enable row level security;
alter table public.follow_ups enable row level security;
alter table public.tool_actions enable row level security;
alter table public.calendar_connections enable row level security;
alter table public.calendar_events enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.ai_extraction_runs enable row level security;

create policy "Users can manage own profiles" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can manage own sessions" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own transcripts" on public.transcripts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own people" on public.people
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own session people" on public.session_people
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own action items" on public.action_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own opportunities" on public.opportunities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own memory facts" on public.memory_facts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own follow ups" on public.follow_ups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own tool actions" on public.tool_actions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own calendar connections" on public.calendar_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own calendar events" on public.calendar_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own processing jobs" on public.processing_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own ai extraction runs" on public.ai_extraction_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can upload own session audio" on storage.objects
  for insert with check (
    bucket_id = 'session-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can read own session audio" on storage.objects
  for select using (
    bucket_id = 'session-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
