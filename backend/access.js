/**
 * Created by Vasiliy Ermilov (ermilov.work@yandex.ru) on 11/14/16.
 */
const PropertyTypes = require('core/PropertyTypes');
const Permissions = require('core/Permissions');

module.exports.checkNodeAccess = function (node, user, permission, checker) {
  return new Promise(function (resolve, reject) {
    if (node && user && checker) {
      checker.checkNode(user, node, permission.toString()).then(resolve).catch(reject);
    } else {
      return resolve(node && user ? true : false);
    }
  });
};

module.exports.checkClassAccess = function (className, namespace, user, permission, checker) {
  return new Promise(function (resolve, reject) {
    if (className && user && checker) {
      checker.checkClass(user, className, namespace, permission.toString()).then(resolve).catch(reject);
    } else {
      return resolve(className && user ? true : false);
    }
  });
};

var getDeniedClasses = module.exports.getDeniedClasses = function (userId, cm, metaRepo, checker) {
  return new Promise(function (resolve, reject) {
    if (cm && checker) {
      var promises = [];
      var result = false;
      var createPromise = function (property, cm) {
        return new Promise(function (resolve, reject) {
          checker.checkClass(userId, cm.getName(), cm.getNamespace(), Permissions.READ).
          then(function (acc) {
            if (!acc) {
              if (!result) {
                result = {};
              }
              result[property] = false;
              return resolve();
            } else {
              getDeniedClasses(userId, cm, metaRepo, checker).
              then(function (rs) {
                if (!result) {
                  result = {};
                }
                result[property] = rs;
                return resolve();
              }).catch(reject);
            }
          }).catch(reject);
        });
      };
      var propertyMetas = cm.getPropertyMetas();
      propertyMetas.forEach(function (pm, i) {
        if (pm.type === PropertyTypes.REFERENCE && pm._refClass) {
          promises.push(createPromise(pm.name, pm._refClass));
        } else if (pm.type === PropertyTypes.COLLECTION && pm.itemsClass) {
          var colCm = metaRepo.getMeta(pm.itemsClass, null, cm.getNamespace());
          if (colCm) {
            promises.push(createPromise(pm.name, colCm));
          }
        }
      });
      Promise.all(promises).then(function () {
        return resolve(result);
      }).catch(reject);
    } else {
      return resolve(false);
    }
  });
};

function checkDeniedAttrs(itemJson, denied) {
  if (!denied) {
    return itemJson;
  }
  if (Array.isArray(itemJson)) {
    for (var i = 0; i < itemJson.length; i++) {
      itemJson[i] = checkDeniedAttrs(itemJson[i], denied);
    }
  } else {
    for (var key in denied) {
      if (denied.hasOwnProperty(key)) {
        if (itemJson[key]) {
          if (denied[key]) {
            itemJson[key] = checkDeniedAttrs(itemJson[key], denied[key]);
          } else {
            itemJson[key] = null;
          }
        }
        if (itemJson[key + '_ref']) {
          if (denied[key]) {
            itemJson[key + '_ref'] = checkDeniedAttrs(itemJson[key + '_ref'], denied[key]);
          } else {
            itemJson[key + '_ref'] = null;
          }
        }
      }
    }
  }
  return itemJson;
}

module.exports.checkItemJSON = function (itemJson, userId, cm, wfPermissions, metaRepo, checker) {
  return new Promise(function (resolve, reject) {
    getDeniedClasses(userId, cm, metaRepo, checker).
    then(function (denied) {
      if (denied &&
        Object.keys(denied).length &&
        wfPermissions &&
        Object.keys(wfPermissions).length) {
        Object.keys(wfPermissions).forEach(function (property) {
          Object.keys(wfPermissions[property]).forEach(function (role) {
            var pm = cm.getPropertyMeta(role);
            if (pm &&
            pm.type === PropertyTypes.USER &&
            itemJson[role] === userId &&
            wfPermissions[property][role] >= Permissions.READ &&
            denied.hasOwnProperty(property)) {
              delete denied[property];
            }
          });
        });
      }
      return resolve(checkDeniedAttrs(itemJson, denied));
    }).catch(reject);
  });
};

module.exports.checkPropertyFunc = function (userId, item, wfPermissions, metaRepo, checker) {
  return new Promise(function (resolve, reject) {
    var cm = item.getMetaClass();
    getDeniedClasses(userId, cm, metaRepo, checker).
    then(function (denied) {
      if (denied &&
        Object.keys(denied).length &&
        wfPermissions &&
        Object.keys(wfPermissions).length) {
        Object.keys(wfPermissions).forEach(function (property) {
          Object.keys(wfPermissions[property]).forEach(function (role) {
            var up = item.property(role);
            if (up &&
            up.getType() === PropertyTypes.USER &&
            up.getValue() === userId &&
            wfPermissions[property][role] >= Permissions.READ &&
            denied.hasOwnProperty(property)) {
              delete denied[property];
            }
          });
        });
      }
      resolve(function (property) {
        return denied ? Object.keys(denied).indexOf(property) < 0 : true;
      });
    }).catch(reject);
  });
};

module.exports.checkWorkflowPermissions = function (user, item, workflows, permission) {
  return new Promise(function (resolve, reject) {
    if (!user || !workflows) {
      return resolve(false);
    }
    workflows.getStatus(item).
    then(
      function (status) {
        if (Object.keys(status.itemPermissions).length) {
          Object.keys(status.itemPermissions).forEach(function (role) {
            var up = item.property(role);
            if (up &&
              up.getType() === PropertyTypes.USER &&
              up.getValue() === user &&
              status.itemPermissions[role] >= permission) {
              return resolve(true);
            }
          });
        }
        return resolve(false);
      }
    ).catch(reject);
  });
};
