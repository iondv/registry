// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
/**
 * Created by kras on 28.06.16.
 */
'use strict';

const pnf = require('./404.js');
const PropertyTypes = require('core/PropertyTypes');
const moduleName = require('../../module-name');
const onError = require('../../backend/error');
const respond = require('../../backend/respond');

// jshint maxstatements: 30
module.exports = function (req, res) {
  respond(['metaRepo'],
    /**
     * @param {{metaRepo: MetaRepository}} scope
     */
    function (scope) {
      try {
        var cm = scope.metaRepo.getMeta(req.params.class);
        var pm = cm.getPropertyMeta(req.params.property);
        if (pm) {
          if (pm.type === PropertyTypes.REFERENCE && pm.refClass) {
            var rcm = scope.metaRepo.getMeta(pm.refClass, null, cm.getNamespace());
            if (rcm) {
              res.redirect('/' + moduleName + '/' + req.params.node + '/new/' + rcm.getCanonicalName());
              return;
            }
          }
        }
      } catch (err) {
        return onError(scope, err, res, true);
      }
      pnf(req, res);
    },
    res
  );
};
