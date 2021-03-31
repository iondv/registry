/**
 * Created by kras on 09.09.16.
 */
'use strict';

const moduleName = require('../module-name');
const { di } = require('@iondv/core');
const onError = require('./error');
const {t} = require('@iondv/i18n');
const {format} = require('util');

module.exports = function (required, worker, res) {
  var scope = di.context(moduleName);
  if (!scope) {
    return onError(scope, new Error(t('Module DI-container not found')), res, true);
  }

  if (Array.isArray(required)) {
    for (var i = 0; i < required.length; i++) {
      if (typeof scope[required[i]] === 'undefined' || !scope[required[i]]) {
        return onError(scope, new Error(format(t('Required component %s not found'), required[i])), res, true);
      }
    }
  }

  worker(scope);
};
