/**
 * The app icon: Dibby waving, a 3D render. The master is packages/ui/assets/logos/dibby-icon-1024.png;
 * the sizes under public/dibby are made by logos/export.py. Rounded like a home-screen icon.
 */
export function LogoMark({ size = 32, title }: { size?: number; title?: string }) {
  const src = size > 64 ? "/dibby/icon-512.png" : size > 32 ? "/dibby/icon-192.png" : "/dibby/icon-64.png";
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={title ?? ""}
      aria-hidden={title ? undefined : true}
      className="logo-mark"
      style={{ width: size, height: size, borderRadius: size * 0.24 }}
      draggable={false}
    />
  );
}

/** Dibby's avatar in the chat and member lists: the face from the icon, in a circle. Only for Dibby. */
export function DibbyMark({ size = 32 }: { size?: number }) {
  return (
    <img
      src={size > 64 ? "/dibby/face-256.png" : "/dibby/face-64.png"}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      style={{ width: size, height: size, borderRadius: "50%" }}
      draggable={false}
    />
  );
}

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <a className="wordmark" href={href} aria-label="Dibby home">
      <LogoMark size={32} />
      dibby
    </a>
  );
}

/** Empty-state crew: three friends, the middle one waving. Being replaced by <Dibby mood="…" />. */
export function CrewWave() {
  return (
    <svg viewBox="0 0 140 120" aria-hidden="true">
      <circle cx="32" cy="80" r="22" fill="var(--primary-light)" />
      <circle cx="108" cy="80" r="22" fill="var(--primary-light)" />
      <circle cx="70" cy="48" r="26" fill="var(--accent-base)" />
      <rect x="62" y="80" width="16" height="32" rx="8" fill="var(--accent-base)" />
      <rect x="92" y="18" width="12" height="34" rx="6" fill="var(--accent-base)" transform="rotate(28 98 35)" />
    </svg>
  );
}

/**
 * "Dibby" meaning the helper: the name with Dibby's face, so it reads as someone in the group.
 * The app's own surfaces (logo, emails, About) use the icon; running copy doesn't call the app Dibby.
 */
export function DibbyName() {
  return (
    <span className="dibby-name">
      <DibbyMark size={18} />
      Dibby
    </span>
  );
}
