'use strict';
const F = require('core/FunctionCodes');
const {t} = require('core/i18n');

/**
 *
 * @param {{}} options
 * @param {String} options.tableName
 * @param {DataSource} options.ds
 * @constructor
 */
function ConcurencyChecker(options) {

  if (!options.ds) {
    throw new Error(t('Data source not specified'));
  }

  const tn = options.tableName || 'ion_concurency';

  this.state = function (id) {
    let condition = {
      filter: {[F.EQUAL]: ['$id', id]}
    };
    return options.ds.fetch(tn, condition)
      .then(s => {
        return Array.isArray(s) ? s[0] : null;
      });
  };

  this.block = function (id, user) {
    let data = {
      id: id,
      blockDate: Date.now(),
      user: user
    };
    return options.ds.upsert(tn, {[F.EQUAL]: ['$id', id]}, data);
  };

}

module.exports = ConcurencyChecker;
