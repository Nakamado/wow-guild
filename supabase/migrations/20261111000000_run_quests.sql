-- Gruppen: optional die Dungeon-Quests, die die Gruppe erledigen will (Quest-IDs aus dem Dungeon Journal).
-- Leeres Array = keine Angabe. Bestehende Gruppen bleiben unverändert (Standard: leer).
alter table public.runs
  add column if not exists quest_ids integer[] not null default '{}'
  constraint runs_quest_ids_limit check (cardinality(quest_ids) <= 30);
