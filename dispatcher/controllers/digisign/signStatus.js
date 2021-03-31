const onError = require('../../../backend/error');
const respond = require('../../../backend/respond');
const base64 = require('base64-js');
const {t} = require('@iondv/i18n');

function checkDataStatus(data, signData) {
  try {
    const d = Array.isArray(data) ? data[0] : data;
    const s = Array.isArray(signData) ? signData[0] : signData;
    if (d && d.content && s && s.content) {
      const content = Buffer.from(Array.isArray(d.content) ? d.content[0] : d.content);
      const sContent = Buffer.from(Array.isArray(s.content) ? s.content[0] : s.content);
      return content.equals(sContent);
    }
    return false;
  } catch (e) {
    return false;
  }
}

module.exports = function (req, res) {
  respond(['metaRepo', 'securedDataRepo', 'signManager', 'auth'],
    (scope) => {
      try {
        const user = scope.auth.getUser(req);
        const opts = {user: user};
        scope.securedDataRepo.getItem(req.params.class, req.params.id, opts)
          .then((item) => {
            if (!item) {
              return res.status(404).send(t('Signed data object not found.', {lang: req.locals.lang}));
            }
            const objectId = item.getMetaClass().getName() + '@' + item.getItemId();
            return scope.signManager.getSignatures(objectId, null, null, {asBase64: false})
              .then((signs) => {
                if (Array.isArray(signs) && signs[0]) {
                  if (signs[0].attributes && signs[0].attributes.action) {
                    return scope.signManager.getDataForSigning(item, signs[0].attributes.action)
                      .then((data) => {
                        const st = checkDataStatus(data, signs[0].data) ? 'actual' : 'inactual';
                        const sig = Array.isArray(signs[0].signature) ?
                          base64.fromByteArray(signs[0].signature[0]) :
                          null;
                        res.send({status: st, signature: sig});
                      });
                  }
                }
                return res.send({status: 'not_signed'});
              });
          })
          .catch((err) => onError(scope, err, res, true));
      } catch (err) {
        onError(scope, err, res, true);
      }
    },
    res
  );
};
