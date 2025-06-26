import { expect } from 'chai';
import { flattenContext, evaluateExpression, evaluateExpressionWithFlattening, evaluatePageConditions } from '../../src/utils/govcyExpressions.mjs';

describe('govcyExpressions - flattenContext', () => {
  it('1. should flatten a simple nested object', () => {
    const input = {
      user: {
        name: 'Alice',
        age: 30
      }
    };
    const result = flattenContext(input);
    expect(result).to.deep.equal({
      'user.name': 'Alice',
      'user.age': 30
    });
  });

  it('2. should apply prefix correctly', () => {
    const input = {
      formData: {
        field1: 'value1'
      }
    };
    const result = flattenContext(input, 'test');
    expect(result).to.deep.equal({
      'test.formData.field1': 'value1'
    });
  });

  it('3. should ignore null values safely', () => {
    const input = {
      user: {
        name: null,
        email: 'user@example.com'
      }
    };
    const result = flattenContext(input);
    expect(result).to.deep.equal({
      'user.name': null,
      'user.email': 'user@example.com'
    });
  });

  it('4. should preserve arrays without flattening elements', () => {
    const input = {
      data: {
        items: ['a', 'b', 'c']
      }
    };
    const result = flattenContext(input);
    expect(result).to.deep.equal({
      'data.items': ['a', 'b', 'c']
    });
  });

  it('5. should handle empty objects without error', () => {
    const input = {
      container: {}
    };
    const result = flattenContext(input);
    expect(result).to.deep.equal({});
  });
});

describe('govcyExpressions - evaluateExpression', () => {
  it('1. should evaluate a basic boolean expression', () => {
    const ctx = { 'user.age': 25 };
    const result = evaluateExpression('dataLayer["user.age"] > 18', ctx);
    expect(result).to.be.true;
  });

  it('2. should return a numeric result', () => {
    const ctx = { 'x': 5, 'y': 3 };
    const result = evaluateExpression('dataLayer["x"] + dataLayer["y"]', ctx);
    expect(result).to.equal(8);
  });

  it('3. should return a string result', () => {
    const ctx = { 'user.name': 'Alice' };
    const result = evaluateExpression('dataLayer["user.name"]', ctx);
    expect(result).to.equal('Alice');
  });

  it('4. should evaluate to false for missing key', () => {
    const ctx = {};
    const result = evaluateExpression('dataLayer["missing"] == undefined', ctx);
    expect(result).to.be.true;
  });

  it('5. should throw an error for invalid syntax', () => {
    const ctx = { 'x': 1 };
    expect(() => evaluateExpression('dataLayer["x" == 1', ctx)).to.throw();
  });

  it('6. should throw an error for blocked expression patterns', () => {
    const ctx = { 'x': 1 };
    expect(() => evaluateExpression('while(true) {}', ctx)).to.throw('Blocked unsafe expression');
  });
});

describe('govcyExpressions - evaluateExpressionWithFlattening', () => {
  it('1. should flatten and evaluate a nested value correctly', () => {
    const obj = {
      user: {
        profile: {
          age: 30
        }
      }
    };
    const result = evaluateExpressionWithFlattening(
      'dataLayer["user.profile.age"] > 18',
      obj
    );
    expect(result).to.be.true;
  });

  it('2. should apply prefix to flattened keys', () => {
    const obj = {
      formData: {
        IBAN: 'CY123'
      }
    };
    const result = evaluateExpressionWithFlattening(
      'dataLayer["site1.formData.IBAN"] == "CY123"',
      obj,
      'site1'
    );
    expect(result).to.be.true;
  });

  it('3. should throw on invalid expression', () => {
    const obj = { x: 1 };
    expect(() => evaluateExpressionWithFlattening(
      'dataLayer["x" == 1', obj
    )).to.throw();
  });

  it('4. should throw on blocked pattern', () => {
    const obj = { x: 1 };
    expect(() => evaluateExpressionWithFlattening(
      'while(true){}', obj
    )).to.throw('Blocked unsafe expression');
  });
});

