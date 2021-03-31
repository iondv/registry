/**
 * Created by Vasiliy Ermilov (ermilov.work@yandex.ru) on 11/7/16.
 */
'use strict';
const { ListPreprocessor } = require('@iondv/meta-model-contracts');
const { Logger } = require('@iondv/commons-contracts');
const resolvePath = require('@iondv/core').utils.system.toAbsolute;
const { util: { normalize } } = require('@iondv/meta-model-contracts');
const prepareDate = require('../backend/items').prepareDate;
const Docxtemplater = require('docxtemplater');
const angularExpressions = require('./angular-parser');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
const inject = require('./inject');

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
        return (res === null || typeof res === 'undefined') ? '' : res;
      }
    };
  };
}

/**
 * @param {{tplDir: String, injectors: Array, expParser: ExpressionParser}} cOptions
 */
function ToDocx(cOptions) {

  const templates = [];

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
                    resolve();
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
   * @param {String} className
   * @param {{}} options
   * @returns {Promise}
   */
  this._applicable = function (className) {
    return Promise.resolve(templates.indexOf(className) > -1);
  };

  /**
   * @param {Array} list
   * @param {{classMeta: ClassMeta, lang: String, user: User}} options
   * @returns {Promise}
   */
  this._process = function (list, options) {
    let fn = resolvePath(cOptions.tplDir);
    if (options.classMeta.getNamespace()) {
      fn = path.join(fn, options.classMeta.getNamespace());
    }
    fn = path.join(fn, options.classMeta.getName() + '.docx');
    let values = {
      className: options.classMeta.getName(),
      classCaption: options.classMeta.getCaption(),
      now: new Date(),
      list: normalize(
        list,
        date => prepareDate(date, options.lang, options.user && options.user.timeZone(), true),
        {byRef: true}
      )
    };
    if (options.params) {
      for (let nm in options.params) {
        if (options.params.hasOwnProperty(nm)) {
          values[nm] = options.params[nm];
        }
      }
    }
    return inject(values, cOptions.injectors)
      .then(
        function () {
          return new Promise((resolve, reject) => {
            fs.readFile(fn, (err, data) => {
              if (err) {
                return reject(err);
              }
              try {
                var zip = new JSZip(data);
                var doc = new Docxtemplater().loadZip(zip);
                doc.setOptions({parser: expParserFunc(cOptions.expParser)});
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
          });
        }
      );
  };
}

ToDocx.prototype = new ListPreprocessor();

module.exports = ToDocx;
