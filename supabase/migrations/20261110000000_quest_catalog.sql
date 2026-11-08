-- Quest-Katalog: einmal bei Blizzard nachgeschlagene Questdaten (ändern sich nicht).
-- Spart bei jeder Ranglisten-Aktualisierung hunderte API-Abrufe. Keine personenbezogenen Daten.
create table public.quest_catalog (
  id integer primary key check (id > 0),
  title text not null check (char_length(title) between 1 and 120),
  type_id integer,
  area_id integer,
  faction text check (faction is null or faction in ('alliance', 'horde')),
  restricted boolean not null default false,
  fetched_at timestamptz not null default now()
);

alter table public.quest_catalog enable row level security;
