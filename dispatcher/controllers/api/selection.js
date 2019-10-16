/**
 * Created by kras on 01.06.16.
 */
'use strict';

const prepareJSON = require('../../../backend/items').prepareJSON;
const formListOptions = require('../../../backend/items').formListOptions;
const locale = require('locale');
const onError = require('../../../backend/error');
const respond = require('../../../backend/respond');
const mergeConditions = require('../../../backend/items').mergeConditions;
const moduleName = require('../../../module-name');
const prepareSaveData = require('../../../backend/items').prepareSaveData;
const overrideSearchOptions = require('../../../backend/items').overrideSearchOptions;

// jshint maxstatements: 40, maxcomplexity: 20, maxdepth: 20
module.exports = function (req, res) {
  respond(['metaRepo', 'securedDataRepo', 'logRecorder', 'auth', 'settings'],
    /**
     * @param {{metaRepo: MetaRepository, securedDataRepo: DataRepository, auth: Auth}} scope
     * @param {AccessChecker} scope.accessChecker
     */
    function (scope) {
      try {
        let user = scope.auth.getUser(req);
        let locales = new locale.Locales(req.headers['accept-language']);
        let lang = locales[0] ? locales[0].language : 'ru';
        let cm = scope.metaRepo.getMeta(req.params.class);
        let pm = cm.getPropertyMeta(req.params.property);
        (
          req.body.itemId ?
            scope.securedDataRepo.getItem(cm.getCanonicalName(), req.body.itemId, {user, lang}) :
            scope.dataRepo.getItem(
              scope.securedDataRepo.wrap(
                cm.getCanonicalName(),
                prepareSaveData(req.body.updates || {}, cm, lang),
                null,
                {autoassign: true, user, lang}
              ),
              null,
              {user, lang}
            )
        )
          .then((context) => {
            let filter = mergeConditions(req, pm, context);
            req.body.filter = filter;

            req.body.searchOptions = overrideSearchOptions(
              moduleName,
              {},
              '*',
              pm._refClass.getCanonicalName(),
              scope.settings);


            return formListOptions(moduleName, scope, req, locales, pm._refClass)
              .then((lo) => {
                lo.user = user;
                return scope.securedDataRepo.getList(pm._refClass.getCanonicalName(), lo);
              });
          })
          .then((list) => {
            res.send({
              draw: parseInt(req.body.draw),
              recordsTotal: list.total,
              recordsFiltered: list.total,
              data: prepareJSON(list, lang, user.timeZone(), pm)
            });
          })
          .catch((err) => {
            onError(scope, err, res, true);
          });
      } catch (err) {
        onError(scope, err, res, true);
      }
    },
    res
  );
};
