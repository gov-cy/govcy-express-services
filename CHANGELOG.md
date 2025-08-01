# Changelog
 
All notable changes to this project will be documented in this file.
 
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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