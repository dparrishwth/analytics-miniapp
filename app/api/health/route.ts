import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: {
      hasGA4: Boolean(process.env.GA4_PROPERTY_ID),
      hasBQ: Boolean(process.env.BIGQUERY_PROJECT_ID),
      hasSA: Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
    },
    ts: new Date().toISOString(),
  });
}
