"use client";

import { useEffect, useState } from "react";

type ReportRow = {
  date: string;
  sessions: number;
  users: number;
};

type ApiResponse = {
  ok: boolean;
  rows?: ReportRow[];
  error?: string;
};

export default function Ga4DemoPage() {
  const [data, setData] = useState<ReportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadReport() {
      try {
        const response = await fetch("/api/ga4-demo", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const json: ApiResponse = await response.json();
        if (!json.ok) {
          throw new Error(json.error ?? "Unknown error from API");
        }

        if (isMounted) {
          setData(json.rows ?? []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : "Unknown error";
          setError(message);
          setData(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <p>Loading…</p>;
  }

  if (error) {
    return <p role="alert">Error: {error}</p>;
  }

  if (!data || data.length === 0) {
    return <p>No data available.</p>;
  }

  return (
    <div>
      <h1>GA4 Demo Sessions</h1>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Sessions</th>
            <th>Users</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.date}>
              <td>{row.date}</td>
              <td>{row.sessions}</td>
              <td>{row.users}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
