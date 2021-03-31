// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
/**
 * Created by kras on 24.05.16.
 */
'use strict';

const pnf = require('./404.js');
const forbidden = require('./403.js');
const buildMenus = require('../../backend/menu').buildMenus;
const processNavigation = require('../../backend/menu').processNavigation;
const buildListVm = require('../../backend/viewmodels').buildListVm;
const tableOptions = require('../../backend/viewmodels').tableOptions;
const userFiltersOptions = require('../../backend/viewmodels').userFiltersOptions;
const overrideTpl = require('../../backend/viewmodels').overrideTpl;
const itemTplData = require('../../backend/items').itemTplData;
const overrideEagerLoading = require('../../backend/items').overrideEagerLoading;
const overrideSearchOptions = require('../../backend/items').overrideSearchOptions;
const overrideSearchMinLength = require('../../backend/items').overrideSearchMinLength;
const onError = require('../../backend/error');
const respond = require('../../backend/respond');
const locale = require('locale');
const { PropertyTypes } = require('@iondv/meta-model-contracts');
const { FunctionCodes: F } = require('@iondv/meta-model-contracts');
const {t} = require('@iondv/i18n');

const defaultCommands = (lang) => [
  {
    id: 'CREATE',
    caption: t('Create', {lang})
  },
  {
    id: 'EDIT',
    needSelectedItem: true,
    caption: t('Edit', {lang})
  },
  {
    id: 'DELETE',
    isBulk: true,
    caption: t('Delete', {lang})
  }
];

