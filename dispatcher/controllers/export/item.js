/**
 * Created by kras on 31.10.16.
 */
'use strict';
const locale = require('locale');
const pnf = require('../404.js');
const forbidden = require('../403.js');
const onError = require('../../../backend/error');
const respond = require('../../../backend/respond');
const overrideEagerLoading = require('../../../backend/items').overrideEagerLoading;
const moment = require('moment-timezone');
const processNavigation = require('../../../backend/menu').processNavigation;
const {t} = require('@iondv/i18n');

// jshint maxstatements: 50, maxcomplexity: 30
module.exports = function (req, res) {
  respond(['metaRepo', 'securedDataRepo', 'settings', 'export', 'auth'],
    /**
     * @param {{metaRepo: MetaRepository, settings: SettingsRepository, export: ExportManager, auth: Auth}} scope
     * @param {DataRepository} scope.securedDataRepo
     */
    (scope) => {
      let locales = new locale.Locales(req.headers['accept-language']);
      let lang = locales[0] ? locales[0].language : 'ru';

      let user = scope.auth.getUser(req);

      processNavigation(scope, req)
        .then((info) => {
          let cm = info.classMeta;
          let node = info.node;
          let eagerLoading = [];
          if (node && node.eagerLoading) {
            if (node.eagerLoading.exportItem && Array.isArray(node.eagerLoading.exportItem[cm.getName()])) {
              eagerLoading = node.eagerLoading.exportItem[cm.getName()];
            }
          }

          eagerLoading = overrideEagerLoading(
            req.moduleName,
            eagerLoading,
            node ? node.namespace + '@' + node.code : '',
            cm.getCanonicalName(),
            'exportItem',
            scope.settings);

          let exporter = scope.export.exporter(req.params.format, {class: cm, item: req.params.id});

          if (!exporter) {
            return pnf(req, res);
          }

          let params = {};
          let param_meta = exporter.getParams() || {};
          for (let pn in param_meta) {
            if (param_meta.hasOwnProperty(pn)) {
              let v = req.query[pn];
              if (v) {
                if (param_meta[pn].type === 'date') {
                  v = moment(v, moment.localeData(lang).longDateFormat('L')).tz(user.timeZone()).toDate();
                }
                if (user.timeZone()) {
                  v = v.tz(user.timeZone());
                }                
                if (param_meta[pn].margin) {
                  v.add(param_meta[pn].margin);
                }                
                params[pn] = v;
              }
            }
          }

          return scope.export.export(
            req.params.format,
            {
              class: cm,
              item: req.params.id,
              params: params,
              eagerLoading: eagerLoading,
              user: user,
              lang: lang,
              tz: user.timeZone()
            })
            .then((data) => {
              if (exporter.isBackground()) {
                if (!data) {
                  throw new Error(t('Background job was not started.', {lang}));
                }
                res.status(200).send(data);
              } else {
                if (data === null) {
                  return pnf(req, res);
                }
                return scope.securedDataRepo.getItem(cm.getCanonicalName(), req.params.id, {user: user})
                  .then((item) => {
                    let fn = encodeURIComponent(exporter.getFileName({classMeta: cm, params, item}));
                    res
                      .set('Content-Disposition', 'attachment; filename="' + fn + '";filename*=UTF-8\'\'' + fn)
                      .set('Content-type', exporter.getMimeType())
                      .status(200)
                      .send(data);
                  });
              }
            });
        })
        .catch((err) => {
          if (err === 403) {
            return forbidden(req, res);
          }
          if (err === 404) {
            return pnf(req, res);
          }
          onError(scope, err, res, true);
        });
    },
    res
  );
};
