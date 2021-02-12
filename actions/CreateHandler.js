/**
 * Created by kras on 07.09.16.
 */
'use strict';

const ActionHandler = require('../backend/ActionHandler');
const locale = require('locale');
const prepareSaveData = require('../backend/items').prepareSaveData;
const prepareJSON = require('../backend/items').prepareJSON;
const applyCollections = require('../backend/items').applyCollections;
const {t} = require('core/i18n');
const {format} = require('util');

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
      if (scope.changelogFactory)
        logger = scope.changelogFactory.logger(() => user);
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
          const data = prepareJSON(item);
          data.$message = format(t('New %s created.'), cm.getCaption);
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
