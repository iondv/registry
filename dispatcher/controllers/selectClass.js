'use strict';
/**
 * Created by krasilneg on 09.06.17.
 */
const respond = require('../../backend/respond');
const onError = require('../../backend/error');
const pnf = require('./404.js');
const canonicNode = require('../../backend/menu').canonicNode;
const nodeAclId = require('../../backend/menu').nodeAclId;
const Permissions = require('core/Permissions');
const moduleName = require('../../module-name');
const itemTplData = require('../../backend/items').itemTplData;
const prepareJSON = require('../../backend/items').prepareJSON;
const prepareDate = require('../../backend/items').prepareDate;
const overrideTpl = require('../../backend/viewmodels').overrideTpl;
const PropertyTypes = require('core/PropertyTypes');

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
        var n = canonicNode(req.params.node);
        var node = scope.metaRepo.getNode(n.code, n.ns);
        if (!node) {
          return pnf(req, res);
        }
        var lang, master, vm;
        var user = scope.auth.getUser(req);
        scope.aclProvider.checkAccess(user, nodeAclId(node), Permissions.READ)
          .then((accessible) => {
            if (!accessible) {
              throw new Error('Доступ запрещен!');
            }
            if (req.query.choice) {
              let cm = scope.metaRepo.getMeta(req.query.choice, null, n.ns);
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

            let cm = scope.metaRepo.getMeta(req.params.class ? req.params.class : node.classname, null, n.ns);

            let list = [];
            if (req.params.container && req.params.property) {
              let parts = req.params.container.split('.');
              let ccm = scope.metaRepo.getMeta(parts[0], null, n.ns);
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
                scope.settings),
              itemTplData(
                {
                  baseUrl: req.app.locals.baseUrl,
                  module: moduleName,
                  classId: cm.getCanonicalName(),
                  master: master,
                  title: node.caption + (cm.getName() !== node.classname ? ': ' + cm.getCaption() : ''),
                  pageCode: node.code,
                  node: req.params.node,
                  form: vm,
                  subclasses: list,
                  user: user,
                  utils: {
                    dateCallback: function (date) {
                      return prepareDate(date, lang, user.timeZone());
                    },
                    toJSON: function (data) {
                      return prepareJSON(data, lang, user.timeZone());
                    }
                  },
                  validateBy: req.params.container && req.params.property
                    ? req.params.container + '.' + req.params.property
                    : null
                },
                lang
              )
            );
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
