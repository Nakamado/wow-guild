-- WoW: Forever: Charaktere haben Vor- und Nachnamen (je 2–12 Buchstaben),
-- gespeichert als „Vorname Nachname“. Die genaue Prüfung (Buchstaben, Schreibweise)
-- übernimmt Nitro; hier wird die Struktur abgesichert.
alter table public.characters drop constraint characters_name_check;
alter table public.characters add constraint characters_name_check check (
  name ~ '^[^ ]{2,12} [^ ]{2,12}$'
);
