-- Archiv der Discord-Server-Events: Discord entfernt abgeschlossene Events nach kurzer Zeit aus
-- seiner Schnittstelle. Damit vergangene Events (z. B. Streams) im Kalender bleiben, merkt sich die
-- Webseite jedes Event, das sie bei Discord sieht. Gespeichert werden nur Event-Daten
-- (Titel, Beschreibung, Zeiten, Status, Link) – keine Namen von Personen.
-- Zusätzlich können Admins ein Discord-Event auf der Webseite als abgesagt markieren
-- (z. B. ausgefallener Stream, dessen Discord-Event nicht abgesagt wurde).
-- Bestehende Tabellen bleiben unverändert. Zugriff nur über den Server (Service-Role-Key).

create table public.discord_event_archive (
  id text primary key check (id ~ '^[0-9]{5,25}$'),
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 2000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null check (status in ('scheduled', 'active', 'completed', 'cancelled')),
  url text,
  site_cancelled boolean not null default false,
  site_cancel_reason text check (site_cancel_reason is null or char_length(site_cancel_reason) between 1 and 200),
  updated_at timestamptz not null default now()
);

create index discord_event_archive_starts on public.discord_event_archive (starts_at desc);

alter table public.discord_event_archive enable row level security;
