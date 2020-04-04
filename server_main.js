"use strict"

var express = require('express');
var app = express();
var http = require('http');
var path = require('path');
var server = http.Server(app);
var io = require('socket.io')(server, {pingInterval: 1500});
app.set('port', 8080);
app.use('/client_side', express.static(__dirname + '/client_side'));// Routing
app.get('/', function(request, response) {
  response.sendFile(path.join(__dirname + '/client_side', 'index.html'));
});

// Starts the server
server.listen(8080, function() {
	console.log('Starting server on port 8080');
});

// Add the WebSocket handlers
io.on('connection', socket => {
	socket.on('new_player', () => {
		socket.emit('Message', 'Connected');
	}); 

	socket.on('disconnect', () => {
		
	});
});