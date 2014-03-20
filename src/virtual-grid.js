(function(L) {

	L.VirtualGrid = L.Class.extend({

		includes : L.Mixin.Events,

		options : {
			cellSize : 512,
			debounce : 100,
			deduplicate : true
		},

		_previousCells : [],

		roundAwayFromZero : function(num) {
			return (num > 0) ? Math.ceil(num) : Math.floor(num);
		},
		
		debounce : function(fn, delay, context) {
			var timer = null;
			return function() {
				var context = this || context, args = arguments;
				clearTimeout(timer);
				timer = setTimeout(function() {
					fn.apply(context, args);
				}, delay);
			};
		},
		initialize : function(options) {
			L.Util.setOptions(this, options);
		},
		onAdd : function(map) {
			this._map = map;
			this.center = this._map.getCenter();
			this.origin = this._map.project(this.center);

			this.handler = this.debounce(function(e) {
				if (e.type === "zoomend") {
					this.origin = this._map.project(this.center);
					this._previousCells = [];
					this.fireEvent("clearcells");
				}
				this.fireEvent("newcells", this.cellsWithin(e.target.getBounds()));
			}, this.options.debounce, this);

			map.on("zoomend resize move", this.handler, this);

			this.fireEvent("newcells", this.cellsWithin(this._map.getBounds()));
		},
		onRemove : function(map) {
			map.off("move zoomend resize", this.handler, this);
		},
		cellsWithin : function(mapBounds) {
			var size = this._map.getSize();
			var offset = this._map.project(this._map.getCenter());
			var padding = Math.min(this.options.cellSize / size.x, this.options.cellSize / size.y);
			var bounds = mapBounds.pad(padding);
			var cellInfo = {
				bounds : bounds,
				cells : []
			};

			var topLeftPoint = this._map.project(bounds.getNorthWest());
			var bottomRightPoint = this._map.project(bounds.getSouthEast());

			var topLeft = topLeftPoint.subtract(offset).divideBy(this.options.cellSize);
			var bottomRight = bottomRightPoint.subtract(offset).divideBy(this.options.cellSize);

			var offsetRows = Math.round((this.origin.x - offset.x) / this.options.cellSize);
			var offsetCols = Math.round((this.origin.y - offset.y) / this.options.cellSize);

			var minRow = this.roundAwayFromZero(topLeft.x) - offsetRows;
			var maxRow = this.roundAwayFromZero(bottomRight.x) - offsetRows;
			var minCol = this.roundAwayFromZero(topLeft.y) - offsetCols;
			var maxCol = this.roundAwayFromZero(bottomRight.y) - offsetCols;

			for (var row = minRow; row < maxRow; row++) {
				for (var col = minCol; col < maxCol; col++) {
					var cellId = "cell:" + row + ":" + col;
					var duplicate = this._previousCells.indexOf(cellId) >= 0;

					if (!duplicate || !this.options.deduplicate) {
						var cellBounds = this.cellExtent(row, col);
						var cellCenter = cellBounds.getCenter();
						var radius = cellCenter.distanceTo(cellBounds.getNorthWest());
						var distance = cellCenter.distanceTo(this.center);
						var cell = {
							row : row,
							col : col,
							id : cellId,
							center : cellCenter,
							bounds : cellBounds,
							distance : distance,
							radius : radius
						};
						cellInfo.cells.push(cell);
						this._previousCells.push(cellId);
					}
				}
			}

			cellInfo.cells.sort(function(a, b) {
				return a.distance - b.distance;
			});
			return cellInfo;
		},
		cellExtent : function(row, col) {
			var swPoint = this.cellPoint(row, col);
			var nePoint = this.cellPoint(row + 1, col + 1);
			var sw = this._map.unproject(swPoint);
			var ne = this._map.unproject(nePoint);
			return L.latLngBounds(sw, ne);
		},
		cellPoint : function(row, col) {
			var x = this.origin.x + (row * this.options.cellSize);
			var y = this.origin.y + (col * this.options.cellSize);
			return [x, y];
		},
		addTo : function(map) {
			L.layerGroup()
			map.addLayer(this);
			return this;
		}
	});

	L.virtualGrid = function(options) {
		return new L.VirtualGrid(options);
	};

})(L);
