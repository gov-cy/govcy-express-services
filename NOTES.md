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
```

To generate the SESSION_SECRET, run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'));"`

## Session Sample



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
       // SUBMISSION
      "submission": { 
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
      // SUBMISSION
      "submission": {
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

## Notes about form tokens

- CSRF Token: Protects against cross-site attacks. Valid for the whole session.
- Submission Token (Nonce): Unique per form render. Expires after one successful submission.