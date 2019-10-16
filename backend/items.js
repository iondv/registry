/* eslint no-multi-assign:off */
/**
 * Created by kras on 03.06.16.
 */

const merge = require('merge');
const PropertyTypes = require('core/PropertyTypes');
const FieldTypes = require('core/FieldTypes');
const FieldModes = require('core/FieldModes');
const {Item} = require('core/interfaces/DataRepository');
const moment = require('moment-timezone');
const strToDate = require('core/strToDate');
const Busboy = require('busboy');
const locale = require('locale');
const buf = require('core/buffer');
const conditionParser = require('core/ConditionParser');
const sortingParser = require('core/SortingParser');
const clone = require('clone');
const isEmpty = require('core/empty');
const searchFilter = require('core/interfaces/DataRepository/lib/util').textSearchFilter;
const IonError = require('core/IonError');
const Errors = require('core/errors/validation');
const {isSchedule} = require('core/util/schedule');
const moduleName = require('../module-name');
const F = require('core/FunctionCodes');
const {canonicNode} = require('./menu');
const path = require('path');
const {parametrize} = require('core/util/formula');

const prepareDate = module.exports.prepareDate = (date, lang, tz, trimTime) => {
  if (date) {
    let dt;
    if (date instanceof Date && (typeof date.utcOffset !== 'undefined'))
      dt = moment(date).utcOffset(date.utcOffset);
    else
      dt = tz ? moment(date).tz(tz) : moment(date);

    if (lang) {
      dt.locale(lang);
      if (trimTime)
        return dt.format('L');

      return dt.format('L LT');
    }
    return dt.format();
  }
  return '';
};

/**
 * @param {*} data
 * @param {*} propM
 * @param {*} dateCallback
 * @param {*} processed
 * @param {*} level
 */
function prepareJSON(data, propM, dateCallback, processed, level) {
  processed = processed || {};
  if (data instanceof Item && typeof data.classMeta !== 'undefined') {
    let item;
    const id = `${data.getClassName()}@${data.getItemId()}`;
    if (level > 0 && typeof processed[id] !== 'undefined') {
      item = processed[id];
      return {
        _id: item._id,
        __class: item.__class,
        __classTitle: item.__classTitle,
        __string: item.__string,
        __permissions: item.permissions
      };
    }

    item = {};
    item._creator = data.getCreator();
    item._editor = data.getEditor();
    const sg = propM ? propM.semanticGetter : null;
    item.__string = data.toString(sg, dateCallback);
    processed[`${data.getClassName()}@${data.getItemId()}`] = item;
    const props = data.getProperties();
    for (const nm in props) {
      if (typeof props[nm] !== 'undefined') {
        /**
         * @type {Property}
         */
        const p = props[nm];
        if (p.getType() === PropertyTypes.REFERENCE) {
          item[p.getName()] = p.getValue();
          const refItem = data.getAggregate(p.getName());
          if (refItem)
            item[`${p.getName()}_ref`] = prepareJSON(refItem, p.meta, dateCallback, processed, level + 1);

          item[`${p.getName()}_str`] = p.getDisplayValue(dateCallback);
        } else if (p.getType() === PropertyTypes.COLLECTION) {
          item[p.getName()] = prepareJSON(data.getAggregates(p.getName()), p.meta, dateCallback, processed, level + 1);
        } else if (p.getType() === PropertyTypes.DATETIME) {
          item[p.getName()] = prepareDate(p.getValue());
        } else {
          item[p.getName()] = p.getValue();
        }
        if (p.meta.selectionProvider)
          item[`${p.getName()}_str`] = p.getDisplayValue(dateCallback);
      }
    }
    if (data.hasOwnProperty('__styles'))
      item.__styles = data.__styles;

    item._id = data.getItemId();
    item.__permissions = data.permissions;
    return item;
  }

  if (Array.isArray(data)) {
    const result = [];
    for (let i = 0; i < data.length; i++)
      result.push(prepareJSON(data[i], propM, dateCallback, processed, level));

    return result;
  }

  return null;
}

const prepJSON = module.exports.prepareJSON = function(data, lang, tz, pm) {
  return prepareJSON(data, pm, date => prepareDate(date, lang, tz), {}, 0);
};

function addPeriodPart(period, v, lang, cm, pm) {
  let dt;
  if (v) {
    dt = strToDate(v, lang);
    if (!dt) {throw new IonError(Errors.INCORRECT_VALUE.PERIOD, {
      'class': cm.getCaption(), property: pm.caption
    });
}

    period.push(dt);
  } else {
    period.push(null);
  }
}

/**
 * @param {String} name
 * @param {ClassMeta} cm
 */
