import { expect } from "chai";
import sinon from "sinon";
import { govcyTaskListHandler } from "../../src/middleware/govcyTaskListHandler.mjs";

describe("govcyTaskListHandler", () => {
    let req;
    let res;
    let next;
    let service;
    let page;

    beforeEach(() => {
        req = {
            params: { siteId: "task-list", pageUrl: "task-overview" },
            query: {},
            csrfToken: () => "csrf-token",
            session: { siteData: { "task-list": { inputData: {} } } },
            globalLang: "en",
            serviceData: {}
        };
        res = {};
        next = sinon.stub();
        service = buildService();
        page = {
            pageData: {
                url: "task-overview",
                title: { en: "Overview" },
                layout: "layouts/govcyBase.njk",
                mainLayout: "two-third"
            },
            taskList: {
                taskPages: ["book-title", "authors", "illustrators"],
                topElements: [
                    {
                        element: "textElement",
                        params: {
                            type: "h1",
                            text: {
                                en: "Complete your sections",
                                el: "Ολοκληρώστε τις ενότητες",
                                tr: "Bölümleri tamamlayın"
                            }
                        }
                    }
                ],
                hasBackLink: true
            }
        };

        req.session.siteData["task-list"].inputData["task-overview"] = {};
        // Completed task
        req.session.siteData["task-list"].inputData["book-title"] = {
            formData: { "book-title-field": "My title" }
        };
        // No data for authors -> NOT_STARTED
        // Illustrators skipped via condition
    });

    it("builds a task list form with summary and continue button", async () => {
        await govcyTaskListHandler(req, res, next, page, service);

        expect(next.calledOnce).to.be.true;
        expect(req.processedPage).to.be.an("object");

        const { sections } = req.processedPage.pageTemplate;
        const mainSection = sections.find(section => section.name === "main");
        const form = mainSection.elements[0];
        const formElements = form.params.elements;

        expect(formElements.some(el => el.element === "htmlElement")).to.be.true;
        const taskListElement = formElements.find(el => el.element === "taskList");
        expect(taskListElement).to.exist;
        expect(taskListElement.params.items).to.have.lengthOf(2); // skipped hidden by default
        expect(JSON.stringify(taskListElement.params.items)).to.include("Book title");
        expect(JSON.stringify(formElements)).to.include("Continue");

        const beforeMain = sections.find(section => section.name === "beforeMain");
        expect(beforeMain).to.exist;
        expect(beforeMain.elements[0].element).to.equal("backLink");
    });

    it("shows skipped tasks with not-applicable tag when configured", async () => {
        page.taskList.showSkippedTasks = true;
        await govcyTaskListHandler(req, res, next, page, service);

        const taskListElement = req.processedPage.pageTemplate.sections
            .find(section => section.name === "main").elements[0].params.elements
            .find(el => el.element === "taskList");

        expect(taskListElement.params.items).to.have.lengthOf(3);
        const skippedRow = taskListElement.params.items.find(item => item.task.text.en === "Illustrators");
        expect(skippedRow.status.text.en).to.equal("Not applicable");
        expect(skippedRow.task.link).to.be.undefined;
    });

    it("renders stored validation errors at the top of the form", async () => {
        req.session.siteData["task-list"].inputData["task-overview"].validationErrors = {
            errorSummary: [
                {
                    href: "#book-title-field",
                    text: { en: "Complete Book title" }
                }
            ],
            formData: {}
        };

        await govcyTaskListHandler(req, res, next, page, service);

        const mainSection = req.processedPage.pageTemplate.sections.find(section => section.name === "main");
        const formElements = mainSection.elements[0].params.elements;
        const errorIndex = formElements.findIndex(el => el.element === "errorSummary");
        expect(errorIndex).to.be.greaterThan(0);
    });
});

function buildService() {
    const makePage = (url, title) => ({
        pageData: {
            url,
            title: { en: title },
            layout: "layouts/govcyBase.njk",
            mainLayout: "two-third"
        },
        pageTemplate: {
            sections: [
                {
                    name: "main",
                    elements: [
                        {
                            element: "form",
                            params: {
                                elements: [
                                    {
                                        element: "textInput",
                                        params: {
                                            id: `${url}-field`,
                                            name: `${url}-field`,
                                            label: { en: title },
                                            validations: [
                                                {
                                                    check: "required",
                                                    params: {
                                                        checkValue: "",
                                                        message: { en: `${title} required` }
                                                    }
                                                }
                                            ]
                                        }
                                    },
                                    { element: "button", params: { text: { en: "Continue" } } }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
    });

    const skippedPage = makePage("illustrators", "Illustrators");
    skippedPage.pageData.conditions = [
        { expression: "true", redirect: "book-title" }
    ];

    return {
        site: { id: "task-list", lang: "en" },
        pages: [
            makePage("book-title", "Book title"),
            makePage("authors", "Authors"),
            skippedPage
        ]
    };
}
