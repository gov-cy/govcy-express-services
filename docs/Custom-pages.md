# ✨ Custom pages feature
The **Custom pages** feature allows developers to code service-specific custom pages that exist outside the standard Express Services JSON configuration.  

These pages can collect data, display conditional content, and inject custom sections into the **review** and **email** stages of the service flow.

## What do custom pages get out of the framework
With the custom pages feature, developers can define **pages** and **routes** on an express **service**. On these pages the following apply out of the box: 
- Login requirement
- User policy requirement
- Any service eligibility checks
- Csrf protection on POST
- Generic error page on errors

The developers can also choose to:
- store values in the session to be submitted via the submission API
- define where and what the users sees in the `review` page
- define errors regarding the custom page in the `review` page 
- define what the user receives the `email`

## What the framework expects from custom pages

- Every custom page **must be defined** at startup using `defineCustomPages(app, siteId, pageUrl, ...)`.
- Custom pages are **not** automatically discovered, they must be registered explicitly.
- Each page must specify on **start up**:
    - `pageTitle`: multilingual object for display in review and email
    - `insertAfterPageUrl`: the page **after which** this custom page will appear
    - `summaryElements`, `errors`, and `email` are managed dynamically in session
	    - **NOTE**: Usually a default `required` error must be defined on start up. This will ensure that the when the users try to submit in the “Check your answers” review page, they get an error message to complete an action.
    - `taskStatus` *(optional)*: initial task-list status (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`). Defaults to `NOT_STARTED`.
    - `extraProps` extra property stored in the session to be used by the developers as they wish
- During **runtime**, developers are responsible for setting:
    - `data`: data to include in submission, using the `setCustomPageData` function
    - `summaryElements`: what appears in the “Check your answers” review page, using the `setCustomPageSummaryElements` function
    - `email`: array of [`dsf-email-templates`](https://github.com/gov-cy/dsf-email-templates) components for the submission confirmation email, using the `setCustomPageEmail`
    - `errors`: errors that appear in the  “Check your answers” review page. Developers can use the `addCustomPageError` function to add an error, or the `clearCustomPageErrors` to clear the errors
    - `taskStatus`: call `setCustomPageTaskStatus` whenever custom logic progresses so task-list pages show the right status.
## Available methods

| Method                                                                                                                                           | Purpose                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `defineCustomPages(store, siteId, pageUrl, pageTitle, insertAfterSummary, insertAfterPageUrl, errors, summaryElements, summaryHtml, taskStatus, extraProps)` | Registers a custom page definition in `app`. Must be called once at startup.              |
| `getCustomPageDefinition(store, siteId, pageUrl)`                                                                                                | Retrieves the custom page definition for a given siteId and pageUrl                       |
| `resetCustomPages(configStore, store, siteId)`                                                                                                   | Resets per-session data from the global definitions.                                      |
| `setCustomPageData(store, siteId, pageUrl, dataObject)`                                                                                          | Sets or replaces the data object used during submission.                                  |
| `setCustomPageSummaryElements(store, siteId, pageUrl, summaryElements)`                                                                          | Sets what appears in the review page summary.                                             |
| `clearCustomPageErrors(store, siteId, pageUrl)`                                                                                                  | Clears validation errors.                                                                 |
| `addCustomPageError(store, siteId, pageUrl, errorId, errorTextObject)`                                                                           | Adds a validation error.                                                                  |
| `setCustomPageEmail(store, siteId, pageUrl, arrayOfEmailObjects)`                                                                                | Defines email sections for the confirmation email using `dsf-email-templates` components. |
| `setCustomPageProperty(store, siteId, pageUrl, property, value, isDefinition = false)`                                                           | Sets a custom property on a given custom page definition or instance                      |
| `getCustomPageProperty(store, siteId, pageUrl, property, isDefinition = false)`                                                                  | Gets a custom property from a given custom page definition or instance.                   |
| `setCustomPageTaskStatus(store, siteId, pageUrl, statusKey)`                                                                                     | Persists the current task status (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`) for task lists |
| `getCustomPageTaskStatus(store, siteId, pageUrl)`                                                                                                | Reads the stored task status (defaults to `NOT_STARTED`)                                   |

### Task list integration

When a custom page URL is included in a task-list configuration, the task-list middleware checks `req.session.siteData[siteId].customPages[pageUrl].taskStatus`. You can:

1. Provide an initial value during `defineCustomPages(..., taskStatus)` (defaults to `NOT_STARTED`).
2. Update the value at runtime:
   ```js
   setCustomPageTaskStatus(req.session, "cso", "/cso/custom", "COMPLETED");
   ```

Statuses are limited to `NOT_STARTED`, `IN_PROGRESS`, or `COMPLETED`. If an invalid value is provided, it falls back to `NOT_STARTED`.

---

## Example

Below is a practical example of a custom **Declarations** page added to an existing service.

