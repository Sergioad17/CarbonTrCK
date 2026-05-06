import { generateReportService } from "./reports.service.js";

export async function generateReportController(request, response) {
  response.json({ report: await generateReportService(request.user, request.body || {}) });
}
