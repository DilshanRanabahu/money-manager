# Generates the app icon, adaptive icon layers, splash images and favicon.
# Usage: python scripts/make-icon.py assets
#
# Design: a white wallet with three colourful cards peeking out of the top,
# on a diagonal indigo -> violet -> pink gradient.
import math
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter

S = 4  # supersampling
GRADIENT = [(79, 70, 229), (147, 51, 234), (236, 72, 153)]  # indigo-600, purple-600, pink-500
CARDS = [(56, 189, 248), (251, 191, 36), (52, 211, 153)]  # sky-400 (back), amber-400, emerald-400 (front)
WHITE = (255, 255, 255, 255)
CLASP = (79, 70, 229, 255)
SEAM = (221, 214, 254, 255)  # violet-200


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def gradient(n):
    """Diagonal gradient, top-left to bottom-right, with a soft light spot top-left."""
    small = 256
    im = Image.new('RGB', (small, small))
    px = im.load()
    for y in range(small):
        for x in range(small):
            t = (x + y) / (2 * (small - 1))
            c = lerp(GRADIENT[0], GRADIENT[1], t * 2) if t < 0.5 else lerp(GRADIENT[1], GRADIENT[2], (t - 0.5) * 2)
            # light spot
            d = math.hypot(x - small * 0.22, y - small * 0.18) / small
            glow = max(0.0, 0.22 - d * 0.35)
            px[x, y] = tuple(min(255, round(v + (255 - v) * glow)) for v in c)
    return im.resize((n, n), Image.BICUBIC).convert('RGBA')


def card(w, h, color, n):
    """One card on its own transparent layer (n x n), centred, with a stripe."""
    layer = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0, y0 = (n - w) / 2, (n - h) / 2
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=w * 0.09, fill=color + (255,))
    # a lighter stripe near the top
    light = lerp(color, (255, 255, 255), 0.35) + (255,)
    d.rounded_rectangle([x0 + w * 0.10, y0 + h * 0.16, x0 + w * 0.48, y0 + h * 0.27], radius=h * 0.06, fill=light)
    return layer


def glyph(size, scale, colorful=True, body=WHITE, shadow=True, cards=True):
    """Wallet (+ cards) on a transparent canvas. scale = wallet width / canvas."""
    N = size * S
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    W = N * scale
    H = W * 0.70
    lift = W * 0.30 if cards else 0  # how far the cards rise above the wallet
    total = H + lift
    x0 = (N - W) / 2
    y0 = (N - total) / 2 + lift  # wallet top

    # cards: (colour, centre x offset, top offset above wallet, rotation)
    specs = [(CARDS[0], -0.10, 0.30, 9), (CARDS[1], 0.04, 0.24, -6), (CARDS[2], 0.00, 0.15, 2)]
    cw, ch = W * 0.80, W * 0.52
    for color, dx, top, rot in specs if cards else []:
        c = color if colorful else body[:3]
        layer = card(cw, ch, c, N).rotate(rot, resample=Image.BICUBIC, center=(N / 2, N / 2))
        cx = N / 2 + dx * W
        cy = y0 - top * W + ch / 2
        im.alpha_composite(layer, (round(cx - N / 2), round(cy - N / 2)))

    # soft shadow under the wallet
    if shadow:
        sh = Image.new('RGBA', (N, N), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle(
            [x0, y0 + W * 0.03, x0 + W, y0 + H + W * 0.05], radius=W * 0.16, fill=(30, 10, 60, 110)
        )
        im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(W * 0.05)))

    # wallet body
    wal = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(wal)
    d.rounded_rectangle([x0, y0, x0 + W, y0 + H], radius=W * 0.16, fill=body)
    # tab on the right, separated by a thin cut
    tw, th = W * 0.38, H * 0.36
    tx, ty = x0 + W - tw * 0.78, y0 + (H - th) / 2 + H * 0.04
    gap = W * 0.035
    cut = Image.new('L', (N, N), 0)
    ImageDraw.Draw(cut).rounded_rectangle([tx - gap, ty - gap, x0 + W + N, ty + th + gap], radius=th / 2 + gap, fill=255)
    if colorful:
        # A soft lavender groove instead of a see-through cut, so the cards don't show through.
        groove = Image.new('RGBA', (N, N), SEAM)
        groove.putalpha(ImageChops.multiply(wal.getchannel('A'), cut))
        wal.alpha_composite(groove)
    else:
        wal.putalpha(ImageChops.subtract(wal.getchannel('A'), cut))
    d = ImageDraw.Draw(wal)
    d.rounded_rectangle([tx, ty, x0 + W + W * 0.02, ty + th], radius=th / 2, fill=body)
    cr = th * 0.22
    cx, cy = tx + th * 0.5, ty + th / 2
    d.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=CLASP if colorful else (0, 0, 0, 0))
    im.alpha_composite(wal)
    return im.resize((size, size), Image.LANCZOS)


def full_icon(size, scale):
    bg = gradient(size)
    bg.alpha_composite(glyph(size, scale))
    return bg


def rounded_tile(size, scale):
    """Full icon clipped to a rounded square (for splash screens)."""
    tile = full_icon(size, scale)
    mask = Image.new('L', (size * S, size * S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size * S - 1, size * S - 1], radius=size * S * 0.23, fill=255)
    tile.putalpha(mask.resize((size, size), Image.LANCZOS))
    return tile


if __name__ == '__main__':
    out = sys.argv[1]
    full_icon(1024, 0.52).save(f'{out}/icon.png')
    gradient(1024).save(f'{out}/android-icon-background.png')
    # Adaptive icon: keep the art inside the 66% safe zone.
    glyph(1024, 0.46).save(f'{out}/android-icon-foreground.png')
    glyph(1024, 0.50, colorful=False, shadow=False, cards=False).save(f'{out}/android-icon-monochrome.png')
    rounded_tile(1024, 0.52).save(f'{out}/splash-icon.png')
    rounded_tile(1024, 0.52).save(f'{out}/splash-icon-dark.png')
    full_icon(48, 0.62).save(f'{out}/favicon.png')
