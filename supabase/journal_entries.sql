create extension if not exists "pgcrypto";

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  mood text not null default 'steady',
  morning_note text not null default '',
  prompt text not null default '',
  entry text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists journal_entries_device_created_idx
  on public.journal_entries (device_id, created_at desc);
