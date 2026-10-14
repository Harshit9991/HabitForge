create extension if not exists "pgcrypto";

create type public.journey_state as enum ('active', 'archived');
create type public.operation_state as enum ('pending', 'completed', 'failed');

create table public.journeys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  start_date date not null,
  end_date_exclusive date not null,
  timezone text not null check (char_length(timezone) between 1 and 64),
  state public.journey_state not null default 'active',
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date_exclusive > start_date)
);

create table public.habit_groups (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (journey_id, name),
  unique (id, journey_id)
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  group_id uuid,
  display_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, journey_id),
  foreign key (group_id, journey_id) references public.habit_groups(id, journey_id)
);

create table public.habit_versions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  frequency jsonb not null,
  target_time time,
  active_from date not null,
  active_until_exclusive date,
  created_at timestamptz not null default now(),
  check (active_until_exclusive is null or active_until_exclusive > active_from)
);

create table public.daily_habit_entries (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  habit_id uuid not null,
  habit_version_id uuid not null references public.habit_versions(id),
  local_date date not null,
  completed boolean not null default false,
  completed_at timestamptz,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  unique (journey_id, habit_id, local_date),
  foreign key (habit_id, journey_id) references public.habits(id, journey_id)
);

create table public.daily_notes (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  local_date date not null,
  body text not null default '' check (char_length(body) <= 4000),
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  unique (journey_id, local_date)
);

create table public.user_journey_settings (
  journey_id uuid primary key references public.journeys(id) on delete cascade,
  threshold_percent smallint not null default 80 check (threshold_percent between 0 and 100),
  grace_tokens smallint not null default 0 check (grace_tokens >= 0),
  weekly_quota smallint not null default 1 check (weekly_quota > 0),
  calculation_version integer not null default 1
);

create table public.operation_receipts (
  operation_id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  journey_id uuid not null references public.journeys(id) on delete cascade,
  payload_hash text not null,
  state public.operation_state not null default 'pending',
  result jsonb,
  revision bigint,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index daily_entries_journey_date_idx on public.daily_habit_entries(journey_id, local_date);
create index habit_versions_habit_active_idx on public.habit_versions(habit_id, active_from);

alter table public.journeys enable row level security;
alter table public.habit_groups enable row level security;
alter table public.habits enable row level security;
alter table public.habit_versions enable row level security;
alter table public.daily_habit_entries enable row level security;
alter table public.daily_notes enable row level security;
alter table public.user_journey_settings enable row level security;
alter table public.operation_receipts enable row level security;
