import * as chai from 'chai';
import { request, default as chaiHttp } from 'chai-http';
import initializeGovCyExpressService from '../src/index.mjs';

const { expect } = chai;

chai.use(chaiHttp);

describe('GovCy Express Service', () => {
    let app;
    let service;
  

  before(() => {  
    // Suppress console.log during tests
    console.debug = () => {};
    // Initialize the service
    service = initializeGovCyExpressService();
    app = service.app;
    service.startServer(); 
  });

  after(() => {
    // Stop the server after all tests
    service.stopServer();
  });

  it('1. should return 404 for unknown routes', (done) => {
    request.execute(app)
      .get('/unknown-route')
      .end((err, res) => {
        expect(res).to.have.status(404);
        // expect(res.body).to.have.property('message', 'Page not found');
        done();
      });
  });

  it('2. should serve static files from the public folder', (done) => {
    request.execute(app)
      .get('/js/govcyForms.js') 
      .end((err, res) => {
        expect(res).to.have.status(200);
        done();
      });
  });

  it('3. should handle login route', (done) => {
    request.execute(app)
      .get('/login')
      .end((err, res) => {
        expect(res).to.have.status(200);
        done();
      });
  });
});