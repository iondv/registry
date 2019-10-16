'use strict';

function historyPage (panel, url, locale) {

  var PAGE_SIZE = 5;

  var self = this;
  self.changes = null;
  self.panel = panel;
  locale = locale || {};

  self.list = $('.history-page-list', self.panel);
  self.alert = $('.history-page-error', self.panel);
  self.since = $('#since', self.panel);
  self.till = $('#till', self.panel);
  self.prevInterval = $('#prevInterval', self.panel);
  self.nextInterval = $('#nextInterval', self.panel);
  self.firstIndex = $('#firstIndex', self.panel);
  self.lastIndex = $('#lastIndex', self.panel);
  self.prevPage = $('#prevPage', self.panel);
  self.nextPage = $('#nextPage', self.panel);

  var init = function () {
    $('button.history-page-close', self.panel).on('click', function () {
      self.close();
    });
    $('button.history-page-reload', self.panel).on('click', function () {
      self.refresh();
    });

    //Поведение контроллов навигации по периоду
    self.since.add(self.till).datetimepicker({
      locale: locale.lang,
      format: locale.dateTimeFormat
    }).on('dp.change', onSinceTillControllsChange);
    self.prevInterval.on('click', function () {
      var s = self.since.data("DateTimePicker").date();
      var ns = moment(2 * s.valueOf() - self.till.data("DateTimePicker").date().valueOf());
      var nt = s;
      showByInteval(ns, nt);
    });
    self.nextInterval.on('click', function () {
      var t = self.till.data("DateTimePicker").date();
      var ns = t;
      var nt = moment(2 * t.valueOf() - self.since.data("DateTimePicker").date().valueOf());
      showByInteval(ns, nt);
    });

    //Поведение контроллов навигации по количеству
    self.firstIndex.add(self.lastIndex).on('change', function () {
      var start = parseInt(self.firstIndex.val());
      var end = parseInt(self.lastIndex.val());
      showByPosition(start, end);
    });
    self.prevPage.on('click', function () {
      var s = parseInt(self.firstIndex.val());
      var ns = s - PAGE_SIZE;
      var ne = s - 1;
      showByPosition(ns, ne);
    });
    self.nextPage.on('click', function () {
      var e = parseInt(self.lastIndex.val());
      var ns = e + 1;
      var ne = e + PAGE_SIZE;
      showByPosition(ns, ne);
    });
  };

  self.open = function () {
    self.panel.show();
    self.refresh();
  };

  self.refresh = function () {
    self.alert.hide();
    getData(function (data) {
      self.changes = [];
      self.list.empty();
      for (var i = 0; i < data.length; i++) {
        data[i].time = moment(data[i].time);
        data[i].time.locale(locale.lang);
        var changeRecord = $(getChangeRecordTemplate(data[i]));
        changeRecord.appendTo(self.list);
        self.changes.push({change: data[i], record: changeRecord});
      }
      showByPosition(0, PAGE_SIZE - 1);
    });
  };

  self.close = function () {
    self.panel.hide();
  };

  var onError = function (title, content) {
    self.alert.find(".history-page-title").text(title);
    self.alert.find(".history-page-content").text(content);
    self.alert.show();
  };

  var onSinceTillControllsChange = function () {
      showByInteval(
        self.since.data("DateTimePicker").date(),
        self.till.data("DateTimePicker").date()
      );
  };

  var setSinceTillControlls = function (s, t) {
    self.since.add(self.till).off('dp.change', onSinceTillControllsChange);
    self.since.data("DateTimePicker").date(s);
    self.till.data("DateTimePicker").date(t);
    self.since.add(self.till).on('dp.change', onSinceTillControllsChange);
  };

  var setFirstLastControlls = function (f, l) {
    self.firstIndex.val(f);
    self.lastIndex.val(l);
    if (f <= 0) {
      self.prevPage.prop('disabled', true);
    } else {
      self.prevPage.prop('disabled', false);
    }
    if (l >= self.changes.length - 1) {
      self.nextPage.prop('disabled', true);
    } else {
      self.nextPage.prop('disabled', false);
    }
  };

  var showByPosition = function (start, end) {
    var since;
    var till;


    if (start > end) {
      var tmp = start;
      start = end;
      end = tmp;
    }
    start = start < 0
      ? 0
      : start;
    end = end >= self.changes.length
      ? self.changes.length - 1
      : end;

    for (var i = 0; i < self.changes.length; i++) {
      if (start <= i && i <= end) {
        self.changes[i].record.show();
        if (i === start) {
          till = self.changes[i].change.time;
        }
        if (i === end) {
          since = self.changes[i].change.time;
        }
      } else {
        self.changes[i].record.hide();
      }
    }

    setFirstLastControlls(start, end);
    setSinceTillControlls(since, till);
  };

  var showByInteval = function (since, till) {
    var first;
    var last;
    for (var i = 0; i < self.changes.length; i++) {
      var changeTS = self.changes[i].change.time.valueOf();
      if (since.valueOf() <= changeTS && changeTS <= till.valueOf()) {
        self.changes[i].record.show();
        first = !first || i < first ? i : first;
        last = !last || i > last ? i : last;
      } else {
        self.changes[i].record.hide();
      }
    }

    setSinceTillControlls(since, till);
    setFirstLastControlls(first, last);
  };

  var getData = function (successCallback) {
    $.ajax(url, {
      data: {},
      dataType: 'json',
      type: 'POST',
      success: successCallback,
      error: function (jqXHR, textStatus, errorThrown) {
        console.log(jqXHR, textStatus, errorThrown);
        onError(jqXHR.status, jqXHR.statusText);
      }
    });
  };

  var getChangeRecordTemplate = function (change) {
    var time = change.time.isValid()
      ? change.time.format('L LT')
      : change.time;
    var type = change.type === 'CREATE'
      ? 'создан'
      : change.type === 'UPDATE'
        ? 'изменён'
        : change.type;
    var authorName = typeof change.author === 'object'
      ? change.author.name
      : change.author;

    var changes = '<div class="changelog-updates-header"><span class="parameter">Атрибут</span><span class="value">Новое значение</span></div>';
    for (var param in change.updates) {
      changes = changes + '<div><span class="parameter">' + param + '</span><span class="value">' + change.updates[param] + '</span></div>';
    }
    return '<div class="changelog">' +
        '<div class="changelog-header"><span>' + time + '</span> <span >' + type + '</span> пользователем <span>' + authorName + '</span></div>' +
        '<div class="changelog-updates">' + changes + '</div>' +
      '</div>';
  };

  init();
}