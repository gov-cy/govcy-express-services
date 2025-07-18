# Changelog
 
All notable changes to this project will be documented in this file.
 
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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