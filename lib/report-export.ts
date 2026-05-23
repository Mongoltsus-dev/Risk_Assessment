import { NextResponse } from "next/server";

type ExportFormat = "csv" | "xls";

type ExportRow = Record<string, unknown>;

const MIME_TYPES: Record<ExportFormat, string> = {
  csv: "text/csv; charset=utf-8",
  xls: "application/vnd.ms-excel; charset=utf-8",
};

function normalizeFormat(value: string | null): ExportFormat {
  return value === "xls" || value === "excel" ? "xls" : "csv";
}

function safeFilePart(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "report"
  );
}

function displayValue(value: unknown) {
  if (value === undefined || value === null) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function escapeCsvValue(value: unknown) {
  const text = displayValue(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function escapeHtml(value: unknown) {
  return displayValue(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function rowsToCsv(rows: ExportRow[], columns: string[]) {
  const header = columns.map(escapeCsvValue).join(",");
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvValue(row[column])).join(","),
  );
  return [`\uFEFF${header}`, ...body].join("\r\n");
}

function rowsToExcelHtml(rows: ExportRow[], columns: string[], title: string) {
  const tableHead = columns
    .map((column) => `<th>${escapeHtml(column)}</th>`)
    .join("");
  const tableBody = rows
    .map(
      (row) =>
        `<tr>${columns.map((column) => `<td>${escapeHtml(row[column])}</td>`).join("")}</tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
    th { background: #e5e7eb; font-weight: 700; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <table><thead><tr>${tableHead}</tr></thead><tbody>${tableBody}</tbody></table>
</body>
</html>`;
}

export function exportRows({
  rows,
  columns,
  title,
  requestedFormat,
}: {
  rows: ExportRow[];
  columns: string[];
  title: string;
  requestedFormat: string | null;
}) {
  const format = normalizeFormat(requestedFormat);
  const body =
    format === "xls"
      ? rowsToExcelHtml(rows, columns, title)
      : rowsToCsv(rows, columns);
  const datePart = new Date().toISOString().slice(0, 10);
  const filename = `${safeFilePart(title)}-${datePart}.${format}`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": MIME_TYPES[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
