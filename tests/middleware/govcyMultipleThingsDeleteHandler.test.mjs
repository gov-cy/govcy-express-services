import { expect } from "chai";
import sinon from "sinon";
import { govcyMultipleThingsDeletePageHandler, govcyMultipleThingsDeletePostHandler } from "../../src/middleware/govcyMultipleThingsDeleteHandler.mjs";
import * as dataLayer from "../../src/utils/govcyDataLayer.mjs";

describe("govcyMultipleThingsDeletePageHandler & govcyMultipleThingsDeletePostHandler", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {
        siteId: "test-site",
        pageUrl: "academic-details",
        index: "0"
      },
      query: {},
      serviceData: {
        site: { name: "test-service" },
        pages: [
          {
            pageData: {
              url: "academic-details",
              title: "Academic details"
            },
            pageTemplate: { sections: [] },
            multipleThings: {
              listPage: { title: { en: "Academic details list" } },
              itemTitleTemplate: "{{title}}",
              min: 1,
              max: 5
            }
          }
        ]
      },
      session: {
        siteData: {
          "test-site": {
            inputData: {
              "academic-details": {
                formData: [
                  { title: "BSc Computer Science" },
                  { title: "MSc Computer Science" }
                ]
              }
            }
          }
        }
      },
      csrfToken: () => "mock-csrf"
    };

    res = {
      redirect: sinon.stub()
    };

    next = sinon.stub();
  });

  it("1. GET should call next and populate req.processedPage on success", async () => {
    const handler = govcyMultipleThingsDeletePageHandler();
    await handler(req, res, next);

    expect(next.calledOnce).to.be.true;
    expect(req.processedPage).to.be.an("object");

    const { pageData, pageTemplate } = req.processedPage;
    expect(pageData.pageData.title.en).to.include("BSc Computer Science");
    expect(pageTemplate.sections).to.be.an("array");
    expect(pageTemplate.sections[0].elements[0].element).to.equal("backLink");

    const form = pageTemplate.sections[1].elements.find(el => el.element === "form");
    expect(form).to.exist;
    const radios = form.params.elements.find(el => el.element === "radios");
    expect(radios).to.exist;
    expect(radios.params.legend.en).to.include("BSc Computer Science");
  });


  it("2. GET should redirect if page condition evaluates to true", async () => {
    // Inject condition directly into the page config for this test
    req.serviceData.pages[0].pageData.conditions = [
      { expression: "true", redirect: "redirect-page" }
    ];

    const handler = govcyMultipleThingsDeletePageHandler();
    await handler(req, res, next);

    expect(res.redirect.calledOnce).to.be.true;
    const redirectUrl = res.redirect.firstCall.args[0];
    expect(redirectUrl).to.include("redirect-page");
  });

  it("3. GET should error if multipleThings config is missing", async () => {
    // 🔥 Remove multipleThings config from the page
    delete req.serviceData.pages[0].multipleThings;

    const handler = govcyMultipleThingsDeletePageHandler();
    await handler(req, res, next);

    const err = next.firstCall.args[0];
    expect(err).to.be.an("error");
    expect(err.message).to.include("multipleThings config not found");
  });

  it("4. GET should error if index is invalid", async () => {
    // 🔥 Provide an invalid index (out of range)
    req.params.index = "5"; // only 1 item exists at setup

    const handler = govcyMultipleThingsDeletePageHandler();
    await handler(req, res, next);

    const err = next.firstCall.args[0];
    expect(err).to.be.an("error");
    expect(err.message).to.include("delete index not found");
  });

  it("5. GET should include validation error summary when hasError is set", async () => {
    // 🔥 Simulate query flag
    req.query.hasError = "1";

    const handler = govcyMultipleThingsDeletePageHandler();
    await handler(req, res, next);

    expect(next.calledOnce).to.be.true;

    // Grab the form element
    const formElement = req.processedPage.pageTemplate.sections[1].elements.find(
      el => el.element === "form"
    );

    const radioEl = formElement.params.elements[0];
    expect(radioEl.element).to.equal("radios");
    expect(radioEl.params.error).to.be.a("object");

    // Grab error summary
    const summarySection = req.processedPage.pageTemplate.sections[1].elements.find(
      el => el.element === "errorSummary"
    );
    expect(summarySection).to.exist;
    expect(summarySection.params.errors[0].link).to.equal("#deleteItem-option-1");
    expect(summarySection.params.errors[0].text.en).to.include("Select if you want to delete");
  });

  it("6. POST should remove item and redirect if deleteItem is 'yes'", async () => {
    // Add some initial items
    req.session.siteData["test-site"].inputData["academic-details"] = {
      formData: [
        { name: "Item 1" },
        { name: "Item 2" }
      ]
    };

    req.params.index = "0"; // delete the first item
    req.params.pageUrl = "academic-details"; // point to the correct page
    req.params.siteId = "test-site";
    req.body = { deleteItem: "yes" };

    const handler = govcyMultipleThingsDeletePostHandler();
    await handler(req, res, next);

    // Read back via dataLayer to ensure we see updated data
    const items = dataLayer.getPageData(req.session, "test-site", "academic-details");
    expect(items).to.have.lengthOf(1);
    expect(items[0].name).to.equal("Item 2");

    // Redirect to hub
    expect(res.redirect.calledOnce).to.be.true;
    const redirectUrl = res.redirect.firstCall.args[0];
    expect(redirectUrl).to.equal("/test-site/academic-details");
  });

  it("7. POST should NOT remove item and redirect if deleteItem is 'no'", async () => {
    // Add some initial items
    req.session.siteData["test-site"].inputData["academic-details"] = {
      formData: [
        { name: "Item 1" },
        { name: "Item 2" }
      ]
    };

    req.params.index = "0"; // try to delete the first item
    req.params.pageUrl = "academic-details";
    req.params.siteId = "test-site";
    req.body = { deleteItem: "no" };

    const handler = govcyMultipleThingsDeletePostHandler();
    await handler(req, res, next);

    // Items should remain unchanged
    const items = dataLayer.getPageData(req.session, "test-site", "academic-details");
    expect(items).to.have.lengthOf(2);
    expect(items[0].name).to.equal("Item 1");
    expect(items[1].name).to.equal("Item 2");

    // Redirect back to hub
    expect(res.redirect.calledOnce).to.be.true;
    const redirectUrl = res.redirect.firstCall.args[0];
    expect(redirectUrl).to.equal("/test-site/academic-details");
  });

  it("8. POST should redirect with error if deleteItem is missing or invalid", async () => {
    // Add some initial items
    req.session.siteData["test-site"].inputData["academic-details"] = {
      formData: [
        { name: "Item 1" },
        { name: "Item 2" }
      ]
    };

    req.params.index = "0";
    req.params.pageUrl = "academic-details";
    req.params.siteId = "test-site";

    // Case A: missing deleteItem
    req.body = {};
    let handler = govcyMultipleThingsDeletePostHandler();
    await handler(req, res, next);

    expect(res.redirect.calledOnce).to.be.true;
    let redirectUrl = res.redirect.firstCall.args[0];
    expect(redirectUrl).to.include("/test-site/academic-details/multiple/delete/0");
    expect(redirectUrl).to.include("hasError=1");

    // Reset stub for Case B
    res.redirect.resetHistory();

    // Case B: invalid deleteItem value
    req.body = { deleteItem: "maybe" }; // invalid
    handler = govcyMultipleThingsDeletePostHandler();
    await handler(req, res, next);

    expect(res.redirect.calledOnce).to.be.true;
    redirectUrl = res.redirect.firstCall.args[0];
    expect(redirectUrl).to.include("/test-site/academic-details/multiple/delete/0");
    expect(redirectUrl).to.include("hasError=1");

    // Items should remain unchanged
    const items = dataLayer.getPageData(req.session, "test-site", "academic-details");
    expect(items).to.have.lengthOf(2);
  });


  it("9. POST should error if index is invalid", async () => {
    // Add some initial items
    req.session.siteData["test-site"].inputData["academic-details"] = {
      formData: [
        { name: "Item 1" },
        { name: "Item 2" }
      ]
    };

    req.params.pageUrl = "academic-details";
    req.params.siteId = "test-site";

    // Case A: index too large
    req.params.index = "10";
    req.body = { deleteItem: "yes" };
    let handler = govcyMultipleThingsDeletePostHandler();
    await handler(req, res, next);

    let error = next.firstCall.args[0];
    expect(error).to.be.an("error");
    expect(error.message).to.include("delete index not found");

    // Reset for Case B
    next.resetHistory();

    // Case B: index negative
    req.params.index = "-1";
    handler = govcyMultipleThingsDeletePostHandler();
    await handler(req, res, next);

    error = next.firstCall.args[0];
    expect(error).to.be.an("error");
    expect(error.message).to.include("delete index not found");

    // Case C: index not a number
    next.resetHistory();
    req.params.index = "not-a-number";
    handler = govcyMultipleThingsDeletePostHandler();
    await handler(req, res, next);

    error = next.firstCall.args[0];
    expect(error).to.be.an("error");
    expect(error.message).to.include("delete index not found");

    // Ensure items are untouched
    const items = dataLayer.getPageData(req.session, "test-site", "academic-details");
    expect(items).to.have.lengthOf(2);
  });

  it("10. GET should error if multipleThings config is missing", async () => {
    // 🔥 Remove multipleThings config from the page
    delete req.serviceData.pages[0].multipleThings;

    // Update params to point to this page
    req.params.pageUrl = "academic-details";
    req.params.siteId = "test-site";
    req.params.index = "0";

    const handler = govcyMultipleThingsDeletePageHandler();
    await handler(req, res, next);

    const error = next.firstCall.args[0];
    expect(error).to.be.an("error");
    expect(error.message).to.include("multipleThings config not found");
  });

  it("11. GET should error if multipleThings.listPage.title is missing", async () => {
    // ✅ Ensure multipleThings exists but remove its listPage.title
    req.serviceData.pages[0].multipleThings = {
      listPage: {}, // no title
      itemTitleTemplate: "{{name}}",
      min: 1,
      max: 5
    };

    req.params.pageUrl = "academic-details";
    req.params.siteId = "test-site";
    req.params.index = "0";

    const handler = govcyMultipleThingsDeletePageHandler();
    await handler(req, res, next);

    const error = next.firstCall.args[0];
    expect(error).to.be.an("error");
    expect(error.message).to.include("multipleThings.listPage.title is required");
  });


  it("12. GET should error if multipleThings.itemTitleTemplate, min, or max are missing", async () => {
    // ✅ multipleThings defined but incomplete
    req.serviceData.pages[0].multipleThings = {
      listPage: { title: { en: "List title" } }
      // missing itemTitleTemplate, min, max
    };

    req.params.pageUrl = "academic-details";
    req.params.siteId = "test-site";
    req.params.index = "0";

    const handler = govcyMultipleThingsDeletePageHandler();
    await handler(req, res, next);

    const error = next.firstCall.args[0];
    expect(error).to.be.an("error");
    expect(error.message).to.include("multipleThings.itemTitleTemplate, .min and .max are required");
  });

  it("13. GET should redirect if page condition evaluates to true", async () => {
    // Inject condition into the page config
    req.serviceData.pages[0].pageData.conditions = [
      { expression: "true", redirect: "redirected-page" }
    ];

    req.params.pageUrl = "academic-details";
    req.params.siteId = "test-site";
    req.params.index = "0";

    const handler = govcyMultipleThingsDeletePageHandler();
    await handler(req, res, next);

    // ✅ Should not call next, should redirect
    expect(res.redirect.calledOnce).to.be.true;
    const redirectUrl = res.redirect.firstCall.args[0];
    expect(redirectUrl).to.include("redirected-page");
  });

  it("14. GET should include validation error summary when hasError is set", async () => {
  // add an item so index=0 is valid
  req.session.siteData["test-site"].inputData["academic-details"] = {
    formData: [
      { name: "Item 1" }
    ]
  };

  req.params.pageUrl = "academic-details";
  req.params.siteId = "test-site";
  req.params.index = "0";
  req.query.hasError = "1"; // 🔥 simulate error case

  const handler = govcyMultipleThingsDeletePageHandler();
  await handler(req, res, next);

  expect(next.calledOnce).to.be.true;

  // check that form element exists
  const formElement = req.processedPage.pageTemplate.sections[1].elements.find(
    el => el.element === "form"
  );
  expect(formElement).to.exist;

  // radios should have error set
  const radios = formElement.params.elements[0];
  expect(radios.element).to.equal("radios");
  expect(radios.params.error).to.be.a("object");

  // errorSummary section should be present
  const summary = req.processedPage.pageTemplate.sections[1].elements.find(
    el => el.element === "errorSummary"
  );
  expect(summary).to.exist;
  expect(summary.params.errors[0].link).to.equal("#deleteItem-option-1");
});

  it("15. POST should redirect with error if deleteItem is missing", async () => {
    // Add an item so index=0 is valid
    req.session.siteData["test-site"].inputData["academic-details"] = {
      formData: [
        { name: "Item 1" }
      ]
    };

    req.params.pageUrl = "academic-details";
    req.params.siteId = "test-site";
    req.params.index = "0";
    req.body = {}; // 🔥 no deleteItem provided

    const handler = govcyMultipleThingsDeletePostHandler();
    await handler(req, res, next);

    // Expect redirect with hasError flag
    expect(res.redirect.calledOnce).to.be.true;
    const redirectUrl = res.redirect.firstCall.args[0];
    expect(redirectUrl).to.include("hasError=1");
    expect(redirectUrl).to.include("/test-site/academic-details/multiple/delete/0");
  });

  it("16. POST should not delete item and just redirect if deleteItem is 'no'", async () => {
    // Add two items
    req.session.siteData["test-site"].inputData["academic-details"] = {
      formData: [
        { name: "Item 1" },
        { name: "Item 2" }
      ]
    };

    req.params.pageUrl = "academic-details";
    req.params.siteId = "test-site";
    req.params.index = "0";
    req.body = { deleteItem: "no" };

    const handler = govcyMultipleThingsDeletePostHandler();
    await handler(req, res, next);

    // Both items should still be there
    const items = dataLayer.getPageData(req.session, "test-site", "academic-details");
    expect(items).to.have.lengthOf(2);
    expect(items[0].name).to.equal("Item 1");
    expect(items[1].name).to.equal("Item 2");

    // Redirect to hub
    expect(res.redirect.calledOnce).to.be.true;
    const redirectUrl = res.redirect.firstCall.args[0];
    expect(redirectUrl).to.equal("/test-site/academic-details");
  });

