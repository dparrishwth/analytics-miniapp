import { NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

type GaCredentials = {
  client_email?: string;
  private_key?: string;
};

type ReportRow = {
  date: string;
  sessions: number;
  users: number;
};

export async function GET() {
  try {
    const propertyId = process.env.GA4_PROPERTY_ID;
    if (!propertyId) {
      throw new Error("Missing GA4_PROPERTY_ID environment variable");
    }

    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!credentialsJson) {
      throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable");
    }

    let credentials: GaCredentials;
    try {
      credentials = JSON.parse(credentialsJson) as GaCredentials;
    } catch (error) {
      throw new Error("Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON value; must be valid JSON");
    }

    const { client_email, private_key } = credentials;
    if (!client_email || !private_key) {
      throw new Error("Service account credentials must include client_email and private_key");
    }

    const client = new BetaAnalyticsDataClient({
      credentials: { client_email, private_key },
    });

    const [report] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: "7daysAgo",
          endDate: "yesterday",
        },
      ],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }, { name: "totalUsers" }],
    });

    const rows: ReportRow[] = (report.rows ?? []).map((row) => {
      const date = row.dimensionValues?.[0]?.value ?? "";
      const sessionsValue = row.metricValues?.[0]?.value ?? "0";
      const usersValue = row.metricValues?.[1]?.value ?? "0";

      return {
        date,
        sessions: Number.parseInt(sessionsValue, 10) || 0,
        users: Number.parseInt(usersValue, 10) || 0,
      };
    });

    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
