#!/usr/bin/env python3
"""Generate the festive red & gold 'Lucky Cat HSK' art assets into game/assets/.

Programmatic vector-style art (Pillow + numpy). Everything is drawn supersampled
and downscaled with LANCZOS for smooth, antialiased edges. Re-runnable.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "assets"
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "fonts").mkdir(parents=True, exist_ok=True)

# ---- palette ----
CRIMSON    = (193, 39, 45)
CRIMSON_DK = (139, 26, 30)
CRIMSON_LT = (232, 78, 68)
GOLD       = (245, 197, 24)
GOLD_LT    = (255, 231, 150)
GOLD_MID   = (227, 168, 14)
GOLD_DK    = (156, 107, 0)
INK        = (26, 13, 13)
CREAM      = (255, 244, 224)
GINGER     = (232, 145, 58)
GINGER_DK  = (196, 112, 38)
PINK       = (240, 150, 150)

SS = 4  # supersample factor for small assets

def font(path, size):
    return ImageFont.truetype(path, size)

MSYH   = "C:/Windows/Fonts/msyhbd.ttc"
SEGB   = "C:/Windows/Fonts/segoeuib.ttf"

def new(w, h):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))

def down(img, w, h):
    return img.resize((w, h), Image.LANCZOS)

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

# ---------- gradient helpers (numpy) ----------
def vgrad(w, h, stops):
    """Vertical gradient. stops = [(pos0..1, (r,g,b)), ...]. Returns RGB ndarray."""
    ys = np.linspace(0, 1, h)
    cols = np.zeros((h, 3))
    ps = [s[0] for s in stops]
    for i, y in enumerate(ys):
        # find segment
        for j in range(len(stops) - 1):
            if ps[j] <= y <= ps[j + 1]:
                t = (y - ps[j]) / (ps[j + 1] - ps[j] + 1e-9)
                cols[i] = [stops[j][1][k] + (stops[j + 1][1][k] - stops[j][1][k]) * t for k in range(3)]
                break
        else:
            cols[i] = stops[-1][1]
    arr = np.repeat(cols[:, None, :], w, axis=1)
    return arr

def radial_rgb(w, h, cx, cy, r, c_in, c_out, power=1.0):
    y, x = np.ogrid[0:h, 0:w]
    d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / r
    d = np.clip(d, 0, 1) ** power
    out = np.zeros((h, w, 3))
    for i in range(3):
        out[..., i] = c_in[i] * (1 - d) + c_out[i] * d
    return out, np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / r

def arr_to_img(arr):
    return Image.fromarray(arr.astype("uint8"), "RGB").convert("RGBA")

# =========================================================
# COIN
# =========================================================
def make_coin():
    s = 128 * SS
    rgb, d = radial_rgb(s, s, s * 0.42, s * 0.40, s * 0.52, GOLD_LT, GOLD_DK, power=1.1)
    img = arr_to_img(rgb)
    # circular alpha
    alpha = new(s, s)
    ad = ImageDraw.Draw(alpha)
    ad.ellipse([0, 0, s - 1, s - 1], fill=(0, 0, 0, 255))
    img.putalpha(alpha.split()[3])
    dr = ImageDraw.Draw(img)
    # rim rings
    dr.ellipse([s*0.04, s*0.04, s*0.96, s*0.96], outline=GOLD_MID + (255,), width=int(s*0.03))
    dr.ellipse([s*0.13, s*0.13, s*0.87, s*0.87], outline=GOLD_DK + (180,), width=int(s*0.018))
    # square hole (方孔)
    hs = s * 0.16
    c = s / 2
    dr.rectangle([c - hs, c - hs, c + hs, c + hs], fill=(58, 30, 8, 255))
    dr.rectangle([c - hs, c - hs, c + hs, c + hs], outline=GOLD_DK + (255,), width=int(s*0.015))
    # four tiny chars around the hole
    f = font(MSYH, int(s * 0.14))
    for ch, (dx, dy) in zip("福寿双全", [(0, -0.30), (0.30, 0), (0, 0.30), (-0.30, 0)]):
        dr.text((c + dx * s, c + dy * s), ch, font=f, fill=(120, 80, 20, 255), anchor="mm")
    # shine highlight
    sh = new(s, s)
    ImageDraw.Draw(sh).ellipse([s*0.20, s*0.14, s*0.52, s*0.34], fill=(255, 255, 255, 90))
    img = Image.alpha_composite(img, sh.filter(ImageFilter.GaussianBlur(s*0.01)))
    down(img, 128, 128).save(OUT / "coin.png")

# =========================================================
# LANTERN
# =========================================================
def make_lantern():
    w, h = 256 * SS, 384 * SS
    img = new(w, h)
    dr = ImageDraw.Draw(img)
    cx = w / 2
    top = h * 0.14
    bot = h * 0.80
    # top hanger
    dr.line([cx, h*0.02, cx, top], fill=GOLD_DK + (255,), width=int(w*0.02))
    dr.rectangle([cx - w*0.16, top - h*0.02, cx + w*0.16, top + h*0.03], fill=GOLD + (255,))
    # body: red barrel with side shading via radial
    body = radial_rgb(w, h, cx, (top+bot)/2, w*0.62, CRIMSON_LT, CRIMSON_DK, power=1.3)[0]
    body_img = arr_to_img(body)
    mask = new(w, h)
    ImageDraw.Draw(mask).ellipse([cx - w*0.44, top, cx + w*0.44, bot], fill=(0,0,0,255))
    img.paste(body_img, (0, 0), mask.split()[3])
    dr = ImageDraw.Draw(img)
    # vertical ribs
    for fx in (-0.28, -0.15, 0, 0.15, 0.28):
        x = cx + fx * w
        dr.arc([x - abs(fx)*w*0.5 - w*0.02, top, x + abs(fx)*w*0.5 + w*0.02, bot],
               0, 360, fill=(150, 20, 24, 120), width=int(w*0.006))
    dr.line([cx, top, cx, bot], fill=(255, 220, 160, 90), width=int(w*0.01))
    # gold caps
    dr.rectangle([cx - w*0.20, top - h*0.01, cx + w*0.20, top + h*0.05], fill=GOLD + (255,))
    dr.rectangle([cx - w*0.20, top - h*0.01, cx + w*0.20, top + h*0.05], outline=GOLD_DK + (255,), width=int(w*0.008))
    dr.rectangle([cx - w*0.20, bot - h*0.05, cx + w*0.20, bot + h*0.01], fill=GOLD + (255,))
    dr.rectangle([cx - w*0.20, bot - h*0.05, cx + w*0.20, bot + h*0.01], outline=GOLD_DK + (255,), width=int(w*0.008))
    # 福 on the body
    dr.text((cx, (top+bot)/2), "福", font=font(MSYH, int(w*0.34)), fill=GOLD_LT + (255,), anchor="mm")
    # tassel
    ty = bot
    dr.rectangle([cx - w*0.05, ty, cx + w*0.05, ty + h*0.02], fill=GOLD_DK + (255,))
    for fx in (-0.06, -0.03, 0, 0.03, 0.06):
        dr.line([cx + fx*w, ty + h*0.02, cx + fx*w*2.4, h*0.98], fill=GOLD + (255,), width=int(w*0.012))
    down(img, 256, 384).save(OUT / "lantern.png")

# =========================================================
# CLOUD (祥云)
# =========================================================
def make_cloud():
    w, h = 512 * SS, 256 * SS
    # build the silhouette mask first
    mask = Image.new("L", (w, h), 0)
    md = ImageDraw.Draw(mask)
    bumps = [(0.20, 0.50, 0.15), (0.36, 0.40, 0.19), (0.52, 0.38, 0.21),
             (0.68, 0.42, 0.18), (0.82, 0.50, 0.14), (0.50, 0.55, 0.24)]
    for fx, fy, fr in bumps:
        x, y, r = fx*w, fy*h, fr*w
        md.ellipse([x-r, y-r, x+r, y+r], fill=255)
    md.rectangle([w*0.16, h*0.50, w*0.84, h*0.66], fill=255)
    # spiral curl ends (donut shapes)
    for sx in (0.15, 0.85):
        cx, cy = sx*w, h*0.55
        md.ellipse([cx-w*0.075, cy-w*0.075, cx+w*0.075, cy+w*0.075], fill=255)
        md.ellipse([cx-w*0.032, cy-w*0.032, cx+w*0.032, cy+w*0.032], fill=0)
    # gold gradient fill, masked
    fill = arr_to_img(vgrad(w, h, [(0, GOLD_LT), (1, GOLD_MID)]))
    img = new(w, h)
    img.paste(fill, (0, 0), mask)
    # dark-gold outline = mask minus eroded mask
    eroded = mask.filter(ImageFilter.MinFilter(int(w*0.018) | 1))
    edge = Image.eval(Image.composite(Image.new("L", (w, h), 0), mask, eroded), lambda p: p)
    edge = Image.fromarray((np.array(mask).astype(int) - np.array(eroded).astype(int)).clip(0, 255).astype("uint8"))
    ol = new(w, h)
    ol.paste(Image.new("RGBA", (w, h), GOLD_DK + (255,)), (0, 0), edge)
    img = Image.alpha_composite(img, ol)
    # inner swirl detail lines
    dr = ImageDraw.Draw(img)
    for sx, dirn in [(0.15, 1), (0.85, -1)]:
        cx, cy = sx*w, h*0.55
        for k in range(2):
            rr = w*0.05 - k*w*0.018
            dr.arc([cx-rr, cy-rr, cx+rr, cy+rr], 0, 300, fill=GOLD_DK + (220,), width=int(w*0.008))
    down(img, 512, 256).save(OUT / "cloud.png")

# =========================================================
# GOLD ICON BUTTONS
# =========================================================
def gold_disc(s):
    rgb, d = radial_rgb(s, s, s*0.38, s*0.32, s*0.62, GOLD_LT, GOLD_MID, power=0.9)
    img = arr_to_img(rgb)
    alpha = new(s, s)
    ImageDraw.Draw(alpha).ellipse([s*0.03, s*0.03, s*0.97, s*0.97], fill=(0,0,0,255))
    img.putalpha(alpha.split()[3])
    dr = ImageDraw.Draw(img)
    dr.ellipse([s*0.03, s*0.03, s*0.97, s*0.97], outline=GOLD_DK + (255,), width=int(s*0.05))
    dr.arc([s*0.14, s*0.10, s*0.86, s*0.86], 200, 340, fill=(255,255,255,120), width=int(s*0.03))
    return img

def make_buttons():
    s = 160 * SS
    glyph = INK + (255,)
    specs = {}

    def cards(dr):
        dr.rounded_rectangle([s*0.30, s*0.34, s*0.62, s*0.70], radius=int(s*0.04), fill=glyph)
        dr.rounded_rectangle([s*0.40, s*0.28, s*0.72, s*0.64], radius=int(s*0.04),
                             fill=CREAM + (255,), outline=glyph, width=int(s*0.03))
    def trophy(dr):
        dr.pieslice([s*0.34, s*0.28, s*0.66, s*0.60], 0, 180, fill=glyph)
        dr.rectangle([s*0.34, s*0.28, s*0.66, s*0.44], fill=glyph)
        dr.arc([s*0.24, s*0.30, s*0.42, s*0.52], 90, 270, fill=glyph, width=int(s*0.035))
        dr.arc([s*0.58, s*0.30, s*0.76, s*0.52], 270, 90, fill=glyph, width=int(s*0.035))
        dr.rectangle([s*0.46, s*0.56, s*0.54, s*0.66], fill=glyph)
        dr.rectangle([s*0.38, s*0.66, s*0.62, s*0.72], fill=glyph)
    def chart(dr):
        for i, hf in enumerate((0.16, 0.26, 0.38)):
            x = s*0.34 + i*s*0.13
            dr.rounded_rectangle([x, s*0.68 - hf*s, x + s*0.10, s*0.68], radius=int(s*0.015), fill=glyph)
    def question(dr):
        dr.text((s/2, s*0.47), "?", font=font(SEGB, int(s*0.5)), fill=glyph, anchor="mm")
    def bell(dr):
        dr.pieslice([s*0.32, s*0.28, s*0.68, s*0.66], 180, 360, fill=glyph)
        dr.rectangle([s*0.32, s*0.46, s*0.68, s*0.64], fill=glyph)
        dr.rectangle([s*0.28, s*0.62, s*0.72, s*0.68], fill=glyph)
        dr.ellipse([s*0.46, s*0.68, s*0.54, s*0.76], fill=glyph)
        dr.ellipse([s*0.47, s*0.22, s*0.53, s*0.30], fill=glyph)

    icons = {"btn-learn": cards, "btn-scores": trophy, "btn-progress": chart,
             "btn-howto": question, "btn-sound": bell}
    for name, draw_fn in icons.items():
        img = gold_disc(s)
        draw_fn(ImageDraw.Draw(img))
        down(img, 160, 160).save(OUT / f"{name}.png")

# =========================================================
# MANEKI (sitting lucky cat)  — reused for pwa icon
# =========================================================
def draw_maneki(img, s, ox=0, oy=0, scale=1.0):
    dr = ImageDraw.Draw(img)
    def P(fx, fy):
        return (ox + (0.5 + (fx-0.5)*scale)*s, oy + (0.5 + (fy-0.5)*scale)*s)
    white = (250, 248, 244, 255)
    outline = (60, 40, 40, 255)
    ow = max(2, int(s*0.010*scale))
    # body (sitting trapezoid/rounded)
    bx0, by0 = P(0.24, 0.52); bx1, by1 = P(0.76, 0.95)
    dr.rounded_rectangle([bx0, by0, bx1, by1], radius=int(s*0.16*scale), fill=white, outline=outline, width=ow)
    # head
    hx, hy, hr = P(0.5, 0.40)[0], P(0.5, 0.40)[1], s*0.20*scale
    # ears
    for sgn in (-1, 1):
        ex = hx + sgn*hr*0.75
        dr.polygon([(ex - hr*0.35, hy - hr*0.55), (ex + hr*0.35, hy - hr*0.55), (ex + sgn*hr*0.1, hy - hr*1.15)],
                   fill=white, outline=outline)
        dr.polygon([(ex - hr*0.16, hy - hr*0.62), (ex + hr*0.16, hy - hr*0.62), (ex + sgn*hr*0.06, hy - hr*1.0)],
                   fill=PINK + (255,))
    dr.ellipse([hx-hr, hy-hr, hx+hr, hy+hr], fill=white, outline=outline, width=ow)
    # eyes (happy) + nose + whiskers
    for sgn in (-1, 1):
        ex = hx + sgn*hr*0.42
        dr.arc([ex-hr*0.22, hy-hr*0.34, ex+hr*0.22, hy+hr*0.10], 200, 340, fill=outline, width=max(2,int(ow*1.2)))
        # blush
        dr.ellipse([ex-hr*0.20, hy+hr*0.12, ex+hr*0.20, hy+hr*0.30], fill=(255,170,170,150))
    dr.polygon([(hx-hr*0.12, hy+hr*0.10),(hx+hr*0.12, hy+hr*0.10),(hx, hy+hr*0.26)], fill=(230,120,120,255))
    dr.arc([hx-hr*0.28, hy+hr*0.16, hx, hy+hr*0.44], 300, 360, fill=outline, width=ow)
    dr.arc([hx, hy+hr*0.16, hx+hr*0.28, hy+hr*0.44], 180, 240, fill=outline, width=ow)
    for sgn in (-1, 1):
        for wy in (0.12, 0.22):
            dr.line([hx+sgn*hr*0.5, hy+hr*wy, hx+sgn*hr*1.15, hy+hr*(wy-0.06)], fill=outline, width=max(1,ow//2))
    # collar + bell
    cy = P(0.5, 0.56)[1]
    dr.arc([hx-hr*0.9, cy-hr*0.5, hx+hr*0.9, cy+hr*0.6], 20, 160, fill=CRIMSON + (255,), width=int(s*0.03*scale))
    dr.ellipse([hx-hr*0.16, cy+hr*0.05, hx+hr*0.16, cy+hr*0.37], fill=GOLD + (255,), outline=GOLD_DK+(255,), width=ow)
    # raised left paw (cat's right)
    px, py = P(0.30, 0.52)
    dr.ellipse([px-s*0.09*scale, py-s*0.14*scale, px+s*0.09*scale, py+s*0.04*scale], fill=white, outline=outline, width=ow)
    # resting paw
    qx, qy = P(0.66, 0.86)
    dr.ellipse([qx-s*0.08*scale, qy-s*0.06*scale, qx+s*0.08*scale, qy+s*0.08*scale], fill=white, outline=outline, width=ow)
    # gold coin (小判) on belly
    gx, gy = P(0.5, 0.76)
    dr.ellipse([gx-s*0.15*scale, gy-s*0.09*scale, gx+s*0.15*scale, gy+s*0.09*scale], fill=GOLD+(255,), outline=GOLD_DK+(255,), width=ow)
    dr.text((gx, gy), "福", font=font(MSYH, int(s*0.11*scale)), fill=CRIMSON_DK+(255,), anchor="mm")

def make_maneki():
    s = 512 * SS
    img = new(s, s)
    draw_maneki(img, s, scale=0.92)
    down(img, 512, 512).save(OUT / "maneki.png")

# =========================================================
# WALKING CAT (side view) — 6-frame strip
# =========================================================
def draw_side_cat(img, fs, phase, celebrate=False, hop=0.0):
    """Draw one cat frame centered in an fs x fs tile (supersampled)."""
    dr = ImageDraw.Draw(img)
    outline = (110, 55, 20, 255)
    ow = max(2, int(fs*0.012))
    cx, cy = fs*0.52, fs*0.60 - hop*fs
    body_w, body_h = fs*0.44, fs*0.30
    # tail (sways with phase)
    tsw = np.sin(phase) * fs*0.06
    dr.line([cx+body_w*0.4, cy, cx+body_w*0.7, cy-body_h*0.9 + tsw, cx+body_w*0.9, cy-body_h*1.3 - tsw],
            fill=GINGER + (255,), width=int(fs*0.05), joint="curve")
    # body
    dr.rounded_rectangle([cx-body_w*0.5, cy-body_h*0.5, cx+body_w*0.5, cy+body_h*0.5],
                         radius=int(fs*0.10), fill=GINGER + (255,), outline=outline, width=ow)
    # legs (walk cycle) — two pairs, swing opposite
    leg_y = cy + body_h*0.45
    sw = np.sin(phase) * fs*0.07
    for lx, s2 in [(-0.32, 1), (-0.16, -1), (0.16, 1), (0.30, -1)]:
        x = cx + lx*body_w
        dr.line([x, leg_y, x + s2*sw, leg_y + fs*0.16], fill=GINGER_DK + (255,), width=int(fs*0.045))
    # head (facing left)
    hx, hy, hr = cx - body_w*0.55, cy - body_h*0.35, fs*0.15
    dr.ellipse([hx-hr, hy-hr, hx+hr, hy+hr], fill=GINGER + (255,), outline=outline, width=ow)
    # ears
    for sgn in (-0.6, 0.5):
        ex = hx + sgn*hr
        dr.polygon([(ex-hr*0.3, hy-hr*0.7),(ex+hr*0.3, hy-hr*0.7),(ex, hy-hr*1.3)], fill=GINGER+(255,), outline=outline)
    # face
    if celebrate:
        dr.arc([hx-hr*0.7, hy-hr*0.4, hx-hr*0.1, hy+hr*0.2], 200, 340, fill=outline, width=ow)  # ^ eye
    else:
        dr.ellipse([hx-hr*0.5, hy-hr*0.2, hx-hr*0.3, hy+hr*0.05], fill=(30,20,10,255))
    dr.polygon([(hx-hr*0.95, hy+hr*0.1),(hx-hr*0.75, hy+hr*0.1),(hx-hr*0.85, hy+hr*0.28)], fill=(230,120,120,255))
    dr.ellipse([hx-hr*0.30, hy+hr*0.25, hx+hr*0.10, hy+hr*0.45], fill=(255,255,255,60))
    return cx, cy, body_w, body_h

def make_cat_walk():
    fs = 256 * SS
    frames = 6
    strip = new(fs*frames, fs)
    for i in range(frames):
        tile = new(fs, fs)
        phase = i / frames * 2*np.pi
        cx, cy, bw, bh = draw_side_cat(tile, fs, phase, hop=abs(np.sin(phase))*0.01)
        dr = ImageDraw.Draw(tile)
        # 福 flag over the shoulder
        px, py = cx+bw*0.2, cy-bh*0.5
        dr.line([px, py, px+fs*0.02, py-fs*0.34], fill=(120,80,40,255), width=int(fs*0.02))
        fx0, fy0 = px+fs*0.02, py-fs*0.34
        dr.polygon([(fx0, fy0),(fx0+fs*0.20, fy0+fs*0.03),(fx0, fy0+fs*0.16)], fill=CRIMSON+(255,), outline=CRIMSON_DK+(255,))
        dr.text((fx0+fs*0.06, fy0+fs*0.06), "福", font=font(MSYH, int(fs*0.09)), fill=GOLD_LT+(255,), anchor="mm")
        strip.paste(tile, (i*fs, 0))
    down(strip, 256*frames, 256).save(OUT / "cat-walk.png")

def make_cat_happy():
    fs = 256 * SS
    frames = 4
    strip = new(fs*frames, fs)
    for i in range(frames):
        tile = new(fs, fs)
        hop = (0.0, 0.05, 0.08, 0.05)[i]
        cx, cy, bw, bh = draw_side_cat(tile, fs, np.pi*0.5, celebrate=True, hop=hop)
        dr = ImageDraw.Draw(tile)
        # sparkles
        rng = np.random.default_rng(i)
        for _ in range(6):
            sx, sy = rng.uniform(0.15, 0.85)*fs, rng.uniform(0.10, 0.55)*fs
            r = fs*0.02*(1 + (i % 2))
            dr.line([sx-r, sy, sx+r, sy], fill=GOLD_LT+(255,), width=int(fs*0.01))
            dr.line([sx, sy-r, sx, sy+r], fill=GOLD_LT+(255,), width=int(fs*0.01))
        strip.paste(tile, (i*fs, 0))
    down(strip, 256*frames, 256).save(OUT / "cat-happy.png")

# =========================================================
# BACKGROUNDS
# =========================================================
def sky_base(w, h):
    arr = vgrad(w, h, [(0.0, (38, 14, 40)), (0.45, (74, 20, 46)), (0.78, (150, 46, 40)), (1.0, (92, 40, 26))])
    return arr_to_img(arr)

def add_moon(img, cx, cy, r):
    w, h = img.size
    glow = new(w, h)
    ImageDraw.Draw(glow).ellipse([cx-r*2.2, cy-r*2.2, cx+r*2.2, cy+r*2.2], fill=(255, 240, 200, 60))
    glow = glow.filter(ImageFilter.GaussianBlur(r*0.4))
    img.alpha_composite(glow)
    dr = ImageDraw.Draw(img)
    dr.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(250, 244, 224, 255))
    for dx, dy, rr in [(-0.3, -0.2, 0.16), (0.25, 0.1, 0.12), (0.05, 0.35, 0.10)]:
        dr.ellipse([cx+dx*r-rr*r, cy+dy*r-rr*r, cx+dx*r+rr*r, cy+dy*r+rr*r], fill=(232, 226, 205, 255))

def add_stars(img, n, seed):
    dr = ImageDraw.Draw(img)
    w, h = img.size
    rng = np.random.default_rng(seed)
    for _ in range(n):
        x, y = rng.uniform(0, w), rng.uniform(0, h*0.62)
        r = rng.uniform(w*0.0008, w*0.0025)
        a = int(rng.uniform(120, 255))
        dr.ellipse([x-r, y-r, x+r, y+r], fill=(255, 250, 230, a))

def add_pagodas(img, ground_y):
    w, h = img.size
    dr = ImageDraw.Draw(img)
    sil = (32, 14, 22, 255)
    def pagoda(cx, base_w, tiers, top):
        y = ground_y
        bw = base_w
        for t in range(tiers):
            th = (ground_y - top) / tiers
            ty = y - th
            dr.polygon([(cx-bw*0.7, y), (cx+bw*0.7, y), (cx+bw*0.5, ty), (cx-bw*0.5, ty)], fill=sil)
            dr.polygon([(cx-bw*0.8, ty+th*0.15), (cx+bw*0.8, ty+th*0.15), (cx, ty-th*0.25)], fill=sil)
            y = ty
            bw *= 0.72
        dr.line([cx, y, cx, y - (ground_y-top)*0.08], fill=sil, width=int(w*0.004))
    pagoda(w*0.18, w*0.11, 3, ground_y - h*0.26)
    pagoda(w*0.82, w*0.13, 4, ground_y - h*0.34)
    # tree/bush silhouettes
    for fx in (0.40, 0.62):
        dr.ellipse([w*fx-w*0.06, ground_y-h*0.10, w*fx+w*0.06, ground_y+h*0.02], fill=sil)

def add_hanging_lanterns(img, positions):
    lant = Image.open(OUT / "lantern.png")
    w, h = img.size
    for fx, scale in positions:
        lw = int(w*scale)
        lh = int(lw * lant.height / lant.width)
        l = lant.resize((lw, lh), Image.LANCZOS)
        x = int(fx*w - lw/2)
        ImageDraw.Draw(img).line([x+lw/2, 0, x+lw/2, int(h*0.04)], fill=(20,10,10,255), width=max(2,int(w*0.002)))
        img.alpha_composite(l, (x, int(h*0.02)))

def make_bg_home():
    w, h = 1080, 1920
    img = sky_base(w, h)
    add_stars(img, 160, 1)
    add_moon(img, w*0.70, h*0.24, w*0.11)
    ground_y = int(h*0.86)
    add_pagodas(img, ground_y)
    # warm ground band
    band = vgrad(w, h - ground_y, [(0, (70, 34, 22)), (1, (44, 22, 16))])
    img.alpha_composite(arr_to_img(band), (0, ground_y))
    add_hanging_lanterns(img, [(0.14, 0.11), (0.30, 0.08), (0.86, 0.10)])
    img.convert("RGB").save(OUT / "bg-home.png")

def make_bg_battle():
    w, h = 1024, 512
    img = sky_base(w, h)
    add_stars(img, 90, 7)
    add_moon(img, w*0.82, h*0.22, w*0.07)
    ground_y = int(h*0.85)
    add_pagodas(img, ground_y)
    band = vgrad(w, h - ground_y, [(0, (78, 40, 26)), (1, (50, 26, 18))])
    img.alpha_composite(arr_to_img(band), (0, ground_y))
    add_hanging_lanterns(img, [(0.08, 0.10), (0.93, 0.09)])
    img.convert("RGB").save(OUT / "bg-battle.png")

# =========================================================
# PWA ICONS (maneki on crimson)
# =========================================================
def make_pwa_icons():
    outdir = ROOT / "pwa" / "icons"
    outdir.mkdir(parents=True, exist_ok=True)
    for size in (192, 512):
        s = size * 2
        img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        dr = ImageDraw.Draw(img)
        dr.rounded_rectangle([0, 0, s-1, s-1], radius=s//5, fill=CRIMSON_DK + (255,))
        dr.rounded_rectangle([s*0.05, s*0.05, s*0.95, s*0.95], radius=s//6, outline=GOLD+(255,), width=int(s*0.02))
        draw_maneki(img, int(s*0.86), ox=int(s*0.07), oy=int(s*0.02), scale=0.92)
        dr = ImageDraw.Draw(img)
        dr.text((s/2, s*0.90), "HSK", font=font(SEGB, int(s*0.13)), fill=GOLD+(255,), anchor="mm")
        img.resize((size, size), Image.LANCZOS).save(outdir / f"icon-{size}.png")

if __name__ == "__main__":
    make_coin()
    make_lantern()
    make_cloud()
    make_buttons()
    make_maneki()
    make_cat_walk()
    make_cat_happy()
    make_bg_home()
    make_bg_battle()
    make_pwa_icons()
    print("assets written to", OUT)
