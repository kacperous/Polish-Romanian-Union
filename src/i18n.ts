/** Tłumaczenia PL / EN. Klucze bez tłumaczenia są wyświetlane dosłownie. */
export type Lang = 'pl' | 'en' | 'ro';
export const LANGS: Lang[] = ['pl', 'en', 'ro'];

const pl = {
  'title.sub': 'Polak i Rumun na gościnnych występach w Niemczech',
  'menu.create': 'STWÓRZ GRĘ ONLINE',
  'menu.join': 'DOŁĄCZ (KOD)',
  'menu.solo': 'GRAJ SOLO',
  'menu.help.touch': 'Joystick: ruch   •   BIJ: cios   •   AKCJA (przytrzymaj): kradnij / otwieraj / podnoś',
  'menu.help.keys': 'WASD/strzałki: ruch   •   J / Spacja: BIJ   •   K / E (przytrzymaj): AKCJA',
  'menu.connecting': 'Łączenie z serwerem...',
  'menu.try_solo': ' — spróbuj GRAJ SOLO',

  'join.title': 'WPISZ KOD GRY',
  'join.sub': 'Kod (6 cyfr) pokazuje się u kumpla, który stworzył grę',
  'join.back': '← WRÓĆ',
  'join.len': 'Kod ma 6 cyfr',
  'join.connecting': 'Łączenie...',

  'lobby.pick': 'WYBIERZ POSTAĆ',
  'lobby.solo_sub': 'Tryb solo: grasz sam — niektóre zadania są łatwiejsze',
  'lobby.code': 'KOD GRY',
  'lobby.copy': 'KOPIUJ LINK',
  'lobby.menu': '← MENU',
  'lobby.start': 'START!',
  'lobby.you': 'TY',
  'lobby.mate': 'KUMPEL',
  'lobby.taken': 'Tę postać wybrał już kumpel!',
  'lobby.solo_ready': 'Gotowy? Naciśnij START!',
  'lobby.solo_pick': 'Kliknij postać, którą chcesz grać',
  'lobby.waiting': 'Czekam na kumpla... podaj mu kod!',
  'lobby.mate_here': 'Kumpel jest! Wybierzcie postacie.',
  'lobby.ready': 'Wszystko gotowe — START!',
  'lobby.guest_pick': 'Wybierz postać',
  'lobby.guest_wait': 'Czekaj, aż host wystartuje grę...',
  'lobby.copied': 'Link skopiowany! Wyślij go kumplowi.',
  'desc.pole': 'PAŁKA — mocne ciosy (BIJ)\nRozwala kłódki jednym... trzema\nStoi na czatach przy aucie',
  'desc.romanian': 'LEKKA RĘKA — okrada od tyłu\n(AKCJA, gdy Szwab jest odwrócony)\nWytrych do kłódek i aut, kopniaki',

  'char.pole': 'Polak',
  'char.romanian': 'Rumun',
  'char.pole.up': 'POLAK',
  'char.romanian.up': 'RUMUN',
  'you': 'ty',

  'err.host_left': 'Host opuścił grę.',
  'err.mate_left': 'Kumpel się rozłączył.',
  'err.host_disc': 'Host się rozłączył.',
  'err.lost': 'Utracono połączenie z serwerem.',
  'err.not_found': 'Nie ma gry o takim kodzie.',
  'err.full': 'Ta gra jest już pełna.',
  'err.connect': 'Nie można połączyć z serwerem',
  'err.timeout': 'Brak połączenia z serwerem',

  'lvl.0.name': 'Poziom 1: Przedmieście',
  'lvl.0.sub': 'Ukradnij krasnala ogrodowego',
  'lvl.1.name': 'Poziom 2: Einkaufsstraße',
  'lvl.1.sub': 'Ukradnij rower',
  'lvl.2.name': 'Poziom 3: Willowe osiedle',
  'lvl.2.sub': 'Ukradnijcie auto — RAZEM!',
  'hud.goal': 'Cel: {g}',
  'hud.next': 'DALEJ!',
  'hud.alarm': 'UWAGA!',
  'hud.keys': 'WASD/strzałki: ruch • J/Spacja: BIJ • K/E (przytrzymaj): AKCJA • ESC: menu',
  'btn.atk': 'BIJ',
  'btn.act': 'AKCJA',
  'rotate': 'Obróć telefon poziomo,<br />żeby grać!',
  'loading': 'Ładowanie...',

  'hint.down': 'Leżysz! Kumpel musi cię podnieść',
  'hint.in_car': 'Siedzisz w aucie...',
  'hint.revive': 'AKCJA: podnieś kumpla',
  'hint.gnome': 'AKCJA: zwiń krasnala (gdy nikt nie patrzy!)',
  'hint.lockpick': 'AKCJA: otwórz kłódkę wytrychem',
  'hint.smash': 'BIJ: rozwal kłódkę pałką!',
  'hint.bike': 'AKCJA: bierz rower',
  'hint.carlock': 'AKCJA: otwórz auto (Polak na czatach!)',
  'hint.lookout': 'Stój na czatach — Rumun otwiera auto',
  'hint.enter': 'AKCJA: wsiadaj do auta',
  'hint.loot': 'AKCJA: przeszukaj kieszenie',
  'hint.pick': 'AKCJA: okradnij (od tyłu!)',
  'hint.facing': 'Patrzy na ciebie — zajdź od tyłu',

  // zdarzenia z symulacji
  'f.lock_broken': 'KŁÓDKA ROZWALONA!',
  'f.revive': 'WSTAWAJ!',
  'f.gnome': 'KRASNAL!',
  'f.unlocked': 'OTWARTE!',
  'f.bike': 'ROWER!',
  'f.car_unlocked': 'AUTO OTWARTE!',
  'h.kick_lock': 'Kopniak nie ruszy kłódki — otwórz ją wytrychem (AKCJA) albo niech Polak walnie pałką!',
  'h.bike_locked': 'Rower przypięty! Walnij kłódkę pałką (BIJ) albo niech Rumun ją otworzy.',
  'h.only_rom_car': 'Tylko Rumun otworzy auto. Ty stój na czatach obok i pilnuj!',
  'h.facing': 'On na ciebie patrzy! Zajdź go od tyłu albo poczekaj, aż się odwróci.',
  'h.pole_no_pick': 'Polak nie ma lekkiej ręki — ogłusz go pałką albo zostaw to Rumunowi!',
  'h.lookout': 'Polak musi stać na czatach przy aucie, bo sam nie dasz rady!',
  'm.caught_pick': 'Przyłapany! Szwab dostał szału!',
  'm.caught': 'Ktoś cię widzi! Uważaj, kiedy się odwracają!',
  'm.car_open': 'Auto otwarte! Obaj wsiadajcie (AKCJA przy aucie)!',
  'm.escape': 'W NOGI! Wracamy na wschód!',
  'm.wait_car': 'Czekam w aucie na kumpla...',
  'm.gnome_done': 'Krasnal ukradziony! Idźcie dalej ← do miasta.',
  'm.bike_done': 'Rower jest wasz! Ostatni skok: AUTO. ←',
  'm.down_partner': '{who} leży! Podnieś go (AKCJA obok)!',
  'm.down_self': 'Padłeś!',
  'm.police': 'POLIZEI! Zwiewajcie albo walczcie!',
  'end.win_reason': 'Uciekliście kradzionym autem do domu!',
  'end.lose_reason': 'Leżycie na chodniku. Polizei już jedzie...',

  'end.win': 'UDAŁO SIĘ!',
  'end.lose': 'ZŁAPANI!',
  'end.home': '→ Kierunek: DOM (Polska / România) →',
  'end.money': 'Łup w gotówce:  {v} €',
  'end.steals': 'Udane kradzieże:  {v}',
  'end.kos': 'Znokautowani Szwaby:  {v}',
  'end.time': 'Czas:  {v}',
  'end.wait': 'Czekaj — host może zacząć jeszcze raz',
  'end.again': 'JESZCZE RAZ',
  'end.menu': 'MENU',
};

