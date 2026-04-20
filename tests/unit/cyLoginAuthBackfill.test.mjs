import { expect } from "chai";
import { backfillPolicyClaimsFromIdToken } from "../../src/auth/cyLoginAuth.mjs";

describe("backfillPolicyClaimsFromIdToken", () => {
    it("1. keeps existing userInfo identifiers/profile_type unchanged when present", () => {
        const userInfo = {
            unique_identifier: "0012345678",
            profile_type: "Individual",
            legal_unique_identifier: "HE123456"
        };
        const claims = {
            unique_identifier: "0099999999",
            profile_type: "Organisation",
            legal_unique_identifier: "HE999999"
        };

        backfillPolicyClaimsFromIdToken(userInfo, claims);

        expect(userInfo).to.deep.equal({
            unique_identifier: "0012345678",
            profile_type: "Individual",
            legal_unique_identifier: "HE123456"
        });
    });

    it("2. backfills missing identifier from claims", () => {
        const userInfo = {
            profile_type: "Individual",
            legal_unique_identifier: "HE123456"
        };
        const claims = {
            unique_identifier: "0012345678"
        };

        backfillPolicyClaimsFromIdToken(userInfo, claims);

        expect(userInfo.unique_identifier).to.equal("0012345678");
        expect(userInfo.profile_type).to.equal("Individual");
        expect(userInfo.legal_unique_identifier).to.equal("HE123456");
    });

    it("3. backfills both identifiers (and profile_type) when missing and available in claims", () => {
        const userInfo = {};
        const claims = {
            unique_identifier: "0012345678",
            profile_type: "Organisation",
            legal_unique_identifier: "HE123456"
        };

        backfillPolicyClaimsFromIdToken(userInfo, claims);

        expect(userInfo).to.deep.equal({
            unique_identifier: "0012345678",
            profile_type: "Organisation",
            legal_unique_identifier: "HE123456"
        });
    });

    it("4. does not crash and leaves userInfo unchanged when claims are missing identifiers", () => {
        const userInfo = {
            name: "Test User"
        };
        const claims = {
            sub: "abc123"
        };

        expect(() => backfillPolicyClaimsFromIdToken(userInfo, claims)).to.not.throw();
        expect(userInfo).to.deep.equal({ name: "Test User" });
    });
});
