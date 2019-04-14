// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
/**
 * Created by kras on 24.05.16.
 */
'use strict';

var pnf = require('./404.js');
var PropertyTypes = require('core/PropertyTypes');
var moduleName = require('../../module-name');
var canonicNode = require('../../backend/menu').canonicNode;
var onError = require('../../backend/error');
const respond = require('../../backend/respond');

// jshint maxstatements: 30
module.exports = function (req, res) {
  respond(['metaRepo', 'settings'],
    /**
     * @param {{metaRepo: MetaRepository, settings: SettingsRepository}} scope
     */
    function (scope) {
      try {
        var n = canonicNode(req.params.node);
        var node = scope.metaRepo.getNode(n.code, n.ns);
        if (node) {
          var cm = scope.metaRepo.getMeta(req.params.class, null, n.ns);
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
        }
        pnf(req, res);
      } catch (err) {
        onError(scope, err, res, true);
      }
    },
    res
  );
};
