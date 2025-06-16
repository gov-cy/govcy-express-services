import puppeteer from 'puppeteer';
import { isProdOrStaging } from './govcyEnvVariables.mjs';

/**
 * Generates a PDF from HTML and returns it as a Buffer.
 * @param {string} html - The full HTML string of the document (should be accessible HTML).
 * @returns {Promise<Buffer>} - The generated PDF buffer.
 */
export async function generatePDF(html) {
  let puppeteerOptions = { headless: 'new' };

  // Only ignore HTTPS errors in non-production/staging environments
  if (!isProdOrStaging()) {
    puppeteerOptions.args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--ignore-certificate-errors'
    ];
    puppeteerOptions.ignoreHTTPSErrors = true;
  }
  const browser = await puppeteer.launch(puppeteerOptions);
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfUint8Array = await page.pdf({
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: false,
    preferCSSPageSize: true,
  });

  await browser.close();

  // Convert Uint8Array to Buffer
  const pdfBuffer = Buffer.from(pdfUint8Array);

  return pdfBuffer;
}
