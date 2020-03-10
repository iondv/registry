'use strict';

(function () {

  function filterSelection(filters, $container, selection) {
    $container.empty();
    $('<option/>').text(__('js.filter.select')).val(null).appendTo($container);
    if (filters) {
      for (var filterId in filters) {
        if (filters.hasOwnProperty(filterId)) {
          $('<option/>').val(filterId).text(filters[filterId].name).appendTo($container);
        }
      }
    }
    if (selection) {
      $container.val(selection);
    }
  }

  function quotedCaption(attr) {
    var captionParts = attr.caption.split('.');
    captionParts = $.map(captionParts, function(caption) {
      return '[' + caption + ']';
    });
    return captionParts.join('.');
  }

  function initQueryComplete($queryContainer, attrs) {
    if (!attrs || !attrs.length) {
      return;
    }
    var i, li,
    $input = $queryContainer.find('.filter-query'),
    $dropdown = $queryContainer.find('.dropdown-menu'),
    $helper = $queryContainer.find('.helper-addon'),
    $helperModal = $('#helper-modal');
    $helper.on('click', function(){
      $helperModal.modal('toggle');
    });
    for (i = 0; i < attrs.length; i++) {
      li = '<li><a href="#" data-attr="' + quotedCaption(attrs[i]) + '">' + attrs[i].caption + '</a></li>';
      $dropdown.append(li);
    }
    $dropdown.find('a').on('click', function( event ){
      event.preventDefault();
      var caret = $input[0].selectionStart;
      var inputVal = $input.val();
      var insertVal = $(this).data('attr');
      $input.val(inputVal .substring(0, caret) + insertVal  + inputVal.substring(caret) );
    });
  }

  window.ListFilter = function (manager) {
    this.manager = manager;
    this.filters = {};
    this.currentFilter = null;
    this.assignedFilter = null;

    this.$container = manager.$container;
    this.$filter = this.$container.find('.list-filter');
    this.$modal = this.$filter.closest('.modal');
    this.$condList = this.$filter.find('.filter-condition-list');
    this.$filterQuery = this.$filter.find('.filter-query');
    this.$filterEditor = $('#filter-editor');
    this.$toggle = $('#header').find('.filter');
    this.condCounter = 0;

    if (this.$filter.length) {
      this.$tools = this.$filter.find('.filter-tools');
      this.options = this.$filter.data('options');
      this.$filters = this.$tools.find('.select-filter');
      this.$reset = this.$tools.find('.reset-filter');
      this.$global = this.$filter.find('.filter-global-checkbox');
      this.$name = this.$filter.find('.filter-name');
      this.$save = this.$filter.find('.save-filter');
      this.$loader = this.$filter.find('.filter-loader');

      this.$toggle.click(this.toggle.bind(this));
      this.$filters.change(this.select.bind(this));
      this.$tools.find('.create-filter').click(this.create.bind(this));
      this.$reset.click(this.reset.bind(this));
      this.$save.click(this.save.bind(this));

      this.$filter.find('.assign-filter').click(this.assign.bind(this));
      this.$filter.find('.remove-filter').click(this.remove.bind(this));
      this.$filter.on('keyup', '.select-value', function (event) {
        if (event.keyCode === 13) {
          this.assign();
        }
      }.bind(this));
      this.headerFilter = new HeaderFilter(this);
      this.init();
    }
  };

  ListFilter.prototype = {
    constructor: ListFilter,

    init: function () {
      $.post(this.options.url.list).done(function (data) {
        if (data) {
          this.filters = data.filters;
          filterSelection(data.filters, this.$filters);
          this.headerFilter.init();
        }
      }.bind(this)).fail(function () {});
      initQueryComplete($('.query-container'), this.options.attrs);
    },

    isFilterEmpty: function () {
      return !this.$filterQuery.val();
    },

    getAttrOptions: function (name) {
      for (var i = 0; i < this.options.attrs.length; ++i) {
        if (this.options.attrs[i].name === name) {
          return this.options.attrs[i];
        }
      }
      return null;
    },

    selectQuery: function (filterId) {
      if (filterId && this.filters[filterId]) {
        this.$filterQuery.val(this.filters[filterId].query);
      }
    },

    createCondition: function ($container, attrs, selection, options) {
      this.condCounter += 1;
      var $row = $('<div/>').addClass('filter-condition row').appendTo($container);
      var $selectAttrContainer = $('<div/>').addClass('col-md-4').appendTo($row);
      var $selectAttr = $('<select/>').addClass('select-column form-control').attr({
        name: 'row-' + this.condCounter + '-property'
      }).appendTo($selectAttrContainer);
      $('<option/>').text(__('js.filter.select')).val(null).appendTo($selectAttr);
      if (attrs && attrs.length) {
        for (var i = 0; i < attrs.length; ++i) {
          $('<option/>').val(attrs[i].name).attr({
            'data-attr': JSON.stringify(attrs[i])
          }).text(attrs[i].caption).appendTo($selectAttr);
        }
      }
      var $selectOperContainer = $('<div/>').addClass('col-md-4').appendTo($row);
      var $selectOper = $('<select/>').addClass('date select-operation form-control').attr({
        name: 'row-' + this.condCounter + '-operation'
      }).appendTo($selectOperContainer);
      $selectOper.hide();

      var $inputsContainer = $('<div/>').addClass('col-md-3').appendTo($row);
      var $removeContainer = $('<div/>').addClass('col-md-1').appendTo($row);
      var $remove = $('<span/>').addClass('remove-condition glyphicon glyphicon-remove text-danger').appendTo($removeContainer);

      $selectAttr.change(function () {
        var $sel = $selectAttr.find(':selected');
        if ($sel.val()) {
          var attr = $sel.data('attr');
          var selType = getSelType(attr.type);
          $selectOper.empty();
          for (var i = 0; i < operations[selType].length; ++i) {
            $('<option/>').val(operations[selType][i].value).text(operations[selType][i].text).appendTo($selectOper);
          }
          $selectOper.show();
          $inputsContainer.empty();
          createInput(attr, this.condCounter, $inputsContainer, options);
        }
      }.bind(this));

      $remove.click(function () {
        $row.remove();
      });
      if (selection) {
        $selectAttr.val(selection.property);
        var selType = getSelType($selectAttr.find('option[value="' + selection.property + '"]').data('attr').type);
        for (var i = 0; i < operations[selType].length; i++) {
          $('<option/>').val(operations[selType][i].value).text(operations[selType][i].text).appendTo($selectOper);
        }
        $selectOper.val(selection.operation);
        $selectOper.show();
        var input = createInput(selType, this.condCounter, $inputsContainer, options);
        input.val(selection.value);
      }
      $selectAttr.select2({
        width: '100%',
        templateResult: function (node) {
          return node.id
            ? $('<div style="padding-left:' + (node.id.split('.').length - 1) * 20 + 'px">' + node.text + '</div>')
            : node.text;
        }
      });
    },

    createConditions: function (filterId) {
      if (filterId && this.filters[filterId]) {
        for (var i = 0; i < this.filters[filterId].conditions.length; ++i) {
          this.createCondition(
            this.$condList,
            this.options.attrs,
            this.filters[filterId].conditions[i],
            this.options
          );
        }
      }
    },

    toggle: function () {
      if (this.$toggle.hasClass('active')) {
        return this.reset();
      }
      this.$modal.modal();
      if (this.isFilterEmpty()) {
        this.create();
      }
    },

    select: function () {
      var $option = this.$filters.find(':selected');
      if (!$option.val()) {
        return this.$reset.click();
      }
      this.$filterQuery.val('');
      this.selectQuery($option.val());
      this.$filterEditor.show();
      this.currentFilter = $option.val();
      if (this.filters[this.currentFilter]) {
        this.$name.val(this.filters[this.currentFilter].name);
        this.$global.prop('checked', !this.filters[this.currentFilter].className);
      }
    },

    create: function () {
      this.reset();
      this.$filterEditor.show();
    },

    reset: function (target) {
      if (target && $(target).data('select2')) {
        return;
      }
      this.currentFilter = null;
      this.assignedFilter = null;
      this.$filterQuery.val('');
      this.$filters.val('');
      this.$filterEditor.hide();
      this.$toggle.removeClass('active');
      this.manager.reload();
      this.headerFilter.reset();
    },

    assign: function () {
      this.assignedFilter = this.$filterQuery.val();
      this.$toggle.addClass('active');
      this.$modal.modal('hide');
      this.manager.reload();
    },

    remove: function () {
      if (this.currentFilter) {
        $.post(this.options.url.remove, {filterId: this.currentFilter}).done(function (data) {
          if (data && data.result) {
            this.$filters.find('option[value="' + this.currentFilter + '"]').remove();
            delete this.filters[this.currentFilter];
            this.reset();
          }
        }.bind(this)).fail(function () {
        });
      }
    },

    getCollectionType: function (property) {
      if (property.indexOf('.') > -1) {
        var parts = property.split('.');
        for (var i = 0; i < this.options.attrs.length; i++) {
          if (this.options.attrs[i].name === parts[0] && this.options.attrs[i].type === 14) {
            return this.options.attrs[i].name;
          }
        }
      }
      return false;
    },

    parseFilterForm: function () {
      var form = this.$filterEditor.serializeArray();
    },

    save: function () {
      var data = {
        query: this.$filterQuery.val(),
        name: this.$name.val(),
        global: this.$global.prop('checked')
      };
      var url = this.options.url.add;
      if (this.currentFilter) {
        url = this.options.url.edit;
        data.id = this.currentFilter;
      }
      $.post(url, data).done(function (data) {
        if (data && data.filter) {
          this.filters[data.filter.id] = data.filter;
          filterSelection(this.filters, this.$filters, data.filter.id);
        }
      }.bind(this)).fail(function () {
      });
    },

    getUserFilters: function () {
      return this.assignedFilter;
    },

    resetConditionByAttr: function (name) {
      var $row = this.getConditionByAttr(name);
      $row.find('.remove-condition').click();
      return $row;
    },

    selectConditionByAttr: function (name) {
      var $row = this.getConditionByAttr(name);
      if (!$row.length) {
        if (this.isFilterEmpty()) {
          this.createCondition(this.$condList, this.options.attrs, null, this.options);
          this.$filterEditor.show();
        }
        $row = this.getConditionByAttr('');
        if (!$row.length) {
          $row = this.getConditionByAttr('');
        }
        $row.find('.select-column').val(name).change();
      }
      return $row;
    },

    getConditionByAttr: function (name) {
      var $result = $([]);
      this.$condList.find('.select-column').each(function (index, element) {
        if ($(this).val() === name) {
          $result = $(this).closest('.filter-condition');
        }
      });
      return $result;
    },

    setConditionValueByAttr: function (value, name) {
      var $row = this.selectConditionByAttr(name);
      $row.find('.select-value').val(value);
    }
  };

  // HEADER FILTER

  function HeaderFilter (filter) {
    this.filter = filter;
    this.options = filter.options;
    this.list = filter.manager;
  }

  $.extend(HeaderFilter.prototype, {

    init: function () {
      this.dt = this.list.dt;
      this.$thead = $(this.dt.table().header());
      this.getCells().each(this.createHeader.bind(this));
      this.$thead.find('.dt-head-filter-toggle')
        .click(this.toggle.bind(this));
      this.$thead.find('.dt-head-filter-container')
        .click(this.stopPropagation.bind(this))
        .keypress(this.stopPropagation.bind(this))
        .keyup(this.keyup.bind(this))
        .on('change', this.update.bind(this));
      this.$thead.find('.select-value').iCheck({
        checkboxClass: 'icheckbox_flat',
        radioClass: 'iradio_flat'
      }).on('ifChanged', this.update.bind(this));
      this.$thead.find('.select-oper').on('change', function (e) {
        if (!$.trim($(this).nextAll('.select-value').val())) {
          e.stopPropagation();
        }
      });
      //this.filter.$modal.on('hidden.bs.modal', this.sync.bind(this));
    },

    createHeader: function (index, cell) {
      var _this = this,
        $cell = $(cell),
        options = this.getAttrOptions($cell),
        $input = this.createInput(options),
        selectionLength = _this.filter.options.selectionLength || 5;
      if ($input) {
        $cell.append('<span class="dt-head-filter-toggle glyphicon glyphicon-filter" title="' + __('js.filter.filter') + '"></span>');
        $cell.parent().addClass('dt-head-filter').append('<div class="dt-head-filter-container"></div>');
        $cell.parent().find('.dt-head-filter-container').append($input);
        $cell.parent().find('select.selection-filter').select2({
          width: '100%',
          dropdownAutoWidth : true
        });
        $cell.parent().find('select.selection-autocomplete').select2({
          width: '100%',
          dropdownAutoWidth : true,
          allowClear: true,
          placeholder: '...',
          ajax: {
            type: 'POST',
            dataType: 'json',
            data: function(params){
              return {
                search: {value: params.term},
                start: ((params.page || 1) - 1) * selectionLength,
                length: selectionLength
              };
            },
            url: this.filter.options.url.selection.replace(':propName', options.name),
            delay: 250,
            processResults: function(data, params) {
              var res = [];
              for(var i = 0; i < data.data.length; i++){
                res.push({id: data.data[i]._id, text: data.data[i].__string, object: data.data[i]});
              }
              params.page = params.page || 1;
              return {
                results: res,
                pagination: {
                  more: (params.page * selectionLength) < data.recordsTotal
                }
              };
            }
          }
        });
      }
    },

    createInput: function (params) {
      if (params) {
        var result = $();
        var type = getSelType(params.type);
        switch (type) {
          case DATE_TYPE:
          case NUMBER_TYPE:
          {
            var opers = {
              "=": __('js.filter.eq'),
              "&lt;": '&lt; ' + (type === DATE_TYPE ? __('js.filter.earlier') : __('js.filter.less')),
              "&gt;": '&gt; ' + (type === DATE_TYPE ? __('js.filter.later') : __('js.filter.more')),
              "&lt;=": '&#x2264 ' + (type === DATE_TYPE ? __('js.filter.earlier') : __('js.filter.less')) + __('js.filter.oreq'),
              "&gt;=": '&#x2265 ' + (type === DATE_TYPE ? __('js.filter.later') : __('js.filter.more')) + __('js.filter.oreq')
            };
            var content = '';
            for (var oper in opers) {
              if (opers.hasOwnProperty(oper)) {
                content += '<option value="' + oper + '">' + opers[oper] + '</option>';
              }
            }
            result = result.add($('<select class="form-control select-oper">' + content + '</select>'));
          }
            break;
          default:
            break;
        }

        switch (type) {
          case CHECKBOX_TYPE:
            result = result.add(this.createCheckboxInput(params));
            break;
          case DATE_TYPE:
            result = result.add(this.createDateInput(params));
            break;
          case REF_TYPE:
            result = result.add(this.createRefInput(params));
            break;
          default:
            result = result.add(params.selection
              ? this.createSelectionInput(params)
              : this.createTextInput(params));
            break;
        }
        return result;
      }
    },

    getColumn: function (name) {
      var columns = this.list.options.dt.columns;
      for (var i = 0; i < columns.length; i++) {
        if (columns[i].name === name) {
          return columns[i];
        }
      }
    },

    createDateInput: function (param, columns) {
      var self = this;
      var col = self.getColumn(param.name);
      var format = col.className === 'type_120' ? 
        self.filter.options.locale.dateFormat : 
        self.filter.options.locale.dateTimeFormat;
      var $div = $('<div class="dt-head-date-filter-input" style="position:relative"></div>');
      var $datepicker = $('<input type="text" class="form-control select-value">');
      var $cancel = $('<span>x</span>');
      $div.append($datepicker);
      $div.append($cancel);
      $datepicker.datetimepicker({
        locale: self.filter.options.locale.lang,
        format: format,
        useCurrent: false,
        widgetParent: self.list.$container
      }).on('dp.show', function (e) {
        var inp = $(this);
        var widget = $('.bootstrap-datetimepicker-widget', inp.data("DateTimePicker").widgetParent());
        var offset = inp.offset();
        offset.top = offset.top + inp.outerHeight() + 7;
        widget.offset(offset);
      }).on('dp.change', function (e) {
        self.update(e);
      });
      $cancel.on('click', function() {
        $datepicker.data("DateTimePicker").clear();
      });
      return $div;
    },

    createCheckboxInput: function () {
      return $('<input type="checkbox" class="form-control select-value">');
    },

    createSelectionInput: function (params) {
      var values = Object.keys(params.selection);
      var content = '<option value></option>';
      for (var i = 0; i < values.length; ++i) {
        content += '<option value="'+ values[i] +'">'+ params.selection[values[i]] +'</option>';
      }
      return $('<select class="form-control select-value selection-filter">'+ content +'</select>');
    },

    createTextInput: function () {
      return $('<input type="text" class="form-control select-value">');
    },

    createRefInput: function (params) {
      return $('<select class="form-control select-value selection-autocomplete"></select>');
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

    createRefSelectionInput: function () {
      return $('<select class="form-control select-value selection-autocomplete"></select>');
    },

    toggle: function (event) {
      event.stopPropagation();
      var options = this.getAttrOptions(event.target);
      var $filter = this.getFilterContainer(event.target);
      $filter.toggleClass('active');
      if (this.hasValue($filter)) {
        this.update();
      }
    },

    stopPropagation: function (event) {
      event.stopPropagation();
    },

    keyup: function (event) {
      event.stopPropagation();
      if (event.keyCode === 13) {
        this.update();
      }
    },

    sync: function () {
      this.getCells().each(function (index, element) {
        var $cell = $(element);
        var options = this.getAttrOptions(element);
        var $filter = this.getFilterContainer(element);
        var $row = this.filter.getConditionByAttr(options.name);
        this.createInput(element, $row, true);
        $filter.toggleClass('active', $row.length > 0);
      }.bind(this));
    },

    reset: function () {
      this.getFilterCells().removeClass('active');
    },

    update: function (e) {
      var query = [],
        target = e && e.target;
      this.getFilterCells().filter('.active').each(function (index, element) {
        var $cell = $(element).find('.dt-head-cell');
        var options = this.getAttrOptions($cell);
        var $input = this.getInput($cell);
        var result = this.getCondition(options.type, options.name, $input);
        if (result) {
          query.push(result);
        }
      }.bind(this));
      this.filter.$filterQuery.val('('+ query.join(') AND (') +')');
      query.length ? this.filter.assign() : this.filter.reset(target);
    },

    getCondition: function (type, name, $input) {
      var method;
      switch (getSelType(type)) {
        case STRING_TYPE:
          method = $input.is('select')
            ? this.getSelectionCondition
            : this.getTextCondition;
          break;
        case CHECKBOX_TYPE:
          method = this.getCheckboxCondition;
          break;
        case DATE_TYPE:
          method = this.getDateCondition;
          break;
        case NUMBER_TYPE:
          method = this.getNumberCondition;
          break;
        case REF_TYPE:
          method = this.getRefCondition;
          break;
        default:
          return null;
      }
      return method.call(this, name, $input);
    },

    getCheckboxCondition: function (name, $input) {
      return name + ' = '+ ($input.is(':checked'));
    },

    getDateCondition: function (name, $input) {
      var opts = this.filter.getAttrOptions(name);
      var value = $.trim($($input.get(1)).val());
      if (!value) {
        return null;
      }
      var col = this.getColumn(name);
      var format = col.className === 'type_120' ? 
        this.filter.options.locale.dateFormat : 
        this.filter.options.locale.dateTimeFormat;
      var oper = $.trim($($input.get(0)).val());
      var dv = (opts.mode === 2) ? moment.utc(value, format) : moment(value, format);
      return value.length ? (name + ' ' + oper + ' `' + dv.format() + '`') : null;
    },

    getNumberCondition: function (name, $input) {
      var value = $.trim($($input.get(1)).val());
      var oper = $.trim($($input.get(0)).val());
      value = parseFloat(value);
      return isNaN(value) ? null : (name + ' ' + oper + ' ' + value);
    },

    getSelectionCondition: function (name, $input) {
      var value = $.trim($input.val());
      return value.length ? (name +' = "'+ value +'"') : null;
    },

    getTextCondition: function (name, $input) {
      var value = $.trim($input.val());
      return value.length ? (name +' LIKE "'+ value +'"') : null;
    },

    getRefCondition: function (name, $input) {
      var value = $.trim($input.val());
      if (!value.length) {
        return null;
      }
      var result = [];
      this.getRefAttrs(name).map(function (data) {
        var condition = this.getNestedCondition(data.type, data.name, $input);
        if (condition) {
          result.push(condition);
        }
      }.bind(this));
      return result.length ? ('('+ result.join(') OR (') +')') : null;
    },

    getNestedCondition: function (type, name, $input) {
      var method;
      switch (getSelType(type)) {
        case STRING_TYPE:
          method = this.getTextCondition;
          break;
        case NUMBER_TYPE:
          method = this.getNumberCondition;
          break;
        default:
          return null;
      }
      return method.call(this, name, $input);
    },

    hasValue: function ($filter) {
      var input = $filter.find('.select-value');
      var value = $(input.get(input.length - 1)).val();
      return $.trim(value).length > 0;
    },

    getAttrSelection: function (cell) {
      return this.getAttrOptions(cell).selection;
    },

    getAttrOptions: function (cell) {
      return this.filter.getAttrOptions(this.getCell(cell).data('name'));
    },

    getInput: function (element) {
      var ic = this.getInputContainer(element);

      return ic.find('.select-oper').add(ic.find('.select-value'));
    },

    getInputContainer: function (element) {
      return this.getFilterContainer(element).children('.dt-head-filter-container');
    },

    getFilterContainer: function (element) {
      return this.getCell(element).parent();
    },

    getCell: function (element) {
      return $(element).closest('.dt-head-cell');
    },

    getCells: function () {
      return this.$thead.find('.dt-head-cell');
    },

    getFilterCells: function () {
      return this.$thead.find('.dt-head-filter');
    },

    getRefAttrs: function (name) {
      name = name + '.';
      return this.filter.options.attrs.filter(function (data) {
        return data.name.indexOf(name) === 0;
      });
    },

    getTypeRefAttrs: function (type, name) {
      return this.getRefAttrs(name).filter(function (data) {
        return getSelType(data.type) === type;
      });
    },

    filterAttrsByType: function (type, attrs) {
      return attrs.filter(function (data) {
        return getSelType(data.type) === type;
      });
    }
  });

  var STRING_TYPE = 'string';
  var NUMBER_TYPE = 'number';
  var DATE_TYPE = 'date';
  var CHECKBOX_TYPE = 'checkbox';
  var REF_TYPE = 'ref';

  function getSelType (propertyType) {
    switch (propertyType) {
      case 0:
      case 1:
      case 2:
      case 3:
      case 12:
        return STRING_TYPE;
      case 6:
      case 7:
      case 8:
        return NUMBER_TYPE;
      case 9:
        return DATE_TYPE;
      case 10:
        return CHECKBOX_TYPE;
      case 13:
      case 14:
        return REF_TYPE;
      default:
        return STRING_TYPE;
    }
  }
})();
