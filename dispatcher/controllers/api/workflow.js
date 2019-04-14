/**
 * Created by kras on 31.10.16.
 */
'use strict';

const onError = require('../../../backend/error');
const respond = require('../../../backend/respond');
const adjustSignOptions = require('../../../backend/viewmodels').adjustWfSignOptions;
const locale = require('locale');
const itemEagerLoading = require('../../../backend/items').itemEagerLoading;

module.exports = function (req, res) {
  respond(['metaRepo', 'securedDataRepo', 'workflows', 'auth'],
    /**
     * @param {{metaRepo: MetaRepository, securedDataRepo: DataRepository, workflows: WorkflowProvider}} scope
     * @param {Auth} scope.auth
     * @param {DigitalSignManager} scope.signManager
     */
    function (scope) {
      try {
        let user = scope.auth.getUser(req);
        let item;
        let locales = new locale.Locales(req.headers['accept-language']);
        let lang = locales[0] ? locales[0].language : 'ru';

        let opts = {user: user};
        opts.forceEnrichment = itemEagerLoading(req.params.class, null, scope);

        scope.securedDataRepo.getItem(req.params.class, req.params.id, opts).
        then(function (found) {
          if (found) {
            item = found;
            return scope.workflows.getStatus(found,  {user: user, lang: lang});
          } else {
            throw new Error('Объект не найден');
          }
        }).
        then(function (status) {
          if (status) {
            return adjustSignOptions(item, status, scope.signManager);
          }
          return status;
        }).
        then(function (status) {
          res.status(200).send(status);
        }).
        catch(function (err) {
          onError(scope, err, res, true);
        });
      } catch (err) {
        onError(scope, err, res, true);
      }
    },
    res
  );
};
