/**
 * Created by kras on 31.10.16.
 */
'use strict';

const Preprocessor = require('core/interfaces/Preprocessor');
const resolvePath = require('core/resolvePath');
const Logger = require('core/interfaces/Logger');
const Engine = require('./xlsx');
const path = require('path');
const fs = require('fs');
const normalize = require('core/util/normalize');
const prepareDate = require('../backend/items').prepareDate;
const inject = require('./inject');
const conditionParser = require('core/ConditionParser');

/**
 * @param {{injectors: Array}} cOptions
 * @constructor
 */
function ToExcel(cOptions) {

  const templates = [];

  function log(err) {
    if (cOptions.log instanceof Logger) {
      cOptions.log.error(err.message || err);
    }
  }

  this.init = function () {
    return new Promise((resolve, reject) => {
      let fn = resolvePath(cOptions.tplDir);
      fs.readdir(fn, (err, files) => {
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
                        if (path.extname(template) === '.xlsx') {
                          templates.push(path.basename(template, '.xlsx') + '@' + file);
                        }
                      });
                    }
                    return resolve();
                  });
                }));
              } else if (path.extname(file) === '.xlsx') {
                templates.push(path.basename(file, '.xlsx'));
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
    fn = path.join(fn, options.classMeta.getName() + '.xlsx');
    let values = normalize(
      item,
      date => prepareDate(date, options.lang, options.user && options.user.timeZone(), true),
      {byRef: true}
    );
    values.now = prepareDate(new Date(), options.lang, options.user.timeZone(), true);
    if (options.params) {
      for (let nm in options.params) {
        if (options.params.hasOwnProperty(nm)) {
          values[nm] = options.params[nm];
          if (values[nm] instanceof Date) {
            values[nm] = prepareDate(values[nm], options.lang, options.user.timeZone(), true)
          }
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
              let template = new Engine(data);
              template.substitute(1, values);
              resolve(Buffer.from(template.generate(), 'binary'));
            } catch (err) {
              reject(err);
            }
          });
        })
      );
  };
}

ToExcel.prototype = new Preprocessor();

module.exports = ToExcel;
