'use strict';

const onError = require('../../../backend/error');
const respond = require('../../../backend/respond');

module.exports = function (req, res) {
  respond(['logRecorder', 'auth', 'changelogFactory', 'aclProvider'],
    /**
     * @param {{logRecorder: LogRecorder, auth: Auth, changelogFactory: DsChangeLogFactory, securedDataRepo: DataRepository}} scope
     */
    function (scope) {
      try {
        let logger = null;
        let user = scope.auth.getUser(req);
        if (scope.changelogFactory) {
          logger = scope.changelogFactory.logger();
        }
        scope.securedDataRepo.getItem(req.params.class, req.params.id, {user: user})
        .then(function (item) {
          if (!item) {
            return Promise.reject(new Error('Объект не найден!'));
          }
          return logger.getChanges({className: req.params.class, id: req.params.id});
        }).then(function (result) {
          if (result.length) {
            var i;
            var existed = [];
            var authors = {};
            var prom;
            for (i = 0; i < result.length; i++) {
              if (existed.indexOf(result[i].author) === -1) {
                existed.push(result[i].author);
              }
            }

            existed.forEach(function (item, i, arr) {
              if (i === 0) {
                prom = getUserPromise(existed[i], authors, scope.auth);
              } else {
                prom = prom.then(function () {
                  return getUserPromise(existed[i], authors, scope.auth);
                });
              }
            });

            if (prom) {
              return prom.then(function () {
                var changeList = [];
                for (i = result.length - 1; i >= 0; i--) {
                  if (authors[result[i].author]) {
                    result[i].author = authors[result[i].author];
                  }
                  changeList.push(result[i]);
                }
                return changeList;
              });
            }

          }
          return result;
        }).then(function (result) {
          res.send(result);
        }).catch(
            function (err) {
              onError(scope, err, res, true);
            }
          );

      } catch (err) {
        onError(scope, err, res, true);
      }
    },
    res
  );
};

function getUserPromise(userName, userArray, auth) {
  return new Promise(function (resolve, reject) {
    auth.userProfile(userName, function (result) {
      if (result[0]) {
        userArray[userName] = result[0];
      }
      resolve();
    });
  });
}
