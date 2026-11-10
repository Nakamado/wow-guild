-- Absagen mit optionalem Grund („krank“, „zu wenig Anmeldungen“ …) für Gruppen und Gilden-Events.
-- Bestehende Einträge bleiben unverändert (kein Grund).

alter table public.runs
  add column if not exists cancel_reason text check (cancel_reason is null or char_length(cancel_reason) between 1 and 200);

alter table public.guild_events
  add column if not exists cancel_reason text check (cancel_reason is null or char_length(cancel_reason) between 1 and 200);
