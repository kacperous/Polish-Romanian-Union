# Plan rozszerzenia: „Rozdział II — Król Lawet”

Rozszerzenie fabuły i rozgrywki **Unii Polsko-Rumuńskiej** o elementy inspirowane
*Downtown Nekketsu Monogatari* (*River City Ransom*, Technōs 1989): otwarte, połączone miasto,
sklepy z jedzeniem, które na stałe podnosi statystyki, książki z technikami walki, gangi z
nazwanymi członkami, bossowie z gadką przed walką, bronie podnoszone z ulicy i zapis postępu hasłem.

> Bierzemy **mechaniki** (to gatunek, nie własność), a nie treść: żadnych postaci, imion, okrzyków,
> grafik, map ani muzyki z RCR. Wszystko pozostaje naszą satyrą na polsko-rumuńsko-niemieckie
> stereotypy, w tej samej proceduralnej oprawie z `tools/`.

## Stan wdrożenia

Wszystkie etapy z sekcji 5 są wdrożone (PR #1). Decyzje z sekcji 6 podjęte tak:
- **wspólna kasa Unii** (jedno pole `money` dla obu graczy),
- **friendly fire włączony**: ciosy, rzucone przedmioty i rzuceni wrogowie trafiają kumpla (połowa obrażeń,
  blok działa); trafiony się wkurza (czerwienieje, drży, tupie, para z uszu, okrzyk „FRATE!” / „EJ!”),
- przejście między dzielnicami: **tylko gdy obaj stoją przy tym samym wyjściu** (leżącego trzeba podnieść),
- Rozdział II **odblokowuje się po ukończeniu prologu** (zapamiętane w przeglądarce); KONTYNUUJ i HASŁO
  są dostępne zawsze, bo same są dowodem postępu (np. z innego urządzenia).

Różnice względem pierwotnego planu: blok to przytrzymanie AKCJI bez celu (bez dodatkowego przycisku),
butelka w automacie daje 1 € (kasa jest w pełnych euro), bossowie walczą w swoich dzielnicach zamiast w osobnych obszarach.

---

## 1. Co już mamy (punkt wyjścia)

| Obszar | Stan obecny | Gdzie |
|---|---|---|
| Świat | 3 poziomy obok siebie (`WORLD_W = 2880`), liniowo prawa → lewa, bramy `gateMinX` | `constants.ts` |
| Walka | 1 przycisk ciosu, stałe obrażenia (Polak 2, Rumun 1), odrzut, K.O. | `Sim.resolveAttack` |
| Unikalne | kradzież od tyłu, ostrzeżenie „?”, RAGE/WUT, pasek POLIZEI, przeszukiwanie K.O., podnoszenie kumpla | `Sim.chooseAct`, `caught`, `enrage`, `updateAlarm` |
| Postęp | brak — pieniądze to tylko wynik na ekranie końcowym | `Stats` |
| Sieć | host liczy `Sim`, gość wysyła `PlayerInput`, dostaje `Snapshot` | `Net.ts`, `GameScene` |
| Zapis | brak | — |
| Treści | 7 typów NPC, 3 tła, wszystko z `gen_sprites.py` / `gen_sounds.py` | `tools/` |

Rozdział I (krasnal → rower → auto) zostaje jako **prolog**. Rozdział II startuje tam, gdzie się kończy.

---

## 2. Fabuła

### Premisa
Ucieczka kradzionym autem kończy się po 40 km: bak pusty, auto stoi na zakazie w miasteczku
**Ordnungsburg**. Zanim chłopaki wrócą z kanistrem, auto znika na lawecie. Okazuje się, że miastem
trzęsie **Klaus „Król Lawet” Abschlepp** — właściciel holowni, przewodniczący Kleingartenvereinu i
szwagier połowy Ordnungsamtu. Każda dzielnica należy do jednej z jego „band”. Żeby odzyskać auto,
trzeba zebrać **Freigabeschein** (zwolnienie z parkingu) — pieczątki od pięciu szefów band —
i rozbić bramę holowni.

Cel jest celowo absurdalny i biurokratyczny — to dalej żart, ten sam ton co krasnal i rower.

### Bazy bohaterów (strefy bezpieczne, jak centra handlowe w RCR)
- **Sklep polski „U Haliny”** — pani Halina sprzedaje pierogi i bigos w słoiku, daje zlecenia
  poboczne, tu działa „hasło zapisu”.
- **Magazin Românesc „La Nea Costel”** — mici, sarmale, cozonac; Costel zna każdy skrót w mieście.
W strefach bezpiecznych nie ma walki, pasek POLIZEI spada do zera.

### Bandy i szefowie (każda dzielnica = jedna banda)

| # | Dzielnica | Banda | Styl walki / gimmick | Szef (boss) | Pieczątka |
|---|---|---|---|---|---|
| 1 | Bahnhofsviertel | **Kontrolerzy biletów** | chodzą parami, sprawdzają „bilety”; zawsze się spóźniają o 2 s (opóźniony atak) | **Bliźniacy Fahrschein** — boss-duet | pieczątka kolei |
| 2 | Kleingartenanlage | **Kleingärtner** | rzucają krasnalami, grabie jako broń, bronią grządek | **Gartenzwerg-Günther** (opiekun krasnala z prologu — ma rachunki do wyrównania) | pieczątka Vereinu |
| 3 | Industriegebiet | **Pfandsammler** | szybcy, zbierają butelki z ziemi zanim gracz zdąży | **Pfand-Paul** — rzuca skrzynkami | pieczątka skupu |
| 4 | Stadion | **Ultrasi FC Ordnungsburg** | grupy 4–5 osób, szarże, szaliki jako bicze | **Kapo „Trommel-Thorsten”** z bębnem (fala uderzeniowa) | pieczątka klubu |
| 5 | Altstadt | **Ordnungsamt** | wypisują mandaty (zabierają €), nie biją, tylko podnoszą POLIZEI | **Frau Dr. Paragraf** — rzuca segregatorami | pieczątka urzędu |
| ★ | Abschlepphof | wszyscy po trochu | — | **Klaus Abschlepp** na wózku widłowym, faza 2: pieszo z łańcuchem holowniczym | — |

Każda banda ma **paletę kolorów** (palette-swap tak jak gangi w RCR — tanie w generatorze sprite’ów),
**pulę niemieckich imion** (Jürgen, Uwe, Dieter, Horst, Sabine, Birgit…) wyświetlanych nad głową
przy pierwszym trafieniu oraz **własne okrzyki przy K.O.** („MEIN RÜCKEN!”, „ACH SO…”, „DAS IST
VERBOTEN!”, „ORDNUNG MUSS SEIN!”). Okrzyki to nasze odpowiedniki — nie kopiujemy oryginalnych.

### Wątki poboczne (opcjonalne, nagradzają eksplorację)
- Halina: „przynieś 20 butelek Pfand” → przepis na pierogi (książka techniki).
- Costel: „odzyskaj moją taczkę z ogródków” → zniżka w sklepie.
- Ukryty krasnal z prologu w każdej dzielnicy (5 szt.) → kostium / bonus do statystyk.
- Polizei-Oberkommissar, który goni graczy od prologu, pojawia się jako mini-boss przy pełnym pasku.

### Zakończenie
Odzyskane auto + krasnal na desce rozdzielczej, ucieczka autostradą na wschód (reużycie animacji
`updateCar`), napisy końcowe z wynikami: €, K.O., kradzieże, czas, zebrane pieczątki/krasnale.

---

## 3. Rozgrywka — nowe systemy

### 3.1 Otwarty świat z obszarami (zamiast 3 poziomów obok siebie)
- Miasto = **graf obszarów** (`Area`), każdy ma szerokość 960–1920 px, tło, spawny, wyjścia.
  Wyjście na krawędzi albo „drzwi” (wejście do sklepu, przejście podziemne).
- Bramy pieczątek: Abschlepphof otwiera się dopiero po 5 pieczątkach; reszta miasta dostępna od razu
  po krótkim tutorialu (jak w RCR — gracz sam wybiera kolejność, trudność rośnie z odległością od bazy).
- **Respawn wrogów** po wejściu do obszaru (farmienie € i statystyk — kluczowa pętla RCR).
- W co-opie obaj gracze są zawsze w tym samym obszarze; przejście, gdy obaj stoją w strefie wyjścia
  (albo drugi zostaje „dociągnięty” po 3 s z komunikatem — do decyzji).
- Mapa miasta pod przyciskiem pauzy.

### 3.2 Statystyki postaci (RPG-lite)
Osobne dla Polaka i Rumuna, startowe wartości oddają role:

| Stat (`stats.ts`) | Wpływ | Polak start | Rumun start |
|---|---|---|---|
| **Siła** `sila` | obrażenia pałki / broni | 12 | 6 |
| **Kopnięcie** `kop` | obrażenia kopniaków Rumuna | 6 | 6 |
| **Rzut** `rzut` | obrażenia rzuconych przedmiotów i ludzi | 8 | 8 |
| **Zwinność** `zw` | szybkość ruchu, czas między ciosami | 6 | 12 |
| **Obrona** `obr` | redukcja przyjmowanych obrażeń | 10 | 8 |
| **Lekka ręka** `reka` | czas kradzieży / wytrycha / przeszukania | 2 | 12 |
| **Wytrzymałość** `wytrz` | max HP (×10) | 12 | 12 |
| **Twardy łeb** `leb` | ile ciosów z rzędu do przewrócenia, czas leżenia | 8 | 6 |

Startowe wartości odtwarzają dokładnie balans prologu (Polak 20 obrażeń na cios, Rumun 11, obaj 120 HP).
Statystyki rosną **tylko** przez jedzenie, książki i nagrody z zadań (jak w RCR — żadnego XP),
z limitem 63 na stat (pasuje do kodowania hasła, patrz 3.8).

### 3.3 Sklepy i jedzenie
- Wejście do sklepu otwiera nakładkę `ShopScene` (lista towarów, cena, opis, „zjedz tutaj / na wynos”).
- **Zjedzone na miejscu**: leczy HP + **na stałe** +1..+3 do wybranych statystyk.
  **Na wynos**: trafia do ekwipunku (4 sloty), leczy w trakcie walki z menu pauzy.
- Przykładowy asortyment:
  - Halina: pierogi ruskie (+HP, +Obrona), bigos w słoiku (+Wytrzymałość), pączek (+Zwinność).
  - Costel: mici (+Siła), sarmale (+Wytrzymałość), cozonac (+Lekka ręka).
  - Döner-Imbiss, Bäckerei (Brezel, Bienenstich), Späti (Club-Mate, Currywurst), Apotheke (pełne HP, drogo).
- Ceny i przyrosty w jednej tabeli danych (`src/game/data/shops.ts`) — łatwe balansowanie.
- **Wspólna kasa Unii**: zostawiamy jedno pole `money` dla obu graczy (jest w kodzie i pasuje do nazwy
  gry) — RCR ma osobne portfele, ale wspólny budżet to lepszy żart i mniej zmian w sieci.

### 3.4 Książki technik (specjalne ruchy)
Kupowane w **Buchhandlung** i **antykwariacie u Costela**; część tylko dla jednej postaci.

| Technika | Kto | Działanie | Wejście |
|---|---|---|---|
| **Młynek z pałki** | Polak | obrót 360°, trafia wszystkich wokół | BIJ w skoku |
| **Kopniak z wyskoku** | Rumun | szybkie kopnięcie w powietrzu, duży odrzut | BIJ w skoku |
| **Seria Bukareszt** | Rumun | 3 szybkie kopnięcia przy szybkim stuknięciu BIJ | BIJ ×3 |
| **Kamienna pięść** | obaj | przytrzymanie BIJ = ładowany cios ×2 | przytrzymaj BIJ |
| **Taran** | Polak | atak w biegu przewraca grupę | BIJ w biegu |
| **Oszczep** | obaj | rzucony wróg leci dalej i przewraca innych | rzut wroga |
| **Ręce jak brzytwa** | Rumun | kradzież nie przerywa się przy pierwszym „?” (jedna szansa) | pasywna |
| **Krawaciarz** | Polak | Polak też może okradać K.O. dwa razy szybciej i znajduje więcej € | pasywna |
| **Klepnięcie kumpla** | obaj | podnoszenie partnera 2× szybciej + 2 s nietykalności | pasywna |

### 3.5 Ruchy bojowe
Rozbudowa `localInput` / `resolveAttack` w stronę RCR, przy zachowaniu obecnych przycisków:

- **Skok** (nowy przycisk: L / C / klawiatura; przycisk SKOK na telefonie) — oś `z` w `PlayerInput`,
  renderowana jako przesunięcie sprite’a nad cieniem (`shadow.png` już jest).
- **Bieg** — podwójne stuknięcie kierunku; atak w biegu = mocniejszy odrzut.
- **Blok** — BIJ + AKCJA naraz (na telefonie oba przyciski) → redukcja obrażeń wg Obrony.
- **Chwyt i rzut** — AKCJA przy przewróconym/ogłuszonym wrogu: podniesienie i rzut (BIJ).
  Rzucony wróg to pocisk zadający obrażenia innym.
- **Dobijanie** — wrogowie po upadku chwilę leżą, a nie od razu K.O. (stan `down` ≠ `ko`).
- Ogłuszenie gracza po serii trafień (czas zależy od „Twardego łba”).
- **Friendly fire** w co-opie: ciosy trafiają kumpla za 25 % obrażeń (z przełącznikiem w lobby — RCR
  ma to włączone na stałe, u nas to dodatkowe źródło humoru, ale powinno dać się wyłączyć).

### 3.6 Bronie i przedmioty z ulicy
Nowa encja `Item` w `Sim` (stany: `ground` / `held` / `thrown`). Podnoszenie AKCJA, użycie BIJ, rzut
= BIJ w skoku lub BIJ + kierunek do przodu.

| Przedmiot | Typ | Uwagi / żart |
|---|---|---|
| Krasnal ogrodowy | rzucany | nawiązanie do prologu, Kleingärtner rzucają nimi w graczy |
| Kosz na śmieci (żółty / niebieski / brązowy) | rzucany, ciężki | segregacja: zły kolor = +POLIZEI |
| Butelka Pfand | rzucana **albo** do zwrotu w automacie za 0,25 € | mini-ekonomia |
| Pachołek drogowy | broń, zasięg | — |
| Grabie, parasol, bagietka | broń, szybka | bagietka się łamie po 3 ciosach |
| Skrzynka po piwie | rzucana, przewraca kilku | — |
| Opona | toczy się po ziemi | odbija się od krawędzi |
| Segregator | broń szefowej Ordnungsamtu | wypada po walce |

Pałka Polaka zostaje bronią wrodzoną; inne bronie Polak trzyma z bonusem do obrażeń (Siła), Rumun —
szybciej rzuca (Rzut).

### 3.7 Pieniądze, łupy, kara za porażkę
- Pokonani wrogowie **upuszczają monety** na ziemię (trzeba podejść i zebrać — jak w RCR), zamiast
  natychmiastowego `+€`; kwota zależy od bandy i dzielnicy.
- Kradzież od tyłu i przeszukiwanie K.O. zostają — to wyróżnik tej gry względem RCR.
- **Porażka** (obaj padli): połowa kasy znika („Strafzettel”), powrót do ostatniej bazy.
  Statystyki i pieczątki zostają. Zastępuje to obecny ekran przegranej w Rozdziale II.
- Mandaty Ordnungsamtu: trafienie od urzędnika zabiera 5–20 € zamiast HP.

### 3.8 Zapis: hasło + `localStorage`
- Auto-zapis w `localStorage` u hosta przy każdym wejściu do bazy.
- **Hasło zapisu** (hołd dla RCR) w bazie: kod z ~20 znaków (base32 bez mylących liter, np. bez O/0/I/1)
  koduje: statystyki obu postaci (8×6 bit ×2), techniki (bitmask), pieczątki (5 bit), krasnale (5 bit),
  ekwipunek (4×4 bit), kasę (14 bit, ×5 €), sumę kontrolną CRC-8. Działa między urządzeniami bez kont.
- W menu: **KONTYNUUJ** (lokalny zapis) i **HASŁO** (wpisanie kodu) — reużycie `JoinScene`.
- W grze online stan zapisu należy do hosta; gość widzi swoje statystyki w snapshocie.

### 3.9 Integracja z istniejącymi mechanikami
- **RAGE/WUT** — zostaje dla wszystkich band; szefowie wchodzą w RAGE przy 50 % HP (faza 2).
- **Pasek POLIZEI** — ma znaczenie strategiczne: w dzielnicy z pełnym paskiem rośnie patrol;
  wyjście do bazy go zeruje. Ordnungsamt podnosi pasek bez bicia.
- **Ostrzeżenie „?”** — zwykli przechodnie zostają w każdej dzielnicy jako „cywile” do okradania;
  członkowie band nie odwracają się, tylko atakują (czytelne rozróżnienie).

### 3.10 Interfejs
- **Ekran pauzy / status** (jak w RCR): statystyki obu postaci, techniki, ekwipunek, pieczątki, mapa.
- Dymki dialogowe nad głowami (intro bossów, docinki członków band przy wejściu do obszaru).
- HUD: imię i pasek HP aktualnie bitego wroga (jak w RCR) zamiast tylko `hpFrac` nad głową.
- Telefon: dodatkowy przycisk **SKOK**; blok = BIJ + AKCJA; pauza = ikona w rogu.

---

## 4. Architektura — zmiany w kodzie

### 4.1 Dane zamiast twardego kodu
```
src/game/data/
  areas.ts        // Area { id, w, bg, exits[], spawns[], items[], shops[], safe?, gate? }
  gangs.ts        // Gang { id, palette, names[], koCries[], ai: 'pair'|'swarm'|'fine'... }
  shops.ts        // Shop { id, area, goods: { key, price, heal, stats, takeaway } }
  techniques.ts   // Technique { id, who, input, params }
  items.ts        // ItemDef { id, kind: 'weapon'|'throw'|'pfand', dmg, durability }
  story.ts        // dialogi (klucze i18n) i flagi fabularne
```
Rozdział I przenosimy do tego samego formatu (3 obszary + specjalne obiekty), żeby był jeden silnik.

### 4.2 `Sim`
- Podział pliku (808 linii → będzie ~2500): `Sim.ts` (pętla, obszary, przejścia),
  `combat.ts` (ataki, techniki, blok, rzuty), `npcAi.ts` (stany + AI band/bossów),
  `items.ts`, `economy.ts` (monety, sklep, kara), `stealth.ts` (obecne `caught`/`chooseAct`).
- `Npc` dostaje: `gang`, `name`, `boss?`, `phase`, `z`, `held` (podniesiony przez gracza).
- `PlayerSim` dostaje: `stats`, `techs`, `inventory`, `held` (broń/wróg), `z`, `stun`, `block`.
- Stan per obszar: tylko bieżący obszar jest symulowany; reszta to flagi (`bossDefeated`, zebrane krasnale).

### 4.3 Sieć
- `PlayerInput` += `z`, `jump`, `block`, `run`; nowe wiadomości gościa: `buy`, `useItem`, `ready_exit`.
  Host waliduje (gość nie może sam dodać sobie statystyk).
- `Snapshot` += `area`, `items: ItemSnap[]`, `coins: CoinSnap[]`, `stats` obu graczy (tylko przy zmianie),
  `boss` (id, imię, hp). NPC na obszar ≤ ~12, więc rozmiar snapshotu rośnie umiarkowanie.
- Zmiana obszaru = event `area` → klient przeładowuje tło i widoki NPC.

### 4.4 Sceny
- `GameScene` — ładowanie tła per obszar zamiast jednego `WORLD_W`; kamera ograniczona do obszaru.
- Nowe: `ShopScene` (nakładka), `PauseScene` (status/mapa/ekwipunek), `DialogScene` (dymki/intro bossów),
  `PasswordScene` (na bazie `JoinScene`).
- `MenuScene`: KONTYNUUJ / NOWA GRA (Rozdział I → II) / HASŁO / wybór rozdziału, jeśli prolog ukończony.

### 4.5 Assety (`tools/`)
- `gen_sprites.py`: funkcja `palette_swap(spec, gang)` dla członków band; 6 nowych bossów; klatki
  `jump`, `run`, `block`, `throw`, `hold` (rozszerzenie `ANIM_FRAMES` z 13 do ~20 klatek).
- Tła: 7 nowych obszarów (Bahnhof, ogródki, przemysł, stadion, starówka, holownia, 2 wnętrza sklepów);
  reużycie `house`, `shop`, `hedge`, `lamp`, `sign_board`.
- Przedmioty: kosze (3 kolory), butelka, pachołek, grabie, skrzynka, opona, segregator, moneta na ziemi.
- `gen_sounds.py`: skok, blok, rzut, brzęk butelki, motyw sklepu, motyw bossa, 1 motyw na dzielnicę.

### 4.6 i18n
Wszystkie nowe teksty (dialogi, nazwy towarów, technik, okrzyki) jako klucze w `i18n.ts` × 3 języki.
Okrzyki niemieckie zostają po niemiecku we wszystkich wersjach (jak obecne „WUT!”/„HALT!”).
Szacunek: +250–350 kluczy — warto rozbić `i18n.ts` na `i18n/pl.ts`, `en.ts`, `ro.ts`.

### 4.7 Testy
Obecnie brak testów. `Sim` nie zależy od Phasera, więc warto dodać **Vitest** (współgra z Vite) i
testować deterministycznie (wstrzykiwany RNG zamiast `Math.random`): obrażenia ze statystyk,
kodowanie/dekodowanie hasła (round-trip + suma kontrolna), ekonomię sklepu, przejścia obszarów,
karę za porażkę.

---

## 5. Kolejność prac (kamienie milowe)

Każda faza kończy się grywalną wersją; Rozdział I działa przez cały czas.

| Faza | Zakres | Efekt | Szac. |
|---|---|---|---|
| **0. Fundament** | Vitest + seedowany RNG; podział `Sim.ts`; świat jako dane (`areas.ts`), Rozdział I przeniesiony bez zmian w rozgrywce; podział i18n | refaktor bez zmian dla gracza | 2–3 dni |
| **1. Walka** | skok (oś z), bieg, blok, ogłuszenie, leżący wróg ≠ K.O., chwyt i rzut wroga, przycisk SKOK na dotyku | walka „czuje się” jak RCR także w prologu | 4–5 dni |
| **2. Przedmioty** | encja `Item`, bronie/rzucane, monety na ziemi, butelki Pfand + automat | — | 3 dni |
| **3. Postęp** | statystyki, `ShopScene`, jedzenie, ekwipunek, `PauseScene`, książki + 4 pierwsze techniki | pętla: bij → zbieraj € → jedz → rośnij | 5–6 dni |
| **4. Miasto** | graf obszarów, przejścia, respawn, 2 bazy, mapa; zapis `localStorage` + hasło | otwarty świat bez fabuły | 5 dni |
| **5. Bandy i bossowie** | 5 band (palety, imiona, okrzyki, AI), 5 bossów + finał, `DialogScene`, pieczątki, brama holowni | pełny Rozdział II | 7–10 dni |
| **6. Szlif** | zadania poboczne, krasnale, muzyka dzielnic, balans (tabela ekonomii), tłumaczenia EN/RO, README | wydanie | 4–5 dni |

Szacunki dla jednej osoby; fazy 2 i 3 mogą iść równolegle.

---

## 6. Ryzyka i otwarte decyzje

1. **Sterowanie na telefonie** — skok, blok, chwyt i techniki na 3 przyciskach. Propozycja: SKOK jako
   trzeci przycisk, reszta z kombinacji. Trzeba przetestować na małym ekranie.
2. **Desynchronizacja skoku** — pozycję gracza liczy klient (`localInput`), host tylko ufa. Z osią `z`
   trafienia w powietrzu muszą być liczone u hosta na podstawie `z` z inputu — ta sama zasada, ale
   więcej przypadków brzegowych (opóźnienie gościa).
3. **Zakres treści** — 7 teł, ~10 nowych sprite’ów, ~300 kluczy i18n × 3. Faza 5 jest największa;
   można wydać ją etapami (po 1 dzielnicy).
4. **Ton satyry** — bandy to karykatury niemieckich *instytucji i hobby* (kolej, ogródki, urzędy,
   kibice), nie grup etnicznych czy politycznych. Trzymamy się tego przy dopisywaniu kolejnych.
5. **Do decyzji przed fazą 3–4:**
   - wspólna kasa Unii (rekomendacja) vs osobne portfele jak w RCR,
   - friendly fire domyślnie wł./wył.,
   - przejście między obszarami: obaj w strefie wyjścia vs automatyczne dociągnięcie,
   - czy Rozdział II wymaga ukończenia prologu, czy jest dostępny od razu z menu.
