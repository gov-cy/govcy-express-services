import { expect } from 'chai';
import { generatePDF } from '../../src/utils/govcyPdfMaker.mjs';
import sinon from 'sinon';
import puppeteer from 'puppeteer';

describe('govcyPdfMaker - generatePDF', () => {


    it('1. should call Puppeteer with the correct arguments and return a PDF buffer', async () => {
        const browserMock = {
          newPage: sinon.stub().resolves({
            setContent: sinon.stub().resolves(),
            pdf: sinon.stub().resolves(new Uint8Array([1, 2, 3])),
            close: sinon.stub().resolves(),
          }),
          close: sinon.stub().resolves(),
        };
      
        const puppeteerMock = sinon.stub(puppeteer, 'launch').resolves(browserMock);
      
        const html = '<html><body><h1>Mock Test</h1></body></html>';
        const pdfBuffer = await generatePDF(html);
      
        expect(puppeteerMock.calledOnce).to.be.true;
        expect(browserMock.newPage.calledOnce).to.be.true;
        expect(pdfBuffer).to.be.instanceOf(Buffer);
      
        puppeteerMock.restore();
      });
    
  });