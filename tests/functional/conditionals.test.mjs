import puppeteer from 'puppeteer';
import { expect } from 'chai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const baseUrl = 'https://localhost:44319/conditional-test-service';

describe('Conditional Service - Functional Test', function () {
    this.timeout(30000); // Extend timeout for slow operations

    let browser;
    let page;

    before(async () => {
        // Step 1: Launch browser
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--ignore-certificate-errors',
                '--disable-features=AutofillServerCommunication', // Disable autofill
                '--disable-prompt-on-repost', // Disable repost prompts
                '--disable-features=PasswordLeakDetection', // Disable password leak detection
            ],
            ignoreHTTPSErrors: true
        });

        // Step 2: Open new incognito context and page
        const context = await browser.createBrowserContext();
        page = await context.newPage();

        // Step 3: Navigate to the test service
        await page.goto(baseUrl, { waitUntil: 'networkidle0' });

        // Step 4: Wait for login fields
        await page.waitForSelector('#username', { visible: true });

        // Step 5: Fill in login credentials
        await page.type('#username', process.env.TEST_USERNAME);
        await page.type('#password', process.env.TEST_PASSWORD);

        // Step 6: Submit login form
        await page.click('button[type="submit"]');

        // Step 7: Wait for navigation
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
    });

    after(async () => {
        await browser.close();
    });

    it('1. should load the start page after login', async () => {
        // Step 8: Check page title
        const title = await page.title();
        expect(title).to.include('Υπηρεσία τεστ με συνθήκες');
    });

    it('2. should visit /review directly and only see unconditional pages', async () => {
        // Step 1: Go directly to the review page
        await page.goto(`${baseUrl}/review`, { waitUntil: 'networkidle0' });
        // Step 2: Wait for the heading to confirm we're on the review page
        await page.waitForSelector('h1', { visible: true });
        const h1Text = await page.$eval('h1', el => el.textContent.trim());
        expect(h1Text).to.include('Ελέγξτε τις απαντήσεις σας');

        // Step 3: Get the page text and assert only unconditional pages are present
        const bodyText = await page.evaluate(() => document.body.innerText);

        expect(bodyText).to.include('Αρχική Σελίδα');         // Always shown
        expect(bodyText).to.include('Σελίδα Λεπτομερειών');   // Always shown
        expect(bodyText).to.include('Επιπλέον πεδιο μόνο με συνθήκες');
        expect(bodyText).to.include('Επιπλέον πεδιο μόνο με συνθήκες 2');
    });


    it('3. should select "no" and navigate to the details page', async () => {
        // ✅ Go back to the start page
        await page.goto(`${baseUrl}/index`, { waitUntil: 'networkidle0' });

        // Wait for the radio button
        await page.waitForSelector('#showExtra-option-2', { visible: true });

        // Click "no"
        await page.click('#showExtra-option-2');

        // Click submit
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.click('button[type="submit"]'),
        ]);

        // Wait for heading
        await page.waitForSelector('h1', { visible: true });
        const h1Text = await page.$eval('h1', el => el.textContent.trim());

        // Expect correct heading
        expect(h1Text).to.include('Πληροφορίες');
    });

    it('4. should visit /review and see that conditional-extra-2 is excluded', async () => {
        // Navigate to review page
        await page.goto(`${baseUrl}/review`, { waitUntil: 'networkidle0' });

        // Wait for heading
        await page.waitForSelector('h1', { visible: true });
        const h1Text = await page.$eval('h1', el => el.textContent.trim());
        expect(h1Text).to.include('Ελέγξτε τις απαντήσεις σας');

        // Check body content
        const bodyText = await page.evaluate(() => document.body.innerText);

        // ✅ Should include unconditional + conditional-extra (first page)
        expect(bodyText).to.include('Αρχική Σελίδα');
        expect(bodyText).to.include('Σελίδα Λεπτομερειών');
        expect(bodyText).to.include('Επιπλέον πεδιο μόνο με συνθήκες'); // still valid

        // ❌ Should exclude conditional-extra-2
        expect(bodyText).to.not.include('Επιπλέον πεδιο μόνο με συνθήκες 2');
    });

    it('5. should enter "hide" in details page and reach review due to chained conditions', async () => {
        await page.goto(`${baseUrl}/details`, { waitUntil: 'networkidle0' });

        await page.waitForSelector('#info', { visible: true });
        await page.type('#info', 'hide');

        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.click('button[type="submit"]')
        ]);

        // Final destination should be the review page
        const h1Text = await page.$eval('h1', el => el.textContent.trim());
        expect(h1Text).to.include('Ελέγξτε τις απαντήσεις σας');
    });

    it('6. should not include conditional pages in review after being skipped by redirect', async () => {
        // We are already on the review page from previous test

        // Step 1: Grab all visible text from the body
        const reviewText = await page.evaluate(() => document.body.innerText);

        // Step 2: Ensure base pages are present
        expect(reviewText).to.include('Αρχική Σελίδα');
        expect(reviewText).to.include('Σελίδα Λεπτομερειών');

        // Step 3: Ensure conditional pages are NOT present
        expect(reviewText).to.not.include('Επιπλέον πεδιο μόνο με συνθήκες');
        expect(reviewText).to.not.include('Επιπλέον πεδιο μόνο με συνθήκες 2');
    });

    it('7. should allow navigation through conditional pages when "yes" is selected', async () => {
        // Step 1: Go back to the start page
        await page.goto(`${baseUrl}/index`, { waitUntil: 'networkidle0' });

        // Step 2: Select "yes"
        await page.waitForSelector('#showExtra-option-1', { visible: true });
        await page.click('#showExtra-option-1');

        // Step 3: Submit and expect navigation to "details"
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.click('button[type="submit"]'),
        ]);

        // Step 4: Fill in details info (not triggering redirect condition)
        await page.waitForSelector('#info', { visible: true });
        await page.type('#info', 'nothing special');

        // Step 5: Submit and expect to land on conditional-extra
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.click('button[type="submit"]'),
        ]);

        const h1 = await page.$eval('h1', el => el.textContent.trim());
        expect(h1).to.include('Επιπλέον πεδιο μόνο με συνθήκες');
    });

    it('8. should show only conditional-extra (not conditional-extra-2) on review page', async () => {
        // Step 1: Navigate to review
        await page.goto(`${baseUrl}/review`, { waitUntil: 'networkidle0' });

        // Step 2: Confirm we're on the review page
        const heading = await page.$eval('h1', el => el.textContent.trim());
        expect(heading).to.include('Ελέγξτε τις απαντήσεις σας');

        // Step 3: Get all visible text
        const reviewText = await page.evaluate(() => document.body.innerText);

        // Step 4: Validate expected and excluded pages
        expect(reviewText).to.include('Επιπλέον πεδιο μόνο με συνθήκες');
        expect(reviewText).to.not.include('Επιπλέον πεδιο μόνο με συνθήκες 2');
    });

    it('9. should trigger validation error only for conditional-extra (not extra-2)', async () => {
        // Step 1: Click submit on the review page
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.click('button[type="submit"]')
        ]);

        // Step 2: Wait for error summary
        await page.waitForSelector('#errorSummary-title', { visible: true });
        const errorSummary = await page.$eval('#errorSummary-title', el => el.textContent.trim());
        expect(errorSummary).to.include('Υπάρχει πρόβλημα');

        // Step 3: Check which validation errors appear
        const bodyText = await page.evaluate(() => document.body.innerText);

        // ✅ Should contain only the relevant validation error
        expect(bodyText).to.include('Εισαγάγετε τον αριθμό επιπλέον πεδίο'); // for `extra`

        // ❌ Should NOT include the skipped conditional page's error
        expect(bodyText).to.not.include('Εισαγάγετε τον αριθμό επιπλέον πεδίο 2'); // for `extra-2`
    });

    it('10. should fill valid data in conditional-extra and successfully submit', async () => {
        // Step 1: Go back to conditional-extra via the "Αλλαγή" (Change) link
        const changeLinks = await page.$$eval('a', links =>
            links.map(link => ({ href: link.href, text: link.textContent.trim() }))
        );

        const changeLink = changeLinks.find(link =>
            link.text.includes('Αλλαγή') && link.href.includes('conditional-extra')
        );

        expect(changeLink).to.exist;

        // Step 2: Navigate to the conditional-extra page
        await page.goto(changeLink.href, { waitUntil: 'networkidle0' });

        // Step 3: Fill in a valid value
        await page.waitForSelector('#extra', { visible: true });
        await page.type('#extra', '12345');

        // Step 4: Submit
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.click('button[type="submit"]')
        ]);

        // Step 5: Confirm review page again
        const heading = await page.$eval('h1', el => el.textContent.trim());
        expect(heading).to.include('Ελέγξτε τις απαντήσεις σας');

        // Step 6: Submit the final form
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.click('button[type="submit"]')
        ]);

        // Step 7: Confirm success page
        const finalHeading = await page.$eval('h1', el => el.textContent.trim());
        expect(finalHeading).to.include('Έχουμε λάβει την αίτησή σας'); // or whatever your success page title is

        // Step 8: Check which validation errors appear
        const bodyText = await page.evaluate(() => document.body.innerText);
        expect(bodyText).to.include('Επιπλέον πεδιο μόνο με συνθήκες'); // for `extra`

        // ❌ Should NOT include the skipped conditional page's error
        expect(bodyText).to.not.include('Επιπλέον πεδιο μόνο με συνθήκες 2'); // for `extra-2`
    });


});
