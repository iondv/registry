/**
 * Created by kras on 10.09.16.
 */
'use strict';

// jshint maxstatements:20, maxcomplexity: 11

const respond = require('../../backend/respond');

module.exports = function (req, res) {
  respond(['settings'],
    /**
     * @param {{settings: SettingsRepository}} scope
     */
    function (scope) {
      var defaultPath = scope.settings.get(req.moduleName + '.defaultPath') || 'dashboard';
      res.redirect('/' + req.moduleName + '/' + defaultPath);
    },
    res
  );
};
