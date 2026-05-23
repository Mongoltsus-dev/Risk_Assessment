const ASSET_TYPE_MAPPING_ALIASES: Record<string, string[]> = {
  service: ["Application", "Infrastructure", "API", "SaaS Tenant"],
  identity: ["Identity Provider"],
  software: ["Application", "Software"],
  hardware: ["Infrastructure", "Hardware", "Network"],
  data: ["Database", "File Storage", "Data"],
  cloud: ["Infrastructure", "Cloud", "SaaS Tenant"],
};

export function getAssetTypeMappingNames(assetType: string | null | undefined) {
  const cleaned = String(assetType ?? "").trim();
  if (!cleaned) return [];

  const aliases = ASSET_TYPE_MAPPING_ALIASES[cleaned.toLowerCase()] ?? [];
  return Array.from(new Set([cleaned, ...aliases]));
}
