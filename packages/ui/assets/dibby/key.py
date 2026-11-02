"""Key a violet-background Dibby clip into a stacked colour+matte H.264 (colour top, alpha bottom).
Edge colour is bled in from the solid body (never un-mixed from violet), so fast moves leave no fringe.
  python3 key30.py NAME SRC OUTDIR [--loop]"""
import os, sys, subprocess, tempfile
import numpy as np
from PIL import Image
from scipy import ndimage
name, src, outdir = sys.argv[1:4]; loop = "--loop" in sys.argv
fps = subprocess.run(["ffprobe","-v","error","-select_streams","v","-show_entries","stream=r_frame_rate","-of","csv=p=0",src],capture_output=True,text=True).stdout.strip().split("/")[0]
V = np.array([109, 74, 255], float); L = np.array([200, 240, 60], float)
tmp = tempfile.mkdtemp(dir="/home/claude/launch/dibby")
subprocess.run(["ffmpeg","-loglevel","error","-y","-i",src,"-vf","scale=480:480:flags=lanczos",f"{tmp}/f%04d.png"],check=True)
files = sorted(f for f in os.listdir(tmp) if f.endswith(".png"))
frames = []
for f in files:
    a = np.array(Image.open(f"{tmp}/{f}").convert("RGB")).astype(float)
    # How lime each pixel is, measured along the violet -> lime line: 0 = background, 1 = Dibby.
    # A blurred hand that's mostly background gets a low value and fades, like real motion blur.
    t = ((a - V) @ (L - V)) / ((L - V) @ (L - V))
    alpha = np.clip((t - 0.12) / (0.55 - 0.12), 0, 1)
    alpha = alpha * alpha * (3 - 2 * alpha)                       # smoothstep
    # Eyes and mouth are dark holes inside the body: fill those, but never a violet gap under an arm.
    holes = ndimage.binary_fill_holes(alpha > 0.5) & ~(alpha > 0.5)
    dark = a.max(2) < 150
    alpha = np.where(holes & dark, 1.0, alpha)
    alpha = ndimage.gaussian_filter(alpha, 0.5)
    solid = alpha > 0.98
    idx = ndimage.distance_transform_edt(~solid, return_distances=False, return_indices=True)
    rgb = a[idx[0], idx[1]]
    frames.append((rgb.astype("uint8"), (alpha * 255).astype("uint8")))
if loop:
    n = 10
    for i in range(n):
        t = (i + 1) / (n + 1); (ra, aa), (rb, ab) = frames[-n + i], frames[i]
        frames[-n + i] = ((ra * (1 - t) + rb * t).astype("uint8"), (aa * (1 - t) + ab * t).astype("uint8"))
for i, (rgb, al) in enumerate(frames):
    Image.fromarray(np.vstack([rgb, np.dstack([al, al, al])]), "RGB").save(f"{tmp}/s{i:04d}.png")
out = f"{outdir}/{name}.mp4"
subprocess.run(["ffmpeg","-loglevel","error","-y","-framerate",fps,"-i",f"{tmp}/s%04d.png","-c:v","libx264","-preset","slow","-crf","21","-pix_fmt","yuv420p","-movflags","+faststart","-an",out],check=True)
# the rest frame (first of a loop, last of a one-shot) as the still
rgb, al = frames[0] if loop else frames[-1]
rest = Image.fromarray(np.dstack([rgb, al]), "RGBA")
stills = f"{outdir}/../stills"
for s in (480, 720): rest.resize((s, s), Image.LANCZOS).save(f"{stills}/{name}-rest@{s}.png", optimize=True)
for f in os.listdir(tmp): os.remove(f"{tmp}/{f}")
os.rmdir(tmp)
print(name, fps, "fps,", len(frames), "frames,", os.path.getsize(out) // 1024, "KB")
