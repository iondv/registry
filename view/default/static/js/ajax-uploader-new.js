'use strict';

(function () {
  var defaultSettings = {
    maxFiles: 1,
    minSize: 1,
    maxSize: 10485760,
    extensions: null,
    mimeTypes: null,
    tooSmall: "Minimum file size {limit}",
    tooBig: "Maximun file size {limit}",
    wrongExtension: "Allowed only: {extensions}",
    wrongMimeType: "Allowed only: {mimeTypes}",
    onlyImage: false,
    maxHeight: null,
    maxWidth: null,
    minHeight: 1,
    minWidth: 1,
    notImage: "File is not an image.",
    overHeight: "Maximun height - {limit} pix.",
    overWidth: "Maximun width {limit} pix.",
    underHeight: "Minimum height {limit} pix.",
    underWidth: "Minimum width {limit} pix.",
    tooMany: "Too many files.",
    alreadyExists: "File is already selected",
    confirmRemoveStatus: ['done', 'uploading']
  };

  var methods = {
    settings: function (options) {
      return $.extend(defaultSettings, options);
    }
  };

  $.fn.ajaxUploader = function (method) {
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === 'object') {
      methods.settings.apply(this, arguments);
    } else if (method) {
      $.error('Not found uploader method:' + method);
    }
    return this.each(function () {
      var $uploader = $(this);
      if (!$uploader.data('uploader')) {
        new Uploader($uploader);
      }
    });
  };

  function resetFormElement ($element) {
    $element.wrap('<form>').closest('form').get(0).reset();
    $element.unwrap();
  }

  /*** EVENTS ***/

  // uploader.error
  // uploader.selected - select new files
  // uploader.overflow - select too many files
  // uploader.finished - all files uploaded

  // uploader.file.appended - new uploader item cloned
  // uploader.file.validated - item validated
  // uploader.file.started - start upload
  // uploader.file.progress - progress upload - percents
  // uploader.file.uploaded - file uploaded
  // uploader.file.confirmRemove - remove file after user confirm
  // uploader.file.removed - remove file

  /*** UPLOADER ***/

  function Uploader ($uploader) {
    var self = this;
    this.$uploader = $uploader;
    this.options = $.extend({}, defaultSettings, $uploader.data('options'));
    this.options.sourceMaxFiles = this.options.maxFiles;
    this.url = $uploader.data('url');
    this.fileAttrName = $uploader.data('attr');
    this.files = [];
    this.$input = $uploader.find('.uploader-input-file');
    this.initDropZone();

    if (this.options.mimeTypes) {
      this.$input.attr('accept', this.options.mimeTypes.join(','));
    }
    if (this.options.maxFiles > 1) {
      this.$input.attr('multiple', true);
    }
    this.$input.change(function () {
      self.setFiles(this.files);
    });
    $uploader.data('uploader', this);
  }

  Uploader.prototype.isFinished = function () {
    for (var i = 0; i < this.files.length; ++i)
      if (this.files[i].isProcessing()) return false;
    return true;
  };

  Uploader.prototype.fireEvent = function (eventName, data) {
    this.$uploader.trigger('uploader.' + eventName, data);
  };

  Uploader.prototype.empty = function (eventName, data) {
    this.options.maxFiles = this.options.sourceMaxFiles;
    this.$uploader.find('.uploader-item').not('.sample').remove();
    this.files = [];
  };

  Uploader.prototype.initDropZone = function () {
    var self = this;
    this.$dropzone = this.$uploader.find(".uploader-dropzone");
    var dropzone = this.$dropzone.get(0);
    dropzone.ondragover = function () {
      //$dropZone.addClass('drag');
      return false;
    };
    dropzone.ondragleave = function () {
      //$dropZone.removeClass('drag');
      return false;
    };
    dropzone.ondrop = function (event) {
      event.preventDefault();
      self.setFiles(event.dataTransfer.files);
      return false;
    };
    dropzone.onclick = function () {
      self.$input.click();
    };
  };

  Uploader.prototype.setFiles = function (files) {
    var counter = this.getCounter();
    counter.total += files.length;
    if (counter.total > this.options.maxFiles) {
      this.fireEvent('overflow', this.options.tooMany);
    } else if (files.length) {
      for (var i = 0; i < files.length; ++i) {
        this.files.push(new UFile(files[i], this));
      }
      if (counter.total == this.options.maxFiles) {
        this.$dropzone.hide();
      }
      resetFormElement(this.$input);
      this.fireEvent('selected', counter);
      this.processNext();
    }
  };

  Uploader.prototype.getCounter = function () {
    var counter = {total: 0, failed: 0, done: 0};
    for (var i = 0; i < this.files.length; ++i) {
      if (this.files[i].removed) continue;
      if (this.files[i].failed) ++counter.failed;
      if (this.files[i].status === File.STATUS_DONE) ++counter.done;
      ++counter.total;
    }
    return counter;
  };

  Uploader.prototype.processNext = function () {
    var self = this;
    setTimeout(function () {
      var map = self.getFirstFilesByStatus();
      if (UFile.STATUS_PENDING in map) {
        map[UFile.STATUS_PENDING].append();
      } else if (UFile.STATUS_APPENDED in map) {
        map[UFile.STATUS_APPENDED].validate();
      } else if (UFile.STATUS_VALIDATED in map && !(UFile.STATUS_UPLOADING in map)) {
        map[UFile.STATUS_VALIDATED].upload();
      }
    }, 50);
  };

  Uploader.prototype.getFirstFilesByStatus = function () {
    var map = {};
    for (var i = 0; i < this.files.length; ++i) {
      var file = this.files[i];
      if (file.removed || file.failed || file.status in map) continue;
      map[file.status] = file;
    }
    return map;
  };

  Uploader.prototype.changeMaxFiles = function (delta) {
    this.options.maxFiles += delta;
    this.$dropzone.toggle(this.options.maxFiles > this.files.length);
  };

  /*** UFILE ***/

  function UFile (file, uploader) {
    this.failed = false;
    this.removed = false;
    this.status = UFile.STATUS_PENDING;
    this.file = file;
    this.uploader = uploader;
  }

  UFile.STATUS_PENDING = 'pending';
  UFile.STATUS_APPENDED = 'appended';
  UFile.STATUS_VALIDATED = 'validated';
  UFile.STATUS_UPLOADING = 'uploading';
  UFile.STATUS_DONE = 'done';

  UFile.prototype.fireEvent = function (eventName) {
    this.uploader.fireEvent('file.' + eventName, this);
  };

  UFile.prototype.isProcessing = function () {
    return !this.removed && !this.failed && !this.status != UFile.STATUS_DONE;
  };

  UFile.prototype.isDone = function () {
    return !this.removed && !this.failed && this.status === UFile.STATUS_DONE;
  };

  UFile.prototype.setError = function (error) {
    this.failed = true;
    this.error = error;
    this.fireEvent('error');
  };

  UFile.prototype.remove = function (error) {
    this.removed = true;
    if (this.$item) this.$item.remove();
    if (this.xhr) this.xhr.abort();
    this.uploader.$dropzone.show();
    this.fireEvent('remove');
  };

  /*** APPEND ***/

  UFile.prototype.append = function () {
    var self = this;
    this.$item = this.uploader.$uploader.find('.sample').clone().removeClass('sample').show();
    this.uploader.$uploader.find('.uploader-list').prepend(this.$item);
    this.$item.data('file', this).find('.uploader-remove').click(function () {
      self.failed || self.uploader.options.confirmRemoveStatus.indexOf(self.status) < 0
        ? self.remove()
        : self.fireEvent('confirmRemove');
    });
    this.status = UFile.STATUS_APPENDED;
    this.fireEvent('appended');
    this.uploader.processNext();
  };

  /*** VALIDATE ***/

  UFile.prototype.validate = function () {
    var self = this;
    // trying to upload file as an image, and the result, start validating
    // loading of the image happens at the events, and not consistently
    this.image = new Image;
    this.image.onload = function () {
      self.startValidate();
    };
    this.image.onerror = function () {
      self.image = null;
      self.startValidate();
    };
    this.image.src = window.URL.createObjectURL(this.file);
  };

  UFile.prototype.startValidate = function () {
    var error = this.validateFile();
    this.status = UFile.STATUS_VALIDATED;
    this.fireEvent('validated');
    if (error) this.setError(error);
    this.uploader.processNext();
  };

  UFile.prototype.validateFile = function () {
    var options = this.uploader.options;
    var file = this.file;
    if (this.isMatchFile()) {
      return options.alreadyExists;
    }
    if (options.extensions && options.extensions.length > 0) {
      var index = file.name.lastIndexOf('.');
      var ext = index > -1 ? file.name.substr(index + 1, file.name.length).toLowerCase() : '';
      if (options.extensions.indexOf(ext) < 0)
        return options.wrongExtension.replace(/\{extensions\}/g, options.extensions.join(', '));
    }
    if (options.mimeTypes && options.mimeTypes.length > 0) {
      if (options.mimeTypes.indexOf(file.type) < 0)
        return options.wrongMimeType.replace(/\{mimeTypes\}/g, options.mimeTypes.join(', '));
    }
    if (options.maxSize && options.maxSize < file.size) {
      return options.tooBig.replace(/\{limit\}/g, window.commonHelper.formatFileSize(options.maxSize));
    }
    if (options.minSize && options.minSize > file.size) {
      return options.tooSmall.replace(/\{limit\}/g, window.commonHelper.formatFileSize(options.minSize));
    }
    if (options.onlyImage) {
      return this.image ? this.validateImage() : options.notImage;
    }
    if (this.image) return this.validateImage();
    if (options.onlyImage) return options.notImage;
    return false;
  };

  UFile.prototype.isMatchFile = function () {
    var files = this.uploader.files;
    for (var i = 0; i < files.length; ++i) {
      if (files[i].removed) continue;
      // check for a match only with the previous files
      if (files[i] === this) return false;
      if (files[i].file.size == this.file.size && files[i].file.name == this.file.name) return true;
    }
    return false;
  };

  UFile.prototype.validateImage = function () {
    var options = this.uploader.options;
    if (options.maxHeight && options.maxHeight < this.image.height) {
      return options.overHeight.replace(/\{limit\}/g, options.maxHeight);
    }
    if (options.maxWidth && options.maxWidth < this.image.width) {
      return options.overWidth.replace(/\{limit\}/g, options.maxWidth);
    }
    if (options.minHeight && options.minHeight > this.image.height) {
      return options.underHeight.replace(/\{limit\}/g, options.minHeight);
    }
    if (options.minWidth && options.minWidth > this.image.width) {
      return options.underWidth.replace(/\{limit\}/g, options.minWidth);
    }
    return false;
  };

  /*** UPLOAD ***/

  UFile.prototype.upload = function () {
    var self = this;
    this.xhr = new XMLHttpRequest;
    this.xhr.open('POST', this.uploader.url);
    if (this.xhr.upload) {
      this.xhr.upload.addEventListener('progress', function (event) {
        self.progressUploading(event);
      }, false);
    }
    this.xhr.onreadystatechange = function (event) {
      self.changeReadyState(event);
    };
    // create these forms to upload to the server
    var data = new FormData;
    var attr = this.uploader.fileAttrName || 'file';
    data.append(attr, this.file.name);
    data.append(attr, this.file);
    this.status = UFile.STATUS_UPLOADING;
    this.fireEvent('started');
    this.xhr.send(data);
  };

  UFile.prototype.progressUploading = function (event) {
    // can be FALSE if server nevere sent Content-Length header in the response
    if (event.lengthComputable) {
      this.percent = parseInt(event.loaded * 100 / event.total);
      this.fireEvent('progress');
    }
  };

  UFile.prototype.changeReadyState = function (event) {
    if (this.xhr.readyState != 4) return;
    if (this.xhr.status == 200) {
      this.status = UFile.STATUS_DONE;
      this.response = this.xhr.response;
      this.fireEvent('uploaded');
    } else {
      this.setError(this.xhr.response);
    }
    this.uploader.processNext();
  };
})();
