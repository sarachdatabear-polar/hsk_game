#!/usr/bin/env python3
"""Generate Android launcher-icon + splash resources from the bear tile.
Run AFTER `npx cap add android`; writes into the generated android/ tree."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
RES = ROOT / "android" / "app" / "src" / "main" / "res"
BG = (38, 51, 38, 255)      # #263326-ish dark green
FG = (126, 200, 80, 255)    # NorthBear green
YAHEI = "C:/Windows/Fonts/msyhbd.ttc"   # Microsoft YaHei Bold (a .ttc collection on this machine)

# density -> launcher icon px (legacy square) and adaptive layer px (108dp bucket)
LAUNCHER = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
ADAPTIVE = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}


def bear(size, pad_ratio):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(YAHEI, int(size * (1 - pad_ratio)))
    d.text((size / 2, size / 2), "熊", font=f, fill=FG, anchor="mm")
    return img


for dens, px in LAUNCHER.items():
    out = RES / f"mipmap-{dens}"
    out.mkdir(parents=True, exist_ok=True)
    tile = Image.new("RGBA", (px, px), BG)
    tile.alpha_composite(bear(px, 0.32))
    tile.save(out / "ic_launcher.png")
    tile.save(out / "ic_launcher_round.png")
    # adaptive foreground (transparent, extra safe-zone padding)
    fg = bear(ADAPTIVE[dens], 0.45)
    fg.save(out / "ic_launcher_foreground.png")

# solid adaptive background color
val = RES / "values"
val.mkdir(parents=True, exist_ok=True)
(val / "ic_launcher_background.xml").write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
    '  <color name="ic_launcher_background">#263326</color>\n</resources>\n', encoding="utf-8")
# adaptive icon xml (mipmap-anydpi-v26)
adp = RES / "mipmap-anydpi-v26"
adp.mkdir(parents=True, exist_ok=True)
xml = ('<?xml version="1.0" encoding="utf-8"?>\n'
       '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
       '  <background android:drawable="@color/ic_launcher_background"/>\n'
       '  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n')
(adp / "ic_launcher.xml").write_text(xml, encoding="utf-8")
(adp / "ic_launcher_round.xml").write_text(xml, encoding="utf-8")

# splash: full-screen dark-green with centered bear (portrait 1080x1920 downscaled by Android)
draw = RES / "drawable"
draw.mkdir(parents=True, exist_ok=True)
sp = Image.new("RGBA", (1080, 1920), (20, 26, 20, 255))  # #141a14
sp.alpha_composite(bear(560, 0.15), (int((1080 - 560) / 2), int((1920 - 560) / 2)))
sp.save(draw / "splash.png")
print("icons + splash written to", RES)
