"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type ComponentType } from "react";

type Medium = "direct" | "organic" | "paid" | "referral" | "social" | "email";

type SampleRow = {
  date: string;
  medium: Medium;
  sessions: number;
  users: number;
  pageviews: number;
  conversions: number;
  users_new: number;
  users_returning: number;
};

type DateRange = 30 | 60 | 90;

const rangeOptions: DateRange[] = [30, 60, 90];
const mediumOrder: Medium[] = [
  "direct",
  "organic",
  "paid",
  "referral",
  "social",
  "email",
];

const mediumColors: Record<Medium, string> = {
  direct: "#22c55e",
  organic: "#0ea5e9",
  paid: "#ef4444",
  referral: "#f59e0b",
  social: "#8b5cf6",
  email: "#14b8a6",
};

const pieColors = {
  new: "#ef4444",
  returning: "#22c55e",
};

const AreaChart = dynamic(
  () =>
    import("recharts").then(
      (mod) => mod.AreaChart as unknown as ComponentType<Record<string, unknown>>
    ),
  { ssr: false }
);
const Area = dynamic(
  () =>
    import("recharts").then(
      (mod) => mod.Area as unknown as ComponentType<Record<string, unknown>>
    ),
  { ssr: false }
);
const BarChart = dynamic(
  () =>
    import("recharts").then(
      (mod) => mod.BarChart as unknown as ComponentType<Record<string, unknown>>
    ),
  { ssr: false }
);
const Bar = dynamic(
  () =>
    import("recharts").then(
      (mod) => mod.Bar as unknown as ComponentType<Record<string, unknown>>
    ),
  { ssr: false }
);
const LineChart = dynamic(
  () =>
    import("recharts").then(
      (mod) => mod.LineChart as unknown as ComponentType<Record<string, unknown>>
    ),
  { ssr: false }
);
const Line = dynamic(
  () =>
    import("recharts").then(
      (mod) => mod.Line as unknown as ComponentType<Record<string, unknown>>
    ),
  { ssr: false }
);
const PieChart = dynamic(
  () =>
    import("recharts").then(
      (mod) => mod.PieChart as unknown as ComponentType<Record<string, unknown>>
    ),
  { ssr: false }
);
const Pie = dynamic(
  () =>
    import("recharts").then(
      (mod) => mod.Pie as unknown as ComponentType<Record<string, unknown>>
    ),
  { ssr: false }
);
const Cell = dynamic(
  () =>
    import("recharts").then(
      (mod) => mod.Cell as unknown as ComponentType<Record<string, unknown>>
    ),
  { ssr: false }
);
const ResponsiveContainer = dynamic(
  () =>
    import("recharts").then(
      (mod) =>
        mod.ResponsiveContainer as unknown as ComponentType<Record<string, unknown>>
    ),
  { ssr: false }
);
const Tooltip = dynamic(
  () =>
    import("recharts").then(
      (mod) => mod.Tooltip as unknown as ComponentType<Record<string, unknown>>
    ),
  { ssr: false }
);
const XAxis = dynamic(
  () =>
    import("recharts").then(
      (mod) => mod.XAxis as unknown as ComponentType<Record<string, unknown>>
    ),
  { ssr: false }
);
const YAxis = dynamic(
  () =>
    import("recharts").then(
      (mod) => mod.YAxis as unknown as ComponentType<Record<string, unknown>>
    ),
  { ssr: false }
);
const Legend = dynamic(
  () =>
    import("recharts").then(
      (mod) => mod.Legend as unknown as ComponentType<Record<string, unknown>>
    ),
  { ssr: false }
);

type Totals = {
  sessions: number;
  users: number;
  pageviews: number;
  conversions: number;
  users_new: number;
  users_returning: number;
};

type SparklineRow = {
  date: string;
  sessions: number;
  pagesPerVisit: number;
  users: number;
};

const mediumsSet = new Set<Medium>(mediumOrder);

const normalizeRow = (row: any): SampleRow => {
  const medium: Medium = mediumsSet.has(row.medium)
    ? row.medium
    : "direct";

  const parseNumber = (value: unknown) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
  };

  const users = parseNumber(row.users);
  const usersNewRaw = parseNumber(row.users_new);
  const usersNew = Math.min(users, Math.max(0, usersNewRaw));

  return {
    date: String(row.date),
    medium,
    sessions: Math.max(0, parseNumber(row.sessions)),
    users,
    pageviews: Math.max(0, parseNumber(row.pageviews)),
    conversions: Math.max(0, parseNumber(row.conversions)),
    users_new: usersNew,
    users_returning: Math.max(0, users - usersNew),
  };
};

