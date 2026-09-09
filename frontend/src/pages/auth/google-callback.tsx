import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setToken } from "@/services/api";
import { useAuth } from "@/stores/auth";

/** Landing spot for the Google OAuth redirect carrying a Sanctum token. */
export function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setError("Login Google gagal atau dibatalkan.");
      return;
    }
    setToken(token);
    void useAuth
      .getState()
      .init()
      .then(() => navigate("/dashboard", { replace: true }));
  }, [params, navigate]);

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      {error ? (
        <>
          <p className="text-base font-semibold text-danger">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/auth/login")}
            className="cursor-pointer text-[13px] font-medium text-accent hover:underline"
          >
            Back to log in
          </button>
        </>
      ) : (
        <>
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" aria-hidden="true" />
          <p className="text-[13px] text-text-secondary">Signing you in with Google...</p>
        </>
      )}
    </div>
  );
}
