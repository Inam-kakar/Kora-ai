"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface LoginClientProps {
  googleEnabled: boolean;
  emailEnabled: boolean;
  emailDevMode: boolean;
}

export function LoginClient({
  googleEnabled,
  emailEnabled,
  emailDevMode,
}: LoginClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    if (!googleEnabled) {
      setMessage("Google sign-in is not configured.");
      return;
    }

    setLoading(true);
    setMessage(null);
    const response = await signIn("google", {
      callbackUrl: "/dashboard",
      redirect: false,
    });
    setLoading(false);

    if (response?.error) {
      setMessage(response.error);
      return;
    }

    router.push(response?.url ?? "/dashboard");
  };

  const signInWithEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!emailEnabled) {
      setMessage("Email sign-in is not configured.");
      return;
    }
    if (!email.trim()) {
      setMessage("Please provide an email address.");
      return;
    }

    setLoading(true);
    setMessage(null);
    const response = await signIn("email", {
      email,
      callbackUrl: "/dashboard",
      redirect: false,
    });
    setLoading(false);

    if (response?.error) {
      setMessage(response.error);
      return;
    }

    setMessage("Magic link sent. Check your inbox.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md space-y-5">
        <div className="space-y-1 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">KORA</p>
          <h1 className="text-2xl font-semibold text-slate-100">Sign in</h1>
          {!googleEnabled && !emailEnabled ? (
            <p className="text-xs text-rose-300">
              No login provider is configured. Set Google OAuth and/or email
              magic-link environment variables.
            </p>
          ) : null}
        </div>

        <Button
          className="w-full"
          onClick={signInWithGoogle}
          disabled={loading || !googleEnabled}
        >
          {googleEnabled ? "Sign in with Google" : "Google sign-in unavailable"}
        </Button>

        <form className="space-y-3" onSubmit={signInWithEmail}>
          <label className="block text-xs text-slate-400" htmlFor="email">
            Email magic link
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            placeholder="you@example.com"
            disabled={!emailEnabled || loading}
          />
          <Button className="w-full" type="submit" disabled={loading || !emailEnabled}>
            {emailEnabled ? "Send magic link" : "Email sign-in unavailable"}
          </Button>
          {emailDevMode ? (
            <p className="text-xs text-slate-400">
              Dev mode: magic-link URLs are printed in server logs.
            </p>
          ) : null}
        </form>

        {message ? <p className="text-center text-xs text-slate-300">{message}</p> : null}
      </Card>
    </div>
  );
}