/* jshint maxstatements: 50, maxcomplexity: 30 */
module.exports = function (req, res) {
  respond(['metaRepo', 'settings', 'export', 'aclProvider', 'auth'],
    /**
     * @param {{metaRepo: MetaRepository, settings: SettingsRepository, auth: Auth}} scope
     * @param {ExportManager} scope.export
     * @param {AclProvider} scope.aclProvider
     */
    function (scope) {
      try {
        let user = scope.auth.getUser(req);
        let createPath, lang, tableOps, collectionParams, vm, template, fetchPath, userFilters, permissions;
        let node, classMeta, basicCm;
        let shortView = !!req.query.short;
        processNavigation(scope, req)
          .then(
            (info) => {
              classMeta = info.classMeta;
              basicCm = classMeta;
              node = info.node;
              permissions = info.permissions;
              tableOps = {};
              template = shortView ? 'list-short' : 'list';
              fetchPath = '';
              createPath = 'new/' + classMeta.getCanonicalName();
              let locales = new locale.Locales(req.headers['accept-language']);
              lang = locales[0] ? locales[0].language : 'ru';
              if (req.params.class && req.params.id && req.params.collection) {
                template = 'collection';
                let colProperty = classMeta.getPropertyMeta(req.params.collection);
                if (colProperty) {
                  let ccm = colProperty._refClass;
                  if (ccm) {
                    fetchPath = classMeta.getCanonicalName() + '/' + req.params.id + '/' + req.params.collection;
                    vm = scope.metaRepo.getCollectionViewModel(
                      classMeta.getCanonicalName(),
                      req.params.collection,
                      node ? `${node.namespace}@${node.code}` : null);
                    if (!vm) {
                      vm = buildListVm(ccm, vm, req.locals.lang);
                    }
                    collectionParams = {
                      classname: req.params.class,
                      property: req.params.collection,
                      id: req.params.id,
                      collectionClassname: ccm.getName()
                    };
                    classMeta = ccm;
                  }
                }
              } else {
                if (!node) {
                  fetchPath = classMeta.getCanonicalName();
                  vm = scope.metaRepo.getListViewModel(classMeta.getCanonicalName());
                } else if (node.type === 2) {
                  if (node.classname && node.id && node.collection) {
                    fetchPath = classMeta.getCanonicalName() + '/' + node.id + '/' + node.collection;
                  }
                  vm = scope.metaRepo.getCollectionViewModel(
                    classMeta.getCanonicalName(),
                    node.collection,
                    `${node.namespace}@${node.code}`
                  );
                  template = 'collection';
                } else if (node.type !== 0) {
                  fetchPath = classMeta.getCanonicalName();
                  vm = scope.metaRepo.getListViewModel(classMeta.getCanonicalName(), `${node.namespace}@${node.code}`);
                }
                if (!vm/* || (vm.overrideMode === 1)*/) {
                  vm = buildListVm(classMeta, vm);
                }
              }
              if (!fetchPath) {
                return Promise.reject(404);
              }

              let eagerLoading = [];
              if (node && node.eagerLoading) {
                if (node.eagerLoading.list && Array.isArray(node.eagerLoading.list[classMeta.getName()])) {
                  eagerLoading = node.eagerLoading.list[classMeta.getName()];
                }
              }

              let searchOptions = null;
              if (node && node.searchOptions && node.searchOptions[classMeta.getName()]) {
                searchOptions = node.searchOptions[classMeta.getName()];
              }

              searchOptions = overrideSearchOptions(
                req.moduleName,
                searchOptions,
                node && `${node.namespace}@${node.code}`,
                classMeta.getCanonicalName(),
                scope.settings);

              tableOps = tableOptions(classMeta, vm, scope.metaRepo, searchOptions, node && node.sorting);

              tableOps.eagerLoading = overrideEagerLoading(
                req.moduleName,
                eagerLoading,
                node && `${node.namespace}@${node.code}`,
                classMeta.getCanonicalName(),
                'list',
                scope.settings);

              tableOps.searchMinLength = overrideSearchMinLength(req.moduleName, scope.settings, searchOptions);

              userFilters = userFiltersOptions(vm, classMeta, scope.metaRepo);

              return scope.export.listExporters(classMeta, {});
            })
          .then(
            (exporters) => {
              let searchDelay = scope.settings.get(req.moduleName + '.listSearchDelay');
              if (searchDelay !== null) {
                tableOps.searchDelay = searchDelay;
              }
              tableOps.node = req.params.node;
              let tplData = {
                baseUrl: req.app.locals.baseUrl,
                module: req.moduleName,
                className: classMeta.getCanonicalName(),
                title: (node && (node.title || node.caption) || classMeta.getCaption()) +
                (classMeta !== basicCm ? ': ' + classMeta.getCaption() : ''),
                pageCode: node && node.code,
                autoOpen: req.query.open,
                master: {
                  id: req.query.masterId,
                  class: req.query.masterClass,
                  backRef: req.query.masterBackRef
                },
                node: req.params.node,
                fetchPath: fetchPath,
                createPath: createPath,
                updatePath: 'view/' + classMeta.getCanonicalName(),
                modal: req.query.modal,
                selectionDialog: req.query.selection,
                TableOptions: tableOps,
                user: user,
                collectionParams: collectionParams,
                exporters: exporters,
                filter: node && node.conditions,
                userFilters: userFilters,
                inlineForm: scope.settings.get(req.moduleName + '.inlineForm'),
                logo: scope.settings.get(req.moduleName + '.logo'),
                commands: Array.isArray(vm.commands) ? vm.commands : defaultCommands(req.locals.lang),
                columns: vm.columns,
                condensedView: !!req.query.condensed,
                nodeOptions: node && node.options,
                permissions,
                viewOptions: vm.options
              };
              tplData.viewFilters = [];
              if (vm.options && vm.options.filters && vm.options.filters.length) {
                vm.options.filters.forEach((f) => {
                  let pm = classMeta.getPropertyMeta(f.property);
                  if (pm) {
                    let filter = {
                      operation: f.operation || F.EQUAL,
                      property: f.property,
                      label: f.label
                    };
                    if (pm.selectionProvider) {
                      filter.selectList = pm.selectionProvider.getSelection({});
                    } else {
                      switch (pm.type) {
                        case PropertyTypes.REFERENCE:
                          filter.type = 'reference';
                          filter.length = f.length || 20;
                          break;
                        case PropertyTypes.DATETIME:
                          filter.type = 'datetime';
                          filter.mode = pm.mode;
                          break;
                        default:
                          break;
                      }
                    }
                    tplData.viewFilters.push(filter);
                  }
                });
              }
              return buildMenus(
                tplData, req.query && req.query.modal, scope.settings, scope.metaRepo,
                scope.aclProvider, user, req.moduleName
              );
            })
          .then(
            (tplData) => {
              if (!tplData) {
                return pnf(req, res);
              }
              tplData.baseUrl = req.app.locals.baseUrl;
              res.render(
                overrideTpl(
                  req.moduleName,
                  'view/' + template,
                  template,
                  req.params.node,
                  classMeta.getCanonicalName(),
                  scope.settings
                ),
                itemTplData(tplData, lang));
            }
          )
          .catch(
            (err) => {
              if (err === 404) {
                return pnf(req, res);
              }
              if (err === 403) {
                return forbidden(req, res);
              }
              onError(scope, err, res, true);
            }
          );
      } catch (err) {
        onError(scope, err, res, true);
      }
    },
    res
  );
};
