import { useEffect, useRef, useState, type FormEvent } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput } from "@/components/ui/input";
import { Camera } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { authService } from "@/services/auth";
import { firstErrorMessage } from "@/services/api";
import { initialsOf } from "@/lib/constants";
import { useAuth } from "@/stores/auth";
import { useToast } from "@/components/ui/toast";

function PhotoPicker() {
  const inputRef = useRef<HTMLInputElement>(null);
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const { toast } = useToast();
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => authService.updateProfilePicture(file),
    onSuccess: (res) => {
      setUser(res.user);
      if (preview) {
        URL.revokeObjectURL(preview);
        setPreview(null);
      }
      toast("success", "Profile photo updated");
    },
    onError: (err) => toast("error", firstErrorMessage(err)),
  });

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast("error", "Gunakan file PNG atau JPG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast("error", "Ukuran foto maksimal 2 MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(url);
    uploadMutation.mutate(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  const src = preview ?? user?.avatar_url ?? null;

  return (
    <span className="relative inline-flex">
      <Avatar
        initials={initialsOf(user?.name ?? "?")}
        seed={user?.name ?? "?"}
        src={src}
        alt={user?.name ?? "Profile photo"}
        size="xl"
      />
      {uploadMutation.isPending && (
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40" aria-label="Uploading">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
        </span>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="Change profile photo"
        title="Change profile photo"
        disabled={uploadMutation.isPending}
        className="absolute -right-1 -bottom-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-accent text-white shadow-xs transition-colors duration-150 hover:bg-accent-hover disabled:opacity-60"
      >
        <Camera size={13} />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </span>
  );
}

export function ProfileSettings() {
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const { toast } = useToast();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [jobTitle, setJobTitle] = useState(user?.job_title ?? "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const profileMutation = useMutation({
    mutationFn: () =>
      authService.updateProfile({
        name: name.trim(),
        email: email.trim(),
        job_title: jobTitle.trim() || null,
      }),
    onSuccess: (res) => {
      setUser(res.user);
      toast("success", "Profile updated");
    },
    onError: (err) => toast("error", firstErrorMessage(err)),
  });

  const passwordMutation = useMutation({
    mutationFn: () =>
      authService.updatePassword({
        current_password: currentPassword,
        password,
        password_confirmation: confirm,
      }),
    onSuccess: () => {
      toast("success", "Password updated");
      setCurrentPassword("");
      setPassword("");
      setConfirm("");
      setSubmitted(false);
    },
    onError: (err) => toast("error", firstErrorMessage(err)),
  });

  const passwordEmpty = submitted && password.length === 0;
  const tooShort = submitted && !passwordEmpty && password.length < 8;
  const mismatch = submitted && confirm.length > 0 && password !== confirm;

  function submitProfile(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast("error", "Name and email are required.");
      return;
    }
    profileMutation.mutate();
  }

  function submitPassword(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!currentPassword || password.length < 8 || password !== confirm) return;
    passwordMutation.mutate();
  }

  return (
    <div className="max-w-lg space-y-8">
      <section aria-label="Profile photo and name">
        <div className="flex items-center gap-4">
          <PhotoPicker />
          <p className="text-xs leading-relaxed text-text-secondary">
            Click the camera to upload a new photo.
            <br />
            PNG or JPG, up to 2 MB.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submitProfile}>
          <Field label="Full name" htmlFor="set-name">
            <Input id="set-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Email" htmlFor="set-email" hint="Used for sign-in and notifications.">
            <Input id="set-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Role" htmlFor="set-role" hint="Shown to teammates on tasks you create.">
            <Input id="set-role" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Product Engineer" />
          </Field>
          <Button variant="primary" size="md" type="submit" disabled={profileMutation.isPending}>
            {profileMutation.isPending ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </section>

      <section aria-label="Change password" className="border-t border-border pt-6">
        <h2 className="text-[13px] font-semibold text-text-primary">Change Password</h2>
        <form onSubmit={submitPassword} noValidate className="mt-3 max-w-sm space-y-4">
          <Field label="Current password" htmlFor="cur-pass">
            <PasswordInput
              id="cur-pass"
              autoComplete="current-password"
              error={submitted && currentPassword.length === 0}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>
          {submitted && currentPassword.length === 0 && (
            <p className="text-[13px] text-danger">Current password is required.</p>
          )}
          <Field label="New password" htmlFor="new-pass">
            <>
              <PasswordInput
                id="new-pass"
                autoComplete="new-password"
                error={passwordEmpty || tooShort}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {passwordEmpty && (
                <p className="text-[13px] text-danger">New password is required.</p>
              )}
              {tooShort && (
                <p className="text-[13px] text-danger">
                  New password must be at least 8 characters.
                </p>
              )}
            </>
          </Field>
          <Field label="Confirm new password" htmlFor="confirm-pass">
            <>
              <PasswordInput
                id="confirm-pass"
                autoComplete="new-password"
                error={mismatch}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {mismatch && (
                <p className="text-[13px] text-danger">Passwords don&rsquo;t match.</p>
              )}
            </>
          </Field>
          <Button variant="secondary" size="md" type="submit" disabled={passwordMutation.isPending}>
            {passwordMutation.isPending ? "Updating..." : "Update password"}
          </Button>
        </form>
      </section>

      <section aria-label="Danger zone" className="border-t border-border pt-6">
        <h2 className="text-[13px] font-semibold text-danger">Danger zone</h2>
        <p className="mt-1 max-w-md text-xs leading-relaxed text-text-secondary">
          Deleting your account removes your personal data. Workspaces owned by others are not affected.
        </p>
        <Button variant="danger" size="sm" className="mt-3">Delete account</Button>
      </section>
    </div>
  );
}
