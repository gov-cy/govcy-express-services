/**
 * @module govcyExpressions
 * 
 * This module provides utility functions for evaluating JavaScript expressions
 * with a flattened context, ensuring safe execution and preventing unsafe patterns.
 * 
 */
import { logger } from "../utils/govcyLogger.mjs";
import * as dataLayer from "../utils/govcyDataLayer.mjs";

/**
 * Recursively flattens nested objects into dot-path keys.
 * E.g. { a: { b: { c: 5 } } } → { "a.b.c": 5 }
 * 
 * Example usage:
 * ```javascript
 * flattenContext(req.session.siteData["testService"],"testService")
 * ```
 * This will output:
 * ```json
 * {
   "testService.inputData.index.formData.certificate_select": [
    "birth",
    "permanent_residence"
  ],
  "testService.inputData.page1.formData.mobile_select": "mobile",
  "testService.inputData.page1.formData.mobileTxt": "",
  "testService.inputData.page2.formData.mobile": "+35722404383",
  "testService.inputData.page2.formData.dateGot_day": "12",
  "testService.inputData.page2.formData.dateGot_month": "10",
  "testService.inputData.page2.formData.dateGot_year": "1212",
  "testService.inputData.page2.formData.appointment": "10/06/2025"
 }
 * 
 * @param {object} obj - The object to flatten
 * @param {string} prefix - The prefix for nested keys (used internally)
 * @param {object} res - The result object to store flattened keys (used internally) 
 * @returns {object} - Flattened object with dot-path keys 
 */
export function flattenContext(obj, prefix = '', res = {}) {
  for (const [key, val] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      flattenContext(val, path, res);
    } else {
      res[path] = val;
    }
  }
  return res;
}

/**
 * Validates a JavaScript expression string against a blocklist of unsafe patterns.
 * Throws an error if any unsafe pattern is found.
 * 
 * @throws {Error} If the expression contains any unsafe patterns 
 * @param {string} expression - The JavaScript expression to validate
 * @returns {void} 
 */
function validateExpression(expression) {
  const blocklist = [
    'while(', 'for(', 'do{', // loops
    'Function(', 'constructor(', // access to internals
    'process', 'require', // Node.js access
    'global', 'this', 'eval', // execution context or scope tricks
    '__proto__', 'prototype', // prototype chain abuse
    'setTimeout', 'setInterval', // async/loops
  ];

  for (const forbidden of blocklist) {
    if (expression.includes(forbidden)) {
        logger.debug(`Blocked unsafe expression: contains "${forbidden}"`, expression);
        throw new Error(`Blocked unsafe expression: contains "${forbidden}"`);
    }
  }
}


/**
 * Evaluates a JavaScript expression string with a given context. 
 * 
 * @param {string} expression - The JavaScript expression to evaluate 
 * @param {object} dataLayer - The context object containing data for evaluation
 * @throws {Error} If the expression is invalid or contains unsafe patterns 
 * @returns 
 */
export function evaluateExpression(expression, dataLayer = {}) {
    validateExpression(expression); // ⛔️ Blocks known unsafe patterns

    // The expression will reference: dataLayer["some.path.key"]
    console.debug(`Evaluating expression: ${expression}`, dataLayer);
    const fn = new Function('dataLayer', `return (${expression});`);
    return fn(dataLayer);
}


/**
 * Evaluates expression **with automatic flattening**.
 * This is a convenience wrapper for most use cases.
 * 
 * @param {string} expression - JS expression using dataLayer["..."]
 * @param {object} object - Unflattened data object (e.g., session.siteData[siteKey])
 * @param {string} prefix - Prefix to add to all keys (usually the siteKey)
 * @returns {*} - The evaluated result
 */
export function evaluateExpressionWithFlattening(expression, object, prefix = '') {
  const dataLayer = flattenContext(object, prefix);
  return evaluateExpression(expression, dataLayer);
}


