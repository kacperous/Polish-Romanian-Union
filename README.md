# Unia Polsko-Rumuńska 🇵🇱🤝🇷🇴

Kooperacyjny pikselowy beat 'em up 2D (w stylu Kunio-kun / *Nekketsu Kakutō Densetsu*) w **TypeScript + Phaser 4**.
Polak i Rumun idą ulicami niemieckiego przedmieścia — od polskiej granicy (prawa strona) w głąb Niemiec (w lewo) —
i kradną po kolei trzy rzeczy. Na końcu razem zwijają auto i uciekają z powrotem na wschód.

**Rozdział II „Król Lawet”** (inspirowany *Downtown Nekketsu Monogatari / River City Ransom*): auto zostaje
odholowane w miasteczku Ordnungsburg. Otwarte miasto, sklepy z jedzeniem podnoszącym statystyki, książki
z technikami, pięć band z szefami, pieczątki do zebrania, zapis gry hasłem. Plan: `docs/PLAN_ROZDZIAL_2.md`.

## Języki

Gra jest dostępna po **polsku, angielsku i rumuńsku** (flagi PL / EN / RO w prawym górnym rogu menu).
Domyślny język wybiera się z ustawień przeglądarki, a wybór jest zapamiętywany. W grze online każdy gracz
może mieć swój język — host wysyła tylko klucze tłumaczeń (`src/i18n/`).

## Jak grać

| | Klawiatura | Telefon |
|---|---|---|
| Ruch (także w głąb ulicy) | WASD / strzałki | joystick (lewa strona ekranu) |
| Bieg | 2× stuknięcie w bok | joystick wychylony do końca |
| Cios | J / Spacja / Z | przycisk **BIJ** |
| Skok (w powietrzu BIJ = cios z wyskoku) | L / C / Shift | przycisk **SKOK** |
| Akcja (przytrzymaj) — kradzież, podnoszenie, sklep | K / E / X | przycisk **AKCJA** |
| Blok (AKCJA bez celu, przodem do wroga) | K / E / X | przycisk **AKCJA** |
| Pauza / status / hasło | ESC / P | przycisk **II** |

**Walka** — powalony wróg (3 ciosy z rzędu, cios w skoku lub w biegu) da się podnieść (AKCJA) i rzucić (BIJ)
w innych. Z ulicy podnosi się kosze, skrzynki, butelki, opony (rzut) oraz pachołki, grabie, bagietki (broń).
Seria trafień przewraca też gracza; ciosy wroga można przeskoczyć albo zablokować.

**Postacie**
- **Polak** — pałka: mocne ciosy, rozwala kłódki, stoi na czatach przy aucie.
- **Rumun** — lekka ręka: okrada Niemców **od tyłu** (przytrzymaj AKCJA), otwiera kłódki i auta wytrychem, kopie.

**Mechanika odwracania się i RAGE**
Niemcy co jakiś czas się odwracają — zanim to zrobią, nad głową pokazuje się **?**.
Rumun może okraść tylko kogoś, kto stoi do niego plecami. Jeśli ofiara (albo ktokolwiek inny w pobliżu)
odwróci się w trakcie kradzieży — Szwab dostaje **RAGE (WUT!)**: czerwienieje, dostaje więcej życia,
jest szybszy i bije dwa razy mocniej. Bójki i wpadki podnoszą pasek **POLIZEI** — gdy się zapełni, przyjeżdża policja.
Znokautowanych można przeszukać (AKCJA). Jeśli kumpel padnie — podnieś go (AKCJA obok niego).

**Rozdział I — prolog**
1. **Przedmieście** — ukradnij krasnala ogrodowego, gdy ogrodnik nie patrzy.
2. **Einkaufsstraße** — ukradnij rower (Polak rozwala kłódkę pałką albo Rumun otwiera ją wytrychem).
3. **Willowe osiedle** — Rumun otwiera auto, Polak stoi na czatach, potem **obaj** wsiadają i uciekają.

**Rozdział II — Ordnungsburg**
- Miasto: `holownia ← Altstadt ← Stadion ← BAZA → Bahnhof → Kleingarten → Industrie`. W co-opie przejście
  do sąsiedniej dzielnicy, gdy obaj stoją przy krawędzi (albo po 3 s czekania).
- **Baza** (sklepy pani Haliny i Nea Costela) jest bezpieczna i tu zapisuje się gra.
- **Statystyki** (Siła, Kopnięcie, Rzut, Zwinność, Obrona, Lekka ręka, Wytrzymałość, Twardy łeb) rosną tylko
  od jedzenia (zjedzone na miejscu albo z ekwipunku) i nagród — nie ma punktów doświadczenia.
