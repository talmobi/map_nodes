var map;

function createControls () {
  console.log("creating controls");
  var size = {x: 640, y: 100};
  var point = {x: 0, y: 0};
  var color = 'pink';
  var controlsEl = document.createElement('div');
  controlsEl.style.position = 'fixed';
  controlsEl.style.width = size.x + 'px';
  controlsEl.style.height = size.y + 'px';
  controlsEl.style.left = point.x - (size >> 1) + 'px';
  controlsEl.style.top = point.y - (size >> 1) + 'px';
  controlsEl.style.background = color;
  controlsEl.id = 'controls-id';
  controlsEl.style.borderBottom = "solid 1px black";
  document.body.appendChild(controlsEl);
};
createControls();

var selecting = false;
function startSelection () {
  selecting = true;

  var canvas = document.getElementById('selection-canvas');
  if (canvas) {
    canvas.parentNode.removeChild(canvas);
  }

  var mapEl = document.getElementById('map');
  var bounds = mapEl.getBoundingClientRect();
  var pos = {x: bounds.left, y: 100 };
  var size = {x: bounds.width, y: bounds.height };
  var canvas = document.createElement('canvas');
  canvas.width = size.x;
  canvas.height = size.y;
  canvas.style.position = 'fixed';
  canvas.style.left = pos.x + 'px';
  canvas.style.top = pos.y + 'px';
  canvas.id = 'selection-canvas';

  var startPoint = null;
  canvas.addEventListener('mousedown', function (evt) {
    console.log('mousedown: %s, %s', evt.offsetX, evt.offsetY);
    if (!startPoint) {
    }
  });
  canvas.addEventListener('mouseup', function (evt) {
    console.log('mouseup: %s, %s', evt.offsetX, evt.offsetY);
  });

  document.body.appendChild(canvas);
};
startSelection();

function initMap() {
  document.getElementById('map').style.marginTop = '100px';
  var center = {lat: -34.397, lng: 150.644};
  var zoom = 11;
  map = new google.maps.Map(document.getElementById('map'), {
    center: center,
    zoom: zoom
  });

  var overlay;
  overlay = new google.maps.OverlayView();
  overlay.draw = function () {};
  overlay.setMap(map);
  window.overlay = overlay;

  function fromContainerPixelToLatLng(point) {
    return overlay.getProjection().fromContainerPixelToLatLng(point);
  };

  var marker;
  function addMarker (latLng) {
    var resultColor = 'green';
    var pos = {lat: latLng.lat(), lng: latLng.lng()};

    marker = new google.maps.Marker({
      position: pos,
      map: map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: resultColor,
        fillOpacity: .45,
        strokeColor: 'black',
        strokeWeight: .5,
        scale: 10
      }
    });
  };
  window.addMarker = addMarker;

  map.addListener('click', function (evt) {
    if (marker) {
      marker.setMap(null);
    }
    addMarker(evt.latLng);

    var point_gmaps = fromLatLngToPoint_gmaps(evt.latLng, map);
    var pixelEl = drawPixel(point_gmaps, {size: 8, color: 'red'});
    window.pixel_red = pixelEl;

    var point_custom = fromLatLngToPoint_custom(evt.latLng, map);
    //var pixelEl = drawPixel(point_custom, {size: 4, color: 'yellow'});
    //window.pixel_yellow = pixelEl;
    var point = new google.maps.Point(point_custom);
    window.point = point;
    console.log("google maps point: " + point);
    //addMarker( opin );
  });

  function fromLatLngToPoint_custom (latLng, map) {
    var scale = 1 << map.getZoom();
    var TILE_SIZE = 256;
    var lat = latLng.lat();
    var lng = latLng.lng();
    var siny = Math.sin(lat * Math.PI / 180);
    // trunc to 0.9999
    siny = Math.min(Math.max(siny, -0.9999), 0.999);
    var x = TILE_SIZE * (0.5 + (lng / 360));
    var y = TILE_SIZE * (0.5 - (Math.log( (1 + siny) / (1 - siny)) / (4 * Math.PI)));

    var worldPoint = {
      x: x,
      y: y
    };
    console.log(worldPoint);
    var point =  {
      x: x * scale,
      y: y * scale
    };
    console.log(point);
    window.worldPoint = worldPoint;
    window.customPoint = point;
    return point;
  };

  function fromLatLngToPoint_gmaps (latLng, map) {
    var topRight = map.getProjection().fromLatLngToPoint(map.getBounds().getNorthEast());
    var bottomLeft = map.getProjection().fromLatLngToPoint(map.getBounds().getSouthWest());
    var scale = Math.pow(2, map.getZoom());
    var worldPoint = map.getProjection().fromLatLngToPoint(latLng);
    return new google.maps.Point((worldPoint.x - bottomLeft.x) * scale, (worldPoint.y - topRight.y) * scale);
  };

  function drawPixel (point, opts) {
    var id = 'pixel-' + opts.color || 'none';
    var pixelEl = document.getElementById( id );
    if (pixelEl) {
      pixelEl.parentNode.removeChild(pixelEl);
    }

    var size = opts.size || 6;
    var color = opts.color || 'red';

    var pointEl = document.createElement('div');
    pointEl.style.position = 'fixed';
    pointEl.style.width = size + 'px';
    pointEl.style.height = size + 'px';
    pointEl.style.left = point.x - (size >> 1) + 'px';
    pointEl.style.top = point.y - (size >> 1) + 'px';
    pointEl.style.background = color;
    pointEl.id = id;
    document.body.appendChild(pointEl);
    return pointEl;
  };
  window.drawPixel = drawPixel;

  function showInfo () {
  };

  function displayCoords (pnt) {
    var lat = pnt.lat();
    lat.toFixed(4);
    var lng = pnt.lng();
    lng.toFixed(4);
    console.log("Latitude: %s, Longitude: %s", lat, lng);
  };
}