function findPropertyMeta(name, cm) {
  let pm = cm.getPropertyMeta(name);
  let dot;
  if (pm) {
    return pm;
  } else if ((dot = name.indexOf('.')) >= 0) {
    pm = cm.getPropertyMeta(name.substring(0, dot));
    if (pm && pm.type === PropertyTypes.REFERENCE)
      return findPropertyMeta(name.substring(dot + 1), pm._refClass);
  }
  return null;
}

/**
 * @param {{}} data
 * @param {ClassMeta} cm
 * @param {String} lang
 * @returns {{}|*}
 */
const prepareSaveData = module.exports.prepareSaveData = (data, cm, lang) => {
  const result = {};
  for (const nm in data) {
    if (typeof data.hasOwnProperty === 'undefined' || data.hasOwnProperty(nm)) {
      const pm = findPropertyMeta(nm, cm);
      if (pm) {
        if (pm.type === PropertyTypes.DATETIME) {
          if (data[nm]) {
            const dt = strToDate(data[nm], lang);
            if (dt) {result[nm] = dt;} else {throw new IonError(Errors.INCORRECT_VALUE.DATETIME, {
              'class': cm.getCaption(), property: pm.caption
            });
}
          } else {
            result[nm] = null;
          }
        } else if (pm.type === PropertyTypes.PERIOD) {
          if (Array.isArray(data[nm]) && data[nm].length) {
            result[nm] = [];
            addPeriodPart(result[nm], data[nm][0], lang, cm, pm);
            addPeriodPart(result[nm], data[nm][1], lang, cm, pm);
          } else {
            result[nm] = null;
          }
        } else if (pm.type === PropertyTypes.BOOLEAN) {
          let dt = data[nm];
          if (dt === null || dt === 'null') {
            result[nm] = null;
          } else if (typeof dt === 'string') {
            dt = dt.toLowerCase();
            result[nm] = Boolean(dt === 'on' || dt === 'yes' || dt === 'true' || parseInt(dt));
          } else {
            result[nm] = Boolean(dt);
          }
        } else if (pm.type === PropertyTypes.SCHEDULE) {
          let dt = data[nm];
          if (typeof dt === 'string')
            dt = JSON.parse(dt);

          let valid = true;
          if (Array.isArray(dt)) {
            for (let i = 0; i < dt.length; i++) {
              valid = isSchedule(dt[i]);
              if (!valid)
                break;
            }
          } else if (typeof dt === 'object') {
            valid = isSchedule(dt);
          }
          if (!valid)
            throw new Error(`Некорректное значение расписания передано в атрибут ${cm.getCaption()}.${pm.caption}`);
          else
            result[nm] = dt;
        } else if (pm.type !== PropertyTypes.COLLECTION) {
          let dt = data[nm];
          if (
            pm.type === PropertyTypes.INT ||
            pm.type === PropertyTypes.DECIMAL ||
            pm.type === PropertyTypes.REAL
          ) {
            if (dt === '')
              dt = null;

            if (typeof dt === 'string') {
              if (pm.type === PropertyTypes.INT)
                dt = parseInt(dt);
              else
                dt = parseFloat(dt);


              if (data[nm] !== String(dt)) {
                let msg;
                switch (pm.type) {
                  case PropertyTypes.INT: msg = Errors.INCORRECT_VALUE.INT; break;
                  case PropertyTypes.DECIMAL: msg = Errors.INCORRECT_VALUE.DECIMAL; break;
                  case PropertyTypes.REAL: msg = Errors.INCORRECT_VALUE.REAL; break;
                  default: msg = Errors.INCORRECT_VALUE.DEFAULT;
                }
                throw new IonError(msg, {
                  'class': cm.getCaption(), property: pm.caption
                });
              }
            }
          } else if (pm.type === PropertyTypes.STRING || pm.type === PropertyTypes.TEXT) {
            dt = dt.trim();
          }
          result[nm] = dt;
        }
      }
    }
  }
  return result;
};

module.exports.itemTplData = function(base, lang) {
  base.PropertyTypes = PropertyTypes;
  base.FieldTypes = FieldTypes;
  base.FieldModes = FieldModes;
  base.locale = {
    lang,
    dateFormat: moment.localeData(lang).longDateFormat('L'),
    dateTimeFormat: `${moment.localeData(lang).longDateFormat('L')} ${moment.localeData(lang).longDateFormat('LT')}`,
    formatDate(d) {return base.utils && base.utils.dateCallback && base.utils.dateCallback(d, true);},
    formatDateTime(dt) {return base.utils && base.utils.dateCallback && base.utils.dateCallback(dt);}
  };
  base.shortView = base.shortView || false;
  base.globalReadonly = base.globalReadonly || false;
  base.condensedView = base.condensedView || false;
  base.master = base.master || {};
  base.master.id = base.master.id || '';
  base.master.class = base.master.class || '';
  base.master.backRef = base.master.backRef || '';
  base.master.backRefUrlPattern = base.master.backRefUrlPattern || '';
  base.master.shortClass = base.master.class.split('@')[0];
  base.permissions = base.permissions || {};
  base.logo = base.logo || null;
  base.refShortViewDelay = base.refShortViewDelay === undefined ? 0 : base.refShortViewDelay;
  base.refShortViewFields = base.refShortViewFields || [];
  base.hideModalHeader = base.hideModalHeader === undefined ? false : base.hideModalHeader;
  base.moment = moment;
  return base;
};

