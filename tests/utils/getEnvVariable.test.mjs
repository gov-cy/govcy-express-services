import { expect } from 'chai';
import { getEnvVariable } from '../../src/utils/govcyEnvVariables.mjs';

describe('govcyEnvVariables', () => {
    it('1. should return the value of an existing environment variable', () => {
        process.env.TEST_VAR = 'test-value';
        const value = getEnvVariable('TEST_VAR');
        expect(value).to.equal('test-value');
    });

    it('2. should return the default value if the environment variable does not exist', () => {
        const value = getEnvVariable('NON_EXISTENT_VAR', 'default-value');
        expect(value).to.equal('default-value');
    });
});