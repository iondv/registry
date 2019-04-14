/**
 * Created by kras on 07.09.16.
 */
'use strict';

const ActionHandler = require('../backend/ActionHandler');
const IonError = require('core/IonError');

/**
 * @param {{}} options
 * @constructor
 */
function DeleteHandler() {
  /**
   * @param {{securedDataRepo: SecuredDataRepository}} scope
   * @param {DsChangelogFactory} [scope.changelogFactory]
   * @param {Request} req
   * @returns {Promise}
   */
  this._exec = function (scope, req) {
    try {
      let logger = null;
      let user = scope.auth.getUser(req);
      let results = {deleted: [], errors: []};

      if (scope.changelogFactory) {
        logger = scope.changelogFactory.logger(function () {
          return user.id();
        });
      }

      if (req.body.items) {
        if (req.body.items.length) {
          let p = Promise.resolve();
          req.body.items.forEach((item) => {
            p = p
              .then(() => scope.securedDataRepo.deleteItem(item.class, item.id, logger, {user: user}))
              .then(() => {
                results.deleted.push(item);
              })
              .catch((e) => {
                if (scope.sysLog) {
                  scope.sysLog.error(e);
                }
                results.errors.push(`Не удалось удалить обьект ${item.class}@${item.id}: ${(e instanceof IonError && e.cause) ? e.cause : e}`);
              });
          });

          return p.then(() => {
            results.$message = req.body.items.length > results.deleted.length ?
              'Некоторые объекты не были удалены.' :
              'Удалены все указанные объекты.';
            return results;
          });
        } else {
          return Promise.resolve({deleted: [], $message: 'Нечего удалять!'});
        }
      } else if (req.params.id) {
        return scope.securedDataRepo.deleteItem(
          req.params.class,
          req.params.id,
          logger,
          {user: user}
        );
      }
    } catch (err) {
      return Promise.reject(err);
    }
  };
}

DeleteHandler.prototype = new ActionHandler();

module.exports = DeleteHandler;
