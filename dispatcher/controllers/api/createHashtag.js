/**
 * Created by kalias_90 on 29.05.17.
 */

'use strict';

const onError = require('../../../backend/error');
const respond = require('../../../backend/respond');
const locale = require('locale');
const prepareJSON = require('../../../backend/items').prepareJSON;
const {t} = require('@iondv/i18n');

module.exports = function (req, res) {
  respond(['metaRepo', 'securedDataRepo', 'logRecorder', 'auth', 'changelogFactory'],
    /**
     * @param {{metaRepo: MetaRepository, securedDataRepo: DataRepository, logRecorder: LogRecorder, auth: Auth, changelogFactory: DsChangeLogFactory}} scope
     */
    function (scope) {
      try {
        let locales = new locale.Locales(req.headers['accept-language']);
        let lang = locales[0] ? locales[0].language : 'ru';
        let logger = null;
        let user = scope.auth.getUser(req);
        if (scope.changelogFactory)
          logger = scope.changelogFactory.logger(() => user);
        scope.logRecorder.start();

        let cm = scope.metaRepo.getMeta(req.params.class);
        let pm = cm.getPropertyMeta(req.params.property);
        let ic = scope.metaRepo.getMeta(pm.itemsClass, cm.getVersion(), cm.getNamespace());
        scope.securedDataRepo.createItem(
          ic.getCanonicalName(),
          {[ic.getSemanticAttrs()[0]]: req.body.term},
          ic.getVersion(),
          logger, {uid: user.id()}
        ).then(function (result) {
          var log = scope.logRecorder.stop();
          if (result) {
            result = prepareJSON(result, lang, user.timeZone());
            if (log.length) {
              result.__log = log;
            }
            return res.send(result);
          } else {
            res.status(500).send(t('Object creation failed.', {lang}));
          }
        }).catch(function (err) {
          scope.logRecorder.stop();
          onError(scope, err, res);
        });
      } catch (err) {
        scope.logRecorder.stop();
        onError(scope, err, res, true);
      }
    },
    res);
};