# Changelog
 
All notable changes to this project will be documented in this file.
 
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.3.1] - 2025-10-23
### Changed
- Updated NPM publishing

## [v1.3.0] - 2025-10-22
### Added
**New features**:
- [Multiple things feature](README.md#multiple-things-pages-repeating-group-of-inputs)
- [Update my details pages](README.md#update-my-details-pages)

### Changed
- Styles for express services
- Fixed vulnerabilities

## [v1.2.0] - 2025-09-19
### Added
- `site.reviewPageHeader` , `site.successPageHeader` and `site.successEmailHeader` to be used for the `review` and `success` pages and `email`. 

## [v1.1.1] - 2025-09-17
### Added
- Added more unit tests

### Changed
- Updated `NOTES.md`documentation 
- Updated `express-service-shema.json`

## [v1.1.0] - 2025-09-16
### Added
- Added more unit tests 

## [v1.0.0] - 2025-09-15 
### ⚠️ Breaking Changes
- the `submission` data send via the API:
  - Changed to use **camelCase** instead of snake_case, to be aligned with the DSF submission platform. Here is how the data looks like:
```json
{
  "submissionUsername" : "",   // User's username
  "submissionEmail" : "",      // User's email
  "submissionData": "{}",      // Raw data as submitted by the user in each page
  "submissionDataVersion": "", // The submission data version
  "printFriendlyData": "[]",   // Print friendly data
  "rendererData" :"{}",        // Renderer data of the summary list
  "rendererVersion": "",       // The renderer version
  "designSystemsVersion": "",  // The design systems version
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

### Added
- **Temporary save & load feature** for service submissions. See more on the [temporary save feature in README.md](./README.md#-temporary-save-feature).
- **File upload feature** for service submissions. See more on the [files uploads feature in README.md](./README.md#%EF%B8%8F-files-uploads-feature).

### Changed
- Updated `govcy-frontend-renderer` for
  - better screen reader support on the `summaryList` which is used in the `review` and `success` page
  - `warning` component support
  - `header title with links` support. To do that the `site.headerTitle` must look something like this:
```json
{
    "site" : {
        ...
        "headerTitle" : 
        {
            "title": {
                "en":"Header title", 
                "el":"Τιτλός επικεφαλιδας"
            },
            "href": {
                "en":"/service-id",
                "el":"/service-id"
            }
        },
        ...
    }
}
```
- `Header title link - Backward compatibility`: If `site.headerTitle.title` is not set, the `site.headerTitle` will be used instead, as was before v1.x.x , for example:
```json
{
    "site" : {
        ...
        "headerTitle" : 
        {
            "en":"Header title", 
            "el":"Τιτλός επικεφαλιδας"
        }
        ...
    }
}
```

### Security
- Updated to handle [Axios is vulnerable to DoS attack through lack of data size check](https://github.com/advisories/GHSA-4hjh-wcwx-xvwj) issue

## [v0.2.16] - 2025-08-06
### Added
- Workflow to publish legacy and dev versions `tag-and-publish-legacy-and-dev.yml`
- Release noted document `RELEASE.md`

## [v0.2.14] - 2025-08-04
### Added
- Footer icons support with `site.footerIcons`

## [v0.2.13] - 2025-08-03 - Stable Submission Data Schema
### Changed
- Implemented **template-driven** `submissionData` generation inside `prepareSubmissionData()`:
  - Now builds a complete, schema-consistent `submission_data` object based on the service config (JSON definition).
  - Each `pageUrl` includes all expected fields under a `formData` object, even if not filled or shown to the user.
  - Nested `conditionalElements` (e.g. inside `radios.items[]`) are always included, regardless of user selection.

## Why it matters
- Guarantees a **stable, predictable submission schema** for API consumers (e.g., Excel exports, backoffice integrations).
- Eliminates variation caused by hidden/skipped inputs or conditionally rendered pages.

## [v0.2.12] - 2025-07-29
### Changed
- Added ability to load non secret environmental variables from version controlled files with `.env.development`, `.env.staging`, and `.env.production`
- Moved Matomo configuration to `.env.development`, `.env.staging`, and `.env.production`
- Updated documentation

## [v0.2.11] - 2025-07-29
### Changed
- Ability to show new lines on summary list items

## [v0.2.10] - 2025-07-26
### Changed
- All pages now include `isTesting` on staging.

## [v0.2.9] - 2025-07-25
### Changed
- Updated resources
- In the success page instead of `/${siteId}/success/pdf` the href is `javascript:window.print()`

## [v0.2.8] - 2025-07-24
### Changed
- Updated security and cache control headers middleware.

## [v0.2.7] - 2025-07-24
### Changed
- Cookie settings for `staging` and `production` environments.

## [v0.2.6] - 2025-07-24
### Changed
- The way the secrets are loaded. They are loaded from the `/secrets/.env` file now.

## [v0.2.5] - 2025-07-22
### Changed
- API requests now conditionally accept self-signed certificates if `ALLOW_SELF_SIGNED_CERTIFICATES=true` in `.env`.
- Updated `README.md` with information about environment variables.

## [v0.2.4] - 2025-07-22
### Changed
- Fixed critical vulnerabilities.

## [v0.2.3] - 2025-07-22
### Changed
- API requests now conditionally include the `dsfgtw-api-key` header only if the value is present in JSON config.

## [v0.2.2] - 2025-07-16
### Changed
- Updated `index.mjs` to start the server with HTTP on `staging` and `production` environments
- Updated `INSTALL-NOTES.md` for docker instructions

## [v0.2.1] - 2025-07-14
### Changed
- Updated `test.json` to include conditional logic
- Updated readme for conditional logic

## [v0.2.0] - 2025-07-13
### Added
- ✨ Page-level conditional logic via `pageData.conditions` array.
- Introduced `govcyExpressions.mjs` module to safely evaluate logic expressions using `new Function`.
- Page middlewares (`govcyPageHandler`, `govcyFormsPostHandler`) updated to evaluate conditions post-submission and apply redirects.
- Review post middleware (`govcyReviewPostHandler`) updated to evaluate conditions and ignore validation checks for pages that are conditionally-redirected.
- Conditional logic integrated into:
  - Review page generation
  - Submission data via `prepareSubmissionData` and `preparePrintFriendlyData`
  - Print and renderer data
- Skipped pages are excluded from submission, review summary, and validation.
- Unit tests added: `govcyExpressions.test.mjs`
- Functional tests added: `conditionals.test.mjs`

### Changed
- Updated `govcySubmitData.mjs` to skip conditionally-redirected pages from all derived output (submission, print, review).
- Improved error handling and logging during expression evaluation.
- Unit test `govcySubmitData.test.mjs` updated to match changes

### Notes
- Expressions must use safe accessors: e.g., `String(... || '')` or optional chaining.
- This is a major logic enhancement; ensure thorough testing before rollout.

## [v0.1.7] - 2025-06-26
### Added
- Support for expressions with `utils/govcyExpressions`

## [v0.1.6] - 2025-06-20
### Changed
- Support for multiple languages for `site.homeRedirectPage`

## [v0.1.5] - 2025-06-18
### Added
- Added best practices documentation

## [v0.1.4] - 2025-06-18
### Changed
- Updated readme

## [v0.1.3] - 2025-06-18
### Changed
- Replaced `submission_id` with `referenceValue` on the `submission.data` to align with the DSF submission platform

## [v0.1.2] - 2025-06-18
### Changed
- Readme with better documentation

## [v0.1.1] - 2025-06-17
### Added
- `tag-and-publish-on-version-change` workflow

## [v0.1.0] - 2025-06-16
### Added
- Initial release