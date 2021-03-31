/**
 * Created by kras on 07.09.16.
 */
'use strict';

const onApiError = require('../../../backend/apiError');
const wrapError = require('../../../backend/wrapError');
const respond = require('../../../backend/respond');
const{ data: { Item } } = require('@iondv/meta-model-contracts');
const prepareJSON = require('../../../backend/items').prepareJSON;
const locale = require('locale');
const edit = require('../../../backend/items').saveItem;
const {t} = require('@iondv/i18n');
const {format} = require('util');

/* jshint maxstatements: 40, maxcomplexity: 20, maxdepth: 15 */

module.exports = function (req, res) {
  respond(['metaRepo', 'securedDataRepo', 'actions', 'logRecorder', 'workflows', 'auth'],
    /**
     * @param {{metaRepo: MetaRepository, securedDataRepo: DataRepository, actions: ActionProvider, auth: Auth}} scope
     * @param {WorkflowProvider} scope.workflows
     * @param {LogRecorder} scope.logRecorder
     */
    function (scope) {
      let locales = new locale.Locales(req.headers['accept-language']);
      let lang = locales[0] ? locales[0].language : 'ru';
      let user = scope.auth.getUser(req);
      try {
        if (req.body.$action) {
          let handler = scope.actions.getAction(req.body.$action);
          if (handler) {
            scope.logRecorder.start();
            handler.exec(scope, req).then(
              (result) => {
                const log = scope.logRecorder.stop();
                if (log.length && typeof result === 'object') {
                  if (!result) {
                    result = {};
                  }
                  result.__log = log;
                }
                res.status(200).send(result || 'done');
              }
            ).catch((err) => {
              scope.logRecorder.stop();
              onApiError(scope, wrapError(err), res);
            });
            return;
          } else {
            var parts = req.body.$action.split('.');
            if (parts.length > 1) {
              scope.logRecorder.start();
              let logger;
              if (scope.changelogFactory)
                logger = scope.changelogFactory.logger(() => user);
              edit(scope, req, null, logger, true)
                .then(
                  (item) => {
                    let user = scope.auth.getUser(req);
                    return scope.workflows.performTransition(
                      item,
                      parts[0],
                      parts[1],
                      {user, lang, changeLogger: logger}
                    );
                  }
                )
                .then(
                  (result) => {
                    const log = scope.logRecorder.stop();
                    result = result instanceof Item ? prepareJSON(result, lang, user.timeZone()) : {};
                    result.__log = log;
                    res.status(200).send(result || 'done');
                  }
                )
                .catch(
                  (err) => {
                    scope.logRecorder.stop();
                    onApiError(scope, wrapError(err), res);
                  }
                );
              return;
            }
            res.status(404).send(format(t('% action handler not found', {lang}), req.body.$action));
          }
        } else {
          res.status(400).send(t('Action not specified', {lang}));
        }
      } catch (err) {
        onApiError(scope, wrapError(err), res, true);
      }
    },
    res
  );
};
