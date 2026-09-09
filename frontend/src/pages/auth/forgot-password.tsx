import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <>
      <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em] text-text-primary">
        Reset password
      </h1>
      <p className="mt-2 text-[14px] text-text-secondary">
        Enter your email and we&rsquo;ll send you a reset link.
      </p>

      {sent ? (
        <div className="mt-8 rounded-lg border border-border bg-surface p-4">
          <p className="text-[13px] font-medium text-text-primary">Check your inbox</p>
          <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
            If an account exists for that email, a reset link is on its way. It expires in 30 minutes.
          </p>
          <Link to="/auth/login" className="mt-3 inline-block text-[13px] font-medium text-accent hover:underline">
            Back to log in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <Field label="Email" htmlFor="forgot-email">
            <Input
              id="forgot-email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              className="h-10"
            />
          </Field>
          <Button variant="primary" size="md" className="h-10 w-full" type="submit">
            Send reset link
          </Button>
          <p className="text-[13px] text-text-secondary">
            Remembered it?{" "}
            <Link to="/auth/login" className="font-medium text-accent hover:underline">
              Log in
            </Link>
          </p>
        </form>
      )}
    </>
  );
}
