'use strict';

const respond = require('../../../backend/respond');
const onError = require('../../../backend/error');
const pnf = require('../404.js');
const forbidden = require('../403.js');
const processNavigation = require('../../../backend/menu').processNavigation;

module.exports = function (req, res) {
  respond(['aclProvider', 'export', 'auth'],
    function (scope) {
      try {
        let user = scope.auth.getUser(req);
        processNavigation(scope, req)
          .then((info) => {
            let cm = info.classMeta;
          if (!cm) {
            throw new Error('Не удалось определить класс');
          }

          let exporter = scope.export.exporter(req.params.format, {class: cm, item: req.params.id});
          if (!exporter) {
            throw new Error('Не удалось определить экспортер');
          }
          return scope.export.result(
            req.params.format,
            {className: cm.getCanonicalName(), uid: user.id(), item: req.params.id, stream: true}
          );
        }).then((result) => {
          if (result && result.stream) {
            result.options((err, opts) => {
              if (err) {
                return onError(scope, err, res, true);
              }
              result.stream((err, stream) => {
                res.status(200);
                res.set('Content-Disposition',
                  'attachment; filename="' + encodeURIComponent(result.name) +
                  '";filename*=UTF-8\'\'' + encodeURIComponent(result.name));
                res.set('Content-Type', opts.mimetype || 'application/octet-stream');
                if (opts.size) {
                  res.set('Content-Length', opts.size);
                }
                if (opts.encoding) {
                  res.set('Content-Encoding', opts.encoding);
                }
                stream.pipe(res);
              });
            });
          } else {
            throw new Error('File not found!');
          }
        }).catch((err) => {
          if (err === 403) {
            return forbidden(req, res);
          }
          if (err === 404) {
            return pnf(req, res);
          }
          onError(scope, err, res, true);
        });
      } catch (err) {
        onError(scope, err, res, true);
      }
    },
    res
  );
}