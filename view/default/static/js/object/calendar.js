/**
 * Russian translation for bootstrap-year-calendar
 * Paul DAVID-SIVELLE
 * Based on
 * Russian translation for bootstrap-datepicker
 * Victor Taranenko <darwin@snowdale.com>
 */
"use strict";

var CALENDAR_RU_LOCALE = {
  days: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
  daysShort: ["Вск", "Пнд", "Втр", "Срд", "Чтв", "Птн", "Суб"],
  daysMin: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
  months: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
  monthsShort: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
  weekStart: 1
};
var lang = 'ru';

(function($){
  if ($.fn.calendar) {
    $.fn.calendar.dates['ru'] = CALENDAR_RU_LOCALE;
  }
}(jQuery));

(function () {

  window.Calendar = function ($group) {
    this.group = $group;
    this.$field = $group.find('.attr-value');
    this.value = [];
    this.month = $group.find('.month-calendar');
    this.year = $group.find('.year-calendar');
    this.monthSelector = $group.find('.month-select');
    this.yearOpener = $group.find('.year-calendar-opener');
    this.yearFrame = $group.find('.year-calendar-frame');
    this.eventFrame = $group.find('.event-frame');
    this.currentMonth = parseInt(new Date().getMonth());
  };

  Calendar.prototype = {
    constructor: Calendar,

    init: function () {
      var _this = this,
       options = {
        language: lang,
        enableContextMenu: true,
        enableRangeSelection: true,
        contextMenuItems: [
          {
            text: 'Редактировать',
            click: function(e) {
              _this.editEvent(e);
            }
          },
          {
            text: 'Удалить событие',
            click: function(e) {
              _this.deleteEvent(e.eventId, e.eventType, e.scheduleId);
            }
          },
          {
            text: 'Удалить расписание',
            click: function(e) {
              _this.deleteSchedule(e.scheduleId);
            }
          }
        ],
        dayContextMenu: function(e) {
          $(e.element).popover('hide');
        },
        mouseOnDay: function (e) {
          if (e.events.length > 0) {
            $(e.element).popover({
              title: moment(e.date).locale("ru").format('DD MMM'),
              trigger: 'manual',
              container: 'body',
              html: true,
              placement: 'bottom',
              content: getDetails(
                e.date,
                _this.schedulesToEvents(
                  e.date.getFullYear(),
                  e.date.getFullYear(),
                  e.date.getMonth(),
                  e.date.getDate()
                )
              )
            });

            $(e.element).popover('show');
          }
        },
        mouseOutDay: function (e) {
          $(e.element).popover('hide');
        },
        selectRange: function(e) {
          _this.editEvent({ startDate: e.startDate, endDate: e.endDate });
        }

      }; 

      var i, j, tmpValue = JSON.parse(this.$field.val() || null);

      if (Array.isArray(tmpValue)) {
        for (i = 0; i < tmpValue.length; i++) {
          tmpValue[i]._id = i;
          if (Array.isArray(tmpValue[i].occurs)) {
            for (j = 0; j < tmpValue[i].occurs.length; j++) {
              tmpValue[i].occurs[j]._id = j;
              tmpValue[i].occurs[j]._type = 'occurs';
            }
          }
          if (Array.isArray(tmpValue[i].skipped)) {
            for (j = 0; j < tmpValue[i].skipped.length; j++) {
              tmpValue[i].skipped[j]._id = j;
              tmpValue[i].skipped[j]._type = 'skipped';
            }
          }
          this.value.push(tmpValue[i]);
        }
      }

      this.year.calendar(options);
      this.month.calendar(options);

      $('body').on('DOMNodeInserted', '.calendar-context-menu', function () {
        $(this).css('z-index', 2000);
      });

      this.monthSelector.on('change', function () {
        _this.selectMonth($(this).val());
      });

      this.yearOpener.on('click', function () {
        let cD = new Date();
        let minYear = cD.getFullYear();
        let maxYear = cD.getFullYear() + 2;
        _this.year.data('calendar').setDataSource(_this.schedulesToEvents(minYear, maxYear));
        _this.year.data('calendar').setMinDate(new Date(minYear, 0, 1));
        _this.year.data('calendar').setMaxDate(new Date(maxYear + 1, 0, 0));
        _this.month.find('.calendar-header').hide();
        _this.yearFrame.modal();
      });

      this.selectMonth(this.currentMonth);

      this.eventFrame.find('.event-save').on('click', function() {
        _this.saveEvent();
      });

      this.eventFrame.find('.sch-save').on('click', function() {
        _this.saveSchedule();
      });

      this.eventFrame.find('.event-control').on('change', function(e){
        var $input = $(e.target),
          name = $input.attr('name').split('event-')[1];
        if (name && _this._event) {
          _this._event[name] = parseInt($input.val()) || 0;
        }
      });

      this.eventFrame.find('input[name="sch-description"]').on('change', function(e){
        if (_this._schedule) {
          _this._schedule.description = $(this).val();
        }
      });
    },

    getValue: function() {
      var i, result = [];
      if (Array.isArray(this.value)) {
        for (i = 0; i < this.value.length; i++) {
          result.push({
            description: this.value[i].description,
            item: this.value[i].item,
            occurs: getEventsValue(this.value[i].occurs),
            skipped: getEventsValue(this.value[i].skipped)
          })
        }
      }
      return result;
    },

    eventDiv: function(event) {
      return '<div class="event-item">' + scheduleRuleToString(event, event._type === 'skipped')
        + '<button class="edit-event btn btn-default"><span class="glyphicon glyphicon-pencil"'
        + 'data-id="' + event._id + '" data-type="' + event._type + '"'
        + 'title="Редактировать"></span></button>'
        + '<button class="del-event btn btn-default"><span class="glyphicon glyphicon-trash"'
        + 'data-id="' + event._id + '" data-type="' + event._type + '"'
        + 'title="Удалить"></span></button>'
        + '</div>';
    },

    bindSchedule: function(schedule, event) {
      var i, name,
        _this = this,
        html = '';
      this._schedule = schedule;
      this._event = event;
      this.eventFrame.find('input').val('');
      this.eventFrame.find('input[name="sch-description"]').val(schedule.description);
      this.eventFrame.find('select[name="event-type"]').val(event._type || 'occurs');

      for (name in event) {
        if (event.hasOwnProperty(name)) {
          this.eventFrame.find('input[name="event-' + name + '"]').val(parseInt(this._event[name]) || null);
        }
      }
      for (i = 0; i < schedule.occurs.length; i++) {
        html += this.eventDiv(schedule.occurs[i]);
      }
      this.eventFrame.find('.sch-occurs-container').empty().html(html);

      html = '';
      for (var i = 0; i < schedule.skipped.length; i++) {
        html += this.eventDiv(schedule.skipped[i]);
      }
      this.eventFrame.find('.sch-skipped-container').empty().html(html);

      this.eventFrame.find('.edit-event').on('click', function(e){
        var i, event,
          $target = $(e.target),
          id = $target.data('id'),
          type = $target.data('type'),
          index = _this._getIndexById(_this._schedule[type], id),
          event = typeof index !== 'undefined'
            ? _this._schedule[type][index]
            : _this.newEvent();
        _this.bindSchedule(_this._schedule, event);
      });

      this.eventFrame.find('.del-event').on('click', function(e){
        var i, eventIndex,
          $target = $(e.target),
          id = $target.data('id'),
          type = $target.data('type');
        _this._spliceById(_this._schedule[type], id);
        _this.bindSchedule(_this._schedule, _this._event);
      });
    },

    newEvent: function (duration) {
      return {
        _id: null,
        _type: null,
        duration: duration,
        year: null,
        month: null,
        weekday: null,
        day: null,
        hour: null,
        minute: null,
        second: null
      };
    },

    newSchedule: function() {
      return {
        _id: null,
        description: '',
        item: '',
        occurs: [],
        skipped: []
      };
    },

    editEvent: function(interval) {
      var i,
        duration = Math.round(moment(interval.endDate).diff(interval.startDate) / 1000),
        schedule = this.newSchedule(),
        event = this.newEvent(duration);
      if (typeof interval.scheduleId !== 'undefined') {
        for (i = 0; i < this.value.length; i++) {
          if (this.value[i]._id === interval.scheduleId) {
            schedule._id = this.value[i]._id;
            schedule.description = this.value[i].description;
            schedule.occurs = this.value[i].occurs;
            schedule.skipped = this.value[i].skipped;
            break;
          }
        }
      }
      if (interval.eventType && Array.isArray(schedule[interval.eventType])) {
        for (i = 0; i < schedule[interval.eventType].length; i++) {
          if (schedule[interval.eventType][i]._id === interval.eventId) {
            event = schedule[interval.eventType][i];
          }
        }
      }
      this.bindSchedule(schedule, event);
      this.eventFrame.modal();
    },

    _getIndexById: function(array, id) {
      var i, index;
      if (array && array.length) {
        for (i = 0; i < array.length; i++) {
          if (array[i]._id === id) {
            index = i;
          }
        }
      }
      return index;
    },

    _spliceById: function(array, id) {
      var index = this._getIndexById(array, id);
      if (typeof index !== 'undefined') {
        array.splice(index, 1);
      } 
    },

    deleteEvent: function(eventId, type, scheduleId) {
      var i, schedule, tmp = [];

      for (i = 0; i < this.value.length; i++) {
        if (this.value[i]._id === scheduleId) {
          schedule = this.value[i];
        }
      }
      if (schedule) {
        this._spliceById(schedule[type], eventId);
        this.selectMonth(this.currentMonth);
      }
    },

    deleteSchedule: function(scheduleId) {
      this._spliceById(this.value, scheduleId);
      this.selectMonth(this.currentMonth);
    },

    saveEvent: function() {
      var i, type = this.eventFrame.find('select[name="event-type"]').val();
      if (!checkScheduleRule(this._event)) {
        alert('Неверные настройки события');
        return;
      }
      if (this._event && this._schedule) {
        if (this._event._type && this._event._type !== type) {
          this._spliceById(this._schedule[this._event._type], this._event._id);
          this._event._type = type;
          this._event._id = this._schedule[type].length;
          this._schedule[type].push(this._event);
        } else {
          this._event._type = type;
          if (typeof this._event._id === 'undefined' || this._event._id === null) {
            this._event._id = this._schedule[type].length;
            this._schedule[type].push(this._event);
          } else {
            for (i = 0; i < this._schedule[type].length; i++) {
              if (this._schedule[type][i]._id == this._event._id) {
                this._schedule[type][i] == this._event;
              }
            }   
          }
        }
      }
      this.bindSchedule(this._schedule, this.newEvent());
    },

    saveSchedule: function() {
      var schIndex = this._getIndexById(this.value, this._schedule._id);
      if (typeof schIndex !== 'undefined') {
        this.value[schIndex] = this._schedule;
      } else {
        this.value.push(this._schedule);
      }
      this.selectMonth(this.currentMonth);
      this.group.trigger('change');
      this.eventFrame.modal('hide');
    }, 

    schedulesToEvents: function (minYear, maxYear, monthFilter, dateFilter) {
      var ds = [];
      if (this.value) {
        if (Array.isArray(this.value)) {
          for (var i = 0; i < this.value.length; i++) {
            if (!this.value[i].color) {
              this.value[i].color = randomColor({luminosity: 'light'});
            }
            Array.prototype.push.apply(ds, scheduleToEvents(this.value[i], this.value[i].color, minYear, maxYear, monthFilter, dateFilter));
          }
        } else if (typeof this.value === 'object') {
          if (!this.value.color) {
            this.value.color = randomColor({luminosity: 'light'});
          }
          ds = scheduleToEvents(this.value, this.value.color, minYear, maxYear, monthFilter, dateFilter);
        }
      }

      return ds;
    },

    selectMonth: function (month) {
      month = parseInt(month);
      var cD = new Date();
      var calendar = this.month.data('calendar');
      var minYear = cD.getFullYear();
      var maxYear = cD.getFullYear() + 2;
      this.monthSelector.val(month);

      calendar.setDataSource(this.schedulesToEvents(minYear, minYear, month));
      calendar.setMinDate(new Date(cD.getFullYear(), month, 1));
      calendar.setMaxDate(new Date(cD.getFullYear(), month + 1, 0));

      this.month.find('.month-container').hide().eq(month).show();
      this.month.find('.calendar-header').hide();
      this.month.find('.month-title').hide();

      this.year.data('calendar').setDataSource(this.schedulesToEvents(minYear, maxYear));
      this.year.data('calendar').setMinDate(new Date(minYear, 0, 1));
      this.year.data('calendar').setMaxDate(new Date(maxYear + 1, 0, 0));
    },

    format: function (value) {
      var result = '';
      if (Array.isArray(value)) {
        result = '<ul>';
        for (var i = 0; i < value.length; i++) {
          result += '<li>' + scheduleToHtml(value[i]) + '</li>';
        }
        result += '</ul>';
      } else if (typeof value === 'object') {
        result = scheduleToHtml(value);
      }
      return result;
    }
  };

  function scheduleToHtml (schedule) {
    var result = schedule.description + '(' + schedule.item + ')<ul>';
    for (var i = 0; i < schedule.occurs.length; i++) {
      result += '<li>' +scheduleRuleToString(schedule.occurs[i]) + '</li>';
    }
    if (schedule.skipped.length) {
      for (var i = 0; i < schedule.skipped.length; i++) {
        result += '<li>' +scheduleRuleToString(schedule.skipped[i], true) + '</li>';
      }
    }
    return result + '</ul>';
  }

  function scheduleRuleToString (rule, skipped) {
    var result = '';
    if (rule.year === parseInt(rule.year, 10)) {
      result = someYearsString(rule.year, rule.month, rule.day, rule.weekday, rule.hour, rule.minute, rule.second, skipped);
    } else if (rule.month === parseInt(rule.month, 10)
      && rule.month >= 1 && rule.month <= 12) {
      result = everyYearString(rule.month, rule.day, rule.weekday, rule.hour, rule.minute, rule.second, skipped);
    } else if (rule.day === parseInt(rule.day, 10)
      && rule.day >= 1 && rule.day <= 31) {
      result = everyMonthString(rule.day, rule.weekday, rule.hour, rule.minute, rule.second, skipped);
    } else if (rule.weekday === parseInt(rule.weekday, 10)
      && rule.weekday >= 1 && rule.weekday <= 7) {
      result = everyWeekString(rule.weekday, rule.hour, rule.minute, rule.second, skipped);
    } else if (rule.hour === parseInt(rule.hour, 10)
      && rule.hour >= 0 && rule.hour <= 23) {
      result = everyDayString(rule.hour, rule.minute, rule.second, skipped);
    } else if (rule.minute === parseInt(rule.minute, 10)
      && rule.minute >= 0 && rule.minute <= 59) {
      result = everyHourString(rule.minute, rule.second, skipped);
    } else if (rule.second === parseInt(rule.second, 10)
      && rule.second >= 0 && rule.second <= 59) {
      result = everyMinuteString(rule.second, skipped);
    } else {
      //TODO Исключение
    }
    return result + (rule.duration ? ', ' + durationString(rule.duration) : '');
  }

  function someYearsString (year, month, day, weekday, hour, minute, second, skipped) {
    if (year === 1 && month) {
      return everyYearString(month, day, weekday, hour, minute, second, skipped);
    }

    month = month || 0;
    day = day || 1;
    hour = hour || 0;
    minute = minute || 0;
    second = second || 0;

    var every = '';
    var freq = '';
    if (year % 10 === 1 && year !== 11) {
      every = 'Каждый';
      freq =  ' год';
    } else if ((year % 10 === 2 || year % 10 === 3) && year !== 12 && year !== 13) {
      every = 'Каждые';
      freq =  year + ' года';
    } else {
      every = 'Каждые';
      freq = year + ' лет';
    }

    return (skipped ? 'Исключая ' + every.toLowerCase() : every) + ' ' + freq +
      ', ' + moment({month: month, minute: day}).locale(lang).format('DD MMMM') +
      (weekday ? ', если это ' + CALENDAR_RU_LOCALE.days[weekday % 7] : '') + ', в ' +
      moment({hour: hour, minute: minute, second: second}).format('HH:mm:SS');
  }

  function everyYearString (month, day, weekday, hour, minute, second, skipped) {
    day = day || 1;
    hour = hour || 0;
    minute = minute || 0;
    second = second || 0;
    return (skipped ? 'Исключая каждый' : 'Каждый') + ' ' + CALENDAR_RU_LOCALE.months[month - 1] +
      ', ' + day + '-ого числа' +
      (weekday ? ', если это ' + CALENDAR_RU_LOCALE.days[weekday % 7] : '') + ', в ' +
      moment({hour: hour, minute: minute, second: second}).format('HH:mm:SS');
  }

  function everyMonthString (day, weekday, hour, minute, second, skipped) {
    hour = hour || 0;
    minute = minute || 0;
    second = second || 0;
    return (skipped ? 'Исключая каждое' : 'Каждое') + ' '  + day + ' число' +
      (weekday ? ', если это ' + CALENDAR_RU_LOCALE.days[weekday % 7] : '') + ', в ' +
      moment({hour: hour, minute: minute, second: second}).format('HH:mm:SS');
  }

  function everyWeekString (weekday, hour, minute, second, skipped) {
    hour = hour || 0;
    minute = minute || 0;
    second = second || 0;
    var prefix = 'Каждый';
    if (weekday === 7) {
      prefix = 'Каждое';
    } else if (weekday === 3 || weekday === 5 || weekday === 6) {
      prefix = 'Каждую';
    }
    return (skipped ? 'Исключая ' + prefix.toLowerCase() : prefix) + ' ' +
      CALENDAR_RU_LOCALE.days[weekday % 7] + ', в ' +
      moment({hour: hour, minute: minute, second: second}).format('HH:mm:SS');
  }

  function everyDayString (hour, minute, second, skipped) {
    minute = minute || 0;
    second = second || 0;
    return (skipped ? 'Исключая каждый' : 'Каждый') + ' день, в ' +
      moment({hour: hour, minute: minute, second: second}).format('HH:mm:SS');
  }

  function everyHourString (minute, second, skipped) {
    second = second || 0;
    return (skipped ? 'Исключая каждый' : 'Каждый') + ' час, на ' + minute + '-ой минуте, ' + second + '-ой секунде';
  }

  function everyMinuteString (second, skipped) {
    return (skipped ? 'Исключая каждую' : 'Каждую') + ' минуту, на ' + second + '-ой секунде';
  }

  function durationString (duration) {
    var hours = Math.round(duration / 3600);
    var minutes = Math.round(duration / 60) % 60;
    var seconds = duration % 60;
    return 'в течении'
      + (hours ? ' ' + hours + ' ч' : '')
      + (minutes ? ' ' + minutes + ' м' : '')
      + (seconds ? ' ' + seconds + ' с' : '');
  }

  function getDetails(date, events) {
    var list = {};
    var result = '';
    for (var i = 0; i < events.length; i++) {
      var endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      if (events[i].realStartDate.getTime() < endOfDay.getTime() &&
        events[i].realEndDate.getTime() > date.getTime()) {
        if(!list[events[i].name]) {
          list[events[i].name] = '<span class="event-title">' + events[i].name + '(' + events[i].item + ')</span>';
        }
        var left = events[i].realStartDate.getTime() - date.getTime();
        var right = endOfDay.getTime() - events[i].realEndDate.getTime();
        list[events[i].name] +=
          '<div class="event-interval" style="left: ' + (left > 0 ? (Math.floor(left/1000/60/60/24*100)) : 0) +
          ';right: ' + (right > 0 ? (Math.floor(right/1000/60/60/24*100)) : 0) +
          ';background-color: ' + events[i].color + '"></div>';
      }
    }
    for (var i in list) {
      result += '<li class="event">' + list[i] + '</li>';
    }
    return '<ul class="event-list">' + result + '</ul>';
  }

  function scheduleToEvents(schedule, color, minYear, maxYear, monthFilter, dateFilter) {
    var events = [];
    var skipped = [];
    for (var i = 0; i < schedule.occurs.length; i++) {
      recordToIntervals(events, schedule.occurs[i], schedule, color, minYear, maxYear, monthFilter, dateFilter);
    }
    for (var i = 0; i < schedule.skipped.length; i++) {
      recordToIntervals(skipped, schedule.skipped[i], schedule, null, minYear, maxYear, monthFilter, dateFilter);
    }
    for (var i = 0; i < skipped.length; i++) {
      cutInterval(events, skipped[i].realStartDate, skipped[i].realEndDate);
    }

    return events;
  }

  function recordToIntervals(target, record, schedule, color, firstYear, lastYear, monthFilter, dateFilter) {
    firstYear = parseInt(firstYear);
    lastYear = parseInt(lastYear);
    var yearStep = record.year || 1;
    for (var year = firstYear; year <= lastYear; year = year + yearStep) {
      if (record.month || record.day || record.weekday || record.hour || record.hour === 0 || record.minute || record.second) {
        var firstMonth = record.month || 1;
        var lastMonth = record.month || 12;
        for (var month = firstMonth - 1; month < lastMonth; month++) {
          if (!monthFilter || month === monthFilter) {
            if (record.day || record.weekday || record.hour || record.hour === 0 || record.minute || record.second) {
              var firstDate = record.day || 1;
              var lastDate = record.day || new Date(year, month + 1, 0).getDate();
              for (var date = firstDate; date <= lastDate; date++) {
                if ((!dateFilter || date === dateFilter) &&
                  (!record.weekday || new Date(year, month, date).getDay() === record.weekday%7)) {
                  if (dateFilter && (record.hour || record.hour === 0 || record.minute || record.second)) {
                    var firstHour = (record.hour || record.hour === 0) ? record.hour : 0;
                    var lastHour = (record.hour || record.hour === 0) ? record.hour : 23;
                    for (var hour = firstHour; hour <= lastHour; hour++) {
                      if (record.minute || record.second) {
                        var firstMinute = record.minute ? record.minute - 1 : 0;
                        var lastMinute = record.minute ? record.minute - 1 : 59;
                        for (var minute = firstMinute; minute <= lastMinute; minute++) {
                          if (record.second) {
                            var startDate = new Date(year, month, date, hour, minute, record.second - 1);
                            mergeInterval(target, startDate,
                              new Date(startDate.getTime() + ((record.duration || 1) * 1000)),
                              record, schedule, color);
                          } else {
                            var startDate = new Date(year, month, date, hour, minute);
                            mergeInterval(target, startDate,
                              new Date(startDate.getTime() + ((record.duration || 60) * 1000)),
                              record, schedule, color);
                          }
                        }
                      } else {
                        var startDate = new Date(year, month, date, hour);
                        mergeInterval(target, startDate,
                          new Date(startDate.getTime() + ((record.duration || 60 * 60) * 1000)),
                          record, schedule, color);
                      }
                    }
                  } else {
                    var startDate = new Date(year, month, date);
                    var endDate = record.duration
                      ? new Date(startDate.getTime() + (record.duration * 1000))
                      : new Date(year, month, date + 1);
                    mergeInterval(target, startDate, endDate, record, schedule, color, !dateFilter);
                  }
                }
              }
            } else {
              var startDate = new Date(year, month, 1);
              var endDate = record.duration
                ? new Date(startDate.getTime() + (record.duration * 1000))
                : new Date(year, month + 1, 1);
              mergeInterval(target, startDate, endDate, record, schedule, color);
            }
          }
        }
      } else {
        var startDate = new Date(year, 0, 1);
        var endDate = record.duration
          ? new Date(startDate.getTime() + (record.duration * 1000))
          : new Date(year + 1, 0, 1);
        mergeInterval(target, startDate, endDate, record, schedule, color);
      }
    }
  }

  function mergeInterval (target, realStartDate, realEndDate, record, schedule, color, preventMerge) {
    if (realStartDate.getTime() < realEndDate.getTime()) {
      for (var i = target.length - 1; i >= 0; i--) {
        var needDelete = false;
        if (realStartDate.getTime() >= target[i].realStartDate.getTime()
          && realStartDate.getTime() <= target[i].realEndDate.getTime()) {
          realStartDate = target[i].realStartDate;
          needDelete = true;
        }
        if (realEndDate.getTime() >= target[i].realStartDate.getTime()
          && realEndDate.getTime() <= target[i].realEndDate.getTime()) {
          realEndDate = target[i].realEndDate;
          needDelete = true;
        }
        if (needDelete) {
          target.splice(i, 1);
        }
      }
      target.push({
        eventId: record._id,
        eventType: record._type,
        scheduleId: schedule._id,
        name: schedule.description,
        item: schedule.item,
        color: color,
        realStartDate: realStartDate,
        realEndDate: realEndDate,
        startDate: new Date(realStartDate.getFullYear(), realStartDate.getMonth(), realStartDate.getDate()),
        endDate: new Date(realEndDate.getTime() - 1),
        preventMerge: preventMerge
      });
    }
  }

  function cutInterval (target, startDate, endDate) {
    if (startDate.getTime() < endDate.getTime()) {
      for (var i = target.length - 1; i >= 0; i--) {
        if (!target[i].preventMerge) {
          if (startDate.getTime() <= target[i].realStartDate.getTime()
            && endDate.getTime() >= target[i].realEndDate.getTime()) {
            target.splice(i, 1);
          } else if (startDate.getTime() >= target[i].realStartDate.getTime()
            && endDate.getTime() <= target[i].realEndDate.getTime()) {
            target.push({
              eventId: target[i].eventId,
              eventType: target[i].eventType,
              scheduleId: target[i].scheduleId,
              name: target[i].name,
              item: target[i].item,
              color: target[i].color,
              realStartDate: endDate,
              startDate: new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()),
              realEndDate: target[i].endDate,
              endDate: new Date(target[i].endDate.getTime() - 1)
            });
            target[i].realEndDate = startDate;
            target[i].endDate = new Date(startDate.getTime() - 1);
          } else if (startDate.getTime() >= target[i].realStartDate.getTime()
            && startDate.getTime() <= target[i].realEndDate.getTime()) {
            target[i].realEndDate = startDate;
            target[i].endDate = new Date(startDate.getTime() - 1);
          } else if (endDate.getTime() >= target[i].realStartDate.getTime()
            && endDate.getTime() <= target[i].realEndDate.getTime()) {
            target[i].realStartDate = endDate;
            target[i].startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
          }
        }
      }
    }
  }

  function isSchedule (schedule) {
    if (schedule.hasOwnProperty('description') && typeof schedule.description === 'string' &&
      schedule.hasOwnProperty('item') && typeof schedule.item === 'string' &&
      schedule.hasOwnProperty('occurs') && Array.isArray(schedule.occurs) &&
      schedule.hasOwnProperty('skipped') && Array.isArray(schedule.skipped)) {
      for (let i = 0; i < schedule.occurs.length; i++) {
        if (!checkScheduleRule(schedule.occurs[i])) {
          return false;
        }
      }
      for (let i = 0; i < schedule.skipped.length; i++) {
        if (!checkScheduleRule(schedule.skipped[i])) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  function checkScheduleRule(rule) {
    return !!((!rule.duration || !isNaN(rule.duration)) &&
      (!rule.second   || !isNaN(rule.second) && rule.second >= 1 && rule.second <= 60) &&
      (!rule.minute   || !isNaN(rule.minute) && rule.minute >= 1 && rule.minute <= 60) &&
      (!rule.hour     || !isNaN(rule.hour) && rule.hour >= 0 && rule.hour <= 23) &&
      (!rule.day      || !isNaN(rule.day) && rule.day >= 1 && rule.day <= 31) &&
      (!rule.weekday  || !isNaN(rule.weekday) && rule.weekday >= 1 && rule.weekday <= 7) &&
      (!rule.month    || !isNaN(rule.month) && rule.month >= 1 && rule.month <= 12) &&
      (!rule.year     || !isNaN(rule.year)) &&
      (rule.second || rule.minute || rule.hour || rule.day || rule.weekday || rule.month || rule.year));
  }

  function getEventsValue(events) {
    var i, result = [];
    if (Array.isArray(events)) {
      for (i = 0; i < events.length; i++) {
        result.push({
          duration: events[i].duration,
          year: events[i].year,
          month: events[i].month,
          weekday: events[i].weekday,
          day: events[i].day,
          hour: events[i].hour,
          minute: events[i].minute,
          second: events[i].second
        });
      }
    }
    return result;
  }
})();
