// jshint maxparams: 10

/**
 * Created by Daniil on 22.12.2016.
 */
'use strict';

const onError = require('../../../backend/error');
const respond = require('../../../backend/respond');
const locale = require('locale');
const resolvePropertyValues = require('../../../backend/items').resolvePropertyValues;
const { ConditionTypes } = require('@iondv/meta-model-contracts');
const formListOptions = require('../../../backend/items').formListOptions;
const clone = require('clone');

function getContainerProperty(metaClass) {
  return metaClass.getPropertyMeta(metaClass.getContainerReference());
}

function getContainer(metaRepo, metaClass) {
  let result = null;
  let contProperty = getContainerProperty(metaClass);
  if (contProperty) {
    result = metaRepo.getMeta(contProperty._refClass.getCanonicalName());
  }
  return result;
}

function mergeConditions(pm, selConditions) {
  let filter = [];
  if (pm && Array.isArray(pm.selConditions) && pm.selConditions.length > 0) {
    filter = filter.concat(resolvePropertyValues(clone(pm.selConditions, true), null));
  }
  if (typeof selConditions === 'object' && selConditions) {
    filter = filter.concat(resolvePropertyValues(selConditions, null));
  }
  return filter;
}

function getVariants(searchedIndex, transit, values, classes, filters, req, locales, scope) {
  let cm = classes[searchedIndex];
  let containerProperty = getContainerProperty(cm);
  let container = getContainer(scope.metaRepo, cm);
  let filter = mergeConditions(containerProperty, filters[searchedIndex]);

  if (searchedIndex > 0) {
    filter.push({
      property: containerProperty.name,
      operation: ConditionTypes.EQUAL,
      value: [transit ? transit : values[searchedIndex - 1]]
    });
  }
  req.body.filter = filter;
  return formListOptions(req.moduleName, scope, {body: {filter: filter}}, locales, classes[searchedIndex])
    .then(options => scope.dataRepo.getList(classes[searchedIndex].getCanonicalName(), options))
    .then((results) => {
      let result = {total: results.total};
      if (transit) {
        result.transit = searchedIndex;
      }
      if (results.length) {
        let data = [];
        for (let i = 0; i < results.length; i++) {
        data.push({id: results[i].getItemId(), text: results[i].toString()});
      }
      result.data = data;
    } else if (container) {
      let transitIndex = null;
      for (let i = searchedIndex; i < classes.length; i++) {
        if (i !== classes.length - 1 && classes[i].getName() === container.getName()) {
          transitIndex = i + 1;
          return getVariants(i + 1, transit ? transit : values[searchedIndex - 1],
            values, classes, filters, req, locales, scope);
        }
      }
    }
    return result;
  });
}

/**
 * @param {Object} req
 * @param {Array} req.headers
 * @param {String} req.params.class
 * @param {String} req.params.property
 * @param {Object[]|String} req.body.filter
 * @param {Object[]} req.body.values
 * @param {Object[]} req.body.filters
 * @param {Response} res
 */
module.exports = function (req, res) {
  respond(['metaRepo', 'dataRepo', 'keyProvider'],
    /**
     * @param {{metaRepo: MetaRepository, dataRepo: DataRepository, keyProvider: keyProvider}} scope
     */
    function (scope) {
      try {
        let locales = new locale.Locales(req.headers['accept-language']);
        let cm = scope.metaRepo.getMeta(req.params.class);
        let pm = cm.getPropertyMeta(req.params.property);
        let classes = [];
        let filters = [];
        let searchedIndex = 0;

        if (Array.isArray(req.body.values)) {
          classes[req.body.values.length] = pm._refClass;
          filters[req.body.values.length] =
            Array.isArray(req.body.filters) && req.body.filters.length > req.body.values.length ?
              req.body.filters[req.body.filters.length - 1] :
              req.body.filter;

          for (let i = req.body.values.length - 1; i >= 0; i--) {
            classes[i] = getContainer(scope.metaRepo, classes[i + 1]);
            filters[i] = req.body.filters[i];
            if (req.body.values[i] || req.body.values[i] === 0) {
              searchedIndex = i + 1;
              break;
            }
          }
          getVariants(searchedIndex, null, req.body.values, classes, filters, req, locales, scope)
            .then((response) => {res.send(response);})
            .catch((err) => {onError(scope, err, res, true);});
        } else {
          res.send([]);
        }
      } catch (err) {
        onError(scope, err, res, true);
      }
    },
    res
  );
};
