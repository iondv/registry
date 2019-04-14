/**
 * Created by Vasiliy Ermilov (email: inkz@xakep.ru, telegram: @inkz1) on 25.07.16.
 */
'use strict';
const prepareJSON = require('../../../backend/items').prepareJSON;
const formListOptions = require('../../../backend/items').formListOptions;
const locale = require('locale');
const onError = require('../../../backend/error');
const respond = require('../../../backend/respond');
const moduleName = require('../../../module-name');
const calculateStyles = require('../../../backend/viewmodels').calculateStyles;
const F = require('core/FunctionCodes');

// jshint maxstatements: 40
module.exports.list = function (req, res) {
  respond(['metaRepo', 'securedDataRepo', 'logRecorder', 'auth', 'calculator'],
    /**
     * @param {{metaRepo: MetaRepository, securedDataRepo: DataRepository, auth: Auth}} scope
     * @param {LogRecorder} scope.logRecorder
     */
    function (scope) {
      try {
        let log, list, item, prop;
        let locales = new locale.Locales(req.headers['accept-language']);
        let lang = locales[0] ? locales[0].language : 'ru';
        scope.logRecorder.start();
        let user = scope.auth.getUser(req);
        scope.securedDataRepo.getItem(req.params.class, req.params.id, {user: user})
          .then((found) => {
            if (!found) {
              return Promise.reject(new Error('Не найден контейнер коллекции.'));
            }
            item = found;
            prop = item.properties[req.params.collection];
            return formListOptions(moduleName, scope, req, locales, prop ? prop.meta._refClass : null)
              .then((lo) => {
                lo.user = user;
                return scope.securedDataRepo.getAssociationsList(found, req.params.collection, lo);
              });
          })
          .then((result) => {
            list = result;
            if (!req.body.styles) {
              return;
            }
            return calculateStyles(list, req.body.styles, scope.calculator, true);
          })
          .then(() => {
            log = scope.logRecorder.stop();
            res.send({
              draw: parseInt(req.body.draw),
              recordsTotal: list.total,
              recordsFiltered: list.total,
              permissions: list.permissions,
              data: prepareJSON(list, lang, user.timeZone()),
              log: log
            });
          })
          .catch(function (err) {
            scope.logRecorder.stop();
            onError(scope, err, res, true);
          });
      } catch (err) {
        scope.logRecorder.stop();
        onError(scope, err, res, true);
      }
    },
    res
  );
};

module.exports.add = function (req, res) {
  respond(['metaRepo', 'securedDataRepo', 'auth'],
    /**
     * @param {{metaRepo: MetaRepository, securedDataRepo: DataRepository, auth: Auth}} scope
     */
    function (scope) {
      try {
        var container = null;

        var user = scope.auth.getUser(req);
        scope.securedDataRepo.getItem(req.params.class, req.params.id, {user: user})
          .then(
            (found) => {
              if (found) {
                container = found;
                return scope.securedDataRepo.getItem(req.body.class, req.body.id, {user: user});
              }
              throw new Error('Не найден контейнер.');
            }
          )
          .then(
            (found) => {
              if (found) {
                let logger = null;
                if (scope.changelogFactory) {
                  logger = scope.changelogFactory.logger(() => user.id());
                }
                return scope.securedDataRepo.put(container, req.params.collection, [found], logger, {user: user});
              }
              throw new Error('Не найден объект для добавления в коллекцию.');
            }
          )
          .then(
            function () {
              res.send('Выполнено.');
            }
          )
          .catch(err => onError(scope, err, res));
      } catch (err) {
        onError(scope, err, res, true);
      }
    },
    res
  );
};

