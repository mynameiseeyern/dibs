import * as Button from "@/components/ui/button";

/** The picked place, with a way to change it. Used on the new plan form and Edit plan. */
export function PlaceCard({ name, detail, onChange, changeLabel = "Change" }: { name: string; detail?: string | null; onChange?: () => void; changeLabel?: string }) {
  return (
    <div className="db-card place-card">
      <i className="ri-map-pin-fill db-icon" aria-hidden="true" />
      <div className="place-card__text">
        <span className="label-md">{name}</span>
        {detail ? <span className="paragraph-sm muted">{detail}</span> : null}
      </div>
      {onChange && (
        <Button.Root type="button" variant="neutral" mode="lighter" size="small" onClick={onChange}>
          {changeLabel}
        </Button.Root>
      )}
    </div>
  );
}
