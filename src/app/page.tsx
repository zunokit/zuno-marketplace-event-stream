"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EventFeed } from "@/components/events/event-feed";

type AuthState = "idle" | "loading" | "ok" | "error";

function HomeContent() {
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

  // Loading state
  if (authState === "loading") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-3">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <CardTitle className="text-base">Zuno Marketplace Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-6">
              <Spinner className="h-5 w-5" />
              <p className="text-sm text-muted-foreground">Authenticating...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (authState === "error") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-3">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <CardTitle className="text-base">Zuno Marketplace Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-sm font-medium text-destructive">
                {errorMessage}
              </p>
              <Button size="sm" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authenticated - show event feed
  return (
    <div className="min-h-[100dvh] w-full p-3">
      <Card className="w-full h-[calc(100dvh-1.5rem)]">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Zuno Marketplace Events</CardTitle>
        </CardHeader>
        <CardContent className="p-0 h-[calc(100%-4rem)]">
          <EventFeed limit={50} autoScroll />
        </CardContent>
      </Card>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center">
          <Spinner className="h-6 w-6" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