module.exports.remove = function (req, res) {
  respond(['metaRepo', 'securedDataRepo', 'auth'],
    /**
     * @param {{metaRepo: MetaRepository, securedDataRepo: DataRepository, auth: Auth}} scope
     */
    function (scope) {
      try {
        let container;
        let user = scope.auth.getUser(req);
        let items = req.body.items;
        if (!Array.isArray(items)) {
          throw new Error('Некорректные данные для удаления.');
        }
        scope.securedDataRepo.getItem(req.params.class, req.params.id, {user: user})
          .then(
            (found) => {
              if (!found) {
                throw new Error('Не найден контейнер коллекции.');
              }
              container = found;
              const founds = [];
              let p = Promise.resolve();
              items.forEach((item) => {
                if (!item || !item.class || !item.id) {
                  return;
                }
                p = p
                  .then(() => scope.securedDataRepo.getItem(item.class, item.id, {user}))
                  .then(found => founds.push(found));
              });
              return p.then(() => founds);
            }
          )
          .then(
            (founds) => {
              if (!founds || founds.length !== items.length) {
                throw new Error('Не найдены элементы коллекции.');
              }
              let logger = null;
              if (scope.changelogFactory) {
                logger = scope.changelogFactory.logger(() => user.id());
              }
              return scope.securedDataRepo.eject(container, req.params.collection, founds, logger, {user});
            }
          )
          .then(() => {
            res.send('Выполнено.');
          })
          .catch(err => onError(scope, err, res, true));
      } catch (err) {
        onError(scope, err, res, true);
      }
    },
    res
  );
};

function reorderDiff(req, res, scope) {
  try {
    if (!Array.isArray(req.body.diff)) {
      throw new Error('Некорректный запрос');
    }
    let container;
    let sortings = [];
    let user = scope.auth.getUser(req);
    let logger = null;
    if (scope.changelogFactory) {
      logger = scope.changelogFactory.logger(() => user.id());
    }
    scope.securedDataRepo.getItem(req.params.class, req.params.id, {user: user, needed: {}})
      .then((found) => {
        if (!found) {
          throw new Error('Не найден контейнер коллекции.');
        }
        container = found;
        let needed = {};
        let cpm = container.getMetaClass().getPropertyMeta(req.params.collection);
        if (!cpm) {
          throw new Error('Не найден атрибут коллекции.');
        }
        const ccm = scope.metaRepo.getMeta(cpm.itemsClass, null, container.getMetaClass().getNamespace());
        if (!Array.isArray(cpm.selSorting) || !cpm.selSorting) {
          throw new Error('Не найдены параметры сортировки.');
        }
        cpm.selSorting.forEach((s) => {
          sortings.push(s.property);
          needed[s.property] = true;
        });
        const or = [];
        const items = new Set();
        for (let i = 0; i < req.body.diff.length; i++) {
          items.add(req.body.diff[i].left.id);
          items.add(req.body.diff[i].right.id);
        }
        for (let key of items.values()) {
          const keyData = scope.keyProvider.keyToData(ccm, key);
          const and = [];
          Object.keys(keyData).forEach(prop => and.push({[F.EQUAL]: ['$' + prop, keyData[prop]]}));
          if (and.length === 1) {
            or.push(and[0]);
          } else {
            or.push({[F.AND]: and});
          }
        }
        return scope.securedDataRepo.getList(
          ccm.getCanonicalName(),
          {user, needed, filter: {[F.OR]: or}}
        );
      })
      .then((list) => {
        const itemsMap = new Map();
        list.forEach(item => itemsMap.set(`${item.getClassName()}@${item.getItemId()}`, item));
        const updates = [];
        for (let i = 0; i < req.body.diff.length; i++) {
          const left = itemsMap.get(`${req.body.diff[i].left.class}@${req.body.diff[i].left.id}`);
          const right = itemsMap.get(`${req.body.diff[i].right.class}@${req.body.diff[i].right.id}`);
          if (!left || !right) {
            throw new Error('Не найден объект коллекции');
          }
          const rightUpd = {};
          sortings.forEach((srt) => {
            const pm = left.getMetaClass().getPropertyMeta(srt);
            if (pm) {
              rightUpd[srt] = left.get(srt);
            }
          });
          updates.push({right, rightUpd});
        }
        let promise = Promise.resolve();
        const result = [];
        updates.forEach(({right, rightUpd}) => {
          promise = promise
            .then(() => scope.securedDataRepo.editItem(
              right.getClassName(), right.getItemId(), rightUpd, logger, {user: user}
            ))
            .then((r) => {
              const data = {};
              sortings.forEach((srt) => {
                data[srt] = r.get(srt);
              });
              result.push({class: r.getClassName(), id: r.getItemId(), data});
            });
        });
        return promise.then(() => result);
      })
      .then(result => res.send(result))
      .catch(err => onError(scope, err, res, true));
  } catch (err) {
    onError(scope, err, res, true);
  }
}

