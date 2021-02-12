/**
 * Created by kras on 07.09.16.
 */
'use strict';

const Logger = require('core/interfaces/Logger');
const {t} = require('core/i18n');

/**
 * @param {{}} scope
 * @param {Logger} [scope.sysLog]
 * @param {Error | String} err
 * @param {Response} res
 * @param {String | Boolean} userMsg
 */
module.exports = function (scope, err, res, userMsg) {
  if (scope.logRecorder) {
    scope.logRecorder.stop();
  }

  if (scope && scope.sysLog && scope.sysLog instanceof Logger) {
    scope.sysLog.error(err);
  } else {
    console.error(err);
  }

  let msg;
  if (typeof userMsg === 'boolean' && userMsg) {
    msg = t('Internal server error.');
  } else {
    msg = userMsg || (err instanceof Error ? err.getMessage(res.locals.lang) : err);
  }

  if (res) {
    res.status(500).send(msg);
  }
  return false;
};
