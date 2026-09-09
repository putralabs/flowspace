import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput } from "@/components/ui/input";
import { useAuth } from "@/stores/auth";
import { authService } from "@/services/auth";
import { firstErrorMessage } from "@/services/api";
import { GoogleIcon } from "./google-icon";

export function RegisterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const inviteToken = params.get("invite");
  const register = useAuth((s) => s.register);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);

  async function continueWithGoogle() {
    setServerError(null);
    setGooglePending(true);
    try {
      // /api/auth/google returns JSON { url }, not an HTTP redirect.
      // Fetch it first, then navigate to the Google consent page.
      const { url } = await authService.googleUrl();
      window.location.href = url;
    } catch (err) {
      setServerError(firstErrorMessage(err));
      setGooglePending(false);
    }
  }

  const nameEmpty = submitted && name.trim().length === 0;
  const emailEmpty = submitted && email.trim().length === 0;
  const emailInvalid = submitted && !emailEmpty && !/^\S+@\S+\.\S+$/.test(email.trim());
  const passwordEmpty = submitted && password.length === 0;
  const tooShort = submitted && !passwordEmpty && password.length < 8;
  const confirmEmpty = submitted && confirm.length === 0;
  const mismatch = !confirmEmpty && confirm.length > 0 && password !== confirm;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    if (
      name.trim().length === 0 ||
      email.trim().length === 0 ||
      !/^\S+@\S+\.\S+$/.test(email.trim()) ||
      password.length < 8 ||
      password !== confirm ||
      confirm.length === 0
    )
      return;

    setPending(true);
    try {
      await register(name.trim(), email.trim(), password, inviteToken);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setServerError(firstErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em] text-text-primary">
        Create your account
      </h1>
      <p className="mt-2 text-[14px] text-text-secondary">
        Start organizing your team&rsquo;s work in minutes.
      </p>

      {serverError && (
        <p role="alert" className="mt-4 rounded-md bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {serverError}
        </p>
      )}

      <form onSubmit={submit} noValidate className="mt-8 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Field label="Full name" htmlFor="reg-name">
              <Input
                id="reg-name"
                required
                autoComplete="name"
                placeholder="Your full name"
                error={nameEmpty}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10"
              />
            </Field>
            {nameEmpty && <p className="mt-1.5 text-[13px] text-danger">Full name is required.</p>}
          </div>
          <div>
            <Field label="Email" htmlFor="reg-email">
              <Input
                id="reg-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                error={emailEmpty || emailInvalid}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10"
              />
            </Field>
            {emailEmpty && <p className="mt-1.5 text-[13px] text-danger">Email is required.</p>}
            {emailInvalid && <p className="mt-1.5 text-[13px] text-danger">Enter a valid email address.</p>}
          </div>
        </div>

        <Field label="Password" htmlFor="reg-password">
          <>
            <PasswordInput
              id="reg-password"
              required
              autoComplete="new-password"
              placeholder="Create a password"
              error={passwordEmpty || tooShort}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10"
            />
            {passwordEmpty && (
              <p className="text-[13px] text-danger">Password is required.</p>
            )}
            {tooShort && (
              <p className="text-[13px] text-danger">Password must be at least 8 characters.</p>
            )}
          </>
        </Field>

        <Field label="Confirm password" htmlFor="reg-confirm">
          <>
            <PasswordInput
              id="reg-confirm"
              required
              autoComplete="new-password"
              placeholder="Repeat your password"
              error={confirmEmpty || mismatch}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-10"
            />
            {confirmEmpty && (
              <p className="text-[13px] text-danger">Please confirm your password.</p>
            )}
            {mismatch && (
              <p className="text-[13px] text-danger">Passwords don&rsquo;t match.</p>
            )}
          </>
        </Field>

        <Button variant="primary" size="md" className="h-10 w-full" type="submit" disabled={pending}>
          {pending ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="font-mono text-[10px] tracking-[0.14em] text-text-muted uppercase">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="secondary"
        size="md"
        className="h-10 w-full"
        onClick={continueWithGoogle}
        disabled={googlePending}
      >
        <GoogleIcon /> {googlePending ? "Connecting to Google..." : "Continue with Google"}
      </Button>

      <p className="mt-6 border-t border-border pt-5 text-center text-[13px] text-text-secondary">
        Already have an account?{" "}
        <Link to="/auth/login" className="font-medium text-accent hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
