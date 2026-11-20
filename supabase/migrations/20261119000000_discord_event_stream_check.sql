-- Discord-Event-Archiv: automatische Absage ausgefallener Streams.
-- Nach dem Ende eines Stream-Events (Twitch-Link als Ort oder „Stream“ im Titel) prüft die Webseite
-- einmal, ob es auf Twitch eine passende Übertragung gibt. Wenn nicht, gilt das Event als abgesagt
-- („Kein Stream auf Twitch gefunden“). Admins können das auf der Webseite zurücknehmen.
-- Nur neue Spalten mit Standardwerten – bestehende Zeilen bleiben unverändert.

alter table public.discord_event_archive
  add column if not exists location text check (location is null or char_length(location) <= 300),
  add column if not exists stream_checked boolean not null default false,
  add column if not exists auto_cancelled boolean not null default false;
