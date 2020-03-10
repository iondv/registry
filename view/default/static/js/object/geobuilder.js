'use strict';

(function () {

  var MAX_INIT_ZOOM = 12;
  var ymapDeferred = $.Deferred();

  // GEO BUILDER

  window.GeoBuilder = function ($field) {
    this.$field = $field;
    this.$builder = $field.closest('.geobuilder');
    this.$createBtn = this.$builder.find('.create-btn');
    this.$updateBtn = this.$builder.find('.update-btn');
    this.$fieldMap = this.$builder.find('.field-map');
    this.$modal = this.$builder.find('.modal');
    this.$modalMap = this.$modal.find('.modal-map');
    this.$tools = this.$builder.find('.shape-tool');
    this.$setups = this.$builder.find('.shape-setup');
    this.$importBtn = this.$modal.find('.import-btn');
    this.$exportBtn = this.$modal.find('.export-btn');
    this.$exportData = this.$modal.find('.export-data');
    this.$invalidJson = this.$modal.find('.invalid-json');

    $field.data('geobuilder', this);

    this.$createBtn.click(function () {
      this.$modal.show();
      this.initModalMap();
    }.bind(this));

    this.$updateBtn.click(function () {
      this.setGeoData($field.val());
      this.$modal.show();
      this.initModalMap();
    }.bind(this));

    this.$exportData.keyup(function () {
      this.$invalidJson.hide();
    }.bind(this));

    this.$exportBtn.click(function () {
      var data = this.exportJson();
      this.$exportData.val(data ? JSON.stringify(data) : '');
    }.bind(this));

    this.$importBtn.click(function () {
      this.$invalidJson.hide();
      if (confirm(__('js.geobuilder.confirmImport'))) {
        this.setGeoData(this.$exportData.val());
        if (!this.importJson(this.geodata))  {
          this.$invalidJson.show();
        }
      }
    }.bind(this));

    this.$modal.find('.close').click(function () {
      this.$modal.hide();
    }.bind(this));

    var $colorPicker = this.$modal.find('.color-picker');

    this.$modal.on('click', function (ev) {
      if (!$(ev.target).hasClass('has-color-picker'))
        $colorPicker.hide();
    });

    this.$modal.on('click', '.has-color-picker', function () {
      var $target = $(this);
      var pos = $target.offset();
      $colorPicker.show().offset({ left: pos.left, top: pos.top + 30 });
      $colorPicker.data('target', $target);
    });

    this.$modal.on('click', '.color-picker-item', function () {
      var $item = $(this);
      var $picker = $item.closest('.color-picker').hide();
      $picker.data('target').val($item.data('color'));
    });

    this.$modal.find('.save-btn').click(function () {
      this.geodata = this.exportJson();
      $field.val(this.geodata ? JSON.stringify(this.geodata) : '');
      this.initFieldMap();
      this.$builder.trigger(jQuery.Event("changed",
        {
          geodata: this.geodata
        })
      );
      this.$modal.hide();
    }.bind(this));
  };

  GeoBuilder.prototype = {
    constructor: GeoBuilder,

    init: function () {
      this.geodata = null;
      this.$updateBtn.hide();
      $.when(ymapDeferred).done(function () {
        this.initFieldMap();
        this.$builder.find('.geobuilder-loader').hide();
        this.setValue(this.$field.val());
      }.bind(this));
      getYmaps(function () {
        ymaps.ready(function () {
          ymapDeferred.resolve();
        });
      });
    },

    initFieldMap: function () {
      if (this.geodata) {
        this.$fieldMap.show();
        if (this.fieldMap)
          this.fieldMap.geoObjects.removeAll();
        else {
          var map = new ymaps.Map(this.$fieldMap.get(0), {
            center: [0, 0],
            zoom: 15,
            controls: ['fullscreenControl']
          });
          map.controls.add('zoomControl', {position: {left: 10, top: 60}});
          this.fieldMap = map;
        }
        if (this.drawJson(this.geodata, this.fieldMap)) {
          this.$createBtn.hide();
          this.$updateBtn.show();
        } else {
          this.$createBtn.show();
          this.$fieldMap.hide();
        }
      } else {
        this.$createBtn.show();
        this.$updateBtn.hide();
        this.$fieldMap.hide();
      }
    },

    initModalMap: function (startCoords) {
      this.activeTool = null;
      if (this.modalMap) {
        this.modalMap.destroy();
      }
      this.modalMap = new ymaps.Map(this.$modalMap.get(0), {
        center: startCoords || [135.11,48.46],
        zoom: 10,
        controls: ['fullscreenControl', 'zoomControl', 'rulerControl']
      });
      this.modalMap.controls.add('typeSelector', {
        float: 'right'
      });
      this.modalMap.controls.add('searchControl', {
        float: 'right',
        size: 'small',
        floatIndex: 1
      });
      this.resetBtn = new ymaps.control.Button({
        data: {
          image: '/registry/img/geobuilder/icon-reset.svg',
          title: __('js.geobuilder.deleteAll')
        },
        options: {
          selectOnClick: false
        }
      });
      this.boundBtn = new ymaps.control.Button({
        data: {
          image: '/registry/img/geobuilder/icon-bound.svg',
          title: __('js.geobuilder.center')
        },
        options: {
          selectOnClick: false
        }
      });
      this.modalMap.controls.add(this.boundBtn, { float: 'left'});
      this.tools = {
        point: new PointTool(this),
        line: new LineTool(this),
        polygon: new PolygonTool(this),
        circle: new CircleTool(this)
      };
      this.modalMap.controls.add(this.resetBtn, { float: 'left'});
      this.resetBtn.events.add('click', this.onReset, this);
      this.boundBtn.events.add('click', this.onBound, this);
      this.modalMap.events.add('click', this.onClickMap, this);
      this.importJson(this.geodata);
    },

    setGeoData: function (value) {
      this.geodata = null;
      if (typeof value == 'string') {
        try {
        value = JSON.parse(value);
        } catch (err) {
          console.error(err, value);
        }
      }

      if (value && typeof value == 'object') {
        this.geodata = value;
      }
    },

    setValue: function (value) {
      this.$field.val(value);
      this.setGeoData(value);
      ymapDeferred.state() == 'resolved' && this.initFieldMap();
    },

    setActiveTool: function (tool) {
      this.activeTool = tool;
      if (tool) {
        this.setActiveShape(new tool.Shape(tool));
        this.activeShape.startDrawing();
      } else {
        this.setActiveShape(null);
      }
    },

    setActiveShape: function (shape) {
      if (this.activeShape) {
        this.activeShape.stopDrawing();
        this.activeShape.stopEditing();
        this.activeShape = null;
        this.modalMap.balloon.close();
      }
      if (shape) {
        shape.startEditing();
        this.activeShape = shape;
      } else {
        this.resetActiveTool();
      }
    },

    resetActiveTool: function () {
      if (this.activeTool) {
        this.activeTool.btn.deselect();
        this.activeTool = null;
      }
    },

    onClickMap: function () {
      this.setActiveShape(null);
    },

    onReset: function () {
      if (confirm(__('js.geobuilder.confirmDeleteAll'))) {
        this.modalMap.geoObjects.removeAll();
      }
    },

    onBound: function () {
      this.setAutoBounds();
    },

    importJson: function (data) {
      this.setActiveShape(null);
      this.modalMap.geoObjects.removeAll();
      if (!data) {
        return true;
      }
      var features = data.features;
      if (features instanceof Array) {
        var valid = true;
        for (var i = 0; i < features.length; ++i) {
          if (this.validateObjectJson(features[i])) {
            this.importObject(this.filterImported(features[i]));
          } else {
            valid = false;
          }
        }
        return valid;
      } else if (data.type && data.coordinates) {
        return this.importObject({ geometry: data, properties: {} });
      } else {
        console.log(__('js.geobuilder.invalidJson'), data);
        return false;
      }
    },

    validateObjectJson: function (data) {
      if (data && data.geometry && data.geometry.coordinates && data.properties) {
        return true;
      }
      console.log(__('js.geobuilder.invalidJson'), data);
      return false;
    },

    filterImported: function (data) {
      if (data.properties && data.properties.ymapSource) {
        switch (data.properties.ymapSource.type) {
          case 'Circle':
            data.geometry = data.properties.ymapSource.geometry;
            break;
        }
      }
      return data;
    },

    importObject: function (data) {
      var circle = null;
      switch (data.geometry.type) {
        case 'Point':
          new PointShape(this.tools.point, data);
          break;
        case 'LineString':
          new LineShape(this.tools.line, data);
          break;
        case 'Polygon':
          new PolygonShape(this.tools.polygon, data);
          break;
        case 'Circle':
          circle = new CircleShape(this.tools.circle, data);
          break;
        default:
          console.error(__('js.geobuilder.unknownType'), data);
          return false;
      }
      setTimeout(function () {
        this.setAutoBounds(null, function () {
          // fix radius line jumping
          if (circle) {
            this.setActiveShape(circle);
            this.setActiveShape(null);
          }
        });
      }.bind(this), 100);
      return true;
    },

    setAutoBounds: function (maxZoom, cb) {
      if (this.modalMap.geoObjects.getLength() > 0) {
        maxZoom = maxZoom || MAX_INIT_ZOOM;
        this.modalMap.setBounds(this.modalMap.geoObjects.getBounds(), {
          checkZoomRange: true
        }).then(function () {
          if (this.modalMap.getZoom() > maxZoom) {
            this.modalMap.setZoom(maxZoom);
          }
          cb && cb.call(this);
        }.bind(this));
      }
    },

    exportJson: function () {
      var features = [];
      this.modalMap.geoObjects.each(function (object) {
        var coords = object.geometry.getCoordinates();
        if (coords && coords.length) {
          features.push(this.exportObject(object));
        }
      }, this);
      return features.length ? {
        type: 'FeatureCollection',
        features: features
      } : {};
    },

    exportObject: function (object) {
      var geometry = {
        type: object.geometry.getType(),
        coordinates: object.geometry.getCoordinates()
      };
      var properties = {};
      var options = {};
      this.assignProp('hintContent', object.properties, properties);
      switch (object.geometry.getType()) {
        case 'Point':
          options.preset = object.options.get('preset');
          options.iconColor = object.options.get('iconColor');
          break;

        case 'LineString':
          options.strokeColor = object.options.get('strokeColor');
          options.strokeOpacity = object.options.get('strokeOpacity');
          options.strokeWidth = object.options.get('strokeWidth');
          break;

        case 'Polygon':
          options.fillColor = object.options.get('fillColor');
          options.fillOpacity = object.options.get('fillOpacity');
          options.strokeColor = object.options.get('strokeColor');
          options.strokeOpacity = object.options.get('strokeOpacity');
          options.strokeWidth = object.options.get('strokeWidth');
          break;

        case 'Circle':
          geometry.radius = object.geometry.getRadius();
          properties.ymapSource = {
            type: 'Circle',
            geometry: geometry
          };
          properties.radius_units = 'm';
          options.fillColor = object.options.get('fillColor');
          options.fillOpacity = object.options.get('fillOpacity');
          options.strokeColor = object.options.get('strokeColor');
          options.strokeOpacity = object.options.get('strokeOpacity');
          options.strokeWidth = object.options.get('strokeWidth');
          geometry = {
            type: 'Polygon',
            coordinates: circleToPolygon(geometry.coordinates, geometry.radius)
          };
          break;
      }
      return {
        type: 'Feature',
        geometry: geometry,
        properties: properties,
        options: options
      };
    },

    assignProp: function (key, src, target) {
      if (src.get(key)) {
        target[key] = src.get(key);
      }
    },

    drawJson: function (data, map) {
      try {
        map.geoObjects.removeAll();
        var geoObjects = ymaps.geoQuery(data).addToMap(map);
        map.setBounds(map.geoObjects.getBounds(), { checkZoomRange: true }).then(function () {
          if (map.getZoom() > MAX_INIT_ZOOM) map.setZoom(MAX_INIT_ZOOM);
        });
        return true;
      } catch (err) {
        console.log(__('js.geobuilder.invalidGeoJson'));
        return false;
      }
    }
  };

  // TOOLS

  function Tool (builder, Shape) {
    this.Shape = Shape;
    this.builder = builder;
  }

  Tool.prototype = {
    constructor: Tool,

    init: function () {
      this.btn.events.add('select', this.onSelect, this);
      this.btn.events.add('deselect', this.onDeselect, this);
      this.builder.modalMap.controls.add(this.btn, { float: 'left'});
    },

    onSelect: function () {
      for (var id in this.builder.tools)
        if (this.builder.tools[id] !== this)
          this.builder.tools[id].btn.deselect();
      this.builder.setActiveTool(this);
    },

    onDeselect: function () {
      this.builder.setActiveTool(null);
    }
  };

  // POINT TOOL

  function PointTool (builder) {
    Tool.call(this, builder, PointShape);
    this.btn = new ymaps.control.Button({
      data: {
        content: __('js.geobuilder.point'),
        image: '/registry/img/geobuilder/icon-point.svg'
      }
    });
    this.setup = new PointSetup(this);
    this.init();
  }

  $.extend(PointTool.prototype, Tool.prototype, {
    constructor: PointTool,

  });

  // LINE TOOL

  function LineTool (builder) {
    Tool.call(this, builder, LineShape);
    this.btn = new ymaps.control.Button({
      data: {
        content: __('js.geobuilder.line'),
        image: '/registry/img/geobuilder/icon-line.svg'
      }
    });
    this.setup = new LineSetup(this);
    this.init();
  }

  $.extend(LineTool.prototype, Tool.prototype, {
    constructor: LineTool,

    init: function () {
      Tool.prototype.init.call(this);
    }

  });

  // POLYGON TOOL

  function PolygonTool (builder) {
    Tool.call(this, builder, PolygonShape);
    this.btn = new ymaps.control.Button({
      data: {
        content: __('js.geobuilder.polygon'),
        image: '/registry/img/geobuilder/icon-polygon.svg'
      },
      options: {
        maxWidth: 120
      }
    });
    this.setup = new PolygonSetup(this);
    this.init();
  }

  $.extend(PolygonTool.prototype, Tool.prototype, {
    constructor: PolygonTool,

  });

  // CIRCLE TOOL

  function CircleTool (builder) {
    Tool.call(this, builder, CircleShape);
    this.btn = new ymaps.control.Button({
      data: {
        content: __('js.geobuilder.circle'),
        image: '/registry/img/geobuilder/icon-circle.svg'
      }
    });
    this.setup = new CircleSetup(this);
    this.init();
  }

  $.extend(CircleTool.prototype, Tool.prototype, {
    constructor: CircleTool
  });

  //
  // SETUPS
  //

  function Setup (tool) {
    this.tool = tool;
  }

  Setup.prototype = {
    constructor: Setup,
    htmlContent: '-',

    init: function () {
      var self = this;
      this.balloonClass = ymaps.templateLayoutFactory.createClass(this.htmlContent, {
        build: function () { self.buildLayout(this); },
        clear: function () { self.clearLayout(this); }
      });
    },

    buildLayout: function (layout) {
      layout.constructor.superclass.build.call(layout);
      this.$parent = $(layout.getParentElement());
      this.$parent.find('.btn-done').click(function () {
        this.submit();
      }.bind(this));
      this.$parent.find('.btn-remove').click(function () {
        this.removeShape();
      }.bind(this));
    },

    clearLayout: function (layout) {
      // ...
      layout.constructor.superclass.clear.call(layout);
    },

    setShape: function (shape) {
      this.shape = shape;
      this.setFromShape();
    },

    submit: function () {
      this.setToShape();
      this.tool.builder.modalMap.balloon.close();
    },

    removeShape: function () {
      this.tool.builder.activeShape.remove();
    },

    setFromShape: function () {},
    setToShape: function () {}
  };

  // POINT SETUP

  function PointSetup (tool) {
    Setup.call(this, tool);
    this.init();
  }

  $.extend(PointSetup.prototype, Setup.prototype, {
    constructor: PointSetup,
    htmlContent: '<div class="point-shape-setup shape-setup"><div><label>Описание</label><textarea class="setup-hint" rows="2"></textarea></div><div class="col-row clearfix"><div class="col-3 col"><label>Цвет метки</label><input type="text" class="setup-icon-color has-color-picker"></div><div class="col-3 col"><label>Форма</label><select class="setup-preset"><option value="islands#icon">Иконка</option><option value="islands#dotIcon">Иконка с точкой</option><option value="islands#circleIcon">Круг</option><option value="islands#circleDotIcon">Круг с точкой</option></select></div></div><div class="mt15"><button class="btn btn-danger btn-xs btn-remove">Удалить</button><button class="btn btn-primary btn-sm btn-done">Готово</button></div></div>',

    setFromShape: function () {
      var options = this.shape.object.options;
      this.$parent.find('.setup-preset').val(options.get('preset'));
      this.$parent.find('.setup-icon-color').val(options.get('iconColor'));
      this.$parent.find('.setup-hint').val(this.shape.object.properties.get('hintContent'));
    },

    setToShape: function () {
      var options = this.shape.object.options;
      options.set('preset', this.$parent.find('.setup-preset').val());
      options.set('iconColor', this.$parent.find('.setup-icon-color').val());
      this.shape.object.properties.singleSet('hintContent', this.$parent.find('.setup-hint').val());
    }

  });

  // LINE SETUP

  function LineSetup (tool) {
    Setup.call(this, tool);
    this.init();
  }

  $.extend(LineSetup.prototype, Setup.prototype, {
    constructor: LineSetup,
    htmlContent: '<div class="line-shape-setup shape-setup"><div><label>Описание</label><textarea class="setup-hint" rows="2"></textarea></div><div class="col-row clearfix"><div class="col-3 col"><label>Цвет линии</label><input type="text" class="setup-stroke-color has-color-picker"></div><div class="col-3 col"><label>Прозрачность</label><select class="setup-stroke-opacity"><option value="1">0</option><option value="0.9">10%</option><option value="0.8">20%</option><option value="0.7">30%</option><option value="0.6">40%</option><option value="0.5">50%</option><option value="0.4">60%</option><option value="0.3">70%</option><option value="0.2">80%</option><option value="0.1">90%</option></select></div><div class="col-3 col"><label>Толщина</label><select class="setup-stroke-width"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option><option value="10">10</option></select></div></div><div class="mt15"><button class="btn btn-danger btn-xs btn-remove">Удалить</button><button class="btn btn-primary btn-sm btn-done">Готово</button></div></div>',

    setFromShape: function () {
      var options = this.shape.object.options;
      this.$parent.find('.setup-stroke-color').val(options.get('strokeColor'));
      this.$parent.find('.setup-stroke-opacity').val(options.get('strokeOpacity'));
      this.$parent.find('.setup-stroke-width').val(options.get('strokeWidth'));
      this.$parent.find('.setup-hint').val(this.shape.object.properties.get('hintContent'));
    },

    setToShape: function () {
      var options = this.shape.object.options;
      options.set('strokeColor', this.$parent.find('.setup-stroke-color').val());
      options.set('strokeOpacity', this.$parent.find('.setup-stroke-opacity').val());
      options.set('strokeWidth', this.$parent.find('.setup-stroke-width').val());
      this.shape.object.properties.singleSet('hintContent', this.$parent.find('.setup-hint').val());
    }
  });

  // POLYGON SETUP

  function PolygonSetup (tool) {
    Setup.call(this, tool);
    this.init();
  }

  $.extend(PolygonSetup.prototype, Setup.prototype, {
    constructor: PolygonSetup,
    htmlContent: '<div class="polygon-shape-setup shape-setup"><div><label>Описание</label><textarea class="setup-hint" rows="2"></textarea></div><div class="col-row clearfix"><div class="col-3 col"><label>Цвет линии</label><input type="text" class="setup-stroke-color has-color-picker"></div><div class="col-3 col"><label>Прозрачность</label><select class="setup-stroke-opacity"><option value="1">0</option><option value="0.9">10%</option><option value="0.8">20%</option><option value="0.7">30%</option><option value="0.6">40%</option><option value="0.5">50%</option><option value="0.4">60%</option><option value="0.3">70%</option><option value="0.2">80%</option><option value="0.1">90%</option></select></div><div class="col-3 col"><label>Толщина</label><select class="setup-stroke-width"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option><option value="10">10</option></select></div></div><div class="col-row clearfix"><div class="col-3 col"><label>Цвет заливки</label><input type="text" class="setup-fill-color has-color-picker"></div><div class="col-3 col"><label>Прозрачность</label><select class="setup-fill-opacity"><option value="1">0</option><option value="0.9">10%</option><option value="0.8">20%</option><option value="0.7">30%</option><option value="0.6">40%</option><option value="0.5">50%</option><option value="0.4">60%</option><option value="0.3">70%</option><option value="0.2">80%</option><option value="0.1">90%</option></select></div><div class="col-3 col"></div></div><div class="mt15"><button class="btn btn-danger btn-xs btn-remove">Удалить</button><button class="btn btn-primary btn-sm btn-done">Готово</button></div></div>',

    setFromShape: function () {
      var options = this.shape.object.options;
      this.$parent.find('.setup-fill-color').val(options.get('fillColor'));
      this.$parent.find('.setup-fill-opacity').val(options.get('fillOpacity'));
      this.$parent.find('.setup-stroke-color').val(options.get('strokeColor'));
      this.$parent.find('.setup-stroke-opacity').val(options.get('strokeOpacity'));
      this.$parent.find('.setup-stroke-width').val(options.get('strokeWidth'));
      this.$parent.find('.setup-hint').val(this.shape.object.properties.get('hintContent'));
    },

    setToShape: function () {
      var options = this.shape.object.options;
      options.set('fillColor', this.$parent.find('.setup-fill-color').val());
      options.set('fillOpacity', this.$parent.find('.setup-fill-opacity').val());
      options.set('strokeColor', this.$parent.find('.setup-stroke-color').val());
      options.set('strokeOpacity', this.$parent.find('.setup-stroke-opacity').val());
      options.set('strokeWidth', this.$parent.find('.setup-stroke-width').val());
      this.shape.object.properties.singleSet('hintContent', this.$parent.find('.setup-hint').val());
    }
  });

  // CIRCLE SETUP

  function CircleSetup (tool) {
    Setup.call(this, tool);
    this.init();
  }

  $.extend(CircleSetup.prototype, PolygonSetup.prototype, {
    constructor: CircleSetup,
  });

  //
  // SHAPE
  //

  function Shape (type, tool) {
    this.type = type;
    this.tool = tool;
    this.builder = tool.builder;
  }

  Shape.prototype = {
    constructor: Shape,

    init: function () {
      this.object.events.add('click', this.onClick, this);
      this.object.events.add('balloonopen', this.onBalloonOpen, this);
      this.object.events.add('geometrychange', this.onGeometryChange, this);
      this.monitor = new ymaps.Monitor(this.object.editor.state);
      this.monitor.add('drawing', this.onChangeDrawing, this);
      this.monitor.add('editing', this.onChangeEditing, this);
      this.builder.modalMap.geoObjects.add(this.object);
    },

    getDefaultParams: function () {
      return {
        balloonContentLayout: this.tool.setup.balloonClass,
        editorDrawingCursor: 'crosshair',
        editorMaxPoints: 100,
        editorMenuManager: function (items) {
          return this.setMenuManager(items);
        }.bind(this)
      };
    },

    onClick: function () {
      this.builder.setActiveShape(this);
    },

    onBalloonOpen: function () {
      this.tool.setup.setShape(this);
    },

    onGeometryChange: function () {},
    onChangeDrawing: function (newValue) {},
    onChangeEditing: function (newValue) {},

    startDrawing: function () {
      this.object.editor.startDrawing();
    },

    stopDrawing: function () {
      this.object.editor.stopDrawing();
    },

    startEditing: function () {
      this.object.editor.startEditing();
      this.object.options.set('draggable', true);
    },

    stopEditing: function () {
      this.object.editor.stopEditing();
      this.object.options.set('draggable', false);
    },

    setMenuManager: function (items) {
      for (var i = 0; i < items.length; ++i) {
        if (items[i].id === 'stopDrawing') {
          items[i].onClick = function () {
            this.builder.setActiveShape(null);
          }.bind(this);
        }
      }
      return items;
    },

    remove: function () {
      this.builder.setActiveShape(null);
      this.builder.modalMap.geoObjects.remove(this.object);
    }
  };

  // POINT SHAPE

  function PointShape (tool, data) {
    Shape.call(this, 'point', tool);
    var options = {
      balloonContentLayout: this.tool.setup.balloonClass,
      editorDrawingCursor: 'crosshair',
      preset: ['islands#icon'],
      iconColor: '#0040ff'
    };
    this.object = data
      ? new ymaps.Placemark(data.geometry.coordinates, data.properties, $.extend(options, data.options))
      : new ymaps.Placemark([], {}, options);
    this.init();
  }

  $.extend(PointShape.prototype, Shape.prototype, {
    constructor: PointShape,

    onGeometryChange: function () {
      if (this.object.editor.state.get('drawing')) {
        this.builder.setActiveShape(null);
      }
    }
  });

  // LINE SHAPE

  function LineShape (tool, data) {
    Shape.call(this, 'line', tool);
    var options = $.extend({}, this.getDefaultParams(), {
      strokeColor: '#000000',
      strokeOpacity: 1,
      strokeWidth: 4
    });
    if (data) {
      this.object = new ymaps.Polyline(data.geometry.coordinates, data.properties, $.extend(options, data.options));
    } else {
      this.object = new ymaps.Polyline([], {}, options);
    }
    this.init();
  }

  $.extend(LineShape.prototype, Shape.prototype, {
    constructor: LineShape,
  });

  // POLYGON SHAPE

  function PolygonShape (tool, data) {
    Shape.call(this, 'polygon', tool);
    var options = $.extend({}, this.getDefaultParams(), {
      fillColor: '#0000ff',
      fillOpacity: 0.3,
      strokeColor: '#000000',
      strokeOpacity: 1,
      strokeWidth: 3
    });
    if (data) {
      this.object = new ymaps.Polygon(data.geometry.coordinates, data.properties, $.extend(options, data.options));
    } else {
      this.object = new ymaps.Polygon([], {}, options);
    }
    this.init();
  }

  $.extend(PolygonShape.prototype, Shape.prototype, {
    constructor: PolygonShape
  });

  // CIRCLE SHAPE

  function CircleShape (tool, data) {
    Shape.call(this, 'circle', tool);
    var options = $.extend({}, this.getDefaultParams(), {
      fillColor: '#00ff00',
      fillOpacity: 0.5,
      strokeColor: '#000000',
      strokeOpacity: 1,
      strokeWidth: 1
    });
    if (data) {
      this.object = editableCircleFactory(new ymaps.geometry.Circle(data.geometry.coordinates, data.geometry.radius), data.properties, $.extend(options, data.options));
    } else {
      this.object = editableCircleFactory(new ymaps.geometry.Circle(null, 0), {}, options);
    }
    this.init();
  }

  $.extend(CircleShape.prototype, Shape.prototype, {
    constructor: CircleShape,

    onChangeDrawing: function (newValue) {
      // fix radius line jumping
      if (!newValue) {
        this.builder.setActiveShape(null);
        this.builder.setActiveShape(this);
      }
    }
  });

  // CIRCLE TO POLYGON

  function circleToPolygon (center, radius, numberOfSegments) {
    var n = numberOfSegments ? numberOfSegments : 24;
    var flatCoordinates = [];
    var coordinates = [];
    for (var i = 0; i < n; ++i) {
      flatCoordinates.push.apply(flatCoordinates, offsetCirclePoint(center, radius, 2 * Math.PI * i / n));
    }
    flatCoordinates.push(flatCoordinates[0], flatCoordinates[1]);
    for (var i = 0, j = 0; j < flatCoordinates.length; j += 2) {
      coordinates[i++] = flatCoordinates.slice(j, j + 2);
    }
    return [coordinates];
  }

  function toRadians (angleInDegrees) {
    return angleInDegrees * Math.PI / 180;
  }

  function toDegrees (angleInRadians) {
    return angleInRadians * 180 / Math.PI;
  }

  function offsetCirclePoint (c1, distance, bearing) {
    var lat1 = toRadians(c1[1]);
    var lon1 = toRadians(c1[0]);
    var dByR = distance / 6378137; // distance divided by 6378137 (radius of the earth) wgs84
    var lat = Math.asin(Math.sin(lat1) * Math.cos(dByR) + Math.cos(lat1) * Math.sin(dByR) * Math.cos(bearing));
    var lon = lon1 + Math.atan2(Math.sin(bearing) * Math.sin(dByR) * Math.cos(lat1), Math.cos(dByR) - Math.sin(lat1) * Math.sin(lat));
    return [toDegrees(lon), toDegrees(lat)];
  }
})();
