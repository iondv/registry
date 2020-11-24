// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
/**
 * Created by kras on 26.06.16.
 */
'use strict';

const PropertyTypes = require('core/PropertyTypes');
const FieldTypes = require('core/FieldTypes');
const FieldSizes = require('core/FieldSizes');
const FieldModes = require('core/FieldModes');
const SortingModes = require('core/SortingModes');
const ActionProvider = require('./ActionProvider');
const DigitalSignManager = require('core/interfaces/DigitalSignManager');
const overrideEagerLoading = require('./items').overrideEagerLoading;
const _ = require('lodash');
const moduleName = require('../module-name');
const {t} = require('core/i18n');
const {format} = require('util');

/* jshint maxcomplexity: 30, maxdepth: 15, maxstatements: 40, maxparams: 10 */
function pt2ft(t) {
  switch (t) {
    case PropertyTypes.BOOLEAN:return FieldTypes.CHECKBOX;
    case PropertyTypes.COLLECTION:return FieldTypes.COLLECTION;
    case PropertyTypes.DATETIME:return FieldTypes.DATE_PICKER;
    case PropertyTypes.REAL:
    case PropertyTypes.DECIMAL:return FieldTypes.DECIMAL_EDITOR;
    case PropertyTypes.IMAGE:return FieldTypes.IMAGE;
    case PropertyTypes.FILE:return FieldTypes.FILE;
    case PropertyTypes.FILE_LIST: return FieldTypes.ATTACHMENTS;
    case PropertyTypes.INT:return FieldTypes.NUMBER_PICKER;
    case PropertyTypes.TEXT:return FieldTypes.MULTILINE;
    case PropertyTypes.HTML:return FieldTypes.WYSIWYG;
    case PropertyTypes.STRUCT:return FieldTypes.GROUP;
    case PropertyTypes.REFERENCE:return FieldTypes.REFERENCE;
    case PropertyTypes.SET:return FieldTypes.MULTISELECT;
    case PropertyTypes.SCHEDULE:return FieldTypes.SCHEDULE;
    default:
      return FieldTypes.TEXT;
  }
}

function ps2fs(size) {
  if (size === null) {
    return FieldSizes.MEDIUM;
  }
  if (size < 4) {
    return FieldSizes.TINY;
  }
  if (size < 10) {
    return FieldSizes.SHORT;
  }
  if (size < 20) {
    return FieldSizes.MEDIUM;
  }
  if (size < 40) {
    return FieldSizes.LONG;
  }
  return FieldSizes.BIG;
}

/**
 * @param {ClassMeta} cm
 * @param {{}} origin
 * @returns {{allowSearch: *, pageSize: *, useEditModels: *, columns: *, commands: *}}
 */
module.exports.buildListVm = function buildListVm(cm, origin, lang) {
  var result = {
    allowSearch: origin ? origin.allowSearch : true,
    pageSize: origin ? origin.pageSize : 20,
    useEditModels: origin ? origin.useEditModels : true,
    columns: origin ? origin.columns : [],
    commands: origin ? origin.commands : []
  };

  if (!origin) {
    result.commands.push({
      id: 'CREATE',
      caption: t('Create', {lang}),
      needSelectedItem: false,
      isBulk: false,
      enableCondition: '',
      visibilityCondition: '',
      signAfter: false,
      signBefore: false
    });
  }
  if (!origin) {
    result.commands.push({
      id: 'EDIT',
      caption: t('Edit', {lang}),
      needSelectedItem: true,
      isBulk: false,
      enableCondition: '',
      visibilityCondition: '',
      signAfter: false,
      signBefore: false
    });
  }
  if (!origin) {
    result.commands.push({
      id: 'DELETE',
      caption: t('Delete', {lang}),
      needSelectedItem: true,
      isBulk: true,
      enableCondition: '',
      visibilityCondition: '',
      signAfter: false,
      signBefore: false
    });
  }

  var properties = cm.getPropertyMetas();
  for (var i = 0; i < properties.length; i++) {
    if (properties[i].name !== '__class' && properties[i].name !== '__classTitle') {
      result.columns.push(fieldFromProperty(properties[i], lang));
    }
  }
  result.columns.sort(function (a,b) {return a.orderNumber - b.orderNumber;});
  return result;
};

