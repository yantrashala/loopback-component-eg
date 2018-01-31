'use strict';
const _ = require('lodash');


function createPromiseCallback() {
  var cb;
  var promise = new Promise(function (resolve, reject) {
    cb = function (err, data) {
      if (err) return reject(err);
      return resolve(data);
    };
  });
  cb.promise = promise;
  return cb;
}

module.exports = function (app, config) {
  const userIdField = config['userIdField'] || 'id';
  const userSubClass = app.loopback.getModelByType('User');
  const accessTokenSubClass = app.loopback.getModelByType('AccessToken');
  const roleSubClass = app.loopback.getModelByType('Role');

  // disabling all accessToken endpoints
  userSubClass.sharedClass.methods().forEach(method => {
    if (method.name.indexOf('accessToken') >= 0) {
      userSubClass.disableRemoteMethodByName('prototype.' + method.name);
    }

  });

  userSubClass.baseLogin = userSubClass.login;
  userSubClass.login = function (credentials, include, fn) {

    if (include && include.indexOf('user') < 0) include = 'user,' + include;

    const getRolesById = function (id, cb) {
      userSubClass.getApp(function (err, app) {
        if (err) throw err;
        var RoleMapping = app.models.RoleMapping;
        var Role = app.models.Role;
        RoleMapping.find({ where: { principalId: id } }, function (err, roleMappings) {
          var roleIds = _.uniq(roleMappings
            .map(function (roleMapping) {
              return roleMapping.roleId;
            }));
          var conditions = roleIds.map(function (roleId) {
            return { id: roleId };
          });
          Role.find({ where: { or: conditions } }, function (err, roles) {
            if (err) throw err;
            var roleNames = roles.map(function (role) {
              return role.name;
            });

            cb(null, { "roles": roleNames });
          });
        });
      });
    };

    return this.baseLogin(credentials, include)
      .then(function (response) {
        response = JSON.parse(JSON.stringify(response));
        if (response.user) {
          return new Promise(function (resolve, reject) {
            getRolesById(response.userId, function (err, result) {
              if (err) reject(err);
              response.user.roles = result.roles;
              return resolve(response);
            });
          });
        } else {
          return response;
        }
      });
  }

  userSubClass.prototype.orgCreateAccessToken =
    userSubClass.prototype.createAccessToken;
  userSubClass.prototype.createAccessToken = function (ttl, options, cb) {
    if (cb === undefined && typeof options === 'function') {
      cb = options;
      options = undefined;
    }

    let token = new accessTokenSubClass();
    token.userId = this[userIdField];

    if (cb) {
      return cb(null, token);
    } else {
      return createPromiseCallback().resolve(token);
    }
  };

  accessTokenSubClass.resolve = function (id, cb) {
    if (id) {
      try {
        id = (new Buffer(id, 'base64')).toString('utf8');
        id = id.substring(5);
        let user = JSON.parse(id);
        let token = new accessTokenSubClass();
        token.orgUser = user;
        token.userId = user[userIdField];
        cb(null, token);
      } catch (err) {
        // Should override the error to 401
        cb(err);
      }
    } else {
      cb();
    }
  };

  if (config.roles) {
    config.roles.forEach((role) => {
      roleSubClass.registerResolver(role, function (role, context, cb) {
        if (context.accessToken && context.accessToken.orgUser
          && context.accessToken.orgUser.roles) {
          cb(null, context.accessToken.orgUser.roles.includes(role));
        } else {
          cb(null, false);
        }
      });
    });
  }


};