/*
Function getFieldMap(form, fieldView) {
  let map = {};
  for (let tab of form.tabs) {
    indexFieldsByName(tab[fieldView], map);
  }
  return map;
}

function indexFieldsByName(items, map) {
  for (let item of items) {
    map[item.property] = item;
    if (item.fields.length) {
      indexFieldsByName(item.fields, map);
    }
  }
}
 */
function parseMultipart(req, callback) {
  const busboy = new Busboy({headers: req.headers});
  const result = {};
  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    const buffer = [];
    file.on('data', (data) => {
      Array.prototype.push.apply(buffer, data);
    });
    file.on('end', () => {
      result[fieldname] = {
        name: filename,
        encoding,
        mimetype,
        size: buffer.length,
        buffer: buf(buffer)
      };
    });
  });
  busboy.on('field', (fieldname, val /* , fieldnameTruncated, valTruncated, encoding, mimetype */) => {
    result[fieldname] = val;
  });
  busboy.on('finish', () => {
    callback(null, result);
  });
  req.pipe(busboy);
}

module.exports.parseMultipart = parseMultipart;

/**
 * @param {ClassMeta} cm
 * @param {{}} setting
 */
function getClassFilters(cm, setting) {
  if (!setting)
    return null;

  const cf = setting[cm.getName()];
  if (!cf && cm.getAncestor())
    return getClassFilters(cm.getAncestor(), setting);

  return cf;
}

/**
 * @param {String} moduleName
 * @param {{auth: Auth, settings: SettingsRepository, metaRepo: MetaRepository, sysLog: Logger}} scope
 * @param {{}} req
 * @param {{}} locales
 * @param {ClassMeta} [cm]
 * @returns {{offset: Number, count: Number, countTotal: Boolean, nestingDepth: Number}}
 * @constructor
 */
function FormListOptions(moduleName, scope, req, locales, cm) {
  cm = cm || scope.metaRepo.getMeta(req.params.class);
  const options = {
    countTotal: true,
    nestingDepth: 0
  };
  if (req.body.start)
    options.offset = parseInt(req.body.start);

  if (req.body.length)
    options.count = parseInt(req.body.length);

  const lang = locales[0] ? locales[0].language : 'ru';
  options.lang = lang;
  const user = scope.auth.getUser(req);
  const context = clone(user.properties() || {});
  context.$uid = user.id();
  if (cm) {
    let filter;
    try {
      filter = typeof req.body.filter === 'string' ? JSON.parse(req.body.filter) : req.body.filter;
    } catch (err) {
      scope.sysLog.warn(err);
      filter = null;
    }
    if (!filter && req.query.filter) {
      try {
        filter = typeof req.query.filter === 'string' ? JSON.parse(decodeURIComponent(req.query.filter)) :
          req.query.filter;
      } catch (err) {
        scope.sysLog.warn(err);
        filter = null;
      }
    }
    if (filter)
      filter = Array.isArray(filter) ? conditionParser(filter, cm, context, lang) : parametrize(filter, context);


    const cf = getClassFilters(cm, scope.settings.get(`${moduleName}.classFilters`));
    if (cf) {
      const ef = Array.isArray(cf) ? conditionParser(cf, cm, context) : parametrize(cf, context);
      filter = filter ? {[F.AND]: [filter, ef]} : ef;
    }

    if (req.body.query || req.query.query) {
      const query = req.body.query || req.query.query;
      let cq = null;
      try {
        cq = scope.queryParser.parse(query.trim(), cm);
      } catch (e) {
        cq = null;
        scope.sysLog.error(e);
      }
      if (cq)
        filter = filter ? {[F.AND]: [filter, cq]} : cq;
    }

    if (req.body.viewFilters) {
      const fltrs = req.body.viewFilters.and ? req.body.viewFilters.and : [req.body.viewFilters];
      fltrs.forEach((f) => {
        const oper = Object.keys(f)[0];
        const pm = cm.getPropertyMeta(f[oper][0].slice(1));
        if (pm.type === PropertyTypes.DATETIME)
          f[oper][1] = moment(f[oper][1]).toDate();
      });
      filter = filter ? {[F.AND]: [filter, req.body.viewFilters]} : req.body.viewFilters;
    }

    if (req.body.sorting)
      options.sort = sortingParser(req.body.sorting);

    if (req.body.order instanceof Array) {
      if (typeof options.sort === 'undefined')
        options.sort = {};

      for (const order of req.body.order) {
        const nm = req.body.columns[order.column].data;
        let pm = cm.getPropertyMeta(nm);
        if (!pm)
          pm = cm.getPropertyMeta(nm.replace(/_str$/, ''));

        if (pm)
          options.sort[pm.name] = order.dir === 'desc' ? -1 : 1;
      }
    }

    let sfp = null;
    const searchOptions = req.body.searchOptions || {};
    const limit = overrideSearchMinLength(moduleName, scope.settings, searchOptions);
    if (req.body.search && req.body.search.value) {
      const and = [];
      if (filter)
        and.push(filter);

      const searchFilterOpts = Object.assign(searchOptions, {strictSearch: req.body.search.value.length < limit});
      sfp = searchFilter(scope, cm, searchFilterOpts, req.body.search.value, lang, true, null, searchOptions.refDepth)
        .then((sf) => {
          if (sf)
            and.push(sf);

          if (and.length) {
            if (and.length === 1)
              filter = and[0];
            else
              filter = {[F.AND]: and};
          }
        });
    } else {
      sfp = Promise.resolve();
    }

    return sfp.then(() => {
      if (filter)
        options.filter = filter;


      if (req.body.needed && typeof req.body.needed === 'object')
        options.needed = req.body.needed;


      if (Array.isArray(req.body.eagerLoading)) {
        options.forceEnrichment = [];
        req.body.eagerLoading.forEach((path) => {
          options.forceEnrichment.push(path.split('.'));
        });
      }
      return options;
    });
  }
  return Promise.resolve(options);
}

