'use strict';

const utils = require('loopback/lib/utils');

module.exports = function(app, config) {
  const userSubClass = app.loopback.getModelByType('User');
  const accessTokenSubClass = app.loopback.getModelByType('AccessToken');

  // disabling all accessToken endpoints
  userSubClass.sharedClass.methods().forEach(method => {
    if (method.name.indexOf('accessToken') >= 0) {
      userSubClass.disableRemoteMethodByName('prototype.' + method.name);
    }
    
  });

  userSubClass.logout = function(tokenId, fn) {
   
    fn();
  };

  userSubClass.prototype.orgCreateAccessToken =
    userSubClass.prototype.createAccessToken;
  userSubClass.prototype.createAccessToken = function(ttl, options, cb) {
    if (cb === undefined && typeof options === 'function') {
      cb = options;
      options = undefined;
    }

    let token = new accessTokenSubClass();
    token.userId = this.id;

    if (cb) {
      return cb(null, token);
    } else {
      return utils.createPromiseCallback().resolve(token);
    }
  };


  accessTokenSubClass.resolve = function(id, cb) {
    if (id) {
      try {
        let token = new accessTokenSubClass();
        token.userId = id;
        cb(null, token);
      } catch (err) {
        // Should override the error to 401
        cb(err);
      }
    } else {
      cb();
    }
  };
};
