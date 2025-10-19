# Best Practices for govcy-express-services

This document outlines recommended practices for developers implementing services using the `govcy-express-services` and `govcy-frontend-renderer` frameworks.


## 1. Repository Structure

- Prefer **one service per repository**.
- You *may* include multiple services (e.g., multiple `/data/*.json` files) **only if**:
  - They share the **same CY Login client ID and secrets**
  - They submit to **the same backend API endpoint**
  - They belong to the **same logical domain or business unit**

## 2. Environment Separation

- Always maintain **distinct environments**:
  - `development`
  - `staging`
  - `production`
- Each environment should have its **own `.env` file**, with separate:
  - Redirect URIs
  - Tokens
  - Secrets
- These environments must be isolated and tested separately.

## 3. CY Login Client Registration

- **Do not reuse** CY Login client IDs across services or environments.
- Register a **unique client ID** for each:
  - Repository
  - Environment (`dev`, `staging`, `prod`)
- This improves security and auditability.

## 4. Mandatory Footer Pages

All services **must** include links to the following pages in the footer:

| Page | Pattern Documentation |
|------|------------------------|
| **Privacy** | [Privacy Policy Page](https://gov-cy.github.io/govcy-design-system-docs/patterns/privacy_policy_page/) |
| **Cookies** | [Cookies Page](https://gov-cy.github.io/govcy-design-system-docs/patterns/cookies_pages/) |
| **Accessibility** | [Accessibility Statement Page](https://gov-cy.github.io/govcy-design-system-docs/patterns/accessibility_pages/) |

- These should be included in the `site.footerLinks` section of your JSON or template.
- Use multilingual support for both `el` and `en`.

Example:

```json
"footerLinks": [
  { "label": {"en": "Privacy", "el": "Απόρρητο"}, "href": "/service/privacy" },
  { "label": {"en": "Cookies", "el": "Cookies"}, "href": "/service/cookies" },
  { "label": {"en": "Accessibility", "el": "Προσβασιμότητα"}, "href": "/service/accessibility" }
]
```

## 5. Footer Icons

All services that are funded by the EU Next Generation EU **must** include icons in the footer. Also services that have passed the DSF Service Standard Assessment must include the service standard badge. This can be done by adding under `site` the following:

Example:

```json
{
    "site" : {
        "lang" : "en",
        ...
        ...,
        "footerIcons": [
            {
                "src": {
                    "en": "https://cdn.jsdelivr.net/gh/gov-cy/govdesign@main/seals/ssv-certificate-verification-info.svg",
                    "el": "https://cdn.jsdelivr.net/gh/gov-cy/govdesign@main/seals/ssv-certificate-verification-info.svg"
                },
                "alt": {
                    "en": "Service Standard Verified seal", 
                    "el": "Σφραγίδα Πιστοποίησης Υπηρεσίας"
                },
                "href": {
                    "en": "https://dsf.dmrid.gov.cy/2022/11/15/update-my-details/",
                    "el": "https://dsf.dmrid.gov.cy/2022/11/15/update-my-details/"
                },
                "style": {
                    "en": "content: url(https://cdn.jsdelivr.net/gh/gov-cy/govdesign@main/seals/ssv-certificate-verification-info.svg) !important;aspect-ratio: auto;height: 53px !important;",
                    "el": "content: url(https://cdn.jsdelivr.net/gh/gov-cy/govdesign@main/seals/ssv-certificate-verification-info.svg) !important;aspect-ratio: auto;height: 53px !important;"
                },
                "target": "_blank",
                "classes": "govcy-mr-3"
            },
            {
                "src": {
                    "en": "https://cdn.jsdelivr.net/gh/gov-cy/govdesign@main/FundedbyEU_NextGeneration_H53-EN.png",
                    "el": "https://cdn.jsdelivr.net/gh/gov-cy/govdesign@main/FundedbyEU_NextGeneration_H53-EL.png"
                },
                "alt": {
                    "en": "Funded by the EU Next Generation EU",
                    "el": "Χρηματοδοτείται από την ΕΕ Next Generation EU"
                },
                "href": {
                    "en": "https://europa.eu/",
                    "el": "https://europa.eu/"
                },
                "title": {
                    "en": "Go to EU website",
                    "el": "Μετάβαση στην ιστοσελίδα της ΕΕ"
                },
                "target": "_blank"
            },
            {
                "src": {
                    "en": "https://cdn.jsdelivr.net/gh/gov-cy/govdesign@main/CYpros%20to%20aurio%20logo%20eng_H53_EN.png",
                    "el": "https://cdn.jsdelivr.net/gh/gov-cy/govdesign@main/CYpros%20to%20aurio%20logo%20eng_H53_EL.png"
                },
                "alt": {
                    "en": "Cyprus tomorrow, recovery and resilience plan",
                    "el": "Κύπρος το Αύριο, σχέδιο ανάκαμψης και ανθεντικότητας"
                },
                "href": {
                    "en": "http://www.cyprus-tomorrow.gov.cy/",
                    "el": "http://www.cyprus-tomorrow.gov.cy/"
                },
                "title": {
                    "en": "Go to Cyprus Tomorrow website",
                    "el": "Μετάβαση στην ιστοσελίδα Κύπρος το Αύριο"
                },
                "target": "_blank"
            }
        ],
        ...
      }
```

## 6. Version Control & Reviews

- All services should be under version control (e.g., Git).
- Use pull requests and code reviews before merging to main.
- Tag releases using semantic versioning (e.g., v1.0.0).

## 7. Use appropriate `textInput` types

Text inputs can have different types (https://gov-cy.github.io/govcy-design-system-docs/components/text_input/#text-input-patterns). Use the `textInput` element `params.type` to set the appropriate type. I can be:
- text (default)
- numeric
- email
- name
- tel

For example the `mobile` input field can be set to `tel`:

```json
{
    "element": "textInput",
    "params": {
        "id": "mobile",
        "name": "mobile",
        "type": "tel",
        "label": {
            "el": "Αριθμός κινητού τηλεφώνου",
            "en": "Mobile phone number",
            "tr": ""
        },
        "isPageHeading": false,
        "hint": {
            "el": "Μόνο για αριθμούς εκτός Κύπρου χρειάζεται ο κωδικός χώρας",
            "en": "Country code only needed for numbers outside of Cyprus",
            "tr": ""
        },
        "fixedWidth": "20"
    }
}
```

## 8. Input validations

Always set the appropriate input validations. 

For text based inputs: 
- use `required` validation when the field is required.
- use the `maxLength` validation to limit the length of the input.
- and use and appropriate `valid` validation. When there is no clear valid validation, use the `noSpecialChars` validation to limit the allowed characters.

Check out the example below for the `email` input field:

```json
{
    "element": "textInput",
    "params": {
        "id": "email",
        "name": "email",
        "label": {
            "el": "Email",
            "en": "Email",
            "tr": ""
        },
        "isPageHeading": false,
        "type": "email"
    },
    "validations": [
        {
            "check": "required",
            "params": {
                "checkValue": "",
                "message": {
                    "el": "Εισαγάγετε το email σας",
                    "en": "Enter your email",
                    "tr": ""
                }
            }
        },
        {
            "check": "valid",
            "params": {
                "checkValue": "email",
                "message": {
                    "el": "Το email πρέπει να έχει μορφή email. Για παράδειγμα `name@provider.com`",
                    "en": "Email must be of email format. For example `name@provider.com`",
                    "tr": ""
                }
            }
        },
        {
            "check": "length",
            "params": {
                "checkValue": "254",
                "message": {
                    "el": "Το email πρέπει να είναι 254 χαρακτήρες ή λιγότεροι",
                    "en": "Email must be 254 characters or less",
                    "tr": ""
                }
            }
        }
    ]
}

```

## 9. Use Update my Details pages

Prefer to use [Update my details pages](README.md#update-my-details-pages) instead of gathering contact details from the user.

## 10. Civil Registry eligibility checks

When applicable, implement the appropriate [civil registry eligibility checks](docs/Eligibility-civil-registry.md).

## Additional Guidelines

- Test all service flows (eligibility → form → review → submission → success).
- Include contact or feedback links where appropriate.