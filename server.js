var restify = require('restify');
var request = require('request');
var lwip = require('lwip');
var fs = require('fs');

var express = require('express');
var app = express();

var bodyParser = require('body-parser');
var http = require('http');

var server = http.createServer(app);

app.use(express.static('public'));

app.use('/plot', bodyParser.json(), function (req, res) {
  console.log('in /plot');
  var data = req.body;
  process.stdout.write("json: ");
  console.log(data);

  console.log("--");
  process.stdout.write("worldCoord: ");
  var worldCoord = latLngToWorldCoordinates(data);
  console.log(worldCoord);

  console.log("--");
  process.stdout.write("pixelCoord: ");
  var pixelCoord = worldCoordToPixelCoord(worldCoord, data.zoom);
  console.log(pixelCoord);

  console.log("--");
  process.stdout.write("screenCoord: ");
  var screenCoord = pixelCoordToScreenCoord(pixelCoord, pixelCoord, data.width, data.height);
  console.log(screenCoord);
});

var TILE_SIZE = 256;
// web mercator (used by google maps, bing maps etc)
function latLngToWorldCoordinates (latLng) {
  var lat = latLng.lat;
  var lng = latLng.lng;

  var siny = Math.sin(lat * Math.PI / 180);
  // trunc to 0.9999
  var tv = 0.9999;
  siny = Math.min(Math.max(siny, -tv), tv);

  // woorld coordinate (see web mercator) [0, 255] (floating point)
  var point = {
    x: TILE_SIZE * (0.5 + lng / 360),
    y: TILE_SIZE * (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI))
  };
  return point;
};

// see web mercator
function worldCoordToPixelCoord (worldCoord, zoom) {
  var scale = 1 << zoom;
  return {
    x: worldCoord.x * scale,
    y: worldCoord.y * scale
  };
};

//
function pixelCoordToScreenCoord (centerPixelCoord, pixelCoord, width, height) {
  var c = centerPixelCoord;
  var p = pixelCoord;
  var w = width;
  var h = height;

  var dx = p.x - c.x;
  var dy = p.y - c.y;
  dx += width / 2;
  dy += height / 2;

  return {
    x: dx | 0,
    y: dy | 0
  };
};

var port = 3000;
server.listen(port, function () {
  console.log('server listening at %s', port);

});

var api_key = "AIzaSyAM9wAZBfmsDgFZ9Mo7fU8x7NWDQZUPBQc";
/*
    <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyAM9wAZBfmsDgFZ9Mo7fU8x7NWDQZUPBQc&callback=initMap"></script>
*/


    var googleMapsStaticTemplate = "http://maps.googleapis.com/maps/api/staticmap?center=<lat>,<lng>&zoom=<zoom>&size=<width>x<height>";

    // query string addon to invert and desaturate the water
    var googleMapsStaticStyles_WaterInverted = "&style=element:labels|visibility:off&style=element:geometry.stroke|visibility:off&style=feature:landscape|element:geometry|saturation:-100&style=feature:water|saturation:-100|invert_lightness:true&key=<key>";

function buildGoogleMapsStaticUrl (opts) {
  var url = googleMapsStaticTemplate + googleMapsStaticStyles_WaterInverted;
  url = url.replace('<lat>', opts.lat);
  url = url.replace('<lng>', opts.lng);
  url = url.replace('<zoom>', opts.zoom);
  url = url.replace('<width>', opts.width);
  url = url.replace('<height>', opts.height);

  url = url.replace('<key>', api_key);
  return url;
};

var url = buildGoogleMapsStaticUrl({
  lat: -34.387,
  lng: 150.644,
  zoom: 11,
  width: 640,
  height: 480
})
//console.log(url);

var Stream = require('stream').Transform;

function download (url, filename, callback) {
  request(url).pipe(fs.createWriteStream(filename)).on('close', callback);
};

console.log("-------------");
console.log(url);
console.log("-------------");

download(url, 'image.png', function () {
  lwip.open('image.png', function (err, image) {
    if (err) throw err;

    var w = image.width();
    var h = image.height();
    var len = w * h;

    var waterPixels = 0;

    for (var i = 0; i < len; i++) {
      var p = image.getPixel(i % w, (i / w) | 0);
      // {r: 255, g: 255, b: 255, a: 100}
      if (p.r < 50 && p.g < 50 && p.b)
        waterPixels++;
    };

    var delta = (waterPixels / len).toFixed(4);
    console.log("len: %s, waterPixels: %s, delta: %s", len, waterPixels, delta);
  });

  console.log('finished!');
});
