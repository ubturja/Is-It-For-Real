"use client";

import { getAuthChrome } from "@isitfr/content-config";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

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

const inputClassName =
  "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

type SessionState = "loading" | "ok" | "missing";

export function ResetPasswordForm() {
  const router = useRouter();
  const chrome = getAuthChrome();
  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data, error: userError }) => {
      if (cancelled) {
        return;
      }
      setSessionState(
        userError || !data.user ? "missing" : "ok",
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError(chrome.reset.mismatch);
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        throw updateError;
      }
      router.replace("/train");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update password.",
      );
      setPending(false);
    }
  }

  if (sessionState === "loading") {
    return null;
  }

  if (sessionState === "missing") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl" role="heading" aria-level={1}>
            {chrome.reset.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm" role="status">
            {chrome.reset.missingSession}
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Link
            href="/login"
            prefetch={false}
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
          >
            {chrome.forgot.back}
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl" role="heading" aria-level={1}>
          {chrome.reset.title}
        </CardTitle>
        <CardDescription>{chrome.reset.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="new-password">{chrome.reset.password}</Label>
            <input
              id="new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">{chrome.reset.confirm}</Label>
            <input
              id="confirm-password"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className={inputClassName}
            />
          </div>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Working…" : chrome.reset.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
