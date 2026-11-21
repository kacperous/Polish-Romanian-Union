"""Generator wszystkich grafik pikselowych do gry (postacie, przedmioty, tla, efekty).

Uruchom:  python3 tools/gen_sprites.py
Wynik trafia do public/assets/.
"""
import math
import os
import random
import zlib

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "assets")
FONT_PATH = os.path.join(OUT, "fonts", "PixelifySans.ttf")
os.makedirs(OUT, exist_ok=True)

OUTLINE = (24, 16, 32, 255)


def rgb(h, a=255):
    return ((h >> 16) & 255, (h >> 8) & 255, h & 255, a)


def shade(c, f):
    return (max(0, min(255, int(c[0] * f))), max(0, min(255, int(c[1] * f))), max(0, min(255, int(c[2] * f))), c[3])


def outline(img, color=OUTLINE):
    """Dodaje 1px obrys wokol nieprzezroczystych pikseli."""
    w, h = img.size
    src = img.load()
    out = img.copy()
    dst = out.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3] != 0:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3] > 0 and src[nx, ny] != color:
                    dst[x, y] = color
                    break
    return out


def font(size):
    return ImageFont.truetype(FONT_PATH, size)


# ---------------------------------------------------------------------------
# POSTACIE
# ---------------------------------------------------------------------------
FW, FH = 40, 40  # rozmiar klatki
CX = 20
GROUND = 38

FRAMES = ["idle0", "idle1", "walk0", "walk1", "walk2", "walk3", "atk0", "atk1", "atk2", "hurt", "down", "act0", "act1"]

SKIN_L = rgb(0xF2C39B)
SKIN_T = rgb(0xD9A066)

CHARS = {
    "pole": dict(
        skin=SKIN_L, hair=rgb(0xB0804A), hair_style="buzz",
        top=rgb(0xF4F4F4), top2=rgb(0xD8263A), top_style="flag",
        legs=rgb(0xD8263A), legs_stripe=rgb(0xF4F4F4), legs_style="pants",
        shoes=rgb(0x2A2A35), weapon="club", attack="club", brows=True,
    ),
    "romanian": dict(
        skin=SKIN_T, hair=rgb(0x1C1820), hair_style="curly", mustache=rgb(0x1C1820),
        top=rgb(0x6B3A22), top2=rgb(0xF2C230), top_style="leather",
        legs=rgb(0x3A5BA8), legs_style="pants",
        shoes=rgb(0x3B2418), attack="kick", brows=True,
    ),
    "herr": dict(
        skin=SKIN_L, hair=rgb(0xB8B8B8), hair_style="bald", mustache=rgb(0x9A9A9A), glasses=True,
        top=rgb(0xD8C48A), top_style="polo",
        legs=rgb(0x8C7A50), legs_style="shorts",
        shoes=rgb(0x7A4A28), socks=rgb(0xFFFFFF), attack="punch",
    ),
    "frau": dict(
        skin=SKIN_L, hair=rgb(0xF0D060), hair_style="bob",
        top=rgb(0x8A4FB0), top_style="coat",
        legs=rgb(0x3A3048), legs_style="skirt",
        shoes=rgb(0xC03040), attack="punch", lips=True,
    ),
    "jogger": dict(
        skin=SKIN_L, hair=rgb(0x7A4A28), hair_style="short", band=rgb(0xE03030),
        top=rgb(0x9CF040), top_style="plain",
        legs=rgb(0x202028), legs_style="shorts",
        shoes=rgb(0xF4F4F4), attack="punch",
    ),
    "opa": dict(
        skin=SKIN_L, hair=rgb(0xE8E8E8), hair_style="short", hat="tyrol", mustache=rgb(0xE8E8E8),
        top=rgb(0x707880), top_style="jacket",
        legs=rgb(0x5A4030), legs_style="pants",
        shoes=rgb(0x2A2A35), attack="punch",
    ),
    "gartner": dict(
        skin=SKIN_L, hair=rgb(0xC07030), hair_style="short", hat="straw", mustache=rgb(0xC07030),
        top=rgb(0xF0F0F0), top2=rgb(0x3E8E48), top_style="overalls",
        legs=rgb(0x3E8E48), legs_style="pants",
        shoes=rgb(0x5A3A20), attack="punch",
    ),
    "boss": dict(
        skin=SKIN_L, hair=rgb(0x2A2020), hair_style="slick", shades=True,
        top=rgb(0x55606E), top2=rgb(0xC02028), top_style="suit",
        legs=rgb(0x3A4250), legs_style="pants",
        shoes=rgb(0x101014), attack="punch",
    ),
    "polizei": dict(
        skin=SKIN_L, hair=rgb(0x5A3A20), hair_style="short", hat="police", mustache=rgb(0x5A3A20),
        top=rgb(0x2E4C8C), top2=rgb(0xE8E8E8), top_style="police",
        legs=rgb(0x1E2A48), legs_style="pants",
        shoes=rgb(0x101014), attack="punch",
    ),
}

# pozy: bob, stopy (back, front) wzgl. bioder, dlonie (back, front) wzgl. CX, bron kat, lean
POSES = {
    "idle0": dict(bob=0, feet=((-2, 0), (2, 0)), hands=((-5, 28), (5, 28)), club=110),
    "idle1": dict(bob=1, feet=((-2, 0), (2, 0)), hands=((-5, 28), (5, 28)), club=105),
    "walk0": dict(bob=0, feet=((-5, 0), (5, 0)), hands=((3, 27), (-4, 27)), club=125),
    "walk1": dict(bob=1, feet=((-1, -2), (1, 0)), hands=((-1, 28), (1, 28)), club=110),
    "walk2": dict(bob=0, feet=((5, 0), (-5, 0)), hands=((-6, 27), (6, 27)), club=95),
    "walk3": dict(bob=1, feet=((1, 0), (-1, -2)), hands=((-1, 28), (1, 28)), club=110),
    "atk0": dict(bob=0, feet=((-4, 0), (3, 0)), hands=((-6, 26), (-4, 14)), club=-120, lean=-1),
    "atk1": dict(bob=1, feet=((-5, 0), (5, 0)), hands=((-2, 26), (10, 22)), club=0, lean=1),
    "atk2": dict(bob=1, feet=((-5, 0), (5, 0)), hands=((-2, 27), (9, 28)), club=50, lean=1),
    "hurt": dict(bob=0, feet=((-4, 0), (1, 0)), hands=((-9, 18), (4, 17)), club=-150, lean=-2),
    "act0": dict(bob=2, feet=((-4, 0), (4, 0)), hands=((5, 26), (10, 27)), club=60, lean=1),
    "act1": dict(bob=2, feet=((-4, 0), (4, 0)), hands=((6, 25), (11, 25)), club=60, lean=1),
}
KICK = {
    "atk0": dict(bob=1, feet=((-3, 0), (0, -3)), hands=((-6, 24), (2, 22)), lean=-1),
    "atk1": dict(bob=0, feet=((-4, 0), (13, -9)), hands=((-8, 20), (-2, 22)), lean=-2),
    "atk2": dict(bob=1, feet=((-3, 0), (6, -2)), hands=((-6, 24), (2, 24)), lean=-1),
}
PUNCH = {
    "atk0": dict(bob=0, feet=((-4, 0), (3, 0)), hands=((-2, 24), (-6, 22)), lean=-1),
    "atk1": dict(bob=0, feet=((-5, 0), (5, 0)), hands=((-3, 25), (12, 20)), lean=1),
    "atk2": dict(bob=0, feet=((-4, 0), (4, 0)), hands=((-3, 25), (7, 22)), lean=1),
}


