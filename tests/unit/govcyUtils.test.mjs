import { expect } from "chai";
import { dateStringISOtoDMY } from "../../src/utils/govcyUtils.mjs";

describe("govcyUtils.dateStringISOtoDMY()", () => {

  it("1. should correctly format a valid ISO date string (YYYY-MM-DD → D/M/YYYY)", () => {
    const result = dateStringISOtoDMY("2025-10-18");
    expect(result).to.equal("18/10/2025");
  });

  it("2. should strip leading zeros from day and month", () => {
    const result = dateStringISOtoDMY("2025-01-05");
    // day '05' → 5, month '01' → 1
    expect(result).to.equal("5/1/2025");
  });

  it("3. should handle leap-year date correctly", () => {
    const result = dateStringISOtoDMY("2024-02-29");
    expect(result).to.equal("29/2/2024");
  });

  it("4. should return an empty string when input is undefined", () => {
    const result = dateStringISOtoDMY(undefined);
    expect(result).to.equal("");
  });

  it("5. should return an empty string when input is null", () => {
    const result = dateStringISOtoDMY(null);
    expect(result).to.equal("");
  });

  it("6. should return an empty string when input is an empty string", () => {
    const result = dateStringISOtoDMY("");
    expect(result).to.equal("");
  });

  it("7. should gracefully handle malformed strings (missing parts)", () => {
    const result = dateStringISOtoDMY("2025-07");
    // split gives [ "2025", "07" ] → day undefined → "NaN/7/2025"
    expect(result).to.equal("NaN/7/2025");
  });

  it("8. should gracefully handle non-numeric content", () => {
    const result = dateStringISOtoDMY("abcd-ef-gh");
    // parseInt("gh") → NaN
    expect(result).to.equal("NaN/NaN/abcd");
  });

  it("9. should not throw for completely invalid input types (number, object, etc.)", () => {
    expect(() => dateStringISOtoDMY(20251018)).to.not.throw();
    expect(() => dateStringISOtoDMY({})).to.not.throw();
  });

  it("10. should convert a string with extra whitespace correctly", () => {
    const result = dateStringISOtoDMY(" 2025-12-09 ");
    // .split() works fine; whitespace ignored when parsing
    expect(result).to.equal("9/12/2025");
  });

  it("11. should not pad single-digit days or months with zeros", () => {
    const result = dateStringISOtoDMY("2025-3-2");
    expect(result).to.equal("2/3/2025");
  });

  it("12. should handle date with two-digit day and month without losing them", () => {
    const result = dateStringISOtoDMY("2025-11-30");
    expect(result).to.equal("30/11/2025");
  });

});
