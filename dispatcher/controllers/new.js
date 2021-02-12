/**
 * Created by kras on 24.05.16.
 */
'use strict';

const merge = require('merge');
const pnf = require('./404.js');
const forbidden = require('./403.js');
const locale = require('locale');
const buildCreateFormVm = require('../../backend/viewmodels').buildCreateFormVm;
const itemTplData = require('../../backend/items').itemTplData;
const processNavigation = require('../../backend/menu').processNavigation;
const moduleName = require('../../module-name');
const collectionTableOptions = require('../../backend/viewmodels').collectionTableOptions;
const adjustFields = require('../../backend/viewmodels').adjustFields;
const adjustSignOptions = require('../../backend/viewmodels').adjustSignOptions;
const prepareJSON = require('../../backend/items').prepareJSON;
const prepareDate = require('../../backend/items').prepareDate;
const onError = require('../../backend/error');
const respond = require('../../backend/respond');
const ActionProvider = require('../../backend/ActionProvider');
const geoFieldSearchVal = require('../../backend/viewmodels').geoFieldSearchVal;
const itemEagerLoading = require('../../backend/items').itemEagerLoading;
const vmEagerLoading = require('../../backend/items').vmEagerLoading;
const FieldTypes = require('core/FieldTypes');
const conditionParser = require('core/ConditionParser');
const PropertyTypes = require('core/PropertyTypes');
const ConditionTypes = require('core/ConditionTypes');
const mergeConditions = require('../../backend/items').mergeConditions;
const OperationTypes = require('core/OperationTypes');
const slTriggers = require('../../backend/items').selectionListTriggers;
const overrideTpl = require('../../backend/viewmodels').overrideTpl;
const Errors = require('core/errors/front-end');
const IonError = require('core/IonError');
const {t} = require('core/i18n');
const {format} = require('util');

// jshint maxstatements: 40, maxcomplexity: 20

