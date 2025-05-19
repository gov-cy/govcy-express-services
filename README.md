# govcy Express Services

## Description
This project is an Express-based project that dynamically renders online service forms using `@gov-cy/govcy-frontend-renderer`. It is designed for developers building government services in Cyprus, enabling them to manage user authentication, form submissions, and OpenID authentication workflows in a timely manner.

![govcy-express-services](express-services.png)

## Features
- Dynamic form rendering from JSON templates
    - Support for `textInput`, `textArea`, `select`, `radios`, `checkboxes`, `datePicker`, `dateInput`
    - Support for `conditional radios`
- Dynamic creation of check your answers page
- OpenID Connect authentication with CY Login
- Middleware-based architecture for better maintainability
- Supports routing for dynamic pages
- Input validation
- CSRF protection
- cyLogin Single Sign-On (SSO)
- Pre-filling posted values (in the same session)
- ~~- API integration with retry logic for form submissions.~~
- ~~PDF generation and email support~~

## Prerequisites
- Node.js 20+
- npm 
- A CY Login client ID and secret


## Installation
The project acts as an npm package and you need to install it as a dependency in your npm project. Here's a step-by-step guide:

### 1. Initialization

Initialize your npm project:

```sh
npm init -y
```

### 2. Install the Package

Install the express services package:

```sh
npm install ../govcy-express-services
```

### 3. Prepare for local development
Add .env file and create certs for local development.

#### Create certs for local development
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

#### Create a .env file for local development

Create a .env file in the root of your project folder.

```sh
SESSION_SECRET=session_secret
PORT=44319
CYLOGIN_ISSUER_URL=your-issuer-url
CYLOGIN_CLIENT_ID=your-client-id
CYLOGIN_CLIENT_SECRET=your-client-secret
CYLOGIN_SCOPE=openid cegg_profile dsf.submission
CYLOGIN_REDIRECT_URI=https://localhost:44319/signin-oidc
CYLOGIN_CODE_CHALLENGE_METHOD=S256
CYLOGIN_POST_LOGOUR_REIDRECT_URI=https://localhost:44319/
NODE_ENV=development
DEBUG=true
#APIs
TEST_SUBMISSION_API_URL=http://localhost:3002/success
```

Set the environment in the `NODE_ENV` variable: 
- **development**: For local development and testing.
- **staging**: For staging environments.
- **production**: For production deployments.

