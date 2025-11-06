"use client";

import { useEffect, useState } from "react";

type HealthResponse = {
  ok: boolean;
  env: {
    hasGA4: boolean;
    hasBQ: boolean;
    hasSA: boolean;
  };
  ts: string;
};

export default function HomePage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const response = await fetch("/api/health");
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const json = (await response.json()) as HealthResponse;
        setData(json);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchHealth();
  }, []);

  if (isLoading) {
    return <main className="p-6 font-mono">Loading...</main>;
  }

  if (error) {
    return (
      <main className="p-6 font-mono">
        <p>Error loading health check:</p>
        <pre>{error}</pre>
      </main>
    );
  }

  return (
    <main className="p-6 font-mono">
      <h1 className="text-xl mb-4">Analytics Mini App Health</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
