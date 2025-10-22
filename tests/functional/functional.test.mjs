import puppeteer from 'puppeteer';
import { expect } from 'chai';
import dotenv from 'dotenv';
import pa11y from 'pa11y';

// Load environment variables from .env
dotenv.config();
const baseUrl = 'https://localhost:44319/test';
let resultsArray = [];
const pa11yIgnoreErrors = [
  'WCAG2AA.Principle4.Guideline4_1.4_1_2.H91.A.NoContent'
];
const pa11yStandard = 'WCAG2AA';

async function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Functional Test - Login and Navigate', function () {
    this.timeout(30000); // Set timeout to 30 seconds
    
    let browser;
    let page;
    let pa11yResults; // Declare a variable to store pa11y results
    
    before(async () => {
      // Launch Puppeteer and create a new incognito context
      browser = await puppeteer.launch({
        headless: true, // Set to true for headless mode
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
      const context = await browser.createBrowserContext();
      page = await context.newPage();
      
      // Step 1: Navigate to the test service
      await page.goto(baseUrl, { waitUntil: 'networkidle0' });
      
      // Step 2: Wait for the login page and fill in the login form
      await page.waitForSelector('#username', { visible: true });
      const username = process.env.TEST_USERNAME;
      const password = process.env.TEST_PASSWORD;
      
      await page.type('#username', username); // Input the username
      await page.type('#password', password); // Input the password
      await page.click('button[type="submit"]'); // Click the submit button
      
      // Wait for navigation after login
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
    });
    
    after(async () => {
      await browser.close();
    });
    
    it('1. should verify the initial page after login', async () => {
      this.timeout(30000); // Set timeout to 30 seconds
      // Step 3: Verify redirection to the test service
      // await page.waitForSelector('h1', { visible: true }); // Wait for the main heading to be visible
      const serviceTitle = await page.title();
      expect(serviceTitle).to.equal('Επιλογή Εγγάφου - Υπηρεσία τεστ - gov.cy'); // Verify the title of the first page
    });
  
    it('2. should change the language to English when clicking the EN link', async () => {
      // Step 1: Ensure the EN link is visible
      await page.waitForSelector('a[lang="en"]', { visible: true });
  
      // Step 2: Click the EN link to change the language
      await page.click('a[lang="en"]');
  
       // Step 3: Wait for the page title to change to the English version
        await page.waitForFunction(
            () => document.title.trim() !== '', // Wait until the title is not an empty string
            { timeout: 5000 } // Wait up to 5 seconds
        );
  
      // Step 4: Verify the page title has changed to the English version
      const englishTitle = await page.title();
      expect(englishTitle).to.equal('Document selection - Test service - gov.cy'); // Verify the English title
      // run pa11y on the page and get results;
      pa11yResults = await pa11y(page.url(), {
        standard: pa11yStandard,
        ignoreUrl: true,
        page: page,
        browser: browser,
        ignore: pa11yIgnoreErrors
      });
      // push results in an array
      resultsArray.push({ url: page.url(), issues: pa11yResults.issues });
    });
    
    it('2.1. should have no accessibility issues on the English page', () => {
      // Assert that there are no accessibility issues
      expect(pa11yResults.issues).to.be.an('array').that.is.empty; // Assert that issues array is empty
    });

    it('3. should submit the form and display an error summary', async () => {
        // Step 1: Ensure the submit button is visible
        await page.waitForSelector('button[type="submit"]', { visible: true });
      
        // Step 2: Click the submit button
        await page.click('button[type="submit"]');
      
        // Step 3: Wait for the error summary to appear
        await page.waitForFunction(
          () => document.querySelector('#errorSummary-title') !== null, // Wait until the error summary is present
          { timeout: 5000 } // Wait up to 5 seconds
        );
      
        // Step 4: Verify the error summary is displayed
        const errorSummary = await page.$eval('#errorSummary-title', (el) => el.textContent.trim());
        expect(errorSummary).to.equal('There is a problem'); // Verify the error message

        // Step 5: Verify the specific error message for the certificate selection
        const certificateError = await page.$eval('#certificate_select-error', (el) => el.textContent.trim());
        expect(certificateError).to.include('Error:'); // Verify the error prefix
        expect(certificateError).to.include('Select one or more documents'); // Verify the error message content
        // run pa11y on the page and get results;
        pa11yResults = await pa11y(page.url(), {
          standard: pa11yStandard,
          ignoreUrl: true,
          page: page,
          browser: browser,
          ignore: pa11yIgnoreErrors
        });
        // push results in an array
        resultsArray.push({ url: page.url(), issues: pa11yResults.issues });
      });

      
      it('3.1. should have no accessibility issues on the form displaying an error summary', () => {
        // Assert that there are no accessibility issues
        expect(pa11yResults.issues).to.be.an('array').that.is.empty; // Assert that issues array is empty
      });

      it('4. should select a certificate and navigate to the contact details page', async () => {
        // Step 1: Ensure the checkbox is visible
        await page.waitForSelector('#certificate_select-option-1', { visible: true });
      
        // Step 2: Click the checkbox to select the certificate
        await page.click('#certificate_select-option-1');
      
        // Step 3: Click the submit button
        await page.click('button[type="submit"]');
      
        // Step 4: Wait for the page title to change to the contact details page
        await page.waitForFunction(
          () => document.title === 'Contact details - Test service - gov.cy', // Wait for the title to match
          { timeout: 5000 } // Wait up to 5 seconds
        );
      
        // Step 5: Verify the page title
        const contactDetailsTitle = await page.title();
        expect(contactDetailsTitle).to.equal('Contact details - Test service - gov.cy'); // Verify the title
      
        // Step 6: Verify the heading on the contact details page
        const heading = await page.$eval('h1', (el) => el.textContent.trim());
        expect(heading).to.equal('What mobile number can we use to contact you?'); // Verify the heading
        // run pa11y on the page and get results;
        pa11yResults = await pa11y(page.url(), {
          standard: pa11yStandard,
          ignoreUrl: true,
          page: page,
          browser: browser,
          ignore: pa11yIgnoreErrors
        });
        // push results in an array
        resultsArray.push({ url: page.url(), issues: pa11yResults.issues });
      });

      
      it('4.1. should have no accessibility issues on contact details page', () => {
        // Assert that there are no accessibility issues
        expect(pa11yResults.issues).to.be.an('array').that.is.empty; // Assert that issues array is empty
      });

      it('5. should select a mobile option and display an error for missing conditional input', async () => {
        // Step 1: Ensure the radio button is visible
        await page.waitForSelector('#mobile_select-option-2', { visible: true });
      
        // Step 2: Click the radio button to select the mobile option
        await page.click('#mobile_select-option-2');
      
        // Step 3: Click the submit button
        await page.click('button[type="submit"]');
      
        // Step 4: Wait for the error summary to appear
        await page.waitForFunction(
          () => document.querySelector('#errorSummary-title') !== null, // Wait until the error summary is present
          { timeout: 5000 } // Wait up to 5 seconds
        );
      
        // Step 5: Verify the error summary is displayed
        const errorSummary = await page.$eval('#errorSummary-title', (el) => el.textContent.trim());
        expect(errorSummary).to.equal('There is a problem'); // Verify the error message
      
        // Step 6: Verify the specific error message for the missing mobile number
        const mobileError = await page.$eval('#mobileTxt-error', (el) => el.textContent.trim());
        expect(mobileError).to.include('Error:'); // Verify the error prefix
        expect(mobileError).to.include('Enter your mobile phone number'); // Verify the error message content
        // run pa11y on the page and get results;
        pa11yResults = await pa11y(page.url(), {
          standard: pa11yStandard,
          ignoreUrl: true,
          page: page,
          browser: browser,
          ignore: pa11yIgnoreErrors
        });
        // push results in an array
        resultsArray.push({ url: page.url(), issues: pa11yResults.issues });
      });

      
      it('5.1. should have no accessibility issues on contact details page with error', () => {
        // Assert that there are no accessibility issues
        expect(pa11yResults.issues).to.be.an('array').that.is.empty; // Assert that issues array is empty
      });

      it('6. should accept a valid mobile number and navigate to the landline number page', async () => {
        
        this.timeout(60000); // Increase timeout to 60 seconds

        // Step 1: Ensure the option field is visible
        await page.waitForSelector('#mobile_select-option-2', { visible: true });

        // Step 2: Click the radio button to select the mobile option
        await page.click('#mobile_select-option-2');

        // Step 3: Ensure the mobile number input field is visible
        await page.waitForSelector('#mobileTxt', { visible: true });

        // Step 4: Enter a valid mobile number
        await page.type('#mobileTxt', '99123456');

        // Step 5: Click the submit button
        await page.click('button[type="submit"]');

        // Step 6: Wait for the next page to load
        await page.waitForFunction(
            () => document.title === 'Landline number - Test service - gov.cy', // Wait for the title to match
            { timeout: 5000 } // Wait up to 5 seconds
          );

        // Step 7: Verify the page title
        const landlinePageTitle = await page.title();
        expect(landlinePageTitle).to.equal('Landline number - Test service - gov.cy'); // Verify the title

        // Step 8: Verify the label on the landline number page
        const landlineLabel = await page.$eval('#mobile-label', (el) => el.textContent.trim());
        expect(landlineLabel).to.equal('What is your landline number?'); // Verify the label text
        // run pa11y on the page and get results;
        pa11yResults = await pa11y(page.url(), {
          standard: pa11yStandard,
          ignoreUrl: true,
          page: page,
          browser: browser,
          ignore: pa11yIgnoreErrors
        });
        // push results in an array
        resultsArray.push({ url: page.url(), issues: pa11yResults.issues });
      });

      
      it('6.1. should have no accessibility issues on contact landline page', () => {
        // Assert that there are no accessibility issues
        expect(pa11yResults.issues).to.be.an('array').that.is.empty; // Assert that issues array is empty
      });

      it('7. should display an error for an invalid appointment date', async () => {
        this.timeout(60000); // Increase timeout to 60 seconds
      
        // Step 1: Ensure the required input fields are visible
        await page.waitForSelector('#mobile', { visible: true });
        await page.waitForSelector('#dateGot_day', { visible: true });
        await page.waitForSelector('#dateGot_month', { visible: true });
        await page.waitForSelector('#dateGot_year', { visible: true });
        await page.waitForSelector('#appointment', { visible: true });
      
        // Step 2: Fill in the inputs
        await page.type('#mobile', '99123456'); // Enter mobile numberFV
        await page.type('#dateGot_day', '1'); // Enter day
        await page.select('#dateGot_month', '2'); // Select month
        await page.type('#dateGot_year', '2022'); // Enter year
        await page.type('#appointment', '1.1.2020'); // Enter invalid appointment date
      
        // Step 3: Click the submit button
        await page.click('button[type="submit"]');
      
        // Step 4: Wait for the error summary to appear
        await page.waitForFunction(
          () => document.querySelector('#errorSummary-title') !== null, // Wait until the error summary is present
          { timeout: 5000 } // Wait up to 5 seconds
        );
      
        // Step 5: Verify the error summary is displayed
        const errorSummary = await page.$eval('#errorSummary-title', (el) => el.textContent.trim());
        expect(errorSummary).to.equal('There is a problem'); // Verify the error message
      
        // Step 6: Verify the specific error message for the invalid appointment date
        const appointmentError = await page.$eval('#appointment-error', (el) => el.textContent.trim());
        // expect(appointmentError).to.include('Error:'); // Verify the error prefix
        expect(appointmentError).to.include('must be'); // Verify the error message content
        // run pa11y on the page and get results;
        pa11yResults = await pa11y(page.url(), {
          standard: pa11yStandard,
          ignoreUrl: true,
          page: page,
          browser: browser,
          ignore: pa11yIgnoreErrors
        });
        // push results in an array
        resultsArray.push({ url: page.url(), issues: pa11yResults.issues });
      });

      
      it('7.1. should have no accessibility issues on contact landline page with error', () => {
        // Assert that there are no accessibility issues
        expect(pa11yResults.issues).to.be.an('array').that.is.empty; // Assert that issues array is empty
      });

      it('8. should accept a valid appointment date and navigate to the all inputs page', async () => {
        this.timeout(60000); // Increase timeout to 60 seconds
      
        // Step 1: Ensure the required input fields are visible
        await page.waitForSelector('#appointment', { visible: true });
      
        // Step 2: Fill in the inputs
        await page.type('#appointment', '1/1/2020'); // Enter valid appointment date
      
        // Step 3: Click the submit button
        await page.click('button[type="submit"]');
      
        // Step 4: Wait for the next page to load
        await page.waitForFunction(
          () => document.title === 'All inputs - Test service - gov.cy', // Wait for the title to match
          { timeout: 5000 } // Wait up to 5 seconds
        );
      
        // Step 5: Verify the page title
        const allInputsPageTitle = await page.title();
        expect(allInputsPageTitle).to.equal('All inputs - Test service - gov.cy'); // Verify the title
      
        // Step 6: Verify the heading on the all inputs page
        const heading = await page.$eval('#header', (el) => el.textContent.trim());
        expect(heading).to.equal('All inputs'); // Verify the heading

        // Step 7: Verify the presence of the H2 title
        const h2Title = await page.$eval('h2', (el) => el.textContent.trim());
        expect(h2Title).to.equal('This is 1st Title - H2 mobile'); // Verify the H2 title

        // Step 8: Verify the mobile input field
        const txtMobileType = await page.$eval('#txtMobile', (el) => el.getAttribute('type'));
        const txtMobileAutocomplete = await page.$eval('#txtMobile', (el) => el.getAttribute('autocomplete'));
        expect(txtMobileType).to.equal('tel'); // Verify the type attribute
        expect(txtMobileAutocomplete).to.equal('tel'); // Verify the autocomplete attribute

        // Step 9: Verify the name input field
        const txtNameAutocomplete = await page.$eval('#txtName', (el) => el.getAttribute('autocomplete'));
        expect(txtNameAutocomplete).to.equal('name'); // Verify the autocomplete attribute

        // Step 10: Verify the email input field
        const txtEmailType = await page.$eval('#txtEmail', (el) => el.getAttribute('type'));
        const txtEmailAutocomplete = await page.$eval('#txtEmail', (el) => el.getAttribute('autocomplete'));
        expect(txtEmailType).to.equal('email'); // Verify the type attribute
        expect(txtEmailAutocomplete).to.equal('email'); // Verify the autocomplete attribute
        // run pa11y on the page and get results;
        pa11yResults = await pa11y(page.url(), {
          standard: pa11yStandard,
          ignoreUrl: true,
          page: page,
          browser: browser,
          ignore: pa11yIgnoreErrors
        });
        // push results in an array
        resultsArray.push({ url: page.url(), issues: pa11yResults.issues });
      });

      
      it('8.1. should have no accessibility issues on all inputs page', () => {
        // Assert that there are no accessibility issues
        expect(pa11yResults.issues).to.be.an('array').that.is.empty; // Assert that issues array is empty
        console.log('Pa11y results:', JSON.stringify(resultsArray,null,2)); // Log the results for debugging
      });

      it('9.1 should fetch the manifest.json and verify its content', async () => {
        // Step 1: Navigate to the manifest.json URL
        const manifestUrl = `${baseUrl}/manifest.json`;
        await page.goto(manifestUrl, { waitUntil: 'networkidle0' });
        // Step 2: Fetch the manifest JSON directly
        const manifestResponse = await page.evaluate(async (url) => {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return await response.json();
        }, manifestUrl);

        // Step 3: Verify the manifest properties
        expect(manifestResponse).to.have.property('short_name').that.is.a('string');
        expect(manifestResponse).to.have.property('name').that.is.a('string');
        expect(manifestResponse).to.have.property('description').that.is.a('string');
        expect(manifestResponse).to.have.property('icons').that.is.an('array').with.lengthOf(3);
        expect(manifestResponse.icons[0]).to.have.property('src').that.includes('icons-128.png');
        expect(manifestResponse.icons[0]).to.have.property('type', 'image/png');
        expect(manifestResponse.icons[0]).to.have.property('sizes', '128x128');
        expect(manifestResponse).to.have.property('start_url').that.includes('/test/index');
        expect(manifestResponse).to.have.property('scope').that.includes('/test/');
        expect(manifestResponse).to.have.property('background_color', '#31576F');
        expect(manifestResponse).to.have.property('theme_color', '#31576F');
        expect(manifestResponse).to.have.property('display', 'standalone');
        expect(manifestResponse).to.have.property('dir', 'ltr');
      });
      
  });