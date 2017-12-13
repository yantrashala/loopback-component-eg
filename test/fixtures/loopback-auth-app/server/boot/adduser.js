'use strict';

module.exports = function adduser(app, cb) {
  app.models.Customer.create({
    name: 'test user',
    username: 'test',
    email: 'test@test.com',
    password: 'test'
  }, cb);
};

