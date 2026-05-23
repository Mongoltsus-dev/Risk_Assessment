"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ACCESS_LEVEL_LABELS,
  ACCESS_LEVEL_OPTIONS,
  ASSET_TYPE_LABELS,
  ASSET_TYPE_OPTIONS,
  AUTHENTICATION_METHOD_LABELS,
  AUTHENTICATION_METHOD_OPTIONS,
  COUNTRY_OPTIONS,
  COUNTRY_REGION_MAP,
  CRITICALITY_LABELS,
  CRITICALITY_LEVELS,
  DATA_CLASSIFICATION_LABELS,
  DATA_CLASSIFICATION_OPTIONS,
  getHostingOptions,
  getLabel,
  HOSTING_LABELS,
  KEY_USERS_OPTIONS,
  NATIVE_SELECT_CLASS,
  RISK_LEVEL_LABELS,
  STATUS_LABELS,
  STATUS_OPTIONS,
} from "./asset-constants";

interface Threat {
  id: number;
  threat_name: string;
  description: string;
  threat_type: string;
  likelihood_level: number;
  potential_impact: string;
  risk_level: string;
  mitigation_notes: string;
  mitigation_notes_mn: string | null;
}

interface AddAssetModalProps {
  onAssetAdded: () => void;
}

interface CriticalBusinessProcess {
  id: number;
  process_code?: string | null;
  process_name: string;
  criticality?: string | null;
  status?: string | null;
  risk_count?: number;
  highest_risk_score?: number | string | null;
  highest_risk_level?: string | null;
}

const ASSET_FORM_FIELD_CLASS = "app-form-field h-10";
const ASSET_FORM_PANEL_CLASS = "app-form-panel rounded-lg border p-4";
const ASSET_CHOICE_INPUT_CLASS =
  "app-choice-input h-4 w-4 rounded accent-blue-600";

const formatBusinessProcessLabel = (process: CriticalBusinessProcess) =>
  process.process_code
    ? `${process.process_code} - ${process.process_name}`
    : process.process_name;

const toScoreNumber = (value?: number | string | null) => {
  const score = Number(value ?? 0);
  return Number.isFinite(score) ? score : 0;
};

