import { expect } from 'chai';
import sinon from 'sinon';
import { logger } from '../../src/utils/govcyLogger.mjs';

describe('govcyLogger', () => {
    let consoleStub;

    beforeEach(() => {
        consoleStub = sinon.stub(console, 'log');
    });

    afterEach(() => {
        sinon.restore();
    });

    it('1. should log info messages', () => {
        logger('info', 'Test message');
        expect(consoleStub.calledOnce).to.be.true;
        expect(consoleStub.calledWithMatch('[INFO]')).to.be.true;
    });

    it('2. should log debug messages when DEBUG is true', () => {
        process.env.DEBUG = true;
        const debugStub = sinon.stub(console, 'debug');
        logger('debug', 'Debug message');
        expect(debugStub.calledOnce).to.be.true;
        expect(debugStub.calledWithMatch('[DEBUG]')).to.be.true;
    });

    it('3. should not log debug messages when DEBUG is false', () => {
        process.env.DEBUG = 'false';
        const debugStub = sinon.stub(console, 'debug');
        logger('debug', 'Debug message');
        expect(debugStub.called).to.be.false;
    });
});