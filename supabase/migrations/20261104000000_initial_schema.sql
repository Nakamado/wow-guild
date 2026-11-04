-- ─────────────────────────────────────────────────────────────────────────────
-- Miinyu WoW Forever – Grundschema
--
-- Zugriff ausschließlich serverseitig (Nitro, Service-Role-Key). Die Identität kommt
-- von Discord, deshalb ist `member_id` die Discord-User-ID (Text, Snowflake).
-- RLS ist aktiv, es gibt bewusst KEINE Policies für anon/authenticated:
-- Ein versehentlich veröffentlichter anon-Key kann so nichts lesen oder schreiben.
-- Alle Zeitpunkte als timestamptz (UTC).
-- ─────────────────────────────────────────────────────────────────────────────

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  member_id text not null check (member_id ~ '^[0-9]{5,25}$'),
  name text not null check (char_length(name) between 2 and 12),
  realm text not null check (char_length(realm) between 1 and 64),
  faction text not null check (faction in ('alliance', 'horde')),
  class_id text not null check (class_id ~ '^[a-z0-9-]+$'),
  race_id text not null check (race_id ~ '^[a-z0-9-]+$'),
  level smallint not null check (level between 1 and 60),
  roles text[] not null check (
    cardinality(roles) between 1 and 3
    and roles <@ array['tank', 'healer', 'dps']::text[]
  ),
  is_main boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Höchstens ein Hauptcharakter je Mitglied
create unique index characters_one_main_per_member on public.characters (member_id) where is_main;
-- Charakternamen sind je Realm eindeutig
create unique index characters_name_realm on public.characters (lower(name), realm);
create index characters_member on public.characters (member_id);

create table public.runs (
  id uuid primary key default gen_random_uuid(),
  dungeon_slug text not null check (dungeon_slug ~ '^[a-z0-9-]+$'),
  title text check (char_length(title) <= 80),
  description text not null default '' check (char_length(description) <= 500),
  starts_at timestamptz not null,
  organizer_id text not null check (organizer_id ~ '^[0-9]{5,25}$'),
  status text not null default 'open' check (status in ('open', 'cancelled', 'completed')),
  capacity_tank smallint not null check (capacity_tank between 0 and 40),
  capacity_healer smallint not null check (capacity_healer between 0 and 40),
  capacity_dps smallint not null check (capacity_dps between 0 and 40),
  waitlist_enabled boolean not null default false,
  -- Referenz auf ein per Bot angelegtes Discord-Event (verhindert Duplikate im Kalender)
  discord_event_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint runs_capacity_not_empty check (capacity_tank + capacity_healer + capacity_dps between 1 and 40)
);

create index runs_starts_at on public.runs (starts_at);
create index runs_organizer on public.runs (organizer_id);

create table public.run_participants (
  run_id uuid not null references public.runs (id) on delete cascade,
  member_id text not null,
  -- Kommende Anmeldungen prüft Nitro vor dem Löschen (sonst rückt niemand nach);
  -- vergangene Anmeldungen verschwinden mit dem Charakter
  character_id uuid not null references public.characters (id) on delete cascade,
  role text not null check (role in ('tank', 'healer', 'dps')),
  placement text not null check (placement in ('participant', 'waitlist')),
  joined_at timestamptz not null default clock_timestamp(),
  primary key (run_id, member_id),
  constraint run_participants_character_once unique (run_id, character_id)
);

create index run_participants_member on public.run_participants (member_id);
create index run_participants_character on public.run_participants (character_id);
create index run_participants_waitlist on public.run_participants (run_id, role, joined_at) where placement = 'waitlist';

-- ── updated_at automatisch pflegen ───────────────────────────────────────────
create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger characters_touch before update on public.characters
  for each row execute function public.touch_updated_at();
create trigger runs_touch before update on public.runs
  for each row execute function public.touch_updated_at();

-- ── Anmeldung: atomar, ohne Überbuchung ──────────────────────────────────────
-- Fachliche Prüfungen (Klasse/Rolle, Mindeststufe, Gildenrolle) erfolgen vorher in Nitro
-- mit der gemeinsamen Domain-Logik. Hier wird unter Sperre des Runs geprüft, was sich
-- zwischen zwei gleichzeitigen Anfragen ändern kann: Status, Plätze, Doppelanmeldungen.
-- Fehler werden als Code im Meldungstext geworfen (z. B. 'role-full').
create function public.join_run(
  p_run_id uuid,
  p_member_id text,
  p_character_id uuid,
  p_role text
) returns text
language plpgsql
set search_path = public
as $$
declare
  v_run public.runs%rowtype;
  v_capacity int;
  v_taken int;
  v_placement text;
