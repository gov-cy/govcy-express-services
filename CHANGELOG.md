# Changelog
 
All notable changes to this project will be documented in this file.
 
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.0-alpha.15] - 2025-08-31
### Changed
- Updated overall documentation for better readability

## [v1.0.0-alpha.14] - 2025-08-28
### Changed
- Removed `formData` from `submission_data` for clearer submission data.

## [v1.0.0-alpha.13] - 2025-08-28
### Changed
- Update documentation for file Uploads and more.

## [v1.0.0-alpha.12] - 2025-08-26
### Added
- Added more unit tests

## [v1.0.0-alpha.11] - 2025-08-24
### Added
- Added overlay when loading. Improved accessibility

## [v1.0.0-alpha.10] - 2025-08-21
### Changed
- Added support for **view files** 
  - Added `/:siteId/:pageUrl/view-file/:elementName` route (`get`)
  - Added links on fileView both on client side and server side (opening in new tab)
  - Added links on `review` page to view files (opening in new tab)
  - Added unit tests
- Changed delete file url to `/:siteId/:pageUrl/delete-file/:elementName`

## [v1.0.0-alpha.9] - 2025-08-19
### Changed
- Added support for **delete files** 
  - Added `/:siteId/:pageUrl/:elementName/delete-file` route (`get` and `post`)
  - Delete url on fileView both on client side and server side (preserving `route` query param)

## [v1.0.0-alpha.8] - 2025-08-17
### Changed
- Better accessibility on upload failed and success announcements from JS
- Better error messages from JS
- Created a dedicated site for files `test-files.json`
- Added `ErrorCode`'s on `handleFileUpload` to let JS know which message to show
- Refactored `prepareSubmissionData` to handle files (also adding the `Attachment` at the end of the key)
- Added more unit tests

## [v1.0.0-alpha.7] - 2025-08-15
### Changed
- Added support for fileInput inside conditional radio elements
- Transforms uploaded fileInput into fileView with fileId, sha256, viewHref, deleteHref
- Injects window._govcyFileInputs, siteId, pageUrl, and lang via script tag
- Removes need for hidden inputs for file metadata (cleaner DOM)
- Adds ARIA live regions for success/failure announcements
- Preserves accessibility (form-control-error, screen reader support)
- Expanded unit tests to cover:
  - Conditional file input rendering
  - Validation and dataLayer integration
- Refactored data lookup via `getFormDataValue` for safety and reusability

## [v1.0.0-alpha.6] - 2025-08-14
### Added
- **File upload feature endpoint** to serve JS calls to upload files using API:
  - **`handleFileUpload` utility** (`govcyHandleFiles.mjs`)
    - Centralized all upload logic with validation, config loading, conditional logic, and API request handling.
    - Returns consistent `{ status, data?, errorMessage? }` structure.
    - Supports future extensions like download handling.

  - **`govcyFiles.js`**
    - Browser-side file upload script using `axios`.
    - Automatically injects uploaded file metadata into hidden inputs.
    - Handles CSRF and API response parsing.

  - **API-aware detection utility** (`govcyIsApiRequest.mjs`)
    - Detects whether request targets an API based on headers or upload/download URL patterns.
    - Used in CSRF, auth, and error handling.

  - **API response helpers** (`govcyApiResponse.mjs`)
    - `successResponse(data)` and `errorResponse(status, message)` for consistent API output formatting.

  - **Magic byte (file signature) validation** (in `govcyHandleFiles.mjs`)
    - Ensures uploaded files match allowed MIME types both via declared `mimetype` and actual magic byte inspection.

### Changed
- **`govcyUpload.mjs`**
  - Now delegates all logic to `handleFileUpload`.
  - Multer middleware simplified with consistent error response handling.

- **`govcyApiRequest.mjs`**
  - Automatically adds correct `Content-Type` headers for `FormData` payloads.

- **`govcyHttpErrorHandler.mjs`**
  - Returns JSON error responses for API routes (e.g., file upload) using `errorResponse()`.

