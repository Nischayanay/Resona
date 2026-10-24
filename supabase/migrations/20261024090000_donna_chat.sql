create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  references_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_threads_user_updated_idx on public.chat_threads (user_id, updated_at desc);
create index if not exists chat_messages_thread_created_idx on public.chat_messages (thread_id, created_at asc);

alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Users can manage own chat threads" on public.chat_threads;
create policy "Users can manage own chat threads" on public.chat_threads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage own chat messages" on public.chat_messages;
create policy "Users can manage own chat messages" on public.chat_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
