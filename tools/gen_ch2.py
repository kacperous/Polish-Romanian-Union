"""Grafiki Rozdzialu II: przedmioty z ulicy (bronie i rzucane).

Uruchom:  python3 tools/gen_ch2.py   (albo: npm run assets)
Korzysta z pomocnikow z gen_sprites.py.
"""
import os

from PIL import Image, ImageDraw

from gen_sprites import OUT, outline, rgb, shade


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


if __name__ == "__main__":
    gen_items()
    print("OK ->", OUT)
