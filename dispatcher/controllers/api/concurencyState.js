'use strict';
const moduleName = require('../../../module-name');
const respond = require('../../../backend/respond');
const concurencyState = require('../../../backend/items').concurencyState;

module.exports = function (req, res) {
  respond(['auth', 'settings', 'concurencyChecker'], scope => {
    let user = scope.auth.getUser(req);
    if (!user) {
      res.status(401).send({error: 'not authenticated'});
    }
    let timeout = parseInt(scope.settings.get(moduleName + '.concurencyCheck')) || 0;
    concurencyState(`${req.params.class}@${req.params.id}`, user, timeout, scope.concurencyChecker, scope.auth)
      .then(state => res.send({isBlocked: state ? state.user !== user.id() : false}))
      .catch(err => res.status(500).send({error: 'something went wrong'}));
  });
};
