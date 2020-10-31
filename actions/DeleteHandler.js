/**
 * Created by kras on 07.09.16.
 */
'use strict';

const ActionHandler = require('../backend/ActionHandler');
const IonError = require('core/IonError');
const {t} = require('core/i18n');
const {format} = require('util');

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

      if (scope.changelogFactory)
        logger = scope.changelogFactory.logger(() => user);

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
                results.errors.push(format(
                  t('Failed to delete object %s: %s'),
                  `${item.class}@${item.id}`,
                  (e instanceof IonError && e.cause) ? e.cause : e
                );
              });
          });

          return p.then(() => {
            results.$message = req.body.items.length > results.deleted.length ?
              t('Some objects were not deleted.') :
              t('All objects where deleted.');
            return results;
          });
        } else {
          return Promise.resolve({deleted: [], $message: t('Nothing to delete!')});
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
