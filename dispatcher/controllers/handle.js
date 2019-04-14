/**
 * Created by kras on 09.09.16.
 */
/**
 * Created by kras on 26.06.16.
 */
'use strict';
const moduleName = require('../../module-name');
const multipart = require('../../backend/items').parseMultipart;
const canonicNode = require('../../backend/menu').canonicNode;
const onError = require('../../backend/error');
const respond = require('../../backend/respond');
const nodeAclId = require('../../backend/menu').nodeAclId;
const Permissions = require('core/Permissions');
const edit = require('../../backend/items').saveItem;

/* jshint maxstatements: 40, maxcomplexity: 20, maxdepth: 15 */
/**
 * @param {Request} req
 * @param {Response} res
 */
module.exports = function (req, res) {
  respond(['metaRepo', 'securedDataRepo', 'actions', 'workflows', 'aclProvider', 'auth'],
    /**
     * @param {{metaRepo: MetaRepository, securedDataRepo: DataRepository, actions: ActionProvider, auth: Auth}} scope
     * @param {WorkflowProvider} scope.workflows
     * @param {AclProvider} scope.aclProvider
     * @param {ChangelogFactory} scope.changelogFactory
     */
    function (scope) {
      multipart(req,
        function (err, form) {
          if (err) {
            return onError(scope, err, res, true);
          }
          let n = canonicNode(req.params.node);
          let node = scope.metaRepo.getNode(n.code, n.ns);
          if (!node) {
            return res.status(404).send('Не найден узел навигации');
          }
          let user = scope.auth.getUser(req);
          try {
            scope.aclProvider.checkAccess(user, nodeAclId(node), Permissions.READ)
              .then(
                function (accessible) {
                  if (!accessible) {
                    return onError(scope, new Error('Доступ запрещен!'), res, false);
                  }

                  if (!form.$action) {
                    return res.status(400).send('Не указано действие ');
                  }

                  var cm = scope.metaRepo.getMeta(req.params.class ? req.params.class : node.classname, null, n.ns);
                  req.params.class = cm.getCanonicalName();
                  var handler = scope.actions.getAction(form.$action);
                  var p;
                  if (handler) {
                    req.body = form;
                    p = handler.exec(scope, req);
                  } else {
                    var parts = form.$action.split('.');
                    if (parts.length > 1) {
                      let logger;
                      if (scope.changelogFactory) {
                        logger = scope.changelogFactory.logger(() => user.id());
                      }
                      p = edit(scope, req, null, logger, true)
                        .then(
                          function (item) {
                            return scope.workflows.performTransition(
                              item,
                              parts[0],
                              parts[1],
                              {user: user, changeLogger: logger}
                            );
                          }
                        );
                    }
                  }

                  if (p) {
                    return p.then(
                      function (result) {
                        res.redirect('/' + moduleName + '/' + req.params.node +
                          '/view/' + req.params.class + '/' + (result && result._id ? result._id : req.params.id));
                      }
                    );
                  }

                  res.status(404).send('Не найден обработчик действия ' + req.body.$action);
                })
              .catch(
                function (err) {
                  onError(scope, err, res);
                }
              );
          } catch (err) {
            onError(scope, err, res, true);
          }
        }
      );
    },
    res);
};
