/** Minimal RFC 4180 CSV serialization — quotes a field only when it contains a comma, quote or
 * newline, doubling any embedded quotes. Kept dependency-free so it's trivially unit-testable. */
function csvField(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(columns: { key: string; label: string }[], rows: Record<string, string | number>[]): string {
  const header = columns.map((c) => csvField(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => csvField(row[c.key] ?? "")).join(","));
  return [header, ...lines].join("\r\n");
}
