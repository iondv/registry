'use strict';

const locale = require('locale');
const prepareSaveData = require('../../../backend/items').prepareSaveData;
const applyCollections = require('../../../backend/items').applyCollections;
const prepareJSON = require('../../../backend/items').prepareJSON;
const onError = require('../../../backend/error');
const respond = require('../../../backend/respond');

/* jshint maxstatements: 40, maxcomplexity: 20, maxdepth: 15 */

module.exports = function (req, res) {
  respond(['metaRepo', 'securedDataRepo', 'logRecorder', 'auth', 'changelogFactory'],
    /**
     * @param {{metaRepo: MetaRepository, securedDataRepo: DataRepository, logRecorder: LogRecorder, auth: Auth, changelogFactory: DsChangeLogFactory}} scope
     */
    function (scope) {
      try {
        let cm = scope.metaRepo.getMeta(req.params.class);
        let locales = new locale.Locales(req.headers['accept-language']);
        let lang = locales[0] ? locales[0].language : 'ru';
        let updates = prepareSaveData(req.body, cm, lang);
        let logger = null;
        let user = scope.auth.getUser(req);
        if (scope.changelogFactory)
          logger = scope.changelogFactory.logger(() => user);
        scope.logRecorder.start();
        scope.securedDataRepo.editItem(req.params.class, req.params.id, updates, logger, {user: user}).
        then(function (result) {
          return applyCollections(result, req.body, scope.metaRepo, scope.securedDataRepo, logger, user);
        }).
        then(function (result) {
          var log = scope.logRecorder.stop();
          if (result) {
            result = prepareJSON(result, lang, user.timeZone());
            if (log.length) {
              result.__log = log;
            }
            return res.send(result);
          }
          res.status(500).send('Ошибка при сохранении объекта');
        }).
        catch(
          function (err) {
            scope.logRecorder.stop();
            onError(scope, err, res, true);
          }
        );
      } catch (err) {
        scope.logRecorder.stop();
        onError(scope, err, res, true);
      }
    },
    res
  );
};
