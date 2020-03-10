'use strict';

(function () {

  window.RefShortView = function (manager)  {
    this.manager = manager;
    this.activateDelay = manager.options.refShortViewDelay;
    this.activateTimer = null;
    this.deactivateDelay = 100;
    this.deactivateTimer = null;
    this.$popup = $('#ref-short-view-popup');
    this.$frame = this.$popup.children('iframe');
    if (this.activateDelay) {
      this.init();
    }
  };

  $.extend(RefShortView.prototype, {

    init: function () {
      this.manager.$form.find('[data-ref-short-view="true"]').each(function (index, element) {
        var $attr = $(element);
        var type = $attr.data('type');
        switch (type) {
          case 'collection':
            new CollectionAttr(this, $attr);
            break;
          case 'reference':
            new ReferenceAttr(this, $attr);
            break;
          default:
            console.log(__('js.refShortView.unknownType'));
        }
      }.bind(this));

      this.$popup.mouseenter(function (event) {
        if (this.anchor) {
          this.activate(this.anchor);
        }
      }.bind(this));

      this.$popup.mouseleave(function (event) {
        if (this.anchor && !$(event.relatedTarget).closest(this.anchor.$element).length) {
          this.deactivate();
        }
      }.bind(this));

      this.$frame.load(function () {
        this.$popup.removeClass('loading');
        this.resize();
      }.bind(this));
    },

    isPopup: function ($item) {
      return $item && $item.closest(this.$popup).length;
    },

    isActive: function (anchor) {
      return this.anchor && this.anchor.isEqual(anchor);
    },

    activate: function (anchor) {
      if (this.isActive(anchor)) {
        clearTimeout(this.deactivateTimer);
      } else {
        clearTimeout(this.activateTimer);
        this.activateTimer = setTimeout(this.setAnchor.bind(this, anchor), this.activateDelay);
      }
    },

    deactivate: function ($target) {
      if (!this.isPopup($target)) {
        clearTimeout(this.activateTimer);
        clearTimeout(this.deactivateTimer);
        this.deactivateTimer = setTimeout(this.hidePopup.bind(this), this.deactivateDelay);
      }
    },

    setAnchor: function (anchor) {
      this.abortLoading();
      this.anchor = anchor;
      this.$frame.attr('src', anchor.getUrl());
      this.$popup.addClass('loading');
      this.showPopup();
    },

    showPopup: function () {
      this.$popup.show();
      this.$popup.offset(this.anchor.getOffset());
    },

    hidePopup: function () {
      this.abortLoading();
      this.$popup.hide();
      this.anchor = null;
    },

    resize: function () {
      var doc = this.$frame.get(0).contentDocument || this.$frame.get(0).contentWindow.document;
      this.$frame.height($(doc).height());
    },

    abortLoading: function () {
      if (this.xhr) {
        this.xhr.abort();
        this.xhr = null;
      }
    }
  });

  function Anchor (data) {
    this.attr = data.attr;
    this.objId = data.id;
    this.$element = data.$element;
  }

  $.extend(Anchor.prototype, {

    isEqual: function (anchor) {
      return this.attr === anchor.attr && this.$element.get(0) === anchor.$element.get(0);
    },

    getOffset: function () {
      var pos = this.$element.offset();
      pos.top += this.$element.outerHeight();
      return pos;
    },

    getUrl: function () {
      var url = this.attr.getUrl(this.objId);
      return url + '?readonly=on&short=on&condensed=on&refshort=on';
    }
  });

  function Attr (base, $attr) {
    this.base = base;
    this.$attr = $attr;
    this.prop = $attr.data('prop');
    this.name = this.prop.property;
  }

  $.extend(Attr.prototype, {
  });

  function CollectionAttr () {
    Attr.apply(this, arguments);
    this.$table = this.$attr.find('.dataTable').first();
    this.options = this.$table.data('options');
    this.init();
  }

  $.extend(CollectionAttr.prototype, Attr.prototype, {

    init: function () {
      this.$attr.on('mouseenter', 'tbody > tr', function (event) {
        this.base.activate(new Anchor({
          attr: this,
          id: $(event.currentTarget).data('id'),
          $element: $(event.currentTarget)
        }));
      }.bind(this));
      this.$attr.on('mouseleave', 'tbody > tr', function (event) {
        this.base.deactivate($(event.relatedTarget));
      }.bind(this));
    },

    getUrl: function (id) {
      return this.options.url.update +'/'+ encodeURIComponent(id);
    }
  });

  function ReferenceAttr () {
    Attr.apply(this, arguments);
    this.$text = this.$attr.find('.form-control');
    this.$value = this.$attr.find('.attr-value');
    this.options = this.$attr.data('options');
    this.init();
  }

  $.extend(ReferenceAttr.prototype, Attr.prototype, {

    init: function () {
      this.$text.mouseenter(function (event) {
        if (this.$value.val()) {
          this.base.activate(new Anchor({
            attr: this,
            id: this.$value.attr('id'),
            $element: this.$text
          }));
        }
      }.bind(this));
      this.$text.mouseleave(function (event) {
        this.base.deactivate($(event.relatedTarget));
      }.bind(this));
    },

    getUrl: function () {
      return this.options.updateUrl +'/'+ this.$value.val();
    }
  });

})();
