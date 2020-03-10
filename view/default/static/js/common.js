'use strict';

$(function () {
  window.sidebarSplitter && sidebarSplitter.initMobile();
});

$(window).on("resize", function () {
  $(document.body).find('table.dataTable').DataTable().columns.adjust();
});

function getInputValue(input) {
  return input.is(':checkbox') ? input.prop('checked') : input.val();
}

// COMMON HELPER

window.commonHelper = {

  formatFileSize: function (size) {
    if (size > 1048576) return parseInt(size / 1048576) + ' ' + __('js.common.mb');
    if (size > 1024) return parseInt(size / 1024) + ' ' + __('js.common.kb');
    return size + ' ' + __('js.common.byte');
  },

  getUrlParams: function (url) {
    var data = url.split('&')[1];
    if (!data) {
      return {};
    }
    var result = {};
    data = data.split('&');
    for (var i = 0; i < data.length; ++i) {
      var item = data[i].split('=');
      if (item.length === 2) {
        result[item[0]] = item[1];
      }
    }
    return result;
  },

  appendUrlParams: function (url, params) {
    if (typeof params === 'string') {
      return params ? (url + (url.indexOf('?') > 0 ? '&' : '?') + params) : url;
    }
    params = $.extend(commonHelper.getUrlParams(url), params);
    params = $.param(params);
    return params ? (url.split('?')[0] +'?'+ params) : url;
  },

  prepareDepCondition: function (cond) {
    return cond
      ? (' ' + cond)
        .replace(/([^a-zA-Z0-9_])\.([a-zA-Z0-9_]+)\.length/gi, '$1parseInt(this.$form.find(".list-container[data-attr=\'$2\']").attr(\'length\'))')
        .replace(/([^a-zA-Z0-9_\)"])\.([a-zA-Z0-9_]+)/gi, '$1getInputValue(this.$form.find("[name=\'$2\']"))')
      : null;
  }
};

// OBJECT HELPER

window.objectHelper = {

  indexArray: function (items, key) {
    var index = {};
    if (items instanceof Array) {
      for (var i = 0; i < items.length; ++i) {
        index[items[i][key]] = items[i];
      }
    } else if (items && typeof items === 'object') {
      index[items[key]] = items;
    }
    return index;
  },

  unsetKeys: function (object, keys) {
    for (var i = 0; i < keys.length; ++i) {
      delete object[keys[i]];
    }
  },

  removeByKeyValues: function (objects, key, values) {
    for (var i = objects.length - 1; i >= 0; --i) {
      if (values.indexOf(objects[i][key]) > -1) {
        objects.splice(i, 1);
      }
    }
  },

  replaceInArray: function (objects, target, key) {
    for (var i = 0; i < objects.length; ++i) {
      if (objects[i][key] == target[key]) {
        objects.splice(i, 1, target);
        break;
      }
    }
  },
  // get [ key: value, ... ] from object array
  mapArray: function (items, key, value) {
    var maps = [];
    if (items instanceof Array) {
      for (var i = 0; i < items.length; ++i) {
        var map = {};
        map[items[i][key]] = items[i][value];
        maps.push(map);
      }
    } else {
      throw new Error("mapArray");
    }
    return maps;
  }
};

// MESSAGE CALLOUT

window.messageCallout = (function () {

  var $callout = $("#message-callout");

  function show (type, message, title) {
    var $title = $callout.find('.message-callout-title');
    title ? $title.html(title).show() : $title.hide();
    $callout.removeClass('alert-info alert-success alert-warning alert-danger').addClass('alert-'+ type);
    var $content = $callout.find('.message-callout-content');
    message ? $content.html(Array.isArray(message) ? message.join(';<br>') : message).show() : $content.hide();
    $callout.show();
  }
  return {
    info: function (message, title) {
      show("info", message, title);
    },

    success: function (message, title) {
      show("success", message, title);
    },

    warning: function (message, title) {
      show("warning", message, title);
    },

    error: function (message, title) {
      show("danger", message, title);
    },

    hide: function () {
      $callout.hide();
    }
  };
})();

// DATE PICKER

if ($.fn.datepicker) {
  $.extend($.fn.datepicker.defaults, {
    autoclose: true,
    format: 'dd.mm.yyyy',
    language: 'ru',
    todayHighlight: true
  });
}

if ($.fn.datetimepicker) {
  $.fn.datetimepicker.defaultOpts = {
    locale: 'ru',
    sideBySide: false,
    showClear: true,
    showClose: true,
    ignoreReadonly: true
  };
}

// DATA TABLES

if ($.fn.dataTable) {
  $.extend($.fn.dataTable.defaults, {
    paging: true,
    scrollX: true,
    lengthChange: true,
    searching: true,
    ordering: true,
    info: true,
    autoWidth: false,
    sDom: "<'row'<'col-sm-6'f><'col-sm-6'l>r>t<'row'<'col-sm-6'i><'col-sm-6'p>>",
    language: {
      processing: __('js.common.dt.processing'),
      search: __('js.common.dt.search'),
      lengthMenu: __('js.common.dt.lengthMenu'),
      info: __('js.common.dt.info'),
      infoEmpty: __('js.common.dt.infoEmpty'),
      infoFiltered: __('js.common.dt.infoFiltered'),
      infoPostFix: __('js.common.dt.infoPostFix'),
      loadingRecords: __('js.common.dt.loadingRecords'),
      zeroRecords: __('js.common.dt.zeroRecords'),
      emptyTable: __('js.common.dt.emptyTable'),
      paginate: {
        first: __('js.common.dt.paginate.first'),
        previous: __('js.common.dt.paginate.previous'),
        next: __('js.common.dt.paginate.next'),
        last: __('js.common.dt.paginate.last')
      },
      aria: {
        sortAscending: __('js.common.dt.aria.sortAscending'),
        sortDescending: __('js.common.dt.aria.sortDescending')
      }
    }
  });
  $.fn.dataTable.ext.errMode = 'none';

  window.customizeDatatable = function (manager) {
    var $table = manager.$table;
    var dt = manager.dt;
    var id = '#' + $table.attr('id');
    var info = dt.page.info();
    var total = info.recordsTotal;
    var $length = $(id + '_length');

    $length.toggle(total > 10);
    $length.find('option[value="25"]').toggle(total > 10);
    $length.find('option[value="50"]').toggle(total > 25);
    $length.find('option[value="100"]').toggle(total > 50);

    $(id + '_paginate').toggle(info.pages > 1);
    $(id + '_info').toggle(true);

    var tableData = $table.data();
    for (var dp in tableData) {
      if(tableData.hasOwnProperty(dp)) {
        if (dp.slice(dp.length-10) === '_customize' && typeof tableData[dp] === 'function') {
          tableData[dp]($table);
        }
      }
    }
  };

  $(function(){
    $('table.dataTable tbody').on('click', 'tr.group-start', function (e) {
        var me = $(this);
        if (me.hasClass('group-start')) {
          var next = me.next();
          while (next.length && !next.hasClass('group-start')) {
            next.toggle();
            next = next.next();
          }
          e.stopPropagation();
          e.preventDefault();
        }
    });
  });
}

// SELECT2

if ($.fn.select2) {
  $.fn.select2.defaults.set('language', 'ru');
}

// SIDEBAR MENU

function initSelect(element, sub_nav, caption) {
  var dt = [];
  for(var i = 0; i < sub_nav.length; i++){
    dt[dt.length] = {"id":sub_nav[i].id, "text": (sub_nav[i].hint || sub_nav[i].caption), "nav_element": sub_nav[i]};
  }
  element.select2({
    data: dt,
    placeholder: caption,
    tags: false
  });
  var selected = element.data("selected");
  if (selected) {
    element.val(selected).trigger("change");
  }
  element.on("select2:select", function (e) {
    element.nextAll('.menu-select').each(function(index, element){
      $(element).select2("destroy").remove();
    });
    var nav_element = e.params.data.nav_element;
    if(nav_element.nodes.length) {
      var new_sel = $('<select id="n_' + nav_element.id.replace('.', '_')
        + '" class="menu-select" style="width: 95%"><option></option></select>').insertAfter(element.next(".select2"));
      initSelect(new_sel, nav_element.nodes, nav_element.hint || nav_element.caption);
    } else if (nav_element.url) {
      window.open(nav_element.url, '_self');
    }
  });
}

(function () {
  var $sidenav = $("#sideBarNav");
  var url = decodeURIComponent(location.pathname + location.search);
  var hasDefaultUrl = false;
  $sidenav.find('.menu-link').each(function () {
    var $item = $(this);
    if ($item.attr('href') === url) {
      hasDefaultUrl = true;
    }
  });
  $sidenav.find('.menu-select').each(function () {
    var sel = $(this), nd = sel.data('selection');
    initSelect(sel, nd.nodes, nd.hint || nd.caption);
  });
  var items = {};
  if (!hasDefaultUrl) {
    $sidenav.find('.treeview-link').each(function (index) {
      items[this.id] = index === 0;
    });
  }
  $sidenav.on('click', '.treeview-link', function () {
    items[this.id] = !items[this.id];
    store.set('sideBarNav', items);
  });
  var stored = store.get('sideBarNav') || {};
  if (Object.keys(stored).join() === Object.keys(items).join()) {
    items = stored;
  }
  for (var id in items) {
    // items[id] && $('#'+id).parent().addClass("menu-open");
  }

  $("#moreMenuBtn").click(function (event) {
    event.preventDefault();
    $(this).toggleClass('active');
    if ($('body').hasClass('min')) {
      $('body').removeClass('min');
      $sidenav.find('> h3').show();
      $("#middle").css({"margin-left": ""});
    } else {
      $("#middle").css({"margin-left": "0"});
      $('body').addClass('min');
      var $items = $('#aside nav li.el_primary.menu-open');
      var style = $items.find('.treeview-menu').prop('style');
      if (style) {
        style.removeProperty("display");
      }
      $sidenav.find('> h3').hide();
      $items.removeClass('menu-open');
    }
  });

  $('#aside ul.nav > li').each(function (index) {
    $(this).addClass('el_primary').attr('id', 'el_' + index);
  });

  $('#aside ul.nav li a').click(function (event) {
    var $item = $(this);
    var href = $item.attr('href');
    if(href === '#') {
      event.preventDefault();
    }
    var $li = $item.closest('li');
    if (!$li.hasClass('always-open')) {
      var id = $li.attr('id');
      if ($li.hasClass('el_primary')) {
        $("#aside ul.nav li > ul").each(function () {
          var id2 = $(this).closest('li').attr('id');
          if (id !== id2) {
            $(this).slideUp(200, function () {
              $(this).parent().removeClass('menu-open');
            });
          }
        });
      }
      $item.next().slideToggle(200, function() {
        if($(this).is(":visible")) {
          $li.addClass('menu-open');
        } else {
          $li.removeClass('menu-open active');
        }
      });
    }
  }); //*/
})();

// IMODAL

(function () {
  var EVENT_PREFIX = 'imodal:';
  var $overlay = $('#global-overlay');
  var $frame = $('#imodal-frame');
  var $imodal = $('#imodal');
  var params = {};
  var imodalWindow = null;

  $imodal.find('.imodal-close').click(function () {
    $(document).trigger("close");
    parent.imodal && parent.imodal.close();
  });

  $(document.body).on('click', '.modal-link', function (event) {
    event.preventDefault();
    imodal.load(this.href);
  });

  setDocumentTitle();

  function setHistory() {
    imodalWindow.history.pushState(null, imodalWindow.document.title, imodalWindow.location.href);
    imodalWindow.onpopstate = function (event) {
      imodal.forceClose();
    };
  }

  function setDocumentTitle () {
    var title = $('.browser-title').html();
    if (title) {
      var root = getRootFrame(window).document;
      var pageTitle = $(root.body).data('title');
      root.title = pageTitle ? (pageTitle +' - '+ title) : title;
    }
  }

  function getRootFrame (win) {
    return !win.parent || win === win.parent ? win : getRootFrame(win.parent);
  }

  window.imodal = {

    isActive: function () {
      return $frame.hasClass('active');
    },

    getParams: function (key) {
      return key ? params[key] : params;
    },

    setParams: function (key, value) {
      params[key] = value;
    },

    getWindow: function () {
      return imodalWindow;
    },

    getFrame: function () {
      return $frame.get(0);
    },

    getParentFrame: function () {
      return parent && parent.imodal && parent.imodal.getFrame && parent.imodal.getFrame();
    },

    getDocument: function () {
      return $frame.get(0).contentDocument || $frame.get(0).contentWindow.document;
    },

    getEventId: function (name) {
      return EVENT_PREFIX + name;
    },

    init: function (params) {
      this.trigger('init', params);
    },

    load: function (url, data, cb) {
      cb = typeof data === 'function' ? data : cb;
      url = this.getDataUrl(data, url);
      $frame.addClass('active').detach().attr('src', url);
      $(document.body).append($frame);
      return $frame.off('load').on('load', function () {
        $overlay.hide();
        $frame.removeClass('transparent');
        $frame.parent().addClass('hidden-overflow');
        imodalWindow = $frame.addClass('loaded').get(0).contentWindow;
        imodalWindow.focus();
        setHistory();
        imodal.trigger('loaded');
        if (typeof cb === 'function') {
          cb(imodalWindow);
        }
      }.bind(this));
    },

    post: function(url, data, cb) {
      var form = $('<form action="' + url + '" target="'
        + this.getFrame().name + '" method="post" style="display:none;"></form>');

      function addInput(values, context) {
        for (var nm in values) {
          if (values.hasOwnProperty(nm)) {
            if (values[nm] && typeof values[nm] === 'object') {
              addInput(values[nm], context ? context + '[' + nm + ']' : nm);
            } else {
              $("<input type='hidden'/>")
                .attr("name", context ? context + '[' + nm + ']' : nm)
                .attr("value", values[nm])
                .appendTo(form);
            }
          }
        }
      }
      addInput(data);
      $frame.addClass('active').detach();
      $(document.body).append($frame);
      $(document.body).append(form);
      form.submit();
      return $frame.off('load').on('load', function () {
        form.remove();
        $overlay.hide();
        $frame.removeClass('transparent');
        $frame.parent().addClass('hidden-overflow');
        imodalWindow = $frame.addClass('loaded').get(0).contentWindow;
        setHistory();
        if (typeof cb === 'function') {
          cb(imodalWindow);
        }
      });
    },

    reload: function (url) {
      url = url || imodalWindow.location.href;
      imodal.setParams('reopen', true);
      if (imodal.close()) {
        $frame.one(imodal.getEventId('close'), function () {
          setTimeout(function () {
            imodal.load(url);
          }, 0);
        });
      }
    },

    close: function () {
      var event = this.createEvent('beforeClose');
      $frame.trigger(event);
      if (event.isPropagationStopped()) {
        return false;
      }
      try {
        if (!imodalWindow) {
          imodalWindow = $frame.get(0).contentWindow;
        }
        imodalWindow.focus();
      } catch (err) {
        console.error(err);
      }
      this.forceClose();
      return true;
    },

    forceClose: function () {
      if (imodalWindow) {
        if (this.getParams('reopen')) {
          $frame.addClass('transparent');
          $overlay.show();
        }
        setTimeout(function () {
          $frame.trigger(imodal.getEventId('close'));
          $frame.off('load').removeClass('active loaded').detach().attr('src', $frame.data('blank'));
          $(document.body).append($frame);
          $frame.parent().removeClass('hidden-overflow');
          $(imodalWindow).off('popstate');
          imodalWindow = null;
          params = {};
          setDocumentTitle();
          window.focus();
        }, 0);
      }
    },

    createEvent: function (name) {
      return $.Event(this.getEventId(name));
    },

    on: function (name, handler) {
      $frame.on(this.getEventId(name), handler);
    },

    one: function (name, handler) {
      $frame.one(this.getEventId(name), handler);
    },

    off: function (name, handler) {
      $frame.off(this.getEventId(name), handler);
    },

    trigger: function (name, params) {
      $frame.trigger(this.getEventId(name), params);
    },

    triggerParent: function (name, params) {
      if (window.parent && window.parent.imodal) {
        window.parent.imodal.trigger(name, params);
      }
    },

    getDataUrl: function (data, url) {
      data = typeof data !== 'object' ? {} : data;
      data = $.param(data);
      return data ? (url + (url.indexOf('?') > 0 ? '&' : '?') + data) : url;
    }
  };
})();

$('.default-icheck').iCheck({
  checkboxClass: 'icheckbox_flat',
  radioClass: 'iradio_flat',
  indeterminateClass: 'indeterminate-checkbox'
});

// INPUTMASK ALIASES

if (window.Inputmask) {
  Inputmask.extendAliases({
    email: {
      definitions: {
        "*": {
          validator: "[а-яА-Я0-9A-Za-z!#$%&'*+/=?^_`{|}~-]",
          cardinality: 1,
          casing: "lower"
        },
        "-": {
          validator: "[а-яА-Я0-9A-Za-z-]",
          cardinality: 1,
          casing: "lower"
        }
      }
    }
  });
}

// YMAP LOAD

(function () {
  var loading = false;
  var listeners = [];
  window.getYmaps = function (cb) {
    if (window.ymaps) {
      return cb(ymaps);
    }
    listeners.push(cb);
    if (!loading) {
      loading = true;
      $.getScript('https://api-maps.yandex.ru/2.1/?lang=ru_RU&coordorder=longlat', function () {
        for (var i = 0; i < listeners.length; ++i) {
          listeners[i](ymaps);
        }
      });
    }
  };
})();

function processAjaxError (xhr) {
  var $loader = $('#global-loader');
  var frame = imodal.getFrame();
  if (xhr.status === 401) {
    messageCallout.hide();
    imodal.load('auth').load(function (event) {
      var doc = imodal.getDocument();
      if (doc.getElementById('authbutton')) {
        doc.forms[0].addEventListener('submit', function (event) {
          event.preventDefault();
          $loader.show();
          $(frame).addClass('imodal-frame-transparent');
          setTimeout(function () {
            doc.forms[0].submit();
          }, 0);
        });
      } else {
        imodal.close();
      }
      $(frame).removeClass('imodal-frame-transparent');
      $loader.hide();
    });
  }
}

// Ajax chains
var ini_chain = $.Deferred();
ini_chain.resolve();
ini_chain = ini_chain.promise();

function chain(f) {
  ini_chain = ini_chain
    .then(f, f);
}


// USER ACTION HISTORY

function UserActionHistory (user, sizeLimit) {

  sizeLimit = sizeLimit || 20;
  var data = null;

  this.sync = sync;

  this.getObjects = function () {
    return data.objects;
  };

  this.getNodes = function () {
    return data.nodes;
  };

  this.getSearch = function () {
    return data.search[location.pathname] || [];
  };

  this.addObject = function (value) {
    if (value && value.url && value.title) {
      sync();
      add(value, data.objects);
    }
  };

  this.addNode = function (value) {
    if (value && value.url && value.title) {
      sync();
      add(value, data.nodes);
    }
  };

  this.addSearch = function (value) {
    if (value.length > 2) {
      sync();
      if (!data.search[location.pathname]) {
        data.search[location.pathname] = [];
      }
      add(value, data.search[location.pathname]);
    }
  };

  function sync () {
    data = store.get(getStoreId()) || {
      objects: [],
      nodes: [],
      search: {},
    };
  }

  function add (value, items) {
    var index = getIndexOf(value, items);
    if (index === -1) {
      items.unshift(value);
      if (items.length > sizeLimit) {
        items.splice(sizeLimit - 1, sizeLimit);
      }
    } else if (index > 0) {
      items.unshift(items.splice(index, 1)[0]); // pop up
    }
    store.set(getStoreId(), data);
  }

  function getIndexOf (value, items) {
    return (value && typeof value.title === 'string')
      ? getIndexOfTitle(value.title, items)
      : items.indexOf(value);
  }

  function getIndexOfTitle (value, items) {
    for (var i = 0 ; i < items.length; ++i) {
      if (items[i].title === value) {
        return i;
      }
    }
    return -1;
  }

  function getStoreId() {
    return 'UserActionHistory-' + user;
  }
}

$(document.body).on('click', '.menu-link', function (event) {
  var title = this.title;
  var $treeview = $(this).closest('.treeview');
  if ($treeview.length) {
    title = title +' - '+ $treeview.children('a').attr('title');
  }
  userActionHistory.addNode({
    url: this.href,
    title: title
  });
});

// TOP MENU

$('#top-menu').each(function () {
  var $menu = $(this);
  var $more = $menu.children('.more-menu-item').hide();
  var $moreMenu = $more.children('.dropdown-menu');
  var $header = $('#header');
  var $siblings = $menu.nextAll();
  var $sideBarNav = $('#sideBarNav');

  function align () {
    $more.show();
    $more.before($moreMenu.children());
    var maxWidth = getMaxMenuWidth();
    var moreWidth = $more.width();
    var sizes = getSizes(), total = 0, visible = 0;

    for (var i = 0; i < sizes.length; ++i) {
      if (total + sizes[i] > maxWidth) {
        if (total + moreWidth > maxWidth) {
          visible -= 1;
        }
        break;
      }
      total += sizes[i];
      visible += 1;
    }
    var $hidden = visible < 0 ? getItems() : getItems().slice(visible);
    if ($hidden.length) {
      $moreMenu.append($hidden);
    } else {
      $more.hide();
    }
  }

  function getMaxMenuWidth () {
    var width = 10;
    $siblings.each(function () {
      width += $(this).outerWidth();
    });
    return $header.width() - $menu.offset().left - width;
  }

  function getSizes () {
    var sizes = [];
    getItems().each(function () {
      sizes.push($(this).width());
    });
    return sizes;
  }

  function toggleSidebar () {
    var $children = $sideBarNav.children();
    var state = $children.filter('.active').length || $children.filter('.nav').children().length;
    $(document.body).toggleClass('hide-sidebar', !state);
  }

  function getItems () {
    return $menu.children('.top-menu-item').not($more);
  }

  $menu.show();
  toggleSidebar();
  align();

  $(window).on("resize", align);

  $menu.on('click', '.top-menu-section', function (event) {
    event.preventDefault();
    getItems().filter('.active').removeClass('active');
    var $btn = $(this);
    $btn.parent().addClass('active');
    $sideBarNav.children('.top-menu-children').removeClass('active');
    $sideBarNav.find('[data-id="' + $btn.attr('id') + '"]').addClass('active');
    toggleSidebar();
  });

});

// ASYNC SERIAL HANDLERS

(function () {
  var handlers = [];

  window.addAsyncSerialHandler = function (handler) {
    handlers.push(handler);
    if (handlers.length === 1) {
      setTimeout(process, 0);
    }
  };

  function process () {
    if (handlers.length) {
      var handler = handlers[0];
      handlers = handlers.slice(1);
      handler(process);
    }
  }
})();

// TINY-MCE

(function () {
  tinymce.PluginManager.add('uploadImage', function(editor, url) {
    editor.addButton('uploadImage', {
      icon: 'image',
      onclick: function() {
        var file_input = $('<input type="file" style="visibility: hidden;"/>')
          .appendTo(document.body).on('change', function () {
            var fd = new FormData();
            fd.append('file', file_input[0].files[0]);
            $.ajax({
              url: editor.settings.inserted_image_upload_url,
              data: fd,
              type: 'POST',
              contentType: false,
              processData: false,
              success: function (data, textStatus, jqXHR) {
                var thumb = data.file.thumbnails && data.file.thumbnails[editor.settings.inserted_image_thumbnail_type]
                  ? data.file.thumbnails[editor.settings.inserted_image_thumbnail_type].link
                  : data.file.link;
                var html = '<a href="' + data.file.link + '">' +
                    '<img src="' + thumb + '"/>' +
                  '</a>';
                var el = editor.dom.create('div', {class: editor.settings.inserted_image_container_classes}, html);
                editor.selection.setNode(el);
              },
              error: function (jqXHR, textStatus, errorThrown) {
                window.messageCallout.error(jqXHR.responseText, jqXHR.statusText);
              },
              complete: function(jqXHR, textStatus) {
                file_input.remove();
              }
            });
          }).click();
      }
    });
  });
})();
