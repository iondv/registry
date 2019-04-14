/**
 * Created by kras on 10.09.16.
 */
'use strict';

// jshint maxstatements:20, maxcomplexity: 11

const moduleName = require('../../module-name');
const respond = require('../../backend/respond');

module.exports = function (req, res) {
  respond(['settings'],
    /**
     * @param {{settings: SettingsRepository}} scope
     */
    function (scope) {
      var defaultPath = scope.settings.get(moduleName + '.defaultPath') || 'dashboard';
      res.redirect('/' + moduleName + '/' + defaultPath);
    },
    res
  );
};
