'use strict';
const moment = require('moment');

module.exports = function (req, res) {
  let d = {};
  for (let nm in req.body) {
    if (req.body.hasOwnProperty(nm)) {
      let v = req.body[nm];
      if (typeof v === 'object') {
        let t = v.t;
        switch (t) {
          case 'date':
            v = moment(v.v).toDate();
            break;
          default:
            v = v.v;
            break;
        }
      }
      d[nm] = v;
    }
  }
  req.session = Object.assign(req.session, d);
  res.sendStatus(200);
};
