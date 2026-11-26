"""Turn a transparent animated WebP of Dibby (the app's clips, apps/mobile/assets/dibby/motion) into
the web's stacked colour+matte H.264 (colour top, alpha bottom), for components/DibbyMotion.tsx.
key.py does the same from a violet-background source; this is for clips already keyed.
Edge colour is bled in from the solid body, so the matte's soft edge never shows a dark fringe.
  python3 webp-to-matte.py SRC.webp OUT.mp4 [--fps 18]"""
import os, subprocess, sys, tempfile
import numpy as np
from PIL import Image
from scipy import ndimage

src, out = sys.argv[1:3]
fps = sys.argv[sys.argv.index("--fps") + 1] if "--fps" in sys.argv else "18"
im = Image.open(src)
tmp = tempfile.mkdtemp()
for i in range(im.n_frames):
    im.seek(i)
    f = np.array(im.convert("RGBA")).astype(float)
    rgb, alpha = f[..., :3], f[..., 3] / 255
    solid = alpha > 0.98
    if solid.any():
        idx = ndimage.distance_transform_edt(~solid, return_distances=False, return_indices=True)
        rgb = rgb[idx[0], idx[1]]
    a8 = (alpha * 255).astype("uint8")
    colour = np.clip(rgb, 0, 255).astype("uint8")
    # The player samples the matte from the bottom half with linear filtering, so the colour
    # half's last rows bleed into the matte's first: keep them black, or a line shows above him.
    colour[-2:] = 0
    stacked = np.vstack([colour, np.dstack([a8, a8, a8])])
    Image.fromarray(stacked, "RGB").save(f"{tmp}/s{i:04d}.png")
subprocess.run(
    ["ffmpeg", "-loglevel", "error", "-y", "-framerate", fps, "-i", f"{tmp}/s%04d.png", "-c:v", "libx264", "-preset", "slow", "-crf", "21",
     "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", out],
    check=True,
)
print(os.path.basename(out), f"{im.n_frames} frames", f"{os.path.getsize(out) // 1024}KB")
