/**
 * Created by kras on 24.05.16.
 */

module.exports.index = require('./controllers/home');
module.exports.dashboard = require('./controllers/dashboard');
module.exports.profile = require('./controllers/profile');
module.exports.changePassword = require('./controllers/changePwd');
module.exports.list = require('./controllers/list');
module.exports.new = require('./controllers/new');
module.exports.subclass = require('./controllers/selectClass');
module.exports.view = require('./controllers/view');
module.exports.handle = require('./controllers/handle');
module.exports.selection = require('./controllers/selection');
module.exports.createReference = require('./controllers/createReference');

/*** REST-API ***/
module.exports.api = {};
module.exports.api.get = require('./controllers/api/get');
module.exports.api.upload = require('./controllers/api/upload');
module.exports.api.update = require('./controllers/api/update');
module.exports.api.delete = require('./controllers/api/delete');
module.exports.api.create = require('./controllers/api/create');
module.exports.api.fetch = require('./controllers/api/fetch');
module.exports.api.collection = require('./controllers/api/collection');
module.exports.api.selectionLists = require('./controllers/api/selectionLists');
module.exports.api.handle = require('./controllers/api/handle');
module.exports.api.workflow = require('./controllers/api/workflow');
module.exports.api.clarifyingSearch = require('./controllers/api/clarifyingSearch');
module.exports.api.hierarchySearch = require('./controllers/api/hierarchySearch');
module.exports.api.selection = require('./controllers/api/selection');
module.exports.api.history = require('./controllers/api/history');
module.exports.api.filterEditor = require('./controllers/api/filterEditor');
module.exports.api.autoComplete = require('./controllers/api/autoComplete');
module.exports.api.createHashtag = require('./controllers/api/createHashtag');
module.exports.api.share = require('./controllers/api/share');
module.exports.api.concurencyState = require('./controllers/api/concurencyState');
module.exports.api.session = require('./controllers/api/session');

/*** ERRORS ***/
module.exports.error403 = require('./controllers/403');
module.exports.error404 = require('./controllers/404');

/*** DIGITAL SIGNATURE ***/
module.exports.digisign = {};
module.exports.digisign.getData = require('./controllers/digisign/getData');
module.exports.digisign.processSign = require('./controllers/digisign/processSign');
module.exports.digisign.signStatus = require('./controllers/digisign/signStatus');

module.exports.export = {};
module.exports.export.item = require('./controllers/export/item');
module.exports.export.list = require('./controllers/export/list');
module.exports.export.params = require('./controllers/export/params');
module.exports.export.check = require('./controllers/export/check');
module.exports.export.download = require('./controllers/export/download');