function getDefaultFieldCommands(fieldType, lang) {
  switch (fieldType) {
    case FieldTypes.COLLECTION:
      return [
        {
          id: 'ADD',
          caption: t('Add', {lang})
        },
        {
          id: 'CREATE',
          caption: t('Create', {lang})
        },
        {
          id: 'EDIT',
          caption: t('Edit', {lang}),
          needSelectedItem: true
        },
        {
          id: 'REMOVE',
          caption: t('Remove', {lang}),
          needSelectedItem: true
        }
      ];
    case FieldTypes.REFERENCE:
      return [
        {
          id: 'SELECT',
          caption: t('Select', {lang})
        },
        {
          id: 'CREATE',
          caption: t('Create', {lang})
        },
        {
          id: 'EDIT',
          caption: t('Edit', {lang}),
          needSelectedItem: true
        },
        {
          id: 'REMOVE',
          caption: t('Clear', {lang}),
          isBulk: true
        }
      ];
    default:
      return [];
  }
}
module.exports.getDefaultFieldCommands = getDefaultFieldCommands;

function fieldFromProperty(property, lang) {
  return {
    caption: property.caption,
    type: pt2ft(property.type),
    property: property.name,
    size: ps2fs(property.size),
    maskName: '',
    mask: '',
    mode: property.type === PropertyTypes.COLLECTION ? 3 : property.type === PropertyTypes.REFERENCE ? 1 : 0,
    fields: [],
    hierarchyAttributes: [],
    columns: [],
    commands: getDefaultFieldCommands(pt2ft(property.type), lang),
    orderNumber: property.orderNumber,
    required: (!property.nullable && (property.defaultValue == null)) || property.required,
    visibility: '',
    enablement: '',
    obligation: '',
    readonly: property.readonly,
    selectionPaginated: true,
    validators: [],
    hint: property.hint,
    historyDisplayMode: 0,
    tags: '',
    sorted: true,
    selConditions: property.selConditions,
    selSorting: property.selSorting
  };
}

function buildFields(cm, lang) {
  const sysPm = ['__class', '__classTitle'];
  return cm.getPropertyMetas()
    .filter(pm => !sysPm.includes(pm.name))
    .map(pm => fieldFromProperty(pm, lang))
    .sort((a,b) => a.orderNumber - b.orderNumber);
}

function buildTab(cm, lang) {
  const tab = {
    caption: '',
    fullFields: [],
    shortFields: []
  };
  const fields = buildFields(cm, lang);
  tab.fullFields.push(...fields);
  return tab;
}

module.exports.buildEditFormVm = function (cm, origin, lang) {
  var result = {
    type: 'item',
    tabs: [
      buildTab(cm)
    ],
    commands: [],
    siblingFixBy: null,
    siblingNavigateBy: null,
    historyDisplayMde: 0,
    collectionFilters: null,
    version: null,
    overrideMode: 0
  };

  if (!origin) {
    result.commands.push({
      id: 'SAVE',
      caption: t('Save', {lang}),
      needSelectedItem: false,
      isBulk: false,
      enableCondition: '',
      visibilityCondition: '',
      signAfter: false,
      signBefore: false
    });
  }
  return result;
};

