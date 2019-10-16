/**
 * Created by kras on 31.08.16.
 */
'use strict';

const locale = require('locale');
const prepareSaveData = require('../../../backend/items').prepareSaveData;
const onError = require('../../../backend/error');
const respond = require('../../../backend/respond');

module.exports = function (req, res) {
  respond(['metaRepo', 'securedDataRepo'],
    /**
     * @param {{metaRepo: MetaRepository, securedDataRepo: DataRepository, auth: Auth}} scope
     * @param {DataRepository} scope.cachedDataRepo
     */
    function (scope) {
      try {
        let locales = new locale.Locales(req.headers['accept-language']);
        let lang = locales[0] ? locales[0].language : 'ru';
        let cm = scope.metaRepo.getMeta(req.params.class);
        let user = scope.auth.getUser(req);
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
        ).then((item) => {
          if (req.body.updates) {
            let updates = prepareSaveData(req.body.updates, item.getMetaClass(), lang);
            Object.keys(updates)
              .forEach((property) => {
                item.set(property, updates[property]);
              });
            return scope.cachedDataRepo.getItem(item, null, {user, lang});
          } else {
            return item;
          }
        }).then((item) => {
          let result = {};
          let props = item.getProperties();
          for (let nm in props) {
            if (props.hasOwnProperty(nm)) {
              if (!req.body.attrs || req.body.attrs.indexOf(nm) >= 0) {
                let sl = props[nm].getSelection();
                if (Array.isArray(sl)) {
                  result[nm] = sl;
                }
              }
            }
          }
          res.send(result);
        }).catch((err) => {
          onError(scope, err, res, true);
        });
      } catch (err) {
        onError(scope, err, res, true);
      }
    },
    res
  );
};
