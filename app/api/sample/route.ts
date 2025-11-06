import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

type SampleRow = {
  date: string;
  medium: "direct" | "organic" | "paid" | "referral" | "social" | "email";
  sessions: number;
  users: number;
  pageviews: number;
  conversions: number;
  users_new: number;
  users_returning: number;
};

export async function GET() {
  const filePath = path.join(process.cwd(), "data", "sample_analytics.json");

  try {
    const fileContents = await fs.readFile(filePath, "utf-8");
    const rows = JSON.parse(fileContents) as SampleRow[];

    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load sample data";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