module.exports = function (req, res) {
  respond(['metaRepo', 'securedDataRepo', 'settings', 'aclProvider', 'auth'],
    /**
     * @param {{metaRepo: MetaRepository, securedDataRepo: DataRepository, settings: SettingsRepository, auth: Auth}} scope
     * @param {AclProvider} scope.aclProvider
     */
    function (scope) {
      try {
        let user = scope.auth.getUser(req);
        let locales = new locale.Locales(req.headers['accept-language']);
        let lang = locales[0] ? locales[0].language : 'ru';
        let cm, node;
        let container = {};
        if (req.params.container && req.params.property) {
          let parts = req.params.container.split('.');
          container.class = parts[0];
          container.id = parts[1];
          container.property = req.params.property;
        }

        processNavigation(scope, req)
          .then((info) => {
            cm = info.classMeta;
            node = info.node;

            let mcm, mpm;
            if (req.query.masterClass || container.class) {
              mcm = scope.metaRepo.getMeta(req.query.masterClass || container.class, null, cm.getNamespace());
              let mpn = req.query.masterProperty || container.property;
              mpm = mcm.getPropertyMeta(mpn);
              if (!mpm) {
                throw new Error(format(t('Attribute %s not found in class "%s".'), mpn, mcm.getCaption()));
              }
            }
            let master = {
              id: req.query.masterId || container.id,
              class: req.query.masterClass || container.class,
              masterProperty: req.query.masterProperty || container.property,
              backRef: req.query.masterBackRef || (mpm && mpm.backRef),
              updates: req.body ? req.body.masterUpdates : null
            };
            let vm = scope.metaRepo.getCreationViewModel(cm.getCanonicalName(), node && `${node.namespace}@${node.code}`);

            if (!vm/* || (vm.overrideMode === 1)*/) {
              vm = buildCreateFormVm(cm, vm, req.locals.lang);
            }
            merge({tabs: [], commands: []}, vm);
            adjustFields(cm, vm, scope.metaRepo, req.locals.lang);
            if (scope.actions instanceof ActionProvider) {
              adjustSignOptions(vm, scope.actions);
            }

            if (master.id) {
              if (mpm.type === PropertyTypes.COLLECTION || mpm.type === PropertyTypes.REFERENCE) {
                if (Array.isArray(mpm.allowedSubclasses) && mpm.allowedSubclasses.length === 1) {
                  cm = scope.metaRepo.getMeta(mpm.allowedSubclasses[0], null, mcm.getNamespace());
                  req.query.force_class = true;
                }
              }
            }

            if (!req.query.force_class && cm.getDescendants().length) {
              let url = req.params.container ?
                `/${moduleName}/${req.params.node}/new/${req.params.container}/${req.params.property}/${cm.getCanonicalName()}/sub?modal=1` :
                `/${moduleName}/${req.params.node}/new/${cm.getCanonicalName()}/sub?modal=1`;
              for (let pn in req.query) {
                if (req.query.hasOwnProperty(pn)) {
                  url = url + '&' + pn + '=' + encodeURIComponent(req.query[pn]);
                }
              }
              res.redirect(url);
              return null;
            }
            let p;
            if (master.id) {
              let eagerLoading = [];
              if (node && node.eagerLoading) {
                if (node.eagerLoading.item && Array.isArray(node.eagerLoading.item[master.class])) {
                  eagerLoading = node.eagerLoading.item[master.class];
                }
              }
              let opts = {
                user,
                lang,
                forceEnrichment: itemEagerLoading(scope.metaRepo.getMeta(master.class), node && `${node.namespace}@${node.code}`, scope, eagerLoading)
              };
              p = scope.dataRepo.getItem(master.class, master.id, opts);
            } else if (master.class) {
              p = scope.dataRepo.getItem(scope.dataRepo.wrap(master.class, {}, null), null, {user, lang});
            } else {
              p = Promise.resolve(null);
            }
            return p.then((mItem) => {
              if (mItem && req.body && req.body.masterUpdates) {
                mItem = scope.dataRepo.wrap(
                  mItem.getClassName(),
                  merge.recursive(true, mItem.base, req.body.masterUpdates)
                );
              }
              master.item = mItem;
              return getDummy(scope, req, cm, vm, node, user, mItem, lang);
            }).then((dummy) => {
              if (!dummy) {
                return pnf(req, res);
              }

              if (master.item && master.backRef) {
                dummy.set(master.backRef, master.item);
              }
              res.render(overrideTpl(
                moduleName,
                'view/item',
                'create',
                req.params.node,
                cm.getCanonicalName(),
                scope.settings), itemTplData(
                {
                  baseUrl: req.app.locals.baseUrl,
                  module: moduleName,
                  classId: cm.getCanonicalName(),
                  master: master,
                  containerProperty: master.item ?
                    master.item.getMetaClass().getPropertyMeta(req.params.property || master.backRef) :
                    null,
                  title: cm.getCaption(),
                  pageCode: node && node.code,
                  node: req.params.node,
                  form: vm,
                  item: dummy,
                  selectionListTriggers: slTriggers(cm),
                  log: [],
                  user: user,
                  utils: {
                    dateCallback: (date, trimTime, iso) => prepareDate(date, iso ? null : lang, user.timeZone(), trimTime),
                    toJSON: data => prepareJSON(data, lang, user.timeZone()),
                    collectionTableOptions: collectionTableOptions(scope, node),
                    geoFieldSearchVal: geoFieldSearchVal,
                    addCollectionSyles: () => {
                    }
                  },
                  validateBy: req.params.container && req.params.property ?
                  req.params.container + '.' + req.params.property :
                    null,
                  permissions: {write: true, read: true},
                  concurencyState: null,
                  inlineForm: scope.settings.get(moduleName + '.inlineForm'),
                  checkSignState: false,
                  createByCopy: canCreateByCopy(cm.getCanonicalName(), scope.settings.get(moduleName + '.createByCopy')),
                  maxTabWidth: scope.settings.get(moduleName + '.maxTabWidth')
                },
                lang
                )
              );
            });
          })
          .catch((err) => {
            if (err === 404) {
              return pnf(req, res);
            }
            if (err === 403) {
              return forbidden(req, res);
            }
            if (err instanceof IonError && err.code === Errors.ACCESS_DENIED) {
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

function canCreateByCopy(fcn, arr) {
  if (Array.isArray(arr) && (arr.indexOf(fcn) >= 0 || arr.indexOf('*') >= 0)) {
      return true;
  }
  return false;
}

/**
 *
 * @param {Array|{}} filter
 */
function getValuesFromFilter(filter, cm, context) {
  function crawler(filter, result) {
    if (!Array.isArray(filter)) {
      filter = [filter];
    }
    for (let i = 0; i < filter.length; i++) {
      if (filter[i]) {
        if (
          filter[i].property &&
          filter[i].property !== '__class' &&
          filter[i].property !== '__classTitle' &&
          filter[i].property.indexOf('.') < 0 &&
          filter[i].operation === ConditionTypes.EQUAL
        ) {
          let pm = cm.getPropertyMeta(filter[i].property);
          if (pm) {
            let value = conditionParser.toScalar(filter[i].value, context, pm.type);
            if (value) {
              result[filter[i].property] = value;
            }
          }
        } else if (
          filter[i].operation === OperationTypes.AND &&
          filter[i].nestedConditions &&
          filter[i].nestedConditions.length
        ) {
          crawler(filter[i].nestedConditions, result);
        } else if (
          filter[i].operation === OperationTypes.OR &&
          filter[i].nestedConditions &&
          filter[i].nestedConditions.length
        ) {
          crawler(filter[i].nestedConditions[0], result);
        }
      }
    }
  }

  let result = {};
  crawler(filter, result);
  return result;
}

function enrichValidValues(metaRepo, dataRepo, found, req, cm, node, context) {
  try {
    let filter;
    let validateBy = req.params.container && req.params.property ?
    req.params.container + '.' + req.params.property : null;

    if (validateBy) {
      let parts = validateBy.split('.');
      if (parts.length > 1) {
        let cmParts = parts[0].split('@');
        let vcm = metaRepo.getMeta(cmParts[0], null, cmParts[1]);
        if (vcm) {
          let vpm = vcm.getPropertyMeta(parts[parts.length - 1]);
          filter = mergeConditions(req, vpm, context);
        }
      }
    }
    if (!filter && node && node.conditions) {
      filter = node.conditions;
    }

    if (filter) {
      let values = getValuesFromFilter(filter, cm, context);
      let promises = Promise.resolve();
      Object.keys(values).forEach(
        function (propName) {
          let pm = cm.getPropertyMeta(propName);
          if (pm) {
            if (pm.type === PropertyTypes.REFERENCE) {
              let rcm = pm._refClass;
              if (rcm) {
                promises = promises.then(
                  () => dataRepo.getItem(rcm.getCanonicalName(), values[propName])
                    .then((item) => {
                      if (item) {
                        found.set(propName, item);
                      }
                    })
                );
              }
            } else {
              found.set(propName, values[propName]);
            }
          }
        }
      );
      return promises.then(() => found);
    } else {
      return Promise.resolve(found);
    }
  } catch (err) {
    return Promise.reject(err);
  }
}

function enrichValidRefItems(metaRepo, dataRepo, found, cm, vm) {
  let conditions = {};
  let promises = Promise.resolve();
  let propertyMetas = cm.getPropertyMetas();

  propertyMetas.forEach(function (pm) {
    if (pm.type === PropertyTypes.REFERENCE &&
        pm.selConditions &&
        pm.selConditions.length &&
        pm.autoassigned) {
      conditions[pm.name] = {
        condition: pm.selConditions,
        refClass: pm.refClass
      };
    }
  });

  vm.tabs.forEach((tab) => {
    tab.fullFields.forEach((field) => {
      if (field.type === FieldTypes.REFERENCE && field.selConditions && field.selConditions.length) {
        if (conditions[field.property]) {
          conditions[field.property].condition = conditions[field.property].condition.concat(field.selConditions);
        } else {
          let rpm = cm.getPropertyMeta(field.property);
          if (rpm) {
            conditions[field.property] = {
              condition: field.selConditions,
              refClass: rpm.refClass
            };
          }
        }
      }
    });
  });

  Object.keys(conditions).forEach((key) => {
    promises = promises.then(
      () => {
        if (found.get(key)) {
          return;
        }
        let rcm = metaRepo.getMeta(conditions[key].refClass, null, cm.getNamespace());
        if (rcm) {
          let filter = conditionParser(conditions[key].condition, rcm, found);
          return dataRepo.getList(rcm.getCanonicalName(), {filter: filter, count: 1})
            .then((data) => {
              if (data[0]) {
                found.set(key, data[0]);
              }
            });
        }
      }
    );
  });
  return promises.then(() => found);
}

function getDummy(scope, req, cm, vm, node, user, context, lang) {
  let eagerLoading = [];
  if (node && node.eagerLoading) {
    if (node.eagerLoading.item && Array.isArray(node.eagerLoading.item[cm.getCanonicalName()])) {
      eagerLoading = node.eagerLoading.item[cm.getCanonicalName()];
    }
  }

  let opts = {
    user, lang,
    forceEnrichment: itemEagerLoading(cm, node && `${node.namespace}@${node.code}`, scope, eagerLoading)
  };
  opts.forceEnrichment.push(...vmEagerLoading(vm, cm));
  return scope.dataRepo.getItem(
    scope.securedDataRepo.wrap(cm.getCanonicalName(), {}, null, {user, lang}),
    null,
    opts)
    .then(found => enrichValidValues(scope.metaRepo, scope.dataRepo, found, req, cm, node, context))
    .then(found => enrichValidRefItems(scope.metaRepo, scope.dataRepo, found, cm, vm));
}
