
# Leaflet Virtual Grid

You can use `L.VirtualGrid` to generate simple, cacheable, grids of `L.LatLngBounds` objects you can use to query and API.

This lets you query APIs for smaller units and space and never make a call data in the same area twice.

# Example

Here is what the grid looks like under the hood...

![Example](https://raw.github.com/Esri/esri-leaflet/master/esri-leaflet.png)

Each rectangle would represent a call to an API or query to a data source. You would only make one request per cell so you not make repeat calls to areas like requesting all the data in a map view when a user performs a small pan.

Currently the grid is rebuilt from scratch when a user zooms in or out Eventually the goal is to have `L.VirtualGrid` automatically repack grid cells when users zoom in or out so avoid repeat calls even across zoom levels.

# To Do
* **Repack grid cells across zoom levels**
* Cross browser testing
* Building system
* Unit tests
* Documentation