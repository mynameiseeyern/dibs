import type { InputHTMLAttributes } from "react";
import * as Label from "@/components/ui/label";
import * as Input from "@/components/ui/input";
import * as Hint from "@/components/ui/hint";

export function Field({
  label,
  hint,
  icon,
  ...input
}: Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & { label: string; hint?: string; icon?: string; name: string }) {
  const id = input.id ?? input.name;
  return (
    <div className="flex flex-col gap-2">
      <Label.Root htmlFor={id}>{label}</Label.Root>
      <Input.Root>
        <Input.Wrapper>
          {icon && <Input.Icon as="i" className={icon} aria-hidden="true" />}
          <Input.Input id={id} aria-describedby={hint ? `${id}-hint` : undefined} {...input} />
        </Input.Wrapper>
      </Input.Root>
      {hint && <Hint.Root id={`${id}-hint`}>{hint}</Hint.Root>}
    </div>
  );
}

export function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <Hint.Root hasError role="alert">
      <Hint.Icon as="i" className="ri-error-warning-fill" aria-hidden="true" /> {error}
    </Hint.Root>
  );
}