module.exports.buildCreateFormVm = function (cm, origin, lang) {
  var result = {
    type: 'create',
    tabs: [
      buildTab(cm)
    ],
    commands: [],
    siblingFixBy: null,
    siblingNavigateBy: null,
    historyDisplayMde: 0,
    collectionFilters: null,
    version: null,
    overrideMode: 0
  };

  if (!origin) {
    result.commands.push({
      id: 'CREATE',
      caption: t('Create', {lang}),
      needSelectedItem: false,
      isBulk: false,
      enableCondition: '',
      visibilityCondition: '',
      signAfter: false,
      signBefore: false
    });
  }
  return result;
};

function viewColToTableCol(column, pm, dataName, reorderable) {
  return {
    name: column.property,
    className: 'type_' + column.type,
    mode: column.mode,
    data: dataName +
    (
      column.type === FieldTypes.REFERENCE ||
      pm &&
      pm.selectionProvider ? '_str' : ''
    ),
    parseTimeZone: pm.type === PropertyTypes.DATETIME && pm.mode !== 0,
    title: column.caption,
    hint: column.hint || (pm ? pm.hint : '') || '',
    orderable: column.sorted && !reorderable
  };
}

function isPmSearchable(pm, kp, depth) {
  if (
    (
      pm.indexSearch ||
      pm.indexed ||
      pm.unique ||
      kp.indexOf(pm.name) !== -1
    ) && (
      pm.type === PropertyTypes.STRING ||
      pm.type === PropertyTypes.INT ||
      pm.type === PropertyTypes.REAL ||
      pm.type === PropertyTypes.DECIMAL ||
      pm.type === PropertyTypes.DATETIME
    )
  ) {
    return true;
  }

  if (
    (
      pm.type === PropertyTypes.REFERENCE ||
      pm.type === PropertyTypes.COLLECTION
    ) && depth > 0 && isClassSearchable(pm._refClass, depth - 1)
  ) {
    return true;
  }

  return false;
}

/**
 * @param {ClassMeta} cm
 */
function isClassSearchable(cm, depth) {
  let kp = cm.getKeyProperties();
  let props = cm.getPropertyMetas();
  for (let i = 0; i < props.length; i++) {
    if (isPmSearchable(props[i], kp, depth)) {
      return true;
    }
  }
  return false;
}

/**
 * @property {ClassMeta} cm
 * @property {String[]} name
 * @property {String[]} props
 */
function getPM(cm, name, props) {
  let pn = name[0];
  let pm = cm.getPropertyMeta(pn);
  if (pm) {
    if (name.length > 1 && pm.type === PropertyTypes.REFERENCE) {
      props.push(pm.name + '_ref');
      return getPM(pm._refClass, name.slice(1), props);
    }
    props.push(pm.name);
  }
  return pm;
}

/**
 * @param {ClassMeta} cm
 * @param {{columns: Array, allowSearch: Boolean}} vm
 * @param {MetaRepository} metaRepo
 * @returns {{columns: Array}}
 */
module.exports.tableOptions = function (cm, vm, metaRepo, searchOptions, origSorting) {
  let result =  {
    columns: [],
    order: [],
    pageLength: vm.pageSize || 10,
    searchDelay: 1000,
    searching: vm.allowSearch && searchOptions,
    searchOptions: vm.allowSearch ? searchOptions : null,
    styles: vm.styles || {}
  };
  let sorting = (origSorting || []).slice();

  if (Array.isArray(vm.groupBy) && vm.groupBy.length) {
    let pn = vm.groupBy[0];
    let path = [];
    let pm = getPM(cm, pn.split('.'), path);
    if (pm) {
      pn = path.join('.');
      if (pm.type === PropertyTypes.REFERENCE || pm.selectionProvider) {
        pn = pn + '_str';
      }
      result.rowGroup = {dataSrc: pn};
    } else {
      throw new Error(format(t('List grouping attribute "%s" not found in class "%s".'), pn, cm.getCaption()));
    }
  }

  let kp = cm.getKeyProperties();
  let pm;
  vm.columns.forEach((col, i) => {
    let pn = [];
    pm = getPM(cm, col.property.split('.'), pn);

    if (!result.searching) {
      if (vm.allowSearch && pm && isPmSearchable(pm, kp, 1)) {
        result.searching = true;
      }
    }

    if (pm) {
      let columnOpts = viewColToTableCol(col, pm, pn.join('.'));
      if (pm.type === PropertyTypes.COLLECTION &&
        col.type === FieldTypes.COLLECTION &&
        col.mode === FieldModes.COLLECTION_HASHTAGS) {
        let keyProps = metaRepo.getMeta(pm.itemsClass, cm.getVersion(), cm.getNamespace()).getKeyProperties();
        columnOpts.itemsClassKeyProp = keyProps[0];
      }

      result.columns.push(columnOpts);

      if (sorting) {
        sorting.forEach((sort, index, array) => {
          if (sort.property === col.property) {
            result.order.push([i, sort.mode === SortingModes.DESC ? 'desc' : 'asc']);
            array.splice(index, 1);
          }
        });
      }
    }
  });

  if (sorting && sorting.length) {
    result.dsorting = sorting;
  }
  return result;
};