module.exports.formListOptions = FormListOptions;

/**
 * @param {String} moduleName
 * @param {{auth: Auth, metaRepo: MetaRepository, settings: SettingsRepository}} scope
 * @param {{}} req
 * @param {ClassMeta} [cm]
 */
function formFilter(moduleName, scope, req, cm) {
  cm = cm || scope.metaRepo.getMeta(req.params.class);
  const user = scope.auth.getUser(req);
  const context = clone(user.properties() || {});
  context.$uid = user.id();
  const cf = getClassFilters(cm, scope.settings.get(`${moduleName}.classFilters`));
  if (cf)
    return Array.isArray(cf) ? conditionParser(cf, cm, context) : parametrize(cf, context);

  return null;
}

module.exports.formFilter = formFilter;

/**
 * @param {Array} changes
 */
function mergeChanges(changes) {
  const result = {
    put: [],
    eject: []
  };

  const actions = {};

  for (let i = 0; i < changes.length; i++) {
    if (changes[i].action === 'put' || changes[i].action === 'eject')
      actions[changes[i].id] = changes[i].action;
  }

  for (const id in actions) {
    if (actions.hasOwnProperty(id)) {
      switch (actions[id]) {
        case 'put': result.put.push(id); break;
        case 'eject': result.eject.push(id); break;
        default:
          throw new Error('Invalid action specified!');
      }
    }
  }

  return result;
}

function prepareDetailIds(pm, ids) {
  const result = [];
  let tmp;
  for (let i = 0; i < ids.length; i++) {
    tmp = ids[i];
    if (
      pm.type === PropertyTypes.INT ||
      pm.type === PropertyTypes.DECIMAL ||
      pm.type === PropertyTypes.REAL
    )
      tmp = parseFloat(tmp);

    result.push(tmp);
  }
  return result;
}

/**
 * @param {MetaRepository} metaRepo
 * @param {DataRepository} dataRepo
 * @param {Item} master
 * @param {String} collection
 * @param {Array} details
 * @param {ChangeLogger} changeLog
 * @param {Boolean} operation
 * @param {String} user
 */
function applyDetails(metaRepo, dataRepo, master, collection, details, changeLog, operation, user) {
  return function() {
    const p = master.property(collection);
    if (!p || p.getType() !== PropertyTypes.COLLECTION)
      throw new Error(`Не найден атрибут коллекции ${collection}`);


    const dc = metaRepo.getMeta(p.meta.itemsClass,
      master.getMetaClass().getVersion(),
      master.getMetaClass().getNamespace());

    if (!dc)
      throw new Error(`Не найден класс элементов коллекции ${collection}`);


    const f = {[F.IN]: [`$${dc.getKeyProperties()[0]}`, prepareDetailIds(dc.getPropertyMeta(dc.getKeyProperties()[0]), details)]};

    return dataRepo.getList(dc.getCanonicalName(), {
      filter: f, user
    })
      .then(details => operation ?
        dataRepo.put(master, collection, details, changeLog, {user}) :
        dataRepo.eject(master, collection, details, changeLog, {user}));
  };
}

