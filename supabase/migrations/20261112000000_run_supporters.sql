-- Supporter in Gruppen: Wer nur aushelfen will, belegt einen freien Platz, macht ihn aber frei,
-- sobald sich jemand fest für dieselbe Rolle anmeldet (der Supporter rückt auf die Warteliste).
-- Beim Nachrücken haben feste Anmeldungen Vorrang vor Supportern.
-- Bestehende Anmeldungen bleiben feste Anmeldungen (Standard: false).

alter table public.run_participants
  add column if not exists support boolean not null default false;

-- join_run bekommt den Parameter p_support (Standard false – alte Aufrufe mit vier Parametern
-- funktionieren weiter). Die alte Fassung mit vier Parametern wird ersetzt.
drop function if exists public.join_run(uuid, text, uuid, text);

create function public.join_run(
  p_run_id uuid,
  p_member_id text,
  p_character_id uuid,
  p_role text,
  p_support boolean default false
) returns text
language plpgsql
set search_path = public
as $$
declare
  v_run public.runs%rowtype;
  v_capacity int;
  v_taken int;
  v_placement text;
  v_bumped text;
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
  else
    -- Rolle voll: eine feste Anmeldung verdrängt den zuletzt angemeldeten Supporter dieser Rolle
    if not p_support then
      update public.run_participants set placement = 'waitlist'
        where (run_id, member_id) = (
          select run_id, member_id from public.run_participants
            where run_id = p_run_id and role = p_role and placement = 'participant' and support
            order by joined_at desc
            limit 1
        )
        returning member_id into v_bumped;
    end if;

    if v_bumped is not null then
      v_placement := 'participant';
    elsif v_run.waitlist_enabled then
      v_placement := 'waitlist';
    else
      raise exception 'role-full';
    end if;
  end if;

  insert into public.run_participants (run_id, member_id, character_id, role, placement, support)
    values (p_run_id, p_member_id, p_character_id, p_role, v_placement, p_support);
  update public.runs set updated_at = now() where id = p_run_id;

  return v_placement;
end;
$$;

-- Abmeldung: beim Nachrücken zuerst feste Anmeldungen, dann Supporter (je nach Anmeldezeit)
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
          order by support, joined_at
          limit 1
      )
      returning member_id into v_promoted;
  end if;

  update public.runs set updated_at = now() where id = p_run_id;
  return v_promoted;
end;
$$;

-- Rechte wie bisher: nur der Server (service_role) darf die Funktionen aufrufen
revoke execute on function public.join_run(uuid, text, uuid, text, boolean) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.join_run(uuid, text, uuid, text, boolean) to service_role;
  end if;
end;
$$;
