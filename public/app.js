var map;

var MAP_WIDTH = 640;
var MAP_HEIGHT = 480;

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

  var selectionButton = '<button id="select-button">Toggle Selection (inactive)</button>';
  var gridInfo = '<span id="grid-info">Grid Info</span>';

  var els = [selectionButton, gridInfo];
  // selection mode button
  controlsEl.innerHTML = els.join('<hr>');

  document.body.appendChild(controlsEl);

  // click handler for button
  var btn = document.getElementById('select-button');
  console.log("btn: " + btn);
  btn.addEventListener('click', function (evt) {
    startSelection();
    btn.innerHTML = "Toggle Selection (ACTIVE!)";
  });
};
createControls();

var selecting = false;
function stopSelection () {
  var canvas = document.getElementById('selection-canvas');
  if (canvas) {
    canvas.parentNode.removeChild(canvas);
  }
  selecting = false;
};

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
      startPoint = {
        x: evt.offsetX,
        y: evt.offsetY
      };
    }
  });

  canvas.addEventListener('mousemove', function (evt) {
    if (startPoint) {
      drawSelection(canvas, startPoint, {
        x: evt.offsetX,
        y: evt.offsetY
      });
    };
  });

  canvas.addEventListener('mouseup', function (evt) {
    console.log('mouseup: %s, %s', evt.offsetX, evt.offsetY);
    if (startPoint) {
      drawSelection(canvas, startPoint, {
        x: evt.offsetX,
        y: evt.offsetY
      });
      startPoint = null;
      selecting = false;

      var btn = document.getElementById('select-button');
      btn.innerHTML = "Toggle Selection (inactive)";
      stopSelection();

      //sendPlotRequest(map, 640, 480);
      sendPlotSelectionRequest(map, MAP_WIDTH, MAP_HEIGHT, lastSelection);
    };
  });

  document.body.appendChild(canvas);
};
//startSelection();

function sendPlotRequest (map, width, height) {
  console.log("sending plot");
  var req = new XMLHttpRequest();
  req.open('POST', '/plot', true);
  var latLng = map.getCenter();
  var data = {
    lat: latLng.lat(),
    lng: latLng.lng(),
    zoom: map.getZoom(),
    width: width,
    height: height
  };
  console.log(data);
  req.setRequestHeader('Content-Type', 'application/json');
  var str = JSON.stringify(data);
  req.send(str);
};

var gridTopLeftMarker = null;
var gridBotRightMarker = null;

function sendPlotSelectionRequest (map, width, height, selection) {
  console.log("sending plot selection");
  var req = new XMLHttpRequest();
  req.open('POST', '/plot', true);
  var latLng = map.getCenter();
  var data = {
    center: {
      lat: latLng.lat(),
      lng: latLng.lng()
    },
    zoom: map.getZoom(),
    width: width,
    height: height,
    selection: selection
  };
  console.log(data);
  req.setRequestHeader('Content-Type', 'application/json');
  var str = JSON.stringify(data);

  // listen for response
  req.onload = function () {
    console.log("status: " + req.status);
    if (req.status >= 200 && req.status < 400) {
      var resp = JSON.parse(req.responseText);
      console.log(resp);

      var results = resp.results;
      var bucket = {
        //edgeResults: edgeResults, // TODO (WIP), land/water edges only
        landResults: results.filter(function (r) {return !r.water}), // land only
        waterResults: results.filter(function (r) {return r.water}) // water only
      };

      var nodes = bucket.landResults;
      //var nodes = bucket.waterResults;
      drawNodes(nodes);

      // add markers for nodes
      addNodeMarkers(nodes, true);

      // add info windows on results (grid) topLeft and botRight corners
      var gridInfoEl = document.getElementById('grid-info');
      var gridInnerHTML = "";

      // top left
      var pos = results[0].pixel;
      var position = {
        x: pos.x,
        y: pos.y - 100
      };
      var latLng = fromContainerPixelToLatLng( position );
      if (gridTopLeftMarker) {
        gridTopLeftMarker.setMap(null); // clear previous
      }
      gridTopLeftMarker = addMarker(latLng, {scale: 3, color: 'black'});
      var text = "Top Left - lat: $lat, lng: $lng"
        .replace('$lat', latLng.lat())
        .replace('$lng', latLng.lng());
      gridInnerHTML += text + "<br>";

      // bot right
      var pos = results[ results.length - 1 ].pixel;
      var position = {
        x: pos.x,
        y: pos.y - 100
      };
      var latLng = fromContainerPixelToLatLng( position );
      if (gridBotRightMarker) {
        gridBotRightMarker.setMap(null); // clear previous
      }
      gridBotRightMarker = addMarker(latLng, {scale: 3, color: 'black'});
      var text = "Bot Right: lat: $lat, lng: $lng"
        .replace('$lat', latLng.lat())
        .replace('$lng', latLng.lng());
      gridInnerHTML += text + "<br>";

      gridInfoEl.innerHTML = gridInnerHTML;
      /*
      var pos = results[0].pixel;
      var position = {
        x: pos.x,
        y: pos.y - 100
      };
      var latLng = fromContainerPixelToLatLng( position );
      var topLeftMarker = addMarker(latLng, {scale: 3, color: 'black'});
      var text = "lat: $lat, lng: $lng"
        .replace('$lat', latLng.lat())
        .replace('$lng', latLng.lng());
      var infoWindow = new google.maps.InfoWindow({
        content: text
      });
      // add info window to marker
      infoWindow.open(map, topLeftMarker);

      // add to botleft
      var pos = results[ results.length - 1 ].pixel;
      var position = {
        x: pos.x,
        y: pos.y - 100
      };
      var latLng = fromContainerPixelToLatLng( position );
      var topLeftMarker = addMarker(latLng, {scale: 3, color: 'black'});
        topLeftMarker.anchorPoint = {
          x: 100,
          y: 100
        }
      var text = "lat: $lat, lng: $lng"
        .replace('$lat', latLng.lat())
        .replace('$lng', latLng.lng());
      var infoWindow = new google.maps.InfoWindow({
        content: text,
      });
      // add info window to marker
      infoWindow.open(map, topLeftMarker);
      */
    }
  };

  req.send(str);
};