/**
 * @param {{}} scope
 * @param {{}} node
 * @returns {Function}
 */
module.exports.collectionTableOptions = function (scope, node) {
  return function (prop, field) {
    const pm = prop.meta;
    const selSorting = field.selSorting || pm.selSorting;
    const options = field.options || {};
    const reorderable = options.reorderable && Array.isArray(selSorting) && (selSorting.length > 0);
    const rcm = prop.meta._refClass;
    const result = {
      columns: [],
      searching: false,
      reorderable,
      dragable: Boolean(options.dragable),
      ordering: !reorderable
    };

    for (let i = 0; i < field.columns.length; i++) {
      let pn = [];
      let pm = getPM(rcm, field.columns[i].property.split('.'), pn);
      if (field.columns[i].property === 'class' || pm) {
        result.columns.push(viewColToTableCol(field.columns[i], pm, pn.join('.'), reorderable));
      }
    }

    if (Array.isArray(selSorting)) {
      result.order = [];
      result.dsorting = [];
      let inCol = false;
      for (let sort of selSorting) {
        for (let i = 0; i < result.columns.length; ++i) {
          if (sort.property === result.columns[i].name) {
            inCol = true;
            result.order.push([i, sort.mode === 1 ? 'desc' : 'asc']);
            break;
          }
        }
        if (!inCol) {
          result.dsorting.push(sort);
        }
      }
    }

    let eagerLoading = [];
    if (node && node.eagerLoading) {
      if (node.eagerLoading.list && Array.isArray(node.eagerLoading.list[rcm.getName()])) {
        eagerLoading = node.eagerLoading.list[rcm.getName()];
      }
    }

    eagerLoading = overrideEagerLoading(
      moduleName, eagerLoading, node ? node.namespace + '@' + node.code : null, rcm.getCanonicalName(), 'list', scope.settings
    );

    if (eagerLoading) {
      result.eagerLoading = eagerLoading;
    }

    return result;
  };
};

/**
 * @param {Array} fields
 * @param {ClassMeta} cm
 * @param {MetaRepository} metaRepo
 */
