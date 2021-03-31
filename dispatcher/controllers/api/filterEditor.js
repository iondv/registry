/**
 * Created by Vasiliy Ermilov (ermilov.work@yandex.ru) on 1/23/17.
 */
'use strict';
const respond = require('../../../backend/respond');
const {t} = require('@iondv/i18n');

module.exports.list = function (req, res) {
  respond(['userFilters','metaRepo','auth'],
    /**
     * @param {{}} scope
     * @param {UserFilters} scope.userFilters
     * @param {MetaRepository} scope.metaRepo
     * @param {{}} scope.auth
     */
    function (scope) {
      let classes = [];
      let user = scope.auth.getUser(req);
      let cm = scope.metaRepo.getMeta(req.params.class);
      if (!cm) {
        return res.send({err: t('Invalid input data', {lang: req.locals.lang})});
      }
      while (cm) {
        classes.push(cm.getCanonicalName());
        cm = cm.getAncestor();
      }
      scope.userFilters.list(user.id(), classes).
      then(function (filters) {
        return res.send({filters: filters});
      }).
      catch(function (err) {
        return res.send({err: err.getMessage(req.locals.lang)});
      });
    }
  );
};

module.exports.add = function (req, res) {
  respond(['userFilters','metaRepo','auth'],
    /**
     * @param {{}} scope
     * @param {UserFilters} scope.userFilters
     * @param {MetaRepository} scope.metaRepo
     * @param {{}} scope.auth
     */
    function (scope) {
      let user = scope.auth.getUser(req);
      let cm = scope.metaRepo.getMeta(req.params.class);
      if (!cm || !req.body) {
        return res.send({err: t('Invalid input data', {lang: req.locals.lang})});
      }
      scope.userFilters.add(user.id(), cm.getCanonicalName(), req.body)
        .then(filter => res.send({filter: filter}))
        .catch(err => res.send({err: err.getMessage(req.locals.lang)}));
    }
  );
};

module.exports.edit = function (req, res) {
  respond(['userFilters','metaRepo','auth'],
    /**
     * @param {{}} scope
     * @param {UserFilters} scope.userFilters
     * @param {MetaRepository} scope.metaRepo
     * @param {{}} scope.auth
     */
    function (scope) {
      var user = scope.auth.getUser(req);
      var cm = scope.metaRepo.getMeta(req.params.class);
      if (!cm || !req.body || !req.body.id) {
        return res.send({err: t('Invalid input data', {lang: req.locals.lang})});
      }
      scope.userFilters.edit(user.id(), cm.getCanonicalName(), req.body.id, req.body).
      then(function (filter) {
        return res.send({filter: filter});
      }).
      catch(function (err) {
        return res.send({err: err.getMessage(req.locals.lang)});
      });
    }
  );
};

module.exports.remove = function (req, res) {
  respond(['userFilters','metaRepo','auth'],
    /**
     * @param {{}} scope
     * @param {UserFilters} scope.userFilters
     * @param {MetaRepository} scope.metaRepo
     * @param {{}} scope.auth
     */
    function (scope) {
      let user = scope.auth.getUser(req);
      if (!req.body || !req.body.filterId) {
        return res.send({err: t('Invalid input data', {lang: req.locals.lang})});
      }
      scope.userFilters.remove(user.id(), req.body.filterId).
      then(function (result) {
        res.send({result: result});
      }).
      catch(function () {
        res.send({result: false});
      });
    }
  );
};
