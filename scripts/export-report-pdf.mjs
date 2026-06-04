/**
 * Export the Silhouette project report (HTML) to a polished PDF.
 *
 * Primary path: Playwright (Chromium headless → page.pdf). Playwright is already
 * a dependency; if the Chromium binary is missing, run once:
 *     npx playwright install chromium
 *
 * Usage:
 *     node scripts/export-report-pdf.mjs
 *     node scripts/export-report-pdf.mjs path/to/input.html path/to/output.pdf
 *
 * Zero-dependency fallback if Playwright/Chromium is unavailable:
 * open ai/reports/silhouette_project_report.html in any browser → Print → Save as PDF.
 */
import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputHtml = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, "ai/reports/silhouette_project_report.html");
const outputPdf = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(root, "ai/reports/silhouette_project_report.pdf");

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(pathToFileURL(inputHtml).href, { waitUntil: "networkidle" });
  await page.pdf({
    path: outputPdf,
    format: "Letter",
    printBackground: true,
    margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
  });
  await browser.close();
  console.log(`PDF written: ${outputPdf}`);
}

main().catch((err) => {
  console.error("PDF export failed.");
  console.error(err?.message ?? err);
  console.error(
    "\nIf this is a missing-browser error, run: npx playwright install chromium\n" +
      "Or use the fallback: open the .html in a browser and Save as PDF."
  );
  process.exit(1);
});
