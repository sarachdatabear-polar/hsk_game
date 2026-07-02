#!/usr/bin/env python3
"""Generate PWA icons: green rounded square, white 熊 glyph (Microsoft YaHei)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent / "pwa" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

for size in (192, 512):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=size // 5, fill=(38, 51, 38))
    font = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", int(size * 0.55))
    d.text((size / 2, size / 2 - size * 0.04), "熊", font=font, fill=(126, 200, 80), anchor="mm")
    d.text((size / 2, size * 0.86), "HSK", fill=(255, 179, 71), anchor="mm",
           font=ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", int(size * 0.14)))
    img.save(OUT / f"icon-{size}.png")
    print("wrote", f"icon-{size}.png")
