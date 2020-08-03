/* eslint-disable */
'use strict';

(function () {
  function isEmptyValue (value, $group) {
    switch ($group.data('type')) {
      case 'collection':
        var lm = $group.data('listManager');
        return lm.dt.page.info().recordsTotal <= lm.dt.rows('.removed').count();
    }
    return value === null || value === undefined || value === '';
  }

  function isCheck ($attr) {
    return $attr.filter('[type="checkbox"]').length || $attr.filter('[type="radio"]').length;
  }

  var $cert = $('#cert-dlg');
  var $cert_info = $('#cert-info');
  var certificates = {};
  if (window.CryptoPro) {
    var $crypto = new CryptoPro();
  }

  function showLog(log){
    if (log && log.length) {
      var warning = '';
      var info = '';
      for (var i = 0; i < log.length; i++) {
        if (log[i].type === 'warn') {
          warning = warning + '<br/>' + log[i].message;
        }
        if (log[i].type === 'info') {
          info = info + '<br/>' + log[i].message;
        }
      }
      if (warning) {
        messageCallout.warning(warning);
      }
      if (info) {
        messageCallout.info(info);
      }
    }
  }

  function checkCondPropNames(cond, names) {
    if ($.isArray(cond)) {
      for (var i = 0; i < cond.length; i++) {
        checkCondPropNames(cond[i], names);
      }
    } else if (cond && typeof cond === 'object') {
      for (var fn in cond) {
        if (cond.hasOwnProperty(fn)) {
          checkCondPropNames(cond[fn], names);
        }
      }
    } else if (typeof cond === 'string' && cond) {
      if (cond[0] === '$') {
        names[cond.substr(1)] = true;
      }
    }
    return cond;
  }

  function getBareFormAlert () {
    return '<div class="bare-form-alert alert alert-info">' + __('js.manager.formAlert') + '</div>';
  }

  function signStatusModal() {

  }

  function requestSignStatus(statusUrl, $container) {


  }

  function ObjectManager ($form) {
    this.options = $form.data('options') || {};
    this.$form = $form;
    this.$container = $form.closest('.panel');
    this.$loader = this.$container.find('.object-loader');
    this.$loader = this.$container.find('.object-loader');
    this.$controls = this.$container.find('.object-control');
    this.$workflow = this.$container.find('.workflow');
    this.$createAnother = this.$container.find('#create-another');
    this.$workflowConfirmation = $('#workflow-confirmation');

    $form.data('manager', this);

    this.warnLeave = true;
    if (this.options.warnLeave === false) {
      this.warnLeave = false;
    }
    this.selProviders = {};
    this.changed = false;
    this.trackedValues = !this.options.id ? $form.data('base') || {} : {};
    this.deps = [];
    this.init();

    this.historyPage = new historyPage(
        $('.history-page', this.$container),
        this.options.url && this.options.url.history,
        this.options.locale
    );
    var self = this;
    this.$controls.click(function () { messageCallout.hide(); });
    this.$controls.filter('.command').click(function () { self.do($(this)); });
    this.$controls.filter('.closer').click(function () { self.close(); });
    this.$controls.filter('.history').click(function () { self.historyPage.open(); });
    this.$controls.filter('.reload').click(function () {
      if (!self.warnLeave || !self.changed || confirm(__('js.manager.reloadConfirm'))) {
        window.location.reload();
      }
    });

    function checkExportStatus (elem, format) {
      var loader = elem.children('.loader');
      var download = elem.children('.download');
      loader.show();
      download.hide();
      $.ajax({
        url: self.options.url.node + self.options.itemClass + '/' + encodeURIComponent(self.options.id) + '/export/' + format + "/status",
        type: "GET",
        success: function (data, textStatus, jqXHR) {
          if (data.status === 'ready') {
            loader.hide();
            if (data.previous) {
              download.attr('title', moment(data.previous).format(DATETIME_FORMAT));
              download.show();
            }
          } else {
            setTimeout(checkExportStatus, 5000, elem, format);
          }
        },
        error: function (jqXHR, textStatus, errorThrown) {
          console.log(textStatus, errorThrown);
          loader.hide();
          download.hide();
        }
      });
    }

    this.$container.find('.export').each(function (i, e) {
      var el = $(e);
      var isBackground = el.data('isBackground');
      var hasParams = el.data('hasParams');
      var format = el.data('format');
      el.on('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
        if (e.target === this) {
          self.export(format, hasParams, isBackground, function (err, data) {
            if (!err) {
              checkExportStatus(el, format);
            }
          });
        } else {
          window.open(self.options.url.node + self.options.itemClass + '/' + encodeURIComponent(self.options.id) + '/export/' + format + "/download");
        }
      });
      if (isBackground) {
        checkExportStatus(el, format);
      }
    });

    $('.imodal-close').off().click(this.close.bind(this));

    $(document).keyup(function (event) {
      if (event.keyCode === 13 && event.ctrlKey) {
        var $btn = self.commandManager.getBtn('SAVEANDCLOSE');
        $btn.is(':visible') && $btn.click();
      }
    });
    $(document).keydown(function (event) {
      if (event.keyCode === 27 && !imodal.isActive()) {
        self.close();
      }
    });
    showLog(this.options.log);
  }

  window.initCades = function (cb) {
    onCadesLoaded(function (err) {
      if (err) {
        return cb(err);
      }
      $crypto.open(function (err) {
        if ($cert.length) {
          var $select = $cert.find('select');
          var $button_cancel = $cert.find('button#cert_select_cancel');
          var $button_ok = $cert.find('button#cert_select_confirm');
          var $cert_view = $cert.find('a#cert_info_view');
          var $button_close = $cert_info.find('button');

          $button_close.on('click', function (e) {
            $cert_info.hide();
          });
          $cert_view.on('click', function (e) {
            e.preventDefault();
            $cert_info.show();
          });
          $select.on('change', function (e) {
            $cert_view.css({display: $select.val() ? 'inline' : 'none' });
            if ($select.val()) {
              var cert = certificates[$select.val()];
              $cert_info.find('input#cert_subject').val(cert.SubjectName);
              $cert_info.find('input#cert_provider').val(cert.IssuerName);
              $cert_info.find('input#cert_valid_since')
                .val(moment(cert.ValidSince).format(DATETIME_FORMAT));
              $cert_info.find('input#cert_valid_till')
                .val(moment(cert.ValidTill).format(DATETIME_FORMAT));
              $cert_info.find('input#cert_serial').val(cert.Serial);
            }
          });
          $crypto.getCerts(function (certs) {
            certificates = certs;
            for (var thumb in certs) {
              if (certs.hasOwnProperty(thumb)) {
                var cert = certs[thumb];
                cert = hasCertFullName(cert)
                  ? getFullNameCertTitle(cert)
                  : getFullNameCertTitle(cert);
                $select.append('<option value="'+ thumb +'">'+ cert +'</option>');
              }
            }
            $select.select2({
              width: '100%',
              minimumResultsForSearch: -1
            });
            $select.trigger('change');
          });
          $button_cancel.on('click', function (e) {
            $cert.hide();
            $crypto.abort();
          });
          $button_ok.on('click', function (e) {
            $cert.hide();
            if ($select.val()) {
              $cert.trigger(jQuery.Event("certSelected", {
                cert: $select.val()
              }));
            }
          });
        }
      });
      if (typeof cb === 'function') {
        cb();
      }
    }.bind(this));

    function hasCertFullName (cert) {
      return cert.lastName && cert.firstName;
    }

    function getCertTitle (cert) {
      return __('js.manager.certTitle', {
        sub: cert.Subject,
        issue: cert.Issuer,
        d1: moment(cert.ValidSince).format(DATE_FORMAT),
        d2: moment(cert.ValidTill).format(DATE_FORMAT)
      });
    }

    function getFullNameCertTitle (cert) {
      return cert.lastName + ' ' + cert.firstName;
    }
  };

  ObjectManager.managers = [];

  ObjectManager.init = function () {
    if (window.onCadesLoaded) {
      initCades(function (err) {
        if (err) {
          messageCallout.error(__('js.manager.cadesFail'));
        }
        $('.object-manager').each(function () {
          ObjectManager.managers.push(new ObjectManager($(this)));
        });
      });
    } else {
      $('.object-manager').each(function () {
        ObjectManager.managers.push(new ObjectManager($(this)));
      });
    }
  };

  ObjectManager.loadWfState = function () {
    for (var i = 0; i < ObjectManager.managers.length; i++) {
      ObjectManager.managers[i].loadWfState();
    }
  };

  window.loadWorkflowState = function () {
    ObjectManager.loadWfState();
  };

  window.validate = function () {
    for (var i = 0; i < ObjectManager.managers.length; i++) {
      if (!ObjectManager.managers[i].validate()) {
        return false;
      }
    }
    return true;
  }

  var slTimer = null;

  ObjectManager.prototype = {
    constructor: ObjectManager,

    isNew: function () {
      return !this.options.id;
    },

    isReadOnly: function () {
      return this.commandManager.getBtn('SAVEANDCLOSE').length === 0;
    },

    getMasterData: function (backRef) {
      return {
        masterId: this.options.id,
        masterClass: this.options.itemClass,
        masterBackRef: backRef
      };
    },

    toggleHeadDisabling: function (state) {
      return this.$container.children('.panel-heading').toggleClass('disabled', state);
    },

    getMasterParams: function (backRef) {
      return backRef ? $.param(this.getMasterData(backRef)) : '';
    },

    export: function (format, params, isBackground, startBackgroundCallback) {
      var url = this.options.url.node + this.options.itemClass
        + '/' + encodeURIComponent(this.options.id) + '/export/' + format;
      if (params) {
        imodal.setParams('isBackground', isBackground);
        if (isBackground) {
          imodal.setParams('exportStarted', false);
        }
        imodal.load(url + '/params', function (w) {
          if (isBackground) {
            imodal.on('beforeClose', function () {
              if (imodal.getParams('exportStarted')) {
                startBackgroundCallback(null, {});
              }
            });
          }
        });
      } else if (isBackground) {
        $.ajax({
          url: url,
          type: "GET",
          success: function (data, textStatus, jqXHR) {
            startBackgroundCallback(null, data);
          },
          error: function (jqXHR, textStatus, errorThrown) {
            startBackgroundCallback(errorThrown);
            console.log(textStatus, errorThrown);
          }
        });
      } else {
        window.open(url);
      }
    },

    init: function () {
      if (window.parent === window) {
        this.$container.prepend(getBareFormAlert());
      }
      var $commands = this.$controls.filter('.command');
      this.commandManager = this.isNew()
        ? new CreateObjectCommandManager(this.options.commands, $commands)
        : new UpdateObjectCommandManager(this.options.commands, $commands);
      this.commandManager.init();
      this.initFields();
      this.initChangeTracker();
      this.initTabs();
      this.initDependency();
      this.initSelProviders();
      this.initConcurency();
      this.initSignStatus();
      if (this.isNew()) {
        this.$form.find('select.attr-value').change();
        this.changed = false;
      } else {
        this.loadWfState();
      }
      this.refShortView = new RefShortView(this);
    },

    initTabs: function () {
      this.$tabList = this.$container.find('.object-form-tablist');
      var $tabs = this.$tabList.find('a');
      $tabs.click(function () {
        $(this).tab('show');
        $(window).resize();
      });
      this.restoreActiveTab(this.options.id);
    },

    // WORKFLOW

    loadWfState: function () {
      var self = this;
      function commandDo (cmdBtn) {
        if (cmdBtn.data('confirmMessage')) {
          self.$workflowConfirmation.find('.confirm-message').html(cmdBtn.data('confirmMessage'));
          self.$workflowConfirmation.find('.confirm').off().on('click', function () {
            self.do(cmdBtn);
            self.$workflowConfirmation.modal('hide');
          });
          self.$workflowConfirmation.modal('show');
        } else {
          self.do(cmdBtn);
        }
      }

      if (!this.isNew() && !this.options.globalReadonly) {
        this.toggleHeadDisabling(true);
        this.$workflow.html('');
        var url = this.options.url.workflowState;
        chain(function () {
          var p = $.Deferred();
          $.get({url: url}).done(function (status) {
            self.createWfCommands(status.stages);
            if (self.$workflow.find('.command[data-sign-before="true"],.command[data-sign-after="true"]').length > 0
              && typeof cadesplugin === 'undefined') {
              $.getScript('/registry/js/cades/cadesplugin_api.js', function () {
                initCades(function () {
                  self.$workflow.find('.command').click(function () {
                    commandDo($(this));
                  });
                  self.setObjectReadyForUse();
                });
              })
            } else {
              self.$workflow.find('.command').click(function () {
                commandDo($(this));
              });
              self.setObjectReadyForUse();
            }
            p.resolve();
          }).fail(function (xhr, textStatus, errorThrown) {
            //messageCallout.error('<b>Ошибка:</b><p>'+ xhr.responseText +'</p>');
            console.error(xhr);
            self.$loader.hide();
            p.resolve();
          });
          return p.promise();
        });
      }
    },

    setObjectReadyForUse: function () {
      this.$loader.hide();
      this.toggleHeadDisabling(false);
      setTimeout(function () {
        imodal.getParentFrame().dispatchEvent(new Event(imodal.getEventId('object:ready')));
      }, 0);
    },

    createWfCommands: function (stages) {
      var cmds = [];
      for (var wf in stages) {
        if (stages.hasOwnProperty(wf)) {
          for (var t in stages[wf].next) {
            if (stages[wf].next.hasOwnProperty(t)) {
              cmds.push({wf: wf, t: t, d: stages[wf].next[t]});
            }
          }
        }
      }
      var result = '<div class="btn-group">';
      if (cmds.length > 3) {
        for (var i = 0; i < 2; ++i) {
          result += this.createWfButtonCommand(cmds[i]);
        }
        result += '<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown">' +
          __('js.manager.wf') + ' <span class="caret"></span></button><ul class="dropdown-menu pull-right">';
        for (var i = 2; i < cmds.length; ++i) {
          result += this.createWfMenuCommand(cmds[i]);
        }
        result += '</ul></div>';
      } else {
        for (var i = 0; i < cmds.length; ++i) {
          result += this.createWfButtonCommand(cmds[i]);
        }
      }
      this.$workflow.html(result+ '</div>');
    },

    createWfButtonCommand: function (cmd) {
      return '<button type="button" data-id="'+ cmd.wf +'.'+ cmd.t +'" '+
        'data-sign-before="' + cmd.d.signBefore + '" ' +
        'data-sign-after="' + cmd.d.signAfter + '" ' +
        (cmd.d.confirmMessage || cmd.d.confirm
          ? 'data-confirm-message="' + (cmd.d.confirmMessage ? cmd.d.confirmMessage : __('js.manager.confirm')) + '" '
          : '') +
        'class="btn command btn-default object-control ' + cmd.t + '">' + cmd.d.caption + '</button>';
    },

    createWfMenuCommand: function (cmd) {
      return '<li><a href="#" data-id="'+ cmd.wf +'.'+ cmd.t +'" '+
        'data-sign-before="' + cmd.d.signBefore + '" ' +
        'data-sign-after="' + cmd.d.signAfter + '" ' +
        (cmd.d.confirmMessage || cmd.d.confirm
          ? 'data-confirm-message="' + (cmd.d.confirmMessage ? cmd.d.confirmMessage : __('js.manager.confirm')) + '" '
          : '') +
        'class="command object-control ' + cmd.t + '">' + cmd.d.caption + '</a></li>';
    },

    // TRACKER

    refreshConditions: function($attr){
      var self = this;
      this.$form.find('.form-group').each(function () {
        var $group = $(this);
        if ($group.data('type') === 'combo') {
          /* $group.find('select').empty();
          self.initCombo($group);*/
        }
      });
    },

    trackChange: function($attr, v) {
      var type = $attr.closest('.form-group').data('type');
      var name = $attr.attr('name');
      var value = (typeof v !== 'undefined') ? v : ($attr.is(':checkbox') ? $attr.prop('checked') : $attr.val());

      if (type === 'collection' && typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch (err) {}
      }
      if (type === 'multifile' && typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch (err) {
          value = [];
        }
        if (typeof value === 'string') {
          value = [];
        }
      }
      if (type === 'checkbox' && typeof value === 'string') {
        if (value === "" || value === "null") {
          value = null;
        }
      }
      if (typeof this.trackedValues[name] === 'undefined' || this.trackedValues[name] != value) {
        this.changed = true;
        this.trackedValues[name] = value;
        this.refreshDependency();
        $attr.trigger('tracker.changed');
      }
    },

    refreshTrackedValue: function ($group) {
      var $attr = $group.find('.attr-value');
      var v = $attr.val();
      try {
        v = JSON.parse(v);
      } catch(e) {}
      this.trackedValues[$attr.attr('name')] = v;
    },

    initChangeTracker: function () {
      var self = this;
      var values = this.$form.find('.attr-value');

      values.on('change keyup', function () {
        self.trackChange($(this));
      }).on('blur', function() {
        self.refreshConditions($(this));
      });

      if (self.isNew()) {
        values.each(function(){
          self.trackChange($(this));
        });
      }
    },

    getAttrValues: function () {
      var result = {};
      this.$form.find('.attr-value').each(function () {
        var $attr = $(this);
        result[$attr.attr('name')] = $attr.val();
      });
      return result;
    },

    serializeObject: function (obj) {
      var items = [];
      for (var name in obj) {
        if (obj.hasOwnProperty(name)) {
          items.push(name +'='+ obj[name]);
        }
      }
      return items.join('&'); //encodeURIComponent
    },

    // CONTROLS

    close: function () {
      this.$form.trigger('formClosed');
      if (parent.imodal && (!this.warnLeave || !this.changed || confirm('Закрыть без сохранения?'))) {
        parent.imodal.close();
      }
    },

    do: function ($command) {
      var self = this;
      var id = $command.data('id');
      var action = id.replace(/ANDCLOSE$/, '');
      if (action === 'DELETE' && !confirm(__('js.manager.confirmClose'))) {
        return;
      }
      if (!this.validate()) {
        return;
      }
      var finalizer = function (cb) {
        if (parent.imodal && parent.imodal.getParams('redirect')) {
          if (!self.$createAnother.prop('checked')) {
            parent.imodal.load(self.options.url.item + '/' + encodeURIComponent(parent.imodal.getParams('redirect')));
          }
        } else if (cb) {
          if (action !== 'DELETE') {
            self.loadWfState();
          }
          cb();
        } else {
          parent.imodal.reload();
        }
      };
      var worker = function (cb) {
        self.trackedValues.$action = action;
        if (typeof self.options.validateBy !== 'undefined') {
          self.trackedValues.validateBy = self.options.validateBy;
        }
        self.$loader.show();
        self.$form.find('[name="$action"]').val(action);
        self.perform().done(function () {
          var msg = parent.imodal && parent.imodal.getParams('message');
          if (action != id || action === 'DELETE') {
            parent.imodal && parent.imodal.setParams('redirect', false);
            if (typeof cb === 'function') {
              cb(function () {
                parent.imodal && parent.imodal.close();
              });
            } else {
              parent.imodal && parent.imodal.close();
            }
          } else {
            self.$loader.hide();
            if (parent.imodal) {
              showLog(parent.imodal.getParams('log'));
            }
            messageCallout.success(msg);
            if (typeof cb === 'function') {
              cb(finalizer);
            } else {
              finalizer();
            }
          }
        });
      };

      var signer = function (cb) {
        if (self.options.id) {
          try {
            $crypto.open(function (err) {
              if (err) {
                messageCallout.error('<b>' + __('js.manager.signFail') + '</b><br>' + (err.message || err));
                console.error(err);
                return;
              }
              $crypto.makeSign(
                {
                  action: action,
                  dataUrl: self.options.url.signData.replace(':id', encodeURIComponent(self.options.id)),
                  signUrl: self.options.url.sign.replace(':id', encodeURIComponent(self.options.id))
                },
                function (err) {
                  $crypto.close(function (err2) {
                    messageCallout.error('<b>' + __('js.manager.signFail') + '</b><br>' + (err.message || err));
                    console.error(err);
                  });
                },
                function () {
                  $crypto.close(function (err) {
                    messageCallout.success(__('js.manager.signSuccess'));
                    if (typeof cb === 'function') {
                      cb(finalizer);
                    } else {
                      finalizer();
                    }
                  });
                },
                function (doSign) {
                  $cert.one('certSelected', function (e) {
                    doSign(e.cert);
                  });
                  $cert.show();
                }
              );
            });
          } catch (err) {
            messageCallout.error(__('js.manager.cryptoFail'));
            console.error(err);
          }
        } else {
          if (typeof cb === 'function') {
            cb();
          }
        }
      };
      if ($command.data("signBefore")) {
        signer(worker);
      } else if ($command.data("signAfter")) {
        worker(signer);
      } else {
        worker();
      }
    },

    _onXhrError: function (xhr) {
      var i, self = this;
      var msg = xhr.responseText.indexOf('<body') !== -1 ? '' : xhr.responseText;
      if (xhr.responseJSON) {
        if (xhr.responseJSON.msg) {
          msg = xhr.responseJSON.msg;
        }
      }
      messageCallout.error('<b>' + __('js.manager.error') + ':</b><p>'+ msg +'</p>');
      console.error(xhr);
      if (xhr.responseJSON && xhr.responseJSON.code &&
        (xhr.responseJSON.code === "web.iem" || xhr.responseJSON.code === "web.exists") &&
        xhr.responseJSON.params.key && xhr.responseJSON.params.key.length) {
        self.$form.find('.form-group').each(function () {
          var $group = $(this);
          var $attr = $group.find('.attr-value');
          var name = $attr.attr('name');
          if (xhr.responseJSON.params.key.indexOf(name) > -1) {
            $group.addClass('err');
          }
        });
      }
    },

    perform: function () {
      var self = this;
      this.$loader.show();
      var url = '/registry/api/' +
        (this.options.node ? this.options.node + '/' : '') +
        this.options.itemClass +
        (this.isNew() ? '' : '/'+ encodeURIComponent(this.options.id)) + '/do';
      if (
        this.options.master &&
        this.isNew()
      ) {
        if (this.options.master.backRef && typeof this.trackedValues[this.options.master.backRef] === 'undefined') {
          this.trackedValues[this.options.master.backRef] = this.options.master.id;
        }
        this.trackedValues.$master = this.options.master.updates;

        if (this.options.master.masterProperty) {
          this.trackedValues.$masterClass = this.options.master.class;
          this.trackedValues.$masterId = this.options.master.id;
          this.trackedValues.$masterProperty = this.options.master.masterProperty;
        }
      }
      return $.post({
        url: url,
        data: JSON.stringify(this.trackedValues),
        contentType: 'application/json'
      }).done(function (data) {
        this.changed = false;
        this.$form.trigger('actionPerformed', [this.trackedValues.$action, data]);
        parent.imodal && parent.imodal.setParams('result', data);
        if (data.__log) {
          parent.imodal && parent.imodal.setParams('log', data.__log);
          delete data.__log;
        } else {
          parent.imodal && parent.imodal.setParams('log', null);
        }
        parent.imodal && parent.imodal.setParams('message', data.$message ? data.$message : __('js.manager.done'));
        if (data.$message) {
          delete data.$message;
        }
        if (data._id) {
          self.saveActiveTab(data._id);
          parent.imodal && parent.imodal.setParams('saved', data._id);
          if (this.isNew() && parent.imodal) {
            parent.imodal.setParams('redirect', data._id);
            parent.imodal &&
            parent.imodal.setParams(
              'message',
              __('js.manager.objectCreated') + ' <a href="' +
              self.options.url.item + '/' + encodeURIComponent(parent.imodal.getParams('redirect')) +
              '">' + data.__string + '</a>'
            );
          } else {
            this.options.id = data._id;
          }
        } else {
          parent.imodal && parent.imodal.setParams('saved', null);
        }
      }.bind(this))
        .fail(function (xhr) {
          this._onXhrError(xhr);
        }.bind(this))
        .fail(processAjaxError)
        .always(function () {
          this.$loader.hide();
         }.bind(this));
    },

    saveActiveTab: function (id) {
      store.set('objectActiveTab', {
        id: id,
        tab: this.$tabList.find('.active a').attr('href')
      });
    },

    restoreActiveTab: function (id) {
      var data = store.get('objectActiveTab') || {};
      if (data.id === id) {
        this.$tabList.find('[href="'+ data.tab +'"]').click();
      }
    },

    // VALIDATE

    validate: function () {
      var hasError = false;
      messageCallout.hide();
      this.$form.find('.form-group').each(function (index, element) {
        var error = null;
        var $group = $(element);
        var $attr = $group.find('.attr-value');
        var value = $attr.val();
        if ($group.hasClass('required') && isEmptyValue(value, $group)) {
          error = __('js.manager.requiredField');
        }
        if (error) {
          this.addError($group, error);
          hasError = true;
        } else {
          this.clearError($group);
        }
      }.bind(this));
      hasError && messageCallout.error(__('js.manager.formErrors'));
      return !hasError;
    },

    // INIT CONCURENCY

    initConcurency: function () {
      var self = this;
      var state = this.options.concurencyState;
      if (state && this.options.globalReadonly && state.isBlocked) {
        messageCallout.info(__('js.manager.objectLock', {name: state.userName}));
      }
      if (state && state.timeout) {
        var concTimer = setInterval(function(){
          $.ajax({
            url: self.options.url.concurencyState,
            type: 'GET',
            dataType: 'json',
            success: function (newState) {
              if (newState && newState.isBlocked !== state.isBlocked) {
                window.location.reload();
              }
            },
            error: function (xhreq, status, error) {
              console.log(status, error);
              clearInterval(concTimer);
            }
          });
        }, parseInt(state.timeout / 2));

        $(window).bind("beforeunload", function() {
          clearInterval(concTimer);
        });
      }
    },



    initSignStatus: function() {

      var btn, modal, modalBody;

      function certFormGroup(name, value) {
        return '<div class="form-group">' +
          '<label class="col-md-3 col-sm-3 control-label">'+name+'</label>' +
          '<div class="col-md-9 col-sm-9">' +
          '<input type="text" class="form-control attr-value"'+
          ' readonly="true" value="'+ value +'">' +
          '</div></div>';
      }

      function signStatusModal($crypto, data) {
        $crypto.getCertFromSign(data.signature, function(certs, err) {
          var template, i;
          if (err) {
            console.error(err);
            return;
          }
          modalBody.empty();
          template = '';
          if (data.status === 'inactual') {
            template += '<div class="bare-form-alert alert alert-info">'
            + __('js.manager.signChange') + '</div>';
          } else if (data.status === 'actual') {
            template += '<button class="btn btn-success">' + __('js.manager.signCheck') + '</button>';
          }
          if (certs && certs.length) {
            for (i = 0; i < certs.length; i++) {
              template += '<div class="panel form-horizontal">'+
                '<div class="panel-body">';
              template += certFormGroup(__('js.manager.subject'), certs[i].SubjectName);
              template += certFormGroup(__('js.manager.issuer'), certs[i].IssuerName);
              template += certFormGroup(__('js.manager.validSince'), moment(certs[i].ValidSince).format(DATETIME_FORMAT));
              template += certFormGroup(__('js.manager.validTill'), moment(certs[i].ValidTill).format(DATETIME_FORMAT));
              template += certFormGroup(__('js.manager.serial'), certs[i].Serial);
              template += '</div></div>';
            }
          }
          modalBody.append(template);
          if (data.status === 'actual') {
            modalBody.find('button.btn-success').on('click', function(){
              $crypto.verifySign(data.signature, function(isValid) {
                alert(isValid ? __('js.manager.signValid') : __('js.manager.signNotValid'));
              });
            })
          }
          btn.show();
        });
      }

      if (this.options.checkSignState && this.options.url.signStatus) {
        if (!$crypto && window.CryptoPro) {
          var $crypto = new CryptoPro();
        }
        if (!$crypto) {
          console.error(__('js.manager.cryptoNotInstalled'));
          return;
        }

        btn = this.$container.find('#sign-status'),
        modal = this.$container.find('#sign-status-modal'),
        modalBody = modal.find('.modal-body');

        $.ajax({
          url: this.options.url.signStatus,
          type: 'GET',
          dataType: 'json',
          success: function (data) {
            var i, name, template;
            if (data) {
              if (data.status === 'not_signed') {
                btn.hide();
              } else if (data.status === 'inactual' || data.status === 'actual') {
                if (data.signature) {
                  if (typeof cadesplugin === 'undefined') {
                    $.getScript('/registry/js/cades/cadesplugin_api.js', function () {
                      initCades(function () {
                        signStatusModal($crypto, data);
                      });
                    })
                  } else {
                    signStatusModal($crypto, data);
                  }
                }
              }
            }
          },
          error: function (xhreq, status, error) {
            console.log(status, error);
          }
        });


      }
    },

    addError: function ($element, message) {
      $element.closest('.form-group').addClass('has-error').find('.error-block').html(message);
    },

    clearError: function ($element) {
      $element.closest('.form-group').removeClass('has-error');
    },

    // INIT FIELDS

    initFields: function () {
      var self = this;
      this.$form.find('[data-mask]').each(function () {
        self.initMask($(this));
      });
      this.$form.find('.form-group').each(function () {
        var $group = $(this);
        switch ($group.data('type')) {
          case 'number': self.initNumber($group); break;
          case 'date': self.initDateField($group); break;
          case 'datetime': self.initDateTimeField($group); break;
          case 'image':
          case 'file':
          case 'multifile': self.initFile($group); break;
          case 'geobuilder': self.initGeoBuilder($group); break;
          case 'geocoord': self.initGeoCoord($group); break;
          case 'period': self.initPeriodField($group); break;
          case 'checkbox': self.initCheckbox($group); break;
          case 'wysihtml': self.initWysihtml($group); break;
          case 'reference': self.initReference($group); break;
          case 'combo': self.initCombo($group); break;
          case 'specify': self.initSpecify($group); break;
          case 'herarchy': self.initHierarchy($group); break;
          case 'collection': self.initCollection($group); break;
          case 'select': self.initSelect($group); break;
          case 'url': self.initUrl($group); break;
          case 'schedule': self.initSchedule($group); break;
          case 'calendar': self.initCalendar($group); break;
          case 'autocomplete': self.initAutocomplete($group); break;
          case 'hashtags': self.initHashtags($group); break;
          case 'static': self.initStatic($group); break;
        }
      });
    },

    initMask: function ($input) {
      var mask = $input.data('mask');
      if (!mask) {
        return;
      }
      var value = $input.val();
      if (value.length && !Inputmask.isValid(value, mask)) {
        this.addError($input, __('js.manager.notValidMask'));
        $input.one('focus', function (event) {
          this.clearError($input);
          this.setMask($input, mask);
        }.bind(this));
      } else {
        this.setMask($input, mask);
      }
    },

    setMask: function ($input, mask) {
      $input.inputmask(typeof mask === 'object' ? mask : mask.toString(), {
        clearIncomplete: true
      });
    },

    formatDateCtrl: function (ctrl, fmt) {
      if (ctrl.val()) {
        var v = (ctrl.attr('parse-tz') === 'true') ? moment.parseZone(ctrl.val()) : moment(ctrl.val());
        ctrl.val(v.isValid() ? v.format(fmt) : '');
      }
    },

    initStatic: function ($group) {
      var prop = $group.data('prop');
      if (prop.type === 120 || prop.type === 6) {
        var ctrl = $group.find('.form-control');
        this.formatDateCtrl(ctrl, (prop.type === 120) ? this.options.locale.dateFormat : this.options.locale.dateTimeFormat);
        ctrl.show();
      }
    },

    initNumber: function ($group) {
      $group.find('.attr-value').on('input', function (e) {
        var validValue = Math.max(e.target.min || (-1 * Infinity), Math.min(e.target.max || Infinity, e.target.value));
        $(this).val(validValue);
      });
    },

    initDateField: function ($group) {
      var ctrl = $group.find('.form-datepicker');
      var fm = $group.data('prop');
      var firstOpen = true;
      var opts = {
        locale: this.options.locale.lang,
        format: this.options.locale.dateFormat,
        useCurrent: false
      };
      var ds = null;
      if (ctrl.data('min')) {
        opts.minDate = prepareLimit(ctrl, ctrl.data('min'), ctrl.data('center'), this.options.locale.dateFormat);
        if (moment().isBefore(opts.minDate)) {
          ds = opts.minDate;
        }
      }
      if (ctrl.data('max')) {
        opts.maxDate = prepareLimit(ctrl, ctrl.data('max'), ctrl.data('center'), this.options.locale.dateFormat);
        if (moment().isAfter(opts.maxDate)) {
          ds = opts.maxDate;
        }
        opts.maxDate.add({h: 23, m: 59, s: 59, ms: 999});
      }
      this.formatDateCtrl(ctrl, this.options.locale.dateFormat);
      ctrl.closest('.input-group').show();
      ctrl.datetimepicker(opts).on('dp.change', function (e) {
        this.trackChange(ctrl, ctrl.val() ? moment(ctrl.val(), this.options.locale.dateFormat).format() : null);
      }.bind(this));
      if (ds) {
        ctrl.on("dp.show", function () {
          if (firstOpen == true) {
            $(this).data('DateTimePicker').date(ds);
            firstOpen = false;
          }
        });
      }
    },

    initDateTimeField: function ($group) {
      var ctrl = $group.find('.form-datetimepicker');
      var fm = $group.data('prop');
      var firstOpen = true;
      var ds = false;
      var opts = {
        locale: this.options.locale.lang,
        format: this.options.locale.dateTimeFormat,
        useCurrent: false
      };
      if (ctrl.data('min')) {
        opts.minDate = prepareLimit(ctrl, ctrl.data('min'), ctrl.data('center'), this.options.locale.dateTimeFormat);
        if (moment().isBefore(opts.minDate)) {
          ds = opts.minDate;
        }
      }
      if (ctrl.data('max')) {
        opts.maxDate = prepareLimit(ctrl, ctrl.data('max'), ctrl.data('center'), this.options.locale.dateTimeFormat);
        if (moment().isAfter(opts.maxDate)) {
          ds = opts.maxDate;
        }
        opts.maxDate.add({s: 59, ms: 999});
      }
      this.formatDateCtrl(ctrl, this.options.locale.dateTimeFormat);
      ctrl.closest('.input-group').show();
      ctrl.datetimepicker(opts).on('dp.change', function (e) {
        this.trackChange(ctrl, ctrl.val() ? moment(ctrl.val(), this.options.locale.dateTimeFormat).format() : null);
      }.bind(this));
      if (ds) {
        ctrl.on("dp.show", function () {
          if (firstOpen == true) {
            $(this).data('DateTimePicker').date(ds);
            firstOpen = false;
          }
        });
      }
    },

    initPeriodField: function ($group) {
      var self = this;
      var $input = $group.find('[name]');
      var $start = $group.find('.start');
      var $end = $group.find('.end');
      var period = JSON.parse($input.val());
      if (period) {
        $start.val(period[0]);
        $end.val(period[1]);
      }
      $group.find('.form-datepicker').datetimepicker({
        locale: this.options.locale.lang,
        format: this.options.locale.dateFormat
      }).on('dp.change', function () {
        var v = [$start.val(), $end.val()];
        $input.val(JSON.stringify(v));
        self.trackChange($input, v);
      });
    },

    initWysihtml: function ($group) {
      var self = this;
      var $text = $group.find('.attr-value');
      var opts = $group.data('options');
      $text.tinymce({
        menubar: false,
        plugins: 'code lists link uploadImage',
        toolbar: 'code undo redo | styleselect | bold italic underline | bullist numlist outdent indent | link uploadImage',
        relative_urls: false,
        remove_script_host: false,
        inserted_image_upload_url: opts.inserted_image_upload_url,
        inserted_image_thumbnail_type: opts.inserted_image_thumbnail_type,
        inserted_image_container_classes: opts.inserted_image_thumbnail_type,
        setup: function(editor) {
          editor.on('change', function (e) {
            self.trackChange($text);
          });
        }
      });
    },

    initFile: function ($group) {
      var self = this;
      var $uploader = $group.find('.uploader');
      var $field = $group.find('.attr-value');
      var opts = $uploader.data('options');
      var messageSelector = '.uploader-message';

      var applier = null;
      if (!opts || opts.maxFiles <= 1) {
        applier = function(data, action) {
          this.val(action ? data.id : '');
          this.trigger('change');
        };
      } else {
        applier = function (data, action) {
          var old = null;
          try {
            old = JSON.parse(this.val());
          } catch (err) {
          }
          if (!old) {
            old = [];
          }
          if (action) {
            old.push(data.id);
          } else {
            var ind = old.indexOf(data.id);
            if (ind >= 0) {
              old.splice(ind, 1);
            }
          }
          this.val(JSON.stringify(old));
          this.trigger('change');
        };
      }

      $uploader.ajaxUploader()
        .on('uploader.selected', function (event, data) {
          $uploader.find('.uploader-overflow').hide();
        })
        .on('uploader.overflow', function (event, data) {
          $uploader.find('.uploader-overflow').text(data).show();
        })
        .on('uploader.file.appended', function (event, data) {
          data.$item.find('.uploader-filename').text(data.file.name
            +' ('+ commonHelper.formatFileSize(data.file.size) + ')');
        })
        .on('uploader.file.validated', function (event, data) {
          if (data.image) {
            data.$item.addClass('thumb').find('.uploader-thumb div').append(data.image);
          }
        })
        .on('uploader.file.started', function (event, data) {
          data.$item.removeClass('pending').addClass('processing');
          data.$item.find(messageSelector).text(__('js.manager.loading'));
        })
        .on('uploader.file.progress', function (event, data) {
          data.$item.find('.progress-bar').css('width', data.percent + '%');
        })
        .on('uploader.file.uploaded', function (event, data) {
          data.$item.removeClass('processing').addClass('done');
          data.$item.find(messageSelector).text(__('js.manager.loaded'));
          try {
            data = JSON.parse(data.response)[$uploader.data('attr')];
          } catch (err) {
            data = data.response;
          }
          applier.apply($field, [data, true]);
        })
        .on('uploader.file.error', function (event, data) {
          data.$item.removeClass('pending processing').addClass('failed');
          data.$item.find(messageSelector).text(__('js.manager.loadFail'));
        })
        .on('uploader.file.confirmRemove', function (event, data) {
          if (confirm(__('js.manager.deleteLoaded'))) {
            applier.apply($field, [data.response, false]);
            data.remove();
          }
        });

      var $frame = $group.find('.file-frame');
      $frame.find('.remove-file-btn').click(function () {
        var frm = $(this).closest('.file-frame');
        var id = frm.data('fileid');
        applier.apply($field, [{id:id}, false]);
        frm.remove();
        $uploader.show();
      });

      var $shareModal = $group.find('.modal.fileupload'),
        shareDlgBtn = $group.find('.share-dlg-btn'),
        shareModalLoaded = false,
        $shareBlock = $group.find('.share-block'),
        $shareBtn = $group.find('.share-file-menu-btn'),
        frm = $group.find('div.modal-body'),
        fileId = encodeURIComponent(frm.data('fileid')),
        innerLink = $group.find('input.link'),
        shareLink = $group.find('input.share-link'),
        url = self.options.url.share ? self.options.url.share.replace(':fileId', fileId) : null,
        a = document.createElement('a');
      if (url) {
        $shareModal.on('shown.bs.modal', function () {
          if (fileId && !shareModalLoaded) {
            $.ajax({
              url: url,
              type: 'GET',
              dataType: 'json',
              success: function (data) {
                if (data) {
                  if (data.shareUrl) {
                    a.setAttribute('href', data.shareUrl);
                    $(shareLink).val(a.href);
                    $shareBtn.attr('checked', true);
                    $shareBlock.show();
                  }
                  if (data.link) {
                    a.setAttribute('href', data.link);
                    $(innerLink).val(a.href);
                  }
                }
              },
              error: function (xhreq, status, error) {
                console.log(status, error);
              }
            });
          }
        });

        $shareBtn.on('click', function () {
          if ($(this).is(':checked')) {
            if (fileId) {
              $.ajax({
                url: url,
                type: 'POST',
                dataType: 'json',
                success: function (data) {
                  if (data && data.shareUrl) {
                    a.setAttribute('href', data.shareUrl);
                    $(shareLink).val(a.href);
                    $shareBlock.show();
                  }
                },
                error: function (xhreq, status, error) {
                  console.log(status, error);
                }
              });
            }
          } else {
            if (fileId) {
              $.ajax({
                url: url,
                type: 'DELETE',
                dataType: 'json',
                success: function (data) {
                  if (data) {
                    $(shareLink).val('');
                    $shareBlock.hide();
                  }
                },
                error: function (xhreq, status, error) {
                  console.log(status, error);
                }
              });
            }
          }
        });

        $('.copy-clip').on('click', function (e) {
          var $linkInput = $($(e.target).data('copytarget'));
          if ($linkInput && $linkInput.select) {
            $linkInput.select();
            try {
              document.execCommand('copy');
              $linkInput.blur();
            } catch (err) {
            }
          }
        });
      } else {
        shareDlgBtn.remove();
      }
    },

    initGeoCoord: function ($group) {
      var self = this;
      var fld = $group.find('.coords');
      var fldMeta = $group.data('prop');
      var geocoord = new GeoCoord(fld, this.trackedValues, fldMeta);
      geocoord.init();
      $group.find('.geocoord').on('changed', function (e) {
        self.trackChange(fld, e.coords);
      });
    },

    initGeoBuilder: function ($group) {
      var self = this;
      var fld = $group.find('.coords');
      var geobuilder = new GeoBuilder(fld);
      geobuilder.init();
      $group.find('.geobuilder').on('changed', function (e) {
        self.trackChange(fld, e.geodata);
      });
    },

    initCheckbox: function ($group) {
      $group.find('[type="checkbox"]').iCheck({
        checkboxClass: 'icheckbox_flat',
        radioClass: 'iradio_flat',
        indeterminateClass: 'indeterminate-checkbox'
      }).on('ifToggled', function(event){
        var val = this.checked;
        if ($(this).attr('nullable') === 'true' && this.checked && $group.find('.attr-value').val() !== 'null') {
            $(this).iCheck('indeterminate');
            val = 'null';
        }
        $group.find('.attr-value').val(val).change();
      });
    },

    initReference: function ($group, setValue, selectOverride) {
      var self = this;
      var opts = $group.data('options');
      var requestParams = this.getMasterData(opts.backRef);
      var $attr = $group.find('.attr-value');
      requestParams.masterProperty = $attr.attr('name');
      if (opts.selConditions) {
        requestParams.filter = opts.selConditions;
      }
      requestParams = $.param(requestParams);
      var h = function () {
        var result = imodal.getParams('result');
        imodal.off('beforeClose');
        if (result) {
          if (typeof setValue === 'function') {
            setValue.call($group, result);
          } else {
            $group.find('.attr-value').val(result._id);
            $group.find('.display-value').text(result.__string).val(result.__string);
            $group.find('.modal-link.display-value').attr('href', opts.updateUrl + '/' + result._id);
            $group.find('.attr-value').trigger('change');
          }
        }
      };
      if (this.isNew() && $group.find('.attr-value').val()){
        this.refreshTrackedValue($group);
      }
      if (opts.useMaster) {
        this.refreshTrackedValue($group);
      }
      $group.data('commandManager', new DropdownCommandManager(
        $group.data("prop").commands,
        $group.find(".dropdown-tools .btn"),
        $group.find(".attr-value"))
      );
      if (opts.selectUrl) {
        $group.find(".select-btn").click(selectOverride ? selectOverride : function (e) {
          imodal.off('beforeClose');
          if (self.changed) {
            imodal.post(opts.selectUrl + '?' + requestParams, {updates: self.trackedValues});
          } else {
            imodal.load(opts.selectUrl + '?' + requestParams);
          }
          imodal.on('beforeClose', function () {
            imodal.off('beforeClose');
            var result = imodal.getParams('result');
            if (result && result.length) {
              if (typeof setValue === 'function') {
                setValue.call($group, result[0]);
              } else {
                $group.find('.attr-value').val(result[0]._id);
                $group.find('.display-value').val(result[0].__string).text(result[0].__string);
                $group.find('.modal-link.display-value').attr('href', opts.updateUrl + '/' + result[0]._id);
                $group.find('.attr-value').trigger('change');
              }
            }
          });
        });
      }
      $group.find(".create-btn").click(function (e) {
        var id = $group.find('.attr-value').val();
        imodal.off('beforeClose');
        imodal.post(opts.createUrl +'?'+ requestParams, {masterUpdates: self.trackedValues});
        imodal.on('beforeClose', h);
      });

      function _openSubForm() {
        var id = $group.find('.attr-value').val();
        if (id) {
          var params = {};
          if (opts.globalReadonly) {
            params.readonly = 'on';
          }
          if (opts.condensedView) {
            params.condensed = 'on';
          }
          imodal.off('beforeClose');
          imodal.load(opts.updateUrl +'/'+ id +'?'+ self.serializeObject(params));
          imodal.on('beforeClose', h);
        }
      }

      $group.find('.edit-btn').click(_openSubForm);
      $group.find('.display-link').click(_openSubForm);

      $group.find('.remove-btn').click(function () {
        if (confirm(__('js.manager.deleteRef'))) {
          $group.find('.attr-value').val('');
          $group.find('.display-value').val('').text('');
          $group.find('.attr-value').trigger('change');
        }
      });
    },

    initCollection: function ($group) {
      var me = this;
      var opts = $group.data('prop');
      var requestParams = this.getMasterData($group.data('backref'));
      var $attr = $group.find('.attr-value');
      requestParams.masterProperty = $attr.attr('name');
      requestParams.filter = JSON.stringify(opts.selConditions);
      if ($group.data('isAjax')) {
        chain(function () {
          var p = $.Deferred();
          var list = new AttrListManager($group, function (e, settings, json, xhr) {
            me.refreshDependency();
            p.resolve();
          });
          list.om = me;
          list.requestParams = $.param(requestParams);
          $group.find('.table').on('change', function (e) {
            me.trackedValues[$group.data('attr')] = e.changes;
            me.refreshDependency();
          });
          return p.promise();
        });
      } else {
        var list = new AttrListManager($group, function (e, settings, json, xhr) {
          me.refreshDependency();
        });
        list.om = this;
        list.requestParams = $.param(requestParams);
        $group.find('.table').on('change', function (e) {
          me.trackedValues[$group.data('attr')] = e.changes;
          me.refreshDependency();
        });
      }
    },

    initSelect: function ($group) {
      var sp = $group.data('sp');
      var pn = $group.data('prop').property;
      if (sp) {
        var names = this.getSelProviderBaseNames(sp);
        for (var i = 0; i < names.length; ++i) {
          if (!this.selProviders[names[i]]) {
            this.selProviders[names[i]] = {$groups: [], attrs: []};
          }
          this.selProviders[names[i]].$groups.push($group);
          if (pn) {
            this.selProviders[names[i]].attrs.push(pn);
          }
        }
      }
    },

    initAutocomplete: function ($group) {
      var select = $group.find('select');
      var opts = $group.data('options');
      $group.find('.attr-value').autocomplete({
        source: function(request, response){
          $.ajax({
            url: opts._url,
            type: 'POST',
            dataType: 'json',
            data:{
              search: request.term,
              length: opts._length
            },
            success: function(data){
              response($.map(data, function(item){
                return{
                  value: item
                }
              }));
            }
          });
        }
      });
    },

    initCombo: function ($group) {
      var self = this;
      var select = $group.find('select');
      this.initReference($group, function (result) {
        select.html('<option value="'+result._id+'">'+result.__string+'</option>').val(result._id).trigger("change");
      });
      var comboOpts = $group.data('options');
      var options = {
        ajax: {
          type: 'POST',
          dataType: 'json',
          url: comboOpts._url,
          delay: 250,
          data: function (params) {
            return {
              search: {value: params.term},
              filter: comboOpts._filter,
              sorting: comboOpts._sorting,
              start: ((params.page || 1) - 1) * comboOpts._length,
              length: comboOpts._length,
              itemId: comboOpts._itemId,
              itemClass: comboOpts._itemClass,
              updates: self.trackedValues
            };
          },
          processResults: function (data, params) {
            var res = [];
            for(var i = 0; i < data.data.length; i++){
              res.push({id: data.data[i]._id, text: data.data[i].__string, object: data.data[i]});
            }
            params.page = params.page || 1;
            return {
              results: res,
              pagination: {
                more: (params.page * comboOpts._length) < data.recordsTotal
              }
            };
          }
        },
        width: '100%'
      };
      select.select2(options);
    },

    initSelectGroup: function ($group, prepareRequest, parseResponse) {
      var opts = $group.data('options');
      var selectGroup = $group.find('.select-group');
      var alertBlock = selectGroup.find(".select-group-error");
      var selects = selectGroup.find('select');
      var disableSelect = function (select) {
        select.val('').trigger("change").prop('disabled',true).closest('.form-group').hide();
      };
      var enableSelect = function (select) {
        select.prop('disabled',false).closest('.form-group').show();
      };
      var setValue = function (result) {
        this.find('.attr-value').val(result._id);
        this.find('.display-value').val(result.__string);
        this.find('.attr-value').trigger('change');
      };
      var onError = function (title, content) {
        alertBlock.find(".select-group-title").text(title);
        alertBlock.find(".select-group-content").text(content);
        alertBlock.show();
      };
      var closeSelectGroup = function () {
        selectGroup.removeClass('active');
        selects.each(function (i, e) {
          if (i > 0) {
            disableSelect($(e));
          } else {
            $(e).val('').trigger('change');
          }
        });
      };
      var addOptions = function (select, options) {
        select.empty().append('<option value="null"></option>');
        for (var j = 0; j < options.length; j++) {
          select.append('<option value="'+options[j].id+'">'+options[j].text+'</option>');
        }
      };

      var downloadOptions = function (select) {
        var params = {
          values: [],
          filter: opts._filter,
          sorting: opts._sorting
        };
        var selectIndex = selects.index(select);
        selects.each(function (i, e) {
          var el = $(e);
          if (!el.hasClass("main-select")) {
            params.values.push(i < selectIndex && el.val() ? el.val() : null);
          }
        });
        params = prepareRequest.call(this, params, selects, opts);

        jQuery.ajax({
          url: opts._url,
          type: 'POST',
          dataType: 'json',
          data: params,
          error: function (jqXHR, textStatus, errorThrown) {
            onError(jqXHR.status, jqXHR.statusText);
          },
          success: function (data, textStatus, jqXHR) {
            var variants = [];

            alertBlock.hide();
            if (!data.data.length) {
              onError(__('js.manager.noData'), __('js.manager.noDataMessage'));
            } else {
              variants = data.data;
            }
            variants = parseResponse.call(select, variants, data, selects, opts);

            if (!variants.length) {
              disableSelect(select);
            } else {
              addOptions(select, variants);
              enableSelect(select);
            }
          }
        });
      };

      //Сортируем для верности массив селекторов в соответствии с порядком в DOM
      selects = selects.sort(function (a, b) {
        return selects.index(a) - selects.index(b);
      });

      this.initReference($group, setValue, function (e) {
        selectGroup.addClass('active');
        downloadOptions($(selects.get(0)));
      });

      selects.select2({minimumResultsForSearch: Infinity})
        .on("select2:select", function (e) {
          var openedIndex = selects.index(this);
          var selectedValue = $(this).val();
          selects.each(function (i, e) {
            if (i > openedIndex) {
              disableSelect($(e));
            }
            if (i === openedIndex + 1 && selectedValue) {
              downloadOptions($(e));
            }
          });
          if ($(this).hasClass("main-select") && selectedValue) {
            selectGroup.find('button.select-group-confirm').prop('disabled',false);
          } else {
            selectGroup.find('button.select-group-confirm').prop('disabled',true);
          }
        })
        .each(function (i, e) {
          disableSelect($(e));
        });

      //Определяем поведение кнопок закрытия и записи
      selectGroup.find('button.select-group-close').on('click', function (e) {
        closeSelectGroup(selectGroup, selects);
      });
      selectGroup.find('button.select-group-confirm').on('click', function (e) {
        var selValue = selectGroup.find(".main-select").select2('data')[0];
        if(selValue) {
          setValue.call($group, {_id: selValue.id, __string: selValue.text});
        }
        closeSelectGroup(selectGroup, selects);
      });

      return {
        disableSelect: disableSelect,
        enableSelect: enableSelect,
        addOptions: addOptions
      };
    },

    initHierarchy: function ($group) {
      var _this = this.initSelectGroup($group, function (res, selects) {
        res.filters = [];
        selects.each(function (i, e) {
          if (!$(e).hasClass("main-select")) {
            res.filters.push($(e).data("props").filter);
          }
        });
        return res;
      }, function (res, data, selects) {
        var searchedIndex = selects.index(this);
        if (data.total && data.data.length && data.transit > searchedIndex) {
          selects.each(function (i, e) {
            if (i === data.transit) {
              _this.addOptions($(e), data.data);
              _this.enableSelect($(e));
            } else if (i >= searchedIndex && i < data.transit) {
              _this.disableSelect($(e));
            }
          });
          return [];
        }
        return res;
      });
    },

    initSpecify: function ($group) {
      this.initSelectGroup($group, function (res, selects) {
        res.attributes = [];
        selects.each(function (i, e) {
          if (!$(e).hasClass("main-select")) {
            res.attributes.push($(e).data("props").property);
          }
        });
        return res;
      }, function (res, data, selects) {
        return res;
      });
    },

    initUrl: function ($group) {
      var $box = $group.find('.url-box');
      var $update = $box.find('.update');
      $update.click(function () {
        var val = $.trim($box.find('input').val());
        if (val) {
          if ($box.hasClass('active')) {
            $box.find('p').html('<a href="'+ val +'" target="_blank">'+ val +'</a>');
          }
          $box.toggleClass('active');
        }
      });
      var $input = $box.find('input');
      if (!$.trim($input.val())) {
        $box.addClass('active');
      }
      $input.blur(function () {
        $update.click();
      });
    },

    initSchedule: function ($group) {
      var self = this;
      var wt = new WorkTime($group);
      wt.init();
      $group.on('change', function (e) {
        self.trackChange(wt.$field, wt.attrValue);
      });
    },

    initCalendar: function ($group) {
      var self = this;
      var calendar = new Calendar($group);
      calendar.init();
      $group.on('change', function (e) {
        self.trackChange(calendar.$field, calendar.getValue());
      });
    },

    // DEPENDENCY

    initDependency: function () {
      var self = this;
      this.$form.find('.form-group').each(function () {
        var $group = $(this);
        var prop = $group.data('prop');
        if (prop && (prop.visibility || prop.enablement || prop.obligation)) {
          self.deps.push({
            $group: $group,
            visibility: commonHelper.prepareDepCondition(prop.visibility),
            enablement: commonHelper.prepareDepCondition(prop.enablement),
            obligation: commonHelper.prepareDepCondition(prop.obligation)
          });
        }
      });
      this.refreshDependency();
    },

    initHashtags: function ($group) {
      var me = this;
      var term = null;
      var enableCreate = false;
      var select = $group.find('select');
      var opts = $group.data('options');

      var requestParams = this.getMasterData(opts.backRef);
      requestParams.filter = JSON.stringify(opts.selConditions);
      requestParams = $.param(requestParams);

      var select2options = {
        ajax: {
          type: 'POST',
          dataType: 'json',
          url: opts._url,
          delay: 250,
          data: function (params) {
            term = params.term;
            return {
              search: {value: params.term},
              filter: opts._filter,
              sorting: opts._sorting,
              start: ((params.page || 1) - 1) * opts._length,
              length: opts._length
            };
          },
          processResults: function (data, params) {
            var res = [];
            if (data.data.length) {
              for(var i = 0; i < data.data.length; i++){
                res.push({id: data.data[i]._id, text: data.data[i].__string, object: data.data[i]});
              }
              enableCreate = false;
            } else {
              enableCreate = true;
            }

            params.page = params.page || 1;
            return {
              results: res,
              pagination: {
                more: (params.page * opts._length) < data.recordsTotal
              }
            };
          }
        }
      };

      function addTrackedValuesRecord (id, action) {
        var tv = me.trackedValues[$group.data('attr')];
        if (tv && Array.isArray(tv)) {
          var absorb = false;
          for (var i = tv.length - 1; i >= 0; i--) {
            if (tv[i].id === id) {
              if ((tv[i].action === 'put' && action === 'eject') ||
                (tv[i].action === 'eject' && action === 'put')) {
                absorb = true;
              }
              tv.splice(i, 1);
            }
          }
          if (!absorb) {
            tv.push({action: action, id: id});
          }
        } else {
          me.trackedValues[$group.data('attr')] = [{action: action, id: id}];
        }
      }

      $group.on('keyup', '.select2-search__field', null, function (e) {
        if (e.which === 13 && enableCreate) {
          $.ajax({
            url: opts.createUrl,
            type: 'POST',
            dataType: 'json',
            data:{term: term},
            success: function(data) {
              select.select2('destroy');
              addTrackedValuesRecord(data._id, 'put');
              select.append('<option value="' + data._id + '">' +data.__string + '</option>');
              var vals = select.val();
              vals.push(data._id);
              select.val(vals);
              select.select2(select2options);
            }
          });
        }
      });

      select.on('select2:select', function (e) {
        addTrackedValuesRecord(e.params.data.id, 'put');
      });
      select.on('select2:unselect', function (e) {
        addTrackedValuesRecord(e.params.data.id, 'eject');
      });
      $group.on('click', '.select2-selection__choice', null, function (e) {
        select.prop("disabled", true);
        var ind = $(e.target).index();
        var option = $('option', select).eq(ind);
        var id = option.val();

        if (id) {
          var params = {};
          if (opts.globalReadonly) {
            params.readonly = 'on';
          }
          if (opts.condensedView) {
            params.condensed = 'on';
          }
          imodal.off('beforeClose');
          imodal.load(opts.updateUrl +'/'+ id +'?'+ me.serializeObject(params));
          imodal.on('beforeClose', function () {
            imodal.off('beforeClose');
            select.prop("disabled", false);
            var result = imodal.getParams('result');
            if (result) {
              select.select2('destroy');
              option.val(result._id).text(result.__string);
              var vals = select.val();
              vals[ind] = result._id;
              select.val(vals);
              select.select2(select2options);
            }
          });
        }
        e.preventDefault();
        e.stopPropagation();
        return false;
      });

      select.val(opts._value);
      select.select2(select2options);
    },

    refreshDependency: function () {
      for (var i = 0; i < this.deps.length; ++i) {
        var dep = this.deps[i];
        dep.visibility && this.toggleVisibility(dep.$group, this.resolveDepCondition(dep.visibility));
        dep.enablement && this.toggleEnablement(dep.$group, this.resolveDepCondition(dep.enablement));
        dep.obligation && this.toggleObligation(dep.$group, this.resolveDepCondition(dep.obligation));
      }
      $('.form-struct').each(function (index, element) {
        var $struct = $(element);
        $struct.toggleClass('hidden', this.isHiddenAll($struct.find('.form-group')));
      }.bind(this));
      if (this.$tabList) {
        this.$tabList.find('.hidden').removeClass('hidden');
        $('.tab-pane').each(function (index, element) {
          var $pane = $(element);
          if (this.isHiddenAll($pane.find('.form-group'))) {
            this.$tabList.find('[href="#' + element.id + '"]').parent().addClass('hidden');
          }
        }.bind(this));
      }
    },

    isHiddenAll: function ($items) {
      return $items.filter(function () {
        return !$(this).hasClass('hidden');
      }).length === 0;
    },

    resolveDepCondition: function (cond) {
      try {
        return eval(cond);
      } catch (err) {
        console.error(err);
        return false;
      }
    },

    toggleVisibility: function ($group, state) {
      $group.toggleClass('hidden', !state);
      if (state) {
        var list = $group.data('listManager');
        if (list && list.dt) {
          list.dt.columns.adjust();
        }
      }
    },

    toggleEnablement: function ($group, state) {
      $group.toggleClass('disabled', !state);
      var $attr = $group.find('.attr-value');
      $attr.attr('disabled', !state);
      switch ($group.data('type')) {
        case 'checkbox':
          $group.find('.form-control').attr('disabled', !state);
          break;
      }
    },

    toggleObligation: function ($group, state) {
      $group.toggleClass('required', state);
    },

    // SELECTION PROVIDER

    initSelProviders: function () {
      var self = this;

      function initer($base, name) {
        $base.on('tracker.changed', function () {
          self.updateSelProviders(name);
        });
        $base.change(function () {
          for (var i = 0; i < self.selProviders[name].$groups.length; ++i) {
            self.selProviders[name].$groups[i].find('.attr-value');
          }
        });
      }

      for (var name in this.selProviders) {
        if (this.selProviders.hasOwnProperty(name)) {
          var $base = this.$form.find('[name="'+ name +'"]');
          initer($base, name);
        }
      }
    },

    getSelProviderBaseNames: function (data) {
      var names = {};
      if (data && data.matrix instanceof Array) {
        for (var i = 0; i < data.matrix.length; ++i) {
          if (data.matrix[i].conditions) {
            this.setConditionBaseNames(data.matrix[i].conditions, names);
          }
        }
      }
      return Object.keys(names);
    },

    setConditionBaseNames: function (cond, names) {
      checkCondPropNames(cond, names);
    },

    updateSelProviders: function (baseName) {
      var url = this.options.url.selectionLists;
      var items = [];
      var attrs = [];
      if (typeof baseName === 'string') {
        if (this.selProviders.hasOwnProperty(baseName)) {
          items.push(this.selProviders[baseName]);
          Array.prototype.push.apply(attrs, this.selProviders[baseName].attrs);
        }
      } else {
        for (var i = 0; i < baseName.length; i++) {
          if (this.selProviders.hasOwnProperty(baseName[i])) {
            items.push(this.selProviders[baseName[i]]);
            Array.prototype.push.apply(attrs, this.selProviders[baseName[i]].attrs);
          }
        }
      }
      var params = {updates: this.trackedValues, attrs: attrs};
      this.disableSelProviderSelects(items);
      clearTimeout(slTimer);
      slTimer = setTimeout(function () {
        $.post(url, params).done(function (data) {
          this.setSelProviderSelects(items, data);
        }.bind(this)).fail(function (xhr) {
          console.error(xhr);
        }).always(function () {
        }.bind(this));
      }.bind(this), 1000);
    },

    disableSelProviderSelects: function (items) {
      for (var j = 0; j < items.length; j++) {
        for (var i = 0; i < items[j].$groups.length; i++) {
          items[j].$groups[i].addClass('loading');
        }
      }
    },

    setSelProviderSelects: function (items, data) {
      var self = this;
      var needRecalc = [];
      for (var k = 0; k < items.length; k++) {
        var item = items[k];
        for (var i = 0; i < item.$groups.length; i++) {
          var $select = item.$groups[i].removeClass('loading').find('select');
          var prev = $select.val();
          $select.empty();
          var id = $select.attr('name');
          if (data[id]) {
            for (var j = 0; j < data[id].length; j++) {
              var opt = new Option(data[id][j].value, data[id][j].key);
              opt.selected = prev == data[id][j].key;
              $select.append(opt);
            }
            $select.filter('[name]').each(function () {
              var v = $(this).val();
              var name = $(this).attr('name');
              self.trackedValues[name] = v;
              if (v != prev && self.selProviders.hasOwnProperty(name)) {
                needRecalc.push(name);
              }
            });
          }
          $select.change();
        }
      }
      if (needRecalc.length) {
        this.updateSelProviders(needRecalc);
      }
    }
  };

  function prepareLimit(ctrl, limit, center, fmt) {
    if (limit === "now") {
      return moment();
    }
    var l = (ctrl.attr('parse-tz') === 'true') ? moment.parseZone(limit) : moment(limit);
    if (!l.isValid()) {
      l = moment(center !== "now" && center || new Date());
      l.add(moment.duration(limit));
    }
    l = l.isValid() ? moment(l.format(fmt), fmt) : null;
    return l;
  }

  ObjectManager.init();
})();
