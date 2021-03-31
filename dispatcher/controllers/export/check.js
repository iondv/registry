'use strict';

const respond = require('../../../backend/respond');
const onError = require('../../../backend/apiError');
const processNavigation = require('../../../backend/menu').processNavigation;
const {t} = require('@iondv/i18n');
const {format} = require('util');

module.exports = function (req, res) {
  respond(['aclProvider', 'export', 'auth'],
    (scope) => {
      try {
        let user = scope.auth.getUser(req);
        processNavigation(scope, req)
          .then((info) => {
            let cm = info.classMeta;
            if (!cm) {
              throw new Error(t('Failed to determine class', {lang: req.locals.lang}));
            }

            let exporter = scope.export.exporter(req.params.format, {class: cm, item: req.params.id});
            if (!exporter) {
              throw new Error(format(t('Failed to determine exporter by format %s'), req.params.format));
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