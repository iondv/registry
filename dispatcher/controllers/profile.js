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
const FieldTypes = require('core/FieldTypes');
const prepareDate = require('../../backend/items').prepareDate;
const locale = require('locale');
const moment = require('moment-timezone');

/* jshint maxstatements: 50, maxcomplexity: 30 */
module.exports = function (req, res) {
  respond(['auth'],
    /**
     * @param {{metaRepo: MetaRepository, settings: SettingsRepository, auth: Auth}} scope
     * @param {AclProvider} scope.aclProvider
     */
    function (scope) {
      try {
        let locales = new locale.Locales(req.headers['accept-language']);
        let lang = locales[0] ? locales[0].language : 'ru';
        let user = scope.auth.getUser(req);
        var tplData = {
          pageCode: 'profile',
          FieldTypes: FieldTypes,
          user: user,
          module: moduleName,
          options: { pwdMinLength: scope.auth.authOptions().passwordMinLength},
          errors: req.flash('error'),
          baseUrl: req.app.locals.baseUrl,
          utils: {
            dateCallback: (date, trimTime, iso) => prepareDate(date, iso ? null : lang, user.timeZone(), trimTime)
          },
          locale: {
            lang: lang,
            dateFormat: moment.localeData(lang).longDateFormat('L'),
            dateTimeFormat: moment.localeData(lang).longDateFormat('L') + ' ' + moment.localeData(lang).longDateFormat('LT')
          }
        };
        scope.auth.profileFields()
          .then(
            function (pf) {
              tplData.fields = pf;
              return buildMenus(
                tplData, req.query && req.query.modal, scope.settings,
                scope.metaRepo, scope.aclProvider, user, moduleName
              );
            })
          .then(
            function (tplData) {
              tplData.baseUrl = req.app.locals.baseUrl;
              res.render('profile', tplData);
            }
          )
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
