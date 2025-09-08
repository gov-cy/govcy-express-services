# Dev notes
This is a development guide for the govcy-express-services project.

## Breaking changes
### As of v.1.x.x
- the `submission` data send via the API:
  - Changed to use camelCase instead of snake_case, to be aligned with the DSF submission platform. Here is how the data looks like:
```json
{
  "submissionUsername" : "",   // User's username
  "submissionEmail" : "",      // User's email
  "submissionData": "{}",      // Raw data as submitted by the user in each page
  "submissionDataVersion": "",// The submission data version
  "printFriendlyData": "[]",  // Print friendly data
  "rendererData" :"{}",        // Renderer data of the summary list
  "rendererVersion": "",       // The renderer version
  "designSystemsVersion": "", // The design systems version
  "service": "{}"               // Service info
}
```
  - `submissionData` no longer has the `formData` part of the `pageUrl.formData.elementName`. It directly uses `pageUrl.elementName` for example:
```json
{
  "index": {
    "certificate_select": [
      "birth",
      "permanent_residence"
    ]
  },
  "data-entry-radios": {
    "mobile_select": "mobile",
    "mobileTxt": ""
  },
  "data-entry-textinput": {
    "mobile": "+35722404383",
    "dateGot": "1212-01-12",
    "appointment": "03/09/2025"
  },
  "data-entry-all": {
    "txtMobile": "",
    "txtName": "",
    "txtEmail": "",
    "txtNumeric": "",
    "dateInput": "",
    "datePicker": "",
    "checkboxes": [],
    "radios": "",
    "textArea": "",
    "textArea1": "",
    "textArea2": "",
    "select1": "",
    "file1Attachment": {
      "sha256": "mock-sha256-hash",
      "fileId": "mock-file-id"
    }
  },
  "radios-conditions": {
    "id_select": "",
    "id_number": "",
    "id_country": "",
    "arc_number": "",
    "passport_number": "",
    "passport_country": ""
  }
}
```
- `checkboxes` values are normalized to **arrays** (including `[]` when no options are selected).

## Release management

Details on release management can be found in the [release document](./RELEASE.md).

## Local development

### Installation
1. Clone the repository:

   ```sh
   git clone git@github.com:gov-cy/govcy-express-services.git
   ```
2. Navigate to the project directory:

   ```sh
   cd govcy-express-services
   ```
3. Install dependencies:

   ```sh
   npm install
   ```

### `secrets/.env` sample for local development

Create a `secrets/.env` file  (see example below): 

```dotenv
SESSION_SECRET=12345678901234567890123456789012345678901234567890
PORT=44319
CYLOGIN_ISSUER_URL=https://aztest.cyprus.gov.cy/cylogin/core/.well-known/openid-configuration
CYLOGIN_CLIENT_ID=your-CYLOGIN-client-id
CYLOGIN_CLIENT_SECRET=your-CYLOGIN-client-secret
CYLOGIN_SCOPE=openid cegg_profile your.scope
CYLOGIN_REDIRECT_URI=https://localhost:44319/signin-oidc
CYLOGIN_CODE_CHALLENGE_METHOD=S256
CYLOGIN_POST_LOGOUR_REIDRECT_URI=https://localhost:44319/
ALLOW_SELF_SIGNED_CERTIFICATES=false
NODE_ENV=development
# Debug or not  -------------------------------
# In production set this to false
DEBUG=true
# DSF Gateway ---------------------------
DSF_API_GTW_CLIENT_ID=your-DSF-API-gateway-client-id
DSF_API_GTW_SECRET=your-DSF-API-gateway-secret
DSF_API_GTW_SERVICE_ID=your-DSF-API-gateway-service-id
# Notification API URL
DSF_API_GTW_NOTIFICATION_API_URL=https://127.0.0.1/api/v1/NotificationEngine/simple-message
# SERVICES stuf-------------------------------
# SERVICE: test
TEST_SUBMISSION_API_URL=http://localhost:3002/success
TEST_SUBMISSION_API_CLIENT_KEY=12345678901234567890123456789000
TEST_SUBMISSION_API_SERVIVE_ID=123
TEST_SUBMISSION_DSF_GTW_KEY=12345678901234567890123456789000
TEST_ELIGIBILITY_1_API_URL=http://localhost:3002/success
TEST_ELIGIBILITY_2_API_URL=http://localhost:3002/success
# Unit TEST USER
TEST_USERNAME=testuser
TEST_PASSWORD=********
```

To generate the SESSION_SECRET, run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'));"`

