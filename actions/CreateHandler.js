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
function CreateHandler() {
  /**
   * @param {{metaRepo: MetaRepository, securedDataRepo: SecuredDataRepository, auth: Auth}} scope
   * @param {DsChangelogFactory} scope.changelogFactory
   * @param {Request} req
   * @returns {Promise}
   */
  this._exec = function (scope, req) {
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
      return scope.securedDataRepo.createItem(
        cm.getCanonicalName(),
        updates,
        cm.getVersion(),
        logger,
        {user: user}
      ).then(result =>
        result ? applyCollections(result, req.body, scope.metaRepo, scope.dataRepo, logger, user) : null
      ).then(
        (item) => {
          if (!item) {
            throw new Error('Не удалось получить созданный объект.');
          }
          const data = prepareJSON(item);
          data.$message = 'Создан новый объект ' + cm.getCaption + '.';
          return data;
        }
      );
    } catch (err) {
      return Promise.reject(err);
    }
  };
}

CreateHandler.prototype = new ActionHandler();

module.exports = CreateHandler;