it("17. POST should redirect if page condition evaluates to true", async () => {
  // Add some dummy items so array exists
  req.session.siteData["test-site"].inputData["academic-details"] = {
    formData: [{ name: "Item 1" }]
  };

  req.params.pageUrl = "academic-details";
  req.params.siteId = "test-site";
  req.params.index = "0";
  req.body = { deleteItem: "yes" };

  // Inject a condition that always evaluates to true
  req.serviceData.pages[0].pageData.conditions = [
    { expression: "true", redirect: "some-other-page" }
  ];

  const handler = govcyMultipleThingsDeletePostHandler();
  await handler(req, res, next);

  // Should redirect without touching items
  const items = dataLayer.getPageData(req.session, "test-site", "academic-details");
  expect(items).to.have.lengthOf(1);

  expect(res.redirect.calledOnce).to.be.true;
  const redirectUrl = res.redirect.firstCall.args[0];
  expect(redirectUrl).to.include("some-other-page");
});


it("18. POST should redirect with error if deleteItem is missing", async () => {
  // Add some items
  req.session.siteData["test-site"].inputData["academic-details"] = {
    formData: [{ name: "Item 1" }, { name: "Item 2" }]
  };

  req.params.pageUrl = "academic-details";
  req.params.siteId = "test-site";
  req.params.index = "0";
  req.body = {}; // ❌ no deleteItem field

  const handler = govcyMultipleThingsDeletePostHandler();
  await handler(req, res, next);

  // Items should remain unchanged
  const items = dataLayer.getPageData(req.session, "test-site", "academic-details");
  expect(items).to.have.lengthOf(2);

  // Redirect should include hasError=1
  expect(res.redirect.calledOnce).to.be.true;
  const redirectUrl = res.redirect.firstCall.args[0];
  expect(redirectUrl).to.include("/test-site/academic-details/multiple/delete/0");
  expect(redirectUrl).to.include("hasError=1");
});

