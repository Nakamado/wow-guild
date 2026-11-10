-- Flex-Anmeldung: Hauptrolle + optionale Ausweichrolle (z. B. „Heiler, sonst DD“).
-- alt_role = die jeweils andere Rolle; moved = true, wenn die Person gerade in ihrer
-- Ausweichrolle sitzt (alt_role ist dann die eigentliche Hauptrolle).
-- Bestehende Anmeldungen bleiben unverändert (keine Ausweichrolle).

alter table public.run_participants
  add column if not exists alt_role text check (alt_role in ('tank', 'healer', 'dps')),
  add column if not exists moved boolean not null default false;

-- join_run mit Ausweichrolle; Reihenfolge wie planJoin() in shared/domain/runs.ts:
-- 1. freier Platz in Haupt-, sonst Ausweichrolle
-- 2. ein Flex-Teilnehmer wechselt in seine Ausweichrolle (falls dort frei) und macht Platz
-- 3. nur feste Anmeldung: zuletzt angemeldeter Supporter rückt auf die Warteliste
-- 4. Warteliste (falls aktiv), sonst 'role-full'
drop function if exists public.join_run(uuid, text, uuid, text, boolean);

create function public.join_run(
  p_run_id uuid,
  p_member_id text,
  p_character_id uuid,
  p_role text,
  p_support boolean default false,
  p_alt_role text default null
) returns text
language plpgsql
set search_path = public
as $$
declare
  v_run public.runs%rowtype;
  v_roles text[];
  v_target text;
  v_assigned text;
  v_flex public.run_participants%rowtype;
  v_bumped text;
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
  if p_role not in ('tank', 'healer', 'dps') or (p_alt_role is not null and p_alt_role not in ('tank', 'healer', 'dps')) then
    raise exception 'role-not-supported';
  end if;

  if p_alt_role is not null and p_alt_role <> p_role then
    v_roles := array[p_role, p_alt_role];
  else
    v_roles := array[p_role];
    p_alt_role := null;
  end if;

  -- 1. freier Platz
  foreach v_target in array v_roles loop
    if public.run_role_open(v_run, v_target) then
      v_assigned := v_target;
      exit;
    end if;
  end loop;

  -- 2. Flex-Teilnehmer umsetzen
  if v_assigned is null then
    foreach v_target in array v_roles loop
      select * into v_flex from public.run_participants p
        where p.run_id = p_run_id and p.placement = 'participant' and p.role = v_target
          and p.alt_role is not null and p.alt_role <> v_target
          and public.run_role_open(v_run, p.alt_role)
        order by p.joined_at desc
        limit 1;
      if found then
        update public.run_participants
          set role = v_flex.alt_role, alt_role = v_flex.role, moved = not v_flex.moved
          where run_id = p_run_id and member_id = v_flex.member_id;
        v_assigned := v_target;
        exit;
      end if;
    end loop;
  end if;

  -- 3. Supporter verdrängen (nur bei fester Anmeldung)
  if v_assigned is null and not p_support then
    foreach v_target in array v_roles loop
      update public.run_participants set placement = 'waitlist'
        where (run_id, member_id) = (
          select run_id, member_id from public.run_participants
            where run_id = p_run_id and role = v_target and placement = 'participant' and support
            order by joined_at desc
            limit 1
        )
        returning member_id into v_bumped;
      if v_bumped is not null then
        v_assigned := v_target;
        exit;
      end if;
    end loop;
  end if;

  if v_assigned is not null then
    v_placement := 'participant';
  elsif v_run.waitlist_enabled then
    v_placement := 'waitlist';
    v_assigned := p_role;
  else
    raise exception 'role-full';
  end if;

  -- in der Ausweichrolle gelandet: Rollen getauscht speichern
  if v_assigned = p_role then
    insert into public.run_participants (run_id, member_id, character_id, role, placement, support, alt_role, moved)
      values (p_run_id, p_member_id, p_character_id, p_role, v_placement, p_support, p_alt_role, false);
  else
    insert into public.run_participants (run_id, member_id, character_id, role, placement, support, alt_role, moved)
      values (p_run_id, p_member_id, p_character_id, v_assigned, v_placement, p_support, p_role, true);
  end if;
  update public.runs set updated_at = now() where id = p_run_id;

  return v_placement;
end;
$$;

-- Ist in dieser Rolle noch ein Platz frei?
create or replace function public.run_role_open(p_run public.runs, p_role text) returns boolean
language sql
stable
set search_path = public
as $$
  select (case p_role
            when 'tank' then p_run.capacity_tank
            when 'healer' then p_run.capacity_healer
            when 'dps' then p_run.capacity_dps
            else 0
          end) > (
    select count(*) from public.run_participants
      where run_id = p_run.id and role = p_role and placement = 'participant'
  );
$$;

-- Abmeldung: Nachrücken mit Haupt- oder Ausweichrolle, feste Anmeldungen vor Supportern
create or replace function public.leave_run(
  p_run_id uuid,
  p_member_id text
) returns text
language plpgsql
set search_path = public
as $$
declare
  v_run public.runs%rowtype;
  v_entry public.run_participants%rowtype;
  v_next public.run_participants%rowtype;
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
    select * into v_next from public.run_participants
      where run_id = p_run_id and placement = 'waitlist'
        and (role = v_entry.role or alt_role = v_entry.role)
      order by support, joined_at
      limit 1;
    if found then
      if v_next.role = v_entry.role then
        update public.run_participants set placement = 'participant'
          where run_id = p_run_id and member_id = v_next.member_id;
      else
        update public.run_participants
          set placement = 'participant', role = v_next.alt_role, alt_role = v_next.role, moved = not v_next.moved
          where run_id = p_run_id and member_id = v_next.member_id;
      end if;
    end if;
  end if;

  update public.runs set updated_at = now() where id = p_run_id;
  return v_next.member_id;
end;
$$;

-- Rechte wie bisher: nur der Server (service_role)
revoke execute on function public.join_run(uuid, text, uuid, text, boolean, text) from public;
revoke execute on function public.run_role_open(public.runs, text) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.join_run(uuid, text, uuid, text, boolean, text) to service_role;
    grant execute on function public.run_role_open(public.runs, text) to service_role;
  end if;
end;
$$;
