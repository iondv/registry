/**
 * Created by kras on 25.05.16.
 */
'use strict';
const buildMenus = require('../../backend/menu').buildMenus;
const onError = require('../../backend/error');
const respond = require('../../backend/respond');
const {t} = require('@iondv/i18n');

module.exports = function (req, res) {
  respond(['metaRepo', 'settings', 'aclProvider', 'auth'],
    /**
     * @param {{metaRepo: MetaRepository, dataRepo: DataRepository, settings: SettingsRepository, auth: Auth}} scope
     * @param {AclProvider} scope.aclProvider
     */
    function (scope) {
      let user = scope.auth.getUser(req);
      try {
        var tplData = {
          baseUrl: req.app.locals.baseUrl,
          module: req.moduleName,
          title: t('Page not found'),
          pageCode: '404',
          user: user
        };
        buildMenus(tplData, req.query && req.query.modal, scope.settings, scope.metaRepo, scope.aclProvider, user, req.moduleName).
        then(function (tplData) {
          res.status(404).render('errors/404', tplData);
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
