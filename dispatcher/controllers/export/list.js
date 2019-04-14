/**
 * Created by kras on 31.10.16.
 */
'use strict';
const locale = require('locale');
const pnf = require('../404.js');
const canonicNode = require('../../../backend/menu').canonicNode;
const nodeAclId = require('../../../backend/menu').nodeAclId;
const formListOptions = require('../../../backend/items').formListOptions;
const onError = require('../../../backend/error');
const respond = require('../../../backend/respond');
const Permissions = require('core/Permissions');
const overrideEagerLoading = require('../../../backend/items').overrideEagerLoading;
const moduleName = require('../../../module-name');
const moment = require('moment');

// jshint maxstatements: 50, maxcomplexity: 30
module.exports = function (req, res) {
  respond(['metaRepo', 'securedDataRepo', 'settings', 'export', 'aclProvider', 'auth'],
    /**
     * @param {{metaRepo: MetaRepository, settings: SettingsRepository, export: ExportManager, auth: Auth}} scope
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
        let lang, cm, exporter;
        scope.aclProvider.checkAccess(user, nodeAclId(node), Permissions.READ)
          .then(
            function (accessible) {
              if (!accessible) {
                return onError(scope, new Error('Доступ запрещен!'), res, false);
              }
              cm = scope.metaRepo.getMeta(req.params.class ? req.params.class : node.classname, null, n.ns);
              if (cm && node.type === 1) {
                exporter = scope.export.exporter(req.params.format, {class: cm});
                if (exporter) {
                  let locales = new locale.Locales(req.headers['accept-language']);
                  lang = locales[0] ? locales[0].language : 'ru';
                  return formListOptions(moduleName, scope, req, locales)
                    .then((lopts) => {
                      let eagerLoading = [];
                      if (node && node.eagerLoading) {
                        if (node.eagerLoading.exportList && Array.isArray(node.eagerLoading.exportList[cm.getName()])) {
                          eagerLoading = node.eagerLoading.exportList[cm.getName()];
                        }
                      }

                      eagerLoading = overrideEagerLoading(
                        moduleName,
                        [],
                        node ? node.namespace + '@' + node.code : '',
                        req.params.class,
                        'exportList',
                        scope.settings
                      );

                      let params = {};
                      let param_meta = exporter.getParams() || {};
                      for (let pn in param_meta) {
                        if (param_meta.hasOwnProperty(pn)) {
                          let v = req.query[pn];
                          if (v) {
                            if (param_meta[pn].type === 'date') {
                              v = moment(v, moment.localeData(lang).longDateFormat('L')).tz(user.timeZone()).toDate();
                            }
                            params[pn] = v;
                          }
                        }
                      }

                      return scope.export
                        .export(
                          req.params.format,
                          {
                            class: cm,
                            eagerLoading: eagerLoading,
                            filter: lopts.filter,
                            params: params,
                            user: user,
                            lang: lang,
                            tz: user.timeZone()
                          })
                        .then((data) => {
                          if (exporter.isBackground()) {
                            if (!data) {
                              throw new Error('Фоновый процесс не был запущен.');
                            }
                            res.status(200).send(data);
                          } else {
                            let fn = encodeURIComponent(exporter.getFileName({classMeta: cm, params}));
                            res.
                            set('Content-Disposition', 'attachment; filename="' + fn + '";filename*=UTF-8\'\'' + fn).
                            set('Content-type', exporter.getMimeType()).
                            status(200).send(data);
                          }
                        });
                  });
                }
              }
              return pnf(req, res);
            })
          .catch((err) => {onError(scope, err, res, true);});
      } catch (err) {
        onError(scope, err, res, true);
      }
    },
    res
  );
};
