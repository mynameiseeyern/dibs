"""Rebuild every logo export from the two masters.
  dibby-icon-1024.png  the app icon: Dibby waving, a 3D render (edit it in Runway, not here)
  dibby-face.svg       Dibby's face, flat, for favicons and anywhere a tiny vector mark is needed
Run: python3 export.py   (needs Pillow and cairosvg)
"""
import os, subprocess
from PIL import Image, ImageDraw
H = os.path.dirname(os.path.abspath(__file__)); E = f"{H}/export"
V, L, INK, W = "#6D4AFF", "#C8F03C", "#1E1A22", "#FFFFFF"

def face(cx=100, cy=104, r=58, ink=INK):
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{L}"/>'
            f'<ellipse cx="{cx-22}" cy="{cy-4}" rx="7.5" ry="9" fill="{ink}"/><ellipse cx="{cx+22}" cy="{cy-4}" rx="7.5" ry="9" fill="{ink}"/>'
            f'<path d="M{cx-11} {cy+17}Q{cx} {cy+26} {cx+11} {cy+17}" fill="none" stroke="{ink}" stroke-width="6" stroke-linecap="round"/>')
def svg(body, w=200, h=200): return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>'
tile = lambda rx: f'<rect width="200" height="200" rx="{rx}" fill="{V}"/>'

# Flat marks (vector)
open(f"{H}/dibby-face.svg", "w").write(svg(tile(48) + face()))                       # favicon tile
open(f"{H}/dibs-app-icon.svg", "w").write(svg(tile(48) + face()))                    # old name, kept so links work
open(f"{H}/dibs-ai-member.svg", "w").write(svg(f'<circle cx="100" cy="100" r="100" fill="{V}"/>' + face(100, 100, 62)))
open(f"{H}/dibs-mark-on-dark.svg", "w").write(svg(face(100, 100, 100)))              # the face alone, for ink backgrounds
open(f"{E}/dibby-app-icon-square.svg", "w").write(svg(tile(0) + face()))

# Raster exports from the 3D master
m = Image.open(f"{H}/dibby-icon-1024.png").convert("RGBA")
def rounded(img, frac=0.24):
    r = int(img.width * frac); mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.width - 1, img.height - 1), r, fill=255)
    out = img.copy(); out.putalpha(mask); return out
m.save(f"{E}/dibby-app-icon-1024.png")                                               # App Store: square, the store rounds it
m.resize((180, 180), Image.LANCZOS).save(f"{E}/dibby-apple-touch-180.png")           # iOS rounds it too
for s in (512, 192): rounded(m.resize((s, s), Image.LANCZOS)).save(f"{E}/dibby-icon-{s}.png")
m.resize((400, 400), Image.LANCZOS).save(f"{E}/dibby-social-avatar-400.png")         # safe in a circle crop
# Favicons from the flat face: a 3D render is mush at 16px
for s in (32, 16):
    subprocess.run(["cairosvg", f"{H}/dibby-face.svg", "-o", f"{E}/dibby-favicon-{s}.png", "-W", str(s), "-H", str(s)], check=True)
subprocess.run(["cairosvg", f"{H}/dibs-ai-member.svg", "-o", f"{E}/dibby-ai-member-256.png", "-W", "256", "-H", "256"], check=True)
print("exports rebuilt in", E)

# Wordmark PNGs and the email header, drawn in a browser so the type is Bricolage
from playwright.sync_api import sync_playwright
A = "/home/claude/launch/comp/assets"
def shot(pg, html, w, h, out):
    open(f"{E}/_tmp.html", "w").write(html); pg.set_viewport_size({"width": w, "height": h})
    pg.goto(f"file://{E}/_tmp.html"); pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(150)
    pg.screenshot(path=out, omit_background=True); os.remove(f"{E}/_tmp.html")
with sync_playwright() as p:
    b = p.chromium.launch(args=["--allow-file-access-from-files"]); pg = b.new_page(device_scale_factor=2)
    css = f"@font-face{{font-family:B;font-weight:800;src:url(file://{A}/bricolage-grotesque-latin-800-normal.woff2)}}body{{margin:0;font-family:B;font-weight:800;letter-spacing:-.03em}}"
    for tone, ink in (("light", "#141216"), ("dark", "#FFFFFF")):
        shot(pg, f"<style>{css}</style><div style='display:flex;align-items:center;gap:36px;height:100px'><img src='dibby-icon-512.png' style='width:100px;height:100px'><span style='font-size:78px;color:{ink};line-height:1;padding-bottom:12px'>dibby</span></div>", 400, 100, f"{E}/dibby-wordmark-{tone}.png")
    shot(pg, f"<style>{css}</style><div style='display:flex;align-items:center;gap:6px;height:32px'><img src='dibby-icon-192.png' style='width:32px;height:32px'><span style='font-size:24px;color:#fff;line-height:1;padding-bottom:3px'>dibby</span></div>", 107, 32, f"{H}/../../../../apps/web/public/email/dibby-header@2x.png")
    b.close()
print("wordmark PNGs and email header rebuilt")