/**
 * Evaluates whether a page should be rendered or redirected based on its conditions.
 *
 * - Conditions are located in `page.pageData.conditions`
 * - Each condition must have a valid `expression` and `redirect`
 * - If an expression evaluates to `true`, the user is redirected
 * - If all expressions fail (or none exist), the page is rendered
 *
 * @param {object} page - The page object containing `pageData.conditions`
 * @param {object} store - The full session object (e.g., `req.session`)
 * @param {string} siteKey - The key for the current site context (e.g., `"nsf2"`)
 * @param {object} req - The request object (used to track redirect depth)
 * @returns {{ result: true } | { result: false, redirect: string }}
 *          An object indicating whether to render the page or redirect
 */
export function evaluatePageConditions(page, store, siteKey, req) {
  // Get conditions array from nested page structure
  const conditions = page?.pageData?.conditions;

  // --- Protect against infinite redirects ---
  const depth = req?._pageRedirectDepth || 0;           // Track redirect depth per request (resets every HTTP call)
  if (depth > 10) {                                     // Safer default max limit
    logger.debug(`Max redirect depth exceeded for siteKey '${siteKey}'`);
    return { result: true };
  }

  // If no conditions or not an array, render the page by default
  if (!Array.isArray(conditions) || conditions.length === 0) {
    logger.debug(`No conditions found for page '${page.pageData?.url || page.id}'`);
    return { result: true };
  }

  // Get scoped session data for this site
  const siteData = dataLayer.getSiteData(store, siteKey);
  if (!siteData || typeof siteData !== 'object') {
    logger.debug(`No site data found for siteKey '${siteKey}' on page '${page.pageData?.url || page.id}'`);
    return { result: true }; // If site data is missing, continue safely
  }

  // Evaluate each condition
  for (const [i, condition] of conditions.entries()) {
    // Ensure the condition is well-formed
    const isValid =
      typeof condition === 'object' &&
      condition !== null &&
      typeof condition.expression === 'string' &&
      condition.expression.trim() !== '' &&
      typeof condition.redirect === 'string' &&
      condition.redirect.trim() !== '';

    if (!isValid) {
      logger.debug(`Skipping invalid condition at index ${i} on page '${page.pageData?.url || page.id}'`, condition);
      continue;
    }

    try {
      // Evaluate the expression using flattened site data
      const result = evaluateExpressionWithFlattening(
        condition.expression,
        siteData,
        siteKey
      );

      if (typeof result !== 'boolean') {
        logger.debug(`Condition expression on page '${page.pageData?.url || page.id}' returned non-boolean:`, result);
      }

      // ✅ If expression is true → trigger redirect
      if (result === true) {                            // Only redirect if explicitly `true`
        // --- Protect against infinite redirects ---
        req._pageRedirectDepth = depth + 1;             // Increment redirect counter only if redirecting
        logger.debug(`Condition[${i}] matched on page '${page.pageData?.url || page.id}':`, condition.expression, condition.redirect);
        // Store redirect info in request for later use and traceability 
        req._redirectedByCondition = {
          fromPage: page.pageData?.url || page.id,
          toPage: condition.redirect,
          expression: condition.expression
        };
        // return redirect response
        return { result: false, redirect: condition.redirect };
      }
    } catch (err) {
      logger.debug(`Expression error in condition[${i}] on page '${page.pageData?.url || page.id}':`, condition.expression);
      logger.debug('→', err.message);
      // ❌ Expression threw an error — skip and evaluate next
    }
  }

  // ✅ All expressions were false or skipped → allow page rendering
  return { result: true };
}

// Todo:
// - [X] Add unit tests
// - [X] Add page with conditions in JSON
// - [X] Add logic on the page handler to evaluate conditions (search for `// TODO: Conditional logic comes here`)
// - [X] Add logic on review and review post page handler to evaluate the conditions
// - [X] Add Functional tests for the conditions
// - [X] Add documentation for the conditions
