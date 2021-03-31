/**
 * Created by Vasiliy Ermilov (ermilov.work@yandex.ru).
 */
'use strict';

const { IonError } = require('@iondv/core');
const { errors: { DataRepoErrors: DrErrors } } = require('@iondv/meta-model');
const WebErrors = require('../errors/web-errors');

module.exports = function (err) {
  if (err && err instanceof IonError) {
    if (err.code === DrErrors.ITEM_EXISTS_MULTI || err.code === DrErrors.ITEM_EXISTS) {
      return new IonError(
        err.params.attr && err.params.attr.length > 1 ? WebErrors.ITEM_EXISTS_MULTI : WebErrors.ITEM_EXISTS,
        err.params,
        err
      );
    }
  }
  return err;
};
