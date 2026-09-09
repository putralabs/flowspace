import { forwardRef, useId, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-md border border-border bg-surface px-3 text-sm text-text-primary transition-colors duration-150 hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        field,
        "h-9",
        error && "border-danger focus:border-danger focus:ring-danger/20",
        className,
      )}
      aria-invalid={error || undefined}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  error?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, ...props }, ref) => {
    const [show, setShow] = useState(false);
    const id = useId();
    return (
      <span className="relative block">
        <input
          ref={ref}
          type={show ? "text" : "password"}
          className={cn(
            field,
            "h-9 pr-10",
            error && "border-danger focus:border-danger focus:ring-danger/20",
            className,
          )}
          aria-invalid={error || undefined}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          aria-controls={id}
          className="absolute top-1/2 right-1 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-text-secondary transition-colors duration-150 hover:bg-surface-secondary hover:text-text-primary"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </span>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(field, "min-h-[80px] py-2", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

interface FieldWrapProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}

export function Field({ label, htmlFor, hint, children }: FieldWrapProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-[13px] font-medium text-text-primary"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-text-secondary">{hint}</p>}
    </div>
  );
}
