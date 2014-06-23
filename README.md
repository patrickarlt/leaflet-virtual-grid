
# Leaflet Virtual Grid

You can use `L.VirtualGrid` to generate simple, cacheable, grids of `L.LatLngBounds` objects you can use to query APIs. This lets you query APIs for smaller units and space and never make a call data in the same area twice.

# Usage with Events

```js
var vg = L.virtualGrid();

// listen for when new cells come into the view for the first time
vg.on("cellcreate", function(e){
  console.log(e.type, e);
});

// listen for when cells reenter the view
vg.on("cellenter", function(e){
  console.log(e.type, e);
});

// listen for when cells leave the view
vg.on("cellleave", function(e){
  console.log(e.type, e);
});

// add the grid to the map
vg.addTo(map);
```

# Usage as a Class

```js
var MyGridThing = L.VirtualGrid.extend({
    createCell: function(bounds, coords){
        console.log('create cell', bounds, coords);
    },
    cellEnter: function(bounds, coords){
        console.log('cell enter', bounds, coords);
    }
    cellLeave: function(bounds, coords){
        console.log('cell leave', bounds, coords);
    }
})

var thingWithGrid = new MyGridThing().addTo(map);
```

# Options

```js
var vg = L.virtualGrid({
    cellSize: 512,
    updateInterval: 150
});
```

##### `updateInterval`

How often to update the grid. Defaults to `150`

##### `cellSize`

How big each cell is in pixels. Defaults to `512`

# Example

Here is what the grid looks like under the hood...

![Example](https://raw.github.com/patrickarlt/leaflet-virtual-grid/master/example.jpg)

Each rectangle would represent a call to an API or query to a data source. You would only make one request per cell so you not make repeat calls to areas like requesting all the data in a map view when a user performs a small pan.

# Credit

Most of this code is based on `L.Grid` from https://github.com/Leaflet/Leaflet/commit/670dbaac045c7670ff26198136e440be9c2bb3e5.

# To Do
* Cross browser testing
* Build system
* Unit tests
* Documentation
* Formal release