var restify = require('restify');
var request = require('request');
var lwip = require('lwip');
var fs = require('fs');

var http = require('http');

var server = restify.createServer();

function respond (req, res, next) {
  res.send('hello ' + req.params.name);
  next();
};

server.get('/hello/:name', respond);
server.head('/hello/:name', respond);

server.post('/populate', function (req, res) {

});

server.listen(8080, function () {
  console.log('%s listening at %s', server.name, server.url);
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
