/**
 * Created by Daniil on 10.02.2017.
 */

'use strict';

const respond = require('../../../backend/respond');
const onError = require('../../../backend/error');
const locale = require('locale');
const PropertyTypes = require('core/PropertyTypes');
const formListOptions = require('../../../backend/items').formListOptions;
const moduleName = require('../../../module-name');
const F = require('core/FunctionCodes');

/**
 * @param {Object} req
 * @param {Array} req.headers
 * @param {String} req.params.class
 * @param {String} req.params.property
 * @param {String} req.body.search
 * @param {String} req.body.length
 * @param {Object} res
 */
module.exports = function (req, res) {
  respond(['metaRepo', 'dataRepo', 'auth'],
    /**
     * @param {{metaRepo: MetaRepository, dataRepo: DataRepository, auth: Auth}} scope
     */
    function (scope) {
      try {
        let locales = new locale.Locales(req.headers['accept-language']);
        let cm = scope.metaRepo.getMeta(req.params.class);
        let pm = cm.getPropertyMeta(req.params.property);

        if (pm.type === PropertyTypes.USER) {
          scope.auth.userSearch(req.body.search).then((values) => {
            res.send(values);
          });
        } else {
          formListOptions(moduleName, scope, req, locales, cm)
            .then((options)=> {
              options.filter = {[F.LIKE]: ['$' + pm.name, '^' + req.body.search]};
              options.fields = {};
              options.fields[pm.name] = "$" + pm.name;
              options.countTotal = false;
              options.aggregates = {_count: {$count: "count"}};
              options.sort = {_count: -1};
              options.count = parseInt(req.body.length);

              scope.dataRepo.aggregate(cm.getCanonicalName(), options)
                .then((results) => {
                  let values = [];
                  for (let i = 0; i < results.length; i++) {
                    values.push(results[i][pm.name]);
                  }
                  res.send(values);
                });
            })
            .catch((err) => {
              onError(scope, err, res, true);
            });
        }
      } catch (err) {
        onError(scope, err, res, true);
      }
    },
    res);
};
