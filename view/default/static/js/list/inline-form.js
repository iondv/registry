'use strict';

(function () {

  var SELECTED_CLASS = 'inline-selected';
  var UPDATING_CLASS = 'inline-form-updating';

  window.InlineForm = Form;
  window.AttrInlineForm = AttrForm;

  function Form (list) {
    this.list = list;
    this.readOnly = this.list.options.readOnly;
    this.$wrapper = list.$table.closest('.table-responsive');
    this.$table = list.$table;
    this.$tbody = list.$table.children('tbody');
    this.$create = list.$controls.find('.create-inline');
    this.$controls = list.$container.find('.inline-form-control').appendTo(document.body);
    this.$update = this.$controls.filter('.update');
    this.$save = this.$controls.filter('.save');
    this.$remove = this.$controls.filter('.remove');
    this.$delete = this.$controls.filter('.delete');
    this.$cancel = this.$controls.filter('.cancel');
    this.$workflow = this.$controls.filter('.workflow');
    this.$sorting = this.$controls.filter('.sorting');
    this.editableCache = {};
    this.init();
  }

  $.extend(Form.prototype, {

    init: function () {
      this.list.$container.addClass('list-inline-form');

      $(window).resize(this.resize.bind(this));
      $(document).keyup(this.onDocumentKeyUp.bind(this));
      $(document).keydown(this.onDocumentKeyDown.bind(this));

      this.$create.click(this.create.bind(this));
      this.$update.click(this.update.bind(this));
      this.$save.click(this.save.bind(this));
      this.$delete.click(this.delete.bind(this));
      this.$remove.click(this.remove.bind(this));
      this.$cancel.click(this.cancel.bind(this));
      this.$sorting.filter('.sorting-up').click(this.sortUp.bind(this));
      this.$sorting.filter('.sorting-down').click(this.sortDown.bind(this));
      this.$workflow.on('click', '.command', this.workflow.bind(this));
      this.list.dt.on('preXhr.dt', this.reset.bind(this));
      this.$table.on('command-control-change', this.commandControlChange.bind(this));

      this.$tbody.on('mouseenter', '> tr', this.selectRow.bind(this));
      this.$tbody.on('click', '> tr', this.clickRow.bind(this));
      this.$tbody.on('dblclick', '> tr', this.dblclickRow.bind(this));
      this.$tbody.mouseleave(this.onTBodyMouseLeave.bind(this));
      this.$controls.mouseleave(this.onControlMouseLeave.bind(this));
      //this.$tbody.on('mouseenter', '> tr', this.selectRow.bind(this));
    },

    reset: function () {
      if (this.activeForm) {
        this.activeForm.reset();
      }
      this.$controls.hide();
      this.activeForm = null;
    },

    resize: function () {
      this.activeForm && this.activeForm.resize();
    },

    create: function (event) {
      event.preventDefault();
      this.reset();
      var data = this.list.dt.columns()[0].map(function () {
        return '<td></td>';
      });
      var $row = $('<tr>'+ data +'</tr>');
      this.$tbody.prepend($row);
      this.activeForm = this.createNewRowForm($row.get(0));
    },

    update: function () {
      clearTimeout(this.updateTimer);
      this.activeForm.update();
    },

    save: function () {
      this.activeForm.save();
    },

    remove: function () {
      this.activeForm.remove();
    },

    delete: function () {
      this.activeForm.delete();
    },

    cancel: function () {
      this.activeForm.cancel(true);
    },

    sortUp: function () {
      this.activeForm.sort(true);
    },

    sortDown: function () {
      this.activeForm.sort(false);
    },

    workflow: function (event) {
      event.preventDefault();
      this.activeForm.workflow($(event.currentTarget));
    },

    onTBodyMouseLeave: function (event) {
      if (this.activeForm && !this.activeForm.updating
        && !$(event.relatedTarget).closest('.inline-form-control').length) {
        this.reset();
      }
    },

    onControlMouseLeave: function (event) {
      if (this.activeForm && !this.activeForm.updating
        && !$(event.relatedTarget).closest(this.activeForm.row).length && !$(event.relatedTarget).hasClass('inline-form-control')) {
        this.reset();
      }
    },

    createNewRowForm: function (row) {
      return new NewRowForm(row, this);
    },

    createRowForm: function (row) {
      return new RowForm(row, this);
    },

    selectRow: function (event) {
      if (!this.activeForm || (!this.activeForm.updating && this.activeForm.row !== event.currentTarget)) {
        this.activeForm && this.activeForm.reset();
        this.activeForm = this.createRowForm(event.currentTarget);
      }
    },

    clickRow: function (event) {
      if (event.ctrlKey || !this.activeForm) {
        this.list.clickSelectable(event);
      } else if (!this.activeForm.updating && this.isEditable()) {
        this.updateTimer = setTimeout(function () {
          if (this.activeForm && !this.activeForm.updating) {
            this.activeForm.cancel();
            this.list.clickSelectable(event);
            this.list.update();
          }
        }.bind(this), 700);
      }
    },

    dblclickRow: function (event) {
      if (this.activeForm.updating) {
        this.cancel();
        this.selectRow(event);
      }
      this.update();
    },

    getEditCommand: function () {
      return this.list.$controls.find('.edit');
    },

    getRemoveCommand: function () {
      return this.list.$controls.find('.remove');
    },

    getDeleteCommand: function () {
      return this.list.$controls.find('.delete');
    },

    isEditable: function () {
      return this.isCommandEnabled(this.getEditCommand());
    },

    isEditEnabled: function (row) {
      return this.isEditable() && !this.readOnly;
    },

    checkEditEnabled: function (row) {
      return this.isEditEnabled() ? true : row.checkEditEnabled();
    },

    isRemoveEnabled: function () {
      return this.getRemoveCommand().length > 0;
    },

    isDeleteEnabled: function () {
      return this.isCommandEnabled(this.getDeleteCommand());
    },

    isSortEnabled: function () {
      return this.$sorting.length;
    },

    isCommandEnabled: function ($command) {
      return !!$command.data('id');
      //var options = $command.data('options');
      //return options && options.hasOwnProperty('id');
    },

    commandControlChange: function () {
      // WTF????
      // this.getEditCommand().hide();
      // this.getDeleteCommand().hide();
    },

    onDocumentKeyUp: function (event) {
      if (event.keyCode === 13 && event.ctrlKey) {
        if (this.activeForm && this.activeForm.updating) {
          event.stopImmediatePropagation();
          this.save();
        }
      }
    },

    onDocumentKeyDown: function (event) {
      if (event.keyCode === 27) {
        if (this.activeForm && this.activeForm.updating) {
          event.stopImmediatePropagation();
          this.activeForm.cancel();
        }
      }
    }
  });

  // ROW FORM

  function RowForm (row, owner) {
    this.row = row;
    this.owner = owner;
    this.dt = owner.list.dt;
    this.$controls = owner.$controls;
    this.$update = owner.$update;
    this.$save = owner.$save;
    this.$remove = owner.$remove;
    this.$delete = owner.$delete;
    this.$cancel = owner.$cancel;
    this.$workflow = owner.$workflow;
    this.$sorting = owner.$sorting;
    this.init();
  }

  $.extend(RowForm.prototype, {

    init: function () {
      var data = this.dt.row(this.row).data() || {};
      this.$row = $(this.row);
      this.id = data._id;
      this.url = this.owner.list.options.url.update +'/'+ encodeURIComponent(this.id);
      this.cells = [];

      this.$update.toggle(this.owner.checkEditEnabled(this));
      this.$remove.toggle(this.owner.isRemoveEnabled());
      this.$delete.toggle(this.owner.isDeleteEnabled());
      this.$sorting.toggle(this.owner.isSortEnabled());
      this.$row.addClass(SELECTED_CLASS);
      this.resize();
    },

    checkEditEnabled: function (cb) {
      var data = this.getRowData() || {};
      return !!(data.__permissions && data.__permissions.write);
    },

    getRowData: function () {
      return this.dt.rows(this.$row).data()[0];
    },

    reset: function () {
      this.destroyed = true;
      this.$row.removeClass(SELECTED_CLASS);
      this.cancel();
    },

    abort: function () {
      if (this.xhr) {
        this.xhr.abort();
        this.xhr = null;
        this.removeLoader();
      }
    },

    update: function () {
      this.$row.addClass(UPDATING_CLASS);
      this.updating = true;
      this.$update.hide();
      this.$delete.hide();
      this.$remove.hide();
      this.createLoader();
      this.xhr = $.get(this.url).always(function () {
        this.xhr = null;
        this.removeLoader();
      }.bind(this)).done(function (data) {
        if (!this.parse(data)) {
          return this.cancel();
        }
        this.$save.show();
        this.$cancel.show();
        this.$remove.toggle(this.owner.isRemoveEnabled());
        this.$delete.toggle(this.owner.isDeleteEnabled());
        setTimeout(function () {
          this.resize();
        }.bind(this), 0);
        this.loadWorkflow();
      }.bind(this));
    },

    remove: function () {
      var data = this.dt.row(this.row).data() || {},
        message = 'Убрать объект из коллекции?',
        _list = this.owner.list,
        _this = this;
      if (data.__class && data._id && confirm(message)) {
        if (_list.options.url && _list.options.url.remove) {
          $.post(_list.options.url.remove, {
            items: [{
              'class': data.__class,
              'id': data._id
            }]
          }).done(function(){
              _this.dt.rows(_this.$row).remove();
              _this.dt.draw();
            })
            .fail(function (xhr) {
              messageCallout.error(xhr.$message || 'Ошибка при извлечении объектов');
              console.error(xhr);
            })
            .fail(processAjaxError);
        } else {
          _this.dt.rows(_this.$row).remove();
          _this.dt.draw();
        }
      }
    },

    delete: function () {
      this.owner.list.del('Удалить объект?', this.owner.list.toDelete('.'+ SELECTED_CLASS));
    },

    cancel: function (resize) {
      this.abort();
      this.resetCells(resize);
      this.updating = false;
      this.$row.removeClass(UPDATING_CLASS);
      this.$update.show();
      this.$save.hide();
      this.$cancel.hide();
      this.$workflow.hide();
      this.resize();
    },

    sort: function(up) {
      this.owner.list.reorder(up, this.$row.get(0));
    },

    parse: function (data) {
      this.$data = $(data);
      if (!this.isSaveBtn(this.$data)) {
        console.log('Not found SAVE control');
        return false;
      }
      this.$formData = this.$data.find('.object-manager');
      this.formOptions = this.$formData.data('options');
      this.dependency = new Dependency(this);
      this.dependency.resolve();
      this.createCells();
      return true;
    },

    isSaveBtn: function ($data) {
      return $data.find('.object-control.SAVE').length > 0;
    },

    loadWorkflow: function () {
      this.xhr = $.get(this.formOptions.url.workflowState).always(function () {
        this.xhr = null;
      }.bind(this)).done(function (data) {
        var items = this.extractWorkflowItems(data.stages);
        this.parseWorkflow(items);
      }.bind(this));
    },

    extractWorkflowItems: function (data) {
      var items = [];
      for (var cls in data) {
        if (data.hasOwnProperty(cls)) {
          for (var key in data[cls].next) {
            if (data[cls].next.hasOwnProperty(key)) {
              items.push({
                cls: cls,
                key: key,
                data: data[cls].next[key]
              });
            }
          }
        }
      }
      return items;
    },

    needSigner: function (items) {
      for (var i = 0; i < items.length; ++i) {
        if (this.needItemSigner(items[i])) {
          return true;
        }
      }
    },

    needItemSigner: function (item) {
      return item.data.signBefore === 'true' || item.data.signAfter === 'true';
    },

    parseWorkflow: function (items) {
      var content = this.createWorkflow(items);
      if (content) {
        this.$workflow.html(content).show();
        this.resize();
      }
    },

    createWorkflow: function (items) {
      var result = '', i;
      if (items.length > 2) {
        for (i = 0; i < 1; ++i) {
          result += this.createWorkflowButton(items[i]);
        }
        result += '<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown">'
          + 'Бизнес-процесс <span class="caret"></span></button><ul class="dropdown-menu pull-right">';
        for (i = 1; i < items.length; ++i) {
          result += this.createWorkflowMenu(items[i]);
        }
        result += '</ul></div>';
      } else {
        for (i = 0; i < items.length; ++i) {
          result += this.createWorkflowButton(items[i]);
        }
      }
      return result ? '<div class="btn-group">'+ result + '</div>' : '';
    },

    createWorkflowButton: function (d) {
      var signer = this.needItemSigner(d) ? ' need-signer' : '';
      return '<button type="button" '+ this.createWorkflowParams(d)
        + 'class="btn command btn-default object-control' + signer +'">' + d.data.caption + '</button>';
    },

    createWorkflowMenu: function (d) {
      var signer = this.needItemSigner(d) ? ' need-signer' : '';
      return '<li><a href="#" '+ this.createWorkflowParams(d)
        + 'class="command object-control'+ signer +'">' + d.data.caption + '</a></li>';
    },

    createWorkflowParams: function (d) {
      return 'data-id="'+ d.cls +'.'+ d.key +'" '
        + 'data-key="' + d.key + '" '
        + 'data-sign-before="' + d.data.signBefore + '" '
        + 'data-sign-after="' + d.data.signAfter + '" '
        + (d.data.confirmMessage || d.data.confirm
          ? 'data-confirm-message="' + (d.data.confirmMessage ? d.data.confirmMessage : 'Вы уверены?') + '" '
          : '');
    },

    createCells: function () {
      this.cells = [];
      var $cells = this.$row.children();
      var columns = this.owner.list.options.dt.columns;
      for (var i = 0; i < columns.length; ++i) {
        var $data = this.$formData.find('[name="'+ columns[i].name +'"]').closest('.form-group');
        var cell = InlineFormCell.create($data.data('type'), $cells.eq(i), $data, this);
        if (cell) {
          this.cells.push(cell);
        }
      }
    },

    resetCells: function (resize) {
      for (var i = 0; i < this.cells.length; ++i) {
        this.cells[i].reset();
      }
      if (resize) {
        $(window).resize();
      }
    },

    workflow: function ($cmd) {
      if (this.validate() ) {
        if (!$cmd.data('confirmMessage') || condirm($cmd.data('confirmMessage'))) {
          if (!$cmd.hasClass('need-signer')) {
            this.execute($cmd.data('id'));
          }
        }
      }
    },

    save: function () {
      if (this.validate()) {
        this.execute('SAVE');
      }
    },

    execute: function (action) {
      this.$save.hide();
      this.$cancel.hide();
      this.$workflow.hide();
      this.createLoader();
      var data = this.getValues();
      data.$action = action;
      this.xhr = $.post(this.getSaveUrl(), data).always(function () {
        this.removeLoader();
      }.bind(this)).done(this.afterExecute.bind(this));
    },

    afterExecute: function () {
      this.owner.list.reload();
    },

    getSaveUrl: function () {
      var url = (this.formOptions.node ? this.formOptions.node +'/' : '')
        + this.formOptions.itemClass
        + (this.formOptions.id ? '/'+ encodeURIComponent(this.formOptions.id) : '');
      return 'registry/api/'+ url + '/do';
    },

    getMasterData: function (backRef) {
      return {
        masterId: this.formOptions.id,
        masterClass: this.formOptions.itemClass,
        masterBackRef: backRef
      };
    },

    getValues: function () {
      var values = {};
      for (var i = 0; i < this.cells.length; ++i) {
        var cell = this.cells[i];
        if (cell.isChanged()) {
          values[cell.getName()] = cell.getValue();
        }
      }
      if (!this.formOptions.id) {
        this.setMasterValues(values);
        this.setDefaultValues(values);
      }
      return values;
    },

    setMasterValues: function (values) {
      var master = this.formOptions.master;
      if (master) {
        if (master.backRef && values[master.backRef] === undefined) {
          values[master.backRef] = master.id;
        }
        values.$master = master.updates;
        if (master.masterProperty) {
          values.$masterClass = master.class;
          values.$masterId = master.id;
          values.$masterProperty = master.masterProperty;
        }
      }
    },

    setDefaultValues: function (values) {
      this.$data.find('.attr-value').each(function () {
        var $value = $(this);
        var value = $value.val();
        var name = $value.attr('name');
        if ($value.is('[type="checkbox"]')) {
          value = $value.is(':checked') || null;
        }
        if (values[name] === undefined && value !== undefined && value !== null && value !== '') {
          try {
            value = JSON.parse(value);
          } catch (err) {}
          values[name] = value;
        }
      });
    },

    validate: function () {
      for (var i = 0; i < this.cells.length; ++i) {
        this.cells[i].validate();
      }
      return !this.hasError();
    },

    hasError: function () {
      for (var i = 0; i < this.cells.length; ++i) {
        if (this.cells[i].hasError()) {
          return true;
        }
      }
      return false;
    },

    resize: function () {
      this.$controls.offset({
        left: 0,
        top: 0
      });
      var offset = this.$row.offset();
      var left = offset.left - 29;
      this.$update.offset({
        left: left,
        top: offset.top
      });
      this.$save.offset({
        left: left,
        top: offset.top
      });
      this.$cancel.offset({
        left: left,
        top: offset.top + 26
      });
      left = offset.left + this.owner.$wrapper.width() - 2;
      this.$sorting.filter('.sorting-up').offset({
        left: left,
        top: offset.top
      });
      this.$sorting.filter('.sorting-down').offset({
        left: left ,
        top: offset.top + 26
      });
      this.$remove.offset({
        left: left + (this.owner.isSortEnabled() ? 26 : 0),
        top: offset.top
      });
      this.$delete.offset({
        left: left + (this.owner.isSortEnabled() ? 26 : 0),
        top: offset.top + (this.owner.isRemoveEnabled() ? 26 : 0)
      });
      this.$workflow.offset({
        left: left - this.$workflow.outerWidth(),
        top: offset.top - 36
      });
      this.resizeLoader();
    },

    createLoader: function () {
      this.removeLoader();
      this.$loader = $('<div class="inline-form-loader"><div><span class="fa fa-refresh fa-spin"></span></div></div>');
      this.$loader.appendTo(document.body);
      this.resizeLoader();
    },

    removeLoader: function () {
      if (this.$loader) {
        this.$loader.remove();
      }
    },

    resizeLoader: function () {
      if (this.$loader) {
        this.$loader.offset(this.$row.offset());
        this.$loader.width(this.$row.width());
        this.$loader.height(this.$row.height());
      }
    },

    setInputToHtml: function () {
      for (var i = 0; i < this.cells.length; ++i) {
        var cell = this.cells[i];
        if (cell.isChanged()) {
          cell.setInputToHtml();
        }
      }
    }
  });

  // NEW ROW FORM

  function NewRowForm () {
    RowForm.apply(this, arguments);
  }

  $.extend(NewRowForm.prototype, RowForm.prototype, {

    init: function () {
      this.$row = $(this.row);
      this.url = this.getCreateUrl();
      this.cells = [];
      this.$row.addClass(SELECTED_CLASS);
      this.resize();
      this.create();
    },

    getCreateUrl: function () {
      var url = this.owner.list.options.url.create;
      var cls = this.owner.list.options.options && this.owner.list.options.options.inplaceInsertionClass;
      if (cls) {
        url = url.split('/').slice(0, -1).join('/') +'/'+ cls;
      }
      return url;
    },

    create: function () {
      this.$row.addClass(UPDATING_CLASS);
      this.updating = true;
      this.$update.hide();
      this.$delete.hide();
      this.$remove.hide();
      this.createLoader();
      this.xhr = $.get(this.url).always(function () {
        this.xhr = null;
        this.removeLoader();
      }.bind(this)).done(function (data) {
        if (!this.parse(data)) {
          return this.cancel();
        }
        this.$save.show();
        this.$cancel.show();
        setTimeout(function () {
          this.resize();
        }.bind(this), 0);
      }.bind(this));
    },

    cancel: function () {
      this.abort();
      this.resetCells();
      this.updating = false;
      this.$row.remove();
      this.$save.hide();
      this.$cancel.hide();
      this.resize();
    },

    save: function () {
      if (this.validate()) {
        this.execute('CREATE');
      }
    }
  });

  ////////////
  // ATTR FORM
  ////////////

  function AttrForm () {
    Form.apply(this, arguments);
    this.readOnly = this.list.objectManager.isReadOnly();
  }

  $.extend(AttrForm.prototype, Form.prototype, {

    createNewRowForm: function (row) {
      return new NewAttrRowForm(row, this);
    },

    createRowForm: function (row) {
      return new AttrRowForm(row, this);
    },

    getAttrName: function () {
      return this.list.prop.property;
    },

    isDisabled: function () {
      return this.list.$group.hasClass('disabled');
    },

    isReadOnly: function () {
      return this.list.prop.readonly;
    },

    isRemoveEnabled: function () {
      return Form.prototype.isRemoveEnabled.apply(this, arguments) && !this.isDisabled() && !this.isReadOnly();
    },

    isDeleteEnabled: function () {
      return Form.prototype.isDeleteEnabled.apply(this, arguments) && !this.isDisabled() && !this.isReadOnly();
    },

    isSortEnabled: function () {
      return Form.prototype.isSortEnabled.apply(this, arguments) && !this.isDisabled() && !this.isReadOnly();
    }
  });

  // ATTR ROW FORM

  function AttrRowForm () {
    RowForm.apply(this, arguments);
  }

  $.extend(AttrRowForm.prototype, RowForm.prototype, {

    afterExecute: function () {
      $.get(location).done(function (data) {
        var $attr = $(data).find('[data-attr="'+ this.owner.getAttrName() +'"]');
        var options = $attr.find('.table').data('options');
        data = options.dt.data;
        if (data) { // preloaded table data
          this.setCellData(data[this.$row.index()]);
        } else { // ajax loaded table data
          $.post(options.url.list).done(function (data) {
            this.setCellData(data.data[this.$row.index()]);
          }.bind(this));
        }
      }.bind(this));
    },

    setCellData: function (data) {
      this.cancel();
      this.dt.row('.'+ SELECTED_CLASS).data(data).draw();
      this.setCellHtml();
    },

    setCellHtml: function () {
      for (var i = 0; i < this.cells.length; ++i) {
        this.cells[i].setCellHtml();
      }
    },
  });

  // NEW ATTR ROW FORM

  function NewAttrRowForm () {
    AttrRowForm.apply(this, arguments);
  }

  $.extend(NewAttrRowForm.prototype, AttrRowForm.prototype, {

    init: function () {
      this.$row = $(this.row);
      this.url = this.getCreateUrl();
      this.cells = [];
      this.$row.addClass(SELECTED_CLASS);
      this.resize();
      this.create();
    },

    getCreateUrl: function () {
      var url = this.owner.list.getCreateUrl();
      var cls = this.owner.list.options.options && this.owner.list.options.options.inplaceInsertionClass;
      if (cls) {
        var parts = url.split('?');
        url = parts[0].split('/').slice(0, -1).join('/') +'/'+ cls +'?'+ parts[1];
      }
      return url;
    },

    create: function () {
      this.$row.addClass(UPDATING_CLASS);
      this.updating = true;
      this.$update.hide();
      this.$delete.hide();
      this.$remove.hide();
      this.createLoader();
      this.xhr = $.get(this.url).always(function () {
        this.xhr = null;
        this.removeLoader();
      }.bind(this)).done(function (data) {
        if (!this.parse(data)) {
          return this.cancel();
        }
        this.$save.show();
        this.$cancel.show();
        setTimeout(function () {
          this.resize();
        }.bind(this), 0);
      }.bind(this));
    },

    cancel: function () {
      this.abort();
      this.resetCells();
      this.updating = false;
      this.$row.remove();
      this.$save.hide();
      this.$cancel.hide();
      this.resize();
    },

    save: function () {
      if (this.validate()) {
        this.execute('SAVE');
      }
    },

    afterExecute: function (obj) {
      var data = this.owner.list.options.dt.data;
      if (data instanceof Array) {
        obj.__inserted = true;
        data.unshift(obj);
        this.dt.clear().rows.add(data);
        this.dt.rows().every(function () {
          if (this.data().__inserted) {
            $(this.node()).addClass('inserted');
          }
        }).draw();
        this.owner.$create.click();
      } else {
        this.owner.list.reload();
      }
    }
  });

  // DEPENDENCY

  function Dependency (row) {
    this.row = row;
    this.$form = row.$formData;
    this.init();
  }

  $.extend(Dependency.prototype, {

    init: function () {
      this.deps = [];
      this.$form.find('.form-group').each(this.initAttr.bind(this));
    },

    initAttr: function (index, element) {
      var $attr = $(element);
      var prop = $attr.data('prop');
      if (prop && prop.enablement) {
        this.deps.push({
          $attr: $attr,
          enablement: commonHelper.prepareDepCondition(prop.enablement)
        });
      }
    },

    resolve: function () {
      for (var i = 0; i < this.deps.length; ++i) {
        var dep = this.deps[i];
        dep.enablement && this.toggleEnablement(dep.$attr, this.resolveCondition(dep.enablement));
      }
    },

    resolveCondition: function (condition) {
      try {
        return eval(condition);
      } catch (err) {
        console.error(err);
      }
      return false;
    },

    toggleEnablement: function ($attr, state) {
      $attr.toggleClass('disabled', !state);
      var $value = $attr.find('.attr-value');
      $value.attr('disabled', !state);
      switch ($attr.data('type')) {
        case 'checkbox':
          $attr.find('.form-control').attr('disabled', !state);
          break;
      }
    }
  });

})();
