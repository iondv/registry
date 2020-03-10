'use strict';
/**
 * Created by krasilneg on 09.06.17.
 */
const respond = require('../../backend/respond');
const onError = require('../../backend/error');
const pnf = require('./404.js');
const forbidden = require('./403.js');
const moduleName = require('../../module-name');
const itemTplData = require('../../backend/items').itemTplData;
const prepareJSON = require('../../backend/items').prepareJSON;
const prepareDate = require('../../backend/items').prepareDate;
const overrideTpl = require('../../backend/viewmodels').overrideTpl;
const PropertyTypes = require('core/PropertyTypes');
const processNavigation = require('../../backend/menu').processNavigation;

// jshint maxstatements: 30

/**
 * @param {Array} list
 * @param {ClassMeta} cm
 */
function fillSubList(list, cm) {
  let desc = cm.getDescendants();
  for (let i = 0; i < desc.length; i++) {
    let d = desc[i];
    if (!d.isAbstract()) {
      list.push({
        name: d.getCanonicalName(),
        caption: d.getCaption()
      });
    }
    fillSubList(list, d);
  }
}

module.exports = function (req, res) {
  respond(['metaRepo', 'settings', 'aclProvider', 'auth'],
    /**
     * @param {{metaRepo: MetaRepository, settings: SettingsRepository, auth: Auth}} scope
     * @param {AclProvider} scope.aclProvider
     */
    function (scope) {
      try {
        var lang, master, vm;
        var user = scope.auth.getUser(req);
        processNavigation(scope, req)
          .then((info) => {
            let cm = info.classMeta;
            let basicCm = cm;
            let node = info.node;

            if (req.query.choice) {
              cm = scope.metaRepo.getMeta(req.query.choice, null, cm.getNamespace());
              let q = '';
              for (let pn in req.query) {
                if (req.query.hasOwnProperty(pn)) {
                  q = q + '&' + pn + '=' + encodeURIComponent(req.query[pn]);
                }
              }
              const newUrl = req.params.container ?
                `/${moduleName}/${req.params.node}/new/${req.params.container}/${req.params.property}/${cm.getCanonicalName()}?force_class=1${q}` :
                `/${moduleName}/${req.params.node}/new/${cm.getCanonicalName()}?force_class=1${q}`;
              res.redirect(newUrl);
              return null;
            }

            let list = [];
            if (req.params.container && req.params.property) {
              let parts = req.params.container.split('.');
              let ccm = scope.metaRepo.getMeta(parts[0], null, cm.getNamespace());
              let cpm = ccm.getPropertyMeta(req.params.property);
              if (cpm.type === PropertyTypes.COLLECTION || cpm.type === PropertyTypes.REFERENCE) {
                if (Array.isArray(cpm.allowedSubclasses) && cpm.allowedSubclasses.length) {
                  cpm.allowedSubclasses.forEach((cn) => {
                    let asc = scope.metaRepo.getMeta(cn, null, cm.getNamespace());
                    if (asc.checkAncestor(cm.getCanonicalName())) {
                      list.push({
                        name: asc.getCanonicalName(),
                        caption: asc.getCaption()
                      });
                    }
                  });
                }
              }
            }

            if (!list.length) {
              if (!cm.isAbstract()) {
                list.push({
                  name: cm.getCanonicalName(),
                  caption: cm.getCaption()
                });
              }
              fillSubList(list, cm);
            }

            res.render(
              overrideTpl(
                moduleName,
                'view/selectClass',
                'selectClass',
                req.params.node,
                cm.getCanonicalName(),
                scope.settings
              ),
              itemTplData(
                {
                  baseUrl: req.app.locals.baseUrl,
                  module: moduleName,
                  classId: cm.getCanonicalName(),
                  master: master,
                  title: (node ? node.caption : cm.getCaption()) + (cm !== basicCm ? ': ' + cm.getCaption() : ''),
                  pageCode: node && node.code || cm.getCanonicalName(),
                  node: req.params.node,
                  form: vm,
                  subclasses: list,
                  user: user,
                  utils: {
                    dateCallback: date => prepareDate(date, lang, user.timeZone()),
                    toJSON: data => prepareJSON(data, lang, user.timeZone())
                  },
                  validateBy: req.params.container && req.params.property
                    ? req.params.container + '.' + req.params.property
                    : null
                },
                lang
              )
            );
          })
          .catch((err) => {
            if (err === 404) {
              return pnf(req, res);
            }
            if (err === 403) {
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