- **Techniki** z książek: Młynek z pałki, Kopniak z wyskoku, Seria Bukareszt, Kamienna pięść (przytrzymaj BIJ),
  Taran, Oszczep, Ręce jak brzytwa, Krawaciarz, Klepnięcie kumpla.
- **Bandy**: kontrolerzy biletów (spóźnieni, ale bolą), działkowcy (rzucają krasnalami), Pfandsammler
  (zbierają wasze monety), kibice (szarże), Ordnungsamt (mandaty zamiast ciosów).
- **Szefowie band** dają pieczątki; z pięcioma otwiera się holownia Klausa. Thorstena z bębnem trzeba przeskakiwać.
- Pokonani członkowie band zostawiają **monety** na ziemi. Butelki zwrotne oddaje się w **automatach Pfand**.
- Porażka = **Strafzettel**: połowa kasy znika, wracacie do bazy. Ukryte krasnale i zadanie Haliny dają premie.
- **Zapis**: automatycznie w przeglądarce hosta (KONTYNUUJ w lobby) oraz jako **hasło** w menu pauzy
  (HASŁO w lobby) — działa na innym urządzeniu.

## Gra we dwóch (kod 6-cyfrowy)

1. Gracz 1: **STWÓRZ GRĘ ONLINE** → dostaje 6-cyfrowy kod (albo „KOPIUJ LINK”).
2. Gracz 2: **DOŁĄCZ (KOD)** → wpisuje kod (albo otwiera link `?join=KOD`).
3. Każdy wybiera postać (Polak / Rumun), host wybiera rozdział (Prolog / Rozdział II / Kontynuuj / Hasło)
   i klika **START**.

Host liczy logikę świata (NPC, walka, cele); serwer tylko przekazuje wiadomości w pokoju (WebSocket `/ws`).
Jest też tryb **GRAJ SOLO**.

## Uruchomienie lokalne

```bash
npm install
npm run build      # buduje klienta (dist/) i serwer (build/)
npm start          # http://localhost:3000  (port zmienisz zmienną PORT)
npm test           # testy symulacji (Vitest)
```

Tryb deweloperski (dwa terminale): `npm run dev:server` + `npm run dev` (Vite przekierowuje `/ws` na port 3000).

## Docker / Coolify

**Coolify (Docker Compose):** utwórz zasób typu *Docker Compose* wskazujący na to repo (plik `docker-compose.yml`).
Compose **nie publikuje żadnego portu na hoście** (jest `expose: 3000` zamiast `ports:`), więc nie ma konfliktów
z zajętym 8080 itp. — ruch z domeny kieruje proxy Coolify (Traefik) prosto do kontenera, razem z WebSocketami.
Zmienna `SERVICE_FQDN_GAME_3000` sprawia, że Coolify sam wygeneruje domenę (możesz też ustawić własną w panelu).

**Zwykły Docker bez Coolify** — Docker sam wybierze pierwszy wolny port:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.local.yml port game 3000   # pokaże wybrany port
```

Healthcheck: `GET /health`.

## Grafika i dźwięk

Wszystkie grafiki (postacie, tła 3 poziomów, przedmioty, efekty) oraz dźwięki i muzyka chiptune są **wygenerowane
proceduralnie** skryptami w `tools/` (Python + Pillow + NumPy) — bez cudzych assetów:

```bash
npm run assets
```

Jedyny pobrany zasób to font pikselowy **Pixelify Sans** (Google Fonts, licencja SIL Open Font License).

## Struktura

```
server/server.ts        serwer HTTP + WebSocket (pokoje na kod)
src/game/Sim.ts         logika świata (liczona u hosta): walka, przedmioty, NPC, sklepy
src/game/chapters/      zasady rozdziałów: prolog.ts (krasnal/rower/auto), city.ts (miasto, bossowie, finał)
src/game/data/          dane: obszary, miasto, przedmioty, sklepy, techniki, fabuła i dialogi
src/game/stats.ts       statystyki postaci i wzory
src/game/save.ts        zapis w localStorage i hasło (base32 + CRC-8)
src/i18n/               tłumaczenia PL / EN / RO
src/scenes/*            sceny Phasera: menu, dołączanie, lobby, gra, HUD/dotyk, koniec
tools/                  generatory grafiki i dźwięku (gen_ch2.py — Rozdział II)
public/assets/          wygenerowane assety
```

*Gra jest satyrą i żartem z narodowych stereotypów — nie traktujcie jej poważnie.* 😉
