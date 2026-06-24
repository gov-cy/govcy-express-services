import { expect } from 'chai';
import { getServiceConfigData, getPageConfigData } from '../../src/utils/govcyLoadConfigData.mjs';

describe('govcyLoadConfigData - getServiceConfigData', () => {
    it('1. should load service configuration data by siteId', () => {
        const service = getServiceConfigData('test', 'en');
        expect(service.site.id).to.equal('test');
        expect(service.site.title['en']).to.equal('Test service');
        expect(service.site.lang).to.equal('en');
    });

    it('2. should default to "el" if no language is provided', () => {
        const service = getServiceConfigData('test');
        expect(service.site.lang).to.equal('el');
    });

    it('3. should throw a 404 error if the siteId does not exist', () => {
        expect(() => getServiceConfigData('nonexistent')).to.throw('Service not found');
    });

    it('4. should set isTesting to true if the environment is staging', () => {
        process.env.NODE_ENV = 'staging';
        const service = getServiceConfigData('test', 'en');
        expect(service.site.isTesting).to.be.true;
        process.env.NODE_ENV = 'development'; // Reset environment
    });
    it('5. should handle unsupported languages gracefully', () => {
        const service = getServiceConfigData('test', 'fr'); // Unsupported language
        expect(service.site.lang).to.equal('el'); // Default to 'el'
    });
    it('6. should set Matomo userId when userSub is provided', () => {
        const service = getServiceConfigData('test', 'en', 'abc');

        expect(service.site.matomo).to.have.property('userId');
        expect(service.site.matomo.userId).to.be.a('string');
        expect(service.site.matomo.userId).to.not.equal('');
    });
    it('7. should generate a stable Matomo userId and not expose the raw userSub', () => {
        const serviceA = getServiceConfigData('test', 'en', 'abc');
        const serviceB = getServiceConfigData('test', 'en', 'abc');

        expect(serviceA.site.matomo.userId).to.equal(serviceB.site.matomo.userId);
        expect(serviceA.site.matomo.userId).to.not.equal('abc');
        expect(serviceA.site.matomo.userId).to.not.include('abc');
    });
    it('8. should not set Matomo userId when userSub is not provided', () => {
        const service = getServiceConfigData('test', 'en');

        expect(service.site.matomo).to.not.have.property('userId');
    });

    it('9. should not set Matomo userId when userSub is empty after trimming', () => {
        const service = getServiceConfigData('test', 'en', '   ');

        expect(service.site.matomo).to.not.have.property('userId');
    });

    it('10. should not set Matomo userId when userSub is not a string', () => {
        const service = getServiceConfigData('test', 'en', 12345);

        expect(service.site.matomo).to.not.have.property('userId');
    });
});

describe('govcyLoadConfigData - getPageConfigData', () => {
    it('1. should load page configuration data by pageUrl', () => {
        const service = getServiceConfigData('test', 'en');
        const page = getPageConfigData(service, 'data-entry-all');
        expect(page.pageData.url).to.equal('data-entry-all');
        expect(page.pageData.title['en']).to.equal('All inputs');
    });

    it('2. should throw a 404 error if the pageUrl does not exist', () => {
        const service = getServiceConfigData('test', 'en');
        expect(() => getPageConfigData(service, 'nonexistent')).to.throw('Page not found');
    });

});