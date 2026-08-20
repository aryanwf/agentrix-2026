create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.journal_entries add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists conversations_user_updated_idx on public.conversations (user_id, updated_at desc);
create unique index if not exists conversations_user_single_idx on public.conversations (user_id);
create index if not exists journal_entries_user_created_idx on public.journal_entries (user_id, created_at desc);

alter table public.conversations enable row level security;
alter table public.journal_entries enable row level security;

drop policy if exists "Users can manage their conversations" on public.conversations;
create policy "Users can manage their conversations" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage their journal entries" on public.journal_entries;
create policy "Users can manage their journal entries" on public.journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