/**
 * @param {Item} master
 * @param {{}} data
 * @param {MetaRepository} metaRepo
 * @param {DataRepository} dataRepo
 * @param {ChangeLogger} changeLog
 * @param {User} user
 * @returns {*}
 */
function applyCollections(master, data, metaRepo, dataRepo, changeLog, user) {
  if (!master)
    return Promise.resolve();

  let workers = Promise.resolve();
  for (const nm in data) {
    if (data.hasOwnProperty(nm)) {
      const pm = master.property(nm);
      if (pm && pm.getType() === PropertyTypes.COLLECTION) {
        const actions = mergeChanges(data[nm]);
        if (actions.eject.length)
          workers = workers.then(applyDetails(metaRepo, dataRepo, master, nm, actions.eject, changeLog, false, user));


        if (actions.put.length)
          workers = workers.then(applyDetails(metaRepo, dataRepo, master, nm, actions.put, changeLog, true, user));
      }
    }
  }

  return workers.then(() => master);
}

module.exports.applyCollections = applyCollections;

function prepareConditions(condition) {
  if (Array.isArray(condition)) {
    const arrResult = [];
    condition.forEach((c) => {
      arrResult.push(prepareConditions(c));
    });
    return arrResult;
  }
  if (Array.isArray(condition.value)) {
    const tmpValue = [];
    condition.value.forEach((v) => {
      if (v[0] === '$')
        tmpValue.push(`$$master.${v.substring(1)}`);
      else
        tmpValue.push(v);
    });
    condition.value = tmpValue;
  }
  condition.nestedConditions = prepareConditions(condition.nestedConditions);
  return condition;
}

/**
 * @param {{metaRepo: MetaRepository, securedDataRepo: SecuredDataRepository, auth: Auth, calculator: Calculator}} scope
 * @param {DsChangelogFactory} scope.changelogFactory
 * @param {Request} req
 * @param {Function} [updator]
 * @param {ChangeLogger} [logger]
 * @param {Boolean} [noconvert]
 * @returns {Promise}
 */
