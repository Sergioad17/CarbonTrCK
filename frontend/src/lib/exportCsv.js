export function buildCsvText(rows, columns) {
  const esc = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const header = columns.map((col) => esc(col.label)).join(",");
  const body = rows.map((row) => columns.map((col) => esc(col.get(row))).join(","));
  return [header, ...body].join("\n");
}

export function downloadCsvFile(filename, csvText) {
  const blob = new Blob(["\uFEFF" + csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
