/**
 * Created by Vasiliy Ermilov (ermilov.work@yandex.ru).
 */
'use strict';

const { IonError } = require('@iondv/core');
const { w: t } = require('@iondv/i18n');

const PREFIX = 'web';

const codes = module.exports = {
  ITEM_EXISTS: `${PREFIX}.exists`,
  ITEM_EXISTS_MULTI: `${PREFIX}.iem`
};

IonError.registerMessages({
  [codes.ITEM_EXISTS]: t('Failed to save object. Another %class with the same value of %attr attribute exists. Use searching or contact the administrator.'),
  [codes.ITEM_EXISTS_MULTI]: t('Failed to save object. Another %class with the same value of specified attributes exists. Use searching or contact the administrator.')
});
