import { expect } from "chai";
import { renderGovcyPage } from "../../src/middleware/govcyPageRender.mjs";

describe("renderGovcyPage", () => {
    it("1. should render HTML and include afterBody elements", () => {
        const req = {
            session: {
                user: {
                    name: "Test User"
                }
            },
            processedPage: {
                pageTemplate: {
                    sections: [
                        {
                            name: "main",
                            elements: [
                                {
                                    element: "textElement",
                                    params: {
                                        type: "h1",
                                        text: {
                                            en: "Hello from GovCy",
                                            el: "Χαίρετε από το GovCy"
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                },
                pageData: {
                    site: {
                        lang: "en"
                    },
                    pageData: {
                        title: {
                            en: "Test Page",
                            el: "Σελίδα Δοκιμής"
                        }
                    }
                }
            }
        };

        let renderedHtml = "";
        const res = {
            send: (html) => {
                renderedHtml = html;
            }
        };

        const handler = renderGovcyPage();
        handler(req, res);

        expect(renderedHtml).to.be.a("string");
        expect(renderedHtml).to.include("Hello from GovCy");
        expect(renderedHtml).to.include("govcy--loadingOverlay"); // from afterBody
        expect(renderedHtml).to.include("govcyCompiledTemplates.browser.js"); // from afterBody
    });

    it("2. should throw error if processedPage is missing", () => {
        const req = {
            session: {
                user: {
                    name: "Test User"
                }
            }
        }; // no processedPage
        const res = {
            send: () => {
                throw new Error("res.send should not be called");
            }
        };

        const handler = renderGovcyPage();

        expect(() => handler(req, res)).to.throw(TypeError, /Cannot read properties of undefined/);
    });

    it("3. should render correctly in Greek (lang: 'el')", () => {
        const req = {
            session: {
                user: {
                    name: "Test User"
                }
            },
            processedPage: {
                pageData: {
                    site: {
                        lang: "el",
                        title: { el: "Υπηρεσία Δοκιμή", en: "Test Service" }
                    },
                    pageData: {
                        title: { el: "Καλώς Ήρθατε", en: "Welcome" },
                        layout: "layouts/govcyBase.njk",
                        mainLayout: "two-third"
                    }
                },
                pageTemplate: {
                    sections: [
                        {
                            name: "main",
                            elements: [
                                {
                                    element: "textElement",
                                    params: {
                                        type: "h1",
                                        text: {
                                            el: "Καλώς Ήρθατε στη Δοκιμαστική Υπηρεσία",
                                            en: "Welcome to the Test Service"
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                }
            }
        };

        let sentHtml = "";
        const res = {
            send: (html) => {
                sentHtml = html;
            }
        };

        const handler = renderGovcyPage();
        handler(req, res);

        expect(sentHtml).to.be.a("string");
        expect(sentHtml).to.include("Καλώς Ήρθατε στη Δοκιμαστική Υπηρεσία");
        expect(sentHtml).to.include("govcy--loadingOverlay"); // from afterBody
    });

    it("4. should render user name section when user is logged in", () => {
        const req = {
            session: {
                user: {
                    name: "Test User"
                }
            },
            processedPage: {
                pageTemplate: {
                    sections: [
                        {
                            name: "main",
                            elements: [
                                {
                                    element: "textElement",
                                    params: {
                                        type: "h1",
                                        text: {
                                            en: "Welcome",
                                            el: "Καλώς Ήρθατε"
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                },
                pageData: {
                    site: {
                        lang: "en"
                    },
                    pageData: {
                        title: {
                            en: "Test Page",
                            el: "Σελίδα Δοκιμής"
                        }
                    }
                }
            }
        };

        let renderedHtml = "";
        const res = {
            send: (html) => {
                renderedHtml = html;
            }
        };

        const handler = renderGovcyPage();
        handler(req, res);

        expect(renderedHtml).to.be.a("string");
        expect(renderedHtml).to.include("Test User"); // Confirm user name is rendered
        expect(renderedHtml).to.include("govcy--loadingOverlay"); // Still confirm other elements
    });


});
