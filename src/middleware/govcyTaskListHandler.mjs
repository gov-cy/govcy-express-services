import { computeTaskListStatus } from "../utils/govcyTaskList.mjs";
import * as govcyResources from "../resources/govcyResources.mjs";
import * as dataLayer from "../utils/govcyDataLayer.mjs";
import { logger } from "../utils/govcyLogger.mjs";

// The CSS classes for each task status
const STATUS_TAG_CLASSES = {
    NOT_STARTED: "govcy-tag-gray",
    IN_PROGRESS: "govcy-tag-cyan",
    COMPLETED: "",
    SKIPPED: "govcy-tag-gray"
};

/**
 * Task list GET middleware – mirrors the bespoke Update My Details handler, but
 * instead of rebuilding the UMD template it composes a light-weight renderer
 * template that shows: optional top elements, a localized overall status
 * summary, the GOV.CY taskList element, and a continue button.
 *
 * @param {object} req Express request object
 * @param {object} res Express response object
 * @param {Function} next Express next callback
 * @param {object} page Task list page configuration
 * @param {object} service Service data (req.serviceData)
 */
export function govcyTaskListHandler(req, res, next, page, service) {
    try {
        const { siteId, pageUrl } = req.params;
        const lang = req.globalLang || service?.site?.lang || "el";
        // Handle the route
        const route = req.query?.route === "review" ? "review" : "";
        
        const taskListConfig = page?.taskList || {};
        const taskPages = Array.isArray(taskListConfig.taskPages) ? taskListConfig.taskPages : [];
        const showSkippedTasks = taskListConfig.showSkippedTasks === true;

        // Compute task statuses and overall summary using the same logic as review
        const summary = computeTaskListStatus(req, siteId, service, taskPages);

        // Start with a simple form scaffold and progressively append renderer elements
        const pageTemplate = buildBaseTemplate(req, siteId, page, route);
        const formElements = pageTemplate.sections[0].elements[0].params.elements;

        // Surface any POST validation errors that were stored in the session
        const validationErrors = dataLayer.getPageValidationErrors(req.session, siteId, pageUrl);
        if (validationErrors?.errorSummary?.length > 0) {
            formElements.push(
                govcyResources.errorSummary(validationErrors.errorSummary, {
                    body: validationErrors.body,
                    linkToContinue: validationErrors.linkToContinue
                })
            );
        }

        // Allow services to prepend arbitrary content before the status table
        if (Array.isArray(taskListConfig.topElements) && taskListConfig.topElements.length > 0) {
            formElements.push(...deepClone(taskListConfig.topElements));
        }

        // High-level status summary (localized tag + completion counter)
        formElements.push(buildOverallStatusSection(summary, showSkippedTasks));

        // Converts the raw computeTaskListStatus output into renderer taskList rows
        const taskItems = buildTaskListItems({
            tasks: summary.tasks,
            siteId,
            lang,
            route,
            showSkippedTasks
        });

        if (taskItems.length > 0) {
            // Render the GOV.CY task list component with per-row tags
            formElements.push({
                element: "taskList",
                params: {
                    id: `${pageUrl}-task-list`,
                    lang,
                    items: taskItems
                }
            });
        } else {
            // Defensive fallback if taskPages is empty/misconfigured
            formElements.push({
                element: "inset",
                params: {
                    text: govcyResources.staticResources.text.taskListEmptyState
                }
            });
        }

        // Continue button keeps navigation consistent with standard forms
        formElements.push(buildContinueButton(taskListConfig));

        if (taskListConfig.hasBackLink) {
            // Optional backlink replicates the pattern used in UMD/multipleThings
            pageTemplate.sections.unshift({
                name: "beforeMain",
                elements: [{ element: "backLink", params: {} }]
            });
        }

        req.processedPage = {
            pageData: {
                site: service?.site,
                pageData: {
                    title: page?.pageData?.title,
                    layout: page?.pageData?.layout || "layouts/govcyBase.njk",
                    mainLayout: page?.pageData?.mainLayout || "two-third"
                }
            },
            pageTemplate
        };

        return next();
    } catch (error) {
        logger.error("Failed to render task list page", {
            siteId: req.params?.siteId,
            pageUrl: req.params?.pageUrl,
            message: error?.message
        });
        return next(error);
    }
}