function fillFields(fields, cm, metaRepo, lang) {
  var pm, props, i, j, rcm;
  for (i = 0; i < fields.length; i++) {
    pm = cm.getPropertyMeta(fields[i].property);
    fields[i].commands = Array.isArray(fields[i].commands) ? fields[i].commands : getDefaultFieldCommands(fields[i].type, lang);
    if (fields[i].type === FieldTypes.GROUP) {
      if (pm) {
        if (fields[i].fields.length === 0) {
          if (pm.type === PropertyTypes.STRUCT) {
            props = cm.getPropertyMetas();
            for (j = 0; j < props.length; j++) {
              if (props[j] !== pm &&
                props[j].name.indexOf(pm.name) === 0 &&
                props[j].name.replace(pm.name + '$', '').indexOf('$') < 0
              ) {
                fields[i].fields.push(fieldFromProperty(props[j], lang));
              }
            }
          } else if (pm.type === PropertyTypes.REFERENCE) {
            rcm = metaRepo.getMeta(pm.refClass, cm.getVersion(), cm.getNamespace());
            if (rcm) {
              fields[i].fields.push(...buildFields(rcm, lang));
            }
          }
        }
      }
      fillFields(fields[i].fields, cm, metaRepo, lang);
    } else if (fields[i].type === FieldTypes.COLLECTION) {
      if ((typeof fields[i].columns == 'undefined' || fields[i].columns.length === 0) &&
        (
          fields[i].mode === null ||
          fields[i].mode === FieldModes.COLLECTION_TABLE ||
          fields[i].mode === FieldModes.COLLECTION_LIST
        )) {
        fields[i].columns = [];
        if (pm.type === PropertyTypes.COLLECTION) {
          rcm = metaRepo.getMeta(pm.itemsClass, cm.getVersion(), cm.getNamespace());
          if (rcm) {
            fields[i].columns.push(...buildFields(rcm, lang));
          }
        }
      }
    } else if (pm) {
      if (!fields[i].mask && pm.mask) {
        fields[i].mask = pm.mask;
      }
      if (!fields[i].maskName && pm.maskName) {
        fields[i].maskName = pm.maskName;
      }
      if (pm.validators) {
        if (!fields[i].validators) {
          fields[i].validators = [];
        }
        for (j = 0; j < pm.validators.length; j++) {
          if (fields[i].validators.indexOf(pm.validators[j]) < 0) {
            fields[i].validators.push(pm.validators[j]);
          }
        }
      }
    }
  }
}

/**
 *
 * @param {ClassMeta} cm
 * @param {{}} vm
 * @param {MetaRepository} metaRepo
 */
module.exports.adjustFields = function (cm, vm, metaRepo, lang) {
  for (let i = 0; i < vm.tabs.length; i++) {
    fillFields(vm.tabs[i].fullFields || [], cm, metaRepo, lang);
    fillFields(vm.tabs[i].shortFields || [], cm, metaRepo, lang);
  }
};

/**
 * @param {Item} item
 * @param {{}} vm
 * @param {ActionProvider} actions
 * @param {DigitalSignManager} signManager
 * @return {Promise}
 */
module.exports.adjustSignOptions = function (item, vm, actions, signManager) {
  var a;
  var checkerInfo = [];
  var checkers = [];
  if (actions instanceof ActionProvider) {
    for (var i = 0; i < vm.commands.length; i++) {
      a = actions.getAction(vm.commands[i].id);
      if (a) {
        if (!vm.commands[i].signBefore) {
          vm.commands[i].signBefore = a.signBefore();
          if (vm.commands[i].signBefore && signManager instanceof DigitalSignManager && item) {
            checkers.push(signManager.signingAvailable(item, vm.commands[i].id));
            checkerInfo.push({
              ind: i,
              so: 'signBefore'
            });
          }
        }
        if (!vm.commands[i].signAfter) {
          vm.commands[i].signAfter = a.signAfter();
          if (vm.commands[i].signAfter && signManager instanceof DigitalSignManager && item) {
            checkers.push(signManager.signingAvailable(item, vm.commands[i].id));
            checkerInfo.push({
              ind: i,
              so: 'signAfter'
            });
          }
        }
      }
    }
  }

  return Promise.all(checkers).then(function (checked) {
    return new Promise(function (resolve) {
      for (var i = 0; i < checkerInfo.length; i++) {
        vm.commands[checkerInfo[i].ind][checkerInfo[i].so] = checked[i];
      }
      resolve(item);
    });
  });
};

/**
 * @param {Item} item
 * @param {{stages: {}}} status
 * @param {DigitalSignManager} signManager
 * @return {Promise}
 */
