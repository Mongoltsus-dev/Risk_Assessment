import { getStoredCisaKevVulnerabilities } from "@/lib/cisa-kev";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CisaVulnerability {
  cveID: string;
  dateAdded: string;
  dueDate: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  notes?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "500", 10), 1),
      2000,
    );
    const realtime = ["1", "true", "yes"].includes(
      (searchParams.get("realtime") || "").toLowerCase(),
    );

    const storedVulnerabilities = realtime
      ? []
      : await getStoredCisaKevVulnerabilities(limit);
    if (!realtime && storedVulnerabilities.length > 0) {
      return NextResponse.json({
        vulnerabilities: storedVulnerabilities,
        count: storedVulnerabilities.length,
        source: "database",
        lastUpdated: new Date().toISOString(),
      });
    }

    const fetchOptions: RequestInit & { next?: { revalidate: number } } = {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    };

    if (realtime) {
      fetchOptions.cache = "no-store";
    } else {
      fetchOptions.next = { revalidate: 86400 };
    }

    const response = await fetch(
      "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
      fetchOptions,
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `CISA API error: ${response.statusText}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    const vulnerabilities: CisaVulnerability[] = data.vulnerabilities || [];

    // Sort by date added (most recent first)
    const sorted = vulnerabilities
      .sort(
        (a, b) =>
          new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime(),
      )
      .slice(0, limit);

    return NextResponse.json(
      {
        vulnerabilities: sorted,
        count: sorted.length,
        source: realtime ? "cisa-live" : "cisa-feed",
        lastUpdated: new Date().toISOString(),
      },
      realtime
        ? {
            headers: {
              "Cache-Control": "no-store, max-age=0",
            },
          }
        : undefined,
    );
  } catch (error) {
    console.error("Error fetching CISA data:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch CISA data",
      },
      { status: 500 },
    );
  }
}
