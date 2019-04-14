/**
 * Russian translation for bootstrap-year-calendar
 * Paul DAVID-SIVELLE
 * Based on
 * Russian translation for bootstrap-datepicker
 * Victor Taranenko <darwin@snowdale.com>
 */
"use strict";

var CALENDAR_RU_LOCALE = {
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  daysMin: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"],
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
    var self = this;
    self.group = $group;
    self.value = $group.data('value');
    self.month = $group.find('.month-calendar');
    self.year = $group.find('.year-calendar');
    self.monthSelector = $group.find('.month-select');
    self.yearOpener = $group.find('.year-calendar-opener');
    self.yearFrame = $group.find('.year-calendar-frame');
    self.yearCloser = self.yearFrame.find('.year-calendar-frame-close');
  };

  Calendar.prototype = {
    constructor: Calendar,

    init: function () {
      var self = this;
      var options = {
        language: lang,
        enableRangeSelection: true,
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
                self.schedulesToEvents(
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
        }
      };
      self.month.calendar(options);
      self.year.calendar(options);

      self.monthSelector.on('change', function () {
        self.selectMonth($(this).val());
      });

      self.yearOpener.on('click', function () {
        var cD = new Date();
        var minYear = cD.getFullYear();
        var maxYear = cD.getFullYear() + 2;
        self.year.data('calendar').setDataSource(self.schedulesToEvents(minYear, maxYear));
        self.year.data('calendar').setMinDate(new Date(minYear, 0, 1));
        self.year.data('calendar').setMaxDate(new Date(maxYear + 1, 0, 0));
        self.month.find('.calendar-header').hide();
        self.yearFrame.show();
      });

      self.yearCloser.on('click', function () {
        self.yearFrame.hide();
      });

      self.selectMonth(new Date().getMonth());
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
      this.monthSelector.val(month);

      calendar.setDataSource(this.schedulesToEvents(cD.getFullYear(), cD.getFullYear(), month));
      calendar.setMinDate(new Date(cD.getFullYear(), month, 1));
      calendar.setMaxDate(new Date(cD.getFullYear(), month + 1, 0));
      this.month.find('.month-container').hide().eq(month).show();
      this.month.find('.calendar-header').hide();
      this.month.find('.month-title').hide();
    },

    format: function (value) {
      var result = '';
      if (Array.isArray(value)) {
        result = '<ul>';
        for (var i = 0; i < value.length; i++) {
          result += '<li>' + scheduleToString(value[i]) + '</li>';
        }
        result += '</ul>';
      } else if (typeof value === 'object') {
        result = scheduleToString(value);
      }
      return result;
    }
  };

  function scheduleToString (schedule) {
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
      //TODO Exception
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
      every = 'Each';
      freq =  ' year';
    } else if ((year % 10 === 2 || year % 10 === 3) && year !== 12 && year !== 13) {
      every = 'Each';
      freq =  year + ' year';
    } else {
      every = 'Each';
      freq = year + ' year';
    }

    return (skipped ? 'Excluding ' + every.toLowerCase() : every) + ' ' + freq +
      ', ' + moment({month: month, minute: day}).locale(lang).format('DD MMMM') +
      (weekday ? ', if it is ' + CALENDAR_RU_LOCALE.days[weekday % 7] : '') + ', on ' +
      moment({hour: hour, minute: minute, second: second}).format('HH:mm:SS');
  }

  function everyYearString (month, day, weekday, hour, minute, second, skipped) {
    day = day || 1;
    hour = hour || 0;
    minute = minute || 0;
    second = second || 0;
    return (skipped ? 'Excluding each' : 'Each') + ' ' + CALENDAR_RU_LOCALE.months[month - 1] +
      ', ' + day + 'day' +
      (weekday ? ', if it is ' + CALENDAR_RU_LOCALE.days[weekday % 7] : '') + ', on ' +
      moment({hour: hour, minute: minute, second: second}).format('HH:mm:SS');
  }

  function everyMonthString (day, weekday, hour, minute, second, skipped) {
    hour = hour || 0;
    minute = minute || 0;
    second = second || 0;
    return (skipped ? 'Excluding each' : 'Each') + ' '  + day + ' date' +
      (weekday ? ', if it is ' + CALENDAR_RU_LOCALE.days[weekday % 7] : '') + ', on ' +
      moment({hour: hour, minute: minute, second: second}).format('HH:mm:SS');
  }

  function everyWeekString (weekday, hour, minute, second, skipped) {
    hour = hour || 0;
    minute = minute || 0;
    second = second || 0;
    var prefix = 'Each';
    if (weekday === 7) {
      prefix = 'Each';
    } else if (weekday === 3 || weekday === 5 || weekday === 6) {
      prefix = 'Each';
    }
    return (skipped ? 'Excluding ' + prefix.toLowerCase() : prefix) + ' ' +
      CALENDAR_RU_LOCALE.days[weekday % 7] + ', on ' +
      moment({hour: hour, minute: minute, second: second}).format('HH:mm:SS');
  }

  function everyDayString (hour, minute, second, skipped) {
    minute = minute || 0;
    second = second || 0;
    return (skipped ? 'Excluding each' : 'Each') + ' day, in ' +
      moment({hour: hour, minute: minute, second: second}).format('HH:mm:SS');
  }

  function everyHourString (minute, second, skipped) {
    second = second || 0;
    return (skipped ? 'Excluding each' : 'Each') + ' hour, на ' + minute + 'minute, ' + second + 'second';
  }

  function everyMinuteString (second, skipped) {
    return (skipped ? 'Excluding each' : 'Each') + ' minute ' + second + 'second';
  }

  function durationString (duration) {
    var hours = Math.round(duration / 3600);
    var minutes = Math.round(duration / 60) % 60;
    var seconds = duration % 60;
    return 'during'
      + (hours ? ' ' + hours + ' h' : '')
      + (minutes ? ' ' + minutes + ' m' : '')
      + (seconds ? ' ' + seconds + ' s' : '');
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
      recordToIntervals(events, schedule.occurs[i], schedule.description, schedule.item, color, minYear, maxYear, monthFilter, dateFilter);
    }
    for (var i = 0; i < schedule.skipped.length; i++) {
      recordToIntervals(skipped, schedule.skipped[i], schedule.description, schedule.item, null, minYear, maxYear, monthFilter, dateFilter);
    }
    for (var i = 0; i < skipped.length; i++) {
      cutInterval(events, skipped[i].realStartDate, skipped[i].realEndDate);
    }

    return events;
  }

  function recordToIntervals(target, record, name, item, color, firstYear, lastYear, monthFilter, dateFilter) {
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
                              name, item, color);
                          } else {
                            var startDate = new Date(year, month, date, hour, minute);
                            mergeInterval(target, startDate,
                              new Date(startDate.getTime() + ((record.duration || 60) * 1000)),
                              name, item, color);
                          }
                        }
                      } else {
                        var startDate = new Date(year, month, date, hour);
                        mergeInterval(target, startDate,
                          new Date(startDate.getTime() + ((record.duration || 60 * 60) * 1000)),
                          name, item, color);
                      }
                    }
                  } else {
                    var startDate = new Date(year, month, date);
                    var endDate = record.duration
                      ? new Date(startDate.getTime() + (record.duration * 1000))
                      : new Date(year, month, date + 1);
                    mergeInterval(target, startDate, endDate, name, item, color, !dateFilter);
                  }
                }
              }
            } else {
              var startDate = new Date(year, month, 1);
              var endDate = record.duration
                ? new Date(startDate.getTime() + (record.duration * 1000))
                : new Date(year, month + 1, 1);
              mergeInterval(target, startDate, endDate, name, item, color);
            }
          }
        }
      } else {
        var startDate = new Date(year, 0, 1);
        var endDate = record.duration
          ? new Date(startDate.getTime() + (record.duration * 1000))
          : new Date(year + 1, 0, 1);
        mergeInterval(target, startDate, endDate, name, item, color);
      }
    }
  }

  function mergeInterval (target, realStartDate, realEndDate, name, item, color, preventMerge) {
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
        name: name,
        item: item,
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
})();