module.exports.adjustWfSignOptions = function (item, status, signManager) {
  let checkers = Promise.resolve();
  Object.keys(status.stages).forEach((wf) => {
    let stage = status.stages[wf];
    Object.keys(stage.next).forEach((tr) => {
      let tran = stage.next[tr];
      if (tran.signBefore || tran.signAfter) {
        if (signManager instanceof DigitalSignManager && item) {
          checkers = checkers
            .then(() => signManager.signingAvailable(item, wf + '.' + tr))
            .then((checked) => {
              if (!checked) {
                delete stage.next[tr];
              }
            });
        } else {
          delete stage.next[tr];
        }
      }
    });
  });

  return checkers.then(() => status);
};

/**
 * @param {{tags:String[]}} field
 * @param {Item} item
 * @returns {String | null}
 */
module.exports.geoFieldSearchVal = function (field, item) {
  var result = [];
  if (Array.isArray(field.tags) && field.tags.length) {
    var tmp, p;
    for (var i = 0; i < field.tags.length; i++) {
      if (field.tags[i].substr(0, 8) === 'tryfind:') {
        tmp = field.tags[i].substr(8);
        if (tmp[0] === '$' && (p = item.property(tmp.substr(1)))) {
          result.push(p.getDisplayValue());
          continue;
        }
        result.push(tmp);
      }
    }
  }
  return result;
};

function addFilterAttr(property, result, ignoredTypes, stop, level, prefixName, prefixCaption) {
  level = level || 1;
  if (ignoredTypes.indexOf(property.type) < 0 &&
    property.name !== '__class' &&
    property.name !== '__classTitle') {
    let selection = false;
    if (property.selectionProvider) {
      selection = {};
      if (property.selectionProvider.type === 'SIMPLE') {
        for (let i = 0; i < property.selectionProvider.list.length; i++) {
          selection[property.selectionProvider.list[i].key] = property.selectionProvider.list[i].value;
        }
      } else if (property.selectionProvider.type === 'MATRIX') {
        for (let i = 0; i < property.selectionProvider.matrix.length; i++) {
          for (let j = 0; j < property.selectionProvider.matrix[i].result.length; j++) {
            selection[property.selectionProvider.matrix[i].result[j].key] =
              property.selectionProvider.matrix[i].result[j].value;
          }
        }
      }
    }

    let attr = {
      name: (prefixName ? prefixName + '.' : '') + property.name,
      caption: (prefixCaption ? prefixCaption + '.' : '') + property.caption,
      propCaption: property.caption,
      type: property.type,
      mode: property.mode,
      selection: selection
    };
    result.push(attr);
    level++;
    if ((attr.type === PropertyTypes.REFERENCE || attr.type === PropertyTypes.COLLECTION) && level <= stop) {
      var rcm = property._refClass;
      if (rcm) {
        var rProperties = rcm.getPropertyMetas();
        for (let j = 0; j < rProperties.length; j++) {
          if (rProperties[j].type !== PropertyTypes.COLLECTION) {
            addFilterAttr(rProperties[j], result, ignoredTypes, stop, level, attr.name, attr.caption);
          }
        }
      }
    }
  }
}

module.exports.userFiltersOptions = function (vm, cm) {
  let filterDepth = parseInt(vm.filterDepth, 10) || 2;
  let result = [];
  let ignoredTypes = [
    PropertyTypes.IMAGE,
    PropertyTypes.FILE,
    PropertyTypes.PASSWORD,
    PropertyTypes.SET,
    PropertyTypes.STRUCT,
    PropertyTypes.USER,
    PropertyTypes.PERIOD,
    PropertyTypes.GEO,
    PropertyTypes.FILE_LIST,
    PropertyTypes.SCHEDULE
  ];
  let properties = cm.getPropertyMetas();
  for (let i = 0; i < properties.length; i++) {
    addFilterAttr(properties[i], result, ignoredTypes, filterDepth);
  }
  return {attrs: result};
};

