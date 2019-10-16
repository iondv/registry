'use strict';

$(function () {

  function getListManager() {
    return $('#list-manager').data('manager');
  }

  function getSearchDelay() {
    var list = getListManager();
    return list ? list.options.dt.searchDelay : 0;
  }

  var $container = $('#top-search');
  var $input = $container.find('input');
  var $clear = $container.find('.clear');
  var $menu = $container.find('.dropdown-menu');
  var allNodes = null;
  var timer = null;
  var searchDelay = getSearchDelay();
  var prevSearchValue = '';

  var MAX_MENU_ITEMS = 5;

  $menu.on('click', '.value-link', function (event) {
    event.preventDefault();
    $input.val(event.target.innerHTML);
    search();
    $input.blur();
  });

  $input.focus(function (event) {
    if (!isMenuOpen()) {
      userActionHistory.sync();
      createMenu();
      $container.addClass('open');
      fitToWindow();
    }
  });

  $input.blur(function (event) {
    if (!$(event.relatedTarget).closest('.top-search').length) {
      $container.removeClass('open');
    }
  });

  $input.on('keyup', function (event) {
    clearTimeout(timer);
    switch (event.keyCode) {
      case 13:
        search();
        $input.blur();
        break;

      case 27:
        $clear.click();
        break;

      case 40:
        $menu.children('.item').first().find('a').focus();
        break;

      case 38:
        break;

      default:
        createMenu();
        if (searchDelay) {
          timer = setTimeout(search, searchDelay);
        }
    }
    $container.toggleClass('valued', $input.val().length > 0);
  });

  $clear.click(function (event) {
    $input.val("").keyup().focus();
  });

  $(window).resize(function () {
    if (isMenuOpen()) {
      fitToWindow();
    }
  });

  function isMenuOpen() {
    return $container.hasClass('open');
  }

  function search() {
    var value = $.trim($input.val());
    var list = getListManager();
    if (list) {
      list.dt.search(value).draw();
      if (value.length) {
        userActionHistory.addSearch(value);
      }
    }
  }

  function createMenu() {
    if (!allNodes) {
      init();
    }
    var value = $.trim($input.val());
    var hasValue = value.length > 0;
    var searchItems = getListManager() ? findSearch(value) : [];
    var objectItems = findObjects(value);
    var nodeItems = findNodes(value);
    var menu = [
      createSearchMenu(searchItems, MAX_MENU_ITEMS),
      createObjectMenu(objectItems, MAX_MENU_ITEMS, 'Недавние объекты'),
      createNodeMenu(nodeItems, MAX_MENU_ITEMS, hasValue
        ? 'Найденные пункты меню'
        : 'Недавние пункты меню')
    ];
    menu = menu.filter(function (data) {
      return data;
    });
    var result = menu.join('<li class="divider"></li>');
    $menu.html(result);
  }

  function findSearch(text) {
    var length = text.length;
    var items = userActionHistory.getSearch();
    if (!length) {
      return items;
    }
    var result = [];
    for (var i = 0; i < items.length; ++i) {
      if (items[i].length > length && items[i].substring(0, length) === text) {
        result.push(items[i]);
      }
    }
    return result;
  }

  function findObjects(text) {
    var items = userActionHistory.getObjects();
    if (!text.length) {
      return items;
    }
    text = text.toLowerCase();
    var result = [];
    for (var i = 0; i < items.length; ++i) {
      if (items[i].title.toLowerCase().indexOf(text) !== -1) {
        result.push(items[i]);
      }
    }
    return result;
  }

  function findNodes(text) {
    if (!text.length) {
      return userActionHistory.getNodes();
    }
    text = text.toLowerCase();
    var result = [];
    for (var i = 0; i < allNodes.length; ++i) {
      if (allNodes[i].search.indexOf(text) !== -1) {
        result.push(allNodes[i]);
      }
    }
    return result;
  }

  function createSearchMenu(items, maxItems) {
    var result = '';
    if (getListManager()) {
      for (var i = 0; i < items.length && i < maxItems; ++i) {
        result += '<li class="item"><a class="value-link" href="#">' + items[i] + '</a></li>'
      }
    }
    return result;
  }

  function createObjectMenu(items, maxItems, title) {
    var result = '';
    for (var i = 0; i < items.length && i < maxItems; ++i) {
      result += '<li class="item"><a href="' + commonHelper.appendUrlParams(location.href, {
          open: items[i].url
        }) + '" title="' + items[i].title +'">'+ items[i].title + '</a></li>'
    }
    if (result && title) {
      result = '<li class="dropdown-title">' + title + '</li>' + result;
    }
    return result;
  }

  function createNodeMenu(items, maxItems, title) {
    var result = '';
    for (var i = 0; i < items.length && i < maxItems; ++i) {
      result += '<li class="item"><a class="menu-link" href="' + items[i].url + '" title="'
        + items[i].title + '">' + items[i].title + '</a></li>'
    }
    if (result && title) {
      result = '<li class="dropdown-title">' + title + '</li>' + result;
    }
    return result;
  }

  function init() {
    setNodes();
  }

  function setNodes() {
    allNodes = [];
    $('#sideBarNav').find('.menu-link').each(function () {
      var title = this.title;
      var $treeview = $(this).closest('.treeview');
      if ($treeview.length) {
        title = title +' - '+ $treeview.children('a').attr('title');
      }
      allNodes.push({
        url: this.href,
        title: title,
        search: this.title.toLowerCase()
      });
    });
  }

  function fitToWindow() {
    var width = $(window).width();
    if (width < 768 && $menu.width() > width) {
      $menu.width(width - 20);
    } else {
      $menu.width('auto');
    }
  }
});
