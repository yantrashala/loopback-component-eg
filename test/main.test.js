const request = require('supertest');
const app = require('./fixtures/loopback-auth-app/');

const chai = require('chai'),
  assert = chai.assert,
  expect = chai.expect,
  should = chai.should();



describe('E2E: Tests', () => {

  it('should be able to hit loopback api', function () {
    return request(app)
      .get('/')
      .expect(200);
  });

  it('should not return accessToken & id on login', function () {
    return request(app)
      .post('/api/Customers/login')
      .set('Content-Type', 'application/json')
      .send('{"username":"test","password":"test"}')
      .then(function (res) {
        expect(res.body).to.not.have.property('accessToken');
        expect(res.body).to.not.have.property('id');
      });
  });

})