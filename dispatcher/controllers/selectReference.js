// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
/**
 * Created by kras on 24.05.16.
 */
'use strict';

const pnf = require('./404.js');
const forbidden = require('./403.js');
const PropertyTypes = require('core/PropertyTypes');
const moduleName = require('../../module-name');
const onError = require('../../backend/error');
const respond = require('../../backend/respond');
const processNavigation = require('../../backend/menu').processNavigation;

// jshint maxstatements: 30
module.exports = function (req, res) {
  respond(['metaRepo', 'settings'],
    /**
     * @param {{metaRepo: MetaRepository, settings: SettingsRepository}} scope
     */
    function (scope) {
      try {
        processNavigation(scope, req)
          .then((info) => {
            let cm = info.classMeta;
            var pm = cm.getPropertyMeta(req.params.property);
            if (pm) {
              if (pm.type === PropertyTypes.REFERENCE && pm.refClass) {
                var rcm = scope.metaRepo.getMeta(pm.refClass, null, cm.getNamespace());
                if (rcm) {
                  res.redirect('/' + moduleName + '/' + req.params.node + '/' + rcm.getCanonicalName() + '?modal=1');
                  return;
                }
              }
            }
          })
          .catch((err) => {
            if (err === 404) {
              return pnf(req, res);
            }
            if (err === 403) {
              return forbidden(req, res);
            }
            onError(scope, err, res, true);
          });
      } catch (err) {
        onError(scope, err, res, true);
      }
    },
    res
  );
};
