// jscs:disable requireCapitalizedComments
/**
 * Created by kras on 06.07.16.
 */
'use strict';

const path = require('path');
const express = require('express');
const route = express.Router;
const router = route();
const api = route();
const compression = require('compression');

// var multipart = require('multer')();

const ejsLocals = require('ejs-locals');

const di = require('core/di');
const config = require('./config');
const rootConfig = require('../../config');
const moduleName = require('./module-name');
const dispatcher = require('./dispatcher');
const extendDi = require('core/extendModuleDi');
const theme = require('lib/util/theme');
const staticRouter = require('lib/util/staticRouter');
const extViews = require('lib/util/extViews');
const {load} = require('core/i18n');
const errorSetup = require('core/error-setup');
const alias = require('core/scope-alias');
const sysMenuCheck = require('lib/util/sysMenuCheck');
const lastVisit = require('lib/last-visit');
const helpers = require('./backend/helpers');
const strings = require('core/strings');
const isProduction = process.env.NODE_ENV === 'production';
const isDevelop = process.env.NODE_ENV === 'development';

errorSetup(path.join(__dirname, 'strings'));
strings.registerBase('frontend', require('./strings/frontend-scripts'));
strings.registerBase('tpl', require('./strings/templates-default'));

router.use((req, res, next) => {
  res.locals.sessVar = nm => req.session && req.session[nm];
  next();
});

router.get('/', dispatcher.index);
router.get('/dashboard', lastVisit.saver, dispatcher.dashboard);
router.get('/profile', lastVisit.saver, dispatcher.profile);
router.get('/chpwd', dispatcher.changePassword);
router.get('/403', dispatcher.error403);

api.post('/api/upload', dispatcher.api.upload);
api.post('/api/upload/:class', dispatcher.api.upload);
api.post('/api/upload-image/:class', dispatcher.api.upload);
api.post('/api/upload/:class/:id', dispatcher.api.upload);
api.post('/api/upload-image/:class/:id', dispatcher.api.upload);

api.post('/api/do', dispatcher.api.handle);
api.get('/api/share/:fileId', dispatcher.api.share);
api.post('/api/share/:fileId', dispatcher.api.share);
api.delete('/api/share/:fileId', dispatcher.api.share);
api.post('/api/:class', dispatcher.api.fetch);
//api.post('/api/:class/do', dispatcher.api.handle);
api.post('/api/:node/:class/do', dispatcher.api.handle);

api.post('/api/:class/:property/createHashtag', dispatcher.api.createHashtag);
api.post('/api/:class/:property/clarifyingSearch', dispatcher.api.clarifyingSearch);
api.post('/api/:class/:property/hierarchySearch', dispatcher.api.hierarchySearch);
api.post('/api/:class/:property/autoComplete', dispatcher.api.autoComplete);

api.post('/api/:class/filter/list', dispatcher.api.filterEditor.list);
api.post('/api/:class/filter/add', dispatcher.api.filterEditor.add);
api.post('/api/:class/filter/edit', dispatcher.api.filterEditor.edit);
api.post('/api/:class/filter/remove', dispatcher.api.filterEditor.remove);

api.get('/api/:class/:id', dispatcher.api.get);
//api.post('/api/:class/:id/do', dispatcher.api.handle);
api.post('/api/:node/:class/:id/do', dispatcher.api.handle);
api.post('/api/:class/:id/history', dispatcher.api.history);

api.post('/api/:class/:property/selection', dispatcher.api.selection);
api.post('/api/:class/selection-lists', dispatcher.api.selectionLists);
api.post('/api/:class/:id/selection-lists', dispatcher.api.selectionLists);

api.post('/api/:class/:id/:collection/do', dispatcher.api.handle);
api.post('/api/:class/:id/:collection', dispatcher.api.collection.list);
api.post('/api/:class/:id/:collection/add', dispatcher.api.collection.add);
api.post('/api/:class/:id/:collection/remove', dispatcher.api.collection.remove);
api.post('/api/:class/:id/:collection/reorder', dispatcher.api.collection.reorder);

api.get('/api/:class/:id/workflow-state', dispatcher.api.workflow);
api.get('/api/:class/:id/concurency-state', dispatcher.api.concurencyState);

api.get('/digisign/:class/:id/status', dispatcher.digisign.signStatus);
api.post('/digisign/:class/:id/data', dispatcher.digisign.getData);
api.post('/digisign/:class/:id/sign', dispatcher.digisign.processSign);

api.post('/session', dispatcher.api.session);

api.get('/:node/:class/:id/export/:format', dispatcher.export.item);
api.post('/:node/:class/:id/export/:format', dispatcher.export.item);
api.get('/:node/:class/:id/export/:format/params', dispatcher.export.params);
api.post('/:node/:class/:id/export/:format/params', dispatcher.export.params);
api.get('/:node/:class/:id/export/:format/status', dispatcher.export.check);
api.get('/:node/:class/:id/export/:format/download', dispatcher.export.download);