/**
 * Returns a minimal page template with a single <form> element. The caller will
 * append the sections/elements for errors, headers, and task lists.
 *
 * @param {object} req Express request
 * @param {string} siteId Site identifier
 * @param {object} page Page configuration
 * @param {string} route Optional review route flag
 * @returns {object} Renderer page template scaffold
 */
function buildBaseTemplate(req, siteId, page, route) {
    return {
        sections: [
            {
                name: "main",
                elements: [
                    {
                        element: "form",
                        params: {
                            action: govcyResources.constructPageUrl(siteId, page?.pageData?.url, route),
                            method: "POST",
                            elements: [govcyResources.csrfTokenInput(req.csrfToken())]
                        }
                    }
                ]
            }
        ]
    };
}

/**
 * Creates the HTML block that sits above the task list, showing the localized
 * overall status and how many tasks are complete. The GOV.CY renderer does not
 * have this element pre-built yet, so we emit it via htmlElement.
 *
 * @param {{status:string,tasks:Array}} summary Result from computeTaskListStatus
 * @param {boolean} showSkippedTasks Whether skipped rows are visible to users
 * @returns {object} htmlElement renderer object
 */
function buildOverallStatusSection(summary, showSkippedTasks) {
    const statusKey = summary?.status || "NOT_STARTED";
    // get localized status
    const localizedStatus = govcyResources.staticResources.text.taskListStatus[statusKey] ||
        govcyResources.staticResources.text.taskListStatus.NOT_STARTED;

    // Remove SKIPPED rows when the service opted not to show them
    let displayedTasks = filterDisplayedTasks(summary?.tasks || [], showSkippedTasks);
    // Count how many tasks are COMPLETED 
    let completedCount = displayedTasks.filter(task => task.status === "COMPLETED").length;
    // Count total tasks (after filtering out SKIPPED if they are hidden)
    let totalCount = displayedTasks.filter(task => task.status !== "SKIPPED").length;

    // Build completion summary text with placeholders replaced, e.g. "You have completed 2 of 5 tasks"
    const summaryTemplate = govcyResources.staticResources.text.taskListCompletionSummary;
    const summaryText = replacePlaceholders(
        summaryTemplate,
        { completed: completedCount, total: totalCount }
    );

    // Get localized overall status label
    const overallLabel = govcyResources.staticResources.text.taskListOverallLabel;

    return {
        element: "htmlElement",
        params: {
            text: {
                en: buildOverallHtml(overallLabel.en, localizedStatus.en, summaryText.en),
                el: buildOverallHtml(overallLabel.el, localizedStatus.el, summaryText.el),
                tr: buildOverallHtml(overallLabel.tr, localizedStatus.tr, summaryText.tr)
            }
        }
    };
}

function buildOverallHtml(label, statusText, summaryLine) {
    // return `<section class="govcy-mb-4">
    //     <p class="govcy-fs-6 govcy-fw-400 govcy-text-muted">${label}</p>
    //     <p class="govcy-fs-5 govcy-fw-700">${statusText}</p>
    //     <p>${summaryLine}</p>
    // </section>`;
    return `<section class="govcy-mb-4">
        <p>${summaryLine}</p>
    </section>`;
}

/**
 * Converts the raw computeTaskListStatus output into renderer taskList rows,
 * adding localized status tags, per-row links, and optional descriptions.
 *
 * @param {object} opts
 * @param {Array} opts.tasks Array of per-page status payloads
 * @param {string} opts.siteId Site identifier
 * @param {string} opts.lang Current language (used for localized URLs)
 * @param {string} opts.route Route query flag, e.g. "review"
 * @param {boolean} opts.showSkippedTasks Whether to include SKIPPED rows
 * @returns {Array} GOV.CY renderer task list items
 */
function buildTaskListItems({ tasks = [], siteId, lang, route, showSkippedTasks }) {
    const items = [];
    for (const task of tasks) {
        if (!task) continue;
        if (task.status === "SKIPPED" && !showSkippedTasks) {
            // Hidden rows still factor into overall completion but are not shown
            continue;
        }

        const statusKey = normalizeStatus(task.status);
        const statusText = statusKey === "SKIPPED"
            ? govcyResources.staticResources.text.taskListNotApplicable
            : govcyResources.staticResources.text.taskListStatus[statusKey] || govcyResources.staticResources.text.taskListStatus.NOT_STARTED;

        const title = task.title || govcyResources.staticResources.text.untitled;
        const href = statusKey === "SKIPPED" ? null : buildTaskLink(siteId, task.pageUrl, route);

        items.push({
            id: `${sanitizeId(task.pageUrl)}-task`,
            task: {
                text: title,
                ...(href ? { link: href } : {})
            },
            description: task?.description || null, // Optional copy from service config
            status: {
                text: statusText,
                classes: STATUS_TAG_CLASSES[statusKey]
            }
        });
    }
    return items;
}

