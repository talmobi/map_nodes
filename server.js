//var restify = require('restify');
var request = require('request');
var lwip = require('lwip');
var fs = require('fs');

var express = require('express');
var app = express();

var params = {
  spacing: 9, // plot nodes every $spacing pixels
  avg: 1 // surround pixel depth to take averages from
};

var bodyParser = require('body-parser');
var http = require('http');

var server = http.createServer(app);

app.use(express.static('public'));

app.use('/plot', bodyParser.json(), function (req, res) {
  console.log('in /plot');
  var data = req.body;
  //process.stdout.write("json: ");
  //console.log(data);

  //console.log("--");
  //process.stdout.write("worldCoord: ");
  //var worldCoord = latLngToWorldCoordinates(data.center);
  //console.log(worldCoord);

  //console.log("--");
  //process.stdout.write("pixelCoord: ");
  //var pixelCoord = worldCoordToPixelCoord(worldCoord, data.zoom);
  //console.log(pixelCoord);

  //console.log("--");
  //process.stdout.write("screenCoord: ");
  //var screenCoord = pixelCoordToScreenCoord(pixelCoord, pixelCoord, data.width, data.height);
  //console.log(screenCoord);

  if (data.selection) {
    console.log("got selection");
    //lastSelection = {
    //  topLeft: topLeft,
    //  width: width,
    //  height: height
    //};
    plotSelection(req.body, function (err, data) {
      if (err) throw err;
      console.log("responding with plot selection data");
      res.json(data).end();
    });
  } else {
    res.json("got plot").end();
  }

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

var port = 3001;
server.listen(port, function () {
  console.log('server listening at %s', port);

});

// google maps api key (limited)
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

function plotSelection (data, callback) {
  var url = buildGoogleMapsStaticUrl({
    lat: data.center.lat,
    lng: data.center.lng,
    zoom: data.zoom,
    width: data.width,
    height: data.height
  });

  console.log("w: %s, h: %s", data.width, data.height);

  //var fileName = __dirname + "/images/staticmap_image:" + url + ".png";
  //var fileName = "images/staticmap_image:" + url + ".png";
  var str = [data.center.lat, data.center.lng, data.zoom, data.width, data.height].join('_');
  var fileName = "images/staticmap_image-" + str + ".png";

  var plot = function () {
    console.log(">>> download finished! <<<: " + url);

    // investiage the image with lwip
    lwip.open(fileName, function (err, image) {
      if (err) throw err;

      var w = image.width();
      var h = image.height();
      var len = w * h;

      var waterPixels = 0;

      // return average of surronding pixels
      var avgPixel = function (x, y, len) {
        if (len <= 0) {
          return image.getPixel(x, y);
        }

        var sum = {r: 0, g: 0, b: 0, a: 0};
        var count = 1;

        var start = {
          x: Math.max(0, x - len) | 0,
          y: Math.max(0, y - len) | 0
        };

        var end = {
          x: Math.min(w, x + len) | 0,
          y: Math.min(h, y + len) | 0
        };

        //console.log(start);
        //console.log(end);

        for (var i = start.x; i < end.x; i++) {
          for (var j = start.y; j < end.y; j++) {
            count++;
            var p = image.getPixel(i, j);
            sum.r += p.r;
            sum.g += p.g;
            sum.b += p.b;
            sum.a += p.a;
          }
        };
        //console.log("avg count: " + count);
        return {
          r: sum.r / count,
          g: sum.g / count,
          b: sum.b / count,
          a: sum.a / count
        }
      };

      // determine if a pixel value is water
      var isWaterPixel = function (pixel) {
        //var pixel = {r: 0, g: 0, b: 0, a: 0};
        // assuming a styled google maps static image the water pixels should
        // be very dark (black)
        var p = pixel;
        var limit = 140;
        return (p.r < limit && p.g < limit && p.b < limit);
      };

      for (var i = 0; i < len; i++) {
        var p = image.getPixel(i % w, (i / w) | 0);
        // {r: 255, g: 255, b: 255, a: 100}
        if (isWaterPixel(p)) {
          waterPixels++;
        }
      };

      var delta = ((waterPixels / len).toFixed(4)) * 100;
      console.log("len: %s, waterPixels: %s, delta: %s %", len, waterPixels, delta);

      // investiage selection
      var topLeft = data.selection.topLeft;
      var sw = data.selection.width;
      var sh = data.selection.height;
      process.stdout.write("selection: ")
        console.log(data.selection);

      var results = [];

      var centerAvg = avgPixel(topLeft.x + sw / 2, topLeft.y + sh / 2, 1);
      process.stdout.write("avg center: ")
        console.log( centerAvg );
      console.log("center is water: " + isWaterPixel(centerAvg));

      // plot every 10 pixels
      var spacing = params.spacing || 10;
      for (var i = 0; i < sw; i += spacing) {
        for (var j = 0; j < sh; j += spacing) {
          var pixel = {
            x: topLeft.x + i,
            y: topLeft.y + j
          }
          var isWater = isWaterPixel( avgPixel( pixel.x, pixel.y, params.avg || 0) );
          results.push({
            pixel: pixel,
            water: isWater,
            edge: false
          });
        }
      };

      // water/land edge detection, filter out non-edges
      // TODO
      //var len = results.length;
      var w = (sw / spacing) | 0;
      var h = (sh / spacing) | 0;
      console.log("w: %s, h: %s, spacing: %s", w, h, spacing);
      for (var i = 0; i < results.length; i++) {
        var x = i % w;
        x = Math.min(x, w - 1);
        var y = (i / w) | 0;
        y = Math.min(y, h - 1);
        var r = results[x + y * w];
        var r_right = results[(x + 1) + y * w];
        var r_bot = results[(x) + (y + 1) * w];
        if (r_right !== undefined && r.water != r_right.water) {
          r.edge = r_right.edge = true;
        }
        if (r_right === undefined) {
          console.log("r_right was UNDEFINED");
        }
        if (r_bot !== undefined && r.water != r_bot.water) {
          r.edge = r_bot.edge = true;
        }
        if (r_bot === undefined) {
          console.log("r_bot was UNDEFINED");
        }
      }

      var edgeResults = results.filter(function (result) {
        return result.edge === true;
      });

      // filter away water
      var landResults = results.filter(function (result) {
        return result.water === false;
      });

      console.log("results.length: %s, edgeResults.length: %s", results.length, edgeResults.length);

      console.log("plotted %s pixels", results.length);
      //callback(null, edgeResults || results);
      //callback(null, edgeResults);
      //callback(null, results);
      callback(null, {
        width: w,
        height: h,
        results: results // all results (full grid)
      });
    });
  };

  fs.access(fileName, fs.R_OK | fs.W_OK, function (err) {
    if (err) {
      console.log("downloading file before plot");
      download(url, fileName, plot);
    } else {
      console.log("file exists, plotting now!");
      plot();
    }
  });
};

/*
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

    var delta = ((waterPixels / len).toFixed(4)) * 100;
    console.log("len: %s, waterPixels: %s, delta: %s %", len, waterPixels, delta);
  });

  console.log('finished!');
});
*/