api.get('/export/:node/:format', dispatcher.export.list);
api.post('/export/:node/:format', dispatcher.export.list);
api.get('/export/:node/:format/params', dispatcher.export.params);
api.post('/export/:node/:format/params', dispatcher.export.params);
api.get('/export/:node/:format/status', dispatcher.export.check);
api.get('/export/:node/:format/download', dispatcher.export.download);

api.get('/export/:node/:class/:format', dispatcher.export.list);
api.post('/export/:node/:class/:format', dispatcher.export.list);
api.get('/export/:node/:class/:format/params', dispatcher.export.params);
api.post('/export/:node/:class/:format/params', dispatcher.export.params);
api.get('/export/:node/:class/:format/status', dispatcher.export.check);
api.get('/export/:node/:class/:format/download', dispatcher.export.download);

router.get('/:node', lastVisit.saver, dispatcher.list);
router.get('/:node/new', dispatcher.new);
router.get('/:node/:class', lastVisit.saver, dispatcher.list);
router.get('/:node/new/:class', dispatcher.new);
router.get('/:node/new/:class/sub', dispatcher.subclass);
router.post('/:node/new/:class/sub', dispatcher.subclass);
router.get('/:node/new/:container/:property/:class', dispatcher.new);
router.post('/:node/new/:container/:property/:class', dispatcher.new);
router.get('/:node/new/:container/:property/:class/sub', dispatcher.subclass);
router.post('/:node/new/:container/:property/:class/sub', dispatcher.subclass);

api.post('/:node/do', dispatcher.handle);
api.post('/:node/do/:class', dispatcher.handle);
api.post('/:node/do/:class/:id', dispatcher.handle);
api.post('/:node/do/:class/:id/:collection', dispatcher.handle);

function modalLastVisitSaver (req, res, next) {
  return lastVisit.saver(
    {originalUrl: `${req.baseUrl}/${req.params.node}?open=${encodeURIComponent(req.originalUrl)}`},
    res,
    next
  );
}

router.get('/:node/view/:class/:id', modalLastVisitSaver, dispatcher.view);
router.get('/:node/view/:container/:property/:class/:id', modalLastVisitSaver, dispatcher.view);

router.get('/:node/:class/:id/:property/select', dispatcher.selection);
router.post('/:node/:class/:id/:property/select', dispatcher.selection);
router.get('/:node/:class/:property/select', dispatcher.selection);
router.post('/:node/:class/:property/select', dispatcher.selection);
router.get('/:node/:class/:property/create', dispatcher.createReference);
router.get('/:node/view/:class/:id/:collection', lastVisit.saver, dispatcher.list);
// router.get('/selection/:class/:id/:property', dispatcher.selection);

/*** ERRORS ***/

router.get('*', dispatcher.error404);

var app = express();
module.exports = app;
var cookieParser = require('cookie-parser');

app.locals.sysTitle = config.sysTitle;
app.locals.staticsSuffix = process.env.ION_ENV === 'production' ? '.min' : '';

app.use('/' + moduleName, cookieParser());
app.engine('ejs', ejsLocals);
app.set('view engine', 'ejs');
helpers(app, config);

app._init = function () {
  return load(path.join(__dirname, 'i18n'))
    .then(
      () => di(
        moduleName,
        extendDi(moduleName, config.di),
        {
          module: app
        },
        'app',
        [],
        'modules/' + moduleName
      )
    )
    .then(scope => alias(scope, scope.settings.get(moduleName + '.di-alias')))
    .then((scope) => {
      let staticOptions = isDevelop ? {} : scope.settings.get('staticOptions');
      app.locals.notificationCheckInterval = scope.settings.get(moduleName + '.notificationCheckInterval') || 15000;
      app.locals.pageTitle = scope.settings.get(moduleName + '.pageTitle')
        || scope.settings.get('pageTitle')
        || `ION ${config.sysTitle}`;
      app.locals.pageEndContent = scope.settings.get(moduleName +'.pageEndContent') || scope.settings.get('pageEndContent') || '';
      const themePath = scope.settings.get(moduleName + '.theme') || config.theme || 'default'
      theme(
        app,
        moduleName,
        __dirname,
        themePath,
        scope.sysLog,
        staticOptions
      );
      extViews(app, scope.settings.get(moduleName + '.templates'));
      var statics = staticRouter(scope.settings.get(`${moduleName}.statics`), staticOptions);
      if (statics) {
        app.use('/' + moduleName, statics);
      }
      app.use('/' + moduleName, compression(scope.settings.get(moduleName + '.compression') || {level: 9}));

      scope.auth.bindAuth(app, moduleName);
      app.post('/' + moduleName + '/chpwd', scope.auth.changePwdHandler(moduleName));
      app.post('/' + moduleName + '/profile', scope.auth.profileHandler(moduleName));
      app.use('/' + moduleName, api);
      app.use('/' + moduleName, sysMenuCheck(scope, app, moduleName));
      app.use('/' + moduleName, router);
    }
  );
};
