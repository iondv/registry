/**
 * Created by kras on 31.10.16.
 */
'use strict';
const clone = require('fast-clone');
const moment = require('moment');
const path = require('path');

/**
 * @param {{caption: String, mimeType: String, isBackground: Boolean}} options
 * @param {Preprocessor | ListPreprocessor} options.preprocessor
 * @constructor
 */
function Exporter(options) {

  this.name = options.name;

  this.caption = options.caption;

  /**
   * @returns {String}
   */
  this.getName = function () {
    return options.name;
  };

  /**
   * @returns {String}
   */
  this.getCaption = function () {
    return options.caption;
  };

  /**
   * @returns {String}
   */
  this.getMimeType = function () {
    return options.mimeType;
  };

  /**
   * @param {{class: ClassMeta, params: {}, item: Item}} ops
   * @returns {String}
   */
  this.getFileName = function (ops) {
    ops = ops || {};
    if (options.fileNameTemplate) {
      let result = options.fileNameTemplate.replace(/\$\{(\w*)(\.([_.\w]*))?\}/g, (m, p1, p2, p3) => {
        if (p1 === 'className') {
          return ops.class ? ops.class.getCanonicalName() : (ops.item && ops.item.getClassName());
        }
        if (p1 === 'classCaption') {
          return ops.class ? ops.class.getCaption() : (ops.item && ops.item.getMetaClass().getCaption());
        }
        if (p1 === 'params' && p2 && p3 && ops.params && ops.params[p3]) {
          return ops.params[p3];
        }
        if (p1 === 'item' && p2 && p3 && ops.item) {
          return ops.item.get(p3) || '';
        }
        return '';
      });
      return result.replace(new RegExp(`\\${path.sep}`, 'g'), '') + '.' + options.extension;
    }
    return this.getCaption() + '.' + moment().format('YYMMDDhhmmss') + '.' + options.extension;
  };

  /**
   * @returns {{}}
   */
  this.getParams = function () {
    let result = clone(options.params);
    if (result) {
      for (let pn in result) {
        if (result.hasOwnProperty(pn)) {
          result[pn].getDefaultValue = (function () {
            if (typeof this.default !== 'undefined') {
              if (this.type === 'date') {
                if (this.default === '$monthStart') {
                  return moment().startOf('month').toDate();
                } else if (this.default === '$monthEnd') {
                  return moment().endOf('month').toDate();
                } else {
                  let v = moment(this.default);
                  if (v.isValid()) {
                    return v.toDate();
                  }
                }
              }
              return this.default;
            }
            return null;
          }).bind(result[pn]);
        }
      }
    }
    return result;
  };


  /**
   * @returns {Boolean}
   */
  this.isBackground = function () {
    return options.isBackground || false;
  };
}

module.exports = Exporter;
