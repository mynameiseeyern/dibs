import type { ReactNode } from "react";

/**
 * A round icon button with its label underneath, for a row of quick actions on a card
 * (Edit, Calendar, Directions, Chat). The whole thing is the tap target: 48px circle, 64px wide.
 */
export function CircleAction({
  icon,
  label,
  href,
  external,
  onClick,
  badge,
  badgeLabel,
  tone,
}: {
  icon: string;
  label: string;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  /** A small count on the circle, e.g. messages. */
  badge?: ReactNode;
  /** What the badge means, for screen readers: "3 messages". */
  badgeLabel?: string;
  /** "dibs": the lime call-dibs moment (at most one per screen). */
  tone?: "dibs";
}) {
  const cls = `circle-action${tone ? ` circle-action--${tone}` : ""}`;
  const name = badgeLabel ? `${label}, ${badgeLabel}` : undefined;
  const inner = (
    <>
      <span className="circle-action__icon">
        <i className={`${icon} db-icon`} aria-hidden="true" />
        {badge ? <span className="circle-action__badge" aria-hidden="true">{badge}</span> : null}
      </span>
      <span className="circle-action__label">{label}</span>
    </>
  );
  if (href) {
    return (
      <a className={cls} href={href} aria-label={name} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" className={cls} aria-label={name} onClick={onClick}>
      {inner}
    </button>
  );
}