describe('govcyExpressions - evaluatePageConditions', () => {
  let store;
  let req;

  beforeEach(() => {
    store = {
      siteData: {
        test: {
          inputData: {
            "page1": {
              formData: {
                field: 'yes'
              }
            }
          },
          eligibility: {
            check1: {
              result: {
                Succeeded: true
              }
            }
          }
        }
      }
    };
    req = {}; // reset on every test
  });

  it('1. should return { result: true } if no conditions are defined', () => {
    const page = { pageData: {} };
    const result = evaluatePageConditions(page, store, 'test',req);
    expect(result).to.deep.equal({ result: true });
  });

  it('2. should return { result: false, redirect } if a condition is true', () => {
    const page = {
      pageData: {
        conditions: [
          {
            expression: 'dataLayer["test.eligibility.check1.result.Succeeded"] == true',
            redirect: 'redirect-page'
          }
        ]
      }
    };
    const result = evaluatePageConditions(page, store, 'test',req);
    expect(result).to.deep.equal({ result: false, redirect: 'redirect-page' });
  });

  it('3. should return { result: true } if all conditions are false', () => {
    const page = {
      pageData: {
        conditions: [
          {
            expression: 'dataLayer["test.inputData.page1.formData.field"] == "no"',
            redirect: 'some-page'
          }
        ]
      }
    };
    const result = evaluatePageConditions(page, store, 'test',req);
    expect(result).to.deep.equal({ result: true });
  });

  it('4. should skip malformed conditions and still return { result: true }', () => {
    const page = {
      pageData: {
        conditions: [
          {
            // Missing expression and redirect
          }
        ]
      }
    };
    const result = evaluatePageConditions(page, store, 'test',req);
    expect(result).to.deep.equal({ result: true });
  });

  it('5. should handle expression errors gracefully and return { result: true }', () => {
    const page = {
      pageData: {
        conditions: [
          {
            expression: 'dataLayer["test.inputData.page1.formData.field"].invalidCall()', // invalid
            redirect: 'error-page'
          }
        ]
      }
    };
    const result = evaluatePageConditions(page, store, 'test',req);
    expect(result).to.deep.equal({ result: true });
  });

    it('6. should evaluate a complex expression with && and ||', () => {
    const page = {
      pageData: {
        conditions: [
          {
            expression:
              'dataLayer["test.eligibility.check1.result.Succeeded"] == true && (dataLayer["test.inputData.page1.formData.field"] == "yes" || dataLayer["test.inputData.page1.formData.field"] == "maybe")',
            redirect: 'complex-redirect'
          }
        ]
      }
    };

    const result = evaluatePageConditions(page, store, 'test',req);
    expect(result).to.deep.equal({ result: false, redirect: 'complex-redirect' });
  });

  it('7. should evaluate multiple conditions and return first match', () => {
    const page = {
      pageData: {
        conditions: [
          {
            expression: 'dataLayer["test.inputData.page1.formData.field"] == "no"',
            redirect: 'wrong-redirect'
          },
          {
            expression: 'dataLayer["test.inputData.page1.formData.field"] == "yes"',
            redirect: 'correct-redirect'
          }
        ]
      }
    };

    const result = evaluatePageConditions(page, store, 'test',req);
    expect(result).to.deep.equal({ result: false, redirect: 'correct-redirect' });
  });

  it('8. should return { result: true } if all multiple conditions are false', () => {
    const page = {
      pageData: {
        conditions: [
          {
            expression: 'dataLayer["test.inputData.page1.formData.field"] == "no"',
            redirect: 'no-match-1'
          },
          {
            expression: 'dataLayer["test.eligibility.check1.result.Succeeded"] == false',
            redirect: 'no-match-2'
          }
        ]
      }
    };

    const result = evaluatePageConditions(page, store, 'test',req);
    expect(result).to.deep.equal({ result: true });
  });

  it('9. should skip malformed conditions and still match a valid one later', () => {
    const page = {
      pageData: {
        conditions: [
          {
            expression: '', // invalid
            redirect: ''    // invalid
          },
          {
            expression: 'dataLayer["test.eligibility.check1.result.Succeeded"] == true',
            redirect: 'valid-match'
          }
        ]
      }
    };

    const result = evaluatePageConditions(page, store, 'test',req);
    expect(result).to.deep.equal({ result: false, redirect: 'valid-match' });
  });

  it('10. should return { result: true } if max redirect depth is exceeded', () => {
    const page = {
      pageData: {
        conditions: [
          {
            expression: 'dataLayer["test.eligibility.check1.result.Succeeded"] == true',
            redirect: 'should-not-redirect'
          }
        ]
      }
    };

    req._pageRedirectDepth = 11; // ✅ simulate already exceeded depth
    const result = evaluatePageConditions(page, store, 'test', req);

    expect(result).to.deep.equal({ result: true }); // ✅ should NOT redirect
  });


});