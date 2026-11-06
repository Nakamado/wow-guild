-- Mitglieder, die sich auf der Seite angemeldet haben.
-- Ohne Discord-Bot ist das die Mitgliederliste; mit Bot dient sie nur als Profil-Cache.
-- Gespeichert wird nur, was Discord beim Login ohnehin liefert (Name, Avatar) und der
-- Stand der Gildenrolle bei der letzten Prüfung – keine E-Mail, keine Tokens.
create table public.members (
  id text primary key check (id ~ '^[0-9]{5,25}$'),
  display_name text not null check (char_length(display_name) between 1 and 64),
  avatar_url text check (avatar_url is null or avatar_url like 'https://%'),
  is_guild_member boolean not null default false,
  is_admin boolean not null default false,
  roles_checked_at timestamptz not null default now(),
  last_login_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index members_guild on public.members (is_guild_member) where is_guild_member;

create trigger members_touch before update on public.members
  for each row execute function public.touch_updated_at();

alter table public.members enable row level security;
