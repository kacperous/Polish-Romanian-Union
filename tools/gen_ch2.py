"""Grafiki Rozdzialu II: przedmioty z ulicy (bronie i rzucane).

Uruchom:  python3 tools/gen_ch2.py   (albo: npm run assets)
Korzysta z pomocnikow z gen_sprites.py.
"""
import math
import os
import random

from PIL import Image, ImageDraw

import gen_sprites as G
from gen_sprites import (
    OUT, SIDEWALK_TOP, hedge, house, lamp, noise_rect, outline, picket_fence, rgb, shade, shop, sign_board,
    text_c, tree, window,
)

BH = 270


def save(img, name, with_outline=True):
    (outline(img) if with_outline else img).save(os.path.join(OUT, f"{name}.png"))


def item_bin():
    """Zolta tonna na smieci (Gelbe Tonne) 14x18."""
    img = Image.new("RGBA", (14, 18), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    body = rgb(0xF2C230)
    d.rectangle([2, 4, 11, 15], fill=body)
    d.rectangle([2, 4, 3, 15], fill=shade(body, 0.8))
    d.rectangle([1, 2, 12, 4], fill=shade(body, 0.9))
    d.line([(1, 2), (12, 2)], fill=shade(body, 1.15))
    for x in (5, 8):
        d.line([(x, 6), (x, 13)], fill=shade(body, 0.85))
    d.ellipse([1, 14, 4, 17], fill=rgb(0x202028))
    d.ellipse([9, 14, 12, 17], fill=rgb(0x202028))
    save(img, "it_bin")


def item_bottle():
    """Butelka zwrotna (Pfandflasche) 5x12."""
    img = Image.new("RGBA", (5, 12), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    glass = rgb(0x7A4A18)
    d.rectangle([1, 4, 3, 11], fill=glass)
    d.rectangle([2, 0, 2, 4], fill=glass)
    d.point((2, 0), fill=rgb(0xD0D0D8))
    d.rectangle([1, 6, 3, 8], fill=rgb(0xF4E8C0))
    d.point((1, 5), fill=shade(glass, 1.6))
    save(img, "it_bottle")


def item_cone():
    """Pacholek drogowy 12x14."""
    img = Image.new("RGBA", (12, 14), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    org = rgb(0xF07020)
    d.polygon([(6, 0), (2, 11), (10, 11)], fill=org)
    d.line([(4, 5), (8, 5)], fill=rgb(0xF4F4F4))
    d.line([(3, 8), (9, 8)], fill=rgb(0xF4F4F4))
    d.rectangle([0, 11, 11, 13], fill=shade(org, 0.7))
    save(img, "it_cone")


def item_rake():
    """Grabie 26x7 — poziomo, trzonek z lewej."""
    img = Image.new("RGBA", (26, 7), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.line([(0, 3), (20, 3)], fill=rgb(0xB07A40), width=2)
    d.rectangle([20, 0, 21, 6], fill=rgb(0x707078))
    for y in (0, 2, 4, 6):
        d.line([(22, y), (24, y)], fill=rgb(0x9090A0))
    save(img, "it_rake")


def item_baguette():
    """Bagietka 18x5."""
    img = Image.new("RGBA", (18, 5), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bread = rgb(0xD8A050)
    d.rounded_rectangle([0, 0, 17, 4], radius=2, fill=bread)
    for x in (4, 8, 12):
        d.line([(x, 1), (x + 2, 3)], fill=shade(bread, 1.25))
    d.line([(1, 4), (16, 4)], fill=shade(bread, 0.75))
    save(img, "it_baguette")


def item_crate():
    """Skrzynka po piwie 16x11."""
    img = Image.new("RGBA", (16, 11), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    box = rgb(0x2E7A3A)
    d.rectangle([0, 2, 15, 10], fill=box)
    d.rectangle([5, 4, 10, 6], fill=shade(box, 0.6))
    d.line([(0, 2), (15, 2)], fill=shade(box, 1.3))
    for x in (2, 5, 8, 11, 13):
        d.rectangle([x, 0, x + 1, 2], fill=rgb(0x7A4A18))
    save(img, "it_crate")


def item_tire():
    """Opona 13x13."""
    img = Image.new("RGBA", (13, 13), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([0, 0, 12, 12], fill=rgb(0x202024))
    d.ellipse([4, 4, 8, 8], fill=rgb(0x8A8A92))
    d.ellipse([3, 3, 9, 9], outline=rgb(0x3A3A40))
    d.point((6, 1), fill=rgb(0x4A4A52))
    d.point((1, 6), fill=rgb(0x4A4A52))
    save(img, "it_tire")


def item_binder():
    """Segregator (Leitz-Ordner) 10x13."""
    img = Image.new("RGBA", (10, 13), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    blue = rgb(0x2050B0)
    d.rectangle([0, 0, 9, 12], fill=blue)
    d.rectangle([0, 0, 1, 12], fill=shade(blue, 0.7))
    d.rectangle([3, 2, 8, 6], fill=rgb(0xF4F4F4))
    d.line([(4, 3), (7, 3)], fill=rgb(0x404050))
    d.line([(4, 5), (6, 5)], fill=rgb(0x404050))
    d.ellipse([4, 8, 7, 11], outline=rgb(0xF4F4F4))
    save(img, "it_binder")


def gen_items():
    item_bin()
    item_bottle()
    item_cone()
    item_rake()
    item_baguette()
    item_crate()
    item_tire()
    item_binder()
    print("przedmioty: bin, bottle, cone, rake, baguette, crate, tire, binder")


# ---------------------------------------------------------------------------
# TLA MIASTA (Rozdzial II). Drzwi sklepow musza zgadzac sie z src/game/data/city.ts
# (srodek drzwi = x + w - 17 dla funkcji shop()).
# ---------------------------------------------------------------------------
def canvas(w):
    img = Image.new("RGBA", (w, BH), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def ground(d, rng, w, night=False):
    """draw_ground z gen_sprites dla dowolnej szerokosci."""
    old = G.BW
    G.BW = w
    G.draw_ground(d, rng, night)
    G.BW = old


def finish(img, name):
    img.save(os.path.join(OUT, f"{name}.png"))


def pfand_machine(d, x):
    """Automat na butelki zwrotne (srodek w x)."""
    d.rectangle([x - 10, 112, x + 10, 150], fill=rgb(0x3E8E48))
    d.rectangle([x - 10, 112, x - 8, 150], fill=rgb(0x2E6A36))
    d.rectangle([x - 7, 116, x + 7, 124], fill=rgb(0xF4F4F4))
    text_c(d, (x, 120), "PFAND", 7, 0x206030)
    d.ellipse([x - 4, 128, x + 4, 136], fill=rgb(0x181820))
    d.rectangle([x - 6, 140, x + 6, 143], fill=rgb(0xC0C0C8))
    d.point((x + 6, 126), fill=rgb(0x7DFF7D))


def plattenbau(d, rng, x, w, col=0xC8C0B0, floors=4, ground_y=146):
    top = ground_y - floors * 24
    noise_rect(d, rng, (x, top, x + w, ground_y), rgb(col), 0.04, 0.1)
    d.rectangle([x, top, x + w, top + 3], fill=shade(rgb(col), 0.7))
    for f in range(floors):
        wy = top + 6 + f * 24
        for wx in range(x + 6, x + w - 14, 20):
            window(d, wx, wy, 12, 12)
            if f > 0 and rng.random() < 0.5:
                d.rectangle([wx - 3, wy + 12, wx + 15, wy + 16], fill=shade(rgb(col), 0.8))
                d.line([(wx - 3, wy + 12), (wx + 15, wy + 12)], fill=rgb(0x606068))
    d.rectangle([x + w // 2 - 7, ground_y - 20, x + w // 2 + 7, ground_y], fill=rgb(0x5A4A3A))


def bunting(d, x0, x1, y, cols):
    """Girlanda z choragiewkami."""
    d.line([(x0, y), (x1, y)], fill=rgb(0x404048))
    for i, xx in enumerate(range(x0 + 4, x1 - 4, 10)):
        c = rgb(cols[i % len(cols)])
        d.polygon([(xx, y + 1), (xx + 7, y + 1), (xx + 3, y + 8)], fill=c)


def gen_bg_baza():
    rng = random.Random(101)
    w = 960
    img, d = canvas(w)
    d.rectangle([0, 140, w, SIDEWALK_TOP], fill=rgb(0x8A8480))
    plattenbau(d, rng, 0, 58, 0xD8D0C0, 5)
    shop(d, rng, 60, 153, 0xF0E8E0, 3, "POLSKI SKLEP", 0xD8263A, 0xD8263A)
    plattenbau(d, rng, 215, 200, 0xC8D0C8, 5)
    shop(d, rng, 420, 153, 0xF0E4C8, 3, "MAGAZIN ROMÂNESC", 0x1F3F98, 0x1F3F98)
    plattenbau(d, rng, 575, 150, 0xD8C8B8, 4)
    tree(d, rng, 750, 146, 76)
    plattenbau(d, rng, 820, 140, 0xC0C8D0, 5)
    bunting(d, 60, 213, 62, [0xF4F4F4, 0xD8263A])
    bunting(d, 420, 573, 62, [0x1F3F98, 0xF2C230, 0xD8263A])
    pfand_machine(d, 780)
    ground(d, rng, w)
    for x in (30, 330, 640, 900):
        lamp(d, x, SIDEWALK_TOP + 2)
    finish(img, "bg_baza")


def gen_bg_bahnhof():
    rng = random.Random(102)
    w = 1440
    img, d = canvas(w)
    d.rectangle([0, 140, w, SIDEWALK_TOP], fill=rgb(0x8A8480))
    # parking rowerowy + przystanek
    plattenbau(d, rng, 0, 120, 0xC8C0B8, 4)
    d.rectangle([130, 116, 190, 118], fill=rgb(0x34343C))
    d.rectangle([132, 118, 134, 150], fill=rgb(0x34343C))
    d.rectangle([186, 118, 188, 150], fill=rgb(0x34343C))
    sign_board(d, 140, 100, 40, 14, 0xF2C230, 0x208030, "TAXI", 9)
    # dworzec
    bx0, bx1, top = 210, 770, 40
    brick = rgb(0x9A4A3A)
    noise_rect(d, rng, (bx0, top, bx1, 146), brick, 0.06, 0.3)
    for y in range(top + 4, 146, 6):
        d.line([(bx0, y), (bx1, y)], fill=shade(brick, 0.85))
    d.polygon([(bx0 - 6, top), (bx0 + 80, top - 24), (bx1 - 80, top - 24), (bx1 + 6, top)], fill=rgb(0x505860))
    # wieza z zegarem
    cx = (bx0 + bx1) // 2
    d.rectangle([cx - 28, top - 60, cx + 28, top], fill=brick)
    d.polygon([(cx - 34, top - 60), (cx, top - 88), (cx + 34, top - 60)], fill=rgb(0x505860))
    d.ellipse([cx - 16, top - 52, cx + 16, top - 20], fill=rgb(0xF4F4F4), outline=rgb(0x202020))
    d.line([(cx, top - 36), (cx, top - 48)], fill=rgb(0x202020), width=2)
    d.line([(cx, top - 36), (cx + 9, top - 36)], fill=rgb(0x202020), width=2)
    sign_board(d, cx - 110, top + 6, 220, 18, 0x1F3F98, 0xF4F4F4, "BAHNHOF ORDNUNGSBURG", 12)
    for wx in range(bx0 + 20, bx1 - 30, 46):
        if abs(wx - cx) < 50:
            continue
        d.rectangle([wx, top + 34, wx + 26, 112], fill=rgb(0x8CB8D8))
        d.ellipse([wx, top + 24, wx + 26, top + 46], fill=rgb(0x8CB8D8))
        d.line([(wx + 13, top + 26), (wx + 13, 112)], fill=rgb(0xF4F4F4))
    d.rectangle([cx - 22, 96, cx + 22, 146], fill=rgb(0x5A3A20))
    d.ellipse([cx - 22, 84, cx + 22, 110], fill=rgb(0x5A3A20))
    d.rectangle([cx - 18, 100, cx + 18, 146], fill=rgb(0x9CC8E8))
    # peron z daszkiem
    d.polygon([(780, 76), (1080, 76), (1090, 86), (770, 86)], fill=rgb(0x6A7078))
    for px in range(790, 1080, 60):
        d.rectangle([px, 86, px + 3, 146], fill=rgb(0x505058))
    sign_board(d, 880, 92, 50, 14, 0x1F3F98, 0xF4F4F4, "Gleis 1", 9)
    d.rectangle([1000, 110, 1018, 146], fill=rgb(0xD8263A))
    sign_board(d, 1001, 112, 16, 10, 0xF4F4F4, 0xD8263A, "€", 8)
    # pociag w tle
    d.rectangle([790, 104, 1076, 140], fill=rgb(0xD8D8D0))
    d.rectangle([790, 104, 1076, 108], fill=rgb(0xD8263A))
    for wx in range(800, 1070, 24):
        d.rectangle([wx, 112, wx + 16, 124], fill=rgb(0x405870))
    shop(d, rng, 1100, 153, 0xE8D8B8, 3, "DÖNER KEBAB", 0xE08020, 0xC03030)
    plattenbau(d, rng, 1260, 180, 0xD0C8C0, 4)
    pfand_machine(d, 620)
    ground(d, rng, w)
    for x in (110, 760, 1090, 1400):
        lamp(d, x, SIDEWALK_TOP + 2)
    finish(img, "bg_bahnhof")


def laube(d, rng, x, w, col):
    """Altanka dzialkowa."""
    wall = rgb(col)
    d.rectangle([x, 104, x + w, 140], fill=wall)
    for xx in range(x, x + w, 5):
        d.line([(xx, 104), (xx, 140)], fill=shade(wall, 0.85))
    d.polygon([(x - 6, 106), (x + w // 2, 84), (x + w + 6, 106)], fill=rgb(0x7A3A2A))
    window(d, x + 6, 112, 12, 10, frame=0xF4F4F4, shutters=0x3E6A3A)
    d.rectangle([x + w - 18, 116, x + w - 8, 140], fill=shade(wall, 0.6))


def gen_bg_garten():
    rng = random.Random(103)
    w = 1440
    img, d = canvas(w)
    d.rectangle([0, 132, w, SIDEWALK_TOP], fill=rgb(0x5AA048))
    x = 0
    k = 0
    cols = [0x8A5A34, 0x3E6A8A, 0x6A8A3A, 0xA0603A, 0x7A4A6A]
    while x < w:
        tree(d, rng, x + 20, 140, rng.randint(60, 90), 0x3E8A3E)
        laube(d, rng, x + 50, 70, cols[k % len(cols)])
        # grzadki
        for gx in range(x + 130, x + 200, 8):
            d.rectangle([gx, 134, gx + 4, 140], fill=rgb(0x6A4428))
            d.ellipse([gx - 1, 128, gx + 5, 134], fill=rgb(rng.choice([0xE03040, 0x40A040, 0xF2C230])))
        # flaga klubowa
        d.rectangle([x + 210, 70, x + 211, 140], fill=rgb(0xC0C0C8))
        d.rectangle([x + 212, 70, x + 232, 82], fill=rgb(0x3E8E48))
        d.rectangle([x + 212, 74, x + 232, 77], fill=rgb(0xF4F4F4))
        picket_fence(d, x, x + 240, 150, 0xE0D0B0 if k % 2 else 0xF4F4F4)
        x += 240
        k += 1
    # tablica Vereinu
    d.rectangle([118, 100, 120, 150], fill=rgb(0x5A3A20))
    d.rectangle([182, 100, 184, 150], fill=rgb(0x5A3A20))
    sign_board(d, 96, 90, 110, 26, 0xF4F0E0, 0x202020, "KLEINGARTEN e.V.", 9)
    text_c(d, (151, 110), "BETRETEN VERBOTEN!", 7, 0xC02020)
    hedge(d, rng, 0, w, 144, 152, 0x3E7A3E)
    ground(d, rng, w)
    finish(img, "bg_garten")


def hall(d, rng, x, w, h=80, col=0x8A9098):
    """Hala fabryczna z dachem szedowym."""
    top = 146 - h
    c = rgb(col)
    d.rectangle([x, top, x + w, 146], fill=c)
    for xx in range(x, x + w, 4):
        d.line([(xx, top), (xx, 146)], fill=shade(c, 0.9))
    for sx in range(x, x + w, 30):
        d.polygon([(sx, top), (sx + 30, top), (sx + 30, top - 14)], fill=shade(c, 0.75))
        d.line([(sx + 30, top), (sx + 30, top - 14)], fill=rgb(0x9CC8E8), width=2)
    d.rectangle([x + w // 2 - 20, 106, x + w // 2 + 20, 146], fill=rgb(0x606870))
    for yy in range(108, 146, 4):
        d.line([(x + w // 2 - 18, yy), (x + w // 2 + 18, yy)], fill=rgb(0x4A5058))


def gen_bg_industrie():
    rng = random.Random(104)
    w = 1440
    img, d = canvas(w)
    d.rectangle([0, 138, w, SIDEWALK_TOP], fill=rgb(0x707070))
    hall(d, rng, 0, 190)
    shop(d, rng, 200, 133, 0xC8D0D8, 3, "SPÄTI", 0xA040A0)
    hall(d, rng, 350, 260, 96, 0x9A9890)
    # komin z dymem
    d.rectangle([640, 10, 660, 146], fill=rgb(0xA05040))
    for yy in range(14, 146, 10):
        d.line([(640, yy), (660, yy)], fill=rgb(0x8A4030))
    for i in range(6):
        r = 6 + i * 3
        d.ellipse([650 - r + i * 6, 6 - i * 4 - r // 2, 650 + r + i * 6, 6 - i * 4 + r // 2], fill=(200, 200, 200, 180))
    # skup butelek
    d.rectangle([820, 80, 990, 146], fill=rgb(0xD8D0B0))
    d.rectangle([820, 76, 990, 80], fill=rgb(0x606060))
    sign_board(d, 830, 86, 150, 18, 0x3E8E48, 0xF4F4F4, "PFAND-ANNAHME", 11)
    for cx in range(840, 980, 22):
        d.rectangle([cx, 120, cx + 16, 132], fill=rgb(0x2E7A3A))
        d.rectangle([cx, 132, cx + 16, 144], fill=rgb(0x2E7A3A))
    pfand_machine(d, 900)
    # kontenery
    for i, (cx, col) in enumerate(((1010, 0xC04030), (1070, 0x3060A0), (1010, 0x40A060))):
        y0 = 110 - (30 if i == 2 else 0)
        d.rectangle([cx, y0, cx + 56, y0 + 32], fill=rgb(col))
        for xx in range(cx + 3, cx + 56, 5):
            d.line([(xx, y0 + 2), (xx, y0 + 30)], fill=shade(rgb(col), 0.8))
    hall(d, rng, 1140, 300, 70, 0x7A8088)
    # siatka
    for xx in range(0, w, 6):
        d.line([(xx, 126), (xx + 6, 150)], fill=(160, 160, 170, 140))
        d.line([(xx + 6, 126), (xx, 150)], fill=(160, 160, 170, 140))
    d.line([(0, 126), (w, 126)], fill=rgb(0x707078), width=2)
    ground(d, rng, w)
    for x in (180, 700, 1120):
        lamp(d, x, SIDEWALK_TOP + 2)
    finish(img, "bg_industrie")


def gen_bg_stadion():
    rng = random.Random(105)
    w = 1440
    img, d = canvas(w)
    d.rectangle([0, 140, w, SIDEWALK_TOP], fill=rgb(0x8A8480))
    # trybuny (widac zza muru)
    for row in range(6):
        y = 40 + row * 10
        for xx in range(80, 1360, 3):
            col = rng.choice([0xD8263A, 0xF4F4F4, 0xD8263A, 0x3E8E48, 0x202020])
            d.point((xx, y + rng.randint(0, 2)), fill=rgb(col))
        d.line([(80, y + 6), (1360, y + 6)], fill=rgb(0x9A9AA0))
    d.polygon([(60, 30), (1380, 30), (1400, 42), (40, 42)], fill=rgb(0x505058))
    # mur stadionu
    wall = rgb(0xB8B8C0)
    noise_rect(d, rng, (40, 100, 1400, 146), wall, 0.05, 0.15)
    for xx in range(40, 1400, 40):
        d.line([(xx, 100), (xx, 146)], fill=shade(wall, 0.85))
    sign_board(d, 520, 104, 400, 22, 0xD8263A, 0xF4F4F4, "FC ORDNUNGSBURG 1907", 14)
    for bx, label, col in ((160, "ULTRAS", 0x202020), (1100, "OSTKURVE", 0x3E8E48)):
        d.rectangle([bx, 72, bx + 120, 92], fill=rgb(col))
        text_c(d, (bx + 60, 82), label, 11, 0xF4F4F4)
    # maszty jupiterow
    for mx in (60, 720, 1380):
        d.rectangle([mx - 2, 0, mx + 2, 146], fill=rgb(0x707078))
        d.rectangle([mx - 16, 0, mx + 16, 14], fill=rgb(0x505058))
        for lx in range(mx - 14, mx + 14, 6):
            d.rectangle([lx, 2, lx + 4, 12], fill=rgb(0xFFF4C0))
    # kasa biletowa
    d.rectangle([980, 112, 1040, 146], fill=rgb(0x3060A0))
    sign_board(d, 986, 116, 48, 12, 0xF4F4F4, 0x3060A0, "KASSE", 8)
    d.rectangle([996, 130, 1024, 142], fill=rgb(0x9CC8E8))
    ground(d, rng, w)
    for x in (300, 860, 1250):
        lamp(d, x, SIDEWALK_TOP + 2)
    finish(img, "bg_stadion")


def fachwerk(d, rng, x, w, roof=0xA83A2A, floors=3):
    """Kamienica z muru pruskiego."""
    fh = 30
    top = 146 - floors * fh
    wall = rgb(0xF0E8D8)
    beam = rgb(0x5A3A20)
    d.rectangle([x, top, x + w, 146], fill=wall)
    for f in range(floors + 1):
        d.line([(x, top + f * fh), (x + w, top + f * fh)], fill=beam, width=2)
    for xx in range(x, x + w + 1, 22):
        d.line([(xx, top), (xx, 146)], fill=beam, width=2)
    for f in range(floors):
        y0 = top + f * fh
        for xx in range(x, x + w - 21, 44):
            d.line([(xx, y0), (xx + 22, y0 + fh)], fill=beam)
    for f in range(floors - 1):
        for wx in range(x + 27, x + w - 14, 44):
            window(d, wx, top + f * fh + 8, 12, 14, frame=0xF4F4F4, shutters=0x3E6A3A)
    d.polygon([(x - 6, top + 2), (x + w // 2, top - 44), (x + w + 6, top + 2)], fill=rgb(roof))
    for yy in range(top - 40, top, 5):
        t = (yy - (top - 44)) / 46
        d.line([(x + w // 2 - t * (w // 2 + 6), yy), (x + w // 2 + t * (w // 2 + 6), yy)], fill=shade(rgb(roof), 0.8))
    d.rectangle([x + w // 2 - 7, 124, x + w // 2 + 7, 146], fill=rgb(0x7A4A28))


def gen_bg_altstadt():
    rng = random.Random(106)
    w = 1440
    img, d = canvas(w)
    d.rectangle([0, 140, w, SIDEWALK_TOP], fill=rgb(0x9A8A80))
    fachwerk(d, rng, 0, 130)
    fachwerk(d, rng, 140, 140, 0x8A3A2A)
    # ratusz
    rx0, rx1 = 300, 700
    stone = rgb(0xD8C8A8)
    noise_rect(d, rng, (rx0, 40, rx1, 146), stone, 0.04, 0.12)
    d.polygon([(rx0 - 8, 42), (rx0 + 40, 14), (rx1 - 40, 14), (rx1 + 8, 42)], fill=rgb(0x505860))
    cx = (rx0 + rx1) // 2
    d.rectangle([cx - 24, -10, cx + 24, 42], fill=stone)
    d.polygon([(cx - 30, -10), (cx, -40), (cx + 30, -10)], fill=rgb(0x3E6A5A))
    d.ellipse([cx - 14, 2, cx + 14, 30], fill=rgb(0xF4F4F4), outline=rgb(0x202020))
    d.line([(cx, 16), (cx, 6)], fill=rgb(0x202020), width=2)
    d.line([(cx, 16), (cx + 8, 20)], fill=rgb(0x202020), width=2)
    for wx in range(rx0 + 20, rx1 - 20, 40):
        if abs(wx + 9 - cx) < 30:
            continue
        window(d, wx, 56, 18, 22)
        window(d, wx, 92, 18, 22)
    sign_board(d, cx - 100, 46, 200, 16, 0xF4F0E0, 0x202020, "RATHAUS • ORDNUNGSAMT", 10)
    d.rectangle([cx - 20, 104, cx + 20, 146], fill=rgb(0x5A3A20))
    d.rectangle([cx - 4, 104, cx + 4, 146], fill=rgb(0x4A2A10))
    shop(d, rng, 720, 140, 0xE8E0C8, 3, "BUCHHANDLUNG", 0x5A3A8A, 0x5A3A8A)
    fachwerk(d, rng, 866, 90, 0xA83A2A, 3)
    shop(d, rng, 960, 140, 0xA8C0C8, 3, "APOTHEKE", 0x30A050, 0x30A050)
    fachwerk(d, rng, 1106, 90, 0x7A3A2A, 3)
    shop(d, rng, 1200, 140, 0xD8C8A8, 3, "BÄCKEREI", 0xC03030)
    fachwerk(d, rng, 1346, 94, 0xA83A2A, 3)
    ground(d, rng, w)
    for x in (130, 290, 712, 1190):
        lamp(d, x, SIDEWALK_TOP + 2)
    finish(img, "bg_altstadt")


def parked_car(d, x, y, col):
    body = rgb(col)
    d.polygon([(x + 10, y - 16), (x + 34, y - 16), (x + 42, y - 8), (x + 4, y - 8)], fill=body)
    d.rectangle([x + 12, y - 14, x + 21, y - 9], fill=rgb(0x405870))
    d.rectangle([x + 24, y - 14, x + 33, y - 9], fill=rgb(0x405870))
    d.rounded_rectangle([x, y - 9, x + 46, y], radius=2, fill=body)
    d.ellipse([x + 6, y - 4, x + 14, y + 4], fill=rgb(0x181818))
    d.ellipse([x + 32, y - 4, x + 40, y + 4], fill=rgb(0x181818))


def gen_bg_holownia():
    rng = random.Random(107)
    w = 960
    img, d = canvas(w)
    d.rectangle([0, 130, w, SIDEWALK_TOP], fill=rgb(0x4A4A50))
    # rzedy odholowanych aut
    cols = [0xC04030, 0x3060A0, 0xE0E0D8, 0x40A060, 0xF2C230, 0x606068, 0x8A3A6A]
    for row, y in enumerate((112, 132)):
        for i, x in enumerate(range(10 + row * 24, 600, 58)):
            parked_car(d, x, y, cols[(i + row * 3) % len(cols)])
    # kontener biurowy
    d.rectangle([610, 86, 790, 146], fill=rgb(0xE0E0D8))
    for xx in range(612, 790, 6):
        d.line([(xx, 88), (xx, 146)], fill=rgb(0xC8C8C0))
    sign_board(d, 600, 60, 200, 22, 0xF2C230, 0x202020, "ABSCHLEPPDIENST KLAUS", 12)
    window(d, 630, 100, 30, 18, lit=True)
    d.rectangle([700, 104, 720, 146], fill=rgb(0x606068))
    window(d, 740, 100, 30, 18, lit=True)
    # laweta
    d.rectangle([800, 112, 930, 136], fill=rgb(0xD8263A))
    d.rectangle([880, 92, 930, 120], fill=rgb(0xD8263A))
    d.rectangle([890, 96, 922, 108], fill=rgb(0x9CC8E8))
    d.line([(800, 112), (850, 92)], fill=rgb(0x606068), width=3)
    for wx in (820, 900):
        d.ellipse([wx - 9, 128, wx + 9, 146], fill=rgb(0x181818))
    d.rectangle([900, 86, 912, 90], fill=rgb(0xF2A030))
    # siatka z drutem kolczastym
    for xx in range(0, w, 6):
        d.line([(xx, 92), (xx + 6, 150)], fill=(170, 170, 180, 150))
        d.line([(xx + 6, 92), (xx, 150)], fill=(170, 170, 180, 150))
    d.line([(0, 92), (w, 92)], fill=rgb(0x707078), width=2)
    for xx in range(0, w, 8):
        d.line([(xx, 86), (xx + 4, 90)], fill=rgb(0x909098))
        d.line([(xx + 4, 86), (xx, 90)], fill=rgb(0x909098))
    for px in range(0, w, 120):
        d.rectangle([px, 84, px + 3, 150], fill=rgb(0x505058))
    ground(d, rng, w, night=True)
    for x in (120, 520, 860):
        lamp(d, x, SIDEWALK_TOP + 2, lit=True)
    finish(img, "bg_holownia")


def gen_city():
    gen_bg_baza()
    gen_bg_bahnhof()
    gen_bg_garten()
    gen_bg_industrie()
    gen_bg_stadion()
    gen_bg_altstadt()
    gen_bg_holownia()
    print("tla miasta: baza, bahnhof, garten, industrie, stadion, altstadt, holownia")


if __name__ == "__main__":
    gen_items()
    gen_city()
    print("OK ->", OUT)
