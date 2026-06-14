#!/usr/bin/env python3
"""
make_og.py — renders live bubble-map banners (1200x630) for Open Graph
previews, so link shares on X / Telegram / WhatsApp show the actual product
instead of a static logo:

  assets/og-map.png     AI stocks bubble map  (from universe.json)
  assets/og-crypto.png  AI crypto bubble map  (from crypto.json)

Crawlers don't run JS, so these must be real PNGs. Regenerated with the
universe refresh.
"""

import os
import io
import json
import math
import datetime as dt

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)

import requests
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
TOP = 92            # header band height
BG = (10, 14, 19)

HEAT = [(-10, (112, 15, 25)), (-6, (185, 28, 28)), (-3, (239, 68, 68)),
        (-1, (247, 123, 123)), (0, (38, 42, 46)), (1, (105, 205, 145)),
        (3, (34, 197, 94)), (6, (21, 128, 61)), (10, (10, 82, 45))]


def heat(p):
    x = max(-10.0, min(10.0, p or 0))
    for (a, ca), (b, cb) in zip(HEAT, HEAT[1:]):
        if a <= x <= b:
            t = (x - a) / ((b - a) or 1)
            return tuple(round(ca[i] + (cb[i] - ca[i]) * t) for i in range(3))
    return (38, 42, 46)


def core(p):
    return tuple(round(v * 0.30 + 8) for v in heat(p))


