var http = require('http');
var express = require('express');

var app = express();


var server = http.createServer();

server.on('request', function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write("<p>kurtver</p>");
    res.end('howdy');
});

server.listen(4000);
console.log('server startet');

