import VirtualGrid from '../src/virtual-grid.js';
import test from 'tape-catch';
import sinon from 'sinon';
import L from 'leaflet';

function createMap () {
  // create container
  var container = document.createElement('div');

  // give container a width/height
  container.setAttribute('style', 'width:500px; height: 500px;');

  // add contianer to body
  document.body.appendChild(container);

  return L.map(container);
}

function createMockGrid () {
  var MockGrid = VirtualGrid.extend({
    createCell: sinon.spy(),
    cellEnter: sinon.spy(),
    cellLeave: sinon.spy()
  });

  return new MockGrid();
}

test('should exist', function (t) {
  t.plan(1);
  t.ok(VirtualGrid);
});

test('should create cells based on the view of the map', function (t) {
  t.plan(1);

  var map = createMap().setView([0, 0], 1);
  var grid = createMockGrid();

  grid.on('cellsupdated', function () {
    t.ok(grid.createCell.getCall(0).args[1].equals(L.point([0, 0])));
    map.remove();
  });

  grid.addTo(map);
});

test('should create cells when the map zooms in', function (t) {
  t.plan(5);

  var map = createMap().setView([0, 0], 1);
  var grid = createMockGrid();

  grid.addTo(map);

  grid.on('cellsupdated', function () {
    t.ok(grid.cellLeave.getCall(0).args[1].equals(L.point([0, 0, 1])));

    t.ok(grid.createCell.getCall(1).args[1].equals(L.point([0, 0, 2])));
    t.ok(grid.createCell.getCall(2).args[1].equals(L.point([1, 0, 2])));
    t.ok(grid.createCell.getCall(3).args[1].equals(L.point([0, 1, 2])));
    t.ok(grid.createCell.getCall(4).args[1].equals(L.point([1, 1, 2])));

    map.remove();
  });

  map.zoomIn();
});

test('should create cells when the map is panned', function (t) {
  t.plan(2);

  var map = createMap().setView([0, 0], 4);
  var grid = createMockGrid();

  grid.addTo(map);

  grid.on('cellsupdated', function () {
    t.ok(grid.createCell.getCall(4).args[1].equals(L.point([5, 4, 4])));
    t.ok(grid.createCell.getCall(5).args[1].equals(L.point([4, 5, 4])));
    map.remove();
  });

  map.panBy([512, 512], {
    animate: false,
    duration: 0
  });
});
