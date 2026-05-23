"use client";

import { useAuth } from "@/app/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Activity,
  AlertTriangle,
  Bug,
  CalendarDays,
  Clock,
  Database,
  ExternalLink,
  FilterX,
  Link2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Vulnerability = {
  id: number;
  asset_id: number | null;
  threat_id: number | null;
  cve_id: string | null;
  title: string;
  description: string | null;
  vulnerability_type: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  cvss_score: string | null;
  status: "open" | "in_progress" | "remediated" | "accepted";
  discovered_at: string;
  remediated_at: string | null;
  remediation_notes: string | null;
  reference_url: string | null;
  source: string;
  asset_name: string | null;
  asset_code: string | null;
  asset_type: string | null;
  asset_criticality: string | null;
  asset_data_classification: string | null;
  access_level: string | null;
  authentication_method: string | null;
  supports_critical_service: boolean | null;
  internet_exposed: boolean | null;
  backup_enabled: boolean | null;
  encryption_enabled: boolean | null;
  mfa_enabled: boolean | null;
  logging_enabled: boolean | null;
  threat_name: string | null;
  threat_type: string | null;
  threat_description: string | null;
  threat_likelihood_level: number | null;
  threat_potential_impact: string | null;
  threat_nist_category: string | null;
  threat_mapping_risk_level: string | null;
  threat_mapping_asset_type: string | null;
  threat_mitigation_notes: string | null;
  threat_mitigation_notes_mn: string | null;
};

type Asset = { id: number; asset_name: string; asset_type: string | null };

const SEVERITY_STYLES: Record<string, string> = {
  Critical:
    "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  High: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  Medium:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Low: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  in_progress:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  remediated:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  accepted:
    "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Нээлттэй",
  in_progress: "Хийгдэж буй",
  remediated: "Засварласан",
  accepted: "Хүлээн зөвшөөрсөн",
};

const SEVERITY_LABEL: Record<Vulnerability["severity"], string> = {
  Critical: "Ноцтой",
  High: "Өндөр",
  Medium: "Дунд",
  Low: "Бага",
};

const SEVERITY_WEIGHT: Record<Vulnerability["severity"], number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const TYPE_OPTIONS = [
  "CVE",
  "Misconfiguration",
  "Weak Authentication",
  "Outdated Software",
  "Default Credentials",
  "Other",
];

const TYPE_LABEL: Record<string, string> = {
  CVE: "CVE",
  Misconfiguration: "Буруу тохиргоо",
  "Weak Authentication": "Сул танин баталгаажуулалт",
  "Outdated Software": "Хуучирсан програм хангамж",
  "Default Credentials": "Өгөгдмөл нэвтрэх мэдээлэл",
  Other: "Бусад",
};

const SOURCE_LABEL: Record<string, string> = {
  auto_scan: "Автомат scan",
  manual: "Гараар нэмсэн",
  cisa_kev: "CISA KEV",
};

const assetPostureClass = (enabled: boolean | null | undefined) =>
  enabled
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300";

const dateLabel = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const isActiveStatus = (status: Vulnerability["status"]) =>
  status === "open" || status === "in_progress";

