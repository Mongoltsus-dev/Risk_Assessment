"use client";

import { useAuth } from "@/app/context/AuthContext";
import AddAssetModal from "@/components/assets/AddAssetModal";
import AssetCard from "@/components/assets/AssetCard";
import ImportAssetsModal from "@/components/assets/ImportAssetsModal";
import { Card } from "@/components/ui/card";
import {
  AlertTriangle,
  ArrowRight,
  Globe2,
  HardDrive,
  Layers,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface Asset {
  id?: string | number;
  asset_type_id?: number;
  asset_type?: string;
  owner_id?: number;
  asset_name: string;
  asset_code: string;
  business_owner?: string;
  technical_owner?: string;
  department?: string;
  data_classification?: string;
  access_level?: string;
  authentication_method?: string;
  supports_critical_service?: boolean;
  business_process_ids?: number[];
  critical_business_processes?: Array<{
    id: number;
    process_code?: string | null;
    process_name: string;
    criticality?: string | null;
    status?: string | null;
    dependency_type?: string | null;
  }>;
  hosting?: string;
  region?: string;
  key_users_customers?: string;
  rto_hours?: number | string;
  rpo_hours?: number | string;
  criticality: string;
  internet_exposed?: boolean;
  backup_enabled?: boolean;
  encryption_enabled?: boolean;
  mfa_enabled?: boolean;
  logging_enabled?: boolean;
  edr_enabled?: boolean;
  vuln_scanning_enabled?: boolean;
  cmdb_ci_id?: string;
  notes?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

const getCriticalityColor = (criticality: string) => {
  if (criticality.includes("Tier 0"))
    return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400";
  if (criticality.includes("Tier 1"))
    return "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400";
  if (criticality.includes("Tier 2"))
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400";
  return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400";
};

const getStatusColor = (status: string) => {
  if (status === "Active")
    return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400";
  if (status === "Inactive")
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
  if (status === "Deprecated")
    return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400";
  return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400";
};

export default function AssetsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
    }
  }, [user, router]);

  useEffect(() => {
    if (user) {
      fetchAssets();
    }
  }, [user]);

  const fetchAssets = async () => {
    try {
      const response = await fetch("/api/assets");
      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
      }
    } catch (error) {
      console.error("Хөрөнгийн мэдээлэл татах үед алдаа гарлаа:", error);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssetAdded = () => {
    fetchAssets();
  };

  const handleAssetUpdated = (updatedAsset: Asset) => {
    setAssets((prev) =>
      prev.map((asset) =>
        String(asset.id) === String(updatedAsset.id) ? updatedAsset : asset,
      ),
    );
  };

  const handleAssetRemoved = (removedAssetId: string | number) => {
    setAssets((prev) =>
      prev.filter((asset) => String(asset.id) !== String(removedAssetId)),
    );
  };

  const stats = useMemo(() => {
    const total = assets.length;
    const critical = assets.filter(
      (a) =>
        a.criticality?.includes("Tier 0") || a.criticality?.includes("Tier 1"),
    ).length;
    const internetExposed = assets.filter((a) => a.internet_exposed).length;
    const missingBackup = assets.filter((a) => !a.backup_enabled).length;
    const noMfa = assets.filter((a) => !a.mfa_enabled).length;
    return { total, critical, internetExposed, missingBackup, noMfa };
  }, [assets]);

  if (!user) {
    return null;
  }

  const pct = (n: number) =>
    stats.total > 0 ? `${Math.round((n / stats.total) * 100)}%` : "0%";

  return (
    <div className="app-page p-4 sm:p-6 md:p-8 pb-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
              Хөрөнгийн бүртгэл
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <Link
              href="/risk-register"
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              Эрсдэл тооцоолох
              <ArrowRight className="h-4 w-4" />
            </Link>
            <ImportAssetsModal onImported={handleAssetAdded} />
            <AddAssetModal onAssetAdded={handleAssetAdded} />
          </div>
        </div>

        {/* KPI cards */}
        {!loading && assets.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {[
              {
                label: "Нийт хөрөнгө",
                value: stats.total,
                sub: "Бүртгэлтэй хөрөнгө",
                icon: Layers,
                color: "text-blue-600 dark:!text-blue-500",
                bg: "bg-blue-50 border-blue-200 dark:bg-slate-800 dark:border-slate-700",
              },
              {
                label: "Чухал хөрөнгө",
                value: stats.critical,
                sub: `Нийтийн хөрөнгийн ${pct(stats.critical)}`,
                icon: ShieldAlert,
                color: "text-red-600 dark:!text-red-500",
                bg: "bg-red-50 border-red-200 dark:bg-slate-800 dark:border-slate-700",
              },
              {
                label: "Интернэтэд нээлттэй",
                value: stats.internetExposed,
                sub: `Нийтийн хөрөнгийн ${pct(stats.internetExposed)}`,
                icon: Globe2,
                color: "text-orange-600 dark:!text-orange-500",
                bg: "bg-orange-50 border-orange-200 dark:bg-slate-800 dark:border-slate-700",
              },
              {
                label: "Нөөцлөлтгүй (backup)",
                value: stats.missingBackup,
                sub: `Нийтийн хөрөнгийн ${pct(stats.missingBackup)}`,
                icon: HardDrive,
                color: "text-amber-600 dark:!text-amber-500",
                bg: "bg-amber-50 border-amber-200 dark:bg-slate-800 dark:border-slate-700",
              },
              {
                label: "MFA-гүй",
                value: stats.noMfa,
                sub: `Нийтийн хөрөнгийн ${pct(stats.noMfa)}`,
                icon: AlertTriangle,
                color: "text-rose-600 dark:!text-rose-500",
                bg: "bg-rose-50 border-rose-200 dark:bg-slate-800 dark:border-slate-700",
              },
            ].map(({ label, value, sub, icon: Icon, color, bg }) => (
              <div
                key={label}
                className={`asset-kpi-card rounded-xl border p-4 shadow-sm dark:shadow-none ${bg}`}
              >
                <Icon className={`w-4 h-4 mb-2 ${color}`} />
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white! mt-0.5">
                  {label}
                </div>
                <div className="text-xs text-slate-600 dark:text-white! mt-0.5">
                  {sub}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-6">
          {loading ? (
            <Card className="p-8 text-center app-card-surface">
              <p className="text-muted-foreground text-lg">
                Хөрөнгийн мэдээлэл ачааллаж байна...
              </p>
            </Card>
          ) : assets.length === 0 ? (
            <Card className="p-8 text-center app-card-surface">
              <p className="text-muted-foreground text-lg">
                Хөрөнгө бүртгэгдээгүй байна.
              </p>
            </Card>
          ) : (
            assets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                getCriticalityColor={getCriticalityColor}
                getStatusColor={getStatusColor}
                onAssetUpdated={handleAssetUpdated}
                onAssetRemoved={handleAssetRemoved}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