/**
 * Builds the primary button element. Services can override the label via
 * taskList.continueButtonText; otherwise the standard Continue copy is used.
 *
 * @param {object} taskListConfig Task list config block
 * @returns {object} button renderer element
 */
function buildContinueButton(taskListConfig) {
    const configuredText = taskListConfig?.continueButtonText;
    let textObject = govcyResources.staticResources.text.continue;
    if (configuredText) {
        if (typeof configuredText === "string") {
            textObject = {
                el: configuredText,
                en: configuredText,
                tr: configuredText
            };
        } else if (typeof configuredText === "object") {
            textObject = { ...textObject, ...configuredText };
        }
    }

    return {
        element: "button",
        params: {
            variant: "primary",
            type: "submit",
            text: textObject
        }
    };
}

/**
 * Removes SKIPPED rows when the service opted not to show them. This ensures
 * the completion summary only counts the rows the user can see.
 *
 * @param {Array} tasks Raw tasks array
 * @param {boolean} showSkippedTasks Whether to include skipped rows
 * @returns {Array} Filtered tasks
 */
function filterDisplayedTasks(tasks, showSkippedTasks) {
    if (showSkippedTasks) {
        return tasks;
    }
    return tasks.filter(task => task.status !== "SKIPPED");
}

/**
 * Replaces {{completed}} and {{total}} placeholders while preserving the
 * multilingual structure of the static resource definition.
 *
 * @param {object} templateObj Multilingual template object
 * @param {{completed:number,total:number}} values Replacement values
 * @returns {object} Multilingual object with replacements applied
 */
function replacePlaceholders(templateObj, values) {
    const build = (text) => {
        if (typeof text !== "string") return "";
        return text
            .replace("{{completed}}", values.completed)
            .replace("{{total}}", values.total);
    };
    return {
        en: build(templateObj?.en || templateObj?.el || templateObj?.tr || ""),
        el: build(templateObj?.el || templateObj?.en || templateObj?.tr || ""),
        tr: build(templateObj?.tr || templateObj?.en || templateObj?.el || "")
    };
}

/**
 * Generates the hyperlink for a task row. Custom URLs (starting with /) are
 * preserved; service-relative URLs go through constructPageUrl so language and
 * review routes behave like normal navigation.
 *
 * @param {string} siteId Site identifier
 * @param {string} pageUrl Page URL from the task config
 * @param {string} route Optional route query
 * @returns {string|null} Resolved href or null when no link should be shown
 */
function buildTaskLink(siteId, pageUrl, route) {
    if (!pageUrl) return null;
    if (pageUrl.startsWith("/")) {
        const hasQuery = pageUrl.includes("?");
        if (!route) return pageUrl;
        return `${pageUrl}${hasQuery ? "&" : "?"}route=${route}`;
    }
    return govcyResources.constructPageUrl(siteId, pageUrl, route);
}

/**
 * Normalizes a pageUrl into a DOM-friendly ID to satisfy renderer requirements.
 *
 * @param {string} pageUrl Page URL
 * @returns {string} Sanitized ID string
 */
function sanitizeId(pageUrl = "") {
    return pageUrl
        .replace(/^\//, "")
        .replace(/[^a-zA-Z0-9-_]/g, "-");
}

/**
 * Normalizes status strings so renderer logic can rely on a constrained set of
 * values. Unknown values revert to NOT_STARTED for safety.
 *
 * @param {string} statusKey Raw status key
 * @returns {string} Normalized status constant
 */
function normalizeStatus(statusKey = "") {
    const upper = (statusKey || "").toUpperCase();
    if (["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "SKIPPED"].includes(upper)) {
        return upper;
    }
    return "NOT_STARTED";
}

/**
 * Helper for cloning config snippets before injecting them in the template.
 * Using JSON stringify/parse is fine here because the config only contains
 * simple data structures supported by the renderer schema.
 *
 * @param {*} value Serializable value
 * @returns {*} Deep copy of the value
 */
function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}
