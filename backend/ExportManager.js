/**
 * Created by kras on 31.10.16.
 */
'use strict';

const Preprocessor = require('core/interfaces/Preprocessor');
const ListPreprocessor = require('core/interfaces/ListPreprocessor');
const Item = require('core/interfaces/DataRepository').Item;
const Exporter = require('../export/Exporter');
const F = require('core/FunctionCodes');
const Background = require('core/impl/Background');
const toAbsolutePath = require('core/system').toAbsolute;
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const base64 = require('base64-js');
const crypto = require('crypto');
const User = require('core/User');

/**
 * @param {{}} cOptions
 * @param {{}} cOptions.configs
 * @param {DataRepository} cOptions.dataRepo
 * @param {MetaRepository} cOptions.metaRepo
 * @param {Background} cOptions.bg
 * @param {String} cOptions.configName
 * @param {String} [cOptions.exportPath]
 * @param {ResourceStorage} [cOptions.fileStorage]
 * @constructor
 */
function ExportManager(cOptions) {

  this.init = function () {
    if (cOptions.bg instanceof Background) {
      cOptions.bg.register(cOptions.configName);
    }
    return Promise.resolve();
  };

  /**
   * @param {ClassMeta | item} ctx
   * @param {{}} options
   * @returns {Promise.<Array>}
   */
  function getExporters(ctx, options, cm) {
    let exporters = [];
    let checkers = Promise.resolve();
    let item, type;
    if (ctx instanceof Item) {
      item = ctx;
      cm = cm || ctx.getMetaClass();
      type = 'item';
    } else {
      item = null;
      cm = cm || ctx;
      type = 'list';
    }
    let className = cm.getCanonicalName();
    if (
      cOptions.configs &&
      cOptions.configs.hasOwnProperty(className) && cOptions.configs[className]) {
      Object.keys(cOptions.configs[className]).forEach((nm) => {
        let config = cOptions.configs[className][nm];
        if (config.type === type) {
          if (
            config.preprocessor instanceof ListPreprocessor ||
            config.preprocessor instanceof Preprocessor
          ) {
            checkers = checkers
              .then(
                () => config.preprocessor instanceof ListPreprocessor ?
                  config.preprocessor.applicable(config.className || className, config.options) :
                  config.preprocessor instanceof Preprocessor ?
                    config.preprocessor.applicable(item, config.options) : false
              )
              .then((applicable) => {
                if (applicable) {
                  exporters.push(
                    new Exporter(
                      {
                        name: nm,
                        caption: config.caption,
                        mimeType: config.mimeType,
                        extension: config.extension,
                        params: config.params,
                        isBackground: config.isBackground,
                        fileNameTemplate: config.fileNameTemplate
                      }
                    )
                  );
                }
              });
          }
        }
      });
    }
    return checkers.then(() => {
      if (cm.getAncestor()) {
        return getExporters(ctx, options, cm.getAncestor())
          .then((pexp) => {
            exporters.push(...pexp);
            return exporters;
          });
      }
      return exporters;
    });
  }

  /**
   * @param {ClassMeta} cm
   * @param {{}} options
   * @returns {Promise}
   */
  this.listExporters = function (cm, options) {
    return getExporters(cm, options);
  };

  /**
   * @param {Item} item
   * @param {{}} options
   * @returns {Promise}
   */
  this.itemExporters = function (item, options) {
    return getExporters(item, options);
  };

  /**
   * @param {String} name
   * @param {ClassMeta} cm
   * @param {String} type
   * @returns {*}
     */
  function locateConfig(name, cm, type) {
    let className = cm.getCanonicalName();
    if (
      cOptions.configs &&
      cOptions.configs.hasOwnProperty(className) &&
      cOptions.configs[className] &&
      cOptions.configs[className].hasOwnProperty(name) &&
      cOptions.configs[className][name] &&
      cOptions.configs[className][name].type === type
    ) {
      return cOptions.configs[className][name];
    }
    if (cm.getAncestor()) {
      return locateConfig(name, cm.getAncestor(), type);
    }
    return null;
  }

  function getForceEnrichment(options, config) {
    let eagerLoading = config.skipEnvOptions ? [] : options.eagerLoading || [];
    if (Array.isArray(config.eagerLoading)) {
      for (let i = 0; i < config.eagerLoading.length; i++) {
        if (eagerLoading.indexOf(config.eagerLoading[i]) < 0) {
          eagerLoading.push(config.eagerLoading[i]);
        }
      }
    }
    let result = [];
    for (let i = 0; i < eagerLoading.length; i++) {
      result.push(eagerLoading[i].split('.'));
    }
    return result;
  }

  function processFilter(f, item, params) {
    if (Array.isArray(f)) {
      let result = [];
      f.forEach((fv) => {
        result.push(processFilter(fv, item, params));
      });
      return result;
    }

    if (f && typeof f === 'object') {
      let result = {};
      for (let nm in f) {
        if (f.hasOwnProperty(nm)) {
          result[nm] = processFilter(f[nm], item, params);
        }
      }
      return result;
    }

    if (f && typeof f === 'string') {
      if (f.substr(0, 6) === ':item.' && item instanceof Item) {
        let attr = f.substr(6);
        return item.get(attr);
      }
      if (f[0] === ':') {
        let attr = f.substr(1);
        return params.hasOwnProperty(attr) ? params[attr] : null;
      }
    }

    return f;
  }

  /**
   * @param {String} name
   * @param {{}} options
   * @param {ClassMeta} [options.class]
   * @param {Item | String} [options.item]
   * @param {Array} [options.eagerLoading]
   * @param {{}} [options.filter]
   * @param {{}} [options.params]
   * @param {User} [options.user]
   * @returns {Promise.<{} | null>}
   */
  function exportItem(name, options) {
    let p;
    if (options.item instanceof Item) {
      p = Promise.resolve(options.item);
    } else {
      p = cOptions.dataRepo.getItem(
        options.class.getCanonicalName(),
        options.item,
        {user: options.user, linksByRef: true}
      ).then((item) => {
        options.item = item;
        return item;
      });
    }
    let config;
    let cn;
    return p
      .then((item) => {
        if (!item) {
          throw new Error('Не найдены данные для экспорта!');
        }
        let cm = options.item.getMetaClass();
        config = locateConfig(name, cm, 'item');
        if (!config) {
          return null;
        }
        cn = config.className || cm.getCanonicalName();
        let fe = getForceEnrichment(options, config);
        if (
          fe.length &&
          item.getMetaClass().checkAncestor(cn) &&
          !config.query
        ) {
          return cOptions.dataRepo
            .getItem(cn, options.item.getItemId(), {forceEnrichment: fe, user: options.user, linksByRef: true})
            .then((item) => {
              cn = item.getClassName();
              options.item = item;
              return item;
            });
        }
        return item;
      })
      .then((item) => {
        if (!item) {
          return null;
        }
        if (
          !item.getMetaClass().checkAncestor(cn) ||
          config.query
        ) {
          let fe = getForceEnrichment({}, config);
          let f = null;
          if (config.query && config.query.filter) {
            f = processFilter(config.query.filter, item, options.params);
          }
          return cOptions.dataRepo.getList(
            cn,
            {
              filter: f,
              sort: config.query && config.query.sort,
              offset: config.query && config.query.offset,
              count: config.query && config.query.count,
              forceEnrichment: fe,
              user: options.user
            }
          );
        }
        return item;
      })
      .then((data) => {
        let opts = {
          classMeta: cOptions.metaRepo.getMeta(cn)
        };
        for (let nm in options) {
          if (
            options.hasOwnProperty(nm) &&
              nm !== 'class' &&
              nm !== 'filter' &&
              nm !== 'eagerLoading'
          ) {
            opts[nm] = options[nm];
          }
        }

        return config.preprocessor.process(data, opts);
      });
  }

  /**
   * @param {String} name
   * @param {{}} options
   * @param {ClassMeta} [options.class]
   * @param {Array} [options.eagerLoading]
   * @param {{}} [options.filter]
   * @param {{}} [options.params]
   * @param {User} [options.user]
   * @returns {Promise.<{} | null>}
   */
  function exportList(name, options) {
    let config = locateConfig(name, options.class, 'list');
    if (!config) {
      return Promise.resolve(null);
    }

    let fe = getForceEnrichment(options, config);

    let f = null;
    if (config.query && config.query.filter) {
      f = processFilter(config.query.filter, null, options.params);
    }
    if (options.filter) {
      f =  f ? {[F.AND]: [options.filter, f]} : options.filter;
    }
    return cOptions.dataRepo.getList(
      options.class.getCanonicalName(),
      {
        filter: f,
        sort: config.query && config.query.sort,
        offset: config.query && config.query.offset,
        count: config.query && config.query.count,
        forceEnrichment: fe,
        linksByRef: true,
        user: options.user
      })
      .then((data) => {
        let opts = {
          classMeta: options.class
        };
        for (let nm in options) {
          if (
            options.hasOwnProperty(nm) &&
            nm !== 'class' &&
            nm !== 'filter' &&
            nm !== 'eagerLoading'
          ) {
            opts[nm] = options[nm];
          }
        }

        return config.preprocessor.process(data, opts);
      });
  }

  /**
   * @param {{}} params
   * @param {String} params.uid
   * @param {String} params sid
   * @param {String} [params.class]         class name
   * @param {String} [params.item]          item id
   * @param {String} [params.eagerLoading]
   * @param {String} [params.filter]
   * @param {String} [params.params]
   * @param {String} [params.user]          user id
   * @param {String} [params.previous]      path to previous file
   * @param {String} params.format
   * @return Promise
   */
  this.run = function (params) {
    let p = Promise.resolve();
    if (params.previous) {
      p = p.then(() => {
        if (cOptions.fileStorage) {
          return cOptions.fileStorage.remove(params.previous);
        } else {
          return new Promise((res, rej) => {
            fs.unlink(params.previous, (err) => {
              if (err) {
                rej(err);
              }
              res();
            });
          });
        }
      });
    }

    let exporter, user, item;
    let cm = cOptions.metaRepo.getMeta(params.class);
    let exportParams = {};
    return p.then(
      () => new Promise((res, rej) => {
        cOptions.auth.userProfile(
          params.user,
          u => u instanceof User ? res(u) : rej(new Error('Пользователь не найден.'))
        );
      })
    ).then((u) => {
      user = u;
      if (params.item) {
        return cOptions.dataRepo.getItem(cm.getCanonicalName(), params.item, {user: user, linksByRef: true});
      }
    }).then((i) => {
      if (i) {
        item = i;
      }
      exportParams = fromBase64String(params.params);
      let options = {
        class: cm,
        eagerLoading: fromBase64String(params.eagerLoading),
        filter: fromBase64String(params.filter),
        params: exportParams,
        user: user,
        item: item
      };
      exporter = this.exporter(params.format, options);
      if (!exporter) {
        throw new Error('Не найдена конфигурация экспорта.');
      }
      return item ? exportItem(params.format, options) : exportList(params.format, options);
    }).then((buf) => {
      let exportPath = 'exports';
      if (cOptions.exportPath) {
        exportPath = cOptions.exportPath;
      }
      exportPath = path.join(exportPath, params.uid);
      if (cOptions.fileStorage) {
        return cOptions.fileStorage.accept(buf, exportPath, {name: exporter.getFileName({classMeta: cm, params: exportParams, item})})
          .then((sf) => {
            return {path: sf.id, date: new Date()};
          });
      } else {
        exportPath = toAbsolutePath(exportPath);
        const fn = path.join(exportPath, exporter.getFileName({classMeta: cm, params: exportParams, item}));
        return new Promise(
          (res, rej) => {
            fs.access(
              exportPath,
              fs.constants.F_OK,
              err => err ? mkdirp(exportPath, err2 => err2 ? rej(err2) : res()) : res()
            );
          })
          .then(
            () => new Promise((res, rej) => {
              fs.writeFile(fn, buf, err => err ? rej(err) : res({path: fn, date: new Date()}));
            })
          );
      }
    });
  };

  /**
   * @param {String} name
   * @param {String} options.className
   * @param {String} [options.item]
   * @param {String} options.uid
   * @return Boolean
   */
  this.status = function (name, options) {
    if (cOptions.bg instanceof Background) {
      let sid = getHash(name, options.className, options.item);
      return cOptions.bg.status(options.uid, cOptions.configName, sid).then(status => status === Background.RUNNING);
    }
    return Promise.resolve(false);
  };

  /**
   * @param {String} name
   * @param {String} options.className
   * @param {String} [options.item]
   * @param {String} options.uid
   * @param {Boolean} [options.stream]
   * @return {Promise<Boolean>}
   */
  this.result = function (name, options) {
    if (cOptions.bg instanceof Background) {
      let exporter = this.exporter(name, {
        class: cOptions.metaRepo.getMeta(options.className),
        item: options.item
      });
      let sid = getHash(name, options.className, options.item);
      return cOptions.bg.results(options.uid, cOptions.configName, sid)
        .then((res) => {
          if (Array.isArray(res) && res.length) {
            if (res[0]) {
              let result = res[0];
              if (options.stream) {
                if (cOptions.fileStorage) {
                  return cOptions.fileStorage.fetch([result.path])
                  .then((storedFiles) => {
                    if (storedFiles.length) {
                      return storedFiles[0].getContents();
                    } else {
                      throw new Error('Файл не найден в удаленном хранилище.');
                    }
                  })
                  .then((res) => {
                    return {
                      path: result.path,
                      name: res.name,
                      options: cb => cb(null, res.options),
                      stream: cb => cb(null, res.stream)
                    };
                  });
                } else {
                  return {
                    path: result.path,
                    name: path.basename(result.path),
                    options: (cb) => {
                      fs.stat(result.path, (err, stat) => {
                        if (err) {
                          return cb(err);
                        }
                        cb(null, {
                          mimetype: exporter.getMimeType(),
                          size: stat.size
                        });
                      });
                    },
                    stream: (cb) => {
                      fs.access(result.path, fs.constants.R_OK, (err) => {
                        if (err) {
                          return cb(err, null);
                        }
                        return cb(null, fs.createReadStream(result.path));
                      });
                    }
                  };
                }
              }
              return result;
            }
          }
          return null;
        });
    }
    return Promise.resolve(null);
  };

  function toBase64String (obj) {
    return obj ? base64.fromByteArray(Buffer.from(JSON.stringify(obj), 'UTF-8')) : '';
  }

  function fromBase64String (str) {
    return str ? JSON.parse(Buffer.from(base64.toByteArray(str)).toString(), (key, value) => {
      if (typeof value === 'string') {
        var a = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/.exec(value);
        if (a)
            return new Date(value);
      }
      return value;
    }) : null;
  }

  function getHash(exporterName, classname, itemId) {
    return crypto.createHash('md5').update(exporterName + '@' + classname + '@' + itemId).digest('hex');
  }

  /**
   * @param {String} name
   * @param {{}} options
   * @param {ClassMeta} [options.class]
   * @param {Item | String} [options.item]
   * @param {Array} [options.eagerLoading]
   * @param {{}} [options.filter]
   * @param {{}} [options.params]
   * @param {User} [options.user]
   * @param {Boolean} [options.forceForeground]
   * @returns {Promise.<{} | null>}
   */
  this.export = function (name, options) {
    let exporter = this.exporter(name, options);
    if (!options.forceForeground && exporter.isBackground() && cOptions.bg instanceof Background) {
      let uid = options.user.id();
      let params = {
        path: path.join('modules', 'registry'),
        class: options.class.getCanonicalName(),
        eagerLoading: toBase64String(options.eagerLoading),
        filter: toBase64String(options.filter),
        params: toBase64String(options.params),
        user: uid,
        item: options.item instanceof Item ? options.item.getItemId() : options.item,
        format: name
      };
      let sid = getHash(name, params.class, params.item);
      return cOptions.bg.results(uid, cOptions.configName, sid)
        .then(
          (results) => {
            params.previous = (Array.isArray(results) && results.length) ? results[0].path : null;
            return cOptions.bg.start(uid, cOptions.configName, sid, params);
          }
        );
    } else {
      return options.item ? exportItem(name, options) : exportList(name, options);
    }
  };

  /**
   * @param {String} name
   * @param {{}} options
   * @param {ClassMeta} [options.class]
   * @param {Item | String} [options.item]
   * @returns {Exporter}
   */
  this.exporter = function (name, options) {
    let cm = options.item instanceof Item ? options.item.getMetaClass() : options.class;
    let type = options.item ? 'item' : 'list';
    let config = locateConfig(name, cm, type);
    return config ?
      new Exporter({
        name: name,
        caption: config.caption,
        mimeType: config.mimeType,
        extension: config.extension,
        params: config.params,
        isBackground: config.isBackground,
        fileNameTemplate: config.fileNameTemplate
      }) :
      null;
  };
}

module.exports = ExportManager;