def draw_line(d, p0, p1, color, width):
    d.line([p0, p1], fill=color, width=width)
    r = width // 2
    for p in (p0, p1):
        d.rectangle([p[0] - r, p[1] - r, p[0] - r + width - 1, p[1] - r + width - 1], fill=color)


def draw_head(d, spec, hx, hy):
    """hx = lewa krawedz glowy, hy = gora glowy. Glowa 12x11, twarz w prawo."""
    skin = spec["skin"]
    sk_d = shade(skin, 0.82)
    d.rectangle([hx, hy + 1, hx + 11, hy + 10], fill=skin)
    d.rectangle([hx + 1, hy, hx + 10, hy + 10], fill=skin)
    d.rectangle([hx, hy + 2, hx + 1, hy + 9], fill=sk_d)  # tyl glowy cien
    # ucho
    d.rectangle([hx + 3, hy + 5, hx + 4, hy + 7], fill=sk_d)
    # nos
    d.point((hx + 12, hy + 6), fill=skin)
    d.point((hx + 12, hy + 7), fill=sk_d)
    hair = spec.get("hair")
    hs = spec.get("hair_style")
    hd = shade(hair, 0.75) if hair else None
    if hs == "buzz":
        d.rectangle([hx + 1, hy, hx + 10, hy + 1], fill=hair)
        d.rectangle([hx, hy + 1, hx + 2, hy + 5], fill=hair)
        d.point((hx + 4, hy + 1), fill=hd)
        d.point((hx + 7, hy), fill=hd)
    elif hs == "curly":
        d.rectangle([hx - 1, hy - 1, hx + 10, hy + 2], fill=hair)
        d.rectangle([hx - 1, hy, hx + 3, hy + 7], fill=hair)
        for i in range(0, 12, 3):
            d.point((hx + i, hy - 2), fill=hair)
        for i in range(1, 11, 3):
            d.point((hx + i, hy + 1), fill=hd)
        d.point((hx + 11, hy + 1), fill=hair)
    elif hs == "bald":
        d.rectangle([hx, hy + 3, hx + 2, hy + 7], fill=hair)
        d.point((hx + 6, hy + 1), fill=rgb(0xFFFFFF))
    elif hs == "bob":
        d.rectangle([hx - 1, hy - 1, hx + 11, hy + 2], fill=hair)
        d.rectangle([hx - 1, hy, hx + 4, hy + 11], fill=hair)
        d.rectangle([hx + 9, hy + 1, hx + 11, hy + 3], fill=hair)
        d.line([(hx, hy + 11), (hx + 4, hy + 11)], fill=hd)
    elif hs == "short":
        d.rectangle([hx, hy - 1, hx + 10, hy + 1], fill=hair)
        d.rectangle([hx, hy, hx + 2, hy + 5], fill=hair)
        d.point((hx + 10, hy + 2), fill=hair)
    elif hs == "slick":
        d.rectangle([hx, hy - 1, hx + 11, hy + 1], fill=hair)
        d.rectangle([hx, hy, hx + 2, hy + 6], fill=hair)
        d.line([(hx + 2, hy), (hx + 9, hy)], fill=shade(hair, 1.8))
    # oczy
    ey = hy + 4
    if spec.get("shades"):
        d.rectangle([hx + 6, ey, hx + 12, ey + 1], fill=rgb(0x101018))
        d.point((hx + 9, ey), fill=rgb(0x6080A0))
    else:
        d.rectangle([hx + 9, ey, hx + 9, ey + 1], fill=rgb(0x181020))
        d.point((hx + 10, ey), fill=rgb(0xFFFFFF))
        if spec.get("brows"):
            d.line([(hx + 8, ey - 2), (hx + 10, ey - 1)], fill=shade(hair, 0.8))
        if spec.get("glasses"):
            d.rectangle([hx + 7, ey - 1, hx + 11, ey + 2], outline=rgb(0x303040))
            d.line([(hx + 4, ey), (hx + 7, ey)], fill=rgb(0x303040))
    if spec.get("mustache"):
        d.rectangle([hx + 7, hy + 7, hx + 11, hy + 8], fill=spec["mustache"])
    else:
        d.line([(hx + 9, hy + 8), (hx + 10, hy + 8)], fill=rgb(0xC03040) if spec.get("lips") else sk_d)
    # opaska / czapki
    if spec.get("band"):
        d.rectangle([hx, hy + 1, hx + 11, hy + 2], fill=spec["band"])
    hat = spec.get("hat")
    if hat == "tyrol":
        g = rgb(0x3C6A3A)
        d.rectangle([hx - 1, hy - 1, hx + 12, hy], fill=g)
        d.rectangle([hx + 1, hy - 4, hx + 10, hy - 1], fill=g)
        d.line([(hx + 1, hy - 1), (hx + 10, hy - 1)], fill=rgb(0x8A3020))
        d.line([(hx + 1, hy - 4), (hx - 2, hy - 8)], fill=rgb(0xE8E8E8))
    elif hat == "straw":
        s = rgb(0xE8C860)
        d.rectangle([hx - 3, hy, hx + 14, hy + 1], fill=s)
        d.rectangle([hx + 1, hy - 3, hx + 10, hy], fill=s)
        d.line([(hx + 1, hy - 1), (hx + 10, hy - 1)], fill=rgb(0xC03030))
    elif hat == "police":
        b = rgb(0x1E2A48)
        d.rectangle([hx, hy - 3, hx + 11, hy + 1], fill=b)
        d.rectangle([hx + 7, hy + 1, hx + 13, hy + 2], fill=rgb(0x101014))
        d.line([(hx, hy), (hx + 11, hy)], fill=rgb(0xE8E8E8))
        d.rectangle([hx + 7, hy - 2, hx + 8, hy - 1], fill=rgb(0xF2C230))


def draw_torso(d, spec, tx, ty, front_hand):
    """tx lewa krawedz tulowia (10 szer), ty gora (10 wys)."""
    top = spec["top"]
    td = shade(top, 0.78)
    st = spec["top_style"]
    d.rectangle([tx, ty, tx + 9, ty + 9], fill=top)
    d.rectangle([tx, ty, tx + 1, ty + 9], fill=td)
    if st == "flag":
        d.rectangle([tx, ty + 5, tx + 9, ty + 9], fill=spec["top2"])
        d.rectangle([tx, ty + 5, tx + 1, ty + 9], fill=shade(spec["top2"], 0.78))
        d.line([(tx + 7, ty), (tx + 7, ty + 4)], fill=rgb(0xC8C8D0))
    elif st == "leather":
        d.rectangle([tx + 6, ty, tx + 8, ty + 9], fill=rgb(0x202020))
        d.line([(tx + 6, ty + 1), (tx + 8, ty + 3)], fill=spec["top2"])
        d.point((tx + 7, ty + 3), fill=rgb(0xFFF080))
        d.line([(tx + 5, ty), (tx + 5, ty + 9)], fill=shade(top, 1.3))
    elif st == "polo":
        d.rectangle([tx + 5, ty, tx + 8, ty + 1], fill=rgb(0xFFFFFF))
        d.line([(tx + 7, ty + 2), (tx + 7, ty + 4)], fill=td)
    elif st == "coat":
        d.line([(tx + 7, ty), (tx + 7, ty + 9)], fill=td)
        d.rectangle([tx + 2, ty + 7, tx + 9, ty + 7], fill=rgb(0x5A2A70))
    elif st == "jacket":
        d.line([(tx + 7, ty), (tx + 7, ty + 9)], fill=td)
        d.rectangle([tx + 6, ty, tx + 8, ty + 1], fill=rgb(0xE8E8E8))
    elif st == "overalls":
        d.rectangle([tx, ty + 4, tx + 9, ty + 9], fill=spec["top2"])
        d.line([(tx + 3, ty), (tx + 3, ty + 4)], fill=spec["top2"])
        d.line([(tx + 7, ty), (tx + 7, ty + 4)], fill=spec["top2"])
    elif st == "suit":
        d.rectangle([tx + 5, ty, tx + 8, ty + 3], fill=rgb(0xF0F0F0))
        d.line([(tx + 7, ty + 1), (tx + 7, ty + 6)], fill=spec["top2"])
    elif st == "police":
        d.rectangle([tx + 6, ty + 2, tx + 8, ty + 3], fill=rgb(0xF2C230))
        d.line([(tx, ty + 8), (tx + 9, ty + 8)], fill=rgb(0x101014))
        d.line([(tx + 2, ty), (tx + 2, ty + 9)], fill=spec["top2"])


