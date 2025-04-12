# Dev notes

## How to create certs for local development
1. open `Git Bash`and run:

```sh
openssl req -x509 -newkey rsa:2048 -keyout server.key -out server.cert -days 365 -nodes
```

2. Answer the Certificate Questions
You'll be prompted to enter some details. You can fill them out or leave them blank:
```pqsql
Country Name (2 letter code) [XX]: CY
State or Province Name (full name) []: Nicosia
Locality Name (eg, city) []: Nicosia
Organization Name (eg, company) []: govCy
Organizational Unit Name (eg, section) []: DigitalServicesFactory
Common Name (eg, server FQDN or YOUR name) []: localhost
Email Address []: your-email@example.com
```
Common Name (CN): **Make sure** this is localhost for local development.

3. Where to Save the Files?
Save server.cert and server.key in the root of your project folder.

---

## How ro create a .env file

Create a .env file in the root of your project folder (see example below): 

```sh
SESSION_SECRET=f3a8d62dbef1c45a8c3e19a2c873d14c5698a5de12fb7c7bd5d6d3f4b1a6e2d3
PORT=44319
CYLOGIN_ISSUER_URL=https://aztest.cyprus.gov.cy/cylogin/core/.well-known/openid-configuration
CYLOGIN_CLIENT_ID=Oidc.Client.AuthorizationCode
CYLOGIN_CLIENT_SECRET=secret
CYLOGIN_SCOPE=openid cegg_profile dsf.submission
CYLOGIN_REDIRECT_URI=https://localhost:44319/signin-oidc
CYLOGIN_CODE_CHALLENGE_METHOD=S256
CYLOGIN_POST_LOGOUR_REIDRECT_URI=https://localhost:44319/
NODE_ENV=development
DEBUG=true
```

To generate the SESSION_SECRET, run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'));"`

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
    "[siteId]": {                   // Sites level - e.g., "site1"
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
      "submissionErrors": {         // Site-level validation
        "errors": {},
        "errorSummary": []
      },
      "submissionData": {           // Site level successful submission data
        "service": {},
        "referenceNumber": "",
        "timestamp": "",
        "user": {},
        "rawData": {},
        "printFriendlyData": []
      }
    }
  }
}
```

#### 4. User Data
```javascript
"user": {
  "sub": "0000000950496523",          // Subject identifier
  "name": "Citizen6",                 // Display name
  "profile_type": "Individual",       // User type
  "client_ip": "87.228.189.67",       // IP address
  "unique_identifier": "0000808554",  // User ID
  "email": "user@example.com",
  "phone_number": "99412126",
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
       // INPUT DATA
      "inputData": { 
        // SITE: `nsf-2`, PAGE: `bank-details`
        "bank-details": { 
          // FORM DATA submitted
          "formData": { 
            "IBAN": "CY12345678900001225",
            "SWIFT": "12345678",
            "_csrf": "ld524iof94w6vxifrpvny5i4bc1mo76l"
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
              "SWIFT": "",
              "_csrf": "ld524iof94w6vxifrpvny5i4bc1mo76l"
            },
            "errorSummary": []
          }
        },
        // SITE: `nsf-2`, PAGE: `answer-bank-boc`
        "answer-bank-boc": {}
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
      "submissionData": {
        "service": {
          "id": "example-service-id",
          "title": {
            "en": "Example Service",
            "el": "Παράδειγμα υπηρεσίας"
          }
        },
        "referenceNumber": "12345",
        "timestamp": "2023-08-31T12:34:56Z",
        "user": {
          "unique_identifier": "0000123456",
          "name": "User Name",
          "email": "test@example.com",
          
        },
        "rawData": {
          "page1": {
            "formData": {
              "field1": [
                "value1",
                "value2"
              ],
              "field2": "value2",
              "_csrf": "1234567890"
            }
          },
          "page2": {
            "formData": {
              "field3": "value3",
              "field4": "value4",
              "_csrf": "1234567890"
            }
          }
        },
        "printFriendlyData": [
          {
            "pageUrl": "page1",
            "pageTitle": {
              "el": "Σελίδα 1",
              "en": "Page 1",
              "tr": ""
            },
            "fields": [
              {
                "id": "field1",
                "label": {
                  "el": "Ετικέτα για το πεδιο ένα",
                  "en": "Field one label",
                  
                },
                "value": [
                  "value1",
                  "value2"
                ],
                "valueLabel": [
                  {
                    "el": "Ετικέτα για value1",
                    "en": "Label for value1"
                  },
                  {
                    "el": "Ετικέτα για value2",
                    "en": "Label for value2"
                  }
                ]
              },
              {
                "id": "field2",
                "label": {
                  "el": "Ετικέτα για το πεδιο δυο",
                  "en": "Field two label",
                  
                },
                "value": "value2",
                "valueLabel": {
                  "el": "Ετικέτα για value2",
                  "en": "Label for value2"
                }
              }
            ]
          },
          {
            "pageUrl": "page2",
            "pageTitle": {
              "el": "Σελίδα 2",
              "en": "Page 2"
            },
            "fields": [
              {
                "id": "field3",
                "label": {
                  "el": "Ετικέτα για το πεδιο 3",
                  "en": "Field 3 label",
                  
                },
                "value": "value2",
                "valueLabel": {
                  "el": "Ετικέτα για value3",
                  "en": "Label for value3"
                }
              },
              {
                "id": "field4",
                "label": {
                  "el": "Ετικέτα για το πεδιο 4",
                  "en": "Field 4 label",
                  
                },
                "value": "value2",
                "valueLabel": {
                  "el": "Ετικέτα για value4",
                  "en": "Label for value4"
                }
              }
            ]
          }
        ]
      } 
    }
  },
  // USER DATA
  "user": {
    "sub": "0000000950496523",
    "name": "Citizen6",
    "profile_type": "Individual",
    "client_ip": "87.228.189.67",
    "unique_identifier": "0000808554",
    "email": "dsftesting1@gmail.com",
    "phone_number": "99412126",
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
   - Stores submission in session under:
     ```javascript
     siteData[siteId].submissionData = {
       service: {},           // Service metadata
       referenceNumber: "",   // Generated reference
       timestamp: "",         // Submission time
       user: {},             // User details
       rawData: {},          // Raw form data
       printFriendlyData: [] // Formatted for display
     }
     ```
   - Clears the pages data from session. 
   - Redirects to success page

---

## Logging configuration
The application logs in the console with the following levels:

`error`: System errors and crashes
`warn`: Validation failures, auth issues
`info`: Request completion, submissions
`debug`: Form processing, session data

Use the govcyLogger middleware to configure logging levels. For example:

```js
import { logger } from "../utils/govcyLogger.mjs";

logger.debug(`No pageUrl provided for siteId: ${siteId}`, req);
logger.info("404 - Page not found.", err.message, req.originalUrl); // Log the error
```

You can set the `DEBUG` environment variable to `true` to enable debug logging.