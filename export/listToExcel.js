/**
 * Created by kras on 31.10.16.
 */
'use strict';

const { ListPreprocessor } = require('@iondv/meta-model-contracts');
const { Logger } = require('@iondv/commons-contracts');
const resolvePath = require('@iondv/core').utils.system.toAbsolute;
const Engine = require('./xlsx');
const path = require('path');
const fs = require('fs');
const { util: { normalize } } = require('@iondv/meta-model-contracts');
const prepareDate = require('../backend/items').prepareDate;
const inject = require('./inject');

/**
 * @param {{tplDir: String, injectors: Array}} cOptions
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
                p = p.then(() => new Promise((resolve, reject) => {
                  fs.readdir(path.join(fn, file), (err, tmpls) => {
                    if (err) {
                      log(err);
                      return resolve();
                    }
                    try {
                      if (tmpls) {
                        tmpls.forEach(function (template) {
                          if (path.extname(template) === '.xlsx') {
                            templates.push(path.basename(template, '.xlsx') + '@' + file);
                          }
                        });
                      }
                      return resolve();
                    } catch (err) {
                      reject(err);
                    }
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
    fn = path.join(fn, options.classMeta.getName() + '.xlsx');
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
          if (values[nm] instanceof Date) {
            values[nm] = prepareDate(values[nm], options.lang, options.user.timeZone(), true)
          }          
        }
      }
    }
    return inject(values, cOptions.injectors)
      .then(
        () => new Promise(
          (resolve, reject) => {
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
          }
        )
      );
  };
}

ToExcel.prototype = new ListPreprocessor();

module.exports = ToExcel;
