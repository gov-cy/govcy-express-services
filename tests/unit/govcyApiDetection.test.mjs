// test/unit/isApiRequest.test.mjs
import { expect } from 'chai';
import { isApiRequest } from '../../src/utils/govcyApiDetection.mjs';

describe('isApiRequest utility', () => {
    it('1. should detect API request based on Accept header', () => {
        const mockReq = {
            headers: {
                accept: 'application/json'
            },
            originalUrl: '/site1/page1'
        };

        const result = isApiRequest(mockReq);
        expect(result).to.be.true;
    });

    it('2. should detect API request based on /upload route', () => {
        const mockReq = {
            headers: {}, // no Accept header
            originalUrl: '/apis/site42/kypk-documents/upload'
        };

        const result = isApiRequest(mockReq);
        expect(result).to.be.true;
    });

    it('3. should detect API request based on /download route', () => {
        const mockReq = {
            headers: {},
            originalUrl: '/apis/site42/kypk-documents/download'
        };

        const result = isApiRequest(mockReq);
        expect(result).to.be.true;
    });

    it('4. should return false for non-API regular page route', () => {
        const mockReq = {
            headers: {
                accept: 'text/html'
            },
            originalUrl: '/site42/index'
        };

        const result = isApiRequest(mockReq);
        expect(result).to.be.false;
    });
    it('5. should return false when originalUrl is missing', () => {
        const mockReq = {
            headers: {
                accept: 'application/json'
            }
            // no originalUrl
        };

        const result = isApiRequest(mockReq);
        expect(result).to.be.true;
    });

    it('6. should return false for HTML page route with Accept header set to text/html', () => {
        const mockReq = {
            headers: {
                accept: 'text/html'
            },
            originalUrl: '/my-service/index'
        };

        const result = isApiRequest(mockReq);
        expect(result).to.be.false;
    });

    it('7. should return false for upload-like but invalid path', () => {
        const mockReq = {
            originalUrl: '/my-site/some-page/uploadSomethingElse'
        };
        expect(isApiRequest(mockReq)).to.be.false;
    });

    it("8. should return true when URL matches /upload and no Accept header", () => {
        const req = {
            originalUrl: "/apis/mySite/myPage/upload",
            headers: {} // no Accept header
        };
        const result = isApiRequest(req);
        expect(result).to.be.true;
    });


    it("9. should return true when Accept header is application/json but URL does not match", () => {
        const req = {
            originalUrl: "/mySite/home",
            headers: {
                accept: "application/json"
            }
        };
        const result = isApiRequest(req);
        expect(result).to.be.true;
    });

    it("10. should return true for /apis/ route even with complex path", () => {
        const req = {
            originalUrl: "/apis/my-site/special-page/download",
            headers: {}
        };
        expect(isApiRequest(req)).to.be.true;
    });

    it("11. should detect API request for multipleThings add upload route", () => {
        const req = {
            originalUrl: "/apis/site99/academic-details/multiple/add/upload",
            headers: {}
        };
        const result = isApiRequest(req);
        expect(result).to.be.true;
    });

    it("12. should detect API request for multipleThings edit upload route with index", () => {
        const req = {
            originalUrl: "/apis/site99/academic-details/multiple/edit/2/upload",
            headers: {}
        };
        const result = isApiRequest(req);
        expect(result).to.be.true;
    });

    it("13. should return false for invalid multipleThings upload path", () => {
        const req = {
            originalUrl: "/apis/site99/academic-details/multiple/edit/upload-wrong",
            headers: {}
        };
        expect(isApiRequest(req)).to.be.false;
    });


});
