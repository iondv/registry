/**
 * Created by Daniil on 05.08.2016.
 */
'use strict';

const onError = require('../../../backend/error');
const respond = require('../../../backend/respond');
const base64 = require('base64-js');
const itemEagerLoading = require('../../../backend/items').itemEagerLoading;

// jshint maxcomplexity: 30
module.exports = function (req, res) {
  respond(['metaRepo', 'dataRepo', 'signManager', 'auth'],
    /**
     * @param {{metaRepo: MetaRepository, securedDataRepo: DataRepository, signManager: DigitalSignManager, auth: Auth}} scope
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
              return res.status(404).send('Не найден подписываемый объект данных.');
            }

            scope.signManager.getDataForSigning(
              item,
              req.body.action
            ).
            then(
              function (data) {
                var i;
                if (!data) {
                  return res.status(200).send('');
                }

                try {
                  if (Array.isArray(data)) {
                    for (i = 0; i < data.length; i++) {
                      if (Buffer.isBuffer(data[i])) {
                        data[i] = base64.fromByteArray(data[i]);
                      } else if (typeof data[i] === 'object' && Buffer.isBuffer(data[i].content)) {
                        data[i].content = base64.fromByteArray(data[i].content);
                      }
                    }
                    return res.status(200).send({parts: data, attributes: {}});
                  }

                  if (Buffer.isBuffer(data)) {
                    return res.status(200).send(
                      {
                        parts: [{mimeType: 'application/octet-stream', content: base64.fromByteArray(data)}],
                        attributes: {}
                      }
                    );
                  }

                  if (data && typeof data === 'object' && Buffer.isBuffer(data.content)) {
                    data.content = base64.fromByteArray(data.content);
                  }

                  if (data) {
                    res.status(200).send(data ? {parts: [data], attributes: {}} : {});
                  }
                } catch (err) {
                  onError(scope, err, res, true);
                }
              }
            ).catch(function (err) {
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