type Dict = Record<keyof typeof pl, string>;

const en: Dict = {
  'title.sub': 'A Pole and a Romanian on a "business trip" to Germany',
  'menu.create': 'CREATE ONLINE GAME',
  'menu.join': 'JOIN (CODE)',
  'menu.solo': 'PLAY SOLO',
  'menu.help.touch': 'Joystick: move   •   HIT: attack   •   ACTION (hold): steal / open / revive',
  'menu.help.keys': 'WASD/arrows: move   •   J / Space: HIT   •   K / E (hold): ACTION',
  'menu.connecting': 'Connecting to server...',
  'menu.try_solo': ' — try PLAY SOLO',

  'join.title': 'ENTER GAME CODE',
  'join.sub': 'The 6-digit code is shown to the buddy who created the game',
  'join.back': '← BACK',
  'join.len': 'The code has 6 digits',
  'join.connecting': 'Connecting...',

  'lobby.pick': 'PICK YOUR CHARACTER',
  'lobby.solo_sub': 'Solo mode: you play alone — some tasks are easier',
  'lobby.code': 'GAME CODE',
  'lobby.copy': 'COPY LINK',
  'lobby.menu': '← MENU',
  'lobby.start': 'START!',
  'lobby.you': 'YOU',
  'lobby.mate': 'BUDDY',
  'lobby.taken': 'Your buddy already picked this one!',
  'lobby.solo_ready': 'Ready? Press START!',
  'lobby.solo_pick': 'Click the character you want to play',
  'lobby.waiting': 'Waiting for your buddy... give them the code!',
  'lobby.mate_here': 'Buddy is here! Pick your characters.',
  'lobby.ready': 'All set — START!',
  'lobby.guest_pick': 'Pick a character',
  'lobby.guest_wait': 'Wait for the host to start the game...',
  'lobby.copied': 'Link copied! Send it to your buddy.',
  'desc.pole': 'BATON — heavy hits (HIT)\nSmashes padlocks in one... three\nKeeps watch by the car',
  'desc.romanian': 'LIGHT FINGERS — robs from behind\n(ACTION while the German looks away)\nPicks locks and cars, kicks',

  'char.pole': 'Pole',
  'char.romanian': 'Romanian',
  'char.pole.up': 'POLE',
  'char.romanian.up': 'ROMANIAN',
  'you': 'you',

  'err.host_left': 'The host left the game.',
  'err.mate_left': 'Your buddy disconnected.',
  'err.host_disc': 'The host disconnected.',
  'err.lost': 'Lost connection to the server.',
  'err.not_found': 'No game with that code.',
  'err.full': 'This game is already full.',
  'err.connect': 'Cannot connect to the server',
  'err.timeout': 'Server is not responding',

  'lvl.0.name': 'Level 1: The Suburbs',
  'lvl.0.sub': 'Steal the garden gnome',
  'lvl.1.name': 'Level 2: Einkaufsstraße',
  'lvl.1.sub': 'Steal the bike',
  'lvl.2.name': 'Level 3: Villa District',
  'lvl.2.sub': 'Steal the car — TOGETHER!',
  'hud.goal': 'Goal: {g}',
  'hud.next': 'GO ON!',
  'hud.alarm': 'DANGER!',
  'hud.keys': 'WASD/arrows: move • J/Space: HIT • K/E (hold): ACTION • ESC: menu',
  'btn.atk': 'HIT',
  'btn.act': 'ACTION',
  'rotate': 'Turn your phone sideways<br />to play!',
  'loading': 'Loading...',

  'hint.down': "You're down! Your buddy has to pick you up",
  'hint.in_car': "You're in the car...",
  'hint.revive': 'ACTION: pick up your buddy',
  'hint.gnome': "ACTION: nick the gnome (when nobody's looking!)",
  'hint.lockpick': 'ACTION: pick the padlock',
  'hint.smash': 'HIT: smash the padlock with your baton!',
  'hint.bike': 'ACTION: take the bike',
  'hint.carlock': 'ACTION: unlock the car (Pole keeps watch!)',
  'hint.lookout': 'Keep watch — the Romanian is opening the car',
  'hint.enter': 'ACTION: get in the car',
  'hint.loot': 'ACTION: go through the pockets',
  'hint.pick': 'ACTION: pickpocket (from behind!)',
  'hint.facing': "He's looking at you — get behind him",

  'f.lock_broken': 'PADLOCK SMASHED!',
  'f.revive': 'GET UP!',
  'f.gnome': 'GNOME!',
  'f.unlocked': 'UNLOCKED!',
  'f.bike': 'BIKE!',
  'f.car_unlocked': 'CAR UNLOCKED!',
  'h.kick_lock': "A kick won't break the padlock — pick it (ACTION) or let the Pole hit it with the baton!",
  'h.bike_locked': 'The bike is chained! Smash the padlock (HIT) or let the Romanian pick it.',
  'h.only_rom_car': 'Only the Romanian can open the car. You keep watch next to it!',
  'h.facing': "He's looking at you! Get behind him or wait until he turns around.",
  'h.pole_no_pick': "The Pole has no light fingers — knock him out or leave it to the Romanian!",
  'h.lookout': "The Pole must keep watch by the car — you can't do it alone!",
  'm.caught_pick': 'Caught! The German went into a rage!',
  'm.caught': 'Someone sees you! Watch out when they turn around!',
  'm.car_open': 'Car unlocked! Both of you get in (ACTION by the car)!',
  'm.escape': 'FLOOR IT! Back to the east!',
  'm.wait_car': 'Waiting in the car for my buddy...',
  'm.gnome_done': 'Gnome stolen! Move on ← into town.',
  'm.bike_done': 'The bike is yours! Last job: THE CAR. ←',
  'm.down_partner': 'The {who} is down! Pick him up (ACTION next to him)!',
  'm.down_self': "You're down!",
  'm.police': 'POLIZEI! Run or fight!',
  'end.win_reason': 'You escaped home in a stolen car!',
  'end.lose_reason': "You're both lying on the pavement. The Polizei is on its way...",

  'end.win': 'YOU DID IT!',
  'end.lose': 'BUSTED!',
  'end.home': '→ Destination: HOME (Polska / România) →',
  'end.money': 'Cash loot:  {v} €',
  'end.steals': 'Successful thefts:  {v}',
  'end.kos': 'Germans knocked out:  {v}',
  'end.time': 'Time:  {v}',
  'end.wait': 'Wait — the host can start again',
  'end.again': 'PLAY AGAIN',
  'end.menu': 'MENU',
};


