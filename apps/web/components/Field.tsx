import type { InputHTMLAttributes } from "react";

export function Field({
  label,
  hint,
  icon,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; icon?: string; name: string }) {
  const id = input.id ?? input.name;
  return (
    <div className="db-field">
      <label className="db-label" htmlFor={id}>
        {label}
      </label>
      <div className="db-input">
        {icon && <i className={`${icon} db-icon`} aria-hidden="true" />}
        <input id={id} aria-describedby={hint ? `${id}-hint` : undefined} {...input} />
      </div>
      {hint && (
        <p id={`${id}-hint`} className="db-hint">
          {hint}
        </p>
      )}
    </div>
  );
}

export function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="db-hint db-hint--error" role="alert">
      <i className="ri-error-warning-fill" aria-hidden="true" /> {error}
    </p>
  );
}
