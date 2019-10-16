/**
 * Created by kras on 24.05.16.
 */
'use strict';

const prepareJSON = require('../../../backend/items').prepareJSON;
const formFilter = require('../../../backend/items').formFilter;
const locale = require('locale');
const itemEagerLoading = require('../../../backend/items').itemEagerLoading;
const onError = require('../../../backend/error');
const respond = require('../../../backend/respond');
const moduleName = require('../../../module-name');

module.exports = function (req, res) {
  respond(['metaRepo', 'securedDataRepo', 'logRecorder', 'auth'],
    /**
     * @param {{metaRepo: MetaRepository, securedDataRepo: DataRepository, logRecorder: LogRecorder, auth: Auth}} scope
     */
    function (scope) {
      let user = scope.auth.getUser(req);
      let locales = new locale.Locales(req.headers['accept-language']);
      let lang = locales[0] ? locales[0].language : 'ru';
      try {
        scope.logRecorder.start();
        scope.securedDataRepo.getItem(
          req.params.class,
          req.params.id,
          {
            user: user,
            filter: formFilter(moduleName, scope, req),
            forceEnrichment: itemEagerLoading(scope.metaRepo.getMeta(req.params.class), null, scope, []),
            lang: lang
          }
        )
          .then(
            function (found) {
              var log = scope.logRecorder.stop();
              if (found) {
                try {
                  var item = prepareJSON(found, lang, user.timeZone());
                  if (log.length) {
                    item.__log = log;
                  }
                  res.send(item);
                } catch (err) {
                  onError(scope, err, res);
                }
              } else {
                res.status(404).send('Объект не найден');
              }
            }
          )
          .catch(
            function (err) {
              scope.logRecorder.stop();
              onError(scope, err, res);
            }
          );
      } catch (err) {
        scope.logRecorder.stop();
        onError(scope, err, res);
      }
    },
    res
  );
};
