'use strict';

const locale = require('locale');
const prepareSaveData = require('../../../backend/items').prepareSaveData;
const prepareJSON = require('../../../backend/items').prepareJSON;
const applyCollections = require('../../../backend/items').applyCollections;
const onError = require('../../../backend/error');
const respond = require('../../../backend/respond');

/* jshint maxstatements: 40, maxcomplexity: 20, maxdepth: 15 */

module.exports = function (req, res) {
  respond(['metaRepo', 'securedDataRepo', 'logRecorder', 'auth', 'changelogFactory'],
    /**
     * @param {{metaRepo: MetaRepository, securedDataRepo: DataRepository, auth: Auth, changelogFactory: DsChangeLogFactory}} scope
     * @param {LogRecorder} scope.logRecorder
     * @param {AccessChecker} scope.accessChecker
     */
    function (scope) {
      try {
        let cm = scope.metaRepo.getMeta(req.params.class);
        let locales = new locale.Locales(req.headers['accept-language']);
        let lang = locales[0] ? locales[0].language : 'ru';
        let updates = prepareSaveData(req.body, cm, locales[0] ? locales[0].language : 'ru');
        let logger = null;
        let user = scope.auth.getUser(req);
        if (scope.changelogFactory)
          logger = scope.changelogFactory.logger(() => user);
        scope.logRecorder.start();
        scope.securedDataRepo.createItem(cm.getCanonicalName(), updates, cm.getVersion(), logger, {user: user}).
        then(function (result) {
          return applyCollections(result, req.body, scope.metaRepo, scope.securedDataRepo, user);
        }).
        then(
          function (result) {
            var log = scope.logRecorder.stop();
            if (result) {
              result = prepareJSON(result, lang, user.timeZone());
              if (log.length) {
                result.__log = log;
              }
              return res.send(result);
            } else {
              res.status(500).send('Обьект не был создан.');
            }
          }
        ).
        catch(function (err) {
          scope.logRecorder.stop();
          onError(scope, err, res);
        });
      } catch (err) {
        scope.logRecorder.stop();
        onError(scope, err, res, true);
      }
    },
    res
  );
};
