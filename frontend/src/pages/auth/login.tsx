import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput } from "@/components/ui/input";
import { useAuth } from "@/stores/auth";
import { authService } from "@/services/auth";
import { firstErrorMessage } from "@/services/api";
import { GoogleIcon } from "./google-icon";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuth((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);

  async function continueWithGoogle() {
    setError(null);
    setGooglePending(true);
    try {
      // /api/auth/google returns JSON { url }, not an HTTP redirect.
      // Fetch it first, then navigate to the Google consent page.
      const { url } = await authService.googleUrl();
      window.location.href = url;
    } catch (err) {
      setError(firstErrorMessage(err));
      setGooglePending(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(email.trim(), password);
      const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";
      navigate(from, { replace: true });
    } catch (err) {
      setError(firstErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em] text-text-primary">
        Welcome back.
      </h1>
      <p className="mt-2 text-[14px] text-text-secondary">
        Log in to continue to your workspace.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      )}

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Email" htmlFor="login-email">
          <Input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10"
          />
        </Field>
        <Field label="Password" htmlFor="login-password">
          <PasswordInput
            id="login-password"
            required
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10"
          />
        </Field>

        <div className="flex items-center justify-between pt-0.5">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-text-secondary">
            <input type="checkbox" className="accent-accent" defaultChecked /> Keep me logged in
          </label>
          <Link
            to="/auth/forgot-password"
            className="text-[13px] font-medium text-accent hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button variant="primary" size="md" className="h-10 w-full" type="submit" disabled={pending}>
          {pending ? "Logging in..." : "Log in"}
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
        Don&rsquo;t have an account?{" "}
        <Link to="/auth/register" className="font-medium text-accent hover:underline">
          Create Account
        </Link>
      </p>
    </>
  );
}
