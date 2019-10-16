(function () {
  window.editableCircleFactory = function (geometry, properties, options) {
    ymaps.util.augment(EditableCircle, ymaps.Circle, {
      setParent: function (parent) {
        if (!parent) {
          if (this.editor.state.get('editing')) this.editor.stopEditing();
          this.remove();
        }
        EditableCircle.superclass.setParent.call(this, parent);
        if (parent) {
          var self = this;
          if (this.geometry.getRadius() === 0) {
            var radius = this.options.get('defaultRadius', 0) ? this.options.get('defaultRadius') :
              Math.min(
                Math.max(this.options.get('minRadius', 100), 5000000 / Math.pow(2, parent.getMap().getZoom())),
                this.options.get('maxRadius', 0) ? this.options.get('maxRadius') : 100000000);
            this.geometry.setRadius(radius);
          }
          this.getMap().events.add('actionend', this._renderCallback, this);
          this.geometry.events.add('pixelgeometrychange', this._renderCallback, this);
          this.render();
        }
      },

      editor: new GeometryEditorCircle(geometry, options),

      _renderCallback: function () {
        this.render();
      },

      render: function () {},

      getRadiusFormatted: function () {
        var radius = this.geometry.getRadius();
        return (radius > 1000) ? (Math.round(radius / 10) / 100 + ' км') : Math.round(radius) + ' м';
      },

      remove: function () {
        this.geometry.getMap().events.remove('actionend', this._renderCallback, this);
        this.geometry.events.remove('pixelgeometrychange', this._renderCallback, this);
      }
    });
    return new EditableCircle(geometry, properties, options);
  };

  function EditableCircle (geometry, properties, options) {
    EditableCircle.superclass.constructor.call(this, geometry, properties, options);
  }

  function GeometryEditorCircle (geometry, options) {
    this.geometry = geometry;
    this.events = new ymaps.event.Manager(geometry);
    this.options = new ymaps.option.Manager(options);
    this.state = new ymaps.data.Manager();
    this.state.set('drawing', false);
    this.state.set('editing', false);
    this.state.set('dragging', false);
    this._vertexBox = null;
    this._radiusLine = null;
    this._monitor = new ymaps.Monitor(this.state);
    this._monitor.add('drawing', function (newValue) {
      newValue ? this._startDrawing() : this._stopDrawing();
    }, this);
    this._monitor.add('editing', function (newValue) {
      newValue ? this._startEditing() : this._stopEditing();
    }, this);
  }

  GeometryEditorCircle.prototype = {
    constructor: GeometryEditorCircle,

    getPane: function () {
      return this.geometry.getMap().panes.get('overlaps');
    },

    _createDomElements: function () {
      var self = this;
      var $pane = $(this.getPane().getElement());
      if (!this._vertexBox) {
        this._vertexBox = $('<div class="shape-control-node"></div>');
        this._vertexBox.on('mouseenter', function () {
          $(this).addClass('active');
        }).on('mouseleave', function () {
          $(this).removeClass('active');
        }).on('mousedown', function (e) {
          $(document).on('mousemove', function (e) {
            e.stopPropagation();
            var map = self.geometry.getMap();
            var pane = self.getPane();
            var offset = $(pane.getElement()).offset();
            var globalPixels = pane.fromClientPixels([e.pageX - offset.left, e.pageY - offset.top]);
            var geo = map.options.get('projection').fromGlobalPixels(globalPixels, map.getZoom());
            var dist = ymaps.coordSystem.geo.getDistance(self.geometry.getCoordinates(), geo);
            var maxRadius = self.options.get('maxRadius', 0) ? self.options.get('maxRadius') : 100000000;
            var radius = Math.min(Math.max(self.options.get('minRadius', 0), dist), maxRadius);
            self.geometry.setRadius(radius);
          }).on('mouseup', function (e) {
            $(this).off('mousemove mouseup');
            document.ondragstart = null;
            document.body.onselectstart = null;
            self._vertexBox.removeClass('dragged');
            self.dragend();
          });
          document.body.onselectstart = function () {
            return false;
          };
          document.ondragstart = document.body.onselectstart;
          self._vertexBox.addClass('dragged');
          self.dragstart();
        }).appendTo($pane);
      }
      if (!this._radiusLine) {
        this._radiusLine = $('<div class="shape-control-radius"></div>').appendTo($pane);
      }
    },

    _clearDomElements: function () {
      this._vertexBox.remove();
      this._vertexBox = null;
      this._radiusLine.remove();
      this._radiusLine = null;
    },

    _onSetCenter: function (ev) {
      ev.stopImmediatePropagation();
      this.geometry.setCoordinates(ev.get('coords'));
      this.stopDrawing();
    },

    _startDrawing: function () {
      var map = this.geometry.getMap();
      this.removeDrawingCursor();
      this.drawingCursor = map.cursors.push(this.options.get('editorDrawingCursor', 'arrow'));
      map.events.remove('click', this._onSetCenter, this, 1);
      map.events.add('click', this._onSetCenter, this, 1);
    },

    _stopDrawing: function () {
      this.removeDrawingCursor();
      this.geometry.getMap().events.remove('click', this._onSetCenter, this, 1);
    },

    _startEditing: function () {
      this.removeDrawingCursor();
      this.geometry.getMap().events.remove('click', this._onSetCenter, this, 1);
      this.geometry.getMap().events.add('actionend', this._renderCallback, this);
      this.geometry.events.add('pixelgeometrychange', this._renderCallback, this);
      this._createDomElements();
      this._render();
    },

    _stopEditing: function () {
      this._clearDomElements();
      var map = this.geometry.getMap();
      map && map.events.remove('actionend', this._renderCallback, this);
      this.geometry.events.remove('pixelgeometrychange', this._renderCallback, this);
    },

    _renderCallback: function () {
      this._render.call(this);
    },

    _render: function () {
      var geometry = this.geometry;
      var pane = this.getPane();
      var pixelGeometry = geometry.getPixelGeometry();
      var centerGlobal = pixelGeometry.getCoordinates();
      if (centerGlobal) {
        var centerClient = pane.toClientPixels(centerGlobal);
        var boundsGlobal = pixelGeometry.getBounds();
        var vertexGlobal = [boundsGlobal[0][0], centerGlobal[1]];
        var vertexClient = pane.toClientPixels(vertexGlobal);
        var deg = Math.tan((vertexClient[0] - centerClient[0]) * (vertexClient[1] - centerClient[1]));
        this._vertexBox.css({left: vertexClient[0] + 'px', top: vertexClient[1] + 'px'});
        this._radiusLine.css({
          width: Math.sqrt(Math.pow(vertexClient[0] - centerClient[0], 2), Math.pow(vertexClient[1] - centerClient[1], 2)),
          left: vertexClient[0] + 'px',
          top: vertexClient[1] + 'px',
          '-webkit-transform': 'rotate(' + deg + 'deg)',
          '-moz-transform': 'rotate(' + deg + 'deg)',
          '-ms-transform': 'rotate(' + deg + 'deg)',
          '-o-transform': 'rotate(' + deg + 'deg)',
          'transform': 'rotate(' + deg + 'deg)'
        });
      }
    },

    removeDrawingCursor: function () {
      if (this.drawingCursor) {
        this.drawingCursor.remove();
        this.drawingCursor = null;
      }
    },

    startDrawing: function () {
      this.state.set("drawing", true);
    },

    stopDrawing: function () {
      this.state.set("drawing", false);
    },

    startEditing: function () {
      this.state.set("editing", true);
    },

    stopEditing: function () {
      this.state.set("editing", false);
    },

    dragstart: function () {
      this.state.set('dragging', true);
    },

    dragend: function () {
      this.state.set('dragging', false);
    }
  };
})();