```js
import initializeGovCyExpressService from '@gov-cy/govcy-express-services';
import {
    defineCustomPages, resetCustomPages,
    clearCustomPageErrors, addCustomPageError,
    setCustomPageData, setCustomPageSummaryElements,
    setCustomPageEmail, getCustomPageProperty, setCustomPageProperty
} from '@gov-cy/govcy-express-services/customPages';

// Initialize the service
const service = initializeGovCyExpressService({
    beforeMount({ siteRoute, app }) {

        // ==========================================================
        // 1️⃣ DEFINE GLOBAL CUSTOM PAGE CONFIGS (once per app)
        // ==========================================================
        defineCustomPages(
            app, // <-- using app as store (global config)
            "cso", // siteId
            "/cso/custom", // pageUrl
            { en: "My custom section", el: "Προσαρμοσμένη ενότητα" }, // pageTitle
            "qualifications",     // insertAfterPageUrl
            [                         // errors
                {
                    id: "custom-error",
                    text: {
                        en: "This is a custom error custom",
                        el: "Αυτή ειναι ενα προσαρμοσμένη σφαλμα custom",
                    }
                }
            ],
            [     // summaryElements  
                {
                    key:
                    {
                        en: "Extra value",
                        el: "Πρόσθετη τιμή"
                    },
                    value: []
                }
            ],
            false,
            { // other custom properties if needed like nextPage or initial data
                nextPage: "/cso/memberships", // custom property nextPage. Not needed by Express but useful for the custom logic
                data : // custom initial data. Useful when you need the data model to be standard or pre-populated
                { 
                    something: "",
                }  
             }
        );

        // ==========================================================
        // 2️⃣ MIDDLEWARE: SET UP SESSION DATA FROM GLOBAL DEFINITIONS
        // ==========================================================
        app.use((req, res, next) => {
            // Initialize session data for custom pages
            req.session.siteData ??= {};
            req.session.siteData["cso"] ??= {};

            // Reset session copies if missing (first visit)
            if (!req.session.siteData["cso"].customPages) {
                resetCustomPages(app, req.session, "cso"); // 🔁 deep copy from app to session
                req.session.save((err) => {
                    if (err) console.error("⚠️ Error initializing customPages:", err);
                });
            }

            next();
        });

        // ==========================================================
        // 3️⃣ CUSTOM ROUTES (still per-user)
        // ==========================================================

        // GET `/cso/custom`
        siteRoute("cso", "get", "/cso/custom", (req, res) => {

            // Render the custom page using the session data
            // It is important for POST to add the csrfToken and to pass on the route query parameter
            res.send(`<form action="/cso/custom${(req.query.route === "review")?"?route=review":""}" method="post">
                 custom for ${req.params.siteId}
                 <input type="hidden" name="_csrf" value="${req.csrfToken()}">
                <button type="submit">Submit custom page</button>
            </form>`);

        });

        // POST `/cso/custom`
        siteRoute("cso", "post", "/cso/custom", (req, res) => {

            // Update custom page `data` dynamically`
            setCustomPageData(req.session, "cso", "/cso/custom", {
                something: "123",
            });

            // Update `summary elements` dynamically (example)
            setCustomPageSummaryElements(req.session, "cso", "/cso/custom",
                [
                    {
                        key: {
                            en: "Extra value",
                            el: "Πρόσθετη τιμή"
                        },
                        value: [
                            {
                                element: "textElement",
                                params: {
                                    text: {
                                        en: "123 Changed",
                                        el: "123 Αλλάχθηκε"
                                    },
                                    type: "span",
                                    showNewLine: true,
                                }
                            }
                        ]
                    }
                ]);

            // Update the custom page `email` 
            setCustomPageEmail(req.session, "cso", "/cso/custom", [
                {
                    component: "bodyKeyValue",
                    params: {
                        type: "ul",
                        items: [
                            { key: "Extra value", value: "123" },
                            { key: "Priority level", value: "High" },
                        ],
                    },
                }
            ]);

            // clear any previous errors
            clearCustomPageErrors(req.session, "cso", "/cso/custom");

            // Update task status
            setCustomPageTaskStatus(req.session, "cso", "/cso/custom", "COMPLETED");
            
            // Add a custom error
            // addCustomPageError(req.session, "cso", "/cso/custom", {
            //     id: "custom-error",
            //     text: {
            //         en: "This is a custom error custom",
            //         el: "Αυτή ειναι ενα προσαρμοσμένη σφαλμα custom",
            //     }
            // });

            //if route is review, redirect to review page else go to nextPage property
            if (req.query.route === "review") {
                res.redirect("/cso/review");
                return;
            } else {
                //example of using custom property nextPage
                res.redirect(getCustomPageProperty(req.session, "cso", "/cso/custom", "nextPage", false));
                return;
            }
        });


        // ==========================================================
    },
});


// Start the server
service.startServer();

```