- **`cyLoginAuth.mjs`**
  - Detects API requests and returns `401` instead of redirecting unauthenticated users.

- **`govcyCsrfMiddleware.mjs`**
  - Supports `X-CSRF-Token` for `multipart/form-data` API requests.

- **`index.mjs`**
  - Added the `/apis/:siteId/:pageUrl/upload` route to handle file upload requests.

- **Tests**
  - **Unit tests for `handleFileUpload`** (`govcyHandleFiles.test.mjs`)
    - 12 tests covering:
      - Missing file, invalid MIME, empty file, conditional logic, file too large
      - Invalid config, invalid page, and successful upload.
    - Uses real API mocking endpoint where applicable.

- **Constants**
  - Added to `govcyConstants.mjs`:
    - `ALLOWED_MULTER_FILE_SIZE_MB`
    - `ALLOWED_FILE_SIZE_MB`
    - `ALLOWED_FILE_MIME_TYPES`

## [v1.0.0-alpha.5] - 2025-08-12
### Changed
- Updated `RELEASE.md`

## [v1.0.0-alpha.3] - 2025-08-11
### Changed
- Now we allow API response HTTP Status Codes other than `200`

## [v1.0.0-alpha.0] - 2025-08-09
### Added
- **Temporary save & load feature** for service submissions:
  - **`govcyLoadSubmissionData` middleware**:
    - Calls `submissionGetAPIEndpoint` to retrieve existing saved submissions.
    - If found, stores API `Data` in `siteData[siteId].loadData`.
    - Hydrates `siteData[siteId].inputData` from `submissionData` JSON string (if available).
    - If no saved submission exists, calls `submissionPutAPIEndpoint` to create one.
    - Skips API calls if load data already exists in the session.
  - **`storeSiteInputData`** function added to `govcyDataLayer` to replace in-memory form data with pre-saved values.
  - Unit tests added/updated to verify `govcyLoadSubmissionData` and `storeSiteInputData` behavior.
- **Automatic temporary save on form POST**:
  - `govcyFormsPostHandler` now supports *fire-and-forget* call to new helper `govcyTempSave`:
    - Saves form data via `submissionPutAPIEndpoint` after successful validation.
    - Errors are caught and logged internally to avoid blocking user flow.
    - `submission_data` is JSON-stringified before sending to the API.
    - Sends correct headers:  
      - `accept: "text/plain"`  
      - `content-type: "application/json"`

### Changed
- Registered `govcyLoadSubmissionData` middleware in all relevant GET routes:
  - `/:siteId` (before redirect to first page)  
  - `/:siteId/:pageUrl` (before rendering form page)  
  - `/:siteId/review` (before rendering review page)  
  In all cases, middleware runs after `govcyServiceEligibilityHandler` and before page handler.

### Configuration & Environment Changes
- **Service config JSON**:
  - New optional `submissionGetAPIEndpoint` and `submissionPutAPIEndpoint` objects under `site`:
    ```json
    "submissionGetAPIEndpoint": {
      "url": "TEST_SUBMISSION_GET_API_URL",
      "method": "GET",
      "clientKey": "TEST_SUBMISSION_API_CLIENT_KEY",
      "serviceId": "TEST_SUBMISSION_API_SERVICE_ID"
    },
    "submissionPutAPIEndpoint": {
      "url": "TEST_SUBMISSION_PUT_API_URL",
      "method": "PUT",
      "clientKey": "TEST_SUBMISSION_API_CLIENT_KEY",
      "serviceId": "TEST_SUBMISSION_API_SERVICE_ID"
    }
    ```
  - Optional field: `"dsfgtwApiKey"` if API gateway key is required.

- **Environment variables**:
  - Each JSON `url`, `clientKey`, `serviceId` (and optionally `dsfgtwApiKey`) should map to an environment variable containing the actual value.

### Backward Compatibility
- **Fully backward compatible**:
  - If `submissionGetAPIEndpoint` and `submissionPutAPIEndpoint` are not defined in the service config, the new save/load logic is skipped entirely.
  - Existing services without these settings continue to work unchanged.


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