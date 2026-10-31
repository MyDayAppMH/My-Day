"""Generate the app icons (needs Pillow). Run from the repo root: python3 scripts/make-icons.py"""
from PIL import Image, ImageDraw

INDIGO, WHITE, SOFT = (59, 91, 219), (255, 255, 255), (200, 210, 250)

def draw(size, safe):
    s = size * 4
    img = Image.new("RGB", (s, s), INDIGO)  # full-bleed so the maskable version survives any mask shape
    d = ImageDraw.Draw(img)
    box = s * safe
    x0, y0 = (s - box) / 2, (s - box) / 2
    # a calendar page with a tick on it
    d.rounded_rectangle([x0 + box * 0.12, y0 + box * 0.18, x0 + box * 0.88, y0 + box * 0.86], radius=box * 0.09, fill=WHITE)
    d.rounded_rectangle([x0 + box * 0.12, y0 + box * 0.18, x0 + box * 0.88, y0 + box * 0.36], radius=box * 0.09, fill=SOFT)
    d.rectangle([x0 + box * 0.12, y0 + box * 0.30, x0 + box * 0.88, y0 + box * 0.36], fill=SOFT)
    for fx in (0.30, 0.70):  # binder rings
        d.rounded_rectangle([x0 + box * (fx - 0.035), y0 + box * 0.10, x0 + box * (fx + 0.035), y0 + box * 0.26], radius=box * 0.03, fill=WHITE)
    w = int(box * 0.065)
    d.line([(x0 + box * 0.32, y0 + box * 0.62), (x0 + box * 0.45, y0 + box * 0.74), (x0 + box * 0.68, y0 + box * 0.50)], fill=INDIGO, width=w, joint="curve")
    return img.resize((size, size), Image.LANCZOS)

draw(192, 0.80).save("icon-192.png")
draw(512, 0.80).save("icon-512.png")
draw(512, 0.60).save("icon-maskable-512.png")
print("icons written")
