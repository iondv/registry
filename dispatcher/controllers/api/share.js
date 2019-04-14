/**
 * Created by Vasiliy Ermilov (email: inkz@xakep.ru, telegram: @inkz1)
 */
'use strict';

const respond = require('../../../backend/respond');
const onError = require('../../../backend/error');

module.exports = function (req, res) {
  respond(['fileStorage'],
    /**
     * @param {{fileStorage: ResourceStorage}} scope
     */
    function (scope) {
      if (req.method === 'GET') {
        let result = {};
        return scope.fileStorage.fetch([decodeURIComponent(req.params.fileId)])
          .then((sf) => {
            if (sf[0]) {
              result.link = sf[0].link;
              return scope.fileStorage.currentShare(sf[0].id);
            }
            return null;
          })
          .then((share) => {
            result = Object.assign(result, share);
            return res.send(result);
          })
          .catch(onError);
      } else if (req.method === 'POST') {
        return scope.fileStorage.share(decodeURIComponent(req.params.fileId))
          .then(shareUrl => res.send({shareUrl}))
          .catch(onError);
      } else if (req.method === 'DELETE') {
        return scope.fileStorage.deleteShare(decodeURIComponent(req.params.fileId))
          .then((success) => {
            if (!success) {
              throw new Error('share not deleted!');
            }
            return res.send(success);
          })
          .catch(onError);
      }
      return res.send({});
    },
    res
  );
};
