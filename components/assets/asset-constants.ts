export const ASSET_TYPE_OPTIONS = [
  "Application",
  "Service",
  "Database",
  "Network",
  "Endpoint Fleet",
  "Identity",
  "SaaS Tenant",
];

export const CRITICALITY_LEVELS = [
  "Tier 0 (Life/Safety)",
  "Tier 1 (Mission Critical)",
  "Tier 2 (Business Critical)",
  "Tier 3 (Important)",
];

export const STATUS_OPTIONS = ["Active", "Inactive", "Deprecated", "Planned"];

export const DATA_CLASSIFICATION_OPTIONS = [
  "Public",
  "Internal",
  "Confidential",
  "Restricted",
];

export const ACCESS_LEVEL_OPTIONS = [
  "Internal only",
  "VPN required",
  "Public web access",
  "Public API exposed",
];

export const KEY_USERS_OPTIONS = [
  "Бүх ажилчид",
  "Зөвхөн IT хэлтэс",
  "Санхүүгийн хэлтэс",
  "Хүний нөөцийн хэлтэс",
  "Борлуулалт / Маркетингийн хэлтэс",
  "Гүйцэтгэх удирдлага",
  "Системийн администратор",
  "Харилцагч / үйлчлүүлэгч",
  "Гадаад түнш байгууллага",
  "Нийлүүлэгч / vendor",
  "Зөвхөн дотоод хэрэглэгчид",
  "Гадаад хэрэглэгчид",
  "API хэрэглэгч системүүд",
  "Бусад",
];

export const AUTHENTICATION_METHOD_OPTIONS = [
  "Password only",
  "Password + MFA",
  "SSO",
  "Passwordless (FIDO2)",
  "Certificate-based (PKI)",
  "API Key / Token",
  "Service Account",
  "Kerberos",
];

export const HOSTING_OPTIONS = [
  "SaaS",
  "Azure",
  "AWS",
  "GCP",
  "On-Prem",
  "Hybrid",
  "Other",
];

const HOSTING_OPTIONS_BY_ASSET_TYPE: Record<string, string[]> = {
  "Endpoint Fleet": ["On-Prem", "Remote", "BYOD", "Hybrid", "Other"],
  Network: ["On-Prem", "Azure", "AWS", "GCP", "Hybrid", "Other"],
  "SaaS Tenant": ["SaaS", "Azure", "AWS", "GCP", "On-Prem", "Hybrid"],
};

export const getHostingOptions = (assetType?: string) =>
  (assetType && HOSTING_OPTIONS_BY_ASSET_TYPE[assetType]) || HOSTING_OPTIONS;

export const NATIVE_SELECT_CLASS =
  "app-form-field h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export const ASSET_TYPE_LABELS: Record<string, string> = {
  Application: "Аппликейшн",
  Service: "Үйлчилгээ",
  Database: "Өгөгдлийн сан",
  Network: "Сүлжээ",
  "Endpoint Fleet": "Төгсгөлийн төхөөрөмж",
  Identity: "Нэвтрэлтийн систем",
  "SaaS Tenant": "SaaS",
};

export const CRITICALITY_LABELS: Record<string, string> = {
  "Tier 0 (Life/Safety)": "Түвшин 0 (Амь нас, аюулгүй байдал)",
  "Tier 1 (Mission Critical)": "Түвшин 1 (Үндсэн үйл ажиллагаанд нэн чухал)",
  "Tier 2 (Business Critical)": "Түвшин 2 (Бизнесийн үйл ажиллагаанд чухал)",
  "Tier 3 (Important)": "Түвшин 3 (Маш Чухал)",
};

export const STATUS_LABELS: Record<string, string> = {
  Active: "Идэвхтэй",
  Inactive: "Идэвхгүй",
  Deprecated: "Хэрэглээнээс гарсан",
  Planned: "Төлөвлөгдсөн",
};

