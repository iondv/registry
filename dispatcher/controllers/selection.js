// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
/**
 * Created by kras on 24.05.16.
 */
'use strict';

// jshint maxstatements: 30, maxparams: 20

const locale = require('locale');
const pnf = require('./404.js');
const onError = require('../../backend/error');
const respond = require('../../backend/respond');
const canonicNode = require('../../backend/menu').canonicNode;
const nodeAclId = require('../../backend/menu').nodeAclId;
const itemTplData = require('../../backend/items').itemTplData;
const moduleName = require('../../module-name');
const buildMenus = require('../../backend/menu').buildMenus;
const tableOptions = require('../../backend/viewmodels').tableOptions;
const buildListVm = require('../../backend/viewmodels').buildListVm;
const Permissions = require('core/Permissions');
const mergeConditions = require('../../backend/items').mergeConditions;
const overrideEagerLoading = require('../../backend/items').overrideEagerLoading;
const userFiltersOptions = require('../../backend/viewmodels').userFiltersOptions;
const overrideSearchOptions = require('../../backend/items').overrideSearchOptions;
const overrideTpl = require('../../backend/viewmodels').overrideTpl;
const prepareSaveData = require('../../backend/items').prepareSaveData;
const prepareDate = require('../../backend/items').prepareDate;

// jshint maxcomplexity: 20

/**
 * @param {{}} node
 * @param {ClassMeta} cm
 * @param {{}} pm
 * @param {ClassMeta} rcm
 * @param {{}} vm
 * @param {{}} scope
 * @param {{}} req
 * @param {String} lang,
 * @param {User} user
 * @returns {Function}
 */
function returnSelection(node, pm, rcm, vm, scope, req, lang, user) {
  return function (item) {
    let master = {};
    let cm = item.getMetaClass();
    if (req.body.updates) {
      let updates = prepareSaveData(req.body.updates, item.getMetaClass(), lang);
      Object.keys(updates)
        .forEach((property) => {
          item.set(property, updates[property]);
        });
    }

    if (req.query) {
      let brpm = rcm.getPropertyMeta(req.query.masterBackRef);
      master = {
        id: req.query.masterId,
        class: req.query.masterClass,
        backRef: req.query.masterBackRef,
        backRefUrlPattern: '/' + node.namespace + '@' + node.code + '/view/' + cm.getCanonicalName() + '/:id',
        backRefCaption: brpm ? brpm.caption : req.query.masterBackRef
      };
    }

    let searchOptions = null;
    if (node && node.searchOptions && node.searchOptions[rcm.getName()]) {
      searchOptions = node.searchOptions[rcm.getName()];
    }
    searchOptions = overrideSearchOptions(
      moduleName,
      searchOptions,
      node.namespace + '@' + node.code,
      rcm.getCanonicalName(),
      scope.settings
    );
    let tableOps = tableOptions(rcm, vm, scope.metaRepo, searchOptions);
    let eagerLoading = [];
    if (node && node.eagerLoading) {
      if (node.eagerLoading.list && Array.isArray(node.eagerLoading.list[rcm.getName()])) {
        eagerLoading = node.eagerLoading.list[rcm.getName()];
      }
    }
    tableOps.sDom = "<'row'<'col-xs-12 dt-filter-col'f>r>t<'row'<'col-md-12 text-right'ipl>>";
    tableOps.eagerLoading = overrideEagerLoading(
      moduleName,
      eagerLoading,
      node.namespace + '@' + node.code,
      rcm.getCanonicalName(),
      'list',
      scope.settings);

    return scope.securedDataRepo.getItem(item, null, {user: user})
      .then(item => {
        let tplData = {
          module: moduleName,
          className: rcm.getCanonicalName(),
          title: rcm.getCaption(),
          containerItem: item,
          containerProperty: pm,
          dateCallback: function (date) {
            return prepareDate(date, lang);
          },
          pageCode: node.code,
          autoOpen: false,
          node: req.params.node,
          master: master,
          fetchPath: rcm.getCanonicalName(),
          createPath: 'new/' + cm.getCanonicalName() + '/' + pm.name + '/' + rcm.getCanonicalName(),
          updatePath: 'view/' + cm.getCanonicalName() + '/' + pm.name + '/' + rcm.getCanonicalName(),
          modal: true,
          selectionDialog: true,
          TableOptions: tableOps,
          user: scope.auth.getUser(req),
          filter: mergeConditions(req, pm, item),
          userFilters: userFiltersOptions(vm, rcm, scope.metaRepo),
          columns: vm.columns,
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
          nodeOptions: node.options,
          viewOptions: vm.options
        };

        return buildMenus(
          tplData, req.query && req.query.modal,
          scope.settings, scope.metaRepo, scope.aclProvider,
          user, moduleName
        );
      });
  };
}

module.exports = function (req, res) {
  respond(['metaRepo', 'aclProvider', 'auth'],
    /**
     * @param {{metaRepo: MetaRepository,settings: SettingsRepository, auth: Auth}} scope
     * @param {DataRepository} scope.securedDataRepo
     * @param {AclProvider} scope.aclProvider
     */
    function (scope) {
      try {
        let n = canonicNode(req.params.node);
        let node = scope.metaRepo.getNode(n.code, n.ns);
        if (!node) {
          return pnf(req, res);
        }
        let user = scope.auth.getUser(req);

        let lang;
        scope.aclProvider.checkAccess(user, nodeAclId(node), Permissions.READ).then(
          function (accessible) {
            if (!accessible) {
              return onError(scope, new Error('Доступ запрещен!'), res, false);
            }

            let cm = scope.metaRepo.getMeta(req.params.class, null, n.ns);
            let locales = new locale.Locales(req.headers['accept-language']);
            lang = locales[0] ? locales[0].language : 'ru';

            let pm, rcm, vm;
            pm = cm.getPropertyMeta(req.params.property);
            if (pm && pm._refClass) {
              rcm = pm._refClass;
              vm = null;
              vm = scope.metaRepo.getListViewModel(rcm.getCanonicalName(), `${node.namespace}@${node.code}`);
              if (!vm) {
                vm = buildListVm(rcm, vm);
              }
            } else {
              return pnf(req, res);
            }

            return scope.securedDataRepo.getItem(
              req.params.id ?
                cm.getCanonicalName() :
                scope.securedDataRepo.wrap(cm.getCanonicalName(), {}, null),
              req.params.id,
              {user: user}
            )
              .then(returnSelection(node, pm, rcm, vm, scope, req, lang, user))
              .then((tplData) => {
                tplData.baseUrl = req.app.locals.baseUrl;
                res.render(
                  overrideTpl(
                    moduleName,
                    'view/list',
                    'selection',
                    req.params.node,
                    cm.getCanonicalName(),
                    scope.settings),
                  itemTplData(tplData, lang));
              });
          })
          .catch(function (err) {
            onError(scope, err, res, true);
          });
      } catch (err) {
        onError(scope, err, res, true);
      }
    },
    res
  );
};
