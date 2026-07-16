#!/usr/bin/env python3
"""Author the tracked Lucky Cat Android launcher and splash resource pack.

This is an authoring tool, not a release-build dependency. It derives every
bitmap from the tracked PWA icon and writes the result to native/android-res/.
Release builds copy that checked-in pack with sync-android-branding.mjs, so a
clean checkout cannot silently fall back to Capacitor's default artwork.
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "pwa" / "icons" / "icon-512.png"
OUT = ROOT / "native" / "android-res"
SPLASH_BG = (26, 13, 13, 255)  # dark brand surround for the centered mark

LAUNCHER = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
ADAPTIVE = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}


def resized(source: Image.Image, size: int) -> Image.Image:
    return source.resize((size, size), Image.Resampling.LANCZOS)


def adaptive_foreground(source: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    # Android adaptive icons retain only the central safe zone. Keeping the
    # complete cat badge at 72% avoids clipping the ears, paw, and HSK label.
    mark_size = round(size * 0.72)
    mark = resized(source, mark_size)
    offset = (size - mark_size) // 2
    canvas.alpha_composite(mark, (offset, offset))
    return canvas


def splash(source: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", (1080, 1920), SPLASH_BG)
    mark = resized(source, 380)
    canvas.alpha_composite(mark, ((canvas.width - mark.width) // 2, (canvas.height - mark.height) // 2))
    return canvas


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"missing Lucky Cat icon source: {SOURCE}")
    source = Image.open(SOURCE).convert("RGBA")

    for dens, px in LAUNCHER.items():
        folder = OUT / f"mipmap-{dens}"
        folder.mkdir(parents=True, exist_ok=True)
        icon = resized(source, px)
        icon.save(folder / "ic_launcher.png", optimize=True)
        icon.save(folder / "ic_launcher_round.png", optimize=True)
        adaptive_foreground(source, ADAPTIVE[dens]).save(
            folder / "ic_launcher_foreground.png", optimize=True
        )

    values = OUT / "values"
    values.mkdir(parents=True, exist_ok=True)
    (values / "ic_launcher_background.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<resources>\n  <color name="ic_launcher_background">#8F181D</color>\n</resources>\n',
        encoding="utf-8",
    )

    adaptive = OUT / "mipmap-anydpi-v26"
    adaptive.mkdir(parents=True, exist_ok=True)
    xml = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '  <background android:drawable="@color/ic_launcher_background"/>\n'
        '  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
        '</adaptive-icon>\n'
    )
    (adaptive / "ic_launcher.xml").write_text(xml, encoding="utf-8")
    (adaptive / "ic_launcher_round.xml").write_text(xml, encoding="utf-8")

    drawable = OUT / "drawable-nodpi"
    drawable.mkdir(parents=True, exist_ok=True)
    splash(source).save(drawable / "splash.png", optimize=True)
    print("Lucky Cat Android branding authored in", OUT)


if __name__ == "__main__":
    main()