it("19. POST should preserve route=review in redirect", async () => {
  // Add some items
  req.session.siteData["test-site"].inputData["academic-details"] = {
    formData: [{ name: "Item 1" }, { name: "Item 2" }]
  };

  req.params.pageUrl = "academic-details";
  req.params.siteId = "test-site";
  req.params.index = "0";
  req.query.route = "review";   // 🔑 simulate review mode
  req.body = { deleteItem: "yes" };

  const handler = govcyMultipleThingsDeletePostHandler();
  await handler(req, res, next);

  // One item should be deleted
  const items = dataLayer.getPageData(req.session, "test-site", "academic-details");
  expect(items).to.have.lengthOf(1);

  // Redirect should preserve route=review
  expect(res.redirect.calledOnce).to.be.true;
  const redirectUrl = res.redirect.firstCall.args[0];
  expect(redirectUrl).to.include("/test-site/academic-details");
  expect(redirectUrl).to.include("route=review");
});

it("20. POST should not delete item if deleteItem is 'no'", async () => {
  // Add some items
  req.session.siteData["test-site"].inputData["academic-details"] = {
    formData: [{ name: "Item 1" }, { name: "Item 2" }]
  };

  req.params.pageUrl = "academic-details";
  req.params.siteId = "test-site";
  req.params.index = "0";
  req.body = { deleteItem: "no" }; // ❌ user says don't delete

  const handler = govcyMultipleThingsDeletePostHandler();
  await handler(req, res, next);

  // Nothing should be deleted
  const items = dataLayer.getPageData(req.session, "test-site", "academic-details");
  expect(items).to.have.lengthOf(2);
  expect(items[0].name).to.equal("Item 1");
  expect(items[1].name).to.equal("Item 2");

  // Should still redirect to hub
  expect(res.redirect.calledOnce).to.be.true;
  const redirectUrl = res.redirect.firstCall.args[0];
  expect(redirectUrl).to.equal("/test-site/academic-details");
});


});
