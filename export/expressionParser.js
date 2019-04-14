/**
 * Created by Vasiliy Ermilov (ermilov.work@yandex.ru) on 3/29/17.
 */
'use strict';

const ExpressionParser = require('../backend/ExpressionParser');

/**
 *
 * @param {String} src
 * @param {Calculator} calc
 * @return {Function | null}
 */
function parse(src, calc) {
  let f = calc.parseFormula(src);
  if (f) {
    return function (scope, options) {
      let result;
      if (typeof f === 'function') {
        result = f.apply(scope);
      }
      return result ? result : '';
    };
  }
  return null;
}

/**
 *
 * @param {{}} options
 * @param {Calculator} options.calc
 * @constructor
 */
function CalcParser(options) {

  if (!options.calc) {
    throw new Error('no Calculator injected!');
  }

  this._compile = function (src) {
    return parse(src, options.calc);
  };
}

CalcParser.prototype = new ExpressionParser();

module.exports = CalcParser;
