-- Discord-Ankündigungen: welche Bot-Nachricht zu welcher Gruppe bzw. welchem Gilden-Event gehört,
-- damit der Bot sie bearbeiten (Besetzung, Termin, „abgesagt“) und beim Löschen entfernen kann.
-- Bei Gruppen ist die Thread-ID gleich der Nachrichten-ID (Thread an der Nachricht gestartet).
-- Bestehende Tabellen bleiben unverändert. Zugriff nur über den Server (Service-Role-Key).

create table public.discord_announcements (
  subject_type text not null check (subject_type in ('run', 'guild_event')),
  subject_id uuid not null,
  channel_id text not null check (channel_id ~ '^[0-9]{5,25}$'),
  message_id text not null check (message_id ~ '^[0-9]{5,25}$'),
  has_thread boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (subject_type, subject_id)
);

alter table public.discord_announcements enable row level security;
