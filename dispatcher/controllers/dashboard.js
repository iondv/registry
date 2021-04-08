/**
 * Created by kras on 24.05.16.
 */
'use strict';

const buildMenus = require('../../backend/menu').buildMenus;
const onError = require('../../backend/error');
const respond = require('../../backend/respond');
const {t} = require('@iondv/i18n');

// jshint maxstatements: 50, maxcomplexity: 20
module.exports = function (req, res) {
  respond(['metaRepo', 'settings', 'aclProvider', 'auth'],
    /**
     * @param {{metaRepo: MetaRepository, settings: SettingsRepository, auth: Auth}} scope
     * @param {AclProvider} scope.aclProvider
     */
    function (scope) {
      var user = scope.auth.getUser(req);
      var params = {
        baseUrl: req.app.locals.baseUrl,
        module: req.moduleName,
        title: t('Dashboard'),
        node: null,
        pageCode: 'dashboard',
        user,
        modules: [],
        dashboardContent: '',
        logo: scope.settings.get(req.moduleName + '.logo')
      };
      buildMenus(params, req.query && req.query.modal, scope.settings, scope.metaRepo, scope.aclProvider, user, req.moduleName)
        .then(function (params) {
          try {
            params.currentModule = req.cookies ? req.cookies['dashboard-module'] : '';
            let apps = scope.settings.get(`${req.moduleName}.dashboard`);
            if (apps) {
              let selModule = null;
              let selModuleData;
              let selApp;
              for (let app in apps) {
                if (apps.hasOwnProperty(app)) {
                  for (let module in apps[app].modules) {
                    if (apps[app].modules.hasOwnProperty(module)) {
                      let id = `${module}@${app}`;
                      params.modules.push(id);
                      if (id === params.currentModule || !selModule) {
                        selModule = module;
                        selModuleData = apps[app].modules[module];
                        selApp = app;
                      }
                    }
                  }
                }
              }
              if (selModule) {
                const module = require(`@iondv/${selModule}/Manager`);
                module.render(Object.assign({
                  currentApp: selApp,
                  req,
                  res
                }, selModuleData), function (err, result) {
                  if (err) {
                    onError(scope, err);
                  } else {
                    params.dashboardContent = result;
                  }
                  res.render('view/dashboard', params);
                });
                return;
              }
            }
            res.render('view/dashboard', params);
          } catch (err) {
            onError(scope, err);
            return res.render('view/dashboard', params);
          }
        }).catch(function (err) {
          onError(scope, err);
          return res.render('view/dashboard', params);
        });
    },
    res
  );
};

