import {
  importCisaKevCsv,
  syncCisaKevCatalogToVulnerabilities,
} from "@/lib/cisa-kev";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "CSV file is required." },
        { status: 400 },
      );
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        { message: "Please upload a CSV file." },
        { status: 400 },
      );
    }

    const csvText = await file.text();
    const imported = await importCisaKevCsv(csvText);
    const shouldSyncVulnerabilities =
      formData.get("syncVulnerabilities") === "true";
    const vulnerabilitySync = shouldSyncVulnerabilities
      ? await syncCisaKevCatalogToVulnerabilities()
      : null;

    return NextResponse.json({
      message: "CISA KEV CSV imported successfully.",
      imported,
      vulnerabilitySync,
    });
  } catch (error) {
    console.error("CISA KEV import error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to import CISA KEV CSV.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
