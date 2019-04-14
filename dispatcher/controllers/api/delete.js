/**
 * Created by kras on 01.06.16.
 */
'use strict';

const onError = require('../../../backend/error');
const respond = require('../../../backend/respond');

module.exports = function (req, res) {
  respond(['metaRepo', 'securedDataRepo', 'auth'],
    /**
     * @param {{metaRepo: MetaRepository, securedDataRepo: DataRepository, auth: Auth}} scope
     */
    function (scope) {
      let deletePromises = [];
      let user = scope.auth.getUser(req);

      function pc(item, logger) {
        return scope.securedDataRepo.deleteItem(item.class, item.id, logger, {user: user})
            .then(()=>item)
            .catch(()=>Promise.resolve(null));
      }

      try {
        var logger = null;
        if (scope.changelogFactory) {
          logger = scope.changelogFactory.logger(
            function () {
              return user.id();
            }
          );
        }

        for (var i = 0; i < req.body.items.length; i++) {
          deletePromises.push(pc(req.body.items[i], logger));
        }

        Promise.all(deletePromises).then(
          function (results) {
            var items = [];
            for (var i = 0; i < results.length; i++) {
              if (results[i]) {
                items.push(results[i]);
              }
            }
            res.send(items);
          }
        ).catch(function (err) {
          onError(scope, err, res, true);
        });
      } catch (err) {
        onError(scope, err, res, true);
      }
    },
    res
  );
};