function saveItem(scope, req, updator, logger, noconvert) {
  try {
    const cm = scope.metaRepo.getMeta(req.params.class);
    const locales = new locale.Locales(req.headers['accept-language']);
    const lang = locales[0] ? locales[0].language : 'ru';
    let master;
    if (req.body.$masterProperty && req.body.$masterClass && req.body.$masterId) {
      master = {
        'class': req.body.$masterClass,
        id: req.body.$masterId,
        property: req.body.$masterProperty
      };
    }

    let updates = prepareSaveData(req.body, cm, lang);
    const user = scope.auth.getUser(req);

    if (typeof updator === 'function')
      updates = updator(cm, updates);

    let worker;

    let validateConditions;

    const noData = isEmpty(updates);

    if (req.body.validateBy && (!noData || !req.params.id)) {
      const vp = req.body.validateBy.split('.');

      if (vp.length > 1) {
        const vcm = scope.metaRepo.getMeta(vp[0]);
        const propertyName = vp[vp.length - 1];
        validateConditions = vcm.getPropertyMeta(propertyName).selConditions;
        if (validateConditions) {
          if (Array.isArray(validateConditions)) {
            validateConditions = conditionParser(prepareConditions(clone(validateConditions, true)),
              cm, null, lang);
          }
          let checker;
          if (validateConditions)
            checker = scope.calculator.parseFormula(validateConditions);


          if (typeof checker === 'function') {
            const itemGetter = vp.length === 3 ?
              scope.dataRepo.getItem(vp[0], vp[1], {lang}) :
              scope.dataRepo.getItem(scope.dataRepo.wrap(vp[0], {}, null, {lang}));
            worker = itemGetter
              .then((vc) => {
                if (vc && req.body.$master)
                  return scope.dataRepo.wrap(vp[0], merge.recursive(true, vc.base, req.body.$master), null, {lang});

                return vc;
              })
              .then(

                /**
                 * @param {Item} vc
                 * @returns {Promise}
                 */
                (vc) => {
                  if (req.params.id) {
                    return scope.securedDataRepo.getItem(cm.getCanonicalName(), req.params.id, {user, lang})
                      .then(checked => scope.securedDataRepo.wrap(cm.getCanonicalName(), merge.recursive(true, checked.base, updates), null, {lang}))
                      .then((c) => {
                        return {
                          $context: c, $master: vc, $uid: user.id()
                        };
                      });
                  }
                  const c = scope.dataRepo.wrap(cm.getCanonicalName(), updates, null, {lang});
                  return {
                    $context: c, $master: vc, $uid: user.id()
                  };
                })
              .then(context => checker.apply(context))
              .then((result) => {
                if (!result)
                  throw new Error('Сохраняемый объект не удовлетворяет условиям отбора допустимых значений!');

                return true;
              });
          }
        }
      }
    }

    const dopts = {user, lang};
    if (req.params.node) {
      const n = canonicNode(req.params.node);
      const node = scope.metaRepo.getNode(n.code, n.ns);
      dopts.filter = formFilter(moduleName, scope, req, cm);
      let eagerLoading = [];
      if (node && node.eagerLoading) {
        if (node.eagerLoading.item && Array.isArray(node.eagerLoading.item[cm.getName()]))
          eagerLoading = node.eagerLoading.item[cm.getName()];
      }
      dopts.forceEnrichment = itemEagerLoading(cm, `${node.namespace}@${node.code}`, scope, eagerLoading);
    }

    if (worker) {
      if (req.params.id) {
        worker = worker.then(() => noData ?
          scope.securedDataRepo.getItem(cm.getCanonicalName(), req.params.id, dopts) :
          scope.securedDataRepo.editItem(cm.getCanonicalName(),
            req.params.id,
            updates,
            logger,
            dopts));
      } else {
        worker = worker.then(() => scope.securedDataRepo.createItem(cm.getCanonicalName(),
          updates,
          cm.getVersion(),
          logger,
          dopts));
      }
    } else if (req.params.id) {
      worker = noData ?
        scope.securedDataRepo.getItem(cm.getCanonicalName(), req.params.id, dopts) :
        scope.securedDataRepo.editItem(cm.getCanonicalName(),
          req.params.id,
          updates,
          logger,
          dopts);
    } else {
      worker = scope.securedDataRepo.createItem(cm.getCanonicalName(),
        updates,
        cm.getVersion(),
        logger,
        dopts);
    }

    return worker
      .then(result => applyCollections(result, req.body, scope.metaRepo, scope.securedDataRepo, logger, user))
      .then((result) => {
        if (master) {
          const cm = scope.metaRepo.getMeta(master.class);
          if (cm) {
            const pm = cm.getPropertyMeta(master.property);

            /* If (pm.type === PropertyTypes.REFERENCE) {
             return scope.securedDataRepo.editItem(
             master.class,
             master.id,
             {[master.property]: result.getItemId()},
             {skipResult: true, user: user}
             ).then(() => result);
             } else*/
            if (pm.type === PropertyTypes.COLLECTION && !pm.backRef && !pm.backColl) {
              return scope.securedDataRepo.getItem(master.class, master.id, {user, lang})
                .then(m => m ? scope.securedDataRepo.put(m, master.property, [result]) : null, null, {user})
                .then(() => result);
            }
          }
        }
        return result;
      })
      .then((result) => {
        if (noconvert)
          return result;
        return prepJSON(result, lang);
      });
  } catch (err) {
    return Promise.reject(err);
  }
}

module.exports.saveItem = saveItem;

/**
 * @param {Array} cond
 * @param {Item} context
 */
function resolvePropertyValues(cond, context) {
  if (Array.isArray(cond)) {
    cond.forEach((c) => {
      resolvePropertyValues(c, context);
    });
  }

  let i; let nm; let
    p;
  if (typeof cond === 'object' && cond) {
    if (Array.isArray(cond.value)) {
      for (i = 0; i < cond.value.length; i++) {
        if (cond.value[i][0] === '$') {
          if (context) {
            nm = cond.value[i].substring(1);
            p = context.property(nm);
            if (p)
              cond.value[i] = context.get(nm);
          } else {
            delete cond.value[i];
          }
        }
      }
    }

    if (Array.isArray(cond.nestedConditions))
      resolvePropertyValues(cond.nestedConditions, context);
  }
  return cond;
}

function mergeConditions(req, pm, context) {
  let filter = [];

  if (pm && Array.isArray(pm.selConditions) && pm.selConditions.length > 0)
    filter = filter.concat(resolvePropertyValues(clone(pm.selConditions, true), context));


  if (req.query.filter) {
    const f = typeof req.query.filter === 'string' ? JSON.parse(req.query.filter) : req.query.filter;
    if (f)
      filter = filter.concat(resolvePropertyValues(f, context));
  }

  if (typeof req.body.filter === 'object' && req.body.filter)
    filter = filter.concat(resolvePropertyValues(req.body.filter, context));


  return filter;
}

module.exports.mergeConditions = mergeConditions;
module.exports.resolvePropertyValues = resolvePropertyValues;

