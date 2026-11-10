-- Benachrichtigungen (Glocke): nur auf der Webseite, keine Discord-Nachrichten.
-- Jede Zeile gehört genau einem Mitglied; gelesen/ungelesen über read_at.
-- Zugriff nur über den Server (Service-Role-Key), der die eigene member_id prüft.
-- Ohne Fremdschlüssel auf runs: Hinweise zu gelöschten Gruppen sollen lesbar bleiben.
-- Aufbewahrung: Die tägliche Bereinigung löscht Einträge nach 30 Tagen.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  member_id text not null check (member_id ~ '^[0-9]{5,25}$'),
  kind text not null check (kind in (
    'run-joined', 'run-left', 'run-bumped', 'run-relocated',
    'run-promoted', 'run-rescheduled', 'run-cancelled', 'run-deleted'
  )),
  run_id uuid,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 2048),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_member_created on public.notifications (member_id, created_at desc);
create index notifications_member_unread on public.notifications (member_id) where read_at is null;

alter table public.notifications enable row level security;
