"use client";

import { useCallback, useMemo, useState } from "react";

type AnalyticsRow = {
  date: string;
  sessions: number;
  users: number;
  pageviews: number;
  conversions: number;
  revenue: number;
};

type NumericField = Exclude<keyof AnalyticsRow, "date">;

type SampleResponse = {
  ok: boolean;
  rows: AnalyticsRow[];
};

function parseCsv(input: string): AnalyticsRow[] {
  const lines = input.trim().split(/\r?\n/);
  if (lines.length <= 1) {
    return [];
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows: AnalyticsRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(",").map((value) => value.trim());
    const record: Partial<AnalyticsRow> = {};

    headers.forEach((header, index) => {
      const raw = values[index] ?? "";
      if (header === "date") {
        record.date = raw;
      } else if (
        header === "sessions" ||
        header === "users" ||
        header === "pageviews" ||
        header === "conversions" ||
        header === "revenue"
      ) {
        record[header] = Number.parseFloat(raw) || 0;
      }
    });

    if (record.date) {
      rows.push({
        date: record.date,
        sessions: record.sessions ?? 0,
        users: record.users ?? 0,
        pageviews: record.pageviews ?? 0,
        conversions: record.conversions ?? 0,
        revenue: record.revenue ?? 0,
      });
    }
  }

  return rows;
}

function parseJson(input: string): AnalyticsRow[] {
  const data = JSON.parse(input) as unknown;
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((entry) => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }
      const record = entry as Record<string, unknown>;
      const date = typeof record.date === "string" ? record.date : "";
      const numberFields: NumericField[] = [
        "sessions",
        "users",
        "pageviews",
        "conversions",
        "revenue",
      ];

      const parsed: AnalyticsRow = {
        date,
        sessions: 0,
        users: 0,
        pageviews: 0,
        conversions: 0,
        revenue: 0,
      };

      numberFields.forEach((key) => {
        const value = record[key];
        parsed[key] = typeof value === "number" ? value : Number(value) || 0;
      });

      return parsed.date ? parsed : null;
    })
    .filter((row): row is AnalyticsRow => row !== null);
}