function overrideEagerLoading(moduleName, eagerLoading, node, className, type, settings) {
  const el = settings && settings.get(`${moduleName}.` + 'eagerLoading');
  if (el) {
    if (el[node] && el[node][className] && el[node][className][type])
      return eagerLoading.concat(el[node][className][type]);
    else if (el['*'] && el['*'][className] && el['*'][className][type])
      return eagerLoading.concat(el['*'][className][type]);
  }
  return eagerLoading;
}

module.exports.overrideEagerLoading = overrideEagerLoading;

function overrideSearchOptions(moduleName, searchAttrs, node, className, settings) {
  const el = settings && settings.get(`${moduleName}.` + 'listSearchOptions');
  if (el) {
    if (el[className])
      return el[className][node] || el[className]['*'] || searchAttrs;
  }
  return searchAttrs;
}

module.exports.overrideSearchOptions = overrideSearchOptions;

/**
 *
 * @param {{}} moduleName
 * @param {{}} settings
 * @param {{}} [searchOptions]
 * @param {String} [searchAttrs]
 * @param {String} [node]
 * @param {String} [className]
 */
function overrideSearchMinLength(moduleName, settings, searchOptions, searchAttrs, node, className) {
  const searchOps = searchOptions || overrideSearchOptions(moduleName, searchAttrs, node, className, settings);
  const minLength = settings && settings.get(`${moduleName}.listSearchMinLength`) || 3;
  return searchOps && searchOps.minLength || minLength;
}

module.exports.overrideSearchMinLength = overrideSearchMinLength;

/**
 *
 * @param {{}} condition
 * @param {String} [condition.property]
 * @param {String[]} [condition.value]
 * @param {Number} [condition.operation]
 * @param {Object[]} [condition.nestedConditions]
 * @param {{}} result
 */
function sltCheck(condition, result) {
  if (condition.property) {
    result[condition.property] = true;
    if (Array.isArray(condition.value)) {
      for (let i = 0; i < condition.value.length; i++) {
        if (condition.value[i].length > 1 && condition.value[i][0] === '$' && condition.value[i][1] !== '$')
          result[condition.value[i].substr(1)] = true;
      }
    }
  } else if (Array.isArray(condition.nestedConditions)) {
    for (let i = 0; i < condition.nestedConditions.length; i++)
      sltCheck(condition.nestedConditions[i], result);
  }
}

/**
 * @param {ClassMeta} cm
 */
module.exports.selectionListTriggers = function(cm) {
  const properties = cm.getPropertyMetas();
  const result = {};
  for (let i = 0; i < properties.length; i++) {
    const p = properties[i];
    if (p.selectionProvider && p.selectionProvider.type === 'MATRIX') {
      for (let j = 0; j < p.selectionProvider.matrix.length; j++) {
        const mentry = p.selectionProvider.matrix[j];
        if (
          Array.isArray(mentry.conditions) &&
          mentry.conditions.length
        ) {
          for (let k = 0; k < mentry.conditions.length; k++)
            sltCheck(mentry.conditions[k], result);
        }
      }
    }
  }
  return Object.keys(result);
};

/**
 * @param {String} itemId
 * @param {User} user
 * @param {Number} timeout
 * @param {ConcurencyChecker} checker
 */
module.exports.concurencyState = function(itemId, user, timeout, checker, auth) {
  if (timeout) {
    return checker.state(itemId)
      .then((state) => {
        if (!state ||
          state.user === user.id() ||
          state.blockDate < Date.now() - timeout)
          return checker.block(itemId, user.id());

        return state;
      })
      .then(state => new Promise((resolve, reject) => {
        if (!state || !state.user)
          return resolve(null);

        if (state.user === user.id()) {
          state.userName = user.name();
          return resolve(state);
        }
        auth.userProfile(state.user, (profile) => {
          if (!profile)
            return reject(new Error('не найден владелец блокировки'));

          state.userName = profile.name();
          return resolve(state);
        });
      }));
  }
  return Promise.resolve(null);
};

function itemEagerLoading(cl, node, scope, eagerLoading) {
  const cm = typeof cl === 'string' ? scope.metaRepo.getMeta(cl) : cl;

  eagerLoading = eagerLoading || [];

  eagerLoading = overrideEagerLoading(moduleName,
    eagerLoading,
    node,
    cm.getCanonicalName(),
    'item',
    scope.settings);

  const forceEnrichment = [];
  eagerLoading.forEach((p) => {
    forceEnrichment.push(p.split('.'));
  });
  return forceEnrichment;
}

module.exports.itemEagerLoading = itemEagerLoading;

/**
 * @param {{property: String, type: Number, fields: Array}} f
 * @param {ClassMeta} cm
 * @param {Array} result
 * @param {String} [prefix]
 */
