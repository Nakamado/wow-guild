-- Gilden-Events: Termine, die Mitglieder direkt auf der Webseite eintragen (ohne Discord-Event).
-- Eintragen: alle Gildenmitglieder; bearbeiten/absagen: wer es eingetragen hat und Admins
-- (geprüft im Server, die Tabelle ist nur mit dem Service-Role-Key erreichbar).

create table public.guild_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 1000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text check (location is null or char_length(location) between 1 and 80),
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_by text not null check (created_by ~ '^[0-9]{5,25}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guild_events_ends_after_start check (ends_at is null or (ends_at > starts_at and ends_at - starts_at <= interval '24 hours'))
);

create index guild_events_starts_at on public.guild_events (starts_at);

create trigger guild_events_touch before update on public.guild_events
  for each row execute function public.touch_updated_at();

alter table public.guild_events enable row level security;
