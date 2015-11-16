import L from 'leaflet';

var VirtualGrid = L.Class.extend({
  includes: L.Mixin.Events,

  options: {
    cellSize: 512,
    updateInterval: 150
  },

  initialize: function (options) {
    options = L.setOptions(this, options);
  },

  onAdd: function (map) {
    this._map = map;
    this._update = L.Util.limitExecByInterval(this._update, this.options.updateInterval, this);

    this._map.addEventListener(this.getEvents(), this);

    this._reset();
    this._update();
  },

  onRemove: function () {
    this._map.removeEventListener(this.getEvents(), this);
    this._removeCells();
  },

  getEvents: function () {
    var events = {
      viewreset: this._reset,
      moveend: this._update,
      zoomend: this._onZoom
    };

    return events;
  },

  addTo: function (map) {
    map.addLayer(this);
    return this;
  },

  removeFrom: function (map) {
    map.removeLayer(this);
    return this;
  },

  _onZoom: function () {
    var zoom = this._map.getZoom();

    if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
      this._removeCells();
    } else if (!this._map.hasLayer(this)) {
      this._update();
    }
  },

  _reset: function () {
    this._removeCells();

    this._cells = {};
    this._activeCells = {};
    this._cellsToLoad = 0;
    this._cellsTotal = 0;

    this._resetWrap();
  },

  _resetWrap: function () {
    var map = this._map;
    var crs = map.options.crs;

    if (crs.infinite) {
      return;
    }

    var cellSize = this._getCellSize();

    if (crs.wrapLng) {
      this._wrapLng = [
        Math.floor(map.project([0, crs.wrapLng[0]]).x / cellSize),
        Math.ceil(map.project([0, crs.wrapLng[1]]).x / cellSize)
      ];
    }

    if (crs.wrapLat) {
      this._wrapLat = [
        Math.floor(map.project([crs.wrapLat[0], 0]).y / cellSize),
        Math.ceil(map.project([crs.wrapLat[1], 0]).y / cellSize)
      ];
    }
  },

  _getCellSize: function () {
    return this.options.cellSize;
  },

  _update: function () {
    if (!this._map) {
      return;
    }

    var bounds = this._map.getPixelBounds();
    var zoom = this._map.getZoom();
    var cellSize = this._getCellSize();
    var cellPadding = [cellSize / 2, cellSize / 2];

    if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
      return;
    }

    // cell coordinates range for the current view
    var topLeft = bounds.min.subtract(cellPadding).divideBy(cellSize).floor();

    topLeft.x = Math.max(topLeft.x, 0);
    topLeft.y = Math.max(topLeft.y, 0);

    var cellBounds = L.bounds(topLeft, bounds.max.add(cellPadding).divideBy(cellSize).floor());

    // remove any present cells that are off the specified bounds
    this._removeOtherCells(cellBounds);
    this._addCells(cellBounds);

    this.fire('cellsupdated');
  },

  _addCells: function (bounds) {
    var queue = [];
    var center = bounds.getCenter();
    var zoom = this._map.getZoom();
    var j, i, coords;

    // create a queue of coordinates to load cells from
    for (j = bounds.min.y; j <= bounds.max.y; j++) {
      for (i = bounds.min.x; i <= bounds.max.x; i++) {
        coords = new L.Point(i, j);
        coords.z = zoom;

        queue.push(coords);
      }
    }
    var cellsToLoad = queue.length;

    if (cellsToLoad === 0) {
      return;
    }

    this._cellsToLoad += cellsToLoad;
    this._cellsTotal += cellsToLoad;

    // sort cell queue to load cells in order of their distance to center
    queue.sort(function (a, b) {
      return a.distanceTo(center) - b.distanceTo(center);
    });

    for (i = 0; i < cellsToLoad; i++) {
      this._addCell(queue[i]);
    }
  },

  // converts cell coordinates to its geographical bounds
  _cellCoordsToBounds: function (coords) {
    var map = this._map;
    var cellSize = this.options.cellSize;

    var nwPoint = coords.multiplyBy(cellSize);
    var sePoint = nwPoint.add([cellSize, cellSize]);

    var nw = map.unproject(nwPoint, coords.z).wrap();
    var se = map.unproject(sePoint, coords.z).wrap();

    return new L.LatLngBounds(nw, se);
  },

  // converts cell coordinates to key for the cell cache
  _cellCoordsToKey: function (coords) {
    return coords.x + ':' + coords.y;
  },

  // converts cell cache key to coordiantes
  _keyToCellCoords: function (key) {
    var kArr = key.split(':');
    var x = parseInt(kArr[0], 10);
    var y = parseInt(kArr[1], 10);

    return new L.Point(x, y);
  },

  // remove any present cells that are off the specified bounds
  _removeOtherCells: function (bounds) {
    for (var key in this._cells) {
      if (!bounds.contains(this._keyToCellCoords(key))) {
        this._removeCell(key);
      }
    }
  },

  _removeCell: function (key) {
    var cell = this._activeCells[key];

    if (cell) {
      delete this._activeCells[key];

      if (this.cellLeave) {
        this.cellLeave(cell.bounds, cell.coords);
      }

      this.fire('cellleave', {
        bounds: cell.bounds,
        coords: cell.coords
      });
    }
  },

  _removeCells: function () {
    for (var key in this._cells) {
      var bounds = this._cells[key].bounds;
      var coords = this._cells[key].coords;

      if (this.cellLeave) {
        this.cellLeave(bounds, coords);
      }

      this.fire('cellleave', {
        bounds: bounds,
        coords: coords
      });
    }
  },

  _addCell: function (coords) {
    // wrap cell coords if necessary (depending on CRS)
    this._wrapCoords(coords);

    // generate the cell key
    var key = this._cellCoordsToKey(coords);

    // get the cell from the cache
    var cell = this._cells[key];
    // if this cell should be shown as isnt active yet (enter)

    if (cell && !this._activeCells[key]) {
      if (this.cellEnter) {
        this.cellEnter(cell.bounds, coords);
      }

      this.fire('cellenter', {
        bounds: cell.bounds,
        coords: coords
      });

      this._activeCells[key] = cell;
    }

    // if we dont have this cell in the cache yet (create)
    if (!cell) {
      cell = {
        coords: coords,
        bounds: this._cellCoordsToBounds(coords)
      };

      this._cells[key] = cell;
      this._activeCells[key] = cell;

      if (this.createCell) {
        this.createCell(cell.bounds, coords);
      }

      this.fire('cellcreate', {
        bounds: cell.bounds,
        coords: coords
      });
    }
  },

  _wrapCoords: function (coords) {
    coords.x = this._wrapLng ? L.Util.wrapNum(coords.x, this._wrapLng) : coords.x;
    coords.y = this._wrapLat ? L.Util.wrapNum(coords.y, this._wrapLat) : coords.y;
  }
});

export default VirtualGrid;
