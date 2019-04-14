/**
 * Created by kras on 07.09.16.
 */
'use strict';

const ActionHandler = require('../backend/ActionHandler');
const locale = require('locale');
const prepareSaveData = require('../backend/items').prepareSaveData;
const prepareJSON = require('../backend/items').prepareJSON;
const applyCollections = require('../backend/items').applyCollections;

/**
 * @param {{}} options
 * @constructor
 */
function CreateHandler(options) {
  /**
   * @param {{metaRepo: MetaRepository, securedDataRepo: SecuredDataRepository, auth: Auth}} scope
   * @param {DsChangelogFactory} scope.changelogFactory
   * @param {Request} req
   * @returns {Promise}
   */
  this._exec = function (scope, req) {
    return new Promise(function (resolve, reject) {
      try {
        let locales = new locale.Locales(req.headers['accept-language']);
        /**
         * @type {User}
         */
        let user = scope.auth.getUser(req);
        let cm = scope.metaRepo.getMeta(req.params.class);
        let updates = prepareSaveData(req.body, cm, locales[0] ? locales[0].language : 'ru');
        let logger = null;
        if (scope.changelogFactory) {
          logger = scope.changelogFactory.logger(function () {
            return user.id();
          });
        }
        scope.securedDataRepo.createItem(
          cm.getCanonicalName(),
          updates,
          cm.getVersion(),
          logger,
          {user: user}
        ).
        then(function (result) {
          if (!result) {
            return new Promise(function (r) {r(null);});
          }
          return applyCollections(result, req.body, scope.metaRepo, scope.dataRepo, logger, user);
        }).
        then(
          function (item) {
            if (!item) {
              return Promise.reject(new Error('Не удалось получить созданный объект.'));
            }
            var data = prepareJSON(item);
            data.$message = 'Создан новый объект ' + cm.getCaption + '.';
            return resolve(data);
          }
        ).catch(reject);
      } catch (err) {
        reject(err);
      }
    });
  };
}

CreateHandler.prototype = new ActionHandler();

module.exports = CreateHandler;
