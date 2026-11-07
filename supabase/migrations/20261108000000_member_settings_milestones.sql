-- 1) Mitglieder-Einstellungen
--    leaderboard_opt_in: erscheint nur mit Zustimmung in der öffentlichen Rangliste (jederzeit widerrufbar)
--    is_streamer:        trägt die Discord-Rolle „Streamer“ (Stand der letzten Rollenprüfung)
--    twitch_login:       selbst eingetragener Twitch-Kanal (nur Kleinbuchstaben, Ziffern, _)
alter table public.members
  add column leaderboard_opt_in boolean not null default false,
  add column is_streamer boolean not null default false,
  add column twitch_login text check (twitch_login is null or twitch_login ~ '^[a-z0-9_]{3,25}$');

-- 2) Automatisch erkannte Meilensteine der Gilden-Chronik (z. B. „10 Mitglieder erreicht“).
--    Einmal erkannt, bleiben sie erhalten – auch wenn die Mitgliederzahl später sinkt.
--    dedupe_key verhindert Doppelte; Zugriff nur über den Server (RLS ohne Policies).
create table public.guild_milestones (
  dedupe_key text primary key check (char_length(dedupe_key) between 1 and 100),
  milestone jsonb not null,
  detected_at timestamptz not null default now()
);

alter table public.guild_milestones enable row level security;