Details about cyLogin can be found at the [CY Login documentation](https://dev.azure.com/cyprus-gov-cds/Documentation/_wiki/wikis/Documentation/14/CY-Login)

To generate the SESSION_SECRET, run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'));"`

### 4. Create data files for services

Create data files in the `/data` folder (see more in [Dynamic Services Rendering](#dynamic-services-rendering))

### 5. Use the package in your project

Create an `index.mjs` file in your project to import and use the package as follows:

```js
import initializeGovCyExpressService from '@gov-cy/govcy-express-services';

// Initialize the service
const service = initializeGovCyExpressService();

// Start the server
service.startServer();
```

### 6. Enable debugging with VS Code

To enable debugging with VS Code, add a file `.vscode/launch.json` to your project root as follows:

```json
{
    // Use IntelliSense to learn about possible attributes.
    // Hover to view descriptions of existing attributes.
    // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
    
        {
            "type": "node",
            "request": "launch",
            "name": "Launch Program",
            "skipFiles": [
                "<node_internals>/**"
            ],
            "program": "${workspaceFolder}/index.mjs",
            "env": {
                "NODE_ENV": "development"
            }
        }
    ]
}

```

## Usage
### Starting the Server
Add in your `package.json`:

```json
"scripts": {
    "start": "node index.mjs"
}
```

Then run the server using `npm start`.

```sh
npm start
```
The server will start on `https://localhost:44319` (see [NOTES.md](NOTES.md#local-development) for more details on this).

### Authentication Middleware
Authentication is handled via OpenID Connect using CY Login and is configured using environment variables. The middleware ensures users have valid sessions before accessing protected routes. 

### Dynamic Services Rendering
Services are rendered dynamically using JSON templates stored in the `/data` folder. Service routes load `data/:siteId.json` to get the form data. Example structure:
```json
{
  "site": {
    "id": "nsf-2",
    "lang": "el",
    "languages": [
      {
        "code": "el",
        "label": "EL",
        "alt": "Ελληνική γλώσσα",
        "href": "?lang=el"
      },
      {
        "code": "en",
        "label": "EN",
        "alt": "English language",
        "href": "?lang=en"
      }
    ],
    "footerLinks": [
      {
        "label": {
          "en": "Privacy statement",
          "el": "Δήλωση απορρήτου"
        },
        "href": "#"
      },
      {
        "label": {
          "en": "Cookies",
          "el": "Cookies"
        },
        "href": "#"
      },
      {
        "label": {
          "en": "Accessibility",
          "el": "Προσβασιμότητα"
        },
        "href": "#"
      },
      {
        "label": {
          "en": "Help us improve this service",
          "el": "Βοηθήστε μας να βελτιώσουμε αυτή την υπηρεσία"
        },
        "href": "#"
      }
    ],
    "title": {
      "el": "Αποτελέσματα αιτησης σχεδίου αναπλήρωσης",
      "en": "Replenishment scheme application results",
      "tr": ""
    },
    "headerTitle": {
      "el": "Αποτελέσματα αιτησης σχεδίου αναπλήρωσης",
      "en": "Replenishment scheme application results",
      "tr": ""
    },
    "description": {
      "el": "[Υποβάλετε αίτηση για ...]",
      "en": "[Submit an application ...]",
      "tr": ""
    },
    "url": "https://gov.cy",
    "isTesting": true,
    "cdn": {
      "dist": "https://cdn.jsdelivr.net/gh/gov-cy/govcy-design-system@3.1.0/dist",
      "cssIntegrity": "sha384-Py9pPShU3OUzcQ3dAfZLkJI0Fgyv9fWKmAdK8f7dS9caBKuKs5z/ZpyERuh0ujm0",
      "jsIntegrity": "sha384-g1c/YT97MWPoo9pbyFgQcxvB2MYLdsOgI2+ldxkEXAbhTzKfyYXCEjk9EVkOP5hp"
    },
    "submission_data_version" : "1",
    "renderer_version" : "1.14.1",
    "design_systems_version" : "3.1.1",
    "submissionAPIEndpoint": {
      "url": "TEST_SUBMISSION_API_URL",
      "response": {
        "errorResponse": {
          "102": {
            "error": "user not administrator",
            "page": "/test/user-not-admin"
          },
          "103": {
            "error": "user not registration",
            "page": "/test/user-not-registered"
          }
        }
      }
    }
  },
  "pages": [
    {
      "pageData": {
        "url": "bank-details",
        "title": {
          "el": "Εισαγάγετε τα τραπεζικά σας δεδομένα",
          "en": "Enter your bank details",
          "tr": ""
        },
        "layout": "layouts/govcyBase.njk",
        "mainLayout": "two-third",
        "nextPage": "answer-bank-boc"
      },
      "pageTemplate": {
        "sections": [
          {
            "name": "beforeMain",
            "elements": [
              {
                "element": "backLink",
                "params": {}
              }
            ]
          },
          {
            "name": "main",
            "elements": [
              {
                "element": "form",
                "params": {
                  "elements": [
                    {
                      "element": "progressList",
                      "params": {
                        "current": 1,
                        "total": 3,
                        "showSteps": true,
                        "steps": [
                          {
                            "text": {
                              "en": "Bank details",
                              "el": "Τραπεζικά σας δεδομένα"
                            }
                          },
                          {
                            "text": {
                              "en": "Findings",
                              "el": "Ευρήματα"
                            }
                          },
                          {
                            "text": {
                              "en": "Bank settlement",
                              "el": "Τραπεζικά settlement"
                            }
                          }
                        ]
                      }
                    },
                    {
                      "element": "textElement",
                      "params": {
                        "id": "Title",
                        "type": "h1",
                        "text": {
                          "el": "Εισαγάγετε τα τραπεζικά σας δεδομένα",
                          "en": "Enter your bank details"
                        }
                      }
                    },
                    {
                      "element": "htmlElement",
                      "params": {
                        "id": "Explanation",
                        "text": {
                          "el": "<p>Η κυβέρνηση θα χρησιμοποιήσεις αυτές τις πληροφορίες για να προχωρήσει σε πληρωμή του ποσού αναπλήρωσης σας.</p>",
                          "en": "<p>The government will use this information to pay you a replenishment amount once it is decided.</p>"
                        }
                      }
                    },
                    {
                      "element": "textInput",
                      "params": {
                        "id": "AccountName",
                        "name": "AccountName",
                        "label": {
                          "el": "Όνομα λογαριασμού",
                          "en": "Account name"
                        },
                        "isPageHeading": false,
                        "type": "text"
                      }
                    },
                    {
                      "element": "textInput",
                      "params": {
                        "id": "Iban",
                        "name": "Iban",
                        "label": {
                          "el": "IBAN",
                          "en": "IBAN"
                        },
                        "isPageHeading": false,
                        "hint": {
                          "el": "Για παράδειγμα ‘CY12 0020 0123 0000 0001 2345 6789’",
                          "en": "For example ‘CY12 0020 0123 0000 0001 2345 6789’"
                        },
                        "type": "text"
                      },
                      "validations": [
                        {
                          "check": "required",
                          "params": {
                            "message": {
                              "en": "Enter your IBAN",
                              "el": "Εισαγάγετε το IBAN σας"
                            }
                          }
                        },
                        {
                          "check": "valid",
                          "params": {
                            "checkValue": "iban",
                            "message": {
                              "en": "IBAN must be a valιd iban, for example",
                              "el": "To ΙΒΑΝ πρέπει να είναι έχει μορφή iban"
                            }
                          }
                        }
                      ]
                    },
                    {
                      "element": "textInput",
                      "params": {
                        "id": "Swift",
                        "name": "Swift",
                        "label": {
                          "el": "SWIFT",
                          "en": "SWIFT"
                        },
                        "isPageHeading": false,
                        "hint": {
                          "el": "For example ‘BANKCY2NXXX’",
                          "en": "Για πράδειγμα ‘BANKCY2NXXX’"
                        },
                        "type": "text"
                      },
                      "validations": [
                        {
                          "check": "required",
                          "params": {
                            "message": {
                              "en": "Enter your SWIFT",
                              "el": "Εισαγάγετε το SWIFT σας"
                            }
                          }
                        }
                      ]
                    },
                    {
                      "element": "button",
                      "params": {
                        "id": "continue",
                        "variant": "primary",
                        "text": {
                          "el": "Συνέχεια",
                          "en": "Continue"
                        },
                        "prototypeNavigate": "../answer-bank-boc"
                      }
                    }
                  ]
                }
              }
            ]
          }
        ]
      }
    },
    {
      "pageData": {
        "url": "answer-bank-boc",
        "title": {
          "el": "Ευρήματα",
          "en": "Findings",
          "tr": ""
        },
        "layout": "layouts/govcyBase.njk",
        "mainLayout": "two-third",
        "nextPage": "bank-settlement"
      },
      "pageTemplate": {
        "sections": [
          {
            "name": "beforeMain",
            "elements": [
              {
                "element": "backLink",
                "params": {}
              }
            ]
          },
          {
            "name": "main",
            "elements": [
              {
                "element": "form",
                "params": {
                  "elements": [
                    {
                      "element": "progressList",
                      "params": {
                        "current": 2,
                        "total": 3,
                        "showSteps": true,
                        "steps": [
                          {
                            "text": {
                              "en": "Bank details",
                              "el": "Τραπεζικά σας δεδομένα"
                            }
                          },
                          {
                            "text": {
                              "en": "Findings",
                              "el": "Ευρήματα"
                            }
                          },
                          {
                            "text": {
                              "en": "Bank settlement",
                              "el": "Τραπεζικά settlement"
                            }
                          }
                        ]
                      }
                    },
                    {
                      "element": "textElement",
                      "params": {
                        "id": "Title",
                        "type": "h1",
                        "text": {
                          "el": "Δείτε τα ευρήματα και απαντήστε",
                          "en": "Review findings and respond"
                        }
                      }
                    },
                    {
                      "element": "htmlElement",
                      "params": {
                        "id": "Body",
                        "text": {
                          "el": "<p>Έχουμε εξετάσει την αίτησή σας και βρήκαμε αυτά τα στοιχεία</p><h2>Καταθέσεις στην Τράπεζα Κύπρου</h2>",
                          "en": "<p>We have reviewed your application and provided the following results</p><h2>Deposits at Bank of Cyprus</h2>"
                        }
                      }
                    },
                    {
                      "element": "radios",
                      "params": {
                        "id": "Objection",
                        "name": "Objection",
                        "legend": {
                          "el": "Συμφωνείτε;",
                          "en": "Do you agree?"
                        },
                        "items": [
                          {
                            "value": "Accept",
                            "text": {
                              "el": "Συμφωνώ με τα ευρήματα",
                              "en": "I agree with the findings",
                              "tr": ""
                            }
                          },
                          {
                            "value": "Object",
                            "text": {
                              "el": "Διαφωνώ με τα ευρήματα",
                              "en": "I disagree with the findings",
                              "tr": ""
                            },
                            "conditionalElements": [
                              {
                                "element": "checkboxes",
                                "params": {
                                  "id": "ObjectionReason",
                                  "name": "ObjectionReason",
                                  "legend": {
                                    "el": "Λόγος διαφωνίας",
                                    "en": "Select all that apply"
                                  },
                                  "items": [
                                    {
                                      "value": "ObjectionReasonCode1",
                                      "text": {
                                        "el": "Το ποσό δε είναι σωστό",
                                        "en": "The impaired amount is incorrect",
                                        "tr": ""
                                      }
                                    },
                                    {
                                      "value": "ObjectionReasonCode2",
                                      "text": {
                                        "el": "Ο αριθμός μετοχών δεν είναι σωστός",
                                        "en": "The number of shares is incorrect",
                                        "tr": ""
                                      }
                                    },
                                    {
                                      "value": "ObjectionReasonCode3",
                                      "text": {
                                        "el": "Άλλος λόγος",
                                        "en": "Other reason",
                                        "tr": ""
                                      }
                                    }
                                  ],
                                  "isPageHeading": false,
                                  "hint": {
                                    "el": "Επιλέξτε όσα ισχύουν",
                                    "en": "Select all that apply",
                                    "tr": ""
                                  }
                                },
                                "validations": [
                                  {
                                    "check": "required",
                                    "params": {
                                      "message": {
                                        "en": "Enter your objection reasons",
                                        "el": "Εισαγάγετε τους λόγους της διαφωνίας σας"
                                      }
                                    }
                                  }
                                ]
                              },
                              {
                                "element": "textArea",
                                "params": {
                                  "id": "ObjectionExplanation",
                                  "name": "ObjectionExplanation",
                                  "rows": 7,
                                  "label": {
                                    "el": "Περιγραφή διαφωνίας",
                                    "en": "Provide more details"
                                  },
                                  "isPageHeading": false,
                                  "hint": {
                                    "el": "Χρησιμοποιήστε το πιο κάτο πεδίο για να εξηγήσετε την διαφωνία σας. Συμπεριλάβετε σχετικές πληροφορίες που αφορούν τη διαφονία σας.",
                                    "en": "Use the box below to explain why you disagree. Include any relevant details to support your disagreement."
                                  },
                                  "characterCount": {
                                    "type": "char",
                                    "max": 3000
                                  }
                                },
                                "validations": [
                                  {
                                    "check": "required",
                                    "params": {
                                      "message": {
                                        "en": "Enter your objection details",
                                        "el": "Εισαγάγετε τα objection details"
                                      }
                                    }
                                  },
                                  {
                                    "check": "valid",
                                    "params": {
                                      "checkValue": "alphaNum",
                                      "message": {
                                        "en": "Objection details must be an alpanumeric",
                                        "el": "Objection details πρέπει να είναι αποτελείται από αριθμους και χαρακτήρες"
                                      }
                                    }
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      },
                      "validations": [
                        {
                          "check": "required",
                          "params": {
                            "message": {
                              "en": "Select your decision",
                              "el": "Επιλέξτε την απόφασή σας"
                            }
                          }
                        }
                      ]
                    },
                    {
                      "element": "button",
                      "params": {
                        "id": "continue",
                        "variant": "primary",
                        "text": {
                          "el": "Συνέχεια",
                          "en": "Continue"
                        },
                        "prototypeNavigate": "../bank-settlement"
                      }
                    }
                  ]
                }
              }
            ]
          }
        ]
      }
    },
    {
      "pageData": {
        "url": "bank-settlement",
        "title": {
          "el": "Τραπεζικά settlement",
          "en": "Bank settlement",
          "tr": ""
        },
        "layout": "layouts/govcyBase.njk",
        "mainLayout": "two-third",
        "nextPage": "review"
      },
      "pageTemplate": {
        "sections": [
          {
            "name": "beforeMain",
            "elements": [
              {
                "element": "backLink",
                "params": {}
              }
            ]
          },
          {
            "name": "main",
            "elements": [
              {
                "element": "form",
                "params": {
                  "elements": [
                    {
                      "element": "progressList",
                      "params": {
                        "current": 3,
                        "total": 3,
                        "showSteps": true,
                        "steps": [
                          {
                            "text": {
                              "en": "Bank details",
                              "el": "Τραπεζικά σας δεδομένα"
                            }
                          },
                          {
                            "text": {
                              "en": "Findings",
                              "el": "Ευρήματα"
                            }
                          },
                          {
                            "text": {
                              "en": "Bank settlement",
                              "el": "Τραπεζικά settlement"
                            }
                          }
                        ]
                      }
                    },
                    {
                      "element": "textElement",
                      "params": {
                        "id": "Title",
                        "type": "h1",
                        "text": {
                          "el": "Τραπεζικά settlement",
                          "en": "Bank settlement"
                        }
                      }
                    },
                    {
                      "element": "htmlElement",
                      "params": {
                        "id": "Explanation",
                        "text": {
                          "el": "<p>Διακανονισμός είναι οποιαδήποτε αποζημίωση, αποπληρωμή ή άλλη οικονομική συμφωνία που λάβατε από την τράπεζα σχετικά με την απομείωση σας. Αυτό θα μπορούσε να περιλαμβάνει:</p><ul><li>άμεση πληρωμή από την τράπεζα</li><li>προσαρμογή δανείου ή συμψηφισμό χρέους</li><li>οποιαδήποτε άλλη μορφή οικονομικής αποζημίωσης</li></ul>",
                          "en": "<p>A settlement is any compensation, repayment, or other financial arrangement you received from the bank related to your impairment. This could include:</p><ul><li>a direct payment from the bank</li><li>a loan adjustment or debt offset</li><li>any other form of financial compensation</li></ul>"
                        }
                      }
                    },
                    {
                      "element": "radios",
                      "params": {
                        "id": "ReceiveSettlement",
                        "name": "ReceiveSettlement",
                        "legend": {
                          "el": "Έχετε λάβει διακανονισμό από την τράπεζα;",
                          "en": "Have you received a settlement from the bank?"
                        },
                        "items": [
                          {
                            "value": "yes",
                            "text": {
                              "el": "Ναι, έχω λάβει διακανονισμό",
                              "en": "Yes, I have received a settlement",
                              "tr": ""
                            },
                            "conditionalElements": [
                              {
                                "element": "textInput",
                                "params": {
                                  "id": "ReceiveSettlementExplanation",
                                  "name": "ReceiveSettlementExplanation",
                                  "label": {
                                    "el": "Εξήγηση",
                                    "en": "Explanation"
                                  },
                                  "isPageHeading": false,
                                  "hint": {
                                    "el": "Δώστε λεπτομέρειες σχετικά με τον διακανονισμό που λάβατε",
                                    "en": "Provide details about the settlement you received"
                                  }
                                }
                              },
                              {
                                "element": "dateInput",
                                "params": {
                                  "id": "ReceiveSettlementDate",
                                  "name": "ReceiveSettlementDate",
                                  "legend": {
                                    "en": "When did you receive your settlement?",
                                    "el": "Πότε λάβατε τον διακανονισμό σας;"
                                  }
                                }
                              }
                            ]
                          },
                          {
                            "value": "no",
                            "text": {
                              "el": "Όχι, δεν έχω λάβει διακανονισμό",
                              "en": "No, I have not received a settlement",
                              "tr": ""
                            }
                          }
                        ]
                      }
                    },
                    {
                      "element": "button",
                      "params": {
                        "id": "continue",
                        "variant": "primary",
                        "text": {
                          "el": "Συνέχεια",
                          "en": "Continue"
                        },
                        "prototypeNavigate": "../review"
                      }
                    }
                  ]
                }
              }
            ]
          }
        ]
      }
    }
  ]
}
```

- `site` object: Contains information about the site, including the site ID, language, and footer links. See [govcy-frontend-renderer](https://github.com/gov-cy/govcy-frontend-renderer/tree/main#site-and-page-meta-data-explained) for more details. Some fields that are only specific to the govcy-express-forms project are the following:
  - `submission_data_version` : The submission data version,
  - `renderer_version` : The govcy-frontend-renderer version,
  - `design_systems_version` : The govcy-design-system version,
- `pages` array: An array of page objects, each representing a page in the site. 
    - `pageData` object: Contains the metadata to be rendered on the page. See [govcy-frontend-renderer](https://github.com/gov-cy/govcy-frontend-renderer/tree/main#site-and-page-meta-data-explained) for more details
    - `pageTemplate` object: Contains the page template to be rendered on the page. See [govcy-frontend-renderer](https://github.com/gov-cy/govcy-frontend-renderer/tree/main#json-input-template) for more details
      - `elements` array: An array of elements to be rendered on the page. See all supported [govcy-frontend-renderer elements]https://github.com/gov-cy/govcy-frontend-renderer/blob/main/DESIGN_ELEMENTS.md) for more details

### Input Validations

The project includes input validation for the following elements:

- `textInput`
- `textArea`
- `select`
- `radios`
- `checkboxes`
- `datePicker`
- `dateInput`

The validation rules for each element are defined in the `"validations` array for each element. The project support the following validations:

- `valid`: Checks the value against the specified rule's `checkValue`. Available rules:
    - `numeric`: Numeri input
    - `numDecimal`: Numeric decimal input
    - `currency`: Currency input (numeric with 2 decimal places)
    - `alpha`: Alphabetic input
    - `alphaNum`: Alphanumeric input
    - `name`: Name input
    - `tel`: Telephone input
    - `mobile`: Mobile input
    - `telCY`: Cyprus telephone input
    - `mobileCY`: Cyprus mobile input
    - `iban`: IBAN input
    - `email`: Email input
    - `date`: Date input (DD/MM/YYYY)
    - `dateISO`: ISO date input `YYYY-M-D`
    - `dateDMY`: European/Common Format date input `D/M/YYYY`
- `required`: Checks if the value is not null, undefined, or an empty string (after trimming).
- `length`: Checks if the value has a maximum length passed in the `checkValue` parameter.
- `regCheck`: Checks if the value matches the specified regular expression passed in the `checkValue` parameter.
- `minValue`: Checks if the value is greater than or equal to the specified minimum value passed in the `checkValue` parameter.
- `maxValue`: Checks if the value is less than or equal to the specified maximum value passed in the `checkValue` parameter.
- `minValueDate`: Checks if the value is greater than or equal to the specified minimum date passed in the `checkValue` parameter.
- `maxValueDate`: Checks if the value is less than or equal to the specified maximum date passed in the `checkValue` parameter.
- `minLength`: Checks if the value has a minimum length passed in the `checkValue` parameter.

Example:

```json
"validations": [
    {
        "check": "required",
        "params": {
        "message": {
            "en": "Enter your IBAN",
            "el": "Εισαγάγετε το IBAN σας"
        }
        }
    },
    {
        "check": "valid",
        "params": {
        "checkValue": "iban",
        "message": {
            "en": "IBAN must be a valιd iban, for example",
            "el": "To ΙΒΑΝ πρέπει να είναι έχει μορφή iban"
        }
        }
    }
]
```

### Routes
The project uses express.js to serve the following routes:

#### Service routes:
- **`/:siteId`**: Requires **cyLogin** authentication for **authorized individual users**. Redirects to `/:siteId/index`.
- **`/:siteId/:pageUrl`**: Requires **cyLogin** authentication for **authorized individual users**. Based on `/data/:siteId.json`, Renders the specified page template. Validates page and saves data to session. If validation fails, errors are displayed with links to the inputs.
- **`/:siteId/review`**: Requires **cyLogin** authentication for **authorized individual users**. Renders the check your answers page template. Validates all pages in the service and submits the data to the configured API endpoint. If validation fails, errors are displayed with links to the relevant pages.
- **`/:siteId/success`**: Requires **cyLogin** authentication for **authorized individual users**. Renders latest successful submission.
- **`/:siteId/success/pdf`**: Requires **cyLogin** authentication for **authorized individual users**. Downloads the PDF of the latest successful submission.

#### Authentication routes:
- **`/signin-oidc`**: CY Login authentication endpoint.
- **`/login`**: Redirect to CY Login login page.
- **`/logout`**: CY Login logout endpoint.

## Credits
- Cyprus Government Digital Services Factory (DSF) [dsf-admin@dits.dmrid.gov.cy](mailto:dsf-admin@dits.dmrid.gov.cy)
- Cyprus Connecting Digital Services Team [cds-support@dits.dmrid.gov.cy](mailto:cds-support@dits.dmrid.gov.cy)

## Developer notes
For local develoment checke the [developer notes](./NOTES.md) document.

## License
This project is released under the [MIT License](LICENSE).

## Contact
If you have any questions or feedback, please feel free to reach out to us at [dsf-admin@dits.dmrid.gov.cy](mailto:dsf-admin@dits.dmrid.gov.cy)

