/**
 * Created by kras on 08.09.16.
 */
'use strict';

const ActionHandler = require('../backend/ActionHandler');
const edit = require('../backend/items').saveItem;

/**
 * @param {{}} options
 * @constructor
 */
function SaveHandler(options) {
  /**
   * @param {{metaRepo: MetaRepository, securedDataRepo: SecuredDataRepository}} scope
   * @param {ChangelogFactory} scope.changelogFactory
   * @param {Request} req
   * @returns {Promise}
   */
  this._exec = function (scope, req) {
    var logger;
    if (scope.changelogFactory) {
      logger = scope.changelogFactory.logger(() => scope.auth.getUser(req).id());
    }
    return edit(scope, req, null, logger).then((data) => {
      data.$message = 'Объект сохранен.';
      return Promise.resolve(data);
    });
  };
}

SaveHandler.prototype = new ActionHandler();

module.exports = SaveHandler;
