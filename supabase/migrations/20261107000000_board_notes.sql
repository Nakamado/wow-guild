-- Schwarzes Brett: kurze Aushänge der Admins, nur für Gildenmitglieder sichtbar.
-- Zugriff ausschließlich über den Server (Service-Role); RLS ohne Policies sperrt alles andere.
create table public.board_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  body text check (body is null or char_length(body) <= 400),
  -- letzter Tag der Sichtbarkeit (Berliner Zeit), null = bis zum Entfernen
  expires_on date,
  created_by text not null check (created_by ~ '^[0-9]{5,25}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index board_notes_created on public.board_notes (created_at desc);

create trigger board_notes_touch before update on public.board_notes
  for each row execute function public.touch_updated_at();

alter table public.board_notes enable row level security;
