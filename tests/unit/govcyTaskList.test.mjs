import { expect } from "chai";
import { computePageTaskStatus, computeTaskListStatus } from "../../src/utils/govcyTaskList.mjs";
import * as dataLayer from "../../src/utils/govcyDataLayer.mjs";
import { setCustomPageTaskStatus } from "../../src/utils/govcyCustomPages.mjs";

const NORMAL_URL = "normal-page";
const MULTI_URL = "multi-page";
const UMD_URL = "umd-page";
const SKIP_URL = "skipped-page";
const TASKLIST_URL = "task-list-hub";

describe("computePageTaskStatus", () => {
    let req;
    let service;
    const siteId = "tasklist";

    beforeEach(() => {
        req = {
            session: {},
            globalLang: "en",
            query: {},
            csrfToken: () => "csrf"
        };

        service = {
            site: {
                id: siteId,
                lang: "en",
                languages: [{ code: "en" }]
            },
            pages: [
                buildNormalPage(),
                buildMultipleThingsPage(),
                buildUpdateMyDetailsPage(),
                buildSkippedPage(),
                buildTaskListPage()
            ]
        };

        dataLayer.initializeSiteData(req.session, siteId);
    });

    it("returns NOT_STARTED for untouched normal page", () => {
        const result = computePageTaskStatus(req, siteId, service, NORMAL_URL);
        expect(result.status).to.equal("NOT_STARTED");
        expect(result.hasData).to.be.false;
    });

    it("returns IN_PROGRESS when normal page has invalid data", () => {
        dataLayer.storePageData(req.session, siteId, NORMAL_URL, { fullName: "" });
        const result = computePageTaskStatus(req, siteId, service, NORMAL_URL);
        expect(result.status).to.equal("IN_PROGRESS");
        expect(result.hasData).to.be.true;
    });

    it("returns COMPLETED when normal page validates", () => {
        dataLayer.storePageData(req.session, siteId, NORMAL_URL, { fullName: "Ada Lovelace" });
        const result = computePageTaskStatus(req, siteId, service, NORMAL_URL);
        expect(result.status).to.equal("COMPLETED");
    });

    it("handles multipleThings pages", () => {
        // Not started
        let result = computePageTaskStatus(req, siteId, service, MULTI_URL);
        expect(result.status).to.equal("NOT_STARTED");

        // In progress: one entry with missing data
        dataLayer.storePageData(req.session, siteId, MULTI_URL, [{ itemName: "" }]);
        result = computePageTaskStatus(req, siteId, service, MULTI_URL);
        expect(result.status).to.equal("IN_PROGRESS");

        // Completed
        dataLayer.storePageData(req.session, siteId, MULTI_URL, [{ itemName: "Passport" }]);
        result = computePageTaskStatus(req, siteId, service, MULTI_URL);
        expect(result.status).to.equal("COMPLETED");
    });

    it("handles updateMyDetails pages", () => {
        // No data yet
        let result = computePageTaskStatus(req, siteId, service, UMD_URL);
        expect(result.status).to.equal("NOT_STARTED");

        // Invalid (required field empty)
        dataLayer.storePageData(req.session, siteId, UMD_URL, { fullName: "" });
        result = computePageTaskStatus(req, siteId, service, UMD_URL);
        expect(result.status).to.equal("IN_PROGRESS");

        // Valid data
        dataLayer.storePageData(req.session, siteId, UMD_URL, { fullName: "User Name" });
        result = computePageTaskStatus(req, siteId, service, UMD_URL);
        expect(result.status).to.equal("COMPLETED");
    });

    it("returns SKIPPED when page conditions redirect", () => {
        const result = computePageTaskStatus(req, siteId, service, SKIP_URL);
        expect(result.status).to.equal("SKIPPED");
        expect(result.hasData).to.be.false;
    });

    it("throws for unknown pages", () => {
        expect(() => computePageTaskStatus(req, siteId, service, "missing"))
            .to.throw(/Page not found/i);
    });

    it("returns status for custom pages stored in session", () => {
        const customUrl = "/custom-info";
        req.session.siteData[siteId].customPages = {
            [customUrl]: {
                pageTitle: { en: "Custom Info" },
                taskStatus: "IN_PROGRESS"
            }
        };

        setCustomPageTaskStatus(req.session, siteId, customUrl, "completed");
        const result = computePageTaskStatus(req, siteId, service, customUrl);

        expect(result.type).to.equal("custom");
        expect(result.status).to.equal("COMPLETED");
        expect(result.title).to.deep.equal({ en: "Custom Info" });
    });

    it("handles task list type pages by aggregating child statuses", () => {
        const result = computePageTaskStatus(req, siteId, service, TASKLIST_URL);
        expect(result.type).to.equal("taskList");
        expect(result.status).to.equal("NOT_STARTED");
        expect(result.taskList.status).to.equal("NOT_STARTED");
        expect(result.taskList.tasks).to.have.lengthOf(2);

        dataLayer.storePageData(req.session, siteId, NORMAL_URL, { fullName: "Ada" });
        dataLayer.storePageData(req.session, siteId, MULTI_URL, [{ itemName: "Doc" }]);
        const updated = computePageTaskStatus(req, siteId, service, TASKLIST_URL);
        expect(updated.status).to.equal("COMPLETED");
        expect(updated.taskList.status).to.equal("COMPLETED");
    });

    it("throws when a task list references itself", () => {
        service.pages.push({
            pageData: {
                url: "looping-tasklist",
                title: { en: "Loop" }
            },
            taskList: {
                taskPages: ["looping-tasklist"]
            },
            pageTemplate: { sections: [] }
        });

        expect(() => computePageTaskStatus(req, siteId, service, "looping-tasklist"))
            .to.throw(/circular reference/i);
    });

    it("treats optional multipleThings as complete once posted", () => {
        const page = service.pages.find(p => p.pageData.url === MULTI_URL);
        page.multipleThings.min = 0;
        dataLayer.setPagePosted(req.session, siteId, MULTI_URL, true);
        const result = computePageTaskStatus(req, siteId, service, MULTI_URL);
        expect(result.status).to.equal("COMPLETED");
    });

    it("computes NOT_STARTED task list status when all tasks untouched", () => {
        const list = [NORMAL_URL, MULTI_URL];
        const summary = computeTaskListStatus(req, siteId, service, list);
        expect(summary.status).to.equal("NOT_STARTED");
        expect(summary.tasks).to.have.lengthOf(list.length);
    });

    it("computes IN_PROGRESS task list status when some tasks completed", () => {
        dataLayer.storePageData(req.session, siteId, NORMAL_URL, { fullName: "Ada" });
        const summary = computeTaskListStatus(req, siteId, service, [NORMAL_URL, MULTI_URL]);
        expect(summary.status).to.equal("IN_PROGRESS");
    });

    it("computes COMPLETED task list status when all tasks pass validation", () => {
        dataLayer.storePageData(req.session, siteId, NORMAL_URL, { fullName: "Ada" });
        dataLayer.storePageData(req.session, siteId, MULTI_URL, [{ itemName: "Doc" }]);
        const summary = computeTaskListStatus(req, siteId, service, [NORMAL_URL, MULTI_URL]);
        expect(summary.status).to.equal("COMPLETED");
    });
});

