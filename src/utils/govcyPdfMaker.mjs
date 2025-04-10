import puppeteer from 'puppeteer';

/**
 * Generates a PDF from HTML and returns it as a Buffer.
 * @param {string} html - The full HTML string of the document (should be accessible HTML).
 * @returns {Promise<Buffer>} - The generated PDF buffer.
 */
export async function generatePDF(html) {
  const browser = await puppeteer.launch({ headless: 'new' });
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
