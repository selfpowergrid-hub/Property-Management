/** Quote a CSV cell, escaping embedded quotes (RFC 4180). */
export function csvCell(value: string | number | null | undefined): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

/** Build a CSV document (CRLF line endings) from a header + rows. */
export function toCsv(header: string[], rows: (string | number)[][]): string {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(","));
  return lines.join("\r\n");
}

/** Standard CSV Response with a download filename. */
export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