#### Create certs for local development
Make sure to have certs for local development in the root of your project folder (see [install notes](./INSTALL-NOTES.md#create-certs-for-local-development))

### non secret environment variables
Create `.env.development`, `.env.staging`, and `.env.production` files in the root folder of the project. Here's an example for `.env.development`:

```dotenv
MATOMO_SITE_ID=51
MATOMO_URL=//wp.matomo.dits.dmrid.gov.cy
```

---

## Data layer

The application uses Express session to store data. Here's a an  overview of the session structure:

### Data Overview

This is an overview of the data stored in the session:

```javascript
{
  cookie: { ... },        // Session cookie configuration
  csrfToken: "string",   // CSRF protection token
  siteData: { ... },     // Service-specific data
  user: { ... }          // Authenticated user information
}
```

### Detailed Breakdown

#### 1. Cookie Configuration
```javascript
"cookie": {
  "originalMaxAge": 3600000,         // 1 hour expiry
  "expires": "2025-04-03T06:35:22.026Z",
  "secure": true,                    // HTTPS only
  "httpOnly": true,                  // No JS access
  "path": "/",
  "sameSite": "lax"                 // CSRF protection
}
```

#### 2. CSRF Token
```javascript
"csrfToken": "ld524iof94w6vxifrpvny5i4bc1mo76l"  // Session-wide CSRF token
```

#### 3. Site Data
```javascript
{
  "siteData": {
    "[siteId]": { 
      "loadData": {},              // Data used to load the site when presaved
      "inputData": {                // Input data of the site
        "[pageUrl]": {              // Pages level - e.g., "page1"
          "formData": {},           // Form data per page
          "validationErrors": {     // Page-level validation
            "errors": {},
            "formData": {},
            "errorSummary": []
          }
        }
      },
      "eligibility": {            // Site eligibility cached results
        "TEST_ELIGIBILITY_1_API_URL": { // Eligibility 1
          "result": {                   // results
            "Succeeded": true,
            "ErrorCode": 0,
            "ErrorMessage": null,
            "Data": {}
          },
          "timestamp": 1749755264663  // timestamp
        },
        "TEST_ELIGIBILITY_2_API_URL": {
          "result": {
            "Succeeded": true,
            "ErrorCode": 0,
            "ErrorMessage": null,
            "Data": {},
          },
          "timestamp": 1749755362834
        }
      }
      "submissionErrors": {         // Site-level validation
        "errors": {},
        "errorSummary": []
      },
      "submissionData": {           // Site level successful submission data
        "submissionUsername" : "", // User's username
        "submissionEmail" : "",    // User's email
        "submissionData": {},      // Raw data as submitted by the user in each page
        "submissionDataVersion": "", // The submission data version
        "printFriendlyData": [],  // Print friendly data
        "rendererData" :{},        // Renderer data of the summary list
        "rendererVersion": "",     // The renderer version
        "designSystemsVersion": "", // The design systems version
        "service": {                // Service info
              "id": "",             // Service id
              "title": {}           // Service title multilingual object
          },
        "referenceNumber": "",      // Reference number
      }
    }
  }
}
```

For a sample of submission data see at [README's sample submission data](README.md#submission-data)

#### 4. User Data
```javascript
"user": {
  "sub": "0000000950496523",          // Subject identifier
  "name": "User1",                    // Display name
  "profile_type": "Individual",       // User type
  "client_ip": "127.0.0.1",           // IP address
  "unique_identifier": "0000XXXXXX",  // User ID
  "email": "user@example.com",
  "phone_number": "99XXXXXX",
  "id_token": "xxxxxx",               // CY Login tokens
  "access_token": "xxxxxx",
  "refresh_token": null
}
```

### Notes
- Each section serves a specific purpose:
  - `Cookie`: Manages session lifetime and security
  - `CSRF Token`: Protects against cross-site request forgery. Protects against cross-site attacks. Valid for the whole session.
  - `Site Data`: Stores form data, validation, and submissions
  - `User Data`: Stores authenticated user information from CY Login

- Data is managed through the data layer abstraction (`govcyDataLayer.mjs` more on that below) , which provides methods to:
  - Initialize data structures
  - Store and retrieve form data
  - Handle validation errors
  - Manage submission data

### Session Example

The application uses a data layer abstraction to manage all session data:

For example:

```json
{
  "cookie": { // cookie data
    "originalMaxAge": 3600000,
    "expires": "2025-04-03T06:35:22.026Z",
    "secure": true,
    "httpOnly": true,
    "path": "/",
    "sameSite": "lax"
  },
  "csrfToken": "ld524iof94w6vxifrpvny5i4bc1mo76l", // csrf token
  // site data
  "siteData": { 
    // SITE: `nsf-2`
    "nsf-2": {  
      "loadData": { // Data used to load the site when presaved
        "submissionId": "f97c091b-caa6-4e69-a515-f57043a704b0",
        "serviceId": "f11077f3-72c7-4eec-ab01-f07d9efed08d",
        "referenceValue": "0000000924107836",
        "submissionTs": "2025-08-07T17:05:26+03:00",
        "status": 0,
        "statusTs": "2025-08-07T17:05:34+03:00",
        "userId": "0000000924107836",
        "userType": 1,
        "userName": "",
        "userIdentifier": "0001013317",
        "userEmail": "",
        "submissionData": "{\"index\":{\"formData\":{\"certificate_select\":[\"birth\",\"permanent_residence\"]}}}",
        "dataStatus": 0
      },
       // INPUT DATA
      "inputData": { 
        // SITE: `nsf-2`, PAGE: `bank-details`
        "bank-details": { 
          // FORM DATA submitted
          "formData": { 
            "IBAN": "CY12345678900001225",
            "SWIFT": "12345678"
          },
          // PAGE validation errors
          "validationErrors": {
            // validation errors with messages
            "errors": {
                // Error on-> site: `nsf-2`, page: `bank-details`, element: `IBAN`
              "IBAN": {
                "id": "IBAN",
                "message": {
                  "en": "Enter the IBAN",
                  "el": "Εισαγάγετε το IBAN"
                },
                "pageUrl": ""
              },
              // Error on-> site: `nsf-2`, page: `bank-details`, element: `SWIFT`
              "SWIFT": {
                "id": "SWIFT",
                "message": {
                  "en": "Enter the SWIFT",
                  "el": "Εισαγάγετε το SWIFT"
                },
                "pageUrl": ""
              }
            },
            // Data submitted that produced the error on site: `nsf-2`, page: `bank-details`
            "formData": {
              "IBAN": "",
              "SWIFT": ""
            },
            "errorSummary": []
          }
        },
        // SITE: `nsf-2`, PAGE: `answer-bank-boc`
        "answer-bank-boc": {}
      },
      // ELIGIBILITY
      "eligibility": {            // Site eligibility cached results
        "TEST_ELIGIBILITY_1_API_URL": { // Eligibility 1
          "result": {                   // results
            "Succeeded": true,
            "ErrorCode": 0,
            "ErrorMessage": null,
            "Data": {}
          },
          "timestamp": 1749755264663  // timestamp
        },
        "TEST_ELIGIBILITY_2_API_URL": {
          "result": {
            "Succeeded": true,
            "ErrorCode": 0,
            "ErrorMessage": null,
            "Data": {},
          },
          "timestamp": 1749755362834
        }
      }
    },
    // SITE: `dsf-plugin-v3`
    "dsf-plugin-v3": {
      // INPUT DATA
      "inputData": {
        "data-entry-checkboxes": {
          "formData": {
            "certificate_select": "permanent_residence",
            "_csrf": "ld524iof94w6vxifrpvny5i4bc1mo76l"
          }
        },
        "data-entry-radios": {}
      },
      // SITE LEVEL SUBMISSION ERRORS
      "submissionErrors": {
        "errors": {
          "data-entry-radiosmobile_select": {
            "id": "mobile_select",
            "message": {
              "el": "Επιλέξετε αν θέλετε να χρησιμοποιήσετε το τηλέφωνο που φαίνεται εδώ, ή κάποιο άλλο",
              "en": "Choose if you'd like to use the phone number shown here, or a different one",
              "tr": ""
            },
            "pageUrl": "data-entry-radios"
          },
          "data-entry-selectorigin": {
            "id": "origin",
            "message": {
              "el": "Επιλέξετε χώρα καταγωγής",
              "en": "Select country of origin",
              "tr": ""
            },
            "pageUrl": "data-entry-select"
          },
          "data-entry-textinputmobile": {
            "id": "mobile",
            "message": {
              "el": "Εισαγάγετε τον αριθμό του κινητού σας",
              "en": "Enter your mobile phone number",
              "tr": ""
            },
            "pageUrl": "data-entry-textinput"
          }
        },
        "errorSummary": []
      }
    },
    "site3": {
      // INPUT DATA
      "inputData": {},
      // SITE LEVEL SUBMISSION ERRORS
      "submissionErrors": {},
      "submissionData": { } //see sample above
    }
  },
  // USER DATA
  "user": {
    "sub": "0000000950496523",
    "name": "User1",
    "profile_type": "Individual",
    "client_ip": "127.0.0.1",
    "unique_identifier": "0000XXXXXX",
    "email": "user@example.com",
    "phone_number": "99XXXXXX",
    "id_token": "xxxxxx",
    "access_token": "xxxxxx",
    "refresh_token": null
  }
}

```

### govcyDataLayer

The [govcyDataLayer.mjs](./src/utils/govcyDataLayer.mjs) file provides a centralized abstraction for managing session data. It abstracts session handling, ensuring a structured and reusable approach for storing and retrieving data.

#### Purpose
- Centralizes session data management.
- Simplifies handling of form data, validation errors, and submissions.
- Ensures session structure is initialized and maintained.

#### Example Usage
1. Storing Form Data
```js
import * as dataLayer from "../utils/govcyDataLayer.mjs";

dataLayer.storePageData(req.session, "site1", "page1", {
  field1: "value1",
  field2: "value2"
});
```

2. Retrieving Validation Errors
```js
import * as dataLayer from "../utils/govcyDataLayer.mjs";

const validationErrors = dataLayer.getPageValidationErrors(req.session, "site1", "page1");

```

More examples in the [govcyDataLayer.mjs](./src/utils/govcyDataLayer.mjs) file.


---

## Important flows

### 📝📥❌✅ Page post, validation checks and page view flow
1. Form submission -> `govcyFormsPostHandler`
2. Check field validations
  - If **validation passes**:
     - Form data stored in session under `siteData[siteId].inputData[pageUrl].formData`
     - User redirected to next page
  -  If **validation fails**:
    - Errors stored in session under `siteData[siteId].inputData[pageUrl].validationErrors`
    - Form data preserved for repopulation
    - User redirected back to form with `#errorSummary-title` in URL
3. On page load -> `govcyPageHandler`:
   - Checks for validation errors
   - if **validation errors exist**
    - Populates form with data from validation errors
    - Displays error messages
    - Displays error summary
    - Clears errors after display
  - if **no validation errors exist**
    - Populates form if prepopulated data exists
  - Displays form

### 👀 Review page generation
1. User reaches review page
2. System:
   - Collects all form data from session
   - Formats data for display
   - Generates summary sections
   - Adds change links to each section

### 👀📥 Review page post flow
1. User submits review page -> `govcyReviewPostHandler`
2. System validates all pages:
   - Loops through each page in service
   - Gets stored form data from session
   - Validates each form element
   - Collects validation errors per page
3. If **validation errors exist**:
   - Stores errors in `siteData[siteId].submissionErrors`
   - Redirects back to review page with error summary
   - Displays error messages with links to relevant pages
4. If **validation passes**:
   - Prepares submission data
   - Generates reference number
   - Creates print-friendly data format
   - Stores submission in session under ` siteData[siteId].submissionData`
   - Clears the pages data from session. 
   - Redirects to success page

---

## Logging configuration
The application logs in the console with the following levels:

`error`: System errors and crashes
`warn`: Validation failures, auth issues
`info`: Request completion, submissions
`debug`: Form processing, session data

Use the govcyLogger utility to configure logging levels. For example:

```js
import { logger } from "../utils/govcyLogger.mjs";

logger.debug(`No pageUrl provided for siteId: ${siteId}`, req);
logger.info("404 - Page not found.", err.message, req.originalUrl); // Log the error
```

You can set the `DEBUG` environment variable to `true` to enable debug logging.

----

## API Integration

The project integrates with external APIs for form submissions. The `govcyApiRequest` utility handles API communication with retry logic.

### Example Usage
```javascript
import { govcyApiRequest } from "../utils/govcyApiRequest.mjs";

const response = await govcyApiRequest("post", "https://api.example.com/submit", submissionData);
```

----

## Testing

To run tests, use the `npm test` command. This will run all the tests. To run all the tests both the mockAPI and the server need to be started. You can run individual tests with:
- `npm run test:unit`: Runs unit tests
- `npm run test:integration`: Runs integration tests. Needs mockAPI to be started.
- `npm run test:package`: Runs package tests and checks the intallability.
- `npm run test:functional`: Runs functional tests with puppeteer. Needs the server to be started.

To add new tests, create a new test file in the `test` directory, using the naming convention `testName.test.mjs`. See examples in the [tests](./test) directory.

### Mock API Server
A mock API server is included for testing API integrations. It listens on port `3002` and simulates various API responses based on the request URL. 

To start the mock server:
```sh
npm run start:mock
```

Example endpoints:

- `/success`: Simulates a successful submission.
- `/error102`: Simulates an error response with code 102.
- `/error103`: Simulates an error response with code 103.
- `/invalid-key`: Simulates a bad request.