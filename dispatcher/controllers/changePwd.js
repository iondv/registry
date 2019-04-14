/**
 * Created by krasilneg on 23.05.17.
 */
'use strict';

const pnf = require('./404.js');
const forbidden = require('./403.js');
const buildMenus = require('../../backend/menu').buildMenus;
const moduleName = require('../../module-name');
const onError = require('../../backend/error');
const respond = require('../../backend/respond');

/* jshint maxstatements: 50, maxcomplexity: 30 */
module.exports = function (req, res) {
  respond(['auth'],
    /**
     * @param {{metaRepo: MetaRepository, settings: SettingsRepository, auth: Auth}} scope
     * @param {AclProvider} scope.aclProvider
     */
    function (scope) {
      try {
        var user = scope.auth.getUser(req);
        var tplData = {
          pageCode: 'changePassword',
          user: user,
          module: moduleName,
          options: { pwdMinLength: scope.auth.authOptions().passwordMinLength},
          errors: req.flash('error')
        };

        buildMenus(tplData, req.query && req.query.modal, scope.settings, scope.metaRepo, scope.aclProvider, user, moduleName)
          .then(function (tplData) {
            tplData.baseUrl = req.app.locals.baseUrl;
            res.render('changePwd', tplData);
          })
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
