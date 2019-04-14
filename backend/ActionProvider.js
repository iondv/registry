/**
 * Created by kras on 07.09.16.
 */
'use strict';

const ActionHandler = require('./ActionHandler');

function ActionProvider(options) {
  var actions = {};

  if (options.actions && Array.isArray(options.actions)) {
    options.actions.forEach((a) => {
      let handler = a.handler;
      if (handler instanceof ActionHandler) {
        actions[a.code] = handler;
      }
    });
  }

  this.getAction = function (name) {
    if (actions.hasOwnProperty(name)) {
      return actions[name];
    }
    return null;
  };
}

module.exports = ActionProvider;