var lastSelection = null;
function drawSelection (canvas, from, to) {
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(200,40,200,.5)';
  ctx.strokeStyle = 'black';

  var topLeft = {
    x: Math.min(from.x, to.x),
    y: Math.min(from.y, to.y)
  };
  var width = Math.abs(from.x - to.x);
  var height = Math.abs(from.y - to.y);

  ctx.fillRect(topLeft.x, topLeft.y, width, height);
  ctx.strokeRect(topLeft.x, topLeft.y, width, height);

  lastSelection = {
    topLeft: topLeft,
    width: width,
    height: height
  };
  return lastSelection;
};

function initMap() {
  document.getElementById('map').style.marginTop = '100px';
  var center = {lat: 61.47734486467206, lng: 23.75942034149171};
  var zoom = 15;
  map = new google.maps.Map(document.getElementById('map'), {
    center: center,
    zoom: zoom
  });
  var mapEl = document.getElementById('map');
  mapEl.style.width = MAP_WIDTH + "px";
  mapEl.style.height = MAP_HEIGHT + "px";

  var overlay;
  overlay = new google.maps.OverlayView();
  overlay.draw = function () {};
  overlay.setMap(map);
  window.overlay = overlay;

  function fromContainerPixelToLatLng(point) {
    return overlay.getProjection().fromContainerPixelToLatLng(point);
  };
  window.fromContainerPixelToLatLng = fromContainerPixelToLatLng;

  var nodeMarkers = [];
  function addNodeMarkers (nodes, deleteDrawNodes) {
    console.log("nodes.length: " + nodes.length);
    if (!nodes.forEach || nodes.length <= 0) return;
    // clear prevoius markers
    console.log("clearing previous markers");
    nodeMarkers.forEach(function (marker) {
      marker.setMap(null);
    });

    console.log("creating markers");

    // add new markers
    nodes.forEach(function (node) {
      var pos = node.pixel;
      var position = {
        x: pos.x,
        y: pos.y - 100
      };
      //pixel.y += 100; // controls offset
      var latLng = fromContainerPixelToLatLng( position );
      var marker = addMarker(latLng, {scale: 3, color: node.water ? 'blue' : 'olive'});
      nodeMarkers.push(marker); // save for deletion later
    });

    if (deleteDrawNodes) {
      setTimeout(function () {
        console.log("deleting debug nodes");
        // remove old selecion debug nodes
        var nodeElements = document.getElementsByClassName('node');
        while (nodeElements[0]) {
          var n = nodeElements[0];
          n.parentNode.removeChild( n );
        }
      }, Math.min(nodes.length * 1.8, 5000));
    }

    /*
    var createInfoAtNode (node) {
      var pos = node.pixel; // pixel position of node
      pos.y -= 100; // controls offset
      var latLng = fromContainerPixelToLatLng( pos );
    };
    // draw basic info markers (top left latLng, bot right latLng)
    var topLeftNode = nodes[0];
    var topLeft = {
      node: nodes[0],
      latLng: {nodes[0]}
      text: ""
    }
    var botRight = nodes[nodes.length - 1];
    */

  };
  window.addNodeMarkers = addNodeMarkers;

  var marker;
  function addMarker (latLng, opts) {
    var opts = opts || {};
    var resultColor = opts.color || 'green';
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
        scale: opts.scale || 10,
        editable: false
      }
    });
    return marker;
  };
  window.addMarker = addMarker;

  map.addListener('click', function (evt) {
    return;
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

  function drawNodes(nodes) {
    // remove old selecion debug nodes
    var nodeElements = document.getElementsByClassName('node');
    while (nodeElements[0]) {
      var n = nodeElements[0];
      n.parentNode.removeChild( n );
    }

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      drawNode(node);
    };
  };
  window.drawNodes = drawNodes;

  function drawNode (node, opts) {
    if (!node.pixel)
      return;

    var color = node.water ? 'cyan' : 'olive';

    var opts = opts || {};
    var size = opts.size || 5;

    var point = node.pixel;
    point.y += 100; // controls offset
    var pointEl = document.createElement('div');
    pointEl.style.position = 'fixed';
    pointEl.style.width = size + 'px';
    pointEl.style.height = size + 'px';
    pointEl.style.left = point.x - (size >> 1) + 'px';
    pointEl.style.top = point.y - (size >> 1) + 'px';
    pointEl.style.background = color;
    pointEl.style['border-radius'] = '50%';
    pointEl.className = "node";
    document.body.appendChild(pointEl);
    return pointEl;
  };
  window.drawNode = drawNode;

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
    pointEl.style.top = point.y + 100 - (size >> 1) + 'px'; // controls offset is 100
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

  // TODO test
  //sendPlotRequest(map, 640, 480);
  //sendPlotSelectionRequest(map, MAP_WIDTH, MAP_HEIGHT, lastSelection);
}