const aggregateTotals = (rows: SampleRow[]): Totals => {
  return rows.reduce<Totals>(
    (acc, row) => {
      acc.sessions += row.sessions;
      acc.users += row.users;
      acc.pageviews += row.pageviews;
      acc.conversions += row.conversions;
      acc.users_new += row.users_new;
      acc.users_returning += row.users_returning;
      return acc;
    },
    {
      sessions: 0,
      users: 0,
      pageviews: 0,
      conversions: 0,
      users_new: 0,
      users_returning: 0,
    }
  );
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
};

const formatPercent = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "0.0%";
  }

  return `${value.toFixed(1)}%`;
};

const computeDelta = (current: number, previous: number) => {
  if (previous <= 0) {
    return {
      percent: current > 0 ? 100 : 0,
      direction: current >= 0 ? "up" : "down",
    } as const;
  }

  const change = ((current - previous) / previous) * 100;

  return {
    percent: change,
    direction: change >= 0 ? "up" : "down",
  } as const;
};

const DashboardPage = () => {
  const [rows, setRows] = useState<SampleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange>(30);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/sample", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = await response.json();
        if (!payload?.ok || !Array.isArray(payload.rows)) {
          throw new Error("Unexpected response format");
        }

        const normalized = payload.rows.map(normalizeRow);
        if (mounted) {
          setRows(normalized);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Unable to load analytics data"
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, []);

  const sortedRows = useMemo(() => {
    return [...rows].sort(
      (a, b) => Date.parse(a.date) - Date.parse(b.date)
    );
  }, [rows]);

  const { filteredRows, previousRows } = useMemo(() => {
    if (!sortedRows.length) {
      return { filteredRows: [] as SampleRow[], previousRows: [] as SampleRow[] };
    }

    const uniqueDates: string[] = [];
    const seenDates = new Set<string>();
    for (const row of sortedRows) {
      if (!seenDates.has(row.date)) {
        seenDates.add(row.date);
        uniqueDates.push(row.date);
      }
    }

    const currentStartIndex = Math.max(uniqueDates.length - range, 0);
    const previousStartIndex = Math.max(currentStartIndex - range, 0);

    const currentDateSet = new Set(uniqueDates.slice(currentStartIndex));
    const previousDateSet = new Set(
      uniqueDates.slice(previousStartIndex, currentStartIndex)
    );

    return {
      filteredRows: sortedRows.filter((row) => currentDateSet.has(row.date)),
      previousRows: sortedRows.filter((row) => previousDateSet.has(row.date)),
    };
  }, [sortedRows, range]);

  const totals = useMemo(() => aggregateTotals(filteredRows), [filteredRows]);
  const previousTotals = useMemo(
    () => aggregateTotals(previousRows),
    [previousRows]
  );

  const pagesPerVisit = totals.sessions
    ? totals.pageviews / totals.sessions
    : 0;
  const previousPagesPerVisit = previousTotals.sessions
    ? previousTotals.pageviews / previousTotals.sessions
    : 0;

  const conversionRate = totals.sessions
    ? (totals.conversions / totals.sessions) * 100
    : 0;

  const sparklineRows = useMemo<SparklineRow[]>(() => {
    const source = filteredRows.length ? filteredRows : sortedRows;
    const recent = source.slice(-30);
    return recent.map((row) => ({
      date: row.date.slice(5),
      sessions: row.sessions,
      pagesPerVisit: row.sessions ? row.pageviews / row.sessions : 0,
      users: row.users,
    }));
  }, [filteredRows, sortedRows]);

  const monthlySeries = useMemo(() => {
    const map = new Map<
      number,
      {
        month: string;
        order: number;
      } & Record<Medium, number>
    >();

    filteredRows.forEach((row) => {
      const date = new Date(`${row.date}T00:00:00`);
      const key = date.getFullYear() * 12 + date.getMonth();
      const existing = map.get(key) ?? {
        month: date.toLocaleString("en-US", { month: "short" }),
        order: key,
        direct: 0,
        organic: 0,
        paid: 0,
        referral: 0,
        social: 0,
        email: 0,
      };

      existing[row.medium] += row.sessions;
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  }, [filteredRows]);

  const pieData = useMemo(() => {
    const totalNew = filteredRows.reduce((sum, row) => sum + row.users_new, 0);
    const totalReturning = filteredRows.reduce(
      (sum, row) => sum + row.users_returning,
      0
    );

    const totalUsers = totalNew + totalReturning || 1;

    return [
      {
        name: "New",
        value: totalNew,
        color: pieColors.new,
        percent: (totalNew / totalUsers) * 100,
      },
      {
        name: "Returning",
        value: totalReturning,
        color: pieColors.returning,
        percent: (totalReturning / totalUsers) * 100,
      },
    ];
  }, [filteredRows]);

  const visitsDelta = computeDelta(totals.sessions, previousTotals.sessions);
  const pagesPerVisitDelta = computeDelta(
    pagesPerVisit,
    previousPagesPerVisit
  );
  const uniqueVisitorsDelta = computeDelta(
    totals.users,
    previousTotals.users
  );

  const renderDelta = (
    label: string,
    delta: ReturnType<typeof computeDelta>,
    positiveColor = "text-emerald-400",
    negativeColor = "text-rose-400"
  ) => {
    const percent = Math.abs(delta.percent);
    const direction = delta.direction === "up";
    const colorClass = direction ? positiveColor : negativeColor;
    const arrow = direction ? "▲" : "▼";

    return (
      <span className={`text-sm font-medium ${colorClass}`}>
        {arrow} {percent.toFixed(1)}% vs previous {label}
      </span>
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 sm:p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold tracking-[0.35em] text-slate-200">
            GOOGLE ANALYTICS REPORT
          </h1>
          <div className="flex items-center gap-2">
            {rangeOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRange(option)}
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  range === option
                    ? "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                    : "border-slate-700 bg-slate-800 text-slate-300 hover:border-emerald-400/60 hover:text-emerald-200"
                }`}
              >
                Last {option} days
              </button>
            ))}
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <span className="text-sm uppercase tracking-[0.3em] text-slate-400">
              Loading dashboard…
            </span>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-100">
            {error}
          </div>
        ) : !filteredRows.length ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
            No analytics data available for the selected range.
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <section className="grid gap-6 lg:grid-cols-3">
              <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/20">
                <div className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Total Visits
                  </span>
                  <span className="text-4xl font-semibold text-slate-50">
                    {formatNumber(totals.sessions)}
                  </span>
                  {renderDelta(`${range}d`, visitsDelta)}
                  <span className="text-sm text-slate-400">
                    Conversion rate {formatPercent(conversionRate)}
                  </span>
                </div>
                <div className="h-24 pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineRows} margin={{ top: 8, right: 0, left: -22, bottom: 0 }}>
                      <defs>
                        <linearGradient id="visitsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.7} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #1e293b",
                          borderRadius: 8,
                          color: "#f8fafc",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="sessions"
                        stroke="#22c55e"
                        strokeWidth={2}
                        fill="url(#visitsGradient)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/20 lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Visits by Medium
                  </span>
                  <span className="text-xs text-slate-400">
                    Monthly stacked sessions
                  </span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlySeries}>
                      <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} />
                      <YAxis
                        tickFormatter={(value) => formatNumber(value)}
                        stroke="#94a3b8"
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value: number, name) => [
                          formatNumber(value),
                          name,
                        ]}
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #1e293b",
                          borderRadius: 8,
                          color: "#f8fafc",
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        wrapperStyle={{ color: "#e2e8f0", fontSize: 12 }}
                      />
                      {mediumOrder.map((medium) => (
                        <Bar
                          key={medium}
                          dataKey={medium}
                          stackId="sessions"
                          fill={mediumColors[medium]}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/20">
                <div className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Pages per Visit
                  </span>
                  <span className="text-4xl font-semibold text-slate-50">
                    {pagesPerVisit.toFixed(2)}
                  </span>
                  {renderDelta(`${range}d`, pagesPerVisitDelta)}
                </div>
                <div className="h-24 pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineRows} margin={{ top: 8, right: 0, left: -22, bottom: 0 }}>
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <Tooltip
                        formatter={(value: number) => value.toFixed(2)}
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #1e293b",
                          borderRadius: 8,
                          color: "#f8fafc",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="pagesPerVisit"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/20">
                <div className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Unique Visitors
                  </span>
                  <span className="text-4xl font-semibold text-slate-50">
                    {formatNumber(totals.users)}
                  </span>
                  {renderDelta(`${range}d`, uniqueVisitorsDelta)}
                </div>
                <div className="h-24 pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineRows} margin={{ top: 8, right: 0, left: -22, bottom: 0 }}>
                      <defs>
                        <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #1e293b",
                          borderRadius: 8,
                          color: "#f8fafc",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="users"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        fill="url(#visitorsGradient)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/20">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    New vs Returning
                  </span>
                  <span className="text-xs text-slate-400">
                    Share of visitors
                  </span>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={4}
                        stroke="#0f172a"
                        label={({ percent }) => `${Math.round(percent * 100)}%`}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          `${formatNumber(value)} visitors`,
                          name,
                        ]}
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #1e293b",
                          borderRadius: 8,
                          color: "#f8fafc",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-col gap-2 text-sm text-slate-300">
                  {pieData.map((segment) => (
                    <div key={segment.name} className="flex items-center gap-3">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: segment.color }}
                      />
                      <span className="flex-1">
                        {segment.name} Visitors
                      </span>
                      <span>{segment.percent.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
};

export default DashboardPage;