const ro: Dict = {
  'title.sub': 'Un polonez și un român în „vizită de lucru” prin Germania',
  'menu.create': 'CREEAZĂ JOC ONLINE',
  'menu.join': 'INTRĂ (COD)',
  'menu.solo': 'JOACĂ SOLO',
  'menu.help.touch': 'Joystick: mers   •   LOVEȘTE: atac   •   ACȚIUNE (ține apăsat): fură / deschide / ridică',
  'menu.help.keys': 'WASD/săgeți: mers   •   J / Spațiu: LOVEȘTE   •   K / E (ține apăsat): ACȚIUNE',
  'menu.connecting': 'Conectare la server...',
  'menu.try_solo': ' — încearcă JOACĂ SOLO',

  'join.title': 'INTRODU CODUL JOCULUI',
  'join.sub': 'Codul de 6 cifre îl vede prietenul care a creat jocul',
  'join.back': '← ÎNAPOI',
  'join.len': 'Codul are 6 cifre',
  'join.connecting': 'Conectare...',

  'lobby.pick': 'ALEGE PERSONAJUL',
  'lobby.solo_sub': 'Mod solo: joci singur — unele sarcini sunt mai ușoare',
  'lobby.code': 'CODUL JOCULUI',
  'lobby.copy': 'COPIAZĂ LINKUL',
  'lobby.menu': '← MENIU',
  'lobby.start': 'START!',
  'lobby.you': 'TU',
  'lobby.mate': 'PRIETENUL',
  'lobby.taken': 'Prietenul tău a ales deja personajul ăsta!',
  'lobby.solo_ready': 'Gata? Apasă START!',
  'lobby.solo_pick': 'Apasă pe personajul cu care vrei să joci',
  'lobby.waiting': 'Aștept prietenul... dă-i codul!',
  'lobby.mate_here': 'A venit prietenul! Alegeți personajele.',
  'lobby.ready': 'Totul e gata — START!',
  'lobby.guest_pick': 'Alege un personaj',
  'lobby.guest_wait': 'Așteaptă ca gazda să pornească jocul...',
  'lobby.copied': 'Link copiat! Trimite-l prietenului.',
  'desc.pole': 'BÂTA — lovituri grele (LOVEȘTE)\nSparge lacăte dintr-o... trei\nStă de pază lângă mașină',
  'desc.romanian': 'MÂNĂ UȘOARĂ — fură din spate\n(ACȚIUNE când neamțul e întors)\nDeschide lacăte și mașini, lovește cu piciorul',

  'char.pole': 'Polonezul',
  'char.romanian': 'Românul',
  'char.pole.up': 'POLONEZUL',
  'char.romanian.up': 'ROMÂNUL',
  'you': 'tu',

  'err.host_left': 'Gazda a părăsit jocul.',
  'err.mate_left': 'Prietenul s-a deconectat.',
  'err.host_disc': 'Gazda s-a deconectat.',
  'err.lost': 'Conexiunea cu serverul s-a pierdut.',
  'err.not_found': 'Nu există niciun joc cu acest cod.',
  'err.full': 'Jocul ăsta e deja plin.',
  'err.connect': 'Nu mă pot conecta la server',
  'err.timeout': 'Serverul nu răspunde',

  'lvl.0.name': 'Nivelul 1: Suburbia',
  'lvl.0.sub': 'Fură piticul de grădină',
  'lvl.1.name': 'Nivelul 2: Einkaufsstraße',
  'lvl.1.sub': 'Fură bicicleta',
  'lvl.2.name': 'Nivelul 3: Cartierul de vile',
  'lvl.2.sub': 'Furați mașina — ÎMPREUNĂ!',
  'hud.goal': 'Țintă: {g}',
  'hud.next': 'ÎNAINTE!',
  'hud.alarm': 'ATENȚIE!',
  'hud.keys': 'WASD/săgeți: mers • J/Spațiu: LOVEȘTE • K/E (ține apăsat): ACȚIUNE • ESC: meniu',
  'btn.atk': 'LOVEȘTE',
  'btn.act': 'ACȚIUNE',
  'rotate': 'Întoarce telefonul pe orizontală<br />ca să joci!',
  'loading': 'Se încarcă...',

  'hint.down': 'Ești la pământ! Prietenul trebuie să te ridice',
  'hint.in_car': 'Stai în mașină...',
  'hint.revive': 'ACȚIUNE: ridică-ți prietenul',
  'hint.gnome': 'ACȚIUNE: șterpelește piticul (când nu se uită nimeni!)',
  'hint.lockpick': 'ACȚIUNE: deschide lacătul cu șperaclul',
  'hint.smash': 'LOVEȘTE: sparge lacătul cu bâta!',
  'hint.bike': 'ACȚIUNE: ia bicicleta',
  'hint.carlock': 'ACȚIUNE: deschide mașina (polonezul stă de pază!)',
  'hint.lookout': 'Stai de pază — românul deschide mașina',
  'hint.enter': 'ACȚIUNE: urcă în mașină',
  'hint.loot': 'ACȚIUNE: golește-i buzunarele',
  'hint.pick': 'ACȚIUNE: fură-l (din spate!)',
  'hint.facing': 'Se uită la tine — vino din spate',

  'f.lock_broken': 'LACĂT SPART!',
  'f.revive': 'SCOALĂ-TE!',
  'f.gnome': 'PITICUL!',
  'f.unlocked': 'DESCHIS!',
  'f.bike': 'BICICLETA!',
  'f.car_unlocked': 'MAȘINA E DESCHISĂ!',
  'h.kick_lock': 'Cu piciorul nu spargi lacătul — deschide-l cu șperaclul (ACȚIUNE) sau lasă polonezul să dea cu bâta!',
  'h.bike_locked': 'Bicicleta e legată! Sparge lacătul cu bâta (LOVEȘTE) sau lasă românul să-l deschidă.',
  'h.only_rom_car': 'Doar românul poate deschide mașina. Tu stai de pază lângă ea!',
  'h.facing': 'Se uită la tine! Vino din spate sau așteaptă să se întoarcă.',
  'h.pole_no_pick': 'Polonezul n-are mână ușoară — pune-l la pământ sau lasă-l pe român!',
  'h.lookout': 'Polonezul trebuie să stea de pază lângă mașină, singur nu reușești!',
  'm.caught_pick': 'Prins! Neamțul a luat-o razna!',
  'm.caught': 'Cineva te vede! Ai grijă când se întorc!',
  'm.car_open': 'Mașina e deschisă! Urcați amândoi (ACȚIUNE lângă mașină)!',
  'm.escape': 'FUGI! Înapoi spre est!',
  'm.wait_car': 'Aștept prietenul în mașină...',
  'm.gnome_done': 'Piticul e furat! Mergeți mai departe ← în oraș.',
  'm.bike_done': 'Bicicleta e a voastră! Ultima lovitură: MAȘINA. ←',
  'm.down_partner': '{who} e la pământ! Ridică-l (ACȚIUNE lângă el)!',
  'm.down_self': 'Ai căzut!',
  'm.police': 'POLIZEI! Fugiți sau luptați!',
  'end.win_reason': 'Ați scăpat acasă cu mașina furată!',
  'end.lose_reason': 'Zăceți pe trotuar. Polizei e pe drum...',

  'end.win': 'AȚI REUȘIT!',
  'end.lose': 'PRINȘI!',
  'end.home': '→ Direcția: ACASĂ (Polska / România) →',
  'end.money': 'Pradă în bani:  {v} €',
  'end.steals': 'Furturi reușite:  {v}',
  'end.kos': 'Nemți puși la pământ:  {v}',
  'end.time': 'Timp:  {v}',
  'end.wait': 'Așteaptă — gazda poate începe din nou',
  'end.again': 'ÎNCĂ O DATĂ',
  'end.menu': 'MENIU',
};

