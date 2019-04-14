/**
 * Created by kras on 12.09.16.
 */
'use strict';

const Preprocessor = require('core/interfaces/Preprocessor');
// const velocity = require('velocity');

function VelocityPreprocessor(options) {
  this._preprocess = function (data, options) {
    return new Promise(function (resolve, reject) {
      resolve(data);
    });
  };
}

VelocityPreprocessor.prototype = Preprocessor;
module.exports = VelocityPreprocessor;
