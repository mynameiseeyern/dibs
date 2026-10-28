import type { InputHTMLAttributes } from "react";
import * as Label from "@/components/ui/label";
import * as Input from "@/components/ui/input";
import * as Hint from "@/components/ui/hint";

/**
 * A labelled text field. `error` shows under the field, in place of the hint, and marks the
 * field invalid so screen readers say why.
 */
export function Field({
  label,
  hint,
  icon,
  error,
  ...input
}: Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & { label: string; hint?: string; icon?: string; error?: string; name: string }) {
  const id = input.id ?? input.name;
  const note = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-2">
      <Label.Root htmlFor={id}>{label}</Label.Root>
      <Input.Root hasError={Boolean(error)}>
        <Input.Wrapper>
          {icon && <Input.Icon as="i" className={icon} aria-hidden="true" />}
          <Input.Input id={id} aria-describedby={note} aria-invalid={error ? true : undefined} {...input} />
        </Input.Wrapper>
      </Input.Root>
      {error ? <FieldError id={`${id}-error`} error={error} /> : hint && <Hint.Root id={`${id}-hint`}>{hint}</Hint.Root>}
    </div>
  );
}

/** The message under a field that needs fixing. */
export function FieldError({ error, id }: { error?: string; id?: string }) {
  if (!error) return null;
  return (
    <Hint.Root hasError id={id}>
      <Hint.Icon as="i" className="ri-error-warning-fill" aria-hidden="true" /> {error}
    </Hint.Root>
  );
}

/** A problem that isn't about one field (Dibby's down, couldn't save). Announced as it appears. */
export function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <Hint.Root hasError role="alert">
      <Hint.Icon as="i" className="ri-error-warning-fill" aria-hidden="true" /> {error}
    </Hint.Root>
  );
}
