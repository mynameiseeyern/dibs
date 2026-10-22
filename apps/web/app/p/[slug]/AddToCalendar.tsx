"use client";

import { useState } from "react";
import * as Button from "@/components/ui/button";

export interface CalendarLinks {
  ics: string;
  google: string;
  outlook: string;
  office: string;
}

/**
 * "Add to calendar" opens a short list of calendars to pick from, the same on every device.
 * Apple Calendar uses the .ics file, which iPhone and Mac open straight into the add-event sheet;
 * the rest open each calendar's own add-event page.
 */
export function AddToCalendar({ links }: { links: CalendarLinks }) {
  const [open, setOpen] = useState(false);
  const options = [
    { label: "Apple Calendar", icon: "ri-apple-fill", href: links.ics, external: false },
    { label: "Google Calendar", icon: "ri-google-fill", href: links.google, external: true },
    { label: "Outlook", icon: "ri-microsoft-fill", href: links.outlook, external: true },
    { label: "Outlook for work", icon: "ri-briefcase-line", href: links.office, external: true },
    { label: "Download calendar file", icon: "ri-download-2-line", href: `${links.ics}?download=1`, external: false },
  ];

  return (
    <div className="add-to-calendar">
      <Button.Root
        type="button"
        variant="neutral"
        mode="lighter"
        block
        aria-expanded={open}
        aria-controls="calendar-options"
        onClick={() => setOpen((o) => !o)}
      >
        <i className="ri-calendar-event-line db-icon" aria-hidden="true" />
        Add to calendar
        <i className={`${open ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"} db-icon`} aria-hidden="true" />
      </Button.Root>
      {open && (
        <ul id="calendar-options" className="add-to-calendar__list">
          {options.map((o) => (
            <li key={o.label}>
              <Button.Root asChild mode="ghost" block>
                <a
                  className="add-to-calendar__option"
                  href={o.href}
                  {...(o.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  onClick={() => setOpen(false)}
                >
                  <i className={`${o.icon} db-icon`} aria-hidden="true" />
                  {o.label}
                </a>
              </Button.Root>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
