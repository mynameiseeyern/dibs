"use client";

import { useState } from "react";
import * as Button from "@/components/ui/button";
import * as Modal from "@/components/ui/modal";
import { CircleAction } from "@/components/CircleAction";

export interface CalendarLinks {
  ics: string;
  google: string;
  outlook: string;
  office: string;
}

/**
 * Add to calendar: one button on the plan card, and the choices in a bottom sheet (Apple opens the
 * .ics straight into its add-event sheet; the others open their own add-event page).
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
    <>
      <CircleAction icon="ri-calendar-event-line" label="Calendar" onClick={() => setOpen(true)} />
      <Modal.Root open={open} onOpenChange={setOpen}>
        <Modal.Content>
          <Modal.Header title="Add to calendar" />
          <ul className="add-to-calendar__list">
            {options.map((o) => (
              <li key={o.label}>
                <Button.Root asChild mode="ghost" block>
                  <a className="add-to-calendar__option" href={o.href} {...(o.external ? { target: "_blank", rel: "noreferrer" } : {})} onClick={() => setOpen(false)}>
                    <i className={`${o.icon} db-icon`} aria-hidden="true" />
                    {o.label}
                  </a>
                </Button.Root>
              </li>
            ))}
          </ul>
        </Modal.Content>
      </Modal.Root>
    </>
  );
}