function buildNormalPage() {
    return {
        pageData: {
            url: NORMAL_URL,
            title: { en: "Normal" }
        },
        pageTemplate: {
            sections: [
                {
                    elements: [
                        {
                            element: "form",
                            params: {
                                elements: [createRequiredTextInput("fullName")]
                            }
                        }
                    ]
                }
            ]
        }
    };
}

function buildMultipleThingsPage() {
    return {
        pageData: {
            url: MULTI_URL,
            title: { en: "Multiple" }
        },
        multipleThings: {
            min: 1,
            max: 5,
            listPage: { title: { en: "Things" } }
        },
        pageTemplate: {
            sections: [
                {
                    elements: [
                        {
                            element: "form",
                            params: {
                                elements: [createRequiredTextInput("itemName")]
                            }
                        }
                    ]
                }
            ]
        }
    };
}

function buildUpdateMyDetailsPage() {
    return {
        pageData: {
            url: UMD_URL,
            title: { en: "UMD" }
        },
        updateMyDetails: {
            scope: ["fullName"],
            hasBackLink: false
        },
        pageTemplate: {
            sections: []
        }
    };
}

function buildSkippedPage() {
    return {
        pageData: {
            url: SKIP_URL,
            title: { en: "Skipped" },
            conditions: [
                {
                    expression: "true",
                    redirect: "index"
                }
            ]
        },
        pageTemplate: { sections: [] }
    };
}

function buildTaskListPage() {
    return {
        pageData: {
            url: TASKLIST_URL,
            title: { en: "Task Hub" }
        },
        taskList: {
            taskPages: [NORMAL_URL, MULTI_URL]
        },
        pageTemplate: { sections: [] }
    };
}

function createRequiredTextInput(id) {
    return {
        element: "textInput",
        params: {
            id,
            name: id,
            label: { en: id }
        },
        validations: [
            {
                check: "required",
                params: {
                    checkValue: "",
                    message: { en: `Enter ${id}` }
                }
            }
        ]
    };
}
