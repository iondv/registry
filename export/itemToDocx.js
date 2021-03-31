/**
 * Created by Vasiliy Ermilov (ermilov.work@yandex.ru) on 11/7/16.
 */
'use strict';
const { Preprocessor } = require('@iondv/meta-model-contracts');
const resolvePath = require('@iondv/core').utils.system.toAbsolute;
const { util: { normalize } } = require('@iondv/meta-model-contracts');
const prepareDate = require('../backend/items').prepareDate;
const Docxtemplater = require('docxtemplater');
const angularExpressions = require('./angular-parser');
const { Logger } = require('@iondv/commons-contracts');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
const inject = require('./inject');
const { meta: { parseConditions: conditionParser } } = require('@iondv/meta-model');

function expParserFunc(parser) {
  return function (tag) {
    let exp;
    if (parser) {
      exp = parser.compile(tag);
    }
    if (!exp) {
      exp = angularExpressions.compile(tag.replace(/`/g, '\''));
    }
    return {
      get: function () {
        let res = exp.apply(this, [arguments[0], {GLOBAL: arguments[1].scopeList[0]}]);
        return (res === null || typeof res === 'undefined') ? '' :
          (arguments[1].meta.part.type === 'placeholder' && !arguments[1].meta.part.module) ? res.toString() : res;
      }
    };
  };
}

/**
 * @param {{tplDir: String, injectors: Array, expParser: ExpressionParser}} cOptions
 */
function ToDocx(cOptions) {

  var templates = [];

  function log(err) {
    if (cOptions.log instanceof Logger) {
      cOptions.log.error(err.message || err);
    }
  }

  this.init = function () {
    return new Promise((resolve, reject) => {
      let fn = resolvePath(cOptions.tplDir);
      fs.readdir(fn, function (err, files) {
        if (err) {
          log(err);
          return resolve();
        }
        let p = Promise.resolve();
        if (files) {
          files.forEach((file) => {
            fs.stat(path.join(fn, file), (err, stat) => {
              if (err) {
                log(err);
                return;
              }
              if (stat.isDirectory()) {
                p = p.then(() => new Promise((resolve) => {
                  fs.readdir(path.join(fn, file), (err, tmpls) => {
                    if (err) {
                      log(err);
                      return resolve();
                    }
                    if (tmpls) {
                      tmpls.forEach((template) => {
                        if (path.extname(template) === '.docx') {
                          templates.push(path.basename(template, '.docx') + '@' + file);
                        }
                      });
                    }
                    return resolve();
                  });
                }));
              } else if (path.extname(file) === '.docx') {
                templates.push(path.basename(file, '.docx'));
              }
            });
          });
        }
        p.then(resolve).catch(reject);
      });
    });
  };

  /**
   * @param {Item} item
   * @returns {Promise}
   */
  this._applicable = function (item, options) {
    let tpl = templates.indexOf(item.getClassName()) > -1;
    if (!tpl || !cOptions.calc) {
      return Promise.resolve(tpl);
    }
    let check = true;
    if (options && Array.isArray(options.conditions)) {
      let cnd = conditionParser(options.conditions, item.getMetaClass());
      let _checker = cOptions.calc.parseFormula(cnd);
      check = _checker.apply(item);
    }
    let p = check instanceof Promise ? check : Promise.resolve(check);
    return p.then(a => a && tpl);
  };

  /**
   * @param {Item} item
   * @param {{lang: String, user: User}} options
   * @returns {Promise}
   */
  this._process = function (item, options) {
    let fn = resolvePath(cOptions.tplDir);
    if (options.classMeta.getNamespace()) {
      fn = path.join(fn, options.classMeta.getNamespace());
    }
    fn = path.join(fn, options.classMeta.getName() + '.docx');
    let values = normalize(
      item,
      date => prepareDate(date, options.lang, options.user && options.user.timeZone(), true),
      {byRef: true}
    );
    values.now = new Date();
    if (options.params) {
      for (let nm in options.params) {
        if (options.params.hasOwnProperty(nm)) {
          values[nm] = options.params[nm];
        }
      }
    }
    return inject(values, cOptions.injectors)
      .then(() =>
        new Promise((resolve, reject) => {
          fs.readFile(fn, (err, data) => {
            if (err) {
              return reject(err);
            }
            try {
              var zip = new JSZip(data);
              var doc = new Docxtemplater().loadZip(zip);
              doc.setOptions({parser: expParserFunc(cOptions.expParser), linebreaks: true});
              doc.setData(values);
              doc.render();
              resolve(doc.getZip().generate({type: 'nodebuffer'}));
            } catch (err) {
              if (err.properties && err.properties.errors && err.properties.errors.length) {
                for (let i = 0; i < err.properties.errors.length; i++) {
                  if (cOptions.log instanceof Logger) {
                    cOptions.log.error(err.properties.errors[i].message);
                    cOptions.log.error('properties: ' + JSON.stringify(err.properties.errors[i].properties));
                    cOptions.log.error('stack: ' + err.properties.errors[i].stack);
                  }
                }
              }
              reject(err);
            }
          });
        })
      );
  };
}

ToDocx.prototype = new Preprocessor();

module.exports = ToDocx;