function AddAssetModal({ onAssetAdded }: AddAssetModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [threatsLoading, setThreatsLoading] = useState(false);
  const [relatedThreats, setRelatedThreats] = useState<Threat[]>([]);
  const [threatsMessage, setThreatsMessage] = useState("");
  const [businessProcesses, setBusinessProcesses] = useState<
    CriticalBusinessProcess[]
  >([]);
  const [businessProcessesLoading, setBusinessProcessesLoading] =
    useState(false);
  const [businessProcessesFetched, setBusinessProcessesFetched] =
    useState(false);
  const threatCacheRef = useRef<
    Record<string, { threats: Threat[]; message: string }>
  >({});
  const [formData, setFormData] = useState({
    asset_type_id: "",
    asset_type: "",
    owner_id: "",
    asset_name: "",
    asset_code: "",
    business_owner: "",
    technical_owner: "",
    department: "",
    data_classification: "",
    access_level: "",
    authentication_method: "",
    supports_critical_service: false,
    business_process_ids: [] as number[],
    hosting: "",
    country: "",
    region: "",
    key_users_customers: "",
    rto_hours: "",
    rpo_hours: "",
    criticality: "",
    internet_exposed: false,
    backup_enabled: false,
    encryption_enabled: false,
    mfa_enabled: false,
    logging_enabled: false,
    edr_enabled: false,
    vuln_scanning_enabled: false,
    cmdb_ci_id: "",
    notes: "",
    status: "Active",
  });

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      setSubmitError("");
    },
    [],
  );

  const handleSelectChange = useCallback((name: string, value: string) => {
    setFormData((prev) => {
      const isCriticalService =
        name === "supports_critical_service" ? value === "true" : null;

      return {
        ...prev,
        [name]: isCriticalService === null ? value : isCriticalService,
        ...(isCriticalService === false ? { business_process_ids: [] } : {}),
        ...(name === "country"
          ? { region: COUNTRY_REGION_MAP[value] ?? "" }
          : {}),
        ...(name === "asset_type"
          ? {
              hosting: getHostingOptions(value).includes(prev.hosting)
                ? prev.hosting
                : "",
            }
          : {}),
        ...(name === "access_level"
          ? {
              internet_exposed: [
                "Public web access",
                "Public API exposed",
              ].includes(value),
            }
          : {}),
        ...(name === "authentication_method"
          ? {
              mfa_enabled: [
                "Password + MFA",
                "SSO",
                "Passwordless (FIDO2)",
              ].includes(value),
            }
          : {}),
      };
    });
    setSubmitError("");
  }, []);

  const handleCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, checked } = e.target;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    },
    [],
  );

  const handleBusinessProcessToggle = useCallback((processId: number) => {
    setFormData((prev) => {
      const current = prev.business_process_ids;
      const next = current.includes(processId)
        ? current.filter((id) => id !== processId)
        : [...current, processId];

      return {
        ...prev,
        supports_critical_service: true,
        business_process_ids: next,
      };
    });
  }, []);

  const fetchBusinessProcesses = useCallback(async () => {
    if (businessProcessesLoading || businessProcessesFetched) return;

    try {
      setBusinessProcessesLoading(true);
      const response = await fetch("/api/business-processes");
      if (!response.ok) throw new Error("Business process list fetch failed");
      const data = await response.json();
      const processes = Array.isArray(data.processes)
        ? data.processes.filter(
            (process: CriticalBusinessProcess) =>
              process.status !== "Inactive" &&
              String(process.criticality ?? "Critical").toLowerCase() ===
                "critical",
          )
        : [];
      setBusinessProcesses(processes);
      setBusinessProcessesFetched(true);
    } catch (error) {
      console.error("Business process жагсаалт татах үед алдаа гарлаа:", error);
      setBusinessProcesses([]);
    } finally {
      setBusinessProcessesLoading(false);
    }
  }, [businessProcessesFetched, businessProcessesLoading]);

  const displayedThreats = useMemo(
    () => relatedThreats.slice(0, 10),
    [relatedThreats],
  );

  const selectedAssetType = useMemo(
    () => formData.asset_type.trim(),
    [formData.asset_type],
  );

  useEffect(() => {
    if (!open || !selectedAssetType) {
      setRelatedThreats([]);
      setThreatsMessage("");
      return;
    }

    const cacheKey = selectedAssetType;
    const cached = threatCacheRef.current[cacheKey];
    if (cached) {
      setRelatedThreats(cached.threats);
      setThreatsMessage(cached.message);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setThreatsLoading(true);
        const threatsUrl = `/api/threats?assetType=${encodeURIComponent(selectedAssetType)}`;
        const response = await fetch(threatsUrl, { signal: controller.signal });

        if (controller.signal.aborted) return;

        if (response.ok) {
          const data = await response.json();
          const nextThreats = data.threats || [];
          const nextMessage = data.message || "";

          threatCacheRef.current[cacheKey] = {
            threats: nextThreats,
            message: nextMessage,
          };

          setRelatedThreats(nextThreats);
          setThreatsMessage(nextMessage);
        } else {
          setRelatedThreats([]);
          setThreatsMessage(
            "Энэ төрлийн хөрөнгөтэй холбоотой аюулыг ачаалж чадсангүй.",
          );
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Аюулын мэдээлэл татах үед алдаа гарлаа:", error);
        setRelatedThreats([]);
        setThreatsMessage(
          "Энэ төрлийн хөрөнгөтэй холбоотой аюулыг ачаалж чадсангүй.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setThreatsLoading(false);
        }
      }
    }, 120);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, selectedAssetType]);

  useEffect(() => {
    if (open) {
      fetchBusinessProcesses();
    }
  }, [open, fetchBusinessProcesses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const normalizedAssetType = selectedAssetType;
      if (!normalizedAssetType) {
        throw new Error("Хөрөнгийн төрлийг сонгоно уу.");
      }

      const response = await fetch("/api/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          asset_type: normalizedAssetType,
          asset_type_id: null,
        }),
      });

      if (!response.ok) {
        let message = "Хөрөнгө үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.";
        try {
          const errorPayload = await response.json();
          if (typeof errorPayload?.error === "string" && errorPayload.error) {
            message = errorPayload.error;
          }
        } catch {
          // Ignore JSON parse failures and fallback to status text below.
        }

        if (message === "Хөрөнгө үүсгэж чадсангүй" && response.statusText) {
          message = response.statusText;
        }

        throw new Error(message);
      }

      await response.json();

      setOpen(false);
      setFormData({
        asset_type_id: "",
        asset_type: "",
        owner_id: "",
        asset_name: "",
        asset_code: "",
        business_owner: "",
        technical_owner: "",
        department: "",
        data_classification: "",
        access_level: "",
        authentication_method: "",
        supports_critical_service: false,
        business_process_ids: [],
        hosting: "",
        country: "",
        region: "",
        key_users_customers: "",
        rto_hours: "",
        rpo_hours: "",
        criticality: "",
        internet_exposed: false,
        backup_enabled: false,
        encryption_enabled: false,
        mfa_enabled: false,
        logging_enabled: false,
        edr_enabled: false,
        vuln_scanning_enabled: false,
        cmdb_ci_id: "",
        notes: "",
        status: "Active",
      });

      onAssetAdded();
    } catch (error) {
      console.error("Хөрөнгө үүсгэх үед алдаа гарлаа:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Хөрөнгө үүсгэж чадсангүй",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setRelatedThreats([]);
      setThreatsMessage("");
      setThreatsLoading(false);
      setSubmitError("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Хөрөнгө нэмэх
        </Button>
      </DialogTrigger>
      <DialogContent className="app-readonly top-16 translate-y-0 w-[95vw] sm:w-[92vw] md:w-[90vw] max-w-5xl max-h-[calc(100vh-8.5rem)] overflow-y-auto app-card-surface shadow-2xl duration-150 motion-reduce:duration-0">
        <DialogHeader className="pb-4 border-b border-border">
          <DialogTitle className="text-2xl font-bold bg-linear-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Шинээр хөрөнгө бүртгэх
          </DialogTitle>
          <DialogDescription className="sr-only">
            Шинэ хөрөнгийн үндсэн мэдээлэл, эрсдэлийн хүчин зүйлс, аюулгүй
            байдлын хяналт болон хариуцагчийг бүртгэнэ.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          {/* ── Үндсэн мэдээлэл ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label htmlFor="asset_name" className="font-medium mb-2 block">
                Хөрөнгийн нэр <span className="text-red-500">*</span>
              </Label>
              <Input
                id="asset_name"
                name="asset_name"
                value={formData.asset_name}
                onChange={handleInputChange}
                placeholder="Хэрэглэгчийн мэдээллийн сан"
                required
                className={ASSET_FORM_FIELD_CLASS}
              />
            </div>

            <div>
              <Label htmlFor="asset_type" className="font-medium mb-2 block">
                Хөрөнгийн төрөл <span className="text-red-500">*</span>
              </Label>
              <select
                id="asset_type"
                name="asset_type"
                required
                value={formData.asset_type}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    asset_type: e.target.value,
                    asset_type_id: "",
                  }))
                }
                className={NATIVE_SELECT_CLASS}
              >
                <option value="" disabled>
                  Сонгоно уу...
                </option>
                {ASSET_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {getLabel(ASSET_TYPE_LABELS, t)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="criticality" className="font-medium mb-2 block">
                Чухал байдлын түвшин <span className="text-red-500">*</span>
              </Label>
              <select
                id="criticality"
                name="criticality"
                required
                value={formData.criticality}
                onChange={(e) =>
                  handleSelectChange("criticality", e.target.value)
                }
                className={NATIVE_SELECT_CLASS}
              >
                <option value="" disabled>
                  Сонгоно уу...
                </option>
                {CRITICALITY_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {getLabel(CRITICALITY_LABELS, l)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label
                htmlFor="data_classification"
                className="font-medium mb-2 block"
              >
                Өгөгдлийн ангилал
              </Label>
              <select
                id="data_classification"
                name="data_classification"
                value={formData.data_classification}
                onChange={(e) =>
                  handleSelectChange("data_classification", e.target.value)
                }
                className={NATIVE_SELECT_CLASS}
              >
                <option value="">Сонгоно уу...</option>
                {DATA_CLASSIFICATION_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {getLabel(DATA_CLASSIFICATION_LABELS, c)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="status" className="font-medium mb-2 block">
                Төлөв
              </Label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={(e) => handleSelectChange("status", e.target.value)}
                className={NATIVE_SELECT_CLASS}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {getLabel(STATUS_LABELS, s)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Эрсдэлийн хүчин зүйлс ── */}
          <div className={ASSET_FORM_PANEL_CLASS}>
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">
              Эрсдэлийн хүчин зүйлс
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label
                  htmlFor="access_level"
                  className="font-medium mb-2 block"
                >
                  Хандалтын хэлбэр
                </Label>
                <select
                  id="access_level"
                  name="access_level"
                  value={formData.access_level}
                  onChange={(e) =>
                    handleSelectChange("access_level", e.target.value)
                  }
                  className={NATIVE_SELECT_CLASS}
                >
                  <option value="">Сонгоно уу...</option>
                  {ACCESS_LEVEL_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {getLabel(ACCESS_LEVEL_LABELS, a)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label
                  htmlFor="authentication_method"
                  className="font-medium mb-2 block"
                >
                  Танин баталгаажуулах арга
                </Label>
                <select
                  id="authentication_method"
                  name="authentication_method"
                  value={formData.authentication_method}
                  onChange={(e) =>
                    handleSelectChange("authentication_method", e.target.value)
                  }
                  className={NATIVE_SELECT_CLASS}
                >
                  <option value="">Сонгоно уу...</option>
                  {AUTHENTICATION_METHOD_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {getLabel(AUTHENTICATION_METHOD_LABELS, m)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="hosting" className="font-medium mb-2 block">
                  Байршуулалтын орчин
                </Label>
                <select
                  id="hosting"
                  name="hosting"
                  value={formData.hosting}
                  onChange={(e) =>
                    handleSelectChange("hosting", e.target.value)
                  }
                  className={NATIVE_SELECT_CLASS}
                >
                  <option value="">Сонгоно уу...</option>
                  {getHostingOptions(formData.asset_type).map((h) => (
                    <option key={h} value={h}>
                      {getLabel(HOSTING_LABELS, h)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="country" className="font-medium mb-2 block">
                  Байрлаж буй улс
                </Label>
                <select
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={(e) =>
                    handleSelectChange("country", e.target.value)
                  }
                  className={NATIVE_SELECT_CLASS}
                >
                  <option value="">Сонгоно уу...</option>
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="region" className="font-medium mb-2 block">
                  Байрлаж буй бүс нутаг (Primary Region)
                </Label>
                {formData.country ? (
                  <div
                    className={`${NATIVE_SELECT_CLASS} flex items-center text-muted-foreground`}
                  >
                    {formData.region || "—"}
                  </div>
                ) : (
                  <select
                    id="region"
                    name="region"
                    value={formData.region}
                    onChange={(e) =>
                      handleSelectChange("region", e.target.value)
                    }
                    className={NATIVE_SELECT_CLASS}
                  >
                    <option value="">Сонгоно уу...</option>
                    <option value="Global">Global</option>
                    <option value="Asia Pacific">Asia Pacific</option>
                    <option value="US-East">US-East</option>
                    <option value="US-West">US-West</option>
                    <option value="Europe">Europe</option>
                    <option value="Middle East">Middle East</option>
                    <option value="Africa">Africa</option>
                    <option value="South America">South America</option>
                    <option value="On-Premises">On-Premises</option>
                  </select>
                )}
              </div>

              <div>
                <Label
                  htmlFor="key_users_customers"
                  className="font-medium mb-2 block"
                >
                  Гол хэрэглэгчид
                </Label>
                <select
                  id="key_users_customers"
                  name="key_users_customers"
                  value={formData.key_users_customers}
                  onChange={(e) =>
                    handleSelectChange("key_users_customers", e.target.value)
                  }
                  className={NATIVE_SELECT_CLASS}
                >
                  <option value="">Сонгоно уу...</option>
                  {KEY_USERS_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label
                  htmlFor="supports_critical_service"
                  className="font-medium mb-2 block"
                >
                  Чухал business process дэмждэг эсэх
                </Label>
                <select
                  id="supports_critical_service"
                  name="supports_critical_service"
                  value={formData.supports_critical_service ? "true" : "false"}
                  onChange={(e) =>
                    handleSelectChange(
                      "supports_critical_service",
                      e.target.value,
                    )
                  }
                  className={NATIVE_SELECT_CLASS}
                >
                  <option value="true">Тийм</option>
                  <option value="false">Үгүй</option>
                </select>
              </div>

              {formData.supports_critical_service && (
                <div className="sm:col-span-2 rounded-md border border-border bg-background/40 p-3">
                  <Label className="mb-2 block text-sm font-medium">
                    Дэмждэг чухал business process
                  </Label>
                  {businessProcessesLoading ? (
                    <p className="text-sm text-muted-foreground">
                      Жагсаалт ачааллаж байна...
                    </p>
                  ) : businessProcesses.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {businessProcesses.map((process) => (
                        <label
                          key={process.id}
                          className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            className={ASSET_CHOICE_INPUT_CLASS}
                            checked={formData.business_process_ids.includes(
                              process.id,
                            )}
                            onChange={() =>
                              handleBusinessProcessToggle(process.id)
                            }
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block">
                              {formatBusinessProcessLabel(process)}
                            </span>
                            {(process.risk_count ||
                              toScoreNumber(process.highest_risk_score) >
                                0) && (
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                Эрсдэл {process.risk_count ?? 0}
                                {toScoreNumber(process.highest_risk_score) > 0
                                  ? ` · max score ${toScoreNumber(
                                      process.highest_risk_score,
                                    )}`
                                  : ""}
                              </span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Profile хуудас дээр чухал business process бүртгэсний
                      дараа энд сонголт гарна.
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="rto_hours" className="font-medium mb-2 block">
                  RTO — Сэргээх зорилтот цаг
                </Label>
                <Input
                  id="rto_hours"
                  name="rto_hours"
                  type="number"
                  step="0.25"
                  min="0"
                  value={formData.rto_hours}
                  onChange={handleInputChange}
                  placeholder="4"
                  className={ASSET_FORM_FIELD_CLASS}
                />
              </div>

              <div>
                <Label htmlFor="rpo_hours" className="font-medium mb-2 block">
                  RPO — Өгөгдөл алдах дээд хязгаар (цаг)
                </Label>
                <Input
                  id="rpo_hours"
                  name="rpo_hours"
                  type="number"
                  step="0.25"
                  min="0"
                  value={formData.rpo_hours}
                  onChange={handleInputChange}
                  placeholder="1"
                  className={ASSET_FORM_FIELD_CLASS}
                />
              </div>
            </div>
          </div>

          {/* ── Аюулгүй байдлын хяналтын дэлгэрэнгүй ── */}
          <div className={ASSET_FORM_PANEL_CLASS}>
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">
              Аюулгүй байдлын дэлгэрэнгүй мэдээлэл
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                htmlFor="logging_enabled"
                className="flex items-center gap-2 cursor-pointer select-none rounded-md border border-border bg-background/40 px-3 py-2 hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  id="logging_enabled"
                  name="logging_enabled"
                  checked={formData.logging_enabled}
                  onChange={handleCheckboxChange}
                  className={ASSET_CHOICE_INPUT_CLASS}
                />
                <span className="text-sm font-medium">Лог бүртгэл / SIEM</span>
              </label>

              <label
                htmlFor="edr_enabled"
                className="flex items-center gap-2 cursor-pointer select-none rounded-md border border-border bg-background/40 px-3 py-2 hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  id="edr_enabled"
                  name="edr_enabled"
                  checked={formData.edr_enabled}
                  onChange={handleCheckboxChange}
                  className={ASSET_CHOICE_INPUT_CLASS}
                />
                <span className="text-sm font-medium">
                  EDR / Endpoint Security
                </span>
              </label>

              <label
                htmlFor="backup_enabled"
                className="flex items-center gap-2 cursor-pointer select-none rounded-md border border-border bg-background/40 px-3 py-2 hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  id="backup_enabled"
                  name="backup_enabled"
                  checked={formData.backup_enabled}
                  onChange={handleCheckboxChange}
                  className={ASSET_CHOICE_INPUT_CLASS}
                />
                <span className="text-sm font-medium">Нөөцлөлт</span>
              </label>

              <label
                htmlFor="vuln_scanning_enabled"
                className="flex items-center gap-2 cursor-pointer select-none rounded-md border border-border bg-background/40 px-3 py-2 hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  id="vuln_scanning_enabled"
                  name="vuln_scanning_enabled"
                  checked={formData.vuln_scanning_enabled}
                  onChange={handleCheckboxChange}
                  className={ASSET_CHOICE_INPUT_CLASS}
                />
                <span className="text-sm font-medium">Эмзэг байдлын скан</span>
              </label>

              <label
                htmlFor="encryption_enabled"
                className="flex items-center gap-2 cursor-pointer select-none rounded-md border border-border bg-background/40 px-3 py-2 hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  id="encryption_enabled"
                  name="encryption_enabled"
                  checked={formData.encryption_enabled}
                  onChange={handleCheckboxChange}
                  className={ASSET_CHOICE_INPUT_CLASS}
                />
                <span className="text-sm font-medium">Шифрлэлт</span>
              </label>

              <label
                htmlFor="mfa_enabled"
                className="flex items-center gap-2 cursor-pointer select-none rounded-md border border-border bg-background/40 px-3 py-2 hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  id="mfa_enabled"
                  name="mfa_enabled"
                  checked={formData.mfa_enabled}
                  onChange={handleCheckboxChange}
                  className={ASSET_CHOICE_INPUT_CLASS}
                />
                <span className="text-sm font-medium">MFA</span>
              </label>

              <div className="sm:col-span-2">
                <Label htmlFor="notes" className="font-medium mb-2 block">
                  Тэмдэглэл
                </Label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Нэмэлт мэдээлэл, тохиргоо, аудитын хугацаа..."
                  className="app-form-field w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {selectedAssetType && relatedThreats.length > 0 && (
            <div className="app-form-panel rounded-lg border p-3">
              <h3 className="font-semibold text-sm mb-3 text-foreground">
                Холбоотой аюулууд:{" "}
                {getLabel(ASSET_TYPE_LABELS, selectedAssetType)}
              </h3>
              {threatsMessage && (
                <p className="text-xs text-muted-foreground mb-3">
                  {threatsMessage}
                </p>
              )}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {displayedThreats.map((threat) => (
                  <div
                    key={threat.id}
                    className="app-choice-row text-xs p-2 rounded border"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded text-white text-xs font-semibold ${
                          threat.risk_level === "Critical"
                            ? "bg-red-600"
                            : threat.risk_level === "High"
                              ? "bg-orange-600"
                              : threat.risk_level === "Medium"
                                ? "bg-yellow-600"
                                : "bg-green-600"
                        }`}
                      >
                        {threat.risk_level
                          ? getLabel(RISK_LEVEL_LABELS, threat.risk_level)
                          : "Эрсдэл"}
                      </span>
                      <span className="font-medium text-foreground">
                        {threat.threat_name}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      {threat.description}
                    </p>
                    {(threat.mitigation_notes_mn ||
                      threat.mitigation_notes) && (
                      <p className="text-foreground mt-1 font-semibold">
                        Бууруулах арга хэмжээ:{" "}
                        {threat.mitigation_notes_mn || threat.mitigation_notes}
                      </p>
                    )}
                  </div>
                ))}
                {relatedThreats.length > 10 && (
                  <p className="text-xs text-muted-foreground italic">
                    ... мөн {relatedThreats.length - 10} аюул байна
                  </p>
                )}
              </div>
            </div>
          )}

          {selectedAssetType &&
            !threatsLoading &&
            relatedThreats.length === 0 && (
              <div className="app-form-panel rounded-lg border p-3 text-sm">
                {threatsMessage ||
                  `${getLabel(ASSET_TYPE_LABELS, selectedAssetType)} төрөлд холбогдсон аюул одоогоор бүртгэгдээгүй байна.`}
              </div>
            )}

          {threatsLoading && (
            <div className="text-center text-sm text-muted-foreground">
              Холбоотой аюулуудыг ачаалж байна...
            </div>
          )}

          {/* ── Хариуцагч ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label
                htmlFor="business_owner"
                className="font-medium mb-2 block"
              >
                Бизнесийн хариуцагч
              </Label>
              <Input
                id="business_owner"
                name="business_owner"
                value={formData.business_owner}
                onChange={handleInputChange}
                placeholder="МТ газрын захирал"
                className={ASSET_FORM_FIELD_CLASS}
              />
            </div>
            <div>
              <Label
                htmlFor="technical_owner"
                className="font-medium mb-2 block"
              >
                Техникийн хариуцагч
              </Label>
              <Input
                id="technical_owner"
                name="technical_owner"
                value={formData.technical_owner}
                onChange={handleInputChange}
                placeholder="Ахлах инженер"
                className={ASSET_FORM_FIELD_CLASS}
              />
            </div>
            <div>
              <Label htmlFor="department" className="font-medium mb-2 block">
                Хэлтэс
              </Label>
              <Input
                id="department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                placeholder="МТ-ийн хэлтэс"
                className={ASSET_FORM_FIELD_CLASS}
              />
            </div>
          </div>

          {/* ── Submit Error ── */}
          {submitError && (
            <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {submitError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="px-6"
            >
              Болих
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="px-6 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Үүсгэж байна..." : "Хөрөнгө үүсгэх"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default memo(AddAssetModal);