function findTpl(tpls, node, className, type) {
  let tpl = null;
  if (Array.isArray(tpls)) {
    _.filter(tpls, {node}).forEach((ntp) => {
      if (Array.isArray(ntp.classes)) {
        _.filter(ntp.classes, {name: className}).forEach((ctp) => {
          if (ctp && ctp.types && ctp.types[type]) {
            tpl = ctp.types[type];
          }
        });
      }
    });
  }
  return tpl;
}

module.exports.overrideTpl = function (moduleName, tpl, type, node, className, settings) {
  let template = null;
  if (settings) {
    let tpls = settings.get(moduleName + '.customTemplates');
    template = findTpl(tpls, node, className, type);
    if (!template) {
      template = findTpl(tpls, node, '*', type);
    }
    if (!template) {
      template = findTpl(tpls, '*', className, type);
    }
    if (!template) {
      template = findTpl(tpls, '*', '*', type);
    }
  }
  return template || tpl;
};

/**
 * @param {Array.<Item>} list
 * @param {{}} styles
 * @param {Calcualtor} calc
 * @param {Boolean} enrichItems
 * @returns {Promise.<Object>}
 */
function calculateStyles(list, styles, calc, enrichItems) {
  try {
    let promise = Promise.resolve();
    const calculated = {};
    const parsed = {};
    Object.keys(styles).forEach((nm) => {
      parsed[nm] = calc.parseFormula(styles[nm]);
    });
    list.forEach((li) => {
      calculated[li.getItemId()] = {};
      Object.keys(parsed).forEach((nm) => {
        promise = promise
          .then(() => parsed[nm].apply(li))
          .then((val) => {
            calculated[li.getItemId()][nm] = val;
            if (enrichItems) {
              li.__styles = li.__styles || {};
              li.__styles[nm] = val;
            }
          });
      });
    });
    return promise.then(() => calculated);
  } catch (err) {
    return Promise.reject(err);
  }
}

module.exports.calculateStyles = calculateStyles;

function applyStyles(map, item, fields, calc, tabIndex, groupIndex) {
  map = map || {};
  let promise = Promise.resolve();
  fields.forEach((field, f) => {
    if (field.type === FieldTypes.GROUP && Array.isArray(field.fields)) {
      promise = promise
        .then(() => applyStyles(map, item, field.fields, calc, tabIndex, groupIndex ? groupIndex + '|' + f : f));
    } else if (field.type === FieldTypes.COLLECTION) {
      const styles = _.get(field, 'options.styles');
      const list = styles && item.getAggregates(field.property);
      if (list && styles) {
        const key = field.property + '|' + tabIndex + (groupIndex ? '|' + groupIndex : '') + '|' + f;
        promise = promise
          .then(() => calculateStyles(list, styles, calc))
          .then((cs) => {
            map[key] = cs;
          });
      }
    }
  });

  return promise;
}

/**
 * @param {Item} item
 * @param {{}} vm
 * @param {Calcualtor} calc
 * @returns {Promise.<Function>}
 */
module.exports.collectionsStyles = function (item, vm, calc) {
  const stylesMap = {};

  function addCollectionSyles(plainList, property, tabIndex, fieldIndex, group) {
    const calculated = stylesMap[`${property}|${tabIndex}${group ? '|' + group : ''}|${fieldIndex}`];
    if (Array.isArray(plainList) && calculated) {
      plainList.forEach((li) => {
        if (calculated[li._id]) {
          li.__styles = calculated[li._id];
        }
      });
    }
  }

  let promise = Promise.resolve();
  vm.tabs.forEach((tab, t) => {
    promise = promise.then(() => applyStyles(stylesMap, item, tab.fullFields, calc, t));
  });
  return promise.then(() => addCollectionSyles);
};