begin
  select * into v_run from public.runs where id = p_run_id for update;
  if not found then
    raise exception 'run-not-found';
  end if;
  if v_run.status <> 'open' then
    raise exception 'run-not-open';
  end if;
  if v_run.starts_at <= now() then
    raise exception 'run-started';
  end if;

  if not exists (select 1 from public.characters where id = p_character_id and member_id = p_member_id) then
    raise exception 'character-not-owned';
  end if;
  if exists (select 1 from public.run_participants where run_id = p_run_id and member_id = p_member_id) then
    raise exception 'already-joined';
  end if;
  if exists (select 1 from public.run_participants where run_id = p_run_id and character_id = p_character_id) then
    raise exception 'character-already-joined';
  end if;

  v_capacity := case p_role
    when 'tank' then v_run.capacity_tank
    when 'healer' then v_run.capacity_healer
    when 'dps' then v_run.capacity_dps
  end;
  if v_capacity is null then
    raise exception 'role-not-supported';
  end if;

  select count(*) into v_taken from public.run_participants
    where run_id = p_run_id and role = p_role and placement = 'participant';

  if v_taken < v_capacity then
    v_placement := 'participant';
  elsif v_run.waitlist_enabled then
    v_placement := 'waitlist';
  else
    raise exception 'role-full';
  end if;

  insert into public.run_participants (run_id, member_id, character_id, role, placement)
    values (p_run_id, p_member_id, p_character_id, p_role, v_placement);
  update public.runs set updated_at = now() where id = p_run_id;

  return v_placement;
end;
$$;

-- ── Abmeldung mit Nachrücken von der Warteliste ──────────────────────────────
-- Gibt die member_id der nachgerückten Person zurück (oder null).
create function public.leave_run(
  p_run_id uuid,
  p_member_id text
) returns text
language plpgsql
set search_path = public
as $$
declare
  v_run public.runs%rowtype;
  v_entry public.run_participants%rowtype;
  v_promoted text;
begin
  select * into v_run from public.runs where id = p_run_id for update;
  if not found then
    raise exception 'run-not-found';
  end if;
  if v_run.status <> 'open' then
    raise exception 'run-not-open';
  end if;

  delete from public.run_participants
    where run_id = p_run_id and member_id = p_member_id
    returning * into v_entry;
  if not found then
    raise exception 'not-joined';
  end if;

  if v_entry.placement = 'participant' then
    update public.run_participants set placement = 'participant'
      where (run_id, member_id) = (
        select run_id, member_id from public.run_participants
          where run_id = p_run_id and role = v_entry.role and placement = 'waitlist'
          order by joined_at
          limit 1
      )
      returning member_id into v_promoted;
  end if;

  update public.runs set updated_at = now() where id = p_run_id;
  return v_promoted;
end;
$$;

-- ── Hauptcharakter wechseln (atomar, wegen des Unique-Index) ─────────────────
create function public.set_main_character(
  p_member_id text,
  p_character_id uuid
) returns void
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from public.characters where id = p_character_id and member_id = p_member_id) then
    raise exception 'character-not-owned';
  end if;
  update public.characters set is_main = false where member_id = p_member_id and is_main and id <> p_character_id;
  update public.characters set is_main = true where id = p_character_id;
end;
$$;

-- ── Zugriff absichern ────────────────────────────────────────────────────────
alter table public.characters enable row level security;
alter table public.runs enable row level security;
alter table public.run_participants enable row level security;

-- Funktionen nur für den Service-Role-Key ausführbar (Rollen existieren nur in Supabase)
revoke execute on function public.join_run(uuid, text, uuid, text) from public;
revoke execute on function public.leave_run(uuid, text) from public;
revoke execute on function public.set_main_character(text, uuid) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.join_run(uuid, text, uuid, text) to service_role;
    grant execute on function public.leave_run(uuid, text) to service_role;
    grant execute on function public.set_main_character(text, uuid) to service_role;
  end if;
end;
$$;
