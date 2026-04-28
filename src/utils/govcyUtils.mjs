/**
 * Helper function to handle errors in middleware.
 * Creates an error object and passes it to the next middleware.
 *
 * @param {string} message - The error message.
 * @param {number} status - The HTTP status code.
 * @param {function} next - The Express `next` function.
 */
export function handleMiddlewareError(message, status, next) {
    const error = new Error(message);
    error.status = status;
    return next(error);
}

/**
 * Helper function to format a date in the format D/M/YYYY.
 * 
 * @param {string} dateString - The date string in the format YYYY-MM-DD.
 * @returns {string} The formatted date in the format D/M/YYYY.
 */
export function dateStringISOtoDMY(dateString) {
  if (typeof dateString !== "string" || !dateString.trim()) return "";
  const [year, month, day] = dateString.trim().split("-");
  return `${parseInt(day)}/${parseInt(month)}/${year}`;
}

/**
 * Marks the active navigation item in renderer page data based on the current request path.
 *
 * @param {object} req - Express request object.
 * @param {object} pageData - Renderer page data object containing `site.navigation.items`.
 * @returns {void}
 */
export function markCurrentNavigation(req, pageData) {
    const navItems = pageData?.site?.navigation?.items;
    if (!Array.isArray(navItems) || navItems.length === 0) return;

    // Use req.path as base and keep case-sensitive behavior (do not lowercase).
    const reqPath = typeof req?.path === "string" ? req.path : "";
    if (!reqPath) return;

    // Normalize trailing slash so /site/page and /site/page/ are treated as the same path (root "/" remains "/").
    const normalizePath = (pathValue) => {
        if (typeof pathValue !== "string" || pathValue === "") return "";
        return pathValue.length > 1 && pathValue.endsWith("/") ? pathValue.slice(0, -1) : pathValue;
    };

    // Reset all navigation items current flag to false before we mark the active one.
    navItems.forEach((item) => {
        if (item && typeof item === "object") {
            item.current = false;
        }
    });

    let currentPath = normalizePath(reqPath);

    // First try exact matching against navigation item href/link values.
    const findExactMatchIndex = (pathValue) =>
        navItems.findIndex((item) => {
            // Resolve navigation path from `href` first (renderer schema), then fallback to `link` for compatibility.
            const rawNavPath = item?.href ?? item?.link;

            // Support multilingual href objects by picking request/global language first, then site language, then common fallbacks.
            const navPath = (rawNavPath && typeof rawNavPath === "object")
                ? (rawNavPath?.[req?.globalLang] ??
                    rawNavPath?.[pageData?.site?.lang] ??
                    rawNavPath?.el ??
                    rawNavPath?.en ??
                    rawNavPath?.tr ??
                    Object.values(rawNavPath)[0])
                : rawNavPath;

            return normalizePath(navPath) === pathValue;
        });

    // Build match candidates so "/:siteId" and "/:siteId/index" are treated as aliases for home.
    const matchCandidates = [currentPath];
    const siteOnlyMatch = currentPath.match(/^\/([^/]+)$/);
    const siteIndexMatch = currentPath.match(/^\/([^/]+)\/index$/);
    if (siteOnlyMatch) {
        matchCandidates.push(`/${siteOnlyMatch[1]}/index`);
    } else if (siteIndexMatch) {
        matchCandidates.push(`/${siteIndexMatch[1]}`);
    }

    let matchIndex = -1;
    for (const candidate of matchCandidates) {
        matchIndex = findExactMatchIndex(candidate);
        if (matchIndex !== -1) break;
    }

    // If exact match is not found, map known nested routes to the parent page path and try exact match again.
    if (matchIndex === -1) {
        const nestedMatch = currentPath.match(/^\/([^/]+)\/([^/]+)\/(multiple|delete-file|view-file|update-my-details-response)(?:\/.*)?$/);
        if (nestedMatch) {
            const [, siteId, pageUrl] = nestedMatch;
            currentPath = `/${siteId}/${pageUrl}`;
            matchIndex = findExactMatchIndex(currentPath);
        }
    }

    // Mark only one navigation item as current (the first deterministic match).
    if (matchIndex >= 0) {
        navItems[matchIndex].current = true;
    }
}
