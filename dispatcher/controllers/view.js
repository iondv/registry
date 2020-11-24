/**
 * Created by kras on 24.05.16.
 */
'use strict';

const pnf = require('./404.js');
const forbidden = require('./403.js');
const locale = require('locale');
const buildMenus = require('../../backend/menu').buildMenus;
const buildEditFormVm = require('../../backend/viewmodels').buildEditFormVm;
const collectionTableOptions = require('../../backend/viewmodels').collectionTableOptions;
const adjustFields = require('../../backend/viewmodels').adjustFields;
const adjustSignOptions = require('../../backend/viewmodels').adjustSignOptions;
const overrideTpl = require('../../backend/viewmodels').overrideTpl;
const collectionsStyles = require('../../backend/viewmodels').collectionsStyles;
// const overrideEagerLoading = require('../../backend/items').overrideEagerLoading;
const itemEagerLoading = require('../../backend/items').itemEagerLoading;
const vmEagerLoading = require('../../backend/items').vmEagerLoading;
const itemTplData = require('../../backend/items').itemTplData;
const prepareJSON = require('../../backend/items').prepareJSON;
const prepareDate = require('../../backend/items').prepareDate;
const moduleName = require('../../module-name');
const onError = require('../../backend/error');
const respond = require('../../backend/respond');
const geoFieldSearchVal = require('../../backend/viewmodels').geoFieldSearchVal;
const Permissions = require('core/Permissions');
const formFilter = require('../../backend/items').formFilter;
const merge = require('merge');
const IonError = require('core/IonError');
const Errors = require('core/errors/front-end');
const DrErrors = require('core/errors/data-repo');
const slTriggers = require('../../backend/items').selectionListTriggers;
const concurencyState = require('../../backend/items').concurencyState;
const checkSignState = require('../../backend/items').checkSignState;
const PropertyTypes = require('core/PropertyTypes');
const processNavigation = require('../../backend/menu').processNavigation;

