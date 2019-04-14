/**
 * Created by kras on 24.05.16.
 */
'use strict';

const pnf = require('../404.js');
const locale = require('locale');
const buildCreateFormVm = require('../../../backend/viewmodels').buildCreateFormVm;
const itemTplData = require('../../../backend/items').itemTplData;
const moduleName = require('../../../module-name');
const collectionTableOptions = require('../../../backend/viewmodels').collectionTableOptions;
const adjustFields = require('../../../backend/viewmodels').adjustFields;
const prepareJSON = require('../../../backend/items').prepareJSON;
const prepareDate = require('../../../backend/items').prepareDate;
const onError = require('../../../backend/error');
const respond = require('../../../backend/respond');
const canonicNode = require('../../../backend/menu').canonicNode;
const geoFieldSearchVal = require('../../../backend/viewmodels').geoFieldSearchVal;
const ClassMeta = require('core/interfaces/MetaRepository').ClassMeta;
const Item = require('core/interfaces/DataRepository').Item;
const PropertyTypes = require('core/PropertyTypes');
const path = require('path');


// jshint maxstatements: 50, maxcomplexity: 20

module.exports = function (req, res) {
  respond(['metaRepo', 'securedDataRepo', 'settings', 'aclProvider', 'auth', 'export'],
    /**
     * @param {{metaRepo: MetaRepository, securedDataRepo: DataRepository, settings: SettingsRepository, auth: Auth}} scope
     * @param {AclProvider} scope.aclProvider
     */
    function (scope) {
      try {
        let user = scope.auth.getUser(req);
        let cm = scope.metaRepo.getMeta(req.params.class);
        if (!cm) {
          return pnf(req, res);
        }

        let node;
        if (req.params.node) {
          let n = canonicNode(req.params.node);
          node = scope.metaRepo.getNode(n.code, n.ns);
        }

        let exporter = scope.export.exporter(req.params.format, {class: cm, item: req.params.id});
        if (!exporter) {
          return pnf(req, res);
        }

        let dummy = {
          name: 'ExportParams',
          caption: 'Параметры экспорта',
          properties: []
        };

        let locales = new locale.Locales(req.headers['accept-language']);
        let lang = locales[0] ? locales[0].language : 'ru';

        let data = {};
        let attrPermissions = {};
        let params_meta = exporter.getParams();
        let i = 0;
        let slfetch = Promise.resolve();
        let dateCallback = function (date, trimTime) {return prepareDate(date, lang, user.timeZone(), trimTime);};
        Object.keys(params_meta).forEach((nm) => {
          if (params_meta.hasOwnProperty(nm)) {
            let pm = {
              orderNumber: i,
              name: nm,
              caption: params_meta[nm].caption,
              type: params_meta[nm].type === 'date' ?
                PropertyTypes.DATETIME :
                params_meta[nm].type === 'reference' ?
                  PropertyTypes.REFERENCE :
                  PropertyTypes.STRING,
              size: 20,
              decimals: 2,
              allowedFileTypes: null,
              maxFileCount: 0,
              nullable: true,
              readonly: false,
              indexed: false,
              unique: false,
              autoassigned: false,
              hint: null,
              defaultValue: null,
              refClass: params_meta[nm].className,
              _refClass: params_meta[nm].type === 'reference' && params_meta[nm].className ?
                scope.metaRepo.getMeta(params_meta[nm].className) : null,
              itemsClass: '',
              backRef: '',
              backColl: '',
              binding: '',
              semantic: null,
              selConditions: [],
              selSorting: [],
              selectionProvider: null,
              indexSearch: false,
              eagerLoading: false,
              formula: null
            };
            dummy.properties.push(pm);
            let dv = params_meta[nm].getDefaultValue();
            if (dv) {
              data[nm] = dv;
            }
            i++;
          }
        });

        let pcm = new ClassMeta(dummy);

        let props = pcm.getPropertyMetas();
        props.forEach((pm) => {
          if (pm.type === PropertyTypes.REFERENCE) {
            attrPermissions[pm.name] = {write: true, read: true};
            slfetch = slfetch
              .then(() => scope.dataRepo.getList(pm._refClass.getCanonicalName()))
              .then((l) => {
                pm.selectionProvider = {
                  type: 'SIMPLE',
                  list: []
                };

                pm.selectionProvider.getSelection = function () {
                  return this.list;
                };

                l.forEach((item) => {
                  pm.selectionProvider.list.push({
                    key: item.getItemId(),
                    value: item.toString(null, dateCallback)
                  });
                });
              });
          }
        });

        let vm = buildCreateFormVm(pcm);
        adjustFields(pcm, vm, scope.metaRepo);
        slfetch
          .then(() => {
            let dummy = new Item(null, data, pcm);
            dummy.permissions = {full: true, read: true, write: true, delete: true, use: true};
            dummy.attrPermissions = attrPermissions;
            res.render(
              'view/exportParams',
              itemTplData(
                {
                  baseUrl: req.app.locals.baseUrl,
                  module: moduleName,
                  exportUrl: req.app.locals.baseUrl + moduleName + path.normalize(path.join(req.path, '..')),
                  classId: cm.getCanonicalName(),
                  forceMaster: false,
                  master: null,
                  containerProperty: null,
                  title: 'Параметры экспорта данных',
                  pageCode: 'export-params',
                  node: req.params.node,
                  filter: req.query.filter || req.body.filter,
                  form: vm,
                  item: dummy,
                  selectionListTriggers: [],
                  log: [],
                  user: user,
                  utils: {
                    dateCallback: function (date) {
                      return prepareDate(date, lang, user.timeZone());
                    },
                    toJSON: function (data) {
                      return prepareJSON(data, lang, user.timeZone());
                    },
                    collectionTableOptions: collectionTableOptions(scope, node),
                    geoFieldSearchVal: geoFieldSearchVal
                  },
                  validateBy: null,
                  permissions: {write: true, read: true},
                  concurencyState: null
                },
                lang
              )
            );
          })
          .catch((err) => {onError(scope, err, res, true);});
      } catch (err) {
        onError(scope, err, res, true);
      }
    },
    res
  );
};
