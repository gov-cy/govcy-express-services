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

## 5. Version Control & Reviews

- All services should be under version control (e.g., Git).
- Use pull requests and code reviews before merging to main.
- Tag releases using semantic versioning (e.g., v1.0.0).

## 6. Additional Guidelines

- Test all service flows (eligibility → form → review → submission → success).
- Include contact or feedback links where appropriate.