export const DATA_CLASSIFICATION_LABELS: Record<string, string> = {
  Public: "Нийтийн",
  Internal: "Дотоод",
  Confidential: "Нууц",
  Restricted: "Маш нууц",
};

export const ACCESS_LEVEL_LABELS: Record<string, string> = {
  "Internal only": "Зөвхөн дотоод сүлжээнээс",
  "VPN required": "VPN-ээр холбогдох шаардлагатай",
  "Public web access": "Интернетэд нээлттэй",
  "Public API exposed": "API нь интернэтэд нээлттэй",
};

export const AUTHENTICATION_METHOD_LABELS: Record<string, string> = {
  "Password only": "Зөвхөн нууц үг",
  "Password + MFA": "Нууц үг + MFA",
  SSO: "SSO",
  "Active Directory": "Active Directory",
};

export const HOSTING_LABELS: Record<string, string> = {
  SaaS: "SaaS",
  Azure: "Azure",
  AWS: "AWS",
  GCP: "GCP",
  "On-Prem": "On-Prem",
  Hybrid: "Hybrid",
  Remote: "Remote",
  BYOD: "BYOD",
  Other: "Бусад",
};

export const RISK_LEVEL_LABELS: Record<string, string> = {
  Critical: "Ноцтой",
  High: "Өндөр",
  Medium: "Дунд",
  Low: "Бага",
};

export const COUNTRY_REGION_MAP: Record<string, string> = {
  // Asia Pacific
  Mongolia: "Asia Pacific",
  China: "Asia Pacific",
  Japan: "Asia Pacific",
  "South Korea": "Asia Pacific",
  Australia: "Asia Pacific",
  "New Zealand": "Asia Pacific",
  India: "Asia Pacific",
  Singapore: "Asia Pacific",
  Indonesia: "Asia Pacific",
  Malaysia: "Asia Pacific",
  Thailand: "Asia Pacific",
  Vietnam: "Asia Pacific",
  Philippines: "Asia Pacific",
  Pakistan: "Asia Pacific",
  Bangladesh: "Asia Pacific",
  "Sri Lanka": "Asia Pacific",
  Nepal: "Asia Pacific",
  // US
  "United States (East)": "US-East",
  "United States (West)": "US-West",
  Canada: "US-East",
  Mexico: "US-West",
  // Europe
  "United Kingdom": "Europe",
  Germany: "Europe",
  France: "Europe",
  Netherlands: "Europe",
  Sweden: "Europe",
  Norway: "Europe",
  Denmark: "Europe",
  Finland: "Europe",
  Switzerland: "Europe",
  Austria: "Europe",
  Belgium: "Europe",
  Spain: "Europe",
  Italy: "Europe",
  Poland: "Europe",
  "Czech Republic": "Europe",
  Romania: "Europe",
  Ukraine: "Europe",
  Russia: "Europe",
  // Middle East
  "United Arab Emirates": "Middle East",
  "Saudi Arabia": "Middle East",
  Qatar: "Middle East",
  Kuwait: "Middle East",
  Bahrain: "Middle East",
  Israel: "Middle East",
  Turkey: "Middle East",
  Iran: "Middle East",
  Iraq: "Middle East",
  Jordan: "Middle East",
  // Africa
  "South Africa": "Africa",
  Nigeria: "Africa",
  Egypt: "Africa",
  Kenya: "Africa",
  Ethiopia: "Africa",
  Ghana: "Africa",
  Tanzania: "Africa",
  Morocco: "Africa",
  // South America
  Brazil: "South America",
  Argentina: "South America",
  Colombia: "South America",
  Chile: "South America",
  Peru: "South America",
  Venezuela: "South America",
};

export const COUNTRY_OPTIONS = Object.keys(COUNTRY_REGION_MAP).sort();

export const getLabel = (labels: Record<string, string>, value?: string) =>
  value ? (labels[value] ?? value) : value;
