"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ExternalLink, Flame, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

interface CisaVulnerability {
  cveID: string;
  dateAdded: string;
  dueDate: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  notes?: string;
}

interface CisaTrendingRisksProps {
  limit?: number;
}

export default function CisaTrendingRisks({
  limit = 5,
}: CisaTrendingRisksProps) {
  const [vulnerabilities, setVulnerabilities] = useState<CisaVulnerability[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const fetchCisaData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch from our API endpoint
        const response = await fetch("/api/cisa-risks");

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        const vulnerabilitiesData: CisaVulnerability[] =
          data.vulnerabilities || [];

        // Take top items (already sorted by server)
        const topItems = vulnerabilitiesData.slice(0, limit);

        setVulnerabilities(topItems);
        setLastUpdated(new Date());
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch CISA data",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCisaData();

    // Refresh every 24 hours
    const interval = setInterval(fetchCisaData, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [limit]);

  if (loading) {
    return (
      <Card className="border-amber-500/30 shadow-lg animate-fade-in-up">
        <CardHeader className="pb-4 border-b border-amber-500/20">
          <CardTitle className="text-base flex items-center gap-2 bg-linear-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            <TrendingUp className="w-4 h-4 text-orange-600" />
            Trending Cybersecurity Risks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/30 shadow-lg animate-fade-in-up">
        <CardHeader className="pb-4 border-b border-red-500/20">
          <CardTitle className="text-base flex items-center gap-2 bg-linear-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            Trending Risks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-red-700 dark:text-red-300">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Unable to load CISA data</p>
              <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">
                {error}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/30 shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in-up">
      <CardHeader className="pb-4 border-b border-amber-500/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 bg-linear-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            <Flame className="w-4 h-4 text-orange-600" />
            Trending Cybersecurity Risks (CISA)
          </CardTitle>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground bg-white/50 dark:bg-slate-950/50 px-2 py-1 rounded">
              Updated {lastUpdated.toLocaleDateString()}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {vulnerabilities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent vulnerabilities found
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-4 font-medium">
              Most recently exploited vulnerabilities from CISA's Known
              Exploited Vulnerabilities catalog
            </p>
            <div className="space-y-2">
              {vulnerabilities.map((vuln) => {
                const daysUntilDue = vuln.dueDate
                  ? Math.floor(
                      (new Date(vuln.dueDate).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24),
                    )
                  : null;
                const isUrgent = daysUntilDue !== null && daysUntilDue < 30;

                return (
                  <div
                    key={vuln.cveID}
                    className={`rounded-lg border p-3 transition-all duration-300 ${
                      isUrgent
                        ? "border-red-500/40 bg-linear-to-r from-red-500/12 to-rose-500/12 hover:from-red-500/20 hover:to-rose-500/20 shadow-md hover:shadow-lg hover-glow"
                        : "border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-100/30 dark:hover:bg-slate-800/30 shadow-sm hover:shadow-md hover-glow"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <a
                            href={`https://nvd.nist.gov/vuln/detail/${vuln.cveID}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {vuln.cveID}
                          </a>
                          <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 border text-xs">
                            Exploited
                          </Badge>
                          {isUrgent && (
                            <Badge className="bg-red-500/10 text-red-600 border-red-500/20 border text-xs font-bold animate-pulse">
                              Due Soon
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">
                          {vuln.vulnerabilityName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">
                            {vuln.vendorProject}
                          </span>
                          {vuln.product && ` • ${vuln.product}`}
                        </p>
                      </div>
                      <a
                        href={`https://nvd.nist.gov/vuln/detail/${vuln.cveID}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="View on NVD"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Added: {new Date(vuln.dateAdded).toLocaleDateString()}
                      </span>
                      {daysUntilDue !== null && (
                        <span
                          className={
                            isUrgent
                              ? "text-red-600 dark:text-red-400 font-medium"
                              : ""
                          }
                        >
                          Due:{" "}
                          {daysUntilDue > 0 ? `${daysUntilDue}d` : "Overdue"}
                        </span>
                      )}
                    </div>
                    {vuln.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        {vuln.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="pt-2 border-t flex justify-center">
              <a
                href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost" size="sm" className="text-xs">
                  View Full CISA Catalog{" "}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </a>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