def draw_leg(d, spec, hip, foot, back):
    legs = spec["legs"]
    if back:
        legs = shade(legs, 0.75)
    style = spec["legs_style"]
    skin = shade(spec["skin"], 0.8 if back else 1.0)
    shoes = spec["shoes"]
    if style == "shorts":
        mid = (hip[0] + (foot[0] - hip[0]) * 0.45, hip[1] + (foot[1] - hip[1]) * 0.45)
        draw_line(d, hip, (round(mid[0]), round(mid[1])), legs, 4)
        draw_line(d, (round(mid[0]), round(mid[1])), (foot[0], foot[1] - 1), skin, 3)
        if spec.get("socks"):
            draw_line(d, (foot[0], foot[1] - 3), (foot[0], foot[1] - 1), spec["socks"], 3)
    elif style == "skirt":
        draw_line(d, hip, (foot[0], foot[1] - 1), skin, 3)
    else:
        draw_line(d, hip, (foot[0], foot[1] - 1), legs, 4)
        if spec.get("legs_stripe") and not back:
            d.line([hip, (foot[0], foot[1] - 2)], fill=spec["legs_stripe"], width=1)
    # but
    fx, fy = foot
    d.rectangle([fx - 2, fy - 1, fx + 3, fy], fill=shade(shoes, 0.8) if back else shoes)


def draw_arm(d, spec, shoulder, hand, back):
    top = spec["top"]
    if spec["top_style"] == "overalls":
        top = spec["top"]
    col = shade(top, 0.72 if back else 0.95)
    draw_line(d, shoulder, hand, col, 3)
    if spec["top_style"] == "flag" and not back:
        # rekaw - czerwony pasek
        mx = (shoulder[0] + hand[0]) // 2
        my = (shoulder[1] + hand[1]) // 2
        d.point((mx, my), fill=spec["top2"])
    if spec["top_style"] == "police" and not back:
        pass
    skin = shade(spec["skin"], 0.8 if back else 1.0)
    d.rectangle([hand[0] - 1, hand[1] - 1, hand[0] + 1, hand[1] + 1], fill=skin)


def draw_club(d, hand, angle_deg):
    a = math.radians(angle_deg)
    L = 12
    tip = (round(hand[0] + math.cos(a) * L), round(hand[1] + math.sin(a) * L))
    grip = (round(hand[0] + math.cos(a) * 3), round(hand[1] + math.sin(a) * 3))
    draw_line(d, hand, tip, rgb(0x9A6230), 3)
    d.line([hand, grip], fill=rgb(0x2A1A10), width=2)
    d.point(tip, fill=rgb(0xC8884A))


