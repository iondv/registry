/**
 * Created by Vasiliy Ermilov (ermilov.work@yandex.ru).
 */
'use strict';

const codes = require('../../../errors/web-errors');

module.exports = {
  [codes.ITEM_EXISTS]: `Не удалось сохранить объект. Существует другой %class c таким значением атрибута %attr. Воспользуйтесь поиском или обратитесь к администратору.`,
  [codes.ITEM_EXISTS_MULTI]: `Не удалось сохранить объект. Существует другой %class c такими значениями указанных атрибутов. Воспользуйтесь поиском или обратитесь к администратору.`
};
