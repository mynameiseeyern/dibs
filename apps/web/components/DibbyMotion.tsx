"use client";

import { useEffect, useRef, useState } from "react";

type VideoWithFrames = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

/**
 * Plays one of Dibby's clips with transparency, smoothly, on phones.
 *
 * Animated WebP stutters on iOS, and Safari has no alpha video, so each clip is a small H.264 at
 * up to 30 fps, cropped tight around Dibby, with the colour on the top half and the alpha matte on the bottom half
 * (public/dibby/motion/<clip>.mp4). The phone decodes it in hardware and a tiny shader puts the
 * halves back together on a canvas, once per decoded frame.
 *
 * - The video stays in the page (invisible), never display:none: iOS decodes hidden videos lazily.
 * - Playback starts once the clip has fully buffered, so it can't stall mid-jump.
 * - The still (first frame of a loop, last of a one-shot) shows until the first frame is drawn,
 *   and a one-shot ends holding that same frame, so nothing jumps.
 * - Falls back to the animated WebP where WebGL isn't available.
 */
export function DibbyMotion({ clip, loop, px, still, srcSet, webp, className, a11y }: {
  clip: string; loop: boolean; px: number; still: string; srcSet: string; webp: string; className: string;
  a11y: Record<string, unknown>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"loading" | "playing" | "fallback">("loading");

  useEffect(() => {
    const canvas = canvasRef.current, video = videoRef.current as VideoWithFrames | null;
    if (!canvas || !video) return;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: false, alpha: true, antialias: false });
    if (!gl) { setState("fallback"); return; }

    const vs = "attribute vec2 p;varying vec2 t;void main(){t=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}";
    // Colour from the top half, alpha from the bottom half.
    const fs = "precision mediump float;uniform sampler2D s;varying vec2 t;void main(){vec3 c=texture2D(s,vec2(t.x,t.y*.5)).rgb;float a=texture2D(s,vec2(t.x,.5+t.y*.5)).r;gl_FragColor=vec4(c,a);}";
    const sh = (type: number, src: string) => { const h = gl.createShader(type)!; gl.shaderSource(h, src); gl.compileShader(h); return h; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog); gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    for (const [k, v] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]]) gl.texParameteri(gl.TEXTURE_2D, k, v);

    let stopped = false, shown = false, rafId = 0, vfcId = 0, lastTime = -1;
    const paint = () => {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!shown) { shown = true; setState("playing"); }
    };
    // Draw exactly once per decoded frame where the browser can tell us (Safari 15.4+, Chrome);
    // otherwise on animation frames, skipping repeats.
    const onFrame = () => {
      if (stopped) return;
      paint();
      vfcId = video.requestVideoFrameCallback!(onFrame);
    };
    const onTick = () => {
      if (stopped) return;
      if (video.readyState >= 2 && video.currentTime !== lastTime) { lastTime = video.currentTime; paint(); }
      rafId = requestAnimationFrame(onTick);
    };
    const start = () => {
      if (video.requestVideoFrameCallback) vfcId = video.requestVideoFrameCallback(onFrame);
      else rafId = requestAnimationFrame(onTick);
      video.play().catch(() => setState("fallback"));
    };
    const onEnded = () => { if (video.readyState >= 2) paint(); stopped = true; };  // hold the last frame
    const onError = () => setState("fallback");

    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);
    if (video.readyState >= 4) start();
    else video.addEventListener("canplaythrough", start, { once: true });
    video.load();

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      if (vfcId) video.cancelVideoFrameCallback?.(vfcId);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
      video.removeEventListener("canplaythrough", start);
      video.pause();
    };
  }, [clip]);

  if (state === "fallback") {
    return <img className={className} src={webp} width={px} height={px} draggable={false} {...a11y} />;
  }
  return (
    <span className={`${className} dibby-motion`} style={{ width: px, height: px }} {...a11y}>
      <img className="dibby-motion__still" src={still} srcSet={srcSet} sizes={`${px}px`} width={px} height={px} alt="" aria-hidden="true" draggable={false} hidden={state === "playing"} />
      <video ref={videoRef} className="dibby-motion__video" src={`/dibby/motion/${clip}.mp4`} muted playsInline loop={loop} preload="auto" aria-hidden="true" disablePictureInPicture disableRemotePlayback />
      <canvas ref={canvasRef} className="dibby-motion__canvas" width={720} height={720} aria-hidden="true" />
    </span>
  );
}
