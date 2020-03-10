'use strict';

(function () {

  var CELL_CLASS = 'inline-form-cell';

  window.InlineFormCell = Cell;

  Cell.create = function (type, $cell, $data, owner) {
    var Class;
    switch (type) {
      case 'checkbox': Class = CheckboxCell; break;
      case 'combo': Class = ComboRefCell; break;
      case 'date': Class = DateCell; break;
      case 'input': Class = StringCell; break;
      case 'number': Class = NumberCell; break;
      case 'reference': Class = RefCell; break;
      case 'select': Class = SelectCell; break;
      case 'text': Class = TextCell; break;
      default: return null;
    }
    return new Class($cell, $data, owner);
  };

  function Cell ($cell, $data, owner) {
    this.owner = owner;
    this.$cell = $cell;
    this.$data = $data;
    this.formOptions = owner.formOptions;
    this.prop = $data.data('prop');
    this.init();
  }

  $.extend(Cell.prototype, {

    init: function () {
      this.setCellHtml();
      this.initValue();
      this.initMask(this.$value.data('mask'));
      this.$cell.addClass(CELL_CLASS);
      this.$cell.toggleClass('disabled', this.isDisabled());
      this.$value.change(this.onChangeValue.bind(this));
      this.$cell.mouseenter(this.onMouseEnter.bind(this));
      this.$cell.mouseleave(this.onMouseLeave.bind(this));
    },

    initValue: function () {
      this.$value = this.$data.find('.attr-value');
      this.sourceValue = this.getValue();
      this.addContent(this.$value);
    },

    setCellHtml: function () {
      this.cellHtml = this.$cell.html();
    },

    setInputToHtml: function () {
      this.$cell.html(this.getValue());
    },

    isDisabled: function () {
      return this.$data.hasClass('disabled');
    },

    getName: function () {
      return this.prop.property;
    },

    getValue: function () {
      return this.$value.val();
    },

    isChanged: function () {
      return this.sourceValue !== this.getValue();
    },

    reset: function () {
      this.clearError();
      this.$cell.removeClass(CELL_CLASS);
      this.$cell.html(this.cellHtml);
    },

    addContent: function (content) {
      this.$content = $('<div class="inline-form-cell-content"></div>');
      this.$content.append(content);
      this.$cell.empty().append(this.$content).append('<div class="error-block"></div>');
    },

    onChangeValue: function (event) {
      // this.validate();
    },

    onMouseEnter: function () {
      this.$cell.addClass('hover');
    },

    onMouseLeave: function () {
      this.$cell.removeClass('hover');
    },

    validate: function () {
      this.clearError();
      this.validateRequired();
    },

    validateRequired: function () {
      if (!this.prop.required || !this.isEmptyValue()) {
        return true;
      }
      this.addError(__('js.inlineFormCell.required'));
    },

    isEmptyValue: function () {
      var value = this.getValue();
      return value === '' || value === null || value === undefined;
    },

    addError: function (message) {
      this.$cell.addClass('has-error').find('.error-block').html(message);
    },

    clearError: function () {
      this.$cell.removeClass('has-error');
    },

    hasError: function () {
      return this.$cell.hasClass('has-error');
    },

    initMask: function (mask) {
      if (!mask) {
        return false;
      }
      var value = this.$value.val();
      if (value.length && !Inputmask.isValid(value, mask)) {
        this.addError(__('js.inlineFormCell.notValidMask'));
        this.$value.one('focus', function (event) {
          this.clearError($input);
          this.setMask(mask);
        }.bind(this));
      } else {
        this.setMask(mask);
      }
    },

    setMask: function (mask) {
      mask = typeof mask === 'object' ? mask : mask.toString();
      this.$value.inputmask(mask, {
        clearIncomplete: true
      });
    }
  });

  // CHECKBOX

  function CheckboxCell () {
    Cell.apply(this, arguments);
  }

  $.extend(CheckboxCell.prototype, Cell.prototype, {

    addContent: function (content) {
      Cell.prototype.addContent.call(this, content);
      var control = this.$data.find('.form-control');
      this.$content.append(control);
      control.iCheck({
        checkboxClass: 'icheckbox_flat',
        radioClass: 'iradio_flat',
        indeterminateClass: 'indeterminate-checkbox'
      }).on('ifToggled', function(event){
        var val = this.checked;
        if ($(this).attr('nullable') === 'true' && this.checked && content.val() !== 'null') {
            $(this).iCheck('indeterminate');
            val = 'null';
        }
        content.val(val).change();
      });
    },

    getValue: function () {
      return this.$value.val();
    }
  });

  // DATE

  function DateCell () {
    Cell.apply(this, arguments);
  }

  $.extend(DateCell.prototype, Cell.prototype, {

    init: function () {
      Cell.prototype.init.call(this);
      var value = moment(this.getValue()).format(this.formOptions.locale.dateFormat);
      this.sourceValue = value;
      this.$value.val(value);
      this.$value.datetimepicker({
        locale: this.formOptions.locale.lang,
        format: this.formOptions.locale.dateFormat,
        widgetParent: $('.inline-form-relative'),
        widgetPositioning: {
          horizontal: 'left',
          vertical: 'bottom'
        }
      }).on('dp.show', this.placePicker.bind(this));
    },

    placePicker: function (event) {
      var offset = this.$value.offset();
      var $item = $('.inline-form-relative').children('.bootstrap-datetimepicker-widget');
      $item.offset({
        left: offset.left,
        top: offset.top + 32
      });
    }
  });

  // REFERENCE

  function RefCell () {
    Cell.apply(this, arguments);
  }

  $.extend(RefCell.prototype, Cell.prototype, {

    init: function () {
      Cell.prototype.init.call(this);
      this.options = this.$data.data('options');
      this.$displayValue = this.$content.find('.display-value');
      this.$tools = this.$content.find('.list-tools');
      this.$btns = this.$tools.children();
      this.$tools.append(this.$btns.get().reverse());
      this.$select = this.$btns.filter('.select-btn').click(this.select.bind(this));
      this.$create = this.$btns.filter('.create-btn').click(this.create.bind(this));
      this.$update = this.$btns.filter('.edit-btn').click(this.update.bind(this));
      this.$remove = this.$btns.filter('.remove-btn').click(this.remove.bind(this));
      this.toggleTools();
    },

    initValue: function () {
      this.$value = this.$data.find('.attr-value');
      this.sourceValue = this.getValue();
      this.addContent(this.$data.find('.form-control-box'));
    },

    getRequestParams: function () {
      var params = this.owner.getMasterData(this.options.backRef);
      if (this.options.selConditions) {
        params.filter = this.options.selConditions;
      }
      return $.param(params);
    },

    onChangeValue: function () {
      Cell.prototype.onChangeValue.call(this);
      this.toggleTools();
    },

    select: function () {
      imodal.off('beforeClose');
      imodal.load(this.options.selectUrl +'?'+ this.getRequestParams());
      imodal.on('beforeClose', this.complete.bind(this));
    },

    create: function () {
      imodal.off('beforeClose');
      imodal.load(this.options.createUrl +'?'+ this.getRequestParams());
      imodal.on('beforeClose', this.complete.bind(this));
    },

    update: function () {
      var params = {};
      if (this.options.globalReadonly) {
        params.readonly = 'on';
      }
      if (params.condensedView) {
        params.condensed = 'on';
      }
      imodal.off('beforeClose');
      imodal.load(this.options.updateUrl +'/'+ this.getValue() +'?'+ $.param(params));
      imodal.on('beforeClose', this.complete.bind(this));
    },

    remove: function () {
      if (confirm(__('js.inlineFormCell.deleteFromRef'))) {
        this.$displayValue.html('');
        this.$value.val('').change();
      }
    },

    complete: function () {
      imodal.off('beforeClose');
      this.assignResult(imodal.getParams('result'));
    },

    assignResult: function (result) {
      if (result && result[0]) {
        result = result[0];
      }
      if (result) {
        this.$displayValue.text(result.__string);
        this.$value.val(result._id).change();
      }
    },

    toggleTools: function () {
      var empty = this.isEmptyValue();
      this.$update.toggle(!empty);
      this.$remove.toggle(!empty);
    }
  });

  // COMBO REFERENCE

  function ComboRefCell () {
    Cell.apply(this, arguments);
  }

  $.extend(ComboRefCell.prototype, RefCell.prototype, {

    init: function () {
      RefCell.prototype.init.call(this);
      this.$value.select2({
        ajax: {
          type: 'POST',
          dataType: 'json',
          url: this.options._url,
          delay: 250,
          data: this.prepareParams.bind(this),
          processResults: this.processResult.bind(this)
        },
        width: '100%'
      });
    },

    prepareParams: function (params) {
      return {
        search: {
          value: params.term
        },
        filter: this.options._filter,
        sorting: this.options._sorting,
        start: ((params.page || 1) - 1) * this.options._length,
        length: this.options._length,
        itemId: this.options._itemId,
        itemClass: this.options._itemClass
      };
    },

    processResult: function (data, params) {
      var res = [];
      for(var i = 0; i < data.data.length; ++i) {
        res.push({
          id: data.data[i]._id,
          text: data.data[i].__string,
          object: data.data[i]
        });
      }
      params.page = params.page || 1;
      return {
        results: res,
        pagination: {
          more: (params.page * this.options._length) < data.recordsTotal
        }
      };
    },

    assignResult: function (result) {
      if (Array.isArray(result)) {
        result = result[0];
      }
      if (result) {
        this.$value.html('<option value="'+ result._id +'">'+ result.__string +'</option>');
        this.$value.val(result._id).change();
      }
    }
  });

  // SELECT

  function SelectCell () {
    Cell.apply(this, arguments);
  }

  $.extend(SelectCell.prototype, Cell.prototype, {

  });

  // STRING

  function StringCell () {
    Cell.apply(this, arguments);
  }

  $.extend(StringCell.prototype, Cell.prototype, {
  });

  // NUMBER

  function NumberCell () {
    Cell.apply(this, arguments);
  }

  $.extend(NumberCell.prototype, Cell.prototype, {
  });

  // TEXT

  function TextCell () {
    Cell.apply(this, arguments);
  }

  $.extend(TextCell.prototype, Cell.prototype, {

    init: function () {
      Cell.prototype.init.call(this);
      setTimeout(this.initHeight.bind(this), 0);
    },

    initHeight: function () {
      var h = this.$value.get(0).scrollHeight;
      h = h > 100 ? 100 : h;
      this.$value.height(h);
    }
  });

})();
