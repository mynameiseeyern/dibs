/**
 * Dibby, the character, in a mood. Stills and loops live in packages/ui/assets/dibby (the app
 * serves the sizes under public/dibby). The still shows when the person prefers reduced motion;
 * otherwise the clip plays through DibbyMotion.
 *
 * Moods with motion play it. A loop (thinking, loading) rests on its first frame; a one-shot
 * (cheer, oops) plays once and holds its last frame, and that frame is the mood's still, so
 * nothing jumps when it stops.
 */

import { DibbyMotion } from "./DibbyMotion";

const STILLS = ["wave", "hi", "think", "look", "shrug", "lost", "sleep", "point", "thumbs", "wait", "phone", "eat", "sad", "stand"] as const;
const MOTION = { thinking: { clip: "think-loop", loop: true }, loading: { clip: "load-loop", loop: true }, cheer: { clip: "cheer", loop: false }, oops: { clip: "oops", loop: false } } as const;

export type DibbyMood = (typeof STILLS)[number] | keyof typeof MOTION;
export type DibbySize = "xs" | "sm" | "md" | "lg";

const PX: Record<DibbySize, number> = { xs: 48, sm: 80, md: 160, lg: 240 };

export function Dibby({ mood, size = "md", label, className }: { mood: DibbyMood; size?: DibbySize; label?: string; className?: string }) {
  const px = PX[size];
  const cls = `dibby dibby--${size}${className ? ` ${className}` : ""}`;
  const a11y = label ? { alt: label, role: "img" as const } : { alt: "", "aria-hidden": true as const };
  const motion = mood in MOTION ? MOTION[mood as keyof typeof MOTION] : null;
  const stillName = motion ? `${motion.clip}-rest` : mood;
  // Phones are 3x: a 160px Dibby needs a 480px file, so the smallest size served is 480.
  const still = `/dibby/stills/${stillName}@480.png`;
  const srcSet = `${still} 480w, /dibby/stills/${stillName}@720.png 720w`;

  if (!motion) {
    return <img className={cls} src={still} srcSet={srcSet} sizes={`${px}px`} width={px} height={px} draggable={false} {...a11y} />;
  }
  return (
    <>
      {/* Motion off: the still. Otherwise the clip, composited with its matte (see DibbyMotion). */}
      <img className={`${cls} dibby--reduced`} src={still} srcSet={srcSet} sizes={`${px}px`} width={px} height={px} draggable={false} {...a11y} />
      <DibbyMotion clip={motion.clip} loop={motion.loop} px={px} still={still} srcSet={srcSet} webp={`/dibby/motion/${motion.clip}.webp`} className={`${cls} dibby--motion`} a11y={a11y} />
    </>
  );
}
