"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type AuthState = "idle" | "loading" | "ok" | "error";

export default function Home() {
  const searchParams = useSearchParams();
  const [authState, setAuthState] = useState<AuthState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const query = useMemo(() => {
    const token = searchParams.get("token");
    const nonce = searchParams.get("nonce");
    const timestamp = searchParams.get("timestamp");
    return { token, nonce, timestamp };
  }, [searchParams]);

  useEffect(() => {
    const { token, nonce, timestamp } = query;
    if (!token || !nonce || !timestamp) {
      setAuthState("error");
      setErrorMessage("missing parameters");
      return;
    }
    const controller = new AbortController();
    const validate = async () => {
      setAuthState("loading");
      try {
        const qs = new URLSearchParams({ token, nonce, timestamp });
        const res = await fetch(`/api/iframe-auth?${qs.toString()}`, {
          method: "GET",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          setAuthState("error");
          setErrorMessage(data?.error || "unauthorized");
          return;
        }
        setAuthState("ok");
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setAuthState("error");
          setErrorMessage("network error");
        }
      }
    };
    validate();
    return () => controller.abort();
  }, [query]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-3">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-base">Zuno Meme • Widget</CardTitle>
        </CardHeader>
        <CardContent>
          {authState === "loading" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Spinner className="h-5 w-5" />
              <p className="text-sm text-muted-foreground">loading…</p>
            </div>
          )}
          {authState === "error" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-sm font-medium text-destructive">
                {errorMessage}
              </p>
              <Button size="sm" onClick={() => window.location.reload()}>
                retry
              </Button>
            </div>
          )}
          {authState === "ok" && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Welcome</p>
                <p className="text-sm">This is the embedded experience.</p>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" size="sm">
                  do action
                </Button>
                <Button variant="secondary" size="sm">
                  dismiss
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