function reorder(req, res, scope) {
  try {
    if (!req.body.items || req.body.items.length < 2) {
      throw new Error('Некорректный запрос');
    }
    let container;
    let sortings = [];
    let sneeded = {};
    let user = scope.auth.getUser(req);
    let left = null;
    scope.securedDataRepo.getItem(req.params.class, req.params.id, {user: user, needed: {}})
      .then((found) => {
        if (!found) {
          throw new Error('Не найден контейнер коллекции.');
        }
        container = found;
        let cpm = container.getMetaClass().getPropertyMeta(req.params.collection);
        if (!cpm) {
          throw new Error('Не найден атрибут коллекции.');
        }
        if (!Array.isArray(cpm.selSorting) || !cpm.selSorting) {
          throw new Error('Не найдены параметры сортировки.');
        }
        cpm.selSorting.forEach((s) => {
          sortings.push(s.property);
          sneeded[s.property] = true;
        });
        return scope.securedDataRepo.getItem(
          req.body.items[0].class,
          req.body.items[0].id,
          {user: user, needed: sneeded}
        );
      })
      .then((l) => {
        if (!l) {
          throw new Error('Не найден элемент коллекции, заданный первым.');
        }
        left = l;
        return scope.securedDataRepo.getItem(
          req.body.items[1].class,
          req.body.items[1].id,
          {user: user, needed: sneeded}
        );
      })
      .then((right) => {
        if (!right) {
          throw new Error('Не найден элемент коллекции, заданный вторым.');
        }
        let logger = null;
        if (scope.changelogFactory) {
          logger = scope.changelogFactory.logger(() => user.id());
        }
        let updates = [{},{}];
        sortings.forEach((srt) => {
          let pm = left.getMetaClass().getPropertyMeta(srt);
          if (pm) {
            let values = [
              left.get(srt),
              right.get(srt)
            ];
            updates[0][srt] = values[1];
            updates[1][srt] = values[0];
          }
        });
        return scope.securedDataRepo.editItem(
          left.getMetaClass().getCanonicalName(),
          left.getItemId(),
            updates[0],
            logger,
          {user: user, needed: sneeded})
          .then((l) => {
            left = l;
            return scope.securedDataRepo.editItem(
              right.getMetaClass().getCanonicalName(),
              right.getItemId(),
              updates[1],
              logger,
              {user: user, needed: sneeded}
            );
          });
      })
      .then((right) => {
        let result = [{}, {}];
        sortings.forEach((srt) => {
          result[0][srt] = left.get(srt);
          result[1][srt] = right.get(srt);
        });
        return res.send(result);
      })
      .catch(err => onError(scope, err, res, true));
  } catch (err) {
    onError(scope, err, res, true);
  }
}

module.exports.reorder = function (req, res) {
  respond(['metaRepo', 'securedDataRepo', 'auth'],
    /**
     * @param {{metaRepo: MetaRepository, securedDataRepo: DataRepository, auth: Auth}} scope
     */
    (scope) => {
      if (Array.isArray(req.body.diff)) {
        reorderDiff(req, res, scope);
      } else if (Array.isArray(req.body.items)) {
        reorder(req, res, scope);
      } else {
        onError(scope, new Error('некорректный запрос'), res, true);
      }
    },
    res
  );
};
