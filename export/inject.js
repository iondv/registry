'use strict';
/**
 * Created by krasilneg on 01.03.17.
 */

function injection(values, injector) {
  return function () {
    let v = injector.inject(values);
    return (v instanceof Promise) ? v : Promise.resolve(v);
  };
}

/**
 * @param {{}} values
 * @param {Object[]} injectors
 * @returns {Promise}
 */
module.exports = function (values, injectors) {
  let p = Promise.resolve();
  if (Array.isArray(injectors)) {
    injectors.forEach(function (injector) {
      if (injector && typeof injector.inject === 'function') {
        p = p.then(injection(values, injector));
      }
    });
  }
  return p.then(() => values);
};
