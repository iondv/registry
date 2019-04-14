/**
 * Created by kras on 25.05.16.
 */
'use strict';
const moduleName = require('../../module-name');
const buildMenus = require('../../backend/menu').buildMenus;
const onError = require('../../backend/error');
const respond = require('../../backend/respond');

module.exports = function (req, res) {
  respond(['metaRepo', 'settings', 'aclProvider', 'auth'],
    /**
     * @param {{metaRepo: MetaRepository, dataRepo: DataRepository, settings: SettingsRepository, auth: Auth}} scope
     * @param {AclProvider} scope.aclProvider
     */
    function (scope) {
      var user = scope.auth.getUser(req);
      try {
        var tplData = {
          baseUrl: req.app.locals.baseUrl,
          module: moduleName,
          title: 'Доступ запрещен',
          pageCode: '403',
          user: user
        };
        buildMenus(tplData, req.query && req.query.modal, scope.settings, scope.metaRepo, scope.aclProvider, user, moduleName).
        then(function (tplData) {
          res.status(403).render('errors/403', tplData);
        }).catch(function (err) {
          onError(scope, err, res, true);
        });
      } catch (err) {
        onError(scope, err, res, true);
      }
    },
    res
  );
};
