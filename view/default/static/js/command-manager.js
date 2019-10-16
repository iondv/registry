'use strict';

(function () {

  function CommandManager (options, $btns)  {
    this.options = options instanceof Array ? options : this.getDefaultOptions();
    this.indexOptions = objectHelper.indexArray(this.options, 'id');
    this.$btns = $btns;
    this.createFloatManager();
  }

  CommandManager.prototype = {
    constructor: CommandManager,

    init: function () {
      this.processBtns(this.initBtn);
    },

    initBtn: function ($btn) {
      var options = this.indexOptions[$btn.data('id')]
        || {id: $btn.data('id'), needSelectedItem: $btn.data('needSelected'), isBulk: $btn.data('bulk')};
      $btn.data('options', options);
      if (options.caption) {
        $btn.html(options.caption);
      }
      // $btn.show();
    },

    createFloatManager: function () {
      if (!CommandManager.floatManager) {
        CommandManager.floatManager = new FloatManager(this.$btns);
      }
    },

    getDefaultOptions: function () {
      return [];
    },

    isCommand: function (id) {
      return this.getBtn(id).is(':visible');
    },

    getBtn: function (id) {
      return this.$btns.filter('[data-id="'+ id +'"]');
    },

    processBtns: function (handler, params) {
      var self = this;
      this.$btns.each(function () {
        handler.call(self, $(this), params);
      });
      CommandManager.floatManager && CommandManager.floatManager.refresh();
    }
  };

  CommandManager.toggleFloat = function (visible) {
    CommandManager.floatManager && CommandManager.floatManager.toggle(visible);
  };

  CommandManager.refreshFloat = function (visible) {
    CommandManager.floatManager && CommandManager.floatManager.refresh();
  };

  // LIST

  window.ListCommandManager = function (options, $btns, $table) {
    CommandManager.apply(this, arguments);
    this.$table = $table;
    this.dt = this.$table.dataTable().api();
    $table.on('list-manager:select', function (event, data) {
      this.changeSelect(data);
    }.bind(this));
    this.init();
  };

  $.extend(ListCommandManager.prototype, CommandManager.prototype, {
    constructor: ListCommandManager,

    init: function () {
      CommandManager.prototype.init.call(this);
      this.changeSelect();
    },

    getDefaultOptions: function () {
      return [
        {
          id: 'SELECT',
          isBulk: true
        },
        {
          id: 'CREATE'
        },
        {
          id: 'EDIT',
          needSelectedItem: true
        },
        {
          id: 'DELETE',
          isBulk: true
        }
      ];
    },

    getSelectedRows: function () {
      return this.$table.find('tr.selected');
    },

    changeSelect: function () {
      var $rows = this.getSelectedRows();
      var _this = this;
      var permissions = {
        write: 1,
        delete: 1
      };
      $rows.each(function() {
        var row = _this.dt.row(this);
        if (!row) {
          return false;
        }
        var data = row.data();
        if (!data || !data.__permissions) {
          return false;
        }
        permissions.write = permissions.write & (data.__permissions.write ? 1 : 0);
        permissions.delete = permissions.delete & (data.__permissions.delete ? 1 : 0);
      });
      this.processBtns(this.handleButtonVisibility, {
        counter: $rows.length,
        permissions: {
          write: !!(permissions.write),
          delete: !!(permissions.delete)
        }
      });
    },

    processBtns: function (handler, params) {
      CommandManager.prototype.processBtns.apply(this, arguments);
      this.$table.trigger('command-control-change');
    },

    handleButtonVisibility: function ($btn, params) {
      params = params || {};
      var options = $btn.data('options');
      var visible = options && options.hasOwnProperty('id');
      var permissions = params.permissions || {};
      if (options && options.needSelectedItem && params.counter !== 1) {
        visible = false;
      }
      if (options && options.isBulk && params.counter === 0) {
        visible = false;
      }
      if (options && options.id === 'EDIT') {
        visible = visible && !!(permissions.write);
      }
      if (options && options.id === 'DELETE') {
        visible = visible && !!(permissions.delete);
      }
      $btn.toggle(visible);
    }
  });

  // ATTR LIST

  window.AttrListCommandManager = function (options, $btns, $table) {
    this.listManager = $table.data('manager');
    ListCommandManager.apply(this, arguments);
  };

  $.extend(AttrListCommandManager.prototype, ListCommandManager.prototype, {
    constructor: AttrListCommandManager,

    getDefaultOptions: function () {
      if (this.listManager.prop.readonly) {
        return [
          {
            id: "EDIT",
            needSelectedItem: true
          }
        ];
      }
      return [
        {
          id: 'ADD'
        },
        {
          id: 'CREATE'
        },
        {
          id: 'CREATE-INLINE'
        },
        {
          id: 'EDIT',
          needSelectedItem: true
        },
        {
          id: 'REMOVE',
          isBulk: true
        },
        {
          id: 'DELETE',
          isBulk: true
        }
      ];
    }
  });

  // DROPDOWN

  window.DropdownCommandManager = function (options, $btns, $field) {
    this.$field = $field;
    this.$group = $field.parents('.form-group');
    var ap = null;
    this.$group.each(function (i, e) {
      if($(e).data('prop'))
        ap = $(e).data('prop');
    });
    this.attrProp = ap;
    this.$field.change(this.processBtns.bind(this));
    CommandManager.apply(this, arguments);
    this.processBtns();
  };

  $.extend(DropdownCommandManager.prototype, CommandManager.prototype, {
    constructor: DropdownCommandManager,

    createFloatManager: function () {},

    getDefaultOptions: function () {
      if (this.attrProp.readonly) {
        return [
          {
            id: 'EDIT',
            needSelectedItem: true
          }
        ];
      }
      return [
        {
          id: 'SELECT'
        },
        {
          id: 'CREATE'
        },
        {
          id: 'EDIT',
          needSelectedItem: true
        },
        {
          id: 'REMOVE',
          needSelectedItem: true
        }
      ];
    },

    processBtns: function () {
      var self = this;
      var hasValue = this.hasValue();
      //CommandManager.prototype.processBtns.call(this, this.toggle, false);
      for (var i = 0; i < this.options.length; ++i) {
        var opt = this.options[i];
        var $btn = this.getBtn(opt.id);
        this.toggle($btn, opt.needSelectedItem ? hasValue : true);
      }
    },

    hasValue: function () {
      return this.$field.val() !== '' && this.$field.val() !== null && this.$field.val() !== undefined;
    },

    toggle: function ($btn, state) {
      $btn.toggleClass('active', !!state);
    },

    isActive: function ($btn) {
      return $btn.hasClass('active') && $btn.is(':visible');
    }
  });

  // OBJECT

  window.ObjectCommandManager = function (options, $btns) {
    CommandManager.apply(this, arguments);
  };

  $.extend(ObjectCommandManager.prototype, CommandManager.prototype, {
    constructor: ObjectCommandManager
  });

  // CREATE OBJECT

  window.CreateObjectCommandManager = function (options, $btns) {
    ObjectCommandManager.apply(this, arguments);
  };

  $.extend(CreateObjectCommandManager.prototype, ObjectCommandManager.prototype, {
    constructor: CreateObjectCommandManager,

    getDefaultOptions: function () {
      return [{
        id: 'SAVEANDCLOSE'
      },{
        id: 'SAVE'
      }];
    }
  });

  // UPDATE OBJECT

  window.UpdateObjectCommandManager = function (options, $btns) {
    ObjectCommandManager.apply(this, arguments);
  };

  $.extend(UpdateObjectCommandManager.prototype, ObjectCommandManager.prototype, {
    constructor: UpdateObjectCommandManager,

    getDefaultOptions: function () {
      return [{
        id: 'SAVEANDCLOSE'
      },{
        id: 'SAVE'
      },{
        id: 'DELETE'
      }];
    }
  });

  // FLOAT MANAGER

  function FloatManager ($btns)  {
    var self = this;
    this.$srcBtns = $btns.eq(0).parent().find('.btn');
    this.$panel = $btns.eq(0).closest('.panel');
    this.$imodal = this.$panel.closest('.imodal-box');
    this.active = this.$imodal.length > 0;
    if (this.active) {
      this.$bar = this.$panel.find('.float-tools');
      this.$btns = this.$bar.find('.btn');
      this.place();
      this.$bar.show();
      this.$btns.click(function () {
        if (self.$imodal.find('.object-loader').is(':hidden')) {
          self.getSrcBtn($(this)).click();
        }
        $(this).blur();
      });
      $(window).on("resize",function () {
        self.place();
      });
    }
  }

  FloatManager.prototype = {
    constructor: FloatManager,

    refresh: function () {
      if (this.active) {
        var self = this;
        this.$btns.each(function () {
          $(this).toggle(self.getSrcBtn($(this)).is(':visible'));
        });
      }
    },

    getSrcBtn: function ($floatBtn) {
      return this.$srcBtns.filter('[data-id="'+ $floatBtn.data('cmd') +'"]');
    },

    place: function () {
      if (this.active) {
        var offset = this.$imodal.offset().left - 40;
        offset = offset < 0 ? 0 : offset;
        this.$bar.css("left", offset +'px');
      }
    },

    toggle: function (visible) {
      this.active && this.$bar.toggle(visible);
    }
  };
})();
