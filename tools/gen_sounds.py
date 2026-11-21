"""Generator efektow dzwiekowych i muzyki chiptune (8-bit).

Uruchom:  python3 tools/gen_sounds.py
Wynik: public/assets/sfx/*.wav
"""
import os
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "assets", "sfx")
os.makedirs(OUT, exist_ok=True)
SR = 22050
rng = np.random.default_rng(7)


def save(name, sig, vol=0.6):
    sig = np.clip(sig * vol, -1, 1)
    data = (sig * 32767).astype(np.int16)
    with wave.open(os.path.join(OUT, name + ".wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def t_(dur):
    return np.arange(int(SR * dur)) / SR


def env(n, a=0.005, r=None):
    e = np.ones(n)
    na = max(1, int(a * SR))
    e[:na] = np.linspace(0, 1, na)
    if r is None:
        e *= np.linspace(1, 0, n) ** 1.5
    return e


def square(freq, t, duty=0.5):
    ph = np.cumsum(np.broadcast_to(freq, t.shape) / SR)
    return np.where((ph % 1) < duty, 1.0, -1.0)


def tri(freq, t):
    ph = np.cumsum(np.broadcast_to(freq, t.shape) / SR)
    return 2 * np.abs(2 * (ph % 1) - 1) - 1


def noise(n):
    return rng.uniform(-1, 1, n)


def lowpass(x, k=0.2):
    y = np.zeros_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += k * (v - acc)
        y[i] = acc
    return y


def gen_sfx():
    # uderzenie palka
    t = t_(0.18)
    s = noise(len(t)) * env(len(t)) * 0.8 + square(np.linspace(180, 60, len(t)), t) * env(len(t)) * 0.6
    save("hit", lowpass(s, 0.5))
    # zamach
    t = t_(0.15)
    s = lowpass(noise(len(t)), 0.15) * np.sin(np.linspace(0, np.pi, len(t))) * 2.0
    save("swing", s, 0.7)
    # kopniecie / slabe uderzenie
    t = t_(0.12)
    s = square(np.linspace(260, 90, len(t)), t, 0.25) * env(len(t)) + noise(len(t)) * env(len(t)) * 0.4
    save("kick", lowpass(s, 0.4))
    # moneta
    t = t_(0.25)
    f = np.where(t < 0.07, 988, 1319)
    save("coin", square(f, t, 0.25) * env(len(t)) * 0.7)
    # kradziez udana
    t = t_(0.4)
    f = 523 * 2 ** (np.floor(t / 0.06) * 4 / 12)
    save("steal", square(f, t, 0.5) * env(len(t)) * 0.6)
    # rage - warkniecie
    t = t_(0.6)
    f = np.linspace(220, 70, len(t)) + 25 * np.sin(2 * np.pi * 30 * t)
    s = square(f, t, 0.4) * env(len(t), 0.02) + lowpass(noise(len(t)), 0.3) * env(len(t)) * 0.5
    save("rage", s, 0.55)
    # obrot / zauwazenie "!"
    t = t_(0.22)
    f = np.where(t < 0.08, 880, 1175)
    save("alert", square(f, t, 0.125) * env(len(t)) * 0.7)
    # syrena policji
    t = t_(1.6)
    f = np.where((t % 0.8) < 0.4, 740, 988)
    save("siren", square(f, t, 0.5) * 0.5 * np.minimum(1, (1.6 - t) * 4), 0.5)
    # bol gracza
    t = t_(0.25)
    save("hurt", square(np.linspace(400, 120, len(t)), t, 0.5) * env(len(t)), 0.5)
    # podniesienie przedmiotu
    t = t_(0.5)
    notes = np.array([0, 4, 7, 12, 16, 19, 24])
    idx = np.minimum(6, (t / 0.07).astype(int))
    f = 392 * 2 ** (notes[idx] / 12)
    save("pickup", square(f, t, 0.25) * env(len(t)) * 0.6)
    # klik UI
    t = t_(0.05)
    save("click", square(1200, t, 0.5) * env(len(t)) * 0.4)
    # silnik auta
    t = t_(1.4)
    f = np.linspace(40, 110, len(t))
    s = square(f, t, 0.3) * 0.6 + lowpass(noise(len(t)), 0.2) * 0.5
    save("engine", s * np.minimum(1, t * 6) * np.minimum(1, (1.4 - t) * 3), 0.6)
    # wytrych - klikanie
    t = t_(0.08)
    save("pick", (noise(len(t)) * env(len(t)) * 0.6 + square(2000, t) * env(len(t)) * 0.2), 0.5)
    # KO
    t = t_(0.5)
    s = square(np.linspace(300, 50, len(t)), t, 0.5) * env(len(t)) + lowpass(noise(len(t)), 0.3) * env(len(t))
    save("ko", s, 0.55)
    # zwyciestwo
    seq = [(523, .12), (659, .12), (784, .12), (1047, .3), (988, .12), (1047, .5)]
    parts = []
    for f, d in seq:
        t = t_(d)
        parts.append(square(f, t, 0.5) * env(len(t), 0.005) * 0.5 + tri(f / 2, t) * 0.4)
    save("win", np.concatenate(parts), 0.6)
    # przegrana
    seq = [(392, .2), (370, .2), (349, .2), (330, .6)]
    parts = []
    for f, d in seq:
        t = t_(d)
        parts.append(square(f, t, 0.5) * env(len(t), 0.005) * 0.5 + tri(f / 2, t) * 0.4)
    save("lose", np.concatenate(parts), 0.6)


NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def nf(name):
    if name in ("-", "."):
        return 0
    n, o = name[:-1], int(name[-1])
    return 440 * 2 ** ((NOTE[n] + (o - 4) * 12 - 9) / 12)


def render_track(lead, bass, drums, bpm, step=0.25, lead_duty=0.25):
    """kazdy element listy to 1 krok (szesnastka przy step=.25)."""
    spb = 60 / bpm
    dur = spb * step
    n = int(dur * SR)
    total = len(lead) * n
    out = np.zeros(total)
    t = np.arange(n) / SR
    for i, note in enumerate(lead):
        if note not in ("-", "."):
            # nuta trwa dopoki nastepne "-"
            ln = 1
            while i + ln < len(lead) and lead[i + ln] == "-":
                ln += 1
            tt = np.arange(n * ln) / SR
            f = nf(note)
            vib = 1 + 0.004 * np.sin(2 * np.pi * 6 * tt)
            seg = square(f * vib, tt, lead_duty) * 0.22 * np.minimum(1, (n * ln - np.arange(n * ln)) / (0.02 * SR))
            seg *= np.minimum(1, np.arange(n * ln) / (0.004 * SR))
            out[i * n:i * n + len(seg)] += seg[: total - i * n]
    for i, note in enumerate(bass):
        if note not in ("-", "."):
            f = nf(note)
            seg = tri(f, t) * 0.38 * np.linspace(1, 0.6, n)
            out[i * n:(i + 1) * n] += seg
    for i, d in enumerate(drums):
        if d == "k":
            tt = np.arange(int(0.12 * SR)) / SR
            seg = np.sin(2 * np.pi * np.cumsum(np.linspace(150, 40, len(tt))) / SR) * np.linspace(1, 0, len(tt)) * 0.55
        elif d == "s":
            seg = noise(int(0.1 * SR)) * np.linspace(1, 0, int(0.1 * SR)) ** 2 * 0.3
        elif d == "h":
            seg = noise(int(0.03 * SR)) * np.linspace(1, 0, int(0.03 * SR)) * 0.12
        else:
            continue
        a = i * n
        b = min(total, a + len(seg))
        out[a:b] += seg[: b - a]
    return out


def gen_music():
    # Glowny motyw - skoczna "polka" w a-moll, 150 bpm (8 taktow x 2)
    A = "A4 - C5 - E5 - C5 - D5 - B4 - G4 - B4 - C5 - A4 - E4 - A4 - B4 - G#4 - E4 - - -".split()
    B = "A4 - C5 - E5 - A5 - G5 - F5 - E5 - D5 - C5 - E5 - D5 - B4 - A4 - - - . . . .".split()[:32]
    C = "F5 - E5 - D5 - C5 - E5 - D5 - C5 - B4 - D5 - C5 - B4 - A4 - G#4 - B4 - E5 - - -".split()
    D = "A5 - G5 - E5 - C5 - D5 - E5 - F5 - D5 - E5 - C5 - B4 - G#4 - A4 - - - A4 . A4 .".split()[:32]
    lead = A + B + C + D
    lead = (lead + ["-"] * 128)[:128]

    def bassbar(root, fifth):
        return [root, ".", fifth, ".", root, ".", fifth, "."]

    prog = [("A2", "E3"), ("G2", "D3"), ("A2", "E3"), ("E2", "B2"),
            ("A2", "E3"), ("F2", "C3"), ("D2", "A2"), ("E2", "B2"),
            ("F2", "C3"), ("C2", "G2"), ("D2", "A2"), ("E2", "B2"),
            ("F2", "C3"), ("D2", "A2"), ("E2", "B2"), ("A2", "E3")]
    bass = []
    for r, f in prog:
        bass += bassbar(r, f)
    drums = ("k.h.s.h.k.h.s.h." * 8)
    drums = list(drums)
    s = render_track(lead, bass, drums, 150)
    save("music_game", s, 0.55)

    # Muzyka menu - spokojniejsza
    lead = "E5 - - - D5 - C5 - B4 - - - A4 - - - C5 - - - B4 - A4 - G#4 - - - E4 - - - A4 - - - B4 - C5 - D5 - - - E5 - - - F5 - - - E5 - D5 - C5 - - - B4 - - -".split()
    lead = (lead + ["-"] * 64)[:64]
    bass = []
    for r, f in [("A2", "E3"), ("E2", "B2"), ("F2", "C3"), ("E2", "B2"), ("A2", "E3"), ("D2", "A2"), ("F2", "C3"), ("E2", "B2")]:
        bass += [r, ".", ".", ".", f, ".", ".", "."]
    drums = list("k...h...s...h..." * 4)
    s = render_track(lead, bass, drums, 110, lead_duty=0.5)
    save("music_menu", s, 0.5)


def gen_sfx_ch2():
    """Dzwieki Rozdzialu II (osobne ziarno, zeby nie zmieniac starych plikow)."""
    global rng
    rng = np.random.default_rng(2002)
    # blok — gluchy stuk
    t = t_(0.1)
    s = square(np.linspace(140, 110, len(t)), t, 0.5) * env(len(t)) * 0.7 + noise(len(t)) * env(len(t)) * 0.3
    save("block", lowpass(s, 0.3), 0.6)


if __name__ == "__main__":
    gen_sfx()
    gen_music()
    gen_sfx_ch2()
    print("OK ->", OUT, sorted(os.listdir(OUT)))
