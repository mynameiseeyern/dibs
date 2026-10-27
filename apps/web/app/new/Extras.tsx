"use client";

import { PLAN_EXTRAS } from "@dibs/shared/plans";
import * as Switch from "@/components/ui/switch";

/**
 * Everything beyond RSVP, all on to start. Each switch says what it does, so an organiser can
 * keep a plan as simple as "are you in?". They can switch them back in Edit plan.
 */
export function Extras() {
  return (
    <fieldset className="db-card section extras m-0 min-w-0">
      <legend className="sr-only">Extras</legend>
      <div>
        <h2 className="label-lg" aria-hidden="true">
          Extras
        </h2>
        <p className="paragraph-xs muted">RSVPs are always on. Switch off anything this plan doesn&rsquo;t need; you can turn it back on later.</p>
      </div>
      <ul className="extras__list">
        {PLAN_EXTRAS.map((e) => (
          <li key={e.id}>
            <label className="extras__row">
              <i className={`${e.icon} db-icon extras__icon`} aria-hidden="true" />
              <span className="extras__text">
                <span className="label-md block">{e.label}</span>
                <span className="paragraph-xs muted block">{e.hint}</span>
              </span>
              <Switch.Root name={`extra_${e.id}`} defaultChecked/>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