const DICTS: Record<Lang, Record<string, string>> = { pl, en, ro };

function detect(): Lang {
  try {
    const saved = localStorage.getItem('lang');
    if (saved === 'pl' || saved === 'en' || saved === 'ro') return saved;
  } catch {
    /* brak localStorage */
  }
  const nl = (navigator.language || '').toLowerCase();
  if (nl.startsWith('pl')) return 'pl';
  if (nl.startsWith('ro')) return 'ro';
  return 'en';
}

let lang: Lang = detect();

export function getLang(): Lang {
  return lang;
}

export function setLang(l: Lang) {
  lang = l;
  try {
    localStorage.setItem('lang', l);
  } catch {
    /* ignoruj */
  }
  applyDocumentLang();
}

export function applyDocumentLang() {
  document.documentElement.lang = lang;
  document.title = { pl: 'Unia Polsko-Rumuńska', en: 'Polish-Romanian Union', ro: 'Uniunea Polono-Română' }[lang];
  const r = document.getElementById('rotate-text');
  if (r) r.innerHTML = t('rotate');
}

/** Tłumaczy klucz; parametry {x} też są tłumaczone, jeśli są kluczami. */
export function t(key: string, params?: Record<string, string | number>): string {
  let s = DICTS[lang][key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, typeof v === 'string' ? t(v) : String(v));
  }
  return s;
}
