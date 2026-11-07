-- ─────────────────────────────────────────────────────────────────────────────
-- Adminbereich: Webseitenrollen, Aktivitätsprotokoll, Ranglistenfreigaben
--
-- Bestehende Daten bleiben unverändert:
-- - members.is_admin ist ab jetzt die Webseitenrolle „Admin“ (vorher eine Kopie der
--   Discord-Adminrolle). Wer heute Admin ist, bleibt Admin; ändern lässt sich das nur noch
--   im Adminbereich durch den Hauptadmin. Der Hauptadmin steht nicht in der Datenbank,
--   sondern in der serverseitigen Umgebungsvariable NUXT_SUPERADMIN_USER_ID.
-- - Bestehende Ranglisten-Zustimmungen (members.leaderboard_opt_in) bleiben erhalten.
-- - Es werden keine Freigaben erzeugt und keine Aktivitäten rückwirkend erfasst.
-- ─────────────────────────────────────────────────────────────────────────────

comment on column public.members.is_admin is
  'Webseitenrolle Admin – wird nur im Adminbereich durch den Hauptadmin geändert, nicht mehr aus Discord-Rollen übernommen';

alter table public.members
  -- zuletzt bestätigter Stand der Datenschutzerklärung (0 = Hinweis noch nicht gesehen)
  add column privacy_notice_version smallint not null default 0 check (privacy_notice_version >= 0),
  -- letzter Widerruf der Ranglistenteilnahme: neue Adminfreigaben brauchen eine Zustimmung ab diesem Tag
  add column leaderboard_revoked_at timestamptz;

-- ── Aktivitätsprotokoll ─────────────────────────────────────────────────────
-- Nur wesentliche Konto-, Charakter-, Rollen- und Freigabeänderungen. Keine Logins,
-- keine Seitenaufrufe, keine IP-Adressen, keine alten Datensätze.
create table public.activity_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  action text not null check (action ~ '^[a-z]+(\.[a-z-]+)+$'),
  -- ausführende Person (Discord-ID); null = System (z. B. automatische Bereinigung)
  actor_id text check (actor_id is null or actor_id ~ '^[0-9]{5,25}$'),
  subject_type text not null check (subject_type in ('member', 'character', 'leaderboard')),
  subject_id text check (subject_id is null or char_length(subject_id) <= 64),
  summary text not null check (char_length(summary) between 1 and 200),
  -- Löschdatum wird beim Schreiben aus der konfigurierten Frist berechnet
  retain_until timestamptz not null
);

create index activity_log_occurred on public.activity_log (occurred_at desc);
create index activity_log_retain on public.activity_log (retain_until);

alter table public.activity_log enable row level security;

-- ── Ranglistenfreigaben durch den Hauptadmin (je Charakter) ──────────────────
create table public.leaderboard_grants (
  id uuid primary key default gen_random_uuid(),
  member_id text not null references public.members (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  consent_channel text not null check (consent_channel in ('discord-message', 'discord-voice', 'in-game', 'in-person', 'other')),
  consent_date date not null,
  note text check (note is null or char_length(note) <= 300),
  -- Pfad im privaten Storage-Bucket „consent-evidence“ (nie eine öffentliche URL)
  evidence_path text check (evidence_path is null or evidence_path ~ '^[0-9a-f-]{36}\.(png|jpg|webp)$'),
  granted_by text not null check (granted_by ~ '^[0-9]{5,25}$'),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_reason text check (revoked_reason is null or revoked_reason in ('member', 'admin')),
  constraint leaderboard_grants_revoked check ((revoked_at is null) = (revoked_reason is null))
);

-- höchstens eine aktive Freigabe je Charakter
create unique index leaderboard_grants_active_character on public.leaderboard_grants (character_id) where revoked_at is null;
create index leaderboard_grants_member on public.leaderboard_grants (member_id);

alter table public.leaderboard_grants enable row level security;
