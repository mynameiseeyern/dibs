// The V3 "hands up" mark: three friends, one popping up to call dibs.
export function LogoMark({ size = 32, title }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <rect width="200" height="200" rx="48" fill="#6D4AFF" />
      <g transform="translate(30 30)">
        {/* Solid side friends (ARV-39), so the mark still reads at favicon size. */}
        <circle cx="32" cy="88" r="22" fill="#DDD4FF" />
        <circle cx="108" cy="88" r="22" fill="#DDD4FF" />
        <circle cx="70" cy="52" r="26" fill="#C8F03C" />
        <rect x="62" y="84" width="16" height="36" rx="8" fill="#C8F03C" />
      </g>
    </svg>
  );
}

/** Dibby's avatar: the raised lime friend from the logo, with a face, on violet. Only for Dibby. */
export function DibbyMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="100" fill="#6D4AFF" />
      <circle cx="100" cy="80" r="40" fill="#C8F03C" />
      <rect x="86" y="116" width="28" height="46" rx="14" fill="#C8F03C" />
      <circle cx="86" cy="76" r="6" fill="#6D4AFF" />
      <circle cx="114" cy="76" r="6" fill="#6D4AFF" />
      <path d="M84 92Q100 104 116 92" stroke="#6D4AFF" strokeWidth="7" strokeLinecap="round" fill="none" />
    </svg>
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

/** Empty-state crew: three friends, the middle one waving. */
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
