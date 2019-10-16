"use strict";

(function () {

  window.WorkTime = function ($group) {
    this.$group = $group;
    this.$field = $group.find('.attr-value');
    this.$container = this.$field.closest('.worktime');
    this.$list = this.$container.find('.worktime-list');
    this.$master = this.$list.find('>.master');
    this.$field.data('worktime', this);

    var self = this;
    this.$list.on('click', '.worktime-week .btn-day', function () { self.selectDay($(this)); });

    var $weekFilter = this.$master.find('.worktime-filter');
    $weekFilter.filter('.fivedays').click(this.setFiveDays.bind(this));
    $weekFilter.filter('.daily').click(this.setDaily.bind(this));

    this.$master.find('.worktime-control.create').click(this.addItem.bind(this));
    this.$list.on('click', '.worktime-control.remove', function () { self.removeItem(this); });
    this.$list.on('change', '.worktime-time select', function () { self.changeTime(this); });
  };

  WorkTime.prototype = {
    constructor: WorkTime,

    init: function () {
      this.getAddedItems().remove();
      this.$master.find('.btn-day').removeClass('active');
      this.$master.find('.worktime-time select').val('00');
      this.assign(this.$field.val());
      this.serialize(false);
      this.$container.addClass('ready');
    },

    selectDay: function ($btn) {
      $btn.toggleClass('active');
      var day = $btn.data('id');
      var $item = this.getItem($btn);
      this.getItems().not($item).find('.btn-day').filter('[data-id="'+ day +'"]').removeClass('active');
      this.serialize();
    },

    changeTime: function (select) {
      this.serialize();
    },

    /*** ITEMS ***/

    getItem: function (elem) {
      return $(elem).closest('.worktime-item');
    },

    getItems: function () {
      return this.$list.find('.worktime-item');
    },

    getAddedItems: function () {
      return this.getItems().not(this.$master);
    },

    addItem: function () {
      if (this.getItems().length >= 7) return;
      var $item = this.$master.clone().removeClass('master');
      $item.find('.btn-day').removeClass('active');
      $item.find('.worktime-control.create').remove();
      $item.find('.worktime-control.remove').removeClass('hidden');
      $item.find('.worktime-filters').remove();
      this.$list.append($item);
      return $item;
    },

    removeItem: function (btn) {
      this.getItem(btn).remove();
      this.serialize();
    },

    /*** FILTERS ***/

    setFiveDays: function () {
      this.getAddedItems().remove();
      this.$master.find('.btn-day').addClass('active').filter('.btn-weekend').removeClass('active');
      this.serialize();
    },

    setDaily: function () {
      this.getAddedItems().remove();
      this.$master.find('.btn-day').addClass('active');
      this.serialize();
    },

    /*** SERIALIZE ***/

    serialize: function (changed) {
      var result = [];
      var self = this;
      this.getItems().each(function () {
        var $item = $(this);
        var $days = $item.find('.btn-day.active');
        if (!$days.length) {
          return;
        }
        var data = {
          days: self.serializeDays($days)
        };
        var workTime = self.serializePeriod($item.find('.worktime-time > select'));
        if (workTime) {
          data.workTime = workTime;
        }
        var breakTime = self.serializePeriod($item.find('.worktime-break > select'));
        if (breakTime) {
          data.breakTime = breakTime;
        }
        result.push(data);
      });
      this.attrValue = convertToSchedule(result);
      if (changed !== false) {
        this.$group.trigger('change');
      }
    },

    serializePeriod: function ($selects) {
      var period = [ $selects.get(0).value, $selects.get(1).value, $selects.get(2).value, $selects.get(3).value ];
      return parseInt(period[0]) || parseInt(period[1]) || parseInt(period[2]) || parseInt(period[3]) ? period : null;
    },

    serializeDays: function ($days) {
      var days = [];
      $days.each(function () {
        days.push($(this).data('id'));
      });
      return days;
    },

    /*** ASSIGN ***/

    assign: function (value) {
      if (!value) return;
      try {
        var data = JSON.parse(value);
        data = convertFromSchedule(data);
        for (var i = 0; i < data.length; ++i) {
          this.assignItem(data[i], i === 0 ? this.$master : this.addItem());
        }
      } catch (err) {
        console.error(err, value);
      }
    },

    assignItem: function (data, $item) {
      var $days = $item.find('.btn-day');
      for (var i = 0; i < data.days.length; ++i) {
        $days.filter('[data-id="'+ data.days[i] +'"]').addClass('active');
      }
      if (data.workTime instanceof Array) {
        $item.find('.worktime-time > select').each(function (index) {
          this.value = data.workTime[index];
        });
      }
      if (data.breakTime instanceof Array) {
        $item.find('.worktime-break > select').each(function (index) {
          this.value = data.breakTime[index];
        });
      }
    },

    /*** FORMAT ***/

    format: function (value) {
      if (!value) return value;
      try {
        value = convertFromSchedule(value);
        var result = [];
        for (var i = 0; i < value.length; ++i) {
          result.push(formatItem(value[i]));
        }
        return result.join('; ');
      } catch (err) {
        console.error(err, value);
        return value;
      }
    },

    /*** VALIDATE ***/

    validate: function () {
      var required = this.$field.closest('.form-group').is('.required');
      var self = this;
      var emptyDay = false;
      var emptyTime = false;
      this.$list.find('.has-error').removeClass('has-error');
      this.getItems().each(function (index) {
        var $item = $(this);
        if (!$item.find('.btn-day.active').length) {
          $item.find('.worktime-week').addClass('has-error');
          emptyDay = true;
        }
        if (!self.serializePeriod($item.find('.worktime-time > select'))) {
          $item.find('.worktime-time').addClass('has-error');
          emptyTime = true;
        }
        // skip first item for not required field
        if (!required && index === 0 && emptyDay && emptyTime) {
          emptyDay = false;
          emptyTime = false;
          $item.find('.has-error').removeClass('has-error');
        }
      });
      var error = null;
      if (emptyDay || emptyTime) error = 'Не запонено расписание работы';
      return error;
    }
  };

  var FULL_DAYS = [ '', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота','воскресенье' ];
  var SHORT_DAYS = [ '', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб','Вс' ];

  function formatItem (item) {
    return formatDays(item.days) + formatWork(item.workTime) + formatBreak(item.breakTime);
  }

  function formatDays (days) {
    var result = [], start, last;
    for (var i = 0; i < days.length; ++i) {
      if (!start) {
        start = days[i];
      } else if (last + 1 !== days[i]) {
        result.push(formatDayPeriod(start, last));
        start = days[i];
      }
      last = days[i];
    }
    result.push(formatDayPeriod(start, last));
    return result.join(', ');
  }

  function formatDayPeriod(start, last) {
    return start != last ? FULL_DAYS[start] +' - '+ FULL_DAYS[last] : FULL_DAYS[last];
  }

  function formatWork (time) {
    return formatTime(time);
  }

  function formatBreak (time) {
    return time ? ' (перерыв' + formatTime(time) +')' : '';
  }

  function formatTime (time) {
    return time instanceof Array ? ' с '+ time[0] +':'+ time[1] +' до '+ time[2] +':'+ time[3] : '';
  }

  // CONVERTER

  function convertToSchedule (items) {
    var dest = {
      description: 'Недельное расписание',
      item: '',
      occurs: [],
      skipped: []
    };
    for (var i = items.length - 1; i >= 0; --i) {
      var item = items[i];
      var workDuration = getDurationByTime(item.workTime);
      var breakDuration = getDurationByTime(item.breakTime);
      for (var j = 0; j < item.days.length; ++j) {
        var weekday = item.days[j];
        var occur = {
          weekday: weekday,
          duration: workDuration
        };
        if (item.workTime instanceof Array) {
          occur.hour = parseInt(item.workTime[0]);
          occur.minute = parseInt(item.workTime[1]);
        }
        dest.occurs.push(occur);
        if (item.breakTime instanceof Array) {
          dest.skipped.push({
            weekday: weekday,
            hour: parseInt(item.breakTime[0]),
            minute: parseInt(item.breakTime[1]),
            duration: breakDuration
          });
        }
      }
    }
    return dest;
  }

  function convertFromSchedule (data) {
    if (!data) {
      return null;
    }
    var itemsByDay = {};
    var occurs = data && data.occurs;
    var skipped = data && data.skipped;
    if (occurs) {
      for (var i = 0; i < occurs.length; ++i) {
        var occur = occurs[i];
        itemsByDay[occur.weekday] = {
          workTime: getTimeArray(occur) // ['hh', 'mm', 'hh2', 'mm2']
        };
        var skip = getScheduleSkippedItem(occur.weekday, skipped);
        if (skip) {
          itemsByDay[occur.weekday].breakTime = getTimeArray(skip);
        }
      }
    }
    var mergedItems = [];
    var weekdays = Object.keys(itemsByDay);
    for (var i = 0; i < weekdays.length; ++i) {
      var item = itemsByDay[weekdays[i]];
      if (item.merged) continue;
      var result = {
        days: [ weekdays[i] ],
        workTime: item.workTime,
        breakTime: item.breakTime
      };
      for (var j = i + 1; j < weekdays.length; ++j) {
        var next = itemsByDay[weekdays[j]];
        if (next.merged) continue;
        if (isEqualTimeArray(item.workTime, next.workTime) && isEqualTimeArray(item.breakTime, next.breakTime)) {
          result.days.push(weekdays[j]);
          next.merged = true;
        }
      }
      mergedItems.push(result);
    }
    return mergedItems;
  }

  function isEqualTimeArray(t1, t2) {
    return (!t1 && !t2) || (t1 && t2 && t1[0] == t2[0] && t1[1] == t2[1] && t1[2] == t2[2] && t1[3] == t2[3]);
  }

  function getTimeArray(data) {
    if (!('hour' in data)) {
      return null;
    }
    var end = data.hour * 3600 + data.minute * 60 + data.duration;
    return [
      toTwoChar(data.hour),
      toTwoChar(data.minute),
      toTwoChar(Math.floor(end / 3600) % 24),
      toTwoChar(Math.floor(end / 60) % 60)];
  }

  function toTwoChar (int) {
    return int < 10 ? '0'+ int : int;
  }

  function getScheduleSkippedItem(weekday, skipped) {
    if (weekday && skipped instanceof Array) {
      for (var i = 0; i < skipped.length; ++i) {
        if (skipped[i].weekday == weekday) {
          return skipped[i];
        }
      }
    }
    return null;
  }

  function getDurationByTime(t) {
    if (t instanceof Array) {
      var start = (parseInt(t[0]) * 60 + parseInt(t[1])) * 60;
      var end = (parseInt(t[2]) * 60 + parseInt(t[3])) * 60;
      return end < start ? 86400 - start + end : end - start;
    }
    return 60 * 60 * 24;
  }

})();
