'use strict';

(function () {

  var MAX_INIT_ZOOM = 11;
  var ymapDeferred = $.Deferred();

  window.GeoCoord = function ($field, dataObject, fldMeta) {
    this.$field = $field;
    this.$geo = $field.closest('.geocoord');
    this.$fieldMap = this.$geo.find('.geocoord-field-map');
    this.$createBtn = this.$geo.find('.create-btn');
    this.$updateBtn = this.$geo.find('.update-btn');
    this.$modal = this.$geo.find('.modal');
    this.$modalMap = this.$modal.find('.geocoord-modal-map');
    this.$search = this.$modal.find('.search-group');
    this.$searchBtn = this.$search.find('.search-btn');
    this.$address = this.$search.find('.search-address');
    this.trySearch = this.$geo.data('trySearch');
    this.token = this.$geo.data('token');
    this.dataObject = dataObject;
    this.fldMeta = fldMeta;

    $field.data('geocoord', this);

    var self = this;

    this.$createBtn.click(function () {
      this.$modal.show();
      this.initModalMap();
    }.bind(this));

    this.$updateBtn.click(function () {
      this.$modal.show();
      this.coords = parseCoords($field.val());
      this.initModalMap();
    }.bind(this));

    this.$modal.find('.close').click(function () {
      this.$modal.hide();
    }.bind(this));

    this.$modal.find('.save-btn').click(function () {
      if (this.coords) {
        $field.val(JSON.stringify(this.coords));
        this.initFieldMap();
      }
      this.$geo.trigger(jQuery.Event("changed",
        {
          coords: this.coords
        })
      );
      this.$modal.hide();
    }.bind(this));

    this.$modal.on('click', '.set-coords-btn', function () {
      this.modalMap.balloon.close();
      this.coords = this.geojson.setPointByCoords(this.newCoords);
      drawJson(this.coords, this.modalMap);
    }.bind(this));

    this.$address.keydown(function (event) {
      event.keyCode === 13 && this.search();
    }.bind(this));

    this.$searchBtn.click(function () {
      this.search();
    }.bind(this));
  };

  GeoCoord.prototype = {
    constructor: GeoCoord,

    init: function () {
      this.coords = null;
      this.$updateBtn.hide();
      $.when(ymapDeferred).done(function () {
        this.initFieldMap();
        this.$geo.find('.geocoord-loader').hide();
        this.setValue(this.$field.val());
      }.bind(this));
      getYmaps(function () {
        ymaps.ready(function () {
          ymapDeferred.resolve();
        });
      });
    },

    initFieldMap: function () {
      if (this.coords) {
        this.$fieldMap.show();
        if (this.fieldMap)
          this.fieldMap.geoObjects.removeAll();
        else {
          var map = new ymaps.Map(this.$fieldMap.get(0), {
            center: [0, 0],
            zoom: 15,
            controls: []
          });
          map.controls.add('zoomControl', {
            position: {
              left: 10,
              top: 60
            }
          });
          this.fieldMap = map;
        }
        if (drawJson(this.coords, this.fieldMap)) {
          this.$createBtn.hide();
          this.$updateBtn.show();
        } else {
          this.$createBtn.show();
          this.$fieldMap.hide();
        }
      } else {
        this.$createBtn.show();
        this.$fieldMap.hide();
      }
    },

    initModalMap: function () {
      var map = this.modalMap;
      if (!map) {
        map = new ymaps.Map(this.$modalMap.get(0), {
          center: [0, 0],
          zoom: 15,
          controls: ['zoomControl', 'typeSelector', 'fullscreenControl']
        });
        this.modalMap = map;
        map.events.add('click', function (event) {
          this.showNewCoordsBalloon(event.get('coords'));
        }.bind(this));
      }
      this.getAddress(function (address) {
        //this.setLinkAddressByFields();
        this.$address.val(address);
        this.geojson = new GeoJson(this);
        if (!this.coords) {
          this.$searchBtn.click();
        }
      }.bind(this));
    },

    destroy: function () {

    },

    setModalMark: function (coords) {
      if (!coords) {
        return;
      }
      this.coords = coords;
      if (this.modalMark) {
        this.modalMark.geometry.setCoordinates(coords);
      } else {
        this.modalMark = new ymaps.Placemark(coords);
        this.modalMap.geoObjects.add(this.modalMark);
      }
      this.modalMark.properties.set('balloonContentHeader', __('js.geocoord.contentHeader'));
      //this.modalMark.properties.set('balloonContentBody', this.coords[0].toPrecision(6) +'<br>'+ this.coords[1].toPrecision(6));
    },

    showNewCoordsBalloon: function (coords) {
      this.newCoords = coords;
      this.modalMap.balloon.isOpen() && this.modalMap.balloon.close();
      this.modalMap.balloon.open(coords, {
        contentHeader: __('js.geocoord.contentHeader'),
        contentBody: '<div class="mt10">' + coords[0].toPrecision(8) + '</div>'
        + '<div class="mb10">' + coords[1].toPrecision(8) + '</div>'
        + '<button class="set-coords-btn btn btn-primary btn-sm" type="button">' + __('js.geocoord.set') + '</button>'
      }).then(function () {
        //this.modalMap.getZoom() > MAX_INIT_ZOOM && this.modalMap.setZoom(MAX_INIT_ZOOM);
      }.bind(this));
    },

    search: function () {
      this.$search.removeClass('has-error');
      var addr = this.$address.val().trim();
      if (addr.length < 1) return;
      this.$search.addClass('searching');
      resolveAddress(addr, this.token, function (coords) {
        this.$search.removeClass('searching');
        coords ? this.showNewCoordsBalloon(coords) : this.$search.addClass('has-error');
      }.bind(this));
    },

    setValue: function (value) {
      this.coords = parseCoords(value);
      //this.setLinkAddressByObject(object);
      //this.$address.val(this.linkAddress);
      ymapDeferred.state() == 'resolved' && this.initFieldMap();
    },

    getAddress: function (cb) {
      var address = '';
      if (this.fldMeta.tags && this.fldMeta.tags.length && this.dataObject) {
        var result = this.trySearch || [];
        var tmp, p;
        for (var i = 0; i < this.fldMeta.tags.length; i++) {
          if (this.fldMeta.tags[i].substr(0, 8) === 'tryfind:') {
            tmp = this.fldMeta.tags[i].substr(8);
            if (tmp[0] === '$') {
              if (this.dataObject.hasOwnProperty(tmp.substr(1))) {
                result[i] = this.dataObject[tmp.substr(1)];
              }
              continue;
            }
            result[i] = tmp;
          }
        }
        address = result.join(', ');
      }
      cb(address);
    }
  };

  function parseCoords (value) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  function resolveAddress (address, token, cb) {
    var GEOCODER_URL = 'https://geocode-maps.yandex.ru/1.x/?format=json&results=1&geocode=';
    var coords = null;
    var tokenParam = token ? '&apikey=' + token : '';
    $.get(GEOCODER_URL + address + tokenParam).done(function (result) {
      try {
        coords = result.response.GeoObjectCollection.featureMember[0].GeoObject.Point.pos.split(' ');
        coords = coords.length === 2 ? [ Number(coords[0]), Number(coords[1]) ] : null;
      } catch (err) {
        console.error(err);
      }
    }).fail(function (xhr) {
      console.error(xhr);
    }).always(function () {
      cb(coords);
    });
  } //*/

  function drawJson (data, map) {
    map.geoObjects.removeAll();
    try {
      var geoObjects = ymaps.geoQuery(data).addToMap(map);
      map.setBounds(map.geoObjects.getBounds(), { checkZoomRange: true }).then(function () {
        if (map.getZoom() > MAX_INIT_ZOOM) map.setZoom(MAX_INIT_ZOOM);
      });
      return true;
    } catch (err) {
      console.log(__('js.geocoord.invalidcoord'));
      return false;
    }
  }

  /*** GEO JSON ***/

  function GeoJson (geocoord) {
    this.geocoord = geocoord;
    this.$geojson = geocoord.$modal.find('.geojson');
    this.$overlay = this.$geojson.find('.overlay').hide();
    this.$text = this.$geojson.find('textarea');
    this.$verifyBtn = this.$geojson.find('.verify-json');
    this.$errorMsg = this.$geojson.find('.invalid-json');
    this.state = {
      error: false,
      modified: false
    };
    this.$text.val(geocoord.coords ? JSON.stringify(geocoord.coords) : '');

    var self = this;
    this.$verifyBtn.click(function (event) {
      self.verify(event);
    });
    this.$text.change(function () {
      if (!self.state.modified) {
        self.state.error = false;
        self.state.modified = true;
        self.render();
      }
    }).keyup(function (event) {
      if (!self.state.modified && (event.keyCode < 33 || event.keyCode > 40))
        this.$text.change();
    }.bind(this));
    this.verify();
  }

  GeoJson.prototype = {
    constructor: GeoJson,

    getText: function () {
      return $.trim(this.$text.val());
    },

    getJson: function () {
      try {
        return JSON.parse(this.getText());
      } catch (err) {
        return null;
      }
    },

    render: function () {
      this.$verifyBtn.removeClass('btn-default btn-success btn-danger btn-warning');
      var verifyClass = 'btn-default';
      if (this.state.error) {
        verifyClass = 'btn-danger';
      } else if (this.state.modified) {
        verifyClass = 'btn-warning';
      } else if (this.state.verified) {
        verifyClass = 'btn-success';
      }
      this.$verifyBtn.addClass(verifyClass);
      this.$errorMsg.toggle(this.state.error);
    },

    verify: function () {
      this.state.verified = false;
      this.state.error = false;
      this.state.modified = false;
      if (this.getText().length) {
        var data = this.getJson();
        if (data) {
          this.$overlay.show();
          this.validateGeoJson(data, function (err) {
            this.$overlay.hide();
            if (err) {
              this.state.error = true;
            } else {
              this.state.verified = true;
              this.geocoord.coords = data;
              drawJson(data, this.geocoord.modalMap);
            }
            this.render();
          }.bind(this));
        } else {
          this.state.error = true;
          this.render();
        }
      } else {
        this.state.verified = true;
        this.render();
      }
    },

    validateGeoJson: function (data, cb) {
      if (location.protocol === 'http:') {
        $.post('http://geojsonlint.com/validate', JSON.stringify(data), function (data) {
          cb(data.status != 'ok');
        }.bind(this));
      } else {
        console.log(__('js.geocoord.warning'));
        cb();
      }
    },

    setPointByCoords: function (coords) {
      var data = { type: 'Point', coordinates: coords };
      this.$text.val(JSON.stringify(data));
      this.state.verified = true;
      this.state.error = false;
      this.state.modified = false;
      this.render();
      return data;
    }
  };
})();