export default function VulnerabilitiesPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAsset, setFilterAsset] = useState("all");

  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    assets: number;
    created: number;
    skipped: number;
    linked: number;
  } | null>(null);
  const [form, setForm] = useState({
    asset_id: "",
    cve_id: "",
    title: "",
    description: "",
    vulnerability_type: "CVE",
    severity: "Medium",
    cvss_score: "",
    reference_url: "",
  });

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
    }
  }, [user, router]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [vRes, aRes] = await Promise.all([
        fetch("/api/vulnerabilities"),
        fetch("/api/assets"),
      ]);
      if (vRes.ok) {
        const d = await vRes.json();
        setVulns(d.vulnerabilities || []);
      }
      if (aRes.ok) {
        const d = await aRes.json();
        setAssets(d.assets || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  const filtered = useMemo(() => {
    return vulns.filter((v) => {
      if (filterSeverity !== "all" && v.severity !== filterSeverity)
        return false;
      if (filterStatus !== "all" && v.status !== filterStatus) return false;
      if (filterAsset !== "all" && String(v.asset_id ?? "") !== filterAsset)
        return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [
          v.title,
          v.cve_id,
          v.description,
          v.asset_name,
          v.asset_code,
          v.asset_type,
          v.asset_criticality,
          v.threat_name,
          v.threat_type,
          v.threat_description,
          v.threat_nist_category,
          v.threat_mapping_asset_type,
          v.threat_mapping_risk_level,
          v.threat_mitigation_notes,
          v.threat_mitigation_notes_mn,
          v.vulnerability_type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [vulns, filterSeverity, filterStatus, filterAsset, search]);

  const vulnerabilitiesByAsset = useMemo(() => {
    const groups = new Map<
      string,
      {
        assetId: number | null;
        assetName: string;
        assetCode: string | null;
        assetType: string | null;
        assetCriticality: string | null;
        accessLevel: string | null;
        authenticationMethod: string | null;
        internetExposed: boolean | null;
        backupEnabled: boolean | null;
        encryptionEnabled: boolean | null;
        mfaEnabled: boolean | null;
        loggingEnabled: boolean | null;
        vulnerabilities: Vulnerability[];
        highestSeverity: Vulnerability["severity"];
        criticalOpen: number;
        activeCount: number;
        openCount: number;
        threatLinked: number;
        postureOnly: number;
        latestDiscoveredAt: string | null;
      }
    >();

    for (const vulnerability of filtered) {
      const key = String(
        vulnerability.asset_id ?? vulnerability.asset_name ?? "unassigned",
      );
      const existing = groups.get(key);
      const group = existing ?? {
        assetId: vulnerability.asset_id,
        assetName: vulnerability.asset_name ?? "Хуваарилагдаагүй хөрөнгө",
        assetCode: vulnerability.asset_code,
        assetType: vulnerability.asset_type,
        assetCriticality: vulnerability.asset_criticality,
        accessLevel: vulnerability.access_level,
        authenticationMethod: vulnerability.authentication_method,
        internetExposed: vulnerability.internet_exposed,
        backupEnabled: vulnerability.backup_enabled,
        encryptionEnabled: vulnerability.encryption_enabled,
        mfaEnabled: vulnerability.mfa_enabled,
        loggingEnabled: vulnerability.logging_enabled,
        vulnerabilities: [],
        highestSeverity: vulnerability.severity,
        criticalOpen: 0,
        activeCount: 0,
        openCount: 0,
        threatLinked: 0,
        postureOnly: 0,
        latestDiscoveredAt: null,
      };

      group.vulnerabilities.push(vulnerability);
      if (
        SEVERITY_WEIGHT[vulnerability.severity] >
        SEVERITY_WEIGHT[group.highestSeverity]
      ) {
        group.highestSeverity = vulnerability.severity;
      }
      if (
        vulnerability.severity === "Critical" &&
        isActiveStatus(vulnerability.status)
      ) {
        group.criticalOpen += 1;
      }
      if (isActiveStatus(vulnerability.status)) group.activeCount += 1;
      if (vulnerability.status === "open") group.openCount += 1;
      if (vulnerability.threat_id) group.threatLinked += 1;
      else group.postureOnly += 1;
      if (
        !group.latestDiscoveredAt ||
        new Date(vulnerability.discovered_at).getTime() >
          new Date(group.latestDiscoveredAt).getTime()
      ) {
        group.latestDiscoveredAt = vulnerability.discovered_at;
      }

      groups.set(key, group);
    }

    return Array.from(groups.values()).sort((a, b) => {
      const severityDelta =
        SEVERITY_WEIGHT[b.highestSeverity] - SEVERITY_WEIGHT[a.highestSeverity];
      if (severityDelta !== 0) return severityDelta;
      return b.vulnerabilities.length - a.vulnerabilities.length;
    });
  }, [filtered]);

  const stats = useMemo(() => {
    const affectedAssetIds = new Set(
      vulns
        .map((vulnerability) => vulnerability.asset_id)
        .filter((assetId): assetId is number => Boolean(assetId)),
    );
    const active = vulns.filter((v) => isActiveStatus(v.status));
    return {
      total: vulns.length,
      affectedAssets: affectedAssetIds.size,
      cleanAssets: Math.max(assets.length - affectedAssetIds.size, 0),
      threatLinked: vulns.filter((v) => Boolean(v.threat_id)).length,
      postureOnly: vulns.filter((v) => !v.threat_id).length,
      critical: vulns.filter(
        (v) => v.severity === "Critical" && isActiveStatus(v.status),
      ).length,
      criticalHigh: active.filter(
        (v) => v.severity === "Critical" || v.severity === "High",
      ).length,
      open: vulns.filter((v) => v.status === "open").length,
      in_progress: vulns.filter((v) => v.status === "in_progress").length,
      remediated: vulns.filter((v) => v.status === "remediated").length,
    };
  }, [assets.length, vulns]);

  const filteredStats = useMemo(() => {
    const affectedAssetIds = new Set(
      filtered
        .map((vulnerability) => vulnerability.asset_id)
        .filter((assetId): assetId is number => Boolean(assetId)),
    );
    return {
      vulnerabilities: filtered.length,
      assets: affectedAssetIds.size,
    };
  }, [filtered]);

  const hasActiveFilters =
    search.trim() !== "" ||
    filterSeverity !== "all" ||
    filterStatus !== "all" ||
    filterAsset !== "all";

  const resetFilters = () => {
    setSearch("");
    setFilterSeverity("all");
    setFilterStatus("all");
    setFilterAsset("all");
  };

  const resetForm = () => {
    setForm({
      asset_id: "",
      cve_id: "",
      title: "",
      description: "",
      vulnerability_type: "CVE",
      severity: "Medium",
      cvss_score: "",
      reference_url: "",
    });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.asset_id) {
      setError("Хөрөнгө заавал сонгоно уу");
      return;
    }
    if (!form.title.trim()) {
      setError("Гарчиг заавал оруулна уу");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        asset_id: Number(form.asset_id),
        cve_id: form.cve_id || null,
        title: form.title,
        description: form.description || null,
        vulnerability_type: form.vulnerability_type,
        severity: form.severity,
        cvss_score: form.cvss_score ? Number(form.cvss_score) : null,
        reference_url: form.reference_url || null,
      };
      const res = await fetch("/api/vulnerabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.message || "Эмзэг байдлыг бүртгэж чадсангүй");
        return;
      }
      await fetchAll();
      setIsOpen(false);
      resetForm();
    } catch {
      setError("Сүлжээний алдаа гарлаа");
    } finally {
      setSubmitting(false);
    }
  };

  const runScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/vulnerabilities/scan", { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setScanResult({
          assets: d.assets_scanned ?? 0,
          created: d.findings_created ?? 0,
          skipped: d.findings_skipped_existing ?? 0,
          linked: d.findings_linked_to_threats ?? 0,
        });
        await fetchAll();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScanning(false);
    }
  };

  const updateStatus = async (id: number, status: Vulnerability["status"]) => {
    try {
      const res = await fetch(`/api/vulnerabilities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) await fetchAll();
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) return null;

  return (
    <div className="app-page p-4 sm:p-6 md:p-8 pb-8">
      <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300">
            <Bug className="size-3.5" />
            Asset дээр илэрсэн олдворууд
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Эмзэг байдлын удирдлага
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {loading
              ? "Asset дээр илэрсэн эмзэг байдлыг ачааллаж байна..."
              : `${stats.affectedAssets}/${assets.length} asset дээр ${stats.total} эмзэг байдал бүртгэгдсэн байна.`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 lg:justify-end">
          <Button
            onClick={runScan}
            disabled={scanning}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {scanning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Шалгаж байна...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" /> Хөрөнгийг шалгах
              </>
            )}
          </Button>

          <Dialog
            open={isOpen}
            onOpenChange={(o) => {
              setIsOpen(o);
              if (!o) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" /> Гараар нэмэх
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-160 max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Шинэ эмзэг байдал</DialogTitle>
                  <DialogDescription>
                    CVE, буруу тохиргоо эсвэл бусад сул талыг хөрөнгөтэй холбон
                    бүртгэнэ.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Хөрөнгө *</Label>
                      <Select
                        value={form.asset_id}
                        onValueChange={(v) => setForm({ ...form, asset_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Asset сонгох" />
                        </SelectTrigger>
                        <SelectContent>
                          {assets.map((a) => (
                            <SelectItem key={a.id} value={String(a.id)}>
                              {a.asset_name}{" "}
                              <span className="text-muted-foreground text-xs">
                                ({a.asset_type})
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Төрөл</Label>
                      <Select
                        value={form.vulnerability_type}
                        onValueChange={(v) =>
                          setForm({ ...form, vulnerability_type: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPE_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>
                              {TYPE_LABEL[t] ?? t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Гарчиг *</Label>
                    <Input
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                      placeholder="Жишээ нь: Хуучирсан OpenSSL MITM халдлагад өртөмтгий"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">CVE ID</Label>
                      <Input
                        value={form.cve_id}
                        onChange={(e) =>
                          setForm({ ...form, cve_id: e.target.value })
                        }
                        placeholder="CVE-2024-1234"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">
                        Ноцтой байдал *
                      </Label>
                      <Select
                        value={form.severity}
                        onValueChange={(v) => setForm({ ...form, severity: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Critical">Ноцтой</SelectItem>
                          <SelectItem value="High">Өндөр</SelectItem>
                          <SelectItem value="Medium">Дунд</SelectItem>
                          <SelectItem value="Low">Бага</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">CVSS</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={form.cvss_score}
                        onChange={(e) =>
                          setForm({ ...form, cvss_score: e.target.value })
                        }
                        placeholder="7.5"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Тайлбар</Label>
                    <Textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      placeholder="Нөлөөлөл, ашиглагдах нөхцөл зэрэг"
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Эх сурвалжийн URL
                    </Label>
                    <Input
                      value={form.reference_url}
                      onChange={(e) =>
                        setForm({ ...form, reference_url: e.target.value })
                      }
                      placeholder="https://nvd.nist.gov/vuln/detail/..."
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2 border border-red-200 dark:border-red-900">
                      <AlertTriangle className="w-4 h-4" /> {error}
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    disabled={submitting}
                  >
                    Цуцлах
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {submitting ? "Хадгалж байна..." : "Эмзэг байдлыг хадгалах"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="app-readonly rounded-lg border app-risk-surface p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-300">
            <Activity className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Одоогийн asset vulnerability төлөв</p>
            <p className="text-xs text-muted-foreground">
              Шүүлтүүрээр {filteredStats.assets} asset, {filteredStats.vulnerabilities} олдвор харагдаж байна.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-2 rounded-md border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 font-medium text-blue-700 dark:text-blue-300">
            <Link2 className="size-3" />
            {stats.threatLinked} threat-тэй
          </span>
          <span className="inline-flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 font-medium text-amber-700 dark:text-amber-300">
            <ShieldOff className="size-3" />
            {stats.postureOnly} posture gap
          </span>
          {scanResult && (
            <span className="inline-flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-700 dark:text-emerald-300">
              <Sparkles className="size-3" />
              scan: {scanResult.created} шинэ, {scanResult.skipped} давхардсан
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="app-readonly grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          {
            label: "Нийт",
            value: stats.total,
            icon: Bug,
            tone: "text-foreground",
          },
          {
            label: "Нөлөөлсөн asset",
            value: stats.affectedAssets,
            icon: Database,
            tone: "text-blue-600 dark:text-blue-300",
          },
          {
            label: "Нээлттэй ноцтой",
            value: stats.critical,
            icon: ShieldOff,
            tone: "text-rose-500",
          },
          {
            label: "Critical/High",
            value: stats.criticalHigh,
            icon: AlertTriangle,
            tone: "text-orange-500",
          },
          {
            label: "Нээлттэй",
            value: stats.open,
            icon: Clock,
            tone: "text-amber-500",
          },
          {
            label: "Цэвэр asset",
            value: stats.cleanAssets,
            icon: ShieldCheck,
            tone: "text-emerald-500",
          },
        ].map((s) => (
          <Card key={s.label} className="app-risk-surface shadow-none rounded-lg">
            <CardContent className="p-4 flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                <s.icon className={`size-4 ${s.tone}`} />
              </span>
              <div className="min-w-0">
                <p className={`text-2xl font-black ${s.tone}`}>{s.value}</p>
                <p className="truncate text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {s.label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-lg border app-risk-surface p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold">
            {filteredStats.vulnerabilities} олдвор · {filteredStats.assets} asset
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
          >
            <FilterX className="size-4" />
            Цэвэрлэх
          </Button>
        </div>
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Гарчиг, CVE, asset, threat, NIST хайх..."
              className="pl-9"
            />
          </div>
          <Select value={filterAsset} onValueChange={setFilterAsset}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="Хөрөнгө" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Бүх хөрөнгө</SelectItem>
              {assets.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.asset_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-full lg:w-40">
              <SelectValue placeholder="Ноцтой байдал" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Бүх ноцтой байдал</SelectItem>
              <SelectItem value="Critical">Ноцтой</SelectItem>
              <SelectItem value="High">Өндөр</SelectItem>
              <SelectItem value="Medium">Дунд</SelectItem>
              <SelectItem value="Low">Бага</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full lg:w-40">
              <SelectValue placeholder="Төлөв" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Бүх төлөв</SelectItem>
              <SelectItem value="open">Нээлттэй</SelectItem>
              <SelectItem value="in_progress">Хийгдэж буй</SelectItem>
              <SelectItem value="remediated">Засварласан</SelectItem>
              <SelectItem value="accepted">Хүлээн зөвшөөрсөн</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-muted-foreground mt-4">
            Эмзэг байдлын мэдээлэл ачааллаж байна...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center rounded-2xl app-risk-surface border">
          <Bug className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-muted-foreground">
            {vulns.length === 0
              ? "Эмзэг байдал хараахан бүртгэгдээгүй байна"
              : "Шүүлтүүрт тохирох эмзэг байдал олдсонгүй"}
          </h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            {vulns.length === 0
              ? "Засварлалтыг хянаж эхлэхийн тулд CVE, буруу тохиргоо эсвэл сул баталгаажуулалтын олдворыг хөрөнгөтэй холбон нэмнэ үү."
              : "Хайлтыг цэвэрлэх эсвэл шүүлтүүрийг сулруулж үзнэ үү."}
          </p>
          {vulns.length === 0 && (
            <Button
              onClick={runScan}
              disabled={scanning}
              className="mt-5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {scanning ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Шалгаж байна...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Хөрөнгийг шалгаж эмзэг байдал үүсгэх
                </>
              )}
            </Button>
          )}
        </div>
      ) : (
        <div className="app-readonly space-y-4">
          {vulnerabilitiesByAsset.map((asset) => (
            <Card
              key={asset.assetId ?? asset.assetName}
              className="overflow-hidden rounded-lg border-border/60 shadow-none cursor-default"
            >
              <div className="border-b border-border bg-muted/20 p-4 sm:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-blue-600 shadow-sm dark:text-blue-300">
                      <Database className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {asset.assetType && (
                          <Badge className="border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            {asset.assetType}
                          </Badge>
                        )}
                        <Badge
                          className={`${SEVERITY_STYLES[asset.highestSeverity]} border font-semibold`}
                        >
                          Дээд: {SEVERITY_LABEL[asset.highestSeverity]}
                        </Badge>
                        {asset.criticalOpen > 0 && (
                          <Badge className="border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                            {asset.criticalOpen} нээлттэй ноцтой
                          </Badge>
                        )}
                      </div>
                      <h2 className="text-xl font-bold leading-tight tracking-normal sm:text-2xl">
                        {asset.assetName}
                      </h2>
                      <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                        <span className="rounded-md border border-border/70 bg-background px-2.5 py-1.5">
                          Код: {asset.assetCode || "—"}
                        </span>
                        <span className="rounded-md border border-border/70 bg-background px-2.5 py-1.5">
                          Чухал байдал: {asset.assetCriticality || "—"}
                        </span>
                        <span className="rounded-md border border-border/70 bg-background px-2.5 py-1.5">
                          Сүүлийн илрэлт: {dateLabel(asset.latestDiscoveredAt)}
                        </span>
                        <span className="rounded-md border border-border/70 bg-background px-2.5 py-1.5">
                          Идэвхтэй: {asset.activeCount} / {asset.vulnerabilities.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid shrink-0 grid-cols-2 gap-2 text-xs sm:grid-cols-4 xl:grid-cols-2">
                    <span
                      className={`rounded-md border px-2.5 py-1.5 font-medium ${assetPostureClass(
                        !asset.internetExposed,
                      )}`}
                    >
                      {asset.internetExposed ? "Internet exposed" : "Internal"}
                    </span>
                    <span
                      className={`rounded-md border px-2.5 py-1.5 font-medium ${assetPostureClass(
                        asset.mfaEnabled,
                      )}`}
                    >
                      MFA {asset.mfaEnabled ? "OK" : "Gap"}
                    </span>
                    <span
                      className={`rounded-md border px-2.5 py-1.5 font-medium ${assetPostureClass(
                        asset.encryptionEnabled,
                      )}`}
                    >
                      Encryption {asset.encryptionEnabled ? "OK" : "Gap"}
                    </span>
                    <span
                      className={`rounded-md border px-2.5 py-1.5 font-medium ${assetPostureClass(
                        asset.loggingEnabled,
                      )}`}
                    >
                      Logging {asset.loggingEnabled ? "OK" : "Gap"}
                    </span>
                  </div>
                </div>
              </div>

              <CardContent className="p-5">
                <div className="space-y-3">
                  {asset.vulnerabilities.map((v) => {
                    const linkedThreat = Boolean(v.threat_id && v.threat_name);
                    const mitigation =
                      v.threat_mitigation_notes_mn ||
                      v.threat_mitigation_notes ||
                      v.remediation_notes;

                    return (
                      <div
                        key={v.id}
                        className="overflow-hidden rounded-lg border border-border bg-background/80 cursor-default"
                      >
                        <div
                          className={`h-1 ${
                            v.severity === "Critical"
                              ? "bg-rose-500"
                              : v.severity === "High"
                                ? "bg-orange-500"
                                : v.severity === "Medium"
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                          }`}
                        />
                        <div className="flex flex-col gap-4 p-4 xl:flex-row xl:items-start">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-1.5">
                              <Badge
                                className={`${SEVERITY_STYLES[v.severity]} border px-2 py-0.5 text-[11px] font-bold`}
                              >
                                {SEVERITY_LABEL[v.severity]}
                              </Badge>
                              <Badge
                                className={`${STATUS_STYLES[v.status]} border px-2 py-0.5 text-[11px] font-medium`}
                              >
                                {STATUS_LABEL[v.status]}
                              </Badge>
                              <span className="rounded border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                                {TYPE_LABEL[v.vulnerability_type] ??
                                  v.vulnerability_type}
                              </span>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                CVSS {v.cvss_score ?? "-"}
                              </span>
                              <span className="rounded border border-border bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">
                                {SOURCE_LABEL[v.source] ?? v.source}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] ${
                                  linkedThreat
                                    ? "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                    : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                }`}
                              >
                                {linkedThreat ? (
                                  <Link2 className="size-3" />
                                ) : (
                                  <ShieldOff className="size-3" />
                                )}
                                {linkedThreat ? "Threat linked" : "Posture gap"}
                              </span>
                            </div>

                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                              <div className="min-w-0">
                                <h3 className="text-sm font-semibold leading-snug">
                                  {v.title}
                                </h3>
                                {v.cve_id && (
                                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                                    {v.cve_id}
                                  </p>
                                )}
                              </div>
                              <Select
                                value={v.status}
                                onValueChange={(s) =>
                                  updateStatus(
                                    v.id,
                                    s as Vulnerability["status"],
                                  )
                                }
                              >
                                <SelectTrigger className="h-8 w-full shrink-0 text-xs md:w-36">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="open">Нээлттэй</SelectItem>
                                  <SelectItem value="in_progress">
                                    Хийгдэж буй
                                  </SelectItem>
                                  <SelectItem value="remediated">
                                    Засварласан
                                  </SelectItem>
                                  <SelectItem value="accepted">
                                    Хүлээн зөвшөөрсөн
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {v.description && (
                              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                                {v.description}
                              </p>
                            )}

                            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2 py-1">
                                <CalendarDays className="size-3" />
                                Илэрсэн: {dateLabel(v.discovered_at)}
                              </span>
                              {v.access_level && (
                                <span className="rounded-md bg-muted/40 px-2 py-1">
                                  Access: {v.access_level}
                                </span>
                              )}
                              {v.authentication_method && (
                                <span className="rounded-md bg-muted/40 px-2 py-1">
                                  Auth: {v.authentication_method}
                                </span>
                              )}
                              {v.reference_url && (
                                <a
                                  href={v.reference_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-1 font-medium text-blue-700 hover:text-blue-800 dark:text-blue-300"
                                >
                                  Эх сурвалж
                                  <ExternalLink className="size-3" />
                                </a>
                              )}
                            </div>

                            {(linkedThreat || mitigation) && (
                              <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                                {linkedThreat && (
                                  <div className="rounded-md border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-800 dark:text-blue-200">
                                    <div className="mb-1 flex items-center gap-2 font-semibold">
                                      <Link2 className="size-3.5" />
                                      {v.threat_name}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                                      {v.threat_type && (
                                        <span className="rounded bg-white/60 px-2 py-0.5 dark:bg-slate-950/40">
                                          {v.threat_type}
                                        </span>
                                      )}
                                      {v.threat_nist_category && (
                                        <span className="rounded bg-white/60 px-2 py-0.5 dark:bg-slate-950/40">
                                          {v.threat_nist_category}
                                        </span>
                                      )}
                                      {v.threat_mapping_risk_level && (
                                        <span className="rounded bg-white/60 px-2 py-0.5 dark:bg-slate-950/40">
                                          {v.threat_mapping_risk_level}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {mitigation && (
                                  <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground">
                                    <span className="font-semibold text-foreground">
                                      Зөвлөмж:
                                    </span>{" "}
                                    {mitigation}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
