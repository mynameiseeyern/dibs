"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Plays one of Dibby's clips with transparency, smoothly, on phones.
 *
 * Animated WebP stutters on iOS (every frame is decoded on the main thread), and Safari has no
 * alpha video, so each clip is a small H.264 with the colour on the top half and the alpha matte
 * on the bottom half (public/dibby/motion/<clip>.mp4). The phone decodes it in hardware and a
 * tiny shader puts the two halves back together on a canvas.
 *
 * The still (the first frame of a loop, the last of a one-shot) sits under the canvas until the
 * first frame is drawn, so nothing flashes, and a one-shot ends holding that same frame.
 * Falls back to the animated WebP where WebGL isn't available.
 */
export function DibbyMotion({ clip, loop, px, still, srcSet, webp, className, a11y }: {
  clip: string; loop: boolean; px: number; still: string; srcSet: string; webp: string; className: string;
  a11y: Record<string, unknown>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"loading" | "playing" | "fallback">("loading");

  useEffect(() => {
    const canvas = canvasRef.current, video = videoRef.current;
    if (!canvas || !video) return;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: false, alpha: true });
    if (!gl) { setState("fallback"); return; }

    const vs = "attribute vec2 p;varying vec2 t;void main(){t=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}";
    // Colour from the top half, alpha from the red channel of the bottom half.
    const fs = "precision mediump float;uniform sampler2D s;varying vec2 t;void main(){vec3 c=texture2D(s,vec2(t.x,t.y*.5)).rgb;float a=texture2D(s,vec2(t.x,.5+t.y*.5)).r;gl_FragColor=vec4(c,a);}";
    const sh = (type: number, src: string) => { const h = gl.createShader(type)!; gl.shaderSource(h, src); gl.compileShader(h); return h; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    for (const [k, v] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]]) gl.texParameteri(gl.TEXTURE_2D, k, v);

    let raf = 0, shown = false, ended = false;
    const draw = () => {
      if (video.readyState >= 2 && !ended) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (!shown) { shown = true; setState("playing"); }
      }
      if (!ended) raf = requestAnimationFrame(draw);
    };
    const onEnded = () => { ended = true; };  // the canvas keeps the last frame, which is the still
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", () => setState("fallback"));
    video.play().catch(() => setState("fallback"));
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); video.removeEventListener("ended", onEnded); video.pause(); };
  }, [clip]);

  if (state === "fallback") {
    return <img className={className} src={webp} width={px} height={px} draggable={false} {...a11y} />;
  }
  return (
    <span className={`${className} dibby-motion`} style={{ width: px, height: px }} {...a11y}>
      <img className="dibby-motion__still" src={still} srcSet={srcSet} sizes={`${px}px`} width={px} height={px} alt="" aria-hidden="true" draggable={false} hidden={state === "playing"} />
      <canvas ref={canvasRef} className="dibby-motion__canvas" width={480} height={480} aria-hidden="true" />
      <video ref={videoRef} src={`/dibby/motion/${clip}.mp4`} muted playsInline loop={loop} preload="auto" aria-hidden="true" crossOrigin="anonymous" style={{ display: "none" }} />
    </span>
  );
}