function fieldEagerLoading(f, cm, result, prefix) {
  if (f.property) {
    const pm = cm.getPropertyMeta(f.property);
    if (pm) {
      if (pm.type === PropertyTypes.REFERENCE || f.property.indexOf('.') > 0) {
        const path = f.property.split('.');
        if (prefix)
          path.unshift(...prefix.split('.'));

        result.push(path);
      }
      if (pm.type === PropertyTypes.REFERENCE && Array.isArray(f.fields)) {
        for (let i = 0; i < f.fields.length; i++)
          fieldEagerLoading(f.fields[i], cm, result, prefix + (prefix ? '.' : '') + f.property);
      }
    }
  } else if (f.type === FieldTypes.GROUP && Array.isArray(f.fields)) {
    for (let i = 0; i < f.fields.length; i++)
      fieldEagerLoading(f.fields[i], cm, result, prefix);
  }
}

function vmEagerLoading(vm, cm) {
  const result = [];
  for (let i = 0; i < vm.tabs.length; i++) {
    const tab = vm.tabs[i];
    tab.fullFields = tab.fullFields ? tab.fullFields : []; // Чтобы не валилось, при отсуттсвии табов в мете
    tab.shortFields = tab.shortFields ? tab.shortFields : []; // Чтобы не валилось, при отсуттсвии табов в мете
    for (let j = 0; j < tab.fullFields.length; j++)
      fieldEagerLoading(tab.fullFields[j], cm, result);

    for (let j = 0; j < tab.shortFields.length; j++)
      fieldEagerLoading(tab.shortFields[j], cm, result);
  }
  return result;
}

module.exports.vmEagerLoading = vmEagerLoading;

/**
 * @param {{settings: SettingsRepository}} scope
 * @param {String} className
 * @returns Boolean
 */
function checkSignState(scope, className) {
  const signedClasses = scope.settings.get(`${moduleName}.signedClasses`);
  if (Array.isArray(signedClasses))
    return signedClasses.includes(className);

  return false;
}
module.exports.checkSignState = checkSignState;

/**
 * @param {String} str
 * @param {Function} cb
 */
function mapDirProperties(str, cb) {
  const regx = new RegExp('\\$\\{item\\.([^\\$\\{\\}]*)\\}', 'g');
  let result = regx.exec(str);
  while (result) {
    if (result[1])
      cb(result[1]);

    result = regx.exec(str);
  }
}
module.exports.mapDirProperties = mapDirProperties;

/**
 * @param {String} str
 * @returns {String}
 */
function escapeSep(str) {
  return str ? (String(str)).replace(new RegExp(`\\${path.sep}`, 'g'), '')
    .toString() : str;
}

/**
 * @param {String} str
 * @param {String} className
 * @param {String} id
 * @param {String} attr
 * @param {Item} item
 * @returns {String|null}
 */
function parseDirName(str, className, id, attr, item) {
  if (!str)
    return null;

  const m = moment();
  let result = str.replace(/\$\{class\}/g, className || '');
  result = result.replace(/\$\{id\}/g, id || '');
  result = result.replace(/\$\{attr\}/g, attr || '');
  mapDirProperties(str, (prop) => {
    const propValue = escapeSep(item && item.get(prop) || '');
    result = result.replace(new RegExp(`\\$\\{item\\.${prop}\\}`, 'g'), propValue);
  });
  const regx = new RegExp(`\\\${([^\\${path.sep}\\$\\{\\}]*)}`, 'g');
  let moments = regx.exec(result);
  while (Array.isArray(moments)) {
    if (moments[1])
      result = result.replace(new RegExp(`\\$\\{${moments[1]}\\}`, 'g'), m.format(moments[1]));

    moments = regx.exec(result);
  }
  return path.normalize(result);
}

module.exports.parseDirName = parseDirName;

function getStorageDir(className, id, property, scope) {
  const storageSettings = scope.settings.get(`${moduleName}.storage`) || {};
  if (storageSettings[className] && storageSettings[className][property]) {
    let itemGetter = Promise.resolve(null);
    let cn = className.split('.')[0];
    if (id) {
      let eagerLoading = [];
      mapDirProperties(storageSettings[className][property], (prop) => {
        if (!eagerLoading.includes(prop)) {
          eagerLoading.push(prop);
        }
      });
      eagerLoading = eagerLoading.map(el => el.split('.'));
      let opts = {forceEnrichment: eagerLoading};
      itemGetter = scope.dataRepo.getItem(cn, id, opts);
    }
    return itemGetter
      .then(item => parseDirName(storageSettings[className][property], cn, id, property, item));
  }
  return Promise.resolve(null);
}

exports.getStorageDir = getStorageDir;
