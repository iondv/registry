/**
 * Created by kras on 01.06.16.
 */
'use strict';

const canonicNode = require('../../../backend/menu').canonicNode;
const prepareJSON = require('../../../backend/items').prepareJSON;
const formListOptions = require('../../../backend/items').formListOptions;
const locale = require('locale');
const onError = require('../../../backend/error');
const respond = require('../../../backend/respond');
const moduleName = require('../../../module-name');

// jshint maxstatements: 40, maxcomplexity: 20, maxdepth: 20, loopfunc: true

module.exports = function (req, res) {
  respond(['metaRepo', 'securedDataRepo', 'logRecorder', 'auth', 'queryParser'],
    /**
     * @param {{metaRepo: MetaRepository, securedDataRepo: DataRepository, logRecorder: LogRecorder, auth: Auth}} scope
     * @param {AccessChecker} scope.accessChecker
     */
    function (scope) {
      try {
        let log;
        let locales = new locale.Locales(req.headers['accept-language']);
        let lang = locales[0] ? locales[0].language : 'ru';

        scope.logRecorder.start();
        let user = scope.auth.getUser(req);
        let node;
        if (req.body.node) {
          let n = canonicNode(req.body.node);
          node = scope.metaRepo.getNode(n.code, n.ns);
        }
        let vm;
        let cm = scope.metaRepo.getMeta(req.params.class);
        if (node) {
          vm = scope.metaRepo.getListViewModel(cm.getCanonicalName(), `${node.namespace}@${node.code}`);
        } else {
          vm = scope.metaRepo.getListViewModel(cm.getCanonicalName());
        }

        formListOptions(moduleName, scope, req, locales)
          .then((lo) => {
            lo.user = user;
            return scope.securedDataRepo.getList(req.params.class, lo);
          })
          .then((result) => {
            log = scope.logRecorder.stop();
            let p = Promise.resolve();
            if (vm && vm.styles) {
              for (let i = 0; i < result.length; i++) {
                result[i].__styles = {};
                for (let nm in vm.styles) {
                  if (vm.styles.hasOwnProperty(nm) && typeof vm.styles[nm] === 'function') {
                    p = p.then(() => vm.styles[nm].apply(result[i])).then((v) => {
                      result[i].__styles[nm] = v;
                    });
                  }
                }
              }
            }
            return p.then(() => result);
          })
          .then((result) => {
            res.send({
              draw: parseInt(req.body.draw),
              recordsTotal: result.total,
              recordsFiltered: result.total,
              data: prepareJSON(result, lang, user.timeZone()),
              log: log
            });
          })
          .catch((err) => {
            scope.logRecorder.stop();
            onError(scope, err, res, true);
          });
      } catch (err) {
        scope.logRecorder.stop();
        onError(scope, err, res, true);
      }
    },
    res
  );
};
