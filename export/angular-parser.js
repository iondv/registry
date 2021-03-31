'use strict';
const angular = require('bluerider');
const moment = require('moment');
const { utils: { number2words } } = require('@iondv/commons');

angular.filters.lower = function (input) {
  return String(input || '').toLowerCase();
};

angular.filters.upper = function (input) {
  return String(input || '').toUpperCase();
};

angular.filters.dateFormat = function (date, lang, format) {
  if (!date) {
    return '';
  }
  var d = moment(date);
  if (lang) {
    d.locale(lang);
  }
  return d.format(String(format || 'L'));
};

angular.filters.toDate = function (s, format, lang) {
  if (!s) {
    return null;
  }
  let d = moment(s, format, lang);
  if (d.isValid()) {
    return d.toDate();
  }
  return null;
};

angular.filters.toWords = function (number, isCurrency) {
  return number2words(number, isCurrency) || '';
};

module.exports = angular;
