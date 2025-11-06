import { NextResponse } from "next/server";

type EnvFlags = {
  GA4_PROPERTY_ID: boolean;
  BIGQUERY_PROJECT_ID: boolean;
  GOOGLE_APPLICATION_CREDENTIALS_JSON: boolean;
};

function getEnvFlags(): EnvFlags {
  return {
    GA4_PROPERTY_ID: Boolean(process.env.GA4_PROPERTY_ID),
    BIGQUERY_PROJECT_ID: Boolean(process.env.BIGQUERY_PROJECT_ID),
    GOOGLE_APPLICATION_CREDENTIALS_JSON: Boolean(
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    ),
  };
}

export async function GET() {
  const env = getEnvFlags();

  return NextResponse.json({
    ok: true,
    env,
  });
}
