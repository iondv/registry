/**
 * Created by Daniil on 05.08.2016.
 */
'use strict';

const onError = require('../../../backend/error');
const respond = require('../../../backend/respond');
const itemEagerLoading = require('../../../backend/items').itemEagerLoading;
const {t} = require('@iondv/i18n');

// jshint maxstatements: 30, maxcomplexity: 30
module.exports = function (req, res) {
  respond(['metaRepo', 'dataRepo', 'signManager', 'auth'],
    /**
     * @param {{metaRepo: MetaRepository, securedDataRepo: dataRepository, signManager: DigitalSignManager, auth: Auth}} scope
     */
    function (scope) {
      try {
        let user = scope.auth.getUser(req);
        let opts = {user: user};
        opts.forceEnrichment = itemEagerLoading(req.params.class, null, scope);

        scope.securedDataRepo.getItem(req.params.class, req.params.id, opts).
        then(
          /**
           * @param {Item} item
           */
          function (item) {
            if (!item) {
              return res.status(404).send(t('Signed data object not found.', {lang: req.locals.lang}));
            }

            var objectId = item.getMetaClass().getName() + '@' + item.getItemId();
            if (req.body.action) {
              req.body.attributes.action = req.body.action;
            }
            req.body.attributes.namespace = item.getMetaClass().getNamespace();
            req.body.attributes.className = item.getMetaClass().getName();
            req.body.attributes.itemId = item.getItemId();
            req.body.attributes.user =  user;

            scope.signManager.persistSignature(objectId, req.body.data, req.body.signatures, req.body.attributes).
            then(function (signature) {
              res.status(200).send({ok: true});
            }).catch(function (err) {
              onError(scope, err, res, true);
            });
          }
        ).catch(
          function (err) {
            onError(scope, err, res, true);
          }
        );
      } catch (err) {
        onError(scope, err, res, true);
      }
    }
  );
};