// jshint maxstatements: 30, maxcomplexity: 20
module.exports = function (req, res) {
  respond([
    'metaRepo', 'securedDataRepo', 'settings',
    'logRecorder', 'actions', 'signManager',
    'workflows', 'export', 'aclProvider', 'auth',
    'concurencyChecker'],
    /**
     * @param {{metaRepo: MetaRepository, securedDataRepo: DataRepository, settings: SettingsRepository, auth: Auth}} scope
     * @param {DigitalSignManager} scope.signManager
     * @param {LogRecorder} scope.logRecorder
     * @param {ActionProvider} scope.actions
     * @param {ExportManager} scope.export
     * @param {AclProvider} scope.aclProvider
     * @param {WorkflowProvider} scope.workflows
     */
    function (scope) {
      try {
        let locales = new locale.Locales(req.headers['accept-language']);
        let lang = locales[0] ? locales[0].language : 'ru';
        let user = scope.auth.getUser(req);
        let dateCallback = (date, trimTime, iso) => prepareDate(date, iso ? null : lang, user.timeZone(), trimTime);
        let toJSON = data => prepareJSON(data, lang, user.timeZone());
        let opts = {user: user, lang: lang};
        let cm, node, vm, log, state, exporters, addCollectionSyles;
        processNavigation(scope, req)
          .then((info) => {
            cm = info.classMeta;
            node = info.node;
            return concurencyState(
              `${req.params.class}@${req.params.id}`,
              user,
              parseInt(scope.settings.get(moduleName + '.concurencyCheck')) || 0,
              scope.concurencyChecker,
              scope.auth
            );
          })
          .then((concurencyState) => {
            state = concurencyState;
            let dopts = merge(false, true, opts, {nestingDepth: 0, linksByRef: true, lang});
            dopts.filter = formFilter(moduleName, scope, req, cm);
            let eagerLoading = [];
            if (node && node.eagerLoading) {
              if (node.eagerLoading.item && Array.isArray(node.eagerLoading.item[cm.getName()])) {
                eagerLoading = node.eagerLoading.item[cm.getName()];
              }
            }
            dopts.forceEnrichment = itemEagerLoading(cm, node ? node.namespace + '@' + node.code : null, scope, eagerLoading);
            scope.logRecorder.start();
            return scope.securedDataRepo.getItem(
              cm.getCanonicalName(),
              req.params.id,
              dopts
            );
          })
          .catch((err) => {
            if (err.code === DrErrors.PERMISSION_LACK) {
              throw new IonError(Errors.ACCESS_DENIED);
            }
            throw err;
          })
          .then((found) => {
            if (!found) {
              throw 404;
            }
            if (!found.permissions[Permissions.READ]) {
              throw new IonError(Errors.ACCESS_DENIED);
            }
            let wfs = scope.metaRepo.getWorkflows(found.getClassName());
            return (wfs.length ? scope.workflows.getStatus(found, opts)
              .then((status) => {
                let workflows = Object.keys(status.stages);
                if (workflows.length > 0) {
                  for (let i = 0; i < workflows.length; i++) {
                    vm = scope.metaRepo.getWorkflowView(
                      found.getMetaClass().getCanonicalName(),
                      workflows[i],
                      status.stages[workflows[i]].stage,
                      found.getMetaClass().getNamespace(),
                      found.getMetaClass().getVersion()
                    );
                    if (vm) {
                      break;
                    }
                  }
                }
              }) : Promise.resolve())
              .then(() => {
                if (!vm) {
                  vm = scope.metaRepo.getItemViewModel(
                    found.getMetaClass().getCanonicalName(),
                    node && `${node.namespace}@${node.code}`
                  );
                }
                if (!vm/* || (vm.overrideMode === 1)*/) {
                  vm = buildEditFormVm(found.getMetaClass(), vm, req.locals.lang);
                }
                merge({tabs: [], commands: []}, vm);
                adjustFields(found.getMetaClass(), vm, scope.metaRepo, req.locals.lang);
                let vmel = vmEagerLoading(vm, found.getMetaClass());
                if (vmel.length) {
                  return scope.securedDataRepo.getItem(found, null, {
                    linksByRef: true,
                    forceEnrichment: vmel,
                    skipAutoAssign: true,
                    user,
                    lang
                  });
                }
                return found;
              });
          })
          .then((found) => {
            log = scope.logRecorder.stop();
            return adjustSignOptions(found, vm, scope.actions, scope.signManager);
          })
          .then(found => scope.export.itemExporters(found).then((ex) => {
            exporters = ex;
            return found;
          }))
          .then(found => collectionsStyles(found, vm, scope.calculator).then((gcs) => {
            addCollectionSyles = gcs;
            return found;
          }))
          .then((found) => {
            let refShortView = req.query.refshort;
            let shortView = req.query.short;
            let refShortViewFields = [];
            let refShortViewDelay = shortView ? 0 : scope.settings.get(`${moduleName}.refShortViewDelay`);
            if (refShortViewDelay) {
              for (let prop of cm.getPropertyMetas()) {
                if (prop.type === PropertyTypes.COLLECTION || prop.type === PropertyTypes.REFERENCE) {
                  let view = scope.metaRepo.getItemViewModel(prop._refClass.getCanonicalName());
                  if (view && view.tabs[0] && view.tabs[0].shortFields && view.tabs[0].shortFields.length) {
                    refShortViewFields.push(prop.name);
                  }
                }
              }
            }

            let tplData = itemTplData(
              {
                baseUrl: req.app.locals.baseUrl,
                modal: req.query.modal || false,
                module: moduleName,
                windowLink: found.getItemId() ?
                  `${moduleName}/${req.params.node}?open=${moduleName}/${req.params.node}/view/${found.getClassName()}/${found.getItemId()}` :
                  null,
                title: found.toString(null, dateCallback),
                pageCode: node && node.code,
                shortView,
                globalReadonly: (state ? state.user !== user.id() : false) || req.query.readonly,
                condensedView: !!req.query.condensed,
                node: req.params.node,
                form: vm,
                item: found,
                selectionListTriggers: slTriggers(found.getMetaClass()),
                log,
                user,
                exporters,
                utils: {
                  dateCallback,
                  toJSON,
                  collectionTableOptions: collectionTableOptions(scope, node),
                  geoFieldSearchVal,
                  addCollectionSyles
                },
                validateBy:
                  typeof req.params.container !== 'undefined' &&
                  typeof req.params.property !== 'undefined' ?
                  req.params.container + '.' + req.params.property : null,
                permissions: found.permissions,
                concurencyState: {
                  userName: state ? state.userName : null,
                  isBlocked: state ? state.user !== user.id() : false,
                  timeout: parseInt(scope.settings.get(moduleName + '.concurencyCheck')) || 0
                },
                refShortViewDelay,
                refShortViewFields,
                hideModalHeader: !!refShortView,
                inlineForm: scope.settings.get(moduleName + '.inlineForm'),
                checkSignState: checkSignState(scope, cm.getCanonicalName()),
                maxTabWidth: scope.settings.get(moduleName + '.maxTabWidth')
              }, lang);
            return buildMenus(
              tplData, req.query && req.query.modal, scope.settings, scope.metaRepo,
              scope.aclProvider, user, moduleName
            ).then((tplData) => {return {found, tplData};});
          })
          .then(({found, tplData}) => {
            res.render(overrideTpl(
              moduleName,
              'view/item',
              found.getItemId() ? 'item' : 'create',
              req.params.node,
              found.getClassName(),
              scope.settings), tplData);
          })
          .catch((err) => {
            scope.logRecorder.stop();
            if (err instanceof IonError && err.code === Errors.ACCESS_DENIED || err === 403) {
              return forbidden(req, res);
            }
            if (err === 404) {
              return pnf(req, res);
            }
            onError(scope, err, res, true);
          });
      } catch (err) {
        scope.logRecorder.stop();
        onError(scope, err, res, true);
      }
    },
    res
  );
};
