/**
 * Created by kras on 07.09.16.
 */
'use strict';

function FormActionHandler() {
  /**
   * @param {{}} scope
   * @param {Request} req
   * @returns {Promise}
     */
  this.exec = function (scope, req) {
    return this._exec(scope, req);
  };

  /**
   * @returns {Boolean}
   */
  this.signBefore = function () {
    if (typeof this._signBefore === 'function') {
      return this._signBefore();
    }
    return false;
  };

  /**
   * @returns {Boolean}
   */
  this.signAfter = function () {
    if (typeof this._signAfter === 'function') {
      return this._signAfter();
    }
    return false;
  };
}

module.exports = FormActionHandler;
