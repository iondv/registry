// jshint maxstatements: 50, maxcomplexity: 25


const onError = require('../../../backend/error');
const respond = require('../../../backend/respond');
const locale = require('locale');
const formListOptions = require('../../../backend/items').formListOptions;
const { ConditionTypes } = require('@iondv/meta-model-contracts');
const { PropertyTypes } = require('@iondv/meta-model-contracts');
const mergeConditions = require('../../../backend/items').mergeConditions;
const { data: { utils: { filterByItemIds } } } = require('@iondv/meta-model');

/**
 * @param {Object} req
 * @param {Array} req.headers
 * @param {String} req.params.class
 * @param {String} req.params.property
 * @param {Object[]|String} req.body.filter
 * @param {Object[]} req.body.attributes
 * @param {Object[]} req.body.values
 * @param {Object} res
 */
module.exports = function (req, res) {
  respond(['metaRepo', 'dataRepo', 'keyProvider'],

    /**
      * @param {{metaRepo: MetaRepository, dataRepo: DataRepository, keyProvider: KeyProvider}} scope
      */
    (scope) => {
      try {
        const locales = new locale.Locales(req.headers['accept-language']);
        const cm = scope.metaRepo.getMeta(req.params.class);
        const pm = cm.getPropertyMeta(req.params.property);
        let selectionAttribute = null;

        const filter = mergeConditions(req, pm);

        if (Array.isArray(req.body.attributes)) {
          for (let i = 0; i < req.body.attributes.length; i++) {
            if (req.body.values[i] || Number.isInteger(req.body.values[i])) {
              filter.push({
                property: req.body.attributes[i],
                operation: ConditionTypes.EQUAL,
                value: [req.body.values[i]]
              });
            } else {
              selectionAttribute = req.body.attributes[i];
              break;
            }
          }
        }

        req.body.filter = filter;
        formListOptions(req.moduleName, scope, req, locales, pm._refClass)
          .then((options) => {
            let dataPromise = null;
            if (selectionAttribute) {
              options.select = [selectionAttribute];
              options.distinct = true;
              dataPromise = scope.dataRepo.rawData(pm._refClass.getCanonicalName(), options);
            } else {
              dataPromise = scope.dataRepo.getList(pm._refClass.getCanonicalName(), options);
            }

            /**
           * @param {Array|Item[]} results
           * @returns {Object}
           */
            dataPromise.then((results) => {
              if (!results.length) {
                return results;
              }

              const scm = scope.metaRepo.getMeta(pm._refClass.getCanonicalName());
              const namedList = [];
              if (!selectionAttribute) {
                for (let i = 0; i < results.length; i++) {
                  namedList.push({
                    id: results[i].getItemId(), text: results[i].toString()
                  });
                }

                return {
                  data: namedList, total: results.total
                };
              }
              const spm = scm.getPropertyMeta(selectionAttribute);
              let finded = null;
              if (spm.selectionProvider && spm.selectionProvider.type === 'SIMPLE') {
                for (let i = 0; i < results.length; i++) {
                  finded = false;
                  for (let j = 0; j < spm.selectionProvider.list.length; j++) {
                    if (String(results[i][selectionAttribute]) === spm.selectionProvider.list[j].key) {
                      namedList.push({
                        id: results[i][selectionAttribute], text: spm.selectionProvider.list[j].value
                      });
                      finded = true;
                      break;
                    }
                  }
                  if (!finded) {
                    namedList.push({
                      id: results[i][selectionAttribute], text: results[i][selectionAttribute].toString()
                    });
                  }
                }
                return {
                  data: namedList, total: results.total
                };
              } else if (spm.selectionProvider && spm.selectionProvider.type === 'MATRIX') {
                for (let i = 0; i < results.length; i++) {
                  finded = false;
                  for (let j = 0; j < spm.selectionProvider.matrix.length; j++) {
                    for (let k = 0; k < spm.selectionProvider.matrix[j].result.length; k++) {
                      if (String(results[i][selectionAttribute]) === spm.selectionProvider.matrix[j].result[k].key) {
                        namedList.push({
                          id: results[i][selectionAttribute],
                          text: spm.selectionProvider.matrix[j].result[k].value
                        });
                        finded = true;
                        break;
                      }
                    }
                    if (finded) {
                      break;
                    }
                  }
                  if (!finded) {
                    namedList.push({
                      id: results[i][selectionAttribute], text: results[i][selectionAttribute].toString()
                    });
                  }
                }
                return {
                  data: namedList, total: results.total
                };
              } else if (spm.type === PropertyTypes.REFERENCE) {
                const tmp = [];
                for (let i = 0; i < results.length; i++) {
                  tmp.push(results[i][selectionAttribute]);
                }

                const filter = filterByItemIds(scope.keyProvider, spm._refClass, tmp);
                return scope.dataRepo.getList(spm._refClass.getCanonicalName(), {filter})
                  .then((subResults) => {
                    const res = [];
                    for (let i = 0; i < subResults.length; i++) {
                      res.push({
                        id: subResults[i].getItemId(), text: subResults[i].toString()
                      });
                    }

                    return {
                      data: res, total: results.total
                    };
                  });
              }
              for (let i = 0; i < results.length; i++) {
                namedList.push({
                  id: results[i][selectionAttribute], text: String(results[i][selectionAttribute])
                });
              }

              return {
                data: namedList, total: results.total
              };
            }).then((results) => {
              res.send(results);
            });
          })
          .catch((err) => {onError(scope, err, res, true);});
      } catch (err) {
        onError(scope, err, res, true);
      }
    },
    res);
};
