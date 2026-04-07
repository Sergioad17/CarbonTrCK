import { buildCsvText, downloadCsvFile } from "./exportCsv";

export function exportRowsToCsv({ filename, rows, columns }) {
  const csvText = buildCsvText(rows, columns);
  downloadCsvFile(filename, csvText);
  return csvText;
}
