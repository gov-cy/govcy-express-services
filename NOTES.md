# Dev notes
This is a development guide for the govcy-express-services project.

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

### .env sample for local development

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
# Debug or not  -------------------------------
DEBUG=true
# DSF Gateway ---------------------------
DSF_API_GTW_CLIENT_ID=your-DSF-API-gateway-client-id
DSF_API_GTW_SECRET=your-DSF-API-gateway-secret
DSF_API_GTW_SERVICE_ID=your-DSF-API-gateway-service-id
# Notification API URL
DSF_API_GTW_NOTIFICATION_API_URL=https://10.61.11.10:5443/DsfApi/api/v1/NotificationEngine/simple-message
# SERVICES stuf-------------------------------
#APIs 
TEST_SUBMISSION_API_URL=http://localhost:3002/success
# Unit TEST USER
TEST_USERNAME=testuser
TEST_PASSWORD=********
```

To generate the SESSION_SECRET, run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'));"`

#### Create certs for local development
Make sure to have certs for local development in the root of your project folder (see [README](./README.md#create-certs-for-local-development))

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
        "submission_username" : "", // User's username
        "submission_email" : "",    // User's email
        "submission_data": {},      // Raw data as submitted by the user in each page
        "submission_data_version": "", // The submission data version
        "print_friendly_data": [],  // Print friendly data
        "renderer_data" :{},        // Renderer data of the summary list
        "renderer_version": "",     // The renderer version
        "design_systems_version": "", // The design systems version
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

Sample of submission data:

```json
{
  "submission_username": "username",        // User's username
  "submission_email": "email@example.com",  // User's email
  "submission_data_version": "0.1",         // Submission data version
  "submission_data": {                      // Submission raw data
    "index": {                              // Page level
      "formData": {
        "id_select": ["id", "arc"],         // field level. Could be string or array
        "id_number": "654654",
        "arc_number": "",
        "aka": "232323",
        "_csrf": "o6s80zgvowsmzm3q1djl03etarbd1pnd"
      }
    },
    "appointment": {
      "formData": {
        "diorismos": "monimos",
        "fileno_monimos": "3233",
        "eidikotita_monimos": "1",
        "fileno_sumvasiouxos": "",
        "eidikotita_sumvasiouxos": "",
        "fileno_aoristou": "",
        "eidikotita_aoristou": "",
        "program": "",
        "fileno_orismenou": "",
        "_csrf": "o6s80zgvowsmzm3q1djl03etarbd1pnd"
      }
    },
    "takeover": {
      "formData": {
        "date_start_day": "11",
        "date_start_month": "12",
        "date_start_year": "2020",
        "date_on_contract": "date_other",
        "date_contract": "16/04/2025",
        "reason": "24324dssf",
        "_csrf": "o6s80zgvowsmzm3q1djl03etarbd1pnd"
      }
    }
  },
  "submission_data_version": "1",           // Submission data version
  "renderer_data": {                        // Summary list renderer data ready for rendering
    "element": "summaryList",
    "params": {
      "items": [
        {
          "key": {
            "el": "Στοιχεία του  εκπαιδευτικού",
            "en": "Educator's details",
            "tr": ""
          },
          "value": [
            {
              "element": "summaryList",
              "params": {
                "items": [
                  {
                    "key": {
                      "el": "Ταυτοποίηση",
                      "en": "Identification"
                    },
                    "value": [
                      {
                        "element": "textElement",
                        "params": {
                          "text": {
                            "en": "Ταυτότητα, ARC",
                            "el": "Ταυτότητα, ARC",
                            "tr": "Ταυτότητα, ARC"
                          },
                          "type": "span"
                        }
                      }
                    ]
                  },
                  {
                    "key": {
                      "el": "Εισαγάγετε αριθμό ταυτότητας",
                      "en": "Enter ID number"
                    },
                    "value": [
                      {
                        "element": "textElement",
                        "params": {
                          "text": {
                            "en": "121212",
                            "el": "121212",
                            "tr": "121212"
                          },
                          "type": "span"
                        }
                      }
                    ]
                  },
                  {
                    "key": {
                      "el": "Αριθμός κοινωνικών ασφαλίσεων",
                      "en": "Social Insurance Number"
                    },
                    "value": [
                      {
                        "element": "textElement",
                        "params": {
                          "text": {
                            "en": "112121",
                            "el": "112121",
                            "tr": "112121"
                          },
                          "type": "span"
                        }
                      }
                    ]
                  }
                ]
              }
            }
          ]
        },
        {
          "key": {
            "el": "Διορισμός εκπαιδευτικού",
            "en": "Teachers appointment",
            "tr": ""
          },
          "value": [
            {
              "element": "summaryList",
              "params": {
                "items": [
                  {
                    "key": {
                      "el": "Τι διορισμό έχει ο εκπαιδευτικός;",
                      "en": "What type of appointment does the teacher have?"
                    },
                    "value": [
                      {
                        "element": "textElement",
                        "params": {
                          "text": {
                            "en": "Συμβασιούχος",
                            "el": "Συμβασιούχος",
                            "tr": "Συμβασιούχος"
                          },
                          "type": "span"
                        }
                      }
                    ]
                  },
                  {
                    "key": {
                      "el": "Αριθμός φακέλου (ΠΜΠ)",
                      "en": "File Number"
                    },
                    "value": [
                      {
                        "element": "textElement",
                        "params": {
                          "text": {
                            "en": "1212",
                            "el": "1212",
                            "tr": "1212"
                          },
                          "type": "span"
                        }
                      }
                    ]
                  },
                  {
                    "key": {
                      "el": "Ειδικότητα",
                      "en": "Specialty"
                    },
                    "value": [
                      {
                        "element": "textElement",
                        "params": {
                          "text": {
                            "en": "Καθηγητής",
                            "el": "Καθηγητής",
                            "tr": "Καθηγητής"
                          },
                          "type": "span"
                        }
                      }
                    ]
                  }
                ]
              }
            }
          ]
        },
        {
          "key": {
            "el": "Ημερομηνία ανάληψης",
            "en": "Takeover date",
            "tr": ""
          },
          "value": [
            {
              "element": "summaryList",
              "params": {
                "items": [
                  {
                    "key": {
                      "el": "Ημερομηνία ανάληψης",
                      "en": "Start Date"
                    },
                    "value": [
                      {
                        "element": "textElement",
                        "params": {
                          "text": {
                            "en": "16/04/2025",
                            "el": "16/04/2025",
                            "tr": "16/04/2025"
                          },
                          "type": "span"
                        }
                      }
                    ]
                  },
                  {
                    "key": {
                      "el": "Η ημερομηνία αυτή είναι η ίδια με αυτή του συμβολαίου;",
                      "en": "Is this date the same as the contract date?"
                    },
                    "value": [
                      {
                        "element": "textElement",
                        "params": {
                          "text": {
                            "en": "Ναι, είναι η ίδια με αυτή του συμβολαίου",
                            "el": "Ναι, είναι η ίδια με αυτή του συμβολαίου",
                            "tr": "Ναι, είναι η ίδια με αυτή του συμβολαίου"
                          },
                          "type": "span"
                        }
                      }
                    ]
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  },
  "print_friendly_data": [                  // Print friendly data
    {
      "pageUrl": "index",                     // Page URL
      "pageTitle": {                          // Page title
        "el": "Στοιχεία του  εκπαιδευτικού",
        "en": "Educator's details",
        "tr": ""
      },
      "fields": [                             // Fields
        {
          "id": "id_select",                    // Field ID
          "label": {                            // Field label
            "el": "Ταυτοποίηση",
            "en": "Identification"
          },
          "value": ["id", "arc"],          // Field value. Could be string or array
          "valueLabel": [                       // Field value label. Could be string or array
            {
              "el": "Ταυτότητα",
              "en": "ID",
              "tr": ""
            },
            {
              "el": "ARC",
              "en": "ARC",
              "tr": ""
            }
          ]
        },
        {
          "id": "id_number",
          "label": {
            "el": "Εισαγάγετε αριθμό ταυτότητας",
            "en": "Enter ID number"
          },
          "value": "654654",
          "valueLabel": {
            "el": "654654",
            "en": "654654"
          }
        },
        {
          "id": "aka",
          "label": {
            "el": "Αριθμός κοινωνικών ασφαλίσεων",
            "en": "Social Insurance Number"
          },
          "value": "232323",
          "valueLabel": {
            "el": "232323",
            "en": "232323"
          }
        }
      ]
    },
    {
      "pageUrl": "appointment",
      "pageTitle": {
        "el": "Διορισμός εκπαιδευτικού",
        "en": "Teachers appointment",
        "tr": ""
      },
      "fields": [
        {
          "id": "diorismos",
          "label": {
            "el": "Τι διορισμό έχει ο εκπαιδευτικός;",
            "en": "What type of appointment does the teacher have?"
          },
          "value": "monimos",
          "valueLabel": {
            "el": "Μόνιμος επί δοκιμασία",
            "en": "Permanent on probation",
            "tr": ""
          }
        },
        {
          "id": "fileno_monimos",
          "label": {
            "el": "Αριθμός φακέλου (ΠΜΠ)",
            "en": "File Number"
          },
          "value": "3233",
          "valueLabel": {
            "el": "3233",
            "en": "3233"
          }
        },
        {
          "id": "eidikotita_monimos",
          "label": {
            "el": "Ειδικότητα",
            "en": "Specialty"
          },
          "value": "1",
          "valueLabel": {
            "el": "Δάσκαλος",
            "en": "Elementary teacher",
            "tr": ""
          }
        }
      ]
    },
    {
      "pageUrl": "takeover",
      "pageTitle": {
        "el": "Ημερομηνία ανάληψης",
        "en": "Takeover date",
        "tr": ""
      },
      "fields": [
        {
          "id": "date_start",
          "label": {
            "el": "Ημερομηνία ανάληψης",
            "en": "Start Date"
          },
          "value": "2020-12-11",
          "valueLabel": {
            "el": "11/12/2020",
            "en": "11/12/2020"
          }
        },
        {
          "id": "date_on_contract",
          "label": {
            "el": "Η ημερομηνία αυτή είναι η ίδια με αυτή του συμβολαίου;",
            "en": "Is this date the same as the contract date?"
          },
          "value": "date_other",
          "valueLabel": {
            "el": "Όχι, αυτή είναι διαφορετική",
            "en": "No, this is different",
            "tr": ""
          }
        },
        {
          "id": "date_contract",
          "label": {
            "el": "Ημερομηνία συμβολαίου",
            "en": "Contract Date"
          },
          "value": "16/04/2025",
          "valueLabel": {
            "el": "16/04/2025",
            "en": "16/04/2025"
          }
        },
        {
          "id": "reason",
          "label": {
            "el": "Αιτιολόγηση καθυστέρησης στην ανάληψη καθηκόντων",
            "en": "Reason for delay in assuming duties"
          },
          "value": "24324dssf",
          "valueLabel": {
            "el": "24324dssf",
            "en": "24324dssf"
          }
        }
      ]
    }
  ],
  "renderer_version": "1.14.1",              // Renderer version
  "design_systems_version": "3.1.0",          // Design systems version
  "service": {                                // Service metadata
    "id": "takeover",
    "title": {
      "el": "Βεβαίωση ανάληψης καθηκόντων εκπαιδευτικών",
      "en": "Certificate of teachers takeover"
    }
  },
  "referenceNumber": "12345",                 // Reference number
  "timestamp": "2023-04-20T14:30:00.000Z"     // Submission time
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
      "submissionData": { } //see sample above
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