function parseInput(input: string): AnalyticsRow[] {
  if (!input.trim()) {
    return [];
  }

  try {
    return parseJson(input);
  } catch (error) {
    return parseCsv(input);
  }
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

export default function DashboardPage() {
  const [rawInput, setRawInput] = useState("");
  const [rows, setRows] = useState<AnalyticsRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  const handleParse = useCallback(() => {
    try {
      const parsed = parseInput(rawInput);
      if (!parsed.length) {
        throw new Error("No rows parsed. Please check your input format.");
      }
      setRows(parsed);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to parse the provided data.";
      setError(message);
      setRows([]);
    }
  }, [rawInput]);

  const handleUseSample = useCallback(async () => {
    setIsLoadingSample(true);
    try {
      const response = await fetch("/api/sample");
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const json = (await response.json()) as SampleResponse;
      if (!json.ok) {
        throw new Error("Sample data request returned an error");
      }
      setRows(json.rows);
      setRawInput(JSON.stringify(json.rows, null, 2));
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load sample data.";
      setError(message);
    } finally {
      setIsLoadingSample(false);
    }
  }, []);

  const totals = useMemo(() => {
    if (!rows.length) {
      return {
        sessions: 0,
        users: 0,
        pageviews: 0,
        conversions: 0,
        revenue: 0,
      };
    }

    return rows.reduce(
      (acc, row) => ({
        sessions: acc.sessions + row.sessions,
        users: acc.users + row.users,
        pageviews: acc.pageviews + row.pageviews,
        conversions: acc.conversions + row.conversions,
        revenue: acc.revenue + row.revenue,
      }),
      { sessions: 0, users: 0, pageviews: 0, conversions: 0, revenue: 0 }
    );
  }, [rows]);

  const conversionRate = useMemo(() => {
    if (!totals.sessions) return 0;
    return (totals.conversions / totals.sessions) * 100;
  }, [totals]);

  const chartPoints = useMemo(() => {
    if (!rows.length) return { sessions: "", conversions: "" };

    const width = 600;
    const height = 200;
    const padding = 24;
    const maxSessions = Math.max(...rows.map((row) => row.sessions));
    const maxConversions = Math.max(...rows.map((row) => row.conversions));
    const maxValue = Math.max(maxSessions, maxConversions, 1);
    const xStep = (width - padding * 2) / Math.max(rows.length - 1, 1);

    const mapPoints = (getValue: (row: AnalyticsRow) => number) =>
      rows
        .map((row, index) => {
          const x = padding + index * xStep;
          const value = getValue(row);
          const y = height - padding - (value / maxValue) * (height - padding * 2);
          return `${x},${y}`;
        })
        .join(" ");

    return {
      sessions: mapPoints((row) => row.sessions),
      conversions: mapPoints((row) => row.conversions),
    };
  }, [rows]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Demo Analytics Dashboard</h1>
            <p className="text-slate-400">
              Paste CSV or JSON data, or load the bundled sample dataset to explore
              key metrics quickly.
            </p>
          </div>
          <button
            type="button"
            onClick={handleUseSample}
            className="inline-flex items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400 disabled:opacity-50"
            disabled={isLoadingSample}
          >
            {isLoadingSample ? "Loading sample..." : "Use sample data"}
          </button>
        </header>

        <section className="grid gap-4 rounded-xl bg-slate-900 p-6 shadow-lg">
          <label htmlFor="data-input" className="text-sm font-medium text-slate-300">
            Paste CSV or JSON data
          </label>
          <textarea
            id="data-input"
            className="h-40 w-full rounded-lg border border-slate-700 bg-slate-950 p-4 font-mono text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            value={rawInput}
            onChange={(event) => setRawInput(event.target.value)}
            placeholder='[{"date": "2024-01-01", "sessions": 1200, ...}]'
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleParse}
              className="inline-flex items-center justify-center rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-400 hover:text-sky-200"
            >
              Analyze data
            </button>
            {error ? (
              <p className="text-sm text-rose-400">{error}</p>
            ) : (
              <p className="text-sm text-slate-500">
                Parsed rows: <span className="text-slate-200">{rows.length}</span>
              </p>
            )}
          </div>
        </section>

        {rows.length > 0 && (
          <div className="space-y-8">
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-900 p-4 shadow">
                <p className="text-sm text-slate-400">Sessions</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">
                  {formatNumber(totals.sessions)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-900 p-4 shadow">
                <p className="text-sm text-slate-400">Users</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">
                  {formatNumber(totals.users)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-900 p-4 shadow">
                <p className="text-sm text-slate-400">Conversions</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">
                  {formatNumber(totals.conversions)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-900 p-4 shadow">
                <p className="text-sm text-slate-400">Conversion rate</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">
                  {conversionRate.toFixed(2)}%
                </p>
              </div>
            </section>

            <section className="space-y-4 overflow-hidden rounded-xl bg-slate-900 p-6 shadow">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-100">Recent performance</h2>
                <span className="text-sm text-slate-400">Showing {rows.length} days</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800 text-sm">
                  <thead className="bg-slate-900/80 text-left text-slate-400">
                    <tr>
                      <th scope="col" className="px-4 py-2 font-medium">
                        Date
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium">
                        Sessions
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium">
                        Users
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium">
                        Conversions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {rows.map((row) => (
                      <tr key={row.date} className="hover:bg-slate-900/60">
                        <td className="whitespace-nowrap px-4 py-2 font-medium text-slate-100">
                          {row.date}
                        </td>
                        <td className="px-4 py-2">{formatNumber(row.sessions)}</td>
                        <td className="px-4 py-2">{formatNumber(row.users)}</td>
                        <td className="px-4 py-2">{formatNumber(row.conversions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-4 rounded-xl bg-slate-900 p-6 shadow">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-100">Sessions vs conversions</h2>
                <div className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-sky-400" /> Sessions
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-rose-400" /> Conversions
                  </span>
                </div>
              </div>
              <svg viewBox="0 0 600 200" className="h-48 w-full">
                <rect
                  x={0}
                  y={0}
                  width={600}
                  height={200}
                  className="fill-transparent stroke-slate-800"
                />
                <polyline
                  points={chartPoints.sessions}
                  className="fill-none stroke-sky-400"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points={chartPoints.conversions}
                  className="fill-none stroke-rose-400"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </section>

            <section className="space-y-4 rounded-xl bg-slate-900 p-6 shadow">
              <h2 className="text-lg font-semibold text-slate-100">Sessions vs conversions total</h2>
              <div className="space-y-3">
                {[
                  { label: "Sessions", value: totals.sessions, color: "bg-sky-500" },
                  { label: "Conversions", value: totals.conversions, color: "bg-rose-500" },
                ].map((entry) => (
                  <div key={entry.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <span>{entry.label}</span>
                      <span className="font-medium text-slate-100">
                        {formatNumber(entry.value)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800">
                      <div
                        className={`h-2 rounded-full ${entry.color}`}
                        style={{
                          width: `${
                            totals.sessions === 0
                              ? 0
                              : Math.min((entry.value / totals.sessions) * 100, 100)
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
