'use strict';

const respond = require('../../../backend/respond');
const onError = require('../../../backend/apiError');
const nodeAclId = require('../../../backend/menu').nodeAclId;
const Permissions = require('core/Permissions');
const canonicNode = require('../../../backend/menu').canonicNode;

module.exports = function (req, res) {
  respond(['aclProvider', 'export', 'auth'],
    (scope) => {
      try {
        let n = canonicNode(req.params.node);
        let node = scope.metaRepo.getNode(n.code, n.ns);
        if (!node) {
          return onError(scope, new Error('Страница не найдена'), res, false);
        }
        let user = scope.auth.getUser(req);

        scope.aclProvider.checkAccess(user, nodeAclId(node), Permissions.READ)
          .then((accessible) => {
            if (!accessible) {
              throw new Error('Доступ запрещен!');
            }

            let cm = scope.metaRepo.getMeta(req.params.class ? req.params.class : node.classname, null, n.ns);
            if (!cm) {
              throw new Error('Не удалось определить класс');
            }

            let exporter = scope.export.exporter(req.params.format, {class: cm, item: req.params.id});
            if (!exporter) {
              throw new Error('Не удалось определить экспортер ' + req.params.format);
            }
            return scope.export
              .status(
                req.params.format,
                {className: cm.getCanonicalName(), uid: user.id(), item: req.params.id}
              )
              .then((status) => {
                if (status) {
                  return {status: 'running'};
                }
                return scope.export
                  .result(
                    req.params.format,
                    {className: cm.getCanonicalName(), uid: user.id(), item: req.params.id}
                  )
                  .then(
                    (result) => {
                      return {status: 'ready', previous: result ? result.date : null};
                    }
                  );
              });
          })
          .then((status) => {
            res.send(status);
          })
          .catch((err) => {
            onError(scope, err, res, true);
          });
      } catch (err) {
        onError(scope, err, res, true);
      }
    },
    res
  );
}