def draw_character(spec, frame):
    img = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    name = "idle0" if frame == "down" else frame
    pose = dict(POSES[name])
    if frame in ("atk0", "atk1", "atk2"):
        if spec["attack"] == "kick":
            pose = dict(KICK[frame])
        elif spec["attack"] == "punch":
            pose = dict(PUNCH[frame])
    bob = pose.get("bob", 0)
    lean = pose.get("lean", 0)
    hip_y = 29 + bob
    hips = ((CX - 2, hip_y), (CX + 2, hip_y))
    feet = []
    for i, (fx, fy) in enumerate(pose["feet"]):
        feet.append((hips[i][0] + fx, GROUND + fy))
    ty = 19 + bob
    tx = CX - 5 + lean
    shoulders = ((tx + 2, ty + 2), (tx + 7, ty + 2))
    hands = [(CX + hx + lean, hy + bob) for hx, hy in pose["hands"]]

    # tylna reka i noga
    draw_arm(d, spec, shoulders[0], hands[0], True)
    draw_leg(d, spec, hips[0], feet[0], True)
    if spec["legs_style"] == "skirt":
        draw_leg(d, spec, hips[1], feet[1], False)
        sk = spec["legs"]
        d.polygon([(tx, ty + 9), (tx + 9, ty + 9), (tx + 11, ty + 15), (tx - 2, ty + 15)], fill=sk)
        d.line([(tx - 1, ty + 15), (tx + 10, ty + 15)], fill=shade(sk, 0.7))
    else:
        d.rectangle([tx, ty + 9, tx + 9, ty + 11], fill=shade(spec["legs"], 0.9))
        draw_leg(d, spec, hips[1], feet[1], False)
    draw_torso(d, spec, tx, ty, hands[1])
    if spec["top_style"] == "leather":
        # zloty lancuch
        d.line([(tx + 6, ty), (tx + 8, ty + 2)], fill=rgb(0xF2C230))
    head_x = CX - 6 + lean + (1 if lean > 0 else 0)
    head_y = 8 + bob + (1 if frame == "hurt" else 0)
    if frame == "hurt":
        head_x -= 2
    draw_head(d, spec, head_x, head_y)
    if frame == "hurt":
        # zamkniete oczy "x"
        ex, ey = head_x + 9, head_y + 4
        d.rectangle([ex - 1, ey - 1, ex + 1, ey + 1], fill=spec["skin"])
        d.point((ex - 1, ey - 1), fill=rgb(0x181020))
        d.point((ex + 1, ey + 1), fill=rgb(0x181020))
        d.point((ex, ey), fill=rgb(0x181020))
        d.point((ex + 1, ey - 1), fill=rgb(0x181020))
        d.point((ex - 1, ey + 1), fill=rgb(0x181020))
    draw_arm(d, spec, shoulders[1], hands[1], False)
    if spec.get("weapon") == "club":
        draw_club(d, hands[1], pose.get("club", 110))
        # dlon na wierzchu
        d.rectangle([hands[1][0] - 1, hands[1][1] - 1, hands[1][0] + 1, hands[1][1] + 1], fill=spec["skin"])
    if spec.get("top_style") == "suit" and frame == "idle0":
        pass
    img = outline(img)
    if frame == "down":
        rot = img.rotate(90, expand=False)
        # przesun na dol klatki
        bbox = rot.getbbox()
        if bbox:
            crop = rot.crop(bbox)
            img = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
            img.paste(crop, (FW // 2 - crop.width // 2, GROUND + 1 - crop.height))
    return img


def gen_characters():
    for key, spec in CHARS.items():
        sheet = Image.new("RGBA", (FW * len(FRAMES), FH), (0, 0, 0, 0))
        for i, f in enumerate(FRAMES):
            sheet.paste(draw_character(spec, f), (i * FW, 0))
        sheet.save(os.path.join(OUT, f"char_{key}.png"))
    print("postacie:", ", ".join(CHARS.keys()))


# ---------------------------------------------------------------------------
# PRZEDMIOTY
# ---------------------------------------------------------------------------
def gen_gnome():
    img = Image.new("RGBA", (16, 24), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # czapka
    d.polygon([(8, 1), (3, 10), (13, 10)], fill=rgb(0xD82830))
    d.line([(8, 1), (5, 9)], fill=rgb(0xF05050))
    # twarz
    d.rectangle([5, 10, 11, 13], fill=SKIN_L)
    d.point((9, 11), fill=rgb(0x181020))
    d.point((10, 12), fill=rgb(0xE08080))
    # broda
    d.polygon([(4, 13), (12, 13), (9, 19), (7, 19)], fill=rgb(0xF4F4F4))
    # cialo
    d.rectangle([4, 15, 12, 20], fill=rgb(0x3060C0))
    d.rectangle([4, 15, 5, 20], fill=rgb(0x204090))
    d.rectangle([6, 13, 10, 17], fill=rgb(0xF4F4F4))
    d.rectangle([4, 19, 12, 19], fill=rgb(0x5A3A20))
    # buty
    d.rectangle([4, 21, 7, 22], fill=rgb(0x5A3A20))
    d.rectangle([9, 21, 12, 22], fill=rgb(0x5A3A20))
    d.line([(4, 20), (12, 20)], fill=rgb(0x40A040))
    outline(img).save(os.path.join(OUT, "gnome.png"))


def draw_bike(d, ox, oy, frame_col):
    wheel = rgb(0x202028)
    for cx in (ox + 7, ox + 27):
        d.ellipse([cx - 6, oy + 9, cx + 6, oy + 21], outline=wheel, width=2)
        d.point((cx, oy + 15), fill=rgb(0xA0A0A8))
        d.line([(cx - 4, oy + 15), (cx + 4, oy + 15)], fill=rgb(0x707078))
        d.line([(cx, oy + 11), (cx, oy + 19)], fill=rgb(0x707078))
    fc = frame_col
    d.line([(ox + 7, oy + 15), (ox + 15, oy + 7)], fill=fc, width=2)
    d.line([(ox + 15, oy + 7), (ox + 25, oy + 7)], fill=fc, width=2)
    d.line([(ox + 15, oy + 7), (ox + 17, oy + 15)], fill=fc, width=2)
    d.line([(ox + 17, oy + 15), (ox + 7, oy + 15)], fill=fc, width=2)
    d.line([(ox + 17, oy + 15), (ox + 25, oy + 7)], fill=fc, width=2)
    d.line([(ox + 25, oy + 6), (ox + 27, oy + 15)], fill=fc, width=2)
    d.rectangle([ox + 12, oy + 4, ox + 17, oy + 5], fill=rgb(0x202028))  # siodelko
    d.line([(ox + 24, oy + 4), (ox + 28, oy + 3)], fill=rgb(0x202028), width=2)  # kierownica


def gen_bike():
    sheet = Image.new("RGBA", (36 * 2, 24), (0, 0, 0, 0))
    for i in range(2):
        img = Image.new("RGBA", (36, 24), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        draw_bike(d, 1, 1, rgb(0x20A0A0))
        if i == 0:
            # lancuch z klodka
            d.line([(5, 15), (11, 9), (17, 15)], fill=rgb(0xC0C0C8), width=1)
            d.rectangle([9, 15, 13, 19], fill=rgb(0xF2C230))
            d.rectangle([10, 13, 12, 14], outline=rgb(0xA0A0A8))
            d.point((11, 17), fill=rgb(0x403010))
        sheet.paste(outline(img), (i * 36, 0))
    sheet.save(os.path.join(OUT, "bike.png"))


def gen_car():
    W, H = 104, 46
    sheet = Image.new("RGBA", (W * 2, H), (0, 0, 0, 0))
    for i in range(2):
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        body = rgb(0x1E2E6A)
        bd = shade(body, 0.7)
        bl = shade(body, 1.5)
        # dach / szyby
        d.polygon([(28, 6), (66, 6), (80, 20), (16, 20)], fill=body)
        d.polygon([(31, 9), (46, 9), (46, 19), (21, 19)], fill=rgb(0x9CC8E8))
        d.polygon([(49, 9), (64, 9), (75, 19), (49, 19)], fill=rgb(0x9CC8E8))
        d.line([(33, 10), (26, 18)], fill=rgb(0xE8F4FF))
        d.line([(52, 10), (52, 14)], fill=rgb(0xE8F4FF))
        # karoseria
        d.rounded_rectangle([3, 19, 100, 36], radius=4, fill=body)
        d.rectangle([3, 30, 100, 36], fill=bd)
        d.line([(6, 22), (97, 22)], fill=bl)
        # drzwi
        d.line([(47, 20), (47, 34)], fill=bd)
        d.line([(20, 20), (20, 33)], fill=bd)
        d.line([(76, 20), (76, 33)], fill=bd)
        d.rectangle([40, 24, 43, 25], fill=rgb(0xC0C0C8))
        d.rectangle([69, 24, 72, 25], fill=rgb(0xC0C0C8))
        # swiatla
        d.rectangle([96, 23, 100, 26], fill=rgb(0xFFF4A0) if i == 1 else rgb(0xE8E8D0))
        d.rectangle([3, 23, 6, 26], fill=rgb(0xF03030) if i == 1 else rgb(0xA02020))
        # zderzaki
        d.rectangle([1, 32, 10, 34], fill=rgb(0xB0B0B8))
        d.rectangle([92, 32, 102, 34], fill=rgb(0xB0B0B8))
        # tablica
        d.rectangle([93, 28, 99, 31], fill=rgb(0xF4F4F4))
        d.point((94, 29), fill=rgb(0x2040A0))
        # kola
        for cx in (24, 80):
            d.ellipse([cx - 8, 28, cx + 8, 44], fill=rgb(0x18181C))
            d.ellipse([cx - 4, 32, cx + 4, 40], fill=rgb(0xA8A8B0))
            d.point((cx, 36), fill=rgb(0x505058))
        sheet.paste(outline(img), (i * W, 0))
    sheet.save(os.path.join(OUT, "car.png"))


def gen_fx():
    # iskra uderzenia 3 klatki 16x16
    sheet = Image.new("RGBA", (48, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(sheet)
    for i, r in enumerate((3, 6, 7)):
        cx = i * 16 + 8
        col = rgb(0xFFFFFF) if i == 0 else rgb(0xFFE060) if i == 1 else rgb(0xFF9030)
        for k in range(8):
            a = k * math.pi / 4 + (0.3 if i == 2 else 0)
            r0 = 1 if i < 2 else 4
            d.line([(cx + math.cos(a) * r0, 8 + math.sin(a) * r0), (cx + math.cos(a) * r, 8 + math.sin(a) * r)], fill=col)
        if i == 0:
            d.ellipse([cx - 2, 6, cx + 2, 10], fill=col)
    sheet.save(os.path.join(OUT, "fx_hit.png"))

    # gwiazdki nad glowa 2 klatki 20x8
    sheet = Image.new("RGBA", (40, 10), (0, 0, 0, 0))
    d = ImageDraw.Draw(sheet)
    for i in range(2):
        for k in range(3):
            a = k * 2 * math.pi / 3 + i * 0.9
            x = i * 20 + 10 + math.cos(a) * 7
            y = 5 + math.sin(a) * 2.5
            d.line([(x - 1, y), (x + 1, y)], fill=rgb(0xFFE040))
            d.line([(x, y - 1), (x, y + 1)], fill=rgb(0xFFE040))
    sheet.save(os.path.join(OUT, "fx_stars.png"))

    # cien
    img = Image.new("RGBA", (22, 6), (0, 0, 0, 0))
    ImageDraw.Draw(img).ellipse([0, 0, 21, 5], fill=(0, 0, 0, 90))
    img.save(os.path.join(OUT, "shadow.png"))

    # ikony ! ? i serce/€
    f = font(10)
    for name, ch, col in (("icon_alert", "!", 0xFF3030), ("icon_q", "?", 0xFFE040)):
        img = Image.new("RGBA", (12, 14), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([0, 0, 11, 11], radius=3, fill=rgb(0xFFFFFF))
        d.polygon([(4, 11), (7, 11), (5, 13)], fill=rgb(0xFFFFFF))
        d.fontmode = "1"
        d.text((6, 6), ch, fill=rgb(col), font=font(12), anchor="mm")
        outline(img).save(os.path.join(OUT, f"{name}.png"))

    # moneta euro
    img = Image.new("RGBA", (10, 10), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([0, 0, 9, 9], fill=rgb(0xF2C230))
    d.ellipse([1, 1, 8, 8], outline=rgb(0xC89010))
    d.fontmode = "1"
    d.text((5, 5), "€", fill=rgb(0x8A5A00), font=font(8), anchor="mm")
    img.save(os.path.join(OUT, "coin.png"))

    # para z uszu (rage) 2 klatki
    sheet = Image.new("RGBA", (16, 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(sheet)
    d.ellipse([1, 3, 5, 7], fill=(255, 255, 255, 200))
    d.ellipse([3, 0, 7, 4], fill=(255, 255, 255, 160))
    d.ellipse([9, 2, 14, 7], fill=(255, 255, 255, 180))
    d.ellipse([11, 0, 15, 3], fill=(255, 255, 255, 120))
    sheet.save(os.path.join(OUT, "fx_steam.png"))

    # zyla zlosci (anime)
    img = Image.new("RGBA", (9, 9), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = rgb(0xFF2020)
    for (a, b) in (((1, 3), (3, 1)), ((5, 1), (7, 3)), ((1, 5), (3, 7)), ((5, 7), (7, 5))):
        d.line([a, b], fill=r, width=2)
    img.save(os.path.join(OUT, "fx_anger.png"))

    # kurz
    img = Image.new("RGBA", (6, 6), (0, 0, 0, 0))
    ImageDraw.Draw(img).ellipse([0, 0, 5, 5], fill=(220, 210, 190, 200))
    img.save(os.path.join(OUT, "dust.png"))

    # strzalka "dalej"
    img = Image.new("RGBA", (24, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.polygon([(1, 8), (10, 1), (10, 5), (22, 5), (22, 11), (10, 11), (10, 15)], fill=rgb(0xFFE040))
    outline(img).save(os.path.join(OUT, "arrow.png"))

    # piksel
    Image.new("RGBA", (2, 2), (255, 255, 255, 255)).save(os.path.join(OUT, "px.png"))


# ---------------------------------------------------------------------------
# TLA
# ---------------------------------------------------------------------------
BW, BH = 960, 270
SIDEWALK_TOP = 150
CURB_Y = 200
ROAD_Y = 205


def noise_rect(d, rng, box, base, amount=0.08, density=0.25):
    x0, y0, x1, y1 = box
    d.rectangle(box, fill=base)
    n = int((x1 - x0) * (y1 - y0) * density)
    for _ in range(n):
        x = rng.randint(x0, x1)
        y = rng.randint(y0, y1)
        f = 1 + rng.uniform(-amount, amount)
        d.point((x, y), fill=shade(base, f))


def draw_ground(d, rng, night=False):
    k = 0.7 if night else 1.0
    # chodnik - plyty
    side = shade(rgb(0xB8B0A8), k)
    noise_rect(d, rng, (0, SIDEWALK_TOP, BW, CURB_Y), side, 0.06, 0.3)
    line = shade(side, 0.82)
    for y in range(SIDEWALK_TOP, CURB_Y, 12):
        d.line([(0, y), (BW, y)], fill=line)
    for row, y in enumerate(range(SIDEWALK_TOP, CURB_Y, 12)):
        off = 12 if row % 2 else 0
        for x in range(off, BW, 24):
            d.line([(x, y), (x, min(y + 11, CURB_Y))], fill=line)
    # kraweznik
    d.rectangle([0, CURB_Y, BW, CURB_Y + 2], fill=shade(rgb(0xD8D4D0), k))
    d.rectangle([0, CURB_Y + 3, BW, ROAD_Y - 1], fill=shade(rgb(0x8A8480), k))
    # asfalt
    asph = shade(rgb(0x5A5A64), k)
    noise_rect(d, rng, (0, ROAD_Y, BW, BH), asph, 0.12, 0.35)
    for x in range(0, BW, 48):
        d.rectangle([x + 8, 240, x + 32, 241], fill=shade(rgb(0xE8E8E8), k))
    # studzienki
    for x in range(60, BW, 300):
        d.rectangle([x, ROAD_Y + 3, x + 12, ROAD_Y + 7], fill=shade(rgb(0x303038), k))
        for i in range(x + 1, x + 12, 2):
            d.line([(i, ROAD_Y + 4), (i, ROAD_Y + 6)], fill=shade(rgb(0x606068), k))


def window(d, x, y, w, h, frame=0xF4F4F4, glass=0x8CB8D8, lit=False, shutters=None):
    d.rectangle([x - 1, y - 1, x + w, y + h], fill=rgb(frame))
    g = rgb(0xFFE08A) if lit else rgb(glass)
    d.rectangle([x + 1, y + 1, x + w - 2, y + h - 2], fill=g)
    d.line([(x + w // 2, y), (x + w // 2, y + h - 1)], fill=rgb(frame))
    d.line([(x, y + h // 2), (x + w - 1, y + h // 2)], fill=rgb(frame))
    if not lit:
        d.line([(x + 2, y + 2), (x + 4, y + 2)], fill=rgb(0xE8F4FF))
    if shutters is not None:
        d.rectangle([x - 5, y - 1, x - 2, y + h], fill=rgb(shutters))
        d.rectangle([x + w + 1, y - 1, x + w + 4, y + h], fill=rgb(shutters))
        for yy in range(y + 1, y + h, 2):
            d.line([(x - 5, yy), (x - 2, yy)], fill=shade(rgb(shutters), 0.8))
            d.line([(x + w + 1, yy), (x + w + 4, yy)], fill=shade(rgb(shutters), 0.8))


def house(d, rng, x, w, wall, roof, ground=140, floors=2, night=False):
    fh = 34
    top = ground - floors * fh
    noise_rect(d, rng, (x, top, x + w, ground), rgb(wall), 0.03, 0.1)
    d.line([(x, top), (x, ground)], fill=shade(rgb(wall), 0.8))
    d.rectangle([x + w - 3, top, x + w, ground], fill=shade(rgb(wall), 0.85))
    # dach dwuspadowy
    rc = rgb(roof)
    peak = top - 42
    d.polygon([(x - 8, top + 2), (x + w // 2, peak), (x + w + 8, top + 2)], fill=rc)
    for yy in range(peak + 4, top, 4):
        t = (yy - peak) / (top + 2 - peak)
        lx = x + w // 2 - t * (w // 2 + 8)
        rx = x + w // 2 + t * (w // 2 + 8)
        d.line([(lx, yy), (rx, yy)], fill=shade(rc, 0.82))
    d.line([(x - 8, top + 2), (x + w + 8, top + 2)], fill=shade(rc, 0.6), width=2)
    # panele slonczne
    if w > 100 and rng.random() < 0.6:
        px = x + w // 2 + 6
        for i in range(3):
            d.polygon([(px + i * 12, top - 8), (px + i * 12 + 10, top - 8), (px + i * 12 + 8, top - 20), (px + i * 12 - 2, top - 20)], fill=rgb(0x283A68))
            d.line([(px + i * 12 + 4, top - 8), (px + i * 12 + 2, top - 20)], fill=rgb(0x5070A8))
    # komin
    d.rectangle([x + w // 4, peak + 10, x + w // 4 + 8, peak + 26], fill=rgb(0x8A4030))
    # okna
    shut = rng.choice([0x3E6A3A, 0x6A3A2A, 0x3A4A6A, None])
    for f in range(floors):
        wy = top + f * fh + 9
        for wx in range(x + 14, x + w - 22, 34):
            if f == floors - 1 and abs(wx - (x + w // 2 - 8)) < 18:
                continue
            window(d, wx, wy, 16, 16, lit=night and rng.random() < 0.6, shutters=shut)
    # drzwi
    dx = x + w // 2 - 8
    d.rectangle([dx - 2, ground - 28, dx + 17, ground], fill=shade(rgb(wall), 0.8))
    d.rectangle([dx, ground - 26, dx + 15, ground], fill=rgb(0x7A4A28))
    d.rectangle([dx + 2, ground - 24, dx + 13, ground - 16], fill=rgb(0x9CC8E8))
    d.point((dx + 12, ground - 12), fill=rgb(0xF2C230))
    d.rectangle([dx + 18, ground - 22, dx + 22, ground - 18], fill=rgb(0x3A4A6A))  # numer
    return top


def hedge(d, rng, x0, x1, y0, y1, col=0x3E8A3E):
    base = rgb(col)
    d.rectangle([x0, y0 + 3, x1, y1], fill=shade(base, 0.85))
    for x in range(x0, x1, 5):
        r = rng.randint(3, 5)
        d.ellipse([x - r, y0 - r + 4, x + r, y0 + r + 4], fill=base)
    for _ in range((x1 - x0) * 2):
        x = rng.randint(x0, x1)
        y = rng.randint(y0, y1)
        d.point((x, y), fill=shade(base, rng.choice([0.7, 1.25])))


def picket_fence(d, x0, x1, y_bottom, col=0xF4F4F4):
    c = rgb(col)
    d.rectangle([x0, y_bottom - 12, x1, y_bottom - 11], fill=c)
    d.rectangle([x0, y_bottom - 5, x1, y_bottom - 4], fill=c)
    for x in range(x0, x1, 6):
        d.rectangle([x, y_bottom - 16, x + 3, y_bottom], fill=c)
        d.point((x + 1, y_bottom - 17), fill=c)
        d.line([(x + 3, y_bottom - 15), (x + 3, y_bottom)], fill=shade(c, 0.8))


def tree(d, rng, x, ground, h=70, col=0x3E8A3E, night=False):
    k = 0.65 if night else 1
    trunk = shade(rgb(0x6A4428), k)
    d.rectangle([x - 3, ground - h // 2, x + 3, ground], fill=trunk)
    leaf = shade(rgb(col), k)
    for _ in range(14):
        rx = rng.randint(-18, 18)
        ry = rng.randint(-h, -h // 2)
        r = rng.randint(9, 15)
        d.ellipse([x + rx - r, ground + ry - r, x + rx + r, ground + ry + r], fill=shade(leaf, rng.uniform(0.85, 1.15)))


def lamp(d, x, ground, lit=False):
    d.rectangle([x - 1, ground - 70, x + 1, ground], fill=rgb(0x34343C))
    d.rectangle([x - 3, ground - 4, x + 3, ground], fill=rgb(0x34343C))
    d.line([(x, ground - 70), (x + 10, ground - 74)], fill=rgb(0x34343C), width=2)
    d.rectangle([x + 7, ground - 74, x + 15, ground - 71], fill=rgb(0x34343C))
    d.rectangle([x + 8, ground - 71, x + 14, ground - 70], fill=rgb(0xFFF0A0) if lit else rgb(0xD8D8C8))


def text_c(d, xy, s, size, col, anchor="mm"):
    d.fontmode = "1"
    d.text(xy, s, fill=rgb(col), font=font(size), anchor=anchor)


def sign_board(d, x, y, w, h, bg, fg, label, size=9):
    d.rectangle([x, y, x + w, y + h], fill=rgb(bg))
    d.rectangle([x + 1, y + 1, x + w - 1, y + h - 1], outline=rgb(fg))
    text_c(d, (x + w // 2, y + h // 2), label, size, fg)


def gen_level1():
    rng = random.Random(11)
    img = Image.new("RGBA", (BW, BH), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    GROUND_B = 140
    # trawa pod domami
    d.rectangle([0, GROUND_B - 6, BW, SIDEWALK_TOP], fill=rgb(0x5AA048))
    tree(d, rng, 40, GROUND_B, 80)
    house(d, rng, 70, 150, 0xF2E6C8, 0xB8432E)
    tree(d, rng, 250, GROUND_B, 70, 0x4A9A40)
    house(d, rng, 290, 130, 0xE8EEF2, 0x5A5A6A)
    tree(d, rng, 445, GROUND_B, 85)
    house(d, rng, 480, 170, 0xF4D890, 0xA83A2A)  # dom Mullera
    tree(d, rng, 680, GROUND_B, 75, 0x4A9A40)
    house(d, rng, 710, 120, 0xD8E8D0, 0x8A3A2A)
    # ogrodki: zywoplot + plotek
    hedge(d, rng, 0, 70, 132, 150)
    picket_fence(d, 70, 225, 150)
    hedge(d, rng, 225, 290, 130, 150, 0x4A9A40)
    picket_fence(d, 290, 425, 150, 0xE0D0B0)
    hedge(d, rng, 425, 470, 132, 150)
    # ogrod Mullera - niski plotek, kwiaty
    picket_fence(d, 470, 660, 150, 0xF4F4F4)
    for x in range(478, 655, 7):
        d.rectangle([x, 144, x + 2, 146], fill=rgb(rng.choice([0xE03040, 0xF2C230, 0xF070C0, 0xFFFFFF])))
    hedge(d, rng, 660, 710, 130, 150, 0x4A9A40)
    picket_fence(d, 710, 840, 150)
    # skrzynki pocztowe
    for x in (200, 400, 640, 820):
        d.rectangle([x, 128, x + 1, 150], fill=rgb(0x34343C))
        d.rectangle([x - 4, 122, x + 6, 129], fill=rgb(0xF2C230))
        d.line([(x - 3, 125), (x + 5, 125)], fill=rgb(0x303030))
    # znak graniczny z prawej
    d.rectangle([840, GROUND_B - 6, BW, SIDEWALK_TOP], fill=rgb(0x5AA048))
    hedge(d, rng, 840, BW, 136, 150, 0x3E7A3E)
    d.rectangle([872, 64, 874, 150], fill=rgb(0x707078))
    d.rectangle([942, 64, 944, 150], fill=rgb(0x707078))
    d.rectangle([862, 52, 954, 108], fill=rgb(0x1F3F98))
    d.rectangle([864, 54, 952, 106], outline=rgb(0xF4F4F4))
    for k in range(12):
        a = k * math.pi / 6
        sx = 908 + math.cos(a) * 11
        sy = 72 + math.sin(a) * 11
        d.point((sx, sy), fill=rgb(0xF2C230))
        d.point((sx + 1, sy), fill=rgb(0xF2C230))
    text_c(d, (908, 72), "D", 16, 0xF4F4F4)
    text_c(d, (908, 92), "BUNDESREPUBLIK", 10, 0xF4F4F4)
    text_c(d, (908, 100), "DEUTSCHLAND", 10, 0xF4F4F4)
    # tabliczka miejscowosci (zolta)
    d.rectangle([800, 96, 801, 150], fill=rgb(0x707078))
    sign_board(d, 766, 82, 66, 20, 0xF2C230, 0x202020, "Kleinstadt", 12)
    d.rectangle([BW - 2, 0, BW, 0], fill=(0, 0, 0, 0))
    draw_ground(d, rng)
    lamp(d, 130, SIDEWALK_TOP + 2)
    lamp(d, 360, SIDEWALK_TOP + 2)
    lamp(d, 700, SIDEWALK_TOP + 2)
    img.save(os.path.join(OUT, "bg_level1.png"))


def shop(d, rng, x, w, wall, floors, name, awning, sign_col=0x202020, night=False):
    ground = 146
    fh = 30
    top = ground - 46 - (floors - 1) * fh
    noise_rect(d, rng, (x, top, x + w, ground), rgb(wall), 0.04, 0.12)
    d.line([(x, top), (x, ground)], fill=shade(rgb(wall), 0.75))
    d.rectangle([x - 2, top - 6, x + w + 2, top], fill=shade(rgb(wall), 0.7))
    for f in range(floors - 1):
        wy = top + 8 + f * fh
        for wx in range(x + 10, x + w - 16, 26):
            window(d, wx, wy, 14, 18, lit=night and rng.random() < 0.5)
    # witryna
    sy = ground - 46
    sign_board(d, x + 6, sy, w - 12, 12, 0xF4F0E0 if sign_col == 0x202020 else sign_col, 0x202020 if sign_col == 0x202020 else 0xFFFFFF, name, 11)
    # markiza w paski
    ay = sy + 13
    for i, xx in enumerate(range(x + 2, x + w - 2, 8)):
        c = rgb(awning) if i % 2 == 0 else rgb(0xF4F4F4)
        d.polygon([(xx, ay), (xx + 8, ay), (xx + 9, ay + 7), (xx + 1, ay + 7)], fill=c)
    for xx in range(x + 2, x + w - 2, 4):
        d.point((xx + 1, ay + 8), fill=rgb(awning))
    gy = ay + 9
    d.rectangle([x + 6, gy, x + w - 6, ground], fill=rgb(0x34343C))
    d.rectangle([x + 8, gy + 2, x + w - 30, ground - 2], fill=rgb(0xFFE8A8) if night else rgb(0x7AA8C8))
    d.line([(x + 10, gy + 4), (x + 18, gy + 4)], fill=rgb(0xE8F4FF))
    d.rectangle([x + w - 26, gy + 2, x + w - 9, ground], fill=rgb(0x5A3A20))
    d.rectangle([x + w - 24, gy + 4, x + w - 11, gy + 16], fill=rgb(0x9CC8E8))
    # towar na wystawie
    for xx in range(x + 12, x + w - 34, 9):
        d.ellipse([xx, ground - 10, xx + 6, ground - 5], fill=rgb(rng.choice([0xD8A050, 0xC88040, 0xE8C080, 0xD04040, 0x60A050])))


def gen_level2():
    rng = random.Random(22)
    img = Image.new("RGBA", (BW, BH), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    shop(d, rng, 0, 120, 0xD8C8A8, 3, "BÄCKEREI", 0xC03030)
    shop(d, rng, 120, 110, 0xA8C0C8, 4, "APOTHEKE", 0x30A050, 0x30A050)
    shop(d, rng, 230, 140, 0xE8D8B8, 3, "DÖNER KEBAB", 0xE08020, 0xC03030)
    shop(d, rng, 370, 100, 0xC8B0B8, 4, "KIOSK", 0x3050C0)
    shop(d, rng, 470, 150, 0xB8B8A8, 3, "FAHRRÄDER", 0x20A0A0, 0x206060)
    shop(d, rng, 620, 120, 0xE0C890, 4, "BIERGARTEN", 0x3E6A3A, 0x3E6A3A)
    shop(d, rng, 740, 110, 0xC8D0D8, 3, "SPÄTI", 0xA040A0)
    shop(d, rng, 850, 110, 0xD8B8A0, 4, "FRISEUR", 0x3050C0)
    d.rectangle([0, 146, BW, SIDEWALK_TOP], fill=rgb(0x8A8480))
    draw_ground(d, rng)
    # stojak rowerowy
    for x in range(520, 600, 14):
        d.arc([x, 150, x + 10, 166], 180, 360, fill=rgb(0x707078), width=2)
        d.line([(x, 158), (x, 166)], fill=rgb(0x707078), width=2)
        d.line([(x + 10, 158), (x + 10, 166)], fill=rgb(0x707078), width=2)
    # stoliki biergarten
    for x in (640, 690):
        d.rectangle([x, 160, x + 22, 162], fill=rgb(0x7A5030))
        d.line([(x + 3, 162), (x + 3, 172)], fill=rgb(0x7A5030), width=2)
        d.line([(x + 19, 162), (x + 19, 172)], fill=rgb(0x7A5030), width=2)
        d.rectangle([x + 4, 154, x + 7, 159], fill=rgb(0xF2C230))
        d.rectangle([x + 4, 153, x + 7, 154], fill=rgb(0xFFFFFF))
    for x in (100, 420, 790):
        lamp(d, x, SIDEWALK_TOP + 2)
    # przystanek autobusowy
    d.rectangle([300, 120, 360, 122], fill=rgb(0x34343C))
    d.rectangle([302, 122, 304, 158], fill=rgb(0x34343C))
    d.rectangle([356, 122, 358, 158], fill=rgb(0x34343C))
    d.rectangle([306, 124, 354, 150], fill=(160, 200, 220, 120))
    sign_board(d, 362, 118, 14, 14, 0xF2C230, 0x208030, "H", 10)
    img.save(os.path.join(OUT, "bg_level2.png"))


def villa(d, rng, x, w, ground=146):
    wall = rgb(0xEDEDE8)
    top = ground - 86
    d.rectangle([x, top + 30, x + w, ground], fill=wall)
    d.rectangle([x + 20, top, x + w - 40, top + 30], fill=wall)
    d.rectangle([x - 4, top + 26, x + w + 4, top + 30], fill=rgb(0x505058))
    d.rectangle([x + 16, top - 4, x + w - 36, top], fill=rgb(0x505058))
    d.rectangle([x, top + 30, x + 3, ground], fill=shade(wall, 0.85))
    # duze okna
    d.rectangle([x + 28, top + 6, x + w - 50, top + 24], fill=rgb(0xFFD880))
    for xx in range(x + 40, x + w - 50, 16):
        d.line([(xx, top + 6), (xx, top + 24)], fill=rgb(0x303038))
    d.rectangle([x + 10, top + 40, x + w - 60, ground - 4], fill=rgb(0xFFD880))
    for xx in range(x + 24, x + w - 60, 18):
        d.line([(xx, top + 40), (xx, ground - 4)], fill=rgb(0x303038))
    # garaz
    d.rectangle([x + w - 52, top + 46, x + w - 6, ground], fill=rgb(0x707078))
    for yy in range(top + 50, ground, 5):
        d.line([(x + w - 50, yy), (x + w - 8, yy)], fill=rgb(0x5A5A62))
    # drewno
    d.rectangle([x + w - 40, top + 4, x + w - 6, top + 26], fill=rgb(0x8A5A34))
    for xx in range(x + w - 40, x + w - 6, 3):
        d.line([(xx, top + 4), (xx, top + 26)], fill=rgb(0x7A4A28))


def gen_level3():
    rng = random.Random(33)
    img = Image.new("RGBA", (BW, BH), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 130, BW, SIDEWALK_TOP], fill=rgb(0x3A6A38))
    tree(d, rng, 30, 140, 90, 0x2E5A30, True)
    villa(d, rng, 60, 220)
    tree(d, rng, 310, 140, 80, 0x2E5A30, True)
    villa(d, rng, 350, 200)
    tree(d, rng, 580, 140, 95, 0x2E5A30, True)
    villa(d, rng, 620, 240)
    tree(d, rng, 900, 140, 85, 0x2E5A30, True)
    # murek + brama
    for x0, x1 in ((0, 140), (200, 470), (530, 760), (820, BW)):
        d.rectangle([x0, 134, x1, 150], fill=rgb(0xC8C0B0))
        d.rectangle([x0, 132, x1, 134], fill=rgb(0x8A8478))
        for x in range(x0, x1, 18):
            d.line([(x, 134), (x, 150)], fill=rgb(0xA8A090))
    for gx in (140, 470, 760):
        for x in range(gx + 2, gx + 60, 5):
            d.line([(x, 118), (x, 150)], fill=rgb(0x202024), width=2)
            d.point((x, 116), fill=rgb(0xC8A040))
        d.line([(gx, 126), (gx + 60, 126)], fill=rgb(0x202024), width=2)
    d.rectangle([820, 120, 830, 150], fill=rgb(0x8A8478))
    draw_ground(d, rng, night=True)
    for x in (90, 330, 600, 880):
        lamp(d, x, SIDEWALK_TOP + 2, lit=True)
    img.save(os.path.join(OUT, "bg_level3.png"))


def gen_far():
    """Warstwy dalekie (paralaksa) - 480x270, kafelkowalne poziomo."""
    W = 480
    cfg = [
        ("far1", (0x8FD0F8, 0xD8F0FF), 0x9CC0A0, False),
        ("far2", (0xF8A060, 0xFFE0A8), 0xB09080, False),
        ("far3", (0x2A1E50, 0x8A4A88), 0x302848, True),
    ]
    for name, (top, bot), sil, night in cfg:
        rng = random.Random(zlib.crc32(name.encode()) & 0xFFFF)
        img = Image.new("RGBA", (W, BH), (0, 0, 0, 255))
        d = ImageDraw.Draw(img)
        t, b = rgb(top), rgb(bot)
        for y in range(BH):
            f = min(1, y / 160)
            c = tuple(int(t[i] + (b[i] - t[i]) * f) for i in range(3)) + (255,)
            d.line([(0, y), (W, y)], fill=c)
        if night:
            for _ in range(70):
                x, y = rng.randint(0, W - 1), rng.randint(0, 110)
                d.point((x, y), fill=rgb(0xFFFFFF) if rng.random() < 0.5 else rgb(0xC8C8FF))
            d.ellipse([380, 20, 400, 40], fill=rgb(0xF4F0D8))
            d.ellipse([386, 18, 404, 36], fill=c if False else rgb(top))
        elif name == "far2":
            d.ellipse([60, 70, 100, 110], fill=rgb(0xFFF0B0))
        else:
            d.ellipse([400, 20, 424, 44], fill=rgb(0xFFF8C0))
        # chmury
        if not night:
            for _ in range(5):
                cx, cy = rng.randint(0, W), rng.randint(15, 70)
                for k in range(5):
                    r = rng.randint(6, 12)
                    ox = k * 8 - 16
                    for dx in (-W, 0, W):
                        d.ellipse([cx + ox - r + dx, cy - r // 2 - rng.randint(0, 4), cx + ox + r + dx, cy + r // 2], fill=(255, 255, 255, 255))
        # sylwetka miasta / wzgorz
        s = rgb(sil)
        x = 0
        while x < W:
            bw = rng.randint(14, 40)
            bh = rng.randint(20, 70)
            d.rectangle([x, 140 - bh, x + bw, 150], fill=s)
            if rng.random() < 0.3:
                d.rectangle([x + bw // 2 - 1, 140 - bh - 12, x + bw // 2 + 1, 140 - bh], fill=s)
            if night:
                for _ in range(bw * bh // 120):
                    d.point((rng.randint(x + 2, x + bw - 2), rng.randint(140 - bh + 3, 145)), fill=rgb(0xFFE08A))
            x += bw
        s2 = shade(s, 0.85)
        for xx in range(0, W, 2):
            hh = 10 + 6 * math.sin(xx / 30) + 4 * math.sin(xx / 11)
            d.line([(xx, 150 - hh), (xx, 150)], fill=s2)
            d.line([(xx + 1, 150 - hh), (xx + 1, 150)], fill=s2)
        img.save(os.path.join(OUT, f"bg_{name}.png"))


def gen_title():
    """Logotypy na ekran tytulowy (PL / EN / RO)."""
    variants = {
        "title": (("UNIA", 34), ("POLSKO-RUMUŃSKA", 34)),
        "title_en": (("POLISH-ROMANIAN", 34), ("UNION", 34)),
        "title_ro": (("UNIUNEA", 34), ("POLONO-ROMÂNĂ", 34)),
    }
    for name, ((l1, s1), (l2, s2)) in variants.items():
        img = Image.new("RGBA", (480, 120), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.fontmode = "1"
        for (txt, size), y, col, shadow in (((l1, s1), 34, 0xFFFFFF, 0xD8263A), ((l2, s2), 80, 0xF2C230, 0x1F3F98)):
            f = font(size)
            for ox, oy in ((-2, 0), (2, 0), (0, -2), (0, 2), (2, 2), (3, 3)):
                d.text((240 + ox, y + oy), txt, fill=rgb(shadow if (ox, oy) in ((2, 2), (3, 3)) else 0x181020), font=f, anchor="mm")
            d.text((240, y), txt, fill=rgb(col), font=f, anchor="mm")
        img.save(os.path.join(OUT, f"{name}.png"))


if __name__ == "__main__":
    gen_characters()
    gen_gnome()
    gen_bike()
    gen_car()
    gen_fx()
    gen_level1()
    gen_level2()
    gen_level3()
    gen_far()
    gen_title()
    print("OK ->", OUT)
