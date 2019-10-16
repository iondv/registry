/**
 * Created by kras on 09.09.16.
 */
/**
 * Created by kras on 26.06.16.
 */
'use strict';
const moduleName = require('../../module-name');
const multipart = require('../../backend/items').parseMultipart;
const processNavigation = require('../../backend/menu').processNavigation;
const onError = require('../../backend/error');
const respond = require('../../backend/respond');
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
    (scope) => {
      multipart(req,
        (err, form) => {
          if (err) {
            return onError(scope, err, res, true);
          }
          let user = scope.auth.getUser(req);
          try {
            processNavigation(scope, req)
              .then(
                (info) => {
                  if (!form.$action) {
                    return res.status(400).send('Не указано действие ');
                  }

                  let cm = info.classMeta;
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
                (err) => {
                  if (err === 404) {
                    return res.status(400).send('Ресурс не найден');
                  }
                  if (err === 403) {
                    return res.status(403).send('Доступ запрещен');
                  }
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
