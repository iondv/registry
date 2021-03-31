/**
 * Created by Vasiliy Ermilov (ermilov.work@yandex.ru) on 1/23/17.
 */
'use strict';
const { FunctionCodes: F } = require('@iondv/meta-model-contracts');
const {t} = require('@iondv/i18n');

/**
 *
 * @param {{}} options
 * @param {DataSource} options.ds
 * @constructor
 */
function UserFilters(options) {

  if (!options.ds) {
    throw new Error(t('Data source not specified'));
  }

  /**
   * @type {String}
   */
  const tn = options.tableName || 'ion_user_filters';

  /**
   *
   * @param {String} userId
   * @param {String[]} classNames
   * @return {Promise}
   */
  this.list = function (userId, classNames) {
    if (!userId || !Array.isArray(classNames)) {
      return Promise.reject(new Error(t('Not enough data')));
    }
    let conditions = {
      filter: {
        [F.AND]: [
          {[F.EQUAL]: ['$user', userId]},
          {
            [F.OR]: [
              {[F.IN]: ['$className', classNames]},
              {[F.EMPTY]: ['$className']}
            ]
          }
        ]
      }
    };
    return options.ds.fetch(tn, conditions)
      .then(function (filters) {
        let result = {};
        if (filters) {
          for (let i = 0; i < filters.length; i++) {
            if (filters[i]._id) {
              result[filters[i]._id] = {
                id: filters[i]._id,
                name: filters[i].name,
                className: filters[i].className,
                query: filters[i].query
              };
            }
          }
        }
        return result;
      });
  };

  /**
   *
   * @param {String} userId
   * @param {String} className
   * @param {{}} filter
   * @param {String} filter.filterName
   * @param {Boolean} [filter.global]
   * @param {{property:String, operation: String|Number, value:*}[]} filter.conditions
   * @return {Promise}
   */
  this.add = function (userId, className, filter) {
    if (!userId || !filter.name || !filter.query) {
      return Promise.reject(new Error(t('Not enough data')));
    }
    if (typeof filter.global === 'string') {
      filter.global = filter.global === 'true';
    }
    let data = {
      user: userId,
      className: filter.global ? null : className,
      name: filter.name,
      query: filter.query
    };
    return options.ds.insert(tn, data)
      .then((filter) => {
        let result = null;
        if (filter) {
          result = {
            id: filter._id,
            name: filter.name,
            className: filter.className,
            query: filter.query
          };
        }
        return result;
      });
  };

  /**
   *
   * @param {String} userId
   * @param {String} className
   * @param {String} filterId
   * @param {{}} data
   * @return {Promise}
   */
  this.edit = function (userId, className, filterId, data) {
    if (!userId || !filterId || !data) {
      return Promise.reject(new Error(t('Not enough data')));
    }
    let updates = {};
    if (data.name) {
      updates.name = data.name;
    }
    if (data.query) {
      updates.query = data.query;
    }
    if (className) {
      updates.className = className;
    }
    if (typeof data.global === 'string') {
      data.global = data.global === 'true';
    }
    if (data.global) {
      updates.className = null;
    }
    return options.ds.update(
      tn,
      {
        [F.AND]: [
          {[F.EQUAL]: ['$_id', filterId]},
          {[F.EQUAL]: ['$user', userId]}
        ]
      },
      updates
    )
    .then(updatedFilter => {
      let result = null;
      if (updatedFilter) {
        result = {
          id: updatedFilter._id,
          name: updatedFilter.name,
          className: updatedFilter.className,
          query: updatedFilter.query
        };
      }
      return result;
    });
  };

  /**
   *
   * @param {String} userId
   * @param {String} filterId
   * @return {Promise}
   */
  this.remove = function (userId, filterId) {
    if (!userId || !filterId) {
      return Promise.reject(new Error(t('Not enough data')));
    }
    return options.ds.delete(tn, {[F.AND]: [{[F.EQUAL]: ['$_id', filterId]}, {[F.EQUAL]: ['$user', userId]}]})
      .then(result => result > 0);
  };

  this.init = function () {
    return options.ds.connection().collection(tn, {strict: true}, (err, collection) => {
      if (collection) {
        return collection;
      }
      return options.ds.connection().createCollection(tn);
    });
  };

}

module.exports = UserFilters;
