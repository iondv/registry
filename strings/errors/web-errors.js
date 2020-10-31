/**
 * Created by Vasiliy Ermilov (ermilov.work@yandex.ru).
 */
'use strict';

const codes = require('../../errors/web-errors');
const {w: t} = require('core/i18n');

module.exports = {
  [codes.ITEM_EXISTS]: t('Failed to save object. Another %class with the same value of %attr attribute exists. Use searching or contact the administrator.'),
  [codes.ITEM_EXISTS_MULTI]: t('Failed to save object. Another %class with the same value of specified attributes exists. Use searching or contact the administrator.')
};
