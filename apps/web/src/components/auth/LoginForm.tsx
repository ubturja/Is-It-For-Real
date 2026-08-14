"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/supabase/profile";

type Mode = "signin" | "signup";

type LoginFormProps = {
  nextPath: string;
  initialError?: string | null;
};

export function LoginForm({ nextPath, initialError }: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        });
        if (signUpError) {
          throw signUpError;
        }
        if (data.session?.user) {
          await ensureProfile(supabase, data.session.user.id);
          router.replace(nextPath);
          router.refresh();
          return;
        }
        setMessage("Check your email to confirm your account, then sign in.");
        return;
      }

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        throw signInError;
      }
      if (!data.user) {
        throw new Error("Sign-in succeeded but no user was returned.");
      }

      await ensureProfile(supabase, data.user.id);
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setPending(false);
    }
  }

  async function handleGoogle() {
    setPending(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      if (oauthError) {
        throw oauthError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl" role="heading" aria-level={1}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </CardTitle>
        <CardDescription>
          Train requires an account. Crisis help at /help never does.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={handleEmailAuth}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            />
          </div>

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="text-muted-foreground text-sm" role="status">
              {message}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending
              ? "Working…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </Button>
        </form>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <div className="border-border w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card text-muted-foreground px-2">or</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={pending}
          onClick={handleGoogle}
        >
          Continue with Google
        </Button>
      </CardContent>

      <CardFooter className="justify-center">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
          onClick={() => {
            setMode((current) => (current === "signin" ? "signup" : "signin"));
            setError(null);
            setMessage(null);
          }}
        >
          {mode === "signin"
            ? "Need an account? Create one"
            : "Already have an account? Sign in"}
        </button>
      </CardFooter>
    </Card>
  );
}
