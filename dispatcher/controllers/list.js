// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
/**
 * Created by kras on 24.05.16.
 */
'use strict';

const pnf = require('./404.js');
const forbidden = require('./403.js');
const buildMenus = require('../../backend/menu').buildMenus;
const canonicNode = require('../../backend/menu').canonicNode;
const nodeAclId = require('../../backend/menu').nodeAclId;
const buildListVm = require('../../backend/viewmodels').buildListVm;
const tableOptions = require('../../backend/viewmodels').tableOptions;
const userFiltersOptions = require('../../backend/viewmodels').userFiltersOptions;
const overrideTpl = require('../../backend/viewmodels').overrideTpl;
const moduleName = require('../../module-name');
const itemTplData = require('../../backend/items').itemTplData;
const overrideEagerLoading = require('../../backend/items').overrideEagerLoading;
const overrideSearchOptions = require('../../backend/items').overrideSearchOptions;
const overrideSearchMinLength = require('../../backend/items').overrideSearchMinLength;
const onError = require('../../backend/error');
const respond = require('../../backend/respond');
const Permissions = require('core/Permissions');
const locale = require('locale');
const PropertyTypes = require('core/PropertyTypes');
const F = require('core/FunctionCodes');

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
        let n = canonicNode(req.params.node);
        let node = scope.metaRepo.getNode(n.code, n.ns);
        if (!node) {
          return pnf(req, res);
        }
        let cm, createPath, lang, tableOps, collectionParams, vm, template, fetchPath, userFilters,
          classAclId, permissions;
        let shortView = !!req.query.short;
        scope.aclProvider.checkAccess(user, nodeAclId(node), Permissions.READ)
          .then(
            function (accessible) {
              if (!accessible) {
                return Promise.reject(403);
              }
              cm = scope.metaRepo.getMeta(req.params.class ? req.params.class : node.classname, null, n.ns);
              classAclId = `c:::${cm.getCanonicalName()}`;
              return scope.aclProvider.getPermissions(user, classAclId);
            })
          .then(
            function (access) {
              permissions = access ? access[classAclId] : {};
              tableOps = {};
              template = shortView ? 'list-short' : 'list';
              fetchPath = '';
              createPath = 'new/' + cm.getCanonicalName();
              let locales = new locale.Locales(req.headers['accept-language']);
              lang = locales[0] ? locales[0].language : 'ru';
              if (req.params.class && req.params.id && req.params.collection) {
                template = 'collection';
                let colProperty = cm.getPropertyMeta(req.params.collection);
                if (colProperty) {
                  let ccm = colProperty._refClass;
                  if (ccm) {
                    fetchPath = cm.getCanonicalName() + '/' + req.params.id + '/' + req.params.collection;
                    vm = scope.metaRepo.getCollectionViewModel(
                      cm.getCanonicalName(),
                      req.params.collection,
                      `${node.namespace}@${node.code}`);
                    if (!vm) {
                      vm = buildListVm(ccm, vm);
                    }
                    collectionParams = {
                      classname: req.params.class,
                      property: req.params.collection,
                      id: req.params.id,
                      collectionClassname: ccm.getName()
                    };
                    cm = ccm;
                  }
                }
              } else {
                if (!node) {
                  fetchPath = cm.getCanonicalName();
                  vm = scope.metaRepo.getListViewModel(cm.getCanonicalName());
                } else if (node.type === 2) {
                  if (node.classname && node.id && node.collection) {
                    fetchPath = cm.getCanonicalName() + '/' + node.id + '/' + node.collection;
                  }
                  vm = scope.metaRepo.getCollectionViewModel(
                    cm.getCanonicalName(),
                    node.collection,
                    `${node.namespace}@${node.code}`
                  );
                  template = 'collection';
                } if (node.type !== 0) {
                  fetchPath = cm.getCanonicalName();
                  vm = scope.metaRepo.getListViewModel(cm.getCanonicalName(), `${node.namespace}@${node.code}`);
                }
                if (!vm/* || (vm.overrideMode === 1)*/) {
                  vm = buildListVm(cm, vm);
                }
              }
              if (!fetchPath) {
                return Promise.reject(404);
              }

              let eagerLoading = [];
              if (node && node.eagerLoading) {
                if (node.eagerLoading.list && Array.isArray(node.eagerLoading.list[cm.getName()])) {
                  eagerLoading = node.eagerLoading.list[cm.getName()];
                }
              }

              let searchOptions = null;
              if (node && node.searchOptions && node.searchOptions[cm.getName()]) {
                searchOptions = node.searchOptions[cm.getName()];
              }

              searchOptions = overrideSearchOptions(
                moduleName,
                searchOptions,
                node.namespace + '@' + node.code,
                cm.getCanonicalName(),
                scope.settings);

              tableOps = tableOptions(cm, vm, scope.metaRepo, searchOptions, node && node.sorting || []);

              tableOps.eagerLoading = overrideEagerLoading(
                moduleName,
                eagerLoading,
                node.namespace + '@' + node.code,
                cm.getCanonicalName(),
                'list',
                scope.settings);

              tableOps.searchMinLength = overrideSearchMinLength(moduleName, scope.settings, searchOptions);

              userFilters = userFiltersOptions(vm, cm, scope.metaRepo);

              return scope.export.listExporters(cm, {});
            })
          .then(
            function (exporters) {
              let searchDelay = scope.settings.get(moduleName + '.listSearchDelay');
              if (searchDelay !== null) {
                tableOps.searchDelay = searchDelay;
              }
              tableOps.node = req.params.node;
              let tplData = {
                baseUrl: req.app.locals.baseUrl,
                module: moduleName,
                className: cm.getCanonicalName(),
                title: node
                  ? node.title || node.caption + (cm.getName() !== node.classname ?  ': ' + cm.getCaption() : '')
                  : cm.getCaption(),
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
                updatePath: 'view/' + cm.getCanonicalName(),
                modal: req.query.modal,
                selectionDialog: req.query.selection,
                TableOptions: tableOps,
                user: user,
                collectionParams: collectionParams,
                exporters: exporters,
                filter: node && node.conditions,
                userFilters: userFilters,
                inlineForm: scope.settings.get(moduleName + '.inlineForm'),
                logo: scope.settings.get(moduleName + '.logo'),
                commands: Array.isArray(vm.commands) ? vm.commands : [
                  {
                    id: 'CREATE'
                  },
                  {
                    id: 'EDIT',
                    needSelectedItem: true
                  },
                  {
                    id: 'DELETE',
                    isBulk: true
                  }
                ],
                columns: vm.columns,
                condensedView: !!req.query.condensed,
                nodeOptions: node.options,
                permissions,
                viewOptions: vm.options
              };
              tplData.viewFilters = [];
              if (vm.options && vm.options.filters && vm.options.filters.length) {
                vm.options.filters.forEach((f) => {
                  let pm = cm.getPropertyMeta(f.property);
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
                scope.aclProvider, user, moduleName
              );
            })
          .then(
            function (tplData) {
              if (!tplData) {
                return pnf(req, res);
              }
              tplData.baseUrl = req.app.locals.baseUrl;
              res.render(
                overrideTpl(
                  moduleName,
                  'view/' + template,
                  template,
                  req.params.node,
                  cm.getCanonicalName(),
                  scope.settings),
                itemTplData(tplData, lang));
            }
          )
          .catch(
            function (err) {
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
