/**
 * Created by Vasiliy Ermilov (email: inkz@xakep.ru, telegram: @inkz1)
 */

const Busboy = require('busboy');
const PropertyTypes = require('core/PropertyTypes');
const onError = require('../../../backend/error');
const respond = require('../../../backend/respond');
const moduleName = require('../../../module-name');
const {
  parseDirName,
  mapDirProperties
} = require('core/util/dirName');
const {
  getEnrichedItem,
  getStorageDir
} = require('lib/util/storageDirectoryParser');

/* jshint maxstatements: 40, maxcomplexity: 20 */
function fieldType(fieldname, cm) {
  const pm = cm.getPropertyMeta(fieldname);
  if (pm && (pm.type === PropertyTypes.FILE || pm.type === PropertyTypes.FILE_LIST)) {
    return 'file';
  } else if (pm && pm.type === PropertyTypes.IMAGE) {
    return 'image';
  }
  return false;
}

function acceptor(scope, type, data, directory, cm, cb) {
  let is = 'imageStorage';
  let fs = 'fileStorage';
  if (cm) {
    is = scope.settings.get(`${moduleName}.attrImageStorage`) || is;
    fs = scope.settings.get(`${moduleName}.attrFileStorage`) || fs;
    const cs = scope.settings.get(`${moduleName}.classStorages`);
    if (cs && cs[cm.getCanonicalName()]) {
      if (typeof cs[cm.getCanonicalName()] === 'object') {
        is = cs[cm.getCanonicalName()].images || cs[cm.getCanonicalName()].files || is;
        fs = cs[cm.getCanonicalName()].files || fs;
      } else {
        is = cs[cm.getCanonicalName()] || is;
        fs = cs[cm.getCanonicalName()] || fs;
      }
    }
  } else {
    is = scope.settings.get(`${moduleName}.contentImageStorage`) || is;
    fs = scope.settings.get(`${moduleName}.contentFileStorage`) || fs;
  }
  const storage = type === 'image' && scope[is] ? scope[is] : scope[fs];

  return storage.accept(data, directory).then(f => cb(f));
}

/**
 * @param {Request} req
 * @param {Response} res
 */
module.exports = function(req, res) {
  respond(['metaRepo'],

    /**
     * @param {{fileStorage: ResourceStorage, imageStorage: ResourceStorage, metaRepo: MetaRepository, dataRepo: DataRepository}} scope
     */
    (scope) => {
      const bus = new Busboy({headers: req.headers});
      const storageSettings = scope.settings.get(`${moduleName}.storage`) || {};
      const opts = {
        metaRepo: scope.metaRepo,
        dataRepo: scope.securedDataRepo,
        storageSettings
      };
      const result = {};
      let filesCount = 0;
      let errorsCount = 0;
      let item = null;
      let cm = null;
      let containerCm = null;
      const user = scope.auth.getUser(req);
      let logger = null;
      if (scope.changelogFactory) {
        logger = scope.changelogFactory.logger(() => user.id());
      }
      if (scope.changelogFactory)
        logger = scope.changelogFactory.logger(() => user);
      if (scope.changelogFactory) {
        logger = scope.changelogFactory.logger(() => user.id());
      }
      let className = req.params.class && req.params.class.split('.')[0];
      const collectionProperty = req.params.class && req.params.class.split('.')[1];
      if (className) {
        cm = scope.metaRepo.getMeta(className);
        containerCm = cm;
        if (cm && collectionProperty) {
          const cpm = cm.getPropertyMeta(collectionProperty);
          if (!cpm) {
            bus.destroy();
            return onError(scope, new Error('ClassMeta not found'), res, 'Не удалось принять файл.');
          }
          className = cpm.itemsClass;
          cm = scope.metaRepo.getMeta(cpm.itemsClass);
        }
        if (!cm) {
          bus.destroy();
          return onError(scope, new Error('ClassMeta not found'), res, 'Не удалось принять файл.');
        }
      }
      const itemCn = containerCm && containerCm.getCanonicalName();
      let filePromises = getEnrichedItem(opts, itemCn, req.params.id, storageSettings)
        .then((enrichedItem) => {
          item = enrichedItem;
        });

      bus.on('file', (fieldname, file, filename, encoding, mimetype) => {
        let type;
        if (req.params.class) {
          type = fieldType(fieldname, cm);
        } else if (mimetype && mimetype.startsWith('image/')) {
          type = 'image';
        } else {
          type = 'file';
        }
        filesCount++;
        if (!type) {
          errorsCount++;
          result[fieldname] = 'upload failed';
          file.resume();
          return;
        }
        const data = {
          name: filename,
          encoding,
          mimetype,
          stream: file
        };
        filePromises = filePromises
          .then(() => getStorageDir(itemCn, req.params.id, fieldname, opts, item))
          .then((dir) => {
            const directory = dir ||
              scope.settings.get(moduleName + ((type === 'image') ? '.defaultImageDir' : 'defaultFileDir'));
            const acceptorCb = (f) => {result[fieldname] = f;};
            return acceptor(scope, type, data, directory, cm, acceptorCb);
          })
          .catch((err) => {
            scope.sysLog.error(err);
            errorsCount++;
            result[fieldname] = 'upload failed';
            file.resume();
          });
      });

      bus.on('finish', () => {
        filePromises
          .then(() => {
            if (filesCount && filesCount === errorsCount)
              return onError(scope, new Error('Не удалось принять файлы'), res);

            if (cm && req.params.class && req.params.id) {
              const updates = {};
              Object.keys(result).forEach((fieldname) => {
                const pm = cm.getPropertyMeta(fieldname);
                if (pm && result[fieldname] && result[fieldname] !== 'upload failed' && result[fieldname].id) {
                  if (pm.type === PropertyTypes.FILE || pm.type === PropertyTypes.IMAGE) {
                    updates[fieldname] = result[fieldname].id;
                  } else if (pm.type === PropertyTypes.FILE_LIST) {
                    if (!Array.isArray(updates[fieldname])) {
                      updates[fieldname] = [];
                      const oldFiles = item.get(pm.name);
                      if (Array.isArray(oldFiles) && oldFiles.length) {
                        oldFiles.forEach((file) => {
                          if (typeof file === 'string') {
                            updates[fieldname].push(file);
                          } else if (file && file.id) {
                            updates[fieldname].push(file.id);
                          }
                        });
                      }
                    }
                    updates[fieldname].push(result[fieldname].id);
                  }
                }
              });
              scope.logRecorder && scope.logRecorder.start();
              return scope.securedDataRepo.editItem(itemCn, req.params.id, updates, logger, {user})
                .then(() => {
                  if (scope.logRecorder) {
                    result.__log = scope.logRecorder.stop();
                  }
                  res.send(result);
                });
            }
            res.send(result);
          })
          .catch(err => onError(scope, err, res, 'Не удалось принять файлы.'));
      });

      bus.on('error', err => onError(scope, err, res, 'Не удалось принять файлы.'));
      req.pipe(bus);
    },
    res);
};