def font(size, black=False):
    for p in ("/System/Library/Fonts/Supplemental/Arial Black.ttf" if black else
              "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()


def logo_stock(sym):
    try:
        if sym == "SPCX":
            return Image.open("assets/spacex.png").convert("RGBA")
        r = requests.get(f"https://assets.parqet.com/logos/symbol/{sym}?format=png&size=64",
                         timeout=8)
        if r.status_code == 200 and r.content:
            return Image.open(io.BytesIO(r.content)).convert("RGBA")
    except Exception:
        pass
    return None


def logo_cmc(cid):
    try:
        r = requests.get(f"https://s2.coinmarketcap.com/static/img/coins/64x64/{cid}.png",
                         timeout=8)
        if r.status_code == 200 and r.content:
            return Image.open(io.BytesIO(r.content)).convert("RGBA")
    except Exception:
        pass
    return None


def pack(items):
    """greedy spiral packing inside the canvas below the header"""
    nodes = sorted(items, key=lambda n: -n["r"])
    placed = []
    cx, cy = W / 2, TOP + (H - TOP) / 2
    for n in nodes:
        if not placed:
            n["x"], n["y"] = cx, cy
            placed.append(n)
            continue
        t = 0.1
        while True:
            x = cx + 2.4 * t * math.cos(t)
            y = cy + 2.4 * t * math.sin(t) * 0.62
            ok = all((p["x"] - x) ** 2 + (p["y"] - y) ** 2 >= (p["r"] + n["r"] + 6) ** 2
                     for p in placed)
            inside = (n["r"] + 6 < x < W - n["r"] - 6 and
                      TOP + n["r"] + 6 < y < H - n["r"] - 14)
            if (ok and inside) or t > 3000:
                n["x"], n["y"] = x, y
                break
            t += 0.05
        placed.append(n)
    return placed


def build(raw, n=14):
    """raw: list of (label, pct, logo_key) → sized bubble nodes (top movers)."""
    movers = sorted(raw, key=lambda z: -abs(z[1] or 0))[:n]
    mx = max(abs(z[1] or 0) for z in movers) or 1
    lo, hi = 52, 124
    return [{"label": l, "pct": p, "logo_key": k,
             "r": lo + (hi - lo) * math.sqrt(abs(p or 0) / mx)}
            for (l, p, k) in movers]


def render(items, subtitle, logo_fn):
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)

    for n in pack(items):
        r, x, y, pct = n["r"], n["x"], n["y"], n["pct"] or 0
        hc, cc = heat(pct), core(pct)
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        for k, a in ((10, 36), (6, 60), (3, 90)):
            gd.ellipse([x - r - k, y - r - k, x + r + k, y + r + k],
                       outline=hc + (a,), width=k)
        im.paste(Image.alpha_composite(im.convert("RGBA"), glow).convert("RGB"), (0, 0))
        d = ImageDraw.Draw(im)
        d.ellipse([x - r, y - r, x + r, y + r], fill=cc, outline=hc, width=4)

        lg = logo_fn(n["logo_key"]) if r > 62 else None
        ls = int(r * 0.52)
        ty = y - r * 0.30
        if lg:
            lg = lg.resize((ls, ls), Image.LANCZOS)
            mask = Image.new("L", (ls, ls), 0)
            ImageDraw.Draw(mask).ellipse([0, 0, ls, ls], fill=255)
            im.paste(lg, (int(x - ls / 2), int(y - r * 0.62)), mask)
            d = ImageDraw.Draw(im)
            ty = y + r * 0.02
        # shrink the label until it fits the bubble (crypto names run long)
        fs = max(15, min(30, int(r * 0.34)))
        while fs > 11 and d.textlength(n["label"], font=font(fs, black=True)) > 1.85 * r:
            fs -= 1
        f1 = font(fs, black=True)
        f2 = font(max(13, int(fs * 0.78)))
        w1 = d.textlength(n["label"], font=f1)
        d.text((x - w1 / 2, ty), n["label"], font=f1, fill=(255, 255, 255))
        pc = ("+" if pct >= 0 else "") + f"{pct:.2f}%"
        col = (141, 240, 180) if pct >= 0 else (255, 154, 162)
        w2 = d.textlength(pc, font=f2)
        d.text((x - w2 / 2, ty + fs * 1.18), pc, font=f2, fill=col)

    # header band
    d.rectangle([0, 0, W, TOP - 18], fill=(13, 18, 25))
    d.line([0, TOP - 18, W, TOP - 18], fill=(29, 39, 51), width=2)
    d.text((36, 18), "S", font=font(44, black=True), fill=(74, 222, 128))
    d.text((72, 24), "ANTRO AI", font=font(30, black=True), fill=(231, 237, 243))
    d.text((40, 64), subtitle.upper(), font=font(12), fill=(34, 197, 94))
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%b %d, %Y · %H:%M UTC")
    label = "santroai.tech"
    d.text((W - 36 - d.textlength(label, font=font(26, black=True)), 22),
           label, font=font(26, black=True), fill=(34, 197, 94))
    d.text((W - 36 - d.textlength(stamp, font=font(20)), 56), stamp, font=font(20),
           fill=(136, 149, 164))
    return im


def make_stocks():
    u = json.load(open("universe.json"))
    tickers = [t for b in u["bubbles"] for t in b["tickers"] if t.get("price")]
    items = build([(t["ticker"], t.get("change_pct") or 0, t["ticker"]) for t in tickers])
    im = render(items, "AI stocks bubble map · today's movers", logo_stock)
    im.save("assets/og-map.png", optimize=True)
    print(f"og-map.png — {len(items)} movers, {os.path.getsize('assets/og-map.png')//1024}KB")


def make_crypto():
    c = json.load(open("crypto.json"))
    coins = (c.get("baskets", {}).get("bigdata", {}) or {}).get("coins", [])
    if not coins:
        print("og-crypto.png — skipped (no crypto basket)")
        return
    items = build([(co["symbol"], co.get("change_24h") or 0, co["id"]) for co in coins])
    im = render(items, "AI crypto bubble map · today's movers", logo_cmc)
    im.save("assets/og-crypto.png", optimize=True)
    print(f"og-crypto.png — {len(items)} movers, "
          f"{os.path.getsize('assets/og-crypto.png')//1024}KB")


def main():
    make_stocks()
    try:
        make_crypto()
    except Exception as e:
        print(f"og-crypto.png — skipped ({e})")


if __name__ == "__main__":
    main()
